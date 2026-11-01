import { test, expect, chromium } from '@playwright/test';

const PROD_URL = 'https://pomodoro-workspace-three.vercel.app';
const ARTIFACT_DIR = 'C:/Users/Nam/.gemini/antigravity/brain/f0e4fa42-ea0b-4ff3-83da-6875921843c2';

test.describe('Live Production E2E Verification Suite', () => {
  test.setTimeout(120000); // 2 minutes for multi-browser and network handshakes

  test('Bài Test 1: WebRTC Full-Mesh 3 Client đồng thời trên Live Production', async () => {
    // Khởi chạy browser với cờ fake media stream cho WebRTC
    const browser = await chromium.launch({
      headless: true,
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });

    const roomId = 'pod-free-01';

    // 1. Tạo 3 context độc lập với quyền camera & microphone
    const context1 = await browser.newContext({
      permissions: ['camera', 'microphone'],
      viewport: { width: 1280, height: 720 }
    });
    const context2 = await browser.newContext({
      permissions: ['camera', 'microphone'],
      viewport: { width: 1280, height: 720 }
    });
    const context3 = await browser.newContext({
      permissions: ['camera', 'microphone'],
      viewport: { width: 1280, height: 720 }
    });

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    const page3 = await context3.newPage();

    // Helper: Vào phòng học và nhập tên hiển thị
    const joinRoom = async (page: any, participantName: string) => {
      await page.goto(`${PROD_URL}/rooms/${roomId}`);
      // Đợi trang nạp
      await page.waitForLoadState('networkidle');

      // Điền tên vào ô nhập tên
      const nameInput = page.locator('input[placeholder="Nhập tên hiển thị..."]');
      if (await nameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await nameInput.fill(participantName);
      }

      // Bấm nút tham gia phòng
      const joinBtn = page.getByTestId('btn-join-room-confirm');
      await expect(joinBtn).toBeVisible({ timeout: 10000 });
      await joinBtn.click();

      // Đợi vào trong phòng học (kiểm tra thanh compact bar hoặc nút mic)
      await expect(page.getByTestId('btn-room-mic')).toBeVisible({ timeout: 15000 });
    };

    console.log('-> Client 1 tham gia phòng...');
    await joinRoom(page1, 'Học Viên 1');

    console.log('-> Client 2 tham gia phòng...');
    await joinRoom(page2, 'Học Viên 2');

    console.log('-> Client 3 tham gia phòng...');
    await joinRoom(page3, 'Học Viên 3');

    // Chờ 6 giây để Supabase Realtime Broadcast & WebRTC bắt tay hoàn tất giữa 3 client
    await page1.waitForTimeout(6000);

    // KIỂM TRA TRÊN CLIENT 1:
    // Sĩ số 3 người: Kiểm tra lưới video hiển thị 3 tile (1 local + 2 peer)
    const localTile1 = page1.getByTestId('local-video-tile');
    await expect(localTile1).toBeVisible();

    const peerTiles1 = page1.locator('[data-testid^="peer-tile-"]');
    const peerCount1 = await peerTiles1.count();
    console.log(`Client 1 nhìn thấy ${peerCount1} peer tiles (tổng cộng ${peerCount1 + 1} thành viên)`);
    expect(peerCount1).toBeGreaterThanOrEqual(2);

    // KIỂM TRA TRÊN CLIENT 2:
    const localTile2 = page2.getByTestId('local-video-tile');
    await expect(localTile2).toBeVisible();
    const peerTiles2 = page2.locator('[data-testid^="peer-tile-"]');
    const peerCount2 = await peerTiles2.count();
    console.log(`Client 2 nhìn thấy ${peerCount2} peer tiles`);
    expect(peerCount2).toBeGreaterThanOrEqual(2);

    // KIỂM TRA TRÊN CLIENT 3:
    const localTile3 = page3.getByTestId('local-video-tile');
    await expect(localTile3).toBeVisible();
    const peerTiles3 = page3.locator('[data-testid^="peer-tile-"]');
    const peerCount3 = await peerTiles3.count();
    console.log(`Client 3 nhìn thấy ${peerCount3} peer tiles`);
    expect(peerCount3).toBeGreaterThanOrEqual(2);

    // Chụp 3 ảnh màn hình bằng chứng
    await page1.screenshot({ path: `${ARTIFACT_DIR}/proof-meet-3p-client1.png` });
    await page2.screenshot({ path: `${ARTIFACT_DIR}/proof-meet-3p-client2.png` });
    await page3.screenshot({ path: `${ARTIFACT_DIR}/proof-meet-3p-client3.png` });
    console.log('-> Đã lưu 3 ảnh chụp màn hình bằng chứng phòng 3 người!');

    // THỬ NGHIỆM CLIENT 3 RỜI PHÒNG:
    console.log('-> Client 3 rời phòng...');
    const leaveBtn3 = page3.getByTestId('btn-room-leave');
    await leaveBtn3.click();

    // Chờ sự kiện presence leave và WebRTC close được xử lý (Client 1 và Client 2 giảm đúng 1 người)
    await expect(page1.locator('[data-testid^="peer-tile-"]')).toHaveCount(peerCount1 - 1, { timeout: 10000 });
    await expect(page2.locator('[data-testid^="peer-tile-"]')).toHaveCount(peerCount2 - 1, { timeout: 10000 });

    const remainingPeers1 = await page1.locator('[data-testid^="peer-tile-"]').count();
    console.log(`Client 1 sau khi Client 3 rời: còn ${remainingPeers1} peer tile (tổng cộng ${remainingPeers1 + 1} người)`);

    // Chụp ảnh màn hình Client 1 sau khi co về 2 người
    await page1.screenshot({ path: `${ARTIFACT_DIR}/proof-meet-after-leave-client1.png` });

    // Dọn dẹp
    await context1.close();
    await context2.close();
    await context3.close();
    await browser.close();
  });

  test('Bài Test 2: Widget Media độc lập & Mini PiP trên Live Production', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${PROD_URL}/app`);
    await page.waitForLoadState('networkidle');

    // 1. Mở Media Widget từ DockBar
    const mediaDockBtn = page.getByTestId('dock-btn-media');
    await expect(mediaDockBtn).toBeVisible({ timeout: 10000 });
    await mediaDockBtn.click();

    // Đợi widget container Media mở
    const mediaContainer = page.getByTestId('widget-container-media');
    await expect(mediaContainer).toBeVisible({ timeout: 5000 });

    // Kiểm tra iframe YouTube xuất hiện chuẩn
    const mediaIframe = page.getByTestId('media-youtube-iframe');
    await expect(mediaIframe).toBeVisible({ timeout: 5000 });

    // Di chuyển Media sang bên phải (x: 880) để có không gian mở song song với Âm thanh
    const mediaHeader = mediaContainer.locator('[data-drag-handle="true"]');
    await mediaHeader.hover();
    await page.mouse.down();
    await page.mouse.move(920, 160);
    await page.mouse.up();
    await page.waitForTimeout(500);

    // Chụp ảnh bằng chứng Media mở rộng độc lập
    await page.screenshot({ path: `${ARTIFACT_DIR}/proof-media-expanded.png` });
    console.log('-> Đã lưu ảnh proof-media-expanded.png');

    // 2. Thu nhỏ MediaWidget thành Mini PiP (bấm nút collapse)
    const collapseBtn = page.getByTestId('collapse-widget-media');
    await expect(collapseBtn).toBeVisible();
    await collapseBtn.click();

    // Đợi hiệu ứng chuyển trạng thái
    await page.waitForTimeout(1000);

    // Kiểm tra bounding box của Media widget khi thu nhỏ
    const box = await mediaContainer.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      console.log(`Kích thước Media PiP: ${box.width}x${box.height}px`);
      // Kích thước chuẩn PiP ~320px width và ~216px height
      expect(box.width).toBeLessThanOrEqual(360);
      expect(box.width).toBeGreaterThanOrEqual(280);
      expect(box.height).toBeLessThanOrEqual(260);
      expect(box.height).toBeGreaterThanOrEqual(180);
    }

    // Chụp ảnh bằng chứng Mini PiP
    await page.screenshot({ path: `${ARTIFACT_DIR}/proof-media-pip.png` });
    console.log('-> Đã lưu ảnh proof-media-pip.png');

    // Mở lại to ra trước khi mở thêm Bảng Âm Thanh
    await collapseBtn.click();
    await page.waitForTimeout(500);

    // 3. Mở song song Bảng Âm Thanh & Chuông và MediaWidget
    const soundsDockBtn = page.getByTestId('dock-btn-sounds');
    await soundsDockBtn.click();

    const soundsContainer = page.getByTestId('widget-container-sounds');
    await expect(soundsContainer).toBeVisible({ timeout: 5000 });

    // Di chuyển Sounds sang vị trí thích hợp (x: 440)
    const soundsHeader = soundsContainer.locator('[data-drag-handle="true"]');
    await soundsHeader.hover();
    await page.mouse.down();
    await page.mouse.move(440, 120);
    await page.mouse.up();
    await page.waitForTimeout(1000);

    // Kiểm tra cả 2 widget đều visible và tách rời
    await expect(soundsContainer).toBeVisible();
    await expect(mediaContainer).toBeVisible();

    // Chụp ảnh bằng chứng cả Media và Sounds cùng mở độc lập, không che đè
    await page.screenshot({ path: `${ARTIFACT_DIR}/proof-media-and-sounds.png` });
    console.log('-> Đã lưu ảnh proof-media-and-sounds.png');
  });
});
