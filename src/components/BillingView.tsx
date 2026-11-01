import React, { useState } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import { useRouter } from '../services/router';
import { PlatformHeader } from './PlatformHeader';
import { SharedFooter } from './SharedFooter';
import { Check, CheckCircle2, Sparkles, Gift, AlertCircle, Zap, ShieldCheck, ArrowLeft } from 'lucide-react';
import { MoMoPaymentModal } from './MoMoPaymentModal';
import { PomoFocusLogo } from './PomoFocusLogo';
import { couponService } from '../services/couponService';
import { PRICING_PLANS, COMPARISON_FEATURES, PlanCycle } from '../config/pricing';

export const BillingView: React.FC = () => {
  const router = useRouter();
  const [cycle, setCycle] = useState<PlanCycle>('yearly');
  const [statusMessage, setStatusMessage] = useState<{ type: 'info' | 'success'; text: string } | null>(null);
  const [isMoMoModalOpen, setIsMoMoModalOpen] = useState(false);

  const { upgradeToSandboxPro, downgradeToFree, isPro, user } = useAuthStore();
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

  return (
    <div
      data-testid="billing-view"
      className="min-h-screen w-full bg-[#09090b] text-[#f4f4f5] font-sans antialiased flex flex-col selection:bg-white selection:text-black select-none"
    >
      <PlatformHeader />

      <main className="flex-1 w-full max-w-5xl mx-auto p-4 sm:p-8 md:p-12 space-y-12">
        {/* Navigation Breadcrumb & Back to App */}
        <div className="w-full flex items-center justify-between pb-2 border-b border-zinc-800/60">
          <button
            type="button"
            data-testid="billing-back-btn"
            onClick={() => router.navigate('/app')}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-zinc-800 hover:border-zinc-700 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs font-medium transition cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Quay lại Không Gian Học</span>
          </button>
          <div className="text-[11px] text-zinc-500 font-mono">
            <span>/billing</span>
          </div>
        </div>

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

          {/* Active Status Badge if User is Pro */}
          {isPro && (
            <div
              data-testid="billing-pro-active-badge"
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold shadow-sm animate-fade-in"
            >
              <CheckCircle2 size={13} className="text-emerald-400" />
              <span>Gói PRO Đang Kích Hoạt</span>
            </div>
          )}

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

        {statusMessage && (
          <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-950/40 text-emerald-300 text-xs flex items-center gap-2.5 shadow-md">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
            <span className="font-medium">{statusMessage.text}</span>
          </div>
        )}

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
                    {/* Feature Name */}
                    <td className="py-3.5 px-4 font-medium text-zinc-200">
                      <div className="flex items-center gap-1.5">
                        {item.id === 'early_access' && (
                          <Sparkles size={13} className="text-amber-400 shrink-0" />
                        )}
                        <span>{item.feature}</span>
                      </div>
                    </td>

                    {/* Free Plan */}
                    <td className="py-3.5 px-3 text-center text-zinc-400">
                      {item.free === '❌' ? (
                        <span className="text-zinc-600 font-bold text-sm">✕</span>
                      ) : (
                        <span>{item.free}</span>
                      )}
                    </td>

                    {/* PRO Monthly */}
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

                    {/* PRO Yearly */}
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

                    {/* PRO Lifetime */}
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

              {/* Bottom Action Footer */}
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
