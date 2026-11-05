import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { authService } from '../../src/services/authService';
import { ProfileService } from '../../src/services/profileService';
import { useAiStore } from '../../src/stores/useAiStore';

describe('Unified Auth, Single Identity & Avatar Resilience Specification', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.getState().logout();
  });

  it('1. Google Login Callback: syncUserFromSupabase thiết lập isAuthenticated = true và isLoggedIn = true', () => {
    const mockGoogleUser = {
      id: 'google_uuid_123',
      email: 'namho03052k9@gmail.com',
      user_metadata: {
        full_name: 'Hồ Ngọc Bảo Nam',
        avatar_url: 'https://lh3.googleusercontent.com/default-avatar'
      }
    };

    useAuthStore.getState().syncUserFromSupabase(mockGoogleUser);

    const auth = useAuthStore.getState();
    expect(auth.isAuthenticated).toBe(true);
    expect(auth.isLoggedIn).toBe(true);
    expect(auth.user?.email).toBe('namho03052k9@gmail.com');
    expect(auth.isLifetime).toBe(true);
    expect(auth.isOwner).toBe(true);

    // AI Credits nạp đầy đủ
    expect(useAiStore.getState().aiCreditsBalance).toBe(1000);
  });

  it('2. Đồng nhất tài khoản (Single Source of Truth): Cùng email đăng nhập bằng Google và Email hợp nhất chung 1 User ID', async () => {
    const testEmail = 'student.unified@gmail.com';
    const testPass = 'secure_password_123';

    // Bước 1: Người dùng đăng ký / đăng nhập lần đầu bằng Mật khẩu
    const emailUser = await authService.login(testEmail, testPass);
    expect(emailUser.email).toBe(testEmail);
    const canonicalId = emailUser.id;

    // Bước 2: Người dùng đăng nhập bằng Google với cùng địa chỉ Email
    const googleUser = await authService.loginWithGoogle({
      email: testEmail,
      name: 'Student Unified (Google)',
      sub: 'google_sub_999',
      picture: 'https://lh3.googleusercontent.com/google_photo.jpg',
      email_verified: true
    });

    // Cùng chung 1 tài khoản và cùng chung canonicalId
    expect(googleUser.email).toBe(testEmail);
    expect(googleUser.id).toBe(canonicalId);
    expect(googleUser.googleId).toBe('google_sub_999');
    expect(googleUser.isGoogleLinked).toBe(true);
    expect(googleUser.hasPassword).toBe(true);

    // Bước 3: Đăng nhập lại bằng Email/Password giữ nguyên liên kết Google và canonicalId
    const emailLoginAgain = await authService.login(testEmail, testPass);
    expect(emailLoginAgain.id).toBe(canonicalId);
    expect(emailLoginAgain.googleId).toBe('google_sub_999');
    expect(emailLoginAgain.isGoogleLinked).toBe(true);
  });

  it('3. Đăng nhập bằng Email nhận diện chính xác trạng thái liên kết Google (ĐÃ KẾT NỐI)', async () => {
    const email = 'namho03052k9@gmail.com';
    const user = await authService.login(email, 'test_pass');

    // Founder hoặc tài khoản đã liên kết Google được đánh dấu isGoogleLinked = true
    expect(user.isGoogleLinked).toBe(true);

    const isGoogleConnected = Boolean(
      user.googleId ||
      user.authProvider === 'google' ||
      user.isGoogleLinked ||
      email === 'namho03052k9@gmail.com'
    );
    expect(isGoogleConnected).toBe(true);
  });

  it('4. Quy tắc bất biến Avatar: Up ảnh đại diện tùy chỉnh không bao giờ bị Google Login ghi đè', async () => {
    const testEmail = 'artist@pomofocus.io';
    const customAvatar = 'data:image/jpeg;base64,CUSTOM_ARTWORK_AVATAR_DATA';

    // Bước 1: Người dùng đăng ký và đổi avatar tùy chỉnh
    await useAuthStore.getState().signup(testEmail, 'pass123456', 'Artist');
    const user = useAuthStore.getState().user!;
    await useAuthStore.getState().updateProfile({
      avatarUrl: customAvatar,
      customAvatarUrl: customAvatar,
      hasCustomAvatar: true
    });

    const stateBefore = useAuthStore.getState();
    expect(stateBefore.user?.avatarUrl).toBe(customAvatar);
    expect(stateBefore.user?.hasCustomAvatar).toBe(true);

    // Bước 2: Đăng nhập qua Google (trả về ảnh Google mặc định)
    useAuthStore.getState().syncUserFromSupabase({
      id: user.id,
      email: testEmail,
      user_metadata: {
        full_name: 'Artist Google',
        avatar_url: 'https://lh3.googleusercontent.com/default-google-icon.png'
      }
    });

    const stateAfter = useAuthStore.getState();
    // Avatar tùy chỉnh vẫn được bảo vệ nguyên vẹn 100%, không bị ảnh Google đè lên
    expect(stateAfter.user?.avatarUrl).toBe(customAvatar);
    expect(stateAfter.user?.customAvatarUrl).toBe(customAvatar);
    expect(stateAfter.user?.hasCustomAvatar).toBe(true);
    expect(stateAfter.isAuthenticated).toBe(true);
    expect(stateAfter.isLoggedIn).toBe(true);
  });
});
