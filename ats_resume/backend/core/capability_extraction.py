"""
backend/core/capability_extraction.py
─────────────────────────────────────
Capability Extraction Engine that converts raw ATS scores and analysis 
into standardized DNA-compatible capability dimensions.
"""

from typing import Dict, Any, List
from schemas.dna_ats import (
    DNACapabilityGraph, RoleMatch, ResumeQuality, SkillIntelligence,
    GapAnalysisDNA, ReadinessIntelligence, FraudAnalysisDNA, FraudFlagDNA,
    ExplainabilityDNA, HeatmapDNA, OverallDNA
)

class CapabilityExtractionEngine:
    """
    Transforms basic ATS processing outputs into a highly structured 
    DNA intelligence format for Capvia's graph systems.
    """

    @classmethod
    def extract_dna_intelligence(cls, ats_result: Dict[str, Any], candidate_id: str, job_id: str = "") -> DNACapabilityGraph:
        """
        Maps raw ATS data to the standardized 0-100 DNA schema.
        """
        # Extract base scores (some might be 0-1, others 0-100, we normalize all to 0-100)
        overall_score = ats_result.get("overall_score", 0.0)
        if overall_score < 1.0 and overall_score > 0.0:
            overall_score *= 100

        dims = ats_result.get("dimension_scores", {})
        
        def normalize_score(s: float) -> float:
            # If the score is represented as 0.x, map to 100.
            return round(s * 100, 1) if s <= 1.0 and s > 0 else round(s, 1)
        
        sem_match = normalize_score(dims.get("semantic_skill_match", 0.0))
        proj_rel = normalize_score(dims.get("project_relevance", 0.0))
        exp_depth = normalize_score(dims.get("experience_depth", 0.0))
        edu_align = normalize_score(dims.get("education_alignment", 0.0))
        ats_format = normalize_score(dims.get("ats_format", 0.0))
        kw_intel = normalize_score(dims.get("keyword_intelligence", 0.0))
        proof_score = normalize_score(dims.get("skill_proof_score", 1.0))
        
        # 1. Role Match
        role_match = RoleMatch(
            technical_alignment=sem_match,
            project_alignment=proj_rel,
            experience_alignment=exp_depth,
            domain_alignment=(sem_match + exp_depth) / 2,
            semantic_match_strength=kw_intel
        )
        
        # 2. Resume Quality
        resume_quality = ResumeQuality(
            readability=ats_format,
            clarity=min(100.0, ats_format + 5.0),
            structure_quality=ats_format,
            ats_compatibility=min(100.0, ats_format + kw_intel) / 2,
            achievement_quality=proj_rel
        )
        
        # 3. Skill Intelligence
        skill_intel = SkillIntelligence(
            technical_depth=sem_match,
            practical_exposure=proj_rel,
            tool_relevance=kw_intel,
            framework_alignment=sem_match,
            proof_of_skill_strength=proof_score
        )
        
        # 4. Gap Analysis
        sa = ats_result.get("skill_analysis", {})
        missing = [g.get("skill", "") for g in sa.get("gaps", []) if isinstance(g, dict)]
        if not missing and isinstance(sa.get("gaps"), list):
            missing = [str(g) for g in sa.get("gaps", []) if isinstance(g, str)]

        gap_count = len(missing)
        missing_severity = min(100.0, gap_count * 15.0)
        project_gap_severity = max(0.0, 100.0 - proj_rel)
        
        gap_analysis = GapAnalysisDNA(
            missing_skill_severity=missing_severity,
            project_gap_severity=project_gap_severity,
            learning_gap_score=missing_severity,
            readiness_gap_score=(missing_severity + project_gap_severity) / 2,
            missing_skills=missing[:5],
            weak_areas=["Insufficient Practical Exposure" if proj_rel < 50 else "", "ATS Format Needs Work" if ats_format < 60 else ""],
            recommended_skills=missing[:3]
        )
        
        # 5. Readiness Intelligence
        readiness = ReadinessIntelligence(
            internship_readiness=overall_score,
            role_fit_score=overall_score,
            recruiter_interest_probability=max(0.0, overall_score - 10.0),
            hiring_readiness_score=overall_score
        )
        
        # 6. Fraud Analysis
        fa = ats_result.get("fraud_analysis", {})
        raw_flags = fa.get("flags", [])
        dna_flags = []
        for f in raw_flags:
            if isinstance(f, dict):
                dna_flags.append(FraudFlagDNA(
                    type=f.get("flag_type", "UNKNOWN"),
                    detail=f.get("detail", ""),
                    severity=f.get("severity", "MEDIUM")
                ))
            elif isinstance(f, str):
                dna_flags.append(FraudFlagDNA(
                    type="UNSUBSTANTIATED_SKILL",
                    detail=f,
                    severity="MEDIUM"
                ))
        
        fraud_analysis = FraudAnalysisDNA(
            risk_level="HIGH" if fa.get("is_suspicious") else "LOW",
            is_flagged=fa.get("is_suspicious", False),
            flags=dna_flags
        )
        
        # 7. Explainability
        exp = ats_result.get("explainability", {})
        factors = exp.get("factors", [])
        strengths = [f.get("factor", f.get("feature_name", "")) for f in factors if f.get("impact", "") == "positive"]
        weaknesses = [f.get("factor", f.get("feature_name", "")) for f in factors if f.get("impact", "") == "negative"]
        
        explainability = ExplainabilityDNA(
            top_strengths=strengths[:3],
            top_weaknesses=weaknesses[:3],
            matching_reasons=[f"Strong alignment in {s}" for s in strengths[:2]],
            risk_reasons=[f"Risk associated with {w}" for w in weaknesses[:2]],
            reason_for_scores=[exp.get("summary", "")]
        )
        
        # 8. Heatmap
        raw_heatmap = ats_result.get("heatmap", [])
        dna_heatmap = []
        for h in raw_heatmap:
            if isinstance(h, dict):
                dna_heatmap.append(HeatmapDNA(
                    section_name=h.get("section_name", "Unknown"),
                    relevance_score=normalize_score(h.get("relevance_score", 0.0)),
                    issues=h.get("issues", []),
                    word_count=h.get("word_count", 0)
                ))
        
        # 9. Overall
        band = ats_result.get("score_band", "FAIR")
        recommendation = "Highly Recommended" if band == "STRONG" else "Recommended" if band == "GOOD" else "Needs Review"
        
        overall = OverallDNA(
            capability_score=overall_score,
            candidate_level=ats_result.get("detected_role", "Candidate"),
            recommendation=recommendation
        )
        
        # Clean up weak areas
        gap_analysis.weak_areas = [w for w in gap_analysis.weak_areas if w]
        
        return DNACapabilityGraph(
            candidate_id=candidate_id,
            job_id=job_id or "global-eval",
            ats_analysis_id=str(ats_result.get("_id", ats_result.get("resume_id", ""))),
            role_match=role_match,
            resume_quality=resume_quality,
            skill_intelligence=skill_intel,
            gap_analysis=gap_analysis,
            readiness_intelligence=readiness,
            fraud_analysis=fraud_analysis,
            explainability=explainability,
            heatmap=dna_heatmap,
            overall=overall
        )
