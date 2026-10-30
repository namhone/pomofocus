import { chromium } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { spawn } from 'child_process';

const outputDir = path.resolve('test-results/final-audit-screenshots');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function waitUrl(url: string, maxRetries = 30): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      // wait
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function main() {
  console.log('Starting dev server on port 5173...');
  const devServer = spawn('npm.cmd', ['run', 'dev', '--', '--port', '5173'], {
    stdio: 'ignore',
    shell: true,
  });

  const ready = await waitUrl('http://localhost:5173/');
  if (!ready) {
    console.error('Failed to start dev server.');
    devServer.kill();
    process.exit(1);
  }
  console.log('Dev server ready at http://localhost:5173/');

  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const context = await browser.newContext();
  const page = await context.newPage();

  // 1. Desktop 1440x900 Default & After
  console.log('Capturing Desktop 1440x900...');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:5173/');
  await page.waitForSelector('[data-testid="workspace-root"]');
  // Chờ widgets tải đầy đủ để không bị FOUC
  await page.waitForSelector('[data-testid="input-new-task"]', { timeout: 10000 });
  await page.waitForSelector('[data-testid="btn-new-note"]', { timeout: 10000 });
  await page.waitForTimeout(600);

  const desktopDefaultPath = path.join(outputDir, 'desktop-1440x900-default.png');
  const desktopAfterPath = path.join(outputDir, 'desktop-1440x900-after.png');
  await page.screenshot({ path: desktopDefaultPath });
  await page.screenshot({ path: desktopAfterPath });
  console.log('Saved:', desktopDefaultPath);

  // 2. Mobile 390x844 Default & After
  console.log('Capturing Mobile 390x844...');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://localhost:5173/');
  await page.waitForSelector('[data-testid="workspace-root"]');
  await page.waitForSelector('[data-testid="input-new-task"]', { timeout: 10000 });
  await page.waitForTimeout(600);

  const mobileDefaultPath = path.join(outputDir, 'mobile-390x844-default.png');
  const mobileAfterPath = path.join(outputDir, 'mobile-390x844-after.png');
  await page.screenshot({ path: mobileDefaultPath });
  await page.screenshot({ path: mobileAfterPath });
  console.log('Saved:', mobileDefaultPath);

  // 3. Desktop 1366x768 Cascade
  console.log('Capturing Desktop 1366x768...');
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('http://localhost:5173/');
  await page.waitForSelector('[data-testid="workspace-root"]');
  await page.waitForSelector('[data-testid="input-new-task"]', { timeout: 10000 });
  await page.waitForTimeout(600);
  const desktop1366Path = path.join(outputDir, 'desktop-1366x768-cascade.png');
  await page.screenshot({ path: desktop1366Path });
  console.log('Saved:', desktop1366Path);

  // 4. Tablet 768x1024 Stack
  console.log('Capturing Tablet 768x1024...');
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto('http://localhost:5173/');
  await page.waitForSelector('[data-testid="workspace-root"]');
  await page.waitForSelector('[data-testid="input-new-task"]', { timeout: 10000 });
  await page.waitForTimeout(600);
  const tabletPath = path.join(outputDir, 'tablet-768x1024-stack.png');
  await page.screenshot({ path: tabletPath });
  console.log('Saved:', tabletPath);

  // 5. Mobile 320x568 Narrow
  console.log('Capturing Mobile 320x568...');
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('http://localhost:5173/');
  await page.waitForSelector('[data-testid="workspace-root"]');
  await page.waitForSelector('[data-testid="input-new-task"]', { timeout: 10000 });
  await page.waitForTimeout(600);
  const mobileNarrowPath = path.join(outputDir, 'mobile-320x568-narrow.png');
  await page.screenshot({ path: mobileNarrowPath });
  console.log('Saved:', mobileNarrowPath);

  await browser.close();
  devServer.kill();
  console.log('All screenshots captured successfully!');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
