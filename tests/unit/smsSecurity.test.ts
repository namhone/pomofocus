import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  smsSecurityService,
  normalizePhoneNumber,
  maskPhoneNumber
} from '../../src/services/smsSecurityService';
import { authService, UserProfile } from '../../src/services/authService';

describe('SMS Security & Two-Factor Authentication (2FA) Specifications', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('1. Chuẩn hóa và làm mờ số điện thoại (Normalization & Privacy Masking)', () => {
    it('Chuẩn hóa thành công các định dạng số điện thoại di động Việt Nam phổ biến', () => {
      // Đầu số 09, 03, 07, 08, 05
      expect(normalizePhoneNumber('0987654321').normalized).toBe('0987654321');
      expect(normalizePhoneNumber('+84987654321').normalized).toBe('0987654321');
      expect(normalizePhoneNumber('84987654321').normalized).toBe('0987654321');
      expect(normalizePhoneNumber('098.765.4321').normalized).toBe('0987654321');
      expect(normalizePhoneNumber('098-765-4321').normalized).toBe('0987654321');
      expect(normalizePhoneNumber('039 123 4567').normalized).toBe('0391234567');
      expect(normalizePhoneNumber('077 888 9999').normalized).toBe('0778889999');
    });

    it('Từ chối các số điện thoại sai cú pháp, quá ngắn hoặc chứa ký tự chữ', () => {
      expect(normalizePhoneNumber('12345').valid).toBe(false);
      expect(normalizePhoneNumber('0123456789').valid).toBe(false); // Đầu 01 cũ 11 số
      expect(normalizePhoneNumber('abcdefghij').valid).toBe(false);
      expect(normalizePhoneNumber('').valid).toBe(false);
    });

    it('Làm mờ số điện thoại bảo mật thông tin cá nhân (VD: 098****321)', () => {
      expect(maskPhoneNumber('0987654321')).toBe('098****321');
      expect(maskPhoneNumber('0391234567')).toBe('039****567');
      expect(maskPhoneNumber('')).toBe('');
    });
  });

  describe('2. Khởi tạo phiên OTP & Cơ chế chống spam (Rate Limiting Cooldown)', () => {
    it('Tạo mã OTP 6 chữ số thành công và thiết lập thời gian hết hạn 5 phút', async () => {
      const res = await smsSecurityService.sendSmsOtp('0987654321');
      expect(res.success).toBe(true);
      expect(res.demoCode).toMatch(/^\d{6}$/);

      const session = smsSecurityService.getActiveOtpSession();
      expect(session).toBeDefined();
      expect(session?.phoneNumber).toBe('0987654321');
      expect(session?.code).toBe(res.demoCode);
      expect(session?.expiresAt).toBeGreaterThan(Date.now());
    });

    it('Chặn yêu cầu gửi OTP liên tục khi đang trong thời gian đếm ngược 60s (Cooldown)', async () => {
      const first = await smsSecurityService.sendSmsOtp('0987654321');
      expect(first.success).toBe(true);

      // Gửi lại ngay lập tức
      const second = await smsSecurityService.sendSmsOtp('0987654321');
      expect(second.success).toBe(false);
      expect(second.message).toContain('Vui lòng đợi');
      expect(second.cooldownSeconds).toBeGreaterThan(0);
    });
  });

  describe('3. Xác thực mã OTP & Liên kết số điện thoại với tài khoản', () => {
    it('Từ chối khi mã OTP sai hoặc không đủ 6 chữ số', async () => {
      const user = await authService.signup('otp.tester@pomo.app', 'pass123456', 'OTP User');
      await smsSecurityService.sendSmsOtp('0987654321');

      // Nhập mã sai
      const res1 = await smsSecurityService.verifyAndLinkPhone(user.id, '0987654321', '000000');
      expect(res1.success).toBe(false);
      expect(res1.message).toContain('Mã OTP không chính xác');

      // Nhập mã không đủ độ dài
      const res2 = await smsSecurityService.verifyAndLinkPhone(user.id, '0987654321', '123');
      expect(res2.success).toBe(false);
      expect(res2.message).toContain('phải gồm 6 chữ số');
    });

    it('Khóa phiên xác thực nếu nhập sai mã OTP quá 5 lần', async () => {
      const user = await authService.signup('brute.force@pomo.app', 'pass123456', 'Brute User');
      await smsSecurityService.sendSmsOtp('0987654321');

      // Thử sai 5 lần
      for (let i = 0; i < 5; i++) {
        await smsSecurityService.verifyAndLinkPhone(user.id, '0987654321', '999999');
      }

      // Lần thứ 6 bị khóa phiên
      const res = await smsSecurityService.verifyAndLinkPhone(user.id, '0987654321', '999999');
      expect(res.success).toBe(false);
      expect(res.message).toContain('quá 5 lần');
    });

    it('Xác thực đúng mã OTP: liên kết số điện thoại và tự động kích hoạt SMS 2FA', async () => {
      const user = await authService.signup('link.success@pomo.app', 'pass123456', 'Success User');
      const sent = await smsSecurityService.sendSmsOtp('0987654321');
      expect(sent.demoCode).toBeDefined();

      const verifyRes = await smsSecurityService.verifyAndLinkPhone(
        user.id,
        '0987654321',
        sent.demoCode!
      );

      expect(verifyRes.success).toBe(true);
      expect(verifyRes.user?.phoneNumber).toBe('0987654321');
      expect(verifyRes.user?.phoneVerified).toBe(true);
      expect(verifyRes.user?.twoFactorEnabled).toBe(true);

      const session = authService.getCurrentSession();
      expect(session?.phoneNumber).toBe('0987654321');
      expect(session?.phoneVerified).toBe(true);
      expect(session?.twoFactorEnabled).toBe(true);
    });
  });

  describe('4. Bật/Tắt 2FA và Hủy liên kết số điện thoại (Unlink Phone)', () => {
    it('Cho phép Bật / Tắt trạng thái 2FA khi đã xác minh số điện thoại', async () => {
      const user = await authService.signup('toggle.user@pomo.app', 'pass123456', 'Toggle User');
      const sent = await smsSecurityService.sendSmsOtp('0987654321');
      await smsSecurityService.verifyAndLinkPhone(user.id, '0987654321', sent.demoCode!);

      // Tắt 2FA
      const offRes = await smsSecurityService.toggleTwoFactor(user.id, false);
      expect(offRes.success).toBe(true);
      expect(offRes.user?.twoFactorEnabled).toBe(false);

      // Bật lại 2FA
      const onRes = await smsSecurityService.toggleTwoFactor(user.id, true);
      expect(onRes.success).toBe(true);
      expect(onRes.user?.twoFactorEnabled).toBe(true);
    });

    it('Từ chối bật 2FA nếu tài khoản chưa từng liên kết số điện thoại', async () => {
      const user = await authService.signup('no.phone@pomo.app', 'pass123456', 'No Phone');
      const res = await smsSecurityService.toggleTwoFactor(user.id, true);
      expect(res.success).toBe(false);
      expect(res.message).toContain('cần liên kết và xác minh số điện thoại');
    });

    it('Hủy liên kết số điện thoại: xóa phoneNumber, đặt phoneVerified = false và tắt 2FA', async () => {
      const user = await authService.signup('unlink.user@pomo.app', 'pass123456', 'Unlink User');
      const sent = await smsSecurityService.sendSmsOtp('0987654321');
      await smsSecurityService.verifyAndLinkPhone(user.id, '0987654321', sent.demoCode!);

      // Hủy liên kết
      const unlinkRes = await smsSecurityService.unlinkPhone(user.id);
      expect(unlinkRes.success).toBe(true);
      expect(unlinkRes.user?.phoneNumber).toBeUndefined();
      expect(unlinkRes.user?.phoneVerified).toBe(false);
      expect(unlinkRes.user?.twoFactorEnabled).toBe(false);

      const session = authService.getCurrentSession();
      expect(session?.phoneNumber).toBeUndefined();
      expect(session?.phoneVerified).toBe(false);
    });
  });
});
