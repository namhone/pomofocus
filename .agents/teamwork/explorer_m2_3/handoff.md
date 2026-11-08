# Handoff Report — Explorer M2-3: AI Companion Header Collision Resolution

**Task**: Milestone 2 — Feature 6: AI Companion Header Collision Fix (`AiCompanionWidget.tsx` & `PlatformHeader.tsx`)  
**Working Directory**: `.agents/teamwork/explorer_m2_3/`  
**Patch Artifact**: `.agents/teamwork/explorer_m2_3/feature6_ai_header_collision.patch`  
**Analysis Artifact**: `.agents/teamwork/explorer_m2_3/analysis.md`

---

## 1. Observation

1. **`src/components/AiCompanionWidget.tsx`**:
   - Line 276-283: Mobile backdrop has `fixed inset-0 top-14 z-30 bg-black/50 backdrop-blur-xs ...`.
     `top-14` leaves a 56px unmasked gap at the top of the mobile viewport, and `z-30` is below the header (`z-50`).
   - Line 286-294: The drawer container has `fixed top-14 bottom-0 right-0 z-40 w-full sm:w-[420px] max-w-full ...`.
     `top-14` restricts the panel below $y=56\text{px}$, and `z-40` is equal to the capsule (`z-40`) and below the platform header (`z-50`).
   - Line 296-382: The drawer's top header (`h-14`) contains 5 interactive elements:
     - `ai-credits-topup-btn` (Zap badge, line 315)
     - `ai-new-chat-btn` (Plus button, line 335)
     - `ai-history-btn` (History button, line 346)
     - `ai-clear-chat-btn` (RotateCcw button, line 361)
     - `ai-close-drawer-btn ai-btn-close-drawer` (X close button, line 373)
   - Line 388: `ai-history-dropdown` has `absolute top-14 right-3 w-72 ...`. Inside the drawer, `top-14` places it directly under the 56px drawer header.

2. **`src/components/PlatformHeader.tsx`**:
   - Line 42: `PlatformHeader` imports `useAiStore` but only subscribes to `aiCreditsBalance`. It does NOT subscribe to `isOpen` (`const isAiOpen = useAiStore((s) => s.isOpen)` is missing).
   - Line 266-277: `floating-header-capsule` has:
     ```tsx
     !isHeaderExpanded
       ? 'opacity-100 translate-y-0 pointer-events-auto scale-100'
       : 'opacity-0 -translate-y-2 pointer-events-none scale-90 hidden'
     ```
     When `isOpen === true`, the capsule remains visible and interactive at `top-3 right-4 sm:right-6 z-40`, causing a visual collision with the drawer top bar.
   - Line 445: The right-side header button group is rendered in a bare `<div>`:
     ```tsx
     <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
     ```
     Containing `header-pin-btn`, `header-collapse-btn`, `header-ai-btn`, `pwa-install-btn`, `header-enter-workspace-btn`, user avatar dropdown, and mobile menu toggle. It never yields when the AI drawer is open.
   - Line 482: `header-ai-btn` has `onClick={handleCreditsBadgeClick}`, which calls `useAiStore.getState().openTopupModal()` instead of opening the drawer.

3. **Test Suite Baseline**:
   - Command: `npm test` (`vitest run`)
   - Direct Observation: `Test Files: 58 passed (58), Tests: 540 passed (540)` in 232.11s.
   - `tests/e2e/tier3_cross_feature_combinations.test.ts:89`: Explicitly validates `const hasAiHighZ = aiCode.includes('z-[80]') || aiCode.includes('z-50') || aiCode.includes('z-40'); expect(hasAiHighZ).toBe(true);`.
   - `tests/e2e/aiCompanionFlow.spec.ts:49`: Tests `await headerAiBtn.click(); await expect(drawer).toBeVisible();`.
   - Command: `npx tsc --noEmit`
   - Direct Observation: Exited with code 0, 0 type errors.

---

## 2. Logic Chain

1. **Collision Root Cause (Observation 1 & 2)**:
   - When the drawer opens at `z-40`, the expanded header at `z-50` physically covers the drawer header.
   - Even when the header is collapsed at `/app`, the floating capsule sits at `top-3 right-4` (`z-40`), right where the AI drawer header (`y \in [0, 56\text{px}]`) slides in.
2. **Z-Index Layer Elevation (Observation 1 & 3)**:
   - Raising `AiCompanionWidget` to `z-[80]` elevates it above both the workspace (`z-10`), capsule (`z-40`), and platform header (`z-50`), satisfying the `PROJECT.md` layer hierarchy contract.
   - Raising the mobile backdrop to `z-[75]` and removing `top-14` allows it to cover the entire mobile viewport (including the header space), preventing stray taps on background controls.
3. **Full-Height Positioning (Observation 1)**:
   - Setting the drawer to `fixed top-0 bottom-0 right-0 z-[80] w-full sm:w-[420px] max-w-full` eliminates the 56px top gap. The drawer header (`h-14`) sits flush with the top of the viewport ($y=0$ to $y=56\text{px}$), displaying all 5 controls without clipping.
4. **Header Auto-Yielding Mechanism (Observation 2)**:
   - By subscribing to `useAiStore((s) => s.isOpen)` in `PlatformHeader.tsx`:
     - `floating-header-capsule`: When `isAiOpen === true`, changes classes to `opacity-0 -translate-y-2 pointer-events-none scale-95`.
     - Right-side header button group: Gets `transition-all duration-200` and fades out to `opacity-0 pointer-events-none` when `isAiOpen === true`.
   - This ensures State Singularity: the AI Companion header has complete, uncontested visual and interactive ownership of the top-right screen space.
5. **E2E Test Alignment (Observation 2 & 3)**:
   - Updating `header-ai-btn` `onClick` to call `(e) => { e.stopPropagation(); useAiStore.getState().toggleOpen(); }` fulfills `aiCompanionFlow.spec.ts:49`, allowing users on desktop or mobile to toggle the AI drawer directly from the header button.

---

## 3. Caveats

1. **Card-Style Variant for Desktop**: `PROJECT.md` mentions `top-0` or `top-3 bottom-3 right-3 sm:right-4 h-[calc(100vh-24px)]`. Investigation confirms `top-0 bottom-0 right-0` is strictly superior on mobile (`w-full`) to avoid horizontal overflow, and provides the cleanest Linear-style drawer on desktop. Dimension guardrails for M4 (`min-w-[340px] max-w-[460px]`) can build directly on top of this.
2. **Esc Key & Backdrop Dismissal**: `AiCompanionWidget` already has internal keyboard handling and backdrop click dismiss (`toggleOpen(false)`). When closed, `isAiOpen` automatically reverts to `false`, bringing back all header controls without any manual intervention.
3. **Read-Only Scope**: In strict compliance with explorer instructions, no source files were directly modified in `src/`. All changes are formatted as an exact `.patch` file in `.agents/teamwork/explorer_m2_3/feature6_ai_header_collision.patch`.

---

## 4. Conclusion

Feature 6 is fully formulated, architecturally validated against the UI/UX Design Playbook, and ready for immediate, surgical application.

### Proposed Code Diffs Summary:
1. **`src/components/AiCompanionWidget.tsx`**:
   - Line 279: `fixed inset-0 top-14 z-30` $\rightarrow$ `fixed inset-0 z-[75]`
   - Line 289: `fixed top-14 bottom-0 right-0 z-40` $\rightarrow$ `fixed top-0 bottom-0 right-0 z-[80]`
2. **`src/components/PlatformHeader.tsx`**:
   - Line 42: Add `const isAiOpen = useAiStore((s) => s.isOpen);`
   - Line 273: Add `isAiOpen ? 'opacity-0 -translate-y-2 pointer-events-none scale-95' : ...` to capsule classes.
   - Line 445: Add `transition-all duration-200 ${isAiOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}` to right-side button group container.
   - Line 482: Update `header-ai-btn` `onClick` to `(e) => { e.stopPropagation(); useAiStore.getState().toggleOpen(); }`.

---

## 5. Verification Method

1. **Check patch application**:
   ```powershell
   git apply --check .agents/teamwork/explorer_m2_3/feature6_ai_header_collision.patch
   ```
2. **Run TypeScript check**:
   ```powershell
   npx tsc --noEmit
   ```
   *Expected: Exit code 0, 0 errors.*
3. **Run Vitest suite**:
   ```powershell
   npm test
   ```
   *Expected: 58 test files pass, 540 tests pass.*
4. **Targeted unit & E2E verification**:
   ```powershell
   npx vitest run tests/e2e/tier3_cross_feature_combinations.test.ts tests/e2e/tier1_feature_coverage.test.ts tests/unit/aiStore.test.ts
   ```
   *Expected: 100% pass, specifically Combination 2 (Khung chat AI Companion & Nhường không gian PlatformHeader).*
5. **Invalidation Conditions**:
   - If `floating-header-capsule` remains visible when `useAiStore.getState().isOpen === true`.
   - If AI panel header buttons (`+`, `History`, `RotateCcw`, `X`) are obscured by any header element.
   - If mobile backdrop does not dismiss the drawer upon tapping outside.
