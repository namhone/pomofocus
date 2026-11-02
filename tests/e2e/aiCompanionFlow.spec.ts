import { test, expect } from '@playwright/test';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/Nam/.gemini/antigravity/brain/f0e4fa42-ea0b-4ff3-83da-6875921843c2';

test.describe('AI Study Companion E2E & Visual Proof Tests', () => {
  test('1. Mở Trợ lý AI từ DockBar trên Desktop (1440x900) & Sử dụng Quick Actions', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/app');
    await page.waitForLoadState('networkidle');

    // 1. Mở AI Companion từ DockBar
    const aiDockBtn = page.getByTestId('dock-btn-ai');
    await expect(aiDockBtn).toBeVisible();
    await aiDockBtn.click();

    // 2. Xác nhận Drawer xuất hiện kèm HUD số dư
    const drawer = page.getByTestId('ai-companion-drawer');
    await expect(drawer).toBeVisible();
    await expect(page.getByTestId('ai-hud-credits')).toBeVisible();

    // 3. Kích hoạt Quick Action: "Giải thích khái niệm này ngắn gọn (1⚡)"
    const explainBtn = page.getByTestId('ai-quick-explain');
    await expect(explainBtn).toBeVisible();
    await explainBtn.click();

    // Đợi AI tạo câu trả lời
    await page.waitForTimeout(1000);
    await expect(drawer).toContainText('PomoFocus AI');

    // 4. Chụp ảnh màn hình bằng chứng Desktop
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'proof-ai-companion-desktop.png')
    });

    // 5. Thử nút Đóng Drawer
    await page.getByTestId('ai-btn-close-drawer').click();
    await expect(drawer).not.toBeVisible();
  });

  test('2. Kiểm tra giao diện AI Companion trên Mobile (390x844)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/app');
    await page.waitForLoadState('networkidle');

    // Mở từ Header hoặc MobileBottomNav
    const headerAiBtn = page.getByTestId('header-ai-btn');
    await expect(headerAiBtn).toBeVisible();
    await headerAiBtn.click();

    const drawer = page.getByTestId('ai-companion-drawer');
    await expect(drawer).toBeVisible();

    // Thử gửi câu hỏi từ ô input
    const promptInput = page.getByTestId('ai-prompt-input');
    await promptInput.fill('Phương pháp học ngắt quãng Spaced Repetition');
    await page.getByTestId('ai-submit-btn').click();

    await page.waitForTimeout(1000);

    // Chụp ảnh Mobile
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'proof-ai-companion-mobile.png')
    });
  });
});
