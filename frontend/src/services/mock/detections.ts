// @ts-nocheck
import type { Detection, DetectionSummary } from '@/types/detection';
import { generateId, delhiCoordinates, generateDate, randomConfidence } from './generators';

export const mockDetections: Detection[] = Array.from({ length: 25 }).map((_, i) => {
  const classes: Array<'pothole' | 'crack' | 'road_damage'> = ['pothole', 'crack', 'road_damage'];
  const detectionClass = classes[i % 3];
  const severities: Array<'low' | 'medium' | 'high' | 'critical'> = ['low', 'medium', 'high', 'critical'];
  const severity = severities[i % 4];
  
  return {
    id: `det-${i + 1}`,
    busId: `bus-${(i % 12) + 1}`,
    timestamp: generateDate(7), // within last 7 days
    location: delhiCoordinates(),
    class: detectionClass,
    confidence: randomConfidence(),
    severity,
    imageUrl: `/mock-images/detection-${(i % 5) + 1}.jpg`,
    isConfirmed: i % 2 === 0,
    frameSequence: i % 2 === 0 ? 3 : 1
  };
});

export const mockDetectionSummary: DetectionSummary = {
  total: 12450,
  today: 142,
  byClass: {
    pothole: 6800,
    crack: 4100,
    road_damage: 1550
  },
  bySeverity: {
    low: 5200,
    medium: 4800,
    high: 1950,
    critical: 500
  },
  trend: 12.5 // 12.5% up
};
