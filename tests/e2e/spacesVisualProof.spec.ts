import { test, expect } from '@playwright/test';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/Nam/.gemini/antigravity/brain/f0e4fa42-ea0b-4ff3-83da-6875921843c2';

test.describe('Spaces Widget Proof Captures', () => {
  test('1. Chụp màn hình Desktop (1440x900) - Kho Hình Nền & Tỉ Lệ 16:9 / 9:16', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/app');
    await page.waitForLoadState('networkidle');

    // Mở Spaces Widget
    const spacesBtn = page.getByTestId('dock-btn-spaces');
    await expect(spacesBtn).toBeVisible();
    await spacesBtn.click();
    await expect(page.getByTestId('spaces-widget')).toBeVisible();

    // Đợi ảnh load ổn định
    await page.waitForTimeout(3500);

    // Chụp Desktop hiển thị tất cả
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'proof-spaces-desktop-all.png')
    });

    // Chuyển sang tỉ lệ 16:9
    await page.getByTestId('ratio-filter-16-9').click();
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'proof-spaces-desktop-16-9.png')
    });

    // Chuyển sang tỉ lệ 9:16
    await page.getByTestId('ratio-filter-9-16').click();
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'proof-spaces-desktop-9-16.png')
    });
  });

  test('2. Chụp màn hình Mobile (390x844) - Kiểm tra bố cục gọn gàng, không đè chữ', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/app');
    await page.waitForLoadState('networkidle');

    // Mở Spaces Widget trên mobile
    const spacesBtn = page.getByTestId('dock-btn-spaces');
    await expect(spacesBtn).toBeVisible();
    await spacesBtn.click();
    await expect(page.getByTestId('spaces-widget')).toBeVisible();

    await page.waitForTimeout(3500);

    // Chụp ảnh Mobile
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'proof-spaces-mobile-390x844.png')
    });
  });
});
