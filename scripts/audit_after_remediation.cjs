const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACTS_DIR = 'C:\\Users\\Nam\\.gemini\\antigravity\\brain\\f0e4fa42-ea0b-4ff3-83da-6875921843c2';
const BASE_URL = 'http://localhost:4173';

async function runAfterAudit() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const auditResults = {
    viewports: {},
    timings: {},
    consoleErrors: [],
    networkRequests: { total: 0, byType: {} }
  };

  async function auditRoute(routeName, routePath, viewports) {
    for (const vp of viewports) {
      const context = await browser.newContext({
        viewport: { width: vp.w, height: vp.h },
        deviceScaleFactor: 1
      });
      const page = await context.newPage();

      const consoleMessages = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleMessages.push(msg.text());
        }
      });

      const requests = [];
      page.on('request', (req) => {
        requests.push({ url: req.url(), resourceType: req.resourceType() });
      });

      const start = Date.now();
      await page.goto(`${BASE_URL}${routePath}`, { waitUntil: 'load' });
      const loadTime = Date.now() - start;

      // Allow layout stabilization and lazy components
      await page.waitForTimeout(600);

      // Performance timing API
      const perfTiming = await page.evaluate(() => {
        const perf = window.performance.getEntriesByType('navigation')[0];
        if (!perf) return null;
        return {
          dns: Math.round(perf.domainLookupEnd - perf.domainLookupStart),
          ttfb: Math.round(perf.responseStart - perf.requestStart),
          domContentLoaded: Math.round(perf.domContentLoadedEventEnd - perf.startTime),
          load: Math.round(perf.loadEventEnd - perf.startTime)
        };
      });

      // Save screenshot
      const vpName = `${vp.w}x${vp.h}`;
      const screenshotName = `audit-after-${vpName}-${routeName}.png`;
      const screenshotPath = path.join(ARTIFACTS_DIR, screenshotName);
      await page.screenshot({ path: screenshotPath });
      console.log(`Saved screenshot: ${screenshotName}`);

      if (!auditResults.timings[routeName]) auditResults.timings[routeName] = {};
      auditResults.timings[routeName][vpName] = {
        loadTimeMs: loadTime,
        perfTiming,
        requestsCount: requests.length,
        consoleErrors: consoleMessages
      };

      await context.close();
    }
  }

  const standardViewports = [
    { w: 1440, h: 900, name: 'Desktop' },
    { w: 1366, h: 768, name: 'Laptop' },
    { w: 768, h: 1024, name: 'Tablet' },
    { w: 375, h: 667, name: 'Mobile' }
  ];

  console.log('Auditing Workspace (/app)...');
  await auditRoute('workspace', '/app', standardViewports);

  console.log('Auditing Landing (/landing)...');
  await auditRoute('landing', '/landing', standardViewports);

  console.log('Auditing Billing (/billing)...');
  await auditRoute('billing', '/billing', standardViewports);

  console.log('Auditing Calendar (/calendar)...');
  await auditRoute('calendar', '/calendar', standardViewports);

  fs.writeFileSync(
    path.join(ARTIFACTS_DIR, 'audit_after_results.json'),
    JSON.stringify(auditResults, null, 2)
  );
  console.log('Saved audit_after_results.json successfully.');

  await browser.close();
}

runAfterAudit().catch((err) => {
  console.error('Audit failed:', err);
  process.exit(1);
});
