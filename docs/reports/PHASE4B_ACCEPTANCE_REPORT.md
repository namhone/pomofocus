# Phase 4B — Nghiệm thu thực tế (26/11/2026)

## Thay đổi

Scrim tối bảo vệ chữ trên ảnh sáng; Notes gộp một toolbar, thư viện nền auto-fill; Timer gọn khi AI mở, Notes tự dạt mà không ghi đè bố cục lưu. Header ghim và AI không chồng nhau. Meet chia hàng trên mobile. Icon Lucide 1.5, zinc/trắng, Sentence case, footer AI giữ safe area. Tay nắm resize nằm trong vùng bo tròn để chuột kéo thật bắt trúng.

Sửa lỗi thứ tự Hook phát hiện trong checkout authenticated; VA VPBank, số tiền, memo và Realtime giữ nguyên. Không sửa vòng đời audio/WebRTC Phase 3 hoặc safeguard lưu trữ/IME/Eco Phase 4A.

## Type-check

Lượt cuối trước phát hành: npm run type-check exit 0. Web build cũng chạy tsc thành công. Log: artifacts/phase4b/type-check-final.log.

## Vitest theo từng file

27 file, 347 test pass sau các lượt chạy lại có ghi nhận. Lượt nhóm chính có 313 assertion pass nhưng một file không nạp do mock child_process thiếu default export; đã sửa mock, chạy riêng file build 16/16. Các assertion copy/emoji cũ được cập nhật theo UI mới, giữ kiểm tra quyền Founder và hành vi. Không gọi lượt nhóm chính mã lỗi là pass.

| File | Test pass | Trạng thái cuối |
| --- | ---: | --- |
| audioRemediationPhase3.test.ts | 27/27 | passed |
| challenger2Milestone3Stress.test.tsx | 17/17 | passed |
| challengerPolishM3Stress.test.tsx | 21/21 | passed |
| guestHeaderAndGoogleGuidance.test.tsx | 5/5 | passed |
| m1ChallengerDeepLinkAnd404Attack.test.tsx | 18/18 | passed |
| m3EmpiricalStressAiSettingsAuth.test.tsx | 13/13 | passed |
| m4EmpiricalDownloadAndRoutes.test.tsx | 13/13 | passed |
| milestone3NotificationsAndAudio.test.tsx | 19/19 | passed |
| milestone4OfflineAndBuild.test.tsx | 16/16 | passed |
| mobileBottomNavAndHeaderFlow.test.ts | 12/12 | passed |
| mobileViewsStressV70.test.tsx | 23/23 | passed |
| multiChannelAudioEngine.test.ts | 12/12 | passed |
| paymentRemediationPhase1.test.ts | 10/10 | passed |
| phase3HardwareCleanup.test.tsx | 3/3 | passed |
| phase3RealtimeAdapter.test.ts | 6/6 | passed |
| phase3SubmissionGuards.test.tsx | 2/2 | passed |
| phase3WorkspaceRealtime.test.ts | 4/4 | passed |
| phase4aLogicAndCatalog.test.tsx | 10/10 | passed |
| phase4aProfileIme.test.tsx | 2/2 | passed |
| phase4bPresentation.test.tsx | 9/9 | passed |
| tasksAndNotes.test.ts | 13/13 | passed |
| timerEngine.test.ts | 14/14 | passed |
| v75DownloadShowcase.test.tsx | 16/16 | passed |
| v81MeetRoomsAndWhiteboard.test.tsx | 23/23 | passed |
| v81Milestone2IdentityAndHeaderPolish.test.tsx | 15/15 | passed |
| v81Milestone3SpacesAndCopyPolish.test.tsx | 16/16 | passed |
| webrtcFullMesh.test.ts | 8/8 | passed |

Coverage tập trung ba file NotesWidget/UiSymbol/widgetPresentation: lines/statements 95.89%, branches 81.25%, functions 68.75%; không phải coverage toàn repo.

## Playwright và WCAG

Kết quả cuối theo từng ca: 10 pass, 6 skip đúng phạm vi desktop/mobile, 0 ca còn lỗi; 12 báo cáo axe đều 0 vi phạm, 0 pageerror và 0 tràn ngang ở các trạng thái kiểm thử. Lượt ma trận chính đạt 9 pass/6 skip/1 fail do fixture native bị Capacitor SDK nhận lại thành web. Sau thêm androidBridge theo SDK, chạy riêng native đạt 2 pass/2 skip. Kết quả từng ca lấy lượt cuối, không che lỗi fixture trước đó.

Đã kiểm chứng bản production bằng Vite preview: 1366×768, 1440×900, mobile 390×844 và Capacitor giả lập 390×844. Scale 1; click thật không force. Các request tài khoản/thanh toán và peer được giả lập, không ghi dữ liệu thật. Kiểm tra Notes CRUD/preview, AI rỗng/keyboard focus, Header ghim, resize gallery, Meet timer/whiteboard, safe inset native 36px, tràn ngang và pageerror.

WCAG tự động: axe WCAG 2 A/AA và 2.1 AA; các trạng thái có ảnh nền trắng được quét. Unit test kiểm tra chữ zinc-400 với scrim trước nền trắng đạt ≥4.5:1 ở mọi mức opacity người dùng. Focus bàn phím có viền trắng. JSON axe và ảnh thực tế trong artifacts/phase4b.

| Nguyên tắc / tiêu chí | Phát hiện và xử lý | Bằng chứng |
| --- | --- | --- |
| Perceivable — 1.4.3 Contrast (AA) | Scrim tối trên ảnh, chữ phụ zinc-400, bỏ màu pastel | Unit kiểm nền trắng; axe các trạng thái ảnh sáng |
| Operable — 2.1.1 Keyboard (A), 2.4.7 Focus visible (AA) | Vùng cuộn Tasks focusable, viền focus trắng; Tab từ ô chat sang nút Gửi | Click/Tab thật trong Chrome, axe |
| Understandable — 3.3.2 Labels (A) | Đặt tên ô task/chat và bộ chọn hình nền | Locator theo tên và axe |
| Robust — 4.1.2 Name, role, value (A) | Thanh tiến độ có tên; chấm Hiệp là ảnh có nhãn, nhóm có role | Quét bright-focus mobile/native sau sửa |
| Reflow — 1.4.10 (AA), phạm vi viewport được giao | Không tràn ngang 390px; Meet chia hàng, AI có safe inset; vùng cuộn nội bộ được phân biệt với tràn trang | Chrome bốn cấu hình; chưa kiểm ở zoom 400% |

Giới hạn: chưa thử NVDA/TalkBack; chưa đăng nhập Founder thật hoặc hai thiết bị thật. Founder kiểm bằng fixture email/role và unit test, không phải phiên đăng nhập thật. Không tuyên bố chứng nhận toàn bộ WCAG hay nghiệm thu Cloud đa thiết bị.

## APK

npm run build:apk exit 0; Gradle assembleDebug BUILD SUCCESSFUL. APK 8.1.1/code 82: 8.46 MB (8,869,402 bytes), SHA-256 327cb7f1b20754c24d7924952cd9fcf434938798491d77389a6c5d43645a03d2. public/version.json và src/config/apkRelease.json khớp binary; WebDownloadHub dùng metadata sinh thật. Build web sau APK đồng bộ nhãn tải xuống. Capacitor bundle local, không server.url; dist/downloads được loại trước cap sync để tránh APK lồng APK. ADB devices -l không nhận thiết bị ở bước phát hành nên chưa cài -r. Unit test mock ADB hoàn toàn.

## Production

Source commit 69ab163 đã push origin/master. Vercel deployment dpl_GwcXRdcc5jehxSNdyiihtznG7S5i READY: https://pomodoro-workspace-7592c9e93-axis-be33.vercel.app. Cả pomofocus-workspace.vercel.app và pomofocus-workplace.vercel.app đã xác minh lúc 07:26 ngày 26/11/2026 (Asia/Saigon): trang chủ, version.json, APK và bundle entry đều HTTP 200; version 8.1.1/code 82, APK 8,869,402 bytes và SHA-256 khớp local. Cả hai trả cùng bundle /assets/index-CsnU8e7U.js, đối chiếu đúng entry của log build Vercel.

Alias workspace ban đầu vẫn trỏ deployment cũ 8.1.0 dù HTTP 200; đã gán sang deployment mới và kiểm lại toàn bộ. Bằng chứng trước/sau trong production-before-alias.json và production-verification.json. Bundle local và cloud có tên hash khác nhau, vì vậy kiểm tra production dựa trên output build Vercel thay vì ép tên file local.
