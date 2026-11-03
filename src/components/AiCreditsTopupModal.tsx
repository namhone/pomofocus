import React, { useState } from 'react';
import { X, Zap, CheckCircle2, Copy, Sparkles, ShieldCheck } from 'lucide-react';
import { useAiStore } from '../stores/useAiStore';
import { useAuthStore } from '../stores/useAuthStore';

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
  const originalPrice = safeCredits * 100;

  let unitPrice = 100;
  let discountPercent = 0;
  let discountBadge: string | null = null;

  if (safeCredits >= 2500) {
    unitPrice = 55;
    discountPercent = 45;
    discountBadge = 'Tiết kiệm 45% 👑';
  } else if (safeCredits >= 1000) {
    unitPrice = 70;
    discountPercent = 30;
    discountBadge = 'Tiết kiệm 30% ⚡';
  } else if (safeCredits >= 500) {
    unitPrice = 82;
    discountPercent = 18;
    discountBadge = 'Tiết kiệm 18% 🔥';
  } else if (safeCredits >= 200) {
    unitPrice = 95;
    discountPercent = 5;
    discountBadge = 'Tiết kiệm 5%';
  }

  // Làm tròn đến hàng nghìn đồng
  const rawPrice = safeCredits * unitPrice;
  const finalPrice = Math.round(rawPrice / 1000) * 1000;

  return {
    unitPrice,
    discountPercent,
    discountBadge,
    originalPrice,
    finalPrice
  };
}

export const AiCreditsTopupModal: React.FC<AiCreditsTopupModalProps> = ({ isOpen, onClose }) => {
  const { addCredits, aiCreditsBalance } = useAiStore();
  const { user } = useAuthStore();

  const [selectedCredits, setSelectedCredits] = useState<number>(600);
  const [copiedMemo, setCopiedMemo] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const { originalPrice, finalPrice, discountBadge, discountPercent } = calculateCreditPrice(selectedCredits);

  const userId = user?.id || 'GUEST';
  const memo = `AI_${selectedCredits}Z_${userId.substring(0, 8).toUpperCase()}`;

  // Link VietQR chuẩn Vietcombank
  const vietQrUrl = `https://img.vietqr.io/image/vietcombank-1066633885-compact2.png?amount=${finalPrice}&addInfo=${encodeURIComponent(memo)}&accountName=HO%20NGOC%20BAO%20NAM`;

  const presets = [
    { credits: 200, label: '200⚡', priceText: '19.000đ', badge: '5%' },
    { credits: 600, label: '600⚡', priceText: '49.000đ', badge: '18% 🔥', popular: true },
    { credits: 1500, label: '1.500⚡', priceText: '99.000đ', badge: '30% ⚡' },
    { credits: 3500, label: '3.500⚡', priceText: '190.000đ', badge: '45% 👑' }
  ];

  const handleCopyMemo = async () => {
    try {
      await navigator.clipboard.writeText(memo);
      setCopiedMemo(true);
      setTimeout(() => setCopiedMemo(false), 2000);
    } catch {}
  };

  const handleSimulatePayment = () => {
    addCredits(selectedCredits);
    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 2000);
  };

  return (
    <div
      data-testid="ai-credits-topup-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
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
              <p className="text-xs text-zinc-400">Giá gốc niêm yết: 100đ/1⚡ • Chiết khấu lên tới 45%</p>
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

        {/* Content */}
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
                    <div className="text-xs font-semibold text-white mt-1">{preset.priceText}</div>
                    <div className="text-[10px] text-emerald-400 mt-0.5">-{preset.badge}</div>
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
            <div className="p-2 bg-white rounded-xl shrink-0 shadow-md">
              <img
                src={vietQrUrl}
                alt="VietQR Vietcombank"
                data-testid="ai-vietqr-image"
                className="w-36 h-36 object-contain rounded"
              />
            </div>
            <div className="space-y-1.5 text-xs text-zinc-300 flex-1 w-full">
              <div className="flex justify-between">
                <span className="text-zinc-500">Ngân hàng:</span>
                <span className="font-semibold text-white">Vietcombank (VCB)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Số tài khoản:</span>
                <span className="font-mono font-bold text-amber-400">1066633885</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Chủ tài khoản:</span>
                <span className="font-semibold text-white">HO NGOC BAO NAM</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-zinc-800">
                <span className="text-zinc-500">Nội dung CK:</span>
                <button
                  type="button"
                  onClick={handleCopyMemo}
                  data-testid="ai-copy-memo-btn"
                  className="font-mono font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                >
                  {memo}
                  {copiedMemo ? <CheckCircle2 size={12} className="text-emerald-400" /> : <Copy size={12} />}
                </button>
              </div>
            </div>
          </div>

          {/* Sandbox Instant Topup Simulation */}
          <div className="pt-2">
            <button
              type="button"
              data-testid="ai-instant-topup-btn"
              onClick={handleSimulatePayment}
              disabled={isSuccess}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer disabled:opacity-50"
            >
              {isSuccess ? (
                <>
                  <CheckCircle2 size={16} className="text-zinc-950" />
                  Đã nạp thành công +{selectedCredits}⚡!
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Kích Hoạt Nạp Tức Thì (+{selectedCredits}⚡)
                </>
              )}
            </button>
            <p className="text-[10px] text-zinc-500 text-center mt-2 flex items-center justify-center gap-1">
              <ShieldCheck size={12} className="text-emerald-400" />
              Điểm được cộng nguyên tử ngay lập tức vào số dư trợ lý AI của bạn.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
