import { cn } from '@/lib/utils';

export type OperationalStatus = 'live' | 'monitoring' | 'processing' | 'offline' | 'syncing' | 'error';

export interface StatusBadgeProps {
  status: OperationalStatus;
  size?: 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
}

export function StatusBadge({
  status,
  size = 'md',
  showLabel = true,
  className,
}: StatusBadgeProps) {
  const statusConfig: Record<OperationalStatus, { color: string; label: string }> = {
    live: { color: 'bg-status-low', label: 'Live' },
    monitoring: { color: 'bg-status-high', label: 'Monitoring' },
    processing: { color: 'bg-status-medium', label: 'Processing' },
    offline: { color: 'bg-black/20', label: 'Offline' },
    syncing: { color: 'bg-accent-secondary', label: 'Syncing' },
    error: { color: 'bg-status-critical', label: 'Error' },
  };

  const config = statusConfig[status] || statusConfig.offline;

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full bg-black/[0.03] border border-black/[0.06]',
        {
          'px-2 py-1 gap-1.5 text-xs': size === 'sm',
          'px-2.5 py-1.5 gap-2 text-sm': size === 'md',
        },
        className
      )}
    >
      <div className="relative flex h-2 w-2 items-center justify-center">
        {status === 'live' && (
          <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-75', config.color)} />
        )}
        <span className={cn('relative inline-flex h-2 w-2 rounded-full', config.color)} />
      </div>
      {showLabel && <span className="font-medium text-black/90">{config.label}</span>}
    </div>
  );
}
