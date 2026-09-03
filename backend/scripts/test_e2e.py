import httpx
import uuid
import datetime
import time
import asyncio

API_BASE = "http://localhost:8000/api/v1"

def test_e2e_lifecycle():
    print("--- Starting End-to-End System Test ---")
    
    # 1. Bus 1 detects a pothole
    print("\n1. Simulated Bus 1 detecting pothole...")
    det1 = {
        "event_id": f"E2E-{uuid.uuid4().hex[:8]}",
        "bus_id": "BUS-1",
        "timestamp": datetime.datetime.utcnow().isoformat(),
        "location": {"lat": 12.9716, "lng": 77.5946},
        "detection_type": "pothole",
        "confidence": 0.88,
        "severity": "medium",
        "evidence_url": "mock_evidence_1.jpg"
    }
    
    res1 = httpx.post(f"{API_BASE}/ingestion/detection", json=det1)
    assert res1.status_code == 200
    issue_id = res1.json()["issue_id"]
    print(f"Created Issue: {issue_id}")
    
    # 2. Check Issue exists
    res_issue = httpx.get(f"{API_BASE}/issues/{issue_id}")
    assert res_issue.status_code == 200
    data = res_issue.json()
    assert data["observationCount"] == 1
    
    # 3. Bus 2 detects same pothole (Fusion test)
    print("\n2. Simulated Bus 2 detecting same pothole (Fusion)...")
    det2 = {
        "event_id": f"E2E-{uuid.uuid4().hex[:8]}",
        "bus_id": "BUS-2",
        "timestamp": datetime.datetime.utcnow().isoformat(),
        "location": {"lat": 12.971601, "lng": 77.594601}, # Very close
        "detection_type": "pothole",
        "confidence": 0.95,
        "severity": "high",
        "evidence_url": "mock_evidence_2.jpg"
    }
    res2 = httpx.post(f"{API_BASE}/ingestion/detection", json=det2)
    assert res2.status_code == 200
    
    # Check fusion
    res_issue2 = httpx.get(f"{API_BASE}/issues/{issue_id}")
    data2 = res_issue2.json()
    assert data2["observationCount"] == 2
    assert data2["uniqueBusCount"] == 2
    print(f"Fusion successful. Observations: {data2['observationCount']}")
    
    # 4. Mock transitioning issue to verified (Bus Revisit)
    print("\n3. Testing Post-Repair Verification...")
    res3 = httpx.post(f"{API_BASE}/ingestion/verification/{issue_id}", json=None)
    assert res3.status_code == 200
    print(f"Verification response: {res3.json()}")
    
    res_issue3 = httpx.get(f"{API_BASE}/issues/{issue_id}")
    assert res_issue3.json()["status"] == "verified"
    print("Issue successfully verified and closed!")
    print("\n--- Success Path E2E Test Passed ---\n")

def test_e2e_failure_path():
    print("--- Starting Failure Path Verification Test ---")
    print("\n1. Simulated Bus 1 detecting pothole...")
    det1 = {
        "event_id": f"E2E-FAIL-{uuid.uuid4().hex[:8]}",
        "bus_id": "BUS-3",
        "timestamp": datetime.datetime.utcnow().isoformat(),
        "location": {"lat": 12.9350, "lng": 77.6240},
        "detection_type": "pothole",
        "confidence": 0.90,
        "severity": "medium",
    }
    res1 = httpx.post(f"{API_BASE}/ingestion/detection", json=det1)
    issue_id = res1.json()["issue_id"]
    
    print(f"\n2. Testing Post-Repair Verification FAILED (defect still present)...")
    # Event data is not None, meaning the CV model STILL sees a pothole at this location
    verification_det = {
        "event_id": f"E2E-VER-{uuid.uuid4().hex[:8]}",
        "bus_id": "BUS-4",
        "timestamp": datetime.datetime.utcnow().isoformat(),
        "location": {"lat": 12.9350, "lng": 77.6240},
        "detection_type": "pothole",
        "confidence": 0.85,
        "severity": "medium"
    }
    res_fail = httpx.post(f"{API_BASE}/ingestion/verification/{issue_id}", json=verification_det)
    assert res_fail.status_code == 200
    
    res_issue = httpx.get(f"{API_BASE}/issues/{issue_id}")
    assert res_issue.json()["status"] == "reopened"
    print("Issue successfully REOPENED due to failed verification!")
    print("\n--- Failure Path E2E Test Passed ---")

if __name__ == "__main__":
    try:
        test_e2e_lifecycle()
        test_e2e_failure_path()
        print("\nALL TESTS PASSED SUCCESSFULLY.")
    except Exception as e:
        print(f"E2E Test Failed: {e}")
