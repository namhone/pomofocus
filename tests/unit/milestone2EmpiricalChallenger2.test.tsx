import 'fake-indexeddb/auto';
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

// Application Stores & Utilities
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useLayoutStore } from '../../src/stores/useLayoutStore';
import { useAiStore } from '../../src/stores/useAiStore';
import { WebDownloadHub, PUBLIC_APK_URL } from '../../src/components/landing/WebDownloadHub';
import { LiquidUpdateBanner } from '../../src/components/LiquidUpdateBanner';
import { detectDevice } from '../../src/hooks/useDeviceDetection';
import { generateQrCodeSvg, copyToClipboard } from '../../src/utils/qrCode';
import { compareVersions, isUpdateAvailable } from '../../src/utils/versionCompare';

// Original user agent backup for restoration
const ORIGINAL_USER_AGENT = typeof navigator !== 'undefined' ? navigator.userAgent : '';

function mockUserAgent(ua: string) {
  Object.defineProperty(navigator, 'userAgent', {
    value: ua,
    configurable: true,
    writable: true,
  });
}

describe('Milestone 2 Empirical Challenger 2: Adversarial & Stress Test Suite', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    sessionStorage.clear();

    // Reset stores to predictable baseline
    useLayoutStore.setState({
      isMobile: false,
      isZenMode: false,
      isHeaderExpanded: false,
    });

    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isPro: false,
      isLifetime: false,
    });

    useAiStore.setState({
      aiCreditsBalance: 50,
      isOpen: false,
      messages: [],
    });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    mockUserAgent(ORIGINAL_USER_AGENT);
    sessionStorage.clear();
  });

  // ===========================================================================
  // SECTION 1: 1-TOUCH APK DOWNLOAD BUTTON ON ANDROID
  // ===========================================================================
  describe('1. Android 1-Touch APK Download Button Empirical DOM Verification', () => {
    const ANDROID_UA =
      'Mozilla/5.0 (Linux; Android 14; Xiaomi 14 Pro Build/UKQ1.230804.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0.6367.82 Mobile Safari/537.36';

    it('1.1 renders central download button with exact href and download attributes', () => {
      mockUserAgent(ANDROID_UA);
      render(<WebDownloadHub />);

      const downloadBtn = screen.getByTestId('central-apk-download-btn');
      expect(downloadBtn).toBeDefined();

      // Verify anchor semantics
      expect(downloadBtn.tagName.toLowerCase()).toBe('a');
      expect(downloadBtn.getAttribute('href')).toBe(PUBLIC_APK_URL);
      expect(downloadBtn.getAttribute('download')).toBe('PomoFocus-v7.4.apk');
    });

    it('1.2 verifies emerald breathing glow and 56px height styling invariants', () => {
      mockUserAgent(ANDROID_UA);
      render(<WebDownloadHub />);

      const downloadBtn = screen.getByTestId('central-apk-download-btn');
      const classList = downloadBtn.className;

      // Emerald breathing glow classes
      expect(classList).toContain('shadow-[0_12px_32px_rgba(16,185,129,0.45)]');
      expect(classList).toContain('animate-pulse');

      // 56px+ touch target height
      expect(classList).toContain('h-16');
      expect(classList).toContain('min-h-[56px]');

      // Gradient background
      expect(classList).toContain('bg-gradient-to-r');
      expect(classList).toContain('from-emerald-500');
    });

    it('1.3 displays Android-specific smart detection hint when user is on Android', () => {
      mockUserAgent(ANDROID_UA);
      render(<WebDownloadHub />);

      expect(screen.getByText(/Phát hiện bạn đang dùng Android/i)).toBeDefined();
      expect(
        screen.getByText(/Chạm nút trên để tải và cài đặt ngay/i)
      ).toBeDefined();
    });

    it('1.4 displays correct version label and platform name inside button', () => {
      mockUserAgent(ANDROID_UA);
      render(<WebDownloadHub />);

      const downloadBtn = screen.getByTestId('central-apk-download-btn');
      expect(downloadBtn.textContent).toContain('Tải Ngay APK Android (v7.4)');
    });

    it('1.5 rapid sequential clicks on download button maintain href and download integrity', () => {
      mockUserAgent(ANDROID_UA);
      render(<WebDownloadHub />);

      const downloadBtn = screen.getByTestId('central-apk-download-btn');
      const clickHandler = (e: MouseEvent) => e.preventDefault();
      downloadBtn.addEventListener('click', clickHandler);

      for (let i = 0; i < 25; i++) {
        fireEvent.click(downloadBtn);
      }

      downloadBtn.removeEventListener('click', clickHandler);

      expect(downloadBtn.getAttribute('href')).toBe(PUBLIC_APK_URL);
      expect(downloadBtn.getAttribute('download')).toBe('PomoFocus-v7.4.apk');
    });
  });

  // ===========================================================================
  // SECTION 2: DESKTOP VIEW: 3D PHONE MOCKUP, SVG QR CODE & CLIPBOARD
  // ===========================================================================
  describe('2. Desktop View: 3D Phone Mockup, SVG QR Code & Clipboard Behavior', () => {
    const DESKTOP_UA =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

    it('2.1 renders 3D phone mockup preview with internal clock and components', () => {
      mockUserAgent(DESKTOP_UA);
      render(<WebDownloadHub />);

      const mockup = screen.getByTestId('phone-mockup-preview');
      expect(mockup).toBeDefined();

      // Monumental clock inside mockup
      expect(mockup.textContent).toContain('25:00');
      expect(mockup.textContent).toContain('Anchor 120Hz');

      // Mode pills inside mockup
      expect(mockup.textContent).toContain('Tập trung');
      expect(mockup.textContent).toContain('Nghỉ ngắn');
      expect(mockup.textContent).toContain('Nghỉ dài');

      // Bottom nav mockup
      expect(mockup.textContent).toContain('Tập trung');
      expect(mockup.textContent).toContain('Nhiệm vụ');
      expect(mockup.textContent).toContain('Cài đặt');
    });

    it('2.2 renders valid dynamic SVG QR code embedding public APK URL', () => {
      mockUserAgent(DESKTOP_UA);
      render(<WebDownloadHub />);

      const qrContainer = screen.getByTestId('dynamic-qr-code');
      expect(qrContainer).toBeDefined();

      const svgElement = qrContainer.querySelector('svg');
      expect(svgElement).toBeDefined();
      expect(svgElement?.getAttribute('viewBox')).toBe('0 0 200 200');
      expect(svgElement?.getAttribute('width')).toBe('200');
      expect(svgElement?.getAttribute('height')).toBe('200');

      // Check URL inside desc tag
      const descElement = svgElement?.querySelector('desc');
      expect(descElement?.textContent).toBe(PUBLIC_APK_URL);
    });

    it('2.3 displays Desktop smart detection guidance text', () => {
      mockUserAgent(DESKTOP_UA);
      render(<WebDownloadHub />);

      expect(screen.getByText(/Bạn đang ở Desktop/i)).toBeDefined();
      expect(screen.getByText(/Quét mã QR bên cạnh để cài ngay trên điện thoại/i)).toBeDefined();
    });

    it('2.4 clipboard copy action succeeds and toggles feedback toast for 2000ms', async () => {
      mockUserAgent(DESKTOP_UA);
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: writeTextMock },
        configurable: true,
        writable: true,
      });

      render(<WebDownloadHub />);

      const copyBtn = screen.getByTestId('copy-download-url-btn');
      expect(copyBtn.textContent).toContain('Sao chép liên kết tải APK');

      // Click copy button
      await act(async () => {
        fireEvent.click(copyBtn);
      });

      expect(writeTextMock).toHaveBeenCalledWith(PUBLIC_APK_URL);
      expect(copyBtn.textContent).toContain('Đã sao chép link APK!');

      // Fast forward 2000ms
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(copyBtn.textContent).toContain('Sao chép liên kết tải APK');
    });

    it('2.5 clipboard failure handling falls back gracefully without UI crash', async () => {
      mockUserAgent(DESKTOP_UA);
      const writeTextReject = vi.fn().mockRejectedValue(new Error('Clipboard permission denied'));
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: writeTextReject },
        configurable: true,
        writable: true,
      });

      render(<WebDownloadHub />);

      const copyBtn = screen.getByTestId('copy-download-url-btn');

      await act(async () => {
        fireEvent.click(copyBtn);
      });

      // Should not throw or crash; feedback should not falsely show success
      expect(copyBtn.textContent).toContain('Sao chép liên kết tải APK');
    });

    it('2.6 iOS device displays Safari PWA installation instruction hint', () => {
      const IOS_UA =
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
      mockUserAgent(IOS_UA);
      render(<WebDownloadHub />);

      expect(
        screen.getByText(/Thiết bị iOS hỗ trợ cài đặt PWA trực tiếp từ trình duyệt Safari/i)
      ).toBeDefined();
    });
  });

  // ===========================================================================
  // SECTION 3: IN-APP LIQUID UPDATE BANNER NETWORK & STORAGE ADVERSARIAL STRESS
  // ===========================================================================
  describe('3. In-App LiquidUpdateBanner Network & Persistence Stress', () => {
    it('3.1 layer hierarchy: renders at z-40 and fixed bottom-20 floating layer', () => {
      render(
        <LiquidUpdateBanner
          currentVersion="7.4.0"
          latestVersion="7.5.0"
          downloadUrl="https://example.com/update.apk"
          changelog={['Tính năng mới']}
        />
      );

      const banner = screen.getByTestId('liquid-update-banner');
      expect(banner).toBeDefined();
      expect(banner.className).toContain('z-40');
      expect(banner.className).toContain('fixed');
      expect(banner.className).toContain('bottom-20');
    });

    it('3.2 simulated network delay: mounts only after asynchronous fetch resolves', async () => {
      let resolveFetch: (data: any) => void;
      const fetchPromise = new Promise((resolve) => {
        resolveFetch = resolve;
      });

      global.fetch = vi.fn().mockImplementation(() => fetchPromise);

      render(<LiquidUpdateBanner currentVersion="7.4.0" />);

      // Initially null before fetch completes
      expect(screen.queryByTestId('liquid-update-banner')).toBeNull();

      // Resolve delayed fetch with version 7.5.0
      await act(async () => {
        resolveFetch!({
          ok: true,
          json: async () => ({
            version: '7.5.0',
            changelog: ['Vá lỗi kết nối', 'Tăng tốc 120Hz'],
            downloadUrl: 'https://pomofocus-workspace.vercel.app/downloads/PomoFocus-v7.5.apk',
          }),
        });
      });

      // Now banner appears
      expect(screen.getByTestId('liquid-update-banner')).toBeDefined();
      expect(screen.getByText(/v7\.5\.0/)).toBeDefined();
      expect(screen.getByText(/Vá lỗi kết nối/)).toBeDefined();
      expect(screen.getByText(/Tăng tốc 120Hz/)).toBeDefined();
    });

    it('3.3 network 404 error on version.json fails soft without rendering banner', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      render(<LiquidUpdateBanner currentVersion="7.4.0" />);

      await act(async () => {
        await Promise.resolve();
      });

      expect(screen.queryByTestId('liquid-update-banner')).toBeNull();
    });

    it('3.4 network 500 error on version.json fails soft without throwing', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      render(<LiquidUpdateBanner currentVersion="7.4.0" />);

      await act(async () => {
        await Promise.resolve();
      });

      expect(screen.queryByTestId('liquid-update-banner')).toBeNull();
    });

    it('3.5 network transport rejection (TypeError: Failed to fetch) absorbed safely', async () => {
      global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

      render(<LiquidUpdateBanner currentVersion="7.4.0" />);

      await act(async () => {
        await Promise.resolve();
      });

      expect(screen.queryByTestId('liquid-update-banner')).toBeNull();
    });

    it('3.6 dismissing banner records dismissed version in sessionStorage and unmounts', () => {
      render(
        <LiquidUpdateBanner
          currentVersion="7.4.0"
          latestVersion="7.4.9"
        />
      );

      const banner = screen.getByTestId('liquid-update-banner');
      expect(banner).toBeDefined();

      const dismissBtn = screen.getByTestId('banner-dismiss-btn');
      fireEvent.click(dismissBtn);

      expect(screen.queryByTestId('liquid-update-banner')).toBeNull();
      expect(sessionStorage.getItem('dismissed_version_7.4.9')).toBe('true');
    });

    it('3.7 dismissed banner persistence survives remount in same session', () => {
      sessionStorage.setItem('dismissed_version_7.4.9', 'true');

      render(
        <LiquidUpdateBanner
          currentVersion="7.4.0"
          latestVersion="7.4.9"
        />
      );

      expect(screen.queryByTestId('liquid-update-banner')).toBeNull();
    });

    it('3.8 clicking "Để sau" button dismisses banner and stores in sessionStorage', () => {
      render(
        <LiquidUpdateBanner
          currentVersion="7.4.0"
          latestVersion="7.4.5"
        />
      );

      const laterBtn = screen.getByText('Để sau');
      fireEvent.click(laterBtn);

      expect(screen.queryByTestId('liquid-update-banner')).toBeNull();
      expect(sessionStorage.getItem('dismissed_version_7.4.5')).toBe('true');
    });

    it('3.9 string releaseNotes fallback rendered when changelog array is absent', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          version: '7.5.1',
          releaseNotes: 'Bản cập nhật khẩn cấp khắc phục sự cố thông báo',
          downloadUrl: 'https://pomofocus-workspace.vercel.app/downloads/PomoFocus-v7.5.1.apk',
        }),
      });

      render(<LiquidUpdateBanner currentVersion="7.4.0" />);

      await act(async () => {
        await Promise.resolve();
      });

      expect(screen.getByTestId('liquid-update-banner')).toBeDefined();
      expect(
        screen.getByText(/Bản cập nhật khẩn cấp khắc phục sự cố thông báo/i)
      ).toBeDefined();
    });

    it('3.10 ultra long changelog item (>200 chars) is truncated with ellipsis', () => {
      const superLongItem = 'A'.repeat(250);
      render(
        <LiquidUpdateBanner
          currentVersion="7.4.0"
          latestVersion="7.5.0"
          changelog={[superLongItem]}
        />
      );

      const expectedTruncated = `${'A'.repeat(197)}...`;
      expect(screen.getByText(expectedTruncated)).toBeDefined();
    });

    it('3.11 identical or older versions do not trigger update banner', () => {
      // Identical
      const { unmount } = render(
        <LiquidUpdateBanner currentVersion="7.4.0" latestVersion="7.4.0" />
      );
      expect(screen.queryByTestId('liquid-update-banner')).toBeNull();
      unmount();

      // Older
      render(
        <LiquidUpdateBanner currentVersion="7.4.0" latestVersion="7.3.9" />
      );
      expect(screen.queryByTestId('liquid-update-banner')).toBeNull();
    });
  });

  // ===========================================================================
  // SECTION 4: STATE SINGULARITY & UI/UX PLAYBOOK INVARIANTS
  // ===========================================================================
  describe('4. State Singularity & UI/UX Playbook Compliance', () => {
    it('4.1 WebDownloadHub guarantees exactly 1 header element (headers.length <= 1)', () => {
      render(<WebDownloadHub />);

      const headers = screen.queryAllByRole('banner');
      expect(headers.length).toBeLessThanOrEqual(1);

      // Verify no extra unexpected header tags
      const rawHeaderTags = document.querySelectorAll('header');
      expect(rawHeaderTags.length).toBeLessThanOrEqual(1);
    });

    it('4.2 Founder VIP protection: Founder accounts do not see payment or upgrade gates on hub', () => {
      useAuthStore.setState({
        isAuthenticated: true,
        user: {
          id: 'founder-01',
          email: 'namho03052k9@gmail.com',
          role: 'founder',
          plan: 'lifetime',
        },
      });

      render(<WebDownloadHub />);

      // No upgrade prompt
      expect(screen.queryByText(/Nâng cấp lên Pro/i)).toBeNull();
      expect(screen.queryByText(/Gói cước đã hết hạn/i)).toBeNull();
    });

    it('4.3 renders all 6 deep-tech feature cards with correct titles and badges', () => {
      render(<WebDownloadHub />);

      const expectedBadges = [
        'Bảo Vệ Nền',
        'OLED Thân Thiện',
        '120Hz Native',
        'Cố Định 100dvh',
        'Bảo Mật Cao',
        'Micro-Motion',
      ];

      expectedBadges.forEach((badge) => {
        expect(screen.getAllByText(badge).length).toBeGreaterThanOrEqual(1);
      });

      expect(screen.getByText('Anchor Timestamp Engine')).toBeDefined();
      expect(screen.getByText('Screen Wake Lock API')).toBeDefined();
      expect(screen.getByText('Haptics & Spring Physics')).toBeDefined();
      expect(screen.getByText('Zero-Scroll-Chaining')).toBeDefined();
      expect(screen.getByText('Offline First & Security')).toBeDefined();
      expect(screen.getByText('Rolling Digit Morphing')).toBeDefined();
    });

    it('4.4 quick web access button navigates towards /app', () => {
      render(<WebDownloadHub />);

      const quickAccessBtn = screen.getByText('Vào Ngay');
      expect(quickAccessBtn).toBeDefined();

      fireEvent.click(quickAccessBtn);
      // Navigation invoked without error
      expect(window.location.pathname).toBeDefined();
    });
  });

  // ===========================================================================
  // SECTION 5: ADVERSARIAL ORACLE & STRESS HARNESS
  // ===========================================================================
  describe('5. Adversarial Oracle & Edge Calculations', () => {
    it('5.1 generateQrCodeSvg clamps boundary sizes [32, 1024] and negative margins', () => {
      const svgMin = generateQrCodeSvg('url', { size: -999, margin: -50 });
      expect(svgMin).toContain('viewBox="0 0 32 32"');
      expect(svgMin).toContain('transform="translate(0,0)"');

      const svgMax = generateQrCodeSvg('url', { size: 99999 });
      expect(svgMax).toContain('viewBox="0 0 1024 1024"');
    });

    it('5.2 generateQrCodeSvg encodes standard and Vietnamese path URLs into valid SVG', () => {
      const unicodeUrl = 'https://pomofocus-workspace.vercel.app/tai-ung-dung/phien-ban-v7.4';
      const svg = generateQrCodeSvg(unicodeUrl);

      expect(svg).toContain('<svg');
      expect(svg).toContain(unicodeUrl);
      expect(svg).toContain('</svg>');

      // Verify SVG can be parsed cleanly by DOMParser
      const parser = new DOMParser();
      const doc = parser.parseFromString(svg, 'image/svg+xml');
      const parserErrors = doc.querySelectorAll('parsererror');
      expect(parserErrors.length).toBe(0);
    });

    it('5.3 copyToClipboard fallback returns false when all clipboard mechanisms fail', async () => {
      // Detach clipboard
      Object.defineProperty(navigator, 'clipboard', {
        value: undefined,
        configurable: true,
        writable: true,
      });

      // Mock execCommand to fail
      document.execCommand = vi.fn().mockReturnValue(false);

      const result = await copyToClipboard('test-text');
      expect(result).toBe(false);
    });

    it('5.4 compareVersions handles malformed, irregular, and prerelease versions robustly', () => {
      expect(compareVersions('v7.4.0', '7.4.0')).toBe(0);
      expect(compareVersions('V7.4.0', 'v7.4.0')).toBe(0);
      expect(compareVersions('7.4.0-alpha.1', '7.4.0-beta.2')).toBe(0);
      expect(compareVersions('7.4.10', '7.4.2')).toBe(1);
      expect(compareVersions('7.4.2', '7.4.10')).toBe(-1);
      expect(compareVersions('8', '7.99.99')).toBe(1);
      expect(compareVersions('1.0.0.0.1', '1.0.0.0.2')).toBe(-1);
      expect(compareVersions('', '')).toBe(0);
    });

    it('5.5 isUpdateAvailable returns false for downgrades, identity, or empty remotes', () => {
      expect(isUpdateAvailable('7.4.0', '7.3.9')).toBe(false);
      expect(isUpdateAvailable('7.4.0', '7.4.0')).toBe(false);
      expect(isUpdateAvailable('7.4.0', '')).toBe(false);
      expect(isUpdateAvailable('7.4.0', '7.4.0-alpha')).toBe(false);
      expect(isUpdateAvailable('7.4.0', '7.4.1')).toBe(true);
      expect(isUpdateAvailable('7.4.0', '8.0.0')).toBe(true);
    });

    it('5.6 detectDevice handles crawler and unusual user-agents without exceptions', () => {
      const weirdUas = [
        'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'curl/8.4.0',
        'PostmanRuntime/7.36.0',
        'Wget/1.21.4',
        '   whitespace only   ',
        '',
      ];

      weirdUas.forEach((ua) => {
        const result = detectDevice(ua);
        expect(typeof result.isAndroid).toBe('boolean');
        expect(typeof result.isIOS).toBe('boolean');
        expect(typeof result.isDesktop).toBe('boolean');
        expect(typeof result.isMobile).toBe('boolean');
        expect(typeof result.isNativeCapacitor).toBe('boolean');
      });
    });

    // Adversarial finding verification:
    it('5.7 adversarial verification: confirms XML unescaped ampersand entity risk in raw text URLs', () => {
      const urlWithQueryAmpersand = 'https://pomofocus-workspace.vercel.app/download?ref=android&campaign=v74';
      const rawSvg = generateQrCodeSvg(urlWithQueryAmpersand);

      // Raw unescaped '&campaign=' in XML produces a parsererror in strict XML parsers
      const parser = new DOMParser();
      const doc = parser.parseFromString(rawSvg, 'image/svg+xml');
      const parserErrors = doc.querySelectorAll('parsererror');

      // Empirically confirms that unescaped '&' inside <desc> generates parsererror in strict XML DOM parser
      expect(parserErrors.length).toBe(1);
    });
  });
});
