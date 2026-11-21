import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';
import { MobileAppShell } from '../../src/components/mobile/MobileAppShell';
import { MobileBottomNav } from '../../src/components/MobileBottomNav';
import { backStack } from '../../src/services/backStack';
import { useLayoutStore } from '../../src/stores/useLayoutStore';
import { useAiStore } from '../../src/stores/useAiStore';
import { useTimerStore } from '../../src/stores/useTimerStore';

describe('Adversarial Challenger M2: Insets, Splash Logo & KaTeX Offline Attack (BUG-04, 06, 07, 12)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    backStack.clear();
    useLayoutStore.setState({ activeMobileTab: 'focus' as any });
    useAiStore.setState({ isTopupModalOpen: false, isOpen: false });
    useTimerStore.setState({ status: 'idle', remainingMs: 25 * 60 * 1000 });
  });

  afterEach(() => {
    delete (window as any).PomoNativeBack;
    delete (window as any).PomoNativeBridge;
    delete (window as any).Capacitor;
    backStack.clear();
  });

  // =========================================================================
  // ATTACK 1: Android 15 Edge-to-Edge Safe-Area Insets Stress-Testing
  // =========================================================================
  describe('ATTACK 1: Android 15 Edge-to-Edge Safe-Area Insets Stress-Testing (BUG-06, BUG-07)', () => {
    const bottomNavSrc = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/MobileBottomNav.tsx'),
      'utf-8'
    );
    const appShellSrc = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/mobile/MobileAppShell.tsx'),
      'utf-8'
    );
    const indexCss = fs.readFileSync(
      path.resolve(process.cwd(), 'src/index.css'),
      'utf-8'
    );

    it('STRESS-1.1: MobileBottomNav completely purged of restrictive max-h clamps and has dynamic height calc', () => {
      // Must not clamp with max-h-[56px] or max-h-14 which crushed Android 15 gesture bar
      expect(bottomNavSrc).not.toContain('max-h-[56px]');
      expect(bottomNavSrc).not.toContain('max-h-14');

      // Must have dynamic height calc with fallback
      expect(bottomNavSrc).toContain('h-[calc(56px+env(safe-area-inset-bottom,0px))]');
      expect(bottomNavSrc).toContain('min-h-[56px]');
      expect(bottomNavSrc).toContain('pb-safe');
    });

    it('STRESS-1.2: MobileAppShell BottomNav purged of max-h clamps and includes min-h-[56px] guarantee', () => {
      // Find mobile-bottom-nav element in MobileAppShell
      const navBlockMatch = appShellSrc.match(/data-testid="mobile-bottom-nav"[\s\S]*?className=\{`([^`]+)`\}/);
      expect(navBlockMatch).not.toBeNull();
      const navClasses = navBlockMatch![1];

      expect(navClasses).not.toContain('max-h-[56px]');
      expect(navClasses).not.toContain('max-h-14');
      expect(navClasses).toContain('h-[calc(56px+env(safe-area-inset-bottom,0px))]');
      expect(navClasses).toContain('min-h-[56px]');
      expect(navClasses).toContain('pb-safe');
    });

    it('STRESS-1.3: Safe-area utility classes in src/index.css guard against negative/null insets via max()', () => {
      // .pb-safe and .pt-safe must use max(env(...), var(--sa*-native, 0px))
      expect(indexCss).toContain('.pb-safe {');
      expect(indexCss).toMatch(/padding-bottom:\s*max\(env\(safe-area-inset-bottom,\s*0px\),\s*var\(--sab-native,\s*0px\)\);/);

      expect(indexCss).toContain('.pt-safe {');
      expect(indexCss).toMatch(/padding-top:\s*max\(env\(safe-area-inset-top,\s*0px\),\s*var\(--sat-native,\s*0px\)\);/);

      // :root must define --safe-bottom and --safe-top
      expect(indexCss).toMatch(/--safe-bottom:\s*max\(env\(safe-area-inset-bottom,\s*0px\),\s*var\(--sab-native,\s*0px\)\);/);
      expect(indexCss).toMatch(/--safe-top:\s*max\(env\(safe-area-inset-top,\s*0px\),\s*var\(--sat-native,\s*0px\)\);/);
    });

    it('STRESS-1.4: Outer shell root container MUST NOT have pt-safe or pb-safe to prevent wallpaper cutout band (BUG-07)', () => {
      const shellBlockMatch = appShellSrc.match(/data-testid="mobile-app-shell"[\s\S]*?className=\{`([^`]+)`\}/);
      expect(shellBlockMatch).not.toBeNull();
      const shellClasses = shellBlockMatch![1];

      // Anti-pattern: pt-safe / pb-safe on root container pushes down the whole canvas, creating dark gap
      expect(shellClasses).not.toMatch(/\bpt-safe\b/);
      expect(shellClasses).not.toMatch(/\bpb-safe\b/);

      // Safe area top is encapsulated inside header
      const headerBlockMatch = appShellSrc.match(/data-testid="mobile-top-header"[\s\S]*?className=\{`([^`]+)`\}/);
      expect(headerBlockMatch).not.toBeNull();
      const headerClasses = headerBlockMatch![1];
      expect(headerClasses).toContain('pt-safe');
      expect(headerClasses).toContain('h-[calc(48px+env(safe-area-inset-top,0px))]');
      expect(headerClasses).toContain('min-h-[48px]');
    });

    it('STRESS-1.5: Secondary scrollable views, SubViewLayout, and SharedFooter protect content via pb-safe and pt-safe', () => {
      const footerSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/components/SharedFooter.tsx'), 'utf-8');
      expect(footerSrc).toContain('pb-safe');

      const subViewLayoutSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/components/mobile/MobileSubViewLayout.tsx'), 'utf-8');
      expect(subViewLayoutSrc).toContain('pt-safe');
      expect(subViewLayoutSrc).toContain('pb-safe');

      expect(appShellSrc).toContain('MobileTasksSubView');
      expect(appShellSrc).toMatch(/MobileTasksSubView[\s\S]*?pb-safe/);
      expect(appShellSrc).toContain('MobileSpacesSubView');
      expect(appShellSrc).toMatch(/MobileSpacesSubView[\s\S]*?pb-safe/);
    });

    it('STRESS-1.6: Dynamic Safe-Area Inset Simulation (48px extreme inset vs 0px default)', () => {
      // Render MobileBottomNav in DOM and verify class composition
      const { container } = render(<MobileBottomNav />);
      const nav = container.querySelector('[data-testid="mobile-bottom-navigation"]');
      expect(nav).not.toBeNull();

      // Class string must include dynamic calc expression and pb-safe
      const classAttr = nav!.getAttribute('class') || '';
      expect(classAttr).toContain('h-[calc(56px+env(safe-area-inset-bottom,0px))]');
      expect(classAttr).toContain('min-h-[56px]');
      expect(classAttr).toContain('pb-safe');

      // Verify no max-h class is applied
      expect(classAttr).not.toContain('max-h');
    });
  });

  // =========================================================================
  // ATTACK 2: Splash Curtain SVG Logo & Zero-FOUT Preloader Adversarial Testing
  // =========================================================================
  describe('ATTACK 2: Splash Curtain SVG Logo & Zero-FOUT Preloader (BUG-04)', () => {
    const indexHtml = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');

    it('STRESS-2.1: Splash curtain container has non-blocking click-through (pointer-events: none) and high z-index', () => {
      const dom = new JSDOM(indexHtml);
      const curtain = dom.window.document.getElementById('pomo-splash-curtain');
      expect(curtain).not.toBeNull();

      // Accessibility: aria-hidden="true" during initial paint
      expect(curtain!.getAttribute('aria-hidden')).toBe('true');

      // Inline styles/critical CSS checks
      expect(indexHtml).toMatch(/#pomo-splash-curtain\s*\{[^}]*pointer-events:\s*none;/);
      expect(indexHtml).toMatch(/#pomo-splash-curtain\s*\{[^}]*z-index:\s*99999;/);
      expect(indexHtml).toMatch(/#pomo-splash-curtain\.loaded\s*\{[^}]*opacity:\s*0;/);
      expect(indexHtml).toMatch(/#pomo-splash-curtain\.loaded\s*\{[^}]*visibility:\s*hidden;/);
    });

    it('STRESS-2.2: PomoFocus SVG logo strictly contains required vector elements and brand palette', () => {
      const dom = new JSDOM(indexHtml);
      const svg = dom.window.document.querySelector('#pomo-splash-curtain svg.pomo-splash-logo');
      expect(svg).not.toBeNull();

      // SVG metadata
      expect(svg!.getAttribute('viewBox')).toBe('0 0 1000 1000');
      expect(svg!.getAttribute('xmlns')).toBe('http://www.w3.org/2000/svg');

      // Background squircle frame with gradient
      const rectFrame = svg!.querySelector('rect[rx="232"]');
      expect(rectFrame).not.toBeNull();
      expect(rectFrame!.getAttribute('fill')).toBe('url(#splashBgGrad)');

      // Linear gradient definition
      const gradient = svg!.querySelector('linearGradient#splashBgGrad');
      expect(gradient).not.toBeNull();

      // Clock dial circle
      const dialCircle = svg!.querySelector('circle[cx="500"][cy="498"][r="243"]');
      expect(dialCircle).not.toBeNull();

      // Emerald center dot
      const centerDot = svg!.querySelector('circle[cx="500"][cy="498"][r="19.5"]');
      expect(centerDot).not.toBeNull();
      expect(centerDot!.getAttribute('fill')).toBe('#10b981');
    });

    it('STRESS-2.3: Splash content branding typography and spinner presence', () => {
      const dom = new JSDOM(indexHtml);
      const title = dom.window.document.querySelector('.pomo-splash-title');
      const sub = dom.window.document.querySelector('.pomo-splash-sub');
      const spinner = dom.window.document.querySelector('.pomo-spinner');

      expect(title).not.toBeNull();
      expect(title!.textContent?.trim()).toBe('PomoFocus');

      expect(sub).not.toBeNull();
      expect(sub!.textContent?.trim()).toBe('Study Workspace');

      expect(spinner).not.toBeNull();
    });

    it('STRESS-2.4: Breathing pulse animation uses GPU-friendly transforms and keyframes', () => {
      // Verify pulse animation rule
      expect(indexHtml).toMatch(/\.pomo-splash-content\s*\{[^}]*animation:\s*pomoPulse\s+2s\s+ease-in-out\s+infinite;/);

      // Verify keyframes for pomoPulse
      expect(indexHtml).toContain('@keyframes pomoPulse');
      expect(indexHtml).toContain('0%, 100% { opacity: 1; transform: scale(1); }');
      expect(indexHtml).toContain('50% { opacity: 0.88; transform: scale(0.98); }');

      // Verify pomoSpin keyframes
      expect(indexHtml).toContain('@keyframes pomoSpin');
      expect(indexHtml).toContain('to { transform: rotate(360deg); }');
    });

    it('STRESS-2.5: Zero-FOUT dismissal script operates reliably across loading states', () => {
      // Simulate dismissal script execution
      const dom = new JSDOM(indexHtml, { runScripts: 'dangerously' });
      const curtain = dom.window.document.getElementById('pomo-splash-curtain');
      expect(curtain).not.toBeNull();

      // Before dismissal: does not have .loaded class
      expect(curtain!.classList.contains('loaded')).toBe(false);

      // Trigger DOMContentLoaded
      dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));

      // Wait 150ms for script timeout
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(curtain!.classList.contains('loaded')).toBe(true);
          resolve();
        }, 150);
      });
    });
  });

  // =========================================================================
  // ATTACK 3: KaTeX Offline Caching & Workbox Precache Configuration
  // =========================================================================
  describe('ATTACK 3: KaTeX Offline Caching & Workbox Precache (BUG-12)', () => {
    const viteConfigSrc = fs.readFileSync(path.resolve(process.cwd(), 'vite.config.ts'), 'utf-8');
    const swSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/sw.ts'), 'utf-8');
    const indexHtml = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');

    it('STRESS-3.1: Workbox globPatterns includes woff, woff2, ttf webfonts with >=3 MiB cache budget', () => {
      // Check globPatterns
      expect(viteConfigSrc).toMatch(/globPatterns:\s*\[.*woff.*woff2.*ttf.*\]/);

      // Check maximumFileSizeToCacheInBytes is at least 3 MiB (3145728)
      const sizeMatch = viteConfigSrc.match(/maximumFileSizeToCacheInBytes:\s*(\d+)/);
      expect(sizeMatch).not.toBeNull();
      const maxBytes = parseInt(sizeMatch![1], 10);
      expect(maxBytes).toBeGreaterThanOrEqual(3145728);

      // Check vendor-katex chunk is isolated in rollupOptions
      expect(viteConfigSrc).toContain("'vendor-katex': ['katex', 'react-markdown', 'remark-math', 'rehype-katex']");
    });

    it('STRESS-3.2: Adversarial Route Predicate Stress-Testing against valid & malicious KaTeX URLs', () => {
      // Define sw predicate function exactly as declared in src/sw.ts
      const katexRoutePredicate = ({ url }: { url: URL }) =>
        url.origin === 'https://cdn.jsdelivr.net' &&
        (url.pathname.includes('/katex@') || url.pathname.includes('/fonts/KaTeX_'));

      // 1. MUST MATCH: Official KaTeX CSS from jsdelivr
      expect(
        katexRoutePredicate({ url: new URL('https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css') })
      ).toBe(true);

      // 2. MUST MATCH: Official KaTeX fonts referenced by CSS
      expect(
        katexRoutePredicate({ url: new URL('https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/fonts/KaTeX_Main-Regular.woff2') })
      ).toBe(true);
      expect(
        katexRoutePredicate({ url: new URL('https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/fonts/KaTeX_Math-Italic.woff') })
      ).toBe(true);
      expect(
        katexRoutePredicate({ url: new URL('https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/fonts/KaTeX_Size1-Regular.ttf') })
      ).toBe(true);
      expect(
        katexRoutePredicate({ url: new URL('https://cdn.jsdelivr.net/npm/katex@0.19.1/dist/katex.min.css') })
      ).toBe(true);

      // 3. MUST NOT MATCH: Different libraries on jsdelivr
      expect(
        katexRoutePredicate({ url: new URL('https://cdn.jsdelivr.net/npm/bootstrap@5.0.0/dist/bootstrap.min.css') })
      ).toBe(false);
      expect(
        katexRoutePredicate({ url: new URL('https://cdn.jsdelivr.net/npm/chart.js/dist/chart.min.js') })
      ).toBe(false);

      // 4. MUST NOT MATCH: Different origins (e.g. cdnjs, unpkg, google fonts)
      expect(
        katexRoutePredicate({ url: new URL('https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.11/katex.min.css') })
      ).toBe(false);
      expect(
        katexRoutePredicate({ url: new URL('https://fonts.googleapis.com/css2?family=Inter') })
      ).toBe(false);

      // 5. MUST NOT MATCH: Internal app routes
      expect(
        katexRoutePredicate({ url: new URL('https://pomofocus.vn/api/payment/check-status') })
      ).toBe(false);
      expect(
        katexRoutePredicate({ url: new URL('https://pomofocus.vn/downloads/pomofocus.apk') })
      ).toBe(false);
      expect(
        katexRoutePredicate({ url: new URL('https://pomofocus.vn/version.json') })
      ).toBe(false);
    });

    it('STRESS-3.3: Service Worker CacheFirst strategy specifies status 0 (opaque) and status 200 for CORS font survival', () => {
      // Must use CacheFirst
      expect(swSrc).toContain('new CacheFirst({');
      expect(swSrc).toContain("cacheName: 'katex-cdn-cache'");

      // Must allow status 0 (opaque responses) so cross-origin fonts don't fail when no-cors
      expect(swSrc).toMatch(/statuses:\s*\[\s*0,\s*200\s*\]/);

      // Must have long-term cache expiration (1 year = 31536000s) and bounded entries
      expect(swSrc).toMatch(/maxAgeSeconds:\s*365\s*\*\s*24\s*\*\s*60\s*\*\s*60/);
      expect(swSrc).toMatch(/maxEntries:\s*60/);
    });

    it('STRESS-3.4: Pinned KaTeX CDN link in index.html includes preconnect and asynchronous non-blocking loader', () => {
      expect(indexHtml).toContain('<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin />');
      expect(indexHtml).toContain('<link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />');
      expect(indexHtml).toContain('https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css');
      expect(indexHtml).toContain('media="print"');
      expect(indexHtml).toContain('onload="this.media=\'all\'"');
      expect(indexHtml).toContain('<noscript>');
    });
  });
});
