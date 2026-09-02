// ============================================================
// Road — Road segments and health scoring
// ============================================================

import type { GeoPoint, Severity } from './common';

export interface RoadSegment {
  id: string;
  name: string;
  ward?: string;
  zone?: string;
  startPoint: GeoPoint;
  endPoint: GeoPoint;
  lengthKm: number;
  width?: number;
  roadType: RoadType;
  healthScore: number; // 0-100
  healthTrend: HealthTrend;
  defectCount: number;
  defectsBySeverity: Record<Severity, number>;
  lastInspected: string;
  inspectionCount: number;
  maintenanceHistory: MaintenanceEvent[];
}

export type RoadType = 'highway' | 'arterial' | 'collector' | 'local' | 'residential';

export type HealthTrend = 'improving' | 'stable' | 'declining' | 'critical_decline';

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
