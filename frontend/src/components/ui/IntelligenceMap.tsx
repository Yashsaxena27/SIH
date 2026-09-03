import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { renderToString } from 'react-dom/server';
import { Bus as BusIcon, AlertTriangle, X, ShieldAlert } from 'lucide-react';
import { GlassPanel } from './GlassPanel';
import { cn, timeAgo } from '@/lib/utils';
import type { Bus, UrbanIssue } from '@/types';

// Custom icons using Lucide and Tailwind classes via divIcon
const createBusIcon = () => {
  const iconHtml = renderToString(
    <div className="relative flex items-center justify-center w-8 h-8">
      <div className="absolute inset-0 bg-secondary/20 rounded-full animate-ping" />
      <div className="relative flex items-center justify-center w-6 h-6 bg-surface-low border border-secondary rounded-full shadow-[0_0_10px_rgba(6,182,212,0.5)]">
        <BusIcon className="w-3.5 h-3.5 text-secondary" />
      </div>
    </div>
  );
  return L.divIcon({ html: iconHtml, className: '', iconSize: [32, 32], iconAnchor: [16, 16] });
};

const createIssueIcon = (severity: string, isSelected: boolean) => {
  const colorMap: Record<string, { bg: string, border: string, text: string, shadow: string }> = {
    critical: { bg: 'bg-red-500/10', border: 'border-red-500', text: 'text-red-400', shadow: 'shadow-[0_0_12px_rgba(239,68,68,0.6)]' },
    high: { bg: 'bg-orange-500/10', border: 'border-orange-500', text: 'text-orange-400', shadow: 'shadow-[0_0_12px_rgba(249,115,22,0.6)]' },
    medium: { bg: 'bg-yellow-500/10', border: 'border-yellow-500', text: 'text-yellow-400', shadow: 'shadow-[0_0_8px_rgba(234,179,8,0.4)]' },
    low: { bg: 'bg-blue-500/10', border: 'border-blue-500', text: 'text-blue-400', shadow: 'shadow-[0_0_8px_rgba(59,130,246,0.4)]' },
  };
  const colors = colorMap[severity] || colorMap.medium;
  const sizeClass = isSelected ? 'w-8 h-8' : 'w-6 h-6';
  const iconSizeClass = isSelected ? 'w-4 h-4' : 'w-3 h-3';
  
  const iconHtml = renderToString(
    <div className={cn("relative flex items-center justify-center transition-all duration-300", isSelected ? 'scale-110 z-50' : 'scale-100 z-10')}>
      {severity === 'critical' && <div className={`absolute inset-0 rounded-full animate-ping opacity-30 ${colors.bg.replace('/10', '')}`} />}
      <div className={cn(`relative flex items-center justify-center bg-surface-low rounded-full border ${colors.border} ${colors.shadow}`, sizeClass)}>
        {severity === 'critical' 
          ? <ShieldAlert className={cn(colors.text, iconSizeClass)} />
          : <AlertTriangle className={cn(colors.text, iconSizeClass)} />
        }
      </div>
    </div>
  );
  return L.divIcon({ html: iconHtml, className: '', iconSize: isSelected ? [32, 32] : [24, 24], iconAnchor: isSelected ? [16, 16] : [12, 12] });
};

// Map auto-fitter component
function MapBounds({ buses, issues }: { buses: Bus[], issues: UrbanIssue[] }) {
  const map = useMap();
  useEffect(() => {
    if (!buses.length && !issues.length) return;
    const bounds = L.latLngBounds([]);
    buses.forEach(b => { if (b.currentPosition) bounds.extend([b.currentPosition.lat, b.currentPosition.lng]); });
    issues.forEach(i => bounds.extend([i.location.lat, i.location.lng]));
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [buses, issues, map]);
  return null;
}

interface IntelligenceMapProps {
  buses: Bus[];
  issues: UrbanIssue[];
}

export function IntelligenceMap({ buses, issues }: IntelligenceMapProps) {
  const [selectedIssue, setSelectedIssue] = useState<UrbanIssue | null>(null);
  // Default to Delhi coords
  const defaultCenter: [number, number] = [28.6139, 77.2090];

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden border border-outline-variant shadow-2xl bg-surface-low">
      <MapContainer 
        center={defaultCenter} 
        zoom={12} 
        attributionControl={false} 
        className="w-full h-full z-0 outline-none"
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        
        {/* Render Buses */}
        {buses.map(bus => bus.currentPosition && (
          <Marker 
            key={`bus-${bus.id}`}
            position={[bus.currentPosition.lat, bus.currentPosition.lng]}
            icon={createBusIcon()}
          />
        ))}

        {/* Render Issues */}
        {issues.map(issue => (
          <Marker 
            key={`issue-${issue.id}`}
            position={[issue.location.lat, issue.location.lng]}
            icon={createIssueIcon(issue.severity, selectedIssue?.id === issue.id)}
            eventHandlers={{
              click: () => setSelectedIssue(issue)
            }}
          />
        ))}
        
        <MapBounds buses={buses} issues={issues} />
      </MapContainer>

      {/* Floating Context Panel over the Map */}
      {selectedIssue && (
        <div className="absolute top-4 right-4 z-[400] w-80 animate-in slide-in-from-right-8 fade-in duration-300">
          <GlassPanel className="backdrop-blur-3xl bg-surface-high/90 border-white/[0.12] shadow-2xl">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={cn(
                  'px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider',
                  selectedIssue.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                  selectedIssue.severity === 'high' ? 'bg-orange-500/20 text-orange-400' :
                  selectedIssue.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-blue-500/20 text-blue-400'
                )}>
                  {selectedIssue.severity}
                </div>
                <span className="text-[10px] text-on-surface-variant font-data-mono">{selectedIssue.id}</span>
              </div>
              <button 
                onClick={() => setSelectedIssue(null)}
                className="text-on-surface-variant hover:text-white transition-colors p-1 -mr-1 -mt-1 rounded-md hover:bg-surface-high"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <h3 className="text-sm font-semibold text-on-surface mb-1 leading-snug">
              {selectedIssue.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </h3>
            <p className="text-xs text-white/60 mb-4 flex items-start gap-1.5">
              <span className="mt-0.5">📍</span> {selectedIssue.location.address}
            </p>

            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="bg-surface-container rounded-lg p-2 border border-white/[0.04]">
                <div className="text-[10px] text-on-surface-variant uppercase">Observations</div>
                <div className="text-sm font-semibold text-on-surface mt-0.5">{selectedIssue.observationCount}</div>
              </div>
              <div className="bg-surface-container rounded-lg p-2 border border-white/[0.04]">
                <div className="text-[10px] text-on-surface-variant uppercase">Confidence</div>
                <div className="text-sm font-semibold text-primary-hover mt-0.5">{((selectedIssue?.confidence ?? 0) * 100).toFixed(1)}%</div>
              </div>
            </div>

            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between border-b border-white/[0.04] pb-1.5">
                <span className="text-on-surface-variant">First detected</span>
                <span className="text-on-surface">{timeAgo(selectedIssue.firstDetectedAt)}</span>
              </div>
              <div className="flex justify-between border-b border-white/[0.04] pb-1.5">
                <span className="text-on-surface-variant">Status</span>
                <span className="text-on-surface capitalize">{selectedIssue.status.replace(/_/g, ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Assigned To</span>
                <span className="text-on-surface font-medium">{selectedIssue.assignedDepartmentId || 'Unassigned'}</span>
              </div>
            </div>

            <button className="w-full mt-4 bg-surface-high hover:bg-white/[0.1] border border-outline-variant text-on-surface text-xs font-medium py-2 rounded-lg transition-colors">
              View Full Details
            </button>
          </GlassPanel>
        </div>
      )}
    </div>
  );
}
