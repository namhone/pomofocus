import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { verifyAdminOrOwnerToken } from '../../api/ai/companion';
import { computeDerivedPlanState, useAuthStore } from '../../src/stores/useAuthStore';
import { useAiStore } from '../../src/stores/useAiStore';

const m = vi.hoisted(() => ({ profile: null as any, listener: null as any, ai: {} as any, profileFetch: vi.fn() }));
vi.mock('../../src/lib/supabase', () => ({ supabase: {
  auth: { signOut: async () => ({ error: null }), onAuthStateChange: (callback: any) => { m.listener = callback; return { data: { subscription: { unsubscribe() {} } } }; } },
  from: () => { const query = { select: () => query, eq: () => query, single: async () => ({ data: m.profile, error: null }) }; return query; }
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
  m.profile = { ...student, ai_credits_balance: 17 };
  m.profileFetch.mockReset().mockImplementation(async () => m.profile);
  m.ai = { aiCreditsBalance: 50, aiPlan: 'free' };
  useAuthStore.setState({ user: null, isAuthenticated: false, ...computeDerivedPlanState(null) });
  vi.stubEnv('SUPABASE_URL', 'https://contract.supabase.test');
  vi.stubEnv('SUPABASE_ANON_KEY', 'test-publishable-key');
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe('Founder/Admin trust boundary contract (mocked Auth HTTP, never a real JWT verification)', () => {
  it.each(['admin', 'founder'])('accepts a server-verified app_metadata.role=%s', async role => {
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: student.id, app_metadata: { role } })));
    vi.stubGlobal('fetch', request);
    expect(await verifyAdminOrOwnerToken('Bearer opaque-test-token')).toEqual({ isAdmin: true, userId: student.id });
    expect(request).toHaveBeenCalledWith('https://contract.supabase.test/auth/v1/user', expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer opaque-test-token' }) }));
  });
  it.each(['admin', 'founder'])('never grants server privileges from editable user_metadata.role=%s', async role => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: student.id, app_metadata: {}, user_metadata: { role } }))));
    expect((await verifyAdminOrOwnerToken('Bearer opaque-test-token')).isAdmin).toBe(false);
  });
  it('rejects a failed Auth verification and never trusts the bearer payload alone', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401 })));
    expect((await verifyAdminOrOwnerToken('Bearer forged-admin-claim')).isAdmin).toBe(false);
    expect(await verifyAdminOrOwnerToken()).toEqual({ isAdmin: false });
  });
  it('a lifetime subscription does not grant server Admin privileges', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: student.id, app_metadata: { role: 'user' }, plan: 'lifetime' }))));
    expect((await verifyAdminOrOwnerToken('Bearer lifetime-member')).isAdmin).toBe(false);
  });
  it.each(['admin', 'founder'])('hydrates consistent Founder badge/plan/credits from trusted app role %s', async role => {
    await m.listener('SIGNED_IN', { user: { ...student, app_metadata: { role }, user_metadata: {} } });
    expect(useAuthStore.getState()).toMatchObject({ isAdmin: true, isOwner: true, isLifetime: true, effectiveBadge: 'Founder VIP' });
    expect(useAuthStore.getState().user?.plan).toBe('lifetime');
    expect(useAiStore.getState()).toMatchObject({ aiPlan: 'lifetime', aiCreditsBalance: 1000 });
  });
  it('does not promote a free account from editable metadata in derived state', () => {
    expect(computeDerivedPlanState({ ...student, user_metadata: { role: 'admin' } } as any).isAdmin).toBe(false);
  });
  it.each([{ credits: Infinity }, { badge: 'Founder VIP' }])('does not derive owner access from client-controlled display fields %j', fields => {
    expect(computeDerivedPlanState({ ...student, ...fields } as any).isOwner).toBe(false);
  });
  it('does not promote a free account from editable metadata during auth hydration', async () => {
    await m.listener('SIGNED_IN', { user: { ...student, app_metadata: {}, user_metadata: { role: 'admin' } } });
    expect(useAuthStore.getState()).toMatchObject({ isAdmin: false, isOwner: false, isLifetime: false });
  });
  it('keeps a trusted lifetime subscription Pro without changing it into Founder', async () => {
    m.profile = { ...m.profile, plan: 'lifetime' };
    await m.listener('SIGNED_IN', { user: { ...student, app_metadata: { role: 'user' }, user_metadata: {} } });
    expect(useAuthStore.getState()).toMatchObject({ isAdmin: false, isOwner: false, isLifetime: true, isPro: true, effectiveBadge: 'Pro trọn đời' });
    expect(useAiStore.getState().aiPlan).toBe('lifetime');
  });
  it.each([['free', 17], ['lifetime', 23]])('preserves a depleted %s wallet balance of %i without a client-side minimum', async (plan, balance) => {
    m.profile = { ...m.profile, plan, ai_credits_balance: balance };
    useAuthStore.setState({ user: student as any, isAuthenticated: true });
    await useAuthStore.getState().loadUserFromCloud(student.id);
    expect(useAuthStore.getState().user?.credits).toBe(balance);
    expect(useAiStore.getState().aiCreditsBalance).toBe(balance);
  });
  it('logout clears entitlement, badge, credits, conversations and visible account data', async () => {
    await m.listener('SIGNED_IN', { user: { ...student, app_metadata: { role: 'founder' }, user_metadata: {} } });
    await useAuthStore.getState().logout();
    expect(useAuthStore.getState()).toMatchObject({ user: null, isAuthenticated: false, isAdmin: false, isOwner: false, isLifetime: false, credits: undefined, badge: undefined });
    expect(useAiStore.getState()).toMatchObject({ aiPlan: 'free', aiCreditsBalance: 50, sessions: [], activeConversationId: null });
  });
  it('a profile request started before logout cannot resurrect the signed-out account', async () => {
    let resolve!: (profile: any) => void;
    m.profileFetch.mockReturnValue(new Promise(r => { resolve = r; }));
    useAuthStore.setState({ user: student as any, isAuthenticated: true });
    const pending = useAuthStore.getState().loadUserFromCloud(student.id);
    await useAuthStore.getState().logout();
    resolve(m.profile); await pending;
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});
