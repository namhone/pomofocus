import { beforeEach, describe, expect, it, vi } from 'vitest';
import { subscribeWorkspaceRealtime } from '../../src/services/workspaceRealtimeService';
const m = vi.hoisted(() => ({ user: { id: 'user-a' }, bindings: [] as any[], status: null as any,
  tasks: vi.fn(), notes: vi.fn(), profile: vi.fn(), auth: vi.fn(), credits: vi.fn(), remove: vi.fn(),
  get: vi.fn(), delete: vi.fn(), setTasks: vi.fn(), setNotes: vi.fn(), unlink: vi.fn() }));
vi.mock('../../src/lib/supabase', () => ({ supabase: {
  channel: () => { const c = { on: (_type: string, binding: any, callback: any) => { m.bindings.push({ ...binding, callback }); return c; }, subscribe: (cb: any) => { m.status = cb; return c; } }; return c; }, removeChannel: (...args: any[]) => m.remove(...args)
} }));
vi.mock('../../src/stores/useAuthStore', () => ({ useAuthStore: { getState: () => ({ user: m.user, loadUserFromCloud: m.auth }) } }));
vi.mock('../../src/stores/useTaskStore', () => ({ useTaskStore: { getState: () => ({ loadTasksAndProjects: m.tasks, activeTaskId: null, linkTaskToTimer: m.unlink }), setState: (...a: any[]) => m.setTasks(...a) } }));
vi.mock('../../src/stores/useNoteStore', () => ({ useNoteStore: { getState: () => ({ loadNotes: m.notes }), setState: (...a: any[]) => m.setNotes(...a) } }));
vi.mock('../../src/stores/useAiStore', () => ({ useAiStore: { getState: () => ({ refreshCreditsFromCloud: m.credits }) } }));
vi.mock('../../src/services/profileService', () => ({ ProfileService: { fetchProfile: (...a: any[]) => m.profile(...a) } }));
vi.mock('../../src/db', () => ({ db: { tasks: { get: (...a: any[]) => m.get(...a), delete: (...a: any[]) => m.delete(...a) }, notes: { get: (...a: any[]) => m.get(...a), delete: (...a: any[]) => m.delete(...a) } } }));
const emit = (table: string, eventType: string, row: any) => m.bindings.find(b => b.table === table).callback({ eventType, new: row, old: row });
beforeEach(() => {
  vi.clearAllMocks(); m.user = { id: 'user-a' }; m.bindings = []; m.status = null;
  for (const fn of [m.tasks, m.notes, m.profile, m.auth, m.credits, m.delete]) fn.mockResolvedValue(undefined);
});
describe('Phase 3 workspace subscription ownership', () => {
  it('registers the three account-scoped tables and reconciles after a real join', async () => {
    const stop = subscribeWorkspaceRealtime('user-a');
    expect(m.bindings.map(({ table, filter }) => ({ table, filter }))).toEqual(['tasks', 'notes', 'user_wallets'].map(table => ({ table, filter: 'user_id=eq.user-a' })));
    expect(m.tasks).not.toHaveBeenCalled();
    m.status('SUBSCRIBED');
    await vi.waitFor(() => expect(m.credits).toHaveBeenCalledOnce());
    expect(m.profile).toHaveBeenCalledWith('user-a', true);
    expect(m.tasks).toHaveBeenCalledOnce(); expect(m.notes).toHaveBeenCalledOnce();
    stop(); expect(m.remove).toHaveBeenCalledOnce();
  });
  it('refreshes tasks and notes only for the current account', async () => {
    const stop = subscribeWorkspaceRealtime('user-a');
    emit('tasks', 'UPDATE', { user_id: 'user-b' }); expect(m.tasks).not.toHaveBeenCalled();
    emit('tasks', 'UPDATE', { user_id: 'user-a' }); emit('notes', 'INSERT', { user_id: 'user-a' });
    expect(m.tasks).toHaveBeenCalledOnce(); expect(m.notes).toHaveBeenCalledOnce();
    m.user = { id: 'user-b' }; emit('tasks', 'INSERT', { user_id: 'user-a' });
    expect(m.tasks).toHaveBeenCalledOnce(); stop();
  });
  it('hard delete verifies cached ownership and never recreates the deleted row by uploading a stale cache', async () => {
    const stop = subscribeWorkspaceRealtime('user-a');
    m.get.mockResolvedValue({ id: 'other', userId: 'user-b' }); emit('tasks', 'DELETE', { id: 'other' });
    await Promise.resolve(); await Promise.resolve(); expect(m.delete).not.toHaveBeenCalled();
    m.get.mockResolvedValue({ id: 'own', userId: 'user-a' }); emit('tasks', 'DELETE', { id: 'own' });
    await vi.waitFor(() => expect(m.setTasks).toHaveBeenCalledOnce());
    expect(m.delete).toHaveBeenCalledWith('own'); expect(m.tasks).not.toHaveBeenCalled(); stop();
  });
  it('ignores an in-flight wallet refresh after logout/unmount', async () => {
    let resolve!: () => void; m.profile.mockImplementation(() => new Promise<void>(r => { resolve = r; }));
    const stop = subscribeWorkspaceRealtime('user-a'); emit('user_wallets', 'UPDATE', { user_id: 'user-a' });
    stop(); resolve(); await Promise.resolve(); await Promise.resolve();
    expect(m.auth).not.toHaveBeenCalled(); expect(m.credits).not.toHaveBeenCalled();
  });
});
