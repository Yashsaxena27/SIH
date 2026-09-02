// ============================================================
// FilterBar — Floating top glass filter for intelligence map
// ============================================================

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Layers, Activity, AlertTriangle, Car, Droplets, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

export type IntelligenceFilter = 'ALL' | 'ROAD' | 'TRAFFIC' | 'WATER' | 'SAFETY';

interface FilterBarProps {
  activeFilter: IntelligenceFilter;
  onFilterChange: (filter: IntelligenceFilter) => void;
}

export function FilterBar({ activeFilter, onFilterChange }: FilterBarProps) {
  const [expanded, setExpanded] = useState(false);

  const filters: { id: IntelligenceFilter; label: string; icon: any }[] = [
    { id: 'ALL', label: 'All Events', icon: Layers },
    { id: 'ROAD', label: 'Road Health', icon: Activity },
    { id: 'TRAFFIC', label: 'Traffic', icon: Car },
    { id: 'WATER', label: 'Waterlogging', icon: Droplets },
    { id: 'SAFETY', label: 'Safety', icon: AlertTriangle },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.4 }}
      className="absolute top-6 left-1/2 -translate-x-1/2 z-[400] flex flex-col items-center"
    >
      <div className="flex items-center p-1.5 rounded-full bg-surface-elevated/80 backdrop-blur-3xl border border-black/[0.1] shadow-2xl">
        {filters.map(filter => {
          const isActive = activeFilter === filter.id;
          return (
            <button
              key={filter.id}
              onClick={() => onFilterChange(filter.id)}
              className={cn(
                "relative flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-colors duration-200",
                isActive ? "text-black" : "text-black/40 hover:text-black/70"
              )}
            >
              {isActive && (
                <motion.div 
                  layoutId="filter-active-pill"
                  className="absolute inset-0 bg-black/[0.1] border border-black/[0.05] rounded-full"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <filter.icon className={cn("w-3.5 h-3.5 relative z-10", isActive && filter.id === 'ROAD' ? 'text-accent-secondary' : isActive && filter.id === 'SAFETY' ? 'text-red-400' : '')} />
              <span className="relative z-10 tracking-wide">{filter.label}</span>
            </button>
          );
        })}

        <div className="w-px h-6 bg-black/[0.1] mx-2" />
        
        <button 
          onClick={() => setExpanded(!expanded)}
          className={cn(
            "p-2 rounded-full transition-colors",
            expanded ? "bg-black/[0.1] text-black" : "text-black/40 hover:text-black hover:bg-black/[0.05]"
          )}
        >
          <Filter className="w-4 h-4" />
        </button>
      </div>

      {/* Expanded Filters */}
      <motion.div 
        initial={false}
        animate={{ 
          height: expanded ? 'auto' : 0, 
          opacity: expanded ? 1 : 0,
          marginTop: expanded ? 12 : 0
        }}
        className="overflow-hidden"
      >
        <div className="flex items-center gap-4 px-6 py-3 rounded-2xl bg-surface-elevated/95 backdrop-blur-3xl border border-black/[0.1] shadow-2xl">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-black/30 uppercase tracking-widest">Severity</span>
            <div className="flex gap-2">
              {['Critical', 'High', 'Medium'].map(sev => (
                <button key={sev} className="px-3 py-1 rounded-md bg-black/[0.04] hover:bg-black/[0.08] text-[11px] text-black/60 font-medium border border-black/[0.05]">
                  {sev}
                </button>
              ))}
            </div>
          </div>
          <div className="w-px h-8 bg-black/[0.1]" />
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-black/30 uppercase tracking-widest">Status</span>
            <div className="flex gap-2">
              {['Open', 'Verifying', 'Resolved'].map(stat => (
                <button key={stat} className="px-3 py-1 rounded-md bg-black/[0.04] hover:bg-black/[0.08] text-[11px] text-black/60 font-medium border border-black/[0.05]">
                  {stat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
