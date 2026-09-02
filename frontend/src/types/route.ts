// ============================================================
// Route — Bus route definitions
// ============================================================

import type { GeoPoint } from './common';

export interface Route {
  id: string;
  name: string;
  displayCode: string; // e.g. "R-17A"
  departurePoint: string;
  arrivalPoint: string;
  waypoints: GeoPoint[];
  lengthKm: number;
  activeBuses: number;
  totalBuses: number;
  coveragePercent: number; // how much of the route has been observed today
  averageDailyPasses: number;
  lastObservedAt: string;
  issueCount: number;
  healthScore: number; // 0-100
}

export interface RouteSegment {
  id: string;
  routeId: string;
  startPoint: GeoPoint;
  endPoint: GeoPoint;
  lengthKm: number;
  healthScore: number;
  defectCount: number;
  lastInspected: string;
}
