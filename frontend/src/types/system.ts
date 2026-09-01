// ============================================================
// System — Platform metrics and operational status
// ============================================================

import type { OperationalStatus } from './common';

export interface SystemMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  change?: number; // percentage change
  changeDirection?: 'up' | 'down' | 'stable';
  status: OperationalStatus;
  lastUpdated: string;
}

export interface SystemHealth {
  overallStatus: OperationalStatus;
  activeBuses: number;
  totalBuses: number;
  activeRoutes: number;
  totalRoutes: number;
  edgeDevicesOnline: number;
  edgeDevicesTotal: number;
  apiLatencyMs: number;
  detectionsPastHour: number;
  eventsInQueue: number;
  lastSync: string;
  uptime: number; // percentage
  cpuUsage?: number;
  memoryUsage?: number;
  storageUsage?: number;
}

export interface Alert {
  id: string;
  type: AlertType;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  relatedEntityId?: string;
  relatedEntityType?: string;
  autoResolve: boolean;
  resolvedAt?: string;
}

export type AlertType =
  | 'bus_offline'
  | 'edge_device_error'
  | 'detection_anomaly'
  | 'sla_breach'
  | 'critical_issue'
  | 'sync_failure'
  | 'system_health'
  | 'verification_needed';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  departmentId?: string;
  avatar?: string;
  lastActive: string;
}

export type UserRole = 'admin' | 'operator' | 'officer' | 'viewer';
