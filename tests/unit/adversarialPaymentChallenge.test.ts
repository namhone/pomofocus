import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import createOrderHandler from '../../api/payment/create-order';
import checkStatusHandler from '../../api/payment/check-status';
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

describe('Adversarial Verification: Serverless Payment Endpoints Input & Replay Resistance', () => {
  const originalEnv = process.env;
  const TEST_SUPABASE_URL = 'https://mock-proj.supabase.co';
  const TEST_SERVICE_ROLE_KEY = 'mock_service_role_key_2026';
  const TEST_SEPAY_KEY = 'sepay_secret_key_adversarial_test';

  beforeEach(() => {
    vi.resetAllMocks();
    process.env = {
      ...originalEnv,
      SUPABASE_URL: TEST_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: TEST_SERVICE_ROLE_KEY,
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
  // 1. ADVERSARIAL CHALLENGE: AMOUNT INJECTION & MALFORMED INPUTS
  // ===========================================================================
  describe('Adversarial Challenge 1: Malformed & Injected Amounts', () => {
    const maliciousAmounts = [
      '10000; DROP TABLE payment_orders;--',
      '10000 UNION SELECT * FROM users',
      '10000 OR 1=1',
      'NaN',
      'undefined',
      'null',
      '-1',
      '-50000',
      '0',
      0,
      -10000,
      '   ',
      'abc',
      '10000abc',
      '$10000'
    ];

    for (const badAmount of maliciousAmounts) {
      it(`create-order.ts rejects malicious/invalid amount: ${JSON.stringify(badAmount)} with 400`, async () => {
        global.fetch = vi.fn().mockImplementation(async () => ({ ok: false, status: 500 }));
        const req: any = {
          method: 'POST',
          body: {
            userId: 'valid-user-uuid-1234',
            amount: badAmount
          }
        };
        const res = createMockResponse();

        await createOrderHandler(req, res);

        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual({ error: 'Số tiền nạp không hợp lệ' });
      });
    }

    it('documents nuance: JavaScript Number("0x10") parses hex into 16, bypassing isNaN and <= 0 check', async () => {
      global.fetch = vi.fn().mockImplementation(async () => ({
        ok: true,
        json: async () => 'PFHEX01'
      }));
      const req: any = {
        method: 'POST',
        body: {
          userId: 'valid-user-uuid-1234',
          amount: '0x10'
        }
      };
      const res = createMockResponse();

      await createOrderHandler(req, res);

      // In JS, Number("0x10") is 16. So it treated 0x10 as 16 VND!
      expect(res.statusCode).toBe(200);
      expect(res.body.amount).toBe(16);
    });

    it('sepay-webhook.ts rejects zero or unparseable transferAmount (0, "0", "abc", "NaN") with 400', async () => {
      for (const badAmount of [0, '0', 'abc', 'NaN']) {
        const req: any = {
          method: 'POST',
          headers: { authorization: `Apikey ${TEST_SEPAY_KEY}` },
          body: {
            content: 'PF8M2K9',
            transferType: 'in',
            transferAmount: badAmount
          }
        };
        const res = createMockResponse();

        await sepayWebhookHandler(req, res);

        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.error).toContain('không hợp lệ');
      }
    });

    it('documents failure mode: sepay-webhook.ts strips minus sign via /[^0-9]/g on negative amounts (-1000, "-50000")', async () => {
      // Because sepay-webhook.ts uses replace(/[^0-9]/g, ''), negative sign '-' is removed!
      // This converts negative numbers into positive integers!
      let capturedPayload: any = null;
      global.fetch = vi.fn().mockImplementation(async (url: string, opts?: any) => {
        if (url.includes('/rpc/process_payment_by_order')) {
          capturedPayload = JSON.parse(opts?.body || '{}');
          return {
            ok: true,
            json: async () => ({ success: true, user_id: 'user-1', credits_added: 50, new_balance: 100 })
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
          transferAmount: -50000,
          referenceCode: 'NEG_AMOUNT_TEST'
        }
      };
      const res = createMockResponse();

      await sepayWebhookHandler(req, res);

      // Demonstrates that -50000 was converted to +50000
      expect(capturedPayload.p_transfer_amount).toBe(50000);
    });

    it('sepay-webhook.ts strips SQL injection characters from transferAmount and parses numeric digits safely', async () => {
      let capturedPayload: any = null;
      global.fetch = vi.fn().mockImplementation(async (url: string, opts?: any) => {
        if (url.includes('/rpc/process_payment_by_order')) {
          capturedPayload = JSON.parse(opts?.body || '{}');
          return {
            ok: true,
            json: async () => ({ success: true, user_id: 'user-1', credits_added: 50, new_balance: 100 })
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
          transferAmount: '10000; DROP TABLE payment_orders;--',
          referenceCode: 'SEC_TEST_REF_1'
        }
      };
      const res = createMockResponse();

      await sepayWebhookHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      // Digits '10000' extracted safely; no SQL injection payload passed
      expect(capturedPayload.p_transfer_amount).toBe(10000);
    });
  });

  // ===========================================================================
  // 2. ADVERSARIAL CHALLENGE: MALFORMED & UNAUTHENTICATED USER IDS
  // ===========================================================================
  describe('Adversarial Challenge 2: Malformed, Whitespace & Sentinel User IDs', () => {
    const maliciousUserIds = [
      '',
      '   ',
      '\t\r\n',
      'guest',
      'GUEST',
      '  guest  ',
      'guest_user',
      'GUEST_USER',
      'anonymous',
      'ANONYMOUS',
      'null',
      'NULL',
      'undefined',
      'UNDEFINED',
      '00000000-0000-0000-0000-000000000000',
      '  00000000-0000-0000-0000-000000000000  ',
      null,
      undefined,
      12345,
      false,
      true,
      {},
      [],
      ['guest']
    ];

    for (const badUser of maliciousUserIds) {
      it(`create-order.ts rejects unauthenticated / sentinel userId: ${JSON.stringify(badUser)} with 401`, async () => {
        const req: any = {
          method: 'POST',
          body: {
            userId: badUser,
            amount: 50000
          }
        };
        const res = createMockResponse();

        await createOrderHandler(req, res);

        expect(res.statusCode).toBe(401);
        expect(res.body.error).toBe('Yêu cầu đăng nhập tài khoản thật để tạo đơn hàng thanh toán');
      });
    }

    it('check-status.ts sanitizes guest and nil UUIDs so cleanUserId becomes null', async () => {
      let queriedUrl = '';
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        queriedUrl = url;
        return { ok: true, json: async () => [] };
      });

      for (const sentinelUser of ['guest', '  guest  ', 'guest_user', '00000000-0000-0000-0000-000000000000', '   ', '']) {
        const req: any = {
          query: {
            orderCode: 'PF9K2A8',
            userId: sentinelUser,
            history: 'true'
          }
        };
        const res = createMockResponse();

        await checkStatusHandler(req, res);

        // Never queries user_id history with sentinel/guest values
        expect(queriedUrl).not.toContain(`user_id=eq.${sentinelUser.trim()}`);
      }
    });
  });

  // ===========================================================================
  // 3. ADVERSARIAL CHALLENGE: CROSS-USER POLLING & IDOR PROTECTION
  // ===========================================================================
  describe('Adversarial Challenge 3: Cross-User Polling & IDOR Isolation in check-status.ts', () => {
    it('returns HTTP 403 Forbidden when User B polls an order created by User A', async () => {
      const orderA = {
        order_code: 'PFVICTIM',
        user_id: 'user_a_legitimate_uuid',
        user_email: 'user_a@pomofocus.vn',
        amount: 100000,
        credits_to_add: 1000,
        status: 'pending',
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
      };

      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('/payment_orders?order_code=eq.PFVICTIM')) {
          return { ok: true, json: async () => [orderA] };
        }
        return { ok: false, json: async () => ({}) };
      });

      // User B attempts to probe User A's order status using their own userId
      const req: any = {
        query: {
          orderCode: 'PFVICTIM',
          userId: 'user_b_attacker_uuid'
        }
      };
      const res = createMockResponse();

      await checkStatusHandler(req, res);

      // Must be rejected with 403 Forbidden
      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.status).toBe('forbidden');
      expect(res.body.error).toContain('Đơn hàng không thuộc về tài khoản người dùng được yêu cầu');
      expect(res.body.order).toBeUndefined(); // Zero order details leaked
    });

    it('returns HTTP 403 Forbidden when User B polls a MoMo/PRO transaction created by User A', async () => {
      const txA = {
        order_id: 'POMO_654321',
        user_id: 'user_a_legitimate_uuid',
        amount: 468000,
        status: 'completed',
        plan_type: 'yearly'
      };

      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('/payment_orders?order_code=eq.POMO_654321')) {
          return { ok: true, json: async () => [] };
        }
        if (url.includes('/payment_transactions?order_id=eq.POMO_654321')) {
          return { ok: true, json: async () => [txA] };
        }
        return { ok: false, json: async () => ({}) };
      });

      // User B attempts to access transaction POMO_654321
      const req: any = {
        query: {
          orderCode: 'POMO_654321',
          userId: 'user_b_attacker_uuid'
        }
      };
      const res = createMockResponse();

      await checkStatusHandler(req, res);

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.status).toBe('forbidden');
      expect(res.body.error).toContain('Giao dịch không thuộc về tài khoản người dùng được yêu cầu');
    });

    it('allows legitimate owner User A to poll their own order successfully', async () => {
      const orderA = {
        order_code: 'PFMINE1',
        user_id: 'user_a_legitimate_uuid',
        user_email: 'user_a@pomofocus.vn',
        amount: 50000,
        credits_to_add: 500,
        status: 'pending',
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString()
      };

      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('/payment_orders?order_code=eq.PFMINE1')) {
          return { ok: true, json: async () => [orderA] };
        }
        return { ok: false, json: async () => ({}) };
      });

      // User A queries their own order
      const req: any = {
        query: {
          orderCode: 'PFMINE1',
          userId: 'user_a_legitimate_uuid'
        }
      };
      const res = createMockResponse();

      await checkStatusHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.order.orderCode).toBe('PFMINE1');
      expect(res.body.order.amount).toBe(50000);
    });

    it('matches ownership when userEmail was stored and matches queried user email', async () => {
      const orderA = {
        order_code: 'PFEMAIL1',
        user_id: 'usr_g_oauth_google_123',
        user_email: 'learner@gmail.com',
        amount: 20000,
        credits_to_add: 200,
        status: 'pending',
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
      };

      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('/payment_orders?order_code=eq.PFEMAIL1')) {
          return { ok: true, json: async () => [orderA] };
        }
        return { ok: false, json: async () => ({}) };
      });

      // User queries with their email
      const req: any = {
        query: {
          orderCode: 'PFEMAIL1',
          userId: 'learner@gmail.com'
        }
      };
      const res = createMockResponse();

      await checkStatusHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.order.orderCode).toBe('PFEMAIL1');
    });
  });

  // ===========================================================================
  // 4. ADVERSARIAL CHALLENGE: WEBHOOK REPLAY & IDEMPOTENCY ATTACKS
  // ===========================================================================
  describe('Adversarial Challenge 4: Webhook Replay & Duplicate Injection Resistance', () => {
    it('defends against duplicate webhook replays with same referenceCode (Early Idempotency Gate)', async () => {
      let rpcCallCount = 0;
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        // payment_transactions check finds existing completed transaction
        if (url.includes('/payment_transactions?or=')) {
          return {
            ok: true,
            json: async () => [
              {
                id: 'tx-completed-1',
                order_id: 'FT26325051385063',
                status: 'completed'
              }
            ]
          };
        }
        if (url.includes('/rpc/process_payment_by_order')) {
          rpcCallCount++;
          return { ok: true, json: async () => ({ success: true }) };
        }
        return { ok: false, json: async () => ({}) };
      });

      const replayPayload = {
        gateway: 'VPBank',
        content: 'ND PFJQREP NAPAS',
        transferType: 'in',
        transferAmount: 10000,
        referenceCode: 'FT26325051385063',
        id: 101305288
      };

      // Attacker replays payload 5 times
      for (let i = 0; i < 5; i++) {
        const req: any = {
          method: 'POST',
          headers: { authorization: `Apikey ${TEST_SEPAY_KEY}` },
          body: replayPayload
        };
        const res = createMockResponse();

        await sepayWebhookHandler(req, res);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.alreadyProcessed).toBe(true);
        expect(res.body.message).toContain('đã được xử lý thành công trước đó');
      }

      // RPC was NEVER called because early idempotency check caught all 5 attempts!
      expect(rpcCallCount).toBe(0);
    });

    it('defends against duplicate webhook replays using SePay numeric ID when referenceCode is missing', async () => {
      let rpcCallCount = 0;
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('SEPAY_101305288')) {
          return {
            ok: true,
            json: async () => [
              {
                id: 'tx-completed-2',
                order_id: 'SEPAY_101305288',
                status: 'completed'
              }
            ]
          };
        }
        if (url.includes('/rpc/process_payment_by_order')) {
          rpcCallCount++;
          return { ok: true, json: async () => ({}) };
        }
        return { ok: false, json: async () => ({}) };
      });

      const replayPayload = {
        id: 101305288,
        gateway: 'VPBank',
        content: 'ND PFJQREP',
        transferType: 'in',
        transferAmount: 10000
      };

      const req: any = {
        method: 'POST',
        headers: { authorization: `Apikey ${TEST_SEPAY_KEY}` },
        body: replayPayload
      };
      const res = createMockResponse();

      await sepayWebhookHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.alreadyProcessed).toBe(true);
      expect(rpcCallCount).toBe(0);
    });

    it('RPC process_payment_by_order handles already-completed order idempotently if concurrent replay slips past check', async () => {
      // Simulates database returning already_processed from the atomic PostgreSQL transaction
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('/payment_transactions?or=')) {
          // Idempotency check initially empty (concurrent race condition)
          return { ok: true, json: async () => [] };
        }
        if (url.includes('/rpc/process_payment_by_order')) {
          // PostgreSQL function returns already_processed
          return {
            ok: true,
            json: async () => ({
              success: false,
              already_processed: true,
              message: 'Đơn hàng đã hoàn tất trước đó'
            })
          };
        }
        return { ok: false, json: async () => ({}) };
      });

      const req: any = {
        method: 'POST',
        headers: { authorization: `Apikey ${TEST_SEPAY_KEY}` },
        body: {
          content: 'ND PF8M2K9',
          transferType: 'in',
          transferAmount: 10000,
          referenceCode: 'CONCURRENT_RACE_TEST'
        }
      };
      const res = createMockResponse();

      await sepayWebhookHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.alreadyProcessed).toBe(true);
      expect(res.body.message).toContain('Đơn hàng đã hoàn tất trước đó');
    });

    it('PRO subscription orders defend against replay if already completed in payment_transactions', async () => {
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('/payment_transactions?order_id=eq.POMO_112233')) {
          return {
            ok: true,
            json: async () => [
              {
                id: 'tx-pro-done',
                order_id: 'POMO_112233',
                status: 'completed',
                user_id: 'user-vip-1'
              }
            ]
          };
        }
        return { ok: true, json: async () => [] };
      });

      const req: any = {
        method: 'POST',
        headers: { authorization: `Apikey ${TEST_SEPAY_KEY}` },
        body: {
          content: 'POMO_112233 nang cap goi pro',
          transferType: 'in',
          transferAmount: 149000,
          referenceCode: 'FT_PRO_REPLAY'
        }
      };
      const res = createMockResponse();

      await sepayWebhookHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.alreadyProcessed).toBe(true);
      expect(res.body.message).toContain('Đơn hàng PRO này đã hoàn tất trước đó');
    });
  });
});
