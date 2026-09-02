import { config } from '../core/config';
import { client } from '../core/client';
import { mockBuses } from '../mock/buses';
import { mockRoutes } from '../mock/routes';
import type { Bus, Route } from '@/types';

const delay = (ms: number = 100) => new Promise(resolve => setTimeout(resolve, ms));

export const fleetService = {
  async getBuses(): Promise<Bus[]> {
    if (config.useMockData) return delay().then(() => [...mockBuses]);
    return client.get<Bus[]>('/fleet/buses');
  },

  async getBus(id: string): Promise<Bus | undefined> {
    if (config.useMockData) return delay().then(() => mockBuses.find(b => b.id === id));
    return client.get<Bus>(`/fleet/buses/${id}`);
  }
};

export const routeService = {
  async getRoutes(): Promise<Route[]> {
    if (config.useMockData) return delay().then(() => [...mockRoutes]);
    return client.get<Route[]>('/fleet/routes');
  }
};
