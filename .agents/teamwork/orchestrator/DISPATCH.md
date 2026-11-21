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

## 2026-11-19T15:05:53Z

[Message] timestamp=2026-11-19T15:05:53Z sender=647839d2-7215-4b3d-a69e-e8416d5f008d priority=MESSAGE_PRIORITY_HIGH content=/master-solution-team /master-solution-team  /dispatching-parallel-agents  /karpathy-guidelines  /production-code-audit  /systematic-debugging  /memory-leak-debugging  /playwright-skill  /a11y-debugging  /cookie-debugging  /wcag-audit-patterns  /vn-law-check  /ponytail-audit  /verification-before-completion 

NHIỆM VỤ: FORENSIC DEEP-AUDIT HỢP NHẤT (TRUY VẾT SÂU LỖI ĐÃ BIẾT + QUÉT MỚI TOÀN HỆ THỐNG — CHỈ BÁO CÁO, CHƯA SỬA CODE)

Không phỏng vấn hỏi lại, tuyệt đối chưa chỉnh sửa bất kỳ file code nào. Không đánh giá "đạt chuẩn" chung chung. Hãy chạy kiểm toán song song trên 4 môi trường:
- Môi trường A: Desktop Laptop `1366x768` zoom 100%
- Môi trường B: Desktop Chuẩn `1440x900` zoom 100%
- Môi trường C: Mobile Web `390x844` (`hasTouch: true`)
- Môi trường D: Giả lập Android Capacitor Native (`Capacitor.isNativePlatform() === true` + Android 15 Edge-to-Edge insets + bàn phím ảo)

Phủ toàn bộ 12 routes (`/`, `/app`, `/rooms`, `/rooms/:id`, `/billing`, `/profile`, `/settings`, `/calendar`, `/dashboard`, `/download`, `/privacy`, `/terms`) và mọi modals/drawers/widgets. Mọi lỗi ghi nhận BẮT BUỘC phải có bằng chứng (`file:dòng_code`, giá trị đo DOM/CSS, log console/network hoặc screenshot).

PHẦN 0 — XÁC MINH & TRUY VẾT LAN TỎA TỪ CÁC LỖI ĐÃ PHÁT HIỆN (SEED BUGS)
Với mỗi lỗi đã phát hiện dưới đây, KHÔNG CHỈ kiểm tra lại ngay tại chỗ đó mà phải truy vết xem **cùng một lỗi / cùng nguyên nhân gốc** có đang lặp lại ở các component, widget hoặc route anh em khác không:

1. Lỗi kiến trúc & tách biệt APK vs Web:
   - Bấm `"Xem chính sách"` trong APK bị đẩy sang giao diện Web thu nhỏ có Header Web (bị cắt nửa nút `≡`), Footer Web (`LIÊN HỆ TRỰC TIẾP`, `Tải App Android (APK)`, `Cài đặt ứng dụng (PWA)`), mất Bottom Nav nhưng thiếu nút `← Quay lại`. Kiểm tra luôn màn `Nâng cấp VIP`, `Nạp Credits`, `Hồ sơ`, `Thống kê` xem có bị dính Web-leakage tương tự không.
   - `CookieConsentBanner` hiện kiểu web nổi che nội dung Chính sách & đáy Focus trên APK, nút `"Đồng ý & Tiếp tục"` và `"Xem chính sách"` bị bẻ 2 dòng thô.
   - Màn hình khởi động APK đen thui chỉ có 1 vòng xoay xanh lá không logo; lộ SĐT cá nhân thật (`0704862629`) trong `LegalViews.tsx`.

2. Lỗi Auth, Guest ảo & Đồng bộ Cloud:
   - APK tự sinh `"Khách học tập"` (`K`, `⚡ 48`) khi chưa đăng nhập Google; tab Focus hiện `K` (`⚡ 48`) nhưng sang Chính sách lại hiện `Đăng Nhập` (`✨ 48 Credits`); cho hiện cả `Nạp thêm` và `Nâng cấp` khi chưa đăng nhập thật; Google OAuth trên APK không vào luồng thật được.
   - Desktop Header hiện avatar `US` xanh lá + cắt cụt `namho03052...` (`PlatformHeader.tsx:575` `max-w-[85px]`); `ProfileView.tsx:365` dùng avatar vuông `rounded-2xl` thay vì `UserAvatar` `rounded-full`; icon `✉` đứng trơ trọi không chữ; lệch nhãn gói cước giữa Header (`Pro trọn đời`/`Founder VIP`), Dropdown (`Thành viên Free`) và Profile (`PRO TRỌN ĐỜI`).

3. Lỗi Tương tác Widget, Layout & Tỉ lệ:
   - Mini Pill Timer (`• 05:00 ▶ ↗↙`) liệt 100% nút (`WidgetContainer.tsx:437` thiếu `pointer-events-auto` trong `<main pointer-events-none>`). Truy vết xem còn widget/floating pill nào khác dính lỗi tương tự không.
   - Media Player mất sạch nút chuyển nhạc/playlist khi bấm `"Reset vị trí"` (`useLayoutStore.ts:69` height `216px` cắt mất thanh điều khiển dưới); thiếu xác nhận / `Undo` khi bấm Reset vị trí.
   - Ghi chú Desktop mất `+ Thêm`, `✓ Đã lưu` và tab khi kéo rộng ngang, xếp 3 tầng toolbar cắt dòng cuối, `Ý tưởng` đứng ngang hàng `Soạn thảo | Xem trước`.
   - `Không Gian Nền` khi kéo rộng ngang kẹt nửa trái, trống nửa phải (`grid-cols-2`), thanh cuộn Windows thô `▲▼`, xếp 5 tầng bar che lưới ảnh; nút `—` và `✕` trên widget quá to.
   - Desktop `1366x768` zoom 100% bị to quá khổ (zoom 90% mới hài hòa); Header nhồi >12 nút trùng `Tải App` & `Cài App`; Dropdown Avatar lặp 4 link Header đè widget Ghi chú; Dock kẹt chấm vàng số `1`; Timer Desktop bày 2 tầng chỉnh giờ (`25|5|15`) trùng Cài đặt.
   - Android 15 Gesture Bar đè lên chữ `"Không gian"` (Bottom Nav) và `"Bản quyền thuộc PomoFocus"`; dải đen Header cắt ngang đầu ảnh nền; APK thiếu cảnh báo quyền thông báo/tối ưu pin; Tab Focus APK thiếu tạo nhanh task khi trống (`0/0`); `Hiệp 4/4` sáng đủ 4 chấm xanh dù mới `24:58` và bị thanh progress bar cắt ngang.
   - Cài đặt APK bóp nghẹt 5 ô shortcut (`Thống ...`, `Gói cư...`), cắt mô tả (`Số phút cho mỗi phiên họ...`), tách rời `Âm lượng chính`/`Chuông` sang Settings khác với Desktop.

4. Lỗi Tương phản, Kho ảnh, AI Chat & Copy:
   - Nền ảnh sáng (`Góc Học Tập Lo-Fi`) làm chìm toàn bộ tiêu đề mục xám, empty state, nút `+`, `Hiệp 4/4`, dòng cuối Cài đặt; nút `Chế độ Eco` chưa gắn với video nền/blur.
   - Kho ảnh sai tên (`Góc Học Tập Lo-Fi` lại là ảnh cây nắng gắt), quảng cáo lố `"1.000+ ảnh"` & `"4K"`, thiếu Anime đa dạng ngoài Ghibli, Cyberpunk, Lofi, và thiếu ảnh chuyển động (Video), chữ đè `TUYỂN CHỌN Pure Zen Black)`.
   - AI Chat: Khung `"Nhắn cho trợ lý..."` hở khoảng đen đáy trên APK, nhãn `Luật 134/2025` font monospace rớt 2 dòng ở câu chào, nút Xóa bật sáng khi rỗng, AI Drawer đè nửa widget Ghi chú trên Desktop.
   - Còn sót đầy màu xanh lá neon (`Nền & Hiệu ứng`, `Đang chọn`, nút Meet `bg-emerald-500`, avatar `K`, slider `84%`, `Nghe thử`, `Chế độ Eco`, vòng xoay splash, 4 chấm Hiệp), Sticky Note cầu vồng, nút đỏ/vàng/xanh; còn chữ ALL CAPS (`TẠM DỪNG`, `CHỜ BẮT ĐẦU`, `TUYỂN CHỌN`, `PRO TRỌN ĐỜI`, footer...); còn emoji (`🔒`, `📝`, `✨`, `⚡`, `🎯`, `💻`, `🔥`, `🖼`, `🎵`, `🍃`); lộ từ kỹ thuật (`All-in-One Avatar`, `Cloud Sync 1:1`, `Retina SVG Ready`, `CORS qua Proxy`, `IndexedDB/LocalStorage`, `OLED #09090b`, `(Privacy Controls)`...); trang `/download` mâu thuẫn hardcode `8.70 MB` vs `8.5 MB`.

PHẦN 1 — 5 MŨI ĐIỀU TRA PHÁP Y TÌM THÊM TOÀN BỘ LỖI MỚI
Song song với việc truy vết Phần 0, chia 5 mũi chuyên sâu quét toàn bộ codebase & Playwright:
- **Mũi 1 (Kiến trúc APK Độc lập & Routing)**: Quét mọi route/modal/link xem còn chỗ nào rò UI web, kẹt nút Back, lỗi 404/fallback hoặc cold-start offline.
- **Mũi 2 (Auth, Sync, Merge Conflict & Luồng tiền VietQR/MoMo)**: Soi logic merge dữ liệu khi Khách đăng nhập Google, chặn nạp tiền khi chưa đăng nhập thật, đối chiếu code `.gs` VietQR (regex đa ngân hàng, `label:UNREAD`, idempotency DB, Realtime UI), đồng bộ 2 chiều Web <-> APK.
- **Mũi 3 (Playwright DOM & Interaction Stress)**: Đo `getBoundingClientRect`, `scrollWidth`, `elementFromPoint`, click thật (không `force: true`) ở mọi kích thước widget min/max, đo contrast ratio WCAG trên ảnh nền sáng/tối, kiểm tra bàn phím ảo che input & gõ tiếng Việt `isComposing`.
- **Mũi 4 (Meet `/rooms`, WebRTC, Audio Engine & Memory Leaks)**: Soi `RTCPeerConnection`, `MediaStream`, Supabase Realtime channels, `AudioContext`, `setInterval`, event listeners, double-submit / rapid-click race conditions, mất mạng giữa chừng.
- **Mũi 5 (Monochrome 90-10, Copywriting, Bảo mật & `vn-law-check`)**: Regex quét toàn bộ `src/` tìm mọi emoji, ALL CAPS, Title Case sai, màu lạc tông, thuật ngữ kỹ thuật lộ cho user, dữ liệu nhạy cảm, XSS/dangerouslySetInnerHTML và lệch chuẩn pháp lý giữa Web vs APK.

ĐẦU RA BẮT BUỘC:
Xuất 1 báo cáo tổng hợp duy nhất vào `docs/reports/FORENSIC_DEEP_AUDIT_REPORT.md` (đánh số liên tục toàn bộ lỗi từ Phần 0 xác nhận + lỗi mới tìm thêm, phân nhóm theo 5 Mũi và mức độ `CRITICAL / HIGH / MEDIUM / LOW`, mỗi lỗi ghi rõ `file:dòng`, bước tái hiện và bằng chứng đo được), kèm ma trận tổng kết số lượng lỗi ngay trong chat.
