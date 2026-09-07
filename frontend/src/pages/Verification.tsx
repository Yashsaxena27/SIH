// ============================================================
// Verification Page — Municipal Closed-Loop Accountability Workflow
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, AlertTriangle, Camera, Cpu, Bus, 
  CheckCircle, XCircle, Clock, Check, ArrowRight,
  ShieldAlert, Wrench, Search, PenTool, Layers, MapPin,
  HelpCircle, RefreshCw, ExternalLink, SlidersHorizontal, UserCheck
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { GlassPanel, PageHeader, LoadingState, EmptyState } from '@/components/ui';
import { api } from '@/services/api';
import { verificationService } from '@/services/modules/ticketing';
import { cn, timeAgo, formatDate } from '@/lib/utils';
import { config } from '@/services/core/config';
import type { Verification, VerificationSummary, VerificationResult } from '@/types';

type FilterTab = 'ALL' | 'PENDING' | 'INCONCLUSIVE' | 'UNRESOLVED' | 'RESOLVED';

export function VerificationPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [summary, setSummary] = useState<VerificationSummary | null>(null);
  const [activeCase, setActiveCase] = useState<Verification | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<FilterTab>('ALL');
  const [sliderPos, setSliderPos] = useState(50);
  const sliderRef = useRef<HTMLDivElement>(null);

  // Operator Action Modals
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideOutcome, setOverrideOutcome] = useState<'resolved' | 'unresolved'>('resolved');
  const [overrideRationale, setOverrideRationale] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Trigger Reinspection Modal
  const [showReinspectModal, setShowReinspectModal] = useState(false);
  const [reinspectCoverage, setReinspectCoverage] = useState(true);
  const [reinspectQuality, setReinspectQuality] = useState<'SUFFICIENT' | 'DEGRADED'>('SUFFICIENT');
  const [reinspectHasDefect, setReinspectHasDefect] = useState(false);

  const loadData = () => {
    setLoading(true);
    setError(null);
    Promise.allSettled([
      verificationService.getVerifications(),
      verificationService.getVerificationSummary()
    ]).then(([vRes, sRes]) => {
      const vList: Verification[] = vRes.status === 'fulfilled' && Array.isArray(vRes.value) ? vRes.value : [];
      const vSummary: VerificationSummary | null = sRes.status === 'fulfilled' ? sRes.value : null;

      setVerifications(vList);
      setSummary(vSummary);
      if (vList.length > 0) {
        setActiveCase(vList[0]);
      } else {
        setActiveCase(null);
      }
      setLoading(false);
    }).catch(() => {
      setError('Failed to load repair verification telemetry.');
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
    const handleMutation = () => loadData();
    window.addEventListener('muin:mutation', handleMutation);
    return () => window.removeEventListener('muin:mutation', handleMutation);
  }, []);

  const handleSliderMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setSliderPos((x / rect.width) * 100);
  };

  const handleApplyOverride = async () => {
    if (!activeCase || !overrideRationale.trim()) return;
    setActionLoading(true);
    setActionMessage(null);
    try {
      await verificationService.overrideVerification(activeCase.id, {
        result: overrideOutcome,
        rationale: overrideRationale.trim()
      });
      setShowOverrideModal(false);
      setOverrideRationale('');
      setActionMessage(`Override successfully applied: ${overrideOutcome.toUpperCase()}`);
      loadData();
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.message || 'Override rejected';
      setActionMessage(`Override failed: ${detail}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleTriggerReinspection = async () => {
    if (!activeCase || !activeCase.issueId) return;
    setActionLoading(true);
    setActionMessage(null);
    try {
      await verificationService.triggerReinspection({
        issue_id: activeCase.issueId,
        bus_id: 'BUS-001',
        coverage_confirmed: reinspectCoverage,
        evidence_quality: reinspectQuality,
        new_detection: reinspectHasDefect ? { confidence: 0.91, evidence_url: '/mock-evidence/still-broken.jpg' } : null,
        reinspection_evidence_url: reinspectHasDefect ? '/mock-evidence/still-broken.jpg' : '/mock-evidence/reinspection-clear.jpg',
        notes: `Manual reinspection run: Coverage=${reinspectCoverage}, Quality=${reinspectQuality}, Defect=${reinspectHasDefect}`
      });
      setShowReinspectModal(false);
      setActionMessage('Reinspection pass evaluated successfully.');
      loadData();
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.message || 'Reinspection trigger failed';
      setActionMessage(`Reinspection failed: ${detail}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Filter verification cases
  const filteredCases = verifications.filter(v => {
    if (selectedFilter === 'ALL') return true;
    if (selectedFilter === 'PENDING') return v.result === 'pending_review';
    if (selectedFilter === 'RESOLVED') return v.result === 'resolved';
    if (selectedFilter === 'UNRESOLVED') return v.result === 'unresolved';
    if (selectedFilter === 'INCONCLUSIVE') return v.result === 'inconclusive';
    return true;
  });

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
    { label: 'Awaiting', count: summary?.pendingReview ?? 0, color: 'text-blue-400 border-blue-500/20 bg-blue-500/10', filter: 'PENDING' as FilterTab },
    { label: 'Verified', count: summary?.resolved ?? 0, color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10', filter: 'RESOLVED' as FilterTab },
    { label: 'Inconclusive', count: summary?.inconclusive ?? 0, color: 'text-amber-400 border-amber-500/20 bg-amber-500/10', filter: 'INCONCLUSIVE' as FilterTab },
    { label: 'Unresolved', count: summary?.unresolved ?? 0, color: 'text-rose-400 border-rose-500/20 bg-rose-500/10', filter: 'UNRESOLVED' as FilterTab },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1920px] mx-auto min-h-[calc(100vh-var(--spacing-header-height))] flex flex-col pb-16">
      
      {/* ── Page Header & Quick Stats Toolbar ────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 flex-shrink-0 pb-2">
        <PageHeader
          title="Closed-Loop Verification 2.0"
          subtitle="Repair → Automated Fleet Reinspection → Evidence-Driven Municipal Resolution"
          breadcrumbs={[{ label: 'Operations' }, { label: 'Verification' }]}
        />
        
        {/* Stat Pill Badges */}
        <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-1 lg:pb-0 font-mono">
          {statPills.map(stat => (
            <button
              key={stat.label}
              onClick={() => setSelectedFilter(stat.filter)}
              className={cn(
                "border rounded-xl px-4 py-2 flex flex-col min-w-[100px] backdrop-blur-md transition-all text-left",
                stat.color,
                selectedFilter === stat.filter ? "ring-2 ring-primary scale-105" : "hover:opacity-80"
              )}
            >
              <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">{stat.label}</span>
              <span className="text-xl font-bold mt-0.5 font-display-metrics">{stat.count}</span>
            </button>
          ))}
        </div>
      </div>

      {actionMessage && (
        <div className="px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant text-xs font-mono text-cyan-300 flex items-center justify-between">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage(null)} className="text-on-surface-variant hover:text-on-surface">Dismiss</button>
        </div>
      )}

      {/* ── Filter Tabs Bar ──────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-outline-variant pb-2 overflow-x-auto">
        {(['ALL', 'PENDING', 'INCONCLUSIVE', 'UNRESOLVED', 'RESOLVED'] as FilterTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setSelectedFilter(tab)}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider font-bold transition-all",
              selectedFilter === tab
                ? "bg-primary text-on-primary shadow-sm"
                : "bg-surface-container/60 text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
            )}
          >
            {tab}
          </button>
        ))}
        <span className="text-[11px] font-mono text-on-surface-variant ml-auto">
          Showing {filteredCases.length} of {verifications.length} records
        </span>
      </div>

      {/* ── Main Layout ─────────────────────────────────────── */}
      {verifications.length === 0 ? (
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
        <GlassPanel padding="none" className="w-full lg:w-88 flex flex-col overflow-hidden flex-shrink-0 border-outline-variant/80 shadow-xl rounded-2xl">
          <div className="p-4 border-b border-outline-variant bg-surface-container/40 flex items-center justify-between">
            <h3 className="text-xs font-mono font-bold text-on-surface uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              Verification Queue
            </h3>
            <span className="text-[11px] font-mono font-bold text-on-surface-variant bg-surface-container border border-outline-variant px-2.5 py-0.5 rounded-full">
              {filteredCases.length}
            </span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {filteredCases.map(c => {
              const isSelected = activeCase.id === c.id;
              let statusBadge = 'bg-blue-500/10 text-blue-400 border-blue-500/30';
              if (c.result === 'resolved') statusBadge = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
              if (c.result === 'unresolved') statusBadge = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
              if (c.result === 'inconclusive') statusBadge = 'bg-amber-500/10 text-amber-400 border-amber-500/30';

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
                  {isSelected && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />
                  )}

                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-mono font-bold text-on-surface-variant group-hover:text-primary transition-colors">
                      {c.id}
                    </span>
                    <span className={cn("text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border", statusBadge)}>
                      {c.result}
                    </span>
                  </div>
                  
                  <div className="text-sm font-bold text-on-surface mb-1 truncate flex items-center justify-between">
                    <span>{c.issueId || 'Defect'}</span>
                    {c.isOverride && (
                      <span className="text-[9px] font-mono text-purple-400 bg-purple-500/10 border border-purple-500/30 px-1.5 py-0.2 rounded">OVERRIDE</span>
                    )}
                  </div>
                  
                  <div className="text-xs text-on-surface-variant flex items-center gap-1 font-mono truncate">
                    <Bus className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>Bus: {c.busId || 'N/A'}</span>
                    <span className="mx-1">•</span>
                    <span>{c.timestamp ? timeAgo(c.timestamp) : 'Logged'}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </GlassPanel>

        {/* Right Panel: Active Investigation Detail */}
        <div className="flex-1 min-w-0 flex flex-col gap-6 overflow-y-auto pb-6 lg:pb-0">
          
          {/* Top Row: Split Screen Comparison Slider & AI/Decision Box */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            
            {/* The Before/After Slider Component */}
            <GlassPanel className="xl:col-span-2 overflow-hidden flex flex-col p-0 border-outline-variant shadow-xl">
              <div className="px-4 py-3 border-b border-outline-variant flex items-center justify-between bg-surface-low/50">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold text-on-surface uppercase tracking-widest font-mono">Field Evidence Comparison</span>
                </div>
                <div className="text-[10px] font-mono text-on-surface-variant/80">{activeCase.id}</div>
              </div>

              <div 
                ref={sliderRef}
                className="relative flex-1 min-h-[340px] cursor-col-resize select-none overflow-hidden bg-background"
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
                  <div className="absolute bottom-4 left-4 bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-lg border border-outline-variant z-10 font-mono">
                    <div className="text-[10px] text-amber-400 uppercase font-bold tracking-widest mb-0.5">Original Defect</div>
                    <div className="text-xs text-on-surface">{activeCase.timestamp ? formatDate(activeCase.timestamp, 'medium') : 'Recorded'}</div>
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
                  
                  <div className="absolute bottom-4 right-4 bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-lg border border-outline-variant text-right z-10 font-mono">
                    <div className="text-[10px] text-primary uppercase font-bold tracking-widest mb-0.5">Reinspection Pass</div>
                    <div className="text-xs text-on-surface">Bus {activeCase.busId || 'N/A'}</div>
                  </div>
                </div>

                {/* Slider Handle */}
                <div 
                  className="absolute top-0 bottom-0 w-0.5 bg-primary z-30 pointer-events-none shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                  style={{ left: `${sliderPos}%` }}
                >
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-surface-high border-2 border-primary rounded-full flex items-center justify-center shadow-xl">
                    <div className="flex gap-0.5">
                      <div className="w-0.5 h-3 bg-white/60 rounded-full" />
                      <div className="w-0.5 h-3 bg-white/60 rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            </GlassPanel>

            {/* Decision Engine Card */}
            <GlassPanel padding="none" className="xl:col-span-1 flex flex-col border-outline-variant bg-surface-container/30 overflow-hidden shadow-2xl rounded-2xl">
              <div className="px-5 py-3.5 border-b border-outline-variant bg-surface-container/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-primary" />
                  <span className="text-xs font-mono font-bold text-on-surface uppercase tracking-wider">Verification Decision</span>
                </div>
                <span className="text-[10px] font-mono text-on-surface-variant">ENGINE 2.0</span>
              </div>
              
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4 font-mono">
                
                {/* Canonical Status Banner */}
                <div className={cn(
                  "p-4 rounded-xl border flex flex-col items-center justify-center text-center backdrop-blur-md",
                  activeCase.result === 'resolved' ? "bg-emerald-500/10 border-emerald-500/30" :
                  activeCase.result === 'unresolved' ? "bg-rose-500/10 border-rose-500/30" :
                  activeCase.result === 'inconclusive' ? "bg-amber-500/10 border-amber-500/30" :
                  "bg-blue-500/10 border-blue-500/30"
                )}>
                  {activeCase.result === 'resolved' ? (
                    <>
                      <CheckCircle className="w-8 h-8 text-emerald-400 mb-1.5" />
                      <div className="text-sm font-bold text-emerald-400 uppercase tracking-wider">Verified Resolved</div>
                      <div className="text-[11px] text-on-surface-variant mt-0.5">Corridor verified clean • Zero residual defect</div>
                    </>
                  ) : activeCase.result === 'unresolved' ? (
                    <>
                      <XCircle className="w-8 h-8 text-rose-400 mb-1.5" />
                      <div className="text-sm font-bold text-rose-400 uppercase tracking-wider">Unresolved / Reopened</div>
                      <div className="text-[11px] text-rose-300/90 mt-0.5 leading-snug">Qualifying defect detected upon reinspection</div>
                    </>
                  ) : activeCase.result === 'inconclusive' ? (
                    <>
                      <HelpCircle className="w-8 h-8 text-amber-400 mb-1.5" />
                      <div className="text-sm font-bold text-amber-400 uppercase tracking-wider">Inconclusive</div>
                      <div className="text-[11px] text-amber-300/90 mt-0.5 leading-snug">Insufficient spatial or camera evidence to certify</div>
                    </>
                  ) : (
                    <>
                      <Clock className="w-8 h-8 text-blue-400 mb-1.5" />
                      <div className="text-sm font-bold text-blue-400 uppercase tracking-wider">Pending Reinspection</div>
                      <div className="text-[11px] text-on-surface-variant mt-0.5">Awaiting transit bus route pass</div>
                    </>
                  )}
                </div>

                {/* Decision Rationale */}
                {activeCase.rationale && (
                  <div className="p-3 bg-surface/60 rounded-xl border border-outline-variant/60 text-xs">
                    <span className="text-[10px] text-on-surface-variant uppercase block font-bold mb-1">Decision Rationale</span>
                    <p className="text-on-surface text-[11px] leading-relaxed">{activeCase.rationale}</p>
                  </div>
                )}

                {/* Failure Reason Tag */}
                {activeCase.failureReason && (
                  <div className="flex items-center justify-between text-xs px-2 py-1 bg-surface-container rounded-lg border border-outline-variant/40">
                    <span className="text-[10px] text-on-surface-variant uppercase">Failure Reason</span>
                    <span className="font-bold text-amber-400 text-[10px]">{activeCase.failureReason}</span>
                  </div>
                )}

                {/* Provenance & Comparison Metrics */}
                <div className="space-y-2 pt-2 border-t border-outline-variant/60 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-on-surface-variant uppercase text-[10px]">Verifier</span>
                    <span className="font-bold text-cyan-400 text-[11px]">{activeCase.verifier || 'TRANSIT_REINSPECTION'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-on-surface-variant uppercase text-[10px]">Evidence Source</span>
                    <span className="font-bold text-on-surface text-[11px]">{activeCase.evidenceSource || 'bus_dashcam'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-on-surface-variant uppercase text-[10px]">AI Model Confidence</span>
                    <span className="font-bold text-on-surface text-[11px]">
                      {activeCase.confidence != null ? `${(activeCase.confidence * 100).toFixed(1)}%` : 'Unavailable'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-on-surface-variant uppercase text-[10px]">Authority</span>
                    <span className="font-bold text-on-surface text-[11px]">{activeCase.authorityName || activeCase.authorityCode || 'Delhi PWD'}</span>
                  </div>
                </div>

                {/* Operator Action Bar */}
                <div className="pt-3 border-t border-outline-variant/60 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setShowReinspectModal(true)}
                      className="px-3 py-2 rounded-lg bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary text-[11px] font-bold uppercase transition-all flex items-center justify-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Reinspect
                    </button>
                    <button
                      onClick={() => setShowOverrideModal(true)}
                      className="px-3 py-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 text-[11px] font-bold uppercase transition-all flex items-center justify-center gap-1.5"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      Override
                    </button>
                  </div>

                  {activeCase.issueId && (
                    <Link
                      to={`/issues/${activeCase.issueId}`}
                      className="w-full px-3 py-2 rounded-lg bg-surface-container hover:bg-surface-high border border-outline-variant text-on-surface text-[11px] font-bold uppercase transition-all flex items-center justify-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                      View in Issue 360
                    </Link>
                  )}
                </div>

              </div>
            </GlassPanel>
          </div>

          {/* Bottom Row: Revisit Tracking & Workflow Audit Trail */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            
            {/* Fleet Revisit Verification Panel */}
            <GlassPanel padding="md" className="border-outline-variant/80 shadow-2xl rounded-2xl">
              <h3 className="text-xs font-mono font-bold text-on-surface uppercase tracking-wider mb-4 flex items-center gap-2">
                <Bus className="w-4 h-4 text-primary" /> Multi-Pass Transit Provenance
              </h3>
              
              <div className="flex items-center gap-3 relative font-mono">
                {/* Initial Detection */}
                <div className="flex-1 bg-surface-container/60 border border-outline-variant rounded-xl p-3.5">
                  <div className="text-[10px] text-on-surface-variant uppercase tracking-wider mb-2 font-bold">Initial Pass</div>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                      <Bus className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-on-surface">Fleet Unit</div>
                      <div className="text-[11px] text-on-surface-variant">{formatDate(activeCase.timestamp, 'short')}</div>
                    </div>
                  </div>
                </div>

                {/* Arrow Connector */}
                <div className="flex-shrink-0 flex flex-col items-center justify-center text-on-surface-variant/60">
                  <Clock className="w-3.5 h-3.5 mb-0.5 text-primary" />
                  <ArrowRight className="w-4 h-4 text-on-surface-variant" />
                </div>

                {/* Reinspection Pass */}
                <div className={cn(
                  "flex-1 border rounded-xl p-3.5 transition-colors",
                  activeCase.result !== 'pending_review' ? "bg-surface-container/60 border-outline-variant" : "bg-transparent border-dashed border-outline-variant/60"
                )}>
                  <div className="text-[10px] text-on-surface-variant uppercase tracking-wider mb-2 font-bold">Reinspection Pass</div>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center border shrink-0",
                      activeCase.result === 'resolved' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                      activeCase.result === 'unresolved' ? "bg-rose-500/10 border-rose-500/20 text-rose-400" :
                      "bg-amber-500/10 border-amber-500/20 text-amber-400"
                    )}>
                      <Bus className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-on-surface">
                        {activeCase.busId || 'BUS-001'}
                      </div>
                      <div className="text-[11px] text-on-surface-variant">
                        {activeCase.timestamp ? formatDate(activeCase.timestamp, 'short') : 'Awaiting'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 px-4 py-2.5 bg-surface-container/40 rounded-xl border border-outline-variant/60 text-xs text-on-surface-variant text-center font-mono">
                Strict closed loop: absence of detection does not certify resolution without verified corridor coverage.
              </div>
            </GlassPanel>

            {/* Workflow Audit Trail */}
            <GlassPanel padding="md" className="border-outline-variant/80 shadow-2xl rounded-2xl">
              <h3 className="text-xs font-mono font-bold text-on-surface uppercase tracking-wider mb-4">Verification Audit Trail</h3>
              
              <div className="relative pl-4 space-y-4 font-mono">
                <div className="absolute left-[21px] top-4 bottom-4 w-0.5 bg-surface-container-high" />

                {[
                  { 
                    label: activeCase.isOverride ? 'Manual Operator Override Applied' : `Verification Evaluated: ${activeCase.result.toUpperCase()}`,
                    active: true,
                    icon: activeCase.result === 'resolved' ? CheckCircle : activeCase.result === 'unresolved' ? XCircle : HelpCircle,
                    color: activeCase.result === 'resolved' ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10' : activeCase.result === 'unresolved' ? 'text-rose-400 border-rose-500/40 bg-rose-500/10' : 'text-amber-400 border-amber-500/40 bg-amber-500/10'
                  },
                  { label: 'Corridor Alignment & Quality Check', active: true, icon: Search, color: 'text-primary border-primary/40 bg-primary/10' },
                  { label: 'Fleet Reinspection Pass Recorded', active: true, icon: Bus, color: 'text-blue-400 border-blue-500/40 bg-blue-500/10' },
                  { label: 'Contractor Reported Repair', active: true, icon: Check, color: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10' },
                  { label: 'Initial Field Defect Detected', active: true, icon: ShieldAlert, color: 'text-amber-400 border-amber-500/40 bg-amber-500/10' },
                ].map((step, idx) => (
                  <div key={idx} className="relative pl-8 flex items-center">
                    <div className={cn(
                      "absolute left-[-11px] w-6 h-6 rounded-full flex items-center justify-center border text-xs shadow-sm",
                      step.color
                    )}>
                      <step.icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-xs font-semibold text-on-surface">
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

      {/* ── MODAL: Operator Override ─────────────────────────── */}
      {showOverrideModal && activeCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <GlassPanel className="max-w-md w-full border-purple-500/30 p-6 space-y-4">
            <h3 className="text-sm font-mono font-bold text-on-surface uppercase flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-purple-400" />
              Manual Operator Override
            </h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Operator overrides are strictly audited and append-only. The original automated decision is preserved in the permanent database log.
            </p>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-on-surface-variant uppercase text-[10px] mb-1">Target Verification Record</label>
                <input disabled value={activeCase.id} className="w-full p-2 bg-surface-container rounded border border-outline-variant text-on-surface" />
              </div>

              <div>
                <label className="block text-on-surface-variant uppercase text-[10px] mb-1">Override Outcome</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setOverrideOutcome('resolved')}
                    className={cn("p-2 rounded border font-bold uppercase text-xs", overrideOutcome === 'resolved' ? "bg-emerald-500/20 border-emerald-500 text-emerald-400" : "bg-surface-container border-outline-variant text-on-surface-variant")}
                  >
                    RESOLVED
                  </button>
                  <button
                    type="button"
                    onClick={() => setOverrideOutcome('unresolved')}
                    className={cn("p-2 rounded border font-bold uppercase text-xs", overrideOutcome === 'unresolved' ? "bg-rose-500/20 border-rose-500 text-rose-400" : "bg-surface-container border-outline-variant text-on-surface-variant")}
                  >
                    UNRESOLVED
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-on-surface-variant uppercase text-[10px] mb-1">Mandatory Justification Rationale *</label>
                <textarea
                  rows={3}
                  value={overrideRationale}
                  onChange={e => setOverrideRationale(e.target.value)}
                  placeholder="State the exact engineering or physical inspection basis for overriding this automated result..."
                  className="w-full p-2.5 bg-surface-container rounded-lg border border-outline-variant text-on-surface placeholder:text-on-surface-variant/50 focus:border-purple-400"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowOverrideModal(false)}
                className="px-4 py-2 rounded-lg bg-surface-container hover:bg-surface-high border border-outline-variant text-xs font-bold uppercase"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyOverride}
                disabled={actionLoading || !overrideRationale.trim()}
                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold uppercase disabled:opacity-50"
              >
                {actionLoading ? 'Applying...' : 'Certify Override'}
              </button>
            </div>
          </GlassPanel>
        </div>
      )}

      {/* ── MODAL: Trigger Reinspection ──────────────────────── */}
      {showReinspectModal && activeCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <GlassPanel className="max-w-md w-full border-primary/30 p-6 space-y-4">
            <h3 className="text-sm font-mono font-bold text-on-surface uppercase flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-primary" />
              Trigger Field Reinspection Pass
            </h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Evaluate reinspection evidence using the canonical Verification Decision Engine.
            </p>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-on-surface-variant uppercase text-[10px] mb-1">Spatial Corridor Covered?</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setReinspectCoverage(true)}
                    className={cn("p-2 rounded border font-bold uppercase text-xs", reinspectCoverage ? "bg-emerald-500/20 border-emerald-500 text-emerald-400" : "bg-surface-container border-outline-variant text-on-surface-variant")}
                  >
                    YES (Confirmed)
                  </button>
                  <button
                    type="button"
                    onClick={() => setReinspectCoverage(false)}
                    className={cn("p-2 rounded border font-bold uppercase text-xs", !reinspectCoverage ? "bg-amber-500/20 border-amber-500 text-amber-400" : "bg-surface-container border-outline-variant text-on-surface-variant")}
                  >
                    NO (Missing)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-on-surface-variant uppercase text-[10px] mb-1">Camera Optical Quality</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setReinspectQuality('SUFFICIENT')}
                    className={cn("p-2 rounded border font-bold uppercase text-xs", reinspectQuality === 'SUFFICIENT' ? "bg-emerald-500/20 border-emerald-500 text-emerald-400" : "bg-surface-container border-outline-variant text-on-surface-variant")}
                  >
                    SUFFICIENT
                  </button>
                  <button
                    type="button"
                    onClick={() => setReinspectQuality('DEGRADED')}
                    className={cn("p-2 rounded border font-bold uppercase text-xs", reinspectQuality === 'DEGRADED' ? "bg-amber-500/20 border-amber-500 text-amber-400" : "bg-surface-container border-outline-variant text-on-surface-variant")}
                  >
                    DEGRADED
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-on-surface-variant uppercase text-[10px] mb-1">Residual Defect Observed?</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setReinspectHasDefect(false)}
                    className={cn("p-2 rounded border font-bold uppercase text-xs", !reinspectHasDefect ? "bg-emerald-500/20 border-emerald-500 text-emerald-400" : "bg-surface-container border-outline-variant text-on-surface-variant")}
                  >
                    NONE (Clear)
                  </button>
                  <button
                    type="button"
                    onClick={() => setReinspectHasDefect(true)}
                    className={cn("p-2 rounded border font-bold uppercase text-xs", reinspectHasDefect ? "bg-rose-500/20 border-rose-500 text-rose-400" : "bg-surface-container border-outline-variant text-on-surface-variant")}
                  >
                    DEFECT PRESENT
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowReinspectModal(false)}
                className="px-4 py-2 rounded-lg bg-surface-container hover:bg-surface-high border border-outline-variant text-xs font-bold uppercase"
              >
                Cancel
              </button>
              <button
                onClick={handleTriggerReinspection}
                disabled={actionLoading}
                className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold uppercase disabled:opacity-50"
              >
                {actionLoading ? 'Evaluating...' : 'Run Decision Engine'}
              </button>
            </div>
          </GlassPanel>
        </div>
      )}

    </div>
  );
}
