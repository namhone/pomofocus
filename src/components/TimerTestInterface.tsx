import React, { useEffect } from 'react';
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
  const {
    phase,
    status,
    currentRound,
    remainingMs,
    settings,
    isLeader,
    linkedTaskTitle,
    start,
    pause,
    resume,
    reset,
    skip,
    setLinkedTask,
    updateSettings,
    requestNotificationPermission,
    init
  } = useTimerStore();

  useEffect(() => {
    init();
  }, [init]);

  const getPhaseStyles = (p: TimerPhase) => {
    switch (p) {
      case 'pomodoro':
        return {
          bg: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
          activeTab: 'bg-rose-500 text-white',
          label: 'Focus / Pomodoro'
        };
      case 'short_break':
        return {
          bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
          activeTab: 'bg-emerald-500 text-white',
          label: 'Short Break'
        };
      case 'long_break':
        return {
          bg: 'bg-sky-500/10 border-sky-500/30 text-sky-400',
          activeTab: 'bg-sky-500 text-white',
          label: 'Long Break'
        };
    }
  };

  const currentPhaseStyle = getPhaseStyles(phase);

  return (
    <div className={`flex w-full max-w-md flex-col items-center justify-center ${isEmbeddedInZen ? 'scale-105 transition-transform' : ''}`}>
      <div className="w-full rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl">
        {/* Header Indicators */}
        <div className="flex items-center justify-between text-xs text-slate-400 mb-4">
          <div className="flex items-center gap-2">
            <span
              data-testid="leader-indicator"
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-medium ${
                isLeader ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-300'
              }`}
            >
              {isLeader ? '👑 Leader Tab' : '👥 Follower Tab'}
            </span>
            <span
              data-testid="round-indicator"
              className="rounded-full bg-white/5 px-2.5 py-0.5 font-medium text-slate-300"
            >
              Round {currentRound} / {settings.roundsBeforeLongBreak}
            </span>
          </div>

          <span
            data-testid="status-indicator"
            className="uppercase tracking-wider font-semibold text-slate-400"
          >
            {status}
          </span>
        </div>

        {/* Task Đang Liên Kết Banner */}
        {linkedTaskTitle && (
          <div
            data-testid="linked-task-banner"
            className="mb-4 flex items-center justify-between rounded-2xl bg-indigo-500/15 border border-indigo-500/30 px-3.5 py-2 text-xs text-indigo-300"
          >
            <div className="flex items-center gap-2 truncate">
              <span>🎯</span>
              <span className="font-semibold truncate">Đang làm: {linkedTaskTitle}</span>
            </div>
            <button
              type="button"
              data-testid="btn-unlink-timer-task"
              onClick={() => setLinkedTask(null, null)}
              className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 transition cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400"
            >
              Bỏ gắn
            </button>
          </div>
        )}

        {/* Phase Selector Tabs */}
        <div className="flex rounded-xl bg-white/5 p-1 mb-6">
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
                className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
                  isActive ? style.activeTab : 'text-slate-400 hover:text-white'
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {style.label}
              </button>
            );
          })}
        </div>

        {/* Timer Display Display Area */}
        <div
          className={`flex flex-col items-center justify-center rounded-2xl border p-8 transition-colors ${currentPhaseStyle.bg}`}
        >
          <div
            data-testid="timer-display"
            className="font-mono tabular-nums text-6xl font-bold tracking-tight text-white select-none"
          >
            {formatTime(remainingMs)}
          </div>
          <div className="mt-2 text-xs uppercase tracking-widest text-slate-400">
            {currentPhaseStyle.label}
          </div>
        </div>

        {/* Control Buttons Area */}
        <div className="mt-6 flex items-center justify-center gap-3">
          {status === 'idle' && (
            <button
              data-testid="timer-start-btn"
              onClick={start}
              className="flex-1 rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white shadow-lg shadow-indigo-600/30 transition hover:bg-indigo-500 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
            >
              Bắt đầu (Space)
            </button>
          )}

          {status === 'running' && (
            <button
              data-testid="timer-pause-btn"
              onClick={pause}
              className="flex-1 rounded-xl bg-amber-600 px-6 py-3 font-semibold text-white shadow-lg shadow-amber-600/30 transition hover:bg-amber-500 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
            >
              Tạm dừng (Space)
            </button>
          )}

          {status === 'paused' && (
            <button
              data-testid="timer-resume-btn"
              onClick={resume}
              className="flex-1 rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white shadow-lg shadow-emerald-600/30 transition hover:bg-emerald-500 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
            >
              Tiếp tục (Space)
            </button>
          )}

          <button
            data-testid="timer-reset-btn"
            onClick={reset}
            title="Reset về mặc định (R)"
            className="rounded-xl border border-white/10 bg-white/5 p-3 text-slate-300 transition hover:bg-white/10 hover:text-white active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          >
            ↺ Reset
          </button>

          <button
            data-testid="timer-skip-btn"
            onClick={skip}
            title="Chuyển sang hiệp kế tiếp (S)"
            className="rounded-xl border border-white/10 bg-white/5 p-3 text-slate-300 transition hover:bg-white/10 hover:text-white active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          >
            ⏭ Skip
          </button>
        </div>

        {/* Quick Settings Panel */}
        <div className="mt-6 border-t border-white/10 pt-4 text-xs text-slate-400 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-300">Cấu hình thời gian (phút):</span>
            <button
              data-testid="btn-request-notification"
              type="button"
              onClick={requestNotificationPermission}
              className="text-[11px] text-indigo-400 hover:text-indigo-300 underline cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400 rounded px-1"
            >
              Bật thông báo
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label htmlFor="input-pomodoro-min" className="block mb-1 text-[11px]">Tập trung</label>
              <input
                id="input-pomodoro-min"
                data-testid="input-pomodoro-min"
                type="number"
                min="1"
                max="120"
                value={settings.pomodoroMinutes}
                disabled={status !== 'idle'}
                onChange={(e) => updateSettings({ pomodoroMinutes: Number(e.target.value) || 1 })}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-center text-white focus:outline-none focus:ring-1 focus:ring-rose-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <label htmlFor="input-short-min" className="block mb-1 text-[11px]">Nghỉ ngắn</label>
              <input
                id="input-short-min"
                data-testid="input-short-min"
                type="number"
                min="1"
                max="60"
                value={settings.shortBreakMinutes}
                disabled={status !== 'idle'}
                onChange={(e) => updateSettings({ shortBreakMinutes: Number(e.target.value) || 1 })}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-center text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <label htmlFor="input-long-min" className="block mb-1 text-[11px]">Nghỉ dài</label>
              <input
                id="input-long-min"
                data-testid="input-long-min"
                type="number"
                min="1"
                max="60"
                value={settings.longBreakMinutes}
                disabled={status !== 'idle'}
                onChange={(e) => updateSettings({ longBreakMinutes: Number(e.target.value) || 1 })}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-center text-white focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                data-testid="checkbox-auto-transition"
                type="checkbox"
                checked={settings.autoTransition}
                onChange={(e) => updateSettings({ autoTransition: e.target.checked })}
                className="rounded border-slate-700 bg-slate-800 text-rose-500 focus:ring-0"
              />
              <span>Tự động chuyển hiệp (Auto-transition)</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
