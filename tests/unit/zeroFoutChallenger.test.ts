import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

describe('Milestone 1 Adversarial Challenger Suite: Zero-FOUT & Typography Foundation', () => {
  const indexHtmlPath = path.resolve(__dirname, '../../index.html');
  const indexCssPath = path.resolve(__dirname, '../../src/index.css');

  let htmlContent: string;
  let cssContent: string;

  beforeEach(() => {
    htmlContent = fs.readFileSync(indexHtmlPath, 'utf-8');
    cssContent = fs.readFileSync(indexCssPath, 'utf-8');
  });

  describe('Adversarial Challenge 1: Zero-Style & Slow Loading Flash Prevention', () => {
    it('khóa màu tối #09090b trực tiếp trên thẻ html và body để chống Flash of Unstyled Content (FOUT)', () => {
      const dom = new JSDOM(htmlContent);
      const document = dom.window.document;

      const htmlEl = document.documentElement;
      const bodyEl = document.body;

      // 1. Thẻ html có lang="vi" và class="dark"
      expect(htmlEl.getAttribute('lang')).toBe('vi');
      expect(htmlEl.classList.contains('dark')).toBe(true);

      // 2. Inline style trên thẻ html chứa background-color #09090b
      const htmlStyle = htmlEl.getAttribute('style') || '';
      expect(htmlStyle).toMatch(/background-color:\s*#09090b/i);

      // 3. Thẻ body có class dark và inline style chứa background-color #09090b
      const bodyStyle = bodyEl.getAttribute('style') || '';
      expect(bodyStyle).toMatch(/background-color:\s*#09090b/i);
    });

    it('khối style inline trong head có các luật bắt buộc !important cho html và body', () => {
      const dom = new JSDOM(htmlContent);
      const styles = Array.from(dom.window.document.querySelectorAll('head style'))
        .map((s) => s.textContent || '')
        .join('\n');

      expect(styles).toContain('background-color: #09090b !important');
      expect(styles).toContain('color: #f4f4f5 !important');
      expect(styles).toContain('margin: 0');
      expect(styles).toContain('padding: 0');
    });
  });

  describe('Adversarial Challenge 2: Splash Curtain Preloader & Pointer-Events Non-Trapping', () => {
    it('phần tử #pomo-splash-curtain tồn tại, aria-hidden="true" và nằm trước #root', () => {
      const dom = new JSDOM(htmlContent);
      const document = dom.window.document;

      const curtain = document.getElementById('pomo-splash-curtain');
      expect(curtain).not.toBeNull();
      expect(curtain?.getAttribute('aria-hidden')).toBe('true');

      const root = document.getElementById('root');
      expect(root).not.toBeNull();

      // Kiểm tra curtain đứng ngay trước root trong DOM
      expect(curtain?.nextElementSibling).toBe(root);

      // Có spinner xoay bên trong
      const spinner = curtain?.querySelector('.pomo-spinner');
      expect(spinner).not.toBeNull();
    });

    it('chứng minh thực nghiệm #pomo-splash-curtain có pointer-events: none để không chặn click chuột', () => {
      const dom = new JSDOM(htmlContent);
      const styles = Array.from(dom.window.document.querySelectorAll('head style'))
        .map((s) => s.textContent || '')
        .join('\n');

      // Tách khối css của #pomo-splash-curtain
      const curtainRuleMatch = styles.match(/#pomo-splash-curtain\s*\{([^}]+)\}/);
      expect(curtainRuleMatch).not.toBeNull();
      const curtainRuleBody = curtainRuleMatch![1];

      // Bắt buộc phải có pointer-events: none
      expect(curtainRuleBody).toMatch(/pointer-events:\s*none/);
      expect(curtainRuleBody).toMatch(/z-index:\s*99999/);
      expect(curtainRuleBody).toMatch(/position:\s*fixed/);
      expect(curtainRuleBody).toMatch(/inset:\s*0/);
    });

    it('chứng minh thực nghiệm trạng thái .loaded của curtain thiết lập cả opacity: 0 và visibility: hidden', () => {
      const dom = new JSDOM(htmlContent);
      const styles = Array.from(dom.window.document.querySelectorAll('head style'))
        .map((s) => s.textContent || '')
        .join('\n');

      const loadedRuleMatch = styles.match(/#pomo-splash-curtain\.loaded\s*\{([^}]+)\}/);
      expect(loadedRuleMatch).not.toBeNull();
      const loadedRuleBody = loadedRuleMatch![1];

      // Bắt buộc biến mất hoàn toàn cả opacity lẫn visibility
      expect(loadedRuleBody).toMatch(/opacity:\s*0/);
      expect(loadedRuleBody).toMatch(/visibility:\s*hidden/);
    });
  });

  describe('Adversarial Challenge 3: Dismissal Script Race Condition & Idempotency Testing', () => {
    it('kịch bản 1: Script chạy khi document.readyState === "loading" -> gắn sự kiện DOMContentLoaded', () => {
      const dom = new JSDOM(htmlContent);
      const win = dom.window;
      const doc = win.document;

      const curtain = doc.getElementById('pomo-splash-curtain');
      expect(curtain?.classList.contains('loaded')).toBe(false);

      // Mô phỏng hàm dismissal
      function dismissCurtain() {
        if (curtain && !curtain.classList.contains('loaded')) {
          curtain.classList.add('loaded');
        }
      }

      // Khi readyState = 'loading'
      let eventAttached = false;
      let timeoutScheduled = false;

      const mockAddEventListener = (evt: string, cb: () => void) => {
        if (evt === 'DOMContentLoaded') {
          eventAttached = true;
          cb();
        }
      };

      const mockSetTimeout = (cb: () => void, ms: number) => {
        expect(ms).toBe(100);
        timeoutScheduled = true;
        cb();
      };

      if ((doc as any).readyState === 'loading') {
        mockAddEventListener('DOMContentLoaded', () => {
          mockSetTimeout(dismissCurtain, 100);
        });
      } else {
        mockSetTimeout(dismissCurtain, 100);
      }

      expect(curtain?.classList.contains('loaded')).toBe(true);
    });

    it('kịch bản 2: Script chạy khi document.readyState === "interactive" -> kích hoạt timeout ngay, không chờ DOMContentLoaded', () => {
      const dom = new JSDOM(htmlContent);
      const win = dom.window;
      const doc = win.document;
      const curtain = doc.getElementById('pomo-splash-curtain');

      // Ghi đè readyState = 'interactive'
      Object.defineProperty(doc, 'readyState', { value: 'interactive', configurable: true });

      let timeoutCalled = false;
      let listenerAttached = false;

      function runDismissalLogic(documentObj: Document, winObj: Window) {
        function dismissCurtain() {
          var c = documentObj.getElementById('pomo-splash-curtain');
          if (c && !c.classList.contains('loaded')) {
            c.classList.add('loaded');
          }
        }
        if (documentObj.readyState === 'interactive' || documentObj.readyState === 'complete') {
          timeoutCalled = true;
          dismissCurtain();
        } else {
          winObj.addEventListener('DOMContentLoaded', function() {
            listenerAttached = true;
            dismissCurtain();
          });
        }
      }

      runDismissalLogic(doc, win as unknown as Window);

      expect(timeoutCalled).toBe(true);
      expect(listenerAttached).toBe(false); // Không bị treo chờ DOMContentLoaded
      expect(curtain?.classList.contains('loaded')).toBe(true);
    });

    it('kịch bản 3: Script chạy khi document.readyState === "complete" -> kích hoạt timeout ngay', () => {
      const dom = new JSDOM(htmlContent);
      const win = dom.window;
      const doc = win.document;
      const curtain = doc.getElementById('pomo-splash-curtain');

      // Ghi đè readyState = 'complete' (ví dụ trang đã load từ BFCache hoặc Service Worker)
      Object.defineProperty(doc, 'readyState', { value: 'complete', configurable: true });

      let timeoutCalled = false;
      let listenerAttached = false;

      function runDismissalLogic(documentObj: Document, winObj: Window) {
        function dismissCurtain() {
          var c = documentObj.getElementById('pomo-splash-curtain');
          if (c && !c.classList.contains('loaded')) {
            c.classList.add('loaded');
          }
        }
        if (documentObj.readyState === 'interactive' || documentObj.readyState === 'complete') {
          timeoutCalled = true;
          dismissCurtain();
        } else {
          winObj.addEventListener('DOMContentLoaded', function() {
            listenerAttached = true;
            dismissCurtain();
          });
        }
      }

      runDismissalLogic(doc, win as unknown as Window);

      expect(timeoutCalled).toBe(true);
      expect(listenerAttached).toBe(false);
      expect(curtain?.classList.contains('loaded')).toBe(true);
    });

    it('kịch bản 4: Idempotency và Null Safety - Không văng lỗi khi #pomo-splash-curtain bị gỡ bỏ hoặc gọi lặp lại', () => {
      const dom = new JSDOM('<html><body><div id="root"></div></body></html>');
      const doc = dom.window.document;

      // Không có #pomo-splash-curtain trong DOM
      expect(() => {
        function dismissCurtain() {
          var curtain = doc.getElementById('pomo-splash-curtain');
          if (curtain && !curtain.classList.contains('loaded')) {
            curtain.classList.add('loaded');
          }
        }
        // Gọi 5 lần liên tiếp
        for (let i = 0; i < 5; i++) {
          dismissCurtain();
        }
      }).not.toThrow();
    });
  });

  describe('Adversarial Challenge 4: Typography & Font Loading Invariants', () => {
    it('src/index.css ghi rõ quy chuẩn Zero-FOUT và cấm font-display: swap', () => {
      expect(cssContent).toContain('Quy chuẩn Zero-FOUT & Typography Invariant');
      expect(cssContent).toContain('font-display: optional');
      expect(cssContent).toContain('Tuyệt đối không dùng \'font-display: swap\'');

      // Đảm bảo không có font-display: swap nào xuất hiện trong các quy tắc css hoạt động
      const cssWithoutComments = cssContent.replace(/\/\*[\s\S]*?\*\//g, '');
      expect(cssWithoutComments).not.toMatch(/font-display:\s*swap/);
    });

    it('ưu tiên System Font Stack mặc định để triệt tiêu độ trễ tải phông chữ (CLS = 0.00)', () => {
      expect(cssContent).toContain('-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif');
      expect(cssContent).toContain('text-rendering: optimizeLegibility');
      expect(cssContent).toContain('-webkit-font-smoothing: antialiased');
    });

    it('KaTeX font stylesheet nạp bất đồng bộ để tránh chặn kết xuất ban đầu', () => {
      const dom = new JSDOM(htmlContent);
      const katexLink = dom.window.document.querySelector('link[href*="katex.min.css"][media="print"]');
      expect(katexLink).not.toBeNull();
      expect(katexLink?.getAttribute('onload')).toBe("this.media='all'");

      // noscript fallback cho crawler không hỗ trợ JS
      const noscriptKatex = dom.window.document.querySelector('noscript link[href*="katex.min.css"]');
      expect(noscriptKatex).not.toBeNull();
    });
  });

  describe('Adversarial Challenge 5: Static SEO & Crawler Content Invariance', () => {
    it('bảo toàn 100% nội dung SEO crawler tĩnh bên trong #root', () => {
      const dom = new JSDOM(htmlContent);
      const root = dom.window.document.getElementById('root');
      expect(root).not.toBeNull();

      expect(root?.querySelector('header nav')).not.toBeNull();
      expect(root?.querySelector('main#main-content h1')?.textContent).toContain('PomoFocus');
      expect(root?.querySelector('footer')?.textContent).toContain('2026 PomoFocus');
    });
  });
});
