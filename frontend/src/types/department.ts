// ============================================================
// Department — Municipal departments
// ============================================================

export interface Department {
  id: string;
  name: string;
  shortName: string;
  code: string; // e.g. "PWD", "TRF", "DM"
  description: string;
  color: string; // hex color for UI
  icon: string; // lucide icon name
  issueTypes: string[]; // detection classes this dept handles
  activeTickets: number;
  resolvedTickets: number;
  averageResponseHours: number;
  slaTargetHours: number;
  officers: DepartmentOfficer[];
}

export interface DepartmentOfficer {
  id: string;
  name: string;
  role: string;
  email: string;
  phone?: string;
  activeTickets: number;
}

export interface DepartmentPerformance {
  departmentId: string;
  period: string;
  ticketsReceived: number;
  ticketsResolved: number;
  averageResolutionHours: number;
  slaComplianceRate: number;
  verificationRate: number;
  reopenRate: number;
}
