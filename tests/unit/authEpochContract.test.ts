import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { verifyAdminOrOwnerToken } from '../../api/ai/companion';
import { computeDerivedPlanState, useAuthStore } from '../../src/stores/useAuthStore';
import { useAiStore } from '../../src/stores/useAiStore';

const m = vi.hoisted(() => ({ profile: null as any, listener: null as any, ai: {} as any, profileFetch: vi.fn(), queryFetch: null as any }));
vi.mock('../../src/lib/supabase', () => ({ supabase: {
  auth: { signOut: async () => ({ error: null }), onAuthStateChange: (callback: any) => { m.listener = callback; return { data: { subscription: { unsubscribe() {} } } }; } },
  from: () => { const query = { select: () => query, eq: () => query, single: async () => m.queryFetch ? m.queryFetch() : ({ data: m.profile, error: null }) }; return query; }
} }));
vi.mock('../../src/stores/useAiStore', () => ({
  getInitialGuestCredits: () => 50,
  useAiStore: { setState: (value: any) => Object.assign(m.ai, value), getState: () => m.ai }
}));
vi.mock('../../src/services/profileService', () => ({
  localProfileCache: new Map(), ProfileService: { fetchProfile: (...args: any[]) => m.profileFetch(...args) }
}));
vi.mock('../../src/services/userSettingsService', () => ({ userSettingsService: {
  applySettings: vi.fn(), loadLocalSettings: () => null, saveSettings: async () => undefined
} }));
vi.mock('../../src/services/syncQueueService', () => ({ syncQueueService: { flushQueue: async () => undefined } }));
vi.mock('../../src/stores/useTaskStore', () => ({ useTaskStore: { setState: vi.fn(), getState: () => ({ loadTasksAndProjects: async () => undefined }) } }));
vi.mock('../../src/stores/useNoteStore', () => ({ useNoteStore: { setState: vi.fn(), getState: () => ({ loadNotes: async () => undefined }) } }));

const student = { id: 'contract-user', email: 'student@example.test', role: 'user', plan: 'free', createdAt: 1 };
beforeEach(() => {
  localStorage.clear();
  m.queryFetch = null;
  m.profile = { ...student, ai_credits_balance: 17 };
  m.profileFetch.mockReset().mockImplementation(async () => m.profile);
  m.ai = { aiCreditsBalance: 50, aiPlan: 'free' };
  useAuthStore.setState({ user: null, isAuthenticated: false, ...computeDerivedPlanState(null) });
  vi.stubEnv('SUPABASE_URL', 'https://contract.supabase.test');
  vi.stubEnv('SUPABASE_ANON_KEY', 'test-publishable-key');
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });


describe('Auth epoch and wallet regression contract', () => {
  it.each(['admin', 'founder'])('keeps a depleted verified %s wallet at zero', async role => {
    m.profile = { ...m.profile, ai_credits_balance: 0 };
    await m.listener('SIGNED_IN', { user: { ...student, app_metadata: { role }, user_metadata: {} } });
    expect(useAuthStore.getState().isOwner).toBe(true);
    expect(useAuthStore.getState().user?.credits).toBe(0);
    expect(m.ai.aiCreditsBalance).toBe(0);
  });
  it('rejects an old profile even after logging back into the same account', async () => {
    let resolve!: (value: any) => void;
    m.profileFetch.mockReturnValueOnce(new Promise(r => { resolve = r; }));
    useAuthStore.setState({ user: student as any, isAuthenticated: true });
    const pending = useAuthStore.getState().loadUserFromCloud(student.id);
    await useAuthStore.getState().logout();
    useAuthStore.setState({ user: { ...student, displayName: 'New session' } as any, isAuthenticated: true });
    resolve({ ...m.profile, full_name: 'Obsolete session', ai_credits_balance: 900 }); await pending;
    expect(useAuthStore.getState().user?.displayName).toBe('New session');
    expect(m.ai.aiCreditsBalance).toBe(50);
  });
  it('the latest profile request wins when responses arrive out of order', async () => {
    let resolve!: (value: any) => void;
    m.profileFetch.mockReturnValueOnce(new Promise(r => { resolve = r; }));
    useAuthStore.setState({ user: student as any, isAuthenticated: true });
    const old = useAuthStore.getState().loadUserFromCloud(student.id);
    m.profileFetch.mockResolvedValueOnce({ ...m.profile, full_name: 'Latest', ai_credits_balance: 23 });
    await useAuthStore.getState().loadUserFromCloud(student.id);
    resolve({ ...m.profile, full_name: 'Old', ai_credits_balance: 17 }); await old;
    expect(useAuthStore.getState().user?.displayName).toBe('Latest');
    expect(m.ai.aiCreditsBalance).toBe(23);
  });
});

describe('Late auth callback', () => {
  it('SIGNED_OUT wins over a pending SIGNED_IN profile lookup', async () => {
    let resolve!: (value: any) => void;
    m.queryFetch = () => new Promise(r => { resolve = r; });
    const pending = m.listener('SIGNED_IN', { user: { ...student, app_metadata: { role: 'admin' }, user_metadata: {} } });
    await m.listener('SIGNED_OUT', null);
    resolve({ data: m.profile, error: null }); await pending;
    expect(useAuthStore.getState()).toMatchObject({ user: null, isOwner: false, isAuthenticated: false });
  });
});
