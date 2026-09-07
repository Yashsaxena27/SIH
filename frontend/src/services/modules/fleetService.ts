import { config } from '../core/config';
import { client } from '../core/client';
import { mockBuses } from '../mock/buses';
import { mockRoutes } from '../mock/routes';
import type { Bus, Route, FleetSummary, InspectionSession } from '@/types';

const delay = (ms: number = 100) => new Promise(resolve => setTimeout(resolve, ms));

export const fleetService = {
  async getBuses(): Promise<Bus[]> {
    if (config.useMockData) return delay().then(() => [...mockBuses]);
    return client.get<Bus[]>('/fleet/buses');
  },

  async getBus(id: string): Promise<Bus | undefined> {
    if (config.useMockData) return delay().then(() => mockBuses.find(b => b.id === id));
    return client.get<Bus>(`/fleet/buses/${id}`);
  },

  async getSummary(): Promise<FleetSummary> {
    if (config.useMockData) {
      await delay();
      return {
        total_vehicles: mockBuses.length,
        active_vehicles: mockBuses.filter(b => b.status === 'active').length,
        vehicle_breakdown: {
          public_buses: mockBuses.length,
          pwd_inspection_vehicles: 0,
          municipal_service_trucks: 0,
        },
        total_cameras: mockBuses.length,
        active_cameras: mockBuses.length,
        calibrated_cameras: mockBuses.length,
        total_survey_km: 12450.0,
        sessions: {
          total_count: 5,
          active_count: 1,
          provenance_breakdown: { LIVE: 0, REPLAY: 3, SIMULATED: 2, ESTIMATED: 0 },
        },
        coverage: {
          total_corridors: 28,
          sensed_corridors: 20,
          coverage_gaps: 8,
          coverage_rate_pct: 71.4,
        },
      };
    }
    return client.get<FleetSummary>('/fleet/summary');
  },

  async getSessions(params?: { limit?: number; vehicleId?: string; provenance?: string }): Promise<InspectionSession[]> {
    if (config.useMockData) {
      await delay();
      return [];
    }
    const queryParams: Record<string, string> = {};
    if (params?.limit) queryParams.limit = params.limit.toString();
    if (params?.vehicleId) queryParams.vehicle_id = params.vehicleId;
    if (params?.provenance) queryParams.provenance = params.provenance;
    return client.get<InspectionSession[]>('/fleet/sessions', queryParams);
  },

  async startSession(payload: { vehicle_id: string; camera_id?: string; route_id?: string; telemetry_provenance?: string }): Promise<any> {
    if (config.useMockData) {
      await delay();
      return { id: 'mock_sess_1', status: 'active', ...payload };
    }
    return client.post('/fleet/sessions/start', payload);
  },

  async endSession(sessionId: string, payload: { distance_km: number; frames_analyzed: number; detections_count: number; potholes_detected: number; road_segments_covered?: string[] }): Promise<any> {
    if (config.useMockData) {
      await delay();
      return { id: sessionId, status: 'completed' };
    }
    return client.post(`/fleet/sessions/${sessionId}/end`, payload);
  },

  async getCoverage(): Promise<any> {
    if (config.useMockData) {
      await delay();
      return {
        total_corridors: 28,
        actively_covered_corridors: 20,
        coverage_gap_corridors: 8,
        coverage_percentage: 71.4,
        gap_threshold_days: 7,
        corridors: [],
      };
    }
    return client.get('/fleet/coverage');
  },
};

export const routeService = {
  async getRoutes(): Promise<Route[]> {
    if (config.useMockData) return delay().then(() => [...mockRoutes]);
    return client.get<Route[]>('/fleet/routes');
  }
};
