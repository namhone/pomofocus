import React, { useState } from 'react';
import {
  Move,
  RotateCcw,
  Grid,
  Layers,
  Magnet,
  EyeOff,
  Target,
  Layout,
  ArrowDown,
  ArrowUp,
  ArrowLeft,
  ArrowRight,
  Clock,
  CheckCircle2,
  User,
  Home,
  Plus,
  Minus,
  Lock
} from 'lucide-react';
import { useLayoutStore } from '../stores/useLayoutStore';
import { useAuthStore } from '../stores/useAuthStore';
import { useAiStore } from '../stores/useAiStore';
import { useTimerStore } from '../stores/useTimerStore';
import { useRouter } from '../services/router';
import { generateInitialsAvatarSvg, getDisplayAvatar } from '../services/authService';
import { DockPosition } from '../types/layout';

export const SettingsWidget: React.FC = () => {
  const router = useRouter();
  const {
    isLayoutEditMode,
    toggleLayoutEditMode,
    glassSettings,
    setGlassPreset,
    setGlassOpacity,
    setGlassBlur,
    resetGlassSettings,
    snapEnabled,
    toggleSnap,
    tileWidgets,
    cascadeWidgets,
    dockPosition,
    setDockPosition,
    dockSize,
    setDockSize,
    dockAutoHide,
    toggleDockAutoHide,
    setLayoutPreset,
    resetLayout
  } = useLayoutStore();

  const timerSettings = useTimerStore((s) => s.settings);
  const updateTimerSettings = useTimerStore((s) => s.updateSettings);
  const timerStatus = useTimerStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isOwner = useAuthStore((s) => s.isOwner);
  const aiCreditsBalance = useAiStore((s) => s.aiCreditsBalance);

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState(false);

  const handleTimerChange = (changes: Parameters<typeof updateTimerSettings>[0]) => {
    updateTimerSettings(changes);
    setSaveFeedback(true);
    setTimeout(() => setSaveFeedback(false), 2000);
  };

  const dockPositions: Array<{ id: DockPosition; label: string; icon: React.ReactNode }> = [
    { id: 'bottom', label: 'Dưới', icon: <ArrowDown size={12} /> },
    { id: 'top', label: 'Trên', icon: <ArrowUp size={12} /> },
    { id: 'left', label: 'Trái', icon: <ArrowLeft size={12} /> },
    { id: 'right', label: 'Phải', icon: <ArrowRight size={12} /> }
  ];

  return (
    <div
      data-testid="settings-widget"
      className="flex h-full w-full max-h-[85vh] flex-col text-slate-100 p-1 select-none space-y-3.5 overflow-y-auto scrollbar-none"
    >
      {/* Header Info */}
      {/* Account Status Card (Đồng bộ chuẩn 100% với Header) */}
      {isAuthenticated && user ? (
        <div className="p-3 rounded-xl bg-gradient-to-r from-amber-500/10 via-zinc-900 to-cyan-500/10 border border-amber-500/20 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden ring-1 ring-amber-500/40 shrink-0 flex items-center justify-center">
              <img
                src={getDisplayAvatar(user)}
                alt={user.displayName || 'Avatar'}
                className="w-full h-full object-cover bg-zinc-800"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.onerror = null;
                  target.src = generateInitialsAvatarSvg(user.displayName || user.email || 'User', 64);
                }}
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white truncate max-w-[140px] sm:max-w-[200px]">
                  {user.displayName || user.email.split('@')[0]}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/20 border border-amber-500/30 text-amber-300 shrink-0">
                  {isOwner ? 'Founder VIP 👑' : (user.badge || user.plan.toUpperCase())}
                </span>
              </div>
              <p className="text-[10px] text-neutral-400 truncate">
                {user.email} • {isOwner ? '⚡ ∞' : `${aiCreditsBalance.toLocaleString('vi-VN')}⚡`}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-white/10 text-neutral-400 flex items-center justify-center font-bold text-xs shrink-0">
              <User size={14} />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white">Chưa đăng nhập</div>
              <p className="text-[10px] text-neutral-400">Chế độ khách • {Math.max(0, aiCreditsBalance).toLocaleString('vi-VN')}⚡</p>
            </div>
          </div>
          <button
            type="button"
            data-testid="settings-login-btn"
            onClick={() => router.navigate('/login')}
            className="px-4 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-medium active:scale-95 transition-all cursor-pointer"
          >
            Đăng Nhập
          </button>
        </div>
      )}

      {/* Khối ưu tiên 1: Thời lượng Pomodoro & Hiệp (Đưa lên đầu bảng Cài Đặt theo UX Final Polish) */}
      <div className="space-y-2.5 rounded-xl bg-black/25 p-3 border border-white/[0.08]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-neutral-200">
            <Clock size={13} className="text-rose-400" />
            <span>Thời lượng Pomodoro & Hiệp</span>
          </div>
          {saveFeedback ? (
            <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1 animate-fade-in">
              <CheckCircle2 size={11} />
              Đã lưu
            </span>
          ) : (
            <span className="text-[9.5px] text-neutral-400">Tự động lưu tức thì</span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label htmlFor="settings-pomo-min" className="block text-xs text-zinc-400 font-medium mb-1.5 text-center">
              Tập trung
            </label>
            <div className="flex items-center justify-between bg-zinc-900/60 border border-white/10 rounded-2xl p-1 shadow-inner backdrop-blur-md">
              <button
                type="button"
                disabled={timerStatus !== 'idle'}
                onClick={() => handleTimerChange({ pomodoroMinutes: Math.max(1, timerSettings.pomodoroMinutes - 1) })}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/15 active:scale-90 border border-white/10 text-zinc-300 hover:text-white flex items-center justify-center transition-all shrink-0 cursor-pointer disabled:opacity-40"
                title="Giảm 1 phút"
                aria-label="Giảm 1 phút"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <div className="flex flex-col items-center justify-center px-1 min-w-[42px] flex-1">
                <input
                  id="settings-pomo-min"
                  data-testid="settings-input-pomodoro-min"
                  type="number"
                  min="1"
                  max="120"
                  value={timerSettings.pomodoroMinutes}
                  disabled={timerStatus !== 'idle'}
                  onChange={(e) => handleTimerChange({ pomodoroMinutes: Number(e.target.value) || 1 })}
                  className="no-focus-ring w-full text-center bg-transparent font-mono text-sm font-semibold text-white tracking-tight focus:outline-none disabled:opacity-50 [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-[10px] text-zinc-500 font-normal leading-none pointer-events-none">phút</span>
              </div>
              <button
                type="button"
                disabled={timerStatus !== 'idle'}
                onClick={() => handleTimerChange({ pomodoroMinutes: Math.min(120, timerSettings.pomodoroMinutes + 1) })}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/15 active:scale-90 border border-white/10 text-zinc-300 hover:text-white flex items-center justify-center transition-all shrink-0 cursor-pointer disabled:opacity-40"
                title="Tăng 1 phút"
                aria-label="Tăng 1 phút"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div>
            <label htmlFor="settings-short-min" className="block text-xs text-zinc-400 font-medium mb-1.5 text-center">
              Nghỉ ngắn
            </label>
            <div className="flex items-center justify-between bg-zinc-900/60 border border-white/10 rounded-2xl p-1 shadow-inner backdrop-blur-md">
              <button
                type="button"
                disabled={timerStatus !== 'idle'}
                onClick={() => handleTimerChange({ shortBreakMinutes: Math.max(1, timerSettings.shortBreakMinutes - 1) })}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/15 active:scale-90 border border-white/10 text-zinc-300 hover:text-white flex items-center justify-center transition-all shrink-0 cursor-pointer disabled:opacity-40"
                title="Giảm 1 phút"
                aria-label="Giảm 1 phút"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <div className="flex flex-col items-center justify-center px-1 min-w-[42px] flex-1">
                <input
                  id="settings-short-min"
                  data-testid="settings-input-short-min"
                  type="number"
                  min="1"
                  max="60"
                  value={timerSettings.shortBreakMinutes}
                  disabled={timerStatus !== 'idle'}
                  onChange={(e) => handleTimerChange({ shortBreakMinutes: Number(e.target.value) || 1 })}
                  className="no-focus-ring w-full text-center bg-transparent font-mono text-sm font-semibold text-white tracking-tight focus:outline-none disabled:opacity-50 [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-[10px] text-zinc-500 font-normal leading-none pointer-events-none">phút</span>
              </div>
              <button
                type="button"
                disabled={timerStatus !== 'idle'}
                onClick={() => handleTimerChange({ shortBreakMinutes: Math.min(60, timerSettings.shortBreakMinutes + 1) })}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/15 active:scale-90 border border-white/10 text-zinc-300 hover:text-white flex items-center justify-center transition-all shrink-0 cursor-pointer disabled:opacity-40"
                title="Tăng 1 phút"
                aria-label="Tăng 1 phút"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div>
            <label htmlFor="settings-long-min" className="block text-xs text-zinc-400 font-medium mb-1.5 text-center">
              Nghỉ dài
            </label>
            <div className="flex items-center justify-between bg-zinc-900/60 border border-white/10 rounded-2xl p-1 shadow-inner backdrop-blur-md">
              <button
                type="button"
                disabled={timerStatus !== 'idle'}
                onClick={() => handleTimerChange({ longBreakMinutes: Math.max(1, timerSettings.longBreakMinutes - 1) })}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/15 active:scale-90 border border-white/10 text-zinc-300 hover:text-white flex items-center justify-center transition-all shrink-0 cursor-pointer disabled:opacity-40"
                title="Giảm 1 phút"
                aria-label="Giảm 1 phút"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <div className="flex flex-col items-center justify-center px-1 min-w-[42px] flex-1">
                <input
                  id="settings-long-min"
                  data-testid="settings-input-long-min"
                  type="number"
                  min="1"
                  max="60"
                  value={timerSettings.longBreakMinutes}
                  disabled={timerStatus !== 'idle'}
                  onChange={(e) => handleTimerChange({ longBreakMinutes: Number(e.target.value) || 1 })}
                  className="no-focus-ring w-full text-center bg-transparent font-mono text-sm font-semibold text-white tracking-tight focus:outline-none disabled:opacity-50 [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-[10px] text-zinc-500 font-normal leading-none pointer-events-none">phút</span>
              </div>
              <button
                type="button"
                disabled={timerStatus !== 'idle'}
                onClick={() => handleTimerChange({ longBreakMinutes: Math.min(60, timerSettings.longBreakMinutes + 1) })}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/15 active:scale-90 border border-white/10 text-zinc-300 hover:text-white flex items-center justify-center transition-all shrink-0 cursor-pointer disabled:opacity-40"
                title="Tăng 1 phút"
                aria-label="Tăng 1 phút"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2.5 cursor-pointer select-none group py-1">
            <div className="relative flex items-center justify-center">
              {/* Input ẩn nguyên bản bảo đảm accessibility & form state */}
              <input
                data-testid="settings-checkbox-auto-transition"
                type="checkbox"
                checked={timerSettings.autoTransition}
                onChange={(e) => handleTimerChange({ autoTransition: e.target.checked })}
                className="sr-only peer"
              />
              {/* Hộp Checkmark Kính Lỏng Tùy Chỉnh */}
              <div
                className={`w-5 h-5 rounded-lg border border-white/20 bg-white/10 backdrop-blur-md transition-all duration-200 ease-out group-hover:border-white/40 group-hover:bg-white/15 peer-checked:bg-gradient-to-tr peer-checked:from-emerald-600 peer-checked:to-teal-400 peer-checked:border-emerald-400/60 peer-checked:shadow-[0_0_12px_rgba(52,211,153,0.45)] peer-checked:[&>svg]:opacity-100 peer-checked:[&>svg]:scale-100 flex items-center justify-center ${
                  timerSettings.autoTransition
                    ? 'bg-gradient-to-tr from-emerald-600 to-teal-400 border-emerald-400/60 shadow-[0_0_12px_rgba(52,211,153,0.45)]'
                    : ''
                }`}
              >
                {/* Dấu tick SVG sắc nét hiện mượt khi checked */}
                <svg
                  className={`w-3.5 h-3.5 text-white stroke-[2.5] transition-all duration-150 transform ${
                    timerSettings.autoTransition ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
                  } peer-checked:opacity-100 peer-checked:scale-100`}
                  viewBox="0 0 14 10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M1.5 5.5L5 9L12.5 1.5" />
                </svg>
              </div>
            </div>
            <span className="text-xs font-medium text-zinc-300 group-hover:text-white transition-colors select-none cursor-pointer">
              Tự động chuyển hiệp
            </span>
          </label>
        </div>
      </div>



      {/* Button: Chỉnh sửa bố cục */}
      <div className="hidden lg:block">
        <button
          type="button"
          data-testid="dock-btn-edit-layout"
          onClick={() => toggleLayoutEditMode()}
          aria-pressed={isLayoutEditMode}
          className={`flex min-h-10 w-full items-center justify-between rounded-xl border px-3 py-2 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${
            isLayoutEditMode
              ? 'border-emerald-400/40 bg-emerald-400/15 text-emerald-200 shadow-[0_0_12px_rgba(52,211,153,0.2)]'
              : 'border-white/10 bg-white/[0.04] text-neutral-200 hover:bg-white/10'
          }`}
        >
          <span className="flex items-center gap-2 text-xs font-medium">
            <Move size={14} className={isLayoutEditMode ? 'text-emerald-400' : 'text-neutral-400'} />
            Chế độ Chỉnh sửa bố cục
          </span>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
            isLayoutEditMode ? 'bg-emerald-400/25 text-emerald-200' : 'bg-white/10 text-neutral-400'
          }`}>
            {isLayoutEditMode ? 'ĐANG BẬT' : 'TẮT'}
          </span>
        </button>
      </div>

      {/* Section 1: Glassmorphism */}
      <div className="space-y-2 rounded-xl bg-black/25 p-3 border border-white/[0.08] hidden lg:block">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-neutral-200">Hiệu ứng kính mờ</span>
          <button
            type="button"
            data-testid="btn-reset-glass"
            onClick={() => resetGlassSettings()}
            className="text-[10px] text-neutral-400 hover:text-white flex items-center gap-1 hover:underline cursor-pointer"
            title="Đặt lại cài đặt kính mặc định"
          >
            <RotateCcw size={10} />
            Đặt lại
          </button>
        </div>

        {/* Preset Pills */}
        <div className="grid grid-cols-3 gap-1 bg-white/5 p-1 rounded-lg border border-white/8">
          <button
            type="button"
            data-testid="glass-preset-clear"
            onClick={() => setGlassPreset('clear')}
            className={`py-1.5 text-xs rounded-md font-medium transition-all cursor-pointer ${
              glassSettings.preset === 'clear'
                ? 'bg-white/20 text-white shadow-xs font-semibold'
                : 'text-neutral-400 hover:text-white hover:bg-white/10'
            }`}
          >
            Trong suốt
          </button>
          <button
            type="button"
            data-testid="glass-preset-balanced"
            onClick={() => setGlassPreset('balanced')}
            className={`py-1.5 text-xs rounded-md font-medium transition-all cursor-pointer ${
              glassSettings.preset === 'balanced'
                ? 'bg-white/20 text-white shadow-xs font-semibold'
                : 'text-neutral-400 hover:text-white hover:bg-white/10'
            }`}
          >
            Cân bằng
          </button>
          <button
            type="button"
            data-testid="glass-preset-high-contrast"
            onClick={() => setGlassPreset('high_contrast')}
            className={`py-1.5 text-xs rounded-md font-medium transition-all cursor-pointer ${
              glassSettings.preset === 'high_contrast'
                ? 'bg-white/20 text-white shadow-xs font-semibold'
                : 'text-neutral-400 hover:text-white hover:bg-white/10'
            }`}
          >
            Tương phản
          </button>
        </div>

        {/* Sliders */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-[11px] text-neutral-400">
            <span>Độ đục nền</span>
            <span className="font-mono text-neutral-200">{glassSettings.opacity}%</span>
          </div>
          <input
            type="range"
            min="25"
            max="90"
            step="1"
            data-testid="glass-opacity-slider"
            value={glassSettings.opacity}
            onChange={(e) => setGlassOpacity(Number(e.target.value))}
            className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-400"
            aria-label="Điều chỉnh độ đục kính"
          />

          <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-1">
            <span>Độ mờ hậu cảnh</span>
            <span className="font-mono text-neutral-200">{glassSettings.blur}px</span>
          </div>
          <input
            type="range"
            min="8"
            max="48"
            step="2"
            data-testid="glass-blur-slider"
            value={glassSettings.blur}
            onChange={(e) => setGlassBlur(Number(e.target.value))}
            className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-400"
            aria-label="Điều chỉnh độ mờ kính"
          />
        </div>
      </div>

      {/* Section 2: Window Management & Snap */}
      <div className="space-y-2 rounded-xl bg-black/25 p-3 border border-white/[0.08] hidden lg:block">
        <span className="text-[11px] font-medium text-neutral-200 block">Sắp xếp cửa sổ tự động</span>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            data-testid="btn-tile-windows"
            onClick={() => tileWidgets()}
            className="flex min-h-[36px] items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/6 hover:bg-white/12 text-neutral-200 text-xs transition-all cursor-pointer border border-white/5"
            title="Tự động xếp các cửa sổ mở song song (Alt+T)"
          >
            <Grid size={13} className="text-sky-400" />
            <span>Xếp lưới</span>
          </button>
          <button
            type="button"
            data-testid="btn-cascade-windows"
            onClick={() => cascadeWidgets()}
            className="flex min-h-[36px] items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/6 hover:bg-white/12 text-neutral-200 text-xs transition-all cursor-pointer border border-white/5"
            title="Xếp so le các cửa sổ đang mở (Alt+C)"
          >
            <Layers size={13} className="text-amber-400" />
            <span>Xếp tầng</span>
          </button>
        </div>

        {/* Snap to grid toggle */}
        <button
          type="button"
          data-testid="toggle-snap-grid"
          onClick={() => toggleSnap()}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-all cursor-pointer ${
            snapEnabled
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-white/5 border-white/8 text-neutral-400 hover:text-neutral-200'
          }`}
          title="Bật/Tắt chế độ Snap vào lưới 16px và cạnh lân cận"
        >
          <div className="flex items-center gap-2 text-xs">
            <Magnet size={13} className={snapEnabled ? 'text-emerald-400' : 'text-neutral-400'} />
            <span>Snap lưới & cạnh 16px</span>
          </div>
          <span className={`text-[9.5px] font-semibold px-2 py-0.5 rounded-full ${
            snapEnabled ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-neutral-400'
          }`}>
            {snapEnabled ? 'ĐANG BẬT' : 'TẮT'}
          </span>
        </button>
      </div>

      {/* Section 3: Dock Position & Auto-Hide */}
      <div className="space-y-2 rounded-xl bg-black/25 p-3 border border-white/[0.08] hidden lg:block">
        <span className="block text-[11px] font-medium text-neutral-200">Vị trí thanh công cụ DockBar</span>
        <div className="grid grid-cols-4 gap-1.5">
          {dockPositions.map((position) => (
            <button
              key={position.id}
              type="button"
              data-testid={`dock-position-${position.id}`}
              onClick={() => setDockPosition(position.id)}
              aria-pressed={dockPosition === position.id}
              title={`Đặt thanh công cụ bên ${position.label.toLowerCase()}`}
              className={`flex min-h-9 min-w-0 items-center justify-center gap-1 rounded-lg border px-1 text-xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${
                dockPosition === position.id
                  ? 'border-emerald-400/40 bg-emerald-400/15 text-emerald-200 font-semibold'
                  : 'border-white/5 bg-white/[0.03] text-neutral-400 hover:text-white'
              }`}
            >
              {position.icon}
              <span>{position.label}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          data-testid="toggle-dock-auto-hide"
          onClick={() => toggleDockAutoHide()}
          aria-pressed={dockAutoHide}
          className={`flex min-h-9 w-full items-center justify-between rounded-lg border px-3 py-1.5 transition-colors cursor-pointer text-xs ${
            dockAutoHide
              ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
              : 'border-white/10 bg-white/[0.03] text-neutral-300 hover:bg-white/[0.08]'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <EyeOff size={13} />
            Tự ẩn thanh công cụ khi không dùng
          </span>
          <span className="text-[10px] font-semibold">{dockAutoHide ? 'BẬT' : 'TẮT'}</span>
        </button>

        {/* Kích thước DockBar */}
        <div className="pt-2 border-t border-white/5">
          <span className="block text-[11px] font-medium text-neutral-300 mb-1.5">Kích thước thanh công cụ</span>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'compact', label: 'Gọn gàng (90%)' },
              { id: 'normal', label: 'Chuẩn (100%)' }
            ].map((size) => (
              <button
                key={size.id}
                type="button"
                data-testid={`dock-size-${size.id}`}
                onClick={() => setDockSize(size.id as any)}
                aria-pressed={(dockSize || 'normal') === size.id}
                className={`flex min-h-8 items-center justify-center rounded-lg border px-1 text-xs transition-colors cursor-pointer ${
                  (dockSize || 'normal') === size.id
                    ? 'border-amber-400/40 bg-amber-400/15 text-amber-200 font-semibold'
                    : 'border-white/5 bg-white/[0.03] text-neutral-400 hover:text-white'
                }`}
              >
                <span>{size.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Section 4: Layout Templates */}
      <div className="space-y-1.5 rounded-xl bg-black/25 p-3 border border-white/[0.08] hidden lg:block">
        <span className="text-[11px] font-medium text-neutral-200 block">Bố cục định sẵn</span>
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => setLayoutPreset('deep_focus')}
            className="w-full text-left px-2.5 py-1.5 rounded-lg text-neutral-300 hover:text-white hover:bg-white/8 flex items-center gap-2 cursor-pointer transition-colors text-xs"
          >
            <Target size={13} className="text-rose-400" />
            <span>Tập trung sâu (Chỉ hiển thị Timer)</span>
          </button>
          <button
            type="button"
            onClick={() => setLayoutPreset('planning')}
            className="w-full text-left px-2.5 py-1.5 rounded-lg text-neutral-300 hover:text-white hover:bg-white/8 flex items-center gap-2 cursor-pointer transition-colors text-xs"
          >
            <Layout size={13} className="text-indigo-400" />
            <span>Lập kế hoạch (Timer, Tasks, Notes)</span>
          </button>
          <button
            type="button"
            onClick={() => setLayoutPreset('default')}
            className="w-full text-left px-2.5 py-1.5 rounded-lg text-neutral-300 hover:text-white hover:bg-white/8 flex items-center gap-2 cursor-pointer transition-colors text-xs"
          >
            <RotateCcw size={13} className="text-amber-400" />
            <span>Bố cục mặc định Workspace</span>
          </button>
        </div>
      </div>

      {/* Persistence Micro-copy */}
      <div className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-500 py-0.5">
        <Lock className="w-3 h-3 text-emerald-400/70 shrink-0" />
        <span>Tự động lưu ngoại tuyến 100% trên thiết bị</span>
      </div>

      {/* Section 6: Reset Layout */}
      <div className="pt-1">
        <button
          type="button"
          data-testid="btn-reset-layout"
          onClick={() => setShowResetConfirm(true)}
          className="h-9 px-4 rounded-xl border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 active:scale-95 text-red-300 text-xs font-medium transition-all w-full flex items-center justify-center gap-2 cursor-pointer"
        >
          <RotateCcw size={14} />
          <span>Khôi phục toàn bộ bố cục mặc định</span>
        </button>
      </div>

      {/* Subtle Home Navigation Link */}
      <div className="flex justify-center pt-1">
        <button
          type="button"
          data-testid="settings-home-btn"
          onClick={() => router.navigate('/')}
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer py-1"
          title="Về Trang Chủ PomoFocus"
          aria-label="Về Trang Chủ PomoFocus"
        >
          <Home className="w-3.5 h-3.5 text-teal-400" />
          <span>Về Trang Chủ PomoFocus</span>
        </button>
      </div>

      {/* Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="reset-layout-title"
            data-testid="reset-layout-confirmation"
            className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#111722] p-5 shadow-2xl space-y-3"
          >
            <h2 id="reset-layout-title" className="text-sm font-semibold text-white">Đặt lại bố cục?</h2>
            <p className="text-xs leading-relaxed text-neutral-300">
              Vị trí, kích thước và trạng thái hiển thị của tất cả widget sẽ trở về mặc định ban đầu.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="min-h-9 rounded-lg border border-white/10 px-3 text-xs text-neutral-200 hover:bg-white/10 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                data-testid="confirm-reset-layout"
                onClick={() => {
                  resetLayout();
                  setShowResetConfirm(false);
                }}
                className="min-h-9 rounded-lg bg-rose-500 px-3.5 text-xs font-semibold text-white hover:bg-rose-600 cursor-pointer shadow-md"
              >
                Đặt lại
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default SettingsWidget;
