import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Milestone 1: Zero-FOUT & Typography Foundation (Adversarial Challenger Suite)', () => {
  const rootDir = path.resolve(__dirname, '../../');
  const indexHtmlPath = path.join(rootDir, 'index.html');
  const indexCssPath = path.join(rootDir, 'src/index.css');

  const indexHtml = fs.readFileSync(indexHtmlPath, 'utf-8');
  const indexCss = fs.readFileSync(indexCssPath, 'utf-8');

  // =========================================================================
  // 1. Zero-FOUT Dark Mode Lock & Critical Inline Shell
  // =========================================================================
  describe('1. Zero-FOUT Dark Mode Lock & Critical Inline Shell', () => {
    it('locks #09090b dark background and #f4f4f5 color immediately on <html> and <body> tags', () => {
      // <html> must have class="dark" and inline background-color style with !important
      expect(indexHtml).toMatch(/<html[^>]*class="[^"]*dark[^"]*"[^>]*>/);
      expect(indexHtml).toMatch(/<html[^>]*style="[^"]*background-color:\s*#09090b\s*!important[^"]*"[^>]*>/);
      expect(indexHtml).toMatch(/<html[^>]*style="[^"]*color:\s*#f4f4f5[^"]*"[^>]*>/);

      // <body> must have inline background-color style with !important
      expect(indexHtml).toMatch(/<body[^>]*style="[^"]*background-color:\s*#09090b\s*!important[^"]*"[^>]*>/);
      expect(indexHtml).toMatch(/<body[^>]*style="[^"]*color:\s*#f4f4f5[^"]*"[^>]*>/);
    });

    it('contains critical zero-dependency preloader CSS in inline <style> within <head>', () => {
      // Must contain inline style in <head>
      expect(indexHtml).toContain('<!-- Zero-FOUT & Instant Dark Shell Critical Styling -->');
      expect(indexHtml).toContain('#pomo-splash-curtain {');
      expect(indexHtml).toContain('z-index: 99999;');
      expect(indexHtml).toContain('pointer-events: none;');
      expect(indexHtml).toContain('transition: opacity 300ms cubic-bezier(0.16, 1, 0.3, 1), visibility 300ms;');
      expect(indexHtml).toContain('#pomo-splash-curtain.loaded {');
      expect(indexHtml).toContain('opacity: 0;');
      expect(indexHtml).toContain('visibility: hidden;');
      expect(indexHtml).toContain('.pomo-spinner {');
      expect(indexHtml).toContain('border-top-color: #10b981;');
      expect(indexHtml).toContain('@keyframes pomoSpin {');
    });

    it('places #pomo-splash-curtain directly before #root with aria-hidden="true"', () => {
      expect(indexHtml).toContain('<div id="pomo-splash-curtain" aria-hidden="true">');
      expect(indexHtml).toContain('<div class="pomo-spinner"></div>');

      const curtainIndex = indexHtml.indexOf('id="pomo-splash-curtain"');
      const rootIndex = indexHtml.indexOf('id="root"');
      expect(curtainIndex).toBeGreaterThan(0);
      expect(rootIndex).toBeGreaterThan(curtainIndex);
    });

    it('has an idempotent splash curtain dismissal script that gracefully handles fast/cached loads', () => {
      expect(indexHtml).toContain('function dismissCurtain()');
      expect(indexHtml).toContain("document.getElementById('pomo-splash-curtain')");
      expect(indexHtml).toContain("curtain.classList.add('loaded')");
      expect(indexHtml).toContain('DOMContentLoaded');
      // Verifies fallback for interactive or complete state
      expect(indexHtml).toContain("document.readyState === 'interactive' || document.readyState === 'complete'");
    });
  });

  // =========================================================================
  // 2. KaTeX <link> & WCAG Accessibility Invariants
  // =========================================================================
  describe('2. KaTeX <link> & WCAG Accessibility Invariants', () => {
    it('strictly satisfies all KaTeX preconnect and non-render-blocking link checks', () => {
      expect(indexHtml).toContain('<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin />');
      expect(indexHtml).toContain('<link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />');
      expect(indexHtml).toContain('media="print"');
      expect(indexHtml).toContain("onload=\"this.media='all'\"");
      expect(indexHtml).toContain('<noscript>');
      expect(indexHtml).toContain('<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css" />');
    });

    it('matches exact KaTeX CSS URL and version pinning', () => {
      const katexLinks = indexHtml.match(/https:\/\/cdn\.jsdelivr\.net\/npm\/katex@[^/]+\/dist\/katex\.min\.css/g);
      expect(katexLinks).not.toBeNull();
      expect(katexLinks!.length).toBeGreaterThanOrEqual(2); // One in <link media="print">, one in <noscript>
      katexLinks!.forEach(link => {
        expect(link).toBe('https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css');
      });
    });
  });

  // =========================================================================
  // 3. Crawler Text Integrity & SEO Invariants in <div id="root">
  // =========================================================================
  describe('3. Crawler Text Integrity & SEO Invariants in <div id="root">', () => {
    it('preserves all static crawler semantics without damage', () => {
      const rootMatch = indexHtml.match(/<div id="root">([\s\S]*?)<\/div>\s*<script type="module"/);
      expect(rootMatch).not.toBeNull();
      const rootInner = rootMatch![1];

      // Semantic structure
      expect(rootInner).toContain('<header>');
      expect(rootInner).toContain('<nav>');
      expect(rootInner).toContain('<main id="main-content">');
      expect(rootInner).toContain('<h1>PomoFocus — Không Gian Làm Việc & Học Tập Tập Trung Chuẩn Zen</h1>');
      expect(rootInner).toContain('<h2>Tính Năng Cốt Lõi</h2>');
      expect(rootInner).toContain('<h2>Bắt Đầu Sử Dụng</h2>');
      expect(rootInner).toContain('<footer>');

      // Crucial internal routing links for search crawlers
      expect(rootInner).toContain('<a href="/">PomoFocus Workspace</a>');
      expect(rootInner).toContain('<a href="/app">Không Gian Học Tập</a>');
      expect(rootInner).toContain('<a href="/billing">Bảng Giá</a>');
      expect(rootInner).toContain('<a href="/rooms">Phòng Học Nhóm</a>');
      expect(rootInner).toContain('<a href="/contact">Liên Hệ</a>');
      expect(rootInner).toContain('<a href="/about">Giới Thiệu</a>');
      expect(rootInner).toContain('<a href="/privacy">Chính Sách Bảo Mật</a>');
      expect(rootInner).toContain('<a href="/terms">Điều Khoản Dịch Vụ</a>');

      // Contact details
      expect(rootInner).toContain('namho03052k9@gmail.com');
      expect(rootInner).toContain('0704 862 629');
    });
  });

  // =========================================================================
  // 4. Zero Occurrences of "font-display: swap" in Production Codebase
  // =========================================================================
  describe('4. Zero Occurrences of "font-display: swap" in Production Codebase', () => {
    it('has zero active instances of font-display: swap in src/ and index.html', () => {
      // In index.html
      expect(indexHtml).not.toContain('font-display: swap');
      expect(indexHtml).not.toContain('font-display:swap');
      expect(indexHtml).not.toContain('display=swap');

      // In src/index.css (strip comments first to test active declarations)
      const cssWithoutComments = indexCss.replace(/\/\*[\s\S]*?\*\//g, '');
      expect(cssWithoutComments).not.toContain('font-display: swap');
      expect(cssWithoutComments).not.toContain('font-display:swap');
      expect(cssWithoutComments).not.toContain('display=swap');

      // Invariant comment must be present in src/index.css
      expect(indexCss).toContain("Tuyệt đối không dùng 'font-display: swap'");
      expect(indexCss).toContain("font-display: optional");
    });
  });

  // =========================================================================
  // 5. Typography Foundation & PostCSS/Tailwind Validation
  // =========================================================================
  describe('5. Typography Foundation & PostCSS/Tailwind Validation', () => {
    it('specifies zero-latency system font stack in src/index.css', () => {
      expect(indexCss).toContain('-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif');
      expect(indexCss).toContain('text-rendering: optimizeLegibility;');
      expect(indexCss).toContain('-webkit-font-smoothing: antialiased;');
    });

    it('enforces Vietnamese typography rules preventing awkward word breaks and orphan lines', () => {
      expect(indexCss).toContain('text-wrap: balance;');
      expect(indexCss).toContain('text-wrap: pretty;');
      expect(indexCss).toContain('hyphens: none;');
      expect(indexCss).toContain('-webkit-hyphens: none;');
      expect(indexCss).toContain('overflow-wrap: break-word;');
    });

    it('configures WCAG focus ring utilities and tabular numbers', () => {
      expect(indexCss).toContain('.focus-ring');
      expect(indexCss).toContain('.tabular-nums');
      expect(indexCss).toContain('font-variant-numeric: tabular-nums;');
    });
  });
});
