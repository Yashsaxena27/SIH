// ============================================================
// Intelligence Page — Fullscreen Spatial Command Interface
// ============================================================

import { useState, useEffect } from 'react';
import { 
  CommandMap, 
  FilterBar, 
  TimeScrubber, 
  LayerControls, 
  IssueDrawer,
  type IntelligenceFilter,
  type MapLayers 
} from '@/components/gis';
import { LoadingState } from '@/components/ui';
import { api } from '@/services/api';
import type { Bus, UrbanIssue, Route } from '@/types';
import { MapPin, Bus as BusIcon, AlertTriangle, Activity, RefreshCw } from 'lucide-react';

export function IntelligencePage() {
  // Data State
  const [loading, setLoading] = useState(true);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [issues, setIssues] = useState<UrbanIssue[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [hotspots, setHotspots] = useState<any[]>([]);
  
  // UI State
  const [selectedIssue, setSelectedIssue] = useState<UrbanIssue | null>(null);
  const [activeFilter, setActiveFilter] = useState<IntelligenceFilter>('ALL');
  const [layers, setLayers] = useState<MapLayers>({
    buses: true,
    issues: true,
    routes: false,
    heatmap: true,
    clusters: true,
  });

  const [error, setError] = useState<string | null>(null);

  // Fetch Data
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [b, i, r, h] = await Promise.allSettled([
        api.getBuses ? api.getBuses() : Promise.resolve([]),
        api.getIssues ? api.getIssues() : Promise.resolve([]),
        api.getRoutes ? api.getRoutes() : Promise.resolve([]),
        api.getHotspots ? api.getHotspots() : Promise.resolve([])
      ]);
      
      const loadedBuses = b.status === 'fulfilled' && Array.isArray(b.value) ? b.value : [];
      const loadedIssues = i.status === 'fulfilled' && Array.isArray(i.value) ? i.value : [];
      const loadedRoutes = r.status === 'fulfilled' && Array.isArray(r.value) ? r.value : [];
      const loadedHotspots = h.status === 'fulfilled' && Array.isArray(h.value) ? h.value : [];

      setBuses(loadedBuses);
      setIssues(loadedIssues);
      setRoutes(loadedRoutes);
      setHotspots(loadedHotspots);
    } catch (err) {
      console.error('Error initializing map data:', err);
      setError('Failed to load spatial intelligence data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-var(--spacing-header-height))] bg-[#0d0e11] text-white">
        <LoadingState message="Initializing spatial GIS intelligence stream..." className="h-auto" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-var(--spacing-header-height))] bg-[#0d0e11] text-white p-6">
        <div className="p-6 rounded-2xl bg-[#141519] border border-red-500/30 text-center max-w-md space-y-4 shadow-2xl">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto" />
          <h2 className="text-base font-bold text-white">Spatial Telemetry Unavailable</h2>
          <p className="text-xs text-on-surface-variant/70 font-mono">{error}</p>
          <button 
            onClick={loadData} 
            className="px-4 py-2 bg-primary text-on-primary rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 mx-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Connection</span>
          </button>
        </div>
      </div>
    );
  }

  const criticalCount = issues.filter(i => i.severity === 'critical').length;

  return (
    <div className="relative w-full h-[calc(100vh-var(--spacing-header-height))] overflow-hidden bg-[#0d0e11]">
      {/* ── Main Map ──────────────────────────────────────── */}
      <CommandMap 
        buses={buses}
        issues={issues}
        routes={routes}
        hotspots={hotspots}
        layers={layers}
        filter={activeFilter}
        onIssueSelect={setSelectedIssue}
      />

      {/* ── Floating Top Operational GIS Banner (Center-Left) ── */}
      <div className="absolute top-4 left-80 right-20 z-[390] hidden xl:flex items-center justify-between pointer-events-none">
        <div className="px-4 py-2 rounded-xl bg-[#141519]/90 backdrop-blur-xl border border-white/[0.08] shadow-2xl flex items-center gap-4 pointer-events-auto">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              Bengaluru Municipal GIS
            </span>
          </div>

          <div className="h-4 w-px bg-white/[0.1]" />

          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-on-surface-variant/70 flex items-center gap-1">
              <BusIcon className="w-3.5 h-3.5 text-cyan-400" />
              <strong className="text-white">{buses.length}</strong> Active Vehicles
            </span>
            <span>•</span>
            <span className="text-on-surface-variant/70 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <strong className="text-white">{issues.length}</strong> Anomalies
            </span>
            {criticalCount > 0 && (
              <>
                <span>•</span>
                <span className="text-red-400 font-bold bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                  {criticalCount} Critical
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Floating Overlays ─────────────────────────────── */}
      
      {/* Left Filter Bar */}
      <FilterBar 
        activeFilter={activeFilter} 
        onFilterChange={setActiveFilter} 
      />

      {/* Right Layer Controls */}
      <LayerControls 
        layers={layers} 
        onLayerToggle={(layer) => setLayers(prev => ({ ...prev, [layer]: !prev[layer] }))} 
      />

      {/* Bottom Time Scrubber */}
      <TimeScrubber />

      {/* Right Contextual Issue Drawer */}
      <IssueDrawer 
        issue={selectedIssue} 
        onClose={() => setSelectedIssue(null)} 
      />
    </div>
  );
}
