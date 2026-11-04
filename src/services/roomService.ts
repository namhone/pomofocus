/**
 * ROOM GOVERNANCE & HOST CONTROLS SERVICE — POMOFOCUS
 * 
 * Quản lý định danh phòng độc quyền (Persistent Room Slug), chống chiếm quyền (Anti-Squatting),
 * phân cấp 3 bậc quyền lực (Master Admin > Room Host > Participant), và đồng bộ Host Controls
 * qua Supabase Realtime & WebRTC DataChannel.
 */

import { UserProfile, isOwnerEmail, isLadyBoss } from './authService';
import { supabase, RealtimeChannel } from '../lib/supabase';
import { studyRoomService } from './studyRoomService';

/** Danh sách Chủ sở hữu & Ban quản trị Tối cao của hệ thống PomoFocus */
export const MASTER_ADMINS = [
  'namho03052k9@gmail.com',
  'huyentrantt09@gmail.com'
] as const;

export type RoomRole = 'master_admin' | 'host' | 'participant';

export interface RoomSettings {
  allow_mic: boolean;
  allow_screen_share: boolean;
  is_locked: boolean;
}

export const DEFAULT_ROOM_SETTINGS: RoomSettings = {
  allow_mic: true,
  allow_screen_share: true,
  is_locked: false
};

export interface AdminActionPayload {
  action: 'FORCE_MUTE' | 'FORCE_STOP_SCREEN_SHARE' | 'KICK' | 'LOCK_ROOM' | 'SETTINGS_UPDATED' | 'GIVEAWAY_PRO';
  targetId?: string;
  targetUserId?: string;
  settings?: Partial<RoomSettings>;
  issuerName?: string;
  durationMonths?: number;
}

/**
 * Kiểm tra xem tài khoản có thuộc danh sách Master Admin không
 */
export function isMasterAdmin(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return MASTER_ADMINS.some((adminEmail) => adminEmail.toLowerCase() === clean);
}

/**
 * Phân cấp bậc quyền hạn trong phòng học:
 * 1. Master Admin (Nam Hồ & Huyền Trân) -> toàn quyền Override
 * 2. Room Host (Người tạo/sở hữu phòng) -> giữ quyền Host vĩnh viễn
 * 3. Participant -> Thành viên tuân thủ cấu hình của Host
 */
export function getRoomRole(
  user: UserProfile | null,
  room: { owner_id?: string; hostUserId?: string; hostEmail?: string } | null
): RoomRole {
  if (!user) return 'participant';
  if (isMasterAdmin(user.email) || isOwnerEmail(user.email) || isLadyBoss(user.email)) {
    return 'master_admin';
  }
  if (
    room &&
    ((room.owner_id && room.owner_id === user.id) ||
     (room.hostUserId && room.hostUserId === user.id) ||
     (room.hostEmail && room.hostEmail.toLowerCase() === user.email.toLowerCase()))
  ) {
    return 'host';
  }
  return 'participant';
}

/**
 * Kiểm tra xem người dùng có quyền mở bảng Quản Trị Phòng (Host Controls) không
 */
export function canManageRoom(
  user: UserProfile | null,
  room: { owner_id?: string; hostUserId?: string; hostEmail?: string } | null
): boolean {
  const role = getRoomRole(user, room);
  return role === 'master_admin' || role === 'host';
}

/**
 * Chuẩn hóa Slug phòng độc quyền: chữ thường, số, dấu gạch ngang
 */
export function sanitizeSlug(rawSlug: string): string {
  return rawSlug
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

/**
 * Kiểm tra tính hợp lệ và quyền sở hữu Slug phòng (Anti-Squatting Check)
 */
export function validateRoomSlug(
  slug: string,
  currentUser: UserProfile
): { valid: boolean; error?: string } {
  const clean = sanitizeSlug(slug);
  if (!clean || clean.length < 3) {
    return {
      valid: false,
      error: 'Tên phòng/Đường dẫn phải có ít nhất 3 ký tự (chữ cái, số hoặc dấu gạch ngang).'
    };
  }

  // Master Admin luôn có quyền tạo/đặt mọi slug
  if (isMasterAdmin(currentUser.email) || isOwnerEmail(currentUser.email)) {
    return { valid: true };
  }

  // Kiểm tra phòng trong danh sách phòng hiện có
  const allRooms = studyRoomService.getAllRooms();
  const existing = allRooms[clean] || Object.values(allRooms).find(
    (r) => (r.slug && r.slug.toLowerCase() === clean) || r.roomId.toLowerCase() === clean
  );

  if (existing && existing.status === 'active') {
    const ownerId = existing.owner_id || existing.hostUserId;
    if (ownerId !== currentUser.id && existing.hostEmail?.toLowerCase() !== currentUser.email.toLowerCase()) {
      return {
        valid: false,
        error: 'Tên phòng/Đường dẫn này đã được đăng ký bởi người dùng khác.'
      };
    }
  }

  return { valid: true };
}

export const roomService = {
  MASTER_ADMINS,
  isMasterAdmin,
  getRoomRole,
  canManageRoom,
  sanitizeSlug,
  validateRoomSlug,

  /**
   * Đồng bộ trạng thái cài đặt phòng lên Supabase Cloud và Realtime
   */
  async updateRoomSettings(
    roomId: string,
    currentUser: UserProfile,
    newSettings: Partial<RoomSettings>,
    channel?: RealtimeChannel | null
  ): Promise<{ success: boolean; settings?: RoomSettings; error?: string }> {
    const room = studyRoomService.getRoom(roomId);
    if (!room) {
      return { success: false, error: 'Phòng học không tồn tại.' };
    }

    if (!canManageRoom(currentUser, room)) {
      return { success: false, error: 'Chỉ Chủ phòng hoặc Ban quản trị tối cao mới có quyền tùy chỉnh.' };
    }

    const mergedSettings: RoomSettings = {
      allow_mic: room.settings?.allow_mic ?? DEFAULT_ROOM_SETTINGS.allow_mic,
      allow_screen_share: room.settings?.allow_screen_share ?? DEFAULT_ROOM_SETTINGS.allow_screen_share,
      is_locked: room.settings?.is_locked ?? DEFAULT_ROOM_SETTINGS.is_locked,
      ...newSettings
    };

    room.settings = mergedSettings;
    room.updated_at = Date.now();
    studyRoomService.saveRoom(room);

    // Phát broadcast Realtime & BroadcastChannel
    const eventPayload: AdminActionPayload = {
      action: 'SETTINGS_UPDATED',
      settings: mergedSettings,
      issuerName: currentUser.displayName || currentUser.email
    };

    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'room-admin-action',
        payload: eventPayload
      });
    }

    if (studyRoomService.broadcastChannel) {
      studyRoomService.broadcastChannel.postMessage({
        roomId,
        type: 'ADMIN_ACTION',
        ...eventPayload
      });
    }

    // Nếu tắt mic toàn phòng: gửi kèm lệnh FORCE_MUTE target: all
    if (newSettings.allow_mic === false) {
      this.broadcastForceMute(roomId, 'all', currentUser, channel);
    }

    // Nếu cấm chia sẻ màn hình toàn phòng: gửi kèm lệnh FORCE_STOP_SCREEN_SHARE target: all
    if (newSettings.allow_screen_share === false) {
      this.broadcastForceStopScreenShare(roomId, 'all', currentUser, channel);
    }

    // Lưu vào Supabase Cloud (RPC update_room_governance_settings) nếu có phiên Supabase
    try {
      if (supabase) {
        await supabase.rpc('update_room_governance_settings', {
          p_room_id: room.roomId,
          p_settings: mergedSettings
        });
      }
    } catch {
      // Offline fallback an toàn
    }

    return { success: true, settings: mergedSettings };
  },

  /**
   * Phát lệnh tắt Micro bắt buộc (Force Mute)
   */
  broadcastForceMute(
    roomId: string,
    targetId: string | 'all',
    currentUser: UserProfile,
    channel?: RealtimeChannel | null
  ): void {
    const payload: AdminActionPayload = {
      action: 'FORCE_MUTE',
      targetId,
      issuerName: currentUser.displayName || currentUser.email
    };

    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'room-admin-action',
        payload
      });
    }

    if (studyRoomService.broadcastChannel) {
      studyRoomService.broadcastChannel.postMessage({
        roomId,
        type: 'ADMIN_ACTION',
        ...payload
      });
    }
  },

  /**
   * Phát lệnh dừng Chia sẻ màn hình bắt buộc
   */
  broadcastForceStopScreenShare(
    roomId: string,
    targetId: string | 'all',
    currentUser: UserProfile,
    channel?: RealtimeChannel | null
  ): void {
    const payload: AdminActionPayload = {
      action: 'FORCE_STOP_SCREEN_SHARE',
      targetId,
      issuerName: currentUser.displayName || currentUser.email
    };

    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'room-admin-action',
        payload
      });
    }

    if (studyRoomService.broadcastChannel) {
      studyRoomService.broadcastChannel.postMessage({
        roomId,
        type: 'ADMIN_ACTION',
        ...payload
      });
    }
  },

  /**
   * Phát lệnh Đuổi khỏi phòng (Kick)
   */
  broadcastKickParticipant(
    roomId: string,
    targetId: string,
    targetUserId: string | undefined,
    currentUser: UserProfile,
    channel?: RealtimeChannel | null
  ): void {
    const payload: AdminActionPayload = {
      action: 'KICK',
      targetId,
      targetUserId,
      issuerName: currentUser.displayName || currentUser.email
    };

    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'room-admin-action',
        payload
      });
    }

    if (studyRoomService.broadcastChannel) {
      studyRoomService.broadcastChannel.postMessage({
        roomId,
        type: 'ADMIN_ACTION',
        ...payload
      });
    }
  }
};
