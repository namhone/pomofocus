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

---

## PHẦN 2 — WORKFLOW HIỆN TẠI

*Mục tiêu: Đã hoàn tất Phase 2, Phase 3, Phase 4 và Đóng gói Bản Beta (PomoFocus Meet) — 100% Empirical Pass. Kiểm thử 39/39 assertions pgTAP & benchmark concurrency 5 tiến trình độc lập trên Portable PostgreSQL 16 tại D:\pgsql; 145/145 Vitest unit tests pass; Vite build thành công không lỗi. Tuyệt đối KHÔNG tự ý chạm remote Supabase, KHÔNG sửa mã ứng dụng frontend ngoài phạm vi duyệt, KHÔNG commit/push/deploy.*

- [x] **Phase 0 — Chốt tài liệu kiến trúc mục tiêu v3.0**: 8 nguyên tắc bất biến, 2 tầng schema (public/private), Token SHA-256 hash, User Entitlements tách biệt, RLS & GRANT đa tầng, Idempotency & Concurrency, Tiêu chuẩn nghiệm thu 4 nhóm. **[HOÀN THÀNH]**
- [x] **Phase 1 — One-Pass Architecture Review & Final Audit**: Hoàn tất phân tích tĩnh, ma trận 16 ca test, giải quyết toàn bộ 3 lỗi P0 (RLS Default-Deny, thiếu quyền CREATE khi đổi owner, thiếu USAGE trên auth). **[HOÀN THÀNH]**
- [x] **Phase 2 — Chuẩn bị Migration & Test pgTAP (Static Audit Gate PASSED)**:
  - [x] *Bước 1: Khảo sát hiện trạng repository*: Xác nhận chưa có thư mục supabase/, chưa có file migration cũ, app đang chạy mock IndexedDB/localStorage. **[HOÀN THÀNH]**
  - [x] *Bước 2: Tạo bản nháp migration 1*: `supabase/migrations/20261029000001_meet_schema_and_tables.sql` (bổ sung CREATE SCHEMA extensions, 6 bảng, constraints, indexes). **[HOÀN THÀNH]**
  - [x] *Bước 3: Tạo bản nháp migration 2*: `supabase/migrations/20261029000002_meet_security_and_rpc.sql` (Explicit RLS Policies, Just-in-Time owner transfer, 6 RPCs SECURITY DEFINER với Double-Checked Locking, xử lý 4 trạng thái membership, thu hồi EXECUTE khỏi PUBLIC). **[HOÀN THÀNH]**
  - [x] *Bước 4: Tạo bản nháp bộ kiểm thử*: `supabase/tests/database/meet_concurrency_and_security.test.sql` (39 assertions pgTAP nguyên tử, scalar subqueries, schema auth đầy đủ, cơ chế nạp rate-limit chống trôi 10s). **[HOÀN THÀNH]**
  - [x] *Bước 5: Thẩm định tĩnh độc lập đạt chuẩn (Pass Static Audit)*. **[HOÀN THÀNH]**
- [x] **Phase 3 — Kiểm thử Môi trường Local & Runtime Verification**:
  - [x] *Thiết lập PostgreSQL 16 Portable trên ổ D (`D:\pgsql`)*: Cụm DB chạy cô lập hoàn toàn, không ảnh hưởng ổ C. **[HOÀN THÀNH]**
  - [x] *Chạy Migration 1 & 2*: Áp dụng thành công toàn bộ schema, bảng, RLS và 6 RPCs. **[HOÀN THÀNH]**
  - [x] *Chạy trọn vẹn bộ pgTAP 39 assertions*: Đạt 39/39 OK (100% pass), không có lỗi. **[HOÀN THÀNH]**
  - [x] *Kiểm thử đồng thời đa tiến trình thực tế (Multi-session Concurrency Benchmark)*: Bắn 5 tiến trình độc lập đồng thời kiểm chứng triệt để chống over-subscription và chống tiêu tốn quota khi retry cùng message ID. **[HOÀN THÀNH]**
- [x] **Phase 4 — Adapter ứng dụng & Realtime**: 
  - [x] *Tầng Adapter*: Interface `IMeetRepository`, `LocalMeetAdapter` (Dexie/BroadcastChannel), `SupabaseMeetAdapter` (6 RPCs + Exponential Backoff Retry), `meetRepository` factory. **[HOÀN THÀNH]**
  - [x] *Tầng Realtime & Defense-in-Depth Teardown*: `MeetRealtimeService`, kênh `room:<roomId>`, `postgres_changes` (INSERT room_messages, UPDATE room_memberships revoked, UPDATE study_rooms closed), `presence` sync Pomodoro state, và Teardown tự động 3 tầng trong `useMeetStore`. **[HOÀN THÀNH]**
  - [x] *Kiểm thử hồi quy & Build*: 145/145 unit tests pass 100% (128 test cũ + 17 test mới), Vite PWA build thành công tuyệt đối. **[HOÀN THÀNH]**
- [x] **Phase 5 — Đóng gói & Chuẩn bị Phát hành Bản Beta (PomoFocus Meet)**:
  - [x] *Tổng hợp Migration Cloud*: Tạo file `supabase/release_beta_supabase_cloud.sql` tổng hợp toàn diện extensions, schema `meet_internal`, 6 bảng, indexes, explicit RLS, 6 SECURITY DEFINER RPCs và Supabase Realtime publication (loại trừ hoàn toàn auth mock). Đã kiểm chứng thực nghiệm trên PostgreSQL local. **[HOÀN THÀNH]**
  - [x] *Chuẩn hóa cấu hình môi trường*: Tạo file `.env.example` với các tham số mẫu sẵn sàng cho production (Vercel/Netlify). **[HOÀN THÀNH]**
  - [x] *Đánh nhãn giao diện & thông báo Beta*: Bổ sung badge BETA tại Lobby & View; hiển thị thông báo thân thiện hướng dẫn khi người dùng click Mic/Camera P2P. **[HOÀN THÀNH]**
  - [x] *Nghiệm thu toàn diện*: 145/145 Vitest unit tests pass 100%, `npm run build` (`tsc` + `vite build`) exit code 0. **[HOÀN THÀNH]**
- [ ] **Phase 6 — WebRTC & Thanh toán MoMo**: Signaling, Media, Reconnect và Serverless IPN webhook. **[CHƯA LÀM]**

---

## PHẦN 3 — CHECKPOINT

- **Đang làm**: Đã hoàn thành đóng gói kỹ thuật cho bản phát hành Beta (PomoFocus Meet). Sẵn sàng chuyển giao tài liệu hướng dẫn triển khai 3 bước cho người dùng.
- **Danh sách file cốt lõi đã triển khai**:
  1. `supabase/release_beta_supabase_cloud.sql`: Script SQL phát hành độc lập cho Supabase Cloud SQL Editor (Schema, Tables, Policies, RPCs, Publication).
  2. `.env.example`: Hướng dẫn cấu hình biến môi trường production (`VITE_ENABLE_SUPABASE_MEET=true`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
  3. `src/components/StudyRoomLobby.tsx`: Đã gắn nhãn BETA badge cho sảnh chờ Meet.
  4. `src/components/StudyRoomView.tsx`: Đã gắn nhãn BETA badges (Desktop/Mobile) và toast notice cho mic/camera.
  5. `src/types/meet.ts`: Hợp đồng kiểu dữ liệu, Interface `IMeetRepository`, `PresenceState`, `RealtimeCallbacks`.
  6. `src/config/env.ts` & `src/lib/supabase.ts`: Client RPC PostgREST và Realtime Channel Adapter tương thích Supabase v2.
  7. `src/services/meet/supabaseAdapter.ts` & `src/services/meet/localAdapter.ts`: Bộ Adapter kép kèm retry backoff.
  8. `src/services/meet/meetRepository.ts`: Factory Singleton phân giải adapter dựa trên Feature Flag.
  9. `src/services/meet/realtimeService.ts`: Client Realtime Service quản lý kênh `room:<roomId>`.
  10. `src/stores/useMeetStore.ts`: Zustand store quản lý state phòng học, presence, tin nhắn và cơ chế Teardown 3 tầng.
  11. `tests/unit/meetRepository.test.ts` & `tests/unit/meetRealtime.test.ts`: Bộ 17 unit tests bao phủ toàn bộ adapter, retry, realtime listeners, presence tracking và kick/close teardown.
- **Kết quả thực nghiệm**:
  - `npm test`: **14 test files passed, 145 tests passed (100%)**.
  - `npm run build`: **TypeScript check pass (0 errors), Vite PWA Service Worker build thành công 100% (exit code 0)**.
- **Tuân thủ quản trị**:
  - Không tự ý cài đặt package ngoài, không commit, không push, không deploy, không chạm database remote Supabase Cloud.
