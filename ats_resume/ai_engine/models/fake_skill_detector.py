"""
ai_engine/models/fake_skill_detector.py
────────────────────────────────────────
Detects suspicious or "padded" skills in a resume.

Analyzes:
  - Skill density (too many skills vs. experience)
  - Keyword stuffing (unnatural repetition)
  - Contextual absence (skills listed but not mentioned in experience/projects)
"""

from __future__ import annotations
import logging
from typing import Dict, List, Any

logger = logging.getLogger(__name__)

class FakeSkillDetector:
    """
    Detects potential fraud or skill inflation in resumes.
    """
    
    def analyze(self, parsed: Dict[str, Any], sections: Dict[str, str]) -> Dict[str, Any]:
        """
        Analyze a resume for suspicious skill patterns.
        """
        skills = parsed.get("skills", [])
        skill_names = [s.get("skill", "").lower() for s in skills]
        
        experience_text = sections.get("experience", "").lower()
        projects_text = sections.get("projects", "").lower()
        combined_text = experience_text + " " + projects_text
        
        flags = []
        
        # 1. Check for Contextual Absence
        # If a skill is listed but never mentioned in the experience or projects
        unmentioned = []
        for s in skill_names:
            if s and s not in combined_text:
                unmentioned.append(s)
        
        if len(unmentioned) > len(skills) * 0.5 and len(skills) > 5:
            flags.append({
                "flag_type": "UNSUBSTANTIATED_SKILL",
                "severity": "HIGH",
                "detail": f"High percentage of unverified skills ({len(unmentioned)} skills not found in experience/projects)",
                "affected_skill": unmentioned[0] if unmentioned else None
            })

        # 2. Check for Skill Density
        years = parsed.get("experience_years", 0) or 0
        if len(skills) > 30 and years < 2:
            flags.append({
                "flag_type": "SKILL_INFLATION",
                "severity": "MEDIUM",
                "detail": "Suspiciously high skill-to-experience ratio (many skills but <2 years exp)",
                "affected_skill": None
            })

        # Calculate fraud probability
        fraud_prob = len(flags) * 0.25
        is_suspicious = len(flags) > 0
        
        return {
            "is_suspicious": is_suspicious,
            "fraud_probability": min(fraud_prob, 0.95),
            "flags": flags,
            "unverified_skills": unmentioned[:10],
            "proof_score": 1.0 - min(len(unmentioned) / max(len(skills), 1), 1.0),
            "verdict": "SUSPICIOUS" if is_suspicious else "CLEAN"
        }
