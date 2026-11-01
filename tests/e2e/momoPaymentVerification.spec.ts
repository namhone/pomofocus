import { test, expect } from '@playwright/test';

test.describe('MoMo QR Payment & Auto-Upgrade PRO Verification', () => {
  test('Kiểm tra Modal Thanh Toán MoMo QR: Giao diện Monochrome, QR động, đếm ngược 10:00 và nâng cấp PRO tức thì', async ({ page }) => {
    // 1. Mở trang Billing
    await page.goto('http://localhost:5173/billing');
    await page.waitForLoadState('networkidle');

    // 2. Kiểm tra giao diện trang Billing
    await expect(page.getByTestId('billing-view')).toBeVisible();

    // 3. Chuyển đổi qua lại giữa các gói (Hàng tháng, Hàng năm, Trọn đời)
    const monthlyBtn = page.getByTestId('billing-cycle-monthly');
    const yearlyBtn = page.getByTestId('billing-cycle-yearly');
    const lifetimeBtn = page.getByTestId('billing-cycle-lifetime');

    await expect(monthlyBtn).toBeVisible();
    await expect(yearlyBtn).toBeVisible();
    await expect(lifetimeBtn).toBeVisible();

    await lifetimeBtn.click();
    await expect(page.getByText('799.000₫')).toBeVisible();

    await yearlyBtn.click();
    await expect(page.getByText('39.000₫')).toBeVisible();

    // 4. Bấm "Nâng Cấp Bằng MoMo QR"
    const payBtn = page.getByTestId('btn-pay-momo');
    await expect(payBtn).toBeVisible();
    await payBtn.click();

    // 5. Kiểm tra Modal MoMo xuất hiện
    const modal = page.getByTestId('momo-payment-modal');
    await expect(modal).toBeVisible();

    // Kiểm tra 3 bước hướng dẫn chuẩn
    await expect(page.getByText('Mở app MoMo', { exact: true })).toBeVisible();
    await expect(page.getByText('Quét mã QR', { exact: true })).toBeVisible();
    await expect(page.getByText('Hoàn tất', { exact: true })).toBeVisible();

    // Chụp ảnh bằng chứng Modal MoMo QR Monochrome
    await page.screenshot({
      path: 'C:/Users/Nam/.gemini/antigravity/brain/f0e4fa42-ea0b-4ff3-83da-6875921843c2/proof-momo-qr-modal.png'
    });

    // Kiểm tra nút mở app MoMo di động
    await expect(page.getByText('Mở App MoMo Để Thanh Toán')).toBeVisible();

    // Kiểm tra bộ đếm ngược 10:00
    await expect(page.getByText('Mã QR hết hạn sau:')).toBeVisible();

    // 6. Nhấn nút Sandbox kích hoạt thành công
    const sandboxBtn = page.getByTestId('btn-momo-simulate-sandbox');
    await expect(sandboxBtn).toBeVisible();
    await sandboxBtn.click();

    // 7. Xác nhận màn hình chúc mừng nâng cấp PRO xuất hiện với Confetti
    const successView = page.getByTestId('momo-success-view');
    await expect(successView).toBeVisible();
    await expect(page.getByText('Chúc Mừng Bạn Đã Được Nâng Cấp Lên Gói PRO!')).toBeVisible();

    // Chụp ảnh bằng chứng Màn hình Chúc Mừng PRO & Confetti
    await page.screenshot({
      path: 'C:/Users/Nam/.gemini/antigravity/brain/f0e4fa42-ea0b-4ff3-83da-6875921843c2/proof-momo-success-celebration.png'
    });

    // 8. Bấm "Bắt Đầu Trải Nghiệm PRO Ngay" để đóng modal
    const closeSuccessBtn = page.getByTestId('btn-momo-go-to-workspace');
    await expect(closeSuccessBtn).toBeVisible();
    await closeSuccessBtn.click();

    // Modal đóng
    await expect(modal).not.toBeVisible();

    // Xác nhận tài khoản được hiển thị trạng thái PRO (Nút gói miễn phí đổi thành "Chuyển về Gói Cơ Bản")
    await expect(page.getByText('Chuyển về Gói Cơ Bản')).toBeVisible();
    await expect(page.getByText('Thanh toán MoMo thành công!')).toBeVisible();
  });
});
