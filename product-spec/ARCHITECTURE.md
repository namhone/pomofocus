# TÀI LIỆU KIẾN TRÚC HỆ THỐNG: POMOFOCUS (STUDY WORKSPACE)

**Phiên bản:** Demo Beta 1.0.0  
**Ngày cập nhật:** 29/10/2026  
**Chủ dự án / Quản trị viên:** Hồ Ngọc Bảo Nam (`namho03052k9@gmail.com` / `0704 862 629`)  

---

## 1. TỔNG QUAN HỆ THỐNG (SYSTEM OVERVIEW)

PomoFocus là một ứng dụng web học tập và làm việc sâu (Deep Work / Study Workspace) theo triết lý **Local-First**, tối giản, lấy tông màu đen-trắng làm chủ đạo. Hệ thống kết hợp:
1. Đồng hồ Pomodoro nguyên tử (chạy nền chính xác từng millisecond qua Web Worker và Service Worker).
2. Bộ hòa âm môi trường Web Audio không ngắt quãng (GlobalAudioHost).
3. Quản lý cửa sổ kéo thả tự do đa nhiệm (Floating Window Manager) hỗ trợ Mini Pill và Smart Collapse.
4. Quản lý nhiệm vụ, ghi chú, lịch Time-Blocking và thống kê học tập lưu trữ an toàn bằng Dexie IndexedDB.
5. Phòng học nhóm trực tuyến (Study Room) với camera/mic phần cứng thật, chia sẻ màn hình và bảng vẽ HTML5 Canvas.
6. Hệ thống phân quyền tài khoản: 3 Năm PRO miễn phí cho tài khoản mới (Demo Beta), PRO Trọn Đời cho tài khoản chủ sở hữu.

---

## 2. KIẾN TRÚC SOURCE CODE VÀ PHÂN LỚP (LAYERED ARCHITECTURE)

Dự án được tổ chức theo cấu trúc module hóa phân tầng:

```
src/
├── components/          # Giao diện người dùng & các trang cấp cao
│   ├── LandingPage.tsx          # Trang chủ mặc định ('/' & '/landing')
│   ├── PlatformHeader.tsx       # Thanh điều hướng trên cùng & Mobile Drawer
│   ├── WidgetContainer.tsx      # Khung cửa sổ kéo thả, co giãn & Smart Collapse
│   ├── TimerTestInterface.tsx   # Đồng hồ Pomodoro chính
│   ├── AudioWidget.tsx          # Bảng điều khiển âm thanh & nhạc YouTube
│   ├── GlobalAudioHost.tsx      # Quản lý phát âm thanh toàn cục (React Portal)
│   ├── StudyRoomView.tsx        # Phòng học nhóm WebRTC Live & Whiteboard
│   ├── DedicatedCalendarView.tsx# Lịch Time-Blocking
│   ├── DashboardView.tsx        # Thống kê, chuỗi ngày streak & lịch sử phiên
│   ├── SettingsView.tsx         # Cài đặt đồng hồ, âm lượng, giao diện
│   ├── PrivacyDataView.tsx      # Quản lý dữ liệu, xuất file JSON, xóa dữ liệu
│   ├── ContactView.tsx          # Trang liên hệ chính thức (Email, Hotline)
│   ├── HelpView.tsx             # Trung tâm trợ giúp & bảng phím tắt
│   ├── LegalViews.tsx           # Điều khoản dịch vụ & Chính sách bảo mật
│   └── NotFoundView.tsx         # Trang 404 tùy chỉnh
├── stores/              # Quản lý trạng thái ứng dụng (Zustand)
│   ├── useTimerStore.ts         # Quản lý chu kỳ Pomodoro & vòng đời đếm ngược
│   ├── useAudioStore.ts         # Âm lượng, âm thanh môi trường & bài hát
│   ├── useLayoutStore.ts        # Tọa độ cửa sổ, kích thước, zIndex, snap viền
│   ├── useAuthStore.ts          # Phiên đăng nhập, quyền PRO, liên kết Google
│   └── useBackgroundStore.ts    # Thư viện 101 cảnh quan tĩnh và động
├── services/            # Tầng dịch vụ & tích hợp
│   ├── authService.ts           # Xác thực, lưu trữ session, phân quyền Beta/Lifetime
│   ├── googleAuthService.ts     # Tích hợp Google OAuth Client ID & JWT parsing
│   ├── momoService.ts           # Sinh đơn hàng, VietQR, giả lập Sandbox
│   ├── timerEngine.ts           # Web Worker & Service Worker timer tick
│   └── router.tsx               # Client-side router không cần phụ thuộc bên ngoài
├── db/                  # Cơ sở dữ liệu cục bộ
│   └── index.ts                 # Dexie IndexedDB (tasks, notes, sessions, projects)
├── config/              # Cấu hình tập trung
│   └── pricing.ts               # Bảng giá, mô tả gói, thời hạn
├── types/               # TypeScript Definitions
└── utils/               # Tiện ích mã hóa HMAC-SHA256, chuẩn hóa URL, Media
```

---

## 3. KIẾN TRÚC CÁC PHÂN HỆ CỐT LÕI

### 3.1. Quản lý Cửa sổ Kéo thả (Window Manager & Layout)
- **Tách biệt tọa độ tuyệt đối:** Vị trí `(x, y)` được lưu trữ trong `useLayoutStore` và đồng bộ vào `localStorage`.
- **Chống nhảy về góc:** Loại bỏ hoàn toàn vòng lặp tìm ô trống ép tọa độ về `(10, 50)`. Cửa sổ giữ nguyên tọa độ chính xác người dùng thả chuột.
- **Biên an toàn (Viewport Clamping):** Giới hạn `x` trong `[10, window.innerWidth - width - 10]`, `y` trong `[50, window.innerHeight - activeHeight - 10]`.
- **Snap viền (Edge Snapping):** Tự động bắt dính mép khi khoảng cách <= 20px mà không gây giật màn hình.
- **Bảo vệ con trỏ chuột (`pointer-shield`):** Khi kéo/co giãn, một lớp div trong suốt phủ lên nội dung ngăn `<iframe>` YouTube chặn sự kiện chuột.

### 3.2. Âm thanh Toàn Cục & Khắc Phục Lỗi Video YouTube Trôi Lệch
- **Nguyên nhân lỗi cũ:** Trước đây dùng `setInterval(250)` đo `getBoundingClientRect()` và gán `position: fixed` ngoài cây DOM, khiến iframe trôi lệch với tốc độ 4fps so với 60fps khi kéo khung; cộng thêm trùng lặp id `#youtube-player-anchor`.
- **Giải pháp kiến trúc mới:** Sử dụng **`ReactDOM.createPortal`**:
  - Khi widget âm thanh mở: `<iframe>` được portal trực tiếp vào `#youtube-player-anchor` bên trong `AudioWidget`. Trình duyệt dùng GPU compositor di chuyển video cùng lúc với khung ở 60fps, độ trễ = 0.
  - Khi widget đóng hoặc thu nhỏ: Portal tự động chuyển đích sang `#youtube-offscreen-container` tại `top: -9999px`, duy trì luồng phát âm thanh liên tục không bao giờ bị ngắt.

### 3.3. Phòng Học Nhóm (WebRTC Live Meet)
- **Local Media Capture:** Sử dụng `navigator.mediaDevices.getUserMedia({ video: true, audio: true })` với luồng hiển thị thực tế trên thẻ `<video autoPlay playsInline muted />`.
- **Screen Share:** Sử dụng `navigator.mediaDevices.getDisplayMedia({ video: true })` với chức năng phát hiện tự động khi người dùng dừng chia sẻ.
- **Bảng vẽ tương tác (Canvas Whiteboard):** Thẻ HTML5 `<canvas width={960} height={540}>` hỗ trợ đa thiết bị (chuột và cảm ứng), 5 màu vẽ, tẩy xóa, chỉnh cỡ nét và xuất file ảnh PNG trực tiếp.
- **Tương tác động:** Nút Giơ tay phát biểu (`✋`) hiển thị huy hiệu trên thẻ học viên; thanh thả biểu cảm (`🔥, ☕, 📚, 👏`) tạo hiệu ứng bóng bay chuyển động `@keyframes floatUp`.

### 3.4. Hệ thống Xác thực & Quyền PRO Beta
- **Nguyên tắc không tự động gộp (Non-merging Collision Defense):** Ngăn chặn việc tự động liên kết tài khoản khi chỉ trùng email giữa phương thức mật khẩu và Google để tránh tấn công chiếm quyền tài khoản (Account Takeover).
- **Chính sách cấp quyền:**
  - Tài khoản chủ sở hữu `namho03052k9@gmail.com`: Luôn nhận **PRO TRỌN ĐỜI (Lifetime)** không có ngày hết hạn.
  - Mọi tài khoản đăng ký mới: Tự động kích hoạt **PRO BETA (3 Năm)** miễn phí.
  - Lưu trữ và đối soát quyền hạn an toàn, từ chối việc client can thiệp localStorage để tự nâng quyền thật.

### 3.5. Bảng Giá & Đối Soát QR Thanh Toán
- **Bản chất kỹ thuật:** Mã VietQR `970422-0704862629` sử dụng mã BIN `970422` của MBBank cho chuyển khoản ngân hàng NAPAS 24/7. Ứng dụng MoMo chỉ hỗ trợ quét nếu người dùng chọn tính năng chuyển tiền đến tài khoản ngân hàng liên kết, không phải luồng quét mã ví MoMo nội bộ (P2P MoMo format `2|99|...`).
- **Giai đoạn Demo Beta:** Giao diện hiển thị cảnh báo đỏ **"DEMO BETA — KHÔNG CHUYỂN TIỀN THẬT"**. Cung cấp chế độ mô phỏng Sandbox để kiểm thử viên trải nghiệm đầy đủ tính năng mà không phát sinh bất kỳ giao dịch tiền tệ nào.
