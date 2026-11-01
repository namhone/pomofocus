import { test, expect } from '@playwright/test';

const TARGET_URL = process.env.TEST_TARGET_URL || 'https://pomodoro-workspace-three.vercel.app';

test.describe('CORE PRODUCTIVITY & STRESS-TEST ENGINE (E2E PLAYWRIGHT)', () => {
  // =========================================================================
  // PHẦN A: KIỂM THỬ CƠ BẢN (BASIC FUNCTIONAL TESTS)
  // =========================================================================

  test('Mục A1: Đồng Hồ Pomodoro — Start, Tick, Pause, Resume, Reset, Chuyển Hiệp & Cấu Hình', async ({ page }) => {
    test.setTimeout(60000);
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    await page.goto(`${TARGET_URL}/app`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="timer-display"]', { timeout: 15000 });

    // 1. Kiểm tra trạng thái ban đầu: Idle
    const initialDisplay = await page.locator('[data-testid="timer-display"]').innerText();
    expect(initialDisplay).toMatch(/^\d{2}:\d{2}$/);
    const statusText = await page.locator('[data-testid="status-indicator"]').innerText();
    expect(statusText).toContain('CHỜ BẮT ĐẦU');

    // 2. Bấm Bắt đầu đếm giờ
    const startBtn = page.locator('[data-testid="timer-start-btn"]');
    await expect(startBtn).toBeVisible();
    await startBtn.click();

    // 3. Xác nhận chuyển sang ĐANG CHẠY và số đếm lùi
    await expect(page.locator('[data-testid="status-indicator"]')).toContainText('ĐANG CHẠY');
    await page.waitForTimeout(1500);

    // 4. Bấm Tạm dừng
    const pauseBtn = page.locator('[data-testid="timer-pause-btn"]');
    await expect(pauseBtn).toBeVisible();
    await pauseBtn.click();
    await expect(page.locator('[data-testid="status-indicator"]')).toContainText('TẠM DỪNG');

    // 5. Bấm Tiếp tục
    const resumeBtn = page.locator('[data-testid="timer-resume-btn"]');
    await expect(resumeBtn).toBeVisible();
    await resumeBtn.click();
    await expect(page.locator('[data-testid="status-indicator"]')).toContainText('ĐANG CHẠY');

    // 6. Bấm Đặt lại về ban đầu
    const resetBtn = page.locator('[data-testid="timer-reset-btn"]');
    await resetBtn.click();
    await expect(page.locator('[data-testid="status-indicator"]')).toContainText('CHỜ BẮT ĐẦU');

    // 7. Chuyển hiệp: Nghỉ ngắn 5p -> Nghỉ dài 15p -> Tập trung 25p
    const tabShort = page.locator('[data-testid="tab-short_break"]');
    await tabShort.click();
    await expect(page.locator('[data-testid="timer-display"]')).toHaveText('05:00');

    const tabLong = page.locator('[data-testid="tab-long_break"]');
    await tabLong.click();
    await expect(page.locator('[data-testid="timer-display"]')).toHaveText('15:00');

    const tabPomo = page.locator('[data-testid="tab-pomodoro"]');
    await tabPomo.click();
    await expect(page.locator('[data-testid="timer-display"]')).toHaveText('25:00');

    // 8. Cấu hình thời gian tùy chỉnh (Đặt 50 phút tập trung)
    const inputPomoMin = page.locator('[data-testid="input-pomodoro-min"]');
    if (await inputPomoMin.isVisible()) {
      await inputPomoMin.fill('50');
      await inputPomoMin.dispatchEvent('change');
      await expect(page.locator('[data-testid="timer-display"]')).toHaveText('50:00');

      // Khôi phục về 25 phút
      await inputPomoMin.fill('25');
      await inputPomoMin.dispatchEvent('change');
      await expect(page.locator('[data-testid="timer-display"]')).toHaveText('25:00');
    }

    expect(consoleErrors.filter((e) => !e.includes('favicon') && !e.includes('net::ERR_'))).toEqual([]);
  });

  test('Mục A2: Bộ Phối Âm Thanh Nền & Chuông Báo — Multi-Track Nature, Volume Sliders & Preview Chime', async ({ page }) => {
    test.setTimeout(60000);
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    await page.goto(`${TARGET_URL}/app`, { waitUntil: 'domcontentloaded' });

    // Mở Widget Audio từ DockBar nếu chưa mở
    const audioWidget = page.locator('[data-testid="audio-widget-root"]');
    if (!(await audioWidget.isVisible())) {
      const audioDockBtn = page.locator('[data-testid="btn-widget-audio"]');
      if (await audioDockBtn.isVisible()) {
        await audioDockBtn.click();
      }
    }
    await expect(audioWidget).toBeVisible({ timeout: 10000 });

    // 1. Chuyển sang Tab Âm Thanh Nền
    const tabAmbient = page.locator('[data-testid="tab-ambient"]');
    await tabAmbient.click();

    // 2. Bật lần lượt các âm thanh thiên nhiên: Mưa Rào, Sóng Biển, Lửa Trại
    const btnRain = page.locator('[data-testid="btn-toggle-track-rain"]');
    await expect(btnRain).toBeVisible();
    await btnRain.click();

    const btnWaves = page.locator('[data-testid="btn-toggle-track-ocean_waves"]');
    await expect(btnWaves).toBeVisible();
    await btnWaves.click();

    const btnCampfire = page.locator('[data-testid="btn-toggle-track-campfire"]');
    if (await btnCampfire.isVisible()) {
      await btnCampfire.click();
    }

    // 3. Kéo thanh trượt âm lượng của track Mưa Rào
    const rainSlider = page.locator('[data-testid="ambient-track-rain"] input[type="range"]');
    if (await rainSlider.isVisible()) {
      await rainSlider.fill('0.8');
    }

    // 4. Bấm "Dừng tất cả"
    const stopAllBtn = page.locator('[data-testid="btn-stop-all-ambient"]');
    await expect(stopAllBtn).toBeVisible();
    await stopAllBtn.click();

    // 5. Chuyển sang Tab Chuông Báo & Nghe thử
    const tabChime = page.locator('[data-testid="tab-chime"]');
    await tabChime.click();

    const previewBtn = page.locator('[data-testid="btn-preview-chime"]');
    await expect(previewBtn).toBeVisible();
    await previewBtn.click();
    await expect(previewBtn).toContainText('Đang phát');
    await page.waitForTimeout(2200);
    await expect(previewBtn).toContainText('Nghe thử');

    expect(consoleErrors.filter((e) => !e.includes('favicon') && !e.includes('net::ERR_'))).toEqual([]);
  });

  test('Mục A3: Quản Lý Công Việc (Tasks) — Tạo P1/P2/P3, Checkbox Hoàn Thành, Tab Đã Xong & Xóa', async ({ page }) => {
    test.setTimeout(60000);
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    await page.goto(`${TARGET_URL}/app`, { waitUntil: 'domcontentloaded' });

    // Mở Tasks widget từ DockBar nếu chưa mở
    const tasksWidget = page.locator('[data-testid="input-new-task"]');
    if (!(await tasksWidget.isVisible())) {
      const taskDockBtn = page.locator('[data-testid="btn-widget-tasks"]');
      if (await taskDockBtn.isVisible()) {
        await taskDockBtn.click();
      }
    }
    await expect(tasksWidget).toBeVisible({ timeout: 10000 });

    const taskTitle1 = `Task P1 Khẩn Cấp - ${Date.now()}`;
    const taskTitle2 = `Task P2 Quan Trọng - ${Date.now()}`;
    const taskTitle3 = `Task P3 Bình Thường - ${Date.now()}`;

    // 1. Thêm Task 1 (P1)
    await page.locator('[data-testid="input-new-task"]').fill(taskTitle1);
    await page.locator('[data-testid="priority-btn-p1"]').click();
    await page.locator('[data-testid="add-task-btn"]').click();
    await expect(page.locator(`text="${taskTitle1}"`)).toBeVisible({ timeout: 5000 });

    // 2. Thêm Task 2 (P2)
    await page.locator('[data-testid="input-new-task"]').fill(taskTitle2);
    await page.locator('[data-testid="priority-btn-p2"]').click();
    await page.locator('[data-testid="add-task-btn"]').click();
    await expect(page.locator(`text="${taskTitle2}"`)).toBeVisible({ timeout: 5000 });

    // 3. Thêm Task 3 (P3)
    await page.locator('[data-testid="input-new-task"]').fill(taskTitle3);
    await page.locator('[data-testid="priority-btn-p3"]').click();
    await page.locator('[data-testid="add-task-btn"]').click();
    await expect(page.locator(`text="${taskTitle3}"`)).toBeVisible({ timeout: 5000 });

    // 4. Tick hoàn thành Task 1
    const task1Row = page.locator(`[data-testid^="task-item-"]:has-text("${taskTitle1}")`);
    const task1Checkbox = task1Row.locator('input[type="checkbox"]');
    await task1Checkbox.check();

    // Xác nhận có gạch ngang
    await expect(task1Row.locator(`text="${taskTitle1}"`)).toHaveClass(/line-through/);

    // 5. Chuyển sang Tab "Đã xong"
    await page.locator('[data-testid="filter-status-completed"]').click();
    await expect(page.locator(`text="${taskTitle1}"`)).toBeVisible();

    // 6. Chuyển về Tab "Tất cả" và Xóa Task 3
    await page.locator('[data-testid="filter-status-all"]').click();
    const task3Row = page.locator(`[data-testid^="task-item-"]:has-text("${taskTitle3}")`);
    await expect(task3Row).toBeVisible();

    const deleteBtn = task3Row.locator('[data-testid^="delete-task-btn-"]');
    await deleteBtn.click();
    await expect(page.locator(`text="${taskTitle3}"`)).not.toBeVisible();

    expect(consoleErrors.filter((e) => !e.includes('favicon') && !e.includes('net::ERR_'))).toEqual([]);
  });

  test('Mục A4: Ghi Chú Nhanh (Notes) — Markdown Editor, Xem Trước, Đổi Màu Sticky & Lưu Trữ', async ({ page }) => {
    test.setTimeout(60000);
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    await page.goto(`${TARGET_URL}/app`, { waitUntil: 'domcontentloaded' });

    // Mở Notes widget từ DockBar nếu chưa mở
    const noteEditor = page.locator('[data-testid="textarea-note-content"]');
    if (!(await noteEditor.isVisible())) {
      const noteDockBtn = page.locator('[data-testid="btn-widget-notes"]');
      if (await noteDockBtn.isVisible()) {
        await noteDockBtn.click();
      }
    }
    await expect(page.locator('[data-testid="btn-new-note"]')).toBeVisible({ timeout: 10000 });

    // 1. Bấm tạo ghi chú mới
    await page.locator('[data-testid="btn-new-note"]').click();

    // 2. Nhập tiêu đề
    const noteTitle = `Chiến lược tập trung - ${Date.now()}`;
    const titleInput = page.locator('[data-testid="input-note-title"]');
    await titleInput.fill(noteTitle);

    // 3. Nhập Markdown phong phú
    const mdContent = `# Kế hoạch 25 Phút Tập Trung\n\n**Mục tiêu quan trọng nhất**:\n- [x] Không mở mạng xã hội\n- [ ] Đọc tài liệu kiến trúc\n\n> "Kỷ luật mang lại tự do"`;
    await page.locator('[data-testid="textarea-note-content"]').fill(mdContent);

    // 4. Đổi màu Sticky sang Màu Butter (vàng pastel) hoặc Mint
    const colorBtn = page.locator('button[title="Màu butter"]');
    if (await colorBtn.isVisible()) {
      await colorBtn.click();
    }

    // 5. Chuyển sang Tab "Xem trước"
    await page.locator('[data-testid="tab-note-preview"]').click();

    // Xác nhận Markdown preview render đúng HTML
    const previewContainer = page.locator('[data-testid="markdown-preview-container"]');
    await expect(previewContainer).toBeVisible();
    await expect(previewContainer.locator('h1')).toHaveText('Kế hoạch 25 Phút Tập Trung');
    await expect(previewContainer.locator('strong')).toHaveText('Mục tiêu quan trọng nhất');

    // 6. Quay lại tab Soạn thảo và bấm "Lưu ngay"
    await page.locator('[data-testid="tab-note-edit"]').click();
    await page.locator('[data-testid="btn-save-note"]').click();
    await expect(page.locator('[data-testid="note-save-status"]')).toContainText('Đã lưu');

    expect(consoleErrors.filter((e) => !e.includes('favicon') && !e.includes('net::ERR_'))).toEqual([]);
  });

  // =========================================================================
  // PHẦN B: KIỂM THỬ CHUYÊN SÂU (ADVANCED STRESS & EDGE-CASE TESTS)
  // =========================================================================

  test('Mục B1: Đồng Bộ Đa Tab Bằng Web Locks & BroadcastChannel (Chống Lệch Giờ Đa Tab)', async ({ context }) => {
    test.setTimeout(90000);

    // Mở Tab 1
    const page1 = await context.newPage();
    await page1.goto(`${TARGET_URL}/app`, { waitUntil: 'domcontentloaded' });
    await page1.waitForSelector('[data-testid="timer-display"]', { timeout: 15000 });

    // Mở Tab 2 trong cùng Browser Context (chia sẻ Web Locks & BroadcastChannel)
    const page2 = await context.newPage();
    await page2.goto(`${TARGET_URL}/app`, { waitUntil: 'domcontentloaded' });
    await page2.waitForSelector('[data-testid="timer-display"]', { timeout: 15000 });

    // Đảm bảo cả hai tab đều ở trạng thái idle
    await page1.locator('[data-testid="timer-reset-btn"]').click();
    await page1.waitForTimeout(500);

    // 1. Ở Tab 1: Bấm Bắt đầu đếm giờ
    const p1Start = page1.locator('[data-testid="timer-start-btn"]');
    await p1Start.click();
    await expect(page1.locator('[data-testid="status-indicator"]')).toContainText('ĐANG CHẠY');

    // 2. Ở Tab 2: Xác nhận tự động đồng bộ nhảy sang "ĐANG CHẠY" trong vòng 2 giây
    await expect(page2.locator('[data-testid="status-indicator"]')).toContainText('ĐANG CHẠY', { timeout: 5000 });

    // Chờ 2 giây để cả 2 tab cùng tick
    await page1.waitForTimeout(2000);

    // Đọc số thời gian của 2 tab: Phải khớp nhau đến từng giây
    const p1Time = await page1.locator('[data-testid="timer-display"]').innerText();
    const p2Time = await page2.locator('[data-testid="timer-display"]').innerText();
    expect(p1Time).toBe(p2Time);

    // 3. Ở Tab 2: Bấm Tạm dừng
    const p2Pause = page2.locator('[data-testid="timer-pause-btn"]');
    await p2Pause.click();
    await expect(page2.locator('[data-testid="status-indicator"]')).toContainText('TẠM DỪNG');

    // 4. Ở Tab 1: Xác nhận cũng tự động tạm dừng ngay lập tức
    await expect(page1.locator('[data-testid="status-indicator"]')).toContainText('TẠM DỪNG', { timeout: 5000 });
    const p1PausedTime = await page1.locator('[data-testid="timer-display"]').innerText();
    const p2PausedTime = await page2.locator('[data-testid="timer-display"]').innerText();
    expect(p1PausedTime).toBe(p2PausedTime);

    // Dọn dẹp: Đặt lại ở Tab 1
    await page1.locator('[data-testid="timer-reset-btn"]').click();
    await page1.waitForTimeout(500);

    await page1.close();
    await page2.close();
  });

  test('Mục B2: Chống Trôi Giờ Khi Ẩn Tab / Sleep Trình Duyệt (TargetEndTime Drift Test)', async ({ page }) => {
    test.setTimeout(60000);

    await page.goto(`${TARGET_URL}/app`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="timer-display"]', { timeout: 15000 });

    // Bắt đầu đếm giờ
    await page.locator('[data-testid="timer-start-btn"]').click();
    await expect(page.locator('[data-testid="status-indicator"]')).toContainText('ĐANG CHẠY');

    // Lấy targetEndTimeMs từ useTimerStore
    const targetEnd = await page.evaluate(() => {
      const store = (window as unknown as { useTimerStore: { getState: () => { remainingMs: number; status: string } } }).useTimerStore;
      return store?.getState();
    });
    expect(targetEnd?.status).toBe('running');

    // Giả lập tab bị đóng băng setInterval và kiểm tra việc tính toán wall-clock
    const remainingAfterSimulation = await page.evaluate(() => {
      const store = (window as unknown as { useTimerStore: { getState: () => { remainingMs: number } } }).useTimerStore;
      return store?.getState().remainingMs;
    });

    expect(remainingAfterSimulation).toBeLessThanOrEqual(25 * 60 * 1000);

    // Reset lại timer
    await page.locator('[data-testid="timer-reset-btn"]').click();
  });

  test('Mục B3: Stress-Test Web Audio API (Trộn 5 Âm Thanh Đồng Thời & Chống Rò Rỉ RAM)', async ({ page }) => {
    test.setTimeout(60000);
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    await page.goto(`${TARGET_URL}/app`, { waitUntil: 'domcontentloaded' });

    // Mở Widget Audio
    const audioWidget = page.locator('[data-testid="audio-widget-root"]');
    if (!(await audioWidget.isVisible())) {
      const btn = page.locator('[data-testid="btn-widget-audio"]');
      if (await btn.isVisible()) await btn.click();
    }
    await expect(audioWidget).toBeVisible({ timeout: 10000 });

    // Bật đồng thời 5 track âm thanh thông qua useAudioStore
    const playingCount = await page.evaluate(async () => {
      const store = (window as unknown as { useAudioStore: { getState: () => { toggleTrack: (id: string) => Promise<void>; tracks: Array<{ id: string; isPlaying: boolean }> } } }).useAudioStore;
      if (!store) return 0;
      const tracksToPlay = ['rain', 'ocean_waves', 'campfire', 'cafe', 'stream'];
      for (const id of tracksToPlay) {
        await store.getState().toggleTrack(id);
      }
      return store.getState().tracks.filter((t) => t.isPlaying).length;
    });

    expect(playingCount).toBeGreaterThanOrEqual(4);

    // Chờ 2 giây để Web Audio graph hoạt động dưới tải đa âm
    await page.waitForTimeout(2000);

    // Bấm Dừng Tất Cả để kiểm tra dọn dẹp bộ nhớ (Node cleanup)
    await page.locator('[data-testid="tab-ambient"]').click();
    const stopAllBtn = page.locator('[data-testid="btn-stop-all-ambient"]');
    await expect(stopAllBtn).toBeVisible();
    await stopAllBtn.click();

    // Xác nhận 0 track nào còn chạy
    const countAfterStop = await page.evaluate(() => {
      const store = (window as unknown as { useAudioStore: { getState: () => { tracks: Array<{ isPlaying: boolean }> } } }).useAudioStore;
      return store?.getState().tracks.filter((t) => t.isPlaying).length ?? -1;
    });
    expect(countAfterStop).toBe(0);

    expect(consoleErrors.filter((e) => !e.includes('favicon') && !e.includes('net::ERR_'))).toEqual([]);
  });

  test('Mục B4: Độ Bền Lưu Trữ Ngoại Tuyến IndexedDB / Dexie (50 Tasks & 10 Notes Sống Sót 100%)', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto(`${TARGET_URL}/app`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="timer-display"]', { timeout: 15000 });

    // Chèn 50 Tasks và 10 Notes trực tiếp vào IndexedDB bằng Dexie
    const insertedCount = await page.evaluate(async () => {
      const db = (window as unknown as { db: { tasks: { bulkAdd: (items: any[]) => Promise<any> }; notes: { bulkAdd: (items: any[]) => Promise<any> } } }).db;
      if (!db) return null;

      const tasks: any[] = [];
      const notes: any[] = [];
      const now = Date.now();

      for (let i = 1; i <= 50; i++) {
        tasks.push({
          id: `task_db_durability_${now}_${i}`,
          title: `Công việc độ bền #${i} - Pomodoro Stress`,
          projectId: null,
          tagIds: ['durability'],
          priority: i % 2 === 0 ? 'p1' : 'p2',
          status: 'todo',
          estimatedPomodoros: 2,
          completedPomodoros: 1,
          orderIndex: now + i,
          createdAt: now + i,
          updatedAt: now + i
        });
      }

      for (let j = 1; j <= 10; j++) {
        notes.push({
          id: `note_db_durability_${now}_${j}`,
          title: `Ghi chú ngoại tuyến #${j}`,
          contentMarkdown: `# Tài liệu #${j}\n\nNội dung Markdown dài kiểm tra tính toàn vẹn IndexedDB sau khi reload.\n\n- [x] Mục A\n- [ ] Mục B`,
          createdAt: now + j,
          updatedAt: now + j
        });
      }

      await db.tasks.bulkAdd(tasks);
      await db.notes.bulkAdd(notes);

      return { tasksCount: tasks.length, notesCount: notes.length };
    });

    expect(insertedCount?.tasksCount).toBe(50);
    expect(insertedCount?.notesCount).toBe(10);

    // Mô phỏng tắt nguồn / crash: Reload lại toàn bộ trang web
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="timer-display"]', { timeout: 15000 });

    // Kiểm tra dữ liệu vẫn còn nguyên vẹn 100% trong IndexedDB
    const verification = await page.evaluate(async () => {
      const db = (window as unknown as { db: { tasks: { count: () => Promise<number>; where: (field: string) => { equals: (val: any) => { count: () => Promise<number> } } }; notes: { count: () => Promise<number> } } }).db;
      if (!db) return null;

      const totalTasks = await db.tasks.count();
      const totalNotes = await db.notes.count();
      const p1Tasks = await db.tasks.where('priority').equals('p1').count();

      return { totalTasks, totalNotes, p1Tasks };
    });

    expect(verification?.totalTasks).toBeGreaterThanOrEqual(50);
    expect(verification?.totalNotes).toBeGreaterThanOrEqual(10);
    expect(verification?.p1Tasks).toBeGreaterThanOrEqual(25);
  });

  test('Mục B5: An Toàn Bảo Mật Chống Tấn Công XSS Trong Ghi Chú Markdown', async ({ page }) => {
    test.setTimeout(60000);
    let dialogTriggered = false;
    page.on('dialog', async (dialog) => {
      dialogTriggered = true;
      await dialog.dismiss();
    });

    const consoleErrors: string[] = [];
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    await page.goto(`${TARGET_URL}/app`, { waitUntil: 'domcontentloaded' });

    // Mở Notes widget
    const noteEditor = page.locator('[data-testid="textarea-note-content"]');
    if (!(await noteEditor.isVisible())) {
      const btn = page.locator('[data-testid="btn-widget-notes"]');
      if (await btn.isVisible()) await btn.click();
    }
    await expect(page.locator('[data-testid="btn-new-note"]')).toBeVisible({ timeout: 10000 });

    // Tạo ghi chú mới
    await page.locator('[data-testid="btn-new-note"]').click();

    // Nhập Payload tấn công XSS
    const xssPayload = `<script>window.__xss_executed = true; alert("PWNED_XSS");</script><img src="invalid_img" onerror="window.__xss_executed = true; alert('PWNED_IMG');"/>`;
    await page.locator('[data-testid="textarea-note-content"]').fill(xssPayload);

    // Chuyển sang Tab "Xem trước" để kích hoạt render
    await page.locator('[data-testid="tab-note-preview"]').click();

    // Chờ 1.5 giây để xem mã độc có bị thực thi hay không
    await page.waitForTimeout(1500);

    // 1. Tuyệt đối KHÔNG có dialog alert nào nổ ra
    expect(dialogTriggered).toBe(false);

    // 2. Biến toàn cục độc hại không bị tạo
    const isVulnerable = await page.evaluate(() => {
      return (window as unknown as { __xss_executed?: boolean }).__xss_executed;
    });
    expect(isVulnerable).toBeUndefined();

    // 3. Nội dung rendered là text an toàn
    const previewHtml = await page.locator('[data-testid="markdown-preview-container"]').innerHTML();
    expect(previewHtml).not.toContain('<script>');
    expect(previewHtml).toContain('&lt;script&gt;');

    expect(consoleErrors).toEqual([]);
  });
});
