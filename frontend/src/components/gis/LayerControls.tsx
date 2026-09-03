// ============================================================
// LayerControls — Floating map toggles for GIS views
// ============================================================

import { useState } from 'react';
import { Layers, Activity, AlertTriangle, Route as RouteIcon, Target, Bus, Plus, Minus, Locate } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MapLayers {
  buses: boolean;
  issues: boolean;
  routes: boolean;
  heatmap: boolean;
  clusters: boolean;
}

interface LayerControlsProps {
  layers: MapLayers;
  onLayerToggle: (layer: keyof MapLayers) => void;
}

export function LayerControls({ layers, onLayerToggle }: LayerControlsProps) {
  const [showLayers, setShowLayers] = useState(false);

  const controls = [
    { id: 'buses', label: 'Active Fleet', icon: Bus },
    { id: 'issues', label: 'Civic Issues', icon: AlertTriangle },
    { id: 'heatmap', label: 'Density Heatmap', icon: Activity },
    { id: 'clusters', label: 'Smart Clusters', icon: Target },
    { id: 'routes', label: 'Bus Routes', icon: RouteIcon },
  ] as const;

  return (
    <div className="absolute right-[var(--spacing-margin-panel)] top-1/2 -translate-y-1/2 z-[400] flex flex-col gap-1 items-end">
      {/* Zoom In */}
      <button className="w-8 h-8 rounded bg-surface-container/90 backdrop-blur-md border border-outline-variant text-on-surface-variant hover:bg-surface-high hover:text-on-surface flex items-center justify-center transition-colors">
        <Plus className="w-4 h-4" />
      </button>
      
      {/* Zoom Out */}
      <button className="w-8 h-8 rounded bg-surface-container/90 backdrop-blur-md border border-outline-variant text-on-surface-variant hover:bg-surface-high hover:text-on-surface flex items-center justify-center transition-colors">
        <Minus className="w-4 h-4" />
      </button>
      
      {/* Recenter */}
      <button className="w-8 h-8 rounded bg-surface-container/90 backdrop-blur-md border border-outline-variant text-on-surface-variant hover:bg-surface-high hover:text-on-surface flex items-center justify-center transition-colors">
        <Locate className="w-4 h-4" />
      </button>

      {/* Layers Toggle */}
      <button 
        onClick={() => setShowLayers(!showLayers)}
        className={cn(
          "w-8 h-8 rounded backdrop-blur-md border border-outline-variant flex items-center justify-center transition-colors",
          showLayers 
            ? "bg-surface-high text-on-surface" 
            : "bg-surface-container/90 text-on-surface-variant hover:bg-surface-high hover:text-on-surface"
        )}
      >
        <Layers className="w-4 h-4" />
      </button>

      {/* Layers Panel */}
      {showLayers && (
        <div className="mt-2 w-48 bg-surface/90 backdrop-blur-md border border-outline-variant rounded shadow-[0_0_15px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col">
          <div className="px-3 py-2 border-b border-outline-variant font-label-caps text-on-surface-variant bg-surface-container/50">
            Map Layers
          </div>
          <div className="py-1">
            {controls.map(ctrl => {
              const isActive = layers[ctrl.id as keyof MapLayers];
              return (
                <button
                  key={ctrl.id}
                  onClick={() => onLayerToggle(ctrl.id as keyof MapLayers)}
                  className="w-full px-3 py-2 flex items-center gap-3 hover:bg-surface-high transition-colors text-left"
                >
                  <ctrl.icon className={cn("w-4 h-4", isActive ? "text-secondary" : "text-on-surface-variant")} />
                  <span className={cn("text-sm", isActive ? "text-on-surface font-medium" : "text-on-surface-variant")}>
                    {ctrl.label}
                  </span>
                  {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-secondary" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
