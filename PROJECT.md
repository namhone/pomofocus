# Project: Đại Phẫu Phòng Học Meet (/rooms) — Đợt 2/4

## Architecture
Hệ thống phòng học Meet (`/rooms`) được đại phẫu toàn diện theo mô hình Full-Mesh P2P WebRTC kết hợp Supabase Realtime Cloud (Postgres Realtime Broadcast & Presence). Toàn bộ kiến trúc tuân thủ 5 nguyên tắc bất biến từ `docs/UI_UX_DESIGN_PLAYBOOK_AND_POSTMORTEM.md` (Z-Index Layer Hierarchy `z-10` đến `z-60`, State Singularity, Founder Whitelist, Dynamic Layout Flow `pt-3`/`pt-14` & `pb-28`).

```
                    Supabase Cloud
          (study_rooms table + Realtime Broadcast & Presence)
                         ▲       ▲
           Signaling/    │       │   Signaling/
           Lifecycle     │       │   Lifecycle
                         ▼       ▼
              ┌───────────────────────────┐
              │ Host Client (Desktop 16:9)│
              └─────────────┬─────────────┘
                            │
               P2P WebRTC   │   P2P WebRTC
               Data/Media   │   Data/Media
               (Mesh <= 4)  │
                            ▼
              ┌───────────────────────────┐
              │ Member Client 1 (Mobile)  │
              └─────────────┬─────────────┘
                            │
               P2P WebRTC   │
               Data/Media   │
                            ▼
              ┌───────────────────────────┐
              │ Member Client 2 (Desktop) │
              └───────────────────────────┘
```

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Canonical Cloud `roomId` & Loại bỏ Split-Brain | Tra cứu Supabase Cloud theo UUID, loại bỏ auto-synthesis trap `usr_peer_host`, sửa `api/rooms.ts` chèn `host_user_id` | M1 | Survey E1 |
| 2 | Diệt phòng ma khi Thoát / Xóa phòng | Cập nhật `status = closed` trên Supabase, phát sóng Realtime `room-lifecycle-action`, teardown 5 bước (stop MediaStreamTracks, untrack, removeChannel, close WebRTC, dọn nét vẽ/chat) | M1 | Survey E1 |
| 3 | Khóa quyền điều khiển Đồng hồ nhóm cho Host & Grace Period | Xác thực sender là host/admin cho `room-timer-sync`, ân hạn 60s khi host gián đoạn mạng | M1 | Survey E1 |
| 4 | Lưu trữ Session Tab chống thành viên ma khi F5 | Lưu `clientSessionId` trong `sessionStorage` theo `roomId`, hook `beforeunload`/`pagehide` dọn dẹp | M1 | Survey E2 |
| 5 | Đa thiết bị Presence & Phân biệt Thiết bị (PC / Mobile) | Dùng compound key `${userId}::${clientSessionId}`, gắn nhãn `Máy tính` / `Điện thoại`, không bị nuốt thiết bị | M2 | Survey E2 |
| 6 | Chống bão chuông ding & Toast khi Initial Sync | Cửa sổ 2.5s câm ding/toast khi nạp danh sách thành viên hiện hữu | M2 | Survey E2 |
| 7 | Chuẩn hóa Polite Peer Glare Handling | Impolite Initiator cho peer có ID lớn hơn, xóa lệnh gọi nghịch đảo trong UI | M2 | Survey E2 |
| 8 | Khôi phục Web Worker Heartbeat | Bổ sung `state: 'joined'` vào `RealtimeChannel`, duy trì `p2p-keepalive` liên tục | M2 | Survey E2 |
| 9 | Tự động `restartIce()` khi chuyển mạng WiFi <-> 4G | Gọi `restartAllPeers()` khi có sự kiện `online`, hợp nhất bộ đếm thời gian rớt mạng | M2 | Survey E2 |
| 10 | Cảnh báo P2P chặn, Audio-Only Mode & Cap Video Mesh Mobile | Cảnh báo khi P2P failed, chế độ chỉ âm thanh tiết kiệm 4G, giới hạn render 3 video trên Mobile | M2 | Survey E2 |
| 11 | XSS / HTML Injection Sanitization | Sanitize HTML cho tiêu đề phòng, mục tiêu, tên thành viên và tin nhắn chat | M2 | Survey E2 |
| 12 | Reset Badge Tin Nhắn & Dọn Hand/Reactions | Chỉ hiện badge khi có unread chat thực sự, reset khi đổi phòng, dọn emoji/giơ tay khi rời phòng | M2 | Survey E2 |
| 13 | Bảng vẽ: Chuẩn hóa Tọa độ Thế Giới (World Coordinates) | Hệ tọa độ danh định 16:9 (`1920x1080`), scale đồng dạng isotropic giữa Desktop và Mobile dọc | M3 | Survey E3 |
| 14 | Bảng vẽ: Kiến trúc Canvas 2 Tầng (Dual-Layer) | Tách Tầng 1 (Committed strokes + tài liệu) và Tầng 2 (Active draft & stream 60fps) | M3 | Survey E3 |
| 15 | Bảng vẽ: Quản lý Bộ Nhớ OOM, Blob URL & Throttling | Gọi `URL.revokeObjectURL()`, giới hạn file <=25MB / <=50 trang PDF, downscale ảnh >2048px, throttle 50ms/60ms, `touch-action: none` | M3 | Survey E3 |
| 16 | Bảng vẽ: Zone Isolation & Mobile Toolbar | Thu dải camera thành viên nang `[ 📹 3 ]`, đủ Undo/Redo/Zoom trên Mobile, nút "Tài liệu" không cắt chữ, hướng dẫn Mobile phù hợp | M3 | Survey E3 |
| 17 | Giao diện Meet: Top Bar 3 Cụm 1 Dòng | `[ ← Tên phòng ]` \| `[ Video \| Bảng vẽ ]` \| `[ 👥 3 · Mời · ⋯ ]`, gom quản trị vào `⋯`, xóa BETA/MASTER ADMIN, ẩn PiP trên APK | M4 | Survey E3 |
| 18 | Giao diện Meet: Xóa Banner Xanh & Pill Group Timer | Xóa banner xanh 140px, hiển thị đồng hồ nhóm dạng pill gọn đồng nhất trên cả Desktop và Mobile | M4 | Survey E3 |
| 19 | Giao diện Meet: Lưới Video Kính Mờ & Sửa Lỗi Ô Thứ 3 | Sửa ô video thứ 3 bị đen/mất tên, hộp đen tắt cam thay bằng kính mờ có Avatar căn giữa, chia lưới cân đối | M4 | Survey E3 |
| 20 | Giao diện Meet: Bottom Dock 38px Đơn Sắc (5 Nút Mobile) | Nút dock 38px đơn sắc, xóa nút trùng AI/Settings, Mobile giữ đúng 5 nút, ẩn nút chia sẻ màn hình trên Android WebView | M4 | Survey E3 |
| 21 | Test Suite & Multi-Device Playwright Harness | Xây dựng bộ test E2E 3 thiết bị thật qua Cloud và unit test bao phủ toàn diện | E2E | Directive |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| E2E | E2E Testing Track | Harness, runner, Multi-Device 3-client test scenarios, TEST_INFRA.md, TEST_READY.md | none | IN_PROGRESS |
| 1 | M1: Room Lifecycle & Host Governance | Canonical roomId Cloud, diệt split-brain & phòng ma, teardown 5 bước, host-only timer | none | PLANNED |
| 2 | M2: WebRTC & Multi-Device Resiliency | Compound presence key, Web Worker heartbeat, ICE restart, audio-only, XSS sanitize | M1 | PLANNED |
| 3 | M3: Whiteboard Engine Overhaul | Tọa độ thế giới ảo 16:9, canvas 2 tầng, revokeObjectURL, zone isolation viên nang camera, mobile toolbar | M1 | PLANNED |
| 4 | M4: Clean Meet UI (TopBar, Dock, Video Grid) | Top bar 3 cụm, dock 38px (5 nút mobile), group timer pill, lưới video kính mờ avatar | M2, M3 | PLANNED |
| 5 | M5: Final E2E Pass & Adversarial Hardening | Vượt qua 100% E2E tests (Tiers 1-4) và kiểm thử đối kháng Tier 5 | M1, M2, M3, M4, E2E | PLANNED |

## Interface Contracts
### studyRoomService ↔ Supabase Cloud (`public.study_rooms`)
- `resolveCanonicalRoom(idOrSlug: string): Promise<StudyRoom | null>`:
  - Tra cứu trực tiếp Supabase Cloud theo `id` hoặc `slug`.
  - Trả về phòng thật, nếu `status === 'closed'` báo lỗi kết thúc, nếu không tìm thấy trả về `null`.
- `closeRoom(roomId: string, currentUser: any): Promise<void>`:
  - Cập nhật `status = 'closed'` trên Cloud, phát sóng `ROOM_CLOSED` qua Supabase Realtime channel.
- `deleteRoom(roomId: string, currentUser: any): Promise<void>`:
  - Cập nhật `status = 'closed'` và xóa bản ghi, phát sóng `ROOM_DELETED`.

### WebRTCConnectionManager ↔ StudyRoomView
- `presencePayload`:
  - `key`: `${userId}::${clientSessionId}`
  - `deviceType`: `'desktop' | 'mobile'`
  - `deviceLabel`: `'Máy tính' | 'Điện thoại'`
- `callbacks.onConnectionStateChange`:
  - `(peerId: string, state: RTCPeerConnectionState) => void`
  - Báo cáo trạng thái kết nối lên UI để kích hoạt cảnh báo P2P và chế độ Audio-Only khi cần.
- `restartAllPeers(): void`:
  - Kích hoạt `restartIce()` đồng loạt trên tất cả các kết nối P2P đang mở khi thiết bị nhận sự kiện `online`.

### WhiteboardView ↔ Realtime Channel
- Normalized coordinates:
  - `x`: `(virtX - originX) / (VIRTUAL_WORLD_WIDTH * worldScale)` trong khoảng $[0, 1]$.
  - `y`: `(virtY - originY) / (VIRTUAL_WORLD_HEIGHT * worldScale)` trong khoảng $[0, 1]$.
  - Giữ nguyên tỉ lệ hình học trên mọi màn hình.

## Code Layout
- `src/services/studyRoomService.ts` — Room lifecycle, permissions, Supabase sync (M1 owns)
- `api/rooms.ts` — Serverless room API with valid host_user_id & Cloud schema (M1 owns)
- `src/lib/supabase.ts` — RealtimeChannel state property (M2 owns)
- `src/services/WebRTCConnectionManager.ts` — Full-mesh signaling, ICE restart, Polite peer (M2 owns)
- `src/components/WhiteboardView.tsx` — Dual-layer canvas, world coordinates, OOM limits (M3 owns)
- `src/types/whiteboard.ts` — Whiteboard coordinate types (M3 owns)
- `src/components/StudyRoomView.tsx` — Meet layout, topbar 3 clusters, 38px dock, timer pill, video grid (M4 owns)
- `tests/e2e/multiDeviceStudyRoom.spec.ts` — 3-client Multi-Device E2E tests (E2E Track owns)
