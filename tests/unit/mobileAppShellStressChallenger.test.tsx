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

describe('CHALLENGER HARNESS: Milestone 3 Mobile App Shell & Root Routing Guard Stress Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.HTMLMediaElement.prototype.pause = vi.fn();
    window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
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

    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
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

  // ===========================================================================
  // STRESS VECTOR 1: Rapid Tab Switching & State Singularity Under Load
  // ===========================================================================
  describe('STRESS VECTOR 1: Rapid Tab Switching & State Singularity', () => {
    it('1.1 Executes 50 rapid sequential tab switches across all 5 tabs without crashing', () => {
      render(<MobileAppShell />);
      const allTabs: MobileTab[] = ['tasks', 'spaces', 'ai', 'settings', 'focus'];

      act(() => {
        for (let i = 0; i < 50; i++) {
          const targetTab = allTabs[i % allTabs.length];
          const tabBtn = screen.getByTestId(`mobile-nav-tab-${targetTab}`);
          fireEvent.click(tabBtn);
        }
      });

      // Tab 50 % 5 is 0 -> targetTab is 'tasks' (index 49 % 5 = 4 -> focus)
      // i goes from 0 to 49. For i = 49, 49 % 5 = 4 -> 'focus'
      expect(useLayoutStore.getState().activeMobileTab).toBe('focus');
      expect(screen.getByTestId('mobile-view-focus')).toBeDefined();

      // State Singularity: verify NO other views are in DOM
      expect(screen.queryByTestId('mobile-view-tasks')).toBeNull();
      expect(screen.queryByTestId('mobile-view-spaces')).toBeNull();
      expect(screen.queryByTestId('mobile-view-ai')).toBeNull();
      expect(screen.queryByTestId('mobile-view-settings')).toBeNull();
    });

    it('1.2 Random spam clicking maintains strict 1:1 view rendering (never multi-view collision)', () => {
      render(<MobileAppShell />);
      const tabs: MobileTab[] = ['focus', 'tasks', 'spaces', 'ai', 'settings'];

      // Perform 30 random jumps
      for (let i = 0; i < 30; i++) {
        const randomTab = tabs[Math.floor(Math.random() * tabs.length)];
        const tabBtn = screen.getByTestId(`mobile-nav-tab-${randomTab}`);

        act(() => {
          fireEvent.click(tabBtn);
        });

        // Exactly one view must be present
        const activeViewMap: Record<MobileTab, HTMLElement | null> = {
          focus: screen.queryByTestId('mobile-view-focus'),
          tasks: screen.queryByTestId('mobile-view-tasks'),
          spaces: screen.queryByTestId('mobile-view-spaces'),
          ai: screen.queryByTestId('mobile-view-ai'),
          settings: screen.queryByTestId('mobile-view-settings')
        };

        const currentActive = useLayoutStore.getState().activeMobileTab as MobileTab;
        for (const [key, el] of Object.entries(activeViewMap)) {
          if (key === currentActive) {
            expect(el).not.toBeNull();
          } else {
            expect(el).toBeNull();
          }
        }

        // Verify aria-selected matches active state
        for (const tabKey of tabs) {
          const btn = screen.getByTestId(`mobile-nav-tab-${tabKey}`);
          expect(btn.getAttribute('aria-selected')).toBe(tabKey === currentActive ? 'true' : 'false');
        }
      }
    });

    it('1.3 Backward compatibility: handles legacy "timer" store tab value safely', () => {
      useLayoutStore.setState({ activeMobileTab: 'timer' as any });
      render(<MobileAppShell />);

      // Should normalize to 'focus'
      expect(screen.getByTestId('mobile-view-focus')).toBeDefined();
      expect(screen.getByTestId('mobile-nav-tab-focus').getAttribute('aria-selected')).toBe('true');
    });

    it('1.4 Corrupted store tab value falls back gracefully to "focus" canvas', () => {
      useLayoutStore.setState({ activeMobileTab: 'UNKNOWN_CORRUPTED_TAB' as any });
      render(<MobileAppShell />);

      // Gracefully falls back to 'focus'
      expect(screen.getByTestId('mobile-view-focus')).toBeDefined();
      expect(screen.getByTestId('mobile-nav-tab-focus').getAttribute('aria-selected')).toBe('true');
    });
  });

  // ===========================================================================
  // STRESS VECTOR 2: Predictive Back Gesture (popstate) & Loop Prevention
  // ===========================================================================
  describe('STRESS VECTOR 2: Predictive Back Gesture (popstate) & Loop Prevention', () => {
    it('2.1 Simulating popstate from every secondary tab (tasks, spaces, ai, settings) always redirects to focus', () => {
      render(<MobileAppShell />);
      const secondaryTabs: MobileTab[] = ['tasks', 'spaces', 'ai', 'settings'];

      for (const tab of secondaryTabs) {
        // Switch to secondary tab
        act(() => {
          fireEvent.click(screen.getByTestId(`mobile-nav-tab-${tab}`));
        });
        expect(useLayoutStore.getState().activeMobileTab).toBe(tab);

        // Fire popstate
        const popEvent = new PopStateEvent('popstate');
        const preventSpy = vi.spyOn(popEvent, 'preventDefault');

        act(() => {
          window.dispatchEvent(popEvent);
        });

        // Must intercept and route to focus
        expect(preventSpy).toHaveBeenCalled();
        expect(useLayoutStore.getState().activeMobileTab).toBe('focus');
        expect(screen.getByTestId('mobile-view-focus')).toBeDefined();
      }
    });

    it('2.2 When already on focus tab, popstate does NOT preventDefault and causes NO infinite loop', () => {
      useLayoutStore.setState({ activeMobileTab: 'focus' as any });
      const pushSpy = vi.spyOn(window.history, 'pushState');
      render(<MobileAppShell />);

      // Fire popstate on focus tab
      const popEvent = new PopStateEvent('popstate');
      const preventSpy = vi.spyOn(popEvent, 'preventDefault');

      act(() => {
        window.dispatchEvent(popEvent);
      });

      // Default must not be prevented (allows browser exit)
      expect(preventSpy).not.toHaveBeenCalled();
      // Must not trigger additional pushState calls (prevents infinite trap)
      expect(pushSpy).not.toHaveBeenCalled();
      expect(useLayoutStore.getState().activeMobileTab).toBe('focus');
    });

    it('2.3 Rapid burst of 10 consecutive popstate events on focus tab is completely stable', () => {
      useLayoutStore.setState({ activeMobileTab: 'focus' as any });
      const pushSpy = vi.spyOn(window.history, 'pushState');
      render(<MobileAppShell />);

      for (let i = 0; i < 10; i++) {
        const popEvent = new PopStateEvent('popstate');
        act(() => {
          window.dispatchEvent(popEvent);
        });
      }

      expect(pushSpy).not.toHaveBeenCalled();
      expect(useLayoutStore.getState().activeMobileTab).toBe('focus');
      expect(screen.getByTestId('mobile-view-focus')).toBeDefined();
    });

    it('2.4 Rapid back-and-forth between focus and settings with interleaved popstates', () => {
      render(<MobileAppShell />);
      for (let i = 0; i < 5; i++) {
        // Go to settings
        act(() => {
          fireEvent.click(screen.getByTestId('mobile-nav-tab-settings'));
        });
        expect(useLayoutStore.getState().activeMobileTab).toBe('settings');

        // Trigger back
        const popEvent = new PopStateEvent('popstate');
        act(() => {
          window.dispatchEvent(popEvent);
        });
        expect(useLayoutStore.getState().activeMobileTab).toBe('focus');
      }
    });
  });

  // ===========================================================================
  // STRESS VECTOR 3: Wake Lock & PiP API Edge Cases and Rejections
  // ===========================================================================
  describe('STRESS VECTOR 3: Screen Wake Lock & PiP Edge Cases', () => {
    it('3.1 Completely absent navigator.wakeLock does not crash on timer start, pause, or idle', async () => {
      // Remove wakeLock from navigator
      // @ts-ignore
      delete navigator.wakeLock;

      const { rerender } = render(<MobileAppShell />);

      // Transition through all statuses
      await act(async () => {
        useTimerStore.setState({ status: 'running' });
      });
      rerender(<MobileAppShell />);

      await act(async () => {
        useTimerStore.setState({ status: 'paused' });
      });
      rerender(<MobileAppShell />);

      await act(async () => {
        useTimerStore.setState({ status: 'idle' });
      });
      rerender(<MobileAppShell />);

      // Should render without error
      expect(screen.getByTestId('mobile-app-shell')).toBeDefined();
    });

    it('3.2 navigator.wakeLock.request rejection (e.g. NotAllowedError / battery saver) is handled gracefully', async () => {
      const rejectedRequestMock = vi.fn().mockRejectedValue(new Error('NotAllowedError: Low power mode'));

      Object.defineProperty(navigator, 'wakeLock', {
        value: { request: rejectedRequestMock },
        writable: true,
        configurable: true
      });

      const { rerender } = render(<MobileAppShell />);

      // Start timer - should trigger wakeLock request that throws
      await act(async () => {
        useTimerStore.setState({ status: 'running' });
      });
      rerender(<MobileAppShell />);

      expect(rejectedRequestMock).toHaveBeenCalledWith('screen');
      // Verify shell didn't crash
      expect(screen.getByTestId('mobile-app-shell')).toBeDefined();
    });

    it('3.3 External wake lock release (sentinel "release" event) does not cause error on subsequent pause', async () => {
      let releaseListener: (() => void) | null = null;
      const sentinelReleaseMock = vi.fn().mockResolvedValue(undefined);

      const mockSentinel = {
        release: sentinelReleaseMock,
        addEventListener: vi.fn((event, cb) => {
          if (event === 'release') releaseListener = cb;
        })
      };

      const requestMock = vi.fn().mockResolvedValue(mockSentinel);

      Object.defineProperty(navigator, 'wakeLock', {
        value: { request: requestMock },
        writable: true,
        configurable: true
      });

      const { rerender } = render(<MobileAppShell />);

      // Start timer
      await act(async () => {
        useTimerStore.setState({ status: 'running' });
      });
      rerender(<MobileAppShell />);

      expect(requestMock).toHaveBeenCalled();
      expect(releaseListener).not.toBeNull();

      // Simulate system externally releasing the wake lock
      act(() => {
        if (releaseListener) releaseListener();
      });

      // Now pause timer - internal release should be a safe no-op
      await act(async () => {
        useTimerStore.setState({ status: 'paused' });
      });
      rerender(<MobileAppShell />);

      expect(screen.getByTestId('mobile-app-shell')).toBeDefined();
    });

    it('3.4 Document PiP failure or rejection automatically falls back to in-app floating mini timer', async () => {
      // Mock documentPictureInPicture.requestWindow throwing an error
      const requestWindowRejectMock = vi.fn().mockRejectedValue(new Error('Permission denied'));

      Object.defineProperty(window, 'documentPictureInPicture', {
        value: { requestWindow: requestWindowRejectMock },
        writable: true,
        configurable: true
      });

      render(<MobileAppShell />);
      const pipBtn = screen.getByTestId('mobile-pip-btn');

      // Click PiP button
      await act(async () => {
        fireEvent.click(pipBtn);
      });

      expect(requestWindowRejectMock).toHaveBeenCalled();
      // Should show in-app floating pill fallback!
      const fallbackPill = screen.getByTestId('mobile-in-app-pip-pill');
      expect(fallbackPill).toBeDefined();

      // Test closing the in-app fallback
      const closeBtn = screen.getByLabelText('Đóng đồng hồ nổi');
      fireEvent.click(closeBtn);
      expect(screen.queryByTestId('mobile-in-app-pip-pill')).toBeNull();
    });

    it('3.5 Rapid toggle of in-app floating PiP fallback without documentPictureInPicture', () => {
      // @ts-ignore
      delete window.documentPictureInPicture;

      render(<MobileAppShell />);
      const pipBtn = screen.getByTestId('mobile-pip-btn');

      // Toggle on
      fireEvent.click(pipBtn);
      expect(screen.getByTestId('mobile-in-app-pip-pill')).toBeDefined();

      // Toggle off
      fireEvent.click(pipBtn);
      expect(screen.queryByTestId('mobile-in-app-pip-pill')).toBeNull();

      // Toggle on again
      fireEvent.click(pipBtn);
      expect(screen.getByTestId('mobile-in-app-pip-pill')).toBeDefined();
    });
  });

  // ===========================================================================
  // STRESS VECTOR 4: Root Routing & Karpathy Invariant Strict Isolation
  // ===========================================================================
  describe('STRESS VECTOR 4: Root Routing & Karpathy Invariant Boundary', () => {
    it('4.1 Mobile viewport renders strictly MobileAppShell with 0 desktop layout collisions', () => {
      window.history.pushState({}, '', '/app');

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

      render(
        <RouterProvider>
          <App />
        </RouterProvider>
      );

      // Verify MobileAppShell is present
      expect(screen.getByTestId('mobile-app-shell')).toBeDefined();
      // Verify desktop elements are NOT present
      expect(screen.queryByTestId('workspace-root')).toBeNull();
      expect(screen.queryByTestId('dockbar')).toBeNull();
      expect(screen.queryByTestId('mac-traffic-lights')).toBeNull();
    });

    it('4.2 Desktop viewport preserves 100% desktop workspace and excludes MobileAppShell', () => {
      window.history.pushState({}, '', '/app');

      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn()
      }));

      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        writable: true,
        configurable: true
      });

      render(
        <RouterProvider>
          <App />
        </RouterProvider>
      );

      expect(screen.getByTestId('workspace-root')).toBeDefined();
      expect(screen.queryByTestId('mobile-app-shell')).toBeNull();
      expect(screen.queryByTestId('mobile-bottom-nav')).toBeNull();
      expect(screen.queryByTestId('mobile-top-header')).toBeNull();
    });

    it('4.3 Dynamic viewport resize across the 768px threshold switches shells cleanly', () => {
      window.history.pushState({}, '', '/app');

      let currentMatches = true;
      let mediaListeners: Array<(e: any) => void> = [];

      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('768px') ? currentMatches : false,
        media: query,
        onchange: null,
        addListener: vi.fn((fn) => mediaListeners.push(fn)),
        removeListener: vi.fn((fn) => {
          mediaListeners = mediaListeners.filter((l) => l !== fn);
        }),
        addEventListener: vi.fn((_, fn) => mediaListeners.push(fn)),
        removeEventListener: vi.fn((_, fn) => {
          mediaListeners = mediaListeners.filter((l) => l !== fn);
        }),
        dispatchEvent: vi.fn()
      }));

      const { rerender } = render(
        <RouterProvider>
          <App />
        </RouterProvider>
      );

      // Initially mobile
      expect(screen.getByTestId('mobile-app-shell')).toBeDefined();

      // Simulate viewport expanding to desktop (> 768px)
      act(() => {
        currentMatches = false;
        mediaListeners.forEach((l) => l({ matches: false }));
      });

      rerender(
        <RouterProvider>
          <App />
        </RouterProvider>
      );

      expect(screen.getByTestId('workspace-root')).toBeDefined();
      expect(screen.queryByTestId('mobile-app-shell')).toBeNull();
    });
  });
});
