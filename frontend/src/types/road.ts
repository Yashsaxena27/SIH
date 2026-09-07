// ============================================================
// Road — Road segments, GIS features, and health scoring
// ============================================================

import type { GeoPoint, Severity } from './common';

export type RoadType = 'highway' | 'arterial' | 'collector' | 'local' | 'residential';

export type HealthTrend = 'improving' | 'stable' | 'declining' | 'critical_decline';

export type RiskState = 'HEALTHY' | 'WATCH' | 'ELEVATED' | 'CRITICAL';

export interface RoadHealthFactors {
  activeIssueCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  resolvedCount?: number;
  corroboratedCount: number;
  unresolvedVerificationCount: number;
  openTicketCount: number;
  overdueTicketCount: number;
  observationVolume: number;
  distinctLocations: number;
  averageOperationalPriority: string;
  latestIssueActivity?: string | null;
  severityDeduction: number;
  corroborationDeduction: number;
  verificationDeduction: number;
  ticketDeduction: number;
  totalDeduction: number;
}

export interface OperationalRoadHealth {
  metricLabel: string;
  score?: number;
  healthScore?: number;
  riskState: RiskState;
  explanation: string;
  factors: RoadHealthFactors;
  segmentId?: string;
}

export interface RoadSegment {
  id: string;
  name: string;
  roadName?: string;
  road_name?: string;
  roadClass?: string;
  road_class?: string;
  roadType?: RoadType | string;
  authorityId?: string;
  authorityName?: string;
  ownerAgency?: string;
  owner_agency?: string;
  ward?: string;
  zone?: string;
  startPoint?: GeoPoint;
  endPoint?: GeoPoint;
  lengthKm?: number;
  width?: number;
  healthScore?: number; // 0-100
  healthTrend?: HealthTrend;
  defectCount?: number;
  defectsBySeverity?: Record<Severity, number>;
  lastInspected?: string;
  inspectionCount?: number;
  maintenanceHistory?: MaintenanceEvent[];
  coordinates?: [number, number][]; // LineString coords [lng, lat]
  geometry?: {
    type: string;
    coordinates: [number, number][];
  };
  health?: OperationalRoadHealth;
  operational_health?: OperationalRoadHealth;
  activeIssueCount?: number;
  corroboratedIssueCount?: number;
  openTicketCount?: number;
}

export interface RoadIssueSummary {
  id: string;
  displayId?: string;
  title?: string;
  type: string;
  severity: string;
  status: string;
  priority?: string;
  confidence?: number;
  observationCount?: number;
  uniqueBusCount?: number;
  distanceToCenterlineMeters?: number | null;
  location?: { lat: number; lng: number };
  firstDetectedAt?: string | null;
  lastObservedAt?: string | null;
}

export interface RoadHealth {
  segmentId: string;
  date: string;
  score: number;
  defectCount: number;
  newDefects: number;
  resolvedDefects: number;
}

export interface MaintenanceEvent {
  id: string;
  segmentId: string;
  type: 'pothole_repair' | 'resurfacing' | 'crack_sealing' | 'full_reconstruction' | 'other';
  date: string;
  description: string;
  verified: boolean;
}

export interface RoadHealthSummary {
  totalSegments: number;
  averageHealth: number;
  averageScore: number;
  criticalSegments: number;
  decliningSegments: number;
  improvedSegments: number;
  totalDefects: number;
  resolvedThisMonth: number;
  segmentDistribution?: {
    excellent: number;
    good: number;
    fair: number;
    critical: number;
  };
}
