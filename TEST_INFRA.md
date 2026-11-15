# TEST INFRASTRUCTURE & SYSTEMATIC TEST SUITE SPECIFICATION
> **PomoFocus V8.1: Đại Phẫu Phòng Học Meet (`/rooms`) — Đợt 2/4**  
> **Tác giả:** Test Writer Agent (teamwork_test_writer_e2e)  
> **Chuẩn tuân thủ:** 4-Tier Test Pyramid, UI/UX Design Playbook & Post-Mortem, Zero Pre-Seeded LocalStorage Trap

---

## 1. TỔNG QUAN & NGUYÊN TẮC KIẾN TRÚC TEST SUITE

Tài liệu này xác lập hạ tầng kiểm thử toàn diện cho hệ thống phòng học PomoFocus Meet (`/rooms`) và Bảng vẽ tương tác (`Whiteboard`) theo mô hình 4 tầng (4-Tier Systematic Testing Methodology):
1. **Tier 1: Feature Coverage (Độc lập từng tính năng)**: Bao phủ tối thiểu 5 ca kiểm thử chi tiết cho từng tính năng trong số 21 tính năng thuộc `PROJECT.md § Feature Inventory` (tổng cộng 105+ test cases).
2. **Tier 2: Boundary & Corner Cases (Biên độ & Góc khuất)**: Kiểm thử phòng rỗng, tối đa 10 người (Mesh 45 liên kết), đứt mạng đột ngột, đổi mạng, tỉ lệ khung hình cực đoan.
3. **Tier 3: Cross-Feature Combinations (Tổ hợp đa tính năng)**: Kiểm thử tương tác chéo giữa Đồng hồ nhóm, Bảng vẽ 2 tầng, Đa thiết bị cùng user, Chia sẻ màn hình và chế độ Audio-Only.
4. **Tier 4: Real-World Application Scenarios (Kịch bản thực tế 3 máy thật)**: Kịch bản kiểm thử Playwright tự động hóa với 3 trình duyệt độc lập (Host Desktop, Member Laptop, Member Mobile 390x844) kết nối qua Supabase Cloud không pre-seed `localStorage`.

### 5 Nguyên Tắc Bất Biến Từ Cẩm Nang UI/UX (`docs/UI_UX_DESIGN_PLAYBOOK_AND_POSTMORTEM.md`):
- **Nguyên tắc 1: Z-Index Layer Hierarchy**: Tách bạch tầng hiển thị `z-10` (Workspace/Meet), `z-20` (Dock/Header cố định), `z-40` (Capsule nổi), `z-50` (Header mở rộng & Modal), `z-60+` (Cảnh báo & Toast).
- **Nguyên tắc 2: State Singularity**: Không render song song 2 component cùng nhiệm vụ (ví dụ: không để 2 thanh Header/Menu cùng xuất hiện).
- **Nguyên tắc 3: Cloud-First Persistence**: Toàn bộ trạng thái phòng, token, thành viên lưu trên Supabase Cloud; cấm lưu cục bộ `localStorage` làm split-brain.
- **Nguyên tắc 4: Founder VIP Whitelist**: Nhận diện `hasVipAccess(user)` và `OWNER_EMAILS`, không bao giờ hiển thị banner nâng cấp đòi tiền trước mặt Founder.
- **Nguyên tắc 5: Dynamic Layout Flow & Mobile Safety**: Đảm bảo an toàn hiển thị trên màn hình hẹp `390px`, không tràn ngang (`scrollWidth <= innerWidth`), dock 38px 5 nút đơn sắc.

---

## 2. TIER 1: FEATURE COVERAGE (ISOLATION SPECIFICATION)
*Quy chuẩn: Tối thiểu 5 ca kiểm thử cho từng tính năng trong 21 tính năng của `PROJECT.md`.*

### NHÓM 1: ROOM LIFECYCLE & HOST GOVERNANCE (FEATURES 1 – 4)

#### Feature 1: Canonical Cloud `roomId` & Loại bỏ Split-Brain
*Mục tiêu: Đảm bảo mọi máy tính và điện thoại cùng sử dụng duy nhất một UUID/slug từ Supabase Cloud, xóa bỏ bẫy `usr_peer_host` tạo phòng ma cục bộ.*
- **TC-F01-01 (Happy Path - Tra cứu phòng chuẩn)**:
  - *Input*: Gọi `resolveCanonicalRoom('pomo-2026-room')`.
  - *Expected*: Trả về đối tượng `StudyRoom` khớp ID từ bảng `public.study_rooms` trên Cloud, `host_user_id` hợp lệ.
- **TC-F01-02 (Phòng không tồn tại trả về null)**:
  - *Input*: Gọi `resolveCanonicalRoom('non-existent-uuid-9999')`.
  - *Expected*: Trả về `null`, không tự động sinh phòng cục bộ với host giả `usr_peer_host`.
- **TC-F01-03 (Phòng đã đóng trả về lỗi dứt khoát)**:
  - *Input*: Gọi `resolveCanonicalRoom('room-closed-test')` có `status === 'closed'`.
  - *Expected*: Báo lỗi `ROOM_CLOSED`, không cho phép bất kỳ ai tạo lại phòng cùng ID này.
- **TC-F01-04 (Xác thực Host User ID trong Serverless API `api/rooms.ts`)**:
  - *Input*: Gửi POST `/api/rooms` với payload thiếu `host_user_id`.
  - *Expected*: Trả về mã HTTP `400 Bad Request` yêu cầu `host_user_id` chính chủ từ JWT auth token.
- **TC-F01-05 (Chống Split-Brain khi 2 máy cùng mở 1 link)**:
  - *Input*: Client A (Desktop) và Client B (Mobile) cùng truy cập `/rooms/pomo-test-uuid`.
  - *Expected*: Cả hai cùng trỏ vào 1 bản ghi Cloud duy nhất, không tạo ra 2 phòng cục bộ khác nhau trong `localStorage`.

#### Feature 2: Diệt phòng ma khi Thoát / Xóa phòng (Teardown 5 Bước)
*Mục tiêu: Khi chủ phòng đóng/xóa phòng, toàn bộ thành viên bị ngắt kết nối dứt khoát, tài nguyên phần cứng (Cam/Mic) được giải phóng 100%.*
- **TC-F02-01 (Cập nhật Cloud status = closed)**:
  - *Input*: Host gọi `studyRoomService.closeRoom(roomId, hostUser)`.
  - *Expected*: Bản ghi phòng trên Supabase có `status = 'closed'`, phát sóng Realtime `ROOM_CLOSED`.
- **TC-F02-02 (Thành viên nhận ROOM_CLOSED và tự động điều hướng)**:
  - *Input*: Kênh Realtime nhận bản tin `{ type: 'ROOM_CLOSED', roomId }`.
  - *Expected*: Cả Member Desktop và Member Mobile hiển thị thông báo phòng đã đóng và tự động chuyển về `/rooms`.
- **TC-F02-03 (Teardown Bước 1: Dừng toàn bộ MediaStreamTracks)**:
  - *Input*: Kích hoạt đóng phòng hoặc rời phòng.
  - *Expected*: Mọi track video/audio của `localStreamRef` được gọi `.stop()`, `track.readyState === 'ended'`, đèn camera tắt.
- **TC-F02-04 (Teardown Bước 2 & 3: untrack & removeChannel)**:
  - *Input*: Rời phòng hoặc unmount `StudyRoomView`.
  - *Expected*: Gọi `channel.untrack()` và `supabase.removeChannel(channel)`, không để lại connection rò rỉ.
- **TC-F02-05 (Teardown Bước 4 & 5: Đóng WebRTC & Dọn nét vẽ/Chat)**:
  - *Input*: Host xóa phòng vĩnh viễn (`deleteRoom`).
  - *Expected*: Toàn bộ `RTCPeerConnection` chuyển sang trạng thái `closed`, bộ nhớ đệm `roomCanvasStrokesMap` và lịch sử chat của phòng bị xóa sạch.

#### Feature 3: Khóa quyền điều khiển Đồng hồ nhóm cho Host & Grace Period
*Mục tiêu: Chỉ Host có quyền START/PAUSE/RESET/PHASE_CHANGE đồng hồ phòng, ân hạn 60s khi host mất kết nối.*
- **TC-F03-01 (Host phát sóng START thành công)**:
  - *Input*: Host bấm nút Start trên đồng hồ nhóm.
  - *Expected*: Phát sóng `room-timer-sync` với `action: 'START'`, `senderId: hostUser.id`, đồng hồ chạy.
- **TC-F03-02 (Chặn thành viên thường phát lệnh điều khiển timer)**:
  - *Input*: Member gửi `room-timer-sync` với `action: 'RESET'`.
  - *Expected*: Các peer khác kiểm tra `senderId !== hostUserId`, từ chối áp dụng thay đổi thời gian.
- **TC-F03-03 (Ân hạn 60s khi Host gián đoạn mạng)**:
  - *Input*: Host bị mất kết nối mạng đột ngột.
  - *Expected*: Đồng hồ tiếp tục đếm cục bộ trong 60 giây grace period, không dừng đột ngột gây hoang mang.
- **TC-F03-04 (Host tái kết nối trong 60s tiếp quản đồng hồ)**:
  - *Input*: Host kết nối lại ở giây thứ 45 và gửi đồng bộ trạng thái.
  - *Expected*: Trạng thái đồng hồ được cập nhật chuẩn xác theo thời gian thực của Host.
- **TC-F03-05 (Hết 60s grace period chuyển trạng thái an toàn)**:
  - *Input*: Quá 60s không nhận được heartbeat từ Host.
  - *Expected*: Giao diện hiển thị cảnh báo "Chủ phòng tạm thời vắng mặt", tạm dừng đồng hồ an toàn.

#### Feature 4: Lưu trữ Session Tab chống thành viên ma khi F5
*Mục tiêu: Phân biệt các tab của cùng một thiết bị, hỗ trợ reload vào lại đúng phòng không tạo nhân vật ma.*
- **TC-F04-01 (Tạo clientSessionId chuẩn RFC4122 trong sessionStorage)**:
  - *Input*: Người dùng mở tab phòng học `/rooms/:id`.
  - *Expected*: `sessionStorage` lưu trữ `clientSessionId` duy nhất theo `roomId`.
- **TC-F04-02 (F5 trình duyệt giữ nguyên clientSessionId)**:
  - *Input*: Người dùng ấn F5 hoặc reload trang.
  - *Expected*: Đọc lại đúng `clientSessionId` cũ từ `sessionStorage`, không sinh thêm peer ma trên Supabase Presence.
- **TC-F04-03 (Mở tab mới trên cùng trình duyệt sinh sessionId mới)**:
  - *Input*: Mở tab thứ 2 cùng tài khoản.
  - *Expected*: Tab 2 có `clientSessionId` mới, không ghi đè session của Tab 1.
- **TC-F04-04 (Hook beforeunload/pagehide gửi tín hiệu rời phòng)**:
  - *Input*: Đóng tab hoặc điều hướng ra ngoài.
  - *Expected*: Sự kiện `beforeunload` hoặc `pagehide` kích hoạt dọn dẹp presence và đóng peer connection ngay lập tức.
- **TC-F04-05 (Không lưu session vĩnh viễn trong localStorage)**:
  - *Input*: Kiểm tra sau khi đóng trình duyệt.
  - *Expected*: `sessionStorage` tự hủy, không để lại rác trong `localStorage`.

---

### NHÓM 2: WEBRTC & MULTI-DEVICE RESILIENCY (FEATURES 5 – 12)

#### Feature 5: Đa thiết bị Presence & Phân biệt Thiết bị (PC / Mobile)
*Mục tiêu: Cho phép 1 tài khoản đăng nhập cả Laptop và Mobile đồng thời, hiển thị nhãn rõ ràng.*
- **TC-F05-01 (Compound Key Presence trên Supabase)**:
  - *Input*: Client đăng ký presence với payload key.
  - *Expected*: Key có định dạng chuẩn `${userId}::${clientSessionId}`.
- **TC-F05-02 (Gắn nhãn 'Điện thoại' cho Mobile Viewport)**:
  - *Input*: Client tham gia từ viewport di động (width <= 640px hoặc `isMobile`).
  - *Expected*: Giao diện hiển thị nhãn `(Điện thoại)` hoặc biểu tượng mobile bên cạnh tên học viên.
- **TC-F05-03 (Gắn nhãn 'Máy tính' cho Desktop Viewport)**:
  - *Input*: Client tham gia từ Desktop (width >= 1024px).
  - *Expected*: Giao diện hiển thị nhãn `(Máy tính)` hoặc không bị lẫn với thiết bị di động.
- **TC-F05-04 (Cùng tài khoản trên 2 máy không nuốt nhau)**:
  - *Input*: User Nam đăng nhập trên Laptop và User Nam đăng nhập trên iPhone.
  - *Expected*: Danh sách thành viên hiển thị đủ 2 ô video độc lập, một ô có nhãn `(Máy 2)` hoặc `(Điện thoại)`.
- **TC-F05-05 (Thoát 1 thiết bị không ảnh hưởng thiết bị còn lại)**:
  - *Input*: User Nam đóng tab trên iPhone.
  - *Expected*: Ô video iPhone biến mất, ô video Laptop của Nam vẫn hoạt động bình thường.

#### Feature 6: Chống bão chuông ding & Toast khi Initial Sync
*Mục tiêu: Khi vào phòng có sẵn 5 người, không phát 5 tiếng chuông dồn dập và 5 toast đè nhau.*
- **TC-F06-01 (Cửa sổ câm 2.5s khi nạp initial sync)**:
  - *Input*: Vào phòng đã có sẵn 4 học viên khác.
  - *Expected*: Không phát ra tiếng chuông ding nào trong 2.5 giây đầu tiên.
- **TC-F06-02 (Không hiện toast cho các thành viên đã có trước)**:
  - *Input*: Nhận danh sách presence ban đầu từ Supabase.
  - *Expected*: `peerJoinToast` giữ nguyên `null`, không hiện 4 toast liên tiếp.
- **TC-F06-03 (Phát chuông chuẩn khi có người mới vào sau 2.5s)**:
  - *Input*: Sau 3 giây, có bạn học mới vào phòng.
  - *Expected*: Phát 1 tiếng ding nhẹ và hiển thị 1 toast duy nhất "[Tên] vừa vào phòng học".
- **TC-F06-04 (Tự động ẩn toast sau 4 giây)**:
  - *Input*: Toast thông báo hiển thị.
  - *Expected*: Sau 4000ms, toast tự động biến mất khỏi màn hình.
- **TC-F06-05 (Debounce nhiều người vào cùng lúc)**:
  - *Input*: 3 người cùng vào phòng trong khoảng 100ms.
  - *Expected*: Gom nhóm thông báo hoặc chỉ phát chuông 1 lần, không gây rè âm thanh.

#### Feature 7: Chuẩn hóa Polite Peer Glare Handling
*Mục tiêu: Xử lý va chạm Offer/Answer theo chuẩn Perfect Negotiation RFC.*
- **TC-F07-01 (Xác định Impolite Initiator dựa trên Peer ID)**:
  - *Input*: Peer A có ID lớn hơn Peer B cùng phát sinh Offer.
  - *Expected*: Peer A đóng vai trò Impolite, giữ nguyên Offer của mình; Peer B đóng vai trò Polite.
- **TC-F07-02 (Polite Peer rollback khi gặp collision)**:
  - *Input*: Peer B (Polite) nhận Offer từ Peer A khi đang có Local Offer.
  - *Expected*: Peer B thực hiện `setLocalDescription({ type: 'rollback' })` và chấp nhận Remote Offer của Peer A.
- **TC-F07-03 (Loại bỏ lệnh gọi ngược trong UI)**:
  - *Input*: Sự kiện `presence.sync` kích hoạt `syncMeshPeers`.
  - *Expected*: Chỉ initiator hợp lệ phát Offer, UI không gọi chéo gây lặp vô tận.
- **TC-F07-04 (Xử lý ICE Candidate hàng đợi trước khi có Remote Description)**:
  - *Input*: Nhận ICE Candidate khi signaling state chưa sẵn sàng.
  - *Expected*: Candidate được lưu vào `pendingCandidates` map và áp dụng ngay sau khi `setRemoteDescription` thành công.
- **TC-F07-05 (Kết nối P2P thành công hai chiều)**:
  - *Input*: Hoàn tất quá trình bắt tay Offer/Answer giữa 2 peer.
  - *Expected*: Cả hai bên đều nhận được `MediaStream` từ đối phương qua callback `onRemoteStream`.

#### Feature 8: Khôi phục Web Worker Heartbeat
*Mục tiêu: Đảm bảo kênh kết nối không bị trình duyệt bóp nghẹt khi tab chạy nền (background).*
- **TC-F08-01 (Khởi tạo Web Worker từ Blob URL độc lập)**:
  - *Input*: `StudyRoomView` kích hoạt khi tham gia phòng.
  - *Expected*: Web Worker được tạo thành công từ Inline Blob Script, không bị CSP chặn.
- **TC-F08-02 (Worker phát nhịp tick đều đặn mỗi 15 giây)**:
  - *Input*: Tab chuyển sang trạng thái ẩn (`document.hidden = true`).
  - *Expected*: Worker tiếp tục gửi tin nhắn `tick` mỗi 15000ms đến luồng chính.
- **TC-F08-03 (Gửi p2p-keepalive khi nhận tick)**:
  - *Input*: Nhận `tick` từ Worker và `channel.state === 'joined'`.
  - *Expected*: Phát sóng `p2p-keepalive` lên Supabase Broadcast.
- **TC-F08-04 (Tự động phục hồi kết nối khi quay lại tab)**:
  - *Input*: Sự kiện `visibilitychange` kích hoạt khi người dùng mở lại tab.
  - *Expected*: Kiểm tra trạng thái kênh, nếu đứt thì re-subscribe và re-track presence ngay lập tức.
- **TC-F08-05 (Dọn dẹp Worker khi rời phòng)**:
  - *Input*: Người dùng rời phòng.
  - *Expected*: Gửi lệnh `stop` và gọi `worker.terminate()`, giải phóng tài nguyên CPU.

#### Feature 9: Tự động `restartIce()` khi chuyển mạng WiFi <-> 4G
*Mục tiêu: Khôi phục kết nối P2P mượt mà khi người dùng đổi mạng di động.*
- **TC-F09-01 (Bắt sự kiện 'online' của trình duyệt)**:
  - *Input*: Thiết bị ngắt WiFi và kết nối vào mạng 4G (phát sự kiện `window.online`).
  - *Expected*: Trình nghe sự kiện `online` trong `StudyRoomView` được kích hoạt.
- **TC-F09-02 (Gọi restartAllPeers trên WebRTCConnectionManager)**:
  - *Input*: Sự kiện online kích hoạt.
  - *Expected*: Quản lý kết nối gọi `restartIce()` đồng loạt trên tất cả các `RTCPeerConnection` đang mở.
- **TC-F09-03 (Tạo Offer mới với cờ iceRestart: true)**:
  - *Input*: Kích hoạt `restartIce()`.
  - *Expected*: Tạo Offer mới với `{ iceRestart: true }` và phát bản tin `OFFER` tới peer đối tác.
- **TC-F09-04 (Hợp nhất bộ đếm thời gian rớt mạng)**:
  - *Input*: Gián đoạn mạng trong 3 giây.
  - *Expected*: Không vội vã kick peer ra khỏi phòng, chờ tối thiểu 10 giây trước khi báo mất kết nối.
- **TC-F09-05 (Phục hồi luồng Video/Audio sau khi đổi mạng)**:
  - *Input*: Quá trình ICE Restart hoàn tất trên mạng mới.
  - *Expected*: Video đối phương tiếp tục phát trực tiếp, không bị đóng băng khung hình.

#### Feature 10: Cảnh báo P2P chặn, Audio-Only Mode & Cap Video Mesh Mobile
*Mục tiêu: Bảo vệ băng thông 4G, cảnh báo tường lửa chặn P2P và tối ưu hiệu năng di động.*
- **TC-F10-01 (Cảnh báo khi P2P chuyển sang trạng thái failed)**:
  - *Input*: `RTCPeerConnection.connectionState === 'failed'`.
  - *Expected*: Giao diện hiển thị banner/thông báo cảnh báo mạng chặn P2P (gợi ý chuyển sang TURN hoặc Audio-Only).
- **TC-F10-02 (Bật chế độ Audio-Only Mode tiết kiệm 4G)**:
  - *Input*: Người dùng chọn chế độ "Chỉ âm thanh / Tiết kiệm 4G".
  - *Expected*: Tắt việc nhận/phát luồng video, chỉ truyền tải audio track, giảm băng thông xuống <50kbps.
- **TC-F10-03 (Giới hạn hiển thị tối đa 3 video trên Mobile)**:
  - *Input*: Phòng có 6 người trên màn hình điện thoại 390px.
  - *Expected*: Chỉ render tối đa 3 video hoạt động đồng thời (Active Speakers), các người khác hiển thị avatar kính mờ.
- **TC-F10-04 (Tự động hạ bitrate theo sĩ số phòng)**:
  - *Input*: Sĩ số phòng tăng từ 2 lên 5 người.
  - *Expected*: `updateMeshBandwidth` tự động hạ target bitrate từ 450 kbps xuống 250 kbps.
- **TC-F10-05 (Nút chuyển Audio-Only hoạt động tức thì)**:
  - *Input*: Bấm nút Audio-Only trên thanh điều khiển.
  - *Expected*: Trạng thái được cập nhật ngay lập tức mà không cần reload phòng.

#### Feature 11: XSS / HTML Injection Sanitization
*Mục tiêu: Triệt tiêu hoàn toàn nguy cơ tấn công kịch bản chéo trong tên phòng, mục tiêu và chat.*
- **TC-F11-01 (Sanitize mã HTML trong tiêu đề phòng)**:
  - *Input*: Đặt tên phòng là `<script>alert('XSS')</script>Phòng Toán`.
  - *Expected*: Render dưới dạng chuỗi văn bản an toàn, không thực thi mã script.
- **TC-F11-02 (Sanitize mục tiêu buổi học / Room Goal)**:
  - *Input*: Ghim thông báo `<img src=x onerror=alert(1)>`.
  - *Expected*: Không kích hoạt mã độc `onerror`, ký tự đặc biệt được escape an toàn.
- **TC-F11-03 (Sanitize tên hiển thị thành viên)**:
  - *Input*: Tên học viên chứa `<b onmouseover=evil()>Nam</b>`.
  - *Expected*: Hiển thị chuỗi an toàn trong danh sách thành viên và nhãn video.
- **TC-F11-04 (Sanitize tin nhắn văn bản trong hộp Chat)**:
  - *Input*: Gửi tin nhắn `<iframe src="javascript:alert(1)"></iframe>`.
  - *Expected*: Tin nhắn hiển thị dạng text thuần túy, không chèn iframe vào DOM.
- **TC-F11-05 (Bảo vệ đường dẫn ảnh Avatar tùy biến)**:
  - *Input*: Avatar URL nhập vào là `javascript:void(0)`.
  - *Expected*: Bị chặn hoặc chuyển đổi về avatar mặc định an toàn.

#### Feature 12: Reset Badge Tin Nhắn & Dọn Hand/Reactions
*Mục tiêu: Quản lý huy hiệu số tin nhắn chưa đọc chính xác và xóa rác trạng thái khi rời phòng.*
- **TC-F12-01 (Chỉ tăng badge khi hộp Chat đang đóng)**:
  - *Input*: Nhận tin nhắn mới từ bạn học khi `isChatOpen === false`.
  - *Expected*: Badge đỏ thông báo hiển thị trên nút chat của Dock.
- **TC-F12-02 (Tự động xóa badge khi người dùng mở Chat)**:
  - *Input*: Bấm mở khung Chat (`isChatOpen === true`).
  - *Expected*: `hasUnreadChat` chuyển về `false`, badge đỏ biến mất ngay lập tức.
- **TC-F12-03 (Reset toàn bộ tin nhắn & badge khi chuyển phòng)**:
  - *Input*: Rời phòng A và tham gia phòng B.
  - *Expected*: Danh sách tin nhắn được đặt lại về tin chào mừng phòng B, badge chưa đọc được reset về 0.
- **TC-F12-04 (Tự động hạ tay khi rời phòng)**:
  - *Input*: Đang giơ tay phát biểu (`isHandRaised === true`) rồi bấm rời phòng.
  - *Expected*: Trạng thái giơ tay được xóa sạch, không lưu vĩnh viễn trong phiên sau.
- **TC-F12-05 (Dọn dẹp biểu tượng cảm xúc nổi khi rời phòng)**:
  - *Input*: Đang có bão emoji thả tim trên màn hình rồi rời phòng.
  - *Expected*: Toàn bộ danh sách `floatingReactions` bị dọn dẹp, không rò rỉ bộ nhớ.

---

### NHÓM 3: WHITEBOARD ENGINE OVERHAUL (FEATURES 13 – 16)

#### Feature 13: Bảng vẽ: Chuẩn hóa Tọa độ Thế Giới (World Coordinates)
*Mục tiêu: Đảm bảo hình vẽ hiển thị đồng dạng tỷ lệ 16:9 trên cả Desktop siêu rộng và Mobile dọc.*
- **TC-F13-01 (Hệ tọa độ danh định 16:9 1920x1080)**:
  - *Input*: Vẽ một đường chéo từ góc trái trên đến góc phải dưới trên Desktop.
  - *Expected*: Tọa độ chuẩn hóa lưu trữ trong khoảng $[0, 1]$ tương ứng với không gian ảo $1920 \times 1080$.
- **TC-F13-02 (Scale đồng dạng isotropic trên Mobile dọc 390x844)**:
  - *Input*: Mở bảng vẽ trên điện thoại di động có màn hình dọc.
  - *Expected*: Toàn bộ bảng vẽ 16:9 nằm gọn trong khung nhìn, giữ nguyên tỷ lệ hình học, không bị méo tròn thành elip.
- **TC-F13-03 (Chuyển đổi ngược từ Screen sang World Coordinates)**:
  - *Input*: Người dùng chạm bút tại vị trí $(screenX, screenY)$.
  - *Expected*: Hàm chuyển đổi tính toán chính xác $(virtX, virtY)$ dựa trên scale và offset hiện tại.
- **TC-F13-04 (Đồng bộ tọa độ vẽ giữa Desktop và Mobile qua Realtime)**:
  - *Input*: Desktop vẽ hình vuông ở giữa màn hình.
  - *Expected*: Mobile nhận tọa độ chuẩn hóa và vẽ hình vuông chính xác tại vị trí tương đối giữa màn hình.
- **TC-F13-05 (Bảo toàn tỉ lệ khi phóng to/thu nhỏ - Zoom)**:
  - *Input*: Thay đổi tỷ lệ zoom bảng vẽ từ 100% lên 150%.
  - *Expected*: Nét vẽ phóng to mượt mà quanh tâm, độ sắc nét được duy trì không vỡ hạt.

#### Feature 14: Bảng vẽ: Kiến trúc Canvas 2 Tầng (Dual-Layer)
*Mục tiêu: Tách tầng nét vẽ đã chốt và nét vẽ đang thao tác để đạt 60fps mượt mà sau nhiều giờ vẽ.*
- **TC-F14-01 (Tầng 1 - Base Layer lưu trữ nét đã chốt và tài liệu)**:
  - *Input*: Kiểm tra cấu trúc DOM của `WhiteboardView`.
  - *Expected*: Tồn tại Canvas Tầng 1 (`baseCanvas`) chỉ render lại khi có nét vẽ mới hoàn tất hoặc nạp tài liệu.
- **TC-F14-02 (Tầng 2 - Active Layer xử lý nét vẽ trực tiếp 60fps)**:
  - *Input*: Người dùng kéo chuột/bút vẽ liên tục.
  - *Expected*: Chỉ Canvas Tầng 2 (`activeCanvas`) được xóa và vẽ lại theo từng khung hình `requestAnimationFrame`.
- **TC-F14-03 (Hợp nhất nét vẽ từ Tầng 2 xuống Tầng 1 khi pointerup)**:
  - *Input*: Người dùng nhấc bút (`pointerup`).
  - *Expected*: Nét vẽ hiện tại được kết xuất vĩnh viễn vào Tầng 1, Tầng 2 xóa sạch để đón nét vẽ tiếp theo.
- **TC-F14-04 (Không tụt khung hình khi bảng vẽ có >2000 nét)**:
  - *Input*: Nạp 2000 nét vẽ vào Tầng 1 rồi thực hiện vẽ thêm nét mới trên Tầng 2.
  - *Expected*: Tốc độ khung hình khi vẽ đạt ổn định xấp xỉ 60fps, không bị giật lag (jank).
- **TC-F14-05 (Hỗ trợ Undo/Redo độc lập trên Base Layer)**:
  - *Input*: Nhấn nút Undo.
  - *Expected*: Nét vẽ cuối cùng được gỡ bỏ khỏi Tầng 1 và canvas được vẽ lại trung thực.

#### Feature 15: Bảng vẽ: Quản lý Bộ Nhớ OOM, Blob URL & Throttling
*Mục tiêu: Chống tràn RAM (OOM crash) trên WebView di động, giới hạn file và thu hồi Blob URL.*
- **TC-F15-01 (Thu hồi Blob URL bằng URL.revokeObjectURL)**:
  - *Input*: Tải lên ảnh đề thi hoặc trang PDF vào bảng vẽ rồi đóng hoặc đổi tài liệu.
  - *Expected*: Hàm `URL.revokeObjectURL()` được gọi lập tức, giải phóng bộ nhớ heap.
- **TC-F15-02 (Chặn tải file vượt quá 25MB)**:
  - *Input*: Tải lên tệp tài liệu dung lượng 30MB.
  - *Expected*: Hiển thị cảnh báo từ chối tải file quá 25MB, không làm sập tab.
- **TC-F15-03 (Chặn tài liệu PDF vượt quá 50 trang)**:
  - *Input*: Tải lên tệp PDF có 70 trang.
  - *Expected*: Hiển thị cảnh báo giới hạn tối đa 50 trang để bảo vệ bộ nhớ di động.
- **TC-F15-04 (Downscale ảnh có kích thước lớn hơn 2048px)**:
  - *Input*: Tải lên ảnh chụp đề thi độ phân giải $4000 \times 3000$ px.
  - *Expected*: Tự động thu nhỏ ảnh về kích thước tối đa 2048px trước khi đưa vào canvas.
- **TC-F15-05 (Throttling broadcast 50ms/60ms chống rate-limit Supabase)**:
  - *Input*: Vẽ nét dài liên tục phát sinh 200 điểm/giây.
  - *Expected*: Các gói tin phát sóng tọa độ được gom nhóm và throttle ở chu kỳ 50ms - 60ms.

#### Feature 16: Bảng vẽ: Zone Isolation & Mobile Toolbar
*Mục tiêu: Tách biệt dải camera không đè lên thanh công cụ vẽ, giao diện mobile thân thiện.*
- **TC-F16-01 (Thu dải camera thành viên nang [ 📹 3 ] khi bật Bảng vẽ)**:
  - *Input*: Chuyển sang tab Bảng vẽ trên màn hình có nhiều học viên.
  - *Expected*: Dải video lớn tự động thu gọn thành viên nang nổi nhỏ gọn `[ 📹 X ]` không che khuất bảng.
- **TC-F16-02 (Khóa touch-action: none trên Canvas di động)**:
  - *Input*: Chạm vuốt trên vùng Canvas của điện thoại.
  - *Expected*: Thuộc tính `touch-action: none` ngăn chặn việc cuộn trang ngoài ý muốn của trình duyệt.
- **TC-F16-03 (Nút 'Tài liệu' không bị cắt chữ trên Mobile 390px)**:
  - *Input*: Kiểm tra thanh công cụ vẽ ở độ rộng màn hình 390px.
  - *Expected*: Chữ "Tài liệu" hiển thị đầy đủ, không bị rớt dòng hoặc che khuất.
- **TC-F16-04 (Hiển thị đầy đủ Undo/Redo và Bảng màu trên Mobile)**:
  - *Input*: Mở bảng vẽ trên thiết bị di động.
  - *Expected*: Các nút Undo, Redo, chọn màu và thanh Zoom hiển thị trực quan, bấm chạm nhạy bén.
- **TC-F16-05 (Nội dung hướng dẫn thân thiện trên Mobile)**:
  - *Input*: Xem hướng dẫn tải tài liệu trên điện thoại.
  - *Expected*: Hiển thị "Thả ảnh đề thi hoặc PDF vào đây", loại bỏ câu "Lăn chuột... giữ Space" dành cho PC.

---

### NHÓM 4: CLEAN MEET UI (TOPBAR, DOCK, VIDEO GRID) (FEATURES 17 – 21)

#### Feature 17: Giao diện Meet: Top Bar 3 Cụm 1 Dòng
*Mục tiêu: Header tinh gọn tối đa 3 cụm trên 1 dòng duy nhất, gom quản trị vào menu ⋯.*
- **TC-F17-01 (Cấu trúc chuẩn 3 cụm 1 dòng)**:
  - *Input*: Mở phòng học Meet trên Desktop và Mobile.
  - *Expected*: Header chia thành đúng 3 cụm: `[ ← Tên phòng ]` | `[ Video | Bảng vẽ ]` | `[ 👥 3 · Mời · ⋯ ]`.
- **TC-F17-02 (Không rớt dòng - whitespace-nowrap)**:
  - *Input*: Co hẹp cửa sổ trình duyệt xuống mức tối thiểu.
  - *Expected*: Các cụm giữ nguyên trên 1 dòng duy nhất, không bị tràn hay bẻ đôi header.
- **TC-F17-03 (Gom quản trị phòng và mã mời vào menu ⋯)**:
  - *Input*: Bấm vào nút menu ba chấm `⋯`.
  - *Expected*: Mở dropdown chứa các tác vụ quản trị phòng, đổi tên, khóa phòng, không để lộ bề mặt.
- **TC-F17-04 (Xóa bỏ các badge thừa BETA / MASTER ADMIN / FREE)**:
  - *Input*: Kiểm tra trực quan thanh Top Bar.
  - *Expected*: Không xuất hiện các badge màu mè rườm rà như BETA, MASTER ADMIN, FREE.
- **TC-F17-05 (Ẩn nút PiP chết trên ứng dụng APK Android)**:
  - *Input*: Chạy ứng dụng trong môi trường Capacitor / Android WebView.
  - *Expected*: Nút Picture-in-Picture tự động ẩn đi vì không được Android WebView hỗ trợ.

#### Feature 18: Giao diện Meet: Xóa Banner Xanh & Pill Group Timer
*Mục tiêu: Loại bỏ banner 140px choán chỗ, hiển thị đồng hồ nhóm dạng pill gọn đồng nhất.*
- **TC-F18-01 (Xóa bỏ hoàn toàn banner xanh 140px)**:
  - *Input*: Kiểm tra mã nguồn và giao diện StudyRoomView.
  - *Expected*: Không còn khối banner xanh chiếm diện tích đỉnh màn hình.
- **TC-F18-02 (Đồng hồ nhóm dạng pill gọn đồng nhất trên Desktop)**:
  - *Input*: Quan sát đồng hồ Pomodoro nhóm trên màn hình Desktop.
  - *Expected*: Hiển thị dạng viên nang (pill) thanh lịch, nền tối viền mờ với bộ đếm phút:giây rõ nét.
- **TC-F18-03 (Đồng hồ nhóm dạng pill hiển thị hoàn hảo trên Mobile)**:
  - *Input*: Xem đồng hồ trên màn hình điện thoại 390px.
  - *Expected*: Kích thước vừa vặn, không đè lấn các nút điều khiển khác.
- **TC-F18-04 (Nút điều khiển mini Start/Pause/Reset tích hợp trong pill)**:
  - *Input*: Host tương tác với các nút điều khiển nhỏ trong pill.
  - *Expected*: Nhận diện sự kiện click mượt mà, đồng bộ trạng thái tức thì.
- **TC-F18-05 (Đổi màu trạng thái theo pha học tập)**:
  - *Input*: Chuyển pha từ Học tập (Work) sang Nghỉ ngắn (Break).
  - *Expected*: Đèn LED hoặc viền pill đổi màu tương ứng (ví dụ xanh lục sang ngọc lam/hổ phách).

#### Feature 19: Giao diện Meet: Lưới Video Kính Mờ & Sửa Lỗi Ô Thứ 3
*Mục tiêu: Sửa lỗi ô video thứ 3 bị đen/mất tên, hộp đen tắt cam thay bằng kính mờ căn giữa.*
- **TC-F19-01 (Sửa lỗi ô video thứ 3 bị đen trống hoặc mất tên)**:
  - *Input*: Phòng có đúng 3 thành viên tham gia.
  - *Expected*: Ô video thứ 3 hiển thị đầy đủ khung hình, tên học viên và trạng thái micro/camera.
- **TC-F19-02 (Hộp tắt camera sử dụng nền kính mờ cao cấp)**:
  - *Input*: Học viên tắt camera (`isVideoOn === false`).
  - *Expected*: Khung hình chuyển sang nền kính mờ (frosted glass) đen mờ sang trọng, không dùng khối đen xì nghiệp dư.
- **TC-F19-03 (Avatar căn giữa hoàn hảo khi tắt camera)**:
  - *Input*: Tắt camera.
  - *Expected*: Component `<UserAvatar />` hiển thị chính xác ở tâm hình học của ô video kèm tên ở góc đáy.
- **TC-F19-04 (Chia lưới cân đối theo sĩ số từ 1 đến 10 người)**:
  - *Input*: Kiểm tra các mốc sĩ số 1, 2, 3, 4, 6, 8, 10 học viên.
  - *Expected*: Lưới tự động co giãn số cột (1 cột, 2 cột, 3 cột, 4 cột) cân đối không gian màn hình.
- **TC-F19-05 (Viền sáng Active Speaker khi học viên phát biểu)**:
  - *Input*: Học viên phát tiếng nói (Voice Activity Detection kích hoạt).
  - *Expected*: Ô video của học viên đó sáng viền xanh lục báo hiệu đang nói.

#### Feature 20: Giao diện Meet: Bottom Dock 38px Đơn Sắc (5 Nút Mobile)
*Mục tiêu: Dock đáy 38px đơn sắc, xóa nút trùng lặp, Mobile giữ đúng 5 nút không tràn lề.*
- **TC-F20-01 (Chiều cao nút chuẩn 38px đơn sắc)**:
  - *Input*: Kiểm tra kích thước các nút trong Dock điều khiển đáy.
  - *Expected*: Chiều cao nút đạt chuẩn 38px, màu sắc đơn sắc tối giản, tinh tế.
- **TC-F20-02 (Xóa bỏ các nút trùng lặp AI Companion và Settings)**:
  - *Input*: Kiểm tra danh sách các nút trên Dock.
  - *Expected*: Không xuất hiện 2 nút AI hoặc 2 nút Cài đặt cạnh nhau gây rối mắt.
- **TC-F20-03 (Mobile giữ đúng 5 nút chức năng cốt lõi)**:
  - *Input*: Kiểm tra Dock trên màn hình điện thoại 390px.
  - *Expected*: Chỉ hiển thị đúng 5 nút: Micro, Camera, Cảm xúc (Reactions), Chat, Rời phòng.
- **TC-F20-04 (Ẩn nút 'Chia sẻ màn hình' trên Android WebView)**:
  - *Input*: Mở phòng học trên Android APK / WebView.
  - *Expected*: Nút chia sẻ màn hình tự động ẩn vì Android WebView không hỗ trợ `getDisplayMedia`.
- **TC-F20-05 (Đệm an toàn đáy pb-28 chống che khuất nội dung)**:
  - *Input*: Cuộn nội dung video hoặc bảng vẽ xuống đáy màn hình.
  - *Expected*: Luôn có khoảng đệm `pb-28` an toàn, không bị DockBar che mất phần tử bên dưới.

#### Feature 21: Test Suite & Multi-Device Playwright Harness
*Mục tiêu: Bộ kiểm thử Playwright đa thiết bị thật qua Cloud, chứng minh hệ thống hoạt động ổn định.*
- **TC-F21-01 (Khởi tạo 3 Browser Contexts độc lập trong 1 bài test)**:
  - *Input*: Khởi động test `tests/e2e/multiDeviceStudyRoom.spec.ts`.
  - *Expected*: Playwright tạo 3 context riêng biệt (Host Desktop, Member Laptop, Member Mobile) không chia sẻ cookies/storage.
- **TC-F21-02 (Không sử dụng pre-seeded localStorage trap)**:
  - *Input*: Kiểm tra kịch bản test.
  - *Expected*: Phòng được tạo thật từ giao diện/Cloud, thành viên vào phòng bằng link mời thực tế.
- **TC-F21-03 (Xác thực video/audio giữa các máy thật)**:
  - *Input*: 3 máy cùng bật camera/micro.
  - *Expected*: Cả 3 máy đều nhận luồng stream hoặc avatar tương ứng, không bị lỗi đen ô.
- **TC-F21-04 (Xác thực đóng phòng đá sạch 2 máy thành viên)**:
  - *Input*: Host thực hiện đóng phòng.
  - *Expected*: Cả 2 máy thành viên nhận `ROOM_CLOSED` và trở về sảnh trong vòng 3 giây.
- **TC-F21-05 (Tự động chấp nhận dialogs alert/confirm)**:
  - *Input*: Xuất hiện hộp thoại xác nhận đóng phòng hoặc thông báo phòng đóng.
  - *Expected*: Playwright tự động accept dialog, luồng kiểm thử không bị nghẽn (hang).

---

## 3. TIER 2: BOUNDARY & CORNER CASES SPECIFICATION

| Mã Test Case | Tên tình huống biên độ | Điều kiện đầu vào (Input) | Kết quả kỳ vọng (Expected Output) |
| :--- | :--- | :--- | :--- |
| **TC-BND-01** | **Phòng rỗng (Empty Room Lifecycle)** | Người đầu tiên vào phòng (sĩ số = 1), sau đó người này rời phòng (sĩ số = 0). | Phòng duy trì trạng thái active bình thường khi có 1 người; khi người cuối cùng rời phòng, channel teardown sạch sẽ. |
| **TC-BND-02** | **Sức chứa tối đa (Max Mesh 10 Users)** | 10 người cùng tham gia vào 1 phòng học. | Tổng số liên kết P2P mesh là $10 \times 9 / 2 = 45$ liên kết; target bitrate tự động ép xuống 180 kbps để không sập băng thông; người thứ 11 vào bị từ chối với mã `ROOM_FULL`. |
| **TC-BND-03** | **Host rớt mạng đột ngột & Hết 60s Grace Period** | Host bị ngắt nguồn/tắt trình duyệt đột ngột trong khi phòng đang học Pomodoro. | Đồng hồ nhóm tiếp tục chạy trong 60 giây ân hạn; sau 60s không thấy Host quay lại, hệ thống hiển thị thông báo an toàn và dừng timer, không làm treo máy học viên. |
| **TC-BND-04** | **Chuyển đổi mạng liên tục (Network Flapping)** | Thiết bị ngắt và bật lại mạng 3 lần liên tiếp trong vòng 10 giây. | Cơ chế debounce ICE restart hoạt động, không tạo bão Offer/Answer lặp lại gây nghẽn trình duyệt. |
| **TC-BND-05** | **Tỉ lệ khung hình cực đoan (Extreme Viewports)** | Thử nghiệm trên màn hình gập Galaxy Fold (21:9), iPad (4:3), Ultra-wide (32:9) và iPhone SE cũ (320x480). | Không có bất kỳ phần tử nào tràn ngang (`scrollWidth <= innerWidth`), Top Bar và Dock tự co giãn linh hoạt theo viewport. |
| **TC-BND-06** | **Bão Reload F5 & Trùng Tab cùng User** | 1 người dùng mở 3 tab cùng lúc và ấn F5 liên tục tại cả 3 tab. | Khóa `sessionStorage` phân tách 3 `clientSessionId` riêng biệt, không có tab nào bị cướp quyền hoặc sinh ghost user kẹt mãi trên Cloud. |
| **TC-BND-07** | **Bảng vẽ siêu tải nét (>100k điểm) & File lớn** | Tải lên tài liệu PDF đúng 25MB (50 trang) và vẽ nét liên tục 10 phút. | Bộ nhớ RAM không tăng phi mã (không OOM), Blob URL cũ được giải phóng ngay khi đổi trang tài liệu. |
| **TC-BND-08** | **Ký tự đặc biệt & Prompt Injection trong Metadata** | Đặt tên phòng hoặc ghim mục tiêu chứa ký tự Null, Emoji đa tầng, RTL Unicode và câu lệnh SQL injection / Prompt injection. | Dữ liệu được lưu trữ và hiển thị an toàn 100%, không làm sập parser giao diện. |

---

## 4. TIER 3: CROSS-FEATURE COMBINATIONS SPECIFICATION

| Mã Test Case | Tổ hợp tính năng kiểm thử | Kịch bản thực hiện | Tiêu chí nghiệm thu |
| :--- | :--- | :--- | :--- |
| **TC-CRX-01** | **Đồng hồ nhóm + Bảng vẽ tương tác** | Host bật Pomodoro chạy đồng thời chuyển sang tab Bảng vẽ và vẽ cùng các học viên. | Đồng hồ mini pill trên thanh công cụ Bảng vẽ vẫn đếm ngược đồng bộ từng giây; nét vẽ truyền tải song song qua Realtime mà không gây giật đồng hồ. |
| **TC-CRX-02** | **Chế độ Audio-Only + Tắt Mic + Vẽ Tầng 2** | Học viên bật Audio-Only tiết kiệm 4G, tắt micro của mình và thực hiện vẽ nét liên tục trên Tầng 2 của Canvas. | Không có luồng video nào tải về (tiết kiệm băng thông); nét vẽ active layer mượt mà 60fps; audio các bạn khác vẫn nghe rõ. |
| **TC-CRX-03** | **Đa thiết bị cùng User + Chat + Thả Tim** | 1 tài khoản đăng nhập trên PC Host và Mobile Member 2. PC Host chat văn bản, Mobile Member 2 thả bão tim. | Tin nhắn chat hiển thị đúng tên với nhãn phân biệt; bão tim rơi ngập màn hình trên cả 2 máy; không xảy ra hiện tượng echo lặp tin nhắn của chính mình. |
| **TC-CRX-04** | **Host đổi cài đặt phòng giữa lúc đang truyền Video P2P** | Trong khi 3 máy đang xem video trực tiếp, Host mở bảng điều khiển đổi tên phòng và bật chế độ "Yêu cầu bật Camera". | Cài đặt được cập nhật realtime qua kênh broadcast; luồng video WebRTC đang chạy không bị gián đoạn hay phải reload lại trang. |
| **TC-CRX-05** | **Xoay ngang màn hình điện thoại khi có 3 video** | Thành viên Mobile 390px xoay ngang máy (landscape 844x390) khi phòng có 3 ô video. | Lưới video tự động chuyển từ xếp dọc sang dàn ngang 3 cột; DockBar tự thu gọn sang mép an toàn không che khuất avatar. |
| **TC-CRX-06** | **Host đóng phòng trong lúc thành viên đang tải PDF** | Member đang chọn tải tệp đề thi 15MB lên bảng vẽ thì Host bấm đóng phòng học. | Member nhận thông báo phòng đóng ngay lập tức, quá trình tải file bị hủy bỏ an toàn, không treo bộ nhớ trình duyệt. |

---

## 5. TIER 4: REAL-WORLD APPLICATION SCENARIOS SPECIFICATION

Kịch bản kiểm thử tích hợp đỉnh cao được triển khai chi tiết tại:  
📁 `tests/e2e/multiDeviceStudyRoom.spec.ts`

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   KỊCH BẢN PLAYWRIGHT 3 CLIENTS QUA CLOUD                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   [Client 1: Host Desktop]      [Client 2: Member Laptop]   [Client 3: Member Mobile]
│   Chrome 1280x800               Chrome 1366x768             Emulation 390x844       │
│                                                                             │
│   1. Đăng nhập Founder          1. Trình duyệt sạch         1. Trình duyệt sạch     │
│   2. Tạo phòng trên /rooms      (Không pre-seed store)      (Không pre-seed store)  │
│   3. Lấy Invite Link                                                        │
│           │                                                                 │
│           ├────────────────────────────► 2. Mở link mời                             │
│           │                             3. Điền tên & Vào                           │
│           │                                    │                            │
│           └────────────────────────────────────┼─────────────► 2. Mở link mời       │
│                                                │               3. Điền tên & Vào    │
│                                                │                                    │
│   ◄────────────────────────────────────────────┴────────────────────────────────►   │
│   4. Xác thực WebRTC Mesh kết nối, Video/Avatar hiển thị đủ, không có phòng ma      │
│   5. Xác thực Client 3 có nhãn (Điện thoại) và Dock 38px 5 nút không tràn ngang     │
│                                                                             │
│   6. Host bấm Đóng phòng                                                    │
│           │                                                                 │
│           ├────────────────────────────► 7. Nhận ROOM_CLOSED                        │
│           │                             8. Kicked về /rooms, Cam/Mic tracks dừng    │
│           │                                    │                            │
│           └────────────────────────────────────┴─────────────► 7. Nhận ROOM_CLOSED  │
│                                                                8. Kicked về /rooms  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. HƯỚNG DẪN CHẠY TEST & TIÊU CHÍ NGHIỆM THU (TEST RUNNER EXECUTION)

### Lệnh chạy Unit & Integration Tests (Vitest):
```bash
npx vitest run tests/unit/v81MeetRoomsAndWhiteboard.test.tsx
```

### Lệnh chạy Multi-Device Playwright E2E Suite:
```bash
npx playwright test tests/e2e/multiDeviceStudyRoom.spec.ts --project=chrome
```

### Lệnh kiểm tra Type-check toàn bộ hệ thống:
```bash
npm run type-check
```

---
*Bản đặc tả hạ tầng kiểm thử TEST_INFRA.md được xác lập hoàn tất, sẵn sàng làm thước đo chuẩn mực cho toàn bộ các Milestone M1 đến M5.*
