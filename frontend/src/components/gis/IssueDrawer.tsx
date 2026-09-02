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
  Wrench
} from 'lucide-react';
import { GlassPanel } from '@/components/ui';
import { cn, timeAgo, formatDate } from '@/lib/utils';
import type { UrbanIssue } from '@/types';

interface IssueDrawerProps {
  issue: UrbanIssue | null;
  onClose: () => void;
}

export function IssueDrawer({ issue, onClose }: IssueDrawerProps) {
  return (
    <AnimatePresence>
      {issue && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[400] bg-black/20 backdrop-blur-[2px] md:hidden"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%', opacity: 0, scale: 0.98 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: '100%', opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute right-0 top-0 bottom-0 z-[500] w-full md:w-[400px] flex flex-col pointer-events-auto"
          >
            <div className="h-full flex flex-col bg-surface-raised/95 backdrop-blur-3xl border-l border-black/[0.08] shadow-2xl relative overflow-hidden">
              
              {/* Background Glow */}
              <div className={cn(
                "absolute top-0 right-0 w-64 h-64 rounded-full blur-[100px] opacity-20 pointer-events-none transition-colors duration-1000",
                issue.severity === 'critical' ? 'bg-red-500' :
                issue.severity === 'high' ? 'bg-orange-500' :
                issue.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
              )} />

              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-black/[0.06] relative z-10 bg-surface-raised/50">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border",
                      issue.severity === 'critical' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                      issue.severity === 'high' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                      issue.severity === 'medium' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                      'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    )}>
                      {issue.severity} Severity
                    </span>
                    <span className="text-[10px] text-black/40 font-mono tracking-wider">#{issue.id.split('-')[1]}</span>
                  </div>
                  <h2 className="text-xl font-bold text-black/95 tracking-tight capitalize">
                    {issue.type.replace(/_/g, ' ')}
                  </h2>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 rounded-lg text-black/40 hover:text-black/80 hover:bg-black/[0.06] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto scrollbar-none relative z-10">
                <div className="p-6 space-y-8">
                  
                  {/* Location & Confidence */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="text-[10px] font-semibold text-black/30 uppercase tracking-widest flex items-center gap-1.5">
                        <MapPin className="w-3 h-3" /> Location
                      </div>
                      <div className="text-sm font-medium text-black/80">{issue.location.address}</div>
                      <div className="text-[10px] text-black/40 font-mono">{issue.location.lat.toFixed(5)}, {issue.location.lng.toFixed(5)}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] font-semibold text-black/30 uppercase tracking-widest flex items-center gap-1.5">
                        <AlertTriangle className="w-3 h-3" /> AI Confidence
                      </div>
                      <div className="text-2xl font-bold text-accent-primary-hover">
                        {(issue.confidenceScore * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  {/* Spatial Clustering Visualization */}
                  <div className="relative">
                    <div className="text-[10px] font-semibold text-black/30 uppercase tracking-widest mb-4">
                      Observation Clustering
                    </div>
                    
                    <div className="p-4 rounded-xl border border-black/[0.06] bg-gradient-to-b from-black/[0.02] to-transparent relative overflow-hidden">
                      <div className="flex flex-col items-center">
                        <div className="flex flex-wrap justify-center gap-2 mb-3 z-10 relative">
                          {Array.from({ length: Math.min(issue.observationCount, 6) }).map((_, i) => (
                            <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded bg-black/[0.04] border border-black/[0.06]">
                              <Bus className="w-3 h-3 text-accent-secondary" />
                              <span className="text-[10px] text-black/60 font-mono">BUS-{Math.floor(Math.random() * 90) + 10}</span>
                            </div>
                          ))}
                          {issue.observationCount > 6 && (
                            <div className="flex items-center justify-center px-2 py-1 rounded bg-black/[0.02] border border-black/[0.04] text-[10px] text-black/40">
                              +{issue.observationCount - 6} more
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-col items-center text-black/20 mb-3 relative z-10">
                          <GitMerge className="w-5 h-5 mb-1" />
                          <ArrowDown className="w-4 h-4" />
                        </div>

                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-primary/10 border border-accent-primary/20 z-10 relative">
                          <ShieldCheck className="w-4 h-4 text-accent-primary-hover" />
                          <span className="text-sm font-bold text-black/90">1 Verified Civic Issue</span>
                        </div>
                      </div>
                      
                      {/* Connection lines background */}
                      <div className="absolute inset-0 z-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at center, white 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
                    </div>
                  </div>

                  {/* Timeline */}
                  <div>
                    <div className="text-[10px] font-semibold text-black/30 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                      <Clock className="w-3 h-3" /> Event Timeline
                    </div>
                    
                    <div className="space-y-4 pl-3 relative">
                      {/* Line */}
                      <div className="absolute left-[17px] top-2 bottom-2 w-px bg-black/[0.06]" />
                      
                      {[
                        { title: 'Ticket Assigned', desc: `Assigned to ${issue.assignedDepartmentId || 'PWD'}`, time: timeAgo(new Date(issue.firstDetectedAt).getTime() + 14400000), icon: Ticket, color: 'text-purple-400' },
                        { title: 'Issue Confirmed', desc: 'Threshold met via multi-bus validation', time: timeAgo(new Date(issue.firstDetectedAt).getTime() + 7200000), icon: ShieldCheck, color: 'text-emerald-400' },
                        { title: 'Subsequent Observation', desc: 'Detected by secondary route', time: timeAgo(new Date(issue.firstDetectedAt).getTime() + 3600000), icon: Bus, color: 'text-blue-400' },
                        { title: 'First Detection', desc: 'Initial anomaly flagged', time: timeAgo(issue.firstDetectedAt), icon: AlertTriangle, color: 'text-orange-400' },
                      ].map((evt, i) => (
                        <div key={i} className="relative pl-8">
                          <div className="absolute left-[-5px] top-0.5 w-[20px] h-[20px] rounded-full bg-surface-raised border border-black/[0.1] flex items-center justify-center">
                            <evt.icon className={cn("w-2.5 h-2.5", evt.color)} />
                          </div>
                          <div className="text-[10px] text-black/40 mb-0.5">{evt.time}</div>
                          <div className="text-sm font-medium text-black/85">{evt.title}</div>
                          <div className="text-xs text-black/50">{evt.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-4 border-t border-black/[0.06] bg-surface-raised/80 backdrop-blur-xl relative z-10">
                <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-black/[0.05] hover:bg-black/[0.08] border border-black/[0.1] text-black/90 text-sm font-medium transition-colors">
                  <Wrench className="w-4 h-4" />
                  View Ticket & SLA Actions
                </button>
              </div>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
