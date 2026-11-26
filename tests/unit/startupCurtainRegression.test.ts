import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const html = readFileSync('index.html', 'utf8');
const script = html.match(/<script id="pomo-startup-guard">([\s\S]*?)<\/script>/)![1];
beforeEach(() => { vi.useFakeTimers(); document.body.innerHTML = '<div id="root"></div><div id="pomo-splash-curtain">PomoFocus</div>'; });
afterEach(() => { vi.runOnlyPendingTimers(); vi.useRealTimers(); document.body.innerHTML = ''; });
describe('Boot curtain with slow or failed startup', () => {
  it('removes the curtain on the first React commit without waiting for Auth/network', async () => {
    new Function(script)();
    document.getElementById('root')!.appendChild(document.createElement('main'));
    await Promise.resolve();
    expect(document.getElementById('pomo-splash-curtain')).toBeNull();
    expect(document.querySelector('[data-testid=boot-recovery]')).toBeNull();
  });
  it('replaces an empty root with a readable retry within 1.8 seconds', async () => {
    new Function(script)();
    vi.advanceTimersByTime(1799); expect(document.getElementById('pomo-splash-curtain')).not.toBeNull();
    vi.advanceTimersByTime(1); await Promise.resolve();
    expect(document.getElementById('pomo-splash-curtain')).toBeNull();
    expect(document.querySelector('[role=alert]')?.textContent).toContain('Thử mở lại');
  });
  it('never covers an ErrorBoundary fallback with the startup curtain', async () => {
    new Function(script)();
    const fallback = document.createElement('div'); fallback.setAttribute('data-testid', 'error-boundary-fallback');
    fallback.textContent = 'Không gian học tập đang tạm dừng'; document.getElementById('root')!.appendChild(fallback);
    await Promise.resolve(); vi.advanceTimersByTime(2000);
    expect(document.getElementById('pomo-splash-curtain')).toBeNull();
    expect(document.querySelector('[data-testid=error-boundary-fallback]')).not.toBeNull();
    expect(document.querySelector('[data-testid=boot-recovery]')).toBeNull();
  });
});
