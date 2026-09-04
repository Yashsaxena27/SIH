import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { renderToString } from 'react-dom/server';
import { Bus as BusIcon, ShieldAlert, AlertTriangle } from 'lucide-react';
import { cn, getValidLatLng } from '@/lib/utils';
import type { Bus, UrbanIssue, Route } from '@/types';
import type { MapLayers } from './LayerControls';
import type { IntelligenceFilter } from './FilterBar';

// Map Auto-fitter
function MapBounds({ buses, issues }: { buses: Bus[], issues: UrbanIssue[] }) {
  const map = useMap();
  useEffect(() => {
    if (!buses.length && !issues.length) return;
    const bounds = L.latLngBounds([]);
    buses.forEach(b => {
      const pos = getValidLatLng(b);
      if (pos) bounds.extend(pos);
    });
    issues.forEach(i => {
      const pos = getValidLatLng(i);
      if (pos) bounds.extend(pos);
    });
    if (bounds.isValid()) {
      try {
        map.fitBounds(bounds, { padding: [100, 100], maxZoom: 15 });
      } catch (e) {
        // Prevent map size timing exceptions
      }
    }
  }, [buses, issues, map]);
  return null;
}

// Markers (similar to Overview but slightly more refined for fullscreen)
const createBusIcon = () => {
  const html = renderToString(
    <div className="relative flex items-center justify-center w-8 h-8">
      <div className="absolute inset-0 bg-cyan-500/20 rounded-full animate-ping" />
      <div className="relative flex items-center justify-center w-6 h-6 bg-surface-low border border-cyan-500 rounded-full shadow-[0_0_12px_rgba(6,182,212,0.6)]">
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
        isCritical ? 'w-7 h-7 bg-surface-low border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]' :
        severity === 'high' ? 'w-6 h-6 bg-surface-low border-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.4)]' :
        'w-5 h-5 bg-surface-low border-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.3)]'
      )}>
        {isCritical ? <ShieldAlert className="w-3.5 h-3.5 text-red-500" /> : <AlertTriangle className={cn("w-3 h-3", severity === 'high' ? 'text-orange-500' : 'text-yellow-500')} />}
      </div>
      
      {/* Clustering Indicator Badge */}
      {showClusters && observationCount > 1 && (
        <div className="absolute -top-2 -right-2 bg-secondary-container text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-[#0f0f12] shadow-md z-10">
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
  hotspots?: any[];
  layers: MapLayers;
  filter: IntelligenceFilter;
  onIssueSelect: (issue: UrbanIssue) => void;
}

export function CommandMap({ buses, issues, routes, hotspots = [], layers, filter, onIssueSelect }: CommandMapProps) {
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
    <div className="absolute inset-0 z-0 bg-background">
      <MapContainer 
        center={[12.9716, 77.5946]} 
        zoom={12} 
        attributionControl={false} 
        className="w-full h-full z-0 outline-none"
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

        {/* Heatmap Simulation (Subtle glow circles under everything) */}
        {layers.heatmap && visibleIssues.map(issue => {
          const pos = getValidLatLng(issue);
          if (!pos) return null;
          return (
            <Circle
              key={`heat-${issue.id}`}
              center={pos}
              radius={issue.severity === 'critical' ? 400 : 250}
              pathOptions={{
                stroke: false,
                fillColor: issue.severity === 'critical' ? 'var(--color-status-critical)' : '#f97316',
                fillOpacity: issue.severity === 'critical' ? 0.15 : 0.08
              }}
            />
          );
        })}

        {/* Routes */}
        {layers.routes && routes.map(route => {
          if (!route.waypoints || !Array.isArray(route.waypoints)) return null;
          const validWaypoints = route.waypoints
            .map(wp => getValidLatLng(wp))
            .filter((pos): pos is [number, number] => pos !== null);
          if (validWaypoints.length < 2) return null;
          return (
            <Polyline
              key={route.id}
              positions={validWaypoints}
              pathOptions={{ color: '#b4c5ff', weight: 3, opacity: 0.4, dashArray: '10, 10' }}
            />
          );
        })}

        {/* Hotspots (Cluster DBSCAN from DB) */}
        {layers.clusters && hotspots.map(spot => {
          if (!spot.center) return null;
          return (
            <Circle
              key={spot.id}
              center={[spot.center.lat, spot.center.lng]}
              radius={spot.radius || 50}
              pathOptions={{
                stroke: true,
                color: spot.severity === 'critical' ? '#ef4444' : '#f97316',
                weight: 2,
                fillColor: spot.severity === 'critical' ? '#ef4444' : '#f97316',
                fillOpacity: 0.3
              }}
            />
          );
        })}

        {/* Civic Issues */}
        {layers.issues && visibleIssues.map(issue => {
          const pos = getValidLatLng(issue);
          if (!pos) return null;
          return (
            <Marker 
              key={`issue-${issue.id}`}
              position={pos}
              icon={createIssueIcon(issue.severity, issue.observationCount, false)}
              eventHandlers={{ click: () => onIssueSelect(issue) }}
            />
          );
        })}

        {/* Active Fleet */}
        {layers.buses && buses.map(bus => {
          const pos = getValidLatLng(bus);
          if (!pos) return null;
          return (
            <Marker 
              key={`bus-${bus.id}`}
              position={pos}
              icon={createBusIcon()}
            />
          );
        })}
        
        <MapBounds buses={buses} issues={issues} />
      </MapContainer>
    </div>
  );
}
