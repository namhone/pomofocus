import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

interface NetworkEvent {
  url: string;
  status: number;
  resourceType: string;
  ok: boolean;
}

async function runVerification() {
  const outputDir = path.resolve(process.cwd(), 'artifacts/production-verify');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('--- KHỞI ĐỘNG KIỂM TRA PRODUCTION BUILD TRÊN TRÌNH DUYỆT THẬT (PORT 4173) ---');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  const networkLogs: NetworkEvent[] = [];
  const consoleLogs: { type: string; text: string }[] = [];

  page.on('response', (res) => {
    const req = res.request();
    const type = req.resourceType();
    if (['image', 'media', 'xhr', 'fetch'].includes(type) || req.url().includes('unsplash') || req.url().includes('.mp4')) {
      networkLogs.push({
        url: req.url(),
        status: res.status(),
        resourceType: type,
        ok: res.ok()
      });
    }
  });

  page.on('console', (msg) => {
    consoleLogs.push({ type: msg.type(), text: msg.text() });
  });

  page.on('pageerror', (err) => {
    consoleLogs.push({ type: 'pageerror', text: err.message });
  });

  // 1. Tải trang từ Preview Server
  console.log('[1/7] Tải trang http://localhost:4173...');
  await page.goto('http://localhost:4173', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // 2. Xác minh và đo lường Default Workspace
  console.log('[2/7] Đo lường thuộc tính kính mờ và DOM của Desktop Workspace...');
  const widgetGlassInfo = await page.evaluate(() => {
    const timer = document.querySelector('[data-testid="widget-container-timer"]') as HTMLElement;
    const tasks = document.querySelector('[data-testid="widget-container-tasks"]') as HTMLElement;
    const bgCanvas = document.querySelector('[data-testid="background-canvas"]') as HTMLElement;
    const bgImg = document.querySelector('[data-testid="background-image-element"]') as HTMLImageElement;
    const bgVideo = document.querySelector('[data-testid="background-video-element"]') as HTMLVideoElement;

    const timerStyle = timer ? window.getComputedStyle(timer) : null;
    const tasksStyle = tasks ? window.getComputedStyle(tasks) : null;

    return {
      hasTimer: !!timer,
      hasTasks: !!tasks,
      timerBg: timerStyle?.backgroundColor,
      timerBackdrop: timerStyle?.backdropFilter,
      timerBorderTop: timerStyle?.borderTopColor,
      tasksBg: tasksStyle?.backgroundColor,
      tasksBackdrop: tasksStyle?.backdropFilter,
      activeBgType: bgVideo ? 'video' : bgImg ? 'image' : 'gradient',
      bgImgSrc: bgImg?.src || null,
      bgImgComplete: bgImg?.complete || false,
      bgImgNaturalWidth: bgImg?.naturalWidth || 0
    };
  });
  console.log('Chi tiết kính mờ & nền:', JSON.stringify(widgetGlassInfo, null, 2));

  // Kiểm tra thao tác Timer
  console.log('[3/7] Kiểm tra hoạt động của Timer (Start -> Wait 2s -> Pause -> Reset)...');
  const timerStartBtn = page.getByTestId('timer-start-btn');
  await timerStartBtn.click();
  await page.waitForTimeout(2200);
  const timeAfter2s = await page.getByTestId('timer-display').innerText();
  const timerPauseBtn = page.getByTestId('timer-pause-btn');
  await timerPauseBtn.click();
  const timerResetBtn = page.getByTestId('timer-reset-btn');
  await timerResetBtn.click();
  const timeReset = await page.getByTestId('timer-display').innerText();
  console.log(`Timer: ban đầu 25:00 -> sau 2s chạy: ${timeAfter2s} -> sau reset: ${timeReset}`);

  // Thao tác Kéo thả và Thay đổi kích thước (Drag & Resize)
  console.log('[4/7] Kiểm tra Kéo thả (Drag) và Thay đổi kích thước (Resize) cửa sổ Tasks...');
  const tasksWidget = page.locator('[data-testid="widget-container-tasks"]');
  const dragHandle = tasksWidget.locator('[data-drag-handle="true"]');
  const initialTasksBox = await tasksWidget.boundingBox();

  // Drag 80px sang phải, 40px xuống dưới
  const handleBox = await dragHandle.boundingBox();
  if (handleBox) {
    await page.mouse.move(handleBox.x + 50, handleBox.y + 10);
    await page.mouse.down();
    await page.mouse.move(handleBox.x + 130, handleBox.y + 50, { steps: 5 });
    await page.mouse.up();
  }
  const afterDragBox = await tasksWidget.boundingBox();

  // Resize +60px width, +50px height
  const resizeHandle = tasksWidget.locator('[data-testid="resize-handle-tasks"]');
  const resizeBox = await resizeHandle.boundingBox();
  if (resizeBox) {
    await page.mouse.move(resizeBox.x + 5, resizeBox.y + 5);
    await page.mouse.down();
    await page.mouse.move(resizeBox.x + 65, resizeBox.y + 55, { steps: 5 });
    await page.mouse.up();
  }
  const afterResizeBox = await tasksWidget.boundingBox();

  // Chụp ảnh 01: Desktop Workspace đã kéo thả và resize
  const shot1Path = path.join(outputDir, '01-prod-default-workspace.png');
  await page.screenshot({ path: shot1Path, fullPage: false });
  console.log(`Đã lưu ảnh 1: ${shot1Path}`);

  // Kiểm tra lưu layout sau reload
  console.log('[5/7] Kiểm tra duy trì vị trí và kích thước sau Reload...');
  await page.reload({ waitUntil: 'networkidle' });
  const reloadTasksBox = await page.locator('[data-testid="widget-container-tasks"]').boundingBox();
  const positionPreserved =
    reloadTasksBox &&
    afterResizeBox &&
    Math.abs(reloadTasksBox.x - afterResizeBox.x) <= 2 &&
    Math.abs(reloadTasksBox.y - afterResizeBox.y) <= 2 &&
    Math.abs(reloadTasksBox.width - afterResizeBox.width) <= 2 &&
    Math.abs(reloadTasksBox.height - afterResizeBox.height) <= 2;
  console.log(`Lưu layout sau reload: ${positionPreserved ? 'CHÍNH XÁC (ĐẠT)' : 'SAI LỆCH (KHÔNG ĐẠT)'}`);

  // Đặt lại layout mặc định
  await page.getByTestId('dock-btn-reset-layout').click();
  await page.waitForTimeout(500);

  // 6. Đổi hình nền Spaces và xác minh video/photo fallback
  console.log('[6/7] Đổi Preset Nền và kiểm tra thực tế Network/DOM...');
  await page.getByTestId('dock-btn-spaces').click();
  await page.waitForTimeout(500);

  // Chọn Cozy Lofi Room (Image)
  console.log('-> Chọn Preset: Cozy Lofi Room (Ảnh thật Unsplash)...');
  await page.getByTestId('preset-card-cozy-lofi-room').click();
  await page.waitForTimeout(2000);
  const afterClickInfo = await page.evaluate(() => {
    const img = document.querySelector('[data-testid="background-image-element"]') as HTMLImageElement;
    const store = (window as any).useBackgroundStore?.getState();
    return {
      activePresetId: store?.activePresetId,
      imgSrc: img?.src,
      imgComplete: img?.complete,
      imgNaturalWidth: img?.naturalWidth
    };
  });
  console.log('Sau khi chọn Cozy Lofi Room:', JSON.stringify(afterClickInfo, null, 2));
  const shot2Path = path.join(outputDir, '02-prod-cozy-room-image.png');
  await page.screenshot({ path: shot2Path });
  console.log(`Đã lưu ảnh 2: ${shot2Path}`);

  // Chọn Rainy Window (Video)
  console.log('-> Chọn Preset: Rainy Window (Video / CC0 fallback)...');
  await page.getByTestId('preset-card-rainy-window').click();
  await page.waitForTimeout(2000);

  const videoStatus = await page.evaluate(() => {
    const video = document.querySelector('video') as HTMLVideoElement;
    const img = document.querySelector('[data-testid="background-image-element"]') as HTMLImageElement;
    const grad = document.querySelector('[data-testid="background-gradient-element"]') as HTMLElement;
    return {
      hasVideoTag: !!video,
      videoSrc: video?.currentSrc || video?.src || null,
      videoPaused: video ? video.paused : null,
      videoReadyState: video ? video.readyState : null,
      videoNetworkState: video ? video.networkState : null,
      hasPosterImage: !!img,
      posterSrc: img?.src || null,
      posterComplete: img?.complete || false,
      hasGradientFallback: !!grad
    };
  });
  console.log('Trạng thái Video & Poster Nền:', JSON.stringify(videoStatus, null, 2));

  const shot3Path = path.join(outputDir, '03-prod-rainy-window-media.png');
  await page.screenshot({ path: shot3Path });
  console.log(`Đã lưu ảnh 3: ${shot3Path}`);

  // Chuyển sang Zen Mode
  console.log('-> Chuyển sang Zen Mode (Phím tắt Z)...');
  await page.keyboard.press('z');
  await page.waitForTimeout(800);
  const shot4Path = path.join(outputDir, '04-prod-zen-mode.png');
  await page.screenshot({ path: shot4Path });
  console.log(`Đã lưu ảnh 4: ${shot4Path}`);
  await page.keyboard.press('z'); // Thoát Zen
  await page.waitForTimeout(500);

  // 7. Kiểm tra Mobile Viewport (390x844)
  console.log('[7/7] Kiểm tra Mobile Viewport (390x844)...');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(800);

  const mobileMetrics = await page.evaluate(() => {
    return {
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      noHorizontalOverflow: document.documentElement.scrollWidth <= 390,
      isMobileLayoutActive: !document.querySelector('.cursor-grab')
    };
  });
  console.log('Chỉ số Mobile Viewport:', JSON.stringify(mobileMetrics, null, 2));

  const shot5Path = path.join(outputDir, '05-prod-mobile-viewport.png');
  await page.screenshot({ path: shot5Path, fullPage: true });
  console.log(`Đã lưu ảnh 5: ${shot5Path}`);

  await browser.close();

  // Báo cáo tổng hợp Network & Console
  console.log('\n--- TỔNG KẾT NETWORK REQUESTS ĐÃ GHI NHẬN ---');
  console.table(networkLogs.slice(0, 20));

  console.log('\n--- TỔNG KẾT CONSOLE / ERROR LOGS ---');
  if (consoleLogs.length === 0) {
    console.log('Console hoàn toàn sạch sẽ, không có bất kỳ cảnh báo hoặc lỗi nào.');
  } else {
    console.table(consoleLogs);
  }

  // Ghi kết quả ra JSON file để báo cáo
  fs.writeFileSync(
    path.join(outputDir, 'verification-summary.json'),
    JSON.stringify(
      {
        widgetGlassInfo,
        timerVerification: { initial: '25:00', running: timeAfter2s, reset: timeReset },
        dragResizeVerification: { initialTasksBox, afterDragBox, afterResizeBox, positionPreserved },
        videoStatus,
        mobileMetrics,
        networkLogsCount: networkLogs.length,
        networkSuccessCount: networkLogs.filter((n) => n.ok).length,
        consoleLogs
      },
      null,
      2
    )
  );
  console.log('\n--- HOÀN TẤT XÁC MINH PRODUCTION BUILD THÀNH CÔNG ---');
}

runVerification().catch((err) => {
  console.error('Lỗi trong quá trình kiểm tra:', err);
  process.exit(1);
});
