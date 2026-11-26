import { test as base, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs/promises';

class Workspace {
  readonly page: Page;
  constructor(page: Page) { this.page = page; }
  async open() { await this.page.goto('/app', { waitUntil: 'domcontentloaded' }); }
  async phase(phase: string) {
    await this.page.evaluate(value => (window as any).useTimerStore.getState().setPhase(value), phase);
  }
}
const test = base.extend<{ workspace: Workspace }>({
  workspace: async ({ page }, use, info) => {
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => localStorage.setItem('pomofocus_consent_v1', 'accepted'));
    if (info.title.includes('native')) await page.addInitScript(() => {
      (window as any).androidBridge = { postMessage: () => undefined };
      (window as any).Capacitor = { platform: 'android', isNativePlatform: () => true, getPlatform: () => 'android', isPluginAvailable: () => false,
        nativePromise: () => Promise.resolve({}), nativeCallback: () => 'test-listener', Plugins: {} };
    });
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.pathname.startsWith('/api/') || url.hostname.endsWith('supabase.co')) return route.fulfill({ json: [] });
      return url.hostname === '127.0.0.1' ? route.continue() : route.abort();
    });
    await page.routeWebSocket('**/realtime/v1/**', socket => socket.close());
    await use(new Workspace(page));
    expect(errors).toEqual([]);
  }
});
test('320px: header spacing, keyboard focus and forced colors', async ({ page, workspace }) => {
  void workspace;
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/rooms', { waitUntil: 'domcontentloaded' });
  const header = page.getByTestId('platform-unified-header');
  const brand = header.getByTitle('Về trang chủ PomoFocus', { exact: true });
  const credits = page.getByTestId('header-ai-btn');
  await expect(brand).toBeVisible(); await expect(credits).toBeVisible();
  await expect.poll(async () => {
    const a = await brand.boundingBox(), b = await credits.boundingBox();
    return a && b ? b.x - a.x - a.width : -1;
  }).toBeGreaterThanOrEqual(8);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
  const login = page.getByTestId('header-login-btn');
  await expect(login).toBeVisible();
  await expect.poll(async () => { const bounds = await login.boundingBox(); return bounds ? bounds.x + bounds.width : 999; }).toBeLessThanOrEqual(320);
  await page.emulateMedia({ forcedColors: 'active' });
  await brand.focus(); await page.keyboard.press('Tab');
  await expect(credits).toBeFocused();
  await expect(credits).toHaveCSS('outline-style', 'solid');
  await expect(credits).toHaveCSS('outline-width', '2px');
  await fs.mkdir('artifacts/auth-avatar', { recursive: true });
  await page.screenshot({ path: 'artifacts/auth-avatar/header-320-forced-colors.png' });
  // axe reads authored text colors in forced-colors mode, not the UA's substituted
  // CanvasText (black in this screenshot). Audit authored contrast in normal mode.
  await page.emulateMedia({ forcedColors: 'none' });
  const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  await fs.mkdir('artifacts/auth-avatar', { recursive: true });
  await fs.writeFile('artifacts/auth-avatar/axe-320.json', JSON.stringify(audit, null, 2));
  expect(audit.violations).toEqual([]);
  await page.screenshot({ path: 'artifacts/auth-avatar/header-320.png' });
});
for (const viewport of [{ width: 1366, height: 768, native: false }, { width: 1440, height: 900, native: false }, { width: 390, height: 844, native: false }, { width: 390, height: 844, native: true }]) {
  test(`timer semantics and phase announcements ${viewport.width}${viewport.native ? '-native' : ''}`, async ({ page, workspace }) => {
    await page.setViewportSize(viewport); await workspace.open();
    const timer = page.getByRole('timer', { name: 'Đồng hồ Pomodoro' });
    await expect(timer).toBeVisible(); await expect(timer).toHaveAttribute('aria-live', 'off');
    const status = page.getByTestId(viewport.width === 390 ? 'mobile-phase-announcement' : 'timer-phase-announcement');
    await expect(status).toHaveAttribute('aria-live', 'polite');
    await workspace.phase('short_break'); await expect(status).toContainText('Nghỉ ngắn');
    await workspace.phase('pomodoro'); await expect(status).toContainText('Tập trung');
    await page.getByRole('button', { name: viewport.width === 390 ? 'Bắt đầu đếm giờ' : 'Bắt đầu phiên tập trung', exact: true }).click();
    const pause = page.getByRole('button', { name: viewport.width === 390 ? 'Tạm dừng đồng hồ' : 'Tạm dừng phiên tập trung', exact: true });
    await expect(pause).toBeVisible(); await pause.click();
    await expect(status).toContainText('Tạm dừng');
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    if (viewport.native) expect(await page.evaluate(() => (window as any).Capacitor.isNativePlatform())).toBe(true);
    await fs.mkdir('artifacts/auth-avatar', { recursive: true });
    await page.screenshot({ path: `artifacts/auth-avatar/timer-${viewport.width}${viewport.native ? '-native' : ''}.png` });
  });
}
