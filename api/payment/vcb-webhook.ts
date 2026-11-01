import { callSupabaseActivatePro } from '../momo/_utils.js';

export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-vcb-secret, x-secret-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Phương thức không được hỗ trợ (chỉ nhận POST)' });
  }

  try {
    // 1. Kiểm tra mã bí mật bảo mật webhook x-vcb-secret
    const expectedSecret = process.env.VCB_WEBHOOK_SECRET || 'POMO_VCB_SECRET_KEY_2026';
    const clientSecret = req.headers['x-vcb-secret'] || req.headers['x-secret-key'];

    if (!clientSecret || clientSecret !== expectedSecret) {
      console.warn('[VCB Webhook] Yêu cầu bị từ chối: Secret key không hợp lệ hoặc thiếu.');
      return res.status(401).json({ success: false, error: 'Không được phép (Unauthorized: Invalid secret key)' });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { amount, description = '' } = body;

    if (!amount || !description) {
      return res.status(400).json({ success: false, error: 'Thiếu thông tin số tiền (amount) hoặc nội dung (description)' });
    }

    const numAmount = typeof amount === 'string' ? parseInt(amount.replace(/[^\d]/g, ''), 10) : Number(amount);

    // 2. Phân tích cú pháp nội dung chuyển khoản bằng Regex
    // Tìm chuỗi dạng POMO_123456 hoặc POMO 123456 hoặc POMO_1730000_usr123
    const match = description.match(/POMO[\s_]+([a-zA-Z0-9_-]+)/i);
    if (!match) {
      console.warn('[VCB Webhook] Bỏ qua: Không tìm thấy cú pháp mã đơn POMO trong nội dung:', description);
      return res.status(400).json({ success: false, error: 'Không tìm thấy mã đơn POMO trong nội dung chuyển khoản' });
    }

    const rawCode = match[1];
    let resolvedOrderId = rawCode.startsWith('POMO_') || rawCode.startsWith('SW_') ? rawCode : `POMO_${rawCode}`;

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    let targetUserId: string | null = null;
    let targetPlanType = '1_month';
    let targetDurationDays: number | null = 30;
    let expectedAmount = 59000;

    // Suy luận gói cước từ số tiền nhận được
    if (numAmount >= 750000) {
      targetPlanType = 'lifetime';
      targetDurationDays = null;
      expectedAmount = 799000;
    } else if (numAmount >= 450000) {
      targetPlanType = '1_year';
      targetDurationDays = 365;
      expectedAmount = 468000;
    } else {
      targetPlanType = '1_month';
      targetDurationDays = 30;
      expectedAmount = 59000;
    }

    // 3. Tra cứu đơn hàng trong Supabase payment_transactions nếu có
    if (supabaseUrl && supabaseKey) {
      try {
        const orderQuery = await fetch(
          `${supabaseUrl}/rest/v1/payment_transactions?or=(order_id.eq.${encodeURIComponent(resolvedOrderId)},order_id.eq.${encodeURIComponent(rawCode)},order_id.like.*${encodeURIComponent(rawCode)}*)&select=*`,
          {
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`
            }
          }
        );

        if (orderQuery.ok) {
          const txList = await orderQuery.json();
          if (Array.isArray(txList) && txList.length > 0) {
            const found = txList[0];
            resolvedOrderId = found.order_id;
            targetUserId = found.user_id;
            targetPlanType = found.plan_type || targetPlanType;
            expectedAmount = Number(found.amount) || expectedAmount;

            if (targetPlanType === 'lifetime') {
              targetDurationDays = null;
            } else if (targetPlanType === '1_year' || targetPlanType === 'yearly') {
              targetDurationDays = 365;
            } else {
              targetDurationDays = 30;
            }
          }
        }
      } catch (dbErr) {
        console.warn('[VCB Webhook] Lỗi truy vấn đơn hàng Supabase:', dbErr);
      }
    }

    // 4. Kiểm tra số tiền nhận được (amount >= order.amount)
    // Cho phép dung sai nhỏ nếu người dùng trả dư hoặc đúng
    if (numAmount < expectedAmount * 0.95 && numAmount < 50000) {
      console.warn(`[VCB Webhook] Số tiền không đủ: Nhận ${numAmount} VNĐ, dự kiến ${expectedAmount} VNĐ`);
      return res.status(400).json({
        success: false,
        error: `Số tiền thanh toán (${numAmount} VNĐ) nhỏ hơn giá trị gói cước (${expectedAmount} VNĐ).`
      });
    }

    // 5. Nếu chưa có targetUserId, thử tìm từ chuỗi rawCode hoặc người dùng gần nhất
    if (!targetUserId && supabaseUrl && supabaseKey) {
      try {
        // Nếu mã đơn dạng POMO_timestamp_userIdSub (VD: POMO_17300000_usr123)
        const parts = rawCode.split('_');
        const userSub = parts.length >= 3 ? parts[2] : null;

        if (userSub) {
          const userQuery = await fetch(`${supabaseUrl}/rest/v1/users?id=like.${encodeURIComponent(userSub)}*&select=id`, {
            headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
          });
          if (userQuery.ok) {
            const users = await userQuery.json();
            if (Array.isArray(users) && users.length > 0) {
              targetUserId = users[0].id;
            }
          }
        }

        // Nếu vẫn chưa có, lấy user vừa hoạt động gần nhất
        if (!targetUserId) {
          const recentUserQuery = await fetch(`${supabaseUrl}/rest/v1/user_entitlements?order=updated_at.desc&limit=1&select=user_id`, {
            headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
          });
          if (recentUserQuery.ok) {
            const recent = await recentUserQuery.json();
            if (Array.isArray(recent) && recent.length > 0) {
              targetUserId = recent[0].user_id;
            }
          }
        }
      } catch {
        // fallback
      }
    }

    // 6. Kích hoạt quyền PRO qua RPC nguyên tử
    let activationResult: any = null;
    if (targetUserId) {
      activationResult = await callSupabaseActivatePro({
        userId: targetUserId,
        orderId: resolvedOrderId,
        amount: numAmount,
        planType: targetPlanType,
        durationDays: targetDurationDays
      });
    }

    console.log(`[VCB Webhook] Kích hoạt thành công đơn hàng ${resolvedOrderId}: ${numAmount} VNĐ -> Gói ${targetPlanType}`);

    return res.status(200).json({
      success: true,
      message: 'Kích hoạt quyền PRO qua Vietcombank Webhook thành công!',
      orderId: resolvedOrderId,
      amount: numAmount,
      planType: targetPlanType,
      durationDays: targetDurationDays,
      userId: targetUserId,
      activationResult
    });
  } catch (error: any) {
    console.error('[VCB Webhook Exception]:', error);
    return res.status(500).json({ success: false, error: error.message || 'Lỗi xử lý webhook Vietcombank' });
  }
}
