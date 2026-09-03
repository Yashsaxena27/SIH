// ============================================================
// Alerts Page — System alerts and notifications
// ============================================================

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bell, AlertTriangle, Info, CheckCircle, Clock } from 'lucide-react';
import { PageHeader, GlassPanel, LoadingState } from '@/components/ui';
import { api } from '@/services/api';
import { cn, timeAgo } from '@/lib/utils';
import type { Alert } from '@/types';

const alertConfig: Record<string, { icon: typeof AlertTriangle; color: string; bg: string }> = {
  critical: { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
  warning: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
  info: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
};

export function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    setError(null);
    api.getAlerts()
      .then(data => {
        setAlerts(data);
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to load alerts.');
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) return <LoadingState message="Loading alerts..." size="lg" className="h-full" />;

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

  const unacknowledged = alerts.filter(a => !a.acknowledged);
  const acknowledged = alerts.filter(a => a.acknowledged);

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Alerts"
        subtitle={`${unacknowledged.length} unacknowledged alerts`}
        breadcrumbs={[{ label: 'System' }, { label: 'Alerts' }]}
      />

      {unacknowledged.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider px-1">Active</h3>
          {unacknowledged.map((alert, index) => {
            const config = alertConfig[alert.severity] || alertConfig.info;
            const Icon = config.icon;
            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <GlassPanel padding="md" className={cn('border-l-2', config.bg.includes('red') ? 'border-l-red-500/40' : config.bg.includes('yellow') ? 'border-l-yellow-500/40' : 'border-l-blue-500/40')}>
                  <div className="flex items-start gap-3">
                    <div className={cn('p-1.5 rounded-lg', config.bg.split(' ')[0])}>
                      <Icon className={cn('w-4 h-4', config.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium text-white/85">{alert.title}</h4>
                        <span className={cn('text-[10px] font-semibold uppercase', config.color)}>{alert.severity}</span>
                      </div>
                      <p className="text-xs text-on-surface-variant mt-0.5">{alert.message}</p>
                      <div className="flex items-center gap-1 mt-1.5">
                        <Clock className="w-3 h-3 text-on-surface-variant/60" />
                        <span className="text-[10px] text-on-surface-variant/60">{timeAgo(alert.timestamp)}</span>
                      </div>
                    </div>
                    <button className="px-2.5 py-1 rounded-md bg-surface-container border border-outline-variant text-[10px] font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-high transition-colors flex-shrink-0">
                      Acknowledge
                    </button>
                  </div>
                </GlassPanel>
              </motion.div>
            );
          })}
        </div>
      )}

      {acknowledged.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-on-surface-variant/60 uppercase tracking-wider px-1">Acknowledged</h3>
          {acknowledged.map((alert) => (
            <GlassPanel key={alert.id} padding="sm" className="opacity-60">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-3.5 h-3.5 text-on-surface-variant/60 flex-shrink-0" />
                <span className="text-xs text-on-surface-variant flex-1">{alert.title}</span>
                <span className="text-[10px] text-on-surface-variant/60">{timeAgo(alert.timestamp)}</span>
              </div>
            </GlassPanel>
          ))}
        </div>
      )}
    </div>
  );
}
