// ============================================================
// Analytics Page — 100% Database-Derived Urban Intelligence
// ============================================================

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Download, RefreshCw, Activity, MapPin, 
  Building2, AlertTriangle, CheckCircle2, 
  Clock, ShieldAlert, Bus as BusIcon, Layers,
  FileText, CheckCircle, BarChart3, Database
} from 'lucide-react';
import { PageHeader, GlassPanel, LoadingState } from '@/components/ui';
import { api } from '@/services/api';
import { cn } from '@/lib/utils';
import type { 
  AnalyticsSummary, 
  AnalyticsIssues, 
  AnalyticsTrends, 
  AnalyticsTickets, 
  AnalyticsVerifications, 
  AnalyticsAuthorities,
  AnalyticsRoadHealth 
} from '@/types';

export function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Database-derived states
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [issuesData, setIssuesData] = useState<AnalyticsIssues | null>(null);
  const [trendsData, setTrendsData] = useState<AnalyticsTrends | null>(null);
  const [ticketsData, setTicketsData] = useState<AnalyticsTickets | null>(null);
  const [verificationsData, setVerificationsData] = useState<AnalyticsVerifications | null>(null);
  const [authoritiesData, setAuthoritiesData] = useState<AnalyticsAuthorities | null>(null);
  const [roadHealthData, setRoadHealthData] = useState<AnalyticsRoadHealth | null>(null);

  const loadAllAnalytics = async (isManualRefresh: boolean = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [
        sumRes,
        issuesRes,
        trendsRes,
        ticketsRes,
        verifRes,
        authRes,
        healthRes
      ] = await Promise.allSettled([
        api.getAnalyticsSummary(),
        api.getAnalyticsIssues(),
        api.getAnalyticsTrends(),
        api.getAnalyticsTickets(),
        api.getAnalyticsVerifications(),
        api.getAnalyticsAuthorities(),
        api.getAnalyticsRoadHealth()
      ]);

      if (sumRes.status === 'fulfilled') setSummary(sumRes.value);
      if (issuesRes.status === 'fulfilled') setIssuesData(issuesRes.value);
      if (trendsRes.status === 'fulfilled') setTrendsData(trendsRes.value);
      if (ticketsRes.status === 'fulfilled') setTicketsData(ticketsRes.value);
      if (verifRes.status === 'fulfilled') setVerificationsData(verifRes.value);
      if (authRes.status === 'fulfilled') setAuthoritiesData(authRes.value);
      if (healthRes.status === 'fulfilled') setRoadHealthData(healthRes.value);

      if (sumRes.status === 'rejected') {
        throw new Error('Could not fetch core database summary');
      }
    } catch (err: any) {
      console.error('Failed to load database analytics:', err);
      setError(err?.message || 'Failed to compile database analytics intelligence.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAllAnalytics();
  }, []);

  const handleExportJson = () => {
    setExporting(true);
    try {
      const snapshot = {
        metadata: {
          exportedAt: new Date().toISOString(),
          provenance: 'DATABASE_DERIVED',
          system: 'POTHOLE WALA Urban Intelligence Network'
        },
        summary,
        issues: issuesData,
        tickets: ticketsData,
        verifications: verificationsData,
        authorities: authoritiesData,
        roadHealth: roadHealthData,
        trends: trendsData
      };
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `urban-intelligence-analytics-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export error:', e);
    } finally {
      setTimeout(() => setExporting(false), 500);
    }
  };

  if (loading) {
    return <LoadingState message="Connecting to PostGIS database & compiling analytics snapshot..." className="h-full" />;
  }

  if (error && !summary) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 bg-background">
        <GlassPanel padding="lg" className="max-w-md text-center space-y-4 border-red-500/20 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-status-critical">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-on-surface">Analytics Engine Unavailable</h2>
          <p className="text-xs text-on-surface-variant leading-relaxed font-mono">{error}</p>
          <button 
            onClick={() => loadAllAnalytics(false)} 
            className="px-4 py-2 bg-primary text-on-primary hover:bg-primary/90 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry Connection
          </button>
        </GlassPanel>
      </div>
    );
  }

  const totalIssues = summary?.totalIssues ?? 0;
  const totalDetections = summary?.totalDetections ?? 0;
  const totalObservations = summary?.totalObservations ?? 0;
  const totalTickets = summary?.totalTickets ?? 0;
  const totalVerifications = summary?.totalVerifications ?? 0;
  const resolvedJurisdictions = summary?.resolvedJurisdictions ?? 0;
  const unresolvedJurisdictions = summary?.unresolvedJurisdictions ?? 0;
  const uniqueObservingBuses = summary?.uniqueObservingBuses ?? 0;
  const totalSegments = summary?.totalRoadSegments ?? (roadHealthData?.totalSegments ?? 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-[1920px] mx-auto pb-24">
      
      {/* ── Header & Database Provenance ─────────────────────── */}
      <PageHeader
        title="Urban Intelligence Analytics"
        subtitle="100% database-derived infrastructure health, defect distributions, and municipal workload."
        breadcrumbs={[{ label: 'Intelligence' }, { label: 'Analytics' }]}
        action={
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono font-medium text-emerald-400">
              <Database className="w-3.5 h-3.5" />
              <span>LIVE DATABASE SNAPSHOT</span>
            </div>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => loadAllAnalytics(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-surface-container border border-outline-variant/60 text-xs font-mono font-medium text-on-surface hover:bg-surface-container-high transition-colors disabled:opacity-50"
              title="Refresh database queries"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin text-primary")} />
              <span>{refreshing ? 'Syncing...' : 'Refresh'}</span>
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleExportJson}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary hover:bg-primary/90 text-xs font-bold uppercase tracking-wider transition-all shadow-sm disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              {exporting ? 'Exporting...' : 'Export Snapshot'}
            </motion.button>
          </div>
        }
      />

      {/* ── 1. Executive Database KPI Matrix ─────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4">
        
        {/* Total Issues */}
        <GlassPanel padding="md" className="border-outline-variant/70 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant mb-2">
            <span className="text-[11px] font-mono uppercase font-bold tracking-wider">Total Issues</span>
            <AlertTriangle className="w-4 h-4 text-primary" />
          </div>
          <div className="text-3xl font-mono font-black text-on-surface tracking-tight">
            {totalIssues}
          </div>
          <div className="text-[10px] font-mono text-on-surface-variant/80 mt-1 flex items-center gap-1">
            <span className="text-emerald-400 font-bold">{resolvedJurisdictions}</span> mapped
            <span className="text-on-surface-variant/40">/</span>
            <span className="text-amber-400 font-bold">{unresolvedJurisdictions}</span> unmapped
          </div>
        </GlassPanel>

        {/* Detections */}
        <GlassPanel padding="md" className="border-outline-variant/70 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant mb-2">
            <span className="text-[11px] font-mono uppercase font-bold tracking-wider">AI Detections</span>
            <Activity className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-3xl font-mono font-black text-on-surface tracking-tight">
            {totalDetections}
          </div>
          <div className="text-[10px] font-mono text-on-surface-variant/80 mt-1">
            Raw CV inference events
          </div>
        </GlassPanel>

        {/* Observations */}
        <GlassPanel padding="md" className="border-outline-variant/70 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant mb-2">
            <span className="text-[11px] font-mono uppercase font-bold tracking-wider">Observations</span>
            <Layers className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-3xl font-mono font-black text-on-surface tracking-tight">
            {totalObservations}
          </div>
          <div className="text-[10px] font-mono text-on-surface-variant/80 mt-1">
            Fused spatial sightings
          </div>
        </GlassPanel>

        {/* Municipal Tickets */}
        <GlassPanel padding="md" className="border-outline-variant/70 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant mb-2">
            <span className="text-[11px] font-mono uppercase font-bold tracking-wider">Work Tickets</span>
            <FileText className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-mono font-black text-on-surface tracking-tight">
            {totalTickets}
          </div>
          <div className="text-[10px] font-mono text-on-surface-variant/80 mt-1">
            Municipal work orders
          </div>
        </GlassPanel>

        {/* Verifications */}
        <GlassPanel padding="md" className="border-outline-variant/70 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant mb-2">
            <span className="text-[11px] font-mono uppercase font-bold tracking-wider">Verifications</span>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-mono font-black text-on-surface tracking-tight">
            {totalVerifications}
          </div>
          <div className="text-[10px] font-mono text-on-surface-variant/80 mt-1">
            Post-repair audits
          </div>
        </GlassPanel>

        {/* Observing Buses */}
        <GlassPanel padding="md" className="border-outline-variant/70 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant mb-2">
            <span className="text-[11px] font-mono uppercase font-bold tracking-wider">Active Fleet</span>
            <BusIcon className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-mono font-black text-on-surface tracking-tight">
            {uniqueObservingBuses}
          </div>
          <div className="text-[10px] font-mono text-on-surface-variant/80 mt-1">
            Unique reporting vehicles
          </div>
        </GlassPanel>

        {/* Road Network Segments */}
        <GlassPanel padding="md" className="border-outline-variant/70 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant mb-2">
            <span className="text-[11px] font-mono uppercase font-bold tracking-wider">Road Network</span>
            <MapPin className="w-4 h-4 text-orange-400" />
          </div>
          <div className="text-3xl font-mono font-black text-on-surface tracking-tight">
            {totalSegments}
          </div>
          <div className="text-[10px] font-mono text-on-surface-variant/80 mt-1">
            Monitored corridors
          </div>
        </GlassPanel>

      </div>

      {/* ── 2. Road Health Index & Surface Condition ─────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* City Road Health Score (Decision Support) */}
        <GlassPanel padding="lg" className="xl:col-span-4 flex flex-col justify-center border-outline-variant/80 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-4 text-on-surface-variant">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              <span className="font-mono text-xs font-bold uppercase tracking-wider">Average Road Health</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
              Decision Support
            </span>
          </div>
          
          <div className="flex items-end gap-3 mb-3">
            <div className={cn("font-mono font-black text-on-surface leading-none tracking-tight", roadHealthData?.averageHealthScore != null ? "text-6xl sm:text-7xl" : "text-4xl sm:text-5xl text-zinc-500")}>
              {roadHealthData?.averageHealthScore != null ? roadHealthData.averageHealthScore.toFixed(1) : 'UNAVAILABLE'}
            </div>
            {roadHealthData?.averageHealthScore != null && (
              <div className="text-2xl text-on-surface-variant/60 font-mono font-light mb-1">/ 100</div>
            )}
          </div>

          <p className="text-xs text-on-surface-variant leading-relaxed">
            Composite health score calculated across all {totalSegments} monitored road segments based on active defect burden and severity deductions.
          </p>

          <div className="mt-4 pt-3 border-t border-outline-variant/40 flex items-center justify-between text-[11px] font-mono text-on-surface-variant/70">
            <span>Score Provenance:</span>
            <span className="font-semibold text-on-surface">DECISION_SUPPORT_DERIVED</span>
          </div>
        </GlassPanel>

        {/* Pavement Burden Distribution */}
        <GlassPanel padding="lg" className="xl:col-span-8 flex flex-col justify-center border-outline-variant/80 shadow-lg">
          <div className="flex items-center justify-between mb-5 text-on-surface-variant">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              <span className="font-mono text-xs font-bold uppercase tracking-wider">Segment Health Distribution ({totalSegments} Segments)</span>
            </div>
            <span className="text-[10px] font-mono text-on-surface-variant/60">
              Threshold: &gt;=85 Exc | 70-84 Good | 50-69 Fair | &lt;50 Crit
            </span>
          </div>

          {(() => {
            const dist = roadHealthData?.distribution || { excellent: 0, good: 0, fair: 0, critical: 0 };
            const total = Math.max(totalSegments, 1);
            return (
              <div className="space-y-4">
                <div className="h-4 flex rounded-xl overflow-hidden bg-surface-container-high p-0.5 border border-outline-variant/40">
                  <div style={{ width: `${(dist.excellent / total) * 100}%` }} className="bg-emerald-500 rounded-l-lg transition-all" title={`Excellent: ${dist.excellent}`} />
                  <div style={{ width: `${(dist.good / total) * 100}%` }} className="bg-blue-500 transition-all" title={`Good: ${dist.good}`} />
                  <div style={{ width: `${(dist.fair / total) * 100}%` }} className="bg-amber-500 transition-all" title={`Fair: ${dist.fair}`} />
                  <div style={{ width: `${(dist.critical / total) * 100}%` }} className="bg-rose-500 rounded-r-lg transition-all" title={`Critical: ${dist.critical}`} />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono">
                  <div className="p-3 rounded-xl border bg-emerald-500/10 border-emerald-500/20">
                    <div className="text-xs text-on-surface-variant uppercase font-bold tracking-wider">Excellent (&gt;=85)</div>
                    <div className="text-2xl font-black text-emerald-400 mt-1">{dist.excellent}</div>
                    <div className="text-[10px] text-on-surface-variant/70 mt-0.5">{((dist.excellent / total) * 100).toFixed(0)}% of network</div>
                  </div>

                  <div className="p-3 rounded-xl border bg-blue-500/10 border-blue-500/20">
                    <div className="text-xs text-on-surface-variant uppercase font-bold tracking-wider">Good (70-84)</div>
                    <div className="text-2xl font-black text-blue-400 mt-1">{dist.good}</div>
                    <div className="text-[10px] text-on-surface-variant/70 mt-0.5">{((dist.good / total) * 100).toFixed(0)}% of network</div>
                  </div>

                  <div className="p-3 rounded-xl border bg-amber-500/10 border-amber-500/20">
                    <div className="text-xs text-on-surface-variant uppercase font-bold tracking-wider">Fair (50-69)</div>
                    <div className="text-2xl font-black text-amber-400 mt-1">{dist.fair}</div>
                    <div className="text-[10px] text-on-surface-variant/70 mt-0.5">{((dist.fair / total) * 100).toFixed(0)}% of network</div>
                  </div>

                  <div className="p-3 rounded-xl border bg-rose-500/10 border-rose-500/20">
                    <div className="text-xs text-on-surface-variant uppercase font-bold tracking-wider">Critical (&lt;50)</div>
                    <div className="text-2xl font-black text-rose-400 mt-1">{dist.critical}</div>
                    <div className="text-[10px] text-on-surface-variant/70 mt-0.5">{((dist.critical / total) * 100).toFixed(0)}% of network</div>
                  </div>
                </div>
              </div>
            );
          })()}
        </GlassPanel>

      </div>

      {/* ── 3. Issue Intelligence & Severity Matrix ───────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Severity Distribution */}
        <GlassPanel padding="lg" className="border-outline-variant/80 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3">
            <div className="flex items-center gap-2 font-mono">
              <ShieldAlert className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Issue Severity Breakdown</span>
            </div>
            <span className="text-xs font-mono font-bold text-on-surface">{totalIssues} Issues Total</span>
          </div>

          <div className="space-y-3 font-mono">
            {['critical', 'high', 'medium', 'low'].map((sev) => {
              const count = issuesData?.bySeverity?.find(s => s.severity.toLowerCase() === sev)?.count ?? 0;
              const pct = totalIssues > 0 ? (count / totalIssues) * 100 : 0;
              
              const colorClass = 
                sev === 'critical' ? 'text-rose-400 bg-rose-500' :
                sev === 'high' ? 'text-orange-400 bg-orange-500' :
                sev === 'medium' ? 'text-amber-400 bg-amber-500' :
                'text-emerald-400 bg-emerald-500';

              return (
                <div key={sev} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="uppercase font-bold tracking-wider flex items-center gap-1.5">
                      <span className={cn("w-2 h-2 rounded-full", colorClass.split(' ')[1])} />
                      {sev} Severity
                    </span>
                    <span className="text-on-surface font-black">
                      {count} <span className="text-on-surface-variant/60 font-normal">({pct.toFixed(1)}%)</span>
                    </span>
                  </div>
                  <div className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden">
                    <div 
                      style={{ width: `${pct}%` }} 
                      className={cn("h-full transition-all duration-500", colorClass.split(' ')[1])} 
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 text-[11px] font-mono text-on-surface-variant/70 flex items-center justify-between">
            <span>Aggregated directly from UrbanIssue.severity</span>
            <span>Zero synthetic padding</span>
          </div>
        </GlassPanel>

        {/* Issue Lifecycle Status */}
        <GlassPanel padding="lg" className="border-outline-variant/80 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3">
            <div className="flex items-center gap-2 font-mono">
              <Clock className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Issue Lifecycle Pipeline</span>
            </div>
            <span className="text-xs font-mono text-on-surface-variant">Live States</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono">
            {(issuesData?.byStatus || []).map((item) => (
              <div 
                key={item.status} 
                className="p-3 rounded-xl bg-surface-container/60 border border-outline-variant/40 flex flex-col justify-between"
              >
                <div className="text-[11px] uppercase tracking-wider text-on-surface-variant font-bold">
                  {item.status.replace(/_/g, ' ')}
                </div>
                <div className="text-2xl font-black text-on-surface mt-1">
                  {item.count}
                </div>
                <div className="text-[10px] text-on-surface-variant/60 mt-0.5">
                  {totalIssues > 0 ? ((item.count / totalIssues) * 100).toFixed(0) : 0}% of issues
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 text-[11px] font-mono text-on-surface-variant/70 flex items-center justify-between">
            <span>Includes verified resolution & post-repair verification</span>
          </div>
        </GlassPanel>

      </div>

      {/* ── 4. Multi-Authority Municipal Workload ─────────────── */}
      <GlassPanel padding="lg" className="border-outline-variant/80 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-outline-variant/60 pb-3">
          <div className="flex items-center gap-2 font-mono">
            <Building2 className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Authority Workload & Routing Integrity</span>
          </div>
          <div className="text-[11px] font-mono text-on-surface-variant/80">
            Source: Spatial Ownership & Configured Prototype Boundary
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-outline-variant/60 text-on-surface-variant text-[11px] uppercase tracking-wider">
                <th className="pb-3 font-bold">Authority</th>
                <th className="pb-3 font-bold">Code</th>
                <th className="pb-3 font-bold">Type / Provenance</th>
                <th className="pb-3 font-bold text-right">Assigned Issues</th>
                <th className="pb-3 font-bold text-right">Total Tickets</th>
                <th className="pb-3 font-bold text-right">Open</th>
                <th className="pb-3 font-bold text-right">In Progress</th>
                <th className="pb-3 font-bold text-right">Resolved</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {(authoritiesData?.authorities || []).map((auth) => {
                const isUnresolved = auth.authorityId === 'unresolved';
                return (
                  <tr key={auth.authorityId} className={cn("hover:bg-surface-container/50 transition-colors", isUnresolved && "bg-amber-500/5")}>
                    <td className="py-3 font-bold text-on-surface flex items-center gap-2">
                      {isUnresolved ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      ) : (
                        <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                      )}
                      <span>{auth.authorityName}</span>
                    </td>
                    <td className="py-3 text-on-surface-variant">{auth.authorityCode}</td>
                    <td className="py-3">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                        isUnresolved 
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" 
                          : "bg-surface-container-high text-on-surface-variant border border-outline-variant/40"
                      )}>
                        {auth.authorityType.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 text-right font-black text-on-surface">{auth.issuesCount}</td>
                    <td className="py-3 text-right font-black text-on-surface">{auth.ticketsCount}</td>
                    <td className="py-3 text-right font-bold text-amber-400">{auth.openTicketsCount}</td>
                    <td className="py-3 text-right font-bold text-blue-400">{auth.inProgressTicketsCount}</td>
                    <td className="py-3 text-right font-bold text-emerald-400">{auth.resolvedTicketsCount}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between text-[11px] font-mono text-on-surface-variant/70 gap-2">
          <span>* Unresolved Jurisdiction represents real issues located outside configured prototype boundaries or pending survey polygons.</span>
          <span>Exact PostGIS spatial fusion counts</span>
        </div>
      </GlassPanel>

      {/* ── 5. Municipal Tickets & Closed-Loop Verification ───── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Tickets Breakdown */}
        <GlassPanel padding="lg" className="border-outline-variant/80 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3 font-mono">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Municipal Ticket States ({totalTickets} Total)</span>
            </div>
            <span className="text-xs font-bold text-on-surface">Phase 11-14 Engine</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 font-mono">
            {(ticketsData?.byStatus || []).map((t) => (
              <div key={t.status} className="p-3 rounded-xl bg-surface-container/40 border border-outline-variant/30 flex flex-col justify-between">
                <span className="text-[10px] uppercase font-bold text-on-surface-variant">
                  {t.status.replace(/_/g, ' ')}
                </span>
                <span className="text-xl font-black text-on-surface mt-1">{t.count}</span>
              </div>
            ))}
          </div>

          {/* Ticket Priority Breakdown */}
          <div className="pt-2 border-t border-outline-variant/40 space-y-2 font-mono">
            <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Priority Distribution</span>
            <div className="grid grid-cols-4 gap-2">
              {(ticketsData?.byPriority || []).map((p) => (
                <div key={p.priority} className="text-center p-2 rounded-lg bg-surface-container/30 border border-outline-variant/30">
                  <div className="text-[10px] uppercase text-on-surface-variant">{p.priority}</div>
                  <div className="text-sm font-black text-on-surface mt-0.5">{p.count}</div>
                </div>
              ))}
            </div>
          </div>
        </GlassPanel>

        {/* Verification Outcomes */}
        <GlassPanel padding="lg" className="border-outline-variant/80 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3 font-mono">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Closed-Loop Verification Audits</span>
            </div>
            <span className="text-xs font-bold text-on-surface">{totalVerifications} Audits Recorded</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
            {(verificationsData?.byResult || []).map((v) => {
              const isResolved = v.result === 'resolved';
              const isUnresolved = v.result === 'unresolved';
              return (
                <div 
                  key={v.result}
                  className={cn(
                    "p-4 rounded-xl border flex flex-col justify-between",
                    isResolved ? "bg-emerald-500/10 border-emerald-500/20" :
                    isUnresolved ? "bg-rose-500/10 border-rose-500/20" :
                    "bg-surface-container/50 border-outline-variant/40"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase font-bold text-on-surface">
                      {v.result.replace(/_/g, ' ')}
                    </span>
                    {isResolved ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                    )}
                  </div>
                  <div className="text-3xl font-black text-on-surface mt-3">
                    {v.count}
                  </div>
                  <div className="text-[10px] text-on-surface-variant/70 mt-1">
                    {totalVerifications > 0 ? ((v.count / totalVerifications) * 100).toFixed(0) : 0}% of audited tickets
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3 rounded-xl bg-surface-container-high/40 border border-outline-variant/40 text-[11px] font-mono text-on-surface-variant">
            Independent computer vision inspection jobs re-observe repaired coordinates to verify whether defects are genuinely resolved.
          </div>
        </GlassPanel>

      </div>

      {/* ── 6. Temporal Ingestion & Detection Timeline ───────── */}
      <GlassPanel padding="lg" className="border-outline-variant/80 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-outline-variant/60 pb-3 font-mono">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Temporal Ingestion History</span>
          </div>
          <div className="text-[11px] text-on-surface-variant">
            Date-stamped PostGIS Detections & Issues
          </div>
        </div>

        {trendsData && trendsData.detectionsByDate.length > 0 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 font-mono">
              {trendsData.detectionsByDate.slice(-12).map((pt) => {
                const issuePt = trendsData.issuesByDate.find(i => i.date === pt.date);
                return (
                  <div key={pt.date} className="p-2.5 rounded-xl bg-surface-container/50 border border-outline-variant/40 flex flex-col justify-between">
                    <span className="text-[10px] text-on-surface-variant/80">{pt.date}</span>
                    <div className="mt-1">
                      <div className="text-base font-black text-on-surface">{pt.count} <span className="text-[9px] font-normal text-blue-400">dets</span></div>
                      <div className="text-xs font-bold text-on-surface-variant">{issuePt?.count ?? 0} <span className="text-[9px] font-normal text-amber-400">issues</span></div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-3 rounded-xl bg-surface-container/30 border border-outline-variant/30 text-[11px] font-mono text-on-surface-variant flex items-center justify-between">
              <span>{trendsData.note}</span>
              <span className="text-primary font-bold">100% DATABASE TRUTH</span>
            </div>
          </div>
        ) : (
          <div className="h-32 w-full flex flex-col items-center justify-center border border-dashed border-outline-variant/60 rounded-xl p-4 text-center">
            <Activity className="w-6 h-6 text-on-surface-variant/40 mb-1" />
            <p className="text-xs font-bold text-on-surface">No Temporal Telemetry Logged Yet</p>
            <p className="text-[10px] font-mono text-on-surface-variant/60">Run video inspection or simulate fleet runs to populate timestamps.</p>
          </div>
        )}
      </GlassPanel>

      {/* ── 7. Pavement Priority Watchlist ──────────────────── */}
      {roadHealthData?.segments && roadHealthData.segments.length > 0 && (
        <GlassPanel padding="lg" className="border-outline-variant/80 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3 font-mono">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Priority Road Segments (Highest Defect Burden)</span>
            </div>
            <span className="text-xs font-mono text-on-surface-variant">Ranked by lowest health score</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {roadHealthData.segments.slice(0, 6).map((seg, idx) => {
              const score = seg.healthScore;
              const isCrit = score < 50;
              const isFair = score >= 50 && score < 70;
              const isGood = score >= 70 && score < 85;

              return (
                <div 
                  key={seg.segmentId} 
                  className="p-4 rounded-xl bg-surface-container/50 border border-outline-variant/40 flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs font-mono font-bold text-on-surface-variant">Rank #{idx + 1}</div>
                      <div className="text-sm font-bold text-on-surface mt-0.5">{seg.name}</div>
                      <div className="text-[10px] font-mono text-on-surface-variant/70 uppercase">{seg.roadClass}</div>
                    </div>
                    <div className={cn(
                      "text-2xl font-mono font-black",
                      isCrit ? "text-rose-400" : isFair ? "text-amber-400" : isGood ? "text-blue-400" : "text-emerald-400"
                    )}>
                      {score.toFixed(0)}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-outline-variant/30 flex items-center justify-between text-[11px] font-mono text-on-surface-variant/80">
                    <span>Active Defects: <strong className="text-on-surface">{seg.factors?.activeIssueCount ?? 0}</strong></span>
                    <span>Reopened: <strong className="text-on-surface">{seg.factors?.reopenedCount ?? 0}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-[11px] font-mono text-on-surface-variant/60">
            {roadHealthData.disclaimer}
          </p>
        </GlassPanel>
      )}

    </div>
  );
}
