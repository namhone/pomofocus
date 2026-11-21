# BRIEFING — 2026-11-19T20:47:00Z

## Mission
Remediation Phase 1 — Milestone 1: Payment & Billing Remediation (BUG-21, BUG-22, BUG-14, BUG-23).

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa, specialist
- Working directory: d:\FileCuaNam\Web'\Pomodoro\.agents\teamwork\worker_m1\
- Original parent: 1bd3b181-5618-4e23-9890-9f34e23eca19
- Milestone: M1 — Zero-FOUT & Typography Foundation
- Current Milestone: M1 — Payment & Billing Remediation (Phase 1 Remediation)
- Parent ID: 852af589-99a0-4469-aaef-ecc462c828ab

## 🔒 Key Constraints
- Exclusively own `index.html` and `src/index.css`. DO NOT edit any other files.
- DO NOT CHEAT: Genuine implementations only, no dummy/facade implementations, no hardcoded test results.
- Preserve 100% of KaTeX `<link>` tags and `<div id="root">` crawler text in `index.html` (for WCAG tests and SEO).
- Implement Splash Curtain preloader (#pomo-splash-curtain) with dark lock `#09090b !important` and emerald spinner.
- Dismiss curtain 100ms after DOMContentLoaded.
- Document font-display policy (`font-display: optional`) in `src/index.css`.
- Verify with unit tests, TypeScript type-check, and build.
- [2026-11-19T20:29:22Z] Exclusive File Ownership for M1:
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
- Follow /karpathy-guidelines: surgical changes, minimal diff, verify each fix.
- BUG-21: Completely remove lines 146-157 in `api/payment/vcb-webhook.ts`. If `!targetUserId`, record status `UNMATCHED_PENDING_MANUAL_REVIEW`, return HTTP 200 with `{ success: true, message: '...', status: 'UNMATCHED_PENDING_MANUAL_REVIEW' }`.
- BUG-22: Completely remove `if (isPro) isPaid = true` in `api/momo/check-status.ts`. Remove `|| res.isPro` in `MoMoPaymentModal.tsx`. Only mark `isPaid = true` when order in `payment_transactions` has status `'completed'` (or `'verified_paid'`).
- BUG-14: Block guests from opening topup/payment modals or creating orders. In API (`create-order.ts`, `create-payment.ts`), return HTTP 401 if missing/empty/guest userId.
- BUG-23: Remove hardcoded `POMO_VCB_SECRET_KEY_2026`. Read from `PropertiesService.getScriptProperties().getProperty('POMO_VCB_SECRET_KEY')` in GAS and `process.env.POMO_VCB_SECRET_KEY` in API. Use Message ID deduplication ring buffer in GAS. Expand regex for MB, Techcombank, ACB, VPBank, TPBank, MoMo.

## Current Parent
- Conversation ID: 852af589-99a0-4469-aaef-ecc462c828ab
- Updated: 2026-11-19T20:47:00Z

## Task Summary
- **What to build**: Fix BUG-21 (VCB Webhook Fallback Removal & UNMATCHED_PENDING_MANUAL_REVIEW), BUG-22 (Strict Order ID Check in Check-Status & MoMo Modal), BUG-14 (Guest Checkout Prevention in UI & APIs), BUG-23 (VCB Email Listener Hardening & Multi-Bank Support).
- **Success criteria**: All 4 bugs resolved surgically, type-check passes (0 errors), 29/29 payment unit tests pass, handoff report generated.
- **Interface contracts**: PROJECT.md & ORIGINAL_REQUEST.md
- **Code layout**: PROJECT.md § Code Layout

## Key Decisions Made
- BUG-21: In `vcb-webhook.ts`, replaced `user_entitlements` query fallback with atomic record insertion/patch of `UNMATCHED_PENDING_MANUAL_REVIEW` into `payment_transactions`, returning HTTP 200 with `{ success: true, message: 'Giao dịch không khớp mã đơn hàng/người dùng; đã ghi nhận UNMATCHED_PENDING_MANUAL_REVIEW để đối soát thủ công', status: 'UNMATCHED_PENDING_MANUAL_REVIEW' }` to stop webhook retries while preserving audit trail.
- BUG-22: In `check-status.ts`, removed line 54 (`if (isPro) isPaid = true`), tying `isPaid` strictly to order completion in `payment_transactions`. Removed `|| res.isPro` in `MoMoPaymentModal.tsx`.
- BUG-14: In UI (`MobileSettingsView.tsx`, `AiCreditsTopupModal.tsx`, `MoMoPaymentModal.tsx`, `BillingView.tsx`), added robust guards for `!user?.id || user.id === 'guest' || user.id === 'guest_user' || (user as any).isGuest`. In APIs (`create-order.ts`, `create-payment.ts`), returned HTTP 401 with `{ error: 'Yêu cầu đăng nhập tài khoản thật để tạo đơn hàng thanh toán' }`.
- BUG-23: Extracted secret key to `POMO_VCB_SECRET_KEY` in `vcb_email_listener.js`, `vcb-webhook.ts`, and `webhook.ts`. Implemented 300-item ring buffer in Script Properties using Message IDs to prevent Gmail thread blackout. Solved UTF-8 non-ASCII currency matching (`VNĐ`, `đ`) via negative lookahead `(?![a-zA-Z0-9])`.

## Artifact Index
- DISPATCH.md — Task instructions from orchestrator
- BRIEFING.md — Persistent memory
- progress.md — Liveness heartbeat
- handoff.md — Final report
- tests/unit/paymentRemediationPhase1.test.ts — Unit test suite for Phase 1 Payment Remediation

## Change Tracker
- **Files modified**:
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
  - `tests/unit/paymentRemediationPhase1.test.ts`
- **Build status**: PASS
  - `npm run type-check`: 0 errors (exit code 0)
  - `tests/unit/paymentRemediationPhase1.test.ts`: 10/10 passed
  - `tests/unit/paymentSecurity.test.ts`: 10/10 passed
  - `tests/unit/momoPayment.test.ts`: 9/9 passed
  - Total payment tests: 29/29 passed
- **Pending issues**: none

## Quality Status
- **Build/test result**: PASS (100% test pass rate, 0 type-check errors)
- **Lint status**: clean
- **Tests added/modified**: 10 new comprehensive unit tests in `tests/unit/paymentRemediationPhase1.test.ts`

## Loaded Skills
- None specified in dispatch
