# BÁO CÁO PHÂN TÍCH KỸ THUẬT: ZERO-FOUT & NỀN TẢNG TYPOGRAPHY (MILESTONE 1)

**Dự án:** Pomofocus v6.0 Ultimate  
**Vai trò:** Explorer M1-2  
**Thời gian:** 2026-11-08T05:12:00Z  
**Phạm vi:** Điều tra toàn diện khai báo phông chữ, liên kết Google Fonts, quy tắc `@font-face`, thuộc tính `font-display: swap` vs `font-display: optional`, và tác động đến Cumulative Layout Shift (CLS) / Typography.

---

## 1. TỔNG QUAN ĐIỀU TRA (EXECUTIVE SUMMARY)

1. **Khảo sát khai báo phông chữ trong `index.html`:**
   - **Không có thẻ `<link>` Google Fonts** (không có `fonts.googleapis.com` hay `fonts.gstatic.com`).
   - **Không có quy tắc `@import`** nạp font từ xa.
   - Thư viện font duy nhất được liên kết từ xa là KaTeX thông qua CDN jsdelivr:
     ```html
     <!-- index.html:31-36 -->
     <link
       rel="stylesheet"
       href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css"
       media="print"
       onload="this.media='all'"
     />
     ```
     Stylesheet này chỉ phục vụ hiển thị công thức toán học (`.katex`) và sử dụng cơ chế nạp bất đồng bộ không chặn render (`media="print"` chuyển sang `media="all"` khi nạp xong).

2. **Khảo sát hệ thống phông chữ trong `src/index.css`:**
   - **Không có khai báo `@font-face` cục bộ nào**.
   - Pomofocus hiện đang sử dụng **System Font Stack (Phông chữ hệ thống bản địa)** tại `src/index.css:18`:
     ```css
     html, body, #root, main {
       ...
       font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
       text-rendering: optimizeLegibility;
       -webkit-font-smoothing: antialiased;
     }
     ```
   - Font stack này tận dụng font có sẵn trong hệ điều hành của người dùng:
     - **macOS / iOS:** San Francisco (`-apple-system`, `BlinkMacSystemFont`)
     - **Windows:** Segoe UI (`"Segoe UI"`)
     - **Android / ChromeOS / Linux:** Roboto (`Roboto`), Helvetica Neue, Arial, sans-serif
   - **Ưu điểm vượt trội:** 0ms thời gian nạp mạng, 0 byte băng thông tải về, và bản chất không bao giờ bị FOUT do font trễ mạng.

3. **Hiện trạng `font-display: swap` trong codebase:**
   - Đã quét toàn bộ dự án (`grep_search` không phân biệt hoa thường): **Không có bất kỳ dòng code nào chứa `font-display: swap`** trong `index.html`, `src/**`, hay `public/**`.
   - Lần xuất hiện duy nhất của `font-display: swap` nằm ở tệp tài liệu tham khảo `pomofocus-design-system/references/anti-fout-loading-guide.md:92`, nơi nó được nêu ra như một phản ví dụ (anti-pattern) cần tránh.
   - Trong `node_modules/katex/dist/` có tồn tại tệp `katex-swap.css`, nhưng dự án chỉ import `katex.min.css` (sử dụng `font-display: block` mặc định của KaTeX).

4. **Nguyên nhân cốt lõi gây ra hiện tượng FOUT (Nháy chữ):**
   - Hiện tượng người dùng nhìn thấy dòng chữ trần (unstyled text) nhấp nháy khi tải trang **không bắt nguồn từ việc hoán đổi web font (`font-display: swap`)**.
   - Nguyên nhân thực sự là do **khối HTML tĩnh dự phòng cho SEO/Crawlers trong `index.html:103-139`** nằm ngay bên trong `<div id="root">`.
   - Khi trình duyệt tải `index.html` về, trước khi các gói bundle JavaScript (`main.tsx`) và CSS (`index.css`) được parse và render xong, trình duyệt đã vội vẽ các thẻ `<header>`, `<nav>`, `<h1>`, `<p>`, `<a>` bằng kiểu mặc định của trình duyệt (chữ đen/xanh có gạch chân, nền chưa khóa đen).
   - Ngay sau đó, React mount vào `#root` và thay thế toàn bộ nội dung, gây ra cú giật FOUT cực kỳ khó chịu.
   - Việc bổ sung `#pomo-splash-curtain` kết hợp khóa nền `#09090b` (thuộc Feature 1 & 2 của M1) sẽ triệt tiêu hoàn toàn hiện tượng này.

---

## 2. BẰNG CHỨNG QUAN SÁT CHI TIẾT TỪ MÃ NGUỒN (EVIDENCE CHAIN)

### A. Kiểm tra `index.html` (Đường dẫn: `d:\FileCuaNam\Web'\Pomodoro\index.html`)
- **Dòng 1-40:**
  ```html
  1: <!doctype html>
  2: <html lang="vi">
  3:   <head>
  4:     <meta charset="UTF-8" />
  5:     <link rel="icon" type="image/svg+xml" href="/logo.svg" />
  ...
  28:     <!-- Preconnect & Asynchronous Loading for KaTeX CSS to eliminate render-blocking -->
  29:     <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin />
  30:     <link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />
  31:     <link
  32:       rel="stylesheet"
  33:       href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css"
  34:       media="print"
  35:       onload="this.media='all'"
  36:     />
  37:     <noscript>
  38:       <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css" />
  39:     </noscript>
  ```
  *Nhận xét:* Không có thẻ `<link rel="stylesheet" href="https://fonts.googleapis.com/...">`.
- **Dòng 102-135:**
  ```html
  102:   <body class="bg-slate-900 text-slate-100 select-none">
  103:     <div id="root">
  104:       <!-- Nội dung tĩnh cho AI Crawlers & Trình duyệt không bật JavaScript -->
  105:       <header>
  ...
  114:       <main id="main-content">
  115:         <h1>PomoFocus — Không Gian Làm Việc & Học Tập Tập Trung Chuẩn Zen</h1>
  ...
  134:     <script type="module" src="/src/main.tsx"></script>
  135:   </body>
  ```
  *Nhận xét:* Đoạn mã tĩnh từ dòng 104 đến 133 chính là nội dung bị vẽ trần trước khi React khởi động.

### B. Kiểm tra `src/index.css` (Đường dẫn: `d:\FileCuaNam\Web'\Pomodoro\src\index.css`)
- **Dòng 10-21:**
  ```css
  10:   html, body, #root, main {
  11:     min-height: 100%;
  12:     width: 100%;
  13:     max-width: 100vw;
  14:     overflow-x: hidden !important;
  15:     position: relative;
  16:     margin: 0;
  17:     padding: 0;
  18:     font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  19:     text-rendering: optimizeLegibility;
  20:     -webkit-font-smoothing: antialiased;
  21:   }
  ```
- **Dòng 24-38 (Quy chuẩn Typography tiếng Việt):**
  ```css
  24:   h1, h2, h3, h4, h5, h6, .text-balance {
  25:     text-wrap: balance;
  26:     hyphens: none;
  27:     -webkit-hyphens: none;
  28:     word-break: normal;
  29:     overflow-wrap: break-word;
  30:   }
  31: 
  32:   p, li, .text-pretty {
  33:     text-wrap: pretty;
  34:     hyphens: none;
  35:     -webkit-hyphens: none;
  36:     word-break: normal;
  37:     overflow-wrap: break-word;
  38:   }
  ```
- **Dòng 50-53 (Đồng hồ đếm ngược số dạng bảng tabular numbers):**
  ```css
  50:   .tabular-nums {
  51:     font-variant-numeric: tabular-nums;
  52:     font-feature-settings: "tnum" 1;
  53:   }
  ```
  *Nhận xét:* `.tabular-nums` ngăn ngừa giật ngang (horizontal layout shift) khi số đếm Pomodoro nhảy từng giây.

### C. Kiểm tra `src/main.tsx` (Đường dẫn: `d:\FileCuaNam\Web'\Pomodoro\src\main.tsx`)
- **Dòng 7-8:**
  ```tsx
  7: import './index.css';
  8: import 'katex/dist/katex.min.css';
  ```
  *Nhận xét:* KaTeX CSS được Vite gom vào bundle CSS chính (`dist/assets/index-*.css`). Khi build, Vite xuất ra các file font WOFF2 cho KaTeX trong `dist/assets/`.

### D. Kiểm tra ràng buộc kiểm thử trong `tests/unit/wcagAccessibilityAudit.test.ts`
- **Dòng 159-166:**
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
  *Cảnh báo nghiêm ngặt:* Bất kỳ can thiệp nào vào `index.html` đối với font hoặc CSS bắt buộc phải bảo toàn 100% các thẻ `preconnect`, `dns-prefetch`, `media="print"`, và `onload="this.media='all'"` của KaTeX; nếu xóa hoặc thay đổi, test này sẽ thất bại ngay lập tức!

---

## 3. PHÂN TÍCH SO SÁNH: `font-display: optional` VS `swap` VS SYSTEM FONTS

| Tiêu chí | `font-display: swap` | `font-display: optional` | System Font Stack (Hiện tại của Pomofocus) |
|---|---|---|---|
| **Thời gian chặn (Block period)** | 0s (vẽ font thay thế ngay) | Cực ngắn (~100ms) | **0ms (Không cần nạp mạng)** |
| **Thời gian hoán đổi (Swap period)** | Vô hạn (tải xong lúc nào đổi lúc đó) | **0s (Không bao giờ đổi sau khi vẽ)** | **0s (Bản địa trên OS)** |
| **Nguy cơ FOUT (Nháy chữ)** | **Cực cao** (Chữ đổi hình dạng khi font về) | **0% (Tuyệt đối không nháy)** | **0% (Tuyệt đối không nháy)** |
| **Cumulative Layout Shift (CLS)** | Cao (Do x-height và glyph width lệch nhau) | **0.00 (Hoàn hảo)** | **0.00 (Hoàn hảo)** |
| **Băng thông mạng nạp font** | 50KB - 200KB | 50KB - 200KB (nạp nền vào cache) | **0 KB (Miễn phí 100%)** |
| **Độ sắc nét & Tương thích OS** | Tùy engine font | Tùy engine font | Tối ưu hóa tối đa theo màn hình Retina/ClearType |

---

## 4. QUY TẮC BẤT BIẾN KIẾN TRÚC & KẾ HOẠCH BẢO ĐẢM (INVARIANTS & ACTION PLAN)

Để đáp ứng 100% yêu cầu kỹ thuật trong `ORIGINAL_REQUEST.md` (Mục 1.3) và `PROJECT.md` (Feature 3):

### Quy Tắc 1: Quy Chuẩn Bắt Buộc Khi Thêm Web Fonts Ngoại Lai
Nếu trong tương lai bất kỳ thành phần nào bổ sung Google Fonts (ví dụ `Plus Jakarta Sans`, `Inter`, hay `Geist`) vào `index.html`, đường dẫn URL bắt buộc phải kết thúc bằng:
```
&display=optional
```
Tuyệt đối cấm sử dụng `&display=swap`.

### Quy Tắc 2: Quy Chuẩn Bắt Buộc Khi Khai Báo `@font-face` Trong CSS
Nếu bổ sung font cục bộ bằng `@font-face` trong `src/index.css` hoặc các file style, bắt buộc phải có thuộc tính:
```css
@font-face {
  font-family: '<Font-Name>';
  font-display: optional;
  src: url('/fonts/<font-file>.woff2') format('woff2');
}
```

### Quy Tắc 3: Bổ Sung Khối Khóa Định Hướng Phông Chữ Vào `src/index.css`
Để đảm bảo toàn bộ đội ngũ lập trình và các agent tiếp theo tuân thủ triệt để, chúng tôi đề xuất bổ sung một khối quy chuẩn rõ ràng vào `src/index.css` ngay dưới phần `font-family`:
```css
  /* Quy chuẩn Zero-FOUT & Typography Invariant:
     - Mặc định ưu tiên System Font Stack để đạt 0ms latency và 0 layout shift.
     - Mọi @font-face hoặc web font nạp ngoài bắt buộc phải sử dụng 'font-display: optional'
       theo chuẩn kỹ thuật Pomofocus v6.0 Ultimate. Tuyệt đối không dùng 'font-display: swap'.
  */
```

### Quy Tắc 4: Bảo Toàn Trọng Tâm Đồng Hồ Với Tabular Numbers
Mọi thành phần hiển thị thời gian số (Pomodoro countdown, đồng hồ phòng học, mini widget) bắt buộc phải giữ nguyên lớp `.tabular-nums` và cấu hình CSS:
```css
font-variant-numeric: tabular-nums;
font-feature-settings: "tnum" 1;
```
Nhằm đảm bảo các con số `0-9` có chiều rộng bằng nhau tuyệt đối, triệt tiêu mọi dao động rung lắc ngang khi đếm giây.

---

## 5. TỔNG KẾT & KHUYẾN NGHỊ CHO ORCHESTRATOR

1. **Về việc thay đổi `font-display: swap` thành `font-display: optional`:**
   - Trong mã nguồn hiện tại không có khai báo `font-display: swap` nào đang hoạt động.
   - Ứng dụng đang vận hành hoàn hảo trên **System Font Stack bản địa**, đây là kiến trúc nhanh nhất và triệt tiêu layout shift tốt nhất trong môi trường web hiện đại.
   - Cần bổ sung comment chỉ dẫn kiến trúc vào `src/index.css` để bảo vệ bất biến `font-display: optional`.
2. **Về tương thích kiểm thử:**
   - Cần nhắc nhở Coder M1 không được thay đổi hoặc xóa các thẻ `<link>` của KaTeX trong `index.html` vì `wcagAccessibilityAudit.test.ts` đang assert trực tiếp nội dung các thẻ này.
   - Đảm bảo 52 test files (466 tests) tiếp tục pass 100%.
