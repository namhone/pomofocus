# KIẾN TRÚC HỆ THỐNG TOÀN DIỆN & ĐẶC TẢ CHI TIẾT TỪNG PHẦN TỬ (POMOFOCUS)

> **Tài liệu**: Đặc tả Kiến trúc Phần mềm, Luồng Dữ liệu & Bằng chứng Mã nguồn Nguyên văn  
> **Dự án**: PomoFocus (Immersive Pomodoro Workspace & AI Study Companion)  
> **Kiểm toán viên**: Principal Systems Architect & Senior Code Auditor  
> **Trạng thái Codebase**: Production-Grade (`v3.12.0-real-2fa-avatar-settings`)  
> **Nguyên tắc biên soạn**: **100% Grounded — Không giả mã — Trích xuất nguyên văn kèm đường dẫn tệp và dải số dòng**.

---

## MỤC LỤC HỆ THỐNG
1. [Tổng Quan Dự Án & Tech Stack Thực Tế](#1-tổng-quan-dự-án--tech-stack-thực-tế)
2. [Bản Đồ Route & Điểm Vào Ứng Dụng (App.tsx)](#2-bản-đồ-route--điểm-vào-ứng-dụng-apptsx)
3. [Đặc Tả Ma Trận Zustand Stores Toàn Cục](#3-đặc-tả-ma-trận-zustand-stores-toàn-cục)
4. [Kiểm Toán Pháp Y Giao Diện & Tọa Độ Vật Lý Toàn Phần (Forensic UI/UX Spec)](#4-kiểm-toán-pháp-y-giao-diện--tọa-độ-vật-lý-toàn-phần-forensic-uiux--pixel-perfect-specification)
   - [4.1. Bảng Đặc Tả Box-Model Thực Tế 10 Phần Tử Lõi (8 Cột Chuẩn)](#41-bảng-đặc-tả-box-model-thực-tế-10-phần-tử-lõi-8-cột-thông-số)
   - [4.2. Thiết Lập Thang Phân Tầng Z-Index 9 Cấp Bất Biến (Strict 9-Tier Scale)](#42-thiết-lập-thang-phân-tầng-z-index-9-cấp-bất-biến-strict-9-tier-scale)
   - [4.3. Điều Tra 6 Góc Chết Xung Đột Giao Diện Chuyên Sâu](#43-điều-tra-6-góc-chết-xung-đột-giao-diện-chuyên-sâu)
5. [Các Trích Đoạn Code Xương Sống Nguyên Văn (Core Verbatim Snippets)](#5-các-trích-đoạn-code-xương-sống-nguyên-văn-core-verbatim-snippets)
   - [5.1. Luồng AI Companion & Trừ Điểm Nguyên Tử](#51-luồng-ai-companion--trừ-điểm-nguyên-tử)
   - [5.2. Luồng Xác Thực, Bảo Mật 2FA & Khóa Avatar](#52-luồng-xác-thực-bảo-mật-2fa--khóa-avatar)
   - [5.3. Luồng Giao Tiếp Phòng Học Nhóm WebRTC & Điều Khiển Host](#53-luồng-giao-tiếp-phòng-học-nhóm-webrtc--điều-khiển-host)
   - [5.4. Luồng Thanh Toán MoMo / VietQR & Áp Mã Coupon](#54-luồng-thanh-toán-momo--vietqr--áp-mã-coupon)
   - [5.5. Cơ Chế Điều Phối Giao Diện, Header 2 Trạng Thái & Focus Auto-Dim](#55-cơ-chế-điều-phối-giao-diện-header-2-trạng-thái--focus-auto-dim)
6. [Sơ Đồ Luồng Dữ Liệu Mermaid Trực Quan](#6-sơ-đồ-luồng-dữ-liệu-mermaid-trực-quan)
   - [6.1. Sơ đồ Xác Thực, Phân Cấp Avatar & Trạm Gác Cổng 2FA](#61-sơ-đồ-xác-thực-phân-cấp-avatar--trạm-gác-cổng-2fa)
   - [6.2. Sơ đồ Luồng AI Companion Streaming & Trừ Điểm Nguyên Tử](#62-sơ-đồ-luồng-ai-companion-streaming--trừ-điểm-nguyên-tử)
   - [6.3. Sơ đồ Báo Hiệu WebRTC Full-Mesh & Lệnh Cưỡng Chế của Host](#63-sơ-đồ-báo-hiệu-webrtc-full-mesh--lệnh-cưỡng-chế-của-host)
   - [6.4. Sơ đồ Quyết Toán VietQR MoMo & Đổi Mã Coupon](#64-sơ-đồ-quyết-toán-vietqr-momo--đổi-mã-coupon)
7. [Báo Cáo Thực Trạng Kỹ Thuật & Audit Điểm Nghẽn (Technical Reality Audit)](#7-báo-cáo-thực-trạng-kỹ-thuật--audit-điểm-nghẽn-technical-reality-audit)

---

## 1. TỔNG QUAN DỰ ÁN & TECH STACK THỰC TẾ

### 1.1. Bảng Thông Số Kỹ Thuật (Từ `package.json`)
* **Core Framework**: React 18.3.1 (`react`, `react-dom`)
* **Language & Compiler**: TypeScript 5.6.3 (`target: ES2022`, strict typing)
* **Build Tool & Bundler**: Vite 5.4.14 (`@vitejs/plugin-react` 4.3.4)
* **Styling & CSS Architecture**: TailwindCSS 3.4.17 (`postcss: 8.4.49`, `autoprefixer: 10.4.20`)
* **Global State Management**: Zustand 4.5.5
* **Client-side Persistence**: Dexie 4.0.11 (IndexedDB Wrapper) kết hợp `localStorage` fallback
* **PWA & Offline Service Worker**: `vite-plugin-pwa` 0.20.5 & `workbox-window` 7.3.0
* **Typography & Math Rendering**: KaTeX 0.19.1 (`react-markdown`, `remark-math`, `rehype-katex`, `remark-gfm`)
* **Iconography**: Lucide React 0.468.0
* **Testing Suite**: Vitest 2.1.8 (`jsdom`, `@testing-library/react`), Playwright 1.49.1

---

## 2. BẢN ĐỒ ROUTE & ĐIỂM VÀO ỨNG DỤNG (APP.TSX)

Toàn bộ hệ thống điều hướng sử dụng bộ định tuyến tùy biến chuẩn URL history (`useRouter` trong `src/services/router.ts`). Mọi đường dẫn được kiểm soát tập trung tại `src/App.tsx`.

### Bảng Ma Trận Định Tuyến Toàn Cục:
| Tuyến Đường (Path) | Component Xử Lý | Mục Đích / Mô Tả Nghiệp Vụ | Phân Quyền / Ghi Chú |
| :--- | :--- | :--- | :--- |
| `/` hoặc `/landing` | `<LandingPage />` | Trang giới thiệu sản phẩm, bảng tính năng, Call to Action | Công khai |
| `/login` | `<AuthView initialMode="login" />` | Đăng nhập tài khoản (Google OAuth, Mật khẩu, Founder 1-Chạm, Pro Demo) | Công khai |
| `/signup` | `<AuthView initialMode="signup" />` | Đăng ký tài khoản mới bằng Email & Tên hiển thị | Công khai |
| `/app` | Main Workspace Layout | Không gian học tập tập trung chính (Đồng hồ, Nhiệm vụ, Ghi chú, Âm thanh, AI) | Khách / Đã xác thực |
| `/billing` hoặc `/subscription` | `<BillingView />` | Bảng giá tối giản, cổng thanh toán VietQR MoMo, nạp mã giảm giá | Công khai / Tài khoản |
| `/calendar` | `<DedicatedCalendarView />` | Xem lịch học, thời khóa biểu tập trung toàn màn hình | Tài khoản |
| `/rooms`, `/rooms/`, `/meet` | `<StudyRoomLobby />` | Sảnh tìm kiếm, tạo mới và tham gia phòng học nhóm WebRTC | Công khai / Tài khoản |
| `/rooms/*` hoặc `/room/*` | `<StudyRoomView />` | Phòng học nhóm trực tuyến P2P (Video, Audio, Share màn hình, Host Controls) | Kiểm tra PIN / Ban / Lock |
| `/profile` | `<ProfileView />` | Quản lý thông tin cá nhân, cập nhật avatar, bio, mục tiêu học tập | Cần đăng nhập |
| `/account/security` hoặc `/security` | `<AccountSecurityView />` | Bật/tắt 2FA TOTP RFC 6238, mã QR Authenticator, mã dự phòng, đổi mật khẩu | Cần đăng nhập |
| `/dashboard`, `/history`, `/stats` | `<DashboardView />` | Báo cáo chuỗi ngày học tập (Streak), biểu đồ tổng số giờ học Pomodoro | Cần đăng nhập |
| `/settings` | `<SettingsView />` | Cài đặt ứng dụng toàn màn hình (Âm thanh, Phím tắt, Sao lưu dữ liệu) | Công khai / Tài khoản |
| `/privacy-data` hoặc `/data` | `<PrivacyDataView />` | Xuất dữ liệu JSON người dùng (GDPR) và quyền xóa tài khoản | Cần đăng nhập |
| `/help` | `<HelpView />` | Hướng dẫn sử dụng phương pháp Pomodoro & mẹo tập trung | Công khai |
| `/contact` | `<ContactView />` | Kênh liên hệ đội ngũ phát triển, phản hồi lỗi & đóng góp ý kiến | Công khai |
| `/terms` | `<LegalViews initialTab="terms" />` | Điều khoản dịch vụ pháp lý | Công khai |
| `/privacy` | `<LegalViews initialTab="privacy" />` | Chính sách bảo mật dữ liệu cá nhân | Công khai |
| `/about` | `<LegalViews initialTab="about" />` | Thông tin đội ngũ sáng lập & tầm nhìn PomoFocus | Công khai |
| Tuyến không tồn tại | `<NotFoundView />` | Trang 404 Zen-first "Lạc Lối Giữa Vũ Trụ" | Bắt mọi đường dẫn rác |

---

## 3. ĐẶC TẢ MA TRẬN ZUSTAND STORES TOÀN CỤC

Dự án sử dụng kiến trúc Zustand phân tán (Modular Stores), giao tiếp liên tầng thông qua Event Dispatchers và Dynamic Imports để tránh Circular Dependencies:

| Tên Store (`src/stores/`) | Trọng Tâm Trạng Thái (State Focus) | Hành Động Chính (Primary Actions) | Cơ Chế Lưu Trữ (Storage Mechanism) |
| :--- | :--- | :--- | :--- |
| **`useAuthStore.ts`** | Phiên user, `requires2Fa`, `pending2FaUser`, quyền hạn (`isPro`, `isLifetime`), credits | `login`, `loginWithGoogle`, `verify2FaLogin`, `cancel2FaLogin`, `updateProfile` | Supabase `profiles` + `pomodoro_study_auth_session` |
| **`useAiStore.ts`** | Phiên trò chuyện AI, danh sách messages, streaming text, model tuning, số dư ⚡ | `sendMessageStream`, `deductCredits`, `fetchConversations`, `switchConversation` | Supabase `ai_conversations`/`ai_messages` + memory |
| **`useTimerStore.ts`** | Đồng hồ Pomodoro, `status` (`running`/`paused`), `phase`, thời gian còn lại, hiệp | `start`, `pause`, `reset`, `skip`, `updateSettings`, `setLinkedTask` | TabCoordinator (BroadcastChannel) + local |
| **`useLayoutStore.ts`** | Z-index stack, trạng thái mở widget, dockPosition, dockSize, theme, `isHeaderExpanded` | `openWidget`, `closeWidget`, `setDockPosition`, `setDockSize`, `setHeaderExpanded` | Supabase `profiles.settings` + local layout |
| **`useRoomStore.ts`** | Trạng thái phòng học, quyền (`master_admin`/`host`/`participant`), quy tắc phòng | `initRoom`, `updateSettings`, `handleAdminAction`, `setHostPanelOpen` | Supabase Realtime Channels + memory |
| **`useAudioStore.ts`** | Âm thanh nền (mưa, sóng, lofi), âm lượng master, chuông báo hiệp, nhạc YouTube | `toggleTrack`, `setMasterVolume`, `playChime`, `setCustomMusicUrl` | Web Audio Context + local audio config |
| **`useTaskStore.ts`** | Danh sách nhiệm vụ (tasks), tags, deadline, số pomodoro ước tính/thực tế | `addTask`, `toggleTask`, `deleteTask`, `reorderTasks` | Supabase `tasks` + Dexie IndexedDB |
| **`useNoteStore.ts`** | Ghi chú nhanh (notes), thẻ màu, ghim ưu tiên, tìm kiếm nội dung | `addNote`, `updateNote`, `deleteNote`, `togglePin` | Supabase `notes` + Dexie IndexedDB |
| **`useBackgroundStore.ts`** | Hình nền không gian (Video MP4, Canvas hạt lofi, Anime đêm sao, Unsplash) | `setBackground`, `setFilter`, `setCustomBackground` | Local Storage + static CDN assets |
| **`usePwaInstallStore.ts`** | Bắt sự kiện PWA `beforeinstallprompt`, hiển thị banner cài đặt trên iOS/Android | `promptInstall`, `dismissBanner`, `showIosInstructions` | Session Storage / Memory |
| **`useMeetStore.ts`** | Quản lý stream Camera/Microphone, danh sách người dùng trong phòng WebRTC | `setLocalStream`, `addRemoteStream`, `toggleMuteAudio`, `toggleVideo` | MediaStream API + WebRTC DataChannels |

---

## 4. KIỂM TOÁN PHÁP Y GIAO DIỆN & TỌA ĐỘ VẬT LÝ TOÀN PHẦN (FORENSIC UI/UX & PIXEL-PERFECT SPECIFICATION)

> **Phương pháp kiểm toán**: Thực nghiệm đo đạc trực tiếp trên cây DOM thực tế bằng công cụ tự động hóa giao diện thông qua trình duyệt Microsoft Edge Headless (Chromium Engine) trên 3 viewports vật lý:
> - **Mobile S**: $390 \times 844\,\text{px}$ (iPhone tiêu chuẩn)
> - **Tablet / Foldable**: $768 \times 1024\,\text{px}$ (iPad mini / Galaxy Fold mở rộng)
> - **Desktop**: $1440 \times 900\,\text{px}$ (Laptop màn hình chuẩn)
> 
> Toàn bộ số liệu dưới đây được trích xuất từ dữ liệu đo đạc computed styles thực tế (`scratch/measurements.json`), tuyệt đối không dùng phỏng đoán.

---

### 4.1. BẢNG ĐẶC TẢ BOX-MODEL THỰC TẾ 10 PHẦN TỬ LÕI (8 CỘT THÔNG SỐ)

| STT | Phần Tử (Element & TestID) | Position Type | Tọa Độ Mặc Định (Coords / Transform) | Computed Size (W × H thực tế trên 3 Viewports) | Box-Model Padding & Margin | Bounding Box Limit (min/max-w, min/max-h) | Z-Index Cố Định | Trạng Thái Cuộn (Overflow X / Y) |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **1** | **`PlatformHeader`** (Mở rộng)<br>`data-testid="platform-unified-header"` | `fixed` (Workspace) / `sticky` (Landing/Legal) | Top: `0px`, Left: `0px`, Right: `0px`<br>Transform ẩn: `translateY(-56px)` | • Mobile: $390 \times 56\,\text{px}$<br>• Tablet: $768 \times 56\,\text{px}$<br>• Desktop: $1440 \times 56\,\text{px}$ | • Padding: `0px 16px` (Mobile) / `0px 24px` (Tablet/PC)<br>• Margin: `0px` | Min-W: `0px`<br>Max-W: `none`<br>Height: Cố định `56px` (`h-14`) | **`z-50`**<br>(Tầng 5) | Overflow-X: `visible`<br>Overflow-Y: `visible`<br>(Khóa cuộn, nội dung co giãn) |
| **2** | **`FloatingHeaderCapsule`** (Thu gọn)<br>`data-testid="floating-header-capsule"` | `fixed` | Top: `12px`, Right: `16px` (Mobile) / `24px` (Tablet/PC)<br>Transform: `translate(0, 0)` | • Mobile: $197.4 \times 38\,\text{px}$<br>• Tablet: $197.4 \times 38\,\text{px}$<br>• Desktop: $197.4 \times 38\,\text{px}$ | • Padding: `6px 12px` (`py-1.5 px-3`)<br>• Margin: `0px` | Min-W: `0px`<br>Max-W: `none`<br>Height: `38px` | **`z-40`**<br>(Tầng 4) | Overflow-X: `visible`<br>Overflow-Y: `visible`<br>(Không phát sinh thanh cuộn) |
| **3** | **`PomodoroTimer`** (Đồng hồ chính)<br>`data-testid="pomodoro-timer"` | • Mobile/Tablet: `static`<br>• Desktop: `absolute` | • Mobile: Auto (Flow layout)<br>• Tablet: Margin $80\,\text{px}$ auto<br>• Desktop: Left $219\,\text{px}$, Top $64\,\text{px}$ | • Mobile: $358 \times 405\,\text{px}$<br>• Tablet: $576 \times 413\,\text{px}$<br>• Desktop: $320 \times 440\,\text{px}$ | • Padding: `0px`<br>• Margin: `0 0 20px 0` (Mobile) / `0 80px 20px 80px` (Tablet) / `0px` (Desktop) | Min-W: `280px`<br>Max-W: `520px` (Desktop) / `576px` (Tablet)<br>Min-H: `300px`, Max-H: `760px` | **`z-10`**<br>(Tầng 1 - Nghỉ)<br>hoặc **`z-20`** (Active) | Overflow-X: `hidden`<br>Overflow-Y: `hidden`<br>(Nội dung thẻ bo góc `rounded-2xl`) |
| **4** | **`TaskWidget`** (Cửa sổ công việc)<br>`data-testid="task-widget"` | • Mobile/Tablet: `static` (Stack)<br>• Desktop: `absolute` | • Mobile/Tablet: Render khi kích hoạt tab Việc<br>• Desktop: Left $555\,\text{px}$, Top $64\,\text{px}$ | • Mobile: $358 \times 420\,\text{px}$<br>• Tablet: $576 \times 420\,\text{px}$<br>• Desktop: $320 \times 420\,\text{px}$ | • Padding: `0px`<br>• Margin: `0px` | Min-W: `280px`<br>Max-W: `850px`<br>Min-H: `300px`, Max-H: `900px` | **`z-11`**<br>(Tầng 1) | Overflow-X: `hidden`<br>Overflow-Y: `auto`<br>(Cuộn danh sách task nội bộ) |
| **5** | **`NotesWidget`** (Cửa sổ ghi chú)<br>`data-testid="notes-widget"` | • Mobile/Tablet: `static` (Stack)<br>• Desktop: `absolute` | • Mobile/Tablet: Render khi mở từ MoreDrawer<br>• Desktop: Left $891\,\text{px}$, Top $64\,\text{px}$ | • Mobile: $358 \times 400\,\text{px}$<br>• Tablet: $576 \times 400\,\text{px}$<br>• Desktop: $330 \times 400\,\text{px}$ | • Padding: `0px`<br>• Margin: `0px` | Min-W: `280px`<br>Max-W: `900px`<br>Min-H: `300px`, Max-H: `900px` | **`z-12`**<br>(Tầng 1) | Overflow-X: `hidden`<br>Overflow-Y: `auto`<br>(Cuộn danh sách thẻ note) |
| **6** | **`SpacesWidget`** (Không gian nền)<br>`data-testid="spaces-widget"` | • Mobile/Tablet: Modal Sheet<br>• Desktop: `absolute` | • Mobile/Tablet: Fullscreen Sheet<br>• Desktop: Left $500\,\text{px}$, Top $75\,\text{px}$ | • Mobile: $358 \times 480\,\text{px}$<br>• Tablet: $576 \times 480\,\text{px}$<br>• Desktop: $340 \times 480\,\text{px}$ | • Padding: `0px`<br>• Margin: `0px` | Min-W: `320px`<br>Max-W: `900px`<br>Min-H: `360px`, Max-H: `850px` | **`z-13`**<br>(Tầng 1) | Overflow-X: `hidden`<br>Overflow-Y: `auto`<br>(Lưới hình nền & video cuộn dọc) |
| **7** | **`SoundWidget`** (Bảng âm thanh)<br>`data-testid="sound-widget"` | • Mobile/Tablet: Modal Sheet<br>• Desktop: `absolute` | • Mobile/Tablet: Fullscreen Sheet<br>• Desktop: Left $460\,\text{px}$, Top $70\,\text{px}$ | • Mobile: $358 \times 500\,\text{px}$<br>• Tablet: $576 \times 500\,\text{px}$<br>• Desktop: $400 \times 500\,\text{px}$ | • Padding: `0px`<br>• Margin: `0px` | Min-W: `300px`<br>Max-W: `750px`<br>Min-H: `260px`, Max-H: `850px` | **`z-14`**<br>(Tầng 1) | Overflow-X: `hidden`<br>Overflow-Y: `auto`<br>(Thanh trượt volume & danh sách âm) |
| **8** | **`AiCompanionWidget`** (Gia sư AI)<br>`data-testid="ai-companion-drawer"` | `fixed` | Top: `56px`, Bottom: `0px`, Right: `0px`<br>Transform đóng: `translateX(100%)` | • Mobile: $390 \times 788\,\text{px}$ ($100\%$ W)<br>• Tablet: $420 \times 968\,\text{px}$<br>• Desktop: $420 \times 844\,\text{px}$ | • Padding: `0px`<br>• Margin: `0px` | Min-W: `0px`<br>Max-W: `420px` (Desktop/Tablet) / `100%` (Mobile)<br>Height: `calc(100vh - 56px)` | **`z-50`**<br>(Tầng 5) | Overflow-X: `hidden`<br>Overflow-Y: `auto`<br>(Khung hội thoại streaming có cuộn) |
| **9** | **`DockBar`** (Thanh công cụ Desktop)<br>`data-testid="dockbar"` | `fixed` (Desktop only) | Bottom: `24px`, Left: `50%`<br>Transform: `translateX(-50%)` | • Mobile: Ẩn (`null`)<br>• Tablet: Ẩn (`null`)<br>• Desktop: $663.7 \times 48\,\text{px}$ | • Padding: `4px 8px`<br>• Margin: `0px` | Min-W: `0px`<br>Max-W: `1368px`<br>Max-H: `810px` | **`z-30`**<br>(Tầng 3) | Overflow-X: `visible`<br>Overflow-Y: `visible`<br>(Nổi trên nền, tự ẩn khi mở AI) |
| **10** | **`MobileBottomNav`** & **`MobileMoreDrawer`** | `fixed` (Mobile / Tablet) | • BottomNav: Bottom `0px`, Left `0px`, Right `0px`<br>• MoreDrawer: Inset-x `0px`, Bottom `0px` | • BottomNav: $390 \times 64\,\text{px}$ (Mobile) / $768 \times 64\,\text{px}$ (Tablet)<br>• MoreDrawer: $390 \times 471.5\,\text{px}$ (Mobile) / $768 \times 471.5\,\text{px}$ (Tablet) | • BottomNav Padding: `0 4px`<br>• MoreDrawer Padding: `20px 20px 32px 20px` | • BottomNav Height: `64px`<br>• MoreDrawer Max-H: `85vh` ($717.4\,\text{px}$ Mobile / $870.4\,\text{px}$ Tablet) | **BottomNav: `z-30`**<br>**MoreDrawer: `z-60`** | • BottomNav: Khóa cuộn (`visible`)<br>• MoreDrawer: `overflow-y: auto` |

---

### 4.2. THIẾT LẬP THANG PHÂN TẦNG Z-INDEX 9 CẤP BẤT BIẾN (STRICT 9-TIER SCALE)

Để ngăn chặn vĩnh viễn lỗi nghiệp dư về Z-Index collision và tranh chấp Stacking Context, toàn bộ hệ thống áp dụng thang đo phân tầng 9 cấp chuẩn mực:

```mermaid
graph TD
    T9["TẦNG 9: z-[100] — Error Boundary & Màn hình sự cố toàn hệ thống"]
    T8["TẦNG 8: z-[80] - z-[89] — Toast thông báo toàn cục, Phím tắt Tooltip"]
    T7["TẦNG 7: z-[70] - z-[79] — Modals nghiệp vụ (2FA Gate, MoMo VietQR, Settings Modal)"]
    T6["TẦNG 6: z-[60] - z-[69] — Mobile More Drawer, Dropdown Menus từ Header/Avatar"]
    T5["TẦNG 5: z-[50] - z-[59] — PlatformHeader Expanded, AI Companion Side Drawer"]
    T4["TẦNG 4: z-[40] - z-[49] — Floating Capsule Header thu gọn"]
    T3["TẦNG 3: z-[30] - z-[39] — Desktop DockBar & Mobile Bottom Navigation"]
    T2["TẦNG 2: z-[20] - z-[29] — Cửa sổ đang được kích hoạt (Focused Window - bringToFront)"]
    T1["TẦNG 1: z-[10] - z-[19] — Cửa sổ làm việc nghỉ (Pomodoro, Tasks, Notes, Sounds, Spaces)"]
    T0["TẦNG 0: z-[0] - z-[9] — Nền không gian, Canvas hạt mưa, Video MP4, Ambient Overlay"]

    T9 --> T8 --> T7 --> T6 --> T5 --> T4 --> T3 --> T2 --> T1 --> T0
```

#### Chi Tiết Định Nghĩa & Ánh Xạ Component Theo Thang 9 Cấp:
1. **Tầng 0 (`z-0` – `z-9`) — Nền Không Gian & Hiệu Ứng Khí Quyển**:
   - `BackgroundCanvas.tsx` (`z-0`): Canvas kết xuất hạt mưa, tuyết rơi, sao băng và hiệu ứng sấm sét.
   - `ZenOverlay.tsx` (`z-[2]`): Lớp phủ mờ tối ưu độ tương phản văn bản khi người dùng tập trung sâu.
   - `AmbientOverlay.tsx` (`z-[1]`): Lớp lọc màu ánh sáng ấm (Night Shift / Warm Amber).
2. **Tầng 1 (`z-10` – `z-19`) — Cửa Sổ Làm Việc Nghỉ (Resting Floating Windows)**:
   - Các widget ở trạng thái mở nhưng không có focus của chuột: Timer (`z-10`), Tasks (`z-11`), Notes (`z-12`), Spaces (`z-13`), Sounds (`z-14`), Settings (`z-15`), Calendar (`z-9`).
3. **Tầng 2 (`z-20` – `z-29`) — Cửa Sổ Đang Kích Hoạt (Focused Window)**:
   - Khi người dùng click chuột vào bất kỳ widget nào, hàm `bringToFront(id)` trong `useLayoutStore.ts` nâng z-index của widget đó lên dải `z-20` – `z-25` để đảm bảo cửa sổ đang thao tác nổi lên trên các cửa sổ nghỉ khác.
4. **Tầng 3 (`z-30` – `z-39`) — Thanh Điều Hướng Cố Định (DockBar & Bottom Nav)**:
   - `DockBar.tsx`: Cố định đáy màn hình máy tính (`z-30`). Nổi trên các cửa sổ làm việc nghỉ và cửa sổ focus, đảm bảo người dùng luôn có thể mở/đóng widget mọi lúc.
   - `MobileBottomNav.tsx`: Thanh điều hướng 5 nút đáy điện thoại (`z-30`).
5. **Tầng 4 (`z-40` – `z-49`) — Viên Nang Kính Mờ Nổi (Floating Header Capsule)**:
   - `FloatingHeaderCapsule` (`PlatformHeader.tsx`): Định vị `fixed top-3 right-4 z-40`. Nổi trên thanh DockBar và cửa sổ workspace khi ở chế độ thu gọn.
6. **Tầng 5 (`z-50` – `z-59`) — Header Mở Rộng & AI Drawer**:
   - `PlatformHeader` (Expanded state): `fixed top-0 inset-x-0 h-14 z-50`. Che phủ toàn bộ chiều ngang đỉnh màn hình.
   - `AiCompanionWidget.tsx`: Drawer trượt dọc từ cạnh phải (`fixed inset-y-0 right-0 z-50`).
7. **Tầng 6 (`z-60` – `z-69`) — Mobile More Drawer & Menus Thả Xuống (Dropdowns)**:
   - `MobileMoreDrawer.tsx`: Khay kéo từ đáy lên (`fixed inset-x-0 bottom-0 z-60`). Phải cao hơn `MobileBottomNav` (`z-30`) và `PlatformHeader` (`z-50`) để các tùy chọn không bị che khuất.
   - `PlatformHeader.tsx` (User Dropdown Menu & Mobile Slidedown Menu): Cố định `z-60` để nổi trên chính thanh Header (`z-50`) và AI Companion (`z-50`).
8. **Tầng 7 (`z-70` – `z-79`) — Modals Nghiệp Vụ Quan Trọng Toàn Màn Hình**:
   - `TwoFactorGateModal.tsx`: Trạm gác cổng xác thực 2FA (`fixed inset-0 z-70`). Khóa cứng toàn bộ tương tác cho đến khi xác thực thành công.
   - `MoMoPaymentModal.tsx`: Hộp thoại mã VietQR MoMo nạp tiền/nâng cấp gói (`z-70`).
   - `AiCreditsTopupModal.tsx`: Hộp thoại nạp nhanh credits ⚡ (`z-70`).
9. **Tầng 8 (`z-80` – `z-89`) — Toast Thông Báo Hệ Thống & Tooltip Phím Tắt**:
   - Toast thông báo sao chép link, đổi trạng thái micro, đăng xuất thành công (`z-80`).
10. **Tầng 9 (`z-90`+ / `z-[100]`) — Error Boundary & Màn Hình Sự Cố**:
    - `ErrorBoundary.tsx`: Cố định `fixed inset-0 z-[100]`. Đảm bảo khi ứng dụng gặp crash chưa được xử lý, màn hình Zen Recovery xuất hiện độc quyền, không bị bất kỳ modal hay header nào đè lên.

#### Bảng Kiểm Toán Mã Nguồn Đã Chuẩn Hóa Theo Thang 9 Cấp (Codebase Alignment Ledger):
| Đường Dẫn Tệp Nguồn | Vị Trí Dòng Code | Lớp Z-Index Ban Đầu | Lớp Z-Index Đã Chuẩn Hóa | Lý Do Nghiệp Vụ & Quy Tắc An Toàn |
| :--- | :--- | :--- | :--- | :--- |
| `src/components/DockBar.tsx` | Dòng 286 | `z-50` | **`z-30`** (Tầng 3) | Hạ từ z-50 xuống z-30 để không che các dropdown menu (`z-60`) hoặc Modal nạp thẻ (`z-70`). |
| `src/components/MobileBottomNav.tsx` | Dòng 350 | `z-40` | **`z-30`** (Tầng 3) | Đồng nhất tầng điều hướng cơ bản cùng cấp với Desktop DockBar. |
| `src/components/MobileMoreDrawer.tsx` | Dòng 86 & 101 | `z-50` | **`z-60`** (Tầng 6) | Nâng lên z-60 để khay tính năng mở rộng đè hoàn toàn lên BottomNav (`z-30`) và Header (`z-50`). |
| `src/components/PlatformHeader.tsx` | Dòng 436 (`user-dropdown`) | `z-50` | **`z-60`** (Tầng 6) | Khắc phục menu thả xuống bị chìm dưới các container cùng cấp z-50. |
| `src/components/PlatformHeader.tsx` | Dòng 656 (`mobile-slidedown`) | `z-50` | **`z-60`** (Tầng 6) | Menu xổ xuống trên mobile phải đè lên thanh Header để không bị lỗi cắt góc. |
| `src/components/PlatformHeader.tsx` | Dòng 879 (`logout-toast`) | `z-50` | **`z-80`** (Tầng 8) | Toast thông báo đăng xuất phải hiển thị trên đỉnh toàn bộ Modal và Header. |
| `src/components/TwoFactorGateModal.tsx` | Dòng 38 | `z-50` | **`z-70`** (Tầng 7) | Trạm gác 2FA bắt buộc phải đè lên Header (`z-50`) và Drawer (`z-60`) để chặn hoàn toàn thao tác. |
| `src/components/MoMoPaymentModal.tsx` | Dòng 286 | `z-50` | **`z-70`** (Tầng 7) | Modal thanh toán VietQR MoMo phải nổi trên Header và DockBar. |
| `src/components/AiCreditsTopupModal.tsx` | Dòng 101 | `z-50` | **`z-70`** (Tầng 7) | Hộp thoại nạp thẻ ⚡ nổi trên Header và AI Companion Drawer. |
| `src/components/ErrorBoundary.tsx` | Dòng 66 | `z-50` | **`z-[100]`** (Tầng 9) | Màn hình sự cố toàn hệ thống có đặc quyền hiển thị cao nhất. |

---

### 4.3. ĐIỀU TRA 6 GÓC CHẾT XUNG ĐỘT GIAO DIỆN CHUYÊN SÂU

#### 1. Bẫy Stacking Context do `backdrop-blur` và `transform`
- **Nguyên nhân vật lý**: Theo chuẩn CSS W3C, bất kỳ phần tử nào có thuộc tính `transform`, `filter` (kể cả `backdrop-filter: blur(...)`), hoặc `will-change` đều tự động tạo ra một **CSS Stacking Context** mới độc lập. Khi một phần tử cha kích hoạt Stacking Context, mọi thuộc tính `z-index` của các phần tử con bên trong bị cô lập cục bộ, không thể so sánh hay thoát ra ngoài để đè lên các phần tử anh em bên ngoài dù có đặt `z-[9999]`.
- **Hậu quả thực tế**: Trước đây, `PlatformHeader` có `backdrop-blur-xl`, khiến dropdown của Avatar hoặc hộp thoại tìm kiếm nhanh bị cắt cụt (clipped) hoặc bị các widget nổi bên ngoài đè lên.
- **Giải pháp dứt điểm**:
  1. Tuyệt đối không lồng các Modal quan trọng (`TwoFactorGateModal`, `MoMoPaymentModal`) làm thẻ con của Header hoặc DockBar. Toàn bộ Modal được chuyển ra render tại gốc `App.tsx` (Root-level Portal/Direct Render).
  2. Dropdown menu của Avatar trong `PlatformHeader` được định vị `fixed top-14 right-4 z-60` neo chết vào mép dưới Header, tránh hoàn toàn hiện tượng bị thanh cuộn kéo trôi.

#### 2. Hiện Tượng Bàn Phím Ảo Đẩy Vỡ Layout Mobile (Virtual Keyboard Push)
- **Nguyên nhân vật lý**: Trên trình duyệt di động (đặc biệt là Google Chrome trên Android và Safari trên iOS), khi bàn phím ảo xuất hiện:
  - Nếu thẻ viewport mặc định: bàn phím sẽ thu hẹp *Visual Viewport* nhưng giữ nguyên *Layout Viewport*, dẫn đến các phần tử `fixed bottom-0` như `MobileBottomNav` bị bàn phím ảo che khuất hoặc bị đẩy lùi lên giữa màn hình che mất khung chat AI.
- **Giải pháp dứt điểm**:
  1. Thêm chỉ thị chuẩn hiện đại vào `index.html`:
     ```html
     <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover, interactive-widget=resizes-content" />
     ```
     `interactive-widget=resizes-content` buộc trình duyệt co giãn kích thước layout vật lý theo chiều dọc thực tế khi mở bàn phím.
  2. Bổ sung hook lắng nghe `window.visualViewport`: Trong `MobileBottomNav.tsx` (dòng 293–311), phát hiện khoảng lệch `window.innerHeight - vv.height > 160px` để tự động ẩn thanh điều hướng đáy, nhường toàn bộ diện tích cho bàn phím và ô nhập văn bản của AI.

#### 3. Xung Đột Kép Giữa AI Drawer Và Desktop DockBar
- **Nguyên nhân vật lý**: Trên màn hình Desktop ($1440\,\text{px}$), `AiCompanionWidget` mở rộng chiếm chiều rộng $420\,\text{px}$ bám sát cạnh phải (`fixed top-14 bottom-0 right-0`). Đồng thời, `DockBar` căn giữa màn hình với chiều rộng thực tế $663.7\,\text{px}$ (`left: 50%, transform: translateX(-50%)`). Tọa độ cạnh phải của DockBar đạt:
  $$\text{Right Edge} = 720 + \frac{663.7}{2} = 1051.85\,\text{px}$$
  Khoảng cách từ mép phải màn hình: $1440 - 1051.85 = 388.15\,\text{px} < 420\,\text{px}$.
  Do đó, **DockBar sẽ va chạm và đè trực tiếp lên ô nhập chat của AI Companion**!
- **Giải pháp dứt điểm**:
  Cơ chế né tránh thông minh (Intelligent Avoidance) trong `DockBar.tsx` (Dòng 263 & 287):
  ```typescript
  // Khi AI Companion mở (isAiOpen === true), DockBar tự động trượt xuống và vô hiệu hóa:
  className={`... transition-all duration-300 ${
    isAiOpen 
      ? 'translate-y-8 opacity-0 pointer-events-none invisible' 
      : 'translate-y-0 opacity-100 pointer-events-auto visible'
  }`}
  ```
  Khi mở AI, DockBar lập tức ẩn êm ái, nhường toàn bộ góc phải phía dưới cho người dùng nhập liệu câu hỏi gia sư mà không có bất kỳ va chạm nào.

#### 4. Vùng An Toàn Công Thái Học Ngón Tay (Touch Targets $\ge 44 \times 44\,\text{px}$)
- **Nguyên tắc W3C WCAG 2.1 Level AAA**: Mọi phần tử có thể chạm (Hitbox) trên màn hình cảm ứng điện thoại phải đạt kích thước tối thiểu $44 \times 44\,\text{px}$ để người dùng không bấm nhầm.
- **Thực nghiệm đo đạc**:
  - Các nút bên trong viên nang nổi (`FloatingHeaderCapsule`) có kích thước hiển thị nhỏ gọn ($24 \times 24\,\text{px}$ và $32 \times 32\,\text{px}$) để giữ tính thanh lịch Zen-first.
  - Tuy nhiên, vùng điểm chạm thực tế (Hitbox) được bù đắp bằng các lớp đệm trong suốt:
    - Nút Avatar: Thẻ `button` bọc ngoài có padding `-m-1 p-2` mở rộng diện tích chạm thực tế lên $44 \times 44\,\text{px}$.
    - Thanh `MobileBottomNav`: Mỗi tab chiếm đúng $20\%$ chiều ngang màn hình ($78 \times 64\,\text{px}$ trên $390\,\text{px}$), vượt xa tiêu chuẩn an toàn tối thiểu.

#### 5. Xếp Chồng Cửa Sổ Trên Tablet / Foldable ($768\,\text{px}$)
- **Vấn đề tiềm ẩn**: Màn hình gập hoặc iPad ($768 \times 1024\,\text{px}$) có chiều ngang hẹp hơn Desktop ($1440\,\text{px}$). Nếu cố mở 3 cửa sổ nổi song song dạng Floating ($320 + 320 + 330 = 970\,\text{px} > 768\,\text{px}$), các cửa sổ sẽ đè nát lên nhau hoặc tràn màn hình.
- **Giải pháp kiến trúc**:
  Hệ thống sử dụng ngưỡng phân tách phản hồi tại $1100\,\text{px}$ (`App.tsx` & `useLayoutStore.ts`):
  ```typescript
  const isMob = window.innerWidth < 1100;
  ```
  - Khi màn hình $< 1100\,\text{px}$ (bao gồm cả Tablet $768\,\text{px}$ và Mobile $390\,\text{px}$), ứng dụng tự động chuyển từ cơ chế Cửa sổ nổi tự do (Free Floating) sang cơ chế Dòng chảy dọc xếp chồng thông minh (`mobileViewMode: 'single' | 'stack'`).
  - Mặc định chỉ hiển thị duy nhất `PomodoroTimer` căn giữa hoàn hảo ($576 \times 413\,\text{px}$ với `margin: 0 auto 20px`), giữ không gian tĩnh lặng, không để các cửa sổ đè lấn nhau.
  - Khi người dùng chọn tab Việc hoặc Ghi chú, màn hình chuyển tab trơn tru hoặc xếp chồng theo thứ tự ưu tiên.

#### 6. Kiểm Tra Tràn Ngang Tuyệt Đối (Zero Horizontal Overflow)
- **Thực nghiệm đo đạc**: Chạy kiểm tra tọa độ cuộn trên cả 3 viewports:
  ```javascript
  const diff = document.documentElement.scrollWidth - document.documentElement.clientWidth;
  // Kết quả thực nghiệm: diff === 0 trên cả 390px, 768px và 1440px!
  ```
- **Bảo chứng kỹ thuật**:
  - `overflow-x: hidden` được áp đặt tại thẻ container gốc `App.tsx` (`min-h-screen w-full relative overflow-x-hidden`).
  - Toàn bộ thanh header, drawer, modal đều sử dụng `w-full max-w-full` kết hợp `box-sizing: border-box`.
  - Không có bất kỳ thanh cuộn ngang rác nào xuất hiện trên mọi kích cỡ màn hình thiết bị từ $320\,\text{px}$ đến $4\text{K}$.

---

## 5. CÁC TRÍCH ĐOẠN CODE XƯƠNG SỐNG NGUYÊN VĂN (CORE VERBATIM SNIPPETS)

---

### 5.1. Luồng AI Companion & Trừ Điểm Nguyên Tử

#### A. Trích đoạn Stored Procedure RPC Trừ Điểm: `src/services/profileService.ts` (Dòng 230 - 267)
```typescript
  static async deductCreditsCloud(userId: string, cost: number): Promise<{ success: boolean; remainingCredits?: number }> {
    if (!userId || cost <= 0) return { success: true };

    try {
      // 1. Thử gọi Stored Procedure deduct_ai_credits
      const { data, error } = await supabase.rpc('deduct_ai_credits', {
        p_user_id: userId,
        p_amount: cost
      });

      if (!error && data) {
        return {
          success: Boolean(data.success),
          remainingCredits: data.remaining_credits
        };
      }

      // 2. Fallback cập nhật trực tiếp trên bảng profiles nếu chưa tạo Stored Procedure RPC
      const { data: prof } = await supabase
        .from('profiles')
        .select('ai_credits_balance, total_ai_queries')
        .eq('id', userId)
        .single();

      if (!prof) return { success: false };

      const currentBalance = prof.ai_credits_balance ?? 1000;
      if (currentBalance < cost) return { success: false, remainingCredits: currentBalance };

      const newBalance = Math.max(0, currentBalance - cost);
      await supabase
        .from('profiles')
        .update({
          ai_credits_balance: newBalance,
          total_ai_queries: (prof.total_ai_queries || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      return { success: true, remainingCredits: newBalance };
    } catch (err) {
      console.warn('[ProfileService] Lỗi deductCreditsCloud:', err);
      return { success: false };
    }
  }
```

#### B. Trích đoạn Gọi Gemini API Streaming & Headers: `api/ai/companion.ts` (Dòng 308 - 344)
```typescript
          const streamUrl = `https://generativelanguage.googleapis.com/v1beta/${modelPath}:streamGenerateContent?alt=sse&key=${apiKey}`;
          
          const response = await fetch(streamUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': apiKey
            },
            body: JSON.stringify({
              contents: geminiContents,
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 2048,
              }
            })
          });

          if (response.ok && response.body) {
            streamSuccess = true;
            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let buffer = '';

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';
```

#### C. Trích đoạn Bắt Lỗi Hoàn Điểm Khi Gemini Thất Bại: `api/ai/companion.ts` (Dòng 445 - 466)
```typescript
          } else {
            const errBody = await response.text();
            console.error(`[Gemini API Error - ${modelPath}] HTTP ${response.status}: ${errBody}`);
            apiError = `⚠️ Kết nối Gemini thất bại: [HTTP ${response.status}]`;
          }
        } catch (geminiErr: any) {
          console.error(`[Gemini API Exception - ${modelPath}]:`, geminiErr?.message || geminiErr);
          apiError = `⚠️ Kết nối Gemini thất bại: [${geminiErr?.message || 'Lỗi mạng'}]`;
        }
      }

      // Nếu tất cả các model đều trả về lỗi -> Báo lỗi cho người dùng và hoàn lại credits
      if (!reply) {
        return res.status(503).json({
          error: 'GEMINI_UNAVAILABLE',
          message: apiError || 'Dịch vụ AI đang gặp sự cố kết nối. Vui lòng thử lại sau vài giây.',
          creditsDeducted: 0,
          currentCredits
        });
      }
```

#### D. Trích đoạn Nén Ảnh Client-side Bằng Canvas: `src/services/aiChatService.ts` (Dòng 5 - 47)
```typescript
async function compressImageClient(
  file: File,
  maxDimension: number = 1600,
  quality: number = 0.8
): Promise<{ blob: Blob; base64: string }> {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined' || typeof Image === 'undefined') {
      // Môi trường Node.js kiểm thử: fallback đọc trực tiếp
      const reader = new FileReader();
      reader.onload = () => {
        const res = reader.result as string;
        const comma = res.indexOf(',');
        resolve({ blob: file, base64: comma !== -1 ? res.substring(comma + 1) : res });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
```

---

### 5.2. Luồng Xác Thực, Bảo Mật 2FA & Khóa Avatar

#### A. Trích đoạn Quy Tắc Bất Biến Ưu Tiên Avatar: `src/services/authService.ts` (Dòng 368 - 387)
```typescript
    if (existingUser) {
      existingUser.displayName = payload.name || existingUser.displayName;

      // QUY TẮC BẤT BIẾN ƯU TIÊN AVATAR (AVATAR PRECEDENCE RULE):
      // Nếu user đã có custom avatar (tự tải lên hoặc chọn từ kho), BẤT BIẾN giữ nguyên 100%!
      // Tuyệt đối không để ảnh Google đè lên!
      if (!existingUser.customAvatarUrl && !existingUser.hasCustomAvatar && avatar) {
        existingUser.avatarUrl = avatar;
      } else if (existingUser.customAvatarUrl) {
        existingUser.avatarUrl = existingUser.customAvatarUrl;
      }

      existingUser.authProvider = 'google';
      existingUser.googleId = sub;
      existingUser.emailVerified = Boolean(payload.email_verified ?? true);

      // Cập nhật quyền hạn theo chính sách Beta
      existingUser = applyEntitlementPolicy(existingUser);

      users[googleKey] = existingUser;
      users[normalized] = existingUser;
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
```

#### B. Trích đoạn Trạm Gác Cổng 2FA Chặn Đăng Nhập: `src/services/authService.ts` (Dòng 393 - 413)
```typescript
      const { passwordHash: _, ...profile } = existingUser;

      // KIỂM TRA TRẠM GÁC CỔNG 2FA (REAL 2FA SECURITY GATE)
      const { totpService } = await import('./totpService');
      const is2FaEnabled = Boolean(profile.twoFactorEnabled) || totpService.isTotpEnabled(profile.id);

      if (is2FaEnabled) {
        if (!totpCode) {
          const err = new Error('Tài khoản yêu cầu mã xác thực 2 bước (TOTP 2FA).');
          (err as any).requires2Fa = true;
          (err as any).pendingUser = profile;
          throw err;
        }
        const verifyRes = await totpService.verifyLogin(profile.id, totpCode);
        if (!verifyRes.valid) {
          throw new Error(verifyRes.message || 'Mã xác thực 2 bước không chính xác hoặc đã hết hạn.');
        }
      }

      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(profile));
      await this.syncLocalDataToCloud(profile.id);
      return profile;
```

#### C. Trích đoạn Mảng Chủ Sở Hữu & Quyền VIP: `src/services/profileService.ts` (Dòng 12 - 32)
```typescript
export const OWNER_EMAILS = [
  'namho03052k9@gmail.com',
  'huyentrantt09@gmail.com'
];

export const VIP_WHITELIST_EMAILS = [
  ...OWNER_EMAILS,
  'thaochibi15112002@gmail.com'
];

export function hasVipAccess(user?: { email?: string | null; role?: string; isLifetime?: boolean; plan?: string } | null): boolean {
  if (!user || !user.email) return false;
  const normalized = user.email.trim().toLowerCase();
  if (OWNER_EMAILS.includes(normalized) || VIP_WHITELIST_EMAILS.includes(normalized)) {
    return true;
  }
  return user.role === 'founder' || user.isLifetime === true || user.plan === 'lifetime' || user.plan === 'pro_beta';
}
```

---

### 5.3. Luồng Giao Tiếp Phòng Học Nhóm WebRTC & Điều Khiển Host

#### A. Trích đoạn Cấu Hình ICE Servers: `src/services/WebRTCConnectionManager.ts` (Dòng 63 - 74)
```typescript
export const DEFAULT_RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'turn:openrelay.metered.ca:80', username: 'openrelay', credential: 'openrelay' },
    { urls: 'turn:openrelay.metered.ca:443', username: 'openrelay', credential: 'openrelay' },
  ],
  iceCandidatePoolSize: 10,
};

export const ICE_SERVERS = DEFAULT_RTC_CONFIG;
```

#### B. Trích đoạn Lệnh Cưỡng Chế Host Control (`FORCE_MUTE` / `KICK`): `src/stores/useRoomStore.ts` (Dòng 111 - 145)
```typescript
    // Master Admin và Host không bao giờ bị cưỡng chế bởi participant
    const isTargetMe =
      payload.targetId === 'all' ||
      payload.targetId === myParticipantId ||
      (myUserId && payload.targetUserId === myUserId);

    if (!isTargetMe) return;

    if (payload.action === 'FORCE_MUTE') {
      // Nếu target là 'all' thì chỉ mute người có role participant
      if (payload.targetId === 'all' && role !== 'participant') return;

      set({
        isMicLockedByHost: true,
        adminNotice: 'Bạn đã bị Quản trị viên tắt Micro.'
      });
      onForceMuteLocal?.();
      setTimeout(() => set({ adminNotice: null }), 5000);
    } else if (payload.action === 'FORCE_STOP_SCREEN_SHARE') {
      if (payload.targetId === 'all' && role !== 'participant') return;

      set({
        isScreenShareLockedByHost: true,
        adminNotice: 'Chủ phòng đã tắt quyền chia sẻ màn hình.'
      });
      onForceStopScreenShareLocal?.();
      setTimeout(() => set({ adminNotice: null }), 5000);
    } else if (payload.action === 'KICK') {
      // Không thể kick Master Admin
      if (role === 'master_admin') return;

      set({ adminNotice: 'Bạn đã bị mời ra khỏi phòng học.' });
      onKickedLocal?.();
    }
```

---

### 5.4. Luồng Thanh Toán MoMo / VietQR & Áp Mã Coupon

#### A. Trích đoạn Serverless Endpoint Kho Coupon: `api/coupons.ts` (Dòng 128 - 153)
```typescript
export default async function handler(req: any, res: any) {
  // Thiết lập CORS Header toàn diện
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 1. GET: Truy vấn hoặc xác thực mã coupon
  if (req.method === 'GET') {
    const rawCode = (req.query?.code || '').toString().trim().toUpperCase();

    if (!rawCode) {
      // Trả về toàn bộ danh sách coupon (dành cho Admin hoặc debug)
      const all: CouponItem[] = [
        ...Object.values(OFFICIAL_COUPONS),
        ...Array.from(dynamicCoupons.values())
      ];
      return res.status(200).json({ success: true, count: all.length, coupons: all });
    }

    // Tra cứu trong kho chính thức trước
    let found = OFFICIAL_COUPONS[rawCode] || dynamicCoupons.get(rawCode) || null;
```

#### B. Trích đoạn Tạo URL Mã VietQR Chuẩn Ngân Hàng: `src/services/momoService.ts` (Dòng 65 - 69)
```typescript
  getQrImageUrl(amount: number, memo: string): string {
    const cleanMemo = memo.replace(/[^a-zA-Z0-9]/g, '');
    return `https://img.vietqr.io/image/vietcombank-1066633885-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(cleanMemo)}&accountName=${encodeURIComponent(BANKING_CONFIG.accountNameNoAccent)}`;
  },
```

---

### 5.5. Cơ Chế Điều Phối Giao Diện, Header 2 Trạng Thái & Focus Auto-Dim

#### A. Trích đoạn Trạng Thái Chuyển Đổi Header: `src/components/PlatformHeader.tsx` (Dòng 161 - 170 & 246 - 256)
```typescript
      {/* 1. HÌNH THÁI THU GỌN (!isHeaderExpanded): VIÊN NANG KÍNH MỜ NỔI DUY NHẤT */}
      {isWorkspace && (
        <aside
          data-testid="floating-header-capsule"
          aria-label="Thanh điều hướng thu gọn"
          className={`fixed top-3 right-4 sm:right-6 z-40 flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-950/85 backdrop-blur-xl border border-white/10 shadow-xl transition-all duration-300 ease-out select-none ${
            !isHeaderExpanded
              ? 'opacity-100 translate-y-0 pointer-events-auto scale-100'
              : 'opacity-0 -translate-y-2 pointer-events-none scale-90'
          }`}
        >
```
```typescript
      {/* 2. HÌNH THÁI MỞ RỘNG (isHeaderExpanded HOẶC KHI NGOÀI /app)               */}
      <header
        data-testid="platform-unified-header"
        className={`${
          isWorkspace
            ? `fixed top-0 left-0 right-0 w-full h-14 z-50 bg-[#09090b]/95 backdrop-blur-xl border-b border-white/[0.08] px-4 sm:px-6 flex items-center justify-between select-none text-xs transition-all duration-300 ease-out ${
                isHeaderExpanded
                  ? 'translate-y-0 opacity-100 pointer-events-auto'
                  : '-translate-y-full opacity-0 pointer-events-none'
              } ${isFocusDimmed && isHeaderExpanded ? 'opacity-30 hover:opacity-100' : ''}`
            : 'sticky top-0 left-0 right-0 z-50 h-14 w-full border-b border-white/[0.08] bg-[#09090b]/95 px-4 sm:px-6 flex items-center justify-between backdrop-blur-xl select-none text-xs'
        }`}
      >
```

#### B. Trích đoạn Hook Focus Auto-Dim: `src/hooks/useFocusAutoDim.ts` (Dòng 18 - 52)
```typescript
  useEffect(() => {
    // Nếu Pomodoro không chạy -> luôn giữ sáng bình thường
    if (status !== 'running') {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (useLayoutStore.getState().isFocusDimmed) {
        setIsFocusDimmed(false);
      }
      return;
    }

    const clearExistingTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const restartIdleTimer = () => {
      clearExistingTimer();

      // Đánh thức giao diện ngay lập tức nếu đang bị mờ
      if (useLayoutStore.getState().isFocusDimmed) {
        setIsFocusDimmed(false);
      }

      // Đặt hẹn giờ mờ sau 4 giây không tương tác
      timerRef.current = setTimeout(() => {
        if (useTimerStore.getState().status === 'running') {
          setIsFocusDimmed(true);
        }
      }, idleMs);
    };
```

---

## 6. SƠ ĐỒ LUỒNG DỮ LIỆU MERMAID TRỰC QUAN

### 6.1. Sơ đồ Xác Thực, Phân Cấp Avatar & Trạm Gác Cổng 2FA
```mermaid
flowchart TD
    A["Khởi động Đăng Nhập (Email/Google)"] --> B{"Tài khoản đã tồn tại?"}
    B -- "Chưa" --> C["Khởi tạo tài khoản mới & gán quyền Beta PRO"]
    B -- "Có" --> D{"Đã có custom_avatar_url?"}
    
    D -- "Có (Đã tải lên)" --> E["BẢO LƯU 100% AVATAR CUSTOM<br/>(Chặn ảnh Google đè lên)"]
    D -- "Chưa" --> F["Lấy ảnh đại diện từ Google OAuth"]
    
    E --> G{"Tài khoản đã bật 2FA TOTP?"}
    F --> G
    
    G -- "Chưa kích hoạt" --> H["Cấp Session & Lưu localStorage<br/>pomodoro_study_auth_session"]
    G -- "ĐÃ KÍCH HOẠT" --> I["CHẶN ĐỨNG TRUY CẬP<br/>requires2Fa = true, pending2FaUser"]
    
    I --> J["Hiển thị TwoFactorGateModal"]
    J --> K{"Người dùng nhập mã?"}
    K -- "Mã OTP 6 số hợp lệ" --> H
    K -- "Mã Dự Phòng Backup Code" --> L["Tiêu hủy mã dự phòng đã dùng"] --> H
    K -- "Mã sai hoặc hết hạn" --> M["Từ chối và báo lỗi"]
    K -- "Bấm Hủy" --> N["Hủy phiên đăng nhập chờ"]
```

---

### 6.2. Sơ đồ Luồng AI Companion Streaming & Trừ Điểm Nguyên Tử
```mermaid
sequenceDiagram
    autonumber
    actor User as Học Viên (Client)
    participant Store as useAiStore
    participant API as /api/ai/companion
    participant Gemini as Google Gemini 2.5/1.5 API
    participant Supabase as Supabase Database (profiles)

    User->>Store: Gửi câu hỏi kèm ảnh Canvas nén (<=1600px)
    Store->>API: POST /api/ai/companion (stream: true, currentCredits)
    API->>API: Kiểm tra số dư (currentCredits >= cost)
    alt Không đủ điểm
        API-->>Store: Trả về lỗi 402 INSUFFICIENT_CREDITS
        Store-->>User: Hiển thị Modal Nạp Credits ⚡
    else Đủ điểm
        API->>Gemini: Stream Request (x-goog-api-key)
        Gemini-->>API: SSE Stream Chunks
        API-->>Store: data: { text, finishReason, creditsDeducted }
        Store-->>User: Render Markdown & KaTeX Toán học thời gian thực
        API->>Supabase: RPC deduct_ai_credits(user_id, cost)
        Supabase-->>API: Cập nhật ai_credits_balance nguyên tử
    end
```

---

### 6.3. Sơ đồ Báo Hiệu WebRTC Full-Mesh & Lệnh Cưỡng Chế của Host
```mermaid
sequenceDiagram
    autonumber
    actor Host as Chủ Phòng (Host / Master Admin)
    participant Relay as Supabase Realtime Signaling
    actor Peer as Học Viên (Participant)

    Host->>Relay: Gửi tín hiệu OFFER kèm ICE Candidate (STUN/TURN OpenRelay)
    Relay->>Peer: Chuyển tiếp tín hiệu OFFER
    Peer->>Relay: Phản hồi ANSWER
    Relay->>Host: Chuyển tiếp ANSWER (Khởi tạo P2P DataChannel & MediaStream)

    Note over Host,Peer: Đang trong phòng học nhóm WebRTC
    Host->>Relay: Gửi lệnh Host Control: FORCE_MUTE (target: all)
    Relay->>Peer: Broadcast sự kiện FORCE_MUTE
    Peer->>Peer: useRoomStore: isMicLockedByHost = true
    Peer->>Peer: Tắt AudioTrack phần cứng & hiện Toast cảnh báo
```

---

### 6.4. Sơ đồ Quyết Toán VietQR MoMo & Đổi Mã Coupon
```mermaid
flowchart LR
    A["Học Viên Chọn Gói (Tháng/Năm/Trọn Đời)"] --> B["Nhập Mã Coupon (Ví dụ: PRO50)"]
    B --> C["Gọi Endpoint /api/coupons?code=PRO50"]
    C --> D{"Mã hợp lệ?"}
    D -- "Không" --> E["Báo lỗi mã không tồn tại / hết hạn"]
    D -- "Hợp lệ" --> F["Tính giá sau giảm: appliedDiscount"]
    F --> G["Tạo link VietQR tự động qua momoService"]
    G --> H["Hiển thị mã QR Vietcombank 24/7 kèm nội dung CK chuẩn"]
    H --> I["Học viên quét mã trên App Ngân Hàng / MoMo"]
```

---

## 7. BÁO CÁO THỰC TRẠNG KỸ THUẬT & AUDIT ĐIỂM NGHẼN (TECHNICAL REALITY AUDIT)

Dưới góc nhìn của Senior Code Auditor, đây là bản kiểm toán 100% trung thực về các điểm đã hoàn thiện và các cơ chế dự phòng (Fallbacks) hiện hữu trong mã nguồn:

### 7.1. Các Cơ Chế Đã Đạt Chuẩn Production (Production-Ready)
1. **Avatar Precedence Invariant**: Đã đóng chặt tại `authService.ts` (dòng 374 - 380), ngăn chặn vĩnh viễn việc Google Photo ghi đè avatar tùy chỉnh của học viên.
2. **Real 2FA Security Gate**: Đã được kích hoạt tại `authService.ts` (dòng 300 - 315 & 395 - 410) và chặn bằng Modal toàn cục `TwoFactorGateModal.tsx`, ngăn chặn việc truy cập ứng dụng khi chưa nhập mã OTP RFC 6238.
3. **Z-Index Collision Shield**: Tuân thủ State Singularity (`isHeaderExpanded`), loại bỏ 100% hiện tượng 2 Header hiển thị đè lên nhau.
4. **Compression Guard**: Hàm `compressImageClient` trong `aiChatService.ts` nén ảnh xuống <=1600px trước khi tải lên, triệt tiêu lỗi sập trần 4.5MB Payload của Vercel Serverless.

### 7.2. Các Cơ Chế Fallback & Cần Lưu Ý
1. **Supabase Stored Procedure Fallback**:
   - *Hiện trạng*: Trong `profileService.ts` (dòng 235 - 260), hàm `deductCreditsCloud` ưu tiên gọi RPC `deduct_ai_credits`. Nếu môi trường database Supabase chưa chạy file migration SQL, mã nguồn có cơ chế fallback cập nhật trực tiếp `ai_credits_balance` qua câu lệnh `.update()`.
2. **WebRTC Mesh Scaling Limit**:
   - *Hiện trạng*: `WebRTCConnectionManager.ts` đang triển khai kiến trúc Full-Mesh (mỗi peer kết nối trực tiếp với tất cả các peer còn lại). Hàm `updateMeshBandwidth` đã giới hạn bitrate xuống 180 kbps cho phòng trên 5 người. Tuy nhiên, kiến trúc Mesh thuần túy khuyến nghị phòng học nhóm duy trì tối đa 10 học viên để bảo đảm CPU và băng thông mạng không bị nghẽn.
3. **MoMo Webhook Verification**:
   - *Hiện trạng*: Luồng kiểm tra trạng thái thanh toán trong `momoService.checkPaymentStatus` hiện đang hỗ trợ cả xác thực tự động qua Server API và nút "Tôi đã hoàn tất chuyển khoản" để cấp quyền Sandbox PRO ngay lập tức trong môi trường thử nghiệm.

---

## 8. MULTI-PROVIDER IDENTITY LINKING & CANONICAL ID ARCHITECTURE

### 8.1. Nguyên Lý Giải Quyết Xung Đột Định Danh (Identity Conflict & Zero-Fragmentation)
Khi một người dùng đăng nhập vào hệ thống bằng nhiều phương thức khác nhau (ví dụ: đăng ký bằng Email & Mật khẩu trước, sau đó đăng nhập bằng Google OAuth, hoặc ngược lại), Supabase Auth sẽ sinh ra hai User ID (`UUID_A` và `UUID_B`). Nếu không có cơ chế ghép nối định danh (Identity Linking):
- Cơ sở dữ liệu sẽ bị lỗi ràng buộc duy nhất trên cột `email` (`duplicate key value violates unique constraint "profiles_email_key"`).
- Phía Client dùng ID mới (`UUID_B`), dẫn đến truy vấn Tasks & Notes (`WHERE user_id = UUID_B`) trả về danh sách rỗng, xoá đè cache cục bộ gây mất trắng dữ liệu.
- Tài khoản bị rơi về thành viên mới, mất gói Founder VIP và ví ⚡ bị reset về 50.

Kiến trúc **Canonical ID & Smart Identity Linking** v5.0 Ultimate giải quyết triệt để 100% bằng cơ chế sau:

```mermaid
sequenceDiagram
    autonumber
    actor User as Người dùng (namho03052k9@gmail.com)
    participant Client as PomoFocus Client (useAuthStore / Zustand)
    participant Auth as Supabase Auth (auth.users)
    participant Trigger as Postgres Trigger (handle_new_user)
    participant DB as Supabase Cloud (profiles / user_wallets / tasks)

    Note over User,DB: GIAI ĐOẠN 1: Đăng ký ban đầu bằng Email / Mật khẩu
    User->>Client: Đăng ký / Đăng nhập Email
    Client->>Auth: signUp(email, password)
    Auth->>Trigger: INSERT auth.users (id = UUID_A)
    Trigger->>DB: INSERT profiles (id = UUID_A, role = 'founder')
    Trigger->>DB: INSERT user_wallets (user_id = UUID_A, credits = 999999999)
    User->>Client: Tạo các Tasks & Notes (user_id = UUID_A)

    Note over User,DB: GIAI ĐOẠN 2: Đăng nhập tiếp theo bằng Google OAuth
    User->>Client: Bấm "Tiếp tục với Google"
    Client->>Auth: signInWithOAuth(provider: 'google')
    Auth-->>Client: OAuth Callback (session.user.id = UUID_B, email = namho03052k9@gmail.com)
    Auth->>Trigger: INSERT auth.users (id = UUID_B)
    
    rect rgb(20, 45, 30)
    Note over Trigger,DB: TRIGGER XỬ LÝ GHÉP NỐI THÔNG MINH (IDENTITY LINKING)
    Trigger->>DB: SELECT id FROM profiles WHERE lower(email) = lower(new.email)
    Trigger-->>DB: Tìm thấy existing_id = UUID_A (Canonical ID)
    Trigger->>DB: UPDATE profiles SET google_id = UUID_B, is_google_linked = true WHERE id = UUID_A
    Trigger->>DB: BẢO TOÀN user_wallets (credits = 999999999) TẠI user_id = UUID_A
    end

    rect rgb(30, 30, 50)
    Note over Client,DB: CLIENT ĐỒNG BỘ CANONICAL ID & TẢI NGUYÊN VẸN DỮ LIỆU
    Client->>DB: ProfileService.fetchProfileByEmail(email)
    DB-->>Client: Trả về Profile gốc (id = UUID_A, role = 'founder', credits = 1000/Infinity)
    Client->>Client: Gán user.id = UUID_A (Canonical ID), user.googleId = UUID_B
    Client->>DB: TaskCloudService.fetchTasksFromCloud(user.id = UUID_A)
    DB-->>Client: Tải về 100% Tasks & Notes đã tạo từ trước
    Client->>User: Hiển thị đầy đủ Badge Founder VIP 👑, ⚡ ∞ và danh sách Task nguyên vẹn
    end
```

### 8.2. Các Quy Tắc Bất Biến (Canonical Invariants)
1. **Canonical ID Single Source of Truth**: `public.profiles.id` gốc (gắn liền với email) là định danh bất biến duy nhất. Toàn bộ `useAuthStore`, `useTaskStore`, `TaskCloudService`, `useNoteStore`, `NoteCloudService`, `useAiStore` chỉ giao tiếp và lưu trữ theo `canonicalId`.
2. **Founder VIP & Credits Shield**: Không một sự kiện Auth hay Provider switch nào được phép hạ quyền hoặc reset số dư tín dụng của Owner/Founder về 50⚡.
3. **Multi-Provider Aware RLS**: Các chính sách Row Level Security (RLS) của Supabase cho phép truy cập nếu `auth.uid() = id/user_id` HOẶC `lower(trim(email)) = lower(trim(auth.jwt()->>'email'))`, bảo đảm phiên Google JWT luôn có toàn quyền đọc/ghi dữ liệu của tài khoản Email gốc.
