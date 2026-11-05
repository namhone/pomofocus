import React, { useState, useEffect, useCallback } from 'react';
import {
  Ticket,
  Plus,
  RefreshCw,
  Copy,
  Check,
  Lock,
  Unlock,
  Trash2,
  Edit2,
  Sparkles,
  Crown,
  Zap,
  Percent,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { couponService, Coupon, CouponType } from '../services/couponService';
import { useAuthStore } from '../stores/useAuthStore';
import { isOwnerEmail } from '../services/authService';

export const AdminCouponManager: React.FC = () => {
  const { user } = useAuthStore();
  const isOwner = Boolean(user?.email && isOwnerEmail(user.email));

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Edit Max Uses State
  const [editingCoupon, setEditingCoupon] = useState<{ code: string; maxUses: number | null } | null>(null);
  const [editMaxUsesInput, setEditMaxUsesInput] = useState<string>('');

  // Form State
  const [code, setCode] = useState('');
  const [type, setType] = useState<CouponType>('lifetime');
  const [value, setValue] = useState<number>(0);
  const [maxUses, setMaxUses] = useState<string>(''); // string để cho phép để trống (vô hạn)
  const [description, setDescription] = useState('');

  const loadCoupons = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await couponService.fetchCloudCoupons();
      setCoupons(list);
    } catch {
      setCoupons(couponService.getCoupons());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOwner) {
      loadCoupons();
      const interval = setInterval(loadCoupons, 10000); // Polling realtime mỗi 10s
      return () => clearInterval(interval);
    }
  }, [isOwner, loadCoupons]);

  // Nếu không phải Owner, ẩn hoàn toàn (Zero footprint)
  if (!isOwner) return null;

  const handleCopy = (couponCode: string) => {
    navigator.clipboard.writeText(couponCode).catch(() => {});
    setCopiedCode(couponCode);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      setFeedback({ type: 'error', message: 'Vui lòng nhập mã coupon.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    const parsedMaxUses = maxUses.trim() === '' ? null : Math.max(1, parseInt(maxUses, 10));

    const res = await couponService.createDynamicCouponCloud({
      code: cleanCode,
      type,
      value: type === 'lifetime' || type === 'free_lifetime' ? 0 : Number(value) || 0,
      maxUses: parsedMaxUses,
      description: description.trim() || undefined,
      createdBy: user?.id
    });

    setIsSubmitting(false);

    if (res.success) {
      setFeedback({ type: 'success', message: res.message });
      setCode('');
      setDescription('');
      setMaxUses('');
      setValue(0);
      loadCoupons();
      setTimeout(() => setFeedback(null), 5000);
    } else {
      setFeedback({ type: 'error', message: res.message });
    }
  };

  const handleToggleActive = async (targetCode: string, currentActive: boolean) => {
    await couponService.toggleCouponActive(targetCode, !currentActive);
    setCoupons((prev) =>
      prev.map((c) =>
        c.code.trim().toUpperCase() === targetCode.trim().toUpperCase()
          ? { ...c, isActive: !currentActive }
          : c
      )
    );
  };

  const handleDelete = async (targetCode: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn mã coupon "${targetCode}"?`)) {
      await couponService.deleteCouponCloud(targetCode);
      setCoupons((prev) =>
        prev.filter((c) => c.code.trim().toUpperCase() !== targetCode.trim().toUpperCase())
      );
    }
  };

  const handleOpenEdit = (c: Coupon) => {
    setEditingCoupon({ code: c.code, maxUses: c.maxUses ?? null });
    setEditMaxUsesInput(c.maxUses === null || c.maxUses === undefined ? '' : String(c.maxUses));
  };

  const handleSaveMaxUses = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCoupon) return;
    const cleanInput = editMaxUsesInput.trim();
    const parsed = cleanInput === '' ? null : Math.max(1, parseInt(cleanInput, 10));
    await couponService.updateCouponMaxUses(editingCoupon.code, parsed);
    setCoupons((prev) =>
      prev.map((c) =>
        c.code.trim().toUpperCase() === editingCoupon.code.trim().toUpperCase()
          ? { ...c, maxUses: parsed }
          : c
      )
    );
    setFeedback({
      type: 'success',
      message: `Đã cập nhật số lượt mã "${editingCoupon.code}" thành ${parsed === null ? 'Không giới hạn (∞)' : `${parsed} lượt`} thành công!`
    });
    setEditingCoupon(null);
  };

  const getTypeBadge = (cType: CouponType) => {
    switch (cType) {
      case 'lifetime':
      case 'free_lifetime':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
            <Crown size={11} /> PRO TRỌN ĐỜI
          </span>
        );
      case 'credits':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
            <Zap size={11} /> NẠP CREDITS ⚡
          </span>
        );
      case 'free_days':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
            <Calendar size={11} /> NGÀY PRO
          </span>
        );
      case 'discount_percent':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
            <Percent size={11} /> GIẢM GIÁ %
          </span>
        );
    }
  };

  return (
    <div
      data-testid="admin-coupon-manager"
      className="p-5 sm:p-7 rounded-3xl border border-amber-500/30 bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 backdrop-blur-xl shadow-2xl space-y-6 max-w-4xl mx-auto w-full my-8 text-zinc-100"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
            <Ticket size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold tracking-tight text-white">
                Quản Trị Coupon Đám Mây (Dynamic Cloud Engine)
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/40">
                Owner Only 👑
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Phát hành mã tức thì lên Supabase Cloud (Zero-deploy), đếm lượt dùng nguyên tử & chống spam.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadCoupons}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/60 transition disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw size={13} className={isLoading ? 'animate-spin text-amber-400' : ''} />
          <span>{isLoading ? 'Đang đồng bộ...' : 'Làm mới'}</span>
        </button>
      </div>

      {/* Form Tạo Mã Nhanh */}
      <form onSubmit={handleCreateCoupon} className="space-y-4 bg-zinc-900/50 p-4 sm:p-5 rounded-2xl border border-zinc-800/80">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400">
          <Sparkles size={14} />
          <span>Tạo & Phát Hành Mã Khuyến Mãi Mới</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Mã Coupon */}
          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">
              Mã Coupon <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              data-testid="admin-input-coupon-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="VD: EIU, TET2026..."
              className="w-full px-3 py-2 text-xs font-mono font-bold uppercase rounded-xl bg-zinc-950/80 border border-zinc-700/80 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition"
              required
            />
          </div>

          {/* 2. Loại Coupon */}
          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">
              Loại Quyền Lợi
            </label>
            <select
              data-testid="admin-select-coupon-type"
              value={type}
              onChange={(e) => {
                const newType = e.target.value as CouponType;
                setType(newType);
                if (newType === 'lifetime' || newType === 'free_lifetime') setValue(0);
                else if (newType === 'discount_percent' && value === 0) setValue(50);
                else if (newType === 'free_days' && value === 0) setValue(7);
                else if (newType === 'credits' && value === 0) setValue(500);
              }}
              className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-950/80 border border-zinc-700/80 text-zinc-200 focus:outline-none focus:border-amber-500 transition"
            >
              <option value="lifetime">Trọn Đời (PRO Lifetime 👑)</option>
              <option value="credits">Nạp Điểm (AI Credits ⚡)</option>
              <option value="free_days">Ngày PRO (Free Days)</option>
              <option value="discount_percent">Giảm % Giá (Discount)</option>
            </select>
          </div>

          {/* 3. Giá Trị (Value) */}
          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">
              {type === 'lifetime' || type === 'free_lifetime'
                ? 'Đặc quyền'
                : type === 'credits'
                ? 'Số Điểm AI (⚡)'
                : type === 'free_days'
                ? 'Số Ngày Tặng PRO'
                : 'Phần Trăm Giảm (%)'}
            </label>
            <input
              type="number"
              data-testid="admin-input-coupon-value"
              disabled={type === 'lifetime' || type === 'free_lifetime'}
              value={type === 'lifetime' || type === 'free_lifetime' ? 0 : value}
              onChange={(e) => setValue(Number(e.target.value))}
              placeholder={type === 'credits' ? 'VD: 500' : 'VD: 30'}
              min={0}
              max={type === 'discount_percent' ? 100 : 100000}
              className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-zinc-950/80 border border-zinc-700/80 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition disabled:opacity-40"
            />
          </div>

          {/* 4. Giới Hạn Lượt Dùng (Max Uses) */}
          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">
              Giới Hạn Lượt Dùng
            </label>
            <input
              type="number"
              data-testid="admin-input-coupon-maxuses"
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              placeholder="Trống = Vô hạn (∞)"
              min={1}
              className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-950/80 border border-zinc-700/80 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition"
            />
          </div>
        </div>

        {/* Dòng Mô tả & Nút Phát Hành */}
        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          <div className="flex-1">
            <input
              type="text"
              data-testid="admin-input-coupon-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả chiến dịch (VD: Tặng sinh viên trường EIU trải nghiệm PRO)..."
              className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-950/80 border border-zinc-700/80 text-zinc-300 placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition"
            />
          </div>

          <button
            type="submit"
            data-testid="btn-create-cloud-coupon"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-2 px-5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 shadow-lg shadow-amber-500/20 active:scale-98 transition disabled:opacity-50"
          >
            {isSubmitting ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <Plus size={15} />
            )}
            <span>Phát Hành Mã Lên Cloud Ngay</span>
          </button>
        </div>

        {/* Thông báo Feedback */}
        {feedback && (
          <div
            className={`flex items-center gap-2 text-xs font-medium p-3 rounded-xl border ${
              feedback.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            {feedback.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
            <span>{feedback.message}</span>
          </div>
        )}
      </form>

      {/* Bảng Theo Dõi Trực Tiếp (Realtime Tracker Table) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold text-zinc-400 px-1">
          <span>Danh Sách Mã Khuyến Mãi Trên Cloud ({coupons.length})</span>
          <span className="flex items-center gap-1.5 text-[11px] text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Đồng bộ đám mây realtime
          </span>
        </div>

        <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
          {coupons.map((c) => {
            const isUnlimited = c.maxUses === null || c.maxUses === undefined;
            const isExhausted = !isUnlimited && c.usedCount >= (c.maxUses || 0);
            const isLocked = c.isActive === false;
            const percentage = !isUnlimited && (c.maxUses || 0) > 0
              ? Math.min(100, Math.round((c.usedCount / (c.maxUses || 1)) * 100))
              : 0;

            return (
              <div
                key={c.code}
                data-testid={`coupon-row-${c.code}`}
                className={`p-3.5 rounded-2xl border transition-all ${
                  isLocked
                    ? 'bg-zinc-950/40 border-zinc-800/50 opacity-60'
                    : isExhausted
                    ? 'bg-rose-950/10 border-rose-900/30'
                    : 'bg-zinc-900/70 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Cụm trái: Mã, Loại, Mô tả */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-sm text-white tracking-wide">
                        {c.code}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(c.code)}
                        title="Sao chép mã"
                        className="p-1 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition"
                      >
                        {copiedCode === c.code ? (
                          <Check size={12} className="text-emerald-400" />
                        ) : (
                          <Copy size={12} />
                        )}
                      </button>
                      {getTypeBadge(c.type)}
                      {isLocked ? (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-zinc-800 text-zinc-400 border border-zinc-700">
                          ĐÃ KHÓA
                        </span>
                      ) : isExhausted ? (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          HẾT LƯỢT
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          ĐANG CHẠY
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-zinc-400 line-clamp-1">
                      {c.description || (
                        c.type === 'lifetime' || c.type === 'free_lifetime'
                          ? 'Kích hoạt gói PRO Trọn Đời vĩnh viễn'
                          : c.type === 'credits'
                          ? `Tặng +${c.creditsReward || c.value}⚡ AI Credits`
                          : c.type === 'free_days'
                          ? `Tặng +${c.freeDays || c.value} ngày PRO miễn phí`
                          : `Giảm ${c.discountPercent || c.value}% trên tổng đơn hàng`
                      )}
                    </p>
                  </div>

                  {/* Cụm phải: Atomic Counter & Actions */}
                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    {/* Counter */}
                    <div className="text-right">
                      <div className="text-xs font-semibold text-zinc-200">
                        Đã dùng{' '}
                        <span className="text-amber-400 font-bold">{c.usedCount}</span> /{' '}
                        <span>{isUnlimited ? '∞' : c.maxUses} lượt</span>
                      </div>
                      {!isUnlimited && (
                        <div className="w-24 h-1.5 bg-zinc-800 rounded-full overflow-hidden mt-1 ml-auto">
                          <div
                            className={`h-full transition-all duration-300 ${
                              isExhausted
                                ? 'bg-rose-500'
                                : percentage > 80
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Actions: Edit, Lock/Unlock & Delete */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(c)}
                        title="Chỉnh sửa số lượt dùng tối đa"
                        aria-label={`Chỉnh sửa số lượt mã ${c.code}`}
                        data-testid={`btn-edit-maxuses-${c.code}`}
                        className="p-1.5 rounded-lg bg-zinc-800/80 border border-zinc-700/60 text-zinc-400 hover:text-amber-300 hover:bg-amber-500/10 hover:border-amber-500/30 transition cursor-pointer"
                      >
                        <Edit2 size={13} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleActive(c.code, c.isActive !== false)}
                        title={c.isActive === false ? 'Mở khóa mã' : 'Khóa mã này'}
                        className={`p-1.5 rounded-lg border transition ${
                          c.isActive === false
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                            : 'bg-zinc-800/80 border-zinc-700/60 text-zinc-400 hover:text-white hover:bg-zinc-800'
                        }`}
                      >
                        {c.isActive === false ? <Unlock size={13} /> : <Lock size={13} />}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(c.code)}
                        title="Xóa mã coupon"
                        className="p-1.5 rounded-lg bg-zinc-800/80 border border-zinc-700/60 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30 transition"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal / Dialog Chỉnh Sửa Số Lượt Dùng Nhanh Trên Cloud */}
      {editingCoupon && (
        <div
          data-testid="modal-edit-maxuses"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
        >
          <div className="w-full max-w-sm p-5 rounded-2xl bg-zinc-950 border border-amber-500/40 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Edit2 size={16} className="text-amber-400" />
                <h4 className="text-sm font-bold text-white">
                  Sửa Lượt Dùng: <span className="font-mono text-amber-300">{editingCoupon.code}</span>
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setEditingCoupon(null)}
                aria-label="Đóng hộp thoại"
                className="text-zinc-400 hover:text-white text-xs px-2 py-1 rounded cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMaxUses} className="space-y-3">
              <div>
                <label className="block text-xs text-zinc-300 mb-1">
                  Số lượt dùng tối đa (để trống nếu không giới hạn ∞):
                </label>
                <input
                  type="number"
                  min={1}
                  placeholder="Để trống = Không giới hạn (∞)"
                  value={editMaxUsesInput}
                  onChange={(e) => setEditMaxUsesInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-white font-mono text-sm focus:outline-none focus:border-amber-400"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCoupon(null)}
                  className="px-3 py-1.5 rounded-xl border border-zinc-700 text-zinc-300 hover:text-white text-xs transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition cursor-pointer shadow-md"
                >
                  Lưu Lên Cloud
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
