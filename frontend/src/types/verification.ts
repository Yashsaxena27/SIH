// ============================================================
// Verification — Closed-loop repair verification
// ============================================================

import type { GeoPoint, EvidenceImage } from './common';

export interface Verification {
  id: string;
  issueId: string;
  ticketId: string;
  busId: string;
  routeId: string;
  timestamp: string;
  location: GeoPoint;
  result: VerificationResult;
  confidence: number;
  beforeEvidence?: EvidenceImage;
  afterEvidence?: EvidenceImage;
  comparisonScore?: number; // similarity / difference score
  notes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  verifier?: string;
  evidenceSource?: string;
  inspectionJobId?: string | null;
  rationale?: string | null;
  failureReason?: string | null;
  comparisonMetrics?: {
    coverage_confirmed?: boolean;
    evidence_quality?: string;
    defect_detected?: boolean;
    before_confidence?: number;
    after_confidence?: number;
    before_extent_pct?: number;
    after_extent_pct?: number;
    model_version?: string;
    camera_id?: string;
    source?: string;
    corroboration_count?: number;
    [key: string]: any;
  } | null;
  isOverride?: boolean;
  overridesVerificationId?: string | null;
  operatorId?: string | null;
  authorityName?: string | null;
  authorityCode?: string | null;
  departmentName?: string | null;
  beforeEvidenceUrl?: string | null;
  afterEvidenceUrl?: string | null;
  hasBeforeEvidence?: boolean;
  hasAfterEvidence?: boolean;
}

export type VerificationResult =
  | 'resolved'
  | 'partially_resolved'
  | 'unresolved'
  | 'inconclusive'
  | 'pending_review';

export interface VerificationSummary {
  totalVerifications: number;
  resolved: number;
  unresolved: number;
  partiallyResolved: number;
  inconclusive: number;
  pendingReview: number;
  verificationRate: number; // percentage of issues that were verified
  averageVerificationDays: number;
  accuracyRate: number;
}
