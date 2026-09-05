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
    { id: 'buses', label: 'Active Fleet', icon: Bus, color: 'text-cyan-400' },
    { id: 'issues', label: 'Civic Issues', icon: AlertTriangle, color: 'text-amber-400' },
    { id: 'heatmap', label: 'Density Heatmap', icon: Activity, color: 'text-rose-400' },
    { id: 'clusters', label: 'Smart Clusters', icon: Target, color: 'text-purple-400' },
    { id: 'routes', label: 'Transit Routes', icon: RouteIcon, color: 'text-indigo-400' },
  ] as const;

  return (
    <div className="absolute right-4 top-4 z-[400] flex flex-col gap-1.5 items-end">
      {/* Action Controls Cluster */}
      <div className="flex flex-col gap-1 p-1 rounded-xl bg-[#141519]/90 backdrop-blur-xl border border-white/[0.08] shadow-2xl">
        <button 
          className="w-8 h-8 rounded-lg hover:bg-white/[0.08] text-on-surface-variant/80 hover:text-white flex items-center justify-center transition-colors"
          title="Zoom In"
        >
          <Plus className="w-4 h-4" />
        </button>
        
        <button 
          className="w-8 h-8 rounded-lg hover:bg-white/[0.08] text-on-surface-variant/80 hover:text-white flex items-center justify-center transition-colors"
          title="Zoom Out"
        >
          <Minus className="w-4 h-4" />
        </button>
        
        <button 
          className="w-8 h-8 rounded-lg hover:bg-white/[0.08] text-on-surface-variant/80 hover:text-white flex items-center justify-center transition-colors border-t border-white/[0.06] pt-1"
          title="Recenter Map"
        >
          <Locate className="w-4 h-4" />
        </button>

        <button 
          onClick={() => setShowLayers(!showLayers)}
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center transition-colors border-t border-white/[0.06] pt-1",
            showLayers 
              ? "bg-primary text-on-primary shadow-sm" 
              : "hover:bg-white/[0.08] text-on-surface-variant/80 hover:text-white"
          )}
          title="Toggle Layers"
        >
          <Layers className="w-4 h-4" />
        </button>
      </div>

      {/* Layers Panel */}
      {showLayers && (
        <div className="mt-1 w-52 bg-[#141519]/95 backdrop-blur-2xl border border-white/[0.08] rounded-xl shadow-2xl overflow-hidden flex flex-col">
          <div className="px-3 py-2 border-b border-white/[0.06] text-[10px] font-mono font-bold text-on-surface-variant/70 uppercase tracking-wider bg-white/[0.02]">
            Spatial Overlay Layers
          </div>
          <div className="p-1.5 space-y-1">
            {controls.map(ctrl => {
              const isActive = layers[ctrl.id as keyof MapLayers];
              const Icon = ctrl.icon;
              return (
                <button
                  key={ctrl.id}
                  onClick={() => onLayerToggle(ctrl.id as keyof MapLayers)}
                  className={cn(
                    "w-full px-3 py-2 rounded-lg flex items-center gap-2.5 transition-colors text-left text-xs font-mono select-none",
                    isActive ? "bg-white/[0.06] text-white font-semibold" : "hover:bg-white/[0.03] text-on-surface-variant/70"
                  )}
                >
                  <Icon className={cn("w-4 h-4", isActive ? ctrl.color : "text-on-surface-variant/50")} />
                  <span className="flex-1">{ctrl.label}</span>
                  {isActive && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
