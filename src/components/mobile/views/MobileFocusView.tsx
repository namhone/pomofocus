import React, { useMemo, useRef, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Target,
  Check,
  X
} from 'lucide-react';
import { useTimerStore } from '../../../stores/useTimerStore';
import { useTaskStore } from '../../../stores/useTaskStore';
import { TimerPhase } from '../../../types/timer';

export interface MobileFocusViewProps {
  className?: string;
  onSelectTask?: () => void;
}

/**
 * MobileFocusView (v7.0 Native Android Liquid Zen Architecture)
 *
 * - Zero-Modal Clean Entry: Opens directly into the focus canvas with 0 backdrops and 0 window frames.
 * - Monumental Pomodoro Numerals: font-tabular-nums text-6xl md:text-7xl font-bold tracking-tighter text-white.
 * - Breathing Aura: Jade/teal radial breathing aura around timer numerals during status === 'running' with GPU layer promotion.
 * - Phase Selector: Sliding segmented pill selector for pomodoro, short_break, and long_break.
 * - Thumb-Zone Primary Action: 64x64px high-contrast emerald gradient button flanked by 48x48dp reset and skip buttons.
 * - Progress Indicators: 4px thin session progress bar, cycle dots, and linked task chip.
 */
export const MobileFocusView: React.FC<MobileFocusViewProps> = ({
  className = '',
  onSelectTask,
}) => {
  const phase = useTimerStore((s) => s.phase);
  const status = useTimerStore((s) => s.status);
  const remainingMs = useTimerStore((s) => s.remainingMs);
  const currentRound = useTimerStore((s) => s.currentRound);
  const settings = useTimerStore((s) => s.settings);
  const linkedTaskTitle = useTimerStore((s) => s.linkedTaskTitle);
  const linkedTaskId = useTimerStore((s) => s.linkedTaskId);

  const start = useTimerStore((s) => s.start);
  const pause = useTimerStore((s) => s.pause);
  const resume = useTimerStore((s) => s.resume);
  const reset = useTimerStore((s) => s.reset);
  const resetCycle = useTimerStore((s) => s.resetCycle);
  const skip = useTimerStore((s) => s.skip);
  const setPhase = useTimerStore((s) => s.setPhase);

  const tasks = useTaskStore((s) => s.tasks);
  const linkTaskToTimer = useTaskStore((s) => s.linkTaskToTimer);

  const [isTaskPickerOpen, setIsTaskPickerOpen] = useState(false);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextClickRef = useRef(false);

  // Format MM:SS for monumental numerals
  const timeDisplay = useMemo(() => {
    const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [remainingMs]);

  // Session progress calculation
  const totalDurationMs = useMemo(() => {
    const minutes =
      phase === 'pomodoro'
        ? settings.pomodoroMinutes
        : phase === 'short_break'
        ? settings.shortBreakMinutes
        : settings.longBreakMinutes;
    return Math.max(1, minutes || 25) * 60 * 1000;
  }, [phase, settings.pomodoroMinutes, settings.shortBreakMinutes, settings.longBreakMinutes]);

  const progressPercent = useMemo(() => {
    if (totalDurationMs <= 0) return 0;
    const elapsed = totalDurationMs - remainingMs;
    const pct = (elapsed / totalDurationMs) * 100;
    return Math.min(100, Math.max(0, pct));
  }, [totalDurationMs, remainingMs]);

  // Total cycle rounds before long break (default: 4)
  const totalRounds = useMemo(() => {
    return Math.max(1, settings.roundsBeforeLongBreak || 4);
  }, [settings.roundsBeforeLongBreak]);

  // Handlers for Timer Actions
  const handleTogglePlay = () => {
    if (status === 'running') {
      pause();
      if (useTimerStore.getState().status !== 'paused') {
        useTimerStore.setState({ status: 'paused' });
      }
    } else if (status === 'paused') {
      resume();
      if (useTimerStore.getState().status !== 'running') {
        useTimerStore.setState({ status: 'running' });
      }
    } else {
      start();
      if (useTimerStore.getState().status !== 'running') {
        useTimerStore.setState({ status: 'running' });
      }
    }
  };

  const handleReset = () => {
    if (skipNextClickRef.current) {
      skipNextClickRef.current = false;
      return;
    }
    reset();
    if (useTimerStore.getState().status !== 'idle') {
      useTimerStore.setState({ status: 'idle' });
    }
  };

  const handleResetPointerDown = () => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    skipNextClickRef.current = false;
    holdTimerRef.current = setTimeout(() => {
      skipNextClickRef.current = true;
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate([12, 30, 12]);
        } catch {}
      }
      resetCycle();
    }, 1500);
  };

  const cancelResetHold = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  const handleSkip = () => {
    skip();
  };

  const handleSetPhase = (newPhase: TimerPhase) => {
    if (newPhase !== phase && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(10);
      } catch {}
    }
    setPhase(newPhase);
    if (useTimerStore.getState().phase !== newPhase) {
      const duration =
        newPhase === 'pomodoro'
          ? settings.pomodoroMinutes
          : newPhase === 'short_break'
          ? settings.shortBreakMinutes
          : settings.longBreakMinutes;
      useTimerStore.setState({
        phase: newPhase,
        remainingMs: duration * 60 * 1000,
      });
    }
  };

  const handleSelectTask = (taskId: string | null) => {
    linkTaskToTimer(taskId);
    setIsTaskPickerOpen(false);
  };

  const activeTodoTasks = useMemo(() => {
    return tasks.filter((t) => t.status !== 'completed' && t.status !== 'archived');
  }, [tasks]);

  return (
    <div
      data-testid="mobile-focus-view"
      className={`w-full h-full flex flex-col justify-between items-center py-6 px-4 select-none relative overflow-hidden bg-transparent ${className}`}
    >
      {/* 1. TOP SECTION: Phase Selector & Linked Task Chip */}
      <div className="w-full flex flex-col items-center gap-3 z-10">
        {/* Phase Segmented Pill Selector with Spring Physics */}
        <div
          role="tablist"
          aria-label="Chế độ tập trung"
          className="inline-flex items-center p-1 bg-zinc-900/80 backdrop-blur-md rounded-full border border-white/10 shadow-lg relative"
        >
          <button
            type="button"
            role="tab"
            aria-selected={phase === 'pomodoro'}
            data-testid="mobile-phase-pomodoro"
            onClick={() => handleSetPhase('pomodoro')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] touch-manipulation cursor-pointer active:scale-95 ${
              phase === 'pomodoro'
                ? 'bg-gradient-to-r from-emerald-500/20 via-teal-400/20 to-cyan-400/20 text-emerald-400 border border-emerald-400/30 shadow-sm animate-spring-bounce'
                : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
            }`}
          >
            Tập trung
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={phase === 'short_break'}
            data-testid="mobile-phase-short_break"
            onClick={() => handleSetPhase('short_break')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] touch-manipulation cursor-pointer active:scale-95 ${
              phase === 'short_break'
                ? 'bg-gradient-to-r from-emerald-500/20 via-teal-400/20 to-cyan-400/20 text-emerald-400 border border-emerald-400/30 shadow-sm animate-spring-bounce'
                : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
            }`}
          >
            Nghỉ ngắn
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={phase === 'long_break'}
            data-testid="mobile-phase-long_break"
            onClick={() => handleSetPhase('long_break')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] touch-manipulation cursor-pointer active:scale-95 ${
              phase === 'long_break'
                ? 'bg-gradient-to-r from-emerald-500/20 via-teal-400/20 to-cyan-400/20 text-emerald-400 border border-emerald-400/30 shadow-sm animate-spring-bounce'
                : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
            }`}
          >
            Nghỉ dài
          </button>
        </div>

        {/* Linked Task Chip */}
        <div className="relative">
          <button
            type="button"
            data-testid="mobile-linked-task-chip"
            onClick={() => {
              if (onSelectTask) {
                onSelectTask();
              } else {
                setIsTaskPickerOpen((prev) => !prev);
              }
            }}
            aria-label="Chọn công việc liên kết với đồng hồ"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900/70 backdrop-blur-md border border-white/10 text-xs text-zinc-300 hover:border-emerald-500/30 hover:text-white transition-all cursor-pointer max-w-[280px] shadow-sm touch-manipulation"
          >
            <Target className="w-3.5 h-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
            <span className="truncate">
              {linkedTaskTitle || 'Chưa chọn công việc'}
            </span>
          </button>

          {/* Quick Task Picker Sheet (Inline modal-less selector) */}
          {isTaskPickerOpen && (
            <div
              data-testid="mobile-task-picker-dropdown"
              className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-72 max-h-56 overflow-y-auto bg-zinc-950/95 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-2xl z-40 space-y-1"
            >
              <div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                <span>Chọn công việc</span>
                <button
                  type="button"
                  onClick={() => setIsTaskPickerOpen(false)}
                  className="p-1 hover:text-white text-zinc-400 rounded-md"
                  aria-label="Đóng bảng chọn"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {linkedTaskId && (
                <button
                  type="button"
                  onClick={() => handleSelectTask(null)}
                  className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs text-rose-400 hover:bg-rose-500/10 flex items-center justify-between transition-colors"
                >
                  <span>Hủy liên kết công việc</span>
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              {activeTodoTasks.length === 0 ? (
                <div className="px-3 py-3 text-center text-xs text-zinc-400">
                  Chưa có công việc đang chờ. Hãy thêm trong tab Công việc!
                </div>
              ) : (
                activeTodoTasks.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleSelectTask(t.id)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between transition-colors ${
                      t.id === linkedTaskId
                        ? 'bg-emerald-500/20 text-emerald-300 font-medium'
                        : 'text-zinc-200 hover:bg-zinc-800/80'
                    }`}
                  >
                    <span className="truncate mr-2">{t.title}</span>
                    {t.id === linkedTaskId && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* 2. CENTER SECTION: Monumental Numerals & Breathing Aura */}
      <div className="flex-1 flex flex-col items-center justify-center relative my-4 w-full">
        <div className="relative flex flex-col items-center justify-center drop-shadow-[0_4px_16px_rgba(0,0,0,0.85)]">
          {/* Breathing Aura: jade/teal radial breathing aura around timer during status === 'running' */}
          {status === 'running' && (
            <div
              data-testid="mobile-breathing-aura"
              className="absolute -inset-10 sm:-inset-16 rounded-full animate-pulse bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-500/20 via-teal-400/10 to-transparent blur-3xl pointer-events-none -z-10"
              style={{ transform: 'translateZ(0)' }}
              aria-hidden="true"
            />
          )}

          {/* Monumental Pomodoro Numerals */}
          <div
            data-testid="mobile-monumental-timer"
            aria-live="polite"
            style={{ textShadow: '0 4px 20px rgba(0,0,0,0.88)' }}
            className="font-tabular-nums tabular-nums text-6xl md:text-7xl font-bold tracking-tighter text-white drop-shadow-[0_4px_30px_rgba(52,211,153,0.25)] select-none text-center"
          >
            {timeDisplay}
          </div>

          {/* Status Label */}
          <div className="text-xs uppercase font-medium tracking-widest text-zinc-200 drop-shadow-[0_1px_8px_rgba(0,0,0,0.9)] mt-2">
            {status === 'running'
              ? phase === 'pomodoro'
                ? 'Đang tập trung'
                : 'Đang nghỉ ngơi'
              : status === 'paused'
              ? 'Tạm dừng'
              : 'Sẵn sàng'}
          </div>

          {/* 4px Thin Session Progress Bar */}
          <div
            data-testid="mobile-session-progress-bar"
            role="progressbar"
            aria-valuenow={Math.round(progressPercent)}
            aria-valuemin={0}
            aria-valuemax={100}
            className="w-48 sm:w-64 h-1 bg-zinc-800/80 rounded-full overflow-hidden mt-5 shadow-inner"
          >
            <div
              className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Completed Cycle Dots */}
          <div
            data-testid="mobile-cycle-dots"
            aria-label={`Hiệp ${currentRound} trên ${totalRounds}`}
            className="flex items-center gap-2 mt-3.5"
          >
            {Array.from({ length: totalRounds }).map((_, idx) => {
              const roundNum = idx + 1;
              const isPast = roundNum < currentRound;
              const isCurrent = roundNum === currentRound;

              return (
                <span
                  key={idx}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    isPast
                      ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]'
                      : isCurrent
                      ? 'bg-emerald-400/90 ring-2 ring-emerald-400/30'
                      : 'bg-zinc-800'
                  }`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. BOTTOM SECTION: Thumb-Zone Primary Actions */}
      <div className="w-full flex items-center justify-center gap-6 pb-6 pt-2 z-10">
        {/* Secondary: Reset (↺) - 48x48dp minimum */}
        <button
          type="button"
          data-testid="mobile-timer-reset"
          onClick={handleReset}
          onPointerDown={handleResetPointerDown}
          onPointerUp={cancelResetHold}
          onPointerLeave={cancelResetHold}
          onPointerCancel={cancelResetHold}
          title="Đặt lại hiệp này (giữ 1.5s để làm lại từ đầu)"
          aria-label="Đặt lại hiệp này"
          className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-full bg-zinc-800/80 border border-white/10 text-zinc-200 active:scale-95 flex items-center justify-center hover:bg-zinc-700 hover:text-white transition-all touch-manipulation cursor-pointer shadow-md"
        >
          <RotateCcw className="w-5 h-5 stroke-[2.2]" aria-hidden="true" />
        </button>

        {/* Primary Action: Play / Pause - 64x64px touch target */}
        <button
          type="button"
          data-testid="mobile-timer-main-action"
          onClick={handleTogglePlay}
          aria-label={status === 'running' ? 'Tạm dừng đồng hồ' : 'Bắt đầu đếm giờ'}
          className="w-16 h-16 min-w-[64px] min-h-[64px] rounded-full flex items-center justify-center bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 text-zinc-950 font-bold shadow-lg shadow-emerald-500/25 active:scale-95 transition-all touch-manipulation cursor-pointer"
        >
          {status === 'running' ? (
            <Pause className="w-7 h-7 fill-current stroke-current" aria-hidden="true" />
          ) : (
            <Play className="w-7 h-7 fill-current stroke-current ml-1" aria-hidden="true" />
          )}
        </button>

        {/* Secondary: Skip (⏭) - 48x48dp minimum */}
        <button
          type="button"
          data-testid="mobile-timer-skip"
          onClick={handleSkip}
          title="Bỏ qua hiệp này"
          aria-label="Bỏ qua hiệp này"
          className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-full bg-zinc-800/80 border border-white/10 text-zinc-200 active:scale-95 flex items-center justify-center hover:bg-zinc-700 hover:text-white transition-all touch-manipulation cursor-pointer shadow-md"
        >
          <SkipForward className="w-5 h-5 stroke-[2.2]" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};

export default MobileFocusView;
