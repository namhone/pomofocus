import { chromium } from 'playwright';

const BASE_URL = 'https://pomodoro-workspace-three.vercel.app';

async function auditProduction() {
  console.log(`\n============================================================`);
  console.log(`POMOFOCUS PRODUCTION FULL HEALTH CHECK: ${BASE_URL}`);
  console.log(`============================================================\n`);

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const results = {
    webVitalsDesktop: {},
    webVitalsMobile: {},
    routesCheck: [],
    seoAudit: {},
    pwaAudit: {},
    errorsDetected: []
  };

  // 1. Desktop Performance & Core Web Vitals
  console.log(`[1/4] Đo lường Web Vitals trên Desktop...`);
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const desktopPage = await desktopContext.newPage();

  desktopPage.on('pageerror', (err) => {
    results.errorsDetected.push(`[Desktop PageError] ${err.message}`);
  });

  const desktopStart = Date.now();
  await desktopPage.goto(BASE_URL, { waitUntil: 'networkidle' });
  const desktopLoadDuration = Date.now() - desktopStart;

  const desktopMetrics = await desktopPage.evaluate(() => {
    const navTiming = performance.getEntriesByType('navigation')[0];
    const paintEntries = performance.getEntriesByType('paint');
    const fcp = paintEntries.find((p) => p.name === 'first-contentful-paint')?.startTime || 0;
    
    return {
      ttfb: navTiming ? Math.round(navTiming.responseStart - navTiming.requestStart) : 0,
      domInteractive: navTiming ? Math.round(navTiming.domInteractive) : 0,
      domContentLoaded: navTiming ? Math.round(navTiming.domContentLoadedEventEnd) : 0,
      loadComplete: navTiming ? Math.round(navTiming.loadEventEnd) : 0,
      fcp: Math.round(fcp)
    };
  });
  results.webVitalsDesktop = { ...desktopMetrics, totalLoadDuration: desktopLoadDuration };
  console.log(`   -> Desktop FCP: ${desktopMetrics.fcp}ms, TTFB: ${desktopMetrics.ttfb}ms, Load: ${desktopLoadDuration}ms`);

  // 2. Mobile Performance & Core Web Vitals (iPhone 14 / Pixel simulation)
  console.log(`[2/4] Đo lường Web Vitals trên Mobile (Viewport 390x844)...`);
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
  });
  const mobilePage = await mobileContext.newPage();

  mobilePage.on('pageerror', (err) => {
    results.errorsDetected.push(`[Mobile PageError] ${err.message}`);
  });

  const mobileStart = Date.now();
  await mobilePage.goto(BASE_URL, { waitUntil: 'networkidle' });
  const mobileLoadDuration = Date.now() - mobileStart;

  const mobileMetrics = await mobilePage.evaluate(() => {
    const navTiming = performance.getEntriesByType('navigation')[0];
    const paintEntries = performance.getEntriesByType('paint');
    const fcp = paintEntries.find((p) => p.name === 'first-contentful-paint')?.startTime || 0;
    
    return {
      ttfb: navTiming ? Math.round(navTiming.responseStart - navTiming.requestStart) : 0,
      domInteractive: navTiming ? Math.round(navTiming.domInteractive) : 0,
      domContentLoaded: navTiming ? Math.round(navTiming.domContentLoadedEventEnd) : 0,
      loadComplete: navTiming ? Math.round(navTiming.loadEventEnd) : 0,
      fcp: Math.round(fcp)
    };
  });
  results.webVitalsMobile = { ...mobileMetrics, totalLoadDuration: mobileLoadDuration };
  console.log(`   -> Mobile FCP: ${mobileMetrics.fcp}ms, TTFB: ${mobileMetrics.ttfb}ms, Load: ${mobileLoadDuration}ms`);

  // 3. SEO & OpenGraph / Social Meta Audit
  console.log(`[3/4] Kiểm tra Thẻ Meta SEO & Social OpenGraph...`);
  const seoData = await desktopPage.evaluate(() => {
    const getMeta = (nameOrProp) => {
      const el = document.querySelector(`meta[name="${nameOrProp}"], meta[property="${nameOrProp}"]`);
      return el ? el.getAttribute('content') : null;
    };
    return {
      title: document.title,
      description: getMeta('description'),
      ogTitle: getMeta('og:title'),
      ogDescription: getMeta('og:description'),
      ogImage: getMeta('og:image'),
      ogUrl: getMeta('og:url'),
      twitterCard: getMeta('twitter:card'),
      canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') || null,
      favicon: document.querySelector('link[rel="icon"]')?.getAttribute('href') || null,
      manifest: document.querySelector('link[rel="manifest"]')?.getAttribute('href') || null,
    };
  });
  results.seoAudit = seoData;
  console.log(`   -> Title: "${seoData.title}"`);
  console.log(`   -> Description: ${seoData.description ? 'Có (' + seoData.description.length + ' ký tự)' : 'THIẾU'}`);
  console.log(`   -> OG Title: ${seoData.ogTitle || 'THIẾU'}`);
  console.log(`   -> OG Image: ${seoData.ogImage || 'THIẾU'}`);
  console.log(`   -> Twitter Card: ${seoData.twitterCard || 'THIẾU'}`);

  // 4. Route Health & Placeholder/Mock Detection Across 9 Key Pages
  console.log(`[4/4] Quét 9 tuyến đường Routes trên Production...`);
  const routesToTest = [
    { path: '/', name: 'Landing Page' },
    { path: '/app', name: 'Workspace Pomodoro' },
    { path: '/rooms', name: 'Sảnh Phòng Học Meet' },
    { path: '/billing', name: 'Bảng Giá & Gói Dịch Vụ' },
    { path: '/calendar', name: 'Lịch Biểu Time-Blocking' },
    { path: '/dashboard', name: 'Thống Kê Năng Suất (Dashboard)' },
    { path: '/help', name: 'Trung Tâm Trợ Giúp & FAQ' },
    { path: '/contact', name: 'Liên Hệ Hỗ Trợ' },
    { path: '/privacy-data', name: 'Quản Lý & Sao Lưu Dữ Liệu' }
  ];

  for (const r of routesToTest) {
    const pageUrl = `${BASE_URL}${r.path}`;
    const pageErrors = [];
    desktopPage.on('pageerror', (e) => pageErrors.push(e.message));

    const t0 = Date.now();
    const res = await desktopPage.goto(pageUrl, { waitUntil: 'networkidle', timeout: 20000 }).catch(e => e);
    const duration = Date.now() - t0;
    const status = res?.status ? res.status() : (res instanceof Error ? 500 : 200);

    const title = await desktopPage.title().catch(() => '');
    const bodyText = await desktopPage.innerText('body').catch(() => '');
    
    // Kiểm tra có chứa từ khóa placeholder "lorem ipsum", "mock", "dummy"
    const hasMockKeywords = /lorem ipsum|todo: implement|dummy data|placeholder session/i.test(bodyText);

    results.routesCheck.push({
      path: r.path,
      name: r.name,
      status,
      durationMs: duration,
      title,
      hasMockKeywords,
      pageErrors
    });

    console.log(`   -> [${status}] ${r.path} (${r.name}): ${duration}ms, Mock data: ${hasMockKeywords ? 'PHÁT HIỆN' : 'Không có'}`);
  }

  // PWA Service Worker Status
  const swRegistered = await desktopPage.evaluate(async () => {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      return regs.length > 0;
    }
    return false;
  });
  results.pwaAudit.serviceWorkerActive = swRegistered;
  console.log(`   -> PWA Service Worker đăng ký: ${swRegistered ? 'Hoạt động' : 'Chưa kích hoạt'}`);

  await browser.close();

  console.log(`\n============================================================`);
  console.log(`KẾT QUẢ TỔNG HỢP:`);
  console.log(JSON.stringify(results, null, 2));
  console.log(`============================================================\n`);
}

auditProduction().catch((err) => {
  console.error('Audit execution error:', err);
  process.exit(1);
});
