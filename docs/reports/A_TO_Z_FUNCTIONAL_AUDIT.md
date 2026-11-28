# Báo Cáo Kiểm Thử Chức Năng Toàn Diện (A-to-Z Functional Audit)

- **Ngày thực hiện**: 2026-11-28
- **Phạm vi**: Dọn 3 cảnh báo nhỏ từ lượt `591356e`, kiểm thử End-to-End từ A tới Z trên `vite preview` + Playwright (không `force: true`, không `waitForTimeout`), kiểm thử Store/API/Supabase/SePay bằng Vitest, và vá triệt để lỗi đệ quy `logout()`.

---

## 1. Dọn 3 cảnh báo nhỏ từ lượt `591356e`

| STT | Cảnh báo | Nguyên nhân & Biện pháp xử lý | Tệp liên quan | Trạng thái |
| :--- | :--- | :--- | :--- | :--- |
| 1 | `ai_messages.credits_used` thiếu trong schema cache | `CONSOLIDATED_MASTER_OPS_20261120.sql` thiếu cột `user_id`, `action_type`, `credits_used`, `attachment_url`, `attachment_name`, `is_truncated` so với `20261104000001_cloud_first_tasks_notes_ai.sql`. Đã bổ sung migration idempotent `20261128_ensure_ai_messages_columns.sql`, cập nhật `CONSOLIDATED_MASTER_OPS_20261120.sql`, và thêm fallback schema-cache trong `AiChatService.saveMessage`. | `src/services/aiChatService.ts`, `supabase/migrations/20261128_ensure_ai_messages_columns.sql`, `supabase/migrations/CONSOLIDATED_MASTER_OPS_20261120.sql` | **PASS** |
| 2 | `validateDOMNesting` trong `AdminCouponManager.tsx` | Bỏ `<UiSymbol name="👑" />` và `<UiSymbol name="⚡" />` (`<svg>`) ra khỏi thẻ `<option>`. | `src/components/AdminCouponManager.tsx` | **PASS** |
| 3 | Màu `H1` chưa đồng bộ `#ECEFF4` trên `/billing`, `/profile`, `/account/security` | Đổi `text-white` thành `text-[#ECEFF4]` (`rgb(236, 239, 244)`) trên các thẻ `<h1>` của 3 view (giữ nguyên toàn bộ phần Codex). | `src/components/BillingView.tsx`, `src/components/ProfileView.tsx`, `src/components/AccountSecurityView.tsx` | **PASS** |

---

## 2. Lỗi thực tế phát hiện & đã vá trong quá trình kiểm thử A-to-Z

- **`RangeError: Maximum call stack size exceeded` khi gọi `logout()`**:
  - **Nguyên nhân gốc**: `useAuthStore.logout()` gọi `authService.logout()` → `supabase.auth.signOut()` phát sự kiện `SIGNED_OUT` → `App.tsx` lắng nghe `onAuthStateChange` và gọi ngược lại `useAuthStore.getState().logout()`, gây vòng lặp đệ quy vô hạn.
  - **Khắc phục**: Cập nhật state `user: null, isAuthenticated: false` trước khi gọi `authService.logout()`, thêm guard đầu hàm `if (!get().isAuthenticated && !get().user) return;` trong `src/stores/useAuthStore.ts`, và thêm guard tương ứng ở nhánh `SIGNED_OUT` trong `src/App.tsx`.
  - **Kiểm chứng lại**: `billing-cycles-and-logout-clear` chuyển từ `FAIL` sang `PASS` (`0` `pageerror`, `user` về `null`).

---

## 3. Bảng nghiệm thu chi tiết từng chức năng (A-to-Z)

### A. Portal & Điều hướng (`/` , `/download`, `/help`, `/contact`, `/terms`, `/privacy`, `/about`, `/not-found-404`)

| ID / Ca kiểm thử | Trigger Action | Actual Outcome | Trạng thái | Môi trường |
| :--- | :--- | :--- | :--- | :--- |
| `portal-cookie-banner` | Mở `/` → click `Đồng ý & tiếp tục` → reload | Banner ẩn sau click, lưu `localStorage['pomofocus_consent_v1'] = 'accepted'` & giữ nguyên sau reload | **PASS** | Vite Preview (Thật trên trình duyệt) |
| `portal-landing-ctas` | Click CTA `Bắt đầu học ngay`, `Xem gói cước`, `Tải app Android` trên `/` | Điều hướng chính xác tới `/app`, `/billing`, `/download` | **PASS** | Vite Preview (Thật trên trình duyệt) |
| `portal-download-desktop-mobile` | Mở `/download` `1440px` → click `Sao chép liên kết tải APK` | Clipboard chứa link tải APK hợp lệ, hiện dung lượng `9.80 MB` | **PASS** | Vite Preview (Thật trên trình duyệt) |
| `portal-download-mobile-360` | Mở `/download` `360x800` | Nút `central-apk-download-btn` hiển thị rõ, `0` tràn ngang | **PASS** | Vite Preview (Thật trên trình duyệt) |
| `help-all-faq` | Mở `/help` (`390px`) → bấm mở/đóng lần lượt 5 câu FAQ | Đủ 5 mục FAQ, `aria-expanded` chuyển đổi `true`/`false` chính xác | **PASS** | Vite Preview (`satelliteInteractionAudit.cjs`) |
| `contact-valid-submit` | Mở `/contact` → điền form hợp lệ → `Gửi thông điệp` | Hiện card `Nội dung email đã sẵn sàng` kèm cảnh báo minh bạch | **PASS** | Vite Preview (`satelliteInteractionAudit.cjs`) |
| `contact-copy-email` & `contact-validation-targets` | Mở `/contact` → bấm `Sao chép vào bộ nhớ tạm` & submit rỗng | Copy `support@pomofocus.vn` vào clipboard; vùng chạm `>= 44x44px`; focus + `scrollMarginTop: 84px` | **PASS** | Vite Preview (`satelliteInteractionAudit.cjs`) |
| `portal-legal-404` | Truy cập `/terms`, `/privacy`, `/about`, `/not-found-404` | Đủ thẻ `H1`, hiển thị trang 404 fallback chuẩn | **PASS** | Vite Preview (Thật trên trình duyệt) |

### B. Không gian học `/app` (`1440x900`, `1024x768`, `640x800`)

| ID / Ca kiểm thử | Trigger Action | Actual Outcome | Trạng thái | Môi trường |
| :--- | :--- | :--- | :--- | :--- |
| `app-responsive-viewports` | Mở `/app` tại `1440x900`, `1024x768`, `640x800` | Hiển thị `Timer` + `Tasks`, `0` tràn ngang ở cả 3 kích thước | **PASS** | Vite Preview (Thật trên trình duyệt) |
| `workspace-timer` & `workspace-mini-pill-lock` | Chuyển `Focus/Short/Long Break`, `Start/Pause/Skip/Reset`, `Mini-pill`, `Lock` | State `useTimerStore` & `useLayoutStore` chuyển đúng, mini-pill play/pause/expand mượt | **PASS** | Vite Preview (`satelliteInteractionAudit.cjs`) |
| `workspace-native-discipline-pocket` | Bật/tắt `Kỷ luật` & giữ mở khóa `Khóa` (mô phỏng Native shell `390px`) | `aria-pressed="true"` & overlay khóa mở bằng giữ `1700ms` | **PASS** | Vite Preview + Native Bridge Mock |
| `app-tasks-crud-filter-reload` | Mở `Tasks` → thêm `"Ôn tập IELTS Reading"` → reload trang | Dữ liệu giữ nguyên qua IndexedDB/Zustand sau reload | **PASS** | Vite Preview (Thật trên trình duyệt) |
| `app-notes-ai-insert-reload` | Mở `Notes` → nhập tiêu đề `"Ghi chú kiểm thử A-Z"` + nội dung → reload | Tiêu đề & nội dung giữ nguyên sau reload | **PASS** | Vite Preview (Thật trên trình duyệt) |
| `workspace-calendar`, `workspace-spaces`, `workspace-audio`, `workspace-audio-drag`, `workspace-media` | Thêm lịch widget, lọc hình nền + mở chỉnh nền, bật âm thanh + kéo slider, mở station picker + Play/Next media | Toàn bộ widget hoạt động bình thường, slider cập nhật đúng giá trị | **PASS** | Vite Preview (`satelliteInteractionAudit.cjs`) |
| `app-ai-companion-guest` & `workspace-credits-guest-login` | Mở `AI Companion Drawer` → click `Giải bài tập`; click `Credits` → `Đăng nhập` | Drawer mở ở `zIndex >= 80`, điền prompt; luồng guest điều hướng về `/login` | **PASS** | Vite Preview (Thật trên trình duyệt) |
| `app-capsule-full-header-no-open-web` & `workspace-capsule-*` | Click `capsule-credits-btn`, `capsule-settings-btn`, `capsule-home-btn`, `capsule-avatar-btn`, `capsule-expand-btn` | Mở đúng modal/route; Full Header trên `/app` không hiện thừa nút `"Mở bản web"` | **PASS** | Vite Preview (Thật trên trình duyệt) |

### C. Phòng học nhóm, Thống kê, Lịch, Cài đặt, Dữ liệu (`/rooms`, `/dashboard`, `/calendar`, `/settings`, `/privacy-data`)

| ID / Ca kiểm thử | Trigger Action | Actual Outcome | Trạng thái | Môi trường |
| :--- | :--- | :--- | :--- | :--- |
| `rooms-guest-create`, `rooms-code-invalid`, `rooms-code-valid` | Guest bấm tạo phòng; nhập mã sai `not-a-real-room`; nhập mã đúng `pod-free-01` | Guest về `/login`; mã sai báo không tồn tại; mã đúng hiện nút tham gia | **PASS** | Vite Preview + Realtime Mock |
| `dashboard-filters` | Chuyển 3 bộ lọc `7 ngày qua`, `Tuần này`, `Tháng này` | Biểu đồ `focus-trend-chart` render ổn định ở cả 3 chế độ | **PASS** | Vite Preview (`satelliteInteractionAudit.cjs`) |
| `deep-calendar-crud` & `deep-calendar-week-card` | Chuyển `Tuần`/`Ngày`/`Hôm nay`, validation rỗng/giờ `25`, tạo/sửa/reload/xóa | Validation chặn dữ liệu sai, CRUD giữ qua reload, card tuần `>= 44x44px` | **PASS** | Vite Preview + Native Bridge Mock |
| `settings-persistence` | Đổi Pomodoro `32`, Short Break `7`, chọn `Chuông pha lê`, chỉnh slider → reload | Giá trị giữ nguyên sau reload | **PASS** | Vite Preview (`satelliteInteractionAudit.cjs`) |
| `privacy-refresh-export-cancel` & `deep-privacy-keyboard` | Bấm `Làm mới`, `Xuất tệp JSON`, mở modal xóa → kiểm tra nút khóa, `Tab`/`Shift+Tab`/`ESC` | File JSON tải về hợp lệ; nút xóa bị disable khi chưa nhập xác nhận; focus trap & `ESC` chuẩn | **PASS** | Vite Preview (`satelliteInteractionAudit.cjs`) |

### D. Tài khoản, Avatar, Bảo mật, Thanh toán & Backend (`/login`, `/signup`, `/profile`, `/account/security`, `/billing`, SePay)

| ID / Ca kiểm thử | Trigger Action | Actual Outcome | Trạng thái | Môi trường |
| :--- | :--- | :--- | :--- | :--- |
| `auth-login-signup-validation-google-home` | Mở `/login` → kiểm tra nút Google OAuth, submit rỗng, click `← Trang chủ` | Có `btn-google-signin`, quay về `/`, `0` console error `FedCM`/`GSI` | **PASS** | Vite Preview (Thật trên trình duyệt) |
| `h1-cool-slate-billing-profile-security` | Kiểm tra computed color `H1` trên `/billing`, `/profile`, `/account/security` | Tất cả trả về `rgb(236, 239, 244)` (`#ECEFF4`) | **PASS** | Vite Preview + Member Fixture |
| `deep-profile-member-validation` & `founder-avatar-badge-sync` | Sửa tên hiển thị rỗng/hợp lệ + reload; kiểm tra badge `FOUNDER` | Validation chính xác, giữ tên sau reload; Founder hiện `FOUNDER` & badge kích hoạt vĩnh viễn | **PASS** | Vite Preview + Member/Founder Fixture |
| `deep-security-password` | Đổi mật khẩu yếu (`abc`) & mật khẩu xác nhận không khớp | Báo đúng thông báo validation | **PASS** | Vite Preview + Member Fixture |
| `deep-security-totp` (Vitest `totpSecurity.test.ts`) | Tạo secret TOTP, xác minh mã, bật/tắt 2FA | `17/17` unit tests pass trên tầng `totpService` *(Lưu ý: case E2E `deep-security-totp` trong `satelliteInteractionAudit.cjs` import `/src/services/totpService.ts` nên chỉ chạy trên Vite dev server)* | **PASS** (Unit) | Vitest (`totpSecurity.test.ts`) |
| `billing-cycles-and-logout-clear` | Chuyển `Tháng`/`Năm`/`Trọn đời` trên `/billing` → gọi `useAuthStore.getState().logout()` | Không còn lỗi đệ quy `Maximum call stack size exceeded`, `user` về `null` | **PASS** | Vite Preview + Member Fixture |
| Backend SePay & Payment RLS & Founder SSOT | Chạy Vitest `paymentOrderRlsSecurity`, `sepayWebhook`, `paymentSecurity`, `founderEntitlementContract` | `74/74` tests pass (`401` API key, idempotency, RLS strict, fail-fast `500`, Founder SSOT) | **PASS** | Vitest (Mocked Supabase/HTTP) |
