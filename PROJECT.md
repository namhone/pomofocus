# Project: Đồng Bộ Thẩm Mỹ Monochrome 90-10, Tinh Chỉnh UI/Copy & Nghiệm Thu Toàn Diện — Đợt 4/4

## Architecture
Dự án PomoFocus Workspace bước vào Đợt 4 với mục tiêu đồng bộ triệt để thẩm mỹ Monochrome 90-10 (`#09090b` OLED black, trắng/zinc, đường chia mảnh `white/[0.06]`, không đóng hộp thừa) trên Web Desktop, Mobile Web và Android APK.
Hệ thống tuân thủ nghiêm ngặt 5 nguyên tắc bất biến từ `docs/UI_UX_DESIGN_PLAYBOOK_AND_POSTMORTEM.md` (Z-Index Layer Hierarchy `z-10` đến `z-60`, State Singularity, Founder Whitelist, Dynamic Layout Flow `pt-3`/`pt-14` & `pb-28`) và bảo toàn 100% các điều khoản pháp lý `vn-law-check` (Luật 134/2025/QH15, NĐ 142/2026/NĐ-CP, cam kết hoàn tiền 7 ngày).

```
                      ┌───────────────────────────────────────────┐
                      │    PomoFocus App Shell (Monochrome 90-10)  │
                      └─────────────────────┬─────────────────────┘
                                            │
         ┌───────────────────┬──────────────┴───────┬───────────────────┐
         ▼                   ▼                      ▼                   ▼
  ┌──────────────┐    ┌──────────────┐       ┌──────────────┐    ┌──────────────┐
  │  Shell & Nav │    │ Focus, Tasks │       │ AI, Settings │    │  /download   │
  │  (M1: z-40/50│    │ Spaces, Mixer│       │ Auth, Modals │    │ & Web Routes │
  │   Header/Dock│    │   (M2: Core) │       │  (M3: Intel) │    │  (M4: Pub)   │
  └──────────────┘    └──────────────┘       └──────────────┘    └──────────────┘
         │                   │                      │                   │
         └───────────────────┴──────────────┬───────┴───────────────────┘
                                            ▼
                             ┌─────────────────────────────┐
                             │ Milestone 5: Verification,  │
                             │ Typecheck, Vitest, APK Build│
                             │ Vercel Deploy & Audit Gate  │
                             └─────────────────────────────┘
```

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Lucide 1.5px Icon Replacement | Thay thế 100% emoji màu (🍅, 💡, ⚡) bằng icon Lucide nét mảnh 1.5px đồng nhất | M1 | Survey E1 |
| 2 | Sentence Case Typography | Chuyển toàn bộ UI text sang Sentence Case, loại bỏ hoàn toàn ALL CAPS ở label, nút, badge | M1 | Survey E1 |
| 3 | WCAG 2.1 AA Contrast Fixes | Sửa lỗi tương phản chữ đen trên nền xanh đậm, đạt tỷ lệ tương phản chuẩn >= 4.5:1 | M1 | Survey E1 |
| 4 | Settings Checkbox Monochrome | Loại bỏ gradient xanh lá gắt, chuẩn hóa checkbox theo Monochrome 90-10 | M1 | Survey E1 |
| 5 | Mobile Touch Hover Optimization | Bọc @media (hover: hover) để triệt tiêu lỗi dính trạng thái hover trên cảm ứng | M1 | Survey E1 |
| 6 | CookieConsentBanner Z-Index & Layout | Đặt Cookie Banner z-40, đáy cách 64px tránh che Bottom Nav 56px, chuẩn hóa với Toast/Auth/Lock | M1 | Survey E1 |
| 7 | Document Title Standardization | Chuẩn hóa document.title rõ ràng theo từng trang và tab | M1 | Survey E1 |
| 8 | Header 48px Streamlining | Gỡ badge LIQUID ZEN, xóa chấm vàng bị kẹt, giữ [Logo+PomoFocus] và [50·K], ẩn PiP trên APK | M1 | Survey E1 |
| 9 | Bottom Nav 56px Monochrome | Bỏ quầng sáng neon, icon trắng + chấm 3px active, chấm âm thanh, đủ lối vào Meet/Notes/Stats/Billing | M1 | Survey E1 |
| 10 | Tab Focus String Interpolation & Pill Width | Sửa lỗi 'Hiệp $1/$4' thành 'Hiệp 1/4', cân bằng độ rộng 3 nút phiên, placeholder 'Chọn mục tiêu phiên này...' | M2 | Survey E2 |
| 11 | Tab Focus Task Selector Bottom Sheet | Đổi bộ chọn task từ dropdown đè số thành Bottom Sheet chuẩn z-40 không che đồng hồ 25:00 | M2 | Survey E2 |
| 12 | Tab Focus Controls & Hold-to-Reset | Nút Play chính 56px, nút phụ 40px, nút Reset ↺ có vòng tròn tiến trình nhấn giữ 1.5s | M2 | Survey E2 |
| 13 | Tab Focus Stats Bar & Kỷ luật Border | Thanh thống kê đáy sans-serif mảnh 1 dòng '0g 0p · 0 phiên', gỡ viền hộp quanh chế độ Kỷ luật | M2 | Survey E2 |
| 14 | Tab Focus Session Log | Bổ sung giao diện xem và xóa Session Log từ IndexedDB | M2 | Survey E2 |
| 15 | Tab Focus Pocket Lock | Dùng createPortal với toast 'Đã bật khóa chống chạm nhầm' và 'Nhấn giữ để mở khóa' | M2 | Survey E2 |
| 16 | Tab Tasks 3 Chevron Bug Fix | Sửa lỗi hiển thị 3 dấu chevron (^, v, v), làm sạch từng dòng task | M2 | Survey E2 |
| 17 | Tab Tasks Edit, Confirm & Swipe Delete | Cho phép sửa tiêu đề, sửa số hiệp ước tính, xác nhận/Undo khi xóa việc đã xong, vuốt xóa có Undo snackbar | M2 | Survey E2 |
| 18 | Tab Tasks Completed Lock & Empty State | Khóa gắn task đã xong vào Focus, tự chuyển bộ lọc khỏi Đã xong khi thêm mới, tối ưu empty state và nút + | M2 | Survey E2 |
| 19 | Tab Spaces Top Bar De-clutter & Pure Zen | Giảm các thanh top bar chồng chéo, gộp nút Tắt nền Pure Zen Black, tắt sạch Trái Đất 3D trên mọi tab | M2 | Survey E2 |
| 20 | Tab Spaces Vietnamese Localization | Việt hóa Solid/Image/Video, thêm bộ lọc và thanh chỉnh Blur/Brightness | M2 | Survey E2 |
| 21 | Tab Mixer Track Mute & Volume Separation | Làm xám slider & % khi track tắt, thêm công tắc từng track, Sentence case, fade mask, tách chuông và nhạc nền | M2 | Survey E2 |
| 22 | Tab AI Greeting & Badge De-duplication | Gỡ lời chào lặp chồng, gỡ badge ⚡ 50 nạp thêm bị lặp trong tab AI | M3 | Survey E3 |
| 23 | Tab AI Single Error Bubble & Retry | Lỗi mạng chỉ hiện 1 bong bóng kèm nút 'Thử lại', không nhân đôi tin nhắn người dùng | M3 | Survey E3 |
| 24 | Tab AI History Drawer & Controls | Drawer lịch sử chat mobile, nút Tạo chat mới, nút Dừng streaming, xác nhận xóa chat | M3 | Survey E3 |
| 25 | Tab AI Multiline & Legal Disclaimer | Ô nhập nhiều dòng 'Nhắn cho trợ lý...', select-text, overflow-x-auto, bảo toàn Luật 134/2025 | M3 | Survey E3 |
| 26 | Settings Scroll-Padding & Layout Polish | Thêm pb-28 và scroll-padding-top tránh cắt dropdown/card, hairline 1px, thẻ Tài khoản 2 dòng | M3 | Survey E3 |
| 27 | Settings Ringtone VN & 36px Stepper | Việt hóa tên chuông, nút stepper 36px kèm bấm trực tiếp vào số, gỡ nút khôi phục giao diện trên mobile | M3 | Survey E3 |
| 28 | Auth Sheet Header & Keyboard Handling | Gỡ 'Đăng nhập' lặp, placeholder chuẩn, sửa nút email, nút Google 44px, autoscroll bàn phím, giữ input khi chạm backdrop | M3 | Survey E3 |
| 29 | Topup & MoMo Modal Mobile Fit | AiCreditsTopupModal và MoMoPaymentModal co giãn chuẩn 390px, bảo toàn cam kết hoàn tiền 7 ngày | M3 | Survey E3 |
| 30 | /download Header Clean-up | Gỡ bỏ hoàn toàn 'Mở bản web →', '50 ⚡', 'Đăng Nhập', 'Thành viên Free' và 8 link điều hướng nội bộ | M4 | Survey E3 |
| 31 | /download Real APK Size & Text Clean | Cập nhật dung lượng thật 8.70 MB, gỡ chữ 'Liquid Zen' và bỏ ALL CAPS | M4 | Survey E3 |
| 32 | /download 3D Mockup Update | Cập nhật ảnh/mockup 3D chuẩn V8.1 Monochrome (3 nút thumb, avatar K, 50·K, 0 phiên), đồng nhất màu 3 icon | M4 | Survey E3 |
| 33 | /download Viewport Fit & Route Audit | Vừa khít 1440x900 không cuộn thừa, cập nhật OpenGraph v8.1, rà soát /, /app, /calendar, /dashboard, /billing, Tablet | M4 | Survey E3 |
| 34 | Comprehensive Verification | Kiểm thử trực quan đa thiết bị Playwright (Desktop, Tablet, Mobile 390px), npm run type-check, Vitest full suite | M5 | Directive |
| 35 | APK Rebuild & Vercel Deploy | Build lại APK v8.1 sạch, kiểm tra kích thước thực tế, commit & push git, deploy kiểm chứng 2 domain Vercel | M5 | Directive |
| 36 | Forensic Integrity Audit | Kiểm toán độc lập qua teamwork_auditor xác thực 100% tính nguyên bản, không hardcode/facade/bypass | M5 | Directive |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Visual Standards, Shell, Header & Bottom Nav | Features 1-9 (Emoji replacement, Sentence case, WCAG, Checkbox, Hover, Cookie Banner, Title, Header 48px, Nav 56px) | none | DONE |
| M2 | Focus, Tasks, Spaces & Mixer Tabs | Features 10-21 (Interpolation bug, Bottom sheet task picker, 56px controls, stats bar, session log, lock, 3 chevrons, edit/swipe tasks, Earth turn-off, Mixer polish) | M1 | DONE |
| M3 | AI, Settings, Auth Sheet & Modals | Features 22-29 (AI greeting/error/history/multiline, Settings scroll/stepper/tones, Auth sheet autoscroll/contrast, Topup/MoMo 390px & legal) | M1, M2 | DONE |
| M4 | /download Page & Web Routes Synchronization | Features 30-33 (/download header/mockup/size, 1440x900 viewport, Desktop/Tablet routes sync) | M1, M2, M3 | DONE |
| M5 | Comprehensive Verification, APK Build, Deploy & Audit | Features 34-36 (Typecheck, Vitest, Visual QA, APK build, Vercel deploy, Forensic Audit) | M1, M2, M3, M4 | DONE |

## Interface Contracts
### Visual & Token Invariants (M1 ↔ All Modules)
- Colors: Background `#09090b` (OLED black), Card `#121215` / `#18181b` (`zinc-900`), Hairline borders `border-white/[0.06]`.
- Text: Primary `text-zinc-100`, Secondary `text-zinc-400`, Tertiary `text-zinc-500`. Sentence case across all strings.
- Icons: Lucide icons only, `strokeWidth={1.5}` or `size={16}`/`size={18}`/`size={20}`. No colored emojis in UI chrome.
- Buttons: Dark button text must NEVER be black (`#000000`) on dark blue (`#1e3a8a`/`#1d4ed8`). Primary actions use `bg-zinc-100 text-zinc-950 hover:bg-white` or `bg-blue-600 text-white`.

### Z-Index Hierarchy (UI/UX Playbook §1)
- `z-0` to `z-10`: Canvas background, workspace main view.
- `z-20` to `z-30`: Bottom Nav dock (`h-14` / `56px`), mobile floating quick action buttons.
- `z-40`: Bottom Sheet drawers (Task picker, AI history drawer), CookieConsentBanner (`bottom-16` / `64px`).
- `z-50`: Top Header (`h-12` / `48px`), full modals, Auth Bottom Sheet, Toast notifications.
- `z-[60]` / `portal`: Pocket Lock full-screen anti-touch cover.

## Code Layout
- `src/components/MobileAppShell.tsx`: Core mobile shell, Top Header, Bottom Nav, Tab routing, Tasks mobile view, Spaces mobile view, AI mobile view.
- `src/components/MobileFocusView.tsx`: Tab Focus mobile clock, phase pills, task picker, control buttons, session log, pocket lock.
- `src/components/TimerWidget.tsx`: Desktop timer view, phase controls, cycle counters.
- `src/components/TasksWidget.tsx`: Desktop tasks manager, filtering, task item editing.
- `src/components/SpacesWidget.tsx`: Spaces visual background selector, Earth 3D controls, Blur/Brightness sliders.
- `src/components/AudioMixerWidget.tsx`: Background sounds and ambient noise controls, volume ducking, track toggles.
- `src/components/AiCompanionWidget.tsx`: AI Assistant view, chat messages, streaming, legal compliance note.
- `src/components/SettingsWidget.tsx`: Settings panel, ringtone selection, timer durations, sound volume.
- `src/components/AuthModal.tsx`: Authentication Bottom Sheet & dialog, Google login, magic link.
- `src/components/CookieConsentBanner.tsx`: Legal cookie consent banner (Law 134/2025 compliant).
- `src/components/LegalViews.tsx`: Privacy policy, terms of service, AI disclosures.
- `src/components/AiCreditsTopupModal.tsx` & `src/components/MoMoPaymentModal.tsx`: Billing and credit recharge.
- `src/pages/DownloadPage.tsx`: Standalone APK download landing page.
- `src/pages/LandingPage.tsx`, `CalendarPage.tsx`, `DashboardPage.tsx`, `BillingPage.tsx`: Supporting web routes.
