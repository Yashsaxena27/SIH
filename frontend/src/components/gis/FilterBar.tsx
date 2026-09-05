// ============================================================
// FilterBar — Floating top glass filter for intelligence map
// ============================================================

import { useState } from 'react';
import { Filter, ChevronDown, ChevronUp, Layers, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export type IntelligenceFilter = 'ALL' | 'ROAD' | 'TRAFFIC' | 'WATER' | 'SAFETY';

interface FilterBarProps {
  activeFilter: IntelligenceFilter;
  onFilterChange: (filter: IntelligenceFilter) => void;
}

export function FilterBar({ activeFilter, onFilterChange }: FilterBarProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [severity, setSeverity] = useState({ critical: true, high: true, medium: true });
  const [status, setStatus] = useState({ detected: true, underReview: true, verified: true });
  const [timeFrame, setTimeFrame] = useState('24h');

  return (
    <div className="absolute top-4 left-4 z-[400] w-72 bg-[#141519]/95 backdrop-blur-xl border border-white/[0.08] rounded-xl shadow-2xl overflow-hidden transition-all duration-200">
      {/* Header Bar */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-white/[0.02] cursor-pointer hover:bg-white/[0.04] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-primary" />
          <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">Spatial Filters</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-bold bg-primary/20 text-primary border border-primary/30 px-2 py-0.5 rounded">
            {activeFilter}
          </span>
          <button className="text-on-surface-variant/70 hover:text-white transition-colors">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 flex flex-col gap-4">
          {/* Issue Type Select */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-mono font-bold text-on-surface-variant/70 uppercase tracking-wider">
              Issue Classification
            </label>
            <select 
              value={activeFilter}
              onChange={(e) => onFilterChange(e.target.value as IntelligenceFilter)}
              className="w-full bg-white/[0.03] border border-white/[0.08] text-white text-xs font-mono rounded-lg px-3 py-2 focus:outline-none focus:border-primary transition-colors cursor-pointer"
            >
              <option value="ALL" className="bg-[#141519] text-white">All Events & Anomalies</option>
              <option value="ROAD" className="bg-[#141519] text-white">Road Surface Health</option>
              <option value="TRAFFIC" className="bg-[#141519] text-white">Traffic Congestion</option>
              <option value="WATER" className="bg-[#141519] text-white">Waterlogging Hazards</option>
              <option value="SAFETY" className="bg-[#141519] text-white">Critical Safety Hazards</option>
            </select>
          </div>

          {/* Severity Checklist */}
          <div className="flex flex-col gap-1.5 pt-1 border-t border-white/[0.06]">
            <span className="text-[10px] font-mono font-bold text-on-surface-variant/70 uppercase tracking-wider">
              Severity Level
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              <label className={cn(
                "flex items-center justify-center gap-1.5 p-1.5 rounded-lg border text-xs font-mono font-semibold cursor-pointer transition-colors select-none",
                severity.critical ? "bg-red-500/10 border-red-500/30 text-red-400" : "bg-white/[0.02] border-white/[0.06] text-white/40"
              )}>
                <input 
                  type="checkbox" 
                  checked={severity.critical} 
                  onChange={(e) => setSeverity(s => ({ ...s, critical: e.target.checked }))} 
                  className="hidden" 
                />
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                <span>Critical</span>
              </label>

              <label className={cn(
                "flex items-center justify-center gap-1.5 p-1.5 rounded-lg border text-xs font-mono font-semibold cursor-pointer transition-colors select-none",
                severity.high ? "bg-orange-500/10 border-orange-500/30 text-orange-400" : "bg-white/[0.02] border-white/[0.06] text-white/40"
              )}>
                <input 
                  type="checkbox" 
                  checked={severity.high} 
                  onChange={(e) => setSeverity(s => ({ ...s, high: e.target.checked }))} 
                  className="hidden" 
                />
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                <span>High</span>
              </label>

              <label className={cn(
                "flex items-center justify-center gap-1.5 p-1.5 rounded-lg border text-xs font-mono font-semibold cursor-pointer transition-colors select-none",
                severity.medium ? "bg-amber-500/10 border-amber-500/30 text-amber-400" : "bg-white/[0.02] border-white/[0.06] text-white/40"
              )}>
                <input 
                  type="checkbox" 
                  checked={severity.medium} 
                  onChange={(e) => setSeverity(s => ({ ...s, medium: e.target.checked }))} 
                  className="hidden" 
                />
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>Med</span>
              </label>
            </div>
          </div>

          {/* Status Checklist */}
          <div className="flex flex-col gap-1.5 pt-1 border-t border-white/[0.06]">
            <span className="text-[10px] font-mono font-bold text-on-surface-variant/70 uppercase tracking-wider">
              Verification Status
            </span>
            <div className="flex flex-col gap-1.5">
              <label className="flex items-center justify-between text-xs font-mono text-white/90 cursor-pointer">
                <span className="flex items-center gap-2">
                  <input type="checkbox" checked={status.detected} onChange={(e) => setStatus(s => ({ ...s, detected: e.target.checked }))} className="rounded border-white/[0.15] bg-white/[0.04] text-primary focus:ring-0" />
                  Detected Anomalies
                </span>
                <span className="text-[10px] text-on-surface-variant/60 uppercase">AI Raw</span>
              </label>
              <label className="flex items-center justify-between text-xs font-mono text-white/90 cursor-pointer">
                <span className="flex items-center gap-2">
                  <input type="checkbox" checked={status.underReview} onChange={(e) => setStatus(s => ({ ...s, underReview: e.target.checked }))} className="rounded border-white/[0.15] bg-white/[0.04] text-primary focus:ring-0" />
                  Under Review
                </span>
                <span className="text-[10px] text-amber-400/80 uppercase">Pending</span>
              </label>
              <label className="flex items-center justify-between text-xs font-mono text-white/90 cursor-pointer">
                <span className="flex items-center gap-2">
                  <input type="checkbox" checked={status.verified} onChange={(e) => setStatus(s => ({ ...s, verified: e.target.checked }))} className="rounded border-white/[0.15] bg-white/[0.04] text-primary focus:ring-0" />
                  Multi-Bus Verified
                </span>
                <span className="text-[10px] text-emerald-400 uppercase">Confirmed</span>
              </label>
            </div>
          </div>

          {/* Time Frame Select */}
          <div className="flex flex-col gap-1.5 pt-1 border-t border-white/[0.06]">
            <label className="text-[10px] font-mono font-bold text-on-surface-variant/70 uppercase tracking-wider">
              Time Horizon
            </label>
            <select 
              value={timeFrame}
              onChange={(e) => setTimeFrame(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/[0.08] text-white text-xs font-mono rounded-lg px-3 py-2 focus:outline-none focus:border-primary transition-colors cursor-pointer"
            >
              <option value="1h" className="bg-[#141519] text-white">Past 1 Hour</option>
              <option value="6h" className="bg-[#141519] text-white">Past 6 Hours</option>
              <option value="24h" className="bg-[#141519] text-white">Past 24 Hours</option>
              <option value="7d" className="bg-[#141519] text-white">Past 7 Days</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
