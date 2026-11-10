# Project: PomoFocus v7.4 Ultimate — Ecosystem "Landing Web + Standalone Android APK"

## Architecture
- **Ecosystem Duality**:
  1. **Web Hub Landing Page (`/download`)**: Zen Glassmorphism showcase designed for high-conversion onboarding, featuring 1-touch APK download button, phone mockup preview, and dynamic QR code generation.
  2. **Standalone Android APK Engine (`/app`)**: 120Hz native performance on mobile viewports with Anchor Timestamp Engine, Screen Wake Lock API, haptic feedback, spring physics, and zero-scroll-chaining.
- **Micro-Animations & Physics (120Hz)**:
  - **Zero-Scroll-Chaining**: `html, body { position: fixed; inset: 0; width: 100%; height: 100dvh; overflow: hidden !important; overscroll-behavior: none !important; }` with `#root { width: 100%; height: 100%; overflow-y: auto; overflow-x: hidden; position: relative; }`.
  - **Rolling Digit Morph**: Vertical Y-axis number transition in 120ms with `navigator.vibrate(10)` safe guard in `MobileStepperRow.tsx`.
  - **Active Bottom Navigation Indicator & Spring Bounce**: Shared active indicator pill and `scale: [0.85, 1.15, 1.0]` spring bounce on tab change in `MobileAppShell.tsx` and `MobileBottomNav.tsx`.
  - **Mode Switcher Physics**: Squash & stretch spring physics pill indicator for Focus / Short Break / Long Break in `MobileFocusView.tsx`.
  - **Task Checkbox Animation**: SVG tick `strokeDashoffset` (20 to 0 in 180ms) + jade glow burst in `MobileAppShell.tsx` and `TasksWidget.tsx`.
- **Distribution & Auto-Update Engine**:
  - Direct public distribution via `https://pomofocus-workspace.vercel.app/downloads/PomoFocus-v7.4.apk`.
  - Smart User-Agent detection (`src/hooks/useDeviceDetection.ts`) presenting Android 1-touch emerald glow button vs Desktop QR code mockup.
  - Zero-dependency SVG QR Matrix Generator (`src/utils/qrCode.ts`) ensuring zero new npm dependencies.
  - In-App Auto-Update & Version Check (`public/version.json`, `src/utils/versionCompare.ts`, `src/components/LiquidUpdateBanner.tsx` at z-40).
- **Android Native Capacitor Engine**:
  - Capacitor integration with `@capacitor/core`, `@capacitor/android`, `@capacitor/haptics`, `@capacitor/status-bar`, and `@capacitor/cli`.
  - `capacitor.config.ts` targeting `webDir: 'dist'`, `appId: 'com.pomofocus.workspace'`, and `appName: 'PomoFocus'`.
  - Automated APK packaging script (`scripts/buildApk.ts`) setting `JAVA_HOME`, syncing web assets, executing `assembleDebug`, and placing `public/downloads/PomoFocus-v7.4.apk`.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Zero-Scroll-Chaining | Fixed 100dvh body with scroll-isolated root container in `src/index.css` | M1 | ORIGINAL_REQUEST §1.4 |
| 2 | Rolling Digit Morph & Haptics | Vertical 120ms digit slide with 10ms haptic feedback in `MobileStepperRow.tsx` | M1 | ORIGINAL_REQUEST §1.3 |
| 3 | Bottom Nav Spring Micro-Animations | 5-tab active pill indicator and `scale: 0.85 -> 1.15 -> 1.0` spring bounce | M1 | ORIGINAL_REQUEST §1.3 |
| 4 | Mode Switcher Spring Physics | Squash & stretch active pill transition for Focus/Short/Long Break | M1 | ORIGINAL_REQUEST §1.3 |
| 5 | Task Checkbox SVG Tick & Jade Glow | Animated SVG `strokeDashoffset` and jade glow burst on task completion | M1 | ORIGINAL_REQUEST §1.3 |
| 6 | Web Download Hub Landing Page | Showcase page at `src/components/landing/WebDownloadHub.tsx` | M2 | ORIGINAL_REQUEST §1.1, §2 |
| 7 | Dedicated Download Routing | Routes `/download`, `/downloads`, `/apk` in `src/App.tsx` and static titles | M2 | Survey 2 & ORIGINAL_REQUEST |
| 8 | Smart User-Agent Detection | Hook `useDeviceDetection.ts` differentiating Android vs Desktop/Laptop | M2 | ORIGINAL_REQUEST §1.1 |
| 9 | Central 1-Touch APK Button | Android prominent download button with breathing emerald glow | M2 | ORIGINAL_REQUEST §1.1 |
| 10 | Zero-Dependency SVG QR Code | Dynamic high-res QR vector generator in `src/utils/qrCode.ts` + 1-click copy link | M2 | ORIGINAL_REQUEST §1.1 |
| 11 | In-App Auto-Update & Version Banner | `public/version.json`, `versionCompare.ts`, and `LiquidUpdateBanner.tsx` at z-40 | M2 | ORIGINAL_REQUEST §1.2 |
| 12 | Capacitor Android Setup & Config | `capacitor.config.ts`, `android/local.properties`, and Capacitor integration | M3 | ORIGINAL_REQUEST §2 |
| 13 | Standalone APK Build Automation | `scripts/buildApk.ts`, `assembleDebug`, and `public/downloads/PomoFocus-v7.4.apk` | M3 | ORIGINAL_REQUEST §1.1, §2 |
| 14 | Dual Track E2E Test Suite | Comprehensive opaque-box test suites (Tiers 1-4) in `TEST_READY.md` | E2E Track | ORIGINAL_REQUEST §2 |
| 15 | Adversarial Hardening & Forensic Audit | Tier 5 adversarial tests, 0 type errors (`tsc --noEmit`), forensic integrity verification | M4 | ORIGINAL_REQUEST §2 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Zero-Scroll-Chaining & 120Hz Micro-Animations | Features 1, 2, 3, 4, 5 (`index.css`, `MobileStepperRow`, `MobileBottomNav`, `MobileAppShell`, `MobileFocusView`, `TasksWidget`) | none | DONE |
| M2 | Web Download Hub & Distribution Ecosystem | Features 6, 7, 8, 9, 10, 11 (`WebDownloadHub.tsx`, routing, `useDeviceDetection`, `qrCode.ts`, `version.json`, `LiquidUpdateBanner`) | none | DONE |
| M3 | Capacitor Android Setup & Standalone APK Build | Features 12, 13 (`capacitor.config.ts`, `android/local.properties`, `scripts/buildApk.ts`, `public/downloads/PomoFocus-v7.4.apk`) | M1, M2 | DONE |
| M4 | Dual Track E2E Testing, Adversarial Hardening & Audit | Features 14, 15 (E2E Test validation, Tier 5 hardening, 100% tests pass, Forensic Audit CLEAN) | M1, M2, M3 | DONE |

## Interface Contracts
### Micro-Animations & CSS Contract
- `src/index.css`:
  - `html, body { position: fixed; inset: 0; width: 100%; height: 100dvh; overflow: hidden !important; overscroll-behavior: none !important; }`
  - `#root { width: 100%; height: 100%; overflow-y: auto; overflow-x: hidden; position: relative; }`
- `src/components/mobile/primitives/MobileStepperRow.tsx`:
  - `interface MobileStepperRowProps`: unchanged external signature (`label`, `value`, `min`, `max`, `step`, `unit`, `onChange`, `testId`).
  - Rolling digit morph inside `overflow-hidden` container along Y-axis in 120ms.
  - Haptic feedback: `if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(10)` protected by try/catch.
- `src/components/mobile/MobileAppShell.tsx` & `MobileBottomNav.tsx`:
  - Spring bounce on active tab selection `scale: 0.85 -> 1.15 -> 1.0` in 260ms.
  - Active indicator pill with smooth transition `cubic-bezier(0.16, 1, 0.3, 1)`.
- `src/components/mobile/views/MobileFocusView.tsx`:
  - Active pill background between `pomodoro`, `short_break`, `long_break` with squash & stretch spring curve.
- `src/components/TasksWidget.tsx` & `MobileAppShell.tsx`:
  - Checkbox SVG checkmark with `strokeDashoffset: 20 -> 0` in 180ms and `jade-burst` animation.

### Web Download Hub Contract
- `src/components/landing/WebDownloadHub.tsx`:
  - Standalone high-conversion showcase page. Reuses `<PlatformHeader />` and `<SharedFooter />` (State Singularity).
  - Responsive layout: Android device shows prominent emerald glowing APK button; Desktop shows 3D mockup + SVG QR Code.
- `src/hooks/useDeviceDetection.ts`:
  - `export function useDeviceDetection(): { isAndroid: boolean; isIOS: boolean; isMobile: boolean; isDesktop: boolean; isNativeCapacitor: boolean; }`
- `src/utils/qrCode.ts`:
  - `export function generateQrCodeSvg(text: string, options?: { size?: number; margin?: number; color?: string; }): string`
  - Zero external dependencies.
- `src/components/LiquidUpdateBanner.tsx`:
  - Inset liquid banner at `z-40` (above `MobileBottomNav` `z-30`, below modals `z-50`).
  - Reads `CURRENT_APP_VERSION = '7.4.0'` and fetches `/version.json`.

### Android Build Contract
- `capacitor.config.ts`:
  - `import type { CapacitorConfig } from '@capacitor/cli';`
  - `appId: 'com.pomofocus.workspace'`, `appName: 'PomoFocus'`, `webDir: 'dist'`.
- `scripts/buildApk.ts`:
  - Programmatically configures environment (`JAVA_HOME`, `ANDROID_HOME`), runs build and Gradle `assembleDebug`, and places APK at `public/downloads/PomoFocus-v7.4.apk`.
  - Generates `public/version.json`.

## Code Layout
- `src/index.css`
- `src/components/mobile/primitives/MobileStepperRow.tsx`
- `src/components/mobile/MobileAppShell.tsx`
- `src/components/MobileBottomNav.tsx`
- `src/components/mobile/views/MobileFocusView.tsx`
- `src/components/TasksWidget.tsx`
- `src/components/landing/WebDownloadHub.tsx`
- `src/hooks/useDeviceDetection.ts`
- `src/utils/qrCode.ts`
- `src/utils/versionCompare.ts`
- `src/components/LiquidUpdateBanner.tsx`
- `capacitor.config.ts`
- `scripts/buildApk.ts`
- `public/version.json`
- `public/downloads/PomoFocus-v7.4.apk`
