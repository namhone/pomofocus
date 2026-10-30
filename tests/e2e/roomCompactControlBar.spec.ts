import { test, expect } from '@playwright/test';

test.describe('Mobile Control Bar (#room-compact) UI & Viewport Stability Suite', () => {
  const artifactDir = 'C:/Users/Nam/.gemini/antigravity/brain/f0e4fa42-ea0b-4ff3-83da-6875921843c2';

  const viewports = [
    { name: '320px (Ultra Compact / iPhone SE 1st Gen)', width: 320, height: 640 },
    { name: '360px (Compact Android / Galaxy S8)', width: 360, height: 800 },
    { name: '390px (Standard Modern Mobile / iPhone 14)', width: 390, height: 844 },
    { name: '430px (Large Screen Mobile / iPhone 15 Pro Max)', width: 430, height: 932 },
  ];

  for (const vp of viewports) {
    test(`Control Bar #room-compact fits cleanly without overflow on ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/rooms/room-compact-test');

      // 1. Join the active room
      const joinBtn = page.getByRole('button', { name: 'Tham Gia Phòng Học Ngay' });
      await expect(joinBtn).toBeVisible();
      await joinBtn.click();

      // 2. Locate #room-compact
      const toolbar = page.locator('#room-compact');
      await expect(toolbar).toBeVisible();

      // 3. Verify No Horizontal Page Overflow
      const isOverflowing = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(isOverflowing).toBe(false);

      // 4. Verify Toolbar elements are completely visible & properly spaced
      const micBtn = page.getByTestId('btn-room-mic');
      const camBtn = page.getByTestId('btn-room-camera');
      const screenBtn = page.getByTestId('btn-room-screen');
      const handBtn = page.getByTestId('btn-room-hand');
      const reactBtn = page.getByTestId('btn-room-reactions');
      const chatBtn = page.getByTestId('btn-room-chat');
      const settingsBtn = page.getByTestId('btn-room-settings');
      const leaveBtn = page.getByTestId('btn-room-leave-mobile');

      await expect(micBtn).toBeVisible();
      await expect(camBtn).toBeVisible();
      await expect(screenBtn).toBeVisible();
      await expect(handBtn).toBeVisible();
      await expect(reactBtn).toBeVisible();
      await expect(chatBtn).toBeVisible();
      await expect(settingsBtn).toBeVisible();
      await expect(leaveBtn).toBeVisible();

      // 5. Verify Settings Button is NOT clipped and completely within bounds
      const settingsBox = await settingsBtn.boundingBox();
      expect(settingsBox).not.toBeNull();
      if (settingsBox) {
        expect(settingsBox.x).toBeGreaterThan(0);
        expect(settingsBox.x + settingsBox.width).toBeLessThanOrEqual(vp.width - 4);
      }

      // 6. Verify Leave Button (rightmost) is safely within viewport bounds
      const leaveBox = await leaveBtn.boundingBox();
      expect(leaveBox).not.toBeNull();
      if (leaveBox) {
        expect(leaveBox.x + leaveBox.width).toBeLessThanOrEqual(vp.width - 2);
      }

      // 7. Verify Safe Area padding on mobile
      const paddingBottom = await page.evaluate(() => {
        const el = document.getElementById('room-compact');
        return el ? window.getComputedStyle(el).paddingBottom : '0px';
      });
      const pbValue = parseFloat(paddingBottom);
      expect(pbValue).toBeGreaterThanOrEqual(8);

      // 8. Test Settings Modal functionality from toolbar
      await settingsBtn.click();
      const modal = page.locator('text=Cài Đặt Camera & Micro');
      await expect(modal).toBeVisible();
      // Close modal
      const closeBtn = page.locator('button:has-text("Lưu Cài Đặt")');
      await closeBtn.click();
      await expect(modal).not.toBeVisible();

      // 9. Take visual screenshot for audit
      await page.screenshot({ path: `${artifactDir}/room-compact-${vp.width}px.png` });
    });
  }

  test('Desktop & Tablet responsiveness of #room-compact', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/rooms/room-desktop-test');

    const joinBtn = page.getByRole('button', { name: 'Tham Gia Phòng Học Ngay' });
    await expect(joinBtn).toBeVisible();
    await joinBtn.click();

    const toolbar = page.locator('#room-compact');
    await expect(toolbar).toBeVisible();

    // Verify Settings button is visible
    const settingsBtn = page.getByTestId('btn-room-settings');
    await expect(settingsBtn).toBeVisible();

    // On desktop, mobile chat and mobile leave are hidden
    const chatBtn = page.getByTestId('btn-room-chat');
    const leaveBtn = page.getByTestId('btn-room-leave-mobile');
    await expect(chatBtn).not.toBeVisible();
    await expect(leaveBtn).not.toBeVisible();

    await page.screenshot({ path: `${artifactDir}/room-compact-desktop-1024px.png` });
  });
});
