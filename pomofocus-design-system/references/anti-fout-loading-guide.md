# Hướng Dẫn Kỹ Thuật: Triệt Tiêu 100% Hiện Tượng Nháy Chữ Khi Tải Trang (Zero-FOUT & Anti-Flash)

Tài liệu này giải quyết triệt để vấn đề: *"Việc load trang với các dòng chữ hiện ra trước khi trang được load khiến tôi khá khó chịu"*.

---

## 1. Nguyên Nhân Gốc Rễ (Root Cause)
Hiện tượng này trong kỹ thuật web gọi là **FOUT (Flash of Unstyled Text)** hoặc **Hydration Flash**:
1. Trình duyệt tải file HTML về trước và bắt đầu parse văn bản ngay lập tức trong khi các file CSS, Tailwind, và phông chữ tùy chỉnh (`Inter`, `Plus Jakarta Sans`, v.v.) chưa tải xong hoặc chưa render.
2. Kết quả: Người dùng nhìn thấy vài dòng chữ thô, phông chữ mặc định của hệ thống (Times New Roman / Arial) giật chớp lên màn hình trong 200–500ms trước khi giao diện tối màu và khối kính Liquid Glass ụp vào.
3. Điều này phá vỡ hoàn toàn trải nghiệm Zen và cảm giác cao cấp của sản phẩm.

---

## 2. Giải Pháp Toàn Diện 3 Lớp (The 3-Layer Zero-FOUT Architecture)

### Lớp 1: Khóa Màu Nền Cốt Lõi Ngay Tại `index.html` (Instant Dark Shell)
Trình duyệt phải vẽ nền đen tuyền ngay từ dòng code HTML đầu tiên, không chờ React hay Vite khởi động:

```html
<!-- Trong index.html -->
<!DOCTYPE html>
<html lang="vi" class="dark" style="background-color: #09090b; color: #f4f4f5;">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    
    <!-- Inline Critical CSS ngăn chặn hoàn toàn việc hiện text trước CSS -->
    <style>
      html, body {
        background-color: #09090b !important;
        color: #f4f4f5;
        margin: 0;
        padding: 0;
        overflow-x: hidden;
      }
      /* Ẩn root cho đến khi CSS sẵn sàng hoặc phủ rèm che */
      #pomo-splash-curtain {
        position: fixed;
        inset: 0;
        background-color: #09090b;
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: opacity 350ms cubic-bezier(0.16, 1, 0.3, 1), visibility 350ms;
        pointer-events: none;
      }
      #pomo-splash-curtain.loaded {
        opacity: 0;
        visibility: hidden;
      }
      .pomo-pulse-logo {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: 2px solid rgba(255, 255, 255, 0.1);
        border-top-color: #10b981;
        animation: pomoSpin 0.8s linear infinite;
      }
      @keyframes pomoSpin {
        to { transform: rotate(360deg); }
      }
    </style>
  </head>
  <body class="bg-zinc-950 text-zinc-100 antialiased">
    <!-- Rèm che khởi động siêu nhẹ -->
    <div id="pomo-splash-curtain">
      <div class="pomo-pulse-logo"></div>
    </div>

    <div id="root"></div>

    <script>
      // Tự động tháo rèm ngay khi React đã mount
      window.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
          const curtain = document.getElementById('pomo-splash-curtain');
          if (curtain) curtain.classList.add('loaded');
        }, 150);
      });
    </script>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

---

### Lớp 2: Kiểm Soát Phông Chữ Với `font-display: optional`
Trong file CSS khai báo phông chữ (hoặc link Google Fonts):
* **Thay vì dùng `swap`**: `font-display: swap` chính là thủ phạm khiến phông chữ hệ thống hiển thị trước rồi mới giật đổi phông khi font tải xong.
* **Sử dụng `font-display: optional` hoặc `fallback`**: Trình duyệt chỉ cho phép thời gian chặn 100ms; nếu font chưa có sẵn trong cache, nó sẽ dùng font dự phòng có kích thước tương đồng (qua `size-adjust`) để không làm giật dòng chữ:
  ```css
  @font-face {
    font-family: 'Plus Jakarta Sans';
    font-display: optional;
    src: url('/fonts/plus-jakarta-sans.woff2') format('woff2');
  }
  ```

---

### Lớp 3: Hiệu Ứng Xuất Hiện Nội Dung Mượt Mà (Content Fade-In)
Khi React mount xong component trang, bọc toàn bộ trang trong một animation fade-in nhẹ nhàng 250ms:

```tsx
// Trong App.tsx hoặc Layout
export const PageWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 animate-[pageFadeIn_250ms_cubic-bezier(0.16,1,0.3,1)]">
      {children}
    </div>
  );
};
```
```css
@keyframes pageFadeIn {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

---

## 3. Tiêu Chí Nghiệm Thu (Acceptance Criteria)
1. Khi bấm `Ctrl + F5` hoặc tải lại trang ở mạng chậm 3G:
   - Toàn bộ màn hình hiển thị nền đen tuyền ngay từ 0ms với vòng quay spinner tối giản êm ái.
   - **Tuyệt đối không xuất hiện bất kỳ dòng chữ trần (unstyled text)** hay thẻ HTML nào nhấp nháy trên màn hình trắng/xám trước khi giao diện hoàn tất.
2. Khi rèm che mở ra, toàn bộ bố cục kính mờ Liquid Glass và chữ đã ở đúng vị trí hoàn chỉnh 100%.
