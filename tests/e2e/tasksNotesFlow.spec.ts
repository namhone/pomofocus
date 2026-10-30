import { test, expect } from '@playwright/test';

test.describe('Tasks & Notes Widgets E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('1. Thao tác CRUD Task, tạo dự án và khôi phục sau khi reload', async ({ page }) => {
    // 1. Tạo task mới với priority P1
    await page.getByTestId('input-new-task').fill('Hoàn thành tài liệu kiến trúc');
    await page.getByTestId('priority-btn-p1').click();
    await page.getByTestId('input-estimated-pomodoros').fill('3');
    await page.getByTestId('add-task-btn').click();

    // Xác nhận task hiển thị
    const taskItem = page.locator('[data-testid^="task-item-"]').first();
    await expect(taskItem.getByText('Hoàn thành tài liệu kiến trúc')).toBeVisible();
    await expect(taskItem.getByText('p1')).toBeVisible();
    await expect(taskItem.getByText('🍅 0/3')).toBeVisible();

    // 2. Tạo dự án mới
    await page.getByRole('button', { name: '+ Dự án' }).click();
    await page.getByTestId('input-new-project').fill('Dự Án Alpha');
    await page.getByTestId('btn-save-project').click();

    // 3. Reload lại trang và xác minh dữ liệu được khôi phục từ IndexedDB thật
    await page.reload();
    const taskItemAfterReload = page.locator('[data-testid^="task-item-"]').first();
    await expect(taskItemAfterReload.getByText('Hoàn thành tài liệu kiến trúc')).toBeVisible();
    await expect(taskItemAfterReload.getByText('p1')).toBeVisible();
    await expect(taskItemAfterReload.getByText('🍅 0/3')).toBeVisible();

    // 4. Đánh dấu hoàn thành task
    const taskCheckbox = page.locator('input[type="checkbox"][data-testid^="toggle-task-"]').first();
    await taskCheckbox.click();
    await expect(page.getByText('Hoàn thành tài liệu kiến trúc')).toHaveClass(/line-through/);

    // 5. Xóa task
    const deleteBtn = page.locator('button[data-testid^="delete-task-btn-"]').first();
    await deleteBtn.click();
    await expect(page.getByText('Hoàn thành tài liệu kiến trúc')).not.toBeVisible();
  });

  test('2. Gắn task vào Pomodoro Timer và tăng số hiệp completedPomodoros chính xác', async ({ page }) => {
    // 1. Tạo task
    await page.getByTestId('input-new-task').fill('Nhiệm vụ đếm Pomodoro');
    await page.getByTestId('input-estimated-pomodoros').fill('2');
    await page.getByTestId('add-task-btn').click();
    await expect(page.getByText('Nhiệm vụ đếm Pomodoro')).toBeVisible();

    // 2. Click "▷ Gắn Timer"
    const linkBtn = page.locator('button[data-testid^="link-task-btn-"]').first();
    await linkBtn.click();

    // Xác nhận nút đổi thành "🎯 Đang làm" và Timer xuất hiện banner
    await expect(page.getByTestId('linked-task-banner')).toBeVisible();
    await expect(page.getByTestId('linked-task-banner')).toContainText('Nhiệm vụ đếm Pomodoro');

    // 3. Mô phỏng hoàn thành 1 phiên Pomodoro qua IndexedDB Atomic Transaction
    const taskId = await page.evaluate(async () => {
      const { db } = await import('/src/db/index.ts');
      const task = await db.tasks.toCollection().first();
      return task ? task.id : null;
    });
    expect(taskId).toBeTruthy();

    await page.evaluate(async (tId) => {
      const { recordFocusSessionAtomic } = await import('/src/db/index.ts');
      await recordFocusSessionAtomic({
        id: 'session_e2e_pomodoro_1',
        taskId: tId,
        taskTitle: 'Nhiệm vụ đếm Pomodoro',
        phase: 'pomodoro',
        durationMinutes: 25,
        completedAt: Date.now(),
        dateString: '2026-10-23'
      });
    }, taskId);

    // Reload để kiểm tra task counter hiển thị đúng 1/2
    await page.reload();
    await expect(page.getByText('🍅 1/2')).toBeVisible();

    // 4. Thử ghi lại cùng một sessionId (giả lập retry/replay) -> KHÔNG ĐƯỢC TĂNG LẦN 2
    const retryResult = await page.evaluate(async (tId) => {
      const { recordFocusSessionAtomic } = await import('/src/db/index.ts');
      return await recordFocusSessionAtomic({
        id: 'session_e2e_pomodoro_1', // Trùng ID
        taskId: tId,
        taskTitle: 'Nhiệm vụ đếm Pomodoro',
        phase: 'pomodoro',
        durationMinutes: 25,
        completedAt: Date.now(),
        dateString: '2026-10-23'
      });
    }, taskId);

    expect(retryResult).toBe(false);

    await page.reload();
    // Bộ đếm VẪN LÀ 1/2
    await expect(page.getByText('🍅 1/2')).toBeVisible();
  });

  test('3. Xóa task trong lúc đang liên kết với Timer: Timer ngắt liên kết an toàn', async ({ page }) => {
    // 1. Tạo task và gắn vào Timer
    await page.getByTestId('input-new-task').fill('Task sắp xóa');
    await page.getByTestId('add-task-btn').click();
    await page.locator('button[data-testid^="link-task-btn-"]').first().click();

    await expect(page.getByTestId('linked-task-banner')).toBeVisible();

    // 2. Xóa task
    await page.locator('button[data-testid^="delete-task-btn-"]').first().click();

    // 3. Banner trên Timer tự động biến mất, Timer vẫn sẵn sàng hoạt động
    await expect(page.getByTestId('linked-task-banner')).not.toBeVisible();
    await expect(page.getByTestId('timer-display')).toHaveText('25:00');
  });

  test('4. Notes Widget: Soạn thảo Markdown, Autosave, Xem trước và chống XSS', async ({ page }) => {
    // Kiểm tra widget notes hiển thị
    await expect(page.getByRole('heading', { name: 'Ghi Chú Nhanh' })).toBeVisible();
    await expect(page.getByTestId('note-save-status')).toHaveText(/Đã lưu/i);

    // 1. Nhập nội dung Markdown vào Textarea
    const textarea = page.getByTestId('textarea-note-content');
    await textarea.fill('# Kế hoạch phát triển\n\n- [ ] Triển khai Notes\n- [x] Triển khai Tasks\n\n**An toàn tuyệt đối**\n\n<script>alert("xss")</script>');

    // Trạng thái chuyển sang Đang lưu... rồi trở lại Đã lưu
    await page.getByTestId('btn-save-note').click();
    await expect(page.getByTestId('note-save-status')).toHaveText(/Đã lưu/i);

    // 2. Chuyển sang Tab Xem trước (Preview)
    await page.getByTestId('tab-note-preview').click();
    const preview = page.getByTestId('markdown-preview-container');

    // Xác nhận render H1 và Strong
    await expect(preview.getByRole('heading', { name: 'Kế hoạch phát triển' })).toBeVisible();
    await expect(preview.getByText('An toàn tuyệt đối')).toBeVisible();

    // XÁC NHẬN AN TOÀN CHỐNG XSS: Script không thể thực thi và được escape thành &lt;script&gt;
    const innerHtml = await preview.innerHTML();
    expect(innerHtml).not.toContain('<script>');
    expect(innerHtml).toContain('&lt;script&gt;');

    // 3. Reload trang: Dữ liệu ghi chú vẫn tồn tại từ IndexedDB thật
    await page.reload();
    await expect(page.getByTestId('textarea-note-content')).toHaveValue(/# Kế hoạch phát triển/);
  });

  test('5. Đa tab đồng bộ: Tab 1 gắn task vào Timer -> Tab 2 cũng thấy task trên Timer', async ({ page, context }) => {
    // Tab 1 tạo task và gắn vào Timer
    await page.getByTestId('input-new-task').fill('Công việc đồng bộ 2 tab');
    await page.getByTestId('add-task-btn').click();
    await page.locator('button[data-testid^="link-task-btn-"]').first().click();
    await expect(page.getByTestId('linked-task-banner')).toContainText('Công việc đồng bộ 2 tab');

    // Mở Tab 2
    const page2 = await context.newPage();
    await page2.goto('/');

    // Tab 2 cũng nhận được thông tin task đang liên kết trên Timer
    await expect(page2.getByTestId('linked-task-banner')).toBeVisible();
    await expect(page2.getByTestId('linked-task-banner')).toContainText('Công việc đồng bộ 2 tab');

    await page2.close();
  });
});
