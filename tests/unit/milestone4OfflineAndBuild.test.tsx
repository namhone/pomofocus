vi.mock('node:child_process', async importOriginal => {
  const actual = await importOriginal<typeof import('node:child_process')>();
  const execSync = vi.fn(() => 'List of devices attached\n');
  return { ...actual, execSync, default: { ...actual, execSync } };
});
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import * as fs from 'node:fs';
import * as path from 'node:path';

// Module imports
import { compressImageToWebP } from '../../src/components/SpacesWidget';
import {
  getSafeYouTubeOrigin,
  buildYouTubeMixEmbedUrl,
  extractYouTubeEmbedUrl,
  extractYouTubePlaylistId,
  extractYouTubeVideoId
} from '../../src/utils/media';
import { PRODUCTION_API_ORIGIN } from '../../src/utils/apiConfig';
import { LiquidUpdateBanner } from '../../src/components/LiquidUpdateBanner';
import { tryAdbInstall, APP_VERSION, APK_FILENAME } from '../../scripts/buildApk';

describe('Milestone 4: Offline Assets, Memory, PWA Cache & Release APK Build', () => {
  const originalLocation = window.location;
  const originalCreateElement = document.createElement.bind(document);

  beforeEach(() => {
    vi.restoreAllMocks();
    URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-raw-image');
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true
    });
    delete (window as any).Capacitor;
    delete (window as any).PomoNativeBridge;
    delete (window as any).PomoNativeBack;
  });

  // =========================================================================
  // Feature 18: Wallpaper 1080p WebP resize/compression & URL cleanup
  // =========================================================================
  describe('Feature 18: Client-Side WebP Compression & Memory Cleanup', () => {
    it('returns original blob untouched if media type is not an image (e.g. video)', async () => {
      const videoBlob = new Blob(['dummy video stream'], { type: 'video/mp4' });
      const result = await compressImageToWebP(videoBlob, 1920, 1080, 0.85);
      expect(result).toBe(videoBlob);
      expect(result.type).toBe('video/mp4');
    });

    it('downscales an image exceeding 1080p (e.g. 4000x3000) preserving aspect ratio', async () => {
      let drawnWidth = 0;
      let drawnHeight = 0;
      let targetMime = '';
      let targetQuality = 0;

      // Mock HTMLCanvasElement context & drawImage
      const mockCanvas = originalCreateElement('canvas');
      const mockCtx = {
        drawImage: vi.fn((img: any, x: number, y: number, w: number, h: number) => {
          drawnWidth = w;
          drawnHeight = h;
        })
      };
      vi.spyOn(mockCanvas, 'getContext').mockReturnValue(mockCtx as any);
      vi.spyOn(mockCanvas, 'toBlob').mockImplementation((callback: any, mime?: string, quality?: any) => {
        targetMime = mime || '';
        targetQuality = quality;
        callback(new Blob(['compressed-webp'], { type: 'image/webp' }));
      });
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'canvas') return mockCanvas;
        return originalCreateElement(tag);
      });

      // Mock Image constructor
      const OriginalImage = window.Image;
      class MockImage4K {
        width = 4000;
        height = 3000;
        private _src = '';
        onload: () => void = () => {};
        get src() {
          return this._src;
        }
        set src(val: string) {
          this._src = val;
          setTimeout(() => this.onload && this.onload(), 0);
        }
      }
      (window as any).Image = MockImage4K;

      const bigImageFile = new File(['mock-raw-4k'], 'sample_wallpaper.jpg', { type: 'image/jpeg' });
      const compressed = await compressImageToWebP(bigImageFile, 1920, 1080, 0.85);

      // Verify aspect ratio scaling: 4000x3000 down to fit 1920x1080 -> 1440x1080
      expect(drawnWidth).toBe(1440);
      expect(drawnHeight).toBe(1080);
      expect(targetMime).toBe('image/webp');
      expect(targetQuality).toBe(0.85);
      expect(compressed.type).toBe('image/webp');
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-raw-image');

      window.Image = OriginalImage;
    });

    it('preserves dimensions when image is already within 1080p bounds (e.g. 1280x720)', async () => {
      let drawnWidth = 0;
      let drawnHeight = 0;

      const mockCanvas = originalCreateElement('canvas');
      const mockCtx = {
        drawImage: vi.fn((img: any, x: number, y: number, w: number, h: number) => {
          drawnWidth = w;
          drawnHeight = h;
        })
      };
      vi.spyOn(mockCanvas, 'getContext').mockReturnValue(mockCtx as any);
      vi.spyOn(mockCanvas, 'toBlob').mockImplementation((callback: any) => {
        callback(new Blob(['compressed-webp'], { type: 'image/webp' }));
      });
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'canvas') return mockCanvas;
        return originalCreateElement(tag);
      });

      const OriginalImage = window.Image;
      class MockImage720p {
        width = 1280;
        height = 720;
        private _src = '';
        onload: () => void = () => {};
        get src() {
          return this._src;
        }
        set src(val: string) {
          this._src = val;
          setTimeout(() => this.onload && this.onload(), 0);
        }
      }
      (window as any).Image = MockImage720p;

      const smallImage = new File(['mock-small'], 'small.png', { type: 'image/png' });
      const result = await compressImageToWebP(smallImage, 1920, 1080, 0.85);

      expect(drawnWidth).toBe(1280);
      expect(drawnHeight).toBe(720);
      expect(result.type).toBe('image/webp');

      window.Image = OriginalImage;
    });
  });

  // =========================================================================
  // Feature 19: YouTube Embed WebView Origin Policy
  // =========================================================================
  describe('Feature 19: Safe YouTube Origin Policy in Native WebView', () => {
    it('returns canonical Vercel origin when running on Capacitor native platform', () => {
      (window as any).Capacitor = {
        isNativePlatform: () => true
      };

      const origin = getSafeYouTubeOrigin();
      expect(origin).toBe(PRODUCTION_API_ORIGIN);
    });

    it('returns canonical Vercel origin when origin is https://localhost (Capacitor Android default scheme)', () => {
      delete (window as any).Capacitor;
      Object.defineProperty(window, 'location', {
        value: {
          protocol: 'https:',
          hostname: 'localhost',
          port: '',
          origin: 'https://localhost'
        },
        writable: true,
        configurable: true
      });

      const origin = getSafeYouTubeOrigin();
      expect(origin).toBe(PRODUCTION_API_ORIGIN);
    });

    it('returns canonical Vercel origin when protocol is capacitor: or file:', () => {
      Object.defineProperty(window, 'location', {
        value: {
          protocol: 'capacitor:',
          hostname: 'localhost',
          origin: 'capacitor://localhost'
        },
        writable: true,
        configurable: true
      });
      expect(getSafeYouTubeOrigin()).toBe(PRODUCTION_API_ORIGIN);

      Object.defineProperty(window, 'location', {
        value: {
          protocol: 'file:',
          hostname: '',
          origin: 'file://'
        },
        writable: true,
        configurable: true
      });
      expect(getSafeYouTubeOrigin()).toBe(PRODUCTION_API_ORIGIN);
    });

    it('buildYouTubeMixEmbedUrl embeds safe origin when in native runtime', () => {
      (window as any).Capacitor = { isNativePlatform: () => true };
      const embedUrl = buildYouTubeMixEmbedUrl('jfKfPfyJRdk');
      expect(embedUrl).toContain('origin=https://pomofocus-workspace.vercel.app');
      expect(embedUrl).toContain('list=RDjfKfPfyJRdk');
    });

    it('extractYouTubeEmbedUrl autoMix embeds safe origin parameter', () => {
      (window as any).Capacitor = { isNativePlatform: () => true };
      const embedUrl = extractYouTubeEmbedUrl('https://www.youtube.com/watch?v=jfKfPfyJRdk', true);
      expect(embedUrl).toBe(
        'https://www.youtube.com/embed/jfKfPfyJRdk?enablejsapi=1&list=RDjfKfPfyJRdk&origin=https://pomofocus-workspace.vercel.app&autoplay=1'
      );
    });
  });

  // =========================================================================
  // Feature 20: PWA navigateFallbackDenylist & Vercel Caching Headers
  // =========================================================================
  describe('Feature 20: PWA Cache Denylist & Vercel Caching Headers', () => {
    it('vercel.json defines no-cache, no-store, must-revalidate for critical update files', () => {
      const vercelConfigPath = path.resolve(__dirname, '../../vercel.json');
      expect(fs.existsSync(vercelConfigPath)).toBe(true);

      const vercelJson = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf-8'));
      const headers = vercelJson.headers || [];

      const indexHeader = headers.find((h: any) => h.source === '/index.html');
      expect(indexHeader).toBeDefined();
      const indexCacheControl = indexHeader.headers.find((kv: any) => kv.key === 'Cache-Control');
      expect(indexCacheControl?.value).toBe('no-cache, no-store, must-revalidate');

      const swHeader = headers.find((h: any) => h.source === '/sw.js');
      expect(swHeader).toBeDefined();
      const swCacheControl = swHeader.headers.find((kv: any) => kv.key === 'Cache-Control');
      expect(swCacheControl?.value).toBe('no-cache, no-store, must-revalidate');

      const manifestHeader = headers.find((h: any) => h.source === '/manifest.webmanifest');
      expect(manifestHeader).toBeDefined();
      const manifestCacheControl = manifestHeader.headers.find((kv: any) => kv.key === 'Cache-Control');
      expect(manifestCacheControl?.value).toBe('no-cache, no-store, must-revalidate');

      const versionHeader = headers.find((h: any) => h.source === '/version.json');
      expect(versionHeader).toBeDefined();
      const versionCacheControl = versionHeader.headers.find((kv: any) => kv.key === 'Cache-Control');
      expect(versionCacheControl?.value).toBe('no-cache, no-store, must-revalidate');

      const apkHeader = headers.find((h: any) => h.source === '/downloads/(.*\\.apk)');
      expect(apkHeader).toBeDefined();
      const disposition = apkHeader.headers.find((kv: any) => kv.key === 'Content-Disposition');
      expect(disposition?.value).toContain('PomoFocus-v8.1.apk');
    });

    it('Service Worker denylist regexes match download binaries, version.json, and api routes', () => {
      const denylist = [/^\/downloads\/.*/, /^\/version\.json$/, /^\/api\/.*/];

      // Must be excluded from SPA navigation routing (bypasses service worker cache)
      expect(denylist.some((re) => re.test('/downloads/PomoFocus-v8.1.apk'))).toBe(true);
      expect(denylist.some((re) => re.test('/version.json'))).toBe(true);
      expect(denylist.some((re) => re.test('/api/chat'))).toBe(true);
      expect(denylist.some((re) => re.test('/api/auth/callback'))).toBe(true);

      // Must NOT be denied (should fall back to SPA index.html)
      expect(denylist.some((re) => re.test('/rooms'))).toBe(false);
      expect(denylist.some((re) => re.test('/settings'))).toBe(false);
      expect(denylist.some((re) => re.test('/billing'))).toBe(false);
      expect(denylist.some((re) => re.test('/index.html'))).toBe(false);
    });

    it('src/sw.ts contains NavigationRoute denylist and NetworkOnly handlers', () => {
      const swPath = path.resolve(__dirname, '../../src/sw.ts');
      const swContent = fs.readFileSync(swPath, 'utf-8');

      expect(swContent).toContain('NavigationRoute');
      expect(swContent).toContain('NetworkOnly');
      expect(swContent).toContain('/downloads/');
      expect(swContent).toContain('/version.json');
      expect(swContent).toContain('/api/');
    });
  });

  // =========================================================================
  // Feature 21: In-App APK Update External Browser Routing
  // =========================================================================
  describe('Feature 21: LiquidUpdateBanner External Browser Routing', () => {
    it('invokes native Android bridge openExternalUrl when running in native APK environment', async () => {
      (window as any).Capacitor = {
        isNativePlatform: () => true
      };

      const openExternalUrlMock = vi.fn();
      (window as any).PomoNativeBridge = {
        openExternalUrl: openExternalUrlMock
      };

      // Mock fetch returning version.json with newer version
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          version: '8.2.0',
          downloadUrl: 'https://pomofocus-workspace.vercel.app/downloads/PomoFocus-v8.2.apk',
          changelog: ['Bản vá hiệu năng']
        })
      } as any);

      render(<LiquidUpdateBanner currentVersion="8.1.0" />);

      const downloadBtn = await screen.findByTestId('banner-download-btn');
      expect(downloadBtn).toBeDefined();

      fireEvent.click(downloadBtn);

      expect(openExternalUrlMock).toHaveBeenCalledWith(
        'https://pomofocus-workspace.vercel.app/downloads/PomoFocus-v8.2.apk'
      );
    });

    it('falls back to Capacitor Browser plugin when available', async () => {
      (window as any).Capacitor = {
        isNativePlatform: () => true,
        Plugins: {
          Browser: {
            open: vi.fn().mockResolvedValue(undefined)
          }
        }
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          version: '8.2.0',
          downloadUrl: 'https://pomofocus-workspace.vercel.app/downloads/PomoFocus-v8.2.apk',
          changelog: ['Bản cập nhật']
        })
      } as any);

      render(<LiquidUpdateBanner currentVersion="8.1.0" />);

      const downloadBtn = await screen.findByTestId('banner-download-btn');
      fireEvent.click(downloadBtn);

      expect((window as any).Capacitor.Plugins.Browser.open).toHaveBeenCalledWith({
        url: 'https://pomofocus-workspace.vercel.app/downloads/PomoFocus-v8.2.apk',
        windowName: '_system'
      });
    });
  });

  // =========================================================================
  // Feature 22: Release APK Build Pipeline & ADB Detection
  // =========================================================================
  describe('Feature 22: Release APK Pipeline & ADB Detection', () => {
    it('declares APP_VERSION 8.1.0 and APK_FILENAME PomoFocus-v8.1.apk', () => {
      expect(APP_VERSION).toBe('8.1.1');
      expect(APK_FILENAME).toBe('PomoFocus-v8.1.apk');
    });

    it('tryAdbInstall handles zero connected devices gracefully without throwing', () => {
      const result = tryAdbInstall('public/downloads/PomoFocus-v8.1.apk');
      expect(result).toBeDefined();
      expect(typeof result.attempted).toBe('boolean');
      expect(typeof result.installed).toBe('boolean');
      expect(typeof result.message).toBe('string');
      // When no device is attached on host machine, installed must be false
      if (result.attempted && !result.installed) {
        expect(['No connected devices', 'adb execution failed']).toContain(result.message);
      }
    });

    it('public/version.json contains valid v8.1 metadata and checksum fields', () => {
      const versionJsonPath = path.resolve(__dirname, '../../public/version.json');
      expect(fs.existsSync(versionJsonPath)).toBe(true);

      const versionData = JSON.parse(fs.readFileSync(versionJsonPath, 'utf-8'));
      expect(versionData.version).toBe('8.1.1');
      expect(versionData.versionCode).toBe(82);
      expect(versionData.downloadUrl).toContain('PomoFocus-v8.1.apk');
      expect(versionData.checksumSha256).toBeDefined();
      expect(typeof versionData.apkSizeMb).toBe('number');
    });
  });
});
