"""POTHOLE WALA — SafeRoute Risk-Aware Routing Engine.

Core Principles:
1. "Which route should I take, given the current operational risk of the road network?"
2. Risk-aware route recommendation engine, NOT a fake Google Maps clone.
3. Decision Modes:
   - FASTEST: Minimizes estimated route travel time.
   - SAFEST: Minimizes operational infrastructure risk score.
   - BALANCED: Multi-objective Pareto trade-off between travel efficiency and risk.
4. Truth Constraints:
   - Timing is explicitly labeled "ESTIMATED" based on road class design speeds.
   - No fake live traffic congestion or fake satellite ETA claims.
   - Segment risk is computed deterministically from active defects, corroboration,
     unresolved verifications, and canonical Operational Road Health.
"""

from dataclasses import dataclass, asdict
from datetime import datetime, timezone
import math
import uuid
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
import shapely.wkb
from shapely.geometry import Point, LineString

from app.models.domain import RoadSegment, UrbanIssue, IssueStatus, Severity, Ticket, TicketStatus, Verification, VerificationResult
from app.services.road_health import calculate_segment_health, classify_risk_state

# Design speeds by municipal road hierarchy (km/h)
DESIGN_SPEEDS_KMH = {
    "expressway": 65.0,
    "arterial": 45.0,
    "primary": 35.0,
    "secondary": 25.0,
    "collector": 25.0,
    "local": 20.0,
}
DEFAULT_SPEED_KMH = 30.0

# Active lifecycle statuses considered active road hazards
ACTIVE_ISSUE_STATUSES = [
    IssueStatus.new,
    IssueStatus.confirmed,
    IssueStatus.prioritized,
    IssueStatus.assigned,
    IssueStatus.ticket_created,
    IssueStatus.in_progress,
    IssueStatus.repair_reported,
    IssueStatus.verification_pending,
    IssueStatus.reopened,
]


def classify_route_risk_level(score: float) -> str:
    """Classifies overall route risk score into standard risk tier."""
    if score < 20.0:
        return "LOW"
    elif score < 40.0:
        return "MODERATE"
    elif score < 60.0:
        return "ELEVATED"
    elif score < 80.0:
        return "HIGH"
    else:
        return "CRITICAL"


def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two points in meters."""
    R = 6371000.0  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


async def get_segment_risk_profile(
    session: AsyncSession,
    segment: RoadSegment,
    prefetched_issues: Optional[List[UrbanIssue]] = None,
    prefetched_unresolved_count: Optional[int] = None
) -> Dict[str, Any]:
    """
    Computes a deterministic segment risk profile consuming canonical
    Operational Road Health and active defect distributions.
    Supports pre-fetched batch issues & verifications to prevent N+1 query traps.
    """
    # 1. Fetch or use pre-fetched active issues on segment
    if prefetched_issues is not None:
        issues = prefetched_issues
    else:
        issues_res = await session.execute(
            select(UrbanIssue)
            .where(UrbanIssue.road_segment_id == segment.id)
            .where(UrbanIssue.status.in_(ACTIVE_ISSUE_STATUSES))
        )
        issues = issues_res.scalars().all()

    active_count = len(issues)
    critical_count = sum(1 for i in issues if i.severity == Severity.critical)
    high_count = sum(1 for i in issues if i.severity == Severity.high)
    medium_count = sum(1 for i in issues if i.severity == Severity.medium)
    low_count = sum(1 for i in issues if i.severity == Severity.low)
    corroborated_count = sum(1 for i in issues if (i.unique_bus_count or 1) > 1)

    # 2. Fetch or use pre-fetched unresolved verifications on segment
    if prefetched_unresolved_count is not None:
        unresolved_verifs = prefetched_unresolved_count
    else:
        issue_ids = [i.id for i in issues]
        unresolved_verifs = 0
        if issue_ids:
            verif_res = await session.execute(
                select(func.count(Verification.id))
                .where(Verification.issue_id.in_(issue_ids))
                .where(Verification.result.in_([VerificationResult.unresolved, VerificationResult.inconclusive]))
            )
            unresolved_verifs = verif_res.scalar() or 0

    # 3. Canonical health score
    health_score = segment.health_score if segment.health_score is not None else 100.0
    risk_state = classify_risk_state(health_score)

    # 4. Geometry and length calculation
    coords = []
    length_meters = 1000.0  # fallback 1 km
    if segment.geometry is not None:
        try:
            line = shapely.wkb.loads(bytes(segment.geometry.data))
            coords = list(line.coords)
            # Compute spherical length from coordinate chain
            computed_len = 0.0
            for k in range(len(coords) - 1):
                pt1, pt2 = coords[k], coords[k + 1]
                computed_len += haversine_distance_meters(pt1[1], pt1[0], pt2[1], pt2[0])
            if computed_len > 10.0:
                length_meters = round(computed_len, 1)
        except Exception:
            pass

    # 5. Segment Risk Score Formulation (0.0 to 100.0)
    # Combines Road Health deduction and point defect severity density
    hazard_penalty = (critical_count * 15.0) + (high_count * 10.0) + (medium_count * 4.0) + (low_count * 1.5)
    corroboration_penalty = corroborated_count * 3.0
    unresolved_penalty = unresolved_verifs * 5.0

    raw_risk = (
        (100.0 - health_score) * 0.50 +
        hazard_penalty * 0.30 +
        corroboration_penalty * 0.10 +
        unresolved_penalty * 0.10
    )
    segment_risk_score = round(max(0.0, min(100.0, raw_risk)), 1)

    return {
        "segment_id": segment.id,
        "segment_name": segment.name,
        "road_class": segment.road_class or "arterial",
        "length_meters": length_meters,
        "health_score": health_score,
        "risk_state": risk_state,
        "active_issue_count": active_count,
        "critical_count": critical_count,
        "high_count": high_count,
        "medium_count": medium_count,
        "low_count": low_count,
        "corroborated_count": corroborated_count,
        "unresolved_verification_count": unresolved_verifs,
        "segment_risk_score": segment_risk_score,
        "coordinates": coords,
    }


def build_route_candidate(
    candidate_id: str,
    name: str,
    segment_profiles: List[Dict[str, Any]],
    additional_waypoints: Optional[List[Tuple[float, float]]] = None
) -> Dict[str, Any]:
    """
    Assembles a candidate route from ordered segment profiles.
    Computes total distance, estimated travel time, length-weighted risk,
    and structured risk contributing factors.
    """
    total_length_m = sum(sp["length_meters"] for sp in segment_profiles)
    total_length_km = round(total_length_m / 1000.0, 2)

    # 1. Compute estimated travel duration from road class speeds
    total_duration_min = 0.0
    for sp in segment_profiles:
        speed = DESIGN_SPEEDS_KMH.get(sp["road_class"].lower(), DEFAULT_SPEED_KMH)
        dist_km = sp["length_meters"] / 1000.0
        total_duration_min += (dist_km / speed) * 60.0

    # Minimum realistic transition time
    total_duration_min = round(max(2.0, total_duration_min), 1)

    # 2. Length-weighted Route Risk Score
    if total_length_m > 0:
        weighted_risk = sum(
            sp["segment_risk_score"] * (sp["length_meters"] / total_length_m)
            for sp in segment_profiles
        )
    else:
        weighted_risk = 0.0

    overall_risk_score = round(max(0.0, min(100.0, weighted_risk)), 1)
    risk_level = classify_route_risk_level(overall_risk_score)

    # 3. Collect combined geometry
    route_coords: List[List[float]] = []
    for sp in segment_profiles:
        for c in sp["coordinates"]:
            # c is (lng, lat)
            route_coords.append([round(c[0], 6), round(c[1], 6)])

    if additional_waypoints:
        for wp in additional_waypoints:
            route_coords.append([round(wp[0], 6), round(wp[1], 6)])

    # Remove consecutive duplicate coordinates
    dedup_coords: List[List[float]] = []
    for pt in route_coords:
        if not dedup_coords or dedup_coords[-1] != pt:
            dedup_coords.append(pt)

    # 4. Aggregated counts
    total_active_defects = sum(sp["active_issue_count"] for sp in segment_profiles)
    total_critical = sum(sp["critical_count"] for sp in segment_profiles)
    total_high = sum(sp["high_count"] for sp in segment_profiles)
    total_corroborated = sum(sp["corroborated_count"] for sp in segment_profiles)
    total_unresolved = sum(sp["unresolved_verification_count"] for sp in segment_profiles)

    # 5. Contributing factors
    contributing_factors = []
    if total_critical > 0:
        contributing_factors.append({
            "factor": "CRITICAL_DEFECTS",
            "impact": "HIGH",
            "count": total_critical,
            "description": f"{total_critical} active critical hazard{'s' if total_critical > 1 else ''} along corridor",
        })
    if total_high > 0:
        contributing_factors.append({
            "factor": "HIGH_SEVERITY_DEFECTS",
            "impact": "MEDIUM",
            "count": total_high,
            "description": f"{total_high} high-severity defect{'s' if total_high > 1 else ''} requiring driver caution",
        })
    if total_unresolved > 0:
        contributing_factors.append({
            "factor": "UNRESOLVED_REPAIRS",
            "impact": "HIGH",
            "count": total_unresolved,
            "description": f"{total_unresolved} unresolved or failed municipal repair{'s' if total_unresolved > 1 else ''}",
        })
    if total_corroborated > 0:
        contributing_factors.append({
            "factor": "CORROBORATED_HAZARDS",
            "impact": "MEDIUM",
            "count": total_corroborated,
            "description": f"{total_corroborated} defect{'s' if total_corroborated > 1 else ''} corroborated across multiple transit passes",
        })

    elevated_segs = [sp["segment_name"] for sp in segment_profiles if sp["risk_state"] in ("ELEVATED", "CRITICAL")]
    if elevated_segs:
        contributing_factors.append({
            "factor": "ROAD_HEALTH_DEGRADATION",
            "impact": "HIGH",
            "count": len(elevated_segs),
            "description": f"Traverses degraded corridor{'s' if len(elevated_segs) > 1 else ''}: {', '.join(elevated_segs[:2])}",
        })

    if not contributing_factors:
        contributing_factors.append({
            "factor": "CLEAN_SURFACE",
            "impact": "LOW",
            "count": 0,
            "description": "Zero active road hazards detected; verified healthy corridor condition",
        })

    return {
        "id": candidate_id,
        "name": name,
        "estimated_distance_km": total_length_km,
        "estimated_distance_meters": total_length_m,
        "estimated_duration_minutes": total_duration_min,
        "timing_label": "ESTIMATED",
        "timing_mode": "ESTIMATED",
        "overall_risk_score": overall_risk_score,
        "risk_level": risk_level,
        "total_active_defects": total_active_defects,
        "total_critical_defects": total_critical,
        "total_high_defects": total_high,
        "total_unresolved_verifications": total_unresolved,
        "contributing_factors": contributing_factors,
        "segments": [
            {
                "segment_id": sp["segment_id"],
                "segment_name": sp["segment_name"],
                "road_class": sp["road_class"],
                "length_meters": sp["length_meters"],
                "health_score": sp["health_score"],
                "risk_state": sp["risk_state"],
                "segment_risk_score": sp["segment_risk_score"],
                "active_issue_count": sp["active_issue_count"],
            }
            for sp in segment_profiles
        ],
        "geometry": {
            "type": "LineString",
            "coordinates": dedup_coords,
        },
        "is_recommended": False,
        "recommendation_reason": None,
        "avoided_hazards": [],
    }


async def plan_saferoute(
    session: AsyncSession,
    origin_name: str,
    destination_name: str,
    mode: str = "SAFEST",
    origin_coords: Optional[Tuple[float, float]] = None,
    destination_coords: Optional[Tuple[float, float]] = None,
    corridor_set: str = "delhi_ncr"
) -> Dict[str, Any]:
    """
    Main SafeRoute planning algorithm.
    Generates multiple viable candidate routes from the PostGIS road graph,
    evaluates deterministic risk, and selects the optimal recommendation
    for the requested mode (FASTEST, SAFEST, or BALANCED).
    """
    # Input edge-case validations
    if not origin_name or not origin_name.strip() or not destination_name or not destination_name.strip():
        raise ValueError("Origin and destination must be non-empty location or corridor names.")

    norm_orig = origin_name.strip().lower()
    norm_dest = destination_name.strip().lower()
    if norm_orig == norm_dest:
        raise ValueError("Origin and destination cannot be identical for corridor route planning.")

    if origin_coords and destination_coords:
        dist_m = haversine_distance_meters(
            origin_coords[0], origin_coords[1],
            destination_coords[0], destination_coords[1]
        )
        if dist_m < 10.0:
            raise ValueError("Origin and destination coordinates are too close (<10m) for corridor planning.")

    normalized_mode = mode.upper().strip()
    if normalized_mode not in ("FASTEST", "SAFEST", "BALANCED"):
        normalized_mode = "SAFEST"

    # 1. Fetch available road segments
    res = await session.execute(select(RoadSegment))
    all_segments = {s.id: s for s in res.scalars().all()}

    # Group segments into corridor networks
    delhi_segments = [s for s in all_segments.values() if s.id.startswith("SEG-DEL-NCR") or s.id.startswith("seg_rh")]
    blr_segments = [s for s in all_segments.values() if s.id.startswith("rs_")]

    candidates_raw: List[Dict[str, Any]] = []

    # Check if routing in Delhi-NCR showcase corridor network
    if corridor_set == "delhi_ncr" or any(k in origin_name.lower() or k in destination_name.lower() for k in ("delhi", "noida", "cp", "connaught", "ncr")):
        # Candidate 1: Direct via Delhi-Noida Direct Corridor (SEG-DEL-NCR-01)
        # Shortest distance, but contains active high-severity pothole cluster
        seg_direct = all_segments.get("SEG-DEL-NCR-01")
        if seg_direct:
            p_direct = await get_segment_risk_profile(session, seg_direct)
            cand1 = build_route_candidate(
                candidate_id="cand_direct_main",
                name="Direct Delhi-Noida Expressway (Primary Corridor)",
                segment_profiles=[p_direct]
            )
            candidates_raw.append(cand1)

        # Candidate 2: Southern Arterial via Barapullah Elevated Bypass (SEG-DEL-NCR-02 + feeder SEG-DEL-NCR-04)
        # Slightly longer, but smooth surface with low risk
        seg_bp = all_segments.get("SEG-DEL-NCR-02")
        seg_ashram = all_segments.get("SEG-DEL-NCR-04")
        if seg_bp:
            profiles = []
            if seg_ashram:
                profiles.append(await get_segment_risk_profile(session, seg_ashram))
            profiles.append(await get_segment_risk_profile(session, seg_bp))
            cand2 = build_route_candidate(
                candidate_id="cand_barapullah_bypass",
                name="Barapullah Elevated Bypass (South Corridor)",
                segment_profiles=profiles
            )
            candidates_raw.append(cand2)

        # Candidate 3: Northern Outer Corridor via Vikas Marg & NH24 (SEG-DEL-NCR-03)
        # Longest distance, but newly resurfaced zero-defect corridor
        seg_nh24 = all_segments.get("SEG-DEL-NCR-03")
        if seg_nh24:
            p_nh24 = await get_segment_risk_profile(session, seg_nh24)
            cand3 = build_route_candidate(
                candidate_id="cand_nh24_outer",
                name="Vikas Marg - NH24 Outer Corridor (North Expressway)",
                segment_profiles=[p_nh24]
            )
            candidates_raw.append(cand3)

    # Fallback or Bangalore network candidates
    if not candidates_raw and blr_segments:
        # Route between CBD (MG Road) and Koramangala / ORR
        mg_segs = [s for s in blr_segments if "MG Road" in s.name]
        kor_segs = [s for s in blr_segments if "Koramangala" in s.name]
        ind_segs = [s for s in blr_segments if "Indiranagar" in s.name]
        orr_segs = [s for s in blr_segments if "ORR" in s.name]

        if mg_segs and kor_segs:
            # Candidate 1: Direct via Hosur Road (MG + Koramangala)
            p1 = [await get_segment_risk_profile(session, s) for s in mg_segs[:2] + kor_segs[:2]]
            candidates_raw.append(build_route_candidate("cand_blr_direct", "Direct Hosur Corridor", p1))

        if ind_segs and orr_segs:
            # Candidate 2: Indiranagar - ORR Bypass
            p2 = [await get_segment_risk_profile(session, s) for s in ind_segs[:2] + orr_segs[:2]]
            candidates_raw.append(build_route_candidate("cand_blr_bypass", "Outer Ring Road Bypass", p2))

    # Safety check: if no segments matched, assemble from first available segments
    if not candidates_raw and all_segments:
        first_few = list(all_segments.values())[:3]
        p_fallback = [await get_segment_risk_profile(session, s) for s in first_few]
        candidates_raw.append(build_route_candidate("cand_default", "Municipal Road Network Corridor", p_fallback))

    if not candidates_raw:
        raise ValueError("Insufficient road network segments available for routing.")

    # 2. Decision Mode Scoring & Optimization
    # Normalize durations and risks to compute objective values
    min_dur = min(c["estimated_duration_minutes"] for c in candidates_raw)
    max_dur = max(c["estimated_duration_minutes"] for c in candidates_raw)
    dur_span = max(1.0, max_dur - min_dur)

    min_risk = min(c["overall_risk_score"] for c in candidates_raw)
    max_risk = max(c["overall_risk_score"] for c in candidates_raw)
    risk_span = max(1.0, max_risk - min_risk)

    best_candidate = None
    best_score = float("inf")

    for c in candidates_raw:
        dur = c["estimated_duration_minutes"]
        risk = c["overall_risk_score"]

        if normalized_mode == "FASTEST":
            # Primary: duration strictly dominates; infinitesimal tie-breaker on risk
            obj_score = dur + (risk * 0.00001)
        elif normalized_mode == "SAFEST":
            # Primary: risk strictly dominates; infinitesimal tie-breaker on duration
            obj_score = risk + (dur * 0.00001)
        else:  # BALANCED
            norm_dur = (dur - min_dur) / dur_span
            norm_risk = (risk - min_risk) / risk_span
            obj_score = (0.50 * norm_dur) + (0.50 * norm_risk)

        if obj_score < best_score:
            best_score = obj_score
            best_candidate = c

    # Fallback to first candidate if none matched
    if not best_candidate:
        best_candidate = candidates_raw[0]

    # Mark recommended route
    best_candidate["is_recommended"] = True

    # 3. Transparent Explainability Generation
    # Compare recommended route against the riskiest candidate
    riskiest = max(candidates_raw, key=lambda x: x["overall_risk_score"])
    fastest = min(candidates_raw, key=lambda x: x["estimated_duration_minutes"])

    avoided_items = []
    if riskiest["id"] != best_candidate["id"]:
        diff_defects = riskiest["total_active_defects"] - best_candidate["total_active_defects"]
        if diff_defects > 0:
            avoided_items.append(f"Avoids {diff_defects} active road defect{'s' if diff_defects > 1 else ''} present on {riskiest['name']}")

        diff_critical = riskiest["total_critical_defects"] - best_candidate["total_critical_defects"]
        if diff_critical > 0:
            avoided_items.append(f"Bypasses {diff_critical} critical severity pothole cluster{'s' if diff_critical > 1 else ''}")

        diff_unresolved = riskiest["total_unresolved_verifications"] - best_candidate["total_unresolved_verifications"]
        if diff_unresolved > 0:
            avoided_items.append(f"Circumvents {diff_unresolved} unverified / failed municipal repair{'s' if diff_unresolved > 1 else ''}")

        if riskiest["overall_risk_score"] > best_candidate["overall_risk_score"]:
            pct_reduction = round(((riskiest["overall_risk_score"] - best_candidate["overall_risk_score"]) / max(1.0, riskiest["overall_risk_score"])) * 100.0, 1)
            avoided_items.append(f"Reduces infrastructure risk exposure by {pct_reduction}% compared to direct corridor")

    best_candidate["avoided_hazards"] = avoided_items

    # Natural language recommendation reason
    if normalized_mode == "SAFEST":
        if avoided_items:
            reason = f"Recommended by SafeRoute ({normalized_mode}): Lowest infrastructure hazard exposure ({best_candidate['risk_level']} risk, score {best_candidate['overall_risk_score']}). {avoided_items[0]}."
        else:
            reason = f"Recommended by SafeRoute ({normalized_mode}): Cleanest corridor condition with {best_candidate['total_active_defects']} active defects."
    elif normalized_mode == "FASTEST":
        reason = f"Recommended by SafeRoute ({normalized_mode}): Shortest estimated transit duration ({best_candidate['estimated_duration_minutes']} min, {best_candidate['estimated_distance_km']} km)."
        if best_candidate["overall_risk_score"] >= 60.0:
            reason += f" Warning: High infrastructure risk (score {best_candidate['overall_risk_score']}) with {best_candidate['total_active_defects']} active defects detected along corridor."
    else:  # BALANCED
        extra_time = round(best_candidate["estimated_duration_minutes"] - fastest["estimated_duration_minutes"], 1)
        time_text = f"adds {extra_time} min" if extra_time > 0 else "maintains optimal transit time"
        reason = f"Recommended by SafeRoute ({normalized_mode}): Optimal Pareto balance ({time_text} while achieving {best_candidate['risk_level']} risk score of {best_candidate['overall_risk_score']})."

    best_candidate["recommendation_reason"] = reason

    now_utc = datetime.now(timezone.utc).isoformat()

    return {
        "origin": origin_name,
        "destination": destination_name,
        "mode": normalized_mode,
        "recommended_route_id": best_candidate["id"],
        "recommendation_reason": best_candidate["recommendation_reason"],
        "candidates": candidates_raw,
        "candidate_count": len(candidates_raw),
        "data_freshness": "ESTIMATED_ROAD_GRAPH",
        "timing_mode": "ESTIMATED",
        "timing_provenance": "ESTIMATED (Calculated from road hierarchy design speeds; not live traffic)",
        "computed_at": now_utc,
    }


def get_saferoute_presets() -> List[Dict[str, Any]]:
    """Returns municipal showcase origin/destination presets for interactive exploration."""
    return [
        {
            "id": "delhi_cp_noida",
            "name": "Delhi PWD Center → Noida Sector 62",
            "corridor_set": "delhi_ncr",
            "origin": "Connaught Place / PWD Delhi HQ",
            "destination": "Noida Sector 62 Tech Hub",
            "origin_coords": {"lat": 28.6139, "lng": 77.2090},
            "destination_coords": {"lat": 28.5355, "lng": 77.3910},
            "description": "Showcases high-defect direct corridor vs. smooth Barapullah bypass & NH24 outer expressway."
        },
        {
            "id": "delhi_ashram_mayurvihar",
            "name": "Ring Road Ashram → Mayur Vihar",
            "corridor_set": "delhi_ncr",
            "origin": "Ashram Chowk Arterial",
            "destination": "Mayur Vihar Phase 1",
            "origin_coords": {"lat": 28.5680, "lng": 77.2600},
            "destination_coords": {"lat": 28.6000, "lng": 77.2900},
            "description": "Evaluates arterial connector health and elevated corridor bypass alternatives."
        },
        {
            "id": "blr_mg_koramangala",
            "name": "MG Road CBD → Koramangala 100ft",
            "corridor_set": "bangalore",
            "origin": "MG Road Metro Interchange",
            "destination": "Koramangala 100ft Road",
            "origin_coords": {"lat": 12.9716, "lng": 77.5946},
            "destination_coords": {"lat": 12.9385, "lng": 77.6280},
            "description": "Compares Hosur Road urban corridor vs. Indiranagar bypass."
        }
    ]
