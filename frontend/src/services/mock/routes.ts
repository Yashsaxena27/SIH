// @ts-nocheck
import type { Route } from '@/types/route';
import { delhiCoordinates, randomRoadName } from './generators';

export const mockRoutes: Route[] = [
  {
    id: 'rt-1',
    name: 'Ring Road Express',
    // description: 'Circulates along the inner Ring Road covering major nodes.',
    activeBuses: 2,
    totalDetections: 145,
    healthScore: 82,
    distance: 47,
    waypoints: [delhiCoordinates(), delhiCoordinates(), delhiCoordinates(), delhiCoordinates()]
  },
  {
    id: 'rt-2',
    name: 'Outer Ring Transit',
    // description: 'Covers the Outer Ring Road connecting suburban hubs.',
    activeBuses: 2,
    totalDetections: 210,
    healthScore: 65,
    distance: 55,
    waypoints: [delhiCoordinates(), delhiCoordinates(), delhiCoordinates(), delhiCoordinates(), delhiCoordinates()]
  },
  {
    id: 'rt-3',
    name: 'South Delhi Connector',
    // description: 'Aurobindo Marg to MG Road.',
    activeBuses: 1,
    totalDetections: 85,
    healthScore: 90,
    distance: 22,
    waypoints: [delhiCoordinates(), delhiCoordinates(), delhiCoordinates()]
  },
  {
    id: 'rt-4',
    name: 'East-West Corridor',
    // description: 'Vikas Marg to Najafgarh.',
    activeBuses: 1,
    totalDetections: 320,
    healthScore: 45,
    distance: 35,
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
