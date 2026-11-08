# BÁO CÁO ĐIỀU TRA & KHẢO SÁT CHUYÊN SÂU: SECTION 5, 6, 7 (POMOFOCUS V6.0 ULTIMATE)
**Agent**: Survey Explorer 3  
**Ngày khảo sát**: 2026-11-08  
**Phạm vi**: 
- Section 5: Dimension Guardrails (Biên độ kích thước giới hạn từng thẻ)
- Section 6: Zen Minimalism & Cleanup (Khử ô nhiễm màu sắc & Dọn rác tiếp thị/văn bản/âm thanh)
- Section 7: Testing, Build & Verification (Quy trình kiểm thử, build và triển khai Vercel)

---

## 1. TỔNG QUAN HIỆN TRẠNG TOÀN DIỆN

| Hạng mục khảo sát | Hiện trạng hệ thống | Đánh giá & Khoảng cách (Gap) so với Spec v6.0 |
| :--- | :--- | :--- |
| **Pomodoro Timer Widget** | `useLayoutStore.ts:160` (W:320, H:440, min: 280x300, max: 520x760) | Chiều cao 440px và max 760px gây giãn trống trải quá mức. Cần siết: Min `300x220`, Max `440x340`. |
| **Task List Widget** | `useLayoutStore.ts:177` (W:320, H:420, min: 280x300, max: 850x900) | Kích thước min 280 quá hẹp, max 900 quá to. Cần chuẩn hóa: Min `320x280`, Max `500x650`. |
| **Quick Notes Widget** | `useLayoutStore.ts:192` (W:330, H:400, min: 280x300, max: 900x900) | Min H 300px chưa tối ưu cho sticky nhỏ. Cần chuẩn hóa: Min `280x240`, Max `680x720`. |
| **Media Player Widget** | `useLayoutStore.ts:272` (W:480, H:306, min: 320x216, max: 960x576) | Kích thước vượt spec (max 420x260). Thiếu cơ chế khóa cứng tỷ lệ khung hình video 16:9 khi dãn khung. |
| **AI Companion Panel** | `AiCompanionWidget.tsx:289` (`z-40`, `top-14 bottom-0`, `sm:w-[420px]`) | Bị cụm nút header đè lên đỉnh, z-index thấp hơn header capsule, thiếu guardrail Min `340px`, Max `460px`, `h-[calc(100vh-24px)]`. |
| **Âm thanh "Gà gáy"** | `AudioWidget.tsx:56`, `chimeSynthesizer.ts:55,210`, `SettingsView.tsx:99` | Vẫn tồn tại tùy chọn âm thanh "Gà gáy" (rooster) sến súa, cần loại bỏ triệt để. |
| **Mô tả sến súa trong âm thanh** | `useAudioStore.ts:129+`, `AudioWidget.tsx:284` | Toàn bộ các câu mô tả sến súa ("xoa dịu tâm trí", "vỗ về từng đợt"...) vẫn hiển thị dưới tên âm thanh. |
| **Banner tiếp thị / upsell** | `SpacesWidget.tsx:376-394`, `AudioWidget.tsx:319-334` | Tồn tại banner "Mở khóa toàn bộ 1.000+ ảnh 4K..." và "Muốn xem video YouTube hoặc Livestream...". |
| **Placeholder nhập Task** | `TasksWidget.tsx:182` | Câu placeholder dài gây cắt cụt `...`: `"Bạn cần tập trung làm gì tiếp theo? (Enter để thêm)..."`. |
| **Tọa độ so le (Cascade 24px)** | `useLayoutStore.ts:628-672` (`toggleWidget`, `openWidget`) | Khi mở từ Dockbar, widget giữ nguyên vị trí cũ hoặc đè kín mít lên nhau nếu cùng tọa độ; chưa tự động tính so le 24px. |
| **Giới hạn kéo sát trần (y=8px)** | `useLayoutStore.ts:745` (`targetY = Math.max(68, ...)`), `WidgetContainer.tsx:160` | Đang khóa cứng chặn kéo lên trên (`y >= 68px`), ngăn cản kéo widget sát trần (`y = 8px`). |
| **Chấm chỉ báo 3 trạng thái** | `CollapsedWidgetCard.tsx:131`, `WidgetContainer.tsx:380`, `AiCompanionWidget:302` | Dùng rải rác `neutral-600`, `neutral-500`, `emerald-500` thay vì bộ chuẩn: `bg-emerald-400`, `bg-amber-400`, `bg-zinc-500`. |
| **Test Suites** | `tests/unit/*.test.ts`, `tests/e2e/*.spec.ts` | 52 test files, 466 tests passed 100% trong 142s. |
| **TypeScript Typecheck** | `package.json` (`tsc --noEmit`) | Biên dịch sạch 100%, 0 lỗi type. |
| **Vite Build** | `package.json` (`tsc && vite build`) | Build thành công 100% trong 47.6s, PWA injectManifest xuất xưởng `dist/sw.js`. |
| **Git & Vercel** | Git local/remote tại commit `c8191ba`, Vercel CLI 60.0.1, project `pomodoro-workspace` | Đồng bộ 2 nhánh `master` và `main`. Alias đích: `pomofocus-workspace.vercel.app`. |

---

## 2. CHI TIẾT ĐIỀU TRA TỪNG THÀNH PHẦN

### 2.1. Section 5: Dimension Guardrails (Biên độ kích thước từng thẻ)

#### A. Pomodoro Timer Widget
- **Tệp nguồn chính**:
  - `src/stores/useLayoutStore.ts` (dòng 153-168)
  - `src/components/WidgetContainer.tsx` (dòng 218-230, 453-472)
  - `src/components/TimerTestInterface.tsx` (dòng 144-150)
- **Thông số hiện tại**:
  ```ts
  // useLayoutStore.ts:160-165
  width: 320,
  height: 440,
  minWidth: 280,
  minHeight: 300,
  maxWidth: 520,
  maxHeight: 760,
  ```
- **Yêu cầu Spec v6.0**:
  - Min: `300 x 220px`
  - Max: `440 x 340px`
  - Trọng tâm số đếm cố định, không giãn trống trải vô lý.
- **Phân tích điều chỉnh**:
  - Cập nhật `DEFAULT_WIDGETS.timer`:
    - `minWidth: 300`, `minHeight: 220`
    - `maxWidth: 440`, `maxHeight: 340`
    - `width: 340`, `height: 280` (vừa vặn, không bị đội trần 340px).
  - Cập nhật `WIDGET_SIZE_PRESETS.timer`:
    - `S`: `{ width: 300, height: 240 }`
    - `M`: `{ width: 340, height: 280 }`
    - `L`: `{ width: 400, height: 320 }` (thay vì 480px hiện tại).

#### B. Task List Widget
- **Tệp nguồn chính**:
  - `src/stores/useLayoutStore.ts` (dòng 169-184)
  - `src/components/TasksWidget.tsx` (dòng 78-81, 252-346)
- **Thông số hiện tại**:
  ```ts
  // useLayoutStore.ts:176-182
  width: 320,
  height: 420,
  minWidth: 280,
  minHeight: 300,
  maxWidth: 850,
  maxHeight: 900,
  ```
- **Yêu cầu Spec v6.0**:
  - Min: `320 x 280px`
  - Max: `500 x 650px`
  - Tự động mở rộng danh sách cuộn mượt nội bộ (`overflow-y-auto`).
- **Phân tích điều chỉnh**:
  - Cập nhật `DEFAULT_WIDGETS.tasks`:
    - `minWidth: 320`, `minHeight: 280`
    - `maxWidth: 500`, `maxHeight: 650`
    - `width: 340`, `height: 440`
  - Cập nhật `WIDGET_SIZE_PRESETS.tasks`:
    - `S`: `{ width: 320, height: 320 }`
    - `M`: `{ width: 360, height: 440 }`
    - `L`: `{ width: 480, height: 580 }`
  - **LƯU Ý TEST QUAN TRỌNG (CAVEAT)**:
    - Trong `tests/unit/layoutAndZen.test.ts` (dòng 66-69):
      ```ts
      updateWidgetSize('tasks', 500, 700);
      const expanded = useLayoutStore.getState().widgets.tasks;
      expect(expanded.width).toBe(500);
      expect(expanded.height).toBe(700);
      ```
      Nếu siết `maxHeight: 650`, đoạn test này sẽ nhận `650` thay vì `700` và bị **FAIL**! Cần cập nhật ca test này thành `expect(expanded.height).toBe(650)` hoặc test với kích thước hợp lệ `(480, 600)`.

#### C. Quick Notes Widget
- **Tệp nguồn chính**:
  - `src/stores/useLayoutStore.ts` (dòng 185-200)
  - `src/components/NotesWidget.tsx` (dòng 204-236)
- **Thông số hiện tại**:
  ```ts
  // useLayoutStore.ts:192-198
  width: 330,
  height: 400,
  minWidth: 280,
  minHeight: 300,
  maxWidth: 900,
  maxHeight: 900,
  ```
- **Yêu cầu Spec v6.0**:
  - Min: `280 x 240px`
  - Max: `680 x 720px`
  - Khu vực textarea co giãn tự do theo khung kéo.
- **Phân tích điều chỉnh**:
  - Cập nhật `DEFAULT_WIDGETS.notes`:
    - `minWidth: 280`, `minHeight: 240`
    - `maxWidth: 680`, `maxHeight: 720`
    - `width: 340`, `height: 420`
  - Cập nhật `WIDGET_SIZE_PRESETS.notes`:
    - `S`: `{ width: 280, height: 280 }`
    - `M`: `{ width: 360, height: 420 }`
    - `L`: `{ width: 540, height: 600 }`
  - `NotesWidget.tsx`: Đảm bảo `<textarea>` chiếm `flex-1 h-full` để co giãn theo khung container thay vì cố định `rows={5}`.

#### D. Media Player Widget
- **Tệp nguồn chính**:
  - `src/stores/useLayoutStore.ts` (dòng 265-280)
  - `src/components/MediaWidget.tsx` (dòng 309-345)
  - `src/components/WidgetContainer.tsx` (dòng 79-82, 206-235)
- **Thông số hiện tại**:
  ```ts
  // useLayoutStore.ts:272-278
  width: 480,
  height: 306,
  minWidth: 320,
  minHeight: 216,
  maxWidth: 960,
  maxHeight: 576,
  ```
- **Yêu cầu Spec v6.0**:
  - Min: `280 x 140px`
  - Max: `420 x 260px`
  - **Bắt buộc khóa cứng tỷ lệ khung hình video 16:9 khi dãn khung.**
- **Phân tích điều chỉnh**:
  - Cập nhật `DEFAULT_WIDGETS.media`:
    - `minWidth: 280`, `minHeight: 140`
    - `maxWidth: 420`, `maxHeight: 260`
    - `width: 384`, `height: 216` (hoặc 360x225).
  - Khóa tỷ lệ 16:9 khi resize trong `WidgetContainer.tsx`:
    Khi `id === 'media'`, tính toán `height` theo `width * 9 / 16 + chromeOffset` hoặc khóa trực tiếp tỷ lệ trong resize hook:
    ```ts
    if (id === 'media') {
      // Khóa cứng tỷ lệ 16:9 cho vùng phát media
      const clampedW = Math.max(280, Math.min(requestedWidth, 420));
      const clampedH = Math.max(140, Math.min(Math.round(clampedW * 9 / 16) + 48, 260));
      updateWidgetSize(id, clampedW, clampedH, false);
    }
    ```
  - Trong `MediaWidget.tsx`: Bổ sung class `aspect-video` cho khung chứa `<YouTube>` để video luôn đạt 16:9 không bị viền đen lệch.

#### E. AI Study Companion Panel
- **Tệp nguồn chính**:
  - `src/components/AiCompanionWidget.tsx` (dòng 286-309)
  - `src/components/PlatformHeader.tsx` (dòng 266-363)
- **Hiện trạng**:
  - Khung chat AI dùng `z-40`, tọa độ `top-14 bottom-0`, độ rộng `w-full sm:w-[420px]`.
  - Cụm nút header (`floating-header-capsule`) cũng nằm ở `z-40` và tọa độ `top-3 right-4`, gây xung đột Z-index và che khuất tiêu đề, các nút thao tác (+, lịch sử, đóng X) của AI.
- **Yêu cầu Spec v6.0**:
  - Nâng `z-index` lên `z-[80]`.
  - Độ rộng: Min `340px` — Max `460px`, `sm:w-[420px]`.
  - Chiều cao: `h-[calc(100vh-24px)]` hoặc `top-3 bottom-3 right-3 rounded-2xl`.
  - Khi `isAiOpen === true`: Tự động ẩn hoặc dịch chuyển cụm nút header góc phải ra phía sau để tiêu đề và toàn bộ nút của AI Companion hiển thị trọn vẹn 100%.

---

### 2.2. Section 6: Zen Minimalism & Dọn Rác Tiếp Thị

#### A. Âm thanh "Gà gáy" (Rooster)
- **Vị trí xuất hiện**:
  1. `src/components/AudioWidget.tsx:56`:
     `{ value: 'rooster', label: 'Gà Gáy', desc: 'Tiếng gà ban mai sinh động' }`
  2. `src/services/chimeSynthesizer.ts:55, 210-237`:
     `case 'rooster': return this.playRooster();` và phương thức tổng hợp âm kèn/gà.
  3. `src/components/SettingsView.tsx:99`:
     `{ id: 'rooster', name: 'Tiếng Gà Gáy' },`
  4. `src/types/audio.ts:6`:
     Kiểu `| 'rooster'` trong `ChimeSoundType`.
  5. `tests/unit/audioEngine.test.ts:145, 152`:
     Unit test kiểm tra tổng hợp 6 loại chuông có `rooster`.
- **Hành động cần làm**:
  - Xóa vĩnh viễn tùy chọn 'rooster' khỏi danh sách chuông giao diện người dùng (`AudioWidget.tsx`, `SettingsView.tsx`).
  - Trong `chimeSynthesizer.ts`: Giữ fallback an toàn nếu có state cũ trong localStorage gọi tới `rooster`, nhưng không cung cấp cho người dùng chọn mới.
  - Cập nhật unit test `tests/unit/audioEngine.test.ts` để kiểm tra 5 loại chuông chuẩn còn lại.

#### B. Mô tả sến súa trong danh sách âm thanh
- **Vị trí xuất hiện**:
  1. `src/stores/useAudioStore.ts` (dòng 121-225):
     - 'Tiếng mưa rơi đều đặn xoa dịu tâm trí'
     - 'Sóng biển dạt dào êm ả vỗ về từng đợt'
     - 'Không gian ấm cúng, êm đềm của quán quen'
     - 'Tiếng gõ phím cơ nhịp nhàng tăng năng suất tập trung'
     - 'Dòng suối êm ả róc rách qua ghềnh đá'
     - 'Đốm lửa bập bùng lách tách ấm áp trong đêm'
     - 'Tiếng ồn trắng triệt tiêu tiếng ồn môi trường'
     - 'Tiếng ồn hồng êm dịu, giảm căng thẳng não bộ'
     - 'Tiếng ồn nâu trầm ấm, thư giãn sâu'
  2. `src/components/AudioWidget.tsx` (dòng 283-285):
     ```tsx
     {track.description && (
       <p className="text-[10px] text-neutral-400 truncate" title={track.description}>{track.description}</p>
     )}
     ```
  3. `src/components/AudioWidget.tsx` (dòng 50-57): Các dòng `desc` của Chimes ("Arpeggio trong trẻo", "Chuông gõ vui tươi"...).
- **Hành động cần làm**:
  - Xóa bỏ việc render `<p className="text-[10px]...">{track.description}</p>`.
  - Thiết kế danh sách âm thanh tối giản chuẩn Zen: Chỉ giữ `Icon` + `Tên âm thanh` (text-zinc-200) + `Thanh trượt âm lượng siêu mỏng` (h-1.5, accent-white).
  - Loại bỏ các chuỗi mô tả thừa trong `chimeOptions`.

#### C. Banner tiếp thị & Upsell chèn ngang
- **Vị trí xuất hiện**:
  1. `src/components/SpacesWidget.tsx` (dòng 376-394):
     ```tsx
     {/* Freemium PRO Banner */}
     {!isPro && (
       <div data-testid="spaces-pro-upgrade-banner" className="...">
         <span>Mở khóa toàn bộ 1.000+ ảnh 4K & Cyberpunk</span>
         <button data-testid="spaces-pro-upgrade-btn">Nâng cấp</button>
       </div>
     )}
     ```
  2. `src/components/AudioWidget.tsx` (dòng 319-334):
     ```tsx
     {/* Media Window Quick Launch Banner */}
     <div className="my-2 p-2.5 rounded-xl bg-neutral-900/60 border border-white/10 flex items-center justify-between gap-2 shrink-0">
       <span>Muốn xem video YouTube hoặc Livestream học tập?</span>
       <button onClick={() => openWidget('media')}>Mở Media</button>
     </div>
     ```
- **Hành động cần làm**:
  - Xóa bỏ 100% hai khối banner này.
  - Người dùng có thanh Dockbar để mở Media, không cần banner quảng bá chèn ngang trong Audio.
  - Trong Spaces: Giữ nhãn PRO tinh tế ở góc ảnh thay vì banner vàng khè ép người dùng nâng cấp.

#### D. Ô nhập Task bị cắt cụt chữ
- **Vị trí**: `src/components/TasksWidget.tsx` (dòng 182)
- **Hiện trạng**:
  `placeholder="Bạn cần tập trung làm gì tiếp theo? (Enter để thêm)..."` (quá dài, tràn mép khung khi cửa sổ co nhỏ).
- **Yêu cầu Spec v6.0**:
  Đổi thành: `placeholder="Thêm nhiệm vụ mới... (Enter)"`.

#### E. Cơ chế tính tọa độ so le (Cascade 24px) khi mở từ Dockbar
- **Vị trí**: `src/stores/useLayoutStore.ts` (dòng 628-672)
- **Hiện trạng**:
  - Hàm `toggleWidget(id)` và `openWidget(id)` chỉ gán `isOpen = true` với tọa độ `current.x` và `current.y` đã lưu trong bộ nhớ.
  - Nếu người dùng mở liên tiếp 3-4 widget từ Dockbar mà trước đó chưa kéo thả, các widget sẽ nằm đè kín khít lên nhau tạo hiện tượng "bóng ma 4 tầng".
- **Hành động cần làm**:
  - Khi mở một widget: Kiểm tra xem vị trí của nó có đang trùng khít (< 16px) với bất kỳ widget nào đang mở khác hay không.
  - Nếu trùng khít: Tự động cộng dồn tọa độ so le: `x = prev.x + 24`, `y = prev.y + 24` (giữ trong biên giới hạn màn hình).

#### F. Tháo bỏ giới hạn kéo thả cũ (cho phép sát trần y = 8px)
- **Vị trí**:
  1. `src/stores/useLayoutStore.ts:745`:
     `let targetY = Math.max(68, Math.round(y));` -> Hạ xuống: `let targetY = Math.max(8, Math.round(y));`
  2. `src/stores/useLayoutStore.ts:750`:
     `if (Math.abs(targetY - 68) < SNAP) targetY = 68;` -> Đổi thành snap mép trần `targetY = 8;`
  3. `src/components/WidgetContainer.tsx:160`:
     `targetY = Math.max(68, Math.min(snappedY, maxY));` -> Hạ xuống: `targetY = Math.max(8, Math.min(snappedY, maxY));`

#### G. Chuẩn hóa Chấm chỉ báo 3 trạng thái vi mô (3-State Micro Dot)
- **Quy chuẩn màu sắc bất biến**:
  - `bg-emerald-400`: Đang chạy / Live / Hoạt động
  - `bg-amber-400`: Tạm dừng / Chờ / Pending
  - `bg-zinc-500`: Nghỉ / Tắt / Offline
- **Vị trí cần cập nhật**:
  1. `src/components/CollapsedWidgetCard.tsx:131`: Đổi `bg-neutral-600` -> `bg-zinc-500`.
  2. `src/components/WidgetContainer.tsx:380`: Đổi `bg-neutral-500` -> `bg-zinc-500`.
  3. `src/components/AiCompanionWidget.tsx:302`: Đổi `bg-emerald-500` -> `bg-emerald-400`.
  4. Typography: Thay thế các text màu mè bằng `text-white` với font-weight `font-semibold` và font đơn sắc.

---

### 2.3. Section 7: Testing, Build, Git & Vercel Verification

#### A. Kết quả thực thi Test Suite hiện hữu
- **Lệnh thực thi**: `npm test` (`vitest run`)
- **Kết quả đo lường**:
  - Tổng số test files: **52/52 passed (100%)**
  - Tổng số test cases: **466/466 passed (100%)**
  - Thời gian chạy: **142.20s**
- **Đánh giá**: Bộ test hiện tại đang hoàn toàn xanh và ổn định.

#### B. Kết quả kiểm tra biên dịch TypeScript
- **Lệnh thực thi**: `npm run type-check` (`tsc --noEmit`)
- **Kết quả**: Exit code `0` — **0 Type Errors, 0 Warnings**.

#### C. Kết quả Build Production
- **Lệnh thực thi**: `npm run build` (`tsc && vite build`)
- **Kết quả**:
  - Thời gian build: **47.61s**
  - Assets sinh ra trong thư mục `dist/` đầy đủ (CSS 151KB, index bundle, vendor chunks, KaTeX fonts).
  - PWA Service Worker `dist/sw.js` injectManifest thành công với 50 assets (4492 KiB).

#### D. Git & Vercel Configuration
- **Branch**: Hiện tại nhánh `master` ở commit `c8191ba` trùng khớp với `origin/master` và `origin/main`.
- **Yêu cầu commit**:
  - Message: `feat(design): implement apple liquid glass, macos dock magnification, zero-fout and zen minimalism v6.0`
  - Push đồng thời lên cả 2 nhánh: `master` và `main`.
- **Vercel Project**:
  - Đã liên kết với `pomodoro-workspace` (Project ID: `prj_svl0WVtsug3iG92o0xZu2HKjXYel`).
  - Production Alias: `pomofocus-workspace.vercel.app`.

---

## 3. BẢNG TỔNG HỢP CÁC FILE VÀ DÒNG CODE CẦN CHỈNH SỬA

| STT | File đường dẫn | Dòng code | Mục đích chỉnh sửa |
| :--- | :--- | :--- | :--- |
| 1 | `src/stores/useLayoutStore.ts` | 158-281 | Cập nhật Dimension Guardrails chuẩn Spec v6.0 cho Timer, Tasks, Notes, Media. |
| 2 | `src/stores/useLayoutStore.ts` | 31-72 | Điều chỉnh các preset S/M/L trong `WIDGET_SIZE_PRESETS` không vượt maxHeight mới. |
| 3 | `src/stores/useLayoutStore.ts` | 628-672 | Bổ sung logic Cascade so le 24px khi mở widget từ Dockbar nếu trùng tọa độ. |
| 4 | `src/stores/useLayoutStore.ts` | 745, 750 | Hạ giới hạn trần từ `Math.max(68, ...)` xuống `Math.max(8, ...)` cho phép kéo sát nóc (y=8px). |
| 5 | `src/components/WidgetContainer.tsx` | 160 | Cập nhật snap trần từ `Math.max(68, ...)` thành `Math.max(8, ...)`. |
| 6 | `src/components/WidgetContainer.tsx` | 206-235 | Bổ sung khóa cứng tỷ lệ khung hình video 16:9 khi dãn khung `id === 'media'`. |
| 7 | `src/components/WidgetContainer.tsx` | 380 | Chuẩn hóa chấm trạng thái chờ sang `bg-zinc-500`. |
| 8 | `src/components/AiCompanionWidget.tsx` | 289 | Đổi `z-40` thành `z-[80]`, bổ sung `min-w-[340px] max-w-[460px] h-[calc(100vh-24px)]`. |
| 9 | `src/components/PlatformHeader.tsx` | 266-277 | Khi `isAiOpen === true`, tự động ẩn/đẩy lùi capsule header để không che tiêu đề và nút của AI. |
| 10 | `src/components/AudioWidget.tsx` | 56 | Xóa bỏ âm thanh 'rooster' (Gà Gáy) và các chuỗi `desc` sến súa. |
| 11 | `src/components/AudioWidget.tsx` | 283-285 | Xóa bỏ dòng mô tả âm thanh sến súa; giữ icon + tên + volume slider siêu mỏng. |
| 12 | `src/components/AudioWidget.tsx` | 319-334 | Xóa bỏ banner tiếp thị Quick Launch Media. |
| 13 | `src/components/SpacesWidget.tsx` | 376-394 | Xóa bỏ banner tiếp thị Freemium PRO upgrade. |
| 14 | `src/components/TasksWidget.tsx` | 182 | Đổi placeholder thành `"Thêm nhiệm vụ mới... (Enter)"`. |
| 15 | `src/components/CollapsedWidgetCard.tsx` | 131 | Đổi chấm trạng thái sang `bg-zinc-500`. |
| 16 | `tests/unit/layoutAndZen.test.ts` | 66-69 | Điều chỉnh test case kích thước tasks để tương thích với `maxHeight: 650`. |
| 17 | `tests/unit/audioEngine.test.ts` | 145, 152 | Cập nhật test case loại chuông khi bỏ `rooster`. |

---
*Báo cáo được hoàn thành bởi Survey Explorer 3 theo tiêu chuẩn Surgical Investigation & Evidence-Based Analysis.*
