import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Target,
  Check,
  X,
  Shield,
  ShieldCheck,
  ChevronDown,
  AlertTriangle
} from 'lucide-react';
import { useTimerStore } from '../../../stores/useTimerStore';
import { useTaskStore } from '../../../stores/useTaskStore';
import { db } from '../../../db';
import { getVietnamTodayDateKey, VIETNAM_TIMEZONE } from '../../../utils/timezone';
import { TimerPhase } from '../../../types/timer';

export const STRICT_GRACE_PERIOD_MS = 5000;
const STRICT_MODE_STORAGE_KEY = 'pomofocus_strict_mode';

function getVietnamHourFromTimestamp(ts: number): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: VIETNAM_TIMEZONE,
      hour: 'numeric',
      hour12: false,
    }).formatToParts(new Date(ts));
    const hourStr = parts.find((p) => p.type === 'hour')?.value ?? '0';
    const parsed = parseInt(hourStr, 10);
    return Number.isNaN(parsed) ? 0 : parsed % 24;
  } catch {
    return new Date(ts + 7 * 60 * 60 * 1000).getUTCHours();
  }
}

export interface MobileFocusViewProps {
  className?: string;
  onSelectTask?: () => void;
  onManageTasks?: () => void;
}

/**
 * MobileFocusView (v8.0 All-in-One Focus Hub & Daily Flow)
 *
 * - Layer 1 (Top Bar): Phase Selector, Strict Mode 5s Grace Period Toggle & 1-Tap Quick Task Bar.
 * - Layer 2 (Center Focus Core): Monumental Numerals, Breathing Aura, Progress Bar, Cycle Dots & Thumb Controls.
 * - Layer 3 (Bottom Daily Flow Strip): 24h Vietnam focus timeline & today's completed pomodoro summary.
 */
export const MobileFocusView: React.FC<MobileFocusViewProps> = ({
  className = '',
  onSelectTask,
  onManageTasks,
}) => {
  const phase = useTimerStore((s) => s.phase);
  const status = useTimerStore((s) => s.status);
  const remainingMs = useTimerStore((s) => s.remainingMs);
  const currentRound = useTimerStore((s) => s.currentRound);
  const settings = useTimerStore((s) => s.settings);
  const linkedTaskTitle = useTimerStore((s) => s.linkedTaskTitle);
  const linkedTaskId = useTimerStore((s) => s.linkedTaskId);
  const dailyProgress = useTimerStore((s) => s.dailyProgress ?? 0);
  const todayFocusMinutes = useTimerStore((s) => s.todayFocusMinutes ?? 0);

  const start = useTimerStore((s) => s.start);
  const pause = useTimerStore((s) => s.pause);
  const resume = useTimerStore((s) => s.resume);
  const reset = useTimerStore((s) => s.reset);
  const resetCycle = useTimerStore((s) => s.resetCycle);
  const skip = useTimerStore((s) => s.skip);
  const setPhase = useTimerStore((s) => s.setPhase);

  const tasks = useTaskStore((s) => s.tasks) ?? [];
  const linkTaskToTimer = useTaskStore((s) => s.linkTaskToTimer);
  const toggleTaskComplete = useTaskStore((s) => s.toggleTaskComplete);

  const [isTaskPickerOpen, setIsTaskPickerOpen] = useState(false);
  const [isStrictMode, setIsStrictMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.localStorage.getItem(STRICT_MODE_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [strictViolationMsg, setStrictViolationMsg] = useState<string | null>(null);
  const [isJadeBursting, setIsJadeBursting] = useState(false);
  const [todayActiveHours, setTodayActiveHours] = useState<Set<number>>(() => new Set());
  const [dbTodaySummary, setDbTodaySummary] = useState<{ minutes: number; pomos: number; loaded: boolean }>({
    minutes: 0,
    pomos: 0,
    loaded: false,
  });

  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const burstTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const strictLeftAtRef = useRef<number | null>(null);
  const skipNextClickRef = useRef(false);

  const handleToggleStrictMode = () => {
    setIsStrictMode((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STRICT_MODE_STORAGE_KEY, String(next));
      } catch {}
      if (!next) {
        strictLeftAtRef.current = null;
      }
      setStrictViolationMsg(null);
      return next;
    });
  };

  // Forest-style Strict Mode: Soft-Penalty via Visibility Engine (5s Grace Period)
  useEffect(() => {
    if (!isStrictMode || status !== 'running' || phase !== 'pomodoro') {
      strictLeftAtRef.current = null;
    }

    const handleVisibilityChange = () => {
      const liveState = useTimerStore.getState();
      const shouldMonitor =
        isStrictMode && liveState.status === 'running' && liveState.phase === 'pomodoro';

      if (document.visibilityState === 'hidden') {
        if (shouldMonitor) {
          strictLeftAtRef.current = Date.now();
        }
        return;
      }

      if (document.visibilityState === 'visible' && strictLeftAtRef.current !== null) {
        const awayDurationMs = Date.now() - strictLeftAtRef.current;
        strictLeftAtRef.current = null;

        if (shouldMonitor && awayDurationMs > STRICT_GRACE_PERIOD_MS) {
          if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            try {
              navigator.vibrate([150, 80, 150, 80, 150]);
            } catch {}
          }
          reset();
          if (useTimerStore.getState().status !== 'idle') {
            useTimerStore.setState({ status: 'idle' });
          }
          setStrictViolationMsg(
            'Hiệp tập trung đã bị hủy vì rời ứng dụng quá 5 giây (Chế độ Kỷ luật).'
          );
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isStrictMode, status, phase, reset]);

  // Query Dexie focus_sessions for Daily Flow 24h timeline (Vietnam Timezone)
  useEffect(() => {
    let isMounted = true;
    const loadDailyFlow = async () => {
      try {
        const todayKey = getVietnamTodayDateKey();
        const sessions = await db.focus_sessions.where('dateString').equals(todayKey).toArray();
        if (!isMounted) return;

        const hours = new Set<number>();
        let mins = 0;
        let pomos = 0;
        for (const s of sessions) {
          if (s.phase === 'pomodoro') {
            pomos += 1;
            mins += Number(s.durationMinutes) || 0;
            hours.add(getVietnamHourFromTimestamp(s.completedAt));
          }
        }
        setTodayActiveHours(hours);
        setDbTodaySummary({ minutes: mins, pomos, loaded: true });
      } catch {
        if (isMounted) {
          setDbTodaySummary((prev) => ({ ...prev, loaded: false }));
        }
      }
    };

    loadDailyFlow();
    return () => {
      isMounted = false;
    };
  }, [dailyProgress, todayFocusMinutes, status]);

  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (burstTimerRef.current) clearTimeout(burstTimerRef.current);
    };
  }, []);

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

  const linkedTask = useMemo(() => {
    if (!linkedTaskId) return null;
    return tasks.find((t) => t.id === linkedTaskId) ?? null;
  }, [tasks, linkedTaskId]);

  const isLinkedTaskCompleted = linkedTask?.status === 'completed';

  const handleQuickCompleteTask = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!linkedTaskId) return;
    setIsJadeBursting(true);
    if (burstTimerRef.current) clearTimeout(burstTimerRef.current);
    burstTimerRef.current = setTimeout(() => setIsJadeBursting(false), 380);
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([10, 25, 16]);
      } catch {}
    }
    if (typeof toggleTaskComplete === 'function') {
      await toggleTaskComplete(linkedTaskId);
    }
  };

  const activeTodoTasks = useMemo(() => {
    return tasks.filter((t) => t.status !== 'completed' && t.status !== 'archived');
  }, [tasks]);

  const effectiveDailyMinutes =
    dbTodaySummary.pomos > 0
      ? Math.max(dbTodaySummary.minutes, todayFocusMinutes)
      : todayFocusMinutes;
  const effectiveCompletedPomos =
    dbTodaySummary.pomos > 0
      ? Math.max(dbTodaySummary.pomos, dailyProgress)
      : dailyProgress;
  const flowHours = Math.floor(effectiveDailyMinutes / 60);
  const flowMins = effectiveDailyMinutes % 60;
  const currentVnHour = getVietnamHourFromTimestamp(Date.now());

  return (
    <div
      data-testid="mobile-focus-view"
      className={`w-full h-full flex flex-col justify-between items-center py-3 sm:py-5 px-4 select-none relative overflow-hidden bg-transparent ${className}`}
    >
      {/* 1. LAYER 1 (TOP BAR): Phase Selector, Strict Mode & 1-Tap Quick Task Bar */}
      <div className="w-full flex flex-col items-center gap-2.5 z-20 shrink-0">
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
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] touch-manipulation cursor-pointer active:scale-95 ${
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
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] touch-manipulation cursor-pointer active:scale-95 ${
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
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] touch-manipulation cursor-pointer active:scale-95 ${
              phase === 'long_break'
                ? 'bg-gradient-to-r from-emerald-500/20 via-teal-400/20 to-cyan-400/20 text-emerald-400 border border-emerald-400/30 shadow-sm animate-spring-bounce'
                : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
            }`}
          >
            Nghỉ dài
          </button>
        </div>

        {/* 1-Tap Quick Task Bar + Strict Mode Pill Row */}
        <div className="w-full max-w-sm flex items-center justify-center gap-2 relative">
          {/* Quick Task Bar Capsule */}
          <div className="relative flex-1 max-w-xs">
            <div className="w-full h-10 px-2 bg-white/5 bg-zinc-900/65 border border-white/10 rounded-full flex items-center justify-between gap-1.5 shadow-sm backdrop-blur-md hover:border-emerald-500/30 transition-colors">
              {/* Left Quick Complete Circle */}
              {linkedTaskId && linkedTask ? (
                <button
                  type="button"
                  data-testid="mobile-quick-task-complete-btn"
                  onClick={handleQuickCompleteTask}
                  aria-label={isLinkedTaskCompleted ? 'Đánh dấu chưa hoàn thành' : 'Hoàn thành nhanh công việc'}
                  title={isLinkedTaskCompleted ? 'Đánh dấu chưa xong' : 'Xong ngay (1 chạm)'}
                  className={`w-6 h-6 min-w-[24px] rounded-full border flex items-center justify-center shrink-0 transition-all cursor-pointer touch-manipulation ${
                    isLinkedTaskCompleted || isJadeBursting
                      ? 'bg-emerald-500 border-emerald-400 text-zinc-950 animate-jade-burst'
                      : 'border-zinc-400/70 hover:border-emerald-400 text-transparent hover:text-emerald-400/60 bg-white/5'
                  }`}
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" aria-hidden="true" />
                </button>
              ) : (
                <span className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                  <Target className="w-3.5 h-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
                </span>
              )}

              {/* Center Task Selector Trigger */}
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
                className="flex-1 min-w-0 h-full inline-flex items-center justify-between gap-1.5 text-xs text-zinc-200 hover:text-white transition-colors cursor-pointer touch-manipulation px-1"
              >
                <span className={`truncate font-medium ${isLinkedTaskCompleted ? 'line-through text-zinc-400' : ''}`}>
                  {linkedTaskTitle || 'Chưa chọn công việc'}
                </span>
                <span className="inline-flex items-center gap-1 shrink-0">
                  {linkedTask && (
                    <span className="text-[11px] font-mono text-emerald-300 bg-emerald-500/15 px-1.5 py-0.5 rounded-full">
                      {linkedTask.completedPomodoros}/{linkedTask.estimatedPomodoros} 🍅
                    </span>
                  )}
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${
                      isTaskPickerOpen ? 'rotate-180' : ''
                    }`}
                    aria-hidden="true"
                  />
                </span>
              </button>
            </div>

            {/* Quick Task Picker Dropdown (Inline modal-less selector) */}
            {isTaskPickerOpen && (
              <div
                data-testid="mobile-task-picker-dropdown"
                className="absolute top-full mt-2 left-0 right-0 min-w-[260px] max-h-56 overflow-y-auto bg-zinc-950/95 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-2xl z-40 space-y-1"
              >
                <div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  <span>Chọn công việc</span>
                  <button
                    type="button"
                    onClick={() => setIsTaskPickerOpen(false)}
                    className="p-1 hover:text-white text-zinc-400 rounded-md cursor-pointer"
                    aria-label="Đóng bảng chọn"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {linkedTaskId && (
                  <button
                    type="button"
                    onClick={() => handleSelectTask(null)}
                    className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs text-rose-400 hover:bg-rose-500/10 flex items-center justify-between transition-colors cursor-pointer"
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
                      className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                        t.id === linkedTaskId
                          ? 'bg-emerald-500/20 text-emerald-300 font-medium'
                          : 'text-zinc-200 hover:bg-zinc-800/80'
                      }`}
                    >
                      <span className="truncate flex-1">{t.title}</span>
                      <span className="text-[10px] font-mono text-zinc-400 shrink-0">
                        {t.completedPomodoros}/{t.estimatedPomodoros} 🍅
                      </span>
                      {t.id === linkedTaskId && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                    </button>
                  ))
                )}

                {onManageTasks && (
                  <button
                    type="button"
                    data-testid="mobile-picker-manage-tasks-btn"
                    onClick={() => {
                      setIsTaskPickerOpen(false);
                      onManageTasks();
                    }}
                    className="w-full mt-1 pt-1.5 border-t border-white/10 text-center px-2.5 py-1.5 rounded-xl text-xs font-medium text-emerald-400 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                  >
                    Quản lý & thêm công việc →
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Strict Mode (Kỷ luật - Soft Penalty 5s Grace Period) Toggle */}
          <button
            type="button"
            data-testid="mobile-strict-mode-toggle"
            aria-pressed={isStrictMode}
            onClick={handleToggleStrictMode}
            title="Chế độ Kỷ luật: Rời app quá 5 giây sẽ hủy hiệp hiện tại"
            className={`h-10 px-2.5 rounded-full border backdrop-blur-md flex items-center gap-1 text-[11px] font-semibold shrink-0 transition-all cursor-pointer active:scale-95 touch-manipulation ${
              isStrictMode
                ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                : 'border-white/10 bg-zinc-900/65 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {isStrictMode ? (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
            ) : (
              <Shield className="w-3.5 h-3.5 text-zinc-400 shrink-0" aria-hidden="true" />
            )}
            <span>Kỷ luật</span>
          </button>
        </div>

        {/* Calm Inline Strict Violation Notice */}
        {strictViolationMsg && (
          <div
            data-testid="mobile-strict-violation-banner"
            className="w-full max-w-sm px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-400/30 backdrop-blur-md flex items-center justify-between gap-2 text-[11px] text-amber-200 shadow-md"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" aria-hidden="true" />
              <span className="truncate">{strictViolationMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setStrictViolationMsg(null)}
              aria-label="Đóng thông báo kỷ luật"
              className="text-amber-300 hover:text-white p-0.5 rounded shrink-0 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* 2. LAYER 2 (CENTER FOCUS CORE): Monumental Numerals, Progress & Thumb Actions */}
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center relative w-full z-10">
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
          <div className="text-xs uppercase font-medium tracking-widest text-zinc-200 drop-shadow-[0_1px_8px_rgba(0,0,0,0.9)] mt-1.5 flex items-center gap-1.5">
            <span>
              {status === 'running'
                ? phase === 'pomodoro'
                  ? 'Đang tập trung'
                  : 'Đang nghỉ ngơi'
                : status === 'paused'
                ? 'Tạm dừng'
                : 'Sẵn sàng'}
            </span>
            {isStrictMode && phase === 'pomodoro' && status === 'running' && (
              <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/20 border border-emerald-400/30 px-1.5 py-0.5 rounded-full normal-case tracking-normal">
                Kỷ luật 5s
              </span>
            )}
          </div>

          {/* 4px Thin Session Progress Bar */}
          <div
            data-testid="mobile-session-progress-bar"
            role="progressbar"
            aria-valuenow={Math.round(progressPercent)}
            aria-valuemin={0}
            aria-valuemax={100}
            className="w-48 sm:w-64 h-1 bg-zinc-800/80 rounded-full overflow-hidden mt-3.5 shadow-inner"
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
            className="flex items-center gap-2 mt-2.5"
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

        {/* Thumb-Zone Primary Controls */}
        <div className="w-full flex items-center justify-center gap-6 pt-5 pb-1 z-10">
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
            className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-full bg-zinc-800/80 backdrop-blur-md border border-white/10 text-zinc-200 active:scale-95 flex items-center justify-center hover:bg-zinc-700 hover:text-white transition-all touch-manipulation cursor-pointer shadow-md"
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
            className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-full bg-zinc-800/80 backdrop-blur-md border border-white/10 text-zinc-200 active:scale-95 flex items-center justify-center hover:bg-zinc-700 hover:text-white transition-all touch-manipulation cursor-pointer shadow-md"
          >
            <SkipForward className="w-5 h-5 stroke-[2.2]" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* 3. LAYER 3 (BOTTOM DAILY FLOW STRIP): 24h Vietnam Timeline + Daily Summary */}
      <div
        data-testid="mobile-daily-flow-strip"
        className="w-full max-w-sm rounded-2xl bg-zinc-900/70 backdrop-blur-md border border-white/10 px-3.5 py-2.5 shadow-md z-10 shrink-0"
      >
        <div className="flex items-center justify-between gap-2 text-[11px] mb-2">
          <span className="font-semibold text-zinc-300 tracking-tight">Dòng chảy hôm nay</span>
          <span
            data-testid="mobile-daily-flow-summary"
            className="font-mono text-emerald-300 font-medium"
          >
            Hôm nay: {flowHours}g {flowMins}ph • {effectiveCompletedPomos} 🍅 hoàn thành
          </span>
        </div>

        {/* 24-Hour Horizontal Strip */}
        <div
          data-testid="mobile-daily-flow-timeline"
          aria-label="Thanh tiến độ tập trung 24 giờ hôm nay"
          className="flex items-center gap-[2px] w-full"
        >
          {Array.from({ length: 24 }).map((_, hour) => {
            const hasSession = todayActiveHours.has(hour);
            const isCurrentHour = hour === currentVnHour;
            return (
              <div
                key={hour}
                data-testid={`mobile-flow-hour-${hour}`}
                data-active={hasSession ? 'true' : 'false'}
                title={`${hour.toString().padStart(2, '0')}:00`}
                className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                  hasSession
                    ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]'
                    : isCurrentHour
                    ? 'bg-zinc-600/90'
                    : 'bg-zinc-800/85'
                }`}
              />
            );
          })}
        </div>

        <div className="flex items-center justify-between text-[9px] font-mono text-zinc-400 mt-1">
          <span>00h</span>
          <span>06h</span>
          <span>12h</span>
          <span>18h</span>
          <span>23h</span>
        </div>
      </div>
    </div>
  );
};

export default MobileFocusView;
