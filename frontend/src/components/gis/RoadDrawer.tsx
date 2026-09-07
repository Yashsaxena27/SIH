// ============================================================
// RoadDrawer — Contextual drawer for Road Corridor GIS & Operational Road Health
// ============================================================

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Activity, 
  ShieldAlert, 
  AlertTriangle, 
  ShieldCheck, 
  Compass, 
  Building2, 
  ArrowRight,
  RefreshCw,
  GitBranch,
  Layers,
  MapPin,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/services/api';
import type { RoadSegment, RoadIssueSummary, UrbanIssue } from '@/types';

interface RoadDrawerProps {
  road: RoadSegment | null;
  onClose: () => void;
  onIssueSelect?: (issue: UrbanIssue | RoadIssueSummary) => void;
}

export function RoadDrawer({ road, onClose, onIssueSelect }: RoadDrawerProps) {
  const [loadingIssues, setLoadingIssues] = useState(false);
  const [corridorIssues, setCorridorIssues] = useState<RoadIssueSummary[]>([]);

  useEffect(() => {
    if (!road) {
      setCorridorIssues([]);
      return;
    }

    let isMounted = true;
    setLoadingIssues(true);

    api.getRoadIssues(road.id)
      .then(res => {
        if (isMounted) {
          setCorridorIssues(res.items || []);
        }
      })
      .catch(err => {
        console.warn('Failed to fetch corridor issues:', err);
        if (isMounted) setCorridorIssues([]);
      })
      .finally(() => {
        if (isMounted) setLoadingIssues(false);
      });

    return () => {
      isMounted = false;
    };
  }, [road]);

  if (!road) return null;

  const health = road.health || road.operational_health;
  const score = health?.score ?? health?.healthScore ?? road.healthScore ?? 0;
  const riskState = health?.riskState ?? (
    score >= 90 ? 'HEALTHY' :
    score >= 70 ? 'WATCH' :
    score >= 50 ? 'ELEVATED' : 'CRITICAL'
  );

  const getRiskColor = (state: string) => {
    switch (state) {
      case 'HEALTHY':
        return {
          text: 'text-emerald-400',
          bg: 'bg-emerald-500/10',
          border: 'border-emerald-500/30',
          badge: 'bg-emerald-500 text-black',
          bar: 'bg-emerald-400'
        };
      case 'WATCH':
        return {
          text: 'text-yellow-400',
          bg: 'bg-yellow-500/10',
          border: 'border-yellow-500/30',
          badge: 'bg-yellow-500 text-black',
          bar: 'bg-yellow-400'
        };
      case 'ELEVATED':
        return {
          text: 'text-orange-400',
          bg: 'bg-orange-500/10',
          border: 'border-orange-500/30',
          badge: 'bg-orange-500 text-white',
          bar: 'bg-orange-400'
        };
      case 'CRITICAL':
      default:
        return {
          text: 'text-red-400',
          bg: 'bg-red-500/10',
          border: 'border-red-500/30',
          badge: 'bg-red-500 text-white',
          bar: 'bg-red-500'
        };
    }
  };

  const riskTheme = getRiskColor(riskState);
  const factors = health?.factors;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[400] bg-black/40 backdrop-blur-[2px] md:hidden"
        onClick={onClose}
      />
      <motion.div
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="absolute right-0 top-0 bottom-0 z-[500] w-full md:w-[460px] flex flex-col pointer-events-auto bg-[#141519] border-l border-white/[0.08] shadow-2xl"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08] bg-[#141519] relative z-10 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-widest bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                {road.roadClass || road.roadType || 'Corridor'}
              </span>
              <span className="font-mono text-xs text-on-surface-variant/70 uppercase">
                {road.id}
              </span>
            </div>
            <h2 className="text-base font-bold text-white tracking-tight">
              {road.name || road.roadName || 'Municipal Road Corridor'}
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/[0.08] text-on-surface-variant/70 hover:text-white transition-colors"
            title="Close Drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto scrollbar-none relative z-10 p-5 space-y-6">
          
          {/* Operational Road Health Card */}
          <div className={cn(
            "p-4 rounded-xl border flex flex-col gap-3 relative overflow-hidden",
            riskTheme.bg,
            riskTheme.border
          )}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className={cn("w-4 h-4", riskTheme.text)} />
                <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  Operational Road Health
                </span>
              </div>
              <span className={cn(
                "px-2.5 py-0.5 rounded text-[10px] font-mono font-extrabold uppercase tracking-wider",
                riskTheme.badge
              )}>
                {riskState}
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className={cn("text-3xl font-extrabold font-mono", riskTheme.text)}>
                {score.toFixed(1)}
              </span>
              <span className="text-xs font-mono text-on-surface-variant/60">/ 100</span>
            </div>

            {/* Threshold Bar */}
            <div className="space-y-1">
              <div className="w-full h-2 bg-white/[0.08] rounded-full overflow-hidden flex">
                <div 
                  className={cn("h-full rounded-full transition-all duration-500", riskTheme.bar)}
                  style={{ width: `${Math.max(4, Math.min(100, score))}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] font-mono text-on-surface-variant/50 px-0.5">
                <span>0 (Critical)</span>
                <span>50</span>
                <span>70</span>
                <span>90 (Healthy)</span>
              </div>
            </div>

            {/* Explanation Note */}
            <p className="text-xs text-on-surface-variant/80 font-mono leading-relaxed mt-1">
              {health?.explanation || 'Operational road health index calculated from defect density and municipal resolution state.'}
            </p>

            <div className="text-[10px] font-mono text-on-surface-variant/50 italic border-t border-white/[0.06] pt-2">
              Decision-support metric derived from active defects, corroboration volume, and municipal ticket lifecycle. Not physical pavement engineering measurement.
            </div>
          </div>

          {/* Contributing Factors Breakdown */}
          {factors && (
            <div className="space-y-3">
              <div className="text-[10px] font-mono uppercase text-on-surface-variant/60 tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-primary" />
                Scoring Factor Breakdown
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 bg-white/[0.02] rounded-xl border border-white/[0.06] flex flex-col gap-1">
                  <span className="text-[10px] font-mono uppercase text-on-surface-variant/60">Active Anomalies</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-mono text-white text-base font-bold">{factors.activeIssueCount}</span>
                    <span className="text-[10px] font-mono text-on-surface-variant/50">
                      ({factors.criticalCount} crit · {factors.highCount} high)
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-white/[0.02] rounded-xl border border-white/[0.06] flex flex-col gap-1">
                  <span className="text-[10px] font-mono uppercase text-on-surface-variant/60">Corroborated</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-mono text-cyan-400 text-base font-bold">{factors.corroboratedCount}</span>
                    <span className="text-[10px] font-mono text-on-surface-variant/50">multi-bus</span>
                  </div>
                </div>

                <div className="p-3 bg-white/[0.02] rounded-xl border border-white/[0.06] flex flex-col gap-1">
                  <span className="text-[10px] font-mono uppercase text-on-surface-variant/60">Open Tickets</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-mono text-amber-400 text-base font-bold">{factors.openTicketCount}</span>
                    {factors.overdueTicketCount > 0 && (
                      <span className="text-[10px] font-mono text-red-400">({factors.overdueTicketCount} overdue)</span>
                    )}
                  </div>
                </div>

                <div className="p-3 bg-white/[0.02] rounded-xl border border-white/[0.06] flex flex-col gap-1">
                  <span className="text-[10px] font-mono uppercase text-on-surface-variant/60">Transit Passes</span>
                  <span className="font-mono text-emerald-400 text-base font-bold">
                    {factors.observationVolume}
                  </span>
                </div>
              </div>

              {/* Deductions Panel */}
              <div className="p-3 bg-white/[0.02] rounded-xl border border-white/[0.06] space-y-2">
                <span className="text-[10px] font-mono uppercase text-on-surface-variant/60">Penalty Deductions</span>
                <div className="space-y-1 text-xs font-mono">
                  <div className="flex justify-between text-on-surface-variant/80">
                    <span>Severity Penalty</span>
                    <span className="text-red-400">-{factors.severityDeduction} pts</span>
                  </div>
                  <div className="flex justify-between text-on-surface-variant/80">
                    <span>Multi-bus Corroboration</span>
                    <span className="text-orange-400">-{factors.corroborationDeduction} pts</span>
                  </div>
                  <div className="flex justify-between text-on-surface-variant/80">
                    <span>Unresolved Verifications</span>
                    <span className="text-yellow-400">-{factors.verificationDeduction} pts</span>
                  </div>
                  <div className="flex justify-between text-on-surface-variant/80">
                    <span>Municipal Ticket Delay</span>
                    <span className="text-purple-400">-{factors.ticketDeduction} pts</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-white/[0.06] font-bold text-white">
                    <span>Total Penalty</span>
                    <span className="text-red-400">-{factors.totalDeduction} pts</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Jurisdictional Owner */}
          <div className="p-3.5 bg-white/[0.02] rounded-xl border border-white/[0.06] flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-xs font-mono text-cyan-400 font-bold">
              <Building2 className="w-3.5 h-3.5" />
              <span>Corridor Jurisdiction</span>
            </div>
            <div className="text-xs font-semibold text-white">
              {road.authorityName || road.ownerAgency || 'Municipal Works Agency'}
            </div>
            <div className="font-mono text-[11px] text-on-surface-variant/70">
              Authority ID: {road.authorityId || 'AUTH-PWD-DELHI'}
            </div>
          </div>

          {/* Correlated Anomalies on this Corridor */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-mono uppercase text-on-surface-variant/60 tracking-wider flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5 text-primary" />
                Corridor Anomalies ({corridorIssues.length})
              </div>
              {loadingIssues && (
                <RefreshCw className="w-3 h-3 text-cyan-400 animate-spin" />
              )}
            </div>

            {corridorIssues.length === 0 && !loadingIssues && (
              <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.01] text-center text-xs font-mono text-on-surface-variant/60">
                No active anomalies mapped within 50m tolerance of this corridor centerline.
              </div>
            )}

            <div className="space-y-2">
              {corridorIssues.map(issue => (
                <div 
                  key={issue.id}
                  className="p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] transition-colors flex items-center justify-between group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase",
                        issue.severity === 'critical' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                        issue.severity === 'high' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                        issue.severity === 'medium' ? 'bg-amber-400/20 text-amber-400 border border-amber-400/30' :
                        'bg-emerald-400/20 text-emerald-400 border border-emerald-400/30'
                      )}>
                        {issue.severity}
                      </span>
                      <span className="font-mono text-xs text-white font-semibold capitalize">
                        {issue.type.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] font-mono text-on-surface-variant/60">
                      <span>#{issue.displayId || issue.id.slice(0, 10)}</span>
                      {issue.distanceToCenterlineMeters != null && (
                        <>
                          <span>•</span>
                          <span className="text-cyan-400 font-semibold">{issue.distanceToCenterlineMeters.toFixed(1)}m from center</span>
                        </>
                      )}
                      {issue.observationCount && issue.observationCount > 1 && (
                        <>
                          <span>•</span>
                          <span>{issue.observationCount} passes</span>
                        </>
                      )}
                    </div>
                  </div>

                  {onIssueSelect && (
                    <button
                      onClick={() => onIssueSelect(issue)}
                      className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-primary text-on-surface-variant/70 hover:text-on-primary transition-all text-xs font-mono flex items-center gap-1"
                      title="Inspect Anomaly"
                    >
                      <span>Inspect</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/[0.08] bg-[#141519] flex items-center justify-between text-xs font-mono text-on-surface-variant/60 shrink-0">
          <span>Corridor ID: {road.id}</span>
          <span className="text-cyan-400 flex items-center gap-1">
            <Compass className="w-3.5 h-3.5" /> Active PostGIS Spatial Index
          </span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
