/**
 * ==============================================================================
 * GOOGLE APPS SCRIPT: LẮNG NGHE EMAIL BIẾN ĐỘNG SỐ DƯ VIETCOMBANK (V8.1 HARDENED)
 * ==============================================================================
 * 
 * BẢN GIA CỐ CHỐNG TREO 6 PHÚT / SERVER ERROR:
 * - Dùng LockService.getScriptLock() chống chạy đè (concurrency collision).
 * - Thu hẹp truy vấn: chỉ quét email chưa đọc trong 2 ngày qua (newer_than:2d).
 * - Sử dụng nhãn VcbProcessed gắn ngay khi Vercel trả về 200 OK.
 * - Giới hạn batch tối đa 15 email mỗi lần chạy, bọc try-catch từng email.
 * - Hỗ trợ cả mã đơn Base36 7 ký tự (PFxxxxx) và mã POMO_xxxxxx.
 * ==============================================================================
 */

function checkVietcombankEmails() {
  const SECRET_KEY = "POMO_VCB_SECRET_KEY_2026";
  const WEBHOOK_URL = "https://pomofocus-workspace.vercel.app/api/payment/webhook";
  const PROCESSED_LABEL = "VcbProcessed";
  const MAX_BATCH_SIZE = 15;

  // 1. Khóa chống chạy đồng thời (Timeout 10 giây nếu trigger trước chưa kết thúc)
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    Logger.log("Trigger khác đang chạy, bỏ qua lượt này để tránh trùng lặp.");
    return;
  }

  try {
    // 2. Tạo hoặc lấy nhãn đã xử lý
    let label = GmailApp.getUserLabelByName(PROCESSED_LABEL);
    if (!label) {
      label = GmailApp.createLabel(PROCESSED_LABEL);
    }

    // 3. Thu hẹp truy vấn chính xác: Chưa đọc, từ Vietcombank, trong vòng 2 ngày gần nhất, chưa có nhãn VcbProcessed
    const searchQuery = '(from:info.vietcombank.com.vn OR from:vietcombank.com.vn) is:unread newer_than:2d -label:' + PROCESSED_LABEL;
    const threads = GmailApp.search(searchQuery, 0, MAX_BATCH_SIZE);

    if (threads.length === 0) {
      Logger.log("Không có email Vietcombank mới cần xử lý.");
      return;
    }

    Logger.log("Tìm thấy " + threads.length + " luồng email cần kiểm tra.");

    for (const thread of threads) {
      const messages = thread.getMessages();
      for (const msg of messages) {
        if (!msg.isUnread()) continue;

        try {
          const body = msg.getPlainBody();
          const subject = msg.getSubject();

          // Tìm mã đơn hàng:
          // Ưu tiên 1: Chuẩn Base36 7 ký tự (VD: PF8M2K9, PF9K2A8)
          // Ưu tiên 2: Cú pháp cũ POMO_xxxxxx hoặc SW_xxxxxx
          const base36Match = body.match(/PF[2-9A-Z]{5}/i) || subject.match(/PF[2-9A-Z]{5}/i);
          const legacyMatch = body.match(/(?:POMO|SW)[\s_]*(\d{6})/i) || subject.match(/(?:POMO|SW)[\s_]*(\d{6})/i);
          const generalMatch = body.match(/(?:POMO|SW)[\s_]+[a-zA-Z0-9_-]+/i);

          const orderCode = base36Match
            ? base36Match[0].toUpperCase()
            : legacyMatch
            ? 'POMO_' + legacyMatch[1]
            : generalMatch
            ? generalMatch[0].replace(/\s+/g, '_').toUpperCase()
            : null;

          // Tìm số tiền giao dịch: Hỗ trợ "19,000 VND", "+59,000 VND", "100.000 VND"
          const amountMatch = body.match(/(?:\+)?([0-9.,]+)\s*VND/i) || body.match(/Số tiền giao dịch:?\s*(?:\+)?([0-9.,]+)/i);

          if (orderCode && amountMatch) {
            const rawAmount = amountMatch[1].replace(/[.,]/g, '');
            const transferAmount = parseInt(rawAmount, 10);

            Logger.log("Đang kích hoạt đơn: " + orderCode + " - Số tiền: " + transferAmount);

            // Bắn Webhook sang backend Vercel với timeout 15 giây
            const response = UrlFetchApp.fetch(WEBHOOK_URL, {
              method: 'post',
              contentType: 'application/json',
              headers: { 
                'x-vcb-secret': SECRET_KEY,
                'x-api-key': SECRET_KEY
              },
              payload: JSON.stringify({
                orderCode: orderCode,
                content: orderCode,
                transferAmount: transferAmount,
                amount: transferAmount,
                emailSubject: subject,
                receivedAt: msg.getDate().toISOString(),
                gateway: 'VietQR_VCB'
              }),
              muteHttpExceptions: true
            });

            const statusCode = response.getResponseCode();
            const responseText = response.getContentText();
            Logger.log("Vercel HTTP " + statusCode + ": " + responseText);

            if (statusCode === 200) {
              // Gắn nhãn đã xử lý & đánh dấu đã đọc
              msg.markRead();
              thread.addLabel(label);
            }
          } else {
            // Email từ Vietcombank nhưng không có nội dung chuyển khoản mua PomoFocus (email tin tức, OTP...)
            // Đánh dấu đã đọc và gắn nhãn để không quét lại gây chậm vòng lặp
            msg.markRead();
            thread.addLabel(label);
          }
        } catch (msgErr) {
          Logger.log("Lỗi xử lý email đơn lẻ: " + msgErr.toString());
        }
      }
    }
  } catch (error) {
    Logger.log("Lỗi tổng quát khi kiểm tra email VCB: " + error.toString());
  } finally {
    lock.releaseLock();
  }
}
