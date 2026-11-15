# Original User Request

## Initial Request — 2026-11-15T06:31:40Z

/ui-skills /ui-ux-pro-max /ui-ux-designer /ui-visual-validator /backend-architect /backend-dev-guidelines /team-composition-analysis /uiux-pro-max /karpathy-guidelines /deep-research /browser

# ĐỢT 2/4: ĐẠI PHẪU PHÒNG HỌC MEET (/rooms) — PHÒNG MA, SPLIT-BRAIN, ĐA THIẾT BỊ & GIAO DIỆN

## YÊU CẦU THỰC THI
Tự đọc trực tiếp `StudyRoomView.tsx`, `WhiteboardView.tsx`, `WebRTCConnectionManager.ts`, `studyRoomService.ts`, `api/rooms.ts`. Chủ động tra cứu tài liệu Supabase Realtime & MDN WebRTC. Chứng minh bằng kịch bản Playwright 3 thiết bị thật qua Cloud (không pre-seed `localStorage`).

## DANH MỤC LỖI CẦN XỬ LÝ TRIỆT ĐỂ TRONG ĐỢT 2
1. **Lỗi Split-Brain (2 phòng cùng link) & Phòng ma khi Chủ phòng thoát/xóa**:
   - Dùng một `roomId` chuẩn duy nhất từ bảng `study_rooms` trên Supabase Cloud (cấm tự tạo phòng cục bộ lệch UUID giữa các máy).
   - Khi Chủ phòng thoát hoặc xóa phòng: cập nhật trạng thái phòng trên server, phát `ROOM_CLOSED` / `ROOM_DELETED` qua Realtime để thông báo và đưa toàn bộ thành viên ra ngoài dứt khoát; thực hiện `untrack()`, `removeChannel()`, `RTCPeerConnection.close()` và `.stop()` toàn bộ `MediaStream` tracks trên mọi lối thoát (kể cả Back/unload) để không kẹt đèn Camera/Mic; xóa sạch nét vẽ/chat của phòng đã xóa; người giữ link cũ vào lại phải thấy báo phòng đã kết thúc.
   - Khóa quyền điều khiển Đồng hồ nhóm & đóng phòng chỉ cho Host (xác thực server/room state, không tin mù quáng payload client); có cơ chế xử lý an toàn khi Host rớt mạng đột ngột.
2. **Đa thiết bị, WebRTC & Chống rớt ngầm**:
   - Dùng `clientSessionId` + `userId` làm khóa Presence và hiển thị phân biệt thiết bị (`Máy tính` / `Điện thoại`) khi 1 tài khoản vào nhiều máy; chặn bão thông báo `"X đã vào phòng"` lúc `initialSync`/reconnect; hỗ trợ F5/reload vào lại đúng phòng; reset badge tin nhắn chưa读 khi đổi phòng và hiển thị badge đúng trên Mobile; tự dọn trạng thái Giơ tay/Emoji khi rời phòng.
   - Web Worker heartbeat chống `Silent Disconnection`; tự động `restartIce()` & tái tạo peer khi đổi mạng WiFi <-> 4G; thêm cảnh báo/nút chế độ chỉ âm thanh tiết kiệm 4G khi mạng chặn P2P (hết vòng xoay kẹt mãi) và giới hạn số luồng Video Mesh để tránh nóng máy; kiểm tra sanitize chống XSS/HTML Injection trong tên phòng & chat.
3. **Bảng vẽ (`Whiteboard`)**:
   - Chuẩn hóa tọa độ thế giới (world coordinates) giữa Desktop `16:9` và Mobile dọc; tách 2 lớp canvas (nét đã vẽ + nét đang kéo) chống giật lag sau nhiều giờ vẽ; dùng `Broadcast` throttle 50ms/60ms chống rate-limit; giới hạn kích thước ảnh/số trang PDF chống OOM crash WebView; gọi `URL.revokeObjectURL()` chống rò rỉ RAM; khóa `touch-action: none` trên canvas Mobile.
   - Tách vùng riêng biệt (Zone Isolation): thu dải camera thành viên nang `[ 📹 3 ]` không đè thanh công cụ vẽ; hiển thị đủ `Undo/Redo`, chọn màu, thanh zoom và không cắt chữ nút `Tài liệu` trên Mobile; bỏ hướng dẫn `"Lăn chuột... giữ Space"` & `".docx"` trên điện thoại -> `"Thả ảnh đề thi hoặc PDF vào đây"`.
4. **Dọn sạch giao diện Meet (Desktop & Mobile)**:
   - **Top Bar tối đa 3 cụm 1 dòng (`whitespace-nowrap`)**: `[ ← Tên phòng ]` | `[ Video | Bảng vẽ ]` | `[ 👥 3 · Mời · ⋯ ]`, đưa quản trị/mã mời vào menu `⋯`, gỡ bỏ `Rời phòng`/`BETA`/`MASTER ADMIN`/`FREE`, thêm nút Mời/Copy link trên Mobile, ẩn nút `PiP` chết trên APK.
   - Xóa thanh banner xanh dương; hiển thị Đồng hồ nhóm dạng pill gọn đồng nhất trên **cả Desktop lẫn Mobile**; sửa ô video thứ 3 bị đen trống không tên, thay hộp đen tắt cam bằng nền kính mờ có Avatar căn giữa, chia lưới cân đối; thu nút Dock xuống `38px` đơn sắc (xóa trùng lặp nút AI/Cài đặt, trên Mobile chỉ giữ 5 nút vừa khít màn hình và ẩn nút `Chia sẻ màn hình` không chạy trên Android WebView).

## NGHIỆM THU ĐỢT 2
- Chạy `npm run type-check`, `v81MeetRoomsAndWhiteboard` unit tests và Playwright Multi-Device E2E 3 trình duyệt thật, chụp ảnh đối chiếu Desktop + Mobile Meet không rớt dòng, không đè lấp.

---

### Bối cảnh hệ thống hiện tại:
- Nhánh `master`, commit `7c076d8` đã hoàn tất Đợt 1/4 (SafeStorage, Dexie.js v3, `<UserAvatar />` thống nhất, RFC4122 UUID v4, soft delete tombstones, sync queue backoff, timer engine, payment webhook).
- Đọc và tuân thủ nghiêm ngặt cẩm nang `docs/UI_UX_DESIGN_PLAYBOOK_AND_POSTMORTEM.md` (Z-Index Layer Hierarchy `z-10` -> `z-60`, State Singularity, Founder Whitelist `hasVipAccess(user)` và `OWNER_EMAILS`, Dynamic Layout Flow `pt-3`/`pt-14` & `pb-28`).
- Máy chủ phát triển Vite đang chạy nền tại `http://0.0.0.0:5173`.
