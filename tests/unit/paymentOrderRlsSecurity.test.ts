import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import createOrderHandler from '../../api/payment/create-order';
import checkStatusHandler from '../../api/payment/check-status';
import sepayWebhookHandler from '../../api/payment/sepay-webhook';

// Mock Response Helper matching Vercel Serverless / Express signatures
const createMockResponse = () => {
  const res: any = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: null as any,
    setHeader: vi.fn((key: string, value: string) => {
      res.headers[key.toLowerCase()] = value;
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

describe('Milestone M0: Payment Orders RLS Security & Serverless Verification', () => {
  const originalEnv = process.env;
  const TEST_SUPABASE_URL = 'https://mock-proj.supabase.co';
  const TEST_SERVICE_ROLE_KEY = 'mock_supabase_service_role_secret_key_2026';
  const TEST_ANON_KEY = 'mock_supabase_anon_public_key_2026';
  const TEST_SEPAY_KEY = 'sepay_sec_92404523f9215a05e352a2627cd9709b9aa233db';

  beforeEach(() => {
    vi.resetAllMocks();
    process.env = {
      ...originalEnv,
      SUPABASE_URL: TEST_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: TEST_SERVICE_ROLE_KEY,
      SUPABASE_ANON_KEY: TEST_ANON_KEY,
      VITE_SUPABASE_ANON_KEY: TEST_ANON_KEY,
      SEPAY_WEBHOOK_API_KEY: TEST_SEPAY_KEY,
      VITE_VIETQR_ACCOUNT_NO: 'AGBSPTJE34IA3A8SAAX',
      VITE_VIETQR_BANK_NAME: 'VPBank',
      VITE_VIETQR_ACCOUNT_NAME: 'HO NGOC BAO NAM'
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // ===========================================================================
  // 1. BUG-14 & Auth Gate Enforcement (create-order.ts)
  // ===========================================================================
  describe('1. BUG-14: Auth Gate Enforcement on create-order.ts', () => {
    it('rejects unauthenticated requests where userId is missing with 401', async () => {
      const req: any = {
        method: 'POST',
        body: { amount: 50000, creditsToAdd: 500 }
      };
      const res = createMockResponse();

      await createOrderHandler(req, res);

      expect(res.statusCode).toBe(401);
      expect(res.body.error).toBe('Yêu cầu đăng nhập tài khoản thật để tạo đơn hàng thanh toán');
    });

    it('rejects requests where userId is empty string or whitespace with 401', async () => {
      for (const emptyUser of ['', '   ', '\t', '\n']) {
        const req: any = {
          method: 'POST',
          body: { userId: emptyUser, amount: 50000 }
        };
        const res = createMockResponse();

        await createOrderHandler(req, res);

        expect(res.statusCode).toBe(401);
        expect(res.body.error).toBe('Yêu cầu đăng nhập tài khoản thật để tạo đơn hàng thanh toán');
      }
    });

    it('rejects guest users ("guest", "guest_user") with 401', async () => {
      for (const guestId of ['guest', 'guest_user']) {
        const req: any = {
          method: 'POST',
          body: { userId: guestId, amount: 50000 }
        };
        const res = createMockResponse();

        await createOrderHandler(req, res);

        expect(res.statusCode).toBe(401);
        expect(res.body.error).toBe('Yêu cầu đăng nhập tài khoản thật để tạo đơn hàng thanh toán');
      }
    });

    it('rejects nil UUID ("00000000-0000-0000-0000-000000000000") with 401', async () => {
      const req: any = {
        method: 'POST',
        body: { userId: '00000000-0000-0000-0000-000000000000', amount: 50000 }
      };
      const res = createMockResponse();

      await createOrderHandler(req, res);

      expect(res.statusCode).toBe(401);
      expect(res.body.error).toBe('Yêu cầu đăng nhập tài khoản thật để tạo đơn hàng thanh toán');
    });

    it('rejects non-string userId types (e.g. number, object, null) with 401', async () => {
      for (const invalidType of [12345, true, {}, [], null]) {
        const req: any = {
          method: 'POST',
          body: { userId: invalidType, amount: 50000 }
        };
        const res = createMockResponse();

        await createOrderHandler(req, res);

        expect(res.statusCode).toBe(401);
        expect(res.body.error).toBe('Yêu cầu đăng nhập tài khoản thật để tạo đơn hàng thanh toán');
      }
    });

    it('rejects invalid or non-positive amount (0, -10000, null, undefined) with 400', async () => {
      for (const invalidAmount of [0, -10000, null, undefined]) {
        const req: any = {
          method: 'POST',
          body: { userId: 'real-uuid-1234', amount: invalidAmount }
        };
        const res = createMockResponse();

        await createOrderHandler(req, res);

        expect(res.statusCode).toBe(400);
        expect(res.body.error).toBe('Số tiền nạp không hợp lệ');
      }
    });

    it('documents validation edge case: non-numeric string amounts (e.g. "abc") should be rejected with 400', async () => {
      const req: any = {
        method: 'POST',
        body: { userId: 'real-uuid-1234', amount: 'abc' }
      };
      const res = createMockResponse();

      await createOrderHandler(req, res);

      expect([200, 400, 500]).toContain(res.statusCode);
      expect(res.statusCode).toBe(400);
    });

    it('rejects non-POST HTTP methods with 405 Method Not Allowed', async () => {
      for (const method of ['GET', 'PUT', 'DELETE', 'PATCH']) {
        const req: any = {
          method,
          body: { userId: 'real-uuid-1234', amount: 50000 }
        };
        const res = createMockResponse();

        await createOrderHandler(req, res);

        expect(res.statusCode).toBe(405);
        expect(res.body.error).toBe('Method Not Allowed');
      }
    });

    it('handles OPTIONS preflight with 200 OK and CORS headers', async () => {
      const req: any = { method: 'OPTIONS' };
      const res = createMockResponse();

      await createOrderHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBe('*');
      expect(res.headers['access-control-allow-methods']).toContain('POST');
    });

    it('accepts valid authenticated userId and returns orderCode & VietQR URL', async () => {
      // Mock fetch so RPC succeeds
      const fetchMock = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('/rest/v1/rpc/get_or_create_payment_order')) {
          return {
            ok: true,
            json: async () => 'PF9K2A8'
          };
        }
        return { ok: false, status: 404, json: async () => ({}) };
      });
      global.fetch = fetchMock;

      const req: any = {
        method: 'POST',
        body: {
          userId: 'e61e687b-a19d-7db0-6644-8e50bdf7dd16',
          amount: 50000,
          creditsToAdd: 500,
          userEmail: 'user@pomofocus.vn'
        }
      };
      const res = createMockResponse();

      await createOrderHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.orderCode).toBe('PF9K2A8');
      expect(res.body.amount).toBe(50000);
      expect(res.body.creditsToAdd).toBe(500);
      expect(res.body.vietQrUrl).toContain('https://vietqr.app/img?');
      expect(res.body.vietQrUrl).toContain('acc=AGBSPTJE34IA3A8SAAX');
      expect(res.body.vietQrUrl).toContain('bank=VPBank');
      expect(res.body.vietQrUrl).toContain('des=PF9K2A8');
    });
  });

  // ===========================================================================
  // 2. Service Role & RPC Enforcement (create-order.ts)
  // ===========================================================================
  describe('2. Service Role & RPC Enforcement on create-order.ts', () => {
    it('uses SUPABASE_SERVICE_ROLE_KEY in authorization headers when calling RPC', async () => {
      let capturedHeaders: any = null;
      let capturedBody: any = null;

      const fetchMock = vi.fn().mockImplementation(async (url: string, opts?: any) => {
        if (url.includes('/rest/v1/rpc/get_or_create_payment_order')) {
          capturedHeaders = opts?.headers;
          capturedBody = JSON.parse(opts?.body || '{}');
          return {
            ok: true,
            json: async () => ({ order_code: 'PF8M2K9' })
          };
        }
        return { ok: false, status: 404, json: async () => ({}) };
      });
      global.fetch = fetchMock;

      const req: any = {
        method: 'POST',
        body: {
          userId: 'auth-user-uuid-888',
          amount: 20000,
          creditsToAdd: 200,
          userEmail: 'student@study.edu'
        }
      };
      const res = createMockResponse();

      await createOrderHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.orderCode).toBe('PF8M2K9');

      // Verify that Service Role Key was sent, NOT anon key
      expect(capturedHeaders['apikey']).toBe(TEST_SERVICE_ROLE_KEY);
      expect(capturedHeaders['Authorization']).toBe(`Bearer ${TEST_SERVICE_ROLE_KEY}`);

      // Verify parameters sent to RPC get_or_create_payment_order
      expect(capturedBody.p_user_id).toBe('auth-user-uuid-888');
      expect(capturedBody.p_amount).toBe(20000);
      expect(capturedBody.p_credits).toBe(200);
      expect(capturedBody.p_email).toBe('student@study.edu');
    });

    it('falls back to direct REST using SUPABASE_SERVICE_ROLE_KEY if RPC is unavailable', async () => {
      const restCalls: any[] = [];

      const fetchMock = vi.fn().mockImplementation(async (url: string, opts?: any) => {
        // RPC fails (e.g. 404 not found on older db schema)
        if (url.includes('/rest/v1/rpc/get_or_create_payment_order')) {
          return { ok: false, status: 404, text: async () => 'RPC not found' };
        }
        // Direct query existing pending order: returns empty
        if (url.includes('/rest/v1/payment_orders?') && (!opts || opts.method === 'GET' || !opts.method)) {
          restCalls.push({ type: 'GET', url, headers: opts?.headers });
          return { ok: true, json: async () => [] };
        }
        // Direct insert new order
        if (url.endsWith('/rest/v1/payment_orders') && opts?.method === 'POST') {
          restCalls.push({ type: 'POST', url, headers: opts?.headers, body: JSON.parse(opts.body) });
          return { ok: true, json: async () => ({}) };
        }
        return { ok: false, status: 404, text: async () => 'Not found' };
      });
      global.fetch = fetchMock;

      const req: any = {
        method: 'POST',
        body: {
          userId: 'auth-user-uuid-999',
          amount: 10000
        }
      };
      const res = createMockResponse();

      await createOrderHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.orderCode).toMatch(/^PF[2-9A-Z]{5}$/);

      // Verify fallback REST insert was executed with SUPABASE_SERVICE_ROLE_KEY
      expect(restCalls.length).toBeGreaterThanOrEqual(2);
      const postCall = restCalls.find(c => c.type === 'POST');
      expect(postCall).toBeDefined();
      expect(postCall.headers['apikey']).toBe(TEST_SERVICE_ROLE_KEY);
      expect(postCall.headers['Authorization']).toBe(`Bearer ${TEST_SERVICE_ROLE_KEY}`);
      expect(postCall.body.user_id).toBe('auth-user-uuid-999');
      expect(postCall.body.amount).toBe(10000);
      expect(postCall.body.status).toBe('pending');
    });

    it('fails fast with 500 when SUPABASE_SERVICE_ROLE_KEY is missing when SUPABASE_URL is configured', async () => {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      const req: any = {
        method: 'POST',
        body: {
          userId: 'auth-user-uuid-999',
          amount: 10000
        }
      };
      const res = createMockResponse();

      await createOrderHandler(req, res);

      expect(res.statusCode).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('SUPABASE_SERVICE_ROLE_KEY');
    });
  });

  // ===========================================================================
  // 3. Status Check Accuracy (check-status.ts)
  // ===========================================================================
  describe('3. Order Status Accuracy & Validation on check-status.ts', () => {
    it('returns isPaid = false and status = "pending" for unexpired active order', async () => {
      const futureDate = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('/payment_orders?order_code=eq.PF9K2A8')) {
          return {
            ok: true,
            json: async () => [
              {
                order_code: 'PF9K2A8',
                amount: 50000,
                credits_to_add: 500,
                status: 'pending',
                expires_at: futureDate,
                created_at: new Date().toISOString()
              }
            ]
          };
        }
        return { ok: false, json: async () => ({}) };
      });

      const req: any = { query: { orderCode: 'PF9K2A8' } };
      const res = createMockResponse();

      await checkStatusHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.isPaid).toBe(false);
      expect(res.body.order.status).toBe('pending');
      expect(res.body.order.remainingSeconds).toBeGreaterThan(0);
      expect(res.body.order.orderCode).toBe('PF9K2A8');
    });

    it('returns isPaid = false and status = "expired" when order has passed expires_at', async () => {
      const pastDate = new Date(Date.now() - 5 * 60 * 1000).toISOString();

      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('/payment_orders?order_code=eq.PFEXPIRED')) {
          return {
            ok: true,
            json: async () => [
              {
                order_code: 'PFEXPIRED',
                amount: 10000,
                credits_to_add: 100,
                status: 'pending',
                expires_at: pastDate,
                created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString()
              }
            ]
          };
        }
        return { ok: false, json: async () => ({}) };
      });

      const req: any = { query: { orderCode: 'PFEXPIRED' } };
      const res = createMockResponse();

      await checkStatusHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.isPaid).toBe(false);
      expect(res.body.order.status).toBe('expired');
      expect(res.body.order.remainingSeconds).toBe(0);
    });

    it('returns isPaid = true and status = "completed" when order is completed in payment_orders', async () => {
      const completedTime = new Date().toISOString();

      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('/payment_orders?order_code=eq.PFPAID1')) {
          return {
            ok: true,
            json: async () => [
              {
                order_code: 'PFPAID1',
                amount: 100000,
                credits_to_add: 1000,
                status: 'completed',
                completed_at: completedTime,
                expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString()
              }
            ]
          };
        }
        return { ok: false, json: async () => ({}) };
      });

      const req: any = { query: { orderCode: 'PFPAID1' } };
      const res = createMockResponse();

      await checkStatusHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.isPaid).toBe(true);
      expect(res.body.order.status).toBe('completed');
      expect(res.body.order.completedAt).toBe(completedTime);
    });

    it('falls back to payment_transactions for PRO / MoMo orders', async () => {
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        // Not in payment_orders
        if (url.includes('/payment_orders?order_code=eq.POMO_123456')) {
          return { ok: true, json: async () => [] };
        }
        // Found in payment_transactions
        if (url.includes('/payment_transactions?order_id=eq.POMO_123456')) {
          return {
            ok: true,
            json: async () => [
              {
                order_id: 'POMO_123456',
                amount: 59000,
                status: 'completed',
                plan_type: 'monthly',
                created_at: new Date().toISOString()
              }
            ]
          };
        }
        return { ok: false, json: async () => ({}) };
      });

      const req: any = { query: { orderCode: 'POMO_123456' } };
      const res = createMockResponse();

      await checkStatusHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.isPaid).toBe(true);
      expect(res.body.order.orderCode).toBe('POMO_123456');
      expect(res.body.order.planType).toBe('monthly');
    });

    it('returns isPaid = false and order = null when order does not exist in any table', async () => {
      global.fetch = vi.fn().mockImplementation(async () => {
        return { ok: true, json: async () => [] };
      });

      const req: any = { query: { orderCode: 'PFNONEXIST' } };
      const res = createMockResponse();

      await checkStatusHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.isPaid).toBe(false);
      expect(res.body.order).toBeNull();
    });

    it('queries order history for authenticated user but ignores guest users', async () => {
      const historyMock = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('/payment_orders?user_id=eq.valid_user_uuid')) {
          return {
            ok: true,
            json: async () => [
              {
                id: 'ord-1',
                order_code: 'PFHIST1',
                amount: 50000,
                credits_to_add: 500,
                status: 'completed',
                expires_at: new Date().toISOString()
              }
            ]
          };
        }
        return { ok: true, json: async () => [] };
      });
      global.fetch = historyMock;

      // 1. Authenticated user with history=true
      const reqAuth: any = { query: { userId: 'valid_user_uuid', history: 'true' } };
      const resAuth = createMockResponse();
      await checkStatusHandler(reqAuth, resAuth);

      expect(resAuth.statusCode).toBe(200);
      expect(resAuth.body.recentOrders).toBeDefined();
      expect(resAuth.body.recentOrders.length).toBe(1);
      expect(resAuth.body.recentOrders[0].orderCode).toBe('PFHIST1');

      // 2. Guest user with history=true -> should NOT query user history
      historyMock.mockClear();
      const reqGuest: any = { query: { userId: 'guest', history: 'true' } };
      const resGuest = createMockResponse();
      await checkStatusHandler(reqGuest, resGuest);

      const guestHistoryCalls = historyMock.mock.calls.filter((c: any[]) =>
        String(c[0]).includes('user_id=eq.guest')
      );
      expect(guestHistoryCalls.length).toBe(0);
    });

    it('uses SUPABASE_SERVICE_ROLE_KEY in query headers to bypass restrictive anon RLS', async () => {
      let capturedHeaders: any = null;
      global.fetch = vi.fn().mockImplementation(async (url: string, opts?: any) => {
        capturedHeaders = opts?.headers;
        return { ok: true, json: async () => [] };
      });

      const req: any = { query: { orderCode: 'PFSECURE1' } };
      const res = createMockResponse();

      await checkStatusHandler(req, res);

      expect(capturedHeaders['apikey']).toBe(TEST_SERVICE_ROLE_KEY);
      expect(capturedHeaders['Authorization']).toBe(`Bearer ${TEST_SERVICE_ROLE_KEY}`);
    });
  });

  // ===========================================================================
  // 4. SePay Webhook Verification & Processing (sepay-webhook.ts)
  // ===========================================================================
  describe('4. SePay Webhook Verification & Atomic Processing (sepay-webhook.ts)', () => {
    it('rejects requests with missing or invalid API key with 401 Unauthorized', async () => {
      const req: any = {
        method: 'POST',
        headers: { authorization: 'Apikey invalid_key_xxx' },
        body: { content: 'PF8M2K9', transferAmount: 10000, transferType: 'in' }
      };
      const res = createMockResponse();

      await sepayWebhookHandler(req, res);

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Unauthorized');
    });

    it('accepts authorization header in standard format: Authorization: Apikey <KEY>', async () => {
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('/rpc/process_payment_by_order')) {
          return {
            ok: true,
            json: async () => ({
              success: true,
              user_id: '550e8400-e29b-41d4-a716-446655440000',
              credits_added: 50,
              new_balance: 100
            })
          };
        }
        return { ok: false, json: async () => ({}) };
      });

      const req: any = {
        method: 'POST',
        headers: { authorization: `Apikey ${TEST_SEPAY_KEY}` },
        body: {
          gateway: 'VPBank',
          accountNumber: 'AGBSPTJE34IA3A8SAAX',
          content: 'Thanh toan don hang PF8M2K9',
          transferType: 'in',
          transferAmount: 10000,
          referenceCode: 'SEPAY_REF_12345'
        }
      };
      const res = createMockResponse();

      await sepayWebhookHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.orderCode).toBe('PF8M2K9');
      expect(res.body.credits_added).toBe(50);
      expect(res.body.new_balance).toBe(100);
    });

    it('safely skips outgoing money transfers (transferType !== "in")', async () => {
      const req: any = {
        method: 'POST',
        headers: { authorization: `Apikey ${TEST_SEPAY_KEY}` },
        body: {
          gateway: 'VPBank',
          content: 'Chuyen tien rut ve vi',
          transferType: 'out',
          transferAmount: 50000
        }
      };
      const res = createMockResponse();

      await sepayWebhookHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('transferType !== in');
    });

    it('rejects invalid or non-positive transferAmount with 400', async () => {
      const req: any = {
        method: 'POST',
        headers: { authorization: `Apikey ${TEST_SEPAY_KEY}` },
        body: {
          content: 'PF8M2K9',
          transferType: 'in',
          transferAmount: 0
        }
      };
      const res = createMockResponse();

      await sepayWebhookHandler(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('không hợp lệ');
    });

    it('guarantees idempotency when referenceCode was already completed in payment_transactions', async () => {
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('/payment_transactions?or=')) {
          return {
            ok: true,
            json: async () => [{ id: 'tx-done-1', status: 'completed' }]
          };
        }
        return { ok: false, json: async () => ({}) };
      });

      const req: any = {
        method: 'POST',
        headers: { authorization: `Apikey ${TEST_SEPAY_KEY}` },
        body: {
          content: 'PF8M2K9',
          transferType: 'in',
          transferAmount: 10000,
          referenceCode: 'SEPAY_ALREADY_DONE'
        }
      };
      const res = createMockResponse();

      await sepayWebhookHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.alreadyProcessed).toBe(true);
    });

    it('dispatches Base36 credit order (PFxxxxx) to RPC process_payment_by_order using SERVICE_ROLE_KEY', async () => {
      let capturedPayload: any = null;
      let capturedHeaders: any = null;

      global.fetch = vi.fn().mockImplementation(async (url: string, opts?: any) => {
        if (url.includes('/rpc/process_payment_by_order')) {
          capturedPayload = JSON.parse(opts?.body || '{}');
          capturedHeaders = opts?.headers;
          return {
            ok: true,
            json: async () => ({
              success: true,
              user_id: 'user-uuid-777',
              credits_added: 100,
              new_balance: 250
            })
          };
        }
        return { ok: false, json: async () => ({}) };
      });

      const req: any = {
        method: 'POST',
        headers: { authorization: `Apikey ${TEST_SEPAY_KEY}` },
        body: {
          gateway: 'VPBank',
          content: 'NAPAS GD 12345 ND PF7K3M2 NAPAS',
          transferType: 'in',
          transferAmount: 20000,
          referenceCode: 'FT20267788'
        }
      };
      const res = createMockResponse();

      await sepayWebhookHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.orderCode).toBe('PF7K3M2');
      expect(capturedPayload.p_order_code).toBe('PF7K3M2');
      expect(capturedPayload.p_transfer_amount).toBe(20000);
      expect(capturedPayload.p_gateway).toBe('SePay_VPBank');

      // Verify that RPC was called with SUPABASE_SERVICE_ROLE_KEY
      expect(capturedHeaders['apikey']).toBe(TEST_SERVICE_ROLE_KEY);
      expect(capturedHeaders['Authorization']).toBe(`Bearer ${TEST_SERVICE_ROLE_KEY}`);
    });

    it('records UNMATCHED_PENDING_MANUAL_REVIEW when transaction content has no valid order code', async () => {
      let loggedTx: any = null;

      global.fetch = vi.fn().mockImplementation(async (url: string, opts?: any) => {
        if (url.includes('/rest/v1/payment_transactions') && opts?.method === 'POST') {
          loggedTx = JSON.parse(opts.body);
          return { ok: true, json: async () => ({ id: 'unmatched-id' }) };
        }
        return { ok: true, json: async () => [] };
      });

      const req: any = {
        method: 'POST',
        headers: { authorization: `Apikey ${TEST_SEPAY_KEY}` },
        body: {
          gateway: 'VPBank',
          content: 'Nguyen Van A chuyen tien hoc phi',
          transferType: 'in',
          transferAmount: 50000,
          referenceCode: 'REF_NO_CODE_999'
        }
      };
      const res = createMockResponse();

      await sepayWebhookHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(false);
      expect(res.body.status).toBe('UNMATCHED_PENDING_MANUAL_REVIEW');
      expect(loggedTx).not.toBeNull();
      expect(loggedTx.status).toBe('UNMATCHED_PENDING_MANUAL_REVIEW');
      expect(loggedTx.amount).toBe(50000);
    });
    it('fails fast with 500 when SUPABASE_SERVICE_ROLE_KEY is missing when SUPABASE_URL is configured', async () => {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      const req: any = {
        method: 'POST',
        headers: { authorization: `Apikey ${TEST_SEPAY_KEY}` },
        body: {
          gateway: 'VPBank',
          content: 'NAPAS GD 12345 ND PF7K3M2',
          transferType: 'in',
          transferAmount: 20000,
          referenceCode: 'FT20267789'
        }
      };
      const res = createMockResponse();

      await sepayWebhookHandler(req, res);

      expect(res.statusCode).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('SUPABASE_SERVICE_ROLE_KEY');
    });
  });

  // ===========================================================================
  // 5. Database RLS Security Policy & SQL Migration Contract Verification
  // ===========================================================================
  describe('5. RLS Lockdown: Anonymous REST direct access is BLOCKED & SQL Invariants Verified', () => {
    const migrationFilePath = path.resolve(__dirname, '../../supabase/migrations/20261121_tighten_payment_rls.sql');
    const sqlContent = fs.readFileSync(migrationFilePath, 'utf-8');

    it('verifies SQL migration file exists and is readable on disk', () => {
      expect(fs.existsSync(migrationFilePath)).toBe(true);
      expect(sqlContent).toBeDefined();
      expect(sqlContent.length).toBeGreaterThan(100);
    });

    it('verifies ENABLE ROW LEVEL SECURITY is enforced on both payment_orders and payment_transactions', () => {
      // Must explicitly enable RLS on payment_orders table
      expect(sqlContent).toMatch(/ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?public\.payment_orders\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i);
      // Must explicitly enable RLS on payment_transactions table
      expect(sqlContent).toMatch(/ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?public\.payment_transactions\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i);
    });

    it('verifies DROP POLICY IF EXISTS removes open and permissive policies for anon on payment_orders', () => {
      // Must drop public insert policy on payment_orders
      expect(sqlContent).toContain('DROP POLICY IF EXISTS "Public can insert payment_orders"');
      // Must drop public update policy on payment_orders
      expect(sqlContent).toContain('DROP POLICY IF EXISTS "Public can update payment_orders"');
      // Must drop public read policy on payment_orders
      expect(sqlContent).toContain('DROP POLICY IF EXISTS "Public can read payment_orders"');
      // Must drop legacy open anon policies
      expect(sqlContent).toContain('DROP POLICY IF EXISTS "payment_orders_read_all"');
      expect(sqlContent).toContain('DROP POLICY IF EXISTS "payment_orders_anon_select"');
      expect(sqlContent).toContain('DROP POLICY IF EXISTS "payment_orders_anon_insert"');
      expect(sqlContent).toContain('DROP POLICY IF EXISTS "payment_orders_anon_update"');
    });

    it('verifies DROP POLICY IF EXISTS removes open and permissive policies on payment_transactions', () => {
      expect(sqlContent).toContain('DROP POLICY IF EXISTS "Public can read payment_transactions"');
      expect(sqlContent).toContain('DROP POLICY IF EXISTS "payment_transactions_read_all"');
      expect(sqlContent).toContain('DROP POLICY IF EXISTS "payment_transactions_anon_select"');
      expect(sqlContent).toContain('DROP POLICY IF EXISTS "payment_transactions_anon_insert"');
      expect(sqlContent).toContain('DROP POLICY IF EXISTS "payment_transactions_anon_update"');
    });

    it('verifies payment_orders_insert_own policy enforces auth.uid() ownership AND restricts initial status to pending', () => {
      // Match the full CREATE POLICY "payment_orders_insert_own" statement and its WITH CHECK clause
      const insertPolicyMatch = sqlContent.match(
        /CREATE\s+POLICY\s+"payment_orders_insert_own"[\s\S]*?WITH\s+CHECK\s*\(([\s\S]*?)\);/i
      );
      expect(insertPolicyMatch, 'payment_orders_insert_own policy must be defined').not.toBeNull();
      const checkCondition = insertPolicyMatch![1];

      // User must be authenticated owner
      expect(checkCondition).toContain('(select auth.uid())::text = user_id');

      // BUG-FIX: Must restrict status to pending/null to prevent authenticated status injection (e.g. self-creating completed orders)
      expect(checkCondition).toMatch(/\(status\s+IS\s+NULL\s+OR\s+status\s*=\s*'pending'\)/i);
    });

    it('verifies payment_orders does not expose any direct UPDATE policy to anon or authenticated users', () => {
      // Find all UPDATE policies on payment_orders
      const updatePolicies = sqlContent.match(
        /CREATE\s+POLICY\s+"[^"]+"\s+ON\s+public\.payment_orders\s+FOR\s+UPDATE\s+TO\s+([^\s;]+)/gi
      ) || [];

      // Neither anon nor authenticated may have direct UPDATE policy on payment_orders
      for (const stmt of updatePolicies) {
        expect(stmt).not.toMatch(/\banon\b/i);
        expect(stmt).not.toMatch(/\bauthenticated\b/i);
        expect(stmt).not.toMatch(/\bpublic\b/i);
      }

      // Only service_role can manage payment_orders
      expect(sqlContent).toMatch(
        /CREATE\s+POLICY\s+"payment_orders_service_role"\s+ON\s+public\.payment_orders\s+FOR\s+ALL\s+TO\s+service_role/i
      );
    });

    it('verifies payment_transactions only allows authenticated SELECT on own records, with ZERO insert/update/delete for users', () => {
      // SELECT restricted to own transactions
      expect(sqlContent).toMatch(
        /CREATE\s+POLICY\s+"payment_transactions_select_own"\s+ON\s+public\.payment_transactions\s+FOR\s+SELECT\s+TO\s+authenticated\s+USING\s+\(\(\s*select\s+auth\.uid\(\)\s*\)::text\s*=\s*user_id::text\)/i
      );

      // Authenticated users must NOT have direct INSERT/UPDATE/DELETE policies on financial transactions
      const userTxMutations = sqlContent.match(
        /CREATE\s+POLICY\s+"[^"]+"\s+ON\s+public\.payment_transactions\s+FOR\s+(?:INSERT|UPDATE|DELETE)\s+TO\s+(?:authenticated|anon|public)/gi
      );
      expect(userTxMutations).toBeNull();

      // Only service_role manages transactions
      expect(sqlContent).toMatch(
        /CREATE\s+POLICY\s+"payment_transactions_service_role"\s+ON\s+public\.payment_transactions\s+FOR\s+ALL\s+TO\s+service_role/i
      );
    });

    it('verifies GRANT EXECUTE on process_payment_by_order is granted ONLY to service_role and NEVER to anon', () => {
      // 1. Critical Security Invariant: process_payment_by_order MUST NOT be granted to anon anywhere in the SQL
      expect(sqlContent).not.toMatch(
        /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.process_payment_by_order[^(]*\([^)]*\)\s+TO[^\n;]*\banon\b/i
      );

      // 2. Critical Security Invariant: process_payment_by_order MUST NOT be granted to authenticated or public
      expect(sqlContent).not.toMatch(
        /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.process_payment_by_order[^(]*\([^)]*\)\s+TO[^\n;]*(?:authenticated|public)\b/i
      );

      // 3. Must have explicit REVOKE from public/anon
      expect(sqlContent).toMatch(
        /REVOKE\s+(?:EXECUTE\s+ON\s+FUNCTION|ALL\s+ON\s+FUNCTION)\s+public\.process_payment_by_order/i
      );

      // 4. Must specify service_role as the sole privileged role
      const grantLines = sqlContent
        .split('\n')
        .filter(line => /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.process_payment_by_order/i.test(line));

      expect(grantLines.length).toBeGreaterThan(0);
      for (const line of grantLines) {
        const match = line.match(/TO\s+([^;]+)/i);
        const targetRoles = match ? match[1].split(',').map(r => r.trim().toLowerCase()) : [];
        expect(targetRoles).toContain('service_role');
        expect(targetRoles).not.toContain('anon');
        expect(targetRoles).not.toContain('authenticated');
        expect(targetRoles).not.toContain('public');
      }
    });

    it('verifies Stored Procedure get_or_create_payment_order is NOT granted to anon', () => {
      // Unauthenticated users (anon) must not create payment orders
      expect(sqlContent).not.toMatch(
        /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.get_or_create_payment_order[^(]*\([^)]*\)\s+TO[^\n;]*\banon\b/i
      );

      // Must be granted only to authenticated and service_role
      const grantLines = sqlContent
        .split('\n')
        .filter(line => /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.get_or_create_payment_order/i.test(line));

      expect(grantLines.length).toBeGreaterThan(0);
      for (const line of grantLines) {
        const match = line.match(/TO\s+([^;]+)/i);
        const targetRoles = match ? match[1].split(',').map(r => r.trim().toLowerCase()) : [];
        expect(targetRoles).toContain('authenticated');
        expect(targetRoles).toContain('service_role');
        expect(targetRoles).not.toContain('anon');
        expect(targetRoles).not.toContain('public');
      }
    });

    it('verifies Stored Procedures are declared SECURITY DEFINER with fixed search_path to prevent search_path injection', () => {
      // get_or_create_payment_order must have SECURITY DEFINER and search_path = public, pg_temp
      expect(sqlContent).toMatch(
        /FUNCTION\s+public\.get_or_create_payment_order[\s\S]*?SECURITY\s+DEFINER\s+SET\s+search_path\s*=\s*public,\s*pg_temp/i
      );

      // process_payment_by_order must have SECURITY DEFINER and search_path = public, pg_temp
      expect(sqlContent).toMatch(
        /FUNCTION\s+public\.process_payment_by_order[\s\S]*?SECURITY\s+DEFINER\s+SET\s+search_path\s*=\s*public,\s*pg_temp/i
      );
    });
  });
});
