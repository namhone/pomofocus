# BÁO CÁO KIỂM TOÁN TOÀN DIỆN & PHÂN TÍCH NGUYÊN NHÂN GỐC (ROOT-CAUSE ANALYSIS)

**Ngày kiểm toán:** 28/11/2026  
**Mục tiêu kiểm toán:** `https://pomofocus-workspace.vercel.app` & toàn bộ mã nguồn PomoFocus (`src/`, `api/`, `supabase/`)

---

## 1. Phân tích Nguyên nhân gốc (Tại sao hệ thống hay phát sinh lỗi mất đồng bộ?)

Qua rà soát kiến trúc nguồn (`src/index.css`, `src/services/platformRoutes.ts`, `src/stores/`, `src/services/`, `api/`, `supabase/migrations/`), có **4 nguyên nhân gốc về thiếu Single Source of Truth (SSOT)**:

1. **Phân mảnh Whitelist & Logic Entitlement (`OWNER_EMAILS` / `hasVipAccess` / `isOwnerEmail`)**:
   - *Hiện trạng trước khi vá*: Logic `OWNER_EMAILS` và kiểm tra quyền VIP bị sao chép ở nhiều nơi: `src/utils/userBadge.ts`, `src/services/authService.ts`, `src/stores/useAiStore.ts` (tự khai báo mảng `OWNER_EMAILS` riêng), và `src/services/profileService.ts` (khai báo `export const OWNER_EMAILS: readonly string[] = [];` rỗng).
   - *Hệ quả*: Dễ xảy ra tình trạng Header/Badge hiển thị một hạng gói, trong khi AI Store hoặc Paywall lại nhận diện hạng gói khác.
   - *Khắc phục*: Hợp nhất `useAiStore.ts` sử dụng trực tiếp `OWNER_EMAILS`, `isOwnerEmail`, `isVipFriend` từ `src/services/authService.ts`.

2. **Rò rỉ kênh Realtime trong `StudyRoomView.tsx`**:
   - *Hiện trạng trước khi vá*: `StudyRoomView.tsx:2246` gọi `supabase.removeChannel(\`room:${roomId}\`)` — truyền vào **string** thay vì object `RealtimeChannel` (`channel`) mà Supabase SDK yêu cầu.
   - *Hệ quả*: Khi rời/vào lại phòng học nhóm, kênh Realtime cũ không được gỡ khỏi client, dẫn tới tồn đọng listener trùng lặp hoặc trạng thái phòng trễ/lệch.
   - *Khắc phục*: Sửa thành `if (channel && supabase && typeof supabase.removeChannel === 'function') { void supabase.removeChannel(channel); }`.

3. **Tự động kích hoạt Google One-Tap / FedCM khi mount `AuthView.tsx`**:
   - *Hiện trạng trước khi vá*: `AuthView.tsx` tự gọi `googleAuthService.initializeGsi()` + `promptOneTap()` ngay khi mở `/login` hoặc `/signup`. Trên trình duyệt chưa đăng nhập Google hoặc môi trường headless/preview, FedCM phát sinh `console.error` (`Provider's accounts list is empty`, `[GSI_LOGGER]: FedCM get() rejects with NetworkError`, CORS `accounts.google.com/gsi/style`).
   - *Khắc phục*: Bỏ tự động `promptOneTap()` khi mount, giữ luồng đăng nhập Google chính thức qua nút `Tiếp tục với Google` (`handleGoogleSignIn` -> Supabase OAuth).

4. **Phân tán Token UI & Breakpoint đa nền tảng**:
   - *Hiện trạng*: Một số trang vệ tinh & widget dùng song song `#09090b`/`bg-white` cũ với Cool-Slate (`#0F1115`/`#171A21`/`#60A5FA`), hoặc dùng breakpoint `max-width: 767px` khiến `Split 640px` bị đẩy sang `MobileWebPortal` thay vì dùng được `/app` 1 cột. Đã chuẩn hóa qua `index.css`, `PlatformHeader.tsx`, `CookieConsentBanner.tsx`, `useLayoutStore.ts`, `WidgetContainer.tsx`, `AuthView.tsx`, `SharedFooter.tsx`, `AiCreditsTopupModal.tsx`.

---

## 2. Kết quả Kiểm toán 4 Trụ cột

### Trụ cột 1 — Frontend UI/UX & Interaction
- **Live Playwright & Axe WCAG (`https://pomofocus-workspace.vercel.app`)** trên 4 mốc (`360x800`, `640x800`, `1024x768`, `1440x900`) × 12 route (`/`, `/download`, `/app`, `/rooms`, `/billing`, `/profile`, `/account/security`, `/login`, `/contact`, `/help`, `/terms`, `/privacy`):
  - **48/48 ca** đạt `overflow: false` (`scrollWidth === innerWidth`).
  - **48/48 ca** đạt `brokenImgsCount: 0`.
  - **Axe WCAG 2.0 A/AA**: `0` vi phạm trên `/`, `/download`, `/app`, `/billing`, `/login`.
  - **0 `pageerror`**.
  - **Interactive Audit (`POMOFOCUS_INTERACTIVE_AUDIT.pdf`)**: `64/64` ca tương tác đạt (`0 CRITICAL`, `0 MAJOR`, `0 MINOR`).
  - **`POMO_AUDIT_CASES=workspace-credits-guest-login`**: **PASS** (nút Đăng nhập trong Credits modal điều hướng chuẩn sang `/login` trên Desktop Web).

### Trụ cột 2 — Tài khoản, Avatar, Huy hiệu gói & Bảo mật
- **Avatar & Profile (`UserAvatar.tsx`, `userAvatarUnified.test.tsx`, `avatarSynchronization.test.ts`, `unifiedAuthAndAvatarSync.test.ts`)**:
  - 3 tầng ưu tiên (`Custom Upload` > `Google OAuth` > `SVG chữ cái đầu`) hoạt động chuẩn, có `object-cover rounded-full`, reset `imgError` khi URL đổi, khách vãng lai hiển thị chữ `K`.
- **Bảo mật & Cách ly phiên (`useAuthStore.ts`, `totpSecurity.test.ts`, `founderEntitlementContract.test.ts`)**:
  - `logout()` xóa sạch `localProfileCache`, đặt lại `user: null`, `useAiStore` về `guestCredits`, `useTaskStore` và `useNoteStore` về rỗng rồi nạp lại dữ liệu khách; không rò rỉ dữ liệu tài khoản cũ.

### Trụ cột 3 — Backend, API, Supabase & Đồng bộ dữ liệu
- **Serverless API (`api/payment/sepay-webhook.ts`, `api/payment/create-order.ts`, `api/payment/check-status.ts`, `api/ai/companion.ts`, `api/coupons.ts`, `api/rooms.ts`)**:
  - `sepay-webhook.ts`: Xác thực `Apikey` (`401` khi sai/thiếu key), kiểm tra `transferType === 'in'`, số tiền `> 0` (`400`), fail-fast `500` nếu thiếu `SUPABASE_SERVICE_ROLE_KEY`, ghi nhận `UNMATCHED_PENDING_MANUAL_REVIEW` nếu không khớp mã đơn.
  - `20261121_tighten_payment_rls.sql`: Bật RLS cho `payment_orders` & `payment_transactions`, chặn `anon` hoàn toàn, chỉ cho owner `SELECT`/`INSERT` đơn của chính mình và chỉ `service_role` được `UPDATE`.
- **Vitest Backend/Sync/Security (10 suite)**: `10/10` file, `122/122` test PASS (`paymentOrderRlsSecurity`, `sepayWebhook`, `paymentSecurity`, `totpSecurity`, `founderEntitlementContract`, `userAvatarUnified`, `avatarSynchronization`, `unifiedAuthAndAvatarSync`, `syncQueueConflictContract`, `cloudSyncRealtime`).
