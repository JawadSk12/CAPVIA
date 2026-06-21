"""
Weighted Scorer
Calculates weighted scores based on different criteria
"""

from typing import Dict, Any, List, Optional
from loguru import logger
from app.core.config import settings


class WeightedScorer:
    """
    Calculates weighted scores
    Combines multiple scoring dimensions with configurable weights
    """
    
    def __init__(self):
        """Initialize weighted scorer"""
        self.default_weights = {
            "accuracy": settings.WEIGHT_ACCURACY,
            "logic": settings.WEIGHT_LOGIC,
            "speed": settings.WEIGHT_SPEED,
            "explanation": settings.WEIGHT_EXPLANATION,
            "behavior": settings.WEIGHT_BEHAVIOR
        }
    
    def calculate_weighted_score(
        self,
        scores: Dict[str, float],
        weights: Optional[Dict[str, float]] = None,
        max_score: float = 100.0
    ) -> Dict[str, Any]:
        """
        Calculate weighted total score
        
        Args:
            scores: Dictionary of component scores
            weights: Optional custom weights (defaults to config)
            max_score: Maximum possible score
        
        Returns:
            Weighted score result
        """
        if weights is None:
            weights = self.default_weights
        
        # Validate weights sum to 1.0
        total_weight = sum(weights.values())
        if abs(total_weight - 1.0) > 0.01:
            logger.warning(f"Weights sum to {total_weight}, normalizing...")
            weights = {k: v/total_weight for k, v in weights.items()}
        
        # Calculate weighted score
        weighted_total = 0.0
        breakdown = {}
        
        for component, weight in weights.items():
            component_score = scores.get(component, 0.0)
            contribution = component_score * weight
            weighted_total += contribution
            
            breakdown[component] = {
                "score": component_score,
                "weight": weight,
                "contribution": contribution
            }
        
        # Ensure within bounds
        weighted_total = min(max_score, max(0.0, weighted_total))
        
        result = {
            "total_score": weighted_total,
            "max_score": max_score,
            "percentage": (weighted_total / max_score) * 100,
            "breakdown": breakdown,
            "weights_used": weights
        }
        
        return result
    
    def calculate_module_score(
        self,
        submissions: List[Dict[str, Any]],
        module_number: int
    ) -> Dict[str, Any]:
        """
        Calculate score for a specific module
        
        Args:
            submissions: List of submission results
            module_number: Module number (1-5)
        
        Returns:
            Module score result
        """
        if not submissions:
            return {
                "module_number": module_number,
                "score": 0.0,
                "questions_attempted": 0,
                "questions_correct": 0
            }
        
        total_score = 0.0
        total_max_score = 0.0
        correct_count = 0
        
        for submission in submissions:
            score = submission.get("score", 0.0)
            max_score = submission.get("max_score", 100.0)
            is_correct = submission.get("is_correct") == "true"
            
            total_score += score
            total_max_score += max_score
            if is_correct:
                correct_count += 1
        
        percentage = (total_score / total_max_score * 100) if total_max_score > 0 else 0.0
        
        return {
            "module_number": module_number,
            "score": total_score,
            "max_score": total_max_score,
            "percentage": percentage,
            "questions_attempted": len(submissions),
            "questions_correct": correct_count,
            "accuracy_rate": (correct_count / len(submissions)) * 100 if submissions else 0.0
        }
    
    def calculate_speed_score(
        self,
        time_spent_seconds: int,
        time_limit_seconds: int,
        quality_score: float
    ) -> float:
        """
        Calculate speed score
        Rewards faster completion while maintaining quality
        
        Args:
            time_spent_seconds: Actual time spent
            time_limit_seconds: Time limit
            quality_score: Quality of the answer (0-100)
        
        Returns:
            Speed score (0-100)
        """
        if time_limit_seconds == 0:
            return 100.0
        
        # Time ratio (0-1)
        time_ratio = time_spent_seconds / time_limit_seconds
        
        # Optimal time is 60-80% of limit
        if time_ratio < 0.3:
            # Too fast - possibly rushed
            speed_factor = 0.7
        elif time_ratio < 0.6:
            # Good speed
            speed_factor = 1.0
        elif time_ratio < 0.9:
            # Optimal range
            speed_factor = 1.0
        else:
            # Close to limit
            speed_factor = 0.8
        
        # Combine with quality
        # High quality + good speed = high score
        # High quality + slow = medium score
        # Low quality + fast = low score
        
        quality_factor = quality_score / 100
        speed_score = (speed_factor * 0.6 + quality_factor * 0.4) * 100
        
        return min(100.0, speed_score)
    
    def assign_grade(self, percentage: float) -> str:
        """
        Assign letter grade based on percentage
        
        Args:
            percentage: Score percentage (0-100)
        
        Returns:
            Letter grade (A, B, C, D, F)
        """
        if percentage >= 90:
            return "A"
        elif percentage >= 80:
            return "B"
        elif percentage >= 70:
            return "C"
        elif percentage >= 60:
            return "D"
        else:
            return "F"
    
    def determine_hiring_recommendation(
        self,
        total_score: float,
        behavior_score: float,
        cheating_risk: str
    ) -> str:
        """
        Determine hiring recommendation
        
        Args:
            total_score: Total score (0-100)
            behavior_score: Behavior score (0-100)
            cheating_risk: Cheating risk level (low/medium/high)
        
        Returns:
            Recommendation (strong_hire, hire, maybe, reject)
        """
        # Disqualify if high cheating risk
        if cheating_risk == "high":
            return "reject"
        
        # Consider both scores
        if total_score >= 85 and behavior_score >= 80:
            return "strong_hire"
        elif total_score >= 75 and behavior_score >= 70:
            if cheating_risk == "low":
                return "hire"
            else:
                return "maybe"
        elif total_score >= 60 and behavior_score >= 60:
            return "maybe"
        else:
            return "reject"


# Singleton instance
weighted_scorer = WeightedScorer()