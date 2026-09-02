import { realtime } from '../core/realtime';
import { issueService } from '../modules/issueService';
import type { MLEventPayload } from '@/types';
import { config } from '../core/config';

/**
 * DemoSimulator
 * 
 * Provides a controlled simulation layer capable of demonstrating the entire
 * system operational loop without needing a live backend.
 * 
 * Sequence:
 * 1. Bus detects pothole -> Emits ML Event
 * 2. Issue appears on map
 * 3. Observation count increases
 * 4. Ticket created
 * 5. Repair reported
 * 6. Verification begins -> succeeds
 */
class DemoSimulator {
  private isSimulating = false;

  async startFullLoopDemo() {
    if (this.isSimulating || !config.useMockData) return;
    this.isSimulating = true;
    console.log('[Simulator] Starting full loop demo sequence...');

    // 1. Bus detects pothole
    setTimeout(() => {
      console.log('[Simulator] Step 1: Emitting edge ML detection event');
      const mlEvent: MLEventPayload = {
        event_id: `SIM-EVT-${Date.now()}`,
        bus_id: 'BUS-017',
        timestamp: new Date().toISOString(),
        latitude: 28.5355,
        longitude: 77.3910,
        detection_type: 'pothole',
        confidence: 0.96,
        severity: 'high',
        evidence_url: '/mock/evidence.jpg'
      };
      realtime.emitLocal('ml_detection', mlEvent);
    }, 1000);

    // 2. Issue is clustered and appears (simulated via realtime update)
    setTimeout(() => {
      console.log('[Simulator] Step 2: System clusters detection into new UrbanIssue');
      realtime.emitLocal('issue_created', { id: 'SIM-ISSUE-1', status: 'open' });
    }, 4000);

    // 3. More buses pass by
    setTimeout(() => {
      console.log('[Simulator] Step 3: Second bus confirms issue. Confidence increases.');
      realtime.emitLocal('issue_updated', { id: 'SIM-ISSUE-1', observations: 2 });
    }, 7000);

    // 4. Ticket generated
    setTimeout(() => {
      console.log('[Simulator] Step 4: Confidence threshold met. Ticket dispatched to PWD.');
      realtime.emitLocal('ticket_created', { issue_id: 'SIM-ISSUE-1', department: 'PWD' });
    }, 10000);

    // Cleanup
    setTimeout(() => {
      console.log('[Simulator] Demo sequence paused.');
      this.isSimulating = false;
    }, 12000);
  }
}

export const simulator = new DemoSimulator();
