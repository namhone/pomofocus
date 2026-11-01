/**
 * ==============================================================================
 * GOOGLE APPS SCRIPT: LẮNG NGHE EMAIL BIẾN ĐỘNG SỐ DƯ VIETCOMBANK & KÍCH HOẠT PRO
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
 *    - Chọn hàm: `checkVietcombankEmails`
 *    - Chọn nguồn sự kiện: "Theo thời gian" (Time-driven)
 *    - Chọn loại bộ đếm: "Bộ tính giờ theo phút" (Minutes timer)
 *    - Chọn khoảng thời gian: "Mỗi phút" (Every minute)
 *    - Bấm "Lưu" (Save) và cấp quyền đọc Gmail cho script khi được hỏi.
 * 
 * XONG! Khi khách quét VietQR gửi tiền vào tài khoản Vietcombank 106663385,
 * email VCB sẽ được script đọc trong vài giây và tự động mở khóa PRO cho khách ngay!
 * ==============================================================================
 */

function checkVietcombankEmails() {
  // Khóa bí mật đồng bộ với Vercel Environment (VCB_WEBHOOK_SECRET)
  var SECRET_KEY = "POMO_VCB_SECRET_KEY_2026";
  
  // URL Webhook của dự án trên Vercel
  var WEBHOOK_URL = "https://pomodoro-workspace-three.vercel.app/api/payment/vcb-webhook";

  try {
    // Tìm các email chưa đọc từ ngân hàng Vietcombank thông báo biến động số dư
    var searchQuery = 'from:vietcombank.com.vn is:unread';
    var threads = GmailApp.search(searchQuery, 0, 10);

    for (var i = 0; i < threads.length; i++) {
      var messages = threads[i].getMessages();
      for (var j = 0; j < messages.length; j++) {
        var msg = messages[j];
        if (msg.isUnread()) {
          var body = msg.getPlainBody();

          // Regex trích xuất số tiền và nội dung chuyển khoản từ email VCB
          // Hỗ trợ định dạng: "+59,000 VND" hoặc "59.000 VND" hoặc "59,000 VND"
          var amountMatch = body.match(/([0-9.,]+)\s*VND/i);
          var descMatch = body.match(/POMO[\s_]+[a-zA-Z0-9_-]+/i);

          if (amountMatch && descMatch) {
            var rawAmount = amountMatch[1].replace(/[.,]/g, '');
            var description = descMatch[0];

            Logger.log("Phát hiện giao dịch VCB: " + rawAmount + " VND, Nội dung: " + description);

            // Gửi Webhook sang Vercel để kích hoạt quyền PRO ngay lập tức
            var payload = JSON.stringify({
              amount: parseInt(rawAmount, 10),
              description: description,
              emailSubject: msg.getSubject(),
              receivedAt: msg.getDate().toISOString()
            });

            var options = {
              method: 'post',
              contentType: 'application/json',
              headers: {
                'x-vcb-secret': SECRET_KEY
              },
              payload: payload,
              muteHttpExceptions: true
            };

            var response = UrlFetchApp.fetch(WEBHOOK_URL, options);
            Logger.log("Phản hồi từ Vercel Webhook: " + response.getResponseCode() + " - " + response.getContentText());

            // Đánh dấu email đã đọc để tuyệt đối không xử lý lặp lại
            msg.markRead();
          }
        }
      }
    }
  } catch (error) {
    Logger.log("Lỗi trong quá trình kiểm tra email VCB: " + error.toString());
  }
}
