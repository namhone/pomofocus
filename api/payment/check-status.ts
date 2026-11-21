export default async function handler(req: any, res: any) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const rawOrderCode = req.query?.orderCode || req.body?.orderCode || req.query?.orderId || req.body?.orderId;
    const rawUserId = req.query?.userId || req.body?.userId;
    const includeHistory = req.query?.history === 'true' || req.body?.history === true;

    // Chuẩn hóa và làm sạch userId (nếu người dùng đăng nhập)
    const cleanUserId = (
      rawUserId &&
      typeof rawUserId === 'string' &&
      rawUserId.trim() !== '' &&
      rawUserId.trim().toLowerCase() !== 'guest' &&
      rawUserId.trim().toLowerCase() !== 'guest_user' &&
      rawUserId.trim() !== '00000000-0000-0000-0000-000000000000'
    ) ? rawUserId.trim() : null;

    const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
    // Ưu tiên cao nhất SUPABASE_SERVICE_ROLE_KEY để tra cứu đơn hàng khi RLS đã siết chặt
    const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
    const anonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();
    const supabaseKey = serviceRoleKey || anonKey;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(200).json({ isPaid: false, status: 'unknown', error: 'Supabase credentials not configured' });
    }

    let isPaid = false;
    let orderDetails: any = null;
    let recentOrders: any[] = [];

    // 1. Kiểm tra theo orderCode trong bảng payment_orders
    if (rawOrderCode && typeof rawOrderCode === 'string') {
      const code = rawOrderCode.trim().toUpperCase();

      try {
        const orderRes = await fetch(
          `${supabaseUrl}/rest/v1/payment_orders?order_code=eq.${encodeURIComponent(code)}&select=*`,
          {
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`
            }
          }
        );

        if (orderRes.ok) {
          const list = await orderRes.json();
          if (Array.isArray(list) && list.length > 0) {
            const order = list[0];

            // M0 Security Check: Nếu yêu cầu có kèm userId, bắt buộc đơn hàng phải thuộc về đúng userId này
            if (cleanUserId) {
              const orderUserId = String(order.user_id || '').trim();
              const orderEmail = String(order.user_email || '').trim().toLowerCase();
              const isOwner =
                orderUserId === cleanUserId ||
                (orderEmail !== '' && orderEmail === cleanUserId.toLowerCase());

              if (!isOwner) {
                console.warn(`[check-status] Ownership mismatch: order ${code} owned by ${orderUserId}, queried with userId ${cleanUserId}`);
                return res.status(403).json({
                  success: false,
                  isPaid: false,
                  status: 'forbidden',
                  error: 'Đơn hàng không thuộc về tài khoản người dùng được yêu cầu'
                });
              }
            }

            const isExpired = order.status === 'pending' && new Date(order.expires_at).getTime() < Date.now();
            const effectiveStatus = isExpired ? 'expired' : order.status;

            if (effectiveStatus === 'completed') {
              isPaid = true;
            }

            orderDetails = {
              orderCode: order.order_code,
              amount: order.amount,
              creditsToAdd: order.credits_to_add,
              status: effectiveStatus,
              expiresAt: order.expires_at,
              createdAt: order.created_at,
              completedAt: order.completed_at,
              remainingSeconds: Math.max(0, Math.floor((new Date(order.expires_at).getTime() - Date.now()) / 1000))
            };
          }
        }
      } catch (err) {
        console.warn('[check-status] Error querying payment_orders:', err);
      }

      // 2. Nếu chưa tìm thấy trong payment_orders, tìm trong payment_transactions (tương thích PRO / MoMo)
      if (!orderDetails) {
        try {
          const txRes = await fetch(
            `${supabaseUrl}/rest/v1/payment_transactions?order_id=eq.${encodeURIComponent(rawOrderCode.trim())}&select=*`,
            {
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
              }
            }
          );
          if (txRes.ok) {
            const txList = await txRes.json();
            if (Array.isArray(txList) && txList.length > 0) {
              const tx = txList[0];

              // M0 Security Check: Xác thực quyền sở hữu giao dịch MoMo/PRO nếu có userId
              if (cleanUserId && tx.user_id) {
                const txUserId = String(tx.user_id).trim();
                if (txUserId !== cleanUserId) {
                  console.warn(`[check-status] Ownership mismatch on tx ${tx.order_id}: owned by ${txUserId}, queried with userId ${cleanUserId}`);
                  return res.status(403).json({
                    success: false,
                    isPaid: false,
                    status: 'forbidden',
                    error: 'Giao dịch không thuộc về tài khoản người dùng được yêu cầu'
                  });
                }
              }

              if (tx.status === 'completed' || tx.status === 'verified_paid') {
                isPaid = true;
              }
              orderDetails = {
                orderCode: tx.order_id,
                amount: tx.amount,
                status: tx.status,
                planType: tx.plan_type,
                createdAt: tx.created_at,
                updatedAt: tx.updated_at
              };
            }
          }
        } catch (txErr) {
          console.warn('[check-status] Error querying payment_transactions:', txErr);
        }
      }
    }

    // 3. Nếu có yêu cầu lịch sử giao dịch gần đây của người dùng
    if (cleanUserId) {
      try {
        const historyRes = await fetch(
          `${supabaseUrl}/rest/v1/payment_orders?user_id=eq.${encodeURIComponent(cleanUserId)}&select=*&order=created_at.desc&limit=10`,
          {
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`
            }
          }
        );
        if (historyRes.ok) {
          const rows = await historyRes.json();
          if (Array.isArray(rows)) {
            recentOrders = rows.map((r: any) => ({
              id: r.id,
              orderCode: r.order_code,
              amount: r.amount,
              creditsToAdd: r.credits_to_add,
              status: (r.status === 'pending' && new Date(r.expires_at).getTime() < Date.now()) ? 'expired' : r.status,
              createdAt: r.created_at,
              completedAt: r.completed_at,
              expiresAt: r.expires_at
            }));
          }
        }
      } catch (histErr) {
        console.warn('[check-status] Error querying order history:', histErr);
      }
    }

    return res.status(200).json({
      success: true,
      isPaid,
      order: orderDetails,
      recentOrders: includeHistory || !rawOrderCode ? recentOrders : undefined
    });
  } catch (error: any) {
    console.error('[check-status] Error:', error);
    return res.status(500).json({ isPaid: false, error: 'Internal Server Error', message: error.message });
  }
}
