# Phân Tích Kiến Trúc & Kỹ Thuật: Feature 5 — Compact Home Navigation Tuck-In (Milestone 2)

**Agent**: Explorer M2-2  
**Milestone**: M2 (Workspace Top Clearance & AI Collision Resolution)  
**Tài liệu tham chiếu**:
- `ORIGINAL_REQUEST.md` (Mục 3: Giải phóng diện tích đỉnh tại `/app` & kéo thả sát trần y=8px)
- `PROJECT.md` (Mục 2 & Interface Contracts: Feature 5 & Z-Index Layer Hierarchy)
- `docs/UI_UX_DESIGN_PLAYBOOK_AND_POSTMORTEM.md` (Nguyên tắc 1: Z-Index Layer Hierarchy, Nguyên tắc 4: Dynamic Layout Flow)

---

## 1. Bối Cảnh Thực Tế & Đặt Vấn Đề

Tại đường dẫn `/app` (Workspace làm việc chính của PomoFocus), người dùng truy cập với mục đích tối cao là tập trung học tập, ghi chép và bấm giờ Pomodoro.
Tuy nhiên, nếu thanh điều hướng đầy đủ 7 tab ngang (`platform-unified-header`, cao 56px / `h-14`) hiển thị thường trực, nó sẽ:
1. Chiếm dụng vĩnh viễn 56px phía trên cùng màn hình, ép các widget làm việc phải lùi xuống `pt-14 sm:pt-16`, gây chật chội và che mất hình nền 4K thư giãn.
2. Vi phạm nguyên tắc **State Singularity** và **Zen Minimalism** được quy định trong `UI_UX_DESIGN_PLAYBOOK_AND_POSTMORTEM.md`.

Do đó, kiến trúc chuẩn mực yêu cầu:
- Tại `/app`, giao diện mặc định **thu gọn 100% thanh điều hướng đầy đủ** (`isHeaderExpanded = false`).
- Chỉ hiển thị duy nhất **viên nang kính mờ nổi** (`floating-header-capsule`) tại góc phải trên cùng (`top-3 right-4 sm:right-6 z-40`).
- Để người dùng vẫn có thể dễ dàng quay trở lại trang chủ giới thiệu (`/`) hoặc mở các trang tính năng khác, cần tích hợp **lối thoát Home kín đáo, tối giản** tại:
  1. Ngay trên viên nang nổi `floating-header-capsule`: một icon `Home` nhỏ gọn 14px (`data-testid="capsule-home-btn"`).
  2. Trong User Dropdown Menu (`data-testid="header-user-dropdown"`): mục "Trang Chủ PomoFocus" (`data-testid="header-user-home-btn"`).
  3. Trong thẻ Cài đặt hệ thống `SettingsWidget.tsx`: thẻ lối tắt điều hướng nhanh "Về Trang Chủ" (`data-testid="settings-home-btn"`).
  4. Trong Menu tiện ích dành cho Khách `guest-quick-menu-modal`: mục "Về Trang Chủ" (`data-testid="guest-menu-home-btn"`).

---

## 2. Khảo Sát Hiện Trạng & Phát Hiện Trọng Tâm (Evidence Chain)

### A. Khảo sát `src/components/PlatformHeader.tsx`
- **Tọa độ & Cấu trúc viên nang (`floating-header-capsule`)**:
  - Dòng 266-364: Nằm ở `fixed top-3 right-4 sm:right-6 z-40`.
  - Hiển thị khi `isWorkspace && !isHeaderExpanded`.
  - Hiện có 4 phần tử con:
    1. Avatar button: `data-testid="capsule-avatar-btn"` (Dòng 281), `aria-label="Tài khoản và Menu"`.
    2. Credits badge: `data-testid="capsule-credits-btn"` (Dòng 316), `aria-label="Số dư AI Credits"`.
    3. Settings button: `data-testid="capsule-settings-btn"` (Dòng 333), `aria-label="Cài đặt"`.
    4. Menu expand button: `data-testid="capsule-expand-btn"` (Dòng 354), `aria-label="Mở menu"`.
  - **Thiếu sót**: Chưa có icon/nút Home trên viên nang. Muốn về Trang Chủ, người dùng phải bấm "Menu ▾" để bung toàn bộ Header lớn, sau đó mới bấm logo PomoFocus.

- **Khảo sát User Dropdown Menu (`header-user-dropdown`)**:
  - Dòng 604-732: Chứa các lối tắt:
    - `header-user-app-btn` (Dòng 608): điều hướng đến `/app` ("Không Gian Học").
    - `header-user-rooms-btn` (Dòng 621): điều hướng đến `/rooms`.
    - `header-user-billing-btn` (Dòng 634): điều hướng đến `/billing`.
    - `header-user-profile-btn` (Dòng 649): điều hướng đến `/profile`.
    - `header-user-settings-btn` (Dòng 659): mở SettingsWidget.
  - **Thiếu sót**: Không có nút nào dẫn trực tiếp về Trang Chủ (`/`).

- **Khảo sát Guest Quick Menu (`guest-quick-menu-modal`)**:
  - Dòng 1038-1153: Menu popup mở khi khách bấm vào avatar khách trên viên nang.
  - Chứa: Đăng Nhập / Đăng Ký, Bảng Giá PRO, Cài Đặt Giao Diện.
  - **Thiếu sót**: Không có lối thoát về Trang Chủ (`/`).

- **Khảo sát trạng thái mặc định của Header tại `/app`**:
  - `useLayoutStore.ts` dòng 499: `isHeaderExpanded: false`.
  - Khi điều hướng qua `handleNavigate(path)`: dòng 231 gọi `setHeaderExpanded(false)`.
  - **Rủi ro tiềm ẩn**: Chưa có `useEffect` đồng bộ đường dẫn để cưỡng chế `setHeaderExpanded(false)` khi người dùng truy cập trực tiếp URL `/app` hoặc điều hướng qua browser back/forward (nếu `isHeaderPinned !== true`).

### B. Khảo sát `src/components/SettingsWidget.tsx`
- Dòng 77-552: Thẻ cài đặt hiển thị trong Workspace làm việc.
- Chứa:
  - Account Status Card (Dòng 83-134).
  - Button Chế độ chỉnh sửa bố cục (Dòng 139-160).
  - Section 1: Glassmorphism (Dòng 162-238).
  - Section 2-5: Layout presets, Dock position, Timer settings, Persistence status.
  - Section 6: Khôi phục bố cục mặc định (Dòng 501-549).
- **Thiếu sót**: Hoàn toàn thiếu lối tắt điều hướng nhanh về Trang Chủ (`/`), làm người dùng bị "mắc kẹt" trong Workspace nếu không muốn mở Header lớn.

### C. Khảo sát Ràng Buộc Kiểm Thử (Tests & WCAG)
- `tests/unit/wcagAccessibilityAudit.test.ts`:
  - Dòng 10-13: Kiểm tra trực tiếp file `src/components/PlatformHeader.tsx`:
    `expect(headerContent).toContain('data-testid="capsule-avatar-btn"');`
    `expect(headerContent).toContain('aria-label="Tài khoản và Menu"');`
    `expect(headerContent).toContain('data-testid="capsule-credits-btn"');`
    `expect(headerContent).toContain('aria-label="Số dư AI Credits"');`
  - Bắt buộc: Tất cả các nút mới (như `capsule-home-btn`, `settings-home-btn`) phải có thuộc tính `aria-label` và `title` hợp lệ theo chuẩn WCAG 2.1 AA.
- `tests/e2e/tier1_feature_coverage.test.ts`:
  - Dòng 113-119: Kiểm tra Feature 5 (M2):
    `expect(headerCode).toContain('data-testid="floating-header-capsule"');`
    `expect(headerCode).toContain('data-testid="platform-unified-header"');`
- Hiện tại toàn bộ 58 file test (540 test cases) và `tsc --noEmit` đang đạt 100% xanh. Bất kỳ thay đổi nào cũng phải bảo toàn 100% pass rate.

---

## 3. Đề Xuất Giải Pháp Kỹ Thuật (Surgical Specification)

### Giải pháp 1: Bổ sung Discreet Home Button trên `floating-header-capsule`
- Vị trí: Đặt giữa `capsule-credits-btn` và `capsule-settings-btn`.
- Thuộc tính:
  - `data-testid="capsule-home-btn"`
  - `aria-label="Về Trang Chủ"`
  - `title="Về Trang Chủ (Home)"`
  - Style: `p-1 rounded-full hover:bg-white/10 text-zinc-300 hover:text-white transition cursor-pointer shrink-0 active:scale-95`
  - Icon: `<Home size={14} className="shrink-0" />`
  - Hành động: `onClick={() => handleNavigate('/')}`

### Giải pháp 2: Khóa cứng trạng thái `isHeaderExpanded = false` mặc định tại `/app`
- Trong `PlatformHeader.tsx`:
  Bổ sung hook đồng bộ route:
  ```tsx
  useEffect(() => {
    if (isWorkspace && !isHeaderPinned) {
      setHeaderExpanded(false);
    }
  }, [isWorkspace, isHeaderPinned, setHeaderExpanded]);
  ```
- Trong `src/stores/useLayoutStore.ts`:
  - Giữ vững khởi tạo `isHeaderExpanded: false` (dòng 499).
  - Trong hàm `resetLayout()`, thiết lập rõ ràng:
    ```ts
    isHeaderExpanded: false,
    isMobileHeaderOpen: false
    ```

### Giải pháp 3: Bổ sung Home Shortcut trong User Dropdown Menu
- Vị trí: Đặt đầu danh sách điều hướng nhanh trong `header-user-dropdown`.
- Thuộc tính:
  - `data-testid="header-user-home-btn"`
  - Icon: `<Home size={14} className="text-teal-400 shrink-0" />`
  - Nhãn: `Trang Chủ (Giới thiệu)`
  - Active dot: `{currentPath === '/' && <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />}`
  - Hành động: `onClick={() => handleNavigate('/')}`
- Đồng thời cập nhật `header-user-app-btn` ("Không Gian Học") chuyển icon sang `<Layout size={14} className="text-emerald-400 shrink-0" />` để phân biệt rõ ràng với Trang Chủ.

### Giải pháp 4: Bổ sung Home Shortcut trong `SettingsWidget.tsx`
- Vị trí: Đặt ngay phía dưới Account Status Card (trước nút "Chế độ Chỉnh sửa bố cục").
- Thuộc tính:
  - Container: Thẻ card kính mờ `p-2.5 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-between gap-2.5`.
  - Icon: `<Home size={14} className="text-teal-400" />` bọc trong rounded box `w-7 h-7 bg-teal-500/15 border border-teal-500/30`.
  - Nút bấm:
    - `data-testid="settings-home-btn"`
    - `aria-label="Về Trang Chủ"`
    - `title="Về Trang Chủ PomoFocus"`
    - Nhãn: `<span>Trang Chủ</span>` kèm `<ArrowRight size={11} className="text-neutral-400" />`.
    - Hành động: `onClick={() => router.navigate('/')}`.

### Giải pháp 5: Bổ sung Home Shortcut trong Guest Quick Menu
- Vị trí: Trong `guest-quick-menu-modal` của `PlatformHeader.tsx`.
- Thuộc tính:
  - `data-testid="guest-menu-home-btn"`
  - Icon: `<Home size={18} />` bọc trong `bg-indigo-500/20 text-indigo-300`.
  - Nhãn: `Về Trang Chủ`, mô tả: `Tìm hiểu tính năng, phương pháp Pomodoro & cộng đồng`.
  - Hành động: `onClick={() => { setIsGuestMenuOpen(false); handleNavigate('/'); }}`.

---

## 4. Kế Hoạch Kiểm Thử Bổ Sung (Test Expectations)
1. Thêm test assertion vào `tests/unit/wcagAccessibilityAudit.test.ts`:
   - `expect(headerContent).toContain('data-testid="capsule-home-btn"');`
   - `expect(headerContent).toContain('aria-label="Về Trang Chủ"');`
2. Thêm test assertion vào `tests/e2e/tier1_feature_coverage.test.ts`:
   - `expect(headerCode).toContain('data-testid="capsule-home-btn"');`
   - `expect(headerCode).toContain('data-testid="header-user-home-btn"');`
3. Thêm test suite mới `tests/unit/compactHomeNavigation.test.ts`:
   - Kiểm tra PlatformHeader render `floating-header-capsule` với `capsule-home-btn`.
   - Kiểm tra `SettingsWidget` chứa `settings-home-btn` dẫn về route `'/'`.
   - Kiểm tra `isHeaderExpanded` giữ giá trị `false` mặc định tại `/app`.
