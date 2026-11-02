import { describe, it, expect, beforeEach } from 'vitest';
import {
  authService,
  isLadyBoss,
  isVipFriend,
  isOwnerEmail,
  hasProEntitlement,
  getPlanLabel,
  UserProfile
} from '../../src/services/authService';
import { couponService } from '../../src/services/couponService';
import { studyRoomService } from '../../src/services/studyRoomService';
import { useAiStore } from '../../src/stores/useAiStore';

describe('VIP & Coupon & Room Limits Audit Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('1. VIP Entitlements (Nóc Nhà & Bạn Thân Sếp)', () => {
    it('nhận diện chính xác email Nóc Nhà huyentrantt09@gmail.com và Bạn Thân Sếp tony31082009@gmail.com', () => {
      expect(isLadyBoss('huyentrantt09@gmail.com')).toBe(true);
      expect(isLadyBoss('HUYENTRANTT09@GMAIL.COM')).toBe(true);
      expect(isLadyBoss('other@example.com')).toBe(false);

      expect(isVipFriend('tony31082009@gmail.com')).toBe(true);
      expect(isVipFriend('TONY31082009@GMAIL.COM')).toBe(true);
      expect(isVipFriend('other@example.com')).toBe(false);
    });

    it('tự động cấp quyền PRO vĩnh viễn cho Nóc Nhà và Bạn Thân Sếp', () => {
      expect(hasProEntitlement('free', 'huyentrantt09@gmail.com')).toBe(true);
      expect(hasProEntitlement('free', 'tony31082009@gmail.com')).toBe(true);
      expect(hasProEntitlement('free', 'namho03052k9@gmail.com')).toBe(true);
      expect(hasProEntitlement('free', 'student@example.com')).toBe(false);
    });

    it('hiển thị nhãn VIP độc quyền Vương Miện cho Nóc Nhà', () => {
      const ladyBossProfile: UserProfile = {
        id: 'usr_boss',
        email: 'huyentrantt09@gmail.com',
        displayName: 'Huyền Trần',
        plan: 'pro_lifetime',
        createdAt: Date.now()
      };
      expect(getPlanLabel(ladyBossProfile)).toBe('👑 NÓC NHÀ PRO');

      const vipFriendProfile: UserProfile = {
        id: 'usr_friend',
        email: 'tony31082009@gmail.com',
        displayName: 'Tony',
        plan: 'pro_lifetime',
        createdAt: Date.now()
      };
      expect(getPlanLabel(vipFriendProfile)).toBe('PRO TRỌN ĐỜI');
    });
  });

  describe('2. Coupon Management System (pomodoro_coupons_store)', () => {
    it('khởi tạo danh sách coupon mặc định khi kho trống', () => {
      const coupons = couponService.getCoupons();
      expect(coupons.length).toBeGreaterThanOrEqual(3);
      expect(coupons.some((c) => c.code === 'PRO50')).toBe(true);
      expect(coupons.some((c) => c.code === 'VIP7DAYS')).toBe(true);
      expect(coupons.some((c) => c.code === 'BOSSSECRET')).toBe(true);
    });

    it('cho phép Owner tạo coupon mới và ngăn chặn trùng mã', () => {
      const createRes = couponService.createCoupon({
        code: 'TESTNEW100',
        type: 'discount_percent',
        value: 100,
        maxUses: 10,
        description: 'Mã test giảm 100%'
      });
      expect(createRes.success).toBe(true);
      expect(createRes.coupon?.code).toBe('TESTNEW100');

      // Tạo trùng mã
      const dupRes = couponService.createCoupon({
        code: 'TESTNEW100',
        type: 'discount_percent',
        value: 50,
        maxUses: 5
      });
      expect(dupRes.success).toBe(false);
      expect(dupRes.error).toContain('đã tồn tại');
    });

    it('áp dụng mã coupon giảm giá và tăng số lượt sử dụng', () => {
      const user: UserProfile = {
        id: 'usr_buyer',
        email: 'buyer@example.com',
        displayName: 'Buyer',
        plan: 'free',
        createdAt: Date.now()
      };

      const redeemRes = couponService.redeemCoupon('PRO50', user);
      expect(redeemRes.success).toBe(true);
      expect(redeemRes.discountPercent).toBe(50);

      const updatedCoupons = couponService.getCoupons();
      const pro50 = updatedCoupons.find((c) => c.code === 'PRO50');
      expect(pro50?.usedCount).toBe(1);
    });

    it('áp dụng mã bí mật BOSSSECRET kích hoạt PRO Trọn đời', () => {
      const user: UserProfile = {
        id: 'usr_lucky',
        email: 'lucky@example.com',
        displayName: 'Lucky Student',
        plan: 'free',
        createdAt: Date.now()
      };

      const redeemRes = couponService.redeemCoupon('BOSSSECRET', user);
      expect(redeemRes.success).toBe(true);
      expect(redeemRes.message).toContain('PRO TRỌN ĐỜI');
    });

    it('chuẩn hóa mã coupon không phân biệt hoa thường và khoảng trắng (code.trim().toUpperCase())', () => {
      const user: UserProfile = {
        id: 'usr_test_case',
        email: 'student_test@example.com',
        displayName: 'Test Student',
        plan: 'free',
        createdAt: Date.now()
      };

      const val = couponService.validateCoupon('  vip7days  ');
      expect(val.valid).toBe(true);
      expect(val.coupon?.code).toBe('VIP7DAYS');

      const redeemRes = couponService.redeemCoupon('  pro50  ', user);
      expect(redeemRes.success).toBe(true);
      expect(redeemRes.discountPercent).toBe(50);
    });

    it('cơ chế cộng dồn (Stacking): tài khoản PRO còn hạn khi nhập mã PRO mới sẽ cộng tiếp vào hạn hiện tại', () => {
      const currentExpiry = Date.now() + 10 * 24 * 60 * 60 * 1000; // Còn 10 ngày
      const proUser: UserProfile = {
        id: 'usr_pro_stack',
        email: 'pro_stack@example.com',
        displayName: 'Pro User',
        plan: 'pro',
        proExpiresAt: currentExpiry,
        createdAt: Date.now()
      };
      localStorage.setItem('pomodoro_study_auth_session', JSON.stringify(proUser));

      // Nhập mã VIP7DAYS (7 ngày)
      const res = couponService.redeemCoupon('VIP7DAYS', proUser);
      expect(res.success).toBe(true);
      expect(res.message).toContain('+7 ngày PRO');

      const refreshed = authService.getCurrentSession();
      expect(refreshed?.proExpiresAt).toBeGreaterThanOrEqual(currentExpiry + 7 * 24 * 60 * 60 * 1000 - 1000);
    });

    it('tài khoản Trọn Đời (Lifetime Founder) khi nhập mã quà tặng PRO sẽ quy đổi thành tặng +5.000⚡ AI Credits', () => {
      const initialBalance = useAiStore.getState().aiCreditsBalance;

      const lifetimeUser: UserProfile = {
        id: 'usr_founder',
        email: 'founder@example.com',
        displayName: 'Founder VIP',
        plan: 'pro_lifetime',
        isLifetime: true,
        createdAt: Date.now()
      };

      const res = couponService.redeemCoupon('VIP7DAYS', lifetimeUser);
      expect(res.success).toBe(true);
      expect(res.message).toContain('+5.000⚡ AI Credits');
      expect(res.creditsAdded).toBe(5000);
      expect(useAiStore.getState().aiCreditsBalance).toBe(initialBalance + 5000);
    });
  });

  describe('3. Free Room Quota & Public Pod Limit', () => {
    it('cho phép tài khoản Free tạo tối đa 3 phòng Free/ngày và chặn ở lần thứ 4', () => {
      const freeUser: UserProfile = {
        id: 'usr_free_creator',
        email: 'free_creator@example.com',
        displayName: 'Free Creator',
        plan: 'free',
        createdAt: Date.now()
      };

      // Tạo phòng 1
      const res1 = studyRoomService.createRoom({ hostUser: freeUser, isFreeRoom: true });
      expect(res1.success).toBe(true);
      if (res1.success) {
        expect(res1.room.isFreeRoom).toBe(true);
        expect(res1.room.maxDurationMinutes).toBe(45);
      }

      // Tạo phòng 2
      const res2 = studyRoomService.createRoom({ hostUser: freeUser, isFreeRoom: true });
      expect(res2.success).toBe(true);

      // Tạo phòng 3
      const res3 = studyRoomService.createRoom({ hostUser: freeUser, isFreeRoom: true });
      expect(res3.success).toBe(true);

      // Tạo phòng 4: Bị từ chối
      const res4 = studyRoomService.createRoom({ hostUser: freeUser, isFreeRoom: true });
      expect(res4.success).toBe(false);
      if (!res4.success) {
        expect(res4.error).toContain('hết 3 lượt tạo phòng Free hôm nay');
      }
    });

    it('theo dõi tích lũy thời gian học Public Pod công cộng', () => {
      const userId = 'usr_guest_01';
      expect(studyRoomService.getDailyPublicStudyTime(userId)).toBe(0);

      studyRoomService.addDailyPublicStudyTime(userId, 1800); // 30 phút
      expect(studyRoomService.getDailyPublicStudyTime(userId)).toBe(1800);

      studyRoomService.addDailyPublicStudyTime(userId, 3600); // thêm 60 phút
      expect(studyRoomService.getDailyPublicStudyTime(userId)).toBe(5400); // 90 phút = 5400 giây (đạt quota)
    });

    it('dọn dẹp phiên zombie (purgeZombieSessions) xóa sạch người tham gia ảo', () => {
      const host: UserProfile = {
        id: 'usr_host',
        email: 'namho03052k9@gmail.com',
        displayName: 'Nam Ho',
        plan: 'pro_lifetime',
        createdAt: Date.now()
      };

      const created = studyRoomService.createRoom({ hostUser: host });
      expect(created.success).toBe(true);
      if (!created.success) return;

      // Giả lập thêm 3 người tham gia
      const room = studyRoomService.getRoom(created.room.roomId)!;
      room.participants = {
        p1: { id: 'p1', name: 'User 1', role: 'member', isMicOn: true, isVideoOn: true, joinedAt: Date.now() },
        p2: { id: 'p2', name: 'User 2', role: 'guest', isMicOn: false, isVideoOn: false, joinedAt: Date.now() }
      };
      studyRoomService.saveRoom(room);

      expect(Object.keys(studyRoomService.getRoom(room.roomId)!.participants).length).toBe(2);

      // Thực hiện Purge Zombie Sessions
      const purgeRes = studyRoomService.purgeZombieSessions(room.roomId);
      expect(purgeRes.purgedParticipants).toBe(2);

      const cleanedRoom = studyRoomService.getRoom(room.roomId)!;
      expect(Object.keys(cleanedRoom.participants).length).toBe(0);
    });
  });
});
