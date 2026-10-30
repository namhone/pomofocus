import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

test.describe('Audio Engine & Soundboard E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('1. Mở widget Âm thanh từ Dock, kiểm tra trạng thái mặc định', async ({ page }) => {
    // Mở widget Sounds từ dockbar
    const soundDockBtn = page.getByTestId('dock-btn-sounds');
    await expect(soundDockBtn).toBeVisible({ timeout: 15000 });
    await soundDockBtn.click();

    // Widget Header & Master Controls
    await expect(page.getByText('Bảng Âm Thanh & Chuông')).toBeVisible();
    const muteBtn = page.getByTestId('master-mute-btn');
    await expect(muteBtn).toBeVisible({ timeout: 15000 });
    await expect(muteBtn).toHaveText(/Đang bật tiếng/i);
    await expect(page.locator('#master-volume-slider')).toHaveValue('0.8');

    // Chime mặc định là twinkle
    await expect(page.getByRole('button', { name: /Chuông Báo \(twinkle\)/i })).toBeVisible();
    const previewChimeBtn = page.getByTestId('preview-chime-btn');
    await previewChimeBtn.scrollIntoViewIfNeeded();
    await expect(previewChimeBtn).toBeVisible();
  });

  test('2. Thao tác chọn loại chuông và kích hoạt nghe thử (Preview)', async ({ page }) => {
    // Mở widget
    await page.getByTestId('dock-btn-sounds').click();

    // Chọn Sci-fi
    await page.getByTestId('chime-option-scifi').click();
    await expect(page.getByRole('button', { name: /Chuông Báo \(scifi\)/i })).toBeVisible();

    // Bấm nút nghe thử chuông
    const previewBtn = page.getByTestId('preview-chime-btn');
    await page.evaluate(() => {
      const store = (window as any).useAudioStore;
      const playPreview = store.getState().previewChime;
      store.setState({
        previewChime: async (chime?: string) => {
          (window as any).__previewedChime = chime ?? store.getState().settings.selectedChime;
          try {
            await playPreview(chime);
          } finally {
            await new Promise<void>((resolve) => {
              (window as any).__finishPreviewChime = resolve;
            });
          }
        }
      });
    });
    await previewBtn.click();
    await expect(previewBtn).toHaveText(/Đang phát/i);
    await expect.poll(() => page.evaluate(() => (window as any).__previewedChime)).toBe('scifi');

    // Sau khi phát xong, nút trở lại bình thường
    await page.evaluate(() => {
      const target = window as any;
      target.__originalSetTimeout = window.setTimeout;
      window.setTimeout = ((callback: TimerHandler, delay?: number, ...args: any[]) => {
        if (delay === 2000 && typeof callback === 'function') {
          target.__resetPreview = () => callback(...args);
          return 0;
        }
        return target.__originalSetTimeout(callback, delay, ...args);
      }) as typeof window.setTimeout;
      target.__finishPreviewChime();
    });
    await expect.poll(() => page.evaluate(() => typeof (window as any).__resetPreview)).toBe('function');
    await page.evaluate(() => {
      const target = window as any;
      const resetPreview = target.__resetPreview;
      window.setTimeout = target.__originalSetTimeout;
      resetPreview();
    });
    await expect(previewBtn).toHaveText(/Nghe Thử Chuông Báo/i);

    // Chọn Bird
    await page.getByTestId('chime-option-bird').click();
    await expect(page.getByRole('button', { name: /Chuông Báo \(bird\)/i })).toBeVisible();
  });

  test('3. Bật/Tắt tiếng Master (Mute), điều chỉnh slider và khôi phục sau reload', async ({ page }) => {
    await page.getByTestId('dock-btn-sounds').click();

    const muteBtn = page.getByTestId('master-mute-btn');
    await expect(muteBtn).toHaveText(/Đang bật tiếng/i);

    // Click Mute
    await muteBtn.click();
    await expect(muteBtn).toHaveText(/Đang tắt tiếng/i);
    await expect(page.locator('#master-volume-slider')).toBeDisabled();

    // Bật lại tiếng
    await muteBtn.click();
    await expect(muteBtn).toHaveText(/Đang bật tiếng/i);
    await expect(page.locator('#master-volume-slider')).toBeEnabled();

    // Thay đổi slider Master
    await page.locator('#master-volume-slider').fill('0.45');
    await expect(page.getByText('Master: 45%')).toBeVisible();

    // Reload lại trang và kiểm tra cấu hình được lưu trong localStorage
    await page.reload();
    // Widget vẫn đang mở sau reload nhờ persistence của useLayoutStore
    await expect(page.getByText('Master: 45%')).toBeVisible();
  });

  test('4. Soundboard: Bật/Tắt đa track âm thanh nền (Rain, Ocean Waves, Cafe, Keyboard), kiểm tra Disclaimer và nút Dừng tất cả', async ({ page }) => {
    await page.getByTestId('dock-btn-sounds').click();

    // Chuyển sang Tab Âm Thanh Nền
    await page.getByRole('button', { name: /Âm Thanh Nền/i }).click();

    // Kiểm tra Medical Disclaimer hiển thị rõ ràng
    await expect(page.getByText(/Lưu ý y tế \(Medical Disclaimer\)/i)).toBeVisible();
    await expect(
      page.getByText(/Âm thanh mô phỏng nhịp âm hai tai hỗ trợ thư giãn và tập trung/i)
    ).toBeVisible();

    // Bật track Mưa Rào (rain)
    await page.getByTestId('toggle-track-rain').click();
    await expect(page.getByLabel('Âm lượng Mưa Rào')).toBeVisible();

    // Bật track Sóng Biển (ocean_waves)
    await page.getByTestId('toggle-track-ocean_waves').click();
    await expect(page.getByLabel('Âm lượng Sóng Biển')).toBeVisible();

    // Bật track Quán Cà Phê (cafe)
    await page.getByTestId('toggle-track-cafe').click();
    await expect(page.getByLabel('Âm lượng Quán Cà Phê')).toBeVisible();

    // Bật track Bàn Phím Cơ (keyboard)
    await page.getByTestId('toggle-track-keyboard').click();
    await expect(page.getByLabel('Âm lượng Bàn Phím Cơ')).toBeVisible();

    // Badge đếm số lượng track đang phát hiển thị 4
    await expect(page.getByRole('button', { name: /Âm Thanh Nền/i })).toContainText('4');

    // Nút Dừng tất cả (4) xuất hiện
    const stopAllBtn = page.getByRole('button', { name: /Dừng tất cả \(4\)/i });
    await expect(stopAllBtn).toBeVisible();

    // Bấm Dừng tất cả
    await stopAllBtn.click();

    // Tất cả các track đều dừng
    await expect(page.getByRole('button', { name: /Dừng tất cả/i })).not.toBeVisible();
    await expect(page.getByLabel('Âm lượng Mưa Rào')).not.toBeVisible();
    await expect(page.getByLabel('Âm lượng Sóng Biển')).not.toBeVisible();
    await expect(page.getByLabel('Âm lượng Quán Cà Phê')).not.toBeVisible();
    await expect(page.getByLabel('Âm lượng Bàn Phím Cơ')).not.toBeVisible();
  });

  test('5. Tương thích Zen Mode: Ẩn widget giao diện nhưng không phá vỡ state âm thanh', async ({ page }) => {
    // Mở Sounds widget và bật track rain
    await page.getByTestId('dock-btn-sounds').click();
    await page.getByRole('button', { name: /Âm Thanh Nền/i }).click();
    await page.getByTestId('toggle-track-rain').click();
    await expect(page.getByLabel('Âm lượng Mưa Rào')).toBeVisible();

    // Bật Zen Mode từ dock
    await page.getByTestId('dock-btn-zen').click();
    await expect(page.getByTestId('zen-mode-overlay')).toBeVisible();

    // Widget Âm thanh không hiển thị trên viewport trong Zen Mode
    await expect(page.getByTestId('audio-widget-content')).not.toBeVisible();

    // Thoát Zen Mode
    await page.getByTestId('exit-zen-btn').click();
    await expect(page.getByTestId('zen-mode-overlay')).not.toBeVisible();

    // Widget Âm thanh hiển thị lại với track rain vẫn đang hoạt động
    await expect(page.getByTestId('audio-widget-content')).toBeVisible();
    await expect(page.getByLabel('Âm lượng Mưa Rào')).toBeVisible();
  });

  test('6. Đa tab: Chỉ phát một chuông khi cùng ghi nhận một sessionId', async ({ context }) => {
    test.setTimeout(60000);
    const pageA = await context.newPage();
    const pageB = await context.newPage();

    await pageA.goto('/');
    await pageB.goto('/');

    // Mở Audio widget trên cả 2 tab để nạp useAudioStore
    await pageA.bringToFront();
    await pageA.getByTestId('dock-btn-sounds').click();
    await pageA.waitForSelector('[data-testid="audio-widget-content"]');

    await pageB.bringToFront();
    await pageB.getByTestId('dock-btn-sounds').click();
    await pageB.waitForSelector('[data-testid="audio-widget-content"]');

    // Cài đặt spy theo dõi lượt gọi playChime trên 2 tabs
    await pageA.bringToFront();
    await pageA.evaluate(() => {
      const store = (window as any).useAudioStore;
      (window as any).__chimePlayCount = 0;
      if (!store) return;
      const original = store.getState().playChime;
      store.setState({
        playChime: async (...args: any[]) => {
          (window as any).__chimePlayCount = ((window as any).__chimePlayCount || 0) + 1;
          return original(...args);
        }
      });
    });

    await pageB.bringToFront();
    await pageB.evaluate(() => {
      const store = (window as any).useAudioStore;
      (window as any).__chimePlayCount = 0;
      if (!store) return;
      const original = store.getState().playChime;
      store.setState({
        playChime: async (...args: any[]) => {
          (window as any).__chimePlayCount = ((window as any).__chimePlayCount || 0) + 1;
          return original(...args);
        }
      });
    });

    // Cả 2 tabs đều kết nối bình thường
    await pageA.bringToFront();
    await expect(pageA.getByTestId('status-indicator')).toBeVisible();
    await pageB.bringToFront();
    await expect(pageB.getByTestId('status-indicator')).toBeVisible();

    const sessionId = randomUUID();

    // Ghi cùng sessionId từ hai tab; chỉ transaction đầu tiên được phát chuông.
    await pageA.bringToFront();
    const resultA = await pageA.evaluate(async (id) => {
      const recordFn = (window as any).recordFocusSessionAtomic;
      const store = (window as any).useAudioStore;
      if (!recordFn || !store) return false;
      const recorded = await recordFn({
        id,
        phase: 'pomodoro',
        durationMinutes: 1,
        completedAt: Date.now(),
        dateString: '2026-10-23'
      });
      if (recorded) await store.getState().playChime();
      return recorded;
    }, sessionId);

    await pageB.bringToFront();
    const resultB = await pageB.evaluate(async (id) => {
      const recordFn = (window as any).recordFocusSessionAtomic;
      const store = (window as any).useAudioStore;
      if (!recordFn || !store) return false;
      const recorded = await recordFn({
        id,
        phase: 'pomodoro',
        durationMinutes: 1,
        completedAt: Date.now() + 10,
        dateString: '2026-10-23'
      });
      if (recorded) await store.getState().playChime();
      return recorded;
    }, sessionId);

    // Chỉ có DUY NHẤT 1 tab ghi thành công vào IndexedDB
    const results = [resultA, resultB];
    expect(results.filter(Boolean)).toHaveLength(1);

    // Kiểm tra số lần gọi playChime trên từng tab (bringToFront tránh Chromium background tab throttling)
    await pageA.bringToFront();
    const countA = await pageA.evaluate(() => (window as any).__chimePlayCount || 0);
    await pageB.bringToFront();
    const countB = await pageB.evaluate(() => (window as any).__chimePlayCount || 0);

    // Tổng số lượt phát chuông trên toàn bộ các tab chính xác bằng 1
    expect(countA + countB).toBe(1);

    await pageA.close();
    await pageB.close();
  });
});
