# Full-repo health check — 8.1.4/code85

Ngày kiểm tra: 27/11/2026. Baseline: `7d430dc`, đã đồng bộ origin/master khi bắt đầu. Antigravity làm Supabase Dashboard; lượt này không thay cấu hình Cloud, UI hoặc logic sản phẩm.

## Gates

- `npm run type-check`: exit0, không lỗi.
- Baseline đầy đủ: `npx vitest run --maxWorkers=1 --minWorkers=1 --reporter=verbose --reporter=json --outputFile=tests/results/android-smoke/full-repo-before.json`: **198 file,109 pass/89 fail;2.576 test pass/257 fail;0 skipped/todo;exit1**,1280,45 giây. Giữ nguyên toàn bộ include trong vite.config.ts. Số suite lồng nhau trong JSON không được gọi là số file.
- Lượt đầu2 workers/JSON đã dừng sau khoảng20 phút vì không có tiến độ hiển thị trên host7,90GB RAM/chỉ0,30GB trống. Đây là lượt hủy, không tính thành kết quả đầy đủ.
- Lượt tập trung trung gian47 file:1.019 pass/39 fail. Đây là kết quả trung gian trước đợt sửa cuối.
- Full sweep thứ hai: **198 file,164 pass/34 fail;2.773 test pass/59 fail;0 skipped;exit1**. Không lọc file, không thêm skip/exclude hoặc đổi timeout để che failure.
- Sau lượt full thứ hai, sửa thêm assertion/fixture có bằng chứng và chạy lại18 file:161 pass/4 fail. Hai failure về nhãn được sửa tiếp và chạy lại nguyên2 file:21/21 pass; hai failure còn lại thuộc unifiedAuthAndAvatarSync.
- Android smoke fixture trong full sweep có1 subprocess bị **Internal CLR error0x80131506** trên host, status=null thay vì1. Chạy riêng nguyên suite, giữ nguyên script/timeout: **11/11 pass,exit0**. Đây không phải crash Samsung hoặc bằng chứng logcat thật.
- **Tổng hợp kết quả mới nhất theo từng file:198 file,182 pass/16 fail;2.800 test pass/32 fail.** Đây là kết quả ghép full sweep với các lượt chạy lại nêu trên, **không phải một lượt full xanh**. Artifact latest-per-file.json ghi nguồn kết quả cho từng file. Tổng số ca giảm2833 xuống2832 do gộp một ca grid cũ vào bộ viewport/Tools; không thêm skip.
- Coverage riêng `nativeGoogleSignIn.test.ts` và `backgroundContrast.test.ts`:12/12 pass; `nativeGoogleAuth.ts` và `backgroundContrast.ts` đạt100% statement/line/function/branch. Không phải coverage toàn repository, UI sheet hoặc Java.

## Bốn edge-case native

Probe SDK/network trong jsdom chạy source thật ở wrapper Google, adapter và MobileAuthBottomSheet;4 ca,2 pass/2 fail. ADB trả danh sách thiết bị trống; chưa đánh giá trên Samsung thật, không thay mô phỏng bằng tuyên bố nghiệm thu APK.

| Tình huống | Kết quả | Bằng chứng |
| --- | --- | --- |
| Hủy chọn Gmail | FAIL | Java ánh xạ cancellation thành SIGN_IN_CANCELLED. Loading tắt qua finally, nhưng catch của sheet luôn đặt feedback.type=error nên xuất hiện banner rose. |
| Không có tài khoản Google | PASS ở biên SDK/UI mô phỏng | Java hiện gộp lỗi này thành GOOGLE_SIGN_IN_FAILED; UI hiển thị “Không thể đăng nhập Google. Vui lòng thử lại hoặc dùng email.”, tắt loading, không tạo session. Chưa thử bộ chọn trên máy không có Gmail; chưa có fallback Web tự động. |
| Mất mạng trong ID-token exchange | PASS trong mô phỏng fetch bị từ chối | Không lưu session, loading tắt, thông báo Việt hướng dùng email. Adapter có AbortSignal.timeout15000ms; chưa cắt mạng vật lý trên Samsung. |
| Token hết hạn sau khi mở lại app | FAIL | Session có expires_at=1 và refresh_token nhưng getSession không gọi refresh, trả session đã lưu. Resume/focus hiện chỉ tải credits/profile. Không có Auth appStateChange refresh. |

Điểm cần sửa ở lượt triển khai tiếp theo:

1. `MobileAuthBottomSheet.tsx:145`: tách hủy chủ động khỏi lỗi đăng nhập; vẫn luôn tắt loading. Không cần đổi timeout hoặc tạo session giả.
2. `src/lib/supabase.ts:934` và `App.tsx:178`: refresh session bằng server khi hết hạn/foreground, bảo vệ logout và tránh refresh song song. Không tự dựng JWT hoặc thay quyền/số dư để né lỗi401.

Lượt QA này giữ nguyên source sản phẩm; hai lỗi trên chưa được khắc phục. Kết quả probe rút gọn: artifacts/health-check-85/native-edge-cases.json. Không sử dụng skip, it.fails hoặc sửa kỳ vọng “không lỗi đỏ/được refresh” để làm probe pass.

Đối chiếu [Supabase User Sessions](https://supabase.com/docs/guides/auth/sessions) và [Observability](https://supabase.com/docs/guides/observability). Kết luận thiếu refresh ở đây dựa trên adapter riêng và probe của repository, không suy diễn từ hành vi mặc định của supabase-js.

## Phân loại failure và thay đổi test

- Assertion cũ đã đối chiếu source: Sentence Case/Monochrome/icon thay emoji, release85 thay8.1.0, Header mở Cài đặt và tab Tiện ích, toolbar Notes một hàng, auto-fill Spaces132px, chiều cao stepper tối thiểu56px và safe area Header/Dock.
- TimerWidget và TimerTestInterface có mục đích hiển thị khác nhau sau khi gỡ bộ nhập thời lượng trùng. Bỏ giả định hai file phải giống từng byte; giữ contract chung useTimerStore và ba action Start/Pause/Resume.
- Sửa mock mạng của syncQueue theo select/insert thay upsert. Test mạng đứt sau15 mutation vẫn kiểm tra15 thành công,1 thất bại,15 còn chờ rồi khôi phục. Khi bảng focus_sessions trả42P01:2 task thành công,2 phiên vẫn nằm trong queue với retryCount1; không xóa mutation chưa lên Cloud.
- Bài kiểm tra5 shortcut ở Settings được chuyển sang4 tiện ích hiện hành: Meet/Ghi chú/Lịch/Thống kê; Gói cước ở Settings. Giữ kiểm tra điều hướng và nhãn trên280/320/360/390px. Đây là contract DOM/class trong jsdom, không phải bằng chứng layout hay tương phản trên máy thật. Một ca hàng-grid cũ được gộp vào các ca viewport; không phải skip một lỗi còn tồn tại.
- Một số suite Auth/Avatar/2FA cũ còn gọi Cloud mà thiếu mock transport/phiên xác thực hoặc giả định cấp quyền từ email/số dư. Kết quả đỏ của chúng cần phân loại tiếp; không đủ để kết luận mọi lỗi là lỗi production, cũng không được bỏ qua như lỗi copy.
- Baseline các contract cốt lõi vẫn pass: Founder17/17; hai thiết bị12/12; conflict7/7; presentation9/9; native helper9/9; Android smoke script11/11. Các contract này không thay thế bốn probe native hoặc xác minh Cloud/Android thật.

### Còn32 test đỏ, chưa được giải quyết

- **30 ca Auth/Avatar/2FA** trong14 file: có luồng cập nhật hồ sơ trả lỗi Cloud, avatar/canonical identity, thiếu claim/phiên server trong fixture cũ và các cờ SMS/TOTP. Không đổi kỳ vọng sang avatar sai hoặc bỏ yêu cầu xác thực để làm xanh. Cần phân biệt lỗi setup test và lỗi luồng tích hợp trước khi sửa product.
- **1 ca QR** trong milestone2EmpiricalChallenger1: SVG sau sanitize thiếu role="img" mà contract đòi hỏi. Cần review ngữ nghĩa trợ năng; không tự xóa assertion này.
- **1 ca contact surface** trong securityPiiAndXssRemediation: kỳ vọng support@pomofocus.vn trên mọi bề mặt liên hệ chưa khớp source hiện tại. Chưa sửa nội dung sản phẩm hoặc coi đây là kết luận pháp lý.

Danh sách từng file/ca và dòng lỗi đầu nằm trong artifacts/health-check-85/latest-per-file.json. Hai native probe thất bại được ghi riêng; chúng không nằm trong32 ca Vitest nói trên. **Trạng thái: chưa Full-Repo Green.**

## Vệ sinh và phạm vi

Root không có file audit/zoom/debug tạm khớp kiểm kê. Các ảnh trong tests/screenshots là bằng chứng lịch sử đã có; giữ lại cùng scripts/android_smoke_check.ps1 và báo cáo chính trong docs/reports. Đã xóa đúng các file tạm do Codex tạo: native-edge-probe.config.ts, native-edge-probe.test.tsx và earth-visual.cjs trong thư mục kết quả gitignored. Giữ raw log/JSON tại chỗ, không stage dữ liệu log thiết bị. Probe là lượt chẩn đoán riêng, không phải một ca bị đưa vào rồi loại khỏi full suite để giấu failure.

APK85 giữ nguyên:8.1.4/code85,9.992.581 bytes (9,53MB), SHA2563841b61e2f31a57b31173bbfe027d36e2ab68f4cee01abb76b26ffd5f927ae39 khớp public/version.json và src/config/apkRelease.json khi bắt đầu. Không build/deploy sản phẩm trong lượt QA này.

Đã hoàn tất lượt kiểm chứng và dọn file tạm trong phạm vi này. **Chưa nghiệm thu Full-Repo Green hoặc bốn edge-case trên Samsung thật.** Source sản phẩm và APK85 giữ nguyên; các lỗi và test đỏ nêu trên vẫn cần xử lý.
