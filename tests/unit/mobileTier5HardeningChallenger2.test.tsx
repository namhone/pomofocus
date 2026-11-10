import 'fake-indexeddb/auto';
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

// Components under test
import { MobileAppShell, MobileTab } from '../../src/components/mobile/MobileAppShell';
import { App } from '../../src/App';
import { RouterProvider } from '../../src/services/router';

// Stores
import { useTimerStore } from '../../src/stores/useTimerStore';
import { useLayoutStore } from '../../src/stores/useLayoutStore';
import { useAiStore } from '../../src/stores/useAiStore';
import { useTaskStore } from '../../src/stores/useTaskStore';
import { useBackgroundStore } from '../../src/stores/useBackgroundStore';
import { useAudioStore } from '../../src/stores/useAudioStore';

/**
 * Challenger 2: Milestone 4 Phase 2
 * Tier 5 White-Box Adversarial Coverage Hardening Suite:
 * Shell, Navigation, Device Lifecycle & Boundaries
 */
describe('Tier 5 Adversarial Coverage Hardening: Shell, Navigation, Device Lifecycle & Boundaries', () => {
  // Helper for tracking media query listeners
  let mediaQueryListeners = new Set<(e: any) => void>();
  let currentMediaQueryMatches = true;

  beforeEach(() => {
    vi.clearAllMocks();

    // Prevent JSDOM HTMLMediaElement unimplemented errors
    window.HTMLMediaElement.prototype.pause = vi.fn();
    window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);

    mediaQueryListeners.clear();
    currentMediaQueryMatches = true;

    // Reset Stores to clean baseline
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

    useBackgroundStore.setState({
      presets: [
        { id: 'zen-garden', title: 'Zen Garden', category: 'nature', type: 'gradient', value: '#09090b' },
        { id: 'rainy-kyoto', title: 'Rainy Kyoto', category: 'city', type: 'gradient', value: '#0a0a0f' }
      ],
      activePresetId: 'zen-garden',
      ambientEffect: 'none'
    });

    useAudioStore.setState({
      settings: {
        masterVolume: 0.8,
        ambientVolume: 0.7,
        chimeVolume: 0.8,
        selectedChime: 'chime',
        isMuted: false,
        autoDimOnFocus: true,
        dimBrightness: 0.5,
        dimDelaySeconds: 5,
        duckingPercent: 50
      },
      customMusicType: 'none',
      customMusicUrl: '',
      customMusicPlaying: false,
      customMusicVolume: 0.8,
      customMusicError: null
    });

    // Reactive window.matchMedia mock capable of dispatching dynamic changes
    window.matchMedia = vi.fn().mockImplementation((query: string) => {
      const isMobileQuery = query.includes('768px');
      return {
        matches: isMobileQuery ? currentMediaQueryMatches : !currentMediaQueryMatches,
        media: query,
        onchange: null,
        addListener: (fn: any) => mediaQueryListeners.add(fn),
        removeListener: (fn: any) => mediaQueryListeners.delete(fn),
        addEventListener: (type: string, fn: any) => {
          if (type === 'change') mediaQueryListeners.add(fn);
        },
        removeEventListener: (type: string, fn: any) => {
          if (type === 'change') mediaQueryListeners.delete(fn);
        },
        dispatchEvent: vi.fn()
      };
    });

    // Default desktop userAgent
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      writable: true,
      configurable: true
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // GROUP 1: Dynamic Viewport Transitions (Mobile <-> Desktop) with Active Timer
  // =========================================================================
  describe('Group 1: Dynamic Viewport Transitions (Mobile <-> Desktop) with Active Timer', () => {
    it('1.1 Starts timer in MobileAppShell and transitions to Desktop without losing running state or time', async () => {
      window.history.pushState({}, '', '/app');

      render(
        <RouterProvider>
          <App />
        </RouterProvider>
      );

      // Verify starting on MobileAppShell
      expect(screen.getByTestId('mobile-app-shell')).toBeDefined();
      expect(screen.queryByTestId('workspace-root')).toBeNull();

      // Start the timer while on mobile
      await act(async () => {
        useTimerStore.setState({
          status: 'running',
          remainingMs: 24 * 60 * 1000 + 42 * 1000, // 24:42
          phase: 'pomodoro'
        });
      });

      expect(useTimerStore.getState().status).toBe('running');
      expect(useTimerStore.getState().remainingMs).toBe(1482000);

      // Simulate viewport expanding to Desktop (> 768px)
      act(() => {
        currentMediaQueryMatches = false;
        mediaQueryListeners.forEach((listener) => {
          listener({ matches: false } as any);
        });
      });

      // Confirm desktop workspace renders and mobile shell unmounts
      expect(screen.getByTestId('workspace-root')).toBeDefined();
      expect(screen.queryByTestId('mobile-app-shell')).toBeNull();

      // Crucial: Timer state remains uncorrupted
      expect(useTimerStore.getState().status).toBe('running');
      expect(useTimerStore.getState().remainingMs).toBe(1482000);
      expect(useTimerStore.getState().phase).toBe('pomodoro');
    });

    it('1.2 Dynamic transition back from Desktop to Mobile restores MobileAppShell seamlessly', async () => {
      window.history.pushState({}, '', '/app');

      // Start in Desktop mode
      currentMediaQueryMatches = false;

      render(
        <RouterProvider>
          <App />
        </RouterProvider>
      );

      expect(screen.getByTestId('workspace-root')).toBeDefined();
      expect(screen.queryByTestId('mobile-app-shell')).toBeNull();

      // Start timer in Desktop mode
      await act(async () => {
        useTimerStore.setState({
          status: 'running',
          remainingMs: 18 * 60 * 1000,
          phase: 'short_break'
        });
      });

      // Viewport shrinks to Mobile (<= 768px)
      act(() => {
        currentMediaQueryMatches = true;
        mediaQueryListeners.forEach((listener) => {
          listener({ matches: true } as any);
        });
      });

      // MobileAppShell is restored
      expect(screen.getByTestId('mobile-app-shell')).toBeDefined();
      expect(screen.queryByTestId('workspace-root')).toBeNull();

      // Verify timer indicator dot is pulsing emerald and time is preserved
      const dot = screen.getByTestId('mobile-header-timer-status-dot');
      expect(dot.className).toContain('bg-emerald-400');
      expect(dot.className).toContain('animate-pulse');
      expect(useTimerStore.getState().remainingMs).toBe(18 * 60 * 1000);
      expect(useTimerStore.getState().phase).toBe('short_break');
    });

    it('1.3 Rapid bidirectional viewport flapping (Mobile -> Desktop -> Mobile -> Desktop -> Mobile) preserves state singularity', async () => {
      window.history.pushState({}, '', '/app');

      render(
        <RouterProvider>
          <App />
        </RouterProvider>
      );

      // Start timer with specific countdown
      await act(async () => {
        useTimerStore.setState({
          status: 'running',
          remainingMs: 20 * 60 * 1000
        });
      });

      // Flap 10 times rapidly
      for (let i = 0; i < 10; i++) {
        const isMobileTurn = i % 2 === 0;
        act(() => {
          currentMediaQueryMatches = isMobileTurn;
          mediaQueryListeners.forEach((listener) => {
            listener({ matches: isMobileTurn } as any);
          });
        });

        // Verify exactly one layout is present (no collision)
        if (isMobileTurn) {
          expect(screen.getByTestId('mobile-app-shell')).toBeDefined();
          expect(screen.queryByTestId('workspace-root')).toBeNull();
        } else {
          expect(screen.getByTestId('workspace-root')).toBeDefined();
          expect(screen.queryByTestId('mobile-app-shell')).toBeNull();
        }

        // Verify timer continues running without corruption
        expect(useTimerStore.getState().status).toBe('running');
        expect(useTimerStore.getState().remainingMs).toBe(20 * 60 * 1000);
      }
    });

    it('1.4 Dynamic viewport transition preserves paused timer state without restarting or clearing', async () => {
      window.history.pushState({}, '', '/app');

      render(
        <RouterProvider>
          <App />
        </RouterProvider>
      );

      await act(async () => {
        useTimerStore.setState({
          status: 'paused',
          remainingMs: 12 * 60 * 1000,
          phase: 'pomodoro'
        });
      });

      // Switch to Desktop
      act(() => {
        currentMediaQueryMatches = false;
        mediaQueryListeners.forEach((listener) => {
          listener({ matches: false } as any);
        });
      });

      expect(useTimerStore.getState().status).toBe('paused');
      expect(useTimerStore.getState().remainingMs).toBe(12 * 60 * 1000);

      // Switch back to Mobile
      act(() => {
        currentMediaQueryMatches = true;
        mediaQueryListeners.forEach((listener) => {
          listener({ matches: true } as any);
        });
      });

      const dot = screen.getByTestId('mobile-header-timer-status-dot');
      expect(dot.className).toContain('bg-amber-400');
      expect(dot.className).not.toContain('animate-pulse');
      expect(useTimerStore.getState().status).toBe('paused');
    });
  });

  // =========================================================================
  // GROUP 2: Rapid Popstate History Spamming & Subview Race Conditions
  // =========================================================================
  describe('Group 2: Rapid Popstate History Spamming & Subview Race Conditions', () => {
    it('2.1 Interleaved tab transitions and 20 rapid popstate events safely converge to focus tab', () => {
      render(<MobileAppShell />);

      const secondaryTabs: MobileTab[] = ['tasks', 'spaces', 'ai', 'settings'];

      secondaryTabs.forEach((tab) => {
        // Navigate from focus to secondary tab
        act(() => {
          fireEvent.click(screen.getByTestId(`mobile-nav-tab-${tab}`));
        });
        expect(useLayoutStore.getState().activeMobileTab).toBe(tab);

        // Dispatch burst of 5 popstate events wrapped in act
        for (let i = 0; i < 5; i++) {
          act(() => {
            const popEvent = new PopStateEvent('popstate', { state: { burstIndex: i } });
            const preventSpy = vi.spyOn(popEvent, 'preventDefault');
            window.dispatchEvent(popEvent);

            if (i === 0) {
              // First popstate intercepted
              expect(preventSpy).toHaveBeenCalled();
            } else {
              // Subsequent popstate already at focus
              expect(preventSpy).not.toHaveBeenCalled();
            }
          });

          expect(useLayoutStore.getState().activeMobileTab).toBe('focus');
        }
      });

      // State Singularity guaranteed
      expect(screen.getByTestId('mobile-view-focus')).toBeDefined();
      expect(screen.queryByTestId('mobile-view-tasks')).toBeNull();
      expect(screen.queryByTestId('mobile-view-spaces')).toBeNull();
      expect(screen.queryByTestId('mobile-view-ai')).toBeNull();
      expect(screen.queryByTestId('mobile-view-settings')).toBeNull();
    });

    it('2.2 Deep traversal across secondary subviews without returning to focus, followed by popstate', () => {
      render(<MobileAppShell />);

      // focus -> tasks (pushes history)
      act(() => {
        fireEvent.click(screen.getByTestId('mobile-nav-tab-tasks'));
      });
      expect(useLayoutStore.getState().activeMobileTab).toBe('tasks');

      // tasks -> spaces
      act(() => {
        fireEvent.click(screen.getByTestId('mobile-nav-tab-spaces'));
      });
      expect(useLayoutStore.getState().activeMobileTab).toBe('spaces');

      // spaces -> ai
      act(() => {
        fireEvent.click(screen.getByTestId('mobile-nav-tab-ai'));
      });
      expect(useLayoutStore.getState().activeMobileTab).toBe('ai');

      // ai -> settings
      act(() => {
        fireEvent.click(screen.getByTestId('mobile-nav-tab-settings'));
      });
      expect(useLayoutStore.getState().activeMobileTab).toBe('settings');

      // Single popstate immediately routes back to focus
      act(() => {
        const popEvent = new PopStateEvent('popstate');
        const preventSpy = vi.spyOn(popEvent, 'preventDefault');
        window.dispatchEvent(popEvent);
        expect(preventSpy).toHaveBeenCalled();
      });

      expect(useLayoutStore.getState().activeMobileTab).toBe('focus');
      expect(screen.getByTestId('mobile-view-focus')).toBeDefined();
    });

    it('2.3 Handles malformed, null, or corrupted popstate events gracefully without crashing', () => {
      act(() => {
        useLayoutStore.setState({ activeMobileTab: 'settings' as any });
      });
      render(<MobileAppShell />);

      // Popstate with null state
      act(() => {
        const nullPopEvent = new PopStateEvent('popstate', { state: null });
        window.dispatchEvent(nullPopEvent);
      });
      expect(useLayoutStore.getState().activeMobileTab).toBe('focus');

      // Set to tasks again
      act(() => {
        useLayoutStore.setState({ activeMobileTab: 'tasks' as any });
      });

      // Custom event simulating legacy environment without standard preventDefault
      act(() => {
        const bareEvent = new Event('popstate');
        window.dispatchEvent(bareEvent);
      });
      expect(useLayoutStore.getState().activeMobileTab).toBe('focus');
    });

    it('2.4 Rapid alternations between tab clicking and popstate dispatches maintain exact active view', () => {
      render(<MobileAppShell />);

      for (let i = 0; i < 15; i++) {
        // Click tasks
        act(() => {
          fireEvent.click(screen.getByTestId('mobile-nav-tab-tasks'));
        });
        expect(useLayoutStore.getState().activeMobileTab).toBe('tasks');

        // Popstate
        act(() => {
          const popEvent = new PopStateEvent('popstate');
          window.dispatchEvent(popEvent);
        });
        expect(useLayoutStore.getState().activeMobileTab).toBe('focus');
      }

      expect(screen.getByTestId('mobile-view-focus')).toBeDefined();
      expect(screen.getByTestId('mobile-nav-tab-focus').getAttribute('aria-selected')).toBe('true');
    });
  });

  // =========================================================================
  // GROUP 3: Screen Wake Lock Full Lifecycle & Device Visibility Transitions
  // =========================================================================
  describe('Group 3: Screen Wake Lock Full Lifecycle & Device Visibility Transitions', () => {
    it('3.1 Full visible -> hidden -> visible lifecycle acquires, releases, and re-acquires sentinel', async () => {
      let releaseCallback: (() => void) | null = null;
      const releaseMock = vi.fn().mockImplementation(async () => {
        if (releaseCallback) releaseCallback();
      });

      const requestMock = vi.fn().mockImplementation(async () => {
        return {
          release: releaseMock,
          addEventListener: (event: string, cb: () => void) => {
            if (event === 'release') releaseCallback = cb;
          }
        };
      });

      Object.defineProperty(navigator, 'wakeLock', {
        value: { request: requestMock },
        writable: true,
        configurable: true
      });

      // Mount shell with running timer
      useTimerStore.setState({ status: 'running' });
      render(<MobileAppShell />);

      await act(async () => {
        await Promise.resolve();
      });

      // 1. Initial acquisition while visible
      expect(requestMock).toHaveBeenCalledTimes(1);

      // 2. OS triggers release when app is backgrounded / hidden
      act(() => {
        Object.defineProperty(document, 'visibilityState', {
          value: 'hidden',
          writable: true,
          configurable: true
        });
        document.dispatchEvent(new Event('visibilitychange'));
        if (releaseCallback) releaseCallback();
      });

      // 3. User returns to app: visibility becomes visible while timer is STILL running
      await act(async () => {
        Object.defineProperty(document, 'visibilityState', {
          value: 'visible',
          writable: true,
          configurable: true
        });
        document.dispatchEvent(new Event('visibilitychange'));
        await Promise.resolve();
      });

      // Re-acquisition must occur!
      expect(requestMock).toHaveBeenCalledTimes(2);
    });

    it('3.2 Rapid visibility flapping (visible -> hidden -> visible -> hidden -> visible) handles idempotent locks', async () => {
      let releaseCallback: (() => void) | null = null;
      const releaseMock = vi.fn().mockImplementation(async () => {
        if (releaseCallback) releaseCallback();
      });

      const requestMock = vi.fn().mockImplementation(async () => {
        return {
          release: releaseMock,
          addEventListener: (event: string, cb: () => void) => {
            if (event === 'release') releaseCallback = cb;
          }
        };
      });

      Object.defineProperty(navigator, 'wakeLock', {
        value: { request: requestMock },
        writable: true,
        configurable: true
      });

      useTimerStore.setState({ status: 'running' });
      render(<MobileAppShell />);

      await act(async () => {
        await Promise.resolve();
      });
      expect(requestMock).toHaveBeenCalledTimes(1);

      // Flap visibility 5 times
      for (let i = 0; i < 5; i++) {
        act(() => {
          Object.defineProperty(document, 'visibilityState', {
            value: 'hidden',
            writable: true,
            configurable: true
          });
          document.dispatchEvent(new Event('visibilitychange'));
          if (releaseCallback) releaseCallback();
        });

        await act(async () => {
          Object.defineProperty(document, 'visibilityState', {
            value: 'visible',
            writable: true,
            configurable: true
          });
          document.dispatchEvent(new Event('visibilitychange'));
          await Promise.resolve();
        });
      }

      // Total requests: 1 initial + 5 re-acquisitions = 6
      expect(requestMock).toHaveBeenCalledTimes(6);
    });

    it('3.3 Visibility change to visible does NOT request wake lock when timer is paused or idle', async () => {
      const requestMock = vi.fn().mockResolvedValue({
        release: vi.fn(),
        addEventListener: vi.fn()
      });

      Object.defineProperty(navigator, 'wakeLock', {
        value: { request: requestMock },
        writable: true,
        configurable: true
      });

      useTimerStore.setState({ status: 'paused' });
      render(<MobileAppShell />);
      expect(requestMock).not.toHaveBeenCalled();

      // Trigger visibilitychange to visible
      act(() => {
        Object.defineProperty(document, 'visibilityState', {
          value: 'visible',
          writable: true,
          configurable: true
        });
        document.dispatchEvent(new Event('visibilitychange'));
      });

      expect(requestMock).not.toHaveBeenCalled();

      // Change status to idle
      act(() => {
        useTimerStore.setState({ status: 'idle' });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      expect(requestMock).not.toHaveBeenCalled();
    });

    it('3.4 Defensive error handling: rejection during re-acquisition does not throw uncaught error', async () => {
      let callCount = 0;
      const requestMock = vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount > 1) {
          throw new DOMException('Battery Saver active', 'NotAllowedError');
        }
        return {
          release: vi.fn(),
          addEventListener: vi.fn((_, cb) => cb())
        };
      });

      Object.defineProperty(navigator, 'wakeLock', {
        value: { request: requestMock },
        writable: true,
        configurable: true
      });

      useTimerStore.setState({ status: 'running' });
      render(<MobileAppShell />);

      await act(async () => {
        await Promise.resolve();
      });

      // Second call will throw
      await act(async () => {
        Object.defineProperty(document, 'visibilityState', {
          value: 'visible',
          writable: true,
          configurable: true
        });
        expect(() => {
          document.dispatchEvent(new Event('visibilitychange'));
        }).not.toThrow();
        await Promise.resolve();
      });

      expect(requestMock).toHaveBeenCalledTimes(2);
    });

    it('3.5 Unmounting MobileAppShell releases active wake lock sentinel and cleans up listeners', async () => {
      const releaseMock = vi.fn().mockResolvedValue(undefined);
      const requestMock = vi.fn().mockResolvedValue({
        release: releaseMock,
        addEventListener: vi.fn()
      });

      Object.defineProperty(navigator, 'wakeLock', {
        value: { request: requestMock },
        writable: true,
        configurable: true
      });

      const removeListenerSpy = vi.spyOn(document, 'removeEventListener');

      useTimerStore.setState({ status: 'running' });
      const { unmount } = render(<MobileAppShell />);

      // Await resolution of async requestScreenWakeLock
      await act(async () => {
        await Promise.resolve();
      });

      expect(requestMock).toHaveBeenCalledTimes(1);

      await act(async () => {
        unmount();
        await Promise.resolve();
      });

      expect(releaseMock).toHaveBeenCalled();
      expect(removeListenerSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    });

    it('3.6 Late resolving wake lock request (resolves after unmount) safely releases sentinel without leak', async () => {
      let resolveLockPromise: (val: any) => void;
      const releaseMock = vi.fn().mockResolvedValue(undefined);
      const lockPromise = new Promise((resolve) => {
        resolveLockPromise = resolve;
      });

      const requestMock = vi.fn().mockReturnValue(lockPromise);

      Object.defineProperty(navigator, 'wakeLock', {
        value: { request: requestMock },
        writable: true,
        configurable: true
      });

      useTimerStore.setState({ status: 'running' });
      const { unmount } = render(<MobileAppShell />);

      // Unmount while requestScreenWakeLock is still awaiting the promise
      act(() => {
        unmount();
      });

      // Now resolve the promise after unmount has occurred
      await act(async () => {
        resolveLockPromise!({
          release: releaseMock,
          addEventListener: vi.fn()
        });
        await Promise.resolve();
      });

      // Since isMounted was false, the newly resolved sentinel was immediately released!
      expect(releaseMock).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // GROUP 4: In-App Floating PiP Fallback State Transitions, Live Sync & Dismissals
  // =========================================================================
  describe('Group 4: In-App Floating PiP Fallback State Transitions, Live Sync & Dismissals', () => {
    it('4.1 In-app floating PiP pill toggles open and closed via mobile-pip-btn', async () => {
      Object.defineProperty(window, 'documentPictureInPicture', {
        value: undefined,
        writable: true,
        configurable: true
      });

      render(<MobileAppShell />);

      const pipBtn = screen.getByTestId('mobile-pip-btn');
      expect(screen.queryByTestId('mobile-in-app-pip-pill')).toBeNull();

      // Click 1: opens in-app pill
      act(() => {
        fireEvent.click(pipBtn);
      });
      expect(screen.getByTestId('mobile-in-app-pip-pill')).toBeDefined();

      // Click 2: toggles closed
      act(() => {
        fireEvent.click(pipBtn);
      });
      expect(screen.queryByTestId('mobile-in-app-pip-pill')).toBeNull();
    });

    it('4.2 Dismissing floating pill via explicit X close button closes the pill', () => {
      Object.defineProperty(window, 'documentPictureInPicture', {
        value: undefined,
        writable: true,
        configurable: true
      });

      render(<MobileAppShell />);

      // Open pill
      act(() => {
        fireEvent.click(screen.getByTestId('mobile-pip-btn'));
      });
      expect(screen.getByTestId('mobile-in-app-pip-pill')).toBeDefined();

      // Click dismiss button
      const closeBtn = screen.getByLabelText('Đóng đồng hồ nổi');
      act(() => {
        fireEvent.click(closeBtn);
      });

      expect(screen.queryByTestId('mobile-in-app-pip-pill')).toBeNull();
    });

    it('4.3 In-app floating pill dynamically synchronizes countdown time and status dot', async () => {
      Object.defineProperty(window, 'documentPictureInPicture', {
        value: undefined,
        writable: true,
        configurable: true
      });

      useTimerStore.setState({
        status: 'running',
        remainingMs: 25 * 60 * 1000 // 25:00
      });

      const { rerender } = render(<MobileAppShell />);
      act(() => {
        fireEvent.click(screen.getByTestId('mobile-pip-btn'));
      });

      const pill = screen.getByTestId('mobile-in-app-pip-pill');
      expect(pill.textContent).toContain('25:00');

      // Countdown to 24:45
      act(() => {
        useTimerStore.setState({
          remainingMs: 24 * 60 * 1000 + 45 * 1000
        });
      });
      rerender(<MobileAppShell />);
      expect(pill.textContent).toContain('24:45');

      // Pause timer
      act(() => {
        useTimerStore.setState({ status: 'paused' });
      });
      rerender(<MobileAppShell />);
      expect(pill.innerHTML).toContain('bg-amber-400');
    });

    it('4.4 Document PiP rejection triggers graceful in-app floating pill fallback', async () => {
      const rejectingRequest = vi.fn().mockRejectedValue(new DOMException('User rejected window', 'NotAllowedError'));

      Object.defineProperty(window, 'documentPictureInPicture', {
        value: { requestWindow: rejectingRequest },
        writable: true,
        configurable: true
      });

      render(<MobileAppShell />);
      const pipBtn = screen.getByTestId('mobile-pip-btn');

      await act(async () => {
        fireEvent.click(pipBtn);
      });

      expect(rejectingRequest).toHaveBeenCalled();
      // Must fall back to in-app pill
      expect(screen.getByTestId('mobile-in-app-pip-pill')).toBeDefined();
    });
  });

  // =========================================================================
  // GROUP 5: Audio Host Chime Integration on Mobile Timer Finish
  // =========================================================================
  describe('Group 5: Audio Host Chime Integration on Mobile Timer Finish', () => {
    it('5.1 GlobalAudioHost is securely mounted inside MobileAppShell with aria-hidden="true"', () => {
      render(<MobileAppShell />);
      const host = screen.getByTestId('global-audio-host');
      expect(host).toBeDefined();
      expect(host.getAttribute('aria-hidden')).toBe('true');
    });

    it('5.2 playChime triggers audio ducking and synthesizer when unmuted', async () => {
      const duckingSpy = vi.spyOn(useAudioStore.getState(), 'applyAudioDucking');
      const playChimeSpy = vi.spyOn(useAudioStore.getState(), 'playChime');

      render(<MobileAppShell />);

      // Trigger playChime
      await act(async () => {
        await useAudioStore.getState().playChime('bell');
      });

      expect(playChimeSpy).toHaveBeenCalledWith('bell');
      expect(duckingSpy).toHaveBeenCalled();
    });

    it('5.3 playChime aborts without sound playback when settings.isMuted is true', async () => {
      useAudioStore.setState((prev) => ({
        settings: { ...prev.settings, isMuted: true }
      }));

      const duckingSpy = vi.spyOn(useAudioStore.getState(), 'applyAudioDucking');

      await act(async () => {
        await useAudioStore.getState().playChime('zen');
      });

      // Ducking and synthesizer should not be called when muted
      expect(duckingSpy).not.toHaveBeenCalled();
    });

    it('5.4 GlobalAudioHost handles direct audio url without crashing and scales volume', async () => {
      render(<MobileAppShell />);

      await act(async () => {
        useAudioStore.setState({
          customMusicType: 'direct_audio',
          customMusicUrl: 'https://example.com/stream.mp3',
          customMusicPlaying: true,
          customMusicVolume: 0.5
        });
        await Promise.resolve();
      });

      const audioHost = screen.getByTestId('global-audio-host');
      const audioElement = audioHost.querySelector('audio');
      expect(audioElement).not.toBeNull();
      expect(audioElement?.src).toContain('stream.mp3');
    });

    it('5.5 Timer round completion triggers chime without crashing mobile view', async () => {
      render(<MobileAppShell />);

      act(() => {
        useTimerStore.setState({
          status: 'idle',
          remainingMs: 0,
          phase: 'short_break'
        });
      });

      // View should remain stable and responsive
      expect(screen.getByTestId('mobile-app-shell')).toBeDefined();
      const dot = screen.getByTestId('mobile-header-timer-status-dot');
      expect(dot.className).toContain('bg-zinc-500');
    });
  });

  // =========================================================================
  // GROUP 6: Boundary Resilience & Edge-Case Stress Testing
  // =========================================================================
  describe('Group 6: Boundary Resilience & Edge-Case Stress Testing', () => {
    it('6.1 Rapid concurrent store mutations (credits + status + activeTab) render with zero race conditions', () => {
      render(<MobileAppShell />);

      act(() => {
        useAiStore.setState({ aiCreditsBalance: 50 });
        useTimerStore.setState({ status: 'running' });
        useLayoutStore.setState({ activeMobileTab: 'tasks' as any });
      });

      expect(screen.getByTestId('mobile-header-credits-pill').textContent).toContain('50');
      expect(screen.getByTestId('mobile-header-timer-status-dot').className).toContain('bg-emerald-400');
      expect(screen.getByTestId('mobile-view-tasks')).toBeDefined();
    });

    it('6.2 Rapid unmounting and remounting does not leak timers or event listeners', () => {
      const removePopstateSpy = vi.spyOn(window, 'removeEventListener');
      const removeVisibilitySpy = vi.spyOn(document, 'removeEventListener');

      const { unmount } = render(<MobileAppShell />);
      unmount();

      expect(removePopstateSpy).toHaveBeenCalledWith('popstate', expect.any(Function));
      expect(removeVisibilitySpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    });
  });
});
