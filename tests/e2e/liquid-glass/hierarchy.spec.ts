import { test as base, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs/promises';

class Workspace {
  readonly page: Page;
  constructor(page: Page) { this.page = page; }
  async open(path = '/app') { await this.page.goto(path, { waitUntil: 'domcontentloaded' }); }
  async eco(enabled: boolean) {
    await this.page.evaluate(value => (window as any).useLayoutStore.getState().setEcoMode(value), enabled);
  }
  async founder() {
    await this.page.evaluate(() => (window as any).useAuthStore.setState({
      user: { id: 'ui-fixture-founder', email: 'founder@example.test', displayName: 'Nam', plan: 'lifetime',
        app_metadata: { role: 'founder' }, role: 'founder', credits: 23, createdAt: 1 },
      isAuthenticated: true, isOwner: true, isPro: true, isLifetime: true, hasVipAccess: true
    }));
  }
}
const test = base.extend<{ workspace: Workspace }>({
  workspace: async ({ page }, use, info) => {
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(native => {
      localStorage.setItem('pomofocus_consent_v1', 'accepted');
      if (native) {
        (window as any).androidBridge = { postMessage: () => undefined };
        (window as any).Capacitor = { platform: 'android', isNativePlatform: () => true, getPlatform: () => 'android', isPluginAvailable: () => false,
          nativePromise: () => Promise.resolve({}), nativeCallback: () => 'test-listener', Plugins: {} };
      }
    }, info.project.name.startsWith('native'));
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.pathname.startsWith('/api/') || url.hostname.endsWith('supabase.co')) return route.fulfill({ json: [] });
      return url.hostname === '127.0.0.1' ? route.continue() : route.abort();
    });
    await page.routeWebSocket('**/realtime/v1/**', socket => socket.close());
    await use(new Workspace(page));
    expect(errors, 'No uncaught JavaScript errors').toEqual([]);
  }
});
async function audit(page: Page, name: string) {
  await expect.poll(() => page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth)).toBe(0);
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  await fs.mkdir('artifacts/liquid-glass', { recursive: true });
  await fs.writeFile(`artifacts/liquid-glass/axe-${name}.json`, JSON.stringify({ url: result.url, violations: result.violations, incomplete: result.incomplete, passes: result.passes.map(p => ({ id: p.id, nodes: p.nodes.length })) }, null, 2));
  expect(result.violations).toEqual([]);
}
test('Focus: visual depth, real timer controls, Eco and safe area', async ({ page, workspace }, info) => {
  const mobile = info.project.name.includes('390'); await workspace.open();
  const timer = page.getByRole('timer', { name: 'Đồng hồ Pomodoro' });
  await expect(timer).toBeVisible(); await expect(timer).toHaveAttribute('aria-live', 'off');
  const aura = page.getByTestId(mobile ? 'mobile-breathing-aura' : 'timer-ambient-glow');
  await expect(aura).toBeVisible(); await expect(aura).toHaveAttribute('aria-hidden', 'true');
  const play = page.getByRole('button', { name: mobile ? 'Bắt đầu đếm giờ' : 'Bắt đầu phiên tập trung', exact: true });
  if (mobile) await play.tap(); else await play.click();
  const pause = page.getByRole('button', { name: mobile ? 'Tạm dừng đồng hồ' : 'Tạm dừng phiên tập trung', exact: true });
  if (mobile) await pause.tap(); else await pause.click();
  const status = page.getByTestId(mobile ? 'mobile-phase-announcement' : 'timer-phase-announcement');
  await expect(status).toContainText('Tạm dừng');
  if (mobile) {
    await expect(page.getByRole('tablist', { name: 'Chế độ tập trung' }).getByRole('tab', { name: 'Tập trung', exact: true })).toHaveAttribute('aria-selected', 'true');
    const main = await page.getByRole('button', { name: 'Bắt đầu đếm giờ', exact: true }).boundingBox();
    const nav = await page.getByRole('tab', { name: 'Tập trung', exact: true }).last().boundingBox();
    expect(main && nav && main.y + main.height < nav.y).toBe(true);
  }
  await audit(page, `${info.project.name}-focus`);
  await page.screenshot({ path: `artifacts/liquid-glass/${info.project.name}-focus.png` });
  await workspace.eco(true); await expect(aura).toHaveCount(0);
  const primary = page.getByRole('button', { name: mobile ? 'Bắt đầu đếm giờ' : 'Tiếp tục phiên tập trung', exact: true });
  await expect(primary).toHaveCSS('box-shadow', 'none');
  await primary.focus(); await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab');
  await expect(primary).toBeFocused();
  await expect.poll(() => primary.evaluate(element => {
    const style = getComputedStyle(element);
    return parseFloat(style.outlineWidth) >= 2 && !['transparent', 'rgba(0, 0, 0, 0)'].includes(style.outlineColor);
  })).toBe(true);
  await page.screenshot({ path: `artifacts/liquid-glass/${info.project.name}-eco-focus.png` });
  await primary.blur();
  await workspace.eco(false); await expect(aura).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(aura).toBeHidden(); await expect(primary).toHaveCSS('box-shadow', 'none');
  if (mobile) await expect(page.getByRole('tablist', { name: 'Chế độ tập trung' })).toHaveCSS('backdrop-filter', 'none');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(aura).toBeVisible();
  if (info.project.name.startsWith('native')) expect(await page.evaluate(() => (window as any).Capacitor.isNativePlatform())).toBe(true);
});
test('Meet: single-line subtitle, visible CTA and retained advanced room code', async ({ page, workspace }, info) => {
  await workspace.open('/rooms');
  await expect(page.getByText('Phòng học trực tuyến', { exact: true })).toBeVisible();
  await expect(page.getByText('Đặt tên phòng của bạn', { exact: true })).toHaveCount(0);
  const guestAction = page.getByRole('button', { name: 'Đăng nhập để tạo phòng', exact: true });
  await expect(guestAction).toBeVisible();
  const bounds = await guestAction.boundingBox();
  expect(bounds && bounds.y > 0 && bounds.y + bounds.height <= page.viewportSize()!.height).toBe(true);
  await audit(page, `${info.project.name}-rooms-guest`);
  await page.screenshot({ path: `artifacts/liquid-glass/${info.project.name}-rooms.png` });
  await workspace.founder();
  const create = page.getByRole('button', { name: 'Tạo phòng PRO không giới hạn & lấy mã', exact: true });
  await expect(create).toBeVisible(); await expect(create).toBeEnabled();
  const founderBounds = await create.boundingBox();
  expect(founderBounds && founderBounds.y + founderBounds.height <= page.viewportSize()!.height).toBe(true);
  await expect(page.getByRole('button', { name: 'Nâng cấp gói PRO ngay', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Tùy chỉnh phòng', exact: true }).click();
  await page.getByRole('textbox', { name: 'Mã phòng (tùy chọn)', exact: true }).fill('nhom-hoc-toi');
  await expect(page.getByRole('textbox', { name: 'Mã phòng (tùy chọn)', exact: true })).toHaveValue('nhom-hoc-toi');
});

test('Adaptive wallpaper keeps dark images visible and bright text readable', async ({ page, workspace }, info) => {
  const mobile = info.project.name.includes('390');
  await page.route('https://wallpaper.example.test/**', route => route.fulfill({
    contentType: 'image/svg+xml', headers: { 'Access-Control-Allow-Origin': '*' },
    body: `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1200"><rect width="800" height="1200" fill="${route.request().url().endsWith('bright.svg') ? '#fff' : '#142336'}"/></svg>`
  }));
  await workspace.open();
  await expect(page.getByRole('timer', { name: 'Đồng hồ Pomodoro' })).toBeVisible();
  await page.evaluate(() => (window as any).useBackgroundStore.getState().setCustomBackground('https://wallpaper.example.test/dark.svg', 'image'));
  const overlay = page.getByTestId('background-overlay');
  await expect.poll(async () => Number(await overlay.evaluate(element => getComputedStyle(element).opacity))).toBeLessThanOrEqual(.15);
  await expect(page.getByTestId('background-image-element')).toBeVisible();
  await page.screenshot({ path: `artifacts/liquid-glass/${info.project.name}-wallpaper-dark.png` });
  await page.evaluate(() => (window as any).useBackgroundStore.getState().setCustomBackground('https://wallpaper.example.test/bright.svg', 'image'));
  await expect.poll(async () => Number(await overlay.evaluate(element => getComputedStyle(element).opacity))).toBeGreaterThan(.45);
  await audit(page, `${info.project.name}-wallpaper-bright`);
  await page.screenshot({ path: `artifacts/liquid-glass/${info.project.name}-wallpaper-bright.png` });
  if (mobile) {
    const play = page.getByRole('button', { name: 'Bắt đầu đếm giờ', exact: true });
    await play.tap(); await page.getByRole('button', { name: 'Tạm dừng đồng hồ', exact: true }).tap();
    await expect(page.getByTestId('mobile-phase-announcement')).toContainText('Tạm dừng');
    await workspace.eco(true);
    await expect(play).toHaveCSS('backdrop-filter', 'none');
  }
});

test('Mobile Settings stays in Header; Tools opens Notes and the learning routes', async ({ page, workspace }, info) => {
  test.skip(!info.project.name.includes('390'), 'Mobile navigation only');
  await workspace.open();
  const header = page.getByRole('banner');
  await header.getByRole('button', { name: 'Cài đặt', exact: true }).tap();
  await expect(page.getByTestId('mobile-settings-view')).toBeVisible();
  await expect(page.getByTestId('mobile-settings-shortcuts-grid')).toHaveCount(0);
  const tools = page.getByRole('tab', { name: 'Tiện ích', exact: true });
  await tools.tap(); await expect(tools).toHaveAttribute('aria-selected', 'true');
  for (const label of ['Meet', 'Ghi chú', 'Lịch', 'Thống kê']) {
    await expect(page.getByRole('button', { name: new RegExp('^' + label) })).toBeVisible();
  }
  await audit(page, `${info.project.name}-tools`);
  await page.screenshot({ path: `artifacts/liquid-glass/${info.project.name}-tools.png` });
  await page.getByRole('button', { name: /^Ghi chú/ }).tap();
  await expect(page.getByRole('textbox', { name: 'Nội dung ghi chú' })).toBeVisible();
  await page.getByRole('button', { name: 'Về tiện ích', exact: true }).tap();
  await page.getByRole('button', { name: /^Meet/ }).tap();
  await expect(page).toHaveURL(/\/rooms$/);
});
