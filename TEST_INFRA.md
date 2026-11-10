# TEST INFRASTRUCTURE SPECIFICATION: POMOFOCUS V7.4 ULTIMATE — ECOSYSTEM "LANDING WEB + STANDALONE ANDROID APK"
**Project:** PomoFocus v7.4 Ultimate — Ecosystem "Landing Web + Standalone Android APK"  
**Author:** E2E Test Track Writer (`test_writer_v74_e2e`)  
**Status:** ACTIVE / SPECIFIED  
**Date:** 2026-11-09  

---

## 1. Executive Summary & Testing Philosophy

This document defines the testing governance, runner configurations, test tiers, and execution contracts for the **PomoFocus v7.4 Ultimate Ecosystem**. The ecosystem unites two core targets:
1. **Landing Web Hub Showcase (`/download`, `/downloads`, `/apk`)**: High-conversion Zen Glassmorphism showcase page featuring Smart User-Agent detection, breathing emerald glow 1-touch APK download button, phone mockup preview, dynamic SVG QR code generation, and 1-click link copy.
2. **Standalone Native Android Engine (`/app`)**: 120Hz native mobile shell with Zero-Scroll-Chaining, Rolling Digit Stepper with 10ms haptic feedback, 5-tab Bottom Navigation spring bounce, squash & stretch Mode Switcher pill, task checkbox SVG stroke animation with jade glow burst, Screen Wake Lock, and Anchor Timestamp Engine.
3. **In-App Auto-Update & Distribution Engine**: Inset liquid banner at `z-40` checking `https://pomofocus-workspace.vercel.app/version.json` against `CURRENT_APP_VERSION = '7.4.0'`.
4. **Capacitor Android Packaging Engine**: `capacitor.config.ts` (`com.pomofocus.workspace`) and standalone build script (`scripts/buildApk.ts`).

### Testing Philosophy
1. **Opaque-Box Requirement-Driven Verification**:
   - Tests verify user-observable behavior, accessible DOM attributes (`role`, `aria-*`, `tabIndex`), visual state classes, touch target ergonomics (48x48dp minimum per Fitts's Law), and external interface contracts defined in `PROJECT.md` and `ORIGINAL_REQUEST.md`.
   - Tests never depend on private implementation variables or unexported internals.
2. **Progressive Testability & Graceful Resolution**:
   - The test suite uses dynamic progressive loading (`safeImport`) and condition guards (`it.skipIf(...)`). Milestones currently in progress or planned (M1, M2, M3) can be tested cleanly as files arrive without breaking test runs or halting CI.
   - Core utility logic (QR matrix generator, semver compare, User-Agent detector, CSS rule checks) is validated both modularly and through end-to-end component rendering.
3. **Deterministic & Isolated Execution**:
   - Each test is completely isolated: resets IndexedDB (via `fake-indexeddb`), clears `localStorage` and `sessionStorage`, resets Zustand stores (`useTimerStore`, `useLayoutStore`, `useAiStore`, `useTaskStore`), and tears down all event listeners (`resize`, `popstate`, `focusin`, `change`).
4. **High-Fidelity Web & Mobile API Simulation**:
   - Simulates `navigator.userAgent`, `navigator.vibrate`, `navigator.clipboard`, `navigator.wakeLock`, and `window.matchMedia` with strict spec compliance.

---

## 2. Test Architecture & Runner Configuration

| Layer | Specification | Details |
|---|---|---|
| **Test Runner** | Vitest v2.1.8 | ESM-native test runner integrated into Vite build pipeline |
| **DOM Environment** | JSDOM v24.1.0 | Full browser DOM & Web API simulation (HTML5, Storage, History, Events) |
| **Component Testing** | `@testing-library/react` v16.1.0 | Accessible DOM queries (`screen.getByRole`, `findByText`, `fireEvent`, `act`) |
| **Database Mock** | `fake-indexeddb/auto` v6.2.6 | Dexie v4.0.11 in-memory storage isolation |
| **Primary Test Suite**| `tests/unit/v74EcosystemE2E.test.tsx` | Comprehensive 4-tier E2E and unit test suite |
| **Execution Command** | `npx vitest run tests/unit/v74EcosystemE2E.test.tsx` | Executes all 4 tiers of v7.4 Ecosystem tests |
| **Type Check Command**| `npm run type-check` (`tsc --noEmit`) | Verifies 0 TypeScript compiler diagnostic errors |

---

## 3. Feature Inventory Mapping (15 Features)

| # | Feature | Description | Target Files | Milestone | Test Strategy |
|---|---------|-------------|--------------|-----------|---------------|
| 1 | Zero-Scroll-Chaining | Fixed 100dvh body with scroll-isolated root container | `src/index.css` | M1 | CSS AST/regex verification for fixed 100dvh, overflow hidden, overscroll-behavior none |
| 2 | Rolling Digit Morph & Haptics | Vertical 120ms digit slide with 10ms haptic feedback | `src/components/mobile/primitives/MobileStepperRow.tsx` | M1 | DOM render, minus/plus click, `navigator.vibrate(10)` assertion, 48x48dp touch targets |
| 3 | Bottom Nav Spring Micro-Animations | 5-tab active pill indicator and `scale: 0.85 -> 1.15 -> 1.0` spring bounce | `src/components/mobile/MobileAppShell.tsx`, `MobileBottomNav.tsx` | M1 | Tab switching, spring animation class verification, virtual keyboard handling |
| 4 | Mode Switcher Spring Physics | Squash & stretch active pill transition for Focus/Short/Long Break | `src/components/mobile/views/MobileFocusView.tsx` | M1 | Phase buttons click, active pill transition, store phase & duration update |
| 5 | Task Checkbox SVG Tick & Jade Glow | Animated SVG `strokeDashoffset` (20 to 0) and jade glow burst | `src/components/TasksWidget.tsx`, `MobileAppShell.tsx` | M1 | Checkbox toggle, SVG checkmark animation, emerald shadow burst |
| 6 | Web Download Hub Landing Page | Showcase page with phone mockup, emerald glow button, dynamic QR code | `src/components/landing/WebDownloadHub.tsx` | M2 | Component render, responsive grid, feature highlight cards |
| 7 | Dedicated Download Routing | Routes `/download`, `/downloads`, `/apk` in `src/App.tsx` and static titles | `src/App.tsx`, `src/stores/useTimerStore.ts` | M2 | Route navigation, component display, `document.title` static update |
| 8 | Smart User-Agent Detection | Hook `useDeviceDetection.ts` differentiating Android vs Desktop/Laptop | `src/hooks/useDeviceDetection.ts` | M2 | Hook execution with Android, iOS, Windows, macOS, Capacitor UA strings |
| 9 | Central 1-Touch APK Button | Android prominent download button with breathing emerald glow | `src/components/landing/WebDownloadHub.tsx` | M2 | Button href contract (`/downloads/PomoFocus-v7.4.apk`), pulse class, download click |
| 10 | Zero-Dependency SVG QR Code | Dynamic high-res QR vector generator in `src/utils/qrCode.ts` + 1-click copy link | `src/utils/qrCode.ts` | M2 | SVG vector string generation, option configuration, clipboard copy |
| 11 | In-App Auto-Update & Version Banner | `public/version.json`, `versionCompare.ts`, and `LiquidUpdateBanner.tsx` at z-40 | `src/utils/versionCompare.ts`, `LiquidUpdateBanner.tsx` | M2 | Semver comparison logic, version fetch mock, banner at z-40 render & dismiss |
| 12 | Capacitor Android Setup & Config | `capacitor.config.ts`, `android/local.properties`, and Capacitor integration | `capacitor.config.ts` | M3 | Config file structure (`appId`, `appName`, `webDir`) |
| 13 | Standalone APK Build Automation | `scripts/buildApk.ts`, `assembleDebug`, and `public/downloads/PomoFocus-v7.4.apk` | `scripts/buildApk.ts`, `public/downloads/` | M3 | Build script inspection, output path verification, checksum integrity |
| 14 | Dual Track E2E Test Suite | Comprehensive opaque-box test suites (Tiers 1-4) in `TEST_READY.md` | `tests/unit/v74EcosystemE2E.test.tsx` | E2E Track | Multi-tier test suite execution with 100% pass |
| 15 | Adversarial Hardening & Forensic Audit | Tier 5 adversarial tests, 0 type errors (`tsc --noEmit`), forensic integrity | Repository Root | M4 | Stress tests, memory cleanup, 0 compilation diagnostic errors |

---

## 4. Four-Tier Test Architecture

```
tests/unit/v74EcosystemE2E.test.tsx
├── Tier 1: Feature Coverage (>=5 test cases per core feature in isolation)
│   ├── Feature 1: Zero-Scroll-Chaining (Fixed 100dvh, isolated #root, 120Hz keyframes)
│   ├── Feature 2: Rolling Digit Morph & Haptics (MobileStepperRow)
│   ├── Feature 3: Bottom Nav Spring Micro-Animations (MobileBottomNav & MobileAppShell)
│   ├── Feature 4: Mode Switcher Spring Physics (MobileFocusView)
│   ├── Feature 5: Task Checkbox SVG Tick & Jade Glow (TasksWidget & MobileAppShell)
│   ├── Feature 6: Web Download Hub Landing Page (WebDownloadHub showcase)
│   ├── Feature 7: Dedicated Download Routing (/download, /downloads, /apk)
│   ├── Feature 8: Smart User-Agent Detection (useDeviceDetection hook)
│   ├── Feature 9: Central 1-Touch APK Button & Breathing Emerald Glow
│   ├── Feature 10: Zero-Dependency SVG QR Code Generator (qrCode.ts & 1-click copy)
│   ├── Feature 11: In-App Auto-Update & Version Banner (versionCompare & LiquidUpdateBanner)
│   └── Feature 12 & 13: Capacitor Android Setup & Standalone Build Automation
├── Tier 2: Boundary & Corner Cases
│   ├── Invalid, malformed & bot User-Agent strings
│   ├── Negative, zero, and extreme step increments in Stepper
│   ├── Upper & lower bound clamping (1-120 min, Home/End keys)
│   ├── Missing version.json / HTTP 404/500 network failures
│   ├── Extremely long changelog text truncation
│   ├── Zero or negative QR code dimension requests
│   ├── Clipboard API rejection graceful fallback
│   ├── Rapid tab switching stress on Bottom Navigation
│   ├── Rapid task toggle stress without race conditions
│   └── Semver prerelease and equality edge cases
├── Tier 3: Cross-Feature Combinations
│   ├── Stepper adjustment in settings updates rolling numerals in focus view
│   ├── Active timer countdown preserved during bottom nav tab switches
│   ├── Completed task in tasks tab updates linked task chip in focus view
│   ├── Desktop UA switching to mobile viewport dynamically adapts Web Hub UI
│   ├── In-app update banner at z-40 renders above BottomNav without intercepting timer
│   ├── Mode switcher change updates active pill and resets timer duration
│   ├── Audio settings adjustment via stepper maintains smooth playback
│   └── Fullscreen Zen mode isolates timer and synchronizes BottomNav on exit
└── Tier 4: Real-World Workload Scenarios
    ├── Scenario 1: Android user visits Web Hub, triggers smart detection, downloads APK
    ├── Scenario 2: Desktop user views phone mockup, scans dynamic QR code & copies link
    ├── Scenario 3: In-app auto-update checks version.json, displays changelog, triggers update
    └── Scenario 4: Full 120Hz mobile native focus marathon (Zero-scroll, steppers, modes, tasks)
```

---

## 5. Coverage Thresholds & Pass/Fail Criteria

### Quality Gates
- **Tier 1 (Feature Coverage)**: >=5 distinct test cases for every new core feature (Features 1–11).
- **Tier 2 (Boundary & Corner Cases)**: Comprehensive limit stress testing for UA parsing, semver comparison, network faults, clamping, and Fitts's Law touch targets.
- **Tier 3 (Cross-Feature Combinations)**: Multi-component workflow validation ensuring no state desynchronization.
- **Tier 4 (Real-World Workload Scenarios)**: High-conversion Web Hub flows and Standalone Android lifecycle simulations.
- **TypeScript Health**: 0 type errors on `npm run type-check` (`tsc --noEmit`).
- **Pass/Fail Semantics**:
  - **PASS**: All assertions succeed, DOM states reflect expected values, ARIA attributes match specs, and no unhandled rejections occur.
  - **FAIL**: Any boundary violation, z-index collision, broken download URL, or missing touch target compliance.

---

## 6. Execution Commands

```bash
# Execute the complete v7.4 Ecosystem test suite
npx vitest run tests/unit/v74EcosystemE2E.test.tsx

# Execute specific tier tests by title filter
npx vitest run tests/unit/v74EcosystemE2E.test.tsx -t "Tier 1"
npx vitest run tests/unit/v74EcosystemE2E.test.tsx -t "Tier 2"
npx vitest run tests/unit/v74EcosystemE2E.test.tsx -t "Tier 3"
npx vitest run tests/unit/v74EcosystemE2E.test.tsx -t "Tier 4"

# Validate zero TypeScript compilation diagnostic errors
npm run type-check
```
