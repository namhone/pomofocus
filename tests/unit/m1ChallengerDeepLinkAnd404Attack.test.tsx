import 'fake-indexeddb/auto';
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

// Target Components
import { App } from '../../src/App';
import { NotFoundPage } from '../../src/pages/NotFoundPage';
import { CookieConsentBanner, CONSENT_STORAGE_KEY } from '../../src/components/CookieConsentBanner';
import { RouterProvider } from '../../src/services/router';

// Stores
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useLayoutStore } from '../../src/stores/useLayoutStore';
import { useTimerStore } from '../../src/stores/useTimerStore';
import { useAiStore } from '../../src/stores/useAiStore';
import { usePwaInstallStore } from '../../src/stores/usePwaInstallStore';

describe('Milestone M1 Challenger Adversarial Attack Suite: Deep Links, 404 & Button Wrapping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    delete (window as any).Capacitor;
    delete (window as any).PomoNativeBack;

    window.scrollTo = vi.fn();
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    useAuthStore.setState({
      isAuthenticated: false,
      user: null,
      isPro: false,
      isLifetime: false,
    });

    useLayoutStore.setState({
      isMobile: false,
      isZenMode: false,
      isHeaderExpanded: true,
    });

    useTimerStore.setState({
      status: 'idle',
      remainingMs: 25 * 60 * 1000,
      phase: 'pomodoro',
      currentRound: 1,
      linkedTaskId: null,
      linkedTaskTitle: null,
    });

    useAiStore.setState({
      aiCreditsBalance: 50,
      isTopupModalOpen: false,
      messages: [],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (window as any).Capacitor;
    delete (window as any).PomoNativeBack;
  });

  // =========================================================================
  // ATTACK VECTOR 1: Extreme & Malformed Deep Links Routing Stress Test
  // =========================================================================
  describe('Vector 1: Deep Link Scheme & Routing Attack', () => {
    it('1.1 routes pomofocus://billing?ref=promo&code=123 cleanly with query preservation', async () => {
      window.history.pushState({}, '', '/app');
      const { unmount } = render(
        <RouterProvider>
          <App />
        </RouterProvider>
      );

      await act(async () => {
        window.dispatchEvent(
          new CustomEvent('appUrlOpen', {
            detail: { url: 'pomofocus://billing?ref=promo&code=123' },
          })
        );
      });

      expect(window.location.pathname).toBe('/billing');
      expect(window.location.search).toBe('?ref=promo&code=123');

      // Verify BillingView rendered
      const billingContainer = await screen.findByTestId('billing-view');
      expect(billingContainer).toBeDefined();

      unmount();
    });

    it('1.2 routes pomofocus:///settings (triple slashes) to /settings', async () => {
      window.history.pushState({}, '', '/app');
      const { unmount } = render(
        <RouterProvider>
          <App />
        </RouterProvider>
      );

      await act(async () => {
        window.dispatchEvent(
          new CustomEvent('appUrlOpen', {
            detail: { url: 'pomofocus:///settings' },
          })
        );
      });

      expect(window.location.pathname).toBe('/settings');
      expect(screen.getByText(/Cài Đặt/i)).toBeDefined();

      unmount();
    });

    it('1.3 routes pomofocus://unknown-path-404 to /unknown-path-404 and displays 404 page', async () => {
      window.history.pushState({}, '', '/app');
      const { unmount } = render(
        <RouterProvider>
          <App />
        </RouterProvider>
      );

      await act(async () => {
        window.dispatchEvent(
          new CustomEvent('appUrlOpen', {
            detail: { url: 'pomofocus://unknown-path-404' },
          })
        );
      });

      expect(window.location.pathname).toBe('/unknown-path-404');

      // Verify NotFoundPage is rendered with glitch 404 text and back button
      expect(await screen.findByTestId('not-found-page')).toBeDefined();
      expect(screen.getByTestId('404-glitch-text')).toBeDefined();
      expect(screen.getByTestId('not-found-back-btn')).toBeDefined();

      unmount();
    });

    it('1.4 routes pomofocus://rooms/abc-xyz to /rooms/abc-xyz', async () => {
      window.history.pushState({}, '', '/app');
      const { unmount } = render(
        <RouterProvider>
          <App />
        </RouterProvider>
      );

      await act(async () => {
        window.dispatchEvent(
          new CustomEvent('appUrlOpen', {
            detail: { url: 'pomofocus://rooms/abc-xyz' },
          })
        );
      });

      expect(window.location.pathname).toBe('/rooms/abc-xyz');

      unmount();
    });

    it('1.5 handles extreme edge cases: pomofocus://, empty url, and garbage protocol without crashing', async () => {
      window.history.pushState({}, '', '/app');
      const { unmount } = render(
        <RouterProvider>
          <App />
        </RouterProvider>
      );

      // Empty deep link
      await act(async () => {
        window.dispatchEvent(
          new CustomEvent('appUrlOpen', { detail: { url: '' } })
        );
      });
      expect(window.location.pathname).toBe('/app');

      // Bare scheme pomofocus://
      await act(async () => {
        window.dispatchEvent(
          new CustomEvent('appUrlOpen', { detail: { url: 'pomofocus://' } })
        );
      });
      expect(window.location.pathname).toBe('/');

      // Multiple slashes
      await act(async () => {
        window.dispatchEvent(
          new CustomEvent('appUrlOpen', { detail: { url: 'pomofocus://///terms' } })
        );
      });
      // In terms, LegalViews renders
      expect(screen.getByText('Điều Khoản Dịch Vụ')).toBeDefined();

      unmount();
    });
  });

  // =========================================================================
  // ATTACK VECTOR 2: Native APK Isolation & Download Route Redirection
  // =========================================================================
  describe('Vector 2: Native APK Redirection for Download Routes', () => {
    it('2.1 redirects /download to /app under native mode and suppresses WebDownloadHub', async () => {
      (window as any).Capacitor = {
        isNativePlatform: () => true,
        getPlatform: () => 'android',
      };

      window.history.pushState({}, '', '/download');
      const { unmount } = render(
        <RouterProvider>
          <App />
        </RouterProvider>
      );

      // Verify immediate redirection to /app
      expect(window.location.pathname).toBe('/app');

      // Verify WebDownloadHub is NEVER painted
      expect(screen.queryByTestId('download-hub-container')).toBeNull();
      expect(screen.queryByTestId('central-apk-download-btn')).toBeNull();

      unmount();
    });

    it('2.2 redirects /downloads to /app under native mode', async () => {
      (window as any).Capacitor = {
        isNativePlatform: () => true,
        getPlatform: () => 'android',
      };

      window.history.pushState({}, '', '/downloads');
      const { unmount } = render(
        <RouterProvider>
          <App />
        </RouterProvider>
      );

      expect(window.location.pathname).toBe('/app');
      expect(screen.queryByTestId('download-hub-container')).toBeNull();

      unmount();
    });

    it('2.3 redirects /apk to /app under native mode', async () => {
      (window as any).Capacitor = {
        isNativePlatform: () => true,
        getPlatform: () => 'android',
      };

      window.history.pushState({}, '', '/apk');
      const { unmount } = render(
        <RouterProvider>
          <App />
        </RouterProvider>
      );

      expect(window.location.pathname).toBe('/app');
      expect(screen.queryByTestId('download-hub-container')).toBeNull();

      unmount();
    });

    it('2.4 suppresses PWA beforeinstallprompt on native Capacitor', () => {
      (window as any).Capacitor = {
        isNativePlatform: () => true,
        getPlatform: () => 'android',
      };

      render(
        <RouterProvider>
          <App />
        </RouterProvider>
      );

      const fakeEvent = new Event('beforeinstallprompt');
      act(() => {
        window.dispatchEvent(fakeEvent);
      });

      // PWA prompt must not be captured in native mode
      expect(usePwaInstallStore.getState().deferredPrompt).toBeNull();
    });
  });

  // =========================================================================
  // ATTACK VECTOR 3: NotFoundPage (404) Navigation & Zero-Emoji Audit
  // =========================================================================
  describe('Vector 3: NotFoundPage Navigation, History & Zero Raw Emoji Contract', () => {
    it('3.1 not-found-back-btn calls window.history.back() when history.length > 1', () => {
      const historyBackSpy = vi.spyOn(window.history, 'back').mockImplementation(() => {});
      Object.defineProperty(window.history, 'length', {
        value: 5,
        writable: true,
        configurable: true,
      });

      render(
        <RouterProvider>
          <NotFoundPage />
        </RouterProvider>
      );

      const backBtn = screen.getByTestId('not-found-back-btn');
      expect(backBtn).toBeDefined();

      fireEvent.click(backBtn);
      expect(historyBackSpy).toHaveBeenCalledTimes(1);

      historyBackSpy.mockRestore();
    });

    it('3.2 not-found-back-btn falls back to /app when history.length <= 1', () => {
      Object.defineProperty(window.history, 'length', {
        value: 1,
        writable: true,
        configurable: true,
      });

      window.history.pushState({}, '', '/non-existent-universe');
      render(
        <RouterProvider>
          <NotFoundPage />
        </RouterProvider>
      );

      const backBtn = screen.getByTestId('not-found-back-btn');
      fireEvent.click(backBtn);

      expect(window.location.pathname).toBe('/app');
    });

    it('3.3 registers and unregisters PomoNativeBack hardware bridge', () => {
      const setCanGoBackInAppMock = vi.fn();
      (window as any).PomoNativeBack = {
        setCanGoBackInApp: setCanGoBackInAppMock,
      };

      const { unmount } = render(
        <RouterProvider>
          <NotFoundPage />
        </RouterProvider>
      );

      expect(setCanGoBackInAppMock).toHaveBeenCalledWith(true);

      unmount();
      expect(setCanGoBackInAppMock).toHaveBeenCalledWith(false);
    });

    it('3.4 responds to pomofocus:native-back custom event by navigating back', () => {
      Object.defineProperty(window.history, 'length', {
        value: 1,
        writable: true,
        configurable: true,
      });

      render(
        <RouterProvider>
          <NotFoundPage />
        </RouterProvider>
      );

      act(() => {
        window.dispatchEvent(new CustomEvent('pomofocus:native-back'));
      });

      expect(window.location.pathname).toBe('/app');
    });

    it('3.5 workspace and home action buttons navigate properly', () => {
      render(
        <RouterProvider>
          <NotFoundPage />
        </RouterProvider>
      );

      const backWorkspaceBtn = screen.getByTestId('404-btn-back-workspace');
      fireEvent.click(backWorkspaceBtn);
      expect(window.location.pathname).toBe('/app');

      const homeBtn = screen.getByTestId('404-btn-home');
      fireEvent.click(homeBtn);
      expect(window.location.pathname).toBe('/');
    });

    it('3.6 rigorously enforces ZERO raw emojis in button texts across NotFoundPage', () => {
      const { container } = render(
        <RouterProvider>
          <NotFoundPage />
        </RouterProvider>
      );

      const allButtons = container.querySelectorAll('button');
      expect(allButtons.length).toBeGreaterThan(0);

      // Regex matching common emojis or legacy timer/home emojis (⏱, 🏠, 🍅, 🚀, etc.)
      const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

      allButtons.forEach((btn) => {
        const text = btn.textContent || '';
        expect(text).not.toContain('⏱');
        expect(text).not.toContain('🏠');
        expect(text).not.toContain('🍅');
        expect(emojiRegex.test(text)).toBe(false);
      });
    });
  });

  // =========================================================================
  // ATTACK VECTOR 4: CookieConsentBanner 320px Viewport & Button Wrapping
  // =========================================================================
  describe('Vector 4: CookieConsentBanner on 320px Viewport & Button Wrapping', () => {
    it('4.1 enforces whitespace-nowrap and shrink-0 on all action buttons on 320px screen', () => {
      vi.useFakeTimers();
      window.innerWidth = 320;

      render(
        <RouterProvider>
          <CookieConsentBanner />
        </RouterProvider>
      );

      act(() => {
        vi.advanceTimersByTime(850);
      });

      const banner = screen.getByTestId('cookie-consent-banner');
      expect(banner).toBeDefined();

      const acceptBtn = screen.getByTestId('consent-accept-btn');
      const declineBtn = screen.getByTestId('consent-decline-btn');
      const detailsBtn = screen.getByTestId('consent-details-btn');

      // Assert whitespace-nowrap to prevent text wrapping across multiple lines
      expect(acceptBtn.className).toContain('whitespace-nowrap');
      expect(acceptBtn.className).toContain('shrink-0');
      expect(acceptBtn.textContent).toBe('Đồng ý & Tiếp tục');

      expect(declineBtn.className).toContain('whitespace-nowrap');
      expect(declineBtn.className).toContain('shrink-0');
      expect(declineBtn.textContent).toBe('Từ chối');

      expect(detailsBtn.className).toContain('whitespace-nowrap');
      expect(detailsBtn.className).toContain('shrink-0');
      expect(detailsBtn.textContent).toContain('Xem chính sách');

      vi.useRealTimers();
    });

    it('4.2 completely suppresses CookieConsentBanner on native Capacitor platform', () => {
      vi.useFakeTimers();
      (window as any).Capacitor = {
        isNativePlatform: () => true,
        getPlatform: () => 'android',
      };

      const { container } = render(
        <RouterProvider>
          <CookieConsentBanner />
        </RouterProvider>
      );

      act(() => {
        vi.advanceTimersByTime(1500);
      });

      expect(screen.queryByTestId('cookie-consent-banner')).toBeNull();
      expect(container.firstChild).toBeNull();

      vi.useRealTimers();
    });

    it('4.3 closes banner on close button without setting accepted status (Law 91/2025/QH15)', () => {
      vi.useFakeTimers();
      render(
        <RouterProvider>
          <CookieConsentBanner />
        </RouterProvider>
      );

      act(() => {
        vi.advanceTimersByTime(850);
      });

      const closeBtn = screen.getByTestId('consent-close-btn');
      fireEvent.click(closeBtn);

      expect(screen.queryByTestId('cookie-consent-banner')).toBeNull();
      expect(localStorage.getItem(CONSENT_STORAGE_KEY)).toBeNull();

      vi.useRealTimers();
    });
  });
});
