import { test, expect } from '@playwright/test';

test.describe('Regression Suite: Audio Lifecycle & Mobile Nav Animation', () => {
  test('1. Nhạc tiếp tục phát khi đóng hoặc ẩn widget Audio', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Mở widget Âm thanh từ Dock
    const soundsBtn = page.getByTestId('dock-btn-sounds');
    await soundsBtn.click();
    await page.waitForTimeout(500);

    // Mở Tab Nhạc & Stream
    const tabMusic = page.getByTestId('tab-music');
    await tabMusic.click();
    await page.waitForTimeout(500);

    // Bắt đầu phát kênh MP3 trực tiếp (Kalimba)
    const playKalimbaBtn = page.locator('button', { hasText: 'Giai Điệu Kalimba' });
    await playKalimbaBtn.click();
    await page.waitForTimeout(1000);

    // Kiểm tra GlobalAudioHost đang phát và Audio element có src
    const initialPlaybackState = await page.evaluate(() => {
      const audioEl = document.querySelector('div[data-testid="global-audio-host"] audio') as HTMLAudioElement;
      const store = (window as any).useAudioStore;
      return {
        hasAudioEl: Boolean(audioEl),
        src: audioEl ? audioEl.src : '',
        paused: audioEl ? audioEl.paused : true,
        storePlaying: store ? store.getState().customMusicPlaying : false,
        storeUrl: store ? store.getState().customMusicUrl : ''
      };
    });

    expect(initialPlaybackState.hasAudioEl).toBe(true);
    expect(initialPlaybackState.src).toContain('Kalimba.mp3');
    expect(initialPlaybackState.storePlaying).toBe(true);

    // ĐÓNG WIDGET AUDIO BẰNG NÚT DOCK (Hoặc phím tắt / nút close)
    await soundsBtn.click();
    await page.waitForTimeout(500);

    // Xác nhận widget container của sounds đã đóng hoàn toàn khỏi màn hình
    const audioWidgetVisible = await page.getByTestId('audio-widget-content').isVisible();
    expect(audioWidgetVisible).toBe(false);

    // CHỜ ÍT NHẤT 10 GIÂY theo đúng tiêu chí đề bài
    console.log('Chờ 10 giây để kiểm tra nhạc vẫn tiếp tục phát nền...');
    await page.waitForTimeout(10000);

    // Kiểm tra âm thanh tại GlobalAudioHost vẫn đang phát liên tục
    const backgroundPlaybackState = await page.evaluate(() => {
      const audioEl = document.querySelector('div[data-testid="global-audio-host"] audio') as HTMLAudioElement;
      const store = (window as any).useAudioStore;
      return {
        hasAudioEl: Boolean(audioEl),
        src: audioEl ? audioEl.src : '',
        paused: audioEl ? audioEl.paused : true,
        storePlaying: store ? store.getState().customMusicPlaying : false
      };
    });

    expect(backgroundPlaybackState.hasAudioEl).toBe(true);
    expect(backgroundPlaybackState.src).toContain('Kalimba.mp3');
    expect(backgroundPlaybackState.storePlaying).toBe(true);

    // MỞ LẠI WIDGET ÂM THANH
    await soundsBtn.click();
    await page.waitForTimeout(500);

    // Trạng thái và bài nhạc vẫn chính xác
    const reopenedState = await page.evaluate(() => {
      const store = (window as any).useAudioStore;
      return {
        storePlaying: store ? store.getState().customMusicPlaying : false,
        storeUrl: store ? store.getState().customMusicUrl : '',
        storeType: store ? store.getState().customMusicType : ''
      };
    });
    expect(reopenedState.storePlaying).toBe(true);
    expect(reopenedState.storeUrl).toContain('Kalimba.mp3');

    // Thử Pause
    const pauseBtn = page.getByTestId('btn-toggle-direct-audio');
    if (await pauseBtn.isVisible()) {
      await pauseBtn.click();
      await page.waitForTimeout(500);
      const isPaused = await page.evaluate(() => {
        const audioEl = document.querySelector('div[data-testid="global-audio-host"] audio') as HTMLAudioElement;
        const store = (window as any).useAudioStore;
        return audioEl?.paused && !store?.getState().customMusicPlaying;
      });
      expect(isPaused).toBe(true);
    }
  });

  test('2. Chuyển tab menu mobile >= 10 lần không nháy trắng và không giật ngược tab', async ({ browser }) => {
    // Sử dụng context mobile Pixel 5 có hasTouch: true
    const context = await browser.newContext({
      viewport: { width: 393, height: 851 },
      isMobile: true,
      hasTouch: true
    });
    const page = await context.newPage();
    await page.goto('/');
    await page.waitForTimeout(1000);

    const bottomNav = page.getByTestId('mobile-bottom-navigation');
    await expect(bottomNav).toBeVisible();

    const tabs = ['tasks', 'notes', 'sounds', 'spaces', 'timer'];
    const failures: string[] = [];

    // Chuyển qua lại 15 lần (3 vòng toàn bộ 5 tab)
    for (let cycle = 0; cycle < 3; cycle++) {
      for (const tabId of tabs) {
        const btn = page.getByTestId(`dock-btn-${tabId}`);
        await expect(btn).toBeVisible();

        // Tap vào nút tab
        await btn.tap();

        // Kiểm tra ngay lập tức: tab active phải cập nhật đúng sang tabId thông qua aria-current="page"
        const activeTabImmediately = await page.evaluate(() => {
          const activeEl = document.querySelector('nav[data-testid="mobile-bottom-navigation"] button[aria-current="page"]');
          return activeEl?.getAttribute('data-testid')?.replace('dock-btn-', '') || null;
        });

        if (activeTabImmediately !== tabId) {
          failures.push(`Cycle ${cycle} [${tabId}]: Active tab ngay sau tap không khớp (got: ${activeTabImmediately})`);
        }

        // Kiểm tra sau 250ms không bị giật ngược về tab cũ
        await page.waitForTimeout(250);
        const activeTabAfter250ms = await page.evaluate(() => {
          const activeEl = document.querySelector('nav[data-testid="mobile-bottom-navigation"] button[aria-current="page"]');
          return activeEl?.getAttribute('data-testid')?.replace('dock-btn-', '') || null;
        });

        if (activeTabAfter250ms !== tabId) {
          failures.push(`Cycle ${cycle} [${tabId}]: Sau 250ms bị giật tab (got: ${activeTabAfter250ms})`);
        }

        // Kiểm tra không có thuộc tính tap-highlight mặc định
        const tapHighlight = await btn.evaluate((el) => {
          return window.getComputedStyle(el).webkitTapHighlightColor;
        });
        if (tapHighlight && tapHighlight !== 'rgba(0, 0, 0, 0)' && tapHighlight !== 'transparent') {
          failures.push(`Cycle ${cycle} [${tabId}]: WebkitTapHighlightColor bị nháy (got: ${tapHighlight})`);
        }
      }
    }

    await context.close();
    expect(failures).toEqual([]);
  });

  test('3. Di chuyển cửa sổ Desktop tự do bằng thanh tiêu đề mà không cần bật chỉnh sửa bố cục', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    const timerWindow = page.getByTestId('widget-container-timer');
    await expect(timerWindow).toBeVisible();

    const initialBox = await timerWindow.boundingBox();
    expect(initialBox).not.toBeNull();

    // Kéo thanh tiêu đề timer đi 100px sang phải và 50px xuống dưới
    const dragHandle = timerWindow.locator('[data-drag-handle="true"]');
    await dragHandle.hover();
    await page.mouse.down();
    await page.mouse.move(initialBox!.x + 150, initialBox!.y + 80, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(500);

    const movedBox = await timerWindow.boundingBox();
    expect(movedBox).not.toBeNull();
    expect(movedBox!.x).not.toBe(initialBox!.x);
    expect(movedBox!.y).not.toBe(initialBox!.y);
  });

  test('4. Kéo giãn thu nhỏ tự do từ cạnh/góc trong khoảng min/max (không có nút S/M/L ép buộc)', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    const tasksWindow = page.getByTestId('widget-container-tasks');
    await expect(tasksWindow).toBeVisible();

    // Xác nhận không còn các nút kích thước cứng nhắc S / M / L
    const sizePresets = tasksWindow.locator('[data-testid^="size-presets-"]');
    await expect(sizePresets).toHaveCount(0);

    const initialBox = await tasksWindow.boundingBox();
    expect(initialBox).not.toBeNull();

    // Kéo resize handle góc dưới bên phải (se)
    const resizeHandleSE = tasksWindow.locator('[data-testid="resize-handle-tasks"]');
    await expect(resizeHandleSE).toBeAttached();

    const handleBox = await resizeHandleSE.boundingBox();
    expect(handleBox).not.toBeNull();

    // Kéo to ra thêm 80px chiều rộng và 60px chiều cao
    await resizeHandleSE.hover();
    await page.mouse.down();
    for (let i = 1; i <= 5; i++) {
      await page.mouse.move(handleBox!.x + 16 * i, handleBox!.y + 12 * i);
      await page.waitForTimeout(50);
    }
    await page.mouse.up();
    await page.waitForTimeout(500);

    const resizedBox = await tasksWindow.boundingBox();
    expect(resizedBox).not.toBeNull();
    expect(resizedBox!.width).toBeGreaterThan(initialBox!.width + 20);
    expect(resizedBox!.height).toBeGreaterThan(initialBox!.height + 15);
  });

  test('5. Thu nhỏ widget Audio khi đang phát YouTube hiển thị khung video mini và chỉ ẩn khi bấm dấu X', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Mở widget Âm thanh
    await page.getByTestId('dock-btn-sounds').click();
    await page.waitForTimeout(500);
    await page.getByTestId('tab-music').click();
    await page.waitForTimeout(500);

    // Bắt đầu phát Lofi Girl (YouTube)
    const playLofiBtn = page.locator('button', { hasText: 'Lofi Girl Live' });
    await playLofiBtn.click();
    await page.waitForTimeout(1000);

    // Thu nhỏ widget Audio bằng nút Minus (collapse)
    const collapseBtn = page.getByTestId('collapse-widget-sounds');
    await collapseBtn.click();
    await page.waitForTimeout(500);

    // Khung video YouTube anchor vẫn tồn tại bên trong widget thu nhỏ
    const soundsContainer = page.getByTestId('widget-container-sounds');
    await expect(soundsContainer).toBeVisible();
    const miniVideoAnchor = soundsContainer.locator('[data-testid="youtube-player-anchor"]');
    await expect(miniVideoAnchor).toBeVisible();

    // Iframe YouTube của GlobalAudioHost được neo đúng vị trí
    const ytIframe = page.locator('[data-testid="youtube-stream-iframe"]');
    await expect(ytIframe).toBeVisible();

    // BẤM NÚT DẤU X (close) -> Widget Audio ẩn hoàn toàn khỏi màn hình
    const closeBtn = page.getByTestId('close-widget-sounds');
    await closeBtn.click();
    await page.waitForTimeout(500);

    await expect(soundsContainer).not.toBeVisible();
  });

  test('6. Không còn chữ tiếng Anh dư thừa kèm trong ngoặc trên giao diện', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Mở widget Spaces để kiểm tra các preset
    await page.getByTestId('dock-btn-spaces').click();
    await page.waitForTimeout(500);

    const spacesContent = await page.getByTestId('spaces-widget').innerText();
    expect(spacesContent).not.toContain('(Deep Space)');
    expect(spacesContent).not.toContain('(Cozy Study)');
    expect(spacesContent).not.toContain('(Ocean Waves Loop)');
    expect(spacesContent).not.toContain('(Rainy Window)');
    expect(spacesContent).not.toContain('(Misty Forest)');
    expect(spacesContent).not.toContain('(Spaces)');

    // Mở Settings để kiểm tra giao diện cài đặt (icon preset trên thanh Dock)
    await page.getByTestId('dock-btn-presets').click();
    await page.waitForTimeout(500);

    const settingsContent = await page.getByTestId('settings-widget').innerText();
    expect(settingsContent).not.toContain('(Glassmorphism)');
    expect(settingsContent).not.toContain('(Blur)');
    expect(settingsContent).not.toContain('(Tile)');
    expect(settingsContent).not.toContain('(Templates)');
  });
});
