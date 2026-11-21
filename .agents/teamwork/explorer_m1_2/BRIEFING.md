# BRIEFING — 2026-11-21T11:26:00Z

## Mission
Investigate Secondary Views TopBar & Back Button Architecture for Milestone M1 (APK Navigation Shell & 100% Web Isolation) to prevent users from getting stranded on mobile/APK when entering secondary views.

## 🔒 My Identity
- Archetype: explorer
- Roles: investigator, analyzer, synthesizer
- Working directory: d:\FileCuaNam\Web'\Pomodoro\.agents\teamwork\explorer_m1_2
- Original parent: cf5bc11e-435c-4f27-a55e-a32f3bebfefa
- Milestone: M1

## 🔒 Key Constraints
- Read-only investigation — do NOT implement in src/ directly
- Focus strictly on Secondary Views TopBar & Back Button Architecture
- Comply with UI/UX Design Playbook & Postmortem (Z-Index, Safe Area, State Singularity, Mobile Safe Area)
- Address BUG-01, BUG-02 from FORENSIC_DEEP_AUDIT_REPORT.md

## Current Parent
- Conversation ID: cf5bc11e-435c-4f27-a55e-a32f3bebfefa
- Updated: 2026-11-21T11:26:00Z

## Investigation State
- **Explored paths**:
  - `src/App.tsx`
  - `src/components/LegalViews.tsx`
  - `src/components/BillingView.tsx`
  - `src/components/ProfileView.tsx`
  - `src/components/SettingsView.tsx` / `src/components/mobile/views/MobileSettingsView.tsx`
  - `src/components/DashboardView.tsx`
  - `src/components/DedicatedCalendarView.tsx`
  - `src/components/StudyRoomLobby.tsx`
  - `src/components/PrivacyDataView.tsx`
  - `src/components/AccountSecurityView.tsx`
  - `src/components/HelpView.tsx`
  - `src/components/ContactView.tsx`
  - `src/components/PlatformHeader.tsx`
  - `src/components/SharedFooter.tsx`
  - `src/components/CookieConsentBanner.tsx`
  - `src/pages/NotFoundPage.tsx`
  - `src/components/landing/WebDownloadHub.tsx`
- **Key findings**:
  - 5/11 views completely lack back buttons (`DedicatedCalendarView`, `StudyRoomLobby`, `HelpView`, `ContactView`, and `LegalViews` on mobile where it's `hidden sm:flex`).
  - All 11 views hardcode `PlatformHeader` and `SharedFooter`, causing web leakage on APK and overflow clipping on mobile (< 640px).
  - Designed Dual-Morph `MobileSubViewLayout.tsx` with 48px `pt-safe` TopBar, >= 44x44px back button, dynamic title, and optional right actions.
  - Defense-in-depth: `PlatformHeader` and `SharedFooter` return null when `isNativeCapacitor`.
  - Resolution of BUG-03 (CookieBanner APK suppression + `whitespace-nowrap`) and BUG-11 (Deep links + 404 back button).
- **Unexplored areas**: None. 100% investigated.

## Key Decisions Made
- Dual-Morph architecture for `MobileSubViewLayout.tsx`: Mobile/APK renders `MobileTopBar` and suppresses Web Header/Footer; Desktop Web retains `PlatformHeader` and `SharedFooter`.
- Backward compatibility: Prop `backTestId` allows retaining `billing-back-btn`, `back-to-workspace-btn`, `404-btn-back-workspace` for existing e2e and unit tests.
- On mobile `/settings`, route renders `MobileSettingsView` wrapped in `MobileSubViewLayout` instead of desktop `SettingsView`.

## Artifact Index
- DISPATCH.md — Received dispatch message
- context.md — Context file from orchestrator
- BRIEFING.md — Persistent memory
- progress.md — Liveness heartbeat
- analysis.md — Full analysis report
- handoff.md — Handoff report
