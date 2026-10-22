import React, { useEffect } from 'react';
import { useTimerStore } from '../stores/useTimerStore';
import { TimerPhase } from '../types/timer';

function formatTime(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export const TimerTestInterface: React.FC = () => {
  const {
    phase,
    status,
    currentRound,
    remainingMs,
    settings,
    isLeader,
    notificationPermission,
    start,
    pause,
    resume,
    reset,
    skip,
    updateSettings,
    requestNotificationPermission,
    init,
    destroy
  } = useTimerStore();

  useEffect(() => {
    init();
    return () => {
      destroy();
    };
  }, [init, destroy]);

  // Xử lý phím tắt bàn phím
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Bỏ qua khi đang focus vào ô input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (status === 'idle') {
          start();
        } else if (status === 'running') {
          pause();
        } else if (status === 'paused') {
          resume();
        }
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        reset();
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        skip();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [status, start, pause, resume, reset, skip]);

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
    <div className="flex min-h-screen w-full flex-col items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl">
        {/* Header Indicators */}
        <div className="flex items-center justify-between text-xs text-slate-400 mb-6">
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

        {/* Phase Selector Tabs */}
        <div className="flex rounded-xl bg-white/5 p-1 mb-6">
          {(['pomodoro', 'short_break', 'long_break'] as TimerPhase[]).map((p) => {
            const isActive = phase === p;
            const style = getPhaseStyles(p);
            return (
              <button
                key={p}
                data-testid={`phase-btn-${p}`}
                disabled={status === 'running'}
                onClick={() => {
                  useTimerStore.getState().reset();
                  // Sẽ reset và đặt phase mới
                }}
                className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-all ${
                  isActive ? style.activeTab : 'text-slate-400 hover:text-white'
                } ${status === 'running' ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {p === 'pomodoro' ? 'Focus' : p === 'short_break' ? 'Short' : 'Long'}
              </button>
            );
          })}
        </div>

        {/* Large Timer Display */}
        <div
          data-testid="phase-indicator"
          className={`rounded-2xl border p-8 text-center transition-all ${currentPhaseStyle.bg}`}
        >
          <div
            data-testid="timer-display"
            className="font-mono text-6xl font-bold tracking-tight text-white select-none"
          >
            {formatTime(remainingMs)}
          </div>
          <div className="mt-2 text-xs font-medium uppercase tracking-widest text-slate-400">
            {currentPhaseStyle.label}
          </div>
        </div>

        {/* Action Controls */}
        <div className="mt-6 flex items-center justify-center gap-3">
          {status === 'idle' && (
            <button
              data-testid="timer-start-btn"
              onClick={start}
              className="flex-1 rounded-xl bg-rose-500 py-3 font-semibold text-white shadow-lg shadow-rose-500/25 transition-all hover:bg-rose-600 active:scale-95"
            >
              Start (Space)
            </button>
          )}

          {status === 'running' && (
            <button
              data-testid="timer-pause-btn"
              onClick={pause}
              className="flex-1 rounded-xl bg-amber-500 py-3 font-semibold text-white shadow-lg shadow-amber-500/25 transition-all hover:bg-amber-600 active:scale-95"
            >
              Pause (Space)
            </button>
          )}

          {status === 'paused' && (
            <button
              data-testid="timer-resume-btn"
              onClick={resume}
              className="flex-1 rounded-xl bg-emerald-500 py-3 font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:bg-emerald-600 active:scale-95"
            >
              Resume (Space)
            </button>
          )}

          <button
            data-testid="timer-reset-btn"
            onClick={reset}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-medium text-slate-300 transition-all hover:bg-white/10 active:scale-95"
            title="Reset hiệp hiện tại (R)"
          >
            Reset (R)
          </button>

          <button
            data-testid="timer-skip-btn"
            onClick={skip}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-medium text-slate-300 transition-all hover:bg-white/10 active:scale-95"
            title="Chuyển sang hiệp tiếp theo (S)"
          >
            Skip (S)
          </button>
        </div>

        {/* Minimal Settings Collapsible */}
        <div className="mt-8 border-t border-white/10 pt-4 text-xs text-slate-400">
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold uppercase tracking-wider text-slate-300">Cấu hình Timer</span>
            <button
              onClick={requestNotificationPermission}
              className={`rounded px-2 py-0.5 text-[11px] font-medium border ${
                notificationPermission === 'granted'
                  ? 'border-emerald-500/30 text-emerald-400'
                  : 'border-slate-600 text-slate-400 hover:text-white'
              }`}
            >
              {notificationPermission === 'granted' ? '🔔 Thông báo: Bật' : '🔕 Bật thông báo'}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-3">
            <div>
              <label className="block mb-1 text-[11px]">Focus (phút)</label>
              <input
                data-testid="input-pomodoro-min"
                type="number"
                min="1"
                max="120"
                value={settings.pomodoroMinutes}
                disabled={status !== 'idle'}
                onChange={(e) => updateSettings({ pomodoroMinutes: Number(e.target.value) || 1 })}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-center text-white focus:outline-none focus:ring-1 focus:ring-rose-500 disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block mb-1 text-[11px]">Nghỉ ngắn</label>
              <input
                data-testid="input-short-min"
                type="number"
                min="1"
                max="60"
                value={settings.shortBreakMinutes}
                disabled={status !== 'idle'}
                onChange={(e) => updateSettings({ shortBreakMinutes: Number(e.target.value) || 1 })}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-center text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block mb-1 text-[11px]">Nghỉ dài</label>
              <input
                data-testid="input-long-min"
                type="number"
                min="1"
                max="60"
                value={settings.longBreakMinutes}
                disabled={status !== 'idle'}
                onChange={(e) => updateSettings({ longBreakMinutes: Number(e.target.value) || 1 })}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-center text-white focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:opacity-50"
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
