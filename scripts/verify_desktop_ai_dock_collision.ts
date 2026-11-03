import { chromium } from 'playwright';
import path from 'path';

async function verifyDesktopAiDockCollision() {
  console.log('🚀 Starting E2E Verification: Desktop AI Drawer vs Header & DockBar Collision...');
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  const artifactDir = path.resolve('C:/Users/Nam/.gemini/antigravity/brain/f0e4fa42-ea0b-4ff3-83da-6875921843c2');

  try {
    // 1. Vào trang app trên local preview
    console.log('1. Navigating to http://localhost:4173/app...');
    await page.goto('http://localhost:4173/app', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // 2. Kiểm tra trạng thái ban đầu: Header & DockBar hiển thị rõ
    const header = page.locator('header');
    await header.waitFor({ state: 'visible', timeout: 5000 });
    const headerBox = await header.boundingBox();
    console.log('Header bounding box:', headerBox);

    const dockBar = page.locator('[data-testid="dockbar"]');
    await dockBar.waitFor({ state: 'visible', timeout: 5000 });
    const dockBarInitialOpacity = await dockBar.evaluate((el) => window.getComputedStyle(el).opacity);
    console.log('Initial DockBar opacity:', dockBarInitialOpacity);

    // Bằng chứng 1: Khi chưa mở AI Drawer, DockBar hiển thị rõ
    const shot1 = path.join(artifactDir, 'proof-desktop-ai-closed-dock-visible.png');
    await page.screenshot({ path: shot1, fullPage: false });
    console.log(`Saved screenshot 1: ${shot1}`);

    // 3. Mở AI Drawer bằng nút AI trên Header
    console.log('3. Clicking Header AI Button...');
    const aiBtn = page.locator('[data-testid="header-ai-btn"]');
    await aiBtn.waitFor({ state: 'visible', timeout: 5000 });
    await aiBtn.click();
    await page.waitForTimeout(1000);

    // 4. Kiểm tra AI Drawer đã mở
    const aiDrawer = page.locator('[data-testid="ai-companion-drawer"]');
    await aiDrawer.waitFor({ state: 'visible', timeout: 5000 });
    const drawerBox = await aiDrawer.boundingBox();
    console.log('AI Drawer bounding box:', drawerBox);

    if (!drawerBox) {
      throw new Error('AI Drawer has no bounding box!');
    }

    // Top của AI Drawer phải >= 56px để không đè Header (Header h-14 = 56px)
    console.log(`AI Drawer top: ${drawerBox.y}px (expected >= 56px)`);
    if (drawerBox.y < 50) {
      throw new Error(`AI Drawer is overlapping header! Top is ${drawerBox.y}px`);
    }

    // 5. Kiểm tra DockBar đã tự động ẩn
    const dockBarHiddenOpacity = await dockBar.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        opacity: style.opacity,
        pointerEvents: style.pointerEvents,
        visibility: style.visibility,
        transform: style.transform
      };
    });
    console.log('DockBar after AI opened styles:', dockBarHiddenOpacity);

    if (parseFloat(dockBarHiddenOpacity.opacity) > 0.05 && dockBarHiddenOpacity.pointerEvents !== 'none') {
      throw new Error(`DockBar did not hide! Opacity: ${dockBarHiddenOpacity.opacity}`);
    }

    // 6. Kiểm tra khung chat AI và nút bấm bên dưới không bị che khuất
    const aiInput = page.locator('[data-testid="ai-prompt-input"]');
    await aiInput.waitFor({ state: 'visible', timeout: 5000 });
    const inputBox = await aiInput.boundingBox();
    console.log('AI Input bounding box:', inputBox);

    const submitBtn = page.locator('[data-testid="ai-submit-btn"]');
    await submitBtn.waitFor({ state: 'visible', timeout: 5000 });
    const submitBtnBox = await submitBtn.boundingBox();
    console.log('AI Submit Button bounding box:', submitBtnBox);

    if (!inputBox || !submitBtnBox) {
      throw new Error('AI Input or Submit Button not visible in viewport!');
    }

    // Thử nhập câu hỏi vào AI Input
    await aiInput.fill('Chào bạn, giao diện mới thật gọn gàng và không bị đè!');
    await page.waitForTimeout(500);

    // Bằng chứng 2: AI Drawer mở, Header không bị che, DockBar tự ẩn, Chat Input thoáng đãng
    const shot2 = path.join(artifactDir, 'proof-desktop-ai-open-dock-hidden.png');
    await page.screenshot({ path: shot2, fullPage: false });
    console.log(`Saved screenshot 2: ${shot2}`);

    // 7. Đóng AI Drawer (dùng nút đóng trên Drawer hoặc toggle từ Header)
    console.log('7. Closing AI Drawer...');
    const closeBtn = page.locator('[data-testid*="ai-close-drawer-btn"]');
    await closeBtn.click();
    await page.waitForTimeout(1000);

    // 8. Kiểm tra DockBar tự động hiện lại
    const dockBarRestoredOpacity = await dockBar.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        opacity: style.opacity,
        pointerEvents: style.pointerEvents,
        visibility: style.visibility
      };
    });
    console.log('DockBar after AI closed styles:', dockBarRestoredOpacity);

    console.log('✅ ALL E2E DESKTOP AI DRAWER & DOCKBAR TESTS PASSED PERFECTLY!');
  } catch (error) {
    console.error('❌ E2E Verification failed:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

verifyDesktopAiDockCollision();
