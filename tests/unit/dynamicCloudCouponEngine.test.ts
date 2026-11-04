import { describe, it, expect, vi, beforeEach } from 'vitest';
import { couponService, Coupon } from '../../src/services/couponService';
import { authService, UserProfile } from '../../src/services/authService';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useAiStore } from '../../src/stores/useAiStore';
import { supabase } from '../../src/lib/supabase';

describe('Dynamic Cloud Coupon Engine Specification (Supabase Cloud + Zero-Deploy)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  describe('1. Zero-Deploy Creation & Cloud Issuance', () => {
    it('Chủ sở hữu tạo mã EIU trực tiếp: có hiệu lực ngay lập tức với maxUses = 10', async () => {
      const ownerUser: UserProfile = {
        id: 'usr_owner_namho',
        email: 'namho03052k9@gmail.com',
        displayName: 'Nam Hồ',
        plan: 'pro_lifetime',
        isLifetime: true,
        createdAt: Date.now()
      };
      authService.saveSession(ownerUser);

      // Giả lập phát hành mã động EIU
      const res = await couponService.createDynamicCouponCloud({
        code: 'EIU_CLOUD_2026',
        type: 'lifetime',
        value: 0,
        maxUses: 10,
        description: 'Tặng sinh viên EIU đặc quyền PRO Trọn đời'
      });

      expect(res.success).toBe(true);
      expect(res.coupon).toBeDefined();
      expect(res.coupon?.code).toBe('EIU_CLOUD_2026');
      expect(res.coupon?.type).toBe('free_lifetime');
      expect(res.coupon?.maxUses).toBe(10);
      expect(res.coupon?.usedCount).toBe(0);

      // Tra cứu lại từ hệ thống thấy ngay lập tức
      const found = await couponService.fetchCouponFromSupabase('EIU_CLOUD_2026');
      expect(found).toBeDefined();
      expect(found?.code).toBe('EIU_CLOUD_2026');
    });
  });

  describe('2. Atomic Usage Counter & Instant Entitlement Activation', () => {
    it('Học viên ẩn danh nhập mã EIU_CLOUD_2026: Kích hoạt PRO TRỌN ĐỜI và trừ 1 lượt dùng nguyên tử', async () => {
      // 1. Tạo mã EIU_CLOUD_2026 với 10 lượt
      couponService.createCoupon({
        code: 'EIU_INSTANT_TEST',
        type: 'lifetime',
        value: 0,
        maxUses: 10,
        description: 'Test Instant Activation'
      });

      // 2. Học viên mới đổi mã
      const student1: UserProfile = {
        id: 'usr_student_alpha',
        email: 'student_alpha@eiu.edu.vn',
        displayName: 'Student Alpha',
        plan: 'free',
        createdAt: Date.now()
      };
      authService.saveSession(student1);

      // Mock RPC Stored Procedure của Supabase
      vi.spyOn(supabase, 'rpc').mockResolvedValueOnce({
        data: {
          success: true,
          code: 'EIU_INSTANT_TEST',
          type: 'lifetime',
          discount_percent: 0,
          free_days: 0,
          credits_reward: 0,
          used_count: 1,
          max_uses: 10,
          remaining_uses: 9
        },
        error: null
      } as any);

      const redeemRes = await couponService.redeemCouponAsync('EIU_INSTANT_TEST', student1);
      expect(redeemRes.success).toBe(true);
      expect(redeemRes.message).toContain('PRO TRỌN ĐỜI vĩnh viễn');
      expect(redeemRes.remainingUses).toBe(9);

      // Kiểm tra Store đã cập nhật trạng thái PRO Trọn Đời
      expect(useAuthStore.getState().isPro).toBe(true);
      expect(useAuthStore.getState().isLifetime).toBe(true);
    });
  });

  describe('3. Anti-Spam (Single Redemption Per User Policy)', () => {
    it('Chặn người dùng đổi 1 mã 2 lần (Stored Procedure Unique Enforcement)', async () => {
      const studentUser: UserProfile = {
        id: 'usr_student_duplicate',
        email: 'duplicate@eiu.edu.vn',
        displayName: 'Student Duplicate',
        plan: 'free',
        createdAt: Date.now()
      };
      authService.saveSession(studentUser);

      // Lần 1: Thành công
      vi.spyOn(supabase, 'rpc').mockResolvedValueOnce({
        data: {
          success: true,
          code: 'EIU_SINGLE_USE',
          type: 'lifetime',
          remaining_uses: 9
        },
        error: null
      } as any);

      const res1 = await couponService.redeemCouponAsync('EIU_SINGLE_USE', studentUser);
      expect(res1.success).toBe(true);

      // Lần 2: Bị chặn báo đã sử dụng
      vi.spyOn(supabase, 'rpc').mockResolvedValueOnce({
        data: {
          success: false,
          message: 'Bạn đã sử dụng mã ưu đãi này rồi.'
        },
        error: null
      } as any);

      const res2 = await couponService.redeemCouponAsync('EIU_SINGLE_USE', studentUser);
      expect(res2.success).toBe(false);
      expect(res2.message).toContain('Bạn đã sử dụng mã ưu đãi này rồi');
    });
  });

  describe('4. Max Uses Exhaustion & Auto-Lock', () => {
    it('Chặn người dùng khi mã coupon đã hết số lượt tối đa (max_uses reached)', async () => {
      const student11: UserProfile = {
        id: 'usr_student_11',
        email: 'late_student@eiu.edu.vn',
        displayName: 'Late Student',
        plan: 'free',
        createdAt: Date.now()
      };
      authService.saveSession(student11);

      // Giả lập mã đã đủ lượt
      vi.spyOn(supabase, 'rpc').mockResolvedValueOnce({
        data: {
          success: false,
          message: 'Mã coupon đã đạt giới hạn lượt sử dụng!'
        },
        error: null
      } as any);

      const res = await couponService.redeemCouponAsync('EIU_LIMITED_10', student11);
      expect(res.success).toBe(false);
      expect(res.message).toContain('đạt giới hạn lượt sử dụng');
    });
  });

  describe('5. Diverse Dynamic Types: AI Credits & Discount & Free Days', () => {
    it('Type credits: Nạp thẳng số credits vào ví AI của người dùng', async () => {
      const student: UserProfile = {
        id: 'usr_student_credits',
        email: 'student_ai@eiu.edu.vn',
        displayName: 'AI Student',
        plan: 'free',
        createdAt: Date.now()
      };
      authService.saveSession(student);

      useAiStore.setState({ aiCreditsBalance: 100 });

      vi.spyOn(supabase, 'rpc').mockResolvedValueOnce({
        data: {
          success: true,
          code: 'AI_REWARD_1000',
          type: 'credits',
          credits_reward: 1000,
          remaining_uses: 49
        },
        error: null
      } as any);

      const res = await couponService.redeemCouponAsync('AI_REWARD_1000', student);
      expect(res.success).toBe(true);
      expect(res.creditsAdded).toBe(1000);
      expect(useAiStore.getState().aiCreditsBalance).toBe(1100);
    });

    it('Type discount_percent: Trả về % giảm giá hợp lệ', async () => {
      const student: UserProfile = {
        id: 'usr_student_disc',
        email: 'disc@example.com',
        displayName: 'Disc Student',
        plan: 'free',
        createdAt: Date.now()
      };
      authService.saveSession(student);

      vi.spyOn(supabase, 'rpc').mockResolvedValueOnce({
        data: {
          success: true,
          code: 'DISCOUNT_40',
          type: 'discount_percent',
          discount_percent: 40,
          remaining_uses: 20
        },
        error: null
      } as any);

      const res = await couponService.redeemCouponAsync('DISCOUNT_40', student);
      expect(res.success).toBe(true);
      expect(res.discountPercent).toBe(40);
    });
  });

  describe('6. Owner Actions: Toggle Active & Delete Cloud Coupon', () => {
    it('Khóa mã coupon khiến người dùng không thể đổi được nữa', async () => {
      couponService.createCoupon({
        code: 'TEMPORARY_CODE',
        type: 'free_days',
        value: 10,
        maxUses: 100
      });

      // Khóa mã
      await couponService.toggleCouponActive('TEMPORARY_CODE', false);

      const val = couponService.validateCoupon('TEMPORARY_CODE');
      expect(val.valid).toBe(false);
      expect(val.error).toContain('tạm thời bị khóa');
    });

    it('Xóa mã coupon khỏi hệ thống', async () => {
      couponService.createCoupon({
        code: 'DELETABLE_CODE',
        type: 'discount_percent',
        value: 10
      });

      await couponService.deleteCouponCloud('DELETABLE_CODE');
      const val = couponService.validateCoupon('DELETABLE_CODE');
      expect(val.valid).toBe(false);
      expect(val.error).toContain('không tồn tại');
    });
  });
});
