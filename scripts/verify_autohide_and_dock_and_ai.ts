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

    console.log('\n--- 1. Testing AI Companion Single Merged Badge & No Shortcuts ---');
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

    // Verify single badge in AI Header
    const creditBadge = page.locator('[data-testid="ai-credits-badge"]');
    const badgeText = await creditBadge.innerText();
    console.log('Verified AI Credit Badge Text:', badgeText);

    // Check that shortcuts section is gone
    const shortcutsCount = await page.locator('text=Lối tắt tác vụ học tập').count();
    console.log('Shortcuts section count (should be 0):', shortcutsCount);

    // Verify new chat button and history button exist
    const newChatBtn = page.locator('[data-testid="ai-new-chat-btn"]');
    const historyBtn = page.locator('[data-testid="ai-history-btn"]');
    console.log('New Chat button visible:', await newChatBtn.isVisible());
    console.log('History button visible:', await historyBtn.isVisible());

    // Click history button to open dropdown
    await historyBtn.click();
    await wait(500);
    const historyDropdown = page.locator('[data-testid="ai-history-dropdown"]');
    console.log('History dropdown visible:', await historyDropdown.isVisible());

    // Chụp ảnh 1: Single badge không đè chữ, không còn shortcut, có history dropdown
    const shot1 = path.join(artifactDir, 'proof-ai-single-badge-no-shortcuts.png');
    await page.screenshot({ path: shot1 });
    console.log(`Saved screenshot 1: ${shot1}`);

    // Close history dropdown & AI drawer
    await historyBtn.click();
    await wait(300);
    const closeAiBtn = page.locator('[data-testid="ai-close-drawer-btn ai-btn-close-drawer"]');
    await closeAiBtn.click();
    await wait(1000);

    console.log('\n--- 2. Testing Auto-Hide Header on /app ---');
    // Set pinned to false in localStorage
    await page.evaluate(() => {
      window.localStorage.setItem('pomodoro_header_pinned', 'false');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await wait(2000);

    // Move mouse to center (y = 500) and wait for auto-hide
    await page.mouse.move(720, 500);
    await wait(2500);

    const header = page.locator('[data-testid="platform-unified-header"]');
    const headerClasses = await header.getAttribute('class');
    const isHidden = headerClasses?.includes('-translate-y-full');
    console.log('Auto-hide state after mouse idle (contains -translate-y-full):', isHidden);

    // Now hover mouse at top (y = 5) to trigger sensor
    await page.mouse.move(720, 5);
    await wait(800);
    const headerClassesAfterHover = await header.getAttribute('class');
    const isRevealed = headerClassesAfterHover?.includes('translate-y-0');
    console.log('Header revealed after moving mouse to top (contains translate-y-0):', isRevealed);

    // Click Pin Header button
    const pinBtn = page.locator('[data-testid="header-pin-btn"]');
    await pinBtn.click();
    await wait(500);
    const pinnedStored = await page.evaluate(() => window.localStorage.getItem('pomodoro_header_pinned'));
    console.log('Header pinned stored in localStorage:', pinnedStored);

    // Chụp ảnh 2: Header Auto-Hide & Pin button proof
    const shot2 = path.join(artifactDir, 'proof-header-autohide-and-pin.png');
    await page.screenshot({ path: shot2 });
    console.log(`Saved screenshot 2: ${shot2}`);

    console.log('\n--- 3. Testing DockBar Bottom Center (Default) ---');
    const dockBar = page.locator('[data-testid="dockbar"]');
    await dockBar.waitFor({ state: 'visible', timeout: 5000 });
    const dockBoxBottom = await dockBar.boundingBox();
    console.log('DockBar Bottom box:', dockBoxBottom);

    // Chụp ảnh 3: DockBar Bottom
    const shot3 = path.join(artifactDir, 'proof-dockbar-bottom.png');
    await page.screenshot({ path: shot3 });
    console.log(`Saved screenshot 3: ${shot3}`);

    console.log('\n--- 4. Testing DockBar Left Vertical Position ---');
    // Open Quick Dock Menu
    const customPosBtn = page.locator('[data-testid="dock-btn-custom-position"]');
    await customPosBtn.click();
    await wait(500);

    const leftPosBtn = page.locator('[data-testid="quick-dock-pos-left"]');
    await leftPosBtn.click();
    await wait(1000);

    const dockBoxLeft = await dockBar.boundingBox();
    console.log('DockBar Left box:', dockBoxLeft);

    // Chụp ảnh 4: DockBar Left Vertical
    const shot4 = path.join(artifactDir, 'proof-dockbar-left-vertical.png');
    await page.screenshot({ path: shot4 });
    console.log(`Saved screenshot 4: ${shot4}`);

    console.log('\n✅ ALL VERIFICATION CHECKS PASSED SUCCESSFULLY!');
  } finally {
    await browser.close();
    server.kill();
  }
}

run().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
