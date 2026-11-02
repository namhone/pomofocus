/**
 * SMS SECURITY & 2FA VERIFICATION SERVICE — POMOFOCUS
 * ==============================================================================
 * Quản lý liên kết số điện thoại, gửi mã OTP xác minh qua tin nhắn SMS,
 * và kích hoạt cơ chế bảo vệ 2 lớp (Two-Factor Authentication / 2FA).
 */

import { authService, UserProfile } from './authService';

export interface SmsOtpSession {
  phoneNumber: string;
  code: string;
  createdAt: number;
  expiresAt: number;
  attempts: number;
}

const SMS_OTP_STORAGE_KEY = 'pomodoro_sms_otp_session';
const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 phút hiệu lực
const OTP_COOLDOWN_MS = 60 * 1000;   // 60 giây chờ gửi lại
const MAX_ATTEMPTS = 5;

/**
 * Chuẩn hóa và làm sạch số điện thoại Việt Nam
 */
export function normalizePhoneNumber(phone: string): { valid: boolean; normalized: string; error?: string } {
  if (!phone) return { valid: false, normalized: '', error: 'Số điện thoại không được để trống.' };

  // Xóa khoảng trắng, dấu chấm, dấu gạch ngang
  let cleaned = phone.replace(/[\s\.\-\(\)]/g, '');

  // Chuẩn hóa +84 hoặc 84 về đầu số 0
  if (cleaned.startsWith('+84')) {
    cleaned = '0' + cleaned.slice(3);
  } else if (cleaned.startsWith('84') && cleaned.length >= 11) {
    cleaned = '0' + cleaned.slice(2);
  }

  // Kiểm tra định dạng số di động Việt Nam (10 chữ số, bắt đầu bằng 03, 05, 07, 08, 09)
  const vnPhoneRegex = /^(03|05|07|08|09)\d{8}$/;
  if (!vnPhoneRegex.test(cleaned)) {
    return {
      valid: false,
      normalized: cleaned,
      error: 'Số điện thoại không hợp lệ. Vui lòng nhập số di động 10 số (VD: 0987654321).'
    };
  }

  return { valid: true, normalized: cleaned };
}

/**
 * Ẩn các chữ số ở giữa số điện thoại để bảo vệ quyền riêng tư (VD: 098****321)
 */
export function maskPhoneNumber(phone?: string | null): string {
  if (!phone) return '';
  const clean = phone.replace(/\s/g, '');
  if (clean.length < 8) return clean;
  const start = clean.slice(0, 3);
  const end = clean.slice(-3);
  return `${start}****${end}`;
}

/**
 * Tạo mã OTP ngẫu nhiên 6 chữ số
 */
function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export const smsSecurityService = {
  /**
   * Lấy phiên OTP đang hoạt động trong bộ nhớ
   */
  getActiveOtpSession(): SmsOtpSession | null {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    try {
      const raw = localStorage.getItem(SMS_OTP_STORAGE_KEY);
      if (!raw) return null;
      const session: SmsOtpSession = JSON.parse(raw);
      if (Date.now() > session.expiresAt) {
        localStorage.removeItem(SMS_OTP_STORAGE_KEY);
        return null;
      }
      return session;
    } catch {
      return null;
    }
  },

  /**
   * Gửi mã OTP xác minh SMS tới số điện thoại
   */
  async sendSmsOtp(phone: string): Promise<{
    success: boolean;
    message: string;
    cooldownSeconds?: number;
    demoCode?: string;
  }> {
    const { valid, normalized, error } = normalizePhoneNumber(phone);
    if (!valid) {
      return { success: false, message: error || 'Số điện thoại không hợp lệ.' };
    }

    const currentSession = this.getActiveOtpSession();
    if (currentSession && currentSession.phoneNumber === normalized) {
      const elapsed = Date.now() - currentSession.createdAt;
      if (elapsed < OTP_COOLDOWN_MS) {
        const remaining = Math.ceil((OTP_COOLDOWN_MS - elapsed) / 1000);
        return {
          success: false,
          message: `Vui lòng đợi ${remaining} giây trước khi yêu cầu gửi lại mã OTP.`,
          cooldownSeconds: remaining,
          demoCode: currentSession.code
        };
      }
    }

    const code = generateOtpCode();
    const now = Date.now();
    const newSession: SmsOtpSession = {
      phoneNumber: normalized,
      code,
      createdAt: now,
      expiresAt: now + OTP_EXPIRY_MS,
      attempts: 0
    };

    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(SMS_OTP_STORAGE_KEY, JSON.stringify(newSession));
    }

    // Mô phỏng gửi SMS thành công (hỗ trợ hiển thị mã trên giao diện Demo/Sandbox)
    return {
      success: true,
      message: `Mã xác thực SMS đã được gửi tới số ${maskPhoneNumber(normalized)}.`,
      demoCode: code,
      cooldownSeconds: 60
    };
  },

  /**
   * Xác thực mã OTP và liên kết số điện thoại với tài khoản
   */
  async verifyAndLinkPhone(
    userId: string,
    phone: string,
    otpCode: string
  ): Promise<{ success: boolean; message: string; user?: UserProfile }> {
    const { valid, normalized, error } = normalizePhoneNumber(phone);
    if (!valid) {
      return { success: false, message: error || 'Số điện thoại không hợp lệ.' };
    }

    const cleanCode = (otpCode || '').trim();
    if (cleanCode.length !== 6) {
      return { success: false, message: 'Mã xác thực OTP phải gồm 6 chữ số.' };
    }

    const session = this.getActiveOtpSession();
    if (!session || session.phoneNumber !== normalized) {
      return {
        success: false,
        message: 'Không tìm thấy phiên gửi OTP hoặc mã đã hết hạn. Vui lòng bấm Gửi lại mã.'
      };
    }

    if (session.attempts >= MAX_ATTEMPTS) {
      localStorage.removeItem(SMS_OTP_STORAGE_KEY);
      return {
        success: false,
        message: 'Bạn đã nhập sai quá 5 lần. Vui lòng yêu cầu mã OTP mới.'
      };
    }

    if (session.code !== cleanCode) {
      session.attempts += 1;
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(SMS_OTP_STORAGE_KEY, JSON.stringify(session));
      }
      return {
        success: false,
        message: `Mã OTP không chính xác. Bạn còn ${MAX_ATTEMPTS - session.attempts} lần thử.`
      };
    }

    // Xác thực thành công: Xóa session OTP và cập nhật Profile người dùng
    localStorage.removeItem(SMS_OTP_STORAGE_KEY);

    try {
      const updatedUser = await authService.updateProfile(userId, {
        phoneNumber: normalized,
        phoneVerified: true,
        twoFactorEnabled: true
      });

      return {
        success: true,
        message: `Đã liên kết và kích hoạt bảo mật SMS 2FA cho số ${maskPhoneNumber(normalized)} thành công!`,
        user: updatedUser
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi lưu số điện thoại.';
      return { success: false, message: msg };
    }
  },

  /**
   * Hủy liên kết số điện thoại và tắt 2FA SMS
   */
  async unlinkPhone(userId: string): Promise<{ success: boolean; message: string; user?: UserProfile }> {
    try {
      const updatedUser = await authService.updateProfile(userId, {
        phoneNumber: null,
        phoneVerified: false,
        twoFactorEnabled: false
      });

      return {
        success: true,
        message: 'Đã hủy liên kết số điện thoại và tắt tính năng xác thực SMS 2FA.',
        user: updatedUser
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi hủy liên kết số điện thoại.';
      return { success: false, message: msg };
    }
  },

  /**
   * Bật / Tắt công tắc Xác thực 2 bước (SMS 2FA)
   */
  async toggleTwoFactor(
    userId: string,
    enabled: boolean
  ): Promise<{ success: boolean; message: string; user?: UserProfile }> {
    const current = authService.getCurrentSession();
    if (!current || !current.phoneNumber || !current.phoneVerified) {
      return {
        success: false,
        message: 'Bạn cần liên kết và xác minh số điện thoại trước khi kích hoạt bảo mật 2FA.'
      };
    }

    try {
      const updatedUser = await authService.updateProfile(userId, {
        twoFactorEnabled: enabled
      });

      return {
        success: true,
        message: enabled
          ? 'Đã bật chế độ xác thực 2 bước (SMS 2FA) bảo vệ tài khoản.'
          : 'Đã tạm tắt chế độ xác thực 2 bước (SMS 2FA).',
        user: updatedUser
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi cập nhật 2FA.';
      return { success: false, message: msg };
    }
  }
};
