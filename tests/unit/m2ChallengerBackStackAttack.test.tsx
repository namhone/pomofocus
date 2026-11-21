import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import { backStack } from '../../src/services/backStack';
import { MobileAppShell } from '../../src/components/mobile/MobileAppShell';
import { useLayoutStore } from '../../src/stores/useLayoutStore';
import { useAiStore } from '../../src/stores/useAiStore';
import { useTimerStore } from '../../src/stores/useTimerStore';

// Mock heavy visual and audio sub-components to prevent jsdom memory leaks and canvas overhead
vi.mock('../../src/components/GlobalAudioHost', () => ({
  GlobalAudioHost: () => <div data-testid="mock-audio-host" />
}));
vi.mock('../../src/components/BackgroundCanvas', () => ({
  BackgroundCanvas: () => <div data-testid="mock-background-canvas" />
}));
vi.mock('../../src/components/AmbientOverlay', () => ({
  AmbientOverlay: () => <div data-testid="mock-ambient-overlay" />
}));
vi.mock('../../src/components/mobile/views/MobileFocusView', () => ({
  MobileFocusView: () => <div data-testid="mock-focus-view" />
}));
vi.mock('../../src/components/mobile/views/MobileSettingsView', () => ({
  MobileSettingsView: () => <div data-testid="mock-settings-view" />
}));

describe('Adversarial Stress Test: Back-Stack & Exit Double-Tap Attack (Milestone M2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    backStack.clear();
    useLayoutStore.setState({ activeMobileTab: 'focus' as any });
    useAiStore.setState({ isTopupModalOpen: false });
    useTimerStore.setState({ status: 'idle', remainingMs: 25 * 60 * 1000 });
  });

  afterEach(() => {
    cleanup();
    delete (window as any).PomoNativeBack;
    delete (window as any).PomoNativeBridge;
    delete (window as any).Capacitor;
    backStack.clear();
  });

  // =========================================================================
  // SUITE 1: STRESS & EDGE-CASE ATTACK ON src/services/backStack.ts
  // =========================================================================
  describe('Suite 1: Stress & Edge-Case Attack on backStack.ts', () => {
    it('ATTACK-01: Empty stack operations must degrade gracefully with zero errors', () => {
      expect(backStack.count).toBe(0);
      expect(backStack.hasOverlays()).toBe(false);
      expect(backStack.getStackIds()).toEqual([]);

      // Calling dismissTop on empty stack returns false and never throws
      expect(backStack.dismissTop()).toBe(false);
      expect(backStack.count).toBe(0);

      // Calling pop with no argument or invalid ID returns undefined
      expect(backStack.pop()).toBeUndefined();
      expect(backStack.pop('non-existent-id-999')).toBeUndefined();
      expect(backStack.pop('')).toBeUndefined();

      // Calling clear on empty stack does not crash or trigger listeners
      const listener = vi.fn();
      const unsub = backStack.subscribe(listener);
      backStack.clear();
      expect(listener).not.toHaveBeenCalled();
      unsub();
    });

    it('ATTACK-02: Simultaneous overlays with random out-of-order unregistrations', () => {
      const dismiss1 = vi.fn();
      const dismiss2 = vi.fn();
      const dismiss3 = vi.fn();
      const dismiss4 = vi.fn();
      const dismiss5 = vi.fn();

      const unregister1 = backStack.push({ id: 'sheet-1', dismiss: dismiss1 });
      const unregister2 = backStack.push({ id: 'sheet-2', dismiss: dismiss2 });
      const unregister3 = backStack.push({ id: 'sheet-3', dismiss: dismiss3 });
      const unregister4 = backStack.push({ id: 'sheet-4', dismiss: dismiss4 });
      const unregister5 = backStack.push({ id: 'sheet-5', dismiss: dismiss5 });

      expect(backStack.count).toBe(5);
      expect(backStack.getStackIds()).toEqual(['sheet-1', 'sheet-2', 'sheet-3', 'sheet-4', 'sheet-5']);

      // Unregister sheet-3 out-of-order (middle of the stack)
      unregister3();
      expect(backStack.count).toBe(4);
      expect(backStack.getStackIds()).toEqual(['sheet-1', 'sheet-2', 'sheet-4', 'sheet-5']);

      // Dismiss top overlay -> should dismiss sheet-5
      expect(backStack.dismissTop()).toBe(true);
      expect(dismiss5).toHaveBeenCalledTimes(1);
      expect(backStack.count).toBe(3);
      expect(backStack.getStackIds()).toEqual(['sheet-1', 'sheet-2', 'sheet-4']);

      // Unregister sheet-1 out-of-order (bottom of the stack)
      unregister1();
      expect(backStack.count).toBe(2);
      expect(backStack.getStackIds()).toEqual(['sheet-2', 'sheet-4']);

      // Redundant unregister calls on already removed items must be safe no-ops
      unregister3();
      unregister1();
      expect(backStack.count).toBe(2);

      // Dismiss remaining overlays in reverse stack order
      expect(backStack.dismissTop()).toBe(true);
      expect(dismiss4).toHaveBeenCalledTimes(1);

      expect(backStack.dismissTop()).toBe(true);
      expect(dismiss2).toHaveBeenCalledTimes(1);

      expect(backStack.count).toBe(0);
      expect(backStack.hasOverlays()).toBe(false);

      // Neither dismiss1 nor dismiss3 should have been called (they were unmounted/unregistered directly)
      expect(dismiss1).not.toHaveBeenCalled();
      expect(dismiss3).not.toHaveBeenCalled();
    });

    it('ATTACK-03: High frequency chaotic burst (500 interleaved push/pop operations)', () => {
      const dismissFns = new Map<string, ReturnType<typeof vi.fn>>();
      const unregisterFns = new Map<string, () => void>();

      for (let i = 0; i < 500; i++) {
        const op = i % 4;
        const id = `overlay-${i % 20}`; // high collision rate on 20 IDs

        if (op === 0 || op === 1) {
          // Push operation (with occasional duplicate ID replacement)
          const dismiss = vi.fn();
          dismissFns.set(id, dismiss);
          const unregister = backStack.push({ id, dismiss, priority: i % 5 });
          unregisterFns.set(id, unregister);
        } else if (op === 2) {
          // Unregister a pseudo-random ID
          const targetId = `overlay-${(i * 7) % 20}`;
          const unreg = unregisterFns.get(targetId);
          if (unreg) {
            unreg();
            unregisterFns.delete(targetId);
          }
        } else {
          // Dismiss top
          backStack.dismissTop();
        }

        // Integrity invariant check after EVERY operation
        expect(backStack.count).toBe(backStack.getStackIds().length);
        expect(backStack.hasOverlays()).toBe(backStack.count > 0);
        expect(backStack.count).toBeGreaterThanOrEqual(0);
      }

      // Cleanup
      backStack.clear();
      expect(backStack.count).toBe(0);
      expect(backStack.hasOverlays()).toBe(false);
    });

    it('ATTACK-04: Resilience against exploding dismiss callbacks and re-entrant registrations', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Overlay whose dismiss function throws a fatal exception
      const explodingDismiss = vi.fn(() => {
        throw new Error('FATAL_CRASH_IN_MODAL_DISMISS');
      });
      const normalDismiss = vi.fn();

      backStack.push({ id: 'normal-base', dismiss: normalDismiss });
      backStack.push({ id: 'exploding-top', dismiss: explodingDismiss });

      expect(backStack.count).toBe(2);

      // Dismissing top overlay should NOT crash the app
      let didThrow = false;
      try {
        const result = backStack.dismissTop();
        expect(result).toBe(true);
      } catch {
        didThrow = true;
      }
      expect(didThrow).toBe(false);
      expect(explodingDismiss).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalled();

      // Top was still removed despite exception
      expect(backStack.count).toBe(1);
      expect(backStack.getStackIds()).toEqual(['normal-base']);

      // Next overlay can still be dismissed normally
      expect(backStack.dismissTop()).toBe(true);
      expect(normalDismiss).toHaveBeenCalledTimes(1);
      expect(backStack.count).toBe(0);

      // Re-entrant push inside dismiss callback
      const followUpDismiss = vi.fn();
      const parentDismiss = vi.fn(() => {
        backStack.push({ id: 'confirm-save-dialog', dismiss: followUpDismiss, priority: 10 });
      });

      backStack.push({ id: 'parent-modal', dismiss: parentDismiss });
      expect(backStack.count).toBe(1);

      // Dismissing parent opens confirmation dialog
      backStack.dismissTop();
      expect(parentDismiss).toHaveBeenCalledTimes(1);
      expect(backStack.count).toBe(1);
      expect(backStack.getStackIds()).toEqual(['confirm-save-dialog']);

      // Dismissing confirmation dialog finishes stack
      backStack.dismissTop();
      expect(followUpDismiss).toHaveBeenCalledTimes(1);
      expect(backStack.count).toBe(0);

      consoleWarnSpy.mockRestore();
    });

    it('ATTACK-05: Priority sorting with negative, zero, undefined, and identical priorities', () => {
      const dismissNeg = vi.fn();
      const dismissZero = vi.fn();
      const dismissUndef = vi.fn();
      const dismissHigh1 = vi.fn();
      const dismissHigh2 = vi.fn();

      // Pushing items with diverse priorities
      backStack.push({ id: 'neg', dismiss: dismissNeg, priority: -10 });
      backStack.push({ id: 'zero', dismiss: dismissZero, priority: 0 });
      backStack.push({ id: 'undef', dismiss: dismissUndef });
      backStack.push({ id: 'high-1', dismiss: dismissHigh1, priority: 50 });
      backStack.push({ id: 'high-2', dismiss: dismissHigh2, priority: 50 });

      // In stable sort:
      // -10 is at bottom (index 0)
      // 0 and undefined (evaluated to 0) in middle
      // 50 (high-1 then high-2) at top
      // Dismissing top should dismiss high-2 first (most recent high priority), then high-1
      expect(backStack.dismissTop()).toBe(true);
      expect(dismissHigh2).toHaveBeenCalledTimes(1);
      expect(dismissHigh1).not.toHaveBeenCalled();

      expect(backStack.dismissTop()).toBe(true);
      expect(dismissHigh1).toHaveBeenCalledTimes(1);

      // Lowest priority -10 will be dismissed last
      backStack.dismissTop(); // pops one of zero/undef
      backStack.dismissTop(); // pops other of zero/undef
      expect(backStack.dismissTop()).toBe(true); // pops neg
      expect(dismissNeg).toHaveBeenCalledTimes(1);

      expect(backStack.count).toBe(0);
    });

    it('ATTACK-06: Listener resilience when listeners unsubscribe or fail', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const badListener = vi.fn(() => {
        throw new Error('Listener bomb');
      });
      const goodListener = vi.fn();

      const unsubBad = backStack.subscribe(badListener);
      const unsubGood = backStack.subscribe(goodListener);

      // Push should trigger both without stopping on bad listener
      backStack.push({ id: 'test-item', dismiss: () => {} });
      expect(badListener).toHaveBeenCalledTimes(1);
      expect(goodListener).toHaveBeenCalledTimes(1);

      // Self-unsubscribing listener
      let unsubSelf: (() => void) | null = null;
      const selfUnsubListener = vi.fn(() => {
        if (unsubSelf) unsubSelf();
      });
      unsubSelf = backStack.subscribe(selfUnsubListener);

      backStack.dismissTop();
      expect(selfUnsubListener).toHaveBeenCalledTimes(1);

      // Further actions should not call unsubscribed self listener
      backStack.push({ id: 'another-item', dismiss: () => {} });
      expect(selfUnsubListener).toHaveBeenCalledTimes(1);

      unsubBad();
      unsubGood();
      consoleWarnSpy.mockRestore();
    });
  });

  // =========================================================================
  // SUITE 2: HARDWARE BACK ATTACK IN MobileAppShell.tsx (BUG-05)
  // =========================================================================
  describe('Suite 2: Hardware Back & Exit Double-Tap Attack on MobileAppShell.tsx', () => {
    it('ATTACK-07: 1st tap at root screen triggers toast and does NOT exit', () => {
      const setCanGoBackInApp = vi.fn();
      const exitApp = vi.fn();
      (window as any).PomoNativeBack = { setCanGoBackInApp, exitApp };
      (window as any).Capacitor = { Plugins: { App: { exitApp: vi.fn() } } };

      render(<MobileAppShell />);
      expect(setCanGoBackInApp).toHaveBeenCalledWith(false);

      // 1st Hardware Back press
      act(() => {
        window.dispatchEvent(new CustomEvent('pomofocus:native-back'));
      });

      // Assert: Exit was NOT called
      expect(exitApp).not.toHaveBeenCalled();
      expect((window as any).Capacitor.Plugins.App.exitApp).not.toHaveBeenCalled();

      // Assert: Toast is displayed with exact text
      const toast = screen.getByTestId('back-exit-toast');
      expect(toast).not.toBeNull();
      expect(toast.textContent).toContain('Nhấn lần nữa để thoát');

      // Assert: Bridge was notified that canGoBackInApp is now true (for 2nd tap)
      expect(setCanGoBackInApp).toHaveBeenLastCalledWith(true);
    });

    it('ATTACK-08: 2nd tap within 2000ms window cleanly triggers exit on all bridges', () => {
      vi.useFakeTimers();
      const setCanGoBackInApp = vi.fn();
      const exitAppNative = vi.fn();
      const exitAppCapacitor = vi.fn();

      (window as any).PomoNativeBack = { setCanGoBackInApp, exitApp: exitAppNative };
      (window as any).Capacitor = { Plugins: { App: { exitApp: exitAppCapacitor } } };

      render(<MobileAppShell />);

      // 1st Back press at t=0ms
      act(() => {
        window.dispatchEvent(new CustomEvent('pomofocus:native-back'));
      });
      expect(screen.getByTestId('back-exit-toast')).not.toBeNull();

      // Advance clock by 1200ms (safely within 2000ms window)
      act(() => {
        vi.advanceTimersByTime(1200);
      });

      // 2nd Back press at t=1200ms
      act(() => {
        window.dispatchEvent(new CustomEvent('pomofocus:native-back'));
      });

      // Assert: Both native bridge and Capacitor exit were triggered
      expect(exitAppNative).toHaveBeenCalledTimes(1);
      expect(exitAppCapacitor).toHaveBeenCalledTimes(1);

      // Assert: Toast removed immediately upon exit confirmation
      expect(screen.queryByTestId('back-exit-toast')).toBeNull();

      vi.useRealTimers();
    });

    it('ATTACK-09: 2nd tap after 2001ms resets window, displays toast again, and does NOT exit', () => {
      vi.useFakeTimers();
      const setCanGoBackInApp = vi.fn();
      const exitApp = vi.fn();
      (window as any).PomoNativeBack = { setCanGoBackInApp, exitApp };

      render(<MobileAppShell />);

      // 1st Back press at t=0ms
      act(() => {
        window.dispatchEvent(new CustomEvent('pomofocus:native-back'));
      });
      expect(screen.getByTestId('back-exit-toast')).not.toBeNull();

      // Advance time past the 2000ms deadline (e.g. 2050ms)
      act(() => {
        vi.advanceTimersByTime(2050);
      });

      // Toast is now dismissed and window expired
      expect(screen.queryByTestId('back-exit-toast')).toBeNull();
      expect(setCanGoBackInApp).toHaveBeenLastCalledWith(false);

      // 2nd tap at t=2050ms (MUST be treated as a fresh 1st tap, not an exit)
      act(() => {
        window.dispatchEvent(new CustomEvent('pomofocus:native-back'));
      });

      expect(exitApp).not.toHaveBeenCalled();
      expect(screen.getByTestId('back-exit-toast')).not.toBeNull();
      expect(setCanGoBackInApp).toHaveBeenLastCalledWith(true);

      // If followed by another tap within 500ms, it now confirms exit
      act(() => {
        vi.advanceTimersByTime(500);
      });
      act(() => {
        window.dispatchEvent(new CustomEvent('pomofocus:native-back'));
      });

      expect(exitApp).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });

    it('ATTACK-10: Rapid multi-tap burst (5 rapid taps in 500ms) handles exit cleanly without crash', () => {
      vi.useFakeTimers();
      const exitApp = vi.fn();
      (window as any).PomoNativeBack = { setCanGoBackInApp: vi.fn(), exitApp };

      render(<MobileAppShell />);

      // Tap 1 at 0ms: initiates confirmation
      act(() => {
        window.dispatchEvent(new CustomEvent('pomofocus:native-back'));
      });
      expect(exitApp).not.toHaveBeenCalled();

      // Tap 2 at 100ms: confirms exit
      act(() => {
        vi.advanceTimersByTime(100);
        window.dispatchEvent(new CustomEvent('pomofocus:native-back'));
      });
      expect(exitApp).toHaveBeenCalledTimes(1);

      // Tap 3 at 200ms (post-exit spam): should not crash or call exitApp repeatedly
      act(() => {
        vi.advanceTimersByTime(100);
        window.dispatchEvent(new CustomEvent('pomofocus:native-back'));
      });

      // Tap 4 at 300ms
      act(() => {
        vi.advanceTimersByTime(100);
        window.dispatchEvent(new CustomEvent('pomofocus:native-back'));
      });

      // Tap 5 at 400ms
      act(() => {
        vi.advanceTimersByTime(100);
        window.dispatchEvent(new CustomEvent('pomofocus:native-back'));
      });

      expect(screen.getByTestId('mobile-app-shell')).not.toBeNull();
      vi.useRealTimers();
    });

    it('ATTACK-11: Deep hierarchy defense (Nested Overlays -> Shell Modals -> Secondary Tabs -> Root Exit)', () => {
      vi.useFakeTimers();
      const exitApp = vi.fn();
      const setCanGoBackInApp = vi.fn();
      (window as any).PomoNativeBack = { setCanGoBackInApp, exitApp };

      render(<MobileAppShell />);

      // Step 1: Switch to secondary tab 'spaces'
      act(() => {
        useLayoutStore.setState({ activeMobileTab: 'spaces' as any });
      });

      // Step 2: Push 2 centralized overlays to backStack
      const dismissOverlay1 = vi.fn();
      const dismissOverlay2 = vi.fn();
      act(() => {
        backStack.push({ id: 'modal-level-1', dismiss: dismissOverlay1 });
        backStack.push({ id: 'modal-level-2', dismiss: dismissOverlay2 });
      });

      // Step 3: Open topup modal in AiStore
      act(() => {
        useAiStore.setState({ isTopupModalOpen: true });
      });

      // Hierarchy order of defense on Back button:
      // Press 1: Closes modal-level-2 (topmost backStack)
      act(() => {
        window.dispatchEvent(new CustomEvent('pomofocus:native-back'));
      });
      expect(dismissOverlay2).toHaveBeenCalledTimes(1);
      expect(dismissOverlay1).not.toHaveBeenCalled();
      expect(useAiStore.getState().isTopupModalOpen).toBe(true);
      expect(useLayoutStore.getState().activeMobileTab).toBe('spaces');
      expect(exitApp).not.toHaveBeenCalled();

      // Press 2: Closes modal-level-1
      act(() => {
        window.dispatchEvent(new CustomEvent('pomofocus:native-back'));
      });
      expect(dismissOverlay1).toHaveBeenCalledTimes(1);
      expect(useAiStore.getState().isTopupModalOpen).toBe(true);
      expect(useLayoutStore.getState().activeMobileTab).toBe('spaces');
      expect(exitApp).not.toHaveBeenCalled();

      // Press 3: Closes topup modal (local shell modal)
      act(() => {
        window.dispatchEvent(new CustomEvent('pomofocus:native-back'));
      });
      expect(useAiStore.getState().isTopupModalOpen).toBe(false);
      expect(useLayoutStore.getState().activeMobileTab).toBe('spaces');
      expect(exitApp).not.toHaveBeenCalled();

      // Press 4: Returns from 'spaces' tab to 'focus' tab
      act(() => {
        window.dispatchEvent(new CustomEvent('pomofocus:native-back'));
      });
      expect(useLayoutStore.getState().activeMobileTab).toBe('focus');
      expect(exitApp).not.toHaveBeenCalled();

      // Press 5: Now on root screen! 1st tap triggers exit toast
      act(() => {
        window.dispatchEvent(new CustomEvent('pomofocus:native-back'));
      });
      expect(screen.getByTestId('back-exit-toast')).not.toBeNull();
      expect(exitApp).not.toHaveBeenCalled();

      // Press 6: 2nd tap within 2000ms -> EXITS APP!
      act(() => {
        vi.advanceTimersByTime(800);
        window.dispatchEvent(new CustomEvent('pomofocus:native-back'));
      });
      expect(exitApp).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });

    it('ATTACK-12: PopState event intercepts backStack and secondary tabs gracefully', () => {
      const setCanGoBackInApp = vi.fn();
      (window as any).PomoNativeBack = { setCanGoBackInApp };

      render(<MobileAppShell />);

      const dismissOverlay = vi.fn();
      act(() => {
        backStack.push({ id: 'popstate-test-overlay', dismiss: dismissOverlay });
      });

      // Dispatch popstate event with preventDefault spy
      const popStateEvent = new PopStateEvent('popstate');
      const preventDefaultSpy = vi.spyOn(popStateEvent, 'preventDefault');

      act(() => {
        window.dispatchEvent(popStateEvent);
      });

      expect(dismissOverlay).toHaveBeenCalledTimes(1);
      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('ATTACK-13: Graceful degradation when all native bridges are completely absent', () => {
      vi.useFakeTimers();
      // Ensure zero native bridges exist on window
      delete (window as any).PomoNativeBack;
      delete (window as any).PomoNativeBridge;
      delete (window as any).Capacitor;

      render(<MobileAppShell />);

      // 1st Back press should show toast without crashing
      act(() => {
        window.dispatchEvent(new CustomEvent('pomofocus:native-back'));
      });
      expect(screen.getByTestId('back-exit-toast')).not.toBeNull();

      // 2nd Back press should not throw TypeError
      let didThrow = false;
      try {
        act(() => {
          vi.advanceTimersByTime(500);
          window.dispatchEvent(new CustomEvent('pomofocus:native-back'));
        });
      } catch {
        didThrow = true;
      }

      expect(didThrow).toBe(false);
      vi.useRealTimers();
    });

    it('ATTACK-14: Unmounting shell clears exit timer and cleans up bridge state', () => {
      vi.useFakeTimers();
      const setCanGoBackInApp = vi.fn();
      (window as any).PomoNativeBack = { setCanGoBackInApp };

      const { unmount } = render(<MobileAppShell />);

      // Trigger toast timer
      act(() => {
        window.dispatchEvent(new CustomEvent('pomofocus:native-back'));
      });
      expect(screen.getByTestId('back-exit-toast')).not.toBeNull();

      // Unmount while timer is pending
      unmount();

      // Bridge is reset to false
      expect(setCanGoBackInApp).toHaveBeenLastCalledWith(false);

      // Advancing timer after unmount should not cause state errors
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      vi.useRealTimers();
    });
  });
});
