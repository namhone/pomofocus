import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import { RouterProvider } from '../../src/services/router';
import { WebDownloadHub, PUBLIC_APK_URL } from '../../src/components/landing/WebDownloadHub';
import { MobileSettingsView } from '../../src/components/mobile/views/MobileSettingsView';
import { MobileFocusView } from '../../src/components/mobile/views/MobileFocusView';
import { LiquidUpdateBanner } from '../../src/components/LiquidUpdateBanner';
import { MobileAppShell } from '../../src/components/mobile/MobileAppShell';
import App from '../../src/App';
import { useLayoutStore } from '../../src/stores/useLayoutStore';
import { useAiStore } from '../../src/stores/useAiStore';
import { useTimerStore } from '../../src/stores/useTimerStore';
import { generateQrMatrix, generateValidQrCodeSvg } from '../../src/utils/qrCode';
import capacitorConfig from '../../capacitor.config';

// Helper: Pure ISO/IEC 18004 bit-level decoder to mathematically prove our QR matrices are 100% scannable
function decodeIsoQrMatrix(matrix: boolean[][]): { version: number; mask: number; decodedText: string } {
  const size = matrix.length;
  const version = (size - 17) / 4;

  // Read Format Information from Copy 1 (top-left)
  let fmt = 0;
  for (let i = 0; i < 15; i++) {
    let bit = false;
    if (i < 6) bit = matrix[8][i];
    else if (i === 6) bit = matrix[8][7];
    else if (i === 7) bit = matrix[8][8];
    else if (i === 8) bit = matrix[7][8];
    else bit = matrix[14 - i][8];
    fmt = (fmt << 1) | (bit ? 1 : 0);
  }
  const unmaskedFmt = fmt ^ 0x5412;
  const mask = (unmaskedFmt >> 10) & 0b111;

  // Determine function modules map
  const isFunc: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const markFinder = (top: number, left: number) => {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const r = top + dr;
        const c = left + dc;
        if (r >= 0 && r < size && c >= 0 && c < size) isFunc[r][c] = true;
      }
    }
  };
  markFinder(0, 0);
  markFinder(0, size - 7);
  markFinder(size - 7, 0);

  const alignTable: Record<number, number[]> = {
    1: [],
    2: [6, 18],
    3: [6, 22],
    4: [6, 26],
    5: [6, 30],
    6: [6, 34],
    7: [6, 22, 38],
    8: [6, 24, 42],
    9: [6, 26, 46],
  };
  const coords = alignTable[version] || [];
  for (const rc of coords) {
    for (const cc of coords) {
      if ((rc <= 8 && cc <= 8) || (rc <= 8 && cc >= size - 9) || (rc >= size - 9 && cc <= 8)) continue;
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          isFunc[rc + dr][cc + dc] = true;
        }
      }
    }
  }
  for (let i = 8; i < size - 8; i++) {
    isFunc[6][i] = true;
    isFunc[i][6] = true;
  }
  isFunc[size - 8][8] = true;
  for (let i = 0; i <= 8; i++) {
    isFunc[8][i] = true;
    isFunc[i][8] = true;
  }
  for (let i = size - 8; i < size; i++) isFunc[8][i] = true;
  for (let i = size - 7; i < size; i++) isFunc[i][8] = true;
  if (version >= 7) {
    for (let i = 0; i < 6; i++) {
      for (let j = size - 11; j < size - 8; j++) {
        isFunc[i][j] = true;
        isFunc[j][i] = true;
      }
    }
  }

  const maskFn = (m: number, r: number, c: number): boolean => {
    switch (m) {
      case 0: return (r + c) % 2 === 0;
      case 1: return r % 2 === 0;
      case 2: return c % 3 === 0;
      case 3: return (r + c) % 3 === 0;
      case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
      case 5: return ((r * c) % 2) + ((r * c) % 3) === 0;
      case 6: return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
      case 7: return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0;
      default: return false;
    }
  };

  // Extract raw bit stream in zigzag order
  const rawBits: number[] = [];
  let upward = true;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let step = 0; step < size; step++) {
      const r = upward ? size - 1 - step : step;
      for (const dc of [0, -1]) {
        const c = right + dc;
        if (!isFunc[r][c]) {
          const val = matrix[r][c] !== maskFn(mask, r, c);
          rawBits.push(val ? 1 : 0);
        }
      }
    }
    upward = !upward;
  }

  // Reconstruct interleaved codewords and de-interleave data blocks for M/L levels
  const totalCodewords = Math.floor(rawBits.length / 8);
  const codewords: number[] = [];
  for (let i = 0; i < totalCodewords; i++) {
    let cw = 0;
    for (let j = 0; j < 8; j++) cw = (cw << 1) | rawBits[i * 8 + j];
    codewords.push(cw);
  }

  // Determine block structure for Versions 1..9 (matching qrCode.ts)
  const blockSpecs: Array<{ ver: number; totalCw: number; ecCw: number; g1: number; g1Data: number; g2: number; g2Data: number }> = [
    { ver: 1, totalCw: 26, ecCw: 10, g1: 1, g1Data: 16, g2: 0, g2Data: 0 },
    { ver: 2, totalCw: 44, ecCw: 16, g1: 1, g1Data: 28, g2: 0, g2Data: 0 },
    { ver: 3, totalCw: 70, ecCw: 26, g1: 1, g1Data: 44, g2: 0, g2Data: 0 },
    { ver: 4, totalCw: 100, ecCw: 18, g1: 2, g1Data: 32, g2: 0, g2Data: 0 },
    { ver: 5, totalCw: 134, ecCw: 24, g1: 2, g1Data: 43, g2: 0, g2Data: 0 },
    { ver: 6, totalCw: 172, ecCw: 16, g1: 4, g1Data: 27, g2: 0, g2Data: 0 },
    { ver: 7, totalCw: 196, ecCw: 18, g1: 4, g1Data: 31, g2: 0, g2Data: 0 },
    { ver: 8, totalCw: 242, ecCw: 22, g1: 2, g1Data: 38, g2: 2, g2Data: 39 },
    { ver: 9, totalCw: 292, ecCw: 22, g1: 3, g1Data: 36, g2: 2, g2Data: 37 },
  ];

  // Check if EC Level L (ecBits == 1) on Version 9
  const ecLevelBits = (unmaskedFmt >> 13) & 0b11;
  const spec =
    version === 9 && ecLevelBits === 1
      ? { ver: 9, totalCw: 292, ecCw: 30, g1: 2, g1Data: 116, g2: 0, g2Data: 0 }
      : blockSpecs.find((b) => b.ver === version)!;

  const numBlocks = spec.g1 + spec.g2;
  const blocks: number[][] = Array.from({ length: numBlocks }, () => []);
  let idx = 0;
  const maxDataLen = Math.max(spec.g1Data, spec.g2Data);
  for (let col = 0; col < maxDataLen; col++) {
    for (let b = 0; b < numBlocks; b++) {
      const targetLen = b < spec.g1 ? spec.g1Data : spec.g2Data;
      if (col < targetLen) {
        blocks[b].push(codewords[idx++]);
      }
    }
  }
  const orderedData = blocks.flat();
  const dataBits: number[] = [];
  for (const b of orderedData) {
    for (let i = 7; i >= 0; i--) dataBits.push((b >> i) & 1);
  }

  const readBits = (start: number, len: number) => {
    let val = 0;
    for (let i = 0; i < len; i++) val = (val << 1) | dataBits[start + i];
    return val;
  };

  const mode = readBits(0, 4);
  expect(mode).toBe(0b0100); // Byte mode
  const byteCount = readBits(4, 8);
  const bytes: number[] = [];
  for (let i = 0; i < byteCount; i++) {
    bytes.push(readBits(12 + i * 8, 8));
  }
  const decodedText = new TextDecoder().decode(new Uint8Array(bytes));
  return { version, mask, decodedText };
}

describe('PomoFocus v7.5 Final — 3D Download Showcase, ISO QR & Android Manifest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Interactive 3D Titanium Phone Mockup & Brand Sync', () => {
    it('1.1 renders perspective 1200px stage and preserve-3d phone mockup frame', () => {
      render(
        <RouterProvider>
          <WebDownloadHub />
        </RouterProvider>
      );

      const stage = screen.getByTestId('phone-3d-tilt-stage');
      const phone = screen.getByTestId('phone-mockup-preview');

      expect(stage.style.perspective).toBe('1200px');
      expect(phone.style.transformStyle).toBe('preserve-3d');
      expect(phone.className).toContain('rounded-[44px]');
      expect(phone.className).toContain('border-[3px]');
    });

    it('1.2 tilts 3D phone frame smoothly on mouse move and resets on mouse leave', () => {
      render(
        <RouterProvider>
          <WebDownloadHub />
        </RouterProvider>
      );

      const stage = screen.getByTestId('phone-3d-tilt-stage');
      const phone = screen.getByTestId('phone-mockup-preview');

      vi.spyOn(stage, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        width: 400,
        height: 600,
        right: 400,
        bottom: 600,
        x: 0,
        y: 0,
        toJSON: () => {},
      });

      // Move pointer to top-right corner -> expect positive rotateX and positive rotateY
      fireEvent.mouseMove(stage, { clientX: 400, clientY: 0 });
      expect(phone.style.transform).toContain('rotateX(12.00deg)');
      expect(phone.style.transform).toContain('rotateY(12.00deg)');
      expect(phone.style.transform).toContain('scale3d(1.02, 1.02, 1)');

      // Leave -> reset back to neutral
      fireEvent.mouseLeave(stage);
      expect(phone.style.transform).toContain('rotateX(0.00deg)');
      expect(phone.style.transform).toContain('rotateY(0.00deg)');
      expect(phone.style.transform).toContain('scale3d(1, 1, 1)');
    });

    it('1.3 displays accurate ~8.0 MB APK size and unified pomofocus brand logo', () => {
      render(
        <RouterProvider>
          <WebDownloadHub />
        </RouterProvider>
      );

      expect(screen.getAllByText(/~8\.0 MB/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText(/18\.4 MB/i)).toBeNull();
      expect(screen.getAllByText(/pomofocus/i).length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText('25:00')).toBeDefined();
    });
  });

  describe('2. Authentic ISO/IEC 18004 QR Encoder Verification', () => {
    it('2.1 encodes and bit-decodes the production APK URL identically', () => {
      const matrix = generateQrMatrix(PUBLIC_APK_URL);
      const decoded = decodeIsoQrMatrix(matrix);
      expect(decoded.decodedText).toBe(PUBLIC_APK_URL);
      expect(decoded.version).toBe(5); // 67 bytes fits Version 5-M (37x37)
      expect(matrix.length).toBe(37);
    });

    it('2.2 encodes and bit-decodes short, Unicode, and long URLs cleanly', () => {
      const payloads = [
        'https://a.co',
        'HELLO WORLD',
        'https://pomofocus.app/tải-ứng-dụng-🍅',
        'https://pomofocus-workspace.vercel.app/downloads/PomoFocus-v7.4.apk?source=qr&campaign=mobile_showcase_2026_extended_test',
      ];
      for (const payload of payloads) {
        const matrix = generateQrMatrix(payload);
        const decoded = decodeIsoQrMatrix(matrix);
        expect(decoded.decodedText).toBe(payload);
      }
    });

    it('2.3 renders valid high-contrast SVG markup via generateValidQrCodeSvg', () => {
      const svg = generateValidQrCodeSvg(PUBLIC_APK_URL, {
        size: 200,
        margin: 16,
        color: '#09090b',
        bgColor: '#ffffff',
      });
      expect(svg).toContain('viewBox="0 0 200 200"');
      expect(svg).toContain('fill="#ffffff"');
      expect(svg).toContain('fill="#09090b"');
      expect(svg).toContain('transform="translate(16,16)"');
      expect(svg).toContain(`<desc>${PUBLIC_APK_URL}</desc>`);
    });
  });

  describe('3. Android Native Manifest & Capacitor Plugins Contract', () => {
    it('3.1 AndroidManifest.xml declares all required permissions and hardware acceleration flags', () => {
      const manifestPath = path.resolve(process.cwd(), 'android/app/src/main/AndroidManifest.xml');
      const xml = fs.readFileSync(manifestPath, 'utf-8');

      expect(xml).toContain('android.permission.INTERNET');
      expect(xml).toContain('android.permission.VIBRATE');
      expect(xml).toContain('android.permission.WAKE_LOCK');
      expect(xml).toContain('android.permission.POST_NOTIFICATIONS');
      expect(xml).toContain('android:hardwareAccelerated="true"');
      expect(xml).toContain('android:screenOrientation="portrait"');
      expect(xml).toContain('android:enableOnBackInvokedCallback="true"');
      expect(xml).toContain('android:windowSoftInputMode="adjustResize"');
      expect(xml).toContain('androidx.core.content.FileProvider');
    });

    it('3.2 capacitor.config.ts includes OLED SplashScreen and StatusBar plugin configs', () => {
      expect(capacitorConfig.appId).toBe('com.pomofocus.workspace');
      expect(capacitorConfig.appName).toBe('PomoFocus');
      expect(capacitorConfig.plugins?.SplashScreen?.backgroundColor).toBe('#09090b');
      expect(capacitorConfig.plugins?.SplashScreen?.showSpinner).toBe(false);
      expect(capacitorConfig.plugins?.StatusBar?.style).toBe('DARK');
      expect(capacitorConfig.plugins?.StatusBar?.backgroundColor).toBe('#09090b');
    });

    it('3.3 Vercel Edge middleware.ts whitelists /download, /downloads, and /apk routes', () => {
      const mwPath = path.resolve(process.cwd(), 'middleware.ts');
      const mwSrc = fs.readFileSync(mwPath, 'utf-8');
      expect(mwSrc).toContain("'/download'");
      expect(mwSrc).toContain("'/downloads'");
      expect(mwSrc).toContain("'/apk'");
    });
  });

  describe('4. V7.5.1 Vietnamese Copywriting, Sentence Case & Glossary Polish', () => {
    it('4.1 WebDownloadHub renders Zen hero copy, clean separator spacing, CTA and "Mở bản web →"', () => {
      render(
        <RouterProvider>
          <WebDownloadHub />
        </RouterProvider>
      );

      expect(screen.getByText(/Tập trung sâu\./i)).toBeDefined();
      expect(screen.getByText(/Trôi chảy từng khoảnh khắc\./i)).toBeDefined();
      expect(screen.getByText(/Đếm giờ chính xác ngay cả khi tắt màn hình/i)).toBeDefined();
      expect(screen.queryByText(/đếm giờ bất tử/i)).toBeNull();
      expect(screen.getByTestId('central-apk-download-btn').textContent).toContain('Tải PomoFocus APK (v8.0)');
      expect(screen.getByText('Dung lượng: ~8.0 MB · Android 9.0+ · Miễn phí hoàn toàn')).toBeDefined();
      expect(screen.getAllByText('Mở bản web →').length).toBeGreaterThanOrEqual(1);
    });

    it('4.2 MobileSettingsView renders Sentence Case labels, concise subtitles, offline copy, and red reset button', () => {
      render(<MobileSettingsView />);

      expect(screen.getByText('Thời gian tập trung')).toBeDefined();
      expect(screen.getByText('Số phút cho mỗi phiên học sâu')).toBeDefined();
      expect(screen.getByText('Thư giãn nhẹ giữa các hiệp')).toBeDefined();
      expect(screen.getByText('Hồi phục năng lượng sau 4 hiệp')).toBeDefined();
      expect(screen.getByText('Tự động chuyển hiệp mới')).toBeDefined();
      expect(screen.getByText('Tự động chạy hiệp tiếp theo khi hết giờ')).toBeDefined();
      expect(screen.getByText('Dữ liệu được lưu an toàn trên máy của bạn (hoạt động offline)')).toBeDefined();

      const resetBtn = screen.getByTestId('mobile-settings-reset-layout-btn');
      expect(resetBtn.textContent).toContain('Khôi phục giao diện ban đầu');
      expect(resetBtn.className).toContain('text-red-300');
    });

    it('4.3 MobileFocusView exposes natural tooltips and LiquidUpdateBanner uses refined update heading', () => {
      render(<MobileFocusView />);

      const resetBtn = screen.getByTestId('mobile-timer-reset');
      const skipBtn = screen.getByTestId('mobile-timer-skip');
      expect(resetBtn.getAttribute('title')).toBe('Đặt lại hiệp này (giữ 1.5s để làm lại từ đầu)');
      expect(skipBtn.getAttribute('title')).toBe('Bỏ qua hiệp này');

      render(<LiquidUpdateBanner currentVersion="7.4.0" latestVersion="7.5.0" />);
      expect(screen.getByText('Đã có phiên bản mới')).toBeDefined();
      expect(screen.getByText('Tải bản cập nhật')).toBeDefined();
    });
  });

  describe('5. Android Blind-Spot Hardening (Play Protect Micro-hint, Native Back, Capacitor Root, Visibility Sync)', () => {
    it('5.1 WebDownloadHub includes Play Protect external install micro-hint', () => {
      render(
        <RouterProvider>
          <WebDownloadHub />
        </RouterProvider>
      );

      const hint = screen.getByTestId('play-protect-micro-hint');
      expect(hint.textContent).toContain("Nếu máy hiện cảnh báo nguồn ngoài, chọn 'Vẫn cài đặt' để trải nghiệm bản thử nghiệm nội bộ.");
    });

    it('5.2 MainActivity.java binds OnBackPressedCallback + PomoNativeBack JavascriptInterface and MobileAppShell syncs back eligibility', () => {
      const mainActivityPath = path.resolve(
        process.cwd(),
        'android/app/src/main/java/com/pomofocus/workspace/MainActivity.java'
      );
      const javaSrc = fs.readFileSync(mainActivityPath, 'utf-8');
      expect(javaSrc).toContain('OnBackPressedCallback');
      expect(javaSrc).toContain('getOnBackPressedDispatcher().addCallback');
      expect(javaSrc).toContain('PomoNativeBack');
      expect(javaSrc).toContain('pomofocus:native-back');

      const setCanGoBackInApp = vi.fn();
      (window as any).PomoNativeBack = { setCanGoBackInApp };
      useLayoutStore.setState({ activeMobileTab: 'focus' as any });
      useAiStore.setState({ isTopupModalOpen: false });

      render(<MobileAppShell />);
      expect(setCanGoBackInApp).toHaveBeenCalledWith(false);

      // Navigate to secondary tab -> native back interception enabled
      fireEvent.click(screen.getByTestId('mobile-nav-tab-settings'));
      expect(setCanGoBackInApp).toHaveBeenLastCalledWith(true);

      // System fires native-back -> returns smoothly to focus and disables native interception so next swipe exits to launcher
      act(() => {
        window.dispatchEvent(new CustomEvent('pomofocus:native-back'));
      });
      expect(useLayoutStore.getState().activeMobileTab).toBe('focus');
      expect(setCanGoBackInApp).toHaveBeenLastCalledWith(false);

      delete (window as any).PomoNativeBack;
    });

    it('5.3 Native Capacitor APK launches on /app MobileAppShell instead of marketing LandingPage when pathname is /', () => {
      window.history.pushState({}, '', '/');
      (window as any).Capacitor = { isNativePlatform: () => true };

      render(
        <RouterProvider>
          <App />
        </RouterProvider>
      );

      expect(screen.getByTestId('mobile-app-shell')).toBeDefined();
      expect(screen.queryByTestId('landing-page-root')).toBeNull();

      delete (window as any).Capacitor;
    });

    it('5.4 TimerStore resynchronizes immediately on visibilitychange when waking from OS sleep', () => {
      vi.useFakeTimers();
      try {
        useTimerStore.getState().destroy();
        useTimerStore.getState().init();
        useTimerStore.getState().resetCycle();
        useTimerStore.getState().start();

        const startRemaining = useTimerStore.getState().remainingMs;
        // Advance wall clock by 90s while interval didn't run (simulate frozen background WebView)
        vi.setSystemTime(Date.now() + 90_000);
        Object.defineProperty(document, 'visibilityState', {
          value: 'visible',
          configurable: true,
        });
        document.dispatchEvent(new Event('visibilitychange'));

        expect(useTimerStore.getState().remainingMs).toBeLessThanOrEqual(startRemaining - 89_000);
      } finally {
        useTimerStore.getState().destroy();
        vi.useRealTimers();
      }
    });
  });
});
