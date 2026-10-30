import { chromium, devices } from 'playwright';
import fs from 'fs';
import path from 'path';

const REMOTE_URL = 'https://revenues-organizations-cult-somehow.trycloudflare.com';
const LOCAL_URL = 'http://localhost:4173';
const EVIDENCE_DIR = path.resolve('artifacts', 'investigation-evidence');

if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

async function investigate() {
  console.log('=== BẮT ĐẦU ĐIỀU TRA ĐỘC LẬP & TÁI HIỆN LỖI THỰC TẾ ===');

  const browser = await chromium.launch({
    headless: true,
    channel: 'chrome',
  });

  const findings = {
    buildVerification: {},
    desktop1920: {},
    desktop1440: {},
    desktop1366: {},
    mobileNavigation: {},
    spacesCatalog: {},
    videoBackground: {},
    audioAndMusicTab: {},
    timerPersistence: {},
    consoleErrors: [],
    networkFailures: []
  };

  try {
    // -------------------------------------------------------------------------
    // 1. KIỂM TRA PHIÊN BẢN CODE & BUILD HASH TỪ URL REMOTE
    // -------------------------------------------------------------------------
    console.log('\n[1] Kiểm tra phiên bản Remote Preview...');
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();
    
    page1.on('console', msg => {
      if (msg.type() === 'error') {
        findings.consoleErrors.push({ page: 'desktop', text: msg.text() });
      }
    });
    page1.on('requestfailed', req => {
      findings.networkFailures.push({ url: req.url(), error: req.failure()?.errorText });
    });

    const res = await page1.goto(REMOTE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    const htmlContent = await res.text();
    const scriptSrcMatch = htmlContent.match(/src="(\/assets\/index-[^"]+\.js)"/);
    const cssHrefMatch = htmlContent.match(/href="(\/assets\/index-[^"]+\.css)"/);
    
    findings.buildVerification = {
      httpStatus: res.status(),
      activeScriptBundle: scriptSrcMatch ? scriptSrcMatch[1] : 'NOT_FOUND',
      activeCssBundle: cssHrefMatch ? cssHrefMatch[1] : 'NOT_FOUND',
      matchesDiskBuild: scriptSrcMatch && scriptSrcMatch[1].includes('index-Cnoj10GF.js')
    };
    console.log('Build Verification:', findings.buildVerification);

    // -------------------------------------------------------------------------
    // 2. ĐO ĐẠC TỌA ĐỘ WINDOW MANAGER TRÊN 3 VIEWPORT DESKTOP (1920, 1440, 1366)
    // -------------------------------------------------------------------------
    console.log('\n[2] Kiểm tra tọa độ Pomodoro trên 1920x1080, 1440x900, 1366x768...');
    
    // Viewport 1920x1080
    await page1.setViewportSize({ width: 1920, height: 1080 });
    await page1.evaluate(() => localStorage.clear());
    await page1.reload({ waitUntil: 'networkidle' });
    await page1.waitForTimeout(1000);
    
    const timer1920 = await page1.locator('[data-testid="widget-container-timer"]').boundingBox();
    const tasks1920 = await page1.locator('[data-testid="widget-container-tasks"]').boundingBox();
    findings.desktop1920 = {
      viewport: '1920x1080',
      timerBox: timer1920,
      tasksBox: tasks1920,
      isTimerCentered: timer1920 ? (timer1920.x > 300 && timer1920.x < 400) : false,
      isTimerStuckAt24: timer1920?.x === 24
    };
    await page1.screenshot({ path: path.join(EVIDENCE_DIR, '01-desktop-1920-layout.png') });

    // Viewport 1440x900
    await page1.setViewportSize({ width: 1440, height: 900 });
    await page1.evaluate(() => localStorage.clear());
    await page1.reload({ waitUntil: 'networkidle' });
    await page1.waitForTimeout(1000);

    const timer1440 = await page1.locator('[data-testid="widget-container-timer"]').boundingBox();
    const tasks1440 = await page1.locator('[data-testid="widget-container-tasks"]').boundingBox();
    findings.desktop1440 = {
      viewport: '1440x900',
      timerBox: timer1440,
      tasksBox: tasks1440,
      isTimerCentered: timer1440 ? (timer1440.x > 80 && timer1440.x < 150) : false,
      isTimerStuckAt24: timer1440?.x === 24
    };
    await page1.screenshot({ path: path.join(EVIDENCE_DIR, '02-desktop-1440-layout.png') });

    // Viewport 1366x768
    await page1.setViewportSize({ width: 1366, height: 768 });
    await page1.evaluate(() => localStorage.clear());
    await page1.reload({ waitUntil: 'networkidle' });
    await page1.waitForTimeout(1000);

    const timer1366 = await page1.locator('[data-testid="widget-container-timer"]').boundingBox();
    findings.desktop1366 = {
      viewport: '1366x768',
      timerBox: timer1366,
      isTimerCentered: timer1366 ? (timer1366.x > 50 && timer1366.x < 100) : false,
      isTimerStuckAt24: timer1366?.x === 24
    };
    await page1.screenshot({ path: path.join(EVIDENCE_DIR, '03-desktop-1366-layout.png') });

    // -------------------------------------------------------------------------
    // 3. THƯ VIỆN BỐ CỤC & TÍNH NĂNG TÁI LẬP (SPACES & VIDEO BACKGROUND)
    // -------------------------------------------------------------------------
    console.log('\n[3] Kiểm tra Spaces Widget, Catalog ảnh & Video Background...');
    await page1.getByTestId('dock-btn-spaces').click();
    await page1.waitForTimeout(600);

    // Kiểm tra số lượng ảnh và tính độc nhất
    const catalogAnalysis = await page1.evaluate(() => {
      // Đọc trực tiếp catalog từ window nếu có hoặc qua DOM
      const cards = document.querySelectorAll('[data-testid^="preset-card-"]');
      const cardIds = Array.from(cards).map(c => c.getAttribute('data-testid'));
      const widgetText = document.querySelector('[data-testid="spaces-widget"]')?.textContent || '';
      return {
        cardCount: cards.length,
        cardIdsSample: cardIds.slice(0, 10),
        hasUniqueNotice: widgetText.includes('Tuyển Chọn') || widgetText.includes('110+'),
        hasParticlesButton: widgetText.includes('Hiệu ứng & Hạt') || Boolean(document.querySelector('button:has-text("Hiệu ứng")'))
      };
    });
    findings.spacesCatalog = catalogAnalysis;

    // Chuyển sang Preset Video (rainy-window hoặc oceans-wave)
    const videoFilterBtn = page1.getByTestId('filter-cat-video');
    if (await videoFilterBtn.isVisible()) {
      await videoFilterBtn.click();
      await page1.waitForTimeout(500);
      
      const rainyCard = page1.getByTestId('preset-card-rainy-window');
      if (await rainyCard.isVisible()) {
        await rainyCard.click();
        await page1.waitForTimeout(1500);
      }
    }

    const videoState = await page1.evaluate(() => {
      const vid = document.querySelector('video');
      return vid ? {
        hasVideoTag: true,
        src: vid.src || vid.currentSrc,
        paused: vid.paused,
        readyState: vid.readyState,
        videoWidth: vid.videoWidth,
        videoHeight: vid.videoHeight
      } : { hasVideoTag: false };
    });
    findings.videoBackground = videoState;
    await page1.screenshot({ path: path.join(EVIDENCE_DIR, '04-spaces-video-active.png') });

    // -------------------------------------------------------------------------
    // 4. KIỂM TRA AUDIO WIDGET & TAB "NHẠC & STREAM"
    // -------------------------------------------------------------------------
    console.log('\n[4] Kiểm tra AudioWidget, 3 Tab, Form thêm nhạc bằng Link URL...');
    await page1.getByTestId('dock-btn-sounds').click();
    await page1.waitForTimeout(600);

    const audioWidgetDetails = await page1.evaluate(() => {
      const chimeTab = document.querySelector('[data-testid="tab-chime"]');
      const ambientTab = document.querySelector('[data-testid="tab-ambient"]');
      const musicTab = document.querySelector('[data-testid="tab-music"]');
      return {
        hasChimeTab: Boolean(chimeTab),
        hasAmbientTab: Boolean(ambientTab),
        hasMusicTab: Boolean(musicTab),
        chimeTabText: chimeTab?.textContent || '',
        ambientTabText: ambientTab?.textContent || '',
        musicTabText: musicTab?.textContent || ''
      };
    });
    findings.audioAndMusicTab.tabs = audioWidgetDetails;

    // Click vào tab Music
    const tabMusicBtn = page1.getByTestId('tab-music');
    if (await tabMusicBtn.isVisible()) {
      await tabMusicBtn.click();
      await page1.waitForTimeout(500);

      const urlInput = page1.getByTestId('input-custom-music-url');
      const playBtn = page1.getByTestId('btn-play-custom-url');
      
      findings.audioAndMusicTab.form = {
        hasUrlInput: await urlInput.isVisible(),
        hasPlayButton: await playBtn.isVisible()
      };

      // Thử dán một link YouTube
      await urlInput.fill('https://www.youtube.com/watch?v=jfKfPfyJRdk');
      await playBtn.click();
      await page1.waitForTimeout(1000);

      const iframeState = await page1.evaluate(() => {
        const iframe = document.querySelector('iframe');
        return iframe ? {
          hasIframe: true,
          src: iframe.src
        } : { hasIframe: false };
      });
      findings.audioAndMusicTab.youtubeEmbed = iframeState;
    }
    await page1.screenshot({ path: path.join(EVIDENCE_DIR, '05-audio-music-stream-tab.png') });

    // -------------------------------------------------------------------------
    // 5. KIỂM TRA LƯU CÀI ĐẶT TIMER BỀN VỮNG
    // -------------------------------------------------------------------------
    console.log('\n[5] Kiểm tra lưu trữ cài đặt Timer (Settings & Persistence)...');
    await page1.getByTestId('dock-btn-presets').click();
    await page1.waitForTimeout(600);

    const pomoInput = page1.getByTestId('settings-input-pomodoro-min');
    if (await pomoInput.isVisible()) {
      await pomoInput.fill('35');
      await page1.waitForTimeout(500);
    }

    // Đọc state trước reload
    const displayBeforeReload = await page1.getByTestId('timer-display').innerText();
    
    // Reload trang
    await page1.reload({ waitUntil: 'networkidle' });
    await page1.waitForTimeout(1000);

    const displayAfterReload = await page1.getByTestId('timer-display').innerText();
    const settingsInStorage = await page1.evaluate(() => {
      const raw = localStorage.getItem('pomodoro_timer_settings_v1');
      return raw ? JSON.parse(raw) : null;
    });

    findings.timerPersistence = {
      displayBeforeReload,
      displayAfterReload,
      persistedSettingsInLocalStorage: settingsInStorage,
      isSuccess: displayAfterReload === '35:00' && settingsInStorage?.pomodoroMinutes === 35
    };
    await page1.screenshot({ path: path.join(EVIDENCE_DIR, '06-timer-settings-persisted.png') });

    // Reset lại 25 cho chuẩn
    await page1.getByTestId('input-pomodoro-min').fill('25');

    await context1.close();

    // -------------------------------------------------------------------------
    // 6. KIỂM TRA MOBILE VIEWPORT (Pixel 5) & MENU BOTTOM NAV
    // -------------------------------------------------------------------------
    console.log('\n[6] Kiểm tra Mobile Viewport (Pixel 5: 393x851), Menu Bottom Nav & Cuộn...');
    const pixel5Context = await browser.newContext({
      ...devices['Pixel 5'],
      isMobile: true,
      hasTouch: true
    });
    const mobilePage = await pixel5Context.newPage();

    mobilePage.on('console', msg => {
      if (msg.type() === 'error') {
        findings.consoleErrors.push({ page: 'mobile', text: msg.text() });
      }
    });

    await mobilePage.goto(REMOTE_URL, { waitUntil: 'networkidle' });
    await mobilePage.waitForTimeout(1500);

    await mobilePage.screenshot({ path: path.join(EVIDENCE_DIR, '07-mobile-top-initial.png') });

    // Kiểm tra các nút bottom nav
    const mobileNavCheck = await mobilePage.evaluate(() => {
      const nav = document.querySelector('nav[data-testid="mobile-bottom-nav"]');
      const buttons = nav ? Array.from(nav.querySelectorAll('button')).map(b => ({
        text: b.textContent?.trim(),
        ariaCurrent: b.getAttribute('aria-current'),
        testId: b.getAttribute('data-testid')
      })) : [];
      return {
        hasBottomNav: Boolean(nav),
        buttons
      };
    });
    findings.mobileNavigation.navStructure = mobileNavCheck;

    // Test chuyển tab lần lượt và kiểm tra xem có bị nhảy tab không
    const tabHistory = [];

    // Click Âm thanh
    const btnSounds = mobilePage.getByTestId('dock-btn-sounds');
    if (await btnSounds.isVisible()) {
      await btnSounds.click();
      await mobilePage.waitForTimeout(800);
      const activeAfterSounds = await mobilePage.evaluate(() => {
        const active = document.querySelector('nav[data-testid="mobile-bottom-nav"] button[aria-current="page"], nav[data-testid="mobile-bottom-nav"] button[aria-current="true"]');
        return active?.textContent?.trim() || 'NONE';
      });
      tabHistory.push({ clicked: 'Âm thanh', activeNow: activeAfterSounds });
    }

    // Click Nền (Spaces)
    const btnSpaces = mobilePage.getByTestId('dock-btn-spaces');
    if (await btnSpaces.isVisible()) {
      await btnSpaces.click();
      await mobilePage.waitForTimeout(800);
      const activeAfterSpaces = await mobilePage.evaluate(() => {
        const active = document.querySelector('nav[data-testid="mobile-bottom-nav"] button[aria-current="page"], nav[data-testid="mobile-bottom-nav"] button[aria-current="true"]');
        return active?.textContent?.trim() || 'NONE';
      });
      tabHistory.push({ clicked: 'Nền', activeNow: activeAfterSpaces });
    }

    // Click Đồng hồ (Timer)
    const btnTimer = mobilePage.getByTestId('dock-btn-timer');
    if (await btnTimer.isVisible()) {
      await btnTimer.click();
      await mobilePage.waitForTimeout(800);
      const activeAfterTimer = await mobilePage.evaluate(() => {
        const active = document.querySelector('nav[data-testid="mobile-bottom-nav"] button[aria-current="page"], nav[data-testid="mobile-bottom-nav"] button[aria-current="true"]');
        return active?.textContent?.trim() || 'NONE';
      });
      tabHistory.push({ clicked: 'Đồng hồ', activeNow: activeAfterTimer });
    }

    findings.mobileNavigation.tabHistory = tabHistory;
    await mobilePage.screenshot({ path: path.join(EVIDENCE_DIR, '08-mobile-after-tab-switch.png') });

    // Kiểm tra cuộn cảm ứng (Touch swipe)
    const scrollYInitial = await mobilePage.evaluate(() => window.scrollY);
    const cdp = await mobilePage.context().newCDPSession(mobilePage);
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: 200, y: 650 }]
    });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: 200, y: 150 }]
    });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: []
    });
    await mobilePage.waitForTimeout(800);
    const scrollYAfterSwipe = await mobilePage.evaluate(() => window.scrollY);

    findings.mobileNavigation.touchScroll = {
      initialY: scrollYInitial,
      scrolledY: scrollYAfterSwipe,
      canScroll: scrollYAfterSwipe > scrollYInitial
    };
    await mobilePage.screenshot({ path: path.join(EVIDENCE_DIR, '09-mobile-after-scroll.png') });

    await pixel5Context.close();

  } catch (err) {
    console.error('Lỗi trong quá trình điều tra:', err);
    findings.error = err.message;
  } finally {
    await browser.close();
  }

  // Ghi báo cáo ra file json
  const resultJsonPath = path.join(EVIDENCE_DIR, 'reproduction-findings.json');
  fs.writeFileSync(resultJsonPath, JSON.stringify(findings, null, 2));
  console.log(`\nĐã hoàn thành điều tra! Kết quả được ghi tại: ${resultJsonPath}`);
  console.log('\n--- TÓM TẮT DỮ LIỆU ĐO ĐẠC THỰC TẾ ---');
  console.log(JSON.stringify(findings, null, 2));
}

investigate();
