"""
Behavior Scorer
Analyzes candidate behavior during test for cheating detection
"""

from typing import Dict, Any, List
from datetime import datetime
from loguru import logger
from app.core.config import settings


class BehaviorScorer:
    """
    Scores candidate behavior
    Detects suspicious patterns that indicate cheating
    """
    
    def __init__(self):
        """Initialize behavior scorer"""
        self.thresholds = {
            "tab_switches": settings.MAX_TAB_SWITCHES,
            "copy_paste": settings.MAX_COPY_PASTE_EVENTS,
            "typing_speed": settings.TYPING_SPEED_THRESHOLD,
            "idle_time": settings.MIN_IDLE_TIME_SECONDS
        }
    
    def calculate_behavior_score(
        self,
        behavioral_events: List[Dict[str, Any]],
        submissions: List[Dict[str, Any]],
        session_duration_minutes: int
    ) -> Dict[str, Any]:
        """
        Calculate overall behavior score
        
        Args:
            behavioral_events: List of behavioral events
            submissions: List of submissions
            session_duration_minutes: Total session duration
        
        Returns:
            Behavior score and analysis
        """
        logger.info("Calculating behavior score")
        
        result = {
            "behavior_score": 100.0,  # Start with perfect score
            "risk_level": "low",
            "suspicious_events": [],
            "analysis": {},
            "recommendations": []
        }
        
        # 1. Tab switching analysis
        tab_analysis = self._analyze_tab_switches(behavioral_events)
        result["analysis"]["tab_switches"] = tab_analysis
        
        if tab_analysis["is_suspicious"]:
            result["behavior_score"] -= 20
            result["suspicious_events"].append({
                "type": "excessive_tab_switching",
                "severity": "high",
                "count": tab_analysis["count"]
            })
        
        # 2. Copy-paste analysis
        paste_analysis = self._analyze_copy_paste(submissions)
        result["analysis"]["copy_paste"] = paste_analysis
        
        if paste_analysis["is_suspicious"]:
            result["behavior_score"] -= 25
            result["suspicious_events"].append({
                "type": "excessive_copy_paste",
                "severity": "high",
                "count": paste_analysis["total_pastes"]
            })
        
        # 3. Typing speed analysis
        typing_analysis = self._analyze_typing_speed(submissions)
        result["analysis"]["typing_speed"] = typing_analysis
        
        if typing_analysis["is_suspicious"]:
            result["behavior_score"] -= 15
            result["suspicious_events"].append({
                "type": "suspicious_typing_speed",
                "severity": "medium",
                "max_wpm": typing_analysis["max_wpm"]
            })
        
        # 4. Idle time analysis
        idle_analysis = self._analyze_idle_time(behavioral_events, session_duration_minutes)
        result["analysis"]["idle_time"] = idle_analysis
        
        if idle_analysis["is_suspicious"]:
            result["behavior_score"] -= 10
            result["suspicious_events"].append({
                "type": "suspicious_idle_pattern",
                "severity": "low",
                "total_idle_minutes": idle_analysis["total_idle_minutes"]
            })
        
        # 5. Pattern consistency
        consistency_analysis = self._analyze_consistency(submissions)
        result["analysis"]["consistency"] = consistency_analysis
        
        if not consistency_analysis["is_consistent"]:
            result["behavior_score"] -= 15
            result["suspicious_events"].append({
                "type": "inconsistent_patterns",
                "severity": "medium",
                "variance": consistency_analysis["variance"]
            })
        
        # 6. Time distribution
        time_analysis = self._analyze_time_distribution(submissions)
        result["analysis"]["time_distribution"] = time_analysis
        
        # Ensure score doesn't go below 0
        result["behavior_score"] = max(0, result["behavior_score"])
        
        # Determine risk level
        if result["behavior_score"] < 50:
            result["risk_level"] = "high"
        elif result["behavior_score"] < 75:
            result["risk_level"] = "medium"
        else:
            result["risk_level"] = "low"
        
        # Generate recommendations
        result["recommendations"] = self._generate_recommendations(result)
        
        logger.info(f"Behavior score: {result['behavior_score']:.1f}, Risk: {result['risk_level']}")
        
        return result
    
    def _analyze_tab_switches(
        self,
        events: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Analyze tab switching behavior"""
        tab_events = [e for e in events if e.get("event_type") == "tab_switch"]
        
        return {
            "count": len(tab_events),
            "is_suspicious": len(tab_events) > self.thresholds["tab_switches"],
            "timestamps": [e.get("event_timestamp") for e in tab_events[:5]]
        }
    
    def _analyze_copy_paste(
        self,
        submissions: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Analyze copy-paste behavior"""
        total_pastes = sum(s.get("paste_count", 0) for s in submissions)
        total_copies = sum(s.get("copy_count", 0) for s in submissions)
        
        return {
            "total_pastes": total_pastes,
            "total_copies": total_copies,
            "is_suspicious": total_pastes > self.thresholds["copy_paste"],
            "paste_ratio": total_pastes / len(submissions) if submissions else 0
        }
    
    def _analyze_typing_speed(
        self,
        submissions: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Analyze typing speed patterns"""
        typing_speeds = []
        
        for submission in submissions:
            code = submission.get("code_answer", "") or submission.get("answer_text", "")
            time_spent = submission.get("time_spent_seconds", 0)
            
            if code and time_spent > 0:
                words = len(code.split())
                minutes = time_spent / 60
                wpm = words / minutes if minutes > 0 else 0
                typing_speeds.append(wpm)
        
        if not typing_speeds:
            return {
                "max_wpm": 0,
                "avg_wpm": 0,
                "is_suspicious": False
            }
        
        max_wpm = max(typing_speeds)
        avg_wpm = sum(typing_speeds) / len(typing_speeds)
        
        # Suspicious if consistently > 150 WPM (copy-paste indicator)
        is_suspicious = max_wpm > self.thresholds["typing_speed"]
        
        return {
            "max_wpm": max_wpm,
            "avg_wpm": avg_wpm,
            "is_suspicious": is_suspicious,
            "samples": len(typing_speeds)
        }
    
    def _analyze_idle_time(
        self,
        events: List[Dict[str, Any]],
        session_duration_minutes: int
    ) -> Dict[str, Any]:
        """Analyze idle time patterns"""
        idle_events = [e for e in events if e.get("event_type") == "idle"]
        
        total_idle_seconds = sum(
            e.get("event_data", {}).get("duration", 0)
            for e in idle_events
        )
        total_idle_minutes = total_idle_seconds / 60
        
        # Suspicious if idle for > 25% of session
        idle_ratio = total_idle_minutes / session_duration_minutes if session_duration_minutes > 0 else 0
        is_suspicious = idle_ratio > 0.25
        
        return {
            "total_idle_minutes": total_idle_minutes,
            "idle_ratio": idle_ratio,
            "idle_event_count": len(idle_events),
            "is_suspicious": is_suspicious
        }
    
    def _analyze_consistency(
        self,
        submissions: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Analyze consistency in submission patterns"""
        if len(submissions) < 3:
            return {
                "is_consistent": True,
                "variance": 0
            }
        
        # Analyze time spent variance
        times = [s.get("time_spent_seconds", 0) for s in submissions if s.get("time_spent_seconds")]
        
        if not times:
            return {
                "is_consistent": True,
                "variance": 0
            }
        
        avg_time = sum(times) / len(times)
        variance = sum((t - avg_time) ** 2 for t in times) / len(times)
        
        # High variance indicates inconsistency
        is_consistent = variance < (avg_time * 0.5)
        
        return {
            "is_consistent": is_consistent,
            "variance": variance,
            "avg_time": avg_time
        }
    
    def _analyze_time_distribution(
        self,
        submissions: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Analyze how time is distributed across questions"""
        if not submissions:
            return {"distribution": "unknown"}
        
        times = [s.get("time_spent_seconds", 0) for s in submissions]
        total_time = sum(times)
        
        if total_time == 0:
            return {"distribution": "unknown"}
        
        # Calculate percentages
        percentages = [(t / total_time) * 100 for t in times]
        
        # Check if any question took disproportionate time
        max_percentage = max(percentages)
        min_percentage = min(percentages)
        
        if max_percentage > 60:
            distribution = "skewed"
        elif max_percentage - min_percentage > 50:
            distribution = "uneven"
        else:
            distribution = "balanced"
        
        return {
            "distribution": distribution,
            "max_percentage": max_percentage,
            "min_percentage": min_percentage,
            "question_times": times
        }
    
    def _generate_recommendations(self, analysis: Dict[str, Any]) -> List[str]:
        """Generate recommendations based on analysis"""
        recommendations = []
        
        if analysis["risk_level"] == "high":
            recommendations.append("Recommend manual review by administrator")
            recommendations.append("Consider video interview to verify skills")
        
        for event in analysis["suspicious_events"]:
            if event["type"] == "excessive_tab_switching":
                recommendations.append("Candidate frequently switched tabs - possible external reference")
            elif event["type"] == "excessive_copy_paste":
                recommendations.append("High copy-paste activity detected - verify code originality")
            elif event["type"] == "suspicious_typing_speed":
                recommendations.append("Unusually fast typing detected - possible pre-written answers")
        
        if not recommendations:
            recommendations.append("No significant behavioral concerns detected")
        
        return recommendations


# Singleton instance
behavior_scorer = BehaviorScorer()