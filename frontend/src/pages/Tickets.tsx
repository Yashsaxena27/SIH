// ============================================================
// Tickets Page — Municipal Work Tickets
// ============================================================

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Ticket, Clock, Building2, AlertCircle, CheckCircle2, 
  RotateCcw, UserPlus, Play, Check, Send, AlertTriangle, RefreshCw, User,
  ShieldAlert, Activity, CheckCircle, FileText
} from 'lucide-react';
import { PageHeader, GlassPanel, SeverityBadge, LoadingState, EmptyState } from '@/components/ui';
import { api } from '@/services/api';
import { cn, timeAgo } from '@/lib/utils';
import type { Ticket as TicketType } from '@/types';

const slaColors: Record<string, { text: string; bg: string; border: string; glow: string }> = {
  on_track: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', glow: 'shadow-emerald-500/10' },
  at_risk: { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', glow: 'shadow-amber-500/10' },
  breached: { text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30', glow: 'shadow-rose-500/10' },
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
        setTickets(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(_err => {
        setError('Failed to load tickets telemetry.');
        setLoading(false);
      });
  };

  const handleTicketAction = async (ticketId: string, action: string) => {
    setActionLoading(ticketId);
    try {
      if (action === 'assign') {
        await api.assignTicket(ticketId, 'OP-001'); // Hardcoded operator for demo workflow
      } else if (action === 'start') {
        await api.updateTicketStatus(ticketId, 'in_progress');
      } else if (action === 'report_repair') {
        await api.updateTicketStatus(ticketId, 'repair_reported');
      } else if (action === 'send_verification') {
        await api.updateTicketStatus(ticketId, 'verifying');
      }
      
      // Reload tickets to get latest state
      const updated = await api.getTickets();
      setTickets(Array.isArray(updated) ? updated : []);
    } catch (err) {
      console.error('Failed to update ticket status', err);
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute summary stats dynamically from existing loaded tickets array
  const stats = useMemo(() => {
    const total = tickets.length;
    const openCount = tickets.filter(t => t.status === 'open' || t.status === 'reopened').length;
    const activeCount = tickets.filter(t => t.status === 'in_progress' || t.status === 'assigned').length;
    const verificationCount = tickets.filter(t => t.status === 'verifying' || t.status === 'repair_reported').length;
    const breachedCount = tickets.filter(t => t.slaStatus === 'breached' || t.slaStatus === 'at_risk').length;

    return { total, openCount, activeCount, verificationCount, breachedCount };
  }, [tickets]);

  if (loading) return <LoadingState message="Loading municipal work tickets..." size="lg" className="h-full min-h-[500px]" />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 bg-background">
        <GlassPanel padding="lg" className="max-w-md text-center space-y-4 border-red-500/20 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-status-critical">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-on-surface">Data Telemetry Unavailable</h2>
          <p className="text-xs text-on-surface-variant leading-relaxed">{error}</p>
          <button 
            onClick={loadData} 
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-on-primary rounded-xl text-xs font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry Connection
          </button>
        </GlassPanel>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1920px] mx-auto pb-20">
      <PageHeader
        title="Tickets"
        subtitle={`${tickets.length} municipal work tickets active across department queues`}
        breadcrumbs={[{ label: 'Operations' }, { label: 'Tickets' }]}
        action={
          <button 
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-on-surface border border-outline-variant/80 transition-all hover:border-primary/40 shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5 text-primary" /> Refresh Queue
          </button>
        }
      />

      {/* Visual KPI Summary Header derived from loaded ticket state */}
      {tickets.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <GlassPanel className="p-4 border-outline-variant/60 flex items-center gap-3.5 relative overflow-hidden group">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-mono uppercase tracking-wider text-on-surface-variant font-medium">Total Tickets</p>
              <p className="text-xl sm:text-2xl font-black text-on-surface font-mono tracking-tight">{stats.total}</p>
            </div>
            <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </GlassPanel>

          <GlassPanel className="p-4 border-outline-variant/60 flex items-center gap-3.5 relative overflow-hidden group">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-mono uppercase tracking-wider text-on-surface-variant font-medium">Active Work</p>
              <p className="text-xl sm:text-2xl font-black text-amber-400 font-mono tracking-tight">{stats.activeCount + stats.openCount}</p>
            </div>
            <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-500/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </GlassPanel>

          <GlassPanel className="p-4 border-outline-variant/60 flex items-center gap-3.5 relative overflow-hidden group">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-mono uppercase tracking-wider text-on-surface-variant font-medium">Pending Review</p>
              <p className="text-xl sm:text-2xl font-black text-purple-400 font-mono tracking-tight">{stats.verificationCount}</p>
            </div>
            <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-500/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </GlassPanel>

          <GlassPanel className="p-4 border-outline-variant/60 flex items-center gap-3.5 relative overflow-hidden group">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-mono uppercase tracking-wider text-on-surface-variant font-medium">At Risk / Breached</p>
              <p className="text-xl sm:text-2xl font-black text-rose-400 font-mono tracking-tight">{stats.breachedCount}</p>
            </div>
            <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-rose-500/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </GlassPanel>
        </div>
      )}

      {tickets.length === 0 ? (
        <div className="p-12">
          <EmptyState
            icon={Ticket}
            title="No Work Tickets"
            description="There are currently no active municipal work tickets. Tickets will appear once road damage issues are prioritized."
          />
        </div>
      ) : (
        <div className="space-y-3.5">
          {tickets.map((ticket, index) => {
            const StatusIcon = ticketStatusIcons[ticket.status] || AlertCircle;
            const slaKey = ticket.slaStatus || 'on_track';
            const slaStyle = slaColors[slaKey] || slaColors.on_track;
            const isLoadingThis = actionLoading === ticket.id;

            const isCritical = ticket.severity === 'critical';
            const isHigh = ticket.severity === 'high';

            return (
              <motion.div
                key={ticket.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04, duration: 0.25 }}
              >
                <GlassPanel 
                  padding="lg" 
                  className={cn(
                    "relative overflow-hidden border-outline-variant/80 hover:border-primary/50 shadow-lg hover:shadow-2xl backdrop-blur-xl rounded-2xl transition-all duration-300 group",
                    isCritical && "border-l-4 border-l-rose-500",
                    isHigh && "border-l-4 border-l-amber-500",
                    !isCritical && !isHigh && "border-l-4 border-l-primary/60"
                  )}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                    
                    {/* Left Info Column */}
                    <div className="flex items-start gap-4 min-w-0 flex-1">
                      <div className={cn(
                        "w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 shadow-md transition-transform duration-300 group-hover:scale-105 mt-0.5",
                        isCritical ? "bg-rose-500/10 border-rose-500/30 text-rose-400" :
                        isHigh ? "bg-amber-500/10 border-amber-500/30 text-amber-400" :
                        "bg-primary/10 border-primary/30 text-primary"
                      )}>
                        <Ticket className="w-5 h-5" />
                      </div>

                      <div className="min-w-0 space-y-2 flex-1">
                        {/* Header Badges Row */}
                        <div className="flex items-center gap-2 flex-wrap font-mono">
                          <span className="text-[11px] font-bold tracking-wider text-on-surface bg-surface-container-high border border-outline-variant px-2.5 py-0.8 rounded-lg shadow-inner">
                            {ticket.displayId || ticket.id}
                          </span>
                          
                          <SeverityBadge severity={ticket.severity || 'medium'} size="sm" />
                          
                          <span className={cn(
                            'inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.8 rounded-lg border shadow-sm',
                            slaStyle.bg, slaStyle.text, slaStyle.border
                          )}>
                            <StatusIcon className="w-3 h-3" />
                            {(ticket.status || 'open').replace(/_/g, ' ')}
                          </span>
                        </div>

                        {/* Title */}
                        <h3 className="text-base sm:text-lg font-extrabold text-on-surface tracking-tight leading-snug group-hover:text-primary transition-colors">
                          {ticket.title}
                        </h3>

                        {/* Metadata Tag Row */}
                        <div className="flex items-center gap-3 sm:gap-5 text-xs text-on-surface-variant font-mono flex-wrap pt-0.5">
                          <span className="inline-flex items-center gap-1.5 bg-surface-container/60 px-2.5 py-1 rounded-md border border-outline-variant/40">
                            <Building2 className="w-3.5 h-3.5 text-primary" />
                            {ticket.departmentName || 'BBMP Infrastructure'}
                          </span>
                          
                          <span className="inline-flex items-center gap-1.5 bg-surface-container/60 px-2.5 py-1 rounded-md border border-outline-variant/40">
                            <Clock className="w-3.5 h-3.5 text-on-surface-variant/80" />
                            {timeAgo(ticket.updatedAt || ticket.createdAt)}
                          </span>

                          {ticket.assignedOfficer && (
                            <span className="inline-flex items-center gap-1.5 text-on-surface font-semibold bg-blue-500/10 px-2.5 py-1 rounded-md border border-blue-500/20 text-blue-300">
                              <User className="w-3.5 h-3.5 text-blue-400" /> {ticket.assignedOfficer}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right SLA & Action Column */}
                    <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-center gap-3 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-outline-variant/40">
                      <div className={cn(
                        'text-[11px] font-mono font-bold px-3 py-1 rounded-lg border uppercase tracking-wider shadow-sm',
                        slaStyle.bg, slaStyle.text, slaStyle.border
                      )}>
                        SLA: {slaKey.replace('_', ' ')}
                      </div>

                      <div className="flex items-center gap-2">
                        {ticket.status === 'open' && (
                          <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={(e) => { e.stopPropagation(); handleTicketAction(ticket.id, 'assign'); }}
                            disabled={isLoadingThis}
                            className="flex items-center gap-2 px-4 py-2 text-xs font-mono font-bold bg-primary text-on-primary hover:bg-primary/90 rounded-xl shadow-md transition-all disabled:opacity-50"
                          >
                            {isLoadingThis ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />} Assign Officer
                          </motion.button>
                        )}
                        {ticket.status === 'assigned' && (
                          <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={(e) => { e.stopPropagation(); handleTicketAction(ticket.id, 'start'); }}
                            disabled={isLoadingThis}
                            className="flex items-center gap-2 px-4 py-2 text-xs font-mono font-bold bg-blue-600 text-white hover:bg-blue-500 rounded-xl shadow-md transition-all disabled:opacity-50"
                          >
                            {isLoadingThis ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />} Start Work
                          </motion.button>
                        )}
                        {ticket.status === 'in_progress' && (
                          <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={(e) => { e.stopPropagation(); handleTicketAction(ticket.id, 'report_repair'); }}
                            disabled={isLoadingThis}
                            className="flex items-center gap-2 px-4 py-2 text-xs font-mono font-bold bg-emerald-600 text-white hover:bg-emerald-500 rounded-xl shadow-md transition-all disabled:opacity-50"
                          >
                            {isLoadingThis ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Report Repair
                          </motion.button>
                        )}
                        {ticket.status === 'repair_reported' && (
                          <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={(e) => { e.stopPropagation(); handleTicketAction(ticket.id, 'send_verification'); }}
                            disabled={isLoadingThis}
                            className="flex items-center gap-2 px-4 py-2 text-xs font-mono font-bold bg-purple-600 text-white hover:bg-purple-500 rounded-xl shadow-md transition-all disabled:opacity-50"
                          >
                            {isLoadingThis ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Send Verification
                          </motion.button>
                        )}
                        {ticket.status === 'reopened' && (
                          <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={(e) => { e.stopPropagation(); handleTicketAction(ticket.id, 'start'); }}
                            disabled={isLoadingThis}
                            className="flex items-center gap-2 px-4 py-2 text-xs font-mono font-bold bg-amber-600 text-white hover:bg-amber-500 rounded-xl shadow-md transition-all disabled:opacity-50"
                          >
                            {isLoadingThis ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />} Resume Work
                          </motion.button>
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

