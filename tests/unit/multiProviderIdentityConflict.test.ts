import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { authService } from '../../src/services/authService';
import { ProfileService, localProfileCache } from '../../src/services/profileService';
import { useAiStore } from '../../src/stores/useAiStore';
import { useTaskStore } from '../../src/stores/useTaskStore';
import { useNoteStore } from '../../src/stores/useNoteStore';
import { db } from '../../src/db';

describe('Multi-Provider Identity Conflict & Canonical ID Specification', () => {
  beforeEach(async () => {
    localStorage.clear();
    localProfileCache.clear();
    useAuthStore.getState().logout();
    await db.tasks.clear();
    await db.projects.clear();
    await db.notes.clear();
  });

  it('1. Root Cause Scenario: Cùng Email đăng ký Email/Pass trước, sau đó đăng nhập Google OAuth phải bảo toàn Canonical ID', async () => {
    const testEmail = 'founder.test@pomofocus.io';
    const testPassword = 'Password123!';

    // BƯỚC 1: Người dùng đăng ký bằng Email & Mật khẩu
    const emailUser = await authService.signup(testEmail, testPassword, 'Founder Test');
    expect(emailUser.email).toBe(testEmail);
    const canonicalId = emailUser.id;
    expect(canonicalId).toBeDefined();

    // Giả lập người dùng tạo 1 Task và 1 Note dưới tài khoản Email này
    await useTaskStore.getState().createTask({ title: 'Nhiệm vụ kiến trúc quan trọng' });
    await useNoteStore.getState().createNote('Ghi chú bí mật dự án', null);

    const tasksAfterEmail = useTaskStore.getState().tasks;
    expect(tasksAfterEmail.length).toBeGreaterThan(0);

    // BƯỚC 2: Người dùng đăng nhập bằng Google OAuth với cùng Email đó (Google sinh ra sub/UUID_B khác)
    const googleSubId = 'google_oauth_sub_987654321';
    const googlePayload = {
      sub: googleSubId,
      email: testEmail,
      name: 'Founder Test (Google Auth)',
      picture: 'https://lh3.googleusercontent.com/avatar_google.png',
      email_verified: true
    };

    const googleUser = await authService.loginWithGoogle(googlePayload);

    // KIỂM TRA BẤT BIẾN CANONICAL ID:
    // User ID phải giữ nguyên là canonicalId (từ tài khoản Email gốc)
    expect(googleUser.id).toBe(canonicalId);
    expect(googleUser.email).toBe(testEmail);

    // Phải ghi nhận liên kết Google thành công
    expect(googleUser.isGoogleLinked).toBe(true);
    expect(googleUser.googleId).toBe(googleSubId);

    // Mật khẩu vẫn được bảo toàn
    expect(googleUser.hasPassword).toBe(true);

    // Kiểm tra tasks không bị mất
    const currentTasks = useTaskStore.getState().tasks;
    expect(currentTasks.length).toBeGreaterThan(0);
  });

  it('2. Founder VIP Whitelist: Đăng nhập Google với Founder không bao giờ bị reset về 50⚡ hay mất quyền Founder', async () => {
    const ownerEmail = 'namho03052k9@gmail.com';
    const googleSubId = 'google_owner_uuid_001';

    // Đăng nhập Google qua syncUserFromSupabase (mô phỏng redirect từ Supabase Auth)
    const mockSupabaseGoogleUser = {
      id: googleSubId,
      email: ownerEmail,
      user_metadata: {
        full_name: 'Hồ Ngọc Bảo Nam',
        avatar_url: 'https://lh3.googleusercontent.com/google_photo.jpg'
      }
    };

    useAuthStore.getState().syncUserFromSupabase(mockSupabaseGoogleUser);

    const auth = useAuthStore.getState();
    expect(auth.isAuthenticated).toBe(true);
    expect(auth.isLoggedIn).toBe(true);
    expect(auth.user?.email).toBe(ownerEmail);
    expect(auth.isOwner).toBe(true);
    expect(auth.role).toBe('founder');
    expect(auth.badge).toBe('Founder VIP 👑');
    expect(auth.isLifetime).toBe(true);

    // Ví AI Credits phải là 1.000⚡ (hoặc Infinity), TUYỆT ĐỐI không bị reset về 50⚡
    const aiBalance = useAiStore.getState().aiCreditsBalance;
    expect(aiBalance).toBe(1000);
    expect(useAiStore.getState().aiPlan).toBe('lifetime');
  });

  it('3. ProfileService.ensureProfileForUser: Tự động ghép nối Canonical ID khi gặp Google ID mới', async () => {
    const email = 'student.linking@study.io';
    const originalEmailUserId = 'usr_original_email_111';
    const incomingGoogleId = 'usr_google_sub_222';

    // Đã có sẵn profile trên Cloud từ Email signup
    await ProfileService.upsertProfile({
      id: originalEmailUserId,
      email: email,
      full_name: 'Original Student',
      role: 'user',
      plan: 'pro',
      ai_credits_balance: 500
    });

    // Khi Google Login đến với incomingGoogleId khác:
    const linkedProfile = await ProfileService.ensureProfileForUser({
      id: incomingGoogleId,
      email: email,
      displayName: 'Google Student',
      googleId: incomingGoogleId,
      isGoogleLinked: true
    });

    // Profile trả về phải có Canonical ID là originalEmailUserId
    expect(linkedProfile.id).toBe(originalEmailUserId);
    expect(linkedProfile.email).toBe(email);
    expect(linkedProfile.is_google_linked).toBe(true);
    expect(linkedProfile.google_id).toBe(incomingGoogleId);
    // Điểm tín dụng không bị reset về 50
    expect(linkedProfile.ai_credits_balance).toBe(500);
  });
});
