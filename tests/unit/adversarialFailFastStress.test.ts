import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import createOrderHandler from '../../api/payment/create-order';
import sepayWebhookHandler from '../../api/payment/sepay-webhook';

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

describe('Adversarial Fail-Fast & Privilege Guard Stress Tests', () => {
  const originalEnv = process.env;
  const TEST_SUPABASE_URL = 'https://mock-live-supabase.co';
  const TEST_ANON_KEY = 'mock_anon_public_key_cannot_bypass_rls';
  const TEST_SEPAY_KEY = 'sepay_secret_key_stress_test_2026';

  beforeEach(() => {
    vi.resetAllMocks();
    process.env = {
      ...originalEnv,
      SUPABASE_URL: TEST_SUPABASE_URL,
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

  describe('1. create-order.ts Fail-Fast on Missing Service Role Key', () => {
    const missingVariations = [
      { name: 'undefined', val: undefined },
      { name: 'empty string', val: '' },
      { name: 'whitespace only', val: '   \t  ' }
    ];

    for (const variation of missingVariations) {
      it(`fails fast with HTTP 500 when SUPABASE_SERVICE_ROLE_KEY is ${variation.name}`, async () => {
        if (variation.val === undefined) {
          delete process.env.SUPABASE_SERVICE_ROLE_KEY;
        } else {
          process.env.SUPABASE_SERVICE_ROLE_KEY = variation.val;
        }

        const fetchSpy = vi.fn();
        global.fetch = fetchSpy;

        const req: any = {
          method: 'POST',
          body: {
            userId: 'valid-authenticated-uuid-1111',
            amount: 50000,
            creditsToAdd: 500,
            userEmail: 'user@pomofocus.vn'
          }
        };
        const res = createMockResponse();

        await createOrderHandler(req, res);

        expect(res.statusCode).toBe(500);
        expect(res.body.success).toBe(false);
        expect(res.body.error).toContain('SUPABASE_SERVICE_ROLE_KEY');
        // Zero external fetch calls must be made — fails fast before any network/DB call
        expect(fetchSpy).not.toHaveBeenCalled();
      });
    }

    it('returns HTTP 500 when database persistence fails rather than returning unpersisted order', async () => {
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock_service_key';

      // Both RPC and REST fallback fail
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('/rest/v1/rpc/get_or_create_payment_order')) {
          return { ok: false, status: 503, text: async () => 'DB Unavailable' };
        }
        if (url.includes('/rest/v1/payment_orders')) {
          return { ok: false, status: 500, text: async () => 'Insert Failed' };
        }
        return { ok: false, status: 404 };
      });

      const req: any = {
        method: 'POST',
        body: {
          userId: 'valid-authenticated-uuid-2222',
          amount: 50000,
          creditsToAdd: 500
        }
      };
      const res = createMockResponse();

      await createOrderHandler(req, res);

      expect(res.statusCode).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Không thể tạo đơn hàng thanh toán trên cơ sở dữ liệu');
      expect(res.body.orderCode).toBeUndefined();
    });
  });

  describe('2. sepay-webhook.ts Fail-Fast on Missing Service Role Key', () => {
    const missingVariations = [
      { name: 'undefined', val: undefined },
      { name: 'empty string', val: '' },
      { name: 'whitespace only', val: '   \r\n  ' }
    ];

    for (const variation of missingVariations) {
      it(`fails fast with HTTP 500 and retryable: true when SUPABASE_SERVICE_ROLE_KEY is ${variation.name}`, async () => {
        if (variation.val === undefined) {
          delete process.env.SUPABASE_SERVICE_ROLE_KEY;
        } else {
          process.env.SUPABASE_SERVICE_ROLE_KEY = variation.val;
        }

        const fetchSpy = vi.fn();
        global.fetch = fetchSpy;

        const req: any = {
          method: 'POST',
          headers: { authorization: `Apikey ${TEST_SEPAY_KEY}` },
          body: {
            gateway: 'VPBank',
            content: 'Thanh toan don hang PF8M2K9',
            transferType: 'in',
            transferAmount: 20000,
            referenceCode: 'SEPAY_FAILFAST_TEST'
          }
        };
        const res = createMockResponse();

        await sepayWebhookHandler(req, res);

        expect(res.statusCode).toBe(500);
        expect(res.body.success).toBe(false);
        expect(res.body.retryable).toBe(true);
        expect(res.body.error).toContain('SUPABASE_SERVICE_ROLE_KEY');
        // Must fail fast before invoking RPC or idempotency checks
        expect(fetchSpy).not.toHaveBeenCalled();
      });
    }

    it('returns HTTP 500 with retryable: true when credit order processing fails in DB, preventing false completion', async () => {
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock_service_key';

      // Idempotency check returns empty; RPC and REST fallback fail
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('/payment_transactions?or=')) {
          return { ok: true, json: async () => [] };
        }
        if (url.includes('/rpc/process_payment_by_order')) {
          return { ok: false, status: 500, text: async () => 'Internal DB Error' };
        }
        if (url.includes('/payment_orders?order_code=')) {
          return { ok: false, status: 500, text: async () => 'DB Error' };
        }
        return { ok: false, status: 404 };
      });

      const req: any = {
        method: 'POST',
        headers: { authorization: `Apikey ${TEST_SEPAY_KEY}` },
        body: {
          gateway: 'VPBank',
          content: 'ND PF7K3M2 NAPAS',
          transferType: 'in',
          transferAmount: 20000,
          referenceCode: 'SEPAY_DB_FAIL_TEST'
        }
      };
      const res = createMockResponse();

      await sepayWebhookHandler(req, res);

      expect(res.statusCode).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.retryable).toBe(true);
      expect(res.body.error).toContain('Failed to process credit order in database');
    });
  });

  describe('3. Privilege Isolation: Anon Key is NEVER sent in Authorization headers', () => {
    it('verifies create-order.ts only sends SUPABASE_SERVICE_ROLE_KEY and never ANON_KEY to Supabase', async () => {
      const capturedAuthHeaders: string[] = [];

      process.env.SUPABASE_SERVICE_ROLE_KEY = 'SECRET_SERVICE_ROLE_KEY_ONLY';
      process.env.SUPABASE_ANON_KEY = 'PUBLIC_ANON_KEY_DO_NOT_USE';
      process.env.VITE_SUPABASE_ANON_KEY = 'PUBLIC_ANON_KEY_DO_NOT_USE';

      global.fetch = vi.fn().mockImplementation(async (_url: string, opts?: any) => {
        if (opts?.headers?.['apikey']) {
          capturedAuthHeaders.push(opts.headers['apikey']);
        }
        if (opts?.headers?.['Authorization']) {
          capturedAuthHeaders.push(opts.headers['Authorization']);
        }
        return {
          ok: true,
          json: async () => ({ order_code: 'PFTEST1' })
        };
      });

      const req: any = {
        method: 'POST',
        body: {
          userId: 'valid-authenticated-uuid-3333',
          amount: 50000
        }
      };
      const res = createMockResponse();

      await createOrderHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(capturedAuthHeaders.length).toBeGreaterThan(0);
      for (const header of capturedAuthHeaders) {
        expect(header).not.toContain('PUBLIC_ANON_KEY_DO_NOT_USE');
        expect(header).toContain('SECRET_SERVICE_ROLE_KEY_ONLY');
      }
    });

    it('verifies sepay-webhook.ts only sends SUPABASE_SERVICE_ROLE_KEY and never ANON_KEY to Supabase', async () => {
      const capturedAuthHeaders: string[] = [];

      process.env.SUPABASE_SERVICE_ROLE_KEY = 'SECRET_SERVICE_ROLE_KEY_ONLY';
      process.env.SUPABASE_ANON_KEY = 'PUBLIC_ANON_KEY_DO_NOT_USE';
      process.env.VITE_SUPABASE_ANON_KEY = 'PUBLIC_ANON_KEY_DO_NOT_USE';

      global.fetch = vi.fn().mockImplementation(async (_url: string, opts?: any) => {
        if (opts?.headers?.['apikey']) {
          capturedAuthHeaders.push(opts.headers['apikey']);
        }
        if (opts?.headers?.['Authorization']) {
          capturedAuthHeaders.push(opts.headers['Authorization']);
        }
        return {
          ok: true,
          json: async () => ({ success: true, user_id: 'user-1', credits_added: 50, new_balance: 100 })
        };
      });

      const req: any = {
        method: 'POST',
        headers: { authorization: `Apikey ${TEST_SEPAY_KEY}` },
        body: {
          gateway: 'VPBank',
          content: 'ND PF7K3M2 NAPAS',
          transferType: 'in',
          transferAmount: 20000,
          referenceCode: 'TEST_AUTH_ISOLATION'
        }
      };
      const res = createMockResponse();

      await sepayWebhookHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(capturedAuthHeaders.length).toBeGreaterThan(0);
      for (const header of capturedAuthHeaders) {
        expect(header).not.toContain('PUBLIC_ANON_KEY_DO_NOT_USE');
        expect(header).toContain('SECRET_SERVICE_ROLE_KEY_ONLY');
      }
    });
  });
});
