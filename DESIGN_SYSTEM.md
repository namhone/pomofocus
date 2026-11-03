# POMOFOCUS DESIGN SYSTEM SPECIFICATION
> **Phiên bản**: 2.0 (Linear & LifeAt Standard)  
> **Triết lý**: Simplicity First (Karpathy Principle) & Zen-First Workspace (Deep Focus)

---

## 1. Triết Lý Cốt Lõi (Core Philosophy)

### A. Triết lý Karpathy — Simplicity First
- **Cắt giảm tối đa mã thừa và thành phần thừa**: Không thêm nút bấm hay tính năng khi chưa chứng minh được sự cần thiết tuyệt đối. 200 dòng code boilerplate phải được tinh giản về 50 dòng dễ đọc, dễ bảo trì.
- **Không nhồi nhét nhận thức (Cognitive Load Reduction)**: Người dùng mở PomoFocus để học và làm việc sâu. Mọi thứ cản trở sự chú ý (quá nhiều thanh tab, banner thông báo dài dòng, bảng giá nhồi nhét) đều phải bị loại bỏ hoặc đưa vào cơ chế **Progressive Disclosure** (chỉ hiển thị khi người dùng yêu cầu).

### B. Triết lý Linear & LifeAt — Minimalist Aesthetic
- **Màu nền chủ đạo**: Nền đen sâu `#09090b` (Black Obsidian) và `#0d1117` (Deep Dark Zinc). Không dùng các gam xám đục hay màu tương phản quá mức gây mỏi mắt trong phiên học đêm.
- **Đường viền siêu mảnh (Hairline Borders)**: `border border-white/[0.08]` hoặc `border-zinc-800/80` tạo chiều sâu tinh tế, không viền dày thô bạo.
- **Hiệu ứng Kính Mờ (Glassmorphism)**: `backdrop-blur-2xl` kết hợp `bg-black/60` hoặc `bg-zinc-950/70`.
- **Giao diện Zen-First**: Mặc định màn hình chỉ hiển thị đồng hồ Pomodoro trung tâm trên nền ảnh tranh/video chill.
- **Focus Auto-dim**: Khi Pomodoro chạy, các thanh điều hướng tự động mờ dần 85% (`opacity-20 hover:opacity-100 transition-opacity duration-700`) để trả lại 100% không gian cho sự tập trung.
- **Một Nguồn Điều Hướng Duy Nhất**: DockBar 4 cụm viên nang (Pills) tinh gọn, loại bỏ các thanh điều hướng phân mảnh.

---

## 2. Quy Chuẩn Bảng Màu (Color Tokens)

| Token | Giá Trị CSS / Tailwind | Mục Đích Sử Dụng |
|---|---|---|
| **Background Deep** | `#09090b` (`bg-[#09090b]`) | Nền tổng thể trang web, Header, Modal |
| **Surface Card** | `rgba(24, 24, 27, 0.6)` (`bg-zinc-900/60`) | Thẻ tính năng, thẻ phòng, thẻ giá |
| **Hairline Border** | `rgba(255, 255, 255, 0.08)` | Viền thẻ, đường kẻ phân cách tinh tế |
| **Accent Emerald** | `#10b981` (`emerald-500`) | Trạng thái Pomodoro đang chạy, trạng thái hoàn thành |
| **Accent Amber / Gold** | `#f59e0b` (`amber-400 / amber-500`) | Huy hiệu Founder VIP 👑, ví AI Credits ⚡ |
| **Accent Indigo** | `#6366f1` (`indigo-500`) | Gói PRO Năm ưu đãi tiết kiệm |
| **Accent Cyan** | `#06b6d4` (`cyan-400`) | Trợ lý học tập AI Companion |
| **Text Primary** | `#ffffff` | Tiêu đề chính, số giây đếm ngược |
| **Text Secondary** | `#a1a1aa` (`text-zinc-400`) | Mô tả tính năng, nhãn phụ, ngày giờ |
| **Text Muted** | `#71717a` (`text-zinc-500`) | Ghi chú nhỏ, bản quyền, phím tắt |

---

## 3. Quy Chuẩn Typography & Bố Cục

- **Font Family**: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif.
- **Đồng hồ số học**: `tabular-nums` (`font-variant-numeric: tabular-nums`) chống rung lắc ngang khi nhảy giây.
- **Tiêu đề tiếng Việt**: `text-wrap: balance; hyphens: none;` chống ngắt từ gãy đôi chữ tiếng Việt.
- **Đoạn văn tiếng Việt**: `text-wrap: pretty; overflow-wrap: break-word;`.

---

## 4. Cấu Trúc Điều Hướng (Navigation Architecture)

### A. PlatformHeader (1 hàng ngang `h-14`)
- **Bên trái**: PomoFocus Logo SVG + Tên thương hiệu + Badge trạng thái gói (khi đăng nhập).
- **Bên phải**: Số dư ví AI Credits (`⚡ 1.000`) + Avatar & Tên người dùng + Nút Đăng nhập/Đăng xuất.
- **Triệt tiêu**: Toàn bộ icon cài đặt rườm rà, nút chia màn hình thừa thãi.

### B. DockBar (4 Cụm Viên Nang Thủy Tinh)
1. `[ ⏱ Tập trung ]`: Nút Đồng hồ + Focus Mode + Zen Mode (phím tắt `Z`).
2. `[ 📋 Kế hoạch ]`: Widget tích hợp 2 tab [ Nhiệm vụ (Tasks) | Ghi chú (Notes) ].
3. `[ 🎧 Không gian ]`: Widget môi trường tích hợp [ Nền 4K | Âm thanh Lofi / YouTube ].
4. `[ ✨ Trợ lý AI ]`: Mở Drawer gia sư Socratic Socratic AI Companion.

### C. Giao Diện Di Động (Mobile Bottom Sheet)
- Trên màn hình `< 640px`: Mọi widget mở ra dạng Bottom Sheet trượt mượt mà từ đáy màn hình chiếm 70% chiều cao, có thanh vuốt (drag handle) để đóng nhanh bằng 1 ngón tay.

---

## 5. Quy Chuẩn Khóa Cứng Viewport (Anti-Overflow Contract)
- `html, body, #root, main { max-width: 100vw; overflow-x: hidden !important; position: relative; }`.
- Nghiêm cấm các thẻ div có `min-w-[...px]` lớn hơn `100vw` mà không có container cuộn ngang riêng (`overflow-x-auto`).
- Tất cả các bảng so sánh phải có cột tên tính năng đầu tiên cố định (`sticky left-0 bg-[#09090b] z-10 border-r border-zinc-800`).
