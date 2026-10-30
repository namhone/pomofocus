const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACTS_DIR = 'C:\\Users\\Nam\\.gemini\\antigravity\\brain\\f0e4fa42-ea0b-4ff3-83da-6875921843c2';
const BASE_URL = 'http://localhost:4173';

async function runAudit() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const auditResults = {
    viewports: {},
    timings: {},
    consoleErrors: [],
    networkRequests: { total: 0, byType: {} },
    billingFlow: {}
  };

  // Helper to test cold load and capture screenshots
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

      // Wait a moment for layout stabilization
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
      const screenshotName = `audit-before-${vpName}-${routeName}.png`;
      await page.screenshot({ path: path.join(ARTIFACTS_DIR, screenshotName) });

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

  // Test Upgrade Button Flow from multiple locations
  console.log('Testing Upgrade buttons flow...');
  const testContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const testPage = await testContext.newPage();

  // Test 1: Upgrade button in PlatformHeader on /app
  await testPage.goto(`${BASE_URL}/app`, { waitUntil: 'load' });
  const upgradeHeaderBtn = testPage.locator('header button:has-text("Nâng cấp PRO")');
  const hasUpgradeInHeader = await upgradeHeaderBtn.isVisible();
  let navigatedFromHeader = false;
  if (hasUpgradeInHeader) {
    await upgradeHeaderBtn.click();
    await testPage.waitForTimeout(500);
    navigatedFromHeader = testPage.url().includes('/billing');
  }

  // Test 2: Upgrade button on /landing
  await testPage.goto(`${BASE_URL}/landing`, { waitUntil: 'load' });
  const upgradeLandingBtn = testPage.locator('button:has-text("Nâng Cấp PRO Ngay")');
  const hasUpgradeOnLanding = await upgradeLandingBtn.isVisible();
  let navigatedFromLanding = false;
  if (hasUpgradeOnLanding) {
    await upgradeLandingBtn.click();
    await testPage.waitForTimeout(500);
    navigatedFromLanding = testPage.url().includes('/billing');
  }

  auditResults.billingFlow = {
    hasUpgradeInHeader,
    navigatedFromHeader,
    hasUpgradeOnLanding,
    navigatedFromLanding
  };

  await testContext.close();
  await browser.close();

  fs.writeFileSync(
    path.join(ARTIFACTS_DIR, 'audit_before_results.json'),
    JSON.stringify(auditResults, null, 2)
  );
  console.log('Audit completed and saved to audit_before_results.json!');
}

runAudit().catch((err) => {
  console.error('Audit failed:', err);
  process.exit(1);
});
