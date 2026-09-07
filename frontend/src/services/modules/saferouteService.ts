import { config } from '../core/config';
import { client } from '../core/client';
import type { RoutePreset, RoutePlanRequest, SafeRouteResponse, RouteSegmentProfile } from '@/types/saferoute';

const delay = (ms: number = 80) => new Promise(resolve => setTimeout(resolve, ms));

export const saferouteService = {
  async getPresets(): Promise<RoutePreset[]> {
    if (config.useMockData) {
      await delay();
      return [
        {
          id: 'delhi_cp_noida',
          name: 'Delhi PWD Center → Noida Sector 62',
          corridor_set: 'delhi_ncr',
          origin: 'Connaught Place / PWD Delhi HQ',
          destination: 'Noida Sector 62 Tech Hub',
          origin_coords: { lat: 28.6139, lng: 77.2090 },
          destination_coords: { lat: 28.5355, lng: 77.3910 },
          description: 'Showcases high-defect direct corridor vs. smooth Barapullah bypass & NH24 outer expressway.',
        },
        {
          id: 'delhi_ashram_mayurvihar',
          name: 'Ring Road Ashram → Mayur Vihar',
          corridor_set: 'delhi_ncr',
          origin: 'Ashram Chowk Arterial',
          destination: 'Mayur Vihar Phase 1',
          origin_coords: { lat: 28.5680, lng: 77.2600 },
          destination_coords: { lat: 28.6000, lng: 77.2900 },
          description: 'Evaluates arterial connector health and elevated corridor bypass alternatives.',
        }
      ];
    }
    return client.get<RoutePreset[]>('/saferoute/presets');
  },

  async planRoute(request: RoutePlanRequest): Promise<SafeRouteResponse> {
    if (config.useMockData) {
      await delay();
      return {
        origin: request.origin,
        destination: request.destination,
        mode: request.mode,
        recommended_route_id: 'cand_nh24_outer',
        recommendation_reason: `Recommended by SafeRoute (${request.mode}): Optimal Pareto balance while achieving LOW risk score.`,
        candidates: [],
        candidate_count: 0,
        data_freshness: 'ESTIMATED_ROAD_GRAPH',
        timing_provenance: 'ESTIMATED (Calculated from road hierarchy design speeds; not live traffic)',
        computed_at: new Date().toISOString(),
      };
    }
    return client.post<SafeRouteResponse>('/saferoute/plan', request);
  },

  async getCorridors(): Promise<RouteSegmentProfile[]> {
    if (config.useMockData) {
      await delay();
      return [];
    }
    return client.get<RouteSegmentProfile[]>('/saferoute/corridors');
  },
};
