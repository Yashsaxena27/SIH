// @ts-nocheck
import type { SystemHealth, Alert, SystemMetric } from '@/types/system';
import type { ActivityEvent } from '@/types/common';
import { generateDate } from './generators';

export const mockSystemHealth: SystemHealth = {
  status: 'operational',
  components: [
    { name: 'Edge Processing API', status: 'operational', uptime: 99.9, latency: 45 },
    { name: 'Core Database', status: 'operational', uptime: 99.99, latency: 12 },
    { name: 'Video Storage Array', status: 'degraded', uptime: 98.5, latency: 250 },
    { name: 'Bus Telemetry Stream', status: 'operational', uptime: 99.95, latency: 25 }
  ],
  lastUpdated: new Date().toISOString()
};

export const mockAlerts: Alert[] = [
  { id: 'al-1', type: 'system', severity: 'warning', message: 'Video Storage Array approaching capacity (85%)', timestamp: generateDate(0.1), isRead: false },
  { id: 'al-2', type: 'bus', severity: 'critical', message: 'Bus DL-1P-2468 camera feed offline for > 2 hours', timestamp: generateDate(0.2), isRead: false },
  { id: 'al-3', type: 'sla', severity: 'high', message: '12 tickets assigned to PWD approaching SLA breach in next 24h', timestamp: generateDate(0.5), isRead: true },
  { id: 'al-4', type: 'anomaly', severity: 'medium', message: 'Unusual spike in pothole detections on Outer Ring Road', timestamp: generateDate(1), isRead: true },
  { id: 'al-5', type: 'system', severity: 'info', message: 'Nightly model retrain completed successfully', timestamp: generateDate(1.5), isRead: true },
  { id: 'al-6', type: 'bus', severity: 'warning', message: '3 buses reporting degraded GPS accuracy', timestamp: generateDate(2), isRead: true },
  { id: 'al-7', type: 'anomaly', severity: 'high', message: 'Cluster of critical severity issues detected near ITO', timestamp: generateDate(3), isRead: true },
  { id: 'al-8', type: 'system', severity: 'info', message: 'System updated to v2.1.4', timestamp: generateDate(5), isRead: true }
];

export const mockSystemMetrics: SystemMetric[] = [
  { id: 'm-1', name: 'Frames Processed', value: 1245000, unit: 'frames/day', trend: 5.2 },
  { id: 'm-2', name: 'Avg Inference Time', value: 42, unit: 'ms', trend: -2.1 },
  { id: 'm-3', name: 'Active Edge Nodes', value: 145, unit: 'nodes', trend: 0 },
  { id: 'm-4', name: 'Data Ingest Rate', value: 1.2, unit: 'GB/hr', trend: 8.5 },
  { id: 'm-5', name: 'False Positive Rate', value: 4.2, unit: '%', trend: -1.5 },
  { id: 'm-6', name: 'Auto-ticket Generation', value: 92, unit: '%', trend: 3.4 }
];

export const mockActivityFeed: ActivityEvent[] = Array.from({ length: 20 }).map((_, i) => {
  const types: Array<ActivityEvent['type']> = ['detection', 'issue_created', 'ticket_updated', 'verification', 'system'];
  return {
    id: `act-${i + 1}`,
    type: types[i % types.length],
    title: "Event", description: `System activity ${i + 1} occurred on sector ${Math.floor(Math.random() * 5) + 1}`,
    timestamp: generateDate(i * 0.1),
    actor: i % 3 === 0 ? 'User' : 'System',
    metadata: {}
  };
});
