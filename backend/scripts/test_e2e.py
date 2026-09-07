import httpx
import uuid
import datetime
import random
import time
import asyncio

API_BASE = "http://localhost:8000/api/v1"
AUTH_HEADERS = {"Authorization": "Bearer demo-operator-token"}

def test_e2e_lifecycle():
    print("--- Starting End-to-End System Test ---")
    
    # 1. Bus 1 detects a pothole in MCD Central jurisdiction
    print("\n1. Simulated Bus 1 detecting pothole...")
    # Randomized coordinates inside MCD Central polygon to guarantee test isolation
    base_lat = round(28.6400 + random.uniform(0.0010, 0.0090), 6)
    base_lng = round(77.2200 + random.uniform(0.0010, 0.0090), 6)
    
    det1 = {
        "event_id": f"E2E-{uuid.uuid4().hex[:8]}",
        "bus_id": "BUS-1",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "location": {"lat": base_lat, "lng": base_lng},
        "detection_type": "pothole",
        "confidence": 0.88,
        "severity": "medium",
        "evidence_url": "mock_evidence_1.jpg"
    }
    
    res1 = httpx.post(f"{API_BASE}/ingestion/detection", json=det1)
    assert res1.status_code == 200, f"Detection 1 failed: {res1.text}"
    issue_id = res1.json()["issue_id"]
    print(f"Created Issue: {issue_id}")
    
    # 2. Check Issue exists
    res_issue = httpx.get(f"{API_BASE}/issues/{issue_id}")
    assert res_issue.status_code == 200
    data = res_issue.json()
    assert data["observationCount"] == 1
    
    # 3. Bus 2 detects same pothole (Fusion test within 10m)
    print("\n2. Simulated Bus 2 detecting same pothole (Fusion)...")
    det2 = {
        "event_id": f"E2E-{uuid.uuid4().hex[:8]}",
        "bus_id": "BUS-2",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "location": {"lat": round(base_lat + 0.00001, 6), "lng": round(base_lng + 0.00001, 6)},
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
    
    # 4. Create municipal ticket and transition to verification_pending
    print("\n3. Dispatching ticket and prepping for verification...")
    tkt_res = httpx.post(f"{API_BASE}/tickets", params={"issue_id": issue_id}, headers=AUTH_HEADERS)
    assert tkt_res.status_code == 200, f"Ticket creation failed: {tkt_res.text}"
    
    patch_res = httpx.patch(f"{API_BASE}/issues/{issue_id}", json={"status": "verification_pending"}, headers=AUTH_HEADERS)
    assert patch_res.status_code == 200, f"Patch to verification_pending failed: {patch_res.text}"
    
    # 5. Mock transitioning issue to verified (Bus Revisit with no defect)
    print("\n4. Testing Post-Repair Verification (Resolved)...")
    res3 = httpx.post(f"{API_BASE}/ingestion/verification/{issue_id}", json=None)
    assert res3.status_code == 200
    print(f"Verification response: {res3.json()}")
    
    res_issue3 = httpx.get(f"{API_BASE}/issues/{issue_id}")
    assert res_issue3.json()["status"] == "verified"
    print("Issue successfully verified and closed!")
    print("\n--- Success Path E2E Test Passed ---\n")

def test_e2e_failure_path():
    print("--- Starting Failure Path Verification Test ---")
    base_lat = round(28.5600 + random.uniform(0.0010, 0.0090), 6)
    base_lng = round(77.3200 + random.uniform(0.0010, 0.0090), 6)
    
    print("\n1. Simulated Bus 3 detecting pothole...")
    det1 = {
        "event_id": f"E2E-FAIL-{uuid.uuid4().hex[:8]}",
        "bus_id": "BUS-3",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "location": {"lat": base_lat, "lng": base_lng},
        "detection_type": "pothole",
        "confidence": 0.90,
        "severity": "medium",
    }
    res1 = httpx.post(f"{API_BASE}/ingestion/detection", json=det1)
    assert res1.status_code == 200, f"Detection failed: {res1.text}"
    issue_id = res1.json()["issue_id"]
    
    # Create ticket and set verification_pending
    tkt_res = httpx.post(f"{API_BASE}/tickets", params={"issue_id": issue_id}, headers=AUTH_HEADERS)
    assert tkt_res.status_code == 200, f"Ticket creation failed: {tkt_res.text}"
    
    patch_res = httpx.patch(f"{API_BASE}/issues/{issue_id}", json={"status": "verification_pending"}, headers=AUTH_HEADERS)
    assert patch_res.status_code == 200, f"Patch failed: {patch_res.text}"
    
    print(f"\n2. Testing Post-Repair Verification FAILED (defect still present)...")
    verification_det = {
        "event_id": f"E2E-VER-{uuid.uuid4().hex[:8]}",
        "bus_id": "BUS-4",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "location": {"lat": base_lat, "lng": base_lng},
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
