import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TimelineEvent {
  id: string | number;
  timestamp: string;
  title: string;
  description?: ReactNode;
  icon?: LucideIcon;
  color?: string;
}

export interface TimelineProps {
  events: TimelineEvent[];
  className?: string;
}

export function Timeline({ events, className }: TimelineProps) {
  return (
    <div className={cn('relative pl-4', className)}>
      <div className="absolute left-4 top-2 bottom-2 w-px bg-black/[0.1]" />
      <div className="space-y-8">
        {events.map((event) => {
          const Icon = event.icon;
          return (
            <div key={event.id} className="relative pl-8">
              <div className={cn(
                'absolute -left-3 top-0 flex h-6 w-6 items-center justify-center rounded-full border-2 border-surface-base bg-surface-elevated',
                event.color || 'text-black/56'
              )}>
                {Icon ? <Icon className="h-3 w-3" /> : <div className="h-2 w-2 rounded-full bg-current" />}
              </div>
              <div className="flex flex-col gap-1">
                <time className="text-xs font-medium text-black/56">{event.timestamp}</time>
                <h4 className="text-sm font-medium text-black/90">{event.title}</h4>
                {event.description && (
                  <div className="mt-1 text-sm text-black/56">
                    {event.description}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
