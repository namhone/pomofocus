import React, { useState } from 'react';
import {
  Sliders,
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
  HardDrive
} from 'lucide-react';
import { useLayoutStore } from '../stores/useLayoutStore';
import { useTimerStore } from '../stores/useTimerStore';
import { DockPosition } from '../types/layout';

export const SettingsWidget: React.FC = () => {
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
    dockAutoHide,
    toggleDockAutoHide,
    setLayoutPreset,
    resetLayout
  } = useLayoutStore();

  const timerSettings = useTimerStore((s) => s.settings);
  const updateTimerSettings = useTimerStore((s) => s.updateSettings);
  const timerStatus = useTimerStore((s) => s.status);

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
      className="flex h-full w-full flex-col text-slate-100 p-1 select-none space-y-4"
    >
      {/* Header Info */}
      <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
            <Sliders size={15} strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="font-medium text-white text-xs">Cài Đặt Không Gian Làm Việc</h3>
            <p className="text-[10px] text-neutral-400">Tùy biến cửa sổ, kính mờ và thanh công cụ</p>
          </div>
        </div>
      </div>

      {/* Button: Chỉnh sửa bố cục */}
      <div>
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
      <div className="space-y-2 rounded-xl bg-black/25 p-3 border border-white/[0.08]">
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
      <div className="space-y-2 rounded-xl bg-black/25 p-3 border border-white/[0.08]">
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
      <div className="space-y-2 rounded-xl bg-black/25 p-3 border border-white/[0.08]">
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
      </div>

      {/* Section 4: Layout Templates */}
      <div className="space-y-1.5 rounded-xl bg-black/25 p-3 border border-white/[0.08]">
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

      {/* Section 5: Pomodoro Settings & Persistence */}
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
            <label htmlFor="settings-pomo-min" className="block mb-1 text-[10.5px] text-neutral-400">
              Tập trung
            </label>
            <div className="relative">
              <input
                id="settings-pomo-min"
                data-testid="settings-input-pomodoro-min"
                type="number"
                min="1"
                max="120"
                value={timerSettings.pomodoroMinutes}
                disabled={timerStatus !== 'idle'}
                onChange={(e) => handleTimerChange({ pomodoroMinutes: Number(e.target.value) || 1 })}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-center text-xs text-white focus:outline-none focus:ring-1 focus:ring-rose-500 disabled:opacity-50"
              />
              <span className="absolute right-1.5 top-1 text-[9px] text-neutral-500 pointer-events-none">p</span>
            </div>
          </div>
          <div>
            <label htmlFor="settings-short-min" className="block mb-1 text-[10.5px] text-neutral-400">
              Nghỉ ngắn
            </label>
            <div className="relative">
              <input
                id="settings-short-min"
                data-testid="settings-input-short-min"
                type="number"
                min="1"
                max="60"
                value={timerSettings.shortBreakMinutes}
                disabled={timerStatus !== 'idle'}
                onChange={(e) => handleTimerChange({ shortBreakMinutes: Number(e.target.value) || 1 })}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-center text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
              />
              <span className="absolute right-1.5 top-1 text-[9px] text-neutral-500 pointer-events-none">p</span>
            </div>
          </div>
          <div>
            <label htmlFor="settings-long-min" className="block mb-1 text-[10.5px] text-neutral-400">
              Nghỉ dài
            </label>
            <div className="relative">
              <input
                id="settings-long-min"
                data-testid="settings-input-long-min"
                type="number"
                min="1"
                max="60"
                value={timerSettings.longBreakMinutes}
                disabled={timerStatus !== 'idle'}
                onChange={(e) => handleTimerChange({ longBreakMinutes: Number(e.target.value) || 1 })}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-center text-xs text-white focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:opacity-50"
              />
              <span className="absolute right-1.5 top-1 text-[9px] text-neutral-500 pointer-events-none">p</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              data-testid="settings-checkbox-auto-transition"
              type="checkbox"
              checked={timerSettings.autoTransition}
              onChange={(e) => handleTimerChange({ autoTransition: e.target.checked })}
              className="rounded border-neutral-700 bg-neutral-800 text-rose-500 focus:ring-0"
            />
            <span className="text-neutral-300 text-[11px]">Tự động chuyển tiếp giữa các hiệp</span>
          </label>
        </div>
      </div>

      {/* Persistence Status Badge */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[10.5px]">
        <HardDrive size={13} className="shrink-0 text-emerald-400" />
        <span>Tự động lưu toàn bộ cài đặt (thời gian, giao diện, nhạc & bố cục) vào Local Storage & IndexedDB. Hoạt động ngoại tuyến 100%.</span>
      </div>

      {/* Section 6: Reset Layout */}
      <div className="pt-2">
        <button
          type="button"
          data-testid="btn-reset-layout"
          onClick={() => setShowResetConfirm(true)}
          className="w-full min-h-10 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 hover:text-rose-200 text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <RotateCcw size={14} />
          <span>Khôi phục toàn bộ bố cục mặc định</span>
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
