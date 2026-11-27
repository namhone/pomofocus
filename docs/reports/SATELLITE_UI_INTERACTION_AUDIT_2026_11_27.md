# Kiểm chứng trang vệ tinh và workspace — 27/11/2026

🤖 Báo cáo do AI tạo từ source và kiểm thử tự động; phần pháp lý là rà soát ban đầu, không phải tư vấn pháp lý chính thức.

## Phạm vi và môi trường

- Chrome qua Playwright, Vite127.0.0.1:4176; viewport360/390x844 và1440x900. Không force click, không waitForTimeout. Đã xem trực quan ảnh Terms360, Contact1440, Meet390 và validation360.
- Cloud/API/WebSocket và media bên ngoài được cô lập bằng fixture. Không tạo tài khoản, phòng, đơn hàng hoặc gửi email thật. IndexedDB, Clipboard, UI, router và store là code thật.
- Workspace được sắp xếp một widget mở mỗi ca để tránh chồng lấn. Không sửa source App/Timer/Audio/Calendar/Spaces/Media hay UI Antigravity. Native là bridge giả lập, không phải Samsung thật.
- Không mở rộng task sang build APK, commit, push hay deploy. Nhiều file đã có thay đổi của bên kia từ đầu lượt; không xóa, hoàn tác hoặc nhận chúng là thay đổi của Codex.

## File Codex sửa trong lượt này

1. src/components/ContactView.tsx: CTA Cool-Slate, H1, vùng chạm email/copy, tên Nguyễn Văn A, label kết nối với input; thay thông báo đã nhận giả bằng luồng soạn mailto và hướng dẫn gửi trong ứng dụng email.
2. src/pages/NotFoundPage.tsx: secondary glass cho nút Home; các nút44px/CTA Cool-Slate/H1 đã đúng từ thay đổi song song và được giữ.
3. src/components/StudyRoomLobby.tsx: H1, VD:, nút phụ Cool-Slate và nút pod secondary glass. CTA chính/create/join đã Cool-Slate/44px từ thay đổi song song.
4. src/components/DashboardView.tsx: Sentence case các bộ lọc, Pomodoro. CTA/H1 đã đúng được giữ.
5. src/components/SettingsView.tsx: nút Vào không gian Cool-Slate/44px và Pomodoro. Giữ nguyên cơ chế lưu cấu hình.
6. src/components/HelpView.tsx: touch target scoped44px, H1, Pomodoro/FAQ/Global Shortcuts/Xuất tệp JSON; bỏ lời hứa PRO Beta3 năm, dẫn giá hiện hành tại/billing.
7. src/components/LegalViews.tsx: tên riêng, số hiệu văn bản, applicationId, v8.1.5; mô tả dữ liệu AI/Cloud, quyền Android và thời hạn yêu cầu xóa; bỏ cam kết chuông chính xác tuyệt đối và mô tả xóa Cloud bằng1 click.
8. src/components/PrivacyDataView.tsx: Data Portability và Xuất tệp JSON.
9. tests/unit/m4LegalAndCookieConsent.test.tsx: cập nhật số hiệu có chữ số, cho phép nhiều trích dẫn cùng văn bản hợp lệ; giữ kiểm tra từng luật/nghị định.
10. tests/e2e/satelliteInteractionAudit.cjs: bộ kiểm chứng tương tác độc lập, có thể chọn ca bằng POMO_AUDIT_CASES và thư mục kết quả bằng POMO_AUDIT_OUTPUT.
11. .agents/AGENT_COMMS.md và báo cáo này.

Các chỉnh sửa6 file từ lượt trước vẫn giữ; không gán chúng cho lượt hiện tại. Không sửa AuthView dù/signup dùng chung file đó. SharedFooter tiếp tục để Antigravity xử lý theo khóa trước.

## Kết quả tương tác

Lượt đầu có lỗi locator (trùng nút footer, nút khóa chỉ hiện trong edit mode, widget âm thanh tên sounds) và1 timeout điều hướng Vite. Đã đối chiếu source, sửa fixture/locator và chạy lại từng ca; bảng dùng kết quả mới nhất mỗi ca, không bỏ ca fail thật.

| Test case | Kết quả | Bằng chứng hành vi |
| --- | --- | --- |
| rooms-guest-create | PASS | Chưa đăng nhập: tạo phòng chuyển /login |
| rooms-code-invalid | PASS | Mã không tồn tại: điều hướng tới room và hiện thông báo lỗi |
| rooms-code-valid | PASS | pod-free-01: tới bước tham gia phòng chung; chưa nghiệm thu cuộc gọi thật |
| settings-persistence | PASS | Đổi tập trung32 phút/nghỉ7 phút, chuông pha lê và volume; tải lại vẫn giữ cấu hình |
| dashboard-filters | PASS | Click lần lượt 7 ngày qua/Tuần này/Tháng này; biểu đồ hiện |
| privacy-refresh-export-cancel | PASS | Làm mới; tải JSON parse được; mở hộp xóa, nút thực thi bị khóa khi chưa nhập xác nhận; hủy đóng hộp |
| help-all-faq | PASS | Mở/đóng cả5 FAQ; aria-expanded đúng |
| contact-valid-submit | PASS | Submit hợp lệ mở luồng soạn email, hiện hướng dẫn hoàn tất gửi; không báo đã nhận thư |
| contact-copy-email | PASS | Sao chép đúng support@pomofocus.vn vào Clipboard thật của Chrome |
| workspace-timer | PASS | Tập trung/nghỉ ngắn/nghỉ dài; Start/Pause/Skip/Reset đúng trạng thái store |
| workspace-mini-pill-lock | PASS | Bật chế độ sửa bố cục để khóa/mở khóa vị trí; mini-pill Play/Pause/Expand |
| workspace-audio | PASS | Bật track ambient, chỉnh volume bằng bàn phím; chưa kiểm chứng âm thanh nghe được |
| workspace-media | PASS | Mở/đóng bộ chọn trạm, bấm Play và Next; media bên ngoài bị chặn nên chưa nghiệm thu phát nội dung |
| workspace-calendar | PASS | Mở Calendar, thêm lịch kiểm thử và Lưu; nội dung xuất hiện |
| workspace-spaces | PASS | Đổi tab âm thanh/hình nền, tìm Anime, mở tinh chỉnh nền |
| workspace-capsule-credits | PASS | Credits mở modal nạp điểm |
| workspace-capsule-settings | PASS | Settings mở widget cài đặt |
| workspace-capsule-home | PASS | Home về trang chủ |
| workspace-capsule-avatar | PASS | Avatar guest mở menu tài khoản |
| satellite-layout-360 | PASS | 7 trang contact/help/terms/privacy/about/privacy-data/404:0 tràn ngang, có H1 |
| satellite-layout-390 | PASS | 7 trang trên:0 tràn ngang, có H1 |
| satellite-layout-1440 | PASS | 7 trang trên:0 tràn ngang, có H1 |
| workspace-credits-guest-login | FAIL | LỖI THẬT: nút Đăng nhập trong modal Credits không rời /app; selector mobile-header-avatar-btn không có trên Desktop |
| workspace-native-discipline-pocket | PASS | Native bridge giả lập390px: bật/tắt Kỷ luật, khóa túi và giữ1.7s để mở khóa |
| workspace-audio-drag | PASS | Kéo slider ambient bằng chuột thật, giá trị đổi về khoảng30% |
| contact-validation-targets | PASS | 360px: email/copy/submit đều>=44x44; invalid submit focus vào Họ tên, scroll-margin84px và ô không nằm dưới header |
| six-pages-mobile-style | PASS | 390px:6 trang contact/404/rooms/dashboard/settings/help H1 rgb236,239,244 và0 tràn ngang; learning pages dùng ?desktop=1 |

Tổng: **26 PASS / 1 FAIL**,0 pageerror trong tất cả27 ca. FAIL duy nhất là đường đăng nhập guest từ modal Credits Desktop, nằm ngoài khóa source. Việc click vào modal thành công không được coi là login thành công.

npm run type-check: **exit0,0 lỗi** trên source đã ngừng sửa; git diff --check exit0.

Vitest liên quan: **51/51 PASS,5 file**: pháp lý/cookie12; Dashboard/Calendar5; stress AI/Settings/Auth13; sửa/xóa phòng10; governance/host11. Hai lỗi ban đầu là getByText đụng nhiều trích dẫn đúng; đổi sang getAllByText kiểm tra có ít nhất1 kết quả, không đổi product để ép xanh. Không phải full-repo sweep và không đo coverage lượt này.

Artifact thô local ignored: tests/results/android-smoke/satellite-final-results.json, satellite-unit-final.json; ảnh và từng log thất bại tại satellite/, satellite-rerun/, satellite-supplement/. Gói script vẫn exit1 khi chạy toàn bộ vì lỗi guest Credits chưa sửa.

## Rà soát nội dung pháp lý có giới hạn

Phân loại theo source: SaaS có tài khoản, AI, bán gói và APK; rà soát nội dung trang theo checklist dữ liệu/tiêu dùng/mobile/AI, không chứng nhận đủ toàn bộ nghĩa vụ của SaaS. Skill dự án thiếu scripts/scan.sh, sources/legal-references.md, examples và DISCLAIMER; thư mục skill user không có bản thay thế. Đã dùng rg và nguồn Chính phủ thay quét tự động, không xác minh được ngày cập nhật checklist.

| Mức | Phát hiện và xử lý |
| --- | --- |
| 🟢 | Sửa tên văn bản theo nguồn gốc: [Luật Thương mại điện tử số122/2025/QH15](https://chinhphu.vn/?classid=1&docid=216503&pageid=27160&typegroupid=3), ban hành10/12/2025, hiệu lực01/07/2026; [Nghị định248/2026/NĐ-CP](https://vanban.chinhphu.vn/?docid=218747&pageid=27160). Không tuyên bố đã hoàn tất thủ tục TMĐT. |
| 🟢 | [Luật Bảo vệ dữ liệu cá nhân91/2025/QH15](https://chinhphu.vn/?docid=214590&pageid=27160), ban hành26/06/2025, hiệu lực01/01/2026: Điều4 về quyền chủ thể, Điều10 về rút đồng ý/hạn chế xử lý. Chính sách đã nói riêng xóa trên thiết bị với tài khoản/Cloud. |
| 🟢 | [Nghị định356/2025/NĐ-CP](https://vanban.chinhphu.vn/?docid=216387&pageid=27160), ban hành31/12/2025, hiệu lực01/01/2026: khoản4 Điều5 quy định phản hồi2 ngày làm việc, thực hiện xóa20 ngày hoặc30 ngày khi phối hợp bên khác; gia hạn một lần tối đa20 ngày có thông báo lý do. Đã sửa câu hứa tối đa20 ngày cho mọi trường hợp. |
| 🟢 | applicationId từ build.gradle là com.pomofocus.workspace, versionName/public/version đều8.1.5. Quyền theo AndroidManifest: camera/mic, notification/exact alarm, wake lock/vibrate, internet/audio settings; không hứa giờ báo tuyệt đối dưới mọi chế độ pin. |
| 🟢 | FAQ không còn hứa PRO miễn phí3 năm. Terms giữ chính sách yêu cầu hoàn tiền7 ngày khi không nhận dịch vụ do lỗi kỹ thuật; đây là chính sách dịch vụ có sẵn, không mô tả là quyền hoàn tiền vô điều kiện do luật. Hỗ trợ chuyển khoản QR theo phương thức thực hiển thị; không hứa thêm ví ngoài checkout hiện tại. |
| 🟡 | Cần Nam xác nhận vận hành hoàn tiền7 ngày, công bố giá/thuế, thời hạn lưu theo từng nhóm dữ liệu và nhà cung cấp AI/region thực tế. Chưa có bằng chứng hợp đồng, quy trình xử lý yêu cầu hoặc hồ sơ chuyển dữ liệu. Đối chiếu Điều3,9,20 Luật91/2025; không kết luận tuân thủ khi chỉ sửa câu chữ. |
| 🟡 | Form Contact trước đây chỉ setSubmitted=true mà hứa đã nhận. Đã chuyển thành mailto minh bạch; không có backend tiếp nhận ticket. Cần hệ thống gửi thư thật nếu muốn xác nhận đã nhận yêu cầu. |

## Bàn giao ngoài khóa file

- AiCreditsTopupModal.tsx~583: đăng nhập guest trên Desktop không hoạt động vì query mobile-header-avatar-btn. Sửa ở lớp modal/auth intent bởi Antigravity; ca workspace-credits-guest-login giữ FAIL để tái hiện.
- AuthView.tsx~565: placeholder Ví dụ: hoàng nam cần Hoàng Nam. File Login/Signup đang khóa, Codex chỉ đọc.
- SharedFooter.tsx: Hồ ngọc bảo nam tại139/233 và pomodoro tại128; nút sao chép email footer28px vẫn nhỏ. Không dùng phép đo nút44px Contact để tuyên bố toàn footer đạt44px.
- LandingPage đã ghi Không gian tinh tuyển; không sửa. Quét các trang không thấy helper/CSS lowercase/capitalize đổi chữ toàn trang; toLowerCase của email trong Lobby phục vụ so sánh, giữ nguyên.

## Giới hạn & khuyến nghị

Chưa nghiệm thu cuộc gọi WebRTC thật, Supabase đa thiết bị, delivery email, nội dung YouTube/audio nghe được, Samsung, NVDA/TalkBack hay quy trình hoàn tiền. Không kết luận website vi phạm/không vi phạm hoặc đạt đầy đủ pháp luật. Cần kiểm tra lại văn bản còn hiệu lực trên vbpl.vn/Thư Viện Pháp Luật và tham vấn luật sư trước quyết định pháp lý cuối cùng, nhất là chính sách thu thập/xóa dữ liệu và bán dịch vụ.


---

## Bổ sung đào sâu bốn mảng — 27/11/2026

### Kết luận và giới hạn route

**Type-check cuối exit0/0 lỗi; Vitest54/54 PASS trong6 file; Playwright sâu19/19 PASS,0 pageerror và0 React/key warning.** Đây là phần kiểm chứng bổ sung, không xóa kết quả lịch sử26/27 hoặc lỗi guest Credits ở trên.

Ở360×800 không query bypass, cả4 URL /calendar,/dashboard,/rooms,/settings đều trả MobileWebPortal theo App.tsx và platformRoutes.ts. Codex giữ nguyên guard và không sửa workspace. Vì vậy, yêu cầu nhìn thấy nội dung4 trang trên Mobile Web chưa thể nghiệm thu dưới chính kiến trúc hiện hành; không dùng kết quả Portal để tuyên bố biểu đồ/input/phòng bên trong đã chạy. Nội dung được kiểm riêng ở Native bridge giả lập360×800 và Desktop1440×900. Riêng Native/settings là MobileSettingsView; SettingsView được quét thêm trên Desktop.

### Các lỗi đã sửa và file của lượt bổ sung

- src/components/DedicatedCalendarView.tsx: thêm sửa lịch cùng ID, giữ trạng thái hoàn thành; guard tên trắng/ngày thật/giờ nguyên6..23; lỗi ghi DB có thông báo và giữ modal; controls wrap, day grid có min-w-0; card tuần có nút44px không còn tràn trong cột và thời gian xuống dòng. Modal có tên/role, nhãn input, nút đóng/điều hướng có aria-label.
- src/components/ProfileView.tsx: tên trắng có phản hồi thay vì im lặng; thông báo aria-live, nhãn input, phạm vi CSS riêng.
- src/components/AccountSecurityView.tsx: nhãn trường cho cả password và Google-secondary, nút icon có tên; dialog có tên/role và quản lý focus; CTA Cool-Slate; chuẩn hóa2FA/TOTP/Authenticator/Sentence case, bỏ lời khẳng định chuẩn GDPR chưa có bằng chứng. Không thay điều kiện phân quyền hay thuật toán Auth/2FA.
- src/components/PrivacyDataView.tsx: dialog có role/tên, label xác nhận, Escape/focus trap/restore opener, nút đóng có tên.
- src/components/DashboardView.tsx: H3 của biểu đồ đổi thành H2 để không nhảy cấp.
- src/components/SettingsView.tsx: bổ sung tên cho4 input thời lượng, volume, toggle tự chuyển hiệp; aria-pressed toggle.
- ContactView/HelpView/LegalViews/StudyRoomLobby: scope CSS nội dung; Contact headings H3->H2; nhãn icon theo mục đích thực tế. Không đổi header/footer chung.
- Mới src/hooks/useSatelliteDialog.ts: giữ focus, xử lý ESC và trả focus cho dialog vệ tinh. Mới src/styles/satellitePages.css: chỉ .satellite-content, tăng vùng chạm44px, placeholder/border đọc được, H1 #ECEFF4; không áp vào header/footer/workspace.
- Mới tests/unit/satelliteCalendarCrud.test.tsx:6 ca tên trắng, giờ5/25, ngày rỗng, CRUD giữ ID/completed sau remount và lỗi DB. Mở rộng tests/e2e/satelliteInteractionAudit.cjs với fixture transport, keyboard, Axe, warning và link audit. Các file bị khóa trong prompt không bị Codex sửa.

### Từng test case bổ sung

| Case | Kết quả | Nội dung được chứng minh |
| --- | --- | --- |
| deep-mobile-web-calendar | PASS | 360×800, /calendar không query: Portal,0 overflow; không phải nghiệm thu Calendar trong Mobile Web. |
| deep-native-layout-calendar | PASS | Native bridge360×800: nội dung Calendar có H1,0 tràn ngang. |
| deep-mobile-web-dashboard | PASS | 360×800, /dashboard không query: Portal,0 overflow. |
| deep-native-layout-dashboard | PASS | Native bridge360×800: biểu đồ/bộ lọc và KPI không tràn ngang; đã xem ảnh. |
| deep-mobile-web-rooms | PASS | 360×800, /rooms không query: Portal,0 overflow. |
| deep-native-layout-rooms | PASS | Native bridge360×800: cả10 phòng công khai hiện tại render, không tràn ngang. Catalog thực tế là10 chứ không phải8. |
| deep-mobile-web-settings | PASS | 360×800, /settings không query: Portal,0 overflow. |
| deep-native-layout-settings | PASS | Native bridge360×800: MobileSettingsView không tràn ngang; không nhận kết quả này là SettingsView Desktop. |
| deep-calendar-crud | PASS | Ngày/Tuần/Kỳ sau/Hôm nay; submit rỗng/whitespace và giờ25 bị từ chối; tạo/sửa/tải lại/xóa/tải lại đúng. |
| deep-profile-member-validation | PASS | Fixture có đăng nhập: tên trắng bị chặn có thông báo; đổi Hoàng Nam Kiểm Thử, PATCH transport và reload giữ tên. |
| deep-security-password | PASS | Fixture provider=password: mật khẩu3 ký tự bị chặn, mật khẩu xác nhận khác bị chặn. Không đổi mật khẩu người thật. |
| deep-security-totp | PASS | Bật bằng mã6 số tính từ secret mới bằng thuật toán TOTP thật, cập nhật profile qua transport fixture; tắt2FA cập nhật UI. Không thay hàm enable/disable bằng mock. |
| deep-privacy-keyboard | PASS | Enter mở modal; Shift+Tab/Tab giữ focus trong modal; ESC đóng và trả focus về nút mở. |
| deep-a11y-public | PASS | Axe11 trang công khai ở Native bridge360×800:0 vi phạm sau sửa Dashboard heading;0 nút nhỏ trong scope nội dung. |
| deep-a11y-member | PASS | Axe4 trạng thái profile/page+edit và security/page+TOTP:0 vi phạm,0 nút dưới44px trong scope. |
| deep-links-and-keyboard | PASS | FAQ dùng Enter/Tab/Shift+Tab;8 route literal/nội bộ lấy từ10 trang và anchor đã render đều resolve, không tới NotFound. |
| deep-member-keyboard-style-contrast | PASS | Profile edit: Tab/Shift+Tab đúng tên->username->tên, focus2px; đo placeholder/border và CTA đúng Cool-Slate. |
| deep-calendar-week-card | PASS | Lịch tuần có tiêu đề dài: cả3 nút nằm trọn card, rộng68px/cao>=44px; toàn trang0 tràn ngang. Khung giờ được xuống dòng thay cắt. |
| deep-a11y-desktop | PASS | Axe11 trang công khai1440×900, gồm SettingsView Desktop:0 vi phạm sau sửa6 lỗi nhãn settings. |

Vitest lượt cuối: dashboardTrendChartAndCalendarTooltip.test.ts:5; m4LegalAndCookieConsent.test.tsx:12; roomCustomizationAndDelete.test.ts:10; roomGovernanceAndHostControls.test.ts:11; saasProfileAndSecurity.test.ts:10; satelliteCalendarCrud.test.tsx:6. Không chạy full-repo/coverage trong lượt này.

### A11y, tương phản và console

- Tổng26 trạng thái Axe WCAG2 A/AA,WCAG2.1 AA và best-practice:11 Native/public +11 Desktop/public +4 member. Kết quả cuối0 vi phạm tự động. Dashboard ban đầu sai heading-order; Desktop Settings ban đầu thiếu6 tên điều khiển; đã sửa và chạy lại. Không loại các rule lỗi để làm xanh.
- Các nút được quét trong .satellite-content đạt>=44×44px. Điều này không chứng nhận nút trong Header/Footer/Billing/Auth hoặc các component khóa. Card lịch tuần được đo thêm nội bộ, vì scrollWidth toàn trang không bắt được nút tràn khỏi một cột.
- Đo thật trường tên hồ sơ: placeholder rgb161,169,184 trên rgb9,9,11 đạt8.42:1; border rgb95,105,122 trên nền đó đạt3.59:1; chữ rgb11,17,32 trên CTA rgb96,165,250 đạt7.41:1. Focus outline2px và Tab/Shift+Tab/Enter/ESC đã kiểm. Đây là các cặp màu đo cụ thể, không phải chứng nhận mọi pixel hoặc mọi trạng thái.
- Console giữ nguyên log: chỉ gặp Failed to load resource: net::ERR_FAILED và Service Worker registration blocked by Playwright do chủ động cô lập external requests/SW. Không gặp console.warn nghiệp vụ hoặc React/key warnings trong các ca đã chạy; không sửa bằng cách chặn console.warn. Chưa kiểm runtime với network/SDK thật.
-8 route nội bộ đã kiểm từ literal navigate và anchor của vùng trang: /app,/privacy-data,/settings,/profile,/account/security,/billing,/login,/. Dynamic room routes đã có các ca mã sai/hợp lệ ở đợt trước. Không tuyên bố mọi URL external/mailto có dịch vụ đích đang hoạt động; không gửi thư thật.

### Tái chạy và bằng chứng

Khởi động Vite cục bộ ở127.0.0.1:4176. PowerShell lọc lượt sâu: $env:POMO_AUDIT_CASES='^deep-'; $env:POMO_AUDIT_OUTPUT='tests/results/android-smoke/satellite-deep-recheck'; node tests/e2e/satelliteInteractionAudit.cjs.

Bằng chứng local ignored: satellite-deep-final.json (kết quả cuối theo tên ca), satellite-deep-unit-last.json, satellite-deep-type-check-last.log; raw26 trạng thái Axe trong satellite-deep-rerun/a11y-public.json, satellite-deep/a11y-member.json, satellite-deep-final-gates/a11y-desktop.json. Geometry card tuần trong satellite-deep-week-final/week-card-geometry.json; màu thật/link targets trong satellite-deep-links/. Đã xem ảnh360 Calendar, Rooms, Dashboard, member Profile và card lịch tuần sau sửa.

Không chứng nhận NVDA/TalkBack, xác thực hoặc MFA trên Supabase thật, cuộc gọi Meet/network thật, đồng bộ giữa thiết bị hoặc Samsung. 2FA dùng session/user fixture và Cloud transport mô phỏng, thuật toán/handler thật; password branch được chọn rõ bằng fixture provider=password. Chưa gỡ Portal Mobile Web và chưa sửa guest Credits ngoài khóa. Không commit/push/deploy; dừng sau ghi nhật ký.
