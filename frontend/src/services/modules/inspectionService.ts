import { client } from '../core/client';

export interface InspectionEvent {
  event_id: string;
  bus_id: string;
  timestamp: string;
  location: {
    lat: number;
    lng: number;
  };
  detection_type: string;
  confidence: number;
  severity: string;
  evidence_url: string;
  frame_idx?: number;
  issue_id?: string;
  issue_status?: string;
  issue_priority?: string;
  inspection_id?: string;
  route_id?: string;
  route_name?: string;
  location_source?: string;
  location_confidence?: string;
}

export interface VideoMetadata {
  filename: string;
  duration: number;
  fps: number;
  resolution: string;
  total_frames: number;
  sampled_frames: number;
}

export interface InspectionStatistics {
  total_frames: number;
  sampled_frames: number;
  raw_detections: number;
  filtered_detections: number;
  tracks: number;
  emitted_events: number;
  processing_time: number;
}

export interface InspectionJob {
  inspection_id: string;
  filename: string;
  bus_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  stage: 'upload' | 'sampling' | 'inference' | 'tracking' | 'severity' | 'gps' | 'ingestion' | 'complete' | 'error';
  progress: number;
  video_metadata: VideoMetadata | null;
  statistics: InspectionStatistics | null;
  events: InspectionEvent[];
  annotated_video_url: string | null;
  error: string | null;
  created_at: number;
}

export interface LibraryVideo {
  filename: string;
  rel_path: string;
  video_url: string;
  size_bytes: number;
  duration: number;
  fps: number;
  resolution: string;
  width: number;
  height: number;
  total_frames: number;
  default_bus_id: string;
  default_route_id: string;
  default_route_name: string;
  default_start_lat: number;
  default_start_lng: number;
  default_end_lat: number;
  default_end_lng: number;
  description: string;
  status_label: string;
}

export interface RunLibraryInspectionPayload {
  video_filename: string;
  bus_id?: string;
  sample_fps?: number;
  conf_threshold?: number;
  stability_frames?: number;
  generate_annotated?: boolean;
  route_id?: string;
  route_name?: string;
  start_lat?: number;
  start_lng?: number;
  end_lat?: number;
  end_lng?: number;
  capture_started_at?: string;
}

export const inspectionService = {
  async getLibraryVideos(): Promise<LibraryVideo[]> {
    return client.get<LibraryVideo[]>('/inspection/videos');
  },

  async runLibraryInspection(payload: RunLibraryInspectionPayload): Promise<{ inspection_id: string; status: string; message: string }> {
    return client.post<{ inspection_id: string; status: string; message: string }>(
      '/inspection/library',
      payload
    );
  },

  async uploadVideo(
    file: File,
    busId: string = 'BUS-001',
    sampleFps: number = 1,
    confThreshold: number = 0.10,
    stabilityFrames: number = 1,
    generateAnnotated: boolean = true
    ,routeId: string = 'DEL-NCR-01',
    routeName: string = 'Delhi - Noida Corridor',
    startLat: number = 28.6139,
    startLng: number = 77.2090,
    endLat: number = 28.5355,
    endLng: number = 77.3910,
    captureStartedAt: string = ''
  ): Promise<{ inspection_id: string; status: string; message: string }> {
    const formData = new FormData();
    formData.append('video', file);
    formData.append('bus_id', busId);
    formData.append('sample_fps', sampleFps.toString());
    formData.append('conf_threshold', confThreshold.toString());
    formData.append('stability_frames', stabilityFrames.toString());
    formData.append('generate_annotated', generateAnnotated ? 'true' : 'false');
    formData.append('route_id', routeId);
    formData.append('route_name', routeName);
    formData.append('start_lat', startLat.toString());
    formData.append('start_lng', startLng.toString());
    formData.append('end_lat', endLat.toString());
    formData.append('end_lng', endLng.toString());
    formData.append('capture_started_at', captureStartedAt);

    return client.postForm<{ inspection_id: string; status: string; message: string }>(
      '/inspection/video',
      formData
    );
  },

  async getInspectionStatus(inspectionId: string): Promise<InspectionJob> {
    return client.get<InspectionJob>(`/inspection/${inspectionId}`);
  },

  async listRecentInspections(): Promise<InspectionJob[]> {
    return client.get<InspectionJob[]>('/inspection');
  }
};
