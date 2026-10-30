import { chromium } from 'playwright';

const LIVE_URL = 'https://pomodoro-workspace-three.vercel.app';
const ARTIFACT_DIR = 'C:/Users/Nam/.gemini/antigravity/brain/f0e4fa42-ea0b-4ff3-83da-6875921843c2';

async function verifyLive() {
  console.log(`🌐 Đang kiểm thử trực tiếp trên live: ${LIVE_URL}...`);
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    permissions: ['camera', 'microphone']
  });

  const page = await context.newPage();

  try {
    // 1. Kiểm tra truy cập /rooms/room-alpha-1 trực tiếp trên web live
    console.log('1. Truy cập trực tiếp link cũ /rooms/room-alpha-1');
    await page.goto(`${LIVE_URL}/rooms/room-alpha-1`);
    await page.waitForURL('**/rooms', { timeout: 8000 });
    console.log('✅ Web Live đã tự động chuyển hướng về:', page.url());
    await page.screenshot({ path: `${ARTIFACT_DIR}/live-audit-1-redirect-purged.png` });

    // 2. Kiểm tra sảnh phòng trên web live: Khách chưa đăng nhập không thể tạo phòng
    console.log('2. Kiểm tra Sảnh Phòng trên live');
    await page.goto(`${LIVE_URL}/rooms`);
    const guestBtn = page.getByRole('button', { name: /Đăng Nhập Để Tạo Phòng|Nâng Cấp PRO Để Tạo Phòng/ });
    await guestBtn.waitFor({ state: 'visible', timeout: 8000 });
    console.log('✅ Nút trên web Live:', await guestBtn.innerText());
    await page.screenshot({ path: `${ARTIFACT_DIR}/live-audit-2-lobby-guest-blocked.png` });

    console.log('🎉 Web Live hoạt động chính xác 100%!');
  } catch (err) {
    console.error('❌ Lỗi kiểm thử live:', err);
  } finally {
    await browser.close();
  }
}

verifyLive();
