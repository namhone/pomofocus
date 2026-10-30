import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  authService,
  OWNER_EMAIL,
  THREE_YEARS_MS,
  hasProEntitlement,
  getPlanLabel
} from '../../src/services/authService';

describe('PomoFocus Demo Beta — Account & Entitlement Integrity', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('1. Beta Pro Policy (3-Year Free Access)', () => {
    it('Tự động cấp 3 năm PRO miễn phí cho tài khoản đăng ký mới bằng Email/Password', async () => {
      const user = await authService.signup('student.beta@gmail.com', 'password123', 'Học viên Beta');

      expect(user.email).toBe('student.beta@gmail.com');
      expect(user.plan).toBe('pro_beta');
      expect(user.isLifetime).toBe(false);
      expect(user.proExpiresAt).toBeDefined();

      const threeYearsFromNow = Date.now() + THREE_YEARS_MS;
      expect(user.proExpiresAt).toBeGreaterThanOrEqual(threeYearsFromNow - 5000);
      expect(user.proExpiresAt).toBeLessThanOrEqual(threeYearsFromNow + 5000);

      expect(hasProEntitlement(user.plan)).toBe(true);
      expect(getPlanLabel(user)).toContain('PRO BETA');
    });

    it('Tự động cấp 3 năm PRO miễn phí cho tài khoản đăng nhập lần đầu qua Google', async () => {
      const googleUser = await authService.loginWithGoogle({
        sub: 'google_beta_test_123',
        email: 'google.tester@gmail.com',
        name: 'Google Tester',
        email_verified: true
      });

      expect(googleUser.plan).toBe('pro_beta');
      expect(googleUser.isLifetime).toBe(false);
      expect(googleUser.proExpiresAt).toBeGreaterThan(Date.now());
      expect(hasProEntitlement(googleUser.plan)).toBe(true);
    });

    it('Duy trì trạng thái PRO Beta sau khi đăng xuất và đăng nhập lại', async () => {
      const initial = await authService.signup('retention.test@gmail.com', 'pass123456', 'Retention User');
      const initialExpiry = initial.proExpiresAt;

      authService.logout();
      expect(authService.getCurrentSession()).toBeNull();

      const restored = await authService.login('retention.test@gmail.com', 'pass123456');
      expect(restored.plan).toBe('pro_beta');
      expect(restored.proExpiresAt).toBe(initialExpiry);
    });
  });

  describe('2. Owner Account — Lifetime Pro Precedence', () => {
    it('Chủ sở hữu (namho03052k9@gmail.com) tự động nhận quyền PRO Trọn Đời không hết hạn', async () => {
      const owner = await authService.loginWithGoogle({
        sub: 'google_owner_sub_001',
        email: OWNER_EMAIL,
        name: 'Hồ Ngọc Bảo Nam',
        email_verified: true
      });

      expect(owner.email).toBe(OWNER_EMAIL);
      expect(owner.plan).toBe('pro_lifetime');
      expect(owner.isLifetime).toBe(true);
      expect(owner.proExpiresAt).toBeNull();
      expect(getPlanLabel(owner)).toContain('PRO TRỌN ĐỜI');
      expect(hasProEntitlement(owner.plan)).toBe(true);
    });

    it('Tài khoản Chủ sở hữu không thể bị hạ cấp về Free hay đổi sang gói khác', async () => {
      const owner = await authService.loginWithGoogle({
        sub: 'google_owner_sub_001',
        email: OWNER_EMAIL,
        name: 'Hồ Ngọc Bảo Nam',
        email_verified: true
      });

      // Thử gọi upgradePlan về 'free'
      const attemptedDowngrade = authService.upgradePlan(owner.id, 'free');
      expect(attemptedDowngrade.plan).toBe('pro_lifetime');
      expect(attemptedDowngrade.isLifetime).toBe(true);
      expect(attemptedDowngrade.proExpiresAt).toBeNull();

      // Kiểm tra trong session
      const session = authService.getCurrentSession();
      expect(session?.plan).toBe('pro_lifetime');
      expect(session?.isLifetime).toBe(true);
    });
  });

  describe('3. Profile Management & Password Security', () => {
    it('Cập nhật tên hiển thị và avatar thành công', async () => {
      const user = await authService.signup('editor@studyworkspace.io', 'pass123456', 'Old Name');
      expect(user.displayName).toBe('Old Name');

      const updated = await authService.updateProfile(user.id, {
        displayName: 'New Profile Name',
        avatarUrl: 'https://example.com/new-avatar.jpg'
      });

      expect(updated.displayName).toBe('New Profile Name');
      expect(updated.avatarUrl).toBe('https://example.com/new-avatar.jpg');

      const current = authService.getCurrentSession();
      expect(current?.displayName).toBe('New Profile Name');
    });

    it('Đổi mật khẩu thành công khi nhập đúng mật khẩu cũ', async () => {
      const user = await authService.signup('passchange@test.com', 'old_password_123', 'Pass User');

      const changed = await authService.changePassword(user.id, 'old_password_123', 'new_secret_456');
      expect(changed).toBe(true);

      // Đăng nhập lại bằng mật khẩu mới
      authService.logout();
      const relog = await authService.login('passchange@test.com', 'new_secret_456');
      expect(relog.email).toBe('passchange@test.com');
    });

    it('Từ chối đổi mật khẩu nếu mật khẩu cũ không chính xác hoặc mật khẩu mới quá ngắn', async () => {
      const user = await authService.signup('passfail@test.com', 'valid_pass_123', 'User');

      await expect(
        authService.changePassword(user.id, 'wrong_pass', 'new_secret_456')
      ).rejects.toThrow('Mật khẩu cũ không chính xác');

      await expect(
        authService.changePassword(user.id, 'valid_pass_123', '123')
      ).rejects.toThrow('ít nhất 6 ký tự');
    });
  });

  describe('4. Data Export & Local-First Management', () => {
    it('Tạo payload xuất dữ liệu sao lưu JSON hoàn chỉnh', async () => {
      const user = await authService.signup('backup.tester@gmail.com', 'pass123456', 'Backup Tester');
      const exportData = await authService.exportUserData(user.id);

      expect(exportData).toBeDefined();
      expect(exportData.user.email).toBe('backup.tester@gmail.com');
      expect(exportData.exportedAt).toBeDefined();
      expect(exportData.stats).toBeDefined();
      expect(Array.isArray(exportData.data.tasks)).toBe(true);
      expect(Array.isArray(exportData.data.focus_sessions)).toBe(true);
    });
  });
});
