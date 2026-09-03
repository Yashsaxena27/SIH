// @ts-nocheck
export const generateId = (prefix: string = '') => {
  return `${prefix}${Math.random().toString(36).substring(2, 9)}`;
};

export const generateDate = (daysAgoStart: number, daysAgoEnd: number = 0) => {
  const start = new Date();
  start.setDate(start.getDate() - daysAgoStart);
  
  const end = new Date();
  end.setDate(end.getDate() - daysAgoEnd);
  
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString();
};

export const delhiCoordinates = () => {
  // Canonical Bengaluru Corridor Bounding Box (MG Road, Koramangala, Indiranagar, ORR)
  const minLat = 12.930;
  const maxLat = 12.985;
  const minLng = 77.585;
  const maxLng = 77.655;
  
  return {
    lat: minLat + Math.random() * (maxLat - minLat),
    lng: minLng + Math.random() * (maxLng - minLng)
  };
};

const bengaluruRoads = [
  'MG Road', 'Koramangala 100ft Road', 'Indiranagar 100ft Road', 'Outer Ring Road (ORR)',
  'Brigade Road', 'Hosur Road', 'Old Airport Road', 'Residency Road',
  'Sarjapur Road', 'Bellary Road', 'Whitefield Main Road', 'Richmond Road'
];

export const randomRoadName = () => {
  return bengaluruRoads[Math.floor(Math.random() * bengaluruRoads.length)];
};

export const randomBusRegistration = () => {
  const number = Math.floor(1000 + Math.random() * 9000);
  return `KA-01-F-${number}`;
};

export const randomConfidence = (min = 0.6, max = 0.98) => {
  return parseFloat((min + Math.random() * (max - min)).toFixed(2));
};

export const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
