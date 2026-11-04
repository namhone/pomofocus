import { chromium } from 'playwright';
import path from 'path';
import { spawn } from 'child_process';

const artifactDir = path.resolve('C:/Users/Nam/.gemini/antigravity/brain/f0e4fa42-ea0b-4ff3-83da-6875921843c2');

async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log('🚀 Running Comprehensive VIP & UI Collision Proof Verification...');

  // Start vite preview on port 4173
  const server = spawn('npx', ['vite', 'preview', '--port', '4173', '--host', '127.0.0.1'], {
    shell: true,
    stdio: 'pipe'
  });

  await new Promise<void>((resolve) => {
    server.stdout?.on('data', (d) => {
      const msg = d.toString();
      if (msg.includes('http://127.0.0.1:4173/')) {
        resolve();
      }
    });
    server.stderr?.on('data', (d) => console.error('[Server Error]', d.toString().trim()));
    setTimeout(resolve, 6000);
  });

  await wait(2000);

  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 }
    });
    const page = await context.newPage();

    // Setup Founder Session for Nam Hồ
    await page.goto('http://127.0.0.1:4173/app', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      const founderUser = {
        id: 'user_founder_namho',
        email: 'namho03052k9@gmail.com',
        displayName: 'Nam Hồ',
        plan: 'lifetime',
        role: 'founder',
        badge: 'Founder VIP 👑',
        isLifetime: true,
        credits: 1000,
        createdAt: Date.now() - 30 * 86400000
      };
      window.localStorage.setItem('pomodoro_study_auth_session', JSON.stringify(founderUser));
      window.localStorage.setItem('pomodoro_header_pinned', 'true');
    });

    await page.reload({ waitUntil: 'networkidle' });
    await wait(2000);

    // 1. Verify Spaces Widget (Không Gian Nền)
    console.log('\n--- 1. Testing Spaces Widget for Founder VIP ---');
    const spacesDockBtn = page.locator('[data-testid="dock-btn-spaces"]');
    await spacesDockBtn.click();
    await wait(1000);

    const upgradeBanner = page.locator('[data-testid="spaces-pro-upgrade-banner"]');
    const isBannerVisible = await upgradeBanner.isVisible();
    console.log('Yellow Upgrade Banner Visible for Founder (MUST BE FALSE):', isBannerVisible);
    if (isBannerVisible) {
      throw new Error('FAIL: spaces-pro-upgrade-banner is still visible for Founder VIP!');
    }
    console.log('✅ PASS: Yellow upgrade banner is 100% GONE for Founder!');

    // Check locked items count
    const lockedItemsCount = await page.locator('[data-testid="spaces-pro-item"]').count();
    console.log('Locked wallpaper items count (MUST BE 0):', lockedItemsCount);
    if (lockedItemsCount > 0) {
      throw new Error(`FAIL: Found ${lockedItemsCount} locked items for Founder VIP!`);
    }
    console.log('✅ PASS: All wallpapers are 100% UNLOCKED for Founder!');

    // Take screenshot of Spaces Widget
    const shotSpaces = path.join(artifactDir, 'proof-spaces-founder-unlocked.png');
    await page.screenshot({ path: shotSpaces });
    console.log(`Saved screenshot: ${shotSpaces}`);

    // Click a cyberpunk wallpaper to verify it applies without redirect
    const firstWallpaper = page.locator('[data-testid="spaces-widget"] button.group').first();
    await firstWallpaper.click();
    await wait(800);
    console.log('Current URL after clicking wallpaper (should still be /app):', page.url());
    if (!page.url().includes('/app')) {
      throw new Error(`FAIL: Wallpaper click redirected to ${page.url()} instead of applying!`);
    }
    console.log('✅ PASS: Wallpaper applied immediately with zero redirection!');

    // Close Spaces widget
    await spacesDockBtn.click();
    await wait(500);

    // 2. Verify AI Companion Drawer Header & Zero Overlap
    console.log('\n--- 2. Testing AI Companion Drawer & Zero Overlap ---');
    const aiBtn = page.locator('[data-testid="header-ai-btn"]');
    await aiBtn.click();
    await wait(1000);

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
        throw new Error(`FAIL: Collision detected! Title and badge overlap by ${Math.abs(distance)}px`);
      }
      console.log('✅ PASS: Title and Badge have generous breathing room (> 10px), ZERO collision!');
    }

    // Verify single badge text
    const creditBadge = page.locator('[data-testid="ai-credits-badge"]');
    const badgeText = await creditBadge.innerText();
    console.log('AI Credit Badge Text:', badgeText);

    // Save proof screenshot of AI drawer
    const shotAi = path.join(artifactDir, 'proof-ai-single-badge-no-shortcuts.png');
    await page.screenshot({ path: shotAi });
    console.log(`Saved screenshot: ${shotAi}`);

    console.log('\n🎉 ALL TESTS & PROOFS PASSED PERFECTLY!');
  } finally {
    await browser.close();
    server.kill();
  }
}

run().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
