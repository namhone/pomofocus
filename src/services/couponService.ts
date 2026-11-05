/**
 * COUPON MANAGEMENT SERVICE
 * ==============================================================================
 * Quản lý kho mã giảm giá & quà tặng đặc quyền PRO ('pomodoro_coupons_store')
 * Hỗ trợ Dynamic Cloud Coupon Engine (Supabase RPC redeem_dynamic_coupon, Zero-deploy),
 * Atomic Counter, User-Deduplication, đa kênh BroadcastChannel và Offline Resilience.
 */

import { authService, UserProfile, isOwnerEmail, isLadyBoss, isVipFriend } from './authService';
import { useAiStore } from '../stores/useAiStore';
import { useAuthStore } from '../stores/useAuthStore';
import { ProfileService } from './profileService';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config/env';
import { supabase } from '../lib/supabase';

export type CouponType = 'lifetime' | 'free_lifetime' | 'discount_percent' | 'free_days' | 'credits';

export interface Coupon {
  id?: string;
  code: string;
  type: CouponType;
  value: number; // % giảm giá hoặc số ngày tặng PRO hoặc credits (0 nếu là lifetime)
  discountPercent?: number;
  freeDays?: number;
  creditsReward?: number;
  maxUses: number | null; // null = không giới hạn
  usedCount: number;
  isActive?: boolean;
  expiresAt: number | null; // timestamp ms hoặc null
  createdAt: number;
  description?: string;
  createdBy?: string;
}

export interface RedeemCouponResult {
  success: boolean;
  message: string;
  discountPercent?: number;
  creditsAdded?: number;
  coupon?: Coupon;
  remainingUses?: number | null;
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

function safeFetchApi(url: string, init?: RequestInit): Promise<Response> {
  const fullUrl =
    typeof window !== 'undefined' && window.location?.origin
      ? `${window.location.origin}${url}`
      : `https://pomofocus-workspace.vercel.app${url}`;
  return fetch(fullUrl, init);
}

export const DEFAULT_COUPONS: Coupon[] = [
  {
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
  {
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
  {
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
  {
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
  {
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
  {
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
  {
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
  {
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
  {
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
  {
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
  {
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
      return merged;
    } catch {
      return [...DEFAULT_COUPONS];
    }
  },

  saveCoupons(coupons: Coupon[]): void {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(coupons));
        if (couponBroadcastChannel) {
          try {
            couponBroadcastChannel.postMessage({ type: 'COUPONS_UPDATED', count: coupons.length });
          } catch {}
        }
      }
    } catch (e) {
      console.warn('[CouponService] Lỗi ghi localStorage:', e);
    }
  },

  createCoupon(couponData: {
    code: string;
    type: CouponType;
    value: number;
    maxUses?: number | null;
    expiresAt?: number | null;
    description?: string;
    createdBy?: string;
  }): { success: boolean; coupon?: Coupon; error?: string } {
    const cleanCode = couponData.code.trim().toUpperCase();

    if (!cleanCode) {
      return { success: false, error: 'Mã coupon không được để trống.' };
    }

    if (!/^[A-Z0-9_-]{3,30}$/.test(cleanCode)) {
      return {
        success: false,
        error: 'Mã chỉ được chứa chữ hoa không dấu, chữ số, dấu gạch nối (3 - 30 ký tự).'
      };
    }

    const currentList = this.getCoupons();
    const exists = currentList.some((c) => c.code.trim().toUpperCase() === cleanCode);
    if (exists) {
      return { success: false, error: `Mã coupon "${cleanCode}" đã tồn tại trong hệ thống.` };
    }

    const normType = couponData.type === 'lifetime' ? 'free_lifetime' : couponData.type;
    const maxUses =
      couponData.maxUses !== undefined && couponData.maxUses !== null && couponData.maxUses !== ('' as any)
        ? Number(couponData.maxUses)
        : 100;

    const newCoupon: Coupon = {
      code: cleanCode,
      type: normType,
      value: couponData.value,
      discountPercent: couponData.type === 'discount_percent' ? couponData.value : 0,
      freeDays: couponData.type === 'free_days' ? couponData.value : 0,
      creditsReward: couponData.type === 'credits' ? couponData.value : 0,
      maxUses,
      usedCount: 0,
      isActive: true,
      expiresAt: couponData.expiresAt || null,
      createdAt: Date.now(),
      description: couponData.description?.trim(),
      createdBy: couponData.createdBy
    };

    currentList.unshift(newCoupon);
    this.saveCoupons(currentList);

    // Đồng bộ lên Serverless API /api/coupons
    if (typeof window !== 'undefined') {
      safeFetchApi('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCoupon)
      }).catch(() => {});
    }

    // Đồng bộ lên Supabase
    try {
      const baseUrl = SUPABASE_URL.replace(/\/+$/, '');
      fetch(`${baseUrl}/rest/v1/coupons`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates,return=minimal'
        },
        body: JSON.stringify({
          code: newCoupon.code,
          type: newCoupon.type,
          value: newCoupon.value,
          discount_percent: newCoupon.discountPercent,
          free_days: newCoupon.freeDays,
          credits_reward: newCoupon.creditsReward,
          max_uses: newCoupon.maxUses,
          used_count: 0,
          is_active: true,
          expires_at: newCoupon.expiresAt ? new Date(newCoupon.expiresAt).toISOString() : null,
          description: newCoupon.description,
          created_by: newCoupon.createdBy
        })
      }).catch(() => {});
    } catch {}

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

    // 2. Thử truy vấn qua serverless endpoint /api/coupons
    if (typeof window !== 'undefined') {
      try {
        const apiRes = await fetch(`/api/coupons?code=${encodeURIComponent(clean)}`);
        if (apiRes.ok) {
          const json = await apiRes.json();
          if (json.success && json.coupon) {
            const row = json.coupon;
            const c: Coupon = {
              id: row.id,
              code: row.code,
              type: row.type,
              value: Number(row.value) || 0,
              discountPercent: Number(row.discountPercent || row.discount_percent || 0),
              freeDays: Number(row.freeDays || row.free_days || 0),
              creditsReward: Number(row.creditsReward || row.credits_reward || 0),
              maxUses: row.maxUses !== null && row.maxUses !== undefined ? Number(row.maxUses) : null,
              usedCount: Number(row.usedCount) || 0,
              isActive: row.isActive !== false,
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
      } catch {}
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
        id: row.id,
        code: row.code,
        type: row.type,
        value: Number(row.value) || 0,
        discountPercent: Number(row.discount_percent || 0),
        freeDays: Number(row.free_days || 0),
        creditsReward: Number(row.credits_reward || 0),
        maxUses: row.max_uses !== null && row.max_uses !== undefined ? Number(row.max_uses) : null,
        usedCount: Number(row.used_count) || 0,
        isActive: row.is_active !== false,
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
    this.saveCoupons(filtered);

    if (typeof window !== 'undefined') {
      safeFetchApi('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', code: clean })
      }).catch(() => {});
    }

    return true;
  },

  validateCoupon(code: string): { valid: boolean; error?: string; coupon?: Coupon } {
    const clean = code.trim().toUpperCase();
    if (!clean) {
      return { valid: false, error: 'Vui lòng nhập mã coupon.' };
    }

    const coupon = this.getCoupons().find((c) => c.code.trim().toUpperCase() === clean);
    if (!coupon) {
      return { valid: false, error: 'Mã coupon không tồn tại hoặc đã hết hạn.' };
    }

    if (coupon.isActive === false) {
      return { valid: false, error: 'Mã coupon này đang tạm thời bị khóa.' };
    }

    if (coupon.maxUses !== null && coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
      return { valid: false, error: 'Mã coupon đã đạt giới hạn lượt sử dụng!' };
    }

    if (coupon.expiresAt && Date.now() > coupon.expiresAt) {
      return { valid: false, error: 'Mã coupon này đã hết hạn sử dụng.' };
    }

    return { valid: true, coupon };
  },

  redeemCoupon(
    code: string,
    user: UserProfile | null
  ): {
    success: boolean;
    message: string;
    discountPercent?: number;
    creditsAdded?: number;
    coupon?: Coupon;
    remainingUses?: number | null;
  } {
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
      safeFetchApi('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'redeem_dynamic', code: coupon.code, userId: currentUser.id })
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
    } catch {}

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
      if (coupon.type === 'free_days' || coupon.type === 'free_lifetime' || coupon.type === 'lifetime') {
        const credits =
          coupon.code.trim().toUpperCase() === 'VIP7DAYS' || coupon.value === 7
            ? 750
            : coupon.value === 30
            ? 3000
            : 5000;
        useAiStore.getState().addCredits(credits);
        return {
          success: true,
          message: `Đổi mã thành công! Bạn đang sở hữu gói Trọn Đời nên mã quà tặng PRO đã được quy đổi thành +${credits.toLocaleString('vi-VN')}⚡ AI Credits vào ví! 🎉`,
          coupon,
          creditsAdded: credits
        };
      }
      if (coupon.type === 'credits') {
        const credits = coupon.creditsReward || coupon.value || 500;
        useAiStore.getState().addCredits(credits);
        return {
          success: true,
          message: `Nạp thành công +${credits.toLocaleString('vi-VN')}⚡ AI Credits vào tài khoản! ⚡`,
          coupon,
          creditsAdded: credits
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
    if (coupon.type === 'free_lifetime' || coupon.type === 'lifetime') {
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

    // Trường hợp 3: Nạp Credits trực tiếp (type === 'credits')
    if (coupon.type === 'credits') {
      const credits = coupon.creditsReward || coupon.value || 500;
      useAiStore.getState().addCredits(credits);
      return {
        success: true,
        message: `Nạp thành công +${credits.toLocaleString('vi-VN')}⚡ AI Credits vào tài khoản! ⚡`,
        coupon,
        creditsAdded: credits
      };
    }

    // Trường hợp 4: Quà tặng ngày PRO -> Cơ chế cộng dồn (Stacking) vào ngày hết hạn hiện tại
    if (coupon.type === 'free_days') {
      const days = coupon.freeDays || coupon.value || 7;
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

    // Trường hợp 5: Mã giảm giá % (discount_percent)
    const discount = coupon.discountPercent || coupon.value;
    return {
      success: true,
      message: `Áp dụng thành công mã giảm ${discount}%! 💰`,
      discountPercent: discount,
      coupon
    };
  },

  /**
   * Kích hoạt mã coupon bất đồng bộ:
   * 1. Gọi trực tiếp Stored Procedure Supabase RPC: redeem_dynamic_coupon(p_code, p_user_id)
   * 2. Áp dụng quyền lợi ngay lập tức (Lifetime, Discount %, Free Days, Credits)
   * 3. Fallback an toàn sang local/serverless nếu offline
   */
  async redeemCouponAsync(code: string, user: UserProfile | null): Promise<RedeemCouponResult> {
    const clean = code.trim().toUpperCase();
    if (!clean) {
      return { success: false, message: 'Vui lòng nhập mã coupon.' };
    }

    let currentUser = user || authService.getCurrentSession();
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

    // 1. GỌI TRỰC TIẾP STORED PROCEDURE TRÊN SUPABASE CLOUD
    try {
      const { data, error } = await supabase.rpc('redeem_dynamic_coupon', {
        p_code: clean,
        p_user_id: currentUser.id
      });

      if (!error && data && typeof data === 'object') {
        if (data.success === false) {
          return { success: false, message: data.message || 'Mã không hợp lệ.' };
        }

        const couponObj: Coupon = {
          code: clean,
          type: data.type === 'lifetime' ? 'free_lifetime' : data.type,
          value: Number(data.discount_percent || data.free_days || data.credits_reward || 0),
          discountPercent: Number(data.discount_percent || 0),
          freeDays: Number(data.free_days || 0),
          creditsReward: Number(data.credits_reward || 0),
          maxUses: data.max_uses ?? null,
          usedCount: Number(data.used_count || 1),
          expiresAt: null,
          createdAt: Date.now()
        };

        // Quyền lợi Lifetime
        if (data.type === 'lifetime' || data.type === 'free_lifetime') {
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
            coupon: couponObj,
            remainingUses: data.remaining_uses
          };
        }

        // Quyền lợi Giảm %
        if (data.type === 'discount_percent') {
          return {
            success: true,
            discountPercent: data.discount_percent,
            message: `Áp dụng thành công mã giảm ${data.discount_percent}%! 💰`,
            coupon: couponObj,
            remainingUses: data.remaining_uses
          };
        }

        // Quyền lợi Ngày PRO (Free Days)
        if (data.type === 'free_days') {
          const isLifetime = Boolean(
            currentUser.isLifetime ||
            currentUser.plan === 'pro_lifetime' ||
            isOwnerEmail(currentUser.email)
          );
          if (isLifetime) {
            useAiStore.getState().addCredits(750);
            return {
              success: true,
              creditsAdded: 750,
              message: 'Đổi mã thành công! Bạn đang sở hữu gói Trọn Đời nên mã quà tặng PRO đã được quy đổi thành +750⚡ AI Credits vào ví! 🎉',
              coupon: couponObj,
              remainingUses: data.remaining_uses
            };
          }
          authService.extendProDays(data.free_days);
          const updatedUser = authService.getCurrentSession();
          if (updatedUser) {
            useAuthStore.setState({ user: updatedUser, isPro: true, planLabel: 'PRO BETA' });
          }
          return {
            success: true,
            message: `Chúc mừng! Đã cộng dồn thành công +${data.free_days} ngày PRO vào tài khoản! 🚀`,
            coupon: couponObj,
            remainingUses: data.remaining_uses
          };
        }

        // Quyền lợi Nạp Credits
        if (data.type === 'credits') {
          useAiStore.getState().addCredits(data.credits_reward);
          return {
            success: true,
            creditsAdded: data.credits_reward,
            message: `Nạp thành công +${data.credits_reward.toLocaleString('vi-VN')}⚡ AI Credits vào tài khoản! ⚡`,
            coupon: couponObj,
            remainingUses: data.remaining_uses
          };
        }
      }
    } catch {}

    // 2. FALLBACK NẾU RPC CHƯA MIGRATION HOẶC OFFLINE
    await this.fetchCouponFromSupabase(clean);
    return this.redeemCoupon(clean, currentUser);
  },

  /**
   * Truy vấn toàn bộ danh sách mã coupon đang hoạt động trên Supabase Cloud
   */
  async fetchCloudCoupons(): Promise<Coupon[]> {
    try {
      const res = await safeFetchApi('/api/coupons');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.coupons)) {
          return json.coupons;
        }
      }
    } catch {}

    // Fallback qua local store
    return this.getCoupons();
  },

  /**
   * Tạo mã coupon động trực tiếp lên Cloud (Zero-Deploy)
   */
  async createDynamicCouponCloud(params: {
    code: string;
    type: CouponType;
    value: number;
    maxUses?: number | null;
    description?: string;
    expiresAt?: number | null;
    createdBy?: string;
  }): Promise<{ success: boolean; message: string; coupon?: Coupon }> {
    const cleanCode = params.code.trim().toUpperCase();
    if (!cleanCode) {
      return { success: false, message: 'Mã coupon không được để trống.' };
    }

    try {
      const res = await safeFetchApi('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          code: cleanCode,
          type: params.type,
          value: params.value,
          maxUses: params.maxUses,
          description: params.description,
          expiresAt: params.expiresAt,
          createdBy: params.createdBy
        })
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.coupon) {
          // Lưu vào local cache
          const list = this.getCoupons();
          list.unshift(json.coupon);
          this.saveCoupons(list);
          return {
            success: true,
            message: `Đã phát hành mã ${cleanCode} lên Supabase Cloud thành công! Có hiệu lực ngay lập tức. 🎉`,
            coupon: json.coupon
          };
        } else {
          return { success: false, message: json.error || 'Lỗi tạo mã coupon' };
        }
      }
    } catch (e: any) {
      console.warn('[CouponService] Lỗi gọi API:', e);
    }

    // Fallback tạo local
    const localRes = this.createCoupon(params);
    return {
      success: localRes.success,
      message: localRes.success
        ? `Đã phát hành mã ${cleanCode} vào hệ thống! 🎉`
        : localRes.error || 'Lỗi tạo mã',
      coupon: localRes.coupon
    };
  },

  /**
   * Bật/Khóa mã coupon trên Supabase Cloud
   */
  async toggleCouponActive(code: string, isActive: boolean): Promise<boolean> {
    const clean = code.trim().toUpperCase();
    try {
      await safeFetchApi('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_active', code: clean, isActive })
      });
    } catch {}

    const list = this.getCoupons();
    const item = list.find((c) => c.code.trim().toUpperCase() === clean);
    if (item) {
      item.isActive = isActive;
      this.saveCoupons(list);
    }
    return true;
  },

  /**
   * Cập nhật số lượt dùng tối đa trên Supabase Cloud
   */
  async updateCouponMaxUses(code: string, maxUses: number | null): Promise<boolean> {
    const clean = code.trim().toUpperCase();
    try {
      await safeFetchApi('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_max_uses', code: clean, maxUses })
      });
    } catch {}

    const list = this.getCoupons();
    const item = list.find((c) => c.code.trim().toUpperCase() === clean);
    if (item) {
      item.maxUses = maxUses;
      this.saveCoupons(list);
    }
    return true;
  },

  /**
   * Xóa mã coupon trên Cloud
   */
  async deleteCouponCloud(code: string): Promise<boolean> {
    const clean = code.trim().toUpperCase();
    try {
      await safeFetchApi('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', code: clean })
      });
    } catch {}

    return this.deleteCoupon(clean);
  }
};
