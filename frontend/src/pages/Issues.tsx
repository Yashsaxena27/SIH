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

  const [error, setError] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    setError(null);
    api.getIssues()
      .then(data => {
        setIssues(data);
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to load urban issues.');
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) return <LoadingState message="Loading urban issues..." className="h-full" />;

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
        
        <div className={cn(viewMode === 'map' && "bg-surface/80 backdrop-blur-md p-4 rounded border border-outline-variant w-max")}>
          <h1 className="font-headline-md text-on-surface flex items-center gap-3">
            Urban Issues
            <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-surface-highest text-on-surface-variant border border-outline-variant">
              {filteredIssues.length}
            </span>
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">Detected and prioritized infrastructure events</p>
        </div>

        <div className={cn("flex flex-col sm:flex-row items-center gap-3", viewMode === 'map' && "bg-surface/80 backdrop-blur-md p-2 rounded border border-outline-variant")}>
          
          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/50" />
            <input 
              type="text" 
              placeholder="Search issues, locations..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-surface-container border border-outline-variant rounded-lg text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-secondary transition-colors"
            />
          </div>

          <button className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-surface-container hover:bg-surface-high border border-outline-variant rounded-lg text-sm font-medium text-on-surface-variant transition-colors">
            <Filter className="w-4 h-4" /> Filters
          </button>

          {/* View Toggles */}
          <div className="flex items-center p-1 bg-surface-container border border-outline-variant rounded-lg">
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
                  viewMode === mode.id ? "bg-secondary-container text-on-secondary-container shadow-sm" : "text-on-surface-variant hover:text-on-surface"
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
                <GlassPanel hover padding="md" className="bg-surface-low border border-outline-variant rounded hover:border-outline hover:bg-surface-container cursor-pointer group flex flex-col h-full relative overflow-hidden">
                  
                  <div className={cn("flex justify-between gap-4 relative z-10", viewMode === 'list' ? "items-center" : "items-start flex-col sm:flex-row")}>
                    
                    {/* Header Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded font-label-caps border", getSeverityColor(issue.severity))}>
                          {getSeverityIcon(issue.severity)}
                          {issue.severity}
                        </span>
                        <span className="font-data-mono text-on-surface-variant tracking-wider text-[10px]">#{issue.id.split('-')[1]}</span>
                      </div>
                      
                      <h3 className="text-lg font-bold text-on-surface truncate mb-1 transition-colors">
                        {(issue.type || 'unknown').replace(/_/g, ' ')}
                      </h3>
                      
                      <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                        <MapPin className="w-3.5 h-3.5" />
                        <span className="truncate">{(issue.location as any).address}</span>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className={cn("flex items-center gap-4 shrink-0", viewMode === 'grid' && "w-full justify-between mt-2 pt-4 border-t border-outline-variant/50")}>
                      
                      <div className="flex flex-col items-center sm:items-end">
                        <div className="font-label-caps text-on-surface-variant mb-1">Observations</div>
                        <div className="flex items-center gap-1.5">
                          <Bus className="w-3.5 h-3.5 text-on-surface-variant" />
                          <span className="font-data-mono text-on-surface font-bold text-sm">{issue.observationCount}</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-center sm:items-end">
                        <div className="font-label-caps text-on-surface-variant mb-1">Confidence</div>
                        <div className="flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                          <span className="font-data-mono text-on-surface font-bold text-sm">{(issue.confidence * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                      
                    </div>
                  </div>
                  
                  {/* Footer Line */}
                  <div className="mt-4 pt-3 border-t border-outline-variant/50 flex items-center justify-between text-[11px] relative z-10">
                    <div className="flex items-center gap-2">
                      <span className="text-on-surface-variant font-label-caps">Status:</span>
                      <span className={cn(
                        "font-medium uppercase tracking-wider",
                        issue.status === 'verified' ? "text-emerald-400" :
                        issue.status === 'open' ? "text-orange-400" : "text-secondary"
                      )}>{(issue.status || 'unknown').replace(/_/g, ' ')}</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-data-mono text-on-surface-variant">
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
