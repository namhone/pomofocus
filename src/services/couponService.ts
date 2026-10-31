/**
 * Coupon Management Service
 * Quản lý kho mã giảm giá & quà tặng đặc quyền PRO ('pomodoro_coupons_store')
 */

import { authService, UserProfile } from './authService';

export interface Coupon {
  code: string;
  type: 'discount_percent' | 'free_days' | 'free_lifetime';
  value: number; // % giảm giá hoặc số ngày tặng PRO (0 nếu là lifetime)
  maxUses: number;
  usedCount: number;
  expiresAt: number | null; // timestamp ms hoặc null
  createdAt: number;
  description?: string;
}

const STORAGE_KEY = 'pomodoro_coupons_store';

const DEFAULT_COUPONS: Coupon[] = [
  {
    code: 'PRO50',
    type: 'discount_percent',
    value: 50,
    maxUses: 100,
    usedCount: 0,
    expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000,
    createdAt: Date.now(),
    description: 'Giảm giá 50% tất cả các gói'
  },
  {
    code: 'VIP7DAYS',
    type: 'free_days',
    value: 7,
    maxUses: 50,
    usedCount: 0,
    expiresAt: Date.now() + 90 * 24 * 60 * 60 * 1000,
    createdAt: Date.now(),
    description: 'Trải nghiệm 7 ngày PRO Miễn Phí'
  },
  {
    code: 'BOSSSECRET',
    type: 'free_lifetime',
    value: 0,
    maxUses: 5,
    usedCount: 0,
    expiresAt: null,
    createdAt: Date.now(),
    description: 'Mã bí mật Chủ sở hữu: Kích hoạt PRO Trọn đời'
  }
];

export const couponService = {
  getCoupons(): Coupon[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_COUPONS));
        return DEFAULT_COUPONS;
      }
      return JSON.parse(raw);
    } catch {
      return DEFAULT_COUPONS;
    }
  },

  saveCoupons(coupons: Coupon[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(coupons));
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
  }): { success: boolean; coupon?: Coupon; error?: string } {
    const cleanCode = input.code.trim().toUpperCase();
    if (!cleanCode) {
      return { success: false, error: 'Mã coupon không được để trống.' };
    }

    const coupons = this.getCoupons();
    if (coupons.some((c) => c.code === cleanCode)) {
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
      description: input.description?.trim() || undefined
    };

    coupons.unshift(newCoupon);
    this.saveCoupons(coupons);
    return { success: true, coupon: newCoupon };
  },

  deleteCoupon(code: string): boolean {
    const coupons = this.getCoupons();
    const filtered = coupons.filter((c) => c.code !== code.toUpperCase());
    if (filtered.length === coupons.length) return false;
    this.saveCoupons(filtered);
    return true;
  },

  validateCoupon(code: string): { valid: boolean; coupon?: Coupon; error?: string } {
    const clean = code.trim().toUpperCase();
    if (!clean) {
      return { valid: false, error: 'Vui lòng nhập mã coupon.' };
    }

    const coupons = this.getCoupons();
    const found = coupons.find((c) => c.code === clean);
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

  redeemCoupon(code: string, user: UserProfile | null): {
    success: boolean;
    message: string;
    discountPercent?: number;
    coupon?: Coupon;
  } {
    if (!user) {
      return { success: false, message: 'Vui lòng đăng nhập để áp dụng mã giảm giá.' };
    }

    const validation = this.validateCoupon(code);
    if (!validation.valid || !validation.coupon) {
      return { success: false, message: validation.error || 'Mã không hợp lệ.' };
    }

    const coupon = validation.coupon;

    // Tăng số lần sử dụng
    const coupons = this.getCoupons();
    const idx = coupons.findIndex((c) => c.code === coupon.code);
    if (idx !== -1) {
      coupons[idx].usedCount += 1;
      this.saveCoupons(coupons);
    }

    if (coupon.type === 'free_lifetime') {
      authService.upgradeToPro(999);
      return {
        success: true,
        message: 'Chúc mừng! Bạn đã được kích hoạt gói PRO TRỌN ĐỜI vĩnh viễn! 🎉',
        coupon
      };
    }

    if (coupon.type === 'free_days') {
      const months = Math.max(1, Math.round(coupon.value / 30));
      authService.upgradeToPro(months);
      return {
        success: true,
        message: `Chúc mừng! Bạn đã nhận ${coupon.value} ngày dùng thử PRO miễn phí! 🚀`,
        coupon
      };
    }

    // discount_percent
    return {
      success: true,
      message: `Áp dụng thành công mã giảm ${coupon.value}%! 💰`,
      discountPercent: coupon.value,
      coupon
    };
  }
};
