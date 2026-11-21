# BRIEFING — 2026-11-19T15:11:00Z

## Mission
Forensic Deep-Audit Hợp Nhất (Truy vết sâu lỗi đã biết Phần 0 + Quét mới toàn hệ thống 5 Mũi chuyên sâu theo Phần 1 — AUDIT ONLY, KHÔNG SỬA CODE) trên 4 môi trường (A: Desktop Laptop 1366x768, B: Desktop Chuẩn 1440x900, C: Mobile Web 390x844, D: Giả lập Android Capacitor Native 390x844 + Edge-to-Edge + Virtual Keyboard). Xuất báo cáo duy nhất vào docs/reports/FORENSIC_DEEP_AUDIT_REPORT.md.

## 🔒 My Identity
- Archetype: orchestrator
- Roles: orchestrator, user_liaison, human_reporter, successor
- Working directory: d:\FileCuaNam\Web'\Pomodoro\.agents\teamwork\orchestrator\
- Original parent: 647839d2-7215-4b3d-a69e-e8416d5f008d
- Original parent conversation ID: 647839d2-7215-4b3d-a69e-e8416d5f008d

## 🔒 My Workflow
- **Pattern**: Project Pattern (Audit Track)
- **Scope document**: d:\FileCuaNam\Web'\Pomodoro\.agents\teamwork\PROJECT.md
1. **Decompose**:
   - Stream 0: Seed Bugs Verification & Ripple-Effect Tracing (Phần 0: APK vs Web isolation, Auth/Guest sync, Widget interactions/layout/ratios, Contrast/Images/AI/Copy)
   - Stream 1: Mũi 1 — Kiến trúc APK Độc lập & Routing (12 routes, modals, drawers, back button, 404, cold start)
   - Stream 2: Mũi 2 — Auth, Sync, Merge Conflict & Luồng tiền VietQR/MoMo (.gs regex, idempotency, realtime sync)
   - Stream 3: Mũi 3 — Playwright DOM & Interaction Stress (4 environments, getBoundingClientRect, scrollWidth, contrast ratio WCAG, virtual keyboard, IME isComposing)
   - Stream 4: Mũi 4 — Meet /rooms, WebRTC, Audio Engine & Memory Leaks (RTCPeerConnection, MediaStream, Realtime channels, AudioContext, listener leaks, race conditions)
   - Stream 5: Mũi 5 — Monochrome 90-10, Copywriting, Bảo mật & vn-law-check (regex scan emoji, ALL CAPS, tech jargon, sensitive data, XSS, legal compliance)
   - Synthesis: Consolidated Report Compiler -> docs/reports/FORENSIC_DEEP_AUDIT_REPORT.md
2. **Dispatch & Execute**:
   - Dispatch specialized forensic subagents in parallel for Streams 0, 1, 2, 3, 4, 5
   - Collect and verify findings with exact file:line evidence, measurements, and logs
   - Synthesize and compile final consolidated report
3. **On failure** (in this order):
   - Retry: nudge stuck agent or re-send task
   - Replace: spawn fresh agent with partial progress
   - Skip: never skip forensic audit steps
   - Redistribute: split stuck agent's remaining work
   - Escalate: report to parent as last resort
4. **Succession**: At 16 spawns, write handoff.md, cancel crons, spawn successor.

## 🔒 Key Constraints
- AUDIT ONLY MODE: NEVER write, modify, or create project source code files.
- NEVER run build/test commands yourself — require workers to do so.
- NEVER explore the codebase at the code level — dispatch Explorers and Specialists.
- Only edit metadata/state files (.md) in .agents/teamwork/.
- Every recorded defect MUST have hard evidence: file:line, DOM/CSS measurements, console/network log, or test output.
- No general "meets standards" hand-waving — empirical evidence only.
- Cover all 4 environments (A, B, C, D) and 12 routes + modals/drawers/widgets.

## Current Parent
- Conversation ID: 647839d2-7215-4b3d-a69e-e8416d5f008d
- Updated: 2026-11-19T15:10:00Z

## Key Decisions Made
- Partitioned audit into 6 parallel forensic streams.
- Dispatched all 6 specialized forensic subagents simultaneously.
- Heartbeat cron running: bc847d9c-6b98-4ce4-9445-f6f52b853c1b/task-36.

## Team Roster
| Agent | Type | Work Item | Status | Conv ID |
|-------|------|-----------|--------|---------|
| explorer_seed_bugs | teamwork_explorer | Phần 0: Seed Bugs Verification & Ripple Effects | in-progress | 9bad7310-fd0a-4d9e-9709-6f659ae8bc6f |
| explorer_vector1_apk | teamwork_explorer | Mũi 1: APK Architecture & Routing (12 routes) | in-progress | 8f50bc4f-92a3-4a4c-9d73-8ffbf1e9c0b3 |
| explorer_vector2_auth_payment | teamwork_explorer | Mũi 2: Auth, Virtual Guest & VietQR/MoMo .gs | in-progress | f67d90f9-2cc7-4d2f-a4cf-ce09068f262e |
| challenger_vector3_dom_playwright | teamwork_challenger | Mũi 3: DOM & Playwright Stress across 4 Envs | in-progress | 49a6f5d1-6bb4-4ab1-adc9-18e9964c65f7 |
| auditor_vector4_webrtc_memory | teamwork_auditor | Mũi 4: Meet /rooms, WebRTC, Realtime & Leaks | in-progress | 56dae05d-55cf-4a14-9594-2c06d9ed3520 |
| auditor_vector5_monochrome_legal | teamwork_auditor | Mũi 5: Monochrome 90-10, Copy & vn-law-check | in-progress | 74839c47-0666-4879-9259-256881c0a753 |

## Succession Status
- Succession required: no
- Spawn count: 6 / 16
- Pending subagents: 9bad7310-fd0a-4d9e-9709-6f659ae8bc6f, 8f50bc4f-92a3-4a4c-9d73-8ffbf1e9c0b3, f67d90f9-2cc7-4d2f-a4cf-ce09068f262e, 49a6f5d1-6bb4-4ab1-adc9-18e9964c65f7, 56dae05d-55cf-4a14-9594-2c06d9ed3520, 74839c47-0666-4879-9259-256881c0a753
- Predecessor: none
- Successor: not yet spawned

## Active Timers
- Heartbeat cron: bc847d9c-6b98-4ce4-9445-f6f52b853c1b/task-36
- Safety timer: none

## Artifact Index
- .agents/teamwork/ORIGINAL_REQUEST.md — Authoritative user request
- .agents/teamwork/orchestrator/DISPATCH.md — Received orchestrator dispatch
- .agents/teamwork/orchestrator/BRIEFING.md — Persistent orchestrator memory
- .agents/teamwork/orchestrator/progress.md — Execution heartbeat and checklist
- .agents/teamwork/explorer_seed_bugs/handoff.md — Target handoff for Phần 0
- .agents/teamwork/explorer_vector1_apk/handoff.md — Target handoff for Mũi 1
- .agents/teamwork/explorer_vector2_auth_payment/handoff.md — Target handoff for Mũi 2
- .agents/teamwork/challenger_vector3_dom_playwright/handoff.md — Target handoff for Mũi 3
- .agents/teamwork/auditor_vector4_webrtc_memory/handoff.md — Target handoff for Mũi 4
- .agents/teamwork/auditor_vector5_monochrome_legal/handoff.md — Target handoff for Mũi 5
- docs/reports/FORENSIC_DEEP_AUDIT_REPORT.md — Master Consolidated Forensic Audit Report (Target output)
