import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { GlassPanel } from './GlassPanel';

export interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function ChartCard({
  title,
  subtitle,
  children,
  action,
  className,
}: ChartCardProps) {
  return (
    <GlassPanel padding="lg" className={cn('flex flex-col gap-6', className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-medium text-white/90">{title}</h3>
          {subtitle && <p className="mt-1 text-sm text-white/56">{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
      <div className="flex-1 min-h-[300px]">
        {children}
      </div>
    </GlassPanel>
  );
}
