import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/db';
import { SyncQueueService } from '../../src/services/syncQueueService';

const owner = 'queue-owner';
const at = (offset: number) => new Date(Date.parse('2026-11-26T00:00:00Z') + offset).toISOString();
let cloud: any;
let beforePatch: (() => void) | undefined;
let missingFocus = false;
let changeAccount = false;
let queue: SyncQueueService;
const request = vi.fn(async (input: any, init?: RequestInit) => {
  const url = new URL(String(input)), method = init?.method || 'GET';
  if (missingFocus && url.pathname.endsWith('/focus_sessions')) return Response.json({ code: '42P01', message: 'relation does not exist' }, { status: 404 });
  if (method === 'GET') return Response.json(cloud ? [cloud] : []);
  const body = JSON.parse(String(init?.body)), value = Array.isArray(body) ? body[0] : body;
  if (method === 'PATCH') {
    beforePatch?.(); beforePatch = undefined;
    if ([...url.searchParams].some(([field, filter]) => filter.startsWith('eq.') && String(cloud?.[field]) !== filter.slice(3))) return Response.json([]);
  }
  if (method === 'POST' && cloud && !String(new Headers(init?.headers).get('Prefer')).includes('merge-duplicates')) return Response.json({ message: 'duplicate id', code: '23505' }, { status: 409 });
  cloud = { ...cloud, ...value };
  if (changeAccount) localStorage.setItem('pomodoro_study_auth_session', JSON.stringify({ id: 'different-account' }));
  return Response.json([cloud]);
});
beforeEach(async () => {
  queue = new SyncQueueService(); cloud = null; beforePatch = undefined; missingFocus = false; changeAccount = false;
  localStorage.clear(); localStorage.setItem('pomodoro_study_auth_session', JSON.stringify({ id: owner }));
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  request.mockClear(); vi.stubGlobal('fetch', request);
  await Promise.all([db.sync_queue.clear(), db.tasks.clear(), db.notes.clear(), db.focus_sessions.clear()]);
});
afterEach(() => { queue.stopAutoSync(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('Offline queue timestamp and account contracts through the real REST adapter', () => {
  it.each(['tasks', 'notes', 'projects'] as const)('never overwrites a newer %s record when replaying a stale offline edit', async tableName => {
    cloud = { id: 'row', user_id: owner, title: 'new', updated_at: at(300) };
    await queue.enqueueMutation({ userId: owner, tableName, recordId: 'row', action: 'UPDATE', payload: { title: 'stale', updatedAt: Date.parse(at(100)) } });
    expect((await queue.flushQueue(owner)).successCount).toBe(1);
    expect(cloud).toMatchObject({ title: 'new', updated_at: at(300) });
    expect(request.mock.calls.filter(([, init]) => init?.method === 'POST' || init?.method === 'PATCH')).toHaveLength(0);
  });
  it('uses a conditional update so a second device cannot be overwritten between read and write', async () => {
    cloud = { id: 'row', user_id: owner, title: 'old', updated_at: at(100) };
    beforePatch = () => { cloud = { ...cloud, title: 'second-device', updated_at: at(300) }; };
    const id = await queue.enqueueMutation({ userId: owner, tableName: 'tasks', recordId: 'row', action: 'UPDATE', payload: { title: 'first-device', updatedAt: Date.parse(at(200)) } });
    expect((await queue.flushQueue(owner)).failedCount).toBe(1);
    expect(cloud.title).toBe('second-device');
    expect(await db.sync_queue.get(id)).toMatchObject({ status: 'pending', retryCount: 1 });
    await db.sync_queue.update(id, { nextRetryAt: 0 });
    expect((await queue.flushQueue(owner)).successCount).toBe(1);
    expect(await db.sync_queue.get(id)).toBeUndefined();
  });
  it('stops the remaining flush batch when logout/account switching occurs during a request', async () => {
    changeAccount = true;
    await queue.enqueueMutation({ userId: owner, tableName: 'tasks', recordId: 'first', action: 'CREATE', payload: { title: 'first' } });
    const second = await queue.enqueueMutation({ userId: owner, tableName: 'tasks', recordId: 'second', action: 'CREATE', payload: { title: 'second' } });
    expect((await queue.flushQueue(owner)).successCount).toBe(1);
    expect(await db.sync_queue.get(second)).toMatchObject({ status: 'pending', userId: owner });
  });
  it('retains a focus session mutation when the remote table is unavailable instead of claiming sync success', async () => {
    missingFocus = true;
    const id = await queue.enqueueMutation({ userId: owner, tableName: 'focus_sessions', recordId: 'session', action: 'CREATE', payload: { completedAt: Date.parse(at(0)) } });
    expect((await queue.flushQueue(owner)).failedCount).toBe(1);
    expect(await db.sync_queue.get(id)).toMatchObject({ status: 'pending', retryCount: 1 });
  });
  it('never sends a queued wallet mutation even if an invalid persisted table name is injected', async () => {
    const id = await queue.enqueueMutation({ userId: owner, tableName: 'user_wallets' as any, recordId: 'wallet', action: 'UPDATE', payload: { credits_balance: 999999 } });
    expect((await queue.flushQueue(owner)).failedCount).toBe(1);
    expect(request).not.toHaveBeenCalled();
    expect(await db.sync_queue.get(id)).toBeDefined();
  });
});
