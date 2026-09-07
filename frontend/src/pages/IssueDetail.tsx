// ============================================================
// IssueDetail Page — Premium Civic Issue Intelligence
// Phase 7: Closed-Loop Verification 2.0 & Multi-Pass History
// ============================================================

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, MapPin, Bus, Clock, ShieldCheck, 
  AlertTriangle, ShieldAlert, AlertCircle, Info,
  Camera, Ticket, GitMerge, CheckCircle, PenTool,
  Activity, Route, RotateCcw, XCircle, HelpCircle, Eye,
  RefreshCw, Check, AlertOctagon, UserCheck, CornerDownRight
} from 'lucide-react';
import { GlassPanel, LoadingState } from '@/components/ui';
import { api } from '@/services/api';
import { simulator } from '@/services/api';
import { config } from '@/services/core/config';
import { cn, timeAgo, formatDate, getValidLatLng } from '@/lib/utils';
import type { UrbanIssue, Ticket as TicketType } from '@/types';
import type { Verification } from '@/types/verification';

export function IssueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [issue, setIssue] = useState<UrbanIssue | null>(null);
  const [ticket, setTicket] = useState<TicketType | null>(null);
  const [verificationsList, setVerificationsList] = useState<Verification[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [demoMessage, setDemoMessage] = useState<string | null>(null);

  // Reopen Modal state
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [reopenReason, setReopenReason] = useState('Defect re-emerged or unverified repair');
  const [reopenNotes, setReopenNotes] = useState('');

  const fetchData = () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    Promise.allSettled([
      api.getIssue(id),
      api.getTickets(),
      api.getVerifications({ issue_id: id })
    ]).then(([issueData, tickets, verifsData]) => {
      const isAllRejected = issueData.status === 'rejected' && tickets.status === 'rejected';
      if (isAllRejected || (issueData.status === 'fulfilled' && !issueData.value)) {
        setError('Failed to load issue details.');
        setLoading(false);
        return;
      }
      const loadedIssue = issueData.status === 'fulfilled' ? (issueData.value || null) : null;
      setIssue(loadedIssue);
      
      // STRICT: Only use connected ticket, never fallback to tickets[0]
      const connectedTicket = (loadedIssue as any)?.ticket || 
        (tickets.status === 'fulfilled' && Array.isArray(tickets.value) 
          ? (tickets.value.find(t => t.issueId === id || t.id === (loadedIssue as any)?.ticketId) || null) 
          : null);
      setTicket(connectedTicket);

      // Verifications list from API or loadedIssue
      if (verifsData.status === 'fulfilled' && Array.isArray(verifsData.value) && verifsData.value.length > 0) {
        setVerificationsList(verifsData.value);
      } else if (loadedIssue && (loadedIssue as any).verifications) {
        setVerificationsList((loadedIssue as any).verifications);
      } else if (loadedIssue && (loadedIssue as any).verification) {
        setVerificationsList([(loadedIssue as any).verification]);
      } else {
        setVerificationsList([]);
      }

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
    setDemoMessage(null);
    try {
      await api.updateIssue(issue.id, { status: status as any });
      await fetchData();
    } catch (actionErr: any) {
      const msg = actionErr?.response?.data?.detail || actionErr?.message || 'Failed to update issue status';
      setDemoMessage(`Action error: ${msg}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateTicket = async () => {
    if (!issue) return;
    setActionLoading('ticket');
    setDemoMessage(null);
    try {
      await api.createTicket(issue.id);
      await fetchData();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Cannot create ticket: issue has unresolved jurisdiction';
      setDemoMessage(`Ticket creation rejected: ${msg}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDemoRevisit = async (scenario: string) => {
    if (!issue) return;
    setActionLoading(`revisit-${scenario}`);
    setDemoMessage(null);
    try {
      const res: any = await simulator.simulateRevisit(issue.id, { scenario });
      const newStatus = res?.new_status || res?.verification_result || 'updated';
      setDemoMessage(`Controlled demo revisit executed [${scenario.replace(/_/g, ' ')}]. New state: ${newStatus}`);
      await fetchData();
    } catch (revisitError: any) {
      const msg = revisitError?.response?.data?.detail || revisitError?.message || 'Controlled demo revisit failed.';
      setDemoMessage(`Revisit error: ${msg}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReopenIssue = async () => {
    if (!issue) return;
    setActionLoading('reopen');
    setDemoMessage(null);
    try {
      await api.reopenIssue(issue.id, {
        reason: reopenReason || 'Defect re-emerged or unverified repair',
        notes: reopenNotes || undefined
      });
      setDemoMessage('Issue successfully reopened and queued for field re-inspection.');
      setShowReopenModal(false);
      setReopenReason('Defect re-emerged or unverified repair');
      setReopenNotes('');
      await fetchData();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to reopen issue';
      setDemoMessage(`Reopen error: ${msg}`);
    } finally {
      setActionLoading(null);
    }
  };

  const isCritical = issue.severity === 'critical';
  const primaryEvidence = issue.observations?.find((observation: any) => observation.evidence?.url)?.evidence?.url;
  const roadSegment = (issue as any).roadSegment;
  const verifications: Verification[] = verificationsList;
  const timeline: any[] = (issue as any).timeline || [];

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
          <div className="flex items-center gap-2 mb-2 flex-wrap">
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
            {(issue.isDemo || issue.id.startsWith('iss_demo_')) && (
              <span className="px-2 py-0.5 rounded font-mono text-[9px] bg-purple-500/15 text-purple-400 border border-purple-500/30 uppercase tracking-wider font-bold">
                DEMO DATA
              </span>
            )}
            <span className={cn(
              "px-2.5 py-0.5 rounded font-data-mono text-[10px] border uppercase",
              issue.jurisdictionStatus === 'resolved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            )}>
              {issue.jurisdictionStatus === 'resolved' ? (issue.authorityName || 'Resolved') : 'Jurisdiction Unresolved'}
            </span>
            <span className={cn(
              "ml-auto px-3 py-1 rounded-full font-label-caps border",
              issue.status === 'verified' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
              issue.status === 'reopened' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' :
              issue.status === 'open' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' : 
              'bg-blue-500/20 text-blue-400 border-blue-500/30'
            )}>
              Status: {(issue.status || 'unknown').replace(/_/g, ' ')}
            </span>
          </div>
          <h1 className="font-headline-md text-on-surface capitalize mb-2">
            {(issue.type || 'unknown').replace(/_/g, ' ')}
          </h1>
          <div className="flex items-center gap-4 text-sm text-on-surface-variant flex-wrap">
            <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {issue.location?.address || 'Delhi-NCR Municipal Road'}</span>
            <span className="w-1 h-1 rounded-full bg-outline-variant" />
            <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> First seen {formatDate(issue.firstDetectedAt, 'long')}</span>
            {issue.observationCount > 1 && (
              <>
                <span className="w-1 h-1 rounded-full bg-outline-variant" />
                <span className="flex items-center gap-1.5 text-cyan-400 font-mono text-xs">
                  <GitMerge className="w-3.5 h-3.5" /> Corroborated ({issue.observationCount} passes)
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {demoMessage && (
        <div className="p-3 rounded-lg bg-surface-container border border-primary/30 text-xs text-on-surface flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Info className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            {demoMessage}
          </span>
          <button onClick={() => setDemoMessage(null)} className="text-on-surface-variant hover:text-on-surface font-mono ml-4 text-sm">✕</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ── Left Column: Evidence, Road Segment & Obs ─────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* AI Evidence Frame */}
          <GlassPanel padding="none" className="overflow-hidden relative group border-outline-variant">
            <div className="aspect-video w-full relative bg-surface-lowest overflow-hidden flex items-center justify-center">
              {primaryEvidence ? (
                <img src={config.assetUrl(primaryEvidence)} alt="Actual AI detection evidence" className="w-full h-full object-contain" />
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-on-surface-variant">
                  <Camera className="w-8 h-8 mb-2 opacity-40" />
                  <span className="text-sm font-medium">Evidence is not available for this issue.</span>
                  <span className="text-xs text-on-surface-variant/70 mt-1">Inspection record was logged without cropped image attachment.</span>
                </div>
              )}

              {/* Camera HUD */}
              <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
                <div className="flex flex-col gap-1">
                  <span className="flex items-center gap-1.5 text-red-500 text-[10px] font-bold font-mono tracking-widest"><div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> REC</span>
                  <span className="text-on-surface text-[10px] font-data-mono bg-surface/60 px-2 py-1 rounded backdrop-blur-md border border-outline-variant">
                    {issue.observations?.[0]?.busId ? `BUS ${issue.observations[0].busId}` : 'FLEET_CAM'}
                  </span>
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

              {issue.confidence != null && (
                <div className="absolute bottom-4 right-4 pointer-events-none bg-surface/80 px-2.5 py-1 rounded border border-outline-variant backdrop-blur-md font-data-mono text-xs text-emerald-400 font-semibold">
                  CONF: {(issue.confidence * 100).toFixed(1)}%
                </div>
              )}
            </div>
          </GlassPanel>

          {/* Road Segment & Infrastructure Intelligence Card */}
          <GlassPanel className="border-outline-variant">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-label-caps text-on-surface-variant flex items-center gap-2">
                <Route className="w-4 h-4 text-cyan-400" /> Road Segment & Infrastructure
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-container border border-outline-variant text-on-surface-variant">
                Segment: {roadSegment?.id || issue.roadSegmentId || 'Unmapped'}
              </span>
            </div>

            {roadSegment ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-3 rounded-lg bg-surface-container/60 border border-outline-variant">
                    <span className="text-[10px] font-mono uppercase text-on-surface-variant block">Corridor Name</span>
                    <span className="text-sm font-semibold text-on-surface">{roadSegment.name}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-surface-container/60 border border-outline-variant">
                    <span className="text-[10px] font-mono uppercase text-on-surface-variant block">Owner Agency</span>
                    <span className="text-sm font-semibold text-cyan-400">{roadSegment.ownerAgency || 'Unassigned'}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-surface-container/60 border border-outline-variant">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase text-on-surface-variant block">Health Burden</span>
                      <span className="text-[9px] font-mono text-amber-400/90 border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.2 rounded">
                        decision_support_derived
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-lg font-black text-on-surface font-mono">
                        {roadSegment.healthScore != null ? roadSegment.healthScore : 'N/A'}
                      </span>
                      {roadSegment.healthScore != null && <span className="text-xs text-on-surface-variant font-mono">/ 100</span>}
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-on-surface-variant/70 italic">
                  * Decision-support burden score calculated from active defect density and traffic weighting. Not an official municipal pavement condition rating.
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-surface-container/40 border border-outline-variant text-xs text-on-surface-variant">
                No dedicated road segment metadata bound to this spatial location.
              </div>
            )}
          </GlassPanel>

          {/* Observations */}
          <GlassPanel className="border-outline-variant">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-label-caps text-on-surface-variant flex items-center gap-2">
                  <GitMerge className="w-4 h-4 text-secondary" /> Fleet Observations & Provenance
                </h3>
                <p className="text-xs text-on-surface-variant mt-1">
                  {issue.corroborationText || (issue.uniqueBusCount > 1 ? `Corroborated by ${issue.uniqueBusCount} distinct buses` : 'Observed by 1 bus')}
                </p>
              </div>
              <div className="px-3 py-1 rounded-full bg-surface-container border border-outline-variant text-xs font-medium text-on-surface-variant">
                {issue.observationCount} Total {issue.observationCount === 1 ? 'Capture' : 'Captures'}
              </div>
            </div>

            {issue.observations && issue.observations.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {issue.observations.map((obs) => (
                  <div key={obs.id} className="p-3 rounded bg-surface-container border border-outline-variant hover:bg-surface-high transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="flex items-center gap-1.5 text-xs font-data-mono text-on-surface-variant bg-surface px-2 py-0.5 rounded">
                        <Bus className="w-3 h-3 text-cyan-400" /> {obs.busId}
                      </span>
                      <span className="text-[10px] text-on-surface-variant">
                        {obs.timestamp ? timeAgo(obs.timestamp) : 'Logged'}
                      </span>
                    </div>
                    <div className="flex justify-between items-end text-xs">
                      <span className="text-on-surface-variant flex items-center gap-1">
                        <Camera className="w-3 h-3"/> {obs.evidence?.url ? 'Evidence Crop' : 'Capture Logged'}
                      </span>
                      <span className="font-data-mono text-status-healthy">
                        {(obs.confidence * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-surface-container/50 border border-outline-variant text-center text-xs text-on-surface-variant">
                Direct observation provenance captured from {issue.observationCount} inspection {issue.observationCount === 1 ? 'pass' : 'passes'}.
              </div>
            )}
          </GlassPanel>

          {/* Closed-Loop Verification 2.0 Card — Multi-Pass History */}
          <GlassPanel className="border-outline-variant">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-label-caps text-on-surface-variant flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" /> Closed-Loop Verification 2.0 (Municipal Reinspection)
                </h3>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Automated corridor-verified reinspections and auditable operator adjudications.
                </p>
              </div>
              <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-surface-container border border-outline-variant text-on-surface-variant">
                {verifications.length} Revisit {verifications.length === 1 ? 'Pass' : 'Passes'}
              </span>
            </div>

            {verifications.length > 0 ? (
              <div className="space-y-4">
                {[...verifications].reverse().map((v, idx) => {
                  const resLower = String(v.result || '').toLowerCase();
                  const isResolved = resLower === 'resolved' || resLower === 'fixed';
                  const isUnresolved = resLower === 'unresolved' || resLower === 'still_present';
                  const isInconclusive = resLower === 'inconclusive';

                  return (
                    <div key={v.id || idx} className="p-4 rounded-xl bg-surface-container/60 border border-outline-variant space-y-4">
                      
                      {/* Pass Header */}
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-on-surface">Reinspection Pass #{v.id}</span>
                          <span className="font-mono text-[11px] text-on-surface-variant bg-surface px-2 py-0.5 rounded border border-outline-variant">
                            via {v.busId || 'Transit Unit'}
                          </span>
                          <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 uppercase">
                            {v.verifier || 'TRANSIT_REINSPECTION'}
                          </span>
                        </div>
                        <span className={cn(
                          "text-[10px] font-mono font-bold px-2.5 py-1 rounded border uppercase flex items-center gap-1.5",
                          isResolved ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' :
                          isUnresolved ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' :
                          isInconclusive ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' :
                          'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
                        )}>
                          {isResolved && <CheckCircle className="w-3 h-3" />}
                          {isUnresolved && <XCircle className="w-3 h-3" />}
                          {isInconclusive && <HelpCircle className="w-3 h-3" />}
                          Result: {v.result || 'PENDING_REVIEW'}
                        </span>
                      </div>

                      {/* Operator Override Banner */}
                      {v.isOverride && (
                        <div className="p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-between text-xs text-purple-300">
                          <span className="flex items-center gap-2 font-medium">
                            <UserCheck className="w-4 h-4 text-purple-400" />
                            Operator Adjudication Override {v.overridesVerificationId ? `(Supersedes Pass #${v.overridesVerificationId})` : ''}
                          </span>
                          <span className="font-mono text-[10px] text-purple-400/80">
                            Actor: {v.operatorId || 'Operator'}
                          </span>
                        </div>
                      )}

                      {/* Side-by-side Before/After Evidence */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div className="space-y-1">
                          <span className="text-[10px] font-mono text-on-surface-variant uppercase flex items-center justify-between">
                            <span>Initial Defect Evidence (Before)</span>
                            <span className="text-[9px] text-amber-400">Captured</span>
                          </span>
                          <div className="h-36 rounded-lg overflow-hidden border border-outline-variant bg-black flex items-center justify-center">
                            {v.beforeEvidenceUrl || primaryEvidence ? (
                              <img 
                                src={config.assetUrl(v.beforeEvidenceUrl || primaryEvidence)} 
                                alt="Before repair" 
                                className="h-full w-full object-contain" 
                              />
                            ) : (
                              <div className="text-center p-3 text-xs text-on-surface-variant font-mono">
                                Initial evidence crop unavailable
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[10px] font-mono text-on-surface-variant uppercase flex items-center justify-between">
                            <span>Reinspection Field Evidence (After)</span>
                            <span className={cn("text-[9px]", isResolved ? 'text-emerald-400' : 'text-rose-400')}>
                              {v.afterEvidenceUrl ? 'Reinspection Capture' : 'Clear / No Detection'}
                            </span>
                          </span>
                          <div className="h-36 rounded-lg overflow-hidden border border-outline-variant bg-black flex items-center justify-center">
                            {v.afterEvidenceUrl ? (
                              <img 
                                src={config.assetUrl(v.afterEvidenceUrl)} 
                                alt="Reinspection capture" 
                                className="h-full w-full object-contain" 
                              />
                            ) : isResolved ? (
                              <div className="h-full w-full flex flex-col items-center justify-center p-3 text-center bg-emerald-950/20 border border-emerald-500/20 text-emerald-400">
                                <CheckCircle className="w-6 h-6 mb-1 text-emerald-400" />
                                <span className="text-xs font-semibold">Zero Defect Detected</span>
                                <span className="text-[10px] text-emerald-400/70 mt-0.5">Corridor clear of surface anomalies</span>
                              </div>
                            ) : (
                              <div className="h-full w-full flex flex-col items-center justify-center p-3 text-center text-xs text-on-surface-variant font-mono bg-surface-container/30">
                                <Eye className="w-5 h-5 mb-1 opacity-40" />
                                Reinspection evidence unavailable
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Decision Engine Explainability & Failure Reason */}
                      <div className="p-3 rounded-lg bg-surface/50 border border-outline-variant/60 space-y-2">
                        <div className="flex items-start gap-2">
                          <Info className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                          <div className="text-xs text-on-surface leading-relaxed">
                            <span className="font-semibold text-cyan-300">Decision Rationale: </span>
                            {v.rationale || 'Deterministic verification engine evaluation completed.'}
                          </div>
                        </div>

                        {v.failureReason && (
                          <div className="flex items-center gap-2 pt-1 border-t border-outline-variant/40">
                            <AlertOctagon className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                            <span className="text-[11px] font-mono text-rose-300">
                              Failure Reason: <span className="font-bold">{v.failureReason}</span>
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Metadata & Truthful Metrics */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono text-on-surface-variant pt-1 border-t border-outline-variant/40">
                        <div>
                          <span className="block text-[9px] uppercase opacity-70">Timestamp</span>
                          <span className="text-on-surface">{v.timestamp ? formatDate(v.timestamp, 'short') : 'Recorded'}</span>
                        </div>
                        <div>
                          <span className="block text-[9px] uppercase opacity-70">Detection Confidence</span>
                          <span className="text-on-surface">
                            {v.confidence != null ? `${(v.confidence * 100).toFixed(1)}%` : (isResolved ? 'N/A (Clear)' : 'Unavailable')}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[9px] uppercase opacity-70">Corridor Coverage</span>
                          <span className={cn(v.comparisonMetrics?.coverage_confirmed !== false ? 'text-emerald-400' : 'text-rose-400')}>
                            {v.comparisonMetrics?.coverage_confirmed !== false ? 'Confirmed' : 'Missed'}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[9px] uppercase opacity-70">Evidence Quality</span>
                          <span className="text-on-surface">
                            {v.comparisonMetrics?.evidence_quality || 'SUFFICIENT'}
                          </span>
                        </div>
                      </div>

                      {v.notes && (
                        <p className="text-xs text-on-surface-variant bg-surface/30 p-2 rounded font-mono text-[11px]">
                          Notes: {v.notes}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 rounded-lg bg-surface-container/30 border border-outline-variant text-center space-y-2">
                <ShieldCheck className="w-8 h-8 mx-auto text-on-surface-variant opacity-40" />
                <div className="text-xs font-medium text-on-surface">No verification passes logged yet.</div>
                <div className="text-[11px] text-on-surface-variant">
                  Trigger a transit reinspection or use the Controlled Demo Revisit panel to simulate verification.
                </div>
              </div>
            )}
          </GlassPanel>

        </div>

        {/* ── Right Column: Actions & Meta ──────────────────── */}
        <div className="space-y-6">
          
          {/* Action Panel */}
          <GlassPanel className="border-primary/20 bg-primary/5">
            <h3 className="font-label-caps text-on-surface-variant mb-4">Command Actions</h3>
            <div className="space-y-3">
              <button 
                onClick={() => handleAction('assign', 'assigned')}
                disabled={!!actionLoading}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-surface-container hover:bg-surface-high border border-outline-variant text-sm font-medium text-on-surface transition-all text-left group disabled:opacity-50"
              >
                <div className="w-8 h-8 rounded-md bg-purple-500/20 text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Ticket className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div>Assign Department</div>
                  <div className="text-[10px] text-on-surface-variant font-normal">Route to responsible municipal department</div>
                </div>
                {actionLoading === 'assign' && <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />}
              </button>

              <button 
                onClick={() => handleAction('verify', 'verifying')}
                disabled={!!actionLoading}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-surface-container hover:bg-surface-high border border-outline-variant text-sm font-medium text-on-surface transition-all text-left group disabled:opacity-50"
              >
                <div className="w-8 h-8 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div>Start Verification</div>
                  <div className="text-[10px] text-on-surface-variant font-normal">Queue transit buses to reinspect repair status</div>
                </div>
                {actionLoading === 'verify' && <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />}
              </button>

              {/* Reopen Defect Action */}
              <button 
                onClick={() => setShowReopenModal(true)}
                disabled={!!actionLoading}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-surface-container hover:bg-surface-high border border-outline-variant text-sm font-medium text-on-surface transition-all text-left group disabled:opacity-50"
              >
                <div className="w-8 h-8 rounded-md bg-rose-500/20 text-rose-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="text-rose-400">Reopen Defect</div>
                  <div className="text-[10px] text-on-surface-variant font-normal">Mark repair as unverified or re-emerged</div>
                </div>
                {actionLoading === 'reopen' && <div className="w-4 h-4 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />}
              </button>
            </div>
          </GlassPanel>

          {/* Controlled Demo Revisit (Simulated Trigger) — 5 Scenarios */}
          <GlassPanel className="border-amber-500/30">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-label-caps text-amber-300">Controlled Demo Revisit</h3>
              <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold">
                SIH Simulator
              </span>
            </div>
            <p className="text-xs text-on-surface-variant mb-4 leading-relaxed">
              Simulate edge transit bus reinspections under different field conditions. Demonstrates that "no new detection" requires confirmed coverage.
            </p>
            
            <div className="space-y-2.5">
              <button
                onClick={() => handleDemoRevisit('resolved')}
                disabled={!!actionLoading}
                className="w-full flex items-center justify-between p-2.5 rounded bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-semibold text-left transition-colors disabled:opacity-50"
              >
                <div>
                  <div className="font-bold">1. Clean Pass (Resolved)</div>
                  <div className="text-[10px] text-emerald-400/80 font-normal">Corridor coverage confirmed, zero defect detected</div>
                </div>
                {actionLoading === 'revisit-resolved' ? <RefreshCw className="w-4 h-4 animate-spin flex-shrink-0" /> : <CheckCircle className="w-4 h-4 flex-shrink-0" />}
              </button>

              <button
                onClick={() => handleDemoRevisit('unresolved')}
                disabled={!!actionLoading}
                className="w-full flex items-center justify-between p-2.5 rounded bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300 text-xs font-semibold text-left transition-colors disabled:opacity-50"
              >
                <div>
                  <div className="font-bold">2. Defect Present (Unresolved)</div>
                  <div className="text-[10px] text-rose-400/80 font-normal">Pothole still detected by transit camera at location</div>
                </div>
                {actionLoading === 'revisit-unresolved' ? <RefreshCw className="w-4 h-4 animate-spin flex-shrink-0" /> : <XCircle className="w-4 h-4 flex-shrink-0" />}
              </button>

              <button
                onClick={() => handleDemoRevisit('inconclusive_coverage')}
                disabled={!!actionLoading}
                className="w-full flex items-center justify-between p-2.5 rounded bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 text-amber-300 text-xs font-semibold text-left transition-colors disabled:opacity-50"
              >
                <div>
                  <div className="font-bold">3. Missing Coverage (Inconclusive)</div>
                  <div className="text-[10px] text-amber-400/80 font-normal">Transit pass did not confirm corridor spatial coverage</div>
                </div>
                {actionLoading === 'revisit-inconclusive_coverage' ? <RefreshCw className="w-4 h-4 animate-spin flex-shrink-0" /> : <HelpCircle className="w-4 h-4 flex-shrink-0" />}
              </button>

              <button
                onClick={() => handleDemoRevisit('inconclusive_quality')}
                disabled={!!actionLoading}
                className="w-full flex items-center justify-between p-2.5 rounded bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 text-amber-300 text-xs font-semibold text-left transition-colors disabled:opacity-50"
              >
                <div>
                  <div className="font-bold">4. Degraded Quality (Inconclusive)</div>
                  <div className="text-[10px] text-amber-400/80 font-normal">Severe lens glare, rain, or camera occlusion</div>
                </div>
                {actionLoading === 'revisit-inconclusive_quality' ? <RefreshCw className="w-4 h-4 animate-spin flex-shrink-0" /> : <HelpCircle className="w-4 h-4 flex-shrink-0" />}
              </button>

              <button
                onClick={() => handleDemoRevisit('recurrence')}
                disabled={!!actionLoading}
                className="w-full flex items-center justify-between p-2.5 rounded bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 text-xs font-semibold text-left transition-colors disabled:opacity-50"
              >
                <div>
                  <div className="font-bold">5. Defect Recurrence (Reopen)</div>
                  <div className="text-[10px] text-purple-400/80 font-normal">PostGIS 15m defect match reopens existing issue</div>
                </div>
                {actionLoading === 'revisit-recurrence' ? <RefreshCw className="w-4 h-4 animate-spin flex-shrink-0" /> : <RotateCcw className="w-4 h-4 flex-shrink-0" />}
              </button>
            </div>
          </GlassPanel>

          {/* Operational Authority & Jurisdiction */}
          <GlassPanel className="border-outline-variant">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-label-caps text-on-surface-variant">Operational Jurisdiction</h3>
              <span className={cn("text-[10px] px-2 py-0.5 rounded font-bold uppercase", 
                issue.jurisdictionStatus === 'resolved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
              )}>
                {issue.jurisdictionStatus === 'resolved' ? 'Jurisdiction Resolved' : 'Needs Review'}
              </span>
            </div>
            
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-outline-variant">
                <span className="text-on-surface-variant">Responsible Authority</span>
                <span className="text-on-surface font-semibold text-right">
                  {issue.authorityName || ticket?.authorityName || (issue.authorityId ? issue.authorityId : 'Jurisdiction Unresolved')}
                </span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-outline-variant">
                <span className="text-on-surface-variant">Assigned Department</span>
                <span className="text-on-surface font-medium text-right">
                  {issue.departmentName || ticket?.departmentName || issue.departmentId || 'Pending Assignment'}
                </span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-outline-variant">
                <span className="text-on-surface-variant">Resolution Source</span>
                <span className="text-cyan-400 font-data-mono uppercase text-[10px] text-right">
                  {issue.jurisdictionSource ? issue.jurisdictionSource.replace(/_/g, ' ') : 'unresolved'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant">Routing Reason</span>
                <span className="text-on-surface-variant font-mono text-[11px] text-right max-w-[200px]">
                  {issue.routingReason || 'Deterministic jurisdiction engine evaluation'}
                </span>
              </div>
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
                  <span className="text-on-surface-variant text-sm">Authority</span>
                  <span className="text-on-surface font-medium">{ticket.authorityName || issue.authorityName || 'Delhi Public Works Department'}</span>
                </div>
                <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
                  <span className="text-on-surface-variant text-sm">Department</span>
                  <span className="text-on-surface font-medium">{ticket.departmentName || ticket.departmentId}</span>
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
                {issue.authorityId ? (
                  <button
                    onClick={handleCreateTicket}
                    disabled={actionLoading === 'ticket'}
                    className="mt-4 mx-auto block px-4 py-2 rounded bg-primary text-on-primary text-xs font-semibold uppercase hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {actionLoading === 'ticket' ? 'Creating ticket...' : 'Create repair ticket'}
                  </button>
                ) : (
                  <div className="mt-3 p-2 rounded bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300">
                    Cannot create municipal ticket while jurisdiction is unresolved.
                  </div>
                )}
              </div>
            )}
          </GlassPanel>

          {/* Issue Lifecycle Timeline (Database-Derived) */}
          <GlassPanel className="border-outline-variant">
            <h3 className="font-label-caps text-on-surface-variant mb-4 flex items-center justify-between">
              <span>Issue Audit Trail</span>
              <span className="text-[10px] font-mono text-cyan-400">Database-Derived</span>
            </h3>
            
            <div className="relative pl-4 space-y-5">
              <div className="absolute left-[23px] top-3 bottom-3 w-0.5 bg-outline-variant/60" />

              {timeline.length > 0 ? (
                timeline.map((evt, idx) => (
                  <div key={evt.id || idx} className="relative pl-8">
                    <div className="absolute left-[-11px] top-0 w-7 h-7 rounded-full flex items-center justify-center border-2 bg-surface border-outline-variant text-cyan-400 shadow-sm">
                      <Activity className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-xs font-bold text-on-surface">{evt.title}</div>
                    {evt.description && (
                      <div className="text-[11px] text-on-surface-variant mt-0.5 leading-snug">{evt.description}</div>
                    )}
                    <div className="flex items-center gap-2 mt-1 text-[10px] font-data-mono text-on-surface-variant/80">
                      <span>{evt.timestamp ? timeAgo(evt.timestamp) : 'Logged'}</span>
                      {evt.actor && (
                        <>
                          <span>•</span>
                          <span className="text-primary/90">{evt.actor}</span>
                        </>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-on-surface-variant space-y-4">
                  <div className="relative pl-8">
                    <div className="absolute left-[-11px] top-0 w-7 h-7 rounded-full flex items-center justify-center border-2 bg-surface border-outline-variant text-orange-400">
                      <AlertTriangle className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-xs font-bold text-on-surface">Initial AI Detection</div>
                    <div className="text-[11px] text-on-surface-variant">{formatDate(issue.firstDetectedAt, 'long')}</div>
                  </div>
                  {issue.observationCount > 1 && (
                    <div className="relative pl-8">
                      <div className="absolute left-[-11px] top-0 w-7 h-7 rounded-full flex items-center justify-center border-2 bg-surface border-outline-variant text-cyan-400">
                        <GitMerge className="w-3.5 h-3.5" />
                      </div>
                      <div className="text-xs font-bold text-on-surface">Corroborated by Fleet</div>
                      <div className="text-[11px] text-on-surface-variant">{issue.observationCount} passes recorded</div>
                    </div>
                  )}
                  {ticket && (
                    <div className="relative pl-8">
                      <div className="absolute left-[-11px] top-0 w-7 h-7 rounded-full flex items-center justify-center border-2 bg-surface border-outline-variant text-purple-400">
                        <Ticket className="w-3.5 h-3.5" />
                      </div>
                      <div className="text-xs font-bold text-on-surface">Work Ticket Created</div>
                      <div className="text-[11px] text-on-surface-variant">Ticket {ticket.id} ({ticket.status})</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </GlassPanel>

        </div>
      </div>

      {/* Reopen Defect Modal */}
      <AnimatePresence>
        {showReopenModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface-container border border-outline-variant rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
                <div className="flex items-center gap-2 text-rose-400 font-semibold">
                  <RotateCcw className="w-5 h-5" />
                  <span>Reopen Defect & Trigger Reinspection</span>
                </div>
                <button 
                  onClick={() => setShowReopenModal(false)}
                  className="text-on-surface-variant hover:text-on-surface font-mono"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <p className="text-on-surface-variant leading-relaxed">
                  Reopening will revert the defect state to <span className="text-purple-400 font-bold">REOPENED</span>, create an audit event, and queue field transit units for immediate reinspection.
                </p>

                <div>
                  <label className="block text-[11px] font-mono text-on-surface uppercase mb-1">
                    Reopening Rationale (Mandatory)
                  </label>
                  <input
                    type="text"
                    value={reopenReason}
                    onChange={(e) => setReopenReason(e.target.value)}
                    placeholder="e.g. Defect re-emerged post-monsoon / citizen complaint"
                    className="w-full px-3 py-2 rounded bg-surface border border-outline-variant text-xs text-on-surface focus:border-rose-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-on-surface uppercase mb-1">
                    Operator Notes (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={reopenNotes}
                    onChange={(e) => setReopenNotes(e.target.value)}
                    placeholder="Provide additional field notes or contractor notice references..."
                    className="w-full px-3 py-2 rounded bg-surface border border-outline-variant text-xs text-on-surface focus:border-rose-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant">
                <button
                  onClick={() => setShowReopenModal(false)}
                  className="px-4 py-2 rounded text-xs font-semibold text-on-surface-variant hover:text-on-surface hover:bg-surface transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReopenIssue}
                  disabled={actionLoading === 'reopen' || !reopenReason.trim()}
                  className="px-4 py-2 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold uppercase disabled:opacity-50 transition-colors"
                >
                  {actionLoading === 'reopen' ? 'Reopening...' : 'Confirm Reopen'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
