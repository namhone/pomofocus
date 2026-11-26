import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e/liquid-glass', fullyParallel: true, forbidOnly: !!process.env.CI,
  workers: 1, retries: 0, timeout: 90000, expect: { timeout: 15000 },
  reporter: [['list'], ['json', { outputFile: 'artifacts/liquid-glass/playwright-results.json' }]],
  outputDir: 'test-results/liquid-glass',
  use: { baseURL: 'http://127.0.0.1:5198', channel: 'chrome', serviceWorkers: 'block', screenshot: 'only-on-failure' },
  projects: [
    { name: 'desktop-1366', use: { viewport: { width: 1366, height: 768 } } },
    { name: 'desktop-1440', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'mobile-390', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    { name: 'native-390', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } }
  ],
  webServer: { command: 'npm run preview -- --host 127.0.0.1 --port 5198 --strictPort', url: 'http://127.0.0.1:5198', reuseExistingServer: false, timeout: 120000 }
});
