# BÁO CÁO ĐIỀU TRA KỸ THUẬT: SECTION 0, SECTION 1 (ZERO-FOUT), SECTION 2 (AI COMPANION COLLISION)
**Dự án:** Pomofocus v6.0 Ultimate  
**Agent:** Survey Explorer 1  
**Thời gian:** 2026-11-08T04:53:00Z  
**Mã nhiệm vụ:** Section 0 (Design showcase), Section 1 (Zero-FOUT), Section 2 (AI Companion collision)  
**Tình trạng kiểm thử cơ sở:** 52/52 Test Suites Passed (466/466 tests), TypeScript compilation: 0 lỗi.

---

## 1. TỔNG QUAN ĐIỀU TRA (EXECUTIVE SUMMARY)

Cuộc khảo sát đã phân tích toàn diện mã nguồn hiện tại của Pomofocus Workspace, đối chiếu trực tiếp với:
1. `ORIGINAL_REQUEST.md` (Chỉ dẫn kỹ thuật v6.0 Ultimate của User)
2. `docs/UI_UX_DESIGN_PLAYBOOK_AND_POSTMORTEM.md` (Cẩm nang thiết kế UI/UX & Bài học xương máu)
3. `AGENTS.md` (Quy định bất biến phân tầng Z-index, State Singularity, Cloud-first)
4. Bộ kho mẫu thiết kế tại `pomofocus-design-system/` (`design-system-showcase.html`, `apple-liquid-dock.md`, `anti-fout-loading-guide.md`)
5. Các tệp mã nguồn cốt lõi: `index.html`, `src/index.css`, `src/App.tsx`, `src/components/PlatformHeader.tsx`, `src/components/AiCompanionWidget.tsx`, `src/stores/useAiStore.ts`, `src/stores/useLayoutStore.ts`.

---

## 2. SECTION 0: KHO MẪU THIẾT KẾ & THAM CHIẾU THỰC TẾ (DESIGN SHOWCASE & REFERENCES)

### 2.1. Hiện trạng tệp showcase nội bộ
- **Tệp showcase trực quan:** `pomofocus-design-system/assets/design-system-showcase.html` (328 dòng)
  - Đã tích hợp đầy đủ cấu trúc kính lỏng Liquid Glass:
    ```css
    .liquid-glass {
      background: rgba(9, 9, 11, 0.45);
      backdrop-filter: blur(28px);
      -webkit-backdrop-filter: blur(28px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      box-shadow: 0 12px 40px 0 rgba(0, 0, 0, 0.45), inset 0 1px 0 0 rgba(255, 255, 255, 0.15);
    }
    ```
  - Cung cấp sẵn mã nguồn HTML/CSS mẫu cho macOS Liquid Dock với hiệu ứng phóng đại kế cận (magnification), tooltip kính mờ và chấm trạng thái 3px.
- **Tệp đặc tả Dockbar macOS:** `pomofocus-design-system/references/apple-liquid-dock.md` (328 dòng)
  - Xác lập chính xác tỷ lệ vật lý chuyển động:
    - Kích thước cơ sở: `--s: 60px` (laptop 56px, tablet 48px, mobile 40px).
    - Hệ số phóng đại tối đa: `--max: 1.75` (hoặc 1.8).
    - Icon liền kề 1 nấc: `1 + (max - 1) * 0.56` (`scale(1.42)` đến `scale(1.45)`).
    - Icon liền kề 2 nấc: `1 + (max - 1) * 0.05` (`scale(1.04)`).
    - Phản ứng khi nhấn (Active): `translateY(-8px)`.
    - Chấm đèn hoạt động (`.dock__dot`): Chấm sáng tròn 3px trắng ngọc tỏa hào quang phía dưới icon.
- **Tệp cẩm nang Zero-FOUT:** `pomofocus-design-system/references/anti-fout-loading-guide.md` (137 dòng)
  - Xác lập kiến trúc 3 lớp chống giật màn hình: Instant Dark Shell, Font-display control, Content Fade-In.

### 2.2. Danh mục tham chiếu thế giới được đối chiếu
1. **Glassmorphism & Component Kính:** `https://uiverse.io/tags/glassmorphism` & `https://uiverse.io/ui/glassmorphism-cards`
2. **Minimal & Bố cục khoảng thở:** `https://minimal.gallery/` & `https://siiimple.com/`
3. **Web đạt giải thưởng Awwwards:** `https://www.awwwards.com/websites/minimal/`
4. **Chuyển động vật lý:** `https://motion.dev/` & `https://jitter.video/templates/`

---

## 3. SECTION 1: TRIỆT TIÊU 100% HIỆN TƯỢNG NHÁY CHỮ KHI TẢI TRANG (ZERO-FOUT)

### 3.1. Triệu chứng & Nguyên nhân gốc rễ (Root Cause Analysis)
Qua soi chiếu `index.html` (dòng 1 đến 137), chúng tôi phát hiện 3 nguyên nhân cốt lõi gây ra hiện tượng chớp nháy (FOUT/Hydration Flash):

1. **Thẻ `<html>` và `<body>` chưa khóa cứng Dark Theme ở mức HTML thô:**
   - Tại `index.html:2`: Hiện tại chỉ có `<html lang="vi">`. Không có `class="dark"` và không có inline style khóa màu nền tối `#09090b`.
   - Tại `index.html:102`: `<body class="bg-slate-900 text-slate-100 select-none">`.
     - Lỗi 1: Sử dụng `bg-slate-900` (`#0f172a`), trong khi tông màu chủ đạo toàn app là `#09090b`.
     - Lỗi 2: Class Tailwind chỉ có hiệu lực sau khi file CSS tải xong và parse xong (thường mất 150-400ms). Trong khoảng thời gian này, trình duyệt render nền trắng hoặc màu mặc định của user agent.
2. **Nội dung Crawler tĩnh bên trong `<div id="root">` bị lộ ra màn hình trước khi React nạp (Hydration Flash):**
   - Tại `index.html:103-133`: Bên trong `<div id="root">`, có khối HTML tĩnh gồm `<header>`, `<nav>`, `<main id="main-content">`, `<h1>PomoFocus...</h1>`, danh sách tính năng và `<footer>` (phục vụ AI bot & SEO crawler).
   - Khi người dùng tải trang hoặc F5, do chưa có CSS và chưa có màn che, toàn bộ đoạn văn bản này hiển thị dưới dạng chữ thô màu đen trên nền trắng với font mặc định (Times New Roman / Arial) và các link màu xanh dương gạch chân, gây hiện tượng FOUT cực kỳ khó chịu.
3. **Hoàn toàn vắng bóng Splash Screen / Preloader:**
   - Trong `index.html` hiện tại KHÔNG CÓ bất kỳ màn che Splash Curtain nào. Không có spinner hay transition tháo rèm.

### 3.2. Đánh giá Font Loading Strategy (`font-display: optional` vs `swap`)
- Trong `src/index.css:18`:
  ```css
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  ```
  App hiện dùng system font stack chất lượng cao.
- Tại `index.html:31-39`: Thư viện KaTeX CSS được nạp bất đồng bộ:
  ```html
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css" media="print" onload="this.media='all'" />
  ```
  KaTeX chứa các font toán học.
- **Kết luận kỹ thuật về font-display:**
  - `font-display: swap` là nguyên nhân hàng đầu khiến text giật khi font tải về và tráo đổi với fallback font.
  - Sử dụng `font-display: optional` (hoặc fallback) cho phép trình duyệt chỉ chờ tối đa 100ms; nếu font chưa sẵn sàng trong cache, nó sẽ dùng font dự phòng và không giật nhảy giao diện giữa chừng khi font tải xong sau đó.

### 3.3. Đề xuất giải pháp kỹ thuật cụ thể (Exact Code Proposals)
1. **Tại `index.html`:**
   - **Sửa dòng 2:**
     ```html
     <!-- TRƯỚC: -->
     <html lang="vi">
     <!-- SAU: -->
     <html lang="vi" class="dark" style="background-color: #09090b !important; color: #f4f4f5;">
     ```
   - **Thêm Critical Inline CSS vào `<head>` (ngay sau `<meta name="theme-color" content="#09090b" />`):**
     ```html
     <style>
       html, body {
         background-color: #09090b !important;
         color: #f4f4f5 !important;
         margin: 0;
         padding: 0;
         overflow-x: hidden;
       }
       #pomo-splash-curtain {
         position: fixed;
         inset: 0;
         background-color: #09090b;
         z-index: 99999;
         display: flex;
         align-items: center;
         justify-content: center;
         transition: opacity 300ms cubic-bezier(0.16, 1, 0.3, 1), visibility 300ms;
         pointer-events: none;
       }
       #pomo-splash-curtain.loaded {
         opacity: 0;
         visibility: hidden;
       }
       .pomo-spinner {
         width: 32px;
         height: 32px;
         border-radius: 50%;
         border: 2px solid rgba(255, 255, 255, 0.1);
         border-top-color: #10b981;
         animation: pomoSpin 0.7s linear infinite;
       }
       @keyframes pomoSpin {
         to { transform: rotate(360deg); }
       }
     </style>
     ```
   - **Sửa dòng 102 (`<body>`):**
     ```html
     <!-- TRƯỚC: -->
     <body class="bg-slate-900 text-slate-100 select-none">
     <!-- SAU: -->
     <body class="bg-[#09090b] text-[#f4f4f5] select-none" style="background-color: #09090b !important; color: #f4f4f5;">
     ```
   - **Thêm phần tử Splash Curtain ngay đầu `<body>` (ngay trước `<div id="root">`):**
     ```html
     <div id="pomo-splash-curtain" aria-hidden="true">
       <div class="pomo-spinner"></div>
     </div>
     ```
   - **Thêm script tháo rèm siêu nhẹ trước khi đóng `</body>`:**
     ```html
     <script>
       (function() {
         function dismissCurtain() {
           var curtain = document.getElementById('pomo-splash-curtain');
           if (curtain && !curtain.classList.contains('loaded')) {
             curtain.classList.add('loaded');
           }
         }
         if (document.readyState === 'complete') {
           setTimeout(dismissCurtain, 100);
         } else {
           window.addEventListener('DOMContentLoaded', function() {
             setTimeout(dismissCurtain, 100);
           });
           window.addEventListener('load', function() {
             setTimeout(dismissCurtain, 50);
           });
         }
       })();
     </script>
     ```

---

## 4. SECTION 2: KHẮC PHỤC LỖI KHUNG CHAT AI COMPANION BỊ CẮT TRÊN ĐỈNH & XUNG ĐỘT HEADER

### 4.1. Hiện trạng & Phân tích xung đột vị trí (Collision Analysis)
1. **Thành phần tham gia xung đột:**
   - `src/components/PlatformHeader.tsx`:
     - **Hình thái 1 - Viên nang nổi (`floating-header-capsule`):** (Dòng 267–364)
       - Định vị: `fixed top-3 right-4 sm:right-6 z-40` (Tọa độ `y = 12px` đến `y = 48px`, mép phải).
       - Chứa: Nút Avatar (`capsule-avatar-btn`), Nút Credits ⚡ (`capsule-credits-btn`), Nút Settings ⚙️ (`capsule-settings-btn`), Nút Mở Menu ▾ (`capsule-expand-btn`).
     - **Hình thái 2 - Header đầy đủ (`platform-unified-header`):** (Dòng 370–764)
       - Định vị: `fixed top-0 left-0 right-0 w-full h-14 z-50` (Tọa độ `y = 0` đến `y = 56px`).
       - Cụm nút góc phải (Dòng 445–763): Nút Ghim (Pin), Nút Thu gọn, Nút AI Credits ⚡, Nút PWA Install, Nút Avatar Dropdown.
   - `src/components/AiCompanionWidget.tsx`:
     - **Lớp Backdrop mờ:** (Dòng 277–283)
       - Định vị: `fixed inset-0 top-14 z-30`
     - **Khung Chat Drawer (`ai-companion-drawer`):** (Dòng 287–294)
       - Định vị: `fixed top-14 bottom-0 right-0 z-40 w-full sm:w-[420px] max-w-full`
       - Header của AI Drawer (Dòng 296–382): Cao `h-14` (56px), chứa:
         - Biểu tượng AI + Tiêu đề "AI Study Companion"
         - Badge Credits ⚡ (`ai-credits-topup-btn`)
         - Nút Tạo đoạn chat mới + (`ai-new-chat-btn`)
         - Nút Lịch sử cuộc trò chuyện (`ai-history-btn`)
         - Nút Làm mới phiên chat ↺ (`ai-clear-chat-btn`)
         - Nút Đóng ✕ (`ai-close-drawer-btn ai-btn-close-drawer`)

2. **Cơ chế xung đột (The Root Collision Mechanism):**
   - **Xung đột 1 (Hỏng Z-Index):** AI Companion drawer chỉ mang `z-40`. Cùng lúc đó, `PlatformHeader` mang `z-50` (khi mở rộng) hoặc `z-40` (khi thu gọn capsule). Khi người dùng mở AI Companion, các nút của Header/Capsule nằm cùng hoặc đè lên trên thanh tiêu đề của AI, gây ra tình trạng click nhầm hoặc bóng ma.
   - **Xung đột 2 (Vết cắt trên đỉnh - The 56px Void Hack):** Drawer AI đang bị gán cứng `top-14` (y = 56px) để "né" header cũ. Tuy nhiên:
     - Khi ở `/app` với header thu gọn (`!isHeaderExpanded`), khoảng từ `y = 0` đến `y = 56px` ở góc phải bị hở một khoảng trống kỳ quặc, và viên nang `floating-header-capsule` (`top-3 right-4 z-40`) nằm lơ lửng ngay phía trên đầu AI drawer.
     - Nếu mở rộng AI Companion lên toàn chiều cao (`top-0` hoặc `top-3` với `h-[calc(100vh-24px)]`), cụm nút Avatar, ⚡ credits, ⚙️ settings của `PlatformHeader` đè thẳng lên cụm nút tiêu đề, nút +, nút lịch sử và nút ✕ của AI Companion!
   - **Xung đột 3 (Thiếu liên kết trạng thái):** `PlatformHeader.tsx` hiện tại **hoàn toàn KHÔNG đọc** cờ `isOpen` từ `useAiStore`. Header không hề biết rằng AI Companion đang mở để tự giác ẩn hoặc đẩy cụm nút phải ra phía sau!

### 4.2. Đề xuất giải pháp kỹ thuật cụ thể (Exact Code Proposals)

#### Bước 1: Kết nối trạng thái `isAiOpen` trong `PlatformHeader.tsx`
- **Tại `src/components/PlatformHeader.tsx` (khoảng dòng 42):**
  ```tsx
  // Bổ sung selector đọc isOpen từ useAiStore:
  const isAiOpen = useAiStore((s) => s.isOpen);
  ```

#### Bước 2: Tự động ẩn hoặc đẩy lùi cụm nút góc phải khi `isAiOpen === true`
- **Đối với Hình thái 1 (Viên nang thu gọn `floating-header-capsule` tại dòng 270–276):**
  ```tsx
  {isWorkspace && (
    <aside
      data-testid="floating-header-capsule"
      aria-label="Thanh điều hướng thu gọn"
      className={`fixed top-3 right-4 sm:right-6 z-40 flex items-center gap-2 px-3 py-1.5 rounded-full ${
        isEcoMode ? 'bg-[#0c0c0e]/95' : 'bg-zinc-950/85 backdrop-blur-xl'
      } border border-white/10 shadow-xl transition-all duration-300 ease-out select-none ${
        !isHeaderExpanded && !isAiOpen
          ? 'opacity-100 translate-y-0 pointer-events-auto scale-100'
          : 'opacity-0 -translate-y-2 pointer-events-none scale-90'
      }`}
    >
  ```
  *Lợi ích:* Khi AI mở ra, viên nang mượt mà mờ dần và trượt nhẹ lên trên `translate-y-2`, giải phóng 100% không gian góc trên bên phải. Khi AI đóng lại, viên nang trượt xuống hiển thị lại tức thì.

- **Đối với Hình thái 2 (Thanh Header mở rộng tại dòng 445):**
  Bọc cụm nút điều khiển bên phải (`<div className="flex items-center gap-1.5 sm:gap-2 shrink-0">`) trong hiệu ứng chuyển động:
  ```tsx
  <div className={`flex items-center gap-1.5 sm:gap-2 shrink-0 transition-all duration-300 ${
    isAiOpen ? 'opacity-0 pointer-events-none -translate-y-1' : 'opacity-100 pointer-events-auto translate-y-0'
  }`}>
  ```
  *Lợi ích:* Kể cả khi người dùng đang mở Header đầy đủ mà bật AI Companion, cụm nút header góc phải sẽ tự động rút lui, không đè lấn lên tiêu đề và các nút của AI Companion.

#### Bước 3: Nâng cấp `AiCompanionWidget.tsx` lên `z-[80]` & Trải dài toàn vẹn không bị cắt nóc
- **Tại `src/components/AiCompanionWidget.tsx` (dòng 277–283):**
  Nâng backdrop lên `z-[75]` và xóa bỏ `top-14` để che phủ toàn màn hình trên mobile:
  ```tsx
  <div
    data-testid="ai-backdrop"
    className={`fixed inset-0 z-[75] bg-black/60 backdrop-blur-xs transition-opacity duration-300 sm:hidden ${
      isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
    }`}
    onClick={() => toggleOpen(false)}
    aria-hidden="true"
  />
  ```
- **Tại `src/components/AiCompanionWidget.tsx` (dòng 287–294):**
  Chuyển `top-14` thành `top-0` và nâng `z-index` từ `z-40` lên `z-[80]`:
  ```tsx
  <div
    data-testid="ai-companion-drawer"
    aria-hidden={!isOpen}
    className={`fixed top-0 bottom-0 right-0 z-[80] w-full sm:w-[420px] max-w-full bg-zinc-950/95 backdrop-blur-2xl border-l border-zinc-800 shadow-[-20px_0_50px_rgba(0,0,0,0.6)] flex flex-col will-change-transform transition-all duration-350 ease-[cubic-bezier(0.16,1,0.3,1)] transform ${
      isOpen
        ? 'translate-x-0 opacity-100 pointer-events-auto'
        : 'translate-x-full opacity-0 pointer-events-none'
    }`}
  >
  ```
  *Lợi ích:*
  - Chiều cao trải dài 100% màn hình từ đỉnh (`top-0`) xuống đáy (`bottom-0`), triệt tiêu hoàn toàn lỗi bị cắt cụt 56px trên nóc.
  - Tầng hiển thị `z-[80]` cao hơn hẳn Header (`z-50`) và DockBar (`z-20`).
  - Thanh header của AI Companion nằm kiêu hãnh ở đỉnh với đầy đủ: Tiêu đề "AI Study Companion", Badge Credits ⚡, Nút + Chat mới, Nút Lịch sử, Nút Làm mới ↺, và Nút ✕ Đóng. Không có bất kỳ phần tử nào có thể đè lấp được.

---

## 5. BẢNG PHÂN TẦNG Z-INDEX CHUẨN MỰC SAU KHI TỐI ƯU

| Tầng Z-Index | Thành phần | Trạng thái hiển thị |
| :--- | :--- | :--- |
| `z-0` | `BackgroundCanvas`, Video / Wallpaper 4K | Cố định toàn màn hình |
| `z-10` | `Workspace Desktop`, Thẻ Widget (Timer, Tasks, Notes, Media) | Kéo thả tự do từ `y = 8px` |
| `z-20` | `DockBar` (macOS Liquid Dock) | Cố định đáy màn hình |
| `z-40` | `floating-header-capsule` (Viên nang nổi) | Tự ẩn khi `isAiOpen === true` |
| `z-50` | `platform-unified-header` (Header đầy đủ) | Cụm nút phải tự ẩn khi `isAiOpen === true` |
| `z-[60]` | `mobile-slidedown-menu`, Modal xác nhận đăng xuất | Modal cục bộ |
| `z-[75]` | `ai-backdrop` (Lớp nền mờ mobile của AI) | Hiển thị khi `isAiOpen === true` trên mobile |
| `z-[80]` | `ai-companion-drawer` (Khung chat AI Companion) | Trượt từ phải sang, chiếm trọn đỉnh đến đáy |
| `z-[100]` | `guest-quick-menu-modal`, Modal Nạp Credits MoMo | Modal giao dịch & thao tác tối cao |
| `z-99999` | `#pomo-splash-curtain` (Rèm che khởi động Zero-FOUT) | Che phủ 0-100ms lúc load trang, fade out mượt mà |

---

## 6. MA TRẬN RỦI RO & PHƯƠNG ÁN PHÒNG NGỪA (RISK MATRIX)

| Rủi ro tiềm ẩn | Mức độ | Cơ chế phát sinh | Phương án xử lý & Đã kiểm chứng |
| :--- | :---: | :--- | :--- |
| Gãy Test WCAG 2.1 AA | Cao | Xóa nhầm nút hoặc đổi `data-testid` | Giữ nguyên 100% `data-testid` (`capsule-avatar-btn`, `capsule-credits-btn`, `ai-close-drawer-btn ai-btn-close-drawer`), chỉ chuyển đổi class `opacity-0 pointer-events-none`. |
| Kẹt rèm che Splash Curtain | Trung bình | JavaScript trình duyệt gặp lỗi trước khi chạy `DOMContentLoaded` | Thiết kế inline script tự thực thi đa tầng (`complete`, `DOMContentLoaded`, `load`), kết hợp `pointer-events: none` trên rèm che để người dùng vẫn tương tác được nếu rèm gặp sự cố. |
| Mất nút đóng AI Companion | Thấp | Cụm nút header bị ẩn khiến người dùng không biết tắt AI ở đâu | AI Companion Drawer sở hữu nút đóng riêng biệt (`data-testid="ai-close-drawer-btn"`) và DockBar có nút AI để toggle bật/tắt tiện lợi. |
| Lệch bố cục khi resize màn hình | Thấp | Chuyển đổi giữa Desktop và Mobile khi AI đang mở | `useLayoutStore` đồng bộ mượt mà qua RAF resize listener, `ai-backdrop` tự động kích hoạt `sm:hidden`. |

---

## 7. BẰNG CHỨNG THỰC NGHIỆM ĐÃ XÁC MINH (VERIFIED EVIDENCE)
- **Kiểm thử Unit Tests:** Đã chạy lệnh `npm test` với Vitest v2.1.8. Kết quả: **52/52 test files passed, 466/466 tests passed 100%**.
- **Kiểm tra kiểu TypeScript:** Đã chạy `npx tsc --noEmit`. Kết quả: **0 errors, 0 warnings**.
- **Kiểm tra tệp tham chiếu:** Đã xác minh sự tồn tại của `pomofocus-design-system/assets/design-system-showcase.html` và `pomofocus-design-system/references/apple-liquid-dock.md`.
