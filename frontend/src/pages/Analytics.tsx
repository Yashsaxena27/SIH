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
  MapPin, Car, Building2, AlertTriangle, CheckCircle, Clock
} from 'lucide-react';
import { GlassPanel, LoadingState } from '@/components/ui';
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

  const loadData = () => {
    setLoading(true);
    setError(null);
    Promise.allSettled([
      api.getRoadSegments(),
      api.getRoadHealthSummary(),
      api.getDepartments()
    ]).then(([s, h, d]) => {
      const isAllRejected = s.status === 'rejected' && h.status === 'rejected' && d.status === 'rejected';
      if (isAllRejected) {
        setError('Failed to compile executive intelligence.');
        setLoading(false);
        return;
      }
      
      const loadedSegments = s.status === 'fulfilled' ? s.value : [];
      setSegments(loadedSegments.sort((a, b) => (a.healthScore || 0) - (b.healthScore || 0)));
      setHealthSummary(h.status === 'fulfilled' ? h.value : null);
      setDepartments(d.status === 'fulfilled' ? d.value : []);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) return <LoadingState message="Compiling executive intelligence..." className="h-full" />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-var(--spacing-header-height))] bg-background">
        <h2 className="font-headline-md text-on-surface">Data Unavailable</h2>
        <p className="text-on-surface-variant mb-4">{error}</p>
        <button onClick={loadData} className="px-4 py-2 bg-primary text-on-primary rounded hover:bg-primary/90">
          Retry Connection
        </button>
      </div>
    );
  }

  const handleExport = () => {
    setExporting(true);
    setTimeout(() => setExporting(false), 2000);
  };

  if (loading || !healthSummary) return <LoadingState message="Compiling executive intelligence..." className="h-full" />;

  // Derived
  const bottomSegments = segments.slice(0, 3);
  const topSegments = [...segments].sort((a, b) => (b.healthScore || 0) - (a.healthScore || 0)).slice(0, 3);
  
  // Monitored deterioration list (Bengaluru municipal corridors)
  const deteriorating = [
    { name: 'MG Road Corridor', current: 62, prev: 78, defects: 14, recurring: true },
    { name: 'Koramangala 80ft Road', current: 54, prev: 65, defects: 9, recurring: false },
    { name: 'Indiranagar 100ft Road', current: 41, prev: 49, defects: 22, recurring: true },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1920px] mx-auto pb-20">
      
      {/* ── Header & Actions ────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-on-surface tracking-tight flex items-center gap-3">
            Urban Intelligence Analytics
          </h1>
          <p className="text-sm text-on-surface-variant mt-1 font-medium">Long-term infrastructure health and operational performance.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-lg bg-white/[0.02] border border-outline-variant text-sm text-white/60">
            Last 6 Months
          </div>
          <button 
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary-hover text-sm font-bold uppercase tracking-widest transition-all"
          >
            {exporting ? (
              <div className="w-4 h-4 border-2 border-primary-hover border-t-transparent rounded-full animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {exporting ? 'Compiling PDF...' : 'Export Report'}
          </button>
        </div>
      </div>

      {/* ── Top Overview: Road Health ───────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* Main Score Card */}
        <GlassPanel className="xl:col-span-4 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-6 text-on-surface-variant">
            <Activity className="w-4 h-4" />
            <span className="font-label-caps">City Road Health Index</span>
          </div>
          <div className="flex items-end gap-4 mb-4">
            <div className="text-7xl font-display-metrics text-on-surface leading-none">
              {((healthSummary as any)?.averageScore ?? 0).toFixed(0)}
            </div>
            <div className="text-2xl text-on-surface-variant/60 font-light mb-1">/ 100</div>
          </div>
          <div className="flex items-center gap-2 text-status-healthy">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm font-bold">+4.2% this month</span>
          </div>
        </GlassPanel>

        {/* Health Distribution */}
        <GlassPanel className="xl:col-span-8 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-6 text-on-surface-variant">
            <MapPin className="w-4 h-4" />
            <span className="font-label-caps">Network Surface Condition</span>
          </div>
          
          <div className="flex flex-col gap-4">
            <div className="h-4 flex rounded-full overflow-hidden bg-surface-container">
              <div style={{ width: `${(((healthSummary as any)?.segmentDistribution?.excellent ?? 0) / Math.max(healthSummary.totalSegments || 1, 1)) * 100}%` }} className="bg-status-healthy hover:opacity-80 transition-opacity cursor-pointer" />
              <div style={{ width: `${(((healthSummary as any)?.segmentDistribution?.good ?? 0) / Math.max(healthSummary.totalSegments || 1, 1)) * 100}%` }} className="bg-blue-500 hover:opacity-80 transition-opacity cursor-pointer" />
              <div style={{ width: `${(((healthSummary as any)?.segmentDistribution?.fair ?? 0) / Math.max(healthSummary.totalSegments || 1, 1)) * 100}%` }} className="bg-yellow-500 hover:opacity-80 transition-opacity cursor-pointer" />
              <div style={{ width: `${(((healthSummary as any)?.segmentDistribution?.critical ?? 0) / Math.max(healthSummary.totalSegments || 1, 1)) * 100}%` }} className="bg-red-500 hover:opacity-80 transition-opacity cursor-pointer" />
            </div>
            
            <div className="grid grid-cols-4 gap-4 pt-2">
              {[
                { label: 'Excellent', val: (healthSummary as any)?.segmentDistribution?.excellent ?? 0, color: 'text-status-healthy' },
                { label: 'Good', val: (healthSummary as any)?.segmentDistribution?.good ?? 0, color: 'text-blue-400' },
                { label: 'Attention', val: (healthSummary as any)?.segmentDistribution?.fair ?? 0, color: 'text-yellow-400' },
                { label: 'Critical', val: (healthSummary as any)?.segmentDistribution?.critical ?? 0, color: 'text-red-400' },
              ].map(d => (
                <div key={d.label}>
                  <div className={cn("text-xl font-bold", d.color)}>{d.val}</div>
                  <div className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest">{d.label}</div>
                </div>
              ))}
            </div>
          </div>
        </GlassPanel>

      </div>

      {/* ── Historical Trend ────────────────────────────────── */}
      <GlassPanel>
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2 text-on-surface-variant">
            <Activity className="w-4 h-4" />
            <span className="font-label-caps">6-Month Health Trend</span>
          </div>
        </div>
        
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={healthTrend} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} dy={10} />
              <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1a1a21', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                itemStyle={{ color: '#fff' }}
              />
              <Area type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </GlassPanel>

      {/* ── Segments & Deterioration ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Lowest Ranked Roads */}
        <GlassPanel>
          <div className="flex items-center justify-between mb-6 border-b border-outline-variant pb-4">
            <span className="font-label-caps text-on-surface-variant">Top Priority Segments</span>
            <span className="text-xs text-secondary hover:text-white cursor-pointer transition-colors">View All</span>
          </div>
          
          <div className="space-y-2">
            {bottomSegments.map((seg, i) => (
              <div key={seg.id} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <div className="flex items-center gap-4">
                  <div className="w-6 h-6 rounded bg-white/[0.05] flex items-center justify-center text-xs font-data-mono font-bold text-on-surface-variant">
                    {i+1}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-on-surface">{seg.name}</div>
                    <div className={cn(
                      "font-label-caps text-[10px] mt-0.5",
                      (seg as any).score < 50 ? "text-red-400" : "text-yellow-400"
                    )}>
                      {(seg as any).score < 50 ? 'Critical' : 'Attention'}
                    </div>
                  </div>
                </div>
                <div className="text-2xl font-bold font-data-mono text-on-surface">{(seg as any).score}</div>
              </div>
            ))}
          </div>
        </GlassPanel>

        {/* Deterioration Watchlist */}
        <GlassPanel>
          <div className="flex items-center justify-between mb-6 border-b border-outline-variant pb-4">
            <span className="font-label-caps text-on-surface-variant">Deterioration Watchlist</span>
            <AlertTriangle className="w-4 h-4 text-orange-400" />
          </div>
          
          <div className="space-y-4">
            {deteriorating.map((road) => (
              <div key={road.name} className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-on-surface">{road.name}</div>
                  <div className="flex items-center gap-3 text-[10px] text-on-surface-variant mt-1">
                    <span>{road.defects} active defects</span>
                    {road.recurring && <span className="text-orange-400">Recurring issues</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-red-400">
                    <TrendingDown className="w-3 h-3" />
                    <span className="text-xs font-bold">{road.current - road.prev}</span>
                  </div>
                  <div className="px-2 py-1 bg-surface-container rounded border border-outline-variant text-sm font-data-mono font-bold">
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
        <GlassPanel>
          <div className="flex items-center gap-2 mb-6 text-on-surface-variant border-b border-outline-variant pb-4">
            <Building2 className="w-4 h-4" />
            <span className="font-label-caps">Department Performance (Demo Data)</span>
          </div>
          
          <div className="space-y-5">
            {departments.slice(0, 3).map(dept => (
              <div key={dept.id}>
                <div className="flex justify-between items-end mb-2">
                  <div className="text-sm font-bold text-on-surface">{dept.name}</div>
                  <div className="flex items-center gap-4 text-xs font-data-mono">
                    <span className="text-on-surface-variant">Avg: {(dept as any).performance.averageResolutionTimeDays}d</span>
                    <span className="text-status-healthy">{(dept as any).performance.slaComplianceRate}% SLA</span>
                  </div>
                </div>
                <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden flex">
                  {/* Visualizing resolved vs unresolved vs reopened */}
                  <div style={{ width: `${((dept as any).performance.issuesResolved / (dept as any).performance.issuesHandled) * 100}%` }} className="bg-status-healthy" />
                  <div style={{ width: '10%' }} className="bg-yellow-500" />
                  <div style={{ width: '5%' }} className="bg-red-500" />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-between font-label-caps text-[10px] text-on-surface-variant pt-4 border-t border-outline-variant">
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-status-healthy" /> Resolved</span>
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-yellow-500" /> Pending</span>
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-red-500" /> Reopened</span>
          </div>
        </GlassPanel>

        {/* Traffic Intelligence */}
        <GlassPanel>
          <div className="flex items-center gap-2 mb-6 text-on-surface-variant border-b border-outline-variant pb-4">
            <Car className="w-4 h-4" />
            <span className="font-label-caps">Traffic Intelligence</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-lg">
              <div className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest mb-1">Peak Volume</div>
              <div className="text-xl font-bold text-on-surface font-data-mono">5,200 <span className="text-xs text-on-surface-variant font-sans font-normal">veh/hr</span></div>
            </div>
            <div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-lg">
              <div className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest mb-1">Congestion Impact</div>
              <div className="text-xl font-bold text-orange-400 font-data-mono">High</div>
            </div>
          </div>

          <div className="h-32 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trafficTrend} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} dy={10} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: '#1a1a21', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                />
                <Bar dataKey="volume" radius={[4, 4, 0, 0]}>
                  {trafficTrend.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.volume > 4000 ? '#f97316' : '#3b82f6'} />
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
