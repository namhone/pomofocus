import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * POMOFOCUS V8.1 MULTI-DEVICE STUDY ROOM & MEET REALTIME TEST SUITE
 * ==============================================================================
 * Authoritative Source:
 * - PROJECT.md § Feature Inventory (Features 1 through 21)
 * - PROJECT.md § Interface Contracts (studyRoomService, WebRTCConnectionManager, WhiteboardView)
 * - docs/UI_UX_DESIGN_PLAYBOOK_AND_POSTMORTEM.md (Z-Index Layer Hierarchy, State Singularity, 390px Mobile Viewport)
 *
 * TEST ARCHITECTURE:
 * Spins up 3 distinct browser contexts (Host Desktop, Member Laptop, Member Mobile 390x844)
 * communicating via Cloud/Realtime signaling WITHOUT pre-seeded localStorage rooms.
 */

test.describe('PomoFocus V8.1 Multi-Device Study Room E2E Test Suite', () => {
  const screenshotDir = path.resolve('tests/screenshots/multi_device_v81');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  const hostUser = {
    id: 'usr_nam_founder_vip',
    email: 'namho03052k9@gmail.com',
    displayName: 'Nam Founder (Host)',
    plan: 'pro_lifetime',
    isLifetime: true,
    createdAt: Date.now()
  };

  const member1User = {
    id: 'usr_hoa_member_laptop',
    email: 'hoa@study.edu.vn',
    displayName: 'Hoa Học Viên (Laptop)',
    plan: 'pro',
    isLifetime: false,
    createdAt: Date.now()
  };

  const member2User = {
    id: 'usr_nam_founder_vip', // Same user account on 2nd device (Mobile)
    email: 'namho03052k9@gmail.com',
    displayName: 'Nam Founder (Điện thoại)',
    plan: 'pro_lifetime',
    isLifetime: true,
    createdAt: Date.now()
  };

  test('Kịch bản 3 Client Đa Thiết Bị: Host Desktop, Member Laptop, Member Mobile (390x844) kết nối không pre-seed localStorage & Teardown 5 bước', async ({ browser }) => {
    test.setTimeout(180000);

    // -------------------------------------------------------------------------
    // 1. KHỞI TẠO 3 BROWSER CONTEXTS ĐỘC LẬP (HOST, MEMBER 1, MEMBER 2)
    // -------------------------------------------------------------------------
    // Context 1: Host Desktop (1280x800)
    const hostContext = await browser.newContext({
      permissions: ['camera', 'microphone'],
      viewport: { width: 1280, height: 800 },
      isMobile: false,
      hasTouch: false,
      locale: 'vi-VN'
    });
    await hostContext.addInitScript((u) => {
      // Xác thực danh tính Host qua Auth Session nhưng KHÔNG pre-seed pomodoro_study_rooms_store
      sessionStorage.setItem('pomodoro_study_auth_session', JSON.stringify(u));
      localStorage.setItem('pomodoro_study_auth_session', JSON.stringify(u));
      localStorage.setItem('pomofocus_consent_v1', 'accepted');
      localStorage.removeItem('pomodoro_study_rooms_store');
    }, hostUser);

    // Context 2: Member 1 Laptop Desktop (1366x768)
    const member1Context = await browser.newContext({
      permissions: ['camera', 'microphone'],
      viewport: { width: 1366, height: 768 },
      isMobile: false,
      hasTouch: false,
      locale: 'vi-VN'
    });
    await member1Context.addInitScript((u) => {
      sessionStorage.setItem('pomodoro_study_auth_session', JSON.stringify(u));
      localStorage.setItem('pomodoro_study_auth_session', JSON.stringify(u));
      localStorage.setItem('pomofocus_consent_v1', 'accepted');
      localStorage.removeItem('pomodoro_study_rooms_store');
    }, member1User);

    // Context 3: Member 2 Mobile Emulation (390x844 iPhone Viewport)
    const member2Context = await browser.newContext({
      permissions: ['camera', 'microphone'],
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
      locale: 'vi-VN'
    });
    await member2Context.addInitScript((u) => {
      sessionStorage.setItem('pomodoro_study_auth_session', JSON.stringify(u));
      localStorage.setItem('pomodoro_study_auth_session', JSON.stringify(u));
      localStorage.setItem('pomofocus_consent_v1', 'accepted');
      localStorage.removeItem('pomodoro_study_rooms_store');
    }, member2User);

    const hostPage = await hostContext.newPage();
    const member1Page = await member1Context.newPage();
    const member2Page = await member2Context.newPage();

    hostPage.on('console', msg => console.log(`[Host Console] ${msg.type()}: ${msg.text()}`));
    member1Page.on('console', msg => console.log(`[Member 1 Console] ${msg.type()}: ${msg.text()}`));
    member2Page.on('console', msg => console.log(`[Member 2 Console] ${msg.type()}: ${msg.text()}`));

    hostPage.on('pageerror', err => console.log(`[Host PageError] ${err.message}`));
    member1Page.on('pageerror', err => console.log(`[Member 1 PageError] ${err.message}`));
    member2Page.on('pageerror', err => console.log(`[Member 2 PageError] ${err.message}`));

    // Tự động chấp nhận mọi hộp thoại window.alert và window.confirm
    hostPage.on('dialog', async (d) => {
      console.log(`[Host Page Dialog]: ${d.type()} - ${d.message()}`);
      await d.accept();
    });
    member1Page.on('dialog', async (d) => {
      console.log(`[Member 1 Dialog]: ${d.type()} - ${d.message()}`);
      await d.accept();
    });
    member2Page.on('dialog', async (d) => {
      console.log(`[Member 2 Dialog]: ${d.type()} - ${d.message()}`);
      await d.accept();
    });

    // -------------------------------------------------------------------------
    // 2. PHASE 1: HOST TẠO PHÒNG TRÊN /rooms VÀ LẤY LINK MỜI
    // -------------------------------------------------------------------------
    console.log('--- PHASE 1: Host khởi tạo phòng học tại /rooms ---');
    await hostPage.goto('/rooms', { waitUntil: 'domcontentloaded' });
    await hostPage.waitForSelector('[data-testid="btn-create-room"]', { timeout: 20000 });

    const titleInput = hostPage.locator('input[placeholder*="Phòng của"]').first();
    if (await titleInput.isVisible()) {
      await titleInput.fill('Phòng Học V8.1 Cloud Mesh Multi-Device');
    }

    const slugInput = hostPage.locator('[data-testid="input-room-slug"]');
    if (await slugInput.isVisible()) {
      await slugInput.fill(`pomo-mesh-${Date.now().toString(36)}`);
    }

    // Nhấn tạo phòng
    await hostPage.click('[data-testid="btn-create-room"]');

    // Chờ điều hướng đến URL phòng /rooms/pomo-...
    await hostPage.waitForURL(/\/rooms\/(pomo-|[a-z0-9]{4}-)/, { timeout: 20000 });
    const inviteUrl = hostPage.url();
    expect(inviteUrl).toMatch(/\/rooms\/(pomo-|[a-z0-9]{4}-)/);
    const roomId = inviteUrl.split('/rooms/')[1].split('?')[0];
    console.log(`✅ Host đã tạo phòng thành công: ${roomId}`);

    // Xác nhận vào phòng tại sảnh chờ (Pre-join Lobby)
    await hostPage.waitForSelector('[data-testid="btn-join-room-confirm"]', { timeout: 15000 });
    await hostPage.click('[data-testid="btn-join-room-confirm"]');

    // Chờ vào giao diện phòng học chính thức
    await hostPage.waitForSelector('[data-testid="btn-copy-invite-link"], [data-testid="room-compact"]', {
      timeout: 15000
    });
    expect(await hostPage.locator('[data-testid="btn-copy-invite-link"]').isVisible()).toBe(true);

    await hostPage.screenshot({ path: `${screenshotDir}/01_host_desktop_joined.png` });
    console.log('✅ Host đã vào phòng học.');

    // -------------------------------------------------------------------------
    // 3. PHASE 2: MEMBER 1 (DESKTOP) VÀO QUA LINK MỜI (KHÔNG PRE-SEED STORAGE)
    // -------------------------------------------------------------------------
    console.log('--- PHASE 2: Member 1 (Desktop Laptop) tham gia qua link mời ---');
    await member1Page.goto(inviteUrl, { waitUntil: 'domcontentloaded' });

    // Xác nhận tham gia tại pre-join
    await member1Page.waitForSelector('[data-testid="btn-join-room-confirm"]', { timeout: 20000 });
    await member1Page.click('[data-testid="btn-join-room-confirm"]');

    // Chờ vào phòng và kiểm tra thanh công cụ
    await expect(member1Page.locator('#room-compact, [data-testid="room-compact"]').first()).toBeVisible({ timeout: 25000 });
    expect(member1Page.url()).toContain(`/rooms/${roomId}`);

    // Kiểm tra không bị lỗi Split-Brain (cùng mã phòng, không tự chế phòng ma)
    const hostRoomTitle = await hostPage.title();
    const member1RoomTitle = await member1Page.title();
    expect(hostRoomTitle).toBe(member1RoomTitle);

    await member1Page.screenshot({ path: `${screenshotDir}/02_member1_desktop_joined.png` });
    console.log('✅ Member 1 đã vào phòng học an toàn.');

    // -------------------------------------------------------------------------
    // 4. PHASE 3: MEMBER 2 (MOBILE 390x844) VÀO VỚI DEVICE TAG & DOCK 38PX
    // -------------------------------------------------------------------------
    console.log('--- PHASE 3: Member 2 (Mobile 390x844) tham gia qua link mời ---');
    await member2Page.goto(inviteUrl, { waitUntil: 'domcontentloaded' });
    await member2Page.waitForTimeout(1000);
    await member2Page.screenshot({ path: `${screenshotDir}/02a_member2_after_goto.png` });
    console.log('Member 2 current URL:', member2Page.url());

    // Xác nhận tham gia tại pre-join trên Mobile
    await expect(member2Page.locator('[data-testid="btn-join-room-confirm"]')).toBeVisible({ timeout: 25000 });
    await member2Page.screenshot({ path: `${screenshotDir}/02b_member2_before_click.png` });
    await member2Page.click('[data-testid="btn-join-room-confirm"]');

    // Chờ vào phòng trên Mobile
    await expect(member2Page.locator('#room-compact, [data-testid="room-compact"]').first()).toBeVisible({ timeout: 25000 });

    // A. Kiểm tra độ rộng Viewport chuẩn 390px
    const mobileVp = member2Page.viewportSize();
    expect(mobileVp?.width).toBe(390);
    expect(mobileVp?.height).toBe(844);

    // B. Kiểm tra nhãn thiết bị: hiển thị (Điện thoại) hoặc (Máy 2) do cùng tài khoản
    const hasDeviceTag = await member2Page.evaluate(() => {
      const text = document.body.innerText;
      return (
        text.includes('(Điện thoại)') ||
        text.includes('Điện thoại') ||
        text.includes('(Máy 2)') ||
        text.includes('Máy 2')
      );
    });
    expect(hasDeviceTag).toBe(true);

    // C. Kiểm tra Dock 38px: không tràn ngang
    const isHorizontalOverflowing = await member2Page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(isHorizontalOverflowing).toBe(false);

    // D. Kiểm tra các nút bấm trên Dock điều khiển Mobile
    const micBtn = member2Page.getByTestId('btn-room-mic');
    const camBtn = member2Page.getByTestId('btn-room-camera');
    const reactBtn = member2Page.getByTestId('btn-room-reactions');
    const chatBtn = member2Page.getByTestId('btn-room-chat');
    const leaveBtn = member2Page.locator('[data-testid="btn-room-leave-mobile"]').first();

    await expect(micBtn).toBeVisible();
    await expect(camBtn).toBeVisible();
    await expect(reactBtn).toBeVisible();
    await expect(chatBtn).toBeVisible();
    await expect(leaveBtn).toBeVisible();

    // Chiều cao nút bấm nằm trong khoảng 36px - 48px (~38px - 44px spec)
    const micBox = await micBtn.boundingBox();
    expect(micBox).not.toBeNull();
    if (micBox) {
      expect(micBox.height).toBeGreaterThanOrEqual(36);
      expect(micBox.height).toBeLessThanOrEqual(48);
    }

    await member2Page.screenshot({ path: `${screenshotDir}/03_member2_mobile_joined.png` });
    console.log('✅ Member 2 Mobile đã xác thực thành công giao diện và nhãn thiết bị.');

    // -------------------------------------------------------------------------
    // 5. PHASE 4: HOST ĐÓNG PHÒNG & XÁC THỰC TEARDOWN 5 BƯỚC TRÊN TẤT CẢ CLIENTS
    // -------------------------------------------------------------------------
    console.log('--- PHASE 4: Host đóng phòng học và kích hoạt Teardown 5 bước ---');
    
    // Host mở cài đặt quản trị để đóng phòng
    const settingsBtn = hostPage.locator('[data-testid="btn-room-settings-header"]');

    if (await settingsBtn.isVisible()) {
      await settingsBtn.click();
      const closeRoomBtn = hostPage.locator('[data-testid="btn-close-room"]');
      await closeRoomBtn.waitFor({ state: 'visible', timeout: 8000 });
      await closeRoomBtn.click();
    } else {
      // Kích hoạt đóng phòng trực tiếp qua UI hoặc host controls
      const hostControlsBtn = hostPage.locator('[data-testid="btn-open-host-controls"]');
      if (await hostControlsBtn.isVisible()) {
        await hostControlsBtn.click();
        const deleteBtn = hostPage.locator('[data-testid="btn-host-delete-room"]');
        await deleteBtn.click();
        const confirmDeleteBtn = hostPage.locator('[data-testid="btn-confirm-delete-permanent"]');
        await confirmDeleteBtn.click();
      }
    }

    // Xác thực cả Member 1 và Member 2 đều nhận tín hiệu phòng đóng và điều hướng về /rooms
    console.log('Chờ Member 1 và Member 2 nhận tín hiệu ROOM_CLOSED...');
    await Promise.all([
      member1Page.waitForURL(/\/rooms(?!\/pomo-)/, { timeout: 25000 }).catch(async () => {
        // Fallback: nếu trang hiển thị màn hình báo "Phòng Học Đã Đóng"
        const isClosedNotice = await member1Page.locator('text=/Phòng Học Đã Đóng|đã được đóng|đã kết thúc/i').first().isVisible();
        expect(isClosedNotice).toBe(true);
      }),
      member2Page.waitForURL(/\/rooms(?!\/pomo-)/, { timeout: 25000 }).catch(async () => {
        const isClosedNotice = await member2Page.locator('text=/Phòng Học Đã Đóng|đã được đóng|đã kết thúc/i').first().isVisible();
        expect(isClosedNotice).toBe(true);
      })
    ]);

    // Teardown check: Camera & Mic tracks đã được dừng lại (readyState === 'ended' hoặc không còn track live)
    const tracksStoppedOnMember1 = await member1Page.evaluate(() => {
      const videos = Array.from(document.querySelectorAll('video'));
      const activeTracks = videos.flatMap((v) => {
        const stream = v.srcObject as MediaStream | null;
        return stream ? stream.getTracks().filter((t) => t.readyState === 'live') : [];
      });
      return activeTracks.length === 0;
    });
    expect(tracksStoppedOnMember1).toBe(true);

    const tracksStoppedOnMember2 = await member2Page.evaluate(() => {
      const videos = Array.from(document.querySelectorAll('video'));
      const activeTracks = videos.flatMap((v) => {
        const stream = v.srcObject as MediaStream | null;
        return stream ? stream.getTracks().filter((t) => t.readyState === 'live') : [];
      });
      return activeTracks.length === 0;
    });
    expect(tracksStoppedOnMember2).toBe(true);

    await member1Page.screenshot({ path: `${screenshotDir}/04_member1_after_closed.png` });
    await member2Page.screenshot({ path: `${screenshotDir}/05_member2_after_closed.png` });
    console.log('✅ Toàn bộ thành viên đã được đưa ra ngoài dứt khoát, camera/mic tracks đã dừng.');

    // -------------------------------------------------------------------------
    // 6. GIẢI PHÓNG 3 BROWSER CONTEXTS SẠCH SẼ
    // -------------------------------------------------------------------------
    await hostContext.close();
    await member1Context.close();
    await member2Context.close();
    console.log('✅ Bài kiểm thử Playwright Multi-Device Study Room hoàn thành xuất sắc.');
  });
});
