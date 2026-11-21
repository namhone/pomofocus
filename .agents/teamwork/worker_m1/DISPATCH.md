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

## 2026-11-19T20:29:22Z
Your working directory: d:\FileCuaNam\Web'\Pomodoro\.agents\teamwork\worker_m1\
Your identity: Worker M1 (Payment & Billing Remediation)
Path to authoritative request: d:\FileCuaNam\Web'\Pomodoro\.agents\teamwork\ORIGINAL_REQUEST.md
Path to Explorer 1 handoff report: d:\FileCuaNam\Web'\Pomodoro\.agents\teamwork\explorer_survey_p1_1\handoff.md
Path to Project Spec: d:\FileCuaNam\Web'\Pomodoro\.agents\teamwork\PROJECT.md

MANDATORY INTEGRITY WARNING:
> DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

SCOPE OF WORK — MILESTONE 1:
You are exclusively responsible for implementing the following surgical fixes per /karpathy-guidelines:

1. `api/payment/vcb-webhook.ts` (BUG-21):
   - Completely remove lines 146-157 (fallback logic selecting user from user_entitlements order by updated_at.desc limit 1).
   - If `!targetUserId`: Record transaction in `payment_transactions` with status `'UNMATCHED_PENDING_MANUAL_REVIEW'`, amount, extracted transfer content/description, timestamp. Return HTTP 200 acknowledging receipt with `{ success: true, message: 'Giao dịch không khớp mã đơn hàng/người dùng; đã ghi nhận UNMATCHED_PENDING_MANUAL_REVIEW để đối soát thủ công', status: 'UNMATCHED_PENDING_MANUAL_REVIEW' }`.
   - Ensure `status` value `'UNMATCHED_PENDING_MANUAL_REVIEW'` and nullable `user_id` are cleanly handled.

2. `api/momo/check-status.ts` (BUG-22):
   - Completely remove line 54: `if (isPro) isPaid = true`.
   - In `src/components/MoMoPaymentModal.tsx`: remove `|| res.isPro` from line 148.
   - In `check-status.ts`: only mark `isPaid = true` when the specific `order_id` in `payment_transactions` / `pending_orders` has status `'completed'`.

3. UI Views & Order Creation APIs (BUG-14):
   - In `src/components/mobile/views/MobileSettingsView.tsx`: block guests/unauthenticated users from opening top-up modals or upgrading. Show clear login requirement.
   - In `src/components/AiCreditsTopupModal.tsx`: block guests from creating topup orders. Require login.
   - In `src/components/MoMoPaymentModal.tsx`: block guests from initiating checkout or generating QR.
   - In `src/components/BillingView.tsx`: block guests from initiating checkout.
   - In `api/payment/create-order.ts` and `api/momo/create-payment.ts`: validate `userId`. If missing, empty, or guest (`'guest'`, `'guest_user'`), reject immediately with HTTP 401 `{ error: 'Yêu cầu đăng nhập tài khoản thật để tạo đơn hàng thanh toán' }`.

4. `scripts/vcb_email_listener.js` & `api/payment/webhook.ts` (BUG-23):
   - Remove hardcoded secret `POMO_VCB_SECRET_KEY_2026`. Read from `PropertiesService.getScriptProperties().getProperty('POMO_VCB_SECRET_KEY')` in GAS, and `process.env.POMO_VCB_SECRET_KEY` in API endpoints.
   - In `scripts/vcb_email_listener.js`: change email processing to iterate per individual Message ID instead of Thread ID, using a ring buffer in Script Properties so no emails in shared threads are skipped.
   - Expand description regex in `scripts/vcb_email_listener.js` to match transfer notes from MB, Techcombank, ACB, VPBank, TPBank, MoMo.

FILE OWNERSHIP (Exclusive to Worker M1):
- `api/payment/vcb-webhook.ts`
- `api/momo/check-status.ts`
- `api/payment/create-order.ts`
- `api/momo/create-payment.ts`
- `scripts/vcb_email_listener.js`
- `api/payment/webhook.ts`
- `src/components/mobile/views/MobileSettingsView.tsx`
- `src/components/AiCreditsTopupModal.tsx`
- `src/components/MoMoPaymentModal.tsx`
- `src/components/BillingView.tsx`

VERIFICATION REQUIREMENTS:
- Run syntax checks / type-checks on modified files.
- Ensure zero breaking changes or regressions.
- Document exact file diffs and verification output in `handoff.md`.

When complete, write your handoff report to:
`d:\FileCuaNam\Web'\Pomodoro\.agents\teamwork\worker_m1\handoff.md`
and notify the orchestrator with send_message.
