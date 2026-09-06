from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.core.database import get_db
from app.models.domain import Authority, Department, Jurisdiction

router = APIRouter(prefix="/api/v1/authorities", tags=["Authorities"])


@router.get("")
async def get_authorities(session: AsyncSession = Depends(get_db)):
    """
    Returns all configured municipal and highway authorities,
    with their associated departments and prototype jurisdictions.
    Data-driven for frontend filters and routing.
    """
    auth_result = await session.execute(
        select(Authority).where(Authority.is_active == True).order_by(Authority.id.asc())
    )
    authorities = auth_result.scalars().all()

    dept_result = await session.execute(
        select(Department).where(Department.is_active == True).order_by(Department.id.asc())
    )
    departments = dept_result.scalars().all()

    jur_result = await session.execute(
        select(Jurisdiction).where(Jurisdiction.is_active == True).order_by(Jurisdiction.id.asc())
    )
    jurisdictions = jur_result.scalars().all()

    dept_by_auth = {}
    for d in departments:
        if d.authority_id:
            dept_by_auth.setdefault(d.authority_id, []).append({
                "id": d.id,
                "name": d.name,
                "type": d.department_type,
                "serviceArea": d.service_area
            })

    jur_by_auth = {}
    for j in jurisdictions:
        jur_by_auth.setdefault(j.authority_id, []).append({
            "id": j.id,
            "name": j.name,
            "boundaryType": j.boundary_type
        })

    res = []
    for a in authorities:
        jurs = jur_by_auth.get(a.id, [])
        primary_jur = jurs[0] if jurs else None
        res.append({
            "id": a.id,
            "name": a.name,
            "code": a.code,
            "authorityType": a.authority_type,
            "boundaryType": primary_jur["boundaryType"] if primary_jur else "prototype_boundary",
            "boundaryProvenance": "configured_prototype_polygon" if primary_jur else "unconfigured",
            "isConfiguredPrototype": bool(primary_jur),
            "departments": dept_by_auth.get(a.id, []),
            "jurisdictions": jurs,
            "isActive": a.is_active
        })
    return res
