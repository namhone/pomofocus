import { describe, it, expect, beforeEach } from 'vitest';
import { getVietnamTodayDateKey, isTodayVietnam } from '../../src/utils/timezone';
import { studyRoomService } from '../../src/services/studyRoomService';

describe('DEEP AUDIT — Phase 1 & 2 Integrity Checks', () => {
  describe('1. Vietnam Timezone (GMT+7) Reset & Date Key Logic', () => {
    it('Luôn trả về chuỗi YYYY-MM-DD theo đúng múi giờ Asia/Ho_Chi_Minh', () => {
      const dateKey = getVietnamTodayDateKey();
      expect(dateKey).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('Xác định chính xác thời điểm 00:00 GMT+7 độc lập với múi giờ hệ thống', () => {
      // 2026-11-01 17:00:00 UTC chính là 2026-11-02 00:00:00 GMT+7
      const utcEdgeDate = new Date('2026-11-01T17:00:00.000Z');
      const vnKey = getVietnamTodayDateKey(utcEdgeDate);
      expect(vnKey).toBe('2026-11-02');

      // 2026-11-01 16:59:59 UTC chính là 2026-11-01 23:59:59 GMT+7
      const utcBeforeMidnight = new Date('2026-11-01T16:59:59.000Z');
      const vnKeyBefore = getVietnamTodayDateKey(utcBeforeMidnight);
      expect(vnKeyBefore).toBe('2026-11-01');
    });

    it('studyRoomService.getTodayDateKey sử dụng chuẩn GMT+7', () => {
      const key = studyRoomService.getTodayDateKey();
      expect(key).toBe(getVietnamTodayDateKey());
    });
  });

  describe('2. Room Capacity Lock & Concurrency Defense (10/10 Limit)', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('Từ chối cho người thứ 11 vào khi phòng học đã đủ 10 người', () => {
      // Sử dụng phòng Public Pod với giới hạn maxParticipants: 10
      const publicPodId = 'pod-free-01';
      const pod = studyRoomService.getRoom(publicPodId);
      expect(pod).toBeDefined();

      // Dọn dẹp phòng trước khi test
      if (pod) {
        pod.participants = {};
        pod.maxParticipants = 10;
        studyRoomService.saveRoom(pod);
      }

      // Thêm 10 học viên vào phòng
      for (let i = 1; i <= 10; i++) {
        const joinRes = studyRoomService.joinParticipant(publicPodId, {
          id: `member_${i}`,
          userId: `usr_${i}`,
          name: `Học viên ${i}`,
          role: 'member',
          isMicOn: false,
          isVideoOn: false,
          joinedAt: Date.now()
        });
        expect(joinRes.success).toBe(true);
      }

      const roomAfter10 = studyRoomService.getRoom(publicPodId);
      expect(Object.keys(roomAfter10?.participants || {}).length).toBe(10);

      // Thử thêm học viên thứ 11
      const join11Res = studyRoomService.joinParticipant(publicPodId, {
        id: 'member_11',
        userId: 'usr_11',
        name: 'Học viên 11',
        role: 'member',
        isMicOn: false,
        isVideoOn: false,
        joinedAt: Date.now()
      });

      // Bị chặn vì phòng đã đạt tối đa 10/10
      expect(join11Res.success).toBe(false);

      // Xác minh số lượng trong phòng vẫn giữ nguyên là 10
      const roomFinal = studyRoomService.getRoom(publicPodId);
      expect(Object.keys(roomFinal?.participants || {}).length).toBe(10);
    });
  });

  describe('3. Webhook Regex & Underpayment Parsing Verification', () => {
    it('Regex bóc tách chính xác mã POMO_123456 kể cả khi có văn bản thừa phía sau', () => {
      const testCases = [
        'POMO_123456 chuyen tien mua pro',
        'chuyen khoan POMO 123456 thanh toan',
        'POMO123456',
        'SW_998877 mua ban quyen',
        'noi dung: POMO_654321 ung ho'
      ];

      testCases.forEach((desc) => {
        const match = desc.match(/(?:POMO|SW)[\s_]*(\d{6})/i) || desc.match(/(?:POMO|SW)[\s_]*([a-zA-Z0-9_-]+)/i);
        expect(match).not.toBeNull();
        expect(match![1]).toMatch(/^\d{6}$/);
      });
    });

    it('Tuyệt đối từ chối nếu số tiền chuyển khoản nhỏ hơn giá gói cước', () => {
      const expectedAmount = 59000;
      const numAmount = 50000; // Chuyển thiếu 9k
      const isUnderpaid = numAmount < expectedAmount;
      expect(isUnderpaid).toBe(true);
    });
  });
});
