import React, { useState } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
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
  User,
  Shield,
  CreditCard,
  Database,
  Crown,
  Receipt,
  Award
} from 'lucide-react';
import { MoMoPaymentModal } from './MoMoPaymentModal';
import { PomoFocusLogo } from './PomoFocusLogo';
import { couponService } from '../services/couponService';
import { PRICING_PLANS, COMPARISON_FEATURES, PlanCycle } from '../config/pricing';
import { isOwnerEmail, isLadyBoss, isVipFriend } from '../services/authService';

export const BillingView: React.FC = () => {
  const router = useRouter();
  const [cycle, setCycle] = useState<PlanCycle>('yearly');
  const [statusMessage, setStatusMessage] = useState<{ type: 'info' | 'success'; text: string } | null>(null);
  const [isMoMoModalOpen, setIsMoMoModalOpen] = useState(false);

  const { upgradeToSandboxPro, downgradeToFree, isPro, isLifetime, user, planLabel } = useAuthStore();
  const [couponCode, setCouponCode] = useState('');
  const [couponResult, setCouponResult] = useState<{ success: boolean; text: string } | null>(null);

  const currentPlan = PRICING_PLANS[cycle];

  const handleRedeemCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    const res = couponService.redeemCoupon(couponCode, user);
    setCouponResult({ success: res.success, text: res.message });
    if (res.success && (res.coupon?.type === 'free_lifetime' || res.coupon?.type === 'free_days')) {
      setStatusMessage({ type: 'success', text: res.message });
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
    isOwnerEmail(user?.email) ||
    isLadyBoss(user?.email) ||
    isVipFriend(user?.email)
  );

  return (
    <div
      data-testid="billing-view"
      className="min-h-screen w-full bg-[#09090b] text-[#f4f4f5] font-sans antialiased flex flex-col selection:bg-white selection:text-black select-none"
    >
      <PlatformHeader />

      <main className="flex-1 w-full max-w-5xl mx-auto p-4 sm:p-8 md:p-12 space-y-10">
        {/* Navigation Breadcrumb & Back to App */}
        <div className="w-full flex items-center justify-between pb-3 border-b border-zinc-800/60">
          <div className="flex items-center gap-1.5 p-1 bg-zinc-900/80 rounded-xl border border-zinc-800 text-xs overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => router.navigate('/profile')}
              className="px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
            >
              <User size={13} className="text-emerald-400" />
              <span>Hồ Sơ Cá Nhân</span>
            </button>
            <button
              type="button"
              onClick={() => router.navigate('/account/security')}
              className="px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
            >
              <Shield size={13} className="text-amber-400" />
              <span>Bảo Mật</span>
            </button>
            <button
              type="button"
              className="px-3 py-1.5 rounded-lg bg-white/15 text-white font-medium shadow-sm transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
            >
              <CreditCard size={13} className="text-cyan-400" />
              <span>Gói Cước</span>
            </button>
            <button
              type="button"
              onClick={() => router.navigate('/privacy-data')}
              className="px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
            >
              <Database size={13} className="text-sky-400" />
              <span>Quyền Riêng Tư</span>
            </button>
          </div>

          <button
            type="button"
            data-testid="billing-back-btn"
            onClick={() => router.navigate('/app')}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-zinc-800 hover:border-zinc-700 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs font-medium transition cursor-pointer shrink-0"
          >
            <ArrowLeft size={14} />
            <span className="hidden sm:inline">Quay lại Không Gian Học</span>
          </button>
        </div>

        {statusMessage && (
          <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-950/40 text-emerald-300 text-xs flex items-center gap-2.5 shadow-md">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
            <span className="font-medium">{statusMessage.text}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TRƯỜNG HỢP A: NGƯỜI DÙNG ĐÃ SỞ HỮU PRO TRỌN ĐỜI (FOUNDER LIFETIME CARD)  */}
        {/* ========================================================================= */}
        {isUserLifetime ? (
          <div data-testid="billing-founder-card" className="space-y-8 animate-in fade-in duration-200">
            {/* Thẻ Hội Viên Danh Dự Kim Loại Đen */}
            <div className="relative rounded-3xl border border-amber-400/40 bg-gradient-to-b from-zinc-900 via-zinc-950 to-black p-6 sm:p-10 shadow-2xl overflow-hidden">
              {/* Ánh sáng kim loại & vầng hào quang */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
              <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

              {/* Header của thẻ */}
              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800/80">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-amber-400/15 border border-amber-400/30 text-amber-300 flex items-center justify-center shadow-inner shrink-0">
                    <Crown size={24} className="animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold">
                        FOUNDER LIFETIME VIP
                      </span>
                      <span
                        data-testid="billing-pro-active-badge"
                        className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      >
                        🟢 Đang Kích Hoạt Vĩnh Viễn
                      </span>
                    </div>
                    <h1 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight mt-0.5">
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
                  <div className="text-[11px] text-zinc-500">Chủ Sở Hữu Thẻ</div>
                  <div className="text-sm font-bold text-white truncate">{user?.displayName || 'Chủ Tài Khoản'}</div>
                  <div className="text-[11px] text-zinc-400 font-mono truncate">{user?.email}</div>
                </div>

                <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800 space-y-1">
                  <div className="text-[11px] text-zinc-500">Cấp Bậc Hội Viên</div>
                  <div className="text-sm font-bold text-amber-300 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-amber-400" />
                    <span>{planLabel}</span>
                  </div>
                  <div className="text-[11px] text-zinc-400">Đặc quyền tối cao mở khóa 100%</div>
                </div>

                <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800 space-y-1">
                  <div className="text-[11px] text-zinc-500">Mã Định Danh VIP</div>
                  <div className="text-sm font-mono font-bold text-zinc-200">
                    POMO-{(user?.id || 'FOUNDER').slice(0, 8).toUpperCase()}
                  </div>
                  <div className="text-[11px] text-emerald-400">Bảo mật mã hóa xác thực</div>
                </div>
              </div>

              {/* Danh sách 10 Đặc Quyền Mở Khóa Tối Đa */}
              <div className="relative z-10 pt-6 space-y-4">
                <div className="text-xs font-semibold text-zinc-300 flex items-center gap-2">
                  <ShieldCheck size={16} className="text-emerald-400" />
                  <span>Toàn Bộ 10+ Đặc Quyền Cao Cấp Đang Được Mở Khóa Tối Đa:</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/80">
                    <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-zinc-200">Phòng học WebRTC Full-Mesh kết nối không giới hạn lên đến <strong>50 học viên</strong></span>
                  </div>
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/80">
                    <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-zinc-200">Thời lượng phòng học <strong>24/7 không giới hạn</strong>, không bị ngắt quãng</span>
                  </div>
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/80">
                    <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-zinc-200"><strong>Bảng Vẽ Chung Thời Gian Thực</strong> (Collaborative Whiteboard đa người dùng)</span>
                  </div>
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/80">
                    <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-zinc-200">Trình đọc và ghi chú tài liệu PDF song song dạng sách hai trang</span>
                  </div>
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/80">
                    <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-zinc-200"><strong>Widget Media Độc Lập</strong> &amp; Chế độ xem video cửa sổ thu nhỏ Mini PiP</span>
                  </div>
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/80">
                    <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-zinc-200">101+ Không gian học tập HD thực tế &amp; Bộ hòa âm Lo-Fi không giới hạn</span>
                  </div>
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/80">
                    <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-amber-300 font-semibold">✨ Độc quyền truy cập sớm nhất các tính năng mới (Early Access Labs)</span>
                  </div>
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/80">
                    <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-zinc-200">Huy hiệu hồ sơ mạ vàng PRO TRỌN ĐỜI vĩnh viễn trên toàn hệ thống</span>
                  </div>
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/80">
                    <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-zinc-200">Đồng bộ dữ liệu đám mây đa thiết bị tức thì và sao lưu an toàn</span>
                  </div>
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/80">
                    <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-zinc-200">Kênh hỗ trợ kỹ thuật ưu tiên 24/7 trực tiếp từ nhà phát triển</span>
                  </div>
                </div>
              </div>

              {/* Lịch Sử Thanh Toán & Biên Lai VietQR */}
              <div className="relative z-10 mt-8 pt-6 border-t border-zinc-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                    <Receipt size={18} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>Biên Lai Quyết Toán: VietQR 24/7 (Vietcombank)</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono">ĐÃ XÁC THỰC</span>
                    </div>
                    <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                      Mã GD: VCB_LIFETIME_{user?.id?.slice(0, 8).toUpperCase() || 'FOUNDER'} • Số tiền: 799.000₫
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => router.navigate('/profile')}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white text-xs font-semibold transition cursor-pointer"
                  >
                    Quản Lý Hồ Sơ
                  </button>
                  <button
                    type="button"
                    onClick={() => router.navigate('/app')}
                    className="px-5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold transition cursor-pointer shadow-lg"
                  >
                    Vào Không Gian Học
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
            <div className="p-6 sm:p-8 rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900 shadow-xl relative overflow-hidden">
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
                    onClick={() => router.navigate('/app')}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white text-xs font-medium transition cursor-pointer"
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
                      <span className="text-xs text-zinc-500">/ một lần duy nhất</span>
                    </div>
                    <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                      Nâng cấp lên gói Founder Lifetime vĩnh viễn. Không bao giờ phải trả phí lại, mở khóa phòng 50 người và quyền truy cập sớm Labs.
                    </p>
                  </div>

                  <div className="space-y-2 pt-3 border-t border-zinc-800 text-xs">
                    <div className="flex items-center gap-2 text-zinc-200">
                      <Sparkles size={14} className="text-amber-400 shrink-0" />
                      <span>Sở hữu vĩnh viễn không bao giờ hết hạn</span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-200">
                      <Sparkles size={14} className="text-amber-400 shrink-0" />
                      <span>Sức chứa phòng học tối đa 50 người</span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-200">
                      <Sparkles size={14} className="text-amber-400 shrink-0" />
                      <span>Độc quyền Early Access tính năng mới</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  data-testid="btn-upgrade-lifetime"
                  onClick={() => handleSelectPlanAndCheckout('lifetime')}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-black text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-98"
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
              <span className="text-[11px] font-mono uppercase tracking-widest text-zinc-500 block">
                ĐẦU TƯ CHO SỰ TẬP TRUNG
              </span>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                Bảng Giá Dịch Vụ PomoFocus PRO
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto leading-relaxed">
                Nâng tầm hiệu suất với phòng học Meet không giới hạn, Bảng vẽ chung thời gian thực, và kho âm thanh chất lượng cao.
              </p>

              {/* Billing Cycle Switch (3 gói: 1T / 1N / Trọn Đời) */}
              <div className="mt-4 inline-flex items-center p-1 rounded-xl border border-zinc-800 bg-zinc-900/80 text-xs">
                <button
                  type="button"
                  data-testid="billing-cycle-monthly"
                  onClick={() => setCycle('monthly')}
                  className={`px-4 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                    cycle === 'monthly' ? 'bg-white text-black font-semibold shadow-sm' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Hàng tháng
                </button>
                <button
                  type="button"
                  data-testid="billing-cycle-yearly"
                  onClick={() => setCycle('yearly')}
                  className={`px-4 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 cursor-pointer ${
                    cycle === 'yearly' ? 'bg-white text-black font-semibold shadow-sm' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <span>Hàng năm</span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-500/20 text-emerald-300 font-mono font-bold uppercase tracking-wider">
                    -34%
                  </span>
                </button>
                <button
                  type="button"
                  data-testid="billing-cycle-lifetime"
                  onClick={() => setCycle('lifetime')}
                  className={`px-4 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 cursor-pointer ${
                    cycle === 'lifetime' ? 'bg-white text-black font-semibold shadow-sm' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Zap size={12} className={cycle === 'lifetime' ? 'text-black' : 'text-amber-400'} />
                  <span>Trọn đời</span>
                </button>
              </div>
            </div>

            {/* Beta Notice Banner */}
            <div data-testid="billing-beta-banner" className="p-4 sm:p-6 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <Sparkles size={20} />
                </div>
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-2 flex-wrap">
                    <span>Chương Trình Trải Nghiệm Demo Beta</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 whitespace-nowrap">
                      CỔNG THANH TOÁN TỰ ĐỘNG &amp; SANDBOX TEST
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 mt-0.5 leading-relaxed">
                    Đăng ký tài khoản trong giai đoạn thử nghiệm để được tự động nâng cấp 3 năm gói PRO hoàn toàn miễn phí hoặc trải nghiệm cổng VietQR tự động.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => router.navigate('/signup')}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition cursor-pointer whitespace-nowrap shadow shrink-0"
              >
                Nhận 3 Năm PRO Ngay
              </button>
            </div>

            {/* Pricing Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Free Tier */}
              <div className="p-6 sm:p-8 rounded-2xl border border-zinc-800 bg-zinc-900/40 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase tracking-widest text-zinc-400">GÓI CƠ BẢN</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                      Vĩnh viễn
                    </span>
                  </div>

                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl sm:text-4xl font-extrabold text-white">0₫</span>
                      <span className="text-xs text-zinc-500">/ mãi mãi</span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1">Dành cho cá nhân cần không gian tối giản tự học.</p>
                  </div>

                  <div className="space-y-2.5 pt-4 border-t border-zinc-800 text-xs">
                    <div className="flex items-center gap-2.5">
                      <Check size={14} className="text-zinc-400 shrink-0" />
                      <span className="text-zinc-300">Đồng hồ Pomodoro tùy chỉnh 25/5/15</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Check size={14} className="text-zinc-400 shrink-0" />
                      <span className="text-zinc-300">Quản lý nhiệm vụ (Tasks) &amp; Ghi chú (Notes)</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Check size={14} className="text-zinc-400 shrink-0" />
                      <span className="text-zinc-300">Âm thanh thiên nhiên cơ bản</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Check size={14} className="text-zinc-400 shrink-0" />
                      <span className="text-zinc-300">Phòng học công cộng tối đa 90 phút / ngày</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Check size={14} className="text-zinc-400 shrink-0" />
                      <span className="text-zinc-300">Tạo tối đa 3 phòng riêng / ngày (45 phút)</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  data-testid="btn-downgrade-free"
                  disabled={!isPro}
                  onClick={() => {
                    downgradeToFree();
                    setStatusMessage({ type: 'info', text: 'Đã chuyển về gói Cơ Bản miễn phí.' });
                    setTimeout(() => setStatusMessage(null), 4000);
                  }}
                  className={`w-full py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    !isPro
                      ? 'bg-zinc-800 text-zinc-500 cursor-default'
                      : 'border border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800'
                  }`}
                >
                  {!isPro ? 'Đang Sử Dụng' : 'Chuyển về Gói Cơ Bản'}
                </button>
              </div>

              {/* PRO Tier */}
              <div className="p-6 sm:p-8 rounded-2xl border-2 border-white bg-zinc-900/80 relative flex flex-col justify-between space-y-6 shadow-2xl">
                {cycle === 'yearly' && (
                  <div className="absolute -top-3 right-6 px-3 py-0.5 rounded-full bg-white text-black text-[10px] font-bold uppercase tracking-wider shadow">
                    PHỔ BIẾN NHẤT
                  </div>
                )}
                {cycle === 'lifetime' && (
                  <div className="absolute -top-3 right-6 px-3 py-0.5 rounded-full bg-amber-400 text-black text-[10px] font-bold uppercase tracking-wider shadow">
                    GIÁ TRỊ NHẤT
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase tracking-widest text-emerald-400">
                      {cycle === 'lifetime' ? 'GÓI PRO TRỌN ĐỜI' : 'GÓI CHUYÊN NGHIỆP'}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                      {cycle === 'yearly' ? 'Tiết kiệm ~34%' : cycle === 'lifetime' ? 'Một lần duy nhất' : 'Linh hoạt'}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl sm:text-4xl font-extrabold text-white">
                        {cycle === 'lifetime'
                          ? currentPlan.formatted
                          : cycle === 'yearly'
                          ? currentPlan.equivalentMonthlyFormatted
                          : currentPlan.formatted}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {cycle === 'lifetime' ? '/ vĩnh viễn' : '/ tháng'}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1">
                      {currentPlan.description}
                    </p>
                  </div>

                  {/* Dòng quyền lợi độc quyền PRO Trọn Đời (Lifetime) */}
                  {cycle === 'lifetime' && (
                    <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-400/15 to-amber-500/10 border border-amber-400/30 text-amber-200 shadow-inner">
                      <div className="flex items-center gap-2 font-semibold text-xs text-amber-300">
                        <Sparkles size={15} className="text-amber-400 shrink-0 animate-pulse" />
                        <span>✨ Truy cập sớm toàn bộ tính năng mới (Early Access Labs)</span>
                      </div>
                      <p className="text-[11px] text-zinc-300 mt-1 pl-6 leading-relaxed">
                        Được trải nghiệm và dùng thử trước toàn bộ các công cụ, tính năng và giao diện sắp cập nhật trước khi phát hành chính thức.
                      </p>
                    </div>
                  )}

                  <div className="space-y-2.5 pt-4 border-t border-zinc-800 text-xs">
                    <div className="flex items-center gap-2.5">
                      <Check size={14} className="text-emerald-400 shrink-0" />
                      <span className="text-white font-medium">Bảng Vẽ Chung Thời Gian Thực (Collaborative Whiteboard)</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Check size={14} className="text-emerald-400 shrink-0" />
                      <span className="text-white font-medium">Chú thích &amp; Đọc tài liệu PDF dạng quyển sách</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Check size={14} className="text-emerald-400 shrink-0" />
                      <span className="text-white font-medium">WebRTC Full-Mesh kết nối không giới hạn thời gian (lên đến {cycle === 'lifetime' ? '50' : '30'} người)</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Check size={14} className="text-emerald-400 shrink-0" />
                      <span className="text-white font-medium">Widget Media độc lập &amp; Chế độ Mini PiP</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Check size={14} className="text-emerald-400 shrink-0" />
                      <span className="text-white font-medium">101+ Không gian học tập HD thực tế &amp; Âm thanh Lo-Fi</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Check size={14} className="text-emerald-400 shrink-0" />
                      <span className="text-white font-medium">Đồng bộ đám mây đa thiết bị tự động &amp; Báo cáo phân tích</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    type="button"
                    data-testid="btn-pay-momo"
                    onClick={() => setIsMoMoModalOpen(true)}
                    className="w-full py-3 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-98"
                  >
                    <span>Nâng Cấp PRO (VietQR 24/7)</span>
                  </button>

                  <button
                    type="button"
                    data-testid="btn-activate-pro-sandbox"
                    onClick={() => handleSimulateUpgrade(currentPlan.durationMonths)}
                    className="w-full py-2 rounded-xl border border-zinc-700 bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 hover:text-white text-[11px] font-medium transition cursor-pointer"
                  >
                    Kích hoạt Giả lập (Sandbox Test)
                  </button>
                </div>
              </div>
            </div>

            {/* Feature Comparison Table Section */}
            <section
              data-testid="billing-comparison-section"
              className="pt-8 border-t border-zinc-800/80 space-y-6"
            >
              <div className="text-center space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full inline-block">
                  MINH BẠCH &amp; ĐA CHIỀU
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Bảng So Sánh Quyền Lợi Toàn Diện
                </h2>
                <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto">
                  So sánh chi tiết quyền lợi giữa gói Miễn Phí và các gói PRO Tháng, PRO Năm, PRO Trọn Đời của PomoFocus.
                </p>
              </div>

              {/* Table Container */}
              <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-900/40 backdrop-blur-sm shadow-xl scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-900">
                <table className="w-full text-left border-collapse min-w-[760px] text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-950/70 text-zinc-400 font-mono uppercase text-[11px]">
                      <th className="py-4 px-4 w-[28%] text-zinc-300 font-semibold">Tính Năng &amp; Đặc Quyền</th>
                      <th className="py-4 px-3 w-[16%] text-center text-zinc-400">Gói Miễn Phí (Free)</th>
                      <th className="py-4 px-3 w-[18%] text-center text-zinc-300">PRO Tháng</th>
                      <th className="py-4 px-3 w-[18%] text-center text-emerald-300 bg-emerald-500/[0.04]">
                        PRO Năm <span className="text-[9px] text-emerald-400 font-bold block normal-case">(-34%)</span>
                      </th>
                      <th className="py-4 px-3 w-[20%] text-center text-amber-300 bg-amber-500/[0.05] border-l border-amber-500/20">
                        <span className="inline-flex items-center gap-1">
                          <Sparkles size={11} className="text-amber-400" />
                          PRO Trọn Đời
                        </span>
                        <span className="text-[9px] text-amber-400/90 font-bold block normal-case">(Lifetime VIP)</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {COMPARISON_FEATURES.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-zinc-800/30 transition-colors"
                      >
                        <td className="py-3.5 px-4 font-medium text-zinc-200">
                          <div className="flex items-center gap-1.5">
                            {item.id === 'early_access' && (
                              <Sparkles size={13} className="text-amber-400 shrink-0" />
                            )}
                            <span>{item.feature}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-3 text-center text-zinc-400">
                          {item.free === '❌' ? (
                            <span className="text-zinc-600 font-bold text-sm">✕</span>
                          ) : (
                            <span>{item.free}</span>
                          )}
                        </td>

                        <td className="py-3.5 px-3 text-center text-zinc-300">
                          {item.monthly === '❌' ? (
                            <span className="text-zinc-600 font-bold text-sm">✕</span>
                          ) : item.monthly === 'Không giới hạn' ? (
                            <span className="text-emerald-400 font-semibold inline-flex items-center gap-1">
                              <Check size={13} /> Không giới hạn
                            </span>
                          ) : (
                            <span>{item.monthly}</span>
                          )}
                        </td>

                        <td className="py-3.5 px-3 text-center text-zinc-200 bg-emerald-500/[0.02]">
                          {item.yearly === 'Ưu tiên Beta' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              Ưu tiên Beta
                            </span>
                          ) : item.yearly === 'Không giới hạn' ? (
                            <span className="text-emerald-400 font-semibold inline-flex items-center gap-1">
                              <Check size={13} /> Không giới hạn
                            </span>
                          ) : (
                            <span>{item.yearly}</span>
                          )}
                        </td>

                        <td className="py-3.5 px-3 text-center bg-amber-500/[0.04] border-l border-amber-500/20">
                          {item.id === 'early_access' ? (
                            <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-amber-500/25 text-amber-300 border border-amber-400/40 shadow-sm inline-flex items-center gap-1 whitespace-nowrap">
                              <Sparkles size={11} className="text-amber-400 animate-pulse" />
                              {item.lifetime}
                            </span>
                          ) : item.id === 'badge' ? (
                            <span className="text-amber-300 font-bold text-[11px] inline-flex items-center gap-1">
                              {item.lifetime}
                            </span>
                          ) : item.lifetime === 'Không giới hạn' ? (
                            <span className="text-emerald-400 font-semibold inline-flex items-center gap-1">
                              <Check size={13} /> Không giới hạn
                            </span>
                          ) : (
                            <span className="text-amber-200 font-medium">{item.lifetime}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>

                  <tfoot>
                    <tr className="border-t border-zinc-800 bg-zinc-950/80">
                      <td className="py-4 px-4 text-xs text-zinc-400">
                        <div className="flex items-center gap-1.5 text-zinc-500 font-mono text-[11px]">
                          <ShieldCheck size={14} className="text-emerald-400" />
                          <span>Cam kết minh bạch 100% không phát sinh chi phí ẩn</span>
                        </div>
                      </td>
                      <td className="py-4 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            downgradeToFree();
                            setStatusMessage({ type: 'info', text: 'Đã chuyển về gói Cơ Bản miễn phí.' });
                          }}
                          className="px-3 py-1.5 rounded-lg border border-zinc-700 hover:bg-zinc-800 text-[11px] text-zinc-400 transition cursor-pointer"
                        >
                          Bắt Đầu Free
                        </button>
                      </td>
                      <td className="py-4 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleSelectPlanAndCheckout('monthly')}
                          className="px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-[11px] text-white font-medium transition cursor-pointer"
                        >
                          Chọn Gói Tháng
                        </button>
                      </td>
                      <td className="py-4 px-3 text-center bg-emerald-500/[0.02]">
                        <button
                          type="button"
                          onClick={() => handleSelectPlanAndCheckout('yearly')}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[11px] text-black font-bold transition cursor-pointer shadow-sm"
                        >
                          Chọn Gói Năm
                        </button>
                      </td>
                      <td className="py-4 px-3 text-center bg-amber-500/[0.04] border-l border-amber-500/20">
                        <button
                          type="button"
                          onClick={() => handleSelectPlanAndCheckout('lifetime')}
                          className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-[11px] text-neutral-950 font-bold transition cursor-pointer shadow-md inline-flex items-center gap-1"
                        >
                          <Zap size={11} className="fill-black" />
                          Sở Hữu Trọn Đời
                        </button>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>

            {/* Coupon Redemption Card */}
            <div className="p-5 sm:p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 max-w-xl mx-auto w-full text-center space-y-3">
              <div className="flex items-center justify-center gap-2 text-white font-bold text-sm">
                <Gift size={16} className="text-amber-400" />
                <span>Kích Hoạt Mã Ưu Đãi / Quà Tặng (Coupon)</span>
              </div>
              <p className="text-xs text-zinc-400">
                Bạn có mã quà tặng từ sự kiện hoặc Chủ sở hữu? Nhập mã vào đây để kích hoạt quyền lợi ngay.
              </p>
              <form onSubmit={handleRedeemCoupon} className="flex items-center gap-2 max-w-md mx-auto pt-1">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="VD: PRO50, VIP7DAYS, BOSSSECRET..."
                  className="flex-1 px-3.5 py-2 rounded-xl bg-black/50 border border-zinc-700 text-white font-mono text-xs uppercase focus:outline-none focus:border-amber-400"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs transition cursor-pointer shrink-0"
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
          </>
        )}
      </main>

      {/* MoMo / VietQR Payment Modal */}
      <MoMoPaymentModal
        isOpen={isMoMoModalOpen}
        cycle={cycle}
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
