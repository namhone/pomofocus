# HANDOFF REPORT — SURVEY EXPLORER 3
**Role**: Teamwork Explorer (Survey Explorer 3)  
**Task**: Survey & Investigation for Sections 5, 6, 7 (Pomofocus v6.0 Ultimate)  
**Target Path**: `d:\FileCuaNam\Web'\Pomodoro\.agents\teamwork\explorer_survey_3\handoff.md`  
**Date**: 2026-11-08

---

## 1. OBSERVATION

1. **Section 5: Dimension Guardrails**:
   - `src/stores/useLayoutStore.ts:160-165`: `timer` có `width: 320, height: 440, minWidth: 280, minHeight: 300, maxWidth: 520, maxHeight: 760`. Spec yêu cầu Min `300 x 220px` — Max `440 x 340px`.
   - `src/stores/useLayoutStore.ts:176-182`: `tasks` có `width: 320, height: 420, minWidth: 280, minHeight: 300, maxWidth: 850, maxHeight: 900`. Spec yêu cầu Min `320 x 280px` — Max `500 x 650px`.
   - `src/stores/useLayoutStore.ts:192-198`: `notes` có `width: 330, height: 400, minWidth: 280, minHeight: 300, maxWidth: 900, maxHeight: 900`. Spec yêu cầu Min `280 x 240px` — Max `680 x 720px`.
   - `src/stores/useLayoutStore.ts:272-278`: `media` có `width: 480, height: 306, minWidth: 320, minHeight: 216, maxWidth: 960, maxHeight: 576`. Spec yêu cầu Min `280 x 140px` — Max `420 x 260px` kèm tỷ lệ 16:9 bắt buộc.
   - `src/components/WidgetContainer.tsx:206-235`: Hàm `handlePointerDownResize` xử lý resize theo chiều rộng và chiều cao độc lập, chưa có logic khóa tỷ lệ 16:9 khi dãn khung `id === 'media'`.
   - `src/components/AiCompanionWidget.tsx:289`: Panel AI đang áp dụng `fixed top-14 bottom-0 right-0 z-40 w-full sm:w-[420px]`. Spec yêu cầu `z-[80]`, `min-w-[340px]`, `max-w-[460px]`, chiều cao `h-[calc(100vh-24px)]`.

2. **Section 6: Zen Minimalism & Dọn Rác Tiếp Thị/Văn Bản/Âm Thanh**:
   - `src/components/AudioWidget.tsx:56`: Danh sách chuông chứa `{ value: 'rooster', label: 'Gà Gáy', desc: 'Tiếng gà ban mai sinh động' }`. Tệp `src/services/chimeSynthesizer.ts:55,210` chứa case `rooster` và hàm `playRooster()`. Tệp `src/components/SettingsView.tsx:99` chứa `{ id: 'rooster', name: 'Tiếng Gà Gáy' }`.
   - `src/components/AudioWidget.tsx:283-285`: Hiển thị `<p className="text-[10px] text-neutral-400 truncate">{track.description}</p>` chứa các mô tả sến súa được lưu tại `src/stores/useAudioStore.ts:129-222`.
   - `src/components/AudioWidget.tsx:319-334`: Chứa banner tiếp thị Quick Launch Media: *"Muốn xem video YouTube hoặc Livestream học tập? [Mở Media]"*.
   - `src/components/SpacesWidget.tsx:376-394`: Chứa banner tiếp thị Freemium PRO: `data-testid="spaces-pro-upgrade-banner"` với nội dung *"Mở khóa toàn bộ 1.000+ ảnh 4K & Cyberpunk [Nâng cấp]"*.
   - `src/components/TasksWidget.tsx:182`: Ô nhập nhiệm vụ có `placeholder="Bạn cần tập trung làm gì tiếp theo? (Enter để thêm)..."`, bị tràn và cắt cụt thành dấu `...` khi thu nhỏ cửa sổ.
   - `src/stores/useLayoutStore.ts:628-672`: `toggleWidget` và `openWidget` chỉ set `isOpen = true` với tọa độ cũ, không có logic cascade staggering cách nhau 24px khi mở nhiều widget từ Dockbar dẫn đến đè lớp.
   - `src/stores/useLayoutStore.ts:745,750` và `src/components/WidgetContainer.tsx:160`: Áp dụng chặn trần `Math.max(68, ...)` thay vì cho phép kéo sát trần `y = 8px`.
   - Chấm chỉ báo 3 trạng thái vi mô: `src/components/CollapsedWidgetCard.tsx:131` dùng `bg-neutral-600`, `src/components/WidgetContainer.tsx:380` dùng `bg-neutral-500`, `src/components/AiCompanionWidget.tsx:302` dùng `bg-emerald-500` thay vì chuẩn `bg-emerald-400` (live), `bg-amber-400` (paused/pending), `bg-zinc-500` (idle/off).

3. **Section 7: Testing, Build & Deployment Setup**:
   - `package.json`:
     - `"test": "vitest run"`
     - `"type-check": "tsc --noEmit"`
     - `"build": "tsc && vite build"`
   - `npm test`: Thực thi thực tế hoàn thành 52/52 test files passed, 466/466 test cases passed (100% xanh) trong 142.20s.
   - `npm run type-check`: `tsc --noEmit` hoàn thành với exit code 0, không có lỗi type.
   - `npm run build`: `tsc && vite build` hoàn thành trong 47.61s, đóng gói thành công các vendor chunks (`vendor-react`, `vendor-katex`, `vendor-webrtc`, `vendor-icons`), injectManifest thành công PWA service worker `dist/sw.js` (50 precache assets).
   - Git & Remote: Nhánh hiện tại `master` tại commit `c8191ba`, đồng bộ với `origin/master` và `origin/main`. Vercel CLI 60.0.1 đã sẵn sàng, liên kết dự án `pomodoro-workspace`. Alias chính thức: `pomofocus-workspace.vercel.app`.

---

## 2. LOGIC CHAIN

1. **Từ Observation 1 tới Thiết kế Kích thước (Dimension Guardrails)**:
   - Các widget hiện tại có `minWidth/minHeight` và `maxWidth/maxHeight` quá lỏng lẻo (Timer cao 440px trên màn hình gây khoảng trống vô lý, Media 480x306 vượt quá kích thước widget tiêu chuẩn).
   - Việc cấu hình lại `DEFAULT_WIDGETS` và `WIDGET_SIZE_PRESETS` theo đúng bảng Spec Section 5 đảm bảo không gian làm việc cân đối và tôn trọng tỷ lệ giao diện.
   - Đối với Media Player, việc video bị biến dạng xảy ra khi người dùng dãn khung tự do. Cần ép tỷ lệ 16:9 ngay trong hàm tính toán `handlePointerDownResize` của `WidgetContainer.tsx` và bổ sung `aspect-video` trong `MediaWidget.tsx`.
   - Đối với AI Companion, drawer hiện tại có `z-40`, ngang bằng với viên nang header thu gọn `floating-header-capsule` (`z-40`). Khi nâng AI Companion lên `z-[80]` và ẩn/đẩy lùi capsule khi `isAiOpen === true`, xung đột che khuất tiêu đề và các nút chức năng sẽ được triệt tiêu 100%.

2. **Từ Observation 2 tới Tinh lọc Tối giản Zen (Zen Minimalism)**:
   - Âm thanh "Gà gáy" và các câu mô tả sến súa tạo rác văn bản/thị giác trong không gian làm việc tập trung. Việc loại bỏ chúng chỉ giữ lại Icon + Tên âm thanh + Thanh trượt siêu mỏng giúp giảm tải nhận thức (cognitive load).
   - Các banner tiếp thị Freemium PRO và Quick Launch Media vi phạm nguyên tắc Zen và đi ngược lại trải nghiệm của người dùng (kể cả Founder/PRO). Loại bỏ triệt để 2 banner này đưa giao diện về trạng thái thanh tịnh.
   - Placeholder ô nhập task dài 62 ký tự dẫn đến việc trình duyệt cắt cụt thành `...` trên các màn hình có chiều rộng widget 320px. Đổi thành `Thêm nhiệm vụ mới... (Enter)` vừa vặn trong 31 ký tự, không bị cắt.
   - Khi mở widget từ Dockbar, nếu tọa độ trùng nhau (< 16px), việc tự động so le 24px (`x + 24, y + 24`) giúp người dùng nhìn thấy rõ các cửa sổ vừa mở mà không cần phải tự kéo tách thủ công.
   - Tháo bỏ chặn `Math.max(68, ...)` xuống `Math.max(8, ...)` giải phóng 100% diện tích đỉnh cho phép người dùng kéo widget sát mép trên.

3. **Từ Observation 3 tới Kế hoạch Thực thi & Nghiệm thu (Verification & Deployment)**:
   - Toàn bộ 466 tests đang pass và build sạch 0 lỗi chứng minh mã nguồn đang ở trạng thái nền tảng hoàn hảo.
   - Sau khi áp dụng các thay đổi phẫu thuật (surgical edits), cần chạy lại `npm test` và `npm run build` để xác thực zero regressions trước khi commit và push lên cả 2 nhánh `master` và `main`.

---

## 3. CAVEATS

1. **Test Dependency trên `tasks.maxHeight`**:
   - Tệp `tests/unit/layoutAndZen.test.ts:66-69` hiện có lệnh kiểm tra:
     ```ts
     updateWidgetSize('tasks', 500, 700);
     const expanded = useLayoutStore.getState().widgets.tasks;
     expect(expanded.width).toBe(500);
     expect(expanded.height).toBe(700);
     ```
   - Khi cấu hình `tasks.maxHeight: 650` theo đúng Spec v6.0, `expanded.height` sẽ được kẹp an toàn ở `650`, khiến ca test trên nhận `650 !== 700` và bị fail. Implementer bắt buộc phải cập nhật ca test này (ví dụ kiểm tra kẹp `expect(expanded.height).toBe(650)` hoặc test giá trị hợp lệ `(480, 600)`).
2. **Tương thích ngược âm thanh `rooster` trong ChimeSynthesizer**:
   - Trong `tests/unit/audioEngine.test.ts:145,152`, test case đang lặp qua danh sách 6 chuông có `rooster`. Khi loại bỏ `rooster` khỏi giao diện `AudioWidget.tsx` và `SettingsView.tsx`, implementer nên giữ fallback no-op trong `chimeSynthesizer.ts` hoặc cập nhật danh sách chuông trong test case này để đảm bảo 100% test pass.
3. **E2E Test Conditional Check**:
   - Trong `tests/e2e/billingAndUpgradeFlow.spec.ts:66-72`, thao tác click banner PRO được bao bọc trong `if (await bannerUpgradeBtn.isVisible())`, do đó việc xóa banner trong `SpacesWidget.tsx` an toàn và không gây vỡ E2E test suite.

---

## 4. CONCLUSION

Hệ thống đã được khảo sát toàn diện và xác định chính xác từng dòng code cần can thiệp để hoàn thành xuất sắc Sections 5, 6, 7 của Pomofocus v6.0 Ultimate:
1. **Section 5**: Cập nhật `DEFAULT_WIDGETS` và `WIDGET_SIZE_PRESETS` trong `useLayoutStore.ts`, khóa cứng tỷ lệ 16:9 cho Media trong `WidgetContainer.tsx` & `MediaWidget.tsx`, nâng `z-index` và kích thước cho `AiCompanionWidget.tsx`.
2. **Section 6**: Loại bỏ `rooster` và các mô tả sến súa trong `AudioWidget.tsx`, dọn sạch 2 banner tiếp thị trong `SpacesWidget.tsx` và `AudioWidget.tsx`, rút gọn placeholder nhập task trong `TasksWidget.tsx`, bổ sung cascade so le 24px trong `useLayoutStore.ts`, mở rộng kéo thả sát nóc `y = 8px`, và đồng bộ chấm 3 trạng thái (`bg-emerald-400`, `bg-amber-400`, `bg-zinc-500`).
3. **Section 7**: 100% test pass (466/466) và TypeScript build sạch sẽ được duy trì liên tục qua từng bước sửa đổi, sẵn sàng commit và triển khai lên Production `pomofocus-workspace.vercel.app`.

---

## 5. VERIFICATION METHOD

1. **Kiểm tra Unit Tests**:
   ```powershell
   npm test
   ```
   *Kỳ vọng*: 52/52 test files pass, 466/466 tests pass.
2. **Kiểm tra TypeScript**:
   ```powershell
   npm run type-check
   ```
   *Kỳ vọng*: Exit code 0, 0 lỗi biên dịch.
3. **Kiểm tra Production Build**:
   ```powershell
   npm run build
   ```
   *Kỳ vọng*: `dist/` được tạo đầy đủ với service worker PWA `dist/sw.js`.
4. **Kiểm tra Git Synchronization**:
   ```powershell
   git status
   git log -n 1 --oneline
   ```
   *Kỳ vọng*: Cam kết thông điệp đúng chuẩn và push lên cả `master` và `main`.
