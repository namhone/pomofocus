const { chromium } = require('playwright');
const path = require('path');

async function capture() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // iPhone 12/13/14 viewport
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:5173/app ...');
  await page.goto('http://localhost:5173/app', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1500);

  const artifactDir = 'C:\\Users\\Nam\\.gemini\\antigravity\\brain\\f0e4fa42-ea0b-4ff3-83da-6875921843c2';

  // 1. Initial mobile view: separate login pill & hamburger icon
  const imgInitial = path.join(artifactDir, 'proof-mobile-header-split-login.png');
  await page.screenshot({ path: imgInitial, fullPage: false });
  console.log('Saved proof-mobile-header-split-login.png');

  // 2. Click Hamburger Menu
  console.log('Clicking hamburger menu...');
  const menuBtn = page.locator('#header-mobile-menu-btn');
  await menuBtn.waitFor({ state: 'visible', timeout: 5000 });
  await menuBtn.click();

  // Wait for full-screen fade-in transition
  await page.waitForTimeout(500);

  // Verify that the full-screen overlay is visible
  const overlay = page.locator('#mobile-fullscreen-menu');
  await overlay.waitFor({ state: 'visible', timeout: 5000 });

  // Verify bounding box covers full screen 390x844
  const box = await overlay.boundingBox();
  console.log('Overlay dimensions:', box);

  const imgOverlay = path.join(artifactDir, 'proof-mobile-fullscreen-overlay.png');
  await page.screenshot({ path: imgOverlay, fullPage: false });
  console.log('Saved proof-mobile-fullscreen-overlay.png');

  // 3. Test closing the overlay
  console.log('Clicking close button...');
  const closeBtn = page.locator('#mobile-menu-close-btn');
  await closeBtn.click();
  await page.waitForTimeout(400);

  const imgClosed = path.join(artifactDir, 'proof-mobile-fullscreen-closed.png');
  await page.screenshot({ path: imgClosed, fullPage: false });
  console.log('Saved proof-mobile-fullscreen-closed.png');

  await browser.close();
  console.log('All full-screen mobile menu tests passed successfully!');
}

capture().catch((err) => {
  console.error('Error during capture:', err);
  process.exit(1);
});
