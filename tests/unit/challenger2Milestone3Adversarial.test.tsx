import 'fake-indexeddb/auto';
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

// Components
import { MobileAppShell } from '../../src/components/mobile/MobileAppShell';
import { App } from '../../src/App';
import { RouterProvider } from '../../src/services/router';

// Stores
import { useTimerStore } from '../../src/stores/useTimerStore';
import { useLayoutStore } from '../../src/stores/useLayoutStore';
import { useAiStore } from '../../src/stores/useAiStore';
import { useTaskStore } from '../../src/stores/useTaskStore';
import { useBackgroundStore } from '../../src/stores/useBackgroundStore';

describe('Challenger 2: Adversarial Stress Test Suite for Milestone 3 (Mobile Shell & Root Routing)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  // =========================================================================
  // VECTOR 1: Karpathy Desktop Preservation Invariant & Dynamic Transitions
  // =========================================================================
  describe('Vector 1: Karpathy Desktop Preservation Invariant', () => {
    it('1.1 Desktop (> 768px + desktop UA): renders 100% desktop layout with pt-2 pb-28 intact', () => {
      window.history.pushState({}, '', '/app');

      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: false, // > 768px
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn()
      }));

      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        writable: true,
        configurable: true
      });

      const { container } = render(
        <RouterProvider>
          <App />
        </RouterProvider>
      );

      // Verify desktop workspace root
      const workspaceRoot = screen.getByTestId('workspace-root');
      expect(workspaceRoot).toBeDefined();

      // Verify pt-2 pb-28 desktop container
      const mainElement = container.querySelector('main');
      expect(mainElement).not.toBeNull();
      expect(mainElement?.className).toContain('pt-2 pb-28');
      expect(mainElement?.className).toContain('fixed inset-0 pointer-events-none w-screen h-screen z-10');

      // Verify mobile shell is completely absent
      expect(screen.queryByTestId('mobile-app-shell')).toBeNull();
      expect(screen.queryByTestId('mobile-top-header')).toBeNull();
      expect(screen.queryByTestId('mobile-bottom-nav')).toBeNull();
    });

    it('1.2 Mobile (<= 768px): renders MobileAppShell and completely suppresses desktop workspace', () => {
      window.history.pushState({}, '', '/app');

      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('768px'), // Matches mobile breakpoint
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

      // MobileAppShell must exist
      expect(screen.getByTestId('mobile-app-shell')).toBeDefined();
      expect(screen.getByTestId('mobile-top-header')).toBeDefined();
      expect(screen.getByTestId('mobile-bottom-nav')).toBeDefined();

      // Desktop artifacts must be 100% suppressed
      expect(screen.queryByTestId('workspace-root')).toBeNull();
      expect(screen.queryByTestId('dock-bar')).toBeNull();
    });

    it('1.3 Mobile userAgent trigger: even on wide viewport, Android/iPhone UA triggers MobileAppShell', () => {
      window.history.pushState({}, '', '/app');

      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: false, // wide screen
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn()
      }));

      // Simulate Android tablet UA
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Linux; Android 14; Pixel Tablet) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        writable: true,
        configurable: true
      });

      render(
        <RouterProvider>
          <App />
        </RouterProvider>
      );

      expect(screen.getByTestId('mobile-app-shell')).toBeDefined();
      expect(screen.queryByTestId('workspace-root')).toBeNull();
    });
  });

  // =========================================================================
  // VECTOR 2: Credits Capsule & Topup Trigger Stress Testing
  // =========================================================================
  describe('Vector 2: Credits Capsule & Topup Trigger', () => {
    it('2.1 Clicking the ⚡ {balance} capsule triggers useAiStore.getState().openTopupModal()', () => {
      useAiStore.setState({ aiCreditsBalance: 77 });
      const openTopupSpy = vi.spyOn(useAiStore.getState(), 'openTopupModal');

      render(<MobileAppShell />);
      const pill = screen.getByTestId('mobile-header-credits-pill');
      expect(pill.textContent).toContain('⚡');
      expect(pill.textContent).toContain('77');

      fireEvent.click(pill);
      expect(openTopupSpy).toHaveBeenCalledTimes(1);
    });

    it('2.2 Boundary condition: renders balance = 0 and large numbers without overflowing', () => {
      useAiStore.setState({ aiCreditsBalance: 0 });
      const { rerender } = render(<MobileAppShell />);
      let pill = screen.getByTestId('mobile-header-credits-pill');
      expect(pill.textContent).toContain('0');

      useAiStore.setState({ aiCreditsBalance: 999999 });
      rerender(<MobileAppShell />);
      pill = screen.getByTestId('mobile-header-credits-pill');
      expect(pill.textContent).toContain('999999');
    });

    it('2.3 Rapid successive clicks on credits capsule invoke topup trigger without throwing', () => {
      const openTopupSpy = vi.spyOn(useAiStore.getState(), 'openTopupModal');
      render(<MobileAppShell />);
      const pill = screen.getByTestId('mobile-header-credits-pill');

      fireEvent.click(pill);
      fireEvent.click(pill);
      fireEvent.click(pill);

      expect(openTopupSpy).toHaveBeenCalledTimes(3);
    });
  });

  // =========================================================================
  // VECTOR 3: 3-State Timer Indicator Dot
  // =========================================================================
  describe('Vector 3: 3-State Timer Indicator Dot', () => {
    it('3.1 Running state: emerald color with breathing pulse animation and glow shadow', () => {
      useTimerStore.setState({ status: 'running' });
      render(<MobileAppShell />);

      const dot = screen.getByTestId('mobile-header-timer-status-dot');
      expect(dot.className).toContain('bg-emerald-400');
      expect(dot.className).toContain('animate-pulse');
      expect(dot.className).toContain('shadow-[0_0_8px_rgba(52,211,153,0.8)]');
    });

    it('3.2 Paused state: amber color without pulse animation', () => {
      useTimerStore.setState({ status: 'paused' });
      render(<MobileAppShell />);

      const dot = screen.getByTestId('mobile-header-timer-status-dot');
      expect(dot.className).toContain('bg-amber-400');
      expect(dot.className).toContain('shadow-[0_0_8px_rgba(251,191,36,0.8)]');
      expect(dot.className).not.toContain('animate-pulse');
    });

    it('3.3 Idle state: zinc color without glow or pulse', () => {
      useTimerStore.setState({ status: 'idle' });
      render(<MobileAppShell />);

      const dot = screen.getByTestId('mobile-header-timer-status-dot');
      expect(dot.className).toContain('bg-zinc-500');
      expect(dot.className).not.toContain('bg-emerald-400');
      expect(dot.className).not.toContain('bg-amber-400');
      expect(dot.className).not.toContain('animate-pulse');
    });

    it('3.4 Dynamic transitions: transitions smoothly between running -> paused -> idle in real time', () => {
      const { rerender } = render(<MobileAppShell />);

      // 1. Initial idle
      let dot = screen.getByTestId('mobile-header-timer-status-dot');
      expect(dot.className).toContain('bg-zinc-500');

      // 2. Start running
      act(() => {
        useTimerStore.setState({ status: 'running' });
      });
      rerender(<MobileAppShell />);
      dot = screen.getByTestId('mobile-header-timer-status-dot');
      expect(dot.className).toContain('bg-emerald-400');
      expect(dot.className).toContain('animate-pulse');

      // 3. Pause
      act(() => {
        useTimerStore.setState({ status: 'paused' });
      });
      rerender(<MobileAppShell />);
      dot = screen.getByTestId('mobile-header-timer-status-dot');
      expect(dot.className).toContain('bg-amber-400');
      expect(dot.className).not.toContain('animate-pulse');

      // 4. Return to idle
      act(() => {
        useTimerStore.setState({ status: 'idle' });
      });
      rerender(<MobileAppShell />);
      dot = screen.getByTestId('mobile-header-timer-status-dot');
      expect(dot.className).toContain('bg-zinc-500');
    });
  });

  // =========================================================================
  // VECTOR 4: Predictive Back Gesture & Multi-Tab Traversals
  // =========================================================================
  describe('Vector 4: Predictive Back Gesture & State Singularity', () => {
    it('4.1 Multi-tab traversal: navigates through all 5 tabs and intercepts popstate', () => {
      const pushSpy = vi.spyOn(window.history, 'pushState');
      render(<MobileAppShell />);

      // Switch: focus -> tasks
      fireEvent.click(screen.getByTestId('mobile-nav-tab-tasks'));
      expect(useLayoutStore.getState().activeMobileTab).toBe('tasks');
      expect(pushSpy).toHaveBeenCalledWith({ mobileTab: 'tasks' }, '');

      // Switch: tasks -> spaces
      fireEvent.click(screen.getByTestId('mobile-nav-tab-spaces'));
      expect(useLayoutStore.getState().activeMobileTab).toBe('spaces');

      // Switch: spaces -> ai
      fireEvent.click(screen.getByTestId('mobile-nav-tab-ai'));
      expect(useLayoutStore.getState().activeMobileTab).toBe('ai');

      // Switch: ai -> settings
      fireEvent.click(screen.getByTestId('mobile-nav-tab-settings'));
      expect(useLayoutStore.getState().activeMobileTab).toBe('settings');

      // Trigger popstate event while on settings
      const popEvent = new PopStateEvent('popstate');
      const preventSpy = vi.spyOn(popEvent, 'preventDefault');
      window.dispatchEvent(popEvent);

      // Must intercept and redirect back to focus tab
      expect(preventSpy).toHaveBeenCalled();
      expect(useLayoutStore.getState().activeMobileTab).toBe('focus');
    });

    it('4.2 Popstate when on focus does not call preventDefault (allows app exit / browser back)', () => {
      useLayoutStore.setState({ activeMobileTab: 'focus' as any });
      render(<MobileAppShell />);

      const popEvent = new PopStateEvent('popstate');
      const preventSpy = vi.spyOn(popEvent, 'preventDefault');
      window.dispatchEvent(popEvent);

      expect(preventSpy).not.toHaveBeenCalled();
      expect(useLayoutStore.getState().activeMobileTab).toBe('focus');
    });

    it('4.3 Legacy tab fallback: gracefully maps stale "timer" tab value to "focus"', () => {
      useLayoutStore.setState({ activeMobileTab: 'timer' as any });
      render(<MobileAppShell />);

      // Should render focus view
      expect(screen.getByTestId('mobile-view-focus')).toBeDefined();
      const focusBtn = screen.getByTestId('mobile-nav-tab-focus');
      expect(focusBtn.getAttribute('aria-selected')).toBe('true');
    });
  });

  // =========================================================================
  // VECTOR 5: Wake Lock & Document PiP Resiliency
  // =========================================================================
  describe('Vector 5: Hardware & Mobile System APIs Resilience', () => {
    it('5.1 Wake Lock handles rejected promise defensively without crashing', async () => {
      const failingRequestMock = vi.fn().mockRejectedValue(new Error('Permission denied'));
      Object.defineProperty(navigator, 'wakeLock', {
        value: { request: failingRequestMock },
        writable: true,
        configurable: true
      });

      const { rerender } = render(<MobileAppShell />);

      // Start timer with failing wake lock
      await act(async () => {
        useTimerStore.setState({ status: 'running' });
      });

      // App must not crash
      expect(() => rerender(<MobileAppShell />)).not.toThrow();
      expect(failingRequestMock).toHaveBeenCalledWith('screen');
    });

    it('5.2 Document PiP error triggers in-app mini floating clock fallback and can be closed', async () => {
      // Document PiP throws
      const failingPiPMock = vi.fn().mockRejectedValue(new Error('PiP failed'));
      Object.defineProperty(window, 'documentPictureInPicture', {
        value: { requestWindow: failingPiPMock },
        writable: true,
        configurable: true
      });

      render(<MobileAppShell />);
      const pipBtn = screen.getByTestId('mobile-pip-btn');

      await act(async () => {
        fireEvent.click(pipBtn);
      });

      // Floating fallback pill should appear
      const pill = screen.getByTestId('mobile-in-app-pip-pill');
      expect(pill).toBeDefined();

      // Dismiss floating fallback
      const closeBtn = screen.getByLabelText('Đóng đồng hồ nổi');
      fireEvent.click(closeBtn);
      expect(screen.queryByTestId('mobile-in-app-pip-pill')).toBeNull();
    });
  });
});
