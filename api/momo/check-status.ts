export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const orderId = req.query?.orderId || req.body?.orderId;
  const userId = req.query?.userId || req.body?.userId;

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(200).json({ isPaid: false, isPro: false, note: 'Supabase env not configured' });
  }

  try {
    let isPaid = false;
    let isPro = false;
    let proExpiresAt: string | null = null;

    // 1. Kiểm tra bảng payment_transactions nếu có orderId
    if (orderId) {
      const txRes = await fetch(`${supabaseUrl}/rest/v1/payment_transactions?order_id=eq.${encodeURIComponent(orderId)}&select=status,amount,plan_type,created_at`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      });
      if (txRes.ok) {
        const txs = await txRes.json();
        if (Array.isArray(txs) && txs.length > 0 && txs[0].status === 'completed') {
          isPaid = true;
        }
      }
    }

    // 2. Kiểm tra bảng user_entitlements nếu có userId
    if (userId && userId !== 'guest_user') {
      const entRes = await fetch(`${supabaseUrl}/rest/v1/user_entitlements?user_id=eq.${encodeURIComponent(userId)}&select=is_pro,pro_expires_at`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      });
      if (entRes.ok) {
        const ents = await entRes.json();
        if (Array.isArray(ents) && ents.length > 0) {
          isPro = Boolean(ents[0].is_pro);
          proExpiresAt = ents[0].pro_expires_at;
          if (isPro) isPaid = true;
        }
      }
    }

    return res.status(200).json({
      isPaid,
      isPro,
      proExpiresAt,
      orderId,
      userId
    });
  } catch (err: any) {
    return res.status(200).json({ isPaid: false, isPro: false, error: err.message });
  }
}
