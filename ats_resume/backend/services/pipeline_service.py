"""
backend/services/pipeline_service.py
──────────────────────────────────────
Resilient in-process resume processing pipeline.

Pipeline stages:
  1. OCR  → extract text from PDF/DOCX
  2. NER  → extract skills, experience, education entities
  3. Embed → 768-dim semantic embeddings (all-mpnet-base-v2)
  4. Score → keyword role detection + weighted dimension scoring
  5. Store → MongoDB (primary) + Redis (always) + PostgreSQL summary

Key design: MongoDB failures are NON-FATAL. Results are ALWAYS stored in
Redis so the frontend can retrieve them even if MongoDB is temporarily down.
"""

from __future__ import annotations

import asyncio
import json
import logging
import sys
import os
from datetime import datetime, timezone

import structlog

logger = structlog.get_logger(__name__)

# Add project root to path so ai_engine is importable
_PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)


async def run_resume_pipeline(resume_id: str, file_bytes: bytes) -> None:
    """
    Entry point called by FastAPI BackgroundTasks after resume upload.
    Always completes to DONE or ERROR — never hangs.
    MongoDB failures are non-fatal; Redis is the fallback storage.
    """
    log = logger.bind(resume_id=resume_id)
    log.info("pipeline_started")

    try:
        # ── 1. OCR ──────────────────────────────────────────────────────────
        await _set_status(resume_id, "OCR", log)
        raw_text = await asyncio.to_thread(_extract_text, file_bytes)
        log.info("ocr_complete", text_length=len(raw_text))

        if not raw_text or len(raw_text.strip()) < 50:
            raise ValueError("Could not extract readable text from the uploaded file.")

        # ── 2. Section Detection ─────────────────────────────────────────────
        sections = await asyncio.to_thread(_detect_sections, raw_text)
        log.info("sections_detected", found=list(sections.keys()))

        # ── 3. NER ──────────────────────────────────────────────────────────
        parsed = await asyncio.to_thread(_run_ner, sections)
        skills_list = parsed.get("skills", [])
        log.info("ner_complete", skills=len(skills_list))

        # ── 4. Non-blocking MongoDB store (parsed) ───────────────────────────
        await _set_status(resume_id, "EMBEDDING", log)
        await _try_store_parsed_mongo(resume_id, raw_text, sections, parsed, log)

        # ── 5. Embeddings ────────────────────────────────────────────────────
        skills_text = " ".join(s.get("skill", "") for s in skills_list)
        full_text = " ".join(filter(None, [
            sections.get("summary", ""),
            skills_text,
            sections.get("experience", ""),
            sections.get("projects", ""),
            raw_text[:3000],
        ]))[:12000]

        embeddings = await asyncio.to_thread(_generate_embeddings, full_text, skills_text)
        log.info("embeddings_generated", dim=len(embeddings.get("full", [])))
        await _try_update_mongo_embeddings(resume_id, embeddings, log)

        # ── 6. Role Detection ────────────────────────────────────────────────
        await _set_status(resume_id, "SCORING", log)
        role_text = " ".join(filter(None, [
            sections.get("summary", ""),
            skills_text,
            sections.get("experience", "")[:1000],
        ]))
        role_result = await asyncio.to_thread(_detect_role, role_text)
        detected_role = role_result["role"]
        role_confidence = role_result["confidence"]
        log.info("role_detected", role=detected_role, confidence=round(role_confidence, 3))

        # ── 7. Dimension Scoring ─────────────────────────────────────────────
        dimension_scores = await asyncio.to_thread(
            _compute_dimensions, parsed, sections, detected_role, embeddings
        )
        log.info("dimensions_scored", dims=list(dimension_scores.keys()))

        # ── 8. Fraud Detection (non-fatal) ───────────────────────────────────
        try:
            fraud_analysis = await asyncio.to_thread(_detect_fraud, parsed, sections)
            if fraud_analysis.get("is_suspicious"):
                dimension_scores["skill_proof_score"] = max(
                    dimension_scores.get("skill_proof_score", 1.0) - 0.3, 0.0
                )
        except Exception as e:
            log.warning("fraud_detection_skipped", error=str(e))
            fraud_analysis = {"is_suspicious": False, "fraud_probability": 0.0, "flags": []}

        # ── 9. Final Score (formula-based + XGBoost fallback) ───────────────
        from ai_engine.scoring.formula import compute_final_score, get_weights
        weights = get_weights(detected_role)
        formula_score = compute_final_score(dimension_scores, weights)

        # Try XGBoost, fall back to formula score
        try:
            from ai_engine.models.xgboost_scorer import compute_ats_raw_features
            raw_feature_vector = compute_ats_raw_features(raw_text)
            xgb_result = await asyncio.to_thread(_xgboost_score, raw_feature_vector)
            overall_score = xgb_result.get("score", formula_score)
            ai_confidence = xgb_result.get("confidence", 0.82)
        except Exception as e:
            log.warning("xgboost_prediction_failed_fallback_to_formula", error=str(e))
            overall_score = formula_score
            xgb_result = {"score": overall_score, "shap_values": [], "confidence": 0.82}
            ai_confidence = 0.82

        # Clamp to realistic range
        overall_score = max(0.0, min(100.0, round(overall_score, 2)))
        log.info("score_computed", score=overall_score, role=detected_role)

        # ── 10. Skill Match Analysis ─────────────────────────────────────────
        try:
            skill_analysis = await asyncio.to_thread(
                _match_skills, skills_list, detected_role
            )
        except Exception:
            skill_names = [s.get("skill", "") for s in skills_list]
            skill_analysis = {
                "matches": skill_names[:8],
                "gaps": _get_role_gaps(detected_role, skill_names),
                "coverage": min(len(skill_names) / 10.0, 1.0),
                "score": dimension_scores.get("semantic_skill_match", 0),
                "matched_count": len(skill_names),
                "gap_count": 5,
            }

        # ── 11. Percentile & Explainability ─────────────────────────────────
        percentile = await _compute_percentile(overall_score, detected_role)
        explainability = _build_explainability(xgb_result, dimension_scores, detected_role, weights)
        heatmap = _build_heatmap(sections, dimension_scores, parsed)

        # ── 12. Assemble Full Result ─────────────────────────────────────────
        confidence_label = (
            "HIGH" if ai_confidence >= 0.85
            else "MEDIUM" if ai_confidence >= 0.70
            else "LOW"
        )

        full_result = {
            "_id": resume_id,
            "resume_id": resume_id,
            "jd_id": None,
            "mode": "GLOBAL",
            "overall_score": overall_score,
            "score_band": _get_score_band(overall_score),
            "percentile": round(percentile, 1),
            "detected_role": detected_role,
            "role_confidence": round(role_confidence, 4),
            "role_alternatives": role_result.get("top3", []),
            "dimension_scores": {k: round(v, 4) for k, v in dimension_scores.items()},
            "skill_analysis": skill_analysis,
            "heatmap": heatmap,
            "explainability": explainability,
            "fraud_analysis": fraud_analysis,
            "ai_confidence": round(ai_confidence, 4),
            "confidence_label": confidence_label,
            "scoring_version": "3.2-resilient",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        # ── 13. DNA Capability Extraction ────────────────────────────────────
        try:
            from core.capability_extraction import CapabilityExtractionEngine
            dna_graph = CapabilityExtractionEngine.extract_dna_intelligence(
                full_result, 
                candidate_id=str(full_result.get("user_id", resume_id)),
                job_id=full_result.get("jd_id", "") or "global-eval"
            )
            full_result["dna_capability"] = dna_graph.model_dump()
        except Exception as e:
            log.warning("dna_extraction_failed", error=str(e))
            full_result["dna_capability"] = None

        # ── 14. Store Results ────────────────────────────────────────────────
        # Redis FIRST (always succeeds if Redis is up)
        await _cache_full_result(resume_id, full_result, log)

        # MongoDB (non-fatal)
        await _try_store_result_mongo(resume_id, full_result, log)

        # PostgreSQL summary (non-fatal)
        await _try_store_result_postgres(
            resume_id, overall_score, dimension_scores,
            detected_role, role_confidence, ai_confidence,
            fraud_analysis, log,
        )

        # Set status DONE
        await _set_status(resume_id, "DONE", log)
        log.info("pipeline_complete", score=overall_score, role=detected_role)

    except Exception as exc:
        log.error("pipeline_failed", error=str(exc), exc_info=True)
        await _set_status(resume_id, "ERROR", log, error_msg=str(exc)[:500])


# ─── Stage helpers ────────────────────────────────────────────────────────────

def _extract_text(file_bytes: bytes) -> str:
    """Extract plain text from PDF or DOCX bytes."""
    from ai_engine.pipelines.ocr_pipeline import OCRPipeline
    pipeline = OCRPipeline()
    file_type = (
        "application/pdf"
        if file_bytes[:4] == b"%PDF"
        else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )
    return pipeline.extract(file_bytes, file_type)


def _detect_sections(raw_text: str) -> dict:
    """Detect resume sections (Skills, Experience, Education, etc.)."""
    from ai_engine.utils.section_detector import SectionDetector
    detector = SectionDetector()
    return detector.detect(raw_text)


def _run_ner(sections: dict) -> dict:
    """Extract structured entities from resume sections."""
    from ai_engine.models.ner_extractor import NERExtractor
    extractor = NERExtractor()
    return extractor.extract(sections)


def _detect_role(text: str) -> dict:
    """Keyword-based role detection (no model download required)."""
    from ai_engine.models.role_detector import RoleDetector
    detector = RoleDetector()
    return detector.detect(text)


def _generate_embeddings(full_text: str, skills_text: str) -> dict:
    """Generate sentence embeddings using all-mpnet-base-v2."""
    from ai_engine.vector_store.embedder import ResumeEmbedder
    embedder = ResumeEmbedder()
    return embedder.generate_resume_embeddings(
        full_text=full_text,
        skills_text=skills_text,
        experience_text="",
    )


def _compute_dimensions(parsed: dict, sections: dict, role: str, embeddings: dict) -> dict:
    """Run all scoring dimensions via GlobalScorer."""
    from ai_engine.scoring.global_scorer import GlobalScorer
    from ai_engine.nlp.semantic_matcher import SemanticMatcher
    matcher = SemanticMatcher()
    scorer = GlobalScorer(semantic_matcher=matcher)
    return scorer.compute_all_dimensions(
        parsed=parsed,
        sections=sections,
        role=role,
        embeddings=embeddings,
    )


def _detect_fraud(parsed: dict, sections: dict) -> dict:
    """Run fake skill / fraud detection."""
    from ai_engine.models.fake_skill_detector import FakeSkillDetector
    detector = FakeSkillDetector()
    return detector.analyze(parsed, sections)


def _xgboost_score(feature_vector: list) -> dict:
    """Run XGBoost scoring model (falls back to heuristic if no model file)."""
    from ai_engine.models.xgboost_scorer import XGBoostScorer
    scorer = XGBoostScorer()
    return scorer.score(feature_vector)


def _match_skills(skills: list, role: str) -> dict:
    """Match resume skills against target role requirements."""
    from ai_engine.nlp.semantic_matcher import SemanticMatcher
    from ai_engine.nlp.ontology import get_role_skills
    target = get_role_skills(role)
    matcher = SemanticMatcher()
    skill_names = [s.get("skill", "") for s in skills]
    return matcher.match_skills(skill_names, target)


def _get_role_gaps(role: str, skill_names: list) -> list:
    """Get common skills missing from resume for a given role."""
    try:
        from ai_engine.nlp.ontology import get_role_skills
        target = get_role_skills(role)
        skill_lower = {s.lower() for s in skill_names}
        return [s for s in target if s.lower() not in skill_lower][:8]
    except Exception:
        return []


def _build_feature_vector(dimension_scores: dict, parsed: dict, role_confidence: float) -> list:
    skills = parsed.get("skills", [])
    exp_years = parsed.get("experience_years", 0) or 0
    projects = parsed.get("projects", [])
    certs = parsed.get("certifications", [])
    edu = parsed.get("education", [])
    return [
        dimension_scores.get("semantic_skill_match", 0),
        dimension_scores.get("project_relevance", 0),
        dimension_scores.get("experience_depth", 0),
        dimension_scores.get("education_alignment", 0),
        dimension_scores.get("ats_format", 0),
        dimension_scores.get("keyword_intelligence", 0),
        dimension_scores.get("skill_proof_score", 0),
        min(len(skills), 30),
        min(exp_years, 20),
        len(projects),
        len(certs),
        1 if edu else 0,
        role_confidence,
        len([s for s in skills if s.get("seniority", "BASIC") in ("ADVANCED", "EXPERT")]),
        len([p for p in projects if len(str(p.get("description", ""))) > 100]),
    ]


def _get_score_band(score: float) -> str:
    if score >= 80:
        return "STRONG"
    elif score >= 65:
        return "GOOD"
    elif score >= 50:
        return "FAIR"
    return "WEAK"


def _build_heatmap(sections: dict, dimension_scores: dict, parsed: dict) -> list:
    section_score_map = {
        "summary":        dimension_scores.get("keyword_intelligence", 0.5),
        "skills":         dimension_scores.get("semantic_skill_match", 0.5),
        "experience":     dimension_scores.get("experience_depth", 0.5),
        "projects":       dimension_scores.get("project_relevance", 0.5),
        "education":      dimension_scores.get("education_alignment", 0.5),
        "certifications": dimension_scores.get("skill_proof_score", 0.5),
    }
    heatmap = []
    for section_name, content in sections.items():
        if not content or not str(content).strip():
            continue
        content_str = str(content)
        score = section_score_map.get(section_name, 0.5)
        issues = []
        word_count = len(content_str.split())
        if section_name == "summary" and word_count < 30:
            issues.append("Summary is too brief — aim for 50+ words")
        if section_name == "experience" and word_count < 100:
            issues.append("Experience section lacks detail — add quantified achievements")
        if section_name == "skills" and len(parsed.get("skills", [])) < 5:
            issues.append("Very few skills listed — expand this section")
        heatmap.append({
            "section_name": section_name.title(),
            "content_preview": content_str[:200].strip(),
            "relevance_score": round(score, 4),
            "issues": issues,
            "missing_keywords": [],
            "feedback": issues[0] if issues else f"{section_name.title()} section looks well-structured.",
            "word_count": word_count,
        })
    return heatmap


def _build_explainability(
    xgb_result: dict, dimension_scores: dict, role: str, weights: dict
) -> dict:
    """Build human-readable explainability from scores."""
    try:
        from ai_engine.scoring.explainability import ExplainabilityEngine
        from ai_engine.models.xgboost_scorer import FEATURE_NAMES
        engine = ExplainabilityEngine()
        return engine.generate_explanation(
            shap_values=xgb_result.get("shap_values", []),
            feature_names=FEATURE_NAMES,
            feature_values=list(dimension_scores.values())[:len(FEATURE_NAMES)],
            role=role,
        )
    except Exception:
        # Build a simple explainability from dimension scores
        sorted_dims = sorted(dimension_scores.items(), key=lambda x: x[1], reverse=True)
        factors = []
        for dim_name, score in sorted_dims[:5]:
            label = dim_name.replace("_", " ").title()
            pct = round(score * 100, 1)
            impact = "positive" if score >= 0.5 else "negative"
            factors.append({
                "factor": label,
                "impact": impact,
                "score": pct,
                "description": f"{label} scored {pct}% — {'strong' if score >= 0.7 else 'needs improvement'}",
            })
        return {
            "factors": factors,
            "summary": f"Resume analyzed for {role} role. Top strengths: {sorted_dims[0][0].replace('_',' ')} and {sorted_dims[1][0].replace('_',' ')}.",
            "confidence": xgb_result.get("confidence", 0.82),
            "confidence_label": "HIGH" if xgb_result.get("confidence", 0.82) >= 0.85 else "MEDIUM",
        }


# ─── Database helpers (all non-fatal except Redis) ───────────────────────────

async def _set_status(resume_id: str, status: str, log, error_msg: str | None = None) -> None:
    """Update status in PostgreSQL + Redis. Never raises."""
    try:
        from db.redis_client import set_resume_status
        await set_resume_status(resume_id, status, error_msg=error_msg)
    except Exception as e:
        log.warning("redis_status_update_failed", error=str(e))

    try:
        from db.postgres import AsyncSessionLocal
        from models.resume import Resume
        from sqlalchemy import update
        async with AsyncSessionLocal() as db:
            values: dict = {"status": status}
            if status == "DONE":
                values["completed_at"] = datetime.now(timezone.utc)
            if error_msg:
                values["error_message"] = error_msg
            await db.execute(update(Resume).where(Resume.id == resume_id).values(**values))
            await db.commit()
    except Exception as e:
        log.warning("postgres_status_update_failed", error=str(e))


async def _try_store_parsed_mongo(
    resume_id: str, raw_text: str, sections: dict, parsed: dict, log
) -> None:
    """Store parsed resume data to MongoDB. Non-fatal."""
    try:
        from db.mongodb import get_mongo_db, Collections
        mongo_db = await get_mongo_db()
        await mongo_db[Collections.RESUMES].replace_one(
            {"_id": resume_id},
            {
                "_id": resume_id,
                "raw_text": raw_text,
                "sections": sections,
                "parsed": parsed,
                "created_at": datetime.now(timezone.utc).isoformat(),
            },
            upsert=True,
        )
        log.info("parsed_data_stored_in_mongodb")
    except Exception as e:
        log.warning("mongo_parsed_store_failed", error=str(e))


async def _try_update_mongo_embeddings(resume_id: str, embeddings: dict, log) -> None:
    """Update MongoDB with embeddings. Non-fatal."""
    try:
        from db.mongodb import get_mongo_db, Collections
        mongo_db = await get_mongo_db()
        await mongo_db[Collections.RESUMES].update_one(
            {"_id": resume_id},
            {"$set": {
                "embeddings": {
                    "full": embeddings.get("full", []),
                    "skills": embeddings.get("skills", []),
                },
                "embedding_version": "all-mpnet-base-v2",
            }},
        )
        log.info("embeddings_stored_in_mongodb")
    except Exception as e:
        log.warning("mongo_embedding_store_failed", error=str(e))


async def _try_store_result_mongo(resume_id: str, full_result: dict, log) -> None:
    """Store full ATS result to MongoDB. Non-fatal."""
    try:
        from db.mongodb import get_mongo_db, Collections
        mongo_db = await get_mongo_db()
        await mongo_db[Collections.ATS_RESULTS].replace_one(
            {"_id": resume_id}, full_result, upsert=True
        )
        log.info("ats_result_stored_in_mongodb")
    except Exception as e:
        log.warning("mongo_result_store_failed", error=str(e))


async def _cache_full_result(resume_id: str, full_result: dict, log) -> None:
    """
    Cache the FULL ATS result in Redis (TTL 24h).
    This is the primary fallback when MongoDB is unavailable.
    """
    try:
        from db.redis_client import get_redis
        redis = await get_redis()
        # Store full result as JSON
        await redis.setex(
            f"full_result:{resume_id}",
            86400,  # 24 hours
            json.dumps(full_result, default=str),
        )
        # Also store the quick-access score summary
        summary = {
            "overall_score": full_result["overall_score"],
            "score_band": full_result["score_band"],
            "detected_role": full_result["detected_role"],
            "percentile": full_result["percentile"],
            "ai_confidence": full_result["ai_confidence"],
            "is_suspicious": full_result["fraud_analysis"].get("is_suspicious", False),
        }
        await redis.setex(f"score:{resume_id}", 86400, json.dumps(summary))
        log.info("result_cached_in_redis")
    except Exception as e:
        log.warning("redis_cache_failed", error=str(e))


async def _try_store_result_postgres(
    resume_id: str,
    overall_score: float,
    dimension_scores: dict,
    detected_role: str,
    role_confidence: float,
    ai_confidence: float,
    fraud_analysis: dict,
    log,
) -> None:
    """Store ATS score summary to PostgreSQL. Non-fatal."""
    try:
        from db.postgres import AsyncSessionLocal
        from models.resume import Resume
        from models.ats_result import ATSResult
        from sqlalchemy import update, select, delete
        from sqlalchemy.dialects.postgresql import insert as pg_insert

        async with AsyncSessionLocal() as db:
            resume_row = await db.get(Resume, resume_id)
            user_id = str(resume_row.user_id) if resume_row else None

            # Check if record already exists
            existing = (await db.execute(
                select(ATSResult).where(
                    ATSResult.resume_id == resume_id,
                    ATSResult.jd_id == None,  # noqa: E711
                )
            )).scalars().first()

            if existing:
                # Update existing
                await db.execute(
                    update(ATSResult)
                    .where(ATSResult.resume_id == resume_id, ATSResult.jd_id == None)  # noqa: E711
                    .values(
                        overall_score=overall_score,
                        semantic_skill_score=dimension_scores.get("semantic_skill_match", 0),
                        project_relevance_score=dimension_scores.get("project_relevance", 0),
                        experience_depth_score=dimension_scores.get("experience_depth", 0),
                        education_score=dimension_scores.get("education_alignment", 0),
                        format_score=dimension_scores.get("ats_format", 0),
                        detected_role=detected_role,
                        role_confidence=role_confidence,
                        ai_confidence=ai_confidence,
                        is_suspicious=fraud_analysis.get("is_suspicious", False),
                        fraud_probability=fraud_analysis.get("fraud_probability", 0.0),
                        fraud_flag_count=len(fraud_analysis.get("flags", [])),
                    )
                )
            else:
                # Insert new
                db.add(ATSResult(
                    resume_id=resume_id,
                    jd_id=None,
                    user_id=user_id,
                    mode="GLOBAL",
                    overall_score=overall_score,
                    semantic_skill_score=dimension_scores.get("semantic_skill_match", 0),
                    project_relevance_score=dimension_scores.get("project_relevance", 0),
                    experience_depth_score=dimension_scores.get("experience_depth", 0),
                    education_score=dimension_scores.get("education_alignment", 0),
                    format_score=dimension_scores.get("ats_format", 0),
                    detected_role=detected_role,
                    role_confidence=role_confidence,
                    ai_confidence=ai_confidence,
                    is_suspicious=fraud_analysis.get("is_suspicious", False),
                    fraud_probability=fraud_analysis.get("fraud_probability", 0.0),
                    fraud_flag_count=len(fraud_analysis.get("flags", [])),
                ))

            # Also update resume status to DONE
            if resume_row:
                await db.execute(
                    update(Resume)
                    .where(Resume.id == resume_id)
                    .values(status="DONE", completed_at=datetime.now(timezone.utc))
                )
            await db.commit()
        log.info("ats_result_stored_in_postgres")
    except Exception as e:
        log.error("postgres_store_failed", error=str(e))



async def _compute_percentile(score: float, role: str) -> float:
    """Estimate what percentile this score is in. Falls back gracefully."""
    try:
        from db.postgres import AsyncSessionLocal
        from models.ats_result import ATSResult
        from sqlalchemy import func, select
        async with AsyncSessionLocal() as db:
            lower = (await db.execute(
                select(func.count(ATSResult.id)).where(
                    ATSResult.detected_role == role,
                    ATSResult.overall_score < score,
                )
            )).scalar() or 0
            total = (await db.execute(
                select(func.count(ATSResult.id)).where(ATSResult.detected_role == role)
            )).scalar() or 0
            if total > 0:
                return (lower / total) * 100
    except Exception:
        pass
    # Fallback: estimate percentile from score
    return min(score * 1.05, 99.0)
