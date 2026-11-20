export default async function handler(req: any, res: any) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { userId, amount, creditsToAdd } = body;

    // BUG-14 Remediation: Từ chối tuyệt đối khách chưa đăng nhập / guest tạo đơn nạp tiền
    if (!userId || typeof userId !== 'string' || userId.trim() === '' || userId === 'guest' || userId === 'guest_user' || userId === '00000000-0000-0000-0000-000000000000') {
      return res.status(401).json({ error: 'Yêu cầu đăng nhập tài khoản thật để tạo đơn hàng thanh toán' });
    }

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Số tiền nạp không hợp lệ' });
    }

    const numAmount = Number(amount);
    const numCredits = Number(creditsToAdd || Math.round(numAmount / 100)); // Mặc định 10.000đ = 100⚡
    const effectiveUserId = userId.trim();

    const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

    let orderCode = '';
    let expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const createdAt = new Date().toISOString();

    if (supabaseUrl && supabaseKey) {
      // 1. Thử gọi Stored Procedure RPC get_or_create_payment_order
      try {
        const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/get_or_create_payment_order`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({
            p_user_id: effectiveUserId,
            p_amount: numAmount,
            p_credits: numCredits
          })
        });

        if (rpcRes.ok) {
          const data = await rpcRes.json();
          orderCode = typeof data === 'string' ? data : data?.order_code || '';
        }
      } catch (err) {
        console.warn('[create-order] RPC get_or_create_payment_order error:', err);
      }

      // 2. Fallback nếu RPC chưa tạo trên DB: Tìm đơn pending cũ còn hạn trực tiếp từ REST API
      if (!orderCode) {
        try {
          const existingRes = await fetch(
            `${supabaseUrl}/rest/v1/payment_orders?user_id=eq.${encodeURIComponent(effectiveUserId)}&status=eq.pending&amount=eq.${numAmount}&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&order=created_at.desc&limit=1`,
            {
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
              }
            }
          );
          if (existingRes.ok) {
            const list = await existingRes.json();
            if (Array.isArray(list) && list.length > 0) {
              orderCode = list[0].order_code;
              if (list[0].expires_at) expiresAt = list[0].expires_at;
            }
          }
        } catch (fetchErr) {
          console.warn('[create-order] Direct query payment_orders error:', fetchErr);
        }
      }

      // 3. Nếu vẫn chưa có orderCode, tạo mới và lưu trực tiếp vào bảng payment_orders
      if (!orderCode) {
        const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
        let randomCode = 'PF';
        for (let i = 0; i < 5; i++) {
          randomCode += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        orderCode = randomCode;

        try {
          await fetch(`${supabaseUrl}/rest/v1/payment_orders`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
              order_code: orderCode,
              user_id: effectiveUserId,
              amount: numAmount,
              credits_to_add: numCredits,
              status: 'pending',
              expires_at: expiresAt
            })
          });
        } catch (insertErr) {
          console.warn('[create-order] Direct insert payment_orders error:', insertErr);
        }
      }
    }

    // Fallback cục bộ cuối cùng nếu không có Supabase env
    if (!orderCode) {
      const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
      let randomCode = 'PF';
      for (let i = 0; i < 5; i++) {
        randomCode += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      orderCode = randomCode;
    }

    const bankAccount = process.env.VITE_VIETQR_ACCOUNT_NO || 'AGBSPTJE34IA3A8SAAX';
    const bankName = process.env.VITE_VIETQR_BANK_NAME || 'VPBank';
    const accountName = process.env.VITE_VIETQR_ACCOUNT_NAME || 'HO NGOC BAO NAM';

    // Định dạng QR động chuẩn SePay VA VPBank
    const vietQrUrl = `https://vietqr.app/img?acc=${bankAccount}&bank=${bankName}&amount=${numAmount}&des=${encodeURIComponent(
      orderCode
    )}`;

    return res.status(200).json({
      success: true,
      orderCode,
      amount: numAmount,
      creditsToAdd: numCredits,
      expiresInMinutes: 15,
      expiresAt,
      createdAt,
      vietQrUrl,
      bankInfo: {
        bankName,
        accountNo: bankAccount,
        accountName,
        content: orderCode
      }
    });
  } catch (error: any) {
    console.error('[create-order] Error:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}
