// ============================================================
// Ticket — Municipal work ticket
// ============================================================

import type { TicketPriority, Severity } from './common';

export interface Ticket {
  id: string;
  displayId: string; // e.g. "TKT-2024-0847"
  issueId: string;
  issueDisplayId: string;
  title: string;
  description: string;
  type: string; // detection class
  severity: Severity;
  priority: TicketPriority;
  status: TicketStatus;
  departmentId: string;
  departmentName: string;
  assignedTo?: string;
  assignedOfficer?: string;
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
  location: {
    address: string;
    roadName: string;
    ward?: string;
  };
  observationCount: number;
  busCount: number;
  repairReportedAt?: string;
  verifiedAt?: string;
  verificationResult?: 'resolved' | 'unresolved' | 'inconclusive';
  timeline: TicketTimelineEvent[];
  slaStatus: SlaStatus;
}

export type TicketStatus =
  | 'open'
  | 'assigned'
  | 'in_progress'
  | 'repair_reported'
  | 'verifying'
  | 'verified_resolved'
  | 'verified_unresolved'
  | 'closed'
  | 'reopened';

export type SlaStatus = 'on_track' | 'at_risk' | 'breached';

export interface TicketTimelineEvent {
  id: string;
  timestamp: string;
  type: 'created' | 'assigned' | 'status_change' | 'comment' | 'evidence' | 'verification';
  title: string;
  description?: string;
  actor: string;
  metadata?: Record<string, unknown>;
}

export interface TicketSummary {
  total: number;
  open: number;
  assigned: number;
  inProgress: number;
  repairReported: number;
  verifying: number;
  resolved: number;
  reopened: number;
  slaBreached: number;
  averageResolutionDays: number;
}
