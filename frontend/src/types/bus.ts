// ============================================================
// Bus — Fleet entity representing a physical public bus
// ============================================================

import type { GeoPoint, OperationalStatus } from './common';

export interface Bus {
  id: string;
  registrationNumber: string;
  displayName: string;
  routeId: string;
  status: BusStatus;
  operationalStatus: OperationalStatus;
  currentPosition?: GeoPoint;
  heading?: number; // degrees 0-360
  speed?: number; // km/h
  lastSeen: string;
  edgeDeviceId: string;
  edgeDeviceStatus: EdgeDeviceStatus;
  totalDetections: number;
  detectionsToday: number;
  distanceTodayKm: number;
  uptime: number; // percentage 0-100
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
