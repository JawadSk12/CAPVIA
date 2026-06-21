"""
ai_engine/scoring/explainability.py
────────────────────────────────────
Generates human-readable explanations for ATS scores.

Translates raw SHAP values and feature scores into actionable insights:
  - Top strengths (what boosted the score)
  - Key gaps (what dragged the score down)
  - Actionable advice for the candidate
"""

from __future__ import annotations
import logging
from typing import Dict, List, Any

logger = logging.getLogger(__name__)

class ExplainabilityEngine:
    """
    Translates model outputs into human-readable feedback.
    """
    
    def generate_explanation(
        self, 
        shap_values: List[float], 
        feature_names: List[str], 
        feature_values: List[float], 
        role: str
    ) -> Dict[str, Any]:
        """
        Build a structured explanation report.
        """
        # Map feature names to scores
        feature_map = {name: val for name, val in zip(feature_names, feature_values)}
        
        # Sort features by their contribution (simulated using feature values for now)
        sorted_features = sorted(
            [{"name": n, "val": v} for n, v in feature_map.items() if n in feature_names[:7]],
            key=lambda x: x["val"],
            reverse=True
        )
        
        strengths = []
        improvements = []
        
        for feat in sorted_features:
            name_pretty = feat["name"].replace("_", " ").title()
            if feat["val"] >= 0.75:
                strengths.append({
                    "feature": name_pretty,
                    "impact": "HIGH",
                    "feedback": f"Excellent {name_pretty.lower()} matches for the {role} role."
                })
            elif feat["val"] < 0.5:
                improvements.append({
                    "feature": name_pretty,
                    "impact": "MEDIUM",
                    "feedback": f"Your {name_pretty.lower()} could be strengthened with more specific details or keywords."
                })
                
        # Generate summary advice
        if not improvements:
            advice = "Your profile is exceptionally well-aligned. Focus on highlight your unique leadership contributions."
        else:
            primary_gap = improvements[0]["feature"].lower()
            advice = f"To improve your score, focus on enhancing your {primary_gap} by adding quantified achievements and relevant tech stack keywords."

        return {
            "strengths": strengths[:3],
            "improvements": improvements[:3],
            "summary_advice": advice,
            "role_context": f"Analyzed against standard expectations for {role}."
        }
