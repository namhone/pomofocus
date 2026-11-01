import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  DEFAULT_MOMO_CONFIG,
  buildCreatePaymentSignature,
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

    const orderId = `POMO_${Date.now()}_${userId.slice(0, 6)}`;
    const requestId = `REQ_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;

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

    // Chuẩn bị dữ liệu gửi sang MoMo API v2
    const config = DEFAULT_MOMO_CONFIG;
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'pomodoro-workspace-three.vercel.app';
    const baseUrl = `${protocol}://${host}`;

    const redirectUrl = returnUrl || `${baseUrl}/billing?orderId=${orderId}`;
    const ipnUrl = `${baseUrl}/api/momo/ipn`;
    const orderInfo = `PomoFocus PRO ${planTitle} - ${orderId}`;
    const extraData = Buffer.from(
      JSON.stringify({ userId, planType: planId, durationDays, userEmail })
    ).toString('base64');
    const requestType = 'captureWallet';

    const signature = buildCreatePaymentSignature({
      accessKey: config.accessKey,
      amount: finalPrice,
      extraData,
      ipnUrl,
      orderId,
      orderInfo,
      partnerCode: config.partnerCode,
      redirectUrl,
      requestId,
      requestType,
      secretKey: config.secretKey
    });

    const momoPayload = {
      partnerCode: config.partnerCode,
      partnerName: 'PomoFocus Meet',
      storeId: 'PomoFocusStore',
      requestId,
      amount: finalPrice,
      orderId,
      orderInfo,
      redirectUrl,
      ipnUrl,
      lang: 'vi',
      extraData,
      requestType,
      signature
    };

    // Gọi MoMo Gateway
    try {
      const momoRes = await fetch(config.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(momoPayload)
      });

      const momoData = await momoRes.json();

      if (momoData.resultCode === 0 && (momoData.payUrl || momoData.qrCodeUrl)) {
        return res.status(200).json({
          success: true,
          orderId,
          amount: finalPrice,
          payUrl: momoData.payUrl,
          qrCodeUrl: momoData.qrCodeUrl || momoData.payUrl,
          deeplink: momoData.deeplink || momoData.payUrl,
          isSandbox: false
        });
      }
    } catch (momoErr) {
      console.warn('MoMo Gateway API error, fallback to VietQR/Sandbox:', momoErr);
    }

    // Mã VietQR chuẩn ngân hàng Vietcombank tài khoản thực của chủ sở hữu
    const memo = `POMO_${orderId}`;
    const vcbQrUrl = `https://img.vietqr.io/image/vietcombank-106663385-compact2.png?amount=${finalPrice}&addInfo=${encodeURIComponent(memo)}&accountName=${encodeURIComponent('HO NGOC BAO NAM')}`;

    return res.status(200).json({
      success: true,
      orderId,
      amount: finalPrice,
      planId,
      durationDays,
      payUrl: vcbQrUrl,
      qrCodeUrl: vcbQrUrl,
      deeplink: `https://img.vietqr.io/image/vietcombank-106663385-compact2.png?amount=${finalPrice}&addInfo=${encodeURIComponent(memo)}&accountName=${encodeURIComponent('HO NGOC BAO NAM')}`,
      memo,
      bankInfo: {
        bankName: 'Vietcombank',
        accountNumber: '106663385',
        accountName: 'HO NGOC BAO NAM'
      },
      isSandbox: true,
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
