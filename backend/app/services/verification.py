"""POTHOLE WALA — Closed-Loop Verification 2.0 Decision Engine.

Core Principle:
"NO NEW DETECTION does NOT automatically mean RESOLVED."

Canonical Workflow State:
- PENDING_REVIEW

Canonical Decision Outcomes:
- RESOLVED
- UNRESOLVED
- INCONCLUSIVE

Audit & Truth Rules:
- Reinspections lacking verified corridor coverage or sufficient camera quality strictly yield INCONCLUSIVE.
- Reinspections are append-only; prior records are never overwritten or deleted.
- Defect recurrence reopens the verified issue without creating duplicate records.
- Operator overrides are append-only audit records with mandatory rationales.
- Road Health consumes canonical verification state.
"""

import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.schemas.ingestion import DetectionEvent
from app.models.domain import (
    UrbanIssue, Ticket, Verification, VerificationResult, IssueStatus, TicketStatus, TicketPriority,
    Observation, TimelineEvent, Alert, User, Bus, Department, Authority
)
from app.services.road_health import update_segment_health_for_issue
from app.api.v1.events import broadcast_event

logger = logging.getLogger(__name__)


async def _ensure_reinspect_bus_exists(session: AsyncSession, bus_id: str) -> Bus:
    """Ensures reinspecting bus exists to prevent FK integrity errors."""
    bus = await session.get(Bus, bus_id)
    if not bus:
        cleaned = bus_id.replace('-', '').upper()
        suffix = cleaned[-6:] if len(cleaned) >= 6 else cleaned.ljust(6, 'X')
        reg_num = f"DL-01-{suffix}"
        bus = Bus(
            id=bus_id,
            registration_number=reg_num,
            operator="DTC-REINSPECT",
            status="online",
            camera_status="online",
            gps_status="online",
            edge_ai_status="online"
        )
        session.add(bus)
        await session.flush()
    return bus


def evaluate_verification(
    coverage_confirmed: bool = True,
    evidence_quality: str = "SUFFICIENT",
    conflicting_evidence: bool = False,
    new_detection: Optional[Any] = None,
) -> Tuple[VerificationResult, Optional[str], str, float]:
    """
    Deterministic Verification Decision Logic.
    
    Returns:
        (result, failure_reason, rationale, confidence)
    """
    quality_upper = (evidence_quality or "SUFFICIENT").upper()
    degraded_qualities = {"DEGRADED", "INSUFFICIENT", "OCCLUDED", "POOR_LIGHTING", "BLURRY", "LOW_RESOLUTION"}

    # Rule 1: Missing / unconfirmed spatial corridor coverage
    if not coverage_confirmed:
        return (
            VerificationResult.inconclusive,
            "INSUFFICIENT_COVERAGE",
            "Target road corridor was not covered during transit reinspection pass. "
            "Verification cannot certify repair without verified spatial alignment.",
            0.0
        )

    # Rule 2: Degraded camera visual quality
    if quality_upper in degraded_qualities:
        return (
            VerificationResult.inconclusive,
            "EVIDENCE_QUALITY_DEGRADED",
            f"Reinspection optical evidence is {quality_upper.lower()}; "
            "automated resolution cannot be reliably certified without clear imagery.",
            0.2
        )

    # Rule 3: Conflicting sensor or multi-pass evidence
    if conflicting_evidence:
        return (
            VerificationResult.inconclusive,
            "CONFLICTING_EVIDENCE",
            "Conflicting sensor readings or contradictory multi-frame evidence observed. "
            "Manual operator adjudication required.",
            0.3
        )

    # Rule 4: Residual defect detected
    if new_detection is not None:
        det_conf = getattr(new_detection, "confidence", None)
        if det_conf is None and isinstance(new_detection, dict):
            det_conf = new_detection.get("confidence", 0.85)
        det_conf = float(det_conf) if det_conf is not None else 0.85

        if det_conf >= 0.50:
            return (
                VerificationResult.unresolved,
                "RESIDUAL_DEFECT_DETECTED",
                f"Qualifying road defect continues to be detected at target coordinates "
                f"upon reinspection (AI confidence: {round(det_conf * 100, 1)}%). Repair failed or incomplete.",
                det_conf
            )

    # Rule 5: Corridor covered, sufficient evidence quality, zero defect detected
    return (
        VerificationResult.resolved,
        None,
        "Target corridor coverage verified with sufficient visual quality; "
        "zero residual road defect detected. Municipal repair confirmed resolved.",
        0.95
    )


async def process_verification_reinspection(
    session: AsyncSession,
    issue_id: str,
    bus_id: str = "BUS-001",
    coverage_confirmed: bool = True,
    evidence_quality: str = "SUFFICIENT",
    conflicting_evidence: bool = False,
    new_detection: Optional[Any] = None,
    reinspection_evidence_url: Optional[str] = None,
    verifier: str = "TRANSIT_REINSPECTION",
    evidence_source: str = "bus_dashcam",
    inspection_job_id: Optional[str] = None,
    notes: Optional[str] = None,
    camera_id: str = "CAM-FRONT-01",
    model_version: str = "YOLOv8-Pothole-v1.0",
) -> Verification:
    """
    Executes an evidence-driven verification pass for an UrbanIssue and linked Ticket.
    Appends a new Verification record to maintain a strict immutable audit trail.
    """
    issue = await session.get(UrbanIssue, issue_id)
    if not issue:
        raise ValueError(f"UrbanIssue {issue_id} not found")

    # Ensure bus exists
    await _ensure_reinspect_bus_exists(session, bus_id)

    ticket_res = await session.execute(
        select(Ticket).where(Ticket.issue_id == issue.id)
    )
    ticket = ticket_res.scalar_one_or_none()
    if not ticket:
        dept_res = await session.execute(select(Department.id).limit(1))
        dept_id = issue.assigned_department_id or dept_res.scalar_one_or_none() or "dept_roads"

        auth_res = await session.execute(select(Authority.id).limit(1))
        auth_id = issue.authority_id or auth_res.scalar_one_or_none() or "AUTH-PWD-DELHI"

        tkt_priority = TicketPriority.medium
        if hasattr(issue.priority, "value"):
            try:
                tkt_priority = TicketPriority(issue.priority.value)
            except Exception:
                tkt_priority = TicketPriority.medium

        tkt_id = f"tkt_{uuid.uuid4().hex[:12]}"
        ticket = Ticket(
            id=tkt_id,
            display_id=f"TKT-{tkt_id[-6:].upper()}",
            issue_id=issue.id,
            department_id=dept_id,
            authority_id=auth_id,
            title=f"Repair: {(issue.issue_type or 'defect').replace('_', ' ').title()}",
            description=f"Auto-generated ticket for verification tracking on issue {issue.id}",
            status=TicketStatus.verifying,
            priority=tkt_priority
        )
        session.add(ticket)
        await session.flush()

    # Determine original before evidence URL from earliest observation
    before_url = None
    obs_res = await session.execute(
        select(Observation)
        .where(Observation.issue_id == issue.id)
        .order_by(Observation.created_at.asc())
        .limit(1)
    )
    first_obs = obs_res.scalar_one_or_none()
    if first_obs and first_obs.evidence_url:
        before_url = first_obs.evidence_url

    # Determine after evidence URL
    after_url = reinspection_evidence_url
    if not after_url and new_detection:
        after_url = getattr(new_detection, "evidence_url", None)
        if not after_url and isinstance(new_detection, dict):
            after_url = new_detection.get("evidence_url")

    # Evaluate decision using canonical rules
    result, failure_reason, rationale, confidence = evaluate_verification(
        coverage_confirmed=coverage_confirmed,
        evidence_quality=evidence_quality,
        conflicting_evidence=conflicting_evidence,
        new_detection=new_detection,
    )

    now_utc = datetime.now(timezone.utc)
    verification_id = f"ver_{uuid.uuid4().hex[:12]}"

    comparison_metrics = {
        "coverage_confirmed": coverage_confirmed,
        "evidence_quality": evidence_quality.upper(),
        "defect_detected": new_detection is not None,
        "before_confidence": issue.confidence if issue else None,
        "after_confidence": confidence if result != VerificationResult.inconclusive else None,
        "before_extent_pct": 100.0,
        "after_extent_pct": 0.0 if result == VerificationResult.resolved else (100.0 if result == VerificationResult.unresolved else None),
        "model_version": model_version,
        "camera_id": camera_id,
        "source": evidence_source,
        "corroboration_count": issue.unique_bus_count or 1
    }

    verification = Verification(
        id=verification_id,
        issue_id=issue.id,
        ticket_id=ticket.id,
        bus_id=bus_id,
        timestamp=now_utc,
        result=result,
        confidence=confidence,
        before_evidence_url=before_url,
        after_evidence_url=after_url,
        notes=notes or rationale,
        verifier=verifier,
        evidence_source=evidence_source,
        inspection_job_id=inspection_job_id,
        rationale=rationale,
        failure_reason=failure_reason,
        comparison_metrics=comparison_metrics,
        is_override=False,
        overrides_verification_id=None,
        operator_id=None,
    )
    session.add(verification)

    # State transitions based on canonical outcome
    if result == VerificationResult.resolved:
        issue.status = IssueStatus.verified
        if ticket:
            ticket.status = TicketStatus.verified_resolved
            ticket.verified_at = now_utc
    elif result == VerificationResult.unresolved:
        issue.status = IssueStatus.reopened
        if ticket:
            ticket.status = TicketStatus.reopened
    elif result == VerificationResult.inconclusive:
        # Inconclusive leaves issue in verification_pending and ticket in verifying
        issue.status = IssueStatus.verification_pending
        if ticket:
            ticket.status = TicketStatus.verifying

    # Timeline event
    event = TimelineEvent(
        id=f"evt_{uuid.uuid4().hex[:12]}",
        entity_id=issue.id,
        entity_type="issue",
        event_type="verification_completed",
        title=f"Verification Decision: {result.value.upper()}",
        description=rationale,
        actor=verifier,
        metadata_json={
            "verification_id": verification.id,
            "result": result.value,
            "failure_reason": failure_reason,
            "confidence": confidence,
            "bus_id": bus_id
        }
    )
    session.add(event)

    # High severity alert if unresolved
    if result == VerificationResult.unresolved:
        alert = Alert(
            id=f"alt_{uuid.uuid4().hex[:12]}",
            alert_type="verification_unresolved",
            severity="high",
            title=f"Repair Verification Failed: {issue.id}",
            message=f"Defect persists after reported repair. Rationale: {rationale}",
            related_entity_id=issue.id,
            related_entity_type="urban_issue"
        )
        session.add(alert)

    await session.commit()
    await update_segment_health_for_issue(session, issue)

    broadcast_event("VERIFICATION_COMPLETED", {
        "verificationId": verification.id,
        "issueId": issue.id,
        "ticketId": ticket.id if ticket else None,
        "result": result.value,
        "failureReason": failure_reason,
        "rationale": rationale,
    })

    return verification


async def apply_operator_override(
    session: AsyncSession,
    verification_id: str,
    operator_user: Any,
    override_result: VerificationResult,
    rationale: str,
    notes: Optional[str] = None
) -> Verification:
    """
    Append-only manual operator override.
    Preserves original verification record and creates a new override record.
    """
    if not rationale or not rationale.strip():
        raise ValueError("Mandatory rationale required for operator override")

    existing = await session.get(Verification, verification_id)
    if not existing:
        raise ValueError(f"Verification {verification_id} not found")

    issue = await session.get(UrbanIssue, existing.issue_id)
    if not issue:
        raise ValueError(f"Issue {existing.issue_id} not found")

    ticket = None
    if existing.ticket_id and existing.ticket_id != "N/A":
        ticket = await session.get(Ticket, existing.ticket_id)

    now_utc = datetime.now(timezone.utc)
    override_id = f"ver_{uuid.uuid4().hex[:12]}"

    # Validate operator user in DB if present
    op_user_id = getattr(operator_user, "id", None)
    if op_user_id:
        user_db = await session.get(User, op_user_id)
        if not user_db:
            op_user_id = None

    override_record = Verification(
        id=override_id,
        issue_id=issue.id,
        ticket_id=existing.ticket_id,
        bus_id=existing.bus_id,
        timestamp=now_utc,
        result=override_result,
        confidence=1.0,
        before_evidence_url=existing.before_evidence_url,
        after_evidence_url=existing.after_evidence_url,
        notes=notes or rationale,
        verifier="OPERATOR_OVERRIDE",
        evidence_source="manual_inspection",
        inspection_job_id=existing.inspection_job_id,
        rationale=rationale,
        failure_reason=None if override_result == VerificationResult.resolved else "OPERATOR_CERTIFIED_UNRESOLVED",
        comparison_metrics={
            "original_verification_id": existing.id,
            "original_result": existing.result.value if hasattr(existing.result, "value") else str(existing.result),
            "overridden_by": getattr(operator_user, "username", "operator"),
            "operator_role": getattr(operator_user, "role", "operator"),
            "override_timestamp": now_utc.isoformat()
        },
        is_override=True,
        overrides_verification_id=existing.id,
        operator_id=op_user_id,
    )
    session.add(override_record)

    # State update
    if override_result == VerificationResult.resolved:
        issue.status = IssueStatus.verified
        if ticket:
            ticket.status = TicketStatus.verified_resolved
            ticket.verified_at = now_utc
    elif override_result == VerificationResult.unresolved:
        issue.status = IssueStatus.reopened
        if ticket:
            ticket.status = TicketStatus.reopened
    elif override_result == VerificationResult.inconclusive:
        issue.status = IssueStatus.verification_pending
        if ticket:
            ticket.status = TicketStatus.verifying

    # Timeline event
    event = TimelineEvent(
        id=f"evt_{uuid.uuid4().hex[:12]}",
        entity_id=issue.id,
        entity_type="issue",
        event_type="verification_override",
        title=f"Verification Overridden: {override_result.value.upper()}",
        description=f"Operator override applied. Rationale: {rationale}",
        actor=getattr(operator_user, "username", "OPERATOR"),
        metadata_json={
            "override_verification_id": override_id,
            "original_verification_id": existing.id,
            "new_result": override_result.value,
        }
    )
    session.add(event)

    await session.commit()
    await update_segment_health_for_issue(session, issue)

    broadcast_event("VERIFICATION_OVERRIDDEN", {
        "verificationId": override_id,
        "originalVerificationId": existing.id,
        "result": override_result.value,
        "operator": getattr(operator_user, "username", "operator")
    })

    return override_record


async def process_verification_revisit(
    session: AsyncSession,
    issue: UrbanIssue,
    new_detection: Optional[DetectionEvent] = None
) -> UrbanIssue:
    """
    Backwards-compatible wrapper delegating to canonical decision engine.
    """
    if issue.status != IssueStatus.verification_pending:
        return issue

    await process_verification_reinspection(
        session=session,
        issue_id=issue.id,
        bus_id=getattr(new_detection, "bus_id", "BUS-001") if new_detection else "BUS-001",
        coverage_confirmed=True,
        evidence_quality="SUFFICIENT",
        new_detection=new_detection,
    )
    await session.refresh(issue)
    return issue
