import React, { useState } from 'react';
import { X, Zap, CheckCircle2, Copy, ShieldCheck, QrCode } from 'lucide-react';
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
  const { aiCreditsBalance } = useAiStore();
  const { user } = useAuthStore();

  const [selectedCredits, setSelectedCredits] = useState<number>(600);
  const [copiedMemo, setCopiedMemo] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [qrError, setQrError] = useState(false);

  if (!isOpen) return null;

  const { originalPrice, finalPrice, discountBadge, discountPercent } = calculateCreditPrice(selectedCredits);

  const userId = user?.id || 'GUEST';
  const memo = `AI_${selectedCredits}Z_${userId.substring(0, 8).toUpperCase()}`;

  // Link VietQR chuẩn Vietcombank (compact format)
  const vietQrUrl = `https://img.vietqr.io/image/vietcombank-1066633885-compact.png?amount=${finalPrice}&addInfo=${encodeURIComponent(memo)}&accountName=HO%20NGOC%20BAO%20NAM`;

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
            <div className="p-2 bg-white rounded-xl shrink-0 shadow-md min-w-[150px] min-h-[150px] flex items-center justify-center">
              {!qrError ? (
                <img
                  src={vietQrUrl}
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
                  {memo}
                  {copiedMemo ? <CheckCircle2 size={12} className="text-emerald-400" /> : <Copy size={12} />}
                </button>
              </div>
            </div>
          </div>

          {/* Payment Guidance Notice (Xóa vĩnh viễn nút bypass điểm ảo) */}
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
              <ShieldCheck size={15} className="text-amber-400 shrink-0" />
              <span>Xác nhận giao dịch tự động qua ngân hàng</span>
            </div>
            <p className="text-[11px] text-zinc-300 leading-relaxed">
              Vui lòng chuyển khoản chính xác <strong>Số tiền</strong> và <strong>Nội dung CK</strong> phía trên. Hệ thống quét giao dịch tự động 24/7 và nạp <strong>+{selectedCredits}⚡</strong> vào tài khoản sau 1–3 phút.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
