// @ts-nocheck
import type { Department } from '@/types/department';

export const mockDepartments: Department[] = [
  {
    id: 'dept-1',
    name: 'Public Works Department',
    shortName: 'PWD',
    type: 'maintenance',
    contactEmail: 'pwd@delhi.gov.in',
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
    name: 'Delhi Traffic Police',
    shortName: 'DTP',
    type: 'traffic',
    contactEmail: 'traffic@delhipolice.gov.in',
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
    name: 'Municipal Corporation',
    shortName: 'MCD',
    type: 'municipal',
    contactEmail: 'mcd@delhi.gov.in',
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
    name: 'Delhi Transport Corporation',
    shortName: 'DTC',
    type: 'transport',
    contactEmail: 'dtc@delhi.gov.in',
    activeTickets: 15,
    performance: {
      resolutionRate: 88.0,
      averageResolutionTime: 3.2,
      slaCompliance: 90.0,
      totalResolved: 350
    }
  }
];
