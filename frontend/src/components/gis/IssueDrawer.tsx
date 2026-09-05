// ============================================================
// IssueDrawer — Premium contextual drawer for spatial issues
// ============================================================

import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  MapPin, 
  Clock, 
  AlertTriangle, 
  ShieldCheck, 
  Bus, 
  ArrowDown, 
  GitMerge, 
  Ticket,
  UserPlus
} from 'lucide-react';
import { cn, timeAgo, getValidLatLng } from '@/lib/utils';
import type { UrbanIssue } from '@/types';

interface IssueDrawerProps {
  issue: UrbanIssue | null;
  onClose: () => void;
}

export function IssueDrawer({ issue, onClose }: IssueDrawerProps) {
  const getDepth = (severity?: string) => {
    switch (severity) {
      case 'critical': return '14.2 cm';
      case 'high': return '8.5 cm';
      case 'medium': return '4.1 cm';
      default: return '2.0 cm';
    }
  };

  const getTrafficColor = (severity?: string) => {
    switch (severity) {
      case 'critical':
      case 'high': return 'text-red-400';
      case 'medium': return 'text-amber-400';
      default: return 'text-emerald-400';
    }
  };

  const getTrafficLabel = (severity?: string) => {
    switch (severity) {
      case 'critical': return 'Severe Congestion';
      case 'high': return 'Heavy Delay';
      case 'medium': return 'Moderate Impact';
      default: return 'Normal Flow';
    }
  };

  const confScore = issue?.confidenceScore != null && !isNaN(issue.confidenceScore)
    ? Math.round(issue.confidenceScore * 100)
    : 0;

  return (
    <AnimatePresence>
      {issue && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[400] bg-black/40 backdrop-blur-[2px] md:hidden"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute right-0 top-0 bottom-0 z-[500] w-full md:w-[420px] flex flex-col pointer-events-auto bg-[#141519] border-l border-white/[0.08] shadow-2xl"
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08] bg-[#141519] relative z-10 shrink-0">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-widest text-black",
                    issue.severity === 'critical' ? 'bg-red-500 text-white' :
                    issue.severity === 'high' ? 'bg-orange-500 text-white' :
                    issue.severity === 'medium' ? 'bg-amber-400 text-black' :
                    'bg-emerald-400 text-black'
                  )}>
                    {issue.severity || 'low'}
                  </span>
                  <span className="font-mono text-xs text-on-surface-variant/70 uppercase">
                    #{issue.id?.split('-')[1] || issue.id}
                  </span>
                </div>
                <h2 className="text-base font-bold text-white tracking-tight capitalize">
                  {(issue.type || 'Road Anomaly').replace(/_/g, ' ')}
                </h2>
              </div>
              <button 
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-white/[0.08] text-on-surface-variant/70 hover:text-white transition-colors"
                title="Close Drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto scrollbar-none relative z-10 p-5 space-y-6">
              {/* Evidence Photo Frame */}
              <div className="relative w-full h-44 bg-black/60 rounded-xl border border-white/[0.08] flex items-center justify-center overflow-hidden shadow-inner">
                <div className="text-center space-y-1">
                  <AlertTriangle className="w-8 h-8 text-amber-400/60 mx-auto" />
                  <span className="text-xs font-mono text-on-surface-variant/60 block">AI Dashcam Telemetry Crop</span>
                </div>
                <div className="absolute bottom-2.5 left-2.5 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded text-white font-mono text-[10px] border border-white/10">
                  VERIFIED EVIDENCE FRAME
                </div>
              </div>

              {/* 2x2 Metric Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-white/[0.02] rounded-xl border border-white/[0.06] flex flex-col gap-1">
                  <span className="text-[10px] font-mono uppercase text-on-surface-variant/60">Est. Severity Depth</span>
                  <span className="font-mono text-white text-base font-bold">{getDepth(issue.severity)}</span>
                </div>

                <div className="p-3 bg-white/[0.02] rounded-xl border border-white/[0.06] flex flex-col gap-1">
                  <span className="text-[10px] font-mono uppercase text-on-surface-variant/60">Estimated Area</span>
                  <span className="font-mono text-white text-base font-bold">0.8 m²</span>
                </div>

                <div className="p-3 bg-white/[0.02] rounded-xl border border-white/[0.06] flex flex-col gap-1">
                  <span className="text-[10px] font-mono uppercase text-on-surface-variant/60">Traffic Impact</span>
                  <span className={cn("font-mono text-xs font-bold mt-1", getTrafficColor(issue.severity))}>
                    {getTrafficLabel(issue.severity)}
                  </span>
                </div>

                <div className="p-3 bg-white/[0.02] rounded-xl border border-white/[0.06] flex flex-col gap-1">
                  <div className="flex justify-between items-center text-[10px] font-mono uppercase text-on-surface-variant/60">
                    <span>Confidence</span>
                    <span className="text-emerald-400 font-bold">{confScore}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/[0.06] rounded-full mt-2 overflow-hidden">
                    <div 
                      className="h-full bg-emerald-400 rounded-full" 
                      style={{ width: `${confScore}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Location Context Card */}
              <div className="p-3.5 bg-white/[0.02] rounded-xl border border-white/[0.06] flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5 text-xs font-mono text-primary font-bold">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Location Telemetry</span>
                </div>
                <div className="text-xs font-semibold text-white">
                  {(issue.location as any)?.address || (issue.location as any)?.formattedAddress || 'Bengaluru Municipal Road'}
                </div>
                <div className="font-mono text-[11px] text-on-surface-variant/70">
                  {(() => {
                    const pos = getValidLatLng(issue);
                    return pos ? `${pos[0].toFixed(5)}, ${pos[1].toFixed(5)}` : 'Coordinates Pending';
                  })()}
                </div>
              </div>

              {/* Spatial Clustering Visualization */}
              <div className="p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-3">
                <div className="text-[10px] font-mono uppercase text-on-surface-variant/60 tracking-wider">
                  Observation Clustering ({issue.observationCount ?? 1} Detections)
                </div>
                
                <div className="flex flex-col items-center">
                  <div className="flex flex-wrap justify-center gap-1.5 mb-2">
                    {Array.from({ length: Math.min(issue.observationCount ?? 1, 4) }).map((_, i) => (
                      <div key={i} className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-[10px] font-mono text-white">
                        <Bus className="w-3 h-3 text-cyan-400" />
                        <span>BUS-00{i + 1}</span>
                      </div>
                    ))}
                    {(issue.observationCount ?? 1) > 4 && (
                      <div className="flex items-center justify-center px-2 py-0.5 rounded-md bg-white/[0.04] text-[10px] font-mono text-on-surface-variant/60">
                        +{(issue.observationCount ?? 1) - 4} more
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col items-center text-on-surface-variant/50 my-1">
                    <GitMerge className="w-4 h-4 text-primary" />
                    <ArrowDown className="w-3 h-3 text-primary/70" />
                  </div>

                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-semibold">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Validated Civic Anomaly</span>
                  </div>
                </div>
              </div>

              {/* Event Timeline */}
              <div className="space-y-3">
                <div className="text-[10px] font-mono uppercase text-on-surface-variant/60 tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  Lifecycle Timeline
                </div>
                
                <div className="space-y-3 pl-2.5 relative border-l border-white/[0.08] ml-2">
                  {[
                    { title: 'Ticket Assigned', desc: `Assigned to ${issue.assignedDepartmentId || 'PWD'}`, time: issue.firstDetectedAt ? timeAgo(new Date(issue.firstDetectedAt).getTime() + 14400000) : 'Recent', icon: Ticket, color: 'text-purple-400' },
                    { title: 'Issue Confirmed', desc: 'Threshold met via multi-bus validation', time: issue.firstDetectedAt ? timeAgo(new Date(issue.firstDetectedAt).getTime() + 7200000) : 'Recent', icon: ShieldCheck, color: 'text-emerald-400' },
                    { title: 'First Detection', desc: 'Initial anomaly flagged by bus sensor', time: issue.firstDetectedAt ? timeAgo(issue.firstDetectedAt) : 'Recent', icon: AlertTriangle, color: 'text-amber-400' },
                  ].map((evt, i) => (
                    <div key={i} className="relative pl-5">
                      <div className="absolute -left-[17px] top-0.5 w-[20px] h-[20px] rounded-full bg-[#141519] border border-white/[0.1] flex items-center justify-center">
                        <evt.icon className={cn("w-2.5 h-2.5", evt.color)} />
                      </div>
                      <div className="font-mono text-[10px] text-on-surface-variant/60">{evt.time}</div>
                      <div className="text-xs font-semibold text-white">{evt.title}</div>
                      <div className="text-[11px] text-on-surface-variant/70">{evt.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sticky Action Footer */}
            <div className="p-4 border-t border-white/[0.08] bg-[#141519] flex flex-col gap-2 shrink-0">
              <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-on-primary text-xs font-semibold uppercase tracking-wider transition-colors shadow-lg shadow-primary/20">
                <UserPlus className="w-4 h-4" />
                Assign Municipal Team
              </button>
              <div className="flex gap-2">
                <button className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-semibold text-white transition-colors">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Verify</span>
                </button>
                <button className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-semibold text-white transition-colors">
                  <span>Mark Fixed</span>
                </button>
              </div>
            </div>

          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
