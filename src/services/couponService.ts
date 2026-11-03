/**
 * COUPON MANAGEMENT SERVICE
 * ==============================================================================
 * Quản lý kho mã giảm giá & quà tặng đặc quyền PRO ('pomodoro_coupons_store')
 * Hỗ trợ đồng bộ đa kênh (BroadcastChannel, Local & Serverless API, Shared Store),
 * kiểm tra không phân biệt hoa thường và cơ chế cộng dồn (Stacking) / quy đổi 5.000⚡ AI Credits.
 */

import { authService, UserProfile, isOwnerEmail, isLadyBoss, isVipFriend } from './authService';
import { useAiStore } from '../stores/useAiStore';
import { useAuthStore } from '../stores/useAuthStore';
import { ProfileService } from './profileService';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config/env';

export interface Coupon {
  code: string;
  type: 'discount_percent' | 'free_days' | 'free_lifetime';
  value: number; // % giảm giá hoặc số ngày tặng PRO (0 nếu là lifetime)
  maxUses: number;
  usedCount: number;
  expiresAt: number | null; // timestamp ms hoặc null
  createdAt: number;
  description?: string;
  createdBy?: string; // Không dùng để lọc quyền kích hoạt
}

const STORAGE_KEY = 'pomodoro_coupons_store';
const BROADCAST_KEY = 'pomodoro_coupons_bus';

let couponBroadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    couponBroadcastChannel = new BroadcastChannel(BROADCAST_KEY);
  } catch (err) {
    console.debug('[CouponService] BroadcastChannel init warning:', err);
  }
}

export const DEFAULT_COUPONS: Coupon[] = [
  {
    code: 'PRO50',
    type: 'discount_percent',
    value: 50,
    maxUses: 1000,
    usedCount: 0,
    expiresAt: null,
    createdAt: 1730000000000,
    description: 'Giảm giá 50% tất cả các gói'
  },
  {
    code: 'VIP7DAYS',
    type: 'free_days',
    value: 7,
    maxUses: 1000,
    usedCount: 0,
    expiresAt: null,
    createdAt: 1730000000000,
    description: 'Trải nghiệm 7 ngày PRO Miễn Phí'
  },
  {
    code: 'VIP30DAYS',
    type: 'free_days',
    value: 30,
    maxUses: 500,
    usedCount: 0,
    expiresAt: null,
    createdAt: 1730000000000,
    description: 'Trải nghiệm 30 ngày PRO Miễn Phí'
  },
  {
    code: 'BOSSSECRET',
    type: 'free_lifetime',
    value: 0,
    maxUses: 100,
    usedCount: 0,
    expiresAt: null,
    createdAt: 1730000000000,
    description: 'Mã bí mật Chủ sở hữu: Kích hoạt PRO Trọn đời'
  },
  {
    code: 'STUDENT100',
    type: 'free_days',
    value: 14,
    maxUses: 1000,
    usedCount: 0,
    expiresAt: null,
    createdAt: 1730000000000,
    description: 'Học sinh sinh viên: 14 ngày PRO Miễn Phí'
  },
  {
    code: 'STUDYFOCUS',
    type: 'discount_percent',
    value: 30,
    maxUses: 500,
    usedCount: 0,
    expiresAt: null,
    createdAt: 1730000000000,
    description: 'Giảm giá 30% cho không gian học tập'
  },
  {
    code: 'POMO2026',
    type: 'discount_percent',
    value: 20,
    maxUses: 1000,
    usedCount: 0,
    expiresAt: null,
    createdAt: 1730000000000,
    description: 'Khuyến mãi năm 2026: Giảm 20%'
  },
  {
    code: 'LADYBOSS',
    type: 'free_lifetime',
    value: 0,
    maxUses: 10,
    usedCount: 0,
    expiresAt: null,
    createdAt: 1730000000000,
    description: 'Đặc quyền Nóc Nhà: Kích hoạt PRO Trọn đời'
  },
  {
    code: 'NAMHO',
    type: 'free_lifetime',
    value: 0,
    maxUses: 10,
    usedCount: 0,
    expiresAt: null,
    createdAt: 1730000000000,
    description: 'Đặc quyền Chủ sở hữu: Kích hoạt PRO Trọn đời'
  },
  {
    code: 'HUYENTRAN',
    type: 'free_lifetime',
    value: 0,
    maxUses: 10,
    usedCount: 0,
    expiresAt: null,
    createdAt: 1730000000000,
    description: 'Đặc quyền Vợ Sếp: Kích hoạt PRO Trọn đời'
  }
];

export const couponService = {
  getCoupons(): Coupon[] {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
      let storedList: Coupon[] = [];
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) storedList = parsed;
        } catch {
          storedList = [];
        }
      }

      // Hợp nhất đảm bảo các mã mặc định hệ thống luôn luôn khả dụng
      const merged: Coupon[] = [...storedList];
      for (const def of DEFAULT_COUPONS) {
        if (!merged.some((c) => c.code.trim().toUpperCase() === def.code.trim().toUpperCase())) {
          merged.push(def);
        }
      }

      if (typeof window !== 'undefined' && merged.length !== storedList.length) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      }

      return merged.length > 0 ? merged : DEFAULT_COUPONS;
    } catch {
      return DEFAULT_COUPONS;
    }
  },

  saveCoupons(coupons: Coupon[]): void {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(coupons));
      }
      if (couponBroadcastChannel) {
        couponBroadcastChannel.postMessage({ type: 'COUPONS_UPDATED', coupons });
      }
    } catch (e) {
      console.error('Không thể lưu danh sách coupon:', e);
    }
  },

  createCoupon(input: {
    code: string;
    type: 'discount_percent' | 'free_days' | 'free_lifetime';
    value: number;
    maxUses: number;
    expiresAt?: number | null;
    description?: string;
    createdBy?: string;
  }): { success: boolean; coupon?: Coupon; error?: string } {
    const cleanCode = input.code.trim().toUpperCase();
    if (!cleanCode) {
      return { success: false, error: 'Mã coupon không được để trống.' };
    }

    const coupons = this.getCoupons();
    if (coupons.some((c) => c.code.trim().toUpperCase() === cleanCode)) {
      return { success: false, error: `Mã coupon ${cleanCode} đã tồn tại.` };
    }

    const newCoupon: Coupon = {
      code: cleanCode,
      type: input.type,
      value: Math.max(0, input.value),
      maxUses: Math.max(1, input.maxUses),
      usedCount: 0,
      expiresAt: input.expiresAt || null,
      createdAt: Date.now(),
      description: input.description?.trim() || undefined,
      createdBy: input.createdBy
    };

    coupons.unshift(newCoupon);
    this.saveCoupons(coupons);

    // Đồng bộ lên Serverless API /api/coupons
    if (typeof window !== 'undefined') {
      fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCoupon)
      }).catch(() => {});
    }

    // Thử đồng bộ dự phòng lên Supabase
    try {
      const baseUrl = SUPABASE_URL.replace(/\/+$/, '');
      fetch(`${baseUrl}/rest/v1/coupons`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          code: newCoupon.code,
          type: newCoupon.type,
          value: newCoupon.value,
          max_uses: newCoupon.maxUses,
          used_count: 0,
          expires_at: newCoupon.expiresAt ? new Date(newCoupon.expiresAt).toISOString() : null,
          description: newCoupon.description,
          created_by: newCoupon.createdBy
        })
      }).catch(() => {});
    } catch {
      // Ignored
    }

    return { success: true, coupon: newCoupon };
  },

  /**
   * Truy vấn mã coupon dùng chung từ Serverless API hoặc Supabase Cloud
   */
  async fetchCouponFromSupabase(code: string): Promise<Coupon | null> {
    const clean = code.trim().toUpperCase();
    if (!clean) return null;

    // 1. Kiểm tra trong kho nội bộ hiện tại trước
    const existing = this.getCoupons().find((c) => c.code.trim().toUpperCase() === clean);
    if (existing) return existing;

    // 2. Thử truy vấn qua serverless endpoint /api/coupons (Hoạt động đa thiết bị, không lỗi DB)
    if (typeof window !== 'undefined') {
      try {
        const apiRes = await fetch(`/api/coupons?code=${encodeURIComponent(clean)}`);
        if (apiRes.ok) {
          const json = await apiRes.json();
          if (json.success && json.coupon) {
            const row = json.coupon;
            const c: Coupon = {
              code: row.code,
              type: row.type,
              value: Number(row.value) || 0,
              maxUses: Number(row.maxUses) || 100,
              usedCount: Number(row.usedCount) || 0,
              expiresAt: row.expiresAt ? Number(row.expiresAt) : null,
              createdAt: row.createdAt ? Number(row.createdAt) : Date.now(),
              description: row.description,
              createdBy: row.createdBy
            };
            const coupons = this.getCoupons();
            const idx = coupons.findIndex((item) => item.code.trim().toUpperCase() === c.code.trim().toUpperCase());
            if (idx !== -1) {
              coupons[idx] = c;
            } else {
              coupons.unshift(c);
            }
            this.saveCoupons(coupons);
            return c;
          }
        }
      } catch {
        // Tiếp tục thử Supabase
      }
    }

    // 3. Thử truy vấn dự phòng qua Supabase REST
    try {
      const baseUrl = SUPABASE_URL.replace(/\/+$/, '');
      const url = `${baseUrl}/rest/v1/coupons?code=eq.${encodeURIComponent(clean)}&select=*`;
      const res = await fetch(url, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Accept': 'application/json'
        }
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) return null;

      const row = data[0];
      const coupon: Coupon = {
        code: row.code,
        type: row.type,
        value: Number(row.value) || 0,
        maxUses: Number(row.max_uses) || 100,
        usedCount: Number(row.used_count) || 0,
        expiresAt: row.expires_at ? new Date(row.expires_at).getTime() : null,
        createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
        description: row.description || undefined,
        createdBy: row.created_by || undefined
      };

      const coupons = this.getCoupons();
      const idx = coupons.findIndex((c) => c.code === coupon.code);
      if (idx !== -1) {
        coupons[idx] = coupon;
      } else {
        coupons.unshift(coupon);
      }
      this.saveCoupons(coupons);
      return coupon;
    } catch {
      return null;
    }
  },

  deleteCoupon(code: string): boolean {
    const clean = code.trim().toUpperCase();
    const coupons = this.getCoupons();
    const filtered = coupons.filter((c) => c.code.trim().toUpperCase() !== clean);
    if (filtered.length === coupons.length) return false;
    this.saveCoupons(filtered);
    return true;
  },

  /**
   * Kiểm tra mã coupon: Chuyển toàn bộ về chữ hoa `code.trim().toUpperCase()`.
   * Bỏ điều kiện lọc mã theo user_id người tạo (cho phép bất kỳ ai có mã hợp lệ và chưa sử dụng đều kích hoạt được).
   */
  validateCoupon(code: string): { valid: boolean; coupon?: Coupon; error?: string } {
    const clean = code.trim().toUpperCase();
    if (!clean) {
      return { valid: false, error: 'Vui lòng nhập mã coupon.' };
    }

    const coupons = this.getCoupons();
    const found = coupons.find((c) => c.code.trim().toUpperCase() === clean);
    if (!found) {
      return { valid: false, error: 'Mã coupon không tồn tại hoặc đã hết hạn.' };
    }

    if (found.maxUses > 0 && found.usedCount >= found.maxUses) {
      return { valid: false, error: 'Mã coupon này đã hết lượt sử dụng.' };
    }

    if (found.expiresAt && Date.now() > found.expiresAt) {
      return { valid: false, error: 'Mã coupon này đã hết hạn sử dụng.' };
    }

    return { valid: true, coupon: found };
  },

  /**
   * Kích hoạt mã coupon:
   * - Hỗ trợ cho TẤT CẢ người dùng (Khách, Học Viên, PRO, Lifetime).
   * - Tự động khởi tạo phiên học viên nếu chưa đăng nhập, tuyệt đối không chặn người dùng.
   * - Cơ chế cộng dồn (Stacking): Nếu tài khoản đang có gói PRO còn hạn, cộng tiếp thời hạn vào ngày hết hạn hiện tại.
   * - Nếu là tài khoản Trọn Đời (Lifetime Founder): Tự động quy đổi thành tặng thêm 5.000⚡ AI Credits vào ví.
   */
  redeemCoupon(code: string, user: UserProfile | null): {
    success: boolean;
    message: string;
    discountPercent?: number;
    coupon?: Coupon;
    creditsAdded?: number;
  } {
    // 1. Tự động khởi tạo hoặc lấy phiên hiện tại nếu chưa đăng nhập
    let currentUser = user;
    if (!currentUser) {
      currentUser = authService.getCurrentSession();
      if (!currentUser) {
        currentUser = {
          id: `usr_${Date.now()}`,
          email: 'student@pomofocus.local',
          displayName: 'Học Viên',
          plan: 'free',
          createdAt: Date.now()
        };
        authService.saveSession(currentUser);
      }
    }

    const validation = this.validateCoupon(code);
    if (!validation.valid || !validation.coupon) {
      return { success: false, message: validation.error || 'Mã không hợp lệ.' };
    }

    const coupon = validation.coupon;

    // 2. Tăng số lần sử dụng cục bộ
    const coupons = this.getCoupons();
    const idx = coupons.findIndex((c) => c.code.trim().toUpperCase() === coupon.code.trim().toUpperCase());
    if (idx !== -1) {
      coupons[idx].usedCount += 1;
      this.saveCoupons(coupons);
    }

    // 3. Thông báo Serverless API
    if (typeof window !== 'undefined') {
      fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'redeem', code: coupon.code })
      }).catch(() => {});
    }

    // 4. Thử cập nhật used_count lên Supabase
    try {
      const baseUrl = SUPABASE_URL.replace(/\/+$/, '');
      fetch(`${baseUrl}/rest/v1/coupons?code=eq.${encodeURIComponent(coupon.code)}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          used_count: (coupon.usedCount || 0) + 1
        })
      }).catch(() => {});
    } catch {
      // Ignored
    }

    // 5. Kiểm tra quyền Lifetime
    const isLifetimeUser = Boolean(
      currentUser.isLifetime ||
      currentUser.plan === 'pro_lifetime' ||
      isOwnerEmail(currentUser.email) ||
      isLadyBoss(currentUser.email) ||
      isVipFriend(currentUser.email)
    );

    // Trường hợp 1: Tài khoản Trọn Đời (Lifetime Founder) nhập mã quà tặng PRO
    if (isLifetimeUser) {
      if (coupon.type === 'free_days' || coupon.type === 'free_lifetime') {
        useAiStore.getState().addCredits(5000);
        return {
          success: true,
          message: 'Đổi mã thành công! Bạn đang sở hữu gói Trọn Đời nên mã quà tặng PRO đã được quy đổi thành +5.000⚡ AI Credits vào ví! 🎉',
          coupon,
          creditsAdded: 5000
        };
      }
      return {
        success: true,
        message: `Bạn đang sở hữu gói PRO Trọn Đời vĩnh viễn! Mã giảm giá ${coupon.value}% đã được ghi nhận. 👑`,
        discountPercent: coupon.value,
        coupon
      };
    }

    // Trường hợp 2: Kích hoạt gói Trọn Đời vĩnh viễn
    if (coupon.type === 'free_lifetime') {
      authService.upgradePlan(currentUser.id, 'pro_lifetime', 999);
      ProfileService.updateFields(currentUser.id, { plan: 'lifetime' }).catch(() => {});
      const refreshed = authService.getCurrentSession();
      if (refreshed) {
        useAuthStore.setState({
          user: refreshed,
          isPro: true,
          isLifetime: true,
          planLabel: 'PRO TRỌN ĐỜI 👑'
        });
      }
      return {
        success: true,
        message: 'Chúc mừng! Bạn đã được kích hoạt gói PRO TRỌN ĐỜI vĩnh viễn! 🎉',
        coupon
      };
    }

    // Trường hợp 3: Quà tặng ngày PRO -> Cơ chế cộng dồn (Stacking) vào ngày hết hạn hiện tại
    if (coupon.type === 'free_days') {
      const days = coupon.value || 7;
      authService.extendProDays(days);
      const updatedUser = authService.getCurrentSession();
      if (updatedUser?.proExpiresAt) {
        ProfileService.updateFields(currentUser.id, {
          plan: 'pro',
          plan_expires_at: new Date(updatedUser.proExpiresAt).toISOString()
        }).catch(() => {});
      }
      if (updatedUser) {
        useAuthStore.setState({
          user: updatedUser,
          isPro: true,
          planLabel: 'PRO BETA'
        });
      }
      const expiryText = updatedUser?.proExpiresAt
        ? ` (Hạn mới: ${new Date(updatedUser.proExpiresAt).toLocaleDateString('vi-VN')})`
        : '';
      return {
        success: true,
        message: `Chúc mừng! Đã cộng dồn thành công +${days} ngày PRO vào tài khoản!${expiryText} 🚀`,
        coupon
      };
    }

    // Trường hợp 4: Mã giảm giá % (discount_percent)
    return {
      success: true,
      message: `Áp dụng thành công mã giảm ${coupon.value}%! 💰`,
      discountPercent: coupon.value,
      coupon
    };
  },

  /**
   * Kích hoạt mã coupon bất đồng bộ: Tự động tra cứu từ Serverless API / Supabase nếu máy chưa lưu mã
   */
  async redeemCouponAsync(code: string, user: UserProfile | null) {
    await this.fetchCouponFromSupabase(code);
    return this.redeemCoupon(code, user);
  }
};
