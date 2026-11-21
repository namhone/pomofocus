## 2026-11-21T05:12:00Z
You are teamwork_explorer 3.
Your working directory is: d:\FileCuaNam\Web'\Pomodoro\.agents\teamwork\explorer_survey_3
Your parent is orchestrator_p2 (conversation ID cf5bc11e-435c-4f27-a55e-a32f3bebfefa).

Read ORIGINAL_REQUEST.md at: d:\FileCuaNam\Web'\Pomodoro\.agents\teamwork\ORIGINAL_REQUEST.md
Read FORENSIC_DEEP_AUDIT_REPORT.md at: d:\FileCuaNam\Web'\Pomodoro\docs\reports\FORENSIC_DEEP_AUDIT_REPORT.md
Read UI/UX playbook at: d:\FileCuaNam\Web'\Pomodoro\docs\UI_UX_DESIGN_PLAYBOOK_AND_POSTMORTEM.md

TASK: Survey Mobile UI Polish, Stepper Row, Focus View Logic, User Identity Sync, KaTeX & Splash Curtain:
1. Item 2 (part 2): Splash curtain & Offline KaTeX (BUG-04, BUG-12):
   - Inspect `#pomo-splash-curtain` in `index.html`: how to add a clean, minimal PomoFocus logo while keeping instant load performance.
   - Inspect KaTeX CSS and font loading in `vite.config.ts`, `index.html`, or components (BUG-12): ensure KaTeX works completely offline via Workbox / local bundle without CDN runtime failures.
2. Item 3 (part 2): Standardize User Identity across all surfaces (BUG-13, BUG-16, BUG-17):
   - Inspect `UserAvatar`: ensure `rounded-full` universally, inspect `ProfileView.tsx:362` to eliminate square `rounded-2xl` and hide the empty `Mail` icon when email is blank.
   - Inspect user display name width in `PlatformHeader.tsx:555` (`max-w` constraint causes clipping on long Vietnamese names).
   - Standardize Credits balance display and create/enforce a unified `getSubscriptionBadge(user)` across Header, Dropdown, Profile, and APK.
3. Item 4: Mobile text clipping & Focus View logic (BUG-08, BUG-09, BUG-10, BUG-33, BUG-34):
   - Inspect `MobileSettingsView.tsx` & `MobileStepperRow.tsx`: change 5-shortcut grid to 2 rows / 3 columns to eliminate truncated labels like "Thống...", "Gói cư..."; allow stepper descriptions to wrap naturally without aggressive truncation (`...`).
   - Inspect `MobileFocusView.tsx`: fix 4 round dots logic (round in progress should display a ring or pulse animation instead of all 4 dots glowing solid green when timer is at 24:58, and fix progress bar overlapping "Hiệp x/y" text); add an inline quick-create task input inside Task Picker dropdown when task list is empty (0/0).

Document your full investigation, line-by-line evidence, and exact solution proposals in `d:\FileCuaNam\Web'\Pomodoro\.agents\teamwork\explorer_survey_3\handoff.md`.
Maintain `progress.md` in your directory.
When finished, send a message to parent cf5bc11e-435c-4f27-a55e-a32f3bebfefa with your completion summary and path to handoff.md.
