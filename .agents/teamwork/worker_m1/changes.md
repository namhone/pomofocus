# Changes Summary — Worker M1 (Payment & Billing Remediation Phase 1)

## Overview
Worker M1 executed surgical, minimal-diff modifications across 10 assigned files to eliminate critical payment and billing vulnerabilities identified in FORENSIC_DEEP_AUDIT_REPORT.md (BUG-21, BUG-22, BUG-14, BUG-23).

---

## 1. `api/payment/vcb-webhook.ts` (BUG-21, BUG-23)
- Replaced hardcoded fallback secret `POMO_VCB_SECRET_KEY_2026` with `process.env.POMO_VCB_SECRET_KEY || process.env.VCB_WEBHOOK_SECRET`.
- Completely removed fallback lines 146-157 which queried `user_entitlements` sorted by `updated_at.desc` and granted PRO to arbitrary active users.
- When `!targetUserId`:
  - Inserts/updates `payment_transactions` with status `'UNMATCHED_PENDING_MANUAL_REVIEW'`, amount, description, and timestamp.
  - Returns HTTP 200 with `{ success: true, message: 'Giao dịch không khớp mã đơn hàng/người dùng; đã ghi nhận UNMATCHED_PENDING_MANUAL_REVIEW để đối soát thủ công', status: 'UNMATCHED_PENDING_MANUAL_REVIEW', orderId, amount }`.

## 2. `api/momo/check-status.ts` (BUG-22)
- Removed line 54: `if (isPro) isPaid = true;`.
- Restricted `isPaid = true` strictly to order status `'completed'` or `'verified_paid'` from `payment_transactions`.

## 3. `src/components/MoMoPaymentModal.tsx` (BUG-22, BUG-14)
- Removed `|| res.isPro` from payment status polling (line 148).
- Bound Realtime Supabase channel to specific `order.orderId` in `payment_transactions`.
- Blocked unauthenticated/guest users (`!user?.id || user.id === 'guest' || user.id === 'guest_user' || (user as any).isGuest`) from initiating checkout or generating QR codes.
- Added centered Auth Gate render with login redirect.

## 4. `src/components/BillingView.tsx` (BUG-14)
- In `handleSelectPlanAndCheckout`, blocked unauthenticated/guest users from opening checkout, displaying clear login notification and routing to `/login`.

## 5. `src/components/mobile/views/MobileSettingsView.tsx` (BUG-14)
- Guarded "Nạp thêm" and "Nâng cấp" buttons to trigger `onOpenAuth?.()` for guest users.

## 6. `src/components/AiCreditsTopupModal.tsx` (BUG-14)
- Blocked order initialization in `useEffect` when user is unauthenticated or guest.
- Rendered centered Auth Gate requiring login before topup.

## 7. `api/payment/create-order.ts` (BUG-14)
- Added validation rejecting missing, empty, `'guest'`, `'guest_user'`, or nil UUID `'00000000-0000-0000-0000-000000000000'` with HTTP 401 `{ error: 'Yêu cầu đăng nhập tài khoản thật để tạo đơn hàng thanh toán' }`.

## 8. `api/momo/create-payment.ts` (BUG-14)
- Added validation rejecting missing, empty, `'guest'`, `'guest_user'`, or nil UUID `'00000000-0000-0000-0000-000000000000'` with HTTP 401 `{ success: false, error: 'Yêu cầu đăng nhập tài khoản thật để tạo đơn hàng thanh toán' }`.

## 9. `api/payment/webhook.ts` (BUG-23)
- Removed hardcoded fallback `POMO_VCB_SECRET_KEY_2026`.
- Read from `process.env.POMO_VCB_SECRET_KEY || process.env.PAYMENT_WEBHOOK_SECRET || process.env.VCB_WEBHOOK_SECRET`.
- Enhanced regex matching for Base36 codes (`PFxxxxx`) and interbank formats.

## 10. `scripts/vcb_email_listener.js` (BUG-23)
- Removed hardcoded secret `POMO_VCB_SECRET_KEY_2026`, reading from `PropertiesService.getScriptProperties().getProperty('POMO_VCB_SECRET_KEY')`.
- Implemented 300-item Message ID ring buffer (`PROCESSED_MESSAGE_IDS`) in Script Properties to resolve Gmail thread blackout.
- Removed `-label:VcbProcessed` from Gmail search query.
- Expanded senders to MB Bank, Techcombank, ACB, VPBank, TPBank, MoMo, Vietcombank.
- Handled UTF-8 non-ASCII currency boundaries (`VNĐ`, `đ`) using negative lookahead `(?![a-zA-Z0-9])`.

## 11. `tests/unit/paymentRemediationPhase1.test.ts` (New Test Suite)
- 10 unit test cases covering all 4 bugs:
  - VCB webhook rejects missing secret with 401.
  - VCB webhook records `UNMATCHED_PENDING_MANUAL_REVIEW` and does NOT query `user_entitlements` or grant PRO.
  - Check-status returns `isPaid: false` when order is pending even if user is PRO.
  - Check-status returns `isPaid: true` only on completed/verified_paid transactions.
  - Create-order and create-payment reject guest users with HTTP 401.
  - Create-order accepts authenticated user.
  - Payment webhook rejects mismatched secret.
  - Multi-bank transfer notes and amounts parsed accurately across 6 banks.
