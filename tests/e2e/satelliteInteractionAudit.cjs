// Run against Vite: POMO_AUDIT_URL=http://127.0.0.1:4176 node tests/e2e/satelliteInteractionAudit.cjs
// Network boundaries are fixtures; clicks, routes, IndexedDB and stores are real.
const fs = require('node:fs');
const { chromium, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const base = process.env.POMO_AUDIT_URL || 'http://127.0.0.1:4176';
const output = process.env.POMO_AUDIT_OUTPUT || 'tests/results/android-smoke/satellite';
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const results = [];
  async function check(name, run, width = 1440, options = {}) {
    if (process.env.POMO_AUDIT_CASES && !new RegExp(process.env.POMO_AUDIT_CASES).test(name)) return;
    const context = await browser.newContext({ viewport: { width, height: options.height || (width < 768 ? 844 : 900) }, permissions: ['clipboard-read', 'clipboard-write'], serviceWorkers: 'block' });
    await context.addInitScript(() => localStorage.setItem('pomofocus_consent_v1', 'accepted'));
    const fixtureProfile = { id: 'f832193f-8f86-4cc0-a688-0d24cef2a035', email: 'satellite-audit@example.test', full_name: 'Người kiểm thử', handle: 'audit', plan: 'free', role: 'user', ai_credits_balance: 17, settings: {}, two_factor_enabled: false };
    if (options.member) await context.addInitScript(profile => {
      localStorage.setItem('sb_auth_session', JSON.stringify({ access_token: 'audit-fixture-no-real-token', expires_at: Date.now()/1000+3600, user: { id: profile.id, email: profile.email, user_metadata: { full_name: profile.full_name }, app_metadata: { role: 'user' } } }));
    }, fixtureProfile);
    if (options.native) await context.addInitScript(() => {
      window.androidBridge = { postMessage: () => {} };
      window.Capacitor = { platform: 'android', isNativePlatform: () => true, getPlatform: () => 'android', isPluginAvailable: () => false, nativePromise: () => Promise.resolve({}), nativeCallback: () => 'audit-listener', Plugins: {} };
    });
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (options.member && url.pathname === '/rest/v1/profiles') {
        if (route.request().method() === 'PATCH') Object.assign(fixtureProfile, route.request().postDataJSON());
        return route.fulfill({ json: [fixtureProfile] });
      }
      if (url.origin === base && !url.pathname.startsWith('/api/')) return route.continue();
      if (url.pathname.startsWith('/api/') || url.hostname.endsWith('supabase.co')) return route.fulfill({ json: [] });
      return route.abort();
    });
    await context.routeWebSocket('**/realtime/v1/**', ws => ws.close());
    const page = await context.newPage();
    page.setDefaultTimeout(8000);
    page.setDefaultNavigationTimeout(30000);
    console.log('START',name);
    const errors = [];
    const warnings = [];
    page.on('console', msg => { if (['warning', 'error'].includes(msg.type())) warnings.push({ type: msg.type(), text: msg.text() }); });
    page.on('pageerror', e => errors.push(e.message));
    try {
      await run(page);
      expect(errors).toEqual([]);
      expect(warnings.filter(w => /unique.*key|Warning:|Cannot update|unmounted|hydration|Invalid.*hook/i.test(w.text))).toEqual([]);
      results.push({ name, status: 'PASS', errors, warnings });
    } catch (e) {
      results.push({ name, status: 'FAIL', error: e.message, errors, warnings });
      fs.writeFileSync(`${output}/${name}.txt`, await page.getByRole('main').innerText().catch(() => page.content()));
    } finally {
      await page.screenshot({ path: `${output}/${name}.png`, fullPage: true }).catch(() => {});
      await context.close();
      fs.writeFileSync(`${output}/results.json`, JSON.stringify(results, null, 2));
      console.log(name, results.at(-1).status);
    }
  }
  const goto = (page, path) => page.goto(base + path, { waitUntil: 'domcontentloaded' });
  async function workspace(page, id = 'timer') {
    await goto(page, '/app');
    await expect(page.getByTestId('workspace-root')).toBeVisible();
    // Arrange one unobscured window. No production component is modified.
    await page.evaluate(id => {
      const s = window.useLayoutStore.getState();
      window.useLayoutStore.setState({ widgets: Object.fromEntries(Object.entries(s.widgets).map(([key, w]) => [key, { ...w, isOpen: key === id, isCollapsed: false, x: 100, y: 100, width: 600, height: 600 }])) });
    }, id);
    await expect(page.getByTestId(`widget-container-${id}`)).toBeVisible();
  }
  try {
    await check('rooms-guest-create', async p => {
      await goto(p, '/rooms');
      await p.getByRole('button', { name: 'Đăng nhập để tạo phòng' }).click();
      await expect(p).toHaveURL(/\/login$/);
    });
    for (const [name, code] of [['invalid', 'not-a-real-room'], ['valid', 'pod-free-01']]) {
      await check(`rooms-code-${name}`, async p => {
        await goto(p, '/rooms');
        await p.getByPlaceholder(/pomo-a1b2/).fill(code);
        await p.getByTestId('btn-join-room-code').click();
        await expect(p).toHaveURL(new RegExp('/rooms/' + code + '$'));
        if (name === 'invalid') await expect(p.getByText(/không tồn tại|không tìm thấy|không hợp lệ/i).first()).toBeVisible();
        else await expect(p.getByRole('button', { name: /Vào phòng|Tham gia|Bắt đầu/i }).first()).toBeVisible();
      });
    }
    await check('settings-persistence', async p => {
      await goto(p, '/settings');
      await p.getByTestId('input-setting-pomodoro').fill('32');
      await p.getByTestId('input-setting-short-break').fill('7');
      const chime = p.getByRole('button', { name: 'Chuông pha lê', exact: true });
      await chime.click();
      const slider = p.getByRole('slider').first();
      await slider.focus(); await slider.press('Home'); await slider.press('ArrowRight');
      const before = await p.evaluate(() => ({ timer: window.useTimerStore.getState().settings, audio: window.useAudioStore.getState().settings }));
      await p.reload();
      await expect(p.getByTestId('input-setting-pomodoro')).toHaveValue('32');
      await expect(p.getByTestId('input-setting-short-break')).toHaveValue('7');
      await expect.poll(() => p.evaluate(() => window.useAudioStore.getState().settings)).toEqual(before.audio);
    });
    await check('dashboard-filters', async p => {
      await goto(p, '/dashboard');
      for (const name of ['7 ngày qua', 'Tuần này', 'Tháng này']) {
        await p.getByRole('button', { name, exact: true }).click();
        await expect(p.getByTestId('focus-trend-chart')).toBeVisible();
      }
    });
    await check('privacy-refresh-export-cancel', async p => {
      await goto(p, '/privacy-data');
      await p.getByRole('button', { name: 'Làm mới' }).click();
      const download = p.waitForEvent('download');
      await p.getByRole('button', { name: 'Xuất tệp JSON', exact: true }).click();
      const file = await download; await file.saveAs(`${output}/export.json`);
      expect(() => JSON.parse(fs.readFileSync(`${output}/export.json`, 'utf8'))).not.toThrow();
      await p.getByRole('button', { name: 'Xóa sạch dữ liệu cục bộ' }).click();
      await expect(p.getByTestId('clear-data-confirm-modal')).toBeVisible();
      await expect(p.getByTestId('btn-confirm-delete-execute')).toBeDisabled();
      await p.getByRole('button', { name: 'Hủy', exact: true }).click();
      await expect(p.getByTestId('clear-data-confirm-modal')).toHaveCount(0);
    });
    await check('help-all-faq', async p => {
      await goto(p, '/help');
      const root = p.getByTestId('help-view');
      const faqs = root.getByRole('button', { expanded: false }).or(root.getByRole('button', { expanded: true }));
      await expect(faqs).toHaveCount(5);
      for (let i = 0; i < 5; i++) {
        const q = faqs.nth(i);
        if (await q.getAttribute('aria-expanded') === 'true') await q.click();
        await q.click(); await expect(q).toHaveAttribute('aria-expanded', 'true');
        await q.click(); await expect(q).toHaveAttribute('aria-expanded', 'false');
      }
    }, 390);
    await check('contact-valid-submit', async p => {
      await goto(p, '/contact');
      await p.getByLabel('Họ và tên *', { exact: true }).fill('Nguyễn Văn A');
      await p.getByLabel('Địa chỉ email *', { exact: true }).fill('audit@example.test');
      await p.getByLabel('Nội dung tin nhắn *', { exact: true }).fill('Kiểm thử giao diện, không gửi email thật.');
      await p.getByRole('button', { name: 'Gửi thông điệp', exact: true }).click();
      await expect(p.getByText('Nội dung email đã sẵn sàng', { exact: true })).toBeVisible();
      await expect(p.getByText(/chưa xác nhận thư đã được gửi/)).toBeVisible();
    }, 390);
    await check('contact-copy-email', async p => {
      await goto(p, '/contact');
      await p.getByTestId('contact-view').getByRole('button', { name: 'Sao chép vào bộ nhớ tạm' }).click();
      expect(await p.evaluate(() => navigator.clipboard.readText())).toBe('support@pomofocus.vn');
    }, 390);
    await check('workspace-timer', async p => {
      await workspace(p);
      for (const id of ['short_break', 'long_break', 'pomodoro']) {
        await p.getByTestId(`tab-${id}`).click();
        await expect.poll(() => p.evaluate(() => window.useTimerStore.getState().phase)).toBe(id);
      }
      await p.getByTestId('timer-start-btn').click(); await expect(p.getByTestId('timer-pause-btn')).toBeVisible();
      await p.getByTestId('timer-pause-btn').click(); await expect(p.getByTestId('timer-resume-btn')).toBeVisible();
      await p.getByTestId('timer-skip-btn').click();
      await p.getByTestId('timer-reset-btn').click();
      await expect.poll(() => p.evaluate(() => window.useTimerStore.getState().status)).toBe('idle');
    });
    await check('workspace-mini-pill-lock', async p => {
      await workspace(p);
      await p.evaluate(() => window.useLayoutStore.getState().setLayoutEditMode(true));
      await p.getByTestId('lock-widget-timer').click();
      await expect.poll(() => p.evaluate(() => window.useLayoutStore.getState().widgets.timer.isLocked)).toBe(true);
      await p.getByTestId('lock-widget-timer').click();
      await p.getByTestId('btn-toggle-mini-pill-timer').click();
      await p.getByTestId('mini-timer-play-btn').click();
      await expect.poll(() => p.evaluate(() => window.useTimerStore.getState().status)).toBe('running');
      await p.getByTestId('mini-timer-play-btn').click();
      await expect.poll(() => p.evaluate(() => window.useTimerStore.getState().status)).toBe('paused');
      await p.getByTestId('mini-timer-expand-btn').click();
      await expect(p.getByTestId('timer-resume-btn')).toBeVisible();
    });
    await check('workspace-audio', async p => {
      await workspace(p, 'sounds');
      await p.getByTestId('tab-ambient').click();
      const track = p.getByRole('button', { name: /^Bật / }).first();
      await track.click();
      const slider = p.getByRole('slider', { name: /^Âm lượng / }).first();
      await slider.focus(); await slider.press('Home'); await slider.press('ArrowRight');
      await expect(slider).not.toHaveValue('0');
    });
    await check('workspace-media', async p => {
      await workspace(p, 'media');
      await p.getByTestId('btn-toggle-media-picker').click();
      await expect(p.getByTestId('media-station-picker-popover')).toBeVisible();
      await p.getByTestId('btn-close-media-picker').click();
      await p.getByTestId('btn-media-toggle-play').click();
      await p.getByTestId('btn-media-next-video').click();
      await expect(p.getByTestId('media-widget-root')).toBeVisible();
    });
    await check('workspace-calendar', async p => {
      await workspace(p, 'calendar');
      await expect(p.getByTestId('widget-container-calendar')).toBeVisible();
      await p.getByRole('button', { name: 'Thêm kế hoạch vào khung giờ', exact: true }).first().click();
      await p.getByRole('textbox').first().fill('Lịch kiểm thử');
      await p.getByRole('button', { name: 'Lưu', exact: true }).click();
      await expect(p.getByText('Lịch kiểm thử', { exact: true })).toBeVisible();
    });
    await check('workspace-spaces', async p => {
      await workspace(p, 'spaces');
      await p.getByTestId('spaces-tab-audio').click();
      await p.getByTestId('spaces-tab-wallpapers').click();
      await p.getByRole('textbox', { name: 'Tìm hình nền' }).fill('Anime');
      await p.getByTestId('btn-toggle-adjustments').click();
      await expect(p.getByTestId('bg-adjustments-panel')).toBeVisible();
    });
    for (const name of ['credits', 'settings', 'home', 'avatar']) {
      await check(`workspace-capsule-${name}`, async p => {
        await workspace(p);
        const ids = { credits: 'capsule-credits-btn', settings: 'capsule-settings-btn', home: 'capsule-home-btn', avatar: 'capsule-avatar-btn' };
        await p.getByTestId(ids[name]).click();
        if (name === 'home') await expect(p).toHaveURL(base + '/');
        else if (name === 'avatar') await expect(p.getByTestId('guest-quick-menu-modal')).toBeVisible();
        else if (name === 'settings') await expect(p.getByTestId('widget-container-settings')).toBeVisible();
        else await expect(p.getByTestId('ai-credits-topup-modal')).toBeVisible();
      });
    }
    await check('workspace-credits-guest-login', async p => {
      await workspace(p);
      await p.getByTestId('capsule-credits-btn').click();
      await p.getByTestId('btn-login-to-topup').click();
      await expect(p).toHaveURL(/\/login$/);
    });
    await check('workspace-native-discipline-pocket', async p => {
      await p.addInitScript(() => {
        window.androidBridge = { postMessage: () => {} };
        window.Capacitor = { platform: 'android', isNativePlatform: () => true, getPlatform: () => 'android', isPluginAvailable: () => false, nativePromise: () => Promise.resolve({}), nativeCallback: () => 'audit-listener', Plugins: {} };
      });
      await goto(p, '/app');
      await expect(p.getByTestId('mobile-app-shell')).toBeVisible();
      await p.getByTestId('mobile-strict-mode-toggle').click();
      await expect(p.getByTestId('mobile-strict-mode-toggle')).toHaveAttribute('aria-pressed', 'true');
      await p.getByTestId('mobile-strict-mode-toggle').click();
      await p.getByTestId('mobile-pocket-lock-btn').click();
      await expect(p.getByTestId('mobile-pocket-lock-overlay')).toBeVisible();
      await p.getByTestId('mobile-pocket-unlock-pad').click({ delay: 1700 });
      await expect(p.getByTestId('mobile-pocket-lock-overlay')).toHaveCount(0);
    }, 390);
    await check('workspace-audio-drag', async p => {
      await workspace(p, 'sounds'); await p.getByTestId('tab-ambient').click();
      await p.getByRole('button', { name: /^Bật / }).first().click();
      const slider = p.getByRole('slider', { name: /^Âm lượng / }).first();
      const box = await slider.boundingBox();
      await p.mouse.move(box.x + box.width * .5, box.y + box.height / 2);
      await p.mouse.down(); await p.mouse.move(box.x + box.width * .3, box.y + box.height / 2, { steps: 8 }); await p.mouse.up();
      const value = Number(await slider.inputValue()); expect(value).toBeGreaterThan(0); expect(value).toBeLessThan(.5);
    });
    await check('contact-validation-targets', async p => {
      await goto(p, '/contact'); const root = p.getByTestId('contact-view');
      for (const el of [root.getByRole('link', { name: 'support@pomofocus.vn' }), root.getByRole('button', { name: 'Sao chép vào bộ nhớ tạm' }), root.getByRole('button', { name: 'Gửi thông điệp', exact: true })]) {
        const r = await el.boundingBox(); expect(r.width).toBeGreaterThanOrEqual(44); expect(r.height).toBeGreaterThanOrEqual(44);
      }
      await root.getByRole('button', { name: 'Gửi thông điệp', exact: true }).click();
      await expect(p.getByLabel('Họ và tên *', { exact: true })).toBeFocused();
      expect(await p.getByLabel('Họ và tên *', { exact: true }).evaluate(el => getComputedStyle(el).scrollMarginTop)).toBe('84px');
      expect((await p.getByLabel('Họ và tên *', { exact: true }).boundingBox()).y).toBeGreaterThanOrEqual(56);
    }, 360);
    await check('six-pages-mobile-style', async p => {
      for (const path of ['/contact', '/not-found-404', '/rooms?desktop=1', '/dashboard?desktop=1', '/settings?desktop=1', '/help']) {
        await goto(p, path); const h1 = p.getByRole('heading', { level: 1 }).last(); await expect(h1).toBeVisible();
        expect(await h1.evaluate(el => getComputedStyle(el).color), path).toBe('rgb(236, 239, 244)');
        expect(await p.evaluate(() => document.documentElement.scrollWidth - innerWidth), path).toBe(0);
        await p.screenshot({ path: output + '/six-' + path.slice(1).replace(/[^a-z0-9-]/gi, '-') + '.png', fullPage: true });
      }
    }, 390);
    // Deep satellite checks: no desktop query is used in any of these cases.
    for (const path of ['/calendar', '/dashboard', '/rooms', '/settings']) {
      await check('deep-mobile-web-' + path.slice(1), async p => {
        await goto(p, path); await expect(p.getByTestId('mobile-web-portal')).toBeVisible();
        expect(await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
      }, 360, { height: 800 });
      await check('deep-native-layout-' + path.slice(1), async p => {
        await goto(p, path); await expect(p.getByTestId('mobile-web-portal')).toHaveCount(0);
        await expect(p.getByRole('heading', { level: 1 }).last()).toBeVisible();
        expect(await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
        if (path === '/rooms') await expect(p.getByRole('button', { name: /Vào học .1 chạm./ })).toHaveCount(10);
      }, 360, { height: 800, native: true });
    }
    await check('deep-calendar-crud', async p => {
      await goto(p, '/calendar');
      await p.getByRole('button', { name: 'Tuần', exact: true }).click();
      expect(await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
      await p.getByRole('button', { name: 'Ngày', exact: true }).click();
      await p.getByRole('button', { name: 'Kỳ sau', exact: true }).click();
      await p.getByRole('button', { name: 'Hôm nay', exact: true }).click();
      await p.getByRole('button', { name: 'Thêm lịch học', exact: true }).click();
      await p.getByTestId('btn-submit-schedule').click();
      await expect(p.getByRole('dialog')).toBeVisible();
      await p.getByLabel('Nội dung phiên học', { exact: true }).fill('   ');
      await p.getByTestId('btn-submit-schedule').click();
      await expect(p.getByRole('alert')).toContainText('Vui lòng nhập');
      await p.getByLabel('Nội dung phiên học', { exact: true }).fill('Lịch học kiểm thử dài ở màn hình hẹp');
      // Tamper a DOM option to prove the submit handler rejects an invalid hour too.
      await p.getByLabel('Giờ bắt đầu', { exact: true }).evaluate(el => el.add(new Option('Giờ sai', '25')));
      await p.getByLabel('Giờ bắt đầu', { exact: true }).selectOption('25');
      await p.getByTestId('btn-submit-schedule').click(); await expect(p.getByRole('alert')).toContainText('6:00');
      await p.getByLabel('Giờ bắt đầu', { exact: true }).selectOption('9');
      await p.getByTestId('btn-submit-schedule').click(); await expect(p.getByRole('dialog')).toHaveCount(0);
      await p.getByRole('button', { name: /^Sửa lịch học Lịch học kiểm thử/ }).click();
      await p.getByLabel('Nội dung phiên học', { exact: true }).fill('Lịch đã sửa');
      await p.getByTestId('btn-submit-schedule').click();
      await p.reload(); await expect(p.getByRole('button', { name: 'Sửa lịch học Lịch đã sửa', exact: true })).toBeVisible();
      await p.getByTestId('btn-delete-schedule').click(); await p.reload();
      await expect(p.getByRole('button', { name: 'Sửa lịch học Lịch đã sửa', exact: true })).toHaveCount(0);
    }, 360, { height: 800, native: true });
    await check('deep-profile-member-validation', async p => {
      await goto(p, '/profile'); await expect(p.getByTestId('profile-view')).toBeVisible();
      await p.getByTestId('btn-toggle-edit-profile').click();
      await p.getByTestId('input-edit-display-name').fill('   '); await p.getByTestId('btn-save-profile').click();
      await expect(p.getByText('Vui lòng nhập tên hiển thị.', { exact: true })).toBeVisible();
      await p.getByTestId('input-edit-display-name').fill('Hoàng Nam Kiểm Thử'); await p.getByTestId('btn-save-profile').click();
      await expect(p.getByTestId('profile-display-name')).toHaveText('Hoàng Nam Kiểm Thử');
      await p.reload(); await expect(p.getByTestId('profile-display-name')).toHaveText('Hoàng Nam Kiểm Thử');
    }, 360, { height: 800, member: true });
    await check('deep-security-password', async p => {
      await goto(p, '/account/security'); await expect(p.getByTestId('account-security-view')).toBeVisible();
      // The fixture explicitly selects password auth; production auth handlers are unchanged.
      await expect(p.getByTestId('input-google-secondary-password')).toBeVisible();
      await p.evaluate(() => window.useAuthStore.setState(s => ({ user: { ...s.user, authProvider: 'password', googleId: undefined, isGoogleLinked: false } })));
      await p.getByTestId('input-old-password').fill('CurrentFixture123!');
      await p.getByTestId('input-new-password').fill('abc'); await p.getByTestId('input-confirm-password').fill('abc');
      await p.getByTestId('btn-submit-change-password').click(); await expect(p.getByText(/Mật khẩu mới phải có ít nhất/)).toBeVisible();
      await p.getByTestId('input-new-password').fill('NewFixture123!'); await p.getByTestId('input-confirm-password').fill('Different123!');
      await p.getByTestId('btn-submit-change-password').click(); await expect(p.getByText('Mật khẩu xác nhận không khớp.', { exact: true })).toBeVisible();
    }, 360, { height: 800, member: true });
    await check('deep-security-totp', async p => {
      await goto(p, '/account/security'); await expect(p.getByTestId('account-security-view')).toBeVisible();
      await p.getByTestId('btn-open-totp-setup').click(); await expect(p.getByRole('dialog')).toBeVisible();
      const secret = (await p.getByRole('dialog').getByText(/^[A-Z2-7]{4}( [A-Z2-7]{4})+$/).innerText()).replace(/ /g, '');
      const code = await p.evaluate(async secret => (await import('/src/services/totpService.ts')).calculateTotpCode(secret), secret);
      await p.getByTestId('input-totp-verify-code').fill(code); await p.getByTestId('btn-confirm-enable-totp').click();
      await expect(p.getByTestId('btn-disable-2fa')).toBeVisible();
      await p.getByTestId('btn-disable-2fa').click(); await expect(p.getByRole('dialog', { name: 'Tắt xác thực hai bước' })).toBeVisible();
      await p.getByTestId('btn-confirm-disable-2fa').click(); await expect(p.getByTestId('btn-open-totp-setup')).toBeVisible();
    }, 360, { height: 800, member: true });
    await check('deep-privacy-keyboard', async p => {
      await goto(p, '/privacy-data'); const opener = p.getByTestId('btn-open-clear-data-modal');
      await opener.focus(); await p.keyboard.press('Enter'); await expect(p.getByRole('dialog')).toBeVisible();
      const close = p.getByRole('button', { name: 'Đóng hộp thoại', exact: true }); await expect(close).toBeFocused();
      await p.keyboard.press('Shift+Tab'); await expect(p.getByRole('button', { name: 'Hủy', exact: true })).toBeFocused();
      await p.keyboard.press('Tab'); await expect(close).toBeFocused();
      await p.keyboard.press('Escape'); await expect(p.getByRole('dialog')).toHaveCount(0); await expect(opener).toBeFocused();
    }, 360, { height: 800 });
    for (const {member,desktop} of [{member:false,desktop:false},{member:true,desktop:false},{member:false,desktop:true}]) await check('deep-a11y-' + (desktop ? 'desktop' : member ? 'member' : 'public'), async p => {
      const scans = [];
      const paths = member ? ['/profile', '/account/security'] : ['/contact','/help','/terms','/privacy','/about','/privacy-data','/calendar','/dashboard','/rooms','/settings','/not-found-404'];
      for (const path of paths) {
        await goto(p, path); await expect(p.getByRole('heading', { level: 1 }).last()).toBeVisible();
        if (member) await expect(p.getByTestId(path === '/profile' ? 'profile-view' : 'account-security-view')).toBeVisible();
        const scan = async state => {
          const violations = (await new AxeBuilder({ page: p }).withTags(['wcag2a','wcag2aa','wcag21aa','best-practice']).analyze()).violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) }));
          const small = await p.getByRole('button').evaluateAll(items => items.filter(el => el.closest('.satellite-content') && el.getBoundingClientRect().width && (el.getBoundingClientRect().width < 44 || el.getBoundingClientRect().height < 44)).map(el => ({ name: el.getAttribute('aria-label') || el.textContent.trim(), width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height })));
          scans.push({ path, state, violations, small }); fs.writeFileSync(output + '/a11y-' + (desktop ? 'desktop' : member ? 'member' : 'public') + '.json',JSON.stringify(scans,null,2));
        };
        await scan('page');
        if (member && path === '/profile') { await p.getByTestId('btn-toggle-edit-profile').click(); await scan('edit'); }
        if (member && path === '/account/security') { await p.getByTestId('btn-open-totp-setup').click(); await scan('totp'); await p.keyboard.press('Escape'); }
      }
      const owned = scans.flatMap(s => s.violations.flatMap(v => v.nodes.filter(n => !n.target.some(t => /shared-footer|platform-|capsule-|cookie-|header-|guest-menu/.test(t))).map(n => ({ path:s.path, state:s.state, id:v.id, node:n }))));
      fs.writeFileSync(output + '/a11y-owned-' + (desktop ? 'desktop' : member ? 'member' : 'public') + '.json', JSON.stringify(owned,null,2));
      expect(owned).toEqual([]); expect(scans.flatMap(s => s.small)).toEqual([]);
    }, desktop ? 1440 : 360, { height: desktop ? 900 : 800, member, native: !member && !desktop });
    await check('deep-links-and-keyboard', async p => {
      const files = ['ContactView','HelpView','LegalViews','PrivacyDataView','ProfileView','AccountSecurityView','DedicatedCalendarView','DashboardView','SettingsView','StudyRoomLobby'];
      const targets = new Set();
      for (const file of files) {
        const source = fs.readFileSync('src/components/' + file + '.tsx', 'utf8');
        for (const match of source.matchAll(/navigate\(\s*['"]([^'"]+)['"]\s*\)/g)) if(match[1].startsWith('/')) targets.add(match[1]);
      }
      await goto(p, '/help');
      const firstFaq = p.getByTestId('help-view').getByRole('button', { name: 'Dữ liệu công việc và thời gian Pomodoro của tôi được lưu ở đâu?' });
      await firstFaq.focus(); await p.keyboard.press('Enter'); await expect(firstFaq).toHaveAttribute('aria-expanded','false');
      await p.keyboard.press('Tab'); await expect(p.getByRole('button', { name: 'Gói Free và PRO khác nhau như thế nào?' })).toBeFocused();
      await p.keyboard.press('Shift+Tab'); await expect(firstFaq).toBeFocused();
      for(const path of ['/contact','/help','/terms','/privacy','/about','/privacy-data','/calendar','/dashboard','/settings','/rooms','/profile','/account/security']){
        await goto(p,path);
        const links = await p.getByRole('link').evaluateAll(items => items.filter(el => el.closest('.satellite-content')).map(el=>el.getAttribute('href')));
        for(const href of links) if(href && href.startsWith('/') && !href.startsWith('//')) targets.add(href);
      }
      for(const target of targets){ await goto(p,target); await expect(p.getByTestId('not-found-page')).toHaveCount(0); }
      fs.writeFileSync(output+'/link-targets.json',JSON.stringify([...targets],null,2));
    });
    await check('deep-member-keyboard-style-contrast', async p => {
      await goto(p, '/profile'); await expect(p.getByTestId('profile-view')).toBeVisible();
      await p.getByTestId('btn-toggle-edit-profile').focus(); await p.keyboard.press('Enter');
      const name=p.getByTestId('input-edit-display-name'); await name.focus();
      await p.keyboard.press('Tab'); await expect(p.getByTestId('input-edit-username')).toBeFocused();
      await p.keyboard.press('Shift+Tab'); await expect(name).toBeFocused();
      const styles = await name.evaluate(el=>({placeholder:getComputedStyle(el,'::placeholder').color, border:getComputedStyle(el).borderTopColor,background:getComputedStyle(el).backgroundColor,outline:getComputedStyle(el).outlineWidth}));
      expect(styles.placeholder).toBe('rgb(161, 169, 184)'); expect(styles.border).toBe('rgb(95, 105, 122)');
      const save = p.getByTestId('btn-save-profile');
      const button = await save.evaluate(el=>({bg:getComputedStyle(el).backgroundColor,color:getComputedStyle(el).color}));
      expect(button).toEqual({bg:'rgb(96, 165, 250)',color:'rgb(11, 17, 32)'});
      fs.writeFileSync(output+'/member-styles.json',JSON.stringify({styles,button},null,2));
    },360,{height:800,member:true});
    await check('deep-calendar-week-card', async p => {
      await goto(p,'/calendar'); await p.getByRole('button',{name:'Thêm lịch học',exact:true}).click();
      await p.getByLabel('Nội dung phiên học',{exact:true}).fill('Kiểm tra tiêu đề rất dài trong cột lịch tuần hẹp');
      await p.getByTestId('btn-submit-schedule').click(); await expect(p.getByRole('dialog')).toHaveCount(0);
      await p.getByRole('button',{name:'Tuần',exact:true}).click();
      const edit=p.getByRole('button',{name:/^Sửa lịch học Kiểm tra tiêu đề rất dài/});
      await expect(edit).toBeVisible(); await edit.scrollIntoViewIfNeeded();
      const geometry=await edit.evaluate(el=>{const card=el.closest('[title]');const r=card.getBoundingClientRect();return [...card.querySelectorAll('button')].map(b=>{const q=b.getBoundingClientRect();return {width:q.width,height:q.height,contained:q.left>=r.left&&q.right<=r.right,name:b.getAttribute('aria-label')||b.title||b.textContent}})});
      fs.writeFileSync(output+'/week-card-geometry.json',JSON.stringify(geometry,null,2));
      expect(geometry.every(x=>x.contained&&x.width>=44&&x.height>=44)).toBe(true);
      expect(await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBe(0);
    },360,{height:800,native:true});
    for (const width of [360, 390, 1440]) {
      await check(`satellite-layout-${width}`, async p => {
        for (const path of ['/contact', '/help', '/terms', '/privacy', '/about', '/privacy-data', '/not-found-404']) {
          await goto(p, path); await expect(p.getByRole('heading', { level: 1 }).last()).toBeVisible();
          expect(await p.evaluate(() => document.documentElement.scrollWidth - innerWidth), path).toBe(0);
          await p.screenshot({ path: `${output}/layout-${width}-${path.slice(1)}.png` });
        }
      }, width);
    }
  } finally { await browser.close(); }
  console.log(JSON.stringify(results.map(({ name, status }) => ({ name, status }))));
  process.exitCode = results.some(x => x.status === 'FAIL') ? 1 : 0;
})().catch(e => { console.error(e); process.exitCode = 1; });
