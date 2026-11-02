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

*Mục tiêu: Đã hoàn tất Phase 2 đến Phase 13 — 100% Empirical Pass. Kiểm thử 30/30 test suites, 295/295 Vitest unit tests pass; Vite build thành công không lỗi. Deploy Vercel Production và cập nhật GEMINI_API_KEY cùng bộ lọc Greeting Intent thông minh.*

- [x] **Phase 0 — Chốt tài liệu kiến trúc mục tiêu v3.0**: 8 nguyên tắc bất biến, 2 tầng schema (public/private), Token SHA-256 hash, User Entitlements tách biệt, RLS & GRANT đa tầng, Idempotency & Concurrency, Tiêu chuẩn nghiệm thu 4 nhóm. **[HOÀN THÀNH]**
- [x] **Phase 1 — One-Pass Architecture Review & Final Audit**: Hoàn tất phân tích tĩnh, ma trận 16 ca test, giải quyết toàn bộ 3 lỗi P0 (RLS Default-Deny, thiếu quyền CREATE khi đổi owner, thiếu USAGE trên auth). **[HOÀN THÀNH]**
- [x] **Phase 2 — Chuẩn bị Migration & Test pgTAP (Static Audit Gate PASSED)**: **[HOÀN THÀNH]**
- [x] **Phase 3 — Kiểm thử Môi trường Local & Runtime Verification**: **[HOÀN THÀNH]**
- [x] **Phase 4 — Adapter ứng dụng & Realtime**: **[HOÀN THÀNH]**
- [x] **Phase 5 — Đóng gói & Chuẩn bị Phát hành Bản Beta (PomoFocus Meet)**: **[HOÀN THÀNH]**
- [x] **Phase 6 — WebRTC & Thanh toán MoMo**: Signaling, Media, Reconnect và Serverless IPN webhook. **[HOÀN THÀNH]**
- [x] **Phase 7 — Triển Khai Vercel Production & Kiểm Thử Thực Nghiệm Cuộc Gọi (Live Multi-Context)**: **[HOÀN THÀNH]**
- [x] **Phase 8 — Màn Hình Đăng Nhập 3 Lựa Chọn & Founder VIP 1-Chạm**: **[HOÀN THÀNH]**
- [x] **Phase 9 — Khắc Phục Triệt Để Google OAuth Trên Môi Trường Live & Xác Minh Bằng Chứng**: **[HOÀN THÀNH]**
- [x] **Phase 10 — Bắt Sự Kiện Đăng Nhập OAuth & Đồng Bộ Trạng Thái Supabase (Thoát Trạng Thái Khách)**: **[HOÀN THÀNH]**
- [x] **Phase 11 — Tổng Kiểm Tra Thực Tế (Live End-to-End Audit) Toàn Bộ Hệ Thống AI & 4 Góc Màn Hình**: **[HOÀN THÀNH]**
- [x] **Phase 12 — Tổng Kiểm Tra Chuyên Sâu Toàn Năng Từ A Đến Z (Master Deep Audit A-Z)**: **[HOÀN THÀNH]**
- [x] **Phase 13 — Cấu Hình GEMINI_API_KEY Lên Vercel & Bộ Lọc Chào Hỏi Tự Nhiên (Greeting Intent)**:
  - [x] *Bộ lọc Greeting Intent*: Tách biệt câu chào hỏi ("xin chào", "hi", "hello", "alo",...) với câu hỏi bài tập. Đáp lại thân thiện tự nhiên, tuyệt đối không đưa công thức số e hay thuật toán chia để trị khi chào hỏi. **[HOÀN THÀNH]**
  - [x] *Đồng bộ GEMINI_API_KEY*: Đẩy biến môi trường lên Vercel Production & Preview qua CLI (`AQ.Ab8RN6K9...KA`). **[HOÀN THÀNH]**
  - [x] *Kiểm thử & Deploy Live*: Vitest 30/30 suites pass (295 tests), build Vite 0 lỗi, deploy Vercel Production `dpl_GDLS6rsegRRv7qEHvh18xk6gJhEV` trỏ alias `https://pomofocus-workspace.vercel.app`. Kiểm tra trực tiếp API HTTP 200 trả về câu chào hỏi chuẩn mực. **[HOÀN THÀNH]**

---

## PHẦN 3 — CHECKPOINT & NHẬT KÝ TIẾN ĐỘ THỰC NGHIỆM

- **Thời điểm**: 2026-11-03 06:10
- **Trạng thái**: Đã deploy thành công Vercel Production (`dpl_GDLS6rsegRRv7qEHvh18xk6gJhEV`, Ready) trỏ alias `https://pomofocus-workspace.vercel.app`.
- **Nhật ký hành động & Quyết định kỹ thuật**:
  1. *Cập nhật GEMINI_API_KEY*:
     - Ghi key vào `.env`.
     - Chạy Vercel CLI nạp bí danh cho cả hai môi trường Production và Preview.
  2. *Bộ lọc Greeting Intent*:
     - Thêm hàm `isGreetingIntent()` trong `api/ai/companion.ts` và `src/stores/useAiStore.ts`.
     - Khi người dùng gửi lời chào ("xin chào", "chào bạn", "hi", "hello", "alo", "ê",...): phản hồi ngay lập tức: *"Chào bạn! Mình là PomoFocus AI Study Companion 🎓. Hôm nay bạn đang muốn tập trung ôn môn học nào (Toán, Văn, Anh, Khoa học...), hay cần mình tóm tắt bài giảng nào không nè?"*.
     - Bổ sung chỉ dẫn vào `SYSTEM_INSTRUCTION` của Gemini để xử lý chuẩn mực.
  3. *Kiểm thử thực nghiệm*:
     - Vitest: **30/30 test files passed, 295/295 tests passed (100%)**.
     - Live Endpoint test: Gửi `"xin chào"` ➔ nhận câu chào thân thiện (0ms formula); gửi bài toán Pythagoras ➔ nhận công thức $a^2 + b^2 = c^2$.
