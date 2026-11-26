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
  await page.getByRole('button', { name: mobile ? 'Bắt đầu đếm giờ' : 'Bắt đầu phiên tập trung', exact: true }).click();
  await page.getByRole('button', { name: mobile ? 'Tạm dừng đồng hồ' : 'Tạm dừng phiên tập trung', exact: true }).click();
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
