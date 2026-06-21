"""
LLM Detector
Detects AI-generated content in candidate answers
Uses multiple detection strategies
"""

from typing import Dict, Any, List
from loguru import logger
from app.core.config import settings
import openai
import re
from app.ai.utils.text_processing import text_processor


class LLMDetector:
    """
    Detects AI-generated content
    Uses pattern analysis and AI-based detection
    """
    
    def __init__(self):
        """Initialize detector"""
        openai.api_key = settings.OPENAI_API_KEY
        self.text_proc = text_processor
        self.ai_indicators = self._init_ai_indicators()
    
    def detect_ai_content(
        self,
        text: str,
        question_type: str = "general"
    ) -> Dict[str, Any]:
        """
        Detect if content is AI-generated
        
        Args:
            text: Text to analyze
            question_type: Type of question (coding/explanation/etc)
        
        Returns:
            Detection result dictionary
        """
        logger.info("Running AI detection analysis")
        
        result = {
            "is_ai_generated": False,
            "confidence": 0.0,
            "ai_probability": 0.0,
            "indicators": [],
            "detection_methods": {}
        }
        
        # 1. Pattern-based detection
        pattern_result = self._pattern_based_detection(text)
        result["detection_methods"]["pattern_analysis"] = pattern_result
        
        # 2. Statistical analysis
        stats_result = self._statistical_analysis(text)
        result["detection_methods"]["statistical_analysis"] = stats_result
        
        # 3. Linguistic features
        linguistic_result = self._linguistic_analysis(text)
        result["detection_methods"]["linguistic_analysis"] = linguistic_result
        
        # 4. AI-based detection (using GPT to detect GPT)
        ai_result = self._ai_based_detection(text)
        result["detection_methods"]["ai_detection"] = ai_result
        
        # Combine results
        combined_probability = self._combine_detection_results(
            pattern_result,
            stats_result,
            linguistic_result,
            ai_result
        )
        
        result["ai_probability"] = combined_probability
        result["confidence"] = self._calculate_confidence(result["detection_methods"])
        
        # Determine if AI-generated based on threshold
        if combined_probability >= settings.AI_DETECTION_THRESHOLD:
            result["is_ai_generated"] = True
            result["indicators"] = self._collect_indicators(result["detection_methods"])
        
        logger.info(f"AI detection probability: {combined_probability:.2f}")
        
        return result
    
    def _pattern_based_detection(self, text: str) -> Dict[str, Any]:
        """
        Detect AI patterns in text
        
        Args:
            text: Text to analyze
        
        Returns:
            Pattern detection result
        """
        result = {
            "score": 0.0,
            "patterns_found": [],
            "suspicious_phrases": []
        }
        
        # Common AI phrases
        ai_phrases = self.ai_indicators["common_phrases"]
        
        found_phrases = []
        for phrase in ai_phrases:
            if phrase.lower() in text.lower():
                found_phrases.append(phrase)
        
        result["suspicious_phrases"] = found_phrases
        
        # Score based on phrase count
        if len(found_phrases) > 0:
            result["patterns_found"].append("common_ai_phrases")
            result["score"] += min(len(found_phrases) * 15, 50)
        
        # Check for overly formal language
        formal_indicators = [
            "furthermore", "moreover", "nevertheless", "consequently",
            "it is important to note", "it should be noted",
            "in conclusion", "to summarize"
        ]
        
        formal_count = sum(1 for ind in formal_indicators if ind in text.lower())
        if formal_count > 2:
            result["patterns_found"].append("overly_formal")
            result["score"] += 15
        
        # Check for perfect grammar (suspiciously perfect)
        if self._is_suspiciously_perfect(text):
            result["patterns_found"].append("perfect_grammar")
            result["score"] += 20
        
        result["score"] = min(result["score"], 100)
        
        return result
    
    def _statistical_analysis(self, text: str) -> Dict[str, Any]:
        """
        Statistical analysis of text features
        
        Args:
            text: Text to analyze
        
        Returns:
            Statistical analysis result
        """
        result = {
            "score": 0.0,
            "features": {},
            "anomalies": []
        }
        
        words = text.split()
        sentences = [s.strip() for s in text.split('.') if s.strip()]
        
        if not words or not sentences:
            return result
        
        # Average sentence length
        avg_sentence_length = len(words) / len(sentences)
        result["features"]["avg_sentence_length"] = avg_sentence_length
        
        # AI tends to have consistent sentence length
        if 15 <= avg_sentence_length <= 25:
            result["anomalies"].append("consistent_sentence_length")
            result["score"] += 15
        
        # Vocabulary diversity (Type-Token Ratio)
        unique_words = len(set([w.lower() for w in words]))
        ttr = unique_words / len(words)
        result["features"]["vocabulary_diversity"] = ttr
        
        # AI tends to have higher vocabulary diversity
        if ttr > 0.7:
            result["anomalies"].append("high_vocabulary_diversity")
            result["score"] += 20
        
        # Punctuation analysis
        punct_count = sum(1 for c in text if c in '.,;:!?')
        punct_ratio = punct_count / len(words)
        result["features"]["punctuation_ratio"] = punct_ratio
        
        # AI tends to have balanced punctuation
        if 0.1 <= punct_ratio <= 0.2:
            result["anomalies"].append("balanced_punctuation")
            result["score"] += 10
        
        result["score"] = min(result["score"], 100)
        
        return result
    
    def _linguistic_analysis(self, text: str) -> Dict[str, Any]:
        """
        Analyze linguistic features
        
        Args:
            text: Text to analyze
        
        Returns:
            Linguistic analysis result
        """
        result = {
            "score": 0.0,
            "features": {},
            "indicators": []
        }
        
        # Check for hedging language (AI often hedges)
        hedging_words = [
            "possibly", "perhaps", "might", "could", "may",
            "generally", "typically", "often", "usually"
        ]
        
        hedging_count = sum(1 for word in hedging_words if word in text.lower())
        if hedging_count > 3:
            result["indicators"].append("excessive_hedging")
            result["score"] += 20
        
        # Check for structured format (AI loves structure)
        has_bullets = bool(re.search(r'^\s*[-*•]\s', text, re.MULTILINE))
        has_numbers = bool(re.search(r'^\s*\d+\.\s', text, re.MULTILINE))
        
        if has_bullets or has_numbers:
            result["indicators"].append("structured_format")
            result["score"] += 15
        
        # Check for consistent tone (no typos, no informal language)
        has_typos = self._detect_typos(text)
        has_informal = self._detect_informal_language(text)
        
        if not has_typos and not has_informal:
            result["indicators"].append("overly_polished")
            result["score"] += 25
        
        result["score"] = min(result["score"], 100)
        
        return result
    
    def _ai_based_detection(self, text: str) -> Dict[str, Any]:
        """
        Use AI to detect AI-generated content
        
        Args:
            text: Text to analyze
        
        Returns:
            AI detection result
        """
        result = {
            "score": 0.0,
            "analysis": ""
        }
        
        prompt = f"""
Analyze if this text was written by AI or a human. Consider:
1. Writing patterns typical of AI (overly formal, hedging, structured)
2. Lack of personal anecdotes or informal language
3. Perfect grammar and punctuation
4. Generic or templated responses

Text to analyze:
{text}

Respond with JSON:
{{
    "ai_probability": <0-100>,
    "reasoning": "Brief explanation",
    "key_indicators": ["indicator1", "indicator2"]
}}
"""
        
        try:
            response = openai.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": "You are an AI content detector."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=300
            )
            
            content = response.choices[0].message.content.strip()
            
            # Extract JSON
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            
            import json
            analysis = json.loads(content)
            
            result["score"] = analysis.get("ai_probability", 50)
            result["analysis"] = analysis.get("reasoning", "")
            result["key_indicators"] = analysis.get("key_indicators", [])
            
            logger.info(f"AI-based detection score: {result['score']}")
            
        except Exception as e:
            logger.error(f"Error in AI-based detection: {str(e)}")
            result["score"] = 50  # Default to uncertain
        
        return result
    
    def _combine_detection_results(
        self,
        pattern_result: Dict[str, Any],
        stats_result: Dict[str, Any],
        linguistic_result: Dict[str, Any],
        ai_result: Dict[str, Any]
    ) -> float:
        """
        Combine detection results with weighted average
        
        Args:
            pattern_result: Pattern detection result
            stats_result: Statistical analysis result
            linguistic_result: Linguistic analysis result
            ai_result: AI-based detection result
        
        Returns:
            Combined probability (0-100)
        """
        weights = {
            "pattern": 0.2,
            "stats": 0.2,
            "linguistic": 0.2,
            "ai": 0.4  # AI-based detection gets highest weight
        }
        
        combined = 0.0
        combined += pattern_result["score"] * weights["pattern"]
        combined += stats_result["score"] * weights["stats"]
        combined += linguistic_result["score"] * weights["linguistic"]
        combined += ai_result["score"] * weights["ai"]
        
        return combined
    
    def _calculate_confidence(self, methods: Dict[str, Any]) -> float:
        """
        Calculate confidence in detection
        
        Args:
            methods: Detection methods results
        
        Returns:
            Confidence score (0-1)
        """
        scores = [m["score"] for m in methods.values()]
        
        # Higher confidence when results agree
        variance = sum((s - sum(scores)/len(scores))**2 for s in scores) / len(scores)
        
        # Low variance = high confidence
        confidence = 1.0 - min(variance / 1000, 1.0)
        
        return confidence
    
    def _collect_indicators(self, methods: Dict[str, Any]) -> List[str]:
        """Collect all AI indicators found"""
        indicators = []
        
        for method_name, method_result in methods.items():
            if "patterns_found" in method_result:
                indicators.extend(method_result["patterns_found"])
            if "anomalies" in method_result:
                indicators.extend(method_result["anomalies"])
            if "indicators" in method_result:
                indicators.extend(method_result["indicators"])
            if "key_indicators" in method_result:
                indicators.extend(method_result["key_indicators"])
        
        return list(set(indicators))  # Remove duplicates
    
    def _is_suspiciously_perfect(self, text: str) -> bool:
        """Check if text is suspiciously perfect"""
        # No common typos
        # Perfect capitalization
        # Proper punctuation
        
        sentences = text.split('.')
        
        # Check if all sentences start with capital
        properly_capitalized = all(
            s.strip()[0].isupper() if s.strip() else True
            for s in sentences
        )
        
        # Check for common typos
        common_typos = ['teh', 'recieve', 'occured', 'seperate']
        has_typos = any(typo in text.lower() for typo in common_typos)
        
        return properly_capitalized and not has_typos and len(text) > 100
    
    def _detect_typos(self, text: str) -> bool:
        """Simple typo detection"""
        common_typos = [
            'teh', 'recieve', 'occured', 'seperate', 'definately',
            'wierd', 'untill', 'thier', 'calender'
        ]
        
        return any(typo in text.lower() for typo in common_typos)
    
    def _detect_informal_language(self, text: str) -> bool:
        """Detect informal language"""
        informal_markers = [
            'gonna', 'wanna', 'gotta', 'kinda', 'sorta',
            'yeah', 'nope', 'yep', 'lol', 'btw', 'tbh'
        ]
        
        return any(marker in text.lower() for marker in informal_markers)
    
    def _init_ai_indicators(self) -> Dict[str, List[str]]:
        """Initialize AI detection indicators"""
        return {
            "common_phrases": [
                "it's important to note",
                "it's worth noting",
                "keep in mind",
                "bear in mind",
                "it's crucial to understand",
                "fundamentally",
                "essentially",
                "in essence",
                "as an AI",
                "I don't have personal experience",
                "I cannot",
                "I'm not able to",
                "delve into",
                "multifaceted",
                "nuanced approach"
            ]
        }


# Singleton instance
llm_detector = LLMDetector()