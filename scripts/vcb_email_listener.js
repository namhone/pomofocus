/**
 * ==============================================================================
 * GOOGLE APPS SCRIPT: LẮNG NGHE EMAIL BIÊN LAI / BIẾN ĐỘNG SỐ DƯ VIETCOMBANK
 * ==============================================================================
 * 
 * HƯỚNG DẪN CÀI ĐẶT 1 PHÚT (HOÀN TOÀN MIỄN PHÍ & TỰ ĐỘNG 100%):
 * 
 * 1. TRÊN APP VCB DIGIBANK (ĐIỆN THOẠI):
 *    - Mở VCB Digibank -> Vào "Cài đặt" -> "Quản lý thông báo"
 *    - Bật tùy chọn: "Nhận thông báo biến động số dư qua Email" (Miễn phí 100%).
 * 
 * 2. TRÊN MÁY TÍNH (TRÌNH DUYỆT):
 *    - Truy cập trang: https://script.google.com/
 *    - Bấm nút "+ Dự án mới" (New project).
 *    - Xóa hết code mẫu và dán toàn bộ nội dung file này vào.
 *    - Bấm biểu tượng đĩa mềm "Lưu dự án" (Ctrl + S).
 * 
 * 3. THIẾT LẬP KÍCH HOẠT TỰ ĐỘNG (TRIGGER CHẠY MỖI 1 PHÚT):
 *    - Ở thanh menu bên trái, bấm vào biểu tượng Đồng hồ ("Kích hoạt" / Triggers).
 *    - Bấm nút "+ Thêm trình kích hoạt" (Add Trigger) ở góc dưới cùng bên phải.
 *    - Chọn hàm: checkVietcombankEmails
 *    - Chọn nguồn sự kiện: "Theo thời gian" (Time-driven)
 *    - Chọn loại bộ đếm: "Bộ tính giờ theo phút" (Minutes timer)
 *    - Chọn khoảng thời gian: "Mỗi phút" (Every minute)
 *    - Bấm "Lưu" (Save) và cấp quyền đọc Gmail cho script khi được hỏi.
 * 
 * XONG! Khi khách quét VietQR gửi tiền vào tài khoản Vietcombank 1066633885,
 * email từ VCBDigibank@info.vietcombank.com.vn sẽ được script đọc trong vài giây 
 * và tự động mở khóa PRO cho khách ngay!
 * ==============================================================================
 */

function checkVietcombankEmails() {
  const SECRET_KEY = "POMO_VCB_SECRET_KEY_2026";
  const WEBHOOK_URL = "https://pomodoro-workspace-three.vercel.app/api/payment/vcb-webhook";

  try {
    // 1. Tìm đúng email từ Vietcombank (cả biên lai điện tử và biến động số dư)
    const searchQuery = '(from:info.vietcombank.com.vn OR from:vietcombank.com.vn) is:unread';
    const threads = GmailApp.search(searchQuery, 0, 10);

    for (const thread of threads) {
      const messages = thread.getMessages();
      for (const msg of messages) {
        if (msg.isUnread()) {
          const body = msg.getPlainBody();

          // 2. Tìm mã đơn hàng POMO (ví dụ: POMO_173000... hoặc POMO 123456)
          const descMatch = body.match(/POMO[\s_]+[a-zA-Z0-9_-]+/i);

          // 3. Tìm số tiền (ví dụ: 59,000 VND hoặc 616,827 VND)
          const amountMatch = body.match(/([0-9.,]+)\s*VND/i);

          if (descMatch && amountMatch) {
            const rawAmount = amountMatch[1].replace(/[.,]/g, '');
            const description = descMatch[0];

            Logger.log("Phat hien don hang: " + description + " - So tien: " + rawAmount);

            // 4. Bắn Webhook sang Vercel để kích hoạt PRO tự động
            try {
              const response = UrlFetchApp.fetch(WEBHOOK_URL, {
                method: 'post',
                contentType: 'application/json',
                headers: { 'x-vcb-secret': SECRET_KEY },
                payload: JSON.stringify({
                  amount: parseInt(rawAmount, 10),
                  description: description,
                  emailSubject: msg.getSubject(),
                  receivedAt: msg.getDate().toISOString()
                }),
                muteHttpExceptions: true
              });

              Logger.log("Vercel phan hoi: " + response.getContentText());

              // Đánh dấu đã đọc để không xử lý lại
              msg.markRead();
            } catch (err) {
              Logger.log("Loi khi goi Webhook: " + err.toString());
            }
          }
        }
      }
    }
  } catch (error) {
    Logger.log("Lỗi trong quá trình kiểm tra email VCB: " + error.toString());
  }
}
