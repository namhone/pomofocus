# Auth, wallet, Avatar và A11y — 26/11/2026

Quyền sửa: Codex tiếp quản auth/wallet/A11y được Nam mở khóa, bổ sung đúng luồng Avatar và sync profile. Giữ APK/engine timer/audio/WebRTC; gom index.html/LandingPage.tsx của Antigravity sau build xanh.

## Thay đổi đã kiểm chứng

- API xác minh token qua Supabase Auth trước khi đọc app_metadata.role; store chỉ suy quyền Admin/Owner từ claim này, không user_metadata/badge/số dư. Lifetime vẫn là Pro, không tự thành Owner.
- Hydration giữ số dư thật 0/17/23; không gọi writer nâng gói/tăng số dư. Header bỏ effect nâng số dư lifetime. Epoch/requestId và session revision chặn phản hồi cũ sau logout, cả khi đăng nhập lại cùng tài khoản.
- Avatar hình học/upload/URL custom giữ ưu tiên. Reset rõ ràng từ server xóa custom cũ; fallback Google thật trước SVG chữ cái theo tên/email thật. Bỏ cache avatar localStorage riêng. Không đổi ảnh khi chỉ lưu tên hồ sơ.
- Writer profiles gửi đủ avatar_url/custom_avatar_url/has_custom_avatar, cập nhật cache sau thành công và trả lỗi thật. Store/UI không ghi nhầm tài khoản khi request cũ hoàn tất. Realtime thêm profiles theo id, Meet presence/broadcast mang avatar và cập nhật khi ảnh đổi.
- Header 320px có khoảng hở brand/credits >=8px và nút đăng nhập nằm trọn viewport. Timer role=timer, aria-live=off cho số giây; live region polite riêng thông báo hiệp/trạng thái. Forced-colors có outline 2px Highlight.

## Kết quả thực tế

npm run type-check: exit 0, không lỗi. npm run build: exit 0; còn cảnh báo node:crypto bị externalize và bundle lớn có từ cấu hình hiện hữu.

117 test riêng biệt/12 suite pass. Lượt tổng ban đầu 116/116; thêm 1 regression session revision, chạy lại Avatar 12/12. JSON thô: auth-avatar-final.json và avatar-final.json.

| Suite | Pass |
| --- | --- |
| audioRemediationPhase3.test.ts | 27/27 |
| authEpochContract.test.ts | 5/5 |
| avatarIdentityContract.test.tsx | 12/12 |
| founderEntitlementContract.test.ts | 17/17 |
| mediaAndAudioLifecycle.test.ts | 7/7 |
| phase3RealtimeAdapter.test.ts | 6/6 |
| phase3WorkspaceRealtime.test.ts | 4/4 |
| phase4aProfileIme.test.tsx | 2/2 |
| phase4bPresentation.test.tsx | 9/9 |
| syncQueueConflictContract.test.ts | 7/7 |
| userAvatarUnified.test.tsx | 9/9 |
| workspaceTwoDeviceContract.test.ts | 12/12 |

Chrome 5/5 pass trên build production local: 320x640 (tương đương viewport 400%), 1366x768, 1440x900, 390x844, 390x844 Capacitor giả lập. Zoom scale=1; không tràn ngang/pageerror; Start/Pause click thật không force. Timer/live region đổi đúng khi chuyển hiệp và tạm dừng. Axe WCAG2.1 AA 320px màu thường: 0 vi phạm. Forced-colors: kiểm tra focus bàn phím, outline 2px và ảnh chụp; không dùng axe color-contrast trong mode này vì nó đọc màu CSS tác giả thay màu CanvasText do UA thay thế. Bằng chứng artifacts/auth-avatar/.

## Giới hạn bằng chứng

Các test contract chạy logic store/service/adapter thật với HTTP/WebSocket/state collaborator giả lập; năm instance UserAvatar kiểm chứng subscription chung, không phải năm màn hình đã đăng nhập thật. Chưa nghiệm thu hai JWT/tài khoản Cloud thật, profile publication trên server, upload ảnh qua Storage thật hoặc Samsung/NVDA/TalkBack thật. Không sửa SQL/publication. Phiên bản APK giữ 8.1.1/code82, 8.46 MB; binary chưa chứa các sửa web mới trong đợt này. scripts/android_smoke_check.ps1 được giữ nguyên.

## Production

Source commit `873f796` đã push `origin/master` (kèm commit contract `7bab27e`). `vercel --prod --yes --scope axis-be33` exit 0, deployment `dpl_6dshd2xbecnX2VFQSXoS1HV8V3EW` READY: https://pomodoro-workspace-ggp7p3bad-axis-be33.vercel.app. Lần deploy đầu không có scope trả Not authorized; whoami/project/team đọc được, retry với scope AXIS thành công, không cần đổi tài khoản.

Vercel tự cập nhật workplace; alias workspace đã được trỏ thủ công về cùng deployment. Xác minh 2026-11-26 07:55:08 UTC (14:55 giờ Việt Nam): cả https://pomofocus-workspace.vercel.app và https://pomofocus-workplace.vercel.app trả HTTP 200 cho trang chủ, bundle mới `/assets/index-CsbtoCez.js`, version.json và APK. Hai bundle có SHA-256 giống nhau `ba8ea2b76a91b0b1cdc0d980770b202c808a0f10b9565866a43ae27900eced98`. APK vẫn 8,869,402 bytes/8.46 MB, SHA-256 `327cb7f1b20754c24d7924952cd9fcf434938798491d77389a6c5d43645a03d2`, metadata khớp. Bằng chứng: `artifacts/phase4b/production-verification.json`, `vercel-deploy.log`, `artifacts/auth-avatar/vercel-alias.log`.
