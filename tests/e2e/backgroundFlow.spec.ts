import { test, expect } from '@playwright/test';

test.describe('Background Gallery & Ambient Spaces E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(async () => {
      localStorage.clear();
      const dbs = await window.indexedDB.databases?.();
      if (dbs) {
        for (const db of dbs) {
          if (db.name) window.indexedDB.deleteDatabase(db.name);
        }
      }
    });
    await page.reload();
  });

  test('1. Mở Spaces Widget từ DockBar và hiển thị danh mục presets', async ({ page }) => {
    // 1. Click mở Spaces từ DockBar
    await page.getByTestId('dock-btn-spaces').click();
    await expect(page.getByTestId('widget-container-spaces')).toBeVisible();

    // 2. Xác nhận hiển thị tiêu đề và các thẻ preset
    await expect(page.getByTestId('spaces-widget')).toContainText('Thư Viện Không Gian (Spaces)');
    await expect(page.getByTestId('preset-card-deep-space')).toBeVisible();
    await expect(page.getByTestId('preset-card-cozy-lofi-room')).toBeVisible();
    await expect(page.getByTestId('preset-card-rainy-window')).toBeVisible();

    // 3. Lọc theo danh mục: Chỉ xem Video
    await page.getByTestId('filter-cat-video').click();
    await expect(page.getByTestId('preset-card-rainy-window')).toBeVisible();
    await expect(page.getByTestId('preset-card-deep-space')).not.toBeVisible();

    // 4. Quay lại xem tất cả
    await page.getByTestId('filter-cat-all').click();
    await expect(page.getByTestId('preset-card-deep-space')).toBeVisible();
  });

  test('2. Chuyển đổi Preset nền, cập nhật BackgroundCanvas và duy trì sau khi reload', async ({ page }) => {
    await page.getByTestId('dock-btn-spaces').click();

    // 1. Mặc định là deep-space (gradient element)
    await expect(page.getByTestId('background-gradient-element')).toBeVisible();

    // 2. Chọn preset hình ảnh "cozy-lofi-room"
    await page.getByTestId('preset-card-cozy-lofi-room').click();

    // Xác nhận BackgroundCanvas chuyển sang render thẻ ảnh
    await expect(page.getByTestId('background-image-element')).toBeVisible();

    // 3. Reload trang và kiểm tra lưu trữ bền vững trong localStorage
    await page.reload();
    await expect(page.getByTestId('background-image-element')).toBeVisible();

    // 4. Kiểm tra widget Spaces vẫn mở sau reload và thẻ cozy-lofi-room vẫn được đánh dấu đã chọn
    await expect(page.getByTestId('widget-container-spaces')).toBeVisible();
    const cozyCard = page.getByTestId('preset-card-cozy-lofi-room');
    await expect(cozyCard).toHaveClass(/border-cyan-500/);
  });

  test('3. Tinh chỉnh hiệu ứng mờ (Blur), độ sáng (Brightness) và lớp phủ tối (Overlay)', async ({ page }) => {
    await page.getByTestId('dock-btn-spaces').click();

    // Mở bảng tinh chỉnh hiệu ứng
    await page.getByTestId('btn-toggle-adjustments').click();
    await expect(page.getByTestId('bg-adjustments-panel')).toBeVisible();

    // Điều chỉnh thanh trượt Overlay lên 60%
    const overlaySlider = page.getByTestId('slider-overlay');
    await overlaySlider.fill('60');

    // Xác nhận lớp phủ tối áp dụng opacity 0.6
    const overlayEl = page.getByTestId('background-overlay');
    await expect(overlayEl).toHaveCSS('opacity', '0.6');

    // Nút khôi phục nền đưa overlay về 30% mặc định
    await page.getByTestId('btn-reset-bg').click();
    await expect(overlayEl).toHaveCSS('opacity', '0.3');
  });

  test('4. Xử lý lỗi tải hình ảnh/video và kích hoạt nền tĩnh dự phòng an toàn', async ({ page }) => {
    await page.getByTestId('dock-btn-spaces').click();

    // Giả lập kích hoạt trạng thái lỗi bằng store action
    await page.evaluate(() => {
      // @ts-expect-error - lấy store trên window nếu có hoặc import
      import('/src/stores/useBackgroundStore.ts').then(({ useBackgroundStore }) => {
        useBackgroundStore.getState().setError(true, 'Test error network failure');
      });
    });

    // Xác nhận thông báo fallback xuất hiện
    await expect(page.getByTestId('bg-fallback-indicator')).toBeVisible();
    // BackgroundCanvas tự động chuyển sang render gradient element an toàn
    await expect(page.getByTestId('background-gradient-element')).toBeVisible();
  });

  test('5. Đổi nền KHÔNG làm reset Timer đang chạy và không làm mất Task/Note liên kết', async ({ page }) => {
    // 1. Tạo task và gắn vào Timer
    await page.getByTestId('input-new-task').fill('Task thử nghiệm Background');
    await page.getByTestId('add-task-btn').click();
    await page.locator('button[data-testid^="link-task-btn-"]').first().click();
    await expect(page.getByTestId('linked-task-banner')).toContainText('Task thử nghiệm Background');

    // 2. Chạy Timer
    await page.getByTestId('timer-start-btn').click();
    await expect(page.getByTestId('status-indicator')).toHaveText(/running/i);

    // 3. Mở Spaces Widget và đổi liên tiếp các preset
    await page.getByTestId('dock-btn-spaces').click();
    await page.getByTestId('preset-card-cozy-lofi-room').click();
    await page.getByTestId('preset-card-deep-space').click();

    // 4. Xác minh: Timer VẪN ĐANG CHẠY và Task VẪN ĐANG ĐƯỢC GẮN
    await expect(page.getByTestId('status-indicator')).toHaveText(/running/i);
    await expect(page.getByTestId('linked-task-banner')).toContainText('Task thử nghiệm Background');
  });

  test('6. Tương thích hoàn hảo với Zen Mode', async ({ page }) => {
    await page.getByTestId('dock-btn-spaces').click();
    await page.getByTestId('preset-card-cozy-lofi-room').click();

    // Bật Zen Mode
    await page.getByTestId('dock-btn-zen').click();
    await expect(page.getByTestId('zen-mode-overlay')).toBeVisible();

    // Nền hình ảnh vẫn hiển thị mờ ảo phía sau Zen Mode
    await expect(page.getByTestId('background-image-element')).toBeVisible();

    // Thoát Zen Mode
    await page.getByTestId('exit-zen-btn').click();
    await expect(page.getByTestId('zen-mode-overlay')).not.toBeVisible();
    await expect(page.getByTestId('background-image-element')).toBeVisible();
  });
});
