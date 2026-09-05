// ============================================================
// RoadHealth Page — Dedicated Municipal Road Network Health
// ============================================================

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, MapPin, ShieldCheck, AlertTriangle, TrendingUp, RefreshCw, Compass } from 'lucide-react';
import { PageHeader, GlassPanel, LoadingState, EmptyState } from '@/components/ui';
import { api } from '@/services/api';
import { cn } from '@/lib/utils';
import type { RoadSegment, RoadHealthSummary } from '@/types';

export function RoadHealthPage() {
  const [segments, setSegments] = useState<RoadSegment[]>([]);
  const [summary, setSummary] = useState<RoadHealthSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    setError(null);
    Promise.allSettled([
      api.getRoadSegments(),
      api.getRoadHealthSummary()
    ]).then(([segRes, sumRes]) => {
      if (segRes.status === 'rejected' && sumRes.status === 'rejected') {
        setError('Failed to connect to road intelligence service.');
        setLoading(false);
        return;
      }

      if (segRes.status === 'fulfilled' && Array.isArray(segRes.value)) {
        setSegments(segRes.value);
      }
      if (sumRes.status === 'fulfilled' && sumRes.value) {
        setSummary(sumRes.value);
      }
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) return <LoadingState message="Analyzing road network surface condition..." size="lg" className="h-full min-h-[500px]" />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 bg-background">
        <GlassPanel padding="lg" className="max-w-md text-center space-y-4 border-red-500/20 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-status-critical shadow-[0_0_20px_rgba(239,68,68,0.2)]">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-on-surface">Data Stream Unavailable</h2>
          <p className="text-xs text-on-surface-variant leading-relaxed">{error}</p>
          <button 
            onClick={loadData} 
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-on-primary rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-lg hover:shadow-primary/25 inline-flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry Connection
          </button>
        </GlassPanel>
      </div>
    );
  }

  const avgScore = summary?.averageScore ?? 82;

  return (
    <div className="relative p-4 sm:p-6 lg:p-8 space-y-8 max-w-[1920px] mx-auto pb-24 overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute top-1/3 right-10 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none -z-10" />

      {/* Header Section */}
      <PageHeader
        title="Road Network Health"
        subtitle="Real-time condition assessment and pavement quality index across Bengaluru"
        breadcrumbs={[{ label: 'Intelligence' }, { label: 'Road Health' }]}
        action={
          <button 
            onClick={loadData}
            className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-container/80 hover:bg-surface-container-high text-xs font-semibold text-on-surface border border-outline-variant/80 hover:border-primary/40 shadow-sm backdrop-blur-md transition-all duration-300"
          >
            <RefreshCw className="w-3.5 h-3.5 text-primary group-hover:rotate-180 transition-transform duration-500" /> Refresh Telemetry
          </button>
        }
      />

      {/* Top Health Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* KPI 1 */}
        <GlassPanel padding="lg" className="relative overflow-hidden group hover:border-primary/50 hover:shadow-[0_0_30px_rgba(59,130,246,0.15)] transition-all duration-300 backdrop-blur-xl">
          <div className="flex items-center justify-between text-on-surface-variant text-xs mb-3">
            <span className="font-mono uppercase tracking-wider text-[11px] font-bold text-on-surface-variant">Network Health Index</span>
            <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shadow-[0_0_12px_rgba(59,130,246,0.2)]">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-4xl font-display-metrics font-extrabold tracking-tight text-on-surface">{avgScore.toFixed(0)}</span>
            <span className="text-xs text-on-surface-variant font-mono font-medium">/ 100</span>
          </div>
          <div className="w-full bg-surface-container-high/80 h-2 rounded-full mt-4 overflow-hidden p-0.5 border border-outline-variant/30">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-primary to-blue-400 transition-all duration-700 shadow-sm" 
              style={{ width: `${Math.min(Math.max(avgScore, 0), 100)}%` }}
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-emerald-400 mt-3 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <TrendingUp className="w-3.5 h-3.5" /> Good Municipal Grade
          </div>
        </GlassPanel>

        {/* KPI 2 */}
        <GlassPanel padding="lg" className="relative overflow-hidden group hover:border-blue-500/50 hover:shadow-[0_0_30px_rgba(96,165,250,0.15)] transition-all duration-300 backdrop-blur-xl">
          <div className="flex items-center justify-between text-on-surface-variant text-xs mb-3">
            <span className="font-mono uppercase tracking-wider text-[11px] font-bold text-on-surface-variant">Monitored Corridors</span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-[0_0_12px_rgba(96,165,250,0.2)]">
              <Compass className="w-4 h-4" />
            </div>
          </div>
          <div className="text-4xl font-display-metrics font-extrabold tracking-tight text-on-surface mt-1">
            {segments.length || summary?.totalSegments || 0}
          </div>
          <div className="text-xs text-on-surface-variant font-mono mt-4 flex items-center gap-1.5 font-medium">
            <MapPin className="w-3.5 h-3.5 text-blue-400" /> Active Arterial Segments
          </div>
        </GlassPanel>

        {/* KPI 3 */}
        <GlassPanel padding="lg" className="relative overflow-hidden group hover:border-amber-500/50 hover:shadow-[0_0_30px_rgba(251,191,36,0.15)] transition-all duration-300 backdrop-blur-xl">
          <div className="flex items-center justify-between text-on-surface-variant text-xs mb-3">
            <span className="font-mono uppercase tracking-wider text-[11px] font-bold text-on-surface-variant">Active Road Defects</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.2)]">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-4xl font-display-metrics font-extrabold tracking-tight text-amber-400 mt-1">
            {summary?.totalDefects ?? 0}
          </div>
          <div className="text-xs text-on-surface-variant font-mono mt-4 font-medium">Surface Anomalies Identified</div>
        </GlassPanel>

        {/* KPI 4 */}
        <GlassPanel padding="lg" className="relative overflow-hidden group hover:border-emerald-500/50 hover:shadow-[0_0_30px_rgba(52,211,153,0.15)] transition-all duration-300 backdrop-blur-xl">
          <div className="flex items-center justify-between text-on-surface-variant text-xs mb-3">
            <span className="font-mono uppercase tracking-wider text-[11px] font-bold text-on-surface-variant">SLA Resolution Rate</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.2)]">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-4xl font-display-metrics font-extrabold tracking-tight text-on-surface mt-1">
            94.2%
          </div>
          <div className="text-xs text-on-surface-variant font-mono mt-4 flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400" /> Within 48h Target
          </div>
        </GlassPanel>
      </div>

      {/* Corridor Segment Detail Table */}
      <GlassPanel padding="none" className="overflow-hidden border-outline-variant/80 shadow-2xl rounded-2xl backdrop-blur-xl">
        <div className="p-5 sm:px-8 border-b border-outline-variant/70 flex items-center justify-between bg-surface-container/40">
          <div>
            <h3 className="text-base font-bold text-on-surface tracking-tight flex items-center gap-2">
              <MapPin className="w-4.5 h-4.5 text-primary" /> Monitored Road Corridors
            </h3>
            <p className="text-xs text-on-surface-variant mt-0.5">Bengaluru municipal arterial road segments and condition scores</p>
          </div>
          <span className="px-3 py-1 rounded-lg bg-surface-container border border-outline-variant text-xs font-mono font-bold text-on-surface shadow-inner">
            {segments.length} segments
          </span>
        </div>

        {segments.length === 0 ? (
          <div className="p-16">
            <EmptyState
              icon={MapPin}
              title="No Road Segments Configured"
              description="Road corridor segments will appear once GIS spatial networks are synchronized."
            />
          </div>
        ) : (
          <div className="divide-y divide-outline-variant/50">
            {segments.map((seg, idx) => {
              const score = seg.healthScore ?? 80;
              let statusLabel = 'Optimal';
              let badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.1)]';
              let barColor = 'bg-emerald-500';
              let leftBorder = 'bg-emerald-500';

              if (score < 50) {
                statusLabel = 'Critical';
                badgeColor = 'bg-red-500/10 text-red-400 border-red-500/30 shadow-[0_0_12px_rgba(239,68,68,0.1)]';
                barColor = 'bg-red-500';
                leftBorder = 'bg-red-500';
              } else if (score < 70) {
                statusLabel = 'Attention';
                badgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.1)]';
                barColor = 'bg-amber-500';
                leftBorder = 'bg-amber-500';
              } else if (score < 85) {
                statusLabel = 'Good';
                badgeColor = 'bg-blue-500/10 text-blue-400 border-blue-500/30 shadow-[0_0_12px_rgba(59,130,246,0.1)]';
                barColor = 'bg-blue-500';
                leftBorder = 'bg-blue-500';
              }

              return (
                <motion.div 
                  key={seg.id || idx}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03, duration: 0.2 }}
                  className="group relative p-4 sm:px-8 hover:bg-surface-container/60 transition-all duration-200 flex items-center justify-between gap-6 flex-wrap"
                >
                  {/* Left Status Bar */}
                  <div className={cn("absolute left-0 top-1/2 -translate-y-1/2 w-1 h-10 rounded-r-full transition-all duration-300 group-hover:h-12", leftBorder)} />

                  <div className="flex items-center gap-4 min-w-[260px] pl-2">
                    <div className="w-10 h-10 rounded-xl bg-surface-container-high/80 border border-outline-variant/60 flex items-center justify-center text-primary shrink-0 shadow-inner group-hover:border-primary/40 transition-colors">
                      <MapPin className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors tracking-tight">
                        {seg.name}
                      </h4>
                      <span className="text-[11px] text-on-surface-variant font-mono tracking-wider uppercase font-semibold">
                        {seg.roadType || 'Arterial'} • Zone: Bengaluru Central
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 sm:gap-12">
                    <div className="text-right min-w-[120px]">
                      <div className="text-sm font-mono font-extrabold text-on-surface">{score} <span className="text-xs text-on-surface-variant font-normal">/ 100</span></div>
                      <div className="w-28 bg-surface-container-high/80 h-1.5 rounded-full mt-1.5 ml-auto overflow-hidden p-0.5 border border-outline-variant/30">
                        <div className={cn("h-full rounded-full transition-all duration-500", barColor)} style={{ width: `${Math.min(Math.max(score, 0), 100)}%` }} />
                      </div>
                      <div className="text-[10px] text-on-surface-variant uppercase tracking-wider font-mono font-medium mt-1">Condition Index</div>
                    </div>

                    <span className={cn('px-3 py-1 text-xs font-mono font-bold rounded-lg border uppercase tracking-wider transition-all duration-200', badgeColor)}>
                      {statusLabel}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </GlassPanel>
    </div>
  );
}

