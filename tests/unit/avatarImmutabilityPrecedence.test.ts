import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { authService, isCustomAvatarUrl, getEffectiveAvatarUrl } from '../../src/services/authService';
import { ProfileService, localProfileCache } from '../../src/services/profileService';

describe('Avatar Immutability & Precedence Specification (Bảo vệ Avatar Tùy Chỉnh Tuyệt Đối)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localProfileCache.clear();
    useAuthStore.getState().logout();
  });

  describe('1. Nhận diện Avatar Tùy Chỉnh (isCustomAvatarUrl)', () => {
    it('nhận diện chính xác URL Supabase Storage bucket avatars là Custom Avatar', () => {
      const storageUrl1 = 'https://xyzcompany.supabase.co/storage/v1/object/public/avatars/usr_123_custom.jpg';
      const storageUrl2 = 'https://pomofocus.supabase.co/storage/v1/object/public/avatars/user-avatar-2026.webp';
      expect(isCustomAvatarUrl(storageUrl1)).toBe(true);
      expect(isCustomAvatarUrl(storageUrl2)).toBe(true);
    });

    it('nhận diện Base64 Data URI (raster image) là Custom Avatar', () => {
      const dataUriJpeg = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD...';
      const dataUriPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...';
      expect(isCustomAvatarUrl(dataUriJpeg)).toBe(true);
      expect(isCustomAvatarUrl(dataUriPng)).toBe(true);
    });

    it('loại trừ ảnh Google OAuth, SVG Initials và ảnh Unsplash mặc định khỏi Custom Avatar', () => {
      const googlePhoto = 'https://lh3.googleusercontent.com/a/ACg8ocK-test=s96-c';
      const svgInitials = 'data:image/svg+xml;utf8,<svg>Initials</svg>';
      const unsplashStock = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb';

      expect(isCustomAvatarUrl(googlePhoto)).toBe(false);
      expect(isCustomAvatarUrl(svgInitials)).toBe(false);
      expect(isCustomAvatarUrl(unsplashStock)).toBe(false);
    });
  });

  describe('2. Thứ tự ưu tiên 3 Tầng Bất Biến (getEffectiveAvatarUrl)', () => {
    it('Tầng 1 (Custom Avatar) luôn thắng Google OAuth và SVG Initials', () => {
      const customStorageUrl = 'https://supabase.co/storage/v1/object/public/avatars/usr_art.jpg';
      const googlePhoto = 'https://lh3.googleusercontent.com/photo-google';

      const user = {
        displayName: 'Nam Hồ',
        user_metadata: {
          picture: googlePhoto
        }
      };

      const profile = {
        custom_avatar_url: customStorageUrl,
        has_custom_avatar: true,
        avatar_url: customStorageUrl
      };

      // Ngay cả khi user có picture từ Google OAuth, hàm vẫn bắt buộc trả về Custom Avatar
      const effective = getEffectiveAvatarUrl(user, profile);
      expect(effective).toBe(customStorageUrl);
    });

    it('Tầng 2 (Google OAuth) được chọn khi KHÔNG CÓ bất kỳ Custom Avatar nào', () => {
      const googlePhoto = 'https://lh3.googleusercontent.com/photo-google';
      const user = {
        displayName: 'Học Viên Mới',
        user_metadata: {
          picture: googlePhoto
        }
      };
      const profile = {
        avatar_url: null,
        custom_avatar_url: null,
        has_custom_avatar: false
      };

      const effective = getEffectiveAvatarUrl(user, profile);
      expect(effective).toBe(googlePhoto);
    });

    it('Tầng 3 (SVG Initials) là fallback an toàn cuối cùng khi không có cả hai', () => {
      const user = {
        displayName: 'Trần Huyền Trang',
        user_metadata: {}
      };
      const profile = {
        avatar_url: null,
        custom_avatar_url: null,
        has_custom_avatar: false
      };

      const effective = getEffectiveAvatarUrl(user, profile);
      expect(effective.startsWith('data:image/svg+xml')).toBe(true);
      expect(decodeURIComponent(effective)).toContain('TT');
    });
  });

  describe('3. Kịch bản lỗi thực tế: Up Custom Avatar -> Đăng Xuất (Logout) -> Đăng Nhập Google -> Bảo Toàn 100%', () => {
    it('bảo toàn vĩnh viễn Custom Avatar sau khi Logout và đăng nhập lại bằng Google', async () => {
      const testEmail = 'namho03052k9@gmail.com';
      const customAvatar = 'https://supabase.co/storage/v1/object/public/avatars/usr_namho_custom.webp';
      const googleAvatar = 'https://lh3.googleusercontent.com/a/google_original_photo=s96-c';

      // Bước 1: Người dùng đăng nhập bằng Email/Password
      await useAuthStore.getState().login(testEmail, 'password123');
      const currentUser = useAuthStore.getState().user!;
      expect(currentUser).toBeDefined();

      // Bước 2: Người dùng đổi ảnh đại diện Custom (lưu lên Supabase profiles)
      await useAuthStore.getState().updateProfile({
        avatarUrl: customAvatar,
        customAvatarUrl: customAvatar,
        hasCustomAvatar: true
      });

      const userAfterUpdate = useAuthStore.getState().user!;
      expect(userAfterUpdate.avatarUrl).toBe(customAvatar);
      expect(userAfterUpdate.hasCustomAvatar).toBe(true);

      // Bước 3: Người dùng bấm Đăng Xuất (Logout)
      useAuthStore.getState().logout();
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);

      // Bước 4: Người dùng đăng nhập lại bằng Google OAuth (Supabase redirect hoặc loginWithGoogle)
      // Giả lập callback Supabase Auth trả về thông tin Google OAuth chứa user_metadata.picture
      useAuthStore.getState().syncUserFromSupabase({
        id: currentUser.id,
        email: testEmail,
        user_metadata: {
          full_name: 'Nam Hồ Google',
          picture: googleAvatar,
          avatar_url: googleAvatar
        }
      });

      // Bước 5: Kiểm tra trạng thái Store ngay sau khi đăng nhập Google
      const sessionAfterGoogle = useAuthStore.getState().user!;
      expect(sessionAfterGoogle).toBeDefined();
      expect(sessionAfterGoogle.isAuthenticated || useAuthStore.getState().isAuthenticated).toBe(true);

      // QUY TẮC BẤT KHẢ XÂM PHẠM: Custom Avatar KHÔNG ĐƯỢC PHÉP bị ảnh Google ghi đè!
      expect(sessionAfterGoogle.avatarUrl).toBe(customAvatar);
      expect(sessionAfterGoogle.customAvatarUrl).toBe(customAvatar);
      expect(sessionAfterGoogle.hasCustomAvatar).toBe(true);
    });

    it('ProfileService.ensureProfileForUser không bao giờ ghi đè Custom Avatar khi người dùng liên kết Google', async () => {
      const testEmail = 'student@studyworkspace.io';
      const customStorageUrl = 'https://xyz.supabase.co/storage/v1/object/public/avatars/student_custom.png';
      const googlePhoto = 'https://lh3.googleusercontent.com/student-photo';

      // Khởi tạo profile sẵn trên Cloud với custom avatar
      localProfileCache.set(testEmail, {
        id: 'usr_student_123',
        email: testEmail,
        full_name: 'Học Viên',
        avatar_url: customStorageUrl,
        custom_avatar_url: customStorageUrl,
        has_custom_avatar: true,
        role: 'user',
        plan: 'free',
        ai_credits_balance: 50,
        is_google_linked: false
      } as any);

      // Gọi ensureProfileForUser với thông tin Google OAuth (chứa googlePhoto)
      const ensured = await ProfileService.ensureProfileForUser({
        id: 'usr_student_123',
        email: testEmail,
        displayName: 'Học Viên Google',
        avatarUrl: googlePhoto,
        googleId: 'google_sub_999',
        isGoogleLinked: true
      });

      // Kết quả phải giữ nguyên Custom Avatar
      expect(ensured.avatar_url).toBe(customStorageUrl);
      expect(ensured.custom_avatar_url).toBe(customStorageUrl);
      expect(ensured.has_custom_avatar).toBe(true);
      expect(ensured.is_google_linked).toBe(true);
      expect(ensured.google_id).toBe('google_sub_999');
    });

    it('người dùng mới đăng nhập Google lần đầu (chưa có custom avatar) thì nhận ảnh Google bình thường', async () => {
      const newGoogleEmail = 'newbie@studyworkspace.io';
      const googlePhoto = 'https://lh3.googleusercontent.com/newbie-photo=s96-c';

      useAuthStore.getState().syncUserFromSupabase({
        id: 'usr_google_newbie_1',
        email: newGoogleEmail,
        user_metadata: {
          full_name: 'Newbie Google',
          picture: googlePhoto
        }
      });

      const user = useAuthStore.getState().user!;
      expect(user.avatarUrl).toBe(googlePhoto);
      expect(user.hasCustomAvatar).toBe(false);
    });
  });
});
