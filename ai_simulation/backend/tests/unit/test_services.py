import pytest
from unittest.mock import AsyncMock, MagicMock
from app.ai.evaluators.behavior_scorer import BehaviorScorer

def test_behavior_scorer_no_events():
    scorer = BehaviorScorer()
    result = scorer.score([])
    assert result["integrity_score"] == 100.0
    assert result["risk_level"] == "low"

def test_behavior_scorer_with_events():
    scorer = BehaviorScorer()
    events = [{"type": "TAB_SWITCH"}, {"type": "COPY"}, {"type": "PASTE"}]
    result = scorer.score(events)
    assert result["integrity_score"] < 100.0
    assert result["total_events"] == 3

def test_behavior_scorer_high_risk():
    scorer = BehaviorScorer()
    events = [{"type": "TAB_SWITCH"}] * 20
    result = scorer.score(events)
    assert result["risk_level"] in ("high", "medium")
