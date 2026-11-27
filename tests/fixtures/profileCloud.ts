import 'fake-indexeddb/auto';
import { randomUUID } from 'node:crypto';
import { afterEach, vi } from 'vitest';
import { localProfileCache } from '../../src/services/profileService';

// External Auth/PostgREST transport for legacy service tests. Product services and
// their cache, persistence, avatar precedence and 2FA logic remain real.
export function installProfileCloud() {
  localProfileCache.clear();
  const tables = new Map<string, Map<string, any>>();
  const accounts = new Map<string, { user: any; password: string }>();
  const json = (data: any, status = 200) => new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' }
  });
  const request = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const method = init?.method || 'GET';
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    if (url.pathname === '/auth/v1/signup' || url.searchParams.get('grant_type') === 'password') {
      const email = body.email.trim().toLowerCase();
      // These suites historically log in without arranging an account. Seed that
      // test account on first use; later password checks still reject a mismatch.
      let account = accounts.get(email);
      if (!account) {
        const profile = [...(tables.get('profiles')?.values() || [])].find(row => row.email === email);
        account = { user: { id: profile?.id || randomUUID(), email, app_metadata: { role: 'user' },
          user_metadata: { full_name: body.data?.full_name || email.split('@')[0] } }, password: body.password };
        accounts.set(email, account);
      }
      if (account.password !== body.password) return json({ message: 'Invalid login credentials' }, 400);
      return json({ user: account.user, access_token: 'fixture-server-access', refresh_token: 'fixture-refresh',
        expires_at: Math.floor(Date.now() / 1000) + 3600 });
    }
    if (url.pathname.startsWith('/rest/v1/')) {
      const table = url.pathname.slice('/rest/v1/'.length);
      if (!tables.has(table)) tables.set(table, new Map());
      const rows = tables.get(table)!;
      const matches = (row: any) => [...url.searchParams].every(([key, value]) =>
        !value.startsWith('eq.') || String(row[key]) === value.slice(3));
      if (method === 'GET') return json([...rows.values()].filter(matches));
      if (method === 'POST') {
        const saved = (Array.isArray(body) ? body : [body]).map(row => {
          const id = row.id || randomUUID();
          const merged = { ...rows.get(id), ...row, id };
          rows.set(id, merged);
          return merged;
        });
        return json(saved);
      }
      const affected: any[] = [];
      for (const [id, row] of rows) if (matches(row)) {
        if (method === 'PATCH') { rows.set(id, { ...row, ...body }); affected.push(rows.get(id)); }
        if (method === 'DELETE') rows.delete(id);
      }
      return json(affected);
    }
    return json({ message: `Unarranged test transport: ${method} ${url.pathname}` }, 503);
  });
  vi.stubGlobal('fetch', request);
  return { tables, request };
}

afterEach(() => vi.unstubAllGlobals());
