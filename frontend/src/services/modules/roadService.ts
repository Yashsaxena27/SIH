import { config } from '../core/config';
import { client } from '../core/client';
import { mockRoadSegments } from '../mock/roads';
import type { RoadSegment, RoadIssueSummary, OperationalRoadHealth } from '@/types/road';

const delay = (ms: number = 80) => new Promise(resolve => setTimeout(resolve, ms));

export interface RoadsResponse {
  items: RoadSegment[];
  total: number;
  skip?: number;
  limit?: number;
}

export interface RoadIssuesResponse {
  segmentId: string;
  roadName: string;
  total: number;
  items: RoadIssueSummary[];
}

export const roadService = {
  async getRoads(params?: { authorityId?: string; riskState?: string; skip?: number; limit?: number }): Promise<RoadsResponse> {
    if (config.useMockData) {
      await delay();
      return {
        items: mockRoadSegments,
        total: mockRoadSegments.length,
        skip: params?.skip || 0,
        limit: params?.limit || mockRoadSegments.length,
      };
    }
    const queryParams: Record<string, string> = {};
    if (params?.authorityId) queryParams.authority_id = params.authorityId;
    if (params?.riskState) queryParams.risk_state = params.riskState;
    if (params?.skip != null) queryParams.skip = params.skip.toString();
    if (params?.limit != null) queryParams.limit = params.limit.toString();
    return client.get<RoadsResponse>('/roads', queryParams);
  },

  async getRoad(id: string): Promise<RoadSegment> {
    if (config.useMockData) {
      await delay();
      const found = mockRoadSegments.find(r => r.id === id);
      if (found) return found;
      return mockRoadSegments[0];
    }
    return client.get<RoadSegment>(`/roads/${encodeURIComponent(id)}`);
  },

  async getRoadHealth(id: string): Promise<{ segmentId: string; health: OperationalRoadHealth }> {
    if (config.useMockData) {
      await delay();
      return {
        segmentId: id,
        health: {
          metricLabel: 'Operational Road Health',
          score: 85,
          healthScore: 85,
          riskState: 'WATCH',
          explanation: 'Road corridor operational health under continuous fleet monitoring.',
          factors: {
            activeIssueCount: 2,
            criticalCount: 0,
            highCount: 1,
            mediumCount: 1,
            lowCount: 0,
            corroboratedCount: 1,
            unresolvedVerificationCount: 0,
            openTicketCount: 1,
            overdueTicketCount: 0,
            observationVolume: 42,
            distinctLocations: 2,
            averageOperationalPriority: 'MEDIUM',
            severityDeduction: 10,
            corroborationDeduction: 5,
            verificationDeduction: 0,
            ticketDeduction: 0,
            totalDeduction: 15,
          }
        }
      };
    }
    return client.get<{ segmentId: string; health: OperationalRoadHealth }>(`/roads/${encodeURIComponent(id)}/health`);
  },

  async getRoadIssues(id: string, params?: { status?: string; limit?: number }): Promise<RoadIssuesResponse> {
    if (config.useMockData) {
      await delay();
      return {
        segmentId: id,
        roadName: 'Demo Corridor',
        total: 0,
        items: [],
      };
    }
    const queryParams: Record<string, string> = {};
    if (params?.status) queryParams.status = params.status;
    if (params?.limit != null) queryParams.limit = params.limit.toString();
    return client.get<RoadIssuesResponse>(`/roads/${encodeURIComponent(id)}/issues`, queryParams);
  }
};
