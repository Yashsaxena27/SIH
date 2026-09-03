// ============================================================
// FilterBar — Floating top glass filter for intelligence map
// ============================================================

import { useState } from 'react';
import { Filter } from 'lucide-react';

export type IntelligenceFilter = 'ALL' | 'ROAD' | 'TRAFFIC' | 'WATER' | 'SAFETY';

interface FilterBarProps {
  activeFilter: IntelligenceFilter;
  onFilterChange: (filter: IntelligenceFilter) => void;
}

export function FilterBar({ activeFilter, onFilterChange }: FilterBarProps) {
  const [severity, setSeverity] = useState({ critical: true, high: true, medium: true });
  const [status, setStatus] = useState({ detected: true, underReview: true, verified: true });
  const [timeFrame, setTimeFrame] = useState('24h');

  return (
    <div className="absolute top-[var(--spacing-margin-panel)] left-[var(--spacing-margin-panel)] z-[400] w-64 bg-surface/90 backdrop-blur-md border border-outline-variant rounded shadow-[0_0_15px_rgba(0,0,0,0.5)] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-outline-variant">
        <Filter className="w-4 h-4 text-on-surface-variant" />
        <span className="font-label-caps text-on-surface-variant">FILTERS</span>
      </div>

      <div className="p-4 flex flex-col gap-6">
        {/* Issue Type */}
        <div className="flex flex-col gap-2">
          <label className="font-label-caps text-on-surface-variant">Issue Type</label>
          <select 
            value={activeFilter}
            onChange={(e) => onFilterChange(e.target.value as IntelligenceFilter)}
            className="w-full bg-surface-container border border-outline-variant text-on-surface text-sm rounded px-3 py-1.5 focus:outline-none focus:border-outline"
          >
            <option value="ALL">All Events</option>
            <option value="ROAD">Road Health</option>
            <option value="TRAFFIC">Traffic</option>
            <option value="WATER">Waterlogging</option>
            <option value="SAFETY">Safety</option>
          </select>
        </div>

        {/* Severity */}
        <div className="flex flex-col gap-2">
          <span className="font-label-caps text-on-surface-variant">Severity</span>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm text-on-surface cursor-pointer">
              <input type="checkbox" checked={severity.critical} onChange={(e) => setSeverity(s => ({ ...s, critical: e.target.checked }))} className="accent-secondary rounded-sm" />
              <div className="w-2 h-2 rounded-full bg-status-critical" />
              Critical
            </label>
            <label className="flex items-center gap-2 text-sm text-on-surface cursor-pointer">
              <input type="checkbox" checked={severity.high} onChange={(e) => setSeverity(s => ({ ...s, high: e.target.checked }))} className="accent-secondary rounded-sm" />
              <div className="w-2 h-2 rounded-full bg-status-high" />
              High
            </label>
            <label className="flex items-center gap-2 text-sm text-on-surface cursor-pointer">
              <input type="checkbox" checked={severity.medium} onChange={(e) => setSeverity(s => ({ ...s, medium: e.target.checked }))} className="accent-secondary rounded-sm" />
              <div className="w-2 h-2 rounded-full bg-status-medium" />
              Medium
            </label>
          </div>
        </div>

        {/* Status */}
        <div className="flex flex-col gap-2">
          <span className="font-label-caps text-on-surface-variant">Status</span>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm text-on-surface cursor-pointer">
              <input type="checkbox" checked={status.detected} onChange={(e) => setStatus(s => ({ ...s, detected: e.target.checked }))} className="accent-secondary rounded-sm" />
              Detected
            </label>
            <label className="flex items-center gap-2 text-sm text-on-surface cursor-pointer">
              <input type="checkbox" checked={status.underReview} onChange={(e) => setStatus(s => ({ ...s, underReview: e.target.checked }))} className="accent-secondary rounded-sm" />
              Under Review
            </label>
            <label className="flex items-center gap-2 text-sm text-on-surface cursor-pointer">
              <input type="checkbox" checked={status.verified} onChange={(e) => setStatus(s => ({ ...s, verified: e.target.checked }))} className="accent-secondary rounded-sm" />
              Verified
            </label>
          </div>
        </div>

        {/* Time Frame */}
        <div className="flex flex-col gap-2">
          <label className="font-label-caps text-on-surface-variant">Time Frame</label>
          <select 
            value={timeFrame}
            onChange={(e) => setTimeFrame(e.target.value)}
            className="w-full bg-surface-container border border-outline-variant text-on-surface text-sm rounded px-3 py-1.5 focus:outline-none focus:border-outline"
          >
            <option value="1h">Past 1 Hour</option>
            <option value="6h">Past 6 Hours</option>
            <option value="24h">Past 24 Hours</option>
            <option value="7d">Past 7 Days</option>
          </select>
        </div>
      </div>
    </div>
  );
}
