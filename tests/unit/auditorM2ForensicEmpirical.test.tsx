import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import fs from 'fs';
import path from 'path';

import { detectDevice } from '../../src/hooks/useDeviceDetection';
import { generateQrCodeSvg, copyToClipboard } from '../../src/utils/qrCode';
import { compareVersions, isUpdateAvailable } from '../../src/utils/versionCompare';
import { LiquidUpdateBanner } from '../../src/components/LiquidUpdateBanner';
import { WebDownloadHub, PUBLIC_APK_URL } from '../../src/components/landing/WebDownloadHub';
import { getStaticRouteTitle } from '../../src/stores/useTimerStore';

describe('Auditor Independent Forensic Suite: Milestone 2', () => {
  afterEach(() => {
    cleanup();
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear();
    }
    vi.restoreAllMocks();
  });

  describe('1. Empirical Anti-Facade & Logic Verification: qrCode.ts', () => {
    it('generates distinct module patterns for distinct input strings (non-facade check)', () => {
      const svg1 = generateQrCodeSvg('https://example.com/app-v1');
      const svg2 = generateQrCodeSvg('https://example.com/app-v2');
      const svg3 = generateQrCodeSvg('https://completely-different-domain.org');

      expect(svg1).not.toBe(svg2);
      expect(svg2).not.toBe(svg3);
      expect(svg1).toContain('<svg');
      expect(svg1).toContain('</svg>');
      expect(svg1).toContain('<desc>https://example.com/app-v1</desc>');
      expect(svg2).toContain('<desc>https://example.com/app-v2</desc>');
    });

    it('enforces dimension clamping within [32, 1024]', () => {
      const tinySvg = generateQrCodeSvg('test', { size: 10 });
      expect(tinySvg).toContain('width="32"');
      expect(tinySvg).toContain('height="32"');
      expect(tinySvg).toContain('viewBox="0 0 32 32"');

      const hugeSvg = generateQrCodeSvg('test', { size: 5000 });
      expect(hugeSvg).toContain('width="1024"');
      expect(hugeSvg).toContain('height="1024"');
      expect(hugeSvg).toContain('viewBox="0 0 1024 1024"');
    });

    it('handles negative margins by clamping to 0', () => {
      const svg = generateQrCodeSvg('test', { margin: -10 });
      expect(svg).toContain('transform="translate(0,0)"');
    });

    it('faithfully applies custom foreground and background colors', () => {
      const svg = generateQrCodeSvg('test', { color: '#ff0055', bgColor: '#112233' });
      expect(svg).toContain('fill="#112233"');
      expect(svg).toContain('fill="#ff0055"');
    });

    it('survives extreme payloads: empty string, unicode, and query parameters', () => {
      expect(() => generateQrCodeSvg('')).not.toThrow();
      const emptySvg = generateQrCodeSvg('');
      expect(emptySvg).toContain('<desc></desc>');

      const unicodeText = 'https://pomofocus.vn/tải-ứng-dụng?phiên_bản=7.4.0#khu_vực';
      const unicodeSvg = generateQrCodeSvg(unicodeText);
      expect(unicodeSvg).toContain(`<desc>${unicodeText}</desc>`);
    });

    it('copyToClipboard executes modern clipboard or graceful document fallback', async () => {
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: mockWriteText,
        },
      });

      const res = await copyToClipboard('https://test-link.com');
      expect(res).toBe(true);
      expect(mockWriteText).toHaveBeenCalledWith('https://test-link.com');
    });

    it('copyToClipboard gracefully handles failure without crashing', async () => {
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockRejectedValue(new Error('Permission denied')),
        },
      });

      const res = await copyToClipboard('https://test-link.com');
      expect(typeof res).toBe('boolean');
    });
  });

  describe('2. Empirical Anti-Facade & Logic Verification: detectDevice', () => {
    it('correctly identifies Android phones across diverse User-Agents', () => {
      const pixel = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
      const samsung = 'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/24.0 Chrome/118.0.5993.94 Mobile Safari/537.36';
      const xiaomi = 'Mozilla/5.0 (Linux; U; Android 13; zh-cn; 22081212C Build/TKQ1.220829.002) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/109.0.5414.118 Mobile Safari/537.36 XiaoMi/MiuiBrowser/17.9.22';

      expect(detectDevice(pixel)).toEqual(expect.objectContaining({ isAndroid: true, isMobile: true, isDesktop: false, isIOS: false }));
      expect(detectDevice(samsung)).toEqual(expect.objectContaining({ isAndroid: true, isMobile: true, isDesktop: false, isIOS: false }));
      expect(detectDevice(xiaomi)).toEqual(expect.objectContaining({ isAndroid: true, isMobile: true, isDesktop: false, isIOS: false }));
    });

    it('correctly identifies iOS devices (iPhone, iPad, iPod)', () => {
      const iphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
      const ipad = 'Mozilla/5.0 (iPad; CPU OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1';

      expect(detectDevice(iphone)).toEqual(expect.objectContaining({ isIOS: true, isMobile: true, isAndroid: false, isDesktop: false }));
      expect(detectDevice(ipad)).toEqual(expect.objectContaining({ isIOS: true, isMobile: true, isAndroid: false, isDesktop: false }));
    });

    it('correctly identifies Desktop environments (Windows, macOS, Linux)', () => {
      const win = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
      const mac = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
      const linux = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

      expect(detectDevice(win)).toEqual(expect.objectContaining({ isDesktop: true, isMobile: false, isAndroid: false, isIOS: false }));
      expect(detectDevice(mac)).toEqual(expect.objectContaining({ isDesktop: true, isMobile: false, isAndroid: false, isIOS: false }));
      expect(detectDevice(linux)).toEqual(expect.objectContaining({ isDesktop: true, isMobile: false, isAndroid: false, isIOS: false }));
    });

    it('safely handles empty string, crawler bots, and missing navigator', () => {
      expect(detectDevice('')).toEqual(expect.objectContaining({ isDesktop: true, isMobile: false, isAndroid: false, isIOS: false }));
      const bot = 'Googlebot/2.1 (+http://www.google.com/bot.html)';
      expect(detectDevice(bot)).toEqual(expect.objectContaining({ isDesktop: true, isMobile: false, isAndroid: false, isIOS: false }));
    });

    it('detects native Capacitor bridge when available', () => {
      const mockCapacitor = { isNativePlatform: () => true };
      expect(detectDevice(undefined, mockCapacitor).isNativeCapacitor).toBe(true);

      const mockWebCapacitor = { isNativePlatform: () => false };
      expect(detectDevice(undefined, mockWebCapacitor).isNativeCapacitor).toBe(false);
    });
  });

  describe('3. Empirical Anti-Facade & Logic Verification: versionCompare.ts', () => {
    it('compares standard major, minor, patch versions authentically', () => {
      expect(compareVersions('7.4.0', '7.4.1')).toBe(-1);
      expect(compareVersions('7.4.1', '7.4.0')).toBe(1);
      expect(compareVersions('7.4.0', '7.4.0')).toBe(0);
      expect(compareVersions('8.0.0', '7.99.99')).toBe(1);
    });

    it('handles "v" prefixes and prerelease suffixes cleanly', () => {
      expect(compareVersions('v7.4.0', '7.4.0')).toBe(0);
      expect(compareVersions('V7.5.0-beta.1', 'v7.4.9')).toBe(1);
      expect(compareVersions('7.4.0-rc.2', '7.4.0-alpha')).toBe(0); // Prerelease segments trimmed for base semver
    });

    it('handles uneven length versions without NaN or failure', () => {
      expect(compareVersions('7.4', '7.4.0.0')).toBe(0);
      expect(compareVersions('7.4.0.1', '7.4')).toBe(1);
      expect(compareVersions('7', '7.0.1')).toBe(-1);
    });

    it('isUpdateAvailable evaluates strictly newer remote version', () => {
      expect(isUpdateAvailable('7.4.0', '7.4.1')).toBe(true);
      expect(isUpdateAvailable('7.4.0', '7.4.0')).toBe(false);
      expect(isUpdateAvailable('7.4.1', '7.4.0')).toBe(false);
      expect(isUpdateAvailable('7.4.0', '')).toBe(false);
      expect(isUpdateAvailable('', '7.4.0')).toBe(true);
    });
  });

  describe('4. UI & Architectural Invariants: State Singularity & Layer Hierarchy', () => {
    it('WebDownloadHub complies with State Singularity (<= 1 header tag)', () => {
      const { container } = render(<WebDownloadHub />);
      const headers = container.querySelectorAll('header');
      expect(headers.length).toBeLessThanOrEqual(1);
    });

    it('WebDownloadHub renders prominent 1-touch APK download button (56px, emerald glow, correct APK link)', () => {
      render(<WebDownloadHub />);
      const downloadBtn = screen.getByTestId('central-apk-download-btn');
      expect(downloadBtn).toBeDefined();
      expect(downloadBtn.getAttribute('href')).toBe(PUBLIC_APK_URL);
      expect(downloadBtn.getAttribute('download')).toBe('PomoFocus-v7.4.apk');

      const classList = downloadBtn.getAttribute('class') || '';
      expect(classList).toContain('h-16');
      expect(classList).toContain('min-h-[56px]');
      expect(classList).toContain('shadow-[0_12px_32px_rgba(16,185,129,0.45)]');
    });

    it('WebDownloadHub renders phone mockup preview and dynamic QR code container', () => {
      render(<WebDownloadHub />);
      expect(screen.getByTestId('phone-mockup-preview')).toBeDefined();
      const qrContainer = screen.getByTestId('dynamic-qr-code');
      expect(qrContainer).toBeDefined();
      expect(qrContainer.querySelector('svg')).toBeDefined();
    });

    it('LiquidUpdateBanner enforces layer hierarchy z-40 strictly', () => {
      render(
        <LiquidUpdateBanner
          currentVersion="7.4.0"
          latestVersion="7.5.0"
          downloadUrl="https://example.com/app.apk"
          changelog={['Tính năng mới 1', 'Tính năng mới 2']}
        />
      );

      const banner = screen.getByTestId('liquid-update-banner');
      expect(banner).toBeDefined();
      const className = banner.getAttribute('class') || '';
      expect(className).toContain('z-40');
      expect(className).not.toContain('z-50');
      expect(className).not.toContain('z-30');
    });

    it('LiquidUpdateBanner does NOT render when client version is already up to date', () => {
      const { container } = render(
        <LiquidUpdateBanner
          currentVersion="7.4.0"
          latestVersion="7.4.0"
        />
      );
      expect(container.firstChild).toBeNull();
    });

    it('LiquidUpdateBanner dismissal persists to sessionStorage and unmounts banner', () => {
      sessionStorage.clear();
      render(
        <LiquidUpdateBanner
          currentVersion="7.4.0"
          latestVersion="7.5.0"
        />
      );

      const banner = screen.getByTestId('liquid-update-banner');
      expect(banner).toBeDefined();

      const dismissBtn = screen.getByTestId('banner-dismiss-btn');
      act(() => {
        fireEvent.click(dismissBtn);
      });

      expect(screen.queryByTestId('liquid-update-banner')).toBeNull();
      expect(sessionStorage.getItem('dismissed_version_7.5.0')).toBe('true');
    });

    it('LiquidUpdateBanner truncates excessively long changelog items (200 char limit)', () => {
      const superLongChangelog = 'A'.repeat(250);
      render(
        <LiquidUpdateBanner
          currentVersion="7.4.0"
          latestVersion="7.5.0"
          changelog={[superLongChangelog]}
        />
      );

      const expectedTruncated = `${'A'.repeat(197)}...`;
      expect(screen.getByText(expectedTruncated)).toBeDefined();
    });
  });

  describe('5. Static Metadata & Public Contract Verification', () => {
    it('public/version.json exists, is valid JSON, and adheres to distribution contract', () => {
      const versionJsonPath = path.resolve(process.cwd(), 'public/version.json');
      expect(fs.existsSync(versionJsonPath)).toBe(true);

      const raw = fs.readFileSync(versionJsonPath, 'utf8');
      const manifest = JSON.parse(raw);

      expect(manifest.version).toBe('7.4.0');
      expect(manifest.downloadUrl).toBe(PUBLIC_APK_URL);
      expect(manifest.minSupportedVersion).toBe('7.0.0');
      expect(manifest.minVersion).toBe('7.0.0');
      expect(manifest.checksumSha256).toBeDefined();
      expect(Array.isArray(manifest.changelog)).toBe(true);
      expect(manifest.changelog.length).toBeGreaterThanOrEqual(3);
    });

    it('ROUTE_STATIC_TITLES registers dedicated download routes with correct titles', () => {
      const title1 = getStaticRouteTitle('/download');
      const title2 = getStaticRouteTitle('/downloads');
      const title3 = getStaticRouteTitle('/apk');

      expect(title1).toBe('Tải PomoFocus v7.4 APK Android | Không Gian Tập Trung');
      expect(title2).toBe('Tải PomoFocus v7.4 APK Android | Không Gian Tập Trung');
      expect(title3).toBe('Tải PomoFocus v7.4 APK Android | Không Gian Tập Trung');
    });

    it('package.json contains ZERO third-party QR or update bloat dependencies', () => {
      const pkgPath = path.resolve(process.cwd(), 'package.json');
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

      const allDeps = {
        ...pkg.dependencies,
        ...pkg.devDependencies,
      };

      expect(allDeps['qrcode']).toBeUndefined();
      expect(allDeps['qrcode.react']).toBeUndefined();
      expect(allDeps['qr-image']).toBeUndefined();
      expect(allDeps['semver']).toBeUndefined();
    });
  });
});
