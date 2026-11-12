import { chromium, devices } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = 'tests/screenshots/audit_v81';
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

async function runAudit() {
  console.log('🚀 Starting PomoFocus V8.1 Comprehensive Browser Audit...');
  const auditData = {};

  const browser = await chromium.launch({
    headless: true,
    channel: 'msedge',
  });

  // ---------------------------------------------------------------------------
  // MOBILE AUDIT (Pixel 7)
  // ---------------------------------------------------------------------------
  const pixel7 = devices['Pixel 7'];
  const mobileContext = await browser.newContext({
    ...pixel7,
    locale: 'vi-VN',
  });

  const page = await mobileContext.newPage();
  page.on('console', msg => {
    if (msg.type() === 'error') console.log(`[Browser Console Error]`, msg.text());
  });

  console.log('📱 Navigating to http://localhost:5173/app ...');
  await page.goto('http://localhost:5173/app', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Helper to extract element info
  async function inspectElement(selector, name) {
    const el = page.locator(selector).first();
    const count = await el.count();
    if (count === 0) return { name, selector, exists: false };
    const box = await el.boundingBox();
    const text = (await el.innerText().catch(() => '')).trim();
    const isVisible = await el.isVisible();
    return { name, selector, exists: true, isVisible, box, text };
  }

  // ===========================================================================
  // 01: Focus View Default
  // ===========================================================================
  console.log('\n--- Auditing 01: Tab Focus Default ---');
  await page.locator('[data-testid="mobile-nav-tab-focus"]').click();
  await page.waitForTimeout(500);

  auditData['01_tab_focus_default'] = {
    avatarBtn: await inspectElement('[data-testid="mobile-header-avatar-btn"]', 'Header Avatar Button'),
    creditsPill: await inspectElement('[data-testid="mobile-header-credits-pill"]', 'Energy Credits Pill'),
    phasePomo: await inspectElement('[data-testid="mobile-phase-pomodoro"]', 'Phase Pomodoro Pill'),
    phaseShort: await inspectElement('[data-testid="mobile-phase-short_break"]', 'Phase Short Break Pill'),
    phaseLong: await inspectElement('[data-testid="mobile-phase-long_break"]', 'Phase Long Break Pill'),
    quickTaskBar: await inspectElement('[data-testid="mobile-linked-task-chip"]', 'Quick Task Bar'),
    monumentalTimer: await inspectElement('[data-testid="mobile-monumental-timer"]', 'Big Timer Display'),
    playBtn: await inspectElement('[data-testid="mobile-timer-main-action"]', 'Main Action (Play/Pause) Button'),
    resetBtn: await inspectElement('[data-testid="mobile-timer-reset"]', 'Timer Reset Button'),
    pocketLockBtn: await inspectElement('[data-testid="mobile-pocket-lock-btn"]', 'Pocket Lock Toggle Button'),
    strictModeToggle: await inspectElement('[data-testid="mobile-strict-mode-toggle"]', 'Strict Mode Toggle'),
    dailyFlowStrip: await inspectElement('[data-testid="mobile-daily-flow-strip"]', '24h Daily Flow Strip'),
    weeklyInsights: await inspectElement('[data-testid="mobile-weekly-insights"]', '7-Day Weekly Insights'),
    bottomNav: await inspectElement('[data-testid="mobile-bottom-nav"]', 'Material 3 Bottom Navigation')
  };

  const shot01 = path.join(SCREENSHOT_DIR, '01_tab_focus_default.png');
  await page.screenshot({ path: shot01, fullPage: false });
  console.log(`✅ Saved screenshot: ${shot01}`);

  // ===========================================================================
  // 02: Focus Task Dropdown
  // ===========================================================================
  console.log('\n--- Auditing 02: Focus Task Dropdown ---');
  const taskChip = page.locator('[data-testid="mobile-linked-task-chip"]');
  await taskChip.click();
  await page.waitForTimeout(500);

  const dropdown = page.locator('[data-testid="mobile-task-picker-dropdown"]');
  const dropdownVisible = await dropdown.isVisible().catch(() => false);
  console.log('Task picker dropdown visible:', dropdownVisible);

  auditData['02_focus_task_dropdown'] = {
    taskPickerDropdown: await inspectElement('[data-testid="mobile-task-picker-dropdown"]', 'Task Picker Dropdown'),
    manageTasksBtn: await inspectElement('[data-testid="mobile-picker-manage-tasks-btn"]', 'Manage Tasks Button')
  };

  const shot02 = path.join(SCREENSHOT_DIR, '02_focus_task_dropdown.png');
  await page.screenshot({ path: shot02, fullPage: false });
  console.log(`✅ Saved screenshot: ${shot02}`);

  // Close dropdown cleanly by clicking close button or toggling chip
  const closeDropdownBtn = page.locator('[aria-label="Đóng bảng chọn"]');
  if (await closeDropdownBtn.isVisible().catch(() => false)) {
    await closeDropdownBtn.click();
  } else {
    await taskChip.click();
  }
  await page.waitForTimeout(400);

  // ===========================================================================
  // 03: Focus Hold & Running
  // ===========================================================================
  console.log('\n--- Auditing 03: Focus Hold & Running ---');
  const playButton = page.locator('[data-testid="mobile-timer-main-action"]');
  // Click play button to start timer
  await playButton.click();
  // Wait 2.5 seconds for timer countdown to tick
  await page.waitForTimeout(2500);

  const timerText = await page.locator('[data-testid="mobile-monumental-timer"]').innerText();
  console.log('Running timer display:', timerText);

  auditData['03_focus_hold_and_running'] = {
    timerAfterStart: timerText,
    actionButtonState: await inspectElement('[data-testid="mobile-timer-main-action"]', 'Main Action Button (Running State)'),
    sessionProgress: await inspectElement('[data-testid="mobile-session-progress-bar"]', 'Session Progress Bar')
  };

  const shot03 = path.join(SCREENSHOT_DIR, '03_focus_hold_and_running.png');
  await page.screenshot({ path: shot03, fullPage: false });
  console.log(`✅ Saved screenshot: ${shot03}`);

  // Pause timer for next tests
  await playButton.click();
  await page.waitForTimeout(300);

  // ===========================================================================
  // 04: Focus Pocket Lock
  // ===========================================================================
  console.log('\n--- Auditing 04: Focus Pocket Lock ---');
  const pocketLockToggle = page.locator('[data-testid="mobile-pocket-lock-btn"]');
  await pocketLockToggle.click();
  await page.waitForTimeout(500);

  const pocketOverlay = page.locator('[data-testid="mobile-pocket-lock-overlay"]');
  const isPocketOverlayVisible = await pocketOverlay.isVisible();
  console.log('Pocket lock overlay visible:', isPocketOverlayVisible);

  auditData['04_focus_pocket_lock'] = {
    overlay: await inspectElement('[data-testid="mobile-pocket-lock-overlay"]', 'Pocket Lock Fullscreen Overlay (z-[70])'),
    unlockPad: await inspectElement('[data-testid="mobile-pocket-unlock-pad"]', 'Pocket Unlock Hold Pad'),
    unlockProgress: await inspectElement('[data-testid="mobile-pocket-unlock-progress"]', 'Unlock Hold Progress Bar')
  };

  const shot04 = path.join(SCREENSHOT_DIR, '04_focus_pocket_lock.png');
  await page.screenshot({ path: shot04, fullPage: false });
  console.log(`✅ Saved screenshot: ${shot04}`);

  // Unlock pocket lock: hold 1.6 seconds on unlock pad
  console.log('Unlocking Pocket Lock via 1.6s sustained pointer hold...');
  const unlockPad = page.locator('[data-testid="mobile-pocket-unlock-pad"]');
  if (await unlockPad.isVisible().catch(() => false)) {
    await unlockPad.dispatchEvent('pointerdown');
    await page.waitForTimeout(1650);
    // Overlay automatically unlocks & unmounts at 1500ms; dispatch pointerup safely with catch
    await unlockPad.dispatchEvent('pointerup', {}, { timeout: 1000 }).catch(() => {});
    await page.waitForTimeout(500);
  }
  const isPocketStillLocked = await pocketOverlay.isVisible().catch(() => false);
  console.log('Pocket lock dismissed after hold:', !isPocketStillLocked);

  // ===========================================================================
  // 05: Auth Bottom Sheet
  // ===========================================================================
  console.log('\n--- Auditing 05: Auth Bottom Sheet ---');
  const avatarBtn = page.locator('[data-testid="mobile-header-avatar-btn"]');
  await avatarBtn.click();
  await page.waitForTimeout(600);

  const authSheet = page.locator('[data-testid="mobile-auth-bottom-sheet"]');
  const isAuthSheetVisible = await authSheet.isVisible();
  console.log('Auth bottom sheet visible:', isAuthSheetVisible);

  auditData['05_auth_bottom_sheet'] = {
    authSheet: await inspectElement('[data-testid="mobile-auth-bottom-sheet"]', 'Bottom Sheet Auth Panel (z-[60])'),
    googleBtn: await inspectElement('[data-testid="mobile-auth-google-btn"]', 'Google 1-Tap OAuth Button'),
    emailInput: await inspectElement('[data-testid="mobile-auth-email-input"]', 'Magic Link Email Input'),
    magicLinkBtn: await inspectElement('[data-testid="mobile-auth-magiclink-btn"]', 'Send Magic Link Button'),
    bentoGrid: await inspectElement('[data-testid="mobile-auth-bento-grid"]', '4-Card Bento Grid Profile'),
    metricHours: await inspectElement('[data-testid="bento-metric-studyHours"]', 'Bento Metric: Study Hours'),
    metricStreak: await inspectElement('[data-testid="bento-metric-streak"]', 'Bento Metric: Streak Days'),
    metricPomos: await inspectElement('[data-testid="bento-metric-completedPomos"]', 'Bento Metric: Completed Pomos'),
    metricWallet: await inspectElement('[data-testid="bento-metric-walletCredits"]', 'Bento Metric: Wallet Credits')
  };

  const shot05 = path.join(SCREENSHOT_DIR, '05_auth_bottom_sheet.png');
  await page.screenshot({ path: shot05, fullPage: false });
  console.log(`✅ Saved screenshot: ${shot05}`);

  // Close auth sheet
  const closeAuthBtn = page.locator('[data-testid="mobile-auth-close-btn"]');
  if (await closeAuthBtn.isVisible()) {
    await closeAuthBtn.click();
  } else {
    await page.locator('[data-testid="mobile-auth-sheet-backdrop"]').click({ position: { x: 20, y: 20 } });
  }
  await page.waitForTimeout(400);

  // ===========================================================================
  // 06: Tasks List Tab
  // ===========================================================================
  console.log('\n--- Auditing 06: Tab Tasks List ---');
  await page.locator('[data-testid="mobile-nav-tab-tasks"]').click();
  await page.waitForTimeout(600);

  // Add a task
  const taskInput = page.locator('input[placeholder*="Thêm công việc"]');
  await taskInput.fill('Đọc sách Deep Work 25 trang');
  await page.locator('button[aria-label="Thêm công việc"]').click();
  await page.waitForTimeout(400);

  await taskInput.fill('Luyện đề thi thử Toán Cao Cấp');
  await page.locator('button[aria-label="Thêm công việc"]').click();
  await page.waitForTimeout(400);

  // Find tasks
  const firstMoveDown = page.locator('button[title="Chuyển xuống dưới"]').first();
  if (await firstMoveDown.isVisible()) {
    await firstMoveDown.click();
    await page.waitForTimeout(400);
  }

  // Toggle complete on first task
  const checkBtn = page.locator('button[aria-label*="Đánh dấu"]').first();
  if (await checkBtn.isVisible()) {
    await checkBtn.click();
    await page.waitForTimeout(400);
  }

  auditData['06_tab_tasks_list'] = {
    tasksView: await inspectElement('[data-testid="mobile-view-tasks"]', 'Tasks Tab View Container'),
    taskInput: await inspectElement('input[placeholder*="Thêm công việc"]', 'Quick Add Task Input'),
    addTaskBtn: await inspectElement('button[aria-label="Thêm công việc"]', 'Add Task Submit Button'),
    taskItems: await inspectElement('[data-testid="mobile-view-tasks"] .space-y-2', 'Task List Items')
  };

  const shot06 = path.join(SCREENSHOT_DIR, '06_tab_tasks_list.png');
  await page.screenshot({ path: shot06, fullPage: false });
  console.log(`✅ Saved screenshot: ${shot06}`);

  // ===========================================================================
  // 07: Spaces Tab (Background & Pure Zen Black)
  // ===========================================================================
  console.log('\n--- Auditing 07: Tab Spaces Background ---');
  await page.locator('[data-testid="mobile-nav-tab-spaces"]').click();
  await page.waitForTimeout(600);

  // Ensure sub-tab bg is selected
  await page.locator('[data-testid="mobile-spaces-subtab-bg"]').click();
  await page.waitForTimeout(400);

  // Select a preset first
  const presetBtn = page.locator('[data-testid*="mobile-space-preset-"]').first();
  if (await presetBtn.isVisible()) {
    await presetBtn.click();
    await page.waitForTimeout(400);
  }

  // Click Pure Zen Black 1-tap reset
  const pureZenBtn = page.locator('[data-testid="mobile-spaces-pure-zen-black-btn"]');
  await pureZenBtn.click();
  await page.waitForTimeout(500);

  auditData['07_tab_spaces_bg'] = {
    subtabBg: await inspectElement('[data-testid="mobile-spaces-subtab-bg"]', 'Sub-tab: Nền & Hiệu ứng'),
    subtabAudio: await inspectElement('[data-testid="mobile-spaces-subtab-audio"]', 'Sub-tab: Mixer Âm thanh'),
    pureZenBlackBtn: await inspectElement('[data-testid="mobile-spaces-pure-zen-black-btn"]', 'Pure Zen Black OLED #09090b 1-Tap Button'),
    presetsGrid: await inspectElement('.grid.grid-cols-2', 'Background Presets Grid')
  };

  const shot07 = path.join(SCREENSHOT_DIR, '07_tab_spaces_bg.png');
  await page.screenshot({ path: shot07, fullPage: false });
  console.log(`✅ Saved screenshot: ${shot07}`);

  // ===========================================================================
  // 08: Spaces Tab (Sound Mixer)
  // ===========================================================================
  console.log('\n--- Auditing 08: Tab Spaces Mixer ---');
  await page.locator('[data-testid="mobile-spaces-subtab-audio"]').click();
  await page.waitForTimeout(600);

  // Toggle first ambient sound track
  const soundTrackBtn = page.locator('[data-testid="mobile-audio-mixer-panel"] button').first();
  if (await soundTrackBtn.isVisible()) {
    await soundTrackBtn.click();
    await page.waitForTimeout(300);
  }

  auditData['08_tab_spaces_mixer'] = {
    mixerPanel: await inspectElement('[data-testid="mobile-audio-mixer-panel"]', 'Audio Mixer Panel Container'),
    masterVolumeCard: await inspectElement('[data-testid="mobile-mixer-master-volume"]', 'Master Volume Control Card'),
    activeBadge: await inspectElement('[data-testid="mobile-mixer-active-badge"]', 'Active Tracks Badge Count')
  };

  const shot08 = path.join(SCREENSHOT_DIR, '08_tab_spaces_mixer.png');
  await page.screenshot({ path: shot08, fullPage: false });
  console.log(`✅ Saved screenshot: ${shot08}`);

  // ===========================================================================
  // 09: AI Chat Tab
  // ===========================================================================
  console.log('\n--- Auditing 09: Tab AI Chat ---');
  await page.locator('[data-testid="mobile-nav-tab-ai"]').click();
  await page.waitForTimeout(600);

  // Send a message
  const aiInput = page.locator('input[placeholder*="Hỏi AI"]');
  if (await aiInput.isVisible()) {
    await aiInput.fill('Lập kế hoạch học tập 25 phút giúp tôi');
    await page.locator('form:has(input[placeholder*="Hỏi AI"]) button[type="submit"]').click();
    await page.waitForTimeout(1500);
  }

  auditData['09_tab_ai_chat'] = {
    aiView: await inspectElement('[data-testid="mobile-view-ai"]', 'AI Chat View Container'),
    aiInput: await inspectElement('input[placeholder*="Hỏi AI"]', 'AI Chat Query Input Bar'),
    sendBtn: await inspectElement('form:has(input[placeholder*="Hỏi AI"]) button[type="submit"]', 'Send Query Button')
  };

  const shot09 = path.join(SCREENSHOT_DIR, '09_tab_ai_chat.png');
  await page.screenshot({ path: shot09, fullPage: false });
  console.log(`✅ Saved screenshot: ${shot09}`);

  // ===========================================================================
  // 10: Settings Tab
  // ===========================================================================
  console.log('\n--- Auditing 10: Tab Settings ---');
  await page.locator('[data-testid="mobile-nav-tab-settings"]').click();
  await page.waitForTimeout(600);

  // Test Steppers
  const plusBtnFocus = page.locator('[data-testid="mobile-settings-stepper-focus"] button[aria-label*="Tăng"]').or(
    page.locator('[data-testid="mobile-settings-stepper-focus"] button:has-text("+")')
  );
  if (await plusBtnFocus.isVisible()) {
    await plusBtnFocus.click();
    await page.waitForTimeout(300);
  }

  auditData['10_tab_settings'] = {
    settingsView: await inspectElement('[data-testid="mobile-settings-view"]', 'Settings View Container'),
    userStatusCard: await inspectElement('[data-testid="mobile-user-status-card"]', 'User Status & Auth Card'),
    stepperFocus: await inspectElement('[data-testid="mobile-settings-stepper-focus"]', 'Focus Duration Stepper Row'),
    stepperShort: await inspectElement('[data-testid="mobile-settings-stepper-short"]', 'Short Break Stepper Row'),
    stepperLong: await inspectElement('[data-testid="mobile-settings-stepper-long"]', 'Long Break Stepper Row'),
    volumeSlider: await inspectElement('[data-testid="mobile-settings-volume-slider"]', 'Alarm Volume Slider'),
    chimeSelect: await inspectElement('[data-testid="mobile-settings-chime-select"]', 'Alarm Chime Sound Select'),
    resetLayoutBtn: await inspectElement('[data-testid="mobile-settings-reset-layout-btn"]', 'Reset Layout Button')
  };

  const shot10 = path.join(SCREENSHOT_DIR, '10_tab_settings.png');
  await page.screenshot({ path: shot10, fullPage: false });
  console.log(`✅ Saved screenshot: ${shot10}`);

  await mobileContext.close();

  // ---------------------------------------------------------------------------
  // DESKTOP AUDIT (1440x900 - /download)
  // ---------------------------------------------------------------------------
  console.log('\n--- Auditing 11: Web Download 3D Hub (Desktop 1440x900) ---');
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
    locale: 'vi-VN'
  });

  const desktopPage = await desktopContext.newPage();
  await desktopPage.goto('http://localhost:5173/download', { waitUntil: 'networkidle' });
  await desktopPage.waitForTimeout(1500);

  auditData['11_web_download_3d'] = {
    container: await (async () => {
      const el = desktopPage.locator('[data-testid="download-hub-container"]').first();
      const count = await el.count();
      if (count === 0) return { exists: false };
      return { exists: true, box: await el.boundingBox() };
    })(),
    centralApkBtn: await (async () => {
      const el = desktopPage.locator('[data-testid="central-apk-download-btn"]').first();
      return { exists: await el.count() > 0, box: await el.boundingBox(), text: (await el.innerText().catch(() => '')).trim() };
    })(),
    phone3DStage: await (async () => {
      const el = desktopPage.locator('[data-testid="phone-3d-tilt-stage"]').first();
      return { exists: await el.count() > 0, box: await el.boundingBox() };
    })(),
    dynamicQrCode: await (async () => {
      const el = desktopPage.locator('[data-testid="dynamic-qr-code"]').first();
      return { exists: await el.count() > 0, box: await el.boundingBox() };
    })(),
    playProtectHint: await (async () => {
      const el = desktopPage.locator('[data-testid="play-protect-micro-hint"]').first();
      return { exists: await el.count() > 0, box: await el.boundingBox(), text: (await el.innerText().catch(() => '')).trim() };
    })()
  };

  const shot11 = path.join(SCREENSHOT_DIR, '11_web_download_3d.png');
  await desktopPage.screenshot({ path: shot11, fullPage: false });
  console.log(`✅ Saved screenshot: ${shot11}`);

  await desktopContext.close();
  await browser.close();

  // Save audit data
  fs.writeFileSync(path.join(SCREENSHOT_DIR, 'audit_data.json'), JSON.stringify(auditData, null, 2));
  console.log('🎉 AUDIT COMPLETE! All 11 screenshots & audit data saved successfully.');
}

runAudit().catch(err => {
  console.error('Audit failed with error:', err);
  process.exit(1);
});
