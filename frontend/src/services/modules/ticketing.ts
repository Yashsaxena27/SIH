import { config } from '../core/config';
import { client } from '../core/client';
import { mockTickets, mockTicketSummary } from '../mock/tickets';
import { mockVerifications, mockVerificationSummary } from '../mock/verifications';
import type { Ticket, TicketSummary, Verification, VerificationSummary } from '@/types';

const delay = (ms: number = 100) => new Promise(resolve => setTimeout(resolve, ms));

export const ticketService = {
  async getTickets(): Promise<Ticket[]> {
    if (config.useMockData) {
      await delay();
      return [...mockTickets];
    }
    return client.get<Ticket[]>('/tickets');
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
  }
};

export const verificationService = {
  async getVerifications(): Promise<Verification[]> {
    if (config.useMockData) return delay().then(() => [...mockVerifications]);
    return client.get<Verification[]>('/verifications');
  },

  async getVerificationSummary(): Promise<VerificationSummary> {
    if (config.useMockData) return delay().then(() => mockVerificationSummary);
    return client.get<VerificationSummary>('/verifications/summary');
  }
};
