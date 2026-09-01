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
  // Rough bounding box for Delhi/NCR
  const minLat = 28.5;
  const maxLat = 28.8;
  const minLng = 77.0;
  const maxLng = 77.4;
  
  return {
    lat: minLat + Math.random() * (maxLat - minLat),
    lng: minLng + Math.random() * (maxLng - minLng)
  };
};

const delhiRoads = [
  'Ring Road', 'Outer Ring Road', 'Mathura Road', 'GT Karnal Road',
  'Mehrauli-Gurgaon Road', 'NH-8', 'Najafgarh Road', 'Rohtak Road',
  'Aurobindo Marg', 'August Kranti Marg', 'Vikas Marg', 'ITO Road'
];

export const randomRoadName = () => {
  return delhiRoads[Math.floor(Math.random() * delhiRoads.length)];
};

export const randomBusRegistration = () => {
  const number = Math.floor(1000 + Math.random() * 9000);
  return `DL-1P-${number}`;
};

export const randomConfidence = (min = 0.6, max = 0.98) => {
  return parseFloat((min + Math.random() * (max - min)).toFixed(2));
};

export const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
