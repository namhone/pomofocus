import { callSupabaseActivatePro } from './_utils.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const {
      orderId = `MOCK_${Date.now()}`,
      userId = 'demo_user',
      planType = '1_month',
      durationDays = 30,
      amount = 59000
    } = payload;

    const dbResult = await callSupabaseActivatePro({
      userId,
      orderId,
      amount: Number(amount) || 0,
      planType,
      durationDays: durationDays === null ? null : Number(durationDays)
    });

    return res.status(200).json({
      success: true,
      simulated: true,
      orderId,
      dbResult,
      message: 'Mô phỏng thanh toán MoMo thành công và kích hoạt PRO thành công!'
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Lỗi server' });
  }
}
