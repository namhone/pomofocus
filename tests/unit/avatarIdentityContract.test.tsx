import 'fake-indexeddb/auto';
import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getAvatarState, getEffectiveAvatarUrl, generateInitialsAvatarSvg, authService } from '../../src/services/authService';
import { ProfileService, localProfileCache } from '../../src/services/profileService';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { UserAvatar } from '../../src/components/common/UserAvatar';

const m = vi.hoisted(() => ({ profile: null as any, error: null as any, writes: [] as any[], listener: null as any }));
vi.mock('../../src/lib/supabase', () => ({ supabase: {
  auth: { signOut: async () => ({ error: null }), onAuthStateChange: (cb: any) => { m.listener = cb; return { data: { subscription: { unsubscribe() {} } } }; } },
  from: () => { const query = { select: () => query, update: (payload: any) => { m.writes.push(payload); return query; },
    eq: () => query, single: async () => ({ data: m.profile, error: m.error }),
    then: (resolve: any) => Promise.resolve({ data: m.profile, error: m.error }).then(resolve) }; return query; }
} }));
vi.mock('../../src/stores/useAiStore', () => ({ getInitialGuestCredits: () => 50, useAiStore: { setState: vi.fn(), getState: () => ({}) } }));
vi.mock('../../src/services/userSettingsService', () => ({ userSettingsService: { applySettings: vi.fn(), loadLocalSettings: () => null, saveSettings: vi.fn() } }));
vi.mock('../../src/services/syncQueueService', () => ({ syncQueueService: { flushQueue: vi.fn() } }));
vi.mock('../../src/stores/useTaskStore', () => ({ useTaskStore: { setState: vi.fn(), getState: () => ({ loadTasksAndProjects: vi.fn() }) } }));
vi.mock('../../src/stores/useNoteStore', () => ({ useNoteStore: { setState: vi.fn(), getState: () => ({ loadNotes: vi.fn() }) } }));

const google = 'https://lh3.googleusercontent.com/photo-real';
const geometric = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg"><circle r="20"/></svg>');
const person = { id: 'avatar-user', email: 'nam.real@example.test', displayName: 'Nam Hồ', plan: 'free' as const, createdAt: 1, user_metadata: { avatar_url: google } };
beforeEach(() => { localStorage.clear(); localProfileCache.clear(); m.profile = { ...person, full_name: person.displayName, ai_credits_balance: 17 }; m.error = null; m.writes = []; useAuthStore.setState({ user: person, isAuthenticated: true }); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('Avatar identity contract (real resolver/store/profile writer, mocked Cloud transport)', () => {
  it.each([geometric, 'data:image/jpeg;base64,YWJj', 'https://images.example.test/custom.jpg'])('preserves custom %s across Google sync and Cloud hydration', async custom => {
    m.profile = { ...m.profile, avatar_url: custom, custom_avatar_url: custom, has_custom_avatar: true };
    localProfileCache.set(person.email, m.profile);
    vi.spyOn(ProfileService, 'ensureProfileForUser').mockResolvedValue(m.profile);
    useAuthStore.setState({ user: { ...person, avatarUrl: custom, customAvatarUrl: custom, hasCustomAvatar: true } });
    useAuthStore.getState().syncUserFromSupabase({ ...person, app_metadata: {}, user_metadata: { avatar_url: google } });
    expect(useAuthStore.getState().user?.avatarUrl).toBe(custom);
    await useAuthStore.getState().loadUserFromCloud(person.id);
    expect(useAuthStore.getState().user).toMatchObject({ avatarUrl: custom, customAvatarUrl: custom, hasCustomAvatar: true });
  });
  it('uses the real Google photo before a previously generated generic SVG, including snake_case input', () => {
    expect(getEffectiveAvatarUrl({ ...person, avatarUrl: generateInitialsAvatarSvg('User') })).toBe(google);
    render(<UserAvatar user={{ ...person, avatarUrl: undefined, user_metadata: undefined, avatar_url: google } as any} />);
    expect(screen.getByTestId('user-avatar-img').getAttribute('src')).toBe(google);
  });
  it.each([{ displayName: 'User', email: 'nam.real@example.test' }, { displayName: 'Nam Hồ', email: 'nam.real@example.test' }])('uses actual name/email initials instead of US: %j', identity => {
    render(<UserAvatar user={{ ...person, ...identity, user_metadata: undefined }} />);
    const svg = decodeURIComponent(screen.getByTestId('user-avatar-img').getAttribute('src')!);
    expect(svg).not.toContain('>US<');
    expect(svg).toContain(identity.displayName === 'User' ? '>NA<' : '>NH<');
  });
  it('persists the full avatar triple, updates all store subscribers, and honors a remote removal', async () => {
    render(<>{['header', 'dropdown', 'profile', 'mobile', 'meet'].map(testId => <UserAvatar key={testId} testId={testId} />)}</>);
    expect(await ProfileService.updateAvatar(person.id, geometric, person.email)).toBe(true);
    expect(m.writes.at(-1)).toMatchObject({ avatar_url: geometric, custom_avatar_url: geometric, has_custom_avatar: true });
    m.profile = { ...m.profile, avatar_url: geometric, custom_avatar_url: geometric, has_custom_avatar: true };
    await act(async () => { await useAuthStore.getState().loadUserFromCloud(person.id); });
    for (const testId of ['header', 'dropdown', 'profile', 'mobile', 'meet']) expect(screen.getByTestId(`${testId}-img`).getAttribute('src')).toBe(geometric);
    expect(await ProfileService.updateAvatar(person.id, '', person.email)).toBe(true);
    expect(m.writes.at(-1)).toMatchObject({ avatar_url: '', custom_avatar_url: '', has_custom_avatar: false });
    m.profile = { ...m.profile, avatar_url: '', custom_avatar_url: '', has_custom_avatar: false };
    await act(async () => { await useAuthStore.getState().loadUserFromCloud(person.id); });
    for (const testId of ['header', 'dropdown', 'profile', 'mobile', 'meet']) expect(screen.getByTestId(`${testId}-img`).getAttribute('src')).toBe(google);
    expect(useAuthStore.getState().user).toMatchObject({ hasCustomAvatar: false, customAvatarUrl: undefined });
  });
  it('does not turn a Google avatar into custom when updating only the display name', async () => {
    vi.spyOn(authService, 'getCurrentSession').mockReturnValue(person);
    vi.spyOn(authService, 'saveSession').mockImplementation(() => undefined);
    await authService.updateProfile(person.id, { displayName: 'Nam mới' });
    expect(m.writes.at(-1)).toMatchObject({ full_name: 'Nam mới' });
    expect(m.writes.at(-1)).not.toHaveProperty('has_custom_avatar');
  });
  it('reports a failed Cloud write without replacing the cached avatar', async () => {
    localProfileCache.set(person.id, { ...m.profile, avatar_url: google }); m.error = { message: 'permission denied' };
    expect(await ProfileService.updateAvatar(person.id, geometric, person.email)).toBe(false);
    expect(localProfileCache.get(person.id)?.avatar_url).toBe(google);
  });
  it('keeps a peer avatar independent from the signed-in account', () => {
    useAuthStore.setState({ user: { ...person, avatarUrl: geometric, customAvatarUrl: geometric, hasCustomAvatar: true } });
    render(<UserAvatar name="Bạn Trần" avatarUrl={google} />);
    expect(screen.getByTestId('user-avatar-img').getAttribute('src')).toBe(google);
  });
  it('a pending profile save cannot restore the session after logout and same-account login', async () => {
    let resolve!: (saved: boolean) => void;
    vi.spyOn(authService, 'getCurrentSession').mockReturnValue(person);
    vi.spyOn(ProfileService, 'updateFields').mockImplementation(() => new Promise(r => { resolve = r; }));
    const save = vi.spyOn(authService, 'saveSession');
    const pending = authService.updateProfile(person.id, { avatarUrl: geometric });
    await vi.waitFor(() => expect(ProfileService.updateFields).toHaveBeenCalled());
    authService.logout(); authService.saveSession(person); save.mockClear();
    resolve(true);
    await expect(pending).rejects.toThrow('Phiên đăng nhập đã thay đổi');
    expect(save).not.toHaveBeenCalled();
  });
  it('a server reset overrides stale custom fields but retains OAuth fallback', () => {
    expect(getAvatarState({ ...person, customAvatarUrl: geometric, hasCustomAvatar: true }, { has_custom_avatar: false, avatar_url: '', custom_avatar_url: '' })).toEqual({ avatarUrl: google, customAvatarUrl: undefined, hasCustomAvatar: false });
  });
});
