import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService } from '../../src/services/authService';
import { totpService, generateTotpSecret } from '../../src/services/totpService';
import { ProfileService } from '../../src/services/profileService';
import { couponService } from '../../src/services/couponService';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useAiStore, OWNER_EMAILS, isOwnerAiUser } from '../../src/stores/useAiStore';
import { useAudioStore } from '../../src/stores/useAudioStore';

describe('Cloud 2FA, Security Enhancements & Owner Privileges Audit', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  describe('1. 2FA Cloud Persistence & Fresh Device Enforcement', () => {
    it('Chặn đăng nhập trên thiết bị mới (localStorage rỗng) nếu Supabase Cloud profile có 2FA', async () => {
      const email = 'secure_user@example.com';
      const password = 'StrongPassword123!';
      const userId = 'usr_secure_device_b';

      // 1. Tạo tài khoản cục bộ
      await authService.signup(email, password, 'Secure Student');

      // 2. Mock Cloud Profile có 2FA bật trên Supabase
      const secret = generateTotpSecret();
      vi.spyOn(ProfileService, 'fetchProfileByEmail').mockResolvedValue({
        id: userId,
        email,
        display_name: 'Secure Student',
        role: 'user',
        plan: 'free',
        two_factor_enabled: true,
        totp_secret: secret,
        backup_codes: ['112233', '445566'],
        ai_credits_balance: 50,
        settings: {}
      } as any);

      // 3. Giả lập thiết bị mới: Xóa sạch 2FA local storage
      localStorage.removeItem(`pomodoro_totp_secret_${userId}`);
      localStorage.removeItem(`pomodoro_totp_backup_codes_${userId}`);

      // 4. Đăng nhập không kèm mã TOTP -> Bắt buộc kích hoạt trạm gác cổng 2FA
      const loggedIn = await useAuthStore.getState().login(email, password);
      expect(loggedIn).toBe(false);
      expect(useAuthStore.getState().requires2Fa).toBe(true);
      expect(useAuthStore.getState().pending2FaUser?.email).toBe(email);
    });
  });

  describe('2. Email OTP Password Reset Flow', () => {
    it('Gửi mã OTP 6 số và xác minh đặt lại mật khẩu mới thành công', async () => {
      const email = 'reset_target@example.com';
      const oldPass = 'OldPass123!';
      const newPass = 'NewSecurePass999!';

      // Tạo tài khoản
      await authService.signup(email, oldPass, 'Reset Target');

      // 1. Gửi OTP quên mật khẩu
      const sendRes = await authService.sendPasswordResetOtp(email);
      expect(sendRes.success).toBe(true);
      expect(sendRes.otp).toBeDefined();
      expect(sendRes.otp?.length).toBe(6);

      const otp = sendRes.otp!;

      // 2. Thử đặt lại bằng mã OTP sai -> Bị từ chối
      await expect(authService.verifyPasswordResetOtp(email, '000000', newPass)).rejects.toThrow();

      // 3. Đặt lại bằng OTP đúng -> Thành công
      const okRes = await authService.verifyPasswordResetOtp(email, otp, newPass);
      expect(okRes.success).toBe(true);

      // 4. Đăng nhập bằng mật khẩu mới -> Thành công
      const loginRes = await authService.login(email, newPass);
      expect(loginRes).toBeDefined();
      expect(loginRes.email).toBe(email);
    });
  });

  describe('3. Secondary Password for Google OAuth Accounts', () => {
    it('Cho phép tài khoản Google OAuth thiết lập mật khẩu phụ để đăng nhập đa kênh', async () => {
      const googleEmail = 'google_oauth_student@gmail.com';
      const googlePayload = {
        sub: 'google_uid_987654',
        email: googleEmail,
        name: 'Google Student',
        picture: 'https://example.com/photo.jpg'
      };

      // Đăng nhập Google lần đầu
      const user = await authService.loginWithGoogle(googlePayload);
      expect(user).toBeDefined();
      expect(user.authProvider).toBe('google');

      // Thiết lập mật khẩu phụ độc lập
      const secPass = 'LocalPasswordForGoogleAcc@123';
      const setRes = await authService.setSecondaryPasswordForOAuth(user.id, secPass);
      expect(setRes.success).toBe(true);

      // Giờ có thể đăng nhập bằng Email/Password thông thường!
      const emailLoginRes = await authService.login(googleEmail, secPass);
      expect(emailLoginRes).toBeDefined();
      expect(emailLoginRes.email).toBe(googleEmail);
    });
  });

  describe('4. Owner Infinite AI Credits Privileges', () => {
    it('Chủ sở hữu (namho03052k9@gmail.com, huyentrantt09@gmail.com) có chi phí 0⚡ và không bao giờ bị trừ', () => {
      for (const ownerEmail of OWNER_EMAILS) {
        useAuthStore.setState({
          user: {
            id: `usr_${ownerEmail.split('@')[0]}`,
            email: ownerEmail,
            displayName: 'Owner',
            plan: 'lifetime',
            credits: 1000
          }
        });

        expect(isOwnerAiUser()).toBe(true);

        useAiStore.setState({ aiCreditsBalance: 1000 });
        const deducted = useAiStore.getState().deductCredits(20);
        expect(deducted).toBe(true);
        expect(useAiStore.getState().aiCreditsBalance).toBe(1000); // 0 deduction
      }
    });
  });

  describe('5. Coupon EIU & Conversion Rate Integrity', () => {
    it('Mã EIU kích hoạt tức thì PRO TRỌN ĐỜI vĩnh viễn', () => {
      const studentUser = {
        id: 'usr_student_eiu',
        email: 'eiu_student@eiu.edu.vn',
        displayName: 'EIU Student',
        plan: 'free' as const,
        createdAt: Date.now()
      };
      authService.saveSession(studentUser);

      const res = couponService.redeemCoupon('EIU', studentUser);
      expect(res.success).toBe(true);
      expect(res.message).toContain('PRO TRỌN ĐỜI vĩnh viễn');
    });

    it('Người dùng Lifetime nhập VIP7DAYS nhận +750⚡ AI Credits', () => {
      const lifetimeUser = {
        id: 'usr_lifetime_user',
        email: 'pro_user@example.com',
        displayName: 'Pro User',
        plan: 'pro_lifetime' as const,
        isLifetime: true,
        createdAt: Date.now()
      };
      authService.saveSession(lifetimeUser);

      useAiStore.setState({ aiCreditsBalance: 500 });
      const res = couponService.redeemCoupon('VIP7DAYS', lifetimeUser);
      expect(res.success).toBe(true);
      expect(res.creditsAdded).toBe(750);
      expect(res.message).toContain('+750⚡ AI Credits');
      expect(useAiStore.getState().aiCreditsBalance).toBe(1250);
    });
  });

  describe('6. Audio Store Custom Playlist Cloud Sync', () => {
    it('Lưu playlist YouTube vào settings của Supabase Cloud Profile', async () => {
      const updateSpy = vi.spyOn(ProfileService, 'updateFields').mockResolvedValue(true);
      localStorage.setItem('pomodoro_study_auth_session', JSON.stringify({ id: 'usr_music_cloud' }));

      useAudioStore.getState().setCustomMusicUrl('https://www.youtube.com/watch?v=jfKfPfyJRdk');
      expect(useAudioStore.getState().customMusicUrl).toBe('https://www.youtube.com/watch?v=jfKfPfyJRdk');
      await new Promise((r) => setTimeout(r, 60));
      expect(updateSpy).toHaveBeenCalledWith('usr_music_cloud', expect.objectContaining({
        custom_playlist_url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk'
      }));
    });
  });
});
