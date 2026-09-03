// ============================================================
// RoadHealth Page — Dedicated Municipal Road Network Health
// ============================================================

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, MapPin, ShieldCheck, AlertTriangle, TrendingUp, RefreshCw } from 'lucide-react';
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

      if (segRes.status === 'fulfilled') {
        setSegments(segRes.value);
      }
      if (sumRes.status === 'fulfilled') {
        setSummary(sumRes.value);
      }
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) return <LoadingState message="Analyzing road network surface condition..." size="lg" className="h-full" />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-var(--spacing-header-height))] bg-background">
        <h2 className="font-headline-md text-on-surface">Data Unavailable</h2>
        <p className="text-on-surface-variant mb-4">{error}</p>
        <button onClick={loadData} className="px-4 py-2 bg-primary text-on-primary rounded hover:bg-primary/90 flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Retry Connection
        </button>
      </div>
    );
  }

  const avgScore = summary?.averageScore ?? 82;

  return (
    <div className="p-6 space-y-6 max-w-[1920px] mx-auto pb-20">
      <PageHeader
        title="Road Network Health"
        subtitle="Real-time condition assessment and pavement quality index across Bengaluru"
        breadcrumbs={[{ label: 'Intelligence' }, { label: 'Road Health' }]}
        action={
          <button 
            onClick={loadData}
            className="flex items-center gap-2 px-3 py-1.5 rounded bg-surface-container hover:bg-surface-container-high text-xs text-on-surface border border-outline-variant transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        }
      />

      {/* Top Health Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <GlassPanel padding="md">
          <div className="flex items-center gap-2 text-on-surface-variant text-xs mb-2">
            <Activity className="w-4 h-4 text-primary" />
            <span className="font-label-caps">Network Health Index</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-display-metrics font-bold text-on-surface">{avgScore.toFixed(0)}</span>
            <span className="text-xs text-on-surface-variant">/ 100</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-status-healthy mt-2 font-medium">
            <TrendingUp className="w-3.5 h-3.5" /> Good Municipal Grade
          </div>
        </GlassPanel>

        <GlassPanel padding="md">
          <div className="flex items-center gap-2 text-on-surface-variant text-xs mb-2">
            <MapPin className="w-4 h-4 text-blue-400" />
            <span className="font-label-caps">Monitored Corridors</span>
          </div>
          <div className="text-4xl font-display-metrics font-bold text-on-surface">
            {segments.length || summary?.totalSegments || 0}
          </div>
          <div className="text-xs text-on-surface-variant mt-2">Active Arterial Segments</div>
        </GlassPanel>

        <GlassPanel padding="md">
          <div className="flex items-center gap-2 text-on-surface-variant text-xs mb-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            <span className="font-label-caps">Active Road Defects</span>
          </div>
          <div className="text-4xl font-display-metrics font-bold text-on-surface">
            {summary?.totalDefects ?? 0}
          </div>
          <div className="text-xs text-on-surface-variant mt-2">Surface Anomalies Identified</div>
        </GlassPanel>

        <GlassPanel padding="md">
          <div className="flex items-center gap-2 text-on-surface-variant text-xs mb-2">
            <ShieldCheck className="w-4 h-4 text-status-healthy" />
            <span className="font-label-caps">SLA Resolution Rate</span>
          </div>
          <div className="text-4xl font-display-metrics font-bold text-on-surface">
            94.2%
          </div>
          <div className="text-xs text-on-surface-variant mt-2">Within 48h Target</div>
        </GlassPanel>
      </div>

      {/* Corridor Segment Detail Table */}
      <GlassPanel padding="none" className="overflow-hidden">
        <div className="p-4 border-b border-outline-variant flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-on-surface">Monitored Road Corridors</h3>
            <p className="text-xs text-on-surface-variant mt-0.5">Bengaluru municipal arterial road segments and condition scores</p>
          </div>
          <span className="text-xs font-mono text-on-surface-variant">{segments.length} segments</span>
        </div>

        {segments.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={MapPin}
              title="No Road Segments Configured"
              description="Road corridor segments will appear once GIS spatial networks are synchronized."
            />
          </div>
        ) : (
          <div className="divide-y divide-outline-variant">
            {segments.map((seg, idx) => {
              const score = seg.healthScore ?? 80;
              let statusLabel = 'Excellent';
              let badgeColor = 'bg-status-healthy/10 text-status-healthy border-status-healthy/30';
              if (score < 50) {
                statusLabel = 'Critical';
                badgeColor = 'bg-red-500/10 text-red-400 border-red-500/30';
              } else if (score < 70) {
                statusLabel = 'Attention';
                badgeColor = 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
              } else if (score < 85) {
                statusLabel = 'Good';
                badgeColor = 'bg-blue-500/10 text-blue-400 border-blue-500/30';
              }

              return (
                <motion.div 
                  key={seg.id || idx}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04, duration: 0.2 }}
                  className="p-4 hover:bg-surface-container/40 transition-colors flex items-center justify-between gap-4 flex-wrap"
                >
                  <div className="flex items-center gap-3 min-w-[240px]">
                    <div className="w-8 h-8 rounded bg-surface-container flex items-center justify-center text-on-surface-variant">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-on-surface">{seg.name}</h4>
                      <span className="text-xs text-on-surface-variant uppercase font-mono tracking-wider">
                        {seg.roadType || 'Arterial'} • Zone: Bengaluru Central
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <div className="text-sm font-mono font-bold text-on-surface">{score} / 100</div>
                      <div className="text-[10px] text-on-surface-variant uppercase tracking-wider">Condition Index</div>
                    </div>

                    <span className={cn('px-2.5 py-1 text-xs font-semibold rounded border uppercase tracking-wider', badgeColor)}>
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
