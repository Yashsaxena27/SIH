// ============================================================
// Urban Issue — Spatially deduplicated civic issue
// ============================================================

import type { GeoPoint, Severity, IssueStatus, EvidenceImage } from './common';
import type { DetectionClass } from './detection';

export interface UrbanIssue {
  id: string;
  displayId: string; // e.g. "PTH-104"
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
  assignedTo?: string;
  roadSegmentId?: string;
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
