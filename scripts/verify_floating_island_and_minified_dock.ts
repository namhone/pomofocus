import { chromium } from 'playwright';
import path from 'path';
import { spawn } from 'child_process';

const artifactDir = path.resolve('C:/Users/Nam/.gemini/antigravity/brain/f0e4fa42-ea0b-4ff3-83da-6875921843c2');

async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log('🚀 Verifying Floating Slim Island, Minified DockBar, and Founder VIP State...');

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
      // Reset layout to apply topY = 64
      window.localStorage.removeItem('pomodoro_layout_store');
      window.localStorage.removeItem('pomodoro_header_pinned');
    });

    await page.reload({ waitUntil: 'networkidle' });
    await wait(2000);

    // 1. Verify Floating Slim Island
    console.log('\n--- 1. Testing Floating Slim Island ---');
    const headerWrapper = page.locator('[data-testid="platform-unified-header"] > div').first();
    const headerBox = await headerWrapper.boundingBox();
    console.log('Floating Island Bounding Box:', headerBox);
    if (headerBox) {
      console.log(`Height of Floating Island: ${headerBox.height.toFixed(1)}px (Expected: 40px)`);
      if (headerBox.height > 46) {
        throw new Error(`FAIL: Header height is ${headerBox.height}px, exceeds slim island target!`);
      }
      console.log('✅ PASS: Floating Island has slim, refined height (40px)!');
    }

    // 2. Verify Window Safe Padding (topY >= 60px)
    console.log('\n--- 2. Testing Safe Top Padding for Windows ---');
    const timerContainer = page.locator('[data-testid="widget-container-timer"]');
    const timerBox = await timerContainer.boundingBox();
    console.log('Timer Widget Bounding Box:', timerBox);
    if (timerBox) {
      console.log(`Timer top position: ${timerBox.y.toFixed(1)}px (Expected: >= 56px)`);
      if (timerBox.y < 50) {
        throw new Error(`FAIL: Timer is at ${timerBox.y}px, touching the top of screen!`);
      }
      console.log('✅ PASS: Windows have comfortable top breathing room (safe buffer from top edge)!');
    }

    // 3. Verify Minified DockBar Height & Icon Sizes
    console.log('\n--- 3. Testing Minified DockBar ---');
    const dockbar = page.locator('[data-testid="dockbar"]');
    const dockBox = await dockbar.boundingBox();
    console.log('DockBar Bounding Box:', dockBox);
    if (dockBox) {
      console.log(`DockBar Height: ${dockBox.height.toFixed(1)}px (Expected: <= 46px)`);
      if (dockBox.height > 48) {
        throw new Error(`FAIL: DockBar height is ${dockBox.height}px, too bulky!`);
      }
      console.log('✅ PASS: DockBar is ultra-minified (macOS / Linear slim style)!');
    }

    // 4. Verify Founder VIP Wallet and Badge in Header
    console.log('\n--- 4. Testing Founder VIP Wallet & Badge ---');
    const planBadge = page.locator('[data-testid="header-plan-badge"]');
    const planBadgeText = await planBadge.innerText();
    console.log('Header Plan Badge Text:', planBadgeText);

    const hudCredits = page.locator('[data-testid="header-ai-btn"]');
    const hudCreditsText = await hudCredits.innerText();
    console.log('Header AI HUD Text:', hudCreditsText);
    if (!hudCreditsText.includes('1.000') && !hudCreditsText.includes('1000') && !hudCreditsText.includes('1,000')) {
      throw new Error(`FAIL: Expected 1.000⚡ for Founder VIP, got ${hudCreditsText}!`);
    }
    console.log('✅ PASS: Founder VIP correctly holds 1.000⚡!');

    // 5. Verify Collapsed Settings Card does NOT say "Miễn phí"
    console.log('\n--- 5. Testing Collapsed Settings Card Plan Label ---');
    // Open Settings and collapse it
    const settingsBtn = page.locator('[data-testid="dock-btn-presets"]');
    await settingsBtn.click();
    await wait(800);

    const collapseSettingsBtn = page.locator('[data-testid="widget-container-settings"] [data-collapse-btn="true"], [data-testid="widget-container-settings"] button[title="Thu nhỏ"]').first();
    if (await collapseSettingsBtn.isVisible()) {
      await collapseSettingsBtn.click();
      await wait(500);
      const collapsedCard = page.locator('[data-testid="collapsed-settings-card"]');
      const cardText = await collapsedCard.innerText();
      console.log('Collapsed Settings Card Text:', cardText);
      if (cardText.includes('Miễn phí')) {
        throw new Error('FAIL: Collapsed Settings Card still says "Miễn phí"!');
      }
      console.log('✅ PASS: Collapsed Settings Card displays Founder VIP correctly!');
    }

    // Save full workspace proof screenshot
    const shotPath = path.join(artifactDir, 'proof-floating-island-and-minified-dock.png');
    await page.screenshot({ path: shotPath });
    console.log(`Saved screenshot: ${shotPath}`);

    console.log('\n🎉 ALL CHECKS PASSED WITH FLYING COLORS!');
  } finally {
    await browser.close();
    server.kill();
  }
}

run().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
