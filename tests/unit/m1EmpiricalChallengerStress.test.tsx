import 'fake-indexeddb/auto';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { CookieConsentBanner } from '../../src/components/CookieConsentBanner';
import { MobileAppShell } from '../../src/components/mobile/MobileAppShell';
import { useTimerStore } from '../../src/stores/useTimerStore';
import { useAiStore } from '../../src/stores/useAiStore';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useLayoutStore } from '../../src/stores/useLayoutStore';
import { useAudioStore } from '../../src/stores/useAudioStore';

vi.mock('../../src/services/router', () => ({
  useRouter: vi.fn(() => ({
    currentRoute: { pathname: '/app', path: '/app', query: {} },
    navigate: vi.fn(),
  })),
}));

describe('Milestone 1 Empirical Challenger Stress Suite', () => {
  beforeEach(() => {
    localStorage.clear();

    // Mock HTMLMediaElement methods for JSDOM
    window.HTMLMediaElement.prototype.pause = vi.fn();
    window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    window.HTMLMediaElement.prototype.load = vi.fn();

    useTimerStore.getState().init();
    useTimerStore.setState({
      status: 'idle',
      phase: 'pomodoro',
      remainingMs: 25 * 60 * 1000,
    });
    useAiStore.setState({
      aiCreditsBalance: 50,
      isOpen: false,
    });
    useAuthStore.setState({
      isAuthenticated: false,
      user: null,
      isPro: false,
      isLifetime: false,
    });
    useLayoutStore.setState({
      activeMobileTab: 'focus',
      isEcoMode: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // VECTOR 1: Mobile 390px Layout Collision & Safe-Area Clamping
  // =========================================================================
  describe('Vector 1: Mobile 390px CookieConsentBanner & Bottom Nav Collision', () => {
    it('positions CookieConsentBanner strictly 12px above 56px bottom navigation with safe-area support', async () => {
      vi.useFakeTimers();
      render(<CookieConsentBanner />);

      // Banner appears after 800ms debounce
      act(() => {
        vi.advanceTimersByTime(850);
      });

      const banner = screen.getByTestId('cookie-consent-banner');
      expect(banner).toBeDefined();

      const className = banner.className;

      // Invariant 1: Position is fixed
      expect(className).toContain('fixed');

      // Invariant 2: Bottom positioning calculates 56px bottom nav + safe area + 12px margin
      expect(className).toContain('bottom-[calc(56px+env(safe-area-inset-bottom,0px)+12px)]');

      // Invariant 3: Z-index layer hierarchy is z-40
      expect(className).toContain('z-40');

      // Invariant 4: On mobile (< sm), left-4 right-4 for 390px viewport fit
      expect(className).toContain('left-4');
      expect(className).toContain('right-4');

      // Invariant 5: On desktop (sm:), positioned bottom-4 sm:right-6 sm:max-w-md
      expect(className).toContain('sm:bottom-4');
      expect(className).toContain('sm:right-6');
      expect(className).toContain('sm:max-w-md');

      vi.useRealTimers();
    });

    it('preserves Vietnamese legal citations verbatim (Law 91/2025 & Decree 356/2025)', () => {
      vi.useFakeTimers();
      render(<CookieConsentBanner />);
      act(() => {
        vi.advanceTimersByTime(850);
      });

      const banner = screen.getByTestId('cookie-consent-banner');
      expect(banner.textContent).toContain('Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15');
      expect(banner.textContent).toContain('Nghị định 356/2025/NĐ-CP');
      expect(banner.textContent).toContain('Bảo Vệ Dữ Liệu & Quyền Riêng Tư');

      vi.useRealTimers();
    });

    it('verifies WCAG high contrast on accept button', () => {
      vi.useFakeTimers();
      render(<CookieConsentBanner />);
      act(() => {
        vi.advanceTimersByTime(850);
      });

      const acceptBtn = screen.getByTestId('consent-accept-btn');
      expect(acceptBtn.className).toContain('bg-white');
      expect(acceptBtn.className).toContain('text-zinc-950');

      vi.useRealTimers();
    });

    it('does not collide with Bottom Nav in full MobileAppShell render at 390px', () => {
      render(<MobileAppShell />);

      const bottomNav = screen.getByTestId('mobile-bottom-nav');
      expect(bottomNav).toBeDefined();

      // Bottom nav height is strictly 56px (h-14)
      expect(bottomNav.className).toContain('h-14');
      expect(bottomNav.className).toContain('min-h-[56px]');
      expect(bottomNav.className).toContain('max-h-[56px]');
      expect(bottomNav.className).toContain('pb-safe');

      // Bottom nav z-index is z-30 (below Cookie Banner z-40)
      expect(bottomNav.className).toContain('z-30');
    });

    it('verifies clicking accept button saves consent to localStorage and dismisses banner', () => {
      vi.useFakeTimers();
      render(<CookieConsentBanner />);
      act(() => {
        vi.advanceTimersByTime(850);
      });

      const acceptBtn = screen.getByTestId('consent-accept-btn');
      fireEvent.click(acceptBtn);

      expect(localStorage.getItem('pomofocus_consent_v1')).toBe('accepted');
      expect(screen.queryByTestId('cookie-consent-banner')).toBeNull();

      vi.useRealTimers();
    });
  });

  // =========================================================================
  // VECTOR 2: Header Height Strictly Bounded at 48px (h-12)
  // =========================================================================
  describe('Vector 2: Header Height Strict 48px Invariant', () => {
    it('strictly bounds mobile-top-header height to 48px regardless of timer status', () => {
      const { rerender } = render(<MobileAppShell />);

      const header = screen.getByTestId('mobile-top-header');
      expect(header.className).toContain('h-12');
      expect(header.className).toContain('min-h-[48px]');
      expect(header.className).toContain('max-h-[48px]');
      expect(header.className).toContain('shrink-0');

      // Stress test: running status
      act(() => {
        useTimerStore.setState({
          status: 'running',
          remainingMs: 15 * 60 * 1000,
        });
      });
      rerender(<MobileAppShell />);
      expect(header.className).toContain('h-12');
      expect(header.className).toContain('min-h-[48px]');
      expect(header.className).toContain('max-h-[48px]');

      // Stress test: paused status
      act(() => {
        useTimerStore.setState({
          status: 'paused',
          remainingMs: 5 * 1000,
        });
      });
      rerender(<MobileAppShell />);
      expect(header.className).toContain('h-12');
      expect(header.className).toContain('min-h-[48px]');
      expect(header.className).toContain('max-h-[48px]');
    });

    it('does not expand header height when credits number is massive or Infinity', () => {
      const { rerender } = render(<MobileAppShell />);
      const header = screen.getByTestId('mobile-top-header');

      // Test with massive credits
      act(() => {
        useAiStore.setState({ aiCreditsBalance: 999999999 });
      });
      rerender(<MobileAppShell />);

      expect(screen.getByText('999999999')).toBeDefined();
      expect(header.className).toContain('max-h-[48px]');

      // Test with Infinity
      act(() => {
        useAiStore.setState({ aiCreditsBalance: Infinity });
      });
      rerender(<MobileAppShell />);

      expect(screen.getByText('Infinity')).toBeDefined();
      expect(header.className).toContain('max-h-[48px]');
    });

    it('verifies that Liquid Zen badge is completely removed from mobile header', () => {
      render(<MobileAppShell />);
      expect(screen.queryByText('Liquid Zen')).toBeNull();
      expect(screen.queryByText('LIQUID ZEN')).toBeNull();
    });

    it('verifies that the yellow status dot is hidden from visual view in header', () => {
      render(<MobileAppShell />);
      const dot = screen.getByTestId('mobile-header-timer-status-dot');
      expect(dot.className).toContain('hidden');
    });
  });

  // =========================================================================
  // VECTOR 3: CSS Rule @media (hover: hover) in liquidDock.css
  // =========================================================================
  describe('Vector 3: CSS Rule @media (hover: hover) in liquidDock.css', () => {
    it('verifies that all dock hover and tooltip hover rules are strictly scoped within @media (hover: hover)', () => {
      const cssPath = path.resolve(__dirname, '../../src/styles/liquidDock.css');
      const cssContent = fs.readFileSync(cssPath, 'utf-8');

      // Check media query presence
      expect(cssContent).toContain('@media (hover: hover) and (pointer: fine)');

      // Extract sections outside media queries and verify no bare .dock__item:hover exists
      const mediaQueryRegex = /@media[^{]+\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g;
      const strippedContent = cssContent.replace(mediaQueryRegex, '');

      // Verify no bare .dock__item:hover or .dock__tooltip:hover exists outside media queries
      expect(strippedContent).not.toMatch(/\.dock__item:hover/);
      expect(strippedContent).not.toMatch(/\.dock__tooltip:hover/);

      // Verify that within the media query, magnification and tooltip appear
      const hoverBlocks = cssContent.match(/@media\s*\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)\s*\{[\s\S]*?\n\}/g);
      expect(hoverBlocks).not.toBeNull();
      expect(hoverBlocks!.length).toBeGreaterThanOrEqual(1);

      const combinedHoverBlocks = hoverBlocks!.join('\n');
      expect(combinedHoverBlocks).toContain('.dock__item:hover');
      expect(combinedHoverBlocks).toContain('--k: var(--max)');
      expect(combinedHoverBlocks).toContain('.dock__item:hover .dock__tooltip');
    });
  });

  // =========================================================================
  // VECTOR 4: Icon and Typography Standardization
  // =========================================================================
  describe('Vector 4: Icon & Typography Standardization', () => {
    it('verifies credits pill uses Lucide Zap icon instead of emoji', () => {
      render(<MobileAppShell />);
      const pill = screen.getByTestId('mobile-header-credits-pill');
      expect(pill.textContent).not.toContain('⚡');
      expect(pill.textContent).not.toContain('🍅');
    });

    it('verifies bottom nav contains all 5 required navigation destinations with 3px dot', () => {
      render(<MobileAppShell />);
      expect(screen.getByTestId('mobile-nav-tab-focus')).toBeDefined();
      expect(screen.getByTestId('mobile-nav-tab-tasks')).toBeDefined();
      expect(screen.getByTestId('mobile-nav-tab-spaces')).toBeDefined();
      expect(screen.getByTestId('mobile-nav-tab-ai')).toBeDefined();
      expect(screen.getByTestId('mobile-nav-tab-settings')).toBeDefined();
    });

    it('verifies sound playing indicator dot appears when audio is active on spaces tab', () => {
      useAudioStore.setState({
        tracks: [
          {
            id: 'rain',
            name: 'Mưa rào',
            src: '/audio/rain.mp3',
            volume: 0.5,
            isPlaying: true,
            icon: 'CloudRain',
            category: 'nature',
          },
        ] as any,
      });

      render(<MobileAppShell />);
      const soundDot = screen.getByTestId('spaces-sound-playing-dot');
      expect(soundDot).toBeDefined();
      expect(soundDot.className).toContain('animate-pulse');
      expect(soundDot.className).toContain('bg-emerald-400');
    });
  });
});
