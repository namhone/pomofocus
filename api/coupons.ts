/**
 * SERVERLESS COUPON API ENDPOINT (/api/coupons)
 * ==============================================================================
 * Cung cấp API xác thực, truy vấn và quản lý kho mã giảm giá dùng chung toàn cầu.
 * Cho phép đồng bộ tức thì giữa mọi thiết bị (Mobile, Desktop, Tablet) và môi trường
 * mà không bị phụ thuộc vào localStorage hay lỗi kết nối cơ sở dữ liệu Supabase.
 */

export interface CouponItem {
  code: string;
  type: 'discount_percent' | 'free_days' | 'free_lifetime';
  value: number; // % giảm giá hoặc số ngày tặng PRO (0 nếu là lifetime)
  maxUses: number;
  usedCount: number;
  expiresAt: number | null; // timestamp ms hoặc null
  createdAt: number;
  description?: string;
  createdBy?: string;
}

// Kho coupon chính thức hoạt động trên toàn hệ thống
const OFFICIAL_COUPONS: Record<string, CouponItem> = {
  'EIU': {
    code: 'EIU',
    type: 'free_lifetime',
    value: 0,
    maxUses: 10000,
    usedCount: 0,
    expiresAt: null,
    createdAt: 1730000000000,
    description: 'Đặc quyền EIU - Kích hoạt PRO TRỌN ĐỜI vĩnh viễn'
  },
  'PRO50': {
    code: 'PRO50',
    type: 'discount_percent',
    value: 50,
    maxUses: 1000,
    usedCount: 0,
    expiresAt: null,
    createdAt: 1730000000000,
    description: 'Giảm giá 50% tất cả các gói'
  },
  'VIP7DAYS': {
    code: 'VIP7DAYS',
    type: 'free_days',
    value: 7,
    maxUses: 1000,
    usedCount: 0,
    expiresAt: null,
    createdAt: 1730000000000,
    description: 'Trải nghiệm 7 ngày PRO Miễn Phí'
  },
  'VIP30DAYS': {
    code: 'VIP30DAYS',
    type: 'free_days',
    value: 30,
    maxUses: 500,
    usedCount: 0,
    expiresAt: null,
    createdAt: 1730000000000,
    description: 'Trải nghiệm 30 ngày PRO Miễn Phí'
  },
  'BOSSSECRET': {
    code: 'BOSSSECRET',
    type: 'free_lifetime',
    value: 0,
    maxUses: 100,
    usedCount: 0,
    expiresAt: null,
    createdAt: 1730000000000,
    description: 'Mã bí mật Chủ sở hữu: Kích hoạt PRO Trọn đời'
  },
  'STUDENT100': {
    code: 'STUDENT100',
    type: 'free_days',
    value: 14,
    maxUses: 1000,
    usedCount: 0,
    expiresAt: null,
    createdAt: 1730000000000,
    description: 'Học sinh sinh viên: 14 ngày PRO Miễn Phí'
  },
  'STUDYFOCUS': {
    code: 'STUDYFOCUS',
    type: 'discount_percent',
    value: 30,
    maxUses: 500,
    usedCount: 0,
    expiresAt: null,
    createdAt: 1730000000000,
    description: 'Giảm giá 30% cho không gian học tập'
  },
  'POMO2026': {
    code: 'POMO2026',
    type: 'discount_percent',
    value: 20,
    maxUses: 1000,
    usedCount: 0,
    expiresAt: null,
    createdAt: 1730000000000,
    description: 'Khuyến mãi năm 2026: Giảm 20%'
  },
  'LADYBOSS': {
    code: 'LADYBOSS',
    type: 'free_lifetime',
    value: 0,
    maxUses: 10,
    usedCount: 0,
    expiresAt: null,
    createdAt: 1730000000000,
    description: 'Đặc quyền Nóc Nhà: Kích hoạt PRO Trọn đời'
  },
  'NAMHO': {
    code: 'NAMHO',
    type: 'free_lifetime',
    value: 0,
    maxUses: 10,
    usedCount: 0,
    expiresAt: null,
    createdAt: 1730000000000,
    description: 'Đặc quyền Chủ sở hữu: Kích hoạt PRO Trọn đời'
  },
  'HUYENTRAN': {
    code: 'HUYENTRAN',
    type: 'free_lifetime',
    value: 0,
    maxUses: 10,
    usedCount: 0,
    expiresAt: null,
    createdAt: 1730000000000,
    description: 'Đặc quyền Vợ Sếp: Kích hoạt PRO Trọn đời'
  }
};

// Lưu trữ in-memory cache cho Vercel runtime instance
const dynamicCoupons: Map<string, CouponItem> = new Map();

export default async function handler(req: any, res: any) {
  // Thiết lập CORS Header toàn diện
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 1. GET: Truy vấn hoặc xác thực mã coupon
  if (req.method === 'GET') {
    const rawCode = (req.query?.code || '').toString().trim().toUpperCase();

    if (!rawCode) {
      // Trả về toàn bộ danh sách coupon (dành cho Admin hoặc debug)
      const all: CouponItem[] = [
        ...Object.values(OFFICIAL_COUPONS),
        ...Array.from(dynamicCoupons.values())
      ];
      return res.status(200).json({ success: true, count: all.length, coupons: all });
    }

    // Tra cứu trong kho chính thức trước
    let found = OFFICIAL_COUPONS[rawCode] || dynamicCoupons.get(rawCode) || null;

    // Nếu chưa có, thử tra cứu từ Supabase nếu có cấu hình
    if (!found) {
      const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

      if (supabaseUrl && supabaseKey) {
        try {
          const sbRes = await fetch(
            `${supabaseUrl}/rest/v1/coupons?code=eq.${encodeURIComponent(rawCode)}&select=*`,
            {
              headers: {
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`,
                Accept: 'application/json'
              }
            }
          );
          if (sbRes.ok) {
            const rows = await sbRes.json();
            if (Array.isArray(rows) && rows.length > 0) {
              const r = rows[0];
              found = {
                code: r.code,
                type: r.type,
                value: Number(r.value) || 0,
                maxUses: Number(r.max_uses) || 100,
                usedCount: Number(r.used_count) || 0,
                expiresAt: r.expires_at ? new Date(r.expires_at).getTime() : null,
                createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
                description: r.description,
                createdBy: r.created_by
              };
              dynamicCoupons.set(rawCode, found);
            }
          }
        } catch {
          // Bỏ qua lỗi Supabase
        }
      }
    }

    if (!found) {
      return res.status(200).json({
        success: false,
        error: 'Mã coupon không tồn tại hoặc đã hết hạn.'
      });
    }

    // Kiểm tra tính hợp lệ
    if (found.maxUses > 0 && found.usedCount >= found.maxUses) {
      return res.status(200).json({
        success: false,
        error: 'Mã coupon này đã hết lượt sử dụng.'
      });
    }

    if (found.expiresAt && Date.now() > found.expiresAt) {
      return res.status(200).json({
        success: false,
        error: 'Mã coupon này đã hết hạn sử dụng.'
      });
    }

    return res.status(200).json({
      success: true,
      coupon: found
    });
  }

  // 2. POST: Tạo mới hoặc kích hoạt coupon
  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const action = body?.action || 'create';

      if (action === 'redeem') {
        const rawCode = (body?.code || '').toString().trim().toUpperCase();
        let found = OFFICIAL_COUPONS[rawCode] || dynamicCoupons.get(rawCode) || null;
        if (found) {
          found.usedCount += 1;
          dynamicCoupons.set(rawCode, found);
          return res.status(200).json({ success: true, coupon: found });
        }
        return res.status(200).json({ success: true, message: 'Đã kích hoạt' });
      }

      // Tạo coupon mới
      const cleanCode = (body?.code || '').toString().trim().toUpperCase();
      if (!cleanCode) {
        return res.status(400).json({ success: false, error: 'Mã coupon không được để trống.' });
      }

      if (OFFICIAL_COUPONS[cleanCode] || dynamicCoupons.has(cleanCode)) {
        return res.status(400).json({ success: false, error: `Mã coupon ${cleanCode} đã tồn tại.` });
      }

      const newCoupon: CouponItem = {
        code: cleanCode,
        type: body.type || 'discount_percent',
        value: Number(body.value) || 0,
        maxUses: Number(body.maxUses) || 100,
        usedCount: 0,
        expiresAt: body.expiresAt ? Number(body.expiresAt) : null,
        createdAt: Date.now(),
        description: body.description?.trim(),
        createdBy: body.createdBy
      };

      dynamicCoupons.set(cleanCode, newCoupon);

      return res.status(200).json({ success: true, coupon: newCoupon });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Lỗi xử lý serverless coupon' });
    }
  }

  return res.status(405).json({ success: false, error: 'Phương thức không được hỗ trợ.' });
}
