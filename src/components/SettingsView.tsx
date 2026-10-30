import React, { useState } from 'react';
import { useTimerStore } from '../stores/useTimerStore';
import { useLayoutStore } from '../stores/useLayoutStore';
import { useAudioStore } from '../stores/useAudioStore';
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
  CheckCircle2
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const timerSettings = useTimerStore((s) => s.settings);
  const updateTimerSettings = useTimerStore((s) => s.updateSettings);

  const glassSettings = useLayoutStore((s) => s.glassSettings);
  const setGlassPreset = useLayoutStore((s) => s.setGlassPreset);
  const resetLayout = useLayoutStore((s) => s.resetLayout);

  const masterVolume = useAudioStore((s) => s.settings.masterVolume);
  const setMasterVolume = useAudioStore((s) => s.setMasterVolume);
  const selectedChime = useAudioStore((s) => s.settings.selectedChime);
  const setSelectedChime = useAudioStore((s) => s.setSelectedChime);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
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
      </main>

      <SharedFooter />
    </div>
  );
};
