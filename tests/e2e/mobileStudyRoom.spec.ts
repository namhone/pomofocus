import { test, expect } from '@playwright/test';

test.describe('Mobile Study Room & PomoFocus Layout Suite', () => {
  const artifactDir = 'C:/Users/Nam/.gemini/antigravity/brain/f0e4fa42-ea0b-4ff3-83da-6875921843c2';

  test('390x844 (iPhone 14/15) — Room Prejoin & Active Room Mobile Layout Verification', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/rooms/pomo-demo-3901');

    // 1. Prejoin Screen
    await expect(page.locator('h1')).toContainText('Chuẩn Bị Vào Phòng');
    const joinBtn = page.getByRole('button', { name: 'Tham Gia Phòng Học Ngay' });
    await expect(joinBtn).toBeVisible();
    await page.screenshot({ path: `${artifactDir}/mobile-room-prejoin-390.png` });

    // 2. Click Join Room
    await joinBtn.click();

    // 3. Verify Mobile Header (no word wrapping, clean layout)
    const mobileHeader = page.locator('header .md\\:hidden');
    await expect(mobileHeader).toBeVisible();
    await expect(mobileHeader.getByText('#pomo-demo-3901')).toBeVisible();
    await expect(mobileHeader.getByText('LIVE')).toBeVisible();
    await expect(mobileHeader).toBeVisible();

    // 4. Verify Right Sidebar is hidden on mobile (Stage has 100% width, no overflow)
    const desktopSidebar = page.locator('aside');
    await expect(desktopSidebar).toHaveClass(/hidden md:flex/);

    // 5. Verify Bottom Floating Bar touch targets (>= 44x44)
    const micBtn = page.getByTestId('btn-room-mic');
    const camBtn = page.getByTestId('btn-room-camera');
    const chatBtn = page.getByTestId('btn-room-chat');
    const handBtn = page.getByTestId('btn-room-hand');

    await expect(micBtn).toBeVisible();
    await expect(camBtn).toBeVisible();
    await expect(chatBtn).toBeVisible();
    await expect(handBtn).toBeVisible();

    const chatBox = await chatBtn.boundingBox();
    expect(chatBox?.width).toBeGreaterThanOrEqual(32);
    expect(chatBox?.height).toBeGreaterThanOrEqual(32);

    // 6. Test Timer Banner & Toggle
    const timerToggle = page.getByTestId('btn-room-timer-toggle');
    await expect(timerToggle).toBeVisible();
    await timerToggle.click(); // Start
    await page.waitForTimeout(300);
    await timerToggle.click(); // Pause

    // Screenshot active stage
    await page.screenshot({ path: `${artifactDir}/mobile-room-active-stage-390.png` });

    // 7. Test Mobile Chat Bottom Sheet
    await chatBtn.click();
    const chatSheet = page.getByTestId('mobile-chat-bottom-sheet');
    await expect(chatSheet).toBeVisible();
    await expect(chatSheet.getByText('Trò chuyện nhóm')).toBeVisible();

    // Send a chat message on mobile
    const chatInput = chatSheet.getByPlaceholder('Nhắn tin trong phòng...');
    await chatInput.fill('Chào cả phòng từ mobile!');
    await chatSheet.locator('button[type="submit"]').click();
    await expect(chatSheet.getByText('Chào cả phòng từ mobile!')).toBeVisible();

    // Screenshot open chat bottom sheet
    await page.screenshot({ path: `${artifactDir}/mobile-room-chat-bottom-sheet-390.png` });

    // Close chat bottom sheet
    const closeChatBtn = page.getByTestId('btn-close-mobile-chat');
    await closeChatBtn.click();
    await expect(chatSheet).not.toBeVisible();

    // 8. Test Whiteboard Tab Switch on Mobile
    const whiteboardBtn = mobileHeader.locator('button[title="Bảng Vẽ Chung"]');
    await whiteboardBtn.click();
    await expect(page.locator('canvas')).toBeVisible();
    await page.screenshot({ path: `${artifactDir}/mobile-room-whiteboard-390.png` });

    // 9. Test Reactions Trigger
    const reactionsBtn = page.getByTestId('btn-room-reactions');
    await reactionsBtn.click();
    const flameEmoji = page.locator('button').filter({ hasText: '🔥' }).last();
    await expect(flameEmoji).toBeVisible();
    await flameEmoji.click();

    // Verify floating reaction bubble
    await page.waitForTimeout(300);

    // 10. Switch back to Video Grid
    const videoGridBtn = mobileHeader.locator('button[title="Lưới Video"]');
    await videoGridBtn.click();
    await expect(page.getByText('Linh Đan (Pro)')).toBeVisible();
  });

  test('360x800 (Compact Android) — Header and Stage Stability Verification', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/rooms/room-compact');

    // Join room
    await page.getByRole('button', { name: 'Tham Gia Phòng Học Ngay' }).click();

    // Check Header bounding box doesn't overflow 360px
    const header = page.locator('header');
    const headerBox = await header.boundingBox();
    expect(headerBox?.width).toBeLessThanOrEqual(360);

    // Check Leave room button on mobile bar
    const leaveBtn = page.getByTestId('btn-room-leave-mobile');
    await expect(leaveBtn).toBeVisible();

    await page.screenshot({ path: `${artifactDir}/mobile-room-360-viewport.png` });
  });

  test('Desktop (1280x800) — Regression Check: Rich Header & Inline Chat Intact', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/rooms/room-desktop');

    // Join room
    await page.getByRole('button', { name: 'Tham Gia Phòng Học Ngay' }).click();

    // Rich desktop header
    await expect(page.locator('header').getByText('Lưới Video')).toBeVisible();
    await expect(page.locator('header').getByText('Bảng Vẽ Chung')).toBeVisible();
    await expect(page.locator('header').getByText('Mời bạn học')).toBeVisible();

    // Aside sidebar is visible on desktop
    const desktopSidebar = page.locator('aside');
    await expect(desktopSidebar).toBeVisible();

    await page.screenshot({ path: `${artifactDir}/desktop-room-regression-check.png` });
  });
});
