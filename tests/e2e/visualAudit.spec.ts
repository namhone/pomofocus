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
  });

  test('2. Chụp Desktop: Mở Notes, Sounds, Spaces Widgets', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.waitForSelector('[data-testid="workspace-root"]');
    await page.waitForTimeout(500);

    // Notes đã mở sẵn theo mặc định
    await page.waitForSelector('[data-testid="widget-container-notes"]');
    await page.screenshot({
      path: path.join(screenshotDir, 'desktop-02-notes-open.png'),
      fullPage: true,
    });

    // Mở Sounds
    await page.click('[data-testid="dock-btn-sounds"]');
    await page.waitForSelector('[data-testid="widget-container-sounds"]');
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(screenshotDir, 'desktop-03-sounds-open.png'),
      fullPage: true,
    });

    // Mở Spaces
    await page.click('[data-testid="dock-btn-spaces"]');
    await page.waitForSelector('[data-testid="widget-container-spaces"]');
    await page.waitForTimeout(300);
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
      await page.screenshot({
        path: path.join(screenshotDir, 'desktop-05-sounds-ambient-tab.png'),
        fullPage: true,
      });
    }

    // Bật Zen Mode
    await page.keyboard.press('KeyZ');
    await page.waitForSelector('[data-testid="zen-mode-overlay"]');
    await page.waitForTimeout(300);
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

    await page.screenshot({
      path: path.join(screenshotDir, 'mobile-01-default-stack.png'),
      fullPage: true,
    });

    // Mở Notes & Sounds trên mobile
    await page.click('[data-testid="dock-btn-notes"]');
    await page.click('[data-testid="dock-btn-sounds"]');
    await page.waitForTimeout(400);

    await page.screenshot({
      path: path.join(screenshotDir, 'mobile-02-scrolled-widgets.png'),
      fullPage: true,
    });

    // Mobile Zen Mode
    await page.click('[data-testid="dock-btn-zen"]');
    await page.waitForSelector('[data-testid="zen-mode-overlay"]');
    await page.waitForTimeout(300);

    await page.screenshot({
      path: path.join(screenshotDir, 'mobile-03-zen-mode.png'),
      fullPage: true,
    });
  });
});
