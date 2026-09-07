import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { renderToString } from 'react-dom/server';
import { Bus as BusIcon, ShieldAlert, AlertTriangle, MapPin } from 'lucide-react';
import { cn, getValidLatLng } from '@/lib/utils';
import type { Bus, UrbanIssue, Route, RoadSegment } from '@/types';
import type { SafeRouteResponse, RouteCandidate } from '@/types/saferoute';
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

// Markers (Refined dark command center icons)
const createBusIcon = () => {
  const html = renderToString(
    <div className="relative flex items-center justify-center w-8 h-8 group cursor-pointer">
      <div className="absolute inset-0 bg-cyan-500/25 rounded-full animate-ping" />
      <div className="relative flex items-center justify-center w-7 h-7 bg-[#141519] border border-cyan-400 rounded-full shadow-[0_0_14px_rgba(6,182,212,0.7)] group-hover:scale-110 transition-transform">
        <BusIcon className="w-3.5 h-3.5 text-cyan-400" />
      </div>
    </div>
  );
  return L.divIcon({ html, className: '', iconSize: [32, 32], iconAnchor: [16, 16] });
};

const createIssueIcon = (severity: string, observationCount: number, showClusters: boolean, authorityCode?: string) => {
  const isCritical = severity === 'critical';
  const isHigh = severity === 'high';
  
  const authorityRing = 
    authorityCode === 'PWD' ? 'ring-2 ring-blue-500/80 shadow-[0_0_8px_rgba(59,130,246,0.5)]' :
    authorityCode === 'MCD' ? 'ring-2 ring-emerald-500/80 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
    authorityCode === 'NOIDA' ? 'ring-2 ring-purple-500/80 shadow-[0_0_8px_rgba(168,85,247,0.5)]' :
    'ring-1 ring-amber-400/40';

  const html = renderToString(
    <div className="relative flex items-center justify-center group cursor-pointer issue-marker-pin">
      {isCritical && <div className="absolute inset-[-4px] rounded-full bg-red-500/30 animate-ping" />}
      <div className={cn(
        "relative flex items-center justify-center rounded-full border shadow-lg transition-transform group-hover:scale-110",
        authorityRing,
        isCritical ? 'w-7 h-7 bg-[#141519] border-red-500 shadow-[0_0_16px_rgba(239,68,68,0.7)]' :
        isHigh ? 'w-6 h-6 bg-[#141519] border-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.6)]' :
        'w-5.5 h-5.5 bg-[#141519] border-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]'
      )}>
        {isCritical ? (
          <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
        ) : (
          <AlertTriangle className={cn("w-3.5 h-3.5", isHigh ? 'text-orange-500' : 'text-amber-400')} />
        )}
      </div>
      
      {/* Clustering Indicator Badge */}
      {showClusters && observationCount > 1 && (
        <div className="absolute -top-2 -right-2 bg-cyan-500 text-black font-mono font-bold text-[9px] px-1.5 py-0.2 rounded-full border border-black shadow-md z-10">
          {observationCount}
        </div>
      )}
    </div>
  );
  return L.divIcon({ html, className: '', iconSize: [28, 28], iconAnchor: [14, 14] });
};

const createSafeRoutePinIcon = (type: 'origin' | 'destination') => {
  const isOrigin = type === 'origin';
  const html = renderToString(
    <div className="relative flex items-center justify-center">
      <div className={cn(
        "relative flex items-center justify-center rounded-full border shadow-lg w-7 h-7 bg-[#141519]",
        isOrigin ? "border-emerald-400 ring-2 ring-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.8)]" : "border-rose-400 ring-2 ring-rose-500/50 shadow-[0_0_12px_rgba(244,63,94,0.8)]"
      )}>
        <MapPin className={cn("w-4 h-4", isOrigin ? "text-emerald-400" : "text-rose-400")} />
      </div>
    </div>
  );
  return L.divIcon({ html, className: '', iconSize: [28, 28], iconAnchor: [14, 28] });
};

interface CommandMapProps {
  buses: Bus[];
  issues: UrbanIssue[];
  routes: Route[];
  roads?: RoadSegment[];
  hotspots?: any[];
  layers: MapLayers;
  filter: IntelligenceFilter;
  onIssueSelect: (issue: UrbanIssue) => void;
  onRoadSelect?: (road: RoadSegment) => void;
  selectedRoadId?: string | null;
  safeRouteResult?: SafeRouteResponse | null;
  selectedCandidateId?: string | null;
  onSelectCandidate?: (candidate: RouteCandidate) => void;
}

export function CommandMap({ 
  buses, 
  issues, 
  routes, 
  roads = [], 
  hotspots = [], 
  layers, 
  filter, 
  onIssueSelect,
  onRoadSelect,
  selectedRoadId,
  safeRouteResult,
  selectedCandidateId,
  onSelectCandidate
}: CommandMapProps) {
  // Apply filters
  const visibleIssues = issues.filter(i => {
    if (filter === 'ALL') return true;
    if (filter === 'ROAD') return i.type.includes('pothole') || i.type.includes('crack');
    if (filter === 'WATER') return i.type.includes('water');
    if (filter === 'TRAFFIC') return false; // Mock
    if (filter === 'SAFETY') return i.severity === 'critical';
    return true;
  });

  const hasValidIssues = visibleIssues.some(i => getValidLatLng(i) !== null);
  const hasValidBuses = buses.some(b => getValidLatLng(b) !== null);
  const hasValidHotspots = hotspots.some(h => getValidLatLng(h) !== null);
  const hasValidRoads = roads.some(r => (r.coordinates || r.geometry?.coordinates)?.length);
  const hasAnyVisibleGeoData = hasValidIssues || (layers.buses && hasValidBuses) || (layers.clusters && hasValidHotspots) || (layers.roads && hasValidRoads);

  return (
    <div className="absolute inset-0 z-0 bg-[#0d0e11]">
      <MapContainer 
        center={[28.6139, 77.2090]}
        zoom={12} 
        attributionControl={false} 
        className="w-full h-full z-0 outline-none"
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

        {/* Road Corridors GIS Layer */}
        {layers.roads && roads.map(road => {
          const coords = road.coordinates || road.geometry?.coordinates;
          if (!coords || !Array.isArray(coords) || coords.length < 2) return null;
          const positions = coords.map(([lng, lat]) => [lat, lng] as [number, number]);

          const health = road.health || road.operational_health;
          const score = health?.score ?? health?.healthScore ?? road.healthScore ?? 100;
          const riskState = health?.riskState ?? (
            score >= 90 ? 'HEALTHY' :
            score >= 70 ? 'WATCH' :
            score >= 50 ? 'ELEVATED' : 'CRITICAL'
          );

          const color = 
            riskState === 'HEALTHY' ? '#10b981' :
            riskState === 'WATCH' ? '#eab308' :
            riskState === 'ELEVATED' ? '#f97316' : '#ef4444';

          const isSelected = selectedRoadId === road.id;

          return (
            <Polyline
              key={`road-${road.id}`}
              positions={positions}
              pathOptions={{
                color,
                weight: isSelected ? 8 : 5,
                opacity: isSelected ? 1.0 : 0.8,
                className: 'road-corridor-polyline cursor-pointer'
              }}
              eventHandlers={{
                click: () => onRoadSelect && onRoadSelect(road)
              }}
            />
          );
        })}

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
                fillColor: issue.severity === 'critical' ? '#ef4444' : '#f97316',
                fillOpacity: issue.severity === 'critical' ? 0.15 : 0.08,
                interactive: false
              }}
            />
          );
        })}

        {/* Standard Bus Routes */}
        {layers.routes && routes.map((route, idx) => {
          if (!route.waypoints || !Array.isArray(route.waypoints)) return null;
          const validWaypoints = route.waypoints
            .map(wp => getValidLatLng(wp))
            .filter((pos): pos is [number, number] => pos !== null);
          if (validWaypoints.length < 2) return null;
          return (
            <Polyline
              key={`route-${route.id || idx}`}
              positions={validWaypoints}
              pathOptions={{ color: '#6366f1', weight: 3, opacity: 0.4, dashArray: '8, 8' }}
            />
          );
        })}

        {/* SafeRoute Risk-Aware Routing Candidate Corridors */}
        {safeRouteResult?.candidates && safeRouteResult.candidates.map((cand) => {
          const coords = cand.geometry?.coordinates;
          if (!coords || !Array.isArray(coords) || coords.length < 2) return null;
          const positions = coords.map(([lng, lat]) => [lat, lng] as [number, number]);
          const isSelected = selectedCandidateId ? cand.id === selectedCandidateId : cand.is_recommended;
          const isRecommended = cand.is_recommended;

          const color = 
            cand.risk_level === 'LOW' ? '#10b981' :
            cand.risk_level === 'MODERATE' ? '#eab308' :
            cand.risk_level === 'ELEVATED' ? '#f97316' : '#ef4444';

          return (
            <Polyline
              key={`saferoute-cand-${cand.id}`}
              positions={positions}
              pathOptions={{
                color: isSelected ? (isRecommended ? '#06b6d4' : color) : color,
                weight: isSelected ? 8 : 4,
                opacity: isSelected ? 1.0 : 0.45,
                dashArray: isSelected ? undefined : '6, 6',
                className: 'saferoute-candidate-polyline cursor-pointer'
              }}
              eventHandlers={{
                click: () => onSelectCandidate && onSelectCandidate(cand)
              }}
            />
          );
        })}

        {/* SafeRoute Origin and Destination Markers */}
        {safeRouteResult && safeRouteResult.candidates.length > 0 && (() => {
          const activeCand = safeRouteResult.candidates.find(c => c.id === selectedCandidateId) 
            || safeRouteResult.candidates.find(c => c.is_recommended) 
            || safeRouteResult.candidates[0];
          const coords = activeCand?.geometry?.coordinates;
          if (!coords || coords.length < 2) return null;

          const originPos = [coords[0][1], coords[0][0]] as [number, number];
          const destPos = [coords[coords.length - 1][1], coords[coords.length - 1][0]] as [number, number];

          return (
            <>
              <Marker position={originPos} icon={createSafeRoutePinIcon('origin')} />
              <Marker position={destPos} icon={createSafeRoutePinIcon('destination')} />
            </>
          );
        })()}

        {/* Hotspots (Cluster DBSCAN from DB) */}
        {layers.clusters && hotspots.map((spot, idx) => {
          const pos = getValidLatLng(spot);
          if (!pos) return null;
          return (
            <Circle
              key={`hotspot-${spot.id || spot.cluster_id || idx}`}
              center={pos}
              radius={spot.radius || spot.radius_meters || 50}
              pathOptions={{
                stroke: true,
                color: (spot.severity || spot.max_severity) === 'critical' ? '#ef4444' : '#f97316',
                weight: 2,
                fillColor: (spot.severity || spot.max_severity) === 'critical' ? '#ef4444' : '#f97316',
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
              icon={createIssueIcon(issue.severity, issue.observationCount, false, issue.authorityCode)}
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

      {/* Honest Empty Overlay when no valid geo entities are visible in active filter */}
      {!hasAnyVisibleGeoData && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[400] pointer-events-none">
          <div className="bg-[#141519]/90 backdrop-blur-xl border border-white/[0.1] rounded-2xl px-6 py-5 text-center shadow-2xl max-w-sm pointer-events-auto">
            <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-3 text-on-surface-variant">
              <MapPin className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">No Spatial Entities in Sector</h3>
            <p className="text-xs text-on-surface-variant/70 mt-1 font-mono">
              {filter !== 'ALL' 
                ? `No recorded events match the "${filter}" filter criteria.` 
                : 'No geographic incidents or vehicle coordinates are currently reported in this sector.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
