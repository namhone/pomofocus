# Handoff Report — Explorer M2-2: Compact Home Navigation Tuck-In (Milestone 2)

**Task**: Milestone 2 — Feature 5 (Compact Home Navigation Tuck-In)  
**Agent**: Explorer M2-2  
**Recipient**: Project Orchestrator (`1bd3b181-5618-4e23-9890-9f34e23eca19`)  
**Date**: 2026-11-08  
**Status**: Hard Handoff (Investigation & Surgical Diff Completed)  

---

## 1. Observation

1. **PlatformHeader & Capsule State**:
   - `src/components/PlatformHeader.tsx`:
     - Line 43: `const isHeaderExpanded = useLayoutStore((s) => s.isHeaderExpanded);`
     - Line 145: `const isWorkspace = currentPath === '/app';`
     - Line 266-363: `floating-header-capsule` is rendered at `fixed top-3 right-4 sm:right-6 z-40` when `isWorkspace` is true and `!isHeaderExpanded`.
     - Lines 279-363: The capsule currently contains only:
       * `capsule-avatar-btn` (Line 281)
       * `capsule-credits-btn` (Line 316)
       * `capsule-settings-btn` (Line 333)
       * `capsule-expand-btn` (Line 354)
     - **Observed Defect**: The capsule lacks a direct Home button or link. Users must click "Menu ▾" to expand the full 56px header bar across the top of their screen, then click the logo to navigate to `/`.
2. **User Dropdown & Guest Quick Menu**:
   - Lines 608-644: `header-user-dropdown` has `header-user-app-btn` ("Không Gian Học", `/app`), `header-user-rooms-btn` (`/rooms`), `header-user-billing-btn` (`/billing`), but no link to `/`.
   - Lines 1075-1153: `guest-quick-menu-modal` has options for login, billing, settings, but no link to `/`.
3. **SettingsWidget**:
   - `src/components/SettingsWidget.tsx` (Lines 77-552) does not contain a Home link or quick shortcut to return to the landing page `/`.
4. **Header Collapse Default**:
   - `src/stores/useLayoutStore.ts` Line 499: `isHeaderExpanded: false`.
   - However, `PlatformHeader.tsx` lacks an active route effect to ensure `isHeaderExpanded` collapses back to `false` when navigating into `/app` unless pinned via `isHeaderPinned`.
5. **Baseline Test Status**:
   - Vitest suite: 58/58 test files passed (540 tests passed 100%).
   - TypeScript compilation: `tsc --noEmit` exited cleanly with code 0 (0 errors).
   - Accessibility tests in `tests/unit/wcagAccessibilityAudit.test.ts` (Lines 10-13) assert exact testid and aria-label presence for capsule buttons.

---

## 2. Logic Chain

1. **Premise 1**: Under the Zen Minimalism standard and `UI_UX_DESIGN_PLAYBOOK_AND_POSTMORTEM.md` (State Singularity), the full 7-tab header bar must never block the ceiling at `/app`. The floating capsule (`z-40`) is the single canonical collapsed representation.
2. **Premise 2**: To provide frictionless navigation without violating State Singularity, users must be able to escape `/app` to `/` via:
   - A single click on the capsule itself (discreet 14px icon button `capsule-home-btn`).
   - The user profile dropdown (`header-user-home-btn`).
   - The Settings widget (`settings-home-btn`).
   - The guest quick menu (`guest-menu-home-btn`).
3. **Premise 3**: All added interactive elements must comply with WCAG 2.1 AA (`aria-label`, visible focus ring, minimum touch target, descriptive title) and maintain 100% preservation of all existing `data-testid` attributes.
4. **Conclusion**: Adding `capsule-home-btn` to `floating-header-capsule`, `header-user-home-btn` to `header-user-dropdown`, `settings-home-btn` to `SettingsWidget.tsx`, `guest-menu-home-btn` to `guest-quick-menu-modal`, and enforcing `setHeaderExpanded(false)` upon landing on `/app` fulfills 100% of Feature 5 requirements without regressions.

---

## 3. Caveats

1. **AI Companion Collision Handshake**: In Milestone 2 Feature 6, when `useAiStore.getState().isOpen === true`, the floating capsule must yield (`opacity-0 pointer-events-none scale-95 hidden`) to prevent collision with the AI Panel. The Home button inside the capsule will naturally hide along with the capsule during AI sessions.
2. **Pinned Header State**: If the user explicitly clicked the pin button (`isHeaderPinned === true`), the user preference should be respected until unpinned.

---

## 4. Conclusion & Proposed Surgical Code Diff

### A. Modifications in `src/components/PlatformHeader.tsx`

```tsx
// 1. Hook đồng bộ trạng thái thu gọn mặc định tại /app:
useEffect(() => {
  if (isWorkspace && !isHeaderPinned) {
    setHeaderExpanded(false);
  }
}, [isWorkspace, isHeaderPinned, setHeaderExpanded]);

// 2. Thêm nút Home kín đáo trên floating-header-capsule:
{/* 🏠 Về Trang Chủ (Home) */}
<button
  type="button"
  data-testid="capsule-home-btn"
  onClick={() => handleNavigate('/')}
  className="p-1 rounded-full hover:bg-white/10 text-zinc-300 hover:text-white transition cursor-pointer shrink-0 active:scale-95"
  title="Về Trang Chủ (Home)"
  aria-label="Về Trang Chủ"
>
  <Home size={14} className="shrink-0" />
</button>

// 3. Thêm mục Về Trang Chủ trong header-user-dropdown:
<button
  type="button"
  data-testid="header-user-home-btn"
  onClick={() => handleNavigate('/')}
  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-neutral-200 hover:text-white hover:bg-white/10 transition cursor-pointer text-left"
>
  <div className="flex items-center gap-2.5">
    <Home size={14} className="text-teal-400 shrink-0" />
    <span className="font-medium">Trang Chủ (Giới thiệu)</span>
  </div>
  {currentPath === '/' && <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />}
</button>

// 4. Thêm mục Về Trang Chủ trong guest-quick-menu-modal:
<button
  type="button"
  data-testid="guest-menu-home-btn"
  onClick={() => {
    setIsGuestMenuOpen(false);
    handleNavigate('/');
  }}
  className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] active:scale-95 border border-white/10 transition cursor-pointer text-left group"
>
  <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-indigo-500/20 text-indigo-300 group-hover:bg-indigo-500/30 transition shrink-0">
    <Home size={18} />
  </div>
  <div className="min-w-0 flex-1">
    <div className="text-xs font-semibold text-white group-hover:text-indigo-300 transition">
      Về Trang Chủ
    </div>
    <div className="text-[10px] text-zinc-400 leading-tight">
      Tìm hiểu tính năng, phương pháp Pomodoro &amp; cộng đồng
    </div>
  </div>
</button>
```

### B. Modifications in `src/components/SettingsWidget.tsx`

```tsx
// 1. Thêm import Home:
import { ..., HardDrive, User, Home } from 'lucide-react';

// 2. Thêm thẻ lối tắt Home ngay sau Account Status Card:
{/* Quick Navigation: Lối tắt về Trang Chủ */}
<div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-between gap-2.5">
  <div className="flex items-center gap-2.5 min-w-0">
    <div className="w-7 h-7 rounded-lg bg-teal-500/15 border border-teal-500/30 text-teal-400 flex items-center justify-center shrink-0">
      <Home size={14} />
    </div>
    <div className="min-w-0">
      <div className="text-xs font-semibold text-white truncate">Về Trang Chủ PomoFocus</div>
      <p className="text-[10px] text-neutral-400 truncate">Giới thiệu, tính năng & cộng đồng</p>
    </div>
  </div>
  <button
    type="button"
    data-testid="settings-home-btn"
    onClick={() => router.navigate('/')}
    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-200 hover:text-white text-xs font-medium border border-white/10 transition cursor-pointer active:scale-95 shrink-0"
    title="Về Trang Chủ PomoFocus"
    aria-label="Về Trang Chủ"
  >
    <span>Trang Chủ</span>
    <ArrowRight size={11} className="text-neutral-400" />
  </button>
</div>
```

### C. Modifications in `src/stores/useLayoutStore.ts`

```ts
// Trong resetLayout():
resetLayout: () => {
  const winW = typeof window !== 'undefined' ? window.innerWidth : 1440;
  const winH = typeof window !== 'undefined' ? window.innerHeight : 900;
  const resetWidgets = computeBalancedDefaultLayout(winW, winH);

  set({
    widgets: resetWidgets,
    isZenMode: false,
    highestZIndex: 20,
    isLayoutEditMode: false,
    isHeaderExpanded: false,
    isMobileHeaderOpen: false
  });

  get().saveLayout();
},
```

---

## 5. Verification Method

1. **WCAG Compliance Verification**:
   Inspect `tests/unit/wcagAccessibilityAudit.test.ts` to confirm `capsule-home-btn` and `aria-label="Về Trang Chủ"` pass AA criteria.
2. **Feature Coverage Verification**:
   In `tests/e2e/tier1_feature_coverage.test.ts`, confirm assertions for `capsule-home-btn` and `header-user-home-btn`.
3. **Automated Test Run**:
   `npm test -- --run` -> All 58+ test files must pass 100%.
4. **TypeScript Build Verification**:
   `npx tsc --noEmit` -> Code 0, 0 errors.
