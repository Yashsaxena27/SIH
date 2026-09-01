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
  beforeEvidence: EvidenceImage;
  afterEvidence: EvidenceImage;
  comparisonScore: number; // similarity / difference score
  notes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
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
