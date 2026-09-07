from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional, List, Any
from pydantic import BaseModel, ConfigDict

from app.core.database import get_db
from app.core.auth import get_current_user, require_role, AuthenticatedUser
from app.models.domain import (
    Verification, VerificationResult, UrbanIssue, Ticket, Authority, Department, UserRole
)
from app.services.verification import process_verification_reinspection, apply_operator_override

router = APIRouter(prefix="/api/v1/verifications", tags=["Verifications"])


class ReinspectionRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    issue_id: str
    bus_id: str = "BUS-001"
    coverage_confirmed: bool = True
    evidence_quality: str = "SUFFICIENT"
    conflicting_evidence: bool = False
    new_detection: Optional[Any] = None
    reinspection_evidence_url: Optional[str] = None
    verifier: str = "TRANSIT_REINSPECTION"
    evidence_source: str = "bus_dashcam"
    inspection_job_id: Optional[str] = None
    notes: Optional[str] = None
    camera_id: str = "CAM-FRONT-01"
    model_version: str = "YOLOv8-Pothole-v1.0"


class OverrideRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    result: str  # "resolved", "unresolved", "inconclusive"
    rationale: str
    notes: Optional[str] = None


def _serialize_verification(v: Verification, issue: Optional[UrbanIssue] = None, ticket: Optional[Ticket] = None, auth: Optional[Authority] = None, dept: Optional[Department] = None) -> dict:
    res_str = v.result.value if hasattr(v.result, "value") else str(v.result)
    return {
        "id": v.id,
        "issueId": v.issue_id,
        "issue_id": v.issue_id,
        "issueType": issue.issue_type if issue else "Road Defect",
        "ticketId": v.ticket_id,
        "ticket_id": v.ticket_id,
        "ticketDisplayId": ticket.display_id if ticket else None,
        "busId": v.bus_id,
        "bus_id": v.bus_id,
        "timestamp": v.timestamp.isoformat() if v.timestamp else None,
        "result": res_str,
        "confidence": v.confidence if v.confidence is not None else None,
        "notes": v.notes,
        "verifier": v.verifier or "TRANSIT_REINSPECTION",
        "evidenceSource": v.evidence_source or "bus_dashcam",
        "inspectionJobId": v.inspection_job_id,
        "rationale": v.rationale,
        "failureReason": v.failure_reason,
        "comparisonMetrics": v.comparison_metrics,
        "isOverride": v.is_override or False,
        "overridesVerificationId": v.overrides_verification_id,
        "operatorId": v.operator_id,
        "authorityId": auth.id if auth else None,
        "authorityName": auth.name if auth else None,
        "authorityCode": auth.code if auth else None,
        "departmentId": dept.id if dept else None,
        "departmentName": dept.name if dept else None,
        "beforeEvidenceUrl": v.before_evidence_url,
        "afterEvidenceUrl": v.after_evidence_url,
        "beforeEvidence": {"url": v.before_evidence_url} if v.before_evidence_url else None,
        "afterEvidence": {"url": v.after_evidence_url} if v.after_evidence_url else None,
        "hasBeforeEvidence": bool(v.before_evidence_url),
        "hasAfterEvidence": bool(v.after_evidence_url),
    }


@router.get("")
async def get_verifications(
    result: Optional[str] = None,
    issue_id: Optional[str] = None,
    ticket_id: Optional[str] = None,
    verifier: Optional[str] = None,
    session: AsyncSession = Depends(get_db)
):
    """
    Returns field verification records with query filters, provenance, and decision breakdown.
    """
    query = select(Verification).order_by(Verification.timestamp.desc())

    if result:
        # Match case-insensitively to VerificationResult enum
        norm = result.lower().strip()
        try:
            v_res = VerificationResult(norm)
            query = query.where(Verification.result == v_res)
        except ValueError:
            query = query.where(func.lower(Verification.result.cast(String)) == norm)

    if issue_id:
        query = query.where(Verification.issue_id == issue_id)

    if ticket_id:
        query = query.where(Verification.ticket_id == ticket_id)

    if verifier:
        query = query.where(Verification.verifier == verifier)

    res = await session.execute(query)
    verifications = res.scalars().all()

    issue_ids = [v.issue_id for v in verifications if v.issue_id]
    ticket_ids = [v.ticket_id for v in verifications if v.ticket_id and v.ticket_id != "N/A"]

    issues = {}
    if issue_ids:
        iss_res = await session.execute(select(UrbanIssue).where(UrbanIssue.id.in_(issue_ids)))
        issues = {i.id: i for i in iss_res.scalars().all()}

    tickets = {}
    if ticket_ids:
        tkt_res = await session.execute(select(Ticket).where(Ticket.id.in_(ticket_ids)))
        tickets = {t.id: t for t in tkt_res.scalars().all()}

    auth_res = await session.execute(select(Authority))
    auth_map = {a.id: a for a in auth_res.scalars().all()}

    dept_res = await session.execute(select(Department))
    dept_map = {d.id: d for d in dept_res.scalars().all()}

    serialized = []
    for v in verifications:
        issue = issues.get(v.issue_id)
        ticket = tickets.get(v.ticket_id)
        auth_id = (ticket.authority_id if ticket and ticket.authority_id else None) or (issue.authority_id if issue else None)
        dept_id = (ticket.department_id if ticket else None) or (issue.assigned_department_id if issue else None)
        auth = auth_map.get(auth_id)
        dept = dept_map.get(dept_id)

        serialized.append(_serialize_verification(v, issue, ticket, auth, dept))

    return serialized


@router.get("/summary")
async def get_verification_summary(session: AsyncSession = Depends(get_db)):
    total = await session.scalar(select(func.count()).select_from(Verification))
    resolved = await session.scalar(select(func.count()).select_from(Verification).where(Verification.result == VerificationResult.resolved))
    unresolved = await session.scalar(select(func.count()).select_from(Verification).where(Verification.result == VerificationResult.unresolved))
    inconclusive = await session.scalar(select(func.count()).select_from(Verification).where(Verification.result == VerificationResult.inconclusive))
    pending = await session.scalar(select(func.count()).select_from(Verification).where(Verification.result == VerificationResult.pending_review))

    # Calculate pending review issues as issues in verification_pending
    pending_issues_count = await session.scalar(
        select(func.count()).select_from(UrbanIssue).where(UrbanIssue.status == "verification_pending")
    ) or 0

    return {
        "totalVerifications": total or 0,
        "resolved": resolved or 0,
        "unresolved": unresolved or 0,
        "inconclusive": inconclusive or 0,
        "pendingReview": pending_issues_count if pending_issues_count > 0 else (pending or 0),
        "verificationRate": round((resolved / total * 100), 1) if total and resolved else 0,
        "averageVerificationDays": None,
        "accuracyRate": None
    }


@router.post("/reinspect")
async def reinspect_issue(
    payload: ReinspectionRequest,
    session: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_role([UserRole.operator, UserRole.admin]))
):
    """
    Triggers an evidence-driven reinspection pass evaluated by the canonical Verification Decision Engine.
    Requires operator or admin permissions.
    """
    try:
        verification = await process_verification_reinspection(
            session=session,
            issue_id=payload.issue_id,
            bus_id=payload.bus_id,
            coverage_confirmed=payload.coverage_confirmed,
            evidence_quality=payload.evidence_quality,
            conflicting_evidence=payload.conflicting_evidence,
            new_detection=payload.new_detection,
            reinspection_evidence_url=payload.reinspection_evidence_url,
            verifier=payload.verifier,
            evidence_source=payload.evidence_source,
            inspection_job_id=payload.inspection_job_id,
            notes=payload.notes,
            camera_id=payload.camera_id,
            model_version=payload.model_version
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    issue = await session.get(UrbanIssue, verification.issue_id)
    ticket = await session.get(Ticket, verification.ticket_id) if verification.ticket_id and verification.ticket_id != "N/A" else None

    return _serialize_verification(verification, issue, ticket)


@router.post("/{verification_id}/override")
async def override_verification(
    verification_id: str,
    payload: OverrideRequest,
    session: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_role([UserRole.operator, UserRole.admin]))
):
    """
    Applies an append-only manual operator override.
    Requires mandatory non-empty rationale and operator/admin permissions.
    """
    if not payload.rationale or not payload.rationale.strip():
        raise HTTPException(status_code=400, detail="Mandatory rationale required for operator override")

    try:
        override_res = VerificationResult(payload.result.lower().strip())
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid override result: {payload.result}. Must be resolved, unresolved, or inconclusive.")

    try:
        override_record = await apply_operator_override(
            session=session,
            verification_id=verification_id,
            operator_user=current_user,
            override_result=override_res,
            rationale=payload.rationale,
            notes=payload.notes
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    issue = await session.get(UrbanIssue, override_record.issue_id)
    ticket = await session.get(Ticket, override_record.ticket_id) if override_record.ticket_id and override_record.ticket_id != "N/A" else None

    return _serialize_verification(override_record, issue, ticket)


@router.get("/{verification_id}")
async def get_verification_detail(verification_id: str, session: AsyncSession = Depends(get_db)):
    """Returns single verification detail with full context."""
    v = await session.get(Verification, verification_id)
    if not v:
        raise HTTPException(status_code=404, detail="Verification record not found")

    issue = await session.get(UrbanIssue, v.issue_id) if v.issue_id else None
    ticket = await session.get(Ticket, v.ticket_id) if v.ticket_id and v.ticket_id != "N/A" else None

    auth_id = (ticket.authority_id if ticket and ticket.authority_id else None) or (issue.authority_id if issue else None)
    dept_id = (ticket.department_id if ticket else None) or (issue.assigned_department_id if issue else None)

    auth = await session.get(Authority, auth_id) if auth_id else None
    dept = await session.get(Department, dept_id) if dept_id else None

    return _serialize_verification(v, issue, ticket, auth, dept)
