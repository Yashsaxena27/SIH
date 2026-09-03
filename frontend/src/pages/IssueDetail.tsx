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
import { cn, timeAgo, formatDate, getValidLatLng } from '@/lib/utils';
import type { UrbanIssue, Ticket as TicketType } from '@/types';

export function IssueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [issue, setIssue] = useState<UrbanIssue | null>(null);
  const [ticket, setTicket] = useState<TicketType | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  const fetchData = () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    Promise.allSettled([
      api.getIssue(id),
      api.getTickets()
    ]).then(([issueData, tickets]) => {
      const isAllRejected = issueData.status === 'rejected' && tickets.status === 'rejected';
      if (isAllRejected || (issueData.status === 'fulfilled' && !issueData.value)) {
        setError('Failed to load issue details.');
        setLoading(false);
        return;
      }
      setIssue(issueData.status === 'fulfilled' ? (issueData.value || null) : null);
      setTicket(tickets.status === 'fulfilled' ? (tickets.value.find(t => t.issueId === id) || tickets.value[0] || null) : null);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  if (loading) return <LoadingState message="Loading issue details..." className="h-full" />;

  if (error || !issue) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-var(--spacing-header-height))] bg-background">
        <h2 className="font-headline-md text-on-surface">Data Unavailable</h2>
        <p className="text-on-surface-variant mb-4">{error || 'Issue not found'}</p>
        <button onClick={() => navigate('/issues')} className="px-4 py-2 bg-primary text-on-primary rounded hover:bg-primary/90">
          Back to Issues
        </button>
      </div>
    );
  }

  const handleAction = async (action: string, status: string) => {
    if (!issue) return;
    setActionLoading(action);
    await api.updateIssue(issue.id, { status: status as any });
    await fetchData();
    setActionLoading(null);
  };

  if (loading) return <LoadingState message="Loading issue intelligence..." className="h-full" />;
  if (!issue) return <div className="p-8 text-center text-on-surface-variant">Issue not found</div>;

  const isCritical = issue.severity === 'critical';

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex items-start gap-4">
        <button 
          onClick={() => navigate('/issues')}
          className="p-2 rounded-lg bg-surface-container border border-outline-variant text-on-surface-variant hover:bg-surface-high hover:text-on-surface transition-colors mt-1"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={cn(
              "flex items-center gap-1.5 px-2.5 py-0.5 rounded font-label-caps border",
              isCritical ? 'bg-red-500/10 text-red-400 border-red-500/20' :
              issue.severity === 'high' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
              issue.severity === 'medium' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
              'bg-blue-500/10 text-blue-400 border-blue-500/20'
            )}>
              {isCritical ? <ShieldAlert className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
              {issue.severity} Severity
            </span>
            <span className="font-data-mono text-on-surface-variant text-[10px] tracking-wider">#{issue.id}</span>
            <span className={cn(
              "ml-auto px-3 py-1 rounded-full font-label-caps",
              issue.status === 'verified' ? 'bg-emerald-500/20 text-emerald-400' :
              issue.status === 'open' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'
            )}>
              Status: {(issue.status || 'unknown').replace(/_/g, ' ')}
            </span>
          </div>
          <h1 className="font-headline-md text-on-surface capitalize mb-2">
            {(issue.type || 'unknown').replace(/_/g, ' ')}
          </h1>
          <div className="flex items-center gap-4 text-sm text-on-surface-variant">
            <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {issue.location?.address || 'Bengaluru Municipal Road'}</span>
            <span className="w-1 h-1 rounded-full bg-outline-variant" />
            <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> First seen {formatDate(issue.firstDetectedAt, 'long')}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ── Left Column: Evidence & Obs ─────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* AI Evidence Frame */}
          <GlassPanel padding="none" className="overflow-hidden relative group border-outline-variant">
            {/* Mock Image Feed Background */}
            <div className="aspect-video w-full relative bg-surface-lowest overflow-hidden">
              {/* Simulated camera noise & vignette */}
              <div className="absolute inset-0 opacity-[0.15]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }} />
              <div className="absolute inset-0 shadow-[inset_0_0_100px_rgba(0,0,0,0.8)]" />
              
              {/* Abstract representation of the road */}
              <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-white/5 to-transparent" />
              
              {/* Bounding Box Overlay */}
              <motion.div 
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className={cn(
                  "absolute top-[40%] left-[35%] w-[30%] h-[25%] border-2 bg-black/20 flex flex-col justify-between",
                  isCritical ? 'border-status-critical shadow-[0_0_20px_rgba(220,38,38,0.5)]' : 'border-primary shadow-[0_0_20px_rgba(190,198,224,0.3)]'
                )}
              >
                {/* Corner brackets */}
                <div className={cn("absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2", isCritical ? 'border-status-critical' : 'border-primary')} />
                <div className={cn("absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2", isCritical ? 'border-status-critical' : 'border-primary')} />
                <div className={cn("absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2", isCritical ? 'border-status-critical' : 'border-primary')} />
                <div className={cn("absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2", isCritical ? 'border-status-critical' : 'border-primary')} />
                
                {/* Label */}
                <div className={cn(
                  "absolute -top-6 left-0 px-2 py-0.5 text-[10px] font-mono font-bold text-black uppercase",
                  isCritical ? 'bg-status-critical text-white' : 'bg-primary text-black'
                )}>
                  {(issue.type || 'unknown').replace(/_/g, ' ')} · {((issue.confidence ?? 0) * 100).toFixed(1)}%
                </div>
              </motion.div>

              {/* Camera HUD */}
              <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
                <div className="flex flex-col gap-1">
                  <span className="flex items-center gap-1.5 text-red-500 text-[10px] font-bold font-mono tracking-widest"><div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> REC</span>
                  <span className="text-on-surface text-[10px] font-data-mono bg-surface/60 px-2 py-1 rounded backdrop-blur-md border border-outline-variant">CAM_FR_01</span>
                </div>
                <div className="flex flex-col items-end gap-1 text-right">
                  <span className="text-on-surface text-[10px] font-data-mono bg-surface/60 px-2 py-1 rounded backdrop-blur-md border border-outline-variant">{formatDate(issue.lastObservedAt, 'long')}</span>
                  {(() => {
                    const pos = getValidLatLng(issue);
                    return (
                      <span className="text-on-surface-variant text-[10px] font-data-mono bg-surface/60 px-2 py-1 rounded backdrop-blur-md border border-outline-variant">
                        GPS: {pos ? `${pos[0].toFixed(6)}, ${pos[1].toFixed(6)}` : 'N/A'}
                      </span>
                    );
                  })()}
                </div>
              </div>
            </div>
          </GlassPanel>

          {/* Observations */}
          <GlassPanel className="border-outline-variant">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-label-caps text-on-surface-variant flex items-center gap-2">
                <GitMerge className="w-4 h-4 text-secondary" /> Clustered Observations
              </h3>
              <div className="px-3 py-1 rounded-full bg-surface-container border border-outline-variant text-xs font-medium text-on-surface-variant">
                {issue.observationCount} Total Captures
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {Array.from({ length: Math.min(issue.observationCount, 6) }).map((_, i) => (
                <div key={i} className="p-3 rounded bg-surface-container border border-outline-variant hover:bg-surface-high transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex items-center gap-1.5 text-xs font-data-mono text-on-surface-variant bg-surface px-2 py-0.5 rounded">
                      <Bus className="w-3 h-3 text-primary" /> BUS-0{Math.floor(Math.random() * 90) + 10}
                    </span>
                    <span className="text-[10px] text-on-surface-variant">{timeAgo(new Date(issue.lastObservedAt).getTime() - (i * 3600000))}</span>
                  </div>
                  <div className="flex justify-between items-end text-xs">
                    <span className="text-on-surface-variant flex items-center gap-1"><Camera className="w-3 h-3"/> Image Logged</span>
                    <span className="font-data-mono text-status-healthy">{(90 + Math.random() * 9).toFixed(1)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </GlassPanel>

        </div>

        {/* ── Right Column: Actions & Meta ──────────────────── */}
        <div className="space-y-6">
          
          {/* Action Panel */}
          <GlassPanel className="border-primary/20 bg-primary/5">
            <h3 className="font-label-caps text-on-surface-variant mb-4">Command Actions (Demo)</h3>
            <div className="space-y-3">
              <button 
                onClick={() => handleAction('assign', 'assigned')}
                disabled={!!actionLoading}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-surface-container hover:bg-surface-high border border-outline-variant text-sm font-medium text-on-surface transition-all text-left group"
              >
                <div className="w-8 h-8 rounded-md bg-purple-500/20 text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Ticket className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div>Assign Department</div>
                  <div className="text-[10px] text-on-surface-variant font-normal">Route to appropriate municipal body</div>
                </div>
                {actionLoading === 'assign' && <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />}
              </button>

              <button 
                onClick={() => handleAction('verify', 'verifying')}
                disabled={!!actionLoading}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-surface-container hover:bg-surface-high border border-outline-variant text-sm font-medium text-on-surface transition-all text-left group"
              >
                <div className="w-8 h-8 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div>Start Verification</div>
                  <div className="text-[10px] text-on-surface-variant font-normal">Queue buses to inspect repair status</div>
                </div>
                {actionLoading === 'verify' && <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />}
              </button>
            </div>
          </GlassPanel>

          {/* Connected Ticket */}
          <GlassPanel className="border-outline-variant">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-label-caps text-on-surface-variant">Connected Ticket</h3>
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
                <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
                  <span className="text-on-surface-variant text-sm">Ticket ID</span>
                  <span className="text-on-surface font-data-mono font-medium">{ticket.id}</span>
                </div>
                <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
                  <span className="text-on-surface-variant text-sm">Department</span>
                  <span className="text-on-surface font-medium">{ticket.departmentId}</span>
                </div>
                <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
                  <span className="text-on-surface-variant text-sm">Assigned To</span>
                  <span className="text-on-surface font-medium">{ticket.assignedTo || 'Unassigned'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-on-surface-variant text-sm">Status</span>
                  <span className="text-on-surface font-medium uppercase text-xs">{(ticket.status || 'unknown').replace(/_/g, ' ')}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-on-surface-variant text-sm">
                No active ticket associated.
              </div>
            )}
          </GlassPanel>

          {/* Timeline */}
          <GlassPanel className="border-outline-variant">
            <h3 className="font-label-caps text-on-surface-variant mb-6">Issue Lifecycle</h3>
            
            <div className="relative pl-4 space-y-6">
              <div className="absolute left-[23px] top-4 bottom-4 w-0.5 bg-outline-variant" />

              {[
                { label: 'Issue Resolved', active: issue.status === 'verified', icon: CheckCircle, color: 'text-emerald-400' },
                { label: 'Verification Run', active: issue.status === 'verifying', icon: ShieldCheck, color: 'text-blue-400' },
                { label: 'Repair Reported', active: issue.status === 'repair_reported', icon: PenTool, color: 'text-yellow-400' },
                { label: 'Ticket Assigned', active: issue.status === 'assigned' || ticket?.status === 'assigned', icon: Ticket, color: 'text-purple-400' },
                { label: 'Clustered (4 Obs)', active: true, icon: GitMerge, color: 'text-secondary' },
                { label: 'Initial Detection', active: true, icon: AlertTriangle, color: 'text-orange-400' },
              ].map((step, idx) => (
                <div key={idx} className="relative pl-8">
                  <div className={cn(
                    "absolute left-[-11px] top-[-2px] w-7 h-7 rounded-full flex items-center justify-center border-2 bg-surface",
                    step.active ? `border-outline-variant ${step.color}` : "border-outline-variant text-on-surface-variant/20"
                  )}>
                    <step.icon className="w-3.5 h-3.5" />
                  </div>
                  <div className={cn("text-sm font-medium", step.active ? "text-on-surface" : "text-on-surface-variant/50")}>
                    {step.label}
                  </div>
                  {step.active && idx > 3 && <div className="text-[10px] font-data-mono text-on-surface-variant mt-0.5">{timeAgo(issue.firstDetectedAt)}</div>}
                </div>
              ))}
            </div>
          </GlassPanel>

        </div>
      </div>
    </div>
  );
}
