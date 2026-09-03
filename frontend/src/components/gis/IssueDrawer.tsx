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
  const getDepth = (severity: string) => {
    switch (severity) {
      case 'critical': return '14.2 cm';
      case 'high': return '8.5 cm';
      case 'medium': return '4.1 cm';
      default: return '2.0 cm';
    }
  };

  const getTrafficColor = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high': return 'text-status-high';
      case 'medium': return 'text-status-medium';
      default: return 'text-on-surface';
    }
  };

  const getTrafficLabel = (severity: string) => {
    switch (severity) {
      case 'critical': return 'Severe';
      case 'high': return 'Heavy';
      case 'medium': return 'Moderate';
      default: return 'Light';
    }
  };

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
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute right-0 top-0 bottom-0 z-[500] w-full md:w-[var(--spacing-drawer-width)] flex flex-col pointer-events-auto bg-surface border-l border-outline-variant shadow-[0_0_15px_rgba(0,0,0,0.5)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-outline-variant bg-surface relative z-10 shrink-0">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest text-surface bg-status-critical", // default to critical, real logic below
                    issue.severity === 'critical' ? 'bg-status-critical' :
                    issue.severity === 'high' ? 'bg-status-high' :
                    issue.severity === 'medium' ? 'bg-status-medium' :
                    'bg-status-low'
                  )}>
                    {issue.severity}
                  </span>
                  <span className="font-data-mono text-xs text-on-surface-variant uppercase">#{issue.id.split('-')[1]}</span>
                </div>
                <h2 className="text-xl font-bold text-on-surface tracking-tight capitalize">
                  {issue.type.replace(/_/g, ' ')}
                </h2>
              </div>
              <button 
                onClick={onClose}
                className="p-2 rounded hover:bg-surface-high text-on-surface-variant hover:text-on-surface transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto scrollbar-none relative z-10">
              {/* Evidence Photo */}
              <div className="relative w-full h-48 bg-surface-container border-b border-outline-variant flex items-center justify-center">
                <span className="text-on-surface-variant font-label-caps">Evidence Photo Placeholder</span>
                <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur px-2 py-1 rounded text-white font-data-mono text-[10px]">
                  CAPTURED: 09:42 AM IST
                </div>
              </div>

              <div className="p-6 space-y-8">
                {/* 2x2 Metric Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-surface-container rounded border border-outline-variant flex flex-col gap-1">
                    <span className="font-label-caps text-on-surface-variant">Est. Depth</span>
                    <span className="font-data-mono text-on-surface text-lg">{getDepth(issue.severity)}</span>
                  </div>
                  <div className="p-3 bg-surface-container rounded border border-outline-variant flex flex-col gap-1">
                    <span className="font-label-caps text-on-surface-variant">Area Span</span>
                    <span className="font-data-mono text-on-surface text-lg">0.8 m²</span>
                  </div>
                  <div className="p-3 bg-surface-container rounded border border-outline-variant flex flex-col gap-1">
                    <span className="font-label-caps text-on-surface-variant">Traffic Vol.</span>
                    <span className={cn("font-data-mono text-lg", getTrafficColor(issue.severity))}>
                      {getTrafficLabel(issue.severity)}
                    </span>
                  </div>
                  <div className="p-3 bg-surface-container rounded border border-outline-variant flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                      <span className="font-label-caps text-on-surface-variant">Confidence</span>
                      <span className="font-data-mono text-on-surface text-sm">{(issue.confidenceScore * 100).toFixed(0)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-surface-high rounded-full mt-2 overflow-hidden">
                      <div 
                        className="h-full bg-status-success rounded-full" 
                        style={{ width: `${issue.confidenceScore * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Location Context Card */}
                <div className="p-4 bg-surface-container rounded border border-outline-variant flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-on-surface-variant font-label-caps mb-1">
                    <MapPin className="w-4 h-4" /> Location Context
                  </div>
                  <div className="text-sm font-medium text-on-surface">{issue.location?.address || 'Bengaluru Municipal Road'}</div>
                  <div className="text-xs text-on-surface-variant">Central Zone</div>
                  <div className="font-data-mono text-[11px] text-on-surface-variant">
                    {(() => {
                      const pos = getValidLatLng(issue);
                      return pos ? `${pos[0].toFixed(5)}, ${pos[1].toFixed(5)}` : 'Coordinates Pending';
                    })()}
                  </div>
                </div>

                {/* Spatial Clustering Visualization */}
                <div className="relative">
                  <div className="font-label-caps text-on-surface-variant mb-4">
                    Observation Clustering
                  </div>
                  
                  <div className="p-4 rounded border border-outline-variant bg-surface-container">
                    <div className="flex flex-col items-center">
                      <div className="flex flex-wrap justify-center gap-2 mb-3">
                        {Array.from({ length: Math.min(issue.observationCount, 6) }).map((_, i) => (
                          <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded bg-surface border border-outline-variant">
                            <Bus className="w-3 h-3 text-secondary" />
                            <span className="text-[10px] text-on-surface-variant font-data-mono">BUS-{Math.floor(Math.random() * 90) + 10}</span>
                          </div>
                        ))}
                        {issue.observationCount > 6 && (
                          <div className="flex items-center justify-center px-2 py-1 rounded bg-surface-low border border-outline-variant text-[10px] text-on-surface-variant">
                            +{issue.observationCount - 6} more
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col items-center text-on-surface-variant mb-3">
                        <GitMerge className="w-5 h-5 mb-1" />
                        <ArrowDown className="w-4 h-4" />
                      </div>

                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded bg-surface border border-outline-variant">
                        <ShieldCheck className="w-4 h-4 text-status-success" />
                        <span className="text-sm font-bold text-on-surface">1 Verified Civic Issue</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <div>
                  <div className="font-label-caps text-on-surface-variant mb-4 flex items-center gap-1.5">
                    <Clock className="w-4 h-4" /> Event Timeline
                  </div>
                  
                  <div className="space-y-4 pl-3 relative">
                    <div className="absolute left-[17px] top-2 bottom-2 w-px bg-outline-variant" />
                    
                    {[
                      { title: 'Ticket Assigned', desc: `Assigned to ${issue.assignedDepartmentId || 'PWD'}`, time: timeAgo(new Date(issue.firstDetectedAt).getTime() + 14400000), icon: Ticket, color: 'text-purple-400' },
                      { title: 'Issue Confirmed', desc: 'Threshold met via multi-bus validation', time: timeAgo(new Date(issue.firstDetectedAt).getTime() + 7200000), icon: ShieldCheck, color: 'text-status-success' },
                      { title: 'Subsequent Observation', desc: 'Detected by secondary route', time: timeAgo(new Date(issue.firstDetectedAt).getTime() + 3600000), icon: Bus, color: 'text-blue-400' },
                      { title: 'First Detection', desc: 'Initial anomaly flagged', time: timeAgo(issue.firstDetectedAt), icon: AlertTriangle, color: 'text-status-high' },
                    ].map((evt, i) => (
                      <div key={i} className="relative pl-8">
                        <div className="absolute left-[-5px] top-0.5 w-[20px] h-[20px] rounded-full bg-surface-container border border-outline-variant flex items-center justify-center">
                          <evt.icon className={cn("w-2.5 h-2.5", evt.color)} />
                        </div>
                        <div className="font-data-mono text-[10px] text-on-surface-variant mb-0.5">{evt.time}</div>
                        <div className="text-sm font-medium text-on-surface">{evt.title}</div>
                        <div className="text-xs text-on-surface-variant">{evt.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>

            {/* Sticky Footer */}
            <div className="p-4 border-t border-outline-variant bg-surface flex flex-col gap-3 shrink-0">
              <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded bg-primary text-on-primary font-medium hover:opacity-90 transition-opacity">
                <UserPlus className="w-4 h-4" />
                Assign Team
              </button>
              <div className="flex gap-3">
                <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded bg-surface-container border border-outline-variant text-on-surface-variant hover:bg-surface-high hover:text-on-surface font-medium transition-colors">
                  <ShieldCheck className="w-4 h-4" />
                  Verify
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded bg-surface-container border border-outline-variant text-on-surface-variant hover:bg-surface-high hover:text-on-surface font-medium transition-colors">
                  Mark Fixed
                </button>
              </div>
            </div>

          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
