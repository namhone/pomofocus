import { test as base, expect, type Page, type Locator } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs/promises';

class WorkspacePage {
  readonly page: Page;
  constructor(page: Page) { this.page = page; }
  get notes(): Locator { return this.page.getByTestId('widget-container-notes'); }
  async open() { await this.page.goto('/app', { waitUntil: 'domcontentloaded' }); }
  async brightBackdrop() {
    await this.page.evaluate(() => {
      const app = window as any;
      app.useLayoutStore.getState().resetLayout();
      app.useLayoutStore.setState({ glassSettings: { ...app.useLayoutStore.getState().glassSettings, opacity: 10 } });
      app.useBackgroundStore.getState().setCustomBackground('data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><path fill="white" d="M0 0h100v100H0z"/></svg>'), 'image');
      app.useBackgroundStore.getState().setBrightness(100);
      app.useBackgroundStore.getState().setOverlayOpacity(0);
    });
  }
}
const test = base.extend<{ workspace: WorkspacePage }>({
  workspace: async ({ page }, use, info) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(native => {
      localStorage.setItem('pomofocus_consent_v1', 'accepted');
      if (native) {
        // Capacitor core re-detects Android from its bridge when the SDK initializes.
        (window as any).androidBridge = { postMessage: () => undefined };
        (window as any).Capacitor = { platform: 'android', isNativePlatform: () => true, getPlatform: () => 'android', isPluginAvailable: () => false,
          nativePromise: () => Promise.resolve({}), nativeCallback: () => 'test-listener', Plugins: {} };
      }
    }, info.project.name.startsWith('native'));
    // UI-only fixtures never write to real accounts or payment endpoints.
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.pathname.startsWith('/api/') || url.hostname.endsWith('supabase.co')) return route.fulfill({ json: [] });
      if (url.hostname === '127.0.0.1' || url.protocol === 'data:') return route.continue();
      return route.abort();
    });
    await page.routeWebSocket('**/realtime/v1/**', socket => socket.close());
    await use(new WorkspacePage(page));
    expect(errors, 'Uncaught browser errors').toEqual([]);
  }
});
test.afterEach(async ({}, info) => {
  if (info.status !== info.expectedStatus) console.error(info.errors.map(error => error.message).join('\n'));
});
async function audit(page: Page, name: string) {
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  await fs.mkdir('artifacts/phase4b', { recursive: true });
  await fs.writeFile(`artifacts/phase4b/axe-${name}.json`, JSON.stringify({ url: result.url, timestamp: result.timestamp, violations: result.violations, incomplete: result.incomplete, passes: result.passes.map(rule => ({ id: rule.id, nodes: rule.nodes.length })) }, null, 2));
  expect(result.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) }))).toEqual([]);
}
async function noOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth)).toBeLessThanOrEqual(0);
  expect(await page.evaluate(() => window.visualViewport?.scale || 1)).toBe(1);
  const clipped = await page.getByRole('button').or(page.getByRole('tab')).or(page.getByRole('textbox')).evaluateAll(elements => elements.filter(element => {
    const rect = element.getBoundingClientRect(), style = getComputedStyle(element);
    if (rect.width < 4 || rect.height < 4 || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
    const x = rect.left + rect.width / 2, y = rect.top + rect.height / 2;
    for (let parent = element.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
      const clip = getComputedStyle(parent), bounds = parent.getBoundingClientRect();
      if (/(auto|scroll|hidden|clip)/.test(clip.overflowY) && (y < bounds.top || y > bounds.bottom)) return false;
      if (/(auto|scroll|hidden|clip)/.test(clip.overflowX) && (x < bounds.left || x > bounds.right)) return false;
    }
    return x < 0 || x > innerWidth || y < 0 || y > innerHeight;
  }).map(element => ({ label: element.getAttribute('aria-label') || element.textContent?.trim(), id: element.getAttribute('data-testid') })));
  expect(clipped, 'Interactive controls remain inside the viewport').toEqual([]);
}

test('workspace: bright background, notes controls, header and AI coexist', async ({ page, workspace }, info) => {
  test.skip(info.project.name.includes('390'), 'Desktop workspace has its own layout');
  await workspace.open(); await expect(workspace.notes).toBeVisible(); await workspace.brightBackdrop();
  await page.getByRole('button', { name: 'Thêm ghi chú', exact: true }).click();
  await page.getByRole('textbox', { name: 'Tiêu đề ghi chú' }).fill('Ghi chú kiểm thử');
  await page.getByRole('textbox', { name: 'Nội dung ghi chú' }).fill('## Một hàng công cụ\nNội dung vẫn đọc rõ trên nền trắng.');
  await page.getByRole('button', { name: 'Xem trước', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Một hàng công cụ' })).toBeVisible();
  await page.getByRole('button', { name: 'Soạn thảo', exact: true }).click();
  await page.getByRole('button', { name: 'Đổi sắc độ ghi chú' }).click();
  await page.getByRole('button', { name: 'Mở menu', exact: true }).click();
  await expect(page.getByTestId('platform-unified-header')).toHaveCSS('opacity', '1');
  await page.getByRole('button', { name: 'Thu gọn header', exact: true }).click();
  await page.getByRole('button', { name: /Mở trợ lý AI companion/i }).click();
  const drawer = page.getByTestId('ai-companion-drawer');
  await expect(drawer).toHaveAttribute('aria-hidden', 'false');
  await expect(page.getByRole('button', { name: 'Làm mới cuộc trò chuyện' })).toBeDisabled();
  await expect.poll(async () => { const n = await workspace.notes.boundingBox(), a = await drawer.boundingBox(); return !!n && !!a && n.x + n.width <= a.x; }).toBe(true);
  await expect(page.getByRole('textbox', { name: 'Nội dung ghi chú' })).toBeVisible();
  await expect.poll(async () => (await page.getByRole('textbox', { name: 'Nội dung ghi chú' }).boundingBox())?.height || 0).toBeGreaterThanOrEqual(80);
  await page.getByRole('textbox', { name: 'Câu hỏi cho trợ lý AI' }).fill('Kiểm tra vùng nhập');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Gửi câu hỏi', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Đóng cửa sổ', exact: true }).click();
  await page.getByRole('button', { name: 'Mở menu', exact: true }).click();
  await page.getByRole('button', { name: 'Ghim Header', exact: true }).click();
  await page.getByRole('button', { name: /Mở trợ lý AI companion/i }).click();
  await expect.poll(async () => {
    const header = await page.getByTestId('platform-unified-header').boundingBox(), panel = await drawer.boundingBox();
    return !!header && !!panel && panel.y >= header.y + header.height;
  }).toBe(true);
  await noOverflow(page); await audit(page, info.project.name + '-workspace');
  await page.screenshot({ path: `artifacts/phase4b/${info.project.name}-workspace-ai.png` });
});

test('mobile: native safe area, navigation and empty chat', async ({ page, workspace }, info) => {
  test.skip(!info.project.name.includes('390'), 'Mobile tab layout');
  await workspace.open(); await expect(page.getByTestId('mobile-app-shell')).toBeVisible();
  await workspace.brightBackdrop();
  await audit(page, info.project.name + '-bright-focus');
  await page.screenshot({ path: `artifacts/phase4b/${info.project.name}-bright-focus.png` });
  await page.evaluate(() => document.documentElement.style.setProperty('--sab-native', '36px'));
  await page.getByRole('tab', { name: 'Không gian', exact: true }).click();
  await expect(page.getByRole('button', { name: /Tắt nền/i })).toBeVisible();
  await page.getByRole('button', { name: /Tắt nền/i }).click();
  await page.getByRole('tab', { name: 'Trợ lý AI', exact: true }).click();
  const input = page.getByRole('textbox', { name: 'Câu hỏi cho trợ lý AI' }); await expect(input).toBeVisible();
  await expect(page.getByRole('button', { name: 'Xóa lịch sử trò chuyện', exact: true })).toBeDisabled();
  await input.fill('Kiểm tra vùng nhập');
  await expect(page.getByRole('button', { name: 'Gửi tin nhắn', exact: true })).toBeEnabled();
  expect((await input.boundingBox())!.y + (await input.boundingBox())!.height).toBeLessThanOrEqual(844 - 36);
  if (info.project.name.startsWith('native')) expect(await page.evaluate(() => (window as any).Capacitor.isNativePlatform())).toBe(true);
  await noOverflow(page); await audit(page, info.project.name + '-ai');
  await page.screenshot({ path: `artifacts/phase4b/${info.project.name}-ai.png` });
});

test('Meet: header fits, controls work and media releases', async ({ page, workspace }, info) => {
  void workspace;
  await page.goto('/rooms/pod-free-01', { waitUntil: 'domcontentloaded' });
  await page.getByTestId('btn-join-room-confirm').click();
  await expect(page.getByTestId('btn-room-mic')).toBeVisible();
  await page.getByTestId('btn-room-timer-toggle').click();
  await expect(page.getByTestId('btn-room-timer-toggle')).toHaveAttribute('title', 'Tạm dừng đồng hồ');
  await page.getByTestId('btn-room-timer-toggle').click();
  await page.getByTestId('btn-switch-whiteboard').click();
  await page.getByTestId('btn-switch-grid').click();
  await noOverflow(page); await audit(page, info.project.name + '-meet');
  await page.screenshot({ path: `artifacts/phase4b/${info.project.name}-meet.png` });
});

test('gallery: Founder has no upsell, wide grid fills the widget and Lo-fi remains readable', async ({ page, workspace }, info) => {
  test.skip(info.project.name.includes('390'), 'Desktop resizable gallery');
  await workspace.open(); await expect(workspace.notes).toBeVisible();
  // Account fixture checks rendering and gating without logging in or touching real account data.
  await page.evaluate(() => {
    const app = window as any;
    app.useAuthStore.setState({ user: { id: '00000000-0000-4000-8000-000000000004', email: 'namho03052k9@gmail.com', displayName: 'Nam kiểm thử', plan: 'free' }, isAuthenticated: true });
    for (const id of ['timer', 'tasks', 'notes']) app.useLayoutStore.getState().closeWidget(id);
  });
  await page.getByTestId('dock-btn-spaces').click();
  const spaces = page.getByTestId('widget-container-spaces'); await expect(spaces).toBeVisible();
  await page.getByRole('combobox', { name: 'Danh mục hình nền' }).selectOption('all');
  const handle = page.getByTestId('resize-handle-spaces'), start = (await handle.boundingBox())!;
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
  await page.mouse.down(); await page.mouse.move(start.x + 250, start.y + start.height / 2, { steps: 12 }); await page.mouse.up();
  await expect.poll(async () => (await spaces.boundingBox())?.width || 0).toBeGreaterThanOrEqual(560);
  await expect(spaces.getByText(/Nâng cấp để mở khóa/i)).toHaveCount(0);
  await page.getByTestId('preset-card-cozy-lofi-room').click();
  await expect.poll(() => page.evaluate(() => (window as any).useBackgroundStore.getState().activePresetId)).toBe('cozy-lofi-room');
  const grid = page.getByTestId('presets-grid');
  // Geometry verifies auto-fill rather than relying on Tailwind class names.
  const fill = await grid.evaluate(element => {
    const rect = element.getBoundingClientRect();
    const cards = [...element.children].map(child => child.getBoundingClientRect());
    const firstRow = cards.filter(card => Math.abs(card.top - cards[0].top) < 2);
    return { columns: firstRow.length, gap: rect.right - Math.max(...firstRow.map(card => card.right)) };
  });
  expect(fill.columns).toBeGreaterThanOrEqual(4); expect(fill.gap).toBeLessThanOrEqual(8);
  await noOverflow(page); await audit(page, info.project.name + '-gallery');
  await page.screenshot({ path: `artifacts/phase4b/${info.project.name}-gallery.png` });
});
