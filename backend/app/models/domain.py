from sqlalchemy import Column, String, Integer, Float, Boolean, ForeignKey, DateTime, Enum, JSON
from sqlalchemy.orm import relationship
from geoalchemy2 import Geometry
from app.models.base import Base, TimestampMixin
import enum

class UserRole(str, enum.Enum):
    admin = "admin"
    operator = "operator"
    officer = "officer"
    viewer = "viewer"

class IssueStatus(str, enum.Enum):
    new = "new"
    confirmed = "confirmed"
    prioritized = "prioritized"
    assigned = "assigned"
    ticket_created = "ticket_created"
    in_progress = "in_progress"
    repair_reported = "repair_reported"
    verification_pending = "verification_pending"
    verified = "verified"
    reopened = "reopened"

class TicketStatus(str, enum.Enum):
    open = "open"
    assigned = "assigned"
    in_progress = "in_progress"
    repair_reported = "repair_reported"
    verifying = "verifying"
    verified_resolved = "verified_resolved"
    verified_unresolved = "verified_unresolved"
    closed = "closed"
    reopened = "reopened"

class Severity(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"

class TicketPriority(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    urgent = "urgent"

class VerificationResult(str, enum.Enum):
    resolved = "resolved"
    partially_resolved = "partially_resolved"
    unresolved = "unresolved"
    inconclusive = "inconclusive"
    pending_review = "pending_review"

class ComplaintSource(str, enum.Enum):
    ai_detected = "ai_detected"
    citizen_reported = "citizen_reported"
    operator_created = "operator_created"

class ComplaintStatus(str, enum.Enum):
    open = "open"
    under_review = "under_review"
    linked_to_issue = "linked_to_issue"
    resolved = "resolved"
    closed = "closed"


class Department(Base, TimestampMixin):
    __tablename__ = "departments"
    id = Column(String(50), primary_key=True)
    name = Column(String(100), nullable=False)
    department_type = Column(String(50))
    service_area = Column(String(100))
    is_active = Column(Boolean, default=True)

class User(Base, TimestampMixin):
    __tablename__ = "users"
    id = Column(String(50), primary_key=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.viewer)
    department_id = Column(String(50), ForeignKey("departments.id"), nullable=True)
    is_active = Column(Boolean, default=True)

class Route(Base, TimestampMixin):
    __tablename__ = "routes"
    id = Column(String(50), primary_key=True)
    display_code = Column(String(50), nullable=False)
    name = Column(String(100), nullable=False)
    geometry = Column(Geometry(geometry_type='LINESTRING', srid=4326))
    is_active = Column(Boolean, default=True)

class Bus(Base, TimestampMixin):
    __tablename__ = "buses"
    id = Column(String(50), primary_key=True)
    registration_number = Column(String(50), nullable=False, unique=True)
    operator = Column(String(100))
    route_id = Column(String(50), ForeignKey("routes.id"), nullable=True)
    status = Column(String(50), default="offline")
    camera_status = Column(String(50), default="offline")
    gps_status = Column(String(50), default="offline")
    edge_ai_status = Column(String(50), default="offline")
    last_seen = Column(DateTime(timezone=True), nullable=True)
    current_location = Column(Geometry(geometry_type='POINT', srid=4326), nullable=True)
    
class RoadSegment(Base, TimestampMixin):
    __tablename__ = "road_segments"
    id = Column(String(50), primary_key=True)
    name = Column(String(255), nullable=False)
    road_class = Column(String(50))
    geometry = Column(Geometry(geometry_type='LINESTRING', srid=4326), nullable=False)
    health_score = Column(Float, default=100.0)

class UrbanIssue(Base, TimestampMixin):
    __tablename__ = "urban_issues"
    id = Column(String(50), primary_key=True)
    issue_type = Column(String(50), nullable=False) # e.g. "pothole"
    status = Column(Enum(IssueStatus), nullable=False, default=IssueStatus.new)
    severity = Column(Enum(Severity), nullable=False, default=Severity.low)
    priority = Column(Enum(TicketPriority), nullable=False, default=TicketPriority.low)
    location = Column(Geometry(geometry_type='POINT', srid=4326), nullable=False)
    road_segment_id = Column(String(50), ForeignKey("road_segments.id"), nullable=True)
    
    first_detected_at = Column(DateTime(timezone=True), nullable=False)
    last_observed_at = Column(DateTime(timezone=True), nullable=False)
    
    observation_count = Column(Integer, default=1)
    unique_bus_count = Column(Integer, default=1)
    confidence = Column(Float, default=0.0)
    
    assigned_department_id = Column(String(50), ForeignKey("departments.id"), nullable=True)
    
    observations = relationship("Observation", back_populates="issue")
    ticket = relationship("Ticket", back_populates="issue", uselist=False)

class Detection(Base, TimestampMixin):
    __tablename__ = "detections"
    id = Column(String(50), primary_key=True)
    event_id = Column(String(100), unique=True, nullable=False)
    bus_id = Column(String(50), ForeignKey("buses.id"), nullable=False)
    timestamp = Column(DateTime(timezone=True), nullable=False)
    location = Column(Geometry(geometry_type='POINT', srid=4326), nullable=False)
    detection_type = Column(String(50), nullable=False)
    confidence = Column(Float, nullable=False)
    severity = Column(Enum(Severity), nullable=False)
    evidence_url = Column(String(500))
    processing_status = Column(String(50), default="pending") # pending, fused, ignored

class Observation(Base, TimestampMixin):
    __tablename__ = "observations"
    id = Column(String(50), primary_key=True)
    issue_id = Column(String(50), ForeignKey("urban_issues.id"), nullable=False)
    detection_id = Column(String(50), ForeignKey("detections.id"), nullable=False)
    bus_id = Column(String(50), ForeignKey("buses.id"), nullable=False)
    timestamp = Column(DateTime(timezone=True), nullable=False)
    evidence_url = Column(String(500))
    confidence = Column(Float, nullable=False)
    
    issue = relationship("UrbanIssue", back_populates="observations")

class Ticket(Base, TimestampMixin):
    __tablename__ = "tickets"
    id = Column(String(50), primary_key=True)
    display_id = Column(String(50), unique=True, nullable=False)
    issue_id = Column(String(50), ForeignKey("urban_issues.id"), nullable=False, unique=True)
    department_id = Column(String(50), ForeignKey("departments.id"), nullable=False)
    
    title = Column(String(255), nullable=False)
    description = Column(String(1000))
    status = Column(Enum(TicketStatus), nullable=False, default=TicketStatus.open)
    priority = Column(Enum(TicketPriority), nullable=False)
    
    assigned_to = Column(String(50), ForeignKey("users.id"), nullable=True)
    due_date = Column(DateTime(timezone=True), nullable=True)
    repair_reported_at = Column(DateTime(timezone=True), nullable=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    
    issue = relationship("UrbanIssue", back_populates="ticket")

class Verification(Base, TimestampMixin):
    __tablename__ = "verifications"
    id = Column(String(50), primary_key=True)
    issue_id = Column(String(50), ForeignKey("urban_issues.id"), nullable=False)
    ticket_id = Column(String(50), ForeignKey("tickets.id"), nullable=False)
    bus_id = Column(String(50), ForeignKey("buses.id"), nullable=False)
    
    timestamp = Column(DateTime(timezone=True), nullable=False)
    result = Column(Enum(VerificationResult), nullable=False)
    confidence = Column(Float, nullable=False)
    
    before_evidence_url = Column(String(500))
    after_evidence_url = Column(String(500))
    notes = Column(String(1000))

class Alert(Base, TimestampMixin):
    __tablename__ = "alerts"
    id = Column(String(50), primary_key=True)
    alert_type = Column(String(50), nullable=False)
    severity = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(String(1000), nullable=False)
    acknowledged = Column(Boolean, default=False)
    related_entity_id = Column(String(50))
    related_entity_type = Column(String(50))

class Complaint(Base, TimestampMixin):
    __tablename__ = "complaints"
    id = Column(String(50), primary_key=True)
    urban_issue_id = Column(String(50), ForeignKey("urban_issues.id"), nullable=True)
    title = Column(String(255), nullable=False)
    description = Column(String(1000))
    source = Column(Enum(ComplaintSource), nullable=False, default=ComplaintSource.citizen_reported)
    status = Column(Enum(ComplaintStatus), nullable=False, default=ComplaintStatus.open)
    
    issue = relationship("UrbanIssue")

class InspectionJob(Base, TimestampMixin):
    __tablename__ = "inspection_jobs"
    id = Column(String(50), primary_key=True)
    filename = Column(String(255), nullable=False)
    bus_id = Column(String(50), ForeignKey("buses.id"), nullable=False)
    status = Column(String(50), nullable=False, default="pending")
    stage = Column(String(50), nullable=False, default="upload")
    progress = Column(Integer, default=0)
    video_metadata = Column(JSON, nullable=True)
    statistics = Column(JSON, nullable=True)
    annotated_video_url = Column(String(500), nullable=True)
    error = Column(String(1000), nullable=True)

class TimelineEvent(Base, TimestampMixin):
    __tablename__ = "timeline_events"
    id = Column(String(50), primary_key=True)
    entity_id = Column(String(50), nullable=False) # issue_id or ticket_id
    entity_type = Column(String(50), nullable=False) # 'issue' or 'ticket'
    event_type = Column(String(50), nullable=False) # 'status_change', 'assigned', 'verified'
    title = Column(String(255), nullable=False)
    description = Column(String(1000))
    actor = Column(String(50), default="SYSTEM")
    metadata_json = Column(JSON, nullable=True)

