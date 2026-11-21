## 2026-11-21T05:11:37Z
You are teamwork_explorer 1.
Your working directory is: d:\FileCuaNam\Web'\Pomodoro\.agents\teamwork\explorer_survey_1
Your parent is orchestrator_p2 (conversation ID cf5bc11e-435c-4f27-a55e-a32f3bebfefa).

Read ORIGINAL_REQUEST.md at: d:\FileCuaNam\Web'\Pomodoro\.agents\teamwork\ORIGINAL_REQUEST.md
Read FORENSIC_DEEP_AUDIT_REPORT.md at: d:\FileCuaNam\Web'\Pomodoro\docs\reports\FORENSIC_DEEP_AUDIT_REPORT.md

TASK: Survey Backend & Auth Security for Remediation Phase 2:
1. Item 0: Siết RLS `payment_orders` & `payment_transactions`:
   - Inspect `api/payment/create-order.ts`, `api/payment/check-status.ts`, `api/payment/sepay-webhook.ts`.
   - Check how Supabase client is initialized in serverless functions (does it have access to `SUPABASE_SERVICE_ROLE_KEY` or `process.env.SUPABASE_SERVICE_ROLE_KEY`?).
   - Inspect existing SQL migrations/policies on `payment_orders` and `payment_transactions` in `supabase/migrations/` and `supabase/schema.sql`.
   - Detail the exact SQL DDL/DCL to revoke/drop public `anon` policies (`USING (true)`) and switch serverless APIs to use `SUPABASE_SERVICE_ROLE_KEY` or SECURITY DEFINER RPC with `SET search_path = public, pg_temp`.
2. Item 3: Real Google OAuth on APK & Android Deep Linking (BUG-15):
   - Inspect `MobileAuthBottomSheet.tsx`, `googleAuthService.ts`, and `authService.ts`.
   - Locate where the mock fallback `nam.studyworkspace@gmail.com` and synthetic ID `usr_g_...` are generated.
   - Investigate how Supabase OAuth can be performed in Capacitor with `@capacitor/browser` + Deep Link `pomofocus://oauth/callback` (or App URL open listener) to receive real session tokens and Supabase Auth UUID.
   - Inspect `android/app/src/main/AndroidManifest.xml` for custom URL schemes and intent filters.
   - Identify required Supabase Auth Redirect URLs and Google Cloud Console SHA-1 / package name configurations.

Document your full investigation, line-by-line evidence, and exact solution proposals in `d:\FileCuaNam\Web'\Pomodoro\.agents\teamwork\explorer_survey_1\handoff.md`.
Maintain `progress.md` in your directory.
When finished, send a message to parent cf5bc11e-435c-4f27-a55e-a32f3bebfefa with your completion summary and path to handoff.md.
