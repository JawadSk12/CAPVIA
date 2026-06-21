"""
Code Analyzer
Analyzes code quality, complexity, and correctness
"""

from typing import Dict, Any, List, Optional
from loguru import logger
from app.ai.utils.pattern_matching import pattern_matcher
from app.core.config import settings
import openai


class CodeAnalyzer:
    """
    Analyzes code submissions
    Evaluates quality, style, and best practices
    """
    
    def __init__(self):
        """Initialize analyzer"""
        self.pattern_matcher = pattern_matcher
        openai.api_key = settings.OPENAI_API_KEY
    
    def analyze_code(
        self,
        code: str,
        language: str,
        expected_patterns: Optional[List[str]] = None,
        test_results: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Comprehensive code analysis
        
        Args:
            code: Code to analyze
            language: Programming language
            expected_patterns: Expected code patterns
            test_results: Test case execution results
        
        Returns:
            Analysis result dictionary
        """
        logger.info(f"Analyzing {language} code")
        
        result = {
            "language": language,
            "quality_score": 0.0,
            "correctness_score": 0.0,
            "style_score": 0.0,
            "complexity_score": 0.0,
            "total_score": 0.0,
            "details": {},
            "suggestions": []
        }
        
        # 1. Pattern detection
        patterns = self.pattern_matcher.detect_code_patterns(code, language)
        result["details"]["patterns"] = patterns
        
        # 2. Complexity analysis
        complexity = self.pattern_matcher.calculate_code_complexity(code)
        result["details"]["complexity"] = complexity
        
        # 3. Algorithm pattern detection
        algorithms = self.pattern_matcher.detect_algorithm_patterns(code)
        result["details"]["algorithms"] = algorithms
        
        # 4. Correctness (from test results)
        if test_results:
            correctness = self._evaluate_correctness(test_results)
            result["correctness_score"] = correctness["score"]
            result["details"]["correctness"] = correctness
        
        # 5. Code quality
        quality = self._evaluate_quality(patterns, complexity)
        result["quality_score"] = quality["score"]
        result["details"]["quality"] = quality
        
        # 6. Style evaluation
        style = self._evaluate_style(code, language, patterns)
        result["style_score"] = style["score"]
        result["details"]["style"] = style
        
        # 7. Complexity scoring
        complexity_eval = self._evaluate_complexity(complexity)
        result["complexity_score"] = complexity_eval["score"]
        
        # Calculate total score
        weights = {
            "correctness": 0.40,
            "quality": 0.30,
            "style": 0.15,
            "complexity": 0.15
        }
        
        total = 0.0
        total += result["correctness_score"] * weights["correctness"]
        total += result["quality_score"] * weights["quality"]
        total += result["style_score"] * weights["style"]
        total += result["complexity_score"] * weights["complexity"]
        
        result["total_score"] = total
        
        # Generate suggestions
        result["suggestions"] = self._generate_suggestions(result)
        
        return result
    
    def _evaluate_correctness(self, test_results: Dict[str, Any]) -> Dict[str, Any]:
        """Evaluate correctness based on test results"""
        result = {
            "score": 0.0,
            "tests_passed": 0,
            "tests_total": 0,
            "pass_rate": 0.0
        }
        
        tests_passed = test_results.get("test_cases_passed", 0)
        tests_total = test_results.get("test_cases_total", 0)
        
        result["tests_passed"] = tests_passed
        result["tests_total"] = tests_total
        
        if tests_total > 0:
            pass_rate = tests_passed / tests_total
            result["pass_rate"] = pass_rate
            result["score"] = pass_rate * 100
        
        return result
    
    def _evaluate_quality(
        self,
        patterns: Dict[str, Any],
        complexity: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Evaluate code quality"""
        result = {
            "score": 70.0,  # Start with baseline
            "factors": []
        }
        
        quality_indicators = patterns.get("quality_indicators", {})
        
        # Positive indicators
        if quality_indicators.get("has_documentation"):
            result["score"] += 10
            result["factors"].append("+10: Has documentation")
        
        if quality_indicators.get("has_error_handling"):
            result["score"] += 10
            result["factors"].append("+10: Has error handling")
        
        if quality_indicators.get("uses_type_hints"):
            result["score"] += 5
            result["factors"].append("+5: Uses type hints")
        
        if quality_indicators.get("uses_comprehension"):
            result["score"] += 5
            result["factors"].append("+5: Uses list comprehensions")
        
        # Negative indicators
        if complexity.get("cyclomatic_complexity", 0) > 10:
            result["score"] -= 10
            result["factors"].append("-10: High complexity")
        
        if complexity.get("max_nesting_depth", 0) > 4:
            result["score"] -= 5
            result["factors"].append("-5: Deep nesting")
        
        result["score"] = max(0, min(100, result["score"]))
        
        return result
    
    def _evaluate_style(
        self,
        code: str,
        language: str,
        patterns: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Evaluate code style"""
        result = {
            "score": 80.0,  # Start with good baseline
            "issues": []
        }
        
        # Check line length
        lines = code.split('\n')
        long_lines = [i for i, line in enumerate(lines) if len(line) > 100]
        if long_lines:
            result["score"] -= 5
            result["issues"].append(f"Lines too long: {len(long_lines)} lines")
        
        # Check naming conventions
        if language.lower() == "python":
            # Python uses snake_case
            import re
            if re.search(r'def\s+[A-Z]\w+', code):
                result["score"] -= 5
                result["issues"].append("Function names should be snake_case")
        
        elif language.lower() == "javascript":
            # JavaScript uses camelCase
            import re
            if re.search(r'function\s+[a-z]+_[a-z]+', code):
                result["score"] -= 5
                result["issues"].append("Function names should be camelCase")
        
        # Check for magic numbers
        import re
        numbers = re.findall(r'\b\d{2,}\b', code)
        if len(numbers) > 3:
            result["score"] -= 5
            result["issues"].append("Consider using named constants instead of magic numbers")
        
        result["score"] = max(0, min(100, result["score"]))
        
        return result
    
    def _evaluate_complexity(self, complexity: Dict[str, Any]) -> Dict[str, Any]:
        """Evaluate complexity (lower is better)"""
        result = {
            "score": 100.0,
            "rating": "simple"
        }
        
        cyclomatic = complexity.get("cyclomatic_complexity", 1)
        
        if cyclomatic <= 5:
            result["rating"] = "simple"
            result["score"] = 100
        elif cyclomatic <= 10:
            result["rating"] = "moderate"
            result["score"] = 80
        elif cyclomatic <= 20:
            result["rating"] = "complex"
            result["score"] = 60
        else:
            result["rating"] = "very_complex"
            result["score"] = 40
        
        return result
    
    def _generate_suggestions(self, analysis: Dict[str, Any]) -> List[str]:
        """Generate improvement suggestions"""
        suggestions = []
        
        # Correctness suggestions
        correctness = analysis["details"].get("correctness", {})
        if correctness.get("pass_rate", 1.0) < 1.0:
            failed = correctness["tests_total"] - correctness["tests_passed"]
            suggestions.append(f"Fix {failed} failing test case(s)")
        
        # Quality suggestions
        quality = analysis["details"].get("quality", {})
        if not any("documentation" in str(f) for f in quality.get("factors", [])):
            suggestions.append("Add docstrings/comments to explain your code")
        
        if not any("error handling" in str(f) for f in quality.get("factors", [])):
            suggestions.append("Consider adding error handling")
        
        # Style suggestions
        style = analysis["details"].get("style", {})
        for issue in style.get("issues", []):
            suggestions.append(f"Style: {issue}")
        
        # Complexity suggestions
        complexity = analysis["details"].get("complexity", {})
        if complexity.get("cyclomatic_complexity", 0) > 10:
            suggestions.append("Consider breaking down complex functions")
        
        return suggestions[:5]  # Limit to top 5 suggestions


# Singleton instance
code_analyzer = CodeAnalyzer()