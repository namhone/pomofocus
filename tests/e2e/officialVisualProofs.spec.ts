import { test, expect } from '@playwright/test';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/Nam/.gemini/antigravity/brain/f0e4fa42-ea0b-4ff3-83da-6875921843c2';

test.describe('Official 5 Visual Proofs for User Sign-off', () => {
  test('1 & 2. Bằng chứng Kho Anime & Ghibli thật 100% & Áp dụng hình nền (Desktop 1440x900)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/app');
    await page.waitForLoadState('networkidle');

    // Mở Spaces Widget
    const spacesBtn = page.getByTestId('dock-btn-spaces');
    await expect(spacesBtn).toBeVisible();
    await spacesBtn.click();
    await expect(page.getByTestId('spaces-widget')).toBeVisible();

    // Chuyển sang tab "Anime & Ghibli"
    const animeTab = page.getByTestId('filter-cat-anime-ghibli');
    await expect(animeTab).toBeVisible();
    await animeTab.click();
    await page.waitForTimeout(2000);

    // Chụp Bằng chứng 1: proof-1-anime-tab-art.png
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'proof-1-anime-tab-art.png')
    });

    // Áp dụng tranh anime đầu tiên (Spirited Away Water Train)
    const firstAnime = page.locator('[data-testid="spaces-widget"] button').filter({ hasText: 'Chuyến Tàu Trên Mặt Nước' }).first();
    if (await firstAnime.isVisible()) {
      await firstAnime.click();
    } else {
      await page.locator('[data-testid="spaces-widget"] .grid button').first().click();
    }
    await page.waitForTimeout(1500);

    // Đóng Spaces Widget để khoe trọn vẹn hình nền anime trên màn hình làm việc
    await spacesBtn.click();
    await page.waitForTimeout(1500);

    // Chụp Bằng chứng 2: proof-2-anime-applied.png
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'proof-2-anime-applied.png')
    });
  });

  test('3. Bằng chứng Giao diện Mobile không đè chữ (Viewport 390x844)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/app');
    await page.waitForLoadState('networkidle');

    // Mở Spaces Widget trên mobile
    const spacesBtn = page.getByTestId('dock-btn-spaces');
    await expect(spacesBtn).toBeVisible();
    await spacesBtn.click();
    await expect(page.getByTestId('spaces-widget')).toBeVisible();
    await page.waitForTimeout(2000);

    // Chụp Bằng chứng 3: proof-3-mobile-spaces.png
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'proof-3-mobile-spaces.png')
    });
  });

  test('4. Bằng chứng Form nhập Task hết văng lề (Desktop 1440x900)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/app');
    await page.waitForLoadState('networkidle');

    // Kiểm tra widget Tasks (nếu chưa mở thì bấm mở qua dock)
    const tasksWidget = page.getByTestId('tasks-widget');
    if (!(await tasksWidget.isVisible())) {
      const tasksBtn = page.getByTestId('dock-btn-tasks');
      await expect(tasksBtn).toBeVisible();
      await tasksBtn.click();
    }
    await expect(tasksWidget).toBeVisible();
    await page.waitForTimeout(1500);

    // Chụp Bằng chứng 4: proof-4-tasks-form.png
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'proof-4-tasks-form.png')
    });
  });

  test('5. Bằng chứng Bảng giá mới (/billing) với Toggle 2 nấc & 3 Thẻ giá cân đối', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/billing');
    await page.waitForLoadState('networkidle');

    // Chọn nấc "Thanh toán theo năm"
    const yearlyBtn = page.getByTestId('billing-cycle-yearly');
    await expect(yearlyBtn).toBeVisible();
    await yearlyBtn.click();
    await page.waitForTimeout(1500);

    // Cuộn nhẹ xuống để bao quát trọn vẹn 3 thẻ giá
    await page.evaluate(() => window.scrollTo({ top: 120, behavior: 'instant' }));
    await page.waitForTimeout(800);

    // Chụp Bằng chứng 5: proof-5-billing-cards.png
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'proof-5-billing-cards.png')
    });
  });
});
