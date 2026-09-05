// ============================================================
// Issues Page — Urban Hazard & Damage Registry Operations
// ============================================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Filter, List, LayoutGrid, Map as MapIcon,
  AlertTriangle, ShieldAlert, AlertCircle, Info,
  MapPin, Bus, Clock, ShieldCheck, RefreshCw, X
} from 'lucide-react';
import { GlassPanel, PageHeader, LoadingState, EmptyState } from '@/components/ui';
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
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    setError(null);
    api.getIssues()
      .then(data => {
        setIssues(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch issues:', err);
        setError('Failed to load urban hazard signals.');
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) return <LoadingState message="Loading urban hazard registry..." className="h-full" />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-var(--spacing-header-height))] space-y-4 p-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-status-critical" />
        </div>
        <h2 className="text-xl font-bold text-on-surface">Data Stream Unavailable</h2>
        <p className="text-sm text-on-surface-variant max-w-md">{error}</p>
        <button 
          onClick={loadData} 
          className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-primary/90 transition-colors mt-2"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Retry Connection
        </button>
      </div>
    );
  }

  // Filter issues safely by search query & severity filter
  const filteredIssues = issues.filter(issue => {
    const query = searchQuery.toLowerCase().trim();
    const address = (issue.location as any)?.address || (issue.location as any)?.formattedAddress || '';
    const idStr = issue.id || '';
    const typeStr = issue.type || '';

    const matchesQuery = !query || 
      idStr.toLowerCase().includes(query) ||
      address.toLowerCase().includes(query) ||
      typeStr.toLowerCase().includes(query);

    const matchesSeverity = severityFilter === 'ALL' || (issue.severity || '').toLowerCase() === severityFilter.toLowerCase();

    return matchesQuery && matchesSeverity;
  });

  const getSeverityBadge = (severity: string) => {
    const norm = (severity || 'low').toLowerCase();
    switch (norm) {
      case 'critical':
        return {
          icon: ShieldAlert,
          color: 'bg-red-500/10 text-red-400 border-red-500/25',
          label: 'Critical'
        };
      case 'high':
        return {
          icon: AlertTriangle,
          color: 'bg-orange-500/10 text-orange-400 border-orange-500/25',
          label: 'High'
        };
      case 'medium':
        return {
          icon: AlertCircle,
          color: 'bg-amber-500/10 text-amber-400 border-amber-500/25',
          label: 'Medium'
        };
      default:
        return {
          icon: Info,
          color: 'bg-blue-500/10 text-blue-400 border-blue-500/25',
          label: 'Info'
        };
    }
  };

  return (
    <div className={cn("flex flex-col space-y-5 max-w-[1920px] mx-auto font-sans", viewMode === 'map' ? "h-[calc(100vh-3.5rem)] p-0" : "p-4 sm:p-6")}>
      
      {/* ── 1. PAGE HEADER & FILTER TOOLBAR ──────────────────── */}
      <div className={cn(
        "flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-white/[0.06]",
        viewMode === 'map' && "absolute top-4 left-4 right-4 z-20 bg-[#121316]/90 backdrop-blur-md p-4 rounded-xl border border-white/10 shadow-2xl"
      )}>
        
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Urban Hazard & Damage Registry
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-white/[0.06] text-white border border-white/10">
              {filteredIssues.length} {filteredIssues.length === 1 ? 'Signal' : 'Signals'}
            </span>
          </div>
          <p className="text-xs text-on-surface-variant/80 mt-1 font-medium">
            AI-detected road defects, spatial anomaly classification, and municipal dispatch workflow
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          
          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-on-surface-variant/50 pointer-events-none" />
            <input 
              type="text" 
              placeholder="Search ID, type, address..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 bg-[#16161a] border border-white/[0.08] rounded-lg text-xs text-white placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Severity Filter Selector */}
          <div className="flex items-center p-1 bg-[#16161a] border border-white/[0.08] rounded-lg text-xs font-mono">
            {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(sev => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[10px] font-bold uppercase transition-all",
                  severityFilter === sev
                    ? "bg-primary/20 text-primary-hover border border-primary/30"
                    : "text-on-surface-variant/70 hover:text-white"
                )}
              >
                {sev}
              </button>
            ))}
          </div>

          {/* View Mode Toggle Switcher */}
          <div className="flex items-center p-1 bg-[#16161a] border border-white/[0.08] rounded-lg">
            {[
              { id: 'grid', icon: LayoutGrid, title: 'Grid View' },
              { id: 'list', icon: List, title: 'List View' },
              { id: 'map', icon: MapIcon, title: 'Map View' }
            ].map(mode => {
              const IconComp = mode.icon;
              return (
                <button
                  key={mode.id}
                  title={mode.title}
                  onClick={() => setViewMode(mode.id as ViewMode)}
                  className={cn(
                    "p-1.5 rounded-md transition-all duration-200",
                    viewMode === mode.id 
                      ? "bg-primary/20 text-primary-hover border border-primary/30 shadow-sm" 
                      : "text-on-surface-variant/70 hover:text-white"
                  )}
                >
                  <IconComp className="w-3.5 h-3.5" />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── 2. MAIN CONTENT DISPLAY ────────────────────────── */}
      {viewMode === 'map' ? (
        <div className="flex-1 w-full h-full relative -mt-[76px] z-0 rounded-xl overflow-hidden border border-white/10 shadow-2xl">
          <IntelligenceMap buses={[]} issues={filteredIssues} />
        </div>
      ) : filteredIssues.length === 0 ? (
        <div className="py-16">
          <EmptyState
            icon={AlertTriangle}
            title="No Matching Hazard Signals"
            description="No urban issues matched your search query or severity filter."
            action={
              (searchQuery || severityFilter !== 'ALL') ? (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSeverityFilter('ALL');
                  }}
                  className="px-4 py-2 rounded-lg bg-surface-container hover:bg-surface-high border border-outline-variant text-xs font-semibold text-white transition-colors"
                >
                  Reset Filters
                </button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className={cn(
          "grid gap-4",
          viewMode === 'grid' ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3" : "grid-cols-1"
        )}>
          <AnimatePresence>
            {filteredIssues.map((issue, idx) => {
              const badge = getSeverityBadge(issue.severity);
              const BadgeIcon = badge.icon;
              const address = (issue.location as any)?.address || (issue.location as any)?.formattedAddress || 'Bengaluru Municipal Area';
              const confidenceVal = typeof issue.confidence === 'number' && !isNaN(issue.confidence)
                ? `${(issue.confidence * 100).toFixed(0)}%`
                : 'N/A';
              const obsCount = typeof issue.observationCount === 'number' ? issue.observationCount : 1;

              return (
                <motion.div
                  key={issue.id || idx}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.2, delay: Math.min(idx * 0.02, 0.2) }}
                  onClick={() => navigate(`/issues/${issue.id}`)}
                >
                  <div className="p-4 rounded-xl bg-[#16161a] border border-white/[0.08] hover:border-white/20 hover:bg-[#1a1b20] transition-all duration-200 cursor-pointer group flex flex-col justify-between h-full relative overflow-hidden">
                    
                    <div>
                      {/* Card Header: Severity Badge + ID Tag */}
                      <div className="flex items-center justify-between gap-3 mb-2.5">
                        <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border", badge.color)}>
                          <BadgeIcon className="w-3 h-3" />
                          {badge.label}
                        </span>
                        <span className="font-mono text-[11px] text-on-surface-variant/60 font-semibold tracking-wider">
                          {issue.id ? issue.id.toUpperCase() : `HAZ-${idx+1}`}
                        </span>
                      </div>

                      {/* Issue Title & Type */}
                      <h3 className="text-base font-bold text-white group-hover:text-primary-hover transition-colors truncate mb-1.5">
                        {(issue.type || 'road_hazard').replace(/_/g, ' ')}
                      </h3>

                      {/* Address Location */}
                      <div className="flex items-center gap-1.5 text-xs text-on-surface-variant/80 mb-4">
                        <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                        <span className="truncate">{address}</span>
                      </div>
                    </div>

                    {/* Metadata Strip: Observations & Confidence */}
                    <div className="pt-3 border-t border-white/[0.06] space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04] flex items-center justify-between">
                          <span className="text-[10px] font-mono uppercase text-on-surface-variant/60">Hits</span>
                          <span className="font-mono font-bold text-white flex items-center gap-1">
                            <Bus className="w-3 h-3 text-on-surface-variant/70" />
                            {obsCount}
                          </span>
                        </div>

                        <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04] flex items-center justify-between">
                          <span className="text-[10px] font-mono uppercase text-on-surface-variant/60">Confidence</span>
                          <span className="font-mono font-bold text-white flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-emerald-400" />
                            {confidenceVal}
                          </span>
                        </div>
                      </div>

                      {/* Status + Timestamp Footer */}
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <div className="flex items-center gap-1.5">
                          <span className="text-on-surface-variant/50 uppercase tracking-wider text-[9px]">Status:</span>
                          <span className={cn(
                            "font-bold uppercase tracking-wider text-[10px]",
                            issue.status === 'verified' || issue.status === 'closed' ? "text-emerald-400" :
                            issue.status === 'open' || issue.status === 'confirmed' ? "text-amber-400" : "text-blue-400"
                          )}>
                            {(issue.status || 'open').replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-on-surface-variant/60">
                          <Clock className="w-3 h-3" />
                          {issue.lastObservedAt ? timeAgo(issue.lastObservedAt) : 'recently'}
                        </div>
                      </div>
                    </div>

                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
