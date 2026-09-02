// ============================================================
// IssueDetail Page — Premium Civic Issue Intelligence
// ============================================================

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, MapPin, Bus, Clock, ShieldCheck, 
  AlertTriangle, ShieldAlert, AlertCircle, Info,
  Camera, Ticket, GitMerge, CheckCircle, PenTool
} from 'lucide-react';
import { GlassPanel, LoadingState } from '@/components/ui';
import { api } from '@/services/api';
import { cn, timeAgo, formatDate } from '@/lib/utils';
import type { UrbanIssue, Ticket as TicketType } from '@/types';

export function IssueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [issue, setIssue] = useState<UrbanIssue | null>(null);
  const [ticket, setTicket] = useState<TicketType | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = () => {
    if (!id) return;
    Promise.all([
      api.getIssue(id),
      api.getTickets() // Mocking related ticket fetch
    ]).then(([issueData, tickets]) => {
      setIssue(issueData || null);
      setTicket(tickets.find(t => t.issueId === id) || tickets[0] || null);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleAction = async (action: string, status: string) => {
    if (!issue) return;
    setActionLoading(action);
    await api.updateIssue(issue.id, { status: status as any });
    await fetchData();
    setActionLoading(null);
  };

  if (loading) return <LoadingState message="Loading issue intelligence..." className="h-full" />;
  if (!issue) return <div className="p-8 text-center text-black/50">Issue not found</div>;

  const isCritical = issue.severity === 'critical';

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex items-start gap-4">
        <button 
          onClick={() => navigate('/issues')}
          className="p-2 rounded-lg bg-black/[0.03] border border-black/[0.08] text-black/50 hover:text-black hover:bg-black/[0.08] transition-colors mt-1"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={cn(
              "flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-widest border",
              isCritical ? 'bg-red-500/10 text-red-400 border-red-500/20' :
              issue.severity === 'high' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
              issue.severity === 'medium' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
              'bg-blue-500/10 text-blue-400 border-blue-500/20'
            )}>
              {isCritical ? <ShieldAlert className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
              {issue.severity} Severity
            </span>
            <span className="text-xs text-black/40 font-mono tracking-wider">#{issue.id}</span>
            <span className={cn(
              "ml-auto px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
              issue.status === 'verified' ? 'bg-emerald-500/20 text-emerald-400' :
              issue.status === 'open' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'
            )}>
              Status: {(issue.status || 'unknown').replace(/_/g, ' ')}
            </span>
          </div>
          <h1 className="text-3xl font-bold text-black/95 capitalize tracking-tight mb-2">
            {(issue.type || 'unknown').replace(/_/g, ' ')}
          </h1>
          <div className="flex items-center gap-4 text-sm text-black/50">
            <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {issue.location.address}</span>
            <span className="w-1 h-1 rounded-full bg-black/20" />
            <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> First seen {formatDate(issue.firstDetectedAt, 'long')}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ── Left Column: Evidence & Obs ─────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* AI Evidence Frame */}
          <GlassPanel padding="none" className="overflow-hidden relative group">
            {/* Mock Image Feed Background */}
            <div className="aspect-video w-full relative bg-[#1a1a24] overflow-hidden">
              {/* Simulated camera noise & vignette */}
              <div className="absolute inset-0 opacity-[0.15]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }} />
              <div className="absolute inset-0 shadow-[inset_0_0_100px_rgba(0,0,0,0.8)]" />
              
              {/* Abstract representation of the road */}
              <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/5 to-transparent" />
              
              {/* Bounding Box Overlay */}
              <motion.div 
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className={cn(
                  "absolute top-[40%] left-[35%] w-[30%] h-[25%] border-2 bg-black/20 flex flex-col justify-between",
                  isCritical ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)]' : 'border-accent-primary shadow-[0_0_20px_rgba(99,102,241,0.5)]'
                )}
              >
                {/* Corner brackets */}
                <div className={cn("absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2", isCritical ? 'border-red-400' : 'border-accent-primary-hover')} />
                <div className={cn("absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2", isCritical ? 'border-red-400' : 'border-accent-primary-hover')} />
                <div className={cn("absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2", isCritical ? 'border-red-400' : 'border-accent-primary-hover')} />
                <div className={cn("absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2", isCritical ? 'border-red-400' : 'border-accent-primary-hover')} />
                
                {/* Label */}
                <div className={cn(
                  "absolute -top-6 left-0 px-2 py-0.5 text-[10px] font-mono font-bold text-black uppercase",
                  isCritical ? 'bg-red-500' : 'bg-accent-primary'
                )}>
                  {(issue.type || 'unknown').replace(/_/g, ' ')} · {((issue.confidence ?? 0) * 100).toFixed(1)}%
                </div>
              </motion.div>

              {/* Camera HUD */}
              <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
                <div className="flex flex-col gap-1">
                  <span className="flex items-center gap-1.5 text-red-500 text-[10px] font-bold font-mono tracking-widest"><div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> REC</span>
                  <span className="text-black/70 text-[10px] font-mono bg-black/40 px-2 py-1 rounded backdrop-blur-md border border-black/[0.05]">CAM_FR_01</span>
                </div>
                <div className="flex flex-col items-end gap-1 text-right">
                  <span className="text-black/90 text-[10px] font-mono bg-black/40 px-2 py-1 rounded backdrop-blur-md border border-black/[0.05]">{formatDate(issue.lastObservedAt, 'long')}</span>
                  <span className="text-black/60 text-[10px] font-mono bg-black/40 px-2 py-1 rounded backdrop-blur-md border border-black/[0.05]">GPS: {issue.location.coordinates[1].toFixed(6)}, {issue.location.coordinates[0].toFixed(6)}</span>
                </div>
              </div>
            </div>
          </GlassPanel>

          {/* Observations */}
          <GlassPanel>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-bold text-black/90 uppercase tracking-widest flex items-center gap-2">
                <GitMerge className="w-4 h-4 text-accent-secondary" /> Clustered Observations
              </h3>
              <div className="px-3 py-1 rounded-full bg-black/[0.04] border border-black/[0.08] text-xs font-medium text-black/70">
                {issue.observationCount} Total Captures
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {Array.from({ length: Math.min(issue.observationCount, 6) }).map((_, i) => (
                <div key={i} className="p-3 rounded-xl bg-black/[0.02] border border-black/[0.06] hover:bg-black/[0.04] transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex items-center gap-1.5 text-xs font-mono text-black/70 bg-black/[0.05] px-2 py-0.5 rounded-md">
                      <Bus className="w-3 h-3 text-accent-primary" /> BUS-0{Math.floor(Math.random() * 90) + 10}
                    </span>
                    <span className="text-[10px] text-black/40">{timeAgo(new Date(issue.lastObservedAt).getTime() - (i * 3600000))}</span>
                  </div>
                  <div className="flex justify-between items-end text-xs">
                    <span className="text-black/40 flex items-center gap-1"><Camera className="w-3 h-3"/> Image Logged</span>
                    <span className="text-emerald-400 font-mono">{(90 + Math.random() * 9).toFixed(1)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </GlassPanel>

        </div>

        {/* ── Right Column: Actions & Meta ──────────────────── */}
        <div className="space-y-6">
          
          {/* Action Panel */}
          <GlassPanel className="border-accent-primary/20 bg-accent-primary/[0.02]">
            <h3 className="text-xs font-bold text-black/60 uppercase tracking-widest mb-4">Command Actions (Demo)</h3>
            <div className="space-y-3">
              <button 
                onClick={() => handleAction('assign', 'assigned')}
                disabled={!!actionLoading}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-black/[0.04] hover:bg-black/[0.08] border border-black/[0.08] text-sm font-medium text-black/90 transition-all text-left group"
              >
                <div className="w-8 h-8 rounded-md bg-purple-500/20 text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Ticket className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div>Assign Department</div>
                  <div className="text-[10px] text-black/40 font-normal">Route to appropriate municipal body</div>
                </div>
                {actionLoading === 'assign' && <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />}
              </button>

              <button 
                onClick={() => handleAction('verify', 'verifying')}
                disabled={!!actionLoading}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-black/[0.04] hover:bg-black/[0.08] border border-black/[0.08] text-sm font-medium text-black/90 transition-all text-left group"
              >
                <div className="w-8 h-8 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div>Start Verification</div>
                  <div className="text-[10px] text-black/40 font-normal">Queue buses to inspect repair status</div>
                </div>
                {actionLoading === 'verify' && <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />}
              </button>
            </div>
          </GlassPanel>

          {/* Connected Ticket */}
          <GlassPanel>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-black/60 uppercase tracking-widest">Connected Ticket</h3>
              {ticket && (
                <span className={cn("text-[10px] px-2 py-0.5 rounded font-bold uppercase", 
                  ticket.slaStatus === 'breached' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
                )}>
                  SLA {ticket.slaStatus}
                </span>
              )}
            </div>
            
            {ticket ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-black/[0.06]">
                  <span className="text-black/40 text-sm">Ticket ID</span>
                  <span className="text-black/90 font-mono font-medium">{ticket.id}</span>
                </div>
                <div className="flex items-center justify-between pb-3 border-b border-black/[0.06]">
                  <span className="text-black/40 text-sm">Department</span>
                  <span className="text-black/90 font-medium">{ticket.departmentId}</span>
                </div>
                <div className="flex items-center justify-between pb-3 border-b border-black/[0.06]">
                  <span className="text-black/40 text-sm">Assigned To</span>
                  <span className="text-black/90 font-medium">{ticket.assignedTo || 'Unassigned'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-black/40 text-sm">Status</span>
                  <span className="text-black/90 font-medium uppercase text-xs">{(ticket.status || 'unknown').replace(/_/g, ' ')}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-black/40 text-sm">
                No active ticket associated.
              </div>
            )}
          </GlassPanel>

          {/* Timeline */}
          <GlassPanel>
            <h3 className="text-xs font-bold text-black/60 uppercase tracking-widest mb-6">Issue Lifecycle</h3>
            
            <div className="relative pl-4 space-y-6">
              <div className="absolute left-[23px] top-4 bottom-4 w-0.5 bg-black/[0.06]" />

              {[
                { label: 'Issue Resolved', active: issue.status === 'verified', icon: CheckCircle, color: 'text-emerald-400' },
                { label: 'Verification Run', active: issue.status === 'verifying', icon: ShieldCheck, color: 'text-blue-400' },
                { label: 'Repair Reported', active: issue.status === 'repair_reported', icon: PenTool, color: 'text-yellow-400' },
                { label: 'Ticket Assigned', active: issue.status === 'assigned' || ticket?.status === 'assigned', icon: Ticket, color: 'text-purple-400' },
                { label: 'Clustered (4 Obs)', active: true, icon: GitMerge, color: 'text-accent-secondary' },
                { label: 'Initial Detection', active: true, icon: AlertTriangle, color: 'text-orange-400' },
              ].map((step, idx) => (
                <div key={idx} className="relative pl-8">
                  <div className={cn(
                    "absolute left-[-11px] top-[-2px] w-7 h-7 rounded-full flex items-center justify-center border-2 bg-surface-raised",
                    step.active ? `border-black/[0.1] ${step.color}` : "border-black/[0.04] text-black/20"
                  )}>
                    <step.icon className="w-3.5 h-3.5" />
                  </div>
                  <div className={cn("text-sm font-medium", step.active ? "text-black/90" : "text-black/30")}>
                    {step.label}
                  </div>
                  {step.active && idx > 3 && <div className="text-[10px] text-black/40 mt-0.5">{timeAgo(issue.firstDetectedAt)}</div>}
                </div>
              ))}
            </div>
          </GlassPanel>

        </div>
      </div>
    </div>
  );
}
