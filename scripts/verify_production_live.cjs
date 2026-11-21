const { chromium } = require('playwright');

async function main() {
  const targetUrl = process.argv[2] || 'https://pomofocus-workplace.vercel.app';
  console.log(`=== LIVE PRODUCTION VERIFICATION (${targetUrl}) ===`);
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  const networkLog = {
    topupCreateOrderCalls: [],
    topupVietQrImageRequests: []
  };

  page.on('request', (req) => {
    const url = req.url();
    if (url.includes('/api/payment/create-order')) {
      networkLog.topupCreateOrderCalls.push({ url, time: Date.now() });
      console.log(`[PROD NET] create-order requested (${networkLog.topupCreateOrderCalls.length})`);
    } else if (url.includes('vietqr.app/img')) {
      networkLog.topupVietQrImageRequests.push({ url, time: Date.now() });
      console.log(`[PROD NET] VietQR image requested (${networkLog.topupVietQrImageRequests.length}): ${url}`);
    }
  });

  const mockUser = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'learner.test@pomofocus.workspace',
    displayName: 'Học Viên Pro',
    plan: 'free',
    role: 'user',
    credits: 50,
    authProvider: 'email',
    createdAt: Date.now()
  };

  await page.addInitScript((profile) => {
    localStorage.setItem('pomodoro_study_auth_session', JSON.stringify(profile));
    localStorage.setItem('sb_auth_session', JSON.stringify({
      access_token: 'sb_session_token',
      user: {
        id: profile.id,
        email: profile.email,
        user_metadata: { full_name: profile.displayName }
      },
      profile
    }));
    localStorage.removeItem('pomofocus_pending_credit_order_' + profile.id);
  }, mockUser);

  console.log(`1. Loading ${targetUrl} ...`);
  await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForFunction(() => Boolean(window.useAiStore && window.useAuthStore), { timeout: 15000 });

  console.log('2. Opening AiCreditsTopupModal with 50 credits...');
  await page.evaluate(() => {
    window.useAiStore.getState().openTopupModal(50);
  });

  await page.waitForSelector('[data-testid="ai-credits-topup-modal"]', { timeout: 10000 });
  await page.waitForSelector('[data-testid="ai-vietqr-image"]', { timeout: 10000 });

  const initialMemo = await page.evaluate(() => {
    const btn = document.querySelector('[data-testid="ai-copy-memo-btn"]');
    return btn ? btn.innerText.trim() : '';
  });
  console.log(`   Initial Memo: "${initialMemo}"`);

  console.log('3. Holding idle on Production for 5 seconds...');
  const memos = [];
  for (let i = 0; i < 5; i++) {
    await page.waitForTimeout(1000);
    const m = await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="ai-copy-memo-btn"]');
      const timer = document.querySelector('[data-testid="ai-order-countdown"]');
      return { memo: btn ? btn.innerText.trim() : '', timer: timer ? timer.innerText.trim() : '' };
    });
    memos.push(m.memo);
    process.stdout.write(`   [T+${i + 1}s] Timer: ${m.timer} | Memo: ${m.memo} | create-order: ${networkLog.topupCreateOrderCalls.length}\r`);
  }
  console.log('\n');

  const stable = memos.every((m) => m === memos[0] && m.length > 0 && !m.includes('Đang tạo'));
  console.log(`[PROD CHECK] Memo remains 100% frozen on Production: ${stable ? 'PASSED ✓' : 'FAILED ✗'}`);
  console.log(`[PROD CHECK] create-order calls on Production: ${networkLog.topupCreateOrderCalls.length} (Expected: <= 1)`);

  await browser.close();

  if (!stable || networkLog.topupCreateOrderCalls.length > 1) {
    console.error('LIVE PROD FAILED!');
    process.exit(1);
  }
  console.log('LIVE PROD VERIFICATION 100% PASSED!');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
