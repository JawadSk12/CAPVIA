"""
Answer Evaluator
Evaluates text-based answers for correctness and quality
"""

from typing import Dict, Any, List, Optional
from loguru import logger
from app.ai.utils.embeddings import embeddings_generator
from app.ai.utils.text_processing import text_processor
from app.core.config import settings
import openai


class AnswerEvaluator:
    """
    Evaluates candidate answers
    Uses keyword matching, semantic analysis, and AI assessment
    """
    
    def __init__(self):
        """Initialize evaluator"""
        self.embeddings = embeddings_generator
        self.text_proc = text_processor
        openai.api_key = settings.OPENAI_API_KEY
    
    def evaluate_answer(
        self,
        candidate_answer: str,
        evaluation_criteria: Dict[str, Any],
        max_score: float = 100.0
    ) -> Dict[str, Any]:
        """
        Evaluate a text answer
        
        Args:
            candidate_answer: The candidate's answer
            evaluation_criteria: Criteria for evaluation
            max_score: Maximum possible score
        
        Returns:
            Evaluation result dictionary
        """
        logger.info("Evaluating answer")
        
        result = {
            "total_score": 0.0,
            "max_score": max_score,
            "breakdown": {},
            "feedback": [],
            "keyword_analysis": {},
            "semantic_score": 0.0
        }
        
        # Extract criteria
        must_include = evaluation_criteria.get("must_include", [])
        keywords = evaluation_criteria.get("keywords", [])
        key_points = evaluation_criteria.get("key_points", [])
        
        # 1. Keyword matching (30% of score)
        keyword_score = self._evaluate_keywords(
            candidate_answer,
            must_include,
            keywords
        )
        result["breakdown"]["keyword_score"] = keyword_score
        result["keyword_analysis"] = keyword_score
        
        # 2. Semantic similarity (40% of score)
        if key_points:
            semantic_score = self._evaluate_semantic_similarity(
                candidate_answer,
                key_points
            )
            result["breakdown"]["semantic_score"] = semantic_score
            result["semantic_score"] = semantic_score["score"]
        
        # 3. Completeness (30% of score)
        completeness_score = self._evaluate_completeness(
            candidate_answer,
            evaluation_criteria
        )
        result["breakdown"]["completeness_score"] = completeness_score
        
        # Calculate total score
        total = 0.0
        total += keyword_score.get("score", 0) * 0.3
        
        if key_points:
            total += semantic_score.get("score", 0) * 0.4
        else:
            # If no key points, redistribute weight to keywords
            total += keyword_score.get("score", 0) * 0.4
        
        total += completeness_score.get("score", 0) * 0.3
        
        result["total_score"] = min(total, max_score)
        
        # Generate feedback
        result["feedback"] = self._generate_feedback(result)
        
        return result
    
    def _evaluate_keywords(
        self,
        answer: str,
        must_include: List[str],
        keywords: List[str]
    ) -> Dict[str, Any]:
        """
        Evaluate keyword presence
        
        Args:
            answer: Candidate answer
            must_include: Required keywords
            keywords: Optional keywords
        
        Returns:
            Keyword evaluation result
        """
        result = {
            "score": 0.0,
            "must_include_found": {},
            "keywords_found": {},
            "missing_required": [],
            "found_optional": []
        }
        
        # Check must-include keywords
        if must_include:
            found = self.text_proc.contains_keywords(answer, must_include)
            result["must_include_found"] = found
            
            found_count = sum(1 for v in found.values() if v)
            required_score = (found_count / len(must_include)) * 60  # 60% weight
            
            result["missing_required"] = [k for k, v in found.items() if not v]
        else:
            required_score = 60  # Full marks if no requirements
        
        # Check optional keywords
        if keywords:
            found = self.text_proc.contains_keywords(answer, keywords)
            result["keywords_found"] = found
            
            found_count = sum(1 for v in found.values() if v)
            optional_score = (found_count / len(keywords)) * 40  # 40% weight
            
            result["found_optional"] = [k for k, v in found.items() if v]
        else:
            optional_score = 40  # Full marks if no keywords
        
        result["score"] = required_score + optional_score
        
        return result
    
    def _evaluate_semantic_similarity(
        self,
        answer: str,
        key_points: List[str]
    ) -> Dict[str, Any]:
        """
        Evaluate semantic similarity to key points
        
        Args:
            answer: Candidate answer
            key_points: Expected key points
        
        Returns:
            Semantic evaluation result
        """
        result = {
            "score": 0.0,
            "similarities": [],
            "coverage": 0.0
        }
        
        try:
            # Generate embeddings
            answer_embedding = self.embeddings.generate_embedding(answer)
            point_embeddings = self.embeddings.generate_batch_embeddings(key_points)
            
            # Calculate similarities
            similarities = []
            for i, point_emb in enumerate(point_embeddings):
                sim = self.embeddings.cosine_similarity(answer_embedding, point_emb)
                similarities.append({
                    "key_point": key_points[i],
                    "similarity": sim,
                    "covered": sim > 0.7  # Threshold for coverage
                })
            
            result["similarities"] = similarities
            
            # Calculate coverage score
            covered_count = sum(1 for s in similarities if s["covered"])
            coverage = covered_count / len(key_points) if key_points else 0
            result["coverage"] = coverage
            
            # Average similarity as score
            avg_similarity = sum(s["similarity"] for s in similarities) / len(similarities)
            result["score"] = avg_similarity * 100
            
        except Exception as e:
            logger.error(f"Error in semantic evaluation: {str(e)}")
            result["score"] = 50  # Default middle score on error
        
        return result
    
    def _evaluate_completeness(
        self,
        answer: str,
        criteria: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Evaluate answer completeness
        
        Args:
            answer: Candidate answer
            criteria: Evaluation criteria
        
        Returns:
            Completeness evaluation result
        """
        result = {
            "score": 0.0,
            "length_adequate": False,
            "depth_indicators": []
        }
        
        # Check length
        word_count = len(answer.split())
        
        if word_count < 20:
            result["score"] = 20
        elif word_count < 50:
            result["score"] = 50
            result["length_adequate"] = True
        elif word_count < 100:
            result["score"] = 80
            result["length_adequate"] = True
        else:
            result["score"] = 100
            result["length_adequate"] = True
        
        # Check for depth indicators
        depth_indicators = criteria.get("depth_indicators", [])
        if depth_indicators:
            found = self.text_proc.contains_keywords(answer, depth_indicators)
            depth_count = sum(1 for v in found.values() if v)
            
            # Bonus for depth
            depth_bonus = (depth_count / len(depth_indicators)) * 20
            result["score"] = min(100, result["score"] + depth_bonus)
            result["depth_indicators"] = [k for k, v in found.items() if v]
        
        return result
    
    def evaluate_explanation(
        self,
        explanation: str,
        topic: str,
        expected_concepts: List[str]
    ) -> Dict[str, Any]:
        """
        Evaluate explanation quality using AI
        
        Args:
            explanation: Candidate's explanation
            topic: Topic being explained
            expected_concepts: Expected concepts to cover
        
        Returns:
            Evaluation result
        """
        prompt = f"""
Evaluate this technical explanation on a scale of 0-100:

Topic: {topic}
Expected concepts: {', '.join(expected_concepts)}

Candidate's explanation:
{explanation}

Rate on these criteria:
1. Clarity (0-25): How clear and understandable
2. Accuracy (0-25): Technical correctness
3. Completeness (0-25): Coverage of key concepts
4. Depth (0-25): Level of detail and insight

Return ONLY a JSON object:
{{
    "clarity_score": <0-25>,
    "accuracy_score": <0-25>,
    "completeness_score": <0-25>,
    "depth_score": <0-25>,
    "total_score": <0-100>,
    "strengths": ["strength1", "strength2"],
    "weaknesses": ["weakness1", "weakness2"],
    "feedback": "Brief feedback"
}}
"""
        
        try:
            response = openai.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": "You are an expert technical evaluator."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=500
            )
            
            content = response.choices[0].message.content.strip()
            
            # Extract JSON
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            
            import json
            result = json.loads(content)
            
            logger.info(f"AI evaluation score: {result['total_score']}")
            return result
            
        except Exception as e:
            logger.error(f"Error in AI evaluation: {str(e)}")
            return {
                "total_score": 50,
                "clarity_score": 12,
                "accuracy_score": 13,
                "completeness_score": 12,
                "depth_score": 13,
                "strengths": [],
                "weaknesses": [],
                "feedback": "Evaluation failed - default score assigned"
            }
    
    def _generate_feedback(self, evaluation_result: Dict[str, Any]) -> List[str]:
        """
        Generate feedback based on evaluation
        
        Args:
            evaluation_result: Evaluation result
        
        Returns:
            List of feedback points
        """
        feedback = []
        
        # Keyword feedback
        keyword_analysis = evaluation_result.get("keyword_analysis", {})
        missing = keyword_analysis.get("missing_required", [])
        if missing:
            feedback.append(f"Missing required concepts: {', '.join(missing)}")
        
        found_optional = keyword_analysis.get("found_optional", [])
        if found_optional:
            feedback.append(f"Good coverage of: {', '.join(found_optional[:3])}")
        
        # Semantic feedback
        semantic_score = evaluation_result.get("semantic_score", 0)
        if semantic_score < 50:
            feedback.append("Answer could be more aligned with expected key points")
        elif semantic_score > 80:
            feedback.append("Excellent understanding of core concepts")
        
        # Completeness feedback
        completeness = evaluation_result.get("breakdown", {}).get("completeness_score", {})
        if not completeness.get("length_adequate"):
            feedback.append("Answer could be more detailed")
        
        return feedback


# Singleton instance
answer_evaluator = AnswerEvaluator()