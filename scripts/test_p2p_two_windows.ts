import { chromium } from 'playwright';

const ARTIFACT_DIR = 'C:/Users/Nam/.gemini/antigravity/brain/f0e4fa42-ea0b-4ff3-83da-6875921843c2';

async function testP2PTwoWindows() {
  console.log('🚀 Bắt đầu kiểm thử P2P Video Grid với 2 cửa sổ độc lập...');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });

  try {
    const roomId = 'pomo-p2p-test88';

    // 1. Tạo Context 1: Chủ phòng (Host)
    console.log('[Step 1] Khởi tạo cửa sổ 1 (Chủ phòng)...');
    const context1 = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      permissions: ['camera', 'microphone']
    });
    const page1 = await context1.newPage();

    const hostUser = {
      id: 'usr_p2p_host_1',
      email: 'namho03052k9@gmail.com',
      displayName: 'Chủ Phòng Nam',
      plan: 'pro_lifetime',
      isLifetime: true,
      createdAt: Date.now()
    };

    await page1.goto('http://127.0.0.1:5173/');
    await page1.evaluate((u) => {
      localStorage.setItem('pomodoro_study_auth_session', JSON.stringify(u));
    }, hostUser);

    console.log(`[Step 2] Chủ phòng vào link: http://127.0.0.1:5173/rooms/${roomId}`);
    await page1.goto(`http://127.0.0.1:5173/rooms/${roomId}`);

    const joinBtn1 = page1.getByRole('button', { name: /Tham Gia Phòng Học Ngay/ });
    await joinBtn1.waitFor({ state: 'visible', timeout: 5000 });
    await joinBtn1.click();
    console.log('✅ Chủ phòng đã vào phòng học!');
    await page1.waitForTimeout(1000);

    // 2. Tạo Context 2: Bạn học thứ 2
    console.log('[Step 3] Khởi tạo cửa sổ 2 (Bạn học)...');
    const context2 = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      permissions: ['camera', 'microphone']
    });
    const page2 = await context2.newPage();

    console.log(`[Step 4] Bạn học vào link: http://127.0.0.1:5173/rooms/${roomId}`);
    await page2.goto(`http://127.0.0.1:5173/rooms/${roomId}`);

    const nameInput = page2.getByPlaceholder(/Tên của bạn/);
    if (await nameInput.isVisible()) {
      await nameInput.fill('Bạn Học Linh');
    }
    const joinBtn2 = page2.getByRole('button', { name: /Tham Gia Phòng Học Ngay/ });
    await joinBtn2.waitFor({ state: 'visible', timeout: 5000 });
    await joinBtn2.click();
    console.log('✅ Bạn học Linh đã vào phòng học!');

    // Chờ 3 giây để đồng bộ danh sách thành viên và WebRTC
    console.log('[Step 5] Đợi đồng bộ Video Grid giữa 2 cửa sổ...');
    await page1.waitForTimeout(3000);
    await page2.waitForTimeout(3000);

    // 3. KIỂM TRA PHÍA CHỦ PHÒNG (PAGE 1)
    console.log('--- Kiểm tra kết quả Cửa sổ 1 (Chủ phòng) ---');
    const page1Tiles = await page1.locator('.grid > div.relative.aspect-video').count();
    console.log(`✅ Số thẻ Video trên màn hình Chủ phòng: ${page1Tiles} (Kỳ vọng: 2)`);

    const hasPeerOnPage1 = await page1.getByText('Bạn Học Linh').count();
    console.log(`✅ Thẻ của 'Bạn Học Linh' hiển thị trên Chủ phòng: ${hasPeerOnPage1 > 0}`);
    await page1.screenshot({ path: `${ARTIFACT_DIR}/p2p-proof-window1-host-view.png` });

    // 4. KIỂM TRA PHÍA BẠN HỌC (PAGE 2)
    console.log('--- Kiểm tra kết quả Cửa sổ 2 (Bạn học) ---');
    const page2Tiles = await page2.locator('.grid > div.relative.aspect-video').count();
    console.log(`✅ Số thẻ Video trên màn hình Bạn học: ${page2Tiles} (Kỳ vọng: 2)`);

    const hasHostOnPage2 = await page2.getByText('Chủ Phòng Nam').count();
    console.log(`✅ Thẻ của 'Chủ Phòng Nam' hiển thị trên Bạn học: ${hasHostOnPage2 > 0}`);
    await page2.screenshot({ path: `${ARTIFACT_DIR}/p2p-proof-window2-guest-view.png` });

    if (page1Tiles >= 2 && page2Tiles >= 2) {
      console.log('🎉 XÁC NHẬN: Cả 2 cửa sổ đều hiển thị rõ ràng 2 khung hình (ô của mình + ô của người kia)!');
    } else {
      console.warn('⚠️ Số lượng thẻ video chưa đạt 2 trên cả 2 màn hình.');
    }
  } catch (err) {
    console.error('❌ Lỗi kiểm thử:', err);
  } finally {
    await browser.close();
  }
}

testP2PTwoWindows();
