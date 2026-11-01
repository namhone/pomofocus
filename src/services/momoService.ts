import { authService, UserProfile } from './authService';
import { PRICING_PLANS } from '../config/pricing';
import { computeHmacSha256 } from '../utils/crypto';

export type OrderStatus = 'pending' | 'under_review' | 'verified_paid' | 'failed' | 'expired';

export interface MoMoOrder {
  orderId: string;
  email: string;
  userId?: string;
  authProvider?: string;
  cycle: 'monthly' | 'yearly' | 'lifetime';
  durationMonths: number;
  amount: number;
  memo: string;
  qrUrl: string;
  payUrl?: string;
  deeplink?: string;
  status: OrderStatus;
  createdAt: number;
  expiresAt: number;
  paidAt?: number;
  transId?: string;
  isSandbox?: boolean;
}

export interface MoMoWebhookPayload {
  partnerCode: string;
  orderId: string;
  requestId: string;
  amount: number;
  orderInfo: string;
  orderType: string;
  transId: number | string;
  resultCode: number;
  message: string;
  payType: string;
  responseTime: number;
  extraData: string;
  signature: string;
  accessKey?: string;
}

export const MOMO_CONFIG = {
  phone: '0704862629',
  displayPhone: '0704 862 629',
  recipientName: 'HỒ NGỌC BẢO NAM',
  accountNameNoAccent: 'HO NGOC BAO NAM'
} as const;

const ORDERS_STORAGE_KEY = 'pomodoro_study_momo_orders';
const PROCESSED_TRANS_KEY = 'pomodoro_study_processed_trans';
const ORDER_TTL_MS = 15 * 60 * 1000; // 15 phút

export const momoService = {
  getQrImageUrl(amount: number, memo: string): string {
    return `https://api.vietqr.io/image/970422-${MOMO_CONFIG.phone}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(memo)}&accountName=${encodeURIComponent(MOMO_CONFIG.accountNameNoAccent)}`;
  },

  createOrder(email: string, cycle: 'monthly' | 'yearly' | 'lifetime', userId?: string, authProvider?: string): MoMoOrder {
    const session = authService.getCurrentSession();
    // Ưu tiên danh tính đã xác thực nếu người dùng đang đăng nhập
    const boundUserId = userId || (session ? session.id : undefined);
    const boundAuthProvider = authProvider || (session ? session.authProvider : undefined);
    const cleanEmail = (session ? session.email : email).trim().toLowerCase();

    const plan = PRICING_PLANS[cycle] || PRICING_PLANS.monthly;
    const durationMonths = plan.durationMonths;
    const amount = plan.priceVnd;
    const shortCode = Math.floor(100000 + Math.random() * 900000);
    const orderId = `POMO_${shortCode}`;
    const now = Date.now();
    
    // Cú pháp chuyển khoản chuẩn: POMO [Mã_Đơn] [Email]
    const memo = `POMO ${orderId} ${cleanEmail.split('@')[0]}`;

    // Sinh mã VietQR chuyển khoản ngân hàng / MoMo NAPAS
    const qrUrl = `https://api.vietqr.io/image/970422-${MOMO_CONFIG.phone}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(memo)}&accountName=${encodeURIComponent(MOMO_CONFIG.accountNameNoAccent)}`;

    const order: MoMoOrder = {
      orderId,
      email: cleanEmail,
      userId: boundUserId,
      authProvider: boundAuthProvider,
      cycle,
      durationMonths,
      amount,
      memo,
      qrUrl,
      payUrl: qrUrl,
      deeplink: `momo://app?action=pay&amount=${amount}&comment=${encodeURIComponent(memo)}`,
      status: 'pending',
      createdAt: now,
      expiresAt: now + ORDER_TTL_MS
    };

    this.saveOrder(order);
    return order;
  },

  async createOnlinePayment(params: {
    userId?: string;
    userEmail?: string;
    cycle: 'monthly' | 'yearly' | 'lifetime';
    couponCode?: string;
    returnUrl?: string;
  }): Promise<{
    success: boolean;
    orderId: string;
    amount: number;
    payUrl: string;
    qrCodeUrl: string;
    deeplink?: string;
    memo?: string;
    freeGranted?: boolean;
    isSandbox?: boolean;
    message?: string;
  }> {
    const planKey = params.cycle === 'yearly' ? '1_year' : params.cycle === 'lifetime' ? 'lifetime' : '1_month';
    try {
      const res = await fetch('/api/momo/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: params.userId,
          userEmail: params.userEmail,
          planId: planKey,
          couponCode: params.couponCode,
          returnUrl: params.returnUrl
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          return data;
        }
      }
    } catch (err) {
      console.warn('Không thể gọi API /api/momo/create-payment, chuyển sang fallback cục bộ:', err);
    }

    // Fallback nếu API Vercel không kết nối được
    const localOrder = this.createOrder(params.userEmail || 'student@studyworkspace.io', params.cycle, params.userId);
    return {
      success: true,
      orderId: localOrder.orderId,
      amount: localOrder.amount,
      payUrl: localOrder.qrUrl,
      qrCodeUrl: localOrder.qrUrl,
      deeplink: localOrder.deeplink,
      memo: localOrder.memo,
      isSandbox: true
    };
  },

  async checkPaymentStatus(orderId: string, userId?: string): Promise<{ isPaid: boolean; isPro: boolean; proExpiresAt?: string | null }> {
    try {
      const res = await fetch(`/api/momo/check-status?orderId=${encodeURIComponent(orderId)}&userId=${encodeURIComponent(userId || '')}`);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // offline fallback
    }

    const order = this.getOrder(orderId);
    return {
      isPaid: order?.status === 'verified_paid',
      isPro: order?.status === 'verified_paid'
    };
  },

  async simulateOnlinePayment(params: {
    orderId: string;
    userId: string;
    planType: string;
    durationDays: number | null;
    amount: number;
  }): Promise<boolean> {
    try {
      await fetch('/api/momo/simulate-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      return true;
    } catch {
      return false;
    }
  },

  getOrders(): Record<string, MoMoOrder> {
    if (typeof window === 'undefined' || !window.localStorage) return {};
    try {
      const raw = localStorage.getItem(ORDERS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  },

  getOrder(orderId: string): MoMoOrder | null {
    const orders = this.getOrders();
    const order = orders[orderId] || null;
    if (order && order.status === 'pending' && Date.now() > order.expiresAt) {
      order.status = 'expired';
      this.saveOrder(order);
    }
    return order;
  },

  saveOrder(order: MoMoOrder): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const orders = this.getOrders();
      orders[order.orderId] = order;
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
    } catch (err) {
      console.warn('Lỗi lưu đơn hàng MoMo:', err);
    }
  },

  getProcessedTransactions(): string[] {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    try {
      const raw = localStorage.getItem(PROCESSED_TRANS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  recordProcessedTransaction(transId: string): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const trans = this.getProcessedTransactions();
      if (!trans.includes(transId)) {
        trans.push(transId);
        localStorage.setItem(PROCESSED_TRANS_KEY, JSON.stringify(trans));
      }
    } catch (err) {
      console.warn('Lỗi lưu transaction MoMo:', err);
    }
  },

  /**
   * NGUYÊN TẮC FAIL-CLOSED:
   * Thao tác người dùng bấm "Tôi đã chuyển khoản" CHỈ chuyển trạng thái đơn hàng sang 'under_review'.
   * TUYỆT ĐỐI KHÔNG cấp quyền PRO thật sự từ thao tác phía Client.
   */
  notifyUserTransferred(orderId: string): { success: boolean; order?: MoMoOrder; error?: string } {
    const order = this.getOrder(orderId);
    if (!order) {
      return { success: false, error: 'Không tìm thấy thông tin đơn hàng.' };
    }

    if (Date.now() > order.expiresAt) {
      order.status = 'expired';
      this.saveOrder(order);
      return { success: false, error: 'Đơn hàng đã hết hạn thanh toán (quá 15 phút). Vui lòng tạo đơn mới.' };
    }

    if (order.status === 'verified_paid') {
      return { success: true, order };
    }

    // Đánh dấu đơn đang chờ đối soát máy chủ
    order.status = 'under_review';
    this.saveOrder(order);

    return {
      success: true,
      order
    };
  },

  /**
   * XÁC MINH WEBHOOK PHÍA SERVER (SERVER-SIDE IPN VERIFICATION):
   * Kiểm tra chữ ký HMAC-SHA256 chính thức theo đặc tả MoMo API,
   * kiểm tra số tiền, kiểm tra hạn đơn, chống xử lý trùng (Idempotency),
   * và chỉ kích hoạt quyền PRO khi chữ ký và dữ liệu hoàn toàn hợp lệ.
   */
  async verifyServerWebhook(
    payload: MoMoWebhookPayload,
    secretKey: string,
    accessKey = 'TEST_ACCESS_KEY'
  ): Promise<{ success: boolean; code: string; message: string; user?: UserProfile }> {
    // 1. Kiểm tra mã kết quả từ MoMo
    if (payload.resultCode !== 0) {
      const order = this.getOrder(payload.orderId);
      if (order) {
        order.status = 'failed';
        this.saveOrder(order);
      }
      return {
        success: false,
        code: 'PAYMENT_FAILED',
        message: `Giao dịch MoMo thất bại với mã lỗi: ${payload.resultCode}`
      };
    }

    // 2. Kiểm tra chữ ký bảo mật HMAC-SHA256 theo chuẩn tài liệu MoMo
    const rawSignature = `accessKey=${payload.accessKey || accessKey}&amount=${payload.amount}&extraData=${payload.extraData}&message=${payload.message}&orderId=${payload.orderId}&orderInfo=${payload.orderInfo}&orderType=${payload.orderType}&partnerCode=${payload.partnerCode}&payType=${payload.payType}&requestId=${payload.requestId}&responseTime=${payload.responseTime}&resultCode=${payload.resultCode}&transId=${payload.transId}`;
    const expectedSignature = await computeHmacSha256(secretKey, rawSignature);

    if (payload.signature !== expectedSignature) {
      return {
        success: false,
        code: 'INVALID_SIGNATURE',
        message: 'Chữ ký webhook MoMo không hợp lệ (Signature Mismatch). Từ chối cấp quyền.'
      };
    }

    // 3. Đối chiếu đơn hàng tồn tại trong hệ thống
    const order = this.getOrder(payload.orderId);
    if (!order) {
      return {
        success: false,
        code: 'ORDER_NOT_FOUND',
        message: 'Mã đơn hàng không tồn tại trong hệ thống.'
      };
    }

    // 4. Kiểm tra đơn hàng hết hạn
    if (Date.now() > order.expiresAt) {
      order.status = 'expired';
      this.saveOrder(order);
      return {
        success: false,
        code: 'ORDER_EXPIRED',
        message: 'Đơn hàng đã hết hạn thanh toán (quá 15 phút).'
      };
    }

    // 5. Đối chiếu số tiền chuyển khoản chính xác tuyệt đối
    if (payload.amount !== order.amount) {
      order.status = 'failed';
      this.saveOrder(order);
      return {
        success: false,
        code: 'AMOUNT_MISMATCH',
        message: `Số tiền thanh toán (${payload.amount} VNĐ) không khớp với giá trị đơn hàng (${order.amount} VNĐ).`
      };
    }

    // 6. Chống tấn công lặp / xử lý trùng (Idempotency Defense)
    const transIdStr = String(payload.transId);
    const processedTrans = this.getProcessedTransactions();
    if (processedTrans.includes(transIdStr) || order.status === 'verified_paid') {
      return {
        success: true,
        code: 'IDEMPOTENT_DUPLICATE',
        message: 'Giao dịch đã được ghi nhận trước đó. Không xử lý lặp.'
      };
    }

    // 7. Bảo vệ mạo danh tài khoản (Email Impersonation Protection)
    const currentSession = authService.getCurrentSession();
    const usersStore = (typeof window !== 'undefined' && window.localStorage)
      ? JSON.parse(localStorage.getItem('pomodoro_study_users_store') || '{}')
      : {};

    const existingAccount = usersStore[order.email];
    let targetUserId = currentSession?.id;

    // Nếu người dùng chưa đăng nhập nhưng email đơn hàng thuộc tài khoản đã có sẵn mật khẩu
    if (!currentSession && existingAccount && existingAccount.passwordHash) {
      // Đánh dấu đơn đã thanh toán nhưng yêu cầu đăng nhập để hoàn tất gán quyền
      order.status = 'verified_paid';
      order.paidAt = Date.now();
      order.transId = transIdStr;
      this.saveOrder(order);
      this.recordProcessedTransaction(transIdStr);

      return {
        success: true,
        code: 'REQUIRES_LOGIN',
        message: 'Thanh toán đã được xác nhận. Vui lòng đăng nhập vào tài khoản để kích hoạt gói PRO.'
      };
    }

    if (!targetUserId) {
      targetUserId = `usr_${Date.now()}`;
    }

    // 8. Cấp quyền PRO chính thức sau khi toàn bộ xác minh vượt qua
    order.status = 'verified_paid';
    order.paidAt = Date.now();
    order.transId = transIdStr;
    this.saveOrder(order);
    this.recordProcessedTransaction(transIdStr);

    const updatedUser = authService.upgradePlan(targetUserId, 'pro', order.durationMonths);
    if (!currentSession && order.email) {
      updatedUser.email = order.email;
      updatedUser.displayName = order.email.split('@')[0];
      localStorage.setItem('pomodoro_study_auth_session', JSON.stringify(updatedUser));
    }

    return {
      success: true,
      code: 'ENTITLEMENT_GRANTED',
      message: 'Xác minh giao dịch thành công. Đã cấp quyền PRO chính thức.',
      user: updatedUser
    };
  },

  /**
   * MÔ PHỎNG SANDBOX DÀNH CHO NHÀ PHÁT TRIỂN / TESTING:
   * Được gắn nhãn rõ ràng là Sandbox, chỉ cấp quyền `pro_sandbox` và cô lập hoàn toàn khỏi hệ thống PRO thật.
   */
  simulateSandboxPayment(orderId: string): { success: boolean; user?: UserProfile; error?: string } {
    const order = this.getOrder(orderId);
    if (!order) {
      return { success: false, error: 'Không tìm thấy đơn hàng sandbox.' };
    }

    order.status = 'verified_paid';
    order.paidAt = Date.now();
    order.isSandbox = true;
    this.saveOrder(order);

    const currentSession = authService.getCurrentSession();
    const targetUserId = currentSession?.id || `usr_sandbox_${Date.now()}`;
    const updatedUser = authService.upgradePlan(targetUserId, 'pro_sandbox', order.durationMonths);

    return {
      success: true,
      user: updatedUser
    };
  }
};
