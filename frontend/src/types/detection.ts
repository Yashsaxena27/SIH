// ============================================================
// Detection — Individual AI detection event from a bus
// ============================================================

import type { GeoPoint, Severity, EvidenceImage } from './common';

export type DetectionClass =
  | 'pothole'
  | 'crack'
  | 'road_damage'
  | 'waterlogging'
  | 'missing_sign'
  | 'damaged_sign'
  | 'missing_marking'
  | 'road_hazard'
  | 'congestion';

export interface Detection {
  id: string;
  busId: string;
  routeId: string;
  timestamp: string;
  gps: GeoPoint;
  snappedGps?: GeoPoint; // map-matched position
  detectionClass: DetectionClass;
  confidence: number; // 0-1
  severity: Severity;
  boundingBox: BoundingBox;
  frameIndex: number;
  multiFrameConfirmed: boolean;
  frameCount: number; // how many consecutive frames confirmed
  evidence: EvidenceImage;
  issueId?: string; // linked issue after dedup
  edgeProcessed: boolean;
  synced: boolean;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DetectionSummary {
  total: number;
  today: number;
  byClass: Record<DetectionClass, number>;
  bySeverity: Record<Severity, number>;
  averageConfidence: number;
  multiFrameRate: number; // percentage of multi-frame confirmed
}
