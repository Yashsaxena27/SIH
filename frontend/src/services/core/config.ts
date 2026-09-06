export const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',
  wsBaseUrl: import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8000/api/v1/ws',
  useMockData: import.meta.env.VITE_USE_MOCK_DATA === 'true',
  assetUrl: (path: string) => path.startsWith('http')
    ? path
    : `${(import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1').replace(/\/api\/v1\/?$/, '')}${path}`,
};
