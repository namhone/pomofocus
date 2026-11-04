import { describe, it, expect, beforeEach, vi } from 'vitest';
import { studyRoomService } from '../../src/services/studyRoomService';
import { roomService, MASTER_ADMINS, isMasterAdmin, getRoomRole, canManageRoom } from '../../src/services/roomService';
import { useRoomStore } from '../../src/stores/useRoomStore';
import { UserProfile } from '../../src/services/authService';

describe('Room Governance, Anti-Squatting & Host Controls Specification', () => {
  const userA: UserProfile = {
    id: 'usr_owner_a',
    email: 'userA@gmail.com',
    displayName: 'Host User A',
    plan: 'pro',
    createdAt: Date.now()
  };

  const userB: UserProfile = {
    id: 'usr_guest_b',
    email: 'userB@gmail.com',
    displayName: 'Guest User B',
    plan: 'free',
    createdAt: Date.now()
  };

  const masterNam: UserProfile = {
    id: 'usr_master_nam',
    email: 'namho03052k9@gmail.com',
    displayName: 'Nam Hồ (Founder)',
    plan: 'lifetime',
    createdAt: Date.now()
  };

  const masterTran: UserProfile = {
    id: 'usr_master_tran',
    email: 'huyentrantt09@gmail.com',
    displayName: 'Huyền Trân (Nóc Nhà)',
    plan: 'lifetime',
    createdAt: Date.now()
  };

  beforeEach(() => {
    localStorage.clear();
    useRoomStore.getState().reset();
  });

  describe('1. Persistent & Reserved Room Slug (Định danh độc quyền & Anti-Squatting)', () => {
    it('Tài khoản A đăng ký slug "my-vip-room" thành công và sở hữu vĩnh viễn', () => {
      const res = studyRoomService.createRoom({
        title: 'Phòng VIP của A',
        slug: 'my-vip-room',
        hostUser: userA
      });

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.room.roomId).toBe('my-vip-room');
        expect(res.room.slug).toBe('my-vip-room');
        expect(res.room.owner_id).toBe(userA.id);
        expect(res.room.hostUserId).toBe(userA.id);
      }
    });

    it('Tài khoản B cố gắng tạo phòng trùng slug "my-vip-room" bị chặn với thông báo lỗi chuẩn', () => {
      // 1. A tạo trước
      studyRoomService.createRoom({
        title: 'Phòng VIP của A',
        slug: 'my-vip-room',
        hostUser: userA
      });

      // 2. B cố tình chiếm slug của A
      const resB = studyRoomService.createRoom({
        title: 'B Cố Tình Chiếm Link',
        slug: 'my-vip-room',
        hostUser: userB
      });

      expect(resB.success).toBe(false);
      if (!resB.success) {
        expect(resB.error).toBe('Tên phòng/Đường dẫn này đã được đăng ký bởi người dùng khác.');
      }
    });

    it('Chính chủ phòng A tạo lại hoặc cập nhật phòng "my-vip-room" của mình thì thành công', () => {
      studyRoomService.createRoom({
        title: 'Phòng VIP của A',
        slug: 'my-vip-room',
        hostUser: userA
      });

      // A cập nhật lại phòng độc quyền của mình
      const resA = studyRoomService.createRoom({
        title: 'Phòng VIP của A (Cập Nhật)',
        slug: 'my-vip-room',
        hostUser: userA
      });

      expect(resA.success).toBe(true);
      if (resA.success) {
        expect(resA.room.title).toBe('Phòng VIP của A (Cập Nhật)');
      }
    });
  });

  describe('2. Phân Cấp Quyền Hạn Trong Phòng Học (Master Admin > Host > Participant)', () => {
    it('Nhận diện chính xác 2 Master Admin tối cao: Nam Hồ và Huyền Trân', () => {
      expect(isMasterAdmin('namho03052k9@gmail.com')).toBe(true);
      expect(isMasterAdmin('huyentrantt09@gmail.com')).toBe(true);
      expect(isMasterAdmin('userA@gmail.com')).toBe(false);
      expect(MASTER_ADMINS).toContain('namho03052k9@gmail.com');
      expect(MASTER_ADMINS).toContain('huyentrantt09@gmail.com');
    });

    it('Người tạo phòng luôn giữ quyền Host vĩnh viễn, người khác vào trước không bao giờ cướp được Host', () => {
      const createRes = studyRoomService.createRoom({
        title: 'Phòng Học Nhóm của A',
        slug: 'group-study-a',
        hostUser: userA,
        allowFreeGuests: true
      });
      expect(createRes.success).toBe(true);
      const room = (createRes as any).room;

      // User B vào phòng của A
      const accessB = studyRoomService.verifyRoomAccess('group-study-a', userB);
      expect(accessB.allowed).toBe(true);
      if (accessB.allowed) {
        // B chỉ là guest, không được cấp Host
        expect(accessB.role).toBe('guest');
        expect(getRoomRole(userB, room)).toBe('participant');
        expect(canManageRoom(userB, room)).toBe(false);
      }

      // User A (Chủ phòng) vào lại sau khi reload
      const accessA = studyRoomService.verifyRoomAccess('group-study-a', userA);
      expect(accessA.allowed).toBe(true);
      if (accessA.allowed) {
        expect(accessA.role).toBe('host');
        expect(getRoomRole(userA, room)).toBe('host');
        expect(canManageRoom(userA, room)).toBe(true);
      }
    });

    it('Đặc quyền Master Admin Override: Nam Hồ và Huyền Trân vào bất kỳ phòng nào đều nắm quyền Host và bỏ qua mật khẩu PIN', () => {
      // User A tạo phòng riêng tư có đặt mật khẩu PIN
      const createRes = studyRoomService.createRoom({
        title: 'Phòng Kín của A',
        slug: 'private-a-room',
        hostUser: userA,
        passcode: '9999'
      });
      expect(createRes.success).toBe(true);
      const room = (createRes as any).room;

      // Người lạ B không nhập mật khẩu sẽ bị từ chối
      const accessB = studyRoomService.verifyRoomAccess('private-a-room', userB);
      expect(accessB.allowed).toBe(false);
      if (!accessB.allowed) {
        expect(accessB.code).toBe('PASSCODE_REQUIRED');
      }

      // Master Admin Nam Hồ vào mà không cần mật khẩu PIN -> Tự động kích hoạt Master Host Override
      const accessNam = studyRoomService.verifyRoomAccess('private-a-room', masterNam);
      expect(accessNam.allowed).toBe(true);
      if (accessNam.allowed) {
        expect(accessNam.role).toBe('host');
      }
      expect(getRoomRole(masterNam, room)).toBe('master_admin');
      expect(canManageRoom(masterNam, room)).toBe(true);

      // Master Admin Huyền Trân (Nóc Nhà) cũng được toàn quyền Override
      const accessTran = studyRoomService.verifyRoomAccess('private-a-room', masterTran);
      expect(accessTran.allowed).toBe(true);
      if (accessTran.allowed) {
        expect(accessTran.role).toBe('host');
      }
      expect(getRoomRole(masterTran, room)).toBe('master_admin');
      expect(canManageRoom(masterTran, room)).toBe(true);
    });
  });

  describe('3. Host Controls Panel, Realtime Signaling & State Store (useRoomStore)', () => {
    it('Chủ phòng cập nhật công tắc: Cho phép bật Mic (allow_mic = false) -> Khóa mic thành viên thường', async () => {
      const createRes = studyRoomService.createRoom({
        title: 'Phòng Thuyết Trình',
        slug: 'presentation-room',
        hostUser: userA
      });
      expect(createRes.success).toBe(true);

      // Host A tắt mic toàn phòng
      const updateRes = await roomService.updateRoomSettings('presentation-room', userA, {
        allow_mic: false
      });
      expect(updateRes.success).toBe(true);
      expect(updateRes.settings?.allow_mic).toBe(false);

      // Phòng được cập nhật
      const updatedRoom = studyRoomService.getRoom('presentation-room');
      expect(updatedRoom?.settings?.allow_mic).toBe(false);

      // useRoomStore của thành viên B phản ứng: mic bị khóa bởi Host
      useRoomStore.getState().initRoom(updatedRoom!, userB);
      expect(useRoomStore.getState().role).toBe('participant');
      expect(useRoomStore.getState().isMicLockedByHost).toBe(true);

      // Khi nhận broadcast FORCE_MUTE từ host
      const onForceMuteLocal = vi.fn();
      useRoomStore.getState().handleAdminAction(
        { action: 'FORCE_MUTE', targetId: 'all' },
        'peer_guest_b',
        userB.id,
        onForceMuteLocal
      );
      expect(onForceMuteLocal).toHaveBeenCalled();
      expect(useRoomStore.getState().adminNotice).toContain('bị Quản trị viên tắt Micro');
    });

    it('Chủ phòng cấm chia sẻ màn hình (allow_screen_share = false) -> Dừng stream và khóa nút share', async () => {
      const createRes = studyRoomService.createRoom({
        title: 'Phòng Tập Trung',
        slug: 'focus-no-share',
        hostUser: userA
      });
      const room = (createRes as any).room;

      // Cập nhật cấm chia sẻ màn hình
      await roomService.updateRoomSettings('focus-no-share', userA, {
        allow_screen_share: false
      });

      const updatedRoom = studyRoomService.getRoom('focus-no-share');
      expect(updatedRoom?.settings?.allow_screen_share).toBe(false);

      useRoomStore.getState().initRoom(updatedRoom!, userB);
      expect(useRoomStore.getState().isScreenShareLockedByHost).toBe(true);

      const onForceStopScreenShare = vi.fn();
      useRoomStore.getState().handleAdminAction(
        { action: 'FORCE_STOP_SCREEN_SHARE', targetId: 'all' },
        'peer_guest_b',
        userB.id,
        undefined,
        onForceStopScreenShare
      );
      expect(onForceStopScreenShare).toHaveBeenCalled();
    });

    it('Chủ phòng Khóa phòng (is_locked = true) -> Chặn người mới vào, nhưng cho phép Host & Master Admin vào', async () => {
      studyRoomService.createRoom({
        title: 'Phòng Họp Kín Đã Khóa',
        slug: 'locked-meeting-room',
        hostUser: userA
      });

      // Khóa phòng
      await roomService.updateRoomSettings('locked-meeting-room', userA, {
        is_locked: true
      });

      // Người ngoài B cố vào bị chặn vì phòng đã khóa
      const accessB = studyRoomService.verifyRoomAccess('locked-meeting-room', userB);
      expect(accessB.allowed).toBe(false);
      if (!accessB.allowed) {
        expect(accessB.code).toBe('ROOM_LOCKED');
        expect(accessB.message).toContain('bị khóa bởi Chủ phòng');
      }

      // Chủ phòng A vào lại vẫn được phép
      const accessA = studyRoomService.verifyRoomAccess('locked-meeting-room', userA);
      expect(accessA.allowed).toBe(true);

      // Master Admin Nam Hồ vào vẫn được phép (Master Override)
      const accessNam = studyRoomService.verifyRoomAccess('locked-meeting-room', masterNam);
      expect(accessNam.allowed).toBe(true);
    });

    it('Lệnh Kick: Người bị kick bị kích hoạt onKicked callback, nhưng Master Admin không bao giờ bị kick', () => {
      useRoomStore.getState().role = 'participant';
      const onKickedLocal = vi.fn();

      // Bị kick
      useRoomStore.getState().handleAdminAction(
        { action: 'KICK', targetId: 'peer_b' },
        'peer_b',
        userB.id,
        undefined,
        undefined,
        onKickedLocal
      );
      expect(onKickedLocal).toHaveBeenCalled();

      // Master Admin không thể bị kick
      useRoomStore.getState().role = 'master_admin';
      const onMasterKicked = vi.fn();
      useRoomStore.getState().handleAdminAction(
        { action: 'KICK', targetId: 'peer_nam' },
        'peer_nam',
        masterNam.id,
        undefined,
        undefined,
        onMasterKicked
      );
      expect(onMasterKicked).not.toHaveBeenCalled();
    });

    it('Xóa phòng vĩnh viễn: Chỉ Chủ phòng hoặc Master Admin mới xóa được, người khác xóa bị từ chối', () => {
      studyRoomService.createRoom({
        title: 'Phòng Chuẩn Bị Xóa',
        slug: 'room-to-delete',
        hostUser: userA
      });

      // B cố xóa phòng của A
      const deleteByB = studyRoomService.deleteRoom('room-to-delete', userB);
      expect(deleteByB.success).toBe(false);
      expect(deleteByB.error).toContain('Chỉ chủ phòng mới có quyền xóa');

      // Master Admin Nam Hồ có quyền xóa phòng khi có sự cố
      const deleteByNam = studyRoomService.deleteRoom('room-to-delete', masterNam);
      expect(deleteByNam.success).toBe(true);

      // Sau khi xóa, phòng không còn tồn tại
      const roomAfter = studyRoomService.getRoom('room-to-delete');
      expect(roomAfter).toBeNull();
    });
  });
});
