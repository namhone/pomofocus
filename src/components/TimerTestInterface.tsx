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
          activeTab: 'liquid-glass-btn liquid-glass-btn-rose text-rose-200 font-medium shadow-xs',
          label: 'Tập trung'
        };
      case 'short_break':
        return {
          bg: 'bg-white/[0.02] border-white/[0.08] text-white shadow-inner',
          activeTab: 'liquid-glass-btn liquid-glass-btn-emerald text-emerald-200 font-medium shadow-xs',
          label: 'Nghỉ ngắn'
        };
      case 'long_break':
        return {
          bg: 'bg-white/[0.02] border-white/[0.08] text-white shadow-inner',
          activeTab: 'liquid-glass-btn liquid-glass-btn-sky text-sky-200 font-medium shadow-xs',
          label: 'Nghỉ dài'
        };
    }
  };

  const currentPhaseStyle = getPhaseStyles(phase);

  return (
    <div className={`flex w-full flex-col items-center justify-center mx-auto select-none ${isEmbeddedInZen ? 'max-w-md' : 'max-w-full'}`}>
      <div className={isEmbeddedInZen ? 'w-full rounded-[20px] border-t border-t-white/[0.24] border-x border-x-white/[0.10] border-b border-b-white/[0.05] bg-[rgba(12,15,22,0.45)] p-6 shadow-2xl backdrop-blur-2xl backdrop-saturate-[180%]' : 'w-full flex flex-col'}>
        {/* Header Indicators */}
        <div className="flex items-center justify-between text-xs text-neutral-300 mb-2 select-none">
          <div className="flex items-center gap-1.5">
            <span data-testid="leader-indicator" className="sr-only">{isLeader ? 'Leader Tab' : 'Follower Tab'}</span>
            <span
              data-testid="round-indicator"
              className="rounded-md bg-white/[0.06] border border-white/5 px-2 py-0.5 text-[10px] font-medium text-neutral-300 min-h-[24px] inline-flex items-center"
            >
              Hiệp {currentRound} / {settings.roundsBeforeLongBreak}
            </span>
          </div>

          <span
            data-testid="status-indicator"
            className="uppercase tracking-wider font-semibold text-[10px] text-neutral-300"
          >
            {status === 'running' ? 'Đang chạy' : status === 'paused' ? 'Tạm dừng' : 'Chờ bắt đầu'}
          </span>
        </div>

        {/* Task Đang Liên Kết Banner (Current Focus Task) */}
        {linkedTaskTitle && (
          <div
            data-testid="linked-task-banner"
            className="mb-2.5 flex items-center justify-between rounded-lg bg-white/[0.06] border border-white/12 px-2.5 py-1 text-xs text-neutral-200"
          >
            <div className="flex items-center gap-1.5 truncate">
              <Target size={13} className="text-amber-400 shrink-0" />
              <span className="font-medium truncate text-[11px]">Đang làm: {linkedTaskTitle}</span>
            </div>
            <button
              type="button"
              data-testid="btn-unlink-timer-task"
              aria-label="Bỏ gắn công việc khỏi đồng hồ"
              onClick={() => setLinkedTask(null, null)}
              className="text-[10px] px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-neutral-300 transition cursor-pointer min-h-[24px] inline-flex items-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
            >
              Bỏ gắn
            </button>
          </div>
        )}

        {/* Phase Selector Segmented Control (Min-Height: 36px for touch accessibility) */}
        <div className="flex rounded-full bg-neutral-900/70 p-1 border border-white/[0.08] mb-2 min-h-[30px] items-stretch gap-1">
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
                className={`flex-1 rounded-full text-[11px] font-medium transition-all duration-150 cursor-pointer flex items-center justify-center min-h-[28px] px-2 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 ${
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
          className={`w-full flex flex-col items-center justify-center rounded-2xl border py-2 px-3 text-center transition-all duration-300 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)] ${currentPhaseStyle.bg} ${status === 'running' ? 'animate-zen-breathe' : ''}`}
        >
          <div
            data-testid="timer-display"
            className="font-mono tabular-nums text-4xl sm:text-5xl font-bold tracking-tight text-white text-center w-full select-none drop-shadow-[0_4px_24px_rgba(255,255,255,0.18)] [font-variant-numeric:tabular-nums] [font-feature-settings:'tnum'_1]"
          >
            {formatTime(remainingMs)}
          </div>

          {/* Session Round Dots */}
          <div className="flex items-center gap-1.5 mt-0.5">
            {Array.from({ length: settings.roundsBeforeLongBreak }).map((_, idx) => (
              <div
                key={idx}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
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
        <div className="w-full mt-1 px-0.5">
          <div className="flex items-center justify-between text-[10px] text-neutral-400 mb-0.5">
            <span>Tiến độ ngày</span>
            <span className="font-mono text-neutral-300">
              {currentRound}/{settings.roundsBeforeLongBreak * 2}
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
        <div className="mt-1.5 flex w-full items-center justify-center gap-1.5">
          {status === 'idle' && (
            <button
              data-testid="timer-start-btn"
              onClick={start}
              title="Bắt đầu phiên tập trung"
              aria-label="Bắt đầu phiên tập trung"
              className="liquid-glass-btn flex-1 py-1.5 px-4 text-xs font-semibold text-white shadow-[0_6px_20px_rgba(255,255,255,0.18),inset_0_1px_1px_rgba(255,255,255,0.5)] min-h-[34px] gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            >
              <Play size={13} fill="currentColor" className="-translate-y-[0.5px]" />
              <span>Bắt đầu</span>
            </button>
          )}

          {status === 'running' && (
            <button
              data-testid="timer-pause-btn"
              onClick={pause}
              title="Tạm dừng phiên tập trung"
              aria-label="Tạm dừng phiên tập trung"
              className="liquid-glass-btn liquid-glass-btn-amber flex-1 py-1.5 px-4 text-xs font-semibold min-h-[34px] gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            >
              <Pause size={13} fill="currentColor" className="-translate-y-[0.5px]" />
              <span>Tạm dừng</span>
            </button>
          )}

          {status === 'paused' && (
            <button
              data-testid="timer-resume-btn"
              onClick={resume}
              title="Tiếp tục phiên tập trung"
              aria-label="Tiếp tục phiên tập trung"
              className="liquid-glass-btn liquid-glass-btn-emerald flex-1 py-1.5 px-4 text-xs font-semibold min-h-[34px] gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
            >
              <Play size={13} fill="currentColor" className="-translate-y-[0.5px]" />
              <span>Tiếp tục</span>
            </button>
          )}

          <button
            data-testid="timer-reset-btn"
            onClick={reset}
            title="Đặt lại về mặc định"
            aria-label="Đặt lại về mặc định"
            className="liquid-glass-btn py-1.5 px-2.5 text-neutral-300 hover:text-white min-h-[34px] min-w-[34px] gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            <RotateCcw size={12} className="-translate-y-[0.5px]" />
            <span className="text-[11px]">Đặt lại</span>
          </button>

          <button
            data-testid="timer-skip-btn"
            onClick={skip}
            title="Chuyển sang hiệp kế tiếp"
            aria-label="Chuyển sang hiệp kế tiếp"
            className="liquid-glass-btn py-1.5 px-2.5 text-neutral-300 hover:text-white min-h-[34px] min-w-[34px] gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            <FastForward size={12} className="-translate-y-[0.5px]" />
            <span className="text-[11px]">Bỏ qua</span>
          </button>
        </div>

        {/* Quick Settings Panel (chỉ hiển thị ở Workspace thường, ẩn trong Zen Mode) */}
        {!isEmbeddedInZen && (
          <div className="mt-2 border-t border-white/[0.08] pt-1.5 pb-0.5 text-xs text-neutral-300 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-medium text-neutral-200 text-[10.5px] flex items-center gap-1.5">
                <span>25m • 5m • 15m</span>
                
              </span>
              <button
                data-testid="btn-request-notification"
                type="button"
                onClick={requestNotificationPermission}
                className="text-[10.5px] text-zinc-400 hover:text-white underline cursor-pointer inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 rounded px-1"
              >
                <Bell size={11} />
                <span>Bật thông báo</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              <div>
                <label htmlFor="input-pomodoro-min" className="block mb-0.5 text-[10px] text-neutral-400">
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
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-center text-xs text-white focus:outline-none focus:ring-1 focus:ring-rose-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label htmlFor="input-short-min" className="block mb-0.5 text-[10px] text-neutral-400">
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
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-center text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label htmlFor="input-long-min" className="block mb-0.5 text-[10px] text-neutral-400">
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
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-center text-xs text-white focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none py-0.5">
                <input
                  data-testid="checkbox-auto-transition"
                  type="checkbox"
                  checked={settings.autoTransition}
                  onChange={(e) => updateSettings({ autoTransition: e.target.checked })}
                  className="rounded border-neutral-700 bg-neutral-800 text-rose-500 focus:ring-0"
                />
                <span className="text-neutral-300 text-[10.5px]">Tự động chuyển hiệp</span>
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
