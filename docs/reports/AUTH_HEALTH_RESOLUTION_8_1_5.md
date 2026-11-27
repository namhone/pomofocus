# Auth health resolution — 8.1.5/code86

Ngày: 27/11/2026. Baseline: 8f9e931. Phạm vi: hai native Auth defects, QR/contact và32 failure trong báo cáo8.1.4. Không đổi cấu hình Provider/Dashboard hoặc schema Cloud của Antigravity.

## Nguyên nhân và bản sửa

- Native Google cancellation: sheet phân biệt SIGN_IN_CANCELLED, xóa feedback và luôn dừng loading. Không mở browser, không tạo session khi hủy.
- Session hết hạn: adapter dùng refresh_token với GoTrue, timeout15 giây, gộp request song song theo session/epoch. Logout hoặc phiên mới vô hiệu hóa response cũ. Token bị server từ chối400/401 xóa session; lỗi mạng giữ dữ liệu phiên để thử lại. JWT exp chỉ là gợi ý thời điểm refresh, không dùng để cấp quyền.
- Foreground: visibilitychange/pageshow/focus và Capacitor appStateChange chạy getSession trước profile/credits. Có guard chống gọi trùng và tháo listener khi unmount. @capacitor/app8.1.2 được đồng bộ Android; disableBackButtonHandler giữ nguyên điều hướng MainActivity.
- QR: giữ role=img/aria-label qua DOMPurify, tiếp tục loại script/event handler. Contact dùng support@pomofocus.vn thống nhất.
- UserAvatar: avatarUrl truyền trực tiếp thắng ảnh Google trong user; guest tổng hợp dùng chữ K.
- TOTP: gom trạng thái/secret/backup codes vào một lần cập nhật profile; chỉ cập nhật session/cache sau khi Cloud thành công. Ghi Cloud thất bại không giả báo bật/tắt thành công và không xóa yếu tố đang có.

## Phân loại32 failure

Artifact failure-classification-resolved.json giữ nguyên tên và lý do baseline của từng ca, kèm chẩn đoán/bản sửa. Không xóa test hoặc thêm skip.

| Phân loại | Số ca | Cách xử lý |
| --- | ---: | --- |
| Lỗi product QR/contact/UserAvatar | 4 | Vá tại sanitizer/contact/Avatar component; giữ assertion đúng. |
| Fixture/assertion cũ | 26 | Transport Auth/PostgREST riêng từng test; Cloud Map tồn tại qua logout, cache client được xóa. Đợi hydration; arrange đúng store identity cho task/note; dùng server app_metadata/plan/balance. |
| Fixture và lỗi product TOTP | 2 | Transport Cloud + chờ ghi Cloud trước khi thay đổi session/cache; thêm2 regression về server từ chối enable/disable. |

Transport test không gọi mạng thật, không mock logic Auth/Avatar/TOTP. Các test đăng nhập legacy seed tài khoản phía transport ở lần đầu để giữ kịch bản cũ; mật khẩu sai về sau bị từ chối. Đây không phải bằng chứng GoTrue đã lưu mật khẩu hoặc SMS/TOTP chạy thật trên production.

## Kiểm chứng

- Focused nguyên nhóm đỏ:211 assertion pass nhưng1 file transform error do sửa fixture; đã sửa lỗi cú pháp và chạy lại nguyên3 file:43/43 pass.
- Native helper/UI/adapter:18/18, trong đó4/4 edge probes (cancel, no account, mất mạng, expired-session refresh). Các test bổ sung bảo vệ refresh song song/logout/phiên mới/retry.
- App routing/lifecycle:25/25, có test gọi native foreground, gộp focus, visibility và cleanup.
- Security/release focused:39/39.
- Full unfiltered lần đầu:198 file,2842 pass/3 fail,0 skipped;3 failure từ2 assertion copy cũ (native success xuất hiện cả qua wrapper googleOAuthNativeVerification). Đã sửa2 assertion và chạy lại toàn bộ.
- Full unfiltered cuối: **198/198 file,2845/2845 test pass,0 failed,0 skipped/todo,success=true,exit0**. Thời gian 855.23 giây. Artifact full-repo-green-86.json là một lượt đầy đủ, không ghép rerun.4/4 native probes đều pass trong chính lượt này.
- npm run type-check cuối: exit0,0 lỗi.
- npm run build:apk chứa npm run build, cap sync android và Gradle assembleDebug: exit0. APK8.1.5/code86:10279035 bytes (9,80MiB), SHA256f6dadc4676a869a5233a43e71cca0e7a4febaee7dfbf7d65fcc81d545974f4cb.
- Chrome UI390x844/1440x900:0 pageerror,0 tràn ngang; QR role/name đúng trên desktop. Đã xem cả2 ảnh. Đây là guest UI, không đăng nhập tài khoản Founder thật.
- Full sweep còn bắt thêm2 assertion cũ ở m3GoogleAuthAndIdentitySync: thành công native vẫn đòi copy mở browser; sửa assertion sang thông báo thành công, không đổi logic native để theo copy cũ. milestone3EmpiricalChallenger2 vẫn đòi release note cũ “Nền rõ hơn”; cập nhật theo nội dung Auth8.1.5, giữ các oracle manifest/checksum.
- npm run build sau cập nhật metadata APK cuối: exit0. Founder17/17, workspaceTwoDevice12/12, syncQueueConflict7/7, phase4bPresentation9/9, nativeGoogleSignIn18/18, androidSmokeScript11/11 trong full run cuối.
- Deploy production READY: https://pomodoro-workspace-csxdqqrgy-axis-be33.vercel.app, deployment dpl_4Uvxx58EQwUZxEMYRTwrY9pfoNpq, project pomodoro-workspace/axis-be33. Commit source bb3eaa90fbd4cd2990a05ca4b8569814cd0875f6 đã push origin/master. Vercel remote build35 giây.
- Cả pomofocus-workspace.vercel.app và pomofocus-workplace.vercel.app: trang chủ/version.json/APK/entry JavaScript đều HTTP200. Cùng entry /assets/index-Cjl_CPJj.js, SHA25641bd6de664e2d1d8ac82ae7f4819afdc94da1005f18a11d2b89ef47f82cdbd15. APK tải lại từ cả2 domain đúng10279035 bytes và checksumf6dadc4676a869a5233a43e71cca0e7a4febaee7dfbf7d65fcc81d545974f4cb. Artifact production-verification-86.json ghi chi tiết.
- Oracle production lượt đầu chọn nhầm index chunk phụ do plugin mới tạo thêm chunk. Đã sửa script kiểm chứng để lấy script module chính trong HTML và bắt buộc tên đó có trong asset list của chính build Vercel; chạy lại exit0. Không thay product để ép kiểm chứng.
- Vercel framework: Vite;0 drains cấu hình cho project.
- Quét Vercel runtime error/fatal của đúng deployment trong15 phút: không tìm thấy log phù hợp. Đây không phải kiểm thử các API bằng tài khoản thật hoặc chứng nhận mọi lỗi production đều vắng mặt.

## Giới hạn thực tế

Read-only metadata query trên pgsgmmtpunuttspqcgof xác nhận public.profiles có avatar/custom/plan/settings nhưng không có các cột two_factor_enabled, is_2fa_enabled, totp_secret, backup_codes, phone_number, phone_verified. Không thêm secret vào public.profiles để ép test xanh. Service TOTP legacy hiện sẽ báo không lưu được khi backend không hỗ trợ; cần triển khai MFA server phù hợp để nghiệm thu2FA Cloud thật. Unit legacy chỉ chứng minh hành vi dưới transport đã arrange, không chứng minh schema Cloud hiện hành có những cột đó.

ADB lúc build không có thiết bị.4/4 native probes là SDK/network/UI mô phỏng; không phải Samsung/Google picker/logcat thật. Không công bố kiểm chứng hai thiết bị thật hoặc Founder thật từ fixture.

## Tài liệu đối chiếu

- [Supabase sessions](https://supabase.com/docs/guides/auth/sessions).
- [Capacitor App lifecycle](https://next.capacitorjs.com/docs/apis/app).
