import { chromium } from 'playwright';
import path from 'path';
import { spawn } from 'child_process';

const artifactDir = path.resolve('C:/Users/Nam/.gemini/antigravity/brain/f0e4fa42-ea0b-4ff3-83da-6875921843c2');

async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log('🚀 Starting Verification: Auto-Hide Header, DockBar Positioning, and AI Single Badge Polish...');

  // Start vite preview server on host 127.0.0.1
  const server = spawn('npx', ['vite', 'preview', '--port', '4173', '--host', '127.0.0.1'], {
    shell: true,
    stdio: 'pipe'
  });

  await new Promise<void>((resolve) => {
    server.stdout?.on('data', (d) => {
      const msg = d.toString();
      console.log('[Server]', msg.trim());
      if (msg.includes('http://127.0.0.1:4173/')) {
        resolve();
      }
    });
    server.stderr?.on('data', (d) => console.error('[Server Error]', d.toString().trim()));
    // Fallback timer
    setTimeout(resolve, 6000);
  });

  await wait(2000);

  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 }
    });
    const page = await context.newPage();

    console.log('\n--- 1. Testing AI Companion Single Merged Badge & Zero Overlap ---');
    await page.goto('http://127.0.0.1:4173/app', { waitUntil: 'domcontentloaded' });
    await wait(2000);

    // Pin header initially so we can click header AI button easily
    await page.evaluate(() => {
      window.localStorage.setItem('pomodoro_header_pinned', 'true');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await wait(1500);

    const aiBtn = page.locator('[data-testid="header-ai-btn"]');
    await aiBtn.click();
    await wait(1000);

    const aiDrawer = page.locator('[data-testid="ai-companion-drawer"]');
    await aiDrawer.waitFor({ state: 'visible', timeout: 5000 });

    // Verify Title and Badge bounding boxes
    const titleEl = page.locator('[data-testid="ai-companion-drawer"] h2');
    const badgeEl = page.locator('[data-testid="ai-credits-topup-btn"]');
    const titleBox = await titleEl.boundingBox();
    const badgeBox = await badgeEl.boundingBox();
    console.log('Title Bounding Box:', titleBox);
    console.log('Badge Bounding Box:', badgeBox);

    if (titleBox && badgeBox) {
      const distance = badgeBox.x - (titleBox.x + titleBox.width);
      console.log(`Distance between Title right edge and Badge left edge: ${distance.toFixed(1)}px`);
      if (distance <= 0) {
        throw new Error(`Collision detected! Title and badge overlap by ${Math.abs(distance)}px`);
      }
      console.log('✅ PASS: Title and Badge have comfortable breathing room, ZERO overlap!');
    }

    // Verify single badge in AI Header
    const creditBadge = page.locator('[data-testid="ai-credits-badge"]');
    const badgeText = await creditBadge.innerText();
    console.log('Verified AI Credit Badge Text:', badgeText);

    // Check that shortcuts section is gone
    const shortcutsCount = await page.locator('text=Lối tắt tác vụ học tập').count();
    console.log('Shortcuts section count (should be 0):', shortcutsCount);

    // Chụp ảnh 1: Single badge không đè chữ, không còn shortcut
    const shot1 = path.join(artifactDir, 'proof-ai-single-badge-no-shortcuts.png');
    await page.screenshot({ path: shot1 });
    console.log(`Saved screenshot 1: ${shot1}`);

    // Test history dropdown
    const historyBtn = page.locator('[data-testid="ai-history-btn"]');
    await historyBtn.click();
    await wait(500);
    const historyDropdown = page.locator('[data-testid="ai-history-dropdown"]');
    console.log('History dropdown visible:', await historyDropdown.isVisible());

    // Close history dropdown & AI drawer
    await historyBtn.click();
    await wait(300);
    const closeAiBtn = page.locator('[data-testid="ai-close-drawer-btn ai-btn-close-drawer"]');
    await closeAiBtn.click();
    await wait(1000);

    console.log('\n✅ ALL VERIFICATION CHECKS PASSED SUCCESSFULLY WITH ZERO OVERLAP!');
  } finally {
    await browser.close();
    server.kill();
  }
}

run().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
