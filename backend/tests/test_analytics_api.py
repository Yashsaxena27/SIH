import pytest
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture
def client():
    return TestClient(app)

def test_analytics_summary(client):
    response = client.get("/api/v1/analytics/summary")
    assert response.status_code == 200
    data = response.json()
    
    assert data["provenance"] == "CURRENT_DATABASE_SNAPSHOT"
    assert "totalIssues" in data
    assert "totalDetections" in data
    assert "totalObservations" in data
    assert "totalTickets" in data
    assert "totalVerifications" in data
    assert "resolvedJurisdictions" in data
    assert "unresolvedJurisdictions" in data
    assert "uniqueObservingBuses" in data
    assert "totalBuses" in data
    assert "totalRoadSegments" in data

    # Mathematical integrity
    assert data["totalIssues"] == data["resolvedJurisdictions"] + data["unresolvedJurisdictions"]
    assert data["totalIssues"] >= 0
    assert data["totalDetections"] >= 0
    assert data["totalTickets"] >= 0
    assert data["totalVerifications"] >= 0


def test_analytics_issues_breakdown(client):
    response = client.get("/api/v1/analytics/issues")
    assert response.status_code == 200
    data = response.json()
    
    assert data["provenance"] == "CURRENT_DATABASE_SNAPSHOT"
    total = data["total"]
    
    sum_by_type = sum(item["count"] for item in data["byType"])
    sum_by_severity = sum(item["count"] for item in data["bySeverity"])
    sum_by_status = sum(item["count"] for item in data["byStatus"])

    assert total == sum_by_type
    assert total == sum_by_severity
    assert total == sum_by_status


def test_analytics_trends(client):
    response = client.get("/api/v1/analytics/trends")
    assert response.status_code == 200
    data = response.json()
    
    assert data["provenance"] == "CURRENT_DATABASE_SNAPSHOT"
    assert isinstance(data["detectionsByDate"], list)
    assert isinstance(data["issuesByDate"], list)
    assert "isSparse" in data


def test_analytics_tickets(client):
    response = client.get("/api/v1/analytics/tickets")
    assert response.status_code == 200
    data = response.json()
    
    assert data["provenance"] == "CURRENT_DATABASE_SNAPSHOT"
    total = data["total"]
    
    sum_by_status = sum(item["count"] for item in data["byStatus"])
    sum_by_prio = sum(item["count"] for item in data["byPriority"])

    assert total == sum_by_status
    assert total == sum_by_prio


def test_analytics_verifications(client):
    response = client.get("/api/v1/analytics/verifications")
    assert response.status_code == 200
    data = response.json()
    
    assert data["provenance"] == "CURRENT_DATABASE_SNAPSHOT"
    total = data["total"]
    sum_by_result = sum(item["count"] for item in data["byResult"])
    assert total == sum_by_result


def test_analytics_authorities(client):
    response = client.get("/api/v1/analytics/authorities")
    assert response.status_code == 200
    data = response.json()
    
    assert data["provenance"] == "CURRENT_DATABASE_SNAPSHOT"
    authorities = data["authorities"]
    assert len(authorities) >= 1
    
    # Check that 'unresolved' is explicitly present
    unresolved_entry = next((a for a in authorities if a["authorityId"] == "unresolved"), None)
    assert unresolved_entry is not None
    assert unresolved_entry["authorityName"] == "Unresolved Jurisdiction"

    # Cross check total issues & tickets match summary
    summary_resp = client.get("/api/v1/analytics/summary")
    summary = summary_resp.json()

    total_issues_from_auths = sum(a["issuesCount"] for a in authorities)
    total_tickets_from_auths = sum(a["ticketsCount"] for a in authorities)

    assert total_issues_from_auths == summary["totalIssues"]
    assert total_tickets_from_auths == summary["totalTickets"]


def test_analytics_road_health(client):
    response = client.get("/api/v1/analytics/road-health")
    assert response.status_code == 200
    data = response.json()
    
    assert data["provenance"] == "decision_support_derived"
    assert "disclaimer" in data
    assert data["totalSegments"] > 0
    assert 0.0 <= data["averageHealthScore"] <= 100.0
    
    dist = data["distribution"]
    sum_dist = dist["excellent"] + dist["good"] + dist["fair"] + dist["critical"]
    assert sum_dist == data["totalSegments"]
    assert len(data["segments"]) == data["totalSegments"]
