# Original User Request

## Parameters

[skip-interview]
How this run was launched; not part of the task.

## Initial Request — 2026-11-15T15:49:19Z

/karpathy-guidelines /mobile-design /mobile-developer /mobile-security-coder /android-cli /android-device-hub /systematic-debugging /memory-leak-debugging /production-code-audit /vercel-deployment /verification-before-completion

MỤC TIÊU ĐỢT 3: CHUẨN HÓA ANDROID APK, PHẦN CỨNG, WEBVIEW, AUDIO MIXER & CƠ CHẾ OFFLINE/UPDATE

Không phỏng vấn hỏi lại. Áp dụng triệt để `/karpathy-guidelines`: đọc toàn bộ cấu hình Capacitor/Android, `AndroidManifest.xml`, Service Worker, Audio Engine, Auth OAuth và `vercel.json` trước khi sửa; làm tối giản, sửa đúng chỗ (surgical changes), không phá vỡ các phần pháp lý `vn-law-check` vừa tích hợp.

1. Khắc phục tương thích Android System & WebView:
   - Kiểm tra `git status` và xóa file tạm `update_momo_modal.js` nếu vẫn còn sót lại trong repo.
   - Xiaomi MIUI Force Dark: Khai báo `color-scheme: dark` đúng chuẩn trong CSS/HTML để hệ thống MIUI không ép đảo màu gây loang nền đen hoặc sai tương phản.
   - Android 15 Edge-to-Edge `WindowInsets`: Xử lý trường hợp `env(safe-area-inset-top/bottom)` trả về `0px` trên WebView Android 15, đảm bảo Header và Bottom Nav không bị đè vào thanh trạng thái hay thanh điều hướng cử chỉ.
   - Font Scale (1.3x+): Không để các nút cố định chiều cao bị cắt chữ khi người dùng bật cỡ chữ hệ thống lớn.
   - Hỗ trợ xoay ngang (Landscape) hợp lý cho `/rooms` khi xem PDF hoặc chia sẻ màn hình, và giữ layout an toàn khi chia đôi màn hình (split-screen) hoặc cửa sổ nổi.
   - Bổ sung React `ErrorBoundary` toàn cục và fallback cho route 404 SPA.

2. Bàn phím ảo, Nhập liệu tiếng Việt & OAuth / Deep Link:
   - Cấu hình `adjustResize` chuẩn cho bàn phím mềm Android, gắn `enterkeyhint` và `inputMode="numeric"` cho các ô nhập số/thời gian.
   - Sửa lỗi gõ tiếng Việt Telex/VNI bị kẹt hoặc submit sớm khi nhấn Enter lúc `event.isComposing === true`.
   - Sửa lỗi Google OAuth `403 disallowed_useragent` trên WebView: chuyển luồng đăng nhập sang Chrome Custom Tabs (`@capacitor/browser`) kết hợp Deep Link `appUrlOpen` để quay lại app mượt mà.
   - Hỗ trợ App Links cho `/rooms` và chặn mọi link `http(s)` bên ngoài (trong AI chat, Meet chat) mở bằng `@capacitor/browser` thay vì điều hướng mất WebView app.
   - Tích hợp `@capacitor/haptics` cho phản hồi rung native, `@capacitor/filesystem` + `@capacitor/share` cho xuất file JSON backup, và fallback `@capacitor/clipboard`.

3. Thông báo nền, Wake Lock & Audio Engine:
   - Android 13+: Xin quyền runtime `POST_NOTIFICATIONS`, tạo `NotificationChannel` mức `IMPORTANCE_HIGH` và đặt lịch báo thức chính xác (`allowWhileIdle`) khi hết phiên Pomodoro (đối chiếu khớp với khai báo quyền trong `AndroidManifest.xml` và `LegalViews.tsx`).
   - Tự động xin lại `Screen Wake Lock` mỗi khi `visibilitychange` chuyển về `visible` để màn hình không tắt giữa chừng khi quay lại app.
   - Audio Ducking: Tự động giảm âm lượng nhạc nền Mixer trước khi phát chuông hết giờ; chặn chuông phát chồng lên nhau và tắt âm preview ngay khi rời tab Settings.
   - Nút "Tắt tất cả" trong Mixer phải ngắt kết nối triệt để mọi Web Audio nodes để tránh rò rỉ bộ nhớ và hao pin.
   - Lắng nghe `devicechange` (rút/mất kết nối tai nghe Bluetooth) để tự tạm dừng hoặc hạ âm lượng an toàn; trong `/rooms` Meet dùng luồng `VOICE_COMMUNICATION` phải tự tạm dừng/duck Mixer.
   - Nếu âm lượng Media hệ thống bằng 0, hiển thị cảnh báo trực quan + kích hoạt Haptic fallback; đồng bộ `MediaSession API` cho trình điều khiển khóa màn hình.

4. Offline, Bộ nhớ, PWA Cache & Build APK sạch:
   - Đóng gói offline cho font chữ, ảnh nền mặc định và âm thanh synth; áp dụng lazy-load và `URL.revokeObjectURL` cho file tải lên.
   - Tự động nén/resize ảnh nền custom người dùng chọn xuống tối đa `1080p` định dạng WebP để không tràn RAM WebView.
   - Sửa lỗi nhúng YouTube trong APK WebView (origin/referer policy).
   - Cấu hình PWA `navigateFallbackDenylist` loại trừ `/downloads/` và `/version.json`; đặt `Cache-Control: no-cache, must-revalidate` trên Vercel cho file HTML/manifest/version.
   - Nút cập nhật phiên bản trong app APK phải mở trình duyệt hệ thống để tải bản mới.
   - Chạy `npm run type-check`, Vitest liên quan, build release APK sạch, kiểm tra dung lượng thực tế và cài thử qua `adb install -r` nếu thiết bị Android đang kết nối.

---
### CONTEXT TRƯỚC ĐÓ ĐÃ HOÀN THÀNH:
- Master branch commits gần nhất:
  - `3c49c1b`: `feat(v8.1-d4): standalone apk v8.1 build, assetlinks & 100% full-tier e2e verification`
  - `e5f53c8`: `feat(v8.1-d3): layout & stacking context polish, task reordering, audio stop resilience & settings streamline`
  - `cab3f26`: `feat(v8.1-d2): complete meet rooms overhaul - multi-device, webrtc resilience, 2-layer whiteboard & clean meet UI`
  - `7c076d8`: `feat(v8.1-d1): complete wave 1 - storage, user avatar, db sync, timer engine & payment hardening`
- Tệp cấu hình App Links: `public/.well-known/assetlinks.json` (SHA-256 cert fingerprint `23:9F:25:FE:7F:C7:55:E3:F9:A2:05:A6:A4:F8:E9:C2:D0:A5:C9:EA:6E:87:E6:D8:C4:7A:A0:8F:39:86:B2:0F`, package: `com.pomofocus.workspace`).
- Bản APK v8.1 đã biên dịch hiện tại: `public/downloads/PomoFocus-v8.1.apk` (8.69 MB, `22adf20...`).
- Bộ kiểm thử hiện tại: 131/131 files unit tests pass (1900/1900 tests), 219/219 Playwright tests `v81E2EHubAndMeet.spec.ts` pass.
- Testbed Vite LAN: đang chạy trên `http://0.0.0.0:5173`.
- Báo cáo kiểm toán: `master_audit_v81_completion_report.md`.

## Follow-up — 2026-11-15T23:38:31Z

MỤC TIÊU ĐỢT 4: ĐỒNG BỘ THẨM MỸ MONOCHROME 90-10, TINH CHỈNH UI/COPY VÀ NGHIỆM THU TOÀN DIỆN

Không phỏng vấn hỏi lại. Đối chiếu trực tiếp toàn bộ UI trên Web Desktop, Mobile Web và APK theo chuẩn Monochrome 90-10 (`#09090b` OLED black, trắng/zinc, đường chia mảnh `white/[0.06]`, không đóng hộp thừa). Tuyệt đối giữ nguyên nội dung pháp lý `vn-law-check` đã thêm ở `CookieConsentBanner.tsx`, `LegalViews.tsx`, `AiCompanionWidget.tsx` và `MoMoPaymentModal.tsx`, chỉ tinh chỉnh lại vị trí và sắc độ cho đồng bộ.

1. Quy chuẩn Thị giác, Tương tác & Bảo toàn Pháp lý:
   - Thay thế toàn bộ emoji màu (`🍅`, `💡`, `⚡` cam) bằng icon Lucide nét mảnh `1.5px` đồng nhất sắc độ.
   - Chuyển toàn bộ text giao diện sang Sentence Case (tuyệt đối bỏ ALL CAPS ở label, nút, badge).
   - Sửa triệt để lỗi tương phản WCAG chữ đen trên nền xanh đậm ở các nút chính; kiểm tra checkbox ở `SettingsWidget.tsx` (không để gradient xanh lá gắt lạc tông khỏi Monochrome 90-10); bọc `@media (hover: hover)` để triệt tiêu lỗi dính trạng thái hover trên cảm ứng mobile.
   - Tinh chỉnh vị trí `CookieConsentBanner.tsx` trên Mobile để không che khuất Bottom Nav `56px` hoặc nút điều khiển chính; sắp xếp Z-index chuẩn giữa Cookie Banner, Toast, Pocket Lock và Auth Bottom Sheet; chuẩn hóa `document.title` cho từng trang.

2. Shell, Header & Bottom Nav:
   - Header gọn `48px`: gỡ bỏ badge `LIQUID ZEN` và chấm vàng bị kẹt, chỉ giữ `[ Logo + PomoFocus ]` bên trái và `[ 50 · K ]` bên phải; ẩn nút `PiP` khi chạy trong APK.
   - Bottom Nav `56px`: bỏ quầng sáng xanh neon gây chói, chỉ dùng icon trắng + chấm `3px` báo tab đang chọn và chấm báo âm thanh đang phát; đảm bảo trên Mobile có lối vào rõ ràng tới Meet (`/rooms`), Notes, Lịch/Thống kê và trang Nạp Credit/Billing.

3. Tab Focus, Tasks, Spaces & Mixer:
   - Tab Focus: Sửa lỗi nội suy chuỗi `Hiệp $1/$4` thành `Hiệp 1/4`; cân bằng độ rộng 3 nút chuyển chế độ phiên; đổi placeholder thành `"Chọn mục tiêu phiên này..."`; gỡ viền hộp quanh chế độ `Kỷ luật`.
   - Bộ chọn task trong Focus mở dạng Bottom Sheet (không bao giờ che mất đồng hồ `25:00`); nút Play chính `56px`, hai nút phụ `40px`, nút Reset `↺` có vòng tròn nhấn giữ `1.5s`; thanh thống kê đáy dùng font sans-serif một dòng mảnh `0g 0p · 0 phiên`; thêm xem/xóa Session Log; Pocket Lock dùng `createPortal` với thông báo `"Đã bật khóa chống chạm nhầm"` và `"Nhấn giữ để mở khóa"`.
   - Tab Tasks: Sửa lỗi hiển thị 3 dấu chevron (`^`, `v`, `v`), làm sạch từng dòng task; bổ sung sửa tiêu đề, sửa số hiệp ước tính, xác nhận/Undo khi xóa toàn bộ việc đã xong, vuốt xóa có Undo Snackbar; khóa nút gắn vào Focus với task đã hoàn thành; tự chuyển bộ lọc khỏi `Đã xong` khi thêm task mới; tối ưu empty state theo ngữ cảnh, placeholder `"Việc cần làm..."` và sửa tương phản nút `+`.
   - Tab Spaces & Mixer: Giảm số thanh top bar chồng chéo; gộp nút `Tắt nền (Pure Zen Black)` bị trùng và đảm bảo tắt sạch nền Trái Đất đồng bộ qua mọi tab; Việt hóa `Solid`/`Image`/`Video`, thêm bộ lọc và thanh chỉnh Blur/Brightness. Trong Mixer, khi track tắt phải làm xám cả thanh trượt lẫn `%`, thêm công tắc bật/tắt từng track, dùng Sentence Case cho các pill, thêm fade mask cho `Sóng não (`, thanh trượt mảnh `3px` và phân biệt rõ `"Âm lượng chuông"` với `"Âm lượng nhạc nền"`.

4. Tab AI, Settings, Auth & Topup Modal:
   - Tab AI: Gỡ lời chào lặp chồng, gỡ badge `⚡ 50 (Nạp thêm)` bị lặp; khi lỗi mạng chỉ hiện một bong bóng lỗi kèm nút `Thử lại` (không nhân đôi tin nhắn người dùng); bổ sung Drawer lịch sử chat, nút Tạo chat mới, nút Dừng streaming, xác nhận xóa (ẩn/vô hiệu hóa khi rỗng); ô nhập nhiều dòng `"Nhắn cho trợ lý..."`; bật `select-text` để copy và `overflow-x-auto` cho bảng/KaTeX; bỏ `💡` và chip `"ôn thi đại học"`; sửa tương phản nút Gửi và giữ nguyên nhãn `Nội dung do AI tạo (Luật 134/2025)` theo tông Monochrome tinh gọn.
   - Settings, Auth & Topup: Thêm `pb-28` và `scroll-padding-top` để không bị cắt dropdown `Twinkle` hay lòi viền card phía trên; Việt hóa tên chuông; nút cộng/trừ stepper `36px` kèm bấm trực tiếp vào số để nhập tay; gỡ nút `"Khôi phục giao diện ban đầu"` trên Mobile; gom nhóm bằng hairline `1px` và gọn thẻ Tài khoản thành 2 dòng.
   - Auth Sheet: Gỡ tiêu đề `"Đăng nhập"` bị lặp, đổi placeholder `"Nhập email của bạn"`, `"hoặc dùng email"`, sửa chữ đen trên nền xanh đậm ở nút `"Nhận mã đăng nhập qua email"`, nút Google `44px` dịu mắt hơn, tự cuộn khi mở bàn phím và giữ nguyên nội dung đang gõ nếu lỡ chạm backdrop; đảm bảo `AiCreditsTopupModal` và `MoMoPaymentModal` (kèm dòng cam kết hoàn tiền 7 ngày) hiển thị vừa vặn ở chiều ngang `390px`.

5. Trang `/download` & Các Route Web khác:
   - Header trang `/download`: Gỡ bỏ hoàn toàn `Mở bản web →`, `50 ⚡`, `Đăng Nhập`, `Thành viên Free` và 8 link điều hướng web nội bộ.
   - Cập nhật dung lượng thật của bản APK vừa build ở Đợt 3, gỡ chữ `Liquid Zen` và các chữ ALL CAPS, cập nhật ảnh/mô hình 3D mockup sang đúng giao diện V8.1 Monochrome mới (có đủ 3 nút điều khiển và avatar `K`), đồng nhất màu sắc 3 icon tính năng, căn chỉnh vừa khít 100% trong khung `1440x900` không cần cuộn thừa, và kiểm tra lại thẻ OpenGraph.
   - Rà soát đồng bộ luôn `/`, `/app` Desktop, `/calendar`, `/dashboard`, `/billing` và breakpoint Tablet.

6. Nghiệm thu & Deploy toàn diện:
   - Chạy kiểm tra trực quan đa thiết bị bằng Playwright (Desktop, Tablet, Mobile 390px), chạy `npm run type-check`, chạy toàn bộ Vitest suite, kiểm tra `git status` dọn sạch file tạm/rác.
   - Build lại APK cuối cùng (`npm run build:apk`), cài thử qua `adb install -r` nếu có máy kết nối, commit & push Git, và deploy kiểm chứng trên cả hai domain Vercel (`pomofocus-workspace.vercel.app` & `pomofocus-workplace.vercel.app`).

---
### THÔNG TIN TIỀN ĐỀ TỪ ĐỢT 3 VỪA HOÀN TẤT:
- Bản phát hành APK hiện tại: `public/downloads/PomoFocus-v8.1.apk` (8.70 MB, SHA-256: `466f8f73bafc2cac7fd2d63177a13ffae250ea6a4243385a19b8ddbff053d853`, version `8.1.0`).
- Cấu hình Vercel hiện tại: Đã hỗ trợ cả hai domain, cấu hình No-Cache cho APK & manifest.
- Báo cáo Đợt 3: `audit_v81_dot3_completion_report.md`.
- Toàn bộ 135/135 test suites pass, 0 type errors. Commit gần nhất: `53a1449`.
