# Original User Request

## Initial Request — 2026-11-19 19:58:43 UTC

/karpathy-guidelines  /security-compliance-compliance-check  /api-security-best-practices  /auth-implementation-patterns  /systematic-debugging  /vn-law-check  /production-code-audit  /verification-before-completion 

NHIỆM VỤ: REMEDIATION PHASE 1 — VÁ TRIỆT ĐỂ BẢO MẬT, DÒNG TIỀN VIETQR/MOMO, ĐỒNG BỘ AUTH & PHÁP LÝ

Không phỏng vấn hỏi lại. Bám sát `docs/reports/FORENSIC_DEEP_AUDIT_REPORT.md` và tuân thủ `/karpathy-guidelines` (sửa phẫu thuật đúng chỗ, viết test kiểm chứng cho từng lỗ hổng):

1. Vá lỗ hổng dòng tiền VietQR / MoMo / Billing:
   - `api/payment/vcb-webhook.ts` (BUG-21): Xóa bỏ hoàn toàn logic fallback gán gói PRO cho user hoạt động gần nhất khi thiếu `targetUserId`; đánh dấu giao dịch không khớp là `UNMATCHED_PENDING_MANUAL_REVIEW`.
   - `api/momo/check-status.ts` (BUG-22): Xóa bỏ `if (isPro) isPaid = true`; chỉ xác nhận thanh toán theo đúng `order_id` cụ thể trong bảng `pending_orders`.
   - `MobileSettingsView.tsx`, `AiCreditsTopupModal.tsx`, `MoMoPaymentModal.tsx`, `BillingView.tsx` & API tạo đơn (BUG-14): Cấm tuyệt đối Guest/chưa đăng nhập tạo đơn hàng hoặc sinh mã QR chuyển tiền; bắt buộc đăng nhập tài khoản thật trước khi vào luồng thanh toán và từ chối ở tầng API nếu thiếu `userId` hợp lệ.
   - `scripts/vcb_email_listener.js` & `api/payment/webhook.ts` (BUG-23): Gỡ secret key hardcode `POMO_VCB_SECRET_KEY_2026` sang biến môi trường / Script Properties; đánh dấu xử lý theo từng Message ID thay vì Thread để không bỏ sót email cùng luồng; mở rộng regex hỗ trợ nội dung chuyển khoản liên ngân hàng (MB, Techcombank, ACB, VPBank, TPBank, MoMo).

2. Bảo vệ PII, Phân quyền Admin & Chống XSS:
   - Xóa sạch SĐT cá nhân `0704862629` khỏi toàn bộ 7 file (`index.html`, `LegalViews.tsx`, `SharedFooter.tsx`, `ContactView.tsx`, `momoService.ts`...) (BUG-04, BUG-71), thay bằng email/kênh hỗ trợ chính thức.
   - Gỡ bỏ `OWNER_EMAILS` hardcode ở client (`SettingsView.tsx`, `AiCompanionWidget.tsx`, `authService.ts`...) (BUG-72), chuyển kiểm tra quyền Admin sang JWT claim / Supabase RLS.
   - Bọc `DOMPurify.sanitize()` cho toàn bộ `dangerouslySetInnerHTML` trong `MinimalDocEditor.tsx`, `NotesWidget.tsx`, `WebDownloadHub.tsx` (BUG-73).

3. Chống mất dữ liệu Auth & Đồng bộ Cloud:
   - `useAuthStore.ts` (BUG-18, BUG-20, BUG-27): Gọi `mergeGuestDataOnLogin` cho Tasks & Notes ngay trong `syncUserFromSupabase` (kể cả khi login Google OAuth); xử lý merge cài đặt dựa trên timestamp thay vì ghi đè mù quáng; bắt buộc kiểm tra 2FA/TOTP trước khi mở khóa phiên nếu tài khoản bật 2FA.
   - `supabase/schema.sql` & `syncQueueService.ts` (BUG-19, BUG-24): Bổ sung bảng `focus_sessions` + RLS policies vào schema để đồng bộ lịch sử tập trung & streak; kích hoạt `syncQueueService.startAutoSync()` trong `App.tsx`.

4. Đối chiếu Pháp lý chuẩn với `vn-law-check`:
   - ĐỐI CHIẾU TRỰC TIẾP với các file trong `.agents/skills/vn-law-check/references/` trước khi sửa trích dẫn luật trong `LegalViews.tsx`, `CookieConsentBanner.tsx`, `AiCompanionWidget.tsx` (BUG-74) — tuyệt đối không xóa nhầm các văn bản 2025–2026 hợp lệ có trong bộ tham chiếu `vn-law-check`.
   - `CookieConsentBanner.tsx` & `SettingsView.tsx` (BUG-75): Thêm nút `"Từ chối"` ngang hàng với `"Đồng ý & Tiếp tục"`, bấm `X` không ghi nhận đồng ý, và thêm nút `"Rút lại sự đồng ý thu thập dữ liệu"` trong Cài đặt.

5. Kiểm chứng & Checklist hạ tầng ngoài:
   - Chạy `npm run type-check` (0 lỗi) và viết/chạy unit tests cho webhook VietQR, `check-status`, merge guest data, `DOMPurify` và `CookieConsentBanner`.
   - Cuối báo cáo BẮT BUỘC liệt kê rõ các thao tác tay tôi cần chạy ngoài repo (chạy SQL migration `focus_sessions` trên Supabase, gắn admin role trên Supabase, copy-paste & đặt Script Properties cho `vcb_email_listener.js` trên `script.google.com`).

## Follow-up — 2026-11-19 20:01:57 UTC

[skip-interview] Bắt đầu thực thi Remediation Phase 1 ngay lập tức. Người dùng đã có chỉ thị dứt khoát: "Không phỏng vấn hỏi lại. Bám sát docs/reports/FORENSIC_DEEP_AUDIT_REPORT.md và tuân thủ /karpathy-guidelines". Yêu cầu đã chi tiết và đầy đủ 100% trong prompt, hãy kích hoạt Project Orchestrator và các Worker triển khai mã nguồn ngay.

## Follow-up — 2026-11-20 03:38:42 UTC

tiếp tục

Quoted Earlier Context & Progress:
NHIỆM VỤ: REMEDIATION PHASE 1 — VÁ TRIỆT ĐỂ BẢO MẬT, DÒNG TIỀN VIETQR/MOMO, ĐỒNG BỘ AUTH & PHÁP LÝ

Không phỏng vấn hỏi lại. Bám sát docs/reports/FORENSIC_DEEP_AUDIT_REPORT.md và tuân thủ /karpathy-guidelines (sửa phẫu thuật đúng chỗ, viết test kiểm chứng cho từng lỗ hổng):

Tiến độ đã hoàn thành và đã kiểm chứng:
1. Milestone M1: Vá dòng tiền VietQR/MoMo/Billing (BUG-21, BUG-22, BUG-14, BUG-23) — HOÀN TẤT & VERIFIED:
   - api/payment/vcb-webhook.ts: xóa fallback gán PRO sai lệch, ghi nhận UNMATCHED_PENDING_MANUAL_REVIEW.
   - api/momo/check-status.ts: xóa `if (isPro) isPaid = true`.
   - MoMoPaymentModal.tsx, BillingView.tsx, AiCreditsTopupModal.tsx, MobileSettingsView.tsx, api/payment/create-order.ts, api/momo/create-payment.ts: Auth Gate chặn guest tạo đơn và sinh QR.
   - scripts/vcb_email_listener.js & api/payment/webhook.ts: secret key ra env, xử lý theo Message ID, regex liên ngân hàng.
   - Test suite tests/unit/paymentRemediationPhase1.test.ts passed 10/10.

2. Milestone M2: PII, Admin RBAC & XSS Sanitization (BUG-04, BUG-71, BUG-72, BUG-73) — HOÀN TẤT & VERIFIED:
   - Xóa số điện thoại 0704862629 khỏi 6 tệp mã nguồn và các tệp test, thay bằng support@pomofocus.vn.
   - Xóa OWNER_EMAILS hardcode ở client trong authService.ts, useAuthStore.ts, profileService.ts, SettingsView.tsx, api/ai/companion.ts; chuyển sang kiểm tra token claims.
   - Cài dompurify, tạo src/utils/sanitize.ts, bọc sanitizeHtml/sanitizeSvg tại toàn bộ dangerouslySetInnerHTML.
   - Test suite tests/unit/securityPiiAndXssRemediation.test.ts passed 20/20.

3. Milestone M3: Auth Data Loss & Supabase Schema (ĐANG THỰC HIỆN DỞ DANG):
   - Đã sửa: taskCloudService.ts (upsert guest notes/sessions lên Cloud), noteCloudService.ts (merge notes theo timestamp), userSettingsService.ts (mergeSettingsOnLogin theo timestamp), useAuthStore.ts (mergeGuestDataOnLogin trong syncUserFromSupabase, 2FA gating trước khi unlock session).
   - Cần hoàn tất ngay:
     - supabase/schema.sql & supabase/migrations/20261120_focus_sessions.sql (BUG-19): Bổ sung DDL bảng focus_sessions + RLS policies vào schema để đồng bộ lịch sử tập trung & streak.
     - src/App.tsx (BUG-24): kích hoạt syncQueueService.startAutoSync() và sửa lỗi gọi useAuthStore.getState().syncUserFromSupabase(user.id) thành loadUserFromCloud(user.id).

4. Milestone M4: Đối chiếu Pháp lý chuẩn với vn-law-check:
   - ĐỐI CHIẾU TRỰC TIẾP với các file trong .agents/skills/vn-law-check/references/ trước khi sửa trích dẫn luật trong LegalViews.tsx, CookieConsentBanner.tsx, AiCompanionWidget.tsx (BUG-74) — tuyệt đối không xóa nhầm các văn bản 2025–2026 hợp lệ có trong bộ tham chiếu vn-law-check.
   - CookieConsentBanner.tsx & SettingsView.tsx (BUG-75): Thêm nút "Từ chối" ngang hàng với "Đồng ý & Tiếp tục", bấm X không ghi nhận đồng ý, và thêm nút "Rút lại sự đồng ý thu thập dữ liệu" trong Cài đặt.

5. Milestone M5: Kiểm chứng & Checklist hạ tầng ngoài:
   - Chạy npm run type-check (0 lỗi) và viết/chạy unit tests cho auth sync, focus_sessions, CookieConsentBanner.
   - Xuất danh mục thao tác tay tôi cần chạy ngoài repo (chạy SQL migration focus_sessions trên Supabase, gắn admin role trên Supabase, copy-paste & đặt Script Properties cho vcb_email_listener.js trên script.google.com).

## Follow-up — 2026-11-21 05:05:36 UTC

[skip-interview] NHIỆM VỤ: REMEDIATION PHASE 2 — SIẾT RLS PAYMENT ORDERS, TÁCH BIỆT ANDROID APK ĐỘC LẬP 100%, NÚT BACK PHẦN CỨNG & GOOGLE OAUTH THẬT

Không phỏng vấn hỏi lại. Bám sát `docs/reports/FORENSIC_DEEP_AUDIT_REPORT.md` và tuân thủ `/karpathy-guidelines`:

0. Siết lại bảo mật RLS `payment_orders` & `payment_transactions` (từ đợt vá SePay vừa rồi):
   - Hiện tại vừa mở quyền `INSERT/UPDATE/SELECT` cho `anon` trên `payment_orders` / `payment_transactions` để phục vụ `create-order.ts` và `check-status.ts`. Hãy chuyển các API serverless (`create-order.ts`, `check-status.ts`, `sepay-webhook.ts`) sang sử dụng `SUPABASE_SERVICE_ROLE_KEY` (hoặc RPC `SECURITY DEFINER` có `SET search_path = public, pg_temp`), đồng thời đóng lại các policy `anon` mở rộng (`USING (true)`) để người ngoài không thể đọc/ghi trực tiếp bảng đơn hàng qua `ANON_KEY`.

1. Tách biệt kiến trúc APK độc lập 100% khỏi Web (BUG-01, 02, 03, 11, 13, 76):
   - Tạo shell/wrapper điều hướng chuẩn cho môi trường `Capacitor.isNativePlatform()`: toàn bộ các màn hình mở từ APK (`LegalViews`, `BillingView`, `ProfileView`, `SettingsView`, `DashboardView`, `DedicatedCalendarView`, `StudyRoomLobby`, `PrivacyDataView`, `AccountSecurityView`, `HelpView`, `ContactView`, `NotFoundPage`) tuyệt đối KHÔNG render `PlatformHeader` Web, `SharedFooter` Web, nút `Tải App Android (APK)` hay `Cài đặt PWA`.
   - Mọi màn hình phụ trong APK phải có thanh Top Bar native gọn gàng kèm nút `← Quay lại` luôn hiển thị trên mobile (`< 640px`).
   - Ẩn hoàn toàn `CookieConsentBanner` kiểu web nổi khi đang chạy trong APK (BUG-03); trên Web, thêm `whitespace-nowrap` cho nút banner không bị gãy 2 dòng.
   - Mở rộng router deep link xử lý các đường dẫn nội bộ và bổ sung nút quay lại trên `NotFoundPage` (BUG-11).

2. Nút Back phần cứng Android, Edge-to-Edge Insets & Splash/Offline (BUG-04, 05, 06, 07, 12):
   - `MainActivity.java` & `MobileAppShell.tsx` (BUG-05): Xây dựng back-stack tập trung cho tất cả modal/drawer/bottom-sheet; `canGoBackInApp` phải luôn `true` khi còn bất kỳ sheet/route phụ nào đang mở; ở màn hình gốc mới áp dụng bấm Back 2 lần trong 2 giây để thoát app.
   - Android 15 Edge-to-Edge (BUG-06, 07): Gỡ bỏ `max-h-[56px]` khỏi `MobileBottomNav.tsx` và `MobileAppShell.tsx`, tính chiều cao động `calc(56px + env(safe-area-inset-bottom, 0px))` và thêm `pb-safe` cho đáy các view để thanh Gesture hệ thống không đè chữ; đưa `pt-safe` vào padding bên trong header thay vì tạo dải đen cắt ngang đầu ảnh nền.
   - Gắn logo PomoFocus tối giản vào `#pomo-splash-curtain` trong `index.html` (BUG-04) và đảm bảo KaTeX CSS/fonts hoạt động offline qua Workbox/local bundle (BUG-12).

3. Google OAuth thật trên APK & Đồng bộ Danh tính User (BUG-15, 16, 17):
   - `MobileAuthBottomSheet.tsx` & `googleAuthService.ts` (BUG-15): Loại bỏ fallback rơi vào tài khoản mock `nam.studyworkspace@gmail.com` và hạn chế sinh ID giả `usr_g_...`; triển khai luồng Supabase Native Google OAuth thật qua `@capacitor/browser` + Deep Link `pomofocus://oauth/callback` (hoặc plugin Google Auth chuẩn Capacitor) để nhận UUID thật từ Supabase Auth.
   - Đồng bộ 1 nguồn dữ liệu duy nhất cho `UserAvatar` (`rounded-full`, sửa `ProfileView.tsx:362` hết bị vuông `rounded-2xl` và ẩn icon `Mail` trơ trọi khi trống), tên hiển thị (nới `max-w` trên `PlatformHeader.tsx:555`), số dư Credits và hàm chuẩn hóa `getSubscriptionBadge(user)` xuyên suốt Header, Dropdown, Profile và APK (BUG-13, 16, 17).

4. Sửa dứt điểm cắt chữ & logic hiển thị trên Mobile (BUG-08, 09, 10, 33, 34):
   - `MobileSettingsView.tsx` & `MobileStepperRow.tsx` (BUG-10, 34): Đổi lưới 5 phím tắt bị bóp nghẹt sang lưới 2 hàng / 3 cột để không còn `"Thống..."`, `"Gói cư..."`; cho phép mô tả stepper xuống dòng tự nhiên thay vì cắt `...`.
   - `MobileFocusView.tsx` (BUG-08, 09): Sửa logic 4 chấm tròn vòng đấu (vòng hiện tại dùng viền/pulse thay vì sáng đặc cả 4 chấm xanh khi đang ở 24:58, tránh progress bar đè chữ `Hiệp x/y`); thêm ô tạo nhanh công việc ngay trong Task Picker dropdown khi danh sách trống (0/0).

5. Kiểm chứng & Tự động cập nhật Supabase (nếu có sửa SQL):
   - Nếu có cập nhật SQL RLS, tự dùng `/browser` chạy lên `pgsgmmtpunuttspqcgof` (không bắt user chạy tay).
   - Chạy `npm run type-check` (0 lỗi), chạy test liên quan, kiểm tra build Capacitor Android (`npx cap sync android`) và liệt kê rõ bất kỳ cấu hình nào cần trên **Supabase Auth Dashboard** (Redirect URLs) / **Google Cloud Console** (SHA-1) nếu Google Login APK cần xác thực.

Context bổ sung từ hệ thống:
- Supabase Project ID: `pgsgmmtpunuttspqcgof` (`pomofocus-live`)
- Vercel Production: `https://pomofocus-workspace.vercel.app` (dự án `pomodoro-workspace`, scope `axis-be33`)
- Báo cáo lỗi chi tiết: `docs/reports/FORENSIC_DEEP_AUDIT_REPORT.md` (chứa đầy đủ danh mục lỗi BUG-01 đến BUG-76)
- Quy chuẩn UI/UX bắt buộc: `docs/UI_UX_DESIGN_PLAYBOOK_AND_POSTMORTEM.md` (Z-Index Hierarchy, Safe Area, State Singularity, Cloud-first persistence).

## Follow-up — 2026-11-21 08:35:55 UTC

tiếp tục
