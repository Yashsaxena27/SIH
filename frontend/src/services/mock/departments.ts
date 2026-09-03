// @ts-nocheck
import type { Department } from '@/types/department';

export const mockDepartments: Department[] = [
  {
    id: 'dept-1',
    name: 'BBMP Major Roads Department',
    shortName: 'BBMP-Roads',
    type: 'maintenance',
    contactEmail: 'roads@bbmp.gov.in',
    activeTickets: 250,
    performance: {
      resolutionRate: 78.5,
      averageResolutionTime: 5.2,
      slaCompliance: 82.0,
      totalResolved: 4500
    }
  },
  {
    id: 'dept-2',
    name: 'Bengaluru Traffic Police',
    shortName: 'BTP',
    type: 'traffic',
    contactEmail: 'traffic@btp.gov.in',
    activeTickets: 45,
    performance: {
      resolutionRate: 92.0,
      averageResolutionTime: 1.5,
      slaCompliance: 95.0,
      totalResolved: 1200
    }
  },
  {
    id: 'dept-3',
    name: 'BBMP Ward Infrastructure Works',
    shortName: 'BBMP-Ward',
    type: 'municipal',
    contactEmail: 'works@bbmp.gov.in',
    activeTickets: 420,
    performance: {
      resolutionRate: 65.0,
      averageResolutionTime: 8.5,
      slaCompliance: 60.0,
      totalResolved: 8900
    }
  },
  {
    id: 'dept-4',
    name: 'Bengaluru Metropolitan Transport Corp',
    shortName: 'BMTC',
    type: 'transport',
    contactEmail: 'edge@bmtc.karnataka.gov.in',
    activeTickets: 15,
    performance: {
      resolutionRate: 88.0,
      averageResolutionTime: 3.2,
      slaCompliance: 90.0,
      totalResolved: 350
    }
  }
];
