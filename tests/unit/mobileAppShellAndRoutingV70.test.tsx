import 'fake-indexeddb/auto';
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

// Components under test
import { MobileAppShell } from '../../src/components/mobile/MobileAppShell';
import { App } from '../../src/App';
import { RouterProvider } from '../../src/services/router';

// Stores
import { useTimerStore } from '../../src/stores/useTimerStore';
import { useLayoutStore } from '../../src/stores/useLayoutStore';
import { useAiStore } from '../../src/stores/useAiStore';
import { useTaskStore } from '../../src/stores/useTaskStore';
import { useBackgroundStore } from '../../src/stores/useBackgroundStore';

describe('Milestone 3: Mobile App Shell & Root Routing Guard (v7.0 Native Android Liquid Zen)', () => {
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
  // 1. MobileAppShell: Viewport, Header & Branding
  // =========================================================================
  describe('1. MobileAppShell: Viewport & 56px Header', () => {
    it('1.1 Renders 100dvh root container with GPU promotion (translateZ(0))', () => {
      render(<MobileAppShell />);
      const shell = screen.getByTestId('mobile-app-shell');
      expect(shell).toBeDefined();
      expect(shell.className).toContain('100dvh');
      expect(shell.style.transform).toBe('translateZ(0)');
    });

    it('1.2 Renders 56px Top Header with PomoFocus brand and Liquid Zen badge', () => {
      render(<MobileAppShell />);
      const header = screen.getByTestId('mobile-top-header');
      expect(header).toBeDefined();
      expect(header.className).toContain('h-14');
      expect(header.textContent).toContain('PomoFocus');
      expect(header.textContent).toContain('Liquid Zen');
    });

    it('1.3 State Singularity: Only one banner element exists in MobileAppShell', () => {
      render(<MobileAppShell />);
      const headers = screen.getAllByRole('banner');
      expect(headers.length).toBe(1);
    });

    it('1.4 3-State Timer Indicator Dot: emerald pulsing when running', () => {
      useTimerStore.setState({ status: 'running' });
      render(<MobileAppShell />);
      const dot = screen.getByTestId('mobile-header-timer-status-dot');
      expect(dot.className).toContain('bg-emerald-400');
      expect(dot.className).toContain('animate-pulse');
    });

    it('1.5 3-State Timer Indicator Dot: amber when paused', () => {
      useTimerStore.setState({ status: 'paused' });
      render(<MobileAppShell />);
      const dot = screen.getByTestId('mobile-header-timer-status-dot');
      expect(dot.className).toContain('bg-amber-400');
    });

    it('1.6 3-State Timer Indicator Dot: zinc when idle', () => {
      useTimerStore.setState({ status: 'idle' });
      render(<MobileAppShell />);
      const dot = screen.getByTestId('mobile-header-timer-status-dot');
      expect(dot.className).toContain('bg-zinc-500');
    });

    it('1.7 Credits capsule displays live aiCreditsBalance and opens topup modal on click', () => {
      useAiStore.setState({ aiCreditsBalance: 120 });
      const openModalSpy = vi.spyOn(useAiStore.getState(), 'openTopupModal');

      render(<MobileAppShell />);
      const creditsPill = screen.getByTestId('mobile-header-credits-pill');
      expect(creditsPill.textContent).toContain('120');

      fireEvent.click(creditsPill);
      expect(openModalSpy).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // 2. Material 3 Bottom Navigation Bar & Sub-Views
  // =========================================================================
  describe('2. Material 3 Bottom Navigation Bar & View Switching', () => {
    it('2.1 Renders 5 equal tabs: focus, tasks, spaces, ai, settings with role="tab"', () => {
      render(<MobileAppShell />);
      const nav = screen.getByTestId('mobile-bottom-nav');
      expect(nav).toBeDefined();

      const tabs = ['focus', 'tasks', 'spaces', 'ai', 'settings'];
      tabs.forEach((tabId) => {
        const tabBtn = screen.getByTestId(`mobile-nav-tab-${tabId}`);
        expect(tabBtn.getAttribute('role')).toBe('tab');
      });
    });

    it('2.2 Active tab has aria-selected="true" and emerald styling', () => {
      useLayoutStore.setState({ activeMobileTab: 'focus' as any });
      render(<MobileAppShell />);
      const focusTab = screen.getByTestId('mobile-nav-tab-focus');
      expect(focusTab.getAttribute('aria-selected')).toBe('true');
      expect(focusTab.className).toContain('emerald');
    });

    it('2.3 Clicking a tab changes activeMobileTab and renders corresponding sub-view', () => {
      render(<MobileAppShell />);

      // Switch to tasks
      const tasksTab = screen.getByTestId('mobile-nav-tab-tasks');
      fireEvent.click(tasksTab);
      expect(useLayoutStore.getState().activeMobileTab).toBe('tasks');
      expect(screen.getByTestId('mobile-view-tasks')).toBeDefined();

      // Switch to settings
      const settingsTab = screen.getByTestId('mobile-nav-tab-settings');
      fireEvent.click(settingsTab);
      expect(useLayoutStore.getState().activeMobileTab).toBe('settings');
      expect(screen.getByTestId('mobile-view-settings')).toBeDefined();
      expect(screen.queryByTestId('mobile-view-tasks')).toBeNull();
    });

    it('2.4 Focus sub-view contains monumental timer numerals', () => {
      useLayoutStore.setState({ activeMobileTab: 'focus' as any });
      render(<MobileAppShell />);
      expect(screen.getByTestId('mobile-view-focus')).toBeDefined();
      expect(screen.getByTestId('mobile-monumental-timer')).toBeDefined();
    });

    it('2.5 Spaces sub-view renders background presets selector', () => {
      useLayoutStore.setState({ activeMobileTab: 'spaces' as any });
      render(<MobileAppShell />);
      expect(screen.getByTestId('mobile-view-spaces')).toBeDefined();
      expect(screen.getByText('Không Gian Làm Việc')).toBeDefined();
    });

    it('2.6 AI sub-view renders AI chat interface', () => {
      useLayoutStore.setState({ activeMobileTab: 'ai' as any });
      render(<MobileAppShell />);
      expect(screen.getByTestId('mobile-view-ai')).toBeDefined();
      expect(screen.getByText('Trợ Lý Học Tập AI')).toBeDefined();
    });
  });

  // =========================================================================
  // 3. Predictive Back Gesture (popstate)
  // =========================================================================
  describe('3. Predictive Back Gesture (popstate navigation)', () => {
    it('3.1 Pushes history state when switching from focus to another tab', () => {
      const pushSpy = vi.spyOn(window.history, 'pushState');
      render(<MobileAppShell />);

      const tasksTab = screen.getByTestId('mobile-nav-tab-tasks');
      fireEvent.click(tasksTab);

      expect(pushSpy).toHaveBeenCalledWith({ mobileTab: 'tasks' }, '');
    });

    it('3.2 Navigates back to focus tab on popstate when on a secondary tab', () => {
      useLayoutStore.setState({ activeMobileTab: 'settings' as any });
      render(<MobileAppShell />);

      expect(useLayoutStore.getState().activeMobileTab).toBe('settings');

      // Dispatch popstate event
      const popEvent = new PopStateEvent('popstate');
      const preventDefaultSpy = vi.spyOn(popEvent, 'preventDefault');
      window.dispatchEvent(popEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(useLayoutStore.getState().activeMobileTab).toBe('focus');
    });

    it('3.3 Does not prevent default popstate when already on focus tab', () => {
      useLayoutStore.setState({ activeMobileTab: 'focus' as any });
      render(<MobileAppShell />);

      const popEvent = new PopStateEvent('popstate');
      const preventDefaultSpy = vi.spyOn(popEvent, 'preventDefault');
      window.dispatchEvent(popEvent);

      expect(preventDefaultSpy).not.toHaveBeenCalled();
      expect(useLayoutStore.getState().activeMobileTab).toBe('focus');
    });

    it('3.4 Cleans up popstate event listener on unmount', () => {
      const removeListenerSpy = vi.spyOn(window, 'removeEventListener');
      const { unmount } = render(<MobileAppShell />);
      unmount();
      expect(removeListenerSpy).toHaveBeenCalledWith('popstate', expect.any(Function));
    });
  });

  // =========================================================================
  // 4. Mobile System APIs: Screen Wake Lock & Document PiP
  // =========================================================================
  describe('4. Mobile System APIs (Wake Lock & Document PiP)', () => {
    it('4.1 Screen Wake Lock: requests wake lock during running and releases on pause', async () => {
      const releaseMock = vi.fn().mockResolvedValue(undefined);
      const requestMock = vi.fn().mockResolvedValue({
        release: releaseMock,
        addEventListener: vi.fn()
      });

      // Mock navigator.wakeLock
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

      expect(requestMock).toHaveBeenCalledWith('screen');

      // Pause timer
      await act(async () => {
        useTimerStore.setState({ status: 'paused' });
      });
      rerender(<MobileAppShell />);

      expect(releaseMock).toHaveBeenCalled();
    });

    it('4.2 Re-requests wake lock on visibilitychange when tab becomes visible and timer is running', async () => {
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

      useTimerStore.setState({ status: 'running' });
      render(<MobileAppShell />);

      expect(requestMock).toHaveBeenCalledTimes(1);

      // Simulate visibility change to visible
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true,
        configurable: true
      });
      document.dispatchEvent(new Event('visibilitychange'));

      expect(requestMock).toHaveBeenCalledTimes(2);
    });

    it('4.3 Document PiP button toggles in-app mini floating clock fallback when documentPictureInPicture is unavailable', () => {
      render(<MobileAppShell />);
      const pipBtn = screen.getByTestId('mobile-pip-btn');
      expect(pipBtn).toBeDefined();

      fireEvent.click(pipBtn);
      const fallbackPill = screen.getByTestId('mobile-in-app-pip-pill');
      expect(fallbackPill).toBeDefined();
      expect(fallbackPill.textContent).toContain('25:00');
    });

    it('4.4 Document PiP requests window when documentPictureInPicture is supported', async () => {
      const requestWindowMock = vi.fn().mockResolvedValue({
        document: {
          head: { appendChild: vi.fn() },
          body: { appendChild: vi.fn() },
          createElement: vi.fn().mockReturnValue({ style: {} })
        },
        addEventListener: vi.fn()
      });

      Object.defineProperty(window, 'documentPictureInPicture', {
        value: { requestWindow: requestWindowMock },
        writable: true,
        configurable: true
      });

      render(<MobileAppShell />);
      const pipBtn = screen.getByTestId('mobile-pip-btn');
      await act(async () => {
        fireEvent.click(pipBtn);
      });

      expect(requestWindowMock).toHaveBeenCalledWith({ width: 320, height: 180 });
    });
  });

  // =========================================================================
  // 5. App.tsx Routing Guard & Karpathy Invariant
  // =========================================================================
  describe('5. App.tsx Mobile Routing Guard & Karpathy Invariant', () => {
    it('5.1 Renders MobileAppShell on mobile viewports (<= 768px)', () => {
      // Set path to /app
      window.history.pushState({}, '', '/app');

      // Mock media query matching <= 768px
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

      expect(screen.getByTestId('mobile-app-shell')).toBeDefined();
      expect(screen.queryByTestId('workspace-root')).toBeNull();
    });

    it('5.2 Renders 100% desktop layout on desktop viewports (> 768px)', () => {
      window.history.pushState({}, '', '/app');

      // Mock media query NOT matching <= 768px
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

      // Ensure desktop UA
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
    });

    it('5.3 Preserves standalone routes like /login without rendering workspace shell', () => {
      window.history.pushState({}, '', '/login');

      render(
        <RouterProvider>
          <App />
        </RouterProvider>
      );

      expect(screen.queryByTestId('mobile-app-shell')).toBeNull();
      expect(screen.queryByTestId('workspace-root')).toBeNull();
    });
  });
});
