import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { renderToString } from 'react-dom/server';
import { Bus as BusIcon, ShieldAlert, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Bus, UrbanIssue, Route } from '@/types';
import type { MapLayers } from './LayerControls';
import type { IntelligenceFilter } from './FilterBar';

// Map Auto-fitter
function MapBounds({ buses, issues }: { buses: Bus[], issues: UrbanIssue[] }) {
  const map = useMap();
  useEffect(() => {
    if (!buses.length && !issues.length) return;
    const bounds = L.latLngBounds([]);
    buses.forEach(b => { if (b.currentPosition) bounds.extend([b.currentPosition.lat, b.currentPosition.lng]); });
    issues.forEach(i => bounds.extend([i.location.lat, i.location.lng]));
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [100, 100], maxZoom: 15 });
    }
  }, [buses, issues, map]);
  return null;
}

// Markers (similar to Overview but slightly more refined for fullscreen)
const createBusIcon = () => {
  const html = renderToString(
    <div className="relative flex items-center justify-center w-8 h-8">
      <div className="absolute inset-0 bg-cyan-500/20 rounded-full animate-ping" />
      <div className="relative flex items-center justify-center w-6 h-6 bg-[#0f0f12] border border-cyan-500 rounded-full shadow-[0_0_12px_rgba(6,182,212,0.6)]">
        <BusIcon className="w-3.5 h-3.5 text-cyan-400" />
      </div>
    </div>
  );
  return L.divIcon({ html, className: '', iconSize: [32, 32], iconAnchor: [16, 16] });
};

const createIssueIcon = (severity: string, observationCount: number, showClusters: boolean) => {
  const isCritical = severity === 'critical';
  
  const html = renderToString(
    <div className="relative flex items-center justify-center group cursor-pointer">
      {isCritical && <div className="absolute inset-[-4px] rounded-full bg-red-500/30 animate-ping" />}
      <div className={cn(
        "relative flex items-center justify-center rounded-full border shadow-lg transition-transform group-hover:scale-110",
        isCritical ? 'w-7 h-7 bg-[#0f0f12] border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]' :
        severity === 'high' ? 'w-6 h-6 bg-[#0f0f12] border-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.4)]' :
        'w-5 h-5 bg-[#0f0f12] border-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.3)]'
      )}>
        {isCritical ? <ShieldAlert className="w-3.5 h-3.5 text-red-500" /> : <AlertTriangle className={cn("w-3 h-3", severity === 'high' ? 'text-orange-500' : 'text-yellow-500')} />}
      </div>
      
      {/* Clustering Indicator Badge */}
      {showClusters && observationCount > 1 && (
        <div className="absolute -top-2 -right-2 bg-accent-primary text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-[#0f0f12] shadow-md z-10">
          {observationCount}
        </div>
      )}
    </div>
  );
  return L.divIcon({ html, className: '', iconSize: [28, 28], iconAnchor: [14, 14] });
};

interface CommandMapProps {
  buses: Bus[];
  issues: UrbanIssue[];
  routes: Route[];
  layers: MapLayers;
  filter: IntelligenceFilter;
  onIssueSelect: (issue: UrbanIssue) => void;
}

export function CommandMap({ buses, issues, routes, layers, filter, onIssueSelect }: CommandMapProps) {
  // Apply filters
  const visibleIssues = issues.filter(i => {
    if (filter === 'ALL') return true;
    if (filter === 'ROAD') return i.type.includes('pothole') || i.type.includes('crack');
    if (filter === 'WATER') return i.type.includes('water');
    if (filter === 'TRAFFIC') return false; // Mock
    if (filter === 'SAFETY') return i.severity === 'critical';
    return true;
  });

  return (
    <div className="absolute inset-0 z-0 bg-[#09090b]">
      <MapContainer 
        center={[28.6139, 77.2090]} 
        zoom={12} 
        className="w-full h-full z-0 outline-none"
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

        {/* Heatmap Simulation (Subtle glow circles under everything) */}
        {layers.heatmap && visibleIssues.map(issue => (
          <Circle
            key={`heat-${issue.id}`}
            center={[issue.location.lat, issue.location.lng]}
            radius={issue.severity === 'critical' ? 400 : 250}
            pathOptions={{
              stroke: false,
              fillColor: issue.severity === 'critical' ? '#ef4444' : '#f97316',
              fillOpacity: issue.severity === 'critical' ? 0.15 : 0.08
            }}
          />
        ))}

        {/* Routes */}
        {layers.routes && routes.map(route => (
          <Polyline
            key={route.id}
            positions={route.waypoints.map(wp => [wp.lat, wp.lng])}
            pathOptions={{ color: '#8b5cf6', weight: 3, opacity: 0.4, dashArray: '10, 10' }}
          />
        ))}

        {/* Civic Issues */}
        {layers.issues && visibleIssues.map(issue => (
          <Marker 
            key={`issue-${issue.id}`}
            position={[issue.location.lat, issue.location.lng]}
            icon={createIssueIcon(issue.severity, issue.observationCount, layers.clusters)}
            eventHandlers={{ click: () => onIssueSelect(issue) }}
          />
        ))}

        {/* Active Fleet */}
        {layers.buses && buses.filter(b => b.currentPosition).map(bus => (
          <Marker 
            key={`bus-${bus.id}`}
            position={[bus.currentPosition!.lat, bus.currentPosition!.lng]}
            icon={createBusIcon()}
          />
        ))}
        
        <MapBounds buses={buses} issues={issues} />
      </MapContainer>
    </div>
  );
}
