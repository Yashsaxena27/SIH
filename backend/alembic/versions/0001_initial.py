"""Initial setup

Revision ID: 0001_initial
Revises: 
Create Date: 2026-09-02 09:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import geoalchemy2


# revision identifiers, used by Alembic.
revision: str = '0001_initial'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Enable PostGIS
    op.execute('CREATE EXTENSION IF NOT EXISTS postgis;')

    op.create_table('departments',
        sa.Column('id', sa.String(length=50), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('department_type', sa.String(length=50), nullable=True),
        sa.Column('service_area', sa.String(length=100), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_table('users',
        sa.Column('id', sa.String(length=50), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('role', sa.Enum('admin', 'operator', 'officer', 'viewer', name='userrole'), nullable=False),
        sa.Column('department_id', sa.String(length=50), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['department_id'], ['departments.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email')
    )
    op.create_table('routes',
        sa.Column('id', sa.String(length=50), nullable=False),
        sa.Column('display_code', sa.String(length=50), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('geometry', geoalchemy2.types.Geometry(geometry_type='LINESTRING', srid=4326, from_text='ST_GeomFromEWKT', name='geometry'), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_table('buses',
        sa.Column('id', sa.String(length=50), nullable=False),
        sa.Column('registration_number', sa.String(length=50), nullable=False),
        sa.Column('operator', sa.String(length=100), nullable=True),
        sa.Column('route_id', sa.String(length=50), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=True),
        sa.Column('camera_status', sa.String(length=50), nullable=True),
        sa.Column('gps_status', sa.String(length=50), nullable=True),
        sa.Column('edge_ai_status', sa.String(length=50), nullable=True),
        sa.Column('last_seen', sa.DateTime(timezone=True), nullable=True),
        sa.Column('current_location', geoalchemy2.types.Geometry(geometry_type='POINT', srid=4326, from_text='ST_GeomFromEWKT', name='geometry'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['route_id'], ['routes.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('registration_number')
    )
    op.create_table('road_segments',
        sa.Column('id', sa.String(length=50), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('road_class', sa.String(length=50), nullable=True),
        sa.Column('geometry', geoalchemy2.types.Geometry(geometry_type='LINESTRING', srid=4326, from_text='ST_GeomFromEWKT', name='geometry'), nullable=False),
        sa.Column('health_score', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_table('urban_issues',
        sa.Column('id', sa.String(length=50), nullable=False),
        sa.Column('issue_type', sa.String(length=50), nullable=False),
        sa.Column('status', sa.Enum('new', 'confirmed', 'prioritized', 'assigned', 'ticket_created', 'in_progress', 'repair_reported', 'verification_pending', 'verified', 'reopened', name='issuestatus'), nullable=False),
        sa.Column('severity', sa.Enum('low', 'medium', 'high', 'critical', name='severity'), nullable=False),
        sa.Column('priority', sa.Enum('low', 'medium', 'high', 'urgent', name='ticketpriority'), nullable=False),
        sa.Column('location', geoalchemy2.types.Geometry(geometry_type='POINT', srid=4326, from_text='ST_GeomFromEWKT', name='geometry'), nullable=False),
        sa.Column('road_segment_id', sa.String(length=50), nullable=True),
        sa.Column('first_detected_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('last_observed_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('observation_count', sa.Integer(), nullable=True),
        sa.Column('unique_bus_count', sa.Integer(), nullable=True),
        sa.Column('confidence', sa.Float(), nullable=True),
        sa.Column('assigned_department_id', sa.String(length=50), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['assigned_department_id'], ['departments.id'], ),
        sa.ForeignKeyConstraint(['road_segment_id'], ['road_segments.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_table('detections',
        sa.Column('id', sa.String(length=50), nullable=False),
        sa.Column('event_id', sa.String(length=100), nullable=False),
        sa.Column('bus_id', sa.String(length=50), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('location', geoalchemy2.types.Geometry(geometry_type='POINT', srid=4326, from_text='ST_GeomFromEWKT', name='geometry'), nullable=False),
        sa.Column('detection_type', sa.String(length=50), nullable=False),
        sa.Column('confidence', sa.Float(), nullable=False),
        sa.Column('severity', sa.Enum('low', 'medium', 'high', 'critical', name='severity'), nullable=False),
        sa.Column('evidence_url', sa.String(length=500), nullable=True),
        sa.Column('processing_status', sa.String(length=50), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['bus_id'], ['buses.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('event_id')
    )
    op.create_table('observations',
        sa.Column('id', sa.String(length=50), nullable=False),
        sa.Column('issue_id', sa.String(length=50), nullable=False),
        sa.Column('detection_id', sa.String(length=50), nullable=False),
        sa.Column('bus_id', sa.String(length=50), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('evidence_url', sa.String(length=500), nullable=True),
        sa.Column('confidence', sa.Float(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['bus_id'], ['buses.id'], ),
        sa.ForeignKeyConstraint(['detection_id'], ['detections.id'], ),
        sa.ForeignKeyConstraint(['issue_id'], ['urban_issues.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_table('tickets',
        sa.Column('id', sa.String(length=50), nullable=False),
        sa.Column('display_id', sa.String(length=50), nullable=False),
        sa.Column('issue_id', sa.String(length=50), nullable=False),
        sa.Column('department_id', sa.String(length=50), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.String(length=1000), nullable=True),
        sa.Column('status', sa.Enum('open', 'assigned', 'in_progress', 'repair_reported', 'verifying', 'verified_resolved', 'verified_unresolved', 'closed', 'reopened', name='ticketstatus'), nullable=False),
        sa.Column('priority', sa.Enum('low', 'medium', 'high', 'urgent', name='ticketpriority'), nullable=False),
        sa.Column('assigned_to', sa.String(length=50), nullable=True),
        sa.Column('due_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('repair_reported_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('verified_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['assigned_to'], ['users.id'], ),
        sa.ForeignKeyConstraint(['department_id'], ['departments.id'], ),
        sa.ForeignKeyConstraint(['issue_id'], ['urban_issues.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('display_id'),
        sa.UniqueConstraint('issue_id')
    )
    op.create_table('verifications',
        sa.Column('id', sa.String(length=50), nullable=False),
        sa.Column('issue_id', sa.String(length=50), nullable=False),
        sa.Column('ticket_id', sa.String(length=50), nullable=False),
        sa.Column('bus_id', sa.String(length=50), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('result', sa.Enum('resolved', 'partially_resolved', 'unresolved', 'inconclusive', 'pending_review', name='verificationresult'), nullable=False),
        sa.Column('confidence', sa.Float(), nullable=False),
        sa.Column('before_evidence_url', sa.String(length=500), nullable=True),
        sa.Column('after_evidence_url', sa.String(length=500), nullable=True),
        sa.Column('notes', sa.String(length=1000), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['bus_id'], ['buses.id'], ),
        sa.ForeignKeyConstraint(['issue_id'], ['urban_issues.id'], ),
        sa.ForeignKeyConstraint(['ticket_id'], ['tickets.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_table('alerts',
        sa.Column('id', sa.String(length=50), nullable=False),
        sa.Column('alert_type', sa.String(length=50), nullable=False),
        sa.Column('severity', sa.String(length=50), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('message', sa.String(length=1000), nullable=False),
        sa.Column('acknowledged', sa.Boolean(), nullable=True),
        sa.Column('related_entity_id', sa.String(length=50), nullable=True),
        sa.Column('related_entity_type', sa.String(length=50), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

def downgrade() -> None:
    pass
