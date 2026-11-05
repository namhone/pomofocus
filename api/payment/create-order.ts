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

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Số tiền nạp không hợp lệ' });
    }

    const numAmount = Number(amount);
    const numCredits = Number(creditsToAdd || Math.round(numAmount / 100)); // Mặc định 10.000đ = 100⚡
    const effectiveUserId = userId || '00000000-0000-0000-0000-000000000000';

    const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

    let orderCode = '';

    if (supabaseUrl && supabaseKey) {
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
    }

    // Fallback nếu chưa kết nối RPC Supabase (sinh mã Base36 7 ký tự client/stateless)
    if (!orderCode) {
      const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
      let randomCode = 'PF';
      for (let i = 0; i < 5; i++) {
        randomCode += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      orderCode = randomCode;
    }

    const bankAccount = process.env.VITE_VIETQR_ACCOUNT_NO || '1066633885';
    const bankBin = process.env.VITE_VIETQR_BANK_BIN || '970436'; // VCB
    const accountName = process.env.VITE_VIETQR_ACCOUNT_NAME || 'HO NGOC BAO NAM';

    const vietQrUrl = `https://img.vietqr.io/image/${bankBin}-${bankAccount}-compact.png?amount=${numAmount}&addInfo=${encodeURIComponent(
      orderCode
    )}&accountName=${encodeURIComponent(accountName)}`;

    return res.status(200).json({
      success: true,
      orderCode,
      amount: numAmount,
      creditsToAdd: numCredits,
      expiresInMinutes: 15,
      vietQrUrl,
      bankInfo: {
        bankName: 'Vietcombank',
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
