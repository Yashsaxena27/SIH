// @ts-nocheck
import type { Route } from '@/types/route';
import { delhiCoordinates, randomRoadName } from './generators';

export const mockRoutes: Route[] = [
  {
    id: 'rt-1',
    name: 'MG Road Corridor',
    // description: 'Circulates along Trinity Circle and MG Road corridor.',
    activeBuses: 2,
    totalDetections: 145,
    healthScore: 82,
    distance: 14,
    waypoints: [delhiCoordinates(), delhiCoordinates(), delhiCoordinates(), delhiCoordinates()]
  },
  {
    id: 'rt-2',
    name: 'Koramangala 100ft Arterial',
    // description: 'Connects Koramangala Sony World junction to Indiranagar.',
    activeBuses: 2,
    totalDetections: 210,
    healthScore: 65,
    distance: 18,
    waypoints: [delhiCoordinates(), delhiCoordinates(), delhiCoordinates(), delhiCoordinates(), delhiCoordinates()]
  },
  {
    id: 'rt-3',
    name: 'Outer Ring Road (ORR) Transit',
    // description: 'Marathahalli to Bellandur Tech Corridor.',
    activeBuses: 1,
    totalDetections: 85,
    healthScore: 90,
    distance: 22,
    waypoints: [delhiCoordinates(), delhiCoordinates(), delhiCoordinates()]
  },
  {
    id: 'rt-4',
    name: 'Indiranagar 100ft Express',
    // description: 'Old Airport Road to CMH Road.',
    activeBuses: 1,
    totalDetections: 320,
    healthScore: 45,
    distance: 12,
    waypoints: [delhiCoordinates(), delhiCoordinates(), delhiCoordinates(), delhiCoordinates()]
  },
  {
    id: 'rt-5',
    name: 'North-South Link',
    // description: 'GT Karnal Road to Mathura Road.',
    activeBuses: 1,
    totalDetections: 180,
    healthScore: 78,
    distance: 40,
    waypoints: [delhiCoordinates(), delhiCoordinates(), delhiCoordinates(), delhiCoordinates()]
  },
  {
    id: 'rt-6',
    name: 'Central Business District Shuttle',
    // description: 'Connaught Place and surrounding areas.',
    activeBuses: 1,
    totalDetections: 45,
    healthScore: 95,
    distance: 12,
    waypoints: [delhiCoordinates(), delhiCoordinates()]
  }
];
