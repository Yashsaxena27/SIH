// ============================================================
// Tickets Page — Municipal work tickets
// ============================================================

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Ticket, Clock, Building2, AlertCircle, CheckCircle2, RotateCcw, UserPlus, Play, Check, Send } from 'lucide-react';
import { PageHeader, GlassPanel, SeverityBadge, LoadingState, EmptyState } from '@/components/ui';
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
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    setError(null);
    api.getTickets()
      .then(data => {
        setTickets(data);
        setLoading(false);
      })
      .catch(_err => {
        setError('Failed to load tickets.');
        setLoading(false);
      });
  };

  const handleTicketAction = async (ticketId: string, action: string) => {
    setActionLoading(ticketId);
    try {
      if (action === 'assign') {
        await api.assignTicket(ticketId, 'OP-001'); // Hardcoded operator for demo
      } else if (action === 'start') {
        await api.updateTicketStatus(ticketId, 'in_progress');
      } else if (action === 'report_repair') {
        await api.updateTicketStatus(ticketId, 'repair_reported');
      } else if (action === 'send_verification') {
        await api.updateTicketStatus(ticketId, 'verifying');
      }
      
      // Reload tickets to get latest state
      const updated = await api.getTickets();
      setTickets(updated);
    } catch (err) {
      console.error('Failed to update ticket', err);
    } finally {
      setActionLoading(null);
    }
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

      {tickets.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title="No Work Tickets"
          description="There are currently no active municipal work tickets. Tickets will appear once road damage issues are prioritized."
        />
      ) : (
        <div className="space-y-2">
          {tickets.map((ticket, index) => {
            const StatusIcon = ticketStatusIcons[ticket.status] || AlertCircle;
            const sla = ticket.slaStatus || 'on_track';
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
                          <SeverityBadge severity={ticket.severity || 'medium'} size="sm" />
                          <span className={cn(
                            'flex items-center gap-1 text-[10px] font-medium',
                            slaColors[sla] || 'text-status-healthy'
                          )}>
                            <StatusIcon className="w-3 h-3" />
                            {(ticket.status || 'open').replace(/_/g, ' ')}
                          </span>
                        </div>
                        <h3 className="text-sm font-medium text-on-surface mt-1">{ticket.title}</h3>
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          <span className="flex items-center gap-1 text-xs text-on-surface-variant">
                            <Building2 className="w-3 h-3" />
                            {ticket.departmentName || 'BBMP Infrastructure'}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-on-surface-variant">
                            <Clock className="w-3 h-3" />
                            {timeAgo(ticket.updatedAt || ticket.createdAt)}
                          </span>
                          {ticket.assignedOfficer && (
                            <span className="text-xs text-on-surface-variant">
                              → {ticket.assignedOfficer}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end justify-between gap-3 flex-shrink-0">
                      <div className={cn(
                        'text-right text-xs font-medium',
                        slaColors[sla] || 'text-status-healthy'
                      )}>
                        SLA: {sla.replace('_', ' ')}
                      </div>
                      <div className="flex items-center gap-2">
                        {ticket.status === 'open' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleTicketAction(ticket.id, 'assign'); }}
                            disabled={actionLoading === ticket.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary/20 text-primary hover:bg-primary/30 rounded border border-primary/30 transition-colors disabled:opacity-50"
                          >
                            <UserPlus className="w-3.5 h-3.5" /> Assign
                          </button>
                        )}
                        {ticket.status === 'assigned' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleTicketAction(ticket.id, 'start'); }}
                            disabled={actionLoading === ticket.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded border border-blue-500/30 transition-colors disabled:opacity-50"
                          >
                            <Play className="w-3.5 h-3.5" /> Start Work
                          </button>
                        )}
                        {ticket.status === 'in_progress' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleTicketAction(ticket.id, 'report_repair'); }}
                            disabled={actionLoading === ticket.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded border border-emerald-500/30 transition-colors disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5" /> Report Repair
                          </button>
                        )}
                        {ticket.status === 'repair_reported' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleTicketAction(ticket.id, 'send_verification'); }}
                            disabled={actionLoading === ticket.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 rounded border border-purple-500/30 transition-colors disabled:opacity-50"
                          >
                            <Send className="w-3.5 h-3.5" /> Send for Verification
                          </button>
                        )}
                        {ticket.status === 'reopened' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleTicketAction(ticket.id, 'start'); }}
                            disabled={actionLoading === ticket.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 rounded border border-orange-500/30 transition-colors disabled:opacity-50"
                          >
                            <Play className="w-3.5 h-3.5" /> Resume Work
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </GlassPanel>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
