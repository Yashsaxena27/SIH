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

  const [error, setError] = useState<string | null>(null);

  // Fetch Data
  const loadData = () => {
    setLoading(true);
    setError(null);
    Promise.allSettled([
      api.getBuses(),
      api.getIssues(),
      api.getRoutes()
    ]).then(([b, i, r]) => {
      const isAllRejected = b.status === 'rejected' && i.status === 'rejected' && r.status === 'rejected';
      if (isAllRejected) {
        setError('Failed to load spatial intelligence data.');
        setLoading(false);
        return;
      }
      setBuses(b.status === 'fulfilled' ? b.value : []);
      setIssues(i.status === 'fulfilled' ? i.value : []);
      setRoutes(r.status === 'fulfilled' ? r.value : []);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return <LoadingState message="Initializing spatial intelligence..." className="h-full" />;
  }

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

  return (
    <div className="relative w-full h-[calc(100vh-var(--spacing-header-height))] overflow-hidden bg-background">
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
    </div>
  );
}
