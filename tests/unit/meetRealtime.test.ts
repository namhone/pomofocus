import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { meetRealtimeService, MeetRealtimeService } from '../../src/services/meet/realtimeService';
import { useMeetStore } from '../../src/stores/useMeetStore';
import { supabase } from '../../src/lib/supabase';
import type { RoomMessage, PresenceState } from '../../src/types/meet';

describe('Meet Realtime Service & Defense-in-Depth Teardown Tests', () => {
  const roomId = 'pomo-test-room-123';
  const myUserId = 'user_me_001';
  const otherUserId = 'user_other_002';

  beforeEach(() => {
    localStorage.clear();
    useMeetStore.getState().reset();
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

  describe('2. Defense-in-Depth Teardown trong useMeetStore', () => {
    it('khi bản thân bị Kick: hủy kết nối WebSocket, xóa sạch state phòng và kích hoạt redirect', async () => {
      const onKickedRedirect = vi.fn();
      const onCloseRedirect = vi.fn();

      const store = useMeetStore.getState();
      await store.createRoom('Phòng Kiểm Tra Teardown Kick', 10);
      await store.sendMessage(roomId, 'Tin nhắn trước khi bị kick', 'c1');

      store.subscribeRealtime(roomId, myUserId, {
        onKicked: onKickedRedirect,
        onClosed: onCloseRedirect,
      });

      expect(useMeetStore.getState().currentRoom).not.toBeNull();
      expect(useMeetStore.getState().isKicked).toBe(false);

      // Kích hoạt sự kiện Kick từ Host
      const channel = meetRealtimeService.getChannel();
      channel?.dispatchLocalPostgresChange('room_memberships', 'UPDATE', {
        user_id: myUserId,
        room_id: roomId,
        status: 'revoked',
      });

      // Kiểm tra Tầng 1: Client state được dọn dẹp sạch sẽ
      expect(useMeetStore.getState().currentRoom).toBeNull();
      expect(useMeetStore.getState().messages).toHaveLength(0);
      expect(useMeetStore.getState().onlineMembers).toHaveLength(0);
      expect(useMeetStore.getState().isKicked).toBe(true);
      expect(useMeetStore.getState().kickedReason).toContain('mời ra khỏi phòng học');
      expect(onKickedRedirect).toHaveBeenCalledTimes(1);

      // WebSocket / Socket channel đã được đóng hoàn toàn
      expect(meetRealtimeService.getChannel()).toBeNull();
    });

    it('khi thành viên khác bị Kick: bản thân không bị ảnh hưởng, phòng vẫn duy trì', async () => {
      const onKickedRedirect = vi.fn();

      const store = useMeetStore.getState();
      await store.createRoom('Phòng Duy Trì', 10);

      store.subscribeRealtime(roomId, myUserId, {
        onKicked: onKickedRedirect,
      });

      const channel = meetRealtimeService.getChannel();
      channel?.dispatchLocalPostgresChange('room_memberships', 'UPDATE', {
        user_id: otherUserId,
        room_id: roomId,
        status: 'revoked',
      });

      expect(useMeetStore.getState().currentRoom).not.toBeNull();
      expect(useMeetStore.getState().isKicked).toBe(false);
      expect(onKickedRedirect).not.toHaveBeenCalled();
      expect(meetRealtimeService.getChannel()).not.toBeNull();
    });

    it('khi Host đóng phòng: toàn bộ học viên hủy kết nối socket và nhận thông báo phòng đóng', async () => {
      const onClosedRedirect = vi.fn();

      const store = useMeetStore.getState();
      await store.createRoom('Phòng Chuẩn Bị Kết Thúc', 10);

      store.subscribeRealtime(roomId, myUserId, {
        onClosed: onClosedRedirect,
      });

      const channel = meetRealtimeService.getChannel();
      channel?.dispatchLocalPostgresChange('study_rooms', 'UPDATE', {
        id: roomId,
        status: 'closed',
      });

      expect(useMeetStore.getState().isRoomClosed).toBe(true);
      expect(useMeetStore.getState().roomClosedReason).toContain('kết thúc phiên');
      expect(onClosedRedirect).toHaveBeenCalledTimes(1);
      expect(meetRealtimeService.getChannel()).toBeNull();
    });
  });
});
