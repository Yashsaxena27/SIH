// @ts-nocheck
import type { Ticket, TicketSummary } from '@/types/ticket';
import { generateDate } from './generators';
import { mockIssues } from './issues';

export const mockTickets: Ticket[] = mockIssues.slice(0, 10).map((issue, i) => {
  const statuses: Array<Ticket['status']> = ['open', 'in_progress', 'resolved', 'closed'];
  const slaStatuses: Array<Ticket['slaStatus']> = ['within_sla', 'at_risk', 'breached'];
  
  return {
    id: issue.ticketId || `tkt-${i + 1}`,
    issueId: issue.id,
    departmentId: issue.assignedDepartmentId || 'dept-1',
    status: statuses[i % 4],
    priority: issue.severity,
    createdAt: issue.createdAt,
    updatedAt: issue.updatedAt,
    slaTarget: generateDate(0, -5), // 5 days in future
    slaStatus: slaStatuses[i % 3],
    assignedTo: `Officer ${i + 1}`,
    timeline: [
      {
        id: `tl-${i}-1`,
        timestamp: issue.createdAt,
        type: 'created',
        description: 'Ticket automatically created from verified issue cluster'
      },
      {
        id: `tl-${i}-2`,
        timestamp: generateDate(2, 1),
        type: 'assigned',
        description: `Assigned to ${issue.assignedDepartmentId}`,
        actor: 'System'
      }
    ]
  };
});

export const mockTicketSummary: TicketSummary = {
  open: 350,
  inProgress: 200,
  resolved: 1500,
  slaBreached: 45,
  slaAtRisk: 120
};
