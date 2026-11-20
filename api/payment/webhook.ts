import { callSupabaseActivatePro } from '../momo/_utils.js';

export default async function handler(req: any, res: any) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key, x-vcb-secret, apikey, x-secret-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // 1. Xác thực bảo mật Webhook qua Header hoặc URL Query (thân thiện với SePay / MacroDroid / OTT)
    const webhookSecret =
      process.env.SEPAY_WEBHOOK_API_KEY ||
      process.env.POMO_VCB_SECRET_KEY ||
      process.env.PAYMENT_WEBHOOK_SECRET ||
      process.env.VCB_WEBHOOK_SECRET;
    const clientSecret =
      req.headers['x-api-key'] ||
      req.headers['x-vcb-secret'] ||
      req.headers['apikey'] ||
      req.headers['x-secret-key'] ||
      (req.headers.authorization ? req.headers.authorization.replace(/^Bearer\s+/i, '').replace(/^Apikey\s+/i, '').trim() : undefined) ||
      req.query?.key ||
      req.query?.secret ||
      req.query?.apiKey ||
      req.query?.api_key;

    const isAuthorized =
      Boolean(webhookSecret) &&
      (clientSecret === webhookSecret);

    if (!isAuthorized) {
      console.warn('[Payment Webhook] Unauthorized request rejected.');
      return res.status(401).json({ error: 'Unauthorized: Invalid secret key' });
    }

    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};

    // 1.1 Bỏ qua nếu là giao dịch tiền ra (transferType !== 'in')
    if (payload.transferType && String(payload.transferType).toLowerCase() !== 'in') {
      return res.status(200).json({
        success: true,
        message: 'Bỏ qua giao dịch chuyển tiền đi (transferType !== in)',
        transferType: payload.transferType
      });
    }

    // 2. Gom toàn bộ nội dung văn bản (Hỗ trợ MacroDroid OTT, SePay, Tasker, Gmail):
    const combinedText = [
      payload.orderCode,
      payload.content,
      payload.description,
      payload.reference,
      payload.text,
      payload.message,
      payload.notification,
      payload.body,
      payload.title,
      payload.referenceCode
    ].filter(Boolean).join(' ');

    let transferAmount = Number(
      payload.transferAmount ||
      payload.amount ||
      0
    );

    // Nếu transferAmount chưa có trong JSON (VD: MacroDroid đẩy thông báo OTT thô từ VCB Digibank), tự động bóc tách qua Regex
    if (!transferAmount || isNaN(transferAmount) || transferAmount <= 0) {
      const amountMatch = combinedText.match(/(?:\+)?([0-9]{1,3}(?:[.,][0-9]{3})+|[0-9]+)\s*(?:VND|VNĐ|đ|d)(?![a-zA-Z0-9])/i) ||
                          combinedText.match(/(?:Số tiền|phát sinh|biến động|thay đổi|GD)[:\s]+(?:\+)?([0-9]{1,3}(?:[.,][0-9]{3})+|[0-9]+)/i) ||
                          combinedText.match(/(?:\+)\s*([0-9]{1,3}(?:[.,][0-9]{3})+|[0-9]+)/i);
      if (amountMatch) {
        const rawAmount = (amountMatch[1] || amountMatch[0]).replace(/[^0-9]/g, '');
        transferAmount = parseInt(rawAmount, 10);
      }
    }

    // 3. Nhận diện loại đơn hàng:
    // Nhóm A: Mã nạp AI Credits Base36 7 ký tự bắt đầu bằng 'PF' (Ví dụ: 'PF8M2K9', 'PF9K2A8')
    const base36Match = combinedText.match(/(?:^|[^a-zA-Z0-9])(PF[2-9A-HJ-NP-Z]{5})(?:[^a-zA-Z0-9]|$)/i) ||
                         combinedText.match(/(?:ND|GD|CT|NAPAS|MOMO|IB)?[:\s\\/._-]*(PF[2-9A-Z]{5})\b/i);

    // Nhóm B: Mã kích hoạt PRO Subscription cũ hoặc mới (POMO_xxxxxx, SW_xxxxxx)
    const legacyMatch = combinedText.match(/(?:POMO|SW)[\s_.-]*(\d{6})\b/i);
    const generalMatch = combinedText.match(/(?:POMO|SW)[\s_.-]+([a-zA-Z0-9_-]+)/i);

    const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

    const effectiveGateway = payload.gateway || (/(?:vcb|vietcombank)/i.test(combinedText) ? 'VCB_OTT' : 'VietQR');

    // =========================================================================
    // TRƯỜNG HỢP 1: NẠP AI CREDITS (PFxxxxx)
    // =========================================================================
    if (base36Match) {
      const creditOrderCode = (base36Match[1] || base36Match[0]).toUpperCase().trim();

      if (supabaseUrl && supabaseKey) {
        // A1. Thử gọi RPC process_payment_by_order
        try {
          const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/process_payment_by_order`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`
            },
            body: JSON.stringify({
              p_order_code: creditOrderCode,
              p_gateway: effectiveGateway,
              p_transfer_amount: transferAmount
            })
          });

          if (rpcRes.ok) {
            const data = await rpcRes.json();
            if (data?.success) {
              return res.status(200).json({
                success: true,
                orderCode: creditOrderCode,
                gateway: effectiveGateway,
                user_id: data.user_id,
                credits_added: data.credits_added
              });
            }
            if (data?.message?.includes('đã hoàn thành') || data?.message?.includes('không tồn tại')) {
              return res.status(200).json({
                status: 'already_processed_or_invalid',
                message: data.message
              });
            }
          }
        } catch (rpcErr) {
          console.warn('[Payment Webhook] RPC process_payment_by_order error:', rpcErr);
        }

        // A2. Direct REST Fallback (Phòng ngừa RPC chưa được deploy trên Supabase SQL Editor)
        try {
          const orderRes = await fetch(
            `${supabaseUrl}/rest/v1/payment_orders?order_code=eq.${encodeURIComponent(creditOrderCode)}&status=eq.pending&select=*`,
            {
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
              }
            }
          );

          if (orderRes.ok) {
            const orders = await orderRes.json();
            if (Array.isArray(orders) && orders.length > 0) {
              const order = orders[0];
              const expectedAmount = Number(order.amount);
              const creditsToAdd = Number(order.credits_to_add);
              const targetUserId = order.user_id;

              if (transferAmount >= expectedAmount) {
                // 1. Đánh dấu order là completed
                await fetch(`${supabaseUrl}/rest/v1/payment_orders?id=eq.${order.id}`, {
                  method: 'PATCH',
                  headers: {
                    'Content-Type': 'application/json',
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`
                  },
                  body: JSON.stringify({
                    status: 'completed',
                    completed_at: new Date().toISOString()
                  })
                });

                // 2. Cập nhật user_wallets
                try {
                  const walletRes = await fetch(`${supabaseUrl}/rest/v1/user_wallets?user_id=eq.${targetUserId}&select=credits_balance`, {
                    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
                  });
                  if (walletRes.ok) {
                    const wallets = await walletRes.json();
                    const currentBal = (wallets?.[0]?.credits_balance || 0);
                    await fetch(`${supabaseUrl}/rest/v1/user_wallets`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${supabaseKey}`,
                        'Prefer': 'resolution=merge-duplicates'
                      },
                      body: JSON.stringify({
                        user_id: targetUserId,
                        credits_balance: currentBal + creditsToAdd,
                        updated_at: new Date().toISOString()
                      })
                    });
                  }
                } catch (wErr) {
                  console.warn('[Payment Webhook] Update user_wallets error:', wErr);
                }

                // 3. Cập nhật profiles (ai_credits_balance & credits)
                try {
                  const profRes = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${targetUserId}&select=credits,ai_credits_balance`, {
                    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
                  });
                  if (profRes.ok) {
                    const profs = await profRes.json();
                    const curCredits = profs?.[0]?.credits || 0;
                    const curAiBal = profs?.[0]?.ai_credits_balance || 0;
                    await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${targetUserId}`, {
                      method: 'PATCH',
                      headers: {
                        'Content-Type': 'application/json',
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${supabaseKey}`
                      },
                      body: JSON.stringify({
                        credits: curCredits + creditsToAdd,
                        ai_credits_balance: curAiBal + creditsToAdd,
                        updated_at: new Date().toISOString()
                      })
                    });
                  }
                } catch (pErr) {
                  console.warn('[Payment Webhook] Update profiles error:', pErr);
                }

                // 4. Ghi nhận giao dịch vào payment_transactions
                try {
                  await fetch(`${supabaseUrl}/rest/v1/payment_transactions`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'apikey': supabaseKey,
                      'Authorization': `Bearer ${supabaseKey}`,
                      'Prefer': 'resolution=merge-duplicates'
                    },
                    body: JSON.stringify({
                      order_id: creditOrderCode,
                      user_id: targetUserId,
                      amount: transferAmount,
                      status: 'completed',
                      plan_type: 'credit_pack',
                      description: `Nạp ${creditsToAdd} AI Credits (${effectiveGateway})`,
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString()
                    })
                  });
                } catch (tErr) {
                  console.warn('[Payment Webhook] Insert payment_transactions error:', tErr);
                }

                return res.status(200).json({
                  success: true,
                  orderCode: creditOrderCode,
                  gateway: effectiveGateway,
                  user_id: targetUserId,
                  credits_added: creditsToAdd
                });
              } else {
                return res.status(200).json({
                  status: 'underpaid',
                  message: `Số tiền chuyển (${transferAmount} VNĐ) nhỏ hơn giá trị đơn hàng (${expectedAmount} VNĐ)`
                });
              }
            }
          }
        } catch (fbErr) {
          console.warn('[Payment Webhook] Direct REST fallback error:', fbErr);
        }
      }

      return res.status(200).json({
        status: 'acknowledged',
        orderCode: creditOrderCode,
        transferAmount
      });
    }

    // =========================================================================
    // TRƯỜNG HỢP 2: KÍCH HOẠT GÓI PRO SUBSCRIPTION (POMO_xxxxxx / SW_xxxxxx)
    // =========================================================================
    const proOrderCode = legacyMatch
      ? `POMO_${legacyMatch[1]}`
      : generalMatch
      ? generalMatch[0].replace(/\s+/g, '_').toUpperCase()
      : null;

    if (proOrderCode) {
      let targetPlanType = '1_month';
      let targetDurationDays: number | null = 30;
      let expectedAmount = 59000;

      if (transferAmount >= 750000) {
        targetPlanType = 'lifetime';
        targetDurationDays = null;
        expectedAmount = 799000;
      } else if (transferAmount >= 450000) {
        targetPlanType = '1_year';
        targetDurationDays = 365;
        expectedAmount = 468000;
      }

      if (supabaseUrl && supabaseKey) {
        try {
          const txRes = await fetch(
            `${supabaseUrl}/rest/v1/payment_transactions?order_id=eq.${encodeURIComponent(proOrderCode)}&select=*`,
            {
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
              }
            }
          );
          if (txRes.ok) {
            const txs = await txRes.json();
            if (Array.isArray(txs) && txs.length > 0) {
              const tx = txs[0];
              if (tx.status === 'completed' || tx.status === 'verified_paid') {
                return res.status(200).json({
                  success: true,
                  alreadyProcessed: true,
                  orderId: tx.order_id,
                  message: 'Đơn hàng PRO này đã hoàn tất trước đó'
                });
              }

              if (tx.user_id && transferAmount >= (tx.amount || expectedAmount)) {
                await callSupabaseActivatePro({
                  userId: tx.user_id,
                  orderId: tx.order_id || proOrderCode,
                  amount: transferAmount,
                  planType: tx.plan_type || targetPlanType,
                  durationDays: tx.plan_type === 'lifetime' ? null : targetDurationDays
                });
                await fetch(`${supabaseUrl}/rest/v1/payment_transactions?id=eq.${tx.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json', 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` },
                  body: JSON.stringify({ status: 'completed', updated_at: new Date().toISOString() })
                });

                return res.status(200).json({
                  success: true,
                  orderId: proOrderCode,
                  userId: tx.user_id,
                  planType: tx.plan_type || targetPlanType
                });
              }
            }
          }
        } catch (proErr) {
          console.warn('[Payment Webhook] PRO activation error:', proErr);
        }
      }

      return res.status(200).json({
        status: 'acknowledged',
        orderCode: proOrderCode,
        transferAmount
      });
    }

    // Không tìm thấy mã hợp lệ trong nội dung chuyển khoản
    return res.status(200).json({
      status: 'ignored',
      message: 'Nội dung giao dịch không chứa mã đơn hàng hợp lệ (PFxxxxx hoặc POMO_xxxxxx)'
    });
  } catch (error: any) {
    console.error('[Payment Webhook Error]:', error);
    return res.status(200).json({ status: 'error_handled', message: error.message });
  }
}
