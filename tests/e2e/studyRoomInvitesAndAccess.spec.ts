import { test, expect } from '@playwright/test';

test.describe('Study Room Meet Invites, Free Guest Access & Security E2E Suite', () => {
  const artifactDir = 'C:/Users/Nam/.gemini/antigravity/brain/f0e4fa42-ea0b-4ff3-83da-6875921843c2';

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
    });
  });

  // TÌNH HUỐNG 1: Chủ phòng tạo phòng và sao chép mã/link
  test('Tình huống 1: Chủ phòng tạo phòng mới, nhận mã phòng duy nhất và sao chép link/mã', async ({ page }) => {
    // Đăng nhập tài khoản Owner/PRO
    await page.evaluate(() => {
      const ownerUser = {
        id: 'usr_nam_owner',
        email: 'namho03052k9@gmail.com',
        displayName: 'Chủ Sở Hữu Nam',
        plan: 'pro_lifetime',
        isLifetime: true,
        createdAt: Date.now()
      };
      localStorage.setItem('pomodoro_study_auth_session', JSON.stringify(ownerUser));
    });

    await page.goto('/rooms');
    await expect(page.locator('h1')).toContainText('Học Cùng Bạn Bè');

    // Nhập tên phòng và bấm "Tạo Phòng & Lấy Mã Ngay"
    const titleInput = page.getByPlaceholder(/Phòng của/);
    await titleInput.fill('Phòng Ôn Thi Toán Cao Cấp');
    await page.getByTestId('btn-create-room').click();

    // Điều hướng vào phòng mới với mã duy nhất pomo-xxxx-xxxx
    await page.waitForURL(/\/rooms\/pomo-/);
    const currentUrl = page.url();
    expect(currentUrl).toContain('/rooms/pomo-');

    // Màn hình chuẩn bị vào phòng: kiểm tra badge Chủ phòng và mã phòng
    await expect(page.getByText('CHỦ PHÒNG')).toBeVisible();
    const copyIdPrejoin = page.getByTestId('btn-copy-room-id-prejoin');
    await expect(copyIdPrejoin).toBeVisible();

    // Bấm vào phòng
    await page.getByTestId('btn-join-room-confirm').click();

    // Kiểm tra trong phòng học đang chạy:
    // Header có mã phòng và nút sao chép
    await expect(page.getByTestId('btn-copy-room-id')).toBeVisible();
    await expect(page.getByTestId('btn-copy-invite-link')).toBeVisible();

    await page.screenshot({ path: `${artifactDir}/meet-scenario1-created-room.png` });
  });

  // TÌNH HUỐNG 2: Tham gia phòng bằng mã phòng hoặc link mời
  test('Tình huống 2: Người dùng tham gia phòng bằng mã phòng tại Sảnh và qua link có token', async ({ page }) => {
    // 2.1 Tham gia qua link mời có token (ví dụ khách Free qua link)
    await page.goto('/rooms/room-alpha-1?token=tok_room_alpha_1_seed');
    await expect(page.getByText(/#room-alpha-1/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Tham Gia Phòng Học Ngay' })).toBeVisible();
    await page.getByRole('button', { name: 'Tham Gia Phòng Học Ngay' }).click();

    // Vào phòng thành công
    await expect(page.getByTestId('btn-room-mic')).toBeVisible();

    // 2.2 Thành viên PRO tham gia phòng bằng mã phòng tại Sảnh
    await page.evaluate(() => {
      const memberUser = {
        id: 'usr_pro_member',
        email: 'pro_member@example.com',
        displayName: 'Thành Viên Pro',
        plan: 'pro',
        createdAt: Date.now()
      };
      localStorage.setItem('pomodoro_study_auth_session', JSON.stringify(memberUser));
    });

    await page.goto('/rooms');
    const inputCode = page.getByPlaceholder(/vd: pomo-a1b2-c3d4/);
    await inputCode.fill('room-alpha-1');
    await page.getByTestId('btn-join-room-code').click();

    await page.waitForURL(/\/rooms\/room-alpha-1/);
    await expect(page.getByRole('button', { name: 'Tham Gia Phòng Học Ngay' })).toBeVisible();

    await page.screenshot({ path: `${artifactDir}/meet-scenario2-joined-by-code.png` });
  });

  // TÌNH HUỐNG 3: Tài khoản Free không thể tự bật quyền mời Free khi chưa đủ điều kiện
  test('Tình huống 3: Tài khoản Free hoặc gói khuyến mãi không thể bật quyền mời Free (khóa ở backend & UI)', async ({ page }) => {
    await page.evaluate(() => {
      const freeUser = {
        id: 'usr_free_tester',
        email: 'free_tester@example.com',
        displayName: 'Free Tester',
        plan: 'free',
        createdAt: Date.now()
      };
      localStorage.setItem('pomodoro_study_auth_session', JSON.stringify(freeUser));
    });

    await page.goto('/rooms');
    await page.getByTestId('btn-create-room').click();
    await page.waitForURL(/\/rooms\/pomo-/);

    await page.getByTestId('btn-join-room-confirm').click();

    // Mở Modal Cài Đặt Phòng
    await page.getByTestId('btn-room-settings').click();
    await page.getByTestId('tab-room-admin').click();

    // Kiểm tra trạng thái: CHƯA ĐỦ ĐIỀU KIỆN
    await expect(page.getByText('CHƯA ĐỦ ĐIỀU KIỆN')).toBeVisible();
    await expect(page.getByText(/Tài khoản Free không thể bật/)).toBeVisible();

    // Công tắc bị vô hiệu hóa (disabled)
    const toggle = page.getByTestId('toggle-allow-free-guests');
    await expect(toggle).toBeDisabled();

    await page.screenshot({ path: `${artifactDir}/meet-scenario3-free-user-disabled.png` });
  });

  // TÌNH HUỐNG 4: Tài khoản đủ điều kiện (>= 3 tháng trả phí hoặc Owner) có thể bật/tắt quyền mời Free
  test('Tình huống 4: Tài khoản đủ điều kiện có thể bật/tắt công tắc và nhận link mời có token', async ({ page }) => {
    await page.evaluate(() => {
      const yearlyUser = {
        id: 'usr_yearly_host',
        email: 'yearly_host@example.com',
        displayName: 'Yearly Host Pro',
        plan: 'pro',
        createdAt: Date.now(),
        proExpiresAt: Date.now() + 86400000 * 365
      };
      localStorage.setItem('pomodoro_study_auth_session', JSON.stringify(yearlyUser));

      // Giả lập đơn hàng MoMo 12 tháng đã đối soát thành công (Backend Verified)
      const orders = {
        SW_999888: {
          orderId: 'SW_999888',
          email: 'yearly_host@example.com',
          userId: 'usr_yearly_host',
          cycle: 'yearly',
          durationMonths: 12,
          amount: 468000,
          status: 'verified_paid',
          createdAt: Date.now(),
          expiresAt: Date.now() + 900000,
          paidAt: Date.now()
        }
      };
      localStorage.setItem('pomodoro_study_momo_orders', JSON.stringify(orders));
    });

    await page.goto('/rooms');
    await page.getByTestId('btn-create-room').click();
    await page.waitForURL(/\/rooms\/pomo-/);

    await page.getByTestId('btn-join-room-confirm').click();

    // Mở cài đặt phòng
    await page.getByTestId('btn-room-settings').click();
    await page.getByTestId('tab-room-admin').click();

    // Kiểm tra trạng thái: ĐỦ ĐIỀU KIỆN (≥ 3 THÁNG)
    await expect(page.getByText('ĐỦ ĐIỀU KIỆN (≥ 3 THÁNG)')).toBeVisible();

    // Bật công tắc mời Free
    const toggle = page.getByTestId('toggle-allow-free-guests');
    await expect(toggle).not.toBeDisabled();
    await toggle.setChecked(true, { force: true });

    // Hiển thị khung link mời với token bảo mật
    await expect(page.getByText('Liên Kết Mời Khách Free (Đang Hoạt Động)')).toBeVisible();
    await expect(page.getByTestId('btn-copy-free-invite-link')).toBeVisible();
    await expect(page.getByTestId('btn-revoke-invite-token')).toBeVisible();

    await page.screenshot({ path: `${artifactDir}/meet-scenario4-eligible-host-toggled.png` });
  });

  // TÌNH HUỐNG 5: Link bị thu hồi hoặc phòng đã đóng không thể tiếp tục tham gia
  test('Tình huống 5: Phòng đã đóng hoặc token bị thu hồi chặn truy cập với thông báo chuẩn', async ({ page }) => {
    // 5.1 Kiểm tra phòng đã đóng
    await page.goto('/rooms/room-closed-test');
    await expect(page.getByText('MÃ LỖI: ROOM_CLOSED')).toBeVisible();
    await expect(page.getByText('Phòng Học Đã Đóng')).toBeVisible();

    // 5.2 Kiểm tra phòng không tồn tại
    await page.goto('/rooms/room-random-non-existent-12345');
    await expect(page.getByText('MÃ LỖI: ROOM_NOT_FOUND')).toBeVisible();
    await expect(page.getByText('Phòng Học Không Tồn Tại')).toBeVisible();

    await page.screenshot({ path: `${artifactDir}/meet-scenario5-rejected-states.png` });
  });

  // TÌNH HUỐNG 6: Tài khoản giả mạo quyền thuê bao không thể vượt kiểm tra backend
  test('Tình huống 6: Giả mạo plan: pro ở client bị Backend từ chối kích hoạt quyền mời Free', async ({ page }) => {
    await page.evaluate(() => {
      const fakeHacker = {
        id: 'usr_hacker_client_edit',
        email: 'hacker@blackhat.com',
        displayName: 'Attacker Client Tamper',
        plan: 'pro',
        createdAt: Date.now()
      };
      localStorage.setItem('pomodoro_study_auth_session', JSON.stringify(fakeHacker));
    });

    await page.goto('/rooms');
    await page.getByTestId('btn-create-room').click();
    await page.waitForURL(/\/rooms\/pomo-/);
    await page.getByTestId('btn-join-room-confirm').click();

    await page.getByTestId('btn-room-settings').click();
    await page.getByTestId('tab-room-admin').click();

    // Bị chặn vì không có hồ sơ đối soát
    await expect(page.getByText('CHƯA ĐỦ ĐIỀU KIỆN')).toBeVisible();
    await expect(page.getByText(/Không tìm thấy hồ sơ giao dịch trả phí hợp lệ/)).toBeVisible();
    await expect(page.getByTestId('toggle-allow-free-guests')).toBeDisabled();

    await page.screenshot({ path: `${artifactDir}/meet-scenario6-fake-pro-defense.png` });
  });

  // TÌNH HUỐNG 7: Kiểm thử giao diện trên mobile và desktop không tràn hoặc che thanh điều khiển
  test('Tình huống 7: Kiểm thử giao diện Mobile (390px) và Desktop (1280px) mượt mà, không tràn', async ({ page }) => {
    // 7.1 Mobile 390x844
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/rooms/room-alpha-1?token=tok_room_alpha_1_seed');

    await page.getByRole('button', { name: 'Tham Gia Phòng Học Ngay' }).click();

    // Thanh điều khiển #room-compact hiển thị gọn gàng
    const roomCompact = page.locator('#room-compact');
    await expect(roomCompact).toBeVisible();

    // Đảm bảo không tràn màn hình
    const isOverflowing = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(isOverflowing).toBe(false);

    // Nút copy link mobile hiển thị và bấm được
    const copyLinkMobile = page.getByTestId('btn-copy-invite-link-mobile');
    await expect(copyLinkMobile).toBeVisible();

    await page.screenshot({ path: `${artifactDir}/meet-scenario7-mobile-390.png` });

    // 7.2 Desktop 1280x800
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/rooms/room-alpha-1?token=tok_room_alpha_1_seed');
    await page.getByRole('button', { name: 'Tham Gia Phòng Học Ngay' }).click();

    await expect(page.getByTestId('btn-copy-room-id')).toBeVisible();
    await expect(page.getByTestId('btn-copy-invite-link')).toBeVisible();
    await expect(page.locator('aside')).toBeVisible();

    await page.screenshot({ path: `${artifactDir}/meet-scenario7-desktop-1280.png` });
  });
});
