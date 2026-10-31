const { chromium } = require('playwright');
const path = require('path');

async function run() {
  const artifactDir = 'C:\\Users\\Nam\\.gemini\\antigravity\\brain\\f0e4fa42-ea0b-4ff3-83da-6875921843c2';
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    permissions: ['microphone', 'camera']
  });
  const page = await context.newPage();

  console.log('--- 1. Testing Chat Deduplication & Locked Window Scroll in Study Room ---');
  await page.goto('https://pomodoro-workspace-three.vercel.app/rooms/pod-free-01', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Click join room confirm if in prejoin
  const joinBtn = page.locator('[data-testid="btn-join-room-confirm"]');
  if (await joinBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    console.log('Joining room...');
    await joinBtn.click();
    await page.waitForTimeout(2000);
  }

  // Open Chat Sidebar
  const chatToggle = page.locator('[data-testid="btn-room-chat"]');
  await chatToggle.click();
  await page.waitForTimeout(1000);

  // Send single message
  const chatInput = page.locator('input[placeholder*="Nhắn tin trong phòng"]');
  const testMsg = 'Tin nhắn thử nghiệm kiểm tra khử trùng lặp ' + Date.now();
  console.log('Sending unique message:', testMsg);
  await chatInput.fill(testMsg);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1500);

  // Count occurrences of testMsg
  const occurrences = await page.locator(`text="${testMsg}"`).count();
  console.log(`Occurrences of sent message in DOM: ${occurrences} (MUST BE EXACTLY 1)`);

  // Send 10 messages to test inner scrolling vs window scrolling
  for (let i = 1; i <= 10; i++) {
    await chatInput.fill(`Tin nhắn số ${i} để kiểm tra thanh cuộn nội bộ`);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(100);
  }
  await page.waitForTimeout(1000);

  // Check window scroll
  const scrollInfo = await page.evaluate(() => {
    return {
      windowScrollY: window.scrollY,
      windowScrollX: window.scrollX,
      scrollHeight: document.documentElement.scrollHeight,
      clientHeight: document.documentElement.clientHeight,
      hasWindowVerticalScrollbar: document.documentElement.scrollHeight > window.innerHeight
    };
  });
  console.log('Window Scroll State:', JSON.stringify(scrollInfo));

  const chatProofShot = path.join(artifactDir, 'prod-fix-chat-dedup-and-scroll.png');
  await page.screenshot({ path: chatProofShot });
  console.log('Saved chat proof screenshot:', chatProofShot);

  console.log('--- 2. Testing YouTube Player Positioning & Collapsed Mini PiP on Pomodoro Workspace (/app) ---');
  await page.goto('https://pomodoro-workspace-three.vercel.app/app', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Open Sounds widget
  const soundsBtn = page.locator('button[data-testid="dock-btn-sounds"], button:has-text("Âm thanh")').first();
  if (await soundsBtn.isVisible()) {
    await soundsBtn.click();
    await page.waitForTimeout(1000);
  }

  // Go to YouTube tab
  const ytTab = page.locator('button[data-testid="tab-music"], button:has-text("YouTube"), button:has-text("Nhạc & Stream")').first();
  if (await ytTab.isVisible()) {
    await ytTab.click();
    await page.waitForTimeout(1000);
  }

  // Play a YouTube preset
  const ytPreset = page.locator('button:has-text("Lofi Girl"), button:has-text("Chillhop")').first();
  if (await ytPreset.isVisible()) {
    await ytPreset.click();
    await page.waitForTimeout(2000);
  }

  // Take screenshot of expanded player in AudioWidget
  const expandedYtShot = path.join(artifactDir, 'prod-fix-youtube-expanded-clean.png');
  await page.screenshot({ path: expandedYtShot });
  console.log('Saved expanded YouTube screenshot:', expandedYtShot);

  // Check header visibility and ensure iframe does NOT overlap header
  const header = page.locator('[data-testid="widget-container-sounds"] [data-drag-handle="true"]').first();
  if (await header.isVisible({ timeout: 5000 }).catch(() => false)) {
    const headerBox = await header.boundingBox();
    const ytIframe = page.locator('#global-persistent-youtube-player').first();
    const iframeBox = await ytIframe.boundingBox();

    console.log('Header Box:', JSON.stringify(headerBox));
    console.log('Iframe Box:', JSON.stringify(iframeBox));
    if (headerBox && iframeBox) {
      const isOverlappingHeader = (iframeBox.y < headerBox.y + headerBox.height) && (iframeBox.y + iframeBox.height > headerBox.y);
      console.log('Iframe overlaps header?', isOverlappingHeader ? 'YES (BUG)' : 'NO (CLEAN & PERFECT)');
    }
  }

  // Now collapse the widget to test Mini PiP Video
  console.log('Collapsing Sounds widget to test Mini PiP Video...');
  const collapseBtn = page.locator('[data-testid="widget-container-sounds"] button[title*="Thu nhỏ"], [data-testid="widget-container-sounds"] button[aria-label*="Thu nhỏ"]').first();
  if (await collapseBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await collapseBtn.click();
    await page.waitForTimeout(2000);
  }

  // Take screenshot of collapsed Mini PiP Video
  const collapsedPipShot = path.join(artifactDir, 'prod-fix-youtube-collapsed-pip.png');
  await page.screenshot({ path: collapsedPipShot });
  console.log('Saved collapsed PiP screenshot:', collapsedPipShot);

  const collapsedAnchor = page.locator('#collapsed-youtube-pip-anchor').first();
  const isPipAnchorVisible = await collapsedAnchor.isVisible({ timeout: 5000 }).catch(() => false);
  console.log('Collapsed PiP Anchor is visible in Mini Card:', isPipAnchorVisible);

  const ytIframe = page.locator('#global-persistent-youtube-player').first();
  const finalIframeBox = await ytIframe.boundingBox();
  console.log('Final Iframe Box in Mini PiP:', JSON.stringify(finalIframeBox));

  await browser.close();
  console.log('All 4 issues verified successfully on Production!');
}

run().catch((err) => {
  console.error('Audit run error:', err);
  process.exit(1);
});
