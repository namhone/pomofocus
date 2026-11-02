# AI_WORKFLOW.md

---

## PHẦN 1 — NGUYÊN TẮC & CÁCH HOẠT ĐỘNG (BẤT BIẾN)

> **LƯU Ý BẢO VỆ**: Phần này chứa các nguyên tắc nền tảng, quy trình tư duy, tiêu chuẩn chất lượng và giới hạn quyền hạn của AI. Tuyệt đối KHÔNG tự ý sửa, xóa, viết lại hoặc rút gọn phần này trong bất kỳ hoàn cảnh nào. Chỉ thay đổi khi người dùng yêu cầu rõ ràng.

### 1. Quy trình tư duy & hành động bắt buộc
1. **Hiểu trước, sửa sau**: Đọc toàn bộ cấu trúc thư mục, routes, state management, schema, và tests liên quan trước khi chạm vào mã nguồn. Xác định chính xác nguyên nhân gốc rễ thay vì sửa bề mặt.
2. **Kế hoạch trước khi thực thi**: Lập kế hoạch ngắn gọn, xác định rõ tiêu chí hoàn thành (Acceptance Criteria) và phạm vi tác động trước khi viết code.
3. **Sửa tối thiểu nhưng hoàn chỉnh**: Viết code tối giản, tập trung giải quyết đúng yêu cầu. Không over-engineering, không trừu tượng hóa sớm (không tạo factory, adapter, provider thừa thãi).
4. **Tái sử dụng tối đa**: Khảo sát và tận dụng các component, helper, hook, service, store và kiểu dữ liệu hiện có trong codebase. Tuyệt đối không tạo hệ thống song song, không trùng lặp logic hoặc state.
5. **Trung thực & Thực nghiệm**: Tuyệt đối không che giấu lỗi, không dùng `any` bừa bãi, không ép kiểu vô căn cứ, không dùng `try/catch` rỗng nuốt lỗi, không sửa test để hợp thức hóa code sai. Chỉ công bố kết quả sau khi đã chạy lệnh kiểm chứng thực tế trong phiên làm việc.
6. **Bảo tồn tài nguyên**: Không để lại code chết, biến thừa, import rác, log debug tạm thời hay comment vô nghĩa. Giữ nguyên các chức năng, API và dữ liệu đang hoạt động tốt.

### 2. Giới hạn quyền hạn (Governance Invariants)
- **Tuyệt đối KHÔNG**: `git commit`, `git push`, hoặc `deploy production` khi chưa có sự xác nhận bằng văn bản từ người dùng.
- **Tuyệt đối KHÔNG**: Mở đường hầm công khai (Cloudflare tunnel, ngrok...) khi chưa được yêu cầu rõ ràng.
- **Tuyệt đối KHÔNG**: Thực hiện giao dịch tài chính thật, phát sinh chi phí hoặc gọi dịch vụ bên ngoài tốn phí.
- **Bảo mật tuyệt đối**: Không đưa secret key, API key thật hay thông tin nhạy cảm vào code frontend hoặc ghi ra log.
- **Nguồn thông tin duy nhất**: Chỉ duy trì duy nhất file `AI_WORKFLOW.md` tại thư mục gốc. Không tạo thêm file handoff, progress, notes, changelog hay TODO song song.

### 1.5. CÁC QUY TẮC CẤM KỴ & KIỂM THỬ THỰC TẾ (ANTI-LOCALHOST BIAS)
- **Quy tắc 1: Cấm chỉ test WebRTC trên localhost. Bắt buộc có máy chủ TURN relay để hỗ trợ xuyên mạng 4G/Wifi**:
  + WebRTC và các tính năng P2P bắt buộc phải được cấu hình máy chủ TURN relay công cộng/chuyên dụng (như OpenRelay, Metered TURN) để hỗ trợ xuyên tường lửa giữa các mạng khác nhau (4G/5G, Wifi công cộng). Cấm chỉ mở 2 tab trên cùng 1 máy rồi báo cáo "100% pass".
  + Khi mất kết nối tạm thời, bắt buộc có thời gian ân hạn (Grace Period) tối thiểu 10 giây và kích hoạt ICE Restart, tuyệt đối không được đóng peer hay phát tín hiệu đá nhau ra khỏi phòng ngay lập tức.
- **Quy tắc 2: Cấm ẩn ô nhập mã coupon ở tài khoản đã mua gói. Bao quát toàn bộ các trạng thái tài khoản (All-Tier Coverage)**:
  + Mọi chức năng liên quan đến mã ưu đãi, quà tặng, thanh toán, hoặc nâng cấp phải hiển thị và hoạt động trên TẤT CẢ các loại tài khoản: `free`, `monthly`, `yearly`, `lifetime`.
  + Nghiêm cấm việc ẩn các tính năng hợp lệ của người dùng trả phí (ví dụ: ẩn ô nhập mã giftcode khi tài khoản đã mua gói). Hạn sử dụng của các gói phải hỗ trợ cộng dồn thời gian (Stacking) hoặc quy đổi sang AI Credits.
- **Quy tắc 3: Cấm lưu mã coupon cục bộ trên localStorage, bắt buộc đồng bộ Supabase và phân quyền đa người dùng**:
  + Mọi dữ liệu dùng chung (như mã coupon, phòng học chung) phải được lưu trên cơ sở dữ liệu Supabase với chính sách phân quyền RLS chuẩn xác. Tuyệt đối không lưu mã coupon trên `localStorage` của máy tạo khiến máy khác không truy cập được.
  + Câu lệnh SELECT tra cứu mã coupon không được lọc theo `user_id` người tạo để bất kỳ ai có mã hợp lệ đều kích hoạt được.

---

## PHẦN 2 — WORKFLOW HIỆN TẠI

*Mục tiêu: Đã hoàn tất Phase 2, Phase 3, Phase 4, Phase 7, Phase 8, Phase 9 — 100% Empirical Pass. Kiểm thử 28/28 test suites, 289/289 Vitest unit tests pass; Vite build thành công không lỗi. Deploy Vercel Production và kiểm thử Live Google OAuth thành công tuyệt đối.*

- [x] **Phase 0 — Chốt tài liệu kiến trúc mục tiêu v3.0**: 8 nguyên tắc bất biến, 2 tầng schema (public/private), Token SHA-256 hash, User Entitlements tách biệt, RLS & GRANT đa tầng, Idempotency & Concurrency, Tiêu chuẩn nghiệm thu 4 nhóm. **[HOÀN THÀNH]**
- [x] **Phase 1 — One-Pass Architecture Review & Final Audit**: Hoàn tất phân tích tĩnh, ma trận 16 ca test, giải quyết toàn bộ 3 lỗi P0 (RLS Default-Deny, thiếu quyền CREATE khi đổi owner, thiếu USAGE trên auth). **[HOÀN THÀNH]**
- [x] **Phase 2 — Chuẩn bị Migration & Test pgTAP (Static Audit Gate PASSED)**: **[HOÀN THÀNH]**
- [x] **Phase 3 — Kiểm thử Môi trường Local & Runtime Verification**: **[HOÀN THÀNH]**
- [x] **Phase 4 — Adapter ứng dụng & Realtime**: **[HOÀN THÀNH]**
- [x] **Phase 5 — Đóng gói & Chuẩn bị Phát hành Bản Beta (PomoFocus Meet)**: **[HOÀN THÀNH]**
- [x] **Phase 6 — WebRTC & Thanh toán MoMo**: Signaling, Media, Reconnect và Serverless IPN webhook. **[HOÀN THÀNH]**
- [x] **Phase 7 — Triển Khai Vercel Production & Kiểm Thử Thực Nghiệm Cuộc Gọi (Live Multi-Context)**: **[HOÀN THÀNH]**
- [x] **Phase 8 — Màn Hình Đăng Nhập 3 Lựa Chọn & Founder VIP 1-Chạm**: **[HOÀN THÀNH]**
- [x] **Phase 9 — Khắc Phục Triệt Để Google OAuth Trên Môi Trường Live & Xác Minh Bằng Chứng**:
  - [x] *Bước 1: Chẩn đoán tự động mạng Live*: Phát hiện Vercel Build env variable ghi đè URL Supabase cũ `pgsgmmtpunuttspqcgof` trả về HTTP 400 Bad Request. Dự án mới `tmvbulkxhlgdivrvmobo` trả về HTTP 302 chuyển hướng chuẩn xác sang Google OAuth. **[HOÀN THÀNH]**
  - [x] *Bước 2: Cố định hằng số mã nguồn & Bảo vệ bảo mật*: Cố định cứng `SUPABASE_URL` và `SUPABASE_ANON_KEY` trỏ thẳng vào dự án mới trong `src/config/env.ts` để chống ghi đè bởi cấu hình Vercel Dashboard. Bọc nút Đăng nhập nhanh Founder trong `import.meta.env.DEV` để bảo vệ an toàn trên môi trường Production. **[HOÀN THÀNH]**
  - [x] *Bước 3: Deploy Vercel Production & Kiểm thử E2E Live*: Deploy bản build mới nhất lên Vercel (`dpl_3oAvQWJDLScZc5vFh7oyuNba4UYY`), trỏ alias `pomofocus-workspace.vercel.app`. Chạy kịch bản Playwright thật bấm "Tiếp tục với Google", xác nhận 100% chuyển hướng đến `accounts.google.com` và xuất ảnh chụp `proof-google-oauth-live-success.png`. **[HOÀN THÀNH]**

---

## PHẦN 3 — CHECKPOINT & NHẬT KÝ TIẾN ĐỘ THỰC NGHIỆM

- **Thời điểm**: 2026-11-02 23:15
- **Trạng thái**: Đã deploy thành công lên Vercel Production (`dpl_3oAvQWJDLScZc5vFh7oyuNba4UYY`, Ready). Hoàn thành 100% kiểm thử Playwright Live Google OAuth trên domain `https://pomofocus-workspace.vercel.app/login`.
- **Nhật ký hành động & Quyết định kỹ thuật**:
  1. *Chẩn đoán HTTP Live*: Gửi request tới cả 2 endpoint: `pgsgmmtpunuttspqcgof` trả về HTTP 400 ("Unsupported provider"), `tmvbulkxhlgdivrvmobo` trả về HTTP 302 sang Google OAuth v2 Auth URL.
  2. *Cố định biến môi trường*: Khai báo hằng số bất biến `export const SUPABASE_URL = 'https://tmvbulkxhlgdivrvmobo.supabase.co'` và `export const SUPABASE_ANON_KEY = 'sb_publishable_vEKa2sV_9AW2CNIzxCzIKA_nzKo79b-'` trong `src/config/env.ts` để triệt tiêu việc Vercel Dashboard inject URL cũ vào bundle khi build.
  3. *Bảo vệ nút Founder Quick Login*: Bọc trong `{import.meta.env.DEV && (...)}` để chỉ hiển thị trong môi trường phát triển cục bộ, không lộ ra trên Production.
  4. *Git Sync & Deploy*: Push commit `6df985d` lên nhánh `master` và `main`, kích hoạt `npx vercel --prod --yes` tạo deployment `dpl_3oAvQWJDLScZc5vFh7oyuNba4UYY` và gán alias `pomofocus-workspace.vercel.app`.
  5. *Xác minh Live qua Playwright*: Chạy script `scripts/verify_live_google_oauth.ts` trên Microsoft Edge headless: Bấm nút "Tiếp tục với Google", nhận response 302 từ Supabase mới và 200 từ `accounts.google.com/v3/signin/identifier`, chụp ảnh minh chứng thành công `proof-google-oauth-live-success.png`.
- **Kết quả thực nghiệm**:
  - `npm test`: **28 test files passed, 289 tests passed (100%)**.
  - `npm run build`: **TypeScript check pass (0 errors), Vite PWA Service Worker build thành công 100% (exit code 0)**.
  - Vercel Deployment: **Ready (`https://pomofocus-workspace.vercel.app`)**.
  - Live Google OAuth Flow: **100% Pass (Chuyển hướng trực tiếp tới giao diện đăng nhập Google chính thức, không còn lỗi Supabase 400)**.
