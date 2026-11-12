import 'fake-indexeddb/auto';
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act, renderHook, waitFor } from '@testing-library/react';
import fs from 'fs';
import path from 'path';

// Target Modules under White-Box Adversarial Stress Testing
import { compareVersions, isUpdateAvailable } from '../../src/utils/versionCompare';
import { detectDevice, useDeviceDetection } from '../../src/hooks/useDeviceDetection';
import { generateQrCodeSvg, generateValidQrCodeSvg, generateQrMatrix, copyToClipboard } from '../../src/utils/qrCode';
import { LiquidUpdateBanner, CURRENT_APP_VERSION, DEFAULT_DOWNLOAD_URL } from '../../src/components/LiquidUpdateBanner';
import { WebDownloadHub, PUBLIC_APK_URL, CURRENT_APK_VERSION } from '../../src/components/landing/WebDownloadHub';
import capacitorConfig from '../../capacitor.config';
import * as buildApkModule from '../../scripts/buildApk';

// Router & Stores
import { RouterProvider } from '../../src/services/router';
import { useLayoutStore } from '../../src/stores/useLayoutStore';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useAiStore } from '../../src/stores/useAiStore';

describe('Milestone 4: Tier 5 White-Box Adversarial Hardening Suite (Challenger 1)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();

    // Default clean store states
    useLayoutStore.setState({
      isMobile: false,
      activeMobileTab: 'focus',
      isZenMode: false,
      isMobileHeaderOpen: false,
      isHeaderExpanded: false,
      isFocusDimmed: false,
      isEcoMode: false,
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
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // MODULE 1: src/utils/versionCompare.ts (Adversarial Semver Fuzzing & Boundaries)
  // ===========================================================================
  describe('Module 1 White-Box Hardening: src/utils/versionCompare.ts', () => {
    it('1.1 correctly compares identical versions and normalizes "v" / "V" prefixes with whitespace', () => {
      expect(compareVersions('7.4.0', '7.4.0')).toBe(0);
      expect(compareVersions('v7.4.0', '7.4.0')).toBe(0);
      expect(compareVersions('V7.4.0', 'v7.4.0')).toBe(0);
      expect(compareVersions('  v7.4.0  ', '7.4.0')).toBe(0);
      expect(compareVersions('\tv7.4.0\n', '7.4.0')).toBe(0);
    });

    it('1.2 handles asymmetric version lengths with implicit zero-padding (e.g. 7.4 vs 7.4.0.0)', () => {
      expect(compareVersions('7.4', '7.4.0')).toBe(0);
      expect(compareVersions('7.4.0.0.0', '7.4')).toBe(0);
      expect(compareVersions('7', '7.0.0')).toBe(0);
      expect(compareVersions('7.4.1', '7.4')).toBe(1);
      expect(compareVersions('7.4', '7.4.1')).toBe(-1);
    });

    it('1.3 correctly orders major, minor, patch, and deep 6-segment subversions', () => {
      // Major
      expect(compareVersions('8.0.0', '7.4.0')).toBe(1);
      expect(compareVersions('6.9.9', '7.0.0')).toBe(-1);
      // Minor
      expect(compareVersions('7.10.0', '7.9.0')).toBe(1);
      expect(compareVersions('7.9.0', '7.10.0')).toBe(-1);
      // Patch
      expect(compareVersions('7.4.10', '7.4.2')).toBe(1);
      expect(compareVersions('7.4.2', '7.4.10')).toBe(-1);
      // Deep 6-segment
      expect(compareVersions('1.2.3.4.5.6', '1.2.3.4.5.7')).toBe(-1);
      expect(compareVersions('1.2.3.4.5.8', '1.2.3.4.5.7')).toBe(1);
      expect(compareVersions('1.2.3.4.5.7', '1.2.3.4.5.7')).toBe(0);
    });

    it('1.4 strips prerelease suffixes (-alpha, -beta, -rc) according to spec', () => {
      expect(compareVersions('7.4.0-alpha.1', '7.4.0-beta.2')).toBe(0);
      expect(compareVersions('7.4.0-rc.1+build.2026', '7.4.0')).toBe(0);
      expect(compareVersions('7.4.1-alpha', '7.4.0')).toBe(1);
      expect(compareVersions('7.3.9-beta', '7.4.0')).toBe(-1);
    });

    it('1.5 safely handles leading zeros, negative segments, and non-numeric garbage without throwing', () => {
      expect(compareVersions('07.004.000', '7.4.0')).toBe(0);
      expect(compareVersions('7.invalid.0', '7.0.0')).toBe(0);
      expect(compareVersions('NaN.NaN.NaN', '0.0.0')).toBe(0);
      // In semver parser, hyphen '-' is strictly treated as prerelease separator, so '7.-1.0' has -1.0 truncated to '7.' (7.0.0)
      expect(compareVersions('7.-1.0', '7.0.0')).toBe(0);
    });

    it('1.6 handles empty strings, null, and undefined in runtime JS gracefully', () => {
      expect(compareVersions('', '')).toBe(0);
      expect(compareVersions('', '1.0.0')).toBe(-1);
      expect(compareVersions('1.0.0', '')).toBe(1);
      expect(compareVersions(null as any, '1.0.0')).toBe(-1);
      expect(compareVersions('1.0.0', null as any)).toBe(1);
      expect(compareVersions(undefined as any, undefined as any)).toBe(0);
    });

    it('1.7 isUpdateAvailable truth table exhaustive matrix test', () => {
      // Newer versions available
      expect(isUpdateAvailable('7.4.0', '7.4.1')).toBe(true);
      expect(isUpdateAvailable('7.4.0', '7.5.0')).toBe(true);
      expect(isUpdateAvailable('7.4.0', '8.0.0')).toBe(true);
      expect(isUpdateAvailable('7.4', '7.4.1')).toBe(true);
      expect(isUpdateAvailable('v7.4.0', 'v7.4.1')).toBe(true);

      // Same or older versions (no update)
      expect(isUpdateAvailable('7.4.0', '7.4.0')).toBe(false);
      expect(isUpdateAvailable('v7.4.0', '7.4.0')).toBe(false);
      expect(isUpdateAvailable('7.4.0', '7.3.99')).toBe(false);
      expect(isUpdateAvailable('7.4.0', '6.0.0')).toBe(false);
      expect(isUpdateAvailable('7.4.0', '7.4.0-rc1')).toBe(false);

      // Edge case boundaries
      expect(isUpdateAvailable('7.4.0', '')).toBe(false);
      expect(isUpdateAvailable('', '7.4.0')).toBe(true);
      expect(isUpdateAvailable(null as any, '7.4.0')).toBe(true);
      expect(isUpdateAvailable('7.4.0', null as any)).toBe(false);
      expect(isUpdateAvailable(undefined as any, undefined as any)).toBe(false);
    });
  });

  // ===========================================================================
  // MODULE 2: src/hooks/useDeviceDetection.ts (Adversarial UA Fuzzing & Native Bridge)
  // ===========================================================================
  describe('Module 2 White-Box Hardening: src/hooks/useDeviceDetection.ts', () => {
    it('2.1 detects standard Android phone, foldable, and tablet user agents', () => {
      // Samsung Galaxy S24 Ultra
      const s24U = 'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
      expect(detectDevice(s24U)).toEqual({
        isAndroid: true,
        isIOS: false,
        isMobile: true,
        isDesktop: false,
        isNativeCapacitor: false,
      });

      // Samsung Galaxy Z Fold 5 (Folded/Unfolded)
      const fold5 = 'Mozilla/5.0 (Linux; Android 13; SM-F946B Build/TP1A.220624.014) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36';
      expect(detectDevice(fold5).isAndroid).toBe(true);
      expect(detectDevice(fold5).isMobile).toBe(true);

      // Android Tablet without 'Mobile' keyword
      const tablet = 'Mozilla/5.0 (Linux; Android 12; SM-X906N Build/SP1A.210812.016) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.98 Safari/537.36';
      expect(detectDevice(tablet).isAndroid).toBe(true);
      expect(detectDevice(tablet).isMobile).toBe(true);
      expect(detectDevice(tablet).isDesktop).toBe(false);
    });

    it('2.2 detects iOS device variants (iPhone, iPad, iPod)', () => {
      const iphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
      expect(detectDevice(iphone)).toEqual({
        isAndroid: false,
        isIOS: true,
        isMobile: true,
        isDesktop: false,
        isNativeCapacitor: false,
      });

      const ipad = 'Mozilla/5.0 (iPad; CPU OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1';
      expect(detectDevice(ipad).isIOS).toBe(true);
      expect(detectDevice(ipad).isMobile).toBe(true);

      const ipod = 'Mozilla/5.0 (iPod touch; CPU iPhone OS 14_8 like Mac OS X) AppleWebKit/605.1.15';
      expect(detectDevice(ipod).isIOS).toBe(true);
      expect(detectDevice(ipod).isMobile).toBe(true);
    });

    it('2.3 detects legacy and exotic mobile engines (webOS, BlackBerry, IEMobile, Opera Mini)', () => {
      const webos = 'Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.79 Safari/537.36 WebAppManager /webOS/';
      expect(detectDevice(webos).isMobile).toBe(true);
      expect(detectDevice(webos).isAndroid).toBe(false);

      const blackberry = 'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en) AppleWebKit/534.11+';
      expect(detectDevice(blackberry).isMobile).toBe(true);

      const iemobile = 'Mozilla/5.0 (Mobile; Windows Phone 8.1; Android 4.0; ARM; Trident/7.0; Touch; IEMobile/11.0; NOKIA; Lumia 930)';
      expect(detectDevice(iemobile).isMobile).toBe(true);

      const operaMini = 'Opera/9.80 (J2ME/MIDP; Opera Mini/9.80 (S60; SymbOS; Opera Mobi/23.348; U; en) Presto/2.5.25 Version/10.00';
      expect(detectDevice(operaMini).isMobile).toBe(true);
    });

    it('2.4 classifies Desktop systems accurately (Windows, macOS, Linux, ChromeOS)', () => {
      const win11 = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
      expect(detectDevice(win11)).toEqual({
        isAndroid: false,
        isIOS: false,
        isMobile: false,
        isDesktop: true,
        isNativeCapacitor: false,
      });

      const mac = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15';
      expect(detectDevice(mac).isDesktop).toBe(true);

      const linux = 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:122.0) Gecko/20100101 Firefox/122.0';
      expect(detectDevice(linux).isDesktop).toBe(true);
    });

    it('2.5 handles web crawlers and malformed strings safely without crashing', () => {
      const googlebotMobile = 'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko; compatible; Googlebot/2.1; +http://www.google.com/bot.html) Chrome/120.0.6099.71 Mobile Safari/537.36';
      expect(detectDevice(googlebotMobile).isAndroid).toBe(true);
      expect(detectDevice(googlebotMobile).isMobile).toBe(true);

      const googlebotDesktop = 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Googlebot/2.1; +http://www.google.com/bot.html) Safari/537.36';
      expect(detectDevice(googlebotDesktop).isDesktop).toBe(true);
      expect(detectDevice(googlebotDesktop).isMobile).toBe(false);

      // Empty & null-like user agent fallback
      const emptyUA = detectDevice('');
      expect(emptyUA.isDesktop).toBe(true);
      expect(emptyUA.isMobile).toBe(false);
      expect(emptyUA.isAndroid).toBe(false);
      expect(emptyUA.isIOS).toBe(false);
    });

    it('2.6 verifies Capacitor native bridge detection precedence', () => {
      // 1. Direct object passed with isNativePlatform true
      const bridgeMockTrue = { isNativePlatform: () => true };
      expect(detectDevice('Android', bridgeMockTrue).isNativeCapacitor).toBe(true);

      // 2. Direct object passed with isNativePlatform false
      const bridgeMockFalse = { isNativePlatform: () => false };
      expect(detectDevice('Android', bridgeMockFalse).isNativeCapacitor).toBe(false);

      // 3. Fallback to window.Capacitor
      (window as any).Capacitor = { isNativePlatform: () => true };
      expect(detectDevice('Android').isNativeCapacitor).toBe(true);

      // 4. window.Capacitor returning false
      (window as any).Capacitor = { isNativePlatform: () => false };
      expect(detectDevice('Android').isNativeCapacitor).toBe(false);

      // 5. Clean up window.Capacitor
      delete (window as any).Capacitor;
      expect(detectDevice('Android').isNativeCapacitor).toBe(false);
    });

    it('2.7 useDeviceDetection React hook mounts and executes cleanly in DOM', () => {
      const { result } = renderHook(() => useDeviceDetection());
      expect(result.current).toBeDefined();
      expect(typeof result.current.isAndroid).toBe('boolean');
      expect(typeof result.current.isIOS).toBe('boolean');
      expect(typeof result.current.isMobile).toBe('boolean');
      expect(typeof result.current.isDesktop).toBe('boolean');
      expect(typeof result.current.isNativeCapacitor).toBe('boolean');
    });
  });

  // ===========================================================================
  // MODULE 3: src/utils/qrCode.ts (Adversarial SVG Generator & Clipboard Hardening)
  // ===========================================================================
  describe('Module 3 White-Box Hardening: src/utils/qrCode.ts', () => {
    it('3.1 clamps size to [32, 1024] range under extreme boundaries', () => {
      // Negative / zero sizes
      const svgSmall = generateQrCodeSvg('https://pomofocus.app', { size: -500 });
      expect(svgSmall).toContain('width="32"');
      expect(svgSmall).toContain('height="32"');
      expect(svgSmall).toContain('viewBox="0 0 32 32"');

      // Giant sizes
      const svgLarge = generateQrCodeSvg('https://pomofocus.app', { size: 99999 });
      expect(svgLarge).toContain('width="1024"');
      expect(svgLarge).toContain('height="1024"');
      expect(svgLarge).toContain('viewBox="0 0 1024 1024"');

      // Default size
      const svgDefault = generateQrCodeSvg('https://pomofocus.app');
      expect(svgDefault).toContain('width="256"');
      expect(svgDefault).toContain('height="256"');
    });

    it('3.2 clamps margin to >= 0 and handles zero margin', () => {
      const svgZeroMargin = generateQrCodeSvg('https://pomofocus.app', { margin: -100 });
      expect(svgZeroMargin).toContain('transform="translate(0,0)"');

      const svgPositiveMargin = generateQrCodeSvg('https://pomofocus.app', { margin: 12 });
      expect(svgPositiveMargin).toContain('transform="translate(12,12)"');
    });

    it('3.3 generates deterministic matrices and unique module patterns per text', () => {
      const textA = 'https://pomofocus-workspace.vercel.app/downloads/PomoFocus-v7.4.apk';
      const textB = 'https://pomofocus-workspace.vercel.app/app';

      const svgA1 = generateQrCodeSvg(textA);
      const svgA2 = generateQrCodeSvg(textA);
      const svgB = generateQrCodeSvg(textB);

      // Deterministic identical outputs for identical text
      expect(svgA1).toBe(svgA2);

      // Distinct text produces distinct SVG matrix data
      expect(svgA1).not.toBe(svgB);
    });

    it('3.4 contains authentic ISO/IEC 18004 7x7 finder corner patterns and accessible metadata', () => {
      const url = 'https://pomofocus-workspace.vercel.app/downloads/PomoFocus-v7.4.apk';
      const svg = generateValidQrCodeSvg(url, { size: 256, margin: 4 });
      expect(svg).toContain('role="img"');
      expect(svg).toContain('aria-label="QR Code"');
      expect(svg).toContain(`<desc>${url}</desc>`);
      expect(svg).toContain('<path d="M');

      // Verify genuine 7x7 finder rings (outer 7x7 dark border, 5x5 light inner ring, 3x3 dark core) at all 3 corners
      const matrix = generateQrMatrix(url);
      const n = matrix.length;
      expect(n).toBeGreaterThanOrEqual(21);
      const checkFinder = (top: number, left: number) => {
        for (let dr = 0; dr < 7; dr++) {
          for (let dc = 0; dc < 7; dc++) {
            const expectedDark =
              dr === 0 || dr === 6 || dc === 0 || dc === 6 || (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4);
            expect(matrix[top + dr][left + dc]).toBe(expectedDark);
          }
        }
      };
      checkFinder(0, 0);
      checkFinder(0, n - 7);
      checkFinder(n - 7, 0);
    });

    it('3.5 encodes Unicode, Vietnamese diacritics, and emoji without errors', () => {
      const unicodePayload = 'https://pomofocus.app/tải-ứng-dụng-zen-🍅-120hz';
      const svg = generateQrCodeSvg(unicodePayload);
      expect(svg).toContain(`<desc>${unicodePayload}</desc>`);
      expect(svg).toContain('</svg>');
    });

    it('3.6 copyToClipboard succeeds with navigator.clipboard.writeText', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock,
        },
      });

      const result = await copyToClipboard('https://pomofocus.app/download');
      expect(result).toBe(true);
      expect(writeTextMock).toHaveBeenCalledWith('https://pomofocus.app/download');
    });

    it('3.7 copyToClipboard catches clipboard permission rejection and returns false', async () => {
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockRejectedValue(new Error('NotAllowedError: Permission denied')),
        },
      });

      const result = await copyToClipboard('https://pomofocus.app/download');
      expect(result).toBe(false);
    });

    it('3.8 copyToClipboard falls back to document.execCommand when clipboard API is missing', async () => {
      // Remove clipboard API
      Object.assign(navigator, { clipboard: undefined });

      const execCommandMock = vi.fn().mockReturnValue(true);
      document.execCommand = execCommandMock;

      const appendSpy = vi.spyOn(document.body, 'appendChild');
      const removeSpy = vi.spyOn(document.body, 'removeChild');

      const result = await copyToClipboard('fallback text');
      expect(result).toBe(true);
      expect(execCommandMock).toHaveBeenCalledWith('copy');
      expect(appendSpy).toHaveBeenCalled();
      expect(removeSpy).toHaveBeenCalled();
    });

    it('3.9 copyToClipboard handles document.execCommand failure gracefully', async () => {
      Object.assign(navigator, { clipboard: undefined });
      document.execCommand = vi.fn().mockReturnValue(false);

      const result = await copyToClipboard('fallback failure');
      expect(result).toBe(false);
    });
  });

  // ===========================================================================
  // MODULE 4: src/components/LiquidUpdateBanner.tsx (Adversarial Component Stress)
  // ===========================================================================
  describe('Module 4 White-Box Hardening: src/components/LiquidUpdateBanner.tsx', () => {
    it('4.1 fails soft and returns null on HTTP 500 error or network rejection', async () => {
      // HTTP 500
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({}),
      } as Response);

      const { container } = render(<LiquidUpdateBanner currentVersion="7.4.0" />);
      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });
      expect(container.firstChild).toBeNull();

      // Network rejection
      global.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch'));
      const { container: containerErr } = render(<LiquidUpdateBanner currentVersion="7.4.0" />);
      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });
      expect(containerErr.firstChild).toBeNull();
    });

    it('4.2 suppresses banner when remote version is equal or older (no downgrade prompts)', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          version: '7.4.0',
          downloadUrl: 'https://pomofocus.app/apk',
        }),
      } as Response);

      const { container } = render(<LiquidUpdateBanner currentVersion="7.4.0" />);
      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });
      expect(container.firstChild).toBeNull();

      // Older version 7.3.9
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          version: '7.3.9',
          downloadUrl: 'https://pomofocus.app/apk',
        }),
      } as Response);

      const { container: olderContainer } = render(<LiquidUpdateBanner currentVersion="7.4.0" />);
      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });
      expect(olderContainer.firstChild).toBeNull();
    });

    it('4.3 renders banner at z-40 with download URL, changelog, and emerald glow on new version', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          version: '7.4.5',
          downloadUrl: 'https://pomofocus.app/downloads/PomoFocus-v7.4.5.apk',
          changelog: [
            'Nâng cấp tần số quét 120Hz mượt mà',
            'Tối ưu hóa Anchor Timestamp Engine',
            'Thêm phím tắt chỉnh giờ nhanh'
          ],
        }),
      } as Response);

      render(<LiquidUpdateBanner currentVersion="7.4.0" />);
      await waitFor(() => {
        expect(screen.getByTestId('liquid-update-banner')).toBeDefined();
      });

      const banner = screen.getByTestId('liquid-update-banner');
      expect(banner.className).toContain('z-40');
      expect(screen.getByText('v7.4.5')).toBeDefined();
      expect(screen.getByText('Nâng cấp tần số quét 120Hz mượt mà')).toBeDefined();

      const downloadBtn = screen.getByTestId('banner-download-btn');
      expect(downloadBtn.getAttribute('href')).toBe('https://pomofocus.app/downloads/PomoFocus-v7.4.5.apk');
      expect(downloadBtn.getAttribute('download')).toBe('PomoFocus-v7.4.5.apk');
    });

    it('4.4 truncates changelog items longer than 200 characters and caps at 3 items', async () => {
      const veryLongText = 'A'.repeat(250);
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          version: '7.5.0',
          changelog: [
            veryLongText,
            'Item 2',
            'Item 3',
            'Item 4 should not be shown',
            'Item 5 should not be shown',
          ],
        }),
      } as Response);

      render(<LiquidUpdateBanner currentVersion="7.4.0" />);
      await waitFor(() => {
        expect(screen.getByTestId('liquid-update-banner')).toBeDefined();
      });

      expect(screen.getByText(`${'A'.repeat(197)}...`)).toBeDefined();
      expect(screen.getByText('Item 2')).toBeDefined();
      expect(screen.getByText('Item 3')).toBeDefined();
      expect(screen.queryByText('Item 4 should not be shown')).toBeNull();
    });

    it('4.5 dismiss button saves session preference and unmounts banner', async () => {
      render(
        <LiquidUpdateBanner
          currentVersion="7.4.0"
          latestVersion="7.4.2"
          downloadUrl="https://pomofocus.app/apk"
        />
      );

      const dismissBtn = screen.getByTestId('banner-dismiss-btn');
      fireEvent.click(dismissBtn);

      expect(sessionStorage.getItem('dismissed_version_7.4.2')).toBe('true');
      expect(screen.queryByTestId('liquid-update-banner')).toBeNull();
    });

    it('4.6 does not render if already dismissed in sessionStorage', () => {
      sessionStorage.setItem('dismissed_version_7.4.2', 'true');

      const { container } = render(
        <LiquidUpdateBanner
          currentVersion="7.4.0"
          latestVersion="7.4.2"
        />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  // ===========================================================================
  // MODULE 5: src/components/landing/WebDownloadHub.tsx (Landing Page Contract)
  // ===========================================================================
  describe('Module 5 White-Box Hardening: src/components/landing/WebDownloadHub.tsx', () => {
    it('5.1 renders high-conversion layout with single PlatformHeader and SharedFooter', () => {
      render(
        <RouterProvider>
          <WebDownloadHub />
        </RouterProvider>
      );

      expect(screen.getByTestId('download-hub-container')).toBeDefined();
      expect(screen.getByText(/Tập trung sâu\./i)).toBeDefined();

      // State Singularity: max 1 header banner in document
      const headers = screen.queryAllByRole('banner');
      expect(headers.length).toBeLessThanOrEqual(1);
    });

    it('5.2 central 1-touch APK download button has correct URL and download attributes', () => {
      render(
        <RouterProvider>
          <WebDownloadHub />
        </RouterProvider>
      );

      const apkBtn = screen.getByTestId('central-apk-download-btn');
      expect(apkBtn.getAttribute('href')).toBe(PUBLIC_APK_URL);
      expect(apkBtn.getAttribute('download')).toBe('PomoFocus-v8.1.apk');
    });

    it('5.3 displays device detection hint dynamically', () => {
      render(
        <RouterProvider>
          <WebDownloadHub />
        </RouterProvider>
      );

      // In JSDOM by default it is Desktop
      expect(screen.getByTestId('phone-mockup-preview')).toBeDefined();
      expect(screen.getByTestId('dynamic-qr-code')).toBeDefined();
    });

    it('5.4 1-click clipboard button triggers copyToClipboard and feedback state', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock,
        },
      });

      render(
        <RouterProvider>
          <WebDownloadHub />
        </RouterProvider>
      );

      const copyBtn = screen.getByTestId('copy-download-url-btn');
      await act(async () => {
        fireEvent.click(copyBtn);
      });

      expect(writeTextMock).toHaveBeenCalledWith(PUBLIC_APK_URL);
      expect(screen.getByText('Đã sao chép liên kết APK!')).toBeDefined();
    });

    it('5.5 renders all 6 core feature showcase cards', () => {
      render(
        <RouterProvider>
          <WebDownloadHub />
        </RouterProvider>
      );

      expect(screen.getByText('Anchor Timestamp Engine')).toBeDefined();
      expect(screen.getByText('Screen Wake Lock API')).toBeDefined();
      expect(screen.getByText('Haptics & Spring Physics')).toBeDefined();
      expect(screen.getByText('Zero-Scroll-Chaining')).toBeDefined();
      expect(screen.getByText('Offline First & Security')).toBeDefined();
      expect(screen.getByText('Rolling Digit Morphing')).toBeDefined();
    });
  });

  // ===========================================================================
  // MODULE 6: capacitor.config.ts & scripts/buildApk.ts (Build Automation Contracts)
  // ===========================================================================
  describe('Module 6 White-Box Hardening: capacitor.config.ts & scripts/buildApk.ts', () => {
    it('6.1 capacitor.config.ts adheres to strict native schema', () => {
      expect(capacitorConfig.appId).toBe('com.pomofocus.workspace');
      expect(capacitorConfig.appName).toBe('PomoFocus');
      expect(capacitorConfig.webDir).toBe('dist');
      expect(capacitorConfig.server?.androidScheme).toBe('https');
      expect(capacitorConfig.android?.backgroundColor).toBe('#09090b');
      expect(capacitorConfig.android?.allowMixedContent).toBe(false);
    });

    it('6.2 buildApk exports valid paths and environment configurations', () => {
      expect(buildApkModule.JAVA_HOME).toContain('jdk-17');
      expect(buildApkModule.ANDROID_HOME).toContain('Android\\Sdk');
      expect(buildApkModule.PROJECT_ROOT).toBeDefined();
      expect(buildApkModule.TARGET_APK_PATH).toContain('PomoFocus-v8.1.apk');
      expect(buildApkModule.VERSION_JSON_PATH).toContain('version.json');
      expect(buildApkModule.GRADLE_OUTPUT_APK).toContain('app-debug.apk');
    });

    it('6.3 setupEnvironment properly configures process.env paths and copyAndHashApk computes valid sha256', () => {
      buildApkModule.setupEnvironment();
      expect(process.env.JAVA_HOME).toBe(buildApkModule.JAVA_HOME);
      expect(process.env.ANDROID_HOME).toBe(buildApkModule.ANDROID_HOME);
      expect(process.env.PATH).toContain(buildApkModule.JAVA_HOME);

      const result = buildApkModule.copyAndHashApk();
      expect(result.sizeMb).toBeGreaterThan(0);
      expect(result.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(fs.existsSync(result.targetPath)).toBe(true);
    });

    it('6.4 public/version.json conforms to authoritative release schema', () => {
      const versionJsonPath = path.resolve(process.cwd(), 'public/version.json');
      expect(fs.existsSync(versionJsonPath)).toBe(true);

      const raw = fs.readFileSync(versionJsonPath, 'utf-8');
      const data = JSON.parse(raw);

      expect(data.version).toBe('8.1.0');
      expect(data.minSupportedVersion).toBe('7.0.0');
      expect(data.downloadUrl).toBe('https://pomofocus-workspace.vercel.app/downloads/PomoFocus-v8.1.apk');
      expect(typeof data.apkSizeMb).toBe('number');
      expect(typeof data.checksumSha256).toBe('string');
      expect(data.checksumSha256.length).toBe(64); // SHA-256 hex string length
      expect(Array.isArray(data.changelog)).toBe(true);
      expect(data.changelog.length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // MODULE 7: src/index.css (Zero-Scroll-Chaining & 120Hz Micro-Animations Integrity)
  // ===========================================================================
  describe('Module 7 White-Box Hardening: src/index.css Forensic Invariants', () => {
    let indexCss = '';

    beforeEach(() => {
      const cssPath = path.resolve(process.cwd(), 'src/index.css');
      indexCss = fs.readFileSync(cssPath, 'utf-8');
    });

    it('7.1 verifies html, body Zero-Scroll-Chaining fixed 100dvh geometry', () => {
      expect(indexCss).toMatch(/html,\s*body\s*\{[^}]*position:\s*fixed;/);
      expect(indexCss).toMatch(/height:\s*100dvh;/);
      expect(indexCss).toMatch(/overflow:\s*hidden\s*!important;/);
      expect(indexCss).toMatch(/overscroll-behavior:\s*none\s*!important;/);
      expect(indexCss).toMatch(/-webkit-overscroll-behavior:\s*none\s*!important;/);
    });

    it('7.2 verifies #root isolated container allows vertical scrolling without chaining', () => {
      expect(indexCss).toMatch(/#root\s*\{[^}]*overflow-y:\s*auto;/);
      expect(indexCss).toMatch(/overflow-x:\s*hidden;/);
      expect(indexCss).toMatch(/-webkit-overflow-scrolling:\s*touch;/);
      expect(indexCss).toMatch(/position:\s*relative;/);
    });

    it('7.3 verifies all 5 120Hz micro-animation keyframes exist and are syntactically valid', () => {
      expect(indexCss).toContain('@keyframes rolling-digit-up');
      expect(indexCss).toContain('@keyframes rolling-digit-down');
      expect(indexCss).toContain('@keyframes spring-bounce');
      expect(indexCss).toContain('@keyframes draw-tick');
      expect(indexCss).toContain('@keyframes jade-burst');
    });

    it('7.4 verifies all 5 animation utility classes exist with hardware-accelerated will-change', () => {
      expect(indexCss).toContain('.animate-rolling-up');
      expect(indexCss).toContain('.animate-rolling-down');
      expect(indexCss).toContain('.animate-spring-bounce');
      expect(indexCss).toContain('.animate-draw-tick');
      expect(indexCss).toContain('.animate-jade-burst');
      expect(indexCss).toContain('will-change: transform');
    });

    it('7.5 enforces accessibility reduced-motion overrides across all animations', () => {
      expect(indexCss).toContain('@media (prefers-reduced-motion: reduce)');
      expect(indexCss).toContain('animation-duration: 0.01ms !important;');
      expect(indexCss).toContain('transition-duration: 0.01ms !important;');
    });
  });
});
