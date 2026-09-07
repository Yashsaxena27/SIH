// ============================================================
// Urban Issue — Spatially deduplicated civic issue
// ============================================================

import type { GeoPoint, Severity, IssueStatus, EvidenceImage } from './common';
import type { DetectionClass } from './detection';

export interface UrbanIssue {
  id: string;
  displayId: string; // e.g. "PTH-104"
  isDemo?: boolean;
  provenance?: string;
  type: DetectionClass;
  title: string;
  description: string;
  status: IssueStatus;
  severity: Severity;
  priority: number; // computed priority score 0-100
  location: IssueLocation;
  observations: Observation[];
  observationCount: number;
  uniqueBusCount: number;
  confidence: number; // aggregated confidence
  firstDetectedAt: string;
  lastObservedAt: string;
  ticketId?: string;
  departmentId: string;
  departmentName?: string | null;
  authorityId?: string | null;
  authorityName?: string | null;
  authorityCode?: string | null;
  jurisdictionId?: string | null;
  jurisdictionName?: string | null;
  jurisdictionStatus?: 'resolved' | 'unresolved';
  jurisdictionSource?: string | null;
  routingReason?: string;
  observingBuses?: string[];
  corroborationText?: string;
  assignedTo?: string;
  roadSegmentId?: string;
  roadSegmentMatch?: {
    state: 'MATCHED' | 'AMBIGUOUS' | 'UNMATCHED';
    segmentId?: string | null;
    segmentName?: string | null;
    distanceMeters?: number | null;
    reason?: string;
  } | null;
  roadSegment?: {
    id: string;
    name: string;
    roadClass?: string;
    healthScore?: number;
    healthScoreProvenance?: string;
    ownerAgency?: string;
    distanceMeters?: number;
  } | null;
  ticket?: any | null;
  verifications?: any[];
  verification?: any | null;
  timeline?: {
    id: string;
    type: string;
    title: string;
    description?: string;
    timestamp?: string;
    actor?: string;
  }[];
  tags: string[];
  verificationStatus?: VerificationStatus;
  resolutionHistory: ResolutionEvent[];
}

export interface IssueLocation {
  gps: GeoPoint;
  snappedGps: GeoPoint;
  address?: string;
  roadName?: string;
  ward?: string;
  zone?: string;
}

export interface Observation {
  id: string;
  detectionId: string;
  busId: string;
  routeId: string;
  timestamp: string;
  gps: GeoPoint;
  confidence: number;
  severity: Severity;
  evidence: EvidenceImage;
}

export type VerificationStatus =
  | 'pending'
  | 'scheduled'
  | 'in_progress'
  | 'verified_resolved'
  | 'verified_unresolved'
  | 'inconclusive';

export interface ResolutionEvent {
  timestamp: string;
  status: IssueStatus;
  actor: string;
  note?: string;
}

export interface IssueSummary {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  reopened: number;
  byType: Record<string, number>;
  bySeverity: Record<Severity, number>;
  averageResolutionHours: number;
  verificationRate: number;
}
