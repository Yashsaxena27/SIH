import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)
AUTH_HEADERS = {"Authorization": "Bearer demo-operator-token"}

def test_unresolved_issue_ticket_creation_rejected():
    """Verify that creating a work ticket for an unresolved jurisdiction issue is rejected with HTTP 400."""
    issues_res = client.get("/api/v1/issues")
    assert issues_res.status_code == 200
    issues = issues_res.json()
    unresolved_issue = next((i for i in issues if i.get("jurisdictionSource") == "unresolved"), None)
    assert unresolved_issue is not None, "At least one unresolved issue must exist in DB."
    target_id = unresolved_issue["id"]

    res = client.post(f"/api/v1/tickets?issue_id={target_id}", headers=AUTH_HEADERS)
    assert res.status_code == 400
    detail = res.json().get("detail", "")
    assert "unresolved" in detail.lower()

def test_ticket_lifecycle_transitions():
    """Verify ticket status transitions through municipal workflow, enforcing valid transition rules."""
    tickets_res = client.get("/api/v1/tickets")
    assert tickets_res.status_code == 200
    tickets = tickets_res.json()
    assert len(tickets) > 0, "Seeded tickets must exist."

    # Pick an open ticket to test invalid transition jump
    ticket = next((t for t in tickets if t.get("status") == "open"), tickets[0])
    ticket_id = ticket["id"]

    if ticket.get("status") == "open":
        invalid_res = client.put(f"/api/v1/tickets/{ticket_id}/status", json={"status": "verified_resolved"}, headers=AUTH_HEADERS)
        assert invalid_res.status_code == 422, f"Expected 422 for invalid transition, got {invalid_res.status_code}"

    # Verify transitions endpoint returns valid transition paths
    trans_res = client.get(f"/api/v1/tickets/{ticket_id}/transitions")
    assert trans_res.status_code == 200
    trans_data = trans_res.json()
    allowed = trans_data.get("allowedTransitions") or trans_data.get("available_transitions")
    assert allowed is not None
    assert isinstance(allowed, list)

def test_ticket_filtering_api():
    """Verify tickets endpoint correctly applies authority and status filters."""
    # Test status filter
    res_open = client.get("/api/v1/tickets?status=open")
    assert res_open.status_code == 200
    open_tickets = res_open.json()
    for t in open_tickets:
        assert t["status"] == "open"

    # Test authority filter
    res_pwd = client.get("/api/v1/tickets?authority=PWD")
    assert res_pwd.status_code == 200
    pwd_tickets = res_pwd.json()
    for t in pwd_tickets:
        assert t.get("authorityCode") == "PWD" or "PWD" in t.get("authorityName", "")
