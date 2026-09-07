// ============================================================
// Bus — Fleet entity representing a physical public bus
// ============================================================

import type { GeoPoint, OperationalStatus } from './common';

export type VehicleType = 'bus' | 'inspection_vehicle' | 'service_vehicle';

export type TelemetryProvenance = 'LIVE' | 'REPLAY' | 'SIMULATED' | 'ESTIMATED';

export interface VehicleCamera {
  id: string;
  mountPosition: 'windshield_center' | 'roof_center' | 'bumper_forward' | 'dash_passenger' | string;
  orientation: 'forward' | 'forward_down' | 'angled_right' | 'angled_left' | string;
  resolution: string;
  fps: number;
  status: 'active' | 'degraded' | 'offline';
  calibrationStatus: 'calibrated' | 'needs_calibration' | 'uncalibrated';
  lastHealthCheck?: string;
}

export interface InspectionSession {
  id: string;
  vehicle_id: string;
  vehicle_registration: string;
  vehicle_type: VehicleType;
  camera_id?: string;
  route_id?: string;
  started_at: string;
  ended_at?: string | null;
  status: 'active' | 'completed' | 'interrupted';
  telemetry_provenance: TelemetryProvenance;
  distance_sensed_km: number;
  frames_analyzed: number;
  detections_count: number;
  potholes_detected: number;
  road_segments_covered: string[];
}

export interface FleetSummary {
  total_vehicles: number;
  active_vehicles: number;
  vehicle_breakdown: {
    public_buses: number;
    pwd_inspection_vehicles: number;
    municipal_service_trucks: number;
  };
  total_cameras: number;
  active_cameras: number;
  calibrated_cameras: number;
  total_survey_km: number;
  sessions: {
    total_count: number;
    active_count: number;
    provenance_breakdown: Record<string, number>;
  };
  coverage: {
    total_corridors: number;
    sensed_corridors: number;
    coverage_gaps: number;
    coverage_rate_pct: number;
  };
  telemetry_guarantee?: string;
}

export interface Bus {
  id: string;
  registrationNumber: string;
  registration_number?: string;
  vehicleType?: VehicleType;
  vehicle_type?: VehicleType;
  makeModel?: string;
  make_model?: string;
  totalDistanceKm?: number;
  total_distance_km?: number;
  telemetryMode?: TelemetryProvenance;
  telemetry_mode?: TelemetryProvenance;
  displayName?: string;
  routeId?: string;
  routeName?: string;
  routeCode?: string;
  operator?: string;
  status: BusStatus | string;
  operationalStatus?: OperationalStatus;
  currentPosition?: GeoPoint;
  currentLocation?: GeoPoint | null;
  telemetryStatus?: 'available' | 'unavailable' | 'stale' | 'demo';
  heading?: number; // degrees 0-360
  speed?: number; // km/h
  lastSeen?: string;
  edgeDeviceId?: string;
  edgeDeviceStatus?: EdgeDeviceStatus;
  cameraStatus?: string;
  gpsStatus?: string;
  edgeAiStatus?: string;
  cameras?: VehicleCamera[];
  cameraCount?: number;
  totalDetections?: number;
  detectionsToday?: number;
  distanceTodayKm?: number;
  uptime?: number; // percentage 0-100
}

export type BusStatus = 'active' | 'idle' | 'maintenance' | 'offline';

export type EdgeDeviceStatus = 'online' | 'processing' | 'syncing' | 'offline' | 'error';

export interface BusTelemetry {
  busId: string;
  timestamp: string;
  position: GeoPoint;
  speed: number;
  heading: number;
  cameraStatus: 'active' | 'inactive' | 'error';
  edgeLoad: number; // percentage
  bufferSize: number; // pending events
  networkStatus: 'connected' | 'limited' | 'offline';
  signalStrength?: number; // 0-100
}
