// ============================================================
// Overview Page — Premium Urban Command Center
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
  Wrench
} from 'lucide-react';
import { GlassPanel, Sparkline, IntelligenceMap, LoadingState } from '@/components/ui';
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

export function OverviewPage() {
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    Promise.all([
      api.getSystemHealth(),
      api.getBuses(),
      api.getIssues(),
      api.getActivityFeed(),
      api.getVerificationSummary(),
      api.getRoadHealthSummary()
    ]).then(([system, buses, issues, activity, verification, roadHealth]) => {
      setData({ system, buses, issues, activity, verification, roadHealth });
      setLoading(false);
    });
  }, []);

  if (loading) return <LoadingState message="Initializing Command Center..." className="h-full" />;

  const { buses, issues, activity, verification, roadHealth } = data;

  // Derive metrics
  const activeBuses = buses.filter(b => b.status === 'active').length;
  const openIssues = issues.filter(i => ['open', 'confirmed', 'assigned'].includes(i.status)).length;
  const criticalIssues = issues.filter(i => i.severity === 'critical' && ['open', 'confirmed', 'assigned'].includes(i.status)).length;
  const liveObservations = buses.reduce((acc, b) => acc + (b.detectionsToday || 0), 0);

  // Mock sparkline data
  const sparkData = {
    buses: [6, 7, 8, 8, 9, 11, 9],
    obs: [120, 150, 180, 240, 310, 420, 560],
    open: [24, 28, 26, 31, 35, 33, 31],
    critical: [2, 3, 3, 5, 4, 3, 4],
    pending: [15, 12, 14, 11, 15, 18, 12],
    verified: [40, 45, 42, 51, 55, 62, 68]
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-[1920px] mx-auto">
      {/* ── Page Header ───────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-2">
        <div>
          <h1 className="text-2xl font-bold text-white/95 tracking-tight flex items-center gap-3">
            Urban Intelligence
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              Live
            </span>
          </h1>
          <p className="text-sm text-white/40 mt-1">City operational overview · Last updated: just now</p>
        </div>
      </div>

      {/* ── Top Metrics Grid ──────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        {[
          { label: 'Active Buses', value: activeBuses, spark: sparkData.buses, color: '#8ab4f8' },
          { label: 'Live Observations', value: liveObservations, spark: sparkData.obs, color: '#c58af9' },
          { label: 'Open Issues', value: openIssues, spark: sparkData.open, color: '#ffaa00' },
          { label: 'Critical Issues', value: criticalIssues, spark: sparkData.critical, color: '#ff5e5e' },
          { label: 'Pending Verification', value: verification?.pendingReview || 0, spark: sparkData.pending, color: '#c58af9' },
          { label: 'Verified Repairs', value: verification?.resolved || 0, spark: sparkData.verified, color: '#00e676' },
        ].map((metric, idx) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05, duration: 0.3 }}
          >
            <GlassPanel hover padding="sm" className="relative overflow-hidden group h-[88px] flex flex-col justify-between">
              <div className="flex justify-between items-start z-10">
                <span className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">{metric.label}</span>
              </div>
              <div className="flex items-end justify-between z-10">
                <div className="text-2xl font-bold font-mono tracking-tight text-white/90 group-hover:text-white transition-colors">
                  {metric.value.toLocaleString()}
                </div>
                <div className="opacity-50 group-hover:opacity-100 transition-opacity">
                  <Sparkline data={metric.spark} color={metric.color} />
                </div>
              </div>
            </GlassPanel>
          </motion.div>
        ))}
      </div>

      {/* ── Main Hero Area (Asymmetric Grid) ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        
        {/* Left Col: Dominant Map */}
        <motion.div 
          className="lg:col-span-8 xl:col-span-9 h-[500px] lg:h-[700px] relative rounded-xl overflow-hidden group"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          {/* Subtle map overlay frame */}
          <div className="absolute inset-0 border border-white/[0.08] rounded-xl pointer-events-none z-10" />
          <div className="absolute top-4 left-4 z-20 px-3 py-1.5 rounded-lg bg-black/40 backdrop-blur-md border border-white/[0.1] flex items-center gap-2">
            <MapPin className="w-4 h-4 text-accent-secondary" />
            <span className="text-xs font-semibold text-white/80">Live Intelligence Map</span>
          </div>
          
          <IntelligenceMap buses={buses} issues={issues} />
        </motion.div>

        {/* Right Col: Secondary Panels Stack */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-4 sm:space-y-6 flex flex-col h-full">
          
          {/* Verification Progress */}
          {verification && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
              <GlassPanel padding="md">
                <div className="flex items-center gap-2 mb-4">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-bold text-white/70 uppercase tracking-widest">Repair Verification</h3>
                </div>
                
                <div className="flex items-end gap-3 mb-4">
                  <div className="text-3xl font-bold text-white/90 leading-none">{verification.totalVerifications}</div>
                  <div className="text-xs text-white/40 pb-1">repairs reported</div>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-[11px] mb-1.5">
                      <span className="text-emerald-400/80 font-medium">Verified fixed</span>
                      <span className="text-white/80 font-semibold">{verification.resolved}</span>
                    </div>
                    <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(verification.resolved/verification.totalVerifications)*100}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] mb-1.5">
                      <span className="text-yellow-400/80 font-medium">Awaiting inspection</span>
                      <span className="text-white/80 font-semibold">{verification.pendingReview}</span>
                    </div>
                    <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                      <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${(verification.pendingReview/verification.totalVerifications)*100}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] mb-1.5">
                      <span className="text-red-400/80 font-medium">Reopened (Failed)</span>
                      <span className="text-white/80 font-semibold">{verification.unresolved}</span>
                    </div>
                    <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                      <div className="h-full bg-red-500 rounded-full" style={{ width: `${(verification.unresolved/verification.totalVerifications)*100}%` }} />
                    </div>
                  </div>
                </div>
              </GlassPanel>
            </motion.div>
          )}

          {/* Road Health Compact */}
          {roadHealth && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
              <GlassPanel padding="md">
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="w-4 h-4 text-accent-secondary" />
                  <h3 className="text-xs font-bold text-white/70 uppercase tracking-widest">Road Health</h3>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-white/90">{(roadHealth?.averageScore ?? 0).toFixed(0)}</div>
                    <div className="text-[10px] text-white/40 uppercase tracking-wider">Avg Score</div>
                  </div>
                  <div className="flex gap-1.5">
                    {[
                      { label: 'Exc', count: roadHealth?.segmentDistribution?.excellent ?? 0, color: 'bg-emerald-500' },
                      { label: 'Good', count: roadHealth?.segmentDistribution?.good ?? 0, color: 'bg-blue-500' },
                      { label: 'Attn', count: roadHealth?.segmentDistribution?.fair ?? 0, color: 'bg-yellow-500' },
                      { label: 'Crit', count: roadHealth?.segmentDistribution?.critical ?? 0, color: 'bg-red-500' },
                    ].map(st => (
                      <div key={st.label} className="flex flex-col items-center gap-1.5">
                        <div className="h-12 w-6 bg-white/[0.03] rounded-sm flex items-end overflow-hidden border border-white/[0.05]">
                          <div className={cn("w-full transition-all duration-700", st.color)} style={{ height: `${(st.count / Math.max(roadHealth?.totalSegments ?? 1, 1)) * 100}%` }} />
                        </div>
                        <span className="text-[9px] text-white/40">{st.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </GlassPanel>
            </motion.div>
          )}

          {/* Live Activity Timeline */}
          <motion.div 
            className="flex-1 min-h-[250px]"
            initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}
          >
            <GlassPanel padding="md" className="h-full flex flex-col relative overflow-hidden">
              {/* Fade top/bottom for scroll effect */}
              <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-[#121216] to-transparent z-10 pointer-events-none rounded-t-xl" />
              <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-[#121216] to-transparent z-10 pointer-events-none rounded-b-xl" />
              
              <div className="flex items-center gap-2 mb-4 relative z-20">
                <Clock className="w-4 h-4 text-accent-primary" />
                <h3 className="text-xs font-bold text-white/70 uppercase tracking-widest">Live Activity</h3>
              </div>
              
              <div className="flex-1 overflow-y-auto scrollbar-none -mx-2 px-2 relative z-0">
                <div className="space-y-4 pb-4">
                  {activity.slice(0, 8).map((event, i) => (
                    <div key={event.id} className="relative pl-6">
                      {/* Timeline line */}
                      {i !== Math.min(activity.length, 8) - 1 && (
                        <div className="absolute left-[9px] top-6 bottom-[-16px] w-[2px] bg-white/[0.06]" />
                      )}
                      
                      {/* Timeline node */}
                      <div className="absolute left-0 top-1.5 w-[20px] h-[20px] rounded-full bg-surface-base flex items-center justify-center border border-white/[0.1]">
                        {event.type === 'detection' ? <CircleDot className="w-2.5 h-2.5 text-accent-secondary" /> :
                         event.type === 'issue_created' ? <AlertTriangle className="w-2.5 h-2.5 text-red-400" /> :
                         event.type === 'verification' ? <CheckCircle className="w-2.5 h-2.5 text-emerald-400" /> :
                         <Wrench className="w-2.5 h-2.5 text-yellow-400" />}
                      </div>

                      <div className="text-xs font-medium text-white/80 leading-tight">
                        {event.title}
                      </div>
                      <div className="text-[11px] text-white/40 mt-0.5">
                        {event.description}
                      </div>
                      <div className="text-[10px] text-white/30 mt-1 font-mono">
                        {timeAgo(event.timestamp)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </GlassPanel>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
