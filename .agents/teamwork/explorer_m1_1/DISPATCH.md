## 2026-11-08T04:59:31Z
Sender: 1bd3b181-5618-4e23-9890-9f34e23eca19
Priority: MESSAGE_PRIORITY_HIGH

You are Explorer M1-1 for Milestone 1: Zero-FOUT & Typography Foundation.
Working directory: d:\FileCuaNam\Web'\Pomodoro\.agents\teamwork\explorer_m1_1\
Original request path: d:\FileCuaNam\Web'\Pomodoro\.agents\teamwork\ORIGINAL_REQUEST.md
Project specification: d:\FileCuaNam\Web'\Pomodoro\.agents\teamwork\PROJECT.md
Workspace root: d:\FileCuaNam\Web'\Pomodoro

YOUR MANDATORY TASK:
1. Read ORIGINAL_REQUEST.md and PROJECT.md.
2. Investigate index.html:
   - Current <html lang="vi"> and <body> tags.
   - Design exact replacement to add class="dark" and style="background-color: #09090b !important; color: #f4f4f5;".
   - Design exact inline CSS <style> block and DOM structure for #pomo-splash-curtain with .pomo-spinner and .loaded transition.
   - Design DOMContentLoaded dismissal script (100ms timeout).
3. Verify that these changes do not break any existing React root mounting (<div id="root">).
4. Write your analysis to d:\FileCuaNam\Web'\Pomodoro\.agents\teamwork\explorer_m1_1\analysis.md and handoff.md, then send_message to Project Orchestrator (1bd3b181-5618-4e23-9890-9f34e23eca19).
## 2026-11-21T10:49:43Z
Sender: cf5bc11e-435c-4f27-a55e-a32f3bebfefa
Priority: MESSAGE_PRIORITY_HIGH

You are Explorer explorer_m1_1.
Your working directory is: d:\FileCuaNam\Web'\Pomodoro\.agents\teamwork\explorer_m1_1
Read your context file at: d:\FileCuaNam\Web'\Pomodoro\.agents\teamwork\explorer_m1_1\context.md

MANDATORY FIRST STEP:
Read the authoritative user request at:
d:\FileCuaNam\Web'\Pomodoro\.agents\teamwork\ORIGINAL_REQUEST.md

Read the project scope document at:
d:\FileCuaNam\Web'\Pomodoro\.agents\teamwork\orchestrator_p2\PROJECT_P2.md

Read UI/UX constraints at:
d:\FileCuaNam\Web'\Pomodoro\docs\UI_UX_DESIGN_PLAYBOOK_AND_POSTMORTEM.md

Read the audit report section for BUG-01, BUG-02, BUG-76 at:
d:\FileCuaNam\Web'\Pomodoro\docs\reports\FORENSIC_DEEP_AUDIT_REPORT.md

Your role is to investigate Web Isolation for Milestone M1:
1. Examine `src/App.tsx`, `src/components/mobile/MobileAppShell.tsx`, `src/components/PlatformHeader.tsx`, `src/components/SharedFooter.tsx`, and any banner/button components advertising "Tải bản APK", "Download Android App", or PWA install prompts.
2. Check how `Capacitor.isNativePlatform()` is currently checked.
3. Determine where and how Web headers, footers, APK download links, and PWA prompts are still rendered or leaking into native APK views.
4. Define the exact code strategy to guarantee 100% web isolation in native APK mode:
   - Zero web headers or footers in APK mode.
   - Zero APK download or PWA install banners/buttons in APK mode.
   - Adherence to Z-index hierarchy and state singularity (never 2 headers).
5. Recommend the exact file edits, props, and invariants for Worker M1.

Write your findings to:
`d:\FileCuaNam\Web'\Pomodoro\.agents\teamwork\explorer_m1_1\analysis.md`
`d:\FileCuaNam\Web'\Pomodoro\.agents\teamwork\explorer_m1_1\handoff.md`

Send a brief message to orchestrator with your handoff path when done.
