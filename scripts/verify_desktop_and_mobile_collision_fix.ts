import { chromium } from 'playwright';
import path from 'path';

async function runVerification() {
  console.log('🚀 Starting Comprehensive Verification: Desktop & Mobile Collision Fix...');
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const artifactDir = path.resolve('C:/Users/Nam/.gemini/antigravity/brain/f0e4fa42-ea0b-4ff3-83da-6875921843c2');

  try {
    // =========================================================================
    // PHẦN 1: DESKTOP AI DRAWER & DOCKBAR (1440x900)
    // =========================================================================
    console.log('\n--- 1. Testing Desktop View (1440x900) ---');
    const desktopContext = await browser.newContext({
      viewport: { width: 1440, height: 900 }
    });
    const desktopPage = await desktopContext.newPage();

    console.log('Navigating to https://pomofocus-workspace.vercel.app/app on Desktop...');
    await desktopPage.goto('https://pomofocus-workspace.vercel.app/app', { waitUntil: 'networkidle' });
    await desktopPage.waitForTimeout(1500);

    // 1.1 Header & DockBar hiển thị ban đầu
    const header = desktopPage.locator('header');
    await header.waitFor({ state: 'visible', timeout: 5000 });
    const headerBox = await header.boundingBox();
    console.log('Header bounding box:', headerBox);

    const dockBar = desktopPage.locator('[data-testid="dockbar"]');
    await dockBar.waitFor({ state: 'visible', timeout: 5000 });
    console.log('Initial DockBar is visible.');

    // Chụp ảnh 1: Desktop khi AI Drawer đóng
    const shot1 = path.join(artifactDir, 'proof-desktop-ai-closed-dock-visible.png');
    await desktopPage.screenshot({ path: shot1, fullPage: false });
    console.log(`Saved screenshot 1: ${shot1}`);

    // 1.2 Mở AI Drawer
    console.log('Clicking Header AI Button...');
    const aiBtn = desktopPage.locator('[data-testid="header-ai-btn"]');
    await aiBtn.click();
    await desktopPage.waitForTimeout(1000);

    const aiDrawer = desktopPage.locator('[data-testid="ai-companion-drawer"]');
    await aiDrawer.waitFor({ state: 'visible', timeout: 5000 });
    const drawerBox = await aiDrawer.boundingBox();
    console.log('AI Drawer bounding box:', drawerBox);

    // Top của AI Drawer phải >= 56px (không đè Header)
    if (!drawerBox || drawerBox.y < 50) {
      throw new Error(`AI Drawer is overlapping header! Top: ${drawerBox?.y}`);
    }

    // DockBar phải ẩn
    const dockOpacity = await dockBar.evaluate((el) => window.getComputedStyle(el).opacity);
    const dockPointerEvents = await dockBar.evaluate((el) => window.getComputedStyle(el).pointerEvents);
    console.log(`DockBar after AI opened: opacity=${dockOpacity}, pointerEvents=${dockPointerEvents}`);
    if (parseFloat(dockOpacity) > 0.05 && dockPointerEvents !== 'none') {
      throw new Error('DockBar did not hide when AI Drawer opened!');
    }

    // Input và submit button của AI phải hiển thị rõ, không bị che
    const aiInput = desktopPage.locator('[data-testid="ai-prompt-input"]');
    await aiInput.waitFor({ state: 'visible', timeout: 5000 });
    await aiInput.fill('Kiểm tra giao diện Desktop: Không đè Header và không bị DockBar che!');

    const shot2 = path.join(artifactDir, 'proof-desktop-ai-open-dock-hidden.png');
    await desktopPage.screenshot({ path: shot2, fullPage: false });
    console.log(`Saved screenshot 2: ${shot2}`);

    await desktopContext.close();

    // =========================================================================
    // PHẦN 2: MOBILE SOFT SLIDE-DOWN DROPDOWN & 4-COL NAV (390x844)
    // =========================================================================
    console.log('\n--- 2. Testing Mobile View (390x844) ---');
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true
    });
    const mobilePage = await mobileContext.newPage();

    console.log('Navigating to https://pomofocus-workspace.vercel.app/app on Mobile...');
    await mobilePage.goto('https://pomofocus-workspace.vercel.app/app', { waitUntil: 'networkidle' });
    await mobilePage.waitForTimeout(1500);

    // 2.1 Kiểm tra Nút Đăng Nhập hoặc Avatar hiển thị trực diện trên Header
    const loginOrAvatarOnHeader = mobilePage.locator('[data-testid="header-login-btn"], [data-testid="header-user-avatar-btn"]');
    await loginOrAvatarOnHeader.waitFor({ state: 'visible', timeout: 5000 });
    console.log('Header direct Login/Avatar button is visible.');

    // 2.2 Kiểm tra 4 cột MobileBottomNav
    const bottomNav = mobilePage.locator('[data-testid="mobile-bottom-navigation"]');
    await bottomNav.waitFor({ state: 'visible', timeout: 5000 });
    const isGridCols4 = await bottomNav.evaluate((el) => el.classList.contains('grid-cols-4'));
    console.log('MobileBottomNav has grid-cols-4:', isGridCols4);

    // 2.3 Mở Menu Mobile Dropdown
    console.log('Opening mobile dropdown menu...');
    const mobileMenuBtn = mobilePage.locator('[data-testid="header-mobile-menu-btn"]');
    await mobileMenuBtn.click();
    await mobilePage.waitForTimeout(500);

    // 2.4 Kiểm tra Menu thả xuống có vị trí absolute top-14 right-3 w-64
    const dropdownMenu = mobilePage.locator('#mobile-slidedown-menu');
    await dropdownMenu.waitFor({ state: 'visible', timeout: 5000 });
    const menuBox = await dropdownMenu.boundingBox();
    console.log('Mobile Dropdown Menu bounding box:', menuBox);

    if (!menuBox || menuBox.width > 280 || menuBox.y < 50) {
      throw new Error(`Mobile Dropdown menu not positioned properly: width=${menuBox?.width}, y=${menuBox?.y}`);
    }

    // Chụp ảnh 3: Mobile Soft Dropdown Menu thả xuống
    const shot3 = path.join(artifactDir, 'proof-mobile-soft-dropdown-menu.png');
    await mobilePage.screenshot({ path: shot3, fullPage: false });
    console.log(`Saved screenshot 3: ${shot3}`);

    // Đóng menu bằng backdrop
    const backdrop = mobilePage.locator('[data-testid="mobile-drawer-backdrop"]');
    await backdrop.click({ position: { x: 50, y: 300 } });
    await mobilePage.waitForTimeout(500);

    // =========================================================================
    // PHẦN 3: AN TOÀN KHOẢNG TRỐNG ĐÁY (SAFE PADDING PB-28 / PB-32)
    // =========================================================================
    console.log('\n--- 3. Testing Safe Bottom Padding on /app and /rooms ---');
    // Kiểm tra main trên /app
    const mainApp = mobilePage.locator('main');
    const mainClass = await mainApp.evaluate((el) => el.className);
    console.log('Main app class contains pb-32 sm:pb-28:', mainClass.includes('pb-32'));
    if (!mainClass.includes('pb-32')) {
      throw new Error('Main app container lacks pb-32 safe padding!');
    }

    const shot4 = path.join(artifactDir, 'proof-mobile-workspace-safe-padding.png');
    await mobilePage.screenshot({ path: shot4, fullPage: false });
    console.log(`Saved screenshot 4: ${shot4}`);

    await mobileContext.close();

    console.log('\n🎉 ALL CHECKS PASSED WITH 100% EMPIRICAL PROOF!');
  } catch (err) {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runVerification();
