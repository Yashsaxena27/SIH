import { config } from '../core/config';
import { client } from '../core/client';
import { mockRoadSegments, mockRoadHealthSummary, mockRoadHealthHistory } from '../mock/roads';
import { mockDepartments } from '../mock/departments';
import { mockSystemHealth, mockAlerts, mockSystemMetrics, mockActivityFeed } from '../mock/system';
import { mockDetections, mockDetectionSummary } from '../mock/detections';
import type { 
  RoadSegment, RoadHealthSummary, RoadHealth, Department,
  SystemHealth, Alert, SystemMetric, ActivityEvent,
  Detection, DetectionSummary,
  AnalyticsSummary, AnalyticsIssues, AnalyticsTrends,
  AnalyticsTickets, AnalyticsVerifications, AnalyticsAuthorities,
  AnalyticsRoadHealth
} from '@/types';

const delay = (ms: number = 100) => new Promise(resolve => setTimeout(resolve, ms));

export const analyticsService = {
  // Phase 15 Database-Derived Analytics
  async getAnalyticsSummary(): Promise<AnalyticsSummary> {
    return client.get<AnalyticsSummary>('/analytics/summary');
  },
  async getAnalyticsIssues(): Promise<AnalyticsIssues> {
    return client.get<AnalyticsIssues>('/analytics/issues');
  },
  async getAnalyticsTrends(): Promise<AnalyticsTrends> {
    return client.get<AnalyticsTrends>('/analytics/trends');
  },
  async getAnalyticsTickets(): Promise<AnalyticsTickets> {
    return client.get<AnalyticsTickets>('/analytics/tickets');
  },
  async getAnalyticsVerifications(): Promise<AnalyticsVerifications> {
    return client.get<AnalyticsVerifications>('/analytics/verifications');
  },
  async getAnalyticsAuthorities(): Promise<AnalyticsAuthorities> {
    return client.get<AnalyticsAuthorities>('/analytics/authorities');
  },
  async getAnalyticsRoadHealth(): Promise<AnalyticsRoadHealth> {
    return client.get<AnalyticsRoadHealth>('/analytics/road-health');
  },

  // Road Health
  async getRoadSegments(): Promise<RoadSegment[]> {
    if (config.useMockData) return delay().then(() => [...mockRoadSegments]);
    return client.get<RoadSegment[]>('/analytics/road-segments');
  },
  async getRoadHealthSummary(): Promise<RoadHealthSummary> {
    if (config.useMockData) return delay().then(() => mockRoadHealthSummary);
    return client.get<RoadHealthSummary>('/analytics/roads/summary');
  },
  async getRoadHealthHistory(segmentId?: string): Promise<RoadHealth[]> {
    if (config.useMockData) return delay().then(() => [...mockRoadHealthHistory]);
    return client.get<RoadHealth[]>('/analytics/roads/history', segmentId ? { segmentId } : undefined);
  },
  async getHotspots(): Promise<any[]> {
    if (config.useMockData) return delay().then(() => []);
    return client.get<any[]>('/analytics/hotspots');
  },

  // Departments
  async getDepartments(): Promise<Department[]> {
    if (config.useMockData) return delay().then(() => [...mockDepartments]);
    return client.get<Department[]>('/departments');
  },

  // System Health
  async getSystemHealth(): Promise<SystemHealth> {
    if (config.useMockData) return delay().then(() => mockSystemHealth);
    return client.get<SystemHealth>('/system/health');
  },
  async getAlerts(): Promise<Alert[]> {
    if (config.useMockData) return delay().then(() => [...mockAlerts]);
    return client.get<Alert[]>('/system/alerts');
  },
  async getSystemMetrics(): Promise<SystemMetric[]> {
    if (config.useMockData) return delay().then(() => [...mockSystemMetrics]);
    return client.get<SystemMetric[]>('/system/metrics');
  },
  async getActivityFeed(): Promise<ActivityEvent[]> {
    if (config.useMockData) return delay().then(() => [...mockActivityFeed]);
    return client.get<ActivityEvent[]>('/system/activity');
  }
};

export const detectionService = {
  async getDetections(limit?: number): Promise<Detection[]> {
    if (config.useMockData) {
      await delay();
      return limit ? mockDetections.slice(0, limit) : [...mockDetections];
    }
    return client.get<Detection[]>('/detections', limit ? { limit: limit.toString() } : undefined);
  },
  async getDetectionSummary(): Promise<DetectionSummary> {
    if (config.useMockData) return delay().then(() => mockDetectionSummary);
    return client.get<DetectionSummary>('/detections/summary');
  }
};
