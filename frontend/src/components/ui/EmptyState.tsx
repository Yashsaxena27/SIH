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
    <div className={cn('flex flex-col items-center justify-center p-10 text-center rounded-xl border border-dashed border-black/10 bg-black/[0.01]', className)}>
      <div className="mb-4 rounded-full bg-black/[0.02] p-5 shadow-[inset_0_0_20px_rgba(255,255,255,0.02)] border border-black/[0.05]">
        <Icon className="h-8 w-8 text-black/30" />
      </div>
      <h3 className="mb-2 text-lg font-semibold tracking-tight text-black/80">{title}</h3>
      <p className="mb-6 max-w-sm text-sm text-black/50">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
}
