// ============================================================
// Common / Shared Types
// ============================================================

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface GeoBox {
  northEast: GeoPoint;
  southWest: GeoPoint;
}

export interface TimeRange {
  start: string; // ISO 8601
  end: string;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  data: T;
  pagination?: Pagination;
  meta?: Record<string, unknown>;
}

export type Severity = 'critical' | 'high' | 'medium' | 'low';

export type OperationalStatus =
  | 'live'
  | 'monitoring'
  | 'processing'
  | 'offline'
  | 'syncing'
  | 'error';

export type IssueStatus =
  | 'open'
  | 'confirmed'
  | 'assigned'
  | 'in_progress'
  | 'repair_reported'
  | 'verifying'
  | 'verified'
  | 'reopened'
  | 'closed';

export type TicketPriority = 'critical' | 'high' | 'medium' | 'low';

export interface EvidenceImage {
  id: string;
  url: string;
  thumbnailUrl: string;
  capturedAt: string;
  busId: string;
  gps: GeoPoint;
}

export interface ActivityEvent {
  id: string;
  type: 'detection' | 'issue_created' | 'ticket_assigned' | 'status_change' | 'verification' | 'alert' | 'system';
  title: string;
  description: string;
  timestamp: string;
  severity?: Severity;
  relatedEntityId?: string;
  relatedEntityType?: 'issue' | 'ticket' | 'bus' | 'route';
}
