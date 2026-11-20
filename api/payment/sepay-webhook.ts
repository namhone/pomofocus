import { callSupabaseActivatePro } from '../momo/_utils.js';

export default async function handler(req: any, res: any) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key, apikey');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // 1. Xác thực bảo mật Webhook từ SePay:
    // SePay gửi header: 'Authorization: Apikey <API_KEY>'
    const expectedKey =
      process.env.SEPAY_WEBHOOK_API_KEY ||
      process.env.POMO_VCB_SECRET_KEY ||
      process.env.PAYMENT_WEBHOOK_SECRET;

    const authHeader = (req.headers['authorization'] || req.headers['Authorization'] || '').trim();
    const clientKey =
      authHeader.replace(/^Apikey\s+/i, '').replace(/^Bearer\s+/i, '').trim() ||
      req.headers['x-api-key'] ||
      req.headers['apikey'] ||
      req.query?.key ||
      req.query?.apiKey ||
      req.query?.api_key;

    if (!expectedKey || clientKey !== expectedKey) {
      console.warn('[SePay Webhook] Unauthorized request rejected.');
      return res.status(401).json({ success: false, error: 'Unauthorized: Invalid SePay API Key' });
    }

    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const {
      id,
      gateway = 'VPBank',
      accountNumber,
      code,
      content = '',
      transferType = 'in',
      transferAmount = 0,
      referenceCode,
      description = ''
    } = payload;

    // 2. Bỏ qua nếu là giao dịch tiền ra (transferType !== 'in')
    if (transferType && String(transferType).toLowerCase() !== 'in') {
      return res.status(200).json({
        success: true,
        message: 'Bỏ qua giao dịch chuyển tiền đi (transferType !== in)',
        transferType
      });
    }

    const numAmount = parseInt(String(transferAmount).replace(/[^0-9]/g, ''), 10) || 0;
    if (numAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Số tiền giao dịch không hợp lệ' });
    }

    const combinedText = [code, content, description].filter(Boolean).join(' ');

    const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

    // 3. Kiểm tra Idempotency chống trùng lặp theo referenceCode hoặc SePay ID
    const transactionRef = referenceCode || (id ? `SEPAY_${id}` : null);
    if (transactionRef && supabaseUrl && supabaseKey) {
      try {
        const checkRes = await fetch(
          `${supabaseUrl}/rest/v1/payment_transactions?or=(order_id.eq.${encodeURIComponent(transactionRef)},description.ilike.*${encodeURIComponent(transactionRef)}*)&select=id,status,order_id&limit=1`,
          {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`
            }
          }
        );
        if (checkRes.ok) {
          const existingTxs = await checkRes.json();
          if (Array.isArray(existingTxs) && existingTxs.length > 0 && existingTxs[0].status === 'completed') {
            return res.status(200).json({
              success: true,
              alreadyProcessed: true,
              message: 'Giao dịch SePay này đã được xử lý thành công trước đó',
              referenceCode: transactionRef
            });
          }
        }
      } catch (idempErr) {
        console.warn('[SePay Webhook] Lỗi kiểm tra idempotency:', idempErr);
      }
    }

    // 4. Nhận diện mã đơn hàng:
    // Nhóm A: Mã nạp AI Credits Base36 7 ký tự bắt đầu bằng 'PF' (Ví dụ: 'PF8M2K9', 'PF9K2A8')
    const base36Match =
      combinedText.match(/(?:^|[^a-zA-Z0-9])(PF[2-9A-HJ-NP-Z]{5})(?:[^a-zA-Z0-9]|$)/i) ||
      combinedText.match(/(?:ND|GD|CT|NAPAS|MOMO|IB|SEPAY)?[:\s\\/._-]*(PF[2-9A-Z]{5})\b/i);

    // Nhóm B: Mã kích hoạt PRO Subscription cũ hoặc mới (POMO_xxxxxx, SW_xxxxxx)
    const proMatch =
      combinedText.match(/(?:POMO|SW)[\s_.-]*(\d{6})\b/i) ||
      combinedText.match(/(?:POMO|SW)[\s_.-]+([a-zA-Z0-9_-]+)/i);

    const effectiveGateway = `SePay_${gateway || 'VPBank'}`;

    // =========================================================================
    // TRƯỜNG HỢP 1: NẠP AI CREDITS (PFxxxxx)
    // =========================================================================
    if (base36Match) {
      const creditOrderCode = (base36Match[1] || base36Match[0]).toUpperCase().trim();

      if (supabaseUrl && supabaseKey) {
        // A1. Gọi Stored Procedure process_payment_by_order
        try {
          const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/process_payment_by_order`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`
            },
            body: JSON.stringify({
              p_order_code: creditOrderCode,
              p_gateway: effectiveGateway,
              p_transfer_amount: numAmount
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
                credits_added: data.credits_added,
                new_balance: data.new_balance,
                referenceCode: transactionRef
              });
            }
            if (data?.message?.includes('đã hoàn tất') || data?.message?.includes('không tồn tại')) {
              return res.status(200).json({
                status: 'already_processed_or_invalid',
                message: data.message
              });
            }
          }
        } catch (rpcErr) {
          console.warn('[SePay Webhook] RPC process_payment_by_order error:', rpcErr);
        }

        // A2. Direct REST Fallback (Phòng ngừa RPC chưa kịp nạp trên DB)
        try {
          const orderRes = await fetch(
            `${supabaseUrl}/rest/v1/payment_orders?order_code=eq.${encodeURIComponent(creditOrderCode)}&status=eq.pending&select=*`,
            {
              headers: {
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`
              }
            }
          );

          if (orderRes.ok) {
            const orders = await orderRes.json();
            if (Array.isArray(orders) && orders.length > 0) {
              const pendingOrder = orders[0];
              const creditsToAdd = Number(pendingOrder.credits_to_add) || Math.floor(numAmount / 200);

              // Đánh dấu đơn hoàn thành
              await fetch(`${supabaseUrl}/rest/v1/payment_orders?id=eq.${pendingOrder.id}`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  apikey: supabaseKey,
                  Authorization: `Bearer ${supabaseKey}`
                },
                body: JSON.stringify({
                  status: 'completed',
                  completed_at: new Date().toISOString()
                })
              });

              // Cập nhật ví user_wallets
              const walletRes = await fetch(
                `${supabaseUrl}/rest/v1/user_wallets?user_id=eq.${pendingOrder.user_id}&select=*`,
                { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
              );
              let currentBalance = 0;
              if (walletRes.ok) {
                const wallets = await walletRes.json();
                if (Array.isArray(wallets) && wallets.length > 0) {
                  currentBalance = Number(wallets[0].credits_balance) || 0;
                }
              }

              const newBalance = currentBalance + creditsToAdd;
              await fetch(`${supabaseUrl}/rest/v1/user_wallets`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  apikey: supabaseKey,
                  Authorization: `Bearer ${supabaseKey}`,
                  Prefer: 'resolution=merge-duplicates'
                },
                body: JSON.stringify({
                  user_id: pendingOrder.user_id,
                  credits_balance: newBalance,
                  updated_at: new Date().toISOString()
                })
              });

              // Cập nhật profile
              await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${pendingOrder.user_id}`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  apikey: supabaseKey,
                  Authorization: `Bearer ${supabaseKey}`
                },
                body: JSON.stringify({
                  credits: newBalance,
                  ai_credits_balance: newBalance,
                  updated_at: new Date().toISOString()
                })
              });

              // Ghi lịch sử giao dịch
              await fetch(`${supabaseUrl}/rest/v1/payment_transactions`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  apikey: supabaseKey,
                  Authorization: `Bearer ${supabaseKey}`,
                  Prefer: 'resolution=merge-duplicates'
                },
                body: JSON.stringify({
                  order_id: creditOrderCode,
                  user_id: pendingOrder.user_id,
                  amount: numAmount,
                  status: 'completed',
                  plan_type: 'credit_pack',
                  description: `Nạp ${creditsToAdd} AI Credits qua SePay VPBank VA (${accountNumber || 'AGBSPTJE34IA3A8SAAX'}). Ref: ${transactionRef || 'N/A'}`,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                })
              });

              return res.status(200).json({
                success: true,
                orderCode: creditOrderCode,
                gateway: effectiveGateway,
                user_id: pendingOrder.user_id,
                credits_added: creditsToAdd,
                new_balance: newBalance,
                referenceCode: transactionRef
              });
            }
          }
        } catch (restErr) {
          console.error('[SePay Webhook] REST fallback error:', restErr);
        }
      }

      return res.status(200).json({
        success: true,
        orderCode: creditOrderCode,
        gateway: effectiveGateway,
        amount: numAmount,
        referenceCode: transactionRef
      });
    }

    // =========================================================================
    // TRƯỜNG HỢP 2: KÍCH HOẠT PRO (POMO_xxxxxx)
    // =========================================================================
    if (proMatch) {
      const rawProId = proMatch[1] || proMatch[0];
      const proOrderCode = rawProId.startsWith('POMO_') ? rawProId : `POMO_${rawProId}`;

      let targetPlanType = 'monthly';
      let targetDurationDays: number | null = 30;
      if (numAmount >= 199000) {
        targetPlanType = 'lifetime';
        targetDurationDays = null;
      } else if (numAmount >= 149000) {
        targetPlanType = 'yearly';
        targetDurationDays = 365;
      }

      if (supabaseUrl && supabaseKey) {
        try {
          const txRes = await fetch(
            `${supabaseUrl}/rest/v1/payment_transactions?order_id=eq.${encodeURIComponent(proOrderCode)}&select=*`,
            { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
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

              if (tx.user_id) {
                await callSupabaseActivatePro({
                  userId: tx.user_id,
                  orderId: tx.order_id || proOrderCode,
                  amount: numAmount,
                  planType: tx.plan_type || targetPlanType,
                  durationDays: tx.plan_type === 'lifetime' ? null : targetDurationDays
                });

                await fetch(`${supabaseUrl}/rest/v1/payment_transactions?id=eq.${tx.id}`, {
                  method: 'PATCH',
                  headers: {
                    'Content-Type': 'application/json',
                    apikey: supabaseKey,
                    Authorization: `Bearer ${supabaseKey}`
                  },
                  body: JSON.stringify({
                    status: 'completed',
                    updated_at: new Date().toISOString()
                  })
                });

                return res.status(200).json({
                  success: true,
                  orderId: proOrderCode,
                  userId: tx.user_id,
                  planType: tx.plan_type || targetPlanType,
                  gateway: effectiveGateway,
                  referenceCode: transactionRef
                });
              }
            }
          }
        } catch (proErr) {
          console.error('[SePay Webhook] Pro activation error:', proErr);
        }
      }

      return res.status(200).json({
        success: true,
        orderId: proOrderCode,
        amount: numAmount,
        gateway: effectiveGateway,
        referenceCode: transactionRef
      });
    }

    // =========================================================================
    // TRƯỜNG HỢP 3: KHÔNG TÌM THẤY MÃ ĐƠN HÀNG HỢP LỆ
    // Ghi nhận UNMATCHED_PENDING_MANUAL_REVIEW để đối soát thủ công
    // =========================================================================
    console.warn(`[SePay Webhook] Không tìm thấy mã đơn hàng trong nội dung "${combinedText}". Ghi nhận UNMATCHED.`);
    if (supabaseUrl && supabaseKey) {
      try {
        await fetch(`${supabaseUrl}/rest/v1/payment_transactions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            Prefer: 'return=minimal'
          },
          body: JSON.stringify({
            order_id: transactionRef ? `SEPAY_${transactionRef}` : `SEPAY_UNMATCHED_${Date.now()}`,
            amount: numAmount,
            status: 'UNMATCHED_PENDING_MANUAL_REVIEW',
            plan_type: 'unmatched',
            description: `[SePay VPBank VA AGBSPTJE34IA3A8SAAX] Nội dung: "${content}". Ref: ${transactionRef || 'N/A'}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        });
      } catch (recordErr) {
        console.error('[SePay Webhook] Lỗi ghi nhận UNMATCHED_PENDING_MANUAL_REVIEW:', recordErr);
      }
    }

    return res.status(200).json({
      success: false,
      status: 'UNMATCHED_PENDING_MANUAL_REVIEW',
      message: 'Giao dịch SePay không khớp mã đơn hàng; đã ghi nhận UNMATCHED_PENDING_MANUAL_REVIEW để đối soát thủ công',
      referenceCode: transactionRef,
      amount: numAmount
    });
  } catch (error: any) {
    console.error('[SePay Webhook] Internal server error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
}
