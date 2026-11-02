# PomoFocus Workspace v1.0.0 — Official Production Launch 🚀

Chào mừng phiên bản phát hành chính thức đầu tiên của **PomoFocus Workspace** — Không gian học tập ảo tối giản, tập trung cao độ lấy cảm hứng từ LifeAt, Vercel và Linear.

🌐 **Trang web chính thức:** [pomofocus-workspace.vercel.app](https://pomofocus-workspace.vercel.app)

---

### ✨ Tính Năng Nổi Bật (Highlights)

* **Phong cách Stealth Monochrome tối giản**: Toàn bộ giao diện được thiết kế theo gam màu Đen - Trắng - Xám hiện đại, loại bỏ hoàn toàn các màu sắc chói mắt, giúp tối ưu sự tập trung và giảm mỏi mắt khi học lâu.
* **Bộ ba Widget không gian làm việc**:
  * **Đồng hồ Pomodoro**: Cấu hình thời gian linh hoạt (25/5/15 phút), chế độ tự động chuyển hiệp và âm báo hoàn thành.
  * **Sổ tay ghi chú**: Hỗ trợ định dạng văn bản tức thì, lưu trữ tự động trên đám mây.
  * **Quản lý nhiệm vụ (Tasks)**: Theo dõi tiến độ công việc theo danh sách ưu tiên.
* **Phòng học nhóm thời gian thực (WebRTC Mesh Study Rooms)**:
  * Kết nối âm thanh/hình ảnh P2P đa điểm mượt mà với cơ chế tự phục hồi kết nối (ICE Restart) và nhịp tim 90 giây chống rớt mạng trên thiết bị di động.
  * **Bảng vẽ cộng tác (Whiteboard Pro)**: Hỗ trợ vẽ nét mượt, tẩy, chèn tài liệu và xuất ảnh. Dải webcam người tham gia có thể kéo thả linh hoạt.
  * **Cửa sổ âm thanh & YouTube nổi (Persistent 16:9 PiP)**: Nghe nhạc Lo-Fi hoặc đồng bộ video YouTube mà không bị gián đoạn hay tải lại khi thu nhỏ.
* **Bảo mật chuẩn cấp doanh nghiệp**:
  * Xác thực 2 bước bằng mã thời gian thực (**TOTP / Google Authenticator RFC 6238**) với mã QR vector SVG sắc nét và 8 mã dự phòng khẩn cấp.
  * Đồng bộ phiên đăng nhập an toàn qua Supabase Auth.
* **Thanh toán tự động 100% qua VietQR Vietcombank**:
  * Tích hợp mã QR động tài khoản Vietcombank (`1066633885` - `HO NGOC BAO NAM`), xác thực giao dịch tức thì qua webhook email tự động.
* **PWA & Cơ chế nạp phiên bản mới tức thì**:
  * Service Worker `v3.0.0` với cấu hình chống lưu cache cũ, tự động nạp bản cập nhật mới nhất cho người dùng.

---

### 🧪 Chất Lượng & Kiểm Thử (QA Report)

* **Unit & Integration Suite**: Đạt `251 / 251` bài test (100% PASS trên Vitest).
* **End-to-End Browser Automation**: Vượt qua toàn bộ các kịch bản tự động hóa Playwright trên trình duyệt Chrome thật.
* **Production Build**: Biên dịch tối ưu, chia nhỏ mã nguồn và nén tĩnh không phát sinh lỗi cảnh báo.

---

*Trân trọng cảm ơn toàn bộ quá trình phát triển và kiểm định nghiêm ngặt! Sẵn sàng cho giai đoạn tiếp theo: **v1.1.0 AI Study Companion**.*
