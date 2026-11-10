# Project: Pomofocus v7.0 Native Android — Liquid Zen Architecture

## Architecture
- **Framework & Core**: React 18, Vite 5, TypeScript 5, Tailwind CSS.
- **Window Paradigm Obliteration on Mobile**: Complete elimination of `WidgetContainer`, minimize (`—`) / close (`✕`) buttons, and stacked centered modals on mobile viewports. Direct access to Focus Canvas upon launch.
- **Desktop Preservation (Karpathy Invariant)**: In `src/App.tsx`, `!isMobile` branch strictly preserves the existing desktop workspace (`WidgetContainer`, `DockBar`, macOS Liquid Glass) byte-for-byte with 0 regressions.
- **Liquid Zen Architecture (`src/components/mobile/`)**:
  - Theme: Deep OLED Charcoal `#09090b`, top refraction border `border-t border-white/20 border-x border-white/10 border-b border-white/5`.
  - Palette: Zen Emerald gradient `from-emerald-500 via-teal-400 to-cyan-400` for active states and Breathing Aura.
  - Monumental Timer: `font-tabular-nums text-6xl md:text-7xl font-bold tracking-tighter text-white drop-shadow-[0_4px_30px_rgba(52,211,153,0.25)]`.
  - Ergonomic Primitives:
    - `MobileStepperRow.tsx`: 3 independent 56px rows, flex-locked 48x48dp touch targets complying with Fitts's Law, lower/upper clamps (1-120m, 1-60m).
    - `MobileLiquidSwitch.tsx`: Apple-standard fluid switch with emerald glow and accessible `role="switch"`.
- **App Shell & Mobile System Navigation**:
  - `MobileAppShell.tsx`: 100dvh viewport, safe area insets, 56px header (logo, 3-state timer indicator dot, ⚡ balance capsule).
  - Material 3 Bottom Nav: 5 tabs (`focus`, `tasks`, `spaces`, `ai`, `settings`) with safe-area bottom clearance.
  - Predictive Back Gesture: Browser/Capacitor `popstate` interceptor returning to `focus` tab before app exit.
  - Native Mobile APIs: Screen Wake Lock API during running timer, Document Picture-in-Picture API / Mini floating clock.
- **Performance & Timing**:
  - 120Hz smooth rendering with GPU promotion `transform: translateZ(0)`.
  - Anchor Timestamp Engine (`targetEndTimeMs = Date.now() + remainingMs`) immune to timer drift.
- **Backend & Cloud Persistence**:
  - Supabase v5.0 Cloud-First sync (Auth, Profiles, Wallets ⚡, Tasks, Notes, AI Chats).
  - Dexie local DB fallback and offline resilience.

## Feature Inventory
Every feature identified during the Survey Phase is cataloged below and assigned to a milestone.

| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Responsive Mobile Detection | `src/hooks/useMediaQuery.ts` detecting `(max-width: 768px)` or mobile user agent | M1 | ORIGINAL_REQUEST §2 |
| 2 | Mobile Stepper Row Primitive | `src/components/mobile/primitives/MobileStepperRow.tsx` (56px high, 48x48dp flex-locked buttons, boundaries 1-120 / 1-60) | M1 | ORIGINAL_REQUEST §1, §3A |
| 3 | Mobile Liquid Switch Primitive | `src/components/mobile/primitives/MobileLiquidSwitch.tsx` (Apple fluid emerald switch, role="switch") | M1 | ORIGINAL_REQUEST §1, §3B |
| 4 | Mobile Focus View | `src/components/mobile/views/MobileFocusView.tsx` (Monumental 7xl timer, breathing aura, 0-modal direct entry) | M2 | ORIGINAL_REQUEST §1, §3D |
| 5 | Mobile Settings View | `src/components/mobile/views/MobileSettingsView.tsx` (3 Stepper rows, Liquid Switch auto-transition, volume/sound, status) | M2 | ORIGINAL_REQUEST §1, §3E |
| 6 | Mobile App Shell & Top Header | `src/components/mobile/MobileAppShell.tsx` (100dvh, 56px header with logo, 3-state dot, ⚡ balance pill) | M3 | ORIGINAL_REQUEST §3C |
| 7 | Material 3 Bottom Navigation Bar | 5 tabs (`focus`, `tasks`, `spaces`, `ai`, `settings`) with safe area insets | M3 | ORIGINAL_REQUEST §3C |
| 8 | Predictive Back Gesture | Intercept `popstate` / back navigation to route to 'focus' tab before app exit | M3 | ORIGINAL_REQUEST §3C |
| 9 | Screen Wake Lock & Document PiP | Screen wake lock during active countdown and Picture-in-Picture floating clock | M3 | ORIGINAL_REQUEST §3C |
| 10 | Karpathy Desktop Preservation Guard | `src/App.tsx` routing: `!isMobile` renders 100% desktop intact, `isMobile` renders `<MobileAppShell />` | M3 | ORIGINAL_REQUEST §2 |
| 11 | Anchor Timestamp & 120Hz GPU Promotion | Zero timer drift and GPU layer promotion `transform: translateZ(0)` | M3 | ORIGINAL_REQUEST §4 |
| 12 | Opaque-Box E2E Testing Suite | Requirements-driven test suite (Tiers 1-4) published in `TEST_READY.md` | E2E Track | ORIGINAL_REQUEST §5 |
| 13 | Final Integration & Adversarial Hardening | 100% pass across all test tiers, 0 type errors (`tsc --noEmit`), Tier 5 coverage audit, Vercel build verification | M4 | ORIGINAL_REQUEST §5 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Mobile Liquid Zen Primitives & Hook | Features 1, 2, 3 (`useMediaQuery.ts`, `MobileStepperRow.tsx`, `MobileLiquidSwitch.tsx`, unit tests) | none | DONE |
| M2 | Mobile Views (Focus & Settings) | Features 4, 5 (`MobileFocusView.tsx`, `MobileSettingsView.tsx`, unit tests) | M1 | DONE |
| M3 | Mobile App Shell & Root Routing Guard | Features 6, 7, 8, 9, 10, 11 (`MobileAppShell.tsx`, `App.tsx` integration) | M1, M2 | DONE |
| M4 | Final Milestone: Integration & Hardening | Feature 13 (Pass 100% E2E tests, Tier 5 hardening, Vercel build verification) | M1, M2, M3, E2E | DONE |

## Interface Contracts
### Primitives Contract
- `src/hooks/useMediaQuery.ts`:
  - `export function useMediaQuery(query: string): boolean`
- `src/components/mobile/primitives/MobileStepperRow.tsx`:
  - `interface MobileStepperRowProps { label: string; value: number; min: number; max: number; step?: number; unit?: string; icon?: React.ReactNode; disabled?: boolean; testId?: string; onChange: (val: number) => void; }`
  - Fixed 56px row (`h-14`), flex-locked buttons, touch target minimum 48x48dp.
- `src/components/mobile/primitives/MobileLiquidSwitch.tsx`:
  - `interface MobileLiquidSwitchProps { checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean; id?: string; ariaLabel?: string; testId?: string; }`
  - Apple-standard fluid switch (`w-12 h-7`), emerald active gradient, accessible `role="switch"`.

### Views Contract
- `src/components/mobile/views/MobileFocusView.tsx`:
  - Standalone view rendering monumental timer (`font-tabular-nums text-6xl md:text-7xl`), radial breathing aura during running state (`from-emerald-500 via-teal-400 to-cyan-400`), phase selector pill (`pomodoro`, `short_break`, `long_break`), 64x64px primary action button (`w-16 h-16`), reset/skip secondary actions, linked task chip. Directly binds to `useTimerStore`.
- `src/components/mobile/views/MobileSettingsView.tsx`:
  - Dedicated mobile settings view rendering 3 independent `MobileStepperRow` items (Focus, Short Break, Long Break), `MobileLiquidSwitch` (Auto-transition), volume slider, sound selector, user status card (`useAuthStore`).

### Shell & Routing Contract
- `src/components/mobile/MobileAppShell.tsx`:
  - 100dvh root viewport, safe area insets.
  - Header (56px): PomoFocus logo + "Liquid Zen" badge, 3-state timer status dot, ⚡ balance capsule (`useAiStore`).
  - Bottom Navigation Bar (64px + safe-area): 5 tabs (`focus`, `tasks`, `spaces`, `ai`, `settings`).
  - Screen Wake Lock API: acquires lock when `status === 'running'`, releases on pause/idle.
  - Document Picture-in-Picture API / Mini floating clock.
  - Predictive Back Gesture: hooks `window.addEventListener('popstate')` to route to `'focus'` tab before app exit.
- `src/App.tsx`:
  - `const isMobile = useMediaQuery('(max-width: 768px)') || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);`
  - When `currentPath === '/app'`:
    - `if (isMobile)` -> render `<MobileAppShell />`
    - `if (!isMobile)` -> render 100% existing desktop layout (`WidgetContainer`, `DockBar`, `AiCompanionWidget`) completely unmodified.

## Code Layout
- `src/hooks/useMediaQuery.ts`
- `src/components/mobile/primitives/MobileStepperRow.tsx`
- `src/components/mobile/primitives/MobileLiquidSwitch.tsx`
- `src/components/mobile/views/MobileFocusView.tsx`
- `src/components/mobile/views/MobileSettingsView.tsx`
- `src/components/mobile/MobileAppShell.tsx`
- `tests/unit/mobilePrimitivesV70.test.tsx`
- `tests/unit/mobileViewsV70.test.tsx`
- `tests/unit/mobileLiquidZenTiers1to4.test.tsx`
- `tests/unit/mobileAppShellAndRoutingV70.test.tsx`
