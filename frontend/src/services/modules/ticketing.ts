import { config } from '../core/config';
import { client } from '../core/client';
import { mockTickets, mockTicketSummary } from '../mock/tickets';
import { mockVerifications, mockVerificationSummary } from '../mock/verifications';
import type { Ticket, TicketSummary, Verification, VerificationSummary } from '@/types';

const delay = (ms: number = 100) => new Promise(resolve => setTimeout(resolve, ms));

export const ticketService = {
  async createTicket(issueId: string): Promise<any> {
    if (config.useMockData) {
      await delay(200);
      return { issueId, status: 'open', created: true };
    }
    const res = await client.post(`/tickets?issue_id=${encodeURIComponent(issueId)}`, {});
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('muin:mutation'));
    }
    return res;
  },

  async getTickets(params?: { authority?: string; department_id?: string; status?: string }): Promise<Ticket[]> {
    if (config.useMockData) {
      await delay();
      return [...mockTickets];
    }
    const query = new URLSearchParams();
    if (params?.authority) query.set('authority', params.authority);
    if (params?.department_id) query.set('department_id', params.department_id);
    if (params?.status) query.set('status', params.status);
    const qs = query.toString();
    return client.get<Ticket[]>(`/tickets${qs ? `?${qs}` : ''}`);
  },
  
  async getTicket(id: string): Promise<Ticket | undefined> {
    if (config.useMockData) {
      await delay();
      return mockTickets.find(t => t.id === id);
    }
    return client.get<Ticket>(`/tickets/${id}`);
  },

  async getTicketSummary(): Promise<TicketSummary> {
    if (config.useMockData) return delay().then(() => mockTicketSummary);
    return client.get<TicketSummary>('/tickets/summary');
  },

  async updateTicketStatus(id: string, status: string): Promise<any> {
    if (config.useMockData) {
      await delay(200);
      return { id, status };
    }
    const res = await client.put(`/tickets/${id}/status`, { status });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('muin:mutation'));
    }
    return res;
  },

  async assignTicket(id: string, assignedTo: string): Promise<any> {
    if (config.useMockData) {
      await delay(200);
      return { id, status: 'assigned', assignedTo };
    }
    const res = await client.post(`/tickets/${id}/assign`, { assigned_to: assignedTo });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('muin:mutation'));
    }
    return res;
  }
};

export const authorityService = {
  async getAuthorities(): Promise<any[]> {
    if (config.useMockData) return [];
    return client.get<any[]>('/authorities');
  }
};

export const verificationService = {
  async getVerifications(params?: { result?: string; issue_id?: string; ticket_id?: string; verifier?: string }): Promise<Verification[]> {
    if (config.useMockData) return delay().then(() => [...mockVerifications]);
    const query = new URLSearchParams();
    if (params?.result) query.set('result', params.result);
    if (params?.issue_id) query.set('issue_id', params.issue_id);
    if (params?.ticket_id) query.set('ticket_id', params.ticket_id);
    if (params?.verifier) query.set('verifier', params.verifier);
    const qs = query.toString();
    return client.get<Verification[]>(`/verifications${qs ? `?${qs}` : ''}`);
  },

  async getVerificationSummary(): Promise<VerificationSummary> {
    if (config.useMockData) return delay().then(() => mockVerificationSummary);
    return client.get<VerificationSummary>('/verifications/summary');
  },

  async triggerReinspection(payload: {
    issue_id: string;
    bus_id?: string;
    coverage_confirmed?: boolean;
    evidence_quality?: string;
    conflicting_evidence?: boolean;
    new_detection?: any;
    reinspection_evidence_url?: string;
    notes?: string;
  }): Promise<any> {
    const res = await client.post('/verifications/reinspect', payload);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('muin:mutation'));
    }
    return res;
  },

  async overrideVerification(verificationId: string, payload: {
    result: string;
    rationale: string;
    notes?: string;
  }): Promise<any> {
    const res = await client.post(`/verifications/${verificationId}/override`, payload);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('muin:mutation'));
    }
    return res;
  },

  async reopenIssue(issueId: string, payload: { reason: string; notes?: string }): Promise<any> {
    const res = await client.post(`/issues/${issueId}/reopen`, payload);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('muin:mutation'));
    }
    return res;
  }
};

