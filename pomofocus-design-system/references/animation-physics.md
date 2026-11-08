# 5 Hệ Thống Animation Physics Chuẩn Apple Kèm Kho Mã Nguồn

Tài liệu này chuẩn hóa toàn bộ chuyển động tương tác trên PomoFocus theo vật lý học Apple Spring (Fluid Spring Physics), được liên kết và đối chiếu trực tiếp từ các kho animation chuẩn công nghiệp: [Motion.dev (Framer Motion)](https://motion.dev/), [GSAP Showcases](https://gsap.com/), [Jitter Video Templates](https://jitter.video/templates/), [LottieFiles Animation](https://lottiefiles.com/), và [Uiverse.io UI Elements](https://uiverse.io/).

---

## 1. Click & Press Micro-interaction (Phản Hồi Xúc Giác Thị Giác)
* **Nguồn tham chiếu thực tế**: [Uiverse Button Interactions](https://uiverse.io/elements?search=button) & [Motion.dev Gestures](https://motion.dev/)
* **Vật lý học**:
  - Khi nhấn xuống (Active): Co nhỏ vi mô `scale(0.96)`.
  - Khi nhả tay: Bật nhẹ về `scale(1.0)` với độ nảy (overshoot) 2%.
  - Thời gian: Nhấn xuống 100ms, bật lại 200ms.
  - Đường cong: `cubic-bezier(0.25, 1, 0.5, 1)` (Quart Out).
* **Mã Tailwind / CSS áp dụng**:
  ```tsx
  className="transition-transform duration-150 ease-[cubic-bezier(0.25,1,0.5,1)] active:scale-95 hover:scale-[1.02]"
  ```
* **Mã Framer Motion (Motion.dev)**:
  ```tsx
  <motion.button
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.95 }}
    transition={{ type: "spring", stiffness: 500, damping: 30 }}
  />
  ```

---

## 2. Page & View Transition (Chuyển Đổi Trang & Tab Mượt Mà)
* **Nguồn tham chiếu thực tế**: [GSAP Page Transitions](https://gsap.com/) & [Minimal Gallery Smooth Nav](https://minimal.gallery/)
* **Vật lý học**:
  - Trang cũ: Mờ dần `opacity: 1 -> 0` và co nhẹ `scale(1.0) -> scale(0.99)` trong 120ms.
  - Trang mới: Nổi lên `opacity: 0 -> 1` và dãn nhẹ `scale(0.99) -> scale(1.0)` trong 250ms.
  - Đường cong: `cubic-bezier(0.16, 1, 0.3, 1)` (Apple Spring Smooth).
* **Mã CSS Transition**:
  ```css
  .page-enter {
    opacity: 0;
    transform: scale(0.99);
  }
  .page-enter-active {
    opacity: 1;
    transform: scale(1);
    transition: opacity 240ms cubic-bezier(0.16, 1, 0.3, 1), transform 240ms cubic-bezier(0.16, 1, 0.3, 1);
  }
  ```

---

## 3. Drag & Move Physics (Vật Lý Kéo Thả Widget)
* **Nguồn tham chiếu thực tế**: [Apple visionOS Window Drag](https://developer.apple.com/visionos/) & [Motion.dev Drag](https://motion.dev/)
* **Vật lý học**:
  - Khi bắt đầu bấm giữ kéo: Thẻ nâng độ cao bằng cách tăng bóng đổ sâu `shadow-[0_24px_60px_rgba(0,0,0,0.6)]` và phóng to vi mô `scale(1.015)`.
  - Trong lúc kéo: Thẻ bám sát con trỏ chuột với độ trễ 0ms (zero lag).
  - Khi buông chuột: Thẻ khẽ nảy nhẹ và hạ êm về mặt kính trong 220ms.
* **Mã CSS / Inline State**:
  ```tsx
  style={{
    transform: isDragging ? 'scale(1.015)' : 'scale(1)',
    boxShadow: isDragging 
      ? '0 24px 60px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.15)' 
      : '0 8px 32px rgba(0, 0, 0, 0.37), 0 0 0 1px rgba(255, 255, 255, 0.08)',
    transition: isDragging ? 'none' : 'all 220ms cubic-bezier(0.16, 1, 0.3, 1)'
  }}
  ```

---

## 4. Load & Shimmer State (Chuyển Động Tải Dữ Liệu & Chống Nháy)
* **Nguồn tham chiếu thực tế**: [LottieFiles Loading Animations](https://lottiefiles.com/) & [Uiverse Skeletons](https://uiverse.io/elements?search=skeleton)
* **Vật lý học**:
  - Dải sáng quét chậm qua khung xương xám với chu kỳ 1.8 giây.
  - Sau khi nạp xong: Nội dung thật mờ dần hiện ra (`fade-in 300ms`), lớp skeleton tan biến.
* **Mã Tailwind CSS**:
  ```tsx
  <div className="relative overflow-hidden bg-zinc-900/60 rounded-2xl before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.8s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/[0.04] before:to-transparent" />
  ```
  ```css
  @keyframes shimmer {
    100% {
      transform: translateX(100%);
    }
  }
  ```

---

## 5. Modal, Drawer & Window Reveal (Mở & Đóng Cửa Sổ Nổi)
* **Nguồn tham chiếu thực tế**: [Jitter Video Menu Transitions](https://jitter.video/templates/) & [Uiverse Modals](https://uiverse.io/elements?search=modal)
* **Vật lý học**:
  - Khi mở: Phóng từ `scale(0.95)` lên `scale(1.0)` đồng thời `opacity: 0 -> 1` theo đường cong nảy nhẹ `cubic-bezier(0.34, 1.56, 0.64, 1)`.
  - Khi đóng: Thu về `scale(0.95)` và `opacity: 1 -> 0` theo đường cong dứt khoát `cubic-bezier(0.25, 1, 0.5, 1)` trong 160ms.
* **Mã CSS Animation**:
  ```css
  @keyframes appleModalIn {
    0% {
      opacity: 0;
      transform: scale(0.95) translateY(8px);
    }
    100% {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  .animate-apple-reveal {
    animation: appleModalIn 220ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
  ```
