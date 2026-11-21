# Progress Tracking — Worker M1 (Payment & Billing Remediation)

Last visited: 2026-11-19T20:47:00Z

## Status: COMPLETED

### Milestones / Tasks
- [x] Initialized workspace and recorded DISPATCH.md
- [x] Updated BRIEFING.md
- [x] Viewed all existing target files and analyzed requirements
- [x] Implemented Task 1: `api/payment/vcb-webhook.ts` (BUG-21)
  - Removed fallback query to `user_entitlements` ordered by `updated_at.desc`
  - Added recording of unmatched transactions to `payment_transactions` with status `'UNMATCHED_PENDING_MANUAL_REVIEW'`
  - Returned HTTP 200 with structured status acknowledging receipt for manual review
  - Cleaned up secret check using `POMO_VCB_SECRET_KEY`
- [x] Implemented Task 2: `api/momo/check-status.ts` & `src/components/MoMoPaymentModal.tsx` (BUG-22)
  - Removed line 54 `if (isPro) isPaid = true` from `api/momo/check-status.ts`
  - Removed `|| res.isPro` check from `src/components/MoMoPaymentModal.tsx` line 148
  - Verified `isPaid` is strictly driven by order status in `payment_transactions`
- [x] Implemented Task 3: UI Views & Order Creation APIs (BUG-14)
  - In `src/components/mobile/views/MobileSettingsView.tsx`: added auth guard on "Nạp thêm" and "Nâng cấp" buttons
  - In `src/components/AiCreditsTopupModal.tsx`: blocked guest users from initiating order creation; rendered Auth Gate
  - In `src/components/MoMoPaymentModal.tsx`: blocked guest checkout and QR generation; rendered Auth Gate
  - In `src/components/BillingView.tsx`: blocked guests from initiating checkout in `handleSelectPlanAndCheckout`
  - In `api/payment/create-order.ts`: validated `userId`, rejecting missing/empty/guest users with HTTP 401
  - In `api/momo/create-payment.ts`: validated `userId`, rejecting missing/empty/guest users with HTTP 401
- [x] Implemented Task 4: `scripts/vcb_email_listener.js` & `api/payment/webhook.ts` (BUG-23)
  - Removed hardcoded secret `POMO_VCB_SECRET_KEY_2026`, reading from `PropertiesService.getScriptProperties().getProperty('POMO_VCB_SECRET_KEY')` in GAS and `process.env.POMO_VCB_SECRET_KEY` in APIs
  - Replaced Thread ID deduplication with individual Message ID ring buffer (300 IDs) in Script Properties to resolve Thread Blackout
  - Expanded regex to match multi-bank transfer descriptions from MB, Techcombank, ACB, VPBank, TPBank, MoMo
  - Handled UTF-8 non-ASCII currency boundaries (`VNĐ`, `đ`, `VND`) without failing
- [x] Verification:
  - Authored dedicated unit test suite `tests/unit/paymentRemediationPhase1.test.ts` (10/10 passed)
  - Ran existing payment test suites `paymentSecurity.test.ts` and `momoPayment.test.ts` (19/19 passed, total 29/29 passed)
  - Ran TypeScript type-check (`npm run type-check`: 0 errors)
- [x] Write `handoff.md` and notify orchestrator
