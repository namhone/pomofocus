const { chromium } = require('playwright');
const path = require('path');

async function capture() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // iPhone 12/13/14
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:5173/app ...');
  await page.goto('http://localhost:5173/app', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1500);

  const artifactDir = 'C:\\Users\\Nam\\.gemini\\antigravity\\brain\\f0e4fa42-ea0b-4ff3-83da-6875921843c2';

  // 1. Screenshot showing the new 4-column MobileBottomNav with icon on top, text below
  const imgBottomNav = path.join(artifactDir, 'proof-mobile-bottom-nav-4cols.png');
  await page.screenshot({ path: imgBottomNav, fullPage: false });
  console.log('Saved proof-mobile-bottom-nav-4cols.png');

  // Verify bottom nav buttons exist and are visible
  const bottomNav = page.locator('[data-testid="mobile-bottom-navigation"]');
  await bottomNav.waitFor({ state: 'visible', timeout: 5000 });
  const bottomNavBox = await bottomNav.boundingBox();
  console.log('Bottom Nav Box:', bottomNavBox);

  // 2. Click the hamburger menu to trigger the Slide-down Dropdown from top-14
  console.log('Clicking hamburger menu...');
  const menuBtn = page.locator('#header-mobile-menu-btn');
  await menuBtn.waitFor({ state: 'visible', timeout: 5000 });
  await menuBtn.click();

  // Wait for slide-down animation
  await page.waitForTimeout(600);

  // Verify slide-down menu is visible
  const slidedownMenu = page.locator('#mobile-slidedown-menu');
  await slidedownMenu.waitFor({ state: 'visible', timeout: 5000 });
  const slidedownBox = await slidedownMenu.boundingBox();
  console.log('Slide-down Dropdown Box:', slidedownBox);

  const imgDropdown = path.join(artifactDir, 'proof-mobile-slidedown-dropdown.png');
  await page.screenshot({ path: imgDropdown, fullPage: false });
  console.log('Saved proof-mobile-slidedown-dropdown.png');

  await browser.close();
  console.log('All screenshots captured successfully!');
}

capture().catch((err) => {
  console.error('Error during capture:', err);
  process.exit(1);
});
