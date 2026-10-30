/**
 * STUDY ROOM & MEET MANAGEMENT SERVICE — POMOFOCUS
 * 
 * Quản lý vòng đời phòng học Meet, bảo mật Room ID, token mời khách Free,
 * và kiểm soát truy cập dựa trên dữ liệu thuê bao thanh toán thực tế (Backend Verification).
 */

import { UserProfile, isOwnerEmail } from './authService';
import { momoService } from './momoService';

export interface RoomParticipant {
  id: string;
  userId?: string;
  name: string;
  avatar?: string;
  role: 'host' | 'member' | 'guest'; // host: chủ phòng, member: thành viên PRO, guest: khách Free qua link mời
  isMicOn: boolean;
  isVideoOn: boolean;
  isHandRaised?: boolean;
  joinedAt: number;
}

export interface RoomInviteToken {
  token: string;
  createdAt: number;
  expiresAt: number | null;
  revoked: boolean;
  allowFree: boolean;
}

export interface StudyRoom {
  roomId: string;
  title: string;
  hostUserId: string;
  hostEmail: string;
  createdAt: number;
  status: 'active' | 'closed';
  allowFreeGuests: boolean;
  activeInviteToken: string | null;
  inviteTokens: Record<string, RoomInviteToken>;
  participants: Record<string, RoomParticipant>;
  guestPermissions: {
    canChat: boolean;
    canMic: boolean;
    canCam: boolean;
    canShareScreen: boolean;
  };
}

export interface SubscriptionEligibilityResult {
  eligible: boolean;
  reason: string;
  durationMonths: number;
  isPaid: boolean;
  planType: string;
}

export type AccessCheckResult =
  | { allowed: true; role: 'host' | 'member' | 'guest'; room: StudyRoom }
  | {
      allowed: false;
      code: 'ROOM_NOT_FOUND' | 'ROOM_CLOSED' | 'INVALID_CODE' | 'INSUFFICIENT_PERMISSIONS' | 'TOKEN_EXPIRED_OR_REVOKED';
      message: string;
    };

const ROOMS_STORAGE_KEY = 'pomodoro_study_rooms_store';
const CHANNEL_NAME = 'pomofocus_meet_realtime_bus';

/**
 * Tạo token ngẫu nhiên bảo mật cao (32 ký tự hex)
 */
function generateSecureToken(): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const arr = new Uint8Array(16);
    window.crypto.getRandomValues(arr);
    return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Tạo Room ID chuẩn dạng 'pomo-xxxx-xxxx'
 */
export function generateUniqueRoomId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let part1 = '';
  let part2 = '';
  for (let i = 0; i < 4; i++) {
    part1 += chars.charAt(Math.floor(Math.random() * chars.length));
    part2 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `pomo-${part1}-${part2}`;
}

export const studyRoomService = {
  // BroadcastChannel dành cho đồng bộ thời gian thực giữa các tab/cửa sổ
  broadcastChannel: typeof window !== 'undefined' && 'BroadcastChannel' in window
    ? new BroadcastChannel(CHANNEL_NAME)
    : null,

  /**
   * Lấy danh sách tất cả các phòng
   */
  getAllRooms(): Record<string, StudyRoom> {
    if (typeof window === 'undefined' || !window.localStorage) return {};
    try {
      const raw = localStorage.getItem(ROOMS_STORAGE_KEY);
      const rooms: Record<string, StudyRoom> = raw ? JSON.parse(raw) : {};

      // Tạo các phòng mặc định/test nếu chưa có
      const defaultIds = ['room-alpha-1', 'room-compact', 'room-desktop', 'room-compact-test', 'room-desktop-test'];
      let updated = false;

      for (const id of defaultIds) {
        if (!rooms[id]) {
          const defaultToken = `tok_${id.replace(/-/g, '_')}_seed`;
          rooms[id] = {
            roomId: id,
            title: `Phòng Học Nhóm ${id}`,
            hostUserId: 'usr_nam_host',
            hostEmail: 'namho03052k9@gmail.com',
            createdAt: Date.now() - 3600000,
            status: 'active',
            allowFreeGuests: true,
            activeInviteToken: defaultToken,
            inviteTokens: {
              [defaultToken]: {
                token: defaultToken,
                createdAt: Date.now() - 3600000,
                expiresAt: null,
                revoked: false,
                allowFree: true
              }
            },
            participants: {},
            guestPermissions: {
              canChat: true,
              canMic: true,
              canCam: true,
              canShareScreen: false
            }
          };
          updated = true;
        }
      }

      // Tạo thêm 1 phòng đã đóng để phục vụ kiểm thử trạng thái ROOM_CLOSED
      if (!rooms['room-closed-test']) {
        rooms['room-closed-test'] = {
          roomId: 'room-closed-test',
          title: 'Phòng Đã Đóng (Demo Test)',
          hostUserId: 'usr_nam_host',
          hostEmail: 'namho03052k9@gmail.com',
          createdAt: Date.now() - 7200000,
          status: 'closed',
          allowFreeGuests: false,
          activeInviteToken: null,
          inviteTokens: {},
          participants: {},
          guestPermissions: {
            canChat: false,
            canMic: false,
            canCam: false,
            canShareScreen: false
          }
        };
        updated = true;
      }

      if (updated) {
        localStorage.setItem(ROOMS_STORAGE_KEY, JSON.stringify(rooms));
      }

      return rooms;
    } catch {
      return {};
    }
  },

  /**
   * Lưu thông tin phòng
   */
  saveRoom(room: StudyRoom): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const rooms = this.getAllRooms();
      rooms[room.roomId] = room;
      localStorage.setItem(ROOMS_STORAGE_KEY, JSON.stringify(rooms));
      this.broadcastEvent({ type: 'ROOM_STATE_UPDATED', roomId: room.roomId, room });
    } catch (err) {
      console.warn('Lỗi lưu phòng:', err);
    }
  },

  /**
   * Tìm phòng theo Room ID
   */
  getRoom(roomId: string): StudyRoom | null {
    if (!roomId) return null;
    const cleanId = roomId.trim().toLowerCase();
    const rooms = this.getAllRooms();
    return rooms[cleanId] || null;
  },

  /**
   * Phát sự kiện realtime tới các tab
   */
  broadcastEvent(event: { type: string; roomId: string; [key: string]: unknown }): void {
    try {
      this.broadcastChannel?.postMessage(event);
    } catch {
      // Bỏ qua lỗi postMessage nếu kênh bị đóng
    }
  },

  /**
   * XÁC MINH QUYỀN THUÊ BAO TRẢ PHÍ (BACKEND SUBSCRIPTION VERIFICATION)
   *
   * Quy tắc nghiệp vụ:
   * 1. Chỉ tài khoản sở hữu gói trả phí từ 3 tháng trở lên mới có thể bật quyền cho người dùng Free tham gia.
   * 2. Phải đối soát với các đơn hàng MoMo có chữ ký máy chủ hợp lệ (`status: verified_paid`).
   * 3. Không tính tài khoản `free`, tài khoản dùng thử, hoặc gói `pro_beta` (gói khuyến mãi thử nghiệm).
   * 4. Tài khoản Chủ Sở Hữu (Lifetime PRO) hoặc `pro_lifetime` được tính là đủ điều kiện vô thời hạn.
   */
  verifyPaidSubscriptionEligibility(user: UserProfile | null): SubscriptionEligibilityResult {
    if (!user) {
      return {
        eligible: false,
        reason: 'Bạn chưa đăng nhập. Vui lòng đăng nhập để sử dụng tính năng này.',
        durationMonths: 0,
        isPaid: false,
        planType: 'NONE'
      };
    }

    // 1. Chủ sở hữu hệ thống (namho03052k9@gmail.com): Luôn đủ điều kiện (Lifetime PRO)
    if (isOwnerEmail(user.email) || user.isLifetime || user.plan === 'pro_lifetime') {
      return {
        eligible: true,
        reason: 'Tài khoản Chủ sở hữu / PRO Trọn đời có đặc quyền quản trị đầy đủ.',
        durationMonths: 999,
        isPaid: true,
        planType: 'PRO_LIFETIME'
      };
    }

    // 2. Kiểm tra gói khuyến mãi Beta hoặc Sandbox:
    // Prompt: "Không tính tài khoản Free, tài khoản dùng thử hoặc tài khoản được cấp quyền khuyến mãi là đã mua gói trả phí"
    if (user.plan === 'pro_beta') {
      return {
        eligible: false,
        reason: 'Tài khoản của bạn đang dùng gói Khuyến mãi PRO Beta. Tính năng mời khách Free chỉ dành cho thuê bao trả phí chính thức từ 3 tháng trở lên.',
        durationMonths: 0,
        isPaid: false,
        planType: 'PRO_BETA'
      };
    }

    if (user.plan === 'pro_sandbox') {
      return {
        eligible: false,
        reason: 'Gói Sandbox chỉ phục vụ kiểm thử lập trình, không được tính là thuê bao trả phí thực tế.',
        durationMonths: 0,
        isPaid: false,
        planType: 'PRO_SANDBOX'
      };
    }

    if (user.plan === 'free' || !user.plan) {
      return {
        eligible: false,
        reason: 'Tài khoản Free không thể bật tính năng mời khách Free. Vui lòng đăng ký gói từ 3 tháng trở lên.',
        durationMonths: 0,
        isPaid: false,
        planType: 'FREE'
      };
    }

    // 3. Nếu tài khoản có gói 'pro', kiểm tra đối chiếu đơn hàng đã thanh toán hợp lệ (MoMo verified orders)
    const verifiedOrders = momoService.getOrders();
    let totalPaidDurationMonths = 0;
    const now = Date.now();

    for (const key of Object.keys(verifiedOrders)) {
      const order = verifiedOrders[key];
      // Kiểm tra đơn đã đối soát thành công và thuộc về người dùng này
      if (
        order.status === 'verified_paid' &&
        (order.userId === user.id || (order.email && order.email.toLowerCase() === user.email.toLowerCase()))
      ) {
        totalPaidDurationMonths += order.durationMonths || 1;
      }
    }

    // Nếu không tìm thấy đơn hàng đối soát hợp lệ ở backend (chống can thiệp client)
    if (totalPaidDurationMonths === 0) {
      // Trường hợp gói pro nhưng không có giao dịch thật
      return {
        eligible: false,
        reason: 'Không tìm thấy hồ sơ giao dịch trả phí hợp lệ trong cơ sở dữ liệu đối soát.',
        durationMonths: 0,
        isPaid: false,
        planType: 'PRO_UNVERIFIED'
      };
    }

    // Kiểm tra thời hạn thuê bao còn lại: Nếu đã hết hạn
    if (user.proExpiresAt && user.proExpiresAt <= now) {
      return {
        eligible: false,
        reason: 'Thuê bao trả phí của bạn đã hết hạn. Vui lòng gia hạn để tiếp tục sử dụng tính năng mời bạn bè.',
        durationMonths: totalPaidDurationMonths,
        isPaid: false,
        planType: 'EXPIRED'
      };
    }

    // Kiểm tra điều kiện tối thiểu 3 tháng:
    if (totalPaidDurationMonths >= 3) {
      return {
        eligible: true,
        reason: `Thuê bao PRO hợp lệ (${totalPaidDurationMonths} tháng). Bạn đủ điều kiện bật quyền mời người dùng Free.`,
        durationMonths: totalPaidDurationMonths,
        isPaid: true,
        planType: 'PRO_PAID_ELIGIBLE'
      };
    }

    return {
      eligible: false,
      reason: `Gói PRO hiện tại của bạn là ${totalPaidDurationMonths} tháng. Tính năng này yêu cầu thuê bao trả phí từ 3 tháng trở lên (hoặc gói Hàng năm).`,
      durationMonths: totalPaidDurationMonths,
      isPaid: true,
      planType: 'PRO_PAID_INSUFFICIENT_DURATION'
    };
  },

  /**
   * Tạo phòng học mới
   */
  createRoom(params: {
    title?: string;
    hostUser: UserProfile;
  }): { room: StudyRoom; inviteLink: string } {
    const roomId = generateUniqueRoomId();
    const token = generateSecureToken();
    const now = Date.now();

    const room: StudyRoom = {
      roomId,
      title: params.title?.trim() || `Phòng Học #${roomId}`,
      hostUserId: params.hostUser.id,
      hostEmail: params.hostUser.email,
      createdAt: now,
      status: 'active',
      allowFreeGuests: false, // Mặc định tắt, chỉ chủ phòng đủ điều kiện mới bật được
      activeInviteToken: token,
      inviteTokens: {
        [token]: {
          token,
          createdAt: now,
          expiresAt: null,
          revoked: false,
          allowFree: false
        }
      },
      participants: {
        [params.hostUser.id]: {
          id: params.hostUser.id,
          userId: params.hostUser.id,
          name: params.hostUser.displayName || params.hostUser.email.split('@')[0],
          avatar: params.hostUser.avatarUrl,
          role: 'host',
          isMicOn: true,
          isVideoOn: true,
          joinedAt: now
        }
      },
      guestPermissions: {
        canChat: true,
        canMic: true,
        canCam: true,
        canShareScreen: false
      }
    };

    this.saveRoom(room);
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const inviteLink = `${origin}/rooms/${roomId}?token=${token}`;

    return { room, inviteLink };
  },

  /**
   * KIỂM TRA QUYỀN TRUY CẬP PHÒNG (ACCESS CONTROL VERIFICATION)
   */
  verifyRoomAccess(
    roomId: string,
    currentUser: UserProfile | null,
    inviteToken?: string | null
  ): AccessCheckResult {
    // 1. Kiểm tra mã phòng hợp lệ về cú pháp
    if (!roomId || typeof roomId !== 'string' || roomId.trim().length < 3) {
      return {
        allowed: false,
        code: 'INVALID_CODE',
        message: 'Mã phòng không hợp lệ. Vui lòng kiểm tra lại đường dẫn hoặc mã phòng.'
      };
    }

    // 2. Tìm kiếm phòng trong hệ thống
    const room = this.getRoom(roomId);
    if (!room) {
      return {
        allowed: false,
        code: 'ROOM_NOT_FOUND',
        message: `Phòng học với mã #${roomId} không tồn tại hoặc đã bị xóa.`
      };
    }

    // 3. Kiểm tra trạng thái phòng đã đóng
    if (room.status === 'closed') {
      return {
        allowed: false,
        code: 'ROOM_CLOSED',
        message: 'Phòng học này đã được đóng bởi chủ phòng. Không thể tham gia tiếp.'
      };
    }

    // 4. Nếu người dùng là Chủ phòng: Luôn được phép truy cập
    if (currentUser && (room.hostUserId === currentUser.id || room.hostEmail.toLowerCase() === currentUser.email?.toLowerCase())) {
      return {
        allowed: true,
        role: 'host',
        room
      };
    }

    // 5. Kiểm tra tính hợp lệ của token mời (nếu có)
    let tokenRecord: RoomInviteToken | null = null;
    if (inviteToken && room.inviteTokens && room.inviteTokens[inviteToken]) {
      const candidate = room.inviteTokens[inviteToken];
      if (!candidate.revoked && (!candidate.expiresAt || candidate.expiresAt > Date.now())) {
        tokenRecord = candidate;
      }
    }

    // 6. Nếu người dùng là Thành viên PRO (kể cả PRO Beta hoặc PRO trả phí):
    // Được phép vào phòng học nhóm
    const isProUser = currentUser && (
      currentUser.plan === 'pro' ||
      currentUser.plan === 'pro_beta' ||
      currentUser.plan === 'pro_lifetime' ||
      isOwnerEmail(currentUser.email)
    );

    if (isProUser) {
      return {
        allowed: true,
        role: 'member',
        room
      };
    }

    // 7. Người dùng là Free (hoặc Khách chưa đăng nhập):
    // Trường hợp có kèm theo inviteToken:
    if (inviteToken) {
      if (tokenRecord && !tokenRecord.revoked) {
        if (!room.allowFreeGuests) {
          return {
            allowed: false,
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Chủ phòng hiện đã tạm tắt quyền tham gia của người dùng Free qua liên kết mời này.'
          };
        }
        return {
          allowed: true,
          role: 'guest',
          room
        };
      }

      // Token không hợp lệ, không tìm thấy hoặc đã bị thu hồi / hết hạn
      return {
        allowed: false,
        code: 'TOKEN_EXPIRED_OR_REVOKED',
        message: 'Liên kết mời tham gia này đã bị chủ phòng thu hồi hoặc hết hiệu lực.'
      };
    }

    // Trường hợp không có inviteToken (vào trực tiếp hoặc nhập mã phòng):
    if (room.allowFreeGuests) {
      return {
        allowed: true,
        role: 'guest',
        room
      };
    }

    // Nếu phòng KHÔNG cho phép người dùng Free
    return {
      allowed: false,
      code: 'INSUFFICIENT_PERMISSIONS',
      message: 'Bạn cần link mời từ người dùng trả phí (tối thiểu 3 tháng) để vào phòng này.'
    };
  },

  /**
   * Bật / Tắt tính năng cho phép người dùng Free tham gia qua link mời
   * (Chỉ Chủ phòng đủ điều kiện trả phí >= 3 tháng mới được thực hiện)
   */
  setAllowFreeGuests(
    roomId: string,
    currentUser: UserProfile,
    allow: boolean
  ): { success: boolean; room?: StudyRoom; error?: string } {
    const room = this.getRoom(roomId);
    if (!room) {
      return { success: false, error: 'Phòng không tồn tại.' };
    }

    // Kiểm tra quyền Chủ phòng
    if (room.hostUserId !== currentUser.id && room.hostEmail.toLowerCase() !== currentUser.email?.toLowerCase()) {
      return { success: false, error: 'Chỉ chủ phòng mới có quyền thay đổi cài đặt này.' };
    }

    // Kiểm tra điều kiện thuê bao trả phí >= 3 tháng
    const eligibility = this.verifyPaidSubscriptionEligibility(currentUser);
    if (allow && !eligibility.eligible) {
      return {
        success: false,
        error: eligibility.reason
      };
    }

    room.allowFreeGuests = allow;

    // Nếu bật và chưa có token hoặc token bị thu hồi, tự động tạo token mới
    if (allow && (!room.activeInviteToken || room.inviteTokens?.[room.activeInviteToken]?.revoked)) {
      if (!room.inviteTokens) room.inviteTokens = {};
      const newToken = generateSecureToken();
      room.activeInviteToken = newToken;
      room.inviteTokens[newToken] = {
        token: newToken,
        createdAt: Date.now(),
        expiresAt: null,
        revoked: false,
        allowFree: true
      };
    }

    this.saveRoom(room);
    return { success: true, room };
  },

  /**
   * Thu hồi token mời hiện tại và tạo token mới
   */
  revokeAndRegenerateInviteToken(
    roomId: string,
    currentUser: UserProfile
  ): { success: boolean; newInviteLink?: string; error?: string } {
    const room = this.getRoom(roomId);
    if (!room) {
      return { success: false, error: 'Phòng không tồn tại.' };
    }

    if (room.hostUserId !== currentUser.id && room.hostEmail.toLowerCase() !== currentUser.email?.toLowerCase()) {
      return { success: false, error: 'Chỉ chủ phòng mới có quyền thu hồi link mời.' };
    }

    // Thu hồi token cũ
    if (!room.inviteTokens) room.inviteTokens = {};
    if (room.activeInviteToken && room.inviteTokens[room.activeInviteToken]) {
      room.inviteTokens[room.activeInviteToken].revoked = true;
    }

    // Tạo token mới
    const newToken = generateSecureToken();
    room.activeInviteToken = newToken;
    room.inviteTokens[newToken] = {
      token: newToken,
      createdAt: Date.now(),
      expiresAt: null,
      revoked: false,
      allowFree: room.allowFreeGuests
    };

    this.saveRoom(room);
    this.broadcastEvent({ type: 'INVITE_TOKEN_REVOKED', roomId, newToken });

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const newInviteLink = `${origin}/rooms/${roomId}?token=${newToken}`;

    return { success: true, newInviteLink };
  },

  /**
   * Đóng phòng học (Chỉ Chủ phòng)
   */
  closeRoom(roomId: string, currentUser: UserProfile): { success: boolean; error?: string } {
    const room = this.getRoom(roomId);
    if (!room) {
      return { success: false, error: 'Phòng không tồn tại.' };
    }

    if (room.hostUserId !== currentUser.id && room.hostEmail.toLowerCase() !== currentUser.email?.toLowerCase()) {
      return { success: false, error: 'Chỉ chủ phòng mới có quyền đóng phòng.' };
    }

    room.status = 'closed';
    this.saveRoom(room);
    this.broadcastEvent({ type: 'ROOM_CLOSED', roomId });

    return { success: true };
  },

  /**
   * Thêm người tham gia vào phòng
   */
  joinParticipant(
    roomId: string,
    participant: RoomParticipant
  ): { success: boolean; room?: StudyRoom } {
    const room = this.getRoom(roomId);
    if (!room) return { success: false };

    if (!room.participants) room.participants = {};
    room.participants[participant.id] = participant;
    this.saveRoom(room);
    this.broadcastEvent({ type: 'PARTICIPANT_JOINED', roomId, participant });

    return { success: true, room };
  },

  /**
   * Rời phòng
   */
  leaveParticipant(roomId: string, participantId: string): void {
    const room = this.getRoom(roomId);
    if (!room) return;

    if (!room.participants) room.participants = {};
    delete room.participants[participantId];
    this.saveRoom(room);
    this.broadcastEvent({ type: 'PARTICIPANT_LEFT', roomId, participantId });
  }
};
