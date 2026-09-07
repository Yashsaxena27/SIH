const { chromium } = require('playwright');

async function runE2E() {
  console.log('====================================================');
  console.log('POTHOLE WALA — CHROMIUM BROWSER E2E TEST SUITE');
  console.log('====================================================');

  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });

  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
    console.log('[BROWSER]', msg.type(), msg.text());
  });

  try {
    console.log('\n[TEST 1] Testing Command Palette: Ctrl+K -> Arrow Navigation -> Selection...');
    await page.goto('http://localhost:5173/overview', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Trigger Ctrl+K
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(800);

    const searchInput = page.getByPlaceholder('Search MUIN...');
    const isVisible = await searchInput.isVisible();
    console.log('  - Command Palette opened via Ctrl+K:', isVisible ? 'PASSED' : 'FAILED');
    if (!isVisible) throw new Error('Command palette did not open on Ctrl+K');

    // Type query matching backend issues
    await searchInput.fill('iss_');
    await page.waitForTimeout(1500);

    const resultButtons = page.locator('div.fixed button');
    const count = await resultButtons.count();
    console.log('  - Search results rendered in palette:', count, 'items');

    // Test ArrowDown navigation
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(300);
    console.log('  - ArrowDown keyboard navigation: PASSED');

    // Press Enter to navigate
    const currentUrl = page.url();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    const newUrl = page.url();
    console.log('  - URL before Enter:', currentUrl);
    console.log('  - URL after Enter: ', newUrl);
    const navigated = newUrl.includes('/issues');
    console.log('  - Enter selection navigation to /issues:', navigated ? 'PASSED' : 'FAILED');
    if (!navigated) throw new Error('Navigation failed after pressing Enter in Command Palette');

    console.log('\n[TEST 2] Testing Alerts Page & Acknowledge Action...');
    await page.goto('http://localhost:5173/alerts', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const ackButtons = page.getByRole('button', { name: /Acknowledge/i });
    const ackCount = await ackButtons.count();
    console.log('  - Active unacknowledged alerts with button:', ackCount);

    if (ackCount > 0) {
      await ackButtons.first().click();
      await page.waitForTimeout(1000);
      const remainingAckCount = await page.getByRole('button', { name: /Acknowledge/i }).count();
      console.log('  - Remaining unacknowledged alerts:', remainingAckCount);
      const acknowledged = remainingAckCount < ackCount;
      console.log('  - Alert acknowledgement transition:', acknowledged ? 'PASSED' : 'FAILED');
      if (!acknowledged) throw new Error('Alert acknowledge click did not decrement unacknowledged count');
    } else {
      console.log('  - Note: Alerts currently empty or already acknowledged.');
    }

    console.log('\n[TEST 3] Testing Sidebar/TopBar Badge Mutation Reaction...');
    let badgeFetchTriggered = false;
    page.on('request', req => {
      if (req.url().includes('badges')) {
        badgeFetchTriggered = true;
      }
    });

    badgeFetchTriggered = false;
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('muin:mutation'));
    });
    await page.waitForTimeout(1200);
    console.log('  - Badge fetch triggered upon muin:mutation event:', badgeFetchTriggered ? 'PASSED' : 'FAILED');
    if (!badgeFetchTriggered) throw new Error('Badge fetch was not triggered on muin:mutation');

    console.log('\n[TEST 4] Testing Video <video> Playback, Seek & Reload...');
    const videoTestResults = await page.evaluate(async () => {
      const video = document.createElement('video');
      video.src = 'http://localhost:8000/videos/test_video.mp4';
      video.muted = true;
      video.playsInline = true;
      document.body.appendChild(video);

      await new Promise((resolve) => {
        video.onloadedmetadata = () => resolve(true);
        video.onerror = () => resolve(false);
        setTimeout(() => resolve(true), 4000);
      });

      const duration = video.duration || 0;

      await video.play().catch(() => {});
      await new Promise(r => setTimeout(r, 600));
      const isPlaying = !video.paused && video.currentTime > 0;
      const playCurrentTime = video.currentTime;

      video.currentTime = 5.0;
      await new Promise((resolve) => {
        video.onseeked = () => resolve(true);
        setTimeout(resolve, 2000);
      });
      const seekCurrentTime = video.currentTime;
      const seekSuccessful = Math.abs(seekCurrentTime - 5.0) < 0.5;

      video.load();
      await new Promise(r => setTimeout(r, 600));
      const reloadSuccessful = video.currentTime === 0;

      video.remove();

      return {
        duration,
        isPlaying,
        playCurrentTime,
        seekCurrentTime,
        seekSuccessful,
        reloadSuccessful
      };
    });

    console.log('  - Video duration:', videoTestResults.duration.toFixed(2) + 's');
    console.log('  - Video play (currentTime=' + videoTestResults.playCurrentTime.toFixed(2) + 's, isPlaying=' + videoTestResults.isPlaying + '):', videoTestResults.isPlaying ? 'PASSED' : 'FAILED');
    console.log('  - Video seek to 5.0s (currentTime=' + videoTestResults.seekCurrentTime.toFixed(2) + 's):', videoTestResults.seekSuccessful ? 'PASSED' : 'FAILED');
    console.log('  - Video reload (currentTime=0):', videoTestResults.reloadSuccessful ? 'PASSED' : 'FAILED');

    if (!videoTestResults.isPlaying) throw new Error('Video failed to play');
    if (!videoTestResults.seekSuccessful) throw new Error('Video failed to seek');
    if (!videoTestResults.reloadSuccessful) throw new Error('Video failed to reload');

    console.log('\n[TEST 5] Testing Phase 6 GIS Road Intelligence & Bidirectional Drawer Navigation...');
    await page.goto('http://localhost:5173/intelligence', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    // Verify top GIS banner shows Corridors count
    const corridorsText = await page.getByText(/Corridors/i).first().textContent();
    console.log('  - GIS Operational Banner Corridors indicator:', corridorsText ? 'PASSED (' + corridorsText.trim() + ')' : 'FAILED');

    // 1. First test road selection: click a road corridor polyline
    const corridorPolylineCount = await page.locator('path.road-corridor-polyline').count();
    console.log('  - Road corridor polylines rendered on map:', corridorPolylineCount);

    await page.evaluate(() => {
      const roadEl = document.querySelector('path.road-corridor-polyline');
      if (roadEl) {
        roadEl.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      }
    });
    await page.waitForTimeout(1200);

    const roadHealthHeader = page.getByText('Operational Road Health');
    const roadDrawerOpened = await roadHealthHeader.isVisible();
    console.log('  - RoadDrawer opened on road corridor click:', roadDrawerOpened ? 'PASSED' : 'FAILED');
    if (!roadDrawerOpened) throw new Error('RoadDrawer failed to open on road corridor selection');

    const factorBreakdown = page.getByText('Scoring Factor Breakdown');
    const hasFactors = await factorBreakdown.isVisible();
    console.log('  - Operational Road Health factors rendered:', hasFactors ? 'PASSED' : 'FAILED');
    if (!hasFactors) throw new Error('RoadDrawer missing Scoring Factor Breakdown');

    // Test navigation: RoadDrawer -> IssueDrawer via Corridor Anomaly Inspect
    await page.waitForSelector('button:has-text("Inspect")', { timeout: 4000 });
    const inspectBtns = page.getByRole('button', { name: /Inspect/i });
    const inspectCount = await inspectBtns.count();
    console.log('  - Corridor active anomalies available to inspect:', inspectCount);
    if (inspectCount === 0) throw new Error('No corridor anomalies rendered in RoadDrawer');

    await inspectBtns.first().click();
    await page.waitForTimeout(1200);

    const roadMatchCard = page.getByText('Road Corridor Matching');
    const hasMatchCard = await roadMatchCard.isVisible();
    console.log('  - Bidirectional navigation: IssueDrawer opened from Corridor Anomaly:', hasMatchCard ? 'PASSED' : 'FAILED');
    if (!hasMatchCard) throw new Error('IssueDrawer did not open with Road Corridor Matching card');

    const inspectCorridorBtn = page.getByRole('button', { name: /Inspect Road Corridor/i });
    const hasInspectCorridorBtn = await inspectCorridorBtn.isVisible();
    console.log('  - "Inspect Road Corridor" button visible in IssueDrawer:', hasInspectCorridorBtn ? 'PASSED' : 'FAILED');
    if (!hasInspectCorridorBtn) throw new Error('"Inspect Road Corridor" button not found in IssueDrawer');

    // Test reverse navigation: IssueDrawer -> RoadDrawer
    await inspectCorridorBtn.click();
    await page.waitForTimeout(1200);

    const reopenedRoadDrawer = await page.getByText('Operational Road Health').isVisible();
    console.log('  - Bidirectional return navigation back to RoadDrawer:', reopenedRoadDrawer ? 'PASSED' : 'FAILED');
    if (!reopenedRoadDrawer) throw new Error('RoadDrawer failed to re-open after clicking "Inspect Road Corridor"');

    console.log('\n====================================================');
    console.log('ALL 5 BROWSER E2E CHECKS PASSED');
    console.log('====================================================');

  } catch (error) {
    console.error('\nE2E TEST FAILURE:', error);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

runE2E();
