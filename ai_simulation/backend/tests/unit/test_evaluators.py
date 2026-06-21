import pytest
from app.ai.evaluators.llm_detector import LLMDetector
from app.ai.evaluators.code_analyzer import CodeAnalyzer
from app.ai.evaluators.similarity_engine import SimilarityEngine

def test_llm_detector_ai_text():
    detector = LLMDetector()
    result = detector.detect("Certainly! As an AI, I'm happy to help you with that.")
    assert result["ai_probability"] > 0.5
    assert result["is_ai_generated"]

def test_llm_detector_human_text():
    detector = LLMDetector()
    result = detector.detect("I think this works because the loop iterates n times.")
    assert result["ai_probability"] < 0.5

def test_code_analyzer_valid():
    analyzer = CodeAnalyzer()
    code = """
def add(a, b):
    return a + b
"""
    result = analyzer.analyze(code, "python")
    assert result["quality_score"] > 0

def test_code_analyzer_syntax_error():
    analyzer = CodeAnalyzer()
    result = analyzer.analyze("def broken(:", "python")
    assert result["quality_score"] == 0.0

def test_similarity_identical():
    engine = SimilarityEngine()
    assert engine.compute_similarity("hello world", "hello world") == 1.0

def test_similarity_different():
    engine = SimilarityEngine()
    assert engine.compute_similarity("hello", "completely different text here") < 0.5
