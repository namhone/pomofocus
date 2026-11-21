import 'fake-indexeddb/auto';
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import { googleAuthService } from '../../src/services/googleAuthService';
import {
  getSubscriptionBadge,
  formatUserCredits,
  isOwnerEmail,
  hasVipAccess,
  OWNER_EMAILS,
} from '../../src/utils/userBadge';
import { generateInitialsAvatarSvg } from '../../src/services/authService';
import { ProfileView } from '../../src/components/ProfileView';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { supabase } from '../../src/lib/supabase';

// Mock router
vi.mock('../../src/services/router', () => ({
  useRouter: () => ({
    currentRoute: { pathname: '/profile', path: '/profile', query: {} },
    navigate: vi.fn(),
  }),
}));

describe('Adversarial Challenger Test: Google OAuth Architecture & Identity Attack (Milestone M3)', () => {
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
  });

  afterEach(() => {
    cleanup();
    delete (window as any).Capacitor;
    vi.restoreAllMocks();
  });

  // =========================================================================
  // SUITE 1: ADVERSARIAL STRESS TEST ON googleAuthService.ts
  // =========================================================================
  describe('Suite 1: Adversarial Stress Test on googleAuthService', () => {
    it('ATTACK-01: Native OAuth fails gracefully when Capacitor Browser plugin is completely missing', async () => {
      // Capacitor exists but Plugins.Browser does not exist
      const mockWindowOpen = vi.fn();
      const originalWindowOpen = window.open;
      window.open = mockWindowOpen;

      (window as any).Capacitor = {
        isNativePlatform: () => true,
        Plugins: {},
      };

      vi.spyOn(supabase.auth, 'signInWithOAuth').mockResolvedValueOnce({
        data: { provider: 'google', url: 'https://auth.supabase.co/google' },
        error: null,
      } as any);

      const result = await googleAuthService.loginWithGoogleNative();
      expect(result.url).toBe('https://auth.supabase.co/google');
      expect(mockWindowOpen).toHaveBeenCalledWith('https://auth.supabase.co/google', '_system');

      window.open = originalWindowOpen;
    });

    it('ATTACK-02: Native OAuth throws cleanly when Supabase returns null URL without throwing unhandled exceptions', async () => {
      (window as any).Capacitor = {
        isNativePlatform: () => true,
        Plugins: { Browser: { open: vi.fn(), close: vi.fn() } },
      };

      vi.spyOn(supabase.auth, 'signInWithOAuth').mockResolvedValueOnce({
        data: { provider: 'google', url: null },
        error: null,
      } as any);

      await expect(googleAuthService.loginWithGoogleNative()).rejects.toThrow(
        'Supabase không trả về URL xác thực Google OAuth'
      );
    });

    it('ATTACK-03: closeNativeBrowser handles crashing or rejecting Browser.close without throwing', async () => {
      (window as any).Capacitor = {
        Plugins: {
          Browser: {
            close: vi.fn().mockRejectedValue(new Error('Browser instance already destroyed')),
          },
        },
      };

      // Must never throw unhandled rejection
      await expect(googleAuthService.closeNativeBrowser()).resolves.toBeUndefined();
    });

    it('ATTACK-04: simulateGoogleLogin strictly rejects missing or blank emails to prevent mock credential infiltration', async () => {
      await expect(googleAuthService.simulateGoogleLogin()).rejects.toThrow(
        /Mock Google credentials have been purged/
      );
      await expect(googleAuthService.simulateGoogleLogin({})).rejects.toThrow(
        /Mock Google credentials have been purged/
      );
      await expect(googleAuthService.simulateGoogleLogin({ email: '' })).rejects.toThrow(
        /Mock Google credentials have been purged/
      );
    });

    it('ATTACK-05: parseJwtPayload handles malformed, tampered, or non-JWT tokens securely', () => {
      expect(() => googleAuthService.parseJwtPayload('')).toThrow('ID Token không hợp lệ');
      expect(() => googleAuthService.parseJwtPayload('invalid-single-string')).toThrow(
        'Token không đúng định dạng JWT của Google'
      );
      expect(() => googleAuthService.parseJwtPayload('part1.part2.part3.part4')).toThrow(
        'Token không đúng định dạng JWT của Google'
      );
      // Valid 3-part structure but non-json payload
      expect(() => googleAuthService.parseJwtPayload('header.invalid-base64.sig')).toThrow();
    });
  });

  // =========================================================================
  // SUITE 2: ADVERSARIAL STRESS TEST ON userBadge.ts WHITELIST & ENTITLEMENTS
  // =========================================================================
  describe('Suite 2: Adversarial Stress Test on userBadge Whitelist & Entitlements', () => {
    it('ATTACK-06: Case-insensitivity, surrounding whitespace, and edge strings in isOwnerEmail', () => {
      expect(isOwnerEmail('   namho03052k9@gmail.com   ')).toBe(true);
      expect(isOwnerEmail('NAMHO03052K9@GMAIL.COM')).toBe(true);
      expect(isOwnerEmail('HuYeNtRaNtT09@gMaIl.CoM\n')).toBe(true);
      expect(isOwnerEmail('namho03052k9@gmail.com.fake.domain')).toBe(false);
      expect(isOwnerEmail('attacker+namho03052k9@gmail.com')).toBe(false);
      expect(isOwnerEmail('<script>alert(1)</script>')).toBe(false);
      expect(isOwnerEmail(null)).toBe(false);
      expect(isOwnerEmail(undefined)).toBe(false);
    });

    it('ATTACK-07: getSubscriptionBadge state singularity across spoofed inputs', () => {
      // Unauthenticated / null user is always Free
      expect(getSubscriptionBadge(null).tier).toBe('free');
      expect(getSubscriptionBadge({} as any).tier).toBe('free');

      // Founder spoofing attempt via malicious plan string
      const spoofedPlan = getSubscriptionBadge({ plan: 'fake_founder_plan' });
      expect(spoofedPlan.tier).toBe('free');

      // Genuine founder by email gets Founder VIP
      const genuineFounder = getSubscriptionBadge({ email: 'namho03052k9@gmail.com' });
      expect(genuineFounder.tier).toBe('founder');
      expect(genuineFounder.label).toBe('Founder VIP');

      // Pro variations (pro_yearly, monthly, lifetime) get Pro tier
      expect(getSubscriptionBadge({ plan: 'pro_yearly' }).tier).toBe('pro');
      expect(getSubscriptionBadge({ plan: 'monthly' }).tier).toBe('pro');
      expect(getSubscriptionBadge({ isLifetime: true }).tier).toBe('pro');
    });

    it('ATTACK-08: formatUserCredits withstands NaN, negative numbers, and boundary values', () => {
      // Founder always gets infinite credits
      const founder = formatUserCredits(0, { email: 'namho03052k9@gmail.com' });
      expect(founder.isUnlimited).toBe(true);
      expect(founder.label).toBe('Credits ∞');
      expect(founder.balance).toBe(Infinity);

      // Normal user with negative credits clamped to 0
      const negative = formatUserCredits(-50, { email: 'student@example.com' });
      expect(negative.isUnlimited).toBe(false);
      expect(negative.balance).toBe(0);

      // Normal user with NaN credits defaults to fallback 50
      const nanCredits = formatUserCredits(NaN, { email: 'student@example.com' });
      expect(nanCredits.isUnlimited).toBe(false);
      expect(nanCredits.balance).toBe(50);

      // Normal user with null credits defaults to fallback 50
      const nullCredits = formatUserCredits(null, { email: 'student@example.com' });
      expect(nullCredits.isUnlimited).toBe(false);
      expect(nullCredits.balance).toBe(50);
    });
  });

  // =========================================================================
  // SUITE 3: AVATAR GEOMETRY & PROFILE VIEW INVARIANTS
  // =========================================================================
  describe('Suite 3: Avatar Geometry & Profile View Invariants', () => {
    it('ATTACK-09: generateInitialsAvatarSvg generates strictly circular rect rx = size / 2 for all standard sizes', () => {
      const sizes = [24, 28, 36, 48, 64, 120];
      for (const s of sizes) {
        const dataUri = generateInitialsAvatarSvg('Bảo Nam', s);
        const svg = decodeURIComponent(dataUri);
        const expectedRx = Math.round(s / 2);
        expect(svg).toContain(`rx="${expectedRx}"`);
        expect(svg).toContain(`width="${s}"`);
        expect(svg).toContain(`height="${s}"`);
      }
    });

    it('ATTACK-10: ProfileView completely suppresses empty mail container when email is whitespace-only', () => {
      useAuthStore.setState({
        user: {
          id: 'usr_space_email',
          email: '   ',
          displayName: 'Học Viên Ẩn Danh',
          role: 'authenticated',
          createdAt: Date.now(),
        } as any,
        isAuthenticated: true,
      });

      render(<ProfileView />);
      expect(screen.queryByTestId('profile-email-container')).toBeNull();
    });
  });
});
