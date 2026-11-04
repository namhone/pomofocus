/**
 * ROOM GOVERNANCE & HOST CONTROLS ZUSTAND STORE — POMOFOCUS
 * 
 * Lưu trữ trạng thái phiên phòng học, vai trò của người dùng (Master Admin > Host > Participant),
 * trạng thái công tắc điều khiển phòng (Mic, Share màn hình, Khóa phòng), và xử lý lệnh từ Host.
 */

import { create } from 'zustand';
import { StudyRoom } from '../services/studyRoomService';
import { UserProfile } from '../services/authService';
import {
  RoomRole,
  RoomSettings,
  DEFAULT_ROOM_SETTINGS,
  AdminActionPayload,
  getRoomRole,
  canManageRoom
} from '../services/roomService';

export interface RoomStoreState {
  currentRoom: StudyRoom | null;
  role: RoomRole;
  canManage: boolean;
  settings: RoomSettings;
  isHostPanelOpen: boolean;
  isMicLockedByHost: boolean;
  isScreenShareLockedByHost: boolean;
  adminNotice: string | null;

  // Actions
  initRoom: (room: StudyRoom, user: UserProfile | null) => void;
  setHostPanelOpen: (isOpen: boolean) => void;
  updateSettings: (newSettings: Partial<RoomSettings>) => void;
  setAdminNotice: (msg: string | null) => void;
  handleAdminAction: (
    payload: AdminActionPayload,
    myParticipantId: string,
    myUserId?: string,
    onForceMuteLocal?: () => void,
    onForceStopScreenShareLocal?: () => void,
    onKickedLocal?: () => void
  ) => void;
  reset: () => void;
}

export const useRoomStore = create<RoomStoreState>((set, get) => ({
  currentRoom: null,
  role: 'participant',
  canManage: false,
  settings: DEFAULT_ROOM_SETTINGS,
  isHostPanelOpen: false,
  isMicLockedByHost: false,
  isScreenShareLockedByHost: false,
  adminNotice: null,

  initRoom: (room: StudyRoom, user: UserProfile | null) => {
    const role = getRoomRole(user, room);
    const canManage = canManageRoom(user, room);
    const roomSettings: RoomSettings = {
      allow_mic: room.settings?.allow_mic ?? DEFAULT_ROOM_SETTINGS.allow_mic,
      allow_screen_share: room.settings?.allow_screen_share ?? DEFAULT_ROOM_SETTINGS.allow_screen_share,
      is_locked: room.settings?.is_locked ?? DEFAULT_ROOM_SETTINGS.is_locked
    };

    set({
      currentRoom: room,
      role,
      canManage,
      settings: roomSettings,
      isMicLockedByHost: role === 'participant' && !roomSettings.allow_mic,
      isScreenShareLockedByHost: role === 'participant' && !roomSettings.allow_screen_share
    });
  },

  setHostPanelOpen: (isOpen: boolean) => {
    set({ isHostPanelOpen: isOpen });
  },

  updateSettings: (newSettings: Partial<RoomSettings>) => {
    const { settings, role } = get();
    const updated: RoomSettings = { ...settings, ...newSettings };
    set({
      settings: updated,
      isMicLockedByHost: role === 'participant' && !updated.allow_mic,
      isScreenShareLockedByHost: role === 'participant' && !updated.allow_screen_share
    });
  },

  setAdminNotice: (msg: string | null) => {
    set({ adminNotice: msg });
  },

  handleAdminAction: (
    payload: AdminActionPayload,
    myParticipantId: string,
    myUserId?: string,
    onForceMuteLocal?: () => void,
    onForceStopScreenShareLocal?: () => void,
    onKickedLocal?: () => void
  ) => {
    const { role } = get();

    // 1. Cập nhật cài đặt phòng
    if (payload.action === 'SETTINGS_UPDATED' && payload.settings) {
      get().updateSettings(payload.settings);
      set({ adminNotice: `Chủ phòng đã cập nhật quy tắc phòng học.` });
      setTimeout(() => set({ adminNotice: null }), 4000);
      return;
    }

    // Master Admin và Host không bao giờ bị cưỡng chế bởi participant
    const isTargetMe =
      payload.targetId === 'all' ||
      payload.targetId === myParticipantId ||
      (myUserId && payload.targetUserId === myUserId);

    if (!isTargetMe) return;

    if (payload.action === 'FORCE_MUTE') {
      // Nếu target là 'all' thì chỉ mute người có role participant
      if (payload.targetId === 'all' && role !== 'participant') return;

      set({
        isMicLockedByHost: true,
        adminNotice: 'Bạn đã bị Quản trị viên tắt Micro.'
      });
      onForceMuteLocal?.();
      setTimeout(() => set({ adminNotice: null }), 5000);
    } else if (payload.action === 'FORCE_STOP_SCREEN_SHARE') {
      if (payload.targetId === 'all' && role !== 'participant') return;

      set({
        isScreenShareLockedByHost: true,
        adminNotice: 'Chủ phòng đã tắt quyền chia sẻ màn hình.'
      });
      onForceStopScreenShareLocal?.();
      setTimeout(() => set({ adminNotice: null }), 5000);
    } else if (payload.action === 'KICK') {
      // Không thể kick Master Admin
      if (role === 'master_admin') return;

      set({ adminNotice: 'Bạn đã bị mời ra khỏi phòng học.' });
      onKickedLocal?.();
    }
  },

  reset: () => {
    set({
      currentRoom: null,
      role: 'participant',
      canManage: false,
      settings: DEFAULT_ROOM_SETTINGS,
      isHostPanelOpen: false,
      isMicLockedByHost: false,
      isScreenShareLockedByHost: false,
      adminNotice: null
    });
  }
}));
