import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2
  });
  const page = await context.newPage();

  const consoleLogs: string[] = [];
  page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => consoleLogs.push(`[PAGE ERROR] ${err.message}`));

  console.log('Navigating to http://localhost:5173 ...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Check background image status
  const bgStatus = await page.evaluate(() => {
    const imgEl = document.querySelector('[data-testid="background-image-element"]') as HTMLImageElement | null;
    const gradEl = document.querySelector('[data-testid="background-gradient-element"]') as HTMLElement | null;
    const videoEl = document.querySelector('[data-testid="background-video-element"]') as HTMLVideoElement | null;
    const canvas = document.querySelector('[data-testid="background-canvas"]');

    return {
      hasCanvas: !!canvas,
      imgExists: !!imgEl,
      imgSrc: imgEl?.src || null,
      imgComplete: imgEl?.complete || false,
      imgNaturalWidth: imgEl?.naturalWidth || 0,
      gradExists: !!gradEl,
      gradBackground: gradEl?.style.background || null,
      videoExists: !!videoEl
    };
  });
  console.log('Background status:', JSON.stringify(bgStatus, null, 2));

  // Check widget styles
  const widgetStyles = await page.evaluate(() => {
    const timerWidget = document.querySelector('[data-testid="widget-container-timer"]') as HTMLElement | null;
    if (!timerWidget) return null;
    const computed = window.getComputedStyle(timerWidget);
    return {
      background: computed.backgroundColor,
      backdropFilter: computed.backdropFilter,
      borderRadius: computed.borderRadius,
      border: computed.border,
      boxShadow: computed.boxShadow
    };
  });
  console.log('Timer Widget computed styles:', JSON.stringify(widgetStyles, null, 2));

  const outDir = path.resolve(process.cwd(), 'artifacts/diagnostic-screenshots');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // 1. Desktop 1440x900
  await page.screenshot({ path: path.join(outDir, 'current-desktop-1440x900.png') });
  console.log('Saved current-desktop-1440x900.png');

  // 2. Tablet 768x1024
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(outDir, 'current-tablet-768x1024.png') });
  console.log('Saved current-tablet-768x1024.png');

  // 3. Mobile 390x844
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(outDir, 'current-mobile-390x844.png') });
  console.log('Saved current-mobile-390x844.png');

  console.log('\nConsole logs during session:');
  consoleLogs.forEach(l => console.log('  ', l));

  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
