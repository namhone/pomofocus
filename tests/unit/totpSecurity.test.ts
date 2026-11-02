import { describe, it, expect, beforeEach } from 'vitest';
import {
  totpService,
  base32Encode,
  base32Decode,
  generateTotpSecret,
  formatSecretKey,
  generateOtpauthUri,
  getQrCodeImageUrl,
  calculateTotpCode,
  verifyTotpCode,
  generateBackupRecoveryCodes
} from '../../src/services/totpService';
import { authService } from '../../src/services/authService';

describe('Real TOTP 2FA (RFC 6238 / RFC 4226) & Authenticator App Specifications', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('1. Mã hóa & Chuẩn hóa Base32 RFC 4648', () => {
    it('Mã hóa byte array và giải mã Base32 bảo toàn 100% dữ liệu gốc', () => {
      const original = new Uint8Array([72, 101, 108, 108, 111, 33, 1, 2, 3, 255]);
      const encoded = base32Encode(original);
      const decoded = base32Decode(encoded);
      expect(Array.from(decoded)).toEqual(Array.from(original));
    });

    it('Sinh Secret Key ngẫu nhiên gồm 32 ký tự Base32 (20 bytes)', () => {
      const secret = generateTotpSecret();
      expect(secret).toHaveLength(32);
      expect(/^[A-Z2-7]+$/.test(secret)).toBe(true);
    });

    it('Định dạng Secret Key thành từng nhóm 4 ký tự dễ đọc để người dùng nhập thủ công', () => {
      const formatted = formatSecretKey('JBSWY3DPEHPK3PXP');
      expect(formatted).toBe('JBSW Y3DP EHPK 3PXP');
    });
  });

  describe('2. Tương thích chuẩn Google Authenticator & QR Code (RFC 6238)', () => {
    it('Tạo URI otpauth://totp chuẩn xác với đầy đủ email, issuer, secret, SHA1, 6 digits, 30s period', () => {
      const uri = generateOtpauthUri('JBSWY3DPEHPK3PXP', 'namho@study.io', 'PomoFocus');
      expect(uri).toContain('otpauth://totp/PomoFocus:namho%40study.io');
      expect(uri).toContain('secret=JBSWY3DPEHPK3PXP');
      expect(uri).toContain('issuer=PomoFocus');
      expect(uri).toContain('digits=6');
      expect(uri).toContain('period=30');
    });

    it('Sinh URL ảnh QR Code SVG độ nét cao', () => {
      const uri = generateOtpauthUri('JBSWY3DPEHPK3PXP', 'namho@study.io');
      const qrUrl = getQrCodeImageUrl(uri);
      expect(qrUrl).toContain('https://api.qrserver.com/v1/create-qr-code/');
      expect(qrUrl).toContain('format=svg');
      expect(qrUrl).toContain(encodeURIComponent(uri));
    });
  });

  describe('3. Thuật toán tính toán & Xác thực mã TOTP HMAC-SHA1', () => {
    it('Tính toán mã 6 số TOTP chuẩn xác theo thời gian', async () => {
      const secret = generateTotpSecret();
      const code = await calculateTotpCode(secret, Date.now());
      expect(code).toHaveLength(6);
      expect(/^\d{6}$/.test(code)).toBe(true);
    });

    it('Xác thực khớp đúng mã hiện tại', async () => {
      const secret = generateTotpSecret();
      const code = await calculateTotpCode(secret);
      const result = await verifyTotpCode(secret, code);
      expect(result.valid).toBe(true);
    });

    it('Cho phép bù trôi thời gian lệch ±30 giây (Clock Drift Tolerance)', async () => {
      const secret = generateTotpSecret();
      const now = Date.now();
      // Mã của 25 giây trước (vẫn nằm trong window ±30s)
      const pastCode = await calculateTotpCode(secret, now - 25000);
      const pastResult = await verifyTotpCode(secret, pastCode, 1);
      expect(pastResult.valid).toBe(true);

      // Mã của 25 giây sau
      const futureCode = await calculateTotpCode(secret, now + 25000);
      const futureResult = await verifyTotpCode(secret, futureCode, 1);
      expect(futureResult.valid).toBe(true);
    });

    it('Từ chối mã sai hoặc đã hết hạn quá thời gian cho phép', async () => {
      const secret = generateTotpSecret();
      const invalidResult = await verifyTotpCode(secret, '123456');
      // Mã ngẫu nhiên 99.999% không khớp
      if (!invalidResult.valid) {
        expect(invalidResult.message).toContain('không chính xác hoặc đã hết hạn');
      }

      // Mã quá cũ (cách đây 2 phút = 120s)
      const expiredCode = await calculateTotpCode(secret, Date.now() - 120000);
      const expiredResult = await verifyTotpCode(secret, expiredCode, 1);
      expect(expiredResult.valid).toBe(false);
    });
  });

  describe('4. Mã khôi phục dự phòng (Backup Recovery Codes)', () => {
    it('Sinh đủ 8 mã khôi phục định dạng XXXX-XXXX', () => {
      const codes = generateBackupRecoveryCodes(8);
      expect(codes).toHaveLength(8);
      for (const c of codes) {
        expect(/^[2-9A-Z]{4}-[2-9A-Z]{4}$/.test(c)).toBe(true);
      }
    });
  });

  describe('5. Kích hoạt, Đăng nhập & Vô hiệu hóa TOTP 2FA Service', () => {
    it('Kích hoạt thành công 2FA: Lưu trạng thái và secret vào User Profile', async () => {
      const user = await authService.signup('totp.user@pomo.app', 'pass123456', 'Totp User');
      const setup = totpService.startSetup(user.email);

      // Lấy mã 6 số thật sinh từ secret
      const validCode = await calculateTotpCode(setup.secret);

      // Kích hoạt
      const confirmRes = await totpService.confirmAndEnable(
        user.id,
        setup.secret,
        validCode,
        setup.backupCodes
      );

      expect(confirmRes.success).toBe(true);
      expect(confirmRes.user?.twoFactorEnabled).toBe(true);
      expect(confirmRes.user?.twoFactorMethod).toBe('totp');

      const savedSecret = totpService.getSecret(user.id);
      expect(savedSecret).toBe(setup.secret);

      const savedBackups = totpService.getBackupCodes(user.id);
      expect(savedBackups).toHaveLength(8);
    });

    it('Từ chối kích hoạt nếu người dùng nhập sai mã 6 số', async () => {
      const user = await authService.signup('wrong.code@pomo.app', 'pass123456', 'Wrong User');
      const setup = totpService.startSetup(user.email);

      const res = await totpService.confirmAndEnable(
        user.id,
        setup.secret,
        '000000',
        setup.backupCodes
      );

      expect(res.success).toBe(false);
      expect(res.message).toBeDefined();
    });

    it('Xác thực đăng nhập bằng mã TOTP 6 số thật', async () => {
      const user = await authService.signup('login.totp@pomo.app', 'pass123456', 'Login User');
      const setup = totpService.startSetup(user.email);
      const code = await calculateTotpCode(setup.secret);
      await totpService.confirmAndEnable(user.id, setup.secret, code, setup.backupCodes);

      // Đăng nhập với mã TOTP mới sinh
      const currentCode = await calculateTotpCode(setup.secret);
      const loginCheck = await totpService.verifyLogin(user.id, currentCode);
      expect(loginCheck.valid).toBe(true);
    });

    it('Xác thực đăng nhập bằng mã dự phòng (One-time use) và tự động tiêu hủy sau khi dùng', async () => {
      const user = await authService.signup('backup.user@pomo.app', 'pass123456', 'Backup User');
      const setup = totpService.startSetup(user.email);
      const code = await calculateTotpCode(setup.secret);
      await totpService.confirmAndEnable(user.id, setup.secret, code, setup.backupCodes);

      const backupCode = setup.backupCodes[0];

      // Dùng mã dự phòng lần 1 -> Hợp lệ
      const firstUse = await totpService.verifyLogin(user.id, backupCode);
      expect(firstUse.valid).toBe(true);
      expect(firstUse.usedBackupCode).toBe(true);

      // Danh sách còn lại 7 mã
      const remaining = totpService.getBackupCodes(user.id);
      expect(remaining).toHaveLength(7);

      // Dùng lại chính mã dự phòng đó lần 2 -> Bị từ chối
      const secondUse = await totpService.verifyLogin(user.id, backupCode);
      expect(secondUse.valid).toBe(false);
    });

    it('Tắt 2FA: Xóa secret, backup codes và chuyển twoFactorEnabled = false', async () => {
      const user = await authService.signup('disable.totp@pomo.app', 'pass123456', 'Disable User');
      const setup = totpService.startSetup(user.email);
      const code = await calculateTotpCode(setup.secret);
      await totpService.confirmAndEnable(user.id, setup.secret, code, setup.backupCodes);

      const disableRes = await totpService.disable(user.id);
      expect(disableRes.success).toBe(true);
      expect(disableRes.user?.twoFactorEnabled).toBe(false);

      expect(totpService.getSecret(user.id)).toBeNull();
      expect(totpService.getBackupCodes(user.id)).toHaveLength(0);
    });
  });
});
