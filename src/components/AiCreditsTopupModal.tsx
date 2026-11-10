import React, { useState, useEffect, useRef } from 'react';
import { X, Zap, CheckCircle2, Copy, ShieldCheck, QrCode, Loader2, Sparkles } from 'lucide-react';
import { useAiStore, AI_CREDIT_PACKS } from '../stores/useAiStore';
import { resolveApiUrl } from '../utils/apiConfig';
import { useAuthStore } from '../stores/useAuthStore';
import { supabase } from '../lib/supabase';

interface AiCreditsTopupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

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
      discountBadge: 'Tiết kiệm 28% 🔥',
      originalPrice: 95000,
      finalPrice: 69000
    };
  }
  if (safeCredits === 4000) {
    return {
      unitPrice: 37,
      discountPercent: 40,
      discountBadge: 'Tiết kiệm 40% 👑',
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
    discountBadge = 'Tiết kiệm 40% 👑';
  } else if (safeCredits >= 1000) {
    unitPrice = 46;
    discountPercent = 28;
    discountBadge = 'Tiết kiệm 28% 🔥';
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

export const AiCreditsTopupModal: React.FC<AiCreditsTopupModalProps> = ({ isOpen, onClose }) => {
  const { aiCreditsBalance, refreshCreditsFromCloud, topupModalInitialCredits } = useAiStore();
  const { user } = useAuthStore();

  const [selectedCredits, setSelectedCredits] = useState<number>(topupModalInitialCredits || 1500);

  // Tự động đồng bộ số điểm khi mở modal từ nút "Nạp ⚡" ngoài trang Bảng Giá
  useEffect(() => {
    if (isOpen) {
      setSelectedCredits(topupModalInitialCredits || 1500);
    }
  }, [isOpen, topupModalInitialCredits]);

  // Luôn lắng nghe phím Escape trên window ở capture phase để đóng modal ngay cả khi focus vào ô input
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
  const [orderCode, setOrderCode] = useState<string>('');
  const [serverQrUrl, setServerQrUrl] = useState<string>('');
  const [isLoadingOrder, setIsLoadingOrder] = useState<boolean>(false);
  const [paymentCompleted, setPaymentCompleted] = useState<boolean>(false);
  const [copiedMemo, setCopiedMemo] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [qrError, setQrError] = useState(false);

  const pollIntervalRef = useRef<any>(null);

  const { originalPrice, finalPrice, discountBadge, discountPercent } = calculateCreditPrice(selectedCredits);

  // Sinh mã đơn hàng chuẩn Base36 7 ký tự qua Backend v5.0 API
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoadingOrder(true);
    setPaymentCompleted(false);

    const abortCtrl = new AbortController();

    fetch(resolveApiUrl('/api/payment/create-order'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user?.id,
        amount: finalPrice,
        creditsToAdd: selectedCredits
      }),
      signal: abortCtrl.signal
    })
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data?.orderCode) {
          setOrderCode(data.orderCode);
          if (data.vietQrUrl) {
            setServerQrUrl(data.vietQrUrl);
            setQrError(false);
          }
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.warn('[TopupModal] Error creating payment order:', err);
        }
      })
      .finally(() => {
        if (isMounted) setIsLoadingOrder(false);
      });

    return () => {
      isMounted = false;
      abortCtrl.abort();
    };
  }, [isOpen, finalPrice, selectedCredits, user?.id]);

  // Polling kiểm tra trạng thái đơn hàng (mỗi 4 giây)
  useEffect(() => {
    if (!isOpen || !orderCode || paymentCompleted) {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      return;
    }

    pollIntervalRef.current = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('payment_orders')
          .select('status, credits_to_add')
          .eq('order_code', orderCode)
          .maybeSingle();

        if (!error && data?.status === 'completed') {
          setPaymentCompleted(true);
          if (user?.id) {
            await refreshCreditsFromCloud(user.id);
          }
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        }
      } catch {}
    }, 4000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [isOpen, orderCode, paymentCompleted, user?.id, refreshCreditsFromCloud]);

  if (!isOpen) return null;

  const displayMemo = orderCode || `PF${selectedCredits}Z`;
  const effectiveQrUrl =
    serverQrUrl ||
    `https://img.vietqr.io/image/vietcombank-1066633885-compact.png?amount=${finalPrice}&addInfo=${encodeURIComponent(
      displayMemo
    )}&accountName=HO%20NGOC%20BAO%20NAM`;

  const presets = AI_CREDIT_PACKS;

  const handleCopyMemo = async () => {
    try {
      await navigator.clipboard.writeText(displayMemo);
      setCopiedMemo(true);
      setTimeout(() => setCopiedMemo(false), 2000);
    } catch {}
  };

  const handleCopyAccount = async () => {
    try {
      await navigator.clipboard.writeText('1066633885');
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

        {/* Thông báo thanh toán thành công */}
        {paymentCompleted ? (
          <div className="p-8 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 animate-bounce">
              <Sparkles size={32} />
            </div>
            <h4 className="text-lg font-bold text-white">Thanh Toán Thành Công!</h4>
            <p className="text-sm text-zinc-300 max-w-xs">
              Đã cộng <strong>+{selectedCredits}⚡</strong> vào tài khoản của bạn. Chúc bạn có những giờ học tập hiệu quả!
            </p>
            <button
              onClick={onClose}
              className="mt-4 px-6 py-2.5 rounded-xl bg-emerald-500 text-white font-semibold text-sm hover:bg-emerald-600 transition"
            >
              Hoàn Tất
            </button>
          </div>
        ) : (
          /* Content */
          <div className="p-5 space-y-5 overflow-y-auto flex-1">
            {/* Quick Presets */}
            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-2.5">
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
                      onClick={() => setSelectedCredits(preset.credits)}
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
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400 font-medium">Số điểm ⚡ cần nạp:</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={50}
                    max={10000}
                    step={50}
                    value={selectedCredits}
                    onChange={(e) => setSelectedCredits(Math.max(50, Number(e.target.value) || 50))}
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
                onChange={(e) => setSelectedCredits(Number(e.target.value))}
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
              <div className="p-2 bg-white rounded-xl shrink-0 shadow-md min-w-[150px] min-h-[150px] flex items-center justify-center relative">
                {isLoadingOrder && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] flex items-center justify-center rounded-xl z-10">
                    <Loader2 size={24} className="animate-spin text-zinc-600" />
                  </div>
                )}
                {!qrError ? (
                  <img
                    src={effectiveQrUrl}
                    alt="VietQR Vietcombank"
                    data-testid="ai-vietqr-image"
                    className="w-36 h-36 object-contain rounded"
                    onError={() => setQrError(true)}
                  />
                ) : (
                  <div className="w-36 h-36 flex flex-col items-center justify-center text-center p-2 text-zinc-900 bg-zinc-100 rounded">
                    <QrCode size={32} className="text-zinc-600 mb-1" />
                    <span className="text-[10px] font-bold text-zinc-800">Vietcombank</span>
                    <span className="text-[11px] font-mono font-black text-emerald-700">1066633885</span>
                    <span className="text-[9px] text-zinc-600 mt-1">Quét mã bằng App Ngân Hàng</span>
                  </div>
                )}
              </div>
              <div className="space-y-2 text-xs text-zinc-300 flex-1 w-full">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">Ngân hàng:</span>
                  <span className="font-semibold text-white">Vietcombank (VCB)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">Số tài khoản:</span>
                  <button
                    type="button"
                    onClick={handleCopyAccount}
                    className="font-mono font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                    title="Sao chép số tài khoản"
                  >
                    1066633885
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
                <div className="flex justify-between items-center pt-1.5 border-t border-zinc-800">
                  <span className="text-zinc-500">Nội dung CK:</span>
                  <button
                    type="button"
                    onClick={handleCopyMemo}
                    data-testid="ai-copy-memo-btn"
                    className="font-mono font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40"
                    title="Bấm để sao chép cú pháp chuyển khoản"
                  >
                    {displayMemo}
                    {copiedMemo ? <CheckCircle2 size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Payment Guidance Notice (Xóa vĩnh viễn nút bypass điểm ảo) */}
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
                <ShieldCheck size={15} className="text-amber-400 shrink-0" />
                <span>Mã đơn hàng 7 ký tự bảo mật (Base36)</span>
              </div>
              <p className="text-[11px] text-zinc-300 leading-relaxed">
                Vui lòng chuyển khoản chính xác <strong>Số tiền</strong> và <strong>Nội dung CK: {displayMemo}</strong>. Hệ thống webhook tự động xác nhận đơn hàng sau 1–3 giây khi ngân hàng thông báo.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
