import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e/auth-avatar', workers: 1, retries: 0, timeout: 90000,
  expect: { timeout: 15000 },
  reporter: [['list'], ['json', { outputFile: 'artifacts/auth-avatar/playwright-results.json' }]],
  outputDir: 'test-results/auth-avatar',
  use: { baseURL: 'http://127.0.0.1:5194', channel: 'chrome', serviceWorkers: 'block', screenshot: 'only-on-failure' },
  webServer: { command: 'npm run preview -- --host 127.0.0.1 --port 5194 --strictPort', url: 'http://127.0.0.1:5194', reuseExistingServer: false, timeout: 120000 }
});
