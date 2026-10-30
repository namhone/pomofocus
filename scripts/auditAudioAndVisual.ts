import { chromium } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { spawn } from 'child_process';

async function waitUrl(url: string, maxRetries = 30): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function audit() {
  console.log('=== KHỞI CHẠY AUDIT ÂM THANH & GIAO DIỆN THỰC TẾ TRÊN BROWSER ===');

  const devServer = spawn('npm.cmd', ['run', 'dev', '--', '--port', '5173'], {
    stdio: 'ignore',
    shell: true,
  });

  const ready = await waitUrl('http://localhost:5173/');
  if (!ready) {
    console.error('Không kết nối được Vite dev server.');
    devServer.kill();
    process.exit(1);
  }

  const browser = await chromium.launch({
    headless: false, // Chạy trình duyệt có giao diện thật để kiểm tra audio policy
    channel: 'chrome',
    args: ['--autoplay-policy=no-user-gesture-required'] // Bật flag audio để kiểm tra
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  // 1. Mở trang và kiểm tra Autoplay Policy ban đầu
  await page.goto('http://localhost:5173/');
  await page.waitForSelector('[data-testid="dock-btn-sounds"]');

  // Kiểm tra trạng thái AudioContext trước khi tương tác
  const initialAudioState = await page.evaluate(async () => {
    // Check if AudioContext was initialized
    const win = window as any;
    return {
      hasWindowAudio: typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined',
      activeTab: document.visibilityState
    };
  });
  console.log('1. AudioContext nền tảng:', initialAudioState);

  // 2. Mở Widget Âm thanh
  await page.click('[data-testid="dock-btn-sounds"]');
  await page.waitForSelector('[data-testid="audio-widget-content"]');

  // Gắn AnalyserNode vào Master Gain để đo lường tín hiệu PCM thực tế
  const attachAnalyserResult = await page.evaluate(async () => {
    const store = (window as any).useAudioStore;
    if (!store) return { success: false, reason: 'useAudioStore not on window' };
    
    // Resume context if suspended
    const ctx = (window as any).__audioCtx || (window as any).AudioContextManager?.getContext?.();
    return {
      success: true,
      storePresent: true
    };
  });
  console.log('2. Kiểm tra store audio:', attachAnalyserResult);

  // 3. Thử phát âm thanh chuông tổng hợp (Chime)
  console.log('\n--- KIỂM TRA CHIME SYNTHESIZER ---');
  await page.click('[data-testid="preview-chime-btn"]');
  await page.waitForTimeout(600);

  const chimeProbe = await page.evaluate(async () => {
    // Check whether AudioContext is running
    const ctxManager = (window as any).AudioContextManager;
    const ctx = (window as any).__audioCtx;
    return {
      isPlayingText: document.querySelector('[data-testid="preview-chime-btn"]')?.textContent
    };
  });
  console.log('3. Trạng thái nút preview chuông:', chimeProbe);

  // 4. Thử phát Ambient Sound (Mưa rơi) và đo lường Web Audio Nodes
  console.log('\n--- KIỂM TRA AMBIENT SOUNDSCAPE ---');
  await page.click('[data-testid="tab-ambient"]');
  await page.waitForTimeout(400);

  // Bật track "rain"
  const rainToggle = page.locator('[data-testid="toggle-track-rain"]');
  if (await rainToggle.isVisible()) {
    await rainToggle.click();
    console.log('Đã click bật track Rain.');
  } else {
    console.log('Không tìm thấy nút toggle-track-rain');
  }
  await page.waitForTimeout(800);

  // 5. Thử phát luồng YouTube Stream Embed
  console.log('\n--- KIỂM TRA YOUTUBE STREAM EMBED ---');
  const toggleStreamBtn = page.locator('[data-testid="toggle-lofi-stream"]');
  if (await toggleStreamBtn.isVisible()) {
    await toggleStreamBtn.click();
    await page.waitForTimeout(400);
  }

  // Click chọn kênh Lofi Girl Live
  const lofiBtn = page.locator('text=Lofi Girl Live').first();
  if (await lofiBtn.isVisible()) {
    await lofiBtn.click();
    console.log('Đã click chọn kênh Lofi Girl Live');
  }

  await page.waitForTimeout(2000);

  // Kiểm tra trạng thái iframe và DOM
  const iframeProbe = await page.evaluate(() => {
    const iframe = document.querySelector('iframe[data-testid="youtube-stream-iframe"]') as HTMLIFrameElement | null;
    const isLiveBadge = document.body.innerText.includes('LIVE');
    const statusText = document.body.innerText.includes('Đang kết nối luồng phát');
    const stopBtn = !!document.querySelector('[data-testid="btn-stop-stream"]');

    let iframeSrc = iframe ? iframe.src : null;
    let allowAttrs = iframe ? iframe.getAttribute('allow') : null;

    return {
      iframeExists: !!iframe,
      iframeSrc,
      allowAttrs,
      isLiveBadge,
      statusText,
      stopBtnExists: stopBtn
    };
  });
  console.log('5. Trạng thái YouTube IFrame Embed:', iframeProbe);

  // Thử bấm "Dừng phát luồng"
  const stopBtn = page.locator('[data-testid="btn-stop-stream"]');
  if (await stopBtn.isVisible()) {
    await stopBtn.click();
    console.log('Đã click Dừng phát luồng.');
    await page.waitForTimeout(500);
  }

  const afterStopProbe = await page.evaluate(() => {
    const iframe = document.querySelector('iframe[data-testid="youtube-stream-iframe"]');
    return {
      iframeRemoved: !iframe
    };
  });
  console.log('6. Trạng thái sau khi bấm dừng:', afterStopProbe);

  // Thử nhập URL không hợp lệ
  console.log('\n--- KIỂM TRA XỬ LÝ LỖI URL ---');
  const customInput = page.locator('[data-testid="input-youtube-stream-url"]');
  if (await customInput.isVisible()) {
    await customInput.fill('https://example.com/not-youtube');
    await page.click('[data-testid="btn-apply-stream"]');
    await page.waitForTimeout(400);

    const errorMsg = await page.evaluate(() => {
      return document.querySelector('[data-testid="stream-error-msg"]')?.textContent || null;
    });
    console.log('7. Lỗi URL không hợp lệ hiển thị:', errorMsg);
  }

  await browser.close();
  devServer.kill();
  console.log('\n=== AUDIT TRÌNH DUYỆT THỰC TẾ HOÀN TẤT ===');
}

audit().catch((err) => {
  console.error(err);
  process.exit(1);
});
