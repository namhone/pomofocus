# WORKER M1 HANDOFF REPORT: PAYMENT & BILLING REMEDIATION (PHASE 1)

**Worker**: Worker M1 (Payment & Billing Remediation)  
**Parent Agent ID**: `852af589-99a0-4469-aaef-ecc462c828ab`  
**Working Directory**: `d:\FileCuaNam\Web'\Pomodoro\.agents\teamwork\worker_m1\`  
**Timestamp**: 2026-11-19T20:48:00Z  
**Status**: COMPLETE (Hard Handoff)  
**Verification Results**: Type-check 0 errors, 29/29 payment unit tests passing (100%)

---

## 1. OBSERVATION

Directly observed vulnerabilities in codebase prior to remediation:

1. **BUG-21 (`api/payment/vcb-webhook.ts`)**:
   - In lines 146-157:
     ```ts
     if (!targetUserId) {
       const recentUserQuery = await fetch(`${supabaseUrl}/rest/v1/user_entitlements?order=updated_at.desc&limit=1&select=user_id`, {
         headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
       });
       if (recentUserQuery.ok) {
         const recent = await recentUserQuery.json();
         if (Array.isArray(recent) && recent.length > 0) {
           targetUserId = recent[0].user_id;
         }
       }
     }
     ```
     When an unrecognized transfer or typo arrived, `targetUserId` was assigned to the most recently active user in the database, granting them PRO for free while dropping the payer's transaction without audit tracking.
   - Line 19 had hardcoded secret fallback: `process.env.VCB_WEBHOOK_SECRET || 'POMO_VCB_SECRET_KEY_2026'`.

2. **BUG-22 (`api/momo/check-status.ts` & `src/components/MoMoPaymentModal.tsx`)**:
   - In `api/momo/check-status.ts:54`:
     ```ts
     if (isPro) isPaid = true;
     ```
     Any user with active PRO status polling on a newly created order was reported as `isPaid = true`.
   - In `src/components/MoMoPaymentModal.tsx:148`:
     ```ts
     if (res.isPaid || res.isPro) {
       handlePaymentSuccess(order.orderId, res.proExpiresAt);
     }
     ```
     Any PRO user opening the modal immediately triggered `handlePaymentSuccess`, granting renewals without payment.

3. **BUG-14 (UI Views & Order Creation APIs)**:
   - `api/payment/create-order.ts:25`:
     ```ts
     const effectiveUserId = userId || '00000000-0000-0000-0000-000000000000';
     ```
     Accepted missing `userId` and mapped to a nil UUID.
   - `api/momo/create-payment.ts:30`:
     ```ts
     const { userId = 'guest_user', planId = '1_month', couponCode } = body;
     ```
     Defaulted to `'guest_user'`, returning real VietQR banking payment URLs without recording a valid user association.
   - `MobileSettingsView.tsx`, `AiCreditsTopupModal.tsx`, `BillingView.tsx`, and `MoMoPaymentModal.tsx` allowed unauthenticated/guest users to trigger checkout, open topup modals, and generate QR payment requests.

4. **BUG-23 (`scripts/vcb_email_listener.js` & `api/payment/webhook.ts`)**:
   - `scripts/vcb_email_listener.js:16`:
     ```js
     const SECRET_KEY = "POMO_VCB_SECRET_KEY_2026";
     ```
   - `api/payment/webhook.ts:1`:
     ```ts
     const WEBHOOK_SECRET = process.env.PAYMENT_WEBHOOK_SECRET || process.env.VCB_WEBHOOK_SECRET || 'POMO_VCB_SECRET_KEY_2026';
     ```
   - In `scripts/vcb_email_listener.js:36`:
     Search query `(from:info.vietcombank.com.vn OR from:vietcombank.com.vn) is:unread newer_than:2d -label:VcbProcessed` and `thread.addLabel(label)` labeled entire threads, permanently skipping subsequent payment emails in the same Gmail thread ("Thread Blackout").
   - Transferred funds from MB Bank, Techcombank, ACB, VPBank, TPBank, or MoMo were ignored due to single-bank filters and limited regex.

---

## 2. LOGIC CHAIN

Step-by-step reasoning and implementation rationale:

1. **Fixing BUG-21 (`api/payment/vcb-webhook.ts`)**:
   - *Observation Reference*: 1.1 (lines 146-157).
   - *Action*: Completely excised lines 146-157.
   - *Remediation*: When `!targetUserId`, the webhook checks `payment_transactions` for `resolvedOrderId`. If present, it updates status to `'UNMATCHED_PENDING_MANUAL_REVIEW'`; if not present, it inserts a new transaction record with `user_id: null`, `status: 'UNMATCHED_PENDING_MANUAL_REVIEW'`, amount, description, and timestamp.
   - *Response*: Returns HTTP 200 with `{ success: true, message: 'Giao dịch không khớp mã đơn hàng/người dùng; đã ghi nhận UNMATCHED_PENDING_MANUAL_REVIEW để đối soát thủ công', status: 'UNMATCHED_PENDING_MANUAL_REVIEW', orderId: resolvedOrderId, amount: numAmount }`. HTTP 200 prevents infinite webhook delivery retries from bank/GAS gateways while safely halting arbitrary PRO activation.
   - *Secret key*: Removed `'POMO_VCB_SECRET_KEY_2026'`. Enforced reading from `process.env.POMO_VCB_SECRET_KEY || process.env.VCB_WEBHOOK_SECRET`.

2. **Fixing BUG-22 (`api/momo/check-status.ts` & `src/components/MoMoPaymentModal.tsx`)**:
   - *Observation Reference*: 1.2.
   - *Action*: In `api/momo/check-status.ts`, completely removed `if (isPro) isPaid = true`. `isPaid` is now strictly `true` only when `payment_transactions` has `status === 'completed' || status === 'verified_paid'`.
   - *Client Modal*: In `src/components/MoMoPaymentModal.tsx`, replaced `if (res.isPaid || res.isPro)` with `if (res.isPaid)`.
   - *Realtime Channel*: Switched Realtime listener in `MoMoPaymentModal.tsx` from generic `user_entitlements` to the specific `payment_transactions` order channel (`filter: order_id=eq.${order.orderId}`).

3. **Fixing BUG-14 (UI & API Guest Checkout Prevention)**:
   - *Observation Reference*: 1.3.
   - *API Endpoints*:
     - In `api/payment/create-order.ts` and `api/momo/create-payment.ts`: Added validation rejecting missing, whitespace, `'guest'`, `'guest_user'`, or nil UUID `'00000000-0000-0000-0000-000000000000'` with HTTP 401 `{ error: 'Yêu cầu đăng nhập tài khoản thật để tạo đơn hàng thanh toán' }`.
   - *UI Views*:
     - `src/components/mobile/views/MobileSettingsView.tsx`: Guarded "Nạp thêm" and "Nâng cấp" buttons to prompt `onOpenAuth?.()` when `!user?.id || user.id === 'guest' || user.id === 'guest_user' || (user as any).isGuest`.
     - `src/components/AiCreditsTopupModal.tsx`: Aborted `/api/payment/create-order` network call on mount if unauthenticated/guest; rendered centered Auth Gate requiring login.
     - `src/components/BillingView.tsx`: In `handleSelectPlanAndCheckout`, redirected guests to `/login` with notification before opening modal.
     - `src/components/MoMoPaymentModal.tsx`: Prevented order initialization and network calls for guests; rendered clean Auth Gate inside modal preventing QR code display.

4. **Fixing BUG-23 (`scripts/vcb_email_listener.js` & `api/payment/webhook.ts`)**:
   - *Observation Reference*: 1.4.
   - *Secret Key*: In `api/payment/webhook.ts`, removed hardcoded secret fallback and read from `process.env.POMO_VCB_SECRET_KEY || process.env.PAYMENT_WEBHOOK_SECRET || process.env.VCB_WEBHOOK_SECRET`. In `scripts/vcb_email_listener.js`, read from `PropertiesService.getScriptProperties().getProperty('POMO_VCB_SECRET_KEY')`.
   - *Thread Blackout Remediation*: In `scripts/vcb_email_listener.js`, replaced thread-level labeling with individual Message ID deduplication using a ring buffer of 300 IDs in Script Properties (`PROCESSED_MESSAGE_IDS`). Removed `-label:VcbProcessed` from Gmail search query, allowing multiple balance emails in the same thread to be processed without loss.
   - *Multi-Bank Support*: Added sender queries for MB Bank, Techcombank, ACB, VPBank, TPBank, MoMo. Expanded regex for Base36 codes (`PFxxxxx`) and amounts with Unicode non-ASCII boundary lookahead (`(?![a-zA-Z0-9])`) to handle `VNĐ` and `đ` safely without regex boundary truncation.

---

## 3. CAVEATS

1. **External Google Apps Script Configuration**:
   - The user/admin must update their Google Apps Script deployment on `script.google.com` by replacing the script content with `scripts/vcb_email_listener.js` and setting **Project Settings > Script Properties** with `POMO_VCB_SECRET_KEY = <secret_value>`.
2. **Supabase Schema Alignment**:
   - In production Supabase, `public.payment_transactions` must allow `user_id` to be `NULL` and `status` to accept `VARCHAR(64)` for storing `'UNMATCHED_PENDING_MANUAL_REVIEW'` records.
3. **Legacy Transfer Code Support**:
   - Regex backwards compatibility for legacy `POMO_xxxxxx` and `SW_xxxxxx` format is retained so existing in-flight bank transfers continue to be credited without manual intervention.

---

## 4. CONCLUSION

Milestone 1 (Payment & Billing Remediation) is 100% complete:
- Arbitrary PRO activation for unrelated active users (BUG-21) is fully eradicated.
- Instant free renewal/extension by existing PRO accounts in check-status (BUG-22) is completely fixed.
- Unauthenticated guest users are strictly blocked at both UI and API levels from generating payment orders or QR codes (BUG-14).
- Hardcoded secrets are eliminated, Gmail thread blackout is solved via individual Message ID ring buffers, and multi-bank transfer notes are fully parsed (BUG-23).
- All 10 modified production files compile with 0 TypeScript errors, and all 29 payment unit tests pass.

---

## 5. VERIFICATION METHOD

### Independent Verification Commands:

```powershell
# 1. Run Phase 1 Dedicated Payment Remediation Test Suite (10 tests)
npx vitest run tests/unit/paymentRemediationPhase1.test.ts

# 2. Run Complete Payment Security and MoMo Test Suites (29 tests)
npx vitest run tests/unit/paymentRemediationPhase1.test.ts tests/unit/paymentSecurity.test.ts tests/unit/momoPayment.test.ts

# 3. Run TypeScript Typecheck (0 errors)
npm run type-check
```

### Files to Inspect:
- `api/payment/vcb-webhook.ts`: Lines 18-25 (secret key), lines 160-220 (UNMATCHED_PENDING_MANUAL_REVIEW logic, removal of user_entitlements fallback).
- `api/momo/check-status.ts`: Line 35 (status check), lines 41-56 (removal of `if (isPro) isPaid = true`).
- `src/components/MoMoPaymentModal.tsx`: Line 68 (auth check), Line 148 (removal of `|| res.isPro`), Lines 199-255 (Auth Gate for guests).
- `src/components/BillingView.tsx`: Lines 146-155 (auth check in checkout).
- `src/components/AiCreditsTopupModal.tsx`: Line 135 (useEffect auth check), Line 228 (Auth Gate).
- `src/components/mobile/views/MobileSettingsView.tsx`: Lines 236 & 267 (auth checks).
- `api/payment/create-order.ts`: Lines 20-25 (401 validation).
- `api/momo/create-payment.ts`: Lines 32-37 (401 validation).
- `api/payment/webhook.ts`: Lines 1-32 (secret key enforcement), lines 42-55 (multi-bank regex).
- `scripts/vcb_email_listener.js`: Lines 15-40 (Script Properties & Message ID ring buffer), lines 45-125 (multi-bank senders and descriptions).
- `tests/unit/paymentRemediationPhase1.test.ts`: Complete unit test coverage for all 4 bugs.

### Invalidation Conditions:
- If `callSupabaseActivatePro` is ever called when `!targetUserId`, this fix is invalidated.
- If `check-status` returns `isPaid: true` when `order_id` is still pending, this fix is invalidated.
- If `create-order` or `create-payment` accepts a request without a valid `userId`, this fix is invalidated.
- If `scripts/vcb_email_listener.js` contains string literal `POMO_VCB_SECRET_KEY_2026`, this fix is invalidated.
