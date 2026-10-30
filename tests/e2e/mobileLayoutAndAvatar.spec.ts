import { test, expect } from '@playwright/test';
import * as path from 'path';

const ARTIFACT_DIR = 'C:/Users/Nam/.gemini/antigravity/brain/f0e4fa42-ea0b-4ff3-83da-6875921843c2';

test.describe('Mobile Layout Consistency, Avatar Saving & Shared Footer', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // Mobile portrait viewport

  test('1. Mobile Header & Shared Footer đều thống nhất và không bị tràn vỡ trên mobile', async ({ page }) => {
    // Check Landing Page
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('platform-unified-header')).toBeVisible();
    await expect(page.getByTestId('shared-footer')).toBeVisible();

    // Check Help Page
    await page.goto('/help');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('platform-unified-header')).toBeVisible();
    await expect(page.getByTestId('shared-footer')).toBeVisible();

    // Verify shortcuts don't break
    await expect(page.getByText('Bắt đầu / Tạm dừng Pomodoro')).toBeVisible();
    await expect(page.getByText('Bỏ qua và chuyển sang hiệp tiếp theo')).toBeVisible();

    // Check Contact Page
    await page.goto('/contact');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('platform-unified-header')).toBeVisible();
    await expect(page.getByTestId('shared-footer')).toBeVisible();

    // Screenshot on mobile
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile-unified-help-contact.png') });
  });

  test('2. Chỉnh sửa Avatar và Tên hiển thị trong Hồ Sơ, lưu trữ bền vững', async ({ page }) => {
    // Đăng ký tài khoản để có profile
    await page.goto('/signup');
    await page.waitForLoadState('networkidle');

    const email = `avatar.test.${Date.now()}@pomofocus.io`;
    await page.getByPlaceholder('Ví dụ: Hoàng Nam').fill('Hồ Avatar Test');
    await page.getByPlaceholder('tenban@domain.com').fill(email);
    await page.getByPlaceholder('Ít nhất 6 ký tự').fill('pass123456');
    await page.getByTestId('btn-auth-submit').click();

    // Vào hồ sơ
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('profile-view')).toBeVisible();
    await expect(page.getByTestId('platform-unified-header')).toBeVisible();
    await expect(page.getByTestId('shared-footer')).toBeVisible();

    // Mở form chỉnh sửa hồ sơ & avatar
    await page.getByTestId('btn-toggle-edit-profile').click();

    // Nhập URL avatar hoặc chọn preset
    const presetBtn = page.locator('button[title="Chọn avatar 1"]');
    await expect(presetBtn).toBeVisible();
    await presetBtn.click();

    // Lưu hồ sơ
    await page.getByTestId('btn-save-profile').click();

    // Kiểm tra thông báo thành công
    await expect(page.getByText('Đã cập nhật ảnh đại diện và hồ sơ thành công!')).toBeVisible();

    // Kiểm tra ảnh hiển thị trong Profile card
    const profileImg = page.locator('[data-testid="profile-view"] img').first();
    await expect(profileImg).toBeVisible();

    // Reload trang kiểm tra dữ liệu vẫn tồn tại
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="profile-view"] img').first()).toBeVisible();

    // Screenshot mobile profile with avatar
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile-profile-avatar-saved.png') });
  });

  test('3. Trang Bảo Mật trên Mobile: Phiên Đăng Nhập không bị rớt chữ', async ({ page }) => {
    await page.goto('/account/security');
    await page.waitForLoadState('networkidle');

    // Chuyển sang login nếu chưa có session
    if (await page.getByText('Yêu Cầu Đăng Nhập').isVisible()) {
      await page.goto('/signup');
      await page.getByPlaceholder('Ví dụ: Hoàng Nam').fill('Security User');
      await page.getByPlaceholder('tenban@domain.com').fill(`sec.${Date.now()}@pomofocus.io`);
      await page.getByPlaceholder('Ít nhất 6 ký tự').fill('pass123456');
      await page.getByTestId('btn-auth-submit').click();
      await page.goto('/account/security');
    }

    await expect(page.getByTestId('account-security-view')).toBeVisible();
    await expect(page.getByText('Phiên Đăng Nhập Hiện Tại')).toBeVisible();
    await expect(page.getByText('Đăng Xuất Phiên Này')).toBeVisible();
    await expect(page.getByTestId('shared-footer')).toBeVisible();

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile-security-layout-clean.png') });
  });
});
