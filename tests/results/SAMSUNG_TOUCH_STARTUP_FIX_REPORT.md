# Samsung — sửa cảm ứng và khởi động, 26/11/2026

Trạng thái: source/build/Chrome đã kiểm chứng, APK 8.1.3/code84; chờ production. Chưa nghiệm thu lại Samsung vì ADB không còn thiết bị được cấp quyền.

## Bằng chứng và sửa đổi

- Baseline 8.1.2/code83: trusted touch phát pointerleave trước click, cờ suppressNextClick nuốt Pause. Báo cáo gốc giữ tại ANDROID_USB_ACCEPTANCE_REPORT.md.
- Test trước sửa: 5 pass/2 fail. Tap hiện chỉ chạy qua onClick, touch-action manipulation; pointerleave chỉ hủy bộ đếm giữ. Pointercancel thật vẫn hủy thao tác. Reset/Skip/khóa bỏ túi không dùng cờ hủy click kiểu này.
- Test bổ sung tái hiện giữ đủ 800ms nhưng không có compatibility click: lần Pause kế tiếp bị bỏ. Mọi pointerdown mới hiện xóa cờ giữ cũ; click của chính thao tác giữ vẫn không chạy hành động hai lần.
- Startup curtain được gỡ khỏi DOM khi React có nội dung, kể cả ErrorBoundary. Nếu root vẫn trống sau 1800ms, hiện thông báo/nút thử lại. Auth getSession ban đầu có deadline 1800ms và bỏ kết quả cũ sau Auth event/unmount; render không đợi Auth.
- APK ngừng đăng ký service worker Web, gỡ đăng ký cũ. MainActivity yêu cầu visual-state callback/invalidate khi resume/lấy lại focus; BackgroundCanvas không tạo filter đồng nhất không cần thiết.
- Không chứng minh được một nguyên nhân duy nhất cho khung đen của bản83. Các sửa khởi động/compositor trên cần tiếp tục thử USB, không được suy từ unit/Chrome thành Samsung hết lỗi.
- Chrome phát hiện thêm lỗi WCAG 2.4.7 (focus visible, mức AA): Eco tắt box-shadow làm nút Play mất vòng focus. Thêm outline tĩnh cho liquid-glow:focus-visible, giữ chế độ forced colors; test siết để không nhận nhầm glow đang chuyển tiếp thành focus ring.

## Kiểm chứng

Kết quả cuối và checksum được ghi ở artifacts/samsung-fix/validation-summary.json và apk-verification.json. Giữ kết quả Chrome trước vá focus trong playwright-before-focus-fix.json (6 pass/2 fail); không che failure bằng retry.

| Gate/suite | Kết quả |
| --- | --- |
| type-check / build / build:apk | exit 0 / 0 / 0 |
| mobileTouchRegression | 8/8 |
| startupCurtainRegression | 3/3 |
| m4MobileUiAndFocusLogic | 12/12 |
| founderEntitlementContract | 17/17 |
| avatarIdentityContract | 12/12 |
| authEpochContract | 5/5 |
| androidSmokeScript | 11/11 |
| phase4bPresentation | 9/9 |
| milestone4OfflineAndBuild | 16/16 |
| Tổng Vitest liên quan | 93/93, không phải toàn bộ repository |
| Chrome UI sau vá focus | 6 pass, 2 lỗi I/O UNKNOWN khi ghi artifact; chạy lại đúng 2 ca: 2/2 pass |
| Chrome Auth/Avatar/A11y | 5/5 pass, gồm 320px forced colors |

Tất cả 8 ca UI riêng biệt đã pass: Focus/Meet tại 1366x768, 1440x900, 390x844 Web và Native giả lập. Không phải một lượt 8/8 liên tục. Bốn ca Focus pass trong lượt đầy đủ, hai ca Meet mobile lỗi ghi file ở audit đã pass khi chạy lại nguyên assertion; kết quả lỗi giữ ở playwright-artifact-write-failure.json. Tám báo cáo Axe có 0 violations trong phạm vi scan; test không tràn ngang/pageerror. Đã xem ảnh desktop và native390 Eco: outline Play hiện rõ; không thêm header hoặc che nút. Không chạy NVDA/TalkBack thật, Cloud hai JWT hay Founder thật; test Founder dùng fixture/contract, không thay thế kiểm chứng đa thiết bị.

APK cuối: 8,872,261 bytes (8.46 MB), SHA256 `6a7f3858f16a930ca62545c84bfaeda98e2655e4238ebd72d649555168900fcd`. AAPT versionName8.1.3/code84, apksigner verify exit0, 26 asset JS/CSS khớp bản sync; không server.url và không APK lồng nhau. Metadata khớp binary; web được build lại sau metadata để dung lượng Hub chính xác.

Không sửa useAuthStore, quyền Founder, wallet, Avatar, database hay API thanh toán. Founder/Avatar/epoch được kiểm bằng contract; chưa đăng nhập Cloud bằng tài khoản thật hay chạy TalkBack trong lượt này.

## USB cần chạy tiếp

Đã gọi scripts/android_smoke_check.ps1: local APK/metadata hợp lệ, dừng ở “No authorized device”; không install hay có logcat84 để kết luận.

Sau khi Samsung kết nối lại, chạy `pwsh -NoProfile -File .\scripts\android_smoke_check.ps1`, rồi `node scripts/android_usb_journey.cjs <serial-từ-adb-devices>`.

Journey dùng tap ADB theo bounds accessibility: 3 cold starts, Play/Pause/Play và kiểm thời gian, khóa bỏ túi/giữ mở, tắt/bật màn hình, Home/resume 3 lượt, kết thúc paused. Chụp màn hình native trước khi gắn CDP để tránh thao tác debug vô tình ép repaint che lỗi. Nếu khóa bảo mật yêu cầu thao tác tay, phải để chủ máy mở khóa. Không xóa dữ liệu app, không ghi serial/logcat/screenshot điện thoại lên Git.

## Production

Chờ gates cuối và xác minh hai alias; cập nhật bằng chứng sau deploy. Không dùng kết quả production cũ để nghiệm thu bản84.
