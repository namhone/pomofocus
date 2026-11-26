import React, { useState } from 'react';
import { useRouter } from '../services/router';
import { useTimerStore } from '../stores/useTimerStore';
import { useLayoutStore } from '../stores/useLayoutStore';
import { useAudioStore } from '../stores/useAudioStore';
import { useAuthStore } from '../stores/useAuthStore';
import { studyRoomService } from '../services/studyRoomService';
import { AdminCouponManager } from './AdminCouponManager';
import { ChimeSoundType } from '../types/audio';
import { ALARM_CHIMES } from '../data/alarmSounds';
import { PlatformHeader } from './PlatformHeader';
import { SharedFooter } from './SharedFooter';
import { CONSENT_STORAGE_KEY } from './CookieConsentBanner';
import {
  Settings,
  Clock,
  Volume2,
  Sliders,
  RotateCcw,
  Check,
  CheckCircle2,
  Shield,
  RefreshCw,
  User,
  CreditCard,
  Database,
  ArrowLeft,
  Leaf
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const router = useRouter();
  const timerSettings = useTimerStore((s) => s.settings);
  const updateTimerSettings = useTimerStore((s) => s.updateSettings);

  const glassSettings = useLayoutStore((s) => s.glassSettings);
  const setGlassPreset = useLayoutStore((s) => s.setGlassPreset);
  const resetLayout = useLayoutStore((s) => s.resetLayout);
  const isEcoMode = useLayoutStore((s) => s.isEcoMode);
  const setEcoMode = useLayoutStore((s) => s.setEcoMode);

  const masterVolume = useAudioStore((s) => s.settings.masterVolume);
  const setMasterVolume = useAudioStore((s) => s.setMasterVolume);
  const selectedChime = useAudioStore((s) => s.settings.selectedChime);
  const setSelectedChime = useAudioStore((s) => s.setSelectedChime);

  const isOwner = useAuthStore((s) => s.isOwner);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const user = useAuthStore((s) => s.user);

  // Consent & Privacy state (BUG-75)
  const [consentStatus, setConsentStatus] = useState<string | null>(() => {
    try {
      return localStorage.getItem(CONSENT_STORAGE_KEY);
    } catch {
      return null;
    }
  });

  // Super-Powers state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleRevokeConsent = () => {
    try {
      localStorage.removeItem(CONSENT_STORAGE_KEY);
      if (typeof document !== 'undefined' && document.cookie) {
        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
          const eqPos = cookie.indexOf('=');
          const name = eqPos > -1 ? cookie.slice(0, eqPos).trim() : cookie.trim();
          if (name.startsWith('_ga') || name.startsWith('pomofocus_consent') || name.startsWith('_gid')) {
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
          }
        }
      }
      setConsentStatus(null);
      showToast('Đã rút lại sự đồng ý thu thập dữ liệu. Trạng thái chấp thuận đã được đặt lại.');
    } catch (e) {
      console.warn('Lỗi khi rút lại sự đồng ý:', e);
    }
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

  const chimes: { id: ChimeSoundType; name: string }[] = ALARM_CHIMES.map((c) => ({
    id: c.id,
    name: c.name
  }));

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
              <User size={13} className="text-zinc-300" />
              <span>Hồ sơ cá nhân</span>
            </button>
            <button
              type="button"
              onClick={() => router.navigate('/account/security')}
              className="px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
            >
              <Shield size={13} className="text-zinc-300" />
              <span>Bảo mật</span>
            </button>
            <button
              type="button"
              onClick={() => router.navigate('/billing')}
              className="px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
            >
              <CreditCard size={13} className="text-zinc-300" />
              <span>Gói cước</span>
            </button>
            <button
              type="button"
              onClick={() => router.navigate('/privacy-data')}
              className="px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
            >
              <Database size={13} className="text-zinc-300" />
              <span>Quyền riêng tư</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => router.navigate('/app')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-800 hover:border-zinc-700 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs font-medium transition cursor-pointer shrink-0"
          >
            <ArrowLeft size={13} />
            <span className="hidden sm:inline">Vào không gian</span>
          </button>
        </div>

        {/* Title */}
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <Settings size={24} className="text-white shrink-0" />
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Cài đặt hệ thống & trải nghiệm
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400">
            Tùy biến thời lượng chu kỳ pomodoro, âm thanh thông báo và phong cách giao diện của bạn.
          </p>
        </div>

        {/* Toast */}
        {toastMessage && (
          <div className="p-3.5 rounded-xl border border-zinc-500/30 bg-zinc-950/40 text-zinc-300 text-xs flex items-center gap-2 shadow-sm">
            <CheckCircle2 size={16} className="shrink-0 text-zinc-300" />
            <span className="font-medium">{toastMessage}</span>
          </div>
        )}

        {/* Section 1: Pomodoro Intervals */}
        <div className="p-5 sm:p-7 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-5">
          <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
            <Clock size={16} className="text-rose-400 shrink-0" />
            <h2 className="text-sm font-semibold text-white">Chu kỳ thời gian pomodoro</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block text-zinc-400 mb-1.5">Tập trung (phút)</label>
              <input
                type="number"
                inputMode="numeric"
                enterKeyHint="next"
                data-testid="input-setting-pomodoro"
                min={1}
                max={120}
                value={timerSettings.pomodoroMinutes}
                onChange={(e) => handlePomodoroChange(Number(e.target.value))}
                className="no-focus-ring w-full px-3 py-2 rounded-xl border border-zinc-700 bg-zinc-950 text-white font-mono focus:outline-none focus:border-white transition [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1.5">Nghỉ ngắn (phút)</label>
              <input
                type="number"
                inputMode="numeric"
                enterKeyHint="next"
                data-testid="input-setting-short-break"
                min={1}
                max={60}
                value={timerSettings.shortBreakMinutes}
                onChange={(e) => handleShortBreakChange(Number(e.target.value))}
                className="no-focus-ring w-full px-3 py-2 rounded-xl border border-zinc-700 bg-zinc-950 text-white font-mono focus:outline-none focus:border-white transition [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1.5">Nghỉ dài (phút)</label>
              <input
                type="number"
                inputMode="numeric"
                enterKeyHint="next"
                data-testid="input-setting-long-break"
                min={1}
                max={90}
                value={timerSettings.longBreakMinutes}
                onChange={(e) => handleLongBreakChange(Number(e.target.value))}
                className="no-focus-ring w-full px-3 py-2 rounded-xl border border-zinc-700 bg-zinc-950 text-white font-mono focus:outline-none focus:border-white transition [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1.5">Hiệp trước nghỉ dài</label>
              <input
                type="number"
                inputMode="numeric"
                enterKeyHint="done"
                data-testid="input-setting-rounds"
                min={1}
                max={12}
                value={timerSettings.roundsBeforeLongBreak}
                onChange={(e) => handleRoundsChange(Number(e.target.value))}
                className="no-focus-ring w-full px-3 py-2 rounded-xl border border-zinc-700 bg-zinc-950 text-white font-mono focus:outline-none focus:border-white transition [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-zinc-800/80 text-xs">
            <div>
              <div className="font-semibold text-white">Tự động chuyển hiệp mới</div>
              <div className="text-[11px] text-zinc-400">
                Tự động bắt đầu đếm ngược khi hết giờ tập trung hoặc nghỉ ngơi
              </div>
            </div>
            <button
              type="button"
              data-testid="toggle-auto-transition"
              onClick={handleToggleAutoTransition}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                timerSettings.autoTransition ? 'bg-zinc-700' : 'bg-zinc-700'
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
            <Volume2 size={16} className="text-zinc-300 shrink-0" />
            <h2 className="text-sm font-semibold text-white">Âm lượng & chuông báo hoàn thành</h2>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <div className="flex justify-between text-zinc-400 mb-1.5">
                <span>Âm lượng tổng (master volume)</span>
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
                        ? 'border-zinc-400 bg-zinc-700/10 text-zinc-300 font-medium'
                        : 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span>{c.name}</span>
                    {selectedChime === c.id && <Check size={12} className="text-zinc-300" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Appearance & Layout */}
        <div className="p-5 sm:p-7 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-5">
          <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
            <Sliders size={16} className="text-zinc-300 shrink-0" />
            <h2 className="text-sm font-semibold text-white">Giao diện & vị trí cửa sổ</h2>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-zinc-400 mb-2">Độ trong suốt khung kính (glass effect)</label>
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

            {/* Chế độ Eco Mode */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/60">
              <div>
                <div className="font-semibold text-white flex items-center gap-1.5">
                  <Leaf size={14} strokeWidth={1.5} className="text-zinc-300 shrink-0" />
                  <span>Chế độ siêu nhẹ (eco mode)</span>
                </div>
                <div className="text-[11px] text-zinc-400">
                  Tắt hoàn toàn video nền động và hiệu ứng hạt canvas, chuyển kính mờ sang màu tối phẳng để tiết kiệm 100% gpu/cpu cho máy yếu.
                </div>
              </div>
              <button
                type="button"
                data-testid="setting-toggle-eco-mode"
                onClick={() => {
                  setEcoMode(!isEcoMode);
                  showToast(isEcoMode ? 'Đã tắt Chế độ Eco' : 'Đã bật Chế độ Eco siêu nhẹ');
                }}
                className={`px-4 py-2 rounded-xl border text-xs font-semibold transition cursor-pointer whitespace-nowrap self-start sm:self-auto ${
                  isEcoMode
                    ? 'border-zinc-500 bg-zinc-700/20 text-zinc-300'
                    : 'border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                }`}
              >
                {isEcoMode ? 'Đang bật' : 'Tắt'}
              </button>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/60">
              <div>
                <div className="font-semibold text-white">Khôi phục giao diện ban đầu</div>
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
                <span>Đặt lại</span>
              </button>
            </div>
          </div>
        </div>

        {/* Section 4: Data Protection & Consent Revocation (BUG-75) */}
        <div data-testid="section-privacy-settings" className="p-5 sm:p-7 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-zinc-300 shrink-0" />
              <h2 className="text-sm font-semibold text-white">Bảo vệ dữ liệu &amp; quyền riêng tư (pdpl)</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-zinc-400">Trạng thái:</span>
              {consentStatus === 'accepted' ? (
                <span data-testid="consent-status-badge" className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-700/20 text-zinc-300 border border-zinc-500/30">
                  Đã đồng ý
                </span>
              ) : consentStatus === 'declined' ? (
                <span data-testid="consent-status-badge" className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-700/20 text-zinc-300 border border-zinc-500/30">
                  Đã từ chối
                </span>
              ) : (
                <span data-testid="consent-status-badge" className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-400 border border-zinc-700">
                  Chưa thiết lập / đã rút lại
                </span>
              )}
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <p className="text-zinc-400 leading-relaxed text-[11px]">
              Tuân thủ điều 10 luật bảo vệ dữ liệu cá nhân 91/2025/QH15 và điều 5 nghị định 356/2025/nđ-cp: chủ thể dữ liệu có toàn quyền rút lại sự đồng ý thu thập và xử lý dữ liệu bất kỳ lúc nào. Khi bạn rút lại sự đồng ý, toàn bộ cookie/storage chấp thuận sẽ được xóa và đặt lại trạng thái ban đầu.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/60">
              <div>
                <div className="font-semibold text-white flex items-center gap-1.5">
                  <RotateCcw size={14} className="text-rose-400 shrink-0" />
                  <span>Rút lại sự đồng ý thu thập dữ liệu</span>
                </div>
                <div className="text-[11px] text-zinc-400 mt-0.5">
                  Xóa trạng thái chấp thuận cookie và dừng các tiến trình thu thập dữ liệu tùy chọn
                </div>
              </div>
              <button
                type="button"
                data-testid="btn-revoke-consent"
                onClick={handleRevokeConsent}
                className="px-3.5 py-2 rounded-xl border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap self-start sm:self-auto"
              >
                <RotateCcw size={13} />
                <span>Rút lại sự đồng ý</span>
              </button>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/60">
              <div>
                <div className="font-semibold text-white flex items-center gap-1.5">
                  <Database size={14} className="text-zinc-300 shrink-0" />
                  <span>Quản lý dữ liệu cục bộ (gdpr / pdpl)</span>
                </div>
                <div className="text-[11px] text-zinc-400 mt-0.5">
                  Tải bản sao dữ liệu hoặc xóa dữ liệu trên thiết bị này
                </div>
              </div>
              <button
                type="button"
                data-testid="btn-goto-privacy-data"
                onClick={() => router.navigate('/privacy-data')}
                className="px-3.5 py-1.5 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 hover:text-white transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap self-start sm:self-auto"
              >
                <span>Xem chi tiết</span>
                <span>→</span>
              </button>
            </div>
          </div>
        </div>

        {/* Section 5: Owner Super-Powers & Coupon Management */}
        {(isOwner || isAdmin || user?.role === 'admin' || user?.role === 'founder' || (user as any)?.app_metadata?.role === 'admin') && (
          <div data-testid="section-owner-superpowers" className="p-5 sm:p-7 rounded-2xl border border-zinc-500/40 bg-zinc-950/20 space-y-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-500/30">
              <div className="flex items-center gap-2.5">
                <Shield size={20} className="text-zinc-300 shrink-0" />
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <span>Quản trị hệ thống &amp; kho coupon</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-700/30 text-zinc-300 border border-zinc-500/40">
                      Công cụ quản trị
                    </span>
                  </h2>
                  <p className="text-[11px] text-zinc-400">
                    Đặc quyền tối cao của chủ sở hữu: dọn dẹp phòng trống và tạo mã ưu đãi cho học viên.
                  </p>
                </div>
              </div>

              {/* Purge Zombie Sessions Button */}
              <button
                type="button"
                data-testid="btn-purge-zombie"
                onClick={handlePurgeZombieSessions}
                className="px-3.5 py-2 rounded-xl bg-zinc-700 hover:bg-zinc-700 text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-zinc-500/20 self-start sm:self-auto shrink-0"
              >
                <RefreshCw size={13} />
                <span>Dọn dẹp phiên zombie</span>
              </button>
            </div>

            {/* Dynamic Cloud Coupon Engine dành cho Founder */}
            <AdminCouponManager />
          </div>
        )}
      </main>

      <SharedFooter />
    </div>
  );
};
