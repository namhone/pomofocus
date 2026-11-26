import { webcrypto } from 'node:crypto';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
const plugin = vi.hoisted(() => ({ signIn: vi.fn(), clearCredentialState: vi.fn() }));
const platform = vi.hoisted(() => ({ value: 'android' }));
vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: () => platform.value }, registerPlugin: () => plugin
}));
import { signInNativeGoogle } from '../../src/services/nativeGoogleAuth';
import { supabase } from '../../src/lib/supabase';
import { googleAuthService, OFFICIAL_GOOGLE_CLIENT_ID, OFFICIAL_GOOGLE_ANDROID_CLIENT_ID } from '../../src/services/googleAuthService';

beforeEach(() => {
  localStorage.clear(); vi.clearAllMocks(); vi.stubGlobal('crypto', webcrypto);
  platform.value = 'android'; delete (window as any).Capacitor;
  plugin.signIn.mockResolvedValue({ idToken: 'google-token-for-server-verification' });
  plugin.clearCredentialState.mockResolvedValue(undefined);
});
afterEach(() => vi.unstubAllGlobals());
const session = { access_token: 'supabase-access', refresh_token: 'supabase-refresh', expires_in: 3600,
  user: { id: 'verified-google-user', email: 'identity@example.test', app_metadata: { provider: 'google' } } };

describe('Native Google account picker and Supabase token exchange', () => {
  it('uses the Web client ID and exchanges the ID token with a matching hashed/raw nonce pair', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(session), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await signInNativeGoogle(OFFICIAL_GOOGLE_CLIENT_ID);
    const options = plugin.signIn.mock.calls[0][0];
    expect(options.serverClientId).toBe(OFFICIAL_GOOGLE_CLIENT_ID);
    expect(options.serverClientId).not.toBe(OFFICIAL_GOOGLE_ANDROID_CLIENT_ID);
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/auth\/v1\/token\?grant_type=id_token$/);
    const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(payload).toMatchObject({ provider: 'google', id_token: 'google-token-for-server-verification' });
    const digest = await webcrypto.subtle.digest('SHA-256', new TextEncoder().encode(payload.nonce));
    expect(options.nonce).toBe(Buffer.from(digest).toString('hex'));
    expect(JSON.parse(localStorage.getItem('sb_auth_session')!).user.id).toBe('verified-google-user');
  });
  it('a cancelled picker neither opens a browser nor creates a session', async () => {
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    plugin.signIn.mockRejectedValue(new Error('SIGN_IN_CANCELLED'));
    await expect(signInNativeGoogle(OFFICIAL_GOOGLE_CLIENT_ID)).rejects.toThrow('SIGN_IN_CANCELLED');
    expect(fetchMock).not.toHaveBeenCalled(); expect(localStorage.getItem('sb_auth_session')).toBeNull();
  });
  it('does not invoke an Android picker from a Web runtime', async () => {
    platform.value = 'web';
    await expect(signInNativeGoogle(OFFICIAL_GOOGLE_CLIENT_ID)).rejects.toThrow('Android');
    expect(plugin.signIn).not.toHaveBeenCalled();
  });
  it('an empty native ID token is rejected before contacting Supabase', async () => {
    plugin.signIn.mockResolvedValue({ idToken: '' });
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    await expect(signInNativeGoogle(OFFICIAL_GOOGLE_CLIENT_ID)).rejects.toThrow('Không nhận');
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('logout clears the native credential selection state', async () => {
    (window as any).Capacitor = { getPlatform: () => 'android' };
    await supabase.auth.signOut();
    await vi.waitFor(() => expect(plugin.clearCredentialState).toHaveBeenCalledOnce());
  });
  it('a rejected ID token cannot authenticate from its client-side payload', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error_description: 'Invalid ID token' }), { status: 400 })));
    await expect(signInNativeGoogle(OFFICIAL_GOOGLE_CLIENT_ID)).rejects.toThrow('Vui lòng dùng email');
    expect(localStorage.getItem('sb_auth_session')).toBeNull();
  });
  it('logout invalidates a token exchange that resolves late', async () => {
    let complete!: (response: Response) => void;
    const fetchMock = vi.fn(() => new Promise<Response>(resolve => { complete = resolve; }));
    vi.stubGlobal('fetch', fetchMock);
    const pending = signInNativeGoogle(OFFICIAL_GOOGLE_CLIENT_ID);
    const rejected = expect(pending).rejects.toThrow('hủy');
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    await supabase.auth.signOut(); complete(new Response(JSON.stringify(session), { status: 200 }));
    await rejected; expect(localStorage.getItem('sb_auth_session')).toBeNull();
  });
  it('logout also invalidates a native picker that returns before token exchange starts', async () => {
    let complete!: (value: { idToken: string }) => void;
    plugin.signIn.mockImplementationOnce(() => new Promise(resolve => { complete = resolve; }));
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    const rejected = expect(signInNativeGoogle(OFFICIAL_GOOGLE_CLIENT_ID)).rejects.toThrow('hủy');
    await vi.waitFor(() => expect(plugin.signIn).toHaveBeenCalledOnce());
    await supabase.auth.signOut(); complete({ idToken: 'late-native-token' });
    await rejected; expect(fetchMock).not.toHaveBeenCalled();
    expect(localStorage.getItem('sb_auth_session')).toBeNull();
  });
  it('Web fallback uses the Supabase callback flow and redirect suppression is respected', async () => {
    const url = new URL(googleAuthService.getGoogleOAuthRedirectUrl());
    expect(url.hostname).toBe('pgsgmmtpunuttspqcgof.supabase.co');
    expect(url.pathname).toBe('/auth/v1/authorize');
    expect(new URL(url.searchParams.get('redirect_to')!).pathname).toBe('/app');
    const before = window.location.href;
    const response = await supabase.auth.signInWithOAuth({ provider: 'google', options: { skipBrowserRedirect: true } });
    expect(response.error).toBeNull(); expect(window.location.href).toBe(before);
  });
});
