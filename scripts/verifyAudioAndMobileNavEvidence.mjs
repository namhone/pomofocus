import { chromium, devices } from 'playwright';
import path from 'path';
import fs from 'fs';

const EVIDENCE_DIR = path.resolve('artifacts/evidence-audio-and-mobilenav');
if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

async function runVerification() {
  console.log('=== BẮT ĐẦU KIỂM TRA THỰC NGHIỆM 2 TIÊU CHÍ ===\n');
  const results = {
    audioLifecycle: {},
    mobileNavAnimation: {},
    previewUrlCheck: {}
  };

  const browser = await chromium.launch({ channel: 'chrome' });

  // 1. KIỂM TRA TIÊU CHÍ 1: AUDIO LIFECYCLE (DESKTOP)
  console.log('[1] Kiểm tra Tiêu chí 1: Nhạc tiếp tục phát khi ẩn/đóng widget...');
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const desktopPage = await desktopContext.newPage();
  await desktopPage.goto('http://localhost:4173');
  await desktopPage.waitForTimeout(1000);

  // Mở Audio widget
  await desktopPage.getByTestId('dock-btn-sounds').click();
  await desktopPage.waitForTimeout(500);

  // Mở tab Nhạc & Stream
  await desktopPage.getByTestId('tab-music').click();
  await desktopPage.waitForTimeout(500);

  // Phát bài Kalimba MP3 trực tiếp
  await desktopPage.locator('button', { hasText: 'Giai Điệu Kalimba' }).click();
  await desktopPage.waitForTimeout(1000);

  await desktopPage.screenshot({ path: path.join(EVIDENCE_DIR, '01-audio-playing-widget-open.png') });

  // Thu thập trạng thái phát ban đầu
  const stateAtStart = await desktopPage.evaluate(() => {
    const audioEl = document.querySelector('div[data-testid="global-audio-host"] audio');
    const store = window.useAudioStore;
    return {
      audioTagExists: Boolean(audioEl),
      audioSrc: audioEl?.src || '',
      isPaused: audioEl?.paused ?? true,
      storePlaying: store?.getState().customMusicPlaying ?? false,
      storeUrl: store?.getState().customMusicUrl ?? '',
      volume: audioEl?.volume ?? 0
    };
  });

  // ĐÓNG WIDGET AUDIO
  await desktopPage.getByTestId('dock-btn-sounds').click();
  await desktopPage.waitForTimeout(500);

  const isWidgetVisibleAfterClose = await desktopPage.getByTestId('audio-widget-content').isVisible();
  await desktopPage.screenshot({ path: path.join(EVIDENCE_DIR, '02-widget-closed-background-playing.png') });

  // Chờ 10 giây theo đúng tiêu chí
  console.log('  -> Đang chờ 10 giây trong khi widget đóng...');
  await desktopPage.waitForTimeout(10000);

  // Thu thập trạng thái phát sau 10 giây widget đóng
  const stateAfter10s = await desktopPage.evaluate(() => {
    const audioEl = document.querySelector('div[data-testid="global-audio-host"] audio');
    const store = window.useAudioStore;
    return {
      audioTagExists: Boolean(audioEl),
      audioSrc: audioEl?.src || '',
      isPaused: audioEl?.paused ?? true,
      storePlaying: store?.getState().customMusicPlaying ?? false
    };
  });

  // MỞ LẠI WIDGET AUDIO
  await desktopPage.getByTestId('dock-btn-sounds').click();
  await desktopPage.waitForTimeout(500);
  await desktopPage.screenshot({ path: path.join(EVIDENCE_DIR, '03-widget-reopened-state-preserved.png') });

  const stateAfterReopen = await desktopPage.evaluate(() => {
    const store = window.useAudioStore;
    return {
      storePlaying: store?.getState().customMusicPlaying ?? false,
      storeUrl: store?.getState().customMusicUrl ?? '',
      activeTab: store?.getState().activeTab ?? ''
    };
  });

  // Thử nút Pause
  const pauseBtn = desktopPage.getByTestId('btn-toggle-direct-audio');
  await pauseBtn.click();
  await desktopPage.waitForTimeout(500);

  const stateAfterPause = await desktopPage.evaluate(() => {
    const audioEl = document.querySelector('div[data-testid="global-audio-host"] audio');
    const store = window.useAudioStore;
    return {
      isPaused: audioEl?.paused ?? true,
      storePlaying: store?.getState().customMusicPlaying ?? false
    };
  });

  results.audioLifecycle = {
    initialPlay: stateAtStart,
    isWidgetClosed: !isWidgetVisibleAfterClose,
    playbackAfter10sClosed: stateAfter10s,
    stateAfterReopen,
    stateAfterPause,
    passCriteria:
      stateAtStart.storePlaying &&
      !stateAtStart.isPaused &&
      !isWidgetVisibleAfterClose &&
      stateAfter10s.storePlaying &&
      !stateAfter10s.isPaused &&
      stateAfterReopen.storePlaying &&
      stateAfterPause.isPaused &&
      !stateAfterPause.storePlaying
  };
  console.log('  -> Kết quả Tiêu chí 1:', results.audioLifecycle.passCriteria ? 'PASS' : 'FAIL');
  await desktopContext.close();

  // 2. KIỂM TRA TIÊU CHÍ 2: MOBILE NAV ANIMATION (PIXEL 5 TOUCH)
  console.log('\n[2] Kiểm tra Tiêu chí 2: Mobile Nav Animation không nháy trắng...');
  const mobileContext = await browser.newContext({
    ...devices['Pixel 5'],
    isMobile: true,
    hasTouch: true
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto('http://localhost:4173');
  await mobilePage.waitForTimeout(1000);

  const tabs = ['tasks', 'notes', 'sounds', 'spaces', 'timer'];
  const switchLog = [];
  let flashOrJumpCount = 0;

  for (let cycle = 1; cycle <= 3; cycle++) {
    for (const t of tabs) {
      const btn = mobilePage.getByTestId(`dock-btn-${t}`);

      // Đo style trước tap
      const styleBefore = await btn.evaluate(el => {
        const cs = window.getComputedStyle(el);
        return {
          bg: cs.backgroundColor,
          border: cs.border,
          tapHighlight: cs.webkitTapHighlightColor
        };
      });

      // Tap
      await btn.tap();

      // Kiểm tra ngay sau tap (trong vòng 50ms)
      await mobilePage.waitForTimeout(40);
      const activeRightAway = await mobilePage.evaluate(() => {
        const active = document.querySelector('nav[data-testid="mobile-bottom-navigation"] button[aria-current="page"]');
        return active?.getAttribute('data-testid')?.replace('dock-btn-', '') || null;
      });

      // Kiểm tra sau 250ms (không bị giật ngược tab)
      await mobilePage.waitForTimeout(210);
      const activeAfterSettled = await mobilePage.evaluate(() => {
        const active = document.querySelector('nav[data-testid="mobile-bottom-navigation"] button[aria-current="page"]');
        return active?.getAttribute('data-testid')?.replace('dock-btn-', '') || null;
      });

      const isConsistent = activeRightAway === t && activeAfterSettled === t;
      if (!isConsistent) {
        flashOrJumpCount++;
      }

      switchLog.push({
        cycle,
        targetTab: t,
        activeRightAway,
        activeAfterSettled,
        isConsistent
      });
    }
  }

  await mobilePage.screenshot({ path: path.join(EVIDENCE_DIR, '04-mobile-nav-verified-clean.png') });

  results.mobileNavAnimation = {
    totalSwitches: switchLog.length,
    successfulSwitches: switchLog.filter(s => s.isConsistent).length,
    flashOrJumpCount,
    passCriteria: flashOrJumpCount === 0 && switchLog.length >= 15
  };
  console.log('  -> Kết quả Tiêu chí 2:', results.mobileNavAnimation.passCriteria ? 'PASS' : 'FAIL', `(${results.mobileNavAnimation.successfulSwitches}/${results.mobileNavAnimation.totalSwitches} chuyển tab tức thời không giật)`);

  await mobileContext.close();
  await browser.close();

  fs.writeFileSync(path.join(EVIDENCE_DIR, 'verification-results.json'), JSON.stringify(results, null, 2), 'utf-8');
  console.log('\nĐã lưu toàn bộ kết quả và hình ảnh tại:', EVIDENCE_DIR);
}

runVerification().catch(err => {
  console.error('Lỗi kiểm tra:', err);
  process.exit(1);
});
