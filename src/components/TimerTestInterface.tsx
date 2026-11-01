import React, { useEffect } from 'react';
import { Play, Pause, RotateCcw, FastForward, Bell, Target } from 'lucide-react';
import { useTimerStore } from '../stores/useTimerStore';
import { TimerPhase } from '../types/timer';

function formatTime(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

interface TimerTestInterfaceProps {
  isEmbeddedInZen?: boolean;
}

export const TimerTestInterface: React.FC<TimerTestInterfaceProps> = ({
  isEmbeddedInZen = false
}) => {
  const phase = useTimerStore((state) => state.phase);
  const status = useTimerStore((state) => state.status);
  const currentRound = useTimerStore((state) => state.currentRound);
  const remainingMs = useTimerStore((state) => state.remainingMs);
  const settings = useTimerStore((state) => state.settings);
  const isLeader = useTimerStore((state) => state.isLeader);
  const linkedTaskTitle = useTimerStore((state) => state.linkedTaskTitle);
  const start = useTimerStore((state) => state.start);
  const pause = useTimerStore((state) => state.pause);
  const resume = useTimerStore((state) => state.resume);
  const reset = useTimerStore((state) => state.reset);
  const skip = useTimerStore((state) => state.skip);
  const setLinkedTask = useTimerStore((state) => state.setLinkedTask);
  const updateSettings = useTimerStore((state) => state.updateSettings);
  const requestNotificationPermission = useTimerStore((state) => state.requestNotificationPermission);
  const init = useTimerStore((state) => state.init);

  useEffect(() => {
    init();
  }, [init]);

  const getPhaseStyles = (p: TimerPhase) => {
    switch (p) {
      case 'pomodoro':
        return {
          bg: 'bg-white/[0.02] border-white/[0.08] text-white shadow-inner',
          activeTab: 'bg-rose-500/20 text-rose-200 border border-rose-500/35 font-medium shadow-xs',
          label: 'Tập trung'
        };
      case 'short_break':
        return {
          bg: 'bg-white/[0.02] border-white/[0.08] text-white shadow-inner',
          activeTab: 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/35 font-medium shadow-xs',
          label: 'Nghỉ ngắn'
        };
      case 'long_break':
        return {
          bg: 'bg-white/[0.02] border-white/[0.08] text-white shadow-inner',
          activeTab: 'bg-sky-500/20 text-sky-200 border border-sky-500/35 font-medium shadow-xs',
          label: 'Nghỉ dài'
        };
    }
  };

  const currentPhaseStyle = getPhaseStyles(phase);

  return (
    <div className={`flex w-full flex-col items-center justify-center mx-auto select-none ${isEmbeddedInZen ? 'scale-105 transition-transform max-w-md' : 'max-w-full'}`}>
      <div className={isEmbeddedInZen ? 'w-full rounded-[20px] border-t border-t-white/[0.24] border-x border-x-white/[0.10] border-b border-b-white/[0.05] bg-[rgba(12,15,22,0.45)] p-6 shadow-2xl backdrop-blur-2xl backdrop-saturate-[180%]' : 'w-full flex flex-col'}>
        {/* Header Indicators */}
        <div className="flex items-center justify-between text-xs text-neutral-300 mb-3 select-none">
          <div className="flex items-center gap-2">
            <span
              data-testid="leader-indicator"
              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium min-h-[28px] ${
                isLeader ? 'bg-amber-500/10 text-amber-300 border border-amber-500/25' : 'bg-white/[0.04] text-neutral-400 border border-white/5'
              }`}
            >
              {isLeader ? 'Tab chính' : 'Tab phụ'}
            </span>
            <span
              data-testid="round-indicator"
              className="rounded-md bg-white/[0.06] border border-white/5 px-2.5 py-1 text-[11px] font-medium text-neutral-300 min-h-[28px] inline-flex items-center"
            >
              Hiệp {currentRound} / {settings.roundsBeforeLongBreak}
            </span>
          </div>

          <span
            data-testid="status-indicator"
            className="uppercase tracking-wider font-semibold text-[11px] text-neutral-300"
          >
            {status === 'running' ? 'Đang chạy' : status === 'paused' ? 'Tạm dừng' : 'Chờ bắt đầu'}
          </span>
        </div>

        {/* Task Đang Liên Kết Banner (Current Focus Task) */}
        {linkedTaskTitle && (
          <div
            data-testid="linked-task-banner"
            className="mb-3.5 flex items-center justify-between rounded-lg bg-white/[0.06] border border-white/12 px-3 py-1.5 text-xs text-neutral-200"
          >
            <div className="flex items-center gap-2 truncate">
              <Target size={14} className="text-amber-400 shrink-0" />
              <span className="font-medium truncate">Đang làm: {linkedTaskTitle}</span>
            </div>
            <button
              type="button"
              data-testid="btn-unlink-timer-task"
              onClick={() => setLinkedTask(null, null)}
              className="text-[10px] px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-neutral-300 transition cursor-pointer min-h-[28px] inline-flex items-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
            >
              Bỏ gắn
            </button>
          </div>
        )}

        {/* Phase Selector Segmented Control (Min-Height: 36px for touch accessibility) */}
        <div className="flex rounded-xl bg-neutral-900/70 p-1 border border-white/[0.08] mb-4 min-h-[36px] items-stretch gap-1">
          {(['pomodoro', 'short_break', 'long_break'] as TimerPhase[]).map((p) => {
            const isActive = phase === p;
            const style = getPhaseStyles(p);

            return (
              <button
                key={p}
                data-testid={`tab-${p}`}
                disabled={status !== 'idle'}
                onClick={() => {
                  useTimerStore.setState({
                    phase: p,
                    remainingMs:
                      p === 'pomodoro'
                        ? settings.pomodoroMinutes * 60 * 1000
                        : p === 'short_break'
                        ? settings.shortBreakMinutes * 60 * 1000
                        : settings.longBreakMinutes * 60 * 1000
                  });
                }}
                className={`flex-1 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer flex items-center justify-center min-h-[34px] px-2.5 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 ${
                  isActive ? style.activeTab : 'text-neutral-400 hover:text-white'
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {style.label}
              </button>
            );
          })}
        </div>

        {/* Timer Display Display Area (Specular Highlight + Tabular Figures Không Rung) */}
        <div
          className={`w-full flex flex-col items-center justify-center rounded-2xl border py-6 px-4 text-center transition-colors shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)] ${currentPhaseStyle.bg}`}
        >
          <div
            data-testid="timer-display"
            className="font-mono tabular-nums text-6xl sm:text-7xl font-bold tracking-tight text-white text-center w-full select-none drop-shadow-[0_4px_24px_rgba(255,255,255,0.18)] [font-variant-numeric:tabular-nums] [font-feature-settings:'tnum'_1]"
          >
            {formatTime(remainingMs)}
          </div>
          <div className="mt-2 text-xs uppercase tracking-widest text-neutral-400 font-medium">
            {currentPhaseStyle.label}
          </div>

          {/* Session Round Dots */}
          <div className="flex items-center gap-1.5 mt-3">
            {Array.from({ length: settings.roundsBeforeLongBreak }).map((_, idx) => (
              <div
                key={idx}
                className={`w-2 h-2 rounded-full transition-colors ${
                  idx + 1 < currentRound
                    ? 'bg-rose-500'
                    : idx + 1 === currentRound
                    ? 'bg-rose-400 animate-pulse'
                    : 'bg-white/15'
                }`}
                title={`Hiệp ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Daily Focus Goal Bar (4px) */}
        <div className="w-full mt-3 px-0.5">
          <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-1">
            <span>Tiến độ ngày</span>
            <span className="font-mono text-neutral-300">
              {currentRound} / {settings.roundsBeforeLongBreak * 2} sessions
            </span>
          </div>
          <div className="w-full h-1 bg-white/[0.08] rounded-full overflow-hidden">
            <div
              className="h-full bg-rose-600 rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(100, (currentRound / (settings.roundsBeforeLongBreak * 2)) * 100)}%`
              }}
            />
          </div>
        </div>

        {/* Control Buttons Area (Snappy Spring Motion + Optical Cap-Height Alignment) */}
        <div className="mt-4 flex w-full items-center justify-center gap-2">
          {status === 'idle' && (
            <button
              data-testid="timer-start-btn"
              onClick={start}
              title="Bắt đầu phiên tập trung"
              className="flex-1 rounded-xl bg-white p-3 text-sm font-semibold text-neutral-900 shadow-[0_4px_20px_rgba(255,255,255,0.18)] transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-neutral-100 active:scale-[0.97] active:opacity-90 cursor-pointer min-h-[44px] inline-flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            >
              <Play size={16} fill="currentColor" className="-translate-y-[0.5px]" />
              <span>Bắt đầu</span>
            </button>
          )}

          {status === 'running' && (
            <button
              data-testid="timer-pause-btn"
              onClick={pause}
              title="Tạm dừng phiên tập trung"
              className="flex-1 rounded-xl bg-amber-400 p-3 text-sm font-semibold text-neutral-950 shadow-[0_4px_16px_rgba(251,191,36,0.25)] transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-amber-300 active:scale-[0.97] active:opacity-90 cursor-pointer min-h-[44px] inline-flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            >
              <Pause size={16} fill="currentColor" className="-translate-y-[0.5px]" />
              <span>Tạm dừng</span>
            </button>
          )}

          {status === 'paused' && (
            <button
              data-testid="timer-resume-btn"
              onClick={resume}
              title="Tiếp tục phiên tập trung"
              className="flex-1 rounded-xl bg-emerald-400 p-3 text-sm font-semibold text-neutral-950 shadow-[0_4px_16px_rgba(52,211,153,0.25)] transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-emerald-300 active:scale-[0.97] active:opacity-90 cursor-pointer min-h-[44px] inline-flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
            >
              <Play size={16} fill="currentColor" className="-translate-y-[0.5px]" />
              <span>Tiếp tục</span>
            </button>
          )}

          <button
            data-testid="timer-reset-btn"
            onClick={reset}
            title="Đặt lại về mặc định"
            className="rounded-xl border border-white/10 bg-white/[0.05] p-3 text-neutral-300 transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-white/[0.12] hover:text-white active:scale-[0.97] active:opacity-90 cursor-pointer min-h-[44px] min-w-[44px] inline-flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]"
          >
            <RotateCcw size={15} className="-translate-y-[0.5px]" />
            <span className="text-xs">Đặt lại</span>
          </button>

          <button
            data-testid="timer-skip-btn"
            onClick={skip}
            title="Chuyển sang hiệp kế tiếp"
            className="rounded-xl border border-white/10 bg-white/[0.05] p-3 text-neutral-300 transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-white/[0.12] hover:text-white active:scale-[0.97] active:opacity-90 cursor-pointer min-h-[44px] min-w-[44px] inline-flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]"
          >
            <FastForward size={15} className="-translate-y-[0.5px]" />
            <span className="text-xs">Skip</span>
          </button>
        </div>

        {/* Quick Settings Panel (chỉ hiển thị ở Workspace thường, ẩn trong Zen Mode) */}
        {!isEmbeddedInZen && (
          <div className="mt-4 border-t border-white/[0.08] pt-3 text-xs text-neutral-300 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-medium text-neutral-200 text-[11px] flex items-center gap-1.5">
                Cấu hình thời gian (phút):
                <span className="text-[9.5px] font-normal text-emerald-400/90 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">Tự lưu thiết bị</span>
              </span>
              <button
                data-testid="btn-request-notification"
                type="button"
                onClick={requestNotificationPermission}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 underline cursor-pointer min-h-[28px] inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400 rounded px-1"
              >
                <Bell size={12} />
                <span>Bật thông báo</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label htmlFor="input-pomodoro-min" className="block mb-1 text-[11px] text-neutral-300">
                  Tập trung
                </label>
                <input
                  id="input-pomodoro-min"
                  data-testid="input-pomodoro-min"
                  type="number"
                  min="1"
                  max="120"
                  aria-label="Thời gian tập trung (phút)"
                  value={settings.pomodoroMinutes}
                  disabled={status !== 'idle'}
                  onChange={(e) => updateSettings({ pomodoroMinutes: Number(e.target.value) || 1 })}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-center text-white focus:outline-none focus:ring-1 focus:ring-rose-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label htmlFor="input-short-min" className="block mb-1 text-[11px] text-neutral-300">
                  Nghỉ ngắn
                </label>
                <input
                  id="input-short-min"
                  data-testid="input-short-min"
                  type="number"
                  min="1"
                  max="60"
                  aria-label="Thời gian nghỉ ngắn (phút)"
                  value={settings.shortBreakMinutes}
                  disabled={status !== 'idle'}
                  onChange={(e) => updateSettings({ shortBreakMinutes: Number(e.target.value) || 1 })}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-center text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label htmlFor="input-long-min" className="block mb-1 text-[11px] text-neutral-300">
                  Nghỉ dài
                </label>
                <input
                  id="input-long-min"
                  data-testid="input-long-min"
                  type="number"
                  min="1"
                  max="60"
                  aria-label="Thời gian nghỉ dài (phút)"
                  value={settings.longBreakMinutes}
                  disabled={status !== 'idle'}
                  onChange={(e) => updateSettings({ longBreakMinutes: Number(e.target.value) || 1 })}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-center text-white focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none py-1">
                <input
                  data-testid="checkbox-auto-transition"
                  type="checkbox"
                  checked={settings.autoTransition}
                  onChange={(e) => updateSettings({ autoTransition: e.target.checked })}
                  className="rounded border-neutral-700 bg-neutral-800 text-rose-500 focus:ring-0"
                />
                <span className="text-neutral-300 text-[11px]">Tự động chuyển hiệp</span>
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
