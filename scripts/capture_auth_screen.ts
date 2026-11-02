import { chromium } from 'playwright';

async function captureAuth() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto('https://pomofocus-workspace.vercel.app/login');
  await page.waitForSelector('[data-testid="btn-founder-quick-login"]', { timeout: 15000 });
  await page.screenshot({ path: 'C:/Users/Nam/.gemini/antigravity/brain/f0e4fa42-ea0b-4ff3-83da-6875921843c2/proof-auth-3-options.png' });
  console.log('✅ Chụp ảnh thành công: proof-auth-3-options.png');
  await browser.close();
}

captureAuth();
