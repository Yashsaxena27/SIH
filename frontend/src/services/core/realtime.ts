import { config } from './config';

type Listener = (data: any) => void;

class RealtimeClient {
  private eventSource: EventSource | null = null;
  private listeners: Map<string, Set<Listener>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect() {
    if (config.useMockData) {
      console.log('[Realtime] Mock mode active. SSE connection skipped.');
      return;
    }

    if (this.eventSource?.readyState === EventSource.OPEN) return;

    // Use SSE stream endpoint
    const url = `${config.apiBaseUrl}/events/stream`;
    this.eventSource = new EventSource(url);

    this.eventSource.onopen = () => {
      console.log('[Realtime] Connected to SSE');
      this.reconnectAttempts = 0;
    };

    this.eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.event === 'keepalive') return; // Ignore ping
        const { type, data } = payload;
        this.emitLocal(type, data);
      } catch (err) {
        console.error('[Realtime] Message parse error:', err);
      }
    };

    this.eventSource.onerror = () => {
      console.log('[Realtime] Disconnected');
      this.eventSource?.close();
      this.attemptReconnect();
    };
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => this.connect(), 1000 * Math.pow(2, this.reconnectAttempts));
    }
  }

  on(event: string, callback: Listener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => this.off(event, callback);
  }

  off(event: string, callback: Listener) {
    this.listeners.get(event)?.delete(callback);
  }

  // Used by the Simulator to push mock events into the frontend
  emitLocal(event: string, data: any) {
    this.listeners.get(event)?.forEach(cb => cb(data));
  }
}

export const realtime = new RealtimeClient();
