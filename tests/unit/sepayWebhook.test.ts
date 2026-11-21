import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import sepayWebhookHandler from '../../api/payment/sepay-webhook';
import { momoService, BANKING_CONFIG } from '../../src/services/momoService';

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

describe('SePay VPBank VA (AGBSPTJE34IA3A8SAAX) Webhook & QR Integration Tests', () => {
  const originalEnv = process.env;
  const TEST_SEPAY_KEY = '92404523f9215a05e352a2627cd9709b9aa233db7bae061ea117be4a87b2e16a';

  beforeEach(() => {
    vi.resetAllMocks();
    process.env = {
      ...originalEnv,
      SEPAY_WEBHOOK_API_KEY: TEST_SEPAY_KEY,
      SUPABASE_URL: 'https://test-supabase-project.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key'
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('1. Security & Authentication Gate', () => {
    it('rejects requests with missing or invalid API key with 401 Unauthorized', async () => {
      const req: any = {
        method: 'POST',
        headers: { authorization: 'Apikey wrong_api_key' },
        body: { content: 'PF8M2K9', transferAmount: 10000, transferType: 'in' }
      };
      const res = createMockResponse();

      await sepayWebhookHandler(req, res);
      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Unauthorized');
    });

    it('accepts authorization header in standard format: Authorization: Apikey <KEY>', async () => {
      const globalFetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
        const urlStr = String(url);
        if (urlStr.includes('/rpc/process_payment_by_order')) {
          return {
            ok: true,
            json: async () => ({
              success: true,
              user_id: '550e8400-e29b-41d4-a716-446655440000',
              credits_added: 50,
              new_balance: 100
            })
          } as any;
        }
        return { ok: false, json: async () => ({}) } as any;
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

      globalFetch.mockRestore();
    });

    it('falls back to POMO_VCB_SECRET_KEY when SEPAY_WEBHOOK_API_KEY is not explicitly set', async () => {
      delete process.env.SEPAY_WEBHOOK_API_KEY;
      process.env.POMO_VCB_SECRET_KEY = 'fallback_vcb_secret_key_456';

      const globalFetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
        const urlStr = String(url);
        if (urlStr.includes('/rpc/process_payment_by_order')) {
          return {
            ok: true,
            json: async () => ({ success: true, user_id: 'user-1', credits_added: 50, new_balance: 100 })
          } as any;
        }
        return { ok: false, json: async () => ({}) } as any;
      });

      const req: any = {
        method: 'POST',
        headers: { authorization: 'Apikey fallback_vcb_secret_key_456' },
        body: {
          content: 'PF9K2A8',
          transferType: 'in',
          transferAmount: 10000
        }
      };
      const res = createMockResponse();

      await sepayWebhookHandler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.orderCode).toBe('PF9K2A8');

      globalFetch.mockRestore();
    });
  });

  describe('2. Business Rules & Edge Cases', () => {
    it('safely skips outgoing money transfers (transferType !== "in")', async () => {
      const req: any = {
        method: 'POST',
        headers: { authorization: `Apikey ${TEST_SEPAY_KEY}` },
        body: {
          gateway: 'VPBank',
          accountNumber: 'AGBSPTJE34IA3A8SAAX',
          content: 'Chuyen tien rut ve tai khoan',
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

    it('guarantees idempotency when referenceCode was already completed', async () => {
      const globalFetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
        const urlStr = String(url);
        if (urlStr.includes('/rest/v1/payment_transactions')) {
          return {
            ok: true,
            json: async () => [
              {
                id: 'tx-existing-1',
                order_id: 'REF_ALREADY_DONE',
                status: 'completed'
              }
            ]
          } as any;
        }
        return { ok: false, json: async () => ({}) } as any;
      });

      const req: any = {
        method: 'POST',
        headers: { authorization: `Apikey ${TEST_SEPAY_KEY}` },
        body: {
          content: 'PF8M2K9',
          transferType: 'in',
          transferAmount: 10000,
          referenceCode: 'REF_ALREADY_DONE'
        }
      };
      const res = createMockResponse();

      await sepayWebhookHandler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.alreadyProcessed).toBe(true);

      globalFetch.mockRestore();
    });

    it('records UNMATCHED_PENDING_MANUAL_REVIEW when transaction content has no valid order code', async () => {
      let insertedTx: any = null;
      const globalFetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any, opts: any) => {
        const urlStr = String(url);
        if (urlStr.includes('/rest/v1/payment_transactions') && opts?.method === 'POST') {
          insertedTx = JSON.parse(opts.body);
          return { ok: true, json: async () => ({ id: 'unmatched-tx-1' }) } as any;
        }
        return { ok: true, json: async () => [] } as any;
      });

      const req: any = {
        method: 'POST',
        headers: { authorization: `Apikey ${TEST_SEPAY_KEY}` },
        body: {
          id: 998877,
          gateway: 'VPBank',
          accountNumber: 'AGBSPTJE34IA3A8SAAX',
          content: 'Nguyen Van A chuyen tien mua hang khong co ma',
          transferType: 'in',
          transferAmount: 20000,
          referenceCode: 'FT99887766'
        }
      };
      const res = createMockResponse();

      await sepayWebhookHandler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(false);
      expect(res.body.status).toBe('UNMATCHED_PENDING_MANUAL_REVIEW');
      expect(insertedTx).not.toBeNull();
      expect(insertedTx.status).toBe('UNMATCHED_PENDING_MANUAL_REVIEW');
      expect(insertedTx.amount).toBe(20000);

      globalFetch.mockRestore();
    });
  });

  describe('3. QR Code Configuration & SePay VA VPBank Standards', () => {
    it('uses VPBank and VA account AGBSPTJE34IA3A8SAAX in BANKING_CONFIG', () => {
      expect(BANKING_CONFIG.bankName).toBe('VPBank');
      expect(BANKING_CONFIG.accountNumber).toBe('AGBSPTJE34IA3A8SAAX');
      expect(BANKING_CONFIG.bankId).toBe('VPBank');
    });

    it('generates dynamic SePay QR URL matching https://vietqr.app/img?acc=AGBSPTJE34IA3A8SAAX&bank=VPBank&amount=...&des=...', () => {
      const qrUrl = momoService.getQrImageUrl(10000, 'PF8M2K9');
      expect(qrUrl).toContain('https://vietqr.app/img?');
      expect(qrUrl).toContain('acc=AGBSPTJE34IA3A8SAAX');
      expect(qrUrl).toContain('bank=VPBank');
      expect(qrUrl).toContain('amount=10000');
      expect(qrUrl).toContain('des=POMO_PF8M2K9');
    });
  });

  describe('4. Real Production Transaction #101305288 (PFJQREP) Verification', () => {
    it('correctly matches hyphenated memo ...-0704862629-PFJQREP and credits 50 credits', async () => {
      let rpcPayload: any = null;
      const globalFetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any, opts: any) => {
        const urlStr = String(url);
        if (urlStr.includes('/rpc/process_payment_by_order') && opts?.method === 'POST') {
          rpcPayload = JSON.parse(opts.body);
          return {
            ok: true,
            json: async () => ({
              success: true,
              user_id: 'e61e687b-a19d-7db0-6644-8e50bdf7dd16',
              credits_added: 50,
              new_balance: 100
            })
          } as any;
        }
        return { ok: false, json: async () => ({}) } as any;
      });

      const realPayload = {
        gateway: 'VPBank',
        transactionDate: '2026-11-21 11:01:11',
        accountNumber: '0704862629',
        subAccount: 'AGBSPTJE34IA3A8SAAX',
        code: null,
        content: 'NHAN TU 116000074230 TRACE 118166 ND 157970129631-0704862629-PFJQREP',
        transferType: 'in',
        description: 'BankAPINotify NHAN TU 116000074230 TRACE 118166 ND 157970129631-0704862629-PFJQREP',
        transferAmount: 10000,
        referenceCode: 'FT26325051385063',
        accumulated: 0,
        id: 101305288
      };

      const req: any = {
        method: 'POST',
        headers: { authorization: `Apikey ${TEST_SEPAY_KEY}` },
        body: realPayload
      };
      const res = createMockResponse();

      await sepayWebhookHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.orderCode).toBe('PFJQREP');
      expect(res.body.credits_added).toBe(50);
      expect(res.body.new_balance).toBe(100);

      expect(rpcPayload).not.toBeNull();
      expect(rpcPayload.p_order_code).toBe('PFJQREP');
      expect(rpcPayload.p_transfer_amount).toBe(10000);
      expect(rpcPayload.p_gateway).toBe('SePay_VPBank');

      globalFetch.mockRestore();
    });
  });
});
