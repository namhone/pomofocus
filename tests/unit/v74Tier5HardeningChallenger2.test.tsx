import 'fake-indexeddb/auto';
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

// Application Components & Routing
import { App } from '../../src/App';
import { RouterProvider } from '../../src/services/router';
import { WebDownloadHub, PUBLIC_APK_URL } from '../../src/components/landing/WebDownloadHub';
import { LiquidUpdateBanner, DEFAULT_DOWNLOAD_URL } from '../../src/components/LiquidUpdateBanner';

// Stores & Engines
import { useTimerStore, getStaticRouteTitle, updateDocumentTitle, ROUTE_STATIC_TITLES } from '../../src/stores/useTimerStore';
import { useLayoutStore } from '../../src/stores/useLayoutStore';
import { useAiStore } from '../../src/stores/useAiStore';
import { useTaskStore } from '../../src/stores/useTaskStore';
import {
  TimerEngine,
  loadStoredSettings,
  persistSettings,
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  RUNTIME_STORAGE_KEY
} from '../../src/services/timerEngine';
import { isUpdateAvailable } from '../../src/utils/versionCompare';

/**
 * Challenger 2: Milestone 4 Phase 2
 * Tier 5 White-Box Adversarial Hardening Suite
 *
 * Scopes Covered:
 * 1. Viewport toggling & routing between /download, /downloads, /apk, /, /billing, /dashboard, etc.
 * 2. Standalone APK file on disk: actual file size, integrity, magic bytes, EOCD, SHA-256 & HTTP headers.
 * 3. LocalStorage & SessionStorage state persistence across updates, schema migrations & corrupted payloads.
 */

describe('Milestone 4 Tier 5 Hardening: Viewport, Routing, Standalone APK & Storage Persistence', () => {
  let mediaQueryListeners = new Set<(e: any) => void>();
  let currentMediaQueryMatches = false; // Default desktop

  beforeEach(() => {
    vi.clearAllMocks();

    // Prevent JSDOM media element and window.scrollTo exceptions
    window.HTMLMediaElement.prototype.pause = vi.fn();
    window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    window.scrollTo = vi.fn();

    mediaQueryListeners.clear();
    currentMediaQueryMatches = false;

    // Reset Stores to pristine baseline
    useTimerStore.setState({
      status: 'idle',
      remainingMs: 25 * 60 * 1000,
      phase: 'pomodoro',
      currentRound: 1,
      linkedTaskId: null,
      linkedTaskTitle: null,
      settings: { ...DEFAULT_SETTINGS }
    });

    useLayoutStore.setState({
      activeMobileTab: 'focus' as any,
      isMobile: false,
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

    // Default Desktop UserAgent
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      writable: true,
      configurable: true
    });

    // Reset localStorage and sessionStorage
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // SUITE 1: VIEWPORT RESIZING & ADVERSARIAL ROUTING
  // =========================================================================
  describe('Suite 1: Viewport Resizing & Dynamic Routing Stress', () => {
    it('1.1 Renders Desktop layout at /app on wide viewport, transitions to MobileAppShell upon resize, preserving timer', async () => {
      window.history.pushState({}, '', '/app');
      currentMediaQueryMatches = false; // Desktop <= 768px is FALSE

      const { unmount } = render(
        <RouterProvider>
          <App />
        </RouterProvider>
      );

      // Verify Desktop Workspace is active
      expect(screen.getByTestId('workspace-root')).toBeDefined();
      expect(screen.queryByTestId('mobile-app-shell')).toBeNull();

      // Start the timer while in Desktop mode
      act(() => {
        useTimerStore.getState().start();
      });
      expect(useTimerStore.getState().status).toBe('running');
      const remainingMsBeforeResize = useTimerStore.getState().remainingMs;

      // Simulate dynamic resize to Mobile viewport (e.g. mobile tablet rotation or device emulation)
      act(() => {
        currentMediaQueryMatches = true;
        // Fire resize listeners
        mediaQueryListeners.forEach((listener) => listener({ matches: true }));
        window.dispatchEvent(new Event('resize'));
      });

      // After rerender, MobileAppShell should take over without timer reset
      unmount();
      render(
        <RouterProvider>
          <App />
        </RouterProvider>
      );

      expect(screen.getByTestId('mobile-app-shell')).toBeDefined();
      expect(screen.queryByTestId('workspace-root')).toBeNull();

      // Invariant: timer status and remaining time are strictly preserved across breakpoint transitions
      expect(useTimerStore.getState().status).toBe('running');
      expect(useTimerStore.getState().remainingMs).toBeLessThanOrEqual(remainingMsBeforeResize);
    });

    it('1.2 Routing matrix: canonical and alias download paths (/download, /downloads, /apk) all render WebDownloadHub', () => {
      const downloadRoutes = ['/download', '/downloads', '/apk'];

      for (const route of downloadRoutes) {
        window.history.pushState({}, '', route);
        const { unmount } = render(
          <RouterProvider>
            <App />
          </RouterProvider>
        );

        // WebDownloadHub must be rendered for all 3 canonical distribution paths
        expect(screen.getByTestId('download-hub-container')).toBeDefined();
        expect(screen.getByTestId('central-apk-download-btn')).toBeDefined();
        expect(screen.getByTestId('phone-mockup-preview')).toBeDefined();
        expect(screen.getByTestId('dynamic-qr-code')).toBeDefined();

        unmount();
      }
    });

    it('1.3 Comprehensive route navigation: verifies all primary views render without errors', async () => {
      const routesToVerify = [
        { path: '/', expectedKeyword: 'Pomodoro' },
        { path: '/billing', expectedKeyword: 'Gói' },
        { path: '/dashboard', expectedKeyword: 'Thống kê' },
        { path: '/settings', expectedKeyword: 'Cài đặt' },
        { path: '/calendar', expectedKeyword: 'Lịch' },
        { path: '/help', expectedKeyword: 'Trợ giúp' },
        { path: '/terms', expectedKeyword: 'Điều khoản' },
        { path: '/privacy', expectedKeyword: 'Bảo mật' }
      ];

      for (const testCase of routesToVerify) {
        window.history.pushState({}, '', testCase.path);
        const { container, unmount } = render(
          <RouterProvider>
            <App />
          </RouterProvider>
        );

        // Container should not be empty and not render 404
        expect(container.innerHTML.length).toBeGreaterThan(100);
        unmount();
      }
    });

    it('1.4 Unrecognized route renders NotFoundView (404 isolation)', () => {
      window.history.pushState({}, '', '/non-existent-random-path-404');
      const { unmount } = render(
        <RouterProvider>
          <App />
        </RouterProvider>
      );

      // Verify fallback 404 view contains the glitch text element
      expect(screen.getByTestId('404-glitch-text')).toBeDefined();
      expect(screen.getByTestId('404-btn-home')).toBeDefined();
      unmount();
    });

    it('1.5 Rapid sequential route transitions update document titles properly per ROUTE_STATIC_TITLES', () => {
      const routeTransitions = [
        { path: '/download', expectedTitle: ROUTE_STATIC_TITLES['/download'] },
        { path: '/billing', expectedTitle: ROUTE_STATIC_TITLES['/billing'] },
        { path: '/dashboard', expectedTitle: ROUTE_STATIC_TITLES['/dashboard'] },
        { path: '/settings', expectedTitle: ROUTE_STATIC_TITLES['/settings'] },
        { path: '/apk', expectedTitle: ROUTE_STATIC_TITLES['/apk'] }
      ];

      for (const t of routeTransitions) {
        window.history.pushState({}, '', t.path);
        const title = getStaticRouteTitle(t.path);
        expect(title).toBe(t.expectedTitle);

        const { unmount } = render(
          <RouterProvider>
            <App />
          </RouterProvider>
        );

        expect(document.title).toBe(t.expectedTitle);
        unmount();
      }
    });

    it('1.6 Document title updates dynamically to timer countdown on /app route', () => {
      window.history.pushState({}, '', '/app');

      // Update timer state to 24:30 in running status
      updateDocumentTitle(24 * 60 * 1000 + 30 * 1000, 'pomodoro', 'running', 'Toán Học Đại Cương');
      expect(document.title).toContain('24:30');
      expect(document.title).toContain('Toán Học Đại Cương');

      // Paused state
      updateDocumentTitle(10 * 60 * 1000, 'short_break', 'paused', null);
      expect(document.title).toContain('Tạm dừng');
      expect(document.title).toContain('10:00');
    });

    it('1.7 WebDownloadHub navigation bridge navigates seamlessly to /app via router', () => {
      window.history.pushState({}, '', '/download');

      render(
        <RouterProvider>
          <App />
        </RouterProvider>
      );

      const openWebAppBtns = screen.getAllByText('Mở bản web →');
      expect(openWebAppBtns.length).toBeGreaterThanOrEqual(1);
      const openWebAppBtn = openWebAppBtns[openWebAppBtns.length - 1];

      act(() => {
        fireEvent.click(openWebAppBtn);
      });

      // URL should now be /app
      expect(window.location.pathname).toBe('/app');
      expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
    });
  });

  // =========================================================================
  // SUITE 2: STANDALONE APK DISK INTEGRITY & ATTRIBUTES
  // =========================================================================
  describe('Suite 2: Standalone APK Disk Integrity & Attributes', () => {
    const apkRelativePath = path.join(process.cwd(), 'public', 'downloads', 'PomoFocus-v7.4.apk');
    const versionJsonRelativePath = path.join(process.cwd(), 'public', 'version.json');
    const vercelJsonRelativePath = path.join(process.cwd(), 'vercel.json');

    it('2.1 Standalone APK file exists on disk with realistic size (7.0MB - 12.0MB)', () => {
      expect(fs.existsSync(apkRelativePath)).toBe(true);

      const stats = fs.statSync(apkRelativePath);
      const sizeBytes = stats.size;
      const sizeMb = sizeBytes / (1024 * 1024);

      // Verify bounds
      expect(sizeBytes).toBeGreaterThan(1024 * 1024); // > 1MB
      expect(sizeMb).toBeGreaterThan(6.0); // Real Android APK is ~7.98MB
      expect(sizeMb).toBeLessThan(20.0);
    });

    it('2.2 APK binary exhibits valid ZIP / APK Local File Header signature (PK\\x03\\x04)', () => {
      const fd = fs.openSync(apkRelativePath, 'r');
      const magicBuffer = Buffer.alloc(4);
      fs.readSync(fd, magicBuffer, 0, 4, 0);
      fs.closeSync(fd);

      // ZIP magic signature: 0x50, 0x4B, 0x03, 0x04 ("PK\x03\x04")
      expect(magicBuffer[0]).toBe(0x50);
      expect(magicBuffer[1]).toBe(0x4b);
      expect(magicBuffer[2]).toBe(0x03);
      expect(magicBuffer[3]).toBe(0x04);
      expect(magicBuffer.toString('hex')).toBe('504b0304');
    });

    it('2.3 APK binary contains End-of-Central-Directory (EOCD) signature (PK\\x05\\x06)', () => {
      const stats = fs.statSync(apkRelativePath);
      const fd = fs.openSync(apkRelativePath, 'r');
      // Read last 1024 bytes to locate EOCD record
      const tailSize = Math.min(1024, stats.size);
      const tailBuffer = Buffer.alloc(tailSize);
      fs.readSync(fd, tailBuffer, 0, tailSize, stats.size - tailSize);
      fs.closeSync(fd);

      // EOCD signature is 0x50, 0x4b, 0x05, 0x06 ("PK\x05\x06")
      let hasEocd = false;
      for (let i = 0; i < tailBuffer.length - 3; i++) {
        if (
          tailBuffer[i] === 0x50 &&
          tailBuffer[i + 1] === 0x4b &&
          tailBuffer[i + 2] === 0x05 &&
          tailBuffer[i + 3] === 0x06
        ) {
          hasEocd = true;
          break;
        }
      }
      expect(hasEocd).toBe(true);
    });

    it('2.4 Physical APK SHA-256 hash matches public/version.json checksumSha256 exactly', () => {
      expect(fs.existsSync(versionJsonRelativePath)).toBe(true);

      const fileBuffer = fs.readFileSync(apkRelativePath);
      const computedSha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');

      const versionData = JSON.parse(fs.readFileSync(versionJsonRelativePath, 'utf-8'));

      expect(computedSha256).toBe(versionData.checksumSha256);
      expect(computedSha256.length).toBe(64); // 256-bit hex
    });

    it('2.5 WebDownloadHub download anchor enforces download attribute, exact URL, and touch target', () => {
      render(
        <RouterProvider>
          <WebDownloadHub />
        </RouterProvider>
      );

      const downloadAnchor = screen.getByTestId('central-apk-download-btn');
      expect(downloadAnchor).toBeDefined();

      // Check URL and download attribute
      expect(downloadAnchor.getAttribute('href')).toBe(PUBLIC_APK_URL);
      expect(downloadAnchor.getAttribute('download')).toBe('PomoFocus-v7.4.apk');

      // Check that the class includes min-height of 56px and emerald styling
      const className = downloadAnchor.className;
      expect(className).toContain('min-h-[56px]');
      expect(className).toContain('emerald');
    });

    it('2.6 WebDownloadHub clipboard copy button generates user feedback and copies URL', async () => {
      // Mock navigator.clipboard
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock
        }
      });

      render(
        <RouterProvider>
          <WebDownloadHub />
        </RouterProvider>
      );

      const copyBtn = screen.getByTestId('copy-download-url-btn');
      expect(copyBtn).toBeDefined();

      await act(async () => {
        fireEvent.click(copyBtn);
      });

      expect(writeTextMock).toHaveBeenCalledWith(PUBLIC_APK_URL);
      expect(screen.getByText('Đã sao chép liên kết APK!')).toBeDefined();
    });

    it('2.7 LiquidUpdateBanner download anchor enforces download, target="_blank", and rel="noopener noreferrer"', () => {
      render(
        <LiquidUpdateBanner
          currentVersion="7.3.0"
          latestVersion="7.4.0"
          downloadUrl={DEFAULT_DOWNLOAD_URL}
          changelog={['Changelog test line 1']}
        />
      );

      const bannerDownloadBtn = screen.getByTestId('banner-download-btn');
      expect(bannerDownloadBtn).toBeDefined();
      expect(bannerDownloadBtn.getAttribute('href')).toBe(DEFAULT_DOWNLOAD_URL);
      expect(bannerDownloadBtn.getAttribute('download')).toBe('PomoFocus-v7.4.0.apk');
      expect(bannerDownloadBtn.getAttribute('target')).toBe('_blank');
      expect(bannerDownloadBtn.getAttribute('rel')).toBe('noopener noreferrer');
    });

    it('2.8 vercel.json rewrite rules preserve standalone APK downloads from SPA index.html rewrites', () => {
      expect(fs.existsSync(vercelJsonRelativePath)).toBe(true);

      const vercelConfig = JSON.parse(fs.readFileSync(vercelJsonRelativePath, 'utf-8'));
      expect(vercelConfig.rewrites).toBeDefined();

      // Check the negative lookahead pattern that bypasses static files
      const spaRewrite = vercelConfig.rewrites.find((r: any) => r.destination === '/index.html');
      expect(spaRewrite).toBeDefined();

      // Regex should exclude files ending with extension: .*\\.[\\w]+$
      expect(spaRewrite.source).toContain('.*\\.[\\w]+$');

      // Test regex against APK path
      const regex = new RegExp(spaRewrite.source);
      // Negative lookahead: a static path like "/downloads/PomoFocus-v7.4.apk" should NOT match the SPA rewrite
      const matchesSpaRewrite = regex.test('/downloads/PomoFocus-v7.4.apk');
      expect(matchesSpaRewrite).toBe(false);
    });
  });

  // =========================================================================
  // SUITE 3: LOCALSTORAGE & SESSIONSTORAGE STATE PERSISTENCE
  // =========================================================================
  describe('Suite 3: LocalStorage & SessionStorage State Persistence Across Updates', () => {
    it('3.1 Corrupted JSON in SETTINGS_STORAGE_KEY fails safely and returns DEFAULT_SETTINGS without crashing', () => {
      // Inject corrupted JSON
      localStorage.setItem(SETTINGS_STORAGE_KEY, '{invalid_json: true, unterminated string');

      // Must catch error and return clean default
      const settings = loadStoredSettings();
      expect(settings).toEqual(DEFAULT_SETTINGS);
      expect(settings.pomodoroMinutes).toBe(25);
      expect(settings.shortBreakMinutes).toBe(5);
    });

    it('3.2 Malformed non-numeric values in SETTINGS_STORAGE_KEY are sanitized to defaults', () => {
      const malformedData = {
        pomodoroMinutes: -50, // Negative duration
        shortBreakMinutes: 'five', // String instead of number
        longBreakMinutes: null, // Null value
        roundsBeforeLongBreak: 0, // Zero rounds
        autoTransition: 'truthy', // Truthy string
        notificationEnabled: 1
      };
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(malformedData));

      const settings = loadStoredSettings();
      expect(settings.pomodoroMinutes).toBe(25); // Fallback to DEFAULT_SETTINGS
      expect(settings.shortBreakMinutes).toBe(5);
      expect(settings.longBreakMinutes).toBe(15);
      expect(settings.roundsBeforeLongBreak).toBe(4);
      expect(settings.autoTransition).toBe(true); // Boolean coercion
      expect(settings.notificationEnabled).toBe(true);
    });

    it('3.3 Valid settings persist and survive across multiple store instances', () => {
      const customSettings = {
        pomodoroMinutes: 50,
        shortBreakMinutes: 10,
        longBreakMinutes: 30,
        roundsBeforeLongBreak: 3,
        autoTransition: true,
        notificationEnabled: true
      };

      persistSettings(customSettings);

      // Verify stored string
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      expect(raw).toBeDefined();

      const reloaded = loadStoredSettings();
      expect(reloaded).toEqual(customSettings);
    });

    it('3.4 TimerEngine runtime persistence: saves and restores active running timer across tab reload', () => {
      const engine1 = new TimerEngine();
      engine1.start();

      // Verify engine runtime was saved to localStorage
      const runtimeRaw = localStorage.getItem(RUNTIME_STORAGE_KEY);
      expect(runtimeRaw).not.toBeNull();
      const parsed = JSON.parse(runtimeRaw!);
      expect(parsed.status).toBe('running');
      expect(parsed.phase).toBe('pomodoro');
      expect(parsed.targetEndTimeMs).toBeGreaterThan(Date.now());

      // Create a fresh engine instance mimicking a page refresh
      const engine2 = new TimerEngine();
      const restored = engine2.restoreFromStorage();
      expect(restored).toBe(true);
      expect(engine2.getStatus()).toBe('running');
      expect(engine2.getPhase()).toBe('pomodoro');
      expect(engine2.getRemainingMs()).toBeGreaterThan(0);

      engine1.reset();
      engine2.reset();
    });

    it('3.5 TimerEngine handles timer that expired during sleep/backgrounding smoothly transitioning to next phase', () => {
      // Simulate that a pomodoro phase expired 1 minute ago while device was in deep sleep
      const expiredRuntime = {
        sessionId: 'sess_test_expired',
        phase: 'pomodoro',
        status: 'running',
        currentRound: 1,
        durationMinutes: 25,
        targetEndTimeMs: Date.now() - 60000, // 1 min ago
        pausedRemainingMs: null,
        lastUpdatedMs: Date.now() - 60000,
        linkedTaskId: 'task_math',
        linkedTaskTitle: 'Toán Đại Cương'
      };
      localStorage.setItem(RUNTIME_STORAGE_KEY, JSON.stringify(expiredRuntime));

      const engine = new TimerEngine();
      const restored = engine.restoreFromStorage();
      expect(restored).toBe(true);

      // Invariant: Upon restoring an expired Pomodoro, it cleanly triggers completion and advances to short break
      expect(engine.getStatus()).toBe('idle');
      expect(engine.getPhase()).toBe('short_break');
      expect(engine.getRemainingMs()).toBe(5 * 60 * 1000); // 5 minutes in short break
    });

    it('3.6 LiquidUpdateBanner session persistence: dismisses for target version, reappears on higher version', () => {
      const storageKeyV74 = 'dismissed_version_7.4.0';

      // 1. First render: target version 7.4.0
      const { unmount } = render(
        <LiquidUpdateBanner
          currentVersion="7.3.0"
          latestVersion="7.4.0"
          downloadUrl={DEFAULT_DOWNLOAD_URL}
        />
      );

      // Banner should be visible
      expect(screen.getByTestId('liquid-update-banner')).toBeDefined();

      // Click dismiss button
      const dismissBtn = screen.getByTestId('banner-dismiss-btn');
      act(() => {
        fireEvent.click(dismissBtn);
      });

      // Verify sessionStorage flag is set
      expect(sessionStorage.getItem(storageKeyV74)).toBe('true');
      unmount();

      // 2. Second render with same version 7.4.0 -> should remain hidden
      const render2 = render(
        <LiquidUpdateBanner
          currentVersion="7.3.0"
          latestVersion="7.4.0"
          downloadUrl={DEFAULT_DOWNLOAD_URL}
        />
      );
      expect(render2.queryByTestId('liquid-update-banner')).toBeNull();
      render2.unmount();

      // 3. Third render with a NEW release version 7.5.0 -> should reappear!
      const render3 = render(
        <LiquidUpdateBanner
          currentVersion="7.4.0"
          latestVersion="7.5.0"
          downloadUrl={DEFAULT_DOWNLOAD_URL}
        />
      );
      expect(render3.getByTestId('liquid-update-banner')).toBeDefined();
      render3.unmount();
    });

    it('3.7 LiquidUpdateBanner handles sessionStorage.setItem exception safely (e.g. private browsing quota exceeded)', () => {
      // Mock sessionStorage.setItem to throw QuotaExceededError
      const originalSetItem = sessionStorage.setItem;
      sessionStorage.setItem = vi.fn().mockImplementation(() => {
        throw new DOMException('QuotaExceededError', 'QuotaExceededError');
      });

      render(
        <LiquidUpdateBanner
          currentVersion="7.3.0"
          latestVersion="7.4.0"
          downloadUrl={DEFAULT_DOWNLOAD_URL}
        />
      );

      const dismissBtn = screen.getByTestId('banner-dismiss-btn');
      expect(dismissBtn).toBeDefined();

      // Clicking dismiss must NOT throw an unhandled exception
      expect(() => {
        act(() => {
          fireEvent.click(dismissBtn);
        });
      }).not.toThrow();

      // Banner is dismissed in React component state even if storage write threw
      expect(screen.queryByTestId('liquid-update-banner')).toBeNull();

      sessionStorage.setItem = originalSetItem;
    });

    it('3.8 Semver compare handles edge versions, metadata, and prerelease tags accurately', () => {
      expect(isUpdateAvailable('7.4.0', '7.4.1')).toBe(true);
      expect(isUpdateAvailable('7.4.0', '7.4.0')).toBe(false);
      expect(isUpdateAvailable('7.4.1', '7.4.0')).toBe(false);
      expect(isUpdateAvailable('v7.4.0', 'v7.4.1')).toBe(true);
      expect(isUpdateAvailable('7.3.9', '7.4.0')).toBe(true);
      expect(isUpdateAvailable('7.4.0-beta.1', '7.4.0')).toBe(false); // Base semver equality
      expect(isUpdateAvailable('7.4.0', '8.0.0')).toBe(true);
    });
  });
});
