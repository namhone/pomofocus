import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  studyRoomService,
  StudyRoom,
  ROOM_CATEGORIES
} from '../../src/services/studyRoomService';
import { UserProfile, OWNER_EMAIL } from '../../src/services/authService';

describe('Study Room Delete, Rename & Deep Customization Unit Tests', () => {
  const hostUser: UserProfile = {
    id: 'usr_host_123',
    email: 'host.student@gmail.com',
    displayName: 'Host Student',
    plan: 'pro',
    createdAt: Date.now()
  };

  const memberUser: UserProfile = {
    id: 'usr_member_456',
    email: 'member.student@gmail.com',
    displayName: 'Member Student',
    plan: 'pro',
    createdAt: Date.now()
  };

  const guestUser: UserProfile = {
    id: 'usr_guest_789',
    email: 'guest@gmail.com',
    displayName: 'Guest Student',
    plan: 'free',
    createdAt: Date.now()
  };

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('1. Xóa phòng đã tạo (Delete Room)', () => {
    it('Chủ phòng (Host) có thể xóa thành công phòng đã tạo', () => {
      const created = studyRoomService.createRoom({
        title: 'Phòng Ôn Thi Toán',
        hostUser
      });
      expect(created.success).toBe(true);
      if (!created.success) return;

      const roomId = created.room.roomId;
      expect(studyRoomService.getRoom(roomId)).toBeDefined();

      const deleteRes = studyRoomService.deleteRoom(roomId, hostUser);
      expect(deleteRes.success).toBe(true);

      // Phòng không còn trong hệ thống
      expect(studyRoomService.getRoom(roomId)).toBeNull();
    });

    it('Từ chối khi thành viên hoặc người lạ cố tình xóa phòng của người khác', () => {
      const created = studyRoomService.createRoom({
        title: 'Phòng Bí Mật',
        hostUser
      });
      if (!created.success) return;
      const roomId = created.room.roomId;

      const deleteRes = studyRoomService.deleteRoom(roomId, memberUser);
      expect(deleteRes.success).toBe(false);
      expect(deleteRes.error).toContain('Chỉ chủ phòng mới có quyền xóa phòng này');

      // Phòng vẫn tồn tại nguyên vẹn
      expect(studyRoomService.getRoom(roomId)).toBeDefined();
    });

    it('Không cho phép xóa các phòng công khai của hệ thống (pod-free-xx)', () => {
      const res = studyRoomService.deleteRoom('pod-free-01', hostUser);
      expect(res.success).toBe(false);
      expect(res.error).toContain('Không thể xóa phòng học công khai của hệ thống');
    });

    it('Chủ sở hữu hệ thống (Owner) có đặc quyền xóa bất kỳ phòng riêng nào', () => {
      const created = studyRoomService.createRoom({
        title: 'Phòng Vi Phạm Quy Định',
        hostUser
      });
      if (!created.success) return;
      const roomId = created.room.roomId;

      const ownerUser: UserProfile = {
        id: 'usr_owner',
        email: OWNER_EMAIL,
        displayName: 'System Admin',
        plan: 'pro_lifetime',
        createdAt: Date.now()
      };

      const deleteRes = studyRoomService.deleteRoom(roomId, ownerUser);
      expect(deleteRes.success).toBe(true);
      expect(studyRoomService.getRoom(roomId)).toBeNull();
    });
  });

  describe('2. Tùy biến đổi tên phòng học (Rename Room)', () => {
    it('Chủ phòng đổi tên phòng thành công và lưu lại', () => {
      const created = studyRoomService.createRoom({
        title: 'Tên Ban Đầu',
        hostUser
      });
      if (!created.success) return;
      const roomId = created.room.roomId;

      const updateRes = studyRoomService.updateRoom(roomId, hostUser, {
        title: 'Tên Mới Sau Khi Đổi'
      });

      expect(updateRes.success).toBe(true);
      expect(updateRes.room?.title).toBe('Tên Mới Sau Khi Đổi');

      const reloaded = studyRoomService.getRoom(roomId);
      expect(reloaded?.title).toBe('Tên Mới Sau Khi Đổi');
    });

    it('Từ chối tên phòng rỗng hoặc chỉ có khoảng trắng', () => {
      const created = studyRoomService.createRoom({
        title: 'Tên Hợp Lệ',
        hostUser
      });
      if (!created.success) return;
      const roomId = created.room.roomId;

      const updateRes = studyRoomService.updateRoom(roomId, hostUser, {
        title: '   '
      });

      expect(updateRes.success).toBe(false);
      expect(updateRes.error).toContain('Tên phòng không được để trống');
    });
  });

  describe('3. Tùy chỉnh phòng họp chuyên sâu (Deep Customization)', () => {
    it('Tạo phòng với đầy đủ tùy chỉnh chuyên sâu: PIN, Mục tiêu, Thể loại, Chế độ siêu tập trung', () => {
      const created = studyRoomService.createRoom({
        title: 'IELTS 8.0 Sprint',
        hostUser,
        passcode: '8888',
        roomGoal: 'Giải 3 Test Reading Cambridge 18',
        roomCategory: 'lang',
        silentMode: true,
        requireCam: true,
        hostOnlyTimer: true,
        maxParticipants: 6
      });

      expect(created.success).toBe(true);
      if (!created.success) return;

      const room = created.room;
      expect(room.passcode).toBe('8888');
      expect(room.roomGoal).toBe('Giải 3 Test Reading Cambridge 18');
      expect(room.roomCategory).toBe('lang');
      expect(room.silentMode).toBe(true);
      expect(room.requireCam).toBe(true);
      expect(room.hostOnlyTimer).toBe(true);
      expect(room.maxParticipants).toBe(6);
    });

    it('Cập nhật thay đổi các cài đặt chuyên sâu trong phòng đang hoạt động', () => {
      const created = studyRoomService.createRoom({
        title: 'Phòng Lập Trình',
        hostUser
      });
      if (!created.success) return;
      const roomId = created.room.roomId;

      const updated = studyRoomService.updateRoom(roomId, hostUser, {
        passcode: '1234',
        roomGoal: 'Sprint Tính Năng WebRTC',
        roomCategory: 'tech',
        silentMode: true,
        maxParticipants: 4
      });

      expect(updated.success).toBe(true);
      expect(updated.room?.passcode).toBe('1234');
      expect(updated.room?.roomGoal).toBe('Sprint Tính Năng WebRTC');
      expect(updated.room?.roomCategory).toBe('tech');
      expect(updated.room?.silentMode).toBe(true);
      expect(updated.room?.maxParticipants).toBe(4);
    });

    it('Bảo vệ truy cập bằng mật khẩu PIN (Passcode Gate): Host vào tự do, Người khác phải đúng PIN', () => {
      const created = studyRoomService.createRoom({
        title: 'Phòng Riêng Tư Có Mật Khẩu',
        hostUser,
        passcode: '5678'
      });
      if (!created.success) return;
      const roomId = created.room.roomId;

      // 1. Host vào không cần mật khẩu
      const hostAccess = studyRoomService.verifyRoomAccess(roomId, hostUser);
      expect(hostAccess.allowed).toBe(true);
      if (hostAccess.allowed) {
        expect(hostAccess.role).toBe('host');
      }

      // 2. Member không nhập mật khẩu -> Bị chặn với mã PASSCODE_REQUIRED
      const noPinAccess = studyRoomService.verifyRoomAccess(roomId, memberUser);
      expect(noPinAccess.allowed).toBe(false);
      if (!noPinAccess.allowed) {
        expect(noPinAccess.code).toBe('PASSCODE_REQUIRED');
      }

      // 3. Member nhập sai mật khẩu -> Bị chặn
      const wrongPinAccess = studyRoomService.verifyRoomAccess(roomId, memberUser, null, '9999');
      expect(wrongPinAccess.allowed).toBe(false);
      if (!wrongPinAccess.allowed) {
        expect(wrongPinAccess.code).toBe('PASSCODE_REQUIRED');
      }

      // 4. Member nhập đúng mật khẩu -> Cho phép vào phòng!
      const correctPinAccess = studyRoomService.verifyRoomAccess(roomId, memberUser, null, '5678');
      expect(correctPinAccess.allowed).toBe(true);
    });

    it('Xác thực danh mục không gian (ROOM_CATEGORIES) hỗ trợ đầy đủ 6 thể loại', () => {
      expect(ROOM_CATEGORIES.length).toBe(6);
      const ids = ROOM_CATEGORIES.map((c) => c.id);
      expect(ids).toContain('tech');
      expect(ids).toContain('exam');
      expect(ids).toContain('lang');
      expect(ids).toContain('cafe');
      expect(ids).toContain('design');
      expect(ids).toContain('work');
    });
  });
});
