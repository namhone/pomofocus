# Handoff Report: Cookie Consent Banner Native Suppression & Deep Link / 404 Routing

**Agent**: explorer_m1_3  
**Milestone**: M1 (APK Navigation Shell & 100% Web Isolation)  
**Parent**: orchestrator_p2 (`cf5bc11e-435c-4f27-a55e-a32f3bebfefa`)  
**Scope Reference**: BUG-03 and BUG-11 from `docs/reports/FORENSIC_DEEP_AUDIT_REPORT.md`

---

## 1. Observation

### Observation 1.1: Cookie Consent Banner Display on Native APK
- **File & Lines**: `src/components/CookieConsentBanner.tsx:11-22, 51-54`
- **Mount Point**: `src/App.tsx:667` mounts `<CookieConsentBanner />` globally across the entire app unconditionally.
- **Verbatim Code**:
  ```tsx
  useEffect(() => {
    try {
      const consent = localStorage.getItem(CONSENT_STORAGE_KEY);
      if (!consent) {
        // Trì hoãn nhẹ 800ms để trải nghiệm mượt mà không chặn giao diện tức thì
        const timer = setTimeout(() => setIsVisible(true), 800);
        return () => clearTimeout(timer);
      }
    } catch {
      // LocalStorage không khả dụng (Private browsing)
    }
  }, []);
  ...
  if (!isVisible) return null;
  // Không làm phiền hoặc chặn thao tác khi người dùng đang trong phòng học Meet
  if (router.currentRoute.pathname.startsWith('/rooms/')) return null;
  ```
- **Physical Coordinates**:
  `className="fixed bottom-[calc(56px+env(safe-area-inset-bottom,0px)+12px)] left-4 right-4 sm:bottom-4 sm:left-auto sm:right-6 sm:max-w-md z-40 ..."`
- **Observed Defect**:
  - In a fresh Android Capacitor APK, `localStorage` is empty. The banner schedules an 800ms timer and renders.
  - The render condition only checks `!isVisible` and `/rooms/`. There is zero check for `Capacitor.isNativePlatform()`.
  - In `MobileFocusView.tsx`, the primary timer buttons (Start/Pause, Reset, Skip) reside in the bottom 80px above the bottom navigation. The banner sits directly on top of these action buttons at `z-40`, completely blocking timer interaction.

### Observation 1.2: Cookie Banner Button Wrapping on Web Viewport
- **File & Lines**: `src/components/CookieConsentBanner.tsx:87-113`
- **Verbatim Code**:
  ```tsx
  <div className="flex flex-wrap items-center gap-2 pt-1.5">
    <button
      type="button"
      data-testid="consent-accept-btn"
      onClick={handleAccept}
      className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-semibold active:scale-95 transition shadow-sm cursor-pointer"
    >
      Đồng ý & Tiếp tục
    </button>
    <button
      type="button"
      data-testid="consent-decline-btn"
      onClick={handleDecline}
      className="px-3.5 py-1.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold active:scale-95 transition shadow-sm cursor-pointer"
    >
      Từ chối
    </button>
    <button
      type="button"
      data-testid="consent-details-btn"
      onClick={handleOpenPrivacy}
      className="px-2.5 py-1.5 rounded-xl text-xs text-zinc-400 hover:text-white hover:bg-white/5 transition flex items-center gap-1 cursor-pointer"
    >
      <span>Xem chính sách</span>
      <ChevronRight size={12} />
    </button>
  </div>
  ```
- **Observed Defect**:
  - The buttons lack `whitespace-nowrap`.
  - On viewports < 400px or when container width is ~260px, multi-word button labels ("Đồng ý & Tiếp tục", "Chấp nhận tất cả", "Xem chính sách") wrap across 2 vertical lines within the button itself, causing visual deformation and misaligned heights.

### Observation 1.3: Dropped Deep Links in `src/App.tsx`
- **File & Lines**: `src/App.tsx:393-405`
- **Verbatim Code**:
  ```tsx
  // 2. App Link for /rooms/:roomId or /rooms
  if (rawUrl.includes('/rooms')) {
    try {
      const parsedUrl = new URL(
        rawUrl.startsWith('pomofocus://') ? rawUrl.replace('pomofocus://', 'https://app/') : rawUrl
      );
      const roomPath = parsedUrl.pathname.startsWith('/rooms') ? parsedUrl.pathname : `/rooms${parsedUrl.pathname}`;
      router.navigate(roomPath + parsedUrl.search);
    } catch (e) {
      console.warn('[DeepLink] Error routing room link:', e);
    }
  }
  ```
- **Observed Defect**:
  - `handleDeepLinkUrl` only handles `oauth/callback` and `/rooms`.
  - Inbound deep links such as `pomofocus://billing`, `pomofocus://settings`, `pomofocus://profile`, `pomofocus://dashboard`, `pomofocus://calendar`, `pomofocus://privacy`, `pomofocus://terms`, `pomofocus://app`, and `pomofocus://<random-404>` are silently ignored. No navigation occurs.

### Observation 1.4: Trapped Users on `NotFoundPage.tsx` & Missing Back Button
- **File & Lines**: `src/pages/NotFoundPage.tsx:28-43, 76-96`
- **Verbatim Code**:
  ```tsx
  {/* Header tối giản */}
  <header className="relative z-10 px-4 sm:px-8 py-5 flex items-center justify-between">
    <button
      type="button"
      onClick={() => router.navigate('/')}
      className="flex items-center gap-2 hover:opacity-90 transition cursor-pointer"
      title="Trang chủ PomoFocus"
    >
      <PomoFocusLogo size={24} showWordmark={true} wordmarkClassName="text-sm font-bold text-white tracking-tight" />
    </button>

    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-[11px] font-mono text-zinc-400">
      <Compass size={12} className="text-emerald-400" />
      <span>Tọa độ không xác định</span>
    </div>
  </header>
  ...
  <button data-testid="404-btn-back-workspace" onClick={() => router.navigate('/app')} ...>
    <Clock size={16} />
    <span>⏱ Quay Về Bàn Học Ngay</span>
  </button>
  <button data-testid="404-btn-home" onClick={() => router.navigate('/')} ...>
    <Home size={16} />
    <span>🏠 Về Trang Chủ</span>
  </button>
  ```
- **Observed Defect**:
  - There is no Back button (`← Quay lại`) in the header or anywhere for mobile (`< 640px`).
  - Users arriving at 404 from within the app cannot return to their previous screen.
  - In Android APK, `MainActivity.java:22` registers `appBackCallback = new OnBackPressedCallback(false)`. Because `MobileAppShell` unmounts on 404 and sets `canGoBackInApp = false`, pressing the Android hardware Back button terminates the app process instead of returning to the previous screen.
  - Buttons contain raw emojis (`⏱`, `🏠`) alongside Lucide icons (`<Clock />`, `<Home />`).

---

## 2. Logic Chain

1. **Premise 1 (APK Context)**: Under `Capacitor.isNativePlatform() === true`, an application operates as an installed native app. It stores data locally in sandboxed WebView storage (IndexedDB/Preferences), not third-party web tracking cookies. Showing a web cookie banner is inappropriate and violates the native shell isolation principle.
2. **From Observation 1.1**: `CookieConsentBanner.tsx` checks only `localStorage` without checking `Capacitor.isNativePlatform()`. In a fresh APK, this causes the banner to appear after 800ms and sit at `z-40` directly over the timer controls in `MobileFocusView`.
3. **Deduction 1**: Checking `if (Capacitor.isNativePlatform()) return null;` in both `useEffect` and the render function completely suppresses the banner on native APK, eliminating timer collision.
4. **From Observation 1.2**: In `CookieConsentBanner.tsx:87-113`, the buttons lack `whitespace-nowrap`. When the container width shrinks below ~280px on 360px–390px screens, the text breaks inside each button.
5. **Deduction 2**: Adding `whitespace-nowrap shrink-0` to the three button elements enforces single-line pill geometry, while allowing the parent `flex flex-wrap` container to drop whole buttons to subsequent rows cleanly.
6. **From Observation 1.3**: `AndroidManifest.xml` configures `pomofocus://*` for the application, but `src/App.tsx:handleDeepLinkUrl` only processes `/oauth/callback` and `/rooms`. Any other internal route (`/billing`, `/settings`, `/profile`, `/calendar`, `/dashboard`, `/terms`, `/privacy`) is dropped.
7. **Deduction 3**: Extracting the path and search query from `pomofocus://` or `https://pomofocus-workspace.vercel.app/*` and calling `router.navigate(cleanPath + search)` restores universal deep link functionality.
8. **From Observation 1.4**: `NotFoundPage.tsx` lacks a back button on mobile screens (`< 640px`) and does not signal `PomoNativeBack.setCanGoBackInApp(true)`. Consequently, users cannot navigate back to their previous screen, and pressing the Android hardware back button kills the application.
9. **Deduction 4**: Adding a prominent `← Quay lại` button (`data-testid="not-found-back-btn"`) in the top bar with a fallback (`window.history.length > 1 ? window.history.back() : router.navigate('/app')`), integrating with `PomoNativeBack`, and removing raw emojis (`⏱`, `🏠`) satisfies both mobile UX requirements and BUG-11.

---

## 3. Caveats

- **Caveat 1 (Hash routing vs Path routing)**: PomoFocus uses path-based routing with HTML5 History API (`window.history.pushState`). In Capacitor native Android, `server.androidScheme` is `'https'`, so `window.location.pathname` works identically to web. Custom scheme URLs (`pomofocus://path`) must be translated to root-relative paths (`/path`) before passing to `router.navigate`.
- **Caveat 2 (OAuth deep links)**: `pomofocus://oauth/callback` contains tokens in the hash fragment (`#access_token=...`). The OAuth handler must remain the highest priority in `handleDeepLinkUrl` to avoid token parsing collisions.
- **Caveat 3 (History Length Reliability)**: In certain WebView boot scenarios, `window.history.length` may be 1 (if the app opened directly to a deep link that 404ed). The fallback `router.navigate('/app')` is necessary so users are never stuck.

---

## 4. Conclusion

1. **`CookieConsentBanner.tsx`**:
   - Add `import { Capacitor } from '@capacitor/core';`.
   - Add early return in `useEffect`: `if (Capacitor.isNativePlatform()) return;`.
   - Add early return in render: `if (Capacitor.isNativePlatform()) return null;`.
   - Add `whitespace-nowrap shrink-0` to `consent-accept-btn`, `consent-decline-btn`, and `consent-details-btn`.
2. **`App.tsx` Deep Link Router**:
   - Expand `handleDeepLinkUrl` to parse all `pomofocus://` and `https://pomofocus-workspace.vercel.app` routes, navigating to `cleanPath + targetSearch`.
3. **`NotFoundPage.tsx`**:
   - Add `<button data-testid="not-found-back-btn" onClick={handleGoBack}>` in the header.
   - Implement `handleGoBack` using `window.history.back()` with fallback to `/app`.
   - Register `PomoNativeBack.setCanGoBackInApp(true)` on mount and cleanup on unmount.
   - Remove redundant emojis `⏱` and `🏠`.

---

## 5. Verification Method

### 5.1. Unit Tests
1. **Cookie Consent Suppression**:
   - File: `tests/unit/cookieConsentNativeSuppression.test.tsx`
   - Command: `npx vitest run tests/unit/cookieConsentNativeSuppression.test.tsx`
   - Checks:
     * When `Capacitor.isNativePlatform() === true`, banner does not render after 1000ms.
     * When `Capacitor.isNativePlatform() === false`, banner renders after 850ms with `whitespace-nowrap` on all buttons.
2. **Deep Link & 404 Navigation**:
   - File: `tests/unit/deepLinkAndNotFoundRouting.test.tsx`
   - Command: `npx vitest run tests/unit/deepLinkAndNotFoundRouting.test.tsx`
   - Checks:
     * `appUrlOpen` event with `pomofocus://billing` calls `router.navigate('/billing')`.
     * `appUrlOpen` event with `pomofocus://settings` calls `router.navigate('/settings')`.
     * `appUrlOpen` event with `pomofocus://rooms/room-99` calls `router.navigate('/rooms/room-99')`.
     * `NotFoundPage` renders `not-found-back-btn`.
     * Clicking back button calls `window.history.back()` or `router.navigate('/app')`.
     * `pomofocus:native-back` triggers back navigation.
     * Raw emojis `⏱` and `🏠` are absent from button texts.

### 5.2. Existing Test Regression Check
- `npx vitest run tests/unit/zenErrorPages.test.tsx`
- `npx vitest run tests/unit/m4LegalAndCookieConsent.test.tsx`
- `npx vitest run tests/unit/m1EmpiricalChallengerStress.test.tsx`
- `npm run type-check` (0 errors)

### 5.3. Invalidation Conditions
- If `CookieConsentBanner` renders while `Capacitor.isNativePlatform()` is `true`.
- If clicking deep link `pomofocus://billing` fails to navigate to `/billing`.
- If `NotFoundPage` does not render a back button on mobile.
- If Android hardware back on `NotFoundPage` exits the application process.
