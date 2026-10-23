import { test, expect } from '@playwright/test';

test.describe('Core Timer Engine E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Xoá localStorage và IndexedDB trước mỗi test để đảm bảo trạng thái sạch
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

  test('Hiển thị giao diện Timer mặc định ở trạng thái IDLE', async ({ page }) => {
    await expect(page.getByTestId('timer-display')).toHaveText('25:00');
    await expect(page.getByTestId('status-indicator')).toHaveText(/idle/i);
    await expect(page.getByTestId('round-indicator')).toHaveText('Round 1 / 4');
    await expect(page.getByTestId('timer-start-btn')).toBeVisible();
  });

  test('Luồng thao tác click: Start -> Pause -> Resume -> Reset', async ({ page }) => {
    // 1. Click Start
    await page.getByTestId('timer-start-btn').click();
    await expect(page.getByTestId('status-indicator')).toHaveText(/running/i);
    await expect(page.getByTestId('timer-pause-btn')).toBeVisible();

    // 2. Chờ 1.2s để timer giảm ít nhất 1 giây
    await page.waitForTimeout(1200);
    const timeRunning = await page.getByTestId('timer-display').innerText();
    expect(timeRunning).not.toBe('25:00');

    // 3. Click Pause
    await page.getByTestId('timer-pause-btn').click();
    await expect(page.getByTestId('status-indicator')).toHaveText(/paused/i);
    await expect(page.getByTestId('timer-resume-btn')).toBeVisible();

    // 4. Click Resume
    await page.getByTestId('timer-resume-btn').click();
    await expect(page.getByTestId('status-indicator')).toHaveText(/running/i);

    // 5. Click Reset
    await page.getByTestId('timer-reset-btn').click();
    await expect(page.getByTestId('status-indicator')).toHaveText(/idle/i);
    await expect(page.getByTestId('timer-display')).toHaveText('25:00');
    await expect(page.getByTestId('timer-start-btn')).toBeVisible();
  });

  test('Điều khiển bằng phím tắt: Space (Start/Pause/Resume), R (Reset), S (Skip)', async ({ page }) => {
    // Click vào trang để nhận focus sự kiện bàn phím
    await page.locator('body').click();

    // 1. Phím Space để Start
    await page.keyboard.press('Space');
    await expect(page.getByTestId('status-indicator')).toHaveText(/running/i);

    // 2. Phím Space để Pause
    await page.keyboard.press('Space');
    await expect(page.getByTestId('status-indicator')).toHaveText(/paused/i);

    // 3. Phím Space để Resume
    await page.keyboard.press('Space');
    await expect(page.getByTestId('status-indicator')).toHaveText(/running/i);

    // 4. Phím R để Reset
    await page.keyboard.press('r');
    await expect(page.getByTestId('status-indicator')).toHaveText(/idle/i);
    await expect(page.getByTestId('timer-display')).toHaveText('25:00');

    // 5. Phím S để Skip sang Short Break
    await page.keyboard.press('s');
    await expect(page.getByTestId('status-indicator')).toHaveText(/idle/i);
    await expect(page.getByTestId('timer-display')).toHaveText('05:00');

    // 6. Phím S lần nữa để Skip sang Pomodoro Round 2
    await page.keyboard.press('s');
    await expect(page.getByTestId('timer-display')).toHaveText('25:00');
    await expect(page.getByTestId('round-indicator')).toHaveText('Round 2 / 4');
  });

  test('Đồng bộ trạng thái và Session ID giữa 2 tabs thông qua BroadcastChannel & Web Locks', async ({ page, context }) => {
    const page2 = await context.newPage();

    await page.goto('/');
    await page2.goto('/');

    // Đợi cả 2 tab sẵn sàng
    await expect(page.getByTestId('timer-display')).toHaveText('25:00');
    await expect(page2.getByTestId('timer-display')).toHaveText('25:00');

    // Tab 1 bấm Start
    await page.getByTestId('timer-start-btn').click();

    // Cả tab 1 và tab 2 đều chuyển sang RUNNING
    await expect(page.getByTestId('status-indicator')).toHaveText(/running/i);
    await expect(page2.getByTestId('status-indicator')).toHaveText(/running/i);

    // XÁC MINH CẢ 2 TAB DÙNG CHUNG SESSION ID TRONG LOCALSTORAGE
    const session1 = await page.evaluate(() => {
      const raw = localStorage.getItem('pomodoro_timer_runtime');
      return raw ? JSON.parse(raw).sessionId : null;
    });
    const session2 = await page2.evaluate(() => {
      const raw = localStorage.getItem('pomodoro_timer_runtime');
      return raw ? JSON.parse(raw).sessionId : null;
    });
    expect(session1).toBeTruthy();
    expect(session1).toBe(session2);

    // Tab 2 bấm Pause
    await page2.getByTestId('timer-pause-btn').click();

    // Cả tab 1 và tab 2 đều chuyển sang PAUSED
    await expect(page.getByTestId('status-indicator')).toHaveText(/paused/i);
    await expect(page2.getByTestId('status-indicator')).toHaveText(/paused/i);

    // Tab 1 bấm Reset
    await page.getByTestId('timer-reset-btn').click();
    await expect(page.getByTestId('status-indicator')).toHaveText(/idle/i);
    await expect(page2.getByTestId('status-indicator')).toHaveText(/idle/i);
    await expect(page.getByTestId('timer-display')).toHaveText('25:00');
    await expect(page2.getByTestId('timer-display')).toHaveText('25:00');

    await page2.close();
  });

  test('Leader Handoff: Khi Tab Leader đóng, Tab Follower tự động thăng cấp thành Leader', async ({ page, context }) => {
    const page2 = await context.newPage();

    await page.goto('/');
    await page2.goto('/');

    // Tab 1 (page) mở trước -> Leader
    await expect(page.getByTestId('leader-indicator')).toHaveText(/👑 Leader Tab/);
    // Tab 2 mở sau -> Follower
    await expect(page2.getByTestId('leader-indicator')).toHaveText(/👥 Follower Tab/);

    // Đóng Tab 1 (Leader)
    await page.close();

    // Tab 2 tự động được Web Locks cấp quyền và trở thành Leader mới
    await expect(page2.getByTestId('leader-indicator')).toHaveText(/👑 Leader Tab/);

    await page2.close();
  });
});
