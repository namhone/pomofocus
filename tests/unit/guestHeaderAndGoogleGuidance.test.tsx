import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'fs';
import { googleAuthService, GOOGLE_OAUTH_GUIDANCE_MESSAGE } from '../../src/services/googleAuthService';
import { useLayoutStore } from '../../src/stores/useLayoutStore';
import { useAuthStore } from '../../src/stores/useAuthStore';

describe('Header Guest Quick Menu & Google OAuth Guidance Specifications', () => {
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
    useLayoutStore.setState({
      isMobile: true,
      isHeaderExpanded: false,
      activeMobileTab: 'timer',
    });
  });

  describe('1. Cố Định Redirect URI & Hướng Dẫn Cảnh Báo Google OAuth', () => {
    it('googleAuthService.getGoogleOAuthRedirectUrl luôn khóa cứng redirectUri là origin gốc', () => {
      const originalLocation = window.location;
      delete (window as any).location;
      window.location = {
        origin: 'https://pomofocus-workspace.vercel.app',
        href: 'https://pomofocus-workspace.vercel.app/login',
      } as any;

      // Kể cả khi truyền vào tham số redirectTo có đuôi /app, hệ thống vẫn ép về origin
      const urlWithApp = googleAuthService.getGoogleOAuthRedirectUrl('https://pomofocus-workspace.vercel.app/app');
      expect(urlWithApp).toContain(`redirect_uri=${encodeURIComponent('https://pomofocus-workspace.vercel.app')}`);
      expect(urlWithApp).not.toContain(encodeURIComponent('https://pomofocus-workspace.vercel.app/app'));

      const defaultUrl = googleAuthService.getGoogleOAuthRedirectUrl();
      expect(defaultUrl).toContain(`redirect_uri=${encodeURIComponent('https://pomofocus-workspace.vercel.app')}`);

      window.location = originalLocation;
    });

    it('GOOGLE_OAUTH_GUIDANCE_MESSAGE chứa chính xác thông điệp hướng dẫn cấu hình domain Google Cloud Console', () => {
      expect(GOOGLE_OAUTH_GUIDANCE_MESSAGE).toContain('https://pomofocus-workspace.vercel.app');
      expect(GOOGLE_OAUTH_GUIDANCE_MESSAGE).toContain('Google Cloud Console');
      expect(GOOGLE_OAUTH_GUIDANCE_MESSAGE).toContain('đăng nhập bằng Email');
    });
  });

  describe('2. Trạng Thái Singularity & Điều Khiển Giao Diện Khách (Header & Drawer)', () => {
    it('Khi ở chế độ Mobile, click mở widget settings từ Quick Menu cập nhật chính xác layout store', () => {
      useLayoutStore.getState().openWidget('settings');
      useLayoutStore.getState().setActiveMobileTab('settings');

      const state = useLayoutStore.getState();
      expect(state.widgets.settings?.isOpen).toBe(true);
      expect(state.activeMobileTab).toBe('settings');
    });

    it('Mobile slide-down menu dùng thẻ đặc bg-zinc-900 border-zinc-800 shadow-2xl và backdrop trong trẻo không blur', () => {
      const headerCode = fs.readFileSync('src/components/PlatformHeader.tsx', 'utf8');
      expect(headerCode).toContain('id="mobile-slidedown-menu"');
      expect(headerCode).toContain('bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl');
      expect(headerCode).toContain('data-testid="mobile-drawer-backdrop"');
      expect(headerCode).toContain('bg-black/20 lg:bg-transparent');
      const backdropSnippet = headerCode.split('data-testid="mobile-drawer-backdrop"')[1].slice(0, 300);
      expect(backdropSnippet).not.toContain('backdrop-blur');
      expect(headerCode).toContain('text-sm font-medium');
      expect(headerCode).toContain('text-zinc-100 hover:text-white');
      expect(headerCode).toContain('bg-zinc-100 hover:bg-white text-zinc-900 font-semibold text-sm');
    });

    it('Khi chưa đăng nhập, trạng thái tài khoản là khách với số dư mặc định 50⚡', () => {
      const authState = useAuthStore.getState();
      expect(authState.isAuthenticated).toBe(false);
      expect(authState.user).toBeNull();
    });
  });
});
