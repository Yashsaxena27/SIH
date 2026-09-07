"""
POTHOLE WALA — PHASE 12: GOLDEN DEMO DATA SEED & RESET SCRIPT

Deterministic, repeatable, SIH-demo-ready dataset that demonstrates:
- Scenario A: Fully Resolved Issue (PWD Road Segment Ownership -> Ticket -> Repair -> Verification = resolved -> Issue resolved)
- Scenario B: Active / Open Municipal Ticket (MCD Central Polygon -> Ticket Open)
- Scenario C: Unresolved Jurisdiction Safety (Outside boundaries -> Unresolved -> Ticket creation blocked)
- Scenario D: Failed Verification / Reopened Ticket (NOIDA Polygon -> Repair -> Verification = unresolved -> Reopened)
- Scenario Corroborated: Multi-Bus Spatial Fusion & Corroborated Critical Hazard (BUS-001 + BUS-002 independently detect same defect on Delhi-Noida Corridor -> Urgent SLA Ticket)
- Scenario Inconclusive: Optical Occlusion / Sun Glare Uncertainty (Reinspection inconclusive -> Retained in PENDING_REVIEW -> Proves non-detection != resolved)
- Fleet Sensing Sessions: Distributed Sensing Sessions for BUS-001 and BUS-002 with explicit SIMULATED telemetry provenance.

Absolute Rules:
- 100% Deterministic (no random, no faker, no fake live GPS).
- Clearly namespaced: iss_demo_gold_*, tkt_demo_gold_*, ver_demo_gold_*, det_demo_gold_*, obs_demo_gold_*, sess_demo_gold_*.
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
    TimelineEvent,
    InspectionSession,
    Bus,
    Camera,
)
from app.services.road_health import recalculate_all_segment_health


GOLDEN_SCENARIOS = {
    "scenario_corroborated": {
        "description": "Multi-Bus Spatial Fusion & Corroborated Critical Hazard on Delhi-Noida Corridor",
        "issue": {
            "id": "iss_demo_gold_corrob",
            "issue_type": "pothole",
            "status": IssueStatus.ticket_created,
            "severity": Severity.critical,
            "priority": TicketPriority.urgent,
            "location": "POINT(77.2900 28.5750)",
            "road_segment_id": "SEG-DEL-NCR-01",
            "authority_id": "AUTH-PWD-DELHI",
            "assigned_department_id": "DELHI-NCR-ROADS",
            "jurisdiction_id": None,
            "jurisdiction_source": "road_segment_ownership",
            "observation_count": 2,
            "unique_bus_count": 2,
            "confidence": 0.96,
            "first_detected_at": datetime(2026, 9, 6, 8, 15, 0, tzinfo=timezone.utc),
            "last_observed_at": datetime(2026, 9, 6, 9, 45, 0, tzinfo=timezone.utc),
        },
        "detections": [
            {
                "id": "det_demo_gold_corrob_1",
                "event_id": "EVT-GOLD-COR-001",
                "bus_id": "BUS-001",
                "timestamp": datetime(2026, 9, 6, 8, 15, 0, tzinfo=timezone.utc),
                "location": "POINT(77.2900 28.5750)",
                "detection_type": "pothole",
                "confidence": 0.94,
                "severity": Severity.critical,
                "evidence_url": "/evidence/BUS001_EVT-00750aff_1788714151.jpg",
                "processing_status": "fused",
            },
            {
                "id": "det_demo_gold_corrob_2",
                "event_id": "EVT-GOLD-COR-002",
                "bus_id": "BUS-002",
                "timestamp": datetime(2026, 9, 6, 9, 45, 0, tzinfo=timezone.utc),
                "location": "POINT(77.2902 28.5751)",
                "detection_type": "pothole",
                "confidence": 0.96,
                "severity": Severity.critical,
                "evidence_url": "/evidence/BUS001_EVT-015663c8_1788712505.jpg",
                "processing_status": "fused",
            }
        ],
        "observations": [
            {
                "id": "obs_demo_gold_corrob_1",
                "issue_id": "iss_demo_gold_corrob",
                "detection_id": "det_demo_gold_corrob_1",
                "bus_id": "BUS-001",
                "timestamp": datetime(2026, 9, 6, 8, 15, 0, tzinfo=timezone.utc),
                "evidence_url": "/evidence/BUS001_EVT-00750aff_1788714151.jpg",
                "confidence": 0.94,
            },
            {
                "id": "obs_demo_gold_corrob_2",
                "issue_id": "iss_demo_gold_corrob",
                "detection_id": "det_demo_gold_corrob_2",
                "bus_id": "BUS-002",
                "timestamp": datetime(2026, 9, 6, 9, 45, 0, tzinfo=timezone.utc),
                "evidence_url": "/evidence/BUS001_EVT-015663c8_1788712505.jpg",
                "confidence": 0.96,
            }
        ],
        "ticket": {
            "id": "tkt_demo_gold_corrob",
            "display_id": "TKT-GOLD-003",
            "issue_id": "iss_demo_gold_corrob",
            "department_id": "DELHI-NCR-ROADS",
            "authority_id": "AUTH-PWD-DELHI",
            "title": "[DEMO] Corroborated Critical Hazard on Direct Delhi-Noida Corridor",
            "description": "Controlled demonstration record: High-impact crater confirmed independently by BUS-001 and BUS-002 within 15m radius. Priority elevated to URGENT.",
            "status": TicketStatus.open,
            "priority": TicketPriority.urgent,
            "repair_reported_at": None,
            "verified_at": None,
            "due_date": datetime(2026, 9, 8, 18, 0, 0, tzinfo=timezone.utc),
        },
        "timeline_events": [
            {
                "id": "evt_demo_gold_corrob_det1",
                "entity_id": "iss_demo_gold_corrob",
                "entity_type": "issue",
                "event_type": "detection",
                "title": "First Observation by Transit Unit BUS-001",
                "description": "Initial pavement defect identified by edge optical camera CAM-001 at 08:15 UTC.",
                "actor": "BUS-001",
                "created_at": datetime(2026, 9, 6, 8, 15, 0, tzinfo=timezone.utc),
            },
            {
                "id": "evt_demo_gold_corrob_det2",
                "entity_id": "iss_demo_gold_corrob",
                "entity_type": "issue",
                "event_type": "corroboration",
                "title": "Dual-Bus Spatial Fusion Corroboration",
                "description": "Second independent observation by BUS-002 at 09:45 UTC. Proximity 12.3m. Confidence increased from 0.94 to 0.96; priority escalated to URGENT.",
                "actor": "SPATIAL_FUSION_ENGINE",
                "created_at": datetime(2026, 9, 6, 9, 45, 0, tzinfo=timezone.utc),
            },
            {
                "id": "evt_demo_gold_corrob_tkt",
                "entity_id": "iss_demo_gold_corrob",
                "entity_type": "issue",
                "event_type": "ticket_created",
                "title": "Urgent Work Order Dispatched",
                "description": "Corroborated critical hazard triggered automated work order TKT-GOLD-003 assigned to Delhi PWD.",
                "actor": "MISSION_CONTROL",
                "created_at": datetime(2026, 9, 6, 9, 50, 0, tzinfo=timezone.utc),
            }
        ]
    },
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
        "detections": [
            {
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
            }
        ],
        "observations": [
            {
                "id": "obs_demo_gold_a",
                "issue_id": "iss_demo_gold_a",
                "detection_id": "det_demo_gold_a",
                "bus_id": "BUS-001",
                "timestamp": datetime(2026, 8, 20, 8, 30, 0, tzinfo=timezone.utc),
                "evidence_url": "/evidence/BUS001_EVT-00750aff_1788714151.jpg",
                "confidence": 0.92,
            }
        ],
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
        "detections": [
            {
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
            }
        ],
        "observations": [
            {
                "id": "obs_demo_gold_b",
                "issue_id": "iss_demo_gold_b",
                "detection_id": "det_demo_gold_b",
                "bus_id": "BUS-001",
                "timestamp": datetime(2026, 9, 2, 11, 45, 0, tzinfo=timezone.utc),
                "evidence_url": "/evidence/BUS001_EVT-01cdda66_1788711423.jpg",
                "confidence": 0.88,
            }
        ],
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
    "scenario_inconclusive": {
        "description": "Trustworthy Inconclusive Verification (Optical Glare Occlusion on Barapullah)",
        "issue": {
            "id": "iss_demo_gold_inconcl",
            "issue_type": "pothole",
            "status": IssueStatus.verification_pending,
            "severity": Severity.medium,
            "priority": TicketPriority.medium,
            "location": "POINT(77.2400 28.5830)",
            "road_segment_id": "SEG-DEL-NCR-02",
            "authority_id": "AUTH-PWD-DELHI",
            "assigned_department_id": "DELHI-NCR-ROADS",
            "jurisdiction_id": None,
            "jurisdiction_source": "road_segment_ownership",
            "observation_count": 1,
            "unique_bus_count": 1,
            "confidence": 0.86,
            "first_detected_at": datetime(2026, 8, 26, 10, 0, 0, tzinfo=timezone.utc),
            "last_observed_at": datetime(2026, 8, 26, 10, 0, 0, tzinfo=timezone.utc),
        },
        "detections": [
            {
                "id": "det_demo_gold_inconcl",
                "event_id": "EVT-GOLD-INC-001",
                "bus_id": "BUS-001",
                "timestamp": datetime(2026, 8, 26, 10, 0, 0, tzinfo=timezone.utc),
                "location": "POINT(77.2400 28.5830)",
                "detection_type": "pothole",
                "confidence": 0.86,
                "severity": Severity.medium,
                "evidence_url": "/evidence/BUS001_EVT-03bc7830_1788679005.jpg",
                "processing_status": "fused",
            }
        ],
        "observations": [
            {
                "id": "obs_demo_gold_inconcl",
                "issue_id": "iss_demo_gold_inconcl",
                "detection_id": "det_demo_gold_inconcl",
                "bus_id": "BUS-001",
                "timestamp": datetime(2026, 8, 26, 10, 0, 0, tzinfo=timezone.utc),
                "evidence_url": "/evidence/BUS001_EVT-03bc7830_1788679005.jpg",
                "confidence": 0.86,
            }
        ],
        "ticket": {
            "id": "tkt_demo_gold_inconcl",
            "display_id": "TKT-GOLD-005",
            "issue_id": "iss_demo_gold_inconcl",
            "department_id": "DELHI-NCR-ROADS",
            "authority_id": "AUTH-PWD-DELHI",
            "title": "[DEMO] Wear & Tear on Barapullah Ramp",
            "description": "Controlled demonstration record: Repair reported by vendor. Transit reinspection pass completed, but severe sunlight glare prevented conclusive validation. Issue retained in PENDING_REVIEW.",
            "status": TicketStatus.verifying,
            "priority": TicketPriority.medium,
            "repair_reported_at": datetime(2026, 8, 28, 12, 0, 0, tzinfo=timezone.utc),
            "verified_at": None,
            "due_date": datetime(2026, 8, 31, 18, 0, 0, tzinfo=timezone.utc),
        },
        "verification": {
            "id": "ver_demo_gold_inconcl",
            "issue_id": "iss_demo_gold_inconcl",
            "ticket_id": "tkt_demo_gold_inconcl",
            "bus_id": "BUS-001",
            "timestamp": datetime(2026, 8, 29, 14, 30, 0, tzinfo=timezone.utc),
            "result": VerificationResult.inconclusive,
            "confidence": 0.61,
            "before_evidence_url": "/evidence/BUS001_EVT-03bc7830_1788679005.jpg",
            "after_evidence_url": "/evidence/BUS001_EVT-03ff1bf8_1788714695.jpg",
            "notes": "Re-inspection pass optical assessment: severe road glare and partial lens wash. Pavement state uncertain. Non-detection does NOT mean resolved; retained in PENDING_REVIEW.",
            "rationale": "Re-inspection pass optical assessment: severe road glare and partial lens wash. Pavement state uncertain. Non-detection does NOT mean resolved; retained in PENDING_REVIEW.",
        },
        "timeline_events": [
            {
                "id": "evt_demo_gold_inc_rep",
                "entity_id": "iss_demo_gold_inconcl",
                "entity_type": "issue",
                "event_type": "repair_reported",
                "title": "Repair Reported by Vendor",
                "description": "Contractor reported pothole fill completed on Barapullah ramp.",
                "actor": "PWD_CONTRACTOR",
                "created_at": datetime(2026, 8, 28, 12, 0, 0, tzinfo=timezone.utc),
            },
            {
                "id": "evt_demo_gold_inc_ver",
                "entity_id": "iss_demo_gold_inconcl",
                "entity_type": "issue",
                "event_type": "verification_inconclusive",
                "title": "Verification INCONCLUSIVE — Sun Glare Occlusion",
                "description": "Transit pass automated assessment scored confidence 0.61 (below 0.85 resolution threshold). Retained for follow-up pass.",
                "actor": "VERIFICATION_ENGINE",
                "created_at": datetime(2026, 8, 29, 14, 30, 0, tzinfo=timezone.utc),
            }
        ]
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
        "detections": [
            {
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
            }
        ],
        "observations": [
            {
                "id": "obs_demo_gold_c",
                "issue_id": "iss_demo_gold_c",
                "detection_id": "det_demo_gold_c",
                "bus_id": "BUS-001",
                "timestamp": datetime(2026, 9, 4, 9, 10, 0, tzinfo=timezone.utc),
                "evidence_url": "/evidence/BUS001_EVT-03bc7830_1788679005.jpg",
                "confidence": 0.85,
            }
        ],
        "ticket": None,
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
        "detections": [
            {
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
            }
        ],
        "observations": [
            {
                "id": "obs_demo_gold_d",
                "issue_id": "iss_demo_gold_d",
                "detection_id": "det_demo_gold_d",
                "bus_id": "BUS-001",
                "timestamp": datetime(2026, 8, 25, 14, 20, 0, tzinfo=timezone.utc),
                "evidence_url": "/evidence/BUS001_EVT-03f9f0f1_1788714739.jpg",
                "confidence": 0.91,
            }
        ],
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


GOLDEN_SESSIONS = [
    {
        "id": "sess_demo_gold_01",
        "vehicle_id": "BUS-001",
        "camera_id": "CAM-001",
        "started_at": datetime(2026, 9, 6, 7, 0, 0, tzinfo=timezone.utc),
        "ended_at": datetime(2026, 9, 6, 11, 30, 0, tzinfo=timezone.utc),
        "status": "completed",
        "telemetry_provenance": "SIMULATED",
        "distance_sensed_km": 24.5,
        "frames_analyzed": 14200,
        "detections_count": 18,
        "potholes_detected": 18,
        "road_segments_covered": ["SEG-DEL-NCR-01", "SEG-DEL-NCR-04"],
    },
    {
        "id": "sess_demo_gold_02",
        "vehicle_id": "BUS-002",
        "camera_id": "CAM-002",
        "started_at": datetime(2026, 9, 6, 8, 30, 0, tzinfo=timezone.utc),
        "ended_at": None,
        "status": "active",
        "telemetry_provenance": "SIMULATED",
        "distance_sensed_km": 16.8,
        "frames_analyzed": 9800,
        "detections_count": 11,
        "potholes_detected": 11,
        "road_segments_covered": ["SEG-DEL-NCR-01", "SEG-DEL-NCR-02"],
    },
]


async def reset_golden_demo():
    """
    Safely purges ONLY Golden Demo records (matching _demo_gold_ prefix).
    Leaves real operational records, tests, authorities, road segments, and baseline intact.
    """
    print("--- RESETTING GOLDEN DEMO DATA ---")
    async with AsyncSessionLocal() as session:
        # 1. Inspection Sessions
        sess_res = await session.execute(
            delete(InspectionSession).where(InspectionSession.id.like("sess_demo_gold_%"))
        )
        print(f"Deleted {sess_res.rowcount} Golden Demo Inspection Sessions.")

        # 2. Timeline Events
        tl_res = await session.execute(
            delete(TimelineEvent).where(
                (TimelineEvent.id.like("evt_demo_gold_%")) |
                (TimelineEvent.entity_id.like("%demo_gold%"))
            )
        )
        print(f"Deleted {tl_res.rowcount} Golden Demo Timeline Events.")

        # 3. Verifications
        v_res = await session.execute(
            delete(Verification).where(
                (Verification.id.like("ver_demo_gold_%")) |
                (Verification.issue_id.like("iss_demo_gold_%"))
            )
        )
        print(f"Deleted {v_res.rowcount} Golden Demo Verifications.")

        # 4. Observations
        o_res = await session.execute(
            delete(Observation).where(
                (Observation.id.like("obs_demo_gold_%")) |
                (Observation.issue_id.like("iss_demo_gold_%"))
            )
        )
        print(f"Deleted {o_res.rowcount} Golden Demo Observations.")

        # 5. Tickets
        t_res = await session.execute(
            delete(Ticket).where(
                (Ticket.id.like("tkt_demo_gold_%")) |
                (Ticket.issue_id.like("iss_demo_gold_%"))
            )
        )
        print(f"Deleted {t_res.rowcount} Golden Demo Tickets.")

        # 6. Urban Issues
        i_res = await session.execute(
            delete(UrbanIssue).where(UrbanIssue.id.like("iss_demo_gold_%"))
        )
        print(f"Deleted {i_res.rowcount} Golden Demo Urban Issues.")

        # 7. Detections
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
    created = {"issues": 0, "detections": 0, "observations": 0, "tickets": 0, "verifications": 0, "events": 0, "sessions": 0}
    updated = {"issues": 0, "detections": 0, "observations": 0, "tickets": 0, "verifications": 0, "events": 0, "sessions": 0}
    skipped = {"issues": 0, "detections": 0, "observations": 0, "tickets": 0, "verifications": 0, "events": 0, "sessions": 0}

    async with AsyncSessionLocal() as session:
        # A. Ensure Buses & Cameras exist for sessions
        for bus_id in ["BUS-001", "BUS-002"]:
            bus = await session.get(Bus, bus_id)
            if not bus:
                session.add(Bus(
                    id=bus_id,
                    fleet_id="DTC-NORTH-NCR",
                    vehicle_type="standard_transit",
                    operator_name="Delhi Transport Corporation",
                    depot_name="BBM Depot Central",
                    telemetry_mode="SIMULATED",
                    telemetry_status="active",
                    gps_status="healthy",
                ))
        for cam_id, b_id in [("CAM-001", "BUS-001"), ("CAM-002", "BUS-002")]:
            cam = await session.get(Camera, cam_id)
            if not cam:
                session.add(Camera(
                    id=cam_id,
                    vehicle_id=b_id,
                    mount_position="windshield_center",
                    orientation="forward_down",
                    resolution="1080p",
                    fps=30,
                    status="active",
                    calibration_status="calibrated",
                ))
        await session.flush()

        # B. Seed Inspection Sessions
        for sess_info in GOLDEN_SESSIONS:
            existing_sess = await session.get(InspectionSession, sess_info["id"])
            if not existing_sess:
                session.add(InspectionSession(**sess_info))
                created["sessions"] += 1
            else:
                for k, v in sess_info.items():
                    setattr(existing_sess, k, v)
                updated["sessions"] += 1

        # C. Seed Scenarios
        for s_key, s_data in GOLDEN_SCENARIOS.items():
            print(f"\nProcessing [{s_key.upper()}]: {s_data['description']}")

            # 1. Detections (supports list or single)
            det_list = s_data.get("detections") or [s_data["detection"]]
            for det_info in det_list:
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

            # 3. Observations (supports list or single)
            obs_list = s_data.get("observations") or [s_data["observation"]]
            for obs_info in obs_list:
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
