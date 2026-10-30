import { supabase, RealtimeChannel } from '@/lib/supabase';
import type { RoomMessage, PresenceState, RealtimeCallbacks } from '@/types/meet';

export type { PresenceState, RealtimeCallbacks };

export class MeetRealtimeService {
  private channel: RealtimeChannel | null = null;

  subscribe(roomId: string, currentUserId: string, callbacks: RealtimeCallbacks) {
    // Tránh đăng ký trùng lặp
    if (this.channel) {
      this.unsubscribe();
    }

    this.channel = supabase.channel(`room:${roomId}`, {
      config: {
        presence: { key: currentUserId },
        broadcast: { ack: false },
      },
    });

    // 1. Lắng nghe tin nhắn mới đã commit vào DB
    this.channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'room_messages',
        filter: `room_id=eq.${roomId}`,
      },
      (payload: any) => {
        if (payload?.new) {
          const msg: RoomMessage = {
            id: payload.new.id,
            roomId: payload.new.room_id,
            senderUserId: payload.new.sender_user_id,
            clientMessageId: payload.new.client_message_id,
            content: payload.new.content,
            createdAt: payload.new.created_at,
          };
          callbacks.onNewMessage(msg);
        }
      }
    );

    // 2. Lắng nghe sự kiện bị Kick (thay đổi membership của phòng)
    this.channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'room_memberships',
        filter: `room_id=eq.${roomId}`,
      },
      (payload: any) => {
        if (payload?.new && payload.new.status === 'revoked') {
          callbacks.onMemberRevoked(payload.new.user_id);
        }
      }
    );

    // 3. Lắng nghe sự kiện Host đóng phòng
    this.channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'study_rooms',
        filter: `id=eq.${roomId}`,
      },
      (payload: any) => {
        if (payload?.new && payload.new.status === 'closed') {
          callbacks.onRoomClosed();
        }
      }
    );

    // 4. Lắng nghe Presence (Danh sách bạn học trực tuyến)
    this.channel.on('presence', { event: 'sync' }, () => {
      if (!this.channel) return;
      const state = this.channel.presenceState();
      const members: PresenceState[] = [];
      Object.keys(state).forEach((key) => {
        if (state[key] && state[key].length > 0) {
          members.push(state[key][0] as PresenceState);
        }
      });
      callbacks.onPresenceSync(members);
    });

    this.channel.subscribe();
  }

  // Cập nhật trạng thái Pomodoro của bản thân lên Presence
  async trackPresence(state: PresenceState) {
    if (this.channel) {
      await this.channel.track(state);
    }
  }

  // Hủy đăng ký và đóng socket sạch sẽ
  unsubscribe() {
    if (this.channel) {
      this.channel.unsubscribe();
      this.channel = null;
    }
  }

  // Lấy tham chiếu channel hiện tại
  getChannel(): RealtimeChannel | null {
    return this.channel;
  }
}

export const meetRealtimeService = new MeetRealtimeService();
