# BRIEFING — 2026-11-21T11:20:00Z

## Mission
Investigate Web Isolation for Milestone M1 (APK Navigation Shell & 100% Web Isolation), including suppression of PlatformHeader, SharedFooter, CookieConsentBanner, PWA install prompts, APK download links in native APK mode, and design of MobileSubViewLayout with top back navigation for secondary views.

## 🔒 My Identity
- Archetype: explorer
- Roles: Teamwork Explorer
- Working directory: d:\FileCuaNam\Web'\Pomodoro\.agents\teamwork\explorer_m1_1
- Original parent: 1bd3b181-5618-4e23-9890-9f34e23eca19
- Milestone: Milestone 1: Zero-FOUT & Typography Foundation
- Phase 2 Parent: cf5bc11e-435c-4f27-a55e-a32f3bebfefa
- Phase 2 Milestone: Milestone M1: APK Navigation Shell & 100% Web Isolation

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Read-only investigation — do NOT implement directly in source code (only write to own folder).
- Keep index.html changes minimal, high performance, robust, and zero-flicker.
- Ensure #root React mount is completely unaffected.
- Strict read-only investigation — do NOT modify application source code directly during exploration.
- Zero web headers or footers in APK mode (`Capacitor.isNativePlatform()`).
- Zero APK download or PWA install banners/buttons in APK mode.
- Adherence to Z-index hierarchy and state singularity (never 2 headers rendered concurrently).
- Preserve existing web features for desktop and mobile web environments.

## Current Parent
- Conversation ID: cf5bc11e-435c-4f27-a55e-a32f3bebfefa
- Updated: 2026-11-21T11:20:00Z

## Investigation State
- **Explored paths**:
  - `src/App.tsx`, `src/components/mobile/MobileAppShell.tsx`, `src/components/PlatformHeader.tsx`, `src/components/SharedFooter.tsx`
  - `src/components/CookieConsentBanner.tsx`, `src/components/landing/WebDownloadHub.tsx`, `src/components/LandingPage.tsx`
  - `src/components/LegalViews.tsx`, `src/components/BillingView.tsx`, `src/components/ProfileView.tsx`, `src/components/SettingsView.tsx`
  - `src/components/DashboardView.tsx`, `src/components/DedicatedCalendarView.tsx`, `src/components/StudyRoomLobby.tsx`
  - `src/components/HelpView.tsx`, `src/components/ContactView.tsx`, `src/components/PrivacyDataView.tsx`, `src/components/AccountSecurityView.tsx`
  - `src/pages/NotFoundPage.tsx`, `src/hooks/useDeviceDetection.ts`, `src/utils/apiConfig.ts`, `src/stores/usePwaInstallStore.ts`
- **Key findings**:
  - `PlatformHeader`, `SharedFooter`, `CookieConsentBanner` unconditionally mount without checking `isNativeCapacitor`.
  - All 13 secondary routes mount raw web desktop components with header, footer, and download links.
  - Return button in `LegalViews.tsx:72` is hidden on mobile screens (`hidden sm:flex`), trapping users in `/terms` & `/privacy`.
  - `HelpView.tsx` and `ContactView.tsx` completely lack return buttons.
  - Deep link handler in `App.tsx` drops all custom links except `/rooms` and OAuth tokens.
  - PWA `beforeinstallprompt` is registered unconditionally in `App.tsx`.
- **Unexplored areas**: None for M1 scope.

## Key Decisions Made
- Designed `MobileSubViewLayout.tsx` for native TopBar (`h-12`) with persistent `← Quay lại` button and safe area padding.
- Established 5-Layer Web Isolation Strategy (Component Invariants, Navigation Shell, Router Redirect, Deep Link Mapper, Web Text-Wrap).
- Formulated exact file edits and 10 verification test cases for Worker M1.

## Artifact Index
- `DISPATCH.md` — Timestamped dispatch log
- `BRIEFING.md` — Working memory index
- `progress.md` — Liveness heartbeat
- `analysis.md` — Comprehensive forensic investigation and architectural blueprint
- `handoff.md` — 5-component handoff report for Worker M1 and Orchestrator
