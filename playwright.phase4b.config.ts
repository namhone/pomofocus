import { defineConfig } from '@playwright/test';
const android = 'Mozilla/5.0 (Linux; Android 15; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
export default defineConfig({
  testDir: './tests/e2e/phase4b', fullyParallel: true, forbidOnly: !!process.env.CI, retries: 0, workers: 1,
  timeout: 120000, expect: { timeout: 15000 },
  reporter: [['list'], ['json', { outputFile: 'artifacts/phase4b/playwright-results.json' }]],
  outputDir: 'test-results/phase4b',
  use: { baseURL: 'http://127.0.0.1:5194', channel: 'chrome', trace: 'retain-on-failure', screenshot: 'only-on-failure',
    launchOptions: { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] }, permissions: ['camera', 'microphone'], serviceWorkers: 'block' },
  projects: [
    { name: 'desktop-1366', use: { viewport: { width: 1366, height: 768 } } },
    { name: 'desktop-1440', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'mobile-390', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, userAgent: android } },
    { name: 'native-390', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, userAgent: android } }
  ],
  webServer: { command: 'npm run preview -- --host 127.0.0.1 --port 5194 --strictPort', url: 'http://127.0.0.1:5194', reuseExistingServer: false, timeout: 120000 }
});
