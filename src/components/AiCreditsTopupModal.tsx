import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { X, Zap, CheckCircle2, Copy, ShieldCheck, QrCode, Loader2, Sparkles, RefreshCw, Clock, History, AlertCircle, ArrowRight } from 'lucide-react';
import { useAiStore, AI_CREDIT_PACKS } from '../stores/useAiStore';
import { resolveApiUrl } from '../utils/apiConfig';
import { useAuthStore } from '../stores/useAuthStore';
import { supabase } from '../lib/supabase';

interface AiCreditsTopupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PendingCreditOrderCache {
  orderCode: string;
  amount: number;
  creditsToAdd: number;
  expiresAt: string;
  createdAt: string;
  vietQrUrl?: string;
  userId: string;
}

interface OrderHistoryItem {
  id?: string;
  orderCode: string;
  amount: number;
  creditsToAdd: number;
  status: 'pending' | 'completed' | 'expired';
  createdAt: string;
  completedAt?: string;
  expiresAt?: string;
}

const STORAGE_PENDING_ORDER_PREFIX = 'pomofocus_pending_credit_order_';

export function calculateCreditPrice(credits: number): {
  unitPrice: number;
  discountPercent: number;
  discountBadge: string | null;
  originalPrice: number;
  finalPrice: number;
} {
  const safeCredits = Math.max(50, Math.round(credits));

  // 1. Khớp chính xác 4 gói chuẩn nếu được chọn
  if (safeCredits === 300) {
    return {
      unitPrice: 63,
      discountPercent: 0,
      discountBadge: null,
      originalPrice: 19000,
      finalPrice: 19000
    };
  }
  if (safeCredits === 700) {
    return {
      unitPrice: 56,
      discountPercent: 15,
      discountBadge: 'Tiết kiệm 15%',
      originalPrice: 45000,
      finalPrice: 39000
    };
  }
  if (safeCredits === 1500) {
    return {
      unitPrice: 46,
      discountPercent: 28,
      discountBadge: 'Tiết kiệm 28%',
      originalPrice: 95000,
      finalPrice: 69000
    };
  }
  if (safeCredits === 4000) {
    return {
      unitPrice: 37,
      discountPercent: 40,
      discountBadge: 'Tiết kiệm 40%',
      originalPrice: 250000,
      finalPrice: 149000
    };
  }

  // 2. Tính toán linh hoạt theo bậc thang chiết khấu cho thanh kéo Slider
  let unitPrice = 63.33;
  let discountPercent = 0;
  let discountBadge: string | null = null;

  if (safeCredits >= 3000) {
    unitPrice = 37.25;
    discountPercent = 40;
    discountBadge = 'Tiết kiệm 40%';
  } else if (safeCredits >= 1000) {
    unitPrice = 46;
    discountPercent = 28;
    discountBadge = 'Tiết kiệm 28%';
  } else if (safeCredits >= 500) {
    unitPrice = 55.71;
    discountPercent = 15;
    discountBadge = 'Tiết kiệm 15%';
  }

  const rawOriginal = safeCredits * (19000 / 300);
  const originalPrice = Math.max(Math.round(rawOriginal / 1000) * 1000, 10000);
  const rawFinal = safeCredits * unitPrice;
  const finalPrice = Math.max(Math.round(rawFinal / 1000) * 1000, 10000);

  return {
    unitPrice: Math.round(unitPrice),
    discountPercent,
    discountBadge,
    originalPrice: discountPercent > 0 ? originalPrice : finalPrice,
    finalPrice
  };
}

// =============================================================================
// SUB-COMPONENT: Countdown Timer độc lập (Nhịp nhảy giây KHÔNG re-render modal cha)
// =============================================================================
interface OrderCountdownTimerProps {
  expiresAt: string | null;
  onExpire?: () => void;
}

const OrderCountdownTimer = React.memo<OrderCountdownTimerProps>(({ expiresAt, onExpire }) => {
  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    if (!expiresAt) return 900;
    return Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
  });

  useEffect(() => {
    if (!expiresAt) return;
    const calc = () => Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
    setSecondsLeft(calc());

    const timer = setInterval(() => {
      const left = calc();
      setSecondsLeft(left);
      if (left <= 0) {
        clearInterval(timer);
        onExpire?.();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt, onExpire]);

  const m = Math.floor(secondsLeft / 60);
  const s = secondsLeft % 60;
  const formatted = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

  return (
    <span
      data-testid="ai-order-countdown"
      className={`font-mono font-bold ${secondsLeft < 120 ? 'text-rose-400' : 'text-zinc-300'}`}
    >
      {formatted}
    </span>
  );
});
OrderCountdownTimer.displayName = 'OrderCountdownTimer';

// =============================================================================
// SUB-COMPONENT: VietQrDisplay ổn định 100% (Zero Flicker, Zero Reload Loop)
// =============================================================================
interface VietQrDisplayProps {
  qrUrl: string;
  isLoading: boolean;
  orderCode: string;
  amount: number;
}

const VietQrDisplay = React.memo<VietQrDisplayProps>(({ qrUrl, isLoading, orderCode }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const currentQrUrlRef = useRef<string>('');

  useEffect(() => {
    if (qrUrl && qrUrl !== currentQrUrlRef.current) {
      currentQrUrlRef.current = qrUrl;
      setImageLoaded(false);
      setHasError(false);
    }
  }, [qrUrl]);

  return (
    <div className="p-2 bg-white rounded-xl shrink-0 shadow-md min-w-[140px] min-h-[140px] flex items-center justify-center relative">
      {(isLoading || !qrUrl || (!imageLoaded && !hasError)) && (
        <div className="absolute inset-0 bg-white/95 backdrop-blur-[2px] flex flex-col items-center justify-center rounded-xl z-10 space-y-1">
          <Loader2 size={22} className="animate-spin text-zinc-600" />
          <span className="text-[9px] text-zinc-500 font-medium">Đang tải mã VietQR...</span>
        </div>
      )}
      {!hasError && qrUrl ? (
        <img
          key={orderCode || qrUrl}
          src={qrUrl}
          alt="VietQR SePay VPBank"
          data-testid="ai-vietqr-image"
          loading="eager"
          decoding="async"
          onLoad={() => setImageLoaded(true)}
          onError={() => {
            // Chặn tuyệt đối vòng lặp tải lại: khi ảnh lỗi chỉ fallback sang text số tài khoản
            setHasError(true);
            setImageLoaded(false);
          }}
          className={`w-32 h-32 object-contain rounded transition-opacity duration-200 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ) : (
        <div className="w-32 h-32 flex flex-col items-center justify-center text-center p-2 text-zinc-900 bg-zinc-100 rounded">
          <QrCode size={28} className="text-zinc-600 mb-1" />
          <span className="text-[10px] font-bold text-zinc-800">VPBank (SePay VA)</span>
          <span className="text-[11px] font-mono font-black text-emerald-700">AGBSPTJE34IA3A8SAAX</span>
          <span className="text-[9px] text-zinc-600 mt-1">Quét mã bằng App Ngân Hàng</span>
        </div>
      )}
    </div>
  );
});
VietQrDisplay.displayName = 'VietQrDisplay';

// =============================================================================
// MAIN COMPONENT: AiCreditsTopupModal
// =============================================================================
export const AiCreditsTopupModal: React.FC<AiCreditsTopupModalProps> = ({ isOpen, onClose }) => {
  const { aiCreditsBalance, refreshCreditsFromCloud, topupModalInitialCredits } = useAiStore();
  const { user } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'topup' | 'history'>('topup');

  // Khởi tạo credits thông minh: nếu có cache còn hạn thì lấy từ cache, tránh nhảy giá khi mở modal
  const [selectedCredits, setSelectedCredits] = useState<number>(() => {
    if (typeof window !== 'undefined' && user?.id) {
      try {
        const raw = localStorage.getItem(STORAGE_PENDING_ORDER_PREFIX + user.id);
        if (raw) {
          const cached = JSON.parse(raw);
          if (cached.expiresAt && new Date(cached.expiresAt).getTime() > Date.now() && cached.creditsToAdd) {
            return cached.creditsToAdd;
          }
        }
      } catch {}
    }
    return topupModalInitialCredits || 1500;
  });

  const [orderCode, setOrderCode] = useState<string>('');
  const [orderExpiresAt, setOrderExpiresAt] = useState<string | null>(null);
  const [isOrderFromCache, setIsOrderFromCache] = useState<boolean>(false);
  const [serverQrUrl, setServerQrUrl] = useState<string>('');
  const [isLoadingOrder, setIsLoadingOrder] = useState<boolean>(false);
  const [paymentCompleted, setPaymentCompleted] = useState<boolean>(false);
  const [completedCredits, setCompletedCredits] = useState<number>(0);
  const [copiedMemo, setCopiedMemo] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);

  // Status check & Order history
  const [isCheckingStatus, setIsCheckingStatus] = useState<boolean>(false);
  const [checkStatusFeedback, setCheckStatusFeedback] = useState<string | null>(null);
  const [orderHistory, setOrderHistory] = useState<OrderHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);

  const pollIntervalRef = useRef<any>(null);
  const feedbackTimeoutRef = useRef<any>(null);
  const debounceTimerRef = useRef<any>(null);

  // ===========================================================================
  // KHÓA YÊU CẦU & BỘ NHỚ ĐƠN HÀNG TRONG PHIÊN (Request Guard & In-Memory Map)
  // Ngăn chặn 100% việc spam request create-order và sinh mã PF ngẫu nhiên lặp lại
  // ===========================================================================
  const inFlightRef = useRef<boolean>(false);
  const activeKeyRef = useRef<string>('');
  const sessionOrderCacheRef = useRef<Map<string, PendingCreditOrderCache>>(new Map());

  const { originalPrice, finalPrice, discountBadge, discountPercent } = calculateCreditPrice(selectedCredits);

  // Nội dung chuyển khoản hiển thị: CẤM TUYỆT ĐỐI việc tự sinh mã ngẫu nhiên ở client
  const displayMemo = orderCode ? orderCode : (isLoadingOrder ? 'Đang tạo mã...' : '');
  const effectiveQrUrl = useMemo(() => {
    if (serverQrUrl) return serverQrUrl;
    if (!orderCode) return '';
    return `https://vietqr.app/img?acc=AGBSPTJE34IA3A8SAAX&bank=VPBank&amount=${finalPrice}&des=${encodeURIComponent(
      orderCode
    )}`;
  }, [serverQrUrl, orderCode, finalPrice]);

  // Luôn lắng nghe phím Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen, onClose]);

  // ===========================================================================
  // DUY NHẤT 1 EFFECT ĐỒNG BỘ ĐƠN HÀNG VỚI `selectedCredits` (State Singularity)
  // ===========================================================================
  useEffect(() => {
    if (!isOpen || !user?.id || user.id === 'guest' || user.id === 'guest_user' || (user as any).isGuest) return;

    const targetCredits = selectedCredits;
    const { finalPrice: targetPrice } = calculateCreditPrice(targetCredits);
    const requestKey = `${user.id}_${targetPrice}_${targetCredits}`;

    // 1. Đang hiển thị đúng đơn này rồi -> Giữ nguyên 100%, không làm gì cả
    if (activeKeyRef.current === requestKey && orderCode) {
      return;
    }

    // 2. Kiểm tra bộ nhớ phiên (Session In-Memory Cache): Tái sử dụng lập tức, 0 network call
    const memCached = sessionOrderCacheRef.current.get(requestKey);
    if (memCached && new Date(memCached.expiresAt).getTime() > Date.now()) {
      activeKeyRef.current = requestKey;
      setOrderCode(memCached.orderCode);
      setOrderExpiresAt(memCached.expiresAt);
      if (memCached.vietQrUrl) setServerQrUrl(memCached.vietQrUrl);
      setIsLoadingOrder(false);
      return;
    }

    // 3. Kiểm tra localStorage (F5 persistence)
    try {
      const raw = localStorage.getItem(STORAGE_PENDING_ORDER_PREFIX + user.id);
      if (raw) {
        const cached: PendingCreditOrderCache = JSON.parse(raw);
        const expiresTime = new Date(cached.expiresAt).getTime();
        if (expiresTime > Date.now() && cached.orderCode && cached.amount === targetPrice) {
          activeKeyRef.current = requestKey;
          sessionOrderCacheRef.current.set(requestKey, cached);
          setOrderCode(cached.orderCode);
          setOrderExpiresAt(cached.expiresAt);
          if (cached.vietQrUrl) setServerQrUrl(cached.vietQrUrl);
          setIsOrderFromCache(true);
          setIsLoadingOrder(false);
          return;
        }
      }
    } catch {}

    // 4. Debounce 250ms để chống spam mạng khi người dùng kéo thanh slider liên tục
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    setIsLoadingOrder(true);
    setPaymentCompleted(false);

    debounceTimerRef.current = setTimeout(async () => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;

      try {
        const res = await fetch(resolveApiUrl('/api/payment/create-order'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            userEmail: user.email,
            amount: targetPrice,
            creditsToAdd: targetCredits
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (data?.orderCode) {
            activeKeyRef.current = requestKey;
            setOrderCode(data.orderCode);
            const expires = data.expiresAt || new Date(Date.now() + 15 * 60 * 1000).toISOString();
            setOrderExpiresAt(expires);
            const qr = data.vietQrUrl || `https://vietqr.app/img?acc=AGBSPTJE34IA3A8SAAX&bank=VPBank&amount=${targetPrice}&des=${encodeURIComponent(data.orderCode)}`;
            setServerQrUrl(qr);
            setIsOrderFromCache(false);

            const cacheItem: PendingCreditOrderCache = {
              orderCode: data.orderCode,
              amount: targetPrice,
              creditsToAdd: targetCredits,
              expiresAt: expires,
              createdAt: data.createdAt || new Date().toISOString(),
              vietQrUrl: qr,
              userId: user.id
            };
            sessionOrderCacheRef.current.set(requestKey, cacheItem);
            try {
              localStorage.setItem(STORAGE_PENDING_ORDER_PREFIX + user.id, JSON.stringify(cacheItem));
            } catch {}
          }
        }
      } catch (err) {
        console.warn('[TopupModal] Error creating order:', err);
      } finally {
        inFlightRef.current = false;
        setIsLoadingOrder(false);
      }
    }, 250);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [isOpen, user?.id, selectedCredits]);

  // ===========================================================================
  // KIỂM TRA TRẠNG THÁI ĐƠN HÀNG (Polling & Manual Check)
  // ===========================================================================
  const checkOrderStatus = useCallback(async (isManual: boolean = false) => {
    if (!orderCode) return;
    if (isManual) setIsCheckingStatus(true);

    try {
      // 1. Kiểm tra qua Backend API /api/payment/check-status
      const res = await fetch(resolveApiUrl(`/api/payment/check-status?orderCode=${encodeURIComponent(orderCode)}&userId=${encodeURIComponent(user?.id || '')}`));
      if (res.ok) {
        const data = await res.json();
        if (data?.isPaid || data?.order?.status === 'completed') {
          setPaymentCompleted(true);
          setCompletedCredits(data?.order?.creditsToAdd || selectedCredits);
          if (user?.id) {
            try {
              localStorage.removeItem(STORAGE_PENDING_ORDER_PREFIX + user.id);
            } catch {}
            await refreshCreditsFromCloud(user.id);
          }
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          if (isManual) setCheckStatusFeedback(null);
          return;
        }
      }

      // 2. Fallback kiểm tra trực tiếp Supabase
      const { data: dbOrder, error } = await supabase
        .from('payment_orders')
        .select('status, credits_to_add')
        .eq('order_code', orderCode)
        .maybeSingle();

      if (!error && dbOrder?.status === 'completed') {
        setPaymentCompleted(true);
        setCompletedCredits(dbOrder?.credits_to_add || selectedCredits);
        if (user?.id) {
          try {
            localStorage.removeItem(STORAGE_PENDING_ORDER_PREFIX + user.id);
          } catch {}
          await refreshCreditsFromCloud(user.id);
        }
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        if (isManual) setCheckStatusFeedback(null);
        return;
      }

      if (isManual) {
        setCheckStatusFeedback('Chưa nhận được giao dịch từ ngân hàng. Quá trình xử lý liên ngân hàng có thể mất 60 – 90 giây, vui lòng chờ trong giây lát!');
        if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
        feedbackTimeoutRef.current = setTimeout(() => setCheckStatusFeedback(null), 6000);
      }
    } catch (err) {
      if (isManual) {
        setCheckStatusFeedback('Không thể kết nối đến máy chủ kiểm tra. Vui lòng thử lại sau vài giây.');
        if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
        feedbackTimeoutRef.current = setTimeout(() => setCheckStatusFeedback(null), 5000);
      }
    } finally {
      if (isManual) setIsCheckingStatus(false);
    }
  }, [orderCode, selectedCredits, user?.id, refreshCreditsFromCloud]);

  // Polling tự động mỗi 4 giây & Instant Resume check khi focus lại tab
  useEffect(() => {
    if (!isOpen || !orderCode || paymentCompleted) {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      return;
    }

    pollIntervalRef.current = setInterval(() => {
      checkOrderStatus(false);
    }, 4000);

    const handleResume = () => {
      if (document.visibilityState === 'visible') {
        checkOrderStatus(false);
      }
    };

    document.addEventListener('visibilitychange', handleResume);
    window.addEventListener('pageshow', handleResume);
    window.addEventListener('focus', handleResume);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      document.removeEventListener('visibilitychange', handleResume);
      window.removeEventListener('pageshow', handleResume);
      window.removeEventListener('focus', handleResume);
    };
  }, [isOpen, orderCode, paymentCompleted, checkOrderStatus]);

  // Tải lịch sử nạp tiền gần đây của người dùng
  const fetchOrderHistory = useCallback(async () => {
    if (!user?.id || user.id === 'guest' || user.id === 'guest_user') return;
    setIsLoadingHistory(true);
    try {
      const res = await fetch(resolveApiUrl(`/api/payment/check-status?userId=${encodeURIComponent(user.id)}&history=true`));
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.recentOrders)) {
          setOrderHistory(data.recentOrders);
        }
      }
    } catch (err) {
      console.warn('[TopupModal] Error fetching order history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [user?.id]);

  // Hủy đơn đang lưu và tạo đơn hàng mới
  const handleCancelAndCreateNew = () => {
    if (user?.id) {
      try {
        localStorage.removeItem(STORAGE_PENDING_ORDER_PREFIX + user.id);
      } catch {}
    }
    setOrderCode('');
    activeKeyRef.current = '';
    sessionOrderCacheRef.current.clear();
    setIsOrderFromCache(false);
    // Kích hoạt effect tạo đơn mới cho mức credits hiện tại
    setSelectedCredits((prev) => prev);
  };

  // Khôi phục đơn pending từ tab lịch sử
  const handleResumePendingOrder = (item: OrderHistoryItem) => {
    setOrderCode(item.orderCode);
    const { finalPrice: targetPrice } = calculateCreditPrice(item.creditsToAdd);
    activeKeyRef.current = `${user?.id}_${targetPrice}_${item.creditsToAdd}`;
    setSelectedCredits(item.creditsToAdd);
    if (item.expiresAt) {
      setOrderExpiresAt(item.expiresAt);
    }
    setIsOrderFromCache(true);
    setActiveTab('topup');
  };

  const handleExpireOrder = useCallback(() => {
    if (user?.id) {
      try {
        localStorage.removeItem(STORAGE_PENDING_ORDER_PREFIX + user.id);
      } catch {}
    }
  }, [user?.id]);

  if (!isOpen) return null;

  // Chặn khách chưa đăng nhập nạp tiền
  if (!user?.id || user.id === 'guest' || user.id === 'guest_user' || (user as any).isGuest) {
    return (
      <div
        data-testid="ai-credits-topup-modal"
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      >
        <div className="relative z-[101] w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 text-center text-white space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold">Đăng nhập để Nạp Năng Lượng ⚡</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Vui lòng đăng nhập tài khoản trước khi nạp để đảm bảo số dư ⚡ được lưu trữ vĩnh viễn trên đám mây và đồng bộ đa thiết bị an toàn.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <button
              type="button"
              data-testid="btn-login-to-topup"
              onClick={() => {
                onClose();
                const authBtn = document.querySelector('[data-testid="mobile-header-avatar-btn"]');
                if (authBtn) (authBtn as HTMLElement).click();
              }}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs tracking-wide transition shadow-lg shadow-emerald-500/20 active:scale-98 cursor-pointer"
            >
              Đăng Nhập Ngay
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium text-xs transition cursor-pointer"
            >
              Để Sau
            </button>
          </div>
        </div>
      </div>
    );
  }

  const presets = AI_CREDIT_PACKS;

  const handleCopyMemo = async () => {
    if (!displayMemo) return;
    try {
      await navigator.clipboard.writeText(displayMemo);
      setCopiedMemo(true);
      setTimeout(() => setCopiedMemo(false), 2000);
    } catch {}
  };

  const handleCopyAccount = async () => {
    try {
      await navigator.clipboard.writeText('AGBSPTJE34IA3A8SAAX');
      setCopiedAccount(true);
      setTimeout(() => setCopiedAccount(false), 2000);
    } catch {}
  };

  const handleCopyAmount = async () => {
    try {
      await navigator.clipboard.writeText(String(finalPrice));
      setCopiedAmount(true);
      setTimeout(() => setCopiedAmount(false), 2000);
    } catch {}
  };

  return (
    <div
      data-testid="ai-credits-topup-modal"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative z-[101] w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Zap size={20} className="fill-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Nạp Thêm AI Credits ⚡
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Hiện có: {aiCreditsBalance}⚡
                </span>
              </h3>
              <p className="text-xs text-zinc-400">Hệ thống xử lý tự động • Đơn hàng có hiệu lực trong 15 phút</p>
            </div>
          </div>
          <button
            onClick={onClose}
            data-testid="ai-credits-close-btn"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation: Nạp Điểm | Lịch Sử Nạp */}
        <div className="flex border-b border-zinc-800 bg-zinc-950/40 px-5 pt-2">
          <button
            type="button"
            data-testid="tab-topup"
            onClick={() => setActiveTab('topup')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'topup'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Zap size={14} />
            Nạp Điểm
          </button>
          <button
            type="button"
            data-testid="tab-history"
            onClick={() => {
              setActiveTab('history');
              fetchOrderHistory();
            }}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'history'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <History size={14} />
            Lịch Sử Giao Dịch
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-white">
          {paymentCompleted ? (
            /* TRẠNG THÁI THÀNH CÔNG HOÀN TOÀN */
            <div className="text-center py-8 space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/20">
                <CheckCircle2 size={36} />
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-bold text-white">Thanh Toán Thành Công!</h4>
                <p className="text-xs text-zinc-400">
                  Đã cộng thành công <strong className="text-amber-400 font-bold">+{completedCredits} ⚡</strong> vào tài khoản của bạn.
                </p>
                <p className="text-[11px] text-emerald-400 font-medium pt-1">
                  Số dư hiện tại: <strong className="font-bold">{aiCreditsBalance} ⚡</strong>
                </p>
              </div>

              <div className="pt-4 flex justify-center">
                <button
                  type="button"
                  onClick={onClose}
                  data-testid="ai-credits-success-done-btn"
                  className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs tracking-wide transition shadow-lg shadow-emerald-500/20 cursor-pointer"
                >
                  Xong & Tiếp Tục Học Tập
                </button>
              </div>
            </div>
          ) : activeTab === 'history' ? (
            /* TAB LỊCH SỬ GIAO DỊCH */
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs font-semibold text-zinc-300">5 đơn hàng gần nhất:</span>
                <button
                  type="button"
                  onClick={fetchOrderHistory}
                  disabled={isLoadingHistory}
                  className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw size={12} className={isLoadingHistory ? 'animate-spin' : ''} />
                  Làm mới
                </button>
              </div>

              {isLoadingHistory ? (
                <div className="py-8 flex flex-col items-center justify-center space-y-2 text-zinc-400 text-xs">
                  <Loader2 size={24} className="animate-spin text-amber-500" />
                  <span>Đang tải lịch sử giao dịch...</span>
                </div>
              ) : orderHistory.length === 0 ? (
                <div className="py-8 text-center text-zinc-500 text-xs space-y-1 border border-dashed border-zinc-800 rounded-xl">
                  <p>Bạn chưa có đơn nạp tiền nào gần đây.</p>
                  <p className="text-[10px] text-zinc-600">Khi bạn tạo đơn nạp, thông tin sẽ được lưu vết tại đây.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {orderHistory.map((item, idx) => (
                    <div
                      key={item.orderCode || idx}
                      className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-amber-400">{item.orderCode}</span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                              item.status === 'completed'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : item.status === 'expired'
                                ? 'bg-zinc-800 text-zinc-400'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {item.status === 'completed' ? 'Đã thanh toán' : item.status === 'expired' ? 'Hết hạn' : 'Đang chờ'}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-400">
                          {item.amount?.toLocaleString('vi-VN')}đ • +{item.creditsToAdd}⚡ •{' '}
                          {item.createdAt ? new Date(item.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : ''}
                        </div>
                      </div>

                      {item.status === 'pending' && (
                        <button
                          type="button"
                          onClick={() => handleResumePendingOrder(item)}
                          className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 font-semibold text-[11px] flex items-center gap-1 cursor-pointer transition"
                        >
                          Xem QR <ArrowRight size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* TAB NẠP TIỀN CHÍNH */
            <>
              {/* Thông báo phục hồi từ cache */}
              {isOrderFromCache && (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="shrink-0 text-emerald-400" />
                    <span>Đã khôi phục đơn hàng đang chờ thanh toán gần nhất</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCancelAndCreateNew}
                    className="text-[11px] underline text-emerald-400 hover:text-emerald-200 cursor-pointer"
                  >
                    Tạo đơn mới
                  </button>
                </div>
              )}

              {/* 4 Gói chọn nhanh (Standard Presets) */}
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-2">
                  Chọn nhanh gói nạp điểm:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {presets.map((preset) => {
                    const isSelected = selectedCredits === preset.credits;
                    return (
                      <button
                        key={preset.credits}
                        type="button"
                        data-testid={`ai-preset-${preset.credits}`}
                        onClick={() => {
                          setSelectedCredits(preset.credits);
                          if (isOrderFromCache) setIsOrderFromCache(false);
                        }}
                        className={`relative p-3 rounded-xl border text-left transition cursor-pointer ${
                          isSelected
                            ? 'border-amber-500/80 bg-amber-500/10 text-white shadow-lg shadow-amber-500/10'
                            : 'border-zinc-800 bg-zinc-950/50 hover:border-zinc-700 text-zinc-300'
                        }`}
                      >
                        {preset.popular && (
                          <span className="absolute -top-2 right-2 text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-rose-500 text-white">
                            HOT
                          </span>
                        )}
                        <div className="text-sm font-bold flex items-center gap-1 text-amber-400">
                          {preset.label}
                        </div>
                        <div className="text-xs font-semibold text-white mt-1">{preset.formattedPrice}</div>
                        <div className="text-[10px] text-emerald-400 mt-0.5">
                          {preset.discountPercent > 0 ? `-${preset.discountPercent}%` : 'Chuẩn'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Slider tùy chỉnh */}
              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400 font-medium">Số điểm ⚡ cần nạp:</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={50}
                      max={10000}
                      step={50}
                      value={selectedCredits}
                      onChange={(e) => {
                        setSelectedCredits(Math.max(50, Number(e.target.value) || 50));
                        if (isOrderFromCache) setIsOrderFromCache(false);
                      }}
                      data-testid="ai-credits-input"
                      className="w-20 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-sm font-bold text-amber-400 text-right focus:outline-none focus:border-amber-500"
                    />
                    <span className="text-xs text-zinc-400">⚡</span>
                  </div>
                </div>

                <input
                  type="range"
                  min={50}
                  max={5000}
                  step={50}
                  value={selectedCredits}
                  onChange={(e) => {
                    setSelectedCredits(Number(e.target.value));
                    if (isOrderFromCache) setIsOrderFromCache(false);
                  }}
                  data-testid="ai-credits-slider"
                  className="w-full accent-amber-500 cursor-pointer"
                />

                {/* Tính toán giá & chiết khấu */}
                <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500">Giá thanh toán:</span>
                    {discountPercent > 0 && (
                      <span className="line-through text-zinc-500 text-[11px]" data-testid="ai-original-price">
                        {originalPrice.toLocaleString('vi-VN')}đ
                      </span>
                    )}
                    <span className="text-base font-bold text-emerald-400" data-testid="ai-final-price">
                      {finalPrice.toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                  {discountBadge && (
                    <span
                      data-testid="ai-discount-badge"
                      className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold text-[11px]"
                    >
                      {discountBadge}
                    </span>
                  )}
                </div>
              </div>

              {/* QR Code Chuyển Khoản & Thông tin */}
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col sm:flex-row items-center gap-4">
                <VietQrDisplay
                  qrUrl={effectiveQrUrl}
                  isLoading={isLoadingOrder}
                  orderCode={orderCode}
                  amount={finalPrice}
                />
                <div className="space-y-1.5 text-xs text-zinc-300 flex-1 w-full">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500">Ngân hàng:</span>
                    <span className="font-semibold text-white">VPBank (Ngân hàng Việt Nam Thịnh Vượng)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500">Số tài khoản:</span>
                    <button
                      type="button"
                      onClick={handleCopyAccount}
                      className="font-mono font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                      title="Sao chép số tài khoản"
                    >
                      AGBSPTJE34IA3A8SAAX
                      {copiedAccount ? <CheckCircle2 size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    </button>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500">Chủ tài khoản:</span>
                    <span className="font-semibold text-white">HO NGOC BAO NAM</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500">Số tiền:</span>
                    <button
                      type="button"
                      onClick={handleCopyAmount}
                      className="font-mono font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                      title="Sao chép số tiền"
                    >
                      {finalPrice.toLocaleString('vi-VN')}đ
                      {copiedAmount ? <CheckCircle2 size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    </button>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-zinc-800">
                    <span className="text-zinc-500">Nội dung CK:</span>
                    <button
                      type="button"
                      onClick={handleCopyMemo}
                      data-testid="ai-copy-memo-btn"
                      className="font-mono font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40"
                      title="Bấm để sao chép cú pháp chuyển khoản"
                    >
                      {displayMemo || 'Đang tạo mã...'}
                      {copiedMemo ? <CheckCircle2 size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    </button>
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-zinc-500">
                    <span>Hết hạn trong:</span>
                    <OrderCountdownTimer expiresAt={orderExpiresAt} onExpire={handleExpireOrder} />
                  </div>
                </div>
              </div>

              {/* Thông báo độ trễ ngân hàng */}
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 flex items-start gap-2.5">
                <Clock size={16} className="text-blue-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="font-semibold text-blue-200">Xác nhận tự động SePay: 3 – 10 giây</div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Sau khi chuyển khoản, cổng SePay tự động ghi nhận và cộng credits trong 3 – 10 giây. Đơn hàng được lưu tự động, bạn có thể tải lại trang (F5) mà không lo mất dấu đơn.
                  </p>
                </div>
              </div>

              {/* Bảo mật đơn hàng Base36 */}
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                  <ShieldCheck size={14} className="text-amber-400 shrink-0" />
                  <span>Mã đơn hàng 7 ký tự bảo mật (Base36)</span>
                </div>
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  Vui lòng chuyển khoản chính xác <strong>Số tiền: {finalPrice.toLocaleString('vi-VN')}đ</strong> và <strong>Nội dung CK: {displayMemo || orderCode}</strong> để hệ thống tự động nhận diện và cộng ⚡ tức thì.
                </p>
              </div>

              {/* Nút Kiểm Tra Thanh Toán Ngay (Manual Polling Trigger) */}
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => checkOrderStatus(true)}
                  disabled={isCheckingStatus || !orderCode}
                  data-testid="ai-check-status-btn"
                  className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw size={14} className={isCheckingStatus ? 'animate-spin text-amber-400' : ''} />
                  {isCheckingStatus ? 'Đang kiểm tra giao dịch...' : 'Tôi Đã Chuyển Khoản • Kiểm Tra Ngay'}
                </button>

                {checkStatusFeedback && (
                  <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2 animate-in fade-in duration-150">
                    <AlertCircle size={14} className="shrink-0 text-amber-400" />
                    <span className="leading-snug text-[11px]">{checkStatusFeedback}</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
