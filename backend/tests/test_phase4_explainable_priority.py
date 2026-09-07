"""
POTHOLE WALA — PHASE 4: EXPLAINABLE SEVERITY & OPERATIONAL PRIORITY TESTS
Validates:
- Multi-factor priority engine scoring breakdown (severity, corroboration, pass frequency, road hierarchy)
- Explainable priority text generation and mathematical transparency
- Integration with Issue 360 API (priorityBreakdown and priorityExplanation delivery)
- Monotonic priority escalation under multi-bus corroboration
"""

import pytest
import datetime
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.models.domain import UrbanIssue, TicketPriority, Severity, IssueStatus
from app.services.priority_engine import calculate_priority, calculate_priority_with_explanation

def test_priority_engine_detailed_scoring():
    now = datetime.datetime.now(datetime.timezone.utc)

    # 1. Low severity single pass on local road
    issue_low = UrbanIssue(
        id="iss_p4_low",
        issue_type="pothole",
        status=IssueStatus.new,
        severity=Severity.low,
        priority=TicketPriority.low,
        location="POINT(77.22 28.55)",
        first_detected_at=now,
        last_observed_at=now,
        observation_count=1,
        unique_bus_count=1,
        confidence=0.75
    )
    p_low, bd_low = calculate_priority_with_explanation(issue_low, road_class="local")
    assert p_low == TicketPriority.low
    assert bd_low["severity_score"] == 5
    assert bd_low["multi_bus_bonus"] == 0
    assert bd_low["observation_score"] == 2
    assert bd_low["road_class_bonus"] == 0
    assert bd_low["total_score"] == 7
    assert "LOW" in bd_low["explanation"]

    # 2. Critical severity on Primary Arterial with multi-bus corroboration
    issue_crit = UrbanIssue(
        id="iss_p4_crit",
        issue_type="pothole",
        status=IssueStatus.new,
        severity=Severity.critical,
        priority=TicketPriority.urgent,
        location="POINT(77.22 28.55)",
        first_detected_at=now,
        last_observed_at=now,
        observation_count=4,
        unique_bus_count=3,
        confidence=0.92
    )
    p_crit, bd_crit = calculate_priority_with_explanation(issue_crit, road_class="Primary Arterial")
    assert p_crit == TicketPriority.urgent
    assert bd_crit["severity_score"] == 50
    assert bd_crit["multi_bus_bonus"] == 20 # (3 - 1) * 10
    assert bd_crit["observation_score"] == 8  # 4 * 2
    assert bd_crit["road_class_bonus"] == 15 # Primary Arterial
    assert bd_crit["total_score"] == 93
    assert "URGENT" in bd_crit["explanation"]


def test_monotonic_priority_escalation():
    """Verify corroboration escalates priority monotonically."""
    now = datetime.datetime.now(datetime.timezone.utc)
    scores = []

    for bus_count in [1, 2, 3, 5]:
        issue = UrbanIssue(
            id=f"iss_mono_{bus_count}",
            issue_type="pothole",
            status=IssueStatus.new,
            severity=Severity.medium,
            priority=TicketPriority.medium,
            location="POINT(77.22 28.55)",
            first_detected_at=now,
            last_observed_at=now,
            observation_count=bus_count * 2,
            unique_bus_count=bus_count,
            confidence=0.85
        )
        _, bd = calculate_priority_with_explanation(issue)
        scores.append(bd["total_score"])

    # Every additional bus observation must strictly increase the score
    assert scores == sorted(scores)
    assert len(scores) == len(set(scores)) # strictly distinct


@pytest.mark.asyncio
async def test_issue_api_delivers_priority_breakdown():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Check golden scenario A
        res = await client.get("/api/v1/issues/iss_demo_gold_a")
        assert res.status_code == 200
        data = res.json()
        assert "priorityBreakdown" in data
        assert "priorityExplanation" in data
        bd = data["priorityBreakdown"]
        assert "total_score" in bd
        assert "severity_score" in bd
        assert "multi_bus_bonus" in bd
        assert bd["total_score"] > 0
        assert len(data["priorityExplanation"]) > 10
