// ============================================================
// AI Road Inspection Page — Command Center Real-Video Inspection
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  UploadCloud, Play, CheckCircle2, AlertTriangle, 
  MapPin, Bus, Cpu, Eye, Video, FileVideo, 
  RefreshCw, Layers, Check, ArrowRight, Sparkles
} from 'lucide-react';
import { PageHeader, GlassPanel, SeverityBadge } from '@/components/ui';
import { api } from '@/services/api';
import { cn } from '@/lib/utils';
import type { InspectionJob } from '@/services/modules/inspectionService';

// Pipeline steps for progress visualization
const PIPELINE_STEPS = [
  { key: 'upload', label: 'Video Upload', icon: UploadCloud },
  { key: 'sampling', label: 'Frame Extraction', icon: FileVideo },
  { key: 'inference', label: 'YOLO 4-Class AI', icon: Cpu },
  { key: 'tracking', label: 'Centroid Tracker', icon: Layers },
  { key: 'severity', label: 'Severity & Evidence', icon: Eye },
  { key: 'gps', label: 'Bengaluru GPS Fusion', icon: MapPin },
  { key: 'ingestion', label: 'PostGIS & Lifecycle', icon: CheckCircle2 },
];

export function InspectionPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [busId, setBusId] = useState<string>('BUS-001');
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

  // Clean up object URLs
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setUploadError(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
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
      } catch (err: any) {
        console.error('Failed to poll inspection status:', err);
      }
    }, 800);

    return () => clearInterval(interval);
  }, [activeJob?.inspection_id, activeJob?.status]);

  // Start Inspection
  const handleStartInspection = async () => {
    if (!selectedFile) {
      setUploadError('Please select a road inspection video file (.mp4, .mov)');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const res = await api.uploadInspectionVideo(
        selectedFile,
        busId,
        sampleFps,
        confThreshold,
        stabilityFrames,
        generateAnnotated
      );

      setActiveJob({
        inspection_id: res.inspection_id,
        filename: selectedFile.name,
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

  // Determine active step index
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

  return (
    <div className="p-6 space-y-6 max-w-[1920px] mx-auto pb-20">
      <PageHeader
        title="AI Road Inspection"
        subtitle="Upload municipal road video and run end-to-end YOLO damage detection, spatial fusion, and ticketing"
        breadcrumbs={[{ label: 'Operations' }, { label: 'AI Inspection' }]}
        action={
          activeJob && (
            <button
              onClick={() => {
                setActiveJob(null);
                setSelectedFile(null);
                if (previewUrl) URL.revokeObjectURL(previewUrl);
                setPreviewUrl(null);
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded bg-surface-container hover:bg-surface-container-high text-xs text-on-surface border border-outline-variant transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> New Inspection
            </button>
          )
        }
      />

      {/* ── Main Layout: Input / Control Panel & Pipeline Status ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Upload & Parameters */}
        <div className="lg:col-span-5 space-y-6">
          <GlassPanel padding="md">
            <h3 className="text-sm font-bold text-on-surface mb-1 flex items-center gap-2">
              <Video className="w-4 h-4 text-primary" /> Video Ingestion Controls
            </h3>
            <p className="text-xs text-on-surface-variant mb-4">
              Select vehicle dashcam or road inspection footage to initiate automated analysis.
            </p>

            {/* Video File Dropzone */}
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
                "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3",
                selectedFile 
                  ? "border-primary/50 bg-primary/5" 
                  : "border-outline-variant hover:border-outline hover:bg-surface-container/30"
              )}
            >
              <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant">
                {selectedFile ? <FileVideo className="w-6 h-6 text-primary" /> : <UploadCloud className="w-6 h-6" />}
              </div>
              <div>
                {selectedFile ? (
                  <>
                    <p className="text-sm font-semibold text-on-surface truncate max-w-[280px]">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-on-surface-variant font-mono mt-0.5">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for AI Ingestion
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium text-on-surface">
                      Drop road inspection video here or <span className="text-primary hover:underline">browse</span>
                    </p>
                    <p className="text-[11px] text-on-surface-variant mt-1">
                      Supports MP4, MOV (H.264 / 480p - 4K up to 100MB)
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Vehicle & AI Parameters */}
            <div className="mt-4 space-y-3 pt-3 border-t border-outline-variant">
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Bus className="w-3 h-3" /> Bus ID
                  </label>
                  <select
                    value={busId}
                    onChange={(e) => setBusId(e.target.value)}
                    disabled={activeJob?.status === 'running'}
                    className="w-full px-2 py-2 text-xs rounded bg-surface-container border border-outline-variant text-on-surface focus:outline-none focus:border-primary"
                  >
                    <option value="BUS-001">BUS-001</option>
                    <option value="BUS-002">BUS-002</option>
                    <option value="BUS-003">BUS-003</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Cpu className="w-3 h-3" /> Sampling
                  </label>
                  <select
                    value={sampleFps}
                    onChange={(e) => setSampleFps(Number(e.target.value))}
                    disabled={activeJob?.status === 'running'}
                    className="w-full px-2 py-2 text-xs rounded bg-surface-container border border-outline-variant text-on-surface focus:outline-none focus:border-primary"
                  >
                    <option value={1}>1 FPS</option>
                    <option value={2}>2 FPS</option>
                    <option value={3}>3 FPS</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Layers className="w-3 h-3" /> Min Hits
                  </label>
                  <select
                    value={stabilityFrames}
                    onChange={(e) => setStabilityFrames(Number(e.target.value))}
                    disabled={activeJob?.status === 'running'}
                    className="w-full px-2 py-2 text-xs rounded bg-surface-container border border-outline-variant text-on-surface focus:outline-none focus:border-primary"
                  >
                    <option value={1}>1 Frame</option>
                    <option value={2}>2 Frames</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-on-surface-variant pt-1">
                <span>Model Confidence Threshold:</span>
                <span className="font-mono font-bold text-on-surface">{confThreshold * 100}%</span>
              </div>
              <input 
                type="range" 
                min={0.05} 
                max={0.50} 
                step={0.01} 
                value={confThreshold}
                onChange={(e) => setConfThreshold(parseFloat(e.target.value))}
                disabled={activeJob?.status === 'running'}
                className="w-full accent-primary h-1 bg-surface-container rounded cursor-pointer"
              />

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="annotated-toggle"
                  checked={generateAnnotated}
                  onChange={(e) => setGenerateAnnotated(e.target.checked)}
                  disabled={activeJob?.status === 'running'}
                  className="rounded border-outline-variant text-primary focus:ring-0"
                />
                <label htmlFor="annotated-toggle" className="text-xs text-on-surface cursor-pointer">
                  Render AI Annotated Inspection Video (Bounding Boxes + HUD)
                </label>
              </div>
            </div>

            {/* Error Message */}
            {uploadError && (
              <div className="mt-3 p-3 rounded bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Action Button */}
            <button
              onClick={handleStartInspection}
              disabled={isUploading || !selectedFile || activeJob?.status === 'running'}
              className={cn(
                "mt-5 w-full py-2.5 px-4 rounded font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all",
                activeJob?.status === 'running'
                  ? "bg-primary/50 text-white cursor-wait"
                  : selectedFile
                  ? "bg-primary hover:bg-primary/90 text-on-primary shadow-lg shadow-primary/20"
                  : "bg-surface-container text-on-surface-variant cursor-not-allowed"
              )}
            >
              {activeJob?.status === 'running' ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Processing AI Inspection ({activeJob.progress}%)...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" /> Start AI Inspection
                </>
              )}
            </button>
          </GlassPanel>
        </div>

        {/* Right Column: Real-time Pipeline Progress & Video Player */}
        <div className="lg:col-span-7 space-y-6">
          <GlassPanel padding="md">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" /> AI Inspection Execution Pipeline
                </h3>
                <p className="text-xs text-on-surface-variant">
                  {activeJob 
                    ? `Job ID: ${activeJob.inspection_id} • Status: ${activeJob.status.toUpperCase()}`
                    : "Awaiting video upload to engage neural inference worker."}
                </p>
              </div>

              {activeJob && (
                <span className={cn(
                  "px-2.5 py-1 text-[11px] font-mono font-bold rounded uppercase tracking-wider border",
                  activeJob.status === 'completed' ? "bg-status-healthy/10 text-status-healthy border-status-healthy/30" :
                  activeJob.status === 'failed' ? "bg-red-500/10 text-red-400 border-red-500/30" :
                  "bg-primary/10 text-primary border-primary/30 animate-pulse"
                )}>
                  {activeJob.status} ({activeJob.progress}%)
                </span>
              )}
            </div>

            {/* Overall Progress Bar */}
            <div className="w-full h-2 rounded-full bg-surface-container overflow-hidden mb-6">
              <div 
                className={cn(
                  "h-full transition-all duration-300",
                  activeJob?.status === 'completed' ? "bg-status-healthy" :
                  activeJob?.status === 'failed' ? "bg-red-500" :
                  "bg-primary"
                )}
                style={{ width: `${activeJob?.progress ?? 0}%` }}
              />
            </div>

            {/* Step-by-Step Pipeline Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {PIPELINE_STEPS.map((step) => {
                const status = getStepStatus(step.key);
                const Icon = step.icon;

                return (
                  <div
                    key={step.key}
                    className={cn(
                      "p-3 rounded border flex flex-col items-center text-center gap-2 transition-all",
                      status === 'completed' ? "bg-status-healthy/5 border-status-healthy/30 text-status-healthy" :
                      status === 'running' ? "bg-primary/10 border-primary/50 text-primary animate-pulse shadow-sm" :
                      status === 'failed' ? "bg-red-500/10 border-red-500/40 text-red-400" :
                      "bg-surface-container/30 border-outline-variant/50 text-on-surface-variant/50"
                    )}
                  >
                    <div className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center">
                      {status === 'completed' ? (
                        <Check className="w-4 h-4 text-status-healthy" />
                      ) : (
                        <Icon className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <span className="text-[11px] font-semibold tracking-wide">
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Video Preview / Annotated Output Tabs */}
            {(previewUrl || activeJob?.annotated_video_url) && (
              <div className="mt-6 pt-5 border-t border-outline-variant">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveVideoTab('annotated')}
                      disabled={!activeJob?.annotated_video_url}
                      className={cn(
                        "px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-colors",
                        activeVideoTab === 'annotated'
                          ? "bg-primary text-on-primary"
                          : activeJob?.annotated_video_url
                          ? "bg-surface-container text-on-surface-variant hover:text-on-surface"
                          : "bg-surface-container/50 text-on-surface-variant/40 cursor-not-allowed"
                      )}
                    >
                      AI Annotated Video
                    </button>
                    <button
                      onClick={() => setActiveVideoTab('original')}
                      disabled={!previewUrl}
                      className={cn(
                        "px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-colors",
                        activeVideoTab === 'original'
                          ? "bg-primary text-on-primary"
                          : "bg-surface-container text-on-surface-variant hover:text-on-surface"
                      )}
                    >
                      Original Footage
                    </button>
                  </div>

                  {activeJob?.video_metadata && (
                    <span className="text-xs font-mono text-on-surface-variant">
                      {activeJob.video_metadata.resolution} • {activeJob.video_metadata.duration}s @ {activeJob.video_metadata.fps} FPS
                    </span>
                  )}
                </div>

                <div className="relative rounded-lg overflow-hidden bg-black aspect-video flex items-center justify-center border border-outline-variant">
                  {activeVideoTab === 'annotated' && activeJob?.annotated_video_url ? (
                    <video 
                      src={activeJob.annotated_video_url} 
                      controls 
                      autoPlay 
                      loop 
                      className="w-full h-full object-contain"
                    />
                  ) : previewUrl ? (
                    <video 
                      src={previewUrl} 
                      controls 
                      loop 
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="text-xs text-on-surface-variant">Annotated video rendering...</div>
                  )}
                </div>
              </div>
            )}
          </GlassPanel>
        </div>
      </div>

      {/* ── Inspection Results Section ── */}
      {activeJob && activeJob.status === 'completed' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          {/* Summary Banner */}
          <div className="p-4 rounded-lg bg-surface-container border border-outline-variant flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-status-healthy" />
                Inspection Complete — {activeJob.events.length > 0 ? `${activeJob.events.length} Road Damage Anomalies Detected` : 'No Damage Detected'}
              </h3>
              <p className="text-xs text-on-surface-variant mt-0.5 font-mono">
                {activeJob.statistics?.total_frames} frames processed • {activeJob.statistics?.sampled_frames} sampled frames • Execution time: {activeJob.statistics?.processing_time}s
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/live-map')}
                className="px-3.5 py-1.5 rounded bg-surface-container-high hover:bg-surface-container-highest text-xs font-semibold text-on-surface border border-outline-variant flex items-center gap-1.5 transition-colors"
              >
                <MapPin className="w-3.5 h-3.5" /> View on Command Map
              </button>
              <button
                onClick={() => navigate('/issues')}
                className="px-3.5 py-1.5 rounded bg-primary hover:bg-primary/90 text-xs font-semibold text-on-primary flex items-center gap-1.5 transition-colors"
              >
                <AlertTriangle className="w-3.5 h-3.5" /> View Issues
              </button>
            </div>
          </div>

          {/* Detections Cards Grid */}
          {activeJob.events.length === 0 ? (
            <GlassPanel padding="lg" className="text-center">
              <CheckCircle2 className="w-10 h-10 text-status-healthy mx-auto mb-2" />
              <h4 className="text-sm font-bold text-on-surface">No Road Damage Detected</h4>
              <p className="text-xs text-on-surface-variant mt-1">
                The AI neural model inspected all sampled frames and found no severe potholes or structural cracks.
              </p>
            </GlassPanel>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {activeJob.events.map((ev, idx) => {
                const label = ev.detection_type.replace(/_/g, ' ');
                const confPercent = Math.round(ev.confidence * 100);

                return (
                  <GlassPanel key={ev.event_id || idx} padding="none" className="overflow-hidden border-outline-variant hover:border-outline transition-colors">
                    {/* Evidence Image */}
                    <div className="relative aspect-video bg-black/60 overflow-hidden">
                      <img 
                        src={ev.evidence_url} 
                        alt={label}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback to placeholder if not yet written
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <div className="absolute top-2 left-2 flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-black/70 text-white uppercase backdrop-blur-sm border border-white/10">
                          {ev.event_id}
                        </span>
                        <SeverityBadge severity={ev.severity as any} size="sm" />
                      </div>

                      <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded text-[10px] font-mono bg-black/70 text-white backdrop-blur-sm">
                        Conf: {confPercent}%
                      </div>
                    </div>

                    {/* Metadata Content */}
                    <div className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-sm font-bold text-on-surface capitalize">{label}</h4>
                          <span className="text-xs text-on-surface-variant font-mono">
                            Vehicle: {ev.bus_id} • Frame {ev.frame_idx ?? 'N/A'}
                          </span>
                        </div>
                        {ev.issue_id && (
                          <button
                            onClick={() => navigate(`/issues/${ev.issue_id}`)}
                            className="px-2 py-1 rounded text-[11px] font-semibold bg-primary/10 hover:bg-primary/20 text-primary flex items-center gap-1 transition-colors"
                          >
                            <span>Issue</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      <div className="pt-2 border-t border-outline-variant/60 flex items-center justify-between text-xs text-on-surface-variant font-mono">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-blue-400" />
                          {ev.location.lat.toFixed(5)}, {ev.location.lng.toFixed(5)}
                        </span>
                        <span className="text-status-healthy font-semibold">
                          {ev.issue_status ?? 'Registered'}
                        </span>
                      </div>
                    </div>
                  </GlassPanel>
                );
              })}
            </div>
          )}
        </motion.div>
      )}

      {/* ── Error State Display ── */}
      {activeJob && activeJob.status === 'failed' && (
        <div className="p-6 rounded-lg bg-red-500/10 border border-red-500/30 text-center space-y-3">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto" />
          <h3 className="text-sm font-bold text-on-surface">Inspection Pipeline Failed</h3>
          <p className="text-xs text-on-surface-variant max-w-md mx-auto">
            {activeJob.error || 'An unexpected failure occurred while running YOLO inference or PostGIS spatial fusion.'}
          </p>
          <button
            onClick={handleStartInspection}
            className="px-4 py-2 bg-primary text-on-primary rounded text-xs font-semibold hover:bg-primary/90 transition-colors"
          >
            Retry Inspection
          </button>
        </div>
      )}
    </div>
  );
}
