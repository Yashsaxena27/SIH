// Facade for backward compatibility with UI components.
// It routes all API calls to the newly architected modular services.

import { issueService } from './modules/issueService';
import { ticketService, verificationService } from './modules/ticketing';
import { fleetService, routeService } from './modules/fleetService';
import { analyticsService, detectionService } from './modules/analyticsService';
import { inspectionService } from './modules/inspectionService';

export const api = {
  // Inspection
  uploadInspectionVideo: inspectionService.uploadVideo,
  getInspectionStatus: inspectionService.getInspectionStatus,
  listRecentInspections: inspectionService.listRecentInspections,

  // Fleet
  getBuses: fleetService.getBuses,
  getBus: fleetService.getBus,
  
  // Routes
  getRoutes: routeService.getRoutes,
  
  // Detections
  getDetections: detectionService.getDetections,
  getDetectionSummary: detectionService.getDetectionSummary,
  
  // Issues
  getIssues: issueService.getIssues,
  getIssue: issueService.getIssue,
  updateIssue: issueService.updateIssue,
  getIssueSummary: issueService.getIssueSummary,
  
  // Tickets
  getTickets: ticketService.getTickets,
  getTicket: ticketService.getTicket,
  getTicketSummary: ticketService.getTicketSummary,
  
  // Verification
  getVerifications: verificationService.getVerifications,
  getVerificationSummary: verificationService.getVerificationSummary,
  
  // Roads / Analytics
  getRoadSegments: analyticsService.getRoadSegments,
  getRoadHealthSummary: analyticsService.getRoadHealthSummary,
  getRoadHealthHistory: analyticsService.getRoadHealthHistory,
  
  // Departments
  getDepartments: analyticsService.getDepartments,
  
  // System
  getSystemHealth: analyticsService.getSystemHealth,
  getAlerts: analyticsService.getAlerts,
  getSystemMetrics: analyticsService.getSystemMetrics,
  getActivityFeed: analyticsService.getActivityFeed
};

// Also export the realtime client and config for components that need direct access
export { realtime } from './core/realtime';
export { config } from './core/config';
export { simulator } from './simulation/simulator';
