# M1 Investigation Analysis: Native APK Navigation Shell & 100% Web Isolation

**Author**: Explorer `explorer_m1_1`  
**Milestone**: Milestone M1 (APK Navigation Shell & 100% Web Isolation)  
**Parent Orchestrator**: `cf5bc11e-435c-4f27-a55e-a32f3bebfefa`  
**Working Directory**: `d:\FileCuaNam\Web'\Pomodoro\.agents\teamwork\explorer_m1_1`  
**Target Codebase**: `d:\FileCuaNam\Web'\Pomodoro`  
**Date**: 2026-11-21  

---

## 1. Executive Summary

When running inside the Android Capacitor Native APK (`Capacitor.isNativePlatform() === true`), the user experience must be 100% indistinguishable from a compiled native Android application. Under no circumstances should desktop web headers (`PlatformHeader`), desktop web footers (`SharedFooter`), web cookie consent dialogs (`CookieConsentBanner`), PWA installation banners, or links prompting the user to download an Android APK ("Tải App Android (APK)") be rendered or leaked into the native Android view hierarchy.

Currently, **severe architectural leakage exists**:
1. All **13 secondary routes** (`/billing`, `/calendar`, `/rooms`, `/profile`, `/account/security`, `/dashboard`, `/settings`, `/privacy-data`, `/help`, `/contact`, `/terms`, `/privacy`, `/about`, `/download`, and 404) unconditionally mount `<PlatformHeader />` and `<SharedFooter />`.
2. Neither `PlatformHeader.tsx` nor `SharedFooter.tsx` checks for `isNativeCapacitor`. Both render raw desktop chrome inside the native APK.
3. `<CookieConsentBanner />` is mounted at root in `App.tsx:669` and lacks native suppression, floating directly on top of mobile timer controls. Furthermore, its action buttons lack `whitespace-nowrap`, causing button text to wrap across two lines on mobile web viewports.
4. Navigation trap: On mobile screen widths (< 640px), the return button in `LegalViews.tsx:72` has `hidden sm:flex`, while `HelpView.tsx` and `ContactView.tsx` have zero back buttons. Users navigating to policies or help are permanently trapped with no way back to the workspace.
5. In `App.tsx:394`, custom URL scheme deep links (`pomofocus://`) are discarded for everything except `/rooms` and OAuth callbacks.
6. In `App.tsx:235`, `window.addEventListener('beforeinstallprompt')` is registered unconditionally, causing PWA install prompts to appear inside the native Android APK.

We present a **5-Layer Web Isolation Architecture** that establishes ironclad invariants, guarantees zero leakage into native views, implements a standardized `MobileSubViewLayout` with a 48px Top Bar and persistent `← Quay lại` button, and provides 10 verifiable test specifications for Worker M1.

---

## 2. Forensic Codebase Audit & Evidence

### 2.1. Detection Mechanism: `Capacitor.isNativePlatform()`
Inspection of device detection across the repository reveals:
- **`src/hooks/useDeviceDetection.ts`**:
  ```ts
  // Lines 27-30
  const isNativeCapacitor = Boolean(
    capacitorObj?.isNativePlatform?.() ||
    (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.())
  );
  ```
  Returns `{ isAndroid, isIOS, isMobile, isDesktop, isNativeCapacitor }`. It is clean, SSR-safe, JSDOM-safe, and compatible with Vitest.
- **`src/utils/apiConfig.ts`**:
  ```ts
  // Lines 7-13
  export function isNativeApiRuntime(): boolean {
    if (typeof window !== 'undefined' && (window as any).IS_CAPACITOR_NATIVE === true) return true;
    if (Boolean((window as any).Capacitor?.isNativePlatform?.())) return true;
    return false;
  }
  ```
- **`src/components/AuthView.tsx:230-234`**:
  Imports `{ Capacitor } from '@capacitor/core'` and checks `Capacitor.isNativePlatform?.()`.

**Finding**: The detection helper exists and functions correctly, but it has **never been wired** into `PlatformHeader.tsx`, `SharedFooter.tsx`, `CookieConsentBanner.tsx`, or `App.tsx`'s secondary view router.

---

### 2.2. Web Header Leakage (`PlatformHeader.tsx`)
File: `src/components/PlatformHeader.tsx` (1191 lines)
- **Current Props**: `interface PlatformHeaderProps { isDownloadPage?: boolean; }`
- **Native Check**: Zero references to `isNativeCapacitor` or `Capacitor.isNativePlatform()`.
- **Download Links Rendered**:
  - Line 231: `{ path: '/download', label: 'Tải App', icon: Download, testId: 'header-nav-download' }` in `navItems`.
  - Lines 708-724:
    ```tsx
    {canInstall && (
      <button
        type="button"
        data-testid="header-user-install-pwa-btn"
        onClick={() => {
          setIsUserDropdownOpen(false);
          setMobileHeaderOpen(false);
          setHeaderExpanded(false);
          triggerInstall();
        }}
        ...
      >
        <Download size={14} className="text-zinc-400 shrink-0" />
        <span>Cài đặt ứng dụng (PWA)</span>
      </button>
    )}
    ```
- **Mobile Viewport Overflow (BUG-01)**:
  On a 390px viewport, `PlatformHeader` width is 358px (`390px - px-4`). Left logo is ~120px with `shrink-0`. Right controls (Credits + Login + Hamburger `≡`) require ~268px with `shrink-0`. Total width is 388px > 358px, overflowing by 30px and cutting the 32px hamburger button `≡` in half.

---

### 2.3. Web Footer Leakage (`SharedFooter.tsx`)
File: `src/components/SharedFooter.tsx` (239 lines)
- **Native Check**: Zero references to `isNativeCapacitor`.
- **Download Links Rendered**:
  - Lines 62-66:
    ```tsx
    {
      label: 'Tải App Android (APK)',
      path: '/download',
      icon: <Download size={13} className="text-emerald-400 shrink-0" />
    }
    ```
- **Layout Collisions**:
  Lacks `pb-safe` on line 109, causing Android 15 Edge-to-Edge system navigation gesture lines (24–36px) to occlude copyright text on mobile devices (BUG-06).

---

### 2.4. Cookie Consent Banner in APK (BUG-03)
File: `src/components/CookieConsentBanner.tsx` (119 lines)
- Mounted unconditionally at `App.tsx:669`: `<CookieConsentBanner />`.
- Lines 51-53:
  ```tsx
  if (!isVisible) return null;
  if (router.currentRoute.pathname.startsWith('/rooms/')) return null;
  ```
  Lacks `isNativeCapacitor` check.
- **Defects**:
  1. Pops up inside Android APK after 800ms, covering bottom action buttons (`Start/Pause/Skip`) in `MobileFocusView`.
  2. Buttons at lines 88-113 (`consent-accept-btn`, `consent-decline-btn`, `consent-details-btn`) lack `whitespace-nowrap`, causing "Đồng ý & Tiếp tục" and "Xem chính sách" to wrap into 2 lines on viewports under 390px.

---

### 2.5. Secondary Views Isolation Audit (BUG-01, BUG-02, BUG-76)
In `src/App.tsx:486-552`, non-workspace routes render standalone desktop view components:

| Route | Component | Web Header Mounted | Web Footer Mounted | Mobile Back Button | Trapped in APK? |
|---|---|:---:|:---:|:---:|:---:|
| `/terms`, `/privacy`, `/about` | `LegalViews.tsx` | Line 28 | Line 268 | `hidden sm:flex` (Line 72) | **YES (Trapped < 640px)** |
| `/billing`, `/subscription` | `BillingView.tsx` | Line 188 | Line 1277 | Inline only (Line 196) | Partial (Desktop chrome) |
| `/profile` | `ProfileView.tsx` | Line 78, 284 | Line 103, 814 | Inline only (Line 292) | Partial (Desktop chrome) |
| `/settings` | `SettingsView.tsx` | Line 137 | Line 545 | Inline icon only (Line 183) | Partial (Desktop chrome) |
| `/dashboard` | `DashboardView.tsx` | Line 251 | Line 486 | "Mở Không Gian" (Line 271) | Partial (Desktop chrome) |
| `/calendar` | `DedicatedCalendarView.tsx` | Line 163 | Line 552 | Zero back button | **YES (Trapped)** |
| `/rooms`, `/meet` | `StudyRoomLobby.tsx` | Line 291 | Line 1075 | Zero back button | **YES (Trapped)** |
| `/help` | `HelpView.tsx` | Line 53 | Line 178 | Zero back button | **YES (Trapped)** |
| `/contact` | `ContactView.tsx` | Line 46 | Line 226 | Zero back button | **YES (Trapped)** |
| `/privacy-data` | `PrivacyDataView.tsx` | Line 171 | Line 442 | Inline only (Line 179) | Partial (Desktop chrome) |
| `/account/security` | `AccountSecurityView.tsx` | Line 95, 321 | Line 111, 1203 | Inline only (Line 330) | Partial (Desktop chrome) |
| `/download`, `/apk` | `WebDownloadHub.tsx` | Line 218 | Line 623 | Prompts to download APK | **Absurd in APK** |
| `/*` (unmatched) | `NotFoundPage.tsx` | None | None | No TopBar / Emojis | Degraded |

---

### 2.6. Deep Linking & 404 Routing Defect (BUG-11)
In `src/App.tsx:380-405`:
```tsx
const handleDeepLinkUrl = (rawUrl: string) => {
  // 1. OAuth Tokens callback
  if (rawUrl.includes('access_token=') || rawUrl.includes('id_token=')) { ... }

  // 2. App Link for /rooms/:roomId or /rooms
  if (rawUrl.includes('/rooms')) { ... }
};
```
If a user clicks an external link or Android App Link such as `pomofocus://billing`, `pomofocus://calendar`, `pomofocus://settings`, `pomofocus://profile`, or `pomofocus://privacy`:
- The URL is completely ignored because `App.tsx` has zero handler for anything other than `/rooms`!
- In `NotFoundPage.tsx`, buttons render raw emojis (`⏱`, `🏠`), and there is no TopBar or native back navigation.

---

## 3. Five-Layer Web Isolation Architectural Blueprint

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          5-LAYER WEB ISOLATION MODEL                        │
├─────────────────────────────────────────────────────────────────────────────┤
│ LAYER 1: GLOBAL COMPONENT SELF-SUPPRESSION (DEFENSE IN DEPTH)                │
│ • PlatformHeader: returns null when isNativeCapacitor === true               │
│ • SharedFooter:   returns null when isNativeCapacitor === true               │
│ • CookieConsent:  returns null when isNativeCapacitor === true               │
├─────────────────────────────────────────────────────────────────────────────┤
│ LAYER 2: NATIVE SECONDARY NAVIGATION SHELL                                  │
│ • MobileSubViewLayout (h-12 Top Bar, ← Quay lại, title, pt-safe, pb-safe)    │
│ • Zero Z-index collision, State Singularity (Never 2 headers rendered)      │
├─────────────────────────────────────────────────────────────────────────────┤
│ LAYER 3: APP ROUTER NATIVE ISOLATION & REDIRECTION                          │
│ • Route /download in native APK automatically redirects to /app             │
│ • Secondary routes render MobileSubViewLayout in APK & Mobile viewports     │
├─────────────────────────────────────────────────────────────────────────────┤
│ LAYER 4: UNIVERSAL DEEP LINK ROUTER                                         │
│ • pomofocus://<any-path> is normalized and navigated in React Router        │
│ • NotFoundPage equipped with native TopBar and clean Lucide icons           │
├─────────────────────────────────────────────────────────────────────────────┤
│ LAYER 5: MOBILE WEB ACCESSIBILITY & TEXT-WRAP FIXES                         │
│ • LegalViews return button: unhide on mobile (remove hidden sm:flex)        │
│ • CookieConsentBanner buttons: add whitespace-nowrap                        │
│ • Suppress beforeinstallprompt in native Capacitor environment              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Exact File Edits & Implementation Recommendations for Worker M1

### File 1: `src/components/mobile/MobileSubViewLayout.tsx` (NEW FILE)
Create a reusable, highly optimized native subview wrapper conforming to Material 3 / Android Liquid Zen design standards:

```tsx
import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from '../../services/router';

export interface MobileSubViewLayoutProps {
  title: string;
  onBack?: () => void;
  actionSlot?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  testId?: string;
}

export const MobileSubViewLayout: React.FC<MobileSubViewLayoutProps> = ({
  title,
  onBack,
  actionSlot,
  children,
  className = '',
  testId = 'mobile-subview-layout',
}) => {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.navigate('/app');
    }
  };

  return (
    <div
      data-testid={testId}
      className={`min-h-[100dvh] h-[100dvh] max-h-[100dvh] w-full flex flex-col bg-[#09090b] text-[#f4f4f5] select-none overflow-hidden relative ${className}`}
    >
      {/* Native Top Bar (48px / h-12 with pt-safe containment) */}
      <header
        data-testid="mobile-subview-header"
        role="banner"
        className="h-12 min-h-[48px] max-h-[48px] w-full flex items-center justify-between px-3 bg-zinc-950/90 backdrop-blur-xl border-b border-white/10 z-20 shrink-0"
      >
        <button
          type="button"
          data-testid="mobile-subview-back-btn"
          onClick={handleBack}
          className="flex items-center gap-1.5 py-1 px-2.5 -ml-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 hover:text-white transition active:scale-95 cursor-pointer text-xs font-medium shrink-0"
          aria-label="Quay lại"
        >
          <ArrowLeft size={16} className="text-zinc-300" />
          <span>Quay lại</span>
        </button>

        <h1 className="text-sm font-bold text-white tracking-tight truncate max-w-[200px] text-center px-2">
          {title}
        </h1>

        <div className="w-20 flex items-center justify-end shrink-0">
          {actionSlot ?? null}
        </div>
      </header>

      {/* Scrollable Subview Content with bottom safe area padding */}
      <main className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden relative z-10 px-3 sm:px-4 py-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
        {children}
      </main>
    </div>
  );
};

export default MobileSubViewLayout;
```

---

### File 2: `src/components/PlatformHeader.tsx`
Add Layer 1 invariant to suppress rendering when in native APK mode:

```tsx
// At top imports:
import { useDeviceDetection } from '../hooks/useDeviceDetection';

// Inside PlatformHeader component (around line 47):
export const PlatformHeader: React.FC<PlatformHeaderProps> = ({ isDownloadPage: isDownloadPageProp }) => {
  const { isNativeCapacitor } = useDeviceDetection();

  // Layer 1 Invariant: Strictly zero web headers inside native Capacitor APK
  if (isNativeCapacitor) {
    return null;
  }
  // ... rest of component
```

---

### File 3: `src/components/SharedFooter.tsx`
Add Layer 1 invariant to suppress rendering when in native APK mode:

```tsx
// At top imports:
import { useDeviceDetection } from '../hooks/useDeviceDetection';

// Inside SharedFooter component (around line 24):
export const SharedFooter: React.FC = () => {
  const { isNativeCapacitor } = useDeviceDetection();

  // Layer 1 Invariant: Strictly zero web footers & APK download links inside native Capacitor APK
  if (isNativeCapacitor) {
    return null;
  }
  // ... rest of component
```

---

### File 4: `src/components/CookieConsentBanner.tsx`
Fix BUG-03 (Native suppression and button wrapping):

```tsx
// At top imports:
import { useDeviceDetection } from '../hooks/useDeviceDetection';

// Inside CookieConsentBanner component (around line 10):
export const CookieConsentBanner: React.FC = () => {
  const router = useRouter();
  const { isNativeCapacitor } = useDeviceDetection();
  const [isVisible, setIsVisible] = useState(false);

  // Invariant 1: Suppress banner completely on Native APK
  if (isNativeCapacitor) {
    return null;
  }

  // ... around line 88-113: Add whitespace-nowrap to all 3 action buttons
  <button
    type="button"
    data-testid="consent-accept-btn"
    onClick={handleAccept}
    className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-semibold active:scale-95 transition shadow-sm cursor-pointer whitespace-nowrap"
  >
    Đồng ý & Tiếp tục
  </button>
  <button
    type="button"
    data-testid="consent-decline-btn"
    onClick={handleDecline}
    className="px-3.5 py-1.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold active:scale-95 transition shadow-sm cursor-pointer whitespace-nowrap"
  >
    Từ chối
  </button>
  <button
    type="button"
    data-testid="consent-details-btn"
    onClick={handleOpenPrivacy}
    className="px-2.5 py-1.5 rounded-xl text-xs text-zinc-400 hover:text-white hover:bg-white/5 transition flex items-center gap-1 cursor-pointer whitespace-nowrap"
  >
    <span>Xem chính sách</span>
    <ChevronRight size={12} />
  </button>
```

---

### File 5: `src/App.tsx`
1. **PWA prompt suppression**:
   ```tsx
   useEffect(() => {
     if (isNativeCapacitor) return; // Do not capture PWA install prompt in native APK

     const handleBeforeInstallPrompt = (e: Event) => {
       e.preventDefault();
       usePwaInstallStore.getState().setDeferredPrompt(e as any);
     };
     // ...
   }, [isNativeCapacitor]);
   ```
2. **Deep link handler expansion (BUG-11)**:
   ```tsx
   const handleDeepLinkUrl = (rawUrl: string) => {
     if (!rawUrl) return;

     // 1. OAuth Tokens callback
     if (rawUrl.includes('access_token=') || rawUrl.includes('id_token=') || rawUrl.includes('error=')) {
       // ... existing OAuth handling
       return;
     }

     // 2. Generic internal deep linking (pomofocus://<path> or https://<domain>/<path>)
     try {
       let targetPath = '';
       if (rawUrl.startsWith('pomofocus://')) {
         const urlWithoutScheme = rawUrl.replace('pomofocus://', '');
         targetPath = urlWithoutScheme.startsWith('/') ? urlWithoutScheme : `/${urlWithoutScheme}`;
       } else {
         const parsed = new URL(rawUrl);
         targetPath = parsed.pathname + parsed.search;
       }

       if (targetPath) {
         router.navigate(targetPath);
       }
     } catch (err) {
       console.warn('[DeepLink] Failed to parse URL:', rawUrl, err);
     }
   };
   ```
3. **Download page redirection on native APK**:
   ```tsx
   if (currentPath === '/download' || currentPath === '/downloads' || currentPath === '/apk') {
     if (isNativeCapacitor) {
       router.navigate('/app', { replace: true });
       return (
         <ErrorBoundary>
           <MobileAppShell />
         </ErrorBoundary>
       );
     }
     return <WebDownloadHub />;
   }
   ```

---

### File 6: `src/components/LegalViews.tsx` (BUG-01, BUG-76)
1. Detect device: `const { isNativeCapacitor, isMobile } = useDeviceDetection();`
2. Remove `hidden sm:flex` on line 72:
   ```tsx
   // Replace:
   className="text-xs text-zinc-400 hover:text-white transition flex items-center gap-1 cursor-pointer whitespace-nowrap hidden sm:flex"
   // With:
   className="text-xs text-zinc-400 hover:text-white transition flex items-center gap-1 cursor-pointer whitespace-nowrap"
   ```
3. When `isNativeCapacitor`: Render with `MobileSubViewLayout`:
   ```tsx
   if (isNativeCapacitor) {
     return (
       <MobileSubViewLayout
         title={activeTab === 'terms' ? 'Điều Khoản Dịch Vụ' : activeTab === 'privacy' ? 'Chính Sách Bảo Mật' : 'Về PomoFocus'}
         onBack={() => router.navigate('/app')}
       >
         {/* Sub-nav Tabs & Content without PlatformHeader/SharedFooter */}
       </MobileSubViewLayout>
     );
   }
   ```

---

### File 7: `src/pages/NotFoundPage.tsx` (BUG-11)
1. Add a top return navigation bar with back button.
2. Clean up emojis to proper Lucide SVG icons (`<Clock size={16} />`, `<Home size={16} />`).
3. Add `data-testid="404-top-back-btn"`:
   ```tsx
   <header className="relative z-10 px-4 sm:px-8 py-4 flex items-center justify-between">
     <button
       type="button"
       data-testid="404-top-back-btn"
       onClick={() => router.navigate('/app')}
       className="flex items-center gap-1.5 text-xs text-zinc-300 hover:text-white px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 transition cursor-pointer"
     >
       <ArrowLeft size={14} />
       <span>Quay lại</span>
     </button>
     ...
   ```

---

## 5. Verification Test Plan (10 Test Cases)

Worker M1 should create `tests/unit/m1WebIsolationAndNavigation.test.tsx` containing:

1. **Test 1.1**: `PlatformHeader` returns `null` when `isNativeCapacitor === true`.
2. **Test 1.2**: `PlatformHeader` renders normally when `isNativeCapacitor === false`.
3. **Test 1.3**: `SharedFooter` returns `null` when `isNativeCapacitor === true`.
4. **Test 1.4**: `SharedFooter` renders normally on web and contains no crash.
5. **Test 1.5**: `CookieConsentBanner` returns `null` when `isNativeCapacitor === true`.
6. **Test 1.6**: `CookieConsentBanner` action buttons have `whitespace-nowrap` on web viewports.
7. **Test 1.7**: `MobileSubViewLayout` renders header with `title`, `ArrowLeft`, and clicking back calls `onBack` or navigates to `/app`.
8. **Test 1.8**: `LegalViews` in mobile mode (< 640px) renders a visible return button (`hidden sm:flex` removed).
9. **Test 1.9**: Deep link `pomofocus://billing`, `pomofocus://calendar`, `pomofocus://settings` navigates correctly in `App.tsx`.
10. **Test 1.10**: Navigating to `/download` inside native APK mode redirects to `/app` without rendering the download hub.
