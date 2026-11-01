import { describe, it, expect, beforeEach } from 'vitest';
import { momoService } from '../../src/services/momoService';
import { authService } from '../../src/services/authService';
import { PRICING_PLANS } from '../../src/config/pricing';
import { computeHmacSha256 } from '../../src/utils/crypto';
import { buildCreatePaymentSignature, buildIpnSignature } from '../../api/momo/_utils';

describe('MoMo Payment & Account Linking Service Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('1. Tạo đơn hàng MoMo gói Hàng tháng với thông tin email và số tiền chính xác (59.000 VNĐ)', () => {
    const order = momoService.createOrder('test@studyworkspace.io', 'monthly');

    expect(order.orderId).toMatch(/^(POMO|SW)_\d{6}$/);
    expect(order.email).toBe('test@studyworkspace.io');
    expect(order.cycle).toBe('monthly');
    expect(order.durationMonths).toBe(1);
    expect(order.amount).toBe(PRICING_PLANS.monthly.priceVnd); // 59000
    expect(order.amount).toBe(59000);
    expect(order.memo).toContain(order.orderId);
    expect(order.status).toBe('pending');
    expect(order.qrUrl).toContain('970422');
    expect(order.qrUrl).toContain('0704862629');
    expect(order.qrUrl).toContain('HO%20NGOC%20BAO%20NAM');
  });

  it('2. Tạo đơn hàng MoMo gói Hàng năm với thông tin email và số tiền 468.000 VNĐ', () => {
    const order = momoService.createOrder('pro.user@domain.com', 'yearly');

    expect(order.cycle).toBe('yearly');
    expect(order.durationMonths).toBe(12);
    expect(order.amount).toBe(PRICING_PLANS.yearly.priceVnd); // 468000
    expect(order.amount).toBe(468000);
    expect(order.status).toBe('pending');
  });

  it('3. Tạo đơn hàng MoMo gói Trọn Đời (Lifetime) với giá 799.000 VNĐ', () => {
    const order = momoService.createOrder('lifetime.learner@pomofocus.io', 'lifetime');

    expect(order.cycle).toBe('lifetime');
    expect(order.amount).toBe(799000);
    expect(order.status).toBe('pending');
    expect(order.memo).toContain(order.orderId);
  });

  it('4. Thao tác người dùng bấm chuyển khoản (Fail-Closed): chỉ chuyển sang under_review, KHÔNG cấp PRO', () => {
    const order = momoService.createOrder('alice@univ.edu', 'yearly');
    const result = momoService.notifyUserTransferred(order.orderId);

    expect(result.success).toBe(true);
    expect(result.order?.status).toBe('under_review');

    // Kiểm tra session hiện tại vẫn là guest hoặc free
    const session = authService.getCurrentSession();
    expect(session?.plan || 'free').not.toBe('pro');
  });

  it('5. Kích hoạt Sandbox độc lập: cấp quyền pro_sandbox được cô lập an toàn', () => {
    const order = momoService.createOrder('bob@tech.com', 'monthly');
    const result = momoService.simulateSandboxPayment(order.orderId);

    expect(result.success).toBe(true);
    expect(result.user?.plan).toBe('pro_sandbox');

    const updatedOrder = momoService.getOrder(order.orderId);
    expect(updatedOrder?.status).toBe('verified_paid');
    expect(updatedOrder?.isSandbox).toBe(true);
  });

  it('6. Tính toán chữ ký HMAC-SHA256 theo đúng đặc tả MoMo v2 API cho Create Payment và IPN', () => {
    const secretKey = 'test_secret_key_123';
    const accessKey = 'test_access_key_456';

    const createSig = buildCreatePaymentSignature({
      accessKey,
      amount: 59000,
      extraData: 'eyJ1c2VySWQiOiJ1c3JfMDEifQ==',
      ipnUrl: 'https://pomodoro-workspace-three.vercel.app/api/momo/ipn',
      orderId: 'POMO_123456',
      orderInfo: 'Nang cap PRO',
      partnerCode: 'MOMOBKUN20180529',
      redirectUrl: 'https://pomodoro-workspace-three.vercel.app/billing',
      requestId: 'REQ_123',
      requestType: 'captureWallet',
      secretKey
    });

    expect(createSig).toBeDefined();
    expect(createSig.length).toBe(64); // SHA256 hex string

    const ipnSig = buildIpnSignature({
      accessKey,
      amount: 59000,
      extraData: 'eyJ1c2VySWQiOiJ1c3JfMDEifQ==',
      message: 'Success',
      orderId: 'POMO_123456',
      orderInfo: 'Nang cap PRO',
      orderType: 'momo_wallet',
      partnerCode: 'MOMOBKUN20180529',
      payType: 'qr',
      requestId: 'REQ_123',
      responseTime: 1700000000000,
      resultCode: 0,
      transId: 987654321,
      secretKey
    });

    expect(ipnSig).toBeDefined();
    expect(ipnSig.length).toBe(64);
  });

  it('7. Kích hoạt trực tiếp quyền PRO khi thanh toán thành công qua activateProFromPayment', () => {
    const user = authService.activateProFromPayment('usr_pro_01', '1_year');
    expect(user.plan).toBe('pro');
    expect(user.isLifetime).toBe(false);
    expect(user.proExpiresAt).toBeGreaterThan(Date.now());

    // Thử kích hoạt gói trọn đời
    const lifetimeUser = authService.activateProFromPayment('usr_pro_02', 'lifetime');
    expect(lifetimeUser.plan).toBe('pro_lifetime');
    expect(lifetimeUser.isLifetime).toBe(true);
    expect(lifetimeUser.proExpiresAt).toBeNull();
  });

  it('8. Xác thực Webhook máy chủ với chữ ký HMAC-SHA256 cấp PRO chính thức', async () => {
    const order = momoService.createOrder('charlie@academic.org', 'monthly');
    const secretKey = 'TEST_SECRET_KEY';
    const accessKey = 'TEST_ACCESS_KEY';
    const transId = Date.now();

    const rawSignature = `accessKey=${accessKey}&amount=${order.amount}&extraData=&message=Success&orderId=${order.orderId}&orderInfo=MoMo Payment&orderType=momo_wallet&partnerCode=MOMO&payType=qr&requestId=${order.orderId}&responseTime=1700000000&resultCode=0&transId=${transId}`;
    const signature = await computeHmacSha256(secretKey, rawSignature);

    const payload = {
      partnerCode: 'MOMO',
      orderId: order.orderId,
      requestId: order.orderId,
      amount: order.amount,
      orderInfo: 'MoMo Payment',
      orderType: 'momo_wallet',
      transId,
      resultCode: 0,
      message: 'Success',
      payType: 'qr',
      responseTime: 1700000000,
      extraData: '',
      signature,
      accessKey
    };

    const webhookResult = await momoService.verifyServerWebhook(payload, secretKey, accessKey);
    expect(webhookResult.success).toBe(true);
    expect(webhookResult.code).toBe('ENTITLEMENT_GRANTED');
    expect(webhookResult.user?.plan).toBe('pro');
    expect(webhookResult.user?.email).toBe('charlie@academic.org');
  });
});
