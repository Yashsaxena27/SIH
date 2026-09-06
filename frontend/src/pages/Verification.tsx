// ============================================================
// Verification Page — Municipal Accountability Workflow
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, AlertTriangle, Camera, Cpu, Bus, 
  CheckCircle, XCircle, Clock, Check, ArrowRight,
  ShieldAlert, Wrench, Search, PenTool, Layers, MapPin
} from 'lucide-react';
import { GlassPanel, PageHeader, LoadingState, EmptyState } from '@/components/ui';
import { api } from '@/services/api';
import { cn, timeAgo, formatDate } from '@/lib/utils';
import { config } from '@/services/core/config';
import type { Verification, VerificationSummary } from '@/types';

// ── Verification Case Model ───────────────────────────────────

type VerificationCase = {
  id: string;
  type: string;
  location: string;
  status: 'verified' | 'reopened' | 'pending';
  beforeBus: string;
  afterBus: string;
  beforeTime: string;
  afterTime: string;
  confidence: number | null;
  reason?: string;
  beforeEvidenceUrl?: string | null;
  afterEvidenceUrl?: string | null;
  authorityName?: string | null;
  authorityCode?: string | null;
  departmentName?: string | null;
  issueId?: string;
};

export function VerificationPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cases, setCases] = useState<VerificationCase[]>([]);
  const [summary, setSummary] = useState<VerificationSummary | null>(null);
  const [activeCase, setActiveCase] = useState<VerificationCase | null>(null);
  const [sliderPos, setSliderPos] = useState(50);
  const [analysisState, setAnalysisState] = useState(0); // 0: loading, 1: comparing, 2: complete
  const sliderRef = useRef<HTMLDivElement>(null);

  const loadData = () => {
    setLoading(true);
    setError(null);
    Promise.allSettled([
      api.getVerifications(),
      api.getVerificationSummary()
    ]).then(([vRes, sRes]) => {
      const vList: Verification[] = vRes.status === 'fulfilled' && Array.isArray(vRes.value) ? vRes.value : [];
      const vSummary: VerificationSummary | null = sRes.status === 'fulfilled' ? sRes.value : null;

      const mapped: VerificationCase[] = vList.map(v => {
        const anyV = v as any;
        return {
          id: v.id,
          type: anyV.issueType || 'Pothole Defect',
          location: anyV.locationName || anyV.location || v.issueId || 'Monitored Corridor',
          status: v.result === 'resolved' ? 'verified' : (v.result === 'unresolved' ? 'reopened' : 'pending'),
          beforeBus: anyV.busId || 'Fleet Unit',
          afterBus: v.result === 'pending_review' ? 'Pending Reinspection' : (v.busId || 'Fleet Unit'),
          beforeTime: v.timestamp || new Date().toISOString(),
          afterTime: v.timestamp || new Date().toISOString(),
          confidence: v.confidence != null ? Math.round(v.confidence * 100) : null,
          reason: v.notes || (v.result === 'unresolved' ? 'Defect remains visible upon reinspection.' : undefined),
          beforeEvidenceUrl: anyV.beforeEvidenceUrl || null,
          afterEvidenceUrl: anyV.afterEvidenceUrl || null,
          authorityName: anyV.authorityName || null,
          authorityCode: anyV.authorityCode || null,
          departmentName: anyV.departmentName || null,
          issueId: v.issueId
        };
      });

      setCases(mapped);
      setSummary(vSummary);
      if (mapped.length > 0) {
        setActiveCase(mapped[0]);
      } else {
        setActiveCase(null);
      }
      setLoading(false);
    }).catch(err => {
      setError('Failed to load repair verification cases.');
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  // Trigger AI investigation animation on case change
  useEffect(() => {
    if (!activeCase) return;
    setAnalysisState(0);
    setSliderPos(50);
    
    const t1 = setTimeout(() => setAnalysisState(1), 800);
    const t2 = setTimeout(() => {
      setAnalysisState(2);
      // Auto-slide to reveal result
      setSliderPos(activeCase.status === 'verified' ? 95 : 5);
    }, 2200);

    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [activeCase?.id]);

  const handleSliderMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setSliderPos((x / rect.width) * 100);
  };

  if (loading) return <LoadingState message="Loading repair verification telemetry..." size="lg" className="h-full" />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 bg-background">
        <GlassPanel padding="lg" className="max-w-md text-center space-y-4 border-red-500/20 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-status-critical">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-on-surface">Data Unavailable</h2>
          <p className="text-xs text-on-surface-variant leading-relaxed">{error}</p>
          <button 
            onClick={loadData} 
            className="px-4 py-2 bg-primary text-on-primary rounded-xl text-xs font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-2"
          >
            Retry Connection
          </button>
        </GlassPanel>
      </div>
    );
  }

  const statPills = [
    { label: 'Awaiting', count: summary?.pendingReview ?? 0, color: 'text-blue-400 border-blue-500/20 bg-blue-500/10' },
    { label: 'Verified', count: summary?.resolved ?? 0, color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10' },
    { label: 'Partial', count: summary?.partiallyResolved ?? 0, color: 'text-amber-400 border-amber-500/20 bg-amber-500/10' },
    { label: 'Reopened', count: summary?.unresolved ?? 0, color: 'text-red-400 border-red-500/20 bg-red-500/10' },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1920px] mx-auto min-h-[calc(100vh-var(--spacing-header-height))] flex flex-col pb-16">
      
      {/* ── Page Header & Quick Stats Toolbar ────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 flex-shrink-0 pb-2">
        <PageHeader
          title="Repair Verification"
          subtitle="Closing the loop between AI detection, municipal repair, and automated fleet reinspection"
          breadcrumbs={[{ label: 'Operations' }, { label: 'Verification' }]}
        />
        
        {/* Stat Pill Badges */}
        <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-1 lg:pb-0 font-mono">
          {statPills.map(stat => (
            <div key={stat.label} className={cn("border rounded-xl px-4 py-2 flex flex-col min-w-[95px] backdrop-blur-md transition-all hover:scale-105", stat.color)}>
              <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">{stat.label}</span>
              <span className="text-xl font-bold mt-0.5 font-display-metrics">{stat.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main Layout ─────────────────────────────────────── */}
      {cases.length === 0 ? (
        <GlassPanel className="flex-1 flex flex-col items-center justify-center p-12 text-center min-h-[400px]">
          <ShieldCheck className="w-12 h-12 text-on-surface-variant/40 mb-3" />
          <h3 className="text-base font-bold text-on-surface">No Verifications Recorded</h3>
          <p className="text-xs text-on-surface-variant max-w-sm mt-1">
            Automated fleet reinspection records will appear here once municipal road repairs are inspected by buses.
          </p>
        </GlassPanel>
      ) : activeCase ? (
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-6">
        
        {/* Left Panel: Verification Queue */}
        <GlassPanel padding="none" className="w-full lg:w-80 flex flex-col overflow-hidden flex-shrink-0 border-outline-variant/80 shadow-xl rounded-2xl">
          <div className="p-4 border-b border-outline-variant bg-surface-container/40 flex items-center justify-between">
            <h3 className="text-xs font-mono font-bold text-on-surface uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              Verification Queue
            </h3>
            <span className="text-[11px] font-mono font-bold text-on-surface-variant bg-surface-container border border-outline-variant px-2.5 py-0.5 rounded-full">
              {cases.length} cases
            </span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {cases.map(c => {
              const isSelected = activeCase.id === c.id;
              let statusBadge = 'bg-blue-500/10 text-blue-400 border-blue-500/30';
              if (c.status === 'verified') statusBadge = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
              if (c.status === 'reopened') statusBadge = 'bg-red-500/10 text-red-400 border-red-500/30';

              return (
                <button
                  key={c.id}
                  onClick={() => setActiveCase(c)}
                  className={cn(
                    "w-full text-left p-3.5 rounded-xl border transition-all duration-200 group relative overflow-hidden",
                    isSelected 
                      ? "bg-surface-container-high/90 border-primary shadow-[0_0_15px_rgba(59,130,246,0.15)] ring-1 ring-primary/40" 
                      : "bg-surface-container/40 border-outline-variant/60 hover:bg-surface-container-high/60 hover:border-outline-variant"
                  )}
                >
                  {/* Selected Indicator Strip */}
                  {isSelected && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />
                  )}

                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-bold text-on-surface-variant group-hover:text-primary transition-colors">
                      {c.id}
                    </span>
                    <span className={cn("text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border", statusBadge)}>
                      {c.status}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-on-surface mb-1 truncate">{c.type}</div>
                  <div className="text-xs text-on-surface-variant flex items-center gap-1 font-mono">
                    <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="truncate">{c.location}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </GlassPanel>

        {/* Right Panel: Active Investigation Detail */}
        <div className="flex-1 min-w-0 flex flex-col gap-6 overflow-y-auto pb-6 lg:pb-0">
          
          {/* Top Row: Split Screen Comparison Slider & AI Analysis Box */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            
            {/* The Slider Component */}
            <GlassPanel className="xl:col-span-2 overflow-hidden flex flex-col p-0 border-outline-variant">
              <div className="px-4 py-3 border-b border-outline-variant flex items-center justify-between bg-surface-low/50">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold text-on-surface uppercase tracking-widest">Visual Comparison</span>
                </div>
                <div className="text-[10px] font-data-mono text-on-surface-variant/60">{activeCase.id}</div>
              </div>

              <div 
                ref={sliderRef}
                className="relative flex-1 min-h-[300px] cursor-col-resize select-none overflow-hidden bg-background"
                onMouseMove={handleSliderMove}
                onTouchMove={handleSliderMove}
              >
                {/* Before Image (Always on bottom) */}
                <div className="absolute inset-0 bg-surface-lowest flex items-center justify-center overflow-hidden">
                  {activeCase.beforeEvidenceUrl ? (
                    <img 
                      src={config.assetUrl(activeCase.beforeEvidenceUrl)} 
                      alt="Original AI detection" 
                      className="w-full h-full object-contain" 
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-6 text-center text-on-surface-variant font-mono text-xs">
                      <Camera className="w-8 h-8 mb-2 opacity-40 text-primary" />
                      <span>Original Evidence Crop Unavailable</span>
                    </div>
                  )}
                  <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-lg border border-outline-variant z-10 font-mono">
                    <div className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest mb-0.5">Original Detection</div>
                    <div className="text-xs text-on-surface">{formatDate(activeCase.beforeTime, 'medium')}</div>
                  </div>
                </div>

                {/* After Image (Clipped on top) */}
                <div 
                  className="absolute inset-0 border-l-2 border-primary shadow-[-5px_0_20px_rgba(0,0,0,0.5)] z-20 bg-surface-lowest flex items-center justify-center overflow-hidden"
                  style={{ clipPath: `inset(0 0 0 ${sliderPos}%)` }}
                >
                  {activeCase.afterEvidenceUrl ? (
                    <img 
                      src={config.assetUrl(activeCase.afterEvidenceUrl)} 
                      alt="Bus reinspection pass" 
                      className="w-full h-full object-contain" 
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-6 text-center text-on-surface-variant font-mono text-xs">
                      <ShieldCheck className="w-8 h-8 mb-2 opacity-40 text-emerald-400" />
                      <span>Reinspection Field Crop Unavailable</span>
                    </div>
                  )}
                  
                  {activeCase.status !== 'pending' && (
                    <div className="absolute bottom-4 right-4 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-lg border border-outline-variant text-right z-10 font-mono">
                      <div className="text-[10px] text-on-surface-variant uppercase tracking-widest mb-0.5">Bus Reinspection</div>
                      <div className="text-xs text-on-surface">{formatDate(activeCase.afterTime, 'medium')}</div>
                    </div>
                  )}
                </div>

                {/* Slider Handle */}
                <div 
                  className="absolute top-0 bottom-0 w-0.5 bg-primary z-30 pointer-events-none shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                  style={{ left: `${sliderPos}%` }}
                >
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-surface-high border-2 border-primary rounded-full flex items-center justify-center shadow-xl">
                    <div className="flex gap-0.5">
                      <div className="w-0.5 h-3 bg-white/40 rounded-full" />
                      <div className="w-0.5 h-3 bg-white/40 rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            </GlassPanel>

            {/* AI Analysis Box */}
            <GlassPanel padding="none" className="xl:col-span-1 flex flex-col border-primary/30 bg-primary/[0.02] overflow-hidden shadow-2xl rounded-2xl">
              <div className="px-5 py-3.5 border-b border-primary/20 bg-primary/5 flex items-center gap-2">
                <Search className="w-4 h-4 text-primary" />
                <span className="text-xs font-mono font-bold text-on-surface uppercase tracking-wider">AI Vision Analysis</span>
              </div>
              
              <div className="p-6 flex-1 flex flex-col justify-between space-y-6">
                
                {/* Analysis Animation Container */}
                <div className="h-20 flex items-center justify-center">
                  <AnimatePresence mode="wait">
                    {analysisState === 0 && (
                      <motion.div key="state0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-3 font-mono">
                        <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                        <span className="text-xs font-medium text-on-surface-variant">Aligning spatial frames...</span>
                      </motion.div>
                    )}
                    {analysisState === 1 && (
                      <motion.div key="state1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-3 font-mono">
                        <Cpu className="w-5 h-5 text-primary animate-pulse" />
                        <span className="text-xs font-medium text-primary">Running comparative model...</span>
                      </motion.div>
                    )}
                    {analysisState === 2 && (
                      <motion.div key="state2" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full">
                        <div className={cn(
                          "px-4 py-3.5 rounded-xl border flex flex-col items-center justify-center text-center backdrop-blur-md",
                          activeCase.status === 'verified' ? "bg-emerald-500/10 border-emerald-500/30" :
                          activeCase.status === 'reopened' ? "bg-red-500/10 border-red-500/30" : "bg-surface-container border-outline-variant"
                        )}>
                          {activeCase.status === 'verified' ? (
                            <>
                              <CheckCircle className="w-7 h-7 text-emerald-400 mb-1.5" />
                              <div className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">Verified Resolved</div>
                              <div className="text-[11px] text-on-surface-variant mt-0.5">Defect geometry no longer present</div>
                            </>
                          ) : activeCase.status === 'reopened' ? (
                            <>
                              <XCircle className="w-7 h-7 text-red-400 mb-1.5" />
                              <div className="text-xs font-mono font-bold text-red-400 uppercase tracking-wider">Reopened</div>
                              <div className="text-[11px] text-red-400/80 mt-0.5 leading-snug">{activeCase.reason}</div>
                            </>
                          ) : (
                            <>
                              <Clock className="w-7 h-7 text-amber-400 mb-1.5" />
                              <div className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">Pending Reinspection</div>
                              <div className="text-[11px] text-on-surface-variant mt-0.5">Awaiting bus route coverage</div>
                            </>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Metrics Breakdown */}
                <div className="space-y-3.5 pt-4 border-t border-outline-variant/60 font-mono">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-on-surface-variant uppercase tracking-wider font-semibold">Authority</span>
                    <span className="font-bold text-on-surface">
                      {activeCase.authorityCode || activeCase.authorityName || 'Unassigned'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-on-surface-variant uppercase tracking-wider font-semibold">Department</span>
                    <span className="font-bold text-cyan-400">
                      {activeCase.departmentName || 'Municipal Infrastructure'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-on-surface-variant uppercase tracking-wider font-semibold">Repair Confidence</span>
                    <span className="text-base font-bold text-on-surface font-display-metrics">
                      {analysisState === 2 ? (activeCase.confidence != null ? `${activeCase.confidence}%` : 'Unavailable') : '---'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-on-surface-variant uppercase tracking-wider font-semibold">Road Surface Status</span>
                    <span className="font-bold text-on-surface">
                      {analysisState === 2 ? (activeCase.status === 'verified' ? 'Improved' : 'Deteriorated') : 'Analyzing...'}
                    </span>
                  </div>
                </div>

              </div>
            </GlassPanel>
          </div>

          {/* Bottom Row: Bus Revisit Tracking & Workflow Timeline */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            
            {/* Fleet Revisit Verification Panel */}
            <GlassPanel padding="md" className="border-outline-variant/80 shadow-2xl rounded-2xl">
              <h3 className="text-xs font-mono font-bold text-on-surface uppercase tracking-wider mb-5 flex items-center gap-2">
                <Bus className="w-4 h-4 text-primary" /> Fleet Revisit Tracking
              </h3>
              
              <div className="flex items-center gap-3 relative">
                
                {/* Original Bus */}
                <div className="flex-1 bg-surface-container/60 border border-outline-variant rounded-xl p-3.5 relative z-10 font-mono">
                  <div className="text-[10px] text-on-surface-variant uppercase tracking-wider mb-2 font-bold">Original Detection</div>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                      <Bus className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-on-surface">{activeCase.beforeBus}</div>
                      <div className="text-[11px] text-on-surface-variant">{formatDate(activeCase.beforeTime, 'short')}</div>
                    </div>
                  </div>
                </div>

                {/* Arrow Connector */}
                <div className="flex-shrink-0 flex flex-col items-center justify-center z-10 text-on-surface-variant/60">
                  <Clock className="w-3.5 h-3.5 mb-0.5 text-primary" />
                  <ArrowRight className="w-4 h-4 text-on-surface-variant" />
                </div>

                {/* Reinspection Bus */}
                <div className={cn(
                  "flex-1 border rounded-xl p-3.5 relative z-10 transition-colors font-mono",
                  activeCase.status !== 'pending' ? "bg-surface-container/60 border-outline-variant" : "bg-transparent border-dashed border-outline-variant/60"
                )}>
                  <div className="text-[10px] text-on-surface-variant uppercase tracking-wider mb-2 font-bold">Reinspection Pass</div>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center border shrink-0",
                      activeCase.status !== 'pending' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-surface-container border-outline-variant text-on-surface-variant/40"
                    )}>
                      <Bus className="w-4 h-4" />
                    </div>
                    <div>
                      <div className={cn("text-xs font-bold", activeCase.status !== 'pending' ? "text-on-surface" : "text-on-surface-variant/60")}>
                        {activeCase.afterBus}
                      </div>
                      <div className="text-[11px] text-on-surface-variant">
                        {activeCase.status !== 'pending' ? formatDate(activeCase.afterTime, 'short') : 'Awaiting coverage'}
                      </div>
                    </div>
                  </div>
                </div>
                
              </div>

              <div className="mt-4 px-4 py-2.5 bg-surface-container/40 rounded-xl border border-outline-variant/60 text-xs text-on-surface-variant text-center font-mono">
                System automatically pairs original observations with subsequent fleet passes on the same spatial segment.
              </div>
            </GlassPanel>

            {/* Vertical Workflow Timeline */}
            <GlassPanel padding="md" className="border-outline-variant/80 shadow-2xl rounded-2xl">
              <h3 className="text-xs font-mono font-bold text-on-surface uppercase tracking-wider mb-5">Workflow Audit Trail</h3>
              
              <div className="relative pl-4 space-y-4 font-mono">
                <div className="absolute left-[21px] top-4 bottom-4 w-0.5 bg-surface-container-high" />

                {[
                  { label: activeCase.status === 'verified' ? 'Verified Resolved' : activeCase.status === 'reopened' ? 'Reopened' : 'Pending AI Comparison', active: true, icon: activeCase.status === 'verified' ? CheckCircle : activeCase.status === 'reopened' ? XCircle : Clock, color: activeCase.status === 'verified' ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10' : activeCase.status === 'reopened' ? 'text-red-400 border-red-500/40 bg-red-500/10' : 'text-amber-400 border-amber-500/40 bg-amber-500/10' },
                  { label: 'AI Comparison Analysis', active: activeCase.status !== 'pending', icon: Cpu, color: 'text-primary border-primary/40 bg-primary/10' },
                  { label: 'Bus Revisited Location', active: activeCase.status !== 'pending', icon: Bus, color: 'text-blue-400 border-blue-500/40 bg-blue-500/10' },
                  { label: 'Repair Reported', active: true, icon: Check, color: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10' },
                  { label: 'Repair Assigned', active: true, icon: Wrench, color: 'text-purple-400 border-purple-500/40 bg-purple-500/10' },
                  { label: 'Ticket Created', active: true, icon: PenTool, color: 'text-on-surface-variant border-outline-variant bg-surface-container' },
                  { label: 'Initial Detection', active: true, icon: ShieldAlert, color: 'text-amber-400 border-amber-500/40 bg-amber-500/10' },
                ].map((step, idx) => (
                  <div key={idx} className="relative pl-8 flex items-center">
                    <div className={cn(
                      "absolute left-[-11px] w-6 h-6 rounded-full flex items-center justify-center border text-xs shadow-sm",
                      step.active ? step.color : "border-outline-variant/40 bg-surface-container text-on-surface-variant/40"
                    )}>
                      <step.icon className="w-3.5 h-3.5" />
                    </div>
                    <div className={cn("text-xs font-semibold", step.active ? "text-on-surface" : "text-on-surface-variant/40")}>
                      {step.label}
                    </div>
                  </div>
                ))}
              </div>
            </GlassPanel>

          </div>

        </div>
      </div>
      ) : null}
    </div>
  );
}

