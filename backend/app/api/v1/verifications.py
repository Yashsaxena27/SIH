from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional

from app.core.database import get_db
from app.models.domain import Verification, VerificationResult, UrbanIssue, Ticket, Authority, Department

router = APIRouter(prefix="/api/v1/verifications", tags=["Verifications"])

@router.get("")
async def get_verifications(session: AsyncSession = Depends(get_db)):
    """
    Returns field verification records with linked ticket, issue, authority, and evidence provenance.
    Truthful disclosure: confidence is exposed only when genuine; no fake fallbacks.
    """
    result = await session.execute(select(Verification).order_by(Verification.timestamp.desc()))
    verifications = result.scalars().all()
    
    # Prefetch issues, tickets, authorities, departments
    issue_ids = [v.issue_id for v in verifications if v.issue_id]
    ticket_ids = [v.ticket_id for v in verifications if v.ticket_id]

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

        res_str = v.result.value if hasattr(v.result, "value") else str(v.result)
        
        serialized.append({
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
        })

    return serialized


@router.get("/summary")
async def get_verification_summary(session: AsyncSession = Depends(get_db)):
    total = await session.scalar(select(func.count()).select_from(Verification))
    resolved = await session.scalar(select(func.count()).select_from(Verification).where(Verification.result == VerificationResult.resolved))
    unresolved = await session.scalar(select(func.count()).select_from(Verification).where(Verification.result == VerificationResult.unresolved))
    partial = await session.scalar(select(func.count()).select_from(Verification).where(Verification.result == VerificationResult.partially_resolved))
    inconclusive = await session.scalar(select(func.count()).select_from(Verification).where(Verification.result == VerificationResult.inconclusive))
    pending = await session.scalar(select(func.count()).select_from(Verification).where(Verification.result == VerificationResult.pending_review))
    
    return {
        "totalVerifications": total or 0,
        "resolved": resolved or 0,
        "unresolved": unresolved or 0,
        "partiallyResolved": partial or 0,
        "inconclusive": inconclusive or 0,
        "pendingReview": pending or 0,
        "verificationRate": round((resolved / total * 100), 1) if total and resolved else 0,
        "averageVerificationDays": None,
        "accuracyRate": None
    }


@router.get("/{verification_id}")
async def get_verification_detail(verification_id: str, session: AsyncSession = Depends(get_db)):
    """Returns single verification detail with full context."""
    v = await session.get(Verification, verification_id)
    if not v:
        raise HTTPException(status_code=404, detail="Verification record not found")

    issue = await session.get(UrbanIssue, v.issue_id) if v.issue_id else None
    ticket = await session.get(Ticket, v.ticket_id) if v.ticket_id else None

    auth_id = (ticket.authority_id if ticket and ticket.authority_id else None) or (issue.authority_id if issue else None)
    dept_id = (ticket.department_id if ticket else None) or (issue.assigned_department_id if issue else None)

    auth = await session.get(Authority, auth_id) if auth_id else None
    dept = await session.get(Department, dept_id) if dept_id else None

    res_str = v.result.value if hasattr(v.result, "value") else str(v.result)

    return {
        "id": v.id,
        "issueId": v.issue_id,
        "issueType": issue.issue_type if issue else "Road Defect",
        "ticketId": v.ticket_id,
        "ticketDisplayId": ticket.display_id if ticket else None,
        "busId": v.bus_id,
        "timestamp": v.timestamp.isoformat() if v.timestamp else None,
        "result": res_str,
        "confidence": v.confidence if v.confidence is not None else None,
        "notes": v.notes,
        "authorityId": auth.id if auth else None,
        "authorityName": auth.name if auth else None,
        "authorityCode": auth.code if auth else None,
        "departmentId": dept.id if dept else None,
        "departmentName": dept.name if dept else None,
        "beforeEvidence": {"url": v.before_evidence_url} if v.before_evidence_url else None,
        "afterEvidence": {"url": v.after_evidence_url} if v.after_evidence_url else None,
        "hasBeforeEvidence": bool(v.before_evidence_url),
        "hasAfterEvidence": bool(v.after_evidence_url),
    }
