# BÁO CÁO BÀN GIAO KỸ THUẬT: TOPBAR & NÚT BACK CÁC MÀN HÌNH PHỤ (M1)

**Tên Agent**: Explorer M1-2  
**Milestone**: M1 — APK Navigation Shell & 100% Web Isolation  
**Người nhận (Recipient)**: Orchestrator P2 (`cf5bc11e-435c-4f27-a55e-a32f3bebfefa`) & Worker M1  
**Tình trạng bàn giao**: Hard Handoff (Hoàn tất 100% mục tiêu điều tra, đã sẵn sàng cho Worker M1 triển khai)  
**Tệp đính kèm phân tích chi tiết**: `d:\FileCuaNam\Web'\Pomodoro\.agents\teamwork\explorer_m1_2\analysis.md`

---

## 1. OBSERVATION (QUAN SÁT TRỰC TIẾP TỪ MÃ NGUỒN)

1. **Khảo sát 11 màn hình phụ trong `src/`**:
   - `src/components/LegalViews.tsx`: Dòng 28 gắn `<PlatformHeader />`, dòng 268 gắn `<SharedFooter />`. Dòng 72-76 nút quay lại mang class `hidden sm:flex`:
     ```tsx
     <button
       type="button"
       onClick={() => router.navigate('/app')}
       className="text-xs text-zinc-400 hover:text-white transition flex items-center gap-1 cursor-pointer whitespace-nowrap hidden sm:flex"
     >
       <span>Vào Không Gian</span>
       <span>→</span>
     </button>
     ```
     Trên màn hình di động (< 640px) và trong APK, nút này bị ẩn hoàn toàn, không có lối thoát.
   - `src/components/BillingView.tsx`: Dòng 188 gắn `<PlatformHeader />`, dòng 1277 gắn `<SharedFooter />`. Dòng 193-202 có nút inline `data-testid="billing-back-btn"` nhưng bị `PlatformHeader` đè lên trên mobile.
   - `src/components/ProfileView.tsx`: Dòng 78 & 284 gắn `<PlatformHeader />`, dòng 103 & 814 gắn `<SharedFooter />`. Nhánh chưa đăng nhập (dòng 75-106) hoàn toàn không có nút quay lại ngoài việc bấm nút đăng nhập.
   - `src/components/SettingsView.tsx`: Dòng 137 gắn `<PlatformHeader />`, dòng 545 gắn `<SharedFooter />`. Dòng 180 có nút quay lại nhưng text bị ẩn `hidden sm:inline`.
   - `src/components/DashboardView.tsx`: Dòng 251 gắn `<PlatformHeader />`, dòng 486 gắn `<SharedFooter />`. Dòng 270 có nút "Mở Không Gian Học" đặt trong hàng tiêu đề nhưng thiếu TopBar native.
   - `src/components/DedicatedCalendarView.tsx`: Dòng 163 gắn `<PlatformHeader />`, dòng 552 gắn `<SharedFooter />`. **Toàn bộ 556 dòng mã KHÔNG CÓ BẤT KỲ NÚT QUAY LẠI NÀO (0 back button)**.
   - `src/components/StudyRoomLobby.tsx`: Dòng 291 gắn `<PlatformHeader />`, dòng 1075 gắn `<SharedFooter />`. **Toàn bộ 1079 dòng mã KHÔNG CÓ BẤT KỲ NÚT QUAY LẠI NÀO (0 back button)**.
   - `src/components/PrivacyDataView.tsx`: Dòng 171 gắn `<PlatformHeader />`, dòng 442 gắn `<SharedFooter />`. Dòng 178 có nút inline trong `<main>` với `pt-20`.
   - `src/components/AccountSecurityView.tsx`: Dòng 95 & 321 gắn `<PlatformHeader />`, dòng 111 & 1203 gắn `<SharedFooter />`. Nhánh chưa login không có nút quay lại.
   - `src/components/HelpView.tsx`: Dòng 53 gắn `<PlatformHeader />`, dòng 178 gắn `<SharedFooter />`. **Toàn bộ 182 dòng mã KHÔNG CÓ BẤT KỲ NÚT QUAY LẠI NÀO (0 back button)**.
   - `src/components/ContactView.tsx`: Dòng 46 gắn `<PlatformHeader />`, dòng 226 gắn `<SharedFooter />`. **Toàn bộ 230 dòng mã KHÔNG CÓ BẤT KỲ NÚT QUAY LẠI NÀO (0 back button)**.

2. **Khảo sát `PlatformHeader.tsx` và `SharedFooter.tsx`**:
   - `src/components/PlatformHeader.tsx`: Không hề kiểm tra `isNativeCapacitor`. Trên màn hình 390px, thanh header rộng 388px > 358px khả dụng, làm tràn 30px và cắt cụt nút hamburger menu `≡`.
   - `src/components/SharedFooter.tsx`: Không hề kiểm tra `isNativeCapacitor`. Dòng 62 chứa liên kết `Tải App Android (APK)` hiển thị ngay trong ứng dụng Android APK.

3. **Khảo sát `CookieConsentBanner.tsx` (BUG-03)**:
   - Dòng 51 không kiểm tra `isNativeCapacitor`, khiến banner cookie web hiển thị nổi ngay trên màn hình timer di động.
   - Các nút ở dòng 92, 100, 108 thiếu `whitespace-nowrap`, khiến chữ bị bẻ thành 2 hàng trên viewport hẹp.

4. **Khảo sát `App.tsx` Deep Link Router (BUG-11)**:
   - Dòng 393-404 chỉ xử lý deep link `/rooms`. Mọi deep link nội bộ khác (`pomofocus://billing`, `pomofocus://calendar`, `pomofocus://settings`, etc.) bị bỏ rơi.
   - `src/pages/NotFoundPage.tsx` dòng 84 và 94 dùng raw emoji `⏱` và `🏠`, thiếu thanh TopBar native.

5. **Kết quả kiểm tra TypeScript hiện hành**:
   - Lệnh: `npm run type-check` (`tsc --noEmit`) $\rightarrow$ **0 errors (Exit code 0)**.

---

## 2. LOGIC CHAIN (CHUỖI LẬP LUẬN TỪ QUAN SÁT ĐẾN GIẢI PHÁP)

1. Từ **Quan sát 1 & 2**: Toàn bộ 11 màn hình phụ đang bị "rò rỉ web" (Web Leakage) do tự nhúng `<PlatformHeader />` và `<SharedFooter />`. Trên mobile và APK, `PlatformHeader` bị vỡ layout, còn `SharedFooter` hiển thị nội dung vô nghĩa. Đặc biệt, 5/11 màn hình (`DedicatedCalendarView`, `StudyRoomLobby`, `HelpView`, `ContactView`, và `LegalViews` trên mobile) hoàn toàn không có nút quay lại, khiến người dùng bị kẹt 100% trong trang khi duyệt trên mobile hoặc APK.
2. Từ **Quan sát 1, 2 và quy định trong UI/UX Playbook (State Singularity & Z-Index)**:
   - Cần một component layout thống nhất: `src/components/mobile/MobileSubViewLayout.tsx`.
   - Component này áp dụng cơ chế **Dual-Morph**:
     - Khi `isMobile || isNativeCapacitor`: Render thanh `MobileTopBar` native chuẩn (cao 48px `h-12`, có `pt-safe`, nút back `←` chuẩn WCAG $\ge 44\times 44$px, tiêu đề tự co dãn, khay hành động bên phải). Đồng thời **triệt tiêu 100%** `PlatformHeader` và `SharedFooter`.
     - Khi trên Desktop Web (`!isMobile && !isNativeCapacitor`): Render `PlatformHeader` và `SharedFooter` bình thường để bảo tồn trải nghiệm desktop.
3. Từ **Quan sát 2 (Phòng vệ chiều sâu - Defense in Depth)**:
   - Để ngăn chặn mọi rò rỉ web trong tương lai, cần đặt chốt chặn tự triệt tiêu ngay đầu `PlatformHeader.tsx` và `SharedFooter.tsx`:
     `const { isNativeCapacitor } = useDeviceDetection(); if (isNativeCapacitor) return null;`
4. Từ **Quan sát 3 & 4 (BUG-03 & BUG-11)**:
   - Thêm kiểm tra `isNativeCapacitor` vào `CookieConsentBanner.tsx` và thêm `whitespace-nowrap` cho các nút bấm.
   - Cập nhật hàm `handleDeepLinkUrl` trong `App.tsx` để điều hướng chuẩn xác cho toàn bộ các route `pomofocus://...`.
   - Chuẩn hóa `NotFoundPage.tsx`: thay thế raw emoji bằng Lucide SVG icons và trang bị nút quay lại có `data-testid="404-btn-back-workspace"`.

---

## 3. CAVEATS (GIỚI HẠN & GIẢ ĐỊNH)

1. **Phạm vi quyền hạn**: Explorer M1-2 tuân thủ nghiêm ngặt nguyên tắc chỉ đọc (Read-only investigation). Không trực tiếp sửa mã nguồn `src/`. Báo cáo phân tích chi tiết và bản thiết kế kiến trúc đầy đủ đã được lập sẵn tại:
   `d:\FileCuaNam\Web'\Pomodoro\.agents\teamwork\explorer_m1_2\analysis.md`.
2. **Tương thích ngược với E2E Tests**:
   - `tests/e2e/billingAndUpgradeFlow.spec.ts` kiểm tra `page.getByTestId('billing-back-btn')`.
   - `tests/unit/zenErrorPages.test.tsx` kiểm tra `screen.getByTestId('404-btn-back-workspace')`.
   - Do đó, `MobileSubViewLayout` được thiết kế có prop `backTestId`, cho phép gán đúng testid mong đợi trên từng view, bảo đảm 100% test suite hiện hành không bị ảnh hưởng.
3. **Phân tách giữa SettingsView và MobileSettingsView**:
   - Khi route là `/settings` trên mobile / APK, `App.tsx` nên bọc và render trực tiếp `MobileSettingsView` (thay vì `SettingsView` web) bên trong `MobileSubViewLayout` để mang lại trải nghiệm cảm ứng tốt nhất.

---

## 4. CONCLUSION (KẾT LUẬN & KIẾN TRÚC ĐỀ XUẤT)

1. Thiết kế kiến trúc `MobileSubViewLayout.tsx` giải quyết triệt để 4 lỗi cốt lõi:
   - Giải quyết dứt điểm **BUG-01**: Cung cấp nút `← Quay lại` luôn hiển thị trên mobile (< 640px) và APK cho `LegalViews` và mọi màn hình phụ; xóa bỏ hiện tượng tràn 30px của hamburger menu.
   - Giải quyết dứt điểm **BUG-02**: Tách biệt 100% kiến trúc APK khỏi Web bằng cách loại bỏ hoàn toàn `PlatformHeader` và `SharedFooter` khi chạy dưới `Capacitor.isNativePlatform()`.
   - Giải quyết dứt điểm **BUG-03**: Ẩn hoàn toàn `CookieConsentBanner` trên APK và chống vỡ 2 dòng trên Web.
   - Giải quyết dứt điểm **BUG-11**: Mở rộng deep link router cho toàn bộ đường dẫn nội bộ và trang bị nút quay lại cho `NotFoundPage`.
2. Lộ trình triển khai cụ thể cho Worker M1 gồm 5 bước phẫu thuật đã được mô tả chi tiết tại Mục 5 của `analysis.md`.

---

## 5. VERIFICATION METHOD (PHƯƠNG PHÁP KIỂM CHỨNG ĐỘC LẬP)

Sau khi Worker M1 áp dụng các thay đổi:

1. **Kiểm tra kiểu dữ liệu TypeScript**:
   ```powershell
   npm run type-check
   ```
   *Kỳ vọng*: Exit code 0, 0 errors.

2. **Chạy các test suites hiện hành có liên quan**:
   ```powershell
   npx vitest run tests/unit/auditorM1ForensicEmpirical.test.tsx
   npx vitest run tests/unit/zenErrorPages.test.tsx
   npx vitest run tests/unit/v81Milestone2IdentityAndHeaderPolish.test.tsx
   npx vitest run tests/unit/wcagAccessibilityAudit.test.ts
   ```
   *Kỳ vọng*: 100% tests pass.

3. **Viết test mới `tests/unit/mobileSubViewNavigation.test.tsx` kiểm chứng 4 điều kiện**:
   - Điều kiện 1: Khi `isNativeCapacitor === true`, toàn bộ 11 màn hình phụ KHÔNG render `PlatformHeader` và `SharedFooter`.
   - Điều kiện 2: Khi màn hình < 640px, thanh `MobileTopBar` xuất hiện trên cả 11 màn hình phụ, nút `←` có touch target $\ge 44\times 44$px và khi bấm sẽ gọi `router.navigate('/app')`.
   - Điều kiện 3: `CookieConsentBanner` trả về `null` trong môi trường native APK.
   - Điều kiện 4: Deep link custom scheme `pomofocus://billing`, `pomofocus://calendar` được điều hướng chính xác.
