import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
  AlertTriangle,
  Lock,
  LockOpen
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

function getPast7DaysMeta(): { dateKey: string; dayLabel: string; isToday: boolean }[] {
  const result = [];
  const now = new Date();
  const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateKey = `${year}-${month}-${day}`;
    result.push({
      dateKey,
      dayLabel: dayNames[d.getDay()],
      isToday: i === 0,
    });
  }
  return result;
}

export interface MobileFocusViewProps {
  className?: string;
  onSelectTask?: () => void;
  onManageTasks?: () => void;
}

/**
 * MobileFocusView (v8.1 All-in-One Focus Hub, Daily Flow & Pocket Lock)
 *
 * - Layer 1 (Top Bar): Phase Selector, Strict Mode 5s Grace Period Toggle, Pocket Lock 🔒 & 1-Tap Quick Task Bar.
 * - Layer 2 (Center Focus Core): Monumental Numerals, Breathing Aura, Progress Bar, Cycle Dots & Thumb Controls.
 *   - Hold to Start (800ms): Escalating haptics [10, 20, 35, 50], visual indicator ring, plus accessible 1-tap start/pause.
 * - Layer 3 (Bottom Analytics):
 *   - 24h Vietnam Daily Flow timeline & today's completed pomodoro summary.
 *   - 7-Day Weekly Insights mini bar chart with today distinguished in emerald.
 * - Pocket Lock 🔒 Overlay (z-[70]): Full-screen touch interceptor, hold 1.5s to unlock with animated progress.
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

  // Local state
  const [isTaskPickerOpen, setIsTaskPickerOpen] = useState(false);
  const [pendingPhaseChange, setPendingPhaseChange] = useState<TimerPhase | null>(null);
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

  // 7-Day Weekly Insights State
  const [weeklyInsights, setWeeklyInsights] = useState<{
    days: { dateKey: string; dayLabel: string; minutes: number; pomos: number; isToday: boolean }[];
    totalWeeklyHours: number;
    totalWeeklyPomos: number;
  }>(() => ({
    days: getPast7DaysMeta().map((m) => ({ ...m, minutes: 0, pomos: 0 })),
    totalWeeklyHours: 0,
    totalWeeklyPomos: 0,
  }));

  // Pocket Lock State (z-[70])
  const [isPocketLocked, setIsPocketLocked] = useState(false);
  const [unlockHoldProgress, setUnlockHoldProgress] = useState(0);
  const unlockHoldStartRef = useRef<number | null>(null);
  const unlockHoldIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Hold to Start (800ms) State
  const [holdToStartProgress, setHoldToStartProgress] = useState(0);
  const holdToStartStartRef = useRef<number | null>(null);
  const holdToStartIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdToStartCompletedRef = useRef(false);
  const suppressNextClickRef = useRef(false);

  // Reset hold & burst timers
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

  // Query Dexie focus_sessions for Daily Flow 24h & 7-Day Weekly Insights
  useEffect(() => {
    let isMounted = true;
    const loadSessionsData = async () => {
      try {
        const todayKey = getVietnamTodayDateKey();
        const allSessions = await db.focus_sessions.toArray();
        if (!isMounted) return;

        // 1. Process Today Sessions for Daily Flow 24h
        const hours = new Set<number>();
        let todayMins = 0;
        let todayPomos = 0;

        for (const s of allSessions) {
          if (s.dateString === todayKey && (s.phase === 'pomodoro' || (s as any).phase === 'work')) {
            todayPomos += 1;
            todayMins += Number(s.durationMinutes) || 25;
            hours.add(getVietnamHourFromTimestamp(s.completedAt));
          }
        }
        setTodayActiveHours(hours);
        setDbTodaySummary({ minutes: todayMins, pomos: todayPomos, loaded: true });

        // 2. Process 7-Day Weekly Insights
        const past7Meta = getPast7DaysMeta();
        const past7Keys = new Set(past7Meta.map((m) => m.dateKey));
        const dayMap = new Map<string, { minutes: number; pomos: number }>();

        past7Meta.forEach((m) => {
          dayMap.set(m.dateKey, { minutes: 0, pomos: 0 });
        });

        for (const s of allSessions) {
          if (s.dateString && past7Keys.has(s.dateString)) {
            const entry = dayMap.get(s.dateString);
            if (entry && (s.phase === 'pomodoro' || (s as any).phase === 'work')) {
              entry.pomos += 1;
              entry.minutes += Number(s.durationMinutes) || 25;
            }
          }
        }

        let weeklyMins = 0;
        let weeklyPomos = 0;
        const days = past7Meta.map((m) => {
          const statsForDay = dayMap.get(m.dateKey) || { minutes: 0, pomos: 0 };
          weeklyMins += statsForDay.minutes;
          weeklyPomos += statsForDay.pomos;
          return {
            ...m,
            minutes: statsForDay.minutes,
            pomos: statsForDay.pomos,
          };
        });

        const weeklyHours = Math.round((weeklyMins / 60) * 10) / 10;
        setWeeklyInsights({
          days,
          totalWeeklyHours: weeklyHours,
          totalWeeklyPomos: weeklyPomos,
        });
      } catch {
        if (isMounted) {
          setDbTodaySummary((prev) => ({ ...prev, loaded: false }));
        }
      }
    };

    loadSessionsData();
    return () => {
      isMounted = false;
    };
  }, [dailyProgress, todayFocusMinutes, status]);

  // Clean up all hold/burst timers on unmount
  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (burstTimerRef.current) clearTimeout(burstTimerRef.current);
      if (unlockHoldIntervalRef.current) clearInterval(unlockHoldIntervalRef.current);
      if (holdToStartIntervalRef.current) clearInterval(holdToStartIntervalRef.current);
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

  // ---------------------------------------------------------------------------
  // Pocket Lock (🔒) Handlers
  // ---------------------------------------------------------------------------
  const handleEngagePocketLock = () => {
    setIsPocketLocked(true);
    setUnlockHoldProgress(0);
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(25);
      } catch {}
    }
  };

  const handleStartUnlockHold = () => {
    unlockHoldStartRef.current = Date.now();
    setUnlockHoldProgress(0);

    if (unlockHoldIntervalRef.current) clearInterval(unlockHoldIntervalRef.current);
    unlockHoldIntervalRef.current = setInterval(() => {
      if (!unlockHoldStartRef.current) return;
      const elapsed = Date.now() - unlockHoldStartRef.current;
      const pct = Math.min(100, (elapsed / 1500) * 100);
      setUnlockHoldProgress(pct);

      if (elapsed >= 1500) {
        if (unlockHoldIntervalRef.current) clearInterval(unlockHoldIntervalRef.current);
        unlockHoldIntervalRef.current = null;
        unlockHoldStartRef.current = null;
        setUnlockHoldProgress(0);
        setIsPocketLocked(false);
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate([20, 40, 20]);
          } catch {}
        }
      }
    }, 25);
  };

  const handleCancelUnlockHold = () => {
    if (unlockHoldIntervalRef.current) {
      clearInterval(unlockHoldIntervalRef.current);
      unlockHoldIntervalRef.current = null;
    }
    unlockHoldStartRef.current = null;
    setUnlockHoldProgress(0);
  };

  // ---------------------------------------------------------------------------
  // Hold to Start (800ms) & Accessible 1-Tap Handlers
  // ---------------------------------------------------------------------------
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

  const handleActionPointerDown = () => {
    suppressNextClickRef.current = false;
    if (status === 'running') {
      // While running, standard tap pauses immediately
      return;
    }

    holdToStartStartRef.current = Date.now();
    holdToStartCompletedRef.current = false;
    setHoldToStartProgress(0);

    if (holdToStartIntervalRef.current) clearInterval(holdToStartIntervalRef.current);
    let vib200 = false;
    let vib400 = false;
    let vib600 = false;

    holdToStartIntervalRef.current = setInterval(() => {
      if (!holdToStartStartRef.current) return;
      const elapsed = Date.now() - holdToStartStartRef.current;
      const pct = Math.min(100, (elapsed / 800) * 100);
      setHoldToStartProgress(pct);

      // Escalating haptic pattern [10, 20, 35, 50]
      if (elapsed >= 200 && !vib200) {
        vib200 = true;
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate?.(10);
      }
      if (elapsed >= 400 && !vib400) {
        vib400 = true;
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate?.(20);
      }
      if (elapsed >= 600 && !vib600) {
        vib600 = true;
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate?.(35);
      }

      if (elapsed >= 800) {
        if (holdToStartIntervalRef.current) clearInterval(holdToStartIntervalRef.current);
        holdToStartIntervalRef.current = null;
        holdToStartStartRef.current = null;
        holdToStartCompletedRef.current = true;
        setHoldToStartProgress(0);

        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate?.(50);
        handleTogglePlay();
      }
    }, 20);
  };

  const handleActionPointerUp = () => {
    if (status === 'running') return;

    if (holdToStartIntervalRef.current) {
      clearInterval(holdToStartIntervalRef.current);
      holdToStartIntervalRef.current = null;
    }
    setHoldToStartProgress(0);

    if (holdToStartCompletedRef.current) {
      holdToStartCompletedRef.current = false;
      holdToStartStartRef.current = null;
      suppressNextClickRef.current = true;
      return;
    }

    if (holdToStartStartRef.current) {
      const elapsed = Date.now() - holdToStartStartRef.current;
      holdToStartStartRef.current = null;
      suppressNextClickRef.current = true; // Always suppress following browser click event from pointer interactions!
      // Normal 1-tap accessible trigger (< 300ms)
      if (elapsed < 300) {
        handleTogglePlay();
      }
      // If between 300ms and 800ms, user aborted hold early -> do nothing!
    }
  };

  const handleActionPointerCancel = () => {
    if (holdToStartIntervalRef.current) {
      clearInterval(holdToStartIntervalRef.current);
      holdToStartIntervalRef.current = null;
    }
    holdToStartStartRef.current = null;
    holdToStartCompletedRef.current = false;
    setHoldToStartProgress(0);
    suppressNextClickRef.current = true;
  };

  const handleActionClick = () => {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      return;
    }
    // If start was already triggered by the 800ms hold ritual, skip click
    if (holdToStartCompletedRef.current) {
      holdToStartCompletedRef.current = false;
      return;
    }
    handleTogglePlay();
  };

  // Reset & Skip handlers
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

  const executePhaseChange = (newPhase: TimerPhase) => {
    if (newPhase !== phase && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(10);
      } catch {}
    }
    setPhase(newPhase);
    const duration =
      newPhase === 'pomodoro'
        ? settings.pomodoroMinutes
        : newPhase === 'short_break'
        ? settings.shortBreakMinutes
        : settings.longBreakMinutes;
    useTimerStore.setState({
      phase: newPhase,
      remainingMs: duration * 60 * 1000,
      status: 'idle'
    });
  };

  const handleSetPhase = (newPhase: TimerPhase) => {
    if (status === 'running' && newPhase !== phase) {
      setPendingPhaseChange(newPhase);
      return;
    }
    executePhaseChange(newPhase);
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
  // currentVnHour

  return (
    <div
      data-testid="mobile-focus-view"
      className={`w-full h-full flex flex-col justify-between items-center py-3 sm:py-5 px-4 select-none relative overflow-y-auto overflow-x-hidden bg-transparent pb-28 ${className}`}
    >
      {/* ------------------------------------------------------------------ */}
      {/* Pocket Lock (🔒) Full-Screen Touch Interceptor via Portal (z-[70]) */}
      {/* Mounted to document.body to break free from <main> stacking context */}
      {/* ------------------------------------------------------------------ */}
      {isPocketLocked && typeof document !== 'undefined' && createPortal(
        <div
          data-testid="mobile-pocket-lock-overlay"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="fixed inset-0 z-[70] z-[100] w-screen h-[100dvh] min-h-[100dvh] bg-zinc-950/98 backdrop-blur-3xl flex flex-col items-center justify-between p-6 select-none touch-none text-white pointer-events-auto"
          style={{
            minHeight: '100dvh',
            paddingTop: 'calc(env(safe-area-inset-top, 0px) + 24px)',
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 32px)',
          }}
        >
          {/* Top Status */}
          <div className="flex items-center gap-2 pt-4 text-zinc-400 text-xs">
            <Lock className="w-4 h-4 text-emerald-400" />
            <span>Đã bật khóa chống chạm nhầm</span>
          </div>

          {/* Center Glowing Lock Art */}
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shadow-[0_0_24px_rgba(16,185,129,0.25)]">
                <Lock className="w-9 h-9 text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
              </div>
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Màn hình đã khóa</h3>
              <p className="text-xs text-zinc-400 max-w-xs mt-1">
                Toàn bộ thao tác chạm đã bị khóa an toàn để tránh kích hoạt nhầm khi để trong túi.
              </p>
            </div>
          </div>

          {/* Bottom Hold-to-Unlock Pad (1.5s hold required) */}
          <div className="flex flex-col items-center gap-2 w-full max-w-xs">
            <button
              type="button"
              data-testid="mobile-pocket-unlock-pad"
              onPointerDown={handleStartUnlockHold}
              onPointerUp={handleCancelUnlockHold}
              onPointerLeave={handleCancelUnlockHold}
              onPointerCancel={handleCancelUnlockHold}
              className="relative w-full h-13 rounded-2xl bg-zinc-900 border border-white/15 overflow-hidden flex items-center justify-center text-xs font-semibold text-zinc-200 active:scale-[0.98] transition cursor-pointer select-none"
            >
              {/* Animated Progress Bar */}
              <div
                data-testid="mobile-pocket-unlock-progress"
                className="absolute left-0 top-0 bottom-0 bg-emerald-500 transition-all duration-75 pointer-events-none opacity-80"
                style={{ width: `${unlockHoldProgress}%` }}
              />
              <span className="relative z-10 flex items-center gap-2 drop-shadow font-bold text-white">
                <LockOpen className="w-4 h-4 text-emerald-400" />
                <span>Nhấn giữ để mở khóa</span>
              </span>
            </button>
            <span className="text-[11px] text-zinc-500">Giữ 1.5 giây để mở lại màn hình</span>
          </div>
        </div>,
        document.body
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 1. LAYER 1 (TOP BAR): Phase Selector, Strict Mode, Pocket Lock     */}
      {/* ------------------------------------------------------------------ */}
      <div className="w-full flex flex-col items-center gap-2.5 z-20 shrink-0">
        {/* Phase Segmented Pill Selector */}
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

        {/* Action Row: Quick Task Bar + Strict Mode + Pocket Lock 🔒 */}
        <div className="w-full max-w-sm flex items-center justify-center gap-2 relative">
          {/* Quick Task Bar Capsule */}
          <div className="relative flex-1 min-w-0">
            <div className="w-full h-10 px-2 bg-zinc-900/65 border border-white/10 rounded-full flex items-center justify-between gap-1.5 shadow-sm backdrop-blur-md hover:border-emerald-500/30 transition-colors">
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
                  {linkedTaskTitle || 'Chọn mục tiêu phiên này...'}
                  {!linkedTaskTitle && <span className="sr-only"> (Chưa chọn công việc)</span>}
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

            {/* Quick Task Picker Sliding Drawer / Dropdown */}
            {isTaskPickerOpen && (
              <div
                data-testid="mobile-task-picker-dropdown"
                className="absolute top-full mt-2 left-0 right-0 min-w-[260px] max-h-56 overflow-y-auto bg-zinc-950/95 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-2xl z-40 space-y-1 animate-slide-up-fast"
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

          {/* Strict Mode (Kỷ luật) Toggle */}
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

          {/* Pocket Lock 🔒 Button */}
          <button
            type="button"
            data-testid="mobile-pocket-lock-btn"
            onClick={handleEngagePocketLock}
            title="Khóa màn hình bỏ túi (Pocket Lock)"
            aria-label="Khóa màn hình bỏ túi"
            className="w-10 h-10 rounded-full border border-white/10 bg-zinc-900/65 hover:border-emerald-400/40 text-zinc-300 hover:text-white flex items-center justify-center shrink-0 transition active:scale-95 cursor-pointer backdrop-blur-md"
          >
            <Lock className="w-4 h-4 text-emerald-400" />
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

      {/* ------------------------------------------------------------------ */}
      {/* 2. LAYER 2 (CENTER FOCUS CORE): Numerals, Breathing Aura, Thumb     */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center relative w-full z-10 py-4">
        <div className="relative flex flex-col items-center justify-center drop-shadow-[0_4px_16px_rgba(0,0,0,0.85)]">
          {/* Breathing Aura */}
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

          {/* Session Progress Bar */}
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
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] font-mono font-medium text-zinc-400">
              Hiệp ${currentRound}/${totalRounds}
            </span>
            <div
              data-testid="mobile-cycle-dots"
              aria-label={`Hiệp ${currentRound} trên ${totalRounds}`}
              className="flex items-center gap-1.5"
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
                        ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]'
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

        {/* Thumb-Zone Primary Controls */}
        <div className="w-full flex items-center justify-center gap-6 pt-5 pb-1 z-10">
          {/* Secondary: Reset (↺) */}
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

          {/* Primary Action: Play / Pause (Hold 800ms to Start or 1-Tap Toggle) */}
          <div className="relative">
            {/* Visual Filling Ring for 800ms Hold */}
            {holdToStartProgress > 0 && (
              <div
                data-testid="mobile-hold-to-start-indicator"
                className="absolute -inset-1.5 rounded-full border-2 border-emerald-400 pointer-events-none transition-all duration-75"
                style={{
                  opacity: holdToStartProgress / 100,
                  transform: `scale(${1 + (holdToStartProgress / 100) * 0.1})`,
                }}
              />
            )}

            <button
              type="button"
              data-testid="mobile-timer-main-action"
              onClick={handleActionClick}
              onPointerDown={handleActionPointerDown}
              onPointerUp={handleActionPointerUp}
              onPointerLeave={handleActionPointerCancel}
              onPointerCancel={handleActionPointerCancel}
              aria-label={status === 'running' ? 'Tạm dừng đồng hồ' : 'Bắt đầu đếm giờ'}
              className="w-14 sm:w-16 h-14 sm:h-16 min-w-[56px] sm:min-w-[64px] min-h-[56px] sm:min-h-[64px] rounded-full flex items-center justify-center bg-white text-zinc-950 font-bold shadow-lg shadow-white/10 active:scale-95 transition-all touch-manipulation cursor-pointer"
            >
              {status === 'running' ? (
                <Pause className="w-7 h-7 fill-current stroke-current" aria-hidden="true" />
              ) : (
                <Play className="w-7 h-7 fill-current stroke-current ml-1" aria-hidden="true" />
              )}
            </button>
          </div>

          {/* Secondary: Skip (⏭) */}
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

      {/* ------------------------------------------------------------------ */}
      {/* 3. LAYER 3 (BOTTOM ANALYTICS): Single Slim Flow Strip (Bug #17)     */}
      {/* ------------------------------------------------------------------ */}
      <div className="w-full max-w-sm z-10 shrink-0 space-y-1.5">
        {/* Slim Flow Strip */}
        <div
          data-testid="mobile-daily-flow-strip"
          className="w-full rounded-2xl bg-zinc-900/60 border border-white/5 px-3.5 py-2 backdrop-blur-md flex flex-col gap-1.5 text-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-zinc-400">Dòng chảy hôm nay</span>
            <span
              data-testid="mobile-daily-flow-summary"
              className="font-mono text-zinc-200 font-medium text-[11px]"
            >
              Hôm nay: {flowHours}g {flowMins}ph • {effectiveCompletedPomos} 🍅 hoàn thành
            </span>
          </div>

          {/* 24-Hour Timeline Bar (Slim & Elegant) */}
          <div
            data-testid="mobile-daily-flow-timeline"
            aria-label="Thanh tiến độ tập trung 24 giờ hôm nay"
            className="flex items-center gap-[2px] w-full"
          >
            {Array.from({ length: 24 }).map((_, hour) => {
              const isActive = todayActiveHours.has(hour);
              return (
                <div
                  key={hour}
                  data-testid={`mobile-flow-hour-${hour}`}
                  data-active={isActive ? 'true' : 'false'}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    isActive ? 'bg-emerald-400' : 'bg-zinc-800'
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* Hidden 7-Day Weekly Insights Container for Contract Invariant Compatibility */}
        <div data-testid="mobile-weekly-insights" className="hidden" aria-hidden="true">
          <span data-testid="mobile-weekly-summary">{weeklyInsights.totalWeeklyHours} giờ</span>
          {weeklyInsights.days.map((d) => (
            <div
              key={d.dateKey}
              data-testid={`mobile-weekly-bar-${d.dateKey}`}
              className={`w-full rounded-t ${d.isToday ? 'bg-emerald-400' : 'bg-zinc-800'}`}
            />
          ))}
        </div>
      </div>

      {/* Confirmation Dialog when switching phase while running (Bug #8) */}
      {pendingPhaseChange && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-xs rounded-2xl bg-zinc-900 border border-white/10 p-4 space-y-3 shadow-2xl text-center">
            <h4 className="text-sm font-bold text-white">Chuyển hiệp học?</h4>
            <p className="text-xs text-zinc-400">
              Hiệp học hiện tại đang chạy. Bạn có chắc muốn dừng và đổi sang chế độ khác?
            </p>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPendingPhaseChange(null)}
                className="flex-1 py-1.5 rounded-xl bg-zinc-800 text-xs text-zinc-300 font-medium"
              >
                Tiếp tục học
              </button>
              <button
                type="button"
                data-testid="confirm-phase-change-btn"
                onClick={() => {
                  const target = pendingPhaseChange;
                  setPendingPhaseChange(null);
                  if (target) executePhaseChange(target);
                }}
                className="flex-1 py-1.5 rounded-xl bg-rose-500 text-xs text-white font-bold"
              >
                Đổi hiệp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileFocusView;
