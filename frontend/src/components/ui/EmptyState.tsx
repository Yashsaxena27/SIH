import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center p-8 text-center', className)}>
      <div className="mb-4 rounded-full bg-white/[0.03] p-4 border border-white/[0.06]">
        <Icon className="h-8 w-8 text-white/36" />
      </div>
      <h3 className="mb-2 text-lg font-medium text-white/90">{title}</h3>
      <p className="mb-6 max-w-sm text-sm text-white/56">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
}
