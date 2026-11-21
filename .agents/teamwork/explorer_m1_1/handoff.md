# HANDOFF REPORT — Explorer M1-1

**Milestone**: M1 (APK Navigation Shell & 100% Web Isolation)  
**Agent**: `explorer_m1_1` (Teamwork Explorer)  
**Recipient**: `orchestrator_p2` (`cf5bc11e-435c-4f27-a55e-a32f3bebfefa`) / Worker M1  
**Timestamp**: 2026-11-21T11:21:00Z  
**Analysis Reference**: `d:\FileCuaNam\Web'\Pomodoro\.agents\teamwork\explorer_m1_1\analysis.md`  

---

## 1. Observation

1. **`Capacitor.isNativePlatform()` Detection**:
   - `src/hooks/useDeviceDetection.ts:27-30`: Properly detects `isNativeCapacitor = Boolean(capacitorObj?.isNativePlatform?.() || (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.()))`.
   - However, grep search across `src/components/` confirmed that `PlatformHeader.tsx`, `SharedFooter.tsx`, and `CookieConsentBanner.tsx` have **zero references** to `isNativeCapacitor`.

2. **Web Header & Footer Leakage**:
   - `src/components/PlatformHeader.tsx:41-47`: Renders unconditionally without checking native environment.
   - `src/components/PlatformHeader.tsx:231`: Contains `{ path: '/download', label: 'Tải App', icon: Download }` in `navItems`.
   - `src/components/PlatformHeader.tsx:708-724`: Renders `{canInstall && (... Cài đặt ứng dụng (PWA) ...)}`.
   - `src/components/SharedFooter.tsx:62-66`: Renders `{ label: 'Tải App Android (APK)', path: '/download' }` unconditionally across all non-workspace pages.

3. **Universal Blast Radius on Secondary Views (BUG-01, BUG-02, BUG-76)**:
   - `src/App.tsx:486-552`: All 13 secondary view routes (`/billing`, `/calendar`, `/rooms`, `/profile`, `/account/security`, `/dashboard`, `/settings`, `/privacy-data`, `/help`, `/contact`, `/terms`, `/privacy`, `/about`, `/download`, and 404) directly mount raw desktop web components that hardcode `<PlatformHeader />` and `<SharedFooter />`.
   - `src/components/LegalViews.tsx:72-76`: The back button `<button onClick={() => router.navigate('/app')}>` has class `hidden sm:flex`. On mobile screen widths (< 640px), the button is completely hidden, trapping mobile users in legal pages.
   - `src/components/HelpView.tsx:53` & `src/components/ContactView.tsx:46`: Contain zero return buttons on any viewport.

4. **Cookie Consent Banner Collision (BUG-03)**:
   - `src/App.tsx:669`: Mounts `<CookieConsentBanner />` unconditionally at root.
   - `src/components/CookieConsentBanner.tsx:51`: Lacks `isNativeCapacitor` check. It renders 800ms after startup in the native APK, floating over the timer controls in `MobileFocusView`.
   - `src/components/CookieConsentBanner.tsx:88-113`: Buttons lack `whitespace-nowrap`, wrapping "Đồng ý & Tiếp tục" across 2 lines on viewports under 390px.

5. **Deep Link Drop & 404 Page (BUG-11)**:
   - `src/App.tsx:394`: `if (rawUrl.includes('/rooms'))` is the only custom scheme route handled. Links like `pomofocus://billing` or `pomofocus://settings` are discarded.
   - `src/pages/NotFoundPage.tsx:51, 80-95`: Renders raw emojis (`⏱`, `🏠`) and lacks a top navigation bar with a back button.

6. **Baseline Build & Tests**:
   - `npm run type-check`: Ran via background task (Task ID `d6a2c851-381d-42d1-ae1d-9348f614aa28/task-188`), completed with **0 errors** (exit code 0).

---

## 2. Logic Chain

1. From Observation 1, `useDeviceDetection` reliably returns `isNativeCapacitor: true` when running inside Capacitor Android APK.
2. From Observation 2, because `PlatformHeader.tsx` and `SharedFooter.tsx` never check `isNativeCapacitor`, whenever any view mounts them inside the APK, they leak full web desktop chrome, including "Tải App" and "Cài đặt PWA" links.
3. Therefore, adding a Layer 1 self-suppression invariant (`if (isNativeCapacitor) return null;`) at the top of `PlatformHeader.tsx` and `SharedFooter.tsx` guarantees that no matter where or how they are mounted, they will NEVER render inside native APK mode (Defense in Depth).
4. From Observation 3, when `PlatformHeader` is suppressed, secondary views in APK mode need a native top navigation bar. Creating `MobileSubViewLayout.tsx` with a standard 48px TopBar (`h-12`), persistent `← Quay lại` button, title, and safe area insets (`pt-safe`, `pb-safe`) provides a native Android app experience across all secondary views.
5. In `LegalViews.tsx`, removing `hidden sm:flex` from the return button fixes BUG-01 on mobile web viewports (< 640px). Wrapping legal views in `MobileSubViewLayout` in native APK mode resolves BUG-76.
6. From Observation 4, adding `if (isNativeCapacitor) return null;` to `CookieConsentBanner.tsx` and adding `whitespace-nowrap` to its buttons resolves BUG-03.
7. From Observation 5, expanding `handleDeepLinkUrl` in `App.tsx` to parse any `pomofocus://` path, and adding a top back button and Lucide icons to `NotFoundPage.tsx`, resolves BUG-11.
8. In `App.tsx`, intercepting `/download` routes on `isNativeCapacitor` to redirect to `/app` prevents APK users from ever viewing a download hub for the app they are already using.

---

## 3. Caveats

- **Android 15 Edge-to-Edge**: Full dynamic keyboard insets and hardware back-stack coordination are assigned to Milestone M2 (`MobileAppShell.tsx` and `MainActivity.java`). Milestone M1 focuses strictly on Web Isolation, secondary view navigation shell, and banner suppression.
- **Google OAuth Native Flow**: Native OAuth via `@capacitor/browser` is assigned to Milestone M3 (`googleAuthService.ts`).
- **No Caveats** regarding the Web Isolation scope: the proposed file modifications and invariants are completely self-contained.

---

## 4. Conclusion

The strategy for Worker M1 is clear, surgical, and robust:
1. **New Component**: Create `src/components/mobile/MobileSubViewLayout.tsx` (TopBar `h-12`, back button, title, action slot, `overflow-y-auto`, safe area insets).
2. **Layer 1 Invariants**:
   - `src/components/PlatformHeader.tsx`: Return `null` if `isNativeCapacitor`.
   - `src/components/SharedFooter.tsx`: Return `null` if `isNativeCapacitor`.
   - `src/components/CookieConsentBanner.tsx`: Return `null` if `isNativeCapacitor`; add `whitespace-nowrap` to buttons.
3. **App Router & Deep Links (`src/App.tsx`)**:
   - Suppress `beforeinstallprompt` if `isNativeCapacitor`.
   - Expand `handleDeepLinkUrl` to parse `pomofocus://<path>`.
   - Redirect `/download` -> `/app` in native APK mode.
4. **Secondary Views**:
   - `src/components/LegalViews.tsx`: Unhide return button on mobile (remove `hidden sm:flex`); render inside `MobileSubViewLayout` in APK mode.
   - `src/pages/NotFoundPage.tsx`: Add top back button, replace raw emojis with Lucide icons.
5. **Unit Tests**: Implement 10 comprehensive tests in `tests/unit/m1WebIsolationAndNavigation.test.tsx`.

---

## 5. Verification Method

1. **Static Analysis & Typecheck**:
   ```bash
   npm run type-check
   ```
   Must exit with code 0.
2. **Unit Tests**:
   ```bash
   npx vitest run tests/unit/m1WebIsolationAndNavigation.test.tsx
   ```
   All 10 tests must pass:
   - `PlatformHeader` returns `null` on `isNativeCapacitor === true`.
   - `SharedFooter` returns `null` on `isNativeCapacitor === true`.
   - `CookieConsentBanner` returns `null` on `isNativeCapacitor === true`.
   - Cookie banner action buttons contain `whitespace-nowrap`.
   - `MobileSubViewLayout` renders TopBar with title and triggers back navigation.
   - `LegalViews` return button does not contain `hidden sm:flex`.
   - Deep links `pomofocus://billing` trigger router navigation.
   - Navigating to `/download` on native APK redirects to `/app`.
3. **Existing Test Suite Regression**:
   ```bash
   npm run test
   ```
   All 53 test suites must pass without regressions.
4. **Invalidation Condition**:
   If any web header or footer is visible when `(window as any).Capacitor = { isNativePlatform: () => true }`, or if any secondary view is trapped without a back button on `< 640px`, the fix is invalid.
