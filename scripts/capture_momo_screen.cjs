const { chromium } = require('playwright');
const path = require('path');

const ARTIFACTS_DIR = 'C:\\Users\\Nam\\.gemini\\antigravity\\brain\\f0e4fa42-ea0b-4ff3-83da-6875921843c2';
const BASE_URL = 'http://localhost:4173';

async function captureMoMo() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await page.goto(`${BASE_URL}/billing`, { waitUntil: 'load' });
  await page.waitForTimeout(600);

  // Bấm nút mở MoMo modal
  const momoBtn = page.getByTestId('btn-pay-momo');
  if (await momoBtn.isVisible()) {
    await momoBtn.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'audit-after-momo-qr-modal.png') });
    console.log('Saved audit-after-momo-qr-modal.png');
  }

  await browser.close();
}

captureMoMo().catch(console.error);
