import { describe, it, expect, beforeEach } from 'vitest';
import { authService, OWNER_EMAIL } from '../../src/services/authService';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useAiStore } from '../../src/stores/useAiStore';
import { SUPABASE_URL } from '../../src/config/env';

describe('Login Options & Founder VIP 1-Tap Unit Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isPro: false,
      isLifetime: false,
      isOwner: false,
      isLadyBoss: false,
      planLabel: 'FREE',
    });
    useAiStore.setState({
      aiCreditsBalance: 50,
      aiPlan: 'free',
    });
  });

  it('1. SUPABASE_URL trỏ chính xác về project https://tmvbulkxhlgdivrvmobo.supabase.co', () => {
    expect(SUPABASE_URL).toBe('https://tmvbulkxhlgdivrvmobo.supabase.co');
  });

  it('2. authService.loginAsFounder kích hoạt session Founder VIP chính chủ và nạp 1.000⚡ AI Credits', async () => {
    const profile = await authService.loginAsFounder();

    expect(profile.email).toBe(OWNER_EMAIL);
    expect(profile.email).toBe('namho03052k9@gmail.com');
    expect(profile.plan).toBe('pro_lifetime');
    expect(profile.isLifetime).toBe(true);

    // Kiểm tra lưu trữ session
    const stored = JSON.parse(localStorage.getItem('pomodoro_study_auth_session') || '{}');
    expect(stored.email).toBe('namho03052k9@gmail.com');
    expect(stored.plan).toBe('pro_lifetime');

    // Kiểm tra AI Credits được nạp sẵn 1.000⚡
    const aiState = useAiStore.getState();
    expect(aiState.aiPlan).toBe('lifetime');
    expect(aiState.aiCreditsBalance).toBeGreaterThanOrEqual(1000);
  });

  it('3. useAuthStore.loginAsFounder cập nhật toàn bộ cờ đặc quyền chính chủ (isOwner, isLifetime, isPro)', async () => {
    const ok = await useAuthStore.getState().loginAsFounder();
    expect(ok).toBe(true);

    const authState = useAuthStore.getState();
    expect(authState.isAuthenticated).toBe(true);
    expect(authState.isOwner).toBe(true);
    expect(authState.isPro).toBe(true);
    expect(authState.isLifetime).toBe(true);
    expect(authState.user?.email).toBe('namho03052k9@gmail.com');
    expect(authState.planLabel).toBe('PRO TRỌN ĐỜI');
  });

  it('4. authService.signInWithOAuth tạo callback và URL redirect động', async () => {
    const originalLocation = window.location;
    delete (window as any).location;
    window.location = {
      origin: 'https://pomofocus-workspace.vercel.app',
      href: 'https://pomofocus-workspace.vercel.app/login'
    } as any;

    const res = await authService.signInWithOAuth('google');
    expect(res.data?.url).toContain('https://tmvbulkxhlgdivrvmobo.supabase.co/auth/v1/authorize?provider=google');
    expect(res.data?.url).toContain(encodeURIComponent('https://pomofocus-workspace.vercel.app/app'));

    window.location = originalLocation;
  });
});
