"""
CAPVIA DNA Signal Adapter — Resume ATS Capvia
==============================================
Transforms ATS analysis results into a standardized ATSSignalSchema
and POSTs it to the CAPVIA DNA Platform ingestion webhook.

Usage (call from ATS pipeline after analysis completes):
    from dna_adapter import DNASignalAdapter
    adapter = DNASignalAdapter()
    adapter.push_ats_signal(candidate_id, job_id, analysis_result)
"""

import os
import uuid
import logging
import httpx
from datetime import datetime, timezone
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

# ── Configuration ─────────────────────────────────────────────────────────────
DNA_PLATFORM_URL = os.getenv(
    "CAPVIA_DNA_PLATFORM_URL", "http://localhost:8002"
)
DNA_INGEST_ENDPOINT = f"{DNA_PLATFORM_URL}/api/v1/ingest/ats-signal"
DNA_API_KEY = os.getenv("CAPVIA_DNA_API_KEY", "")
TIMEOUT_SECONDS = 10


class ATSSignalTransformer:
    """
    Maps the ATS analysis output (from /api/v1/resume/{id}/analysis)
    to the CAPVIA DNA ATSSignalSchema.
    """

    def transform(
        self,
        candidate_id: str,
        job_id: str,
        analysis: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        analysis: the full JSON returned by the ATS analysis endpoint, e.g.:
        {
          "score": 88.5,
          "dimension_scores": {
            "semantic_skill_match": 0.92, "experience_depth": 0.85,
            "education_alignment": 0.90, "project_relevance": 0.88,
            "ats_format": 0.95, "keyword_intelligence": 0.80,
            "skill_proof_score": 0.89
          },
          "skills": {"matched": [...], "missing": [...], "unproven": []},
          "fraud_analysis": {"is_flagged": false, "flags": [], "severity": "LOW"},
          "top_strengths": [...],
          "top_weaknesses": [...],
          "heatmap": [...]
        }
        """
        dims = analysis.get("dimension_scores", {})
        fraud = analysis.get("fraud_analysis", {})
        skills = analysis.get("skills", {})

        # Convert 0.0–1.0 dimension scores → 0–100
        def pct(v: float) -> float:
            return round(v * 100, 2) if v <= 1.0 else round(v, 2)

        overall_score = float(analysis.get("score", 0.0))

        # Fraud probability from severity label
        severity_map = {"LOW": 0.05, "MEDIUM": 0.35, "HIGH": 0.70, "CRITICAL": 0.95}
        fraud_prob = severity_map.get(
            fraud.get("severity", "LOW").upper(), 0.05
        )
        if fraud.get("is_flagged"):
            fraud_prob = max(fraud_prob, 0.35)

        signal = {
            "candidate_id": candidate_id,
            "job_id": job_id,
            "source_engine": "ats",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "overall_score": overall_score,
            "skill_match_score": pct(dims.get("semantic_skill_match", overall_score / 100)),
            "jd_similarity_score": pct(dims.get("project_relevance", overall_score / 100)),
            "experience_score": pct(dims.get("experience_depth", overall_score / 100)),
            "education_score": pct(dims.get("education_alignment", overall_score / 100)),
            "resume_format_score": pct(dims.get("ats_format", overall_score / 100)),
            "keyword_density_score": pct(dims.get("keyword_intelligence", overall_score / 100)),
            "fraud_probability": fraud_prob,
            "suspicious_skills_count": len(fraud.get("flags", [])),
            "matched_skills": skills.get("matched", []),
            "missing_skills": skills.get("missing", []),
            "top_strengths": analysis.get("top_strengths", []),
            "top_weaknesses": analysis.get("top_weaknesses", []),
            "heatmap": analysis.get("heatmap", []),
            "metadata": {
                "source": "resume_ats_capvia",
                "version": "1.0.0",
            },
        }
        return signal


class DNASignalAdapter:
    """
    Sends ATS intelligence signals to the CAPVIA DNA Platform.
    Designed for fire-and-forget async push after analysis completion.
    """

    def __init__(self):
        self.transformer = ATSSignalTransformer()
        self.headers = {
            "Content-Type": "application/json",
            "X-API-Key": DNA_API_KEY,
            "X-Source-Engine": "ats",
        }

    def push_ats_signal(
        self,
        candidate_id: str,
        job_id: str,
        analysis_result: Dict[str, Any],
        blocking: bool = False,
    ) -> Optional[Dict[str, Any]]:
        """
        Transforms and pushes the ATS signal to CAPVIA DNA Platform.

        Args:
            candidate_id: UUID of the candidate.
            job_id: UUID of the job/internship position.
            analysis_result: Full ATS analysis JSON.
            blocking: If True, waits for response. Otherwise fire-and-forget.

        Returns:
            DNA Platform response dict if blocking=True, else None.
        """
        signal = self.transformer.transform(candidate_id, job_id, analysis_result)

        try:
            with httpx.Client(timeout=TIMEOUT_SECONDS) as client:
                response = client.post(
                    DNA_INGEST_ENDPOINT,
                    json=signal,
                    headers=self.headers,
                )
                response.raise_for_status()
                logger.info(
                    f"[DNA Adapter] ATS signal pushed for candidate={candidate_id} "
                    f"→ DNA platform responded: {response.status_code}"
                )
                if blocking:
                    return response.json()
                return None
        except httpx.TimeoutException:
            logger.error(
                f"[DNA Adapter] Timeout pushing ATS signal for {candidate_id}"
            )
        except httpx.HTTPStatusError as e:
            logger.error(
                f"[DNA Adapter] HTTP {e.response.status_code} from DNA platform: {e.response.text}"
            )
        except Exception as e:
            logger.error(f"[DNA Adapter] Unexpected error: {e}")
        return None

    async def push_ats_signal_async(
        self,
        candidate_id: str,
        job_id: str,
        analysis_result: Dict[str, Any],
    ) -> Optional[Dict[str, Any]]:
        """Async version for use inside FastAPI/async Celery tasks."""
        signal = self.transformer.transform(candidate_id, job_id, analysis_result)
        try:
            async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS) as client:
                response = await client.post(
                    DNA_INGEST_ENDPOINT,
                    json=signal,
                    headers=self.headers,
                )
                response.raise_for_status()
                logger.info(
                    f"[DNA Adapter][async] ATS signal pushed for {candidate_id}"
                )
                return response.json()
        except Exception as e:
            logger.error(f"[DNA Adapter][async] Error: {e}")
        return None
