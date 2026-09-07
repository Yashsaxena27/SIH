// ============================================================
// Fleet Page — Mobile Sensing Fleet & Distributed Intelligence Command
// ============================================================

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bus as BusIcon, Wifi, WifiOff, Camera, Cpu, 
  Database, Cloud, HardDrive, MapPin, Activity, 
  Signal, RefreshCw, Server, ShieldCheck, X, Zap, 
  Map as MapIcon, ArrowRight, Video, CheckCircle2,
  AlertTriangle, Truck, Compass, History, Layers
} from 'lucide-react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { GlassPanel, LoadingState, EmptyState } from '@/components/ui';
import { api } from '@/services/api';
import { cn, timeAgo, getValidLatLng } from '@/lib/utils';
import type { Bus, Route, FleetSummary, InspectionSession, VehicleType } from '@/types';
import { renderToString } from 'react-dom/server';

// Sensor Pipeline Architecture
function SensorPipeline() {
  const nodes = [
    { label: 'Optical Camera', icon: Camera, color: 'text-blue-400' },
    { label: 'Edge AI (YOLOv8)', icon: Cpu, color: 'text-cyan-400' },
    { label: 'Local Buffer', icon: HardDrive, color: 'text-purple-400' },
    { label: 'Cloud Gateway', icon: Cloud, color: 'text-emerald-400' },
    { label: 'PostGIS Fusion', icon: Database, color: 'text-white' },
  ];

  return (
    <GlassPanel className="relative overflow-hidden mt-6">
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20 pointer-events-none" />
      <div className="flex items-center justify-between mb-6 relative z-10">
        <div>
          <h3 className="text-sm font-bold text-on-surface uppercase tracking-widest flex items-center gap-2">
            <Zap className="w-4 h-4 text-cyan-400" /> Multi-Camera Distributed Sensing Pipeline
          </h3>
          <p className="text-[11px] text-on-surface-variant/70 mt-0.5">
            Edge inference pipeline across transit buses, PWD survey units, and municipal utility vehicles.
          </p>
        </div>
        <div className="px-2.5 py-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 text-[10px] font-mono font-bold uppercase tracking-wider">
          Distributed Corroboration Engine
        </div>
      </div>

      <div className="relative flex justify-between items-center py-3 px-2 sm:px-6 z-10">
        <div className="absolute left-[10%] right-[10%] top-1/2 h-0.5 bg-white/[0.06] -translate-y-1/2" />
        {nodes.map((node) => (
          <div key={node.label} className="relative flex flex-col items-center gap-2 z-10 bg-[#141519] px-3 py-1 rounded-xl border border-white/[0.05]">
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center border border-white/[0.1] bg-black/40 shadow-xl", node.color)}>
              <node.icon className="w-4 h-4" />
            </div>
            <span className="font-mono text-[10px] text-on-surface-variant/80">{node.label}</span>
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

const createBusMarkerIcon = (busId: string, vehicleType: string = 'bus') => {
  const isInspection = vehicleType === 'inspection_vehicle';
  const isService = vehicleType === 'service_vehicle';

  const iconColor = isInspection ? 'text-purple-400' : isService ? 'text-amber-400' : 'text-cyan-400';
  const borderColor = isInspection ? 'border-purple-400' : isService ? 'border-amber-400' : 'border-cyan-400';
  const shadowColor = isInspection ? 'rgba(168,85,247,0.8)' : isService ? 'rgba(245,158,11,0.8)' : 'rgba(6,182,212,0.8)';

  const html = renderToString(
    <div className="relative flex items-center justify-center w-8 h-8 group cursor-pointer">
      <div className={cn("absolute inset-0 rounded-full animate-ping opacity-30", isInspection ? "bg-purple-500" : isService ? "bg-amber-500" : "bg-cyan-500")} />
      <div className={cn("relative flex items-center justify-center w-7 h-7 bg-[#141519] rounded-full border shadow-lg", borderColor)} style={{ boxShadow: `0 0 12px ${shadowColor}` }}>
        {isInspection ? <Compass className={cn("w-3.5 h-3.5", iconColor)} /> : isService ? <Truck className={cn("w-3.5 h-3.5", iconColor)} /> : <BusIcon className={cn("w-3.5 h-3.5", iconColor)} />}
      </div>
    </div>
  );
  return L.divIcon({ html, className: '', iconSize: [32, 32], iconAnchor: [16, 16] });
};

export function FleetPage() {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [summary, setSummary] = useState<FleetSummary | null>(null);
  const [sessions, setSessions] = useState<InspectionSession[]>([]);
  const [coverageData, setCoverageData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBus, setSelectedBus] = useState<Bus | null>(null);
  const [activeTab, setActiveTab] = useState<'vehicles' | 'sessions' | 'coverage'>('vehicles');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'bus' | 'inspection_vehicle' | 'service_vehicle'>('ALL');
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [bRes, rRes, sumRes, sessRes, covRes] = await Promise.allSettled([
        api.getBuses(),
        api.getRoutes(),
        api.getFleetSummary ? api.getFleetSummary() : Promise.resolve(null),
        api.getFleetSessions ? api.getFleetSessions({ limit: 15 }) : Promise.resolve([]),
        api.getNetworkCoverage ? api.getNetworkCoverage() : Promise.resolve(null),
      ]);

      if (bRes.status === 'fulfilled') setBuses(bRes.value);
      if (rRes.status === 'fulfilled') setRoutes(rRes.value);
      if (sumRes.status === 'fulfilled' && sumRes.value) setSummary(sumRes.value);
      if (sessRes.status === 'fulfilled') setSessions(sessRes.value || []);
      if (covRes.status === 'fulfilled' && covRes.value) setCoverageData(covRes.value);
    } catch (err) {
      console.error('Failed to load fleet intelligence:', err);
      setError('Failed to load distributed sensing fleet data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) return <LoadingState message="Connecting to distributed sensing network registry..." className="h-full" />;

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

  // Filter vehicles
  const filteredBuses = buses.filter(b => {
    if (typeFilter === 'ALL') return true;
    const vType = b.vehicleType || b.vehicle_type || 'bus';
    return vType === typeFilter;
  });

  return (
    <div className="space-y-6 pb-12 p-6 max-w-[1600px] mx-auto text-white">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Distributed Sensing Fleet Command</h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              PHASE 9
            </span>
          </div>
          <p className="text-xs text-on-surface-variant/70 font-mono mt-1">
            Real-world road inspection operations via transit buses, PWD survey rigs, and municipal utility vehicles.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-xs font-mono text-white border border-white/[0.1] transition-all flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
            <span>Refresh Fleet</span>
          </button>
        </div>
      </div>

      {/* Top Operational KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Vehicles Breakdown */}
        <div className="p-4 rounded-2xl bg-[#141519] border border-white/[0.08] shadow-xl space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-on-surface-variant/70">
            <span className="uppercase tracking-wider">Active Fleet Nodes</span>
            <BusIcon className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-white">
              {summary?.active_vehicles ?? buses.filter(b => b.status === 'active').length}
            </span>
            <span className="text-xs text-on-surface-variant/60 font-mono">
              / {summary?.total_vehicles ?? buses.length} units
            </span>
          </div>
          <div className="pt-2 border-t border-white/[0.05] flex items-center justify-between text-[10px] font-mono text-on-surface-variant/70">
            <span>{summary?.vehicle_breakdown?.public_buses ?? buses.length} Buses</span>
            <span>•</span>
            <span>{summary?.vehicle_breakdown?.pwd_inspection_vehicles ?? 2} PWD Rigs</span>
            <span>•</span>
            <span>{summary?.vehicle_breakdown?.municipal_service_trucks ?? 1} Service</span>
          </div>
        </div>

        {/* KPI 2: Multi-Camera Health */}
        <div className="p-4 rounded-2xl bg-[#141519] border border-white/[0.08] shadow-xl space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-on-surface-variant/70">
            <span className="uppercase tracking-wider">Multi-Camera Rigs</span>
            <Camera className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-400">
              {summary?.active_cameras ?? 7} Active
            </span>
            <span className="text-xs text-on-surface-variant/60 font-mono">
              ({summary?.calibrated_cameras ?? 7} Calibrated)
            </span>
          </div>
          <div className="pt-2 border-t border-white/[0.05] flex items-center justify-between text-[10px] font-mono text-on-surface-variant/70">
            <span>Windshield FWD</span>
            <span>•</span>
            <span>Bumper Down</span>
            <span>•</span>
            <span>Roof Angle</span>
          </div>
        </div>

        {/* KPI 3: Sensed Distance & Provenance */}
        <div className="p-4 rounded-2xl bg-[#141519] border border-white/[0.08] shadow-xl space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-on-surface-variant/70">
            <span className="uppercase tracking-wider">Survey Volume</span>
            <Activity className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-white">
              {summary?.total_survey_km ? `${summary.total_survey_km.toLocaleString()} km` : '288,092 km'}
            </span>
          </div>
          <div className="pt-2 border-t border-white/[0.05] flex items-center justify-between text-[10px] font-mono">
            <span className="text-cyan-400">Provenance:</span>
            <span className="text-white/80">REPLAY + SIMULATED</span>
          </div>
        </div>

        {/* KPI 4: Municipal Corridor Coverage */}
        <div className="p-4 rounded-2xl bg-[#141519] border border-white/[0.08] shadow-xl space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-on-surface-variant/70">
            <span className="uppercase tracking-wider">Corridor Coverage</span>
            <Compass className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-amber-400">
              {summary?.coverage?.coverage_rate_pct ?? 14.3}%
            </span>
            <span className="text-xs text-on-surface-variant/60 font-mono">
              ({summary?.coverage?.sensed_corridors ?? 4}/{summary?.coverage?.total_corridors ?? 28} corridors)
            </span>
          </div>
          <div className="pt-2 border-t border-white/[0.05] flex items-center justify-between text-[10px] font-mono text-on-surface-variant/70">
            <span className="text-rose-400 font-bold">{summary?.coverage?.coverage_gaps ?? 24} Blind Spots (&gt;7d)</span>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-1">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('vehicles')}
            className={cn(
              "px-4 py-2 text-xs font-mono font-bold rounded-xl transition-all flex items-center gap-2",
              activeTab === 'vehicles'
                ? "bg-white/[0.08] text-white border border-white/[0.1] shadow-lg"
                : "text-on-surface-variant/60 hover:text-white hover:bg-white/[0.03]"
            )}
          >
            <BusIcon className="w-3.5 h-3.5 text-cyan-400" />
            <span>Sensing Vehicles ({buses.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('sessions')}
            className={cn(
              "px-4 py-2 text-xs font-mono font-bold rounded-xl transition-all flex items-center gap-2",
              activeTab === 'sessions'
                ? "bg-white/[0.08] text-white border border-white/[0.1] shadow-lg"
                : "text-on-surface-variant/60 hover:text-white hover:bg-white/[0.03]"
            )}
          >
            <History className="w-3.5 h-3.5 text-purple-400" />
            <span>Inspection Sessions ({sessions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('coverage')}
            className={cn(
              "px-4 py-2 text-xs font-mono font-bold rounded-xl transition-all flex items-center gap-2",
              activeTab === 'coverage'
                ? "bg-white/[0.08] text-white border border-white/[0.1] shadow-lg"
                : "text-on-surface-variant/60 hover:text-white hover:bg-white/[0.03]"
            )}
          >
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>Coverage Intelligence ({coverageData?.corridors?.length || 28})</span>
          </button>
        </div>

        {activeTab === 'vehicles' && (
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/[0.05]">
            {(['ALL', 'bus', 'inspection_vehicle', 'service_vehicle'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[10px] font-mono transition-all",
                  typeFilter === t
                    ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30"
                    : "text-on-surface-variant/60 hover:text-white"
                )}
              >
                {t === 'ALL' ? 'All Types' : t === 'bus' ? 'Transit Buses' : t === 'inspection_vehicle' ? 'PWD Survey' : 'Service Trucks'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── TAB 1: SENSING VEHICLES ───────────────────────────── */}
      {activeTab === 'vehicles' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Columns: Vehicles Grid */}
          <div className="lg:col-span-2 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredBuses.map((bus) => {
                const vType = bus.vehicleType || bus.vehicle_type || 'bus';
                const isSelected = selectedBus?.id === bus.id;

                const typeBadge = 
                  vType === 'inspection_vehicle' ? { label: 'PWD Survey Rig', color: 'bg-purple-500/10 text-purple-400 border-purple-500/30' } :
                  vType === 'service_vehicle' ? { label: 'Service Truck', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' } :
                  { label: 'Transit Bus', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' };

                return (
                  <div
                    key={bus.id}
                    onClick={() => setSelectedBus(bus)}
                    className={cn(
                      "p-4 rounded-2xl border transition-all cursor-pointer relative",
                      isSelected
                        ? "bg-white/[0.08] border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.15)]"
                        : "bg-[#141519] border-white/[0.06] hover:border-white/[0.15] hover:bg-white/[0.03]"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn("px-2 py-0.5 rounded text-[9px] font-mono font-bold border", typeBadge.color)}>
                            {typeBadge.label}
                          </span>
                          <span className={cn(
                            "px-1.5 py-0.5 rounded text-[9px] font-mono font-bold",
                            bus.status === 'active' ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-800 text-zinc-400"
                          )}>
                            {bus.status.toUpperCase()}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-white font-mono">{bus.registrationNumber}</h3>
                        <p className="text-[11px] text-on-surface-variant/70 truncate max-w-[240px]">
                          {bus.makeModel || bus.make_model || 'Standard Unit'}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-mono text-on-surface-variant/50 block">ODOMETER</span>
                        <span className="text-xs font-mono font-bold text-white">
                          {(bus.totalDistanceKm || bus.total_distance_km || 0).toLocaleString()} km
                        </span>
                      </div>
                    </div>

                    {/* Camera Mounts Preview */}
                    <div className="mt-3 pt-3 border-t border-white/[0.05] flex items-center justify-between text-[11px] font-mono">
                      <div className="flex items-center gap-1.5 text-on-surface-variant/70">
                        <Camera className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{bus.cameraCount || bus.cameras?.length || 1} Optical Rig</span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/40 text-on-surface-variant/80 border border-white/[0.05]">
                        {bus.telemetryMode || bus.telemetry_mode || 'SIMULATED'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Mini Map & Vehicle Context */}
          <div className="space-y-4">
            <GlassPanel className="h-[420px] p-0 overflow-hidden relative rounded-2xl border border-white/[0.08]">
              <MapContainer 
                center={[28.6139, 77.2090]} 
                zoom={11} 
                attributionControl={false} 
                className="w-full h-full"
                zoomControl={false}
              >
                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                {routes.map((route, idx) => {
                  if (!route.waypoints || !Array.isArray(route.waypoints)) return null;
                  const validWaypoints = route.waypoints.map(wp => getValidLatLng(wp)).filter((pos): pos is [number, number] => pos !== null);
                  if (validWaypoints.length < 2) return null;
                  return <Polyline key={route.id || idx} positions={validWaypoints} pathOptions={{ color: '#06b6d4', weight: 2, opacity: 0.3 }} />;
                })}

                {buses.map(bus => {
                  const pos = getValidLatLng(bus);
                  if (!pos) return null;
                  return (
                    <Marker 
                      key={bus.id} 
                      position={pos} 
                      icon={createBusMarkerIcon(bus.id, bus.vehicleType || bus.vehicle_type)}
                      eventHandlers={{ click: () => setSelectedBus(bus) }}
                    />
                  );
                })}

                <FleetMapBounds routes={routes} buses={buses} />
              </MapContainer>
            </GlassPanel>

            <SensorPipeline />
          </div>
        </div>
      )}

      {/* ── TAB 2: INSPECTION SESSIONS ─────────────────────────── */}
      {activeTab === 'sessions' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-[#141519] border border-white/[0.08] shadow-xl overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-white/[0.08] text-on-surface-variant/60 uppercase tracking-wider text-[10px]">
                  <th className="pb-3 px-3">Session ID</th>
                  <th className="pb-3 px-3">Vehicle</th>
                  <th className="pb-3 px-3">Type</th>
                  <th className="pb-3 px-3">Camera Mount</th>
                  <th className="pb-3 px-3">Started</th>
                  <th className="pb-3 px-3">Distance</th>
                  <th className="pb-3 px-3">Frames</th>
                  <th className="pb-3 px-3">Potholes Detected</th>
                  <th className="pb-3 px-3">Telemetry Provenance</th>
                  <th className="pb-3 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {sessions.map((sess) => {
                  const provColor = 
                    sess.telemetry_provenance === 'LIVE' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                    sess.telemetry_provenance === 'REPLAY' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' :
                    sess.telemetry_provenance === 'SIMULATED' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' :
                    'bg-amber-500/10 text-amber-400 border-amber-500/30';

                  return (
                    <tr key={sess.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-3 font-bold text-white">{sess.id}</td>
                      <td className="py-3 px-3 text-cyan-300">{sess.vehicle_registration || sess.vehicle_id}</td>
                      <td className="py-3 px-3 capitalize text-on-surface-variant/80">{sess.vehicle_type?.replace('_', ' ') || 'bus'}</td>
                      <td className="py-3 px-3 text-on-surface-variant/70">{sess.camera_id || 'cam_fwd'}</td>
                      <td className="py-3 px-3 text-on-surface-variant/70">{sess.started_at ? new Date(sess.started_at).toLocaleTimeString() : 'N/A'}</td>
                      <td className="py-3 px-3 text-white font-bold">{sess.distance_sensed_km} km</td>
                      <td className="py-3 px-3 text-on-surface-variant/80">{sess.frames_analyzed?.toLocaleString()}</td>
                      <td className="py-3 px-3 font-bold text-amber-400">{sess.potholes_detected}</td>
                      <td className="py-3 px-3">
                        <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold border", provColor)}>
                          {sess.telemetry_provenance}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold",
                          sess.status === 'active' ? "bg-emerald-500/20 text-emerald-400 animate-pulse" : "bg-zinc-800 text-zinc-400"
                        )}>
                          {sess.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 3: COVERAGE INTELLIGENCE ───────────────────────── */}
      {activeTab === 'coverage' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-[#141519] border border-white/[0.08] shadow-xl overflow-x-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white">Municipal Network Coverage &amp; Sensing Recency</h3>
                <p className="text-[11px] text-on-surface-variant/70 font-mono">
                  Identifies corridors requiring distributed bus / inspection vehicle passes (&gt;7 day threshold).
                </p>
              </div>
              <span className="text-xs font-mono text-amber-400">
                Blind Spot Threshold: 7 Days
              </span>
            </div>

            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-white/[0.08] text-on-surface-variant/60 uppercase tracking-wider text-[10px]">
                  <th className="pb-3 px-3">Corridor ID</th>
                  <th className="pb-3 px-3">Corridor Name</th>
                  <th className="pb-3 px-3">Road Class</th>
                  <th className="pb-3 px-3">Operational Road Health</th>
                  <th className="pb-3 px-3">Coverage Status</th>
                  <th className="pb-3 px-3">Last Sensed Pass</th>
                  <th className="pb-3 px-3">Recency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {(coverageData?.corridors || []).map((corridor: any) => {
                  const statusColor = 
                    corridor.coverage_status === 'RECENT' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                    corridor.coverage_status === 'ACCEPTABLE' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                    'bg-rose-500/10 text-rose-400 border-rose-500/30';

                  return (
                    <tr key={corridor.segment_id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-3 font-bold text-white">{corridor.segment_id}</td>
                      <td className="py-3 px-3 text-cyan-300 font-medium">{corridor.segment_name}</td>
                      <td className="py-3 px-3 capitalize text-on-surface-variant/80">{corridor.road_class}</td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-white">{corridor.health_score} / 100</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold border", statusColor)}>
                          {corridor.coverage_status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-on-surface-variant/70">
                        {corridor.last_sensed_at ? new Date(corridor.last_sensed_at).toLocaleDateString() : 'Never Sensed'}
                      </td>
                      <td className="py-3 px-3 text-on-surface-variant/80">
                        {corridor.days_since_last_pass != null ? `${corridor.days_since_last_pass} days ago` : 'Blind Spot'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── VEHICLE DETAIL DRAWER ──────────────────────────────── */}
      <AnimatePresence>
        {selectedBus && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[400] bg-black/50 backdrop-blur-sm"
              onClick={() => setSelectedBus(null)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full sm:w-[500px] z-[500] bg-[#141519] border-l border-white/[0.08] shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-white/[0.08] flex items-start justify-between bg-white/[0.02]">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                      {selectedBus.vehicleType || selectedBus.vehicle_type || 'bus'}
                    </span>
                    <span className="text-[10px] text-on-surface-variant/70 font-mono tracking-widest">{selectedBus.id}</span>
                  </div>
                  <h2 className="text-xl font-bold text-white font-mono">{selectedBus.registrationNumber}</h2>
                  <p className="text-xs text-on-surface-variant/70 font-mono mt-0.5">
                    {selectedBus.makeModel || selectedBus.make_model || 'Transit Unit'}
                  </p>
                </div>
                <button onClick={() => setSelectedBus(null)} className="p-2 text-on-surface-variant/70 hover:text-white rounded-lg hover:bg-white/[0.05]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Telemetry Disclosure */}
                <div className="p-4 rounded-xl border border-white/[0.08] bg-black/40 space-y-3">
                  <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                    <Wifi className="w-4 h-4 text-cyan-400" /> Sensing Provenance Disclosure
                  </h3>
                  <div className="text-xs space-y-2 font-mono">
                    <div className="flex justify-between py-1 border-b border-white/[0.05]">
                      <span className="text-on-surface-variant/70">Ingestion Mode:</span>
                      <span className="text-cyan-400 font-bold">{selectedBus.telemetryMode || selectedBus.telemetry_mode || 'SIMULATED'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-white/[0.05]">
                      <span className="text-on-surface-variant/70">Operator Agency:</span>
                      <span className="text-white">{selectedBus.operator || 'Delhi PWD / DTC'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-white/[0.05]">
                      <span className="text-on-surface-variant/70">Total Sensed Distance:</span>
                      <span className="text-white font-bold">{(selectedBus.totalDistanceKm || selectedBus.total_distance_km || 0).toLocaleString()} km</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-on-surface-variant/70">Edge AI Detector:</span>
                      <span className="text-emerald-400 font-bold">YOLOv8 Single-Class (best.pt)</span>
                    </div>
                  </div>
                </div>

                {/* Multi-Camera Rig Specifications */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                    <Camera className="w-4 h-4 text-emerald-400" /> Mounted Optical Cameras ({selectedBus.cameras?.length || 1})
                  </h3>

                  <div className="space-y-2">
                    {(selectedBus.cameras && selectedBus.cameras.length > 0 ? selectedBus.cameras : [
                      {
                        id: 'cam_fwd',
                        mountPosition: 'windshield_center',
                        orientation: 'forward',
                        resolution: '1080p',
                        fps: 30,
                        status: 'active',
                        calibrationStatus: 'calibrated'
                      }
                    ]).map((cam) => (
                      <div key={cam.id} className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-white">{cam.id}</span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            {cam.calibrationStatus || 'calibrated'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-on-surface-variant/70">
                          <div>Mount: <span className="text-white capitalize">{cam.mountPosition?.replace('_', ' ')}</span></div>
                          <div>Orientation: <span className="text-white capitalize">{cam.orientation?.replace('_', ' ')}</span></div>
                          <div>Resolution: <span className="text-white">{cam.resolution} @ {cam.fps}fps</span></div>
                          <div>Status: <span className="text-emerald-400 uppercase">{cam.status}</span></div>
                        </div>
                      </div>
                    ))}
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
