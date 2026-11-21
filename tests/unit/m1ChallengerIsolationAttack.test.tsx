import 'fake-indexeddb/auto';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { PlatformHeader } from '../../src/components/PlatformHeader';
import { SharedFooter } from '../../src/components/SharedFooter';
import { MobileSubViewLayout } from '../../src/components/mobile/MobileSubViewLayout';
import { CookieConsentBanner, CONSENT_STORAGE_KEY } from '../../src/components/CookieConsentBanner';
import { LegalViews } from '../../src/components/LegalViews';
import { BillingView } from '../../src/components/BillingView';
import { ProfileView } from '../../src/components/ProfileView';
import { DedicatedCalendarView } from '../../src/components/DedicatedCalendarView';
import { StudyRoomLobby } from '../../src/components/StudyRoomLobby';
import { HelpView } from '../../src/components/HelpView';
import { ContactView } from '../../src/components/ContactView';
import { DashboardView } from '../../src/components/DashboardView';
import { PrivacyDataView } from '../../src/components/PrivacyDataView';
import { AccountSecurityView } from '../../src/components/AccountSecurityView';
import { NotFoundPage } from '../../src/pages/NotFoundPage';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useAiStore } from '../../src/stores/useAiStore';

const mockNavigate = vi.fn();
let mockCurrentRoute = { pathname: '/terms', path: '/terms', query: {} };

vi.mock('../../src/services/router', () => ({
  useRouter: () => ({
    currentRoute: mockCurrentRoute,
    navigate: mockNavigate,
  }),
}));

describe('Milestone M1 Challenger Adversarial Attack Suite: APK Web Isolation & Navigation Shell', () => {
  const setNativeCapacitorEnv = (isNative: boolean = true) => {
    if (isNative) {
      (window as any).Capacitor = {
        isNativePlatform: () => true,
        getPlatform: () => 'android',
      };
    } else {
      (window as any).Capacitor = {
        isNativePlatform: () => false,
        getPlatform: () => 'web',
      };
    }
  };

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
    delete (window as any).Capacitor;
    delete (window as any).PomoNativeBack;

    mockCurrentRoute = { pathname: '/app', path: '/app', query: {} };

    // Setup media & window mocks
    window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    window.HTMLMediaElement.prototype.pause = vi.fn();
    window.HTMLMediaElement.prototype.load = vi.fn();
    window.scrollTo = vi.fn();

    // Default test authenticated user
    useAuthStore.setState({
      user: {
        id: 'challenger_test_user_001',
        email: 'challenger.audit@pomofocus.vn',
        displayName: 'Challenger Agent',
        avatarUrl: '',
        plan: 'free',
        isPro: false,
        isLifetime: false,
      } as any,
      isAuthenticated: true,
      isPro: false,
      isLifetime: false,
      planLabel: 'Free Plan',
    });

    useAiStore.setState({
      aiCreditsBalance: 50,
      isOpen: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (window as any).Capacitor;
    delete (window as any).PomoNativeBack;
  });

  // =========================================================================
  // VECTOR 1: Defense-In-Depth Zero Leakage of Web Header & Footer
  // =========================================================================
  describe('Vector 1: Defense-in-Depth Suppression of Web Header and Footer', () => {
    it('1.1 PlatformHeader returns null when Capacitor is native platform, even when mounted directly', () => {
      setNativeCapacitorEnv(true);
      const { container } = render(<PlatformHeader />);
      expect(container.firstChild).toBeNull();
      expect(screen.queryByTestId('platform-header')).toBeNull();
    });

    it('1.2 SharedFooter returns null when Capacitor is native platform, even when mounted directly', () => {
      setNativeCapacitorEnv(true);
      const { container } = render(<SharedFooter />);
      expect(container.firstChild).toBeNull();
      expect(screen.queryByText('Tải App Android (APK)')).toBeNull();
      expect(screen.queryByText(/Bản quyền thuộc về PomoFocus/i)).toBeNull();
    });

    it('1.3 PlatformHeader returns null on native even if isDownloadPage prop is forced true', () => {
      setNativeCapacitorEnv(true);
      const { container } = render(<PlatformHeader isDownloadPage={true} />);
      expect(container.firstChild).toBeNull();
    });
  });

  // =========================================================================
  // VECTOR 2: Secondary Views Mounting & Isolation Under Native Mode
  // =========================================================================
  describe('Vector 2: Secondary Views Mounting Under Native APK Mode', () => {
    const assertNativeIsolation = (container: HTMLElement) => {
      // 1. Mobile TopBar must exist
      const topbar = screen.getByTestId('mobile-subview-topbar');
      expect(topbar).toBeDefined();
      expect(topbar.className).toContain('pt-safe');

      // 2. PlatformHeader and SharedFooter must NOT be rendered
      expect(container.querySelector('header[data-testid="platform-header"]')).toBeNull();
      expect(screen.queryByText('Tải App Android (APK)')).toBeNull();
      expect(screen.queryByText('Cài đặt PWA')).toBeNull();
      expect(container.querySelector('footer')).toBeNull();
    };

    it('2.1 LegalViews in native mode has TopBar, no web chrome, and executes back navigation', () => {
      setNativeCapacitorEnv(true);
      mockCurrentRoute = { pathname: '/terms', path: '/terms', query: {} };

      const { container } = render(<LegalViews initialTab="terms" />);
      assertNativeIsolation(container);

      const backBtn = screen.getByTestId('mobile-subview-back-btn');
      expect(backBtn).toBeDefined();
      expect(backBtn.className).toContain('min-w-[44px]');
      expect(backBtn.className).toContain('min-h-[44px]');

      fireEvent.click(backBtn);
      expect(mockNavigate).toHaveBeenCalledWith('/app');
    });

    it('2.2 BillingView in native mode has TopBar, no web chrome, and executes back navigation', () => {
      setNativeCapacitorEnv(true);
      mockCurrentRoute = { pathname: '/billing', path: '/billing', query: {} };

      const { container } = render(<BillingView />);
      assertNativeIsolation(container);

      const backBtn = screen.getByTestId('billing-back-btn');
      expect(backBtn).toBeDefined();
      fireEvent.click(backBtn);
      expect(mockNavigate).toHaveBeenCalledWith('/app');
    });

    it('2.3 ProfileView in native mode has TopBar, no web chrome, and executes back navigation', () => {
      setNativeCapacitorEnv(true);
      mockCurrentRoute = { pathname: '/profile', path: '/profile', query: {} };

      const { container } = render(<ProfileView />);
      assertNativeIsolation(container);

      const backBtn = screen.getByTestId('back-to-workspace-btn');
      expect(backBtn).toBeDefined();
      fireEvent.click(backBtn);
      expect(mockNavigate).toHaveBeenCalledWith('/app');
    });

    it('2.4 DedicatedCalendarView in native mode has TopBar, no web chrome, and executes back navigation', () => {
      setNativeCapacitorEnv(true);
      mockCurrentRoute = { pathname: '/calendar', path: '/calendar', query: {} };

      const { container } = render(<DedicatedCalendarView />);
      assertNativeIsolation(container);

      const backBtn = screen.getByTestId('mobile-subview-back-btn');
      expect(backBtn).toBeDefined();
      fireEvent.click(backBtn);
      expect(mockNavigate).toHaveBeenCalledWith('/app');
    });

    it('2.5 StudyRoomLobby in native mode has TopBar, no web chrome, and executes back navigation', () => {
      setNativeCapacitorEnv(true);
      mockCurrentRoute = { pathname: '/rooms', path: '/rooms', query: {} };

      const { container } = render(<StudyRoomLobby />);
      assertNativeIsolation(container);

      const backBtn = screen.getByTestId('mobile-subview-back-btn');
      expect(backBtn).toBeDefined();
      fireEvent.click(backBtn);
      expect(mockNavigate).toHaveBeenCalledWith('/app');
    });

    it('2.6 HelpView in native mode has TopBar, no web chrome, and executes back navigation', () => {
      setNativeCapacitorEnv(true);
      mockCurrentRoute = { pathname: '/help', path: '/help', query: {} };

      const { container } = render(<HelpView />);
      assertNativeIsolation(container);

      const backBtn = screen.getByTestId('mobile-subview-back-btn');
      expect(backBtn).toBeDefined();
      fireEvent.click(backBtn);
      expect(mockNavigate).toHaveBeenCalledWith('/app');
    });

    it('2.7 ContactView in native mode has TopBar, no web chrome, and executes back navigation', () => {
      setNativeCapacitorEnv(true);
      mockCurrentRoute = { pathname: '/contact', path: '/contact', query: {} };

      const { container } = render(<ContactView />);
      assertNativeIsolation(container);

      const backBtn = screen.getByTestId('mobile-subview-back-btn');
      expect(backBtn).toBeDefined();
      fireEvent.click(backBtn);
      expect(mockNavigate).toHaveBeenCalledWith('/app');
    });

    it('2.8 DashboardView in native mode has TopBar, no web chrome, and executes back navigation', () => {
      setNativeCapacitorEnv(true);
      mockCurrentRoute = { pathname: '/dashboard', path: '/dashboard', query: {} };

      const { container } = render(<DashboardView />);
      assertNativeIsolation(container);

      const backBtn = screen.getByTestId('mobile-subview-back-btn');
      expect(backBtn).toBeDefined();
      fireEvent.click(backBtn);
      expect(mockNavigate).toHaveBeenCalledWith('/app');
    });

    it('2.9 PrivacyDataView in native mode has TopBar, no web chrome, and executes back navigation', () => {
      setNativeCapacitorEnv(true);
      mockCurrentRoute = { pathname: '/privacy-data', path: '/privacy-data', query: {} };

      const { container } = render(<PrivacyDataView />);
      assertNativeIsolation(container);

      const backBtn = screen.getByTestId('back-to-workspace-btn');
      expect(backBtn).toBeDefined();
      fireEvent.click(backBtn);
      expect(mockNavigate).toHaveBeenCalledWith('/app');
    });

    it('2.10 AccountSecurityView in native mode has TopBar, no web chrome, and executes back navigation', () => {
      setNativeCapacitorEnv(true);
      mockCurrentRoute = { pathname: '/account/security', path: '/account/security', query: {} };

      const { container } = render(<AccountSecurityView />);
      assertNativeIsolation(container);

      const backBtn = screen.getByTestId('back-to-workspace-btn');
      expect(backBtn).toBeDefined();
      fireEvent.click(backBtn);
      expect(mockNavigate).toHaveBeenCalledWith('/app');
    });
  });

  // =========================================================================
  // VECTOR 3: Adversarial Viewport Variations (Landscape / Tablet Native Mode)
  // =========================================================================
  describe('Vector 3: Adversarial Tablet / Foldable Viewport on Native APK', () => {
    it('3.1 Large tablet screen (1280x800) under native APK still mounts TopBar and suppresses web header/footer', () => {
      setNativeCapacitorEnv(true);

      // Simulate a wide tablet / foldable viewport
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1280 });
      Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 800 });

      const customBack = vi.fn();
      const { container } = render(
        <MobileSubViewLayout
          title="Máy Tính Bảng Android"
          subtitle="Viewport 1280px"
          onBack={customBack}
        >
          <div data-testid="tablet-content">Nội dung màn hình máy tính bảng</div>
        </MobileSubViewLayout>
      );

      // In native mode, even with 1280px width, TopBar must be shown
      const topbar = screen.getByTestId('mobile-subview-topbar');
      expect(topbar).toBeDefined();

      // PlatformHeader and SharedFooter must NOT be present
      expect(screen.queryByTestId('platform-header')).toBeNull();
      expect(container.querySelector('footer')).toBeNull();

      // Back button click works
      const backBtn = screen.getByTestId('mobile-subview-back-btn');
      fireEvent.click(backBtn);
      expect(customBack).toHaveBeenCalledTimes(1);
    });

    it('3.2 Custom rightAction slot renders correctly in place of default workspace button', () => {
      setNativeCapacitorEnv(true);

      render(
        <MobileSubViewLayout
          title="Custom Right Action View"
          rightAction={<button data-testid="custom-share-btn">Chia sẻ</button>}
        >
          <div>Nội dung</div>
        </MobileSubViewLayout>
      );

      expect(screen.getByTestId('custom-share-btn')).toBeDefined();
      expect(screen.queryByTestId('mobile-subview-workspace-btn')).toBeNull();
    });
  });

  // =========================================================================
  // VECTOR 4: CookieConsentBanner Native Suppression & Timer Resilience
  // =========================================================================
  describe('Vector 4: CookieConsentBanner Adversarial Timer & Storage Attack', () => {
    it('4.1 CookieConsentBanner NEVER renders after 10,000ms timer ticks when Capacitor native', () => {
      vi.useFakeTimers();
      setNativeCapacitorEnv(true);

      const { container } = render(<CookieConsentBanner />);

      // Advance timers by massive amount
      act(() => {
        vi.advanceTimersByTime(10000);
      });

      expect(screen.queryByTestId('cookie-consent-banner')).toBeNull();
      expect(container.firstChild).toBeNull();
      vi.useRealTimers();
    });

    it('4.2 CookieConsentBanner remains null even if localStorage consent key is deleted or missing', () => {
      vi.useFakeTimers();
      setNativeCapacitorEnv(true);
      localStorage.removeItem(CONSENT_STORAGE_KEY);

      render(<CookieConsentBanner />);

      act(() => {
        vi.advanceTimersByTime(2500);
      });

      expect(screen.queryByTestId('cookie-consent-banner')).toBeNull();
      vi.useRealTimers();
    });

    it('4.3 CookieConsentBanner on desktop web displays with whitespace-nowrap shrink-0 classes', () => {
      vi.useFakeTimers();
      setNativeCapacitorEnv(false);

      render(<CookieConsentBanner />);

      act(() => {
        vi.advanceTimersByTime(900);
      });

      const acceptBtn = screen.getByTestId('consent-accept-btn');
      const declineBtn = screen.getByTestId('consent-decline-btn');
      const detailsBtn = screen.getByTestId('consent-details-btn');

      expect(acceptBtn.className).toContain('whitespace-nowrap');
      expect(acceptBtn.className).toContain('shrink-0');
      expect(declineBtn.className).toContain('whitespace-nowrap');
      expect(declineBtn.className).toContain('shrink-0');
      expect(detailsBtn.className).toContain('whitespace-nowrap');
      expect(detailsBtn.className).toContain('shrink-0');

      vi.useRealTimers();
    });
  });

  // =========================================================================
  // VECTOR 5: NotFoundPage Hardware Back & Bridge Integration
  // =========================================================================
  describe('Vector 5: NotFoundPage Back Navigation and Android Native Back Bridge', () => {
    it('5.1 NotFoundPage back button triggers router navigate to /app when window.history has no prior entry', () => {
      render(<NotFoundPage />);

      const backBtn = screen.getByTestId('not-found-back-btn');
      expect(backBtn).toBeDefined();

      fireEvent.click(backBtn);
      expect(mockNavigate).toHaveBeenCalledWith('/app');
    });

    it('5.2 NotFoundPage correctly sets PomoNativeBack.setCanGoBackInApp on lifecycle', () => {
      const mockSetCanGoBackInApp = vi.fn();
      (window as any).PomoNativeBack = {
        setCanGoBackInApp: mockSetCanGoBackInApp,
      };

      const { unmount } = render(<NotFoundPage />);
      expect(mockSetCanGoBackInApp).toHaveBeenCalledWith(true);

      unmount();
      expect(mockSetCanGoBackInApp).toHaveBeenCalledWith(false);
    });

    it('5.3 NotFoundPage listens to pomofocus:native-back custom event and navigates', () => {
      render(<NotFoundPage />);

      act(() => {
        window.dispatchEvent(new CustomEvent('pomofocus:native-back'));
      });

      expect(mockNavigate).toHaveBeenCalledWith('/app');
    });

    it('5.4 NotFoundPage buttons are clean of raw emoji icons', () => {
      render(<NotFoundPage />);

      const workspaceBtn = screen.getByTestId('404-btn-back-workspace');
      const homeBtn = screen.getByTestId('404-btn-home');

      expect(workspaceBtn.textContent).not.toMatch(/[\u{1F300}-\u{1F9FF}]/u);
      expect(homeBtn.textContent).not.toMatch(/[\u{1F300}-\u{1F9FF}]/u);
    });
  });
});
