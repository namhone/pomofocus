# Changes Summary — Worker M1 (Milestone 1: Zero-FOUT & Typography Foundation)

## Overview
Worker M1 executed surgical, minimal-diff modifications strictly within its exclusive ownership boundaries (`index.html` and `src/index.css`) to eradicate page load flicker (FOUT), enforce instant dark mode locking, add a zero-dependency preloader curtain with emerald spinner, and establish typography guardrails for font loading.

---

## 1. File: `index.html`

### Modifications Applied:
1. **HTML Root Dark Lock**:
   - Updated `<html lang="vi">` to `<html lang="vi" class="dark" style="background-color: #09090b !important; color: #f4f4f5;">`.
   - **Rationale**: Locks the dark theme immediately at the root node before any CSS or JS chunks are fetched, preventing white screen flashes.

2. **Inline Critical CSS (Head)**:
   - Added `<style>` block immediately after `<meta name="theme-color" content="#09090b" />`.
   - Included rules:
     - `html, body { background-color: #09090b !important; color: #f4f4f5 !important; margin: 0; padding: 0; overflow-x: hidden; }`
     - `#pomo-splash-curtain { position: fixed; inset: 0; background-color: #09090b; z-index: 99999; display: flex; align-items: center; justify-content: center; transition: opacity 300ms cubic-bezier(0.16, 1, 0.3, 1), visibility 300ms; pointer-events: none; }`
     - `#pomo-splash-curtain.loaded { opacity: 0; visibility: hidden; }`
     - `.pomo-spinner { width: 32px; height: 32px; border-radius: 50%; border: 2px solid rgba(255, 255, 255, 0.1); border-top-color: #10b981; animation: pomoSpin 0.7s linear infinite; }`
     - `@keyframes pomoSpin { to { transform: rotate(360deg); } }`
   - **Rationale**: Delivers 0ms render-blocking zero-dependency preloader styling before browser paints body content.

3. **Body Dark Lock & Splash Curtain Preloader**:
   - Replaced `<body class="bg-slate-900 text-slate-100 select-none">` with:
     `<body class="bg-[#09090b] text-[#f4f4f5] select-none" style="background-color: #09090b !important; color: #f4f4f5;">`
   - Inserted curtain sibling right before `<div id="root">`:
     ```html
     <!-- Zero-FOUT Splash Curtain Preloader -->
     <div id="pomo-splash-curtain" aria-hidden="true">
       <div class="pomo-spinner"></div>
     </div>
     ```
   - **Rationale**: Guarantees DOM sibling relationship with `#root` so React mounting never unmounts or disrupts curtain fade animation.

4. **Curtain Dismissal Script**:
   - Inserted at end of `<body>` after `/src/main.tsx`:
     ```html
     <!-- Zero-FOUT Splash Curtain Dismissal Script -->
     <script>
       (function() {
         function dismissCurtain() {
           var curtain = document.getElementById('pomo-splash-curtain');
           if (curtain && !curtain.classList.contains('loaded')) {
             curtain.classList.add('loaded');
           }
         }
         if (document.readyState === 'interactive' || document.readyState === 'complete') {
           setTimeout(dismissCurtain, 100);
         } else {
           window.addEventListener('DOMContentLoaded', function() {
             setTimeout(dismissCurtain, 100);
           });
         }
       })();
     </script>
     ```
   - **Rationale**: Smoothly triggers `.loaded` 100ms after DOM is ready with fallback for cached / fast loads, eliminating FOUT without delaying interactivity (`pointer-events: none`).

5. **Critical Invariants Preserved**:
   - 100% preservation of all KaTeX CDN `<link>` preconnect/prefetch/print tags.
   - 100% preservation of all static crawler / SEO `<header>`, `<nav>`, `<main>`, `<p>`, `<ul>`, `<footer>` text inside `<div id="root">`.

---

## 2. File: `src/index.css`

### Modifications Applied:
- Added architectural invariant rule comment documenting the `font-display: optional` policy:
  ```css
  /* Quy chuẩn Zero-FOUT & Typography Invariant:
   * - Mặc định ưu tiên System Font Stack để đạt 0ms latency và 0 layout shift (CLS = 0.00).
   * - Mọi @font-face hoặc web font nạp ngoài bắt buộc phải sử dụng 'font-display: optional'
   *   theo chuẩn kỹ thuật Pomofocus v6.0 Ultimate. Tuyệt đối không dùng 'font-display: swap'.
   */
  ```
- **Rationale**: Enforces project-wide design invariant preventing future developers or agents from introducing `font-display: swap` or unoptimized web font delays.
