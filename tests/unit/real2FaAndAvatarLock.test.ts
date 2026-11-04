import { describe, it, expect, beforeEach, vi } from 'vitest';
import { authService, UserProfile } from '../../src/services/authService';
import { totpService, calculateTotpCode } from '../../src/services/totpService';
import { userSettingsService } from '../../src/services/userSettingsService';
import { useLayoutStore } from '../../src/stores/useLayoutStore';
import { useTimerStore } from '../../src/stores/useTimerStore';
import { ProfileService } from '../../src/services/profileService';

describe('Real 2FA Security Gate, Avatar Precedence & Settings Persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  describe('1. Avatar Precedence Rule (Bảo Toàn Avatar Tự Tải Lên)', () => {
    it('Giữ nguyên custom_avatar_url khi đăng nhập lại bằng Google (không bị ảnh Google đè lên)', async () => {
      // 1. User đăng nhập bằng Google lần đầu tiên
      const initialGooglePhoto = 'https://lh3.googleusercontent.com/a/initial-photo.png';
      const user = await authService.loginWithGoogle({
        sub: 'google_123456',
        email: 'designer@example.com',
        name: 'Designer Name',
        picture: initialGooglePhoto,
        email_verified: true
      });
      expect(user).toBeDefined();
      expect(user.avatarUrl).toBe(initialGooglePhoto);

      // 2. User đổi avatar tùy chỉnh cá nhân (Upload hoặc Monochrome Geometric)
      const customAvatar = 'https://images.unsplash.com/photo-custom-art-123.jpg';
      const updated = await authService.updateProfile(user.id, {
        avatarUrl: customAvatar
      });
      expect(updated.avatarUrl).toBe(customAvatar);
      expect(updated.customAvatarUrl).toBe(customAvatar);
      expect(updated.hasCustomAvatar).toBe(true);

      // 3. User đăng nhập lại bằng Google với ảnh Google hoàn toàn mới
      const newGooglePhoto = 'https://lh3.googleusercontent.com/a/different-google-avatar.png';
      const loggedInGoogle = await authService.loginWithGoogle({
        sub: 'google_123456',
        email: 'designer@example.com',
        name: 'Designer Name',
        picture: newGooglePhoto,
        email_verified: true
      });

      // 4. KIỂM TRA BẤT BIẾN: Avatar vẫn PHẢI là customAvatar, không được phép thành newGooglePhoto
      expect(loggedInGoogle.avatarUrl).toBe(customAvatar);
      expect(loggedInGoogle.customAvatarUrl).toBe(customAvatar);
      expect(loggedInGoogle.hasCustomAvatar).toBe(true);
    });

    it('Chỉ dùng ảnh Google nếu người dùng chưa từng tải avatar custom', async () => {
      const googlePhoto = 'https://lh3.googleusercontent.com/a/brand-new-user.png';
      const newGoogleUser = await authService.loginWithGoogle({
        sub: 'google_fresh_999',
        email: 'fresh@example.com',
        name: 'Fresh User',
        picture: googlePhoto,
        email_verified: true
      });

      expect(newGoogleUser.avatarUrl).toBe(googlePhoto);
      expect(newGoogleUser.hasCustomAvatar).toBeFalsy();
    });
  });

  describe('2. Real 2FA Security Gate (Trạm Gác Cổng TOTP & Backup Codes)', () => {
    it('Chặn đăng nhập và phát cờ requires2Fa khi tài khoản đã bật 2FA', async () => {
      // Tạo user và kích hoạt 2FA
      const user = await authService.login('secure.user@example.com', 'secret123');
      const setup = totpService.startSetup(user.email);
      const code = await calculateTotpCode(setup.secret);

      // Kích hoạt 2FA
      const enableRes = await totpService.confirmAndEnable(user.id, setup.secret, code, setup.backupCodes);
      expect(enableRes.success).toBe(true);
      expect(totpService.isTotpEnabled(user.id)).toBe(true);

      // Đăng xuất (xóa session)
      localStorage.removeItem('pomodoro_study_auth_session');

      // Cố gắng đăng nhập chỉ với Email & Password (chưa có OTP)
      let thrownErr: any = null;
      try {
        await authService.login('secure.user@example.com', 'secret123');
      } catch (err) {
        thrownErr = err;
      }

      // BẮT BUỘC BỊ CHẶN: Có requires2Fa = true, pendingUser và không cấp session
      expect(thrownErr).not.toBeNull();
      expect(thrownErr.requires2Fa).toBe(true);
      expect(thrownErr.pendingUser).toBeDefined();
      expect(thrownErr.pendingUser.email).toBe('secure.user@example.com');
      expect(localStorage.getItem('pomodoro_study_auth_session')).toBeNull();
    });

    it('Từ chối mã 2FA sai và cho phép đăng nhập thành công khi nhập đúng OTP', async () => {
      const user = await authService.login('otp.user@example.com', 'secret123');
      const setup = totpService.startSetup(user.email);
      const validCode = await calculateTotpCode(setup.secret);
      await totpService.confirmAndEnable(user.id, setup.secret, validCode, setup.backupCodes);

      // Đăng xuất
      localStorage.removeItem('pomodoro_study_auth_session');

      // 1. Thử đăng nhập với mã OTP sai ('000000')
      let wrongCodeErr: any = null;
      try {
        await authService.login('otp.user@example.com', 'secret123', '000000');
      } catch (err) {
        wrongCodeErr = err;
      }
      expect(wrongCodeErr).not.toBeNull();
      expect(wrongCodeErr.message).toMatch(/không chính xác/);
      expect(localStorage.getItem('pomodoro_study_auth_session')).toBeNull();

      // 2. Đăng nhập với mã OTP chuẩn xác
      const successUser = await authService.login('otp.user@example.com', 'secret123', validCode);
      expect(successUser).toBeDefined();
      expect(successUser.email).toBe('otp.user@example.com');
      expect(localStorage.getItem('pomodoro_study_auth_session')).not.toBeNull();
    });

    it('Cho phép đăng nhập bằng Mã Dự Phòng (Backup Code) khi mất điện thoại', async () => {
      const user = await authService.login('backup.user@example.com', 'secret123');
      const setup = totpService.startSetup(user.email);
      const validCode = await calculateTotpCode(setup.secret);
      await totpService.confirmAndEnable(user.id, setup.secret, validCode, setup.backupCodes);

      // Đăng xuất
      localStorage.removeItem('pomodoro_study_auth_session');

      const backupCodeToUse = setup.backupCodes[0];
      const successUser = await authService.login('backup.user@example.com', 'secret123', backupCodeToUse);

      expect(successUser).toBeDefined();
      expect(successUser.email).toBe('backup.user@example.com');

      // Mã dự phòng đã dùng phải bị loại bỏ khỏi kho
      const remainingCodes = totpService.getBackupCodes(user.id);
      expect(remainingCodes).not.toContain(backupCodeToUse);
      expect(remainingCodes.length).toBe(setup.backupCodes.length - 1);
    });
  });

  describe('3. User Settings Persistence & Cross-Device Sync', () => {
    it('Thu thập, lưu trữ và áp dụng chính xác cấu hình dock, theme và thời lượng pomodoro', async () => {
      const updateFieldsSpy = vi.spyOn(ProfileService, 'updateFields').mockResolvedValue(true as any);

      const userId = 'usr_test_settings_1';

      // Áp dụng cài đặt mới
      userSettingsService.applySettings({
        dock_position: 'right',
        dock_size: 'compact',
        theme: 'amber',
        volume: 75,
        pomodoro_custom_times: {
          pomodoroMinutes: 50,
          shortBreakMinutes: 10,
          longBreakMinutes: 20,
          roundsBeforeLongBreak: 4
        }
      });

      // Kiểm tra layout store đã cập nhật
      const layoutState = useLayoutStore.getState();
      expect(layoutState.dockPosition).toBe('right');
      expect(layoutState.dockSize).toBe('compact');
      expect(layoutState.themeAccent).toBe('amber');

      // Kiểm tra timer store đã cập nhật
      const timerSettings = useTimerStore.getState().settings;
      expect(timerSettings.pomodoroMinutes).toBe(50);
      expect(timerSettings.shortBreakMinutes).toBe(10);
      expect(timerSettings.longBreakMinutes).toBe(20);

      // Thu thập lại cài đặt hiện tại
      const collected = userSettingsService.collectCurrent();
      expect(collected.dock_position).toBe('right');
      expect(collected.dock_size).toBe('compact');
      expect(collected.theme).toBe('amber');
      expect(collected.pomodoro_custom_times?.pomodoroMinutes).toBe(50);

      // Lưu cài đặt
      await userSettingsService.saveSettings(userId);
      const localCached = userSettingsService.loadLocalSettings(userId);
      expect(localCached).not.toBeNull();
      expect(localCached?.dock_position).toBe('right');
    });
  });
});
