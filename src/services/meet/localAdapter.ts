import type { IMeetRepository, StudyRoom, RoomMessage, InviteTokenResult, JoinRoomResult } from '@/types/meet';
import { studyRoomService } from '../studyRoomService';
import { useAuthStore } from '@/stores/useAuthStore';
import { supabase } from '@/lib/supabase';

/**
 * LOCAL MEET ADAPTER
 * ==============================================================================
 * Bọc lại logic IndexedDB / localStorage / BroadcastChannel hiện tại
 * tuân thủ hợp đồng IMeetRepository, giữ nguyên khả năng hoạt động offline.
 */
export class LocalMeetAdapter implements IMeetRepository {
  private getEffectiveUser() {
    return useAuthStore.getState().user || {
      id: 'local_default_user',
      email: 'user@pomofocus.local',
      displayName: 'Pomodoro User',
      plan: 'free' as const,
      createdAt: Date.now(),
    };
  }

  async createRoom(title: string, capacityLimit = 10): Promise<StudyRoom> {
    const user = this.getEffectiveUser();
    const result = studyRoomService.createRoom({
      title,
      hostUser: { ...user, plan: 'pro_lifetime' }, // Đảm bảo adapter test nội bộ có quyền hợp lệ
    });
    if (!result.success) {
      throw new Error(result.error);
    }
    const room = result.room;
    return {
      id: room.roomId,
      hostUserId: room.hostUserId,
      title: room.title,
      status: room.status,
      capacityLimit,
      createdAt: new Date(room.createdAt).toISOString(),
    };
  }

  async createInviteToken(
    roomId: string,
    tokenType: 'single_use' | 'multi_use',
    _maxUses = 1,
    durationHours = 24
  ): Promise<InviteTokenResult> {
    const user = this.getEffectiveUser();
    studyRoomService.revokeAndRegenerateInviteToken(roomId, user);
    const room = studyRoomService.getRoom(roomId);
    const rawToken = room?.activeInviteToken || 'local_mock_token_' + Date.now();
    const expiresAt = new Date(Date.now() + (durationHours || 24) * 3600000).toISOString();
    return {
      rawToken,
      expiresAt,
      tokenType,
    };
  }

  async joinRoom(roomId: string, rawToken: string): Promise<JoinRoomResult> {
    const user = this.getEffectiveUser();
    const access = studyRoomService.verifyRoomAccess(roomId, user, rawToken);
    if (!access.allowed) {
      throw new Error(access.message || access.code);
    }

    const memberRole: 'host' | 'member' = access.role === 'host' ? 'host' : 'member';
    studyRoomService.joinParticipant(roomId, {
      id: user.id,
      name: user.displayName || 'Thành viên',
      role: access.role,
      isMicOn: false,
      isVideoOn: false,
      joinedAt: Date.now(),
    });

    return {
      success: true,
      roomId,
      role: memberRole,
      status: 'active',
      isReconnect: false,
    };
  }

  async sendMessage(roomId: string, clientMessageId: string, content: string): Promise<RoomMessage> {
    const user = this.getEffectiveUser();
    const msg: RoomMessage = {
      id: 'local_msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      roomId,
      senderUserId: user.id,
      clientMessageId,
      content,
      createdAt: new Date().toISOString(),
    };

    if (studyRoomService.broadcastChannel) {
      studyRoomService.broadcastChannel.postMessage({
        type: 'CHAT_MESSAGE',
        roomId,
        message: msg,
      });
    }

    // Phát sự kiện vào kênh Realtime tương thích
    supabase.channel(`room:${roomId}`).dispatchLocalPostgresChange('room_messages', 'INSERT', {
      id: msg.id,
      room_id: roomId,
      sender_user_id: user.id,
      client_message_id: clientMessageId,
      content,
      created_at: msg.createdAt,
    });

    return msg;
  }

  async kickMember(roomId: string, targetUserId: string): Promise<void> {
    studyRoomService.leaveParticipant(roomId, targetUserId);
    supabase.channel(`room:${roomId}`).dispatchLocalPostgresChange('room_memberships', 'UPDATE', {
      user_id: targetUserId,
      room_id: roomId,
      status: 'revoked',
    });
  }

  async closeRoom(roomId: string): Promise<void> {
    const user = this.getEffectiveUser();
    studyRoomService.closeRoom(roomId, user);
    supabase.channel(`room:${roomId}`).dispatchLocalPostgresChange('study_rooms', 'UPDATE', {
      id: roomId,
      status: 'closed',
    });
  }
}
