import { describe, it, expect, beforeEach, vi } from 'vitest';
import { authService } from '../../src/services/authService';
import { ProfileService, CloudProfile } from '../../src/services/profileService';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { GoogleUserPayload } from '../../src/services/googleAuthService';

describe('Avatar Synchronization & Single Source of Truth Specification', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  describe('1. Chuẩn hóa cập nhật Avatar (3 trường: avatarUrl, customAvatarUrl, hasCustomAvatar)', () => {
    it('Cập nhật avatar qua updateProfile thiết lập đầy đủ 3 trường và đồng bộ', async () => {
      // Đăng nhập tài khoản kiểm thử
      const user = await authService.login('student.avatar@test.com', 'password123');
      expect(user).toBeDefined();

      // Cập nhật avatar tùy chỉnh
      const customAvatar = 'https://pomofocus.io/avatars/anime-hero.png';
      const updated = await authService.updateProfile(user.id, {
        displayName: 'Student Hero',
        avatarUrl: customAvatar
      });

      expect(updated.avatarUrl).toBe(customAvatar);
      expect(updated.customAvatarUrl).toBe(customAvatar);
      expect(updated.hasCustomAvatar).toBe(true);

      // Kiểm tra trong session
      const session = authService.getCurrentSession();
      expect(session?.avatarUrl).toBe(customAvatar);
      expect(session?.customAvatarUrl).toBe(customAvatar);
      expect(session?.hasCustomAvatar).toBe(true);
    });
  });

  describe('2. Quy tắc Avatar Precedence: Google không bao giờ đè lên Custom Avatar', () => {
    it('Đăng xuất sau khi đổi avatar, đăng nhập lại bằng Google giữ nguyên ảnh custom', async () => {
      const email = 'namho.custom@gmail.com';
      const initialUser = await authService.login(email, 'myPass123');

      // Tải lên ảnh tùy chỉnh
      const myAvatar = 'https://storage.googleapis.com/pomofocus/my-avatar.jpg';
      await authService.updateProfile(initialUser.id, {
        avatarUrl: myAvatar
      });

      // Đăng xuất
      authService.logout();
      expect(authService.getCurrentSession()).toBeNull();

      // Đăng nhập lại bằng Google (Google có picture mặc định)
      const googlePayload: GoogleUserPayload = {
        sub: 'google_sub_99999',
        email,
        email_verified: true,
        name: 'Nam Ho Google',
        picture: 'https://lh3.googleusercontent.com/a/google-default-photo'
      };

      const restoredUser = await authService.loginWithGoogle(googlePayload);

      // KHÔNG ĐƯỢC để ảnh Google đè lên ảnh custom đã đặt!
      expect(restoredUser.avatarUrl).toBe(myAvatar);
      expect(restoredUser.customAvatarUrl).toBe(myAvatar);
      expect(restoredUser.hasCustomAvatar).toBe(true);
    });

    it('Người dùng chưa từng đổi avatar thì được gán ảnh Google bình thường', async () => {
      const googlePayload: GoogleUserPayload = {
        sub: 'google_fresh_123',
        email: 'fresh.student@gmail.com',
        email_verified: true,
        name: 'Fresh Student',
        picture: 'https://lh3.googleusercontent.com/fresh-photo'
      };

      const user = await authService.loginWithGoogle(googlePayload);
      expect(user.avatarUrl).toBe('https://lh3.googleusercontent.com/fresh-photo');
      expect(user.hasCustomAvatar).toBe(false);
    });
  });

  describe('3. Đồng nhất tài khoản Google & Email (Single Source of Truth)', () => {
    it('Cập nhật avatar qua ProfileView đồng bộ đồng thời cả bản ghi Google và Email', async () => {
      const email = 'unified@gmail.com';

      // 1. Đăng nhập bằng Google trước
      const googleUser = await authService.loginWithGoogle({
        sub: 'sub_unified_777',
        email,
        email_verified: true,
        name: 'Unified User',
        picture: 'https://google.com/pic.jpg'
      });
      authService.logout();

      // 2. Đăng nhập bằng Email/Password
      const passUser = await authService.login(email, 'unifiedPass');
      
      // 3. Đổi avatar khi đang ở phiên Password
      const newPic = 'https://pomofocus.io/new-art.png';
      await authService.updateProfile(passUser.id, {
        avatarUrl: newPic
      });

      // 4. Đăng xuất và đăng nhập lại bằng Google
      authService.logout();
      const reGoogle = await authService.loginWithGoogle({
        sub: 'sub_unified_777',
        email,
        email_verified: true,
        name: 'Unified User',
        picture: 'https://google.com/pic.jpg'
      });

      // Bản ghi Google phải có đúng ảnh mới đặt
      expect(reGoogle.avatarUrl).toBe(newPic);
      expect(reGoogle.customAvatarUrl).toBe(newPic);
      expect(reGoogle.hasCustomAvatar).toBe(true);
    });
  });

  describe('4. Cloud Rehydration: Kéo avatar từ Supabase Cloud khi mở tab mới / xóa local data', () => {
    it('Đăng nhập tại thiết bị mới (localStorage rỗng) tự động khôi phục custom avatar từ Cloud', async () => {
      const email = 'cloud.sync@study.io';
      const cloudAvatarUrl = 'https://supabase.co/storage/v1/user_avatar_cloud.png';

      // Mock ProfileService.fetchProfileByEmail trả về dữ liệu Supabase Cloud
      vi.spyOn(ProfileService, 'fetchProfileByEmail').mockResolvedValue({
        id: 'usr_cloud_123',
        email,
        full_name: 'Cloud Student',
        avatar_url: cloudAvatarUrl,
        custom_avatar_url: cloudAvatarUrl,
        has_custom_avatar: true,
        role: 'user',
        plan: 'pro_beta',
        ai_credits_balance: 50
      } as CloudProfile);

      // Đăng nhập tại tab ẩn danh (localStorage hoàn toàn rỗng)
      const user = await authService.login(email, 'somePass123');

      expect(user.id).toBe('usr_cloud_123');
      expect(user.avatarUrl).toBe(cloudAvatarUrl);
      expect(user.customAvatarUrl).toBe(cloudAvatarUrl);
      expect(user.hasCustomAvatar).toBe(true);
    });
  });
});
