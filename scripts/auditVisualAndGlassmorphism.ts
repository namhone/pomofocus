import { chromium } from 'playwright';
import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface ImageStatus {
  src: string;
  complete: boolean;
  naturalWidth: number;
  naturalHeight: number;
  visible: boolean;
}

interface GlassComputed {
  backgroundColor: string;
  backdropFilter: string;
  webkitBackdropFilter: string;
  opacity: string;
  zIndex: string;
  borderTopColor: string;
  boxShadow: string;
}

interface ContrastSample {
  widget: string;
  textColor: string;
  bgColor: string;
  backdropFilter: string;
}

async function waitForServer(url: string, timeoutMs = 25000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      // wait
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function runVisualAudit() {
  const outputDir = path.resolve(process.cwd(), 'artifacts/final-audit');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 1. Ensure preview server is up
  let previewProc: ChildProcess | null = null;
  const isServerRunning = await waitForServer('http://localhost:4173', 1000);
  if (!isServerRunning) {
    console.log('[Server] Khởi động vite preview port 4173...');
    previewProc = spawn('npx', ['vite', 'preview', '--port', '4173'], {
      shell: true,
      stdio: 'inherit'
    });
    const ready = await waitForServer('http://localhost:4173', 25000);
    if (!ready) throw new Error('Không thể khởi động preview server trên port 4173.');
  }

  console.log('[Audit] Bắt đầu kiểm toán thực tế qua trình duyệt Chrome...');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });

  const networkImages: { url: string; status: number; ok: boolean }[] = [];

  // ==========================================
  // PHẦN 2: XÁC MINH NỀN ẢNH VÀ GLASSMORPHISM
  // ==========================================
  console.log('\n=== [PHẦN 2] KIỂM TOÁN NỀN ẢNH THỰC TẾ & GLASSMORPHISM ===');
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1
  });
  const page = await desktopContext.newPage();

  page.on('response', (res) => {
    const req = res.request();
    if (['image', 'media'].includes(req.resourceType()) || req.url().includes('unsplash')) {
      networkImages.push({
        url: req.url(),
        status: res.status(),
        ok: res.ok()
      });
    }
  });

  await page.goto('http://localhost:4173', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // 2.1 Kiểm tra ảnh nền mặc định
  console.log('2.1 Đo đạc DOM & Image element của hình nền...');
  const defaultImageStatus: ImageStatus = await page.evaluate(() => {
    const img = document.querySelector('[data-testid="background-image-element"]') as HTMLImageElement;
    const canvas = document.querySelector('[data-testid="background-canvas"]');
    return {
      src: img?.src || '',
      complete: img?.complete || false,
      naturalWidth: img?.naturalWidth || 0,
      naturalHeight: img?.naturalHeight || 0,
      visible: !!canvas && window.getComputedStyle(canvas).display !== 'none'
    };
  });
  console.log('Trạng thái ảnh nền mặc định:', defaultImageStatus);

  // 2.2 Kiểm tra CSS Glassmorphism thực tế của Timer và Tasks
  console.log('2.2 Đo computed styles kính mờ của Timer và Tasks widget...');
  const glassStyles: { timer: GlassComputed; tasks: GlassComputed; canvasZIndex: string } = await page.evaluate(() => {
    const timer = document.querySelector('[data-testid="widget-container-timer"]');
    const tasks = document.querySelector('[data-testid="widget-container-tasks"]');
    const canvas = document.querySelector('[data-testid="background-canvas"]');

    const getComputed = (el: Element | null): GlassComputed => {
      if (!el) return {} as GlassComputed;
      const s = window.getComputedStyle(el);
      return {
        backgroundColor: s.backgroundColor,
        backdropFilter: s.backdropFilter || (s as any).webkitBackdropFilter || 'none',
        webkitBackdropFilter: (s as any).webkitBackdropFilter || s.backdropFilter || 'none',
        opacity: s.opacity,
        zIndex: s.zIndex,
        borderTopColor: s.borderTopColor,
        boxShadow: s.boxShadow
      };
    };

    return {
      timer: getComputed(timer),
      tasks: getComputed(tasks),
      canvasZIndex: canvas ? window.getComputedStyle(canvas).zIndex : 'auto'
    };
  });
  console.log('CSS Kính mờ Timer:', glassStyles.timer);
  console.log('CSS Kính mờ Tasks:', glassStyles.tasks);
  console.log('Canvas z-index (phải ở dưới widget):', glassStyles.canvasZIndex);

  // Chụp ảnh 01: Desktop mặc định nền tối
  const darkBgShot = path.join(outputDir, '01-desktop-dark-deep-space.png');
  await page.screenshot({ path: darkBgShot });
  console.log(`Đã chụp ảnh 01 (Nền tối): ${darkBgShot}`);

  // 2.3 Đổi sang nền khác (Cozy Lofi Room) và reload để kiểm tra persistence
  console.log('\n2.3 Đổi preset nền sang "Cozy Lofi Room" và kiểm tra lưu sau reload...');
  await page.getByTestId('dock-btn-spaces').click();
  await page.waitForTimeout(500);
  await page.getByTestId('preset-card-cozy-lofi-room').click();
  await page.waitForTimeout(2000);

  const presetBeforeReload = await page.evaluate(() => {
    const store = (window as any).useBackgroundStore?.getState();
    return store?.activePresetId;
  });

  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const presetAfterReload = await page.evaluate(() => {
    const store = (window as any).useBackgroundStore?.getState();
    const rawLocal = localStorage.getItem('pomodoro_workspace_background_v1');
    const parsed = rawLocal ? JSON.parse(rawLocal) : null;
    return {
      storePresetId: store?.activePresetId,
      localStoragePresetId: parsed?.activePresetId
    };
  });
  console.log(`Đổi preset: trước reload = "${presetBeforeReload}", sau reload = "${presetAfterReload.storePresetId}"`);
  const persistencePass = presetAfterReload.storePresetId === 'cozy-lofi-room' && presetAfterReload.localStoragePresetId === 'cozy-lofi-room';

  const cozyShot = path.join(outputDir, '02-desktop-preset-cozy-lofi.png');
  await page.screenshot({ path: cozyShot });
  console.log(`Đã chụp ảnh 02 (Cozy Lofi): ${cozyShot}`);

  // 2.4 Đổi sang nền sáng (Minimal Studio hoặc Sunny Beach) và kiểm tra khả năng đọc chữ
  console.log('\n2.4 Thử nghiệm nền sáng (Minimal Studio) và kiểm tra tương phản...');
  await page.getByTestId('dock-btn-spaces').click();
  await page.waitForTimeout(500);
  await page.getByTestId('preset-card-minimal-aesthetic').click();
  await page.waitForTimeout(2000);

  const brightSamples: ContrastSample[] = await page.evaluate(() => {
    const timerTitle = document.querySelector('[data-testid="widget-container-timer"] h2');
    const timerDigit = document.querySelector('[data-testid="timer-display"]');
    const tasksTitle = document.querySelector('[data-testid="widget-container-tasks"] h2');
    const getStyle = (el: Element | null, name: string) => {
      const s = el ? window.getComputedStyle(el) : null;
      return {
        widget: name,
        textColor: s?.color || '',
        bgColor: s?.backgroundColor || '',
        backdropFilter: s?.backdropFilter || ''
      };
    };
    return [
      getStyle(timerTitle, 'Timer Title'),
      getStyle(timerDigit, 'Timer Display'),
      getStyle(tasksTitle, 'Tasks Title')
    ];
  });
  console.log('Mẫu tương phản trên nền sáng:', brightSamples);

  const brightBgShot = path.join(outputDir, '03-desktop-bright-minimal-aesthetic.png');
  await page.screenshot({ path: brightBgShot });
  console.log(`Đã chụp ảnh 03 (Nền sáng): ${brightBgShot}`);

  // 2.5 Kiểm tra 3 Preset Kính (Clear, Balanced, High Contrast)
  console.log('\n2.5 Thử nghiệm 3 Preset Kính: Clear Glass, Balanced, High Contrast...');
  await page.getByTestId('dock-btn-presets').click();
  await page.waitForTimeout(400);

  // Preset 1: Clear Glass
  await page.getByTestId('glass-preset-clear').click();
  await page.waitForTimeout(600);
  const clearShot = path.join(outputDir, '04-glass-preset-clear.png');
  await page.screenshot({ path: clearShot });

  // Preset 2: Balanced
  await page.getByTestId('glass-preset-balanced').click();
  await page.waitForTimeout(600);
  const balancedShot = path.join(outputDir, '05-glass-preset-balanced.png');
  await page.screenshot({ path: balancedShot });

  // Preset 3: High Contrast
  await page.getByTestId('glass-preset-high-contrast').click();
  await page.waitForTimeout(600);
  const highContrastShot = path.join(outputDir, '06-glass-preset-high-contrast.png');
  await page.screenshot({ path: highContrastShot });

  // Đặt lại nền và kính về mặc định
  await page.getByTestId('glass-preset-balanced').click();
  await page.waitForTimeout(300);
  await desktopContext.close();

  // ==========================================
  // PHẦN 3: XÁC MINH RESPONSIVE TRÊN 5 VIEWPORT
  // ==========================================
  console.log('\n=== [PHẦN 3] KIỂM TOÁN RESPONSIVE TRÊN 5 VIEWPORT CHUẨN ===');
  const viewportsToTest = [
    { name: '1365x768-laptop', width: 1365, height: 768, isMobile: false },
    { name: '1024x768-compact', width: 1024, height: 768, isMobile: false },
    { name: '768x1024-tablet', width: 768, height: 1024, isMobile: true },
    { name: '390x844-mobile', width: 390, height: 844, isMobile: true },
    { name: '320x568-narrow', width: 320, height: 568, isMobile: true }
  ];

  const responsiveMetrics: any[] = [];

  for (const vp of viewportsToTest) {
    console.log(`\n-> Đo Viewport: ${vp.name} (${vp.width}x${vp.height})`);
    const vpContext = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1
    });
    const vpPage = await vpContext.newPage();

    await vpPage.goto('http://localhost:4173', { waitUntil: 'networkidle' });
    await vpPage.waitForTimeout(800);

    const vpData = await vpPage.evaluate((isNarrow) => {
      const scrollWidth = document.documentElement.scrollWidth;
      const clientWidth = document.documentElement.clientWidth;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;

      const timerEl = document.querySelector('[data-testid="widget-container-timer"]');
      const tasksEl = document.querySelector('[data-testid="widget-container-tasks"]');
      const dockEl = document.querySelector('[role="toolbar"]') || document.querySelector('[data-testid="mobile-bottom-nav"]');

      const timerRect = timerEl ? timerEl.getBoundingClientRect() : null;
      const tasksRect = tasksEl ? tasksEl.getBoundingClientRect() : null;
      const dockRect = dockEl ? dockEl.getBoundingClientRect() : null;

      // Kiểm tra xem timer và tasks có bị che phủ hoặc chồng khít hoàn toàn không
      let isOverlapping = false;
      if (timerRect && tasksRect && !isNarrow) {
        // Trên màn hình desktop floating windows, chúng không nên có cùng tọa độ hoàn toàn
        isOverlapping = Math.abs(timerRect.left - tasksRect.left) < 5 && Math.abs(timerRect.top - tasksRect.top) < 5;
      }

      return {
        scrollWidth,
        clientWidth,
        scrollHeight,
        clientHeight,
        noHorizontalOverflow: scrollWidth <= clientWidth,
        timerRect,
        tasksRect,
        dockRect,
        isOverlapping,
        hasDockOrNav: !!dockEl
      };
    }, vp.isMobile);

    // Thử cuộn đối với màn hình di động
    let scrollSuccess = false;
    if (vp.isMobile) {
      await vpPage.mouse.wheel(0, 500);
      await vpPage.waitForTimeout(500);
      const afterScrollY = await vpPage.evaluate(() => window.scrollY);
      scrollSuccess = afterScrollY > 0;
      console.log(`   Kiểm tra cuộn di động: scrollY sau khi cuộn = ${afterScrollY}px (Thành công: ${scrollSuccess})`);
    }

    const shotPath = path.join(outputDir, `07-viewport-${vp.name}.png`);
    await vpPage.screenshot({ path: shotPath, fullPage: vp.isMobile });
    console.log(`   Đã lưu ảnh viewport: ${shotPath}`);

    responsiveMetrics.push({
      ...vp,
      ...vpData,
      scrollSuccess,
      screenshot: shotPath
    });

    await vpContext.close();
  }

  await browser.close();
  if (previewProc) previewProc.kill();

  // Ghi báo cáo JSON
  const summaryReport = {
    auditTimestamp: new Date().toISOString(),
    imageVerification: {
      defaultImageStatus,
      persistencePass,
      presetBeforeReload,
      presetAfterReload,
      networkImagesSample: networkImages.slice(0, 10)
    },
    glassmorphismVerification: {
      glassStyles,
      brightContrastSamples: brightSamples
    },
    responsiveMetrics
  };

  fs.writeFileSync(
    path.join(outputDir, 'visual-and-glass-metrics.json'),
    JSON.stringify(summaryReport, null, 2)
  );

  console.log('\n=== HOÀN TẤT KIỂM TOÁN THỰC TẾ & GLASSMORPHISM THÀNH CÔNG ===');
  console.log('Tất cả bằng chứng đã được ghi nhận tại:', outputDir);
}

runVisualAudit().catch((err) => {
  console.error('Lỗi trong quá trình kiểm toán trực quan:', err);
  process.exit(1);
});
