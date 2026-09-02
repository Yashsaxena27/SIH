import { useEffect, useState } from 'react';
import { Route as RouteIcon, Map, Activity, Shield, Users } from 'lucide-react';
import { PageHeader, GlassPanel, LoadingState, StatusBadge } from '@/components/ui';
import { cn } from '@/lib/utils';
import { api } from '@/services/api';
import type { Route } from '@/types';
import { motion } from 'framer-motion';

export function RoutesPage() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await api.getRoutes();
        setRoutes(data);
      } catch (error) {
        // Silent catch for demo
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  if (isLoading) {
    return <LoadingState message="Loading routes..." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Routes"
        subtitle="Bus route management and coverage analysis"
        icon={<RouteIcon />}
        breadcrumbs={['Fleet', 'Routes']}
      />

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
                  status={route.healthScore > 80 ? 'active' : route.healthScore > 50 ? 'warning' : 'critical'} 
                  label={`${route.healthScore} Health`} 
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-black/10">
                <div className="space-y-1">
                  <div className="flex items-center text-xs text-foreground/60">
                    <Map className="w-3 h-3 mr-1" /> Length
                  </div>
                  <p className="text-sm font-medium">{route.lengthKm} km</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center text-xs text-foreground/60">
                    <Activity className="w-3 h-3 mr-1" /> Active Buses
                  </div>
                  <p className="text-sm font-medium">{route.activeBuses}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center text-xs text-foreground/60">
                    <Shield className="w-3 h-3 mr-1" /> Coverage
                  </div>
                  <p className="text-sm font-medium">{route.coveragePercent}%</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center text-xs text-foreground/60">
                    <Users className="w-3 h-3 mr-1" /> Daily Riders
                  </div>
                  <p className="text-sm font-medium">{(route as any).dailyRiders?.toLocaleString() || 'N/A'}</p>
                </div>
              </div>
            </GlassPanel>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
