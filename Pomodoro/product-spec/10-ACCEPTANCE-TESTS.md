# 10 — ACCEPTANCE TESTS (BỘ KỊCH BẢN KIỂM THỬ CHẤP NHẬN ĐÃ CƯỜNG HÓA V3)

> **Mục tiêu:** Cung cấp bộ kịch bản kiểm thử chấp nhận có điều kiện đo lường cụ thể, tái lập được trên trình duyệt thật (Playwright E2E) và Vitest. Bắt buộc đạt **100% Pass Rate** cho toàn bộ các bài test của Core MVP; không chấp nhận bỏ qua lỗi hoặc test flaky.

---

## 1. Bộ Kiểm Thử Ngoại Tuyến Trình Duyệt Thật (Playwright E2E Offline Suite)

### TC-E2E-OFF-01: Kiểm Thử Vòng Đời Ngoại Tuyến Toàn Diện (Full Offline PWA Lifecycle)
- **Môi trường đo lường:** Playwright chạy trên Chromium và Firefox giả lập mạng.
- **Tệp mã nguồn kiểm thử:** `tests/e2e/offlineAppShell.spec.ts`
- **Kịch bản tự động:**
  ```typescript
  test('Khởi động, ngắt mạng, reload và thao tác nghiệp vụ trơn tru', async ({ context, page }) => {
    // 1. Mở trang lần đầu có mạng
    await page.goto('/');
    // 2. Chờ Service Worker kích hoạt
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
    
    // 3. Giả lập ngắt mạng hoàn toàn
    await context.setOffline(true);
    
    // 4. Reload trang khi mất mạng
    await page.reload();
    await expect(page.locator('text=Pomodoro')).toBeVisible();

    // 5. Thao tác tạo Task mới
    await page.fill('[data-testid="task-input"]', 'Học offline 100%');
    await page.keyboard.press('Enter');
    await expect(page.locator('text=Học offline 100%')).toBeVisible();

    // 6. Bật Timer và kiểm tra chạy đếm lùi
    await page.click('[data-testid="timer-start-btn"]');
    await page.waitForTimeout(2000);
    const title = await page.title();
    expect(title).toMatch(/\d{2}:\d{2}/);

    // 7. Kết nối lại mạng và kiểm tra dữ liệu còn nguyên
    await context.setOffline(false);
    await page.reload();
    await expect(page.locator('text=Học offline 100%')).toBeVisible();
  });
  ```
- **Tiêu chuẩn chấp nhận:** Kiểm thử pass 100% không có lỗi nạp tài nguyên mạng.

---

## 2. Bộ Kiểm Thử Đa Tab & Khóa Nguyên Tử (Web Locks & Multi-Tab Suite)

### TC-E2E-TAB-01: Kiểm Thử Duy Nhất 1 Tab Leader Phát Chuông & Ghi DB
- **Môi trường đo lường:** Playwright mở 3 Page Contexts (`tab1`, `tab2`, `tab3`) cùng origin.
- **Tệp mã nguồn kiểm thử:** `tests/e2e/multiTabLeader.spec.ts`
- **Các bước thực hiện:**
  1. Mở Tab 1 -> Tab 1 yêu cầu giữ Web Lock `pomodoro_timer_leader`.
  2. Mở Tab 2 và Tab 3 -> Cả hai nhận diện lock đã có chủ, chuyển sang chế độ Follower.
  3. Trên Tab 1, đặt timer 2 giây và nhấn `Start`.
  4. Quan sát Tab 2 và Tab 3 -> Nhận tín hiệu qua `BroadcastChannel` và cập nhật đếm lùi đồng bộ.
  5. Khi timer chạm `00:00`:
- **Tiêu chuẩn chấp nhận:**
  - Chỉ duy nhất Tab 1 gọi hàm phát chuông `playChime()`. Tab 2 và Tab 3 ở trạng thái im lặng.
  - Kiểm tra bảng `focus_sessions` trong IndexedDB: **Chỉ có đúng 1 bản ghi duy nhất** cho `sessionId` này (nhờ cơ chế `ConstraintError` chặn đứng thao tác ghi trùng của bất kỳ tab nào khác).

---

## 3. Bộ Kiểm Thử Chống Trôi Lệch Giờ & Can Thiệp Đồng Hồ (Timer Clock Suite)

### TC-TIM-01: Kiểm Thử Sai Số Thời Gian Trong Tab Nền (Background Tab Benchmark)
- **Điều kiện đo lường:** Chạy trên trình duyệt Chrome thực tế, hệ điều hành ở chế độ sử dụng bình thường (không bật chế độ Extreme Battery Saver).
- **Các bước thực hiện:**
  1. Đặt hiệp Pomodoro 10 phút (`10:00`).
  2. Bắt đầu bấm đồng hồ bấm giờ chuẩn bên ngoài đồng thời với nút `Start`.
  3. Thu nhỏ trình duyệt xuống Taskbar và mở ứng dụng khác trong 9 phút 45 giây.
  4. Mở lại tab Pomodoro.
- **Tiêu chuẩn chấp nhận:**
  - Thời gian hiển thị trên giao diện và trên `document.title` chênh lệch không quá **±1.0 giây** so với đồng hồ bấm giờ bên ngoài.

### TC-TIM-02: Kiểm Thử Khôi Phục Khi Người Dùng Đổi Giờ Máy Tính (Clock Skew Recovery)
- **Tệp mã nguồn kiểm thử:** `tests/unit/clockSkew.test.ts`
- **Kịch bản mô phỏng:**
  1. Khởi tạo timer 25 phút.
  2. Can thiệp giả lập: `Date.now()` đột ngột nhảy tiến 10 phút (mô phỏng người dùng chỉnh giờ máy tính) trong khi `performance.now()` chỉ tăng 5 giây.
  3. Kích hoạt nhịp kiểm tra tick.
- **Tiêu chuẩn chấp nhận:**
  - Hệ thống phát hiện chênh lệch `Math.abs(wallDelta - perfDelta) > 2000ms`.
  - Tự động bù trừ lại `targetEndTime` theo delta của `performance.now()`. Timer vẫn đếm chính xác từng giây thực tế mà không bị kết thúc sớm 10 phút.

---

## 4. Bộ Kiểm Thử Âm Thanh & Xử Lý Tài Nguyên (Audio & Memory Suite)

### TC-SND-01: Kiểm Thử Khởi Tạo Bắt Lỗi Autoplay (Graceful Autoplay Handling)
- **Các bước thực hiện:**
  1. Mở trang web trong cửa sổ Incognito (Ẩn danh) mới hoàn toàn.
  2. Quan sát Console trước khi click chuột.
- **Tiêu chuẩn chấp nhận:**
  - Không có bất kỳ dòng log màu đỏ nào báo `Unhandled DOMException`.
  - Giao diện hiển thị biểu tượng âm thanh ở trạng thái chờ mở khóa thân thiện; click chuột kích hoạt âm thanh mượt mà.

### TC-SND-02: Kiểm Thử Bộ Nén Chống Vỡ Tiếng (DynamicsCompressor Anti-Clipping)
- **Các bước thực hiện:**
  1. Bật Master Volume lên `100%`.
  2. Bật cùng lúc 3 track âm thanh môi trường (Rain, Cafe, Keyboard) ở mức 100%.
  3. Kích hoạt chuông báo Timer kêu đồng thời.
- **Tiêu chuẩn chấp nhận:**
  - Âm thanh xuất ra không có hiện tượng méo tiếng hoặc vỡ tiếng (Clipping đỉnh biên độ) nhờ `DynamicsCompressorNode` nén dải động ở mức -6dB.

---

## 5. Bộ Kiểm Thử Sao Lưu & Khôi Phục Dữ Liệu (Backup Integrity Suite)

### TC-BAK-01: Kiểm Thử Xuất & Nhập File JSON (Zero-Data-Loss Backup Test)
- **Tệp mã nguồn kiểm thử:** `tests/unit/backupService.test.ts`
- **Các bước thực hiện:**
  1. Tạo 5 tasks, 2 projects, 3 ghi chú và 4 phiên học lịch sử trong IndexedDB.
  2. Nhấn nút "Xuất dữ liệu dự phòng (.json)".
  3. Kiểm tra tệp JSON được tải về: có đầy đủ version, timestamp, checksum và toàn bộ thực thể.
  4. Mở DevTools > Application > IndexedDB và bấm "Delete database" (xóa sạch toàn bộ dữ liệu).
  5. Tải lại trang web -> Hệ thống trở về trạng thái trống ban đầu.
  6. Nhấn nút "Khôi phục dữ liệu từ file (.json)" và nạp tệp đã xuất ở bước 2.
- **Tiêu chuẩn chấp nhận:**
  - Toàn bộ 5 tasks, 2 projects, 3 ghi chú và 4 phiên học lịch sử được phục hồi nguyên vẹn 100%.
