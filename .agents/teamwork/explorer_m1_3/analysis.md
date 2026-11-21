# M1 Investigation Analysis: Cookie Consent Banner & Deep Link / 404 Routing

**Investigator**: explorer_m1_3  
**Date**: 2026-11-21  
**Scope**: Milestone M1 (APK Navigation Shell & 100% Web Isolation)  
**References**: `docs/reports/FORENSIC_DEEP_AUDIT_REPORT.md` (BUG-03, BUG-11), `docs/UI_UX_DESIGN_PLAYBOOK_AND_POSTMORTEM.md`

---

## 1. Executive Summary

This investigation delivers the architectural autopsy and surgical implementation specifications for two critical defects in PomoFocus Workspace Milestone M1:
1. **BUG-03 (CookieConsentBanner)**:
   - On native Android APK (`Capacitor.isNativePlatform()`), the web cookie consent banner erroneously pops up after an 800ms debounce, hovering at `bottom-[calc(56px+env(safe-area-inset-bottom,0px)+12px)]` (`z-40`) and directly obscuring the Pomodoro timer action buttons (Start/Pause, Reset, Skip) on `MobileFocusView`.
   - On Web viewports (especially 360px–390px mobile screens and narrow desktop views), action buttons lack `whitespace-nowrap`, causing button labels ("Đồng ý & Tiếp tục", "Chấp nhận tất cả", "Xem chính sách") to wrap awkwardly into 2 disjointed lines.
2. **BUG-11 (Deep Link Handling & NotFoundPage Routing)**:
   - In `src/App.tsx`, deep link interception only checks `/oauth/callback` and `/rooms`. All other inbound application links (`pomofocus://billing`, `pomofocus://settings`, `pomofocus://profile`, `pomofocus://dashboard`, `pomofocus://calendar`, `pomofocus://privacy`, `pomofocus://terms`, `pomofocus://app`, and Universal Links) are dropped without action.
   - In `src/pages/NotFoundPage.tsx`, there is zero back button in the header for mobile viewports (`< 640px`). When users land on 404, they are trapped. In APK, pressing Android hardware back terminates the application process because `canGoBackInApp` is `false`.
   - Action buttons contain raw, redundant emojis (`⏱`, `🏠`) alongside Lucide vector icons, violating the monochrome 90-10 Zen design contract.

---

## 2. Forensic Investigation: `CookieConsentBanner.tsx`

### 2.1. Root Cause: Why Cookie Banner Displays on Native APK
- **File**: `src/components/CookieConsentBanner.tsx:11-22, 51-54`
- **Mount Point**: `src/App.tsx:667` mounts `<CookieConsentBanner />` globally across the entire app.
- **Evidence**:
  ```tsx
  // CookieConsentBanner.tsx:11-22
  useEffect(() => {
    try {
      const consent = localStorage.getItem(CONSENT_STORAGE_KEY);
      if (!consent) {
        const timer = setTimeout(() => setIsVisible(true), 800);
        return () => clearTimeout(timer);
      }
    } catch {}
  }, []);

  // CookieConsentBanner.tsx:51-53
  if (!isVisible) return null;
  if (router.currentRoute.pathname.startsWith('/rooms/')) return null;
  ```
- **Analysis**:
  1. On a fresh installation of the Android APK (via Capacitor), `localStorage` is completely empty. `localStorage.getItem(CONSENT_STORAGE_KEY)` returns `null`.
  2. The component schedules an 800ms timer, after which `isVisible` becomes `true`.
  3. The render guard only checks `!isVisible` and `pathname.startsWith('/rooms/')`. It performs **zero check** for the native platform (`Capacitor.isNativePlatform()`).
  4. In `MobileFocusView.tsx`, the primary Pomodoro timer controls reside at the bottom of the screen. Because `CookieConsentBanner` is rendered at `fixed bottom-[calc(56px+env(safe-area-inset-bottom,0px)+12px)] left-4 right-4 z-40`, it floats directly on top of the timer control buttons!
  5. Under European GDPR / ePrivacy directives and Vietnam statutory laws (Luật 91/2025/QH15 & Nghị định 356/2025/NĐ-CP), a native mobile application does not store browser tracking cookies. Preferences and offline data are stored in native sandbox storage (IndexedDB / SQLite / Capacitor Preferences). Displaying an invasive web cookie banner inside a compiled Android APK is an architectural anti-pattern and severe UX defect.

### 2.2. Exact Suppression Check: `Capacitor.isNativePlatform()`
To guarantee 100% suppression on native platforms with zero flash of unstyled content or memory overhead:
- **Import**:
  ```tsx
  import { Capacitor } from '@capacitor/core';
  ```
- **Dual Guard Strategy**:
  1. **Lifecycle Guard in `useEffect`**: If `Capacitor.isNativePlatform()` is `true`, do not schedule the timer and do not update visibility state.
     ```tsx
     useEffect(() => {
       if (Capacitor.isNativePlatform()) {
         return;
       }
       try {
         const consent = localStorage.getItem(CONSENT_STORAGE_KEY);
         if (!consent) {
           const timer = setTimeout(() => setIsVisible(true), 800);
           return () => clearTimeout(timer);
         }
       } catch {}
     }, []);
     ```
  2. **Render Guard**: Immediate short-circuit before any JSX evaluation:
     ```tsx
     if (Capacitor.isNativePlatform()) return null;
     if (!isVisible) return null;
     if (router.currentRoute.pathname.startsWith('/rooms/')) return null;
     ```
This guarantees that regardless of storage state or mock conditions, on native APK the component returns `null` synchronously.

### 2.3. Web Viewport Button Text Wrapping & `whitespace-nowrap` Fix
- **File**: `src/components/CookieConsentBanner.tsx:87-113`
- **Observed Code**:
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
- **Root Cause of Text Wrapping**:
  - The parent banner container has `left-4 right-4` on mobile (`< 640px`) or `sm:max-w-md` on desktop.
  - Subtracting padding (`p-4` = 32px), shield icon (`w-8` = 32px), and gap (`gap-3` = 12px), the available text width is only ~250px–280px.
  - The button container uses `flex flex-wrap items-center gap-2`.
  - When the container narrows, browsers attempt to break text inside inline-flex/flex child elements when whitespace is present.
  - Because `<button>` elements lack `whitespace-nowrap`, words like "Đồng ý &" and "Tiếp tục" (or "Chấp nhận" and "tất cả", or "Xem" and "chính sách") wrap into two lines within the button itself, making the button vertically bloated and misaligned.
- **Exact Fix**:
  Add `whitespace-nowrap shrink-0` to all three buttons.
  - `consent-accept-btn`:
    ```tsx
    className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-semibold active:scale-95 transition shadow-sm cursor-pointer whitespace-nowrap shrink-0"
    ```
  - `consent-decline-btn`:
    ```tsx
    className="px-3.5 py-1.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold active:scale-95 transition shadow-sm cursor-pointer whitespace-nowrap shrink-0"
    ```
  - `consent-details-btn`:
    ```tsx
    className="px-2.5 py-1.5 rounded-xl text-xs text-zinc-400 hover:text-white hover:bg-white/5 transition flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
    ```
  With `whitespace-nowrap shrink-0`, each button maintains its pill shape, while the parent `flex-wrap` container drops whole button pills to the next row cleanly when screen width is constrained.

---

## 3. Forensic Investigation: Deep Links & `NotFoundPage.tsx`

### 3.1. Deep Link Handling in APK (`src/App.tsx`)
- **File**: `src/App.tsx:312-440`
- **Observed Code**:
  ```tsx
  const handleDeepLinkUrl = async (rawUrl: string) => {
    if (!rawUrl) return;

    // 1. Google OAuth callback
    if (rawUrl.startsWith('pomofocus://oauth/callback') || rawUrl.includes('oauth/callback')) {
      // ... OAuth session sync ...
      router.navigate('/app');
      return;
    }

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
  };
  ```
- **Flaws & Vulnerabilities**:
  1. `AndroidManifest.xml` registers an intent filter for `<data android:scheme="pomofocus" />` and Universal Links `<data android:scheme="https" android:host="pomofocus-workspace.vercel.app" />`.
  2. If an inbound deep link is `pomofocus://billing`, `pomofocus://settings`, `pomofocus://profile`, `pomofocus://dashboard`, `pomofocus://calendar`, `pomofocus://privacy`, `pomofocus://terms`, or `pomofocus://app`:
     - Line 317 fails (not `oauth/callback`).
     - Line 394 fails (does not include `/rooms`).
     - Function completes without executing any navigation! The user remains on the previous screen, breaking marketing campaigns, push notifications, and email invitations.
  3. If an inbound deep link points to an invalid route (e.g. `pomofocus://random-404`), it is also ignored instead of guiding the user to the informative Zen 404 page.

### 3.2. Universal Deep Link Route Resolver Specification
Replace the ad-hoc room check with a universal URL normalizer and router:
```tsx
const handleDeepLinkUrl = async (rawUrl: string) => {
  if (!rawUrl) return;

  // 1. Google OAuth callback: pomofocus://oauth/callback#... or pomofocus://oauth/callback?...
  if (rawUrl.startsWith('pomofocus://oauth/callback') || rawUrl.includes('oauth/callback')) {
    // ... existing OAuth logic ...
    router.navigate('/app');
    return;
  }

  // 2. Universal Deep Link & App Link Router
  try {
    let targetPath = '';
    let targetSearch = '';

    if (rawUrl.startsWith('pomofocus://')) {
      // Strip pomofocus:// scheme
      // Examples:
      // "pomofocus://billing" -> "billing" -> "/billing"
      // "pomofocus://rooms/room-123" -> "rooms/room-123" -> "/rooms/room-123"
      // "pomofocus://app/settings" -> "app/settings" -> "/settings" (or "/app")
      const stripped = rawUrl.replace(/^pomofocus:\/\//, '');
      const withSlash = stripped.startsWith('/') ? stripped : `/${stripped}`;
      const [pathPart, queryPart = ''] = withSlash.split('?');
      targetPath = pathPart;
      targetSearch = queryPart ? `?${queryPart}` : '';
    } else if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
      const parsedUrl = new URL(rawUrl);
      targetPath = parsedUrl.pathname;
      targetSearch = parsedUrl.search;
    }

    if (targetPath) {
      // Normalize double slashes and trailing slashes
      const cleanPath = normalizePath(targetPath);
      router.navigate(cleanPath + targetSearch);
    }
  } catch (err) {
    console.warn('[DeepLink] Error resolving internal route:', err);
    router.navigate('/app');
  }
};
```

### 3.3. Forensic Investigation: `NotFoundPage.tsx`
- **File**: `src/pages/NotFoundPage.tsx`
- **Current Header (lines 29-43)**:
  ```tsx
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
  ```
- **Defects Identified**:
  1. **Zero Back Button**:
     - No `<button>` or back arrow exists anywhere in the header.
     - On mobile screen widths (`< 640px`), users who arrived from a link inside the app cannot go back to their previous screen.
     - Clicking the logo routes to `/`. On web, this is the landing page (not where they were). In native APK, `/` renders `MobileAppShell`, but it resets their context.
  2. **Android Hardware Back Trap (BUG-05 correlation)**:
     - When `NotFoundPage` is rendered, `MobileAppShell` is unmounted.
     - `MobileAppShell`'s cleanup hook runs: `nativeBridge.setCanGoBackInApp(false)`.
     - In `MainActivity.java:33-35`, when `inAppCanGoBack` is false, pressing the Android hardware Back gesture executes `getOnBackPressedDispatcher().onBackPressed()`, which **instantly kills or backgrounds the APK**! The user is abruptly booted out of PomoFocus.
  3. **Raw Emoji Clutter (BUG-11 / Vector 5)**:
     - Line 84: `<Clock size={16} /> <span>⏱ Quay Về Bàn Học Ngay</span>` (redundant `⏱` with `<Clock />`).
     - Line 94: `<Home size={16} /> <span>🏠 Về Trang Chủ</span>` (redundant `🏠` with `<Home />`).
     - Violates the clean monochrome 90-10 styling established in the design playbook.

### 3.4. Architectural Fix for `NotFoundPage.tsx`
1. **Add Dedicated Back Button in Top Bar**:
   - Add `<button data-testid="not-found-back-btn" onClick={handleGoBack} ...>` in the header, visible on all viewports.
   - On `< 640px`, render a clean top bar with back navigation.
2. **Implement Safe History Fallback Navigation**:
   ```tsx
   const handleGoBack = () => {
     if (typeof window !== 'undefined' && window.history.length > 1) {
       window.history.back();
     } else {
       router.navigate('/app');
     }
   };
   ```
3. **Register Hardware Back Listener**:
   ```tsx
   useEffect(() => {
     const nativeBridge = (window as any).PomoNativeBack;
     if (nativeBridge?.setCanGoBackInApp) {
       nativeBridge.setCanGoBackInApp(true);
     }

     const handleNativeBack = () => {
       handleGoBack();
     };

     window.addEventListener('pomofocus:native-back', handleNativeBack);
     return () => {
       window.removeEventListener('pomofocus:native-back', handleNativeBack);
       if (nativeBridge?.setCanGoBackInApp) {
         nativeBridge.setCanGoBackInApp(false);
       }
     };
   }, []);
   ```
4. **Purge Raw Emojis**:
   - `<span>Quay Về Bàn Học Ngay</span>` with `<Clock size={16} />`.
   - `<span>Về Trang Chủ</span>` with `<Home size={16} />`.
   - On native APK (`Capacitor.isNativePlatform()`), the home button navigates to `/app` (or is replaced/hidden if redundant).

---

## 4. Regression Protection: Unit Test Architecture

### 4.1. Test Suite: `CookieConsentBanner` Native Suppression & Web Wrap
File: `tests/unit/cookieConsentNativeSuppression.test.tsx`
Test cases:
1. **APK Suppression**:
   - Mock `Capacitor.isNativePlatform = vi.fn().mockReturnValue(true)`.
   - Render `<CookieConsentBanner />`.
   - Advance timers by 1000ms.
   - Expect `screen.queryByTestId('cookie-consent-banner')` to be `null`.
   - Expect no DOM nodes injected.
2. **Web Rendering**:
   - Mock `Capacitor.isNativePlatform = vi.fn().mockReturnValue(false)`.
   - Clear `localStorage`.
   - Render `<CookieConsentBanner />`.
   - Advance timers by 850ms.
   - Expect `screen.getByTestId('cookie-consent-banner')` to be in the document.
3. **Button `whitespace-nowrap` & Pill Geometry**:
   - Check `screen.getByTestId('consent-accept-btn').className` contains `whitespace-nowrap`.
   - Check `screen.getByTestId('consent-decline-btn').className` contains `whitespace-nowrap`.
   - Check `screen.getByTestId('consent-details-btn').className` contains `whitespace-nowrap`.

### 4.2. Test Suite: Deep Links & `NotFoundPage` Navigation
File: `tests/unit/deepLinkAndNotFoundRouting.test.tsx`
Test cases:
1. **Deep Link Inbound Resolution**:
   - Dispatch `appUrlOpen` event with `pomofocus://billing`.
   - Expect `router.navigate` called with `/billing`.
   - Dispatch `appUrlOpen` event with `pomofocus://settings`.
   - Expect `router.navigate` called with `/settings`.
   - Dispatch `appUrlOpen` event with `pomofocus://rooms/focus-room-42`.
   - Expect `router.navigate` called with `/rooms/focus-room-42`.
   - Dispatch `appUrlOpen` event with `pomofocus://random-404-route`.
   - Expect `router.navigate` called with `/random-404-route`.
2. **`NotFoundPage` Native Back Button**:
   - Render `<NotFoundPage />`.
   - Expect `screen.getByTestId('not-found-back-btn')` to exist.
   - Click back button when `history.length > 1`: verify `window.history.back` is called.
   - Click back button when `history.length <= 1`: verify fallback `router.navigate('/app')`.
3. **`NotFoundPage` Hardware Back Interception**:
   - Mount `<NotFoundPage />`: expect `PomoNativeBack.setCanGoBackInApp(true)` called.
   - Dispatch `pomofocus:native-back` custom event: expect navigation back triggered.
   - Unmount `<NotFoundPage />`: expect `PomoNativeBack.setCanGoBackInApp(false)` called.
4. **Emoji Cleanliness (Vector 5)**:
   - Verify `404-btn-back-workspace` does not contain literal emoji `⏱`.
   - Verify `404-btn-home` does not contain literal emoji `🏠`.
