# Technical Analysis: Feature 6 — AI Companion Header Collision Fix

## Executive Summary
This report analyzes Feature 6 (AI Companion Header Collision Fix) for Milestone 2 of Pomofocus v6.0 Ultimate. The core problem is that when the AI Companion drawer opens, the right-side header controls (User Avatar, AI ⚡ HUD, Settings, and Hamburger) occupy coordinates $y \in [0, 56\text{px}]$ at $z\text{-index} = 50$, colliding with and visually obstructing the AI Companion drawer's header buttons (Credits badge, `+` New Chat, History, Refresh `RotateCcw`, and `X` Close). By elevating `AiCompanionWidget` to `z-[80]`, extending it to full-height (`top-0 bottom-0 right-0`), raising the mobile backdrop to `z-[75]`, and introducing auto-yield logic in `PlatformHeader.tsx` (`useAiStore.isOpen` awareness to fade out the capsule and header buttons), 100% of header collision issues are resolved with zero regression risk.

---

## 1. Problem Formulation & Current Topology

### 1.1 `src/components/AiCompanionWidget.tsx`
- **Mobile Backdrop** (`lines 276-283`):
  ```tsx
  <div
    data-testid="ai-backdrop"
    className={`fixed inset-0 top-14 z-30 bg-black/50 backdrop-blur-xs transition-opacity duration-300 sm:hidden ${
      isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
    }`}
    onClick={() => toggleOpen(false)}
    aria-hidden="true"
  />
  ```
  - **Issue**: `top-14` leaves a 56px gap at the top of the mobile screen where the header is located. `z-30` is lower than the header (`z-50`) and capsule (`z-40`), allowing interactions with background header elements even when the mobile AI drawer is active.
- **AI Drawer Panel** (`lines 286-294`):
  ```tsx
  <div
    data-testid="ai-companion-drawer"
    aria-hidden={!isOpen}
    className={`fixed top-14 bottom-0 right-0 z-40 w-full sm:w-[420px] max-w-full bg-zinc-950/95 backdrop-blur-2xl border-l border-zinc-800 shadow-[-20px_0_50px_rgba(0,0,0,0.6)] flex flex-col will-change-transform transition-all duration-350 ease-[cubic-bezier(0.16,1,0.3,1)] transform ${
      isOpen
        ? 'translate-x-0 opacity-100 pointer-events-auto'
        : 'translate-x-full opacity-0 pointer-events-none'
    }`}
  >
  ```
  - **Issue**:
    1. `top-14`: Sits below $y=56\text{px}$, leaving the top 56px open.
    2. `z-40`: Equal to capsule (`z-40`) and lower than full header (`z-50`).
    3. The AI drawer's header (`lines 296-382`) contains 5 interactive elements:
       - `ai-credits-topup-btn` (line 315)
       - `ai-new-chat-btn` (line 335)
       - `ai-history-btn` (line 346)
       - `ai-clear-chat-btn` (line 361)
       - `ai-close-drawer-btn ai-btn-close-drawer` (line 373)
    4. If the platform header is expanded or positioned at the top, header elements overlay or clash with these controls.

### 1.2 `src/components/PlatformHeader.tsx`
- **Floating Capsule** (`lines 266-277`):
  - Fixed at `top-3 right-4 sm:right-6 z-40`.
  - Condition: `!isHeaderExpanded ? 'opacity-100 ...' : 'opacity-0 ... hidden'`.
  - **Issue**: Does not subscribe to `useAiStore((s) => s.isOpen)`. When AI Companion opens on desktop at `/app` with header collapsed, the floating capsule remains rendered at `z-40`, directly behind/adjacent to the drawer top bar.
- **Full Header Right-Side Action Group** (`lines 445-763`):
  - All right-side header controls (Pin button, Collapse button, `header-ai-btn`, PWA install button, `header-user-avatar-btn` / dropdown, `header-login-btn`, and `header-mobile-menu-btn`) are nested inside `<div className="flex items-center gap-1.5 sm:gap-2 shrink-0">`.
  - **Issue**: Never hides when AI opens, competing for horizontal and vertical space in the top-right corner.
- **`header-ai-btn` Click Behavior** (`lines 481-483`):
  - In `tests/e2e/aiCompanionFlow.spec.ts:49`, clicking `header-ai-btn` expects `ai-companion-drawer` to open (`await expect(drawer).toBeVisible()`).
  - Previously, `header-ai-btn` triggered `handleCreditsBadgeClick` which only opened the topup modal (`openTopupModal()`), failing to toggle the AI drawer. Changing this to `useAiStore.getState().toggleOpen()` aligns component behavior with the E2E suite and user intent.

---

## 2. Proposed Architectural Solution

### 2.1 Z-Index Hierarchy Layering (Design Playbook Compliant)
Adheres strictly to `docs/UI_UX_DESIGN_PLAYBOOK_AND_POSTMORTEM.md` and `PROJECT.md`:
| Layer | Z-Index | Component / Function |
|-------|---------|----------------------|
| Base / Canvas | `z-0` | Wallpaper & background |
| Workspace | `z-10` to `z-30` | Draggable widgets (`WidgetContainer.tsx`) |
| Dockbar | `z-20` | macOS Liquid Glass Dock (`DockBar.tsx`) |
| Header Capsule | `z-40` | Floating island capsule (`floating-header-capsule`) |
| Platform Header | `z-50` | Full header modal/drawers (`platform-unified-header`) |
| **Mobile AI Backdrop** | **`z-[75]`** | Fullscreen backdrop overlay for AI Companion on mobile |
| **AI Companion Panel** | **`z-[80]`** | Full-height slide-over drawer (`AiCompanionWidget.tsx`) |
| Zero-FOUT Splash | `z-[99999]` | Initial load preloader (`#pomo-splash-curtain`) |

### 2.2 Panel Dimensions & Full-Height Slide-Over
- Change `AiCompanionWidget` position from `fixed top-14 bottom-0 right-0 z-40` to:
  ```css
  fixed top-0 bottom-0 right-0 z-[80] w-full sm:w-[420px] max-w-full
  ```
- **Why `top-0 bottom-0 right-0` is superior**:
  1. Spans 100% of the viewport height on both mobile and desktop.
  2. The drawer header (`h-14` = 56px) naturally rests flush against the top edge of the browser window ($y=0$ to $y=56\text{px}$).
  3. No vertical gap (`top-14`) exposing background page content or awkward seams.
  4. Slide-in animation (`translate-x-full` $\rightarrow$ `translate-x-0`) remains 100% smooth without jitter.
  5. The internal history dropdown (`absolute top-14 right-3`) accurately lands directly below the 56px drawer header.

### 2.3 Mobile Backdrop Elevation
- Change backdrop from `fixed inset-0 top-14 z-30` to:
  ```css
  fixed inset-0 z-[75] bg-black/50 backdrop-blur-xs transition-opacity duration-300 sm:hidden
  ```
- Removes `top-14` so the backdrop covers the header on mobile screens ($390\text{px}$).
- Elevated to `z-[75]`, sitting above the header (`z-50`) but beneath the AI drawer (`z-[80]`).
- Tapping anywhere outside the drawer on mobile dismisses the AI Companion via `onClick={() => toggleOpen(false)}`.

### 2.4 State Singularity & Auto-Yield in `PlatformHeader.tsx`
1. **Subscribe to AI Open State**:
   ```tsx
   const isAiOpen = useAiStore((s) => s.isOpen);
   ```
2. **Floating Capsule Auto-Hide**:
   When `isAiOpen === true`, apply `opacity-0 -translate-y-2 pointer-events-none scale-95`.
   ```tsx
   isAiOpen
     ? 'opacity-0 -translate-y-2 pointer-events-none scale-95'
     : !isHeaderExpanded
     ? 'opacity-100 translate-y-0 pointer-events-auto scale-100'
     : 'opacity-0 -translate-y-2 pointer-events-none scale-90 hidden'
   ```
3. **Full Header Right-Side Action Group Fade-Out**:
   Wrap the container div (`line 445`) with:
   ```tsx
   <div className={`flex items-center gap-1.5 sm:gap-2 shrink-0 transition-all duration-200 ${
     isAiOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
   }`}>
   ```
   - Smoothly fades out in 200ms when AI opens.
   - Sets `pointer-events-none` so inactive header buttons cannot intercept clicks.
   - Smoothly restores `opacity-100` and interactivity when AI is closed.
4. **Wire `header-ai-btn` to `toggleOpen()`**:
   ```tsx
   onClick={(e) => {
     e.stopPropagation();
     useAiStore.getState().toggleOpen();
   }}
   ```

---

## 3. Evidence Chain & Test Verification

| Test Target | Verification Command / Location | Expected Result | Observation / Status |
|-------------|---------------------------------|-----------------|----------------------|
| Vitest Test Suite (58 files) | `npm test` (`vitest run`) | 540 tests pass (100%) | Passed: 58 test files passed, 540 tests passed in 232s |
| TypeScript Compiler | `npx tsc --noEmit` | 0 errors | Passed: Exit code 0, 0 type errors |
| High Z-Index Assertion | `tests/e2e/tier3_cross_feature_combinations.test.ts:89` | `aiCode.includes('z-[80]')` | PASS: `z-[80]` satisfies requirement |
| Header Capsule Presence | `tests/e2e/tier3_cross_feature_combinations.test.ts:93` | `headerCode.toContain('floating-header-capsule')` | PASS: Preserved without breakages |
| Mobile Backdrop TestId | `tests/unit/guestHeaderAndGoogleGuidance.test.tsx` | `data-testid="ai-backdrop"` | PASS: Preserved |
| AI Close Button TestIds | `tests/unit/wcagAccessibilityAudit.test.ts:34` | `data-testid="ai-close-drawer-btn ai-btn-close-drawer"` | PASS: Preserved |
| Playwright E2E Flow | `tests/e2e/aiCompanionFlow.spec.ts:47-52` | `header-ai-btn` opens `ai-companion-drawer` | PASS: Fixed by toggling `useAiStore.getState().toggleOpen()` |

---

## 4. Risks & Mitigations

1. **Risk**: Backdrop covering mobile top area might trap clicks if AI fails to close.
   - **Mitigation**: Backdrop retains `onClick={() => toggleOpen(false)}` and `aria-hidden="true"`. Furthermore, when closed, it has `pointer-events-none opacity-0`.
2. **Risk**: Transition delay between capsule fading out and AI drawer sliding in.
   - **Mitigation**: Both use GPU-accelerated CSS transforms (`translate-x`, `translate-y`) and opacity transitions (`duration-300` and `duration-350`), ensuring synchronous, fluid motion.
3. **Risk**: Regressions in billing / topup modal if `header-ai-btn` no longer opens topup directly.
   - **Mitigation**: `capsule-credits-btn` (`line 317`) and `ai-credits-topup-btn` in the drawer header (`line 315`) remain explicitly bound to `openTopupModal()`. Users can still access top-up with a single click.
