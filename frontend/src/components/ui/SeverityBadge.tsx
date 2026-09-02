import { AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type Severity = 'critical' | 'high' | 'medium' | 'low';

export interface SeverityBadgeProps {
  severity: Severity;
  size?: 'sm' | 'md';
  showIcon?: boolean;
  className?: string;
}

export function SeverityBadge({
  severity,
  size = 'md',
  showIcon = true,
  className,
}: SeverityBadgeProps) {
  const normalizedSeverity = (severity?.toLowerCase() || 'low') as Severity;
  const config = {
    critical: { icon: AlertTriangle, color: 'text-status-critical bg-status-critical/10 border-status-critical/20', label: 'Critical' },
    high: { icon: AlertCircle, color: 'text-status-high bg-status-high/10 border-status-high/20', label: 'High' },
    medium: { icon: Info, color: 'text-status-medium bg-status-medium/10 border-status-medium/20', label: 'Medium' },
    low: { icon: CheckCircle, color: 'text-status-low bg-status-low/10 border-status-low/20', label: 'Low' },
  }[normalizedSeverity] || { icon: Info, color: 'text-black/60 bg-black/10 border-black/20', label: severity || 'Unknown' };

  const Icon = config.icon;

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border',
        config.color,
        {
          'px-2 py-0.5 gap-1 text-xs': size === 'sm',
          'px-2.5 py-1 gap-1.5 text-sm': size === 'md',
        },
        className
      )}
    >
      {showIcon && <Icon className={cn({ 'h-3 w-3': size === 'sm', 'h-4 w-4': size === 'md' })} />}
      <span className="font-medium">{config.label}</span>
    </div>
  );
}
