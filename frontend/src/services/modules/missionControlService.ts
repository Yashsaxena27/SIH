import { config } from '../core/config';
import { client } from '../core/client';
import type { MissionControlOverview, ActionQueueItem } from '@/types/mission_control';

const delay = (ms: number = 80) => new Promise(resolve => setTimeout(resolve, ms));

export const missionControlService = {
  async getOverview(): Promise<MissionControlOverview> {
    if (config.useMockData) {
      await delay();
      return {
        network_kpis: {
          operational_road_health_index: 88.5,
          total_active_defects: 12,
          critical_defects: 2,
          high_defects: 4,
          corroborated_defects: 5,
          total_segments: 28,
          critical_segments: 1,
          watch_segments: 3,
          open_tickets: 6,
          overdue_tickets: 1,
          total_verifications: 24,
          resolved_verifications: 18,
          unresolved_verifications: 4,
          inconclusive_verifications: 2,
          verification_resolution_rate: 75.0,
          active_sensing_vehicles: 8,
          total_vehicles: 12,
          active_cameras: 10,
          total_survey_km: 14500.0,
          corridor_coverage_percentage: 71.4,
          coverage_gap_corridors: 8,
        },
        action_queue: [
          {
            id: 'mock_act_1',
            type: 'URGENT_DEFECT',
            priority: 'P1_CRITICAL',
            title: 'Critical Pothole Cluster #iss_del_01',
            subtitle: 'Detected with 4 observations across 2 independent vehicles',
            target_id: 'iss_del_01',
            action_type: 'CREATE_WORK_ORDER',
            action_label: 'Create Work Order',
            action_url: '/issues/iss_del_01',
            created_at: new Date().toISOString(),
          }
        ],
        action_queue_count: 1,
        system_status: {
          spatial_database: 'HEALTHY (PostgreSQL 15 + PostGIS 3.3)',
          edge_model: 'OPERATIONAL (YOLOv8 Single-Class best.pt)',
          caching_engine: 'ACTIVE (Process-level model cache + Redis 7)',
          telemetry_disclosure: 'HONEST_ATTRIBUTION (Simulated/Replay strictly tagged)',
          spatial_locking: 'ADVISORY_LOCKED (Transactional PostGIS concurrency control)',
        },
        computed_at: new Date().toISOString(),
      };
    }
    return client.get<MissionControlOverview>('/mission-control/overview');
  },

  async getActionQueue(priority?: string): Promise<{ action_queue: ActionQueueItem[]; total_items: number }> {
    if (config.useMockData) {
      await delay();
      return { action_queue: [], total_items: 0 };
    }
    const queryParams: Record<string, string> = {};
    if (priority) queryParams.priority = priority;
    return client.get<{ action_queue: ActionQueueItem[]; total_items: number }>('/mission-control/action-queue', queryParams);
  },

  async executeAction(payload: { action_id: string; action_type: string; target_id: string; operator_notes?: string }): Promise<any> {
    if (config.useMockData) {
      await delay();
      return { status: 'acknowledged', ...payload };
    }
    return client.post('/mission-control/execute-action', payload);
  }
};
