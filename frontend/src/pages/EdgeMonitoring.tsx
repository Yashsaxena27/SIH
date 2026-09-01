import { useEffect, useState } from 'react';
import { Cpu, Server, Activity } from 'lucide-react';
import { PageHeader, GlassPanel, LoadingState, StatusBadge } from '@/components/ui';
import { cn } from '@/lib/utils';
import { api } from '@/services/api';
import type { Bus } from '@/types';
import { motion } from 'framer-motion';

export function EdgeMonitoringPage() {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await api.getBuses();
        setBuses(data);
      } catch (error) {
        console.error('Failed to load edge devices:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  if (isLoading) {
    return <LoadingState message="Loading edge devices..." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edge Monitoring"
        subtitle="Edge AI device health and inference pipeline status"
        icon={<Cpu />}
        breadcrumbs={['Fleet', 'Edge Monitoring']}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {buses.map((bus, i) => (
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
                    <p className="text-xs text-foreground/60 font-mono">{bus.edgeDeviceId}</p>
                  </div>
                </div>
                <StatusBadge 
                  status={(bus as any).edgeStatus === 'online' ? 'active' : (bus as any).edgeStatus === 'degraded' ? 'warning' : 'critical'} 
                  label={(bus as any).edgeStatus.toUpperCase()} 
                />
              </div>

              <div className="pt-4 border-t border-white/10 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-foreground/60 mb-1">Detections Today</p>
                  <p className="text-lg font-medium">{bus.detectionsToday || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-foreground/60 mb-1">Operational Status</p>
                  <div className="flex items-center space-x-1">
                    <Activity className={cn("w-4 h-4", bus.status === 'active' ? 'text-brand-green' : 'text-brand-orange')} />
                    <span className="text-sm capitalize">{bus.status}</span>
                  </div>
                </div>
              </div>
            </GlassPanel>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
