import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const screenshotDir = path.resolve('test-results/visual-audit-screenshots');

test.beforeAll(() => {
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }
});

test.describe('Visual UX Audit & Responsive Review', () => {
  test('1. Chụp Desktop: Default Workspace (Timer + Tasks)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.waitForSelector('[data-testid="workspace-root"]');
    await page.waitForTimeout(500);

    await page.screenshot({
      path: path.join(screenshotDir, 'desktop-01-default-workspace.png'),
      fullPage: true,
    });

    const timerBox = await page.locator('[data-testid="widget-container-timer"]').boundingBox();
    const tasksBox = await page.locator('[data-testid="widget-container-tasks"]').boundingBox();
    const dockBox = await page.locator('nav[role="toolbar"]').boundingBox();

    console.log('Desktop Default Layout:', { timerBox, tasksBox, dockBox });
    expect(timerBox).not.toBeNull();
    expect(tasksBox).not.toBeNull();
    expect(dockBox).not.toBeNull();

    // Assertion: Vị trí Timer nằm bên trái Tasks, không chồng lấn
    expect(timerBox!.x + timerBox!.width).toBeLessThanOrEqual(tasksBox!.x + 10);
    // Assertion: DockBar nằm ở phía dưới màn hình
    expect(dockBox!.y).toBeGreaterThan(600);
    // Assertion: Không bị tràn ngang màn hình
    const noOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= 1440);
    expect(noOverflow).toBe(true);
  });

  test('2. Chụp Desktop: Mở Notes, Sounds, Spaces Widgets', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.waitForSelector('[data-testid="workspace-root"]');
    await page.waitForTimeout(500);

    // Notes đã mở sẵn theo mặc định
    const notes = page.locator('[data-testid="widget-container-notes"]');
    await expect(notes).toBeVisible();
    const notesBox = await notes.boundingBox();
    expect(notesBox).not.toBeNull();
    expect(notesBox!.width).toBeGreaterThanOrEqual(340);

    await page.screenshot({
      path: path.join(screenshotDir, 'desktop-02-notes-open.png'),
      fullPage: true,
    });

    // Mở Sounds
    await page.click('[data-testid="dock-btn-sounds"]');
    const sounds = page.locator('[data-testid="widget-container-sounds"]');
    await expect(sounds).toBeVisible();
    const soundsBox = await sounds.boundingBox();
    expect(soundsBox).not.toBeNull();

    await page.screenshot({
      path: path.join(screenshotDir, 'desktop-03-sounds-open.png'),
      fullPage: true,
    });

    // Mở Spaces
    await page.click('[data-testid="dock-btn-spaces"]');
    const spaces = page.locator('[data-testid="widget-container-spaces"]');
    await expect(spaces).toBeVisible();
    const spacesBox = await spaces.boundingBox();
    expect(spacesBox).not.toBeNull();

    // Assertion: Hiệu ứng cascade giúp các cửa sổ so le nhau
    const tasks = page.locator('[data-testid="widget-container-tasks"]');
    const tasksBox = await tasks.boundingBox();
    expect(tasksBox).not.toBeNull();

    // Khẳng định từng cặp vị trí khác nhau rõ ràng, không dùng so sánh dây chuyền
    expect(soundsBox!.x).not.toBe(tasksBox!.x);
    expect(spacesBox!.x).not.toBe(soundsBox!.x);
    expect(spacesBox!.x).not.toBe(tasksBox!.x);
    expect(soundsBox!.x).toBeGreaterThan(tasksBox!.x);
    expect(spacesBox!.x).toBeGreaterThan(soundsBox!.x);

    await page.screenshot({
      path: path.join(screenshotDir, 'desktop-04-spaces-open.png'),
      fullPage: true,
    });
  });

  test('3. Chụp Desktop: Zen Mode Active & Soundboard Ambient Tab', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.waitForSelector('[data-testid="workspace-root"]');

    // Mở Sounds và chuyển tab Ambient
    await page.click('[data-testid="dock-btn-sounds"]');
    await page.waitForSelector('[data-testid="widget-container-sounds"]');
    const ambientTabBtn = page.locator('button:has-text("Âm Thanh Nền")');
    if (await ambientTabBtn.isVisible()) {
      await ambientTabBtn.click();
      await page.waitForTimeout(200);

      // Assertion: Danh sách các track âm thanh môi trường phải xuất hiện
      await expect(page.locator('[data-testid="track-item-rain"]')).toBeVisible();

      await page.screenshot({
        path: path.join(screenshotDir, 'desktop-05-sounds-ambient-tab.png'),
        fullPage: true,
      });
    }

    // Bật Zen Mode
    await page.keyboard.press('KeyZ');
    const zenOverlay = page.locator('[data-testid="zen-mode-overlay"]');
    await expect(zenOverlay).toBeVisible();

    // Assertion: Zen Overlay chiếm trọn màn hình 1440x900
    const zenBox = await zenOverlay.boundingBox();
    expect(zenBox!.width).toBe(1440);
    expect(zenBox!.height).toBe(900);

    // Assertion: Nút thoát Zen Mode có mặt và có thể bấm thao tác thực tế
    const exitZenBtn = page.locator('[data-testid="exit-zen-btn"]');
    await expect(exitZenBtn).toBeVisible();
    await exitZenBtn.click();
    await expect(zenOverlay).not.toBeVisible();

    // Bật lại Zen Mode bằng phím tắt KeyZ để chụp ảnh
    await page.keyboard.press('KeyZ');
    await expect(zenOverlay).toBeVisible();

    await page.screenshot({
      path: path.join(screenshotDir, 'desktop-06-zen-mode.png'),
      fullPage: true,
    });
  });

  test('4. Chụp Mobile: Viewport 390x844 (Default Stack View)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.waitForSelector('[data-testid="workspace-root"]');
    await page.waitForTimeout(500);

    // Assertion: Không bị vỡ ngang
    const noHScroll = await page.evaluate(() => document.documentElement.scrollWidth <= 390);
    expect(noHScroll).toBe(true);

    await page.screenshot({
      path: path.join(screenshotDir, 'mobile-01-default-stack.png'),
      fullPage: true,
    });

    // Trên mobile, Notes đã mở sẵn theo mặc định
    await expect(page.locator('[data-testid="widget-container-notes"]')).toBeVisible();

    // Mở thêm widget Sounds từ dockbar
    await page.click('[data-testid="dock-btn-sounds"]');
    await page.waitForTimeout(400);

    // Assertion: Widget Sounds render trong luồng mobile stack và có thể thao tác
    const soundsWidget = page.locator('[data-testid="widget-container-sounds"]');
    await expect(soundsWidget).toBeVisible();

    // Thao tác thực tế trên mobile: đóng widget Sounds qua nút close-widget
    await page.click('[data-testid="close-widget-sounds"]');
    await expect(soundsWidget).not.toBeVisible();

    // Mở lại Sounds để chụp ảnh và tiếp tục
    await page.click('[data-testid="dock-btn-sounds"]');
    await expect(soundsWidget).toBeVisible();

    await page.screenshot({
      path: path.join(screenshotDir, 'mobile-02-scrolled-widgets.png'),
      fullPage: true,
    });

    // Mobile Zen Mode
    await page.click('[data-testid="dock-btn-zen"]');
    const zenOverlay = page.locator('[data-testid="zen-mode-overlay"]');
    await expect(zenOverlay).toBeVisible();

    // Assertion: Zen Mode trên mobile vừa khít chiều rộng màn hình 390px
    const mZenBox = await zenOverlay.boundingBox();
    expect(mZenBox!.width).toBe(390);

    await page.screenshot({
      path: path.join(screenshotDir, 'mobile-03-zen-mode.png'),
      fullPage: true,
    });
  });
});
