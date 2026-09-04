// @ts-nocheck
import type { RoadSegment, RoadHealth, RoadHealthSummary } from '@/types/road';
import { delhiCoordinates, randomRoadName, generateDate } from './generators';

export const mockRoadSegments: RoadSegment[] = Array.from({ length: 10 }).map((_, i) => {
  return {
    id: `rs-${i + 1}`,
    name: randomRoadName(),
    startPoint: delhiCoordinates(),
    endPoint: delhiCoordinates(),
    lengthKm: (Math.random() * 5 + 1) * 1000, // 1km to 6km
    healthScore: Math.floor(Math.random() * 60) + 40, // 40 to 100
    activeIssuesCount: Math.floor(Math.random() * 20),
    roadType: "arterial", healthTrend: "stable", lastSurveyed: generateDate(2)
  };
});

export const mockRoadHealthSummary: RoadHealthSummary = {
  totalSegments: 120,
  averageHealth: 76.5,
  averageScore: 76.5,
  criticalSegments: 12,
  decliningSegments: 8,
  improvedSegments: 45,
  totalDefects: 210,
  resolvedThisMonth: 85,
  segmentDistribution: {
    excellent: 40,
    good: 50,
    fair: 18,
    critical: 12
  }
};

export const mockRoadHealthHistory: RoadHealth[] = Array.from({ length: 30 }).map((_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - (30 - i));
  return {
    segmentId: 'overall',
    date: date.toISOString(),
    score: 70 + Math.sin(i / 3) * 10 + (i / 10), // Trending slightly up with some waves
    defectCount: 5 - (i / 10) + Math.random() // Trending slightly down
  };
});
