import { create } from 'zustand';
import type {
  StudyRoom,
  RoomMessage,
  InviteTokenResult,
  JoinRoomResult,
  PresenceState
} from '@/types/meet';
import { meetRepository } from '@/services/meet/meetRepository';
import { meetRealtimeService } from '@/services/meet/realtimeService';

export interface MeetState {
  currentRoom: StudyRoom | null;
  activeInviteToken: InviteTokenResult | null;
  messages: RoomMessage[];
  onlineMembers: PresenceState[];
  isLoading: boolean;
  error: string | null;

  // Cờ phòng vệ Teardown
  isKicked: boolean;
  kickedReason: string | null;
  isRoomClosed: boolean;
  roomClosedReason: string | null;

  // Actions nghiệp vụ
  createRoom: (title: string, capacityLimit?: number) => Promise<StudyRoom>;
  createInviteToken: (
    roomId: string,
    tokenType?: 'single_use' | 'multi_use',
    maxUses?: number,
    durationHours?: number
  ) => Promise<InviteTokenResult>;
  joinRoom: (roomId: string, rawToken: string) => Promise<JoinRoomResult>;
  sendMessage: (roomId: string, content: string, clientMessageId?: string) => Promise<RoomMessage>;
  kickMember: (roomId: string, targetUserId: string) => Promise<void>;
  closeRoom: (roomId: string) => Promise<void>;

  // Actions Realtime & Teardown
  subscribeRealtime: (
    roomId: string,
    currentUserId: string,
    options?: {
      onKicked?: () => void;
      onClosed?: () => void;
    }
  ) => void;
  unsubscribeRealtime: () => void;
  updatePresence: (state: PresenceState) => Promise<void>;
  dismissTeardownNotification: () => void;

  clearError: () => void;
  reset: () => void;
}

export const useMeetStore = create<MeetState>((set) => ({
  currentRoom: null,
  activeInviteToken: null,
  messages: [],
  onlineMembers: [],
  isLoading: false,
  error: null,

  isKicked: false,
  kickedReason: null,
  isRoomClosed: false,
  roomClosedReason: null,

  createRoom: async (title: string, capacityLimit = 10) => {
    set({ isLoading: true, error: null, isKicked: false, isRoomClosed: false });
    try {
      const room = await meetRepository.createRoom(title, capacityLimit);
      set({ currentRoom: room, isLoading: false });
      return room;
    } catch (err: any) {
      const msg = err?.message || 'Không thể tạo phòng học.';
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  createInviteToken: async (
    roomId: string,
    tokenType: 'single_use' | 'multi_use' = 'single_use',
    maxUses = 1,
    durationHours = 24
  ) => {
    set({ isLoading: true, error: null });
    try {
      const tokenResult = await meetRepository.createInviteToken(
        roomId,
        tokenType,
        maxUses,
        durationHours
      );
      set({ activeInviteToken: tokenResult, isLoading: false });
      return tokenResult;
    } catch (err: any) {
      const msg = err?.message || 'Không thể tạo link mời.';
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  joinRoom: async (roomId: string, rawToken: string) => {
    set({ isLoading: true, error: null, isKicked: false, isRoomClosed: false });
    try {
      const joinResult = await meetRepository.joinRoom(roomId, rawToken);
      set({ isLoading: false });
      return joinResult;
    } catch (err: any) {
      const msg = err?.message || 'Không thể tham gia phòng học.';
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  sendMessage: async (roomId: string, content: string, clientMessageId?: string) => {
    const msgId = clientMessageId || 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    try {
      const msg = await meetRepository.sendMessage(roomId, msgId, content);
      set((state) => ({
        messages: [...state.messages.filter((m) => m.clientMessageId !== msgId && m.id !== msg.id), msg],
      }));
      return msg;
    } catch (err: any) {
      const errMsg = err?.message || 'Không thể gửi tin nhắn.';
      set({ error: errMsg });
      throw err;
    }
  },

  kickMember: async (roomId: string, targetUserId: string) => {
    set({ isLoading: true, error: null });
    try {
      await meetRepository.kickMember(roomId, targetUserId);
      set({ isLoading: false });
    } catch (err: any) {
      const msg = err?.message || 'Không thể xóa thành viên khỏi phòng.';
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  closeRoom: async (roomId: string) => {
    set({ isLoading: true, error: null });
    try {
      await meetRepository.closeRoom(roomId);
      set((state) => ({
        currentRoom: state.currentRoom ? { ...state.currentRoom, status: 'closed' } : null,
        isLoading: false,
      }));
    } catch (err: any) {
      const msg = err?.message || 'Không thể đóng phòng học.';
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  subscribeRealtime: (roomId: string, currentUserId: string, options) => {
    meetRealtimeService.subscribe(roomId, currentUserId, {
      onNewMessage: (msg: RoomMessage) => {
        set((state) => {
          // Tránh duplicate tin nhắn nếu đã có trong store
          const exists = state.messages.some(
            (m) => m.id === msg.id || (m.clientMessageId && m.clientMessageId === msg.clientMessageId)
          );
          if (exists) {
            return {
              messages: state.messages.map((m) =>
                m.id === msg.id || m.clientMessageId === msg.clientMessageId ? msg : m
              ),
            };
          }
          return { messages: [...state.messages, msg] };
        });
      },

      onPresenceSync: (members: PresenceState[]) => {
        set({ onlineMembers: members });
      },

      onMemberRevoked: (targetUserId: string) => {
        if (targetUserId === currentUserId) {
          // Tầng 1: Cắt kết nối WebSocket và dọn dẹp state phòng
          meetRealtimeService.unsubscribe();
          set({
            currentRoom: null,
            messages: [],
            onlineMembers: [],
            isKicked: true,
            kickedReason: 'Bạn đã bị trưởng phòng mời ra khỏi phòng học.',
          });
          options?.onKicked?.();
        }
      },

      onRoomClosed: () => {
        // Tầng 1: Nhận tin báo phòng đóng, hủy đăng ký socket và thông báo
        meetRealtimeService.unsubscribe();
        set((state) => ({
          isRoomClosed: true,
          roomClosedReason: 'Phòng học đã kết thúc phiên bởi trưởng phòng.',
          currentRoom: state.currentRoom ? { ...state.currentRoom, status: 'closed' } : null,
        }));
        options?.onClosed?.();
      },
    });
  },

  unsubscribeRealtime: () => {
    meetRealtimeService.unsubscribe();
    set({ onlineMembers: [] });
  },

  updatePresence: async (state: PresenceState) => {
    await meetRealtimeService.trackPresence(state);
  },

  dismissTeardownNotification: () => {
    set({ isKicked: false, kickedReason: null, isRoomClosed: false, roomClosedReason: null });
  },

  clearError: () => set({ error: null }),

  reset: () => {
    meetRealtimeService.unsubscribe();
    set({
      currentRoom: null,
      activeInviteToken: null,
      messages: [],
      onlineMembers: [],
      isLoading: false,
      error: null,
      isKicked: false,
      kickedReason: null,
      isRoomClosed: false,
      roomClosedReason: null,
    });
  },
}));
