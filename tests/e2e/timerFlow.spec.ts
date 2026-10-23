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

  test('1. Hiển thị giao diện Timer mặc định ở trạng thái IDLE', async ({ page }) => {
    await expect(page.getByTestId('timer-display')).toHaveText('25:00');
    await expect(page.getByTestId('status-indicator')).toHaveText(/idle/i);
    await expect(page.getByTestId('round-indicator')).toHaveText('Round 1 / 4');
    await expect(page.getByTestId('timer-start-btn')).toBeVisible();
  });

  test('2. Luồng thao tác click: Start -> Pause -> Resume -> Reset', async ({ page }) => {
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

  test('3. Điều khiển bằng phím tắt: Space (Start/Pause/Resume), R (Reset), S (Skip)', async ({ page }) => {
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

  test('4. Đồng bộ trạng thái và Session ID giữa 2 tabs thông qua BroadcastChannel & Web Locks', async ({ page, context }) => {
    // Đảm bảo Tab 1 đã mở và là Leader
    await expect(page.getByTestId('leader-indicator')).toHaveText(/👑 Leader Tab/);

    const page2 = await context.newPage();
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

  test('5. Leader Handoff: Khi Tab Leader đóng, Tab Follower tự động thăng cấp thành Leader', async ({ page, context }) => {
    // Tab 1 (page) đã mở sẵn từ beforeEach và xác nhận là Leader
    await expect(page.getByTestId('leader-indicator')).toHaveText(/👑 Leader Tab/);

    // Mở Tab 2 sau khi Tab 1 đã nắm giữ Leader Lock
    const page2 = await context.newPage();
    await page2.goto('/');

    // Tab 2 mở sau -> Chắc chắn là Follower
    await expect(page2.getByTestId('leader-indicator')).toHaveText(/👥 Follower Tab/);

    // Đóng Tab 1 (Leader)
    await page.close();

    // Tab 2 tự động được Web Locks cấp quyền và trở thành Leader mới
    await expect(page2.getByTestId('leader-indicator')).toHaveText(/👑 Leader Tab/);

    await page2.close();
  });

  test('6. Chống ghi trùng bản ghi trên IndexedDB thật khi cả hai tab cùng chạm deadline', async ({ page, context }) => {
    await expect(page.getByTestId('leader-indicator')).toHaveText(/👑 Leader Tab/);

    const page2 = await context.newPage();
    await page2.goto('/');

    // Cả 2 tab cấu hình Pomodoro 1 phút để test hoàn tất
    await page.getByTestId('input-pomodoro-min').fill('1');
    await page.getByTestId('input-pomodoro-min').dispatchEvent('change');
    await page2.reload();

    // Bấm Start ở tab 1
    await page.getByTestId('timer-start-btn').click();
    await expect(page.getByTestId('status-indicator')).toHaveText(/running/i);
    await expect(page2.getByTestId('status-indicator')).toHaveText(/running/i);

    // Tua deadline về quá khứ và kích hoạt ghi nhận phiên đồng thời trên cả hai tab
    await Promise.all([
      page.evaluate(async () => {
        const raw = localStorage.getItem('pomodoro_timer_runtime');
        if (raw) {
          const data = JSON.parse(raw);
          const { recordFocusSessionAtomic } = await import('/src/db/index.ts');
          return await recordFocusSessionAtomic({
            id: data.sessionId,
            phase: 'pomodoro',
            durationMinutes: 1,
            completedAt: Date.now(),
            dateString: '2026-10-23'
          });
        }
        return false;
      }),
      page2.evaluate(async () => {
        const raw = localStorage.getItem('pomodoro_timer_runtime');
        if (raw) {
          const data = JSON.parse(raw);
          const { recordFocusSessionAtomic } = await import('/src/db/index.ts');
          return await recordFocusSessionAtomic({
            id: data.sessionId,
            phase: 'pomodoro',
            durationMinutes: 1,
            completedAt: Date.now() + 10,
            dateString: '2026-10-23'
          });
        }
        return false;
      })
    ]);

    // Kiểm tra IndexedDB thật trên trình duyệt Chrome: Bảng focus_sessions chỉ có DUY NHẤT 1 RECORD!
    const sessionCount = await page.evaluate(async () => {
      const { db } = await import('/src/db/index.ts');
      return await db.focus_sessions.count();
    });

    expect(sessionCount).toBe(1);

    await page2.close();
  });

  test('7. Hai tab đồng thời gửi lệnh: Trạng thái cuối cùng hội tụ', async ({ page, context }) => {
    await expect(page.getByTestId('leader-indicator')).toHaveText(/👑 Leader Tab/);

    const page2 = await context.newPage();
    await page2.goto('/');
    await expect(page2.getByTestId('leader-indicator')).toHaveText(/👥 Follower Tab/);

    // Tab 1 bấm Start
    await page.getByTestId('timer-start-btn').click();
    await expect(page.getByTestId('status-indicator')).toHaveText(/running/i);
    await expect(page2.getByTestId('status-indicator')).toHaveText(/running/i);

    // Cả 2 tab cùng gửi phím Space
    await Promise.all([
      page.keyboard.press('Space'),
      page2.keyboard.press('Space')
    ]);

    // Trạng thái của cả 2 tab cuối cùng phải hội tụ về cùng một trạng thái (không bị split-brain)
    await page.waitForTimeout(500);
    const status1 = await page.getByTestId('status-indicator').innerText();
    const status2 = await page2.getByTestId('status-indicator').innerText();
    expect(status1).toBe(status2);

    await page2.close();
  });

  test('8. Mở tab mới sau khi timer đang chạy: Tab mới nhận đúng trạng thái hiện hành từ Leader', async ({ page, context }) => {
    await expect(page.getByTestId('leader-indicator')).toHaveText(/👑 Leader Tab/);

    // Tab 1 bấm Start
    await page.getByTestId('timer-start-btn').click();
    await expect(page.getByTestId('status-indicator')).toHaveText(/running/i);

    // Mở Tab 3 sau khi timer đã chạy
    const page3 = await context.newPage();
    await page3.goto('/');

    // Tab 3 tự động nhận diện là Follower và trạng thái là RUNNING
    await expect(page3.getByTestId('leader-indicator')).toHaveText(/👥 Follower Tab/);
    await expect(page3.getByTestId('status-indicator')).toHaveText(/running/i);

    await page3.close();
  });

  test('9. Fallback Mode: Hoạt động bền vững khi Web Locks không được hỗ trợ', async ({ page }) => {
    // Giả lập môi trường không có Web Locks API
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'locks', {
        get: () => undefined,
        configurable: true
      });
    });

    await page.goto('/');

    // Vẫn hiển thị giao diện bình thường và fallback xem mình là Leader
    await expect(page.getByTestId('timer-display')).toHaveText('25:00');
    await expect(page.getByTestId('status-indicator')).toHaveText(/idle/i);
    await expect(page.getByTestId('leader-indicator')).toHaveText(/👑 Leader Tab/);

    // Start và Pause vẫn hoạt động trơn tru
    await page.getByTestId('timer-start-btn').click();
    await expect(page.getByTestId('status-indicator')).toHaveText(/running/i);

    await page.getByTestId('timer-pause-btn').click();
    await expect(page.getByTestId('status-indicator')).toHaveText(/paused/i);

    await page.getByTestId('timer-reset-btn').click();
    await expect(page.getByTestId('status-indicator')).toHaveText(/idle/i);
  });
});
