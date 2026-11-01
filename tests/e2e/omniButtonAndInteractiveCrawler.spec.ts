import { test, expect } from '@playwright/test';

const TARGET_URL = process.env.BASE_URL || 'http://localhost:5173';

test.describe('OMNI-BUTTON & INTERACTIVE UI CRAWLER — 100% Interaction Audit', () => {

  // =========================================================================
  // 1. KIỂM THỬ THANH HEADER & LUỒNG XÁC THỰC
  // =========================================================================
  test('Mục 1: Thanh Header & Luồng Xác Thực (Auth Flow)', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !msg.text().includes('socket') && !msg.text().includes('Failed to fetch')) {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto(`${TARGET_URL}/app`);
    await page.waitForLoadState('domcontentloaded');

    // 1.1 Click các navigation link trên header
    const navItems = [
      { id: 'header-nav-app', name: 'Không Gian' },
      { id: 'header-nav-billing', name: 'Bảng Giá' },
      { id: 'header-nav-rooms', name: 'Phòng Học' },
      { id: 'header-nav-calendar', name: 'Lịch Biểu' },
      { id: 'header-nav-dashboard', name: 'Thống Kê' }
    ];

    for (const item of navItems) {
      const btn = page.locator(`[data-testid="${item.id}"]`);
      await btn.waitFor({ state: 'visible', timeout: 5000 });
      await btn.click();
      await page.waitForTimeout(200);
    }

    // 1.2 Bấm nút Đăng nhập
    await page.goto(`${TARGET_URL}/app`);
    const loginBtn = page.locator('[data-testid="header-login-btn"]');
    await loginBtn.waitFor({ state: 'visible', timeout: 5000 });
    await loginBtn.click();
    await page.waitForTimeout(300);
    expect(page.url()).toContain('/login');

    // 1.3 Mock đăng nhập để kiểm tra Dropdown Avatar & Xác nhận Đăng xuất
    await page.evaluate(() => {
      const mockUser = {
        id: 'crawler_tester_01',
        email: 'tester@pomofocus.vn',
        displayName: 'Học Viên VIP',
        authProvider: 'email',
        plan: 'pro'
      };
      sessionStorage.setItem('pomodoro_study_auth_session', JSON.stringify(mockUser));
      localStorage.setItem('pomodoro_study_auth_session', JSON.stringify(mockUser));
    });

    await page.goto(`${TARGET_URL}/app`);
    await page.waitForTimeout(400);

    // Mở Dropdown Avatar
    const avatarBtn = page.locator('[data-testid="header-user-avatar-btn"]');
    await avatarBtn.waitFor({ state: 'visible', timeout: 5000 });
    await avatarBtn.click();

    const dropdown = page.locator('[data-testid="header-user-dropdown"]');
    await expect(dropdown).toBeVisible({ timeout: 3000 });

    // Bấm nút Cài đặt trong dropdown
    const settingsBtn = page.locator('[data-testid="header-user-settings-btn"]');
    await settingsBtn.click();
    await page.waitForTimeout(200);

    // Mở lại avatar để test Đăng xuất
    await avatarBtn.click();
    const logoutBtn = page.locator('[data-testid="header-logout-btn"]');
    await logoutBtn.click();

    // Modal xác nhận xuất hiện
    const logoutModal = page.locator('[data-testid="confirm-logout-modal"]');
    await expect(logoutModal).toBeVisible({ timeout: 3000 });

    // Bấm Hủy (không thoát)
    const cancelBtn = page.locator('[data-testid="btn-cancel-logout"]');
    await cancelBtn.click();
    await expect(logoutModal).not.toBeVisible();

    // Bấm Đăng xuất thật
    await avatarBtn.click();
    await logoutBtn.click();
    const confirmLogoutBtn = page.locator('[data-testid="confirm-logout-btn"]');
    await confirmLogoutBtn.click();
    await page.waitForTimeout(400);

    // Avatar biến mất và nút Đăng nhập quay trở lại
    const loginBtnAfter = page.locator('[data-testid="header-login-btn"]');
    await expect(loginBtnAfter).toBeVisible({ timeout: 3000 });

    expect(consoleErrors.length).toBe(0);
  });

  // =========================================================================
  // 2. KIỂM THỬ WORKSPACE (`/app`) & TẤT CẢ WIDGETS
  // =========================================================================
  test('Mục 2: Workspace (/app) & Tất Cả Widgets', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !msg.text().includes('socket') && !msg.text().includes('Failed to fetch')) {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto(`${TARGET_URL}/app`);
    await page.waitForLoadState('domcontentloaded');

    // 2.1 Thanh Dock đáy: Bật/tắt các icons
    const dockButtons = [
      'dock-btn-timer',
      'dock-btn-tasks',
      'dock-btn-notes',
      'dock-btn-sounds',
      'dock-btn-media'
    ];

    for (const dockId of dockButtons) {
      const btn = page.locator(`[data-testid="${dockId}"]`);
      if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(100);
        await btn.click();
        await page.waitForTimeout(100);
      }
    }

    // Zen Mode: Bật rồi Thoát qua exit-zen-btn
    const zenBtn = page.locator('[data-testid="dock-btn-zen"]');
    if (await zenBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await zenBtn.click();
      await page.waitForTimeout(200);
      const exitZenBtn = page.locator('[data-testid="exit-zen-btn"]');
      if (await exitZenBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await exitZenBtn.click();
        await page.waitForTimeout(200);
      }
    }

    // 2.2 Pomodoro Widget: 3 tabs và điều khiển đếm giờ
    const tabShort = page.locator('[data-testid="tab-shortBreak"]');
    if (await tabShort.isVisible({ timeout: 2000 }).catch(() => false)) {
      await tabShort.click();
    }

    const tabLong = page.locator('[data-testid="tab-longBreak"]');
    if (await tabLong.isVisible({ timeout: 2000 }).catch(() => false)) {
      await tabLong.click();
    }

    const tabPomo = page.locator('[data-testid="tab-pomodoro"]');
    if (await tabPomo.isVisible({ timeout: 2000 }).catch(() => false)) {
      await tabPomo.click();
    }

    // Bắt đầu -> Tạm dừng -> Đặt lại -> Chuyển hiệp
    const startBtn = page.locator('[data-testid="timer-start-btn"]');
    if (await startBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await startBtn.click();
      await page.waitForTimeout(200);
    }

    const pauseBtn = page.locator('[data-testid="timer-pause-btn"]');
    if (await pauseBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await pauseBtn.click();
      await page.waitForTimeout(200);
    }

    const resetBtn = page.locator('[data-testid="timer-reset-btn"]');
    if (await resetBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await resetBtn.click();
      await page.waitForTimeout(200);
    }

    const skipBtn = page.locator('[data-testid="timer-skip-btn"]');
    if (await skipBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await skipBtn.click();
    }

    // 2.3 Tasks Widget: Thêm việc, checkbox hoàn thành, xóa việc
    const taskInput = page.locator('[data-testid="input-new-task"]');
    if (await taskInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await taskInput.fill('Viết unit test Playwright');
      const p1Btn = page.locator('[data-testid="priority-btn-P1"]');
      if (await p1Btn.isVisible().catch(() => false)) await p1Btn.click();

      const addBtn = page.locator('[data-testid="add-task-btn"]');
      await addBtn.click();
      await page.waitForTimeout(200);

      const toggleBtn = page.locator('[data-testid^="toggle-task-"]').first();
      if (await toggleBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await toggleBtn.click();
      }

      const deleteBtn = page.locator('[data-testid^="delete-task-btn-"]').first();
      if (await deleteBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await deleteBtn.click();
      }
    }

    // 2.4 Notes Widget
    const noteTextarea = page.locator('[data-testid="textarea-note-content"]');
    if (await noteTextarea.isVisible({ timeout: 2000 }).catch(() => false)) {
      await noteTextarea.fill('# Ghi chú bài học\nNội dung Markdown.');
      const previewTab = page.locator('[data-testid="tab-note-preview"]');
      if (await previewTab.isVisible().catch(() => false)) await previewTab.click();

      const editTab = page.locator('[data-testid="tab-note-edit"]');
      if (await editTab.isVisible().catch(() => false)) await editTab.click();

      const saveBtn = page.locator('[data-testid="btn-save-note"]');
      if (await saveBtn.isVisible().catch(() => false)) await saveBtn.click();
    }

    // 2.5 Audio Widget
    const muteBtn = page.locator('[data-testid="btn-toggle-mute"]');
    if (await muteBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await muteBtn.click();
      await page.waitForTimeout(100);
      await muteBtn.click();
    }

    const chimeTab = page.locator('[data-testid="tab-chime"]');
    if (await chimeTab.isVisible().catch(() => false)) {
      await chimeTab.click();
      const previewChime = page.locator('[data-testid="btn-preview-chime"]');
      if (await previewChime.isVisible().catch(() => false)) await previewChime.click();
    }

    expect(consoleErrors.length).toBe(0);
  });

  // =========================================================================
  // 3. KIỂM THỬ SẢNH PHÒNG HỌC (`/rooms`) & 10 PODS
  // =========================================================================
  test('Mục 3: Sảnh Phòng Học (/rooms) & 10 Pods', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !msg.text().includes('socket') && !msg.text().includes('Failed to fetch')) {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto(`${TARGET_URL}/rooms`);
    await page.waitForLoadState('domcontentloaded');

    // Kiểm tra ô nhập mã phòng
    const codeInput = page.locator('input[placeholder*="Mã phòng"]');
    const joinCodeBtn = page.locator('[data-testid="btn-join-room-code"]');
    if (await joinCodeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      if (await codeInput.isVisible().catch(() => false)) {
        await codeInput.fill('pod-free-01');
      }
    }

    // Kiểm tra 10 Pods
    for (let i = 1; i <= 10; i++) {
      const padNum = String(i).padStart(2, '0');
      const podId = `pod-free-${padNum}`;
      const podBtn = page.locator(`[data-testid="btn-join-${podId}"]`);
      await expect(podBtn).toBeVisible({ timeout: 3000 });
    }

    expect(consoleErrors.length).toBe(0);
  });

  // =========================================================================
  // 4. KIỂM THỬ MÀN HÌNH CHUẨN BỊ (PRE-JOIN)
  // =========================================================================
  test('Mục 4: Màn Hình Chuẩn Bị (Pre-Join)', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !msg.text().includes('socket') && !msg.text().includes('Failed to fetch')) {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto(`${TARGET_URL}/rooms/pod-free-01`);
    await page.waitForLoadState('domcontentloaded');

    // Toggle Mic & Camera
    const preMic = page.locator('[data-testid="btn-prejoin-mic"]');
    if (await preMic.isVisible({ timeout: 4000 }).catch(() => false)) {
      await preMic.click();
      await page.waitForTimeout(100);
      await preMic.click();
    }

    const preCam = page.locator('[data-testid="btn-prejoin-camera"]');
    if (await preCam.isVisible({ timeout: 4000 }).catch(() => false)) {
      await preCam.click();
      await page.waitForTimeout(100);
      await preCam.click();
    }

    // Sửa tên hiển thị
    const nameInput = page.locator('input[placeholder*="tên"]');
    if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await nameInput.fill('Học Viên Tiêu Biểu');
    }

    // Nút quay ra sảnh phòng
    const backBtn = page.locator('[data-testid="btn-prejoin-back"]');
    if (await backBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await backBtn.click();
      await page.waitForTimeout(300);
      expect(page.url()).toContain('/rooms');
    }

    // Vào lại và bấm Tham Gia
    await page.goto(`${TARGET_URL}/rooms/pod-free-01`);
    const joinConfirmBtn = page.locator('[data-testid="btn-join-room-confirm"]');
    await joinConfirmBtn.waitFor({ state: 'visible', timeout: 5000 });
    await joinConfirmBtn.click();
    await page.waitForTimeout(500);

    // Xác nhận đã vào phòng
    const compactBar = page.locator('[data-testid="room-compact"]');
    await expect(compactBar).toBeVisible({ timeout: 5000 });

    expect(consoleErrors.length).toBe(0);
  });

  // =========================================================================
  // 5. KIỂM THỬ TOÀN DIỆN TRONG PHÒNG HỌC MEET & WHITEBOARD
  // =========================================================================
  test('Mục 5: Toàn Diện Trong Phòng Học Meet & Whiteboard', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !msg.text().includes('socket') && !msg.text().includes('Failed to fetch')) {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto(`${TARGET_URL}/rooms/pod-free-02`);
    const joinConfirmBtn = page.locator('[data-testid="btn-join-room-confirm"]');
    await joinConfirmBtn.waitFor({ state: 'visible', timeout: 5000 });
    await joinConfirmBtn.click();
    await page.waitForTimeout(500);

    // 5.1 Header phòng
    const copyRoomBtn = page.locator('[data-testid="btn-copy-room-id"]');
    if (await copyRoomBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
      await copyRoomBtn.click();
    }

    // 5.2 Thanh dock điều khiển (Mic, Cam, Hand, Reactions, Chat)
    const micBtn = page.locator('[data-testid="btn-room-mic"]');
    if (await micBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await micBtn.click();
      await page.waitForTimeout(100);
      await micBtn.click();
    }

    const camBtn = page.locator('[data-testid="btn-room-camera"]');
    if (await camBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await camBtn.click();
      await page.waitForTimeout(100);
      await camBtn.click();
    }

    const handBtn = page.locator('[data-testid="btn-room-hand"]');
    if (await handBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await handBtn.click();
    }

    const reactBtn = page.locator('[data-testid="btn-room-reactions"]');
    if (await reactBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await reactBtn.click();
      await page.waitForTimeout(100);
    }

    // Chat Sidebar
    const chatBtn = page.locator('[data-testid="btn-room-chat"]');
    if (await chatBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await chatBtn.click();
      await page.waitForTimeout(200);

      const chatInput = page.locator('input[placeholder*="tin nhắn"]');
      if (await chatInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await chatInput.fill('Xin chào lớp học!');
        await page.keyboard.press('Enter');
      }

      const closeChatBtn = page.locator('[data-testid="btn-close-chat"]');
      if (await closeChatBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await closeChatBtn.click();
      }
    }

    // 5.3 Bảng Vẽ Chung (Whiteboard)
    const switchWbBtn = page.locator('[data-testid="btn-switch-whiteboard"]');
    if (await switchWbBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
      await switchWbBtn.click();
      await page.waitForTimeout(400);

      // Công cụ vẽ
      const tools = ['tool-pen', 'tool-highlighter', 'tool-eraser', 'tool-line', 'tool-arrow', 'tool-rect', 'tool-circle', 'tool-text'];
      for (const t of tools) {
        const toolBtn = page.locator(`[data-testid="${t}"]`);
        if (await toolBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await toolBtn.click();
        }
      }

      // Popover Nét & Màu
      const stylePopoverBtn = page.locator('[data-testid="btn-style-popover"]');
      if (await stylePopoverBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await stylePopoverBtn.click();
        await page.waitForTimeout(150);
        await stylePopoverBtn.click();
      }

      // Undo / Redo / Zoom
      const undoBtn = page.locator('[data-testid="btn-undo"]');
      if (await undoBtn.isVisible().catch(() => false) && await undoBtn.isEnabled().catch(() => false)) {
        await undoBtn.click();
      }

      const redoBtn = page.locator('[data-testid="btn-redo"]');
      if (await redoBtn.isVisible().catch(() => false) && await redoBtn.isEnabled().catch(() => false)) {
        await redoBtn.click();
      }

      const zoomIn = page.locator('[data-testid="btn-zoom-in"]');
      if (await zoomIn.isVisible().catch(() => false)) await zoomIn.click();

      const zoomOut = page.locator('[data-testid="btn-zoom-out"]');
      if (await zoomOut.isVisible().catch(() => false)) await zoomOut.click();

      const resetZoom = page.locator('[data-testid="btn-reset-zoom"]');
      if (await resetZoom.isVisible().catch(() => false)) await resetZoom.click();
    }

    expect(consoleErrors.length).toBe(0);
  });

  // =========================================================================
  // 6. KIỂM THỬ TRANG BẢNG GIÁ & MODAL VIETQR (`/billing`)
  // =========================================================================
  test('Mục 6: Trang Bảng Giá (/billing) & Modal VietQR', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !msg.text().includes('socket') && !msg.text().includes('Failed to fetch')) {
        consoleErrors.push(msg.text());
      }
    });

    // Mock API serverless cho môi trường dev local
    await page.route('**/api/momo/create-payment', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          orderId: 'POMO_668899',
          amount: 468000,
          memo: 'POMO 668899'
        })
      });
    });

    await page.goto(`${TARGET_URL}/billing`);
    await page.waitForLoadState('domcontentloaded');

    // 3 chu kỳ cước
    const monthly = page.locator('[data-testid="billing-cycle-monthly"]');
    await monthly.click();

    const yearly = page.locator('[data-testid="billing-cycle-yearly"]');
    await yearly.click();

    const lifetime = page.locator('[data-testid="billing-cycle-lifetime"]');
    await lifetime.click();

    // Bấm Nâng Cấp Ngay
    const payBtn = page.locator('[data-testid="btn-pay-momo"]');
    await payBtn.waitFor({ state: 'visible', timeout: 5000 });
    await payBtn.click();

    // Modal VietQR
    const modal = page.locator('[data-testid="momo-payment-modal"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Copy STK, Số tiền, Memo
    const copyStk = page.locator('[data-testid="btn-copy-stk"]');
    if (await copyStk.isVisible({ timeout: 2000 }).catch(() => false)) {
      await copyStk.click();
    }

    const copyAmount = page.locator('[data-testid="btn-copy-amount"]');
    if (await copyAmount.isVisible({ timeout: 2000 }).catch(() => false)) {
      await copyAmount.click();
    }

    const copyMemo = page.locator('[data-testid="btn-copy-momo-memo"]');
    if (await copyMemo.isVisible({ timeout: 2000 }).catch(() => false)) {
      await copyMemo.click();
    }

    // Nhập Coupon
    const couponInput = page.locator('[data-testid="input-coupon-code"]');
    if (await couponInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await couponInput.fill('PRO50');
      const applyBtn = page.locator('[data-testid="btn-apply-coupon"]');
      await applyBtn.click();
      await page.waitForTimeout(200);
    }

    // Đóng modal
    const closeModal = page.locator('[data-testid="btn-close-payment-modal"]');
    await closeModal.click();
    await expect(modal).not.toBeVisible();

    if (consoleErrors.length > 0) {
      console.log('Detected Console Errors in Billing Test:', JSON.stringify(consoleErrors, null, 2));
    }
    expect(consoleErrors.length).toBe(0);
  });

  // =========================================================================
  // 7. KIỂM THỬ LỊCH HỌC TIME-BLOCKING (`/calendar`)
  // =========================================================================
  test('Mục 7: Lịch Học Time-Blocking (/calendar)', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !msg.text().includes('socket') && !msg.text().includes('Failed to fetch')) {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto(`${TARGET_URL}/calendar`);
    await page.waitForLoadState('domcontentloaded');

    // Chế độ xem Ngày <-> Tuần
    const dayViewBtn = page.locator('[data-testid="calendar-view-day"]');
    await dayViewBtn.click();

    const weekViewBtn = page.locator('[data-testid="calendar-view-week"]');
    await weekViewBtn.click();

    // Điều hướng < Hôm nay >
    const prevBtn = page.locator('[data-testid="calendar-prev-btn"]');
    await prevBtn.click();

    const todayBtn = page.locator('[data-testid="calendar-today-btn"]');
    await todayBtn.click();

    const nextBtn = page.locator('[data-testid="calendar-next-btn"]');
    await nextBtn.click();

    // Thêm Lịch Học
    const addSchedBtn = page.locator('[data-testid="btn-add-schedule"]');
    await addSchedBtn.click();

    const titleInput = page.locator('[data-testid="input-schedule-title"]');
    await titleInput.waitFor({ state: 'visible', timeout: 3000 });
    await titleInput.fill('Chuyên đề WebRTC Full-Mesh & Supabase');

    const submitSchedBtn = page.locator('[data-testid="btn-submit-schedule"]');
    await submitSchedBtn.click();
    await page.waitForTimeout(400);

    // Chuyển sang xem Ngày để xóa lịch vừa tạo
    await dayViewBtn.click();
    await page.waitForTimeout(300);
    const deleteSchedBtn = page.locator('[data-testid="btn-delete-schedule"]').first();
    if (await deleteSchedBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await deleteSchedBtn.click();
    }

    expect(consoleErrors.length).toBe(0);
  });
});
