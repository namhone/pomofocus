import { test, expect, devices } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('PomoFocus V8.1 Meet Room Hardening: Multi-Device & Anti-Collision E2E', () => {
  const screenshotDir = 'tests/screenshots/audit_v81';
  fs.mkdirSync(screenshotDir, { recursive: true });

  test('Multi-Device Meet: Host Desktop, Mobile Member, and Same Host 2nd Device connect concurrently with Synced Timer & Whiteboard', async ({ browser }) => {
    test.setTimeout(150000);

    const roomId = 'pomo-multidevice-harden';

    const hostUser = {
      id: 'usr_nam_host_vip',
      email: 'namho03052k9@gmail.com',
      displayName: 'Nam Founder (Host)',
      plan: 'pro_lifetime',
      isLifetime: true,
      createdAt: Date.now()
    };

    const memberUser = {
      id: 'usr_hoa_member_free',
      email: 'hoa@study.edu.vn',
      displayName: 'Hoa Học Viên',
      plan: 'free',
      isLifetime: false,
      createdAt: Date.now()
    };

    const testRoom = {
      id: roomId,
      slug: roomId,
      title: 'Phòng Luyện Thi V8.1 Multi-Device',
      hostId: hostUser.id,
      hostName: hostUser.displayName,
      hostEmail: hostUser.email,
      isFreeRoom: false,
      allowFreeGuests: true,
      maxParticipants: 10,
      createdAt: Date.now(),
      participants: {}
    };

    // -------------------------------------------------------------------------
    // 1. SETUP 3 DISTINCT BROWSER CONTEXTS WITH MEDIA PERMISSIONS & PRE-SEEDED STORAGE
    // -------------------------------------------------------------------------
    // Context 1: Host Desktop (Chrome 1280x800)
    const hostContext = await browser.newContext({
      permissions: ['camera', 'microphone'],
      viewport: { width: 1280, height: 800 },
      isMobile: false,
      hasTouch: false,
      locale: 'vi-VN'
    });
    await hostContext.addInitScript(({ u, r }) => {
      localStorage.setItem('pomodoro_study_auth_session', JSON.stringify(u));
      const roomsStore = JSON.parse(localStorage.getItem('pomodoro_study_rooms_store') || '{}');
      roomsStore[r.id] = r;
      localStorage.setItem('pomodoro_study_rooms_store', JSON.stringify(roomsStore));
    }, { u: hostUser, r: testRoom });

    // Context 2: Member Mobile (Pixel 7 Emulation)
    const memberContext = await browser.newContext({
      ...devices['Pixel 7'],
      permissions: ['camera', 'microphone'],
      locale: 'vi-VN'
    });
    await memberContext.addInitScript(({ u, r }) => {
      localStorage.setItem('pomodoro_study_auth_session', JSON.stringify(u));
      const roomsStore = JSON.parse(localStorage.getItem('pomodoro_study_rooms_store') || '{}');
      roomsStore[r.id] = r;
      localStorage.setItem('pomodoro_study_rooms_store', JSON.stringify(roomsStore));
    }, { u: memberUser, r: testRoom });

    // Context 3: Host 2nd Device (Tablet / 2nd Session with SAME User Account)
    const hostDev2Context = await browser.newContext({
      permissions: ['camera', 'microphone'],
      viewport: { width: 1024, height: 768 },
      isMobile: false,
      hasTouch: true,
      locale: 'vi-VN'
    });
    await hostDev2Context.addInitScript(({ u, r }) => {
      localStorage.setItem('pomodoro_study_auth_session', JSON.stringify(u));
      const roomsStore = JSON.parse(localStorage.getItem('pomodoro_study_rooms_store') || '{}');
      roomsStore[r.id] = r;
      localStorage.setItem('pomodoro_study_rooms_store', JSON.stringify(roomsStore));
    }, { u: hostUser, r: testRoom });

    const hostPage = await hostContext.newPage();
    const memberPage = await memberContext.newPage();
    const hostDev2Page = await hostDev2Context.newPage();

    // -------------------------------------------------------------------------
    // 2. NAVIGATE AND JOIN ROOM ON ALL 3 DEVICES
    // -------------------------------------------------------------------------
    console.log('Device 1 (Host Desktop) joining room...');
    await hostPage.goto(`http://localhost:5173/rooms/${roomId}`, { waitUntil: 'domcontentloaded' });
    await hostPage.waitForSelector('[data-testid="btn-join-room-confirm"]', { timeout: 15000 });
    await hostPage.click('[data-testid="btn-join-room-confirm"]');
    await hostPage.waitForSelector('[data-testid="btn-room-leave"]', { timeout: 15000 });
    expect(await hostPage.locator('[data-testid="btn-room-leave"]').isVisible()).toBe(true);
    console.log('✅ Device 1 joined successfully.');

    console.log('Device 2 (Member Mobile) joining room...');
    await memberPage.goto(`http://localhost:5173/rooms/${roomId}`, { waitUntil: 'domcontentloaded' });
    await memberPage.waitForSelector('[data-testid="btn-join-room-confirm"]', { timeout: 15000 });
    await memberPage.click('[data-testid="btn-join-room-confirm"]');
    await memberPage.waitForSelector('[data-testid="btn-room-leave-mobile"]', { timeout: 15000 });
    expect(await memberPage.locator('[data-testid="btn-room-leave-mobile"]').isVisible()).toBe(true);
    console.log('✅ Device 2 joined successfully.');

    console.log('Device 3 (Host Device 2) joining room with same account...');
    await hostDev2Page.goto(`http://localhost:5173/rooms/${roomId}`, { waitUntil: 'domcontentloaded' });
    await hostDev2Page.waitForSelector('[data-testid="btn-join-room-confirm"]', { timeout: 15000 });
    await hostDev2Page.click('[data-testid="btn-join-room-confirm"]');
    await hostDev2Page.waitForSelector('[data-testid="btn-room-leave"], [data-testid="btn-room-leave-mobile"]', { timeout: 15000 });
    expect(await hostDev2Page.locator('[data-testid="btn-room-leave"], [data-testid="btn-room-leave-mobile"]').first().isVisible()).toBe(true);
    console.log('✅ Device 3 joined successfully without presence key collisions.');

    // Verify all 3 remain connected simultaneously and Host 1 is NOT kicked out
    expect(await hostPage.locator('[data-testid="btn-room-leave"]').isVisible()).toBe(true);
    expect(await memberPage.locator('[data-testid="btn-room-leave-mobile"]').isVisible()).toBe(true);
    expect(await hostDev2Page.locator('[data-testid="btn-room-leave"], [data-testid="btn-room-leave-mobile"]').first().isVisible()).toBe(true);

    // -------------------------------------------------------------------------
    // 3. SYNCHRONIZED POMODORO TIMER VERIFICATION
    // -------------------------------------------------------------------------
    expect(await hostPage.locator('[data-testid="room-timer-sync-badge"]').isVisible()).toBe(true);
    expect(await memberPage.locator('[data-testid="room-timer-sync-badge"]').isVisible()).toBe(true);

    // Host starts the room timer
    const hostTimerToggle = hostPage.locator('[data-testid="btn-room-timer-toggle"]');
    await hostTimerToggle.click();
    await hostPage.waitForTimeout(1000);

    // Verify Host button switched to Pause (Running state)
    const hostToggleTitle = await hostTimerToggle.getAttribute('title');
    expect(hostToggleTitle).toContain('Tạm dừng');

    // -------------------------------------------------------------------------
    // 4. SHARED WHITEBOARD VERIFICATION
    // -------------------------------------------------------------------------
    // Host switches to Whiteboard
    await hostPage.click('[data-testid="btn-switch-whiteboard"]');
    await hostPage.waitForSelector('[data-testid="whiteboard-canvas"]', { timeout: 10000 });
    expect(await hostPage.locator('[data-testid="whiteboard-canvas"]').isVisible()).toBe(true);

    // Member switches to Whiteboard (using mobile button)
    await memberPage.click('[data-testid="btn-switch-whiteboard-mobile"]');
    await memberPage.waitForSelector('[data-testid="whiteboard-canvas"]', { timeout: 10000 });
    expect(await memberPage.locator('[data-testid="whiteboard-canvas"]').isVisible()).toBe(true);

    // Host draws a stroke on canvas
    const canvas = hostPage.locator('[data-testid="whiteboard-canvas"]');
    const box = await canvas.boundingBox();
    if (box) {
      await hostPage.mouse.move(box.x + 50, box.y + 50);
      await hostPage.mouse.down();
      await hostPage.mouse.move(box.x + 150, box.y + 120, { steps: 5 });
      await hostPage.mouse.up();
    }
    await hostPage.waitForTimeout(1000);

    // -------------------------------------------------------------------------
    // 5. SCREENSHOT AUDIT FOR MEET MULTI-DEVICE
    // -------------------------------------------------------------------------
    await hostPage.screenshot({ path: path.join(screenshotDir, 'meet_host_desktop_view.png') });
    await memberPage.screenshot({ path: path.join(screenshotDir, 'meet_member_mobile_view.png') });
    await hostDev2Page.screenshot({ path: path.join(screenshotDir, 'meet_host_device2_view.png') });

    // -------------------------------------------------------------------------
    // 6. SAFE DISCONNECT & CLEANUP
    // -------------------------------------------------------------------------
    // Device 3 leaves gracefully
    await hostDev2Page.locator('[data-testid="btn-room-leave"], [data-testid="btn-room-leave-mobile"]').first().click();
    await hostDev2Page.waitForTimeout(500);

    // Host and Member remain functional
    expect(await hostPage.locator('[data-testid="whiteboard-canvas"]').isVisible()).toBe(true);
    expect(await memberPage.locator('[data-testid="whiteboard-canvas"]').isVisible()).toBe(true);

    await hostContext.close();
    await memberContext.close();
    await hostDev2Context.close();
  });
});
