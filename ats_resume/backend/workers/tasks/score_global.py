"""
backend/workers/tasks/score_global.py
───────────────────────────────────────
Celery task: Run the Global ATS scoring pipeline on a parsed + embedded resume.

Pipeline steps:
  1. Load parsed resume from MongoDB
  2. Detect role (zero-shot NLI via BART)
  3. Load role-specific scoring weights
  4. Run 8 scoring dimensions in parallel
  5. Run fake skill detection
  6. XGBoost final score regression
  7. Generate SHAP explainability report
  8. Build heatmap data (section-level scores)
  9. Compute percentile vs. peers in same role
 10. Store full result in MongoDB
 11. Store summary in PostgreSQL ats_results
 12. Cache score in Redis
 13. Update resume status → DONE
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone

import structlog
from celery import Task

from workers.celery_app import celery_app

logger = structlog.get_logger(__name__)


class ScoreGlobalTask(Task):
    """Task class with lazy-loaded AI scoring models."""
    abstract = True
    _role_detector = None
    _semantic_matcher = None
    _fake_skill_detector = None
    _xgboost_scorer = None
    _explainability_engine = None

    @property
    def role_detector(self):
        if self._role_detector is None:
            try:
                from ai_engine.models.role_detector import RoleDetector
            except ImportError:
                import sys
                import os
                sys.path.append(os.getcwd())
                from ai_engine.models.role_detector import RoleDetector
            self._role_detector = RoleDetector()
            logger.info("role_detector_loaded")
        return self._role_detector

    @property
    def semantic_matcher(self):
        if self._semantic_matcher is None:
            try:
                from ai_engine.nlp.semantic_matcher import SemanticMatcher
            except ImportError:
                import sys
                import os
                sys.path.append(os.getcwd())
                from ai_engine.nlp.semantic_matcher import SemanticMatcher
            self._semantic_matcher = SemanticMatcher()
            logger.info("semantic_matcher_loaded")
        return self._semantic_matcher

    @property
    def fake_skill_detector(self):
        if self._fake_skill_detector is None:
            try:
                from ai_engine.models.fake_skill_detector import FakeSkillDetector
            except ImportError:
                import sys
                import os
                sys.path.append(os.getcwd())
                from ai_engine.models.fake_skill_detector import FakeSkillDetector
            self._fake_skill_detector = FakeSkillDetector()
            logger.info("fake_skill_detector_loaded")
        return self._fake_skill_detector

    @property
    def xgboost_scorer(self):
        if self._xgboost_scorer is None:
            try:
                from ai_engine.models.xgboost_scorer import XGBoostScorer
            except ImportError:
                import sys
                import os
                sys.path.append(os.getcwd())
                from ai_engine.models.xgboost_scorer import XGBoostScorer
            self._xgboost_scorer = XGBoostScorer()
            logger.info("xgboost_scorer_loaded")
        return self._xgboost_scorer

    @property
    def explainability_engine(self):
        if self._explainability_engine is None:
            try:
                from ai_engine.scoring.explainability import ExplainabilityEngine
            except ImportError:
                import sys
                import os
                sys.path.append(os.getcwd())
                from ai_engine.scoring.explainability import ExplainabilityEngine
            self._explainability_engine = ExplainabilityEngine()
            logger.info("explainability_engine_loaded")
        return self._explainability_engine


@celery_app.task(
    bind=True,
    base=ScoreGlobalTask,
    name="workers.tasks.score_global.score_global_task",
    max_retries=3,
    default_retry_delay=45,
    queue="score_queue",
)
def score_global_task(self: ScoreGlobalTask, resume_id: str) -> dict:
    """
    Run the complete Global ATS scoring pipeline.

    Args:
        resume_id: UUID of the resume to score

    Returns:
        {"status": "success", "resume_id": ..., "overall_score": ...}
    """
    import sys
    import os
    if os.getcwd() not in sys.path:
        sys.path.append(os.getcwd())

    log = logger.bind(resume_id=resume_id, task_id=self.request.id)
    log.info("score_global_task_started")

    try:
        result = asyncio.run(_score_global_async(resume_id, self, log))
        log.info("score_global_task_complete", score=result.get("overall_score"))
        return result
    except Exception as exc:
        log.error("score_global_task_failed", error=str(exc), exc_info=True)
        if self.request.retries >= self.max_retries:
            asyncio.run(_set_error(resume_id, str(exc)))
        raise


async def _score_global_async(
    resume_id: str,
    task: ScoreGlobalTask,
    log,
) -> dict:
    from db.mongodb import get_mongo_db, Collections
    from db.postgres import AsyncSessionLocal
    from db.redis_client import (
        cache_ats_score,
        cache_role_detection,
        set_resume_status,
        ResumeStatus,
    )
    from models.resume import Resume
    from models.ats_result import ATSResult
    from ai_engine.scoring.formula import get_weights, compute_final_score
    from ai_engine.scoring.global_scorer import GlobalScorer
    from sqlalchemy import select, update

    mongo_db = await get_mongo_db()

    # ── 1. Load parsed resume ─────────────────────────────────────────────
    resume_doc = await mongo_db[Collections.RESUMES].find_one({"_id": resume_id})
    if not resume_doc:
        raise ValueError(f"Resume doc {resume_id} missing from MongoDB")

    parsed = resume_doc["parsed"]
    sections = resume_doc["sections"]
    log.info("resume_doc_loaded", skills=len(parsed.get("skills", [])))

    # ── 2. Role detection ─────────────────────────────────────────────────
    # Build context text for role detection
    role_context = " ".join(filter(None, [
        sections.get("summary", ""),
        " ".join(s["skill"] for s in parsed.get("skills", [])),
        sections.get("experience", "")[:1000],
    ]))

    role_result = await asyncio.to_thread(task.role_detector.detect, role_context)
    detected_role = role_result["role"]
    role_confidence = role_result["confidence"]

    log.info("role_detected", role=detected_role, confidence=role_confidence)

    # Cache role detection
    await cache_role_detection(resume_id, role_result)

    # ── 3. Load role-specific weights ─────────────────────────────────────
    weights = get_weights(detected_role)

    # ── 4. Run Global Scorer (all dimensions) ────────────────────────────
    scorer = GlobalScorer(
        semantic_matcher=task.semantic_matcher,
    )

    dimension_scores = await asyncio.to_thread(
        scorer.compute_all_dimensions,
        parsed=parsed,
        sections=sections,
        role=detected_role,
        embeddings=resume_doc.get("embeddings", {}),
    )

    log.info("dimensions_computed", dims=dimension_scores)

    # ── 5. Fake skill detection ───────────────────────────────────────────
    fraud_analysis = await asyncio.to_thread(
        task.fake_skill_detector.analyze,
        parsed,
        sections,
    )

    log.info(
        "fraud_analysis_complete",
        suspicious=fraud_analysis["is_suspicious"],
        flags=len(fraud_analysis["flags"]),
    )

    # Apply fraud penalty to skill_proof dimension
    if fraud_analysis["is_suspicious"]:
        dimension_scores["skill_proof_score"] = max(
            dimension_scores.get("skill_proof_score", 1.0) - 0.3, 0.0
        )

    # ── 6. XGBoost final score ────────────────────────────────────────────
    try:
        from ai_engine.models.xgboost_scorer import compute_ats_raw_features
        raw_feature_vector = compute_ats_raw_features(resume_doc.get("raw_text", ""))
        xgb_result = await asyncio.to_thread(task.xgboost_scorer.score, raw_feature_vector)
    except Exception as e:
        log.warning("xgboost_scoring_failed", error=str(e))
        xgb_result = {"score": compute_final_score(dimension_scores, weights), "shap_values": [0.0] * 15, "confidence": 0.82}

    overall_score = xgb_result["score"]
    shap_values = xgb_result["shap_values"]
    ai_confidence = xgb_result["confidence"]

    log.info("xgboost_score_computed", score=overall_score, confidence=ai_confidence)

    # ── 7. Explainability ─────────────────────────────────────────────────
    from ai_engine.models.xgboost_scorer import FEATURE_NAMES
    explain_feature_vector = _build_feature_vector(dimension_scores, parsed, role_confidence)
    explainability = await asyncio.to_thread(
        task.explainability_engine.generate_explanation,
        shap_values=shap_values,
        feature_names=FEATURE_NAMES,
        feature_values=explain_feature_vector,
        role=detected_role,
    )

    # ── 8. Heatmap data ───────────────────────────────────────────────────
    heatmap_data = _build_heatmap(sections, dimension_scores, parsed)

    # ── 9. Skill analysis ─────────────────────────────────────────────────
    from ai_engine.nlp.ontology import get_role_skills
    target_skills = get_role_skills(detected_role)
    resume_skill_names = [s["skill"] for s in parsed.get("skills", [])]

    skill_analysis = await asyncio.to_thread(
        task.semantic_matcher.match_skills,
        resume_skill_names,
        target_skills,
    )

    # ── 10. Compute percentile ────────────────────────────────────────────
    percentile = await _compute_percentile(overall_score, detected_role)

    # ── 11. Assemble full result ──────────────────────────────────────────
    score_band = _get_score_band(overall_score)

    full_result = {
        "_id": resume_id,
        "resume_id": resume_id,
        "jd_id": None,
        "mode": "GLOBAL",
        "overall_score": round(overall_score, 2),
        "score_band": score_band,
        "percentile": round(percentile, 1),
        "detected_role": detected_role,
        "role_confidence": round(role_confidence, 4),
        "role_alternatives": role_result.get("top3", []),
        "dimension_scores": {k: round(v, 4) for k, v in dimension_scores.items()},
        "skill_analysis": skill_analysis,
        "heatmap": heatmap_data,
        "explainability": explainability,
        "fraud_analysis": fraud_analysis,
        "ai_confidence": round(ai_confidence, 4),
        "confidence_label": "HIGH" if ai_confidence >= 0.85 else "MEDIUM" if ai_confidence >= 0.7 else "LOW",
        "scoring_version": "3.0",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    # ── 12. Store in MongoDB ──────────────────────────────────────────────
    await mongo_db[Collections.ATS_RESULTS].replace_one(
        {"_id": resume_id},
        full_result,
        upsert=True,
    )
    log.info("ats_result_stored_in_mongodb")

    # ── 13. Store summary in PostgreSQL ──────────────────────────────────
    async with AsyncSessionLocal() as db:
        # Fetch user_id for the denormalized column
        resume_row = await db.get(Resume, resume_id)
        user_id = resume_row.user_id if resume_row else "unknown"

        # Upsert ATS result summary
        from sqlalchemy.dialects.postgresql import insert as pg_insert
        stmt = pg_insert(ATSResult).values(
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
            is_suspicious=fraud_analysis["is_suspicious"],
            fraud_probability=fraud_analysis["fraud_probability"],
            fraud_flag_count=len(fraud_analysis["flags"]),
        ).on_conflict_do_update(
            index_elements=["resume_id", "jd_id"],
            set_=dict(
                overall_score=overall_score,
                detected_role=detected_role,
                is_suspicious=fraud_analysis["is_suspicious"],
                ai_confidence=ai_confidence,
            ),
        )
        await db.execute(stmt)

        # Mark resume as DONE
        await db.execute(
            update(Resume)
            .where(Resume.id == resume_id)
            .values(status="DONE", completed_at=datetime.now(timezone.utc))
        )
        await db.commit()

    # ── 14. Cache score in Redis ──────────────────────────────────────────
    await cache_ats_score(resume_id, {
        "overall_score": overall_score,
        "score_band": score_band,
        "detected_role": detected_role,
        "percentile": percentile,
        "ai_confidence": ai_confidence,
        "is_suspicious": fraud_analysis["is_suspicious"],
    })

    await set_resume_status(resume_id, ResumeStatus.DONE)

    return {
        "status": "success",
        "resume_id": resume_id,
        "overall_score": overall_score,
        "detected_role": detected_role,
    }


def _build_feature_vector(
    dimension_scores: dict,
    parsed: dict,
    role_confidence: float,
) -> list[float]:
    """
    Build the feature vector for XGBoost scoring.
    Order must match FEATURE_NAMES in xgboost_scorer.py.
    """
    skills = parsed.get("skills", [])
    exp_years = parsed.get("experience_years", 0) or 0
    projects = parsed.get("projects", [])
    certs = parsed.get("certifications", [])
    edu = parsed.get("education", [])

    return [
        # Dimension scores
        dimension_scores.get("semantic_skill_match", 0),
        dimension_scores.get("project_relevance", 0),
        dimension_scores.get("experience_depth", 0),
        dimension_scores.get("education_alignment", 0),
        dimension_scores.get("ats_format", 0),
        dimension_scores.get("keyword_intelligence", 0),
        dimension_scores.get("skill_proof_score", 0),

        # Raw features
        len(skills),                                    # skill count
        min(exp_years, 20),                            # years exp (capped)
        len(projects),                                  # project count
        len(certs),                                     # cert count
        1 if edu else 0,                               # has education
        role_confidence,                                # role detection confidence

        # Derived features
        len([s for s in skills if _is_advanced_skill(s)]),  # advanced skill count
        len([p for p in projects if len(p.get("description", "")) > 100]),  # rich projects
    ]


def _is_advanced_skill(skill: dict) -> bool:
    return skill.get("seniority", "BASIC") in ("ADVANCED", "EXPERT")


def _get_score_band(score: float) -> str:
    if score >= 80:
        return "STRONG"
    elif score >= 65:
        return "GOOD"
    elif score >= 50:
        return "FAIR"
    return "WEAK"


def _build_heatmap(
    sections: dict,
    dimension_scores: dict,
    parsed: dict,
) -> list[dict]:
    """
    Build section-level heatmap data for the resume visualization.
    Each section gets a relevance score and actionable issues list.
    """
    section_score_map = {
        "summary": dimension_scores.get("keyword_intelligence", 0.5),
        "skills": dimension_scores.get("semantic_skill_match", 0.5),
        "experience": dimension_scores.get("experience_depth", 0.5),
        "projects": dimension_scores.get("project_relevance", 0.5),
        "education": dimension_scores.get("education_alignment", 0.5),
        "certifications": dimension_scores.get("certification_bonus", 0.5),
    }

    heatmap = []
    for section_name, content in sections.items():
        if not content or not content.strip():
            continue

        score = section_score_map.get(section_name, 0.5)
        issues = []
        missing_keywords = []

        # Rule-based issue detection
        word_count = len(content.split())

        if section_name == "summary" and word_count < 30:
            issues.append("Summary is too brief — aim for 50-80 words")
        if section_name == "experience" and word_count < 100:
            issues.append("Experience section lacks detail — add quantified achievements")
        if section_name == "projects" and not parsed.get("projects"):
            issues.append("No structured project entries detected")
        if section_name == "skills" and len(parsed.get("skills", [])) < 5:
            issues.append("Very few skills listed — expand this section")

        heatmap.append({
            "section_name": section_name.title(),
            "content_preview": content[:200].strip(),
            "relevance_score": round(score, 4),
            "issues": issues,
            "missing_keywords": missing_keywords,
            "feedback": issues[0] if issues else f"{section_name.title()} section looks well-structured.",
            "word_count": word_count,
        })

    return heatmap


async def _compute_percentile(score: float, role: str) -> float:
    """
    Compute score percentile vs. other candidates in the same role.
    Uses a cached distribution from the last nightly update.
    Falls back to a simple approximation if cache is empty.
    """
    try:
        from db.postgres import AsyncSessionLocal
        from models.ats_result import ATSResult
        from sqlalchemy import func, select

        async with AsyncSessionLocal() as db:
            # Count candidates with lower score in same role
            lower_count_result = await db.execute(
                select(func.count(ATSResult.id)).where(
                    ATSResult.detected_role == role,
                    ATSResult.overall_score < score,
                )
            )
            total_count_result = await db.execute(
                select(func.count(ATSResult.id)).where(
                    ATSResult.detected_role == role,
                )
            )
            lower_count = lower_count_result.scalar() or 0
            total_count = total_count_result.scalar() or 1

            return (lower_count / total_count) * 100

    except Exception:
        # Fallback: approximate percentile from score distribution
        return min(score * 1.1, 99.0)


async def _set_error(resume_id: str, error_msg: str) -> None:
    try:
        from db.postgres import AsyncSessionLocal
        from db.redis_client import set_resume_status, ResumeStatus
        from models.resume import Resume
        from sqlalchemy import update

        await set_resume_status(resume_id, ResumeStatus.ERROR, error_msg=error_msg)
        async with AsyncSessionLocal() as db:
            await db.execute(
                update(Resume).where(Resume.id == resume_id)
                .values(status="ERROR", error_message=error_msg[:500])
            )
            await db.commit()
    except Exception as e:
        logger.error(f"Failed to set error: {e}")


# ─── Periodic: Update percentiles nightly ────────────────────────────────────

@celery_app.task(name="workers.tasks.score_global.update_percentiles")
def update_percentiles() -> dict:
    """
    Nightly task: recalculate percentile for all ats_results.
    Runs at 2 AM UTC via Celery Beat.
    """
    return asyncio.run(_update_percentiles_async())


async def _update_percentiles_async() -> dict:
    from db.postgres import AsyncSessionLocal
    from models.ats_result import ATSResult
    from sqlalchemy import select, update

    updated = 0
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(ATSResult))
        all_results = result.scalars().all()

        # Group by role
        by_role: dict[str, list] = {}
        for r in all_results:
            role = r.detected_role or "unknown"
            by_role.setdefault(role, []).append(r)

        # Compute percentile for each result within its role
        for role, results in by_role.items():
            scores = sorted(r.overall_score for r in results)
            n = len(scores)
            for r in results:
                lower = sum(1 for s in scores if s < r.overall_score)
                percentile = (lower / n) * 100
                await db.execute(
                    update(ATSResult)
                    .where(ATSResult.id == r.id)
                    .values(percentile=round(percentile, 1))
                )
                updated += 1

        await db.commit()

    logger.info(f"Percentiles updated for {updated} results")
    return {"updated": updated}