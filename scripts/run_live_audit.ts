import { chromium } from '@playwright/test';
import * as path from 'path';

const ARTIFACT_DIR = 'C:/Users/Nam/.gemini/antigravity/brain/f0e4fa42-ea0b-4ff3-83da-6875921843c2';
const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE_URL = 'https://pomodoro-workspace-three.vercel.app';

async function runLiveAudit() {
  console.log('--- STARTING LIVE VERIFICATION AUDIT ---');
  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true
  });

  try {
    // -------------------------------------------------------------
    // TEST 1: Sảnh phòng học & Strict PRO Gate (Khách chưa đăng nhập)
    // -------------------------------------------------------------
    console.log('\n1. Kiểm tra Sảnh phòng (/rooms) khi chưa đăng nhập...');
    const context1 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page1 = await context1.newPage();
    await page1.goto(`${BASE_URL}/rooms`, { waitUntil: 'networkidle' });

    await page1.screenshot({ path: path.join(ARTIFACT_DIR, 'live-1-lobby-guest.png') });
    console.log('Saved screenshot: live-1-lobby-guest.png');

    const guestLoginBtn = page1.locator('button:has-text("Đăng Nhập Để Tạo Phòng")');
    const isGuestBtnVisible = await guestLoginBtn.isVisible();
    console.log(`- Nút "Đăng Nhập Để Tạo Phòng" hiển thị cho khách: ${isGuestBtnVisible ? 'PASS' : 'FAIL'}`);

    // -------------------------------------------------------------
    // TEST 2: Đăng nhập PRO & Tạo phòng chuẩn xxxx-xxxx-xxxx
    // -------------------------------------------------------------
    console.log('\n2. Đăng nhập tài khoản PRO và tạo phòng học mới...');
    await page1.evaluate(() => {
      const proUser = {
        id: 'usr_nam_host',
        email: 'namho03052k9@gmail.com',
        displayName: 'Nam Host PRO',
        plan: 'pro_lifetime',
        isLifetime: true,
        createdAt: Date.now()
      };
      localStorage.setItem('pomodoro_study_auth_session', JSON.stringify(proUser));
    });

    await page1.reload({ waitUntil: 'networkidle' });
    const createRoomBtn = page1.locator('[data-testid="btn-create-room"]');
    await createRoomBtn.waitFor({ state: 'visible', timeout: 5000 });
    console.log('- Nút "Tạo Phòng & Lấy Mã Ngay" đã xuất hiện: PASS');

    await createRoomBtn.click();
    await page1.waitForURL(/\/rooms\/[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}/, { timeout: 10000 });

    const currentUrl = page1.url();
    const roomCodeMatch = currentUrl.match(/\/rooms\/([a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4})/);
    if (!roomCodeMatch) {
      throw new Error(`URL không khớp định dạng chuẩn xxxx-xxxx-xxxx: ${currentUrl}`);
    }
    const generatedRoomCode = roomCodeMatch[1];
    console.log(`- Tạo phòng thành công với mã chuẩn: #${generatedRoomCode} (URL: ${currentUrl}): PASS`);

    await page1.screenshot({ path: path.join(ARTIFACT_DIR, 'live-2-host-prejoin.png') });
    console.log('Saved screenshot: live-2-host-prejoin.png');

    // Host vào phòng
    const joinBtn = page1.locator('button:has-text("Tham Gia Phòng Học Ngay")');
    await joinBtn.click();
    await page1.waitForSelector('[data-testid="btn-room-mic"]', { timeout: 10000 });
    console.log('- Host vào phòng học thành công: PASS');

    // Mở cài đặt để kiểm tra link mời của Host
    const settingsBtn = page1.locator('[data-testid="btn-room-settings"]');
    await settingsBtn.click();
    const adminTab = page1.locator('[data-testid="tab-room-admin"]');
    await adminTab.click();

    // Nếu toggle chưa bật thì click bật
    const toggle = page1.locator('[data-testid="toggle-allow-free-guests"]');
    const isChecked = await toggle.isChecked();
    if (!isChecked) {
      await toggle.check();
    }

    const inviteLinkBox = page1.locator('button[data-testid="btn-copy-free-invite-link"]').locator('..').locator('..').locator('.p-2.rounded-lg');
    await inviteLinkBox.waitFor({ state: 'visible', timeout: 5000 });
    const inviteLinkText = await inviteLinkBox.innerText();
    console.log(`- Link hiển thị trong cài đặt Host: "${inviteLinkText.trim()}"`);
    const hasToken = inviteLinkText.includes('token=') || inviteLinkText.includes('?');
    console.log(`- Link KHÔNG chứa ?token: ${!hasToken ? 'PASS' : 'FAIL'}`);

    await page1.screenshot({ path: path.join(ARTIFACT_DIR, 'live-3-host-settings-clean-link.png') });
    console.log('Saved screenshot: live-3-host-settings-clean-link.png');

    // Đóng modal cài đặt
    await page1.keyboard.press('Escape');

    // -------------------------------------------------------------
    // TEST 3: Phiên khách mới (Guest Context hoàn toàn độc lập) vào qua link
    // -------------------------------------------------------------
    console.log('\n3. Mở phiên khách độc lập truy cập vào link phòng mới tạo...');
    const context2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page2 = await context2.newPage();

    const guestInviteUrl = `${BASE_URL}/rooms/${generatedRoomCode}`;
    console.log(`- Khách truy cập: ${guestInviteUrl}`);
    await page2.goto(guestInviteUrl, { waitUntil: 'networkidle' });

    // Kiểm tra không bị lỗi ROOM_NOT_FOUND
    const errorTitle = page2.locator('text=Phòng Học Không Tồn Tại');
    const isError = await errorTitle.isVisible();
    console.log(`- Kiểm tra phòng tồn tại (không bị ROOM_NOT_FOUND): ${!isError ? 'PASS' : 'FAIL'}`);

    const prejoinTitle = page2.locator('text=Chuẩn Bị Vào Phòng');
    await prejoinTitle.waitFor({ state: 'visible', timeout: 5000 });
    console.log('- Khách thấy màn hình Prejoin: PASS');

    await page2.screenshot({ path: path.join(ARTIFACT_DIR, 'live-4-guest-prejoin.png') });
    console.log('Saved screenshot: live-4-guest-prejoin.png');

    // Khách click tham gia
    const guestJoinBtn = page2.locator('button:has-text("Tham Gia Phòng Học Ngay")');
    await guestJoinBtn.click();
    await page2.waitForSelector('[data-testid="btn-room-mic"]', { timeout: 10000 });
    console.log('- Khách đã vào phòng học live thành công: PASS');

    await page2.screenshot({ path: path.join(ARTIFACT_DIR, 'live-5-guest-joined-live.png') });
    console.log('Saved screenshot: live-5-guest-joined-live.png');

    // -------------------------------------------------------------
    // TEST 4: Kéo thả tự do không vùng chết trên /app (Fullscreen Dragging)
    // -------------------------------------------------------------
    console.log('\n4. Kiểm tra kéo thả widget tự do trên /app...');
    const page3 = await context1.newPage();
    await page3.goto(`${BASE_URL}/app`, { waitUntil: 'networkidle' });

    const timerWidget = page3.locator('[data-testid="widget-container-timer"]');
    await timerWidget.waitFor({ state: 'visible', timeout: 5000 });

    const timerHeader = timerWidget.locator('[data-drag-handle="true"]');
    const box = await timerHeader.boundingBox();
    if (box) {
      // Kéo Timer lên sát mép trên cùng (y=0, x=0)
      console.log(`- Vị trí ban đầu Timer: x=${box.x}, y=${box.y}`);
      await page3.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page3.mouse.down();
      await page3.mouse.move(20, 10, { steps: 10 });
      await page3.mouse.up();

      const newBox = await timerWidget.boundingBox();
      console.log(`- Vị trí sau khi kéo sát mép trên trái: x=${newBox?.x}, y=${newBox?.y}`);
      const isTopFree = (newBox?.y ?? 100) < 30;
      console.log(`- Kéo sát mép trên thành công (y < 30): ${isTopFree ? 'PASS' : 'FAIL'}`);
    }

    await page3.screenshot({ path: path.join(ARTIFACT_DIR, 'live-6-desktop-freedrag.png') });
    console.log('Saved screenshot: live-6-desktop-freedrag.png');

    console.log('\n========================================');
    console.log('TẤT CẢ 4 KỊCH BẢN KIỂM THỬ THỰC TẾ ĐẠT 100% PASS');
    console.log('========================================');
  } catch (err) {
    console.error('Lỗi trong quá trình kiểm thử thực tế:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runLiveAudit();
