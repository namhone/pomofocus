import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('WCAG 2.1 AA Accessibility & Talos Compliance Specification', () => {
  it('1. Icon-Only Buttons have valid accessible names (aria-label)', () => {
    // PlatformHeader.tsx
    const headerPath = path.resolve('src/components/PlatformHeader.tsx');
    const headerContent = fs.readFileSync(headerPath, 'utf8');
    expect(headerContent).toContain('data-testid="capsule-avatar-btn"');
    expect(headerContent).toContain('aria-label="Tài khoản và Menu"');
    expect(headerContent).toContain('data-testid="capsule-credits-btn"');
    expect(headerContent).toContain('aria-label="Số dư AI Credits"');

    // TimerTestInterface.tsx
    const timerPath = path.resolve('src/components/TimerTestInterface.tsx');
    const timerContent = fs.readFileSync(timerPath, 'utf8');
    expect(timerContent).toContain('data-testid="timer-start-btn"');
    expect(timerContent).toContain('aria-label="Bắt đầu phiên tập trung"');
    expect(timerContent).toContain('data-testid="timer-pause-btn"');
    expect(timerContent).toContain('aria-label="Tạm dừng phiên tập trung"');
    expect(timerContent).toContain('data-testid="timer-resume-btn"');
    expect(timerContent).toContain('aria-label="Tiếp tục phiên tập trung"');
    expect(timerContent).toContain('data-testid="timer-reset-btn"');
    expect(timerContent).toContain('aria-label="Đặt lại hiệp này"');
    expect(timerContent).toContain('data-testid="timer-skip-btn"');
    expect(timerContent).toContain('aria-label="Bỏ qua hiệp này"');

    // AiCompanionWidget.tsx
    const aiPath = path.resolve('src/components/AiCompanionWidget.tsx');
    const aiContent = fs.readFileSync(aiPath, 'utf8');
    expect(aiContent).toContain('data-testid="ai-clear-chat-btn"');
    expect(aiContent).toContain('aria-label="Làm mới cuộc trò chuyện"');
    expect(aiContent).toContain('data-testid="ai-close-drawer-btn ai-btn-close-drawer"');
    expect(aiContent).toContain('aria-label="Đóng cửa sổ"');
    expect(aiContent).toContain('data-testid="ai-submit-btn"');
    expect(aiContent).toContain('aria-label="Gửi câu hỏi"');
    expect(aiContent).toContain('data-testid="ai-attach-file-btn"');
    expect(aiContent).toContain('aria-label="Đính kèm đề cương / tài liệu ôn tập"');

    // SharedFooter.tsx & ContactView.tsx
    const footerPath = path.resolve('src/components/SharedFooter.tsx');
    const footerContent = fs.readFileSync(footerPath, 'utf8');
    expect(footerContent).toContain('aria-label="Sao chép vào bộ nhớ tạm"');

    const contactPath = path.resolve('src/components/ContactView.tsx');
    const contactContent = fs.readFileSync(contactPath, 'utf8');
    expect(contactContent).toContain('aria-label="Sao chép vào bộ nhớ tạm"');

    // MobileBottomNav.tsx
    const mobileNavPath = path.resolve('src/components/MobileBottomNav.tsx');
    const mobileNavContent = fs.readFileSync(mobileNavPath, 'utf8');
    expect(mobileNavContent).toContain('aria-label="Đồng hồ Pomodoro tập trung"');
    expect(mobileNavContent).toContain('aria-label="Danh sách công việc"');
    expect(mobileNavContent).toContain('aria-label="Thư viện âm thanh và không gian nền"');
    expect(mobileNavContent).toContain('aria-label="Trợ lý AI Companion"');
    expect(mobileNavContent).toContain('aria-label="Menu mở rộng"');
  });

  it('2. Accordion FAQs and Dropdowns properly manage aria-expanded and semantic states', () => {
    // LandingPage.tsx FAQ
    const landingPath = path.resolve('src/components/LandingPage.tsx');
    const landingContent = fs.readFileSync(landingPath, 'utf8');
    expect(landingContent).toContain('aria-expanded={isOpen}');

    // HelpView.tsx FAQ
    const helpPath = path.resolve('src/components/HelpView.tsx');
    const helpContent = fs.readFileSync(helpPath, 'utf8');
    expect(helpContent).toContain('aria-expanded={openFaq === idx}');

    // PlatformHeader.tsx Dropdown
    const headerPath = path.resolve('src/components/PlatformHeader.tsx');
    const headerContent = fs.readFileSync(headerPath, 'utf8');
    expect(headerContent).toContain('aria-expanded={isUserDropdownOpen}');
    expect(headerContent).toContain('aria-haspopup="menu"');
  });

  it('3. High-Tech Emerald Focus Rings are configured in index.css for WCAG keyboard navigation', () => {
    const cssPath = path.resolve('src/index.css');
    const cssContent = fs.readFileSync(cssPath, 'utf8');
    expect(cssContent).toContain('.focus-ring');
    expect(cssContent).toContain('focus-visible:ring-emerald-400/80');
    expect(cssContent).toContain('button:focus-visible');
    expect(cssContent).toContain('rgba(52, 211, 153, 0.8)');
  });

  it('4. Text contrast in LandingPage and BillingView complies with WCAG AA (text-zinc-400/300 over zinc-500)', () => {
    const landingPath = path.resolve('src/components/LandingPage.tsx');
    const landingContent = fs.readFileSync(landingPath, 'utf8');
    expect(landingContent).toContain('text-[11px] sm:text-xs text-zinc-400 font-mono');
    expect(landingContent).toContain('text-xs font-normal text-zinc-400');
    expect(landingContent).not.toContain('text-zinc-500');

    const billingPath = path.resolve('src/components/BillingView.tsx');
    const billingContent = fs.readFileSync(billingPath, 'utf8');
    expect(billingContent).toContain('<span className="text-zinc-400 text-xs font-medium">Cục bộ</span>');
    expect(billingContent).toContain('<div className="text-[11px] text-zinc-400">Chủ Sở Hữu Thẻ</div>');
    expect(billingContent).toContain('<span className="text-xs text-zinc-400">/ một lần duy nhất</span>');
  });

  it('5. Google PageSpeed Static Files: robots.txt, sitemap.xml, llms.txt, ai-catalog.json exist and are valid', () => {
    // public/robots.txt
    const robotsPath = path.resolve('public/robots.txt');
    expect(fs.existsSync(robotsPath)).toBe(true);
    const robotsContent = fs.readFileSync(robotsPath, 'utf8');
    expect(robotsContent).toContain('User-agent: *');
    expect(robotsContent).toContain('Allow: /');
    expect(robotsContent).toContain('Disallow: /account/');
    expect(robotsContent).toContain('Disallow: /api/');
    expect(robotsContent).toContain('Sitemap: https://pomofocus-workspace.vercel.app/sitemap.xml');

    // public/sitemap.xml
    const sitemapPath = path.resolve('public/sitemap.xml');
    expect(fs.existsSync(sitemapPath)).toBe(true);
    const sitemapContent = fs.readFileSync(sitemapPath, 'utf8');
    expect(sitemapContent).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(sitemapContent).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');

    // public/llms.txt
    const llmsPath = path.resolve('public/llms.txt');
    expect(fs.existsSync(llmsPath)).toBe(true);
    const llmsContent = fs.readFileSync(llmsPath, 'utf8');
    expect(llmsContent.startsWith('# PomoFocus Workspace')).toBe(true);

    // public/ai-catalog.json
    const aiCatalogPath = path.resolve('public/ai-catalog.json');
    expect(fs.existsSync(aiCatalogPath)).toBe(true);
    const aiCatalogContent = fs.readFileSync(aiCatalogPath, 'utf8');
    const parsed = JSON.parse(aiCatalogContent);
    expect(parsed.name).toBe('PomoFocus Workspace');

    // vercel.json rewrites exclude static files
    const vercelPath = path.resolve('vercel.json');
    const vercelContent = fs.readFileSync(vercelPath, 'utf8');
    const vercelJson = JSON.parse(vercelContent);
    const rewriteSource = vercelJson.rewrites[0].source;
    expect(rewriteSource).toContain('robots\\.txt');
    expect(rewriteSource).toContain('sitemap\\.xml');
    expect(rewriteSource).toContain('llms\\.txt');
    expect(rewriteSource).toContain('ai-catalog\\.json');
  });

  it('6. Accessibility Landmarks: LandingPage includes semantic <main id="main-content">', () => {
    const landingPath = path.resolve('src/components/LandingPage.tsx');
    const landingContent = fs.readFileSync(landingPath, 'utf8');
    expect(landingContent).toContain('<main id="main-content"');
    expect(landingContent).toContain('</main>');
  });

  it('7. Best Practices: Deprecated unload event listener is completely eliminated', () => {
    const timerStorePath = path.resolve('src/stores/useTimerStore.ts');
    const timerStoreContent = fs.readFileSync(timerStorePath, 'utf8');
    expect(timerStoreContent).not.toContain("addEventListener('unload'");
    expect(timerStoreContent).not.toContain('addEventListener("unload"');
    expect(timerStoreContent).toContain("addEventListener('pagehide', cleanupTab)");
    expect(timerStoreContent).toContain("addEventListener('beforeunload', cleanupTab)");
  });

  it('8. KaTeX CSS is preconnected and non-render-blocking in index.html', () => {
    const indexPath = path.resolve('index.html');
    const indexContent = fs.readFileSync(indexPath, 'utf8');
    expect(indexContent).toContain('<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin />');
    expect(indexContent).toContain('<link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />');
    expect(indexContent).toContain('media="print"');
    expect(indexContent).toContain("onload=\"this.media='all'\"");
  });
});
