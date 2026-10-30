import { chromium, devices } from 'playwright';
import fs from 'fs';
import path from 'path';
import { CATALOG_CATEGORIES, queryCatalog } from '../src/data/backgroundCatalog.js';

const REMOTE_URL = 'https://revenues-organizations-cult-somehow.trycloudflare.com';

async function diagnose() {
  console.log('=== GIAI ĐOẠN 1: BÁO CÁO KIỂM TRA & TÁI HIỆN LỖI THỰC TẾ ===\n');

  // 1. Phân tích Catalog 700+
  console.log('--- 1. Kiểm kê Catalog 700+ Background ---');
  const allCatalog = queryCatalog({ page: 1, pageSize: 1000 });
  const totalItems = allCatalog.total;
  const uniqueUrls = new Set(allCatalog.items.map(i => i.url.split('?')[0]));
  const uniqueThumbnails = new Set(allCatalog.items.map(i => i.thumbnailUrl.split('?')[0]));
  
  console.log(`Tổng số items trong Catalog: ${totalItems}`);
  console.log(`Số ảnh gốc độc nhất thực sự (dựa trên Unsplash Image ID): ${uniqueUrls.size}`);
  console.log(`Tỷ lệ lặp lại: ${(totalItems / uniqueUrls.size).toFixed(1)} lần/ảnh!`);
  
  // Kiểm tra video trong catalog
  const videoInCatalog = allCatalog.items.filter(i => (i).category === 'video' || (i).url.endsWith('.mp4'));
  console.log(`Số lượng video/ảnh động trong Catalog 700+: ${videoInCatalog.length}`);

  // 2. Tái hiện lỗi trên giao diện qua Playwright (Chrome)
  const browser = await chromium.launch({
    headless: true,
    channel: 'chrome'
  });

  const diagnosisResults = {
    catalogAnalysis: {
      totalItems,
      uniqueImageCount: uniqueUrls.size,
      duplicateFactor: (totalItems / uniqueUrls.size).toFixed(1),
      videoCountInCatalog: videoInCatalog.length
    },
    pomodoroCoordinates: {},
    mobileMenuIssues: []
  };

  try {
    // 2.1. Kiểm tra vị trí cửa sổ Pomodoro trên các kích thước Desktop & Laptop
    console.log('\n--- 2. Tọa độ Cửa sổ Pomodoro trên Desktop / Laptop ---');
    const viewports = [
      { name: 'FullHD_1920x1080', width: 1920, height: 1080 },
      { name: 'MacBook_1440x900', width: 1440, height: 900 },
      { name: 'Laptop_1365x768', width: 1365, height: 768 },
      { name: 'iPad_Landscape_1024x768', width: 1024, height: 768 }
    ];

    for (const vp of viewports) {
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const page = await ctx.newPage();
      await page.goto(REMOTE_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(600);

      const timer = page.getByTestId('widget-container-timer');
      const box = await timer.boundingBox();
      const isMobileClass = await page.evaluate(() => window.innerWidth < 1100);

      console.log(`Viewport ${vp.name} (${vp.width}x${vp.height}):`);
      console.log(`  - isMobile Mode: ${isMobileClass}`);
      if (box) {
        console.log(`  - Timer X: ${box.x}px, Y: ${box.y}px, Width: ${box.width}px`);
        console.log(`  - Khoảng cách lề trái: ${box.x}px / Khoảng cách lề phải: ${vp.width - (box.x + box.width)}px`);
        const isSkewedLeft = box.x < 50 && (vp.width - (box.x + box.width)) > 400;
        console.log(`  - Đánh giá lệch trái nghiêm trọng: ${isSkewedLeft ? 'CÓ (LỆCH TRÁI RÕ RỆT)' : 'KHÔNG'}`);
        diagnosisResults.pomodoroCoordinates[vp.name] = {
          x: box.x,
          y: box.y,
          width: box.width,
          rightMargin: vp.width - (box.x + box.width),
          isSkewedLeft
        };
      }
      await ctx.close();
    }

    // 2.2. Kiểm tra hiện tượng Mobile Menu nhảy loạn xạ
    console.log('\n--- 3. Tái hiện lỗi Menu Mobile & DockBar ---');
    const pixel5 = devices['Pixel 5'];
    const mobileCtx = await browser.newContext({
      ...pixel5,
      isMobile: true,
      hasTouch: true
    });
    const mobilePage = await mobileCtx.newPage();

    let tabChanges = [];
    await mobilePage.exposeFunction('onTabChangeLogged', (tab) => {
      tabChanges.push({ tab, time: Date.now() });
    });

    await mobilePage.goto(REMOTE_URL, { waitUntil: 'networkidle' });
    await mobilePage.waitForTimeout(800);

    // Kiểm tra bottom nav có bị chớp nháy hoặc nhảy khi click không
    const nav = mobilePage.getByTestId('mobile-bottom-navigation');
    const initialNavBox = await nav.boundingBox();
    console.log(`Mobile Nav ban đầu: Y = ${initialNavBox?.y}, Height = ${initialNavBox?.height}`);

    // Bấm tab "Nền" (spaces)
    console.log('Clicking "Nền" tab on mobile bottom nav...');
    const spacesBtn = mobilePage.getByTestId('dock-btn-spaces');
    await spacesBtn.click();
    await mobilePage.waitForTimeout(500);

    // Cuộn trang xem IntersectionObserver có ép tab đổi không
    console.log('Simulating swipe scroll on mobile...');
    const cdp = await mobilePage.context().newCDPSession(mobilePage);
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: 200, y: 500 }]
    });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: 200, y: 200 }]
    });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: []
    });
    await mobilePage.waitForTimeout(600);

    const activeTab = await mobilePage.evaluate(() => {
      const activeEl = document.querySelector('[data-testid="mobile-bottom-navigation"] [aria-current="page"]');
      return activeEl?.getAttribute('aria-label') || 'none';
    });
    console.log(`Active Tab sau khi cuộn nhẹ: ${activeTab} (Nếu người dùng vừa chọn Nền mà bị nhảy về Timer/Tasks thì đây chính là lỗi menu nhảy)`);

    // Kiểm tra cài đặt và tính năng thêm nhạc bằng link
    console.log('\n--- 4. Kiểm tra Chức năng Thêm Nhạc bằng Link ---');
    const audioTabBtn = mobilePage.getByTestId('dock-btn-sounds');
    await audioTabBtn.click();
    await mobilePage.waitForTimeout(500);

    const audioContent = await mobilePage.content();
    const hasDirectMusicInput = audioContent.includes('input-custom-music') || audioContent.includes('Nhập URL nhạc');
    const hasYouTubeStreamOnly = audioContent.includes('input-youtube-stream-url');
    console.log(`Có input nhạc trực tiếp: ${hasDirectMusicInput}`);
    console.log(`Chỉ có nhúng YouTube Lofi Stream ẩn: ${hasYouTubeStreamOnly}`);

    await mobileCtx.close();
  } catch (err) {
    console.error('Lỗi tái hiện:', err);
  } finally {
    await browser.close();
  }

  console.log('\n=== KẾT THÚC CHẨN ĐOÁN GIAI ĐOẠN 1 ===');
}

diagnose();
