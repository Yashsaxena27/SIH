import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { ArrowDownIcon, ArrowUpIcon, MinusIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GlassPanel } from './GlassPanel';
import { StatusBadge } from './StatusBadge';
import type { OperationalStatus } from './StatusBadge';

export interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: number;
  changeDirection?: 'up' | 'down' | 'stable';
  icon?: LucideIcon;
  status?: OperationalStatus;
  loading?: boolean;
  className?: string;
}

export function MetricCard({
  title,
  value,
  subtitle,
  change,
  changeDirection,
  icon: Icon,
  status,
  loading,
  className,
}: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      <GlassPanel hover padding="lg" className="flex h-full flex-col justify-between gap-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {Icon && (
              <div className="rounded-lg bg-white/5 p-2">
                <Icon className="h-5 w-5 text-white/70" />
              </div>
            )}
            <h3 className="text-sm font-medium text-white/56">{title}</h3>
          </div>
          {status && <StatusBadge status={status} size="sm" />}
        </div>
        
        <div>
          {loading ? (
            <div className="h-10 w-24 animate-pulse rounded-lg bg-white/10" />
          ) : (
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-semibold tracking-tight text-white/90">{value}</div>
              {change !== undefined && changeDirection && (
                <div
                  className={cn('flex items-center text-xs font-medium', {
                    'text-status-low': changeDirection === 'up',
                    'text-status-critical': changeDirection === 'down',
                    'text-white/56': changeDirection === 'stable',
                  })}
                >
                  {changeDirection === 'up' && <ArrowUpIcon className="mr-0.5 h-3 w-3" />}
                  {changeDirection === 'down' && <ArrowDownIcon className="mr-0.5 h-3 w-3" />}
                  {changeDirection === 'stable' && <MinusIcon className="mr-0.5 h-3 w-3" />}
                  {Math.abs(change)}%
                </div>
              )}
            </div>
          )}
          {subtitle && <p className="mt-1 text-xs text-white/56">{subtitle}</p>}
        </div>
      </GlassPanel>
    </motion.div>
  );
}
