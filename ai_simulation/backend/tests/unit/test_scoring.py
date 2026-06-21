import pytest
from app.ai.scoring.weighted_scorer import WeightedScorer
from app.ai.scoring.scoring_engine import ScoringEngine

def test_weighted_scorer_basic():
    scorer = WeightedScorer({"a": 0.5, "b": 0.5})
    result = scorer.compute({"a": 80.0, "b": 60.0})
    assert abs(result - 70.0) < 0.01

def test_weighted_scorer_normalization():
    scorer = WeightedScorer({"a": 1.0, "b": 1.0})
    result = scorer.compute({"a": 100.0, "b": 0.0})
    assert abs(result - 50.0) < 0.01

def test_scoring_engine_empty():
    engine = ScoringEngine()
    result = engine.calculate_final_score([])
    assert result["total"] == 0.0

def test_scoring_engine_with_data():
    engine = ScoringEngine()
    evals = [{"semantic_score": 80.0, "technical_score": 70.0}, {"semantic_score": 90.0, "technical_score": 85.0}]
    result = engine.calculate_final_score(evals)
    assert result["total"] > 0
    assert "semantic" in result
