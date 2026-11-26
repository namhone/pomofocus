import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Only HTTP, WebSocket and state owners are fixtures. Adapter, workspace service,
// task/note merge services and each device's independent IndexedDB run unchanged.
const cloud = new Map<string, Map<string, any>>();
const devices: any[] = [];
const rows = (table: string) => {
  if (!cloud.has(table)) cloud.set(table, new Map());
  return cloud.get(table)!;
};
class Socket {
  static OPEN = 1;
  static all: Socket[] = [];
  readyState = 0;
  sent: any[] = [];
  onopen: any; onmessage: any; onclose: any; onerror: any;
  constructor(public url: string) { Socket.all.push(this); }
  send(value: string) { this.sent.push(JSON.parse(value)); }
  close() { this.readyState = 3; this.onclose?.(); }
  join() {
    this.readyState = 1; this.onopen?.();
    this.onmessage?.({ data: JSON.stringify({ event: 'phx_reply', ref: this.sent[0].ref, payload: { status: 'ok', response: {} } }) });
  }
  change(table: string, type: string, record: any, old = {}) {
    this.onmessage?.({ data: JSON.stringify({ event: 'postgres_changes', payload: { data: { schema: 'public', table, type, record, old_record: old } } }) });
  }
}
function publish(table: string, row: any, type = 'UPDATE') {
  for (const socket of Socket.all) if (socket.readyState === 1) socket.change(table, type, row, type === 'DELETE' ? row : {});
}
function matches(row: any, url: URL) {
  return [...url.searchParams].every(([field, filter]) => !filter.startsWith('eq.') || String(row[field]) === filter.slice(3));
}
async function transport(input: any, init?: RequestInit) {
  const url = new URL(String(input)), table = url.pathname.split('/').pop()!;
  const method = init?.method || 'GET';
  if (!url.pathname.startsWith('/rest/v1/')) throw new Error('Unexpected network request: ' + url.pathname);
  if (method === 'GET') return Response.json([...rows(table).values()].filter(row => matches(row, url)));
  if (method === 'POST' || method === 'PATCH') {
    const body = JSON.parse(String(init?.body)), payloads = Array.isArray(body) ? body : [body];
    const output: any[] = [];
    for (const payload of payloads) {
      if (method === 'PATCH') {
        for (const [id, current] of rows(table)) if (matches(current, url)) {
          const updated = { ...current, ...payload }; rows(table).set(id, updated); output.push(updated); publish(table, updated);
        }
      } else {
        const current = rows(table).get(payload.id);
        if (current && !String(new Headers(init?.headers).get('Prefer')).includes('merge-duplicates')) return Response.json({ code: '23505', message: 'duplicate id' }, { status: 409 });
        const updated = { ...current, ...payload }; rows(table).set(payload.id, updated); output.push(updated); publish(table, updated, current ? 'UPDATE' : 'INSERT');
      }
    }
    return Response.json(output);
  }
  throw new Error('Unexpected method ' + method);
}
async function device(name: string) {
  const cache = new Dexie('two-device-contract-' + name);
  cache.version(1).stores({ tasks: 'id,userId,updatedAt', notes: 'id,userId,updatedAt', projects: 'id,userId', focus_sessions: 'id,userId,completedAt', sync_queue: 'id,userId,createdAt' });
  const d: any = { cache, user: { id: 'account-a' }, tasks: [], notes: [], credits: 50 };
  vi.resetModules();
  vi.doMock('../../src/db', () => ({ db: Object.fromEntries(cache.tables.map(table => [table.name, table])) }));
  vi.doMock('../../src/stores/useAuthStore', () => ({ useAuthStore: { getState: () => ({ user: d.user, loadUserFromCloud: d.authLoad }) } }));
  vi.doMock('../../src/stores/useTaskStore', () => ({ useTaskStore: {
    getState: () => ({ loadTasksAndProjects: d.loadTasks, activeTaskId: null }),
    setState: (fn: any) => Object.assign(d, typeof fn === 'function' ? fn(d) : fn)
  } }));
  vi.doMock('../../src/stores/useNoteStore', () => ({ useNoteStore: {
    getState: () => ({ loadNotes: d.loadNotes }),
    setState: (fn: any) => Object.assign(d, typeof fn === 'function' ? fn(d) : fn)
  } }));
  vi.doMock('../../src/stores/useAiStore', () => ({ useAiStore: { getState: () => ({ refreshCreditsFromCloud: d.refreshCredits }) } }));
  vi.doMock('../../src/services/profileService', () => ({ ProfileService: { fetchProfile: async () => null } }));
  const { supabase } = await import('../../src/lib/supabase');
  const { TaskCloudService } = await import('../../src/services/taskCloudService');
  const { NoteCloudService } = await import('../../src/services/noteCloudService');
  d.api = supabase;
  d.authLoad = vi.fn(async () => undefined);
  d.loadTasks = vi.fn(async () => {
    const result = await TaskCloudService.syncFromCloud('account-a');
    if (d.user?.id === 'account-a') d.tasks = result.tasks;
  });
  d.loadNotes = vi.fn(async () => {
    const result = await NoteCloudService.syncFromCloud('account-a');
    if (d.user?.id === 'account-a') d.notes = result;
  });
  d.refreshCredits = vi.fn(async () => {
    const { data } = await supabase.from('user_wallets').select('*').eq('user_id', 'account-a').single();
    if (d.user?.id === 'account-a') d.credits = data?.credits_balance;
  });
  const { subscribeWorkspaceRealtime } = await import('../../src/services/workspaceRealtimeService');
  d.stop = subscribeWorkspaceRealtime('account-a');
  d.socket = Socket.all.at(-1)!;
  devices.push(d);
  return d;
}
const now = '2026-11-26T00:00:00.000Z';
const task = (id: string, time = now) => ({ id, user_id: 'account-a', title: id, created_at: now, updated_at: time, priority: 'p2', status: 'todo', order_index: 0 });
beforeEach(() => {
  cloud.clear(); Socket.all = []; localStorage.clear();
  localStorage.setItem('sb_auth_session', JSON.stringify({ access_token: 'fixture-token', user: { id: 'account-a' } }));
  vi.stubGlobal('WebSocket', Socket);
  vi.stubGlobal('BroadcastChannel', class { postMessage() {} close() {} });
  vi.stubGlobal('fetch', vi.fn(transport));
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  rows('user_wallets').set('wallet', { id: 'wallet', user_id: 'account-a', credits_balance: 50 });
});
afterEach(async () => {
  vi.useRealTimers();
  for (const d of devices.splice(0)) { d.stop(); await d.cache.delete(); }
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe('Two-device workspace contract through the real Realtime adapter', () => {
  it('opens independent sockets with all four scoped bindings and waits for real join acknowledgments', async () => {
    const a = await device('a'), b = await device('b');
    expect(a.loadTasks).not.toHaveBeenCalled(); expect(b.loadTasks).not.toHaveBeenCalled();
    for (const d of [a, b]) {
      d.socket.join();
      expect(d.socket.sent[0].payload.config.postgres_changes).toEqual(expect.arrayContaining(['tasks', 'notes', 'focus_sessions', 'user_wallets'].map(table => ({ event: '*', schema: 'public', table, filter: 'user_id=eq.account-a' }))));
    }
    await vi.waitFor(() => expect(a.refreshCredits).toHaveBeenCalled());
    expect(a.cache.name).not.toBe(b.cache.name);
  });
  it.each(['tasks', 'notes', 'focus_sessions'])('device A writes %s and both isolated caches converge', async table => {
    const a = await device('a'), b = await device('b'); a.socket.join(); b.socket.join();
    const row = { ...task('row-1'), content_markdown: 'Shared note', phase: 'pomodoro', completed_at: now, date_string: '2026-11-26', duration_minutes: 25 };
    await a.api.from(table).upsert(row, { onConflict: 'id' });
    await vi.waitFor(async () => {
      for (const d of [a, b]) expect(await d.cache.table(table).get(row.id)).toMatchObject({ id: row.id, userId: 'account-a' });
    });
  });
  it.each(['tasks', 'notes'])('a newer local %s edit wins an older cloud snapshot and reaches the second device', async table => {
    const a = await device('a'), b = await device('b');
    const row = { ...task('conflict'), content_markdown: 'old' }; rows(table).set(row.id, row);
    const local = table === 'tasks' ? { estimatedPomodoros: 1, completedPomodoros: 0, priority: 'p2', status: 'todo', orderIndex: 0, repeat: 'none' } : { contentMarkdown: 'new' };
    await a.cache.table(table).put({ ...local, id: row.id, userId: 'account-a', title: 'new', createdAt: Date.parse(now), updatedAt: Date.parse(now) + 1000, synced: false });
    a.socket.join(); b.socket.join();
    await vi.waitFor(async () => {
      expect(rows(table).get(row.id).title).toBe('new');
      expect((await b.cache.table(table).get(row.id))?.title).toBe('new');
    });
  });
  it('rejects cross-account frames and reads wallet balance from HTTP rather than the socket value', async () => {
    const a = await device('a'), b = await device('b'); a.socket.join(); b.socket.join();
    await vi.waitFor(() => expect(b.credits).toBe(50));
    rows('user_wallets').get('wallet').credits_balance = 7;
    publish('tasks', { ...task('other-account'), user_id: 'account-b' });
    publish('user_wallets', { user_id: 'account-a', credits_balance: 999999 });
    await vi.waitFor(() => { expect(a.credits).toBe(7); expect(b.credits).toBe(7); });
    for (const d of [a, b]) expect(await d.cache.table('tasks').get('other-account')).toBeUndefined();
  });
  it('logout/cleanup ignores late frames for one device while the other device stays subscribed', async () => {
    const a = await device('a'), b = await device('b'); a.socket.join(); b.socket.join();
    await vi.waitFor(() => expect(a.credits).toBe(50));
    a.user = null; a.stop(); a.tasks = []; a.notes = [];
    rows('tasks').set('after-logout', task('after-logout')); publish('tasks', task('after-logout'));
    await vi.waitFor(() => expect(b.tasks.some((row: any) => row.id === 'after-logout')).toBe(true));
    expect(a.tasks).toEqual([]); expect(a.socket.readyState).toBe(3);
  });
  it('reconnect pulls focus sessions missed offline after a fresh server join', async () => {
    const a = await device('a'); a.socket.join();
    await vi.waitFor(() => expect(a.credits).toBe(50));
    vi.useFakeTimers(); vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false); a.socket.close();
    rows('focus_sessions').set('offline-session', { ...task('offline-session'), phase: 'pomodoro', completed_at: now, date_string: '2026-11-26', duration_minutes: 25 });
    await vi.advanceTimersByTimeAsync(30000); expect(Socket.all).toHaveLength(1);
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true); window.dispatchEvent(new Event('online'));
    await vi.advanceTimersByTimeAsync(2000); expect(Socket.all).toHaveLength(2);
    Socket.all[1].join(); vi.useRealTimers();
    await vi.waitFor(async () => expect(await a.cache.table('focus_sessions').get('offline-session')).toMatchObject({ durationMinutes: 25, userId: 'account-a' }));
  });
  it('preserves a newer pending local focus session while reconciling an older cloud snapshot', async () => {
    const a = await device('a');
    await a.cache.table('focus_sessions').put({ id: 'pending', userId: 'account-a', durationMinutes: 40, completedAt: Date.parse(now) + 1000, synced: false });
    await a.cache.table('sync_queue').put({ id: 'mutation', userId: 'account-a', tableName: 'focus_sessions', recordId: 'pending' });
    rows('focus_sessions').set('pending', { ...task('pending'), duration_minutes: 25, completed_at: now });
    a.socket.join(); await vi.waitFor(() => expect(a.credits).toBe(50));
    expect(await a.cache.table('focus_sessions').get('pending')).toMatchObject({ durationMinutes: 40, synced: false });
  });
  it('removes an owned focus session on DELETE without changing another account cache', async () => {
    const a = await device('a'), b = await device('b'); a.socket.join(); b.socket.join();
    await vi.waitFor(() => expect(b.credits).toBe(50));
    await a.cache.table('focus_sessions').put({ id: 'deleted', userId: 'account-a' });
    await b.cache.table('focus_sessions').put({ id: 'deleted', userId: 'account-b' });
    publish('focus_sessions', { id: 'deleted', user_id: 'account-a' }, 'DELETE');
    await vi.waitFor(async () => expect(await a.cache.table('focus_sessions').get('deleted')).toBeUndefined());
    expect(await b.cache.table('focus_sessions').get('deleted')).toMatchObject({ userId: 'account-b' });
  });
});
