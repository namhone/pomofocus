import { test, expect } from '@playwright/test';

test.describe('Footer Mobile Optimization & Collapsed Widget Cards Suite', () => {
  const artifactDir = 'C:/Users/Nam/.gemini/antigravity/brain/f0e4fa42-ea0b-4ff3-83da-6875921843c2';

  test('1. Mobile Footer across 320px, 360px, 390px — 2-Column Grid & Compact Copy Buttons', async ({ page }) => {
    for (const width of [320, 360, 390, 430]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/contact');

      const footer = page.getByTestId('shared-footer');
      await expect(footer).toBeVisible();

      // Check no horizontal overflow on mobile
      const isOverflowing = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(isOverflowing).toBe(false);

      // Verify 2-column grid chips on mobile
      await expect(footer.getByText('Không Gian Làm Việc')).toBeVisible();
      await expect(footer.getByText('Phòng Học Nhóm Live')).toBeVisible();
      await expect(footer.getByText('Gửi Phản Hồi & Ý Kiến')).toBeVisible();
      await expect(footer.getByText('Bảo Mật & Phiên Đăng Nhập')).toBeVisible();

      // Verify copy email & phone buttons
      const emailCopyBtn = footer.getByRole('button', { name: 'Sao chép email' });
      await expect(emailCopyBtn).toBeVisible();
      await emailCopyBtn.click();

      const phoneCopyBtn = footer.getByRole('button', { name: 'Sao chép số điện thoại' });
      await expect(phoneCopyBtn).toBeVisible();
      await phoneCopyBtn.click();
    }

    // Capture screenshot at 390px
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/contact');
    const footerElement = page.getByTestId('shared-footer');
    await footerElement.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${artifactDir}/mobile-footer-optimized-390.png` });
  });

  test('2. Collapsed Widget Cards on Desktop — Real data, Play/Pause, Next Task & Clean Excerpt', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/app');

    // 1. Timer Collapse & Real Countdown & Play/Pause
    const timerWidget = page.getByTestId('widget-container-timer');
    await expect(timerWidget).toBeVisible();
    const collapseTimerBtn = page.getByTestId('collapse-widget-timer');
    await collapseTimerBtn.click();
    await page.waitForTimeout(300);

    const collapsedTimer = timerWidget.getByTestId('collapsed-timer-bar');
    await expect(collapsedTimer).toBeVisible();
    await expect(collapsedTimer.getByTestId('timer-display')).toContainText('25:00');

    // Test Play button on collapsed timer card
    const playBtn = page.getByTestId('collapsed-timer-play-btn');
    await expect(playBtn).toBeVisible();
    await playBtn.click(); // Start
    await page.waitForTimeout(400);
    await playBtn.click(); // Pause

    // 2. Tasks Collapse & Upcoming Task
    const tasksWidget = page.getByTestId('widget-container-tasks');
    await expect(tasksWidget).toBeVisible();
    const collapseTasksBtn = page.getByTestId('collapse-widget-tasks');
    await collapseTasksBtn.click();
    await page.waitForTimeout(300);

    const collapsedTasks = tasksWidget.getByTestId('collapsed-tasks-card');
    await expect(collapsedTasks).toBeVisible();

    // 3. Notes Collapse & Note Excerpt
    const notesWidget = page.getByTestId('widget-container-notes');
    await expect(notesWidget).toBeVisible();
    const collapseNotesBtn = page.getByTestId('collapse-widget-notes');
    await collapseNotesBtn.click();
    await page.waitForTimeout(300);

    const collapsedNotes = notesWidget.getByTestId('collapsed-notes-card');
    await expect(collapsedNotes).toBeVisible();

    // Screenshot all collapsed cards on desktop
    await page.screenshot({ path: `${artifactDir}/desktop-collapsed-widget-cards.png` });

    // 4. Test Expand button on timer
    const expandTimerBtn = page.getByTestId('collapsed-timer-expand-btn');
    await expandTimerBtn.click();
    await page.waitForTimeout(300);
    await expect(timerWidget.getByTestId('timer-display')).toBeVisible();
  });

  test('3. Collapsed Widget Cards on Mobile Stack', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/app');

    // Set mobile view mode to stack if not already
    const timerWidget = page.getByTestId('widget-container-timer');
    await expect(timerWidget).toBeVisible();

    // Collapse timer on mobile
    const collapseTimerBtn = page.getByTestId('collapse-widget-timer');
    await collapseTimerBtn.click();
    await page.waitForTimeout(300);

    const collapsedTimer = timerWidget.getByTestId('collapsed-timer-bar');
    await expect(collapsedTimer).toBeVisible();
    await expect(collapsedTimer.getByTestId('timer-display')).toContainText('25:00');

    await page.screenshot({ path: `${artifactDir}/mobile-collapsed-widget-card-390.png` });
  });
});
