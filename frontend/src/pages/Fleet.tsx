// ============================================================
// Fleet Page — Mobile Sensing Fleet Command
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
import { MapContainer, TileLayer, Polyline, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { GlassPanel, LoadingState, EmptyState } from '@/components/ui';
import { api } from '@/services/api';
import { cn, timeAgo } from '@/lib/utils';
import type { Bus, Route } from '@/types';
import { renderToString } from 'react-dom/server';

// ── Sensor Pipeline Visualization ───────────────────────────

function SensorPipeline() {
  const nodes = [
    { label: 'Camera', icon: Camera, color: 'text-blue-400', bg: 'bg-blue-400' },
    { label: 'Edge AI', icon: Cpu, color: 'text-accent-secondary', bg: 'bg-accent-secondary' },
    { label: 'Local Buffer', icon: HardDrive, color: 'text-purple-400', bg: 'bg-purple-400' },
    { label: 'Cloud Gateway', icon: Cloud, color: 'text-emerald-400', bg: 'bg-emerald-400' },
    { label: 'PostGIS DB', icon: Database, color: 'text-white', bg: 'bg-white' },
  ];

  return (
    <GlassPanel className="relative overflow-hidden mt-6">
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20 pointer-events-none" />
      <div className="flex items-center justify-between mb-8 relative z-10">
        <div>
          <h3 className="text-sm font-bold text-white/90 uppercase tracking-widest flex items-center gap-2">
            <Zap className="w-4 h-4 text-accent-secondary" /> Live Sensor Pipeline
          </h3>
          <p className="text-[11px] text-white/40 mt-1">Data architecture from physical edge to spatial database.</p>
        </div>
        <div className="px-2 py-0.5 rounded border border-accent-secondary/30 bg-accent-secondary/10 text-accent-secondary text-[10px] font-bold uppercase animate-pulse">
          Live Stream
        </div>
      </div>

      <div className="relative flex justify-between items-center py-4 px-2 sm:px-6 z-10">
        {/* Track Line */}
        <div className="absolute left-[10%] right-[10%] top-1/2 h-0.5 bg-white/[0.05] -translate-y-1/2" />
        
        {/* Animated Data Packets */}
        <div className="absolute left-[10%] right-[10%] top-1/2 -translate-y-1/2 pointer-events-none overflow-hidden h-4">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-accent-secondary shadow-[0_0_8px_rgba(6,182,212,0.8)] top-1"
              initial={{ left: '0%', opacity: 0 }}
              animate={{ 
                left: ['0%', '20%', '25%', '45%', '50%', '70%', '75%', '100%'],
                opacity: [0, 1, 1, 1, 1, 1, 1, 0]
              }}
              transition={{ 
                duration: 4, 
                repeat: Infinity, 
                ease: "linear",
                delay: i * 1.3
              }}
            />
          ))}
        </div>

        {nodes.map((node, i) => (
          <div key={node.label} className="relative flex flex-col items-center gap-3 z-10 bg-[#09090b] px-2">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border border-white/[0.1] bg-surface-raised shadow-xl", node.color)}>
              <node.icon className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">{node.label}</span>
          </div>
        ))}
      </div>
    </GlassPanel>
  );
}

// ── Mini Map ────────────────────────────────────────────────
function FleetMapBounds({ routes }: { routes: Route[] }) {
  const map = useMap();
  useEffect(() => {
    if (!routes.length) return;
    const bounds = L.latLngBounds([]);
    routes.forEach(r => r.waypoints.forEach(wp => bounds.extend([wp.lat, wp.lng])));
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [20, 20] });
  }, [routes, map]);
  return null;
}

// ── Main Page ───────────────────────────────────────────────

export function FleetPage() {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBus, setSelectedBus] = useState<Bus | null>(null);

  // Offline Simulation State
  const [simState, setSimState] = useState<0|1|2|3>(0);

  useEffect(() => {
    Promise.all([api.getBuses(), api.getRoutes()]).then(([b, r]) => {
      // Force one bus to be offline for the demo
      if (b.length > 0) {
        b[0].status = 'offline';
        b[0].id = 'BUS-042 (Edge Demo)';
      }
      setBuses(b);
      setRoutes(r);
      setLoading(false);
    });
  }, []);

  // Handle simulation trigger
  useEffect(() => {
    if (simState === 1) { // Network restored
      const t = setTimeout(() => setSimState(2), 1500); // Start syncing
      return () => clearTimeout(t);
    }
    if (simState === 2) { // Syncing
      const t = setTimeout(() => setSimState(3), 3000); // Complete
      return () => clearTimeout(t);
    }
  }, [simState]);

  if (loading) return <LoadingState message="Connecting to fleet network..." className="h-full" />;

  const activeBuses = buses.filter(b => b.status === 'active').length;
  const offlineBuses = buses.filter(b => b.status === 'offline').length;
  const totalObs = buses.reduce((acc, b) => acc + b.detectionsToday, 0);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1920px] mx-auto h-[calc(100vh-3.5rem)] flex flex-col relative overflow-hidden">
      
      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-white/95 tracking-tight">
            Mobile Sensing Fleet
          </h1>
          <p className="text-sm text-white/40 mt-1 font-medium">Real-time health and coverage of the urban sensing network.</p>
        </div>
        
        <div className="flex gap-2 sm:gap-4 overflow-x-auto pb-2 sm:pb-0 scrollbar-none">
          {[
            { label: 'Total Fleet', value: buses.length, color: 'text-white/90' },
            { label: 'Active', value: activeBuses, color: 'text-cyan-400' },
            { label: 'Offline', value: offlineBuses, color: 'text-red-400' },
            { label: 'Coverage', value: '78%', color: 'text-purple-400' },
            { label: 'Obs. Today', value: totalObs, color: 'text-emerald-400' },
          ].map(stat => (
            <div key={stat.label} className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-2 flex flex-col min-w-[100px]">
              <span className="text-[10px] uppercase font-bold tracking-widest text-white/40">{stat.label}</span>
              <span className={cn("text-xl font-bold mt-1", stat.color)}>{stat.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main Content Grid ─────────────────────────────── */}
      <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-12 gap-6 overflow-y-auto scrollbar-none pb-10">
        
        {/* Left: Bus Grid */}
        <div className="xl:col-span-7 space-y-4">
          <h3 className="text-xs font-bold text-white/70 uppercase tracking-widest px-1">Network Nodes</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {buses.length === 0 ? (
              <div className="col-span-full">
                <EmptyState 
                  title="No Active Nodes" 
                  description="There are currently no buses connected to the spatial sensing network."
                  icon={BusIcon}
                />
              </div>
            ) : (
              buses.map((bus, idx) => {
                const isOffline = bus.status === 'offline';
                return (
                <motion.div
                  key={bus.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => {
                    setSelectedBus(bus);
                    if (isOffline) setSimState(0);
                  }}
                  className={cn(
                    "relative overflow-hidden rounded-xl border p-4 cursor-pointer transition-all duration-200 group",
                    isOffline 
                      ? "bg-red-500/[0.02] border-red-500/10 hover:border-red-500/30" 
                      : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.08]"
                  )}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <BusIcon className={cn("w-4 h-4", isOffline ? "text-red-400" : "text-cyan-400")} />
                        <span className="font-mono font-bold text-white/90">{bus.id}</span>
                      </div>
                      <div className="text-[10px] uppercase tracking-widest text-white/40">Route {bus.routeId || 'Unassigned'}</div>
                    </div>
                    <div className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5",
                      isOffline ? "bg-red-500/20 text-red-400" : "bg-cyan-500/20 text-cyan-400"
                    )}>
                      {!isOffline && <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />}
                      {isOffline ? 'OFFLINE' : 'LIVE'}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <div className="flex items-center gap-2 text-xs">
                      <Signal className={cn("w-3.5 h-3.5", isOffline ? "text-red-400" : "text-emerald-400")} />
                      <span className="text-white/70">{isOffline ? 'Disconnected' : 'Connected'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Camera className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-white/70">Healthy</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Cpu className="w-3.5 h-3.5 text-accent-secondary" />
                      <span className="text-white/70 font-mono">AI: RUNNING</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Activity className="w-3.5 h-3.5 text-purple-400" />
                      <span className="text-white/70">{bus.detectionsToday} Obs.</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-white/[0.04] flex items-center justify-between text-[10px] text-white/40 font-mono">
                    <span>Sync: {isOffline ? 'Failed 2h ago' : '12 sec ago'}</span>
                    <span>v2.1.4</span>
                  </div>
                </motion.div>
              );
            }))}
          </div>
        </div>

        {/* Right: Map & Architecture */}
        <div className="xl:col-span-5 flex flex-col gap-6">
          
          <SensorPipeline />

          <GlassPanel padding="none" className="flex-1 min-h-[300px] flex flex-col overflow-hidden relative">
            <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
              <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/[0.1] pointer-events-auto">
                <h3 className="text-xs font-bold text-white/90 uppercase tracking-widest flex items-center gap-2">
                  <MapIcon className="w-4 h-4 text-purple-400" /> Route Coverage
                </h3>
              </div>
              <div className="flex flex-col gap-1 items-end pointer-events-auto">
                <div className="bg-black/60 backdrop-blur-md px-2 py-1 rounded border border-white/[0.1] text-[10px] font-bold uppercase tracking-widest text-purple-400 flex items-center gap-1.5">
                  <div className="w-3 h-0.5 bg-purple-500" /> Observed
                </div>
                <div className="bg-black/60 backdrop-blur-md px-2 py-1 rounded border border-white/[0.1] text-[10px] font-bold uppercase tracking-widest text-white/40 flex items-center gap-1.5">
                  <div className="w-3 h-0.5 bg-white/30 border-t border-dashed" /> Unobserved
                </div>
              </div>
            </div>

            <MapContainer center={[28.6139, 77.2090]} zoom={12} className="w-full h-full z-0 outline-none bg-[#09090b]" zoomControl={false}>
              <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png" />
              {routes.map((route, i) => (
                <Polyline 
                  key={route.id} 
                  positions={route.waypoints.map(wp => [wp.lat, wp.lng])} 
                  pathOptions={{ 
                    color: i % 2 === 0 ? '#a855f7' : '#ffffff', 
                    weight: 3, 
                    opacity: i % 2 === 0 ? 0.8 : 0.3,
                    dashArray: i % 2 === 0 ? undefined : '10, 10'
                  }} 
                />
              ))}
              <FleetMapBounds routes={routes} />
            </MapContainer>
          </GlassPanel>

        </div>
      </div>

      {/* ── Bus Detail Drawer ──────────────────────────────── */}
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
              className="absolute right-0 top-0 bottom-0 w-full sm:w-[480px] z-[500] bg-[#0f0f12] border-l border-white/[0.08] shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-white/[0.06] flex items-start justify-between bg-white/[0.02]">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest",
                      selectedBus.status === 'offline' ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                    )}>
                      {selectedBus.status === 'offline' ? 'OFFLINE' : 'LIVE'}
                    </span>
                    <span className="text-[10px] text-white/40 font-mono tracking-widest">{selectedBus.id}</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white/95">Route {selectedBus.routeId || 'Unassigned'} Node</h2>
                </div>
                <button onClick={() => setSelectedBus(null)} className="p-2 text-white/40 hover:text-white rounded-lg hover:bg-white/[0.05]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto scrollbar-none p-6 space-y-8">
                
                {/* Offline-First Simulation Panel */}
                {selectedBus.status === 'offline' ? (
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-white/70 uppercase tracking-widest flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-purple-400" /> Offline-First Architecture
                    </h3>
                    
                    <div className="rounded-xl border border-white/[0.08] bg-[#09090b] overflow-hidden">
                      <div className="grid grid-cols-3 divide-x divide-white/[0.08] border-b border-white/[0.08]">
                        
                        <div className="p-4 flex flex-col items-center justify-center text-center">
                          <Cpu className="w-5 h-5 text-accent-secondary mb-2" />
                          <span className="text-[9px] uppercase font-bold text-white/40 tracking-widest mb-1">Edge AI</span>
                          <span className="text-xs font-bold text-white/90 font-mono">RUNNING</span>
                        </div>
                        
                        <div className="p-4 flex flex-col items-center justify-center text-center relative overflow-hidden">
                          {simState === 2 && (
                            <motion.div 
                              className="absolute inset-0 bg-purple-500/20" 
                              animate={{ opacity: [0, 1, 0] }} 
                              transition={{ repeat: Infinity, duration: 1 }} 
                            />
                          )}
                          <HardDrive className="w-5 h-5 text-purple-400 mb-2" />
                          <span className="text-[9px] uppercase font-bold text-white/40 tracking-widest mb-1">Local Buffer</span>
                          <span className="text-xs font-bold text-white/90 font-mono">
                            {simState === 3 ? '0 EVENTS' : '17 EVENTS'}
                          </span>
                        </div>
                        
                        <div className="p-4 flex flex-col items-center justify-center text-center relative overflow-hidden">
                          <motion.div animate={{ color: simState === 0 ? '#ef4444' : '#10b981' }} className="mb-2">
                            {simState === 0 ? <WifiOff className="w-5 h-5" /> : <Wifi className="w-5 h-5" />}
                          </motion.div>
                          <span className="text-[9px] uppercase font-bold text-white/40 tracking-widest mb-1">Network</span>
                          <span className="text-xs font-bold text-white/90 font-mono">
                            {simState === 0 ? 'OFFLINE' : simState === 1 ? 'RESTORED' : simState === 2 ? 'SYNCING' : 'ONLINE'}
                          </span>
                        </div>

                      </div>
                      
                      <div className="p-4 bg-white/[0.02]">
                        {simState === 0 && (
                          <button 
                            onClick={() => setSimState(1)}
                            className="w-full py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-widest rounded-lg transition-colors flex items-center justify-center gap-2"
                          >
                            <RefreshCw className="w-3 h-3" /> Simulate Network Restore
                          </button>
                        )}
                        {simState === 1 && (
                          <div className="w-full py-2 text-center text-emerald-400 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                            Establishing Connection...
                          </div>
                        )}
                        {simState === 2 && (
                          <div className="w-full py-2 text-center text-purple-400 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                            <RefreshCw className="w-3 h-3 animate-spin" /> Uploading buffered events
                          </div>
                        )}
                        {simState === 3 && (
                          <div className="w-full py-2 text-center text-white/50 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                            <CheckCircle className="w-3 h-3 text-emerald-400" /> Buffer Synced
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                      <div className="text-[10px] uppercase font-bold tracking-widest text-white/40 mb-1">Speed</div>
                      <div className="text-xl font-bold font-mono text-white/90">24 <span className="text-sm text-white/40">km/h</span></div>
                    </div>
                    <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                      <div className="text-[10px] uppercase font-bold tracking-widest text-white/40 mb-1">GPS Latency</div>
                      <div className="text-xl font-bold font-mono text-white/90">1.2 <span className="text-sm text-white/40">s</span></div>
                    </div>
                  </div>
                )}

                {/* Recent Detections List */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-white/70 uppercase tracking-widest">Local Node Events</h3>
                  <div className="space-y-3">
                    {[
                      { time: '09:56', type: 'Vehicle density spike', conf: '98%', id: 'EVT-821' },
                      { time: '09:41', type: 'Road crack', conf: '84%', id: 'EVT-820' },
                      { time: '09:32', type: 'Critical Pothole', conf: '94%', id: 'EVT-819' },
                    ].map(evt => (
                      <div key={evt.id} className="p-3 rounded-lg border border-white/[0.04] bg-white/[0.01] flex items-center justify-between group hover:bg-white/[0.03] transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="text-xs font-mono text-white/40 bg-black/40 px-1.5 py-0.5 rounded">{evt.time}</div>
                          <div className="text-sm font-medium text-white/80">{evt.type}</div>
                        </div>
                        <div className="text-[10px] text-accent-secondary font-mono">{evt.conf}</div>
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
