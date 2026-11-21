# BÁO CÁO PHÂN TÍCH CHUYÊN SÂU: KIẾN TRÚC TOPBAR & NÚT BACK CHO CÁC MÀN HÌNH PHỤ (MILESTONE M1)
**Document Reference**: `explorer_m1_2/analysis.md`  
**Milestone**: M1 — APK Navigation Shell & 100% Web Isolation  
**Agent**: Explorer M1-2  
**Đối tượng bàn giao**: Orchestrator P2 (`cf5bc11e-435c-4f27-a55e-a32f3bebfefa`) & Worker M1  
**Chế độ**: Read-Only Forensic Architecture Investigation (0 source files modified)  
**Tiêu chuẩn đối chiếu**: `docs/UI_UX_DESIGN_PLAYBOOK_AND_POSTMORTEM.md`, `docs/reports/FORENSIC_DEEP_AUDIT_REPORT.md` (BUG-01, BUG-02, BUG-03, BUG-11)

---

## 1. TỔNG QUAN VẤN ĐỀ & BỐI CẢNH KIẾN TRÚC

Trong ứng dụng PomoFocus Workspace, khi người dùng ở màn hình chính (`/app`), hệ thống có sự phân tách rõ rệt:
- **Desktop Web**: Render `PlatformHeader` (dạng capsule nổi hoặc mở rộng), các widget nổi (`TimerWidget`, `TasksWidget`, `NotesWidget`, etc.) và `DockBar`.
- **Mobile / APK**: Render `MobileAppShell` với cấu trúc Liquid Zen: thanh Top Header (`h-12` 48px), 5 tab di động (`focus`, `tasks`, `spaces`, `ai`, `settings`) và thanh `MobileBottomNav`.

Tuy nhiên, khi người dùng điều hướng sang bất kỳ tuyến đường (route) phụ nào trong 11 màn hình sau:
1. `/terms`, `/privacy`, `/about` (`src/components/LegalViews.tsx`)
2. `/billing`, `/subscription` (`src/components/BillingView.tsx`)
3. `/profile` (`src/components/ProfileView.tsx`)
4. `/settings` (`src/components/SettingsView.tsx`)
5. `/dashboard`, `/history`, `/stats` (`src/components/DashboardView.tsx`)
6. `/calendar` (`src/components/DedicatedCalendarView.tsx`)
7. `/rooms`, `/meet` (`src/components/StudyRoomLobby.tsx`)
8. `/privacy-data`, `/data` (`src/components/PrivacyDataView.tsx`)
9. `/account/security`, `/security` (`src/components/AccountSecurityView.tsx`)
10. `/help` (`src/components/HelpView.tsx`)
11. `/contact` (`src/components/ContactView.tsx`)
Cùng với `/download` (`WebDownloadHub.tsx`) và `404` (`NotFoundPage.tsx`).

Toàn bộ 11 màn hình này hiện tại **bị rò rỉ giao diện Web Desktop nguyên thủy (Web Leakage)** vào môi trường Mobile & Android APK:
- Chúng gắn cứng `<PlatformHeader />` ở đầu trang và `<SharedFooter />` ở cuối trang.
- Trên màn hình di động (< 640px): `PlatformHeader` tràn bề ngang (388px > 358px viewport), cắt cụt 30px nút hamburger menu `≡` (BUG-01).
- Trong Android APK: `SharedFooter` hiển thị các liên kết kỳ quặc như *"Tải App Android (APK)"* và *"Cài đặt PWA"* ngay bên trong bản APK đã cài đặt!
- Nghiêm trọng nhất: **5/11 màn hình hoàn toàn KHÔNG CÓ BẤT KỲ NÚT QUAY LẠI NÀO** (`DedicatedCalendarView`, `StudyRoomLobby`, `HelpView`, `ContactView`, và `LegalViews` trên mobile nơi nút quay lại bị ẩn bởi class `hidden sm:flex`). Người dùng di động / APK bị **"bắt cóc" (stranded)** trong trang, không có cách nào trở về bàn học ngoại trừ khởi động lại ứng dụng.

---

## 2. BẢNG KHẢO SÁT CHI TIẾT 11 MÀN HÌNH PHỤ (FORENSIC AUDIT MATRIX)

| # | Màn hình (Component & File) | Đường dẫn (Route) | Lối vào trên Mobile (< 640px) | Hiện trạng Header & Footer | Hiện trạng nút Back (Quay lại) | Đánh giá nguy cơ |
|---|---|---|---|---|---|:---:|
| 1 | **LegalViews**<br/>`src/components/LegalViews.tsx` | `/terms`<br/>`/privacy`<br/>`/about` | - Banner Cookie: "Xem chính sách"<br/>- Footer: link Chính sách / Điều khoản<br/>- Deep link | - `PlatformHeader:28`<br/>- `SharedFooter:268` | Dòng 72-76: `<button ... className="... hidden sm:flex">`<br/>🔴 **BỊ ẨN HOÀN TOÀN TRÊN MOBILE (< 640px)** | 🔴 **CRITICAL (BUG-01)**<br/>Kẹt 100% trên mobile |
| 2 | **BillingView**<br/>`src/components/BillingView.tsx` | `/billing`<br/>`/subscription` | - `MobileSettingsView`: "Nạp điểm / Gói cước"<br/>- `MobileMoreDrawer`: "Quyền lợi VIP"<br/>- Upgrade banner | - `PlatformHeader:188`<br/>- `SharedFooter:1277` | Dòng 193-202: `<button data-testid="billing-back-btn">` dạng pill trong `<main>`<br/>⚠️ Nằm dưới PlatformHeader bị tràn lề | 🟠 **HIGH**<br/>Rò rỉ web header/footer |
| 3 | **ProfileView**<br/>`src/components/ProfileView.tsx` | `/profile` | - `MobileMoreDrawer`: "Hồ Sơ"<br/>- Avatar dropdown<br/>- Deep link | - Chưa login: `PlatformHeader:78`, `SharedFooter:103`<br/>- Đã login: `PlatformHeader:284`, `SharedFooter:814` | - Chưa login: ❌ **Không có nút back**<br/>- Đã login: Dòng 291: `<button data-testid="back-to-workspace-btn">` trong `<main>` với `pt-20` | 🟠 **HIGH**<br/>Chưa login bị kẹt, rò rỉ web |
| 4 | **SettingsView**<br/>`src/components/SettingsView.tsx` | `/settings` | - URL trực tiếp `/settings`<br/>- Sub-tabs điều hướng | - `PlatformHeader:137`<br/>- `SharedFooter:545` | Dòng 177-185: `<ArrowLeft size={13} /> <span className="hidden sm:inline">Vào Không Gian</span>`<br/>⚠️ Trên mobile chữ bị giấu, nút bé 13px | 🟠 **HIGH**<br/>Không đồng bộ với `MobileSettingsView` |
| 5 | **DashboardView**<br/>`src/components/DashboardView.tsx` | `/dashboard`<br/>`/history`<br/>`/stats` | - `MobileSettingsView`: "Thống kê"<br/>- `MobileMoreDrawer`: "Thống kê" | - `PlatformHeader:251`<br/>- `SharedFooter:486` | Dòng 268-275: `<button> Mở Không Gian Học</button>` nằm chen chúc cùng hàng tiêu đề | 🟡 **MEDIUM**<br/>Rò rỉ web header/footer |
| 6 | **DedicatedCalendarView**<br/>`src/components/DedicatedCalendarView.tsx` | `/calendar` | - `MobileSettingsView`: "Lịch"<br/>- `MobileMoreDrawer`: "Lịch biểu" | - `PlatformHeader:163`<br/>- `SharedFooter:552` | 🔴 **KHÔNG CÓ NÚT BACK NÀO (0 BACK BUTTON)** trong toàn bộ 556 dòng mã! | 🔴 **CRITICAL**<br/>Người dùng bị kẹt 100% |
| 7 | **StudyRoomLobby**<br/>`src/components/StudyRoomLobby.tsx` | `/rooms`<br/>`/meet` | - `MobileSettingsView`: "Meet"<br/>- Deep link `pomofocus://rooms` | - `PlatformHeader:291`<br/>- `SharedFooter:1075` | 🔴 **KHÔNG CÓ NÚT BACK NÀO (0 BACK BUTTON)** trong toàn bộ 1079 dòng mã! | 🔴 **CRITICAL**<br/>Người dùng bị kẹt 100% |
| 8 | **PrivacyDataView**<br/>`src/components/PrivacyDataView.tsx` | `/privacy-data`<br/>`/data` | - Sub-tabs từ Profile/Settings<br/>- Footer link | - `PlatformHeader:171`<br/>- `SharedFooter:442` | Dòng 178-184: `<button data-testid="back-to-workspace-btn">` trong `<main>` với `pt-20` | 🟡 **MEDIUM**<br/>Rò rỉ web header/footer |
| 9 | **AccountSecurityView**<br/>`src/components/AccountSecurityView.tsx` | `/account/security`<br/>`/security` | - Sub-tabs từ Profile/Settings<br/>- 2FA prompt | - Chưa login: `PlatformHeader:95`, `SharedFooter:111`<br/>- Đã login: `PlatformHeader:321`, `SharedFooter:1203` | - Chưa login: ❌ **Không có nút back**<br/>- Đã login: Dòng 329: `<button data-testid="back-to-workspace-btn">` | 🟠 **HIGH**<br/>Chưa login bị kẹt, rò rỉ web |
| 10 | **HelpView**<br/>`src/components/HelpView.tsx` | `/help` | - Footer link<br/>- Deep link | - `PlatformHeader:53`<br/>- `SharedFooter:178` | 🔴 **KHÔNG CÓ NÚT BACK NÀO (0 BACK BUTTON)** trong toàn bộ 182 dòng mã! | 🔴 **CRITICAL**<br/>Người dùng bị kẹt 100% |
| 11 | **ContactView**<br/>`src/components/ContactView.tsx` | `/contact` | - Footer link<br/>- Deep link | - `PlatformHeader:46`<br/>- `SharedFooter:226` | 🔴 **KHÔNG CÓ NÚT BACK NÀO (0 BACK BUTTON)** trong toàn bộ 230 dòng mã! | 🔴 **CRITICAL**<br/>Người dùng bị kẹt 100% |
| 12 | **NotFoundPage**<br/>`src/pages/NotFoundPage.tsx` | `*` (404) | - Gõ sai URL / Link lỗi | - Custom mini header:29-43 | Dòng 79: `data-testid="404-btn-back-workspace"` dùng raw emoji `⏱`<br/>Thiếu TopBar di động chuẩn | 🟡 **MEDIUM (BUG-11)**<br/>Lỗi emoji & thiếu TopBar |
| 13 | **WebDownloadHub**<br/>`src/components/landing/WebDownloadHub.tsx` | `/download`<br/>`/apk` | - Footer link<br/>- Deep link | - `PlatformHeader:218`<br/>- `SharedFooter:623` | Nút "Vào Không Gian" trong PlatformHeader | 🟡 **MEDIUM**<br/>Không nên hiển thị trong APK |

---

## 3. PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ & RỦI RO KIẾN TRÚC

### 3.1. Phân mảnh Kiến trúc Điều hướng (Navigation Fragmentation)
1. **Thiếu một Mobile Sub-View Shell thống nhất**: Khi dự án phát triển từ Web lên Mobile/Capacitor, `MobileAppShell` được thiết kế tuyệt vời nhưng chỉ bao bọc tuyến đường `/app`. Mọi tuyến đường khác trong `App.tsx:486-551` trả về trực tiếp component view mà không qua bất kỳ lớp bao bọc (wrapper) thích ứng thiết bị nào.
2. **Hardcoded Web Chrome**: Từng component tự nhập khẩu (import) và tự render `<PlatformHeader />` và `<SharedFooter />`. Khi chạy trong môi trường WebView APK (`Capacitor.isNativePlatform()`), các component này không hề biết rằng chúng đang ở trên điện thoại thực thụ.
3. **Phản mẫu Responsive "Che giấu nút Back" (`hidden sm:flex`)**: Trong `LegalViews.tsx:72`, lập trình viên vô tình thêm class `hidden sm:flex` vào nút quay lại nhằm "tiết kiệm chỗ trên mobile", nhưng lại không tạo phương án thay thế, khiến người dùng mobile bị khóa cứng trong trang điều khoản.
4. **Vi phạm Z-Index Hierarchy & Safe Area**:
   - Các view như `ProfileView`, `AccountSecurityView`, `PrivacyDataView` phải dùng padding giả tạo `pt-20 sm:pt-24` (80px - 96px) để tránh bị `PlatformHeader fixed top-0` đè chữ. Khi gỡ `PlatformHeader` hoặc đổi sang mobile, khoảng trống này gây lãng phí không gian màn hình nghiêm trọng.
   - Không có phần tử nào tính toán `pt-safe` (Safe Area Inset Top cho tai thỏ / camera đục lỗ trên Android 15 Edge-to-Edge).

---

## 4. BẢN THIẾT KẾ KIẾN TRÚC UNIFIED MOBILE TOPBAR (`MobileSubViewLayout.tsx`)

### 4.1. Nguyên Lý Thiết Kế 4 Trụ Cột (Design Principles)
1. **State Singularity & Dual-Morph (Quy tắc 1 Cẩm Nang UI/UX)**:
   - Trên **Mobile Viewport (< 768px) hoặc Android APK (`isNativeCapacitor`)**: Render duy nhất thanh `MobileTopBar` native cao 48px (`h-12`), tích hợp `pt-safe`, nút back `←` chuẩn WCAG (44x44px), tiêu đề gọn gàng, và khay hành động góc phải. Tuyệt đối KHÔNG render `PlatformHeader` hoặc `SharedFooter`.
   - Trên **Desktop Web (`!isMobile && !isNativeCapacitor`)**: Tự động chuyển hình thái sang bố cục Web chuẩn với `PlatformHeader` và `SharedFooter`.
2. **Zero-Trap Guarantee**: Mọi màn hình đều có nút quay lại cố định ở góc trên bên trái, trỏ về `/app` (hoặc callback tùy biến), đảm bảo không bao giờ có trường hợp người dùng bị mắc kẹt.
3. **Android 15 Edge-to-Edge & Safe Area Insets (BUG-06, BUG-07)**:
   - Phần nền mờ `backdrop-blur-xl` của TopBar kéo dài lên tận mép trên cùng của màn hình thông qua `pt-safe`.
   - Vùng nội dung chính được bảo vệ ở đáy bằng `pb-safe`, tránh bị thanh điều hướng cử chỉ (Gesture Navigation bar) của hệ điều hành đè lên nút thao tác.
4. **Accessible Touch Target**: Nút Back có kích thước tối thiểu `44x44px` (`min-w-[44px] min-h-[44px]`), padding cảm ứng thân thiện ngón tay cái, có hiệu ứng `active:scale-95` và haptic phản hồi.

---

### 4.2. Đặc Tả Kỹ Thuật Chi Tiết Component `MobileSubViewLayout.tsx`

```tsx
/**
 * src/components/mobile/MobileSubViewLayout.tsx
 *
 * Unified Mobile/APK Sub-View Shell & Native TopBar Architecture
 * Standardized for Milestone M1 (PomoFocus v8.1 / Liquid Zen)
 */

import React from 'react';
import { ArrowLeft, Layout } from 'lucide-react';
import { useRouter } from '../../services/router';
import { useDeviceDetection } from '../../hooks/useDeviceDetection';
import { PlatformHeader } from '../PlatformHeader';
import { SharedFooter } from '../SharedFooter';

export interface MobileSubViewLayoutProps {
  /** Tiêu đề thanh TopBar trên mobile/APK và tiêu đề hiển thị chính */
  title: string;
  /** Tiêu đề phụ hoặc thông tin bổ sung (ví dụ user email, breadcrumb, trạng thái) */
  subtitle?: string;
  /** Callback khi bấm nút Back. Mặc định: router.navigate('/app') */
  onBack?: () => void;
  /** data-testid cho nút Back để duy trì tương thích 100% với các test hiện hữu */
  backTestId?: string;
  /** Slot cho các nút hành động bổ sung ở góc phải (Right Action Slot) */
  rightAction?: React.ReactNode;
  /** Cho phép hiển thị PlatformHeader trên Desktop Web (mặc định: true) */
  showWebHeaderOnDesktop?: boolean;
  /** Cho phép hiển thị SharedFooter trên Desktop Web (mặc định: true) */
  showWebFooterOnDesktop?: boolean;
  /** Class CSS tùy biến cho thẻ bao bọc ngoài cùng */
  className?: string;
  /** Class CSS tùy biến cho thẻ <main> chứa nội dung */
  contentClassName?: string;
  /** Nội dung bên trong của màn hình */
  children: React.ReactNode;
}

export const MobileSubViewLayout: React.FC<MobileSubViewLayoutProps> = ({
  title,
  subtitle,
  onBack,
  backTestId = 'mobile-subview-back-btn',
  rightAction,
  showWebHeaderOnDesktop = true,
  showWebFooterOnDesktop = true,
  className = '',
  contentClassName = '',
  children
}) => {
  const router = useRouter();
  const { isMobile, isNativeCapacitor } = useDeviceDetection();
  const isMobileOrNative = isMobile || isNativeCapacitor;

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.navigate('/app');
    }
  };

  return (
    <div
      data-testid="mobile-subview-layout"
      className={`min-h-[100dvh] w-full flex flex-col bg-[#09090b] text-[#f4f4f5] font-sans antialiased select-none ${className}`}
    >
      {/* 1. Header Layer (Dual-Morph Architecture) */}
      {isMobileOrNative ? (
        <header
          data-testid="mobile-subview-topbar"
          role="banner"
          className="sticky top-0 left-0 right-0 z-40 w-full pt-safe bg-zinc-950/90 backdrop-blur-xl border-b border-white/10 shrink-0 select-none shadow-sm"
        >
          <div className="h-12 min-h-[48px] max-h-[48px] px-2 sm:px-3 flex items-center justify-between gap-2 w-full">
            {/* Nút Quay Lại Bên Trái (Chuẩn Touch Target >= 44x44px WCAG 2.1 AAA) */}
            <button
              type="button"
              data-testid={backTestId}
              onClick={handleBack}
              aria-label="Quay lại bàn học"
              className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer shrink-0"
            >
              <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-0.5" />
            </button>

            {/* Tiêu Đề Trung Tâm / Trái (Cắt ngắn an toàn nếu màn hẹp) */}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <h1 className="text-sm sm:text-base font-bold text-white tracking-tight truncate leading-tight">
                {title}
              </h1>
              {subtitle && (
                <p className="text-[10px] text-zinc-400 font-mono truncate leading-none mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>

            {/* Khay Hành Động Bên Phải (Right Action Slot) */}
            <div className="flex items-center gap-1.5 shrink-0 min-w-[44px] justify-end">
              {rightAction || (
                <button
                  type="button"
                  data-testid="mobile-subview-workspace-btn"
                  onClick={() => router.navigate('/app')}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 active:scale-95 transition cursor-pointer"
                  title="Vào Không Gian Học"
                  aria-label="Vào Không Gian Học"
                >
                  <Layout size={16} />
                </button>
              )}
            </div>
          </div>
        </header>
      ) : (
        showWebHeaderOnDesktop && <PlatformHeader />
      )}

      {/* 2. Main Content Area */}
      <main
        className={`flex-1 w-full ${
          isMobileOrNative ? 'pb-safe' : 'pb-16'
        } ${contentClassName}`}
      >
        {children}
      </main>

      {/* 3. Footer Layer (100% Bị Cắt Trên APK & Mobile Web; Chỉ Giữ Trên Desktop Web) */}
      {!isNativeCapacitor && !isMobileOrNative && showWebFooterOnDesktop && (
        <SharedFooter />
      )}
    </div>
  );
};

export default MobileSubViewLayout;
```

---

## 5. KẾ HOẠCH TRIỂN KHAI CHO WORKER M1 (STEP-BY-STEP ACTION PLAN)

Để Worker M1 triển khai đạt độ chính xác phẫu thuật cao nhất, không gây hồi quy (regression) và không làm gãy test suite:

### Bước 1: Tạo Component `src/components/mobile/MobileSubViewLayout.tsx`
- Tạo file với đầy đủ các props, TypeScript types và styling như đặc tả mục 4.2.

### Bước 2: Bổ sung "Lớp Phòng Vệ Kép" (Defense-in-Depth) trong `PlatformHeader.tsx` & `SharedFooter.tsx`
- Trong `src/components/PlatformHeader.tsx`:
  Thêm kiểm tra `isNativeCapacitor`:
  ```tsx
  const { isNativeCapacitor } = useDeviceDetection();
  if (isNativeCapacitor) return null;
  ```
- Trong `src/components/SharedFooter.tsx`:
  Thêm kiểm tra `isNativeCapacitor`:
  ```tsx
  const { isNativeCapacitor } = useDeviceDetection();
  if (isNativeCapacitor) return null;
  ```
  *Ý nghĩa*: Bảo đảm 100% không bao giờ có bất kỳ rò rỉ nào của header/footer web vào APK, kể cả khi component con quên dùng wrapper.

### Bước 3: Sửa lỗi `CookieConsentBanner.tsx` (BUG-03)
- Bổ sung `const { isNativeCapacitor } = useDeviceDetection(); if (isNativeCapacitor) return null;` ở dòng 51.
- Thêm `whitespace-nowrap` vào 3 nút bấm ở dòng 92, 100, 108 để chữ không bị bẻ thành 2 hàng trên màn hình nhỏ.

### Bước 4: Nâng cấp `App.tsx` Deep Link Router (BUG-11)
- Cập nhật hàm `handleDeepLinkUrl` trong `src/App.tsx` để điều hướng mọi custom scheme `pomofocus://` (ví dụ `pomofocus://billing`, `pomofocus://calendar`, `pomofocus://settings`, `pomofocus://profile`) vào `router.navigate()`, thay vì chỉ hỗ trợ mỗi `/rooms` và `/oauth/callback`.
- Tại `/settings` trên mobile:
  ```tsx
  if (currentPath === '/settings') {
    if (isMobile || isNativeCapacitor) {
      return (
        <MobileSubViewLayout
          title="Cài Đặt Hệ Thống"
          subtitle="Tùy biến thời gian & âm thanh"
          onBack={() => router.navigate('/app')}
        >
          <MobileSettingsView />
        </MobileSubViewLayout>
      );
    }
    return <SettingsView />;
  }
  ```

### Bước 5: Bọc và Chuẩn Hóa 11 Màn Hình Phụ

1. **`LegalViews.tsx`**:
   - Gỡ bỏ `<PlatformHeader />` và `<SharedFooter />`.
   - Bọc bằng `<MobileSubViewLayout title={pageTitle} subtitle="Pháp lý & Quyền riêng tư" onBack={() => router.navigate('/app')}>`.
   - Đổi nút `hidden sm:flex` ở dòng 72 thành hiển thị cho cả mobile hoặc gỡ bỏ vì TopBar đã có nút Back.

2. **`BillingView.tsx`**:
   - Gỡ bỏ `<PlatformHeader />` và `<SharedFooter />`.
   - Bọc bằng `<MobileSubViewLayout title="Gói Cước & Quyền Lợi PRO" backTestId="billing-back-btn" onBack={() => router.navigate('/app')}>`.
   - Giữ nguyên `data-testid="billing-back-btn"` để các bài test e2e hiện hành tiếp tục pass 100%.

3. **`ProfileView.tsx`**:
   - Gỡ bỏ `<PlatformHeader />` và `<SharedFooter />` ở cả 2 nhánh (chưa login và đã login).
   - Bọc nhánh chưa login bằng `<MobileSubViewLayout title="Hồ Sơ Cá Nhân" onBack={() => router.navigate('/app')}>`.
   - Bọc nhánh đã login bằng `<MobileSubViewLayout title="Hồ Sơ Cá Nhân" subtitle={user.email} backTestId="back-to-workspace-btn" onBack={() => router.navigate('/app')}>`.
   - Giảm padding `pt-20 sm:pt-24` thành `pt-4 sm:pt-6`.

4. **`DedicatedCalendarView.tsx`**:
   - Gỡ bỏ `<PlatformHeader />` và `<SharedFooter />`.
   - Bọc bằng `<MobileSubViewLayout title="Lịch Học & Kế Hoạch" subtitle="Time-blocking Pomodoro" onBack={() => router.navigate('/app')}>`.
   - Đưa nút "Hôm nay" hoặc "+ Thêm Lịch" vào `rightAction` khi ở mobile.

5. **`StudyRoomLobby.tsx`**:
   - Gỡ bỏ `<PlatformHeader />` và `<SharedFooter />`.
   - Bọc bằng `<MobileSubViewLayout title="PomoFocus Meet" subtitle="Phòng học nhóm trực tuyến" onBack={() => router.navigate('/app')}>`.

6. **`DashboardView.tsx`**:
   - Gỡ bỏ `<PlatformHeader />` và `<SharedFooter />`.
   - Bọc bằng `<MobileSubViewLayout title="Thống Kê Năng Suất" subtitle="Lịch sử phiên & chuỗi ngày học" onBack={() => router.navigate('/app')}>`.

7. **`PrivacyDataView.tsx`**:
   - Gỡ bỏ `<PlatformHeader />` và `<SharedFooter />`.
   - Bọc bằng `<MobileSubViewLayout title="Quyền Riêng Tư & Dữ Liệu" subtitle="Client Encrypted" backTestId="back-to-workspace-btn" onBack={() => router.navigate('/app')}>`.

8. **`AccountSecurityView.tsx`**:
   - Gỡ bỏ `<PlatformHeader />` và `<SharedFooter />` ở cả 2 nhánh.
   - Bọc bằng `<MobileSubViewLayout title="Bảo Mật & Xác Thực" subtitle={user?.email} backTestId="back-to-workspace-btn" onBack={() => router.navigate('/app')}>`.

9. **`HelpView.tsx`**:
   - Gỡ bỏ `<PlatformHeader />` và `<SharedFooter />`.
   - Bọc bằng `<MobileSubViewLayout title="Trung Tâm Trợ Giúp" subtitle="Phương pháp Pomodoro & phím tắt" onBack={() => router.navigate('/app')}>`.

10. **`ContactView.tsx`**:
    - Gỡ bỏ `<PlatformHeader />` và `<SharedFooter />`.
    - Bọc bằng `<MobileSubViewLayout title="Liên Hệ & Hỗ Trợ" subtitle="Hòm thư tiếp nhận 24/7" onBack={() => router.navigate('/app')}>`.

11. **`NotFoundPage.tsx`**:
    - Thay thế raw emoji `⏱` bằng `<Clock size={16} />`, `🏠` bằng `<Home size={16} />`.
    - Thêm nút quay lại native với `data-testid="404-btn-back-workspace"`.

---

## 6. PHƯƠNG PHÁP KIỂM CHỨNG (VERIFICATION PLAN)

Worker M1 và Auditor M1 có thể kiểm chứng độc lập giải pháp bằng các bước:
1. **Kiểm tra biên dịch kiểu TypeScript**:
   `npm run type-check` (phải đạt 0 errors).
2. **Kiểm tra Unit Tests liên quan**:
   - `npx vitest run tests/unit/auditorM1ForensicEmpirical.test.tsx`
   - `npx vitest run tests/unit/v81Milestone2IdentityAndHeaderPolish.test.tsx`
   - `npx vitest run tests/unit/zenErrorPages.test.tsx`
   - `npx vitest run tests/unit/wcagAccessibilityAudit.test.ts`
3. **Viết test mới `tests/unit/mobileSubViewNavigation.test.tsx`**:
   - Test 1: Khẳng định khi `isNativeCapacitor === true`, toàn bộ 11 secondary views KHÔNG render `PlatformHeader` và `SharedFooter`.
   - Test 2: Khẳng định trên viewport 390px, thanh TopBar có chiều cao đúng chuẩn, nút back có `min-w-[44px] min-h-[44px]` và khi click sẽ gọi `router.navigate('/app')`.
   - Test 3: Khẳng định `CookieConsentBanner` trả về `null` khi `isNativeCapacitor === true`.
   - Test 4: Khẳng định các deep links `pomofocus://billing`, `pomofocus://calendar`, `pomofocus://settings` được route chính xác.
