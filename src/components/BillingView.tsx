import React, { useState } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import { useAiStore } from '../stores/useAiStore';
import { useRouter } from '../services/router';
import { PlatformHeader } from './PlatformHeader';
import { SharedFooter } from './SharedFooter';
import {
  Check,
  CheckCircle2,
  Sparkles,
  Gift,
  AlertCircle,
  Zap,
  ShieldCheck,
  ArrowLeft,
  Crown,
  Receipt,
  Award,
  Flame,
  ChevronDown
} from 'lucide-react';
import { MoMoPaymentModal } from './MoMoPaymentModal';
import { PomoFocusLogo } from './PomoFocusLogo';
import { couponService } from '../services/couponService';
import { PRICING_PLANS, STREAMLINED_COMPARISON_FEATURES, PlanCycle } from '../config/pricing';
import { authService, isOwnerEmail, isLadyBoss, isVipFriend, hasProEntitlement, getPlanLabel } from '../services/authService';
import { AdminCouponManager } from './AdminCouponManager';

const renderStreamlinedCell = (val: string | boolean, variant: 'free' | 'pro' | 'lifetime') => {
  if (val === false || val === '—' || val === '-') {
    return <span className="text-zinc-600 font-light text-sm select-none">—</span>;
  }

  if (val === true || val === '✓') {
    return (
      <span className="flex items-center justify-center">
        <Check className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
      </span>
    );
  }

  if (typeof val === 'string' && val.includes('✓')) {
    return (
      <span className="inline-flex items-center justify-center gap-1 text-[11px] font-medium text-amber-200">
        <Check className="w-3.5 h-3.5 text-amber-400 stroke-[2.5] shrink-0" />
        <span>{val.replace('✓', '').trim()}</span>
      </span>
    );
  }

  if (val === 'PRO') {
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
        PRO
      </span>
    );
  }

  if (typeof val === 'string' && val.includes('Founder VIP')) {
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 inline-flex items-center gap-1 shadow-xs">
        <Crown size={11} className="text-amber-400 shrink-0" />
        <span>Founder VIP 👑</span>
      </span>
    );
  }

  if (val === 'Cục bộ') {
    return <span className="text-zinc-400 text-xs font-medium">Cục bộ</span>;
  }

  return (
    <span
      className={
        variant === 'lifetime'
          ? 'font-bold text-amber-300 text-xs font-mono'
          : variant === 'pro'
          ? 'font-semibold text-indigo-200 text-xs font-mono'
          : 'text-zinc-400 text-xs'
      }
    >
      {val}
    </span>
  );
};

const CREDIT_PACKS = [
  { id: 'pack_300', credits: 300, priceVnd: 19000, formatted: '19.000₫', discount: '0%', popular: false },
  { id: 'pack_700', credits: 700, priceVnd: 39000, formatted: '39.000₫', discount: 'Tiết kiệm 15%', popular: false },
  { id: 'pack_1500', credits: 1500, priceVnd: 69000, formatted: '69.000₫', discount: 'Tiết kiệm 28%', popular: true },
  { id: 'pack_4000', credits: 4000, priceVnd: 149000, formatted: '149.000₫', discount: 'Tiết kiệm 40%', popular: false }
];

export const BillingView: React.FC = () => {
  const router = useRouter();
  const [cycle, setCycle] = useState<PlanCycle>('yearly');
  const [statusMessage, setStatusMessage] = useState<{ type: 'info' | 'success'; text: string } | null>(null);
  const [isMoMoModalOpen, setIsMoMoModalOpen] = useState(false);

  const { upgradeToSandboxPro, downgradeToFree, isPro, isLifetime, user, planLabel } = useAuthStore();
  const [couponCode, setCouponCode] = useState('');
  const [couponResult, setCouponResult] = useState<{ success: boolean; text: string } | null>(null);
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string; percent: number } | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [billingTab, setBillingTab] = useState<'credits' | 'coupon'>('credits');
  const [isLifetimeTopupExpanded, setIsLifetimeTopupExpanded] = useState(false);

  const currentPlan = PRICING_PLANS[cycle];

  const handleRedeemCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    const res = await couponService.redeemCouponAsync(couponCode, user);
    setCouponResult({ success: res.success, text: res.message });
    if (res.success) {
      if (res.discountPercent) {
        setAppliedDiscount({
          code: couponCode.trim().toUpperCase(),
          percent: res.discountPercent
        });
      }
      setStatusMessage({ type: 'success', text: res.message });
      setCouponCode('');
      // Đồng bộ ngay lập tức session và Zustand authStore
      const refreshed = authService.getCurrentSession();
      if (refreshed) {
        useAuthStore.setState({
          user: refreshed,
          isPro: hasProEntitlement(refreshed.plan, refreshed.email),
          isLifetime: Boolean(
            refreshed.isLifetime ||
            refreshed.plan === 'pro_lifetime' ||
            isOwnerEmail(refreshed.email) ||
            isLadyBoss(refreshed.email) ||
            isVipFriend(refreshed.email)
          ),
          planLabel: getPlanLabel(refreshed)
        });
      }
      setTimeout(() => setStatusMessage(null), 5000);
    }
  };

  const handleSimulateUpgrade = (durationMonths: number) => {
    upgradeToSandboxPro(durationMonths);
    setStatusMessage({
      type: 'success',
      text: `Đã kích hoạt gói PRO Sandbox (${durationMonths === 12 ? '1 Năm' : durationMonths === 999 ? 'Trọn Đời' : '1 Tháng'}) thành công để trải nghiệm thử nghiệm tính năng.`
    });
    setTimeout(() => setStatusMessage(null), 5000);
  };

  const handleSelectPlanAndCheckout = (targetCycle: PlanCycle) => {
    setCycle(targetCycle);
    setIsMoMoModalOpen(true);
  };

  // Tính số ngày còn lại & ngày hết hạn cho gói PRO Tháng / Năm
  const remainingDays = user?.proExpiresAt
    ? Math.max(0, Math.ceil((user.proExpiresAt - Date.now()) / (24 * 60 * 60 * 1000)))
    : 30;

  const expiryFormatted = user?.proExpiresAt
    ? new Date(user.proExpiresAt).toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : '30 ngày tới';

  const isUserLifetime = Boolean(
    isLifetime ||
    user?.isLifetime ||
    user?.plan === 'pro_lifetime' ||
    user?.plan === 'lifetime' ||
    user?.role === 'founder' ||
    isOwnerEmail(user?.email) ||
    isLadyBoss(user?.email) ||
    isVipFriend(user?.email)
  );

  return (
    <div
      data-testid="billing-view"
      className="min-h-screen w-full max-w-full overflow-x-clip bg-[#09090b] text-[#f4f4f5] font-sans antialiased flex flex-col selection:bg-white selection:text-black select-none"
    >
      <PlatformHeader />

      <main className="flex-1 w-full max-w-5xl mx-auto p-4 sm:p-8 md:p-12 space-y-10 box-border overflow-x-clip">
        {/* Back to App Navigation */}
        <div className="w-full max-w-full flex items-center justify-between gap-3 pb-3 border-b border-zinc-800/60">
          <button
            type="button"
            data-testid="billing-back-btn"
            onClick={() => router.navigate('/app')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-zinc-800 hover:border-zinc-700 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs font-medium transition cursor-pointer shrink-0"
          >
            <ArrowLeft size={14} />
            <span>Quay lại Không Gian Học</span>
          </button>
        </div>
        {statusMessage && (
          <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-950/40 text-emerald-300 text-xs flex items-center gap-2.5 shadow-md">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
            <span className="font-medium">{statusMessage.text}</span>
          </div>
        )}

        {appliedDiscount && (
          <div data-testid="active-discount-banner" className="p-3.5 px-4 rounded-xl border border-emerald-500/50 bg-emerald-950/40 text-emerald-300 text-xs flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-emerald-400 shrink-0" />
              <span>
                Đang kích hoạt mã ưu đãi <strong className="font-mono text-white bg-emerald-500/20 px-1.5 py-0.5 rounded">{appliedDiscount.code}</strong>: Giảm {appliedDiscount.percent}% toàn bộ bảng giá!
              </span>
            </div>
            <button
              type="button"
              data-testid="btn-remove-discount"
              onClick={() => {
                setAppliedDiscount(null);
                setCouponResult(null);
              }}
              className="text-[11px] text-zinc-400 hover:text-white underline cursor-pointer"
            >
              Gỡ mã
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TRƯỜNG HỢP A: NGƯỜI DÙNG ĐÃ SỞ HỮU PRO TRỌN ĐỜI (FOUNDER LIFETIME CARD)  */}
        {/* ========================================================================= */}
        {isUserLifetime ? (
          <div data-testid="billing-founder-card" className="w-full max-w-xl mx-auto space-y-8 animate-in fade-in duration-200 box-border">
            {/* Thẻ Hội Viên Danh Dự Kim Loại Đen */}
            <div className="relative w-full max-w-xl mx-auto box-border px-4 sm:px-6 py-5 sm:py-7 rounded-2xl sm:rounded-3xl border-2 border-amber-400/50 bg-gradient-to-b from-zinc-900 via-zinc-950 to-black shadow-2xl overflow-hidden">
              {/* Ánh sáng kim loại & vầng hào quang */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
              <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

              {/* Header của thẻ */}
              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-800/80 w-full min-w-0">
                <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-amber-400/15 border border-amber-400/30 text-amber-300 flex items-center justify-center shadow-inner shrink-0">
                    <Crown size={20} className="animate-pulse" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] sm:text-xs font-mono uppercase tracking-widest text-amber-400 font-bold whitespace-nowrap">
                        FOUNDER LIFETIME VIP
                      </span>
                      <span
                        data-testid="billing-pro-active-badge"
                        className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      >
                        🟢 Đang Kích Hoạt Vĩnh Viễn
                      </span>
                    </div>
                    <h1 className="text-base sm:text-xl md:text-2xl font-extrabold text-white tracking-tight mt-1 break-words">
                      Thành Viên PRO Trọn Đời (Lifetime Founder)
                    </h1>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 bg-zinc-900/80 px-3 py-1.5 rounded-xl border border-zinc-800 self-start sm:self-auto">
                  <Award size={14} className="text-amber-400" />
                  <span>Hạn dùng: <strong>Vĩnh Viễn Trọn Đời</strong></span>
                </div>
              </div>

              {/* Thông tin định danh thành viên */}
              <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-4 py-6 border-b border-zinc-800/80 text-xs">
                <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800 space-y-1">
                  <div className="text-[11px] text-zinc-400">Chủ Sở Hữu Thẻ</div>
                  <div className="text-sm font-bold text-white truncate">{user?.displayName || 'Chủ Tài Khoản'}</div>
                  <div className="text-[11px] text-zinc-400 font-mono truncate">{user?.email}</div>
                </div>

                <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800 space-y-1">
                  <div className="text-[11px] text-zinc-400">Cấp Bậc Hội Viên</div>
                  <div className="text-sm font-bold text-amber-300 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-amber-400" />
                    <span>{planLabel}</span>
                  </div>
                  <div className="text-[11px] text-zinc-400">Đặc quyền tối cao mở khóa 100%</div>
                </div>

                <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800 space-y-1">
                  <div className="text-[11px] text-zinc-400">Mã Định Danh VIP</div>
                  <div className="text-sm font-mono font-bold text-zinc-200">
                    POMO-{(user?.id || 'FOUNDER').slice(0, 8).toUpperCase()}
                  </div>
                  <div className="text-[11px] text-emerald-400">Bảo mật mã hóa xác thực</div>
                </div>
              </div>

              {/* Danh sách 10 Đặc Quyền */}
              <div className="relative z-10 pt-6 space-y-4">
                <div className="text-xs font-semibold text-zinc-300 flex items-center gap-2">
                  <ShieldCheck size={16} className="text-amber-400" />
                  <span>Đặc quyền sở hữu Founder VIP</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/80">
                    <Check size={14} className="text-zinc-200 shrink-0 mt-0.5" />
                    <span className="text-zinc-200">Phòng học nhóm: Tối đa 50 người</span>
                  </div>
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/80">
                    <Check size={14} className="text-zinc-200 shrink-0 mt-0.5" />
                    <span className="text-zinc-200">Thời lượng phòng học: 24/7 không ngắt quãng</span>
                  </div>
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/80">
                    <Check size={14} className="text-zinc-200 shrink-0 mt-0.5" />
                    <span className="text-zinc-200">Gia sư AI Companion: Sử dụng không giới hạn</span>
                  </div>
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/80">
                    <Check size={14} className="text-zinc-200 shrink-0 mt-0.5" />
                    <span className="text-zinc-200">Bảng vẽ nhóm: Không giới hạn &amp; xuất ảnh HD</span>
                  </div>
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/80">
                    <Check size={14} className="text-zinc-200 shrink-0 mt-0.5" />
                    <span className="text-zinc-200">Đường dẫn phòng: Đặt URL cá nhân hóa theo tên</span>
                  </div>
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/80">
                    <Check size={14} className="text-zinc-200 shrink-0 mt-0.5" />
                    <span className="text-zinc-200">Kho tài nguyên: 1.000+ hình nền 4K &amp; YouTube Sync</span>
                  </div>
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/80">
                    <Check size={14} className="text-zinc-200 shrink-0 mt-0.5" />
                    <span className="text-zinc-200">Đặc quyền quà tặng: Tặng 1 Giftcode PRO 3 tháng</span>
                  </div>
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/80">
                    <Check size={14} className="text-zinc-200 shrink-0 mt-0.5" />
                    <span className="text-zinc-200">Huy hiệu vinh danh: Founder VIP 👑 vĩnh viễn</span>
                  </div>
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/80">
                    <Check size={14} className="text-zinc-200 shrink-0 mt-0.5" />
                    <span className="text-zinc-200">Quyền lợi tương lai: Mở khóa miễn phí mọi tính năng mới</span>
                  </div>
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/80">
                    <Check size={14} className="text-zinc-200 shrink-0 mt-0.5" />
                    <span className="text-zinc-200">Hỗ trợ kỹ thuật: Ưu tiên băng thông VIP cao nhất</span>
                  </div>
                </div>
              </div>

              {/* Lịch Sử Thanh Toán & Biên Lai VietQR - BỐ CỤC 2 HÀNG ĐỘC LẬP CHUẨN ZEN */}
              <div className="relative z-10 mt-8 pt-6 border-t border-zinc-800/80 space-y-4">
                {/* Hàng 1: Hộp Biên lai VietQR chiếm 100% bề ngang */}
                <div className="w-full p-3.5 sm:p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-inner">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                      <Receipt size={18} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        <span>Biên Lai Quyết Toán: VietQR 24/7 (Vietcombank)</span>
                      </div>
                      <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                        Mã GD: VCB_LIFETIME_{user?.id?.slice(0, 8).toUpperCase() || 'FOUNDER'} • Số tiền: 799.000₫ • Kích hoạt vĩnh viễn
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 self-end sm:self-center">
                    <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono font-bold tracking-wide shadow-sm flex items-center gap-1">
                      <span>✓</span> ĐÃ XÁC THỰC
                    </span>
                  </div>
                </div>

                {/* Hàng 2: Hai nút bấm hành động chia đều 50% - 50% */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                  <button
                    type="button"
                    onClick={() => router.navigate('/profile')}
                    className="w-full py-2.5 px-4 rounded-xl border border-zinc-700/80 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 hover:text-white text-xs font-semibold transition cursor-pointer shadow-sm text-center flex items-center justify-center gap-2"
                  >
                    <span>👤</span> Quản Lý Hồ Sơ
                  </button>
                  <button
                    type="button"
                    onClick={() => router.navigate('/app')}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-amber-500 hover:from-emerald-400 hover:to-amber-400 text-zinc-950 text-xs font-bold transition cursor-pointer shadow-lg hover:shadow-emerald-500/20 text-center flex items-center justify-center gap-2"
                  >
                    <span>🚀</span> Vào Không Gian Học
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : isPro ? (
          /* ========================================================================= */
          /* TRƯỜNG HỢP B: NGƯỜI DÙNG ĐANG DÙNG PRO THÁNG HOẶC NĂM (ADAPTIVE RENEW)    */
          /* ========================================================================= */
          <div data-testid="billing-active-subscription" className="space-y-8 animate-in fade-in duration-200">
            {/* Header trạng thái */}
            <div className="text-center space-y-2">
              <span className="text-[11px] font-mono uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full inline-block">
                GÓI ĐANG HOẠT ĐỘNG
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Quản Lý Thuê Bao PRO Của Bạn
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400 max-w-lg mx-auto">
                Bạn đang sử dụng gói <strong>{planLabel}</strong>. Dưới đây là tình trạng thuê bao và các tùy chọn gia hạn hoặc nâng cấp lên Trọn Đời.
              </p>
            </div>

            {/* Thẻ hiển thị số ngày còn lại & ngày hết hạn */}
            <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900 shadow-xl relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      data-testid="billing-pro-active-badge"
                      className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 inline-flex items-center gap-1.5"
                    >
                      <CheckCircle2 size={13} className="text-emerald-400" />
                      <span>{planLabel} Đang Hoạt Động</span>
                    </span>
                  </div>
                  <div className="text-lg sm:text-xl font-bold text-white">
                    Thời Hạn Còn Lại: <span className="text-emerald-400">{remainingDays} Ngày</span>
                  </div>
                  <div className="text-xs text-zinc-400 font-mono">
                    Hết hạn vào: <strong>{expiryFormatted}</strong> (Hệ thống sẽ bảo toàn dữ liệu của bạn)
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    type="button"
                    data-testid="btn-downgrade-free"
                    onClick={() => {
                      downgradeToFree();
                      setStatusMessage({ type: 'info', text: 'Đã chuyển về gói Cơ Bản miễn phí.' });
                      setTimeout(() => setStatusMessage(null), 4000);
                    }}
                    className="px-4 py-2 rounded-full border border-zinc-800 hover:border-zinc-700 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs font-medium transition cursor-pointer"
                  >
                    Chuyển về Gói Cơ Bản
                  </button>
                  <button
                    type="button"
                    onClick={() => router.navigate('/app')}
                    className="px-4 py-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white text-xs font-medium transition cursor-pointer"
                  >
                    Vào Học Ngay
                  </button>
                </div>
              </div>
            </div>

            {/* 2 Lựa chọn duy nhất: Gia Hạn Thêm hoặc Nâng Cấp Trọn Đời */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Lựa chọn 1: Gia Hạn Thêm */}
              <div className="p-6 sm:p-8 rounded-2xl border border-zinc-800 bg-zinc-900/50 flex flex-col justify-between space-y-6 hover:border-zinc-700 transition">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase tracking-widest text-zinc-400">GIA HẠN THUÊ BAO</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                      Cộng Dồn Ngày
                    </span>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Gia Hạn Thêm Thời Gian Học</h2>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                      Cộng dồn thêm thời hạn vào ngày hết hạn hiện tại của bạn. Chọn gia hạn theo tháng hoặc năm tiết kiệm 34%.
                    </p>
                  </div>
                  <div className="space-y-2 pt-3 border-t border-zinc-800 text-xs">
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800">
                      <span className="text-zinc-300">Gia hạn thêm 1 Tháng:</span>
                      <strong className="text-white font-mono">59.000₫</strong>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800">
                      <span className="text-emerald-300">Gia hạn thêm 1 Năm (-34%):</span>
                      <strong className="text-emerald-400 font-mono">468.000₫</strong>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectPlanAndCheckout('monthly')}
                    className="py-2.5 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-xs text-white font-semibold transition cursor-pointer"
                  >
                    +1 Tháng (59k)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectPlanAndCheckout('yearly')}
                    className="py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition cursor-pointer shadow-md"
                  >
                    +1 Năm (468k)
                  </button>
                </div>
              </div>

              {/* Lựa chọn 2: Nâng Cấp Lên Trọn Đời */}
              <div className="p-6 sm:p-8 rounded-2xl border-2 border-amber-400/40 bg-zinc-900/80 flex flex-col justify-between space-y-6 shadow-2xl relative">
                <div className="absolute -top-3 right-6 px-3 py-0.5 rounded-full bg-amber-400 text-black text-[10px] font-bold uppercase tracking-wider shadow">
                  TIẾT KIỆM TỐI ĐA
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase tracking-widest text-amber-400">NÂNG CẤP TRỌN ĐỜI</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                      Khấu Trừ Ngày Cũ
                    </span>
                  </div>

                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl sm:text-3xl font-extrabold text-white">799.000₫</span>
                      <span className="text-xs text-zinc-400">/ một lần duy nhất</span>
                    </div>
                    <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                      Nâng cấp lên gói Founder VIP vĩnh viễn. Không bao giờ phải trả phí lại, mở khóa phòng 60 người, AI Study Companion không giới hạn và tặng 01 Giftcode 3 tháng.
                    </p>
                  </div>

                  <div className="space-y-2 pt-3 border-t border-zinc-800 text-xs">
                    <div className="flex items-center gap-2 text-zinc-200">
                      <Check size={14} className="text-zinc-200 shrink-0" />
                      <span>Sức chứa phòng học: Lên đến 60 người (Dạy học / Workshop)</span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-200">
                      <Check size={14} className="text-zinc-200 shrink-0" />
                      <span>Trợ lý AI Study: Sử dụng AI Study Companion không giới hạn</span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-200">
                      <Check size={14} className="text-zinc-200 shrink-0" />
                      <span>Huy hiệu Nhà sáng lập (Founder VIP) mạ vàng vĩnh viễn</span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-200">
                      <Check size={14} className="text-zinc-200 shrink-0" />
                      <span>Tặng 01 Giftcode PRO 3 tháng cho bạn cùng tiến</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  data-testid="btn-upgrade-lifetime"
                  onClick={() => handleSelectPlanAndCheckout('lifetime')}
                  className="w-full py-3 rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-black text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-98"
                >
                  <Zap size={14} className="fill-black" />
                  <span>Nâng Cấp Lên Trọn Đời Ngay (VietQR)</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* TRƯỜNG HỢP C: NGƯỜI DÙNG FREE / KHÁCH VÃNG LAI (BẢNG GIÁ ĐẦY ĐỦ NHƯ CŨ) */
          /* ========================================================================= */
          <>
            {/* Title & Billing Cycle */}
            <div className="text-center flex flex-col items-center space-y-3">
              <PomoFocusLogo size={36} showWordmark={true} showSubtitle={true} wordmarkClassName="text-xl font-bold tracking-tight text-white" />
              <span className="text-[11px] font-mono uppercase tracking-widest text-zinc-400 block">
                ĐẦU TƯ CHO SỰ TẬP TRUNG
              </span>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                Bảng Giá Dịch Vụ PomoFocus PRO
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto leading-relaxed">
                Nâng tầm hiệu suất với phòng học Meet không giới hạn, Bảng vẽ chung thời gian thực, và kho âm thanh chất lượng cao.
              </p>

              {/* Billing Cycle Switch (2 chế độ: Tháng và Năm chuẩn Stripe/Linear) */}
              <div className="mt-4 inline-flex items-center p-1 rounded-full border border-zinc-800 bg-zinc-900 text-xs shadow-inner">
                <button
                  type="button"
                  data-testid="billing-cycle-monthly"
                  onClick={() => setCycle('monthly')}
                  className={`px-4 py-2 rounded-full font-semibold transition cursor-pointer ${
                    cycle === 'monthly'
                      ? 'bg-zinc-800 text-white shadow-sm font-bold border border-zinc-700/60'
                      : 'text-zinc-400 hover:text-white border border-transparent'
                  }`}
                >
                  Thanh toán theo tháng
                </button>
                <button
                  type="button"
                  data-testid="billing-cycle-yearly"
                  onClick={() => setCycle('yearly')}
                  className={`px-4 py-2 rounded-full font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                    cycle === 'yearly' || cycle === 'lifetime'
                      ? 'bg-zinc-800 text-white shadow-sm font-bold border border-zinc-700/60'
                      : 'text-zinc-400 hover:text-white border border-transparent'
                  }`}
                >
                  <span>Thanh toán theo năm</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-400 font-bold uppercase tracking-wider">
                    Tiết kiệm 34% 🔥
                  </span>
                </button>
              </div>

              
            </div>

            {/* Pricing Cards Grid - 3 Cột Cân Đối Chuẩn SaaS (Free | PRO | Founder VIP) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch max-w-6xl mx-auto w-full pt-2">
              {/* THẺ 1: GÓI FREE (0Đ) - XÁM TỐI GIẢN */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 flex flex-col justify-between hover:border-zinc-700 transition shadow-lg relative">
                <div className="space-y-4">
                  <div>
                    <span className="text-xs font-mono uppercase tracking-widest text-zinc-400 font-semibold block">
                      Gói Free
                    </span>
                    <span className="text-[11px] text-zinc-400">Tự học cá nhân tối giản</span>
                  </div>

                  <div className="pt-1">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold text-white">0₫</span>
                      <span className="text-xs text-zinc-400">/ vĩnh viễn</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-1 font-mono leading-tight">
                      Miễn phí trọn đời • Không cần thẻ thanh toán
                    </p>
                  </div>

                  <div className="space-y-2.5 pt-4 border-t border-zinc-800/80 text-xs">
                    <div className="flex items-start gap-2">
                      <Zap size={14} className="text-amber-400 shrink-0 mt-0.5" />
                      <span className="text-zinc-200 leading-snug font-medium">50⚡ AI Credits / tháng</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                      <span className="text-zinc-300 leading-snug">Thời lượng phòng riêng: Tối đa 45 phút/phiên (Reset sau 5p)</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                      <span className="text-zinc-300 leading-snug">Sức chứa phòng học: Tối đa 6 người/phòng</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                      <span className="text-zinc-300 leading-snug">Chất lượng phòng học: 480p Tiêu chuẩn</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                      <span className="text-zinc-300 leading-snug">Kho âm thanh &amp; Hình nền: 5 âm thanh cơ bản &amp; 3 hình nền tĩnh</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                      <span className="text-zinc-300 leading-snug">Bảng vẽ Whiteboard: 1 trang nháp (Không xuất file)</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                      <span className="text-zinc-300 leading-snug">Đường dẫn phòng học: Ngẫu nhiên dạng mã số</span>
                    </div>
                  </div>
                </div>

                <div className="pt-6 mt-auto">
                  <button
                    type="button"
                    data-testid="btn-downgrade-free"
                    disabled={!isPro}
                    onClick={() => {
                      downgradeToFree();
                      setStatusMessage({ type: 'info', text: 'Đã chuyển về gói Cơ Bản miễn phí.' });
                      setTimeout(() => setStatusMessage(null), 4000);
                    }}
                    className={`w-full py-3 rounded-full text-xs font-semibold transition cursor-pointer ${
                      !isPro
                        ? 'bg-zinc-800/80 text-zinc-500 cursor-default border border-zinc-800'
                        : 'border border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800'
                    }`}
                  >
                    {!isPro ? 'Bắt Đầu Miễn Phí' : 'Chuyển về Gói Cơ Bản'}
                  </button>
                </div>
              </div>

              {/* THẺ 2: GÓI PRO (TÂM ĐIỂM - CHUYỂN ĐỔI THEO TOGGLE) */}
              <div className="relative rounded-2xl border-2 border-indigo-500/70 bg-gradient-to-b from-indigo-950/40 via-zinc-900/90 to-zinc-950 p-6 flex flex-col justify-between shadow-2xl shadow-indigo-500/10 ring-1 ring-indigo-500/30 scale-100 lg:scale-[1.02] z-10 transition-all">
                {/* Nhãn nổi bật */}
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-[10px] font-extrabold uppercase tracking-wider shadow-lg flex items-center gap-1.5 whitespace-nowrap">
                  <Flame size={12} className="fill-white" />
                  <span>GÓI PHỔ BIẾN NHẤT 🔥</span>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-mono uppercase tracking-widest text-indigo-300 font-bold block">
                        Gói PRO {cycle === 'monthly' ? 'Tháng' : 'Năm'}
                      </span>
                      <span className="text-[11px] text-zinc-400">
                        {cycle === 'monthly' ? 'Học tập cá nhân linh hoạt' : 'Gói Khuyên Dùng Tiết Kiệm 🔥'}
                      </span>
                    </div>
                    <Flame size={18} className="text-indigo-400 shrink-0" />
                  </div>

                  {/* Pricing */}
                  <div className="pt-1">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-extrabold text-white">
                        {appliedDiscount
                          ? (cycle === 'monthly'
                              ? `${Math.round(59000 * (100 - appliedDiscount.percent) / 100).toLocaleString('vi-VN')}₫`
                              : `${Math.round(39000 * (100 - appliedDiscount.percent) / 100).toLocaleString('vi-VN')}₫`)
                          : (cycle === 'monthly' ? '59.000₫' : '39.000₫')}
                      </span>
                      {appliedDiscount && (
                        <span className="text-xs text-zinc-400 line-through">
                          {cycle === 'monthly' ? '59.000₫' : '39.000₫'}
                        </span>
                      )}
                      {appliedDiscount && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                          -{appliedDiscount.percent}%
                        </span>
                      )}
                      <span className="text-xs text-zinc-400">/ tháng</span>
                    </div>
                    <p className="text-[11px] text-indigo-300/90 mt-1 font-mono leading-tight">
                      {appliedDiscount
                        ? (cycle === 'monthly'
                            ? `Đã áp dụng mã ${appliedDiscount.code}: ${Math.round(59000 * (100 - appliedDiscount.percent) / 100).toLocaleString('vi-VN')} VNĐ / tháng`
                            : `Đã áp dụng mã ${appliedDiscount.code}: ${Math.round(468000 * (100 - appliedDiscount.percent) / 100).toLocaleString('vi-VN')} VNĐ / năm`)
                        : (cycle === 'monthly'
                            ? '59.000đ / tháng • Hủy bất kỳ lúc nào'
                            : '39.000đ / tháng • Thanh toán 468.000đ/năm (Tiết kiệm 34%)')}
                    </p>
                  </div>

                  {/* Feature List */}
                  <div className="space-y-2.5 pt-4 border-t border-zinc-800/80 text-xs">
                    <div className="flex items-start gap-2">
                      <Zap size={14} className="text-amber-400 shrink-0 mt-0.5" />
                      <span className="text-white leading-snug font-semibold">
                        {cycle === 'monthly'
                          ? '1.500⚡ AI Study Credits / tháng'
                          : '20.000⚡ AI Study Credits / năm (Ưu đãi tối đa)'}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                      <span className="text-zinc-200 leading-snug">
                        Thời lượng phòng riêng: <strong>Không giới hạn thời gian</strong>
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                      <span className="text-zinc-200 leading-snug">
                        Sức chứa phòng học: <strong>Tối đa {cycle === 'monthly' ? '25' : '35'} người/phòng</strong>
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                      <span className="text-zinc-200 leading-snug">
                        Chất lượng phòng học: <strong>{cycle === 'monthly' ? 'HD 720p mượt mà' : 'Full HD 1080p sắc nét'}</strong>
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                      <span className="text-zinc-200 leading-snug">
                        Kho âm thanh &amp; <strong>1.000+ Hình nền 4K Pinterest</strong> &amp; YouTube Sync
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                      <span className="text-zinc-200 leading-snug">
                        Bảng vẽ Whiteboard: {cycle === 'monthly' ? 'Đầy đủ công cụ & Xuất PNG' : 'Đầy đủ công cụ & Xuất PDF đa trang'}
                      </span>
                    </div>
                    {cycle !== 'monthly' && (
                      <>
                        <div className="flex items-start gap-2">
                          <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                          <span className="text-zinc-200 leading-snug">
                            Đường dẫn phòng học riêng: Đặt URL cố định theo nickname
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                          <span className="text-zinc-200 leading-snug">
                            Ưu tiên băng thông máy chủ VIP &amp; Báo cáo 1 năm
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* CTA Button */}
                <div className="pt-6 mt-auto">
                  <button
                    type="button"
                    data-testid="btn-pay-momo"
                    onClick={() => handleSelectPlanAndCheckout(cycle === 'lifetime' ? 'lifetime' : cycle === 'monthly' ? 'monthly' : 'yearly')}
                    className="w-full py-3 rounded-full bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xl active:scale-98"
                  >
                    <span>
                      {cycle === 'lifetime'
                        ? 'Nâng Cấp Gói Trọn Đời (VietQR)'
                        : 'Nâng Cấp Ngay'}
                    </span>
                  </button>
                </div>
              </div>

              {/* THẺ 3: GÓI TRỌN ĐỜI (FOUNDER VIP 👑 - CỐ ĐỊNH THANH TOÁN 1 LẦN) */}
              <div className="relative rounded-2xl border-2 border-amber-500/50 bg-gradient-to-b from-amber-950/30 via-zinc-900/90 to-zinc-950 p-6 flex flex-col justify-between shadow-2xl shadow-amber-500/10 ring-1 ring-amber-500/20 hover:border-amber-400/70 transition-all">
                {/* Nhãn nổi bật với data-testid="billing-cycle-lifetime" */}
                <button
                  type="button"
                  data-testid="billing-cycle-lifetime"
                  onClick={() => setCycle('lifetime')}
                  className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 text-black text-[10px] font-black uppercase tracking-wider shadow-lg flex items-center gap-1.5 whitespace-nowrap cursor-pointer hover:brightness-110 active:scale-95 transition"
                >
                  <Crown size={12} className="fill-black" />
                  <span>FOUNDER VIP ĐỘC QUYỀN 👑</span>
                </button>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold block">
                        Gói Trọn Đời
                      </span>
                      <span className="text-[11px] text-zinc-400">Lifetime Founder VIP 👑</span>
                    </div>
                    <Crown size={18} className="text-amber-400 shrink-0" />
                  </div>

                  {/* Pricing */}
                  <div className="pt-1">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-extrabold text-white tracking-tight">
                        {appliedDiscount
                          ? `${Math.round(799000 * (100 - appliedDiscount.percent) / 100).toLocaleString('vi-VN')}₫`
                          : '799.000₫'}
                      </span>
                      {appliedDiscount && (
                        <span className="text-xs text-zinc-500 line-through">799.000₫</span>
                      )}
                      {appliedDiscount && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                          -{appliedDiscount.percent}%
                        </span>
                      )}
                      <span className="text-xs text-amber-400/90 font-mono">/ một lần duy nhất</span>
                    </div>
                    <p className="text-[11px] text-amber-300/80 mt-1 font-mono leading-tight">
                      {appliedDiscount
                        ? `Đã áp dụng mã ${appliedDiscount.code}: ${Math.round(799000 * (100 - appliedDiscount.percent) / 100).toLocaleString('vi-VN')} VNĐ (Tiết kiệm ${appliedDiscount.percent}%)`
                        : 'Sở hữu vĩnh viễn trọn đời • Không gia hạn • 1 lần duy nhất'}
                    </p>
                  </div>

                  {/* Feature List */}
                  <div className="space-y-2.5 pt-4 border-t border-zinc-800/80 text-xs">
                    <div className="flex items-start gap-2">
                      <Zap size={14} className="text-amber-400 shrink-0 mt-0.5" />
                      <span className="text-amber-200 leading-snug font-semibold">
                        1.000⚡ / tuần (Tự động nạp đầy lại mỗi thứ Hai vĩnh viễn)
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                      <span className="text-zinc-200 leading-snug">
                        Thời lượng phòng riêng: <strong>Không giới hạn thời gian</strong>
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                      <span className="text-zinc-200 leading-snug">
                        Sức chứa phòng học: <strong>Lên đến 60 người (Dạy học / Workshop)</strong>
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                      <span className="text-zinc-200 leading-snug">
                        Trợ lý AI Study: <strong>Sử dụng AI Study Companion không giới hạn</strong>
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                      <span className="text-zinc-200 leading-snug">
                        Huy hiệu hồ sơ: <strong>Founder VIP mạ vàng độc quyền vĩnh viễn</strong>
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                      <span className="text-zinc-200 leading-snug">
                        Đặc quyền cộng đồng: <strong>Tặng 01 Giftcode PRO 3 tháng</strong> cho bạn cùng tiến
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Sparkles size={14} className="text-amber-400 shrink-0 mt-0.5" />
                      <span className="text-zinc-200 leading-snug">
                        Truy cập sớm: <strong>Early Access Labs 100% tính năng mới trọn đời</strong>
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                      <span className="text-zinc-200 leading-snug">
                        Chất lượng phòng học: <strong>2K Ultra HD cao cấp nhất</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* CTA Button */}
                <div className="pt-6 mt-auto">
                  <button
                    type="button"
                    data-testid="btn-upgrade-lifetime"
                    onClick={() => handleSelectPlanAndCheckout('lifetime')}
                    className="w-full py-3 rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer shadow-xl shadow-amber-500/20 active:scale-98"
                  >
                    <Crown size={14} className="fill-black" />
                    <span>Sở Hữu Trọn Đời Founder (799k)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Sandbox Simulation Bar */}
            <div className="flex flex-wrap items-center justify-center gap-3 p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/80 text-xs text-zinc-400">
              <span className="font-mono text-[11px] text-zinc-400">Môi trường kiểm thử tự động:</span>
              <button
                type="button"
                data-testid="btn-activate-pro-sandbox"
                onClick={() => handleSimulateUpgrade(currentPlan.durationMonths)}
                className="px-4 py-1.5 rounded-full border border-zinc-700 bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-medium transition cursor-pointer"
              >
                Kích hoạt Giả lập ({cycle === 'yearly' ? '1 Năm' : cycle === 'lifetime' ? 'Trọn Đời' : '1 Tháng'})
              </button>
            </div>

            {/* Feature Comparison Table Section */}
            <section
              data-testid="billing-comparison-section"
              className="pt-8 border-t border-zinc-800/80 space-y-6"
            >
              <div className="text-center space-y-3">
                <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-full inline-block">
                  MINH BẠCH &amp; ĐA CHIỀU
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Bảng So Sánh Quyền Lợi Toàn Diện
                </h2>
                <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto">
                  So sánh chi tiết quyền lợi giữa gói Miễn Phí và các gói PRO Tháng, PRO Năm, PRO Trọn Đời của PomoFocus.
                </p>

                {/* Accordion Toggle Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    data-testid="toggle-comparison-table-btn"
                    onClick={() => setShowComparison(!showComparison)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-zinc-700 bg-zinc-900/90 hover:bg-zinc-800 text-xs sm:text-sm font-semibold text-zinc-200 hover:text-white transition cursor-pointer shadow-sm group"
                  >
                    <span>{showComparison ? 'Thu gọn bảng so sánh quyền lợi' : 'Xem bảng so sánh quyền lợi cốt lõi'}</span>
                    <ChevronDown size={15} className={`transition-transform duration-200 text-zinc-400 group-hover:text-white ${showComparison ? 'rotate-180' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Table Container - Expandable Progressive Disclosure */}
              {showComparison && (
                <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-900/40 backdrop-blur-sm shadow-xl scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-900">
                  <table className="w-full text-left border-separate border-spacing-0 min-w-[680px] text-xs">
                    <thead>
                      <tr className="bg-zinc-950/70 text-zinc-400 font-mono uppercase text-[11px]">
                        <th className="sticky left-0 bg-[#0c0c0e] shadow-[2px_0_8px_rgba(0,0,0,0.7)] z-20 border-r border-b border-zinc-800 py-3.5 px-4 w-[34%] min-w-[200px] sm:min-w-[260px] text-zinc-300 font-semibold shadow-xs">
                          Tính Năng Trọng Yếu
                        </th>
                        <th className="py-3.5 px-3 w-[20%] min-w-[110px] text-center text-zinc-400 border-b border-zinc-800">
                          Miễn Phí
                          <span className="text-[10px] text-zinc-400 font-normal block normal-case font-sans">0₫ / mãi mãi</span>
                        </th>
                        <th className="py-3.5 px-3 w-[23%] min-w-[140px] text-center text-indigo-200 bg-indigo-500/[0.03] border-x border-b border-indigo-500/20">
                          PRO (Tháng/Năm)
                          <span className="text-[10px] text-indigo-400 font-semibold block normal-case font-sans">Từ 39.000₫ / tháng</span>
                        </th>
                        <th className="py-3.5 px-3 w-[23%] min-w-[150px] text-center text-amber-200 bg-amber-500/[0.04] border-l border-b border-amber-500/25">
                          <span className="inline-flex items-center gap-1 font-bold">
                            <Crown size={12} className="text-amber-400" />
                            FOUNDER VIP
                          </span>
                          <span className="text-[10px] text-amber-400 font-bold block normal-case font-sans">Trọn Đời • 799.000₫</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {STREAMLINED_COMPARISON_FEATURES.map((item) => (
                        <tr
                          key={item.id}
                          className="hover:bg-zinc-800/30 transition-colors"
                        >
                          <td className="sticky left-0 bg-[#0c0c0e] shadow-[2px_0_8px_rgba(0,0,0,0.7)] z-10 border-r border-b border-zinc-800/60 py-3.5 px-4 font-medium text-zinc-200 min-w-[200px] sm:min-w-[260px] shadow-xs">
                            <div className="flex items-center gap-1.5">
                              {item.id === 'vip_badge' && (
                                <Crown size={13} className="text-amber-400 shrink-0" />
                              )}
                              {item.id === 'ai_limit' && (
                                <Zap size={13} className="text-cyan-400 shrink-0 fill-cyan-400" />
                              )}
                              <span>{item.name}</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-3 text-center border-b border-zinc-800/60">
                            {renderStreamlinedCell(item.free, 'free')}
                          </td>

                          <td className="py-3.5 px-3 text-center bg-indigo-500/[0.03] border-x border-b border-indigo-500/20">
                            {renderStreamlinedCell(item.pro, 'pro')}
                          </td>

                          <td className="py-3.5 px-3 text-center bg-amber-500/[0.04] border-l border-b border-amber-500/25">
                            {renderStreamlinedCell(item.lifetime, 'lifetime')}
                          </td>
                        </tr>
                      ))}
                    </tbody>

                    <tfoot>
                      <tr className="bg-zinc-950/80">
                        <td className="sticky left-0 bg-[#0c0c0e] shadow-[2px_0_8px_rgba(0,0,0,0.7)] z-10 border-r border-zinc-800 py-3 px-4 text-xs text-zinc-400 min-w-[200px] sm:min-w-[260px] shadow-xs">
                          <div className="flex items-center gap-1.5 text-zinc-400 font-mono text-[11px]">
                            <ShieldCheck size={14} className="text-zinc-400 shrink-0" />
                            <span className="truncate">Cam kết minh bạch 100% không chi phí ẩn</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              downgradeToFree();
                              setStatusMessage({ type: 'info', text: 'Đã chuyển về gói Cơ Bản miễn phí.' });
                            }}
                            className="px-3 py-1.5 rounded-full border border-zinc-700 hover:bg-zinc-800 text-[11px] text-zinc-400 transition cursor-pointer"
                          >
                            Bắt Đầu Free
                          </button>
                        </td>
                        <td className="py-3 px-3 text-center bg-indigo-500/[0.03] border-x border-indigo-500/20">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => handleSelectPlanAndCheckout('monthly')}
                              className="px-2.5 py-1.5 rounded-full border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-[11px] text-white font-medium transition cursor-pointer"
                            >
                              Gói Tháng (59k)
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSelectPlanAndCheckout('yearly')}
                              className="px-2.5 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-[11px] text-white font-bold transition cursor-pointer shadow-xs"
                            >
                              Gói Năm (-34%)
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center bg-amber-500/[0.04] border-l border-amber-500/25">
                          <button
                            type="button"
                            onClick={() => handleSelectPlanAndCheckout('lifetime')}
                            className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-[11px] text-black font-black transition cursor-pointer shadow-md inline-flex items-center gap-1"
                          >
                            <Crown size={11} className="fill-black" />
                            Sở Hữu Trọn Đời
                          </button>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </section>
          </>
        )}

        {/* ========================================================================= */}
        {/* KHUNG QUẢN TRỊ COUPON ĐỘNG TRÊN SUPABASE CLOUD (DÀNH CHO OWNER)           */}
        {/* ========================================================================= */}
        <AdminCouponManager />

        {/* ========================================================================= */}
        {/* KHỐI NHẬP MÃ QUÀ TẶNG / GÓI ĐẶC QUYỀN (HIỂN THỊ CHO TẤT CẢ CÁC GÓI)       */}
        {/* ========================================================================= */}
        <div data-testid="universal-coupon-redemption" className="p-5 sm:p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 max-w-2xl mx-auto w-full space-y-4 mt-6">
          {/* Dual Tab Pill Navigation */}
          <div className="flex items-center justify-center p-1 rounded-full bg-zinc-950/80 border border-zinc-800 max-w-md mx-auto">
            <button
              type="button"
              data-testid="tab-ai-credits"
              onClick={() => setBillingTab('credits')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3.5 rounded-full text-xs font-semibold transition cursor-pointer ${
                billingTab === 'credits'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
              }`}
            >
              <Zap size={14} className="text-amber-400" />
              <span>Nạp Lẻ AI Credits ⚡</span>
            </button>
            <button
              type="button"
              data-testid="tab-coupon"
              onClick={() => setBillingTab('coupon')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3.5 rounded-full text-xs font-semibold transition cursor-pointer ${
                billingTab === 'coupon'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
              }`}
            >
              <Gift size={14} className="text-indigo-400" />
              <span>Mã Ưu Đãi / Coupon</span>
            </button>
          </div>

          {/* TAB 1: NẠP LẺ AI CREDITS PACKS */}
          {billingTab === 'credits' && (
            <div className="space-y-4 pt-1">
              {isUserLifetime && !isLifetimeTopupExpanded ? (
                <div className="text-center py-2 space-y-2.5 animate-in fade-in duration-200">
                  <p className="text-xs text-zinc-400">
                    Tài khoản của bạn đã có đặc quyền hạn mức <strong className="text-amber-300 font-mono">1.000⚡/tuần</strong> của gói Trọn Đời.
                  </p>
                  <button
                    type="button"
                    data-testid="btn-toggle-lifetime-topup"
                    onClick={() => setIsLifetimeTopupExpanded(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-zinc-800 hover:border-zinc-700 bg-zinc-950/70 hover:bg-zinc-800/80 text-zinc-400 hover:text-white text-xs font-medium transition cursor-pointer shadow-xs"
                  >
                    <ChevronDown size={14} className="text-amber-400" />
                    <span>Cần nạp thêm Credits cho dự án lớn?</span>
                  </button>
                </div>
              ) : (
                <>
                  <div className="text-center space-y-1">
                    <h3 className="text-sm font-bold text-white flex items-center justify-center gap-1.5">
                      <span>Nạp Lẻ Điểm AI Study Credits</span>
                      <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                        Không Hết Hạn
                      </span>
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Cần thêm điểm hỏi bài tập gia sư Socratic? Nạp lẻ nhanh chóng qua VietQR hoặc MoMo, điểm cộng dồn vĩnh viễn vào tài khoản.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                    {CREDIT_PACKS.map((pack) => (
                      <div
                        key={pack.id}
                        className={`p-3 rounded-xl border flex flex-col justify-between text-center relative transition hover:scale-[1.02] ${
                          pack.popular
                            ? 'border-amber-500/50 bg-amber-500/[0.06] shadow-sm'
                            : 'border-zinc-800 bg-zinc-950/60 hover:border-zinc-700'
                        }`}
                      >
                        {pack.popular && (
                          <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.2 rounded-full bg-amber-400 text-neutral-950 font-black text-[9px] uppercase tracking-wider shadow-xs">
                            Phổ biến
                          </span>
                        )}
                        <div className="space-y-1 pt-1">
                          <div className="text-base sm:text-lg font-black text-amber-300 font-mono">
                            {pack.credits.toLocaleString()}⚡
                          </div>
                          <div className="text-xs font-bold text-white">
                            {pack.formatted}
                          </div>
                          {pack.discount !== '0%' && (
                            <span className="text-[9px] font-semibold text-emerald-400 block">
                              {pack.discount}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            useAiStore.getState().addCredits(pack.credits);
                            setStatusMessage({
                              type: 'success',
                              text: `Đã nạp thành công +${pack.credits}⚡ AI Credits vào tài khoản!`
                            });
                          }}
                          className="mt-3 w-full py-2 rounded-full bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-[11px] transition cursor-pointer shadow-xs"
                        >
                          Nạp ⚡
                        </button>
                      </div>
                    ))}
                  </div>

                  {isUserLifetime && (
                    <div className="text-center pt-1">
                      <button
                        type="button"
                        onClick={() => setIsLifetimeTopupExpanded(false)}
                        className="text-[11px] text-zinc-400 hover:text-white underline cursor-pointer"
                      >
                        ▴ Thu gọn gói nạp
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* TAB 2: NHẬP MÃ COUPON / QUÀ TẶNG */}
          {billingTab === 'coupon' && (
            <div className="space-y-3 pt-1 text-center">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white">Kích Hoạt Mã Quà Tặng / Ưu Đãi</h3>
                <p className="text-xs text-zinc-400">
                  Nhập mã quà tặng từ sự kiện hoặc Chủ sở hữu để kích hoạt hoặc cộng dồn thời hạn PRO ngay.
                </p>
              </div>
              <form onSubmit={handleRedeemCoupon} className="flex items-center gap-2 max-w-md mx-auto pt-1">
                <input
                  type="text"
                  data-testid="input-coupon-universal"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="VD: PRO50, VIP7DAYS, BOSSSECRET..."
                  className="flex-1 px-3.5 py-2 rounded-xl bg-black/50 border border-zinc-700 text-white font-mono text-xs uppercase focus:outline-none focus:border-amber-400"
                />
                <button
                  type="submit"
                  data-testid="btn-redeem-coupon-universal"
                  className="px-5 py-2 rounded-full bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs transition cursor-pointer shrink-0"
                >
                  Áp Dụng
                </button>
              </form>
              {couponResult && (
                <div
                  className={`text-xs font-medium flex items-center justify-center gap-1.5 pt-1 ${
                    couponResult.success ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {couponResult.success ? <Check size={13} /> : <AlertCircle size={13} />}
                  <span>{couponResult.text}</span>
                </div>
              )}
            </div>
          )}
        </div>
        </main>

      {/* MoMo / VietQR Payment Modal */}
      <MoMoPaymentModal
        isOpen={isMoMoModalOpen}
        cycle={cycle}
        initialCoupon={appliedDiscount?.code}
        initialDiscountPercent={appliedDiscount?.percent}
        onClose={() => setIsMoMoModalOpen(false)}
        onSuccess={() => {
          setStatusMessage({
            type: 'success',
            text: `Thanh toán chuyển khoản thành công! Đã kích hoạt gói PRO (${currentPlan.label}) cho tài khoản của bạn.`
          });
        }}
      />

      <SharedFooter />
    </div>
  );
};
