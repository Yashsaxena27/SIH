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

export function IntelligencePage() {
  // Data State
  const [loading, setLoading] = useState(true);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [issues, setIssues] = useState<UrbanIssue[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  
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

  // Fetch Data
  useEffect(() => {
    Promise.all([
      api.getBuses(),
      api.getIssues(),
      api.getRoutes()
    ]).then(([b, i, r]) => {
      setBuses(b);
      setIssues(i);
      setRoutes(r);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <LoadingState message="Initializing spatial intelligence..." className="h-full" />;
  }

  return (
    <div className="relative w-full h-[calc(100vh-3rem)] overflow-hidden bg-white">
      {/* ── Main Map ──────────────────────────────────────── */}
      <CommandMap 
        buses={buses}
        issues={issues}
        routes={routes}
        layers={layers}
        filter={activeFilter}
        onIssueSelect={setSelectedIssue}
      />

      {/* ── Floating Overlays ─────────────────────────────── */}
      
      {/* Top Filter Bar */}
      <FilterBar 
        activeFilter={activeFilter} 
        onFilterChange={setActiveFilter} 
      />

      {/* Left Layer Controls */}
      <LayerControls 
        layers={layers} 
        onLayerToggle={(layer) => setLayers(prev => ({ ...prev, [layer]: !prev[layer] }))} 
      />

      {/* Bottom Timeline Playback */}
      <TimeScrubber />

      {/* Right Drawer (Contextual Details) */}
      <IssueDrawer 
        issue={selectedIssue} 
        onClose={() => setSelectedIssue(null)} 
      />

      {/* ── Subtle Screen Vignette ───────────────────────── */}
      <div className="absolute inset-0 pointer-events-none z-[10] shadow-[inset_0_0_100px_rgba(0,0,0,0.8)]" />
    </div>
  );
}
