import { chromium, devices } from 'playwright';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

async function waitForServer(url, timeoutMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

async function verifyMobileSwipe() {
  const screenshotDir = path.resolve('artifacts', 'final-audit');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  let previewProc = null;
  const isServerRunning = await waitForServer('http://localhost:4173', 1000);
  if (!isServerRunning) {
    console.log('[Server] Spawning vite preview on port 4173...');
    previewProc = spawn('npx', ['vite', 'preview', '--port', '4173'], { shell: true, stdio: 'pipe' });
    const ready = await waitForServer('http://localhost:4173', 20000);
    if (!ready) {
      throw new Error('Vite preview server failed to start on port 4173');
    }
  }

  const browser = await chromium.launch({ channel: 'chrome', headless: true });

  const viewportsToTest = [
    { name: 'iPhone_SE_320x568', width: 320, height: 568, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
    { name: 'iPhone_14_390x844', width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
    { name: 'iPad_Tablet_768x1024', width: 768, height: 1024, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
  ];

  const results = [];

  for (const vp of viewportsToTest) {
    console.log(`\n=== Testing Viewport: ${vp.name} (${vp.width}x${vp.height}) ===`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: vp.deviceScaleFactor,
      isMobile: vp.isMobile,
      hasTouch: vp.hasTouch,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1'
    });

    const page = await context.newPage();
    await page.goto('http://localhost:4173', { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    // Initial check
    const initialScrollY = await page.evaluate(() => window.scrollY);
    const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    const innerHeight = await page.evaluate(() => window.innerHeight);

    console.log(`  Initial scrollY: ${initialScrollY}, scrollHeight: ${scrollHeight}, innerHeight: ${innerHeight}`);

    // Take initial screenshot
    const shotBefore = path.join(screenshotDir, `mobile_${vp.name}_before_scroll.png`);
    await page.screenshot({ path: shotBefore });

    // Touch Swipe 1: On Timer Widget Header (x: vp.width/2, y: 80 to 20)
    const client = await context.newCDPSession(page);
    const swipeHeaderStartY = Math.min(100, Math.round(vp.height * 0.2));
    const swipeHeaderEndY = 10;
    console.log(`  Performing touch swipe on Timer header (${vp.width / 2}, ${swipeHeaderStartY} -> ${swipeHeaderEndY})...`);
    
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: Math.round(vp.width / 2), y: swipeHeaderStartY }]
    });
    for (let i = 1; i <= 8; i++) {
      await client.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: Math.round(vp.width / 2), y: Math.round(swipeHeaderStartY - ((swipeHeaderStartY - swipeHeaderEndY) * i) / 8) }]
      });
      await page.waitForTimeout(25);
    }
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(400);

    const scrollYAfterHeader = await page.evaluate(() => window.scrollY);
    console.log(`  scrollY after Timer header touch swipe: ${scrollYAfterHeader}`);

    // Touch Swipe 2: In the center of the viewport (y: 400 to 100)
    const midX = Math.round(vp.width / 2);
    const startY = Math.round(vp.height * 0.7);
    const endY = Math.round(vp.height * 0.2);
    console.log(`  Performing large touch swipe in center (${midX}, ${startY} -> ${endY})...`);

    await client.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: midX, y: startY }]
    });
    for (let i = 1; i <= 12; i++) {
      await client.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: midX, y: Math.round(startY - ((startY - endY) * i) / 12) }]
      });
      await page.waitForTimeout(25);
    }
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(500);

    const scrollYAfterCenter = await page.evaluate(() => window.scrollY);
    console.log(`  scrollY after center touch swipe: ${scrollYAfterCenter}`);

    // Take scrolled screenshot
    const shotScrolled = path.join(screenshotDir, `mobile_${vp.name}_scrolled.png`);
    await page.screenshot({ path: shotScrolled });

    // Touch Swipe 3: Reverse swipe up (scroll back up)
    console.log(`  Performing touch swipe UP to scroll back (${midX}, ${endY} -> ${startY})...`);
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: midX, y: endY }]
    });
    for (let i = 1; i <= 10; i++) {
      await client.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: midX, y: Math.round(endY + ((startY - endY) * i) / 10) }]
      });
      await page.waitForTimeout(25);
    }
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(400);

    const scrollYAfterUp = await page.evaluate(() => window.scrollY);
    console.log(`  scrollY after scroll-up touch swipe: ${scrollYAfterUp}`);

    const passed = scrollYAfterCenter > 0 && scrollYAfterUp < scrollYAfterCenter;
    results.push({
      viewport: vp.name,
      dimensions: `${vp.width}x${vp.height}`,
      initialScrollY,
      scrollYAfterCenter,
      scrollYAfterUp,
      status: passed ? 'PASS' : 'FAIL'
    });

    await context.close();
  }

  // Also test SettingsWidget window behavior on Desktop (1440x900)
  console.log('\n=== Testing SettingsWidget on Desktop (1440x900) ===');
  const desktopCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const desktopPage = await desktopCtx.newPage();
  await desktopPage.goto('http://localhost:4173', { waitUntil: 'networkidle' });
  await desktopPage.evaluate(() => localStorage.clear());
  await desktopPage.reload({ waitUntil: 'networkidle' });
  await desktopPage.waitForTimeout(500);

  // Settings should be closed initially
  const settingsVisibleInitial = await desktopPage.locator('[data-testid="widget-container-settings"]').isVisible();
  console.log('  Settings window initially visible:', settingsVisibleInitial);

  // Click dock-btn-presets to open Settings window
  await desktopPage.click('[data-testid="dock-btn-presets"]');
  await desktopPage.waitForTimeout(400);

  const settingsVisibleAfterClick = await desktopPage.locator('[data-testid="widget-container-settings"]').isVisible();
  console.log('  Settings window visible after clicking dock-btn-presets:', settingsVisibleAfterClick);

  const settingsBox = await desktopPage.locator('[data-testid="widget-container-settings"]').boundingBox();
  console.log('  Settings window bounding box:', settingsBox);

  // Take screenshot with Settings window open
  const shotSettings = path.join(screenshotDir, 'desktop_settings_window_open.png');
  await desktopPage.screenshot({ path: shotSettings });

  // Enable Edit Mode to allow dragging
  await desktopPage.click('[data-testid="dock-btn-edit-layout"]');
  await desktopPage.waitForTimeout(200);

  // Test dragging settings window
  const dragHandle = desktopPage.locator('[data-testid="widget-container-settings"] [data-drag-handle="true"]');
  const handleBox = await dragHandle.boundingBox();
  if (handleBox) {
    await desktopPage.mouse.move(handleBox.x + 40, handleBox.y + 10);
    await desktopPage.mouse.down();
    await desktopPage.mouse.move(handleBox.x + 120, handleBox.y + 60, { steps: 5 });
    await desktopPage.mouse.up();
    await desktopPage.waitForTimeout(300);
  }
  const settingsBoxAfterDrag = await desktopPage.locator('[data-testid="widget-container-settings"]').boundingBox();
  console.log('  Settings window bounding box after drag:', settingsBoxAfterDrag);
  const dragSuccess = settingsBoxAfterDrag && settingsBox && settingsBoxAfterDrag.x > settingsBox.x;

  await desktopCtx.close();

  await browser.close();
  if (previewProc) {
    previewProc.kill();
  }

  console.log('\n========================================');
  console.log('       MOBILE SWIPE & SETTINGS AUDIT    ');
  console.log('========================================');
  console.table(results);
  console.log(`Settings window open & drag test: ${dragSuccess ? 'PASS' : 'FAIL'}`);

  return { results, dragSuccess };
}

verifyMobileSwipe().catch((err) => {
  console.error(err);
  process.exit(1);
});
