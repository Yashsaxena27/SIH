import { config } from '../core/config';
import { client } from '../core/client';
import { mockIssues, mockIssueSummary } from '../mock/issues';
import type { UrbanIssue, IssueSummary, IssueStatus, Severity } from '@/types';

// Utility to simulate network delay for mock mode
const delay = (ms: number = 100) => new Promise(resolve => setTimeout(resolve, ms + Math.random() * 100 - 50));

export const issueService = {
  async getIssues(filters?: { status?: IssueStatus; severity?: Severity; search?: string; limit?: number }): Promise<UrbanIssue[]> {
    if (config.useMockData) {
      await delay();
      let result = [...mockIssues];
      if (filters?.status) result = result.filter(i => i.status === filters.status);
      if (filters?.severity) result = result.filter(i => i.severity === filters.severity);
      if (filters?.search) {
        const q = filters.search.toLowerCase();
        result = result.filter(i => 
          i.id.toLowerCase().includes(q) || 
          (i.roadSegmentId && i.roadSegmentId.toLowerCase().includes(q)) ||
          (i.notes && i.notes.toLowerCase().includes(q))
        );
      }
      if (filters?.limit) result = result.slice(0, filters.limit);
      return result;
    }
    const params: Record<string, string> = {};
    if (filters?.status) params.status = filters.status;
    if (filters?.severity) params.severity = filters.severity;
    if (filters?.search) params.search = filters.search;
    if (filters?.limit) params.limit = filters.limit.toString();
    return client.get<UrbanIssue[]>('/issues', params);
  },

  async getIssue(id: string): Promise<UrbanIssue | undefined> {
    if (config.useMockData) {
      await delay();
      return mockIssues.find(i => i.id === id);
    }
    return client.get<UrbanIssue>(`/issues/${id}`);
  },

  async updateIssue(id: string, updates: Partial<UrbanIssue>): Promise<UrbanIssue> {
    if (config.useMockData) {
      await delay(300);
      const index = mockIssues.findIndex(i => i.id === id);
      if (index === -1) throw new Error('Issue not found');
      mockIssues[index] = { ...mockIssues[index], ...updates };
      return mockIssues[index];
    }
    const res = await client.patch<UrbanIssue>(`/issues/${id}`, updates);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('muin:mutation'));
    }
    return res;
  },

  async getIssueSummary(): Promise<IssueSummary> {
    if (config.useMockData) {
      await delay();
      return mockIssueSummary;
    }
    return client.get<IssueSummary>('/issues/summary');
  }
};
