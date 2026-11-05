import type { VercelRequest, VercelResponse } from '@vercel/node';

const WEBHOOK_SECRET = process.env.PAYMENT_WEBHOOK_SECRET || process.env.VCB_WEBHOOK_SECRET || 'POMO_VCB_SECRET_KEY_2026';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key, x-vcb-secret');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // 1. Xác thực bảo mật Webhook qua Header
    const authHeader =
      req.headers['x-api-key'] ||
      req.headers['x-vcb-secret'] ||
      req.headers.authorization;

    const isAuthorized =
      authHeader === WEBHOOK_SECRET ||
      authHeader === `Bearer ${WEBHOOK_SECRET}`;

    if (!isAuthorized) {
      console.warn('[Payment Webhook] Unauthorized request rejected.');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const transferAmount = Number(
      payload.transferAmount ||
      payload.amount ||
      (typeof payload.content === 'string' ? payload.amount : 0) ||
      0
    );
    const content = String(payload.content || payload.description || payload.reference || '');

    // 2. Quét mã đơn hàng Base36 7 ký tự (Ví dụ: 'PF9K2A8')
    const base36Match = content.match(/PF[2-9A-Z]{5}/i);
    // Hỗ trợ cả cú pháp cũ POMO_xxxxxx để đảm bảo không bị gián đoạn giao dịch
    const legacyMatch = content.match(/(?:POMO|SW)[\s_]*(\d{6})/i);

    const orderCode = base36Match
      ? base36Match[0].toUpperCase()
      : legacyMatch
      ? `POMO_${legacyMatch[1]}`
      : null;

    if (!orderCode) {
      return res.status(200).json({
        status: 'ignored',
        message: 'Nội dung giao dịch không chứa mã đơn hàng hợp lệ (PFxxxxx)'
      });
    }

    const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

    // 3. Xử lý cộng tiền Non-blocking (Tự động loại bỏ Retry đồng thời trong 1ms)
    if (supabaseUrl && supabaseKey) {
      const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/process_payment_by_order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({
          p_order_code: orderCode,
          p_gateway: payload.gateway || 'VietQR',
          p_transfer_amount: transferAmount
        })
      });

      if (rpcRes.ok) {
        const data = await rpcRes.json();
        if (data?.success) {
          return res.status(200).json({
            success: true,
            user_id: data.user_id,
            credits_added: data.credits_added
          });
        }
        // Nếu đã xử lý trước đó, trả về HTTP 200 ngay để cổng ngắt retry
        return res.status(200).json({
          status: 'already_processed_or_invalid',
          message: data?.message || 'Đơn hàng đã được xử lý hoặc số tiền không đủ'
        });
      }
    }

    return res.status(200).json({
      status: 'acknowledged',
      orderCode,
      transferAmount
    });
  } catch (error: any) {
    console.error('[Payment Webhook Error]:', error);
    // Luôn trả về 200 khi lỗi logic nội bộ để tránh webhook bị dội bão retry
    return res.status(200).json({ status: 'error_handled', message: error.message });
  }
}
