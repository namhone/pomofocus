import crypto from 'node:crypto';

export interface MoMoConfig {
  partnerCode: string;
  accessKey: string;
  secretKey: string;
  endpoint: string;
}

// Cấu hình MoMo Sandbox Test mặc định (Nếu chưa điền env production trên Vercel)
export const DEFAULT_MOMO_CONFIG: MoMoConfig = {
  partnerCode: process.env.MOMO_PARTNER_CODE || 'MOMOBKUN20180529',
  accessKey: process.env.MOMO_ACCESS_KEY || 'klm05TvNBzhg7h7j',
  secretKey: process.env.MOMO_SECRET_KEY || 'at67qH6mk8w5Y1nAyMoYKMWACiEi2Aca',
  endpoint: process.env.MOMO_API_ENDPOINT || 'https://test-payment.momo.vn/v2/gateway/api/create'
};

export function computeHmacSha256Node(secretKey: string, rawSignature: string): string {
  return crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex');
}

export function buildCreatePaymentSignature(params: {
  accessKey: string;
  amount: number;
  extraData: string;
  ipnUrl: string;
  orderId: string;
  orderInfo: string;
  partnerCode: string;
  redirectUrl: string;
  requestId: string;
  requestType: string;
  secretKey: string;
}): string {
  const rawSignature = `accessKey=${params.accessKey}&amount=${params.amount}&extraData=${params.extraData}&ipnUrl=${params.ipnUrl}&orderId=${params.orderId}&orderInfo=${params.orderInfo}&partnerCode=${params.partnerCode}&redirectUrl=${params.redirectUrl}&requestId=${params.requestId}&requestType=${params.requestType}`;
  return computeHmacSha256Node(params.secretKey, rawSignature);
}

export function buildIpnSignature(params: {
  accessKey: string;
  amount: number | string;
  extraData: string;
  message: string;
  orderId: string;
  orderInfo: string;
  orderType: string;
  partnerCode: string;
  payType: string;
  requestId: string;
  responseTime: number | string;
  resultCode: number | string;
  transId: number | string;
  secretKey: string;
}): string {
  const rawSignature = `accessKey=${params.accessKey}&amount=${params.amount}&extraData=${params.extraData}&message=${params.message}&orderId=${params.orderId}&orderInfo=${params.orderInfo}&orderType=${params.orderType}&partnerCode=${params.partnerCode}&payType=${params.payType}&requestId=${params.requestId}&responseTime=${params.responseTime}&resultCode=${params.resultCode}&transId=${params.transId}`;
  return computeHmacSha256Node(params.secretKey, rawSignature);
}

export async function callSupabaseActivatePro(params: {
  userId: string;
  orderId: string;
  amount: number;
  planType: string;
  durationDays: number | null;
}): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return { success: false, error: 'Thiếu cấu hình SUPABASE_URL hoặc API key' };
  }

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/activate_pro_subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        p_user_id: params.userId,
        p_order_id: params.orderId,
        p_amount: params.amount,
        p_plan_type: params.planType,
        p_duration_days: params.durationDays
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `Supabase RPC lỗi [${res.status}]: ${errText}` };
    }

    const data = await res.json();
    return { success: true, data };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}
