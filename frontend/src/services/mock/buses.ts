// @ts-nocheck
import type { Bus, BusTelemetry } from '@/types/bus';
import { generateId, delhiCoordinates, randomBusRegistration, generateDate } from './generators';

export const mockBuses: Bus[] = [
  {
    id: 'bus-1',
    registrationNumber: 'DL-1P-1234',
    status: 'active',
    currentRoute: 'rt-1',
    lastPing: new Date().toISOString(),
    location: delhiCoordinates(),
    speed: 42,
    detectionCount: 15,
    cameraStatus: 'online',
    systemHealth: 'good'
  },
  {
    id: 'bus-2',
    registrationNumber: 'DL-1P-5678',
    status: 'active',
    currentRoute: 'rt-2',
    lastPing: new Date().toISOString(),
    location: delhiCoordinates(),
    speed: 35,
    detectionCount: 8,
    cameraStatus: 'online',
    systemHealth: 'good'
  },
  {
    id: 'bus-3',
    registrationNumber: 'DL-1P-9012',
    status: 'active',
    currentRoute: 'rt-1',
    lastPing: new Date().toISOString(),
    location: delhiCoordinates(),
    speed: 0,
    detectionCount: 22,
    cameraStatus: 'online',
    systemHealth: 'warning'
  },
  {
    id: 'bus-4',
    registrationNumber: 'DL-1P-3456',
    status: 'idle',
    lastPing: generateDate(0.1),
    location: delhiCoordinates(),
    speed: 0,
    detectionCount: 45,
    cameraStatus: 'online',
    systemHealth: 'good'
  },
  {
    id: 'bus-5',
    registrationNumber: 'DL-1P-7890',
    status: 'active',
    currentRoute: 'rt-3',
    lastPing: new Date().toISOString(),
    location: delhiCoordinates(),
    speed: 55,
    detectionCount: 3,
    cameraStatus: 'degraded',
    systemHealth: 'warning'
  },
  {
    id: 'bus-6',
    registrationNumber: 'DL-1P-2468',
    status: 'offline',
    lastPing: generateDate(2),
    location: delhiCoordinates(),
    speed: 0,
    detectionCount: 102,
    cameraStatus: 'offline',
    systemHealth: 'critical'
  },
  {
    id: 'bus-7',
    registrationNumber: randomBusRegistration(),
    status: 'active',
    currentRoute: 'rt-4',
    lastPing: new Date().toISOString(),
    location: delhiCoordinates(),
    speed: 28,
    detectionCount: 12,
    cameraStatus: 'online',
    systemHealth: 'good'
  },
  {
    id: 'bus-8',
    registrationNumber: randomBusRegistration(),
    status: 'active',
    currentRoute: 'rt-5',
    lastPing: new Date().toISOString(),
    location: delhiCoordinates(),
    speed: 40,
    detectionCount: 27,
    cameraStatus: 'online',
    systemHealth: 'good'
  },
  {
    id: 'bus-9',
    registrationNumber: randomBusRegistration(),
    status: 'maintenance',
    lastPing: generateDate(1),
    location: delhiCoordinates(),
    speed: 0,
    detectionCount: 88,
    cameraStatus: 'offline',
    systemHealth: 'maintenance'
  },
  {
    id: 'bus-10',
    registrationNumber: randomBusRegistration(),
    status: 'active',
    currentRoute: 'rt-2',
    lastPing: new Date().toISOString(),
    location: delhiCoordinates(),
    speed: 48,
    detectionCount: 5,
    cameraStatus: 'online',
    systemHealth: 'good'
  },
  {
    id: 'bus-11',
    registrationNumber: randomBusRegistration(),
    status: 'idle',
    lastPing: generateDate(0.05),
    location: delhiCoordinates(),
    speed: 0,
    detectionCount: 19,
    cameraStatus: 'online',
    systemHealth: 'good'
  },
  {
    id: 'bus-12',
    registrationNumber: randomBusRegistration(),
    status: 'active',
    currentRoute: 'rt-6',
    lastPing: new Date().toISOString(),
    location: delhiCoordinates(),
    speed: 38,
    detectionCount: 31,
    cameraStatus: 'online',
    systemHealth: 'good'
  }
];
