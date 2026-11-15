import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  studyRoomService,
  generateUniqueRoomId,
  PUBLIC_FREE_PODS,
  resolveCanonicalRoom,
  teardownRoomSession,
  isTimerActionAuthorized,
  verifyTimerSyncAuthority,
  markHostDisconnected,
  markHostReconnected,
  isHostGracePeriodActive,
  getHostGraceRemainingSeconds,
  getTabSessionId,
  clearTabSessionId
} from '../../src/services/studyRoomService';
import { UserProfile, OWNER_EMAIL } from '../../src/services/authService';
import { momoService } from '../../src/services/momoService';
import { safeStorage } from '../../src/utils/safeStorage';

describe('Study Room Service & Free Guest Access Policy Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('1. Room ID Generation & Formatting', () => {
    it('sinh mã phòng ngẫu nhiên duy nhất dạng xxxx-xxxx-xxxx với toàn chữ và số', () => {
      const id1 = generateUniqueRoomId();
      const id2 = generateUniqueRoomId();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$/);
      expect(id2).toMatch(/^[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$/);
    });
  });

  describe('2. Xác minh Điều kiện Thuê bao Trả phí (Backend Verification)', () => {
    it('từ chối người dùng chưa đăng nhập', () => {
      const res = studyRoomService.verifyPaidSubscriptionEligibility(null);
      expect(res.eligible).toBe(false);
      expect(res.planType).toBe('NONE');
    });

    it('từ chối tài khoản Free', () => {
      const freeUser: UserProfile = {
        id: 'usr_free',
        email: 'free@example.com',
        displayName: 'Free User',
        plan: 'free',
        createdAt: Date.now()
      };
      const res = studyRoomService.verifyPaidSubscriptionEligibility(freeUser);
      expect(res.eligible).toBe(false);
      expect(res.planType).toBe('FREE');
    });

    it('từ chối tài khoản khuyến mãi PRO Beta (Không tính khuyến mãi là đã mua trả phí)', () => {
      const betaUser: UserProfile = {
        id: 'usr_beta',
        email: 'beta@example.com',
        displayName: 'Beta User',
        plan: 'pro_beta',
        createdAt: Date.now(),
        proExpiresAt: Date.now() + 3 * 365 * 86400000
      };
      const res = studyRoomService.verifyPaidSubscriptionEligibility(betaUser);
      expect(res.eligible).toBe(false);
      expect(res.planType).toBe('PRO_BETA');
      expect(res.reason).toContain('gói Khuyến mãi PRO Beta');
    });

    it('từ chối tài khoản Sandbox', () => {
      const sandboxUser: UserProfile = {
        id: 'usr_sb',
        email: 'sandbox@example.com',
        displayName: 'Sandbox User',
        plan: 'pro_sandbox',
        createdAt: Date.now()
      };
      const res = studyRoomService.verifyPaidSubscriptionEligibility(sandboxUser);
      expect(res.eligible).toBe(false);
      expect(res.planType).toBe('PRO_SANDBOX');
    });

    it('từ chối tài khoản giả mạo client (set plan: pro nhưng không có đơn hàng đối soát hợp lệ)', () => {
      const fakeProUser: UserProfile = {
        id: 'usr_fake_hacker',
        email: 'hacker@example.com',
        displayName: 'Fake Pro Hacker',
        plan: 'pro',
        createdAt: Date.now(),
        proExpiresAt: Date.now() + 86400000 * 30
      };
      // Không có đơn hàng nào trong momoService
      const res = studyRoomService.verifyPaidSubscriptionEligibility(fakeProUser);
      expect(res.eligible).toBe(false);
      expect(res.planType).toBe('PRO_UNVERIFIED');
    });

    it('từ chối tài khoản PRO chỉ mua gói 1 tháng (chưa đủ >= 3 tháng)', () => {
      const oneMonthUser: UserProfile = {
        id: 'usr_1m',
        email: 'onemonth@example.com',
        displayName: 'One Month Pro',
        plan: 'pro',
        createdAt: Date.now(),
        proExpiresAt: Date.now() + 86400000 * 30
      };

      // Tạo đơn hàng 1 tháng đã thanh toán đối soát
      const order = momoService.createOrder(oneMonthUser.email, 'monthly', oneMonthUser.id);
      order.status = 'verified_paid';
      order.paidAt = Date.now();
      momoService.saveOrder(order);

      const res = studyRoomService.verifyPaidSubscriptionEligibility(oneMonthUser);
      expect(res.eligible).toBe(false);
      expect(res.durationMonths).toBe(1);
      expect(res.planType).toBe('PRO_PAID_INSUFFICIENT_DURATION');
      expect(res.reason).toContain('yêu cầu thuê bao trả phí từ 3 tháng trở lên');
    });

    it('chấp thuận tài khoản PRO mua gói Hàng năm 12 tháng (>= 3 tháng) và còn hạn', () => {
      const yearlyUser: UserProfile = {
        id: 'usr_yearly',
        email: 'yearly@example.com',
        displayName: 'Yearly Pro Member',
        plan: 'pro',
        createdAt: Date.now(),
        proExpiresAt: Date.now() + 86400000 * 365
      };

      // Tạo đơn hàng hàng năm 12 tháng đã đối soát thành công
      const order = momoService.createOrder(yearlyUser.email, 'yearly', yearlyUser.id);
      order.status = 'verified_paid';
      order.paidAt = Date.now();
      momoService.saveOrder(order);

      const res = studyRoomService.verifyPaidSubscriptionEligibility(yearlyUser);
      expect(res.eligible).toBe(true);
      expect(res.durationMonths).toBe(12);
      expect(res.isPaid).toBe(true);
      expect(res.planType).toBe('PRO_PAID_ELIGIBLE');
    });

    it('chấp thuận tài khoản Chủ sở hữu hệ thống (Lifetime PRO bất biến)', () => {
      const ownerUser: UserProfile = {
        id: 'usr_owner',
        email: OWNER_EMAIL,
        displayName: 'Chủ Sở Hữu',
        plan: 'pro_lifetime',
        isLifetime: true,
        createdAt: Date.now()
      };
      const res = studyRoomService.verifyPaidSubscriptionEligibility(ownerUser);
      expect(res.eligible).toBe(true);
      expect(res.planType).toBe('PRO_LIFETIME');
    });

    it('từ chối khi thuê bao trả phí đã hết hạn', () => {
      const expiredUser: UserProfile = {
        id: 'usr_exp',
        email: 'expired@example.com',
        displayName: 'Expired Member',
        plan: 'pro',
        createdAt: Date.now() - 86400000 * 400,
        proExpiresAt: Date.now() - 86400000 * 5 // Đã hết hạn 5 ngày trước
      };

      const order = momoService.createOrder(expiredUser.email, 'yearly', expiredUser.id);
      order.status = 'verified_paid';
      order.paidAt = Date.now() - 86400000 * 400;
      momoService.saveOrder(order);

      const res = studyRoomService.verifyPaidSubscriptionEligibility(expiredUser);
      expect(res.eligible).toBe(false);
      expect(res.planType).toBe('EXPIRED');
    });
  });

  describe('3. Tạo phòng & Kiểm soát Quyền Truy Cập (Access Verification)', () => {
    it('tạo phòng mới thành công với mã phòng duy nhất và token bảo mật', () => {
      const host: UserProfile = {
        id: 'usr_host_1',
        email: 'host1@example.com',
        displayName: 'Host One',
        plan: 'pro_lifetime',
        createdAt: Date.now()
      };

      const result = studyRoomService.createRoom({
        title: 'Phòng Luyện Thi IELTS',
        hostUser: host
      });

      expect(result.success).toBe(true);
      if (!result.success) return;
      const { room, inviteLink } = result;

      expect(room.roomId).toMatch(/^[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$/);
      expect(room.status).toBe('active');
      expect(room.hostUserId).toBe(host.id);
      expect(room.allowFreeGuests).toBe(false);
      expect(inviteLink).toContain(`/rooms/${room.roomId}`);
    });

    it('từ chối mã phòng không hợp lệ hoặc rỗng', () => {
      const res = studyRoomService.verifyRoomAccess('', null);
      expect(res.allowed).toBe(false);
      if (!res.allowed) {
        expect(res.code).toBe('INVALID_CODE');
      }
    });

    it('từ chối khi phòng không tồn tại (ROOM_NOT_FOUND)', () => {
      const res = studyRoomService.verifyRoomAccess('room-khong-ton-tai-xyz-999', null);
      expect(res.allowed).toBe(false);
      if (!res.allowed) {
        expect(res.code).toBe('ROOM_NOT_FOUND');
      }
    });

    it('từ chối khi phòng đã đóng (ROOM_CLOSED)', () => {
      const res = studyRoomService.verifyRoomAccess('room-closed-test', null);
      expect(res.allowed).toBe(false);
      if (!res.allowed) {
        expect(res.code).toBe('ROOM_CLOSED');
      }
    });

    it('cho phép chủ phòng vào phòng với role host', () => {
      const host: UserProfile = {
        id: 'usr_host_test',
        email: 'host_test@example.com',
        displayName: 'Host Test',
        plan: 'pro_lifetime',
        createdAt: Date.now()
      };
      const result = studyRoomService.createRoom({ hostUser: host });
      expect(result.success).toBe(true);
      if (!result.success) return;
      const res = studyRoomService.verifyRoomAccess(result.room.roomId, host);
      expect(res.allowed).toBe(true);
      if (res.allowed) {
        expect(res.role).toBe('host');
      }
    });

    it('cho phép thành viên PRO vào phòng với role member', () => {
      const host: UserProfile = {
        id: 'usr_host_pro',
        email: 'host_pro@example.com',
        displayName: 'Host Pro',
        plan: 'pro_lifetime',
        createdAt: Date.now()
      };
      const result = studyRoomService.createRoom({ hostUser: host });
      expect(result.success).toBe(true);
      if (!result.success) return;

      const memberPro: UserProfile = {
        id: 'usr_member_pro',
        email: 'member@example.com',
        displayName: 'Member Pro',
        plan: 'pro',
        createdAt: Date.now()
      };

      const res = studyRoomService.verifyRoomAccess(result.room.roomId, memberPro);
      expect(res.allowed).toBe(true);
      if (res.allowed) {
        expect(res.role).toBe('member');
      }
    });

    it('từ chối người dùng Free khi phòng chưa bật cho phép khách Free (INSUFFICIENT_PERMISSIONS)', () => {
      const host: UserProfile = {
        id: 'usr_host_strict',
        email: 'strict@example.com',
        displayName: 'Strict Host',
        plan: 'pro_lifetime',
        createdAt: Date.now()
      };
      const result = studyRoomService.createRoom({ hostUser: host }); // allowFreeGuests = false
      expect(result.success).toBe(true);
      if (!result.success) return;

      const freeUser: UserProfile = {
        id: 'usr_free_guest',
        email: 'free_guest@example.com',
        displayName: 'Free Guest',
        plan: 'free',
        createdAt: Date.now()
      };

      const res = studyRoomService.verifyRoomAccess(result.room.roomId, freeUser);
      expect(res.allowed).toBe(false);
      if (!res.allowed) {
        expect(res.code).toBe('INSUFFICIENT_PERMISSIONS');
      }
    });

    it('cho phép người dùng Free khi phòng đã bật allowFreeGuests VÀ có token hợp lệ', () => {
      const host: UserProfile = {
        id: 'usr_host_open',
        email: OWNER_EMAIL,
        displayName: 'Host Open',
        plan: 'pro_lifetime',
        createdAt: Date.now()
      };
      const createRes = studyRoomService.createRoom({ hostUser: host });
      expect(createRes.success).toBe(true);
      if (!createRes.success) return;
      const room = createRes.room;

      // Host bật allowFreeGuests
      studyRoomService.setAllowFreeGuests(room.roomId, host, true);
      const updatedRoom = studyRoomService.getRoom(room.roomId)!;
      const validToken = updatedRoom.activeInviteToken;

      const freeUser: UserProfile = {
        id: 'usr_free_ok',
        email: 'guest@example.com',
        displayName: 'Guest Ok',
        plan: 'free',
        createdAt: Date.now()
      };

      const res = studyRoomService.verifyRoomAccess(room.roomId, freeUser, validToken);
      expect(res.allowed).toBe(true);
      if (res.allowed) {
        expect(res.role).toBe('guest');
      }
    });
  });

  describe('4. Bật/Tắt Quyền Mời Free & Thu Hồi Token (Revocation Security)', () => {
    it('ngăn chặn tài khoản Free tự tạo phòng và bật quyền mời Free (chặn ở backend)', () => {
      const freeUser: UserProfile = {
        id: 'usr_fake_host',
        email: 'fake_host@example.com',
        displayName: 'Fake Host',
        plan: 'free',
        createdAt: Date.now()
      };

      // Tài khoản Free cố tình gọi API tạo phòng
      const createRes = studyRoomService.createRoom({ hostUser: freeUser });
      expect(createRes.success).toBe(false);
      if (!createRes.success) {
        expect(createRes.error).toContain('đặc quyền dành riêng cho gói PRO');
      }
    });

    it('thu hồi token cũ khiến link cũ bị vô hiệu hóa ngay lập tức (TOKEN_EXPIRED_OR_REVOKED)', () => {
      const host: UserProfile = {
        id: 'usr_owner_revoke',
        email: OWNER_EMAIL,
        displayName: 'Host Revoke',
        plan: 'pro_lifetime',
        createdAt: Date.now()
      };

      const createRes = studyRoomService.createRoom({ hostUser: host });
      expect(createRes.success).toBe(true);
      if (!createRes.success) return;
      const room = createRes.room;

      studyRoomService.setAllowFreeGuests(room.roomId, host, true);

      const oldToken = studyRoomService.getRoom(room.roomId)!.activeInviteToken;

      // Host thực hiện thu hồi và tạo token mới
      const revokeRes = studyRoomService.revokeAndRegenerateInviteToken(room.roomId, host);
      expect(revokeRes.success).toBe(true);
      expect(revokeRes.newInviteLink).toBeDefined();

      const freeGuest: UserProfile = {
        id: 'usr_guest_old_link',
        email: 'old_link@example.com',
        displayName: 'Old Link User',
        plan: 'free',
        createdAt: Date.now()
      };

      // Thử dùng lại oldToken
      const testOld = studyRoomService.verifyRoomAccess(room.roomId, freeGuest, oldToken);
      expect(testOld.allowed).toBe(false);
      if (!testOld.allowed) {
        expect(testOld.code).toBe('TOKEN_EXPIRED_OR_REVOKED');
      }

      // Dùng newToken mới tạo
      const currentRoom = studyRoomService.getRoom(room.roomId)!;
      const newToken = currentRoom.activeInviteToken;
      const testNew = studyRoomService.verifyRoomAccess(room.roomId, freeGuest, newToken);
      expect(testNew.allowed).toBe(true);
      if (testNew.allowed) {
        expect(testNew.role).toBe('guest');
      }
    });

    it('chủ phòng đóng phòng học khiến mọi người bị chặn truy cập', () => {
      const host: UserProfile = {
        id: 'usr_host_close',
        email: OWNER_EMAIL,
        displayName: 'Host Close',
        plan: 'pro_lifetime',
        createdAt: Date.now()
      };

      const createRes = studyRoomService.createRoom({ hostUser: host });
      expect(createRes.success).toBe(true);
      if (!createRes.success) return;
      const room = createRes.room;

      const closeRes = studyRoomService.closeRoom(room.roomId, host);
      expect(closeRes.success).toBe(true);

      const res = studyRoomService.verifyRoomAccess(room.roomId, null);
      expect(res.allowed).toBe(false);
      if (!res.allowed) {
        expect(res.code).toBe('ROOM_CLOSED');
      }
    });
  });

  describe('5. 10 Public Free Study Pods (Sức chứa tối đa 10 người, Free 100%)', () => {
    it('cung cấp danh sách đúng 10 phòng Public Free Pods cố định (pod-free-01 đến pod-free-10)', () => {
      expect(PUBLIC_FREE_PODS).toHaveLength(10);
      expect(PUBLIC_FREE_PODS[0]).toEqual({
        roomId: 'pod-free-01',
        title: 'Phòng 01',
        maxParticipants: 10
      });
      expect(PUBLIC_FREE_PODS[9]).toEqual({
        roomId: 'pod-free-10',
        title: 'Phòng 10',
        maxParticipants: 10
      });
    });

    it('cho phép người dùng chưa đăng nhập (Guest) hoặc tài khoản Free vào phòng công khai mà không đòi hỏi PRO hay token', () => {
      const guestAccess = studyRoomService.verifyRoomAccess('pod-free-01', null);
      expect(guestAccess.allowed).toBe(true);
      if (guestAccess.allowed) {
        expect(guestAccess.role).toBe('guest');
        expect(guestAccess.room.allowFreeGuests).toBe(true);
        expect(guestAccess.room.maxParticipants).toBe(10);
      }
    });

    it('từ chối khi phòng đã đạt đủ 10 người (ROOM_FULL) và bảo vệ sức chứa', () => {
      const room = studyRoomService.getRoom('pod-free-03')!;
      expect(room).toBeDefined();

      // Giả lập phòng đã có đủ 10 người đang học
      for (let i = 1; i <= 10; i++) {
        room.participants[`p_${i}`] = {
          id: `p_${i}`,
          userId: `usr_member_${i}`,
          name: `Học viên ${i}`,
          role: 'member',
          isMicOn: false,
          isVideoOn: false,
          joinedAt: Date.now()
        };
      }
      studyRoomService.saveRoom(room);

      const newUser: UserProfile = {
        id: 'usr_new_person',
        email: 'person11@example.com',
        displayName: 'Người thứ 11',
        plan: 'free',
        createdAt: Date.now()
      };

      const checkAccess = studyRoomService.verifyRoomAccess('pod-free-03', newUser);
      expect(checkAccess.allowed).toBe(false);
      if (!checkAccess.allowed) {
        expect(checkAccess.code).toBe('ROOM_FULL');
        expect(checkAccess.message).toContain('giới hạn tối đa');
      }
    });

    it('cho phép thành viên đã ở trong phòng tiếp tục truy cập lại (reconnect) ngay cả khi phòng đang chạm mốc 10 người', () => {
      const room = studyRoomService.getRoom('pod-free-05')!;
      for (let i = 1; i <= 10; i++) {
        room.participants[`p_${i}`] = {
          id: `p_${i}`,
          userId: `usr_member_${i}`,
          name: `Học viên ${i}`,
          role: 'member',
          isMicOn: false,
          isVideoOn: false,
          joinedAt: Date.now()
        };
      }
      studyRoomService.saveRoom(room);

      // Học viên 2 tải lại trang hoặc reconnect
      const existingUser: UserProfile = {
        id: 'usr_member_2',
        email: 'member2@example.com',
        displayName: 'Học viên 2',
        plan: 'free',
        createdAt: Date.now()
      };

      const checkAccess = studyRoomService.verifyRoomAccess('pod-free-05', existingUser);
      expect(checkAccess.allowed).toBe(true);
    });

    it('heartbeat & cleanupZombieParticipants: Bảo vệ thiết bị di động với ngưỡng timeout 90 giây', () => {
      const room = studyRoomService.getRoom('pod-free-01')!;
      const now = Date.now();

      // Client 1: Vừa gửi heartbeat 30 giây trước (chưa quá 90s -> Giữ lại)
      room.participants['client_active'] = {
        id: 'client_active',
        userId: 'usr_active',
        name: 'Bạn Học Mobile',
        role: 'member',
        isMicOn: false,
        isVideoOn: false,
        joinedAt: now - 30000,
        lastSeen: now - 30000
      };

      // Client 2: Đã im lặng 95 giây (> 90s -> Zombie, cần dọn dẹp)
      room.participants['client_zombie'] = {
        id: 'client_zombie',
        userId: 'usr_zombie',
        name: 'Bạn Học Rớt Mạng',
        role: 'member',
        isMicOn: false,
        isVideoOn: false,
        joinedAt: now - 120000,
        lastSeen: now - 95000
      };

      studyRoomService.saveRoom(room);

      // Cập nhật heartbeat cho client active
      studyRoomService.heartbeatParticipant('pod-free-01', 'client_active');
      const updatedRoomBeforePurge = studyRoomService.getRoom('pod-free-01')!;
      expect(updatedRoomBeforePurge.participants['client_active'].lastSeen).toBeGreaterThanOrEqual(now);

      // Chạy dọn dẹp Zombie với ngưỡng 90s (90000ms)
      const res = studyRoomService.cleanupZombieParticipants('pod-free-01', 90000);

      expect(res.removedCount).toBe(1);
      expect(res.removedIds).toContain('client_zombie');

      const updatedRoomAfterPurge = studyRoomService.getRoom('pod-free-01')!;
      expect(updatedRoomAfterPurge.participants['client_active']).toBeDefined();
      expect(updatedRoomAfterPurge.participants['client_zombie']).toBeUndefined();
    });
  });

  describe('7. Milestone 1: Room Lifecycle, Canonical roomId, Ghost Room Elimination & Host Authority', () => {
    const mockHostUser: UserProfile = {
      id: 'usr_host_m1',
      email: 'host_m1@pomodoro.app',
      displayName: 'Host M1',
      plan: 'pro_lifetime',
      createdAt: Date.now()
    };

    const mockGuestUser: UserProfile = {
      id: 'usr_guest_m1',
      email: 'guest_m1@pomodoro.app',
      displayName: 'Guest M1',
      plan: 'free',
      createdAt: Date.now()
    };

    describe('A. Elimination of Auto-Synthesis Trap & Canonical roomId', () => {
      it('getRoom() trả về null cho mã phòng không tồn tại và KHÔNG tự động sinh usr_peer_host', () => {
        const unknownId = 'room-unknown-link-1234';
        const result = studyRoomService.getRoom(unknownId);
        expect(result).toBeNull();

        // Xác nhận phòng không bị lưu ngầm vào localStorage
        const allRooms = studyRoomService.getAllRooms();
        expect(allRooms[unknownId]).toBeUndefined();
      });

      it('resolveCanonicalRoom() trả về null cho phòng không tồn tại', async () => {
        const result = await resolveCanonicalRoom('room-non-existent-xyz');
        expect(result).toBeNull();
      });

      it('resolveCanonicalRoom() phân giải thành công Public Study Pod', async () => {
        const pod = await resolveCanonicalRoom('pod-free-02');
        expect(pod).not.toBeNull();
        expect(pod?.roomId).toBe('pod-free-02');
        expect(pod?.title).toBe('Phòng 02');
      });

      it('resolveCanonicalRoom() phân giải phòng hợp lệ từ Cloud khi localStorage trống (kịch bản đa thiết bị)', async () => {
        // Device 1: Host khởi tạo phòng
        const createRes = studyRoomService.createRoom({
          hostUser: mockHostUser,
          title: 'Phòng Luyện Thi IELTS 8.0'
        });
        expect(createRes.success).toBe(true);
        const createdRoom = createRes.room;
        const roomId = createdRoom.roomId;

        // Mô phỏng Device 2 (hoặc ẩn danh): localStorage hoàn toàn trống, chưa hề lưu thông tin phòng
        localStorage.clear();
        expect(studyRoomService.getAllRooms()[roomId]).toBeUndefined();

        // Device 2 phân giải phòng thông qua Serverless API /api/rooms (Cloud sync)
        const originalFetch = global.fetch;
        const mockApiResponse = {
          success: true,
          room: {
            roomId: createdRoom.roomId,
            slug: createdRoom.slug,
            owner_id: createdRoom.owner_id,
            title: createdRoom.title,
            hostUserId: createdRoom.hostUserId,
            hostEmail: createdRoom.hostEmail,
            createdAt: createdRoom.createdAt,
            status: 'active',
            allowFreeGuests: true,
            maxParticipants: createdRoom.maxParticipants || 10,
            settings: createdRoom.settings
          }
        };

        global.fetch = vi.fn().mockImplementation(async (url: string) => {
          if (String(url).includes('/api/rooms')) {
            return {
              ok: true,
              status: 200,
              json: async () => mockApiResponse
            } as any;
          }
          return {
            ok: false,
            status: 404,
            json: async () => ({ success: false })
          } as any;
        });

        try {
          const resolved = await resolveCanonicalRoom(roomId);
          expect(resolved).not.toBeNull();
          expect(resolved?.roomId).toBe(roomId);
          expect(resolved?.hostUserId).toBe(mockHostUser.id);
          expect(resolved?.title).toBe('Phòng Luyện Thi IELTS 8.0');

          // Kiểm tra sau khi phân giải thành công từ Cloud, phòng được nạp vào cache Device 2
          expect(studyRoomService.getAllRooms()[roomId]).toBeDefined();
        } finally {
          global.fetch = originalFetch;
        }
      });

      it('resolveCanonicalRoom() trả về null cho phòng không tồn tại khi localStorage hoàn toàn trống', async () => {
        localStorage.clear();
        const originalFetch = global.fetch;
        global.fetch = vi.fn().mockResolvedValue({
          ok: false,
          status: 404,
          json: async () => ({ success: false, error: 'ROOM_NOT_FOUND' })
        } as any);

        try {
          const result = await resolveCanonicalRoom('room-completely-unknown-device2');
          expect(result).toBeNull();
        } finally {
          global.fetch = originalFetch;
        }
      });

      it('resolveCanonicalRoom() phân giải thành công từ Supabase Cloud trực tiếp khi API phòng offline', async () => {
        const uuidRoomId = 'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d';
        localStorage.clear();

        const originalFetch = global.fetch;
        global.fetch = vi.fn().mockImplementation(async (url: string) => {
          if (String(url).includes('/api/rooms')) {
            // API serverless offline / 503
            return {
              ok: false,
              status: 503,
              json: async () => ({ success: false })
            } as any;
          }
          if (String(url).includes('/rest/v1/study_rooms')) {
            // Supabase Cloud REST API trả về bản ghi chỉ với các cột hợp lệ
            return {
              ok: true,
              status: 200,
              json: async () => [{
                id: uuidRoomId,
                host_user_id: mockHostUser.id,
                title: 'Phòng Toán Cao Cấp Cloud',
                status: 'active',
                capacity_limit: 15,
                created_at: new Date().toISOString(),
                closed_at: null
              }]
            } as any;
          }
          return {
            ok: false,
            status: 404,
            json: async () => ({})
          } as any;
        });

        try {
          const resolved = await resolveCanonicalRoom(uuidRoomId);
          expect(resolved).not.toBeNull();
          expect(resolved?.roomId).toBe(uuidRoomId);
          expect(resolved?.hostUserId).toBe(mockHostUser.id);
          expect(resolved?.title).toBe('Phòng Toán Cao Cấp Cloud');
          expect(resolved?.maxParticipants).toBe(15);
        } finally {
          global.fetch = originalFetch;
        }
      });

      it('isHostGracePeriodActive xử lý an toàn hiện tượng chệch đồng hồ (Clock Skew) âm nhẹ', () => {
        const roomId = 'room-clock-skew-test';
        const disconnectedAt = 1000000;
        markHostDisconnected(roomId, disconnectedAt);

        // Trường hợp đồng hồ client bị lùi 100ms do NTP sync (elapsed = -100ms)
        const slightlyEarlier = disconnectedAt - 100;
        expect(isHostGracePeriodActive(roomId, slightlyEarlier)).toBe(true);

        // Trường hợp lùi quá mức (> 5000ms) thì không hợp lệ
        const wayEarlier = disconnectedAt - 6000;
        expect(isHostGracePeriodActive(roomId, wayEarlier)).toBe(false);

        markHostReconnected(roomId);
        expect(isHostGracePeriodActive(roomId)).toBe(false);
      });
    });

    describe('B. Ghost Room Eradication, Realtime Lifecycle Action & Whiteboard Purge', () => {
      it('closeRoom phát sự kiện Realtime room-lifecycle-action với action ROOM_CLOSED', () => {
        const createRes = studyRoomService.createRoom({ hostUser: mockHostUser });
        const roomId = createRes.room.roomId;

        const sentEvents: any[] = [];
        const mockChannel = {
          send: vi.fn((data: any) => {
            sentEvents.push(data);
            return Promise.resolve();
          })
        };

        const closeRes = studyRoomService.closeRoom(roomId, mockHostUser, mockChannel as any);
        expect(closeRes.success).toBe(true);

        // Kiểm tra đã phát broadcast Realtime lên channel
        expect(mockChannel.send).toHaveBeenCalledTimes(1);
        expect(sentEvents[0]).toEqual({
          type: 'broadcast',
          event: 'room-lifecycle-action',
          payload: {
            action: 'ROOM_CLOSED',
            roomId,
            hostUserId: mockHostUser.id
          }
        });

        // Kiểm tra trạng thái đã đóng
        const closedRoom = studyRoomService.getRoom(roomId);
        expect(closedRoom?.status).toBe('closed');
      });

      it('deleteRoom dọn sạch nét vẽ Whiteboard, tin nhắn, phiên tab và phát Realtime ROOM_DELETED', () => {
        const createRes = studyRoomService.createRoom({ hostUser: mockHostUser });
        const roomId = createRes.room.roomId;

        // Giả lập lưu trữ nét vẽ và tin nhắn phòng
        safeStorage.setItem(`pomofocus_whiteboard_strokes_${roomId}`, JSON.stringify([{ x: 10, y: 20 }]));
        safeStorage.setItem(`pomofocus_room_messages_${roomId}`, JSON.stringify([{ text: 'Hello' }]));
        getTabSessionId(roomId); // sinh session tab

        const sentEvents: any[] = [];
        const mockChannel = {
          send: vi.fn((data: any) => {
            sentEvents.push(data);
            return Promise.resolve();
          })
        };

        const deleteRes = studyRoomService.deleteRoom(roomId, mockHostUser, mockChannel as any);
        expect(deleteRes.success).toBe(true);

        // Kiểm tra nét vẽ Whiteboard và tin nhắn đã được dọn sạch hoàn toàn
        expect(safeStorage.getItem(`pomofocus_whiteboard_strokes_${roomId}`)).toBeNull();
        expect(safeStorage.getItem(`pomofocus_room_messages_${roomId}`)).toBeNull();

        // Kiểm tra phát Realtime ROOM_DELETED
        expect(mockChannel.send).toHaveBeenCalledTimes(1);
        expect(sentEvents[0].payload.action).toBe('ROOM_DELETED');

        // Phòng đã bị xóa khỏi localStorage
        expect(studyRoomService.getRoom(roomId)).toBeNull();
      });

      it('teardownRoomSession tắt toàn bộ media tracks, hủy rtcManager và untrack channel', async () => {
        const mockTrack1 = { stop: vi.fn() };
        const mockTrack2 = { stop: vi.fn() };
        const mockStream = {
          getTracks: vi.fn(() => [mockTrack1, mockTrack2])
        } as unknown as MediaStream;

        const mockScreenTrack = { stop: vi.fn() };
        const mockScreenStream = {
          getTracks: vi.fn(() => [mockScreenTrack])
        } as unknown as MediaStream;

        const mockRtc = {
          destroy: vi.fn()
        };

        const mockChannel = {
          untrack: vi.fn(() => Promise.resolve())
        };

        await teardownRoomSession({
          stream: mockStream,
          screenStream: mockScreenStream,
          rtcManager: mockRtc,
          channel: mockChannel
        });

        expect(mockTrack1.stop).toHaveBeenCalledTimes(1);
        expect(mockTrack2.stop).toHaveBeenCalledTimes(1);
        expect(mockScreenTrack.stop).toHaveBeenCalledTimes(1);
        expect(mockRtc.destroy).toHaveBeenCalledTimes(1);
        expect(mockChannel.untrack).toHaveBeenCalledTimes(1);
      });
    });

    describe('C. Host Authority on Group Timer', () => {
      const testRoom = {
        roomId: 'room-timer-test',
        hostUserId: 'usr_host_123',
        hostEmail: 'host123@pomodoro.app',
        title: 'Timer Room',
        status: 'active' as const,
        createdAt: Date.now(),
        allowFreeGuests: true,
        activeInviteToken: null,
        inviteTokens: {},
        participants: {},
        guestPermissions: { canChat: true, canMic: true, canCam: true, canShareScreen: false }
      };

      it('chấp nhận quyền điều khiển timer từ chính Chủ phòng (Host)', () => {
        const authorized = isTimerActionAuthorized(testRoom, {
          id: 'usr_host_123',
          userId: 'usr_host_123',
          email: 'host123@pomodoro.app'
        });
        expect(authorized).toBe(true);
      });

      it('chấp nhận quyền điều khiển timer từ Master Admin (Nam Hồ & Huyền Trân)', () => {
        const authNam = isTimerActionAuthorized(testRoom, {
          id: 'usr_any_id',
          email: 'namho03052k9@gmail.com'
        });
        expect(authNam).toBe(true);

        const authTran = isTimerActionAuthorized(testRoom, {
          id: 'usr_other_id',
          email: 'huyentrantt09@gmail.com'
        });
        expect(authTran).toBe(true);
      });

      it('từ chối quyền điều khiển timer từ thành viên thường (Guest/Member)', () => {
        const authorized = isTimerActionAuthorized(testRoom, {
          id: 'usr_impostor',
          userId: 'usr_impostor',
          email: 'impostor@example.com'
        });
        expect(authorized).toBe(false);
      });
    });

    describe('D. 60-Second Host Disconnect Grace Period', () => {
      const roomId = 'room-grace-test';

      it('quản lý thời gian ân hạn 60 giây khi Chủ phòng mất kết nối đột ngột', () => {
        const baseTime = 1000000;

        // Ban đầu chưa mất kết nối
        expect(isHostGracePeriodActive(roomId, baseTime)).toBe(false);
        expect(getHostGraceRemainingSeconds(roomId, baseTime)).toBe(0);

        // Host mất kết nối tại baseTime
        markHostDisconnected(roomId, baseTime);

        // Sau 10 giây (vẫn trong 60s)
        expect(isHostGracePeriodActive(roomId, baseTime + 10000)).toBe(true);
        expect(getHostGraceRemainingSeconds(roomId, baseTime + 10000)).toBe(50);

        // Sau 59 giây (vẫn trong 60s)
        expect(isHostGracePeriodActive(roomId, baseTime + 59000)).toBe(true);
        expect(getHostGraceRemainingSeconds(roomId, baseTime + 59000)).toBe(1);

        // Sau 61 giây (hết ân hạn)
        expect(isHostGracePeriodActive(roomId, baseTime + 61000)).toBe(false);
        expect(getHostGraceRemainingSeconds(roomId, baseTime + 61000)).toBe(0);

        // Host kết nối lại -> Xóa ân hạn
        markHostReconnected(roomId);
        expect(isHostGracePeriodActive(roomId, baseTime + 10000)).toBe(false);
      });
    });

    describe('E. Session Tab Storage (sessionStorage persistence)', () => {
      it('lưu trữ và tái sử dụng clientSessionId trên cùng một tab (F5 reload test)', () => {
        const testRoomId = 'room-tab-session-1';
        clearTabSessionId(testRoomId);

        const session1 = getTabSessionId(testRoomId);
        expect(session1).toBeDefined();
        expect(session1.startsWith('tab_')).toBe(true);

        // Gọi lại lần 2 (mô phỏng F5 hoặc render lại)
        const session2 = getTabSessionId(testRoomId);
        expect(session2).toBe(session1);

        // Xóa phiên
        clearTabSessionId(testRoomId);
        const session3 = getTabSessionId(testRoomId);
        expect(session3).not.toBe(session1);
      });
    });
  });
});
