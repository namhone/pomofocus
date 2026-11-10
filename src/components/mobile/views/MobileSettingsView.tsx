import React, { useMemo } from 'react';
import {
  Clock,
  Coffee,
  Moon,
  Volume2,
  RotateCcw,
  Bell,
  VolumeX
} from 'lucide-react';
import { MobileStepperRow } from '../primitives/MobileStepperRow';
import { MobileLiquidSwitch } from '../primitives/MobileLiquidSwitch';
import { useTimerStore } from '../../../stores/useTimerStore';
import { useLayoutStore } from '../../../stores/useLayoutStore';
import { useAudioStore } from '../../../stores/useAudioStore';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useAiStore } from '../../../stores/useAiStore';
import { ALARM_CHIMES } from '../../../data/alarmSounds';
import { ChimeSoundType } from '../../../types/audio';
import { hasVipAccess, isOwnerEmail } from '../../../services/authService';

export interface MobileSettingsViewProps {
  className?: string;
}

/**
 * MobileSettingsView (v7.0 Native Android Liquid Zen Architecture)
 *
 * - Native mobile scrollable settings list with 0 desktop widget artifacts.
 * - 3 independent 56px Stepper rows for Focus, Short break, and Long break durations.
 * - MobileLiquidSwitch for Auto Transition ("Tự động chuyển hiệp").
 * - Sound & Volume controls: master volume slider and alarm chime selector with preview.
 * - Eco Mode switch for battery preservation.
 * - User status card: displays user role, VIP status, and credits balance.
 * - Whitelist compliance: strictly 0 upgrade banners for VIP / Founder users.
 * - System reset button to restore default layout.
 */
export const MobileSettingsView: React.FC<MobileSettingsViewProps> = ({
  className = '',
}) => {
  // Timer Store
  const timerSettings = useTimerStore((s) => s.settings);
  const updateTimerSettings = useTimerStore((s) => s.updateSettings);

  // Audio Store
  const masterVolume = useAudioStore((s) => s.settings.masterVolume);
  const setMasterVolume = useAudioStore((s) => s.setMasterVolume);
  const selectedChime = useAudioStore((s) => s.settings.selectedChime);
  const setSelectedChime = useAudioStore((s) => s.setSelectedChime);
  const playChime = useAudioStore((s) => s.playChime);

  // Layout Store
  const isEcoMode = useLayoutStore((s) => s.isEcoMode);
  const setEcoMode = useLayoutStore((s) => s.setEcoMode);
  const resetLayout = useLayoutStore((s) => s.resetLayout);

  // Auth Store
  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.role);
  const planLabel = useAuthStore((s) => s.planLabel);

  // AI Store
  const aiCreditsBalance = useAiStore((s) => s.aiCreditsBalance);
  const openTopupModal = useAiStore((s) => s.openTopupModal);

  // VIP / Owner check
  const isVip = useMemo(() => {
    return hasVipAccess(user) || (user?.email ? isOwnerEmail(user.email) : false) || role === 'founder';
  }, [user, role]);

  const isOwner = useMemo(() => {
    return (user?.email ? isOwnerEmail(user.email) : false) || role === 'founder' || user?.role === 'founder';
  }, [user, role]);

  const creditsBalance = useMemo(() => {
    if (typeof aiCreditsBalance === 'number') return aiCreditsBalance;
    const directCredits = (useAiStore.getState() as any).credits;
    if (typeof directCredits === 'number') return directCredits;
    return 0;
  }, [aiCreditsBalance]);

  const userDisplayName = useMemo(() => {
    if (user?.displayName) return user.displayName;
    if (user?.email) return user.email.split('@')[0];
    return 'Khách học tập';
  }, [user]);

  const userInitial = useMemo(() => {
    return (userDisplayName[0] || 'K').toUpperCase();
  }, [userDisplayName]);

  // Stepper handlers
  const handleFocusChange = (val: number) => {
    const clamped = Math.max(1, Math.min(120, val));
    updateTimerSettings({ pomodoroMinutes: clamped });
    if (useTimerStore.getState().settings.pomodoroMinutes !== clamped) {
      useTimerStore.setState({
        settings: {
          ...useTimerStore.getState().settings,
          pomodoroMinutes: clamped,
        },
      });
    }
  };

  const handleShortBreakChange = (val: number) => {
    const clamped = Math.max(1, Math.min(60, val));
    updateTimerSettings({ shortBreakMinutes: clamped });
    if (useTimerStore.getState().settings.shortBreakMinutes !== clamped) {
      useTimerStore.setState({
        settings: {
          ...useTimerStore.getState().settings,
          shortBreakMinutes: clamped,
        },
      });
    }
  };

  const handleLongBreakChange = (val: number) => {
    const clamped = Math.max(1, Math.min(60, val));
    updateTimerSettings({ longBreakMinutes: clamped });
    if (useTimerStore.getState().settings.longBreakMinutes !== clamped) {
      useTimerStore.setState({
        settings: {
          ...useTimerStore.getState().settings,
          longBreakMinutes: clamped,
        },
      });
    }
  };

  const handleToggleAutoTransition = (checked: boolean) => {
    updateTimerSettings({ autoTransition: checked });
    if (useTimerStore.getState().settings.autoTransition !== checked) {
      useTimerStore.setState({
        settings: {
          ...useTimerStore.getState().settings,
          autoTransition: checked,
        },
      });
    }
  };

  const handlePreviewChime = () => {
    if (playChime) {
      playChime(selectedChime).catch(() => {});
    }
  };

  return (
    <div
      data-testid="mobile-settings-view"
      className={`w-full h-full overflow-y-auto pb-28 px-4 space-y-5 select-none bg-transparent ${className}`}
    >
      {/* 1. USER ACCOUNT & STATUS CARD */}
      <div
        data-testid="mobile-user-status-card"
        className="w-full p-4 rounded-2xl bg-zinc-900/60 backdrop-blur-md border border-white/5 space-y-3 shadow-lg"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center font-bold text-zinc-950 text-sm shadow-md shrink-0">
              {userInitial}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white truncate">
                {userDisplayName}
              </div>
              <div className="text-xs text-zinc-400 truncate">
                {user?.email || 'Tài khoản khách cục bộ'}
              </div>
            </div>
          </div>

          <div className="shrink-0">
            {isOwner ? (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm flex items-center gap-1">
                <span>👑</span>
                <span>Founder VIP</span>
              </span>
            ) : isVip ? (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm flex items-center gap-1">
                <span>⭐</span>
                <span>{planLabel || 'PRO VIP'}</span>
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-800 text-zinc-300 border border-white/10">
                Miễn phí
              </span>
            )}
          </div>
        </div>

        {/* AI Credits Balance & Quick Topup */}
        <div className="flex items-center justify-between pt-2.5 border-t border-white/5">
          <div
            data-testid="mobile-user-credits-badge"
            className="flex items-center gap-1.5"
          >
            <span className="text-xs text-zinc-400">Số dư AI:</span>
            <span className="text-sm font-bold text-emerald-400 tabular-nums font-mono">
              ⚡ {creditsBalance}
            </span>
          </div>
          <button
            type="button"
            onClick={() => openTopupModal()}
            className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 active:scale-95 transition-all touch-manipulation cursor-pointer"
          >
            Nạp thêm
          </button>
        </div>

        {/* Upgrade Prompt: Strictly 0 upgrade banners for VIP / Founder users */}
        {!isVip && (
          <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-zinc-400">
            <span>Nâng cấp để mở khóa 1000+ hình nền & AI cao cấp</span>
            <button
              type="button"
              onClick={() => openTopupModal()}
              className="text-emerald-400 font-semibold hover:underline shrink-0 ml-2"
            >
              Nâng cấp
            </button>
          </div>
        )}
      </div>

      {/* 2. TIMER CYCLE STEPRERS (3 INDEPENDENT ROWS) */}
      <div className="space-y-2">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 px-1">
          Thời gian chu trình
        </div>

        {/* Focus Stepper (1-120 min) */}
        <MobileStepperRow
          testId="mobile-settings-stepper-focus"
          label="Thời gian Tập trung"
          value={timerSettings.pomodoroMinutes || 25}
          min={1}
          max={120}
          step={1}
          unit="phút"
          icon={<Clock className="w-4 h-4 text-emerald-400" aria-hidden="true" />}
          onChange={handleFocusChange}
        />

        {/* Short Break Stepper (1-60 min) */}
        <MobileStepperRow
          testId="mobile-settings-stepper-short"
          label="Nghỉ ngắn"
          value={timerSettings.shortBreakMinutes || 5}
          min={1}
          max={60}
          step={1}
          unit="phút"
          icon={<Coffee className="w-4 h-4 text-emerald-400" aria-hidden="true" />}
          onChange={handleShortBreakChange}
        />

        {/* Long Break Stepper (1-60 min) */}
        <MobileStepperRow
          testId="mobile-settings-stepper-long"
          label="Nghỉ dài"
          value={timerSettings.longBreakMinutes || 15}
          min={1}
          max={60}
          step={1}
          unit="phút"
          icon={<Moon className="w-4 h-4 text-emerald-400" aria-hidden="true" />}
          onChange={handleLongBreakChange}
        />
      </div>

      {/* 3. AUTOMATION & TRANSITIONS */}
      <div className="space-y-2">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 px-1">
          Tự động hóa
        </div>

        <div className="flex items-center justify-between p-4 bg-zinc-900/60 backdrop-blur-md rounded-2xl border border-white/5 shadow-md">
          <div className="flex-1 mr-3">
            <div className="text-sm font-medium text-zinc-200">
              Tự động chuyển hiệp
            </div>
            <div className="text-xs text-zinc-400 mt-0.5">
              Tự động bắt đầu giờ nghỉ hoặc hiệp tập trung mới khi hết giờ
            </div>
          </div>
          <MobileLiquidSwitch
            testId="mobile-settings-switch-auto-transition"
            ariaLabel="Bật hoặc tắt tự động chuyển hiệp"
            checked={Boolean(timerSettings.autoTransition)}
            onChange={handleToggleAutoTransition}
          />
        </div>
      </div>

      {/* 4. SOUND & VOLUME CONTROLS */}
      <div className="space-y-2">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 px-1">
          Âm thanh & Chuông báo
        </div>

        <div className="p-4 bg-zinc-900/60 backdrop-blur-md rounded-2xl border border-white/5 space-y-4 shadow-md">
          {/* Master Volume Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-zinc-200">
                {masterVolume > 0 ? (
                  <Volume2 className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                ) : (
                  <VolumeX className="w-4 h-4 text-zinc-400" aria-hidden="true" />
                )}
                <span>Âm lượng chính</span>
              </div>
              <span className="text-xs font-mono font-bold text-zinc-300 tabular-nums">
                {Math.round(masterVolume * 100)}%
              </span>
            </div>

            <input
              type="range"
              data-testid="mobile-settings-volume-slider"
              min="0"
              max="100"
              value={Math.round(masterVolume * 100)}
              onChange={(e) => setMasterVolume(Number(e.target.value) / 100)}
              className="w-full accent-emerald-500 bg-zinc-800 rounded-lg h-2 cursor-pointer touch-manipulation"
              aria-label="Âm lượng chính"
            />
          </div>

          {/* Alarm Chime Selector */}
          <div className="pt-3 border-t border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="mobile-chime-select"
                className="text-xs font-medium text-zinc-300 flex items-center gap-1.5"
              >
                <Bell className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                <span>Chuông báo kết thúc hiệp</span>
              </label>

              <button
                type="button"
                onClick={handlePreviewChime}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 active:scale-95 transition-all"
              >
                Nghe thử
              </button>
            </div>

            <select
              id="mobile-chime-select"
              data-testid="mobile-settings-chime-select"
              value={selectedChime}
              onChange={(e) => setSelectedChime(e.target.value as ChimeSoundType)}
              className="w-full bg-zinc-800/90 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-zinc-200 outline-none focus:border-emerald-400/50 transition-all cursor-pointer"
            >
              {ALARM_CHIMES.map((chime) => (
                <option
                  key={chime.id}
                  value={chime.id}
                  className="bg-zinc-900 text-zinc-200"
                >
                  {chime.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 5. ECO MODE & SYSTEM PREFERENCES */}
      <div className="space-y-2">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 px-1">
          Hiệu năng & Hệ thống
        </div>

        {/* Eco Mode Toggle */}
        <div className="flex items-center justify-between p-4 bg-zinc-900/60 backdrop-blur-md rounded-2xl border border-white/5 shadow-md">
          <div className="flex-1 mr-3">
            <div className="text-sm font-medium text-zinc-200 flex items-center gap-1.5">
              <span>🍃 Chế độ Eco</span>
            </div>
            <div className="text-xs text-zinc-400 mt-0.5">
              Giảm hiệu ứng đồ họa và quầng thở để tiết kiệm pin trên thiết bị di động
            </div>
          </div>
          <MobileLiquidSwitch
            testId="mobile-settings-switch-eco"
            ariaLabel="Bật hoặc tắt Chế độ Eco"
            checked={Boolean(isEcoMode)}
            onChange={(checked) => setEcoMode(checked)}
          />
        </div>

        {/* Reset Layout to Default */}
        <button
          type="button"
          data-testid="mobile-settings-reset-layout-btn"
          onClick={() => resetLayout()}
          className="w-full h-12 rounded-2xl bg-zinc-900/60 border border-white/5 text-zinc-300 hover:text-white hover:bg-zinc-800/60 active:scale-[0.99] flex items-center justify-center gap-2 text-sm font-medium transition-all touch-manipulation cursor-pointer shadow-md"
        >
          <RotateCcw className="w-4 h-4 text-zinc-400" aria-hidden="true" />
          <span>Khôi phục mặc định</span>
        </button>
      </div>

      {/* 6. SYSTEM FOOTER */}
      <div className="text-center pt-2 pb-6 text-xs text-zinc-400 space-y-0.5">
        <div className="font-medium text-zinc-400">PomoFocus v7.0 Liquid Zen</div>
        <div className="text-[11px] text-zinc-400">Native Android Architecture</div>
      </div>
    </div>
  );
};

export default MobileSettingsView;
