/**
 * ==============================================================================
 * GOOGLE APPS SCRIPT: LẮNG NGHE EMAIL BIẾN ĐỘNG SỐ DƯ VIETCOMBANK & LIÊN NGÂN HÀNG (V8.3 REMEDIATED)
 * ==============================================================================
 * 
 * BẢN GIA CỐ BẢO MẬT & CHỐNG SÓT ĐƠN (BUG-23 & CREDIT PACK TOP-UP):
 * - Bảo mật: Đọc secret key từ Script Properties (POMO_VCB_SECRET_KEY) thay vì hardcode.
 * - Chống sót email luồng (Thread Blackout): Lưu và đối soát theo từng Message ID
 *   thay vì Thread ID, sử dụng bộ đệm vòng (ring buffer) trong Script Properties.
 * - Hỗ trợ liên ngân hàng: Mở rộng bộ lọc người gửi và regex nhận diện nội dung
 *   chuyển khoản từ MB Bank, Techcombank, ACB, VPBank, TPBank, MoMo, Vietcombank.
 * - Hỗ trợ cả 2 hàm định danh trigger: checkVietcombankEmails và processVcbEmails.
 * - LockService.getScriptLock() chống chạy đồng thời.
 * ==============================================================================
 */

/**
 * Alias tương thích ngược cho trigger định danh processVcbEmails
 */
function processVcbEmails() {
  return checkVietcombankEmails();
}

function getProcessedMessageIds() {
  const raw = PropertiesService.getScriptProperties().getProperty('PROCESSED_MESSAGE_IDS');
  try {
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function addProcessedMessageId(msgId) {
  const ids = getProcessedMessageIds();
  if (!ids.includes(msgId)) {
    ids.push(msgId);
    if (ids.length > 300) ids.shift(); // Giữ tối đa 300 message IDs gần nhất
    PropertiesService.getScriptProperties().setProperty('PROCESSED_MESSAGE_IDS', JSON.stringify(ids));
  }
}

function checkVietcombankEmails() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const SECRET_KEY = scriptProperties.getProperty('POMO_VCB_SECRET_KEY') || scriptProperties.getProperty('VCB_WEBHOOK_SECRET');
  if (!SECRET_KEY) {
    Logger.log("LỖI: Chưa cấu hình POMO_VCB_SECRET_KEY trong Script Properties (Project Settings > Script Properties).");
    return;
  }

  const WEBHOOK_URL = scriptProperties.getProperty('PAYMENT_WEBHOOK_URL') || "https://pomofocus-workspace.vercel.app/api/payment/webhook";
  const PROCESSED_LABEL = "VcbProcessed";
  const MAX_BATCH_SIZE = 15;

  // 1. Khóa chống chạy đồng thời (Timeout 10 giây nếu trigger trước chưa kết thúc)
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    Logger.log("Trigger khác đang chạy, bỏ qua lượt này để tránh trùng lặp.");
    return;
  }

  try {
    // 2. Tạo hoặc lấy nhãn hiển thị trong Gmail để tiện theo dõi trực quan
    let label = GmailApp.getUserLabelByName(PROCESSED_LABEL);
    if (!label) {
      label = GmailApp.createLabel(PROCESSED_LABEL);
    }

    // 3. Mở rộng bộ lọc người gửi từ các ngân hàng lớn & ví MoMo
    const BANK_SENDERS = [
      'from:info.vietcombank.com.vn',
      'from:vietcombank.com.vn',
      'from:mbbank.com.vn',
      'from:techcombank.com.vn',
      'from:techcombank.vn',
      'from:acb.com.vn',
      'from:vpbank.com.vn',
      'from:tpb.com.vn',
      'from:momo.vn'
    ].join(' OR ');

    // QUAN TRỌNG: KHÔNG dùng -label:VcbProcessed trong search query để tránh bỏ sót email mới cùng thread!
    const searchQuery = '(' + BANK_SENDERS + ') is:unread newer_than:2d';
    const threads = GmailApp.search(searchQuery, 0, MAX_BATCH_SIZE);

    if (threads.length === 0) {
      Logger.log("Không có email biến động số dư mới cần xử lý.");
      return;
    }

    Logger.log("Tìm thấy " + threads.length + " luồng email cần kiểm tra.");
    const processedIds = getProcessedMessageIds();

    for (const thread of threads) {
      const messages = thread.getMessages();
      for (const msg of messages) {
        if (!msg.isUnread()) continue;

        const msgId = msg.getId();
        if (processedIds.includes(msgId)) {
          msg.markRead();
          continue;
        }

        try {
          const body = msg.getPlainBody();
          const subject = msg.getSubject();
          const combinedText = subject + "\n" + body;

          // Tìm mã đơn hàng (Hỗ trợ định dạng MB, Techcombank, ACB, VPBank, TPBank, MoMo):
          // Ưu tiên 1: Chuẩn Base36 7 ký tự nạp Credits (VD: PF8M2K9, PF9K2A8, ND: PF9K2A8, NAPAS PF9K2A8)
          const base36Match = combinedText.match(/(?:^|[^a-zA-Z0-9])(PF[2-9A-HJ-NP-Z]{5})(?:[^a-zA-Z0-9]|$)/i) ||
                               combinedText.match(/(?:ND|GD|CT|NAPAS|MOMO|IB)?[:\s\\/._-]*(PF[2-9A-Z]{5})\b/i);
          // Ưu tiên 2: Cú pháp cũ POMO_xxxxxx hoặc SW_xxxxxx kích hoạt gói PRO
          const legacyMatch = combinedText.match(/(?:POMO|SW)[\s_.-]*(\d{6})\b/i);
          const generalMatch = combinedText.match(/(?:POMO|SW)[\s_.-]+([a-zA-Z0-9_-]+)/i);

          const orderCode = base36Match
            ? (base36Match[1] || base36Match[0]).toUpperCase().trim()
            : legacyMatch
            ? 'POMO_' + legacyMatch[1]
            : generalMatch
            ? generalMatch[0].replace(/\s+/g, '_').toUpperCase()
            : null;

          // Tìm số tiền giao dịch đa ngân hàng (Hỗ trợ định dạng "+10,000 VND", "10.000 đ", "Số tiền: 10,000")
          const amountMatch = combinedText.match(/(?:\+)?([0-9]{1,3}(?:[.,][0-9]{3})+|[0-9]+)\s*(?:VND|VNĐ|đ|d)(?![a-zA-Z0-9])/i) ||
                              combinedText.match(/(?:Số tiền|phát sinh|biến động|thay đổi|GD)[:\s]+(?:\+)?([0-9]{1,3}(?:[.,][0-9]{3})+|[0-9]+)/i) ||
                              combinedText.match(/Số tiền giao dịch:?\s*(?:\+)?([0-9.,]+)/i);

          if (orderCode && amountMatch) {
            const rawAmount = (amountMatch[1] || amountMatch[0]).replace(/[^0-9]/g, '');
            const transferAmount = parseInt(rawAmount, 10);

            Logger.log("Đang kích hoạt đơn: " + orderCode + " - Số tiền: " + transferAmount + " (Msg ID: " + msgId + ")");

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
                description: orderCode,
                transferAmount: transferAmount,
                amount: transferAmount,
                emailSubject: subject,
                receivedAt: msg.getDate().toISOString(),
                gateway: 'VietQR_MultiBank'
              }),
              muteHttpExceptions: true
            });

            const statusCode = response.getResponseCode();
            const responseText = response.getContentText();
            Logger.log("Vercel HTTP " + statusCode + ": " + responseText);

            if (statusCode === 200) {
              msg.markRead();
              addProcessedMessageId(msgId);
              thread.addLabel(label);
            }
          } else {
            // Email từ ngân hàng nhưng không chứa thông tin thanh toán PomoFocus (OTP, tiếp thị...)
            // Đánh dấu đã đọc và lưu msgId để không duyệt lại
            msg.markRead();
            addProcessedMessageId(msgId);
            thread.addLabel(label);
          }
        } catch (msgErr) {
          Logger.log("Lỗi xử lý email đơn lẻ (" + msgId + "): " + msgErr.toString());
        }
      }
    }
  } catch (error) {
    Logger.log("Lỗi tổng quát khi kiểm tra email ngân hàng: " + error.toString());
  } finally {
    lock.releaseLock();
  }
}
