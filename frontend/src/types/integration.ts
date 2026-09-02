export interface MLEventPayload {
  event_id: string;
  bus_id: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  detection_type: string;
  confidence: number;
  severity: string;
  evidence_url: string;
}

// Add map rendering formats for future consumption
export interface GeoJSONFeature {
  type: 'Feature';
  geometry: {
    type: 'Point' | 'LineString' | 'Polygon';
    coordinates: number[] | number[][] | number[][][];
  };
  properties: Record<string, any>;
}

export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}
