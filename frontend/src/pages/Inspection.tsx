// ============================================================
// AI Road Inspection Page — Command Center Real-Video Inspection
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  UploadCloud, Play, CheckCircle2, AlertTriangle, 
  MapPin, Bus as BusIcon, Cpu, Eye, Video, FileVideo, 
  RefreshCw, Layers, Check, ArrowRight, Sparkles,
  ShieldCheck, Activity, Film, X, ExternalLink, Sliders,
  FolderArchive, History, Clock, Map as MapIcon, ListFilter
} from 'lucide-react';
import { PageHeader, GlassPanel, SeverityBadge } from '@/components/ui';
import { IntelligenceMap } from '@/components/ui/IntelligenceMap';
import { api } from '@/services/api';
import { config } from '@/services/core/config';
import { cn } from '@/lib/utils';
import type { Bus as BusType, UrbanIssue } from '@/types';
import type { InspectionJob, InspectionEvent, LibraryVideo } from '@/services/modules/inspectionService';

// Pipeline steps for progress visualization
const PIPELINE_STEPS = [
  { key: 'upload', stepNo: '01', label: 'Video Ingestion', desc: 'Ingest footage', icon: UploadCloud },
  { key: 'sampling', stepNo: '02', label: 'Frame Extraction', desc: 'Downsample FPS', icon: FileVideo },
  { key: 'inference', stepNo: '03', label: 'YOLO Road-Defect AI', desc: 'Neural inference', icon: Cpu },
  { key: 'tracking', stepNo: '04', label: 'Centroid Tracker', desc: 'IoU trajectories', icon: Layers },
  { key: 'severity', stepNo: '05', label: 'Severity & Evidence', desc: 'Area calc & crop', icon: Eye },
  { key: 'gps', stepNo: '06', label: 'GPS Telemetry Fusion', desc: 'Route telemetry', icon: MapPin },
  { key: 'ingestion', stepNo: '07', label: 'PostGIS & Tickets', desc: 'Auto-register', icon: CheckCircle2 },
];

export function InspectionPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Ingestion Source Mode: 'library' (Verified catalog) vs 'upload' (Custom local file)
  const [inputMode, setInputMode] = useState<'library' | 'upload'>('library');

  // Video Library State
  const [libraryVideos, setLibraryVideos] = useState<LibraryVideo[]>([]);
  const [selectedLibraryVideo, setSelectedLibraryVideo] = useState<LibraryVideo | null>(null);
  const [isLoadingVideos, setIsLoadingVideos] = useState<boolean>(false);

  // Form State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [busId, setBusId] = useState<string>('BUS-001');
  const [routeId, setRouteId] = useState<string>('DEL-NCR-01');
  const [routeName, setRouteName] = useState<string>('Delhi - Noida Corridor');
  const [startPoint, setStartPoint] = useState<string>('28.6139,77.2090');
  const [endPoint, setEndPoint] = useState<string>('28.5355,77.3910');
  const [captureStartedAt, setCaptureStartedAt] = useState<string>('');
  const [sampleFps, setSampleFps] = useState<number>(1);
  const [confThreshold, setConfThreshold] = useState<number>(0.10);
  const [stabilityFrames, setStabilityFrames] = useState<number>(1);
  const [generateAnnotated, setGenerateAnnotated] = useState<boolean>(true);

  // Active Job State
  const [activeJob, setActiveJob] = useState<InspectionJob | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // UI View Mode (Results vs Video Player)
  const [activeVideoTab, setActiveVideoTab] = useState<'original' | 'annotated'>('annotated');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Results Display Tab: 'grid' (cards) vs 'map' (IntelligenceMap)
  const [resultsView, setResultsView] = useState<'grid' | 'map'>('grid');

  // Track broken evidence image URLs gracefully
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  // Recent Inspections Drawer
  const [recentInspections, setRecentInspections] = useState<InspectionJob[]>([]);
  const [showRecentDrawer, setShowRecentDrawer] = useState<boolean>(false);

  // Clean up object URLs
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Load Library Videos on mount
  useEffect(() => {
    const fetchLibrary = async () => {
      setIsLoadingVideos(true);
      try {
        const vids = await api.getLibraryVideos();
        setLibraryVideos(vids);
        if (vids.length > 0 && !selectedLibraryVideo && !selectedFile) {
          handleSelectLibraryVideo(vids[0]);
        }
      } catch (err) {
        console.error('Failed to load video library:', err);
      } finally {
        setIsLoadingVideos(false);
      }
    };
    fetchLibrary();
  }, []);

  // Select a Library Video
  const handleSelectLibraryVideo = (video: LibraryVideo) => {
    setSelectedLibraryVideo(video);
    setSelectedFile(null);
    setUploadError(null);
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(config.assetUrl(video.video_url));
    setBusId(video.default_bus_id || 'BUS-001');
    setRouteId(video.default_route_id || 'DEL-NCR-01');
    setRouteName(video.default_route_name || 'Delhi - Noida Corridor');
    setStartPoint(`${video.default_start_lat},${video.default_start_lng}`);
    setEndPoint(`${video.default_end_lat},${video.default_end_lng}`);
    setActiveVideoTab('original');
  };

  // Handle custom file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setSelectedLibraryVideo(null);
    setUploadError(null);
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(URL.createObjectURL(file));
    setActiveVideoTab('original');
  };

  // Fetch recent inspections
  const handleOpenRecent = async () => {
    setShowRecentDrawer(true);
    try {
      const list = await api.listRecentInspections();
      setRecentInspections(list);
    } catch (err) {
      console.error('Failed to fetch recent inspections:', err);
    }
  };

  // Load an existing completed inspection
  const handleLoadExistingJob = async (jobId: string) => {
    try {
      const job = await api.getInspectionStatus(jobId);
      setActiveJob(job);
      setShowRecentDrawer(false);
      if (job.annotated_video_url) {
        setActiveVideoTab('annotated');
      }
    } catch (err: any) {
      console.error('Failed to load inspection:', err);
    }
  };

  // Poll inspection status
  useEffect(() => {
    if (!activeJob || activeJob.status === 'completed' || activeJob.status === 'failed') {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const status = await api.getInspectionStatus(activeJob.inspection_id);
        setActiveJob(status);
        if (status.status === 'completed' && status.annotated_video_url) {
          setActiveVideoTab('annotated');
        }
      } catch (err: any) {
        console.error('Failed to poll inspection status:', err);
      }
    }, 800);

    return () => clearInterval(interval);
  }, [activeJob?.inspection_id, activeJob?.status]);

  // Start Inspection
  const handleStartInspection = async () => {
    if (inputMode === 'library' && !selectedLibraryVideo) {
      setUploadError('Please select a road inspection video from the library.');
      return;
    }
    if (inputMode === 'upload' && !selectedFile) {
      setUploadError('Please select a road inspection video file (.mp4, .mov)');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const parsePoint = (value: string) => {
        const [lat, lng] = value.split(',').map(Number);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          throw new Error('Route points must use latitude,longitude format.');
        }
        return { lat, lng };
      };
      const start = parsePoint(startPoint);
      const end = parsePoint(endPoint);

      let res: { inspection_id: string; status: string; message: string };

      if (inputMode === 'library' && selectedLibraryVideo) {
        res = await api.runLibraryInspection({
          video_filename: selectedLibraryVideo.rel_path,
          bus_id: busId,
          sample_fps: sampleFps,
          conf_threshold: confThreshold,
          stability_frames: stabilityFrames,
          generate_annotated: generateAnnotated,
          route_id: routeId,
          route_name: routeName,
          start_lat: start.lat,
          start_lng: start.lng,
          end_lat: end.lat,
          end_lng: end.lng,
          capture_started_at: captureStartedAt
        });
      } else if (selectedFile) {
        res = await api.uploadInspectionVideo(
          selectedFile,
          busId,
          sampleFps,
          confThreshold,
          stabilityFrames,
          generateAnnotated,
          routeId,
          routeName,
          start.lat,
          start.lng,
          end.lat,
          end.lng,
          captureStartedAt
        );
      } else {
        throw new Error('No video selected.');
      }

      setActiveJob({
        inspection_id: res.inspection_id,
        filename: inputMode === 'library' ? selectedLibraryVideo!.filename : selectedFile!.name,
        bus_id: busId,
        status: 'pending',
        stage: 'upload',
        progress: 5,
        video_metadata: null,
        statistics: null,
        events: [],
        annotated_video_url: null,
        error: null,
        created_at: Date.now() / 1000
      });
    } catch (err: any) {
      setUploadError(err.message || 'Failed to start AI inspection.');
    } finally {
      setIsUploading(false);
    }
  };

  // Video seeking synchronization
  const seekToFrame = (frameIdx?: number, fps?: number) => {
    if (frameIdx == null || !videoRef.current) return;
    const videoFps = fps || activeJob?.video_metadata?.fps || selectedLibraryVideo?.fps || 30;
    const timeSeconds = frameIdx / videoFps;
    videoRef.current.currentTime = timeSeconds;
    videoRef.current.pause();
    videoRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleImageError = (id: string) => {
    setFailedImages(prev => ({ ...prev, [id]: true }));
  };

  // Determine active step status
  const getStepStatus = (stepKey: string) => {
    if (!activeJob) return 'pending';
    if (activeJob.status === 'completed') return 'completed';
    if (activeJob.status === 'failed' && activeJob.stage === stepKey) return 'failed';

    const order = ['upload', 'sampling', 'inference', 'tracking', 'severity', 'gps', 'ingestion', 'complete'];
    const currentIdx = order.indexOf(activeJob.stage);
    const stepIdx = order.indexOf(stepKey);

    if (currentIdx > stepIdx) return 'completed';
    if (currentIdx === stepIdx) return 'running';
    return 'pending';
  };

  // Helper safety formatters
  const formatFileSize = (bytes?: number): string => {
    if (!bytes || isNaN(bytes)) return '0 MB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const formatConfidence = (conf?: number): string => {
    if (conf == null || isNaN(conf)) return 'N/A';
    return `${Math.round(conf * 100)}%`;
  };

  const formatCoords = (location?: { lat?: number; lng?: number }): string => {
    if (!location || location.lat == null || location.lng == null || isNaN(location.lat) || isNaN(location.lng)) {
      return 'N/A';
    }
    return `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`;
  };

  // Map representation for Phase 6 map synchronization
  const mappedIssues: UrbanIssue[] = (activeJob?.events || [])
    .filter(ev => ev.location && Number.isFinite(ev.location.lat) && Number.isFinite(ev.location.lng))
    .map((ev, idx) => ({
      id: ev.issue_id || ev.event_id || `temp-${idx}`,
      displayId: ev.issue_id ? `PTH-${ev.issue_id.slice(-4).toUpperCase()}` : `EVT-${idx + 1}`,
      type: (ev.detection_type || 'pothole') as any,
      title: (ev.detection_type || 'Road Defect').replace(/_/g, ' '),
      description: `Detected via YOLOv8 model at frame #${ev.frame_idx ?? 'N/A'}`,
      status: 'open',
      severity: (ev.severity || 'medium') as any,
      priority: 75,
      location: {
        gps: { lat: ev.location.lat, lng: ev.location.lng },
        snappedGps: { lat: ev.location.lat, lng: ev.location.lng },
        address: ev.route_name || routeName || 'Delhi - Noida Corridor'
      },
      observations: [],
      observationCount: 1,
      uniqueBusCount: 1,
      confidence: ev.confidence,
      firstDetectedAt: ev.timestamp || new Date().toISOString(),
      lastObservedAt: ev.timestamp || new Date().toISOString(),
      departmentId: 'pwd',
      tags: ['ai-inspection'],
      resolutionHistory: []
    } as UrbanIssue));

  // Fleet bus telemetry is not available for historical video runs.
  // Passing an empty array prevents synthetic bus markers from appearing on the map.
  const mappedBuses: BusType[] = [];

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1920px] mx-auto pb-24">
      {/* Page Header */}
      <PageHeader
        title="AI Road Inspection Workstation"
        subtitle="Select recorded corridor footage or upload video for YOLO defect detection, spatial telemetry fusion, and automated ticket generation"
        breadcrumbs={[{ label: 'Operations' }, { label: 'AI Inspection Workstation' }]}
        action={
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              YOLOv8 AI MODEL READY
            </div>

            <button
              onClick={handleOpenRecent}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-xs font-semibold text-white/90 border border-white/[0.08] transition-colors shadow-sm"
              title="View previous inspection runs"
            >
              <History className="w-3.5 h-3.5 text-primary" />
              <span>Inspection History</span>
            </button>

            {activeJob && (
              <button
                onClick={() => {
                  setActiveJob(null);
                  setSelectedFile(null);
                  if (selectedLibraryVideo) {
                    handleSelectLibraryVideo(selectedLibraryVideo);
                  }
                }}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-xs font-semibold text-white border border-white/[0.08] transition-colors shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>New Inspection</span>
              </button>
            )}
          </div>
        }
      />

      {/* ── Main Layout Grid: Control Panel & Live Pipeline ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Video Ingestion & AI Parameters (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <GlassPanel padding="md" className="bg-[#141519] border-white/[0.08] rounded-xl shadow-xl">
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/[0.06]">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Video className="w-4 h-4 text-primary" />
                  Video Ingestion Source
                </h3>
                <p className="text-xs text-on-surface-variant/70 mt-0.5">
                  Select a verified corridor recording or upload custom vehicle footage.
                </p>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase bg-white/[0.04] text-white/70 border border-white/[0.06]">
                INPUT PORT
              </span>
            </div>

            {/* Source Mode Toggle */}
            <div className="grid grid-cols-2 gap-2 mb-4 p-1 bg-white/[0.02] border border-white/[0.06] rounded-lg">
              <button
                type="button"
                onClick={() => setInputMode('library')}
                className={cn(
                  "py-1.5 px-3 rounded-md text-xs font-mono font-semibold flex items-center justify-center gap-2 transition-all",
                  inputMode === 'library'
                    ? "bg-primary text-on-primary shadow-sm"
                    : "text-on-surface-variant/70 hover:text-white"
                )}
              >
                <FolderArchive className="w-3.5 h-3.5" />
                <span>Video Library</span>
              </button>

              <button
                type="button"
                onClick={() => setInputMode('upload')}
                className={cn(
                  "py-1.5 px-3 rounded-md text-xs font-mono font-semibold flex items-center justify-center gap-2 transition-all",
                  inputMode === 'upload'
                    ? "bg-primary text-on-primary shadow-sm"
                    : "text-on-surface-variant/70 hover:text-white"
                )}
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Custom Upload</span>
              </button>
            </div>

            {/* Library Mode: Catalog Cards */}
            {inputMode === 'library' && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-[11px] font-mono text-on-surface-variant/70">
                  <span>Available Route Runs:</span>
                  <span>{libraryVideos.length} assets verified</span>
                </div>

                {isLoadingVideos ? (
                  <div className="p-6 text-center text-xs font-mono text-on-surface-variant/50 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                    <span>Indexing video catalog...</span>
                  </div>
                ) : libraryVideos.length === 0 ? (
                  <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.06] text-center text-xs text-on-surface-variant/70">
                    No videos found in library storage.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {libraryVideos.map((vid) => {
                      const isSelected = selectedLibraryVideo?.rel_path === vid.rel_path;
                      return (
                        <div
                          key={vid.rel_path}
                          onClick={() => handleSelectLibraryVideo(vid)}
                          className={cn(
                            "p-3 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 relative overflow-hidden",
                            isSelected
                              ? "bg-primary/[0.08] border-primary/60 shadow-md"
                              : "bg-white/[0.02] border-white/[0.06] hover:border-white/[0.15] hover:bg-white/[0.04]"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div className={cn(
                              "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5",
                              isSelected ? "bg-primary/20 text-primary" : "bg-white/[0.04] text-on-surface-variant/70"
                            )}>
                              <Film className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-xs font-bold text-white font-mono">{vid.filename}</p>
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  {vid.status_label || 'Verified'}
                                </span>
                              </div>
                              <p className="text-[11px] text-on-surface-variant/80 mt-0.5 font-medium">
                                {vid.default_route_name} ({vid.default_bus_id})
                              </p>
                              <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-on-surface-variant/60">
                                <span>{vid.duration}s</span>
                                <span>•</span>
                                <span>{vid.resolution}</span>
                                <span>•</span>
                                <span>{vid.fps} FPS</span>
                                <span>•</span>
                                <span>{formatFileSize(vid.size_bytes)}</span>
                              </div>
                            </div>
                          </div>

                          {isSelected && (
                            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-on-primary flex-shrink-0">
                              <Check className="w-3 h-3" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Upload Mode: File Dropzone */}
            {inputMode === 'upload' && (
              <>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="video/mp4,video/quicktime,video/x-msvideo" 
                  className="hidden" 
                />

                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "border border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 relative overflow-hidden group",
                    selectedFile 
                      ? "border-primary/60 bg-primary/[0.04]" 
                      : "border-white/[0.12] hover:border-primary/50 hover:bg-white/[0.02]"
                  )}
                >
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 shadow-inner",
                    selectedFile ? "bg-primary/20 text-primary border border-primary/30" : "bg-white/[0.04] text-on-surface-variant/70 border border-white/[0.06]"
                  )}>
                    {selectedFile ? <FileVideo className="w-6 h-6 text-primary" /> : <UploadCloud className="w-6 h-6" />}
                  </div>

                  <div>
                    {selectedFile ? (
                      <>
                        <p className="text-sm font-semibold text-white truncate max-w-[260px] mx-auto">
                          {selectedFile.name}
                        </p>
                        <div className="flex items-center justify-center gap-2 mt-1">
                          <span className="text-[11px] font-mono font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            {formatFileSize(selectedFile.size)}
                          </span>
                          <span className="text-[11px] font-mono text-on-surface-variant/60 uppercase">
                            • Ready for Ingestion
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-xs font-semibold text-white">
                          Drop road inspection video here or <span className="text-primary hover:underline">browse file</span>
                        </p>
                        <p className="text-[11px] text-on-surface-variant/60 mt-1 font-mono">
                          Supports MP4, MOV (H.264 / up to 100MB)
                        </p>
                      </>
                    )}
                  </div>

                  {selectedFile && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                        if (previewUrl && previewUrl.startsWith('blob:')) {
                          URL.revokeObjectURL(previewUrl);
                        }
                        setPreviewUrl(null);
                      }}
                      className="absolute top-2.5 right-2.5 p-1 rounded-md bg-white/[0.05] hover:bg-white/[0.1] text-white/70 hover:text-white transition-colors"
                      title="Remove file"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </>
            )}

            {/* Vehicle & Journey Telemetry Configuration */}
            <div className="mt-4 space-y-4 pt-4 border-t border-white/[0.06]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-white/80 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-primary" />
                  Transit Journey Context & AI Parameters
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[10px] font-mono font-semibold text-on-surface-variant/70 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <BusIcon className="w-3 h-3 text-primary/70" /> Vehicle ID
                  </label>
                  <input
                    value={busId}
                    onChange={(e) => setBusId(e.target.value)}
                    disabled={activeJob?.status === 'running'}
                    className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg bg-white/[0.03] border border-white/[0.08] text-white focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-semibold text-on-surface-variant/70 uppercase tracking-wider mb-1">
                    Route Corridor
                  </label>
                  <input
                    value={routeId}
                    onChange={(e) => setRouteId(e.target.value)}
                    disabled={activeJob?.status === 'running'}
                    className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg bg-white/[0.03] border border-white/[0.08] text-white focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[10px] font-mono font-semibold text-on-surface-variant/70 uppercase tracking-wider mb-1">
                    Sampling Rate
                  </label>
                  <select
                    value={sampleFps}
                    onChange={(e) => setSampleFps(Number(e.target.value))}
                    disabled={activeJob?.status === 'running'}
                    className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg bg-white/[0.03] border border-white/[0.08] text-white focus:outline-none focus:border-primary transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <option value={1} className="bg-[#141519] text-white">1 FPS (Standard)</option>
                    <option value={2} className="bg-[#141519] text-white">2 FPS (Dense)</option>
                    <option value={3} className="bg-[#141519] text-white">3 FPS (Ultra)</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-[10px] font-mono font-semibold text-on-surface-variant/70 uppercase tracking-wider mb-1">
                    Route Name
                  </label>
                  <input
                    value={routeName}
                    onChange={(e) => setRouteName(e.target.value)}
                    disabled={activeJob?.status === 'running'}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-white/[0.03] border border-white/[0.08] text-white focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[10px] font-mono font-semibold text-on-surface-variant/70 uppercase tracking-wider mb-1">
                    Stability Hits
                  </label>
                  <select
                    value={stabilityFrames}
                    onChange={(e) => setStabilityFrames(Number(e.target.value))}
                    disabled={activeJob?.status === 'running'}
                    className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg bg-white/[0.03] border border-white/[0.08] text-white focus:outline-none focus:border-primary transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <option value={1} className="bg-[#141519] text-white">1 Frame (Instant)</option>
                    <option value={2} className="bg-[#141519] text-white">2 Frames (Dedupe)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-semibold text-on-surface-variant/70 uppercase tracking-wider mb-1">
                    Start (lat,lng)
                  </label>
                  <input
                    value={startPoint}
                    onChange={(e) => setStartPoint(e.target.value)}
                    disabled={activeJob?.status === 'running'}
                    className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg bg-white/[0.03] border border-white/[0.08] text-white focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-semibold text-on-surface-variant/70 uppercase tracking-wider mb-1">
                    End (lat,lng)
                  </label>
                  <input
                    value={endPoint}
                    onChange={(e) => setEndPoint(e.target.value)}
                    disabled={activeJob?.status === 'running'}
                    className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg bg-white/[0.03] border border-white/[0.08] text-white focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Confidence Threshold Slider */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[11px] text-on-surface-variant/70 font-mono">Model Confidence Cutoff:</span>
                  <span className="font-mono font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded text-[11px]">
                    {Math.round(confThreshold * 100)}%
                  </span>
                </div>
                <input 
                  type="range" 
                  min={0.05} 
                  max={0.50} 
                  step={0.01} 
                  value={confThreshold}
                  onChange={(e) => setConfThreshold(parseFloat(e.target.value))}
                  disabled={activeJob?.status === 'running'}
                  className="w-full accent-primary h-1.5 bg-white/[0.06] rounded-lg cursor-pointer disabled:opacity-50"
                />
              </div>

              {/* Annotated Output Checkbox Toggle */}
              <div className="flex items-center gap-2.5 pt-1">
                <input
                  type="checkbox"
                  id="annotated-toggle"
                  checked={generateAnnotated}
                  onChange={(e) => setGenerateAnnotated(e.target.checked)}
                  disabled={activeJob?.status === 'running'}
                  className="w-4 h-4 rounded border-white/[0.15] bg-white/[0.04] text-primary focus:ring-0 cursor-pointer"
                />
                <label htmlFor="annotated-toggle" className="text-xs text-white/90 cursor-pointer select-none font-medium">
                  Render AI Annotated Video (YOLO Bounding Boxes & Telemetry HUD)
                </label>
              </div>
            </div>

            {/* Upload Error Banner */}
            {uploadError && (
              <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span className="font-medium">{uploadError}</span>
              </div>
            )}

            {/* Execute Action Button */}
            <button
              onClick={handleStartInspection}
              disabled={isUploading || activeJob?.status === 'running' || (inputMode === 'upload' && !selectedFile) || (inputMode === 'library' && !selectedLibraryVideo)}
              className={cn(
                "mt-5 w-full py-3 px-4 rounded-xl font-mono font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg",
                activeJob?.status === 'running'
                  ? "bg-primary/50 text-white cursor-wait"
                  : (inputMode === 'library' && selectedLibraryVideo) || (inputMode === 'upload' && selectedFile)
                  ? "bg-primary hover:bg-primary/90 text-on-primary shadow-primary/20 active:scale-[0.99]"
                  : "bg-white/[0.04] text-white/40 border border-white/[0.06] cursor-not-allowed"
              )}
            >
              {activeJob?.status === 'running' ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Processing AI Pipeline ({activeJob.progress ?? 0}%)...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start AI Road Inspection</span>
                </>
              )}
            </button>
          </GlassPanel>
        </div>

        {/* Right Column: Execution Pipeline & Video Player Workstation (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <GlassPanel padding="md" className="bg-[#141519] border-white/[0.08] rounded-xl shadow-xl">
            {/* Header / Status Banner */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.06]">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Neural Inference Pipeline Workstation
                </h3>
                <p className="text-xs text-on-surface-variant/70 mt-0.5 font-mono">
                  {activeJob 
                    ? `Inspection ID: ${activeJob.inspection_id}`
                    : "Awaiting video upload to engage neural inference worker."}
                </p>
              </div>

              {activeJob ? (
                <span className={cn(
                  "px-3 py-1 text-[11px] font-mono font-bold rounded-lg uppercase tracking-wider border flex items-center gap-1.5",
                  activeJob.status === 'completed' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" :
                  activeJob.status === 'failed' ? "bg-red-500/10 text-red-400 border-red-500/30" :
                  "bg-primary/10 text-primary border-primary/30 animate-pulse"
                )}>
                  {activeJob.status === 'running' && <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />}
                  {activeJob.status} ({activeJob.progress ?? 0}%)
                </span>
              ) : (
                <span className="px-2.5 py-1 text-[10px] font-mono text-on-surface-variant/50 bg-white/[0.02] border border-white/[0.04] rounded uppercase">
                  IDLE
                </span>
              )}
            </div>

            {/* Overall Progress Bar */}
            <div className="space-y-1.5 mb-5">
              <div className="flex items-center justify-between text-[11px] font-mono text-on-surface-variant/60">
                <span>Execution Progress</span>
                <span className="text-white font-bold">{activeJob?.progress ?? 0}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/[0.04] border border-white/[0.06] overflow-hidden">
                <div 
                  className={cn(
                    "h-full transition-all duration-500 rounded-full",
                    activeJob?.status === 'completed' ? "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.5)]" :
                    activeJob?.status === 'failed' ? "bg-red-500" :
                    "bg-gradient-to-r from-primary/80 to-primary shadow-[0_0_12px_rgba(99,102,241,0.5)]"
                  )}
                  style={{ width: `${Math.min(100, Math.max(0, activeJob?.progress ?? 0))}%` }}
                />
              </div>
            </div>

            {/* Step-by-Step Pipeline Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {PIPELINE_STEPS.map((step) => {
                const status = getStepStatus(step.key);
                const Icon = step.icon;

                return (
                  <div
                    key={step.key}
                    className={cn(
                      "p-2.5 rounded-lg border flex flex-col items-center text-center gap-1.5 transition-all relative overflow-hidden",
                      status === 'completed' ? "bg-emerald-500/[0.06] border-emerald-500/30 text-emerald-400" :
                      status === 'running' ? "bg-primary/[0.1] border-primary/50 text-primary animate-pulse" :
                      status === 'failed' ? "bg-red-500/10 border-red-500/30 text-red-400" :
                      "bg-white/[0.02] border-white/[0.05] text-on-surface-variant/50"
                    )}
                  >
                    <div className="flex items-center justify-between w-full text-[9px] font-mono text-on-surface-variant/50">
                      <span>{step.stepNo}</span>
                      {status === 'completed' && <Check className="w-3 h-3 text-emerald-400" />}
                    </div>

                    <div className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center my-0.5",
                      status === 'completed' ? "bg-emerald-500/20 text-emerald-400" :
                      status === 'running' ? "bg-primary/20 text-primary" :
                      "bg-white/[0.04] text-white/50"
                    )}>
                      {status === 'running' ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Icon className="w-3.5 h-3.5" />
                      )}
                    </div>

                    <span className="text-[10px] font-semibold leading-tight line-clamp-1">
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Video Player & Playback Controls Workstation */}
            <div className="mt-6 pt-5 border-t border-white/[0.06]">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 bg-white/[0.03] p-1 rounded-lg border border-white/[0.06]">
                  <button
                    onClick={() => setActiveVideoTab('annotated')}
                    disabled={!activeJob?.annotated_video_url}
                    className={cn(
                      "px-3 py-1 rounded-md text-[11px] font-mono font-semibold uppercase tracking-wider transition-all",
                      activeVideoTab === 'annotated'
                        ? "bg-primary text-on-primary shadow-sm"
                        : activeJob?.annotated_video_url
                        ? "text-on-surface-variant hover:text-white"
                        : "text-white/30 cursor-not-allowed"
                    )}
                  >
                    AI Annotated Video
                  </button>
                  <button
                    onClick={() => setActiveVideoTab('original')}
                    disabled={!previewUrl}
                    className={cn(
                      "px-3 py-1 rounded-md text-[11px] font-mono font-semibold uppercase tracking-wider transition-all",
                      activeVideoTab === 'original'
                        ? "bg-primary text-on-primary shadow-sm"
                        : previewUrl
                        ? "text-on-surface-variant hover:text-white"
                        : "text-white/30 cursor-not-allowed"
                    )}
                  >
                    Original Raw Footage
                  </button>
                </div>

                {(activeJob?.video_metadata || selectedLibraryVideo) && (
                  <div className="text-[11px] font-mono text-on-surface-variant/70 bg-white/[0.03] px-2.5 py-1 rounded-lg border border-white/[0.06] flex items-center gap-2">
                    <Film className="w-3 h-3 text-primary" />
                    <span>{activeJob?.video_metadata?.resolution || selectedLibraryVideo?.resolution || '480x864'}</span>
                    <span>•</span>
                    <span>{activeJob?.video_metadata?.duration ?? selectedLibraryVideo?.duration ?? 0}s @ {activeJob?.video_metadata?.fps ?? selectedLibraryVideo?.fps ?? 30} FPS</span>
                  </div>
                )}
              </div>

              {/* Video Player Box with Seeking Support */}
              <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-white/[0.1] shadow-2xl">
                {activeVideoTab === 'annotated' && activeJob?.annotated_video_url ? (
                  <>
                    <video 
                      ref={videoRef}
                      key={activeJob.annotated_video_url}
                      src={config.assetUrl(activeJob.annotated_video_url)}
                      controls 
                      playsInline
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-black/80 backdrop-blur-md border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 pointer-events-none">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      AI YOLO HUD ACTIVE
                    </div>
                  </>
                ) : (activeVideoTab === 'original' && previewUrl) || (!activeJob?.annotated_video_url && previewUrl) ? (
                  <>
                    <video 
                      ref={videoRef}
                      key={previewUrl}
                      src={previewUrl} 
                      controls 
                      playsInline
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-black/80 backdrop-blur-md border border-white/[0.1] text-white/80 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 pointer-events-none">
                      <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                      RAW DASHCAM FOOTAGE
                    </div>
                  </>
                ) : (
                  <div className="text-center p-6 space-y-2">
                    <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mx-auto text-on-surface-variant/50">
                      <Video className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-mono text-on-surface-variant/70">
                      {activeJob?.status === 'running' 
                        ? 'AI Neural Annotations Rendering in Background...'
                        : 'Select a video from the library to inspect road geometry.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </GlassPanel>
        </div>
      </div>

      {/* ── Inspection Results, Map Synchronization & Detected Anomalies Section ── */}
      {activeJob && activeJob.status === 'completed' && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6 pt-2"
        >
          {/* Summary Banner & View Toggle */}
          <div className="p-5 rounded-xl bg-[#141519] border border-emerald-500/30 flex items-center justify-between flex-wrap gap-4 shadow-xl">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  Processing completed — {activeJob.events.length > 0 ? `${activeJob.events.length} road defects detected` : 'no road defects detected'}
                </h3>
                <p className="text-xs text-on-surface-variant/70 mt-1 font-mono">
                  {activeJob.statistics?.total_frames ?? 0} total frames • {activeJob.statistics?.sampled_frames ?? 0} sampled frames • Execution time: {activeJob.statistics?.processing_time ?? 0}s
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Toggle Cards vs Map */}
              <div className="flex items-center bg-white/[0.04] p-1 rounded-lg border border-white/[0.08]">
                <button
                  onClick={() => setResultsView('grid')}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-mono font-semibold flex items-center gap-1.5 transition-all",
                    resultsView === 'grid'
                      ? "bg-primary text-on-primary shadow-sm"
                      : "text-on-surface-variant/70 hover:text-white"
                  )}
                >
                  <ListFilter className="w-3.5 h-3.5" />
                  <span>Detections List</span>
                </button>
                <button
                  onClick={() => setResultsView('map')}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-mono font-semibold flex items-center gap-1.5 transition-all",
                    resultsView === 'map'
                      ? "bg-primary text-on-primary shadow-sm"
                      : "text-on-surface-variant/70 hover:text-white"
                  )}
                >
                  <MapIcon className="w-3.5 h-3.5" />
                  <span>Route Map</span>
                </button>
              </div>

              <button
                onClick={() => navigate('/issues')}
                className="px-3.5 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-xs font-semibold text-white border border-white/[0.08] flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-primary" />
                <span>Issues Directory</span>
              </button>
            </div>
          </div>

          {/* Detections Content: Cards View vs Synchronized Map View */}
          {activeJob.events.length === 0 ? (
            <GlassPanel padding="lg" className="text-center bg-[#141519] border-white/[0.08] rounded-xl py-12">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto mb-3">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-white">Processing completed — no road defects detected.</h4>
              <p className="text-xs text-on-surface-variant/70 max-w-md mx-auto mt-1 font-mono">
                The YOLOv8 neural model inspected all sampled frames and detected zero structural road hazards exceeding confidence threshold.
              </p>
            </GlassPanel>
          ) : resultsView === 'map' ? (
            /* Route Defect Map View (Phase 6 Synchronization) */
            <div className="space-y-2">
              <div className="px-3.5 py-2 rounded-lg bg-white/[0.02] border border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-on-surface-variant/70">
                <span className="flex items-center gap-1.5 text-white/80 font-semibold">
                  <MapPin className="w-3.5 h-3.5 text-blue-400" />
                  Corridor Defect Locations ({mappedIssues.length} defects)
                </span>
                <span className="text-[10px] text-on-surface-variant/50">
                  Coordinates interpolated along configured corridor. Live vehicle telemetry is inactive during recorded video inspection.
                </span>
              </div>
              <div className="h-[520px] rounded-xl overflow-hidden border border-white/[0.08] shadow-xl">
                <IntelligenceMap buses={[]} issues={mappedIssues} />
              </div>
            </div>
          ) : (
            /* Detections Cards Grid View with Video Seek Synchronization */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {activeJob.events.map((ev, idx) => {
                const label = (ev.detection_type || 'Road Anomaly').replace(/_/g, ' ');
                const hasFailedImage = failedImages[ev.event_id || idx];
                const fps = activeJob.video_metadata?.fps || 30;
                const timeOffset = ev.frame_idx != null ? (ev.frame_idx / fps).toFixed(2) : null;

                return (
                  <GlassPanel key={ev.event_id || idx} padding="none" className="overflow-hidden bg-[#141519] border-white/[0.08] hover:border-white/[0.18] transition-all rounded-xl shadow-lg group">
                    {/* Evidence Image Box */}
                    <div className="relative aspect-video bg-black/80 overflow-hidden flex items-center justify-center">
                      {!hasFailedImage && ev.evidence_url ? (
                        <img
                          src={config.assetUrl(ev.evidence_url)}
                          alt={label}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={() => handleImageError(ev.event_id || String(idx))}
                        />
                      ) : (
                        <div className="text-center space-y-1 text-on-surface-variant/50 p-4">
                          <Film className="w-8 h-8 mx-auto" />
                          <p className="text-[11px] font-mono">Evidence Crop Frame</p>
                        </div>
                      )}

                      {/* Top Badges */}
                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-black/80 text-white uppercase backdrop-blur-md border border-white/10">
                          {ev.event_id || `#EVT-${idx + 1}`}
                        </span>
                        <SeverityBadge severity={(ev.severity || 'medium') as any} size="sm" />
                      </div>

                      <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-black/80 text-emerald-400 backdrop-blur-md border border-emerald-500/30">
                        Conf: {formatConfidence(ev.confidence)}
                      </div>
                    </div>

                    {/* Metadata Content */}
                    <div className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-sm font-bold text-white capitalize flex items-center gap-1.5">
                            {label}
                          </h4>
                          <div className="text-[11px] text-on-surface-variant/70 font-mono mt-0.5 flex items-center gap-2">
                            <span>Vehicle: <strong className="text-white">{ev.bus_id || 'BUS-001'}</strong></span>
                            {ev.frame_idx != null && (
                              <>
                                <span>•</span>
                                <span>Frame #{ev.frame_idx} ({timeOffset}s)</span>
                              </>
                            )}
                          </div>
                        </div>

                        <span className="text-emerald-400 font-semibold uppercase text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          {ev.issue_status || 'Registered'}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs text-on-surface-variant/70 font-mono">
                        <span className="flex items-center gap-1 text-[11px]">
                          <MapPin className="w-3.5 h-3.5 text-blue-400" />
                          {formatCoords(ev.location)}
                        </span>
                        <span className="text-[10px] text-on-surface-variant/60 truncate max-w-[140px]">
                          {ev.route_name || routeName}
                        </span>
                      </div>

                      {/* Interactive Controls: Video Seek & Ticket Navigation */}
                      <div className="pt-2 flex items-center gap-2">
                        {ev.frame_idx != null && (
                          <button
                            onClick={() => seekToFrame(ev.frame_idx, fps)}
                            className="px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-medium bg-white/[0.04] hover:bg-white/[0.08] text-white/90 border border-white/[0.08] flex items-center gap-1.5 transition-colors shadow-sm"
                            title="Seek video player to this exact timestamp"
                          >
                            <Film className="w-3 h-3 text-primary" />
                            <span>Seek {timeOffset}s</span>
                          </button>
                        )}

                        {ev.issue_id && (
                          <button
                            onClick={() => navigate(`/issues/${ev.issue_id}`)}
                            className="ml-auto px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-semibold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 flex items-center gap-1 transition-colors"
                          >
                            <span>View Ticket</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </GlassPanel>
                );
              })}
            </div>
          )}
        </motion.div>
      )}

      {/* ── Error Pipeline State Display ── */}
      {activeJob && activeJob.status === 'failed' && (
        <div className="p-6 rounded-xl bg-red-500/10 border border-red-500/30 text-center space-y-3 shadow-xl">
          <div className="w-12 h-12 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-white">Inspection Pipeline Failed</h3>
          <p className="text-xs text-on-surface-variant/80 max-w-md mx-auto font-mono">
            {activeJob.error || 'An unexpected failure occurred during YOLO neural inference or PostGIS spatial telemetry fusion.'}
          </p>
          <button
            onClick={handleStartInspection}
            className="px-4 py-2 bg-primary text-on-primary rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors shadow-md"
          >
            Retry Inspection
          </button>
        </div>
      )}

      {/* ── Inspection History Drawer ── */}
      <AnimatePresence>
        {showRecentDrawer && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowRecentDrawer(false)}
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md bg-[#141519] border-l border-white/[0.08] shadow-2xl p-6 overflow-y-auto flex flex-col z-10"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-bold text-white">Inspection History</h3>
                </div>
                <button 
                  onClick={() => setShowRecentDrawer(false)}
                  className="p-1 rounded-md text-white/60 hover:text-white hover:bg-white/[0.06] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 space-y-3 flex-1">
                {recentInspections.length === 0 ? (
                  <p className="text-xs font-mono text-on-surface-variant/50 text-center py-8">
                    No inspection runs found.
                  </p>
                ) : (
                  recentInspections.map((job) => (
                    <div
                      key={job.inspection_id}
                      onClick={() => handleLoadExistingJob(job.inspection_id)}
                      className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.15] hover:bg-white/[0.04] transition-all cursor-pointer space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-white">{job.inspection_id}</span>
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold",
                          job.status === 'completed' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                          job.status === 'failed' ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                          "bg-primary/10 text-primary border border-primary/20"
                        )}>
                          {job.status}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-on-surface-variant/70 flex items-center justify-between">
                        <span>{job.filename}</span>
                        <span>{job.bus_id}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
