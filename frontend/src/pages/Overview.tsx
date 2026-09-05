// ============================================================
// Overview Page — Enterprise Municipal Infrastructure Command Center
// ============================================================

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  AlertTriangle, 
  Bus, 
  MapPin, 
  Activity, 
  CheckCircle,
  Clock,
  ShieldCheck,
  CircleDot,
  Wrench,
  ShieldAlert,
  Eye,
  Layers,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { GlassPanel, Sparkline, IntelligenceMap, LoadingState, EmptyState } from '@/components/ui';
import { api } from '@/services/api';
import { cn, timeAgo } from '@/lib/utils';
import type { 
  SystemHealth, 
  Bus as BusType, 
  UrbanIssue, 
  ActivityEvent,
  VerificationSummary,
  RoadHealthSummary
} from '@/types';

import { config } from '@/services/core/config';

export function OverviewPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    system: SystemHealth | null;
    buses: BusType[];
    issues: UrbanIssue[];
    activity: ActivityEvent[];
    verification: VerificationSummary | null;
    roadHealth: RoadHealthSummary | null;
  }>({
    system: null,
    buses: [],
    issues: [],
    activity: [],
    verification: null,
    roadHealth: null,
  });

  const loadData = () => {
    setLoading(true);
    setError(null);

    Promise.allSettled([
      api.getSystemHealth(),
      api.getBuses(),
      api.getIssues(),
      api.getActivityFeed(),
      api.getVerificationSummary(),
      api.getRoadHealthSummary()
    ]).then((results) => {
      const isAllRejected = results.every(r => r.status === 'rejected');
      
      if (isAllRejected) {
        const firstError = (results.find(r => r.status === 'rejected') as PromiseRejectedResult)?.reason?.message || 'Backend connection failed';
        setError(`Unable to load Command Center data. ${firstError}`);
        setLoading(false);
        return;
      }

      setData({
        system: results[0].status === 'fulfilled' ? results[0].value : null,
        buses: results[1].status === 'fulfilled' && Array.isArray(results[1].value) ? results[1].value : [],
        issues: results[2].status === 'fulfilled' && Array.isArray(results[2].value) ? results[2].value : [],
        activity: results[3].status === 'fulfilled' && Array.isArray(results[3].value) ? results[3].value : [],
        verification: results[4].status === 'fulfilled' ? results[4].value : null,
        roadHealth: results[5].status === 'fulfilled' ? results[5].value : null,
      });
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) return <LoadingState message="Initializing Operations Command Center..." className="h-full" />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-var(--spacing-header-height))] space-y-4 p-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-status-critical" />
        </div>
        <h2 className="text-xl font-bold text-on-surface">Data Stream Unavailable</h2>
        <p className="text-sm text-on-surface-variant max-w-md">{error}</p>
        <div className="flex items-center gap-3 mt-4">
          <button 
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry Connection
          </button>
          {!config.useMockData && (
            <button 
              onClick={() => {
                config.useMockData = true;
                loadData();
              }}
              className="px-4 py-2 bg-surface-container border border-outline-variant text-on-surface text-xs font-bold uppercase tracking-wider hover:bg-surface-high transition-colors rounded-lg"
            >
              Load Demo Mode
            </button>
          )}
        </div>
      </div>
    );
  }

  const { buses, issues, activity, verification, roadHealth } = data;

  // Derive metrics safely from actual arrays & objects
  const activeBuses = buses.filter(b => b.status === 'active').length;
  const openIssues = issues.filter(i => ['open', 'confirmed', 'assigned'].includes(i.status)).length;
  const criticalIssues = issues.filter(i => i.severity === 'critical' && ['open', 'confirmed', 'assigned'].includes(i.status)).length;
  const liveObservations = buses.reduce((acc, b) => acc + (b.detectionsToday || 0), 0);

  // Sparkline historical trends (mocked baseline visual overlay)
  const sparkData = {
    buses: [6, 7, 8, 8, 9, 11, 9],
    obs: [120, 150, 180, 240, 310, 420, 560],
    open: [24, 28, 26, 31, 35, 33, 31],
    critical: [2, 3, 3, 5, 4, 3, 4],
    pending: [15, 12, 14, 11, 15, 18, 12],
    verified: [40, 45, 42, 51, 55, 62, 68]
  };

  const kpiCards = [
    {
      label: 'Active Fleet',
      value: activeBuses,
      subtext: `${buses.length} total vehicles`,
      icon: Bus,
      iconColor: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      spark: sparkData.buses,
      sparkColor: '#60a5fa'
    },
    {
      label: 'Live Detections',
      value: liveObservations,
      subtext: 'Today across network',
      icon: Eye,
      iconColor: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
      spark: sparkData.obs,
      sparkColor: '#818cf8'
    },
    {
      label: 'Open Issues',
      value: openIssues,
      subtext: `${issues.length} recorded total`,
      icon: AlertTriangle,
      iconColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      spark: sparkData.open,
      sparkColor: '#fbbf24'
    },
    {
      label: 'Critical Hazards',
      value: criticalIssues,
      subtext: 'Require dispatch',
      icon: ShieldAlert,
      iconColor: 'text-red-400 bg-red-500/10 border-red-500/20',
      spark: sparkData.critical,
      sparkColor: '#f87171'
    },
    {
      label: 'Pending Review',
      value: verification?.pendingReview ?? 0,
      subtext: 'Awaiting inspection',
      icon: Clock,
      iconColor: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
      spark: sparkData.pending,
      sparkColor: '#38bdf8'
    },
    {
      label: 'Verified Fixed',
      value: verification?.resolved ?? 0,
      subtext: 'Confirmed repairs',
      icon: ShieldCheck,
      iconColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      spark: sparkData.verified,
      sparkColor: '#34d399'
    }
  ];

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-[1920px] mx-auto font-sans">
      
      {/* ── 1. COMMAND CENTER HEADER ──────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Municipal Operations Command Center
            </h1>
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              LIVE INGESTION
            </div>
          </div>
          <p className="text-xs text-on-surface-variant/80 mt-1 font-medium">
            Real-time spatial damage detection, active transit fleet telemetry & automated work order dispatch
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto text-xs font-mono text-on-surface-variant/70">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
            <MapPin className="w-3.5 h-3.5 text-primary" />
            <span>Bengaluru Zone</span>
          </div>
          <button 
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] text-on-surface transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Sync
          </button>
        </div>
      </div>

      {/* ── 2. TOP KPI METRICS GRID ───────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {kpiCards.map((card, idx) => {
          const IconComponent = card.icon;
          const displayVal = typeof card.value === 'number' && !isNaN(card.value) ? card.value.toLocaleString() : 'N/A';

          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04, duration: 0.25 }}
            >
              <div className="relative overflow-hidden group h-[104px] p-3.5 rounded-xl bg-[#16161a] border border-white/[0.08] hover:border-white/20 transition-all duration-200 flex flex-col justify-between hover:bg-[#1a1b20]">
                {/* Header row: Label + Icon Container */}
                <div className="flex items-center justify-between z-10">
                  <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-on-surface-variant/80">
                    {card.label}
                  </span>
                  <div className={cn("w-6 h-6 rounded-md flex items-center justify-center border", card.iconColor)}>
                    <IconComponent className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Bottom row: Large Metric Number + Sparkline */}
                <div className="flex items-end justify-between z-10 mt-1">
                  <div>
                    <div className="font-mono text-2xl font-bold text-white tracking-tight group-hover:text-primary-hover transition-colors">
                      {displayVal}
                    </div>
                    <div className="text-[10px] text-on-surface-variant/60 font-medium">
                      {card.subtext}
                    </div>
                  </div>
                  <div className="opacity-40 group-hover:opacity-100 transition-opacity pb-0.5">
                    <Sparkline data={card.spark} color={card.sparkColor} />
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ── 3. MAIN HERO AREA: DOMINANT MAP + MONITORED PANELS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        
        {/* Dominant Map Container */}
        <motion.div 
          className="lg:col-span-8 xl:col-span-9 h-[520px] lg:h-[720px] relative rounded-xl overflow-hidden border border-white/10 bg-[#121316] shadow-2xl flex flex-col group"
          initial={{ opacity: 0, scale: 0.99 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, duration: 0.35 }}
        >
          {/* Map Header Control Bar */}
          <div className="px-4 py-2.5 bg-[#16161a]/95 backdrop-blur-md border-b border-white/[0.08] flex items-center justify-between z-20">
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold text-white tracking-wide">
                Live Spatial Intelligence & Vehicle Telemetry
              </span>
              <span className="hidden sm:inline-block text-[10px] font-mono text-on-surface-variant/60">
                • BBMP Municipal Corridor
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-on-surface-variant">
                {buses.length} Vehicles • {issues.length} Signals
              </span>
            </div>
          </div>
          
          {/* Interactive Leaflet Map Wrapper */}
          <div className="flex-1 relative z-10 w-full h-full">
            <IntelligenceMap buses={buses} issues={issues} />
          </div>
        </motion.div>

        {/* Right Information Stack */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-5 flex flex-col h-full">
          
          {/* Panel 1: Repair Verification Status */}
          <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <div className="p-4 rounded-xl bg-[#16161a] border border-white/[0.08] space-y-4">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">Repair Verification</h3>
                </div>
                <span className="text-[10px] font-mono text-on-surface-variant/60">SLA Audit</span>
              </div>
              
              {verification ? (() => {
                const totalV = verification.totalVerifications || 0;
                const resolvedVal = verification.resolved ?? 0;
                const pendingVal = verification.pendingReview ?? 0;
                const unresolvedVal = verification.unresolved ?? 0;

                const resolvedPct = totalV > 0 ? Math.min(100, (resolvedVal / totalV) * 100) : 0;
                const pendingPct = totalV > 0 ? Math.min(100, (pendingVal / totalV) * 100) : 0;
                const unresolvedPct = totalV > 0 ? Math.min(100, (unresolvedVal / totalV) * 100) : 0;

                return (
                  <div className="space-y-3.5">
                    <div className="flex items-baseline justify-between">
                      <div className="font-mono text-3xl font-bold text-white">{totalV.toLocaleString()}</div>
                      <span className="text-xs text-on-surface-variant font-medium">total repairs reported</span>
                    </div>

                    <div className="space-y-2.5">
                      <div>
                        <div className="flex justify-between text-[11px] mb-1 font-mono">
                          <span className="text-emerald-400 font-medium">Verified Fixed</span>
                          <span className="text-white font-bold">{resolvedVal.toLocaleString()} ({resolvedPct.toFixed(0)}%)</span>
                        </div>
                        <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${resolvedPct}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] mb-1 font-mono">
                          <span className="text-amber-400 font-medium">Awaiting Inspection</span>
                          <span className="text-white font-bold">{pendingVal.toLocaleString()} ({pendingPct.toFixed(0)}%)</span>
                        </div>
                        <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${pendingPct}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] mb-1 font-mono">
                          <span className="text-red-400 font-medium">Reopened (Failed)</span>
                          <span className="text-white font-bold">{unresolvedVal.toLocaleString()} ({unresolvedPct.toFixed(0)}%)</span>
                        </div>
                        <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                          <div className="h-full bg-red-500 rounded-full transition-all duration-500" style={{ width: `${unresolvedPct}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })() : (
                <div className="py-4 text-center text-xs text-on-surface-variant/60 font-mono">
                  Verification telemetry unavailable
                </div>
              )}
            </div>
          </motion.div>

          {/* Panel 2: Road Network Health */}
          <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
            <div className="p-4 rounded-xl bg-[#16161a] border border-white/[0.08] space-y-4">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                    <Activity className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">Road Network Health</h3>
                </div>
                <span className="text-[10px] font-mono text-on-surface-variant/60">Condition Score</span>
              </div>

              {roadHealth ? (() => {
                const avgScore = roadHealth.averageScore ?? roadHealth.averageHealth ?? 80;
                const dist = roadHealth.segmentDistribution || { excellent: 40, good: 50, fair: 18, critical: 12 };
                const totalSegments = Math.max(roadHealth.totalSegments || 1, 1);

                return (
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-mono text-3xl font-bold text-white">{avgScore.toFixed(0)}<span className="text-xs font-normal text-on-surface-variant/60">/100</span></div>
                      <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-semibold mt-0.5">Municipal Rating</div>
                    </div>

                    <div className="flex gap-2">
                      {[
                        { label: 'Exc', count: dist.excellent ?? 0, color: 'bg-emerald-500' },
                        { label: 'Good', count: dist.good ?? 0, color: 'bg-blue-500' },
                        { label: 'Fair', count: dist.fair ?? 0, color: 'bg-amber-500' },
                        { label: 'Crit', count: dist.critical ?? 0, color: 'bg-red-500' },
                      ].map(st => {
                        const heightPct = Math.min(100, Math.max(10, (st.count / totalSegments) * 100));
                        return (
                          <div key={st.label} className="flex flex-col items-center gap-1">
                            <div className="h-12 w-5 bg-white/[0.04] rounded flex items-end overflow-hidden border border-white/[0.06]">
                              <div className={cn("w-full transition-all duration-700 rounded-b", st.color)} style={{ height: `${heightPct}%` }} />
                            </div>
                            <span className="text-[9px] font-mono text-on-surface-variant/80 font-bold">{st.count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })() : (
                <div className="py-4 text-center text-xs text-on-surface-variant/60 font-mono">
                  Road health metrics unavailable
                </div>
              )}
            </div>
          </motion.div>

          {/* Panel 3: Real-Time Activity Feed */}
          <motion.div 
            className="flex-1 min-h-[260px]"
            initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}
          >
            <div className="p-4 rounded-xl bg-[#16161a] border border-white/[0.08] h-full flex flex-col">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  </div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">Live Activity Feed</h3>
                </div>
                <span className="flex items-center gap-1 text-[9px] font-mono text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" /> Realtime
                </span>
              </div>

              {activity.length > 0 ? (
                <div className="flex-1 overflow-y-auto scrollbar-none pr-1 space-y-3.5">
                  {activity.slice(0, 7).map((event, i) => (
                    <div key={event.id || i} className="relative pl-6">
                      {/* Timeline connecting bar */}
                      {i !== Math.min(activity.length, 7) - 1 && (
                        <div className="absolute left-[9px] top-5 bottom-[-14px] w-[1px] bg-white/[0.08]" />
                      )}
                      
                      {/* Node Icon */}
                      <div className="absolute left-0 top-1 w-4 h-4 rounded-full bg-[#121316] flex items-center justify-center border border-white/20">
                        {event.type === 'detection' ? <CircleDot className="w-2 h-2 text-blue-400" /> :
                         event.type === 'issue_created' ? <AlertTriangle className="w-2 h-2 text-red-400" /> :
                         event.type === 'verification' ? <CheckCircle className="w-2 h-2 text-emerald-400" /> :
                         <Wrench className="w-2 h-2 text-amber-400" />}
                      </div>

                      <div>
                        <div className="text-xs font-semibold text-white leading-snug">
                          {event.title}
                        </div>
                        {event.description && (
                          <div className="text-[11px] text-on-surface-variant/70 mt-0.5 leading-normal">
                            {event.description}
                          </div>
                        )}
                        <div className="font-mono text-[9px] text-on-surface-variant/50 mt-1">
                          {timeAgo(event.timestamp)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                  <Clock className="w-8 h-8 text-on-surface-variant/30 mb-2" />
                  <p className="text-xs text-on-surface-variant/60 font-mono">No recent activity logged</p>
                </div>
              )}
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
