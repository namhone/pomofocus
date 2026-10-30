# BÁO CÁO NGHIÊN CỨU & THAM KHẢO THIẾT KẾ VISUAL SYSTEM
## Định hướng: LifeAt Ambient Workspace × Apple macOS Liquid Glass

---

### 1. Cơ sở Nghiên cứu & Nguồn Tham khảo

| # | Nguồn Tham khảo | Danh mục | Đặc điểm cốt lõi phân tích | Ứng dụng vào Pomodoro Workspace |
|---|---|---|---|---|
| 1 | **LifeAt.io** (`lifeat.io`) | Ambient Virtual Workspace | Các cửa sổ công cụ (Timer, To-do, Notes, Soundscape) thả nổi tự do trên ảnh nền nhiếp ảnh chất lượng cao 4K / HD; thanh dock điều khiển tinh gọn ở đáy màn hình; chế độ chuyển đổi giữa các không gian (Lo-fi study, nature, cafe, cozy room). | Hệ thống hình nền nhiếp ảnh Unsplash curated (10 presets mặc định + 700+ catalog); DockBar thả nổi đáy màn hình có indicator trạng thái; cửa sổ tự do kéo thả và resize. |
| 2 | **Apple macOS Human Interface Guidelines (Materials & Vibrancy)** | Translucent Materials | Hiệu ứng Liquid Glass / Translucency: vật liệu kính mờ không chỉ dùng `blur` mà phải kết hợp `saturate(180%)` để giữ cho màu sắc của ảnh nền bên dưới không bị xỉn thành màu xám đục. | `backdrop-blur-2xl` kết hợp `backdrop-saturate-[180%]`; màu nền kính `rgba(18, 18, 24, 0.52)` tạo độ sâu quang học thực thụ. |
| 3 | **Apple macOS Sequoia Window Chromes** | Specular Rim Highlights & Shadowing | Viền kính siêu mảnh phản quang ánh sáng góc trên (`inset 0 1px 0 0 rgba(255, 255, 255, 0.22)`) tạo hiệu ứng vát cạnh kính thật; bóng đổ mềm 2 lớp (`shadow-[0_24px_50px_-10px_rgba(0,0,0,0.55)]`). | Áp dụng trên `WidgetContainer.tsx`, `DockBar.tsx`, và Mini Timer Pill để tách biệt rõ cửa sổ khỏi hình nền phức tạp mà không cần làm mờ đục. |
| 4 | **Apple Dynamic Island (iOS / macOS)** | Micro-Widget & Compact Control | Khi không cần thao tác chi tiết, widget thu gọn thành viên thuốc (Pill) nhỏ gọn với đèn LED trạng thái phát sáng và nút bấm tương tác nhanh. | `Mini Timer Pill` (190px × 52px) với status dot phát sáng pulse khi chạy, countdown font mono tabular và nút play/expand trực tiếp. |
| 5 | **Raycast / macOS Spotlight** | Fast Keyboard-driven Overlay | Hộp thoại lệnh nổi giữa màn hình với nền kính bán trong suốt cao cấp, phân loại danh mục, phím tắt nhanh và điều hướng bàn phím `↑` `↓` `↵`. | `CommandPalette.tsx` kính mờ `rgba(18, 18, 24, 0.78)` với 18+ lệnh điều khiển Timer, bố cục, ghi chú, âm thanh, backup dữ liệu. |
| 6 | **Lofi.co & Flocus Ambient Tools** | Ambient Audio & Soundscape | Tích hợp âm thanh thiên nhiên nền (mưa, suối, lò sưởi, sóng biển, tiếng chim) chạy ngầm dưới nền nhạc lofi stream; chế độ Zen tối giản loại bỏ xao nhãng. | `AudioWidget.tsx` với 6 chuông kết thúc hiệp (offline procedural Web Audio) + đa kênh âm thanh môi trường + nhúng nhạc lofi stream; `ZenOverlay.tsx` một chạm `Z` / `Esc`. |
| 7 | **Linear & Notion Typography Standard** | Typography & Spacing | Font system tối giản (Inter / San Francisco / Geist), tỷ lệ tương phản chữ đạt chuẩn WCAG AA/AAA ($\ge 4.5:1$ và $\ge 7:1$), khoảng cách nhịp điệu 4px / 8px / 12px. | Bố cục nhịp 6px trong task list, font monospace cho timer và đồng hồ; tương phản thực tế đo đạt 17.5:1 (Display) và 6.29:1 (Nút bấm). |

---

### 2. So sánh Trước và Sau Cải tiến (Before vs. After)

```
+------------------------------------+------------------------------------+
| TRƯỚC (BEFORE)                     | SAU KHI TÁI THIẾT KẾ (AFTER)       |
+------------------------------------+------------------------------------+
| 1. Preset mặc định là gradient     | 1. Preset mặc định là ảnh chụp     |
|    CSS thuần ("deep-space" đen     |    vũ trụ thật từ NASA / Unsplash  |
|    xanh), không tải ảnh thật nào.  |    (Trái Đất, ánh đèn thành phố).  |
|                                    |                                    |
| 2. WidgetContainer dùng            | 2. WidgetContainer dùng kính mờ    |
|    bg-[#121214]/85 (đen đặc 85%),  |    rgba(18,18,24,0.52) kết hợp     |
|    che khuất hoàn toàn ảnh nền.    |    backdrop-blur-2xl và saturate   |
|                                    |    180%, ảnh nền lộ rõ xuyên thấu. |
|                                    |                                    |
| 3. Các card con (task composer,    | 3. Khử lồng đặc: card con dùng     |
|    editor note) dùng bg-[#0e0e10]  |    bg-black/25 bán trong suốt,     |
|    tạo "hố đen" bên trong widget.  |    viền specular mảnh đồng nhất.   |
|                                    |                                    |
| 4. Thanh DockBar trên tablet 768px | 4. DockBar thông minh: tự ẩn nhãn  |
|    bị tràn và cắt mất nút bên phải.|    chữ trên màn hình < 1280px,     |
|                                    |    trở thành thanh pill gọn gàng.  |
|                                    |                                    |
| 5. Thiếu chỉ báo tương tác         | 5. Đèn LED trạng thái phát sáng    |
|    Apple-style trên DockBar.       |    (glowing status dots) Apple.    |
+------------------------------------+------------------------------------+
```

---

### 3. Thông số Thiết kế Hệ thống Kính (Liquid Glass Design Tokens)

- **Window Container Surface**:
  - `background`: `rgba(18, 18, 24, 0.52)` (Desktop) / `rgba(18, 18, 24, 0.62)` (Mobile)
  - `backdrop-filter`: `blur(24px) saturate(180%)`
  - `border`: `1px solid rgba(255, 255, 255, 0.14)`
  - `box-shadow`: `0 24px 50px -10px rgba(0, 0, 0, 0.55), inset 0 1px 0 0 rgba(255, 255, 255, 0.22)`
- **DockBar Surface**:
  - `background`: `rgba(18, 18, 24, 0.62)`
  - `backdrop-filter`: `blur(32px) saturate(180%)`
  - `border`: `1px solid rgba(255, 255, 255, 0.16)`
  - `box-shadow`: `0 24px 50px rgba(0, 0, 0, 0.55), inset 0 1px 0 0 rgba(255, 255, 255, 0.22)`
- **Mini Timer Pill**:
  - `background`: `rgba(18, 18, 24, 0.68)`
  - `backdrop-filter`: `blur(24px) saturate(180%)`
  - `box-shadow`: `0 16px 36px -6px rgba(0, 0, 0, 0.5), inset 0 1px 0 0 rgba(255, 255, 255, 0.24)`
- **Inset Component Panels (Tasks / Notes / Calendar)**:
  - `background`: `rgba(0, 0, 0, 0.25)` đến `rgba(0, 0, 0, 0.35)`
  - `border`: `1px solid rgba(255, 255, 255, 0.10)`
