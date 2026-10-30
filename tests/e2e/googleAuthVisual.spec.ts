import { test, expect } from '@playwright/test';
import * as path from 'path';

test('Chụp màn hình quy trình Google Sign-In và liên kết MoMo PRO', async ({ page }) => {
  const artifactDir = 'C:/Users/Nam/.gemini/antigravity/brain/f0e4fa42-ea0b-4ff3-83da-6875921843c2';

  // 1. Màn hình Đăng Nhập với nút Tiếp Tục Với Google
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await expect(page.getByTestId('btn-google-signin')).toBeVisible();
  await page.screenshot({ path: path.join(artifactDir, 'google-signin-authview.png'), fullPage: false });

  // 2. Click Tiếp Tục Với Google
  await page.getByTestId('btn-google-signin').click();
  await expect(page).toHaveURL(/.*app/, { timeout: 10000 });
  await page.screenshot({ path: path.join(artifactDir, 'google-user-authenticated-app.png'), fullPage: false });

  // 3. Mở /billing kiểm tra bảng giá cập nhật
  await page.goto('/billing');
  await page.waitForLoadState('networkidle');
  await expect(page.getByText('39.000 VNĐ')).toBeVisible();
  await page.screenshot({ path: path.join(artifactDir, 'google-billing-prices-updated.png'), fullPage: false });

  // 4. Mở modal MoMo xem danh tính Google đã liên kết và MoMo recipient Nam
  await page.getByTestId('btn-pay-momo').click();
  const modal = page.getByTestId('momo-payment-modal');
  await expect(modal).toBeVisible();
  await expect(modal.getByText(/Hồ Ngọc Bảo Nam \(Google\)/i)).toBeVisible();
  await expect(modal.getByText('0704 862 629')).toBeVisible();
  await page.screenshot({ path: path.join(artifactDir, 'google-momo-order-bound.png'), fullPage: false });
});
