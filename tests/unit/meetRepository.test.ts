import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LocalMeetAdapter } from '../../src/services/meet/localAdapter';
import { SupabaseMeetAdapter, withRetry } from '../../src/services/meet/supabaseAdapter';
import { useMeetStore } from '../../src/stores/useMeetStore';
import { supabase } from '../../src/lib/supabase';

describe('Meet Repository, Adapters & Feature Flag Architecture Tests', () => {
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
      if (fnName === 'create_room_invite_token') {
        return {
          data: {
            raw_token: 'tok_test_mock_123',
            expires_at: new Date(Date.now() + 86400000).toISOString(),
            token_type: params.p_token_type || 'single_use',
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
      if (fnName === 'close_study_room' || fnName === 'kick_room_member') {
        return { data: null, error: null };
      }
      return { data: null, error: null };
    });
  });

  describe('1. LocalMeetAdapter Functionality (Offline / Dexie / localStorage)', () => {
    const adapter = new LocalMeetAdapter();

    it('tạo phòng thành công với đầy đủ thông tin chuẩn StudyRoom', async () => {
      const room = await adapter.createRoom('Phòng Học Cục Bộ Thử Nghiệm', 10);
      expect(room).toBeDefined();
      expect(room.id).toMatch(/^[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$/);
      expect(room.title).toBe('Phòng Học Cục Bộ Thử Nghiệm');
      expect(room.status).toBe('active');
      expect(room.capacityLimit).toBe(10);
      expect(room.createdAt).toBeDefined();
    });

    it('tạo token mời với thời hạn hợp lệ', async () => {
      const room = await adapter.createRoom('Phòng Kiểm Tra Token', 5);
      const tokenRes = await adapter.createInviteToken(room.id, 'multi_use', 5, 48);
      expect(tokenRes.rawToken).toBeDefined();
      expect(tokenRes.tokenType).toBe('multi_use');
      expect(new Date(tokenRes.expiresAt).getTime()).toBeGreaterThan(Date.now());
    });

    it('gửi tin nhắn chat và nhận đúng cấu trúc RoomMessage', async () => {
      const room = await adapter.createRoom('Phòng Chat Thử Nghiệm', 5);
      const msg = await adapter.sendMessage(room.id, 'client_msg_001', 'Xin chào phòng học!');
      expect(msg.roomId).toBe(room.id);
      expect(msg.clientMessageId).toBe('client_msg_001');
      expect(msg.content).toBe('Xin chào phòng học!');
      expect(msg.id).toBeDefined();
    });

    it('đóng phòng học thành công', async () => {
      const room = await adapter.createRoom('Phòng Cần Đóng', 5);
      await expect(adapter.closeRoom(room.id)).resolves.not.toThrow();
    });
  });

  describe('2. SupabaseMeetAdapter withRetry & RPC Mapping', () => {
    it('withRetry tự động thử lại khi gặp lỗi transient network/deadlock và thành công', async () => {
      let callCount = 0;
      const transientFn = vi.fn(async () => {
        callCount++;
        if (callCount < 2) {
          const err: any = new Error('network error transient');
          err.code = 'network';
          throw err;
        }
        return 'success_data';
      });

      const res = await withRetry(transientFn, 3, 10);
      expect(res).toBe('success_data');
      expect(callCount).toBe(2);
    });

    it('withRetry ném lỗi nếu kiệt số lần retry cho phép', async () => {
      const failedFn = vi.fn(async () => {
        const err: any = new Error('persistent deadlock error');
        err.code = '40P01';
        throw err;
      });

      await expect(withRetry(failedFn, 2, 5)).rejects.toThrow('persistent deadlock error');
      expect(failedFn).toHaveBeenCalledTimes(2);
    });

    it('withRetry ném lỗi ngay lập tức nếu gặp lỗi không thể retry (non-retryable)', async () => {
      const fatalFn = vi.fn(async () => {
        const err: any = new Error('INVALID_ROOM_TITLE');
        err.code = '22000';
        throw err;
      });

      await expect(withRetry(fatalFn, 3, 10)).rejects.toThrow('INVALID_ROOM_TITLE');
      expect(fatalFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('3. Zustand useMeetStore Integration', () => {
    it('quản lý trạng thái tạo phòng và lưu trữ currentRoom', async () => {
      const store = useMeetStore.getState();
      const room = await store.createRoom('Phòng Zustand Test', 8);

      expect(useMeetStore.getState().currentRoom).toEqual(room);
      expect(useMeetStore.getState().isLoading).toBe(false);
      expect(useMeetStore.getState().error).toBeNull();
    });

    it('lưu trữ danh sách tin nhắn gửi đi trong messages', async () => {
      const store = useMeetStore.getState();
      const room = await store.createRoom('Phòng Chat Store Test', 8);
      const msg = await store.sendMessage(room.id, 'Nội dung tin nhắn 1', 'cid_001');

      expect(useMeetStore.getState().messages).toContainEqual(msg);
    });

    it('cập nhật trạng thái closed khi gọi closeRoom', async () => {
      const store = useMeetStore.getState();
      const room = await store.createRoom('Phòng Chuẩn Bị Đóng', 8);
      await store.closeRoom(room.id);

      expect(useMeetStore.getState().currentRoom?.status).toBe('closed');
    });
  });
});
