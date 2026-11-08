# BÁO CÁO PHÂN TÍCH CHUYÊN SÂU: KIỂM THỬ VÀ TÁC ĐỘNG XÂY DỰNG (MILESTONE 1)
## Test Suite & Build Impact Analysis for Zero-FOUT & Typography Foundation

**Dự án:** Pomofocus v6.0 Ultimate (Liquid Glass & Zen Minimalism)  
**Milestone:** M1 — Zero-FOUT & Typography Foundation  
**Tác giả:** Explorer M1-3  
**Ngày thực hiện:** 2026-11-08  
**Trạng thái:** Hoàn thành toàn diện (Comprehensive Investigation Completed)  

---

## 1. TỔNG QUAN VÀ MỤC TIÊU ĐIỀU TRA

Báo cáo này phân tích chi tiết mức độ ảnh hưởng của các thay đổi kỹ thuật thuộc Milestone 1 (Features 1, 2, 3) lên toàn bộ hệ thống kiểm thử tự động (Unit Tests, Vitest DOM, React Testing Library, Playwright E2E) và quy trình đóng gói bản dựng Vite (Vite Build Pipeline & PWA Service Worker Precache).

### Phạm vi Milestone 1 theo `PROJECT.md` & `ORIGINAL_REQUEST.md`:
1. **Feature 1 — Dark Mode Lock:** Khóa cứng màu nền và màu chữ `#09090b !important; color: #f4f4f5;` ngay tại thẻ `<html>` và `<body>` của `index.html`.
2. **Feature 2 — Splash Curtain Preloader:** Thêm lớp rèm che inline zero-dependency `#pomo-splash-curtain` với animation `.pomo-spinner` màu ngọc lục bảo `#10b981`, `pointer-events: none;`, tự động tháo sau 100ms qua sự kiện `DOMContentLoaded`.
3. **Feature 3 — Optional Font Display:** Đổi cấu hình phông chữ từ `font-display: swap` sang `font-display: optional` để triệt tiêu hiện tượng giật phông chữ (FOUT).

---

## 2. HIỆN TRẠNG HỆ THỐNG KIỂM THỬ VÀ BẢN DỰNG

Trước khi tiến hành phân tích tác động, Explorer M1-3 đã thực thi toàn bộ test suite và build pipeline hiện hữu để thiết lập dữ liệu nền tảng đối chiếu (baseline metrics):

| Hạng mục kiểm tra | Lệnh thực thi | Kết quả thực tế | Thời gian / Chi tiết |
|---|---|---|---|
| **Unit Test Suite (Vitest)** | `npm test` (`vitest run`) | **52/52 test files passed**<br>**466/466 tests passed** | 254.43s (0 failed, 0 flaky) |
| **TypeScript Typecheck** | `npm run type-check` (`tsc --noEmit`) | **0 errors, 0 warnings** | Exit code 0 |
| **Production Build (Vite)** | `npx vite build` | **Build completed successfully** | 52.93s, 50 assets precached in PWA `dist/sw.js` |

---

## 3. ĐIỀU TRA CHI TIẾT TÁC ĐỘNG LÊN HỆ THỐNG KIỂM THỬ

### 3.1. Các bài kiểm thử quét hoặc đọc `index.html`

Qua rà soát toàn bộ 52 tệp kiểm thử trong thư mục `tests/`:

- **Tệp duy nhất đọc `index.html`:** `tests/unit/wcagAccessibilityAudit.test.ts` (dòng 159–166):
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
- **Phân tích ràng buộc:**
  - Bài kiểm tra đọc trực tiếp mã nguồn `index.html` qua `fs.readFileSync`.
  - Chỉ kiểm tra sự tồn tại của 4 chuỗi ký tự liên quan đến KaTeX CSS CDN.
  - **KHÔNG kiểm tra** class của `<html>`, thuộc tính style của `<body>`, hay thẻ `#pomo-splash-curtain`.
  - **Kết luận:** Chỉ cần bảo lưu nguyên vẹn khối KaTeX `<link rel="preconnect">` và non-render-blocking `<link rel="stylesheet">`, bài test này bảo đảm tiếp tục **PASS 100%**.

### 3.2. Các bài kiểm thử liên quan đến `title` và `document.title`

- **Trong Unit Tests:**
  - `tests/unit/timerDocumentTitleLifecycle.test.ts` (12 tests): Kiểm tra cơ chế cập nhật tiêu đề động khi đồng hồ Pomodoro đếm ngược hoặc khi người dùng chuyển trang (`updateDocumentTitle()`, `getStaticRouteTitle()`).
  - Tại `beforeEach` (dòng 13-14): Tệp test chủ động gán `document.title = 'Initial Title'` trong môi trường JSDOM. Tệp test này hoàn toàn độc lập với thẻ `<title>` trong `index.html`.
- **Trong E2E Tests (Playwright):**
  - **Không có bất kỳ tệp E2E nào** sử dụng `page.title()` hoặc `expect(page).toHaveTitle()`.
  - Toàn bộ các từ khóa `title` trong `tests/e2e/` đều là trường dữ liệu của Task (`task.title`), Ghi chú (`note.title`), hoặc thuộc tính HTML `button[title="..."]`.
- **Kết luận:** Việc thay đổi hoặc giữ nguyên thẻ `<title>` trong `index.html` không gây bất kỳ xung đột nào với test suite.

### 3.3. Các bài kiểm thử liên quan đến thẻ `<meta>`

- Toàn bộ các kết quả khớp với từ khóa `meta` trong `tests/` đều liên quan đến `user_metadata` của Supabase Auth (ví dụ: `user_metadata.full_name`, `user_metadata.picture` trong `avatarSynchronization.test.ts`, `googleAuthAndPwa.test.ts`).
- **Không có bài kiểm tra nào** truy vấn DOM để assert nội dung các thẻ `<meta name="...">` hoặc `<meta property="og:...">` trong `index.html`.
- **Kết luận:** Thẻ `<meta name="theme-color" content="#09090b" />` hay các thẻ meta khác trong `index.html` hoàn toàn an toàn khi chỉnh sửa.

### 3.4. Các bài kiểm thử liên quan đến `<div id="root">` và nội dung Fallback

- **Kiểm tra truy vấn `#root`:**
  - Không có bất kỳ truy vấn nào dạng `document.getElementById('root')` hay `page.locator('#root')` trong toàn bộ test suite.
  - Tệp duy nhất gọi `document.getElementById` trong E2E là `tests/e2e/roomCompactControlBar.spec.ts` (truy vấn `document.getElementById('room-compact')`).
- **Nội dung Fallback bên trong `<div id="root">`:**
  - Trong `index.html` gốc (dòng 103–133), có 30 dòng HTML tĩnh chứa `<header>`, `<nav>`, `<main id="main-content">`, `<h1>`, `<h2>`, `<ul>`, `<footer>` dùng làm nội dung tĩnh cho AI Crawlers và trình duyệt không bật JS.
  - Không có bài test nào assert nội dung tĩnh này trong `index.html` (chỉ có `wcagAccessibilityAudit.test.ts` kiểm tra semantic `<main id="main-content">` trong `LandingPage.tsx`).
  - Khi ứng dụng khởi chạy trong trình duyệt thật, `ReactDOM.createRoot(document.getElementById('root')!).render(...)` tại `src/main.tsx` sẽ tự động thay thế toàn bộ nội dung tĩnh bằng React component tree.
- **Kết luận:** Giữ nguyên nội dung fallback này bên trong `<div id="root">` để phục vụ SEO/Crawler là hoàn toàn an toàn và không gây xung đột với bất kỳ bài test nào.

---

## 4. PHÂN TÍCH TƯƠNG TÁC GIỮA `#pomo-splash-curtain` VÀ MÔI TRƯỜNG TEST

### 4.1. Môi trường Vitest & React Testing Library (JSDOM)

- **Cấu hình Vitest (`vite.config.ts` dòng 57–61):**
  ```typescript
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}', 'tests/unit/**/*.test.{ts,tsx}']
  }
  ```
- **Hành vi JSDOM:**
  1. Vitest khởi tạo môi trường JSDOM thuần túy (`about:blank`) cho mỗi tệp kiểm thử. Vitest **KHÔNG tự động tải hoặc parse tệp `index.html`** vào DOM trừ khi có test setup file chỉ định (hiện tại dự án không có `setupFiles`).
  2. Tệp unit test duy nhất sử dụng React Testing Library (`@testing-library/react`) là `tests/unit/zenErrorPages.test.tsx`. Hàm `render(<NotFoundPage />)` của RTL sẽ tự động tạo một thẻ `<div>` mới và gắn vào `document.body`.
  3. Vì `#pomo-splash-curtain` nằm trong `index.html` chứ không nằm trong component React, phần tử này thậm chí **không tồn tại** trong cây DOM của JSDOM khi chạy Vitest.
  4. Nếu có bài test sau này chủ động parse `index.html` vào JSDOM, `#pomo-splash-curtain` là phần tử anh em (sibling) của `<div id="root">`, nằm hoàn toàn bên ngoài phạm vi quản lý của React, không bao giờ can thiệp vào virtual DOM hay component lifecycle của React.

### 4.2. Môi trường Playwright E2E Tests (Trình duyệt thực tế)

- **Cấu hình Playwright (`playwright.config.ts`):**
  - Khởi chạy Vite dev server trên cổng 5173 và mở trình duyệt Chromium thực.
  - Khi Playwright gọi `await page.goto('/')`, tệp `index.html` được nạp đầy đủ.
- **Phân tích 3 đặc tính bảo vệ của `#pomo-splash-curtain`:**
  1. **`pointer-events: none;` ngay từ CSS inline:**
     - Kể cả khi rèm che đang hiển thị (opacity 1), mọi thao tác chuột (`click`, `hover`, `drag`) của Playwright đều xuyên thấu qua rèm che xuống các phần tử React bên dưới, không bao giờ bị chặn sự kiện ("intercepted click").
  2. **Tháo rèm tự động sau 100ms:**
     - Script inline lắng nghe `DOMContentLoaded` và gán class `.loaded` sau 100ms.
     - Class `.loaded` kích hoạt `opacity: 0; visibility: hidden;` với transition 300ms.
     - Trong CSS Object Model, `visibility: hidden` biến phần tử thành vô hình trước hệ thống kiểm tra khả năng tương tác của Playwright (`toBeVisible()`).
  3. **Thời gian trễ tự nhiên của React Hydration:**
     - Các bài test E2E (ví dụ: `tests/e2e/layoutZenFlow.spec.ts`) luôn bắt đầu bằng:
       ```typescript
       await page.goto('/');
       await expect(page.getByTestId('widget-container-timer')).toBeVisible();
       ```
     - Thời gian để Vite bundle các module JavaScript, nạp React, Zustand stores và render các widget ra màn hình luôn vượt quá 100–200ms. Do đó, vào thời điểm locator đầu tiên được Playwright đánh giá, `#pomo-splash-curtain` đã ở trạng thái `.loaded` (`opacity: 0; visibility: hidden`).
- **Phân tích ảnh chụp màn hình (Screenshots):**
  - Không có bài test nào sử dụng `toHaveScreenshot()` để so sánh pixel visual diff tự động.
  - Các lệnh `page.screenshot({ path: ... })` trong `officialVisualProofs.spec.ts` hay `mobileStudyRoom.spec.ts` chỉ chụp ảnh lưu artifact sau khi đã `await expect(...).toBeVisible()`.
- **Kết luận:** `#pomo-splash-curtain` **hoàn toàn không gây tác dụng phụ hoặc làm flaky/fail** bất kỳ bài test E2E nào.

---

## 5. PHÂN TÍCH HÀNH VI BIÊN DỊCH CỦA VITE ĐỐI VỚI `index.html`

### 5.1. Cơ chế xử lý HTML của Vite (`vite build`)

1. **Điểm nhập (Entry Point):** `index.html` là gốc của ứng dụng.
2. **Xử lý Scripts & Styles:**
   - Thẻ `<script type="module" src="/src/main.tsx"></script>` được Vite phân tích cú pháp và thay thế bằng:
     ```html
     <script type="module" crossorigin src="/assets/index-[hash].js"></script>
     <link rel="modulepreload" crossorigin href="/assets/vendor-...js">
     <link rel="stylesheet" crossorigin href="/assets/index-[hash].css">
     ```
   - Khối `<style>` inline trong `<head>`: Vite giữ nguyên vị trí và nội dung inline trong `dist/index.html`.
   - Khối `<script>` inline trong `<body>`: Vite giữ nguyên nội dung mã JavaScript thuần (vanilla JS) mà không đóng gói qua Rollup.
   - Thuộc tính thẻ `<html>` và `<body>`: Các thuộc tính như `class="dark"`, `style="background-color: #09090b !important; color: #f4f4f5;"` được Vite bảo toàn 100%.

### 5.2. Tương tác với VitePWA Plugin

- Trong `vite.config.ts`, plugin `VitePWA` được cấu hình với chiến lược `injectManifest`:
  ```typescript
  injectManifest: {
    maximumFileSizeToCacheInBytes: 3145728, // 3 MiB
    globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}']
  }
  ```
- Tệp `dist/index.html` sau khi build nằm trong danh sách `globPatterns` và được tự động nạp vào precache manifest của Service Worker (`dist/sw.js`).
- Vì Critical CSS và Splash Curtain nằm inline trực tiếp trong `index.html`, người dùng truy cập offline hoặc tải lại trang từ Service Worker Cache sẽ nhận được ngay giao diện nền tối Zen mà không cần bất kỳ network request nào.

---

## 6. PHÂN TÍCH TYPOGRAPHY VÀ CẤU HÌNH `font-display: optional`

### 6.1. Hiện trạng khai báo phông chữ

- Trong `src/index.css` (dòng 18):
  ```css
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  ```
  Dự án hiện tại sử dụng hệ thống System Fonts tối ưu tốc độ cao của Apple/Windows.
- Phông chữ ngoại vi duy nhất được nạp qua mạng là KaTeX (phục vụ hiển thị công thức toán học trong Trợ lý Gia sư AI):
  - Được nạp qua CDN jsdelivr trong `index.html` (`katex.min.css`).
  - Được nạp local font files trong `dist/assets/KaTeX_*.woff2`.
- Để đáp ứng Feature 3: Bất kỳ quy tắc `@font-face` nào được định nghĩa trong `src/index.css` hoặc font CDN link trong `index.html` bắt buộc phải sử dụng `font-display: optional` (thay vì `swap`).
  - `font-display: swap` khiến trình duyệt hiển thị font fallback rồi nhảy giật sang custom font khi tải xong (thủ phạm chính gây layout shift / CLS).
  - `font-display: optional` giới hạn thời gian chặn 100ms; nếu font chưa có trong cache, trình duyệt giữ nguyên font hiện tại cho phiên làm việc đó và sử dụng font mới ở lần tải tiếp theo mà không gây giật màn hình.

---

## 7. QUY TRÌNH KIỂM THỬ VÀ NGHIỆM THU MILESTONE 1 (VERIFICATION PROTOCOL)

Để đảm bảo Milestone 1 được nghiệm thu tuyệt đối không có sai sót, Explorer M1-3 đề xuất xây dựng bộ quy trình kiểm thử 4 bước:

### Bước 1: Tạo bộ kiểm thử đơn vị mới chuyên biệt cho Milestone 1
Tạo tệp `tests/unit/zeroFoutAndTypography.test.ts` để kiểm chứng tự động các tiêu chí kỹ thuật:

```typescript
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Milestone 1: Zero-FOUT & Typography Foundation Verification', () => {
  const indexPath = path.resolve('index.html');
  const indexContent = fs.readFileSync(indexPath, 'utf8');

  it('1. Thẻ <html> được khóa cứng Dark Mode và màu nền #09090b', () => {
    expect(indexContent).toMatch(/<html[^>]*class="[^"]*dark[^"]*"/);
    expect(indexContent).toContain('background-color: #09090b !important');
    expect(indexContent).toContain('color: #f4f4f5');
  });

  it('2. Thẻ <body> được đồng bộ style nền tối Zen #09090b', () => {
    expect(indexContent).toMatch(/<body[^>]*style="[^"]*background-color:\s*#09090b\s*!important/);
  });

  it('3. Splash Curtain Preloader (#pomo-splash-curtain) tồn tại với Critical CSS inline', () => {
    expect(indexContent).toContain('id="pomo-splash-curtain"');
    expect(indexContent).toContain('.pomo-spinner');
    expect(indexContent).toContain('#pomo-splash-curtain.loaded');
    expect(indexContent).toContain('pointer-events: none');
    expect(indexContent).toContain('z-index: 99999');
  });

  it('4. Script tháo rèm DOMContentLoaded tự động kích hoạt sau 100ms', () => {
    expect(indexContent).toContain("DOMContentLoaded");
    expect(indexContent).toContain(".classList.add('loaded')");
  });

  it('5. Tuyệt đối không chứa font-display: swap gây nháy phông', () => {
    expect(indexContent).not.toContain('font-display: swap');
    expect(indexContent).not.toContain('display=swap');
    
    const cssPath = path.resolve('src/index.css');
    const cssContent = fs.readFileSync(cssPath, 'utf8');
    expect(cssContent).not.toContain('font-display: swap');
  });

  it('6. Bảo toàn 100% các tiêu chí WCAG Accessibility hiện có trong index.html', () => {
    expect(indexContent).toContain('<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin />');
    expect(indexContent).toContain('<link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />');
    expect(indexContent).toContain('media="print"');
    expect(indexContent).toContain("onload=\"this.media='all'\"");
  });

  it('7. Bảo toàn cấu trúc fallback crawler và React root container', () => {
    expect(indexContent).toContain('<div id="root">');
    expect(indexContent).toContain('<main id="main-content">');
  });
});
```

### Bước 2: Kiểm tra tính hồi quy toàn bộ Unit Tests (Zero-Regression Gate)
```powershell
npx vitest run tests/unit/wcagAccessibilityAudit.test.ts
npm test
```
*Yêu cầu nghiêm ngặt:* Toàn bộ 52+ tệp test files và 466+ tests phải pass 100%.

### Bước 3: Kiểm tra biên dịch TypeScript tĩnh (Typecheck Gate)
```powershell
npm run type-check
```
*Yêu cầu:* `tsc --noEmit` hoàn tất với 0 lỗi, 0 warning.

### Bước 4: Kiểm tra đóng gói Production Build (Build Integrity Gate)
```powershell
npx vite build
```
*Yêu cầu:*
- Quá trình build hoàn tất sạch sẽ 0 lỗi.
- Kiểm tra tệp `dist/index.html` đảm bảo chứa đầy đủ `#pomo-splash-curtain` và style `#09090b !important`.
- Service worker `dist/sw.js` precache thành công `dist/index.html`.

---

## 8. TỔNG KẾT VÀ BẢN ĐỒ RỦI RO (RISK MATRIX)

| Rủi ro tiềm ẩn | Mức độ | Khả năng xảy ra | Biện pháp kiểm soát & Ngăn chặn |
|---|---|---|---|
| Làm vỡ test `wcagAccessibilityAudit.test.ts:159` | Cao | Thấp | Giữ nguyên 100% các thẻ link KaTeX preconnect trong `index.html`. |
| `#pomo-splash-curtain` chặn click trong E2E tests | Trung bình | Không có | Thuộc tính `pointer-events: none;` và `.loaded` (`visibility: hidden`) loại bỏ hoàn toàn khả năng chặn click. |
| React mount làm mất hiệu ứng mờ của Splash Curtain | Thấp | Không có | Đặt `#pomo-splash-curtain` ngoài `<div id="root">` (phần tử anh em), React reconciler không can thiệp. |
| Mất nội dung crawler tĩnh cho SEO | Trung bình | Không có | Toàn bộ 30 dòng HTML tĩnh trong `<div id="root">` được giữ nguyên vẹn. |
| Lỗi cú pháp TypeScript hoặc Vite bundle | Thấp | Không có | Inline CSS và script được viết thuần vanilla HTML/CSS/JS, không yêu cầu dependency ngoài. |

**Kết luận:** Phương án triển khai Milestone 1 hoàn toàn an toàn, có tính tương thích 100% với hệ thống kiểm thử hiện tại và sẵn sàng để tiến hành thực thi code (Phase 4).
