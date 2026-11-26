# Hợp đồng sync hai thiết bị, Founder và Android smoke

> Cập nhật 26/11/2026: Nam đã mở khóa auth/API và Codex vá 9 regression bên dưới. Founder hiện 17/17 pass; báo cáo kết thúc ở `AUTH_AVATAR_A11Y_REPORT.md`. Các kết quả đỏ phía dưới giữ làm baseline lịch sử.

## Kết quả tổng

105 test riêng biệt trong 9 file: 96 pass, 9 fail. Chín failure là security/state contract thật ngoài khóa sửa; không skip, xfail hoặc đổi kỳ vọng để báo xanh. Type-check exit 0. Chưa nghiệm thu hai phiên Cloud có JWT thật hoặc Samsung thật.

## Khóa file

Chỉ sửa tests/, scripts/, src/services/syncQueueService.ts và workspaceRealtimeService.ts cùng nhật ký được Nam yêu cầu. Không sửa auth store/API, SQL, index.html, manifest, LandingPage hoặc UI. Giữ thay đổi production-verification.json có trước task; không stage thay đổi Antigravity.

## Đồng bộ

Hai phiên có WebSocket adapter thật, workspace service thật, TaskCloudService/NoteCloudService thật và hai IndexedDB độc lập. HTTP/WebSocket server và state owners là fixture; vì vậy không chứng minh JWT/RLS/publication trên production. Bốn binding tasks/notes/focus_sessions/user_wallets có account filter. Test insert, timestamp cũ/mới, pending local focus session, DELETE owner, callback muộn, logout một phiên và reconnect phiên còn lại. Ví chỉ là tín hiệu refresh; không gán balance từ socket.

Baseline workspace 6 pass/3 fail: focus_sessions chưa subscribe/pull/reconnect; sau sửa 11/11. Baseline queue 0/7; sau sửa 7/7. Queue đọc version, bỏ mutation đã bị phiên bản Cloud thay thế, INSERT khi chưa có, PATCH so sánh id/user_id/updated_at để không ghi đè một thay đổi chen vào giữa read/write; conflict giữ retry. Dừng batch khi tài khoản đổi, giữ mutation khi thiếu bảng Cloud, từ chối table không hỗ trợ và không nhận ghi ví. Không đổi schema hay adapter. Các writer trực tiếp ngoài queue không được chứng nhận atomic bởi các test queue.

## Vitest theo file

| Suite | Pass | Fail |
| --- | ---: | ---: |
| Sync liên quan: dataSyncAndDbFixes.test.ts | 13 | 0 |
| Sync liên quan: dataSyncAuditorStress.test.ts | 15 | 0 |
| Sync liên quan: phase3RealtimeAdapter.test.ts | 6 | 0 |
| Sync liên quan: phase3WorkspaceRealtime.test.ts | 4 | 0 |
| Sync liên quan: syncQueueConflictContract.test.ts | 7 | 0 |
| Sync liên quan: v81DexieAndSyncQueue.test.ts | 22 | 0 |
| Sync liên quan: workspaceTwoDeviceContract.test.ts | 11 | 0 |
| Android script qua ADB giả: androidSmokeScript.test.ts | 10 | 0 |
| Founder/entitlement: founderEntitlementContract.test.ts | 8 | 9 |

## Blocker Founder/Admin chưa sửa

- api/ai/companion.ts verifyAdminOrOwnerToken dùng fallback user_metadata.role: một user đã được Auth endpoint xác nhận vẫn có thể tự sửa metadata này. Test role admin/founder đều được cấp isAdmin sai.
- useAuthStore computeDerivedPlanState và onAuthStateChange nhận role từ user_metadata; badge Founder hoặc credits Infinity cũng có thể làm UI nhận Owner.
- loadUserFromCloud đổi balance 17 thành 50 với free, 23 thành 1000 với lifetime; sai số dư ví authoritative.
- Profile request đang chờ có thể khôi phục user/isAuthenticated sau logout.

Các file này nằm ngoài khóa Codex hiện tại. Test app_metadata admin/founder hợp lệ, lifetime là Pro không phải Admin, Auth HTTP401, và logout thông thường đều pass. Auth HTTP bị mock: không tuyên bố đã xác minh chữ ký JWT hay RLS thật. Các contract fail giữ nguyên:

- never grants server privileges from editable user_metadata.role=admin
- never grants server privileges from editable user_metadata.role=founder
- does not promote a free account from editable metadata in derived state
- does not derive owner access from client-controlled display fields {"credits":null}
- does not derive owner access from client-controlled display fields {"badge":"Founder VIP"}
- does not promote a free account from editable metadata during auth hydration
- preserves a depleted free wallet balance of 17 without a client-side minimum
- preserves a depleted lifetime wallet balance of 23 without a client-side minimum
- a profile request started before logout cannot resurrect the signed-out account

## Coverage tập trung

Hai suite mới, 18 test: statements/lines 70.54%, branches 48.07%, functions 68.42% trên đúng hai service. Workspace lines 95% / branches 63.63%; queue lines 64.80% / branches 36.66%. Không phải coverage toàn repo; các helper retry/manual/listener và nhánh lỗi cũ chưa phủ hết ở lượt tập trung. JSON: coverage-sync/coverage-summary.json.

## Android

Đã kiểm version: ADB 37.0.3 (protocol 1.0.41), Java Temurin 17.0.19, Gradle 8.14.3 từ cache với --offline. Không cài SDK/Java/Gradle/Android CLI. Android CLI không có trên PATH; dùng ADB hiện hữu theo yêu cầu.

Chạy một lệnh từ thư mục repo khi cắm Samsung đã cấp USB debugging:

~~~powershell
pwsh -NoProfile -File .\scripts\android_smoke_check.ps1
~~~

Nhiều thiết bị: thêm -Serial <serial>. Chỉ kiểm prerequisites: thêm -CheckOnly. Script yêu cầu PowerShell 7, kiểm hash/dung lượng APK theo version.json, chọn đúng serial, install -r, kiểm versionName/versionCode thật, cold launch, route callback, lấy logcat theo PID/time bookmark và fail khi process chết hoặc có lỗi khớp crash/WebView/AudioContext. Không xóa dữ liệu app, không logcat -c. Không có PID sau launch thì lưu riêng dòng crash có package. Token/code được che trước khi ghi log. Bằng chứng thiết bị mặc định vào tests/results/android-smoke/ đã gitignore.

CheckOnly thật và PowerShell AST pass. Harness fake ADB ở subprocess: 10/10 pass, gồm không thiết bị, unauthorized, nhiều thiết bị, thành công, crash/WebView/AudioContext/deep link lỗi và startup chết. Đây không phải kiểm chứng Samsung thật. Callback pomofocus://oauth/callback rỗng chỉ kiểm routing, không kiểm đăng nhập Google thành công.

## Tài liệu đã đối chiếu

- Supabase changelog: https://supabase.com/changelog.md
- RLS, ownership và claims: https://supabase.com/docs/guides/database/postgres/row-level-security
- Postgres Changes/publication: https://supabase.com/docs/guides/realtime/postgres-changes

Không có thay đổi DB/Cloud và không sửa các file UI Antigravity đang khóa.
