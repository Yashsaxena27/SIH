// Facade for backward compatibility with UI components.
// It routes all API calls to the newly architected modular services.

import { issueService } from './modules/issueService';
import { ticketService, verificationService, authorityService } from './modules/ticketing';
import { fleetService, routeService } from './modules/fleetService';
import { analyticsService, detectionService } from './modules/analyticsService';
import { inspectionService } from './modules/inspectionService';
import { roadService } from './modules/roadService';

export const api = {
  createTicket: ticketService.createTicket,
  // Inspection
  uploadInspectionVideo: inspectionService.uploadVideo,
  getLibraryVideos: inspectionService.getLibraryVideos,
  runLibraryInspection: inspectionService.runLibraryInspection,
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
  updateTicketStatus: ticketService.updateTicketStatus,
  assignTicket: ticketService.assignTicket,

  // Authorities
  getAuthorities: authorityService.getAuthorities,
  
  // Verification
  getVerifications: verificationService.getVerifications,
  getVerificationSummary: verificationService.getVerificationSummary,
  
  // Roads / Analytics
  getRoads: roadService.getRoads,
  getRoad: roadService.getRoad,
  getRoadHealth: roadService.getRoadHealth,
  getRoadIssues: roadService.getRoadIssues,
  getAnalyticsSummary: analyticsService.getAnalyticsSummary,
  getAnalyticsIssues: analyticsService.getAnalyticsIssues,
  getAnalyticsTrends: analyticsService.getAnalyticsTrends,
  getAnalyticsTickets: analyticsService.getAnalyticsTickets,
  getAnalyticsVerifications: analyticsService.getAnalyticsVerifications,
  getAnalyticsAuthorities: analyticsService.getAnalyticsAuthorities,
  getAnalyticsRoadHealth: analyticsService.getAnalyticsRoadHealth,
  getRoadSegments: analyticsService.getRoadSegments,
  getRoadHealthSummary: analyticsService.getRoadHealthSummary,
  getRoadHealthHistory: analyticsService.getRoadHealthHistory,
  getHotspots: analyticsService.getHotspots,
  
  // Departments
  getDepartments: analyticsService.getDepartments,
  
  // System
  getSystemHealth: analyticsService.getSystemHealth,
  getAlerts: analyticsService.getAlerts,
  acknowledgeAlert: analyticsService.acknowledgeAlert,
  getSystemMetrics: analyticsService.getSystemMetrics,
  getActivityFeed: analyticsService.getActivityFeed
};

// Also export the realtime client and config for components that need direct access
export { realtime } from './core/realtime';
export { config } from './core/config';
export { simulator } from './simulation/simulator';
