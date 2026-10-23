import { test, expect } from '@playwright/test';

test.describe('Widget Layout & Zen Mode E2E Tests', () => {
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

  test('1. Bật/tắt widget từ DockBar và kiểm tra Calendar placeholder', async ({ page }) => {
    // Ban đầu Timer, Tasks, Notes mở; Calendar đóng
    await expect(page.getByTestId('widget-container-timer')).toBeVisible();
    await expect(page.getByTestId('widget-container-tasks')).toBeVisible();
    await expect(page.getByTestId('widget-container-notes')).toBeVisible();
    await expect(page.getByTestId('widget-container-calendar')).not.toBeVisible();

    // 1. Mở Calendar placeholder từ DockBar
    await page.getByTestId('dock-btn-calendar').click();
    await expect(page.getByTestId('widget-container-calendar')).toBeVisible();
    await expect(page.getByTestId('calendar-widget')).toContainText('Lịch Biểu & Sự Kiện');
    await expect(page.getByText('Sắp ra mắt')).toBeVisible();

    // 2. Đóng Calendar bằng nút X trên header của widget
    await page.getByTestId('close-widget-calendar').click();
    await expect(page.getByTestId('widget-container-calendar')).not.toBeVisible();

    // 3. Đóng Notes từ DockBar
    await page.getByTestId('dock-btn-notes').click();
    await expect(page.getByTestId('widget-container-notes')).not.toBeVisible();

    // 4. Mở lại Notes từ DockBar
    await page.getByTestId('dock-btn-notes').click();
    await expect(page.getByTestId('widget-container-notes')).toBeVisible();
  });

  test('2. Kéo thả widget trên desktop và khôi phục sau khi reload', async ({ page }) => {
    const timerWidget = page.getByTestId('widget-container-timer');
    const dragHandle = timerWidget.locator('[data-drag-handle="true"]');

    // Lấy tọa độ ban đầu
    const boxBefore = await timerWidget.boundingBox();
    expect(boxBefore).not.toBeNull();

    // Thực hiện thao tác kéo thả (drag & drop) bằng chuột
    const handleBox = await dragHandle.boundingBox();
    expect(handleBox).not.toBeNull();

    await page.mouse.move(handleBox!.x + 50, handleBox!.y + 10);
    await page.mouse.down();
    await page.mouse.move(handleBox!.x + 120, handleBox!.y + 80, { steps: 5 });
    await page.mouse.up();

    // Xác nhận tọa độ mới đã thay đổi
    const boxAfter = await timerWidget.boundingBox();
    expect(boxAfter).not.toBeNull();
    expect(boxAfter!.x).toBeGreaterThan(boxBefore!.x);
    expect(boxAfter!.y).toBeGreaterThan(boxBefore!.y);

    // Reload trang và xác minh tọa độ lưu trong localStorage được duy trì
    await page.reload();
    const boxAfterReload = await page.getByTestId('widget-container-timer').boundingBox();
    expect(boxAfterReload).not.toBeNull();
    expect(Math.abs(boxAfterReload!.x - boxAfter!.x)).toBeLessThanOrEqual(2);
    expect(Math.abs(boxAfterReload!.y - boxAfter!.y)).toBeLessThanOrEqual(2);
  });

  test('3. Nút khôi phục bố cục mặc định (Reset Layout) hoàn trả vị trí và mở các widget chuẩn', async ({ page }) => {
    // 1. Đóng widget Tasks và Notes
    await page.getByTestId('dock-btn-tasks').click();
    await page.getByTestId('dock-btn-notes').click();
    await expect(page.getByTestId('widget-container-tasks')).not.toBeVisible();
    await expect(page.getByTestId('widget-container-notes')).not.toBeVisible();

    // 2. Click nút "Bố cục mặc định" trên dock
    await page.getByTestId('dock-btn-reset-layout').click();

    // 3. Xác minh Tasks và Notes được mở lại
    await expect(page.getByTestId('widget-container-tasks')).toBeVisible();
    await expect(page.getByTestId('widget-container-notes')).toBeVisible();
    await expect(page.getByTestId('widget-container-timer')).toBeVisible();
  });

  test('4. Chế độ Zen Mode: Bật/tắt bằng nút UI và phím tắt Z/Esc', async ({ page }) => {
    // 1. Bật Zen Mode từ DockBar
    await page.getByTestId('dock-btn-zen').click();

    // Xác minh Zen Overlay xuất hiện, Tasks và Notes bị ẩn hoàn toàn
    await expect(page.getByTestId('zen-mode-overlay')).toBeVisible();
    await expect(page.getByTestId('widget-container-tasks')).not.toBeVisible();
    await expect(page.getByTestId('widget-container-notes')).not.toBeVisible();
    await expect(page.getByTestId('timer-display')).toBeVisible();

    // 2. Thoát Zen Mode bằng nút "Thoát Zen Mode"
    await page.getByTestId('exit-zen-btn').click();
    await expect(page.getByTestId('zen-mode-overlay')).not.toBeVisible();
    await expect(page.getByTestId('widget-container-tasks')).toBeVisible();

    // 3. Bật Zen Mode bằng phím tắt 'Z'
    await page.locator('body').click();
    await page.keyboard.press('z');
    await expect(page.getByTestId('zen-mode-overlay')).toBeVisible();

    // 4. Thoát Zen Mode bằng phím tắt 'Escape'
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('zen-mode-overlay')).not.toBeVisible();
    await expect(page.getByTestId('widget-container-tasks')).toBeVisible();
  });

  test('5. Phím tắt bị vô hiệu hóa khi người dùng đang nhập liệu trong input hoặc textarea', async ({ page }) => {
    // Focus vào ô nhập task mới
    const inputTask = page.getByTestId('input-new-task');
    await inputTask.focus();

    // Gõ chữ 'z' và phím Space vào input
    await page.keyboard.press('z');
    await page.keyboard.press('Space');
    await page.keyboard.press('r');

    // Xác nhận:
    // 1. Text trong input phải nhận ký tự bình thường
    await expect(inputTask).toHaveValue('z r');
    // 2. KHÔNG kích hoạt Zen Mode
    await expect(page.getByTestId('zen-mode-overlay')).not.toBeVisible();
    // 3. Timer vẫn đang ở trạng thái IDLE 25:00, không bị chạy hay reset
    await expect(page.getByTestId('status-indicator')).toHaveText(/idle/i);
    await expect(page.getByTestId('timer-display')).toHaveText('25:00');
  });

  test('6. Kiểm tra Responsive Mobile Viewport (< 1024px)', async ({ page }) => {
    // Chuyển viewport sang màn hình di động 375x667 (iPhone SE)
    await page.setViewportSize({ width: 375, height: 667 });

    // Xác nhận các widget render theo flow mobile không có thuộc tính absolute fixed tọa độ desktop
    const timerContainer = page.getByTestId('widget-container-timer');
    await expect(timerContainer).toBeVisible();

    // Không bị tràn ra ngoài màn hình (chiều rộng tối đa 375px)
    const box = await timerContainer.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeLessThanOrEqual(375);

    // DockBar vẫn hiển thị gọn gàng ở đáy màn hình
    await expect(page.getByRole('toolbar')).toBeVisible();
  });

  test('7. Thao tác Layout & Zen Mode KHÔNG làm reset Timer đang chạy và Task đang gắn', async ({ page }) => {
    // 1. Tạo task và gắn vào Timer
    await page.getByTestId('input-new-task').fill('Nhiệm vụ kiểm tra Layout');
    await page.getByTestId('add-task-btn').click();
    await page.locator('button[data-testid^="link-task-btn-"]').first().click();
    await expect(page.getByTestId('linked-task-banner')).toContainText('Nhiệm vụ kiểm tra Layout');

    // 2. Bắt đầu Timer chạy
    await page.getByTestId('timer-start-btn').click();
    await expect(page.getByTestId('status-indicator')).toHaveText(/running/i);

    // 3. Đóng và mở lại widget Tasks từ DockBar
    await page.getByTestId('dock-btn-tasks').click();
    await expect(page.getByTestId('widget-container-tasks')).not.toBeVisible();
    await page.getByTestId('dock-btn-tasks').click();
    await expect(page.getByTestId('widget-container-tasks')).toBeVisible();

    // 4. Bật Zen Mode rồi thoát Zen Mode
    await page.getByTestId('dock-btn-zen').click();
    await expect(page.getByTestId('zen-mode-overlay')).toBeVisible();
    await expect(page.getByTestId('status-indicator')).toHaveText(/running/i);
    await page.getByTestId('exit-zen-btn').click();

    // 5. Xác minh: Timer VẪN ĐANG CHẠY và Task VẪN ĐANG ĐƯỢC GẮN
    await expect(page.getByTestId('status-indicator')).toHaveText(/running/i);
    await expect(page.getByTestId('linked-task-banner')).toContainText('Nhiệm vụ kiểm tra Layout');
  });
});
