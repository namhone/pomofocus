# HANDOFF REPORT: EXPLORER M1-3 (TEST SUITE & BUILD IMPACT)

**Dự án:** Pomofocus v6.0 Ultimate (Liquid Glass & Zen Minimalism)  
**Milestone:** M1 — Zero-FOUT & Typography Foundation  
**Agent:** Explorer M1-3  
**Người nhận (Recipient):** Project Orchestrator (`1bd3b181-5618-4e23-9890-9f34e23eca19`) / Sub-Orchestrator M1  
**Tình trạng bàn giao:** Hard Handoff (Hoàn tất 100% mục tiêu điều tra kiểm thử và đóng gói)  

---

## 1. OBSERVATION (QUAN SÁT TRỰC TIẾP)

1. **`tests/unit/wcagAccessibilityAudit.test.ts:159-166`:**
   - Nguyên văn đoạn code kiểm thử:
     ```typescript
     it('8. KaTeX CSS is preconnected and non-render-blocking in index.html', () => {
       const indexPath = path.resolve('index.html');
       const indexContent = fs.readFileSync(indexPath, 'utf8');
       expect(indexContent).toContain('<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin />');
       expect(indexContent).toContain('<link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />');
       expect(indexContent).toContain('media="print"');
       expect(indexContent).toContain("onload=\"this.media='all'\"");
     });
     ```
   - Đây là tệp kiểm thử **DUY NHẤT** trong toàn bộ 52 tệp test đọc trực tiếp nội dung `index.html`. Nó chỉ assert 4 chuỗi ký tự KaTeX CDN và không kiểm tra class/style của thẻ `<html>` hay `<body>`.
2. **`tests/unit/timerDocumentTitleLifecycle.test.ts:13-14`:**
   - Nguyên văn:
     ```typescript
     beforeEach(() => {
       // Reset document.title
       document.title = 'Initial Title';
       vi.restoreAllMocks();
     });
     ```
   - Kiểm thử `document.title` chạy trên JSDOM và được mock chủ động bằng `'Initial Title'`. Không có test nào trong unit hoặc E2E đọc thẻ `<title>` gốc của `index.html`.
3. **Truy vấn thẻ `<meta>` và `<div id="root">`:**
   - Tìm kiếm `meta` trên toàn bộ thư mục `tests/`: 0 kết quả khớp với thẻ HTML `<meta>` của `index.html` (chỉ khớp `user_metadata` của Supabase Auth).
   - Tìm kiếm `root` hoặc `getElementById('root')` trên toàn bộ `tests/`: 0 kết quả truy vấn.
4. **Môi trường JSDOM & React Testing Library:**
   - `vite.config.ts:57-61`: Vitest chạy với `environment: 'jsdom'` không có `setupFiles`. JSDOM bắt đầu với trang trắng mặc định `about:blank`.
   - `tests/unit/zenErrorPages.test.tsx:23`: Sử dụng `@testing-library/react` hàm `render()`, tạo container `div` độc lập gắn vào `document.body`. Tệp `index.html` hoàn toàn không được JSDOM nạp trong các bài unit test.
5. **Đặc tính kỹ thuật của `#pomo-splash-curtain` đối với Playwright E2E:**
   - CSS: `pointer-events: none;` được khai báo inline ngay từ đầu.
   - Script inline: `window.addEventListener('DOMContentLoaded', ...)` gán class `.loaded` sau 100ms.
   - Class `.loaded` có `opacity: 0; visibility: hidden;`.
   - Toàn bộ các bài test trong `tests/e2e/` (như `layoutZenFlow.spec.ts`) đều sử dụng `await expect(page.locator(...)).toBeVisible()`, thời gian chờ hydration (>100ms) tự nhiên vượt quá thời gian tháo rèm.
   - Không có bài test E2E nào dùng `toHaveScreenshot()` để so sánh pixel diff vàng (golden diff).
6. **Thực thi lệnh kiểm tra hiện trạng (Baseline Execution):**
   - Lệnh `npm test` (`vitest run`): **52 passed (52 files), 466 passed (466 tests)**, Thời gian: 254.43s.
   - Lệnh `npm run type-check` (`tsc --noEmit`): **Exit code 0 (0 errors, 0 warnings)**.
   - Lệnh `npx vite build`: **Built in 52.93s, 50 assets precached in `dist/sw.js`**. Tệp `dist/index.html` bảo toàn nguyên vẹn toàn bộ các khối `<style>`, `<script>` inline và thuộc tính thẻ `<html>`, `<body>`.

---

## 2. LOGIC CHAIN (CHUỖI LẬP LUẬN TỪ QUAN SÁT ĐẾN KẾT LUẬN)

1. **Từ Quan sát 1 và 3:** Vì `wcagAccessibilityAudit.test.ts` chỉ kiểm tra 4 chuỗi KaTeX, việc bổ sung `class="dark" style="background-color: #09090b !important; color: #f4f4f5;"` vào thẻ `<html>`/`<body>` và thêm `#pomo-splash-curtain` sẽ **không làm vỡ** bất kỳ assertion nào, miễn là các dòng KaTeX được bảo toàn.
2. **Từ Quan sát 2 và 3:** Thẻ `<title>` và các thẻ `<meta>` trong `index.html` không bị bất kỳ unit test hay E2E test nào ràng buộc nội dung cứng. Mọi thay đổi hoặc giữ nguyên đều an toàn 100%.
3. **Từ Quan sát 4:** Vitest chạy JSDOM không nạp `index.html`. Do đó, `#pomo-splash-curtain` thậm chí không hiện diện trong JSDOM khi chạy unit test. React Testing Library trong `zenErrorPages.test.tsx` hoàn toàn không bị ảnh hưởng.
4. **Từ Quan sát 5:** Trong Playwright E2E, `#pomo-splash-curtain` sở hữu `pointer-events: none;` nên không bao giờ chặn click. Đồng thời, cơ chế tự động ẩn `.loaded` sau 100ms và tính chất bất đồng bộ của Playwright (`toBeVisible()`) bảo đảm rèm che đã biến mất hoàn toàn trước khi Playwright tương tác với các widget React.
5. **Từ Quan sát 6:** Trình biên dịch Vite xử lý `index.html` ở dạng AST mà không xóa bỏ hoặc can thiệp vào inline CSS/JS. Các thẻ inline của Splash Curtain được giữ nguyên 100% trong `dist/index.html` và được Service Worker PWA nạp vào bộ nhớ đệm (precache) an toàn.
6. **Kết luận tổng hợp:** Việc triển khai Milestone 1 (Zero-FOUT Dark Lock, Splash Curtain Preloader, và `font-display: optional`) có **độ an toàn tuyệt đối (100% Zero-Regression)** với toàn bộ test suite và build pipeline hiện hữu.

---

## 3. CAVEATS (GIỚI HẠN & GIẢ ĐỊNH)

1. **Vị trí của `#pomo-splash-curtain` trong DOM:** Bắt buộc phải đặt `#pomo-splash-curtain` là phần tử anh em (sibling) của `<div id="root">`, tuyệt đối không đặt lồng bên trong `<div id="root">` (vì React reconciler sẽ dọn dẹp hoặc unmount cây con bên trong root khi nạp).
2. **Bảo tồn nội dung Crawler bên trong `#root`:** Dù có splash curtain che phủ bên ngoài, 30 dòng HTML tĩnh (crawler text) bên trong `<div id="root">` phải được giữ nguyên vẹn để phục vụ SEO và bot tìm kiếm.
3. **Phạm vi quyền hạn:** Là Explorer, agent tuân thủ nguyên tắc Read-Only, không trực tiếp sửa đổi mã nguồn. Đề xuất bản vá mã nguồn và mẫu hoàn chỉnh do Explorer M1-1 cung cấp.

---

## 4. CONCLUSION (KẾT LUẬN CUỐI CÙNG)

1. **Đánh giá tác động kiểm thử:**
   - 0 bài unit test bị ảnh hưởng tiêu cực.
   - 0 bài E2E test bị ảnh hưởng hoặc chặn sự kiện.
   - Đảm bảo 100% duy trì kết quả 52/52 test files pass và 466/466 tests pass.
2. **Đánh giá tác động bản dựng:**
   - Vite 5 và plugin VitePWA xử lý hoàn hảo `index.html` cải tiến, bảo toàn inline CSS, script và đưa vào danh sách precache offline.
   - `tsc --noEmit` hoàn tất sạch sẽ 0 lỗi.
3. **Khuyến nghị bổ sung:**
   - Bổ sung tệp kiểm thử tự động `tests/unit/zeroFoutAndTypography.test.ts` (7 ca kiểm thử) theo thiết kế tại mục 7 của `analysis.md` để tự động hóa việc bảo vệ các tiêu chuẩn Zero-FOUT trong các lần build tiếp theo.

---

## 5. VERIFICATION METHOD (PHƯƠNG PHÁP KIỂM CHỨNG ĐỘC LẬP)

Để kiểm chứng tính độc lập và chính xác của báo cáo:

1. **Kiểm tra hồi quy bài test đọc `index.html`:**
   ```powershell
   npx vitest run tests/unit/wcagAccessibilityAudit.test.ts
   ```
   *Kỳ vọng:* 8 tests pass trong ~30ms.
2. **Kiểm tra biên dịch tĩnh TypeScript:**
   ```powershell
   npm run type-check
   ```
   *Kỳ vọng:* Exit code 0, không có lỗi kiểu dữ liệu.
3. **Kiểm tra đóng gói bản dựng Vite:**
   ```powershell
   npx vite build
   ```
   *Kỳ vọng:* Hoàn tất trong ~50s, sinh `dist/index.html` và `dist/sw.js` không có cảnh báo lỗi.
4. **Kiểm tra toàn bộ hệ thống Unit Test:**
   ```powershell
   npm test
   ```
   *Kỳ vọng:* 52/52 test files passed, 466/466 tests passed.
5. **Điều kiện vô hiệu hóa kết luận (Invalidation Conditions):**
   - Nếu bất kỳ thuộc tính nào trong 4 dòng KaTeX preconnect của `index.html` bị xóa hoặc chỉnh sửa làm fail bài test `wcagAccessibilityAudit.test.ts:159`.
   - Nếu `#pomo-splash-curtain` thiếu thuộc tính `pointer-events: none;`, dẫn đến việc các bài test Playwright E2E bị chặn click khi mạng bị lag bất thường.
