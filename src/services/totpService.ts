/**
 * Dịch vụ Xác Thực 2 Bước (TOTP 2FA - RFC 6238 / RFC 4226)
 * Tương thích 100% với Google Authenticator, Microsoft Authenticator, Authy, 1Password, Apple Keychain.
 * Không phụ thuộc thư viện nặng ngoài, sử dụng chuẩn Web Crypto API (HMAC-SHA1).
 */

import { authService, UserProfile } from './authService';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const TIME_STEP_SECONDS = 30;
const TOTP_DIGITS = 6;
export const TOTP_STORAGE_KEY_PREFIX = 'pomofocus_totp_secret_';
export const BACKUP_CODES_KEY_PREFIX = 'pomofocus_backup_codes_';

/**
 * Mã hóa byte array sang chuỗi Base32 chuẩn RFC 4648
 */
export function base32Encode(buffer: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Giải mã chuỗi Base32 về mảng byte Uint8Array
 */
export function base32Decode(base32: string): Uint8Array {
  const clean = base32.toUpperCase().replace(/[\s=-]/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < clean.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(clean[i]);
    if (idx === -1) continue; // Bỏ qua ký tự không thuộc Base32

    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return new Uint8Array(bytes);
}

/**
 * Sinh khóa bí mật ngẫu nhiên (Secret Key) 20 bytes (32 ký tự Base32)
 */
export function generateTotpSecret(): string {
  const bytes = new Uint8Array(20);
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(bytes);
  } else if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return base32Encode(bytes);
}

/**
 * Định dạng khóa bí mật thành các cụm 4 chữ cái để người dùng dễ đọc và nhập tay
 * Ví dụ: "JBSWY3DPEHPK3PXP" -> "JBSW Y3DP EHPK 3PXP"
 */
export function formatSecretKey(secret: string): string {
  const clean = secret.toUpperCase().replace(/\s+/g, '');
  return clean.match(/.{1,4}/g)?.join(' ') || clean;
}

/**
 * Tạo URL chuẩn TOTP: otpauth://totp/...
 * Tương thích với tất cả các ứng dụng Authenticator
 */
export function generateOtpauthUri(
  secret: string,
  email: string,
  issuer: string = 'PomoFocus'
): string {
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(email)}`;
  const cleanSecret = secret.toUpperCase().replace(/\s+/g, '');
  return `otpauth://totp/${label}?secret=${cleanSecret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TIME_STEP_SECONDS}`;
}

/**
 * Lấy URL hình ảnh mã QR (SVG độ nét cao) từ otpauth URI
 */
export function getQrCodeImageUrl(otpauthUri: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(otpauthUri)}&margin=8&format=svg`;
}

/**
 * Tính toán mã 6 số TOTP tại một timestamp xác định (RFC 6238)
 */
export async function calculateTotpCode(
  secret: string,
  timestampMs: number = Date.now()
): Promise<string> {
  const counter = Math.floor(Math.floor(timestampMs / 1000) / TIME_STEP_SECONDS);
  const secretBytes = base32Decode(secret);

  // Bộ đếm counter 8 bytes big-endian
  const counterBuffer = new ArrayBuffer(8);
  const view = new DataView(counterBuffer);
  // Do DataView setBigInt64 có thể cần polyfill trên môi trường cũ, ta ghi 2 thanh ghi 32-bit:
  view.setUint32(0, Math.floor(counter / 0x100000000), false);
  view.setUint32(4, counter >>> 0, false);

  const subtle = (typeof window !== 'undefined' && window.crypto?.subtle)
    || (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle);

  if (!subtle) {
    throw new Error('Web Crypto Subtle API không khả dụng trên môi trường này.');
  }

  const hmacKey = await subtle.importKey(
    'raw',
    secretBytes,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );

  const signature = await subtle.sign('HMAC', hmacKey, counterBuffer);
  const hmacResult = new Uint8Array(signature);

  // Dynamic truncation theo RFC 4226
  const offset = hmacResult[hmacResult.length - 1] & 0x0f;
  const binary =
    ((hmacResult[offset] & 0x7f) << 24) |
    ((hmacResult[offset + 1] & 0xff) << 16) |
    ((hmacResult[offset + 2] & 0xff) << 8) |
    (hmacResult[offset + 3] & 0xff);

  const otp = binary % 10 ** TOTP_DIGITS;
  return otp.toString().padStart(TOTP_DIGITS, '0');
}

/**
 * Xác thực mã OTP 6 số do người dùng nhập từ ứng dụng Authenticator
 * Hỗ trợ bù trôi thời gian (Clock drift window ±1 bước = ±30 giây)
 */
export async function verifyTotpCode(
  secret: string,
  userInputCode: string,
  windowSteps: number = 1
): Promise<{ valid: boolean; message?: string }> {
  const cleanCode = (userInputCode || '').trim().replace(/\s+/g, '');
  if (!/^\d{6}$/.test(cleanCode)) {
    return { valid: false, message: 'Mã xác thực phải gồm đúng 6 chữ số.' };
  }

  const now = Date.now();
  const stepMs = TIME_STEP_SECONDS * 1000;

  // Kiểm tra mã hiện tại và các bước lân cận (cho phép lệch đồng hồ ±30s)
  for (let offset = -windowSteps; offset <= windowSteps; offset++) {
    const candidateTime = now + offset * stepMs;
    const expected = await calculateTotpCode(secret, candidateTime);
    if (expected === cleanCode) {
      return { valid: true };
    }
  }

  return {
    valid: false,
    message: 'Mã xác thực từ ứng dụng không chính xác hoặc đã hết hạn (mỗi 30s sẽ đổi mã mới).'
  };
}

/**
 * Sinh danh sách 8 mã dự phòng (One-time Backup Codes)
 * Định dạng: XXXX-XXXX (Ví dụ: A89F-3B2C)
 */
export function generateBackupRecoveryCodes(count: number = 8): string[] {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const codes: string[] = [];

  for (let i = 0; i < count; i++) {
    let p1 = '';
    let p2 = '';
    for (let j = 0; j < 4; j++) {
      p1 += chars[Math.floor(Math.random() * chars.length)];
      p2 += chars[Math.floor(Math.random() * chars.length)];
    }
    codes.push(`${p1}-${p2}`);
  }

  return codes;
}

export const totpService = {
  /**
   * Bắt đầu phiên thiết lập 2FA:
   * Sinh Secret Key, URL otpauth và danh sách Backup Codes
   */
  startSetup(userEmail: string): {
    secret: string;
    formattedSecret: string;
    otpauthUri: string;
    qrCodeUrl: string;
    backupCodes: string[];
  } {
    const secret = generateTotpSecret();
    const formattedSecret = formatSecretKey(secret);
    const otpauthUri = generateOtpauthUri(secret, userEmail);
    const qrCodeUrl = getQrCodeImageUrl(otpauthUri);
    const backupCodes = generateBackupRecoveryCodes(8);

    return {
      secret,
      formattedSecret,
      otpauthUri,
      qrCodeUrl,
      backupCodes
    };
  },

  /**
   * Xác minh mã lần đầu và chính thức kích hoạt 2FA TOTP cho tài khoản
   */
  async confirmAndEnable(
    userId: string,
    secret: string,
    verificationCode: string,
    backupCodes: string[]
  ): Promise<{ success: boolean; message: string; user?: UserProfile }> {
    const result = await verifyTotpCode(secret, verificationCode);
    if (!result.valid) {
      return {
        success: false,
        message: result.message || 'Mã xác thực không hợp lệ.'
      };
    }

    // Lưu secret và backup codes vào storage bảo mật cục bộ
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(`${TOTP_STORAGE_KEY_PREFIX}${userId}`, secret);
      localStorage.setItem(`${BACKUP_CODES_KEY_PREFIX}${userId}`, JSON.stringify(backupCodes));
    }

    // Cập nhật trạng thái người dùng trong Profile
    try {
      const updatedUser = await authService.updateProfile(userId, {
        twoFactorEnabled: true,
        twoFactorMethod: 'totp',
        totpVerifiedAt: Date.now()
      });

      return {
        success: true,
        message: 'Đã kích hoạt Xác Thực 2 Bước (Google Authenticator) thành công! Tài khoản của bạn hiện được bảo mật cấp cao.',
        user: updatedUser
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi cập nhật trạng thái bảo mật.';
      return { success: false, message: msg };
    }
  },

  /**
   * Tắt 2FA TOTP
   */
  async disable(
    userId: string
  ): Promise<{ success: boolean; message: string; user?: UserProfile }> {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(`${TOTP_STORAGE_KEY_PREFIX}${userId}`);
      localStorage.removeItem(`${BACKUP_CODES_KEY_PREFIX}${userId}`);
    }

    try {
      const updatedUser = await authService.updateProfile(userId, {
        twoFactorEnabled: false,
        twoFactorMethod: undefined,
        totpVerifiedAt: undefined
      });

      return {
        success: true,
        message: 'Đã tắt tính năng Xác Thực 2 Bước.',
        user: updatedUser
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi tắt 2FA.';
      return { success: false, message: msg };
    }
  },

  /**
   * Lấy Secret Key hiện tại của người dùng (nếu có)
   */
  getSecret(userId: string): string | null {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return localStorage.getItem(`${TOTP_STORAGE_KEY_PREFIX}${userId}`);
  },

  /**
   * Lấy danh sách mã dự phòng còn lại
   */
  getBackupCodes(userId: string): string[] {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    try {
      const raw = localStorage.getItem(`${BACKUP_CODES_KEY_PREFIX}${userId}`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  /**
   * Xác thực mã OTP trong quá trình đăng nhập (hoặc dùng mã dự phòng)
   */
  async verifyLogin(
    userId: string,
    codeOrBackup: string
  ): Promise<{ valid: boolean; usedBackupCode?: boolean; message?: string }> {
    const clean = (codeOrBackup || '').trim().toUpperCase();
    const secret = this.getSecret(userId);

    // 1. Thử xác thực với mã TOTP 6 số
    if (secret && /^\d{6}$/.test(clean)) {
      const res = await verifyTotpCode(secret, clean);
      if (res.valid) {
        return { valid: true };
      }
    }

    // 2. Thử đối soát với danh sách Backup Codes
    const backupCodes = this.getBackupCodes(userId);
    const foundIdx = backupCodes.findIndex((b) => b.toUpperCase() === clean);
    if (foundIdx !== -1) {
      // Đánh dấu đã dùng mã dự phòng này
      backupCodes.splice(foundIdx, 1);
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(`${BACKUP_CODES_KEY_PREFIX}${userId}`, JSON.stringify(backupCodes));
      }
      return { valid: true, usedBackupCode: true };
    }

    return {
      valid: false,
      message: 'Mã xác thực 6 chữ số hoặc mã dự phòng không chính xác.'
    };
  }
};
