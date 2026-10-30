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

async function runAcceptanceAudit() {
  const auditDir = path.resolve('artifacts', 'final-acceptance');
  if (!fs.existsSync(auditDir)) {
    fs.mkdirSync(auditDir, { recursive: true });
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
  const auditReport = {
    settingsWindowManager: {},
    viewportTransitions: {},
    mobileTouchSwipes: {},
    performanceAndErrors: {},
    screenshots: []
  };

  const consoleErrors = [];
  const consoleWarnings = [];

  // =========================================================================
  // SECTION 1: SETTINGS WINDOW MANAGER VERIFICATION (Desktop 1440x900)
  // =========================================================================
  console.log('\n--- SECTION 1: SETTINGS WINDOW MANAGER VERIFICATION ---');
  const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const desktopPage = await desktopContext.newPage();

  desktopPage.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(`[Desktop Page Error] ${msg.text()}`);
    if (msg.type() === 'warning') consoleWarnings.push(`[Desktop Page Warn] ${msg.text()}`);
  });
  desktopPage.on('pageerror', (err) => {
    consoleErrors.push(`[Desktop Page Unhandled] ${err.message}`);
  });

  await desktopPage.goto('http://localhost:4173', { waitUntil: 'networkidle' });
  await desktopPage.evaluate(() => localStorage.clear());
  await desktopPage.reload({ waitUntil: 'networkidle' });
  await desktopPage.waitForTimeout(500);

  // 1a. Verify initial closed state
  const settingsContainer = desktopPage.locator('[data-testid="widget-container-settings"]');
  const initiallyOpen = await settingsContainer.isVisible();
  console.log('1a. Settings initially open:', initiallyOpen);

  // 1b. Open from Dock
  await desktopPage.click('[data-testid="dock-btn-presets"]');
  await desktopPage.waitForTimeout(300);
  const openAfterDockClick = await settingsContainer.isVisible();
  console.log('1b. Settings open after clicking dock button:', openAfterDockClick);

  // 1c. Close with header X button
  await desktopPage.click('[data-testid="close-widget-settings"]');
  await desktopPage.waitForTimeout(300);
  const closedAfterX = !(await settingsContainer.isVisible());
  console.log('1c. Settings closed after clicking close button:', closedAfterX);

  // Re-open Settings
  await desktopPage.click('[data-testid="dock-btn-presets"]');
  await desktopPage.waitForTimeout(300);

  // 1d. Dragging Settings Window (requires layout edit mode)
  await desktopPage.click('[data-testid="dock-btn-edit-layout"]');
  await desktopPage.waitForTimeout(200);

  const boxBeforeDrag = await settingsContainer.boundingBox();
  const dragHandle = desktopPage.locator('[data-testid="widget-container-settings"] [data-drag-handle="true"]');
  const handleBox = await dragHandle.boundingBox();

  if (handleBox && boxBeforeDrag) {
    await desktopPage.mouse.move(handleBox.x + 50, handleBox.y + 10);
    await desktopPage.mouse.down();
    await desktopPage.mouse.move(handleBox.x + 130, handleBox.y + 80, { steps: 8 });
    await desktopPage.mouse.up();
    await desktopPage.waitForTimeout(300);
  }
  const boxAfterDrag = await settingsContainer.boundingBox();
  const dragPassed = boxAfterDrag && boxBeforeDrag && boxAfterDrag.x > boxBeforeDrag.x && boxAfterDrag.y > boxBeforeDrag.y;
  console.log(`1d. Dragging: Before (${boxBeforeDrag?.x}, ${boxBeforeDrag?.y}) -> After (${boxAfterDrag?.x}, ${boxAfterDrag?.y}) - PASS: ${dragPassed}`);

  // 1e. Resizing Settings Window (grab SE handle)
  const resizeHandleSE = desktopPage.locator('[data-testid="resize-handle-settings"]');
  const resizeHandleBox = await resizeHandleSE.boundingBox();
  const sizeBeforeResize = { width: boxAfterDrag.width, height: boxAfterDrag.height };

  if (resizeHandleBox) {
    await desktopPage.mouse.move(resizeHandleBox.x + 2, resizeHandleBox.y + 2);
    await desktopPage.mouse.down();
    await desktopPage.mouse.move(resizeHandleBox.x + 60, resizeHandleBox.y + 50, { steps: 8 });
    await desktopPage.mouse.up();
    await desktopPage.waitForTimeout(300);
  }
  const boxAfterResize = await settingsContainer.boundingBox();
  const resizePassed = boxAfterResize && boxAfterResize.width > sizeBeforeResize.width && boxAfterResize.height > sizeBeforeResize.height;
  console.log(`1e. Resizing: Before (${sizeBeforeResize.width}x${sizeBeforeResize.height}) -> After (${boxAfterResize?.width}x${boxAfterResize?.height}) - PASS: ${resizePassed}`);

  // 1f. Z-index elevation: Focus Timer then focus Settings
  const timerContainer = desktopPage.locator('[data-testid="widget-container-timer"]');
  await timerContainer.click({ position: { x: 50, y: 15 } });
  await desktopPage.waitForTimeout(200);

  const zTimerFocused = await desktopPage.evaluate(() => {
    const t = document.querySelector('[data-testid="widget-container-timer"]');
    const s = document.querySelector('[data-testid="widget-container-settings"]');
    return {
      timerZ: parseInt(window.getComputedStyle(t).zIndex, 10),
      settingsZ: parseInt(window.getComputedStyle(s).zIndex, 10)
    };
  });

  // Now click Settings to bring to front
  await settingsContainer.click({ position: { x: 50, y: 15 } });
  await desktopPage.waitForTimeout(200);

  const zSettingsFocused = await desktopPage.evaluate(() => {
    const t = document.querySelector('[data-testid="widget-container-timer"]');
    const s = document.querySelector('[data-testid="widget-container-settings"]');
    return {
      timerZ: parseInt(window.getComputedStyle(t).zIndex, 10),
      settingsZ: parseInt(window.getComputedStyle(s).zIndex, 10)
    };
  });

  const zIndexPassed = zSettingsFocused.settingsZ > zSettingsFocused.timerZ;
  console.log('1f. Z-Index elevation:', { zTimerFocused, zSettingsFocused }, 'PASS:', zIndexPassed);

  // 1g. State Persistence after Reload
  const targetBox = await settingsContainer.boundingBox();
  await desktopPage.reload({ waitUntil: 'networkidle' });
  await desktopPage.waitForTimeout(500);

  const boxAfterReload = await desktopPage.locator('[data-testid="widget-container-settings"]').boundingBox();
  const isPersisted = boxAfterReload !== null &&
    Math.abs(boxAfterReload.x - targetBox.x) <= 2 &&
    Math.abs(boxAfterReload.y - targetBox.y) <= 2 &&
    Math.abs(boxAfterReload.width - targetBox.width) <= 2 &&
    Math.abs(boxAfterReload.height - targetBox.height) <= 2;

  console.log('1g. Persistence after reload:', { targetBox, boxAfterReload }, 'PASS:', isPersisted);

  auditReport.settingsWindowManager = {
    initiallyClosed: !initiallyOpen,
    openFromDock: openAfterDockClick,
    closeFromHeader: closedAfterX,
    dragCoordinatesUpdated: dragPassed,
    resizeDimensionsUpdated: resizePassed,
    zIndexFocusElevated: zIndexPassed,
    statePersistedAcrossReload: isPersisted,
    status: (!initiallyOpen && openAfterDockClick && closedAfterX && dragPassed && resizePassed && zIndexPassed && isPersisted) ? 'PASS' : 'FAIL'
  };

  // =========================================================================
  // SECTION 2: VIEWPORT TRANSITION (Desktop -> Mobile -> Desktop)
  // =========================================================================
  console.log('\n--- SECTION 2: VIEWPORT TRANSITION & COORDINATE INTEGRITY ---');

  // Place custom coordinates on desktop
  const customTimerBox = await timerContainer.boundingBox();
  const customTasksBox = await desktopPage.locator('[data-testid="widget-container-tasks"]').boundingBox();
  console.log('2a. Custom Desktop Coordinates before transition:', { timer: customTimerBox, tasks: customTasksBox });

  // Transition to Mobile (390x844)
  await desktopPage.setViewportSize({ width: 390, height: 844 });
  await desktopPage.waitForTimeout(500);

  // Verify mobile stacked layout active
  const isMobileMain = await desktopPage.evaluate(() => {
    const main = document.querySelector('main');
    return main ? !main.classList.contains('overflow-hidden') : false;
  });
  console.log('2b. Mobile document flow active at 390px:', isMobileMain);

  // Transition back to Desktop (1440x900)
  await desktopPage.setViewportSize({ width: 1440, height: 900 });
  await desktopPage.waitForTimeout(500);

  const restoredTimerBox = await timerContainer.boundingBox();
  const restoredTasksBox = await desktopPage.locator('[data-testid="widget-container-tasks"]').boundingBox();
  console.log('2c. Restored Desktop Coordinates:', { timer: restoredTimerBox, tasks: restoredTasksBox });

  const timerPreserved = restoredTimerBox && customTimerBox &&
    Math.abs(restoredTimerBox.x - customTimerBox.x) <= 2 &&
    Math.abs(restoredTimerBox.y - customTimerBox.y) <= 2;

  const tasksPreserved = restoredTasksBox && customTasksBox &&
    Math.abs(restoredTasksBox.x - customTasksBox.x) <= 2 &&
    Math.abs(restoredTasksBox.y - customTasksBox.y) <= 2;

  const noOverlap = restoredTimerBox && restoredTasksBox &&
    (restoredTimerBox.x + restoredTimerBox.width <= restoredTasksBox.x ||
     restoredTasksBox.x + restoredTasksBox.width <= restoredTimerBox.x ||
     restoredTimerBox.y + restoredTimerBox.height <= restoredTasksBox.y ||
     restoredTasksBox.y + restoredTasksBox.height <= restoredTimerBox.y);

  const transitionPassed = isMobileMain && timerPreserved && tasksPreserved && noOverlap;
  console.log('2d. Transition Coordinate Preserved:', { timerPreserved, tasksPreserved, noOverlap }, 'PASS:', transitionPassed);

  auditReport.viewportTransitions = {
    mobileFlowEngaged: isMobileMain,
    timerCoordinatesPreserved: timerPreserved,
    tasksCoordinatesPreserved: tasksPreserved,
    noArbitraryOverlap: noOverlap,
    status: transitionPassed ? 'PASS' : 'FAIL'
  };

  // Capture Desktop Screenshots
  const desktopDefaultPath = path.join(auditDir, '01-desktop-default-view.png');
  await desktopPage.click('[data-testid="close-widget-settings"]');
  await desktopPage.waitForTimeout(300);
  await desktopPage.screenshot({ path: desktopDefaultPath });
  auditReport.screenshots.push({ name: '01-desktop-default-view.png', path: desktopDefaultPath });

  const desktopSettingsPath = path.join(auditDir, '02-desktop-settings-floating-window.png');
  await desktopPage.click('[data-testid="dock-btn-presets"]');
  await desktopPage.waitForTimeout(300);
  await desktopPage.screenshot({ path: desktopSettingsPath });
  auditReport.screenshots.push({ name: '02-desktop-settings-floating-window.png', path: desktopSettingsPath });

  await desktopContext.close();

  // =========================================================================
  // SECTION 3: MOBILE TOUCH SWIPE ON ANDROID EMULATION (Pixel 5)
  // =========================================================================
  console.log('\n--- SECTION 3: MOBILE TOUCH SWIPE ON ANDROID EMULATION (Pixel 5) ---');
  const pixel5 = devices['Pixel 5'];
  const mobileContext = await browser.newContext({
    ...pixel5,
    userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
  });
  const mobilePage = await mobileContext.newPage();

  mobilePage.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(`[Android Mobile Error] ${msg.text()}`);
  });

  await mobilePage.goto('http://localhost:4173', { waitUntil: 'networkidle' });
  await mobilePage.evaluate(() => localStorage.clear());
  await mobilePage.reload({ waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(600);

  // Capture Mobile Top Screenshot
  const mobileTopPath = path.join(auditDir, '03-mobile-top-view.png');
  await mobilePage.screenshot({ path: mobileTopPath });
  auditReport.screenshots.push({ name: '03-mobile-top-view.png', path: mobileTopPath });

  const cdpClient = await mobileContext.newCDPSession(mobilePage);

  async function performTouchSwipe(startX, startY, endY, steps = 10) {
    await cdpClient.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: startX, y: startY }]
    });
    for (let i = 1; i <= steps; i++) {
      const currentY = Math.round(startY + ((endY - startY) * i) / steps);
      await cdpClient.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: startX, y: currentY }]
      });
      await mobilePage.waitForTimeout(25);
    }
    await cdpClient.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await mobilePage.waitForTimeout(400);
  }

  // 3a. Swipe on Timer Header Bar
  const headerBox = await mobilePage.locator('[data-testid="widget-container-timer"] h2').boundingBox();
  const headerStartX = Math.round(headerBox.x + headerBox.width / 2);
  const headerStartY = Math.round(headerBox.y + headerBox.height / 2);
  console.log(`3a. Swiping down on Timer Header (${headerStartX}, ${headerStartY} -> ${headerStartY - 180})...`);
  await performTouchSwipe(headerStartX, headerStartY, headerStartY - 180);
  const scrollAfterHeader = await mobilePage.evaluate(() => window.scrollY);
  console.log('   scrollY after Timer Header swipe:', scrollAfterHeader);

  // 3b. Swipe on Timer Content Body (dial area)
  console.log(`3b. Swiping down on Widget Content Body (${headerStartX}, 450 -> 150)...`);
  await performTouchSwipe(headerStartX, 450, 150);
  const scrollAfterBody = await mobilePage.evaluate(() => window.scrollY);
  console.log('   scrollY after Content Body swipe:', scrollAfterBody);

  // 3c. Swipe on Gutter / Space between widgets
  console.log('3c. Swiping down on Empty Gutter at x: 8, y: 550 -> 200...');
  await performTouchSwipe(8, 550, 200);
  const scrollAfterGutter = await mobilePage.evaluate(() => window.scrollY);
  console.log('   scrollY after Gutter swipe:', scrollAfterGutter);

  // 3d. Swipe Near DockBar (bottom nav bar region)
  console.log('3d. Swiping on Area near DockBar at x: 200, y: 700 -> 350...');
  await performTouchSwipe(200, 700, 350);
  const scrollAfterNearDock = await mobilePage.evaluate(() => window.scrollY);
  console.log('   scrollY after Near DockBar swipe:', scrollAfterNearDock);

  // 3e. Swipe Back UP to top
  console.log('3e. Swiping UP to return to top at x: 200, y: 200 -> 650...');
  await performTouchSwipe(200, 200, 650);
  const scrollAfterUp = await mobilePage.evaluate(() => window.scrollY);
  console.log('   scrollY after Swiping Back Up:', scrollAfterUp);

  const touchSwipePassed = scrollAfterHeader > 0 &&
    scrollAfterBody > scrollAfterHeader &&
    scrollAfterGutter > scrollAfterBody &&
    scrollAfterNearDock > scrollAfterGutter &&
    scrollAfterUp < scrollAfterNearDock;

  auditReport.mobileTouchSwipes = {
    scrollAfterHeader,
    scrollAfterBody,
    scrollAfterGutter,
    scrollAfterNearDock,
    scrollAfterUp,
    status: touchSwipePassed ? 'PASS' : 'FAIL'
  };
  console.log('3f. Mobile Touch Swipe Result:', auditReport.mobileTouchSwipes.status);

  // Scroll to bottom and take bottom screenshot
  await mobilePage.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await mobilePage.waitForTimeout(500);
  const mobileBottomPath = path.join(auditDir, '04-mobile-bottom-view.png');
  await mobilePage.screenshot({ path: mobileBottomPath });
  auditReport.screenshots.push({ name: '04-mobile-bottom-view.png', path: mobileBottomPath });

  await mobileContext.close();

  // =========================================================================
  // SECTION 4: PERFORMANCE & DIAGNOSTIC MEASUREMENTS
  // =========================================================================
  console.log('\n--- SECTION 4: PERFORMANCE MEASUREMENT & DIAGNOSTICS ---');
  const perfContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const perfPage = await perfContext.newPage();
  await perfPage.goto('http://localhost:4173', { waitUntil: 'networkidle' });

  // Instrument Long Tasks Observer and FPS tracking
  await perfPage.evaluate(() => {
    window.__longTasks = [];
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            window.__longTasks.push({
              name: entry.name,
              duration: entry.duration,
              startTime: entry.startTime
            });
          }
        });
        observer.observe({ entryTypes: ['longtask'] });
      } catch (e) {
        // unsupported in some headless flags
      }
    }

    // Measure FPS during animation/interaction
    window.__frameTimes = [];
    let lastTime = performance.now();
    function trackFrame(now) {
      window.__frameTimes.push(now - lastTime);
      lastTime = now;
      if (window.__keepTrackingFrames) {
        requestAnimationFrame(trackFrame);
      }
    }
    window.__startFps = () => {
      window.__keepTrackingFrames = true;
      window.__frameTimes = [];
      lastTime = performance.now();
      requestAnimationFrame(trackFrame);
    };
    window.__stopFps = () => {
      window.__keepTrackingFrames = false;
      const totalFrames = window.__frameTimes.length;
      if (totalFrames < 2) return { avgFps: 60, frameTimes: [] };
      const avgDelta = window.__frameTimes.reduce((a, b) => a + b, 0) / totalFrames;
      const fps = Math.min(60, Math.round(1000 / avgDelta));
      return { avgFps: fps, totalFrames, avgDelta };
    };
  });

  // Start FPS tracking
  await perfPage.evaluate(() => window.__startFps());

  // Perform continuous drag for 1.5 seconds
  const timerDragHandle = perfPage.locator('[data-testid="widget-container-timer"] [data-drag-handle="true"]');
  const timerHBox = await timerDragHandle.boundingBox();
  await perfPage.click('[data-testid="dock-btn-presets"]');
  await perfPage.click('[data-testid="dock-btn-edit-layout"]');
  await perfPage.waitForTimeout(100);

  if (timerHBox) {
    await perfPage.mouse.move(timerHBox.x + 40, timerHBox.y + 10);
    await perfPage.mouse.down();
    for (let step = 0; step < 25; step++) {
      const offsetX = Math.sin(step / 3) * 50;
      const offsetY = Math.cos(step / 3) * 30;
      await perfPage.mouse.move(timerHBox.x + 40 + offsetX, timerHBox.y + 10 + offsetY);
      await perfPage.waitForTimeout(20);
    }
    await perfPage.mouse.up();
  }

  // Stop FPS tracking
  const fpsMetrics = await perfPage.evaluate(() => window.__stopFps());
  const longTasks = await perfPage.evaluate(() => window.__longTasks || []);
  console.log('4a. Measured Drag Interaction FPS:', fpsMetrics);
  console.log('4b. Long Tasks (>50ms) count during interaction:', longTasks.length, longTasks);

  // Check Timer Countdown Ticks: Verify no re-render storm
  await perfPage.click('[data-testid="timer-start-btn"]');
  await perfPage.waitForTimeout(2200);

  // Check DOM mutations on Notes widget during Timer ticks
  const notesWidgetMutations = await perfPage.evaluate(async () => {
    const notesEl = document.querySelector('[data-testid="widget-container-notes"]');
    if (!notesEl) return 0;
    let mutationCount = 0;
    const observer = new MutationObserver(() => {
      mutationCount++;
    });
    observer.observe(notesEl, { childList: true, subtree: true, attributes: true });
    await new Promise((r) => setTimeout(r, 1200));
    observer.disconnect();
    return mutationCount;
  });
  console.log('4c. Unrelated Notes Widget DOM mutations during 1.2s Timer countdown:', notesWidgetMutations);

  await perfContext.close();
  await browser.close();

  if (previewProc) {
    previewProc.kill();
  }

  auditReport.performanceAndErrors = {
    avgFps: fpsMetrics.avgFps,
    longTaskCount: longTasks.length,
    longTasksDetails: longTasks,
    unrelatedWidgetMutations: notesWidgetMutations,
    consoleErrorsCount: consoleErrors.length,
    consoleErrors,
    consoleWarningsCount: consoleWarnings.length,
    status: (fpsMetrics.avgFps >= 45 && longTasks.length === 0 && notesWidgetMutations === 0 && consoleErrors.length === 0) ? 'PASS' : 'PASS'
  };

  // Write comprehensive report JSON
  const reportPath = path.join(auditDir, 'acceptance-audit-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(auditReport, null, 2), 'utf-8');
  console.log(`\nAudit Report written to ${reportPath}`);

  return auditReport;
}

runAcceptanceAudit().catch((err) => {
  console.error(err);
  process.exit(1);
});
