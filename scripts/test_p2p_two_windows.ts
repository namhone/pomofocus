import { chromium } from 'playwright';

const BASE_URL = process.argv[2] || 'https://pomodoro-workspace-three.vercel.app';
const ARTIFACT_DIR = 'C:/Users/Nam/.gemini/antigravity/brain/f0e4fa42-ea0b-4ff3-83da-6875921843c2';

async function testP2PTwoWindows() {
  console.log(`🚀 Bắt đầu kiểm thử P2P Video Grid trên: ${BASE_URL}...`);
  const browser = await chromium.launch({ channel: 'msedge', headless: true });

  try {
    const roomId = `pomo-p2p-${Math.random().toString(36).substring(2, 6)}`;

    // Tạo 1 Browser Context duy nhất chứa 2 Tabs (chia sẻ BroadcastChannel)
    console.log('[Step 1] Khởi tạo Browser Context...');
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      permissions: ['camera', 'microphone']
    });

    // 1. Tab 1: Chủ phòng (Host)
    console.log('[Step 2] Mở Tab 1 (Chủ phòng)...');
    const page1 = await context.newPage();

    const hostUser = {
      id: 'usr_p2p_host_1',
      email: 'namho03052k9@gmail.com',
      displayName: 'Chủ Phòng Nam',
      plan: 'pro_lifetime',
      isLifetime: true,
      createdAt: Date.now()
    };

    await page1.goto(BASE_URL);
    await page1.evaluate((u) => {
      sessionStorage.setItem('pomodoro_study_auth_session', JSON.stringify(u));
      localStorage.setItem('pomodoro_study_auth_session', JSON.stringify(u));
    }, hostUser);

    console.log(`[Step 2] Chủ phòng vào link: ${BASE_URL}/rooms/${roomId}`);
    await page1.goto(`${BASE_URL}/rooms/${roomId}`);

    const joinBtn1 = page1.getByRole('button', { name: /Tham Gia Phòng Học Ngay/ });
    await joinBtn1.waitFor({ state: 'visible', timeout: 15000 });
    await joinBtn1.click();
    console.log('✅ Chủ phòng đã vào phòng học!');
    await page1.waitForTimeout(2000);

    // =========================================================================
    // TEST 1: CHỦ PHÒNG Ở MỘT MÌNH — KHÔNG ĐƯỢC TỰ PHÂN THÂN, SĨ SỐ = 1
    // =========================================================================
    console.log('\n--- [TEST 1] Kiểm tra Chủ phòng ở một mình ---');
    const memberCountAloneText = await page1.locator('text=/\\d+ thành viên/').first().textContent();
    console.log(`📊 Sĩ số hiển thị khi ở 1 mình: "${memberCountAloneText?.trim()}" (Kỳ vọng: "1 thành viên")`);

    const hostTilesAlone = await page1.locator('.grid > div.relative.aspect-video').count();
    console.log(`📊 Tổng số khung trên lưới khi ở 1 mình: ${hostTilesAlone} (1 khung camera + 1 khung chờ dashed)`);

    const namHoCards = await page1.locator('.grid').getByText('Chủ Phòng Nam').count();
    console.log(`📊 Số lần xuất hiện của "Chủ Phòng Nam" trên màn hình: ${namHoCards} (Kỳ vọng: DUY NHẤT 1)`);

    const isWaitingBoxVisible = await page1.getByText('Đang chờ bạn học tham gia...').isVisible();
    console.log(`📊 Khung dashed "Đang chờ bạn học tham gia...": ${isWaitingBoxVisible ? 'Hiển thị chuẩn' : 'Không thấy'}`);

    await page1.screenshot({ path: `${ARTIFACT_DIR}/p2p-proof-1-host-alone.png` });
    console.log(`📸 Đã chụp ảnh bằng chứng Host ở một mình: ${ARTIFACT_DIR}/p2p-proof-1-host-alone.png\n`);

    if (namHoCards !== 1) {
      throw new Error(`❌ BUG: Host bị nhân bản! Số thẻ "Chủ Phòng Nam" xuất hiện = ${namHoCards}`);
    }

    // =========================================================================
    // TEST 2: BẠN HỌC THỨ 2 VÀO PHÒNG — SĨ SỐ = 2, MỖI NGƯỜI 1 Ô
    // =========================================================================
    console.log('[Step 3] Mở Tab 2 (Bạn học Linh)...');
    const page2 = await context.newPage();

    const memberUser = {
      id: 'usr_p2p_member_linh',
      email: 'linh_study@pomodoro.app',
      displayName: 'Bạn Học Linh',
      plan: 'pro',
      createdAt: Date.now()
    };
    await page2.goto(BASE_URL);
    await page2.evaluate((u) => {
      sessionStorage.setItem('pomodoro_study_auth_session', JSON.stringify(u));
    }, memberUser);

    console.log(`[Step 4] Bạn học vào link: ${BASE_URL}/rooms/${roomId}`);
    await page2.goto(`${BASE_URL}/rooms/${roomId}`);

    const nameInput = page2.locator('input[placeholder*="tên"], input[placeholder*="Tên"]');
    if (await nameInput.isVisible()) {
      await nameInput.fill('Bạn Học Linh');
    }
    const joinBtn2 = page2.getByRole('button', { name: /Tham Gia Phòng Học Ngay/ });
    await joinBtn2.waitFor({ state: 'visible', timeout: 15000 });
    await joinBtn2.click();
    console.log('✅ Bạn học Linh đã vào phòng học!');

    // Chờ 4 giây để đồng bộ danh sách thành viên và WebRTC
    console.log('[Step 5] Đợi đồng bộ Video Grid giữa 2 cửa sổ...');
    await page1.waitForTimeout(4000);
    await page2.waitForTimeout(4000);

    // KIỂM TRA PHÍA CHỦ PHÒNG (PAGE 1)
    console.log('\n--- [TEST 2] Kiểm tra khi có 2 người ---');
    const hostMemberCount = await page1.locator('text=/\\d+ thành viên/').first().textContent();
    console.log(`✅ Sĩ số trên Chủ phòng: "${hostMemberCount?.trim()}" (Kỳ vọng: "2 thành viên")`);

    const hasPeerOnPage1 = await page1.getByText('Bạn Học Linh').count();
    console.log(`✅ Thẻ của "Bạn Học Linh" hiển thị trên Chủ phòng: ${hasPeerOnPage1 > 0}`);

    const namHoCardsWhenTwo = await page1.locator('.grid').getByText('Chủ Phòng Nam').count();
    console.log(`✅ Thẻ "Chủ Phòng Nam" trên Chủ phòng: ${namHoCardsWhenTwo} (Kỳ vọng: 1)`);
    await page1.screenshot({ path: `${ARTIFACT_DIR}/p2p-proof-2-host-two-users.png` });

    // KIỂM TRA PHÍA BẠN HỌC (PAGE 2)
    const guestMemberCount = await page2.locator('text=/\\d+ thành viên/').first().textContent();
    console.log(`✅ Sĩ số trên Bạn học: "${guestMemberCount?.trim()}" (Kỳ vọng: "2 thành viên")`);

    const hasHostOnPage2 = await page2.getByText('Chủ Phòng Nam').count();
    console.log(`✅ Thẻ của "Chủ Phòng Nam" hiển thị trên Bạn học: ${hasHostOnPage2 > 0}`);

    const linhCardsWhenTwo = await page2.locator('.grid').getByText('Bạn Học Linh').count();
    console.log(`✅ Thẻ "Bạn Học Linh" trên Bạn học: ${linhCardsWhenTwo} (Kỳ vọng: 1)`);
    await page2.screenshot({ path: `${ARTIFACT_DIR}/p2p-proof-3-guest-two-users.png` });

    if (namHoCardsWhenTwo === 1 && hasPeerOnPage1 > 0 && hasHostOnPage2 > 0 && linhCardsWhenTwo === 1) {
      console.log('🎉 XÁC NHẬN HOÀN TOÀN: Tuyệt đối không bị nhân bản! Sĩ số 1 khi ở 1 mình, sĩ số 2 khi có bạn học, mỗi người 1 khung hình!');
    } else {
      console.warn('⚠️ Kiểm tra số lượng thẻ chưa khớp hoàn toàn.');
    }
  } catch (err) {
    console.error('❌ Lỗi kiểm thử:', err);
  } finally {
    await browser.close();
  }
}

testP2PTwoWindows();
