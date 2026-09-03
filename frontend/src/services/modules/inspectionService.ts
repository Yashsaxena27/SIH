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

export const inspectionService = {
  async uploadVideo(
    file: File,
    busId: string = 'BUS-001',
    sampleFps: number = 1,
    confThreshold: number = 0.10,
    stabilityFrames: number = 1,
    generateAnnotated: boolean = true
  ): Promise<{ inspection_id: string; status: string; message: string }> {
    const formData = new FormData();
    formData.append('video', file);
    formData.append('bus_id', busId);
    formData.append('sample_fps', sampleFps.toString());
    formData.append('conf_threshold', confThreshold.toString());
    formData.append('stability_frames', stabilityFrames.toString());
    formData.append('generate_annotated', generateAnnotated ? 'true' : 'false');

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
