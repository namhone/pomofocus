import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';
import { backStack } from '../../src/services/backStack';
import { MobileAppShell } from '../../src/components/mobile/MobileAppShell';
import { MobileBottomNav } from '../../src/components/MobileBottomNav';
import { SharedFooter } from '../../src/components/SharedFooter';
import { useLayoutStore } from '../../src/stores/useLayoutStore';
import { useAiStore } from '../../src/stores/useAiStore';
import { useTimerStore } from '../../src/stores/useTimerStore';

describe('Milestone M2: Hardware Back-Stack, Edge-to-Edge Insets & Splash/Offline (BUG-04, 05, 06, 07, 12)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    backStack.clear();
    useLayoutStore.setState({ activeMobileTab: 'focus' as any });
    useAiStore.setState({ isTopupModalOpen: false });
    useTimerStore.setState({ status: 'idle', remainingMs: 25 * 60 * 1000 });
  });

  afterEach(() => {
    delete (window as any).PomoNativeBack;
    delete (window as any).PomoNativeBridge;
    delete (window as any).Capacitor;
    backStack.clear();
  });

  // =========================================================================
  // 1. Centralized BackStack Manager Unit Tests
  // =========================================================================
  describe('1. Centralized BackStack Manager', () => {
    it('pushes items, updates count and dismisses in order', () => {
      const dismissA = vi.fn();
      const dismissB = vi.fn();

      expect(backStack.hasOverlays()).toBe(false);
      expect(backStack.count).toBe(0);

      const unregisterA = backStack.push({ id: 'modal-a', dismiss: dismissA });
      expect(backStack.hasOverlays()).toBe(true);
      expect(backStack.count).toBe(1);

      backStack.push({ id: 'modal-b', dismiss: dismissB });
      expect(backStack.count).toBe(2);

      // Top item is modal-b
      const dismissed = backStack.dismissTop();
      expect(dismissed).toBe(true);
      expect(dismissB).toHaveBeenCalledTimes(1);
      expect(dismissA).not.toHaveBeenCalled();
      expect(backStack.count).toBe(1);

      // Unregister A cleans up
      unregisterA();
      expect(backStack.count).toBe(0);
      expect(backStack.hasOverlays()).toBe(false);

      // Dismiss on empty returns false
      expect(backStack.dismissTop()).toBe(false);
    });

    it('respects priority ordering for overlays (higher priority dismissed first)', () => {
      const dismissLow = vi.fn();
      const dismissHigh = vi.fn();

      backStack.push({ id: 'low-priority', dismiss: dismissLow, priority: 5 });
      backStack.push({ id: 'high-priority', dismiss: dismissHigh, priority: 20 });

      // Dismiss top should dismiss high priority first
      backStack.dismissTop();
      expect(dismissHigh).toHaveBeenCalledTimes(1);
      expect(dismissLow).not.toHaveBeenCalled();
      expect(backStack.count).toBe(1);

      backStack.dismissTop();
      expect(dismissLow).toHaveBeenCalledTimes(1);
      expect(backStack.count).toBe(0);
    });

    it('notifies subscribers on push, pop, and clear', () => {
      const subscriber = vi.fn();
      const unsubscribe = backStack.subscribe(subscriber);

      backStack.push({ id: 'item-1', dismiss: () => {} });
      expect(subscriber).toHaveBeenCalledTimes(1);

      backStack.pop('item-1');
      expect(subscriber).toHaveBeenCalledTimes(2);

      backStack.push({ id: 'item-2', dismiss: () => {} });
      backStack.clear();
      expect(subscriber).toHaveBeenCalledTimes(4);

      unsubscribe();
      backStack.push({ id: 'item-3', dismiss: () => {} });
      expect(subscriber).toHaveBeenCalledTimes(4); // No more calls after unsubscribe
    });
  });

  // =========================================================================
  // 2. Hardware Back Button & Back-Stack in MobileAppShell (BUG-05)
  // =========================================================================
  describe('2. Hardware Back Button & Overlay Interception in MobileAppShell (BUG-05)', () => {
    it('sets canGoBackInApp = false on root focus tab with zero overlays', () => {
      const setCanGoBackInApp = vi.fn();
      (window as any).PomoNativeBack = { setCanGoBackInApp };

      render(<MobileAppShell />);
      expect(setCanGoBackInApp).toHaveBeenCalledWith(false);
    });

    it('sets canGoBackInApp = true when an overlay is registered in backStack', () => {
      const setCanGoBackInApp = vi.fn();
      (window as any).PomoNativeBack = { setCanGoBackInApp };

      render(<MobileAppShell />);
      expect(setCanGoBackInApp).toHaveBeenLastCalledWith(false);

      // Register an overlay to centralized back-stack
      act(() => {
        backStack.push({ id: 'test-sheet', dismiss: () => {} });
      });

      expect(setCanGoBackInApp).toHaveBeenLastCalledWith(true);

      // Remove overlay
      act(() => {
        backStack.clear();
      });

      expect(setCanGoBackInApp).toHaveBeenLastCalledWith(false);
    });

    it('pressing hardware Back button closes topmost overlay and prevents exit', () => {
      const setCanGoBackInApp = vi.fn();
      (window as any).PomoNativeBack = { setCanGoBackInApp };

      render(<MobileAppShell />);

      const dismissModal = vi.fn();
      act(() => {
        backStack.push({ id: 'nested-drawer', dismiss: dismissModal });
      });
      expect(setCanGoBackInApp).toHaveBeenLastCalledWith(true);

      // Hardware back button event triggered by Android
      act(() => {
        window.dispatchEvent(new CustomEvent('pomofocus:native-back'));
      });

      expect(dismissModal).toHaveBeenCalledTimes(1);
      expect(useLayoutStore.getState().activeMobileTab).toBe('focus');
      expect(setCanGoBackInApp).toHaveBeenLastCalledWith(false);
    });

    it('pressing hardware Back button on secondary tab returns to focus tab', () => {
      const setCanGoBackInApp = vi.fn();
      (window as any).PomoNativeBack = { setCanGoBackInApp };

      render(<MobileAppShell />);

      // Switch to tasks tab
      fireEvent.click(screen.getByTestId('mobile-nav-tab-tasks'));
      expect(useLayoutStore.getState().activeMobileTab).toBe('tasks');
      expect(setCanGoBackInApp).toHaveBeenLastCalledWith(true);

      // Press hardware back
      act(() => {
        window.dispatchEvent(new CustomEvent('pomofocus:native-back'));
      });

      expect(useLayoutStore.getState().activeMobileTab).toBe('focus');
      expect(setCanGoBackInApp).toHaveBeenLastCalledWith(false);
    });

    it('double-tap back on root screen triggers exit toast on 1st tap, exits on 2nd tap within 2s', () => {
      vi.useFakeTimers();
      const setCanGoBackInApp = vi.fn();
      const exitApp = vi.fn();
      (window as any).PomoNativeBack = { setCanGoBackInApp, exitApp };

      render(<MobileAppShell />);
      expect(setCanGoBackInApp).toHaveBeenCalledWith(false);

      // 1st Back press on root: Shows confirmation toast
      act(() => {
        window.dispatchEvent(new CustomEvent('pomofocus:native-back'));
      });

      expect(screen.getByTestId('back-exit-toast')).not.toBeNull();
      expect(screen.getByTestId('back-exit-toast').textContent).toContain('Nhấn lần nữa để thoát');
      expect(exitApp).not.toHaveBeenCalled();

      // 2nd Back press within 2000ms: Confirms exit!
      act(() => {
        window.dispatchEvent(new CustomEvent('pomofocus:native-back'));
      });

      expect(exitApp).toHaveBeenCalledTimes(1);
      expect(screen.queryByTestId('back-exit-toast')).toBeNull();

      vi.useRealTimers();
    });

    it('double-tap back resets if second tap occurs after 2000ms', () => {
      vi.useFakeTimers();
      const setCanGoBackInApp = vi.fn();
      const exitApp = vi.fn();
      (window as any).PomoNativeBack = { setCanGoBackInApp, exitApp };

      render(<MobileAppShell />);

      // 1st Back press
      act(() => {
        window.dispatchEvent(new CustomEvent('pomofocus:native-back'));
      });
      expect(screen.getByTestId('back-exit-toast')).not.toBeNull();

      // Advance clock past 2000ms window
      act(() => {
        vi.advanceTimersByTime(2100);
      });
      expect(screen.queryByTestId('back-exit-toast')).toBeNull();

      // Next press is treated as a fresh 1st tap (shows toast again, does not exit)
      act(() => {
        window.dispatchEvent(new CustomEvent('pomofocus:native-back'));
      });
      expect(screen.getByTestId('back-exit-toast')).not.toBeNull();
      expect(exitApp).not.toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  // =========================================================================
  // 3. Android 15 Edge-to-Edge Dynamic Safe Area Insets (BUG-06, BUG-07)
  // =========================================================================
  describe('3. Android 15 Edge-to-Edge Dynamic Safe Area Insets (BUG-06, BUG-07)', () => {
    it('removes max-h-[56px] and applies dynamic calc height and pb-safe in MobileBottomNav', () => {
      const bottomNavSrc = fs.readFileSync(
        path.resolve(process.cwd(), 'src/components/MobileBottomNav.tsx'),
        'utf-8'
      );

      // Must not contain restrictive max-h-[56px]
      expect(bottomNavSrc).not.toContain('max-h-[56px]');

      // Must contain dynamic calc with env(safe-area-inset-bottom) and pb-safe
      expect(bottomNavSrc).toContain('h-[calc(56px+env(safe-area-inset-bottom,0px))]');
      expect(bottomNavSrc).toContain('pb-safe');
    });

    it('removes max-h-[56px] and applies dynamic calc height and pb-safe in MobileAppShell bottom nav', () => {
      const appShellSrc = fs.readFileSync(
        path.resolve(process.cwd(), 'src/components/mobile/MobileAppShell.tsx'),
        'utf-8'
      );

      // Bottom nav in MobileAppShell must not contain max-h-[56px]
      expect(appShellSrc).not.toContain('max-h-[56px]');
      expect(appShellSrc).toContain('h-[calc(56px+env(safe-area-inset-bottom,0px))]');
      expect(appShellSrc).toContain('pb-safe');
    });

    it('embeds pt-safe inside MobileAppShell top header without dark cutout band on root container (BUG-07)', () => {
      const appShellSrc = fs.readFileSync(
        path.resolve(process.cwd(), 'src/components/mobile/MobileAppShell.tsx'),
        'utf-8'
      );

      // Root container does not have pt-safe or pb-safe (avoids dark band slicing wallpaper)
      const rootMatch = appShellSrc.match(/data-testid="mobile-app-shell"[\s\S]*?className=\{`([^`]+)`\}/);
      expect(rootMatch).not.toBeNull();
      const rootClasses = rootMatch![1];
      expect(rootClasses).not.toContain('pt-safe');
      expect(rootClasses).not.toContain('pb-safe');

      // Top header embeds pt-safe and dynamic safe area height
      expect(appShellSrc).toContain('h-[calc(48px+env(safe-area-inset-top,0px))]');
      expect(appShellSrc).toContain('pt-safe');
    });

    it('includes pb-safe on SharedFooter to prevent gesture pill overlap (BUG-06)', () => {
      const footerSrc = fs.readFileSync(
        path.resolve(process.cwd(), 'src/components/SharedFooter.tsx'),
        'utf-8'
      );
      expect(footerSrc).toContain('pb-safe');
    });
  });

  // =========================================================================
  // 4. Splash Curtain Minimalist Branding Logo (BUG-04)
  // =========================================================================
  describe('4. Splash Curtain Minimalist Branding Logo (BUG-04)', () => {
    const indexHtml = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');

    it('embeds clean minimalist PomoFocus SVG emblem inside #pomo-splash-curtain', () => {
      const dom = new JSDOM(indexHtml);
      const curtain = dom.window.document.getElementById('pomo-splash-curtain');
      expect(curtain).not.toBeNull();

      // SVG logo presence
      const svg = curtain!.querySelector('svg.pomo-splash-logo');
      expect(svg).not.toBeNull();
      expect(svg!.getAttribute('viewBox')).toBe('0 0 1000 1000');

      // Squircle app icon container and clock "P" shape paths
      expect(curtain!.innerHTML).toContain('rx="232"');
      expect(curtain!.innerHTML).toContain('circle cx="500" cy="498"');

      // Brand title and subtitle
      const title = curtain!.querySelector('.pomo-splash-title');
      const subtitle = curtain!.querySelector('.pomo-splash-sub');
      expect(title?.textContent).toBe('PomoFocus');
      expect(subtitle?.textContent).toBe('Study Workspace');

      // Preserves spinner
      const spinner = curtain!.querySelector('.pomo-spinner');
      expect(spinner).not.toBeNull();
    });

    it('applies subtle breathing pulse animation and keeps pointer-events: none', () => {
      expect(indexHtml).toContain('.pomo-splash-content {');
      expect(indexHtml).toContain('animation: pomoPulse 2s ease-in-out infinite;');
      expect(indexHtml).toContain('@keyframes pomoPulse {');
      expect(indexHtml).toContain('pointer-events: none;');
      expect(indexHtml).toContain('z-index: 99999;');
    });
  });

  // =========================================================================
  // 5. KaTeX Offline Caching (BUG-12)
  // =========================================================================
  describe('5. KaTeX Offline Caching (BUG-12)', () => {
    it('includes woff, woff2, ttf fonts in vite.config.ts Workbox globPatterns', () => {
      const viteConfig = fs.readFileSync(path.resolve(process.cwd(), 'vite.config.ts'), 'utf-8');
      expect(viteConfig).toMatch(/globPatterns:\s*\[.*woff.*woff2.*ttf.*\]/);
    });

    it('registers CacheFirst runtime caching route for KaTeX CDN styles and fonts in src/sw.ts', () => {
      const swSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/sw.ts'), 'utf-8');
      expect(swSrc).toContain("url.origin === 'https://cdn.jsdelivr.net'");
      expect(swSrc).toContain("url.pathname.includes('/katex@')");
      expect(swSrc).toContain("cacheName: 'katex-cdn-cache'");
      expect(swSrc).toContain('CacheFirst');
    });

    it('preserves pinned KaTeX CDN links in index.html for zero-FOUT browser fallback', () => {
      const indexHtml = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');
      expect(indexHtml).toContain('https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css');
      expect(indexHtml).toContain('rel="stylesheet"');
    });
  });

  // =========================================================================
  // 6. MainActivity.java Bridge & Back Callback Verification
  // =========================================================================
  describe('6. MainActivity.java Bridge & Back Callback (BUG-05)', () => {
    it('implements OnBackPressedCallback, PomoNativeBack, exitApp and 2s root double-tap exit', () => {
      const mainActivityPath = path.resolve(
        process.cwd(),
        'android/app/src/main/java/com/pomofocus/workspace/MainActivity.java'
      );
      const javaSrc = fs.readFileSync(mainActivityPath, 'utf-8');

      expect(javaSrc).toContain('OnBackPressedCallback');
      expect(javaSrc).toContain('getOnBackPressedDispatcher().addCallback');
      expect(javaSrc).toContain('PomoNativeBack');
      expect(javaSrc).toContain('pomofocus:native-back');
      expect(javaSrc).toContain('public void exitApp()');
      expect(javaSrc).toContain('finishAffinity()');
      expect(javaSrc).toContain('currentTime - lastBackPressedTime < 2000');
    });
  });
});
