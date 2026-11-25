import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { meetRealtimeService, MeetRealtimeService } from '../../src/services/meet/realtimeService';
import { supabase } from '../../src/lib/supabase';
import type { RoomMessage, PresenceState } from '../../src/types/meet';

describe('Meet Realtime Service & Defense-in-Depth Teardown Tests', () => {
  const roomId = 'pomo-test-room-123';
  const myUserId = 'user_me_001';
  const otherUserId = 'user_other_002';

  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(supabase, 'rpc').mockImplementation(async (fnName: string, params: any) => {
      if (fnName === 'create_study_room') {
        return {
          data: {
            room_id: '1111-2222-3333',
            host_user_id: 'usr_test_host',
            status: 'active',
            capacity_limit: params.p_capacity_limit || 10,
          },
          error: null,
        };
      }
      if (fnName === 'send_room_message') {
        return {
          data: {
            id: 'msg_rpc_001',
            room_id: params.p_room_id,
            sender_user_id: 'usr_test_sender',
            client_message_id: params.p_client_message_id,
            content: params.p_content,
            created_at: new Date().toISOString(),
          },
          error: null,
        };
      }
      return { data: null, error: null };
    });
  });

  afterEach(() => {
    meetRealtimeService.unsubscribe();
  });

  describe('1. Realtime Subscription & Postgres Changes Listeners', () => {
    it('lắng nghe và phân phối tin nhắn mới (INSERT trên room_messages)', () => {
      const onNewMessage = vi.fn();
      const onPresenceSync = vi.fn();
      const onMemberRevoked = vi.fn();
      const onRoomClosed = vi.fn();

      meetRealtimeService.subscribe(roomId, myUserId, {
        onNewMessage,
        onPresenceSync,
        onMemberRevoked,
        onRoomClosed,
      });

      const channel = meetRealtimeService.getChannel();
      expect(channel).not.toBeNull();

      // Giả lập sự kiện INSERT từ database
      const fakeMsgPayload = {
        id: 'msg_999',
        room_id: roomId,
        sender_user_id: otherUserId,
        client_message_id: 'cid_999',
        content: 'Chào mừng các bạn!',
        created_at: new Date().toISOString(),
      };

      channel?.dispatchLocalPostgresChange('room_messages', 'INSERT', fakeMsgPayload);

      expect(onNewMessage).toHaveBeenCalledTimes(1);
      const receivedMsg: RoomMessage = onNewMessage.mock.calls[0][0];
      expect(receivedMsg.id).toBe('msg_999');
      expect(receivedMsg.content).toBe('Chào mừng các bạn!');
      expect(receivedMsg.senderUserId).toBe(otherUserId);
    });

    it('lắng nghe sự kiện bị kick (UPDATE status=revoked trên room_memberships)', () => {
      const onMemberRevoked = vi.fn();

      meetRealtimeService.subscribe(roomId, myUserId, {
        onNewMessage: vi.fn(),
        onPresenceSync: vi.fn(),
        onMemberRevoked,
        onRoomClosed: vi.fn(),
      });

      const channel = meetRealtimeService.getChannel();

      // Phát sự kiện thành viên khác bị kick
      channel?.dispatchLocalPostgresChange('room_memberships', 'UPDATE', {
        user_id: otherUserId,
        room_id: roomId,
        status: 'revoked',
      });
      expect(onMemberRevoked).toHaveBeenCalledWith(otherUserId);

      // Phát sự kiện bản thân bị kick
      channel?.dispatchLocalPostgresChange('room_memberships', 'UPDATE', {
        user_id: myUserId,
        room_id: roomId,
        status: 'revoked',
      });
      expect(onMemberRevoked).toHaveBeenCalledWith(myUserId);
    });

    it('lắng nghe sự kiện Host đóng phòng (UPDATE status=closed trên study_rooms)', () => {
      const onRoomClosed = vi.fn();

      meetRealtimeService.subscribe(roomId, myUserId, {
        onNewMessage: vi.fn(),
        onPresenceSync: vi.fn(),
        onMemberRevoked: vi.fn(),
        onRoomClosed,
      });

      const channel = meetRealtimeService.getChannel();
      channel?.dispatchLocalPostgresChange('study_rooms', 'UPDATE', {
        id: roomId,
        status: 'closed',
      });

      expect(onRoomClosed).toHaveBeenCalledTimes(1);
    });

    it('đồng bộ danh sách Presence khi người dùng cập nhật trạng thái Pomodoro', async () => {
      const onPresenceSync = vi.fn();

      meetRealtimeService.subscribe(roomId, myUserId, {
        onNewMessage: vi.fn(),
        onPresenceSync,
        onMemberRevoked: vi.fn(),
        onRoomClosed: vi.fn(),
      });

      const myPresence: PresenceState = {
        userId: myUserId,
        displayName: 'Nam Developer',
        timerMode: 'focus',
        timerRemainingSeconds: 1500,
      };

      await meetRealtimeService.trackPresence(myPresence);

      expect(onPresenceSync).toHaveBeenCalled();
      const syncedMembers: PresenceState[] = onPresenceSync.mock.calls.at(-1)?.[0];
      expect(syncedMembers).toContainEqual(myPresence);
    });
  });

  describe('2. Active realtime service teardown', () => {
    const callbacks = () => ({ onNewMessage: vi.fn(), onPresenceSync: vi.fn(), onMemberRevoked: vi.fn(), onRoomClosed: vi.fn() });
    it('unsubscribe releases the channel and a new visit creates a fresh subscription', () => {
      meetRealtimeService.subscribe(roomId, myUserId, callbacks());
      const previous = meetRealtimeService.getChannel()!;
      meetRealtimeService.unsubscribe();
      expect(previous.isSubscribed).toBe(false);
      expect(meetRealtimeService.getChannel()).toBeNull();
      meetRealtimeService.subscribe(roomId, myUserId, callbacks());
      expect(meetRealtimeService.getChannel()).not.toBe(previous);
    });
    it('switching rooms tears down the previous subscription', () => {
      meetRealtimeService.subscribe(roomId, myUserId, callbacks());
      const previous = meetRealtimeService.getChannel()!;
      meetRealtimeService.subscribe('another-room', myUserId, callbacks());
      expect(previous.isSubscribed).toBe(false);
      expect(meetRealtimeService.getChannel()?.topic).toBe('room:another-room');
    });
  });
});
