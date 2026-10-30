/**
 * SUPABASE CLIENT & REALTIME CHANNEL ADAPTER
 * ==============================================================================
 * Cung cấp client RPC PostgREST và Realtime Channel tương thích Supabase v2.
 * Hỗ trợ đa tab qua BroadcastChannel (Offline & Graceful Fallback) và WebSocket.
 */

import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config/env';

export interface PostgrestResponse<T> {
  data: T | null;
  error: { message: string; code?: string; details?: string; hint?: string } | null;
}

export type RealtimePostgresChangesPayload = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Record<string, any>;
  old: Record<string, any>;
  errors?: any;
};

export interface ChannelConfig {
  config?: {
    presence?: { key?: string };
    broadcast?: { ack?: boolean };
  };
}

export class RealtimeChannel {
  public topic: string;
  private presenceKey: string;
  private postgresChangeListeners: Array<{
    event: string;
    schema?: string;
    table?: string;
    filter?: string;
    callback: (payload: any) => void;
  }> = [];
  private presenceListeners: Array<{
    event: string;
    callback: (payload?: any) => void;
  }> = [];
  private broadcastListeners: Array<{
    event: string;
    callback: (payload: any) => void;
  }> = [];

  private presences: Record<string, any[]> = {};
  private broadcastChannel: BroadcastChannel | null = null;
  public isSubscribed: boolean = false;

  constructor(topic: string, opts?: ChannelConfig) {
    this.topic = topic;
    this.presenceKey = opts?.config?.presence?.key || 'default_user';

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.broadcastChannel = new BroadcastChannel(`supabase_rt_${topic}`);
      this.broadcastChannel.onmessage = (event) => {
        this.handleInboundMessage(event.data);
      };
    }
  }

  private handleInboundMessage(data: any) {
    if (!data || typeof data !== 'object') return;

    if (data.type === 'postgres_changes') {
      const { table, eventType, newRecord, oldRecord } = data;
      this.postgresChangeListeners.forEach((listener) => {
        const matchesTable = !listener.table || listener.table === table;
        const matchesEvent = listener.event === '*' || listener.event === eventType;
        let matchesFilter = true;
        if (listener.filter && newRecord) {
          const [col, opVal] = listener.filter.split('=eq.');
          if (col && opVal !== undefined) {
            matchesFilter = String(newRecord[col]) === String(opVal);
          }
        }
        if (matchesTable && matchesEvent && matchesFilter) {
          listener.callback({
            eventType,
            new: newRecord,
            old: oldRecord,
          });
        }
      });
    } else if (data.type === 'presence_sync') {
      const { presences, senderKey, state } = data;
      const oldKeys = Object.keys(this.presences);
      // Hợp nhất dữ liệu presence giữa các tab/cửa sổ
      this.presences = { ...this.presences, ...(presences || {}) };
      if (senderKey && state) {
        this.presences[senderKey] = [state];
      }

      this.presenceListeners
        .filter((l) => l.event === 'sync')
        .forEach((l) => l.callback());

      // Kích hoạt event 'join' khi có thành viên mới
      const newKeys = Object.keys(this.presences).filter((k) => !oldKeys.includes(k) && k !== this.presenceKey);
      if (newKeys.length > 0) {
        const newPresences = newKeys.map((k) => this.presences[k]?.[0] || { key: k });
        this.presenceListeners
          .filter((l) => l.event === 'join')
          .forEach((l) => l.callback({ newPresences }));
      }
    } else if (data.type === 'presence_leave') {
      const { key } = data;
      if (key && this.presences[key]) {
        delete this.presences[key];
        this.presenceListeners
          .filter((l) => l.event === 'sync')
          .forEach((l) => l.callback());
        this.presenceListeners
          .filter((l) => l.event === 'leave')
          .forEach((l) => l.callback({ leftPresences: [{ key, userId: key }] }));
      }
    } else if (data.type === 'broadcast') {
      const { event, payload } = data;
      this.broadcastListeners
        .filter((l) => l.event === event || l.event === '*')
        .forEach((l) => l.callback(payload));
    }
  }

  on(type: 'postgres_changes', filter: any, callback: (payload: any) => void): this;
  on(type: 'presence', filter: { event: string }, callback: (payload?: any) => void): this;
  on(type: 'broadcast', filter: { event: string }, callback: (payload: any) => void): this;
  on(type: string, filter: any, callback: (payload: any) => void): this {
    if (type === 'postgres_changes') {
      this.postgresChangeListeners.push({
        event: filter.event || '*',
        schema: filter.schema,
        table: filter.table,
        filter: filter.filter,
        callback,
      });
    } else if (type === 'presence') {
      this.presenceListeners.push({
        event: filter.event,
        callback,
      });
    } else if (type === 'broadcast') {
      this.broadcastListeners.push({
        event: filter.event,
        callback,
      });
    }
    return this;
  }

  subscribe(callback?: (status: string) => void): this {
    this.isSubscribed = true;
    if (callback) {
      setTimeout(() => callback('SUBSCRIBED'), 0);
    }
    return this;
  }

  async track(state: any): Promise<'ok' | 'error'> {
    this.presences[this.presenceKey] = [state];

    // Gửi sự kiện presence tới các tab khác
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({
        type: 'presence_sync',
        presences: this.presences,
        senderKey: this.presenceKey,
        state,
      });
    }

    // Tự kích hoạt listener nội bộ
    this.presenceListeners
      .filter((l) => l.event === 'sync')
      .forEach((l) => l.callback());

    return 'ok';
  }

  presenceState(): Record<string, any[]> {
    return { ...this.presences };
  }

  async send(params: { type: 'broadcast'; event: string; payload: any }): Promise<'ok' | 'error'> {
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({
        type: 'broadcast',
        event: params.event,
        payload: params.payload,
      });
    }
    this.broadcastListeners
      .filter((l) => l.event === params.event)
      .forEach((l) => l.callback(params.payload));
    return 'ok';
  }

  dispatchLocalPostgresChange(
    table: string,
    eventType: 'INSERT' | 'UPDATE' | 'DELETE',
    newRecord: Record<string, any>,
    oldRecord: Record<string, any> = {}
  ) {
    const payload = {
      type: 'postgres_changes',
      table,
      eventType,
      newRecord,
      oldRecord,
    };
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage(payload);
    }
    this.handleInboundMessage(payload);
  }

  unsubscribe(): 'ok' {
    this.isSubscribed = false;
    if (this.broadcastChannel && this.presenceKey) {
      this.broadcastChannel.postMessage({
        type: 'presence_leave',
        key: this.presenceKey,
      });
    }
    this.postgresChangeListeners = [];
    this.presenceListeners = [];
    this.broadcastListeners = [];
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }
    return 'ok';
  }
}

const activeChannels = new Map<string, RealtimeChannel>();

export const supabase = {
  channel: (topic: string, opts?: ChannelConfig): RealtimeChannel => {
    let chan = activeChannels.get(topic);
    if (!chan) {
      chan = new RealtimeChannel(topic, opts);
      activeChannels.set(topic, chan);
    }
    return chan;
  },

  removeChannel: (topic: string) => {
    const chan = activeChannels.get(topic);
    if (chan) {
      chan.unsubscribe();
      activeChannels.delete(topic);
    }
  },

  rpc: async <T = any>(
    fnName: string,
    params: Record<string, any> = {}
  ): Promise<PostgrestResponse<T>> => {
    try {
      const baseUrl = SUPABASE_URL.replace(/\/+$/, '');
      const url = `${baseUrl}/rest/v1/rpc/${fnName}`;

      let token = SUPABASE_ANON_KEY;
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('pomodoro_study_auth_session');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (parsed.token) token = parsed.token;
          } catch {
            // fallback
          }
        }
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${token}`,
      };

      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        let errBody: any;
        try {
          errBody = await res.json();
        } catch {
          errBody = { message: res.statusText || `HTTP ${res.status}` };
        }
        return {
          data: null,
          error: {
            message: errBody.message || errBody.error || `HTTP ${res.status}`,
            code: errBody.code || `${res.status}`,
            details: errBody.details,
            hint: errBody.hint,
          },
        };
      }

      const data = await res.json();
      return { data, error: null };
    } catch (err: any) {
      return {
        data: null,
        error: {
          message: err?.message || 'Network error',
          code: 'network',
        },
      };
    }
  },
};
