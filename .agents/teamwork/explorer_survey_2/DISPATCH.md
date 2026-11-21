## 2026-11-21T05:11:48Z
Task dispatch from orchestrator_p2 (conversation ID cf5bc11e-435c-4f27-a55e-a32f3bebfefa):
Survey APK Native Navigation Shell, TopBar, Hardware Back-Stack & Android 15 Edge-to-Edge:
1. Item 1: Tách biệt kiến trúc APK độc lập 100% khỏi Web (BUG-01, 02, 03, 11, 13, 76):
   - Inspect where Capacitor.isNativePlatform() is used in App.tsx, MobileAppShell.tsx, PlatformHeader.tsx, SharedFooter.tsx, and all sub-views.
   - Identify every place where PlatformHeader Web, SharedFooter Web, APK download button, or PWA install button are rendered. Detail how to suppress them completely inside APK native platform.
   - Design a clean, unified native Top Bar with ← Quay lại button visible on mobile (< 640px) for all APK secondary screens.
   - Inspect CookieConsentBanner.tsx: hide completely in APK native platform (BUG-03); on Web, add whitespace-nowrap to prevent button text breaking across 2 lines.
   - Inspect internal routing, deep link handling, and add a back button to NotFoundPage.tsx (BUG-11).
2. Item 2: Android Hardware Back Button & Insets (BUG-05, 06, 07):
   - Inspect MainActivity.java and MobileAppShell.tsx: design a centralized back-stack for all modals, drawers, and bottom-sheets. Ensure canGoBackInApp is true as long as any modal/sheet/secondary route is open; only on the root focus screen does pressing Back twice within 2 seconds exit the app.
   - Inspect Android 15 Edge-to-Edge in MobileBottomNav.tsx and MobileAppShell.tsx: remove max-h-[56px], compute dynamic height calc(56px + env(safe-area-inset-bottom, 0px)), apply pb-safe to bottom views to prevent system gesture bar collisions, and incorporate pt-safe into header internal padding instead of creating an ugly black horizontal strip.
