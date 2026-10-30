import { supabase } from '@/lib/supabase';
import type { IMeetRepository, StudyRoom, RoomMessage, InviteTokenResult, JoinRoomResult } from '@/types/meet';
import { LocalMeetAdapter } from './localAdapter';

function isSchemaCacheError(err: any): boolean {
  if (!err) return false;
  const msg = String(err.message || '');
  const code = String(err.code || '');
  return (
    code === 'PGRST202' ||
    msg.includes('schema cache') ||
    msg.includes('Could not find the function') ||
    msg.includes('function public.')
  );
}

// Helper retry tự động khi gặp lỗi serialization / timeout mạng
export async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3, baseDelayMs = 50): Promise<T> {
  let attempt = 0;
  while (attempt < maxAttempts) {
    try {
      return await fn();
    } catch (err: any) {
      if (isSchemaCacheError(err)) {
        throw err;
      }
      attempt++;
      const isRetryable =
        err?.code === '40P01' ||
        err?.code === '40001' ||
        err?.code === 'network' ||
        err?.message?.includes('network') ||
        err?.message?.includes('deadlock');
      if (!isRetryable || attempt >= maxAttempts) throw err;
      const jitter = Math.random() * baseDelayMs;
      const delay = Math.min(1500, baseDelayMs * Math.pow(2, attempt) + jitter);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error('RETRY_EXHAUSTED');
}

export class SupabaseMeetAdapter implements IMeetRepository {
  private fallbackAdapter = new LocalMeetAdapter();

  async createRoom(title: string, capacityLimit = 10): Promise<StudyRoom> {
    try {
      return await withRetry(async () => {
        const { data, error } = await supabase.rpc('create_study_room', {
          p_title: title,
          p_capacity_limit: capacityLimit,
        });
        if (error) {
          const err: any = new Error(error.message);
          err.code = error.code;
          throw err;
        }
        return {
          id: data.room_id,
          hostUserId: data.host_user_id,
          title,
          status: data.status,
          capacityLimit: data.capacity_limit,
          createdAt: new Date().toISOString(),
        };
      });
    } catch (err: any) {
      if (isSchemaCacheError(err)) {
        console.warn('[SupabaseMeetAdapter] Cloud RPC not found (deploy_cloud_bundle.sql pending). Falling back to local adapter.');
        return this.fallbackAdapter.createRoom(title, capacityLimit);
      }
      throw err;
    }
  }

  async createInviteToken(
    roomId: string,
    tokenType: 'single_use' | 'multi_use',
    maxUses = 1,
    durationHours = 24
  ): Promise<InviteTokenResult> {
    try {
      return await withRetry(async () => {
        const { data, error } = await supabase.rpc('create_room_invite_token', {
          p_room_id: roomId,
          p_token_type: tokenType,
          p_max_uses: maxUses,
          p_duration_hours: durationHours,
        });
        if (error) {
          const err: any = new Error(error.message);
          err.code = error.code;
          throw err;
        }
        return {
          rawToken: data.raw_token,
          expiresAt: data.expires_at,
          tokenType: data.token_type,
        };
      });
    } catch (err: any) {
      if (isSchemaCacheError(err)) {
        return this.fallbackAdapter.createInviteToken(roomId, tokenType, maxUses, durationHours);
      }
      throw err;
    }
  }

  async joinRoom(roomId: string, rawToken: string): Promise<JoinRoomResult> {
    try {
      return await withRetry(async () => {
        const { data, error } = await supabase.rpc('join_room', {
          p_room_id: roomId,
          p_raw_token: rawToken,
        });
        if (error) {
          const err: any = new Error(error.message);
          err.code = error.code;
          throw err;
        }
        return {
          success: data.success,
          roomId: data.room_id,
          role: data.role,
          status: data.status,
          isReconnect: data.is_reconnect,
        };
      });
    } catch (err: any) {
      if (isSchemaCacheError(err)) {
        return this.fallbackAdapter.joinRoom(roomId, rawToken);
      }
      throw err;
    }
  }

  async sendMessage(roomId: string, clientMessageId: string, content: string): Promise<RoomMessage> {
    try {
      return await withRetry(async () => {
        const { data, error } = await supabase.rpc('send_room_message', {
          p_room_id: roomId,
          p_client_message_id: clientMessageId,
          p_content: content,
        });
        if (error) {
          const err: any = new Error(error.message);
          err.code = error.code;
          throw err;
        }
        return {
          id: data.id,
          roomId: data.room_id,
          senderUserId: data.sender_user_id,
          clientMessageId: data.client_message_id,
          content: data.content,
          createdAt: data.created_at,
        };
      });
    } catch (err: any) {
      if (isSchemaCacheError(err)) {
        return this.fallbackAdapter.sendMessage(roomId, clientMessageId, content);
      }
      throw err;
    }
  }

  async kickMember(roomId: string, targetUserId: string): Promise<void> {
    try {
      return await withRetry(async () => {
        const { error } = await supabase.rpc('kick_room_member', {
          p_room_id: roomId,
          p_target_user_id: targetUserId,
        });
        if (error) {
          const err: any = new Error(error.message);
          err.code = error.code;
          throw err;
        }
      });
    } catch (err: any) {
      if (isSchemaCacheError(err)) {
        return this.fallbackAdapter.kickMember(roomId, targetUserId);
      }
      throw err;
    }
  }

  async closeRoom(roomId: string): Promise<void> {
    try {
      return await withRetry(async () => {
        const { error } = await supabase.rpc('close_study_room', {
          p_room_id: roomId,
        });
        if (error) {
          const err: any = new Error(error.message);
          err.code = error.code;
          throw err;
        }
      });
    } catch (err: any) {
      if (isSchemaCacheError(err)) {
        return this.fallbackAdapter.closeRoom(roomId);
      }
      throw err;
    }
  }
}
