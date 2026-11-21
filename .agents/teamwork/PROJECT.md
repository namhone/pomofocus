# Project: Pomofocus Remediation Phase 1
# Scope: Security, VietQR/MoMo Payment Engine, Auth Sync & VN Legal Compliance

## Architecture
- Tech Stack: Vite, React 18, TypeScript, Tailwind CSS, Supabase Cloud, Dexie.js, Vitest
- Module Boundaries & Data Flows:
  - Payment Engine: `api/payment/vcb-webhook.ts`, `api/momo/check-status.ts`, `api/payment/create-order.ts`, `scripts/vcb_email_listener.js`. Single source of truth is `payment_transactions` with status `'UNMATCHED_PENDING_MANUAL_REVIEW'` and `'completed'`. No PRO fallback. Mandatory auth guards.
  - Security & PII: `index.html`, `LegalViews.tsx`, `SharedFooter.tsx`, `ContactView.tsx`, `momoService.ts`, `middleware.ts`. Support channel is `support@pomofocus.vn`. Admin role determined by Supabase JWT claims `app_metadata.role === 'admin'`. HTML sanitized via `DOMPurify.sanitize()`.
  - Auth Store & Sync Queue: `useAuthStore.ts`, `taskCloudService.ts`, `noteCloudService.ts`, `userSettingsService.ts`, `focus_sessions` table in Supabase. Guest data merged synchronously before store loads. 2FA gate enforces TOTP check before unlock.
  - VN Law & Consent: Strict adherence to `vn-law-check` references (Luật 91/2025/QH15, NĐ 356/2025/NĐ-CP, Luật 134/2025/QH15, NĐ 142/2026/NĐ-CP). Cookie banner with explicit "Từ chối", close without consent, and consent revocation in Settings.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | VCB Webhook PRO Fallback Removal | Remove `user_entitlements` fallback in `vcb-webhook.ts`; mark unmatched transactions as `UNMATCHED_PENDING_MANUAL_REVIEW` | M1 | Explorer 1, BUG-21 |
| 2 | Check-Status Strict Order ID Validation | Remove `if (isPro) isPaid = true` in `check-status.ts` and `|| res.isPro` in `MoMoPaymentModal.tsx` | M1 | Explorer 1, BUG-22 |
| 3 | Payment Guest Order Creation Block | Enforce login guards in `MobileSettingsView`, `AiCreditsTopupModal`, `MoMoPaymentModal`, `BillingView`; reject missing userId with HTTP 401 | M1 | Explorer 1, BUG-14 |
| 4 | VCB Email Listener Hardening | Remove hardcoded `POMO_VCB_SECRET_KEY_2026`; switch to Script Properties; per-Message ID deduplication; multi-bank regex (MB, TCB, ACB, VPB, TPB, MoMo) | M1 | Explorer 1, BUG-23 |
| 5 | PII Phone Number Removal | Replace `0704862629` across 6 production files and tests with `support@pomofocus.vn` | M2 | Explorer 2, BUG-04, BUG-71 |
| 6 | Hardcoded Admin Emails Removal | Migrate `OWNER_EMAILS` client checks in `authService.ts`, `useAuthStore.ts`, `SettingsView.tsx`, `AiCompanionWidget.tsx`, `profileService.ts`, `companion.ts` to JWT claims & Supabase RLS | M2 | Explorer 2, BUG-72 |
| 7 | DOMPurify XSS Sanitization | Install `dompurify` + `@types/dompurify`, create `src/utils/sanitize.ts`, wrap `dangerouslySetInnerHTML` in `MinimalDocEditor`, `NotesWidget`, `WebDownloadHub`, `WhiteboardView` | M2 | Explorer 2, BUG-73 |
| 8 | Guest Tasks & Notes Merge on Login | Call `mergeGuestDataOnLogin` in `syncUserFromSupabase` before loading stores; push migrated notes/sessions to Supabase Cloud | M3 | Explorer 3, BUG-18, BUG-20 |
| 9 | Timestamp-Based Settings Merge | Compare `updated_at` / `last_modified` in `userSettingsService` instead of blind cloud overwrite | M3 | Explorer 3, BUG-20 |
| 10 | 2FA/TOTP Gate on OAuth Login | Enforce 2FA verification in `syncUserFromSupabase` before unlocking session if `two_factor_enabled` | M3 | Explorer 3, BUG-27 |
| 11 | Supabase `focus_sessions` Schema & RLS | Add DDL and RLS policies for `focus_sessions` in `supabase/schema.sql` and migration file | M3 | Explorer 3, BUG-19 |
| 12 | AutoSync & String ID Fix | Invoke `syncQueueService.startAutoSync()` on mount in `App.tsx`; fix `syncUserFromSupabase(user.id)` string call | M3 | Explorer 3, BUG-24 |
| 13 | VN Law Legal Citations Alignment | Retain verified 2025-2026 citations (Luật 91/2025/QH15, NĐ 356/2025/NĐ-CP, Luật 134/2025/QH15) in `LegalViews.tsx`, `CookieConsentBanner.tsx`, `AiCompanionWidget.tsx` | M4 | Explorer 3, BUG-74 |
| 14 | Cookie Consent Decline & Revocation | Add "Từ chối" button, prevent 'X' from accepting consent, add "Rút lại sự đồng ý thu thập dữ liệu" in `SettingsView.tsx` | M4 | Explorer 3, BUG-75 |
| 15 | Remediation Unit Test Suite | Write unit tests for VCB webhook, check-status, guest merge, DOMPurify sanitization, cookie consent | M5 | Prompt Item 5 |
| 16 | Verification & External Checklist | Run `npm run type-check`, all tests passing, assemble complete manual ops checklist | M5 | Prompt Item 5 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Payment & Billing Remediation | Features 1, 2, 3, 4 | none | DONE |
| M2 | Security, PII & XSS Sanitization | Features 5, 6, 7 | none | DONE |
| M3 | Auth Sync & Supabase Schema | Features 8, 9, 10, 11, 12 | none | DONE |
| M4 | Legal Compliance & Cookie Consent | Features 13, 14 | none | DONE |
| M5 | Test Suite, Verification & Final Audit | Features 15, 16 | M1, M2, M3, M4 | DONE |

## Code Layout
- `api/payment/vcb-webhook.ts` — Vietcombank payment webhook handler
- `api/momo/check-status.ts` — Order payment status check endpoint
- `api/payment/create-order.ts`, `api/momo/create-payment.ts` — Payment order creation endpoints
- `scripts/vcb_email_listener.js` — Google Apps Script for Vietcombank email parsing
- `src/components/MobileSettingsView.tsx`, `src/components/AiCreditsTopupModal.tsx`, `src/components/MoMoPaymentModal.tsx`, `src/components/BillingView.tsx` — Payment modals & views
- `index.html`, `src/components/LegalViews.tsx`, `src/components/SharedFooter.tsx`, `src/components/ContactView.tsx`, `src/services/momoService.ts`, `middleware.ts` — PII & legal texts
- `src/services/authService.ts`, `src/stores/useAuthStore.ts`, `src/components/SettingsView.tsx`, `src/components/AiCompanionWidget.tsx`, `src/services/profileService.ts`, `api/ai/companion.ts` — Admin authorization & auth state
- `src/utils/sanitize.ts`, `src/components/MinimalDocEditor.tsx`, `src/components/NotesWidget.tsx`, `src/components/WebDownloadHub.tsx`, `src/components/WhiteboardView.tsx` — XSS Sanitization
- `src/services/taskCloudService.ts`, `src/services/noteCloudService.ts`, `src/services/userSettingsService.ts`, `src/services/syncQueueService.ts`, `src/App.tsx` — Cloud sync & queue
- `supabase/schema.sql`, `supabase/migrations/20261120_focus_sessions.sql` — Database schema & migrations
- `src/components/CookieConsentBanner.tsx` — Cookie consent banner
- `tests/unit/` — Unit test suite
