import { describe, it, expect, beforeEach, vi } from 'vitest';
import { supabase } from '../../src/lib/supabase';
import { usePwaInstallStore, BeforeInstallPromptEvent } from '../../src/stores/usePwaInstallStore';
import { useAuthStore } from '../../src/stores/useAuthStore';

describe('Google OAuth Supabase & PWA Install Store Unit Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isPro: false,
      isLifetime: false,
      isOwner: false,
      isLadyBoss: false,
      planLabel: 'Gói Free',
    });
    usePwaInstallStore.setState({
      canInstall: false,
      isInstalled: false,
      deferredPrompt: null,
    });
  });

  describe('1. Supabase OAuth Client (Google Sign-In URL & Methods)', () => {
    it('Tạo đúng URL chuyển hướng OAuth tới Google qua Supabase', async () => {
      // Mock window.location
      const originalLocation = window.location;
      delete (window as any).location;
      window.location = {
        href: 'https://pomodoro-workspace-three.vercel.app/login',
        origin: 'https://pomodoro-workspace-three.vercel.app',
      } as any;

      const res = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'https://pomodoro-workspace-three.vercel.app/app',
        },
      });

      expect(res.data?.url).toContain('/auth/v1/authorize?provider=google');
      expect(res.data?.url).toContain(encodeURIComponent('https://pomodoro-workspace-three.vercel.app/app'));
      expect(res.error).toBeNull();

      window.location = originalLocation;
    });

    it('Xác thực methods signOut, getSession, getUser từ Supabase Auth Client', async () => {
      const sessionRes = await supabase.auth.getSession();
      expect(sessionRes.data.session).toBeNull();

      const userRes = await supabase.auth.getUser();
      expect(userRes.data.user).toBeNull();

      const signOutRes = await supabase.auth.signOut();
      expect(signOutRes.error).toBeNull();
    });
  });

  describe('2. PWA Install Store Lifecycle', () => {
    it('Khởi tạo trạng thái mặc định: canInstall=false, isInstalled=false', () => {
      const state = usePwaInstallStore.getState();
      expect(state.canInstall).toBe(false);
      expect(state.isInstalled).toBe(false);
      expect(state.deferredPrompt).toBeNull();
    });

    it('Nhận sự kiện beforeinstallprompt -> bật canInstall = true', () => {
      const mockPromptEvent = {
        preventDefault: vi.fn(),
        prompt: vi.fn().mockResolvedValue(undefined),
        userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' }),
      } as unknown as BeforeInstallPromptEvent;

      usePwaInstallStore.getState().setDeferredPrompt(mockPromptEvent);

      expect(usePwaInstallStore.getState().canInstall).toBe(true);
      expect(usePwaInstallStore.getState().deferredPrompt).toBe(mockPromptEvent);
    });

    it('Kích hoạt triggerInstall thành công khi người dùng bấm Chấp nhận', async () => {
      const mockPromptFn = vi.fn().mockResolvedValue(undefined);
      const mockPromptEvent = {
        preventDefault: vi.fn(),
        prompt: mockPromptFn,
        userChoice: Promise.resolve({ outcome: 'accepted' as const, platform: 'web' }),
      } as unknown as BeforeInstallPromptEvent;

      usePwaInstallStore.getState().setDeferredPrompt(mockPromptEvent);

      const installed = await usePwaInstallStore.getState().triggerInstall();
      expect(installed).toBe(true);
      expect(mockPromptFn).toHaveBeenCalledTimes(1);
      expect(usePwaInstallStore.getState().canInstall).toBe(false);
      expect(usePwaInstallStore.getState().isInstalled).toBe(true);
      expect(usePwaInstallStore.getState().deferredPrompt).toBeNull();
    });

    it('Không cài nếu người dùng bấm Huỷ (dismissed)', async () => {
      const mockPromptEvent = {
        preventDefault: vi.fn(),
        prompt: vi.fn().mockResolvedValue(undefined),
        userChoice: Promise.resolve({ outcome: 'dismissed' as const, platform: 'web' }),
      } as unknown as BeforeInstallPromptEvent;

      usePwaInstallStore.getState().setDeferredPrompt(mockPromptEvent);

      const installed = await usePwaInstallStore.getState().triggerInstall();
      expect(installed).toBe(false);
      expect(usePwaInstallStore.getState().isInstalled).toBe(false);
    });

    it('setInstalled(true) tắt canInstall và đánh dấu đã cài đặt', () => {
      usePwaInstallStore.getState().setInstalled(true);
      expect(usePwaInstallStore.getState().isInstalled).toBe(true);
      expect(usePwaInstallStore.getState().canInstall).toBe(false);
    });
  });

  describe('3. Google Login kết hợp VIP Email & Cloud Entitlements', () => {
    it('Đăng nhập Google với Owner (namho03052k9@gmail.com) tự động kích hoạt Lifetime & Owner', async () => {
      const success = await useAuthStore.getState().loginWithGoogle({
        email: 'namho03052k9@gmail.com',
        name: 'Hồ Bảo Nam (Owner)',
        avatarUrl: 'https://lh3.googleusercontent.com/owner.jpg',
      });

      expect(success).toBe(true);
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.isOwner).toBe(true);
      expect(state.isLifetime).toBe(true);
      expect(state.isPro).toBe(true);
      expect(state.user?.avatarUrl).toBe('https://lh3.googleusercontent.com/owner.jpg');
    });

    it('Đăng nhập Google với Nóc Nhà (huyentrantt09@gmail.com) tự động kích hoạt Lifetime & LadyBoss', async () => {
      const success = await useAuthStore.getState().loginWithGoogle({
        email: 'huyentrantt09@gmail.com',
        name: 'Huyền Trần',
        avatarUrl: 'https://lh3.googleusercontent.com/huyen.jpg',
      });

      expect(success).toBe(true);
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLadyBoss).toBe(true);
      expect(state.isLifetime).toBe(true);
      expect(state.isPro).toBe(true);
      expect(state.user?.avatarUrl).toBe('https://lh3.googleusercontent.com/huyen.jpg');
    });

    it('syncEntitlementsFromCloud cập nhật PRO khi Supabase trả về quyền hợp lệ', async () => {
      // Mock global fetch cho Supabase PostgREST query
      const futureTimestamp = Date.now() + 30 * 86400000;
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('/rest/v1/user_entitlements')) {
          return {
            ok: true,
            json: async () => [{ is_pro: true, pro_expires_at: futureTimestamp }],
          };
        }
        return { ok: false };
      });

      // Login với user thường
      await useAuthStore.getState().loginWithGoogle({
        email: 'student_pro@gmail.com',
        name: 'Student Pro',
      });

      // Gọi syncEntitlementsFromCloud
      await useAuthStore.getState().syncEntitlementsFromCloud();

      const state = useAuthStore.getState();
      expect(state.isPro).toBe(true);
    });
  });
});
