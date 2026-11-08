# Project: Pomofocus v6.0 Ultimate (Liquid Glass & Zen Minimalism)

## Architecture
- **Framework & Core**: React 18, TypeScript 5, Vite 5, Tailwind CSS 3.
- **State Management**: Zustand stores (`useLayoutStore.ts`, `useAudioStore.ts`, `useAiStore.ts`, `useTaskStore.ts`).
- **UI System**: Apple Liquid Glass (`backdrop-filter: blur(20px) saturate(150%)`, specular highlight `::before`, deep translucent base `rgba(30, 30, 35, 0.75)`).
- **Z-Index Layer Hierarchy (Playbook compliant)**:
  - `z-10`: Workspace container & draggable widgets (`WidgetContainer.tsx`).
  - `z-20`: Floating Dockbar (`DockBar.tsx` / `FloatingDock.tsx`).
  - `z-40`: Floating header capsule (`floating-header-capsule`).
  - `z-50`: Full platform header modal/drawers.
  - `z-[75]`: Mobile AI backdrop.
  - `z-[80]`: AI Companion Panel (`AiCompanionWidget.tsx`).
  - `z-[99999]`: Zero-FOUT Splash Curtain (`#pomo-splash-curtain`).
- **State Singularity**:
  - `PlatformHeader`: Never render capsule and full header simultaneously. When `isAiOpen === true`, capsule auto-hides and full header button group fades out (`opacity-0 pointer-events-none`).

## Feature Inventory
Every feature identified during the Survey Phase is cataloged below and assigned to a specific milestone.

| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Zero-FOUT Dark Mode Lock | Lock dark background on `<html>` and `<body>` tags in `index.html` (`#09090b !important`). | M1 | Survey Explorer 1 / Section 1 |
| 2 | Splash Curtain Preloader | Zero-dependency inline CSS preloader (`#pomo-splash-curtain`) with emerald spinner and 100ms fade-out. | M1 | Survey Explorer 1 / Section 1 |
| 3 | Optional Font Display | Change font CSS from `font-display: swap` to `font-display: optional` to eliminate font jitter. | M1 | Survey Explorer 1 / Section 1 |
| 4 | Top Workspace Clearance ($y=8\text{px}$) | Remove $y \ge 68\text{px}$ drag bound; set $y=8\text{px}$ (`top-2`) limit in `WidgetContainer.tsx`, `useLayoutStore.ts`, and `App.tsx` (`pt-2`). | M2 | Survey Explorer 2 / Section 3 |
| 5 | Compact Home Navigation Tuck-In | Add discreet Home icon to `floating-header-capsule`, `SettingsWidget.tsx`, and user menu; keep header collapsed at `/app`. | M2 | Survey Explorer 2 / Section 3 |
| 6 | AI Companion Header Collision Fix | Elevate AI panel to `z-[80]`, full height `top-0`, connect `isAiOpen` into `PlatformHeader.tsx` to yield right-side buttons. | M2 | Survey Explorer 1 / Section 2 |
| 7 | macOS Liquid Glass Dock Material | Apple Liquid Glass styling with specular reflection highlight `.dock::before` and deep glass background. | M3 | Survey Explorer 2 / Section 4 |
| 8 | Pure CSS Dock Magnification Physics | Hover scale 1.75x, adjacent 1 scale 1.42x, adjacent 2 scale 1.04x, press lift `translateY(-8px)` without styled-components. | M3 | Survey Explorer 2 / Section 4 |
| 9 | Glass Dock Tooltips | Translucent glass tooltip 14px above dock with `backdrop-filter: blur(18px)`. | M3 | Survey Explorer 2 / Section 4 |
| 10 | Active Widget Indicator Dot | White pearl 3px glowing dot (`.dock__dot`) under dock icons for active desktop widgets. | M3 | Survey Explorer 2 / Section 4 |
| 11 | Dock Data-TestID Preservation | Maintain 100% of existing `data-testid` attributes across all dock buttons for test continuity. | M3 | Survey Explorer 2 / Section 4 |
| 12 | Pomodoro Timer Dimension Guardrail | Constrain Timer bounds: Min `300 x 220px` — Max `440 x 340px`, centered timer digits. | M4 | Survey Explorer 3 / Section 5 |
| 13 | Task List Dimension Guardrail | Constrain Tasks bounds: Min `320 x 280px` — Max `500 x 650px`, internal smooth scroll. | M4 | Survey Explorer 3 / Section 5 |
| 14 | Quick Notes Dimension Guardrail | Constrain Notes bounds: Min `280 x 240px` — Max `680 x 720px`, flexible textarea expansion. | M4 | Survey Explorer 3 / Section 5 |
| 15 | Media Player Dimension Guardrail & 16:9 | Constrain Media bounds: Min `280 x 140px` — Max `420 x 260px`, strict 16:9 aspect ratio locking. | M4 | Survey Explorer 3 / Section 5 |
| 16 | AI Companion Dimension Guardrail | Constrain AI panel bounds: Min `340px` — Max `460px`, height `h-[calc(100vh-24px)]`. | M4 | Survey Explorer 3 / Section 5 |
| 17 | 3-State Micro Dots | Replace rough badges with micro dots: `bg-emerald-400` (live), `bg-amber-400` (paused/pending), `bg-zinc-500` (idle/off). | M4 | Survey Explorer 3 / Section 6 |
| 18 | Monochromatic Zen Typography | High contrast white text (`text-white`), font weight (`font-semibold`), clean breathing room. | M4 | Survey Explorer 3 / Section 6 |
| 19 | Audio & Sound Cleanup | Permanently remove rooster "Gà gáy" sound; remove cheesy descriptions in sound lists. | M4 | Survey Explorer 3 / Section 6 |
| 20 | Ad & Upsell Banner Removal | Remove all ad/upsell banners in wallpaper selector (`SpacesWidget.tsx`) and sound selector (`AudioWidget.tsx`). | M4 | Survey Explorer 3 / Section 6 |
| 21 | Task Input Placeholder Fix | Change truncated task placeholder to `"Thêm nhiệm vụ mới... (Enter)"`. | M4 | Survey Explorer 3 / Section 6 |
| 22 | Cascade Widget Positioning (24px) | Stagger newly opened widgets from Dock by 24px offset when no custom coordinates exist. | M4 | Survey Explorer 3 / Section 6 |
| 23 | Unit & Regression Test Alignment | Update `tests/unit/layoutAndZen.test.ts` tasks height expectation to 650px (guardrail compliance). | M4 | Survey Explorer 3 / Section 7 |
| 24 | E2E Testing Suite (Tiers 1-4) | Comprehensive opaque-box test suite verifying all features across Tiers 1-4. | M5 | Section 7 / E2E Track |
| 25 | Adversarial Coverage Hardening (Tier 5) | White-box adversarial testing with Challenger coverage audit. | M5 | Section 7 / E2E Track |
| 26 | Production Build & Typecheck Verification | Verify `npm test` 100% pass, `tsc --noEmit` 0 errors, `vite build` 0 errors. | M5 | Section 7 |
| 27 | Git Synchronization & Vercel Production | Commit with conventional message, push to both `master` and `main`, verify `pomofocus-workspace.vercel.app`. | M5 | Section 7 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Zero-FOUT & Typography Foundation | Features 1, 2, 3 (`index.html`, splash curtain, font loading) | none | DONE |
| M2 | Workspace Top Clearance ($y=8\text{px}$) & AI Collision Resolution | Features 4, 5, 6 (`WidgetContainer.tsx`, `useLayoutStore.ts`, `PlatformHeader.tsx`, `AiCompanionWidget.tsx`) | M1 | DONE |
| M3 | macOS Liquid Dock Magnification & Tooltips | Features 7, 8, 9, 10, 11 (`DockBar.tsx` / `FloatingDock.tsx`, `liquidDock.css`, testids) | M1 | DONE |
| M4 | Dimension Guardrails, Zen Cleanup & Cascade Logic | Features 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23 (Widgets, Audio, Spaces, Tasks, test adjustment) | M2, M3 | DONE |
| M5 | Final Milestone: E2E Verification, Adversarial Hardening & Production Deploy | Features 24, 25, 26, 27 (100% E2E tests, Tier 5 hardening, build, git push master/main, Vercel alias) | M1, M2, M3, M4 | DONE |

## Interface Contracts

### 1. Zero-FOUT Splash Curtain Contract
- Target: `index.html`
- Curtain Element ID: `#pomo-splash-curtain`
- Class on dismiss: `.loaded` (`opacity: 0`, `visibility: hidden`)
- Event: `window.addEventListener('DOMContentLoaded', () => setTimeout(() => curtain.classList.add('loaded'), 100))`
- CSS Invariants: Inline `<style>` in `<head>`, dark background `#09090b !important` on `<html>` and `<body>`.

### 2. Workspace Drag & Layout Contract (`useLayoutStore` ↔ `WidgetContainer`)
- Minimum Y coordinate: `8` (replaces hardcoded `68`).
- Header desktop padding: `pt-2` (replaces `pt-14` in `App.tsx:355`).
- Dimension limits by widget type:
  - `timer`: `minW: 300, maxW: 440, minH: 220, maxH: 340`
  - `tasks`: `minW: 320, maxW: 500, minH: 280, maxH: 650`
  - `notes`: `minW: 280, maxW: 680, minH: 240, maxH: 720`
  - `media`: `minW: 280, maxW: 420, minH: 140, maxH: 260, aspect: 16/9`
  - `ai`: `minW: 340, maxW: 460, height: calc(100vh - 24px)`

### 3. AI Companion ↔ Platform Header Contract (`useAiStore` ↔ `PlatformHeader`)
- Panel Z-Index: `z-[80]`
- Panel Position: `top-0` (or `top-3 right-3 sm:right-4`) full height.
- Header button behavior: When `useAiStore.getState().isOpen === true`:
  - `floating-header-capsule`: Hidden (`opacity-0 pointer-events-none scale-95`).
  - `platform-unified-header` right-side group: Hidden/pushed back (`opacity-0 pointer-events-none`).
- Mobile backdrop Z-Index: `z-[75]`.

### 4. macOS Dock Physics & Styling Contract (`FloatingDock` / `DockBar`)
- Container: Single flat row of items (no nested div clusters breaking CSS sibling combinators).
- Hover & Sibling scaling:
  - Target: `scale(1.75)`
  - Sibling $\pm 1$: `scale(1.42)`
  - Sibling $\pm 2$: `scale(1.04)`
  - Active Press: `translateY(-8px)`
- Material: `-webkit-backdrop-filter: blur(20px) saturate(150%)`, `background: rgba(30, 30, 35, 0.75)`, specular border `.dock::before`.
- Glass Tooltip: Fixed 14px above item, `backdrop-filter: blur(18px)`, `opacity: 1` on hover.
- Indicator Dot: `.dock__dot` glowing 3px white pearl, displayed when widget is open.
- Test Attributes: All 18 `data-testid` attributes strictly preserved.

### 5. Zen Micro-Indicator Contract
- Status dots:
  - Live / Active: `bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]`
  - Paused / Pending: `bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]`
  - Idle / Offline: `bg-zinc-500`

## Code Layout
- `index.html` — HTML shell, FOUT preloader, dark lock.
- `src/index.css` & `src/styles/liquidDock.css` — Liquid Glass styles & Dock animations.
- `src/components/PlatformHeader.tsx` — Header, capsule, Home nav, AI awareness.
- `src/components/AiCompanionWidget.tsx` — AI Companion panel & z-index.
- `src/components/WidgetContainer.tsx` — Draggable widget wrapper & resize limits.
- `src/stores/useLayoutStore.ts` — Widget dimensions, bounds, and cascade logic.
- `src/components/DockBar.tsx` / `src/components/FloatingDock.tsx` — macOS Liquid Dock.
- `src/components/AudioWidget.tsx` & `src/services/chimeSynthesizer.ts` — Sound cleanup.
- `src/components/SpacesWidget.tsx` — Wallpaper selector ad removal.
- `src/components/TasksWidget.tsx` — Task input placeholder fix.
- `tests/unit/layoutAndZen.test.ts` — Updated test assertions.
- `tests/e2e/` — Opaque-box E2E test suites (Tiers 1-4).
