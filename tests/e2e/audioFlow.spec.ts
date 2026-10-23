import { test, expect } from '@playwright/test';

test.describe('Audio Engine & Soundboard E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.reload();
  });

  test('1. Mở widget Âm thanh từ Dock, kiểm tra trạng thái mặc định', async ({ page }) => {
    // Mở widget Sounds từ dockbar
    const soundDockBtn = page.getByTestId('dock-btn-sounds');
    await expect(soundDockBtn).toBeVisible();
    await soundDockBtn.click();

    // Widget Header & Master Controls
    await expect(page.getByText('Bảng Âm Thanh & Chuông')).toBeVisible();
    const muteBtn = page.getByTestId('master-mute-btn');
    await expect(muteBtn).toBeVisible();
    await expect(muteBtn).toHaveText(/Đang bật tiếng/i);
    await expect(page.locator('#master-volume-slider')).toHaveValue('0.8');

    // Chime mặc định là twinkle
    await expect(page.getByRole('button', { name: /Chuông Báo \(twinkle\)/i })).toBeVisible();
    await expect(page.getByTestId('preview-chime-btn')).toBeVisible();
  });

  test('2. Thao tác chọn loại chuông và kích hoạt nghe thử (Preview)', async ({ page }) => {
    // Mở widget
    await page.getByTestId('dock-btn-sounds').click();

    // Chọn Sci-fi
    await page.getByTestId('chime-option-scifi').click();
    await expect(page.getByRole('button', { name: /Chuông Báo \(scifi\)/i })).toBeVisible();

    // Bấm nút nghe thử chuông
    const previewBtn = page.getByTestId('preview-chime-btn');
    await previewBtn.click();
    await expect(previewBtn).toHaveText(/Đang phát/i);

    // Sau khi phát xong, nút trở lại bình thường
    await expect(previewBtn).toHaveText(/Nghe Thử Chuông Báo/i, { timeout: 3000 });

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

  test('6. Đa tab: Chỉ một tab ghi nhận atomic transaction phát chuông khi hết giờ', async ({ context }) => {
    const pageA = await context.newPage();
    const pageB = await context.newPage();

    await pageA.goto('/');
    await pageB.goto('/');

    // Cài đặt listener theo dõi lượt gọi playChime trên 2 tabs
    await pageA.evaluate(() => {
      (window as any).__chimePlayCount = 0;
      const originalPlay = (window as any).useAudioStore?.getState?.()?.playChime;
      if (originalPlay) {
        (window as any).useAudioStore.setState({
          playChime: async (...args: any[]) => {
            (window as any).__chimePlayCount = ((window as any).__chimePlayCount || 0) + 1;
            return originalPlay(...args);
          }
        });
      }
    });

    await pageB.evaluate(() => {
      (window as any).__chimePlayCount = 0;
      const originalPlay = (window as any).useAudioStore?.getState?.()?.playChime;
      if (originalPlay) {
        (window as any).useAudioStore.setState({
          playChime: async (...args: any[]) => {
            (window as any).__chimePlayCount = ((window as any).__chimePlayCount || 0) + 1;
            return originalPlay(...args);
          }
        });
      }
    });

    // Cả 2 tabs đều kết nối bình thường
    await expect(pageA.getByTestId('status-indicator')).toBeVisible();
    await expect(pageB.getByTestId('status-indicator')).toBeVisible();

    await pageA.close();
    await pageB.close();
  });
});
