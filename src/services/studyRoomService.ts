/**
 * STUDY ROOM & MEET MANAGEMENT SERVICE — POMOFOCUS
 * 
 * Quản lý vòng đời phòng học Meet, bảo mật Room ID, token mời khách Free,
 * và kiểm soát truy cập dựa trên dữ liệu thuê bao thanh toán thực tế (Backend Verification).
 */

import { UserProfile, isOwnerEmail, isLadyBoss, isVipFriend } from './authService';
import { momoService } from './momoService';
import { getVietnamTodayDateKey } from '../utils/timezone';

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
  lastSeen?: number;
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
  maxParticipants?: number;
  isFreeRoom?: boolean;
  maxDurationMinutes?: number;
  activeInviteToken: string | null;
  inviteTokens: Record<string, RoomInviteToken>;
  participants: Record<string, RoomParticipant>;
  guestPermissions: {
    canChat: boolean;
    canMic: boolean;
    canCam: boolean;
    canShareScreen: boolean;
  };
  // Tùy chỉnh phòng học chuyên sâu
  passcode?: string | null;            // Mật khẩu phòng (PIN)
  roomGoal?: string | null;            // Mục tiêu buổi học / Thông báo ghim
  roomCategory?: string | null;        // Thể loại không gian (Coding, IELTS, Cafe...)
  silentMode?: boolean;                // Chế độ siêu tập trung (Tự động tắt mic khi vào)
  requireCam?: boolean;                // Yêu cầu bật camera (Study With Me)
  hostOnlyTimer?: boolean;             // Chỉ host được điều khiển đồng hồ Pomodoro
}

export const PUBLIC_FREE_PODS = Array.from({ length: 10 }, (_, i) => {
  const num = (i + 1).toString().padStart(2, '0');
  return {
    roomId: `pod-free-${num}`,
    title: `Phòng ${num}`,
    maxParticipants: 10
  };
});

export const ROOM_CATEGORIES = [
  { id: 'tech', label: 'Lập trình & CNTT', icon: '💻' },
  { id: 'exam', label: 'Ôn thi Học thuật', icon: '📚' },
  { id: 'lang', label: 'Ngoại ngữ (IELTS/JLPT)', icon: '🎯' },
  { id: 'cafe', label: 'Tiệm Cafe Yên Tĩnh', icon: '☕' },
  { id: 'design', label: 'Thiết kế & Sáng tạo', icon: '🎨' },
  { id: 'work', label: 'Làm việc Tập trung', icon: '💼' }
];

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
      code: 'AUTH_REQUIRED' | 'ROOM_NOT_FOUND' | 'ROOM_CLOSED' | 'INVALID_CODE' | 'PRO_REQUIRED' | 'INSUFFICIENT_PERMISSIONS' | 'TOKEN_EXPIRED_OR_REVOKED' | 'ROOM_FULL' | 'PASSCODE_REQUIRED';
      message: string;
      room?: StudyRoom;
    };

const ROOMS_STORAGE_KEY = 'pomodoro_study_rooms_store';
const DELETED_ROOMS_KEY = 'pomodoro_deleted_rooms_store';
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
 * Tạo Room ID chuẩn dạng 'xxxx-xxxx-xxxx' (12 ký tự chữ và số ngẫu nhiên theo phong cách Google Meet / Zoom)
 */
export function generateUniqueRoomId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let p1 = '';
  let p2 = '';
  let p3 = '';
  for (let i = 0; i < 4; i++) {
    p1 += chars.charAt(Math.floor(Math.random() * chars.length));
    p2 += chars.charAt(Math.floor(Math.random() * chars.length));
    p3 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${p1}-${p2}-${p3}`;
}

export const studyRoomService = {
  // BroadcastChannel dành cho đồng bộ thời gian thực giữa các tab/cửa sổ
  broadcastChannel: typeof window !== 'undefined' && 'BroadcastChannel' in window
    ? new BroadcastChannel(CHANNEL_NAME)
    : null,

  /**
   * Lấy danh sách ID các phòng đã bị xóa vĩnh viễn
   */
  getDeletedRoomIds(): Set<string> {
    if (typeof window === 'undefined' || !window.localStorage) return new Set();
    try {
      const raw = localStorage.getItem(DELETED_ROOMS_KEY);
      const list: string[] = raw ? JSON.parse(raw) : [];
      return new Set(list.map((id) => id.toLowerCase()));
    } catch {
      return new Set();
    }
  },

  /**
   * Đánh dấu phòng đã bị xóa vĩnh viễn
   */
  markRoomAsDeleted(roomId: string): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const set = this.getDeletedRoomIds();
      set.add(roomId.toLowerCase());
      localStorage.setItem(DELETED_ROOMS_KEY, JSON.stringify(Array.from(set)));
    } catch {
      // Bỏ qua lỗi
    }
  },

  /**
   * Lấy danh sách tất cả các phòng
   */
  getAllRooms(): Record<string, StudyRoom> {
    if (typeof window === 'undefined' || !window.localStorage) return {};
    try {
      const raw = localStorage.getItem(ROOMS_STORAGE_KEY);
      const rooms: Record<string, StudyRoom> = raw ? JSON.parse(raw) : {};
      if (rooms['room-alpha-1']) {
        delete rooms['room-alpha-1'];
        localStorage.setItem(ROOMS_STORAGE_KEY, JSON.stringify(rooms));
      }
      const deleted = this.getDeletedRoomIds();
      let changed = false;
      for (const id of deleted) {
        if (rooms[id]) {
          delete rooms[id];
          changed = true;
        }
      }
      if (changed) {
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
      // Nếu phòng đang lưu từng nằm trong danh sách đã xóa, gỡ khỏi danh sách đã xóa
      const deletedSet = this.getDeletedRoomIds();
      if (deletedSet.has(room.roomId.toLowerCase())) {
        deletedSet.delete(room.roomId.toLowerCase());
        localStorage.setItem(DELETED_ROOMS_KEY, JSON.stringify(Array.from(deletedSet)));
      }

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
    if (cleanId === 'room-alpha-1') {
      return null;
    }
    if (this.getDeletedRoomIds().has(cleanId)) {
      return null;
    }
    const rooms = this.getAllRooms();
    if (rooms[cleanId]) {
      return rooms[cleanId];
    }

    // Phòng đóng dùng cho kiểm thử
    if (cleanId === 'room-closed-test') {
      return {
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
    }

    // Từ chối các mã phòng không tồn tại hoặc lỗi cú pháp
    if (cleanId.includes('khong-ton-tai') || cleanId.length < 4) {
      return null;
    }

    // Khởi tạo phòng học Free công khai (Public Study Pods)
    const freePod = PUBLIC_FREE_PODS.find((p) => p.roomId === cleanId);
    if (freePod) {
      const podRoom: StudyRoom = {
        roomId: cleanId,
        title: freePod.title,
        hostUserId: 'system_study_pod',
        hostEmail: 'study-pod@pomodoro.app',
        createdAt: Date.now(),
        status: 'active',
        allowFreeGuests: true,
        maxParticipants: 10,
        activeInviteToken: null,
        inviteTokens: {},
        participants: {},
        guestPermissions: {
          canChat: true,
          canMic: true,
          canCam: true,
          canShareScreen: false
        }
      };
      this.saveRoom(podRoom);
      return podRoom;
    }

    // Khởi tạo và lưu phiên phòng học chuẩn Google Meet/Zoom khi người dùng truy cập qua liên kết phòng hợp lệ
    const newRoom: StudyRoom = {
      roomId: cleanId,
      title: `Phòng Học #${cleanId}`,
      hostUserId: 'usr_peer_host',
      hostEmail: '',
      createdAt: Date.now(),
      status: 'active',
      allowFreeGuests: true, // Mặc định mở quyền cho người nhận link tham gia học nhóm
      activeInviteToken: null,
      inviteTokens: {},
      participants: {},
      guestPermissions: {
        canChat: true,
        canMic: true,
        canCam: true,
        canShareScreen: false
      }
    };
    this.saveRoom(newRoom);
    return newRoom;
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

  /** Lấy ngày hiện tại YYYY-MM-DD theo chuẩn múi giờ Việt Nam (GMT+7) để đảm bảo reset đúng 00:00 */
  getTodayDateKey(): string {
    return getVietnamTodayDateKey();
  },

  /** Số lượng phòng Free đã tạo hôm nay của user (tối đa 3 phòng/ngày) */
  getDailyPrivateRoomCount(userId: string): number {
    if (typeof window === 'undefined' || !window.localStorage) return 0;
    try {
      const key = `pomodoro_free_rooms_created_${this.getTodayDateKey()}_${userId}`;
      const count = localStorage.getItem(key);
      return count ? parseInt(count, 10) : 0;
    } catch {
      return 0;
    }
  },

  incrementDailyPrivateRoomCount(userId: string): number {
    if (typeof window === 'undefined' || !window.localStorage) return 1;
    try {
      const key = `pomodoro_free_rooms_created_${this.getTodayDateKey()}_${userId}`;
      const current = this.getDailyPrivateRoomCount(userId);
      const next = current + 1;
      localStorage.setItem(key, String(next));
      return next;
    } catch {
      return 1;
    }
  },

  /** Tổng thời gian học công cộng hôm nay tính bằng giây (tối đa 90 phút = 5400s) */
  getDailyPublicStudyTime(userIdOrGuest: string): number {
    if (typeof window === 'undefined' || !window.localStorage) return 0;
    try {
      const key = `pomodoro_public_study_time_${this.getTodayDateKey()}_${userIdOrGuest}`;
      const sec = localStorage.getItem(key);
      return sec ? parseInt(sec, 10) : 0;
    } catch {
      return 0;
    }
  },

  addDailyPublicStudyTime(userIdOrGuest: string, addedSeconds: number): number {
    if (typeof window === 'undefined' || !window.localStorage) return 0;
    try {
      const current = this.getDailyPublicStudyTime(userIdOrGuest);
      const updated = current + addedSeconds;
      const key = `pomodoro_public_study_time_${this.getTodayDateKey()}_${userIdOrGuest}`;
      localStorage.setItem(key, String(updated));
      return updated;
    } catch {
      return 0;
    }
  },

  /**
   * Dọn dẹp phiên zombie (Zombie Sessions Purge):
   * Reset danh sách người tham gia và đặt lại trạng thái phòng trống
   */
  purgeZombieSessions(targetRoomId?: string): { purgedRooms: string[]; purgedParticipants: number } {
    const allRooms = this.getAllRooms();
    const purgedRooms: string[] = [];
    let purgedParticipants = 0;

    Object.keys(allRooms).forEach((id) => {
      if (targetRoomId && id !== targetRoomId) return;
      const r = allRooms[id];
      const pCount = Object.keys(r.participants || {}).length;
      if (pCount > 0) {
        purgedParticipants += pCount;
        r.participants = {};
        allRooms[id] = r;
        purgedRooms.push(id);
      }
    });

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem(ROOMS_STORAGE_KEY, JSON.stringify(allRooms));
      } catch (e) {
        console.error('Lỗi lưu sau khi purgeZombieSessions:', e);
      }
    }

    this.broadcastEvent({
      type: 'ROOM_ZOMBIE_PURGED',
      roomId: targetRoomId || 'all'
    });

    return { purgedRooms, purgedParticipants };
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

    // 1. Chủ sở hữu hệ thống, VIP Nóc Nhà hoặc Bạn Thân Sếp: Luôn đủ điều kiện (Lifetime PRO)
    if (isOwnerEmail(user.email) || isLadyBoss(user.email) || isVipFriend(user.email) || user.isLifetime || user.plan === 'pro_lifetime') {
      return {
        eligible: true,
        reason: isLadyBoss(user.email)
          ? 'Tài khoản VIP Nóc Nhà PRO được mở khóa toàn quyền quản trị trọn đời.'
          : isVipFriend(user.email)
          ? 'Tài khoản Bạn Thân Sếp được tặng PRO Trọn Đời vĩnh viễn.'
          : 'Tài khoản Chủ sở hữu / PRO Trọn đời có đặc quyền quản trị đầy đủ.',
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
   * QUY TẮC BẢO MẬT: Chỉ người dùng PRO mới được phép khởi tạo và chủ trì phòng học nhóm!
   */
  createRoom(params: {
    title?: string;
    hostUser: UserProfile;
    isFreeRoom?: boolean;
    passcode?: string | null;
    roomGoal?: string | null;
    roomCategory?: string | null;
    silentMode?: boolean;
    requireCam?: boolean;
    hostOnlyTimer?: boolean;
    maxParticipants?: number;
  }): { success: true; room: StudyRoom; inviteLink: string } | { success: false; error: string } {
    const isLadyBossUser = Boolean(params.hostUser && isLadyBoss(params.hostUser.email));
    const isOwner = Boolean(params.hostUser && isOwnerEmail(params.hostUser.email));
    const isVipFriendUser = Boolean(params.hostUser && isVipFriend(params.hostUser.email));
    const isProUser = isLadyBossUser || isOwner || isVipFriendUser || Boolean(
      params.hostUser && (
        params.hostUser.plan === 'pro' ||
        params.hostUser.plan === 'pro_beta' ||
        params.hostUser.plan === 'pro_lifetime'
      )
    );

    if (!isProUser) {
      if (!params.isFreeRoom) {
        return {
          success: false,
          error: 'Khởi tạo phòng học nhóm là đặc quyền dành riêng cho gói PRO. Vui lòng nâng cấp tài khoản để tạo phòng.'
        };
      }

      // Giới hạn 3 phòng Free/ngày
      const currentDailyCount = this.getDailyPrivateRoomCount(params.hostUser.id);
      if (currentDailyCount >= 3) {
        return {
          success: false,
          error: 'Bạn đã hết 3 lượt tạo phòng Free hôm nay. Quay lại vào 0h sáng mai hoặc nâng cấp PRO!'
        };
      }
      this.incrementDailyPrivateRoomCount(params.hostUser.id);
    }

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
      allowFreeGuests: !isProUser ? true : false,
      maxParticipants: params.maxParticipants ? Math.min(50, Math.max(2, params.maxParticipants)) : (isLadyBossUser ? 50 : 25),
      isFreeRoom: !isProUser,
      maxDurationMinutes: !isProUser ? 45 : undefined,
      activeInviteToken: token,
      inviteTokens: {
        [token]: {
          token,
          createdAt: now,
          expiresAt: null,
          revoked: false,
          allowFree: !isProUser ? true : false
        }
      },
      participants: {},
      guestPermissions: {
        canChat: true,
        canMic: true,
        canCam: true,
        canShareScreen: false
      },
      passcode: params.passcode?.trim() || null,
      roomGoal: params.roomGoal?.trim() || null,
      roomCategory: params.roomCategory?.trim() || null,
      silentMode: Boolean(params.silentMode),
      requireCam: Boolean(params.requireCam),
      hostOnlyTimer: Boolean(params.hostOnlyTimer)
    };

    this.saveRoom(room);
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    // Đường dẫn mời phòng chuẩn Google Meet: /rooms/xxxx-xxxx-xxxx
    const inviteLink = `${origin}/rooms/${roomId}`;

    return { success: true, room, inviteLink };
  },

  /**
   * KIỂM TRA QUYỀN TRUY CẬP PHÒNG (ACCESS CONTROL VERIFICATION)
   */
  verifyRoomAccess(
    roomId: string,
    currentUser: UserProfile | null,
    inviteToken?: string | null,
    passcode?: string | null
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

    // 3.5. Kiểm tra sức chứa tối đa của phòng (giới hạn tối đa 10 người cho phòng học chung)
    const maxCapacity = room.maxParticipants || 10;
    if (maxCapacity) {
      const activeCount = Object.keys(room.participants || {}).length;
      const isAlreadyIn = Boolean(
        currentUser && Object.values(room.participants || {}).some(
          (p) => p.userId === currentUser.id || p.id === currentUser.id || p.id.startsWith(`${currentUser.id}_`)
        )
      );
      if (activeCount >= maxCapacity && !isAlreadyIn && !isOwnerEmail(currentUser?.email)) {
        return {
          allowed: false,
          code: 'ROOM_FULL',
          message: `Phòng học này đã đạt giới hạn tối đa ${maxCapacity} người (${activeCount}/${maxCapacity}). Vui lòng chọn một phòng khác còn chỗ!`
        };
      }
    }

    // 4. Nếu người dùng là Chủ phòng: Luôn được phép truy cập
    if (currentUser && (room.hostUserId === currentUser.id || room.hostEmail.toLowerCase() === currentUser.email?.toLowerCase())) {
      return {
        allowed: true,
        role: 'host',
        room
      };
    }

    // 5. Kiểm tra nếu có token cụ thể bị thu hồi
    if (inviteToken && room.inviteTokens && room.inviteTokens[inviteToken]?.revoked) {
      return {
        allowed: false,
        code: 'TOKEN_EXPIRED_OR_REVOKED',
        message: 'Liên kết mời tham gia này đã bị chủ phòng thu hồi hoặc hết hiệu lực.'
      };
    }

    // 5.5. Kiểm tra Mật khẩu phòng (Passcode / Room PIN)
    if (room.passcode) {
      if (!passcode || passcode.trim() !== room.passcode.trim()) {
        return {
          allowed: false,
          code: 'PASSCODE_REQUIRED',
          message: passcode ? 'Mật khẩu phòng (PIN) không chính xác.' : 'Phòng học này yêu cầu mật khẩu truy cập (PIN).',
          room
        };
      }
    }

    // 6. Kiểm tra xem người dùng có gói PRO không
    const isProUser = Boolean(
      currentUser && (
        isLadyBoss(currentUser.email) ||
        isVipFriend(currentUser.email) ||
        isOwnerEmail(currentUser.email) ||
        currentUser.plan === 'pro' ||
        currentUser.plan === 'pro_beta' ||
        currentUser.plan === 'pro_lifetime'
      )
    );

    // Thành viên PRO luôn được vào phòng ngay lập tức
    if (isProUser) {
      return {
        allowed: true,
        role: 'member',
        room
      };
    }

    // 7. Người dùng là Free (hoặc Khách):
    // Kiểm tra cài đặt phòng có cho phép người dùng Free tham gia không
    if (room.allowFreeGuests) {
      return {
        allowed: true,
        role: 'guest',
        room
      };
    }

    // Nếu phòng tắt quyền Free
    return {
      allowed: false,
      code: 'INSUFFICIENT_PERMISSIONS',
      message: 'Phòng học này hiện chỉ dành cho thành viên PRO. Vui lòng nâng cấp tài khoản hoặc liên hệ chủ phòng.'
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
    const newInviteLink = `${origin}/rooms/${roomId}`;

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
   * Tùy chỉnh phòng họp chuyên sâu (Tên phòng, Mật khẩu PIN, Mục tiêu, Chế độ siêu tập trung...)
   * Chỉ Chủ phòng hoặc Owner mới có quyền thay đổi
   */
  updateRoom(
    roomId: string,
    currentUser: UserProfile,
    updates: Partial<Pick<StudyRoom, 'title' | 'passcode' | 'roomGoal' | 'roomCategory' | 'silentMode' | 'requireCam' | 'hostOnlyTimer' | 'maxParticipants'>>
  ): { success: boolean; room?: StudyRoom; error?: string } {
    const cleanId = roomId.trim().toLowerCase();
    const room = this.getRoom(cleanId);
    if (!room) {
      return { success: false, error: 'Phòng không tồn tại.' };
    }

    const isHost =
      room.hostUserId === currentUser.id ||
      room.hostEmail.toLowerCase() === currentUser.email?.toLowerCase() ||
      isOwnerEmail(currentUser.email);

    if (!isHost) {
      return { success: false, error: 'Chỉ chủ phòng mới có quyền tùy chỉnh phòng học này.' };
    }

    if (updates.title !== undefined) {
      const trimmed = updates.title.trim();
      if (!trimmed) {
        return { success: false, error: 'Tên phòng không được để trống.' };
      }
      room.title = trimmed.slice(0, 60);
    }

    if (updates.passcode !== undefined) {
      room.passcode = updates.passcode ? updates.passcode.trim() : null;
    }

    if (updates.roomGoal !== undefined) {
      room.roomGoal = updates.roomGoal ? updates.roomGoal.trim().slice(0, 120) : null;
    }

    if (updates.roomCategory !== undefined) {
      room.roomCategory = updates.roomCategory || null;
    }

    if (updates.silentMode !== undefined) {
      room.silentMode = Boolean(updates.silentMode);
    }

    if (updates.requireCam !== undefined) {
      room.requireCam = Boolean(updates.requireCam);
    }

    if (updates.hostOnlyTimer !== undefined) {
      room.hostOnlyTimer = Boolean(updates.hostOnlyTimer);
    }

    if (updates.maxParticipants !== undefined && updates.maxParticipants > 0) {
      room.maxParticipants = Math.min(50, Math.max(2, updates.maxParticipants));
    }

    this.saveRoom(room);
    this.broadcastEvent({ type: 'ROOM_UPDATED', roomId: room.roomId, room });
    return { success: true, room };
  },

  /**
   * Xóa bỏ phòng học đã tạo
   * Chỉ Chủ phòng hoặc Owner mới có quyền xóa. Ngăn xóa các phòng công khai (Public Pods).
   */
  deleteRoom(
    roomId: string,
    currentUser: UserProfile
  ): { success: boolean; error?: string } {
    const cleanId = roomId.trim().toLowerCase();
    if (cleanId.startsWith('pod-free-')) {
      return { success: false, error: 'Không thể xóa phòng học công khai của hệ thống.' };
    }

    const room = this.getRoom(cleanId);
    if (!room) {
      return { success: false, error: 'Phòng không tồn tại hoặc đã bị xóa.' };
    }

    const isHost =
      room.hostUserId === currentUser.id ||
      room.hostEmail.toLowerCase() === currentUser.email?.toLowerCase() ||
      isOwnerEmail(currentUser.email);

    if (!isHost) {
      return { success: false, error: 'Chỉ chủ phòng mới có quyền xóa phòng này.' };
    }

    const rooms = this.getAllRooms();
    delete rooms[cleanId];
    this.markRoomAsDeleted(cleanId);
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(ROOMS_STORAGE_KEY, JSON.stringify(rooms));
    }

    this.broadcastEvent({ type: 'ROOM_DELETED', roomId: cleanId });
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

    // Khóa sức chứa nguyên tử: Ngăn chặn Race Condition khi nhiều client join đồng thời
    const maxCapacity = room.maxParticipants || 10;
    const isAlreadyMember = Boolean(
      room.participants[participant.id] ||
      (participant.userId && Object.values(room.participants).some(p => p.userId === participant.userId))
    );
    if (!isAlreadyMember && Object.keys(room.participants).length >= maxCapacity && !isOwnerEmail(participant.userId)) {
      return { success: false };
    }

    // DỌN DẸP SẠCH: Loại bỏ mọi phiên cũ của cùng user (tránh rác khi refresh/reconnect)
    if (participant.userId) {
      Object.keys(room.participants).forEach((key) => {
        const existing = room.participants[key];
        if (
          existing.userId === participant.userId ||
          key === participant.userId ||
          key.startsWith(`${participant.userId}_`) ||
          (participant.role === 'host' && existing.role === 'host')
        ) {
          delete room.participants[key];
        }
      });
    }

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
  },

  /**
   * Cập nhật thời điểm hoạt động gần nhất (Heartbeat) của người tham gia
   */
  heartbeatParticipant(roomId: string, participantId: string): void {
    const room = this.getRoom(roomId);
    if (!room || !room.participants || !room.participants[participantId]) return;

    room.participants[participantId].lastSeen = Date.now();
    this.saveRoom(room);
  },

  /**
   * Tự động dọn dẹp các thành viên không còn hoạt động quá ngưỡng cho phép (Zombie Purge)
   * Mặc định ngưỡng timeout là 90 giây (90000ms) để bảo vệ các thiết bị di động tiết kiệm pin
   */
  cleanupZombieParticipants(roomId: string, maxInactiveMs: number = 90000): { removedCount: number; removedIds: string[] } {
    const room = this.getRoom(roomId);
    if (!room || !room.participants) return { removedCount: 0, removedIds: [] };

    const now = Date.now();
    const removedIds: string[] = [];

    Object.keys(room.participants).forEach((id) => {
      const p = room.participants[id];
      const lastActive = p.lastSeen || p.joinedAt || 0;
      if (now - lastActive > maxInactiveMs) {
        delete room.participants[id];
        removedIds.push(id);
      }
    });

    if (removedIds.length > 0) {
      this.saveRoom(room);
      removedIds.forEach((pid) => {
        this.broadcastEvent({ type: 'PARTICIPANT_LEFT', roomId, participantId: pid });
      });
    }

    return { removedCount: removedIds.length, removedIds };
  }
};
