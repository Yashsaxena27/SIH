// ============================================================
// Tickets Page — Municipal work tickets
// ============================================================

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Ticket, Clock, Building2, AlertCircle, CheckCircle2, RotateCcw } from 'lucide-react';
import { PageHeader, GlassPanel, SeverityBadge, LoadingState } from '@/components/ui';
import { api } from '@/services/api';
import { cn, timeAgo } from '@/lib/utils';
import type { Ticket as TicketType } from '@/types';

const slaColors: Record<string, string> = {
  on_track: 'text-status-healthy',
  at_risk: 'text-yellow-400',
  breached: 'text-red-400',
};

const ticketStatusIcons: Record<string, typeof CheckCircle2> = {
  open: AlertCircle,
  assigned: RotateCcw,
  in_progress: RotateCcw,
  repair_reported: CheckCircle2,
  verifying: Clock,
  verified_resolved: CheckCircle2,
  verified_unresolved: AlertCircle,
  closed: CheckCircle2,
  reopened: AlertCircle,
};

export function TicketsPage() {
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    setError(null);
    api.getTickets()
      .then(data => {
        setTickets(data);
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to load tickets.');
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) return <LoadingState message="Loading tickets..." size="lg" className="h-full" />;

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

  return (
    <div className="p-6 space-y-5">
      <PageHeader
        title="Tickets"
        subtitle={`${tickets.length} municipal work tickets`}
        breadcrumbs={[{ label: 'Operations' }, { label: 'Tickets' }]}
      />

      <div className="space-y-2">
        {tickets.map((ticket, index) => {
          const StatusIcon = ticketStatusIcons[ticket.status] || AlertCircle;
          return (
            <motion.div
              key={ticket.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03, duration: 0.2 }}
            >
              <GlassPanel hover padding="md" className="cursor-pointer">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-1">
                      <Ticket className="w-4 h-4 text-on-surface-variant/60" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-data-mono text-white/36">{ticket.displayId}</span>
                        <SeverityBadge severity={ticket.severity} size="sm" />
                        <span className={cn(
                          'flex items-center gap-1 text-[10px] font-medium',
                          slaColors[ticket.slaStatus]
                        )}>
                          <StatusIcon className="w-3 h-3" />
                          {ticket.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <h3 className="text-sm font-medium text-on-surface mt-1">{ticket.title}</h3>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-on-surface-variant">
                          <Building2 className="w-3 h-3" />
                          {ticket.departmentName}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-on-surface-variant">
                          <Clock className="w-3 h-3" />
                          {timeAgo(ticket.updatedAt)}
                        </span>
                        {ticket.assignedOfficer && (
                          <span className="text-xs text-on-surface-variant">
                            → {ticket.assignedOfficer}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className={cn(
                    'text-right flex-shrink-0 text-xs font-medium',
                    slaColors[ticket.slaStatus]
                  )}>
                    SLA: {ticket.slaStatus.replace('_', ' ')}
                  </div>
                </div>
              </GlassPanel>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
