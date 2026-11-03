import { describe, it, expect, beforeEach } from 'vitest';
import { couponService, DEFAULT_COUPONS } from '../../src/services/couponService';
import { authService, UserProfile } from '../../src/services/authService';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useAiStore } from '../../src/stores/useAiStore';

describe('Coupon System Resilience & Universal Redemption Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isPro: false,
      isLifetime: false,
      planLabel: 'FREE'
    });
    useAiStore.setState({
      aiCreditsBalance: 50,
      aiPlan: 'free'
    });
  });

  it('1. Kho mã mặc định DEFAULT_COUPONS chứa đầy đủ các mã chính thức của hệ thống', () => {
    const coupons = couponService.getCoupons();
    const codes = coupons.map((c) => c.code);

    expect(codes).toContain('PRO50');
    expect(codes).toContain('VIP7DAYS');
    expect(codes).toContain('VIP30DAYS');
    expect(codes).toContain('BOSSSECRET');
    expect(codes).toContain('STUDENT100');
    expect(codes).toContain('STUDYFOCUS');
    expect(codes).toContain('POMO2026');
    expect(codes).toContain('LADYBOSS');
    expect(codes).toContain('NAMHO');
    expect(codes).toContain('HUYENTRAN');
  });

  it('2. Khách vãng lai (user === null) đổi mã coupon được tự động tạo hồ sơ học viên và không bị chặn', () => {
    // Khách chưa đăng nhập vào đổi mã VIP7DAYS
    const res = couponService.redeemCoupon('VIP7DAYS', null);

    expect(res.success).toBe(true);
    expect(res.message).toContain('cộng dồn thành công +7 ngày PRO');

    // Kiểm tra phiên đăng nhập đã được tự động lưu
    const session = authService.getCurrentSession();
    expect(session).not.toBeNull();
    expect(session?.plan).toBe('pro');
    expect(session?.proExpiresAt).toBeGreaterThan(Date.now());

    // Kiểm tra useAuthStore cập nhật isPro
    const authState = useAuthStore.getState();
    expect(authState.isPro).toBe(true);
  });

  it('3. Không phân biệt chữ hoa, chữ thường và khoảng trắng khi kích hoạt coupon', () => {
    const user: UserProfile = {
      id: 'usr_test_case',
      email: 'student@example.com',
      displayName: 'Student Test',
      plan: 'free',
      createdAt: Date.now()
    };
    authService.saveSession(user);

    // Thử nhập mã pro50 viết thường có dấu cách
    const res = couponService.redeemCoupon('   pro50   ', user);
    expect(res.success).toBe(true);
    expect(res.discountPercent).toBe(50);
  });

  it('4. Người dùng Trọn Đời (Lifetime) nhập mã quà tặng PRO được tự động quy đổi thành +5.000⚡ AI Credits', () => {
    const founderUser: UserProfile = {
      id: 'usr_founder_vip',
      email: 'namho03052k9@gmail.com',
      displayName: 'Nam Hồ',
      plan: 'pro_lifetime',
      isLifetime: true,
      createdAt: Date.now()
    };
    authService.saveSession(founderUser);

    const initialCredits = useAiStore.getState().aiCreditsBalance;
    const res = couponService.redeemCoupon('VIP7DAYS', founderUser);

    expect(res.success).toBe(true);
    expect(res.creditsAdded).toBe(5000);
    expect(res.message).toContain('quy đổi thành +5.000⚡ AI Credits');

    // Kiểm tra ví AI Credits được cộng đúng 5.000
    const finalCredits = useAiStore.getState().aiCreditsBalance;
    expect(finalCredits).toBe(initialCredits + 5000);
  });

  it('5. Người dùng thường đổi mã BOSSSECRET được nâng cấp ngay lên PRO TRỌN ĐỜI vĩnh viễn', () => {
    const normalUser: UserProfile = {
      id: 'usr_normal_lucky',
      email: 'lucky@example.com',
      displayName: 'Lucky Student',
      plan: 'free',
      createdAt: Date.now()
    };
    authService.saveSession(normalUser);

    const res = couponService.redeemCoupon('BOSSSECRET', normalUser);
    expect(res.success).toBe(true);
    expect(res.message).toContain('PRO TRỌN ĐỜI');

    const authState = useAuthStore.getState();
    expect(authState.isPro).toBe(true);
    expect(authState.isLifetime).toBe(true);
    expect(authState.planLabel).toBe('PRO TRỌN ĐỜI 👑');
  });

  it('6. Cơ chế cộng dồn (Stacking) ngày PRO khi đổi nhiều mã quà tặng liên tiếp', () => {
    const user: UserProfile = {
      id: 'usr_stacker',
      email: 'stacker@example.com',
      displayName: 'Stacker',
      plan: 'free',
      createdAt: Date.now()
    };
    authService.saveSession(user);

    // Kích hoạt VIP7DAYS lần 1 -> +7 ngày
    const res1 = couponService.redeemCoupon('VIP7DAYS', user);
    expect(res1.success).toBe(true);
    const session1 = authService.getCurrentSession()!;
    const exp1 = session1.proExpiresAt!;

    // Kích hoạt STUDENT100 lần 2 -> +14 ngày
    const res2 = couponService.redeemCoupon('STUDENT100', session1);
    expect(res2.success).toBe(true);
    const session2 = authService.getCurrentSession()!;
    const exp2 = session2.proExpiresAt!;

    // Hạn mới phải lớn hơn hạn cũ ít nhất 13.9 ngày
    const diffDays = Math.round((exp2 - exp1) / (24 * 60 * 60 * 1000));
    expect(diffDays).toBe(14);
  });

  it('7. fetchCouponFromSupabase xử lý mượt mà và tìm thấy mã ngay cả khi offline hoặc lỗi DB', async () => {
    const coupon = await couponService.fetchCouponFromSupabase('PRO50');
    expect(coupon).not.toBeNull();
    expect(coupon?.code).toBe('PRO50');
    expect(coupon?.value).toBe(50);
  });
});
