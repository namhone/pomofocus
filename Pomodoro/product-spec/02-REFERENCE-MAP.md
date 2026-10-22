# 02 — REFERENCE MAP (BẢN ĐỒ ĐỐI CHIẾU THAM CHIẾU LIFEAT)

> **Mục đích:** Đối chiếu chi tiết từng bằng chứng thực nghiệm (Screenshots & Quan sát thực tế từ ứng dụng LifeAt.io) với các yêu cầu và giải pháp thiết kế cho dự án Immersive Pomodoro Workspace.

---

## 1. Danh mục URL Tham chiếu Đã khảo sát

| URL | Mục đích khảo sát | Kết quả quan sát |
| :--- | :--- | :--- |
| `https://lifeat.io/` | Trang chủ quảng bá tính năng và định vị thương hiệu | Nắm bắt thông điệp cốt lõi: Virtual Co-working, Focus Spaces, Ambient Sounds, Multi-tool integration. |
| `https://lifeat.io/app?space=M7KQ-IKXC` | Ứng dụng thực tế đang chạy (Live Web App) | Ghi nhận toàn bộ bố cục Desktop Workspace, hệ thống cửa sổ widget nổi, dock thanh công cụ bên trái. |
| `https://www.lifeat.com/feature/virtual-spaces` | Trang giới thiệu tính năng không gian ảo | Phân loại background (cảnh quán cafe, thiên nhiên 4K, video vòng lặp). |
| `https://test.lifeat.app/feature/pomodoro` | Trang giới thiệu tính năng Pomodoro | Cơ chế đếm lùi, chu kỳ nghỉ ngắn/dài, âm thanh chuông báo và tích hợp danh sách việc cần làm. |
| `https://lifeat.io/feature/focus-with-others` | Trang giới thiệu tính năng phòng học nhóm | Phòng học chung, camera/mic, avatar thành viên, đồng bộ trạng thái focus. |

---

## 2. Bảng Đối chiếu Chi tiết theo Từng Bằng chứng (Evidence Mapping)

### 2.1. Evidence 01: `01-home-app.png` — Bố cục Workspace Tổng thể

![Evidence 01](file:///D:/FileCuaNam/Web'/Pomodoro/Pomodoro/product-spec/evidence/01-home-app.png)

- **Các thành phần quan sát được trên LifeAt `[OBSERVED]`:**
  - **Top Bar:** Chế độ `Focus` (kèm mũi tên chuyển đổi), chỉ số streak `3 🔥`, nút kích hoạt gói `Upgrade`, nút tải `Desktop App`, thông tin tài khoản user `n`, toggle camera/mic, menu chọn phòng `My Room`, nút `Invite`, chuông thông báo, nút toàn màn hình (Fullscreen) và menu người dùng.
  - **Left Dock:** Thanh dock dọc gồm các biểu tượng: `Spaces` (Không gian), `Sounds` (Âm thanh), `Cal` (Lịch), `Timer` (Đồng hồ), `Tasks` (Công việc), `Notes` (Ghi chú), `Media` (Nhạc) và nút mở tất cả (All widgets).
  - **Widget Spaces (Đang mở):** Khung chứa video/ảnh nền chia theo tab `Videos`, `Images`, `Favorites`. Ô tìm kiếm "Search space", các nút lọc nhanh hình ảnh (Núi, Cà phê, Cửa sổ, Hoa anh đào, Phim lofi). Danh sách không gian nổi bật: *coffee stop*, *Mount Rainer Lake*, *Mount Shuksan*, *Bali Indonesia*. Chân widget có thanh trượt âm lượng của background hiện tại.
  - **Widget Tasks (Đang mở):** Gồm bộ lọc Tags, Projects, Filter; nút `+ Add task`; danh sách hiển thị task có checkbox và nút Play; thanh hiển thị số trang/task `1/1`; tay nắm co giãn kích thước (resize handle) góc dưới phải.
  - **Widget Pomodoro Timer (Đang mở):** Hiển thị nhãn `Personal`, 4 chấm đếm chu kỳ, thời gian `40:00`, tab Pomodoro, nút `Start`, nút `Reset`, nút cấu hình `⚙`.
  - **Widget Media (Đang mở):** Thẻ phát nhạc Spotify mang thương hiệu LifeAt, hiển thị bài hát `Smooth Sailing - Mr. Jello`, danh sách track preview, nút Previous, Next, Add `+`, Options `...` và nút Play tròn lớn.
  - **Chat FAB:** Nút trò chuyện hình bong bóng thoại ở góc dưới bên phải.
- **Giải pháp thiết kế độc lập cho Dự án của chúng ta `[USER_REQUIREMENT]`:**
  - Giữ lại bố cục màn hình nền toàn cảnh (Canvas) với Left Dock và Top Bar tinh gọn.
  - Loại bỏ hoàn toàn các nút mua hàng gây xao nhãng (`Upgrade`, quảng cáo Pro).
  - Tối ưu hóa các widget theo chuẩn Glassmorphism (hiệu ứng kính mờ trong suốt) đồng bộ, giúp tập trung cao độ vào nội dung.

---

### 2.2. Evidence 02: `02-soundboard.png` — Bảng Điều khiển Âm thanh (Soundboard)

![Evidence 02](file:///D:/FileCuaNam/Web'/Pomodoro/Pomodoro/product-spec/evidence/02-soundboard.png)

- **Các thành phần quan sát được trên LifeAt `[OBSERVED]`:**
  - **Master Volume:** Thanh trượt điều chỉnh âm lượng tổng thể cho toàn bộ ứng dụng.
  - **Spaces Audio:** Thanh trượt âm lượng riêng cho âm thanh phát ra từ video nền (kèm icon loa có trạng thái mute/unmute).
  - **Youtube Link:** Ô nhập URL video YouTube (`https://www.youtube.com/watch?v=...`) kèm thanh trượt âm lượng riêng cho luồng YouTube.
  - **Ambiance:** Danh sách các âm thanh môi trường độc lập, mỗi âm thanh có biểu tượng đại diện (Delta Waves, Theta Waves, Rain...), nút Mute riêng và thanh trượt âm lượng độc lập.
- **Giải pháp thiết kế độc lập cho Dự án của chúng ta `[USER_REQUIREMENT]`:**
  - Xây dựng **Ambient Sound Graph** bằng Web Audio API với 3 nhóm âm thanh chính:
    1. Âm thanh môi trường cài sẵn (Rain, Waves, Birds, Fire, Cafe, Keyboard, v.v.).
    2. Âm thanh sóng não tập trung (Alpha, Beta, Delta, Theta, Gamma) - *kèm disclaimer không cam kết y tế*.
    3. Nhạc nền YouTube/Custom Audio URL.
  - Hỗ trợ lưu preset phối âm cá nhân vào LocalStorage (ví dụ: Preset "Đêm mưa cà phê" = 70% Rain + 40% Cafe + 50% Lo-fi YouTube).

---

### 2.3. Evidence 03: `03-timer-settings.png` — Cài đặt Chi tiết Pomodoro Timer

![Evidence 03](file:///D:/FileCuaNam/Web'/Pomodoro/Pomodoro/product-spec/evidence/03-timer-settings.png)

- **Các thành phần quan sát được trên LifeAt `[OBSERVED]`:**
  - Checkbox `Auto-transition Timer`: Tự động kích hoạt hiệp kế tiếp khi hết giờ.
  - Checkbox `Hide Pomodoro Count`: Ẩn 4 chấm tròn đếm hiệp.
  - Cấu hình số phút: Ô nhập `Pomodoro` (mặc định 40), `Short Break` (5), `Long Break` (15).
  - Dropdown `Timer Sound`: Chọn âm thanh chuông báo kết thúc hiệp (đang chọn `Twinkle`).
  - Thanh trượt âm lượng chuông báo riêng biệt bên dưới.
- **Giải pháp thiết kế độc lập cho Dự án của chúng ta `[USER_REQUIREMENT]`:**
  - Tái tạo đầy đủ 100% các tùy chọn cài đặt trên.
  - Bổ sung các chuông báo âm thanh: **Twinkle, Playtime, Sci-fi, Slow Rise, Rooster, Bird** bằng thuật toán tổng hợp âm sắc Web Audio API (Synthesized Chimes) không cần tải file âm thanh ngoài `[USER_REQUIREMENT]`.
  - Bổ sung tùy chọn tùy chỉnh số vòng trước khi vào Long Break (mặc định 4 vòng).

---

### 2.4. Evidence 04: `04-tasks-widget.png` — Cửa sổ Quản lý Công việc

![Evidence 04](file:///D:/FileCuaNam/Web'/Pomodoro/Pomodoro/product-spec/evidence/04-tasks-widget.png)

- **Các thành phần quan sát được trên LifeAt `[OBSERVED]`:**
  - Khung cửa sổ độc lập có thể di chuyển và kéo dãn kích thước.
  - Thanh công cụ phía trên gồm menu đổ xuống: `Tags`, `Projects`, `Filter`.
  - Khung nhập việc nhanh `+ Add task`.
  - Danh sách task có checkbox đánh dấu hoàn thành và icon Play tròn để gán task vào đồng hồ Pomodoro.
- **Giải pháp thiết kế độc lập cho Dự án của chúng ta `[USER_REQUIREMENT]`:**
  - Lưu trữ toàn bộ dữ liệu trên `IndexedDB` của trình duyệt, không giới hạn số lượng task/project (tránh việc LifeAt giới hạn ở bản Free) `[USER_REQUIREMENT]`.
  - Cho phép gắn hạn chót (Deadline), ước tính số Pomodoros (Estimated Pomodoros) và ghi nhận thời gian thực tế đã hoàn thành.

---

### 2.5. Evidence 05: `05-notes-pro-gate.png` — Khảo sát Rào cản Paywall (Notes & Pro Features)

![Evidence 05](file:///D:/FileCuaNam/Web'/Pomodoro/Pomodoro/product-spec/evidence/05-notes-pro-gate.png)

- **Các thành phần quan sát được trên LifeAt `[OBSERVED]`:**
  - Khi mở Notes, LifeAt chặn màn hình và hiển thị trang nâng cấp: "Jot down notes effortlessly".
  - Gói Free ($0): Bị giới hạn background spaces, giới hạn widgets, không có Daily Planner, không có Focus Analytics.
  - Gói Pro ($8/tháng): Mở khóa 1000+ video spaces, âm thanh không giới hạn, đầy đủ widgets (Task, Calendar, Notes, Media, Breathwork), không giới hạn projects, đồng bộ lịch đa nền tảng.
  - Khuyến mãi sinh viên: Mã giảm giá `EDUCATIONLIFEAT` giảm thêm 50%.
- **Chiến lược khác biệt của Dự án của chúng ta `[USER_REQUIREMENT]`:**
  - **Mở khóa 100% miễn phí:** Tính năng Notes độc lập và Notes gắn với Task được cung cấp sẵn cho mọi người dùng ngay trong bản MVP.
  - Hỗ trợ định dạng văn bản Markdown phong phú (In đậm, In nghiêng, Checklist, Heading).

---

### 2.6. Evidence 06: `06-calendar-widget.png` — Widget Lịch & Kết nối Tài khoản

![Evidence 06](file:///D:/FileCuaNam/Web'/Pomodoro/Pomodoro/product-spec/evidence/06-calendar-widget.png)

- **Các thành phần quan sát được trên LifeAt `[OBSERVED]`:**
  - Lời nhắc kết nối tài khoản ở đỉnh widget: Nút `Google` và nút `Outlook`.
  - Thanh tiêu đề ngày: Thứ, ngày tháng (`Sat, Oct 17`), nút chuyển ngày `< >`, nút `Today` về ngày hiện tại, nút cài đặt bánh răng, nút chọn hiển thị calendar, nút bung cửa sổ popout.
  - Lưới hiển thị thời gian trục đứng: Các mốc 24h (`All day`, `2 AM`, `3 AM`, `4 AM`...).
- **Giải pháp thiết kế độc lập cho Dự án của chúng ta `[USER_REQUIREMENT]`:**
  - Phân kỳ triển khai vào giai đoạn `P1`.
  - Triển khai kết nối Google Calendar thông qua chuẩn **OAuth 2.0 PKCE phía client** (Google Identity Services) để lấy sự kiện hiển thị lên timeline mà không cần thiết lập máy chủ backend đắt tiền `[INFERRED]`.

---

### 2.7. Evidence 07: `07-all-widgets.png` — Đa Cửa sổ trên Desktop Workspace

![Evidence 07](file:///D:/FileCuaNam/Web'/Pomodoro/Pomodoro/product-spec/evidence/07-all-widgets.png)

- **Các thành phần quan sát được trên LifeAt `[OBSERVED]`:**
  - Không gian làm việc hiển thị đồng thời 3 widget: Lịch (bên trái), Danh sách công việc (ở giữa), Pomodoro Timer (bên phải) trên cùng một khung nhìn.
  - Các cửa sổ duy trì tỷ lệ hài hòa, không chồng chéo vụng về.
- **Giải pháp thiết kế độc lập cho Dự án của chúng ta `[USER_REQUIREMENT]`:**
  - Thiết kế trình quản lý cửa sổ (Window Manager) có tính năng ghi nhớ vị trí (Position Persistence) và cơ chế tự động căn lề (Snap-to-grid hoặc Auto-tile cơ bản) giúp người dùng dễ dàng bố trí không gian làm việc khoa học.

---

### 2.8. Evidence 08: `08-pro-space-modal.png` — Bài tập Thở Thư giãn (Breathwork Modal)

![Evidence 08](file:///D:/FileCuaNam/Web'/Pomodoro/Pomodoro/product-spec/evidence/08-pro-space-modal.png)

- **Các thành phần quan sát được trên LifeAt `[OBSERVED]`:**
  - Modal toàn màn hình với nền mờ tối giản.
  - Vòng tròn đồng tâm đổi kích thước theo nhịp hít vào (`inhale`) và thở ra (`exhale`).
  - Nút đóng `✕` góc trên bên phải.
- **Giải pháp thiết kế độc lập cho Dự án của chúng ta `[USER_REQUIREMENT]`:**
  - Triển khai tính năng Breathwork chuẩn Box Breathing (4s Hít vào - 4s Nín thở - 4s Thở ra - 4s Nghỉ ngơi) bằng thuần CSS Animation.
  - Tích hợp âm thanh chuông Tây Tạng (Singing Bowl chime) nhẹ nhàng tại mỗi điểm chuyển đổi nhịp thở `[USER_REQUIREMENT]`.

---

## 3. Tổng hợp Bảng Phân loại Bằng chứng & Nguồn gốc (Evidence Traceability Matrix)

| Cụm tính năng | Trạng thái LifeAt | Phân loại | Hướng xử lý trong dự án |
| :--- | :--- | :--- | :--- |
| **Desktop Canvas & Window Layout** | Có, mượt mà | `OBSERVED` | Tái hiện bằng CSS Absolute/Fixed + Pointer Events + LocalStorage. |
| **Pomodoro Settings (Rounds, Auto-transition)** | Có trong widget Timer | `OBSERVED` | Triển khai theo chuẩn, bổ sung Web Worker chống throttle tab nền. |
| **Âm chuông: Twinkle, Playtime, Sci-fi...** | Có trong dropdown | `OBSERVED` | Tổng hợp trực tiếp qua Web Audio API Oscillator. |
| **Ambient Soundboard & Mixer đa kênh** | Có Master, Spaces, YouTube, Ambiance | `OBSERVED` | Xây dựng Audio Graph đa node bằng Web Audio API. |
| **Task CRUD & Nút Play gắn Timer** | Có, giao diện tối giản | `OBSERVED` | Lưu trữ IndexedDB, mở rộng thêm Deadlines, Tags, Time spent. |
| **Notes Widget & Daily Planner** | Bị khóa sau Paywall $8/tháng | `OBSERVED` | Mở khóa miễn phí 100%, hỗ trợ Markdown. |
| **Google/Outlook Calendar** | Có nút liên kết OAuth | `OBSERVED` | Tích hợp Google Calendar qua Client-Side OAuth PKCE ở P1. |
| **Media Player** | Thẻ nhúng Spotify Preview 30s | `OBSERVED` | Ưu tiên YouTube IFrame Player (nghe full bài); Spotify P1. |
| **Breathwork Animated Modal** | Có vòng tròn Inhale/Exhale | `OBSERVED` | Xây dựng bài tập thở Box Breathing 4-4-4-4 chuẩn khoa học. |
| **Phòng học chung & Voice Chat WebRTC** | Có icon Camera/Mic & Room selector | `OBSERVED` | Xếp vào giai đoạn P2 để đánh giá chi phí STUN/TURN server. |
| **Backend & Database nội bộ LifeAt** | Không thể quan sát từ giao diện | `UNKNOWN` | Thiết kế độc lập: Local-first (IndexedDB) + Supabase tùy chọn. |
