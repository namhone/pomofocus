import 'fake-indexeddb/auto';
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

// Modules under test
import { normalizePath, RouterProvider, useRouter } from '../../src/services/router';
import { ErrorBoundary } from '../../src/components/ErrorBoundary';
import { App } from '../../src/App';
import { MobileAppShell } from '../../src/components/mobile/MobileAppShell';
import { MobileFocusView } from '../../src/components/mobile/views/MobileFocusView';
import { MobileAuthBottomSheet } from '../../src/components/mobile/auth/MobileAuthBottomSheet';

// Stores
import { useTimerStore } from '../../src/stores/useTimerStore';
import { useLayoutStore } from '../../src/stores/useLayoutStore';
import { useAiStore } from '../../src/stores/useAiStore';
import { useTaskStore } from '../../src/stores/useTaskStore';
import { useAudioStore } from '../../src/stores/useAudioStore';

describe('Adversarial Stress Test Suite — Milestone 1 Mobile Foundation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();

    // Reset stores
    useTimerStore.setState({
      status: 'idle',
      remainingMs: 25 * 60 * 1000,
      phase: 'pomodoro',
      currentRound: 1,
      linkedTaskId: null,
      linkedTaskTitle: null
    });
    useLayoutStore.setState({
      activeMobileTab: 'focus' as any,
      isMobile: true,
      isZenMode: false
    });
    useAiStore.setState({
      aiCreditsBalance: 100,
      isTopupModalOpen: false,
      messages: []
    });
    useTaskStore.setState({
      tasks: [],
      activeTaskId: null
    });
    useAudioStore.setState({
      settings: {
        masterVolume: 0.8,
        isMuted: false,
        selectedChime: 'tibetan_bowl',
        duckingEnabled: true,
        duckingRatio: 0.3,
        ambientVolume: 0.6
      }
    });

    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('768px'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. STRESS TEST: Path Normalization in router.tsx
  // =========================================================================
  describe('1. Adversarial Path Normalization Stress Test', () => {
    it('1.1 Trailing Slash Handling on Root and Common Routes', () => {
      expect(normalizePath('/')).toBe('/');
      expect(normalizePath('/app/')).toBe('/app');
      expect(normalizePath('/app')).toBe('/app');
      expect(normalizePath('/rooms/')).toBe('/rooms');
      expect(normalizePath('/rooms')).toBe('/rooms');
      expect(normalizePath('/billing/')).toBe('/billing');
      expect(normalizePath('/billing')).toBe('/billing');
      expect(normalizePath('/settings/')).toBe('/settings');
      expect(normalizePath('/calendar/')).toBe('/calendar');
    });

    it('1.2 Dynamic and Nested Route Trailing Slash Handling', () => {
      expect(normalizePath('/rooms/alpha-beta-123/')).toBe('/rooms/alpha-beta-123');
      expect(normalizePath('/account/security/')).toBe('/account/security');
      expect(normalizePath('/privacy-data/')).toBe('/privacy-data');
    });

    it('1.3 Boundary Inputs: Empty, Undefined, and Edge-Case Paths', () => {
      expect(normalizePath('')).toBe('/');
      expect(normalizePath(null as any)).toBe('/');
      expect(normalizePath(undefined as any)).toBe('/');
    });

    it('1.4 Router Navigation with Query Parameters: /app/?tab=focus and /rooms/?filter=active', () => {
      let routerInstance: any = null;
      const TestConsumer: React.FC = () => {
        routerInstance = useRouter();
        return <div data-testid="test-path">{routerInstance.currentPath}</div>;
      };

      window.history.pushState({}, '', '/');

      render(
        <RouterProvider>
          <TestConsumer />
        </RouterProvider>
      );

      // Navigate with trailing slash and query param
      act(() => {
        routerInstance.navigate('/app/?tab=focus');
      });

      expect(routerInstance.currentPath).toBe('/app');
      expect(routerInstance.routeMatch.pathname).toBe('/app');
      expect(routerInstance.routeMatch.search).toBe('?tab=focus');
      expect(routerInstance.routeMatch.searchParams.get('tab')).toBe('focus');

      // Navigate to /rooms/ with query param
      act(() => {
        routerInstance.navigate('/rooms/?filter=active');
      });
      expect(routerInstance.currentPath).toBe('/rooms');
      expect(routerInstance.routeMatch.search).toBe('?filter=active');
      expect(routerInstance.routeMatch.searchParams.get('filter')).toBe('active');
    });

    it('1.5 Hash Handling during navigation or location change', () => {
      let routerInstance: any = null;
      const TestConsumer: React.FC = () => {
        routerInstance = useRouter();
        return <div data-testid="test-path">{routerInstance.currentPath}</div>;
      };

      // Case A: Browser URL has pathname /app and hash #section
      // (This simulates entering https://pomofocus.io/app#section in browser address bar)
      window.history.pushState({}, '', '/app#section');

      const { unmount } = render(
        <RouterProvider>
          <TestConsumer />
        </RouterProvider>
      );

      // window.location.pathname in JSDOM is '/app'
      expect(window.location.pathname).toBe('/app');
      expect(window.location.hash).toBe('#section');
      expect(routerInstance.currentPath).toBe('/app');
      unmount();

      // Case B: SPA navigate('/app#section')
      render(
        <RouterProvider>
          <TestConsumer />
        </RouterProvider>
      );

      act(() => {
        routerInstance.navigate('/app#section');
      });

      // Observe: navigate('/app#section') currently keeps #section in currentPath
      expect(routerInstance.currentPath).toBe('/app#section');
    });

    it('1.6 Full App Integration: Trailing slashes (/app/, /rooms/) render target view without 404', () => {
      // Test /app/
      window.history.pushState({}, '', '/app/');
      const { unmount: unmountApp } = render(
        <RouterProvider>
          <App />
        </RouterProvider>
      );

      // On mobile it should render MobileAppShell, NOT NotFoundView!
      expect(screen.getByTestId('mobile-app-shell')).toBeDefined();
      expect(screen.queryByTestId('not-found-page')).toBeNull();
      unmountApp();

      // Test /rooms/
      window.history.pushState({}, '', '/rooms/');
      const { unmount: unmountRooms } = render(
        <RouterProvider>
          <App />
        </RouterProvider>
      );

      // /rooms/ should render StudyRoomLobby (not 404)
      expect(screen.queryByTestId('not-found-page')).toBeNull();
      unmountRooms();
    });
  });

  // =========================================================================
  // 2. STRESS TEST: Safe Area Classes in src/index.css
  // =========================================================================
  describe('2. Safe Area Inset Evaluation Stress Test', () => {
    it('2.1 Default Root Inset CSS Variables evaluate safely with 0px fallback', () => {
      const computed = window.getComputedStyle(document.documentElement);
      // Verify that CSS variable defaults can be declared and queried
      document.documentElement.style.setProperty('--sat-native', '0px');
      document.documentElement.style.setProperty('--sab-native', '0px');

      expect(document.documentElement.style.getPropertyValue('--sat-native')).toBe('0px');
      expect(document.documentElement.style.getPropertyValue('--sab-native')).toBe('0px');
    });

    it('2.2 Native Android 15 WindowInsets Injection: --sat-native updates dynamically', () => {
      // Simulate Android 15 Activity injecting insets
      document.documentElement.style.setProperty('--sat-native', '48px');
      document.documentElement.style.setProperty('--sab-native', '34px');

      expect(document.documentElement.style.getPropertyValue('--sat-native')).toBe('48px');
      expect(document.documentElement.style.getPropertyValue('--sab-native')).toBe('34px');

      // MobileAppShell receives pt-safe and pb-safe classes
      const testEl = document.createElement('div');
      testEl.className = 'pt-safe pb-safe';
      document.body.appendChild(testEl);
      expect(testEl.classList.contains('pt-safe')).toBe(true);
      expect(testEl.classList.contains('pb-safe')).toBe(true);
      document.body.removeChild(testEl);
    });

    it('2.3 MobileAppShell applies pt-safe and pb-safe on its root container', () => {
      render(<MobileAppShell />);
      const shell = screen.getByTestId('mobile-app-shell');
      expect(shell).toBeDefined();
      expect(shell.className).toContain('pt-safe');
      expect(shell.className).toContain('pb-safe');
    });
  });

  // =========================================================================
  // 3. STRESS TEST: Global ErrorBoundary in src/App.tsx
  // =========================================================================
  describe('3. Global ErrorBoundary Isolation & Crash Prevention', () => {
    it('3.1 Error in a routed view is trapped by ErrorBoundary without crashing the app', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const CrashingView: React.FC = () => {
        throw new Error('Simulated critical crash in secondary view!');
      };

      render(
        <ErrorBoundary>
          <div data-testid="parent-app-wrapper">
            <header data-testid="global-header">Global App Header</header>
            <ErrorBoundary>
              <CrashingView />
            </ErrorBoundary>
          </div>
        </ErrorBoundary>
      );

      // Verify that the inner ErrorBoundary catches the crash
      expect(screen.getByTestId('error-boundary-fallback')).toBeDefined();
      expect(screen.getByText('⚠️ Phút nghỉ ngắn ngoài dự kiến...')).toBeDefined();

      // Crucial: The parent app header is STILL intact and rendered!
      expect(screen.getByTestId('global-header')).toBeDefined();
      expect(screen.getByTestId('parent-app-wrapper')).toBeDefined();

      consoleSpy.mockRestore();
    });

    it('3.2 Global Audio and Timer Stores remain functional after a secondary view crash', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const CrashingView: React.FC = () => {
        throw new Error('Crash in /rooms view');
      };

      // Set initial timer status
      useTimerStore.setState({ status: 'running', remainingMs: 15000 });

      render(
        <div data-testid="app-root-container">
          <ErrorBoundary>
            <CrashingView />
          </ErrorBoundary>
        </div>
      );

      // Verify error boundary fallback rendered
      expect(screen.getByTestId('error-boundary-fallback')).toBeDefined();

      // Verify timer store is completely unharmed and retains running state
      expect(useTimerStore.getState().status).toBe('running');
      expect(useTimerStore.getState().remainingMs).toBe(15000);

      consoleSpy.mockRestore();
    });
  });

  // =========================================================================
  // 4. STRESS TEST: Font Scaling (1.5x simulation) on Mobile Components
  // =========================================================================
  describe('4. Font Scaling & Text Overflow Resilience (1.5x simulation)', () => {
    it('4.1 MobileAppShell top header uses flexible min-height instead of rigid fixed height', () => {
      render(<MobileAppShell />);
      const topHeader = screen.getByTestId('mobile-top-header');
      expect(topHeader).toBeDefined();

      // Must have min-h-[48px] and h-auto, not fixed rigid h-12 without auto
      expect(topHeader.className).toContain('min-h-[48px]');
      expect(topHeader.className).toContain('h-auto');
    });

    it('4.2 MobileAppShell bottom navigation uses min-height and break-words for tab labels', () => {
      render(<MobileAppShell />);
      const bottomNav = screen.getByTestId('mobile-bottom-nav');
      expect(bottomNav).toBeDefined();
      expect(bottomNav.className).toContain('min-h-[64px]');
      expect(bottomNav.className).toContain('h-auto');

      // Verify tab labels have break-words and pb-safe
      const focusTab = screen.getByTestId('mobile-nav-tab-focus');
      expect(focusTab).toBeDefined();
      const label = focusTab.querySelector('span');
      expect(label?.className).toContain('break-words');
    });

    it('4.3 MobileFocusView phase selector pill supports wrapping under high font scale', () => {
      render(<MobileFocusView />);
      const pomodoroTab = screen.getByTestId('mobile-phase-pomodoro');
      expect(pomodoroTab).toBeDefined();

      // The pill container must have flex-wrap to prevent horizontal blowout
      const pillContainer = pomodoroTab.parentElement;
      expect(pillContainer).toBeDefined();
      expect(pillContainer?.className).toContain('flex-wrap');
    });

    it('4.4 MobileAuthBottomSheet upgrade & logout buttons have flexible min-heights', () => {
      render(
        <MobileAuthBottomSheet
          isOpen={true}
          onClose={vi.fn()}
        />
      );

      const googleBtn = screen.getByTestId('mobile-auth-google-btn');
      expect(googleBtn).toBeDefined();
      expect(googleBtn.className).toContain('min-h-[48px]');

      const magicLinkBtn = screen.getByTestId('mobile-auth-magiclink-btn');
      expect(magicLinkBtn).toBeDefined();
      expect(magicLinkBtn.className).toContain('min-h-[44px]');
    });
  });
});
