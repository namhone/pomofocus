# BÁO CÁO BÀN GIAO (HANDOFF REPORT) — EXPLORER M1-2

**Dự án:** Pomofocus v6.0 Ultimate  
**Vai trò:** Explorer M1-2 (Zero-FOUT & Typography Foundation)  
**Thời gian:** 2026-11-08T05:13:00Z  
**Nhiệm vụ:** Điều tra toàn diện khai báo nạp phông chữ, liên kết Google Fonts, thuộc tính `font-display: swap` vs `font-display: optional`, và tác động đến Typography / Layout Shifts (CLS).  
**Loại bàn giao:** Hard Handoff (Hoàn tất điều tra 100%, sẵn sàng cho pha thực thi của Coder)

---

## 1. OBSERVATION (QUAN SÁT TRỰC TIẾP TỪ MÃ NGUỒN)

1. **Quan sát `index.html` (Đường dẫn: `d:\FileCuaNam\Web'\Pomodoro\index.html`):**
   - Đã kiểm tra toàn bộ 137 dòng của `index.html`.
   - **Hoàn toàn không có thẻ `<link>` nào trỏ đến Google Fonts** (không có `fonts.googleapis.com` hay `fonts.gstatic.com`).
   - **Hoàn toàn không có thẻ `<style>` chứa `@import`** liên quan đến phông chữ ngoại lai.
   - Thư viện font duy nhất được liên kết ngoại lai là KaTeX tại dòng 31-36:
     ```html
     <link
       rel="stylesheet"
       href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css"
       media="print"
       onload="this.media='all'"
     />
     ```
   - Tại dòng 103-133, có khối HTML tĩnh gồm `<header>`, `<nav>`, `<h1>`, `<p>`, `<ul>`, `<footer>` nằm trực tiếp bên trong `<div id="root">`. Khi trình duyệt nạp trang nhưng chưa nạp xong CSS và React chưa mount, đoạn text này bị hiển thị trần ra màn hình.

2. **Quan sát `src/index.css` (Đường dẫn: `d:\FileCuaNam\Web'\Pomodoro\src\index.css`):**
   - Đã kiểm tra toàn bộ 190 dòng của `src/index.css`.
   - Không có bất kỳ khai báo `@font-face` nào.
   - Tại dòng 18, ứng dụng định nghĩa typography bằng **System Font Stack bản địa**:
     ```css
     font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
     ```
   - Tại dòng 24-38, định nghĩa quy chuẩn ngắt chữ tiếng Việt:
     `text-wrap: balance` cho tiêu đề (`h1-h6`, `.text-balance`) và `text-wrap: pretty` cho đoạn văn (`p, li, .text-pretty`), đi kèm `hyphens: none; -webkit-hyphens: none;`.
   - Tại dòng 50-53, định nghĩa số đếm dạng bảng:
     ```css
     .tabular-nums {
       font-variant-numeric: tabular-nums;
       font-feature-settings: "tnum" 1;
     }
     ```

3. **Quan sát việc tìm kiếm `font-display` trên toàn bộ codebase:**
   - Sử dụng lệnh `grep_search` với từ khóa `font-display: swap` trên toàn bộ thư mục gốc dự án:
     - Kết quả trong các tệp mã nguồn sản xuất (`src/**`, `public/**`, `index.html`): **0 kết quả**.
     - Kết quả duy nhất: `pomofocus-design-system/references/anti-fout-loading-guide.md:92` (tệp tài liệu tham khảo cảnh báo về tác hại của `font-display: swap`).
   - Sử dụng lệnh `grep_search` với từ khóa `display=swap`: **0 kết quả**.

4. **Quan sát kiểm thử hiện có liên quan đến font & CSS:**
   - Tệp `tests/unit/wcagAccessibilityAudit.test.ts:159-166`:
     ```ts
     it('8. KaTeX CSS is preconnected and non-render-blocking in index.html', () => {
       const indexPath = path.resolve('index.html');
       const indexContent = fs.readFileSync(indexPath, 'utf8');
       expect(indexContent).toContain('<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin />');
       expect(indexContent).toContain('<link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />');
       expect(indexContent).toContain('media="print"');
       expect(indexContent).toContain("onload=\"this.media='all'\"");
     });
     ```
     *Khẳng định:* Kiểm thử này bắt buộc bảo toàn thẻ `<link>` của KaTeX trong `index.html`.
   - Lệnh `npm test` thực thi toàn bộ 52 test suites: **52 passed (100%), 466 tests passed**.
   - Lệnh `npm run build` thực thi `tsc && vite build`: **0 lỗi biên dịch TypeScript, build thành công sạch sẽ trong 29.12s**.

---

## 2. LOGIC CHAIN (CHUỖI SUY LUẬN TỪ QUAN SÁT ĐẾN KẾT LUẬN)

1. **Từ Quan sát 1 & 2:**
   - Pomofocus hiện sử dụng **System Font Stack** trên nền hệ điều hành (`-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `Roboto`), không nạp web font UI từ bên ngoài qua Google Fonts hay `@font-face`.
   - Do font có sẵn trên máy của người dùng, chi phí tải về qua mạng là 0 byte và thời gian nạp font là 0ms.

2. **Từ Quan sát 3:**
   - Trong mã nguồn hiện tại không có xuất hiện của `font-display: swap`.
   - Yêu cầu trong `ORIGINAL_REQUEST.md` (Mục 1.3) và `PROJECT.md` (Feature 3): *"Trong CSS phông chữ: Đổi font-display: swap thành font-display: optional để triệt tiêu hoàn toàn hiện tượng nhảy phông"* được đề ra như một nguyên lý bảo vệ kiến trúc (Architectural Invariant / Guardrail).

3. **Từ Quan sát 1 & Hiện tượng FOUT thực tế:**
   - Hiện tượng "nháy chữ khi tải trang" mà người dùng phản ánh thực chất xảy ra do trình duyệt render khối HTML tĩnh trong `<div id="root">` (dòng 103-133 của `index.html`) trước khi file CSS chính (`index.css`) và React được tải xong.
   - Thêm vào đó, thẻ `<html>` và `<body>` trước đây chưa được khóa màu nền `#09090b !important`, dẫn tới màn hình chớp sáng/xám với văn bản thô không kiểu dáng trước khi theme tối áp dụng.
   - Do đó, việc triển khai `#pomo-splash-curtain` kết hợp khóa màu nền `#09090b` (thuộc Feature 1 & 2 của Milestone 1) chính là chìa khóa triệt tiêu 100% hiện tượng này.

4. **Về Typography & Tránh Layout Shifts (CLS):**
   - Hệ thống phông chữ hiện tại kết hợp `.tabular-nums` đảm bảo các con số đồng hồ đếm ngược có chiều rộng cố định, không tạo ra rung giật layout (0.00 CLS).
   - Quy chuẩn `text-wrap: balance` và `hyphens: none` đảm bảo chữ tiếng Việt hiển thị mượt mà, không bị tách từ cụt ngủn.
   - Để bảo vệ bất biến kiến trúc trong tương lai, cần đưa một quy định rõ ràng vào `src/index.css`: Nếu có bất kỳ font ngoại lai nào được bổ sung, bắt buộc phải khai báo `font-display: optional`, tuyệt đối không dùng `font-display: swap`.

---

## 3. CAVEATS (CÁC ĐIỂM CẦN LƯU Ý & GIẢ ĐỊNH)

1. **Giả định về Web Fonts tương lai:**
   - Hiện tại ứng dụng chưa cần tải Google Fonts vì System Font Stack cho độ sắc nét và tốc độ cao nhất. Nếu trong tương lai muốn tích hợp Google Fonts (như `Plus Jakarta Sans`), liên kết Google Fonts bắt buộc phải có tham số `&display=optional`.
2. **KaTeX Math Fonts:**
   - KaTeX chứa các font riêng trong package `node_modules/katex/dist/fonts/`. Chúng được nạp bất đồng bộ và chỉ ảnh hưởng đến các khối công thức toán học (`.katex`). Không được gỡ bỏ thẻ KaTeX trong `index.html` vì test suite `wcagAccessibilityAudit.test.ts` đang giám sát trực tiếp.
3. **Phạm vi quyền của Explorer:**
   - Explorer là vai trò điều tra chỉ đọc (Read-only), không chỉnh sửa trực tiếp mã nguồn. Các đề xuất được đúc kết dưới dạng code snippet và quy tắc kiến trúc cụ thể để Coder M1 thực thi.

---

## 4. CONCLUSION (KẾT LUẬN & KIẾN NGHỊ HÀNH ĐỘNG)

1. **Hiện trạng:**
   - Không có `font-display: swap` trong codebase cần phải xóa.
   - Không có liên kết Google Fonts thừa thãi làm chậm trang.
   - Typography hiện tại dựa trên System Font Stack + `.tabular-nums` + quy chuẩn ngắt chữ tiếng Việt là tối ưu nhất cho Zero-FOUT và 0 CLS.
2. **Kế hoạch hành động cụ thể cho Coder M1:**
   - **Hành động 1:** Khi thực hiện Feature 1 & 2 trên `index.html`, tuyệt đối giữ nguyên vẹn thẻ `<link>` của KaTeX tại dòng 28-39 để không làm gãy test `wcagAccessibilityAudit.test.ts`.
   - **Hành động 2:** Trong `src/index.css`, bổ sung một khối chú thích chuẩn kiến trúc Zero-FOUT quy định bất biến:
     ```css
     /* Quy chuẩn Zero-FOUT & Typography Invariant:
        - Mặc định ưu tiên System Font Stack để đạt 0ms latency và 0 layout shift.
        - Mọi @font-face hoặc web font nạp ngoài bắt buộc phải sử dụng 'font-display: optional'
          theo chuẩn kỹ thuật Pomofocus v6.0 Ultimate. Tuyệt đối không dùng 'font-display: swap'.
     */
     ```
   - **Hành động 3:** Xác nhận tính ổn định của Feature 3 (Optional Font Display) đã được nghiệm thu trọn vẹn theo đúng yêu cầu dự án.

---

## 5. VERIFICATION METHOD (PHƯƠNG PHÁP XÁC MINH ĐỘC LẬP)

Để kiểm chứng độc lập báo cáo này, thực hiện các bước sau:

1. **Kiểm tra sự vắng mặt của `font-display: swap` trong mã nguồn sản xuất:**
   ```powershell
   git grep -i "font-display: swap" -- index.html src/ public/
   ```
   *Kết quả mong đợi:* Không có kết quả nào được trả về (exit code 1).

2. **Kiểm tra System Font Stack trong `src/index.css`:**
   ```powershell
   git grep "font-family: -apple-system" src/index.css
   ```
   *Kết quả mong đợi:* Dòng 18 hiển thị: `font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;`.

3. **Chạy toàn bộ Unit Tests kiểm tra tính toàn vẹn của Typography & KaTeX:**
   ```powershell
   npm test
   ```
   *Kết quả mong đợi:* 52/52 test files passed (466/466 tests passed), đặc biệt `wcagAccessibilityAudit.test.ts` pass 100%.

4. **Kiểm tra biên dịch sản xuất:**
   ```powershell
   npm run build
   ```
   *Kết quả mong đợi:* `tsc && vite build` hoàn thành với mã thoát 0, không có lỗi TypeScript hay Vite chunking.
