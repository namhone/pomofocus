import { test, expect } from '@playwright/test';
import * as path from 'path';

const ARTIFACT_DIR = 'C:/Users/Nam/.gemini/antigravity/brain/f0e4fa42-ea0b-4ff3-83da-6875921843c2';

test.describe('PomoFocus Demo Beta — Comprehensive User Journey & Views', () => {
  test.beforeEach(async ({ page }) => {
    // Xóa bộ nhớ cục bộ trước mỗi bài kiểm tra
    await page.goto('/app');
    await page.evaluate(() => localStorage.clear());
  });

  test('1. Kiểm tra Bảng Giá & Cảnh Báo "DEMO BETA — KHÔNG THU TIỀN THẬT"', async ({ page }) => {
    await page.goto('/billing');
    await page.waitForLoadState('networkidle');

    // 1. Kiểm tra banner Demo Beta trên trang Billing
    const betaBanner = page.getByTestId('billing-beta-banner');
    await expect(betaBanner).toBeVisible();
    await expect(betaBanner).toContainText('KHÔNG THU TIỀN THẬT');
    await expect(betaBanner).toContainText('3 NĂM PRO MIỄN PHÍ');

    // 2. Mở MoMo Modal và kiểm tra cảnh báo không thu tiền thật
    await page.getByTestId('btn-pay-momo').click();
    const momoModal = page.getByTestId('momo-payment-modal');
    await expect(momoModal).toBeVisible();

    const momoWarning = page.getByTestId('momo-beta-warning');
    await expect(momoWarning).toBeVisible();
    await expect(momoWarning).toContainText('DEMO BETA — KHÔNG THU TIỀN THẬT');

    // Chụp ảnh bằng chứng
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'beta-billing-momo-warning.png') });
  });

  test('2. Đăng ký tài khoản mới tự động nhận quyền PRO BETA (3 Năm)', async ({ page }) => {
    await page.goto('/signup');
    await page.waitForLoadState('networkidle');

    const email = `test.beta.${Date.now()}@pomofocus.io`;
    await page.getByPlaceholder('Ví dụ: Hoàng Nam').fill('Beta Student');
    await page.getByPlaceholder('tenban@domain.com').fill(email);
    await page.getByPlaceholder('Ít nhất 6 ký tự').fill('pass123456');
    await page.getByTestId('btn-auth-submit').click();

    // Chờ điều hướng vào app
    await expect(page.getByTestId('workspace-root')).toBeVisible({ timeout: 10000 });

    // Kiểm tra huy hiệu gói trên PlatformHeader
    const headerPlanBadge = page.getByTestId('header-plan-badge');
    await expect(headerPlanBadge).toBeVisible();
    await expect(headerPlanBadge).toContainText('PRO BETA');

    // Điều hướng vào trang Profile và kiểm tra thông tin
    await page.getByTestId('header-user-profile-btn').click();
    await expect(page.getByTestId('profile-view')).toBeVisible();

    const profilePlanBadge = page.getByTestId('profile-plan-badge');
    await expect(profilePlanBadge).toContainText('PRO BETA');

    // Chỉnh sửa hồ sơ
    await page.getByTestId('btn-toggle-edit-profile').click();
    await page.getByTestId('input-edit-display-name').fill('Beta Student VIP');
    await page.getByTestId('btn-save-profile').click();

    await expect(page.getByTestId('profile-display-name')).toHaveText('Beta Student VIP');

    // Chụp ảnh Profile
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'beta-profile-view.png') });
  });

  test('3. Kiểm tra Dashboard Thống Kê & Số Liệu Thực Tế', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('dashboard-view')).toBeVisible();
    await expect(page.getByTestId('metric-total-minutes')).toBeVisible();
    await expect(page.getByTestId('metric-streak-days')).toBeVisible();
    await expect(page.getByTestId('metric-sessions-today')).toBeVisible();
    await expect(page.getByTestId('metric-tasks-completed')).toBeVisible();

    // Chụp ảnh Dashboard
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'beta-dashboard-view.png') });
  });

  test('4. Kiểm tra Cài Đặt (Settings) & Lưu Trữ Thay Đổi', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('settings-view')).toBeVisible();

    // Thay đổi thời gian Pomodoro từ 25 lên 30 phút
    const pomoInput = page.getByTestId('input-setting-pomodoro');
    await pomoInput.fill('30');
    await pomoInput.dispatchEvent('change');

    // Tải lại trang và kiểm tra giá trị vẫn được lưu trong localStorage
    await page.reload();
    await expect(page.getByTestId('input-setting-pomodoro')).toHaveValue('30');

    // Chụp ảnh Settings
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'beta-settings-view.png') });
  });

  test('5. Kiểm tra Quản Lý Dữ Liệu (Privacy & Data)', async ({ page }) => {
    await page.goto('/privacy-data');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('privacy-data-view')).toBeVisible();
    await expect(page.getByTestId('count-tasks')).toBeVisible();
    await expect(page.getByTestId('count-notes')).toBeVisible();
    await expect(page.getByTestId('count-sessions')).toBeVisible();

    // Nút xuất file JSON
    const exportBtn = page.getByTestId('btn-export-data-json');
    await expect(exportBtn).toBeVisible();

    // Mở modal xóa dữ liệu và kiểm tra rào cản an toàn
    await page.getByTestId('btn-open-clear-data-modal').click();
    const deleteModal = page.getByTestId('clear-data-confirm-modal');
    await expect(deleteModal).toBeVisible();

    // Nút xác nhận bị disable khi chưa gõ "XOA"
    const executeBtn = page.getByTestId('btn-confirm-delete-execute');
    await expect(executeBtn).toBeDisabled();

    await page.getByTestId('input-confirm-delete').fill('XOA');
    await expect(executeBtn).toBeEnabled();

    // Đóng modal an toàn
    await page.getByRole('button', { name: 'Hủy' }).click();
    await expect(deleteModal).toBeHidden();

    // Chụp ảnh Privacy Data
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'beta-privacy-data-view.png') });
  });

  test('6. Kiểm tra Trung Tâm Trợ Giúp (Help & Shortcuts)', async ({ page }) => {
    await page.goto('/help');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('help-view')).toBeVisible();
    await expect(page.getByText('Bảng Phím Tắt Tiện Lợi')).toBeVisible();
    await expect(page.getByText('Quy Trình Pomodoro Chuẩn Khoa Học')).toBeVisible();

    // Chụp ảnh Help
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'beta-help-view.png') });
  });

  test('7. Kiểm tra Trang Báo Lỗi 404 (Not Found View)', async ({ page }) => {
    await page.goto('/random-non-existent-page-url');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('not-found-view')).toBeVisible();
    await expect(page.getByText('LỖI 404 — KHÔNG TÌM THẤY TRANG')).toBeVisible();

    // Bấm quay lại Workspace
    await page.getByTestId('404-btn-back-workspace').click();
    await expect(page.getByTestId('workspace-root')).toBeVisible();
  });

  test('8. Trang chủ "/" là Landing Page mặc định với CTA vào Không Gian "/app"', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Kiểm tra Landing Page hiển thị
    await expect(page.getByTestId('landing-page-root')).toBeVisible();
    await expect(page.getByText('Không Gian Học Tập Đắm Chìm.')).toBeVisible();
    await expect(page.getByText('3 Bước bắt đầu học tập năng suất cùng PomoFocus')).toBeVisible();
    await expect(page.getByText('namho03052k9@gmail.com').first()).toBeVisible();
    await expect(page.getByText('0704 862 629').first()).toBeVisible();

    // Nhấn CTA "Bắt Đầu Học Ngay (Miễn Phí)" -> điều hướng vào /app
    await page.getByRole('button', { name: 'Bắt Đầu Học Ngay (Miễn Phí)' }).click();
    await expect(page.getByTestId('workspace-root')).toBeVisible();

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'beta-landing-default-home.png') });
  });

  test('9. Kiểm tra Trang Liên Hệ (/contact) với Hotline & Email chính thức', async ({ page }) => {
    await page.goto('/contact');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('contact-view')).toBeVisible();
    await expect(page.getByText('namho03052k9@gmail.com').first()).toBeVisible();
    await expect(page.getByText('0704 862 629').first()).toBeVisible();
    await expect(page.getByText('Hồ Ngọc Bảo Nam').first()).toBeVisible();

    // Điền form góp ý
    await page.getByPlaceholder('Nguyễn Văn A').fill('Học Viên Thử Nghiệm');
    await page.getByPlaceholder('name@example.com').fill('tester@pomofocus.io');
    await page.getByPlaceholder('Hãy chia sẻ chi tiết nội dung bạn muốn gửi...').fill('Ứng dụng rất mượt và tối giản!');
    await page.getByRole('button', { name: 'Gửi Thông Điệp' }).click();

    await expect(page.getByText('Cảm Ơn Bạn Đã Gửi Phản Hồi!')).toBeVisible();

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'beta-contact-view.png') });
  });
});
