// @ts-nocheck
import type { Verification, VerificationSummary } from '@/types/verification';
import { generateDate, delhiCoordinates } from './generators';

export const mockVerifications: Verification[] = Array.from({ length: 6 }).map((_, i) => {
  const statuses: Array<Verification['result']> = ['resolved', 'unresolved', 'inconclusive'];
  
  return {
    id: `ver-${i + 1}`,
    issueId: `iss-${i + 1}`,
    ticketId: `tkt-${i + 1}`,
    timestamp: generateDate(2),
    busId: `bus-${(i % 5) + 1}`,
    location: delhiCoordinates(),
    beforeImageUrl: `/mock-images/before-${(i % 3) + 1}.jpg`,
    afterImageUrl: `/mock-images/after-${(i % 3) + 1}.jpg`,
    confidence: 0.88 + Math.random() * 0.1,
    result: statuses[i % 3]
  };
});

export const mockVerificationSummary: VerificationSummary = {
  pending: 120,
  completedToday: 45,
  successRate: 85.5
};
