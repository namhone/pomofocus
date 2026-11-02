/**
 * SUPABASE CLIENT & REALTIME CHANNEL ADAPTER
 * ==============================================================================
 * Cung cấp client RPC PostgREST và Realtime Channel tương thích Supabase v2.
 * Hỗ trợ đồng bộ chéo thiết bị qua Supabase Realtime WebSocket (Production Cloud)
 * và đa tab nội bộ qua BroadcastChannel.
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
  private socket: WebSocket | null = null;
  private heartbeatTimer: any = null;
  private refCounter: number = 0;
  private joinRef: string | null = null;
  private isJoined: boolean = false;
  private pendingTrackState: any = null;
  private outboundQueue: Array<{ event: string; payload: any }> = [];
  private lastTrackedJson: string | null = null;
  private trackDebounceTimer: any = null;
  private reconnectTimer: any = null;
  private onSubscribedCallback?: (status: string) => void;
  public isSubscribed: boolean = false;

  constructor(topic: string, opts?: ChannelConfig) {
    this.topic = topic;
    this.presenceKey = opts?.config?.presence?.key || 'default_user';

    // 1. Kênh đa tab cục bộ
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel(`supabase_rt_${topic}`);
        this.broadcastChannel.onmessage = (event) => {
          this.handleInboundMessage(event.data);
        };
      } catch {
        // Fallback an toàn nếu BroadcastChannel bị hạn chế
      }
    }
  }

  private initWebSocket(onSubscribed?: (status: string) => void) {
    if (typeof window === 'undefined' || !('WebSocket' in window)) return;
    if (this.socket) return;
    if (onSubscribed) {
      this.onSubscribedCallback = onSubscribed;
    }

    try {
      const cleanUrl = SUPABASE_URL.replace(/^http/, 'ws').replace(/\/+$/, '');
      const wsUrl = `${cleanUrl}/realtime/v1/websocket?apikey=${encodeURIComponent(SUPABASE_ANON_KEY)}&vsn=1.0.0`;

      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        // Tham gia phòng trên Phoenix Channel của Supabase
        this.joinRef = String(++this.refCounter);
        const joinMsg = {
          topic: `realtime:${this.topic}`,
          event: 'phx_join',
          payload: {
            config: {
              broadcast: { self: true },
              presence: { key: this.presenceKey }
            }
          },
          ref: this.joinRef
        };
        this.socket?.send(JSON.stringify(joinMsg));

        // Bắt đầu heartbeat giữ kết nối Phoenix mỗi 15s (đảm bảo không bị gateway 4G rớt)
        this.heartbeatTimer = setInterval(() => {
          if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(
              JSON.stringify({
                topic: 'phoenix',
                event: 'heartbeat',
                payload: {},
                ref: String(++this.refCounter)
              })
            );
          }
        }, 15000);
      };

      this.socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.event === 'phx_reply') {
            // Chỉ xử lý phản hồi cho lượt tham gia phòng (phx_join)
            if (msg.ref === this.joinRef && msg.payload?.status === 'ok') {
              this.isJoined = true;
              if (onSubscribed) {
                onSubscribed('SUBSCRIBED');
              }
              // Gửi presence state đang chờ nếu có
              if (this.pendingTrackState && this.socket && this.socket.readyState === WebSocket.OPEN) {
                const pendingJson = JSON.stringify(this.pendingTrackState);
                this.lastTrackedJson = pendingJson;
                const stateToSend = this.pendingTrackState;
                this.pendingTrackState = null;
                this.socket.send(
                  JSON.stringify({
                    topic: `realtime:${this.topic}`,
                    event: 'presence',
                    payload: {
                      type: 'presence',
                      event: 'track',
                      payload: stateToSend
                    },
                    ref: String(++this.refCounter)
                  })
                );
              }
              // Xả hàng đợi broadcast
              while (this.outboundQueue.length > 0) {
                const item = this.outboundQueue.shift();
                if (item && this.socket && this.socket.readyState === WebSocket.OPEN) {
                  this.socket.send(
                    JSON.stringify({
                      topic: `realtime:${this.topic}`,
                      event: 'broadcast',
                      payload: {
                        type: 'broadcast',
                        event: item.event,
                        payload: item.payload
                      },
                      ref: String(++this.refCounter)
                    })
                  );
                }
              }
            }
          } else if (msg.event === 'broadcast') {
            const ev = msg.payload?.event;
            const payload = msg.payload?.payload;
            if (ev) {
              this.broadcastListeners
                .filter((l) => l.event === ev || l.event === '*')
                .forEach((l) => l.callback(payload));
            }
          } else if (msg.event === 'presence_state') {
            const raw = msg.payload || {};
            Object.keys(raw).forEach((k) => {
              this.presences[k] = raw[k]?.metas || [raw[k]];
            });
            this.presenceListeners
              .filter((l) => l.event === 'sync')
              .forEach((l) => l.callback());
          } else if (msg.event === 'presence_diff') {
            const { joins, leaves } = msg.payload || {};
            if (leaves) {
              Object.keys(leaves).forEach((k) => {
                delete this.presences[k];
              });
              const leftPresences = Object.keys(leaves).map((k) => ({ key: k, userId: k }));
              this.presenceListeners
                .filter((l) => l.event === 'leave')
                .forEach((l) => l.callback({ leftPresences }));
            }
            if (joins) {
              Object.keys(joins).forEach((k) => {
                this.presences[k] = joins[k]?.metas || [joins[k]];
              });
              const newPresences = Object.keys(joins).map((k) => joins[k]?.metas?.[0] || { key: k });
              this.presenceListeners
                .filter((l) => l.event === 'join')
                .forEach((l) => l.callback({ newPresences }));
            }
            this.presenceListeners
              .filter((l) => l.event === 'sync')
              .forEach((l) => l.callback());
          } else if (msg.event === 'postgres_changes') {
            const { table, eventType, newRecord, oldRecord } = msg.payload || {};
            this.postgresChangeListeners.forEach((listener) => {
              const matchesTable = !listener.table || listener.table === table;
              const matchesEvent = listener.event === '*' || listener.event === eventType;
              if (matchesTable && matchesEvent) {
                listener.callback({ eventType, new: newRecord, old: oldRecord });
              }
            });
          }
        } catch {
          // Bỏ qua lỗi parse frame socket
        }
      };

      this.socket.onerror = (err) => {
        console.warn('[Supabase Realtime WS] Lỗi kết nối socket:', err);
      };

      this.socket.onclose = () => {
        this.isJoined = false;
        this.socket = null;
        if (this.heartbeatTimer) {
          clearInterval(this.heartbeatTimer);
          this.heartbeatTimer = null;
        }
        // Tự động kết nối lại nếu đang trong trạng thái đã subscribe (Bảo vệ khi điện thoại tắt/bật màn hình)
        if (this.isSubscribed) {
          if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
          this.reconnectTimer = setTimeout(() => {
            if (this.isSubscribed) {
              console.log('[Supabase Realtime WS] Tự động kết nối lại socket sau ngắt kết nối...');
              this.initWebSocket(this.onSubscribedCallback);
            }
          }, 2000);
        }
      };
    } catch (err) {
      console.warn('[Supabase Realtime WS] Không thể mở kết nối WebSocket:', err);
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
      this.presences = { ...this.presences, ...(presences || {}) };
      if (senderKey && state) {
        this.presences[senderKey] = [state];
      }

      this.presenceListeners
        .filter((l) => l.event === 'sync')
        .forEach((l) => l.callback());

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
    this.initWebSocket(callback);
    if (callback) {
      setTimeout(() => callback('SUBSCRIBED'), 0);
    }
    return this;
  }

  async track(state: any): Promise<'ok' | 'error'> {
    this.presences[this.presenceKey] = [state];
    this.pendingTrackState = state;

    // Gửi qua BroadcastChannel nội bộ cùng máy ngay lập tức để đồng bộ tab nội bộ
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({
        type: 'presence_sync',
        presences: this.presences,
        senderKey: this.presenceKey,
        state,
      });
    }

    this.presenceListeners
      .filter((l) => l.event === 'sync')
      .forEach((l) => l.callback());

    // Tránh gửi liên tục các bản tin track trùng lặp làm Supabase ngắt kết nối do rate limit
    const currentJson = JSON.stringify(state);
    if (this.lastTrackedJson === currentJson && this.isJoined) {
      return 'ok';
    }

    if (this.trackDebounceTimer) {
      clearTimeout(this.trackDebounceTimer);
      this.trackDebounceTimer = null;
    }

    this.trackDebounceTimer = setTimeout(() => {
      // Gửi qua Supabase WebSocket Cloud để toàn bộ mạng thấy
      if (this.isJoined && this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.lastTrackedJson = currentJson;
        this.socket.send(
          JSON.stringify({
            topic: `realtime:${this.topic}`,
            event: 'presence',
            payload: {
              type: 'presence',
              event: 'track',
              payload: state
            },
            ref: String(++this.refCounter)
          })
        );
      }
    }, 200);

    return 'ok';
  }

  presenceState(): Record<string, any[]> {
    return { ...this.presences };
  }

  async send(params: { type: 'broadcast'; event: string; payload: any }): Promise<'ok' | 'error'> {
    // 1. Gửi qua WebSocket Supabase Cloud để máy khác nhận được
    if (this.isJoined && this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(
        JSON.stringify({
          topic: `realtime:${this.topic}`,
          event: 'broadcast',
          payload: {
            type: 'broadcast',
            event: params.event,
            payload: params.payload
          },
          ref: String(++this.refCounter)
        })
      );
    } else {
      this.outboundQueue.push(params);
    }

    // 2. Gửi qua BroadcastChannel cục bộ cùng máy
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({
        type: 'broadcast',
        event: params.event,
        payload: params.payload,
      });
    }

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

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.trackDebounceTimer) {
      clearTimeout(this.trackDebounceTimer);
      this.trackDebounceTimer = null;
    }

    if (this.socket) {
      if (this.heartbeatTimer) {
        clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = null;
      }
      try {
        if (this.socket.readyState === WebSocket.OPEN) {
          this.socket.send(
            JSON.stringify({
              topic: `realtime:${this.topic}`,
              event: 'phx_leave',
              payload: {},
              ref: String(++this.refCounter)
            })
          );
        }
        this.socket.close();
      } catch {
        // Bỏ qua lỗi đóng socket
      }
      this.socket = null;
    }

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

  auth: {
    signInWithOAuth: async ({ provider, options }: { provider: string; options?: { redirectTo?: string } }) => {
      try {
        const baseUrl = SUPABASE_URL.replace(/\/+$/, '');
        const redirectUri = options?.redirectTo || (typeof window !== 'undefined' ? `${window.location.origin}/app` : '/app');
        const oauthUrl = `${baseUrl}/auth/v1/authorize?provider=${encodeURIComponent(provider)}&redirect_to=${encodeURIComponent(redirectUri)}`;

        if (typeof window !== 'undefined') {
          window.location.href = oauthUrl;
        }
        return { data: { provider, url: oauthUrl }, error: null };
      } catch (err: any) {
        return { data: null, error: { message: err?.message || 'Lỗi khởi tạo OAuth' } };
      }
    },

    signOut: async () => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('pomodoro_study_auth_session');
      }
      return { error: null };
    },

    getSession: async () => {
      if (typeof window === 'undefined') return { data: { session: null }, error: null };
      const raw = localStorage.getItem('pomodoro_study_auth_session');
      if (!raw) return { data: { session: null }, error: null };
      try {
        const parsed = JSON.parse(raw);
        return { data: { session: { user: parsed, access_token: parsed.token || 'mock_token' } }, error: null };
      } catch {
        return { data: { session: null }, error: null };
      }
    },

    getUser: async () => {
      const { data } = await supabase.auth.getSession();
      return { data: { user: data.session?.user || null }, error: null };
    },

    onAuthStateChange: (callback: (event: string, session: any) => void) => {
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem('pomodoro_study_auth_session');
        if (raw) {
          try {
            const user = JSON.parse(raw);
            callback('SIGNED_IN', { user, access_token: user.token });
          } catch {}
        }
      }
      return {
        data: {
          subscription: {
            unsubscribe: () => {}
          }
        }
      };
    }
  },

  from: (table: string) => {
    return {
      select: (columns: string = '*') => {
        let filterCol: string | null = null;
        let filterVal: any = null;

        const queryBuilder = {
          eq: (column: string, value: any) => {
            filterCol = column;
            filterVal = value;
            return queryBuilder;
          },
          single: async (): Promise<{ data: any; error: any }> => {
            try {
              const baseUrl = SUPABASE_URL.replace(/\/+$/, '');
              let url = `${baseUrl}/rest/v1/${table}?select=${encodeURIComponent(columns)}`;
              if (filterCol && filterVal !== null) {
                url += `&${encodeURIComponent(filterCol)}=eq.${encodeURIComponent(filterVal)}`;
              }
              url += '&limit=1';

              const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
              };

              const res = await fetch(url, { headers });
              if (!res.ok) {
                return { data: null, error: { message: `HTTP ${res.status}` } };
              }
              const arr = await res.json();
              return { data: Array.isArray(arr) && arr.length > 0 ? arr[0] : null, error: null };
            } catch (err: any) {
              return { data: null, error: { message: err?.message || 'Network error' } };
            }
          }
        };
        return queryBuilder;
      }
    };
  },
};
