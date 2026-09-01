// ============================================================
// Issues Page — Premium issue management interface
// ============================================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Filter, List, LayoutGrid, Map as MapIcon,
  AlertTriangle, ShieldAlert, AlertCircle, Info,
  MapPin, Bus, Clock, ShieldCheck
} from 'lucide-react';
import { GlassPanel, PageHeader, LoadingState } from '@/components/ui';
import { IntelligenceMap } from '@/components/ui';
import { api } from '@/services/api';
import { cn, timeAgo } from '@/lib/utils';
import type { UrbanIssue } from '@/types';

type ViewMode = 'list' | 'grid' | 'map';

export function IssuesPage() {
  const [issues, setIssues] = useState<UrbanIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  
  const navigate = useNavigate();

  useEffect(() => {
    api.getIssues().then(data => {
      setIssues(data);
      setLoading(false);
    });
  }, []);

  const filteredIssues = issues.filter(issue => 
    issue.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (issue.location as any).address.toLowerCase().includes(searchQuery.toLowerCase()) ||
    issue.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getSeverityIcon = (severity: string) => {
    switch(severity) {
      case 'critical': return <ShieldAlert className="w-4 h-4 text-red-500" />;
      case 'high': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'medium': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default: return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch(severity) {
      case 'critical': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'high': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'medium': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      default: return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    }
  };

  if (loading) return <LoadingState message="Loading urban issues..." size="lg" className="h-full" />;

  return (
    <div className={cn("flex flex-col space-y-4 sm:space-y-6", viewMode === 'map' ? "h-[calc(100vh-3.5rem)] p-0" : "p-4 sm:p-6")}>
      
      {/* Header & Controls */}
      <div className={cn("flex flex-col lg:flex-row lg:items-end justify-between gap-4", viewMode === 'map' && "absolute top-4 left-4 right-4 z-10")}>
        
        <div className={cn(viewMode === 'map' && "bg-black/40 backdrop-blur-md p-4 rounded-xl border border-white/[0.1] w-max")}>
          <h1 className="text-2xl font-bold text-white/95 tracking-tight flex items-center gap-3">
            Urban Issues
            <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-white/[0.08] text-white/70 border border-white/[0.1]">
              {filteredIssues.length}
            </span>
          </h1>
          <p className="text-sm text-white/40 mt-1">Detected and prioritized infrastructure events</p>
        </div>

        <div className={cn("flex flex-col sm:flex-row items-center gap-3", viewMode === 'map' && "bg-black/40 backdrop-blur-md p-2 rounded-xl border border-white/[0.1]")}>
          
          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input 
              type="text" 
              placeholder="Search issues, locations..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white/[0.03] border border-white/[0.08] rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-accent-primary/50 transition-colors"
            />
          </div>

          <button className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] rounded-lg text-sm font-medium text-white/80 transition-colors">
            <Filter className="w-4 h-4" /> Filters
          </button>

          {/* View Toggles */}
          <div className="flex items-center p-1 bg-white/[0.03] border border-white/[0.08] rounded-lg">
            {[
              { id: 'grid', icon: LayoutGrid },
              { id: 'list', icon: List },
              { id: 'map', icon: MapIcon }
            ].map(mode => (
              <button
                key={mode.id}
                onClick={() => setViewMode(mode.id as ViewMode)}
                className={cn(
                  "p-1.5 rounded-md transition-all duration-200",
                  viewMode === mode.id ? "bg-white/[0.1] text-white shadow-sm" : "text-white/40 hover:text-white/80"
                )}
              >
                <mode.icon className="w-4 h-4" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'map' ? (
        <div className="flex-1 w-full h-full relative -mt-[76px] z-0">
          <IntelligenceMap buses={[]} issues={filteredIssues} />
        </div>
      ) : (
        <div className={cn(
          "grid gap-4",
          viewMode === 'grid' ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3" : "grid-cols-1"
        )}>
          <AnimatePresence>
            {filteredIssues.map((issue, idx) => (
              <motion.div
                key={issue.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, delay: idx * 0.02 }}
                onClick={() => navigate(`/issues/${issue.id}`)}
              >
                <GlassPanel hover padding="md" className="cursor-pointer group flex flex-col h-full relative overflow-hidden">
                  
                  {/* Subtle Severity Glow */}
                  <div className={cn(
                    "absolute -right-10 -top-10 w-32 h-32 blur-[60px] opacity-20 group-hover:opacity-40 transition-opacity",
                    issue.severity === 'critical' ? 'bg-red-500' :
                    issue.severity === 'high' ? 'bg-orange-500' :
                    issue.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                  )} />

                  <div className={cn("flex justify-between gap-4 relative z-10", viewMode === 'list' ? "items-center" : "items-start flex-col sm:flex-row")}>
                    
                    {/* Header Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border", getSeverityColor(issue.severity))}>
                          {getSeverityIcon(issue.severity)}
                          {issue.severity}
                        </span>
                        <span className="text-[10px] text-white/40 font-mono tracking-wider">#{issue.id.split('-')[1]}</span>
                      </div>
                      
                      <h3 className="text-lg font-bold text-white/90 truncate capitalize mb-1 group-hover:text-white transition-colors">
                        {issue.type.replace(/_/g, ' ')}
                      </h3>
                      
                      <div className="flex items-center gap-1.5 text-xs text-white/50">
                        <MapPin className="w-3.5 h-3.5" />
                        <span className="truncate">{(issue.location as any).address}</span>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className={cn("flex items-center gap-4 shrink-0", viewMode === 'grid' && "w-full justify-between mt-2 pt-4 border-t border-white/[0.04]")}>
                      
                      <div className="flex flex-col items-center sm:items-end">
                        <div className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-1">Observations</div>
                        <div className="flex items-center gap-1.5">
                          <Bus className="w-3.5 h-3.5 text-white/40" />
                          <span className="text-sm font-bold text-white/80">{issue.observationCount}</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-center sm:items-end">
                        <div className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-1">Confidence</div>
                        <div className="flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-accent-primary" />
                          <span className="text-sm font-bold text-white/80">{(issue.confidence * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                      
                    </div>
                  </div>
                  
                  {/* Footer Line */}
                  <div className="mt-4 pt-3 border-t border-white/[0.04] flex items-center justify-between text-[11px] relative z-10">
                    <div className="flex items-center gap-2">
                      <span className="text-white/40">Status:</span>
                      <span className={cn(
                        "font-medium uppercase tracking-wider",
                        issue.status === 'verified' ? "text-emerald-400" :
                        issue.status === 'open' ? "text-orange-400" : "text-blue-400"
                      )}>{issue.status.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-white/30">
                      <Clock className="w-3 h-3" />
                      {timeAgo(issue.lastObservedAt)}
                    </div>
                  </div>

                </GlassPanel>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
