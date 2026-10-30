import { describe, it, expect, beforeEach } from 'vitest';
import { momoService, MoMoWebhookPayload } from '../../src/services/momoService';
import { authService } from '../../src/services/authService';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { computeHmacSha256 } from '../../src/utils/crypto';

describe('Payment Security Audit — 10 Vulnerability & Attack Vectors', () => {
  const SECRET_KEY = 'TEST_SECRET_KEY_MOMO_2026';
  const ACCESS_KEY = 'TEST_ACCESS_KEY';

  beforeEach(() => {
    localStorage.clear();
  });

  // Helper tạo chữ ký hợp lệ đúng chuẩn MoMo API
  const createValidPayload = async (
    orderId: string,
    amount: number,
    transId: number | string = 888999,
    resultCode = 0
  ): Promise<MoMoWebhookPayload> => {
    const payload: MoMoWebhookPayload = {
      partnerCode: 'MOMO',
      orderId,
      requestId: orderId,
      amount,
      orderInfo: 'MoMo Payment',
      orderType: 'momo_wallet',
      transId,
      resultCode,
      message: 'Success',
      payType: 'qr',
      responseTime: 1700000000,
      extraData: '',
      signature: '',
      accessKey: ACCESS_KEY
    };

    const rawSignature = `accessKey=${payload.accessKey}&amount=${payload.amount}&extraData=${payload.extraData}&message=${payload.message}&orderId=${payload.orderId}&orderInfo=${payload.orderInfo}&orderType=${payload.orderType}&partnerCode=${payload.partnerCode}&payType=${payload.payType}&requestId=${payload.requestId}&responseTime=${payload.responseTime}&resultCode=${payload.resultCode}&transId=${payload.transId}`;
    payload.signature = await computeHmacSha256(SECRET_KEY, rawSignature);

    return payload;
  };

  it('Vector 1: Tự bấm xác nhận phía client mà không có giao dịch thật (Client Self-Confirmation)', () => {
    const order = momoService.createOrder('attacker@domain.com', 'monthly');

    // Kẻ tấn công gọi notifyUserTransferred
    const result = momoService.notifyUserTransferred(order.orderId);

    expect(result.success).toBe(true);
    // Trạng thái chỉ là under_review, TUYỆT ĐỐI không phải verified_paid
    expect(result.order?.status).toBe('under_review');

    // Quyền của tài khoản hiện tại không được nâng cấp lên PRO
    const session = authService.getCurrentSession();
    expect(session?.plan || 'free').not.toBe('pro');
  });

  it('Vector 2: Can thiệp localStorage và gọi trực tiếp upgradeToPro từ client (Privilege Escalation Defense)', () => {
    // 1. Kẻ tấn công gọi trực tiếp upgradeToPro từ console trình duyệt
    useAuthStore.getState().upgradeToPro(1);
    const storeUser = useAuthStore.getState().user;
    // Bị Fail-Closed chặn, chỉ nhận được pro_sandbox, KHÔNG ĐƯỢC nhận pro thật
    expect(storeUser?.plan).toBe('pro_sandbox');
    expect(storeUser?.plan).not.toBe('pro');

    // 2. Kẻ tấn công tự ý ghi đè localStorage để giả mạo PRO
    localStorage.setItem(
      'pomodoro_study_auth_session',
      JSON.stringify({ id: 'usr_hacker', email: 'hacker@dark.net', plan: 'pro' })
    );

    // Khi đọc session, dù client parse được chuỗi giả mạo nhưng momoService không có giao dịch server
    const session = authService.getCurrentSession();
    expect(session?.id).toBe('usr_hacker');

    // Đơn hàng trong momoService vẫn không hề có trạng thái verified_paid từ server
    const orders = momoService.getOrders();
    expect(Object.keys(orders).length).toBe(0);
  });

  it('Vector 3: Xử lý trùng lặp giao dịch (Idempotency Protection)', async () => {
    const order = momoService.createOrder('user.idempotent@study.edu', 'monthly');
    const transId = 123456789;
    const payload = await createValidPayload(order.orderId, order.amount, transId);

    // Lần 1: Webhook hợp lệ được xử lý thành công
    const res1 = await momoService.verifyServerWebhook(payload, SECRET_KEY, ACCESS_KEY);
    expect(res1.success).toBe(true);
    expect(res1.code).toBe('ENTITLEMENT_GRANTED');

    // Lần 2: Webhook bị gửi lặp lại (Network retry hoặc Replay)
    const res2 = await momoService.verifyServerWebhook(payload, SECRET_KEY, ACCESS_KEY);
    expect(res2.success).toBe(true);
    expect(res2.code).toBe('IDEMPOTENT_DUPLICATE');
    expect(res2.message).toContain('Không xử lý lặp');
  });

  it('Vector 4: Tấn công sai lệch số tiền (Amount Mismatch Attack)', async () => {
    // Đơn hàng yêu cầu 59.000 VNĐ
    const order = momoService.createOrder('victim@study.edu', 'monthly');
    expect(order.amount).toBe(59000);

    // Kẻ gian chỉ chuyển 1.000 VNĐ nhưng gửi webhook với số tiền 1.000 VNĐ được ký
    const payload = await createValidPayload(order.orderId, 1000, 999111);

    const res = await momoService.verifyServerWebhook(payload, SECRET_KEY, ACCESS_KEY);
    expect(res.success).toBe(false);
    expect(res.code).toBe('AMOUNT_MISMATCH');
    expect(res.message).toContain('không khớp');

    const updatedOrder = momoService.getOrder(order.orderId);
    expect(updatedOrder?.status).toBe('failed');
  });

  it('Vector 5: Mã đơn hàng không tồn tại (Non-existent Order ID Injection)', async () => {
    const fakeOrderId = 'SW_999999_FAKE';
    const payload = await createValidPayload(fakeOrderId, 59000, 555666);

    const res = await momoService.verifyServerWebhook(payload, SECRET_KEY, ACCESS_KEY);
    expect(res.success).toBe(false);
    expect(res.code).toBe('ORDER_NOT_FOUND');
  });

  it('Vector 6: Giả mạo chữ ký bảo mật HMAC-SHA256 (Invalid Signature / Forged Payload)', async () => {
    const order = momoService.createOrder('bob@academic.io', 'yearly');
    const payload = await createValidPayload(order.orderId, order.amount, 777888);

    // Kẻ tấn công thay đổi số tiền sau khi đã ký
    payload.amount = 1000;

    const res = await momoService.verifyServerWebhook(payload, SECRET_KEY, ACCESS_KEY);
    expect(res.success).toBe(false);
    expect(res.code).toBe('INVALID_SIGNATURE');
    expect(res.message).toContain('Chữ ký webhook MoMo không hợp lệ');
  });

  it('Vector 7: Chiếm đoạt tài khoản qua email khách (Unverified Email Takeover Protection)', async () => {
    // Giả sử có một tài khoản đã đăng ký mật khẩu
    const realUser = await authService.signup('target.vip@corp.com', 'secure_pass_123', 'VIP User');
    expect(realUser.plan).toBe('pro_beta');

    // Logout để ở trạng thái khách chưa đăng nhập
    authService.logout();
    expect(authService.getCurrentSession()).toBeNull();

    // Một kẻ lạ tạo đơn hàng bằng email 'target.vip@corp.com'
    const guestOrder = momoService.createOrder('target.vip@corp.com', 'yearly');

    // Webhook thanh toán đến
    const payload = await createValidPayload(guestOrder.orderId, guestOrder.amount, 999222);
    const res = await momoService.verifyServerWebhook(payload, SECRET_KEY, ACCESS_KEY);

    // Hệ thống chặn việc tự động đăng nhập kẻ lạ vào tài khoản target.vip
    expect(res.success).toBe(true);
    expect(res.code).toBe('REQUIRES_LOGIN');
    expect(res.message).toContain('Vui lòng đăng nhập vào tài khoản để kích hoạt gói PRO');
  });

  it('Vector 8: Đơn hàng hết hạn thanh toán (> 15 phút TTL)', async () => {
    const order = momoService.createOrder('slow.user@study.edu', 'monthly');

    // Giả lập thời gian trôi qua 16 phút (> 15 phút)
    order.expiresAt = Date.now() - 60 * 1000;
    momoService.saveOrder(order);

    const payload = await createValidPayload(order.orderId, order.amount, 444333);
    const res = await momoService.verifyServerWebhook(payload, SECRET_KEY, ACCESS_KEY);

    expect(res.success).toBe(false);
    expect(res.code).toBe('ORDER_EXPIRED');

    const updatedOrder = momoService.getOrder(order.orderId);
    expect(updatedOrder?.status).toBe('expired');
  });

  it('Vector 9: Tấn công phát lại Callback (Replay Attack Defense)', async () => {
    const order = momoService.createOrder('replay.test@study.edu', 'monthly');
    const transId = 771122;
    const payload = await createValidPayload(order.orderId, order.amount, transId);

    // Lần gửi đầu tiên: Chấp nhận
    const firstCall = await momoService.verifyServerWebhook(payload, SECRET_KEY, ACCESS_KEY);
    expect(firstCall.success).toBe(true);
    expect(firstCall.code).toBe('ENTITLEMENT_GRANTED');

    // Kẻ gian chặn bắt packet và phát lại y hệt
    const replayCall = await momoService.verifyServerWebhook(payload, SECRET_KEY, ACCESS_KEY);
    expect(replayCall.success).toBe(true);
    expect(replayCall.code).toBe('IDEMPOTENT_DUPLICATE');

    // Quyền PRO chỉ được cấp 1 chu kỳ, không bị nhân đôi
    const user = authService.getCurrentSession();
    expect(user?.plan).toBe('pro');
  });

  it('Vector 10: MoMo gửi callback giao dịch thất bại (Failed Transaction resultCode !== 0)', async () => {
    const order = momoService.createOrder('failed.buyer@study.edu', 'monthly');
    // MoMo resultCode = 1006 (Giao dịch bị người dùng hủy)
    const payload = await createValidPayload(order.orderId, order.amount, 999000, 1006);

    const res = await momoService.verifyServerWebhook(payload, SECRET_KEY, ACCESS_KEY);
    expect(res.success).toBe(false);
    expect(res.code).toBe('PAYMENT_FAILED');
    expect(res.message).toContain('1006');

    const updatedOrder = momoService.getOrder(order.orderId);
    expect(updatedOrder?.status).toBe('failed');
  });
});
