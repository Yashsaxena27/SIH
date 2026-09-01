// ============================================================
// Verification Page — Municipal Accountability Workflow
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, AlertTriangle, Camera, Cpu, Bus, 
  CheckCircle, XCircle, Clock, Check, ArrowRight,
  ShieldAlert, Wrench, Search, PenTool
} from 'lucide-react';
import { GlassPanel, PageHeader, LoadingState } from '@/components/ui';
import { cn, timeAgo, formatDate } from '@/lib/utils';

// ── Simulated Road Imagery ──────────────────────────────────
interface RoadImageProps {
  type: 'before' | 'after_success' | 'after_fail';
}

function SimulatedRoadImage({ type }: RoadImageProps) {
  return (
    <div className="absolute inset-0 w-full h-full bg-[#1a1a24] overflow-hidden">
      {/* Asphalt noise */}
      <div className="absolute inset-0 opacity-[0.15]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }} />
      
      {type === 'before' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-32 h-24">
            {/* Pothole shape */}
            <div className="absolute inset-0 bg-[#0a0a0f] rounded-[40%_60%_70%_30%/40%_50%_60%_50%] shadow-[inset_0_10px_20px_rgba(0,0,0,0.8)]" />
            <div className="absolute inset-2 bg-[#050508] rounded-[30%_70%_50%_50%/50%_40%_60%_40%] shadow-[inset_0_5px_10px_rgba(0,0,0,0.9)]" />
            {/* Bounding Box */}
            <div className="absolute -inset-4 border-2 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]">
              <div className="absolute -top-6 left-[-2px] bg-red-500 text-black text-[10px] font-mono font-bold px-1.5 py-0.5 uppercase">
                DEFECT_DETECTED
              </div>
            </div>
          </div>
        </div>
      )}

      {type === 'after_success' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-36 h-28">
            {/* Repaired patch shape */}
            <div className="absolute inset-0 bg-[#2a2a35] rounded-[35%_65%_65%_35%/45%_55%_55%_45%] border border-white/5" />
            {/* Bounding Box */}
            <div className="absolute -inset-2 border-2 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              <div className="absolute -top-6 left-[-2px] bg-emerald-500 text-black text-[10px] font-mono font-bold px-1.5 py-0.5 uppercase">
                SURFACE_REPAIRED
              </div>
            </div>
          </div>
        </div>
      )}

      {type === 'after_fail' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-32 h-24">
            {/* Same pothole shape */}
            <div className="absolute inset-0 bg-[#0a0a0f] rounded-[40%_60%_70%_30%/40%_50%_60%_50%] shadow-[inset_0_10px_20px_rgba(0,0,0,0.8)]" />
            <div className="absolute inset-2 bg-[#050508] rounded-[30%_70%_50%_50%/50%_40%_60%_40%] shadow-[inset_0_5px_10px_rgba(0,0,0,0.9)]" />
            {/* Bounding Box */}
            <div className="absolute -inset-4 border-2 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]">
              <div className="absolute -top-6 left-[-2px] bg-red-500 text-black text-[10px] font-mono font-bold px-1.5 py-0.5 uppercase">
                DEFECT_PERSISTS
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Overlay vignette */}
      <div className="absolute inset-0 shadow-[inset_0_0_100px_rgba(0,0,0,0.9)] pointer-events-none" />
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────

type VerificationCase = {
  id: string;
  type: string;
  location: string;
  status: 'verified' | 'reopened' | 'pending';
  beforeBus: string;
  afterBus: string;
  beforeTime: string;
  afterTime: string;
  confidence: number;
  reason?: string;
};

const mockCases: VerificationCase[] = [
  {
    id: 'VRF-8842',
    type: 'Critical Pothole',
    location: 'MG Road, Sector 14',
    status: 'verified',
    beforeBus: 'BUS-017',
    afterBus: 'BUS-029',
    beforeTime: '2026-08-28T09:32:00Z',
    afterTime: '2026-09-01T10:15:00Z',
    confidence: 94.2
  },
  {
    id: 'VRF-8843',
    type: 'Deep Pothole',
    location: 'Ring Road, Near Flyover',
    status: 'reopened',
    beforeBus: 'BUS-042',
    afterBus: 'BUS-011',
    beforeTime: '2026-08-29T11:20:00Z',
    afterTime: '2026-09-01T14:30:00Z',
    confidence: 88.7,
    reason: 'Defect remains visible. Repair reported but not executed.'
  },
  {
    id: 'VRF-8844',
    type: 'Road Crack',
    location: 'Vikas Marg',
    status: 'pending',
    beforeBus: 'BUS-033',
    afterBus: 'PENDING',
    beforeTime: '2026-08-30T08:15:00Z',
    afterTime: 'PENDING',
    confidence: 0
  }
];

export function VerificationPage() {
  const [activeCase, setActiveCase] = useState<VerificationCase>(mockCases[0]);
  const [sliderPos, setSliderPos] = useState(50);
  const [analysisState, setAnalysisState] = useState(0); // 0: loading, 1: comparing, 2: complete
  const sliderRef = useRef<HTMLDivElement>(null);

  // Trigger AI investigation animation on case change
  useEffect(() => {
    setAnalysisState(0);
    setSliderPos(50);
    
    const t1 = setTimeout(() => setAnalysisState(1), 800);
    const t2 = setTimeout(() => {
      setAnalysisState(2);
      // Auto-slide to reveal result
      setSliderPos(activeCase.status === 'verified' ? 95 : 5);
    }, 2500);

    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [activeCase.id]);

  const handleSliderMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setSliderPos((x / rect.width) * 100);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1920px] mx-auto h-[calc(100vh-3.5rem)] flex flex-col">
      
      {/* ── Hero / Header ───────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-white/95 tracking-tight flex items-center gap-3">
            Repair Verification
          </h1>
          <p className="text-sm text-white/40 mt-1 font-medium">Closing the loop between detection and resolution.</p>
        </div>
        
        <div className="flex gap-2 sm:gap-4 overflow-x-auto pb-2 sm:pb-0 scrollbar-none">
          {[
            { label: 'Awaiting', count: 12, color: 'text-blue-400' },
            { label: 'Verified', count: 8, color: 'text-emerald-400' },
            { label: 'Pending', count: 3, color: 'text-yellow-400' },
            { label: 'Reopened', count: 1, color: 'text-red-400' },
          ].map(stat => (
            <div key={stat.label} className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-2 flex flex-col min-w-[100px]">
              <span className="text-[10px] uppercase font-bold tracking-widest text-white/40">{stat.label}</span>
              <span className={cn("text-xl font-bold mt-1", stat.color)}>{stat.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main Layout ─────────────────────────────────────── */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-6">
        
        {/* Left: Queue */}
        <GlassPanel className="w-full lg:w-80 flex flex-col overflow-hidden flex-shrink-0">
          <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
            <h3 className="text-xs font-bold text-white/70 uppercase tracking-widest">Verification Queue</h3>
            <span className="text-[10px] text-white/40 bg-white/[0.05] px-2 py-0.5 rounded-full">{mockCases.length} cases</span>
          </div>
          
          <div className="flex-1 overflow-y-auto scrollbar-none p-2 space-y-2">
            {mockCases.map(c => (
              <button
                key={c.id}
                onClick={() => setActiveCase(c)}
                className={cn(
                  "w-full text-left p-3 rounded-xl border transition-all duration-200",
                  activeCase.id === c.id 
                    ? "bg-white/[0.08] border-white/[0.15] shadow-lg" 
                    : "bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.05]"
                )}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-mono text-white/50">{c.id}</span>
                  <span className={cn(
                    "text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full",
                    c.status === 'verified' ? 'bg-emerald-500/20 text-emerald-400' :
                    c.status === 'reopened' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'
                  )}>
                    {c.status}
                  </span>
                </div>
                <div className="text-sm font-bold text-white/90 mb-0.5">{c.type}</div>
                <div className="text-xs text-white/40 truncate">{c.location}</div>
              </button>
            ))}
          </div>
        </GlassPanel>

        {/* Right: Active Investigation */}
        <div className="flex-1 min-w-0 flex flex-col gap-6 overflow-y-auto scrollbar-none pb-10 lg:pb-0">
          
          {/* Top: Before/After & AI Box */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            
            {/* The Slider Component */}
            <GlassPanel className="xl:col-span-2 overflow-hidden flex flex-col p-0 border-white/[0.1]">
              <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between bg-surface-raised/50">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-accent-primary" />
                  <span className="text-xs font-bold text-white/80 uppercase tracking-widest">Visual Comparison</span>
                </div>
                <div className="text-[10px] font-mono text-white/30">{activeCase.id}</div>
              </div>

              <div 
                ref={sliderRef}
                className="relative flex-1 min-h-[300px] cursor-col-resize select-none overflow-hidden bg-[#09090b]"
                onMouseMove={handleSliderMove}
                onTouchMove={handleSliderMove}
              >
                {/* Before Image (Always on bottom) */}
                <div className="absolute inset-0">
                  <SimulatedRoadImage type="before" />
                  <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/[0.1] z-10">
                    <div className="text-[10px] text-white/40 uppercase font-bold tracking-widest mb-0.5">Original Detection</div>
                    <div className="text-xs text-white/80 font-mono">{formatDate(activeCase.beforeTime, 'medium')}</div>
                  </div>
                </div>

                {/* After Image (Clipped on top) */}
                <div 
                  className="absolute inset-0 border-l-2 border-accent-primary shadow-[-5px_0_20px_rgba(0,0,0,0.5)] z-20"
                  style={{ clipPath: `inset(0 0 0 ${sliderPos}%)` }}
                >
                  <SimulatedRoadImage type={activeCase.status === 'verified' ? 'after_success' : activeCase.status === 'reopened' ? 'after_fail' : 'before'} />
                  
                  {activeCase.status !== 'pending' && (
                    <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/[0.1] text-right z-10">
                      <div className="text-[10px] text-white/40 uppercase font-bold tracking-widest mb-0.5">Bus Reinspection</div>
                      <div className="text-xs text-white/80 font-mono">{formatDate(activeCase.afterTime, 'medium')}</div>
                    </div>
                  )}
                </div>

                {/* Slider Handle */}
                <div 
                  className="absolute top-0 bottom-0 w-0.5 bg-accent-primary z-30 pointer-events-none shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                  style={{ left: `${sliderPos}%` }}
                >
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-surface-elevated border-2 border-accent-primary rounded-full flex items-center justify-center shadow-xl">
                    <div className="flex gap-0.5">
                      <div className="w-0.5 h-3 bg-white/40 rounded-full" />
                      <div className="w-0.5 h-3 bg-white/40 rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            </GlassPanel>

            {/* AI Analysis Box */}
            <GlassPanel className="xl:col-span-1 flex flex-col border-accent-primary/20 bg-accent-primary/[0.02] overflow-hidden">
              <div className="px-4 py-3 border-b border-accent-primary/[0.1] flex items-center gap-2">
                <Search className="w-4 h-4 text-accent-primary" />
                <span className="text-xs font-bold text-white/80 uppercase tracking-widest">AI Analysis</span>
              </div>
              
              <div className="p-5 flex-1 flex flex-col justify-center space-y-6">
                
                {/* Analysis State Animation */}
                <div className="h-16 flex items-center">
                  <AnimatePresence mode="wait">
                    {analysisState === 0 && (
                      <motion.div key="state0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-3">
                        <div className="w-5 h-5 border-2 border-white/20 border-t-accent-primary rounded-full animate-spin" />
                        <span className="text-sm font-medium text-white/50">Aligning spatial frames...</span>
                      </motion.div>
                    )}
                    {analysisState === 1 && (
                      <motion.div key="state1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-3">
                        <Cpu className="w-5 h-5 text-accent-primary animate-pulse" />
                        <span className="text-sm font-medium text-accent-primary-hover">Running comparative vision model...</span>
                      </motion.div>
                    )}
                    {analysisState === 2 && (
                      <motion.div key="state2" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full">
                        <div className={cn(
                          "px-4 py-3 rounded-lg border flex flex-col items-center justify-center text-center",
                          activeCase.status === 'verified' ? "bg-emerald-500/10 border-emerald-500/30" :
                          activeCase.status === 'reopened' ? "bg-red-500/10 border-red-500/30" : "bg-white/[0.05] border-white/[0.1]"
                        )}>
                          {activeCase.status === 'verified' ? (
                            <>
                              <CheckCircle className="w-8 h-8 text-emerald-400 mb-2" />
                              <div className="text-sm font-bold text-emerald-400 uppercase tracking-widest">Verified Resolved</div>
                              <div className="text-xs text-white/60 mt-1">Defect geometry no longer present</div>
                            </>
                          ) : activeCase.status === 'reopened' ? (
                            <>
                              <XCircle className="w-8 h-8 text-red-400 mb-2" />
                              <div className="text-sm font-bold text-red-400 uppercase tracking-widest">Reopened</div>
                              <div className="text-xs text-red-400/60 mt-1">{activeCase.reason}</div>
                            </>
                          ) : (
                            <>
                              <Clock className="w-8 h-8 text-yellow-400 mb-2" />
                              <div className="text-sm font-bold text-yellow-400 uppercase tracking-widest">Pending Reinspection</div>
                              <div className="text-xs text-white/60 mt-1">Awaiting bus route coverage</div>
                            </>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="space-y-4 pt-4 border-t border-white/[0.06]">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-white/40 uppercase tracking-wider font-semibold">Repair Confidence</span>
                    <span className="text-lg font-bold text-white/90">
                      {analysisState === 2 ? `${activeCase.confidence}%` : '---'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-white/40 uppercase tracking-wider font-semibold">Road Surface</span>
                    <span className="text-sm font-medium text-white/80">
                      {analysisState === 2 ? (activeCase.status === 'verified' ? 'Improved' : 'Deteriorated') : 'Analyzing...'}
                    </span>
                  </div>
                </div>

              </div>
            </GlassPanel>
          </div>

          {/* Bottom: Bus Revisit Story & Timeline */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            
            {/* Fleet Revisit Verification Panel */}
            <GlassPanel padding="md">
              <h3 className="text-xs font-bold text-white/70 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Bus className="w-4 h-4 text-accent-secondary" /> Fleet Revisit Tracking
              </h3>
              
              <div className="flex items-center gap-4 relative">
                
                {/* Original Bus */}
                <div className="flex-1 bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 relative z-10">
                  <div className="text-[10px] text-white/30 uppercase tracking-widest mb-2 font-bold">Original Detection</div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                      <Bus className="w-4 h-4 text-orange-400" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white/90 font-mono">{activeCase.beforeBus}</div>
                      <div className="text-xs text-white/40">{formatDate(activeCase.beforeTime, 'short')}</div>
                    </div>
                  </div>
                </div>

                {/* Connection */}
                <div className="flex-shrink-0 flex flex-col items-center justify-center z-10 text-white/20">
                  <Clock className="w-4 h-4 mb-1" />
                  <div className="h-px w-8 bg-white/10" />
                  <ArrowRight className="w-4 h-4 mt-1" />
                </div>

                {/* Connection Line Behind */}
                <div className="absolute left-1/4 right-1/4 top-1/2 h-px bg-white/[0.05] z-0 border-dashed border-t border-white/[0.1]" />

                {/* Reinspection Bus */}
                <div className={cn(
                  "flex-1 border rounded-xl p-4 relative z-10 transition-colors",
                  activeCase.status !== 'pending' ? "bg-white/[0.02] border-white/[0.06]" : "bg-transparent border-dashed border-white/[0.1]"
                )}>
                  <div className="text-[10px] text-white/30 uppercase tracking-widest mb-2 font-bold">Reinspection</div>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center border",
                      activeCase.status !== 'pending' ? "bg-accent-secondary/10 border-accent-secondary/20 text-accent-secondary" : "bg-white/[0.02] border-white/[0.1] text-white/20"
                    )}>
                      <Bus className="w-4 h-4" />
                    </div>
                    <div>
                      <div className={cn("text-sm font-bold font-mono", activeCase.status !== 'pending' ? "text-white/90" : "text-white/30")}>
                        {activeCase.afterBus}
                      </div>
                      <div className="text-xs text-white/40">
                        {activeCase.status !== 'pending' ? formatDate(activeCase.afterTime, 'short') : 'Awaiting coverage'}
                      </div>
                    </div>
                  </div>
                </div>
                
              </div>

              <div className="mt-4 px-4 py-3 bg-white/[0.03] rounded-lg border border-white/[0.05] text-xs text-white/50 text-center">
                System automatically pairs original observations with subsequent fleet passes on the same spatial segment to confirm repairs without manual intervention.
              </div>
            </GlassPanel>

            {/* Vertical Timeline */}
            <GlassPanel padding="md">
              <h3 className="text-xs font-bold text-white/70 uppercase tracking-widest mb-6">Workflow Timeline</h3>
              
              <div className="relative pl-4 space-y-5">
                <div className="absolute left-[23px] top-4 bottom-4 w-0.5 bg-white/[0.06]" />

                {[
                  { label: activeCase.status === 'verified' ? 'Verified Resolved' : activeCase.status === 'reopened' ? 'Reopened' : 'Pending AI Comparison', active: true, icon: activeCase.status === 'verified' ? CheckCircle : activeCase.status === 'reopened' ? XCircle : Clock, color: activeCase.status === 'verified' ? 'text-emerald-400' : activeCase.status === 'reopened' ? 'text-red-400' : 'text-yellow-400' },
                  { label: 'AI Comparison Analysis', active: activeCase.status !== 'pending', icon: Cpu, color: 'text-accent-primary-hover' },
                  { label: 'Bus Revisited Location', active: activeCase.status !== 'pending', icon: Bus, color: 'text-accent-secondary' },
                  { label: 'Repair Reported', active: true, icon: Check, color: 'text-blue-400' },
                  { label: 'Repair Assigned', active: true, icon: Wrench, color: 'text-purple-400' },
                  { label: 'Ticket Created', active: true, icon: PenTool, color: 'text-white/60' },
                  { label: 'Initial Detection', active: true, icon: ShieldAlert, color: 'text-orange-400' },
                ].map((step, idx) => (
                  <div key={idx} className="relative pl-8">
                    <div className={cn(
                      "absolute left-[-11px] top-[-2px] w-7 h-7 rounded-full flex items-center justify-center border-2 bg-surface-raised",
                      step.active ? `border-white/[0.1] ${step.color}` : "border-white/[0.04] text-white/20"
                    )}>
                      <step.icon className="w-3.5 h-3.5" />
                    </div>
                    <div className={cn("text-sm font-medium", step.active ? "text-white/90" : "text-white/30")}>
                      {step.label}
                    </div>
                  </div>
                ))}
              </div>
            </GlassPanel>

          </div>

        </div>
      </div>
    </div>
  );
}
