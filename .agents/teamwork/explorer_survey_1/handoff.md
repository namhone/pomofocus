# BÁO CÁO BÀN GIAO (HANDOFF REPORT) — SURVEY EXPLORER 1
**Dự án:** Pomofocus v6.0 Ultimate  
**Vai trò:** Survey Explorer 1  
**Thời gian:** 2026-11-08T04:54:30Z  
**Phạm vi:** Điều tra kỹ thuật Section 0 (Design showcase), Section 1 (Zero-FOUT), Section 2 (AI Companion collision)  
**Loại bàn giao:** Hard Handoff (Hoàn tất khảo sát, sẵn sàng cho pha thiết kế kế hoạch & thực thi)

---

## 1. OBSERVATION (QUAN SÁT TRỰC TIẾP TỪ MÃ NGUỒN)

1. **Section 0 — Thiết kế tham chiếu & Showcase nội bộ:**
   - Tệp `pomofocus-design-system/assets/design-system-showcase.html` (328 dòng) tồn tại, chứa trọn bộ CSS Liquid Glass (`background: rgba(9, 9, 11, 0.45)`, `backdrop-filter: blur(28px)`, viền kính phản chiếu specular highlight `inset 0 1px 0 0 rgba(255, 255, 255, 0.15)`).
   - Tệp `pomofocus-design-system/references/apple-liquid-dock.md` (328 dòng) chứa chuẩn vật lý macOS Dock: `--s: 60px`, `--max: 1.75`, icon kế cận nấc 1 `scale(1.42)`, nấc 2 `scale(1.04)`, `translateY(-8px)`, chấm đèn tròn 3px `.dock__dot`, tooltip kính mờ 14px.
   - Tệp `pomofocus-design-system/references/anti-fout-loading-guide.md` (137 dòng) chứa đặc tả kiến trúc 3 lớp chống FOUT.

2. **Section 1 — Hiện trạng `index.html` gây nháy chữ (FOUT):**
   - `index.html:2`: Thẻ `<html>` chỉ có `<html lang="vi">`, hoàn toàn thiếu `class="dark"` và `style="background-color: #09090b !important; color: #f4f4f5;"`.
   - `index.html:102`: Thẻ `<body>` sử dụng `<body class="bg-slate-900 text-slate-100 select-none">`. Màu `#0f172a` (slate-900) lệch tông với nền đen `#09090b` của ứng dụng và phụ thuộc vào Tailwind CSS nạp trễ.
   - `index.html:103-133`: Bên trong `<div id="root">`, có khối HTML tĩnh gồm `<header>`, `<main id="main-content">`, tiêu đề `<h1>`, danh sách tính năng và `<footer>`. Khi chưa nạp xong CSS và React chưa mount, đoạn text này bị trình duyệt vẽ trần ra màn hình bằng font mặc định và link xanh gạch chân.
   - `index.html`: Hoàn toàn thiếu thành phần `#pomo-splash-curtain` và inline CSS preloader.

3. **Section 2 — Hiện trạng xung đột giữa `PlatformHeader` và `AiCompanionWidget`:**
   - `src/components/AiCompanionWidget.tsx:289`:
     ```tsx
     className={`fixed top-14 bottom-0 right-0 z-40 w-full sm:w-[420px] max-w-full bg-zinc-950/95 backdrop-blur-2xl border-l border-zinc-800 ...`}
     ```
     - Z-Index chỉ là `z-40`, thấp hơn Header đầy đủ (`z-50`) và ngang hàng với viên nang nổi (`z-40`).
     - Tọa độ đỉnh bị gán cứng `top-14` (56px) tạo một khoảng hở 56px phía trên nóc khi ở `/app`.
   - `src/components/PlatformHeader.tsx:270`:
     - Viên nang nổi `floating-header-capsule` định vị tại `fixed top-3 right-4 sm:right-6 z-40` (`y = 12px` đến `48px`).
     - Header mở rộng `platform-unified-header` định vị tại `fixed top-0 left-0 right-0 w-full h-14 z-50`. Cụm nút phải (Avatar, Credits ⚡, Settings ⚙️) nằm ở tọa độ `y = 0 đến 50px`.
     - `PlatformHeader.tsx` chỉ import `aiCreditsBalance`, **hoàn toàn KHÔNG đọc** biến `isOpen` từ `useAiStore`, nên không tự ẩn khi AI Companion mở ra.

4. **Trạng thái kiểm thử hệ thống:**
   - Lệnh `npm test` (Vitest v2.1.8): `Test Files: 52 passed (52)`, `Tests: 466 passed (466)`.
   - Lệnh `npx tsc --noEmit`: Thoát với mã code 0, không có bất kỳ lỗi biên dịch TypeScript nào.

---

## 2. LOGIC CHAIN (CHUỖI SUY LUẬN TỪ QUAN SÁT ĐẾN GIẢI PHÁP)

1. **Về Zero-FOUT (Section 1):**
   - Từ Quan sát 2: Hiện tượng nháy chữ xảy ra vì trình duyệt hiển thị HTML tĩnh trong `<div id="root">` trước khi CSS được áp dụng, và màu nền mặc định của body chưa được khóa cứng.
   - Suy ra: Để đạt 0ms FOUT, bắt buộc phải có màn che `#pomo-splash-curtain` định vị `fixed inset-0` với `z-index: 99999` và màu `#09090b` che kín màn hình ngay lập tức bằng Inline Critical CSS trong `<head>`.
   - Đồng thời, gắn `class="dark"` và `style="background-color: #09090b !important; color: #f4f4f5;"` vào thẻ `<html>` và `<body>` để ngăn chặn chớp trắng kể cả ở mạng cực chậm 2G/3G.
   - Script tự động tháo rèm sau 100ms khi `DOMContentLoaded` đảm bảo React đã sẵn sàng nhận DOM.

2. **Về Xung đột AI Companion & PlatformHeader (Section 2):**
   - Từ Quan sát 3: `ai-companion-drawer` ở `z-40` và `top-14`, trong khi `PlatformHeader` ở `z-50` (hoặc capsule `z-40` tại `top-3 right-4`).
   - Tọa độ góc trên bên phải bị 2 thành phần độc lập cùng tranh chấp không gian.
   - Suy ra:
     - Phải nâng `ai-companion-drawer` lên `z-[80]` và kéo dài toàn vẹn từ đỉnh `top-0` xuống đáy `bottom-0`.
     - Phải đưa `isAiOpen` từ `useAiStore` vào `PlatformHeader.tsx`:
       - Khi `isAiOpen === true`: Tự động ẩn viên nang thu gọn (`!isHeaderExpanded && !isAiOpen`) và làm mờ/vô hiệu hóa cụm nút góc phải của header mở rộng (`opacity-0 pointer-events-none`).
       - Khi `isAiOpen === false`: Tự động phục hồi hiển thị viên nang và các nút header bình thường.
     - Nâng backdrop mobile của AI lên `z-[75]` và mở rộng toàn màn hình (`inset-0`).

---

## 3. CAVEATS (CÁC VẤN ĐỀ CẦN LƯU Ý KHI THỰC HIỆN)

1. **Ràng buộc kiểm thử WCAG:**
   - Trong `tests/unit/wcagAccessibilityAudit.test.ts`, các test case kiểm tra sự hiện diện của chuỗi `data-testid="capsule-avatar-btn"`, `aria-label="Tài khoản và Menu"`, `data-testid="ai-close-drawer-btn ai-btn-close-drawer"`.
   - Lưu ý: Không được xóa bỏ phần tử khỏi DOM bằng điều kiện `{isAiOpen && ...}` mà phải chuyển đổi qua CSS classes (`opacity-0 pointer-events-none scale-90`), để tránh làm gãy các assertion tĩnh trong test.
2. **Kích thước AI Drawer theo Section 5:**
   - Trong Section 5 có ghi chú: `AI Companion: Min 340px — Max 460px, chiều cao h-[calc(100vh-24px)]`. Khi định dạng ở chế độ nổi `h-[calc(100vh-24px)]` (tương đương `top-3 bottom-3 right-3 sm:right-4 rounded-3xl`), AI Drawer ở tầng `z-[80]` vẫn hoạt động hoàn hảo và không bị che khuất nhờ cụm nút header đã tự động lùi bước.

---

## 4. CONCLUSION (KẾT LUẬN & ĐỀ XUẤT HÀNH ĐỘNG)

1. **Mức độ khả thi:** 100% khả thi, thay đổi cục bộ có độ chính xác cao (Surgical Changes), tuân thủ tuyệt đối Karpathy Guidelines.
2. **Các tệp cần thay đổi:**
   - `index.html`: Thêm Dark lock trên `<html>`/`<body>`, bổ sung Inline Critical CSS, Splash Curtain `#pomo-splash-curtain`, spinner và script tháo rèm.
   - `src/components/PlatformHeader.tsx`: Thêm `const isAiOpen = useAiStore((s) => s.isOpen)`, gắn điều kiện ẩn `!isAiOpen` cho viên nang và class mờ cho cụm nút phải.
   - `src/components/AiCompanionWidget.tsx`: Đổi `top-14` thành `top-0`, nâng drawer lên `z-[80]`, nâng mobile backdrop lên `z-[75]`.
3. **Mức độ rủi ro:** Rất thấp. Cả 52/52 test files hiện tại đều pass và TypeScript sạch 0 lỗi.

---

## 5. VERIFICATION METHOD (PHƯƠNG PHÁP XÁC MINH ĐỘC LẬP)

1. **Kiểm tra biên dịch & Test Suite:**
   ```powershell
   npm test
   npx tsc --noEmit
   npm run build
   ```
2. **Kiểm tra trực quan FOUT:**
   - Mở trình duyệt Chrome/Edge, mở DevTools, bật Network Throttling sang "Slow 3G".
   - Bấm `Ctrl + F5` tải lại trang.
   - *Điều kiện xác nhận đạt:* Màn hình hiển thị nền đen `#09090b` ngay lập tức cùng vòng quay spinner ngọc lục bảo êm ái, tuyệt đối không xuất hiện bất kỳ dòng chữ đen trên nền trắng nào trước khi giao diện kính lỏng xuất hiện.
3. **Kiểm tra tương tác va chạm AI Companion:**
   - Vào `/app`.
   - Bấm vào icon AI trên DockBar hoặc phím tắt để mở AI Companion Drawer.
   - *Điều kiện xác nhận đạt:*
     - Khung chat AI trượt ra từ đỉnh màn hình (`top-0`), che phủ với `z-[80]`.
     - Toàn bộ thanh tiêu đề AI Companion gồm: "AI Study Companion", Badge Credits ⚡, Nút +, Nút Lịch sử, Nút Làm mới ↺, và Nút ✕ Đóng hiển thị 100% sắc nét.
     - Viên nang nổi `floating-header-capsule` và cụm nút header phải tự động ẩn đi, không bị chồng đè, không có bóng ma và không có xung đột click.
     - Bấm nút ✕ trên AI Companion: Khung chat trượt đóng lại, viên nang nổi và các nút header xuất hiện trở lại mượt mà.
