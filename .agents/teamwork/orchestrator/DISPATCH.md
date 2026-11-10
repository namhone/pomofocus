## 2026-11-08T04:42:39Z

You are the Project Orchestrator for Pomofocus v6.0 Ultimate.
Working directory: .agents/teamwork/orchestrator/
Original request file: d:\FileCuaNam\Web'\Pomodoro\.agents\teamwork\ORIGINAL_REQUEST.md
Workspace root: d:\FileCuaNam\Web'\Pomodoro

Task instructions & technical specifications (Sections 0 through 7):
<<<APPROVED_PROMPT
@[d:\FileCuaNam\Web'\Pomodoro\pomofocus-design-system] BẢN CHỈ DẪN KỸ THUẬT: ĐẠI TU TOÀN DIỆN GIAO DIỆN LIQUID GLASS & TỐI GIẢN ZEN (POMOFOCUS V6.0 ULTIMATE)
# CHỈ DẪN KỸ THUẬT CHO AI CODING AGENT: POMOFOCUS V6.0 ULTIMATE
Áp dụng nghiêm ngặt theo Karpathy Guidelines (Surgical Changes, Simplicity First, Loop Until Verified).

---

## 0. YÊU CẦU TIÊN QUYẾT BẮT BUỘC TRƯỚC KHI VIẾT CODE
1. Tự mở tệp HTML trực quan: Mở ngay tệp `skills/pomofocus-design-system/assets/design-system-showcase.html` trong trình duyệt hoặc Markdown preview để xem trước toàn bộ các khối kính Liquid Glass, thanh Dockbar macOS có hiệu ứng phóng đại, hệ thống chấm 3 trạng thái và 5 animation physics.
2. Tự click và đối chiếu với các kho thiết kế thực tế uy tín thế giới đã được tích hợp trong showcase:
   - Kho kính lỏng & component: https://uiverse.io/tags/glassmorphism và https://uiverse.io/ui/glassmorphism-cards
   - Kho tối giản & bố cục khoảng thở: https://minimal.gallery/ và https://siiimple.com/
   - Kho web đạt giải thưởng: https://www.awwwards.com/websites/minimal/
   - Kho chuyển động vật lý: https://motion.dev/ và https://jitter.video/templates/
3. Đọc kỹ mã nguồn mẫu chuẩn macOS Liquid Dock tại: `skills/pomofocus-design-system/references/apple-liquid-dock.md`.

---

## 1. TRIỆT TIÊU 100% HIỆN TƯỢNG NHÁY CHỮ KHI TẢI TRANG (ZERO-FOUT)
- Triệu chứng: Khi vào trang hoặc F5, văn bản thô chưa có CSS nhấp nháy trên màn hình trước khi giao diện tối màu và khối kính Liquid Glass kịp hiển thị.
- Giải pháp xử lý triệt để:
  1. Trong `index.html`: Khóa màu nền tối ngay từ thẻ `<html>` và `<body>`:
     ```html
     <html lang="vi" class="dark" style="background-color: #09090b !important; color: #f4f4f5;">
     ```
  2. Thêm Splash Curtain siêu nhẹ (Zero-Dependency Preloader) che phủ toàn màn hình ngay trong `index.html`:
     ```html
     <style>
       html, body { background-color: #09090b !important; margin: 0; padding: 0; overflow-x: hidden; }
       #pomo-splash-curtain {
         position: fixed; inset: 0; background-color: #09090b; z-index: 99999;
         display: flex; align-items: center; justify-content: center;
         transition: opacity 300ms cubic-bezier(0.16, 1, 0.3, 1), visibility 300ms;
         pointer-events: none;
       }
       #pomo-splash-curtain.loaded { opacity: 0; visibility: hidden; }
       .pomo-spinner {
         width: 32px; height: 32px; border-radius: 50%;
         border: 2px solid rgba(255, 255, 255, 0.1); border-top-color: #10b981;
         animation: pomoSpin 0.7s linear infinite;
       }
       @keyframes pomoSpin { to { transform: rotate(360deg); } }
     </style>
     <div id="pomo-splash-curtain"><div class="pomo-spinner"></div></div>
     <script>
       window.addEventListener('DOMContentLoaded', () => {
         setTimeout(() => {
           const c = document.getElementById('pomo-splash-curtain');
           if (c) c.classList.add('loaded');
         }, 100);
       });
     </script>
     ```
  3. Trong CSS phông chữ: Đổi `font-display: swap` thành `font-display: optional` để triệt tiêu hoàn toàn hiện tượng nhảy phông.

---

## 2. KHẮC PHỤC LỖI KHUNG CHAT AI COMPANION BỊ CẮT TRÊN ĐỈNH
- Vị trí: `src/components/PlatformHeader.tsx` và `src/components/AiStudyCompanion.tsx` (hoặc component sidebar AI).
- Nguyên nhân: Cụm nút header góc phải (Avatar, ⚡ 50, Gear/Settings) nằm ở `z-index` và tọa độ `y = 0 đến 50px` đè thẳng lên thanh tiêu đề của khung chat AI khi mở ra.
- Giải pháp:
  1. Nâng `z-index` của AI Companion panel lên `z-[80]` (cao hơn hẳn cụm nút header).
  2. Bổ sung cơ chế: Khi `isAiOpen === true`, tự động ẩn hoặc đẩy cụm nút header góc phải ra phía sau để thanh header của AI Companion (tiêu đề, nút +, lịch sử, nút đóng X) hiển thị trọn vẹn 100%, không bị che lấp bất kỳ nút nào.

---

## 3. GIẢI PHÓNG DIỆN TÍCH ĐỈNH TẠI /app & KÉO THẢ SÁT TRẦN (y = 8px)
- Vị trí: `PlatformHeader.tsx` và hệ thống bố cục không gian làm việc `/app`.
- Yêu cầu:
  1. Tại `/app`, người dùng vào để tập trung học tập, KHÔNG CẦN thanh menu điều hướng dài dòng.
  2. Thu gọn điều hướng: Đưa nút "Về Trang Chủ" (Home) vào một icon kín đáo ở menu cài đặt phụ hoặc một viên nang nổi thu nhỏ.
  3. Tháo bỏ giới hạn kéo thả cũ (`y >= 80px`). Cho phép người dùng tự do kéo thả các thẻ widget (Đồng hồ, Tasks, Notes, Media) lên sát mép màn hình trên cùng (`y = 8px` hoặc `top-2`), tận dụng tối đa 100% diện tích làm việc.

---

## 4. TÍCH HỢP THANH DOCKBAR MACOS LIQUID GLASS CHUẨN MẪU
- Vị trí: `src/components/FloatingDock.tsx` hoặc `PlatformHeader.tsx`.
- Áp dụng nguyên mẫu mã nguồn chuẩn từ `skills/pomofocus-design-system/references/apple-liquid-dock.md`:
  1. Vật liệu Liquid Glass: `-webkit-backdrop-filter: blur(20px) saturate(150%)`, nền kính sâu `rgba(30, 30, 35, 0.75)`, viền sáng phản chiếu specular mỏng `.dock::before`.
  2. Hiệu ứng Magnification kế cận:
     - Icon đang hover phóng to cực đại `scale(1.75)`.
     - Icon liền kề 1 nấc phóng to 56% theo đường concosine `scale(1.42)`.
     - Icon liền kề 2 nấc khẽ nảy `scale(1.04)`.
     - Khi bấm giữ: Nhấc bổng lên trên `translateY(-8px)`.
  3. Tooltip thủy tinh mờ: Hiển thị nổi phía trên 14px với `backdrop-filter: blur(18px)`.
  4. Chấm đèn hoạt động (.dock__dot): Chấm sáng tròn 3px trắng ngọc tỏa hào quang phía dưới icon khi thẻ tương ứng đang mở trên bàn làm việc.
  5. Đầy đủ responsive co nhỏ cho tablet (56px/48px) và mobile (40px).

---

## 5. THIẾT LẬP BIÊN ĐỘ KÍCH THƯỚC GIỚI HẠN (DIMENSION GUARDRAILS) TỪNG THẺ
Tuyệt đối không ép chung một khuôn kích thước. Cấu hình `minWidth`, `maxWidth`, `minHeight`, `maxHeight` cho từng thẻ:
- Pomodoro Timer: Min `300 x 220px` — Max `440 x 340px`. Giữ cố định trọng tâm số đếm, không giãn trống trải vô lý.
- Task List: Min `320 x 280px` — Max `500 x 650px`. Tự động mở rộng danh sách cuộn mượt nội bộ.
- Quick Notes: Min `280 x 240px` — Max `680 x 720px`. Khu vực textarea co giãn tự do theo khung kéo.
- Media Player: Min `280 x 140px` — Max `420 x 260px`. Bắt buộc khóa cứng tỷ lệ khung hình video 16:9 khi dãn khung.
- AI Companion: Min `340px` — Max `460px`, chiều cao `h-[calc(100vh-24px)]`.

---

## 6. KHỬ Ô NHIỄM MÀU SẮC & RÁC TIẾP THỊ THEO CHUẨN ZEN
1. Chuyển đổi các badge màu xanh/cam/đỏ thô ráp thành Chấm chỉ báo 3 trạng thái vi mô (3-State Micro Dot):
   - `bg-emerald-400`: Đang chạy / Live / Hoạt động.
   - `bg-amber-400`: Tạm dừng / Chờ / Pending.
   - `bg-zinc-500`: Nghỉ / Tắt / Offline.
2. Tôn vinh Typography đơn sắc: Làm nổi bật thông tin quan trọng bằng độ tương phản chữ trắng tinh khiết (`text-white`), font-weight (`font-semibold`), và khoảng cách thở, tuyệt đối không dùng màu mè lòe loẹt.
3. Dọn sạch rác văn bản & âm thanh:
   - Xóa vĩnh viễn âm thanh "Gà gáy" trong `AmbientSoundWidget.tsx`.
   - Xóa bỏ toàn bộ các câu mô tả sến súa trong danh sách âm thanh (chỉ giữ Icon + Tên âm thanh + Thanh trượt âm lượng siêu mỏng).
   - Xóa bỏ các banner quảng cáo/upsell chèn ngang trong khung đổi hình nền và bảng âm thanh.
   - Sửa dứt điểm các lỗi cắt cụt chữ `...` ở ô nhập task: đổi thành `Thêm nhiệm vụ mới... (Enter)`.
4. Ngăn ngừa lỗi đè lớp 4 tầng: Khi mở nhiều widget từ Dockbar, nếu chúng chưa được định vị thì tự động tính toán tọa độ so le (cascade) cách nhau 24px, không đè kín mít lên nhau tại tâm màn hình.

---

## 7. QUY TRÌNH KIỂM THỬ VÀ NGHIỆM THU
1. Chạy toàn bộ test suites hiện có: `npm test` hoặc `vitest` (đảm bảo 100% tests pass, cập nhật các ca test nếu cần).
2. Kiểm tra biên dịch TypeScript: `tsc && vite build` hoàn tất sạch sẽ 0 lỗi và 0 warning type.
3. Đồng bộ Git và kích hoạt Vercel Production:
   - Commit với thông điệp: `feat(design): implement apple liquid glass, macos dock magnification, zero-fout and zen minimalism v6.0`
   - Push lên cả 2 nhánh `master` và `main`.
   - Đảm bảo alias chính thức `pomofocus-workspace.vercel.app` trỏ vào bản build mới nhất.
<<<APPROVED_PROMPT

## 2026-11-08T05:57:37Z

You are the Project Orchestrator (Generation 2) for Pomofocus v6.0 Ultimate.
Resume work at d:\FileCuaNam\Web'\Pomodoro\.agents\teamwork\orchestrator\.
Read handoff.md, BRIEFING.md, ORIGINAL_REQUEST.md, DISPATCH.md, and progress.md for current state.
Your parent is 3c77903f-b175-4416-b0b2-6bfc2a8beb2a — use this ID for all escalation and status reporting (send_message).

CURRENT MISSION STATE:
1. Milestone 1: Zero-FOUT & Typography Foundation is DONE and VERIFIED (Gate PASSED, 100% clean audit).
2. E2E Testing Track: COMPLETED (TEST_INFRA.md, TEST_READY.md published, 50 E2E tests green).
3. Milestone 2: Workspace Top Clearance (y=8px) & AI Collision Resolution:
   - Explorers M2-1, M2-2, and M2-3 have completed investigation and provided surgical diffs:
     * d:\FileCuaNam\Web'\Pomodoro\.agents\teamwork\explorer_m2_1\handoff.md
     * d:\FileCuaNam\Web'\Pomodoro\.agents\teamwork\explorer_m2_2\handoff.md
     * d:\FileCuaNam\Web'\Pomodoro\.agents\teamwork\explorer_m2_3\handoff.md
     * d:\FileCuaNam\Web'\Pomodoro\.agents\teamwork\explorer_m2_3\feature6_ai_header_collision.patch
     * d:\FileCuaNam\Web'\Pomodoro\.agents\teamwork\explorer_m2_2\feature5_compact_home_nav.patch
   - IMMEDIATELY DISPATCH Worker M2 (teamwork_worker) to apply the verified surgical changes across WidgetContainer.tsx, useLayoutStore.ts, App.tsx, PlatformHeader.tsx, and AiCompanionWidget.tsx.
   - Run the standard Milestone 2 verification gate (2 Reviewers, 2 Challengers, 1 Forensic Auditor).
4. Advance through Milestone 3 (macOS Liquid Dock magnification & tooltips per apple-liquid-dock.md), Milestone 4 (Dimension guardrails, Zen cleanup, 24px cascade), and Milestone 5 (100% E2E test pass, Tier 5 hardening, build, git push master/main, and Vercel alias verification).

Follow all rules in AGENTS.md, UI_UX_DESIGN_PLAYBOOK_AND_POSTMORTEM.md, and Karpathy Guidelines.
Start your recurring heartbeat cron and proceed directly with Milestone 2 implementation.


## 2026-11-08T23:52:29Z

You are the Project Orchestrator for this Teamwork run.
Your working directory is: .agents/teamwork/orchestrator/

Please read and execute the requirements recorded in:
d:\FileCuaNam\Web'\Pomodoro\.agents\teamwork\ORIGINAL_REQUEST.md

Workspace Root: d:\FileCuaNam\Web'\Pomodoro
Follow all project rules and user instructions:
- Strict Karpathy Guidelines (Surgical Changes, Simplicity First, Loop Until Verified)
- Read skills/pomofocus-design-system/SKILL.md and skills/uiux-pro-max/SKILL.md
- Follow AGENTS.md governance and UI/UX design playbook
- Coordinate across the 3 streams:
  1. Pomodoro Timer State Machine (TimerWidget.tsx, useTimerStore.ts)
  2. Tasks Widget (TasksWidget.tsx, useTaskStore.ts) & Whiteboard persistence (StudyRoomView.tsx)
  3. AI Companion (AiCompanionWidget.tsx, useAiStore.ts)
  4. Calendar sync (DedicatedCalendarView.tsx, CalendarWidget.tsx) & Solid spaces (SpacesWidget.tsx)
  5. Comprehensive testing (vitest / npm test), TypeScript build (tsc && vite build), git commit, and deployment confirmation.

Maintain your plan.md, progress.md, and BRIEFING.md in .agents/teamwork/orchestrator/.
When all tasks and verifications are complete, report your victory claim with full evidence to me.
