import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RealtimeChannel, supabase } from '../../src/lib/supabase';

class Socket {
  static OPEN = 1;
  static instances: Socket[] = [];
  readyState = 0;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  sent: any[] = [];
  constructor(public url: string) { Socket.instances.push(this); }
  send = vi.fn((data: string) => this.sent.push(JSON.parse(data)));
  close = vi.fn(() => { this.readyState = 3; this.onclose?.(); });
  open() { this.readyState = 1; this.onopen?.(); }
  receive(event: string, payload: any, ref = this.sent[0]?.ref) {
    this.onmessage?.({ data: JSON.stringify({ topic: 'realtime:phase3', event, payload, ref }) });
  }
  join() { this.open(); this.receive('phx_reply', { status: 'ok', response: {} }); }
}
const channels: RealtimeChannel[] = [];
function channel(name = 'phase3') { const c = supabase.channel(name); channels.push(c); return c; }
beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  Socket.instances = [];
  vi.stubGlobal('WebSocket', Socket);
  vi.stubGlobal('BroadcastChannel', class { onmessage = null; postMessage = vi.fn(); close = vi.fn(); });
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
});
afterEach(() => { channels.splice(0).forEach(c => supabase.removeChannel(c as any)); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('Phase 3 real Realtime subscription lifecycle', () => {
  it('announces SUBSCRIBED once after the server acknowledges the join, never from a timer', () => {
    const status = vi.fn(); channel().subscribe(status);
    vi.advanceTimersByTime(0);
    expect(status).not.toHaveBeenCalled();
    const socket = Socket.instances[0]; socket.open();
    socket.receive('phx_reply', { status: 'ok' }, 'wrong-ref');
    expect(status).not.toHaveBeenCalled();
    socket.receive('phx_reply', { status: 'ok' });
    socket.receive('phx_reply', { status: 'ok' });
    expect(status.mock.calls).toEqual([['SUBSCRIBED']]);
  });
  it('includes scoped Postgres bindings and the user access token in the join', () => {
    localStorage.setItem('sb_auth_session', JSON.stringify({ access_token: 'user-access-token' }));
    channel().on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: 'user_id=eq.user-a' }, vi.fn()).subscribe();
    Socket.instances[0].open();
    expect(Socket.instances[0].sent[0].payload.config.postgres_changes).toEqual([{ event: '*', schema: 'public', table: 'tasks', filter: 'user_id=eq.user-a' }]);
    expect(Socket.instances[0].sent[0].payload.access_token).toBe('user-access-token');
  });
  it('normalizes cloud CDC envelopes and preserves payment profile filtering', () => {
    const tasks = vi.fn(), payment = vi.fn();
    const c = channel().on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: 'user_id=eq.user-a' }, tasks)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: 'id=eq.user-a' }, payment).subscribe();
    const socket = Socket.instances[0]; socket.join();
    socket.receive('postgres_changes', { ids: [1], data: { schema: 'public', table: 'tasks', type: 'INSERT', record: { id: 't1', user_id: 'user-a' }, old_record: {} } });
    expect(tasks).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'INSERT', new: { id: 't1', user_id: 'user-a' } }));
    socket.receive('postgres_changes', { data: { schema: 'public', table: 'tasks', type: 'UPDATE', record: { id: 't2', user_id: 'user-b' } } });
    expect(tasks).toHaveBeenCalledTimes(1);
    c.dispatchLocalPostgresChange('profiles', 'UPDATE', { id: 'user-b', plan: 'pro' });
    expect(payment).not.toHaveBeenCalled();
    socket.receive('postgres_changes', { data: { schema: 'public', table: 'profiles', type: 'UPDATE', record: { id: 'user-a', plan: 'pro' } } });
    expect(payment).toHaveBeenCalledOnce();
  });
  it('retries with capped exponential backoff and resets only after a successful join', () => {
    channel().subscribe();
    for (const delay of [2000, 4000, 8000, 16000, 30000, 30000]) {
      const count = Socket.instances.length;
      Socket.instances.at(-1)!.close();
      vi.advanceTimersByTime(delay - 1); expect(Socket.instances).toHaveLength(count);
      vi.advanceTimersByTime(1); expect(Socket.instances).toHaveLength(count + 1);
    }
    Socket.instances.at(-1)!.join(); Socket.instances.at(-1)!.close();
    const count = Socket.instances.length;
    vi.advanceTimersByTime(2000); expect(Socket.instances).toHaveLength(count + 1);
  });
  it('preserves the payment modal entitlement subscription and disposes it by instance', () => {
    const payment = vi.fn();
    const c = channel('entitlement_user-a').on('postgres_changes', {
      event: '*', schema: 'public', table: 'user_entitlements', filter: 'user_id=eq.user-a'
    }, payment).subscribe();
    const socket = Socket.instances[0]; socket.join();
    expect(socket.sent[0].payload.config.postgres_changes).toEqual([
      { event: '*', schema: 'public', table: 'user_entitlements', filter: 'user_id=eq.user-a' }
    ]);
    socket.receive('postgres_changes', { data: { schema: 'public', table: 'user_entitlements', type: 'UPDATE', record: { user_id: 'user-b', is_pro: true } } });
    expect(payment).not.toHaveBeenCalled();
    socket.receive('postgres_changes', { data: { schema: 'public', table: 'user_entitlements', type: 'UPDATE', record: { user_id: 'user-a', is_pro: true, pro_expires_at: '2027-01-01' } } });
    expect(payment).toHaveBeenCalledWith(expect.objectContaining({ new: { user_id: 'user-a', is_pro: true, pro_expires_at: '2027-01-01' } }));
    supabase.removeChannel(c);
    expect(socket.close).toHaveBeenCalledOnce();
    expect(channel('entitlement_user-a')).not.toBe(c);
  });
  it('pauses retries offline, reconnects online, and cancels all work on removal by instance', () => {
    const c = channel().subscribe();
    vi.mocked(vi.spyOn(navigator, 'onLine', 'get')).mockReturnValue(false);
    Socket.instances[0].close(); vi.advanceTimersByTime(60000);
    expect(Socket.instances).toHaveLength(1);
    vi.mocked(vi.spyOn(navigator, 'onLine', 'get')).mockReturnValue(true);
    window.dispatchEvent(new Event('online')); vi.advanceTimersByTime(2000);
    expect(Socket.instances).toHaveLength(2);
    supabase.removeChannel(c as any);
    expect(c.isSubscribed).toBe(false);
    expect(Socket.instances[1].close).toHaveBeenCalled();
    window.dispatchEvent(new Event('online')); vi.advanceTimersByTime(60000);
    expect(Socket.instances).toHaveLength(2);
    expect(channel()).not.toBe(c);
  });
});
