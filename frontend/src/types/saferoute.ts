// ============================================================
// SafeRoute — Risk-Aware Routing Types
// ============================================================

export type SafeRouteMode = 'FASTEST' | 'SAFEST' | 'BALANCED';

export type RouteRiskLevel = 'LOW' | 'MODERATE' | 'ELEVATED' | 'HIGH' | 'CRITICAL';

export interface RouteRiskFactor {
  factor: string;
  penalty: number;
  description: string;
}

export interface RouteSegmentProfile {
  segment_id: string;
  segment_name: string;
  road_class: string;
  length_meters: number;
  health_score: number;
  risk_state: string;
  active_issue_count: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  corroborated_count: number;
  unresolved_verification_count: number;
  segment_risk_score: number;
}

export interface RouteCandidate {
  id: string;
  name: string;
  estimated_distance_km: number;
  estimated_distance_meters: number;
  estimated_duration_minutes: number;
  timing_label: string;
  overall_risk_score: number;
  risk_level: RouteRiskLevel;
  total_active_defects: number;
  total_critical_defects: number;
  total_high_defects: number;
  total_unresolved_verifications: number;
  contributing_factors: RouteRiskFactor[];
  segments: RouteSegmentProfile[];
  geometry: {
    type: 'LineString';
    coordinates: [number, number][]; // [lng, lat]
  };
  is_recommended: boolean;
  recommendation_reason?: string;
  avoided_hazards?: string[];
}

export interface SafeRouteResponse {
  origin: string;
  destination: string;
  mode: SafeRouteMode;
  recommended_route_id: string;
  recommendation_reason: string;
  candidates: RouteCandidate[];
  candidate_count: number;
  data_freshness: string;
  timing_provenance: string;
  computed_at: string;
}

export interface RoutePlanRequest {
  origin: string;
  destination: string;
  mode: SafeRouteMode;
  corridor_set?: string;
  origin_coords?: { lat: number; lng: number };
  destination_coords?: { lat: number; lng: number };
}

export interface RoutePreset {
  id: string;
  name: string;
  corridor_set: string;
  origin: string;
  destination: string;
  origin_coords: { lat: number; lng: number };
  destination_coords: { lat: number; lng: number };
  description: string;
}
