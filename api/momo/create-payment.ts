import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  callSupabaseActivatePro,
  savePendingOrder
} from './_utils.js';

interface RequestBody {
  userId?: string;
  userEmail?: string;
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
    const { userId = 'guest_user', userEmail = 'student@studyworkspace.io', planId = '1_month', couponCode, returnUrl } = body;

    // Xác định thông tin gói
    let basePrice = 59000;
    let durationDays: number | null = 30;
    let planTitle = '1 Tháng';

    if (planId === '1_year') {
      basePrice = 468000;
      durationDays = 365;
      planTitle = '1 Năm';
    } else if (planId === 'lifetime') {
      basePrice = 799000;
      durationDays = null;
      planTitle = 'Trọn Đời';
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
    const orderId = `POMO_${shortCode}`;
    const memo = `POMO_${shortCode}`;

    // Nếu mã giảm giá 100% (Coupon miễn phí) -> Tự động kích hoạt PRO trực tiếp không cần cổng MoMo
    if (is100PercentFree || finalPrice <= 0) {
      if (userId && userId !== 'guest_user') {
        await callSupabaseActivatePro({
          userId,
          orderId: `POMO_${orderId}`,
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
        orderId: `POMO_${orderId}`,
        amount: finalPrice,
        planType: planId
      });
    }

    // Mã VietQR chuẩn ngân hàng Vietcombank 1066633885 - HO NGOC BAO NAM (Tuyệt đối không dùng MB Bank)
    const bankCode = 'vietcombank';
    const accountNo = '1066633885';
    const accountName = 'HO NGOC BAO NAM';
    const vcbQrUrl = `https://img.vietqr.io/image/${bankCode}-${accountNo}-compact2.png?amount=${finalPrice}&addInfo=${encodeURIComponent(memo)}&accountName=${encodeURIComponent(accountName)}`;

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
        bankName: 'Vietcombank',
        accountNumber: accountNo,
        accountName
      },
      message: 'Khởi tạo mã VietQR Vietcombank thành công'
    });
  } catch (error: any) {
    console.error('Lỗi khởi tạo thanh toán MoMo:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi máy chủ khi tạo đơn hàng thanh toán'
    });
  }
}
