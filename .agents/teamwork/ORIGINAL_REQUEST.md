# Original User Request

## Parameters

[skip-interview]
How this run was launched; not part of the task.

## Initial Request — 2026-11-09T19:09:49Z

# ĐỀ ÁN NÂNG CẤP TOÀN DIỆN: ECOSYSTEM "LANDING WEB + STANDALONE ANDROID APK"

## PHÂN TÍCH CHUYÊN SÂU & MASTER DIRECTIVE V7.4 ULTIMATE

Hệ sinh thái nhị nguyên hoàn hảo cho PomoFocus:
1. **Trang Web (Web Hub Landing Page)**: Là "Bộ mặt đại diện", một trang giới thiệu kiệt tác theo phong cách Zen Glassmorphism với tỷ lệ chuyển đổi cao (High-Conversion Showcase), tích hợp nút bấm 1 chạm tải trực tiếp file APK (PomoFocus-v7.4.apk) và mã QR quét tải nhanh bằng camera điện thoại.
2. **Ứng Dụng Android (Standalone APK Engine)**: Là "Trái tim hiệu năng", chạy độc lập toàn màn hình 120Hz trên điện thoại Xiaomi/Samsung của người dùng, tích hợp trọn vẹn phần cứng: Rung phản hồi haptic, giữ sáng màn hình Screen Wake Lock, cơ chế đếm giờ bất tử Anchor Timestamp Engine, và hệ thống chuyển động lò xo Spring Physics vi sinh ở mọi ngóc ngách.

---

### PHẦN 1: BỐC TÁCH 4 TRỤ CỘT NÂNG CẤP TOÀN DIỆN MỚI
1. **Hệ Thống Tải APK Thông Minh & Trực Tiếp (Direct APK Distribution Engine)**:
   - File APK được tự động biên dịch và đặt ngay tại đường dẫn công khai: `https://pomofocus-workspace.vercel.app/downloads/PomoFocus-v7.4.apk`
   - Smart User-Agent Detection (Tự nhận diện thiết bị thông minh):
     - Khi truy cập bằng Android: Nút tải file APK `[ ⬇ Tải Ngay APK Android (v7.4) ]` tự động nổi bật ở trung tâm với quầng sáng ngọc bích phát sáng nhịp thở (Breathing Glow).
     - Khi truy cập bằng Desktop/Laptop: Hiển thị đồng thời Mã QR Code động để quét tải ngay trên điện thoại.
2. **Cơ Chế Tự Động Cập Nhật Trong Ứng Dụng (In-App Auto-Update & Version Check)**:
   - Kiểm tra `https://pomofocus-workspace.vercel.app/version.json`.
   - Nếu có phiên bản mới: Thông báo kính lỏng nhỏ gọn (Liquid Inset Banner) ở góc dưới.
3. **Bổ Sung Toàn Bộ Mini Micro-Animations 120Hz (Chi Tiết Từng Ngóc Ngách)**:
   - Cụm Tab Chế độ (Focus / Short Break / Long Break): `framer-motion` với `layoutId="activePillMode"`, squash & stretch spring physics.
   - Hàng Stepper Chỉnh Giờ: `Rolling Digit Morph` theo trục Y trong 120ms kèm haptic 10ms.
   - Thanh Bottom Navigation Bar 5 Tab: `layoutId="activeNavIndicator"`, icon nảy nhẹ `scale: 0.85 -> 1.15 -> 1.0`.
   - Thẻ Nhiệm Vụ (Task List): Dấu tick SVG vẽ nét `strokeDashoffset`, chùm tia sáng ngọc bích bung nhẹ.
4. **Khóa Chết Hoàn Toàn Lỗi Cuộn Kép & Trôi Khung (Zero-Scroll-Chaining)**:
   - `html, body { position: fixed; inset: 0; width: 100%; height: 100dvh; overflow: hidden !important; overscroll-behavior: none !important; }`

---

### PHẦN 2: MASTER DIRECTIVE THI CÔNG
- **Web Version**: Trang Giới Thiệu & Tải APK (`src/components/landing/WebDownloadHub.tsx`) với nút tải APK, QR code cho desktop, phone mockup preview.
- **Android Native Version**: Đóng gói qua Capacitor (`@capacitor/core`, `@capacitor/android`, `@capacitor/haptics`, `@capacitor/status-bar`, `@capacitor/cli`), tạo `capacitor.config.ts`, build & sync Android, biên dịch `assembleDebug`, xuất `public/downloads/PomoFocus-v7.4.apk` và tạo `public/version.json`.
- **Cập nhật micro-animations**: `MobileStepperRow.tsx`, `MobileBottomNav.tsx`, và khóa cuộn chết trong `src/index.css`.
- **Bảo toàn kiểm thử**: `npm run type-check` 0 lỗi, toàn bộ Vitest suites pass, Vercel build thành công.
