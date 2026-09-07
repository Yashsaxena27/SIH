from typing import Optional, Dict, Any, Tuple
from app.models.domain import UrbanIssue, TicketPriority, Severity

def calculate_priority_with_explanation(
    issue: UrbanIssue,
    road_class: Optional[str] = None
) -> Tuple[TicketPriority, Dict[str, Any]]:
    """
    Computes explainable operational priority with detailed scoring breakdown.
    Factors:
    - Base defect severity (Low: 5, Medium: 15, High: 30, Critical: 50)
    - Multi-bus corroboration bonus ((unique_buses - 1) * 10)
    - Repeated observation frequency (observation_count * 2)
    - Road functional class weighting (Expressway/Arterial: +15, Collector: +10, Local: +0)
    """
    score = 0
    breakdown: Dict[str, Any] = {}

    # 1. Base severity score
    sev = issue.severity.value if hasattr(issue.severity, "value") else str(issue.severity)
    if sev == "critical":
        sev_score = 50
    elif sev == "high":
        sev_score = 30
    elif sev == "medium":
        sev_score = 15
    else:
        sev_score = 5
    score += sev_score
    breakdown["severity_score"] = sev_score
    breakdown["severity_level"] = sev

    # 2. Multi-bus corroboration multiplier
    bus_count = getattr(issue, "unique_bus_count", 1) or 1
    bus_bonus = max(0, (bus_count - 1) * 10)
    score += bus_bonus
    breakdown["multi_bus_bonus"] = bus_bonus
    breakdown["unique_buses"] = bus_count

    # 3. Observation frequency score
    obs_count = getattr(issue, "observation_count", 1) or 1
    obs_score = obs_count * 2
    score += obs_score
    breakdown["observation_score"] = obs_score
    breakdown["observation_count"] = obs_count

    # 4. Road functional class weighting (if available)
    road_bonus = 0
    if road_class:
        rc_lower = str(road_class).lower()
        if any(w in rc_lower for w in ("expressway", "highway", "primary", "arterial")):
            road_bonus = 15
        elif any(w in rc_lower for w in ("secondary", "collector")):
            road_bonus = 10
        elif "local" in rc_lower:
            road_bonus = 0
    score += road_bonus
    breakdown["road_class_bonus"] = road_bonus
    breakdown["road_class"] = road_class or "unclassified"

    # Final total score & mapping to TicketPriority
    breakdown["total_score"] = score
    if score >= 60:
        priority = TicketPriority.urgent
    elif score >= 40:
        priority = TicketPriority.high
    elif score >= 20:
        priority = TicketPriority.medium
    else:
        priority = TicketPriority.low

    p_val = priority.value if hasattr(priority, "value") else str(priority)
    breakdown["priority"] = p_val
    breakdown["explanation"] = (
        f"Operational priority '{p_val.upper()}' (Score {score}) derived from "
        f"Severity: {sev.upper()} ({sev_score} pts) + "
        f"Multi-bus corroboration: {bus_count} buses (+{bus_bonus} pts) + "
        f"Pass frequency: {obs_count} passes (+{obs_score} pts)"
        + (f" + Corridor: {road_class} (+{road_bonus} pts)" if road_bonus else "")
    )

    return priority, breakdown


def calculate_priority(issue: UrbanIssue, road_class: Optional[str] = None) -> TicketPriority:
    """
    Calculate the priority of an issue based on severity, unique buses, and observation count.
    Backward-compatible wrapper around calculate_priority_with_explanation.
    """
    priority, _ = calculate_priority_with_explanation(issue, road_class)
    return priority

