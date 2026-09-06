// ============================================================
// Analytics — Database-derived Intelligence Types
// ============================================================

export interface AnalyticsSummary {
  totalIssues: number;
  totalDetections: number;
  totalObservations: number;
  totalTickets: number;
  totalVerifications: number;
  resolvedJurisdictions: number;
  unresolvedJurisdictions: number;
  uniqueObservingBuses: number;
  activeBuses: number;
  totalBuses: number;
  totalRoadSegments: number;
  provenance: string;
  generatedAt: string;
}

export interface AnalyticsIssues {
  total: number;
  byType: Array<{ type: string; count: number }>;
  bySeverity: Array<{ severity: string; count: number }>;
  byStatus: Array<{ status: string; count: number }>;
  provenance: string;
}

export interface AnalyticsTrends {
  detectionsByDate: Array<{ date: string; count: number }>;
  issuesByDate: Array<{ date: string; count: number }>;
  isSparse: boolean;
  provenance: string;
  note: string;
}

export interface AnalyticsTickets {
  total: number;
  byStatus: Array<{ status: string; count: number }>;
  byPriority: Array<{ priority: string; count: number }>;
  provenance: string;
}

export interface AnalyticsVerifications {
  total: number;
  byResult: Array<{ result: string; count: number }>;
  provenance: string;
}

export interface AuthorityWorkload {
  authorityId: string;
  authorityName: string;
  authorityCode: string;
  authorityType: string;
  issuesCount: number;
  ticketsCount: number;
  openTicketsCount: number;
  inProgressTicketsCount: number;
  resolvedTicketsCount: number;
}

export interface AnalyticsAuthorities {
  authorities: AuthorityWorkload[];
  provenance: string;
}

export interface DetailedSegmentHealth {
  segmentId: string;
  name: string;
  roadClass: string;
  healthScore: number;
  factors: {
    activeIssueCount?: number;
    resolvedCount?: number;
    reopenedCount?: number;
    severityBreakdown?: Record<string, number>;
    severityDeduction?: number;
    reopenedPenalty?: number;
    totalDeduction?: number;
  };
}

export interface AnalyticsRoadHealth {
  totalSegments: number;
  averageHealthScore: number;
  distribution: {
    excellent: number;
    good: number;
    fair: number;
    critical: number;
  };
  segments: DetailedSegmentHealth[];
  provenance: string;
  disclaimer: string;
}
