import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useAiStore } from '../../src/stores/useAiStore';
import { supabase } from '../../src/lib/supabase';

describe('Supabase OAuth State Change & syncUserFromSupabase Unit Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.getState().logout();
  });

  it('1. syncUserFromSupabase với tài khoản Founder (namho03052k9@gmail.com) kích hoạt đầy đủ đặc quyền', () => {
    const mockSupabaseUser = {
      id: 'usr_founder_123',
      email: 'namho03052k9@gmail.com',
      user_metadata: {
        full_name: 'Hồ Ngọc Bảo Nam (Founder)',
        avatar_url: 'https://example.com/avatar.jpg'
      }
    };

    useAuthStore.getState().syncUserFromSupabase(mockSupabaseUser);

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.isLoggedIn).toBe(true);
    expect(state.user?.email).toBe('namho03052k9@gmail.com');
    expect(state.user?.displayName).toBe('Hồ Ngọc Bảo Nam (Founder)');
    expect(state.user?.role).toBe('founder');
    expect(state.user?.plan).toBe('lifetime');
    expect(state.user?.badge).toBe('Founder VIP 👑');
    expect(state.isLifetime).toBe(true);
    expect(state.isPro).toBe(true);

    // Kiểm tra ví AI Credits được nạp đầy 1.000 điểm
    const aiState = useAiStore.getState();
    expect(aiState.aiCreditsBalance).toBe(1000);
    expect(aiState.aiPlan).toBe('lifetime');
  });

  it('2. syncUserFromSupabase với tài khoản học viên thông thường cấp gói Free và 50 credits', () => {
    const mockSupabaseUser = {
      id: 'usr_student_456',
      email: 'student.regular@school.edu.vn',
      user_metadata: {
        full_name: 'Nguyễn Văn A'
      }
    };

    useAuthStore.getState().syncUserFromSupabase(mockSupabaseUser);

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.isLoggedIn).toBe(true);
    expect(state.user?.email).toBe('student.regular@school.edu.vn');
    expect(state.user?.role).toBe('user');
    expect(state.user?.plan).toBe('free');
    expect(state.isLifetime).toBe(false);

    // Kiểm tra ví AI Credits của gói Free là 50 điểm
    const aiState = useAiStore.getState();
    expect(aiState.aiCreditsBalance).toBe(50);
    expect(aiState.aiPlan).toBe('free');
  });

  it('3. supabase.auth.onAuthStateChange đăng ký và phát hiện sự kiện chuyển đổi trạng thái', async () => {
    let capturedEvent = '';
    let capturedSession: any = null;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      capturedEvent = event;
      capturedSession = session;
    });

    expect(typeof subscription.unsubscribe).toBe('function');

    // Giả lập lưu session và gọi getSession
    localStorage.setItem(
      'pomodoro_study_auth_session',
      JSON.stringify({
        id: 'usr_stored_789',
        email: 'namho03052k9@gmail.com',
        displayName: 'Nam Founder'
      })
    );

    const { data } = await supabase.auth.getSession();
    expect(data.session).not.toBeNull();
    expect(data.session?.user?.email).toBe('namho03052k9@gmail.com');

    subscription.unsubscribe();
  });

  it('4. useAuthStore.logout() xóa sạch phiên làm việc và reset isLoggedIn = false', () => {
    useAuthStore.getState().syncUserFromSupabase({
      id: 'usr_temp',
      email: 'test@gmail.com',
      user_metadata: { full_name: 'Test' }
    });
    expect(useAuthStore.getState().isLoggedIn).toBe(true);

    useAuthStore.getState().logout();
    const state = useAuthStore.getState();
    expect(state.isLoggedIn).toBe(false);
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
  });
});
