import React, { useState } from 'react';
import { useRouter } from '../services/router';
import { useTimerStore } from '../stores/useTimerStore';
import { useLayoutStore } from '../stores/useLayoutStore';
import { useAudioStore } from '../stores/useAudioStore';
import { useAuthStore } from '../stores/useAuthStore';
import { couponService, Coupon } from '../services/couponService';
import { studyRoomService } from '../services/studyRoomService';
import { ChimeSoundType } from '../types/audio';
import { PlatformHeader } from './PlatformHeader';
import { SharedFooter } from './SharedFooter';
import {
  Settings,
  Clock,
  Volume2,
  Sliders,
  RotateCcw,
  Check,
  CheckCircle2,
  Shield,
  Trash2,
  Plus,
  Copy,
  Sparkles,
  RefreshCw,
  User,
  CreditCard,
  Database,
  ArrowLeft
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const router = useRouter();
  const timerSettings = useTimerStore((s) => s.settings);
  const updateTimerSettings = useTimerStore((s) => s.updateSettings);

  const glassSettings = useLayoutStore((s) => s.glassSettings);
  const setGlassPreset = useLayoutStore((s) => s.setGlassPreset);
  const resetLayout = useLayoutStore((s) => s.resetLayout);

  const masterVolume = useAudioStore((s) => s.settings.masterVolume);
  const setMasterVolume = useAudioStore((s) => s.setMasterVolume);
  const selectedChime = useAudioStore((s) => s.settings.selectedChime);
  const setSelectedChime = useAudioStore((s) => s.setSelectedChime);

  const isOwner = useAuthStore((s) => s.isOwner);
  const user = useAuthStore((s) => s.user);

  // Coupon & Super-Powers state
  const [coupons, setCoupons] = useState<Coupon[]>(() => couponService.getCoupons());
  const [newCode, setNewCode] = useState('');
  const [newType, setNewType] = useState<'discount_percent' | 'free_days' | 'free_lifetime'>('discount_percent');
  const [newValue, setNewValue] = useState(30);
  const [newMaxUses, setNewMaxUses] = useState(50);
  const [newDesc, setNewDesc] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCreateCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const res = couponService.createCoupon({
      code: newCode,
      type: newType,
      value: newValue,
      maxUses: newMaxUses,
      description: newDesc
    });
    if (!res.success) {
      showToast(res.error || 'Lỗi tạo coupon');
      return;
    }
    setCoupons(couponService.getCoupons());
    setNewCode('');
    setNewDesc('');
    showToast(`Đã tạo mã coupon ${res.coupon?.code} thành công! 🎉`);
  };

  const handleDeleteCoupon = (code: string) => {
    couponService.deleteCoupon(code);
    setCoupons(couponService.getCoupons());
    showToast(`Đã xóa coupon ${code}`);
  };

  const handleCopyCoupon = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
    showToast(`Đã copy mã ${code}`);
  };

  const handlePurgeZombieSessions = () => {
    const res = studyRoomService.purgeZombieSessions();
    showToast(`Đã dọn dẹp ${res.purgedParticipants} phiên người dùng ảo và làm sạch ${res.purgedRooms.length} phòng học! 🧹`);
  };

  const handlePomodoroChange = (val: number) => {
    updateTimerSettings({ pomodoroMinutes: Math.max(1, Math.min(120, val)) });
    showToast('Đã lưu thời gian Pomodoro');
  };

  const handleShortBreakChange = (val: number) => {
    updateTimerSettings({ shortBreakMinutes: Math.max(1, Math.min(60, val)) });
    showToast('Đã lưu thời gian nghỉ ngắn');
  };

  const handleLongBreakChange = (val: number) => {
    updateTimerSettings({ longBreakMinutes: Math.max(1, Math.min(90, val)) });
    showToast('Đã lưu thời gian nghỉ dài');
  };

  const handleRoundsChange = (val: number) => {
    updateTimerSettings({ roundsBeforeLongBreak: Math.max(1, Math.min(12, val)) });
    showToast('Đã lưu chu kỳ nghỉ dài');
  };

  const handleToggleAutoTransition = () => {
    updateTimerSettings({ autoTransition: !timerSettings.autoTransition });
    showToast(
      timerSettings.autoTransition
        ? 'Đã tắt tự động chuyển hiệp'
        : 'Đã bật tự động chuyển hiệp'
    );
  };

  const handleResetLayout = () => {
    resetLayout();
    showToast('Đã đặt lại bố cục cửa sổ mặc định');
  };

  const chimes: { id: ChimeSoundType; name: string }[] = [
    { id: 'twinkle', name: 'Chuông Ngân Twinkle' },
    { id: 'playtime', name: 'Giai Điệu Playtime' },
    { id: 'scifi', name: 'Khoa Học Viễn Tưởng' },
    { id: 'slow_rise', name: 'Âm Vang Dần' },
    { id: 'rooster', name: 'Tiếng Gà Gáy' },
    { id: 'bird', name: 'Tiếng Chim Hót' }
  ];

  return (
    <div
      data-testid="settings-view"
      className="min-h-screen w-full bg-[#09090b] text-[#f4f4f5] font-sans antialiased flex flex-col selection:bg-white selection:text-black select-none"
    >
      <PlatformHeader />

      <main className="flex-1 w-full max-w-4xl mx-auto p-4 sm:p-8 md:p-12 space-y-8">
        {/* Sub-nav Tabs: Hồ Sơ | Bảo Mật | Gói Cước | Quyền Riêng Tư */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
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
              onClick={() => router.navigate('/billing')}
              className="px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
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
            onClick={() => router.navigate('/app')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-800 hover:border-zinc-700 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs font-medium transition cursor-pointer shrink-0"
          >
            <ArrowLeft size={13} />
            <span className="hidden sm:inline">Vào Không Gian</span>
          </button>
        </div>

        {/* Title */}
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <Settings size={24} className="text-white shrink-0" />
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Cài Đặt Hệ Thống & Trải Nghiệm
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400">
            Tùy biến thời lượng chu kỳ Pomodoro, âm thanh thông báo và phong cách giao diện của bạn.
          </p>
        </div>

        {/* Toast */}
        {toastMessage && (
          <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-950/40 text-emerald-300 text-xs flex items-center gap-2 shadow-sm">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
            <span className="font-medium">{toastMessage}</span>
          </div>
        )}

        {/* Section 1: Pomodoro Intervals */}
        <div className="p-5 sm:p-7 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-5">
          <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
            <Clock size={16} className="text-rose-400 shrink-0" />
            <h2 className="text-sm font-semibold text-white">Chu Kỳ Thời Gian Pomodoro</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block text-zinc-400 mb-1.5">Tập trung (Phút)</label>
              <input
                type="number"
                data-testid="input-setting-pomodoro"
                min={1}
                max={120}
                value={timerSettings.pomodoroMinutes}
                onChange={(e) => handlePomodoroChange(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-zinc-700 bg-zinc-950 text-white font-mono focus:outline-none focus:border-white transition"
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1.5">Nghỉ ngắn (Phút)</label>
              <input
                type="number"
                data-testid="input-setting-short-break"
                min={1}
                max={60}
                value={timerSettings.shortBreakMinutes}
                onChange={(e) => handleShortBreakChange(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-zinc-700 bg-zinc-950 text-white font-mono focus:outline-none focus:border-white transition"
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1.5">Nghỉ dài (Phút)</label>
              <input
                type="number"
                data-testid="input-setting-long-break"
                min={1}
                max={90}
                value={timerSettings.longBreakMinutes}
                onChange={(e) => handleLongBreakChange(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-zinc-700 bg-zinc-950 text-white font-mono focus:outline-none focus:border-white transition"
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1.5">Hiệp trước nghỉ dài</label>
              <input
                type="number"
                data-testid="input-setting-rounds"
                min={1}
                max={12}
                value={timerSettings.roundsBeforeLongBreak}
                onChange={(e) => handleRoundsChange(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-zinc-700 bg-zinc-950 text-white font-mono focus:outline-none focus:border-white transition"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-zinc-800/80 text-xs">
            <div>
              <div className="font-semibold text-white">Tự Động Chuyển Hiệp</div>
              <div className="text-[11px] text-zinc-400">
                Tự động bắt đầu đếm ngược khi hết giờ tập trung hoặc nghỉ ngơi
              </div>
            </div>
            <button
              type="button"
              data-testid="toggle-auto-transition"
              onClick={handleToggleAutoTransition}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                timerSettings.autoTransition ? 'bg-emerald-500' : 'bg-zinc-700'
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                  timerSettings.autoTransition ? 'right-1' : 'left-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Section 2: Audio Settings */}
        <div className="p-5 sm:p-7 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-5">
          <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
            <Volume2 size={16} className="text-sky-400 shrink-0" />
            <h2 className="text-sm font-semibold text-white">Âm Lượng & Chuông Báo Hoàn Thành</h2>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <div className="flex justify-between text-zinc-400 mb-1.5">
                <span>Âm lượng tổng (Master Volume)</span>
                <span className="font-mono text-white">{Math.round(masterVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={masterVolume}
                onChange={(e) => setMasterVolume(Number(e.target.value))}
                className="w-full accent-white cursor-pointer"
              />
            </div>

            <div className="pt-2">
              <label className="block text-zinc-400 mb-2">Loại chuông kết thúc hiệp</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {chimes.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelectedChime(c.id);
                      showToast(`Đã chọn chuông ${c.name}`);
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs transition cursor-pointer flex items-center justify-between ${
                      selectedChime === c.id
                        ? 'border-emerald-400 bg-emerald-500/10 text-emerald-300 font-medium'
                        : 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span>{c.name}</span>
                    {selectedChime === c.id && <Check size={12} className="text-emerald-400" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Appearance & Layout */}
        <div className="p-5 sm:p-7 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-5">
          <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
            <Sliders size={16} className="text-amber-400 shrink-0" />
            <h2 className="text-sm font-semibold text-white">Giao Diện & Vị Trí Cửa Sổ</h2>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-zinc-400 mb-2">Độ trong suốt khung kính (Glass Effect)</label>
              <div className="grid grid-cols-3 gap-2">
                {(['clear', 'balanced', 'high_contrast'] as const).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setGlassPreset(preset);
                      showToast('Đã đổi kiểu khung kính');
                    }}
                    className={`py-2.5 px-3 rounded-xl border text-xs transition cursor-pointer whitespace-nowrap ${
                      glassSettings.preset === preset
                        ? 'border-white bg-white/10 text-white font-semibold'
                        : 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {preset === 'clear'
                      ? 'Trong Suốt'
                      : preset === 'balanced'
                      ? 'Cân Bằng'
                      : 'Tương Phản'}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/60">
              <div>
                <div className="font-semibold text-white">Đặt Lại Bố Cục Cửa Sổ</div>
                <div className="text-[11px] text-zinc-400">
                  Trả lại vị trí và kích thước mặc định cho tất cả các widget
                </div>
              </div>
              <button
                type="button"
                data-testid="btn-reset-layout"
                onClick={handleResetLayout}
                className="px-3.5 py-1.5 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-xs text-white transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap self-start sm:self-auto"
              >
                <RotateCcw size={13} />
                <span>Đặt Lại</span>
              </button>
            </div>
          </div>
        </div>

        {/* Section 4: Owner Super-Powers & Coupon Management */}
        {(isOwner || user?.email === 'namho03052k9@gmail.com') && (
          <div data-testid="section-owner-superpowers" className="p-5 sm:p-7 rounded-2xl border border-amber-500/40 bg-amber-950/20 space-y-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-500/30">
              <div className="flex items-center gap-2.5">
                <Shield size={20} className="text-amber-400 shrink-0" />
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <span>Quản Trị Hệ Thống &amp; Kho Coupon</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/30 text-amber-300 border border-amber-500/40">
                      OWNER SUPER-POWERS
                    </span>
                  </h2>
                  <p className="text-[11px] text-zinc-400">
                    Đặc quyền tối cao của Chủ sở hữu: Dọn dẹp phòng trống và tạo mã ưu đãi cho học viên.
                  </p>
                </div>
              </div>

              {/* Purge Zombie Sessions Button */}
              <button
                type="button"
                data-testid="btn-purge-zombie"
                onClick={handlePurgeZombieSessions}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20 self-start sm:self-auto shrink-0"
              >
                <RefreshCw size={13} />
                <span>Dọn Dẹp Phiên Zombie</span>
              </button>
            </div>

            {/* Create Coupon Form */}
            <form onSubmit={handleCreateCoupon} className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-3 text-xs">
              <div className="font-semibold text-amber-300 flex items-center gap-1.5">
                <Plus size={14} />
                <span>Tạo Mã Coupon / Thẻ Ưu Đãi Mới</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">Mã Code (viết hoa)</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: PRO50, VIP2026..."
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-white font-mono focus:outline-none focus:border-amber-400 uppercase"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">Loại ưu đãi</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="discount_percent">% Giảm Giá Đơn Hàng</option>
                    <option value="free_days">Tặng Số Ngày PRO Miễn Phí</option>
                    <option value="free_lifetime">PRO Trọn Đời Vĩnh Viễn</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">
                    {newType === 'discount_percent' ? 'Mức giảm (%)' : newType === 'free_days' ? 'Số ngày tặng' : 'Giá trị'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={newType === 'discount_percent' ? 100 : 3650}
                    disabled={newType === 'free_lifetime'}
                    value={newType === 'free_lifetime' ? 0 : newValue}
                    onChange={(e) => setNewValue(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-white font-mono focus:outline-none focus:border-amber-400 disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">Giới hạn số lượt dùng</label>
                  <input
                    type="number"
                    min={1}
                    max={10000}
                    value={newMaxUses}
                    onChange={(e) => setNewMaxUses(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                <input
                  type="text"
                  placeholder="Mô tả ghi chú (ví dụ: Tặng quà sinh nhật bạn học)..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="flex-1 w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-white text-xs focus:outline-none focus:border-amber-400"
                />
                <button
                  type="submit"
                  className="w-full sm:w-auto px-5 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-neutral-950 font-bold transition cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Sparkles size={13} />
                  <span>Kích Hoạt Coupon</span>
                </button>
              </div>
            </form>

            {/* Existing Coupons Table */}
            <div className="space-y-3">
              <div className="font-semibold text-white text-xs flex items-center justify-between">
                <span>Danh Sách Coupon Trong Kho ({coupons.length})</span>
                <span className="text-[10px] text-zinc-400">Lưu trữ tại: pomodoro_coupons_store</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {coupons.map((c) => (
                  <div
                    key={c.code}
                    className="p-3.5 rounded-xl border border-white/10 bg-black/50 flex flex-col justify-between gap-3 text-xs"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-mono font-bold text-amber-300 text-sm flex items-center gap-1.5">
                          <span>{c.code}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyCoupon(c.code)}
                            className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition"
                            title="Copy mã"
                          >
                            {copiedCode === c.code ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                          </button>
                        </div>
                        <div className="text-[10px] text-zinc-400 mt-0.5">
                          {c.type === 'discount_percent'
                            ? `Giảm ${c.value}% giá trị đơn hàng`
                            : c.type === 'free_days'
                            ? `Tặng ${c.value} ngày PRO miễn phí`
                            : 'Mở khóa PRO Trọn đời vĩnh viễn'}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteCoupon(c.code)}
                        className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/20 transition cursor-pointer"
                        title="Xóa coupon"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-zinc-400">
                      <span>Đã dùng: <strong className="text-white">{c.usedCount}</strong>/{c.maxUses} lượt</span>
                      {c.description && <span className="truncate max-w-[120px] text-zinc-500">{c.description}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      <SharedFooter />
    </div>
  );
};
