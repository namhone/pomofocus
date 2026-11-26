# Kiểm chứng Samsung USB — 26/11/2026

Đây là baseline APK 8.1.2/code83. Bản sửa 8.1.3/code84 được ghi tại SAMSUNG_TOUCH_STARTUP_FIX_REPORT.md; chưa có nghiệm thu USB84 vì thiết bị đã ngắt kết nối.

**Kết luận: APK chưa đạt nghiệm thu cảm ứng.** Cài đặt/startup/callback route pass; nút Pause bị nuốt khi chạm thật.

## Môi trường và kiểm tra đã chạy

- Samsung SM-G998B, Android 15, WebView 158.0.8127.46; USB ADB được cấp quyền.
- APK 8.1.2/code83, 8.43 MB; SHA256 khớp metadata: 67e6cc1448c353d530646b13bfe00ab7d6e70315ea73b47d39b16e59c9ca2d0a.
- `adb install -r` thành công, không xóa dữ liệu. Installed package đúng version/code.
- MainActivity và `pomofocus://oauth/callback` mở được. Theo dõi PID 30 giây: tiến trình còn sống, không có dòng crash/WebView/Audio/OAuth khớp bộ lọc lỗi trong tiến trình app.
- Có một cảnh báo ART về ảnh `base.odex` của WebView không executable. Giữ nguyên trong log/warnings; không coi riêng cảnh báo này là app crash khi tiến trình và giao diện vẫn hoạt động.
- Đây chỉ là callback trống để thử route, chưa kiểm chứng đăng nhập Google thật.

## Lỗi cảm ứng đã tái hiện

1. Chạm Play qua ADB theo bounds của nút từ cây accessibility: timer chạy, đọc được 24:56.
2. Chạm Pause tại chính nút đó: timer vẫn running. Trace trong WebView thật ghi `pointerdown → pointerup → pointerout → pointerleave → click`, tất cả là sự kiện trusted, pointerType touch.
3. `MobileFocusView.tsx`: `onPointerLeave` gọi `handleActionPointerCancel`, đặt `suppressNextClickRef.current = true`; `handleActionClick` sau đó bỏ click. Lúc start, pointer-up đã thực hiện hành động nên Play vẫn chạy; Pause dựa vào click nên bị nuốt.
4. Click chuột qua CDP vào cùng nút thì timer chuyển paused, còn 21:58. Đã dừng app sau test để xóa instrumentation tạm; không reset hiệp/dữ liệu.

Phạm vi sửa đề xuất: phân biệt kết thúc touch bình thường với hủy giữ trong các handler pointer của MobileFocusView; thêm regression dùng touch/tap thật thay vì chỉ `.click()`. Chưa sửa product code hoặc build APK khác trong nhiệm vụ kiểm chứng này.

## Hiện tượng cần xác minh thêm

Một lượt mở lại/chụp ADB cho khung app đen và cây accessibility thiếu nút, trong khi PID vẫn sống. Kiểm tra CDP thấy DOM `/app`, timer 25:00, visibility/opacity bình thường. Trong lúc chụp compositor/kiểm tra CDP, giao diện và cây accessibility xuất hiện trở lại. Chưa kết luận nguyên nhân hoặc độ lặp lại; không gộp hiện tượng này vào kết luận startup hoàn toàn ổn định.

## Script và bằng chứng

- Vá quote định dạng `adb shell date` để shell Android nhận một đối số.
- Thu hẹp đúng dòng cảnh báo ART đã quan sát, vẫn bắt FATAL/Uncaught/WebView/Audio/OAuth khác; giữ cảnh báo trong `matchedWarnings`.
- Unit script 11/11 pass với fake ADB riêng biệt, gồm regression quote và cảnh báo ART; `npm run type-check` exit 0.
- Bản tóm tắt đã bỏ serial/token: `artifacts/android-usb/verification.json`.
- Logcat đã redact, screenshot/UI dump/trace thật lưu cục bộ ở `tests/results/android-smoke/` (gitignored). Không đưa screenshot điện thoại hoặc serial lên Git.
- Đã tháo cổng ADB forward 9223 và xóa XML UI tạm trên điện thoại. Không sửa logic Auth/Wallet/Avatar/A11y, không gọi API thanh toán hoặc đăng nhập tài khoản thật.
