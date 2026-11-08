# TEST INFRASTRUCTURE SPECIFICATION: POMOFOCUS V6.0 ULTIMATE
**Project:** Pomofocus v6.0 Ultimate (Liquid Glass & Zen Minimalism)  
**Author:** E2E Testing Lead (`test_writer_e2e`)  
**Status:** ACTIVE  
**Last Updated:** 2026-11-08  

---

## 1. Executive Summary & Testing Strategy

This document establishes the architecture, test runners, execution environments, and tier organization for the comprehensive, requirement-driven, opaque-box E2E test suite for **Pomofocus v6.0 Ultimate**.

### Testing Philosophy
1. **Opaque-Box Verification**: Tests validate observable interfaces, DOM structures, user interactions, and state transitions without reliance on private implementation details.
2. **Defensive Boundary & Adversarial Hardening**: Rigorous testing of boundary values, extreme coordinates, extreme sizes, special/escaped character combinations, and XSS attack vectors.
3. **Deterministic & Isolated Execution**: Every test case initializes its own state, executes in isolation, clears `localStorage` and `sessionStorage`, and avoids test order dependencies.
4. **Zero Flakiness & Fast Feedback**: Using Vitest v2.1.8 with JSDOM and Testing Library ensures sub-second test execution and 100% deterministic reproducibility across local and CI environments.

---

## 2. Environment & Test Runner Configuration

| Layer | Technology | Details |
|---|---|---|
| **Test Runner** | Vitest v2.1.8 | High-speed ESM-native test runner integrated into Vite build pipeline |
| **DOM Environment** | JSDOM v24.1.0 | Full browser DOM & Web API simulation (HTML5, Storage, History, Events) |
| **Component Testing** | `@testing-library/react` v16.1.0 | User-centric DOM query and interaction simulation |
| **Config Location** | `vite.config.ts` | Configured with `test: { globals: true, environment: 'jsdom', include: ['...'] }` |
| **Test Directory** | `tests/e2e/` | Co-located with project test structure |
| **Execution Command** | `npx vitest run tests/e2e/` | Runs all 4 tiers of E2E suites |
| **Full Suite Command**| `npm test` | Runs unit tests and e2e test suites |

---

## 3. Four-Tier Test Architecture

```
tests/e2e/
├── tier1_feature_coverage.test.ts          # Tier 1: 23 Features in Isolation (Happy-Path)
├── tier2_boundary_corner_cases.test.ts     # Tier 2: Boundary Clamping, Extremes & Security
├── tier3_cross_feature_combinations.test.ts # Tier 3: Cross-Module Interactions & Z-Index Layering
└── tier4_real_world_scenarios.test.ts      # Tier 4: End-to-End Study Session Workflows
```

### Tier 1: Feature Coverage (Representative Happy-Path in Isolation)
Validates all 23 features defined in `PROJECT.md § Feature Inventory`:
- **Feature 1**: Zero-FOUT Dark Mode Lock (`index.html` background `#09090b !important`, text `#f4f4f5`).
- **Feature 2**: Splash Curtain Preloader (`#pomo-splash-curtain`, `.pomo-spinner`, `.loaded` fade out).
- **Feature 3**: Optional Font Display (`font-display: optional` migration).
- **Feature 4**: Top Workspace Clearance ($y=8\text{px}$, `top-2`, drag minimum Y allows 8px).
- **Feature 5**: Compact Home Navigation Tuck-In (discreet Home icon in capsule & settings).
- **Feature 6**: AI Companion Header Collision Fix (`z-[80]`, full height `top-0`, right buttons yielding).
- **Feature 7**: macOS Liquid Glass Dock Material (`backdrop-filter: blur(20px) saturate(150%)`, `rgba(30, 30, 35, 0.75)`).
- **Feature 8**: Pure CSS Dock Magnification Physics (1.75x target, 1.42x sibling 1, 1.04x sibling 2, `translateY(-8px)` lift).
- **Feature 9**: Glass Dock Tooltips (14px above dock, `backdrop-filter: blur(18px)`).
- **Feature 10**: Active Widget Indicator Dot (`.dock__dot` white pearl 3px glowing dot).
- **Feature 11**: Dock Data-TestID Preservation (18 `data-testid` attributes preserved).
- **Feature 12**: Pomodoro Timer Dimension Guardrail (`minW: 300, maxW: 440, minH: 220, maxH: 340`).
- **Feature 13**: Task List Dimension Guardrail (`minW: 320, maxW: 500, minH: 280, maxH: 650`).
- **Feature 14**: Quick Notes Dimension Guardrail (`minW: 280, maxW: 680, minH: 240, maxH: 720`).
- **Feature 15**: Media Player Dimension Guardrail & 16:9 (`minW: 280, maxW: 420, minH: 140, maxH: 260`, strict 16:9).
- **Feature 16**: AI Companion Dimension Guardrail (`minW: 340, maxW: 460`, `h-[calc(100vh-24px)]`).
- **Feature 17**: 3-State Micro Dots (`bg-emerald-400` live, `bg-amber-400` paused, `bg-zinc-500` idle).
- **Feature 18**: Monochromatic Zen Typography (`text-white`, `font-semibold`, clean contrast).
- **Feature 19**: Audio & Sound Cleanup (No rooster sound "Gà gáy", clean labels, no cheesy text).
- **Feature 20**: Ad & Upsell Banner Removal (Removal of banners in SpacesWidget & AudioWidget).
- **Feature 21**: Task Input Placeholder Fix (`"Thêm nhiệm vụ mới... (Enter)"`).
- **Feature 22**: Cascade Widget Positioning (24px offset stagger when opening widgets).
- **Feature 23**: Unit & Regression Test Alignment (Tasks max height 650px guardrail).

### Tier 2: Boundary & Corner Cases (Limits, Extremes & Defense)
Exhaustive verification of system guardrails under edge-case inputs:
- Minimum/Maximum dimension boundaries across all 5 widget types.
- Out-of-bounds coordinates (negative X/Y, coordinates exceeding viewport limits).
- Zero/empty string, whitespace-only, and 5000+ character stress strings in Tasks and Notes.
- HTML tag escaping and XSS attack strings (`<script>alert(1)</script>`, `<iframe>`, `javascript:`).
- Audio volume extremes (clamped between 0.0 and 1.0; mute/unmute stability).
- Cascading offset boundaries (opening 10+ widgets without infinite drift).
- Corrupted/malformed `localStorage` JSON recovery.

### Tier 3: Cross-Feature Combinations (Interactions & Z-Index Layering)
Validates composite workflows and non-linear interactions between independent subsystems:
- DockBar toggle & active indicator dot `.dock__dot` real-time sync with titlebar close button.
- AI Companion panel opening triggering PlatformHeader button group fade/yield (`opacity-0 pointer-events-none`).
- Top clearance ($y=8\text{px}$) coexisting with collapsed floating header capsule (`z-40`).
- Zen Mode engagement with active timer ticking and ambient audio playing without interruption.
- Multi-widget cascading combined with `bringToFront` Z-Index escalation.
- Zero-FOUT Splash Curtain preloader lifecycle during application mount.

### Tier 4: Real-World Application Scenarios (End-to-End User Journeys)
End-to-end integration workflows matching real study/focus sessions:
- Full 25-minute Pomodoro study workflow: Task creation -> Task linking -> Notes entry -> Ambient audio setup -> Timer start -> Zen Mode -> Completion.
- Deep Focus multitasking and layout preset switching (Clear Glass, Balanced, High Contrast).
- AI-assisted study workflow: Question -> Step-by-step guidance -> Note saving -> Task follow-up.
- Cold boot & session rehydration: Browser reload preserving layout, tasks, notes, volume, and preferences.

---

## 4. Execution Commands

### Run All E2E Suites
```bash
npx vitest run tests/e2e/
```

### Run Individual Tiers
```bash
# Tier 1: Feature Coverage (Isolation)
npx vitest run tests/e2e/tier1_feature_coverage.test.ts

# Tier 2: Boundary & Corner Cases
npx vitest run tests/e2e/tier2_boundary_corner_cases.test.ts

# Tier 3: Cross-Feature Combinations
npx vitest run tests/e2e/tier3_cross_feature_combinations.test.ts

# Tier 4: Real-World Scenarios
npx vitest run tests/e2e/tier4_real_world_scenarios.test.ts
```

### Run Entire Project Test Suite (Unit + E2E)
```bash
npm test
```

---

## 5. Implementation Bug Escalation Protocol

As mandated by Test Writer governance, when an implementation defect is discovered:
1. The test suite must assert the authoritative specification from `PROJECT.md` and `ORIGINAL_REQUEST.md`.
2. Do not modify implementation source code to force a pass.
3. Document the discrepancy in `.agents/teamwork/test_writer_e2e/handoff.md` with:
   - Failing test name and file.
   - Observed behavior vs. Expected specification.
   - Affected milestone and target implementation files.
4. Escalate immediately to the Project Orchestrator via `send_message`.
