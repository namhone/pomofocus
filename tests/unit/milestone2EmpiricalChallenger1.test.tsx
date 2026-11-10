import 'fake-indexeddb/auto';
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act, renderHook } from '@testing-library/react';

// Implementation Modules Under Test
import { detectDevice, useDeviceDetection } from '../../src/hooks/useDeviceDetection';
import { generateQrCodeSvg, copyToClipboard } from '../../src/utils/qrCode';
import { compareVersions, isUpdateAvailable } from '../../src/utils/versionCompare';
import { WebDownloadHub, PUBLIC_APK_URL } from '../../src/components/landing/WebDownloadHub';
import { LiquidUpdateBanner, CURRENT_APP_VERSION } from '../../src/components/LiquidUpdateBanner';

describe('EMPIRICAL ADVERSARIAL CHALLENGER 1 — Milestone 2: Web Download Hub & Smart Distribution', () => {
  const originalUserAgent = navigator.userAgent;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    // Restore default userAgent
    Object.defineProperty(navigator, 'userAgent', {
      value: originalUserAgent,
      writable: true,
      configurable: true,
    });
    delete (window as any).Capacitor;
  });

  // ===========================================================================
  // SUITE 1: useDeviceDetection & detectDevice EMPIRICAL ADVERSARIAL STRESS
  // ===========================================================================
  describe('Suite 1: Device Detection Adversarial Stress', () => {
    it('1.1 correctly classifies Googlebot Smartphone as Android mobile', () => {
      const googlebotMobile =
        'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.109 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
      const result = detectDevice(googlebotMobile);

      expect(result.isAndroid).toBe(true);
      expect(result.isIOS).toBe(false);
      expect(result.isMobile).toBe(true);
      expect(result.isDesktop).toBe(false);
      expect(result.isNativeCapacitor).toBe(false);
    });

    it('1.2 correctly classifies Googlebot Desktop as non-mobile desktop', () => {
      const googlebotDesktop =
        'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Googlebot/2.1; +http://www.google.com/bot.html) Safari/537.36';
      const result = detectDevice(googlebotDesktop);

      expect(result.isAndroid).toBe(false);
      expect(result.isIOS).toBe(false);
      expect(result.isMobile).toBe(false);
      expect(result.isDesktop).toBe(true);
      expect(result.isNativeCapacitor).toBe(false);
    });

    it('1.3 handles iPadOS in desktop-site mode safely (treats as desktop without crashing)', () => {
      // iPadOS Safari sends a Macintosh User-Agent by default
      const ipadDesktopModeUA =
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15';
      const result = detectDevice(ipadDesktopModeUA);

      expect(result.isAndroid).toBe(false);
      expect(result.isIOS).toBe(false);
      expect(result.isMobile).toBe(false);
      expect(result.isDesktop).toBe(true);
    });

    it('1.4 correctly classifies classic iPad and iOS devices as isIOS and isMobile', () => {
      const ipadClassicUA =
        'Mozilla/5.0 (iPad; CPU OS 12_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';
      const iphoneUA =
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
      const ipodUA =
        'Mozilla/5.0 (iPod touch; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1';

      const resIpad = detectDevice(ipadClassicUA);
      expect(resIpad.isIOS).toBe(true);
      expect(resIpad.isMobile).toBe(true);
      expect(resIpad.isDesktop).toBe(false);

      const resIphone = detectDevice(iphoneUA);
      expect(resIphone.isIOS).toBe(true);
      expect(resIphone.isMobile).toBe(true);

      const resIpod = detectDevice(ipodUA);
      expect(resIpod.isIOS).toBe(true);
      expect(resIpod.isMobile).toBe(true);
    });

    it('1.5 detects Android WebViews and customized OEM shells (Xiaomi / Samsung / FB in-app)', () => {
      const samsungWebView =
        'Mozilla/5.0 (Linux; U; Android 14; en-us; SM-S918B Build/UP1A.231005.007) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/122.0.6261.64 Mobile Safari/537.36 ; wv';
      const fbInAppBrowser =
        'Mozilla/5.0 (Linux; Android 13; 22101316G Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/116.0.5845.163 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/429.0.0.27.114;]';

      const resSamsung = detectDevice(samsungWebView);
      expect(resSamsung.isAndroid).toBe(true);
      expect(resSamsung.isMobile).toBe(true);
      expect(resSamsung.isDesktop).toBe(false);

      const resFb = detectDevice(fbInAppBrowser);
      expect(resFb.isAndroid).toBe(true);
      expect(resFb.isMobile).toBe(true);
      expect(resFb.isDesktop).toBe(false);
    });

    it('1.6 classifies Headless Chrome and CI crawlers as desktop', () => {
      const headlessChrome =
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/120.0.6099.109 Safari/537.36';
      const result = detectDevice(headlessChrome);

      expect(result.isAndroid).toBe(false);
      expect(result.isIOS).toBe(false);
      expect(result.isMobile).toBe(false);
      expect(result.isDesktop).toBe(true);
    });

    it('1.7 survives empty, whitespace, and undefined User-Agents without throwing', () => {
      const emptyRes = detectDevice('');
      expect(emptyRes.isAndroid).toBe(false);
      expect(emptyRes.isIOS).toBe(false);
      expect(emptyRes.isMobile).toBe(false);
      expect(emptyRes.isDesktop).toBe(true);

      const whitespaceRes = detectDevice('     \t\n   ');
      expect(whitespaceRes.isAndroid).toBe(false);
      expect(whitespaceRes.isDesktop).toBe(true);

      const fallbackRes = detectDevice();
      expect(typeof fallbackRes.isDesktop).toBe('boolean');
      expect(typeof fallbackRes.isAndroid).toBe('boolean');
    });

    it('1.8 handles ultra-long (50k characters) User-Agent with linear performance (<500ms)', () => {
      const longJunk = 'Mozilla/5.0 (' + 'x'.repeat(50000) + ') Android';
      const t0 = performance.now();
      const result = detectDevice(longJunk);
      const elapsed = performance.now() - t0;

      expect(result.isAndroid).toBe(true);
      expect(result.isMobile).toBe(true);
      expect(elapsed).toBeLessThan(500); // Immune to ReDoS catastrophic backtracking
    });

    it('1.9 correctly detects legacy mobile platforms (BlackBerry, IEMobile, Opera Mini, webOS)', () => {
      const bb = detectDevice('Mozilla/5.0 (BlackBerry; U; BlackBerry 9800; en) AppleWebKit/534.1+');
      const ieMob = detectDevice('Mozilla/5.0 (compatible; MSIE 10.0; Windows Phone 8.0; Trident/6.0; IEMobile/10.0; ARM; Touch)');
      const operaMini = detectDevice('Opera/9.80 (J2ME/MIDP; Opera Mini/9.80 (S60; SymbOS; Opera Mobi/23.348; U; en) Presto/2.5.25 Version/10.00');
      const webOS = detectDevice('Mozilla/5.0 (webOS/1.4.0; U; en-US) AppleWebKit/532.2 (KHTML, like Gecko) Version/1.0 Safari/532.2 Pre/1.0');

      expect(bb.isMobile).toBe(true);
      expect(ieMob.isMobile).toBe(true);
      expect(operaMini.isMobile).toBe(true);
      expect(webOS.isMobile).toBe(true);
    });

    it('1.10 evaluates Capacitor native platform flags accurately', () => {
      // Direct mock capacitor object passed to function
      const mockCap = { isNativePlatform: vi.fn().mockReturnValue(true) };
      const res = detectDevice('Mozilla/5.0 (Linux; Android 14)', mockCap);
      expect(res.isNativeCapacitor).toBe(true);

      // Window global Capacitor
      (window as any).Capacitor = { isNativePlatform: () => true };
      const resWindow = detectDevice('Mozilla/5.0 (Linux; Android 14)');
      expect(resWindow.isNativeCapacitor).toBe(true);

      (window as any).Capacitor = { isNativePlatform: () => false };
      const resFalse = detectDevice('Mozilla/5.0 (Linux; Android 14)');
      expect(resFalse.isNativeCapacitor).toBe(false);
    });

    it('1.11 useDeviceDetection hook initializes and updates safely in React lifecycle', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Mobile Safari/537.36',
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useDeviceDetection());
      expect(result.current.isAndroid).toBe(true);
      expect(result.current.isMobile).toBe(true);
      expect(result.current.isDesktop).toBe(false);
    });
  });

  // ===========================================================================
  // SUITE 2: generateQrCodeSvg EMPIRICAL BOUNDARY & RESILIENCE STRESS
  // ===========================================================================
  describe('Suite 2: SVG QR Code Generator Adversarial Stress', () => {
    it('2.1 handles empty string input gracefully and produces valid SVG structure', () => {
      const svg = generateQrCodeSvg('');

      expect(typeof svg).toBe('string');
      expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
      expect(svg).toContain('viewBox="0 0 256 256"');
      expect(svg).toContain('width="256"');
      expect(svg).toContain('height="256"');
      expect(svg).toContain('<desc></desc>');
      expect(svg).toContain('</svg>');
    });

    it('2.2 clamps size below minimum (0, negative, 1, 31) to 32px', () => {
      const testCases = [0, -50, -9999, 1, 15, 31];

      for (const rawSize of testCases) {
        const svg = generateQrCodeSvg('https://pomofocus-workspace.vercel.app', { size: rawSize });
        expect(svg).toContain('viewBox="0 0 32 32"');
        expect(svg).toContain('width="32"');
        expect(svg).toContain('height="32"');
      }
    });

    it('2.3 clamps size above maximum (1025, 2000, 1000000) to 1024px', () => {
      const testCases = [1025, 2048, 5000, 100000];

      for (const rawSize of testCases) {
        const svg = generateQrCodeSvg('https://pomofocus-workspace.vercel.app', { size: rawSize });
        expect(svg).toContain('viewBox="0 0 1024 1024"');
        expect(svg).toContain('width="1024"');
        expect(svg).toContain('height="1024"');
      }
    });

    it('2.4 handles exact minimum (32px) and maximum (1024px) sizes seamlessly', () => {
      const svg32 = generateQrCodeSvg('PomoFocus', { size: 32 });
      expect(svg32).toContain('viewBox="0 0 32 32"');
      expect(svg32).toContain('width="32"');

      const svg1024 = generateQrCodeSvg('PomoFocus', { size: 1024 });
      expect(svg1024).toContain('viewBox="0 0 1024 1024"');
      expect(svg1024).toContain('width="1024"');
    });

    it('2.5 clamps negative margins to 0 without breaking offsets', () => {
      const svgNegativeMargin = generateQrCodeSvg('Test', { size: 256, margin: -20 });
      expect(svgNegativeMargin).toContain('transform="translate(0,0)"');
    });

    it('2.6 survives extreme margins exceeding size/2 without crashing or negative cellSize', () => {
      const svgHugeMargin = generateQrCodeSvg('Test', { size: 100, margin: 500 });
      // innerSize will be Math.max(1, 100 - 1000) = 1
      expect(typeof svgHugeMargin).toBe('string');
      expect(svgHugeMargin).toContain('<svg');
      expect(svgHugeMargin).toContain('</svg>');
    });

    it('2.7 handles full Vietnamese unicode text with tonal marks without encoding failure', () => {
      const vietnameseText =
        'Tải PomoFocus v7.4 APK Android chính thức — Không gian làm việc tập trung sâu đỉnh cao 🇻🇳';
      const svg = generateQrCodeSvg(vietnameseText);

      expect(svg).toContain(`<desc>${vietnameseText}</desc>`);
      expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    });

    it('2.8 handles multilingual characters, emojis, and right-to-left scripts', () => {
      const mixedText = '🍅 PomoFocus 集中 뽀모도로 تركيز עבודה deep-work-🚀-100%!';
      const svg = generateQrCodeSvg(mixedText);

      expect(svg).toContain(`<desc>${mixedText}</desc>`);
      expect(svg).toContain('role="img"');
    });

    it('2.9 handles extreme text lengths (10,000 and 50,000 characters) in <500ms', () => {
      const longPayload = 'https://pomofocus-workspace.vercel.app/apk?token=' + 'a'.repeat(20000);
      const t0 = performance.now();
      const svg = generateQrCodeSvg(longPayload);
      const elapsed = performance.now() - t0;

      expect(typeof svg).toBe('string');
      expect(svg.startsWith('<svg')).toBe(true);
      expect(svg.endsWith('</svg>')).toBe(true);
      expect(elapsed).toBeLessThan(500); // Fast deterministic hashing
    });

    it('2.10 supports custom colors, hex, rgb, and transparent backgrounds', () => {
      const customSvg = generateQrCodeSvg('https://pomofocus-workspace.vercel.app', {
        size: 300,
        color: '#f43f5e',
        bgColor: '#18181b',
      });

      expect(customSvg).toContain('fill="#18181b"');
      expect(customSvg).toContain('fill="#f43f5e"');
    });

    it('2.11 generated SVG string is well-formed XML parseable by DOMParser', () => {
      const sampleText = 'https://pomofocus-workspace.vercel.app/downloads/PomoFocus-v7.4.apk';
      const svg = generateQrCodeSvg(sampleText, { size: 256, margin: 4 });

      const parser = new DOMParser();
      const doc = parser.parseFromString(svg, 'image/svg+xml');
      const parserError = doc.querySelector('parsererror');

      expect(parserError).toBeNull();
      const svgEl = doc.querySelector('svg');
      expect(svgEl).not.toBeNull();
      expect(svgEl?.getAttribute('width')).toBe('256');
      expect(svgEl?.getAttribute('height')).toBe('256');
      expect(svgEl?.getAttribute('viewBox')).toBe('0 0 256 256');

      // Check ISO QR SVG contains background rect and crisp module path
      const rects = doc.querySelectorAll('rect');
      const paths = doc.querySelectorAll('path');
      expect(rects.length).toBeGreaterThanOrEqual(1);
      expect(paths.length).toBeGreaterThanOrEqual(1);
    });

    it('2.12 copyToClipboard returns false gracefully on rejected clipboard permission', async () => {
      // Mock clipboard with rejection
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: vi.fn().mockRejectedValue(new Error('DOMException: Permission denied')),
        },
        writable: true,
        configurable: true,
      });

      const result = await copyToClipboard('https://pomofocus-workspace.vercel.app');
      expect(result).toBe(false);
    });

    it('2.13 copyToClipboard succeeds with navigator.clipboard.writeText', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: writeTextMock,
        },
        writable: true,
        configurable: true,
      });

      const result = await copyToClipboard('https://pomofocus-workspace.vercel.app');
      expect(result).toBe(true);
      expect(writeTextMock).toHaveBeenCalledWith('https://pomofocus-workspace.vercel.app');
    });
  });

  // ===========================================================================
  // SUITE 3: compareVersions & isUpdateAvailable ADVERSARIAL STRESS
  // ===========================================================================
  describe('Suite 3: Semver Comparison Adversarial Stress', () => {
    it('3.1 handles malformed, non-numeric, and garbage strings safely without crashing', () => {
      expect(compareVersions('', '')).toBe(0);
      expect(compareVersions('garbage', 'junk')).toBe(0);
      expect(compareVersions('abc.def.ghi', '0.0.0')).toBe(0);
      expect(compareVersions('...1.2...', '0.0.0.1.2')).toBe(0);
    });

    it('3.2 strips leading "v" and "V" and trims surrounding whitespace', () => {
      expect(compareVersions('  v7.4.0  ', '7.4.0')).toBe(0);
      expect(compareVersions('V7.4.0', 'v7.4.0')).toBe(0);
      expect(compareVersions('v7.4.1', '7.4.0')).toBe(1);
      expect(compareVersions('7.4.0', 'V7.4.1')).toBe(-1);
    });

    it('3.3 handles unequal segment counts accurately (e.g. 7.4 vs 7.4.0 vs 7.4.0.1)', () => {
      // Two segments vs three segments with trailing zero
      expect(compareVersions('7.4', '7.4.0')).toBe(0);
      expect(compareVersions('7.4.0', '7.4')).toBe(0);

      // Unequal segment: 7.4 vs 7.4.0.1 (7.4.0.1 is newer)
      expect(compareVersions('7.4', '7.4.0.1')).toBe(-1);
      expect(compareVersions('7.4.0.1', '7.4')).toBe(1);

      // 7.4.1 vs 7.4
      expect(compareVersions('7.4.1', '7.4')).toBe(1);
      expect(compareVersions('7.4', '7.4.1')).toBe(-1);

      // Deep multi-segment levels (5-6 levels)
      expect(compareVersions('1.2.3.4.5.6', '1.2.3.4.5.7')).toBe(-1);
      expect(compareVersions('1.2.3.4.5.7', '1.2.3.4.5.6')).toBe(1);
      expect(compareVersions('1.2.3.4.5.6', '1.2.3.4.5.6.0')).toBe(0);
    });

    it('3.4 trims prerelease suffixes (-beta, -rc1, -alpha) to base semver', () => {
      expect(compareVersions('7.4.0-beta', '7.4.0')).toBe(0);
      expect(compareVersions('7.4.0-rc1', '7.4.0-rc2')).toBe(0);
      expect(compareVersions('7.4.1-beta.1', '7.4.0')).toBe(1);
      expect(compareVersions('7.4.0-alpha', '7.4.1-rc')).toBe(-1);
    });

    it('3.5 isUpdateAvailable returns true only when remote is strictly greater than current', () => {
      expect(isUpdateAvailable('7.4.0', '7.4.1')).toBe(true);
      expect(isUpdateAvailable('7.4.0', '7.5.0')).toBe(true);
      expect(isUpdateAvailable('7.4.0', '8.0.0')).toBe(true);
      expect(isUpdateAvailable('7.4', '7.4.0.1')).toBe(true);

      // Equal or older remote should be false
      expect(isUpdateAvailable('7.4.0', '7.4.0')).toBe(false);
      expect(isUpdateAvailable('7.4.1', '7.4.0')).toBe(false);
      expect(isUpdateAvailable('8.0.0', '7.4.0')).toBe(false);
      expect(isUpdateAvailable('7.4.0.1', '7.4')).toBe(false);
    });

    it('3.6 isUpdateAvailable survives empty and missing parameters safely', () => {
      expect(isUpdateAvailable('7.4.0', '')).toBe(false);
      expect(isUpdateAvailable('7.4.0', undefined as any)).toBe(false);
      expect(isUpdateAvailable('', '7.4.0')).toBe(true); // If current is unversioned, remote is newer
      expect(isUpdateAvailable(undefined as any, '7.4.0')).toBe(true);
    });
  });

  // ===========================================================================
  // SUITE 4: WebDownloadHub & LiquidUpdateBanner EMPIRICAL DOM INTEGRATION
  // ===========================================================================
  describe('Suite 4: Component Integration & Accessibility Stress', () => {
    it('4.1 WebDownloadHub renders central APK button with emerald pulse and correct download attribute', () => {
      render(<WebDownloadHub />);

      const downloadBtn = screen.getByTestId('central-apk-download-btn');
      expect(downloadBtn).not.toBeNull();
      expect(downloadBtn.getAttribute('href')).toBe(PUBLIC_APK_URL);
      expect(downloadBtn.getAttribute('download')).toBe('PomoFocus-v7.4.apk');
      expect(downloadBtn.className).toContain('animate-pulse');
      expect(downloadBtn.className).toContain('min-h-[56px]');
    });

    it('4.2 WebDownloadHub renders phone mockup and dynamic SVG QR code in desktop view', () => {
      render(<WebDownloadHub />);

      const mockup = screen.getByTestId('phone-mockup-preview');
      expect(mockup).not.toBeNull();
      expect(mockup.textContent).toContain('25:00');
      expect(mockup.textContent).toContain('Anchor 120Hz');

      const qrContainer = screen.getByTestId('dynamic-qr-code');
      expect(qrContainer).not.toBeNull();
      const svgEl = qrContainer.querySelector('svg');
      expect(svgEl).not.toBeNull();
      expect(svgEl?.getAttribute('role')).toBe('img');
      expect(svgEl?.getAttribute('aria-label')).toBe('QR Code');
    });

    it('4.3 1-click copy button copies link and displays feedback text', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: writeTextMock },
        writable: true,
        configurable: true,
      });

      render(<WebDownloadHub />);

      const copyBtn = screen.getByTestId('copy-download-url-btn');
      expect(copyBtn.textContent).toContain('Sao chép liên kết tải APK');

      await act(async () => {
        fireEvent.click(copyBtn);
      });

      expect(writeTextMock).toHaveBeenCalledWith(PUBLIC_APK_URL);
      expect(screen.getByText('Đã sao chép link APK!')).not.toBeNull();
    });

    it('4.4 LiquidUpdateBanner renders at z-40 and dismisses properly', async () => {
      render(
        <LiquidUpdateBanner
          currentVersion="7.4.0"
          latestVersion="7.4.1"
          changelog={['Tối ưu hiệu năng 120Hz', 'Cải tiến bộ đếm giờ']}
        />
      );

      const banner = screen.getByTestId('liquid-update-banner');
      expect(banner).not.toBeNull();
      expect(banner.className).toContain('z-40');
      expect(screen.getByText('v7.4.1')).not.toBeNull();
      expect(screen.getByText('Tối ưu hiệu năng 120Hz')).not.toBeNull();

      const dismissBtn = screen.getByTestId('banner-dismiss-btn');
      await act(async () => {
        fireEvent.click(dismissBtn);
      });

      expect(screen.queryByTestId('liquid-update-banner')).toBeNull();
      expect(sessionStorage.getItem('dismissed_version_7.4.1')).toBe('true');
    });

    it('4.5 LiquidUpdateBanner truncates changelog items longer than 200 characters', () => {
      const longItem = 'Cập nhật lớn '.repeat(20); // > 200 chars
      render(
        <LiquidUpdateBanner
          currentVersion="7.4.0"
          latestVersion="7.4.1"
          changelog={[longItem]}
        />
      );

      const banner = screen.getByTestId('liquid-update-banner');
      expect(banner).not.toBeNull();
      expect(banner.textContent).toContain('...');
    });

    it('4.6 LiquidUpdateBanner does not render when currentVersion >= latestVersion', () => {
      const { container } = render(
        <LiquidUpdateBanner
          currentVersion="7.4.0"
          latestVersion="7.4.0"
        />
      );

      expect(container.firstChild).toBeNull();
    });
  });
});
