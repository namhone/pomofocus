import { describe, it, expect, vi, beforeEach } from 'vitest';
import { momoService, BANKING_CONFIG } from '../../src/services/momoService';
import createPaymentHandler from '../../api/momo/create-payment';

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

describe('QR Code Stability & Zero-Flicker Architectural Guarantees', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('1. momoService.getQrImageUrl returns deterministic VietQR URLs without random query params', () => {
    const url1 = momoService.getQrImageUrl(10000, 'PF12345');
    const url2 = momoService.getQrImageUrl(10000, 'PF12345');

    expect(url1).toBe(url2);
    expect(url1).toContain('https://vietqr.app/img?');
    expect(url1).toContain('acc=AGBSPTJE34IA3A8SAAX');
    expect(url1).toContain('bank=VPBank');
    expect(url1).toContain('amount=10000');
    expect(url1).toContain('des=POMO_PF12345');
    expect(url1).not.toMatch(/[?&]t=\d+/);
    expect(url1).not.toMatch(/[?&]_r=\d+/);
  });

  it('2. create-payment API honors client-provided orderId to prevent memo swapping and QR reloads', async () => {
    const clientOrderId = 'POMO_894123';
    const req: any = {
      method: 'POST',
      body: {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        userEmail: 'user@example.com',
        orderId: clientOrderId,
        planId: '1_month'
      }
    };
    const res = createMockResponse();

    await createPaymentHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.orderId).toBe(clientOrderId);
    expect(res.body.memo).toBe(clientOrderId);
    expect(res.body.payUrl).toContain(clientOrderId);
    expect(res.body.qrCodeUrl).toContain(clientOrderId);
  });

  it('3. momoService.createOnlinePayment passes orderId to backend maintaining 100% memo identity', async () => {
    const initialOrder = momoService.createOrder('user@test.io', 'yearly', 'usr_test_123');
    const capturedOrderId = initialOrder.orderId;
    const initialQr = initialOrder.qrUrl;

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url: any, options: any) => {
      const body = JSON.parse(options.body);
      expect(body.orderId).toBe(capturedOrderId);
      return {
        ok: true,
        json: async () => ({
          success: true,
          orderId: body.orderId,
          memo: body.orderId,
          amount: 468000,
          payUrl: initialQr,
          qrCodeUrl: initialQr
        })
      } as any;
    });

    const onlineRes = await momoService.createOnlinePayment({
      userId: 'usr_test_123',
      userEmail: 'user@test.io',
      orderId: capturedOrderId,
      cycle: 'yearly'
    });

    expect(onlineRes.orderId).toBe(capturedOrderId);
    expect(onlineRes.memo).toBe(capturedOrderId);
    expect(onlineRes.qrCodeUrl).toBe(initialQr);

    fetchSpy.mockRestore();
  });

  it('4. Bank Account & Virtual Account config invariants are preserved', () => {
    expect(BANKING_CONFIG.bankId).toBe('VPBank');
    expect(BANKING_CONFIG.accountNumber).toBe('AGBSPTJE34IA3A8SAAX');
    expect(BANKING_CONFIG.recipientName).toBe('HỒ NGỌC BẢO NAM');
    expect(BANKING_CONFIG.accountNameNoAccent).toBe('HO NGOC BAO NAM');
  });
});
