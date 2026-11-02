import { test, expect } from '@playwright/test';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/Nam/.gemini/antigravity/brain/f0e4fa42-ea0b-4ff3-83da-6875921843c2';

test.describe('Spaces Widget Proof Captures', () => {
  test('1. Chụp màn hình Desktop (1440x900) - Kho Hình Nền Đồng Nhất & Thẻ Ngang Responsive', async ({ page }) => {
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

    // Chụp Desktop hiển thị kho ảnh đồng nhất
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'proof-spaces-desktop-all.png')
    });

    // Chuyển sang danh mục Video Chuyển Động
    await page.getByTestId('filter-cat-video').click();
    await page.waitForTimeout(1500);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'proof-spaces-desktop-video.png')
    });

    // Chuyển về Tất cả
    await page.getByTestId('filter-cat-all').click();
    await page.waitForTimeout(1500);
  });

  test('2. Chụp màn hình Mobile (390x844) - Bố cục gọn gàng, đồng nhất thẻ ngang 16:9', async ({ page }) => {
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
