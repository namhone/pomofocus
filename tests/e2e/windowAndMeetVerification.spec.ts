import { test, expect } from '@playwright/test';
import * as path from 'path';

const ARTIFACT_DIR = 'C:/Users/Nam/.gemini/antigravity/brain/f0e4fa42-ea0b-4ff3-83da-6875921843c2';

test.describe('Window Manager Drag, Collapse & Study Room Meet Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app');
    await page.waitForLoadState('networkidle');
  });

  test('1. Kéo thả widget không bị dịch chuyển về góc và giữ nguyên vị trí sau khi thả', async ({ page }) => {
    const timerWidget = page.getByTestId('widget-container-timer');
    await expect(timerWidget).toBeVisible();

    const initialBox = await timerWidget.boundingBox();
    expect(initialBox).not.toBeNull();

    // Drag the widget by title bar 120px to the right and 80px down
    const titleBar = timerWidget.locator('.cursor-grab').first();
    const titleBox = await titleBar.boundingBox();
    expect(titleBox).not.toBeNull();

    await page.mouse.move(titleBox!.x + titleBox!.width / 2, titleBox!.y + titleBox!.height / 2);
    await page.mouse.down();
    await page.mouse.move(titleBox!.x + titleBox!.width / 2 + 120, titleBox!.y + titleBox!.height / 2 + 80, { steps: 5 });
    await page.mouse.up();

    await page.waitForTimeout(300);

    const newBox = await timerWidget.boundingBox();
    expect(newBox).not.toBeNull();

    // Verify it did NOT snap to (10, 50)
    expect(newBox!.x).toBeGreaterThan(initialBox!.x + 50);
    expect(newBox!.y).toBeGreaterThan(initialBox!.y + 30);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'test-widget-drag-preserved.png') });
  });

  test('2. Thu nhỏ Pomodoro hiển thị thanh điều khiển mini 52px đầy đủ và mở rộng lại bình thường', async ({ page }) => {
    const timerWidget = page.getByTestId('widget-container-timer');
    await expect(timerWidget).toBeVisible();

    // Click collapse button
    const collapseBtn = page.getByTestId('collapse-widget-timer');
    await collapseBtn.click();
    await page.waitForTimeout(300);

    // Verify collapsed mini control bar
    const collapsedControls = timerWidget.getByTestId('collapsed-timer-bar');
    await expect(collapsedControls).toBeVisible();
    await expect(collapsedControls).toContainText('25:00');

    // Click expand button
    const expandBtn = timerWidget.locator('button[title*="Mở rộng"], button[title*="Phóng to"]').first();
    await expandBtn.click();
    await page.waitForTimeout(300);

    // Verify normal widget content is visible again
    await expect(page.getByTestId('timer-display')).toBeVisible();
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'test-widget-collapse-expanded.png') });
  });

  test('3. Bảng âm thanh khi thu nhỏ không làm mất iframe và giữ trình phát an toàn', async ({ page }) => {
    // Open sounds widget if closed
    const soundsWidget = page.getByTestId('widget-container-sounds');
    if (!(await soundsWidget.isVisible())) {
      await page.getByTestId('dock-btn-sounds').click();
    }
    await expect(soundsWidget).toBeVisible();

    // Collapse sounds widget
    const collapseBtn = page.getByTestId('collapse-widget-sounds');
    await collapseBtn.click();
    await page.waitForTimeout(300);

    // Check mini audio controls
    const miniAudio = soundsWidget.getByTestId('collapsed-media-bar');
    await expect(miniAudio).toBeVisible();

    // Verify audio host in DOM exists and is not destroyed
    const audioHost = page.getByTestId('global-audio-host');
    await expect(audioHost).toBeAttached();

    // Expand sounds widget
    const expandBtn = soundsWidget.locator('button[title*="Mở rộng"], button[title*="Phóng to"]').first();
    await expandBtn.click();
    await page.waitForTimeout(300);

    await expect(soundsWidget.getByTestId('audio-widget-content')).toBeVisible();
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'test-sounds-collapse-safe.png') });
  });

  test('4. Phòng học nhóm (StudyRoomView) hoạt động đầy đủ: tham gia, bảng vẽ canvas, giơ tay, thả reaction', async ({ page }) => {
    await page.goto('/rooms/room_test_1');
    await page.waitForLoadState('networkidle');

    // Pre-join screen
    await expect(page.locator('text=Chuẩn Bị Vào Phòng Học Nhóm')).toBeVisible();

    // Enter room
    const joinBtn = page.locator('button:has-text("Tham Gia Phòng Học Ngay")');
    await joinBtn.click();
    await page.waitForTimeout(500);

    // Verify active room header
    await expect(page.locator('text=Phòng Học Nhóm: #room_test_1')).toBeVisible();
    await expect(page.locator('text=WebRTC Live')).toBeVisible();

    // Verify Hand Raise toggle
    const handBtn = page.locator('button[title*="Giơ tay"]').first();
    await handBtn.click();
    await expect(page.locator('text=Đang giơ tay')).toBeVisible();

    // Trigger reaction
    const flameBtn = page.locator('button[title*="Thả lửa"]').first();
    await flameBtn.click();

    // Switch to Whiteboard tab
    const whiteboardTab = page.locator('button:has-text("Bảng Vẽ Chung")');
    await whiteboardTab.click();
    await page.waitForTimeout(300);

    // Verify Canvas
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    // Send a message
    const msgInput = page.locator('input[placeholder*="Nhắn tin trong phòng"]');
    await msgInput.fill('Chào cả phòng, mình vừa hoàn thành 1 hiệp Pomodoro!');
    await page.locator('button[type="submit"]').click();

    await expect(page.locator('text=Chào cả phòng, mình vừa hoàn thành 1 hiệp Pomodoro!')).toBeVisible();

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'test-meet-whiteboard-active.png') });
  });
});
