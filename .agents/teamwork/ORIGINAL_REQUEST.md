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
