# Monochrome liquid glass và APK 8.1.2 — 26/11/2026

> Cập nhật kiểm chứng USB thật sau release: cài/startup/callback pass nhưng Pause cảm ứng fail; APK chưa đạt nghiệm thu phần cứng. Xem `ANDROID_USB_ACCEPTANCE_REPORT.md`. Các kết quả Chrome/native giả lập bên dưới giữ đúng lịch sử và không thay thế test Samsung.

## Kết quả

Đã tinh chỉnh Focus và Meet trong phạm vi Nam duyệt; logic Auth/Wallet/Avatar giữ nguyên ac43fbd (git diff bảy file trong protected-logic-verification.json rỗng). Giữ role timer, live region riêng, focus outline và forced-colors; không sửa engine timer/audio/WebRTC hoặc SQL.

- npm run type-check: exit 0, không lỗi.
- Vitest: 94/94 test trong 7 suite. Lượt đầu 92 pass/2 fail do test chấm hiệp buộc màu emerald/animation cũ; cập nhật kiểm chứng trạng thái/nhãn tiếp cận, chạy lại toàn bộ 94/94. Không nới test quyền hay số dư.
- Playwright: 8/8 Focus/Meet trên 1366x768, 1440x900, 390x844 web và Capacitor giả lập. 8 axe JSON đều 0 vi phạm WCAG2.1 AA, 0 tràn ngang/pageerror. Click timer thật không force; Eco bỏ ambient/glow, reduced motion ẩn ambient/tắt blur/glow, CTA tạo phòng guest/Founder nằm trong viewport đầu. Mã phòng vẫn nhập được trong tùy chỉnh.
- Hồi quy A11y ac43fbd: 5/5, gồm Header 320px/forced colors và timer/live region trên desktop/mobile/native giả lập.
- npm run build và npm run build:apk: exit 0. Còn cảnh báo bundle/node:crypto và Gradle flatDir từ cấu hình hiện hữu.

| Suite | Pass |
| --- | --- |
| authEpochContract.test.ts | 5/5 |
| avatarIdentityContract.test.tsx | 12/12 |
| founderEntitlementContract.test.ts | 17/17 |
| m4MobileUiAndFocusLogic.test.tsx | 12/12 |
| milestone4OfflineAndBuild.test.tsx | 16/16 |
| phase4bPresentation.test.tsx | 9/9 |
| v81MeetRoomsAndWhiteboard.test.tsx | 23/23 |

## Thiết kế và skill

Cài thành công đúng lệnh npx skills add dickwu/apple-design-skill -a codex -y và npx skills add devanshuDesai/agent-skills --skill design-audit -a codex -y. SKILL.md nằm trong .agents/skills/apple-design và .agents/skills/design-audit; skills-lock.json ghim source/commit. Project discovery dùng DESIGN_SYSTEM.md và docs/UI_UX_DESIGN_PLAYBOOK_AND_POSTMORTEM.md. Nam đã duyệt sẵn phạm vi sửa, nên không xin duyệt lại theo bước approval chung trong design-audit.

Hướng thiết kế: đồng hồ và CTA trắng là trọng tâm; nội dung dùng lớp fill/rim tĩnh, kính ở điều khiển nổi. Thứ tự bề mặt: #09090b, card trắng 2–4%, card chính 4–6%, pill chọn gradient 14%→7%, CTA trắng chữ zinc-950. Ambient radial 6%; specular inset 0 1px 0 trắng 8%. Phản hồi nhấn 0.96. Giữ font và Lucide hiện hữu để tránh tăng tải WebView. Eco/reduced motion/reduced transparency tắt hiệu ứng tốn chi phí; không dùng SVG feDisplacementMap.

Đối chiếu skill: apple-design references/hig/layout.md (Visual hierarchy, progressive disclosure), materials.md/liquid-glass.md (tiết chế vật liệu, lớp chức năng), buttons.md (ít CTA nổi bật), accessibility.md/motion.md (tùy chọn tiếp cận); design-audit dùng phân cấp, whitespace và giữ nguyên chức năng. Đây là cách chuyển nguyên tắc sang React/Android, không phải giao diện native Apple hay chứng nhận HIG.

Trước: aura chỉ khi chạy, nội dung Meet dài và icon tách hàng, CTA dưới nếp gấp. Sau: ambient tĩnh dịu, vòng hiệp trắng, card có rim, caption một dòng với Beta nhỏ; icon cùng tiêu đề và trường mã phòng nằm trong tùy chỉnh. Ảnh trước tham chiếu artifacts/auth-avatar ở ac43fbd; ảnh sau artifacts/liquid-glass/*.png. Đã xem trực quan Focus desktop1366 và mobile390, Meet mobile/native390.

Đánh giá phạm vi (nhận định thiết kế, không phải điểm chứng nhận): hierarchy/spacing/type/color/alignment/components/icons/dark mode/density/responsiveness đạt trên Focus và Meet; motion/Eco và A11y tự động đạt. Empty/loading/error giữ nguyên, kiểm hồi quy unit; screen reader và thiết bị thật chưa đánh giá. Không mở rộng sang màn hình khác.

## APK

assembleDebug 8.1.2/code83, com.pomofocus.workspace. AAPT đọc đúng version; apksigner verify exit0. APK 8,836,362 bytes = 8.43 MB; SHA256 67e6cc1448c353d530646b13bfe00ab7d6e70315ea73b47d39b16e59c9ca2d0a. public/version.json và src/config/apkRelease.json khớp file thật; WebDownloadHub đọc config chung.

26 file JS/CSS trong APK khớp từng hash với assets đã sync từ build hiện tại; có mã Auth/Wallet/Avatar và CSS Eco/reduced motion. Không server.url tải UI từ Web; không chứa APK trong assets. Android smoke -CheckOnly pass; không có thiết bị ADB, chưa install/logcat hay kiểm hiệu năng Samsung. Không tuyên bố đã chạy TalkBack/NVDA hoặc hai JWT Cloud thật.

## Production

Source/APK commit 5b6e830 đã push origin/master. Vercel production READY: dpl_FLJjGTtk8v7VoNZ6wfNVZMZ5TAqe, https://pomodoro-workspace-2uevc1q6e-axis-be33.vercel.app. Workplace auto alias, workspace đã trỏ bổ sung bằng CLI scope axis-be33.

Xác minh 18:31:08 26/11/26 (Asia/Ho_Chi_Minh): cả https://pomofocus-workspace.vercel.app và https://pomofocus-workplace.vercel.app trả HTTP200 cho trang chủ, version.json, APK và bundle /assets/index-BoJrQORW.js. Hash bundle hai alias cùng 8fefdcc17e5be6e74aca6e445d2d9ae03bddccf394b2566fa2b7a580f7738983; APK 8.1.2/code83 đúng 8,836,362 bytes và hash đã ghi ở trên. Bằng chứng artifacts/phase4b/production-verification.json, vercel-deploy.log và artifacts/liquid-glass/vercel-alias.log.

Bổ sung kiểm chứng focus bàn phím trong Eco: ca mobile riêng pass, không cần sửa CSS hay build lại APK. Đã thêm assertion này vào suite để giữ A11y khi tắt glow.
