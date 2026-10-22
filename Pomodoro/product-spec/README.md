# LifeAt-Inspired Immersive Pomodoro Workspace — Product Specification

Tài liệu này là chỉ dẫn điều hướng và hướng dẫn thứ tự đọc toàn bộ bộ hồ sơ đặc tả sản phẩm (Product Specification) cho dự án Web Immersive Pomodoro Workspace.

---

## 1. Mục đích & Phạm vi

Bộ tài liệu này được xây dựng dựa trên:
- **Tài liệu nền tảng:** `PROMPT-CHINH.md`, `README-VI.md`, `.agents/skills/lifeat-workspace-research/SKILL.md`.
- **Dữ liệu thực nghiệm:** 8 hình ảnh và quan sát thực tế thu thập từ ứng dụng LifeAt (`product-spec/evidence/01-home-app.png` đến `08-pro-space-modal.png`).
- **Yêu cầu sản phẩm:** Toàn bộ danh mục tính năng do chủ dự án yêu cầu, được phân loại rõ ràng theo các nhãn phân định nguồn gốc.

> [!IMPORTANT]
> **Quy ước nhãn thông tin:**
> - `[OBSERVED]`: Tính năng, giao diện hoặc hành vi đã được quan sát, kiểm chứng trực tiếp trên LifeAt live app qua evidence.
> - `[USER_REQUIREMENT]`: Yêu cầu chức năng đặc thù do chủ dự án chỉ định (có thể khác hoặc mở rộng so với LifeAt).
> - `[INFERRED]`: Phân tích suy luận kỹ thuật logic từ các bằng chứng quan sát (kèm lý do suy luận).
> - `[UNKNOWN]`: Thông tin nội bộ (backend logic, thuật toán bí mật, dữ liệu server) không thể xác minh qua quan sát UI công khai.

---

## 2. Thứ tự đọc chuẩn cho Kỹ sư & Coding Agent

Để nắm bắt toàn diện hệ thống mà không bị quá tải thông tin, khuyến nghị đọc theo thứ tự sau:

| Bước | Tài liệu | Mục tiêu cần nắm |
| :---: | :--- | :--- |
| **1** | [00-EXECUTIVE-SUMMARY.md](file:///D:/FileCuaNam/Web'/Pomodoro/Pomodoro/product-spec/00-EXECUTIVE-SUMMARY.md) | Tầm nhìn dự án, mục tiêu cốt lõi, ma trận phạm vi (MVP vs Post-MVP) và rủi ro chính. |
| **2** | [01-PRD.md](file:///D:/FileCuaNam/Web'/Pomodoro/Pomodoro/product-spec/01-PRD.md) | Bản yêu cầu sản phẩm chi tiết: User Personas, User Stories, tính năng chi tiết theo từng module. |
| **3** | [02-REFERENCE-MAP.md](file:///D:/FileCuaNam/Web'/Pomodoro/Pomodoro/product-spec/02-REFERENCE-MAP.md) | Đối chiếu tính năng LifeAt đã quan sát (`evidence/`) với tính năng sản phẩm mục tiêu. |
| **4** | [03-ROUTES-AND-SCREENS.md](file:///D:/FileCuaNam/Web'/Pomodoro/Pomodoro/product-spec/03-ROUTES-AND-SCREENS.md) | Kiến trúc màn hình, bố cục Workspace Desktop-like, các Widget panel và Mobile Responsive Fallback. |
| **5** | [04-DESIGN-SYSTEM.md](file:///D:/FileCuaNam/Web'/Pomodoro/Pomodoro/product-spec/04-DESIGN-SYSTEM.md) | Nguyên tắc thiết kế Glassmorphism, Typography, Bảng màu Dark/Light, Tokens, Iconography. |
| **6** | [05-INTERACTION-SPEC.md](file:///D:/FileCuaNam/Web'/Pomodoro/Pomodoro/product-spec/05-INTERACTION-SPEC.md) | Quy chuẩn tương tác: Kéo thả (Drag), Resize, Minimize/Maximize, Z-index stacking, Audio mixer. |
| **7** | [06-FEATURE-MATRIX.csv](file:///D:/FileCuaNam/Web'/Pomodoro/Pomodoro/product-spec/06-FEATURE-MATRIX.csv) | Bảng ma trận 100% tính năng phân tầng (P0 MVP / P1 Post-MVP / P2 Phức tạp) và nhãn nguồn gốc. |
| **8** | [07-DATA-MODEL.md](file:///D:/FileCuaNam/Web'/Pomodoro/Pomodoro/product-spec/07-DATA-MODEL.md) | Lược đồ dữ liệu thực thể (Types, Schemas, Local Storage / IndexedDB schema, Cloud sync format). |
| **9** | [08-TECHNICAL-ARCHITECTURE.md](file:///D:/FileCuaNam/Web'/Pomodoro/Pomodoro/product-spec/08-TECHNICAL-ARCHITECTURE.md) | Kiến trúc phần mềm Client-First, Web Audio API Pipeline, Timer Worker chống throttle, Stack 0đ. |
| **10** | [09-INTEGRATION-CONSTRAINTS.md](file:///D:/FileCuaNam/Web'/Pomodoro/Pomodoro/product-spec/09-INTEGRATION-CONSTRAINTS.md) | Giới hạn kỹ thuật: YouTube IFrame sandbox, Spotify preview, Google Calendar OAuth, WebRTC TURN. |
| **11** | [10-ACCEPTANCE-TESTS.md](file:///D:/FileCuaNam/Web'/Pomodoro/Pomodoro/product-spec/10-ACCEPTANCE-TESTS.md) | Bộ kịch bản kiểm thử chấp nhận (Acceptance Criteria): Timer tab nền, audio mix, crash recovery. |
| **12** | [11-UNKNOWN-AND-DECISIONS.md](file:///D:/FileCuaNam/Web'/Pomodoro/Pomodoro/product-spec/11-UNKNOWN-AND-DECISIONS.md) | Tổng hợp các điểm chưa thể xác minh từ LifeAt và các quyết định kỹ thuật cần người dùng chốt. |

---

## 3. Cấu trúc thư mục `product-spec/`

```text
product-spec/
├── README.md                          <-- File này (Hướng dẫn thứ tự đọc & tổng mục lục)
├── 00-EXECUTIVE-SUMMARY.md            <-- Tóm tắt điều hành & chiến lược sản phẩm
├── 01-PRD.md                          <-- Product Requirements Document toàn diện
├── 02-REFERENCE-MAP.md                <-- Bản đồ đối chiếu bằng chứng LifeAt
├── 03-ROUTES-AND-SCREENS.md           <-- Cấu trúc màn hình, Layout desktop & mobile
├── 04-DESIGN-SYSTEM.md                <-- Thiết kế Glassmorphism, Bảng màu, Typography
├── 05-INTERACTION-SPEC.md             <-- Quy chuẩn tương tác cửa sổ, timer, audio
├── 06-FEATURE-MATRIX.csv              <-- Ma trận tính năng P0/P1/P2
├── 07-DATA-MODEL.md                   <-- Thực thể dữ liệu & IndexedDB Schema
├── 08-TECHNICAL-ARCHITECTURE.md       <-- Kiến trúc hệ thống, Web Audio, Timer Worker
├── 09-INTEGRATION-CONSTRAINTS.md      <-- Rào cản YouTube, Spotify, Google Calendar
├── 10-ACCEPTANCE-TESTS.md             <-- Test cases kiểm thử chất lượng
├── 11-UNKNOWN-AND-DECISIONS.md        <-- Các ẩn số LifeAt & Quyết định kiến trúc
└── evidence/                          <-- 8 ảnh chụp màn hình bằng chứng thực tế
    ├── 01-home-app.png
    ├── 02-soundboard.png
    ├── 03-timer-settings.png
    ├── 04-tasks-widget.png
    ├── 05-notes-pro-gate.png
    ├── 06-calendar-widget.png
    ├── 07-all-widgets.png
    └── 08-pro-space-modal.png
```

---

## 4. Hướng dẫn dành cho Coding Agent ở giai đoạn tiếp theo

1. **Không code nếu chưa được User phê duyệt bộ Spec này.**
2. **Ưu tiên kiến trúc Client-First, Offline-First (Ngân sách 0 đồng):**
   - Không dựng backend phức tạp cho MVP.
   - Toàn bộ dữ liệu (Task, Note, Timer Settings, Window Layout, Custom Sounds) được lưu vào `IndexedDB` và `LocalStorage`.
   - Chuông báo Timer sử dụng bộ dao động sóng âm thanh tổng hợp bằng **Web Audio API** (`OscillatorNode` + `GainNode`), không phụ thuộc tải file mp3 từ máy chủ bên ngoài.
   - Bộ đếm thời gian (Timer) bắt buộc dùng chênh lệch thời gian thực (`Date.now()` timestamp difference) kết hợp Web Worker / Web Audio clock để không bị trình duyệt làm trễ (throttling) khi tab chuyển sang chạy nền.
3. **Mọi thắc mắc kỹ thuật:** Tham khảo file [11-UNKNOWN-AND-DECISIONS.md](file:///D:/FileCuaNam/Web'/Pomodoro/Pomodoro/product-spec/11-UNKNOWN-AND-DECISIONS.md) để đối chiếu lý do đưa ra từng quyết định kỹ thuật.
