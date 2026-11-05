/**
 * SERVERLESS COUPON API ENDPOINT (/api/coupons)
 * ==============================================================================
 * Cung cấp API xác thực, truy vấn và quản lý kho mã giảm giá động dùng chung toàn cầu.
 * Tích hợp trực tiếp với Supabase Cloud (bảng public.coupons & RPC redeem_dynamic_coupon),
 * hỗ trợ cơ chế Zero-Deploy, Atomic Counter và User-Deduplication.
 */

export type CouponType = 'lifetime' | 'free_lifetime' | 'discount_percent' | 'free_days' | 'credits';

export interface CouponItem {
  id?: string;
  code: string;
  type: CouponType;
  value: number; // % giảm giá hoặc số ngày tặng PRO hoặc số credits
  discountPercent?: number;
  freeDays?: number;
  creditsReward?: number;
  maxUses: number | null;
  usedCount: number;
  isActive?: boolean;
  expiresAt: number | null; // timestamp ms hoặc null
  createdAt: number;
  description?: string;
  createdBy?: string;
}

// Kho coupon mặc định của hệ thống
const OFFICIAL_COUPONS: Record<string, CouponItem> = {
  'EIU': {
    code: 'EIU',
    type: 'free_lifetime',
    value: 0,
    maxUses: 1,
    usedCount: 0,
    isActive: true,
    expiresAt: null,
    createdAt: 1730000000000,
    description: 'Đặc quyền EIU - Kích hoạt PRO TRỌN ĐỜI vĩnh viễn'
  },
  'PRO50': {
    code: 'PRO50',
    type: 'discount_percent',
    value: 50,
    discountPercent: 50,
    maxUses: 1000,
    usedCount: 0,
    isActive: true,
    expiresAt: null,
    createdAt: 1730000000000,
    description: 'Giảm giá 50% tất cả các gói'
  },
  'VIP7DAYS': {
    code: 'VIP7DAYS',
    type: 'free_days',
    value: 7,
    freeDays: 7,
    maxUses: 1000,
    usedCount: 0,
    isActive: true,
    expiresAt: null,
    createdAt: 1730000000000,
    description: 'Trải nghiệm 7 ngày PRO Miễn Phí'
  },
  'VIP30DAYS': {
    code: 'VIP30DAYS',
    type: 'free_days',
    value: 30,
    freeDays: 30,
    maxUses: 500,
    usedCount: 0,
    isActive: true,
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
    isActive: true,
    expiresAt: null,
    createdAt: 1730000000000,
    description: 'Mã bí mật Chủ sở hữu: Kích hoạt PRO Trọn đời'
  },
  'STUDENT100': {
    code: 'STUDENT100',
    type: 'free_days',
    value: 14,
    freeDays: 14,
    maxUses: 1000,
    usedCount: 0,
    isActive: true,
    expiresAt: null,
    createdAt: 1730000000000,
    description: 'Học sinh sinh viên: 14 ngày PRO Miễn Phí'
  },
  'STUDYFOCUS': {
    code: 'STUDYFOCUS',
    type: 'discount_percent',
    value: 30,
    discountPercent: 30,
    maxUses: 500,
    usedCount: 0,
    isActive: true,
    expiresAt: null,
    createdAt: 1730000000000,
    description: 'Giảm giá 30% cho không gian học tập'
  },
  'POMO2026': {
    code: 'POMO2026',
    type: 'discount_percent',
    value: 20,
    discountPercent: 20,
    maxUses: 1000,
    usedCount: 0,
    isActive: true,
    expiresAt: null,
    createdAt: 1730000000000,
    description: 'Khởi đầu năm mới cùng PomoFocus 2026'
  },
  'LADYBOSS': {
    code: 'LADYBOSS',
    type: 'free_lifetime',
    value: 0,
    maxUses: 10,
    usedCount: 0,
    isActive: true,
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
    isActive: true,
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
    isActive: true,
    expiresAt: null,
    createdAt: 1730000000000,
    description: 'Đặc quyền Vợ Sếp: Kích hoạt PRO Trọn đời'
  }
};

// Lưu trữ in-memory cache cho instance runtime
const dynamicCoupons: Map<string, CouponItem> = new Map();
// Lưu trữ vết đổi mã theo user_id trong instance để chống spam
const redeemedUsers: Map<string, Set<string>> = new Map();

function getSupabaseEnv() {
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  return { url, key };
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { url: supabaseUrl, key: supabaseKey } = getSupabaseEnv();

  // 1. GET: Truy vấn danh sách coupon hoặc kiểm tra 1 mã cụ thể
  if (req.method === 'GET') {
    const rawCode = (req.query?.code || '').toString().trim().toUpperCase();

    if (!rawCode) {
      // Trả về toàn bộ danh sách coupon cho Owner
      let cloudList: CouponItem[] = [];

      if (supabaseUrl && supabaseKey) {
        try {
          const sbRes = await fetch(`${supabaseUrl}/rest/v1/coupons?select=*&order=created_at.desc`, {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
              Accept: 'application/json'
            }
          });
          if (sbRes.ok) {
            const rows = await sbRes.json();
            if (Array.isArray(rows)) {
              cloudList = rows.map((r: any) => ({
                id: r.id,
                code: r.code,
                type: r.type,
                value: Number(r.value || r.discount_percent || r.free_days || r.credits_reward || 0),
                discountPercent: Number(r.discount_percent || (r.type === 'discount_percent' ? r.value : 0)),
                freeDays: Number(r.free_days || (r.type === 'free_days' ? r.value : 0)),
                creditsReward: Number(r.credits_reward || (r.type === 'credits' ? r.value : 0)),
                maxUses: r.max_uses !== null && r.max_uses !== undefined ? Number(r.max_uses) : null,
                usedCount: Number(r.used_count || 0),
                isActive: r.is_active !== false,
                expiresAt: r.expires_at ? new Date(r.expires_at).getTime() : null,
                createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
                description: r.description,
                createdBy: r.created_by
              }));
            }
          }
        } catch {}
      }

      // Hợp nhất danh sách
      const map = new Map<string, CouponItem>();
      for (const c of Object.values(OFFICIAL_COUPONS)) map.set(c.code, c);
      for (const c of dynamicCoupons.values()) map.set(c.code, c);
      for (const c of cloudList) map.set(c.code, c);

      const all = Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);
      return res.status(200).json({ success: true, count: all.length, coupons: all });
    }

    // Tra cứu mã cụ thể
    let found = OFFICIAL_COUPONS[rawCode] || dynamicCoupons.get(rawCode) || null;

    if (supabaseUrl && supabaseKey) {
      try {
        const sbRes = await fetch(`${supabaseUrl}/rest/v1/coupons?code=eq.${encodeURIComponent(rawCode)}&select=*`, {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            Accept: 'application/json'
          }
        });
        if (sbRes.ok) {
          const rows = await sbRes.json();
          if (Array.isArray(rows) && rows.length > 0) {
            const r = rows[0];
            found = {
              id: r.id,
              code: r.code,
              type: r.type,
              value: Number(r.value || r.discount_percent || r.free_days || r.credits_reward || 0),
              discountPercent: Number(r.discount_percent || (r.type === 'discount_percent' ? r.value : 0)),
              freeDays: Number(r.free_days || (r.type === 'free_days' ? r.value : 0)),
              creditsReward: Number(r.credits_reward || (r.type === 'credits' ? r.value : 0)),
              maxUses: r.max_uses !== null && r.max_uses !== undefined ? Number(r.max_uses) : null,
              usedCount: Number(r.used_count || 0),
              isActive: r.is_active !== false,
              expiresAt: r.expires_at ? new Date(r.expires_at).getTime() : null,
              createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
              description: r.description,
              createdBy: r.created_by
            };
            dynamicCoupons.set(rawCode, found);
          }
        }
      } catch {}
    }

    if (!found) {
      return res.status(200).json({ success: false, error: 'Mã coupon không tồn tại hoặc đã bị khóa.' });
    }

    if (found.isActive === false) {
      return res.status(200).json({ success: false, error: 'Mã coupon này đang tạm thời bị khóa.' });
    }

    if (found.maxUses !== null && found.maxUses > 0 && found.usedCount >= found.maxUses) {
      return res.status(200).json({ success: false, error: 'Mã coupon đã đạt giới hạn lượt sử dụng!' });
    }

    if (found.expiresAt && Date.now() > found.expiresAt) {
      return res.status(200).json({ success: false, error: 'Mã coupon này đã hết hạn sử dụng.' });
    }

    return res.status(200).json({ success: true, coupon: found });
  }

  // 2. POST: Thao tác Tạo mới, Kích hoạt (Redeem), Khóa/Mở (Toggle), hoặc Xóa
  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const action = body?.action || 'create';

      // 2.1. ĐỔI MÃ (REDEEM / ATOMIC DYNAMIC RPC)
      if (action === 'redeem' || action === 'redeem_dynamic') {
        const rawCode = (body?.code || '').toString().trim().toUpperCase();
        const userId = (body?.userId || body?.user_id || 'anonymous_user').toString().trim();

        // Thử thực thi qua Stored Procedure redeem_dynamic_coupon trên Supabase Cloud
        if (supabaseUrl && supabaseKey) {
          try {
            const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/redeem_dynamic_coupon`, {
              method: 'POST',
              headers: {
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ p_code: rawCode, p_user_id: userId })
            });

            if (rpcRes.ok) {
              const rpcData = await rpcRes.json();
              if (rpcData && typeof rpcData === 'object') {
                return res.status(200).json(rpcData);
              }
            }
          } catch {}
        }

        // In-memory fallback
        let found = OFFICIAL_COUPONS[rawCode] || dynamicCoupons.get(rawCode) || null;
        if (!found) {
          return res.status(200).json({ success: false, message: 'Mã coupon không tồn tại hoặc đã bị khóa.' });
        }

        if (found.isActive === false) {
          return res.status(200).json({ success: false, message: 'Mã coupon này đang bị khóa.' });
        }

        if (found.expiresAt && Date.now() > found.expiresAt) {
          return res.status(200).json({ success: false, message: 'Mã coupon này đã hết hạn sử dụng.' });
        }

        if (found.maxUses !== null && found.maxUses > 0 && found.usedCount >= found.maxUses) {
          return res.status(200).json({ success: false, message: 'Mã coupon đã đạt giới hạn lượt sử dụng!' });
        }

        // Chống 1 người dùng nhập nhiều lần
        const userSet = redeemedUsers.get(rawCode) || new Set<string>();
        if (userId && userSet.has(userId)) {
          return res.status(200).json({ success: false, message: 'Bạn đã sử dụng mã ưu đãi này rồi.' });
        }
        if (userId) userSet.add(userId);
        redeemedUsers.set(rawCode, userSet);

        found.usedCount += 1;
        dynamicCoupons.set(rawCode, found);

        return res.status(200).json({
          success: true,
          code: found.code,
          type: found.type === 'free_lifetime' ? 'lifetime' : found.type,
          discount_percent: found.discountPercent || (found.type === 'discount_percent' ? found.value : 0),
          free_days: found.freeDays || (found.type === 'free_days' ? found.value : 0),
          credits_reward: found.creditsReward || (found.type === 'credits' ? found.value : 0),
          used_count: found.usedCount,
          max_uses: found.maxUses,
          remaining_uses: found.maxUses !== null ? Math.max(0, found.maxUses - found.usedCount) : null
        });
      }

      // 2.2. TẠO COUPON ĐỘNG MỚI (ZERO-DEPLOY)
      if (action === 'create') {
        const cleanCode = (body?.code || '').toString().trim().toUpperCase();
        if (!cleanCode) {
          return res.status(400).json({ success: false, error: 'Mã coupon không được để trống.' });
        }

        const rawType = body.type || 'lifetime';
        const normType: CouponType =
          rawType === 'lifetime' || rawType === 'free_lifetime'
            ? 'lifetime'
            : rawType === 'credits'
            ? 'credits'
            : rawType === 'free_days'
            ? 'free_days'
            : 'discount_percent';

        const numVal = Number(body.value || body.discount_percent || body.free_days || body.credits_reward || 0);
        const maxUses =
          body.maxUses !== null && body.maxUses !== undefined && body.maxUses !== ''
            ? Number(body.maxUses)
            : null;

        const newCoupon: CouponItem = {
          code: cleanCode,
          type: normType,
          value: numVal,
          discountPercent: normType === 'discount_percent' ? numVal : 0,
          freeDays: normType === 'free_days' ? numVal : 0,
          creditsReward: normType === 'credits' ? numVal : 0,
          maxUses,
          usedCount: 0,
          isActive: true,
          expiresAt: body.expiresAt ? Number(body.expiresAt) : null,
          createdAt: Date.now(),
          description: (body.description || '').toString().trim(),
          createdBy: body.createdBy
        };

        // Lưu trực tiếp lên Supabase Cloud
        if (supabaseUrl && supabaseKey) {
          try {
            await fetch(`${supabaseUrl}/rest/v1/coupons`, {
              method: 'POST',
              headers: {
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                Prefer: 'resolution=merge-duplicates,return=minimal'
              },
              body: JSON.stringify({
                code: cleanCode,
                type: normType,
                value: numVal,
                discount_percent: newCoupon.discountPercent,
                free_days: newCoupon.freeDays,
                credits_reward: newCoupon.creditsReward,
                max_uses: maxUses,
                used_count: 0,
                is_active: true,
                expires_at: newCoupon.expiresAt ? new Date(newCoupon.expiresAt).toISOString() : null,
                description: newCoupon.description,
                created_by: body.createdBy || null
              })
            });
          } catch {}
        }

        dynamicCoupons.set(cleanCode, newCoupon);
        return res.status(200).json({ success: true, coupon: newCoupon });
      }

      // 2.3. BẬT / KHÓA MÃ COUPON
      if (action === 'toggle_active') {
        const cleanCode = (body?.code || '').toString().trim().toUpperCase();
        const nextActive = Boolean(body?.isActive ?? body?.is_active ?? true);

        if (supabaseUrl && supabaseKey) {
          try {
            await fetch(`${supabaseUrl}/rest/v1/coupons?code=eq.${encodeURIComponent(cleanCode)}`, {
              method: 'PATCH',
              headers: {
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                Prefer: 'return=minimal'
              },
              body: JSON.stringify({ is_active: nextActive, updated_at: new Date().toISOString() })
            });
          } catch {}
        }

        const existing = dynamicCoupons.get(cleanCode);
        if (existing) {
          existing.isActive = nextActive;
          dynamicCoupons.set(cleanCode, existing);
        }

        return res.status(200).json({ success: true, code: cleanCode, isActive: nextActive });
      }

      // 2.4. XÓA MÃ COUPON
      if (action === 'delete') {
        const cleanCode = (body?.code || '').toString().trim().toUpperCase();

        if (supabaseUrl && supabaseKey) {
          try {
            await fetch(`${supabaseUrl}/rest/v1/coupons?code=eq.${encodeURIComponent(cleanCode)}`, {
              method: 'DELETE',
              headers: {
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`
              }
            });
          } catch {}
        }

        dynamicCoupons.delete(cleanCode);
        delete OFFICIAL_COUPONS[cleanCode];

        return res.status(200).json({ success: true, message: `Đã xóa mã ${cleanCode}` });
      }

      // 2.5. CẬP NHẬT SỐ LƯỢT DÙNG TỐI ĐA (UPDATE MAX USES)
      if (action === 'update_max_uses') {
        const cleanCode = (body?.code || '').toString().trim().toUpperCase();
        const maxUses =
          body.maxUses !== null && body.maxUses !== undefined && body.maxUses !== ''
            ? Number(body.maxUses)
            : null;

        if (supabaseUrl && supabaseKey) {
          try {
            await fetch(`${supabaseUrl}/rest/v1/coupons?code=eq.${encodeURIComponent(cleanCode)}`, {
              method: 'PATCH',
              headers: {
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                Prefer: 'return=minimal'
              },
              body: JSON.stringify({ max_uses: maxUses, updated_at: new Date().toISOString() })
            });
          } catch {}
        }

        const existing = dynamicCoupons.get(cleanCode) || OFFICIAL_COUPONS[cleanCode];
        if (existing) {
          existing.maxUses = maxUses;
          dynamicCoupons.set(cleanCode, existing);
        }

        return res.status(200).json({ success: true, code: cleanCode, maxUses });
      }

      return res.status(400).json({ success: false, error: 'Hành động không hợp lệ.' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Lỗi xử lý serverless coupon' });
    }
  }

  return res.status(405).json({ success: false, error: 'Phương thức không được hỗ trợ.' });
}
