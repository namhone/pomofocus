import {
  callSupabaseActivatePro,
  savePendingOrder
} from './_utils.js';

interface RequestBody {
  userId?: string;
  userEmail?: string;
  orderId?: string;
  planId?: '1_month' | '1_year' | 'lifetime';
  couponCode?: string;
  returnUrl?: string;
}

export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Phương thức không được hỗ trợ (chỉ nhận POST)' });
  }

  try {
    const body: RequestBody = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { userId, planId = '1_month', couponCode } = body;

    // BUG-14 Remediation: Từ chối tuyệt đối khách chưa đăng nhập / guest khởi tạo đơn thanh toán
    if (!userId || typeof userId !== 'string' || userId.trim() === '' || userId === 'guest' || userId === 'guest_user' || userId === '00000000-0000-0000-0000-000000000000') {
      return res.status(401).json({ success: false, error: 'Yêu cầu đăng nhập tài khoản thật để tạo đơn hàng thanh toán' });
    }

    // Xác định thông tin gói
    let basePrice = 59000;
    let durationDays: number | null = 30;

    if (planId === '1_year') {
      basePrice = 468000;
      durationDays = 365;
    } else if (planId === 'lifetime') {
      basePrice = 799000;
      durationDays = null;
    }

    // Xử lý mã coupon
    let finalPrice = basePrice;
    let is100PercentFree = false;

    if (couponCode) {
      const codeUpper = couponCode.trim().toUpperCase();
      if (codeUpper === 'PRO50') {
        finalPrice = Math.round(basePrice * 0.5);
      } else if (codeUpper === 'VIP7DAYS') {
        is100PercentFree = true;
        durationDays = 7;
        finalPrice = 0;
      } else if (codeUpper === 'BOSSSECRET') {
        is100PercentFree = true;
        durationDays = null;
        finalPrice = 0;
      }
    }

    const shortCode = Math.floor(100000 + Math.random() * 900000);
    const orderId = (body.orderId && typeof body.orderId === 'string' && /^POMO_[A-Z0-9]{4,10}$/i.test(body.orderId.trim()))
      ? body.orderId.trim().toUpperCase()
      : `POMO_${shortCode}`;
    const memo = orderId;

    // Nếu mã giảm giá 100% (Coupon miễn phí) -> Tự động kích hoạt PRO trực tiếp không cần cổng MoMo
    if (is100PercentFree || finalPrice <= 0) {
      if (userId && userId !== 'guest_user') {
        await callSupabaseActivatePro({
          userId,
          orderId,
          amount: 0,
          planType: planId,
          durationDays
        });
      }

      return res.status(200).json({
        success: true,
        freeGranted: true,
        orderId,
        amount: 0,
        planId,
        durationDays,
        message: 'Kích hoạt thành công gói PRO thông qua quà tặng Coupon miễn phí!'
      });
    }

    // Lưu đơn hàng trạng thái pending vào Supabase để đón Webhook Vietcombank
    if (userId && userId !== 'guest_user') {
      await savePendingOrder({
        userId,
        orderId,
        amount: finalPrice,
        planType: planId
      });
    }

    // Mã VietQR chuẩn ngân hàng Vietcombank 1066633885 - HO NGOC BAO NAM (Tuyệt đối không dùng MB Bank)
    const bankCode = 'VPBank';
    const accountNo = 'AGBSPTJE34IA3A8SAAX';
    const accountName = 'HO NGOC BAO NAM';
    const vcbQrUrl = `https://vietqr.app/img?acc=${accountNo}&bank=${bankCode}&amount=${finalPrice}&des=${encodeURIComponent(memo)}`;

    return res.status(200).json({
      success: true,
      orderId,
      amount: finalPrice,
      planId,
      durationDays,
      payUrl: vcbQrUrl,
      qrCodeUrl: vcbQrUrl,
      deeplink: vcbQrUrl,
      memo,
      bankInfo: {
        bankName: 'VPBank',
        accountNumber: accountNo,
        accountName
      },
      message: 'Khởi tạo mã VietQR SePay VPBank thành công'
    });
  } catch (error: any) {
    console.error('Lỗi khởi tạo thanh toán MoMo:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi máy chủ khi tạo đơn hàng thanh toán'
    });
  }
}
