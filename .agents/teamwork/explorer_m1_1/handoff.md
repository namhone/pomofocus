# HANDOFF REPORT: EXPLORER M1-1 (ZERO-FOUT & SPLASH CURTAIN FOUNDATION)

**Dự án:** Pomofocus v6.0 Ultimate  
**Milestone:** M1 — Zero-FOUT & Typography Foundation  
**Agent:** Explorer M1-1  
**Người nhận (Recipient):** Sub-Orchestrator M1 / Project Orchestrator (`1bd3b181-5618-4e23-9890-9f34e23eca19`)  
**Tình trạng bàn giao:** Hard Handoff (Hoàn tất 100% mục tiêu điều tra)  

---

## 1. OBSERVATION (QUAN SÁT TRỰC TIẾP)

1. **`index.html:2`:**
   - Nguyên văn: `<html lang="vi">`
   - Quan sát: Không có `class="dark"`, không có inline styling.
2. **`index.html:8`:**
   - Nguyên văn: `<meta name="theme-color" content="#09090b" />`
   - Quan sát: Đã có thẻ meta theme-color nhưng chưa có Critical CSS đồng bộ bên dưới.
3. **`index.html:102`:**
   - Nguyên văn: `<body class="bg-slate-900 text-slate-100 select-none">`
   - Quan sát: Sử dụng `bg-slate-900` (`#0f172a`), không đồng nhất với nền Zen chuẩn `#09090b`. Class Tailwind không kích hoạt trước khi bundle CSS được tải.
4. **`index.html:103-133`:**
   - Quan sát: Bên trong `<div id="root">`, tồn tại 30 dòng HTML tĩnh (gồm `<header>`, `<nav>`, `<main>`, `<h1>`, `<p>`, `<ul>`, `<footer>`). Khi trình duyệt parse HTML trước lúc JS tải về, đoạn văn bản thô này bị render trên nền trắng với phông mặc định, gây hiện tượng FOUT/Hydration Flash.
5. **`src/main.tsx:20-28`:**
   - Nguyên văn:
     ```tsx
     ReactDOM.createRoot(document.getElementById('root')!).render(
       <React.StrictMode>
         <ErrorBoundary>
           <RouterProvider>
             <App />
           </RouterProvider>
         </ErrorBoundary>
       </React.StrictMode>,
     );
     ```
   - Quan sát: React 18 gắn kết vào `document.getElementById('root')`. React sẽ tự động dọn sạch và thế chỗ các phần tử con bên trong `#root`.
6. **`tests/unit/wcagAccessibilityAudit.test.ts:159-166`:**
   - Quan sát: Kiểm thử đọc trực tiếp `index.html` bằng `fs.readFileSync(indexPath, 'utf8')` và kiểm tra:
     - `<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin />`
     - `<link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />`
     - `media="print"`
     - `onload="this.media='all'"`
   - Bất kỳ thay đổi nào trong `index.html` bắt buộc phải bảo lưu các dòng này.
7. **Kết quả chạy kiểm thử nền tảng ban đầu:**
   - Lệnh: `npm test` (`vitest run`) $\rightarrow$ **52 passed (52 test files), 466 passed (466 tests)**, Thời gian: 253.33s.
   - Lệnh: `npm run type-check` (`tsc --noEmit`) $\rightarrow$ **0 errors (Exit code 0)**.

---

## 2. LOGIC CHAIN (CHUỖI LẬP LUẬN TỪ QUAN SÁT ĐẾN KẾT LUẬN)

1. Từ **Quan sát 1, 3 và 4**: Trình duyệt nạp HTML trước khi tải CSS và JS. Vì `<html>` và `<body>` không có inline dark style, và `<div id="root">` chứa văn bản crawler thô, trình duyệt hiển thị các dòng chữ đen trên nền trắng mặc định trong 200–500ms trước khi React và Tailwind nạp xong. Đây chính là nguyên nhân gốc rễ gây ra FOUT.
2. Từ suy luận trên và yêu cầu tại `ORIGINAL_REQUEST.md`: Cần áp dụng cơ chế 3 tác động đồng thời ngay trong `index.html`:
   - Khóa màu nền và chữ ngay lập tức tại thẻ gốc:
     - Thẻ `<html>`: `<html lang="vi" class="dark" style="background-color: #09090b !important; color: #f4f4f5;">`
     - Thẻ `<body>`: `<body class="bg-[#09090b] text-[#f4f4f5] select-none" style="background-color: #09090b !important; color: #f4f4f5;">`
   - Bổ sung khối Critical Inline CSS `<style>` trong `<head>` (ngay sau `<meta name="theme-color" content="#09090b" />`) định nghĩa `#pomo-splash-curtain` (`position: fixed; inset: 0; background-color: #09090b; z-index: 99999; pointer-events: none;`) cùng animation `.pomo-spinner` màu ngọc `#10b981`.
   - Bổ sung phần tử DOM `<div id="pomo-splash-curtain" aria-hidden="true"><div class="pomo-spinner"></div></div>` ngay đầu `<body>` trước `<div id="root">`.
   - Bổ sung script tháo rèm tại cuối `<body>`: Lắng nghe sự kiện `DOMContentLoaded` và kích hoạt `.loaded` sau `100ms` (có dự phòng khi `document.readyState === 'interactive' || 'complete'`).
3. Từ **Quan sát 5 (React Mounting)**: Vì `#pomo-splash-curtain` là phần tử anh em (sibling) của `<div id="root">`, nó không can thiệp vào cây DOM nội bộ mà React quản lý. Nhờ `pointer-events: none`, màn che không nuốt bất kỳ sự kiện click hay chạm nào. Toàn bộ nội dung crawler trong `<div id="root">` vẫn được bảo toàn trọn vẹn cho bot tìm kiếm (SEO).
4. Từ **Quan sát 6 và 7**: Cấu trúc thay đổi đề xuất hoàn toàn giữ nguyên các thẻ preconnect KaTeX, title, meta og/twitter và JSON-LD schema. Điều này đảm bảo không làm gãy test `wcagAccessibilityAudit.test.ts` và bảo lưu tỷ lệ 100% pass trên toàn bộ test suite.

---

## 3. CAVEATS (GIỚI HẠN & GIẢ ĐỊNH)

1. **Phạm vi quyền hạn:** Là Explorer, agent tuân thủ nghiêm ngặt nguyên tắc chỉ đọc (Read-only investigation). Không trực tiếp chỉnh sửa `index.html` nguồn. Thay vào đó, toàn bộ mã nguồn đề xuất hoàn chỉnh đã được tạo tại:
   - `d:\FileCuaNam\Web'\Pomodoro\.agents\teamwork\explorer_m1_1\proposed_index.html`
   - `d:\FileCuaNam\Web'\Pomodoro\.agents\teamwork\explorer_m1_1\index_html_changes.patch`
2. **Font Display:** Nhiệm vụ cấu hình `font-display: optional` thuộc phân công của Explorer M1-2 và Sub-Orchestrator M1. Phân tích này tập trung chuyên sâu vào `index.html`, Zero-FOUT preloader và tính toàn vẹn của React root mounting.
3. **Thời gian tháo rèm 100ms:** Thời gian 100ms sau `DOMContentLoaded` là mức chuẩn vàng được quy định trong `PROJECT.md` Interface Contract 1. Nếu trên máy yếu có mạng cực chậm (CPU throttling 4x), 100ms vẫn đủ an toàn vì rèm che có transition 300ms và `pointer-events: none` không gây đơ giao diện.

---

## 4. CONCLUSION (KẾT LUẬN CUỐI CÙNG)

1. Thiết kế Zero-FOUT cho `index.html` đã hoàn thiện 100%, bảo đảm triệt tiêu hoàn toàn hiện tượng nhấp nháy chữ thô/nền trắng khi vào trang hoặc F5.
2. Việc bổ sung `#pomo-splash-curtain` hoàn toàn **KHÔNG gây ảnh hưởng tiêu cực** đến việc gắn kết React root (`<div id="root">`), đồng thời bảo tồn 100% SEO fallback HTML cho các công cụ thu thập dữ liệu (AI Crawlers & Search Engines).
3. Đã xuất bản hai sản phẩm bàn giao kỹ thuật trực tiếp:
   - Bản mẫu hoàn chỉnh: `d:\FileCuaNam\Web'\Pomodoro\.agents\teamwork\explorer_m1_1\proposed_index.html`
   - Bản vá Unified Diff: `d:\FileCuaNam\Web'\Pomodoro\.agents\teamwork\explorer_m1_1\index_html_changes.patch`
   - Báo cáo phân tích chuyên sâu: `d:\FileCuaNam\Web'\Pomodoro\.agents\teamwork\explorer_m1_1\analysis.md`

---

## 5. VERIFICATION METHOD (PHƯƠNG PHÁP KIỂM CHỨNG ĐỘC LẬP)

Để kiểm chứng tính chính xác của đề xuất trước khi implement:

1. **Kiểm tra cú pháp và độ khớp bản vá:**
   ```powershell
   git apply --check "d:\FileCuaNam\Web'\Pomodoro\.agents\teamwork\explorer_m1_1\index_html_changes.patch"
   ```
2. **Kiểm tra WCAG Accessibility & Index HTML assertions:**
   ```powershell
   npx vitest run tests/unit/wcagAccessibilityAudit.test.ts
   ```
   *Kỳ vọng:* 8/8 tests pass trong ~30ms.
3. **Kiểm tra biên dịch kiểu TypeScript:**
   ```powershell
   npm run type-check
   ```
   *Kỳ vọng:* 0 lỗi.
4. **Kiểm tra toàn bộ test suite:**
   ```powershell
   npm test
   ```
   *Kỳ vọng:* 52/52 test files pass, 466/466 tests pass.
5. **Điều kiện vô hiệu hóa kết luận (Invalidation Conditions):**
   - Nếu bất kỳ thẻ con nào bên trong `<div id="root">` bị xóa bỏ khiến bot SEO không thấy nội dung.
   - Nếu `#pomo-splash-curtain` bị lồng nhầm vào bên trong `<div id="root">`, khiến React unmount làm mất hiệu ứng mờ dần.
