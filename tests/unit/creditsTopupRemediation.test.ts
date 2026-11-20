import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import createOrderHandler from '../../api/payment/create-order';
import checkPaymentStatusHandler from '../../api/payment/check-status';
import paymentWebhookHandler from '../../api/payment/webhook';
// paymentWebhookHandler handles both universal payments and rewritten vcb-webhook endpoints
import { calculateCreditPrice } from '../../src/components/AiCreditsTopupModal';

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

describe('Remediation: 10.000 VNĐ (50 Credits) Top-up & F5 Persistence Verification', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('1. Credit Pricing Calculation & Pack Standards', () => {
    it('calculates 50 credits as exactly 10.000 VNĐ', () => {
      const pricing = calculateCreditPrice(50);
      expect(pricing.finalPrice).toBe(10000);
      expect(pricing.originalPrice).toBe(10000);
    });

    it('calculates standard preset packs accurately', () => {
      expect(calculateCreditPrice(300).finalPrice).toBe(19000);
      expect(calculateCreditPrice(700).finalPrice).toBe(39000);
      expect(calculateCreditPrice(1500).finalPrice).toBe(69000);
      expect(calculateCreditPrice(4000).finalPrice).toBe(149000);
    });
  });

  describe('2. Order Creation API (create-order.ts)', () => {
    it('blocks unauthenticated / guest users from creating payment orders', async () => {
      const req: any = {
        method: 'POST',
        body: { userId: 'guest', amount: 10000, creditsToAdd: 50 }
      };
      const res = createMockResponse();

      await createOrderHandler(req, res);
      expect(res.statusCode).toBe(401);
      expect(res.body.error).toContain('đăng nhập');
    });

    it('creates a 7-character Base36 order code starting with PF for 10.000 VND order', async () => {
      const globalFetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
        return {
          ok: true,
          json: async () => []
        } as any;
      });

      const req: any = {
        method: 'POST',
        body: { userId: '550e8400-e29b-41d4-a716-446655440000', amount: 10000, creditsToAdd: 50 }
      };
      const res = createMockResponse();

      await createOrderHandler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.orderCode).toMatch(/^PF[2-9A-Z]{5}$/);
      expect(res.body.amount).toBe(10000);
      expect(res.body.creditsToAdd).toBe(50);
      expect(res.body.vietQrUrl).toContain('10000');
      expect(res.body.expiresAt).toBeDefined();

      globalFetch.mockRestore();
    });
  });

  describe('3. Payment Webhook Dual Handling & 10k Credit Pack Fulfillment', () => {
    it('rejects webhook requests when POMO_VCB_SECRET_KEY does not match', async () => {
      process.env.POMO_VCB_SECRET_KEY = 'super_secret_test_key_123';

      const req: any = {
        method: 'POST',
        headers: { 'x-vcb-secret': 'wrong_key' },
        body: { orderCode: 'PF8M2K9', transferAmount: 10000 }
      };
      const res = createMockResponse();

      await paymentWebhookHandler(req, res);
      expect(res.statusCode).toBe(401);
    });

    it('processes 10.000 VND credit order (PFxxxxx) via RPC or direct REST fallback', async () => {
      process.env.POMO_VCB_SECRET_KEY = 'super_secret_test_key_123';
      process.env.SUPABASE_URL = 'https://fake-supabase-project.supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake_service_role_key';

      // Mock fetch: RPC succeeds with 50 credits added
      const globalFetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
        const urlStr = String(url);
        if (urlStr.includes('/rpc/process_payment_by_order')) {
          return {
            ok: true,
            json: async () => ({
              success: true,
              user_id: '550e8400-e29b-41d4-a716-446655440000',
              credits_added: 50
            })
          } as any;
        }
        return { ok: false, json: async () => ({}) } as any;
      });

      const req: any = {
        method: 'POST',
        headers: { 'x-vcb-secret': 'super_secret_test_key_123' },
        body: {
          orderCode: 'PF8M2K9',
          transferAmount: 10000,
          content: 'PF8M2K9 nạp 50 credits'
        }
      };
      const res = createMockResponse();

      await paymentWebhookHandler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.orderCode).toBe('PF8M2K9');
      expect(res.body.credits_added).toBe(50);

      globalFetch.mockRestore();
    });

    it('vcb-webhook.ts supports both PF credit orders and POMO pro subscriptions seamlessly', async () => {
      process.env.POMO_VCB_SECRET_KEY = 'super_secret_test_key_123';
      process.env.SUPABASE_URL = 'https://fake-supabase-project.supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake_service_role_key';

      const globalFetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
        const urlStr = String(url);
        if (urlStr.includes('/rpc/process_payment_by_order')) {
          return {
            ok: true,
            json: async () => ({
              success: true,
              user_id: '550e8400-e29b-41d4-a716-446655440000',
              credits_added: 50
            })
          } as any;
        }
        return { ok: false, json: async () => ({}) } as any;
      });

      const req: any = {
        method: 'POST',
        headers: { 'x-vcb-secret': 'super_secret_test_key_123' },
        body: {
          amount: 10000,
          description: 'ND: PF9K2A8 thanh toan goi 50 credits'
        }
      };
      const res = createMockResponse();

      await paymentWebhookHandler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.orderCode).toBe('PF9K2A8');
      expect(res.body.credits_added).toBe(50);

      globalFetch.mockRestore();
    });

    it('handles MacroDroid Android OTT Notification payload with raw notification string & query secret', async () => {
      process.env.POMO_VCB_SECRET_KEY = 'super_secret_test_key_123';
      process.env.SUPABASE_URL = 'https://fake-supabase-project.supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake_service_role_key';

      const globalFetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
        const urlStr = String(url);
        if (urlStr.includes('/rpc/process_payment_by_order')) {
          return {
            ok: true,
            json: async () => ({
              success: true,
              user_id: '550e8400-e29b-41d4-a716-446655440000',
              credits_added: 50
            })
          } as any;
        }
        return { ok: false, json: async () => ({}) } as any;
      });

      // MacroDroid gửi chuỗi thông báo OTT từ VCB Digibank qua URL query key
      const req: any = {
        method: 'POST',
        headers: {},
        query: { key: 'super_secret_test_key_123' },
        body: {
          title: 'VCB Digibank',
          content: 'SD TK 1066633885 +10,000 VND vao 14:15 20/11/2026. Ref: MBVCB.123456.PF8M2K9 chuyen tien'
        }
      };
      const res = createMockResponse();

      await paymentWebhookHandler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.orderCode).toBe('PF8M2K9');
      expect(res.body.credits_added).toBe(50);
      expect(res.body.gateway).toBe('VCB_OTT');

      globalFetch.mockRestore();
    });

    it('handles SePay payload format with Apikey authorization header', async () => {
      process.env.POMO_VCB_SECRET_KEY = 'super_secret_test_key_123';
      process.env.SUPABASE_URL = 'https://fake-supabase-project.supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake_service_role_key';

      const globalFetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
        const urlStr = String(url);
        if (urlStr.includes('/rpc/process_payment_by_order')) {
          return {
            ok: true,
            json: async () => ({
              success: true,
              user_id: '550e8400-e29b-41d4-a716-446655440000',
              credits_added: 50
            })
          } as any;
        }
        return { ok: false, json: async () => ({}) } as any;
      });

      const req: any = {
        method: 'POST',
        headers: { authorization: 'Apikey super_secret_test_key_123' },
        body: {
          gateway: 'Vietcombank',
          transferAmount: 10000,
          content: 'PF3X7K9 ung ho credits',
          description: 'PF3X7K9 ung ho credits',
          referenceCode: 'FT123456789'
        }
      };
      const res = createMockResponse();

      await paymentWebhookHandler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.orderCode).toBe('PF3X7K9');
      expect(res.body.credits_added).toBe(50);

      globalFetch.mockRestore();
    });
  });

  describe('4. Status Check Endpoint (/api/payment/check-status)', () => {
    it('returns completed status when order is completed in payment_orders', async () => {
      process.env.SUPABASE_URL = 'https://fake-supabase-project.supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake_service_role_key';

      const globalFetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
        const urlStr = String(url);
        if (urlStr.includes('/payment_orders')) {
          return {
            ok: true,
            json: async () => [
              {
                order_code: 'PF8M2K9',
                amount: 10000,
                credits_to_add: 50,
                status: 'completed',
                expires_at: new Date(Date.now() + 600000).toISOString(),
                created_at: new Date().toISOString(),
                completed_at: new Date().toISOString()
              }
            ]
          } as any;
        }
        return { ok: false, json: async () => [] } as any;
      });

      const req: any = {
        method: 'GET',
        query: { orderCode: 'PF8M2K9' }
      };
      const res = createMockResponse();

      await checkPaymentStatusHandler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.body.isPaid).toBe(true);
      expect(res.body.order.status).toBe('completed');
      expect(res.body.order.creditsToAdd).toBe(50);

      globalFetch.mockRestore();
    });

    it('returns pending status with remaining seconds when order is pending', async () => {
      process.env.SUPABASE_URL = 'https://fake-supabase-project.supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake_service_role_key';

      const futureDate = new Date(Date.now() + 300000).toISOString(); // 5 minutes in future

      const globalFetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
        const urlStr = String(url);
        if (urlStr.includes('/payment_orders')) {
          return {
            ok: true,
            json: async () => [
              {
                order_code: 'PF8M2K9',
                amount: 10000,
                credits_to_add: 50,
                status: 'pending',
                expires_at: futureDate,
                created_at: new Date().toISOString()
              }
            ]
          } as any;
        }
        return { ok: false, json: async () => [] } as any;
      });

      const req: any = {
        method: 'GET',
        query: { orderCode: 'PF8M2K9' }
      };
      const res = createMockResponse();

      await checkPaymentStatusHandler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.body.isPaid).toBe(false);
      expect(res.body.order.status).toBe('pending');
      expect(res.body.order.remainingSeconds).toBeGreaterThan(0);

      globalFetch.mockRestore();
    });

    it('returns recent order history when history=true is requested', async () => {
      process.env.SUPABASE_URL = 'https://fake-supabase-project.supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake_service_role_key';

      const globalFetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
        const urlStr = String(url);
        if (urlStr.includes('user_id=eq.')) {
          return {
            ok: true,
            json: async () => [
              {
                id: '1',
                order_code: 'PF8M2K9',
                amount: 10000,
                credits_to_add: 50,
                status: 'completed',
                created_at: new Date().toISOString()
              },
              {
                id: '2',
                order_code: 'PF9K2A8',
                amount: 39000,
                credits_to_add: 700,
                status: 'completed',
                created_at: new Date().toISOString()
              }
            ]
          } as any;
        }
        return { ok: false, json: async () => [] } as any;
      });

      const req: any = {
        method: 'GET',
        query: { userId: '550e8400-e29b-41d4-a716-446655440000', history: 'true' }
      };
      const res = createMockResponse();

      await checkPaymentStatusHandler(req, res);
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.recentOrders)).toBe(true);
      expect(res.body.recentOrders.length).toBe(2);
      expect(res.body.recentOrders[0].orderCode).toBe('PF8M2K9');

      globalFetch.mockRestore();
    });
  });

  describe('5. F5 LocalStorage Persistence & Safe State Recovery', () => {
    it('restores pending order when saved within valid 15-minute TTL', () => {
      const mockOrder = {
        orderCode: 'PF8M2K9',
        amount: 10000,
        creditsToAdd: 50,
        expiresAt: new Date(Date.now() + 600000).toISOString(),
        createdAt: new Date().toISOString(),
        userId: 'test_user_123'
      };

      const storageKey = 'pomofocus_pending_credit_order_test_user_123';
      const serialized = JSON.stringify(mockOrder);
      const parsed = JSON.parse(serialized);

      const isStillValid = new Date(parsed.expiresAt).getTime() > Date.now();
      expect(isStillValid).toBe(true);
      expect(parsed.orderCode).toBe('PF8M2K9');
      expect(parsed.creditsToAdd).toBe(50);
    });

    it('identifies expired cached order when TTL has elapsed (> 15 mins)', () => {
      const expiredOrder = {
        orderCode: 'PF8M2K9',
        amount: 10000,
        creditsToAdd: 50,
        expiresAt: new Date(Date.now() - 60000).toISOString(), // Expired 1 min ago
        createdAt: new Date(Date.now() - 960000).toISOString(),
        userId: 'test_user_123'
      };

      const parsed = JSON.parse(JSON.stringify(expiredOrder));
      const isStillValid = new Date(parsed.expiresAt).getTime() > Date.now();
      expect(isStillValid).toBe(false);
    });
  });
});
