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

  useEffect(() => {
    Promise.all([
      api.getRoadSegments(),
      api.getRoadHealthSummary(),
      api.getDepartments()
    ]).then(([s, h, d]) => {
      // Sort segments by score
      setSegments(s.sort((a, b) => a.score - b.score));
      setHealthSummary(h);
      setDepartments(d);
      setLoading(false);
    });
  }, []);

  const handleExport = () => {
    setExporting(true);
    setTimeout(() => setExporting(false), 2000);
  };

  if (loading || !healthSummary) return <LoadingState message="Compiling executive intelligence..." className="h-full" />;

  // Derived
  const bottomSegments = segments.slice(0, 3);
  const topSegments = [...segments].sort((a, b) => b.score - a.score).slice(0, 3);
  
  // Mock deterioration list (roads that dropped in score)
  const deteriorating = [
    { name: 'Outer Ring Road', current: 62, prev: 78, defects: 14, recurring: true },
    { name: 'NH-48 Sector 11', current: 54, prev: 65, defects: 9, recurring: false },
    { name: 'Vasant Kunj Marg', current: 41, prev: 49, defects: 22, recurring: true },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1920px] mx-auto pb-20">
      
      {/* ── Header & Actions ────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white/95 tracking-tight flex items-center gap-3">
            Urban Intelligence Analytics
          </h1>
          <p className="text-sm text-white/40 mt-1 font-medium">Long-term infrastructure health and operational performance.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-lg bg-white/[0.02] border border-white/[0.08] text-sm text-white/60">
            Last 6 Months
          </div>
          <button 
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-primary/10 hover:bg-accent-primary/20 border border-accent-primary/30 text-accent-primary-hover text-sm font-bold uppercase tracking-widest transition-all"
          >
            {exporting ? (
              <div className="w-4 h-4 border-2 border-accent-primary-hover border-t-transparent rounded-full animate-spin" />
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
          <div className="flex items-center gap-2 mb-6 text-white/50">
            <Activity className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-widest">City Road Health Index</span>
          </div>
          <div className="flex items-end gap-4 mb-4">
            <div className="text-7xl font-bold tracking-tighter text-white/95 leading-none">
              {((healthSummary as any)?.averageScore ?? 0).toFixed(0)}
            </div>
            <div className="text-2xl text-white/30 font-light mb-1">/ 100</div>
          </div>
          <div className="flex items-center gap-2 text-emerald-400">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm font-bold">+4.2% this month</span>
          </div>
        </GlassPanel>

        {/* Health Distribution */}
        <GlassPanel className="xl:col-span-8 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-6 text-white/50">
            <MapPin className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-widest">Network Surface Condition</span>
          </div>
          
          <div className="flex flex-col gap-4">
            <div className="h-4 flex rounded-full overflow-hidden bg-white/[0.04]">
              <div style={{ width: `${(((healthSummary as any)?.segmentDistribution?.excellent ?? 0) / Math.max(healthSummary.totalSegments || 1, 1)) * 100}%` }} className="bg-emerald-500 hover:opacity-80 transition-opacity cursor-pointer" />
              <div style={{ width: `${(((healthSummary as any)?.segmentDistribution?.good ?? 0) / Math.max(healthSummary.totalSegments || 1, 1)) * 100}%` }} className="bg-blue-500 hover:opacity-80 transition-opacity cursor-pointer" />
              <div style={{ width: `${(((healthSummary as any)?.segmentDistribution?.fair ?? 0) / Math.max(healthSummary.totalSegments || 1, 1)) * 100}%` }} className="bg-yellow-500 hover:opacity-80 transition-opacity cursor-pointer" />
              <div style={{ width: `${(((healthSummary as any)?.segmentDistribution?.critical ?? 0) / Math.max(healthSummary.totalSegments || 1, 1)) * 100}%` }} className="bg-red-500 hover:opacity-80 transition-opacity cursor-pointer" />
            </div>
            
            <div className="grid grid-cols-4 gap-4 pt-2">
              {[
                { label: 'Excellent', val: (healthSummary as any)?.segmentDistribution?.excellent ?? 0, color: 'text-emerald-400' },
                { label: 'Good', val: (healthSummary as any)?.segmentDistribution?.good ?? 0, color: 'text-blue-400' },
                { label: 'Attention', val: (healthSummary as any)?.segmentDistribution?.fair ?? 0, color: 'text-yellow-400' },
                { label: 'Critical', val: (healthSummary as any)?.segmentDistribution?.critical ?? 0, color: 'text-red-400' },
              ].map(d => (
                <div key={d.label}>
                  <div className={cn("text-xl font-bold", d.color)}>{d.val}</div>
                  <div className="text-[10px] text-white/40 uppercase font-bold tracking-widest">{d.label}</div>
                </div>
              ))}
            </div>
          </div>
        </GlassPanel>

      </div>

      {/* ── Historical Trend ────────────────────────────────── */}
      <GlassPanel>
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2 text-white/50">
            <Activity className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-widest">6-Month Health Trend</span>
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
          <div className="flex items-center justify-between mb-6 border-b border-white/[0.06] pb-4">
            <span className="text-xs font-bold uppercase tracking-widest text-white/50">Top Priority Segments</span>
            <span className="text-xs text-accent-secondary hover:text-white cursor-pointer transition-colors">View All</span>
          </div>
          
          <div className="space-y-2">
            {bottomSegments.map((seg, i) => (
              <div key={seg.id} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <div className="flex items-center gap-4">
                  <div className="w-6 h-6 rounded bg-white/[0.05] flex items-center justify-center text-xs font-mono font-bold text-white/40">
                    {i+1}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white/90">{seg.name}</div>
                    <div className={cn(
                      "text-[10px] font-bold uppercase tracking-widest mt-0.5",
                      (seg as any).score < 50 ? "text-red-400" : "text-yellow-400"
                    )}>
                      {(seg as any).score < 50 ? 'Critical' : 'Attention'}
                    </div>
                  </div>
                </div>
                <div className="text-2xl font-bold font-mono text-white/90">{(seg as any).score}</div>
              </div>
            ))}
          </div>
        </GlassPanel>

        {/* Deterioration Watchlist */}
        <GlassPanel>
          <div className="flex items-center justify-between mb-6 border-b border-white/[0.06] pb-4">
            <span className="text-xs font-bold uppercase tracking-widest text-white/50">Deterioration Watchlist</span>
            <AlertTriangle className="w-4 h-4 text-orange-400" />
          </div>
          
          <div className="space-y-4">
            {deteriorating.map((road) => (
              <div key={road.name} className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-white/90">{road.name}</div>
                  <div className="flex items-center gap-3 text-[10px] text-white/40 mt-1">
                    <span>{road.defects} active defects</span>
                    {road.recurring && <span className="text-orange-400">Recurring issues</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-red-400">
                    <TrendingDown className="w-3 h-3" />
                    <span className="text-xs font-bold">{road.current - road.prev}</span>
                  </div>
                  <div className="px-2 py-1 bg-white/[0.04] rounded border border-white/[0.08] text-sm font-mono font-bold">
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
          <div className="flex items-center gap-2 mb-6 text-white/50 border-b border-white/[0.06] pb-4">
            <Building2 className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-widest">Department Performance (Demo Data)</span>
          </div>
          
          <div className="space-y-5">
            {departments.slice(0, 3).map(dept => (
              <div key={dept.id}>
                <div className="flex justify-between items-end mb-2">
                  <div className="text-sm font-bold text-white/90">{dept.name}</div>
                  <div className="flex items-center gap-4 text-xs font-mono">
                    <span className="text-white/40">Avg: {(dept as any).performance.averageResolutionTimeDays}d</span>
                    <span className="text-emerald-400">{(dept as any).performance.slaComplianceRate}% SLA</span>
                  </div>
                </div>
                <div className="h-1.5 w-full bg-white/[0.04] rounded-full overflow-hidden flex">
                  {/* Visualizing resolved vs unresolved vs reopened */}
                  <div style={{ width: `${((dept as any).performance.issuesResolved / (dept as any).performance.issuesHandled) * 100}%` }} className="bg-emerald-500" />
                  <div style={{ width: '10%' }} className="bg-yellow-500" />
                  <div style={{ width: '5%' }} className="bg-red-500" />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-between text-[10px] uppercase font-bold tracking-widest text-white/40 pt-4 border-t border-white/[0.06]">
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-emerald-500" /> Resolved</span>
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-yellow-500" /> Pending</span>
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-red-500" /> Reopened</span>
          </div>
        </GlassPanel>

        {/* Traffic Intelligence */}
        <GlassPanel>
          <div className="flex items-center gap-2 mb-6 text-white/50 border-b border-white/[0.06] pb-4">
            <Car className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-widest">Traffic Intelligence</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-lg">
              <div className="text-[10px] text-white/40 uppercase font-bold tracking-widest mb-1">Peak Volume</div>
              <div className="text-xl font-bold text-white/90 font-mono">5,200 <span className="text-xs text-white/40 font-sans font-normal">veh/hr</span></div>
            </div>
            <div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-lg">
              <div className="text-[10px] text-white/40 uppercase font-bold tracking-widest mb-1">Congestion Impact</div>
              <div className="text-xl font-bold text-orange-400 font-mono">High</div>
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
