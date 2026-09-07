// ============================================================
// SafeRoutePanel — Risk-Aware Routing Interface
// ============================================================

import React, { useState, useEffect } from 'react';
import { 
  Navigation, 
  ShieldCheck, 
  Zap, 
  Scale, 
  AlertTriangle, 
  Clock, 
  MapPin, 
  ChevronRight, 
  ExternalLink, 
  Info,
  CheckCircle2,
  X,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/services/api';
import type { 
  RoutePreset, 
  SafeRouteResponse, 
  RouteCandidate, 
  SafeRouteMode 
} from '@/types/saferoute';
import type { RoadSegment } from '@/types/road';

interface SafeRoutePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onRoutesCalculated: (result: SafeRouteResponse | null) => void;
  selectedCandidateId: string | null;
  onSelectCandidate: (candidate: RouteCandidate) => void;
  onSelectRoad?: (road: RoadSegment) => void;
}

export function SafeRoutePanel({
  isOpen,
  onClose,
  onRoutesCalculated,
  selectedCandidateId,
  onSelectCandidate,
  onSelectRoad
}: SafeRoutePanelProps) {
  const [presets, setPresets] = useState<RoutePreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('delhi_cp_noida');
  const [origin, setOrigin] = useState<string>('Connaught Place / PWD Delhi HQ');
  const [destination, setDestination] = useState<string>('Noida Sector 62 Tech Hub');
  const [mode, setMode] = useState<SafeRouteMode>('BALANCED');
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<SafeRouteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load presets on mount
  useEffect(() => {
    async function loadPresets() {
      try {
        const data = await api.getSafeRoutePresets();
        if (data && data.length > 0) {
          setPresets(data);
          const first = data[0];
          setSelectedPresetId(first.id);
          setOrigin(first.origin);
          setDestination(first.destination);
        }
      } catch (err) {
        console.warn('Failed to load presets:', err);
      }
    }
    loadPresets();
  }, []);

  // Handle Preset Change
  const handlePresetSelect = (presetId: string) => {
    setSelectedPresetId(presetId);
    const found = presets.find(p => p.id === presetId);
    if (found) {
      setOrigin(found.origin);
      setDestination(found.destination);
      // Trigger plan automatically
      triggerPlan(found.origin, found.destination, mode, found.corridor_set, found.origin_coords, found.destination_coords);
    }
  };

  // Plan Route
  const triggerPlan = async (
    origStr: string,
    destStr: string,
    currentMode: SafeRouteMode,
    corridorSet: string = 'delhi_ncr',
    origCoords?: { lat: number; lng: number },
    destCoords?: { lat: number; lng: number }
  ) => {
    setLoading(true);
    setError(null);
    try {
      const activePreset = presets.find(p => p.id === selectedPresetId);
      const res = await api.planSafeRoute({
        origin: origStr,
        destination: destStr,
        mode: currentMode,
        corridor_set: activePreset?.corridor_set || corridorSet,
        origin_coords: origCoords || activePreset?.origin_coords,
        destination_coords: destCoords || activePreset?.destination_coords,
      });

      setResult(res);
      onRoutesCalculated(res);

      // Auto-select recommended candidate
      const rec = res.candidates.find(c => c.id === res.recommended_route_id) || res.candidates[0];
      if (rec) {
        onSelectCandidate(rec);
      }
    } catch (err: any) {
      console.error('SafeRoute planning failed:', err);
      setError(err?.message || 'Failed to calculate safe routes. Please verify corridor coverage.');
      onRoutesCalculated(null);
    } finally {
      setLoading(false);
    }
  };

  // Auto-calculate on initial load once presets are ready
  useEffect(() => {
    if (presets.length > 0 && !result && isOpen) {
      const first = presets[0];
      triggerPlan(first.origin, first.destination, mode, first.corridor_set, first.origin_coords, first.destination_coords);
    }
  }, [presets, isOpen]);

  // Mode Change
  const handleModeChange = (newMode: SafeRouteMode) => {
    setMode(newMode);
    triggerPlan(origin, destination, newMode);
  };

  if (!isOpen) return null;

  const activeCandidate = result?.candidates.find(c => c.id === selectedCandidateId) 
    || result?.candidates.find(c => c.id === result.recommended_route_id)
    || result?.candidates[0];

  return (
    <div className="absolute top-16 left-[20rem] z-[450] w-96 max-h-[calc(100vh-5rem)] overflow-y-auto bg-[#141519]/95 backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-2xl flex flex-col pointer-events-auto transition-all text-white">
      {/* Header */}
      <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
            <Navigation className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-wide">SafeRoute Engine</h2>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                PHASE 8
              </span>
            </div>
            <p className="text-[11px] text-on-surface-variant/70">Risk-Aware Route Recommendation</p>
          </div>
        </div>

        <button 
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-white/[0.06] text-on-surface-variant/70 hover:text-white transition-colors"
          title="Close SafeRoute Panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body Content */}
      <div className="p-4 space-y-4">
        {/* Preset Selector */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-mono text-on-surface-variant/70 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            Showcase Corridor Presets
          </label>
          <select
            value={selectedPresetId}
            onChange={(e) => handlePresetSelect(e.target.value)}
            className="w-full bg-[#1b1d24] border border-white/[0.1] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 transition-colors cursor-pointer"
          >
            {presets.map(p => (
              <option key={p.id} value={p.id} className="bg-[#1b1d24] text-white">
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Origin & Destination Display */}
        <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.05] space-y-2">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-on-surface-variant/70 text-[11px] font-mono w-14">Origin:</span>
            <span className="text-white font-medium truncate">{origin}</span>
          </div>
          <div className="h-px bg-white/[0.05] ml-4" />
          <div className="flex items-center gap-2 text-xs">
            <div className="w-2 h-2 rounded-full bg-rose-400" />
            <span className="text-on-surface-variant/70 text-[11px] font-mono w-14">Destination:</span>
            <span className="text-white font-medium truncate">{destination}</span>
          </div>
        </div>

        {/* Decision Mode Toggle */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-mono text-on-surface-variant/70 uppercase tracking-wider">
            Decision Objective
          </label>
          <div className="grid grid-cols-3 gap-1.5 bg-black/40 p-1 rounded-xl border border-white/[0.05]">
            <button
              onClick={() => handleModeChange('FASTEST')}
              className={cn(
                "flex flex-col items-center py-2 px-1 rounded-lg text-xs font-medium transition-all",
                mode === 'FASTEST'
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                  : "text-on-surface-variant/60 hover:text-white hover:bg-white/[0.04]"
              )}
            >
              <Zap className="w-3.5 h-3.5 mb-1 text-amber-400" />
              <span className="text-[11px] font-bold">FASTEST</span>
              <span className="text-[9px] text-on-surface-variant/60">Min Time</span>
            </button>

            <button
              onClick={() => handleModeChange('SAFEST')}
              className={cn(
                "flex flex-col items-center py-2 px-1 rounded-lg text-xs font-medium transition-all",
                mode === 'SAFEST'
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                  : "text-on-surface-variant/60 hover:text-white hover:bg-white/[0.04]"
              )}
            >
              <ShieldCheck className="w-3.5 h-3.5 mb-1 text-emerald-400" />
              <span className="text-[11px] font-bold">SAFEST</span>
              <span className="text-[9px] text-on-surface-variant/60">Min Risk</span>
            </button>

            <button
              onClick={() => handleModeChange('BALANCED')}
              className={cn(
                "flex flex-col items-center py-2 px-1 rounded-lg text-xs font-medium transition-all",
                mode === 'BALANCED'
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                  : "text-on-surface-variant/60 hover:text-white hover:bg-white/[0.04]"
              )}
            >
              <Scale className="w-3.5 h-3.5 mb-1 text-cyan-400" />
              <span className="text-[11px] font-bold">BALANCED</span>
              <span className="text-[9px] text-on-surface-variant/60">Pareto Trade-off</span>
            </button>
          </div>
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div className="p-6 text-center text-xs font-mono text-cyan-400 flex items-center justify-center gap-2">
            <span className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            <span>Evaluating corridor infrastructure risk...</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Route Candidates Comparison */}
        {!loading && result && result.candidates.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-on-surface-variant/70 uppercase tracking-wider">
                Candidates Evaluated ({result.candidates.length})
              </span>
              <span className="text-[10px] font-mono text-cyan-400/80">
                Mode: {result.mode}
              </span>
            </div>

            <div className="space-y-2">
              {result.candidates.map((cand) => {
                const isSelected = cand.id === activeCandidate?.id;
                const isRecommended = cand.is_recommended;

                const riskBadgeColor = 
                  cand.risk_level === 'LOW' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                  cand.risk_level === 'MODERATE' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                  cand.risk_level === 'ELEVATED' ? 'bg-orange-500/10 text-orange-400 border-orange-500/30' :
                  'bg-red-500/10 text-red-400 border-red-500/30';

                return (
                  <div
                    key={cand.id}
                    onClick={() => onSelectCandidate(cand)}
                    className={cn(
                      "p-3 rounded-xl border transition-all cursor-pointer relative",
                      isSelected
                        ? "bg-white/[0.06] border-cyan-400/80 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                        : "bg-black/30 border-white/[0.05] hover:border-white/[0.15] hover:bg-white/[0.03]"
                    )}
                  >
                    {isRecommended && (
                      <div className="absolute -top-2 right-3 px-2 py-0.5 rounded-full bg-emerald-500 text-black text-[9px] font-mono font-bold uppercase tracking-wider shadow-md flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        Recommended
                      </div>
                    )}

                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="text-xs font-semibold text-white leading-tight">
                        {cand.name}
                      </h4>
                      <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border shrink-0", riskBadgeColor)}>
                        {cand.risk_level} ({cand.overall_risk_score})
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[11px] font-mono bg-black/30 p-2 rounded-lg border border-white/[0.03]">
                      <div>
                        <span className="text-on-surface-variant/60 block text-[9px]">DISTANCE</span>
                        <span className="font-semibold text-white">{cand.estimated_distance_km} km</span>
                      </div>
                      <div>
                        <span className="text-on-surface-variant/60 block text-[9px]">EST. TIME</span>
                        <span className="font-semibold text-white">{cand.estimated_duration_minutes} min</span>
                      </div>
                      <div>
                        <span className="text-on-surface-variant/60 block text-[9px]">DEFECTS</span>
                        <span className={cn(
                          "font-semibold",
                          cand.total_active_defects > 0 ? "text-amber-400" : "text-emerald-400"
                        )}>
                          {cand.total_active_defects} active
                        </span>
                      </div>
                    </div>

                    {/* Corridor Segments Deep-dive */}
                    {cand.segments && cand.segments.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-white/[0.04] flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-mono text-on-surface-variant/50">Corridors:</span>
                        {cand.segments.map(s => (
                          <button
                            key={s.segment_id}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onSelectRoad) {
                                onSelectRoad({
                                  id: s.segment_id,
                                  name: s.segment_name,
                                  roadClass: s.road_class,
                                  healthScore: s.health_score,
                                } as RoadSegment);
                              }
                            }}
                            className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.1] text-cyan-300 border border-white/[0.05] transition-colors flex items-center gap-1"
                            title={`Inspect ${s.segment_name} (Health: ${s.health_score})`}
                          >
                            <span>{s.segment_name.split(' ')[0]}</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Explainability & Recommendation Rationale */}
            {activeCandidate && (
              <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/20 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-300">
                  <Info className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Recommendation Rationale</span>
                </div>
                <p className="text-[11px] text-white/90 leading-relaxed font-sans">
                  {result.recommendation_reason}
                </p>

                {activeCandidate.avoided_hazards && activeCandidate.avoided_hazards.length > 0 && (
                  <div className="pt-2 border-t border-cyan-500/15 space-y-1">
                    <span className="text-[10px] font-mono font-semibold text-emerald-400 uppercase tracking-wider block">
                      Avoided Infrastructure Hazards:
                    </span>
                    {activeCandidate.avoided_hazards.map((haz, idx) => (
                      <div key={idx} className="flex items-start gap-1.5 text-[11px] text-emerald-300/90">
                        <CheckCircle2 className="w-3 h-3 shrink-0 mt-0.5 text-emerald-400" />
                        <span>{haz}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Truth Constraint / Provenance Notice */}
            <div className="p-2 rounded-lg bg-black/40 border border-white/[0.04] text-[10px] font-mono text-on-surface-variant/60 flex items-start gap-1.5">
              <span className="text-amber-400/80 font-bold shrink-0">PROVENANCE:</span>
              <span>
                {result.timing_provenance || 'ESTIMATED: Computed from municipal road hierarchy design speeds. No fake satellite traffic claims.'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
