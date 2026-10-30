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

  console.log('1. Navigating to http://localhost:5173 ...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const outDir = path.resolve(process.cwd(), 'artifacts/visual-audit-verified');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // 1. Default view (Deep Space)
  await page.screenshot({ path: path.join(outDir, '01-desktop-deep-space.png') });
  console.log('Saved 01-desktop-deep-space.png');

  // 2. Open Spaces and switch to Cozy Lofi Room
  console.log('2. Switching preset to Cozy Lofi Room...');
  await page.getByTestId('dock-btn-spaces').click();
  await page.waitForTimeout(800);
  await page.getByTestId('preset-card-cozy-lofi-room').click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(outDir, '02-desktop-cozy-lofi-room.png') });
  console.log('Saved 02-desktop-cozy-lofi-room.png');

  // 3. Switch to Rainy Window
  console.log('3. Switching preset to Rainy Window...');
  await page.getByTestId('preset-card-rainy-window').click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(outDir, '03-desktop-rainy-window.png') });
  console.log('Saved 03-desktop-rainy-window.png');

  // 4. Switch to Misty Forest
  console.log('4. Switching preset to Misty Forest...');
  await page.getByTestId('preset-card-pine-forest').click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(outDir, '04-desktop-pine-forest.png') });
  console.log('Saved 04-desktop-pine-forest.png');

  // Close spaces
  await page.getByTestId('close-widget-spaces').click();
  await page.waitForTimeout(500);

  // 5. Open Audio Widget & test YouTube curated
  console.log('5. Testing Audio Widget & YouTube Stream...');
  await page.getByTestId('dock-btn-sounds').click();
  await page.waitForTimeout(800);
  // Click YouTube accordion
  const lofiBtn = page.getByRole('button', { name: /Nhúng Nhạc Lofi Stream/i });
  if (await lofiBtn.isVisible()) {
    await lofiBtn.click();
    await page.waitForTimeout(500);
  }
  // Click curated stream Lofi Girl Live
  const lofiGirlBtn = page.getByRole('button', { name: /Lofi Girl Live/i });
  if (await lofiGirlBtn.isVisible()) {
    await lofiGirlBtn.click();
    await page.waitForTimeout(1000);
  }
  await page.screenshot({ path: path.join(outDir, '05-desktop-audio-lofi-stream.png') });
  console.log('Saved 05-desktop-audio-lofi-stream.png');

  // 6. Test Timer Start & Mini Pill
  console.log('6. Testing Timer Start & Mini Pill...');
  await page.getByTestId('timer-start-btn').click();
  await page.waitForTimeout(1000);
  await page.getByTestId('btn-toggle-mini-pill-timer').click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(outDir, '06-desktop-mini-pill-running.png') });
  console.log('Saved 06-desktop-mini-pill-running.png');

  // Expand back
  await page.getByTestId('mini-timer-expand-btn').click();
  await page.waitForTimeout(500);
  await page.getByTestId('timer-pause-btn').click();

  // 7. Test Zen Mode
  console.log('7. Testing Zen Mode...');
  await page.keyboard.press('z');
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(outDir, '07-desktop-zen-mode.png') });
  console.log('Saved 07-desktop-zen-mode.png');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // 8. Mobile 390x844
  console.log('8. Testing Mobile...');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(outDir, '08-mobile-390x844.png') });
  console.log('Saved 08-mobile-390x844.png');

  // Scroll to bottom
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(outDir, '09-mobile-390x844-scrolled.png') });
  console.log('Saved 09-mobile-390x844-scrolled.png');

  // 9. Tablet 768x1024
  console.log('9. Testing Tablet...');
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(outDir, '10-tablet-768x1024.png') });
  console.log('Saved 10-tablet-768x1024.png');

  await browser.close();
  console.log('All verification screenshots captured successfully!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
