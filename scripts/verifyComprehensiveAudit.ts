import { chromium } from 'playwright';
import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface ViewportMetric {
  viewport: string;
  width: number;
  height: number;
  scrollWidth: number;
  scrollHeight: number;
  noHorizontalOverflow: boolean;
  domNodeCount: number;
  heapUsedMB: number | null;
  screenshot: string;
}

async function waitForServer(url: string, timeoutMs = 20000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function runAudit() {
  const outputDir = path.resolve(process.cwd(), 'artifacts/audit-screenshots');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 1. Check or start preview server
  let previewProc: ChildProcess | null = null;
  const isServerRunning = await waitForServer('http://localhost:4173', 1000);
  if (!isServerRunning) {
    console.log('Spawning vite preview on port 4173...');
    previewProc = spawn('npx', ['vite', 'preview', '--port', '4173'], {
      shell: true,
      stdio: 'inherit'
    });
    const ready = await waitForServer('http://localhost:4173', 25000);
    if (!ready) {
      throw new Error('Vite preview server failed to start within timeout.');
    }
  }

  console.log('Preview server ready at http://localhost:4173');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const metrics: ViewportMetric[] = [];

  const viewports = [
    { name: '1365x768-laptop', width: 1365, height: 768 },
    { name: '1024x768-compact', width: 1024, height: 768 },
    { name: '768x1024-tablet', width: 768, height: 1024 },
    { name: '390x844-mobile', width: 390, height: 844 }
  ];

  for (const vp of viewports) {
    console.log(`\n--- Measuring Viewport: ${vp.name} (${vp.width}x${vp.height}) ---`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1
    });
    const page = await context.newPage();

    await page.goto('http://localhost:4173', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const data = await page.evaluate(() => {
      const scrollWidth = document.documentElement.scrollWidth;
      const scrollHeight = document.documentElement.scrollHeight;
      const domNodeCount = document.querySelectorAll('*').length;
      const mem = (performance as any).memory;
      const heapUsedMB = mem ? Math.round((mem.usedJSHeapSize / (1024 * 1024)) * 100) / 100 : null;

      return {
        scrollWidth,
        scrollHeight,
        noHorizontalOverflow: scrollWidth <= window.innerWidth,
        domNodeCount,
        heapUsedMB
      };
    });

    const screenshotPath = path.join(outputDir, `${vp.name}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: vp.width < 1024 });

    metrics.push({
      viewport: vp.name,
      width: vp.width,
      height: vp.height,
      ...data,
      screenshot: screenshotPath
    });

    console.log(`Measured ${vp.name}:`, data);
    await context.close();
  }

  // Measure Layout Edit Mode, Lock, DockBar on 1365x768
  console.log('\n--- Measuring Layout Edit Mode, Lock, DockBar on 1365x768 ---');
  const context = await browser.newContext({ viewport: { width: 1365, height: 768 } });
  const page = await context.newPage();
  await page.goto('http://localhost:4173', { waitUntil: 'networkidle' });

  // 1. Open Presets popup
  const presetsBtn = page.getByTestId('dock-btn-presets');
  await presetsBtn.click();
  await page.waitForTimeout(500);

  const presetsShot = path.join(outputDir, 'desktop-presets-popup-open.png');
  await page.screenshot({ path: presetsShot });

  // 2. Toggle Edit Mode
  const editModeBtn = page.getByTestId('dock-btn-edit-layout');
  if (await editModeBtn.isVisible()) {
    await editModeBtn.click();
    await page.waitForTimeout(600);
    const inEditModeShot = path.join(outputDir, 'desktop-layout-edit-mode.png');
    await page.screenshot({ path: inEditModeShot });
  }

  // 3. Open Notes, Sounds, Spaces
  await page.getByTestId('dock-btn-notes').click();
  await page.waitForTimeout(400);
  await page.getByTestId('dock-btn-sounds').click();
  await page.waitForTimeout(400);

  const allWidgetsShot = path.join(outputDir, 'desktop-all-widgets-open.png');
  await page.screenshot({ path: allWidgetsShot });

  // 4. Test Reset Layout Confirmation
  await page.getByTestId('dock-btn-reset-layout').click();
  await page.waitForTimeout(400);
  const resetConfirmShot = path.join(outputDir, 'desktop-reset-layout-confirm-modal.png');
  await page.screenshot({ path: resetConfirmShot });

  // Click Cancel to preserve or dismiss
  const cancelBtn = page.locator('button:has-text("Hủy")');
  if (await cancelBtn.isVisible()) {
    await cancelBtn.click();
    await page.waitForTimeout(400);
  }

  await browser.close();

  if (previewProc) {
    previewProc.kill();
  }

  // Write summary JSON
  fs.writeFileSync(
    path.join(outputDir, 'audit-metrics.json'),
    JSON.stringify({ metrics, timestamp: new Date().toISOString() }, null, 2)
  );

  console.log('\nAudit completed successfully. Results saved in:', outputDir);
}

runAudit().catch((err) => {
  console.error('Audit failed:', err);
  process.exit(1);
});
