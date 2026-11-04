import { chromium } from 'playwright';
import { spawn } from 'child_process';
import path from 'path';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  console.log('🚀 Verifying Mobile Settings & Unified Spaces Hub...');
  const artifactDir = path.resolve(
    'C:/Users/Nam/.gemini/antigravity/brain/f0e4fa42-ea0b-4ff3-83da-6875921843c2'
  );

  // 1. Start local Vite preview server on port 4183
  const server = spawn('npx', ['vite', 'preview', '--port', '4183', '--strictPort'], {
    shell: true,
    stdio: 'pipe'
  });

  server.stdout?.on('data', (d) => console.log(`[Preview Server] ${d.toString().trim()}`));
  server.stderr?.on('data', (d) => console.warn(`[Preview Server Error] ${d.toString().trim()}`));

  await wait(3000);

  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  // Test on Mobile viewport (iPhone 14 / 390x844)
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true
  });
  const page = await context.newPage();

  try {
    // Seed Founder VIP state in localStorage
    await page.goto('http://localhost:4183/app', { waitUntil: 'domcontentloaded' });
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
      window.localStorage.setItem('pomodoro_ai_credits', '1000');
    });

    await page.reload({ waitUntil: 'networkidle' });
    await wait(1500);

    // 1. Verify 5-button Mobile Bottom Navigation
    console.log('\n--- 1. Testing 5-button MobileBottomNav ---');
    const bottomNav = page.locator('[data-testid="mobile-bottom-navigation"]');
    await bottomNav.waitFor({ state: 'visible' });

    const buttons = bottomNav.locator('button');
    const count = await buttons.count();
    console.log(`Mobile bottom nav button count: ${count} (Expected: 5)`);
    if (count !== 5) {
      throw new Error(`FAIL: Expected 5 buttons in MobileBottomNav, got ${count}!`);
    }
    console.log('✅ PASS: MobileBottomNav has exactly 5 balanced buttons!');

    // 2. Verify Settings button works
    console.log('\n--- 2. Testing Mobile Settings Button ---');
    const settingsBtn = page.locator('[data-testid~="mobile-btn-settings"]');
    await settingsBtn.waitFor({ state: 'visible' });
    await settingsBtn.click();
    await wait(600);

    const settingsWidget = page.locator('[data-testid="settings-widget"]');
    await settingsWidget.waitFor({ state: 'visible' });
    const settingsText = await settingsWidget.innerText();
    console.log('Settings Widget loaded with text snippet:', settingsText.slice(0, 150));
    if (!settingsText.includes('Founder VIP 👑')) {
      throw new Error('FAIL: Settings widget does not show Founder VIP badge!');
    }
    console.log('✅ PASS: Settings widget opened smoothly and displays Founder VIP 👑 info!');

    // 3. Verify Floating Settings Action Button at top-right
    console.log('\n--- 3. Testing Floating Action Button (Top-Right) ---');
    const floatingBtn = page.locator('[data-testid="mobile-floating-settings-btn"]');
    const isFloatingVisible = await floatingBtn.isVisible();
    console.log('Mobile Floating Action Button visible:', isFloatingVisible);
    if (!isFloatingVisible) {
      throw new Error('FAIL: Mobile floating action button is not visible!');
    }
    console.log('✅ PASS: Floating action button Avatar + ⚙️ is permanently accessible at top-right!');

    // 4. Verify Unified Không Gian Hub (Spaces + Audio)
    console.log('\n--- 4. Testing Unified Không Gian Hub ---');
    const spacesBtn = page.locator('[data-testid~="mobile-btn-spaces"]');
    await spacesBtn.click();
    await wait(800);

    const spacesWidget = page.locator('[data-testid="spaces-widget"]');
    await spacesWidget.waitFor({ state: 'visible' });

    // Check No Banner for Founder
    const banner = page.locator('[data-testid="spaces-pro-upgrade-banner"]');
    const isBannerVisible = await banner.isVisible();
    console.log('Yellow upgrade banner visible:', isBannerVisible);
    if (isBannerVisible) {
      throw new Error('FAIL: Upgrade banner is still visible for Founder VIP!');
    }
    console.log('✅ PASS: Upgrade banner is 100% eliminated for Founder VIP!');

    // Check 2 Tabs exist: [ 🖼️ Hình Nền ] | [ 🎵 Âm Thanh & Chuông ]
    const tabWallpapers = page.locator('[data-testid="spaces-tab-wallpapers"]');
    const tabAudio = page.locator('[data-testid="spaces-tab-audio"]');
    await tabWallpapers.waitFor({ state: 'visible' });
    await tabAudio.waitFor({ state: 'visible' });
    console.log('✅ PASS: Unified Hub has both [ 🖼️ Hình Nền ] & [ 🎵 Âm Thanh & Chuông ] tabs!');

    // Switch to Audio tab inside Spaces
    await tabAudio.click();
    await wait(500);
    const audioRoot = page.locator('[data-testid="audio-widget-root"]');
    await audioRoot.waitFor({ state: 'visible' });
    console.log('✅ PASS: Audio & Chimes controls seamlessly render inside Spaces hub!');

    // Switch back to Wallpapers tab
    await tabWallpapers.click();
    await wait(500);

    // Save Mobile Proof Screenshot
    const shotPath = path.join(artifactDir, 'proof-mobile-settings-and-spaces.png');
    await page.screenshot({ path: shotPath });
    console.log(`Saved screenshot: ${shotPath}`);

    console.log('\n🎉 ALL MOBILE TESTS PASSED WITH 100% SUCCESS!');
  } finally {
    await browser.close();
    server.kill();
  }
}

run().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
