import { useEffect, useState } from 'react';
import { Cpu, Server, Activity, AlertTriangle, RefreshCw } from 'lucide-react';
import { PageHeader, GlassPanel, LoadingState, StatusBadge, EmptyState } from '@/components/ui';
import { cn } from '@/lib/utils';
import { api } from '@/services/api';
import type { Bus } from '@/types';
import { motion } from 'framer-motion';

export function EdgeMonitoringPage() {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getBuses();
      setBuses(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message || 'Failed to connect to edge fleet devices.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (isLoading) {
    return <LoadingState message="Loading edge devices..." />;
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
        title="Edge Monitoring"
        subtitle="Edge AI device health and inference pipeline status"
        icon={<Cpu />}
        breadcrumbs={['Fleet', 'Edge Monitoring']}
      />

      {buses.length === 0 ? (
        <EmptyState
          title="No Edge Devices Connected"
          description="Transit vehicles with installed vision sensors will appear here."
          icon={Cpu}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {buses.map((bus, i) => {
            const edgeStatus = (bus.edgeAiStatus || (bus as any).edgeStatus || (bus.status === 'online' ? 'online' : 'offline')).toLowerCase();
            const isOnline = bus.status === 'online' || bus.status === 'active';

            return (
              <motion.div
                key={bus.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
              >
                <GlassPanel hover className="p-5 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-white/5 rounded-lg">
                        <Server className="w-5 h-5 text-brand-blue" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{bus.id}</h3>
                        <p className="text-xs text-foreground/60 font-data-mono">{bus.edgeDeviceId || `NODE-${bus.id}`}</p>
                      </div>
                    </div>
                    <StatusBadge 
                      status={edgeStatus === 'online' ? 'active' : edgeStatus === 'degraded' ? 'warning' : 'critical'} 
                      label={edgeStatus.toUpperCase()} 
                    />
                  </div>

                  <div className="pt-4 border-t border-white/10 grid grid-cols-2 gap-4 font-mono">
                    <div>
                      <p className="text-xs text-foreground/60 mb-1">Camera Sensor</p>
                      <p className="text-sm font-medium capitalize text-on-surface">{(bus as any).cameraStatus || 'active'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-foreground/60 mb-1">Operational Status</p>
                      <div className="flex items-center space-x-1">
                        <Activity className={cn("w-4 h-4", isOnline ? 'text-brand-green' : 'text-brand-orange')} />
                        <span className="text-sm capitalize">{bus.status || 'offline'}</span>
                      </div>
                    </div>
                  </div>
                </GlassPanel>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
