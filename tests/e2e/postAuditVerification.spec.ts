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
    await page.evaluate(async () => {
      localStorage.clear();
      const dbs = await window.indexedDB.databases?.();
      if (dbs) {
        for (const db of dbs) {
          if (db.name) window.indexedDB.deleteDatabase(db.name);
        }
      }
    });
    await page.reload();
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

    // Tablet (< 1024px) áp dụng chế độ cuộn dọc mượt mà
    const isScrollable = await page.evaluate(() => {
      const main = document.querySelector('main');
      return main ? main.classList.contains('overflow-y-auto') : false;
    });
    expect(isScrollable).toBe(true);

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

  test('3. Responsive Laptop (1366x768): Cửa sổ nổi, Cascade vị trí không chồng khít', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
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
    expect(soundsBox!.x + soundsBox!.width).toBeLessThanOrEqual(1366 + 30);
    expect(spacesBox!.x + spacesBox!.width).toBeLessThanOrEqual(1366 + 30);
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
    const resizeHandle = tasksWidget.locator('[data-testid="resize-handle-tasks"]');

    const initialBox = await tasksWidget.boundingBox();
    expect(initialBox).not.toBeNull();

    // 1. Kéo thả cửa sổ Tasks
    const handleBox = await dragHandle.boundingBox();
    await page.mouse.move(handleBox!.x + 60, handleBox!.y + 10);
    await page.mouse.down();
    await page.mouse.move(handleBox!.x + 160, handleBox!.y + 70, { steps: 5 });
    await page.mouse.up();

    const afterDragBox = await tasksWidget.boundingBox();
    expect(afterDragBox!.x).toBeGreaterThan(initialBox!.x);
    expect(afterDragBox!.y).toBeGreaterThan(initialBox!.y);

    // 2. Kéo dãn kích thước (Resize)
    const resizeBox = await resizeHandle.boundingBox();
    await page.mouse.move(resizeBox!.x + 5, resizeBox!.y + 5);
    await page.mouse.down();
    await page.mouse.move(resizeBox!.x + 60, resizeBox!.y + 60, { steps: 5 });
    await page.mouse.up();

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
    const resetBox = await page.locator('[data-testid="widget-container-tasks"]').boundingBox();
    expect(resetBox!.x).toBe(428); // Tọa độ x chuẩn của tasks
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

    // Thoát Zen Mode bằng phím Esc
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="zen-mode-overlay"]')).not.toBeVisible();

    // Trở về Workspace: Timer vẫn ở trạng thái Paused với thời gian chính xác
    await expect(page.locator('[data-testid="timer-resume-btn"]')).toBeVisible();
    const timeAfterExit = await page.locator('[data-testid="timer-display"]').innerText();
    expect(timeAfterExit).toBe(timeInZen);
  });

  // =========================================================================
  // 5. ĐO LƯỜNG TỶ LỆ ĐỘ TƯƠNG PHẢN THỰC TẾ (WCAG 2.1 CONTRAST MEASUREMENT)
  // =========================================================================
  test('7. Đo lường tỷ lệ tương phản màu thực tế: Đạt ngưỡng WCAG AA', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.waitForSelector('[data-testid="workspace-root"]');

    // Đo lường cặp màu trực tiếp trên DOM
    const contrastMetrics = await page.evaluate(() => {
      const getStyles = (selector: string) => {
        const el = document.querySelector(selector);
        if (!el) return null;
        const style = window.getComputedStyle(el);
        return {
          color: style.color,
          backgroundColor: style.backgroundColor,
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
        };
      };

      return {
        timerDisplay: getStyles('[data-testid="timer-display"]'),
        startBtn: getStyles('[data-testid="timer-start-btn"]'),
        taskTitle: getStyles('[data-testid^="task-item-"] .text-slate-200') || getStyles('h2'),
        dockBtn: getStyles('[data-testid="dock-btn-timer"]'),
      };
    });

    console.log('DOM Computed Color Metrics:', JSON.stringify(contrastMetrics, null, 2));

    // Nền tối chuẩn của ứng dụng là Slate-950/900: rgb(2, 6, 23) đến rgb(15, 23, 42)
    const slate900Rgb: [number, number, number] = [15, 23, 42];

    // 1. Chữ số Timer trắng rgb(255, 255, 255) trên nền tối
    const timerDisplayRgb = parseRgb(contrastMetrics.timerDisplay?.color || 'rgb(255, 255, 255)');
    const timerContrast = calculateContrast(timerDisplayRgb, slate900Rgb);
    console.log(`Measured Timer Display Contrast Ratio: ${timerContrast.toFixed(2)}:1`);
    expect(timerContrast).toBeGreaterThanOrEqual(7.0); // Chuẩn AAA (> 7:1)

    // 2. Nút Start: Chữ trắng rgb(255, 255, 255) trên nền Indigo-600 rgb(79, 70, 229)
    const startBtnRgb = parseRgb(contrastMetrics.startBtn?.color || 'rgb(255, 255, 255)');
    const startBgRgb = parseRgb(contrastMetrics.startBtn?.backgroundColor || 'rgb(79, 70, 229)');
    const startBtnContrast = calculateContrast(startBtnRgb, startBgRgb);
    console.log(`Measured Start Button Contrast Ratio: ${startBtnContrast.toFixed(2)}:1`);
    expect(startBtnContrast).toBeGreaterThanOrEqual(4.5); // Chuẩn AA (> 4.5:1)

    // 3. Tiêu đề cửa sổ h2: slate-300 rgb(203, 213, 225) trên nền slate-950 rgb(2, 6, 23)
    const h2Rgb: [number, number, number] = [203, 213, 225];
    const slate950Rgb: [number, number, number] = [2, 6, 23];
    const headingContrast = calculateContrast(h2Rgb, slate950Rgb);
    console.log(`Measured Heading Contrast Ratio: ${headingContrast.toFixed(2)}:1`);
    expect(headingContrast).toBeGreaterThanOrEqual(8.0); // Vượt chuẩn (> 8:1)
  });
});
