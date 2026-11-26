const nativeSignIn = vi.hoisted(() => vi.fn());
vi.mock('../../src/services/nativeGoogleAuth', () => ({ signInNativeGoogle: nativeSignIn }));
beforeEach(() => nativeSignIn.mockReset().mockResolvedValue(undefined));
import 'fake-indexeddb/auto';
import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { googleAuthService } from '../../src/services/googleAuthService';
import { MobileAuthBottomSheet } from '../../src/components/mobile/auth/MobileAuthBottomSheet';
import { ProfileView } from '../../src/components/ProfileView';
import { PlatformHeader } from '../../src/components/PlatformHeader';
import {
  getSubscriptionBadge,
  formatUserCredits,
  isOwnerEmail,
  hasVipAccess,
  OWNER_EMAILS,
} from '../../src/utils/userBadge';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useAiStore } from '../../src/stores/useAiStore';
import { supabase } from '../../src/lib/supabase';

// Mock router for views
const mockNavigate = vi.fn();
vi.mock('../../src/services/router', () => ({
  useRouter: () => ({
    currentRoute: { pathname: '/app', path: '/app', query: {} },
    navigate: mockNavigate,
  }),
}));

describe('Milestone M3: Real Google OAuth on APK & User Identity Sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (window as any).Capacitor;
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoggedIn: false,
      isPro: false,
      isLifetime: false,
      isOwner: false,
      planLabel: 'Free',
      effectiveBadge: 'Free',
    });
    useAiStore.setState({
      aiCreditsBalance: 50,
      isAiCompanionOpen: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (window as any).Capacitor;
  });

  // =========================================================================
  // 1. Task 1: Real Native Google OAuth via Supabase & @capacitor/browser (BUG-15)
  // =========================================================================
  describe('1. Real Native Google OAuth via Supabase & @capacitor/browser (BUG-15)', () => {
    it('1.1 isNativePlatform accurately reflects Capacitor environment', () => {
      expect(googleAuthService.isNativePlatform()).toBe(false);

      (window as any).Capacitor = {
        isNativePlatform: () => true,
      };
      expect(googleAuthService.isNativePlatform()).toBe(true);
    });

    it('1.2 native picker succeeds without opening a Browser or Web OAuth', async () => {
      const browser = vi.spyOn(window, 'open');
      const oauth = vi.spyOn(supabase.auth, 'signInWithOAuth');
      await googleAuthService.loginWithGoogleNative();
      expect(nativeSignIn).toHaveBeenCalledWith(googleAuthService.getClientId());
      expect(browser).not.toHaveBeenCalled(); expect(oauth).not.toHaveBeenCalled();
    });

    it('1.3 closeNativeBrowser calls Capacitor Browser.close()', async () => {
      const mockBrowserClose = vi.fn().mockResolvedValue(undefined);
      (window as any).Capacitor = {
        Plugins: {
          Browser: {
            open: vi.fn(),
            close: mockBrowserClose,
          },
        },
      };

      await googleAuthService.closeNativeBrowser();
      expect(mockBrowserClose).toHaveBeenCalledTimes(1);
    });

    it('1.4 native picker or token verification failure propagates without creating an account', async () => {
      nativeSignIn.mockRejectedValueOnce(new Error('Native sign-in rejected'));
      await expect(googleAuthService.loginWithGoogleNative()).rejects.toThrow('Native sign-in rejected');
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('1.5 Hardcoded mock accounts (nam.studyworkspace@gmail.com, g_usr_...) are strictly purged', async () => {
      // Calling simulateGoogleLogin with no mock credentials must throw an error, NOT return hardcoded user
      await expect(googleAuthService.simulateGoogleLogin()).rejects.toThrow(
        /Mock Google credentials have been purged/
      );
    });
  });

  // =========================================================================
  // 2. MobileAuthBottomSheet Native Google OAuth Trigger (BUG-15)
  // =========================================================================
  describe('2. MobileAuthBottomSheet Native Google OAuth Trigger (BUG-15)', () => {
    it('2.1 Triggers loginWithGoogleNative when on native Capacitor platform', async () => {
      (window as any).Capacitor = {
        isNativePlatform: () => true,
      };

      const nativeLoginSpy = vi
        .spyOn(googleAuthService, 'loginWithGoogleNative')
        .mockResolvedValueOnce({ url: 'pomofocus://oauth/callback' });

      render(<MobileAuthBottomSheet isOpen={true} onClose={() => {}} />);
      const googleBtn = screen.getByTestId('mobile-auth-google-btn');

      await act(async () => {
        fireEvent.click(googleBtn);
      });

      expect(nativeLoginSpy).toHaveBeenCalledTimes(1);
      const feedback = await screen.findByTestId('mobile-auth-feedback');
      expect(feedback.textContent).toContain('Đang mở trình duyệt xác thực Google');
    });

    it('2.2 Displays clean error feedback banner if native OAuth fails, without crashing', async () => {
      (window as any).Capacitor = {
        isNativePlatform: () => true,
      };

      vi.spyOn(googleAuthService, 'loginWithGoogleNative').mockRejectedValueOnce(
        new Error('Google OAuth window was dismissed by user')
      );

      render(<MobileAuthBottomSheet isOpen={true} onClose={() => {}} />);
      const googleBtn = screen.getByTestId('mobile-auth-google-btn');

      await act(async () => {
        fireEvent.click(googleBtn);
      });

      const feedback = await screen.findByTestId('mobile-auth-feedback');
      expect(feedback.textContent).toContain('Google OAuth window was dismissed by user');
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });

  // =========================================================================
  // 3. UserAvatar Geometry & Empty Mail Suppression in ProfileView (BUG-16)
  // =========================================================================
  describe('3. UserAvatar Geometry & Empty Mail Suppression in ProfileView (BUG-16)', () => {
    it('3.1 ProfileView UserAvatar has strictly rounded-full geometry', () => {
      useAuthStore.setState({
        user: {
          id: 'usr_001',
          email: 'student@example.com',
          displayName: 'Nguyễn Văn Nam',
          role: 'authenticated',
          createdAt: Date.now(),
        } as any,
        isAuthenticated: true,
      });

      render(<ProfileView />);
      const avatarContainer = screen.getByTestId('profile-user-avatar');
      expect(avatarContainer.className).toContain('rounded-full');

      const avatarImg = screen.getByTestId('profile-user-avatar-img');
      expect(avatarImg.className).toContain('rounded-full');
    });

    it('3.2 Geometric preset avatars have rounded-full styling', () => {
      useAuthStore.setState({
        user: {
          id: 'usr_001',
          email: 'student@example.com',
          displayName: 'Nguyễn Văn Nam',
          role: 'authenticated',
          createdAt: Date.now(),
        } as any,
        isAuthenticated: true,
      });

      render(<ProfileView />);
      const editBtn = screen.getByTestId('btn-toggle-edit-profile');
      act(() => {
        fireEvent.click(editBtn);
      });

      const presetZen = screen.getByTestId('avatar-preset-zen-rings');
      const img = presetZen.querySelector('img');
      expect(img?.className).toContain('rounded-full');
    });

    it('3.3 Completely hides mail icon and email container when user email is empty or null', () => {
      useAuthStore.setState({
        user: {
          id: 'usr_no_email',
          email: '', // empty email
          displayName: 'Học Viên Ẩn Danh',
          role: 'authenticated',
          createdAt: Date.now(),
        } as any,
        isAuthenticated: true,
      });

      render(<ProfileView />);
      expect(screen.queryByTestId('profile-email-container')).toBeNull();
    });

    it('3.4 Renders mail icon and email container when valid email is provided', () => {
      useAuthStore.setState({
        user: {
          id: 'usr_with_email',
          email: 'valid.student@gmail.com',
          displayName: 'Học Viên Đã Xác Thực',
          role: 'authenticated',
          createdAt: Date.now(),
        } as any,
        isAuthenticated: true,
      });

      render(<ProfileView />);
      const emailContainer = screen.getByTestId('profile-email-container');
      expect(emailContainer).toBeDefined();
      expect(emailContainer.textContent).toContain('valid.student@gmail.com');
    });
  });

  // =========================================================================
  // 4. PlatformHeader Display Name Width & Badge Singularity (BUG-16, BUG-17)
  // =========================================================================
  describe('4. PlatformHeader Display Name Width & Badge Singularity (BUG-16, BUG-17)', () => {
    it('4.1 Display name container is widened to accommodate long Vietnamese full names', () => {
      useAuthStore.setState({
        user: {
          id: 'usr_002',
          email: 'namho03052k9@gmail.com',
          displayName: 'Nguyễn Hoàng Bảo Nam',
          role: 'founder',
        } as any,
        isAuthenticated: true,
      });

      render(<PlatformHeader />);
      const avatarBtn = screen.getByTestId('header-user-avatar-btn');
      const nameSpan = avatarBtn.querySelector('span.truncate');
      expect(nameSpan).toBeDefined();
      // Must have widened max-width class (at least 150px)
      expect(nameSpan?.className).toMatch(/max-w-\[(150|160|200)px\]/);
      expect(nameSpan?.textContent).toContain('Nguyễn Hoàng Bảo Nam');
    });

    it('4.2 PlatformHeader User Dropdown displays Founder VIP badge for founder account', () => {
      useAuthStore.setState({
        user: {
          id: 'owner_usr',
          email: 'namho03052k9@gmail.com',
          displayName: 'Hồ Ngọc Bảo Nam',
          role: 'founder',
        } as any,
        isAuthenticated: true,
      });

      render(<PlatformHeader />);
      const avatarBtn = screen.getByTestId('header-user-avatar-btn');

      act(() => {
        fireEvent.click(avatarBtn);
      });

      const badge = screen.getByTestId('header-user-badge');
      expect(badge.textContent).toBe('Founder VIP');
      expect(badge.className).toContain('text-zinc-300');
    });

    it('4.3 PlatformHeader User Dropdown displays Pro badge for pro account', () => {
      useAuthStore.setState({
        user: {
          id: 'pro_usr',
          email: 'vip.student@gmail.com',
          displayName: 'Vip Student',
          plan: 'pro',
        } as any,
        isAuthenticated: true,
      });

      render(<PlatformHeader />);
      const avatarBtn = screen.getByTestId('header-user-avatar-btn');

      act(() => {
        fireEvent.click(avatarBtn);
      });

      const badge = screen.getByTestId('header-user-badge');
      expect(badge.textContent).toBe('Pro');
      expect(badge.className).toContain('text-zinc-300');
    });

    it('4.4 PlatformHeader User Dropdown displays Free badge for free account', () => {
      useAuthStore.setState({
        user: {
          id: 'free_usr',
          email: 'free.student@gmail.com',
          displayName: 'Free Student',
          plan: 'free',
        } as any,
        isAuthenticated: true,
      });

      render(<PlatformHeader />);
      const avatarBtn = screen.getByTestId('header-user-avatar-btn');

      act(() => {
        fireEvent.click(avatarBtn);
      });

      const badge = screen.getByTestId('header-user-badge');
      expect(badge.textContent).toBe('Free');
      expect(badge.className).toContain('text-neutral-300');
    });
  });

  // =========================================================================
  // 5. Standardized Subscription Badge Utility (BUG-13, BUG-17)
  // =========================================================================
  describe('5. Standardized Subscription Badge Utility (BUG-13, BUG-17)', () => {
    it('5.1 Identifies OWNER_EMAILS whitelist correctly', () => {
      expect(OWNER_EMAILS).toContain('namho03052k9@gmail.com');
      expect(OWNER_EMAILS).toContain('huyentrantt09@gmail.com');

      expect(isOwnerEmail('namho03052k9@gmail.com')).toBe(true);
      expect(isOwnerEmail('NAMHO03052K9@GMAIL.COM ')).toBe(true);
      expect(isOwnerEmail('huyentrantt09@gmail.com')).toBe(true);
      expect(isOwnerEmail('random@gmail.com')).toBe(false);
      expect(isOwnerEmail(null)).toBe(false);
      expect(isOwnerEmail(undefined)).toBe(false);
    });

    it('5.2 Returns Founder VIP badge for founder emails and founder role', () => {
      const founder1 = getSubscriptionBadge({ email: 'namho03052k9@gmail.com' });
      expect(founder1.tier).toBe('founder');
      expect(founder1.label).toBe('Founder VIP');
      expect(founder1.icon).toBe('crown');
      expect(founder1.colorClass).toContain('text-zinc-300');

      const founder2 = getSubscriptionBadge({ email: 'huyentrantt09@gmail.com' });
      expect(founder2.tier).toBe('founder');
      expect(founder2.label).toBe('Founder VIP');

      const founder3 = getSubscriptionBadge({ role: 'founder' });
      expect(founder3.tier).toBe('founder');
      expect(founder3.label).toBe('Founder VIP');
    });

    it('5.3 Returns Pro badge for pro/lifetime plans', () => {
      const proUser = getSubscriptionBadge({ plan: 'pro' });
      expect(proUser.tier).toBe('pro');
      expect(proUser.label).toBe('Pro');
      expect(proUser.colorClass).toContain('text-zinc-300');

      const lifetimeUser = getSubscriptionBadge({ isLifetime: true });
      expect(lifetimeUser.tier).toBe('pro');
      expect(lifetimeUser.label).toBe('Pro');

      const yearlyUser = getSubscriptionBadge({ plan: 'pro_yearly' });
      expect(yearlyUser.tier).toBe('pro');
    });

    it('5.4 Returns Free badge for null or unauthenticated users', () => {
      const nullUser = getSubscriptionBadge(null);
      expect(nullUser.tier).toBe('free');
      expect(nullUser.label).toBe('Free');
      expect(nullUser.colorClass).toContain('text-zinc-400');

      const freeUser = getSubscriptionBadge({ plan: 'free' });
      expect(freeUser.tier).toBe('free');
      expect(freeUser.label).toBe('Free');
    });

    it('5.5 formatUserCredits formats infinite credits for Founder VIP and numeric for others', () => {
      const founderCredits = formatUserCredits(50, { email: 'namho03052k9@gmail.com' });
      expect(founderCredits.isUnlimited).toBe(true);
      expect(founderCredits.label).toBe('Credits ∞');
      expect(founderCredits.balance).toBe(Infinity);

      const studentCredits = formatUserCredits(42, { email: 'student@example.com' });
      expect(studentCredits.isUnlimited).toBe(false);
      expect(studentCredits.balance).toBe(42);
      expect(studentCredits.label).toContain('42 Credits');
    });
  });

  // =========================================================================
  // 6. MobileAuthBottomSheet Unified Badge Rendering (BUG-13, BUG-17)
  // =========================================================================
  describe('6. MobileAuthBottomSheet Unified Badge Rendering (BUG-13, BUG-17)', () => {
    it('6.1 Renders Founder VIP badge in MobileAuthBottomSheet for owner', () => {
      useAuthStore.setState({
        user: {
          id: 'usr_founder',
          email: 'namho03052k9@gmail.com',
          displayName: 'Bảo Nam Founder',
          role: 'founder',
        } as any,
        isAuthenticated: true,
      });

      render(<MobileAuthBottomSheet isOpen={true} onClose={() => {}} />);
      const badge = screen.getByTestId('mobile-auth-vip-badge');
      expect(badge.textContent).toContain('Founder VIP');
      expect(badge.className).toContain('text-zinc-300');
    });

    it('6.2 Renders Pro badge in MobileAuthBottomSheet for Pro user', () => {
      useAuthStore.setState({
        user: {
          id: 'usr_pro',
          email: 'pro@student.edu.vn',
          displayName: 'Pro Student',
          plan: 'pro',
        } as any,
        isAuthenticated: true,
      });

      render(<MobileAuthBottomSheet isOpen={true} onClose={() => {}} />);
      const badge = screen.getByTestId('mobile-auth-vip-badge');
      expect(badge.textContent).toContain('Pro');
      expect(badge.className).toContain('text-zinc-300');
    });
  });
});
