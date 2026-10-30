import { describe, it, expect, beforeEach, vi } from 'vitest';
import { googleAuthService, GoogleUserPayload } from '../../src/services/googleAuthService';
import { authService } from '../../src/services/authService';
import { momoService } from '../../src/services/momoService';

// Helper tạo JWT mock hợp lệ
function createMockJwt(payload: Record<string, unknown>): string {
  const encodeBase64Url = (str: string) => {
    return Buffer.from(str, 'utf-8')
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  };

  const header = encodeBase64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const body = encodeBase64Url(JSON.stringify(payload));
  const sig = 'mock_signature_bytes';
  return `${header}.${body}.${sig}`;
}

describe('Google Authentication & Identity Binding Unit Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  describe('1. Google JWT ID Token Decoding & Validation', () => {
    it('Giải mã chính xác JWT ID token hợp lệ của Google', () => {
      const mockPayload: GoogleUserPayload = {
        sub: 'google_user_987654321',
        email: 'nam.tester@gmail.com',
        email_verified: true,
        name: 'Hồ Ngọc Bảo Nam',
        picture: 'https://lh3.googleusercontent.com/a/mock-photo'
      };

      const token = createMockJwt(mockPayload);
      const parsed = googleAuthService.parseJwtPayload(token);

      expect(parsed.sub).toBe('google_user_987654321');
      expect(parsed.email).toBe('nam.tester@gmail.com');
      expect(parsed.name).toBe('Hồ Ngọc Bảo Nam');
      expect(parsed.picture).toBe('https://lh3.googleusercontent.com/a/mock-photo');
      expect(parsed.email_verified).toBe(true);
    });

    it('Từ chối token không đúng 3 phần của định dạng JWT', () => {
      expect(() => googleAuthService.parseJwtPayload('invalid.token')).toThrow(
        /Token không đúng định dạng JWT của Google/
      );
      expect(() => googleAuthService.parseJwtPayload('')).toThrow(/ID Token không hợp lệ/);
    });

    it('Từ chối JWT thiếu trường bắt buộc (sub hoặc email)', () => {
      const badJwt = createMockJwt({ name: 'User without sub or email' });
      expect(() => googleAuthService.parseJwtPayload(badJwt)).toThrow(
        /JWT thiếu các trường bắt buộc/
      );
    });
  });

  describe('2. Đăng nhập lần đầu & Khởi tạo Profile Google', () => {
    it('Tạo tài khoản người dùng mới với authProvider: google và plan: free', async () => {
      const payload: GoogleUserPayload = {
        sub: 'google_sub_111',
        email: 'newstudent@gmail.com',
        email_verified: true,
        name: 'Học viên Google',
        picture: 'https://example.com/avatar.jpg'
      };

      const profile = await authService.loginWithGoogle(payload);

      expect(profile).toBeDefined();
      expect(profile.authProvider).toBe('google');
      expect(profile.googleId).toBe('google_sub_111');
      expect(profile.email).toBe('newstudent@gmail.com');
      expect(profile.displayName).toBe('Học viên Google');
      expect(profile.avatarUrl).toBe('https://example.com/avatar.jpg');
      expect(profile.plan).toBe('pro_beta');
      expect(profile.proExpiresAt).toBeGreaterThan(Date.now());

      // Kiểm tra session hiện tại được lưu
      const current = authService.getCurrentSession();
      expect(current?.id).toBe(profile.id);
      expect(current?.email).toBe('newstudent@gmail.com');
    });
  });

  describe('3. Đăng nhập lại, Khôi phục Session & Bảo toàn Quyền lợi', () => {
    it('Đăng nhập lại cùng tài khoản Google giữ nguyên ID và quyền hạn PRO đã có', async () => {
      const payload: GoogleUserPayload = {
        sub: 'google_sub_222',
        email: 'pro_student@gmail.com',
        email_verified: true,
        name: 'Pro Google Student'
      };

      // Đăng nhập lần 1 (Mặc định nhận PRO Beta 3 năm)
      const initial = await authService.loginWithGoogle(payload);
      expect(initial.plan).toBe('pro_beta');

      // Nâng cấp quyền PRO (hoặc sandbox)
      const upgraded = authService.upgradePlan(initial.id, 'pro', 12);
      expect(upgraded.plan).toBe('pro');

      // Người dùng đăng xuất
      authService.logout();
      expect(authService.getCurrentSession()).toBeNull();

      // Đăng nhập lại với Google
      const restored = await authService.loginWithGoogle(payload);

      // Phải khôi phục đúng ID và quyền PRO, không bị reset về free
      expect(restored.id).toBe(initial.id);
      expect(restored.plan).toBe('pro');
      expect(restored.proExpiresAt).toBe(upgraded.proExpiresAt);
    });
  });

  describe('4. Nguyên tắc Không Tự Động Hợp Nhất (Non-merging Collision Defense)', () => {
    it('Từ chối tự động hợp nhất tài khoản nếu email đã đăng ký bằng mật khẩu trước đó', async () => {
      // 1. Đăng ký tài khoản bằng Mật khẩu
      const passUser = await authService.signup('target@study.io', 'secretPass123', 'Người Dùng Gốc');
      expect(passUser.email).toBe('target@study.io');
      authService.logout();

      // 2. Kẻ tấn công hoặc người dùng thử đăng nhập Google bằng email đó mà chưa xác minh liên kết
      const googlePayload: GoogleUserPayload = {
        sub: 'attacker_sub_999',
        email: 'target@study.io',
        name: 'Giả Mạo Google'
      };

      await expect(authService.loginWithGoogle(googlePayload)).rejects.toThrow(
        /Email này đã được đăng ký bằng Mật khẩu/
      );
    });
  });

  describe('5. Ràng buộc Danh tính Đơn hàng MoMo với Tài khoản Google', () => {
    it('Đơn hàng MoMo tự động gắn chặt userId và authProvider của tài khoản Google đã đăng nhập', async () => {
      const payload: GoogleUserPayload = {
        sub: 'google_verified_456',
        email: 'buyer.nam@gmail.com',
        name: 'Nam Mua Gói'
      };
      const user = await authService.loginWithGoogle(payload);

      // Tạo đơn hàng thanh toán MoMo
      const order = momoService.createOrder('different_spoofed@gmail.com', 'yearly');

      // Order phải gắn chặt với danh tính Google đã đăng nhập, không dùng email giả mạo từ client
      expect(order.userId).toBe(user.id);
      expect(order.email).toBe('buyer.nam@gmail.com');
      expect(order.authProvider).toBe('google');
      expect(order.amount).toBe(468000);
    });
  });
});
