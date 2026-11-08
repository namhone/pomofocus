---
name: pomofocus-design-system
description: Quy chuẩn thiết kế giao diện toàn diện cho PomoFocus Workspace gồm triết lý Apple Liquid Glass cho /app, Zen Minimalism cho các trang vệ tinh, thanh macOS Liquid Dock với hiệu ứng magnification, 80+ mẫu thiết kế thành phần, 5 hệ thống animation physics và giải pháp triệt tiêu nháy chữ khi tải trang (Anti-FOUT).
allowed-tools: execute_bash view_file write_to_file
---
# PomoFocus Design System & Animation Philosophy Skill

Kỹ năng này hướng dẫn AI Coding Agent (Cursor, Windsurf, Claude Engineer) triển khai giao diện đẳng cấp cho PomoFocus Workspace theo hai trường phái thiết kế song hành và bộ tiêu chuẩn chuyển động chuẩn Apple.

## BẮT BUỘC CHO AI CODING AGENT TRƯỚC KHI VIẾT CODE:
1. **Tự mở và kiểm tra tệp HTML trực quan**: Mở ngay `assets/design-system-showcase.html` trong trình duyệt hoặc Markdown preview để xem bố cục thực tế.
2. **Tự click và duyệt các liên kết nguồn uy tín**: Bắt buộc truy cập và đối chiếu các mẫu thiết kế thực tế tại:
   - [Uiverse.io Glassmorphism](https://uiverse.io/tags/glassmorphism) & [Uiverse.io Glass Cards](https://uiverse.io/ui/glassmorphism-cards)
   - [Minimal Gallery](https://minimal.gallery/)
   - [Siiimple Minimalist Web Gallery](https://siiimple.com/) & [Siiimple Application Category](https://siiimple.com/category/application/)
   - [Awwwards Minimal Category](https://www.awwwards.com/websites/minimal/)
   - [Motion.dev (Framer Motion)](https://motion.dev/)
   - [Jitter Video Templates](https://jitter.video/templates/)
   - [LottieFiles](https://lottiefiles.com/)
3. **Đọc kỹ các tệp quy chuẩn chuyên biệt**:
   - `references/apple-liquid-dock.md`: Mã nguồn chuẩn của thanh Dockbar macOS Liquid Glass có hiệu ứng phóng đại (magnification) và tooltip mờ.
   - `references/apple-liquid-glass-patterns.md`: 40 mẫu Liquid Glass cho `/app`.
   - `references/zen-minimalism-patterns.md`: 40 mẫu Zen Minimalism cho các trang ngoại vi.
   - `references/animation-physics.md`: 5 loại animation physics chuẩn Apple Spring.
   - `references/anti-fout-loading-guide.md`: Kiến trúc triệt tiêu 100% hiện tượng nháy chữ trước khi load trang (Zero-FOUT).

---

## 1. Hai Triết Lý Thiết Kế Song Hành

### A. Apple Liquid Glass (Dành riêng cho `/app`)
- **Vật liệu**: Thấu kính khúc xạ ánh sáng siêu thực (`backdrop-blur-2xl` đến `backdrop-blur-3xl`).
- **Nền & Ánh xạ**: `bg-zinc-950/40` kết hợp specular reflection `bg-white/[0.03]`.
- **Viền sáng (Specular Highlight)**: `border border-white/10 ring-1 ring-white/5`.
- **Đổ bóng đa lớp**: `shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]`.
- **Thanh Dockbar nổi chuẩn macOS**: Sử dụng mã nguồn tại `references/apple-liquid-dock.md` với hiệu ứng hover kế cận mượt mà.
- **Tối ưu không gian trần**: Không dùng thanh menu to ở `/app`. Đưa nút Home vào menu phụ, cho phép kéo thả widget lên sát mép màn hình (`y = 8px`).

### B. Zen Minimalism (Dành cho các trang ngoại vi)
- **Triết lý**: Tinh giản tuyệt đối theo tinh thần Dieter Rams và thẩm mỹ Ma của Nhật Bản.
- **Khử ô nhiễm màu sắc (Zero Color Noise)**: 
  - Thay thế các badge xanh/cam/đỏ thô ráp bằng **chấm trạng thái 3 cấp độ (3-State Micro Dot)**:
    - `bg-emerald-400`: Đang chạy / Live.
    - `bg-amber-400`: Tạm dừng / Chờ / Pending.
    - `bg-zinc-500`: Tắt / Nghỉ / Offline.
- **Nổi bật bằng Typography**: Tạo điểm nhấn bằng độ tương phản chữ trắng tinh khiết (`text-white`), font-weight (`font-semibold`), và khoảng cách thở, tuyệt đối không dùng màu mè lòe loẹt.

---

## 2. Quy Chuẩn Kích Thước Giới Hạn Từng Khung (Dimension Guardrails)

| Loại Thẻ / Widget | Min-W | Max-W | Min-H | Max-H | Quy Tắc Co Giãn |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Pomodoro Timer** | 300px | 440px | 220px | 340px | Giữ cố định trọng tâm số đếm, không giãn trống trải. |
| **Task List** | 320px | 500px | 280px | 650px | Tự động mở rộng danh sách cuộn mượt nội bộ. |
| **Quick Notes** | 280px | 680px | 240px | 720px | Vùng textarea co giãn tự do theo khung kéo. |
| **Media Player** | 280px | 420px | 140px | 260px | Giữ cứng tỷ lệ khung hình video 16:9 khi phóng to. |
| **AI Study Companion** | 340px | 460px | 100vh - 24px | 100vh - 24px | Trượt từ mép phải, z-index 80 cao hơn cụm nút header. |

---

## 3. Giải Pháp Triệt Tiêu Nháy Chữ Khi Tải Trang (Zero-FOUT)
- Cấm để lộ văn bản trơn trước khi CSS và phông chữ tải xong.
- Cấu hình CSS `font-display: optional` kết hợp lớp phủ Splash Curtain `bg-zinc-950 z-[9999]` chỉ mờ dần biến mất khi ứng dụng đã mount hoàn tất.
- Chi tiết mã nguồn triển khai xem tại `references/anti-fout-loading-guide.md`.
