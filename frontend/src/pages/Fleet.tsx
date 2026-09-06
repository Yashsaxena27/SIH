// ============================================================
// Fleet Page - Mobile Sensing Fleet Command
// ============================================================

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bus as BusIcon, Wifi, WifiOff, Camera, Cpu, 
  Database, Cloud, HardDrive, MapPin, Activity, 
  Signal, RefreshCw, Server, ShieldCheck, X, Zap, 
  Map as MapIcon, ArrowRight
} from 'lucide-react';
import { CheckCircle } from 'lucide-react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { GlassPanel, LoadingState, EmptyState } from '@/components/ui';
import { api } from '@/services/api';
import { cn, timeAgo, getValidLatLng } from '@/lib/utils';
import type { Bus, Route } from '@/types';
import { renderToString } from 'react-dom/server';

// Sensor Pipeline Architecture
function SensorPipeline() {
  const nodes = [
    { label: 'Camera', icon: Camera, color: 'text-blue-400', bg: 'bg-blue-400' },
    { label: 'Edge AI', icon: Cpu, color: 'text-secondary', bg: 'bg-secondary' },
    { label: 'Local Buffer', icon: HardDrive, color: 'text-purple-400', bg: 'bg-purple-400' },
    { label: 'Cloud Gateway', icon: Cloud, color: 'text-status-healthy', bg: 'bg-status-healthy' },
    { label: 'PostGIS DB', icon: Database, color: 'text-white', bg: 'bg-white' },
  ];

  return (
    <GlassPanel className="relative overflow-hidden mt-6">
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20 pointer-events-none" />
      <div className="flex items-center justify-between mb-8 relative z-10">
        <div>
          <h3 className="text-sm font-bold text-on-surface uppercase tracking-widest flex items-center gap-2">
            <Zap className="w-4 h-4 text-secondary" /> Edge Sensing Architecture
          </h3>
          <p className="text-[11px] text-on-surface-variant mt-1">Data pipeline from vehicle optical capture to PostGIS spatial fusion.</p>
        </div>
        <div className="px-2 py-0.5 rounded border border-secondary/30 bg-secondary/10 text-secondary text-[10px] font-bold uppercase">
          Offline-First Pipeline
        </div>
      </div>

      <div className="relative flex justify-between items-center py-4 px-2 sm:px-6 z-10">
        <div className="absolute left-[10%] right-[10%] top-1/2 h-0.5 bg-white/[0.05] -translate-y-1/2" />
        {nodes.map((node) => (
          <div key={node.label} className="relative flex flex-col items-center gap-3 z-10 bg-background px-2">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border border-outline-variant bg-surface-low shadow-xl", node.color)}>
              <node.icon className="w-5 h-5" />
            </div>
            <span className="font-label-caps text-[10px] text-on-surface-variant">{node.label}</span>
          </div>
        ))}
      </div>
    </GlassPanel>
  );
}

// Map Bounds Auto-Fit
function FleetMapBounds({ routes, buses }: { routes: Route[]; buses: Bus[] }) {
  const map = useMap();
  useEffect(() => {
    const bounds = L.latLngBounds([]);
    let hasCoords = false;

    routes.forEach(r => {
      if (r.waypoints && Array.isArray(r.waypoints)) {
        r.waypoints.forEach(wp => {
          const pos = getValidLatLng(wp);
          if (pos) {
            bounds.extend(pos);
            hasCoords = true;
          }
        });
      }
    });

    buses.forEach(b => {
      const pos = getValidLatLng(b);
      if (pos) {
        bounds.extend(pos);
        hasCoords = true;
      }
    });

    if (hasCoords && bounds.isValid()) {
      try {
        map.fitBounds(bounds, { padding: [30, 30] });
      } catch (e) {
        // ignore timing exceptions
      }
    }
  }, [routes, buses, map]);
  return null;
}

const createBusMarkerIcon = (busId: string) => {
  const html = renderToString(
    <div className="relative flex items-center justify-center w-8 h-8 group cursor-pointer">
      <div className="absolute inset-0 bg-cyan-500/30 rounded-full animate-ping" />
      <div className="relative flex items-center justify-center w-7 h-7 bg-[#141519] border border-cyan-400 rounded-full shadow-[0_0_12px_rgba(6,182,212,0.8)]">
        <BusIcon className="w-3.5 h-3.5 text-cyan-400" />
      </div>
      <div className="absolute -bottom-4 bg-black/80 px-1 py-0.2 rounded text-[9px] font-mono text-white border border-white/20 whitespace-nowrap">
        {busId}
      </div>
    </div>
  );
  return L.divIcon({ html, className: '', iconSize: [32, 32], iconAnchor: [16, 16] });
};

export function FleetPage() {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBus, setSelectedBus] = useState<Bus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    setError(null);
    Promise.allSettled([api.getBuses(), api.getRoutes()]).then(([bRes, rRes]) => {
      const isAllRejected = bRes.status === 'rejected' && rRes.status === 'rejected';
      if (isAllRejected) {
        setError('Failed to load fleet data.');
        setLoading(false);
        return;
      }
      
      const b = bRes.status === 'fulfilled' ? bRes.value : [];
      const r = rRes.status === 'fulfilled' ? rRes.value : [];
      
      setBuses(b);
      setRoutes(r);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) return <LoadingState message="Connecting to fleet registry..." className="h-full" />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-var(--spacing-header-height))] bg-background">
        <h2 className="font-headline-md text-on-surface">Data Unavailable</h2>
        <p className="text-on-surface-variant mb-4">{error}</p>
        <button onClick={loadData} className="px-4 py-2 bg-primary text-on-primary rounded hover:bg-primary/90">
          Retry Connection
        </button>
      </div>
    );
  }

  const busesWithGps = buses.filter(b => b.telemetryStatus === 'available' || getValidLatLng(b) !== null).length;
  const busesWithoutGps = buses.length - busesWithGps;
  const activeBuses = buses.filter(b => (b.status === 'online' || b.status === 'active') && (b.telemetryStatus === 'available' || getValidLatLng(b) !== null)).length;
  const hasLiveBuses = busesWithGps > 0;
  const hasRouteGeometries = routes.some(r => r.waypoints && Array.isArray(r.waypoints) && r.waypoints.length >= 2);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1920px] mx-auto h-[calc(100vh-var(--spacing-header-height))] flex flex-col relative overflow-hidden">
      
      {/* Header & Truthful Fleet Telemetry Counters */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-on-surface tracking-tight">
            Mobile Sensing Fleet
          </h1>
          <p className="text-sm text-on-surface-variant mt-1 font-medium">
            Truthful operational telemetry status across municipal transit sensing nodes.
          </p>
        </div>
        
        <div className="flex gap-2 sm:gap-4 overflow-x-auto pb-2 sm:pb-0 scrollbar-none">
          {[
            { label: 'Total Fleet', value: buses.length, color: 'text-on-surface' },
            { label: 'Live GPS Nodes', value: activeBuses, color: activeBuses > 0 ? 'text-cyan-400' : 'text-zinc-500' },
            { label: 'GPS Available', value: busesWithGps, color: busesWithGps > 0 ? 'text-emerald-400' : 'text-zinc-500' },
            { label: 'GPS Unavailable', value: busesWithoutGps, color: 'text-amber-400' },
            { label: 'Configured Routes', value: routes.length, color: 'text-purple-400' },
          ].map(stat => (
            <div key={stat.label} className="bg-surface-container border border-outline-variant rounded-lg px-4 py-2 flex flex-col min-w-[110px]">
              <span className="font-label-caps text-[10px] text-on-surface-variant">{stat.label}</span>
              <span className={cn("text-xl font-bold mt-1 font-mono", stat.color)}>{stat.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-12 gap-6 overflow-y-auto scrollbar-none pb-10">
        
        {/* Left: Bus Grid */}
        <div className="xl:col-span-7 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-on-surface uppercase tracking-widest">Fleet Node Registry</h3>
            <span className="text-[11px] font-mono text-zinc-400">
              Corridor-Interpolated Operations
            </span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {buses.length === 0 ? (
              <div className="col-span-full">
                <EmptyState 
                  title="No Active Nodes" 
                  description="There are currently no buses registered in the sensing network."
                  icon={BusIcon}
                />
              </div>
            ) : (
              buses.map((bus, idx) => {
                const isOffline = bus.status === 'offline';
                const hasGps = bus.telemetryStatus === 'available' || getValidLatLng(bus) !== null;
                const isSelected = selectedBus?.id === bus.id;

                return (
                  <motion.div
                    key={bus.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    onClick={() => setSelectedBus(bus)}
                    className={cn(
                      "relative overflow-hidden rounded-xl border p-4 cursor-pointer transition-all duration-200 group",
                      isSelected 
                        ? "border-cyan-500 bg-cyan-500/5 shadow-lg shadow-cyan-500/10" 
                        : isOffline 
                          ? "bg-red-500/[0.02] border-red-500/15 hover:border-red-500/30" 
                          : "bg-white/[0.02] border-outline-variant hover:bg-surface-high"
                    )}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <BusIcon className={cn("w-4 h-4", isOffline ? "text-red-400" : "text-cyan-400")} />
                          <span className="font-data-mono font-bold text-on-surface">{bus.id}</span>
                          <span className="text-[10px] text-zinc-400 font-mono">({bus.registrationNumber})</span>
                        </div>
                        <div className="text-[10px] uppercase tracking-widest text-on-surface-variant font-mono">
                          {bus.routeName || (bus.routeId ? `Route ${bus.routeId}` : 'Unassigned Route')}
                        </div>
                      </div>

                      {/* Truthful Telemetry Badge */}
                      <div className={cn(
                        "px-2 py-0.5 rounded font-label-caps text-[9px] font-mono flex items-center gap-1 border",
                        hasGps 
                          ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" 
                          : "bg-zinc-800 text-zinc-400 border-zinc-700"
                      )}>
                        {hasGps && <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />}
                        {hasGps ? 'LIVE GPS' : 'GPS UNAVAILABLE'}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
                      <div className="flex items-center gap-2">
                        <Signal className={cn("w-3.5 h-3.5", isOffline ? "text-red-400" : (hasGps ? "text-status-healthy" : "text-zinc-500"))} />
                        <span className="text-on-surface">{isOffline ? 'Disconnected' : (hasGps ? 'Live Telemetry' : 'Recorded / Offline')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Camera className="w-3.5 h-3.5 text-status-healthy" />
                        <span className="text-on-surface">{bus.cameraStatus || 'offline'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Cpu className="w-3.5 h-3.5 text-secondary" />
                        <span className="text-on-surface font-data-mono">{bus.edgeAiStatus === 'offline' ? 'AI: OFFLINE' : 'AI: ACTIVE'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className={cn("w-3.5 h-3.5", hasGps ? "text-cyan-400" : "text-zinc-500")} />
                        <span className="text-zinc-400 font-mono text-[11px]">{hasGps ? 'Fix Acquired' : 'No Hardware GPS'}</span>
                      </div>
                    </div>
                    
                    <div className="mt-3 pt-2.5 border-t border-white/[0.04] flex items-center justify-between text-[10px] text-on-surface-variant font-data-mono">
                      <span>Operator: {bus.operator || 'Unassigned'}</span>
                      <span>{bus.lastSeen ? timeAgo(bus.lastSeen) : 'No Telemetry'}</span>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Map & Architecture */}
        <div className="xl:col-span-5 flex flex-col gap-6">
          <SensorPipeline />

          <GlassPanel padding="none" className="flex-1 min-h-[340px] flex flex-col overflow-hidden relative">
            <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
              <div className="bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-outline-variant pointer-events-auto">
                <h3 className="text-xs font-bold text-on-surface uppercase tracking-widest flex items-center gap-2">
                  <MapIcon className="w-4 h-4 text-purple-400" /> Configured Route Corridors
                </h3>
              </div>
              <div className="bg-black/80 backdrop-blur-md px-2 py-1 rounded border border-outline-variant font-label-caps text-[10px] text-purple-400 flex items-center gap-1.5 pointer-events-auto">
                <div className="w-3 h-0.5 bg-purple-500" /> Configured Corridor
              </div>
            </div>

            {/* Truthful Telemetry Disclosure Overlay when no live GPS is broadcasting */}
            {!hasLiveBuses && (
              <div className="absolute bottom-4 left-4 right-4 z-10 pointer-events-auto">
                <div className="p-3.5 rounded-xl bg-[#141519]/90 backdrop-blur-md border border-amber-500/20 text-xs shadow-xl flex items-start gap-3">
                  <WifiOff className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white block mb-0.5">Live Fleet GPS Telemetry Unavailable</span>
                    <p className="text-[11px] text-on-surface-variant/80 font-mono leading-relaxed">
                      Physical vehicles operate with offline optical recording. Detections are spatially interpolated along configured transit corridors during post-trip ingestion.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <MapContainer 
              center={[28.6139, 77.2090]} 
              zoom={11} 
              className="w-full h-full z-0 outline-none bg-background" 
              zoomControl={false}
            >
              <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png" />
              
              {/* Genuine Route Geometry Corridors */}
              {routes.map((route, i) => {
                if (!route.waypoints || !Array.isArray(route.waypoints)) return null;
                const validWaypoints = route.waypoints
                  .map(wp => getValidLatLng(wp))
                  .filter((pos): pos is [number, number] => pos !== null);
                if (validWaypoints.length < 2) return null;
                return (
                  <Polyline 
                    key={route.id} 
                    positions={validWaypoints} 
                    pathOptions={{ 
                      color: i % 2 === 0 ? '#a855f7' : '#06b6d4', 
                      weight: 3.5, 
                      opacity: 0.8,
                    }} 
                  />
                );
              })}

              {/* Real Bus Markers ONLY if valid GPS coordinates exist */}
              {buses.map(bus => {
                const pos = getValidLatLng(bus);
                if (!pos) return null;
                return (
                  <Marker 
                    key={bus.id} 
                    position={pos} 
                    icon={createBusMarkerIcon(bus.id)}
                    eventHandlers={{ click: () => setSelectedBus(bus) }}
                  >
                    <Popup className="custom-leaflet-popup">
                      <div className="p-2 text-xs">
                        <strong>{bus.id}</strong> ({bus.registrationNumber})<br/>
                        Route: {bus.routeName || bus.routeId || 'N/A'}<br/>
                        Status: {bus.status}
                      </div>
                    </Popup>
                  </Marker>
                );
              })}

              <FleetMapBounds routes={routes} buses={buses} />
            </MapContainer>
          </GlassPanel>

        </div>
      </div>

      {/* Selected Bus Drawer with Truthful Disclosure */}
      <AnimatePresence>
        {selectedBus && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[400] bg-black/40 backdrop-blur-sm"
              onClick={() => setSelectedBus(null)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute right-0 top-0 bottom-0 w-full sm:w-[480px] z-[500] bg-surface-low border-l border-outline-variant shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-outline-variant flex items-start justify-between bg-white/[0.02]">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={cn(
                      "px-2 py-0.5 rounded font-label-caps text-[10px] font-mono border",
                      (selectedBus.telemetryStatus === 'available' || getValidLatLng(selectedBus) !== null)
                        ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
                        : "bg-zinc-800 text-zinc-400 border-zinc-700"
                    )}>
                      {(selectedBus.telemetryStatus === 'available' || getValidLatLng(selectedBus) !== null)
                        ? 'LIVE GPS'
                        : 'GPS UNAVAILABLE'}
                    </span>
                    <span className="text-[10px] text-on-surface-variant font-data-mono tracking-widest">{selectedBus.id}</span>
                  </div>
                  <h2 className="text-xl font-bold text-on-surface">{selectedBus.registrationNumber}</h2>
                  <p className="text-xs text-on-surface-variant font-mono mt-0.5">
                    {selectedBus.routeName || (selectedBus.routeId ? `Route ${selectedBus.routeId}` : 'Unassigned Corridor')}
                  </p>
                </div>
                <button onClick={() => setSelectedBus(null)} className="p-2 text-on-surface-variant hover:text-white rounded-lg hover:bg-white/[0.05]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto scrollbar-none p-6 space-y-6">
                {/* Truthful Telemetry Disclosure Panel */}
                <div className="p-4 rounded-xl border border-outline-variant bg-surface-container/40 space-y-3">
                  <h3 className="text-xs font-bold text-on-surface uppercase tracking-widest flex items-center gap-2">
                    <WifiOff className="w-4 h-4 text-amber-400" /> Telemetry Status
                  </h3>
                  <div className="text-xs space-y-2 font-mono">
                    <div className="flex justify-between py-1 border-b border-white/[0.05]">
                      <span className="text-zinc-400">GPS Hardware Signal:</span>
                      <span className="text-amber-400 font-bold">
                        {(selectedBus.telemetryStatus === 'available' || getValidLatLng(selectedBus) !== null) ? 'Active Satellite Fix' : 'Unavailable (NULL)'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-white/[0.05]">
                      <span className="text-zinc-400">Ingestion Mode:</span>
                      <span className="text-white">Offline Corridor Inspection</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-white/[0.05]">
                      <span className="text-zinc-400">Operator:</span>
                      <span className="text-white">{selectedBus.operator || 'BMTC / DTC'}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-zinc-400">Optical Camera Status:</span>
                      <span className="text-emerald-400 font-bold">{selectedBus.cameraStatus || 'online'}</span>
                    </div>
                  </div>
                </div>

                {/* Node System Health */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg border border-outline-variant bg-white/[0.02]">
                    <div className="text-zinc-400 text-[10px] uppercase tracking-wider mb-1">AI Inference Core</div>
                    <div className="font-mono font-bold text-cyan-400">
                      {selectedBus.edgeAiStatus === 'offline' ? 'OFFLINE' : 'RUNNING (YOLOv8)'}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg border border-outline-variant bg-white/[0.02]">
                    <div className="text-zinc-400 text-[10px] uppercase tracking-wider mb-1">Connection State</div>
                    <div className="font-mono font-bold text-white">
                      {selectedBus.status === 'offline' ? 'DISCONNECTED' : 'ONLINE GATEWAY'}
                    </div>
                  </div>
                </div>

                {/* Spatial Corridor Context */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-on-surface uppercase tracking-widest">Configured Corridor</h4>
                  <div className="p-3 rounded-lg border border-outline-variant bg-white/[0.02] text-xs font-mono">
                    <p className="text-white font-medium">{selectedBus.routeName || 'No corridor assigned'}</p>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      Inspection coordinates for uploaded video runs on this node are dynamically interpolated across this designated path.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
