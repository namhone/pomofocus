# BÁO CÁO BÀN GIAO (HANDOFF REPORT) — SURVEY EXPLORER 2
**Mã Agent:** Survey Explorer 2  
**Đối tượng bàn giao:** Project Orchestrator (Conversation ID: `1bd3b181-5618-4e23-9890-9f34e23eca19`), Senior Architect & Senior Coder  
**Chuyên đề:** Section 3 (/app workspace layout and drag limits) & Section 4 (macOS Liquid Dock)  
**Thời gian hoàn tất:** 2026-11-08T04:56:00Z  

---

## 1. OBSERVATION (QUAN SÁT THỰC TẾ)

1. **Giới hạn kéo thả đỉnh tại Workspace:**
   - Tại `src/components/WidgetContainer.tsx` dòng 160:
     ```tsx
     targetY = Math.max(68, Math.min(snappedY, maxY));
     ```
   - Tại `src/components/WidgetContainer.tsx` dòng 224 (co giãn hướng bắc):
     ```tsx
     const screenMaxH = Math.max(minH, window.innerHeight - (north ? 50 : start.startY) - 12);
     ```
   - Tại `src/stores/useLayoutStore.ts` dòng 745 & 750:
     ```ts
     let targetY = Math.max(68, Math.round(y));
     if (Math.abs(targetY - 68) < SNAP) targetY = 68;
     ```
   - Tại `src/stores/useLayoutStore.ts` dòng 108 & 159-281:
     `computeBalancedDefaultLayout` khởi tạo `const topY = 76;`, và `DEFAULT_WIDGETS` (timer, tasks, notes) có `y: 76`.
   - Tại `src/App.tsx` dòng 355:
     `<main className="fixed inset-0 pointer-events-none w-screen h-screen z-10 overflow-visible pt-14 pb-28">` chứa lớp đệm cố định `pt-14` (56px).

2. **Bố cục điều hướng Home ("Về Trang Chủ") tại `/app`:**
   - Tại `src/components/PlatformHeader.tsx` dòng 268-364: Hình thái viên nang thu gọn `floating-header-capsule` chỉ có: Avatar + Credits + Settings + Menu Expand. Chưa có icon Home trực tiếp.
   - Khi bấm "▾ Menu", header đầy đủ `platform-unified-header` (dòng 370-442) trượt xuống, chiếm toàn bộ chiều ngang đỉnh với 7 tab điều hướng (`/app`, `/billing`, `/rooms`, `/calendar`, `/dashboard`, `/help`, `/contact`), làm mất không gian làm việc tập trung.
   - Tại `src/components/SettingsWidget.tsx` dòng 1-120: Chưa có lối tắt nhanh về trang chủ Landing Page (`/`).

3. **Hiện trạng thanh DockBar so với mẫu chuẩn `apple-liquid-dock.md`:**
   - Tại `src/components/DockBar.tsx`:
     * Vật liệu: Sử dụng `bg-[rgba(14,17,25,0.78)]`, không có gradient titan `linear-gradient(180deg, rgba(255, 255, 255, 0.13), rgba(255, 255, 255, 0.05)), rgba(30, 30, 35, 0.75)` và thiếu lớp phản xạ Specular Highlight `.dock::before`.
     * Vật lý phóng đại: Nút tĩnh kích thước `h-9 w-9` (36px), không có hiệu ứng phóng đại kế cận (`scale(1.75)`, `scale(1.42)`, `scale(1.04)`) và không có nhấc bổng khi click (`translateY(-8px)`).
     * Cấu trúc: Các nút bị chia cắt trong 4 thẻ `div` con riêng biệt (`flex items-center gap-1 p-1 rounded-2xl bg-white/[0.04]`), triệt tiêu khả năng kích hoạt CSS sibling combinators (`+` và `:has(+)`).
     * Tooltip: Dùng `title="..."` gốc của HTML, thiếu glass tooltip mờ (`blur(18px)`) cách 14px phía trên.
     * Chấm hoạt động: Chấm đèn nhiều màu (`bg-white`, `bg-amber-400`, `bg-cyan-400`, `bg-emerald-400`) thay vì chấm ngọc trắng 3px (`.dock__dot`).

4. **Trạng thái kiểm thử hệ thống hiện tại:**
   - Lệnh `npm test` (Vitest): **52 test files passed, 466 tests passed (100% GREEN)**.
   - Lệnh `npm run type-check` (`tsc --noEmit`): **0 errors (100% CLEAN)**.
   - Các test suite E2E và Unit kiểm tra chặt chẽ 18 `data-testid` trên thanh dock (`dockbar`, `dock-btn-timer`, `dock-btn-tasks`, `dock-btn-notes`, `dock-btn-calendar`, `dock-btn-spaces`, `dock-btn-sounds`, `dock-btn-media`, `dock-btn-focus`, `dock-btn-zen`, `dock-btn-ai`, `dock-btn-presets`, `dock-quick-menu`, `dock-position-left`, v.v.).

---

## 2. LOGIC CHAIN (CHUỖI SUY LUẬN LOGIC)

1. Từ **Observation 1**: Cả `WidgetContainer.tsx` (dòng 160) và `useLayoutStore.ts` (dòng 745, 750) đều áp đặt cứng công thức `Math.max(68, y)`. Điều này khiến widget bị chặn đứng không thể kéo lên trên tọa độ `y = 68px`.
   → **Suy luận**: Để mở khóa kéo thả sát trần `y = 8px` (`top-2`), cần thay thế toàn bộ hằng số chặn `68` thành `8` trong cả 2 file trên, đồng thời đặt `minY = 8` trong `placeWidget` và cập nhật `<main>` trên desktop trong `App.tsx` từ `pt-14` thành `pt-2`.

2. Từ **Observation 2**: Người dùng vào `/app` cần sự tập trung tối đa, không cần thanh điều hướng 7 tab dàn ngang trên đỉnh. Viên nang `floating-header-capsule` đã có sẵn cơ chế State Singularity.
   → **Suy luận**: Chỉ cần bổ sung một icon `Home` nhỏ gọn vào `floating-header-capsule` (hoặc trong User dropdown và SettingsWidget) là người dùng có thể thoát về Landing Page bất cứ lúc nào mà không cần mở bung thanh Header đầy đủ, bảo toàn diện tích đỉnh màn hình.

3. Từ **Observation 3**: `DockBar.tsx` hiện tại bị xé nhỏ thành 4 div lồng nhau nên trình duyệt không thể áp dụng CSS sibling selectors (`.dock__item:hover + .dock__item` và `:has(+ .dock__item:hover)`).
   → **Suy luận**: Gom toàn bộ các nút vào chung một thẻ container `.dock__row` với các vạch ngăn cách mỏng `.dock__divider` (hoặc sibling items) sẽ kích hoạt trọn vẹn hiệu ứng phóng đại hình sin kế cận theo chuẩn `apple-liquid-dock.md`.

4. Từ **Observation 4**: Các test suite hiện hữu phụ thuộc vào chính xác các `data-testid`.
   → **Suy luận**: Khi xây dựng `FloatingDock.tsx` hoặc nâng cấp `DockBar.tsx`, chỉ cần giữ nguyên 100% các `data-testid` thì toàn bộ 466 tests và E2E specs sẽ tiếp tục pass xanh 100% mà không bị bất kỳ regression nào.

---

## 3. CAVEATS (LƯU Ý & CÁC ĐIỂM CHƯA KHẢO SÁT)

- **Không cài đặt `styled-components`:** Dự án hiện không có thư viện `styled-components` trong `package.json`. Để tuân thủ Karpathy Guidelines (giữ diff tối thiểu, không tăng bundle size), mã CSS của `apple-liquid-dock.md` nên được đưa vào `src/index.css` hoặc `src/styles/liquidDock.css` thuần túy.
- **Vị trí Dock đa chiều:** DockBar hiện có tính năng đổi vị trí sang `'left'`, `'right'`, `'top'`. Hiệu ứng phóng đại macOS được thiết kế tối ưu nhất cho vị trí đáy (`'bottom'`). Với vị trí dọc (`'left'`/`'right'`), cần đảo trục chuyển động từ `width/height` hoặc giữ nguyên transform cơ bản để tránh tràn biên màn hình.
- **Kiểm tra va chạm với Viên nang nổi:** Khi widget kéo lên `y = 8px`, nếu kéo vào góc trên cùng bên phải (`x > window.innerWidth - 200px`), widget có thể chạm vào viên nang nổi `floating-header-capsule` (`top: 12px; right: 16px; z-index: 40`). Tuy nhiên vì widget có `z-10` và capsule có `z-40`, capsule sẽ nổi lên trên mà không bị kẹt sự kiện click.

---

## 4. CONCLUSION (KẾT LUẬN & ĐỀ XUẤT HÀNH ĐỘNG)

1. **Khả thi 100%:** Việc giải phóng tọa độ kéo thả lên `y = 8px` và nâng cấp Dock macOS Liquid Glass hoàn toàn khả thi, mã nguồn sạch, cấu trúc rõ ràng và đã được cô lập chính xác đến từng dòng lệnh.
2. **Kế hoạch thực thi 3 bước cho Senior Coder:**
   - **Bước 1:** Sửa cận `Math.max(68, ...)` -> `Math.max(8, ...)` trong `src/components/WidgetContainer.tsx` (dòng 160, 224) và `src/stores/useLayoutStore.ts` (dòng 745, 750, 803, 816, 1192-1201). Cập nhật `App.tsx` dòng 355 sang `pt-2`.
   - **Bước 2:** Thêm nút Home tinh gọn vào `floating-header-capsule` trong `src/components/PlatformHeader.tsx` và trong `SettingsWidget.tsx`.
   - **Bước 3:** Tạo `src/components/FloatingDock.tsx` (hoặc tái cấu trúc `DockBar.tsx`) áp dụng trọn vẹn chất liệu Liquid Glass (gradient + specular highlight `::before`), CSS wave magnification (1.75x, 1.42x, 1.04x), glass tooltip (14px, blur 18px), và chấm trắng ngọc 3px `.dock__dot`, bảo tồn đầy đủ 100% `data-testid`.

---

## 5. VERIFICATION METHOD (PHƯƠNG PHÁP KIỂM THỬ ĐỘC LẬP)

1. **Kiểm tra Unit Test:**
   ```bash
   npm test
   ```
   *Yêu cầu:* 52/52 test files passed, 466/466 tests passed.
2. **Kiểm tra Type Check:**
   ```bash
   npm run type-check
   ```
   *Yêu cầu:* `tsc --noEmit` hoàn thành với 0 lỗi.
3. **Kiểm tra kéo thả thực tế (Visual / Interaction Inspection):**
   - Mở `/app` trên trình duyệt.
   - Kéo thẻ Pomodoro Timer lên sát mép trên cùng màn hình. Xác nhận mép trên thẻ cách đỉnh màn hình đúng 8px (`top: 8px`).
   - Rê chuột qua thanh DockBar: Xác nhận icon phóng to mượt mà 1.75x, 2 icon lân cận nở theo đường cong 1.42x và 1.04x, tooltip kính mờ hiển thị tức thì cách 14px phía trên, và chấm ngọc trắng 3px sáng mờ dưới các widget đang mở.
