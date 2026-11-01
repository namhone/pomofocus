import React, { useState, useEffect, useRef } from 'react';
import { momoService, MoMoOrder, MOMO_CONFIG } from '../services/momoService';
import { useAuthStore } from '../stores/useAuthStore';
import { googleAuthService } from '../services/googleAuthService';
import { PRICING_PLANS, PlanCycle } from '../config/pricing';
import { couponService } from '../services/couponService';
import { triggerConfetti } from '../utils/confetti';
import { supabase } from '../lib/supabase';
import {
  X,
  Copy,
  Check,
  CheckCircle2,
  Clock,
  QrCode,
  RefreshCw,
  ArrowRight,
  AlertCircle,
  FlaskConical,
  Gift,
  Smartphone,
  Sparkles
} from 'lucide-react';

interface MoMoPaymentModalProps {
  cycle: PlanCycle;
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
  const { user, activateProFromPayment, loginWithGoogle } = useAuthStore();
  const [email, setEmail] = useState(user?.email || 'student@studyworkspace.io');
  const [order, setOrder] = useState<MoMoOrder | null>(null);
  const [copiedMemo, setCopiedMemo] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccessState, setIsSuccessState] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 phút đếm ngược (600 giây)
  const [imgError, setImgError] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [couponFeedback, setCouponFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const pollTimerRef = useRef<any>(null);

  const planConfig = PRICING_PLANS[cycle] || PRICING_PLANS.monthly;

  // 1. Khởi tạo đơn hàng MoMo khi mở modal
  useEffect(() => {
    if (isOpen) {
      const initialEmail = user?.email || email;
      const initialOrder = momoService.createOrder(
        initialEmail,
        cycle,
        user?.id,
        user?.authProvider
      );
      setOrder(initialOrder);
      setIsSuccessState(false);
      setTimeLeft(600); // 10:00
      setImgError(false);

      // Thử gọi backend tạo link online API MoMo
      momoService.createOnlinePayment({
        userId: user?.id,
        userEmail: initialEmail,
        cycle,
        returnUrl: typeof window !== 'undefined' ? window.location.href : undefined
      }).then((res) => {
        if (res && res.orderId) {
          setOrder((prev) => prev ? {
            ...prev,
            orderId: res.orderId,
            qrUrl: res.qrCodeUrl || prev.qrUrl,
            payUrl: res.payUrl || prev.payUrl,
            deeplink: res.deeplink || prev.deeplink,
            amount: res.amount || prev.amount
          } : null);

          if (res.freeGranted) {
            handlePaymentSuccess(res.orderId, null);
          }
        }
      }).catch((err) => {
        console.warn('Lỗi gọi API create-payment:', err);
      });
    }

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, cycle]);

  // 2. Kích hoạt thành công & Confetti
  const handlePaymentSuccess = (_orderId: string, proExpiresAt?: string | null) => {
    if (isSuccessState) return;
    setIsSuccessState(true);
    triggerConfetti(3500);

    const planType = cycle === 'yearly' ? '1_year' : cycle === 'lifetime' ? 'lifetime' : '1_month';
    activateProFromPayment(planType, proExpiresAt);

    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
  };

  // 3. Tự động kiểm tra trạng thái thanh toán (Realtime Auto-detection mỗi 2.5s)
  useEffect(() => {
    if (!isOpen || isSuccessState || !order) return;

    // Polling API check-status
    pollTimerRef.current = setInterval(async () => {
      try {
        const res = await momoService.checkPaymentStatus(order.orderId, user?.id);
        if (res.isPaid || res.isPro) {
          handlePaymentSuccess(order.orderId, res.proExpiresAt);
        }
      } catch (err) {
        console.warn('Lỗi kiểm tra trạng thái thanh toán:', err);
      }
    }, 2500);

    // Lắng nghe Supabase Realtime channel nếu có kết nối
    let channel: any = null;
    try {
      if (user?.id) {
        channel = supabase.channel(`entitlement_${user.id}`);
        channel.on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'user_entitlements',
          filter: `user_id=eq.${user.id}`
        }, (payload: any) => {
          if (payload.new && payload.new.is_pro) {
            handlePaymentSuccess(order.orderId, payload.new.pro_expires_at);
          }
        }).subscribe();
      }
    } catch {
      // realtime fallback
    }

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (channel) supabase.removeChannel(channel);
    };
  }, [isOpen, isSuccessState, order?.orderId, user?.id]);

  // 4. Đồng hồ đếm ngược 10:00 (hết hạn đơn sau 600s)
  useEffect(() => {
    if (!isOpen || isSuccessState || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, isSuccessState, timeLeft]);

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

  const handleApplyCoupon = () => {
    if (!couponInput.trim()) return;
    const res = couponService.redeemCoupon(couponInput, user);
    setCouponFeedback({ success: res.success, message: res.message });
    if (res.success) {
      if (res.coupon?.type === 'free_lifetime' || res.coupon?.type === 'free_days') {
        handlePaymentSuccess(order.orderId, null);
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

  const handleQuickGoogleSignIn = async () => {
    try {
      const simulated = await googleAuthService.simulateGoogleLogin();
      await loginWithGoogle(simulated);
      setEmail(simulated.email);
    } catch (err) {
      console.warn('Lỗi đăng nhập Google nhanh:', err);
    }
  };

  // 5. Mô phỏng thanh toán thành công (Sandbox Demo)
  const handleSimulatePaymentSuccess = async () => {
    setIsProcessing(true);
    try {
      const planType = cycle === 'yearly' ? '1_year' : cycle === 'lifetime' ? 'lifetime' : '1_month';
      const durationDays = planConfig.durationDays;
      await momoService.simulateOnlinePayment({
        orderId: order.orderId,
        userId: user?.id || 'demo_user',
        planType,
        durationDays,
        amount: order.amount
      });
      setIsProcessing(false);
      handlePaymentSuccess(order.orderId, null);
    } catch {
      setIsProcessing(false);
      handlePaymentSuccess(order.orderId, null);
    }
  };

  return (
    <div
      data-testid="momo-payment-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto"
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 text-zinc-100 shadow-2xl p-6 my-8 selection:bg-white selection:text-black">
        {/* Nút đóng */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 transition cursor-pointer"
        >
          <X size={18} />
        </button>

        {!isSuccessState ? (
          <div className="space-y-4">
            {/* Header: Thanh toán MoMo All-in-One (Monochrome) */}
            <div className="flex items-center gap-3 pb-3 border-b border-zinc-800">
              <div className="w-10 h-10 rounded-xl bg-white text-black font-extrabold text-sm flex items-center justify-center shadow-md">
                MoMo
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Thanh Toán MoMo QR</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                    {planConfig.label}
                  </span>
                </h3>
                <p className="text-xs text-zinc-400">
                  Tự động kích hoạt gói PRO ngay sau khi quét mã
                </p>
              </div>
            </div>

            {/* Thông tin tài khoản nhận PRO */}
            <div className="bg-zinc-950/60 border border-zinc-800 p-3 rounded-xl text-xs">
              {user ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 truncate">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.displayName} className="w-7 h-7 rounded-full object-cover border border-zinc-700" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-zinc-800 text-zinc-200 font-bold flex items-center justify-center text-xs">
                        {user.displayName.charAt(0)}
                      </div>
                    )}
                    <div className="truncate">
                      <div className="text-xs font-semibold text-white truncate">{user.displayName}</div>
                      <div className="text-[11px] font-mono text-zinc-400 truncate">{user.email}</div>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 font-mono text-emerald-400 text-[11px] shrink-0">
                    <CheckCircle2 size={13} />
                    <span>Đã xác thực</span>
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-zinc-400 text-[11px]">Chưa đăng nhập:</span>
                  <button
                    type="button"
                    onClick={handleQuickGoogleSignIn}
                    className="py-1 px-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-[11px] flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <span>Liên kết Google</span>
                  </button>
                </div>
              )}
            </div>

            {/* Hộp mã QR trung tâm & Đồng hồ đếm ngược */}
            <div className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-zinc-950 border border-zinc-800 text-center">
              {/* Đồng hồ đếm ngược 10:00 */}
              <div className="inline-flex items-center gap-1.5 font-mono text-xs text-zinc-400 bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-full">
                <Clock size={12} className="text-amber-400" />
                <span>Mã QR hết hạn sau:</span>
                <span className="font-bold text-amber-300">{formatTimer(timeLeft)}</span>
              </div>

              {/* Khung Mã QR Động */}
              <div className="relative w-56 h-56 sm:w-64 sm:h-64 rounded-2xl bg-white p-3 flex items-center justify-center shadow-xl border border-zinc-200">
                {!imgError ? (
                  <img
                    src={order.qrUrl}
                    alt="Mã QR thanh toán MoMo"
                    className="w-full h-full object-contain"
                    onError={() => setImgError(true)}
                  />
                ) : (
                  <div className="text-center p-4 text-zinc-800">
                    <QrCode size={48} className="mx-auto mb-2 text-zinc-900" />
                    <span className="text-xs font-medium block">Không thể tải ảnh QR</span>
                    <button
                      type="button"
                      onClick={() => setImgError(false)}
                      className="mt-2 px-2.5 py-1 rounded bg-black text-white text-[11px]"
                    >
                      Thử lại
                    </button>
                  </div>
                )}
              </div>

              {/* Nút bấm trên thiết bị di động: Mở App MoMo Để Thanh Toán */}
              <a
                href={order.deeplink || order.payUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full max-w-xs py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg cursor-pointer"
              >
                <Smartphone size={15} />
                <span>Mở App MoMo Để Thanh Toán</span>
              </a>

              {/* Hướng dẫn 3 bước chuẩn */}
              <div className="w-full max-w-sm pt-2 text-left">
                <div className="text-[11px] font-semibold text-zinc-300 mb-1.5">
                  Hướng dẫn thanh toán 3 bước:
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800">
                    <span className="block text-[10px] font-mono text-zinc-500 mb-0.5">BƯỚC 1</span>
                    <span className="text-[11px] font-medium text-zinc-200">Mở app MoMo</span>
                  </div>
                  <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800">
                    <span className="block text-[10px] font-mono text-zinc-500 mb-0.5">BƯỚC 2</span>
                    <span className="text-[11px] font-medium text-zinc-200">Quét mã QR</span>
                  </div>
                  <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800">
                    <span className="block text-[10px] font-mono text-zinc-500 mb-0.5">BƯỚC 3</span>
                    <span className="text-[11px] font-medium text-zinc-200">Hoàn tất</span>
                  </div>
                </div>
              </div>

              {/* Chi tiết số tiền & Memo */}
              <div className="w-full max-w-sm pt-2 border-t border-zinc-800/80 text-xs space-y-2 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Số tiền thanh toán:</span>
                  <span className="text-base font-extrabold text-white">
                    {formatCurrency(order.amount)}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[11px] mb-1">Nội dung chuyển khoản (Memo):</span>
                  <div className="flex items-center justify-between gap-1 bg-black/60 border border-zinc-800 rounded-lg px-2.5 py-1.5 font-mono text-white text-xs">
                    <span className="truncate font-semibold text-zinc-200">{order.memo}</span>
                    <button
                      type="button"
                      data-testid="btn-copy-momo-memo"
                      onClick={() => handleCopy(order.memo, 'memo')}
                      className="p-1 hover:text-white text-zinc-400 transition cursor-pointer shrink-0"
                    >
                      {copiedMemo ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-zinc-300 font-mono text-xs">
                  <span className="text-zinc-400">Số MoMo:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-white">
                      {MOMO_CONFIG.displayPhone} ({MOMO_CONFIG.recipientName})
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(MOMO_CONFIG.phone, 'phone')}
                      className="p-1 hover:text-white text-zinc-400 transition cursor-pointer"
                      title="Sao chép số điện thoại"
                    >
                      {copiedPhone ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Hộp nhập Coupon */}
            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs space-y-2">
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
                  className="flex-1 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-white font-mono text-xs uppercase focus:outline-none focus:border-white"
                />
                <button
                  type="button"
                  data-testid="btn-apply-coupon"
                  onClick={handleApplyCoupon}
                  className="px-3.5 py-1.5 rounded-lg bg-zinc-100 hover:bg-white text-black font-bold text-xs transition cursor-pointer shrink-0"
                >
                  Áp Dụng
                </button>
              </div>
              {couponFeedback && (
                <div className={`text-[11px] font-medium flex items-center gap-1.5 ${couponFeedback.success ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {couponFeedback.success ? <Check size={12} /> : <AlertCircle size={12} />}
                  <span>{couponFeedback.message}</span>
                </div>
              )}
            </div>

            {/* Lắng nghe thời gian thực & Nút Mô Phỏng Sandbox */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between text-xs text-zinc-400 bg-zinc-950 border border-zinc-800 px-3.5 py-2 rounded-xl">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-[11px] text-zinc-300 font-medium">
                    Đang tự động lắng nghe giao dịch MoMo...
                  </span>
                </div>
                <span className="text-[10px] font-mono text-zinc-500">Auto-Detect 2.5s</span>
              </div>

              {/* Nút Sandbox cho Developer & QA */}
              <button
                type="button"
                data-testid="btn-momo-simulate-sandbox"
                disabled={isProcessing}
                onClick={handleSimulatePaymentSuccess}
                className="w-full py-2.5 px-3 rounded-xl border border-dashed border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-mono transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw size={13} className="animate-spin text-amber-400" />
                    <span>Đang kích hoạt mô phỏng...</span>
                  </>
                ) : (
                  <>
                    <FlaskConical size={14} className="text-amber-400" />
                    <span>Mô Phỏng Quét Mã Thành Công (Sandbox Test)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* MÀN HÌNH CHÚC MỪNG NÂNG CẤP PRO THÀNH CÔNG (CONFETTI ACTIVE) */
          <div data-testid="momo-success-view" className="py-6 text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(255,255,255,0.4)]">
              <Sparkles size={32} />
            </div>

            <div>
              <span className="text-[11px] font-mono text-emerald-400 uppercase tracking-widest block mb-1">
                THANH TOÁN THÀNH CÔNG 🎉
              </span>
              <h3 className="text-2xl font-extrabold text-white mb-1.5">
                Chúc Mừng Bạn Đã Được Nâng Cấp Lên Gói PRO!
              </h3>
              <p className="text-xs text-zinc-300 max-w-sm mx-auto leading-relaxed">
                Tài khoản của bạn đã được mở khóa toàn bộ quyền lợi PRO, Bảng vẽ chung thời gian thực, và không gian học nhóm Meet không giới hạn.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs max-w-sm mx-auto text-left space-y-2 font-mono text-zinc-400">
              <div className="flex justify-between">
                <span>Mã đơn hàng:</span>
                <span className="text-white font-semibold">{order.orderId}</span>
              </div>
              <div className="flex justify-between">
                <span>Gói dịch vụ:</span>
                <span className="text-emerald-400 font-semibold">{planConfig.label}</span>
              </div>
              <div className="flex justify-between">
                <span>Trạng thái:</span>
                <span className="text-emerald-400 font-semibold">Đã kích hoạt PRO tức thì ✓</span>
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
                className="w-full max-w-sm mx-auto py-3 px-4 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-xl"
              >
                <span>Bắt Đầu Trải Nghiệm PRO Ngay</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
