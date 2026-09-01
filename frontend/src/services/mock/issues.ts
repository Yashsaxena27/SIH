// @ts-nocheck
import type { UrbanIssue, IssueSummary } from '@/types/issue';
import { generateId, delhiCoordinates, generateDate, randomRoadName } from './generators';
import { mockDetections } from './detections';

export const mockIssues: UrbanIssue[] = Array.from({ length: 15 }).map((_, i) => {
  const statuses: Array<UrbanIssue['status']> = ['open', 'confirmed', 'assigned', 'in_progress', 'repair_reported', 'verifying', 'verified', 'reopened'];
  const severities: Array<UrbanIssue['severity']> = ['low', 'medium', 'high', 'critical'];
  const classes: Array<UrbanIssue['class']> = ['pothole', 'crack', 'road_damage'];
  
  const status = statuses[i % statuses.length];
  const severity = severities[i % 4];
  const issueClass = classes[i % 3];
  
  return {
    id: `iss-${i + 1}`,
    detectionClass: issueClass,
    severity,
    status,
    location: delhiCoordinates(),
    address: `${randomRoadName()}, Near Pillar ${100 + i}`,
    createdAt: generateDate(30, 2),
    updatedAt: generateDate(2),
    observations: [
      {
        id: `obs-${i}-1`,
        detectionId: mockDetections[i % mockDetections.length].id,
        timestamp: generateDate(30, 2),
        confidence: 0.85 + Math.random() * 0.1,
        imageUrl: `/mock-images/issue-${(i % 5) + 1}.jpg`
      }
    ],
    confidenceScore: 0.92,
    clusterSize: Math.floor(Math.random() * 10) + 1,
    assignedDepartmentId: (i % 2 === 0) ? 'dept-1' : 'dept-2',
    ticketId: `tkt-${i + 1}`
  };
});

export const mockIssueSummary: IssueSummary = {
  totalActive: 1250,
  byStatus: {
    open: 450,
    confirmed: 300,
    assigned: 200,
    in_progress: 150,
    repair_reported: 50,
    verifying: 50,
    verified: 0,
    reopened: 50
  },
  bySeverity: {
    low: 300,
    medium: 600,
    high: 250,
    critical: 100
  },
  averageResolutionTime: 4.5 // days
};
