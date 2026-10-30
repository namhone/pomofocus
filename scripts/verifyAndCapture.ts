import { chromium } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { spawn } from 'child_process';

const outputDir = path.resolve('artifacts/visual-audit');
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

async function run() {
  console.log('--- BẮT ĐẦU VÒNG XÁC MINH VÀ CHỤP ẢNH TOÀN DIỆN (LIFEAT × APPLE) ---');
  const devServer = spawn('npm.cmd', ['run', 'dev', '--', '--port', '5173'], {
    stdio: 'ignore',
    shell: true,
  });

  const ready = await waitUrl('http://localhost:5173/');
  if (!ready) {
    console.error('Không thể khởi chạy Vite dev server.');
    devServer.kill();
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true, channel: 'chrome' });

  // 1. Desktop 1440x900 Default (Cosmic Nebula Image Background + Translucent Glass Windows)
  console.log('\n[1] Desktop 1440x900 - Mặc định (Cosmic Nebula):');
  const ctxDesktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pageDesktop = await ctxDesktop.newPage();
  await pageDesktop.goto('http://localhost:5173/');
  await pageDesktop.waitForSelector('[data-testid="input-new-task"]');
  await pageDesktop.waitForSelector('[data-testid="btn-new-note"]');
  // Wait for background image to load
  await pageDesktop.waitForSelector('[data-testid="background-image-element"]');
  await pageDesktop.waitForTimeout(1500);

  const default1440Path = path.join(outputDir, 'desktop-1440x900-default-nebula.png');
  await pageDesktop.screenshot({ path: default1440Path });
  console.log(' -> Saved:', default1440Path);

  // 2. Desktop 1440x900 - Chuyển sang Preset "Cozy Study Workspace"
  console.log('\n[2] Desktop 1440x900 - Preset Cozy Study:');
  await pageDesktop.click('[data-testid="dock-btn-spaces"]');
  await pageDesktop.waitForSelector('[data-testid="spaces-widget"]');
  await pageDesktop.waitForTimeout(500);

  // Chọn preset cozy-study
  const cozyBtn = pageDesktop.locator('[data-testid="preset-card-cozy-study"]');
  if (await cozyBtn.isVisible()) {
    await cozyBtn.click();
    await pageDesktop.waitForTimeout(1500);
  }
  const cozy1440Path = path.join(outputDir, 'desktop-1440x900-cozy-study.png');
  await pageDesktop.screenshot({ path: cozy1440Path });
  console.log(' -> Saved:', cozy1440Path);

  // 3. Desktop 1440x900 - Chuyển sang Preset "Rainy Window"
  console.log('\n[3] Desktop 1440x900 - Preset Rainy Window:');
  const rainBtn = pageDesktop.locator('[data-testid="preset-card-rainy-window"]');
  if (await rainBtn.isVisible()) {
    await rainBtn.click();
    await pageDesktop.waitForTimeout(1500);
  }
  const rain1440Path = path.join(outputDir, 'desktop-1440x900-rainy-window.png');
  await pageDesktop.screenshot({ path: rain1440Path });
  console.log(' -> Saved:', rain1440Path);

  // 3b. Desktop 1440x900 - Audio Widget with YouTube Stream Player & Soundboard
  console.log('\n[3b] Desktop 1440x900 - Audio Widget & YouTube Stream Player:');
  await pageDesktop.click('[data-testid="dock-btn-sounds"]');
  await pageDesktop.waitForSelector('[data-testid="audio-widget-content"]');
  await pageDesktop.waitForTimeout(500);

  // Chuyển sang tab Âm thanh nền & Lofi stream
  await pageDesktop.click('[data-testid="tab-ambient"]');
  await pageDesktop.waitForTimeout(500);

  // Mở phần Lofi Stream
  const toggleStreamBtn = pageDesktop.locator('[data-testid="toggle-lofi-stream"]');
  if (await toggleStreamBtn.isVisible()) {
    await toggleStreamBtn.click();
    await pageDesktop.waitForTimeout(500);
  }

  // Kích hoạt một kênh lofi stream 24/7 curated
  const lofiCuratedBtn = pageDesktop.locator('text=Lofi Girl Live').first();
  if (await lofiCuratedBtn.isVisible()) {
    await lofiCuratedBtn.click();
    await pageDesktop.waitForTimeout(2000);
  }
  const audioStreamPath = path.join(outputDir, 'desktop-1440x900-audio-stream-playing.png');
  await pageDesktop.screenshot({ path: audioStreamPath });
  console.log(' -> Saved:', audioStreamPath);

  // Close sounds widget
  await pageDesktop.click('[data-testid="dock-btn-sounds"]');
  await pageDesktop.waitForTimeout(400);

  // 4. Command Palette (Raycast / Spotlight style translucent modal)
  console.log('\n[4] Desktop 1440x900 - Command Palette:');
  await pageDesktop.keyboard.press('Control+k');
  await pageDesktop.waitForSelector('[data-testid="command-palette-input"]');
  await pageDesktop.waitForTimeout(500);
  const cmdPalettePath = path.join(outputDir, 'desktop-1440x900-command-palette.png');
  await pageDesktop.screenshot({ path: cmdPalettePath });
  console.log(' -> Saved:', cmdPalettePath);
  await pageDesktop.keyboard.press('Escape');
  await pageDesktop.waitForTimeout(300);

  // 5. Mini Timer Pill (Apple Dynamic Island floating)
  console.log('\n[5] Desktop 1440x900 - Mini Timer Pill:');
  const miniPillBtn = pageDesktop.locator('[data-testid="btn-toggle-mini-pill-timer"]');
  if (await miniPillBtn.isVisible()) {
    await miniPillBtn.click();
    await pageDesktop.waitForTimeout(500);
  }
  const miniPillPath = path.join(outputDir, 'desktop-1440x900-mini-pill.png');
  await pageDesktop.screenshot({ path: miniPillPath });
  console.log(' -> Saved:', miniPillPath);

  // Restore timer window from mini pill
  const expandBtn = pageDesktop.locator('[data-testid="mini-timer-expand-btn"]');
  if (await expandBtn.isVisible()) {
    await expandBtn.click();
    await pageDesktop.waitForTimeout(500);
  }

  // 6. Zen Mode Fullscreen
  console.log('\n[6] Desktop 1440x900 - Zen Mode Fullscreen:');
  await pageDesktop.keyboard.press('z');
  await pageDesktop.waitForSelector('[data-testid="zen-mode-overlay"]');
  await pageDesktop.waitForTimeout(600);
  const zenPath = path.join(outputDir, 'desktop-1440x900-zen-mode.png');
  await pageDesktop.screenshot({ path: zenPath });
  console.log(' -> Saved:', zenPath);
  await pageDesktop.keyboard.press('Escape');
  await pageDesktop.waitForTimeout(400);

  await ctxDesktop.close();

  // 7. Laptop 1366x768 Cascade
  console.log('\n[7] Laptop 1366x768 - Cascade Layout:');
  const ctxLaptop = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const pageLaptop = await ctxLaptop.newPage();
  await pageLaptop.goto('http://localhost:5173/');
  await pageLaptop.waitForSelector('[data-testid="input-new-task"]');
  await pageLaptop.waitForTimeout(1000);
  const laptopPath = path.join(outputDir, 'desktop-1366x768-cascade.png');
  await pageLaptop.screenshot({ path: laptopPath });
  console.log(' -> Saved:', laptopPath);
  await ctxLaptop.close();

  // 8. Tablet 768x1024 Stack
  console.log('\n[8] Tablet 768x1024 - Touch Stack & Dock Pills:');
  const ctxTablet = await browser.newContext({ viewport: { width: 768, height: 1024 } });
  const pageTablet = await ctxTablet.newPage();
  await pageTablet.goto('http://localhost:5173/');
  await pageTablet.waitForSelector('[data-testid="input-new-task"]');
  await pageTablet.waitForTimeout(1000);
  const tabletPath = path.join(outputDir, 'tablet-768x1024-stack.png');
  await pageTablet.screenshot({ path: tabletPath });
  console.log(' -> Saved:', tabletPath);
  await ctxTablet.close();

  // 9. Mobile 390x844
  console.log('\n[9] Mobile 390x844 - Top & Scrolled:');
  const ctxMobile390 = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const pageMobile390 = await ctxMobile390.newPage();
  await pageMobile390.goto('http://localhost:5173/');
  await pageMobile390.waitForSelector('[data-testid="input-new-task"]');
  await pageMobile390.waitForTimeout(1000);

  const mob390DefaultPath = path.join(outputDir, 'mobile-390x844-default.png');
  await pageMobile390.screenshot({ path: mob390DefaultPath });
  console.log(' -> Saved:', mob390DefaultPath);

  await pageMobile390.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await pageMobile390.waitForTimeout(400);
  const mob390Path = path.join(outputDir, 'mobile-390x844-scrolled-bottom.png');
  await pageMobile390.screenshot({ path: mob390Path });
  console.log(' -> Saved:', mob390Path);
  await ctxMobile390.close();

  // 10. Mobile 320x568 Scrolled Bottom
  console.log('\n[10] Mobile 320x568 - Narrow Mobile:');
  const ctxMobile320 = await browser.newContext({ viewport: { width: 320, height: 568 } });
  const pageMobile320 = await ctxMobile320.newPage();
  await pageMobile320.goto('http://localhost:5173/');
  await pageMobile320.waitForSelector('[data-testid="input-new-task"]');
  await pageMobile320.waitForTimeout(1000);
  await pageMobile320.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await pageMobile320.waitForTimeout(400);
  const mob320Path = path.join(outputDir, 'mobile-320x568-scrolled-bottom.png');
  await pageMobile320.screenshot({ path: mob320Path });
  console.log(' -> Saved:', mob320Path);
  await ctxMobile320.close();

  // Also update standard desktop-1440x900-workspace.png for backward compat
  fs.copyFileSync(default1440Path, path.join(outputDir, 'desktop-1440x900-workspace.png'));

  await browser.close();
  devServer.kill();
  console.log('\n--- CHỤP ẢNH TẤT CẢ CÁC GÓC ĐỘ HOÀN TẤT THÀNH CÔNG ---');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
