"""POTHOLE WALA — Phase 7 Closed-Loop Verification 2.0 Test Suite.

Comprehensive validation covering all 20 mandatory criteria:
1. coverage confirmed + sufficient evidence + no defect -> RESOLVED
2. coverage confirmed + sufficient evidence + defect present -> UNRESOLVED
3. corridor not covered -> INCONCLUSIVE
4. degraded evidence -> INCONCLUSIVE
5. conflicting/insufficient evidence -> INCONCLUSIVE
6. resolved issue receives recurrence detection -> SAME issue reopened
7. recurrence does NOT create duplicate UrbanIssue
8. recurrence updates observation/corroboration correctly
9. recurrence reopens associated ticket where applicable
10. recurrence creates timeline event
11. recurrence creates alert
12. verification history remains append-only
13. operator override requires rationale
14. override preserves original automated result
15. override records actor and timestamp
16. RBAC: anonymous -> 401, viewer -> 403, operator -> allowed, admin -> allowed
17. illegal ticket/verification transitions rejected
18. Road Health reflects unresolved verification
19. Road Health reflects resolved verification
20. no-coverage / missing-evidence cannot produce RESOLVED
"""

import pytest
import uuid
import datetime
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import AsyncSessionLocal
from app.models.domain import (
    UrbanIssue, Ticket, Verification, VerificationResult, IssueStatus, TicketStatus,
    Observation, TimelineEvent, Alert, UserRole, Severity, TicketPriority, RoadSegment
)
from app.schemas.ingestion import DetectionEvent, GeoPoint
from app.services.verification import evaluate_verification, process_verification_reinspection, apply_operator_override
from app.services.ingestion import process_detection_event
from app.services.road_health import calculate_segment_health
from app.services.ticket_lifecycle import transition_ticket

client = TestClient(app)

OPERATOR_HEADERS = {"Authorization": "Bearer demo-operator-token"}
ADMIN_HEADERS = {"Authorization": "Bearer demo-admin-token"}
VIEWER_HEADERS = {"Authorization": "Bearer demo-viewer-token"}


# ── TEST 1-5 & 20: Decision logic pure evaluations ───────────────────

def test_01_coverage_confirmed_no_defect_resolves():
    """Rule 1: Coverage confirmed + sufficient evidence + no defect -> RESOLVED."""
    res, failure_reason, rationale, conf = evaluate_verification(
        coverage_confirmed=True,
        evidence_quality="SUFFICIENT",
        conflicting_evidence=False,
        new_detection=None
    )
    assert res == VerificationResult.resolved
    assert failure_reason is None
    assert "resolved" in rationale.lower()
    assert conf >= 0.90


def test_02_defect_present_unresolved():
    """Rule 2: Coverage confirmed + sufficient evidence + defect present -> UNRESOLVED."""
    det = {"confidence": 0.88}
    res, failure_reason, rationale, conf = evaluate_verification(
        coverage_confirmed=True,
        evidence_quality="SUFFICIENT",
        new_detection=det
    )
    assert res == VerificationResult.unresolved
    assert failure_reason == "RESIDUAL_DEFECT_DETECTED"
    assert "defect" in rationale.lower()
    assert conf == 0.88


def test_03_corridor_not_covered_inconclusive():
    """Rule 3: Corridor not covered -> INCONCLUSIVE."""
    res, failure_reason, rationale, conf = evaluate_verification(
        coverage_confirmed=False,
        evidence_quality="SUFFICIENT",
        new_detection=None
    )
    assert res == VerificationResult.inconclusive
    assert failure_reason == "INSUFFICIENT_COVERAGE"
    assert "corridor" in rationale.lower()
    assert conf == 0.0


def test_04_degraded_evidence_inconclusive():
    """Rule 4: Degraded camera evidence -> INCONCLUSIVE."""
    for quality in ["DEGRADED", "INSUFFICIENT", "OCCLUDED", "POOR_LIGHTING"]:
        res, failure_reason, rationale, conf = evaluate_verification(
            coverage_confirmed=True,
            evidence_quality=quality,
            new_detection=None
        )
        assert res == VerificationResult.inconclusive
        assert failure_reason == "EVIDENCE_QUALITY_DEGRADED"


def test_05_conflicting_evidence_inconclusive():
    """Rule 5: Conflicting multi-pass evidence -> INCONCLUSIVE."""
    res, failure_reason, rationale, conf = evaluate_verification(
        coverage_confirmed=True,
        evidence_quality="SUFFICIENT",
        conflicting_evidence=True,
        new_detection=None
    )
    assert res == VerificationResult.inconclusive
    assert failure_reason == "CONFLICTING_EVIDENCE"


def test_20_missing_evidence_cannot_produce_resolved():
    """Rule 20: No-coverage / missing-evidence cannot produce RESOLVED."""
    res1, _, _, _ = evaluate_verification(coverage_confirmed=False)
    assert res1 != VerificationResult.resolved

    res2, _, _, _ = evaluate_verification(evidence_quality="DEGRADED")
    assert res2 != VerificationResult.resolved

    res3, _, _, _ = evaluate_verification(coverage_confirmed=False, evidence_quality="DEGRADED")
    assert res3 != VerificationResult.resolved


# ── TEST 6-11: Defect Recurrence & Spatial Fusion ──────────────────

@pytest.mark.asyncio
async def test_06_to_11_defect_recurrence_workflow():
    """
    Tests 6-11:
    - Resolved issue receives recurrence detection -> SAME issue reopened
    - Recurrence does NOT create duplicate UrbanIssue
    - Updates observation/corroboration count
    - Reopens associated ticket
    - Creates timeline event
    - Creates alert
    """
    async with AsyncSessionLocal() as session:
        u_suffix = uuid.uuid4().hex[:8]
        u_id = f"iss_rec_{u_suffix}"
        t_id = f"tkt_rec_{u_suffix}"
        offset = (int(u_suffix, 16) % 10000) * 0.001
        lat, lng = 30.1234 + offset, 75.5432 + offset
        point_wkt = f"POINT({lng} {lat})"

        issue = UrbanIssue(
            id=u_id,
            issue_type="pothole",
            status=IssueStatus.verified,
            severity=Severity.high,
            priority=TicketPriority.high,
            location=point_wkt,
            first_detected_at=datetime.datetime.now(datetime.timezone.utc),
            last_observed_at=datetime.datetime.now(datetime.timezone.utc),
            observation_count=1,
            unique_bus_count=1,
            confidence=0.90
        )
        session.add(issue)

        ticket = Ticket(
            id=t_id,
            display_id=f"TKT-REC-{uuid.uuid4().hex[:4]}",
            issue_id=issue.id,
            department_id="DELHI-NCR-ROADS",
            authority_id="AUTH-PWD-DELHI",
            title="Recurrence Test Ticket",
            priority=TicketPriority.high,
            status=TicketStatus.verified_resolved,
            verified_at=datetime.datetime.now(datetime.timezone.utc)
        )
        session.add(ticket)
        await session.commit()

        evt = DetectionEvent(
            event_id=f"EVT-REC-{uuid.uuid4().hex[:8]}",
            bus_id="BUS-REC-99",
            timestamp=datetime.datetime.now(datetime.timezone.utc),
            location=GeoPoint(lat=lat, lng=lng),
            detection_type="pothole",
            severity="high",
            confidence=0.94,
            evidence_url="/mock-evidence/recurrence-test.jpg"
        )

        fused_issue = await process_detection_event(session, evt)

        # 6. SAME issue reopened
        assert fused_issue.id == issue.id
        assert fused_issue.status == IssueStatus.reopened

        # 7. No duplicate UrbanIssue created
        assert fused_issue.id == u_id

        # 8. Observation & corroboration updated
        assert fused_issue.observation_count == 2
        assert fused_issue.unique_bus_count == 2

        # 9. Associated ticket reopened
        await session.refresh(ticket)
        assert ticket.status == TicketStatus.reopened

        # 10. Timeline event created
        from sqlalchemy import select
        te_res = await session.execute(
            select(TimelineEvent).where(
                TimelineEvent.entity_id == issue.id,
                TimelineEvent.event_type == "recurrence_detected"
            )
        )
        events = te_res.scalars().all()
        assert len(events) >= 1
        assert "Recurrence" in events[0].title

        # 11. Alert created
        al_res = await session.execute(
            select(Alert).where(
                Alert.related_entity_id == issue.id,
                Alert.alert_type == "defect_recurrence"
            )
        )
        alerts = al_res.scalars().all()
        assert len(alerts) >= 1
        assert alerts[0].severity == "high"


# ── TEST 12: Verification history is append-only ─────────────────────

@pytest.mark.asyncio
async def test_12_verification_history_append_only():
    """Rule 12: Subsequent reinspections append records without deleting prior passes."""
    async with AsyncSessionLocal() as session:
        u_id = f"iss_hist_{uuid.uuid4().hex[:8]}"
        t_id = f"tkt_hist_{uuid.uuid4().hex[:8]}"
        issue = UrbanIssue(
            id=u_id,
            issue_type="pothole",
            status=IssueStatus.verification_pending,
            severity=Severity.medium,
            location="POINT(77.2090 28.6139)",
            first_detected_at=datetime.datetime.now(datetime.timezone.utc),
            last_observed_at=datetime.datetime.now(datetime.timezone.utc),
            observation_count=1,
            unique_bus_count=1,
            confidence=0.85
        )
        session.add(issue)

        ticket = Ticket(
            id=t_id,
            display_id=f"TKT-HIST-{uuid.uuid4().hex[:4]}",
            issue_id=issue.id,
            department_id="DELHI-NCR-ROADS",
            authority_id="AUTH-PWD-DELHI",
            title="History Test Ticket",
            priority=TicketPriority.medium,
            status=TicketStatus.verifying
        )
        session.add(ticket)
        await session.commit()

        # Pass 1: Inconclusive (coverage missing)
        v1 = await process_verification_reinspection(
            session=session,
            issue_id=u_id,
            bus_id="BUS-001",
            coverage_confirmed=False
        )
        assert v1.result == VerificationResult.inconclusive

        # Pass 2: Unresolved (defect detected)
        v2 = await process_verification_reinspection(
            session=session,
            issue_id=u_id,
            bus_id="BUS-002",
            coverage_confirmed=True,
            new_detection={"confidence": 0.89}
        )
        assert v2.result == VerificationResult.unresolved

        # Pass 3: Resolved (no defect)
        v3 = await process_verification_reinspection(
            session=session,
            issue_id=u_id,
            bus_id="BUS-003",
            coverage_confirmed=True,
            new_detection=None
        )
        assert v3.result == VerificationResult.resolved

        # Verify all 3 exist in DB
        from sqlalchemy import select
        res = await session.execute(
            select(Verification).where(Verification.issue_id == u_id)
        )
        all_v = res.scalars().all()
        assert len(all_v) == 3
        v_ids = {v.id for v in all_v}
        assert v1.id in v_ids
        assert v2.id in v_ids
        assert v3.id in v_ids


# ── TEST 13-15: Operator Manual Override ─────────────────────────────

@pytest.mark.asyncio
async def test_13_to_15_operator_override():
    """
    Tests 13-15:
    - Override requires mandatory rationale
    - Override preserves original automated result (append-only)
    - Override records actor, timestamp, and metadata
    """
    async with AsyncSessionLocal() as session:
        u_id = f"iss_ovr_{uuid.uuid4().hex[:8]}"
        t_id = f"tkt_ovr_{uuid.uuid4().hex[:8]}"
        issue = UrbanIssue(
            id=u_id,
            issue_type="pothole",
            status=IssueStatus.verification_pending,
            severity=Severity.medium,
            location="POINT(77.2090 28.6139)",
            first_detected_at=datetime.datetime.now(datetime.timezone.utc),
            last_observed_at=datetime.datetime.now(datetime.timezone.utc),
            observation_count=1,
            unique_bus_count=1,
            confidence=0.85
        )
        session.add(issue)

        ticket = Ticket(
            id=t_id,
            display_id=f"TKT-OVR-{uuid.uuid4().hex[:4]}",
            issue_id=issue.id,
            department_id="DELHI-NCR-ROADS",
            authority_id="AUTH-PWD-DELHI",
            title="Override Test Ticket",
            priority=TicketPriority.medium,
            status=TicketStatus.verifying
        )
        session.add(ticket)
        await session.commit()

        # Create original automated inconclusive record
        orig_v = await process_verification_reinspection(
            session=session,
            issue_id=u_id,
            coverage_confirmed=False
        )
        assert orig_v.result == VerificationResult.inconclusive

        # 13. Rejection of empty rationale
        from app.core.auth import AuthenticatedUser, UserRole
        op_user = AuthenticatedUser(id="OP-001", username="operator.demo@pothole-wala.local", role=UserRole.operator)

        with pytest.raises(ValueError, match="Mandatory rationale"):
            await apply_operator_override(
                session=session,
                verification_id=orig_v.id,
                operator_user=op_user,
                override_result=VerificationResult.resolved,
                rationale="   "
            )

        # Apply valid override
        override_v = await apply_operator_override(
            session=session,
            verification_id=orig_v.id,
            operator_user=op_user,
            override_result=VerificationResult.resolved,
            rationale="Manual physical audit conducted by senior inspector on-site. Road surface patched cleanly."
        )

        # 14. Original automated result is preserved
        await session.refresh(orig_v)
        assert orig_v.result == VerificationResult.inconclusive
        assert orig_v.id != override_v.id

        # 15. Override records actor and timestamp
        assert override_v.is_override is True
        assert override_v.overrides_verification_id == orig_v.id
        assert override_v.operator_id == "OP-001"
        assert override_v.verifier == "OPERATOR_OVERRIDE"
        assert override_v.result == VerificationResult.resolved
        assert "Manual physical audit" in override_v.rationale

        # Issue should now be verified
        await session.refresh(issue)
        assert issue.status == IssueStatus.verified


# ── TEST 16: RBAC Enforcement on Verification APIs ───────────────────

@pytest.mark.asyncio
async def test_16_rbac_verification_endpoints():
    """Rule 16: Anonymous -> 401, Viewer -> 403, Operator -> 200, Admin -> 200."""
    async with AsyncSessionLocal() as session:
        u_id = f"iss_rbac_{uuid.uuid4().hex[:8]}"
        t_id = f"tkt_rbac_{uuid.uuid4().hex[:8]}"
        issue = UrbanIssue(
            id=u_id,
            issue_type="pothole",
            status=IssueStatus.verification_pending,
            severity=Severity.medium,
            location="POINT(77.2090 28.6139)",
            first_detected_at=datetime.datetime.now(datetime.timezone.utc),
            last_observed_at=datetime.datetime.now(datetime.timezone.utc),
            confidence=0.85
        )
        session.add(issue)
        ticket = Ticket(
            id=t_id,
            display_id=f"TKT-RBAC-{uuid.uuid4().hex[:4]}",
            issue_id=issue.id,
            department_id="DELHI-NCR-ROADS",
            title="RBAC Ticket",
            priority=TicketPriority.medium,
            status=TicketStatus.verifying
        )
        session.add(ticket)
        await session.commit()

        v = await process_verification_reinspection(
            session=session,
            issue_id=u_id,
            coverage_confirmed=False
        )

    # Reinspect endpoint:
    reinspect_payload = {
        "issue_id": u_id,
        "bus_id": "BUS-001",
        "coverage_confirmed": True,
        "evidence_quality": "SUFFICIENT"
    }

    # Anonymous -> 401
    res_anon = client.post("/api/v1/verifications/reinspect", json=reinspect_payload)
    assert res_anon.status_code == 401

    # Viewer -> 403
    res_view = client.post("/api/v1/verifications/reinspect", json=reinspect_payload, headers=VIEWER_HEADERS)
    assert res_view.status_code == 403

    # Operator -> 200
    res_op = client.post("/api/v1/verifications/reinspect", json=reinspect_payload, headers=OPERATOR_HEADERS)
    assert res_op.status_code == 200
    assert "result" in res_op.json()

    # Override endpoint:
    override_payload = {
        "result": "resolved",
        "rationale": "Certified by operations room after physical check"
    }
    # Anonymous -> 401
    res_ovr_anon = client.post(f"/api/v1/verifications/{v.id}/override", json=override_payload)
    assert res_ovr_anon.status_code == 401

    # Viewer -> 403
    res_ovr_view = client.post(f"/api/v1/verifications/{v.id}/override", json=override_payload, headers=VIEWER_HEADERS)
    assert res_ovr_view.status_code == 403

    # Admin -> 200
    res_ovr_admin = client.post(f"/api/v1/verifications/{v.id}/override", json=override_payload, headers=ADMIN_HEADERS)
    assert res_ovr_admin.status_code == 200
    assert res_ovr_admin.json()["isOverride"] is True


# ── TEST 17: Illegal ticket transitions rejected ─────────────────────

@pytest.mark.asyncio
async def test_17_illegal_ticket_transitions_rejected():
    """Rule 17: State machine rejects invalid transitions."""
    async with AsyncSessionLocal() as session:
        t_id = f"tkt_trans_{uuid.uuid4().hex[:8]}"
        u_id = f"iss_trans_{uuid.uuid4().hex[:8]}"
        
        issue = UrbanIssue(
            id=u_id,
            issue_type="pothole",
            status=IssueStatus.new,
            severity=Severity.medium,
            location="POINT(77.2090 28.6139)",
            first_detected_at=datetime.datetime.now(datetime.timezone.utc),
            last_observed_at=datetime.datetime.now(datetime.timezone.utc),
            confidence=0.8
        )
        session.add(issue)
        
        ticket = Ticket(
            id=t_id,
            display_id=f"TKT-TR-{uuid.uuid4().hex[:4]}",
            issue_id=u_id,
            department_id="DELHI-NCR-ROADS",
            title="Transition Validation Ticket",
            priority=TicketPriority.medium,
            status=TicketStatus.open
        )
        session.add(ticket)
        await session.commit()

        # Cannot jump from open directly to verified_resolved
        with pytest.raises(ValueError, match="Invalid transition"):
            await transition_ticket(session, t_id, TicketStatus.verified_resolved)


# ── TEST 18-19: Road Health reflects verification states ──────────────

@pytest.mark.asyncio
async def test_18_19_road_health_verification_impact():
    """
    Tests 18-19:
    - Road health deducts penalty for unresolved / verification_pending issues
    - Road health removes penalty once issue is verified
    """
    async with AsyncSessionLocal() as session:
        from app.models.domain import RoadSegment
        from geoalchemy2.elements import WKTElement

        seg_id = f"seg_rh_{uuid.uuid4().hex[:8]}"
        line_wkt = WKTElement("LINESTRING(77.2080 28.6130, 77.2100 28.6150)", srid=4326)
        seg = RoadSegment(
            id=seg_id,
            name="Ring Road Test Section",
            road_class="arterial",
            geometry=line_wkt
        )
        session.add(seg)

        u_id = f"iss_rh_{uuid.uuid4().hex[:8]}"
        issue = UrbanIssue(
            id=u_id,
            issue_type="pothole",
            status=IssueStatus.reopened,  # Unresolved / reopened
            severity=Severity.high,
            priority=TicketPriority.high,
            location="POINT(77.2090 28.6139)",
            road_segment_id=seg_id,
            first_detected_at=datetime.datetime.now(datetime.timezone.utc),
            last_observed_at=datetime.datetime.now(datetime.timezone.utc),
            observation_count=1,
            unique_bus_count=1,
            confidence=0.85
        )
        session.add(issue)
        await session.commit()

        # 18. Unresolved verification penalty applied
        health_unres = await calculate_segment_health(session, seg_id)
        assert health_unres["healthScore"] < 100.0
        assert health_unres["factors"]["unresolvedVerificationCount"] == 1
        assert health_unres["factors"]["verificationDeduction"] > 0

        # Now mark issue as verified
        issue.status = IssueStatus.verified
        await session.commit()

        # 19. Road Health penalty removed
        health_res = await calculate_segment_health(session, seg_id)
        assert health_res["healthScore"] == 100.0
        assert health_res["factors"]["unresolvedVerificationCount"] == 0
        assert health_res["factors"]["verificationDeduction"] == 0.0
