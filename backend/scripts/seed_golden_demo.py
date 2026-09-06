"""
POTHOLE WALA — PHASE 17: GOLDEN DEMO DATA SEED & RESET SCRIPT

Deterministic, repeatable, SIH-demo-ready dataset that demonstrates:
- Scenario A: Fully Resolved Issue (PWD Road Segment Ownership -> Ticket -> Repair -> Verification = resolved -> Issue resolved)
- Scenario B: Active / Open Municipal Ticket (MCD Central Polygon -> Ticket Open)
- Scenario C: Unresolved Jurisdiction Safety (Outside boundaries -> Unresolved -> Ticket creation blocked)
- Scenario D: Failed Verification / Reopened Ticket (NOIDA Polygon -> Repair -> Verification = unresolved -> Reopened)

Absolute Rules:
- 100% Deterministic (no random, no faker, no fake live GPS).
- Clearly namespaced: iss_demo_gold_*, tkt_demo_gold_*, ver_demo_gold_*, det_demo_gold_*, obs_demo_gold_*.
- Idempotent: running multiple times updates/skips in place without duplicating records.
- Reset support: --reset flag removes ONLY Golden Demo records, preserving real detections and configuration.
"""

import sys
import os
import argparse
import asyncio
from datetime import datetime, timezone

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import select, delete, func, text
from app.core.database import AsyncSessionLocal
from app.models.domain import (
    UrbanIssue,
    Detection,
    Observation,
    Ticket,
    Verification,
    RoadSegment,
    Authority,
    Department,
    Jurisdiction,
    IssueStatus,
    TicketStatus,
    Severity,
    TicketPriority,
    VerificationResult,
    TimelineEvent
)
from app.services.road_health import recalculate_all_segment_health


GOLDEN_SCENARIOS = {
    "scenario_a": {
        "description": "Fully Resolved Success Story (Delhi PWD on Delhi-Noida Corridor)",
        "issue": {
            "id": "iss_demo_gold_a",
            "issue_type": "pothole",
            "status": IssueStatus.verified,
            "severity": Severity.high,
            "priority": TicketPriority.high,
            "location": "POINT(77.2250 28.5750)",
            "road_segment_id": "SEG-DEL-NCR-01",
            "authority_id": "AUTH-PWD-DELHI",
            "assigned_department_id": "DELHI-NCR-ROADS",
            "jurisdiction_id": None,
            "jurisdiction_source": "road_segment_ownership",
            "observation_count": 1,
            "unique_bus_count": 1,
            "confidence": 0.92,
            "first_detected_at": datetime(2026, 8, 20, 8, 30, 0, tzinfo=timezone.utc),
            "last_observed_at": datetime(2026, 8, 20, 8, 30, 0, tzinfo=timezone.utc),
        },
        "detection": {
            "id": "det_demo_gold_a",
            "event_id": "EVT-GOLD-A-001",
            "bus_id": "BUS-001",
            "timestamp": datetime(2026, 8, 20, 8, 30, 0, tzinfo=timezone.utc),
            "location": "POINT(77.2250 28.5750)",
            "detection_type": "pothole",
            "confidence": 0.92,
            "severity": Severity.high,
            "evidence_url": "/evidence/BUS001_EVT-00750aff_1788714151.jpg",
            "processing_status": "fused",
        },
        "observation": {
            "id": "obs_demo_gold_a",
            "issue_id": "iss_demo_gold_a",
            "detection_id": "det_demo_gold_a",
            "bus_id": "BUS-001",
            "timestamp": datetime(2026, 8, 20, 8, 30, 0, tzinfo=timezone.utc),
            "evidence_url": "/evidence/BUS001_EVT-00750aff_1788714151.jpg",
            "confidence": 0.92,
        },
        "ticket": {
            "id": "tkt_demo_gold_a",
            "display_id": "TKT-GOLD-001",
            "issue_id": "iss_demo_gold_a",
            "department_id": "DELHI-NCR-ROADS",
            "authority_id": "AUTH-PWD-DELHI",
            "title": "[DEMO] Pothole on Delhi - Noida Corridor (Near Ring Road Exit)",
            "description": "Controlled demonstration record: High severity defect detected on PWD arterial corridor. Successfully routed, repaired, and reverified.",
            "status": TicketStatus.closed,
            "priority": TicketPriority.high,
            "repair_reported_at": datetime(2026, 8, 22, 14, 0, 0, tzinfo=timezone.utc),
            "verified_at": datetime(2026, 8, 23, 10, 15, 0, tzinfo=timezone.utc),
            "due_date": datetime(2026, 8, 25, 18, 0, 0, tzinfo=timezone.utc),
        },
        "verification": {
            "id": "ver_demo_gold_a",
            "issue_id": "iss_demo_gold_a",
            "ticket_id": "tkt_demo_gold_a",
            "bus_id": "BUS-001",
            "timestamp": datetime(2026, 8, 23, 10, 15, 0, tzinfo=timezone.utc),
            "result": VerificationResult.resolved,
            "confidence": 0.94,
            "before_evidence_url": "/evidence/BUS001_EVT-00750aff_1788714151.jpg",
            "after_evidence_url": "/evidence/BUS001_EVT-015663c8_1788712505.jpg",
            "notes": "Reinspection pass by BUS-001 camera verified defect resolved. Asphalt patch confirmed.",
        },
        "timeline_events": [
            {
                "id": "evt_demo_gold_a_tkt",
                "entity_id": "iss_demo_gold_a",
                "entity_type": "issue",
                "event_type": "ticket_created",
                "title": "Municipal Work Ticket Dispatched",
                "description": "Assigned to Delhi-NCR Road Infrastructure under Delhi PWD.",
                "actor": "DISPATCHER",
                "created_at": datetime(2026, 8, 20, 10, 0, 0, tzinfo=timezone.utc),
            },
            {
                "id": "evt_demo_gold_a_rep",
                "entity_id": "iss_demo_gold_a",
                "entity_type": "issue",
                "event_type": "repair_reported",
                "title": "Repair Reported by Maintenance Crew",
                "description": "Asphalt patch completed. Awaiting automated transit reinspection.",
                "actor": "PWD_CONTRACTOR",
                "created_at": datetime(2026, 8, 22, 14, 0, 0, tzinfo=timezone.utc),
            }
        ]
    },
    "scenario_b": {
        "description": "Active / Open Municipal Ticket (MCD Central Prototype Sector)",
        "issue": {
            "id": "iss_demo_gold_b",
            "issue_type": "pothole",
            "status": IssueStatus.ticket_created,
            "severity": Severity.medium,
            "priority": TicketPriority.medium,
            "location": "POINT(77.2200 28.6200)",
            "road_segment_id": None,
            "authority_id": "AUTH-MCD-CENTRAL",
            "assigned_department_id": "MCD-CENTRAL-MAINT",
            "jurisdiction_id": "JUR-DEL-CENTRAL",
            "jurisdiction_source": "configured_prototype_boundary",
            "observation_count": 1,
            "unique_bus_count": 1,
            "confidence": 0.88,
            "first_detected_at": datetime(2026, 9, 2, 11, 45, 0, tzinfo=timezone.utc),
            "last_observed_at": datetime(2026, 9, 2, 11, 45, 0, tzinfo=timezone.utc),
        },
        "detection": {
            "id": "det_demo_gold_b",
            "event_id": "EVT-GOLD-B-001",
            "bus_id": "BUS-001",
            "timestamp": datetime(2026, 9, 2, 11, 45, 0, tzinfo=timezone.utc),
            "location": "POINT(77.2200 28.6200)",
            "detection_type": "pothole",
            "confidence": 0.88,
            "severity": Severity.medium,
            "evidence_url": "/evidence/BUS001_EVT-01cdda66_1788711423.jpg",
            "processing_status": "fused",
        },
        "observation": {
            "id": "obs_demo_gold_b",
            "issue_id": "iss_demo_gold_b",
            "detection_id": "det_demo_gold_b",
            "bus_id": "BUS-001",
            "timestamp": datetime(2026, 9, 2, 11, 45, 0, tzinfo=timezone.utc),
            "evidence_url": "/evidence/BUS001_EVT-01cdda66_1788711423.jpg",
            "confidence": 0.88,
        },
        "ticket": {
            "id": "tkt_demo_gold_b",
            "display_id": "TKT-GOLD-002",
            "issue_id": "iss_demo_gold_b",
            "department_id": "MCD-CENTRAL-MAINT",
            "authority_id": "AUTH-MCD-CENTRAL",
            "title": "[DEMO] Surface Defect in Delhi Central Zone (MCD Ward 42)",
            "description": "Controlled demonstration record: Active municipal ticket under MCD Central jurisdiction awaiting contractor dispatch.",
            "status": TicketStatus.open,
            "priority": TicketPriority.medium,
            "repair_reported_at": None,
            "verified_at": None,
            "due_date": datetime(2026, 9, 9, 18, 0, 0, tzinfo=timezone.utc),
        },
        "verification": None
    },
    "scenario_c": {
        "description": "Unresolved Jurisdiction Safety (Outside Boundaries -> Ticket Blocked)",
        "issue": {
            "id": "iss_demo_gold_c",
            "issue_type": "pothole",
            "status": IssueStatus.new,
            "severity": Severity.medium,
            "priority": TicketPriority.low,
            "location": "POINT(77.1000 28.7000)",
            "road_segment_id": None,
            "authority_id": None,
            "assigned_department_id": None,
            "jurisdiction_id": None,
            "jurisdiction_source": "unresolved",
            "observation_count": 1,
            "unique_bus_count": 1,
            "confidence": 0.85,
            "first_detected_at": datetime(2026, 9, 4, 9, 10, 0, tzinfo=timezone.utc),
            "last_observed_at": datetime(2026, 9, 4, 9, 10, 0, tzinfo=timezone.utc),
        },
        "detection": {
            "id": "det_demo_gold_c",
            "event_id": "EVT-GOLD-C-001",
            "bus_id": "BUS-001",
            "timestamp": datetime(2026, 9, 4, 9, 10, 0, tzinfo=timezone.utc),
            "location": "POINT(77.1000 28.7000)",
            "detection_type": "pothole",
            "confidence": 0.85,
            "severity": Severity.medium,
            "evidence_url": "/evidence/BUS001_EVT-03bc7830_1788679005.jpg",
            "processing_status": "fused",
        },
        "observation": {
            "id": "obs_demo_gold_c",
            "issue_id": "iss_demo_gold_c",
            "detection_id": "det_demo_gold_c",
            "bus_id": "BUS-001",
            "timestamp": datetime(2026, 9, 4, 9, 10, 0, tzinfo=timezone.utc),
            "evidence_url": "/evidence/BUS001_EVT-03bc7830_1788679005.jpg",
            "confidence": 0.85,
        },
        "ticket": None,  # Blocked by design!
        "verification": None
    },
    "scenario_d": {
        "description": "Failed Verification & Reopened Ticket (Noida Development Authority Sector)",
        "issue": {
            "id": "iss_demo_gold_d",
            "issue_type": "pothole",
            "status": IssueStatus.reopened,
            "severity": Severity.high,
            "priority": TicketPriority.urgent,
            "location": "POINT(77.3600 28.5500)",
            "road_segment_id": None,
            "authority_id": "AUTH-NOIDA",
            "assigned_department_id": "NOIDA-GHAZIABAD-ROADS",
            "jurisdiction_id": "JUR-NOIDA-URBAN",
            "jurisdiction_source": "configured_prototype_boundary",
            "observation_count": 1,
            "unique_bus_count": 1,
            "confidence": 0.91,
            "first_detected_at": datetime(2026, 8, 25, 14, 20, 0, tzinfo=timezone.utc),
            "last_observed_at": datetime(2026, 8, 25, 14, 20, 0, tzinfo=timezone.utc),
        },
        "detection": {
            "id": "det_demo_gold_d",
            "event_id": "EVT-GOLD-D-001",
            "bus_id": "BUS-001",
            "timestamp": datetime(2026, 8, 25, 14, 20, 0, tzinfo=timezone.utc),
            "location": "POINT(77.3600 28.5500)",
            "detection_type": "pothole",
            "confidence": 0.91,
            "severity": Severity.high,
            "evidence_url": "/evidence/BUS001_EVT-03f9f0f1_1788714739.jpg",
            "processing_status": "fused",
        },
        "observation": {
            "id": "obs_demo_gold_d",
            "issue_id": "iss_demo_gold_d",
            "detection_id": "det_demo_gold_d",
            "bus_id": "BUS-001",
            "timestamp": datetime(2026, 8, 25, 14, 20, 0, tzinfo=timezone.utc),
            "evidence_url": "/evidence/BUS001_EVT-03f9f0f1_1788714739.jpg",
            "confidence": 0.91,
        },
        "ticket": {
            "id": "tkt_demo_gold_d",
            "display_id": "TKT-GOLD-004",
            "issue_id": "iss_demo_gold_d",
            "department_id": "NOIDA-GHAZIABAD-ROADS",
            "authority_id": "AUTH-NOIDA",
            "title": "[DEMO] Deep Depression on Noida Sector 62 Link",
            "description": "Controlled demonstration record: Repair reported by vendor, but automated reinspection detected residual defect. Reopened for corrective action.",
            "status": TicketStatus.reopened,
            "priority": TicketPriority.high,
            "repair_reported_at": datetime(2026, 8, 28, 16, 0, 0, tzinfo=timezone.utc),
            "verified_at": datetime(2026, 8, 29, 11, 0, 0, tzinfo=timezone.utc),
            "due_date": datetime(2026, 8, 30, 18, 0, 0, tzinfo=timezone.utc),
        },
        "verification": {
            "id": "ver_demo_gold_d",
            "issue_id": "iss_demo_gold_d",
            "ticket_id": "tkt_demo_gold_d",
            "bus_id": "BUS-001",
            "timestamp": datetime(2026, 8, 29, 11, 0, 0, tzinfo=timezone.utc),
            "result": VerificationResult.unresolved,
            "confidence": 0.89,
            "before_evidence_url": "/evidence/BUS001_EVT-03f9f0f1_1788714739.jpg",
            "after_evidence_url": "/evidence/BUS001_EVT-03ff1bf8_1788714695.jpg",
            "notes": "Reinspection pass by camera detected defect still present after reported repair. Auto-reopened.",
        },
        "timeline_events": [
            {
                "id": "evt_demo_gold_d_rep",
                "entity_id": "iss_demo_gold_d",
                "entity_type": "issue",
                "event_type": "repair_reported",
                "title": "Repair Reported by Vendor",
                "description": "Vendor marked patch completed on Sector 62 Link.",
                "actor": "NOIDA_CONTRACTOR",
                "created_at": datetime(2026, 8, 28, 16, 0, 0, tzinfo=timezone.utc),
            },
            {
                "id": "evt_demo_gold_d_reopen",
                "entity_id": "iss_demo_gold_d",
                "entity_type": "issue",
                "event_type": "reopened",
                "title": "Ticket & Issue Automatically Reopened",
                "description": "Automated bus verification detected defect residual. Reopened for corrective action.",
                "actor": "VERIFICATION_ENGINE",
                "created_at": datetime(2026, 8, 29, 11, 1, 0, tzinfo=timezone.utc),
            }
        ]
    }
}


async def reset_golden_demo():
    """
    Safely purges ONLY Golden Demo records (matching _demo_gold_ prefix).
    Leaves real operational records, tests, authorities, road segments, and baseline intact.
    """
    print("--- RESETTING GOLDEN DEMO DATA ---")
    async with AsyncSessionLocal() as session:
        # 1. Timeline Events (matching event ID or linked entity ID)
        tl_res = await session.execute(
            delete(TimelineEvent).where(
                (TimelineEvent.id.like("evt_demo_gold_%")) |
                (TimelineEvent.entity_id.like("%demo_gold%"))
            )
        )
        print(f"Deleted {tl_res.rowcount} Golden Demo Timeline Events.")

        # 2. Verifications
        v_res = await session.execute(
            delete(Verification).where(Verification.id.like("ver_demo_gold_%"))
        )
        print(f"Deleted {v_res.rowcount} Golden Demo Verifications.")

        # 3. Observations
        o_res = await session.execute(
            delete(Observation).where(Observation.id.like("obs_demo_gold_%"))
        )
        print(f"Deleted {o_res.rowcount} Golden Demo Observations.")

        # 4. Tickets
        t_res = await session.execute(
            delete(Ticket).where(Ticket.id.like("tkt_demo_gold_%"))
        )
        print(f"Deleted {t_res.rowcount} Golden Demo Tickets.")

        # 5. Urban Issues
        i_res = await session.execute(
            delete(UrbanIssue).where(UrbanIssue.id.like("iss_demo_gold_%"))
        )
        print(f"Deleted {i_res.rowcount} Golden Demo Urban Issues.")

        # 6. Detections
        d_res = await session.execute(
            delete(Detection).where(Detection.id.like("det_demo_gold_%"))
        )
        print(f"Deleted {d_res.rowcount} Golden Demo Detections.")

        await session.commit()

        # Recalculate road health
        await recalculate_all_segment_health(session)
        print("Road health scores recalculated after Golden Demo reset.")


async def seed_golden_demo():
    """
    Idempotently seeds Golden Demo records.
    Detects existing records by ID; creates or updates in place without duplication.
    """
    print("--- SEEDING GOLDEN DEMO DATA ---")
    created = {"issues": 0, "detections": 0, "observations": 0, "tickets": 0, "verifications": 0, "events": 0}
    updated = {"issues": 0, "detections": 0, "observations": 0, "tickets": 0, "verifications": 0, "events": 0}
    skipped = {"issues": 0, "detections": 0, "observations": 0, "tickets": 0, "verifications": 0, "events": 0}

    async with AsyncSessionLocal() as session:
        for s_key, s_data in GOLDEN_SCENARIOS.items():
            print(f"\nProcessing [{s_key.upper()}]: {s_data['description']}")

            # 1. Detection
            det_info = s_data["detection"]
            existing_det = await session.get(Detection, det_info["id"])
            if not existing_det:
                det_obj = Detection(**det_info)
                session.add(det_obj)
                created["detections"] += 1
            else:
                for k, v in det_info.items():
                    setattr(existing_det, k, v)
                updated["detections"] += 1

            # 2. Issue
            issue_info = s_data["issue"]
            existing_issue = await session.get(UrbanIssue, issue_info["id"])
            if not existing_issue:
                issue_obj = UrbanIssue(**issue_info)
                session.add(issue_obj)
                created["issues"] += 1
            else:
                for k, v in issue_info.items():
                    setattr(existing_issue, k, v)
                updated["issues"] += 1

            await session.flush()

            # 3. Observation
            obs_info = s_data["observation"]
            existing_obs = await session.get(Observation, obs_info["id"])
            if not existing_obs:
                obs_obj = Observation(**obs_info)
                session.add(obs_obj)
                created["observations"] += 1
            else:
                for k, v in obs_info.items():
                    setattr(existing_obs, k, v)
                updated["observations"] += 1

            # 4. Ticket (if present)
            tkt_info = s_data.get("ticket")
            if tkt_info:
                existing_tkt = await session.get(Ticket, tkt_info["id"])
                if not existing_tkt:
                    tkt_obj = Ticket(**tkt_info)
                    session.add(tkt_obj)
                    created["tickets"] += 1
                else:
                    for k, v in tkt_info.items():
                        setattr(existing_tkt, k, v)
                    updated["tickets"] += 1
            else:
                skipped["tickets"] += 1

            # 5. Verification (if present)
            ver_info = s_data.get("verification")
            if ver_info:
                existing_ver = await session.get(Verification, ver_info["id"])
                if not existing_ver:
                    ver_obj = Verification(**ver_info)
                    session.add(ver_obj)
                    created["verifications"] += 1
                else:
                    for k, v in ver_info.items():
                        setattr(existing_ver, k, v)
                    updated["verifications"] += 1
            else:
                skipped["verifications"] += 1

            # 6. Timeline Events (if present)
            tl_list = s_data.get("timeline_events", [])
            for tl_info in tl_list:
                existing_tl = await session.get(TimelineEvent, tl_info["id"])
                if not existing_tl:
                    tl_obj = TimelineEvent(**tl_info)
                    session.add(tl_obj)
                    created["events"] += 1
                else:
                    for k, v in tl_info.items():
                        setattr(existing_tl, k, v)
                    updated["events"] += 1

        await session.commit()

        # Recalculate road health
        await recalculate_all_segment_health(session)
        print("\nRoad health scores recalculated after Golden Demo seed.")

    print("\n=== GOLDEN DEMO SEED SUMMARY ===")
    print(f"Created: {created}")
    print(f"Updated: {updated}")
    print(f"Skipped: {skipped}")
    return created, updated, skipped


def main():
    parser = argparse.ArgumentParser(description="Pothole Wala Golden Demo Seeder")
    parser.add_argument("--reset", action="store_true", help="Remove Golden Demo records")
    args = parser.parse_args()

    if args.reset:
        asyncio.run(reset_golden_demo())
    else:
        asyncio.run(seed_golden_demo())


if __name__ == "__main__":
    main()
