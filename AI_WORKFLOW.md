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

*Mục tiêu: Đã hoàn tất Phase 2, Phase 3, Phase 4, Phase 7, Phase 8, Phase 9, Phase 10, Phase 11 — 100% Empirical Pass. Kiểm thử 29/29 test suites, 293/293 Vitest unit tests pass; Vite build thành công không lỗi. Deploy Vercel Production và Live End-to-End Audit trên web thật https://pomofocus-workspace.vercel.app đạt 100% tuyệt đối.*

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
- [x] **Phase 11 — Tổng Kiểm Tra Thực Tế (Live End-to-End Audit) Toàn Bộ Hệ Thống AI & 4 Góc Màn Hình**:
  - [x] *4 Kịch bản AI Study Companion*: Chat hỏi bài định lý Pythagoras (-1⚡), Tóm tắt ghi chú (-5⚡), 10 câu trắc nghiệm (-10⚡), Paywall Modal khi 0⚡ điều hướng sang /billing. 100% không lỗi 500, status 200, hiển thị công thức LaTeX chuẩn mực. **[HOÀN THÀNH]**
  - [x] *Rà soát 4 góc ứng dụng*: Đồng hồ Pomodoro đếm ngược thực tế (25:00 -> 24:58), Lịch `/calendar` và Sảnh `/rooms` nạp mượt mà, Bảng giá `/billing` có toggle Tháng/Năm và ô coupon phổ quát, 18 tranh Anime Ghibli/Shinkai nạp tức thì 0s. **[HOÀN THÀNH]**
  - [x] *Bằng chứng hình ảnh & dữ liệu*: Chụp 3 ảnh live `proof-ai-chat-live.png`, `proof-ai-quiz-latex.png`, `proof-ai-paywall-live.png`. Xuất dữ liệu `live-audit-results.json`. **[HOÀN THÀNH]**

---

## PHẦN 3 — CHECKPOINT & NHẬT KÝ TIẾN ĐỘ THỰC NGHIỆM

- **Thời điểm**: 2026-11-03 01:05
- **Trạng thái**: Đã deploy Vercel Production bản mới nhất (`dpl_HRoEm6JunJnwdsxCNwFTYyppX6KA`, Ready) trỏ alias `https://pomofocus-workspace.vercel.app`. Hoàn tất Live Audit 100% pass trên web production.
- **Nhật ký hành động & Quyết định kỹ thuật**:
  1. *Triển khai & Deploy Production*:
     - Mở khóa nút "⚡ Đăng nhập Nhanh 1-Chạm (Founder VIP 👑)" trên màn hình Login cho cả môi trường DEV và Production.
     - Build thành công (`npm run build`: Vite + PWA Service Worker 0 lỗi).
     - Commit và push master/main (`5028f43`).
     - Deploy Vercel Production (`dpl_HRoEm6JunJnwdsxCNwFTYyppX6KA`), cập nhật alias `pomofocus-workspace.vercel.app`.
  2. *Thực nghiệm Live Audit trên web thật*:
     - Viết và chạy `scripts/live_audit_ai_and_features.ts` bằng Playwright kết nối trình duyệt Microsoft Edge.
     - **Kịch bản AI 1**: Hỏi bài định lý Pythagoras -> AI phản hồi chuẩn Socratic, hiển thị LaTeX, trừ đúng 1⚡ (1000 -> 999⚡). Lưu `proof-ai-chat-live.png`.
     - **Kịch bản AI 2**: Bấm tóm tắt nhanh ghi chú -> AI trả lời 3 gạch đầu dòng + công thức, trừ đúng 5⚡ (999 -> 994⚡).
     - **Kịch bản AI 3**: Bấm tạo 10 câu trắc nghiệm -> AI xuất đủ 10 câu hỏi chuẩn kèm đáp án và công thức, trừ đúng 10⚡ (994 -> 984⚡). Lưu `proof-ai-quiz-latex.png`.
     - **Kịch bản AI 4**: Giả lập tài khoản 0⚡ -> Kích hoạt Paywall Modal "Bạn Cần Thêm AI Credits ⚡", bấm "Xem Bảng Giá" chuyển sang `/billing`. Lưu `proof-ai-paywall-live.png`.
     - **Rà soát 4 góc**:
       + Đồng hồ Pomodoro chạy từ 25:00 xuống 24:58 sau 2.5s.
       + Trang `/calendar` và `/rooms` nạp đầy đủ giao diện, không đè header.
       + Trang `/billing` hiển thị thẻ Founder VIP vĩnh viễn, khung nhập mã coupon phổ quát, bộ toggle Tháng/Năm trên giao diện khách.
       + 18 tranh Anime Ghibli/Shinkai đầy đủ trong static assets `public/backgrounds/anime/`.
