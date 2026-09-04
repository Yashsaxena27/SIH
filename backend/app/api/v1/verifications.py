from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.models.domain import Verification, VerificationResult

router = APIRouter(prefix="/api/v1/verifications", tags=["Verifications"])

@router.get("")
async def get_verifications(session: AsyncSession = Depends(get_db)):
    result = await session.execute(select(Verification))
    verifications = result.scalars().all()
    
    return [
        {
            "id": v.id,
            "issueId": v.issue_id,
            "ticketId": v.ticket_id,
            "busId": v.bus_id,
            "timestamp": v.timestamp,
            "result": v.result,
            "confidence": v.confidence,
            "notes": v.notes,
            "beforeEvidence": {"url": v.before_evidence_url} if v.before_evidence_url else None,
            "afterEvidence": {"url": v.after_evidence_url} if v.after_evidence_url else None
        }
        for v in verifications
    ]

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
