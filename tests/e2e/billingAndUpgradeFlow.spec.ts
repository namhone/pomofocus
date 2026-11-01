import { test, expect } from '@playwright/test';

test.describe('Billing & Freemium Upgrade Flow E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('1. Bấm CTA nâng cấp từ Header và thanh toán sandbox', async ({ page }) => {
    // Tìm nút nâng cấp PRO trên Header
    const headerUpgradeBtn = page.getByTestId('header-pro-upgrade-btn');
    if (await headerUpgradeBtn.isVisible()) {
      await headerUpgradeBtn.click();
      await expect(page).toHaveURL(/.*billing/);
    } else {
      await page.getByTestId('header-nav-billing').click();
      await expect(page).toHaveURL(/.*billing/);
    }

    // Xác nhận giao diện Billing hiển thị đầy đủ
    await expect(page.getByText('Bảng Giá Dịch Vụ PomoFocus')).toBeVisible();
    await expect(page.getByText(/Cổng thanh toán tự động.*sandbox/i)).toBeVisible();

    // Quay lại app
    await page.getByTestId('billing-back-btn').click();
    await expect(page).toHaveURL(/.*app/);
  });

  test('2. Bấm CTA nâng cấp từ Landing Page (Hero, Nav, Pricing Card)', async ({ page }) => {
    await page.goto('/landing');
    await expect(page.getByText(/Nền tảng học tập kết hợp đồng hồ Pomodoro/i)).toBeVisible();

    // CTA 1: Nav Bar 'Bảng Giá'
    await page.getByTestId('landing-nav-billing').click();
    await expect(page).toHaveURL(/.*billing/);

    // Quay lại Landing
    await page.goto('/landing');

    // CTA 2: Hero CTA 'Xem Các Gói Dịch Vụ'
    await page.getByTestId('landing-cta-upgrade-hero').click();
    await expect(page).toHaveURL(/.*billing/);

    // Quay lại Landing
    await page.goto('/landing');

    // CTA 3: Pricing Card 'Nâng Cấp PRO'
    const pricingBtn = page.getByTestId('landing-cta-upgrade-pricing');
    await pricingBtn.scrollIntoViewIfNeeded();
    await pricingBtn.click();
    await expect(page).toHaveURL(/.*billing/);
  });

  test('3. Bấm CTA nâng cấp từ SpacesWidget (Banner & PRO item)', async ({ page }) => {
    // Mở widget Spaces từ Dockbar
    const spacesDockBtn = page.getByTestId('dock-btn-spaces');
    await expect(spacesDockBtn).toBeVisible({ timeout: 10000 });
    await spacesDockBtn.click();

    // Chuyển sang Tab Thư viện Tuyển Chọn (101 HD)
    const catalogTabBtn = page.getByRole('button', { name: /Thư viện Tuyển Chọn/i });
    await catalogTabBtn.click();

    // CTA từ Banner PRO
    const bannerUpgradeBtn = page.getByTestId('spaces-pro-upgrade-btn');
    if (await bannerUpgradeBtn.isVisible()) {
      await bannerUpgradeBtn.click();
      await expect(page).toHaveURL(/.*billing/);
      await page.getByTestId('billing-back-btn').click();
      await expect(page).toHaveURL(/.*app/);
    }

    // Quay lại /app: Nếu widget Spaces chưa mở thì bấm dockbar, sau đó bấm vào ảnh có nhãn PRO
    const catalogTab = page.getByRole('button', { name: /Thư viện Tuyển Chọn/i });
    if (!(await catalogTab.isVisible())) {
      await spacesDockBtn.click();
    }
    await expect(catalogTab).toBeVisible({ timeout: 10000 });
    await catalogTab.click();
    const proItem = page.getByTestId('spaces-pro-item').first();
    if (await proItem.isVisible()) {
      await proItem.click();
      await expect(page).toHaveURL(/.*billing/);
    }
  });

  test('4. F5 Refresh tại /billing khôi phục đúng route không bị lỗi 404', async ({ page }) => {
    await page.goto('/billing');
    await expect(page.getByText('Bảng Giá Dịch Vụ PomoFocus')).toBeVisible();

    // Reload trang
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Kiểm tra state và component vẫn hiển thị chính xác
    await expect(page).toHaveURL(/.*billing/);
    await expect(page.getByText('Bảng Giá Dịch Vụ PomoFocus')).toBeVisible();
    await expect(page.getByText(/Bảng So Sánh Quyền Lợi/i)).toBeVisible();
  });

  test('5. Điều hướng Trình duyệt: Back và Forward qua nhiều routes', async ({ page }) => {
    await page.goto('/app');
    await page.goto('/billing');
    await expect(page).toHaveURL(/.*billing/);

    await page.goto('/landing');
    await expect(page).toHaveURL(/.*landing/);

    // Trình duyệt Back -> /billing
    await page.goBack();
    await expect(page).toHaveURL(/.*billing/);
    await expect(page.getByText('Bảng Giá Dịch Vụ PomoFocus')).toBeVisible();

    // Trình duyệt Back -> /app
    await page.goBack();
    await expect(page).toHaveURL(/.*app/);

    // Trình duyệt Forward -> /billing
    await page.goForward();
    await expect(page).toHaveURL(/.*billing/);
    await expect(page.getByText('Bảng Giá Dịch Vụ PomoFocus')).toBeVisible();
  });

  test('6. Kiểm thử nhấp liên tục ít nhất 10 lần vào các vị trí CTA khác nhau', async ({ page }) => {
    const errorLogs: string[] = [];
    page.on('pageerror', (err) => {
      if (!err.message.includes('ServiceWorker')) {
        errorLogs.push(err.message);
      }
    });

    // Thực hiện chuỗi 10 lần chuyển hướng qua lại giữa các CTA nâng cấp
    for (let i = 0; i < 10; i++) {
      if (i % 3 === 0) {
        // CTA qua Header Bảng Giá
        await page.goto('/app');
        await page.getByTestId('header-nav-billing').click();
      } else if (i % 3 === 1) {
        // CTA qua Landing Hero
        await page.goto('/landing');
        await page.getByTestId('landing-cta-upgrade-hero').click();
      } else {
        // CTA qua Landing Pricing Card
        await page.goto('/landing');
        const ctaPricing = page.getByTestId('landing-cta-upgrade-pricing');
        await ctaPricing.scrollIntoViewIfNeeded();
        await ctaPricing.click();
      }
      await expect(page).toHaveURL(/.*billing/);
      await expect(page.getByText('Bảng Giá Dịch Vụ PomoFocus')).toBeVisible();
    }

    expect(errorLogs).toEqual([]);
  });

  test('7. Chuyển đổi chu kỳ thanh toán và Kích hoạt PRO Sandbox thành công', async ({ page }) => {
    await page.goto('/billing');

    // Mặc định là chu kỳ Hàng năm
    await expect(page.getByText('39.000 VNĐ')).toBeVisible();
    await expect(page.getByText(/thanh toán 468.000 VNĐ \/ năm/i)).toBeVisible();

    // Chuyển sang Hàng tháng
    await page.getByTestId('billing-cycle-monthly').click();
    await expect(page.getByText('59.000 VNĐ', { exact: true })).toBeVisible();
    await expect(page.getByText(/thanh toán theo tháng/i)).toBeVisible();

    // Chuyển lại Hàng năm
    await page.getByTestId('billing-cycle-yearly').click();
    await expect(page.getByText('39.000 VNĐ')).toBeVisible();

    // Bấm kích hoạt PRO Sandbox
    const activateBtn = page.getByTestId('btn-activate-pro-sandbox');
    await activateBtn.click();

    // Kiểm tra thông báo kích hoạt thành công & badge PRO
    await expect(page.getByTestId('billing-pro-active-badge')).toBeVisible();
    await expect(page.getByText(/Đã kích hoạt gói PRO Sandbox/i)).toBeVisible();

    // Quay lại /app kiểm tra Header hiển thị PRO
    await page.getByTestId('billing-back-btn').click();
    await expect(page.getByText('PRO')).toBeVisible();

    // Quay lại /billing và hạ cấp về Miễn phí để dọn dẹp state
    await page.goto('/billing');
    await page.getByTestId('btn-downgrade-free').click();
    await expect(page.getByTestId('btn-activate-pro-sandbox')).toBeVisible();
  });

  test('8. Luồng thanh toán VietQR chuyển khoản ngân hàng: tạo mã đơn, kiểm tra nội dung và tự động nâng cấp gói PRO', async ({ page }) => {
    await page.goto('/billing');

    // Bấm nút chuyển khoản ngân hàng
    const payBtn = page.getByTestId('btn-pay-momo');
    await expect(payBtn).toBeVisible();
    await payBtn.click();

    // Modal VietQR xuất hiện
    const modal = page.getByTestId('momo-payment-modal');
    await expect(modal).toBeVisible();
    await expect(modal.getByText('Chuyển Khoản Ngân Hàng')).toBeVisible();
    await expect(modal.getByText(/Hệ thống đang tự động chờ giao dịch từ Vietcombank/i)).toBeVisible();

    // Kiểm tra nút sao chép nội dung
    const copyBtn = page.getByTestId('btn-copy-momo-memo');
    await expect(copyBtn).toBeVisible();

    // Thử nghiệm Sandbox Mode (dành cho Tester & QA)
    const sandboxBtn = page.getByTestId('btn-momo-simulate-sandbox');
    await sandboxBtn.click();

    // Chờ màn hình thành công xuất hiện
    await expect(page.getByTestId('momo-success-view')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Chúc Mừng Bạn Đã Được Nâng Cấp Lên Gói PRO!')).toBeVisible();

    // Bấm 'Bắt Đầu Trải Nghiệm PRO Ngay'
    await page.getByTestId('btn-momo-go-to-workspace').click();
    await expect(modal).not.toBeVisible();

    // Hạ cấp về Miễn phí để trả lại trạng thái ban đầu
    await page.getByText('Chuyển về Gói Cơ Bản').click();
    await expect(page.getByTestId('btn-pay-momo')).toBeVisible();
  });
});
