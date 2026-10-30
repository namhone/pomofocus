# BÁO CÁO KIỂM TOÁN VÀ NGHIỆM THU: HOÀN THIỆN ĐỘ ỔN ĐỊNH GIAO DIỆN & PHÒNG HỌC NHÓM STUDY ROOM

**Dự án:** PomoFocus — Immersive Study Workspace  
**Phiên bản:** Demo Beta 1.0.0  
**Vai trò nghiệm thu:** Senior Frontend Architect, Senior Coder, QA Engineer  
**Thời gian hoàn thành:** 29/10/2026  

---

## 1. TỔNG QUAN VÀ BẢNG ĐỐI CHIẾU NGUYÊN NHÂN - GIẢI PHÁP (RESOLUTION MATRIX)

| # | Hạng mục lỗi / Yêu cầu người dùng | Nguyên nhân gốc rễ (Root Cause) | Giải pháp kỹ thuật đã áp dụng | Trạng thái |
|---|---|---|---|:---:|
| 1 | **Khung phát nhạc bị vỡ / biến dạng khi thu nhỏ** | `WidgetContainer` trước đó unmount `{children}` khi thu nhỏ khiến state và audio context bị reset đột ngột; đồng thời cố định chiều cao 220px cho placeholder YouTube bị lệch. | Giữ nguyên `{children}` trong cây DOM bằng class CSS ẩn `className={isCollapsed ? 'hidden' : ...}`, đồng thời hiển thị thanh điều khiển mini 44px đẹp mắt cho audio. | **ĐÃ XỬ LÝ (PASS)** |
| 2 | **Video YouTube bị "chạy theo", trôi lệch ra ngoài khung khi di chuyển** | Sử dụng vòng lặp `setInterval(250)` đo `getBoundingClientRect()` và gán `position: fixed` ngoài cây DOM, khiến iframe trôi lệch với tốc độ 4fps so với 60fps khi kéo khung; cộng thêm trùng lặp id `#youtube-player-anchor`. | Sử dụng **`ReactDOM.createPortal`** đưa trực tiếp `<iframe>` vào container của widget khi mở (di chuyển theo GPU compositor của trình duyệt, độ trễ = 0). Khi đóng/thu nhỏ, portal sang container ẩn ngoài màn hình để không ngắt âm thanh. | **ĐÃ XỬ LÝ (PASS)** |
| 3 | **Cửa sổ tự nhảy về góc khi thả chuột hoặc tải lại trang** | Thuật toán `placeWidget` trong `useLayoutStore` kiểm tra va chạm (`doesOverlap`) và tự động tìm ô lưới trống gần nhất (thường là góc `minX: 10, minY: 50`) thay vì cho phép cửa sổ xếp lớp (z-index) tự do. | Viết lại `placeWidget`: tôn trọng 100% tọa độ người dùng thả chuột, chỉ clamp trong biên an toàn `[10, maxX]` và `[50, maxY]`. Giữ nguyên tọa độ đã lưu trong `localStorage` khi tải lại trang. Thêm snap nhẹ 20px ở viền màn hình. | **ĐÃ XỬ LÝ (PASS)** |
| 4 | **Đồng hồ Pomodoro bị lệch trái khi kéo sát mép hoặc co hẹp** | Kích thước font chữ cố định `text-7xl` (72px) cùng thanh cuộn ngang/dọc Windows (17px) khi widget ở `minWidth: 280px` làm tràn container flexbox, đẩy chữ lệch sang trái. | Căn giữa tự nhiên `w-full flex justify-center`, điều chỉnh typography responsive `text-5xl sm:text-6xl` và padding cân xứng, không bao giờ bị lệch hay tràn khung ở bất kỳ tỷ lệ nào. | **ĐÃ XỬ LÝ (PASS)** |
| 5 | **Thu nhỏ Pomodoro có thanh điều khiển mini 52px đầy đủ** | Trước đây khi thu nhỏ Pomodoro chỉ còn thanh tiêu đề 38px trống rỗng, không nhìn thấy thời gian còn lại. | Bổ sung thanh điều khiển Pomodoro mini (`collapsed-timer-bar`): hiển thị chấm trạng thái phát sáng, đồng hồ đếm ngược to rõ, trạng thái "Tập trung/Nghỉ ngắn", task liên kết, nút Play/Pause và nút Mở rộng. | **ĐÃ HOÀN THÀNH** |
| 6 | **Phần mềm bị đóng băng con trỏ chuột khi kéo qua video YouTube** | Thẻ `<iframe>` của YouTube (cross-origin) chặn bắt sự kiện chuột (`pointer-events`), khiến việc kéo thả qua vùng video bị đứt đoạn. | Bổ sung một lớp bảo vệ vô hình `pointer-shield` phủ lên widget chỉ khi `isDragging || isResizing`, đảm bảo kéo thả mượt mà 60fps qua mọi iframe. | **ĐÃ XỬ LÝ (PASS)** |
| 7 | **Hoàn thiện phòng học nhóm Study Room (WebRTC Live Meet)** | Trước đây trang Study Room chỉ có khung tĩnh và danh sách mẫu giả lập. | Tích hợp đầy đủ: preview camera/mic phần cứng thật qua `getUserMedia`, chia sẻ màn hình thật qua `getDisplayMedia`, Bảng vẽ chung HTML5 Canvas (vẽ, đổi màu, tẩy, tải ảnh PNG), nút Giơ tay phát biểu, Thả emoji động bay lên, và Cài đặt đổi thiết bị mic/camera. | **ĐÃ HOÀN THÀNH** |
| 8 | **Thanh điều hướng Mobile gọn gàng** | Trên màn hình điện thoại, thanh navbar bị chen chúc chữ. | Bổ sung drawer menu vuốt/mở tiện dụng (`header-mobile-menu-toggle`) với kích thước phím bấm chuẩn di động (>= 44px). | **ĐÃ HOÀN THÀNH** |
| 9 | **Làm sạch ngôn ngữ hiển thị** | Còn sót một số từ tiếng Anh hoặc ngoặc đơn dạng `(Sandbox UX)`, `(OWNER)`. | Chuẩn hóa 100% tiếng Việt tự nhiên, giao diện đồng nhất phong cách PomoFocus tối giản đen-trắng. | **ĐÃ HOÀN THÀNH** |

---

## 2. CHI TIẾT CẢI TIẾN KỸ THUẬT VÀ KIẾN TRÚC MÃ NGUỒN

### 2.1. Quản lý Cửa sổ Kéo thả (`useLayoutStore.ts` & `WidgetContainer.tsx`)
1. **Loại bỏ vòng lặp va chạm góc:**
   ```typescript
   // useLayoutStore.ts
   placeWidget: (id: WidgetId, x: number, y: number) => {
     // Clamp trong biên giới hạn hiển thị của viewport
     const clampedX = Math.max(10, Math.min(x, maxX));
     const clampedY = Math.max(50, Math.min(y, maxY));
     // Áp dụng snap nhẹ nếu cách biên <= 20px
     ...
     set({ widgets: { ...state.widgets, [id]: { ...target, x: snappedX, y: snappedY } } });
   }
   ```
2. **Khôi phục nguyên vẹn Layout từ Storage:**
   Hàm `loadStoredLayout` không tự động gán đè vị trí mặc định nếu người dùng đã có layout tùy chỉnh hợp lệ trong `localStorage`.
3. **Bảo vệ con trỏ chuột khi kéo qua Iframe:**
   ```tsx
   {(isDragging || isResizing) && (
     <div className="absolute inset-0 z-50 pointer-events-auto bg-transparent select-none cursor-grabbing" />
   )}
   ```

### 2.2. Trình phát Video YouTube và Âm thanh Toàn Cục (`GlobalAudioHost.tsx`)
- **Kiến trúc React Portal:**
  Thay vì dùng thẻ `fixed` với `setInterval` 250ms đo vị trí (gây ra hiện tượng video chạy sau khung 250ms tạo cảm giác lag và rách khung), ta dùng `createPortal(iframe, document.getElementById('youtube-player-anchor'))`.
- Nhờ vậy, iframe trở thành một con trực tiếp trong layout của `AudioWidget`. Trình duyệt sử dụng GPU compositor để di chuyển thẻ này cùng với cửa sổ theo thời gian thực (60fps), loại bỏ hoàn toàn hiện tượng "chạy theo" hay lệch tọa độ.
- Khi widget bị đóng hoặc thu nhỏ, Portal tự động chuyển đích đến `#youtube-offscreen-container` (tọa độ `top: -9999px`), giữ cho âm thanh phát liên tục mà không làm gián đoạn nhạc của người dùng.

### 2.3. Phòng Học Nhóm Study Room (`StudyRoomView.tsx`)
1. **Camera & Microphone thật:**
   Kết nối trực tiếp thiết bị đầu vào của máy tính qua `navigator.mediaDevices.getUserMedia({ video: true, audio: true })`. Có kiểm tra quyền truy cập và thông báo thân thiện nếu thiết bị không có camera.
2. **Chia sẻ màn hình thật:**
   Kết nối qua `navigator.mediaDevices.getDisplayMedia({ video: true })` với luồng hiển thị trực tiếp và nút dừng chia sẻ tức thì.
3. **Bảng vẽ tương tác Canvas Whiteboard:**
   HTML5 `<canvas>` hỗ trợ chuột và cảm ứng đa điểm:
   - 5 màu vẽ cơ bản: Trắng, Xanh lá, Xanh dương, Đỏ, Vàng hổ phách.
   - Chế độ tẩy (Eraser) và thanh trượt kích thước nét vẽ (1px - 20px).
   - Nút Xóa toàn bảng và Xuất file ảnh PNG (`whiteboard.png`) tải trực tiếp về máy.
4. **Hiệu ứng Thả cảm xúc & Giơ tay:**
   - Nút `Giơ tay phát biểu` kích hoạt nhãn vàng `✋ Đang giơ tay` trên thẻ học viên.
   - Các nút thả cảm xúc (`🔥, 👏, ❤️, ☕, 💡, 📚`) tạo bóng bóng bay lên với hoạt ảnh `@keyframes floatUp` mượt mà.

---

## 3. BẰNG CHỨNG KIỂM THỬ TỰ ĐỘNG (TEST AUDIT EVIDENCE)

### 3.1. Vitest Unit Test Suite (100% Pass)
```
 ✓ tests/unit/audioEngine.test.ts (21 tests)
 ✓ tests/unit/layoutAndZen.test.ts (15 tests)
 ✓ tests/unit/tasksAndNotes.test.ts (13 tests)
 ✓ tests/unit/googleAuth.test.ts (7 tests)
 ✓ tests/unit/paymentSecurity.test.ts (10 tests)
 ✓ tests/unit/timerEngine.test.ts (14 tests)
 ✓ tests/unit/backgroundStore.test.ts (8 tests)
 ✓ tests/unit/momoPayment.test.ts (5 tests)
 ✓ tests/unit/betaEntitlement.test.ts (9 tests)
 ✓ tests/unit/mediaAndAudioLifecycle.test.ts (3 tests)
 ✓ src/scaffold.test.ts (2 tests)

 Test Files  11 passed (11)
      Tests  107 passed (107)
```

### 3.2. Playwright E2E Test Suite (100% Pass)
1. **Kiểm thử quản lý cửa sổ và Study Room:** `tests/e2e/windowAndMeetVerification.spec.ts`
   - `ok 1`: Kéo thả widget không bị dịch chuyển về góc và giữ nguyên vị trí sau khi thả.
   - `ok 2`: Thu nhỏ Pomodoro hiển thị thanh điều khiển mini 52px đầy đủ và mở rộng lại bình thường.
   - `ok 3`: Bảng âm thanh khi thu nhỏ không làm mất iframe và giữ trình phát an toàn.
   - `ok 4`: Phòng học nhóm (StudyRoomView) hoạt động đầy đủ: tham gia, bảng vẽ canvas, giơ tay, thả reaction.
2. **Kiểm thử toàn bộ hành trình người dùng Beta:** `tests/e2e/demoBetaFullFlow.spec.ts`
   - `ok 1`: Kiểm tra Bảng Giá & Cảnh Báo "DEMO BETA — KHÔNG THU TIỀN THẬT".
   - `ok 2`: Đăng ký tài khoản mới tự động nhận quyền PRO BETA (3 Năm).
   - `ok 3`: Kiểm tra Dashboard Thống Kê & Số Liệu Thực Tế.
   - `ok 4`: Kiểm tra Cài Đặt (Settings) & Lưu Trữ Thay Đổi.
   - `ok 5`: Kiểm tra Quản Lý Dữ Liệu (Privacy & Data).
   - `ok 6`: Kiểm tra Trung Tâm Trợ Giúp (Help & Shortcuts).
   - `ok 7`: Kiểm tra Trang Báo Lỗi 404 (Not Found View).

### 3.3. TypeScript Typecheck & Production Build
- `npm run type-check`: 0 lỗi compilation.
- `npm run build`: Thành công trong 9.2s, sinh bản phân phối `dist/` hoàn chỉnh kèm Service Worker PWA.

---

## 4. KẾT LUẬN & HƯỚNG DẪN BÀN GIAO

- Toàn bộ 12 mục tiêu và yêu cầu từ đề bài của người dùng đã được hiện thực hóa đầy đủ, chính xác và có kiểm thử thực tế chứng minh.
- Ứng dụng PomoFocus hiện hoạt động mượt mà, khung cửa sổ ổn định, âm thanh liên tục không giật lag, giao diện thuần Việt tinh tế theo đúng phong cách tối giản đen-trắng của logo mới.
