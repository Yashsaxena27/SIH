// ============================================================
// Mission Control — Operational Command Console Types
// ============================================================

export type ActionPriority = 'P1_CRITICAL' | 'P2_HIGH' | 'P3_MEDIUM';

export type ActionType = 
  | 'CREATE_WORK_ORDER' 
  | 'ESCALATE_TICKET' 
  | 'TRIGGER_REINSPECTION' 
  | 'DISPATCH_SURVEY' 
  | 'PLAN_SAFEROUTE';

export interface ActionQueueItem {
  id: string;
  type: 'URGENT_DEFECT' | 'OVERDUE_TICKET' | 'FAILED_VERIFICATION' | 'COVERAGE_GAP';
  priority: ActionPriority;
  title: string;
  subtitle: string;
  target_id: string;
  action_type: ActionType;
  action_label: string;
  action_url: string;
  corridor_id?: string | null;
  created_at: string;
}

export interface NetworkKPIs {
  operational_road_health_index: number;
  total_active_defects: number;
  critical_defects: number;
  high_defects: number;
  corroborated_defects: number;
  total_segments: number;
  critical_segments: number;
  watch_segments: number;
  open_tickets: number;
  overdue_tickets: number;
  total_verifications: number;
  resolved_verifications: number;
  unresolved_verifications: number;
  inconclusive_verifications: number;
  verification_resolution_rate: number;
  active_sensing_vehicles: number;
  total_vehicles: number;
  active_cameras: number;
  total_survey_km: number;
  corridor_coverage_percentage: number;
  coverage_gap_corridors: number;
}

export interface SystemStatus {
  spatial_database: string;
  edge_model: string;
  caching_engine: string;
  telemetry_disclosure: string;
  spatial_locking: string;
}

export interface MissionControlOverview {
  network_kpis: NetworkKPIs;
  action_queue: ActionQueueItem[];
  action_queue_count: number;
  system_status: SystemStatus;
  computed_at: string;
}
