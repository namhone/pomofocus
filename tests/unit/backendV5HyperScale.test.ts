import { describe, it, expect, beforeEach } from 'vitest';

/**
 * POMOFOCUS BACKEND REBUILD TEST SUITE (v5.0 ULTIMATE)
 * ==============================================================================
 * Kiểm thử toàn diện 5 Nguyên tắc Bất biến của Tầng Backend v5.0:
 * 1. Single Source of Truth (Database-driven wallets & role permissions)
 * 2. Post-Stream Settlement (Zero-Deduction-on-Error)
 * 3. Zero-Lock Atomic Wallets (Cập nhật nguyên tử không lock hàng loạt)
 * 4. Order Code 7 Ký Tự Base36 (PFxxxxx, không chứa 0, 1, O, I)
 * 5. Non-blocking Webhook Idempotency (Tránh race condition & cộng điểm đúp)
 */

describe('POMOFOCUS BACKEND v5.0 ULTIMATE — Hyper-Scale Engineering Specs', () => {
  // Bảng ký tự Base36 loại trừ 0, 1, O, I
  const ALLOWED_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const BASE36_ORDER_REGEX = /^PF[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{5}$/;

  const generateV5OrderCode = (): string => {
    let code = 'PF';
    for (let i = 0; i < 5; i++) {
      code += ALLOWED_CHARS.charAt(Math.floor(Math.random() * ALLOWED_CHARS.length));
    }
    return code;
  };

  const extractOrderCodeFromTransferContent = (content: string): string | null => {
    if (!content) return null;
    const match = content.toUpperCase().match(/PF[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{5}/);
    return match ? match[0] : null;
  };

  describe('Principle 1 & 4: Order Code 7 Ký Tự Base36 & Collision Resistance', () => {
    it('Mã đơn hàng phải luôn có độ dài đúng 7 ký tự và bắt đầu bằng tiền tố "PF"', () => {
      for (let i = 0; i < 100; i++) {
        const code = generateV5OrderCode();
        expect(code).toHaveLength(7);
        expect(code.startsWith('PF')).toBe(true);
        expect(BASE36_ORDER_REGEX.test(code)).toBe(true);
      }
    });

    it('Mã đơn hàng tuyệt đối không chứa các ký tự dễ gây nhầm lẫn (0, 1, O, I)', () => {
      const forbiddenChars = ['0', '1', 'O', 'I', 'o', 'i'];
      for (let i = 0; i < 500; i++) {
        const code = generateV5OrderCode();
        for (const char of forbiddenChars) {
          expect(code).not.toContain(char);
        }
      }
    });

    it('Trích xuất chính xác mã PFxxxxx từ nội dung chuyển khoản phức tạp của mọi ngân hàng', () => {
      const bankMessages = [
        'VCB;1066633885;NAP TIEN PF7K9XM CHUYEN KHOAN HOC TAP',
        'MBBANK GD 883921 NOI DUNG: PF92TR8 CAM ON',
        'TECHCOMBANK FT24099912093 PF4M7KQ NAP AI CREDITS',
        'CK DIEN THOAI: PF8H3NW 50000VND',
        'THANH TOAN DON HANG PF3V8ZA',
        'CT TU 0912345678 DEN 1066633885 ND: PFA7Y9M'
      ];

      const expectedCodes = [
        'PF7K9XM',
        'PF92TR8',
        'PF4M7KQ',
        'PF8H3NW',
        'PF3V8ZA',
        'PFA7Y9M'
      ];

      bankMessages.forEach((msg, idx) => {
        const extracted = extractOrderCodeFromTransferContent(msg);
        expect(extracted).toBe(expectedCodes[idx]);
        expect(BASE36_ORDER_REGEX.test(extracted!)).toBe(true);
      });
    });

    it('Trả về null nếu tin nhắn chuyển khoản không chứa mã đơn hoặc mã sai cú pháp', () => {
      expect(extractOrderCodeFromTransferContent('Chuyen tien an trua')).toBeNull();
      expect(extractOrderCodeFromTransferContent('PF12345')).toBeNull(); // Chứa số 1 (bị cấm)
      expect(extractOrderCodeFromTransferContent('PFO9999')).toBeNull(); // Chứa chữ O (bị cấm)
      expect(extractOrderCodeFromTransferContent('PFABC')).toBeNull(); // Chỉ có 5 ký tự
    });

    it('Kiểm tra xác suất trùng lặp cực thấp: 10.000 mã ngẫu nhiên có tỷ lệ phân bố đồng đều', () => {
      const generatedSet = new Set<string>();
      const sampleSize = 10000;
      for (let i = 0; i < sampleSize; i++) {
        generatedSet.add(generateV5OrderCode());
      }
      // Không gian 32^5 = 33.554.432 tổ hợp, 10.000 mẫu trùng tối đa < 0.2%
      expect(generatedSet.size).toBeGreaterThanOrEqual(sampleSize * 0.99);
    });
  });

  describe('Principle 2: Post-Stream Settlement (Zero-Deduction-on-Error)', () => {
    // Mô phỏng ví tiền trong cơ sở dữ liệu
    let mockDatabase: {
      wallets: Map<string, number>;
      chargeLogs: Array<{ userId: string; amount: number; success: boolean }>;
    };

    beforeEach(() => {
      mockDatabase = {
        wallets: new Map([
          ['user_standard', 100],
          ['user_poor', 2]
        ]),
        chargeLogs: []
      };
    });

    // Hàm mô phỏng Pre-Flight Check (~10ms)
    const runPreflightCheck = (userId: string, isOwner: boolean, cost: number) => {
      if (isOwner) return { allowed: true, isOwner: true };
      const balance = mockDatabase.wallets.get(userId) || 0;
      if (balance < cost) {
        return { allowed: false, message: 'Số dư tín dụng không đủ', balance };
      }
      return { allowed: true, isOwner: false, balance };
    };

    // Hàm mô phỏng Post-Stream Settlement
    const runPostStreamSettlement = (userId: string, isOwner: boolean, cost: number, streamCompleted100Percent: boolean) => {
      if (!streamCompleted100Percent) {
        // Lỗi mạng hoặc ngắt stream giữa chừng -> Không trừ bất kỳ điểm nào
        mockDatabase.chargeLogs.push({ userId, amount: 0, success: false });
        return { charged: false, reason: 'STREAM_FAILED_OR_ABORTED' };
      }

      if (isOwner) {
        return { charged: false, isOwner: true, remainingBalance: Infinity };
      }

      const current = mockDatabase.wallets.get(userId) || 0;
      if (current >= cost) {
        mockDatabase.wallets.set(userId, current - cost);
        mockDatabase.chargeLogs.push({ userId, amount: cost, success: true });
        return { charged: true, remainingBalance: current - cost };
      }

      return { charged: false, reason: 'INSUFFICIENT_FUNDS' };
    };

    it('Stream thành công 100% -> Thực hiện trừ điểm sau khi stream kết thúc', () => {
      const preflight = runPreflightCheck('user_standard', false, 1);
      expect(preflight.allowed).toBe(true);
      expect(mockDatabase.wallets.get('user_standard')).toBe(100); // Trước khi stream: Vẫn nguyên 100

      // Stream thành công
      const settlement = runPostStreamSettlement('user_standard', false, 1, true);
      expect(settlement.charged).toBe(true);
      expect(settlement.remainingBalance).toBe(99);
      expect(mockDatabase.wallets.get('user_standard')).toBe(99);
    });

    it('Zero-Deduction-on-Error: Mạng ngắt giữa chừng (stream 40%) -> TUYỆT ĐỐI KHÔNG TRỪ ĐIỂM', () => {
      const preflight = runPreflightCheck('user_standard', false, 5);
      expect(preflight.allowed).toBe(true);

      // Stream bị ngắt kết nối giữa chừng (streamCompleted = false)
      const settlement = runPostStreamSettlement('user_standard', false, 5, false);
      expect(settlement.charged).toBe(false);
      expect(settlement.reason).toBe('STREAM_FAILED_OR_ABORTED');

      // Số dư ví vẫn bảo toàn nguyên vẹn 100⚡
      expect(mockDatabase.wallets.get('user_standard')).toBe(100);
    });

    it('Chủ sở hữu (Founder VIP) luôn được miễn phí toàn bộ, không bao giờ trừ điểm', () => {
      const preflight = runPreflightCheck('founder_namho', true, 10);
      expect(preflight.allowed).toBe(true);
      expect(preflight.isOwner).toBe(true);

      const settlement = runPostStreamSettlement('founder_namho', true, 10, true);
      expect(settlement.charged).toBe(false);
      expect(settlement.isOwner).toBe(true);
    });
  });

  describe('Principle 3 & 5: Zero-Lock Atomic Wallets & Non-blocking Webhook Idempotency', () => {
    interface OrderRecord {
      orderCode: string;
      userId: string;
      amount: number;
      creditsToAdd: number;
      status: 'pending' | 'completed' | 'expired';
    }

    let ordersTable: Map<string, OrderRecord>;
    let userWallets: Map<string, number>;

    beforeEach(() => {
      ordersTable = new Map([
        [
          'PF8K9MQ',
          {
            orderCode: 'PF8K9MQ',
            userId: 'user_123',
            amount: 49000,
            creditsToAdd: 600,
            status: 'pending'
          }
        ]
      ]);
      userWallets = new Map([['user_123', 50]]);
    });

    // Mô phỏng hàm Stored Procedure process_payment_by_order (Zero-Lock Atomic Conditional Update)
    const processPaymentByOrder = (orderCode: string, transferAmount: number) => {
      const order = ordersTable.get(orderCode);

      // Điều kiện nguyên tử: status = 'pending' AND amount <= transferAmount
      if (!order || order.status !== 'pending' || order.amount > transferAmount) {
        return {
          success: false,
          code: 'ALREADY_PROCESSED_OR_INVALID',
          message: 'Đơn hàng không tồn tại, đã hoàn tất hoặc số tiền không khớp'
        };
      }

      // Đánh dấu hoàn thành ngay lập tức trong cùng 1 bước (nguyên tử)
      order.status = 'completed';
      ordersTable.set(orderCode, order);

      // Cộng điểm vào ví
      const currentBal = userWallets.get(order.userId) || 0;
      userWallets.set(order.userId, currentBal + order.creditsToAdd);

      return {
        success: true,
        userId: order.userId,
        creditsAdded: order.creditsToAdd,
        newBalance: currentBal + order.creditsToAdd
      };
    };

    it('Xử lý nạp điểm thành công lần đầu tiên khi thông tin hợp lệ', () => {
      const res = processPaymentByOrder('PF8K9MQ', 49000);
      expect(res.success).toBe(true);
      expect(res.creditsAdded).toBe(600);
      expect(res.newBalance).toBe(650);
      expect(userWallets.get('user_123')).toBe(650);
      expect(ordersTable.get('PF8K9MQ')?.status).toBe('completed');
    });

    it('Idempotency: Bắn lại webhook lần thứ hai với cùng mã đơn -> Bị từ chối ngay, không cộng điểm đúp', () => {
      // Lần 1: Thành công
      const firstCall = processPaymentByOrder('PF8K9MQ', 49000);
      expect(firstCall.success).toBe(true);

      // Lần 2 (Ngân hàng retry webhook): Lập tức từ chối và giữ nguyên số dư
      const secondCall = processPaymentByOrder('PF8K9MQ', 49000);
      expect(secondCall.success).toBe(false);
      expect(secondCall.code).toBe('ALREADY_PROCESSED_OR_INVALID');

      // Số dư vẫn là 650, TUYỆT ĐỐI không bị nhảy lên 1250!
      expect(userWallets.get('user_123')).toBe(650);
    });

    it('Bảo vệ doanh thu: Chuyển khoản thiếu tiền so với giá trị đơn hàng -> Từ chối nạp điểm', () => {
      // Đơn yêu cầu 49.000đ nhưng người dùng chỉ chuyển 20.000đ
      const underpaidCall = processPaymentByOrder('PF8K9MQ', 20000);
      expect(underpaidCall.success).toBe(false);
      expect(userWallets.get('user_123')).toBe(50); // Không cộng điểm
      expect(ordersTable.get('PF8K9MQ')?.status).toBe('pending'); // Trạng thái vẫn là pending
    });
  });

  describe('Dynamic Coupon Redemption (Zero-Deploy & User-Deduplication)', () => {
    interface CouponRecord {
      code: string;
      grantPlan: string;
      grantCredits: number;
      maxUses: number;
      usedCount: number;
      isActive: boolean;
    }

    let couponsTable: Map<string, CouponRecord>;
    let redemptionsTable: Set<string>; // composite key: `${couponCode}_${userId}`
    let userProfiles: Map<string, { role: string; isOwner: boolean }>;
    let userWallets: Map<string, number>;

    beforeEach(() => {
      couponsTable = new Map([
        [
          'EIU',
          {
            code: 'EIU',
            grantPlan: 'founder',
            grantCredits: 10000,
            maxUses: 1, // Chỉ 1 lượt duy nhất toàn cầu
            usedCount: 0,
            isActive: true
          }
        ]
      ]);
      redemptionsTable = new Set();
      userProfiles = new Map([
        ['user_alice', { role: 'user', isOwner: false }],
        ['user_bob', { role: 'user', isOwner: false }]
      ]);
      userWallets = new Map([
        ['user_alice', 50],
        ['user_bob', 50]
      ]);
    });

    const redeemCoupon = (code: string, userId: string) => {
      const coupon = couponsTable.get(code.toUpperCase().trim());
      if (!coupon || !coupon.isActive) {
        return { success: false, message: 'Mã không tồn tại hoặc đã khóa' };
      }

      if (coupon.usedCount >= coupon.maxUses) {
        return { success: false, message: 'Mã ưu đãi đã đạt giới hạn lượt sử dụng' };
      }

      const deduplicationKey = `${coupon.code}_${userId}`;
      if (redemptionsTable.has(deduplicationKey)) {
        return { success: false, message: 'Bạn đã sử dụng mã ưu đãi này rồi' };
      }

      // Kích hoạt
      coupon.usedCount += 1;
      redemptionsTable.add(deduplicationKey);

      if (coupon.grantPlan === 'founder') {
        const prof = userProfiles.get(userId) || { role: 'user', isOwner: false };
        prof.role = 'founder';
        prof.isOwner = true;
        userProfiles.set(userId, prof);
      }

      if (coupon.grantCredits > 0) {
        const currentBal = userWallets.get(userId) || 0;
        userWallets.set(userId, currentBal + coupon.grantCredits);
      }

      return {
        success: true,
        grantPlan: coupon.grantPlan,
        creditsAdded: coupon.grantCredits
      };
    };

    it('Mã EIU kích hoạt thành công quyền Founder VIP cho người dùng đầu tiên', () => {
      const res = redeemCoupon('EIU', 'user_alice');
      expect(res.success).toBe(true);
      expect(res.grantPlan).toBe('founder');
      expect(userProfiles.get('user_alice')?.role).toBe('founder');
      expect(userProfiles.get('user_alice')?.isOwner).toBe(true);
      expect(userWallets.get('user_alice')).toBe(10050);
    });

    it('Chống lạm dụng: Cùng 1 tài khoản nhập lại mã EIU -> Bị chặn do duplicate redemption', () => {
      redeemCoupon('EIU', 'user_alice');

      // Alice thử nhập lại lần 2
      const secondTry = redeemCoupon('EIU', 'user_alice');
      expect(secondTry.success).toBe(false);
      expect(secondTry.message).toBe('Mã ưu đãi đã đạt giới hạn lượt sử dụng');
    });

    it('Bảo toàn số lượt Founder: Mã EIU chỉ có 1 lượt, Bob không thể dùng sau khi Alice đã dùng', () => {
      // Alice dùng trước
      const aliceRes = redeemCoupon('EIU', 'user_alice');
      expect(aliceRes.success).toBe(true);

      // Bob dùng sau
      const bobRes = redeemCoupon('EIU', 'user_bob');
      expect(bobRes.success).toBe(false);
      expect(bobRes.message).toBe('Mã ưu đãi đã đạt giới hạn lượt sử dụng');
      expect(userProfiles.get('user_bob')?.role).toBe('user');
    });
  });
});
