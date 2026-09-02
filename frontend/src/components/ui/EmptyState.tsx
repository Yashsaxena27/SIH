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
    <div className={cn('flex flex-col items-center justify-center p-10 text-center rounded-xl border border-dashed border-white/10 bg-white/[0.01]', className)}>
      <div className="mb-4 rounded-full bg-white/[0.02] p-5 shadow-[inset_0_0_20px_rgba(255,255,255,0.02)] border border-white/[0.05]">
        <Icon className="h-8 w-8 text-white/30" />
      </div>
      <h3 className="mb-2 text-lg font-semibold tracking-tight text-white/80">{title}</h3>
      <p className="mb-6 max-w-sm text-sm text-white/50">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
}
