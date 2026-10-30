# BÁO CÁO TINH CHỈNH THIẾT KẾ THỊ GIÁC — POMODORO WORKSPACE
*Khắc phục cảm giác AI-Generated & Tái thiết kế trải nghiệm LifeAt × Apple*

**Dự án:** Pomodoro Ambient Workspace  
**Thời gian kiểm định:** 25/10/2026  
**Đường dẫn thư mục ảnh:** [artifacts/visual-audit/](file:///d:/FileCuaNam/Web'/Pomodoro/artifacts/visual-audit/)  

---

## 1. Tổng quan & Triết lý Thiết kế

Phiên bản trước mặc dù đã tích hợp hình nền và hiệu ứng kính mờ nhưng vẫn tồn tại cảm giác "máy móc", "giao diện mẫu do AI sinh ra" (AI-generated dashboard):
- **Hội chứng đồng dạng (Monoculture):** Quá nhiều thành phần sử dụng cùng một tông tím neon (`indigo-600`), đèn LED phát sáng tím rực và các khung viền bo tròn lặp lại.
- **Hội chứng hộp lồng hộp (Box-in-a-box syndrome):** Các widget chứa quá nhiều tầng viền bo lồng vào nhau, tạo cảm giác thô cứng, nặng nề, thiếu tính tự nhiên của một không gian làm việc analog kết hợp kỹ thuật số.

Đợt tinh chỉnh này tập trung vào việc **De-AI-ify** giao diện, đưa sản phẩm về đúng đẳng cấp **LifeAt × Apple Glassmorphism**: tinh tế, tĩnh lặng, tự nhiên và giàu tính thủ công cao cấp.

---

## 2. 5 Vấn đề Thị giác Cốt lõi & Giải pháp Triệt để

### Vấn đề 1: Hội chứng Lạm dụng Màu Tím Neon ("Indigo Monoculture")
- **Hiện tượng cũ:** Nút "Bắt đầu", nút "+ Thêm việc", nút "+ Ghi chú", đèn báo DockBar và các tab lọc đều dùng màu tím/chàm `bg-indigo-600` với đổ bóng neon tím rực rỡ, mang nặng phong cách template mặc định của các framework CSS do AI gợi ý.
- **Giải pháp:**
  - **Nút Hành động Chính (Hero CTA):** Chuyển sang nút ngà cao cấp Apple `bg-white text-neutral-900 font-semibold hover:bg-neutral-100 shadow-[0_4px_20px_rgba(255,255,255,0.18)]` cho Start button và Task submit.
  - **Phân cấp trạng thái tự nhiên:** Nút Pause chuyển sang tông hổ phách ấm `bg-amber-400 text-neutral-950`; nút Resume chuyển sang tông ngọc lục bảo `bg-emerald-400 text-neutral-950`.
  - **Nút Thứ cấp (Reset / Skip):** Chuyển sang vật liệu kính mờ trung tính `bg-white/[0.05] border-white/10 text-neutral-300 hover:text-white`.
  - **Kiểm định WCAG Contrast:** Tỷ lệ tương phản đo lường thực tế đạt **17.93:1** trên nút Start và **17.55:1** trên mặt số Timer (vượt xa chuẩn WCAG AAA 7:1).

### Vấn đề 2: Hội chứng Khung Bo Lồng Khung ("Box-in-a-box Syndrome")
- **Hiện tượng cũ:** Task widget và Note widget chứa nhiều khung viền xám lồng ghép liên tiếp (khung widget -> khung form -> khung toolbar -> khung item -> khung badge P1/P2).
- **Giải pháp:**
  - **De-box Task Composer:** Ô nhập liệu hòa quyện trực tiếp vào bề mặt kính của cửa sổ với đường hairline mỏng ngăn cách, tạo cảm giác như một mặt bàn làm việc phẳng.
  - **Chấm Màu Trang Sức Thay Vì Thẻ Vuông:** Thay thế các nút sticker P1/P2/P3 cồng kềnh bằng các chấm màu trang sức nhẹ nhàng (Coral P1, Amber P2, Sage P3) kèm nhãn nhỏ gọn.
  - **Notes Widget Tối giản:** Khung soạn thảo Markdown trở thành một trang sổ tay thanh thoát, không viền rườm rà.

### Vấn đề 3: Viền Kính Phẳng Đồng Dạng Thiếu Nguồn Sáng Tự Nhiên
- **Hiện tượng cũ:** Toàn bộ 4 cạnh viền của cửa sổ đều dùng chung độ sáng `border-white/14`, khiến hiệu ứng kính trông giả tạo như một hình chữ nhật phẳng được vẽ bằng máy.
- **Giải pháp:**
  - **Liquid Glass Asymmetric Rim (Phản xạ ánh sáng bất đối xứng):** Cạnh trên hứng trọn nguồn sáng môi trường với `border-t-white/[0.22]`, hai cạnh bên nhận sáng xiên với `border-x-white/[0.12]`, và cạnh đáy ngả bóng tối với `border-b-white/[0.07]`.
  - **Màu nền kính quang học:** Nền `bg-[rgba(16,18,24,0.58)]` kết hợp `backdrop-blur-2xl` và `backdrop-saturate-[180%]`, tạo độ trong suốt sâu lắng khi đặt trên các ảnh nền thực tế (vũ trụ, góc học tập, trời mưa).

### Vấn đề 4: DockBar Đồng Dạng Thiếu Nhịp Điệu Chức Năng
- **Hiện tượng cũ:** Tất cả 10 nút trên DockBar xếp thành một hàng dài liên tục, đèn báo widget đang mở dùng bóng tím nhòe `bg-indigo-400 shadow-[0_0_6px_rgba(129,140,248,0.8)]`.
- **Giải pháp:**
  - **Phân nhóm 3 Cụm Chuyên Biệt (Apple Dock Architecture):**
    - *Cụm 1 — Ứng dụng Năng suất:* Đồng hồ, Công việc, Ghi chú, Lịch biểu.
    - *Cụm 2 — Môi trường & Không gian:* Hình nền, Âm thanh & Nhạc Lofi.
    - *Cụm 3 — Hệ thống & Bố cục:* Bố cục mẫu, Chế độ Zen, Đặt lại, Di chuyển Dock.
    - Ngăn cách giữa các cụm bằng vạch hairline thanh lịch `h-4 w-px bg-white/12`.
  - **Đèn Báo Tinh Giản:** Chuyển sang chấm trắng Apple nguyên bản `w-1.5 h-1.5 bg-white shadow-[0_0_6px_rgba(255,255,255,0.7)]`, thanh thoát và không gây xao nhãng.

### Vấn đề 5: Trải nghiệm Mobile Safe-Area & Chân Trang Cuộn
- **Hiện tượng cũ:** Trên màn hình hẹp (390×844 và 320×568), khi cuộn đến cuối trang, thanh DockBar có nguy cơ che lấp các nút thao tác chân trang của widget cuối cùng.
- **Giải pháp:**
  - Tích hợp khoảng đệm cuộn an toàn `pb-28` cho vùng nội dung chính và đệm đáy `pb-[max(6px,env(safe-area-inset-bottom))]` cho DockBar.
  - Các nút hành động chân trang như "Lưu ngay", "Thêm việc", "Xóa" luôn hiển thị trọn vẹn và bấm chính xác trên cả iPhone và Android.

---

## 3. Bằng chứng Thực nghiệm & Ảnh chụp Thẩm định

Mọi ảnh chụp màn hình đều được kết xuất trực tiếp bằng Playwright Chrome và được thẩm định hình ảnh thực tế:

| Viewport / Kịch bản | Tên File Ảnh | Kích thước | Tình trạng Thẩm định |
|---|---|---|---|
| Desktop 1440×900 (Mặc định Cosmic) | [`desktop-1440x900-default-nebula.png`](file:///d:/FileCuaNam/Web'/Pomodoro/artifacts/visual-audit/desktop-1440x900-default-nebula.png) | 582.5 kB | Đạt chuẩn LifeAt × Apple, nút ngà cao cấp, viền bất đối xứng |
| Desktop 1440×900 (Preset Cozy Study) | [`desktop-1440x900-cozy-study.png`](file:///d:/FileCuaNam/Web'/Pomodoro/artifacts/visual-audit/desktop-1440x900-cozy-study.png) | 703.7 kB | Kính mờ hòa quyện hoàn hảo trên nền ảnh phòng học ấm cúng |
| Desktop 1440×900 (Preset Rainy Window) | [`desktop-1440x900-rainy-window.png`](file:///d:/FileCuaNam/Web'/Pomodoro/artifacts/visual-audit/desktop-1440x900-rainy-window.png) | 433.5 kB | Mặt số nổi bật, độ tương phản cao trên nền mưa tĩnh lặng |
| Desktop 1440×900 (Audio & Lofi Stream) | [`desktop-1440x900-audio-stream-playing.png`](file:///d:/FileCuaNam/Web'/Pomodoro/artifacts/visual-audit/desktop-1440x900-audio-stream-playing.png) | 341.4 kB | Trình phát YouTube Live 16:9 nhúng chuẩn, đèn LIVE xanh lá |
| Desktop 1440×900 (Mini Timer Pill) | [`desktop-1440x900-mini-pill.png`](file:///d:/FileCuaNam/Web'/Pomodoro/artifacts/visual-audit/desktop-1440x900-mini-pill.png) | 446.1 kB | Apple Dynamic Island thu nhỏ 190×52px, kéo thả tự do |
| Desktop 1440×900 (Zen Mode Fullscreen) | [`desktop-1440x900-zen-mode.png`](file:///d:/FileCuaNam/Web'/Pomodoro/artifacts/visual-audit/desktop-1440x900-zen-mode.png) | 69.9 kB | Ẩn toàn bộ giao diện thừa, tập trung tuyệt đối vào đồng hồ |
| Desktop 1366×768 (Cascade Laptop) | [`desktop-1366x768-cascade.png`](file:///d:/FileCuaNam/Web'/Pomodoro/artifacts/visual-audit/desktop-1366x768-cascade.png) | 385.0 kB | Cửa sổ phân lớp bậc thang, không tràn cạnh màn hình |
| Tablet 768×1024 (Stack Layout) | [`tablet-768x1024-stack.png`](file:///d:/FileCuaNam/Web'/Pomodoro/artifacts/visual-audit/tablet-768x1024-stack.png) | 284.8 kB | Chuyển đổi mượt mà sang dạng cột dọc tối ưu cảm ứng |
| Mobile 390×844 (Đỉnh màn hình) | [`mobile-390x844-default.png`](file:///d:/FileCuaNam/Web'/Pomodoro/artifacts/visual-audit/mobile-390x844-default.png) | 101.2 kB | Mặt số đồng hồ lớn, nút Start ngà nổi bật, khoảng cách chuẩn |
| Mobile 390×844 (Chân trang cuộn) | [`mobile-390x844-scrolled-bottom.png`](file:///d:/FileCuaNam/Web'/Pomodoro/artifacts/visual-audit/mobile-390x844-scrolled-bottom.png) | 117.6 kB | DockBar không che nút "Lưu ngay", không có thanh cuộn ngang |
| Mobile 320×568 (Màn hình siêu hẹp) | [`mobile-320x568-scrolled-bottom.png`](file:///d:/FileCuaNam/Web'/Pomodoro/artifacts/visual-audit/mobile-320x568-scrolled-bottom.png) | 87.5 kB | Co giãn hoàn hảo, không tràn mép, chữ hiển thị rõ ràng |

---

## 4. Ngân sách Kỹ thuật & Hiệu năng Bundle

- **Entry Bundle Size:** `dist/assets/index-DVich4Kd.js` = **321.56 kB** (kích thước gzip: **99.42 kB**).
  - Đạt mục tiêu khắt khe: **< 100 kB gzip**.
- **Lazy Chunks:**
  - `AudioWidget`: 16.36 kB (5.16 kB gzip)
  - `useAudioStore`: 17.46 kB (5.07 kB gzip)
  - `SpacesWidget`: 23.66 kB (7.69 kB gzip)
  - `NotesWidget`: 13.04 kB (4.42 kB gzip)
  - `TasksWidget`: 10.04 kB (2.86 kB gzip)
  - `CommandPalette`: 10.44 kB (4.25 kB gzip)
- **Tốc độ tải:** Không tải trước các widget chưa mở, không làm trễ tương tác kéo thả. Tôn trọng triệt để `prefers-reduced-motion`.
