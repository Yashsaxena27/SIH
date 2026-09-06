import { useEffect, useState } from 'react';
import { Route as RouteIcon, Map, Activity, Shield, Users, AlertTriangle, RefreshCw } from 'lucide-react';
import { PageHeader, GlassPanel, LoadingState, StatusBadge, EmptyState } from '@/components/ui';
import { cn } from '@/lib/utils';
import { api } from '@/services/api';
import type { Route } from '@/types';
import { motion } from 'framer-motion';

export function RoutesPage() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getRoutes();
      setRoutes(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load transit routes.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (isLoading) {
    return <LoadingState message="Loading routes..." />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-3">
          <AlertTriangle className="w-6 h-6 text-status-critical" />
        </div>
        <h3 className="text-lg font-bold text-on-surface">Data Unavailable</h3>
        <p className="text-xs text-on-surface-variant max-w-sm mt-1">{error}</p>
        <button 
          onClick={loadData}
          className="mt-4 px-4 py-2 bg-primary text-on-primary rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Routes"
        subtitle="Bus route management and coverage analysis"
        icon={<RouteIcon />}
        breadcrumbs={['Fleet', 'Routes']}
      />

      {routes.length === 0 ? (
        <EmptyState
          title="No Routes Found"
          description="Registered transit routes will appear here."
          icon={RouteIcon}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {routes.map((route, i) => (
            <motion.div
              key={route.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
            >
              <GlassPanel hover className="p-5 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-lg">{route.name}</h3>
                    <p className="text-sm text-foreground/60">{route.displayCode}</p>
                  </div>
                  <StatusBadge 
                    status={route.isActive ? 'active' : 'offline'} 
                    label={route.isActive ? 'Active Route' : 'Inactive'} 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10 font-mono">
                  <div className="space-y-1">
                    <div className="flex items-center text-xs text-foreground/60">
                      <RouteIcon className="w-3 h-3 mr-1 text-primary" /> Corridor Code
                    </div>
                    <p className="text-sm font-medium">{route.displayCode || route.id}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center text-xs text-foreground/60">
                      <Activity className="w-3 h-3 mr-1 text-secondary" /> Service Status
                    </div>
                    <p className="text-sm font-medium">{route.isActive ? 'Active Patrol' : 'Inactive'}</p>
                  </div>
                </div>
              </GlassPanel>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
