// ============================================================
// MUIN Utility Functions
// ============================================================

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind classes with conflict resolution */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a date string to human-readable relative time */
export function timeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/** Format a date string */
export function formatDate(dateString: string, format: 'short' | 'medium' | 'long' = 'medium'): string {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    short: { day: 'numeric', month: 'short' },
    medium: { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' },
    long: { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' },
  }[format];
  return date.toLocaleDateString('en-IN', options);
}

/** Format a number with locale-appropriate separators */
export function formatNumber(value: number, decimals = 0): string {
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Format a percentage */
export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/** Format GPS coordinates */
export function formatCoords(lat: number, lng: number, decimals = 4): string {
  return `${lat.toFixed(decimals)}°N, ${lng.toFixed(decimals)}°E`;
}

/** Generate a display ID from type and number */
export function generateDisplayId(type: string, num: number): string {
  const prefix = type.slice(0, 3).toUpperCase();
  return `${prefix}-${num.toString().padStart(4, '0')}`;
}

/** Clamp a value between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Get health score color class based on value */
export function getHealthColor(score: number): string {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 60) return 'text-yellow-400';
  if (score >= 40) return 'text-orange-400';
  return 'text-red-400';
}

/** Get health score background class based on value */
export function getHealthBg(score: number): string {
  if (score >= 80) return 'bg-emerald-500/12';
  if (score >= 60) return 'bg-yellow-500/12';
  if (score >= 40) return 'bg-orange-500/12';
  return 'bg-red-500/12';
}

/** Delay utility for simulating API calls */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Safely extracts valid [latitude, longitude] from any entity (UrbanIssue, Bus, Waypoint, etc.)
 * or returns null if missing, undefined, NaN, or invalid.
 * Validates that latitude is within [-90, 90] and longitude within [-180, 180].
 * NEVER returns [0, 0] or silently substitutes invalid data with fake coordinates.
 */
export function getValidLatLng(item: any): [number, number] | null {
  if (!item || typeof item !== 'object') return null;

  let lat: any;
  let lng: any;

  // 1. Array format: [lat, lng]
  if (Array.isArray(item)) {
    if (item.length >= 2) {
      lat = item[0];
      lng = item[1];
    }
  } else {
    // 2. Direct properties: item.lat, item.latitude
    if (item.lat !== undefined) lat = item.lat;
    else if (item.latitude !== undefined) lat = item.latitude;

    if (item.lng !== undefined) lng = item.lng;
    else if (item.longitude !== undefined) lng = item.longitude;

    // 3. Nested location object: item.location
    if ((lat === undefined || lng === undefined) && item.location) {
      const loc = item.location;
      if (typeof loc === 'object' && loc !== null) {
        if (loc.gps && typeof loc.gps === 'object') {
          lat = loc.gps.lat ?? loc.gps.latitude;
          lng = loc.gps.lng ?? loc.gps.longitude;
        } else if (loc.snappedGps && typeof loc.snappedGps === 'object') {
          lat = loc.snappedGps.lat ?? loc.snappedGps.latitude;
          lng = loc.snappedGps.lng ?? loc.snappedGps.longitude;
        } else if (Array.isArray(loc.coordinates) && loc.coordinates.length >= 2) {
          // GeoJSON Point: coordinates: [lng, lat]
          lng = loc.coordinates[0];
          lat = loc.coordinates[1];
        } else {
          lat = loc.lat ?? loc.latitude;
          lng = loc.lng ?? loc.longitude;
        }
      }
    }

    // 4. Current position / telemetry (buses): item.currentPosition or item.position
    if ((lat === undefined || lng === undefined) && (item.currentPosition || item.position)) {
      const pos = item.currentPosition || item.position;
      if (typeof pos === 'object' && pos !== null) {
        lat = pos.lat ?? pos.latitude;
        lng = pos.lng ?? pos.longitude;
      }
    }

    // 5. Raw GeoJSON geometry: item.geometry
    if ((lat === undefined || lng === undefined) && item.geometry) {
      const geom = item.geometry;
      if (geom && Array.isArray(geom.coordinates) && geom.coordinates.length >= 2) {
        lng = geom.coordinates[0];
        lat = geom.coordinates[1];
      }
    }
  }

  // Convert to numbers
  const numLat = typeof lat === 'string' ? parseFloat(lat) : Number(lat);
  const numLng = typeof lng === 'string' ? parseFloat(lng) : Number(lng);

  // Validate numbers: must be finite, valid numbers within range, and not (0, 0)
  if (
    typeof numLat !== 'number' || 
    typeof numLng !== 'number' || 
    isNaN(numLat) || 
    isNaN(numLng) ||
    !isFinite(numLat) ||
    !isFinite(numLng) ||
    numLat < -90 || numLat > 90 ||
    numLng < -180 || numLng > 180 ||
    (Math.abs(numLat) < 0.0001 && Math.abs(numLng) < 0.0001) // Disallow Null Island (0, 0)
  ) {
    return null;
  }

  return [numLat, numLng];
}

