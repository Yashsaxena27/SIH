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
