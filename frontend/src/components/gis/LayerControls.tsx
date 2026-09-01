// ============================================================
// LayerControls — Floating map toggles for GIS views
// ============================================================

import { Layers, Activity, AlertTriangle, Route as RouteIcon, Target, Bus } from 'lucide-react';
import { motion } from 'framer-motion';
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
  const controls = [
    { id: 'buses', label: 'Active Fleet', icon: Bus, color: 'text-cyan-400' },
    { id: 'issues', label: 'Civic Issues', icon: AlertTriangle, color: 'text-orange-400' },
    { id: 'heatmap', label: 'Density Heatmap', icon: Activity, color: 'text-red-400' },
    { id: 'clusters', label: 'Smart Clusters', icon: Target, color: 'text-emerald-400' },
    { id: 'routes', label: 'Bus Routes', icon: RouteIcon, color: 'text-purple-400' },
  ] as const;

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.4, duration: 0.4 }}
      className="absolute left-6 top-1/2 -translate-y-1/2 z-[400]"
    >
      <div className="flex flex-col bg-surface-elevated/90 backdrop-blur-3xl border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden w-12 hover:w-48 transition-all duration-300 group">
        
        <div className="h-12 flex items-center px-3.5 border-b border-white/[0.06] bg-white/[0.02]">
          <Layers className="w-5 h-5 text-white/40 flex-shrink-0" />
          <span className="ml-3 text-xs font-bold text-white/70 uppercase tracking-widest whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
            Map Layers
          </span>
        </div>

        <div className="py-2">
          {controls.map(ctrl => {
            const isActive = layers[ctrl.id as keyof MapLayers];
            return (
              <button
                key={ctrl.id}
                onClick={() => onLayerToggle(ctrl.id as keyof MapLayers)}
                className="w-full h-10 flex items-center px-3.5 hover:bg-white/[0.04] transition-colors relative"
              >
                <ctrl.icon className={cn(
                  "w-5 h-5 flex-shrink-0 transition-colors", 
                  isActive ? ctrl.color : "text-white/20"
                )} />
                <span className={cn(
                  "ml-3 text-xs font-medium whitespace-nowrap transition-all",
                  isActive ? "text-white/90" : "text-white/40"
                )}>
                  {ctrl.label}
                </span>

                {/* Active indicator bar */}
                {isActive && (
                  <div className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r bg-white" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
