import {
  DEFAULT_MOMO_CONFIG,
  buildIpnSignature,
  callSupabaseActivatePro
} from './_utils.js';

export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const {
      partnerCode,
      orderId,
      requestId,
      amount,
      orderInfo = '',
      orderType = '',
      transId = '',
      resultCode,
      message = '',
      payType = '',
      responseTime = Date.now(),
      extraData = '',
      signature,
      accessKey = DEFAULT_MOMO_CONFIG.accessKey
    } = payload;

    if (!orderId || !signature) {
      return res.status(400).json({ message: 'Thiếu thông tin đơn hàng hoặc chữ ký' });
    }

    // 1. Xác minh chữ ký số HMAC-SHA256 bảo vệ Webhook IPN
    const expectedSignature = buildIpnSignature({
      accessKey,
      amount,
      extraData,
      message,
      orderId,
      orderInfo,
      orderType,
      partnerCode,
      payType,
      requestId,
      responseTime,
      resultCode,
      transId,
      secretKey: DEFAULT_MOMO_CONFIG.secretKey
    });

    if (signature !== expectedSignature) {
      console.error('[MoMo IPN Security] Chữ ký không hợp lệ! Từ chối xử lý đơn hàng:', orderId);
      return res.status(400).json({ message: 'Invalid signature' });
    }

    // 2. Kiểm tra kết quả thanh toán từ MoMo
    if (Number(resultCode) === 0) {
      let parsedExtra: any = {};
      try {
        const decodedStr = Buffer.from(extraData, 'base64').toString('utf-8');
        parsedExtra = JSON.parse(decodedStr);
      } catch {
        try {
          parsedExtra = JSON.parse(extraData);
        } catch {
          parsedExtra = {};
        }
      }

      const userId = parsedExtra.userId;
      const planType = parsedExtra.planType || '1_month';
      const durationDays = parsedExtra.durationDays !== undefined ? parsedExtra.durationDays : 30;

      console.log(`[MoMo IPN] Thanh toán thành công cho đơn hàng ${orderId}, người dùng: ${userId}, gói: ${planType}`);

      if (userId && userId !== 'guest_user') {
        const dbResult = await callSupabaseActivatePro({
          userId,
          orderId,
          amount: Number(amount) || 0,
          planType,
          durationDays
        });

        if (!dbResult.success) {
          console.error('[MoMo IPN] Lỗi gọi activate_pro_subscription RPC:', dbResult.error);
        }
      }
    } else {
      console.warn(`[MoMo IPN] Giao dịch không thành công hoặc người dùng hủy đơn: resultCode=${resultCode}, orderId=${orderId}`);
    }

    // MoMo yêu cầu phản hồi HTTP 204 No Content hoặc JSON { resultCode: 0 }
    return res.status(200).json({ resultCode: 0, message: 'Success' });
  } catch (err: any) {
    console.error('[MoMo IPN Exception]:', err);
    return res.status(500).json({ message: err.message || 'Internal Server Error' });
  }
}
