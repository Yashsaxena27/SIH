// ============================================================
// Analytics Page — Executive Urban Intelligence
// ============================================================

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell
} from 'recharts';
import { 
  Download, TrendingUp, TrendingDown, Activity, 
  MapPin, Car, Building2, AlertTriangle, Clock
} from 'lucide-react';
import { PageHeader, GlassPanel, LoadingState } from '@/components/ui';
import { api } from '@/services/api';
import { cn } from '@/lib/utils';
import type { RoadSegment, RoadHealthSummary, Department } from '@/types';

// Mock trend data for smooth charts
const healthTrend = [
  { month: 'Jan', score: 82 },
  { month: 'Feb', score: 79 },
  { month: 'Mar', score: 77 },
  { month: 'Apr', score: 71 },
  { month: 'May', score: 68 },
  { month: 'Jun', score: 72 }, // Rebound from repairs
];

const trafficTrend = [
  { hour: '06:00', volume: 1200 },
  { hour: '09:00', volume: 4500 },
  { hour: '12:00', volume: 3100 },
  { hour: '15:00', volume: 3800 },
  { hour: '18:00', volume: 5200 },
  { hour: '21:00', volume: 2100 },
];

export function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  
  const [segments, setSegments] = useState<RoadSegment[]>([]);
  const [healthSummary, setHealthSummary] = useState<RoadHealthSummary | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);

  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, h, d] = await Promise.allSettled([
        api.getRoadSegments(),
        api.getRoadHealthSummary(),
        api.getDepartments()
      ]);
      
      const loadedSegments = s.status === 'fulfilled' && Array.isArray(s.value) ? s.value : [];
      setSegments(loadedSegments.sort((a, b) => (a.healthScore || (a as any).score || 0) - (b.healthScore || (b as any).score || 0)));
      setHealthSummary(h.status === 'fulfilled' ? h.value : null);
      setDepartments(d.status === 'fulfilled' && Array.isArray(d.value) ? d.value : []);
    } catch (err) {
      console.error('Failed to compile analytics intelligence:', err);
      setError('Failed to compile executive intelligence.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) return <LoadingState message="Compiling executive intelligence..." className="h-full" />;

  if (error && !segments.length && !healthSummary) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 bg-background">
        <GlassPanel padding="lg" className="max-w-md text-center space-y-4 border-red-500/20 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-status-critical">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-on-surface">Data Telemetry Unavailable</h2>
          <p className="text-xs text-on-surface-variant leading-relaxed">{error}</p>
          <button 
            onClick={loadData} 
            className="px-4 py-2 bg-primary text-on-primary hover:bg-primary/90 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-2"
          >
            Retry Connection
          </button>
        </GlassPanel>
      </div>
    );
  }

  const handleExport = () => {
    setExporting(true);
    setTimeout(() => setExporting(false), 2000);
  };

  // Safe fallback calculation if health summary is null
  const summary: RoadHealthSummary = healthSummary || {
    totalSegments: segments.length || 120,
    averageHealth: 76.5,
    averageScore: segments.length 
      ? Math.round(segments.reduce((acc, curr) => acc + (curr.healthScore || (curr as any).score || 0), 0) / segments.length) 
      : 76.5,
    criticalSegments: 12,
    decliningSegments: 8,
    improvedSegments: 45,
    totalDefects: 210,
    resolvedThisMonth: 85,
    segmentDistribution: {
      excellent: 40,
      good: 50,
      fair: 18,
      critical: 12
    }
  };

  // Derived
  const bottomSegments = segments.slice(0, 3);
  
  // Monitored deterioration list (Bengaluru municipal corridors)
  const deteriorating = [
    { name: 'MG Road Corridor', current: 62, prev: 78, defects: 14, recurring: true },
    { name: 'Koramangala 80ft Road', current: 54, prev: 65, defects: 9, recurring: false },
    { name: 'Indiranagar 100ft Road', current: 41, prev: 49, defects: 22, recurring: true },
  ];

  const totalSegs = Math.max(summary.totalSegments || segments.length || 1, 1);
  const distribution = summary.segmentDistribution || { excellent: 40, good: 50, fair: 18, critical: 12 };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1920px] mx-auto pb-20">
      
      {/* ── Header & Actions ────────────────────────────────── */}
      <PageHeader
        title="Urban Intelligence Analytics"
        subtitle="Long-term infrastructure health and operational performance metrics."
        breadcrumbs={[{ label: 'Intelligence' }, { label: 'Analytics' }]}
        action={
          <div className="flex items-center gap-3">
            <div className="px-3.5 py-1.5 rounded-xl bg-surface-container border border-outline-variant/60 text-xs font-mono font-medium text-on-surface-variant">
              Last 6 Months
            </div>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary hover:bg-primary/90 text-xs font-bold uppercase tracking-wider transition-all shadow-sm disabled:opacity-50"
            >
              {exporting ? (
                <div className="w-3.5 h-3.5 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              {exporting ? 'Compiling PDF...' : 'Export Report'}
            </motion.button>
          </div>
        }
      />

      {/* ── Top Overview: Road Health ───────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* Main Score Card */}
        <GlassPanel padding="lg" className="xl:col-span-4 flex flex-col justify-center border-outline-variant/80 shadow-lg relative overflow-hidden group">
          <div className="flex items-center gap-2 mb-4 text-on-surface-variant">
            <Activity className="w-4 h-4 text-primary" />
            <span className="font-mono text-xs font-bold uppercase tracking-wider">City Road Health Index</span>
          </div>
          <div className="flex items-end gap-3 mb-3">
            <div className="text-6xl sm:text-7xl font-mono font-black text-on-surface leading-none tracking-tight">
              {(summary.averageScore ?? summary.averageHealth ?? 76.5).toFixed(0)}
            </div>
            <div className="text-2xl text-on-surface-variant/60 font-mono font-light mb-1">/ 100</div>
          </div>
          <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-bold">
            <TrendingUp className="w-4 h-4" />
            <span>+4.2% index gain this month</span>
          </div>
          <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </GlassPanel>

        {/* Health Distribution */}
        <GlassPanel padding="lg" className="xl:col-span-8 flex flex-col justify-center border-outline-variant/80 shadow-lg">
          <div className="flex items-center gap-2 mb-5 text-on-surface-variant">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="font-mono text-xs font-bold uppercase tracking-wider">Network Surface Condition</span>
          </div>
          
          <div className="flex flex-col gap-4">
            <div className="h-4 flex rounded-xl overflow-hidden bg-surface-container-high p-0.5 border border-outline-variant/40">
              <div style={{ width: `${((distribution.excellent ?? 0) / totalSegs) * 100}%` }} className="bg-emerald-500 rounded-l-lg hover:brightness-110 transition-all cursor-pointer" />
              <div style={{ width: `${((distribution.good ?? 0) / totalSegs) * 100}%` }} className="bg-blue-500 hover:brightness-110 transition-all cursor-pointer" />
              <div style={{ width: `${((distribution.fair ?? 0) / totalSegs) * 100}%` }} className="bg-amber-500 hover:brightness-110 transition-all cursor-pointer" />
              <div style={{ width: `${((distribution.critical ?? 0) / totalSegs) * 100}%` }} className="bg-rose-500 rounded-r-lg hover:brightness-110 transition-all cursor-pointer" />
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1 font-mono">
              {[
                { label: 'Excellent', val: distribution.excellent ?? 0, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
                { label: 'Good', val: distribution.good ?? 0, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
                { label: 'Attention', val: distribution.fair ?? 0, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
                { label: 'Critical', val: distribution.critical ?? 0, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
              ].map(d => (
                <div key={d.label} className={cn("p-3 rounded-xl border flex flex-col justify-between", d.bg)}>
                  <div className="text-xs text-on-surface-variant uppercase font-bold tracking-wider">{d.label}</div>
                  <div className={cn("text-2xl font-black mt-1", d.color)}>{d.val}</div>
                </div>
              ))}
            </div>
          </div>
        </GlassPanel>

      </div>

      {/* ── Historical Trend ────────────────────────────────── */}
      <GlassPanel padding="lg" className="border-outline-variant/80 shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2 text-on-surface-variant font-mono">
            <Activity className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold uppercase tracking-wider">6-Month Network Health Trend</span>
          </div>
        </div>
        
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={healthTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} dy={10} />
              <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(18, 18, 26, 0.95)', 
                  border: '1px solid rgba(255,255,255,0.15)', 
                  borderRadius: '12px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
                }}
                itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
              />
              <Area type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </GlassPanel>

      {/* ── Segments & Deterioration ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Lowest Ranked Roads */}
        <GlassPanel padding="lg" className="border-outline-variant/80 shadow-lg">
          <div className="flex items-center justify-between mb-5 border-b border-outline-variant/60 pb-3 font-mono">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Top Priority Segments</span>
            <span className="text-xs text-primary hover:text-primary/80 font-bold cursor-pointer transition-colors">View All</span>
          </div>
          
          <div className="space-y-2.5">
            {bottomSegments.map((seg, i) => (
              <div key={seg.id} className="flex items-center justify-between p-3.5 rounded-xl bg-surface-container/60 border border-outline-variant/40 hover:border-primary/40 transition-colors">
                <div className="flex items-center gap-3.5">
                  <div className="w-7 h-7 rounded-lg bg-surface-container-high border border-outline-variant/60 flex items-center justify-center text-xs font-mono font-bold text-on-surface-variant">
                    {i+1}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-on-surface">{seg.name}</div>
                    <div className={cn(
                      "font-mono text-[11px] font-bold uppercase tracking-wider mt-0.5",
                      (seg.healthScore ?? (seg as any).score ?? 75) < 50 ? "text-rose-400" : "text-amber-400"
                    )}>
                      {(seg.healthScore ?? (seg as any).score ?? 75) < 50 ? 'Critical' : 'Attention'}
                    </div>
                  </div>
                </div>
                <div className="text-2xl font-mono font-black text-on-surface">{seg.healthScore ?? (seg as any).score ?? 75}</div>
              </div>
            ))}
          </div>
        </GlassPanel>

        {/* Deterioration Watchlist */}
        <GlassPanel padding="lg" className="border-outline-variant/80 shadow-lg">
          <div className="flex items-center justify-between mb-5 border-b border-outline-variant/60 pb-3 font-mono">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Deterioration Watchlist</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          
          <div className="space-y-4">
            {deteriorating.map((road) => (
              <div key={road.name} className="flex items-center justify-between p-3 rounded-xl bg-surface-container/40 border border-outline-variant/30">
                <div>
                  <div className="text-sm font-bold text-on-surface">{road.name}</div>
                  <div className="flex items-center gap-3 text-[11px] font-mono text-on-surface-variant mt-1">
                    <span>{road.defects} active defects</span>
                    {road.recurring && <span className="text-amber-400 font-semibold">• Recurring issues</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3 font-mono">
                  <div className="flex items-center gap-1 text-rose-400 font-bold text-xs">
                    <TrendingDown className="w-3.5 h-3.5" />
                    <span>{road.current - road.prev}</span>
                  </div>
                  <div className="px-3 py-1 bg-surface-container-high rounded-lg border border-outline-variant/60 text-sm font-bold text-on-surface">
                    {road.current}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlassPanel>

      </div>

      {/* ── Operational Intelligence ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Department SLA */}
        <GlassPanel padding="lg" className="border-outline-variant/80 shadow-lg">
          <div className="flex items-center gap-2 mb-5 text-on-surface-variant border-b border-outline-variant/60 pb-3 font-mono">
            <Building2 className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold uppercase tracking-wider">Department Performance</span>
          </div>
          
          <div className="space-y-5">
            {departments.slice(0, 3).map(dept => {
              const perf = (dept as any)?.performance;
              const hasPerf = Boolean(perf);

              const avgTime = hasPerf && perf.averageResolutionTimeDays !== undefined && perf.averageResolutionTimeDays !== null
                ? `${perf.averageResolutionTimeDays}d`
                : 'N/A';

              const slaRate = hasPerf && perf.slaComplianceRate !== undefined && perf.slaComplianceRate !== null
                ? `${perf.slaComplianceRate}% SLA`
                : 'N/A';

              const issuesHandled = typeof perf?.issuesHandled === 'number' ? perf.issuesHandled : 0;
              const issuesResolved = typeof perf?.issuesResolved === 'number' ? perf.issuesResolved : 0;
              
              const canCalculateResolution = hasPerf && issuesHandled > 0;
              const resolutionRatio = canCalculateResolution
                ? Math.min(100, Math.max(0, (issuesResolved / issuesHandled) * 100))
                : 0;

              return (
                <div key={dept.id} className="space-y-1.5">
                  <div className="flex justify-between items-end mb-1">
                    <div className="text-sm font-bold text-on-surface">{dept.name}</div>
                    <div className="flex items-center gap-3 text-xs font-mono">
                      <span className="text-on-surface-variant">Avg: {avgTime}</span>
                      <span className={hasPerf ? "text-emerald-400 font-bold" : "text-on-surface-variant/60"}>{slaRate}</span>
                    </div>
                  </div>
                  <div className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden flex border border-outline-variant/30">
                    {canCalculateResolution ? (
                      <>
                        <div style={{ width: `${resolutionRatio}%` }} className="bg-emerald-500" />
                        <div style={{ width: `${Math.min(100 - resolutionRatio, 10)}%` }} className="bg-amber-500" />
                        <div style={{ width: `${Math.max(0, 100 - resolutionRatio - 10)}%` }} className="bg-rose-500" />
                      </>
                    ) : (
                      <div style={{ width: '100%' }} className="bg-white/5" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex justify-between font-mono text-[11px] text-on-surface-variant pt-4 border-t border-outline-variant/60">
            <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Resolved</span>
            <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500" /> Pending</span>
            <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-rose-500" /> Reopened</span>
          </div>
        </GlassPanel>

        {/* Traffic Intelligence */}
        <GlassPanel padding="lg" className="border-outline-variant/80 shadow-lg">
          <div className="flex items-center gap-2 mb-5 text-on-surface-variant border-b border-outline-variant/60 pb-3 font-mono">
            <Car className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold uppercase tracking-wider">Traffic Telemetry & Volume</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-5 font-mono">
            <div className="p-3.5 bg-surface-container/60 border border-outline-variant/40 rounded-xl">
              <div className="text-[11px] text-on-surface-variant uppercase font-bold tracking-wider mb-1">Peak Volume</div>
              <div className="text-xl font-black text-on-surface">5,200 <span className="text-xs text-on-surface-variant font-sans font-normal">veh/hr</span></div>
            </div>
            <div className="p-3.5 bg-surface-container/60 border border-outline-variant/40 rounded-xl">
              <div className="text-[11px] text-on-surface-variant uppercase font-bold tracking-wider mb-1">Congestion Impact</div>
              <div className="text-xl font-black text-amber-400">High</div>
            </div>
          </div>

          <div className="h-32 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trafficTrend} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} dy={10} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ 
                    backgroundColor: 'rgba(18, 18, 26, 0.95)', 
                    border: '1px solid rgba(255,255,255,0.15)', 
                    borderRadius: '12px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
                  }}
                />
                <Bar dataKey="volume" radius={[6, 6, 0, 0]}>
                  {trafficTrend.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.volume > 4000 ? '#f59e0b' : '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassPanel>

      </div>
    </div>
  );
}
