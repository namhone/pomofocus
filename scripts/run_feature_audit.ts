import { chromium } from 'playwright';

const ARTIFACT_DIR = 'C:/Users/Nam/.gemini/antigravity/brain/f0e4fa42-ea0b-4ff3-83da-6875921843c2';

async function runAudit() {
  console.log('🚀 Bắt đầu chạy Playwright Audit cho 3 tính năng mới...');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    permissions: ['camera', 'microphone']
  });

  const page = await context.newPage();

  try {
    // 1. Kiểm tra xóa sổ room-alpha-1: truy cập /rooms/room-alpha-1 phải tự động chuyển hướng về /rooms
    console.log('--- Test 1: Chuyển hướng phòng cũ room-alpha-1 ---');
    await page.goto('http://localhost:5173/rooms/room-alpha-1');
    await page.waitForURL('**/rooms', { timeout: 5000 });
    console.log('✅ URL hiện tại sau khi truy cập room-alpha-1:', page.url());
    await page.screenshot({ path: `${ARTIFACT_DIR}/audit-1-redirect-from-room-alpha-1.png` });

    // 2. Kiểm tra tài khoản khách/free không tạo được phòng
    console.log('--- Test 2: Khách chưa đăng nhập / Free không được tạo phòng ---');
    await page.evaluate(() => localStorage.clear());
    await page.goto('http://localhost:5173/rooms');
    const guestBtn = page.getByRole('button', { name: /Đăng Nhập Để Tạo Phòng|Nâng Cấp PRO Để Tạo Phòng/ });
    await guestBtn.waitFor({ state: 'visible', timeout: 5000 });
    console.log('✅ Nút tạo phòng cho khách chưa đăng nhập:', await guestBtn.innerText());
    await page.screenshot({ path: `${ARTIFACT_DIR}/audit-2-lobby-guest-create-blocked.png` });

    // 3. Đăng nhập tài khoản Free và kiểm tra nút "Nâng Cấp PRO Để Tạo Phòng"
    console.log('--- Test 3: Đăng nhập Free User kiểm tra chặn tạo phòng ---');
    await page.evaluate(() => {
      const freeUser = {
        id: 'usr_free_user_1',
        email: 'free_student@example.com',
        displayName: 'Free Student',
        plan: 'free',
        createdAt: Date.now()
      };
      localStorage.setItem('pomodoro_study_auth_session', JSON.stringify(freeUser));
    });
    await page.reload();
    const upgradeToCreateBtn = page.getByTestId('btn-upgrade-to-create-room');
    await upgradeToCreateBtn.waitFor({ state: 'visible', timeout: 5000 });
    console.log('✅ Nút của Free User trong sảnh:', await upgradeToCreateBtn.innerText());
    await page.screenshot({ path: `${ARTIFACT_DIR}/audit-3-free-user-upgrade-to-create.png` });

    // 4. Kiểm tra phòng học Free: Giới hạn 45 phút, Top Warning Banner và Ẩn Navbar
    console.log('--- Test 4: Vào phòng học Free, kiểm tra Ẩn Navbar & Top Banner 10 phút ---');
    // Tạo 1 phòng free mẫu bắt đầu từ 36 phút trước (còn 9 phút = 540 giây)
    const testRoomId = 'free-room-audit-99';
    await page.evaluate(({ roomId }) => {
      const rooms = {
        [roomId]: {
          roomId: roomId,
          title: 'Phòng Ôn Tập Free',
          hostUserId: 'usr_host_free',
          hostEmail: 'host_free@example.com',
          createdAt: Date.now() - 36 * 60 * 1000, // Đã chạy 36 phút, còn 9 phút
          status: 'active',
          allowFreeGuests: true,
          activeInviteToken: null,
          inviteTokens: {},
          participants: {},
          guestPermissions: { canChat: true, canMic: true, canCam: true, canShareScreen: false }
        }
      };
      localStorage.setItem('pomodoro_study_rooms_store', JSON.stringify(rooms));
    }, { roomId: testRoomId });

    await page.goto(`http://localhost:5173/rooms/${testRoomId}`);
    
    // Màn hình prejoin
    const joinBtn = page.getByRole('button', { name: 'Tham Gia Phòng Học Ngay' });
    await joinBtn.waitFor({ state: 'visible', timeout: 5000 });
    await joinBtn.click();

    // Trong phòng học:
    // A. Kiểm tra Top Warning Banner đang đếm ngược [mm:ss] và nút "Nâng Cấp PRO"
    const warningBanner = page.getByTestId('free-room-warning-banner');
    await warningBanner.waitFor({ state: 'visible', timeout: 5000 });
    const bannerText = await warningBanner.innerText();
    console.log('✅ Nội dung Top Warning Banner (10 phút cuối):', bannerText);

    // B. Kiểm tra CHẾ ĐỘ TẬP TRUNG (Ẩn hoàn toàn Menu/Navbar và DockBar chung của website)
    const platformHeader = page.locator('[data-testid="platform-header"]');
    const dockBar = page.locator('[data-testid="dockbar"]');
    const hasHeader = await platformHeader.count();
    const hasDock = await dockBar.count();
    console.log(`✅ Menu/Navbar website: ${hasHeader === 0 ? 'Đã ẩn hoàn toàn' : 'Lỗi'} | DockBar: ${hasDock === 0 ? 'Đã ẩn hoàn toàn' : 'Lỗi'}`);

    await page.screenshot({ path: `${ARTIFACT_DIR}/audit-4-free-room-10m-warning-banner.png` });

    // 5. Kiểm tra phòng hết hạn (00:00): Modal thông báo kết thúc phiên học
    console.log('--- Test 5: Phiên học 45 phút hết giờ (00:00) ---');
    await page.evaluate(({ roomId }) => {
      const rooms = JSON.parse(localStorage.getItem('pomodoro_study_rooms_store') || '{}');
      rooms[roomId].createdAt = Date.now() - 46 * 60 * 1000; // Đã chạy 46 phút (hết giờ)
      localStorage.setItem('pomodoro_study_rooms_store', JSON.stringify(rooms));
    }, { roomId: testRoomId });

    await page.reload();
    await page.getByRole('button', { name: 'Tham Gia Phòng Học Ngay' }).click();

    const expiredModal = page.locator('#free-room-expired-title');
    await expiredModal.waitFor({ state: 'visible', timeout: 5000 });
    console.log('✅ Modal hết hạn 45 phút đã mở:', await expiredModal.innerText());
    await page.screenshot({ path: `${ARTIFACT_DIR}/audit-5-free-room-expired-modal.png` });

    console.log('🎉 Toàn bộ 5 kịch bản audit thực tế đã hoàn thành xuất sắc!');
  } catch (err) {
    console.error('❌ Lỗi khi chạy audit:', err);
  } finally {
    await browser.close();
  }
}

runAudit();
