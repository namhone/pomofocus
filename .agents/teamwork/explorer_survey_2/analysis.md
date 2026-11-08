# BÁO CÁO ĐIỀU TRA CHI TIẾT (SURVEY EXPLORER 2)
## CHUYÊN ĐỀ: BỐ CỤC KHÔNG GIAN /app, GIỚI HẠN KÉO THẢ SÁT TRẦN (y = 8px) & MACOS LIQUID DOCK
**Dự án:** Pomofocus v6.0 Ultimate  
**Thời gian khảo sát:** 2026-11-08T04:55:00Z  
**Phạm vi:** Mục 3 (Workspace Layout & Drag Limits) và Mục 4 (macOS Liquid Dock) theo `ORIGINAL_REQUEST.md`, `UI_UX_DESIGN_PLAYBOOK_AND_POSTMORTEM.md`, `AGENTS.md`, và `skills/pomofocus-design-system/references/apple-liquid-dock.md`.

---

## 1. TỔNG QUAN KHẢO SÁT & TRẠNG THÁI BASELINE

1. **Baseline Kiểm thử:**
   - Đã chạy toàn bộ Vitest test suite (`npm test`): **52 test files, 466 tests passed (100% GREEN)**.
   - Đã kiểm tra biên dịch TypeScript (`npm run type-check` / `tsc --noEmit`): **0 type errors (100% CLEAN)**.
2. **Nguyên tắc cốt lõi khi thực thi:**
   - Giữ vững 100% các `data-testid` hiện hành trên DockBar và Workspace để không gây bất kỳ hồi quy (regression) nào cho hệ thống 52 test suites và Playwright E2E tests.
   - Tuyệt đối không cài đặt thêm thư viện nặng (như `styled-components`), tận dụng 100% Tailwind CSS + Pure CSS trong `src/index.css` hoặc CSS module để đạt hiệu năng 60/120fps chuẩn Karpathy Guidelines.

---

## 2. ĐIỀU TRA MỤC 3: BỐ CỤC KHÔNG GIAN /app & GIẢI PHÓNG KÉO THẢ SÁT TRẦN (y = 8px)

### 2.1. Hiện trạng giới hạn tọa độ đỉnh (Top Clearance Limit)
Trong mã nguồn hiện tại, giới hạn đỉnh không nằm ở một con số ngẫu nhiên mà được áp đặt ở **3 vị trí then chốt**:

#### Vị trí 1: `src/components/WidgetContainer.tsx` (Dòng 159-161 và 223-225)
- **Dòng 159-161 (Khi kéo thả - Pointer Move):**
  ```tsx
  targetX = Math.max(0, Math.min(snappedX, maxX));
  targetY = Math.max(68, Math.min(snappedY, maxY)); // ❌ Bị ép y >= 68px
  ```
- **Dòng 223-225 (Khi co giãn kích thước từ cạnh trên - North Resize):**
  ```tsx
  const screenMaxH = Math.max(minH, window.innerHeight - (north ? 50 : start.startY) - 12);
  ```
  *(Khi người dùng kéo cạnh trên của widget lên, hàm resize giả định trần cố định là 50px).*

#### Vị trí 2: `src/stores/useLayoutStore.ts` (Dòng 745, 750, 803, 816, 108, 159-281, 1192-1201)
- **Dòng 744-750 (Trong hàm `updateWidgetPosition`):**
  ```ts
  let targetX = Math.round(x);
  let targetY = Math.max(68, Math.round(y)); // ❌ Giới hạn y >= 68px

  // Magnetic Snapping (8px threshold)
  const SNAP = 8;
  if (Math.abs(targetX) < SNAP) targetX = 0;
  if (Math.abs(targetY - 68) < SNAP) targetY = 68; // ❌ Hút dính vào mốc 68px
  ```
- **Dòng 803-808 (Trong hàm `placeWidget`):**
  ```ts
  const minX = 0;
  const minY = 0;
  let nextY = Math.max(minY, Math.min(Math.round(y), maxY));
  ```
  *(Tại đây `minY = 0`, nhưng do `updateWidgetPosition` ép 68 nên widget không bao giờ chạm được dải `0 < y < 68`).*
- **Dòng 108 (Trong `computeBalancedDefaultLayout`):**
  ```ts
  const topY = 76; // Tọa độ y mặc định khi reset layout
  ```
- **Dòng 159, 175, 191 (Trong `DEFAULT_WIDGETS`):**
  `timer.y = 76`, `tasks.y = 76`, `notes.y = 76`, `calendar.y = 75`, `spaces.y = 75`, `sounds.y = 70`, `settings.y = 65`.
- **Dòng 1192-1201 (Trong `clampWidgetsToViewport`):**
  ```ts
  const maxAllowedY = Math.max(0, viewportHeight - activeHeight);
  if (w.y > maxAllowedY) { w.y = maxAllowedY; changed = true; }
  if (w.y < 0) { w.y = 0; changed = true; }
  ```

#### Vị trí 3: `src/App.tsx` (Dòng 355)
- **Bố cục container `<main>` desktop:**
  ```tsx
  <main className="fixed inset-0 pointer-events-none w-screen h-screen z-10 overflow-visible pt-14 pb-28">
  ```
  *Lớp đệm `pt-14` (56px) là tàn dư từ thời Header thanh lớn luôn chiếm đỉnh màn hình.*

---

### 2.2. Giải pháp kỹ thuật giải phóng giới hạn kéo thả lên `y = 8px` (top-2)

1. **Cập nhật `src/stores/useLayoutStore.ts`:**
   - Đổi cận dưới `targetY` trong `updateWidgetPosition`:
     ```ts
     // TRƯỚC:
     let targetY = Math.max(68, Math.round(y));
     if (Math.abs(targetY - 68) < SNAP) targetY = 68;

     // SAU (Cho phép kéo sát trần y = 8px):
     let targetY = Math.max(8, Math.round(y));
     if (Math.abs(targetY - 8) < SNAP) targetY = 8;
     ```
   - Trong `placeWidget`: Đặt `minY = 8;` và cập nhật logic hút dính mép trên:
     ```ts
     const minY = 8;
     if (nextY - minY < EDGE_SNAP) nextY = minY;
     ```
   - Trong `clampWidgetsToViewport`: Đảm bảo widget không trôi lên sát trên `8px`:
     ```ts
     if (w.y < 8) {
       w.y = 8;
       changed = true;
     }
     ```
2. **Cập nhật `src/components/WidgetContainer.tsx`:**
   - Đổi cận dưới trong `handlePointerMoveHeader` (dòng 160):
     ```tsx
     // TRƯỚC:
     targetY = Math.max(68, Math.min(snappedY, maxY));

     // SAU:
     targetY = Math.max(8, Math.min(snappedY, maxY));
     ```
   - Cập nhật hàm resize north (dòng 224):
     ```tsx
     // TRƯỚC:
     const screenMaxH = Math.max(minH, window.innerHeight - (north ? 50 : start.startY) - 12);

     // SAU:
     const screenMaxH = Math.max(minH, window.innerHeight - (north ? 8 : start.startY) - 12);
     ```
3. **Cập nhật `src/App.tsx` (Dòng 355):**
   - Đổi `pt-14` thành `pt-2` (8px) trên Desktop `<main>`:
     ```tsx
     <main className="fixed inset-0 pointer-events-none w-screen h-screen z-10 overflow-visible pt-2 pb-28">
     ```
4. **Cập nhật Test suite `tests/unit/layoutAndZen.test.ts` (Dòng 121):**
   - Kiểm tra `clampedNotes.y` tương thích với cận mới `y >= 8`.

---

### 2.3. Điều hướng Home ("Về Trang Chủ") tại `/app`
- **Vấn đề thực tế:** Tại `/app`, người dùng vào để tập trung học tập sâu. Thanh menu điều hướng dài dòng chứa 7 tab (`/billing`, `/rooms`, `/calendar`, `/dashboard`, `/help`, `/contact`) chiếm hết chiều ngang và làm rối mắt.
- **Giải pháp bố cục tối giản (Zen Minimalist Navigation):**
  1. **Trên Floating Header Capsule (`floating-header-capsule` - Dòng 268-364 trong `PlatformHeader.tsx`):**
     - Đang có: Avatar (24px) + ⚡ Credits + ⚙️ Cài đặt + ▾ Menu.
     - Bổ sung một icon Home tinh tế thu nhỏ:
       ```tsx
       <button
         type="button"
         data-testid="capsule-home-btn"
         onClick={() => handleNavigate('/')}
         className="p-1 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition cursor-pointer shrink-0 active:scale-95"
         title="Về Trang Chủ PomoFocus (Landing Page)"
         aria-label="Về Trang Chủ"
       >
         <Home size={14} className="shrink-0" />
       </button>
       ```
  2. **Trong User Dropdown & Guest Menu (`PlatformHeader.tsx`):**
     - Thêm mục "🏠 Về Trang Chủ (Trang giới thiệu)" lên đầu danh sách điều hướng.
  3. **Trong `SettingsWidget.tsx`:**
     - Bổ sung nút bấm nhanh "🏠 Về Trang Chủ" ở khu vực Điều hướng hoặc chân trang Cài đặt.
  4. **Quy tắc State Singularity:** Khi ở `/app`, mặc định `isHeaderExpanded` luôn là `false` (chỉ hiển thị viên nang nổi góc phải), giải phóng 100% diện tích đỉnh cho người dùng tự do bố trí widget.

---

## 3. ĐIỀU TRA MỤC 4: THANH DOCKBAR MACOS LIQUID GLASS CHUẨN MẪU

### 3.1. Đối chiếu hiện trạng `src/components/DockBar.tsx` với chuẩn `apple-liquid-dock.md`

| Tiêu chuẩn kỹ thuật | Mẫu chuẩn macOS Liquid Dock (`apple-liquid-dock.md`) | Hiện trạng `DockBar.tsx` | Đánh giá & Yêu cầu cải tạo |
| :--- | :--- | :--- | :--- |
| **Vật liệu Liquid Glass** | - `-webkit-backdrop-filter: blur(20px) saturate(150%)`<br/>- Nền gradient sâu: `linear-gradient(180deg, rgba(255,255,255,0.13), rgba(255,255,255,0.05)), rgba(30, 30, 35, 0.75)`<br/>- Specular highlight vi mô `.dock::before` (lớp phản xạ sáng 45% chiều cao đỉnh). | - `bg-[rgba(14,17,25,0.78)]`<br/>- `backdrop-blur-3xl`<br/>- Viền Tailwind đơn giản `border-white/10`.<br/>- Không có lớp `.dock::before` specular highlight. | **Chưa đạt**. Cần áp dụng chuẩn gradient titan tối và specular highlight `::before`. |
| **Vật lý Phóng đại (Magnification Physics)** | - Hover icon chính: phóng to `scale(1.75)` (hoặc `--max: 1.75`).<br/>- Icon liền kề 1 nấc: phóng to `1 + (max - 1) * 0.56` (`scale(1.42)`).<br/>- Icon liền kề 2 nấc: khẽ nảy `1 + (max - 1) * 0.05` (`scale(1.04)`).<br/>- Nhấn giữ (Active): nhấc bổng lên `translateY(-8px)`. | - Nút tĩnh kích thước cố định `h-9 w-9` (36x36px).<br/>- Hiệu ứng click thụt lùi `active:scale-[0.97]` thô sơ.<br/>- Không có hiệu ứng phóng đại kế cận kiểu macOS. | **Thiếu hoàn toàn**. Cần chuyển đổi sang hệ thống CSS wave biến đổi độ rộng/cao hoặc CSS variables `:has(+)`. |
| **Tooltip Thủy Tinh (Glass Tooltip)** | - Nổi phía trên dock 14px.<br/>- Hiệu ứng `scale(0.92) -> scale(1)` kết hợp `backdrop-filter: blur(18px) saturate(160%)`.<br/>- Màu gradient mờ sang trọng, viền mỏng. | - Sử dụng thuộc tính HTML gốc `title="..."`.<br/>- Trình duyệt hiện tooltip đen vuông thô và bị trễ (delay 1s). | **Chưa đạt**. Cần thay bằng `.dock__tooltip` kính mờ nổi tức thì khi hover. |
| **Chấm chỉ báo trạng thái (.dock__dot)** | - Chấm tròn 3px trắng ngọc (`rgba(255, 255, 255, 0.95)`).<br/>- Hào quang mờ `box-shadow: 0 0 6px rgba(255, 255, 255, 0.75)`.<br/>- Hiển thị duy nhất khi thẻ widget đang mở trên bàn làm việc. | - Chấm chấm màu không đồng nhất (trắng, vàng, xanh cyan, ngọc bích).<br/>- Kích thước không cố định theo tỷ lệ dock. | **Cần chuẩn hóa**. Đổi toàn bộ sang chấm trắng ngọc 3px chuẩn macOS Dock. |
| **Cấu trúc Sibling Container** | - Toàn bộ các icon nằm chung trong một hàng duy nhất `.dock__row` để các CSS selector `+` và `:has(+)` hoạt động liền mạch xuyên suốt. | - Chia tách thành 4 khối `div` con riêng biệt (`Nhóm 1, 2, 3, 4`) bị ngăn cách bởi `<div className="h-5 w-px bg-white/10" />`. | **Khuyết tật cấu trúc**. Việc lồng trong 4 `div` con chặn đứng hoàn toàn hiệu ứng sóng lan tỏa kế cận. |
| **Responsive Sizing** | - Desktop: 60px (hoặc 56px).<br/>- Tablet: 48px, `--max: 1.4`.<br/>- Mobile: 40px (hoặc chuyển sang `MobileBottomNav`). | - Kích thước cố định `w-9 h-9` cho mọi màn hình desktop/tablet. | **Cần bổ sung responsive clamp**. |

---

### 3.2. Bảng Danh mục Thành phần & Test ID Bắt buộc Bảo toàn

Để bảo đảm 100% test suites (52 test files) không bị hỏng, các `data-testid` sau đây **bắt buộc phải hiện diện đầy đủ** trên thanh Dock mới:

```tsx
// Container chính:
data-testid="dockbar"

// Các nút tương ứng từng tính năng:
1. Đồng hồ Pomodoro:      data-testid="dock-btn-timer"
2. Danh sách Công việc:    data-testid="dock-btn-tasks"
3. Ghi chú Nhanh:          data-testid="dock-btn-notes"
4. Lịch biểu Sự kiện:      data-testid="dock-btn-calendar"
5. Kho Không Gian Nền:     data-testid="dock-btn-spaces"
6. Bảng Âm Thanh Ambient:  data-testid="dock-btn-sounds"
7. Trình phát Media:       data-testid="dock-btn-media"
8. Chế độ Tập trung Focus: data-testid="dock-btn-focus"
9. Chế độ Toàn màn hình Zen: data-testid="dock-btn-zen"
10. Trợ lý AI Companion:    data-testid="dock-btn-ai"
11. Bảng Cài đặt & Bố cục: data-testid="dock-btn-presets"

// Các phần tử trong Popover Bố cục:
- Popover container:        data-testid="dock-quick-menu"
- Đổi vị trí Dock:          data-testid="dock-position-left", data-testid="dock-position-bottom"
- Tự động ẩn Dock:          data-testid="toggle-dock-auto-hide"
- Nút Hiện lại Dock:        data-testid="dock-reveal"
- Khôi phục bố cục:         data-testid="dock-btn-reset-layout"
- Chế độ chỉnh sửa tự do:   data-testid="dock-btn-edit-layout"
```

---

### 3.3. Kiến trúc CSS Pure-Wave (Không cần thư viện ngoài)

Thay vì dùng `styled-components`, Senior Coder có thể tích hợp trực tiếp CSS Liquid Dock vào `src/index.css` (hoặc tạo `src/styles/liquidDock.css`):

```css
/* ========================================================================= */
/* APPLE LIQUID DOCK SPECIFICATION (macOS Magnification Physics)            */
/* ========================================================================= */

.dock-stage {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
  overflow: visible;
}

.dock {
  --s: 52px;
  --max: 1.75;
  --gap: max(4px, calc(var(--s) * 0.08));
  --pad: max(8px, calc(var(--s) * 0.12));

  position: relative;
  display: inline-flex;
  padding: var(--pad) calc(var(--pad) - var(--gap) / 2);
  background: linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.13),
      rgba(255, 255, 255, 0.05)
    ),
    rgba(30, 30, 35, 0.75);
  -webkit-backdrop-filter: blur(20px) saturate(150%);
  backdrop-filter: blur(20px) saturate(150%);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: max(16px, calc(var(--s) * 0.4));
  box-shadow:
    0 max(4px, calc(var(--s) * 0.1)) max(20px, calc(var(--s) * 0.4)) rgba(0, 0, 0, 0.4),
    0 max(2px, calc(var(--s) * 0.05)) max(8px, calc(var(--s) * 0.2)) rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.18),
    inset 0 -1px 0 rgba(0, 0, 0, 0.25);
  isolation: isolate;
  user-select: none;
}

/* Lớp phản xạ Specular Highlight 45% */
.dock::before {
  content: "";
  position: absolute;
  top: 1px;
  left: 1px;
  right: 1px;
  height: 45%;
  border-radius: max(14px, calc(var(--s) * 0.38)) max(14px, calc(var(--s) * 0.38)) 45% 45%;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0));
  pointer-events: none;
  z-index: 0;
}

.dock__row {
  display: flex;
  align-items: flex-end;
  height: var(--s);
  width: 100%;
}

.dock__divider {
  width: 1px;
  height: calc(var(--s) * 0.55);
  margin: 0 calc(var(--gap) / 2);
  align-self: center;
  background-color: rgba(255, 255, 255, 0.12);
  flex-shrink: 0;
}

.dock__item {
  --k: 1;
  position: relative;
  flex: none;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  width: calc(var(--s) * var(--k) + var(--gap));
  height: calc(var(--s) * var(--k));
  padding: 0 calc(var(--gap) / 2);
  cursor: pointer;
  z-index: 10;
  transform-origin: bottom center;
  transition:
    width 0.2s ease-out,
    height 0.2s ease-out,
    transform 0.2s ease-out;
}

/* Hiệu ứng Phóng đại Liền kề theo đường cong Cosine */
.dock__item:hover {
  --k: var(--max);
  z-index: 18;
}

.dock__item:hover + .dock__item,
.dock__item:has(+ .dock__item:hover) {
  --k: calc(1 + (var(--max) - 1) * 0.56);
  z-index: 15;
}

.dock__item:hover + .dock__item + .dock__item,
.dock__item:has(+ .dock__item + .dock__item:hover) {
  --k: calc(1 + (var(--max) - 1) * 0.05);
}

/* Hiệu ứng nhấc bổng khi click giữ */
.dock__item:active {
  transform: translateY(max(-8px, calc(var(--s) * -0.15)));
  transition-duration: 0.15s;
}

/* Biểu tượng nội bộ của từng Item */
.dock__icon {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: max(10px, calc(var(--s) * 0.22));
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #e4e4e7;
  transition: all 0.2s ease-out;
}

.dock__item:hover .dock__icon {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.25);
  color: #ffffff;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.35);
}

/* Chấm đèn hoạt động (.dock__dot) */
.dock__dot {
  position: absolute;
  bottom: max(-3px, calc(var(--s) * -0.06));
  left: 50%;
  transform: translateX(-50%);
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.95);
  box-shadow: 0 0 6px rgba(255, 255, 255, 0.75), 0 1px 3px rgba(0, 0, 0, 0.35);
  pointer-events: none;
}

/* Tooltip Thủy tinh mờ nổi phía trên 14px */
.dock__tooltip {
  position: absolute;
  left: 50%;
  bottom: calc(100% + 14px);
  transform: translateX(-50%) translateY(6px) scale(0.92);
  transform-origin: bottom center;
  padding: 6px 10px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 8px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.04)), rgba(20, 20, 25, 0.92);
  color: rgba(255, 255, 255, 0.98);
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.12);
  -webkit-backdrop-filter: blur(18px) saturate(160%);
  backdrop-filter: blur(18px) saturate(160%);
  transition:
    opacity 160ms ease,
    visibility 160ms ease,
    transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1);
  z-index: 100;
}

.dock__item:hover .dock__tooltip {
  opacity: 1;
  visibility: visible;
  transform: translateX(-50%) translateY(0) scale(1);
}

@media (max-width: 767px) {
  .dock {
    --s: 44px;
    --max: 1.35;
  }
}

@media (prefers-reduced-motion: reduce) {
  .dock,
  .dock__item,
  .dock__tooltip {
    transition: none !important;
  }
}
```

---

## 4. KẾ HOẠCH BÀN GIAO THỰC THI (ACTIONABLE STEPS CHO SENIOR CODER)

1. **Bước 1 — Tháo dỡ giới hạn kéo thả `y = 8px`:**
   - Cập nhật `src/stores/useLayoutStore.ts`: Thay `Math.max(68, ...)` bằng `Math.max(8, ...)`. Cập nhật `minY = 8` trong `placeWidget` và `clampWidgetsToViewport`.
   - Cập nhật `src/components/WidgetContainer.tsx`: Thay `Math.max(68, ...)` và `north ? 50` bằng `8`.
   - Cập nhật `src/App.tsx`: Đổi `<main>` padding-top trên desktop thành `pt-2`.
2. **Bước 2 — Thu gọn điều hướng Home:**
   - Bổ sung icon `Home` vào `floating-header-capsule` trong `src/components/PlatformHeader.tsx`.
   - Bổ sung nút quay về Trang Chủ trong User dropdown và `SettingsWidget.tsx`.
3. **Bước 3 — Tạo component `FloatingDock.tsx` hoặc nâng cấp `DockBar.tsx`:**
   - Tạo `src/components/FloatingDock.tsx` theo chuẩn Apple Liquid Dock.
   - Giữ nguyên toàn bộ `data-testid` để tương thích 100% với các test suite hiện có.
   - Thêm CSS Liquid Dock vào `src/index.css`.
   - Trong `src/App.tsx`, import và sử dụng `FloatingDock` (hoặc alias qua `DockBar.tsx`).
4. **Bước 4 — Chạy kiểm thử xác nhận:**
   - Chạy `npm test` để xác nhận 52/52 test files tiếp tục đạt 100% GREEN.
   - Chạy `npm run type-check` xác nhận 0 lỗi TypeScript.
