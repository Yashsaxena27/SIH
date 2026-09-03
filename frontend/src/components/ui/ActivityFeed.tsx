import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface ActivityEvent {
  id: string | number;
  title: string;
  description?: string;
  timestamp: string;
  type?: 'info' | 'success' | 'warning' | 'error';
}

export interface ActivityFeedProps {
  events: ActivityEvent[];
  maxItems?: number;
  className?: string;
}

export function ActivityFeed({ events, maxItems, className }: ActivityFeedProps) {
  const displayEvents = maxItems ? events.slice(0, maxItems) : events;

  const getTypeColor = (type?: ActivityEvent['type']) => {
    switch (type) {
      case 'success':
        return 'bg-status-low';
      case 'warning':
        return 'bg-status-high';
      case 'error':
        return 'bg-status-critical';
      case 'info':
      default:
        return 'bg-accent-primary';
    }
  };

  return (
    <div className={cn('relative pl-3', className)}>
      <div className="absolute left-3 top-2 bottom-2 w-px bg-white/[0.08]" />
      <div className="space-y-6">
        {displayEvents.map((event, index) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: index * 0.05 }}
            className="relative pl-6"
          >
            <div className="absolute -left-1.5 top-1.5 flex h-3 w-3 items-center justify-center rounded-full bg-surface-base ring-4 ring-surface-base">
              <div className={cn('h-1.5 w-1.5 rounded-full', getTypeColor(event.type))} />
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-4">
                <h4 className="text-sm font-medium text-white/90">{event.title}</h4>
                <time className="text-xs text-white/36 whitespace-nowrap">{event.timestamp}</time>
              </div>
              {event.description && <p className="text-sm text-white/56">{event.description}</p>}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
