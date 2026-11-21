import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import vcbWebhookHandler from '../../api/payment/sepay-webhook';
import checkStatusHandler from '../../api/momo/check-status';
import createOrderHandler from '../../api/payment/create-order';
import createPaymentHandler from '../../api/momo/create-payment';
import paymentWebhookHandler from '../../api/payment/webhook';

// Mock Response helper
const createMockResponse = () => {
  const res: any = {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader: vi.fn((k: string, v: string) => {
      res.headers[k] = v;
      return res;
    }),
    status: vi.fn((code: number) => {
      res.statusCode = code;
      return res;
    }),
    json: vi.fn((data: any) => {
      res.body = data;
      return res;
    }),
    end: vi.fn(() => res)
  };
  return res;
};

describe('Payment & Billing Remediation Phase 1 (M1)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('1. BUG-21: VCB Webhook Fallback Removal & UNMATCHED_PENDING_MANUAL_REVIEW', () => {
    it('rejects request with 401 when POMO_VCB_SECRET_KEY is missing or invalid (no hardcoded fallback)', async () => {
      delete process.env.POMO_VCB_SECRET_KEY;
      delete process.env.VCB_WEBHOOK_SECRET;

      const req: any = {
        method: 'POST',
        headers: { 'x-vcb-secret': 'POMO_VCB_SECRET_KEY_2026' },
        body: { amount: 59000, description: 'POMO_123456' }
      };
      const res = createMockResponse();

      await vcbWebhookHandler(req, res);

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Unauthorized');
    });

    it('records UNMATCHED_PENDING_MANUAL_REVIEW and returns HTTP 200 without granting PRO when targetUserId is not found', async () => {
      process.env.POMO_VCB_SECRET_KEY = 'TEST_SECRET_2026';
      process.env.SUPABASE_URL = 'https://mock.supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock_service_key';

      // Mock fetch for Supabase calls:
      // 1. payment_transactions query: returns empty (order not pre-existing)
      // 2. check payment_transactions by order_id: returns empty
      // 3. insert into payment_transactions with UNMATCHED_PENDING_MANUAL_REVIEW
      const fetchMock = vi.fn().mockImplementation(async (url: string, options?: any) => {
        if (url.includes('/payment_transactions?or=')) {
          return {
            ok: true,
            json: async () => []
          };
        }
        if (url.includes('/payment_transactions?order_id=eq.')) {
          return {
            ok: true,
            json: async () => []
          };
        }
        if (url.endsWith('/payment_transactions') && options?.method === 'POST') {
          return {
            ok: true,
            json: async () => ({})
          };
        }
        // If it attempts to query user_entitlements (the old bug!), we track it
        if (url.includes('/user_entitlements')) {
          return {
            ok: true,
            json: async () => [{ user_id: 'random_victim_user' }]
          };
        }
        return { ok: false, status: 404, json: async () => ({}) };
      });
      global.fetch = fetchMock;

      const req: any = {
        method: 'POST',
        headers: { 'x-vcb-secret': 'TEST_SECRET_2026' },
        body: {
          amount: 468000,
          description: 'POMO_UNKNOWN_ORDER Chuyen tien mua Pro'
        }
      };
      const res = createMockResponse();

      await vcbWebhookHandler(req, res);

      // Verify HTTP 200 acknowledged
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('UNMATCHED_PENDING_MANUAL_REVIEW');
      expect(res.body.message).toContain('UNMATCHED_PENDING_MANUAL_REVIEW để đối soát thủ công');

      // Verify user_entitlements was NEVER queried to fallback to arbitrary user!
      const userEntitlementsCalls = fetchMock.mock.calls.filter((c: any[]) =>
        String(c[0]).includes('/user_entitlements')
      );
      expect(userEntitlementsCalls.length).toBe(0);

      // Verify POST to payment_transactions occurred with status 'UNMATCHED_PENDING_MANUAL_REVIEW'
      const insertCalls = fetchMock.mock.calls.filter(
        (c: any[]) => c[1]?.method === 'POST' && String(c[0]).endsWith('/payment_transactions')
      );
      expect(insertCalls.length).toBe(1);
      const insertedBody = JSON.parse(insertCalls[0][1].body);
      expect(insertedBody.status).toBe('UNMATCHED_PENDING_MANUAL_REVIEW');
      expect(insertedBody.user_id).toBeNull();
      expect(insertedBody.amount).toBe(468000);
    });
  });

  describe('2. BUG-22: Strict Order Completion Validation in check-status', () => {
    it('returns isPaid = false when order is pending, even if the user has active PRO', async () => {
      process.env.SUPABASE_URL = 'https://mock.supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock_key';

      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        // Query payment_transactions for orderId
        if (url.includes('/payment_transactions?order_id=eq.POMO_999999')) {
          return {
            ok: true,
            json: async () => [{ status: 'pending', amount: 59000 }]
          };
        }
        // Query user_entitlements for userId
        if (url.includes('/user_entitlements?user_id=eq.existing_pro_user')) {
          return {
            ok: true,
            json: async () => [{ is_pro: true, pro_expires_at: '2027-01-01T00:00:00Z' }]
          };
        }
        return { ok: false, json: async () => ({}) };
      });

      const req: any = {
        query: { orderId: 'POMO_999999', userId: 'existing_pro_user' }
      };
      const res = createMockResponse();

      await checkStatusHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.isPaid).toBe(false); // MUST be false! Not bypassed by isPro!
      expect(res.body.isPro).toBe(true);
      expect(res.body.proExpiresAt).toBe('2027-01-01T00:00:00Z');
    });

    it('returns isPaid = true only when payment_transactions status is completed or verified_paid', async () => {
      process.env.SUPABASE_URL = 'https://mock.supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock_key';

      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('/payment_transactions?order_id=eq.POMO_COMPLETED_123')) {
          return {
            ok: true,
            json: async () => [{ status: 'completed', amount: 799000 }]
          };
        }
        if (url.includes('/user_entitlements?user_id=eq.free_user')) {
          return {
            ok: true,
            json: async () => [{ is_pro: false, pro_expires_at: null }]
          };
        }
        return { ok: false, json: async () => ({}) };
      });

      const req: any = {
        query: { orderId: 'POMO_COMPLETED_123', userId: 'free_user' }
      };
      const res = createMockResponse();

      await checkStatusHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.isPaid).toBe(true);
      expect(res.body.isPro).toBe(false);
    });
  });

  describe('3. BUG-14: Order Creation APIs Reject Unauthenticated & Guest Users', () => {
    it('api/payment/create-order rejects missing userId with 401', async () => {
      const req: any = {
        method: 'POST',
        body: { amount: 50000, creditsToAdd: 500 }
      };
      const res = createMockResponse();

      await createOrderHandler(req, res);

      expect(res.statusCode).toBe(401);
      expect(res.body.error).toBe('Yêu cầu đăng nhập tài khoản thật để tạo đơn hàng thanh toán');
    });

    it('api/payment/create-order rejects guest_user or nil UUID with 401', async () => {
      for (const invalidUserId of ['guest', 'guest_user', '00000000-0000-0000-0000-000000000000', '   ']) {
        const req: any = {
          method: 'POST',
          body: { userId: invalidUserId, amount: 50000 }
        };
        const res = createMockResponse();

        await createOrderHandler(req, res);

        expect(res.statusCode).toBe(401);
        expect(res.body.error).toBe('Yêu cầu đăng nhập tài khoản thật để tạo đơn hàng thanh toán');
      }
    });

    it('api/momo/create-payment rejects missing or guest userId with 401', async () => {
      for (const invalidUserId of [undefined, 'guest', 'guest_user', '00000000-0000-0000-0000-000000000000']) {
        const req: any = {
          method: 'POST',
          body: { userId: invalidUserId, planId: '1_month' }
        };
        const res = createMockResponse();

        await createPaymentHandler(req, res);

        expect(res.statusCode).toBe(401);
        expect(res.body.error).toBe('Yêu cầu đăng nhập tài khoản thật để tạo đơn hàng thanh toán');
      }
    });

    it('api/payment/create-order accepts valid authenticated userId and returns VietQR details', async () => {
      delete process.env.SUPABASE_URL;
      delete process.env.VITE_SUPABASE_URL;
      const req: any = {
        method: 'POST',
        body: { userId: 'real_user_uuid_123', amount: 50000, creditsToAdd: 500 }
      };
      const res = createMockResponse();

      await createOrderHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.orderCode).toMatch(/^PF[2-9A-Z]{5}$/);
      expect(res.body.vietQrUrl).toMatch(/1066633885|AGBSPTJE34IA3A8SAAX/);
    });
  });

  describe('4. BUG-23: Secret Key Protection & Multi-Bank Regex Matching', () => {
    it('api/payment/webhook rejects request when POMO_VCB_SECRET_KEY is not configured or mismatched', async () => {
      delete process.env.POMO_VCB_SECRET_KEY;
      delete process.env.PAYMENT_WEBHOOK_SECRET;
      delete process.env.VCB_WEBHOOK_SECRET;

      const req: any = {
        method: 'POST',
        headers: { 'x-api-key': 'POMO_VCB_SECRET_KEY_2026' },
        body: { orderCode: 'PF9K2A8', amount: 59000 }
      };
      const res = createMockResponse();

      await paymentWebhookHandler(req, res);

      // Must be rejected (either 500 secret not configured or 401 Unauthorized)
      expect([401, 500]).toContain(res.statusCode);
      expect(res.statusCode).not.toBe(200);
    });

    it('multi-bank regex parses interbank transfer notes from MB, Techcombank, ACB, VPBank, TPBank, MoMo', () => {
      const parseOrderCode = (text: string) => {
        const base36Match = text.match(/(?:^|[^a-zA-Z0-9])(PF[2-9A-HJ-NP-Z]{5})(?:[^a-zA-Z0-9]|$)/i) ||
                             text.match(/(?:ND|GD|CT|NAPAS|MOMO|IB)?[:\s\\/._-]*(PF[2-9A-Z]{5})\b/i);
        const legacyMatch = text.match(/(?:POMO|SW)[\s_.-]*(\d{6})\b/i);
        const generalMatch = text.match(/(?:POMO|SW)[\s_.-]+([a-zA-Z0-9_-]+)/i);

        return base36Match
          ? (base36Match[1] || base36Match[0]).toUpperCase().trim()
          : legacyMatch
          ? `POMO_${legacyMatch[1]}`
          : generalMatch
          ? generalMatch[0].replace(/\s+/g, '_').toUpperCase()
          : null;
      };

      const parseAmount = (text: string) => {
        const amountMatch = text.match(/(?:\+)?([0-9]{1,3}(?:[.,][0-9]{3})+|[0-9]+)\s*(?:VND|VNĐ|đ|d)(?![a-zA-Z0-9])/i) ||
                            text.match(/(?:Số tiền|phát sinh|biến động|thay đổi)[:\s]+(?:\+)?([0-9]{1,3}(?:[.,][0-9]{3})+|[0-9]+)/i) ||
                            text.match(/Số tiền giao dịch:?\s*(?:\+)?([0-9.,]+)/i);
        if (!amountMatch) return 0;
        const raw = (amountMatch[1] || amountMatch[0]).replace(/[^0-9]/g, '');
        return parseInt(raw, 10);
      };

      const testCases = [
        {
          bank: 'MB Bank',
          text: 'MBVCB.123456.PF9K2A8.CT tu 0987 den 1066. So tien: +59,000 VND',
          expectedCode: 'PF9K2A8',
          expectedAmount: 59000
        },
        {
          bank: 'Techcombank',
          text: 'Techcombank IB; FT24123456789012\\POMO_123456\\ND chuyen tien +468.000 VND',
          expectedCode: 'POMO_123456',
          expectedAmount: 468000
        },
        {
          bank: 'TPBank',
          text: 'GD 123456-112233 19/11/26 ND: PF8M2K9 NAPAS +799,000 VNĐ',
          expectedCode: 'PF8M2K9',
          expectedAmount: 799000
        },
        {
          bank: 'MoMo',
          text: 'MOMO chuyen tien den HO NGOC BAO NAM. ND: PF2X4Y7. So tien: 59.000 đ',
          expectedCode: 'PF2X4Y7',
          expectedAmount: 59000
        },
        {
          bank: 'ACB',
          text: 'ACB;12345678;PF3M5T8;Chuyen khoan hoc tap. Bien dong: +59,000 d',
          expectedCode: 'PF3M5T8',
          expectedAmount: 59000
        },
        {
          bank: 'VPBank',
          text: 'VPB NHAN TIEN NAPAS TU 0912345678. ND: PF7H9K2. So tien GD: +468,000 VND',
          expectedCode: 'PF7H9K2',
          expectedAmount: 468000
        }
      ];

      for (const tc of testCases) {
        const code = parseOrderCode(tc.text);
        const amount = parseAmount(tc.text);
        expect(code, `Failed parsing code for ${tc.bank}`).toBe(tc.expectedCode);
        expect(amount, `Failed parsing amount for ${tc.bank}`).toBe(tc.expectedAmount);
      }
    });
  });
});
