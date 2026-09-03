from app.models.domain import UrbanIssue, TicketPriority, Severity

def calculate_priority(issue: UrbanIssue) -> TicketPriority:
    """
    Calculate the priority of an issue based on:
    - severity (low, medium, high, critical)
    - number of unique buses that observed it
    - total observations
    """
    score = 0
    
    # Base severity score
    if issue.severity == Severity.critical:
        score += 50
    elif issue.severity == Severity.high:
        score += 30
    elif issue.severity == Severity.medium:
        score += 15
    elif issue.severity == Severity.low:
        score += 5
        
    # Unique buses multiplier (highly indicative of a real persistent problem)
    if issue.unique_bus_count > 1:
        score += (issue.unique_bus_count - 1) * 10
        
    # Observation count
    score += issue.observation_count * 2
    
    # Map score to TicketPriority
    if score >= 60:
        return TicketPriority.urgent
    elif score >= 40:
        return TicketPriority.high
    elif score >= 20:
        return TicketPriority.medium
    else:
        return TicketPriority.low
