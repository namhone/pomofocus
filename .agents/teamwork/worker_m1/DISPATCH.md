## 2026-11-08T05:13:46Z
You are Worker M1 for Milestone 1: Zero-FOUT & Typography Foundation of Pomofocus v6.0 Ultimate.
Working directory: d:\FileCuaNam\Web'\Pomodoro\.agents\teamwork\worker_m1\
Original request: d:\FileCuaNam\Web'\Pomodoro\.agents\teamwork\ORIGINAL_REQUEST.md
Project specification: d:\FileCuaNam\Web'\Pomodoro\.agents\teamwork\PROJECT.md
Workspace root: d:\FileCuaNam\Web'\Pomodoro

EXPLORER HANDOFFS & PROPOSED CHANGES:
- Explorer M1-1 Handoff: d:\FileCuaNam\Web'\Pomodoro\.agents\teamwork\explorer_m1_1\handoff.md
- Proposed index.html: d:\FileCuaNam\Web'\Pomodoro\.agents\teamwork\explorer_m1_1\proposed_index.html
- Patch: d:\FileCuaNam\Web'\Pomodoro\.agents\teamwork\explorer_m1_1\index_html_changes.patch
- Explorer M1-2 Handoff: d:\FileCuaNam\Web'\Pomodoro\.agents\teamwork\explorer_m1_2\handoff.md
- Explorer M1-3 Handoff: d:\FileCuaNam\Web'\Pomodoro\.agents\teamwork\explorer_m1_3\handoff.md

EXCLUSIVE FILE OWNERSHIP:
You exclusively own:
- `index.html`
- `src/index.css`
Do NOT edit any other files.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

YOUR IMPLEMENTATION TASKS:
1. Apply surgical modifications to `index.html`:
   - Set `<html lang="vi" class="dark" style="background-color: #09090b !important; color: #f4f4f5;">`.
   - In `<head>`, insert the inline critical CSS for `#pomo-splash-curtain` and `.pomo-spinner` per Section 1 of ORIGINAL_REQUEST.md.
   - On `<body>`, set `<body class="bg-[#09090b] text-[#f4f4f5] select-none" style="background-color: #09090b !important; color: #f4f4f5;">`.
   - Place `<div id="pomo-splash-curtain" aria-hidden="true"><div class="pomo-spinner"></div></div>` directly as a sibling before `<div id="root">`.
   - Add the dismissal script at the end of `<body>` (DOMContentLoaded + 100ms timeout).
   - CRITICAL: Preserve 100% of KaTeX `<link>` tags and `<div id="root">` crawler text (required by wcagAccessibilityAudit.test.ts and SEO).
2. In `src/index.css`:
   - Add Zero-FOUT & Typography Invariant rule comment documenting `font-display: optional` policy for any future web fonts.
3. Verification:
   - Run `npx vitest run tests/unit/wcagAccessibilityAudit.test.ts`
   - Run `npx tsc --noEmit`
   - Run `npm test`
   - Run `npm run build`
4. Document all changes in `changes.md` and write your complete report in `handoff.md` inside your working directory.
5. Notify Project Orchestrator (Conversation ID: 1bd3b181-5618-4e23-9890-9f34e23eca19) via send_message when done.
