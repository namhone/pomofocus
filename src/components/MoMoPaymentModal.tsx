import React, { useState, useEffect } from 'react';
import { momoService, MoMoOrder, MOMO_CONFIG } from '../services/momoService';
import { useAuthStore } from '../stores/useAuthStore';
import { googleAuthService } from '../services/googleAuthService';
import { PRICING_PLANS } from '../config/pricing';
import { couponService } from '../services/couponService';
import {
  X,
  Copy,
  Check,
  CheckCircle2,
  Clock,
  QrCode,
  ShieldCheck,
  RefreshCw,
  ArrowRight,
  AlertCircle,
  FlaskConical,
  ExternalLink,
  Gift
} from 'lucide-react';

interface MoMoPaymentModalProps {
  cycle: 'monthly' | 'yearly';
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const MoMoPaymentModal: React.FC<MoMoPaymentModalProps> = ({
  cycle,
  isOpen,
  onClose,
  onSuccess
}) => {
  const { user, upgradeToSandboxPro, loginWithGoogle } = useAuthStore();
  const [email, setEmail] = useState(user?.email || 'student@studyworkspace.io');
  const [order, setOrder] = useState<MoMoOrder | null>(null);
  const [copiedMemo, setCopiedMemo] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUnderReview, setIsUnderReview] = useState(false);
  const [isSandboxSuccess, setIsSandboxSuccess] = useState(false);
  const [timeLeft, setTimeLeft] = useState(900); // 15 phút đếm ngược
  const [imgError, setImgError] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [couponFeedback, setCouponFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [discountPercent, setDiscountPercent] = useState<number>(0);

  const planConfig = PRICING_PLANS[cycle];

  const handleApplyCoupon = () => {
    if (!couponInput.trim()) return;
    const res = couponService.redeemCoupon(couponInput, user);
    setCouponFeedback({ success: res.success, message: res.message });
    if (res.success) {
      if (res.coupon?.type === 'free_lifetime' || res.coupon?.type === 'free_days') {
        setIsSandboxSuccess(true);
        setTimeout(() => {
          onSuccess();
        }, 1500);
      } else if (res.discountPercent && order) {
        setDiscountPercent(res.discountPercent);
        const newAmount = Math.round(order.amount * (100 - res.discountPercent) / 100);
        setOrder({
          ...order,
          amount: newAmount,
          qrUrl: momoService.getQrImageUrl(newAmount, order.memo)
        });
      }
    }
  };

  // Khởi tạo đơn hàng MoMo khi modal mở
  useEffect(() => {
    if (isOpen) {
      const initialEmail = user?.email || email;
      const newOrder = momoService.createOrder(
        initialEmail,
        cycle,
        user?.id,
        user?.authProvider
      );
      setOrder(newOrder);
      setIsUnderReview(false);
      setIsSandboxSuccess(false);
      setTimeLeft(900);
      setImgError(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, cycle]);

  const handleQuickGoogleSignIn = async () => {
    try {
      const simulated = await googleAuthService.simulateGoogleLogin();
      await loginWithGoogle(simulated);
      setEmail(simulated.email);
    } catch (err) {
      console.warn('Lỗi đăng nhập Google nhanh trong modal:', err);
    }
  };

  // Bộ đếm ngược thời gian hết hạn đơn hàng
  useEffect(() => {
    if (!isOpen || isSandboxSuccess || isUnderReview || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, isSandboxSuccess, isUnderReview, timeLeft]);

  if (!isOpen || !order) return null;

  const formatCurrency = (amt: number) => {
    return amt.toLocaleString('vi-VN') + ' VNĐ';
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleCopy = (text: string, type: 'memo' | 'phone') => {
    navigator.clipboard.writeText(text);
    if (type === 'memo') {
      setCopiedMemo(true);
      setTimeout(() => setCopiedMemo(false), 2000);
    } else {
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    }
  };

  /**
   * NGUYÊN TẮC FAIL-CLOSED:
   * Khi người dùng bấm "Tôi đã chuyển khoản", hệ thống ghi nhận đơn vào trạng thái 'under_review'.
   * Tuyệt đối KHÔNG cấp quyền PRO thật sự tại client.
   */
  const handleConfirmTransfer = async () => {
    setIsProcessing(true);
    setTimeout(() => {
      const result = momoService.notifyUserTransferred(order.orderId);
      setIsProcessing(false);
      if (result.success && result.order) {
        setOrder(result.order);
        setIsUnderReview(true);
      }
    }, 800);
  };

  /**
   * CHẾ ĐỘ SANDBOX CHO DEVELOPER & QA:
   * Cho phép kích hoạt thử nghiệm tính năng PRO (`pro_sandbox`), được đánh dấu rõ ràng.
   */
  const handleSimulateSandbox = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const result = momoService.simulateSandboxPayment(order.orderId);
      setIsProcessing(false);
      if (result.success) {
        setIsSandboxSuccess(true);
        upgradeToSandboxPro(order.durationMonths);
      }
    }, 600);
  };

  return (
    <div
      data-testid="momo-payment-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto"
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-pink-500/30 bg-[#0f0e13] text-[#f4f4f5] shadow-[0_0_50px_rgba(216,45,139,0.2)] p-6 my-8">
        {/* Nút đóng */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition cursor-pointer"
        >
          <X size={18} />
        </button>

        {!isUnderReview && !isSandboxSuccess ? (
          <div>
            {/* Header thương hiệu MoMo & Thông tin VietQR */}
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-zinc-800">
              <div className="w-10 h-10 rounded-xl bg-[#a50064] flex items-center justify-center text-white font-bold text-sm shadow-md shadow-pink-900/30">
                MoMo
              </div>
              <div>
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <span>Thanh Toán MoMo QR</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
                    {cycle === 'yearly' ? 'Gói 1 Năm' : 'Gói 1 Tháng'}
                  </span>
                </h3>
                <p className="text-xs text-zinc-400">
                  Cổng mô phỏng Sandbox (Bản thử nghiệm Demo Beta)
                </p>
              </div>
            </div>

            {/* Cảnh báo Demo Beta — Không thu tiền thật */}
            <div data-testid="momo-beta-warning" className="mb-4 p-3 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-200 text-xs flex items-start gap-2.5">
              <AlertCircle size={16} className="text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <div className="font-semibold text-amber-300">DEMO BETA — KHÔNG THU TIỀN THẬT</div>
                <div className="text-[11px] leading-relaxed text-amber-200/90">
                  Hệ thống đang chạy bản thử nghiệm. Vui lòng <strong>KHÔNG chuyển tiền thật</strong> vào mã QR này. Bạn có thể nhấn <strong>"Kích Hoạt Thử Nghiệm Sandbox"</strong> để trải nghiệm đầy đủ tính năng PRO an toàn.
                </div>
              </div>
            </div>

            {/* Liên kết tài khoản đã xác thực hoặc Google */}
            <div className="mb-4 bg-zinc-900/60 border border-zinc-800 p-3.5 rounded-xl text-xs">
              {user ? (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-zinc-400">Tài khoản nhận gói PRO:</span>
                    <span className="flex items-center gap-1 font-semibold text-emerald-400 text-[11px]">
                      <CheckCircle2 size={13} />
                      Đã xác thực ({user.authProvider === 'google' ? 'Google' : 'Email'})
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 p-2 rounded-lg bg-black/40 border border-zinc-700/60">
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.displayName}
                        className="w-7 h-7 rounded-full object-cover border border-emerald-400/40"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-300 font-bold flex items-center justify-center text-xs">
                        {user.displayName.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1 truncate">
                      <div className="text-xs font-semibold text-white truncate">{user.displayName}</div>
                      <div className="text-[11px] font-mono text-zinc-400 truncate">{user.email}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex justify-between items-center mb-1 text-zinc-400">
                    <span>Tài khoản nhận gói PRO:</span>
                    <span className="font-mono text-amber-400 text-[11px]">Khách (Chưa đăng nhập)</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mb-2">
                    Khuyên dùng: Đăng nhập Google để tự động liên kết đơn hàng với tài khoản cá nhân:
                  </p>
                  <button
                    type="button"
                    data-testid="modal-google-signin-btn"
                    onClick={handleQuickGoogleSignIn}
                    className="w-full mb-3 py-1.5 px-3 rounded-lg bg-white hover:bg-neutral-100 text-neutral-900 font-medium text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>Tiếp tục với Google</span>
                  </button>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      const updated = momoService.createOrder(e.target.value, cycle);
                      setOrder(updated);
                    }}
                    className="w-full bg-black/40 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-pink-500"
                    placeholder="Nhập email của bạn để nhận hóa đơn"
                  />
                </div>
              )}
            </div>

            {/* Hộp Nhập Mã Coupon / Quà Tặng */}
            <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 mb-4 space-y-2 text-xs">
              <div className="flex items-center justify-between text-[11px] text-zinc-300">
                <span className="font-semibold flex items-center gap-1.5">
                  <Gift size={13} className="text-amber-400" />
                  <span>Mã Giảm Giá &amp; Quà Tặng (Coupon)</span>
                </span>
                {discountPercent > 0 && (
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold font-mono">
                    Đã giảm {discountPercent}%
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  placeholder="Nhập mã coupon (VD: PRO50)..."
                  className="flex-1 px-3 py-1.5 rounded-lg bg-black/40 border border-zinc-700 text-white font-mono text-xs uppercase focus:outline-none focus:border-amber-400"
                />
                <button
                  type="button"
                  data-testid="btn-apply-coupon"
                  onClick={handleApplyCoupon}
                  className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs transition cursor-pointer shrink-0"
                >
                  Áp Dụng
                </button>
              </div>
              {couponFeedback && (
                <div
                  className={`text-[11px] font-medium flex items-center gap-1.5 ${
                    couponFeedback.success ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {couponFeedback.success ? <Check size={12} /> : <AlertCircle size={12} />}
                  <span>{couponFeedback.message}</span>
                </div>
              )}
            </div>

            {/* Khung mã QR & Hướng dẫn */}
            <div className="flex flex-col items-center gap-4 p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800 mb-5 text-center">
              {/* QR Image Container (300-320px responsive, quiet zone) */}
              <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-2xl bg-white p-3.5 flex items-center justify-center shrink-0 shadow-2xl border border-zinc-200">
                {!imgError ? (
                  <img
                    src={order.qrUrl}
                    alt="Mã QR thanh toán VietQR / MoMo"
                    className="w-full h-full object-contain"
                    onError={() => setImgError(true)}
                  />
                ) : (
                  <div className="text-center p-4 text-zinc-800">
                    <QrCode size={56} className="mx-auto mb-2 text-[#a50064]" />
                    <span className="text-xs font-semibold block mb-2">
                      Không thể tải ảnh QR từ máy chủ
                    </span>
                    <button
                      type="button"
                      onClick={() => setImgError(false)}
                      className="px-3 py-1 rounded bg-zinc-900 text-white text-[11px] font-medium"
                    >
                      Thử lại
                    </button>
                  </div>
                )}
              </div>

              {/* QR Utility links: Mở ảnh riêng & Giải thích */}
              <div className="flex items-center gap-3 text-xs">
                <a
                  href={order.qrUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-pink-400 hover:text-pink-300 font-medium"
                >
                  <ExternalLink size={12} />
                  <span>Mở ảnh QR kích thước gốc</span>
                </a>
                <span className="text-zinc-600">•</span>
                <span className="text-[11px] text-zinc-400 font-mono">Chuẩn VietQR 320px</span>
              </div>

              {/* Thông tin chuyển khoản chi tiết */}
              <div className="space-y-3 text-xs w-full max-w-md text-left pt-2 border-t border-zinc-800/80">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Gói đăng ký ({planConfig.label}):</span>
                  <div className="text-right">
                    <span className="text-lg font-bold text-pink-400">
                      {formatCurrency(order.amount)}
                    </span>
                    <span className="text-[10px] text-zinc-500 block">
                      {planConfig.description}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-zinc-500 block text-[11px] mb-1">Nội dung đối soát (memo):</span>
                  <div className="flex items-center justify-between gap-1 bg-black/50 border border-zinc-700/80 rounded-lg px-2.5 py-1.5 font-mono text-white text-xs">
                    <span className="truncate font-semibold text-amber-300">{order.memo}</span>
                    <button
                      type="button"
                      data-testid="btn-copy-momo-memo"
                      onClick={() => handleCopy(order.memo, 'memo')}
                      className="p-1 hover:text-pink-400 text-zinc-400 transition cursor-pointer shrink-0"
                      title="Sao chép nội dung"
                    >
                      {copiedMemo ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-zinc-300 font-mono text-xs">
                  <span className="text-zinc-400">Người nhận:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-white">
                      {MOMO_CONFIG.displayPhone} ({MOMO_CONFIG.recipientName})
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(MOMO_CONFIG.phone, 'phone')}
                      className="p-1 hover:text-pink-400 text-zinc-400 transition cursor-pointer"
                      title="Sao chép số điện thoại"
                    >
                      {copiedPhone ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Trạng thái lắng nghe & Nút hành động */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-zinc-400 bg-pink-500/10 border border-pink-500/20 px-3.5 py-2 rounded-xl">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-pink-500 animate-ping" />
                  <span className="text-[11px] text-pink-300 font-medium">
                    Hệ thống đang chờ giao dịch chuyển khoản VietQR...
                  </span>
                </div>
                <div className="flex items-center gap-1 font-mono text-[11px] text-zinc-400">
                  <Clock size={12} />
                  <span>{formatTimer(timeLeft)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  data-testid="btn-confirm-momo-transfer"
                  disabled={isProcessing || timeLeft <= 0}
                  onClick={handleConfirmTransfer}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#a50064] to-[#d82d8b] hover:from-[#8e0056] hover:to-[#be2579] text-white font-semibold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-pink-900/30 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Đang ghi nhận yêu cầu đối soát...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={16} />
                      <span>Tôi Đã Chuyển Khoản Thành Công</span>
                    </>
                  )}
                </button>

                {/* Nút Sandbox rõ ràng cho Dev / Testing */}
                <button
                  type="button"
                  data-testid="btn-momo-simulate-sandbox"
                  onClick={handleSimulateSandbox}
                  className="w-full py-2 px-3 rounded-lg border border-dashed border-zinc-700 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-400 hover:text-white text-[11px] font-mono transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <FlaskConical size={13} className="text-amber-400" />
                  <span>Thử Nghiệm Kích Hoạt Sandbox (Dành Cho Tester &amp; QA)</span>
                </button>
              </div>

              <p className="text-[10px] text-zinc-500 text-center leading-tight">
                Lưu ý: Hệ thống đối soát tự động qua webhook máy chủ. Thao tác của người dùng không tự cấp quyền PRO thật để đảm bảo an toàn giao dịch.
              </p>
            </div>
          </div>
        ) : isUnderReview ? (
          /* Màn hình Trạng Thái Đang Chờ Đối Soát (Fail-Closed) */
          <div data-testid="momo-under-review-view" className="py-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-500 text-amber-400 flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(245,158,11,0.3)]">
              <Clock size={36} />
            </div>

            <div>
              <span className="text-[11px] font-mono text-amber-400 uppercase tracking-widest block mb-1">
                YÊU CẦU ĐANG CHỜ ĐỐI SOÁT
              </span>
              <h3 className="text-xl font-bold text-white mb-1">
                Đã Ghi Nhận Đơn Hàng Của Bạn
              </h3>
              <p className="text-xs text-zinc-300 max-w-sm mx-auto leading-relaxed">
                Đơn hàng <strong className="text-white">{order.orderId}</strong> đang được chờ xác nhận từ hệ thống ngân hàng MoMo.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs max-w-sm mx-auto text-left space-y-1.5 font-mono text-zinc-400">
              <div className="flex justify-between">
                <span>Mã đơn:</span>
                <span className="text-white font-semibold">{order.orderId}</span>
              </div>
              <div className="flex justify-between">
                <span>Trạng thái:</span>
                <span className="text-amber-400 font-semibold">Đang chờ đối soát (Pending Verification)</span>
              </div>
              <div className="flex justify-between">
                <span>Email liên kết:</span>
                <span className="text-zinc-200">{order.email}</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400 max-w-sm mx-auto flex items-start gap-2 text-left">
              <AlertCircle size={15} className="text-zinc-400 shrink-0 mt-0.5" />
              <span>
                Theo nguyên tắc bảo mật Fail-Closed, quyền PRO chính thức sẽ được kích hoạt tự động ngay sau khi máy chủ nhận được IPN Webhook hợp lệ từ MoMo.
              </span>
            </div>

            <div className="pt-2">
              <button
                type="button"
                data-testid="btn-momo-close-under-review"
                onClick={onClose}
                className="w-full max-w-sm mx-auto py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs transition cursor-pointer"
              >
                Đóng Cửa Sổ
              </button>
            </div>
          </div>
        ) : (
          /* Màn hình Chúc Mừng Kích Hoạt Sandbox Thành Công */
          <div data-testid="momo-success-view" className="py-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(16,185,129,0.4)]">
              <CheckCircle2 size={36} />
            </div>

            <div>
              <span className="text-[11px] font-mono text-emerald-400 uppercase tracking-widest block mb-1">
                [MÔ PHỎNG SANDBOX - PRO THỬ NGHIỆM]
              </span>
              <h3 className="text-xl font-bold text-white mb-1">
                Kích Hoạt Gói PRO Thành Công!
              </h3>
              <p className="text-xs text-zinc-300 max-w-sm mx-auto leading-relaxed">
                Tài khoản <strong className="text-white">{order.email}</strong> đã được nâng cấp lên gói <strong>PomoFocus PRO ({order.durationMonths === 12 ? '1 Năm' : '1 Tháng'})</strong>.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs max-w-sm mx-auto text-left space-y-1.5 font-mono text-zinc-400">
              <div className="flex justify-between">
                <span>Mã đơn hàng:</span>
                <span className="text-white font-semibold">{order.orderId}</span>
              </div>
              <div className="flex justify-between">
                <span>Thời hạn sử dụng:</span>
                <span className="text-emerald-400 font-semibold">
                  {order.durationMonths === 12 ? '365 Ngày' : '30 Ngày'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Trạng thái:</span>
                <span className="text-emerald-400 font-semibold">Đã kích hoạt Sandbox ✓</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                data-testid="btn-momo-go-to-workspace"
                onClick={() => {
                  onSuccess();
                  onClose();
                }}
                className="w-full max-w-sm mx-auto py-3 px-4 rounded-xl bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                <span>Vào Không Gian Học PRO Ngay</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
