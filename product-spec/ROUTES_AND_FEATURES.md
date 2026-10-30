# BẢN ĐỒ ĐỊNH TUYẾN & TÍNH NĂNG: POMOFOCUS (STUDY WORKSPACE)

**Phiên bản:** Demo Beta 1.0.0  
**Ngày cập nhật:** 29/10/2026  

---

## 1. BẢNG TỔNG HỢP ROUTES & TRANG (ROUTE MAP)

| Đường dẫn (Route Path) | Component phụ trách | Mục đích & Trách nhiệm | Quyền truy cập | Test ID chính |
|---|---|---|:---:|---|
| `/` | `LandingPage.tsx` | **Trang chủ mặc định:** Giới thiệu sản phẩm, 3 bước bắt đầu, đặc quyền Demo Beta 3 Năm PRO, FAQ, CTA vào Không Gian | Công khai (Public) | `landing-page-root` |
| `/landing` | `LandingPage.tsx` | Đường dẫn dự phòng cho Landing Page | Công khai (Public) | `landing-page-root` |
| `/app` | `App.tsx` | **Không gian làm việc chính:** Bố cục cửa sổ kéo thả tự do, Pomodoro, Nhiệm vụ, Ghi chú, Âm thanh, 101 Cảnh quan | Công khai (Khách & Thành viên) | `workspace-root` |
| `/login` | `AuthView.tsx` | Đăng nhập tài khoản bằng Email/Mật khẩu hoặc Google Sign-In | Công khai | `auth-view-root` |
| `/signup` | `AuthView.tsx` | Đăng ký tài khoản mới (tự động nhận 3 Năm PRO Beta) | Công khai | `auth-view-root` |
| `/billing` | `BillingView.tsx` | Bảng giá dịch vụ, chính sách phi lợi nhuận Demo Beta, Modal MoMo / VietQR Sandbox | Công khai | `billing-view-root` |
| `/subscription` | `BillingView.tsx` | Đường dẫn thay thế cho trang thanh toán | Công khai | `billing-view-root` |
| `/calendar` | `DedicatedCalendarView.tsx` | Lịch biểu Time-Blocking chuyên sâu từ 07:00 đến 22:00, liên kết phiên Pomodoro | Công khai | `calendar-view-root` |
| `/rooms/:roomId` | `StudyRoomView.tsx` | **Phòng học nhóm WebRTC Live:** Camera/Mic thật, chia sẻ màn hình, bảng vẽ Canvas, giơ tay, thả reaction | Công khai | `study-room-root` |
| `/room/:roomId` | `StudyRoomView.tsx` | Đường dẫn rút gọn cho phòng học nhóm | Công khai | `study-room-root` |
| `/dashboard` | `DashboardView.tsx` | Thống kê số phút tập trung, chuỗi ngày streak, biểu đồ tiến độ & lịch sử phiên học | Công khai | `dashboard-view` |
| `/history` | `DashboardView.tsx` | Lịch sử hoạt động và các phiên tập trung đã hoàn thành | Công khai | `dashboard-view` |
| `/profile` | `ProfileView.tsx` | Xem và chỉnh sửa thông tin cá nhân, avatar, gói quyền lợi PRO | Yêu cầu đăng nhập | `profile-view` |
| `/account/security` | `AccountSecurityView.tsx` | Quản lý phương thức xác thực, đổi mật khẩu, liên kết Google | Yêu cầu đăng nhập | `account-security-view` |
| `/settings` | `SettingsView.tsx` | Cài đặt thời lượng Pomodoro, âm thanh chuông báo, giao diện kính, phím tắt | Công khai | `settings-view` |
| `/privacy-data` | `PrivacyDataView.tsx` | Quản lý dữ liệu Local-First: xuất JSON, xóa dữ liệu thiết bị, đối chiếu cloud | Công khai | `privacy-data-view` |
| `/help` | `HelpView.tsx` | Bảng phím tắt toàn cục, quy trình khoa học Pomodoro, FAQs và liên hệ hỗ trợ | Công khai | `help-view` |
| `/contact` | `ContactView.tsx` | **Trang liên hệ chính thức:** Email `namho03052k9@gmail.com`, Hotline `0704 862 629`, Form gửi góp ý | Công khai | `contact-view` |
| `/terms` | `LegalViews.tsx` | Điều khoản dịch vụ và cam kết bảo vệ người dùng | Công khai | `legal-views-root` |
| `/privacy` | `LegalViews.tsx` | Chính sách quyền riêng tư dữ liệu | Công khai | `legal-views-root` |
| `/about` | `LegalViews.tsx` | Giới thiệu dự án và triết lý phát triển PomoFocus | Công khai | `legal-views-root` |
| `*` (Tất cả route khác) | `NotFoundView.tsx` | Trang báo lỗi 404 thân thiện, có nút quay về Không Gian Làm Việc | Công khai | `not-found-view` |

---

## 2. MA TRẬN TÍNH NĂNG CỐT LÕI (CORE FEATURE MATRIX)

### 1. Đồng Hồ Pomodoro (Timer Engine)
- **Chu kỳ khoa học:** 25 phút tập trung / 5 phút nghỉ ngắn / 15 phút nghỉ dài (có thể tùy biến trong Cài đặt).
- **Độ chính xác:** Bộ đếm thời gian được chạy trên Web Worker và Service Worker độc lập, chống trôi thời gian khi tab bị ẩn hoặc màn hình tắt.
- **Smart Collapse:** Thu nhỏ thành thanh điều khiển Mini 52px đầy đủ nút Play/Pause, thời gian đếm ngược và nhãn nhiệm vụ.
- **Mini Pill (Dynamic Island):** Hỗ trợ chế độ viên thuốc nổi 190x52px nhỏ gọn.

### 2. Âm Thanh Môi Trường & Nhạc Lofi (Audio & Media)
- **GlobalAudioHost:** Âm thanh phát nền toàn cục không ngắt quãng kể cả khi đóng widget.
- **React Portal YouTube:** Iframe YouTube được đưa trực tiếp vào vùng hiển thị của widget, di chuyển tức thời theo GPU ở 60fps mà không bị trôi lệch hay lag.
- **Bộ trộn âm thanh (Mixer):** Hòa âm nhiều nguồn tiếng mưa, sóng biển, gió rít, quán cà phê, bàn phím cơ với thanh chỉnh âm lượng riêng.

### 3. Phòng Học Nhóm Trực Tuyến (Study Room)
- **Hardware Integration:** Kết nối trực tiếp Camera và Microphone qua `getUserMedia`.
- **Screen Sharing:** Chia sẻ toàn màn hình hoặc cửa sổ ứng dụng qua `getDisplayMedia`.
- **Canvas Whiteboard:** Bảng vẽ tương tác 960x540 với 5 màu mực, công cụ tẩy, chỉnh độ dày nét và xuất file PNG.
- **Tương tác trực tiếp:** Bật/tắt giơ tay phát biểu, thả biểu cảm nổi (`🔥, ☕, 📚, 👏`), khung chat nội bộ.

### 4. Quản Lý Nhiệm Vụ & Ghi Chú (Tasks & Notes)
- **Dexie IndexedDB:** Lưu trữ tức thì không cần mạng, dữ liệu thuộc về người dùng.
- **Task Binding:** Liên kết nhiệm vụ trực tiếp vào hiệp Pomodoro đang chạy.
- **Quick Notes:** Bảng ghi chú nhanh định dạng phong phú.

### 5. Thanh Toán & Đặc Quyền Demo Beta
- **VietQR 320px:** Hiển thị mã QR chuẩn kích thước 320x320px kèm vùng trắng an toàn, hỗ trợ mở ảnh gốc trong tab mới.
- **Cảnh báo minh bạch:** Nhãn đỏ "DEMO BETA — KHÔNG CHUYỂN TIỀN THẬT".
- **Sandbox Testing:** Nút kích hoạt thử nghiệm Sandbox an toàn cho tester và bạn bè trải nghiệm.
- **PRO Beta 3 Năm:** Tự động áp dụng cho mọi tài khoản mới đăng ký.
- **PRO Trọn Đời:** Tự động áp dụng cho tài khoản chủ sở hữu `namho03052k9@gmail.com`.
