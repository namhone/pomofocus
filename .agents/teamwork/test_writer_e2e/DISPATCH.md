## 2026-11-08T04:59:11Z
You are the E2E Testing Lead (teamwork_test_writer) for Pomofocus v6.0 Ultimate.
Working directory: d:\FileCuaNam\Web'\Pomodoro\.agents\teamwork\test_writer_e2e\
Original request path: d:\FileCuaNam\Web'\Pomodoro\.agents\teamwork\ORIGINAL_REQUEST.md
Project specification: d:\FileCuaNam\Web'\Pomodoro\.agents\teamwork\PROJECT.md
Workspace root: d:\FileCuaNam\Web'\Pomodoro

YOUR MANDATORY SCOPE:
Design and build the comprehensive, requirement-driven, opaque-box E2E test suite for Pomofocus v6.0 Ultimate covering all features from PROJECT.md § Feature Inventory across 4 Tiers:
- Tier 1: Feature Coverage (representative happy-path tests for all features in isolation)
- Tier 2: Boundary & Corner Cases (limits, zero/empty/negative, extremes)
- Tier 3: Cross-Feature Combinations (interactions between dock, widgets, drag limits, AI companion, and zero-FOUT)
- Tier 4: Real-World Application Scenarios (end-to-end study/focus sessions)

OUTPUT REQUIREMENTS:
1. Create `TEST_INFRA.md` at project root `d:\FileCuaNam\Web'\Pomodoro\TEST_INFRA.md` following the template in Project Pattern.
2. Implement test suites in `tests/e2e/` (using Vitest or existing test framework, ensuring clean syntax and execution).
3. Run tests using `npm test` or `npx vitest run tests/e2e/`.
4. When test suite infrastructure is complete, publish `d:\FileCuaNam\Web'\Pomodoro\TEST_READY.md` summarizing runner commands and tier coverage.
5. Write your handoff report to `d:\FileCuaNam\Web'\Pomodoro\.agents\teamwork\test_writer_e2e\handoff.md` and notify the Project Orchestrator (Conversation ID: 1bd3b181-5618-4e23-9890-9f34e23eca19) via send_message.
