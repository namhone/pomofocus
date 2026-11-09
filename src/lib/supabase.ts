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

  off(type: 'postgres_changes' | 'presence' | 'broadcast', filter?: { event?: string }, callback?: (payload: any) => void): this {
    if (type === 'broadcast') {
      this.broadcastListeners = this.broadcastListeners.filter((l) => {
        if (filter?.event && l.event !== filter.event && filter.event !== '*') return true;
        if (callback && l.callback !== callback) return true;
        return false;
      });
    } else if (type === 'presence') {
      this.presenceListeners = this.presenceListeners.filter((l) => {
        if (filter?.event && l.event !== filter.event) return true;
        if (callback && l.callback !== callback) return true;
        return false;
      });
    } else if (type === 'postgres_changes') {
      this.postgresChangeListeners = this.postgresChangeListeners.filter((l) => {
        if (filter?.event && l.event !== filter.event) return true;
        if (callback && l.callback !== callback) return true;
        return false;
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


const authSubscribers = new Set<(event: string, session: any) => void>();

let pendingOAuthUserInfoPromise: Promise<any> | null = null;

function parseOAuthHashSession(): any {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash || '';
  if (hash.includes('access_token=') || hash.includes('id_token=')) {
    try {
      try {
        sessionStorage.setItem('pomodoro_oauth_redirect_completed', '1');
      } catch {}

      const params = new URLSearchParams(hash.replace(/^#/, ''));
      const idToken = params.get('id_token');
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token') || '';

      // Ưu tiên id_token vì là JWT chuẩn mang payload user profile
      const jwtToken = (idToken && idToken.split('.').length >= 2)
        ? idToken
        : (accessToken && accessToken.split('.').length >= 2 ? accessToken : null);

      if (jwtToken) {
        const parts = jwtToken.split('.');
        const base64Url = parts[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const decoded = JSON.parse(decodeURIComponent(escape(atob(base64))));
        const email = (decoded.email || '').toLowerCase();
        const displayName =
          decoded.name ||
          decoded.user_metadata?.full_name ||
          decoded.user_metadata?.name ||
          (email ? email.split('@')[0] : 'Người dùng Google');
        const avatarUrl =
          decoded.picture ||
          decoded.avatar_url ||
          decoded.user_metadata?.avatar_url ||
          decoded.user_metadata?.picture ||
          '';

        const user = {
          id: decoded.sub || `g_${Date.now()}`,
          email,
          user_metadata: {
            full_name: displayName,
            name: displayName,
            avatar_url: avatarUrl,
            picture: avatarUrl,
            email_verified: Boolean(decoded.email_verified),
            ...decoded.user_metadata,
          },
          app_metadata: decoded.app_metadata || { provider: 'google' },
          aud: decoded.aud,
          role: decoded.role || 'authenticated',
        };
        return {
          user,
          access_token: accessToken || jwtToken,
          refresh_token: refreshToken,
        };
      }

      // Nếu Google chỉ trả về opaque access_token (ya29...) mà không có id_token JWT
      if (accessToken && !pendingOAuthUserInfoPromise) {
        if (window.history && window.history.replaceState) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
        pendingOAuthUserInfoPromise = fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` }
        })
          .then((res) => (res.ok ? res.json() : null))
          .then((profile) => {
            if (!profile || !profile.email) return null;
            const email = profile.email.toLowerCase();
            const displayName = profile.name || email.split('@')[0];
            const avatarUrl = profile.picture || '';
            const session = {
              user: {
                id: profile.sub || `g_${Date.now()}`,
                email,
                user_metadata: {
                  full_name: displayName,
                  name: displayName,
                  avatar_url: avatarUrl,
                  picture: avatarUrl,
                  email_verified: Boolean(profile.email_verified),
                },
                app_metadata: { provider: 'google' },
                role: 'authenticated',
              },
              access_token: accessToken,
              refresh_token: refreshToken,
            };
            if (window.localStorage) {
              localStorage.setItem('sb_auth_session', JSON.stringify(session));
            }
            authSubscribers.forEach((cb) => {
              try {
                cb('SIGNED_IN', session);
              } catch {}
            });
            return session;
          })
          .catch(() => null)
          .finally(() => {
            pendingOAuthUserInfoPromise = null;
          });
      }
    } catch (e) {
      console.warn('[Supabase Auth] Lỗi giải mã token OAuth từ hash:', e);
    }
  }
  return null;
}

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
        const stored = localStorage.getItem('sb_auth_session') || localStorage.getItem('pomodoro_study_auth_session');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (parsed.access_token) token = parsed.access_token;
            else if (parsed.token) token = parsed.token;
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
    signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
      try {
        const baseUrl = SUPABASE_URL.replace(/\/+$/, '');
        const res = await fetch(`${baseUrl}/auth/v1/token?grant_type=password`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) {
          return {
            data: { user: null, session: null },
            error: { message: data.msg || data.error_description || data.message || 'Đăng nhập không thành công' }
          };
        }
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem('sb_auth_session', JSON.stringify(data));
        }
        authSubscribers.forEach((cb) => {
          try { cb('SIGNED_IN', data); } catch {}
        });
        return { data: { session: data, user: data.user }, error: null };
      } catch (err: any) {
        return { data: { user: null, session: null }, error: { message: err?.message || 'Lỗi mạng khi đăng nhập' } };
      }
    },

    signUp: async ({ email, password, options }: { email: string; password: string; options?: { data?: Record<string, any> } }) => {
      try {
        const baseUrl = SUPABASE_URL.replace(/\/+$/, '');
        const res = await fetch(`${baseUrl}/auth/v1/signup`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email, password, data: options?.data || {} })
        });
        const data = await res.json();
        if (!res.ok) {
          return {
            data: { user: null, session: null },
            error: { message: data.msg || data.error_description || data.message || 'Đăng ký không thành công' }
          };
        }
        if (data.access_token && typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem('sb_auth_session', JSON.stringify(data));
          authSubscribers.forEach((cb) => {
            try { cb('SIGNED_IN', data); } catch {}
          });
        }
        return { data: { session: data.access_token ? data : null, user: data.user || data }, error: null };
      } catch (err: any) {
        return { data: { user: null, session: null }, error: { message: err?.message || 'Lỗi mạng khi đăng ký' } };
      }
    },

    saveSession: (session: any) => {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('sb_auth_session', JSON.stringify(session));
      }
      authSubscribers.forEach((cb) => {
        try { cb('SIGNED_IN', session); } catch {}
      });
    },

    signInWithOAuth: async ({ provider, options }: { provider: string; options?: { redirectTo?: string; directGoogle?: boolean } }) => {
      try {
        const baseUrl = SUPABASE_URL.replace(/\/+$/, '');
        const redirectUri = options?.redirectTo || (typeof window !== 'undefined' ? `${window.location.origin}/app` : '/app');
        const oauthUrl = `${baseUrl}/auth/v1/authorize?provider=${encodeURIComponent(provider)}&redirect_to=${encodeURIComponent(redirectUri)}`;

        if (typeof window !== 'undefined') {
          if (provider === 'google' && options?.directGoogle) {
            const clientId = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_CLIENT_ID) || '935136578653-mfq96ugjbgf0bgg73ei9pask52rm0f09.apps.googleusercontent.com';
            const nonce = Math.random().toString(36).substring(2);
            const googleRedirectUri = window.location.origin;
            window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(googleRedirectUri)}&response_type=token%20id_token&scope=openid%20email%20profile&nonce=${nonce}&prompt=select_account`;
          } else {
            window.location.href = oauthUrl;
          }
        }
        return { data: { provider, url: oauthUrl }, error: null };
      } catch (err: any) {
        return { data: null, error: { message: err?.message || 'Lỗi khởi tạo OAuth' } };
      }
    },

    signOut: async (options?: { scope?: 'global' | 'local' | 'others' }) => {
      if (typeof window !== 'undefined' && options?.scope !== 'others') {
        localStorage.removeItem('sb_auth_session');
        localStorage.removeItem('pomodoro_study_auth_session');
        authSubscribers.forEach((cb) => {
          try {
            cb('SIGNED_OUT', null);
          } catch {}
        });
      }
      return { error: null };
    },

    updateUser: async (_attributes?: { password?: string; data?: any }) => {
      return { data: { user: null }, error: null };
    },

    resetPasswordForEmail: async (email: string, options?: { redirectTo?: string }) => {
      try {
        const baseUrl = SUPABASE_URL.replace(/\/+$/, '');
        const url = `${baseUrl}/auth/v1/recover`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email,
            gotrue_meta_security: {},
            redirect_to: options?.redirectTo
          })
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ message: 'Recovery failed' }));
          return { data: null, error: err };
        }
        return { data: {}, error: null };
      } catch (err: any) {
        return { data: null, error: { message: err?.message || 'Error sending recovery email' } };
      }
    },

    getSession: async () => {
      if (typeof window === 'undefined') return { data: { session: null }, error: null };

      // 1. Kiểm tra URL hash fragment nếu vừa chuyển hướng từ Google OAuth
      const oauthSession = parseOAuthHashSession();
      if (oauthSession) {
        if (window.history && window.history.replaceState) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
        if (window.localStorage) {
          localStorage.setItem('sb_auth_session', JSON.stringify(oauthSession));
        }
        return { data: { session: oauthSession }, error: null };
      }
      if (pendingOAuthUserInfoPromise) {
        const resolved = await pendingOAuthUserInfoPromise;
        if (resolved) {
          return { data: { session: resolved }, error: null };
        }
      }

      // 2. Đọc session đã lưu trong localStorage
      const raw = localStorage.getItem('sb_auth_session') || localStorage.getItem('pomodoro_study_auth_session');
      if (!raw) return { data: { session: null }, error: null };
      try {
        const parsed = JSON.parse(raw);
        const session = parsed.access_token ? parsed : {
          access_token: parsed.token || 'sb_token',
          user: {
            id: parsed.id,
            email: parsed.email,
            user_metadata: {
              full_name: parsed.displayName,
              name: parsed.displayName,
              avatar_url: parsed.avatarUrl,
              picture: parsed.avatarUrl,
              ...parsed.user_metadata,
            },
            ...parsed,
          }
        };
        return { data: { session }, error: null };
      } catch {
        return { data: { session: null }, error: null };
      }
    },

    getUser: async () => {
      const { data } = await supabase.auth.getSession();
      return { data: { user: data.session?.user || null }, error: null };
    },

    onAuthStateChange: (callback: (event: string, session: any) => void) => {
      authSubscribers.add(callback);

      if (typeof window !== 'undefined') {
        const oauthSession = parseOAuthHashSession();
        if (oauthSession) {
          if (window.localStorage) {
            localStorage.setItem('sb_auth_session', JSON.stringify(oauthSession));
          }
          setTimeout(() => callback('SIGNED_IN', oauthSession), 0);
          if (window.history && window.history.replaceState) {
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
          }
        } else {
          const raw = localStorage.getItem('sb_auth_session') || localStorage.getItem('pomodoro_study_auth_session');
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              const session = parsed.access_token ? parsed : {
                access_token: parsed.token || 'sb_token',
                user: {
                  id: parsed.id,
                  email: parsed.email,
                  user_metadata: {
                    full_name: parsed.displayName,
                    name: parsed.displayName,
                    avatar_url: parsed.avatarUrl,
                    picture: parsed.avatarUrl,
                    ...parsed.user_metadata,
                  },
                  ...parsed,
                }
              };
              setTimeout(() => callback('INITIAL_SESSION', session), 0);
            } catch {}
          }
        }
      }

      return {
        data: {
          subscription: {
            unsubscribe: () => {
              authSubscribers.delete(callback);
            }
          }
        }
      };
    }
  },

  from: (table: string) => {
    const getHeaders = (extra: Record<string, string> = {}) => {
      let token = SUPABASE_ANON_KEY;
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('sb_auth_session') || localStorage.getItem('pomodoro_study_auth_session');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (parsed.access_token) token = parsed.access_token;
            else if (parsed.token) token = parsed.token;
          } catch {}
        }
      }
      return {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${token}`,
        ...extra,
      };
    };

    return {
      select: (columns: string = '*') => {
        const filters: Array<{ col: string; op: string; val: any }> = [];
        let orderClause: { col: string; ascending: boolean } | null = null;
        let limitVal: number | null = null;

        const execute = async () => {
          try {
            const baseUrl = SUPABASE_URL.replace(/\/+$/, '');
            let url = `${baseUrl}/rest/v1/${table}?select=${encodeURIComponent(columns)}`;
            for (const f of filters) {
              url += `&${encodeURIComponent(f.col)}=${f.op}.${encodeURIComponent(f.val)}`;
            }
            if (orderClause) {
              url += `&order=${encodeURIComponent(orderClause.col)}.${orderClause.ascending ? 'asc' : 'desc'}`;
            }
            if (limitVal !== null) {
              url += `&limit=${limitVal}`;
            }

            const res = await fetch(url, { headers: getHeaders({ 'Content-Type': 'application/json' }) });
            if (!res.ok) {
              let errBody: any;
              try { errBody = await res.json(); } catch { errBody = { message: `HTTP ${res.status}` }; }
              return { data: null, error: errBody };
            }
            const data = await res.json();
            return { data, error: null };
          } catch (err: any) {
            return { data: null, error: { message: err?.message || 'Network error' } };
          }
        };

        const queryBuilder = {
          eq: (column: string, value: any) => {
            filters.push({ col: column, op: 'eq', val: value });
            return queryBuilder;
          },
          order: (column: string, options?: { ascending?: boolean }) => {
            orderClause = { col: column, ascending: options?.ascending !== false };
            return queryBuilder;
          },
          limit: (n: number) => {
            limitVal = n;
            return queryBuilder;
          },
          single: async (): Promise<{ data: any; error: any }> => {
            limitVal = 1;
            const res = await execute();
            if (res.error) return res;
            const item = Array.isArray(res.data) && res.data.length > 0 ? res.data[0] : null;
            return { data: item, error: null };
          },
          maybeSingle: async (): Promise<{ data: any; error: any }> => {
            limitVal = 1;
            const res = await execute();
            if (res.error) return { data: null, error: null };
            const item = Array.isArray(res.data) && res.data.length > 0 ? res.data[0] : null;
            return { data: item, error: null };
          },
          then: (onfulfilled?: (value: { data: any; error: any }) => any, onrejected?: (reason: any) => any) => {
            return execute().then(onfulfilled, onrejected);
          }
        };
        return queryBuilder;
      },

      insert: async (rows: any | any[]): Promise<{ data: any; error: any }> => {
        try {
          const baseUrl = SUPABASE_URL.replace(/\/+$/, '');
          const url = `${baseUrl}/rest/v1/${table}`;
          const bodyData = Array.isArray(rows) ? rows : [rows];
          const res = await fetch(url, {
            method: 'POST',
            headers: getHeaders({
              'Content-Type': 'application/json',
              'Prefer': 'return=representation'
            }),
            body: JSON.stringify(bodyData)
          });
          if (!res.ok) {
            let errBody: any;
            try { errBody = await res.json(); } catch { errBody = { message: `HTTP ${res.status}` }; }
            return { data: null, error: errBody };
          }
          const data = await res.json().catch(() => null);
          return { data: Array.isArray(rows) ? data : (data?.[0] || rows), error: null };
        } catch (err: any) {
          return { data: null, error: { message: err?.message || 'Network error' } };
        }
      },

      upsert: async (rows: any | any[], options?: { onConflict?: string }): Promise<{ data: any; error: any }> => {
        try {
          const baseUrl = SUPABASE_URL.replace(/\/+$/, '');
          let url = `${baseUrl}/rest/v1/${table}`;
          if (options?.onConflict) {
            url += `?on_conflict=${encodeURIComponent(options.onConflict)}`;
          }
          const bodyData = Array.isArray(rows) ? rows : [rows];
          const res = await fetch(url, {
            method: 'POST',
            headers: getHeaders({
              'Content-Type': 'application/json',
              'Prefer': 'resolution=merge-duplicates,return=representation'
            }),
            body: JSON.stringify(bodyData)
          });
          if (!res.ok) {
            let errBody: any;
            try { errBody = await res.json(); } catch { errBody = { message: `HTTP ${res.status}` }; }
            return { data: null, error: errBody };
          }
          const data = await res.json().catch(() => null);
          return { data: Array.isArray(rows) ? data : (data?.[0] || rows), error: null };
        } catch (err: any) {
          return { data: null, error: { message: err?.message || 'Network error' } };
        }
      },

      update: (updates: Record<string, any>) => {
        const filters: Array<{ col: string; op: string; val: any }> = [];
        const execute = async () => {
          try {
            const baseUrl = SUPABASE_URL.replace(/\/+$/, '');
            let url = `${baseUrl}/rest/v1/${table}`;
            if (filters.length > 0) {
              const filterStrings = filters.map(f => `${encodeURIComponent(f.col)}=${f.op}.${encodeURIComponent(f.val)}`);
              url += `?${filterStrings.join('&')}`;
            }
            const res = await fetch(url, {
              method: 'PATCH',
              headers: getHeaders({
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
              }),
              body: JSON.stringify(updates)
            });
            if (!res.ok) {
              let errBody: any;
              try { errBody = await res.json(); } catch { errBody = { message: `HTTP ${res.status}` }; }
              return { data: null, error: errBody };
            }
            const data = await res.json().catch(() => null);
            return { data, error: null };
          } catch (err: any) {
            return { data: null, error: { message: err?.message || 'Network error' } };
          }
        };

        const queryBuilder = {
          eq: (col: string, val: any) => {
            filters.push({ col, op: 'eq', val });
            return queryBuilder;
          },
          then: (onfulfilled?: (value: { data: any; error: any }) => any, onrejected?: (reason: any) => any) => {
            return execute().then(onfulfilled, onrejected);
          },
          catch: (onrejected?: (reason: any) => any) => {
            return execute().catch(onrejected);
          }
        };
        return queryBuilder;
      },

      delete: () => {
        const filters: Array<{ col: string; op: string; val: any }> = [];
        const execute = async () => {
          try {
            const baseUrl = SUPABASE_URL.replace(/\/+$/, '');
            let url = `${baseUrl}/rest/v1/${table}`;
            if (filters.length > 0) {
              const filterStrings = filters.map(f => `${encodeURIComponent(f.col)}=${f.op}.${encodeURIComponent(f.val)}`);
              url += `?${filterStrings.join('&')}`;
            }
            const res = await fetch(url, {
              method: 'DELETE',
              headers: getHeaders({ 'Content-Type': 'application/json' })
            });
            if (!res.ok) {
              let errBody: any;
              try { errBody = await res.json(); } catch { errBody = { message: `HTTP ${res.status}` }; }
              return { data: null, error: errBody };
            }
            return { data: null, error: null };
          } catch (err: any) {
            return { data: null, error: { message: err?.message || 'Network error' } };
          }
        };

        const queryBuilder = {
          eq: (col: string, val: any) => {
            filters.push({ col, op: 'eq', val });
            return queryBuilder;
          },
          then: (onfulfilled?: (value: { data: any; error: any }) => any, onrejected?: (reason: any) => any) => {
            return execute().then(onfulfilled, onrejected);
          },
          catch: (onrejected?: (reason: any) => any) => {
            return execute().catch(onrejected);
          }
        };
        return queryBuilder;
      }
    };
  },

  storage: {
    from: (bucket: string) => ({
      upload: async (filePath: string, file: Blob | File | ArrayBuffer, options?: { contentType?: string; upsert?: boolean }) => {
        try {
          const baseUrl = SUPABASE_URL.replace(/\/+$/, '');
          const cleanPath = filePath.replace(/^\/+/, '');
          const url = `${baseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${cleanPath}`;

          let contentType = options?.contentType;
          if (!contentType && typeof File !== 'undefined' && file instanceof File) {
            contentType = file.type;
          }
          if (!contentType) {
            contentType = 'application/octet-stream';
          }

          let token = SUPABASE_ANON_KEY;
          if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('sb_auth_session') || localStorage.getItem('pomodoro_study_auth_session');
            if (stored) {
              try {
                const parsed = JSON.parse(stored);
                if (parsed.access_token) token = parsed.access_token;
                else if (parsed.token) token = parsed.token;
              } catch {}
            }
          }

          const res = await fetch(url, {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${token}`,
              'Content-Type': contentType,
              'x-upsert': options?.upsert ? 'true' : 'false'
            },
            body: file
          });

          if (!res.ok) {
            let errBody: any;
            try { errBody = await res.json(); } catch { errBody = { message: `HTTP ${res.status}` }; }
            return { data: null, error: errBody };
          }
          const data = await res.json().catch(() => ({ Key: `${bucket}/${cleanPath}` }));
          return { data, error: null };
        } catch (err: any) {
          return { data: null, error: { message: err?.message || 'Storage upload error' } };
        }
      },
      getPublicUrl: (filePath: string) => {
        const baseUrl = SUPABASE_URL.replace(/\/+$/, '');
        const cleanPath = filePath.replace(/^\/+/, '');
        return {
          data: {
            publicUrl: `${baseUrl}/storage/v1/object/public/${encodeURIComponent(bucket)}/${cleanPath}`
          }
        };
      }
    })
  }
};
