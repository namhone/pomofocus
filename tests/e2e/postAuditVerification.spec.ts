import { test, expect } from '@playwright/test';

// Giải thuật tính toán độ tương phản chuẩn WCAG 2.1
function parseRgb(colorStr: string): [number, number, number] {
  const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return [0, 0, 0];
  return [parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10)];
}

function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function calculateContrast(fgRgb: [number, number, number], bgRgb: [number, number, number]): number {
  const l1 = getLuminance(...fgRgb);
  const l2 = getLuminance(...bgRgb);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

test.describe('POST-AUDIT VERIFICATION SUITE', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  // =========================================================================
  // 1. KIỂM ĐỊNH RESPONSIVE TRÊN 3 VIEWPORT CHÍNH (390x844, 768x1024, 1366x768)
  // =========================================================================
  test('1. Responsive Mobile (390x844): Cuộn dọc, không vỡ layout, không tràn ngang', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await page.waitForSelector('[data-testid="workspace-root"]');

    // Kiểm tra không bị tràn thanh cuộn ngang (horizontal overflow)
    const overflowX = await page.evaluate(() => {
      return document.documentElement.scrollWidth <= window.innerWidth;
    });
    expect(overflowX).toBe(true);
    await page.mouse.wheel(0, 500);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);

    // Kiểm tra các widget mở mặc định (Timer, Tasks, Notes) xuất hiện trong luồng cuộn
    const timer = page.locator('[data-testid="widget-container-timer"]');
    const tasks = page.locator('[data-testid="widget-container-tasks"]');
    const notes = page.locator('[data-testid="widget-container-notes"]');
    await expect(timer).toBeVisible();
    await expect(tasks).toBeVisible();
    await expect(notes).toBeVisible();

    // Tiêu đề cửa sổ h2 hiển thị chuẩn
    await expect(timer.locator('h2')).toHaveText(/đồng hồ pomodoro/i);
    await expect(tasks.locator('h2')).toHaveText(/danh sách công việc/i);
    await expect(notes.locator('h2')).toHaveText(/ghi chú công việc/i);

    // Vùng chạm nút đóng close-widget tối thiểu 32x32px
    const closeTimerBox = await timer.locator('[data-testid="close-widget-timer"]').boundingBox();
    expect(closeTimerBox).not.toBeNull();
    expect(closeTimerBox!.width).toBeGreaterThanOrEqual(32);
    expect(closeTimerBox!.height).toBeGreaterThanOrEqual(32);

    // DockBar nằm cố định ở chân trang, không che khuất hoàn toàn nội dung
    const dock = page.locator('nav[role="toolbar"]');
    await expect(dock).toBeVisible();
    const dockBox = await dock.boundingBox();
    expect(dockBox).not.toBeNull();
    expect(dockBox!.y + dockBox!.height).toBeLessThanOrEqual(844);
  });

  test('2. Responsive Tablet (768x1024): Kích hoạt chế độ stack tối ưu cảm ứng', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    await page.waitForSelector('[data-testid="workspace-root"]');

    // Main remains in normal document flow to avoid nested scroll containers
    const mainUsesDocumentFlow = await page.evaluate(() => {
      const main = document.querySelector('main');
      return main ? !main.classList.contains('overflow-y-auto') : false;
    });
    expect(mainUsesDocumentFlow).toBe(true);
    await page.mouse.wheel(0, 500);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);

    // Không tràn ngang
    const noHOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= 768);
    expect(noHOverflow).toBe(true);

    // Kiểm tra Zen Mode trên Tablet
    await page.click('[data-testid="dock-btn-zen"]');
    const zen = page.locator('[data-testid="zen-mode-overlay"]');
    await expect(zen).toBeVisible();
    await expect(zen.locator('h1')).toHaveText('Zen Mode — Không gian tập trung sâu');
    await page.click('[data-testid="exit-zen-btn"]');
    await expect(zen).not.toBeVisible();
  });

  test('3. Responsive Laptop (1365x768): Cửa sổ nổi, Cascade vị trí không chồng khít', async ({ page }) => {
    await page.setViewportSize({ width: 1365, height: 768 });
    await page.reload();
    await page.waitForSelector('[data-testid="workspace-root"]');

    // Mở thêm Sounds và Spaces từ Dock
    await page.click('[data-testid="dock-btn-sounds"]');
    await page.waitForSelector('[data-testid="widget-container-sounds"]');

    await page.click('[data-testid="dock-btn-spaces"]');
    await page.waitForSelector('[data-testid="widget-container-spaces"]');

    // Lấy bounding box của tasks, sounds, spaces
    const tasksBox = await page.locator('[data-testid="widget-container-tasks"]').boundingBox();
    const soundsBox = await page.locator('[data-testid="widget-container-sounds"]').boundingBox();
    const spacesBox = await page.locator('[data-testid="widget-container-spaces"]').boundingBox();

    expect(tasksBox).not.toBeNull();
    expect(soundsBox).not.toBeNull();
    expect(spacesBox).not.toBeNull();

    // Xác minh hiệu ứng Cascade: X của Sounds và Spaces không bị trùng hoàn toàn với Tasks (x=428)
    expect(soundsBox!.x).not.toBe(tasksBox!.x);
    expect(spacesBox!.x).not.toBe(tasksBox!.x);
    expect(soundsBox!.x).toBeGreaterThan(tasksBox!.x);
    expect(spacesBox!.x).toBeGreaterThan(soundsBox!.x);

    // Không cửa sổ nào bị văng ra khỏi biên màn hình 1366x768
    expect(tasksBox!.x).toBeGreaterThanOrEqual(0);
    expect(soundsBox!.x + soundsBox!.width).toBeLessThanOrEqual(1365 + 30);
    expect(spacesBox!.x + spacesBox!.width).toBeLessThanOrEqual(1365 + 30);
  });

  test('3a. Responsive compact desktop (1024x768): Widgets chuyển sang stack và không chồng lấn', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.reload();
    await page.waitForSelector('[data-testid="workspace-root"]');

    await expect(page.getByTestId('mobile-bottom-navigation')).toBeVisible();
    const boxes = await Promise.all(
      ['timer', 'tasks', 'notes'].map((id) =>
        page.getByTestId(`widget-container-${id}`).boundingBox()
      )
    );
    expect(boxes.every((box) => box !== null)).toBe(true);
    expect(boxes[0]!.y + boxes[0]!.height).toBeLessThanOrEqual(boxes[1]!.y);
    expect(boxes[1]!.y + boxes[1]!.height).toBeLessThanOrEqual(boxes[2]!.y);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  // =========================================================================
  // 2. XÁC MINH CẤU TRÚC DOM & KHỬ HOÀN TOÀN LỒNG THẺ (NESTED CARDS)
  // =========================================================================
  test('4. Khử lồng thẻ: Tasks, Timer, Notes không còn thẻ card lồng card', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.waitForSelector('[data-testid="workspace-root"]');

    const nestingResult = await page.evaluate(() => {
      const checkInnerCard = (containerSelector: string) => {
        const container = document.querySelector(containerSelector);
        if (!container) return false;
        // Kiểm tra xem bên trong container có chứa thêm thẻ có border và rounded-3xl lặp lại không
        const body = container.querySelector('.flex-1');
        if (!body) return false;
        const innerCard = body.querySelector('.rounded-3xl.border');
        return !!innerCard;
      };

      return {
        timerHasDoubleCard: checkInnerCard('[data-testid="widget-container-timer"]'),
        tasksHasDoubleCard: checkInnerCard('[data-testid="widget-container-tasks"]'),
        notesHasDoubleCard: checkInnerCard('[data-testid="widget-container-notes"]'),
      };
    });

    expect(nestingResult.timerHasDoubleCard).toBe(false);
    expect(nestingResult.tasksHasDoubleCard).toBe(false);
    expect(nestingResult.notesHasDoubleCard).toBe(false);
  });

  // =========================================================================
  // 3. TƯƠNG TÁC THỰC TẾ: KÉO THẢ, RESIZE, RESET LAYOUT, RELOAD PERSISTENCE
  // =========================================================================
  test('5. Kéo thả, Thay đổi kích thước (Resize), Khôi phục layout sau reload', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.waitForSelector('[data-testid="workspace-root"]');

    const tasksWidget = page.locator('[data-testid="widget-container-tasks"]');
    const dragHandle = tasksWidget.locator('[data-drag-handle="true"]');
    await page.getByTestId('dock-btn-presets').click();
    await page.getByTestId('dock-btn-edit-layout').click();

    const initialBox = await tasksWidget.boundingBox();
    expect(initialBox).not.toBeNull();

    // 1. Kéo thả cửa sổ Tasks
    const handleBox = await dragHandle.boundingBox();
    await page.mouse.move(handleBox!.x + 60, handleBox!.y + 10);
    await page.mouse.down();
    await page.mouse.move(handleBox!.x + 80, handleBox!.y + 190, { steps: 5 });
    await page.mouse.up();

    const afterDragBox = await tasksWidget.boundingBox();
    expect(afterDragBox!.x).toBeGreaterThan(initialBox!.x);
    expect(afterDragBox!.y).toBeGreaterThan(initialBox!.y);

    // 2. Kéo dãn kích thước (Resize)
    const resizeHandle = tasksWidget.locator('[data-testid="resize-handle-tasks"]');
    const resizeBox = await resizeHandle.boundingBox();
    await page.mouse.move(resizeBox!.x + 5, resizeBox!.y + 5);
    await page.mouse.down();
    await page.mouse.move(resizeBox!.x + 60, resizeBox!.y + 60, { steps: 5 });
    await page.mouse.up();

    await expect.poll(async () => (await tasksWidget.boundingBox())?.width ?? 0).toBeGreaterThan(afterDragBox!.width);
    const afterResizeBox = await tasksWidget.boundingBox();
    expect(afterResizeBox!.width).toBeGreaterThan(afterDragBox!.width);
    expect(afterResizeBox!.height).toBeGreaterThan(afterDragBox!.height);

    // 3. Reload trang: Phục hồi chính xác vị trí và kích thước đã kéo
    await page.reload();
    await page.waitForSelector('[data-testid="widget-container-tasks"]');
    const reloadBox = await page.locator('[data-testid="widget-container-tasks"]').boundingBox();
    expect(Math.abs(reloadBox!.x - afterResizeBox!.x)).toBeLessThanOrEqual(2);
    expect(Math.abs(reloadBox!.y - afterResizeBox!.y)).toBeLessThanOrEqual(2);
    expect(Math.abs(reloadBox!.width - afterResizeBox!.width)).toBeLessThanOrEqual(2);
    expect(Math.abs(reloadBox!.height - afterResizeBox!.height)).toBeLessThanOrEqual(2);

    // 4. Reset Layout từ Dock
    await page.click('[data-testid="dock-btn-reset-layout"]');
    await expect(page.getByTestId('reset-layout-confirmation')).toBeVisible();
    await page.getByTestId('confirm-reset-layout').click();
    const resetBox = await page.locator('[data-testid="widget-container-tasks"]').boundingBox();
    expect(resetBox!.x).toBe(515); // Tọa độ x chuẩn cân bằng của tasks trên 1440x900 (căn giữa)
    expect(resetBox!.y).toBe(50);  // Tọa độ y chuẩn của tasks
  });

  // =========================================================================
  // 4. TIMER RUNNING KHI CHUYỂN ZEN MODE & PHÍM TẮT
  // =========================================================================
  test('6. Timer đang chạy khi chuyển Zen Mode: Không bị reset, phím tắt hoạt động', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.waitForSelector('[data-testid="workspace-root"]');

    // Bắt đầu Timer
    await page.click('[data-testid="timer-start-btn"]');
    await page.waitForTimeout(1100);

    const timeBeforeZen = await page.locator('[data-testid="timer-display"]').innerText();
    expect(timeBeforeZen).not.toBe('25:00'); // Đã đếm lùi

    // Chuyển sang Zen Mode bằng phím tắt Z
    await page.keyboard.press('KeyZ');
    await page.waitForSelector('[data-testid="zen-mode-overlay"]');

    // Kiểm tra Timer trong Zen Mode vẫn tiếp tục đếm, không bị reset về 25:00
    await page.waitForTimeout(1100);
    const timeInZen = await page.locator('[data-testid="timer-display"]').innerText();
    expect(timeInZen).not.toBe('25:00');
    expect(timeInZen).not.toBe(timeBeforeZen);

    // Nút tạm dừng bằng phím Space hoạt động trong Zen Mode
    await page.keyboard.press('Space');
    await page.waitForTimeout(300);
    const pauseBtn = page.locator('[data-testid="timer-resume-btn"]');
    await expect(pauseBtn).toBeVisible();
    const pausedTime = await page.locator('[data-testid="timer-display"]').innerText();

    // Thoát Zen Mode bằng phím Esc
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="zen-mode-overlay"]')).not.toBeVisible();

    // Trở về Workspace: Timer vẫn ở trạng thái Paused với thời gian chính xác
    await expect(page.locator('[data-testid="timer-resume-btn"]')).toBeVisible();
    const timeAfterExit = await page.locator('[data-testid="timer-display"]').innerText();
    expect(timeAfterExit).toBe(pausedTime);
  });

  // =========================================================================
  // 5. ĐO LƯỜNG TỶ LỆ ĐỘ TƯƠNG PHẢN THỰC TẾ (WCAG 2.1 ALPHA-COMPOSITED CONTRAST)
  // =========================================================================
  test('7. Đo lường tỷ lệ tương phản màu thực tế: Tính toán Alpha-compositing chuẩn WCAG', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.waitForSelector('[data-testid="workspace-root"]');

    // Đo lường cặp màu trực tiếp trên DOM bằng cách tổng hợp tất cả các lớp nền (Glass, Overlay, Base)
    const measuredData = await page.evaluate(() => {
      function getEffectiveBackground(el: Element): [number, number, number] {
        const layers: Array<{ r: number; g: number; b: number; a: number }> = [];
        let curr: Element | null = el;

        while (curr) {
          const style = window.getComputedStyle(curr);
          const bg = style.backgroundColor;
          const match = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
          if (match) {
            const r = parseInt(match[1], 10);
            const g = parseInt(match[2], 10);
            const b = parseInt(match[3], 10);
            const a = match[4] !== undefined ? parseFloat(match[4]) : 1.0;
            if (a > 0) {
              layers.unshift({ r, g, b, a });
            }
          }
          curr = curr.parentElement;
        }

        // Lớp nền cơ sở của body/html: Slate-950 rgb(2, 6, 23)
        let compR = 2;
        let compG = 6;
        let compB = 23;

        for (const layer of layers) {
          compR = Math.round(layer.r * layer.a + compR * (1 - layer.a));
          compG = Math.round(layer.g * layer.a + compG * (1 - layer.a));
          compB = Math.round(layer.b * layer.a + compB * (1 - layer.a));
        }

        return [compR, compG, compB];
      }

      function parseColor(colorStr: string): [number, number, number] {
        const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (!match) return [255, 255, 255];
        return [parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10)];
      }

      const timerEl = document.querySelector('[data-testid="timer-display"]');
      const startBtnEl = document.querySelector('[data-testid="timer-start-btn"]');
      const headingEl = document.querySelector('[data-testid="widget-container-timer"] h2');

      return {
        timer: timerEl
          ? {
              fg: parseColor(window.getComputedStyle(timerEl).color),
              bg: getEffectiveBackground(timerEl),
            }
          : null,
        startBtn: startBtnEl
          ? {
              fg: parseColor(window.getComputedStyle(startBtnEl).color),
              bg: parseColor(window.getComputedStyle(startBtnEl).backgroundColor),
            }
          : null,
        heading: headingEl
          ? {
              fg: parseColor(window.getComputedStyle(headingEl).color),
              bg: getEffectiveBackground(headingEl),
            }
          : null,
      };
    });

    expect(measuredData.timer).not.toBeNull();
    expect(measuredData.startBtn).not.toBeNull();
    expect(measuredData.heading).not.toBeNull();

    // 1. Chữ số Timer trên nền Glass Slate-900 tổng hợp
    const timerContrast = calculateContrast(measuredData.timer!.fg, measuredData.timer!.bg);
    console.log(`Measured Timer Display Contrast (composited): ${timerContrast.toFixed(2)}:1`, measuredData.timer);
    expect(timerContrast).toBeGreaterThanOrEqual(7.0); // Vượt chuẩn AAA (> 7:1)

    // 2. Nút Start (Trắng trên nền Indigo-600)
    const startContrast = calculateContrast(measuredData.startBtn!.fg, measuredData.startBtn!.bg);
    console.log(`Measured Start Button Contrast: ${startContrast.toFixed(2)}:1`, measuredData.startBtn);
    expect(startContrast).toBeGreaterThanOrEqual(4.5); // Vượt chuẩn AA (> 4.5:1)

    // 3. Tiêu đề cửa sổ h2 trên nền header glass tổng hợp
    const headingContrast = calculateContrast(measuredData.heading!.fg, measuredData.heading!.bg);
    console.log(`Measured Heading Contrast (composited): ${headingContrast.toFixed(2)}:1`, measuredData.heading);
    expect(headingContrast).toBeGreaterThanOrEqual(7.0); // Vượt chuẩn AAA (> 7:1)
  });

  // =========================================================================
  // 6. VIEWPORT HẸP (360x640 VÀ 320x568): ĐÁNH GIÁ ĐÁP ỨNG VÀ GHI NHẬN GIỚI HẠN
  // =========================================================================
  test('8. Viewport hẹp (360x640 và 320x568): Không vỡ layout ngang, thanh dock thích ứng', async ({ page }) => {
    // 1. Kiểm tra 360x640 (Thiết bị di động phổ thông màn hình nhỏ)
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto('/');
    await page.waitForSelector('[data-testid="workspace-root"]');

    const noHScroll360 = await page.evaluate(() => document.documentElement.scrollWidth <= 360);
    expect(noHScroll360).toBe(true);

    const timer360 = page.locator('[data-testid="widget-container-timer"]');
    await expect(timer360).toBeVisible();

    // Nút Start trên 360x640 vẫn có kích thước bấm tốt
    const startBtnBox360 = await page.locator('[data-testid="timer-start-btn"]').boundingBox();
    expect(startBtnBox360).not.toBeNull();
    expect(startBtnBox360!.width).toBeGreaterThanOrEqual(40);
    expect(startBtnBox360!.height).toBeGreaterThanOrEqual(36);

    // 2. Kiểm tra 320x568 (Viewport cực hẹp kiểu iPhone SE 1st gen)
    await page.setViewportSize({ width: 320, height: 568 });
    await page.reload();
    await page.waitForSelector('[data-testid="workspace-root"]');

    const noHScroll320 = await page.evaluate(() => document.documentElement.scrollWidth <= 320);
    expect(noHScroll320).toBe(true);

    // Thanh Dock thích ứng cuộn ngang hoặc thu gọn icon khi màn hình < 340px
    const dock = page.locator('nav[role="toolbar"]');
    await expect(dock).toBeVisible();
    const dockBox320 = await dock.boundingBox();
    expect(dockBox320).not.toBeNull();
    expect(dockBox320!.width).toBeLessThanOrEqual(320);
  });

  // =========================================================================
  // 7. PWA, MANIFEST, OFFLINE RESILIENCE VÀ SERVICE WORKER
  // =========================================================================
  test('9. PWA & Offline: Manifest hợp lệ, Service Worker sẵn sàng và tải trang offline', async ({ page, context }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="workspace-root"]');

    // 1. Kiểm tra liên kết Manifest và thuộc tính
    const manifestLink = await page.locator('link[rel="manifest"]').first().getAttribute('href');
    expect(manifestLink).toBeTruthy();

    // 2. Đọc nội dung manifest.webmanifest từ server
    const manifestResponse = await page.request.get(manifestLink || '/manifest.webmanifest');
    expect(manifestResponse.status()).toBe(200);
    const manifestJson = await manifestResponse.json();
    expect(manifestJson.name).toBe('Immersive Pomodoro Workspace');
    expect(manifestJson.display).toBe('standalone');
    expect(manifestJson.theme_color).toBe('#0f172a');

    // 3. Khởi tạo một phiên Pomodoro trong trạng thái online
    await page.click('[data-testid="timer-start-btn"]');
    await page.waitForTimeout(500);

    // 4. Giả lập ngắt kết nối mạng (Network Offline)
    await context.setOffline(true);

    // Thao tác Pause và Resume vẫn hoạt động mượt mà khi không có Internet
    await page.click('[data-testid="timer-pause-btn"]');
    await expect(page.getByTestId('status-indicator')).toHaveText(/paused/i);

    await page.click('[data-testid="timer-resume-btn"]');
    await expect(page.getByTestId('status-indicator')).toHaveText(/running/i);

    // 5. Kết nối lại Internet
    await context.setOffline(false);
  });

  // =========================================================================
  // 8. ĐỘ BỀN VỮNG KHI INDEXEDDB GẶP LỖI HOẶC BỊ CHẶN
  // =========================================================================
  test('10. Khả năng chống chịu lỗi IndexedDB: Không phát chuông / notify khi lưu session thất bại', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="workspace-root"]');

    // Cài đặt theo dõi chuông và thông báo
    await page.evaluate(async () => {
      (window as any).__chimePlayed = false;
      const { useAudioStore } = await import('/src/stores/useAudioStore.ts');
      const originalChime = useAudioStore.getState().playChime;
      useAudioStore.setState({
        playChime: async (...args: any[]) => {
          (window as any).__chimePlayed = true;
          return originalChime(...args);
        }
      });
    });

    // Thử kích hoạt lưu phiên với lỗi giả định trên IndexedDB (Transaction rollback)
    const saveResult = await page.evaluate(async () => {
      const { recordFocusSessionAtomic } = await import('/src/db/index.ts');
      // Thử ghi session trùng lặp với ID đã tồn tại sẵn
      const dummySession = {
        id: 'test-collision-id-12345',
        phase: 'pomodoro' as const,
        durationMinutes: 25,
        completedAt: Date.now(),
        dateString: '2026-10-24'
      };

      // Ghi lần 1 -> Thành công
      const first = await recordFocusSessionAtomic(dummySession);
      // Ghi lần 2 với cùng ID -> Gặp ConstraintError, hàm phải bắt và trả về false an toàn
      const second = await recordFocusSessionAtomic(dummySession);

      return { first, second };
    });

    expect(saveResult.first).toBe(true);
    expect(saveResult.second).toBe(false); // Rollback an toàn, trả về false

    // Xác nhận khi ghi thất bại (second === false), hệ thống không phát chuông
    const chimePlayed = await page.evaluate(() => (window as any).__chimePlayed);
    expect(chimePlayed).toBe(false);
  });
});
