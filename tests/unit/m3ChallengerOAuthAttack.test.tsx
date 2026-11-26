const nativeSignIn = vi.hoisted(() => vi.fn());
vi.mock('../../src/services/nativeGoogleAuth', () => ({ signInNativeGoogle: nativeSignIn }));
beforeEach(() => nativeSignIn.mockReset().mockResolvedValue(undefined));
import 'fake-indexeddb/auto';
import React from 'react';
import fs from 'fs';
import path from 'path';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { googleAuthService } from '../../src/services/googleAuthService';
import { MobileAuthBottomSheet } from '../../src/components/mobile/auth/MobileAuthBottomSheet';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useAiStore } from '../../src/stores/useAiStore';
import { supabase } from '../../src/lib/supabase';
import App from '../../src/App';
import { RouterProvider } from '../../src/services/router';

// Helper to construct a base64url JWT token
function createMockJwt(payload: Record<string, any>): string {
  const header = { alg: 'none', typ: 'JWT' };
  const b64Header = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const b64Payload = btoa(unescape(encodeURIComponent(JSON.stringify(payload))))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `${b64Header}.${b64Payload}.mockSignature`;
}

describe('Challenger M3-1: Adversarial Google OAuth Attack Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
    delete (window as any).Capacitor;

    // Polyfill jsdom stubs
    window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    window.HTMLMediaElement.prototype.pause = vi.fn();
    window.HTMLMediaElement.prototype.load = vi.fn();
    window.scrollTo = vi.fn();

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
    cleanup();
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
    delete (window as any).Capacitor;
  });

  // =========================================================================
  // SUITE 1: ATTACK 1 — MOCK ACCOUNTS & FAKE FALLBACK PURGE AUDIT
  // =========================================================================
  describe('Suite 1: Attack 1 — Hardcoded Mock Accounts & Fake Fallbacks Audit', () => {
    it('1.1 [VULNERABILITY] Verify 100% absence of mock accounts: src/components/AuthView.tsx must NOT contain nam.studyworkspace@gmail.com', () => {
      const authViewPath = path.resolve(process.cwd(), 'src/components/AuthView.tsx');
      const authViewContent = fs.readFileSync(authViewPath, 'utf-8');
      const hasMockAccount = authViewContent.includes('nam.studyworkspace@gmail.com');

      expect(
        hasMockAccount,
        "VULNERABILITY DETECTED: Hardcoded mock account 'nam.studyworkspace@gmail.com' is still present in src/components/AuthView.tsx (lines 301-306)!"
      ).toBe(false);
    });

    it('1.2 [VULNERABILITY] Blind callers of simulateGoogleLogin in production (e.g. MoMoPaymentModal.tsx:385) expose broken mock dependencies', async () => {
      // simulateGoogleLogin with no args rejects
      await expect(googleAuthService.simulateGoogleLogin()).rejects.toThrow(
        /Mock Google credentials have been purged/
      );

      // Verify that MoMoPaymentModal still retains a direct call to simulateGoogleLogin()
      const momoModalPath = path.resolve(process.cwd(), 'src/components/MoMoPaymentModal.tsx');
      const momoContent = fs.readFileSync(momoModalPath, 'utf-8');
      const callsSimulate = momoContent.includes('googleAuthService.simulateGoogleLogin()');

      expect(
        callsSimulate,
        "VULNERABILITY DETECTED: src/components/MoMoPaymentModal.tsx:385 still invokes googleAuthService.simulateGoogleLogin() without credentials, causing unhandled runtime errors on quick Google sign-in!"
      ).toBe(false);
    });

    it('1.3 Verify that dummy user ID g_usr_10987654321 is purged from googleAuthService.ts', () => {
      const googleAuthPath = path.resolve(process.cwd(), 'src/services/googleAuthService.ts');
      const googleAuthContent = fs.readFileSync(googleAuthPath, 'utf-8');
      expect(googleAuthContent).not.toMatch(/sub:\s*['"]g_usr_10987654321['"]/);
    });
  });

  // =========================================================================
  // SUITE 2: ATTACK 2 — NATIVE GOOGLE OAUTH INITIATE FLOW STRESS TEST
  // =========================================================================
  describe('Suite 2: Attack 2 — Native Google OAuth Initiate Flow Stress Test', () => {
    it('2.1 native picker succeeds without opening a Browser or Web OAuth', async () => {
      const browser = vi.spyOn(window, 'open');
      const oauth = vi.spyOn(supabase.auth, 'signInWithOAuth');
      await googleAuthService.loginWithGoogleNative();
      expect(nativeSignIn).toHaveBeenCalledWith(googleAuthService.getClientId());
      expect(browser).not.toHaveBeenCalled(); expect(oauth).not.toHaveBeenCalled();
    });

    it('2.2 native picker or token verification failure propagates without creating an account', async () => {
      nativeSignIn.mockRejectedValueOnce(new Error('Native sign-in rejected'));
      await expect(googleAuthService.loginWithGoogleNative()).rejects.toThrow('Native sign-in rejected');
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('2.3 native picker or token verification failure propagates without creating an account', async () => {
      nativeSignIn.mockRejectedValueOnce(new Error('Native sign-in rejected'));
      await expect(googleAuthService.loginWithGoogleNative()).rejects.toThrow('Native sign-in rejected');
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('2.4 native picker or token verification failure propagates without creating an account', async () => {
      nativeSignIn.mockRejectedValueOnce(new Error('Native sign-in rejected'));
      await expect(googleAuthService.loginWithGoogleNative()).rejects.toThrow('Native sign-in rejected');
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('2.5 MobileAuthBottomSheet handles native OAuth launch failure gracefully with error feedback banner', async () => {
      (window as any).Capacitor = {
        isNativePlatform: () => true,
      };

      vi.spyOn(googleAuthService, 'loginWithGoogleNative').mockRejectedValueOnce(
        new Error('ActivityNotFoundException: No system browser installed')
      );

      render(<MobileAuthBottomSheet isOpen={true} onClose={() => {}} />);
      const googleBtn = screen.getByTestId('mobile-auth-google-btn');

      await act(async () => {
        fireEvent.click(googleBtn);
      });

      const feedback = await screen.findByTestId('mobile-auth-feedback');
      expect(feedback.textContent).toContain('ActivityNotFoundException: No system browser installed');
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });

  // =========================================================================
  // SUITE 3: ATTACK 3 — DEEP LINK CALLBACK TOKEN EXTRACTION & INJECTION ATTACK
  // =========================================================================
  describe('Suite 3: Attack 3 — Deep Link Callback Token Extraction & Injection Attack', () => {
    it('3.1 [CRITICAL VULNERABILITY] Forged Token Injection Attack — unverified JWT payload must NOT authenticate user when Supabase setSession fails', async () => {
      const mockBrowserClose = vi.fn().mockResolvedValue(undefined);
      (window as any).Capacitor = {
        isNativePlatform: () => true,
        Plugins: {
          Browser: { close: mockBrowserClose },
        },
      };

      // Attacker crafts a forged JWT with the Founder email
      const forgedJwt = createMockJwt({
        sub: 'forged_attacker_uuid_999',
        email: 'namho03052k9@gmail.com', // Founder VIP email!
        name: 'Attacker Forged Profile',
        role: 'authenticated',
      });

      // Supabase cryptographic verification fails: returns error and user: null
      vi.spyOn(supabase.auth as any, 'setSession').mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'Invalid JWT signature: token verification failed' },
      });

      const { unmount } = render(
        <RouterProvider>
          <App />
        </RouterProvider>
      );

      // Attacker triggers deep link into App
      await act(async () => {
        window.dispatchEvent(
          new CustomEvent('appUrlOpen', {
            detail: {
              url: `pomofocus://oauth/callback#access_token=${forgedJwt}&refresh_token=fake_refresh_token`,
            },
          })
        );
      });

      // VULNERABILITY CHECK: If App.tsx does not check sessionResult.error / sessionResult.data.user
      // and falls back to unverified client-decoded user, useAuthStore logs the user in as Founder VIP!
      const currentUser = useAuthStore.getState().user;
      unmount();

      expect(
        currentUser,
        "CRITICAL VULNERABILITY DETECTED: src/App.tsx:386-398 accepted an unverified client-decoded JWT when supabase.auth.setSession failed with an invalid signature, elevating an unverified attacker to authenticated state!"
      ).toBeNull();
    });

    it('3.2 Malformed JWT tokens with corrupted base64 characters degrade cleanly without crash', async () => {
      const mockBrowserClose = vi.fn().mockResolvedValue(undefined);
      (window as any).Capacitor = {
        isNativePlatform: () => true,
        Plugins: {
          Browser: { close: mockBrowserClose },
        },
      };

      vi.spyOn(supabase.auth as any, 'setSession').mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'Malformed access token' },
      });

      const { unmount } = render(
        <RouterProvider>
          <App />
        </RouterProvider>
      );

      await act(async () => {
        window.dispatchEvent(
          new CustomEvent('appUrlOpen', {
            detail: {
              url: 'pomofocus://oauth/callback#access_token=corrupted.notbase64!@#$!@#$.invalid&refresh_token=bad',
            },
          })
        );
      });

      unmount();
      expect(mockBrowserClose).toHaveBeenCalled();
      expect(useAuthStore.getState().user).toBeNull();
    });

    it('3.3 OAuth error callback from provider (access_denied / user_cancelled) closes browser and does not authenticate', async () => {
      const mockBrowserClose = vi.fn().mockResolvedValue(undefined);
      (window as any).Capacitor = {
        isNativePlatform: () => true,
        Plugins: {
          Browser: { close: mockBrowserClose },
        },
      };

      const { unmount } = render(
        <RouterProvider>
          <App />
        </RouterProvider>
      );

      await act(async () => {
        window.dispatchEvent(
          new CustomEvent('appUrlOpen', {
            detail: {
              url: 'pomofocus://oauth/callback#error=access_denied&error_description=The+user+denied+the+request',
            },
          })
        );
      });

      unmount();
      // Browser must be closed
      expect(mockBrowserClose).toHaveBeenCalled();
      // No user session created
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('3.4 Deep link with query parameter style callback (?access_token=...&refresh_token=...) is parsed correctly', async () => {
      const mockBrowserClose = vi.fn().mockResolvedValue(undefined);
      (window as any).Capacitor = {
        isNativePlatform: () => true,
        Plugins: {
          Browser: { close: mockBrowserClose },
        },
      };

      const validJwt = createMockJwt({
        sub: 'real_student_id_123',
        email: 'student@pomo.edu.vn',
        name: 'Pomo Student',
      });

      const verifiedUser = {
        id: 'real_student_id_123',
        email: 'student@pomo.edu.vn',
        user_metadata: { full_name: 'Pomo Student' },
      };

      vi.spyOn(supabase.auth as any, 'setSession').mockResolvedValueOnce({
        data: { user: verifiedUser, session: { access_token: validJwt } },
        error: null,
      });

      const { unmount } = render(
        <RouterProvider>
          <App />
        </RouterProvider>
      );

      await act(async () => {
        window.dispatchEvent(
          new CustomEvent('appUrlOpen', {
            detail: {
              url: `pomofocus://oauth/callback?access_token=${validJwt}&refresh_token=real_refresh`,
            },
          })
        );
      });

      unmount();
      expect(mockBrowserClose).toHaveBeenCalled();
      const user = useAuthStore.getState().user;
      expect(user).toBeDefined();
      expect(user?.email).toBe('student@pomo.edu.vn');
    });

    it('3.5 Empty or corrupted callback fragment degrades without throwing unhandled exceptions', async () => {
      const mockBrowserClose = vi.fn().mockResolvedValue(undefined);
      (window as any).Capacitor = {
        isNativePlatform: () => true,
        Plugins: {
          Browser: { close: mockBrowserClose },
        },
      };

      const { unmount } = render(
        <RouterProvider>
          <App />
        </RouterProvider>
      );

      await act(async () => {
        window.dispatchEvent(
          new CustomEvent('appUrlOpen', {
            detail: { url: 'pomofocus://oauth/callback#' },
          })
        );
      });

      unmount();
      expect(mockBrowserClose).toHaveBeenCalled();
      expect(useAuthStore.getState().user).toBeNull();
    });
  });

  // =========================================================================
  // SUITE 4: ATTACK 4 — BROWSER WINDOW LIFECYCLE & ERROR RESILIENCE
  // =========================================================================
  describe('Suite 4: Attack 4 — Browser Window Lifecycle & Error Resilience', () => {
    it('4.1 Browser.close() is reliably triggered on deep link callback arrival', async () => {
      const mockBrowserClose = vi.fn().mockResolvedValue(undefined);
      (window as any).Capacitor = {
        isNativePlatform: () => true,
        Plugins: {
          Browser: { close: mockBrowserClose },
        },
      };

      const { unmount } = render(
        <RouterProvider>
          <App />
        </RouterProvider>
      );

      await act(async () => {
        window.dispatchEvent(
          new CustomEvent('appUrlOpen', {
            detail: {
              url: 'pomofocus://oauth/callback#error=user_cancelled',
            },
          })
        );
      });

      unmount();
      expect(mockBrowserClose).toHaveBeenCalledTimes(1);
    });

    it('4.2 Browser.close() rejection is swallowed silently and does not abort callback processing', async () => {
      const mockBrowserClose = vi.fn().mockRejectedValue(new Error('Browser window already closed by OS'));
      (window as any).Capacitor = {
        isNativePlatform: () => true,
        Plugins: {
          Browser: { close: mockBrowserClose },
        },
      };

      const validJwt = createMockJwt({
        sub: 'usr_valid_002',
        email: 'user2@gmail.com',
      });

      vi.spyOn(supabase.auth as any, 'setSession').mockResolvedValueOnce({
        data: {
          user: { id: 'usr_valid_002', email: 'user2@gmail.com' },
          session: { access_token: validJwt },
        },
        error: null,
      });

      const { unmount } = render(
        <RouterProvider>
          <App />
        </RouterProvider>
      );

      await act(async () => {
        window.dispatchEvent(
          new CustomEvent('appUrlOpen', {
            detail: {
              url: `pomofocus://oauth/callback#access_token=${validJwt}&refresh_token=valid_refresh`,
            },
          })
        );
      });

      unmount();
      // Even though Browser.close rejected, the error was safely caught and user was authenticated
      expect(mockBrowserClose).toHaveBeenCalled();
      expect(useAuthStore.getState().user?.email).toBe('user2@gmail.com');
    });

    it('4.3 googleAuthService.closeNativeBrowser() degrades gracefully when window.Capacitor is undefined', async () => {
      delete (window as any).Capacitor;
      await expect(googleAuthService.closeNativeBrowser()).resolves.toBeUndefined();
    });
  });
});
