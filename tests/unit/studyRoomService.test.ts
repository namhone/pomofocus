import { describe, it, expect, beforeEach } from 'vitest';
import {
  studyRoomService,
  generateUniqueRoomId,
  PUBLIC_FREE_PODS
} from '../../src/services/studyRoomService';
import { UserProfile, OWNER_EMAIL } from '../../src/services/authService';
import { momoService } from '../../src/services/momoService';

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

  describe('5. 10 Public Free Study Pods (Sức chứa tối đa 5 người, Free 100%)', () => {
    it('cung cấp danh sách đúng 10 phòng Public Free Pods cố định (pod-free-01 đến pod-free-10)', () => {
      expect(PUBLIC_FREE_PODS).toHaveLength(10);
      expect(PUBLIC_FREE_PODS[0]).toEqual({
        roomId: 'pod-free-01',
        title: 'Phòng Tập Trung 01',
        maxParticipants: 5
      });
      expect(PUBLIC_FREE_PODS[9]).toEqual({
        roomId: 'pod-free-10',
        title: 'Phòng Tập Trung 10',
        maxParticipants: 5
      });
    });

    it('cho phép người dùng chưa đăng nhập (Guest) hoặc tài khoản Free vào phòng công khai mà không đòi hỏi PRO hay token', () => {
      const guestAccess = studyRoomService.verifyRoomAccess('pod-free-01', null);
      expect(guestAccess.allowed).toBe(true);
      if (guestAccess.allowed) {
        expect(guestAccess.role).toBe('guest');
        expect(guestAccess.room.allowFreeGuests).toBe(true);
        expect(guestAccess.room.maxParticipants).toBe(5);
      }
    });

    it('từ chối khi phòng đã đạt đủ 5 người (ROOM_FULL) và bảo vệ sức chứa', () => {
      const room = studyRoomService.getRoom('pod-free-03')!;
      expect(room).toBeDefined();

      // Giả lập phòng đã có đủ 5 người đang học
      for (let i = 1; i <= 5; i++) {
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
        email: 'person6@example.com',
        displayName: 'Người thứ 6',
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

    it('cho phép thành viên đã ở trong phòng tiếp tục truy cập lại (reconnect) ngay cả khi phòng đang chạm mốc 5 người', () => {
      const room = studyRoomService.getRoom('pod-free-05')!;
      for (let i = 1; i <= 5; i++) {
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
  });
});
