import React, { useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, RefreshCw, SkipForward, Bell, Target, Sparkles } from 'lucide-react';
import { useTimerStore } from '../stores/useTimerStore';
import { TimerPhase } from '../types/timer';
import { haptics } from '../utils/haptics';
import { soundEffects } from '../services/soundEffects';
import { useAiStore } from '../stores/useAiStore';
import { useLayoutStore } from '../stores/useLayoutStore';

function formatTime(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export interface TimerWidgetProps {
  isEmbeddedInZen?: boolean;
}

export const TimerWidget: React.FC<TimerWidgetProps> = ({
  isEmbeddedInZen = false
}) => {
  const isEcoMode = useLayoutStore(state => state.isEcoMode);
  const aiOpen = useAiStore(state => state.isOpen);
  const phase = useTimerStore((state) => state.phase);
  const status = useTimerStore((state) => state.status);
  const currentRound = useTimerStore((state) => state.currentRound);
  const remainingMs = useTimerStore((state) => state.remainingMs);
  const settings = useTimerStore((state) => state.settings);
  const isLeader = useTimerStore((state) => state.isLeader);
  const linkedTaskTitle = useTimerStore((state) => state.linkedTaskTitle);
  const dailyProgress = useTimerStore((state) => state.dailyProgress);
  const celebrationToast = useTimerStore((state) => state.celebrationToast);
  const start = useTimerStore((state) => state.start);
  const pause = useTimerStore((state) => state.pause);
  const resume = useTimerStore((state) => state.resume);
  const reset = useTimerStore((state) => state.reset);
  const resetCycle = useTimerStore((state) => state.resetCycle);
  const setPhase = useTimerStore((state) => state.setPhase);
  const setCelebrationToast = useTimerStore((state) => state.setCelebrationToast);
  const skip = useTimerStore((state) => state.skip);
  const setLinkedTask = useTimerStore((state) => state.setLinkedTask);
  const updateSettings = useTimerStore((state) => state.updateSettings);
  const requestNotificationPermission = useTimerStore((state) => state.requestNotificationPermission);
  const init = useTimerStore((state) => state.init);

  useEffect(() => {
    init();
  }, [init]);

  const prevRemainingRef = useRef(remainingMs);
  const prevPhaseRef = useRef(phase);

  useEffect(() => {
    if (prevPhaseRef.current !== phase) {
      prevPhaseRef.current = phase;
      haptics.phaseChange();
    }
  }, [phase]);

  useEffect(() => {
    if (prevRemainingRef.current > 0 && remainingMs === 0 && status === 'idle') {
      haptics.timerComplete();
    }
    prevRemainingRef.current = remainingMs;
  }, [remainingMs, status]);

  const getPhaseStyles = (p: TimerPhase) => {
    switch (p) {
      case 'pomodoro':
        return {
          bg: 'bg-white/[0.02] border-white/[0.08] text-white shadow-inner',
          activeTab: 'bg-gradient-to-b from-white/[0.14] to-white/[0.07] border border-white/10 border-t-white/20 text-white shadow-sm',
          label: 'Tập trung'
        };
      case 'short_break':
        return {
          bg: 'bg-white/[0.02] border-white/[0.08] text-white shadow-inner',
          activeTab: 'bg-gradient-to-b from-white/[0.14] to-white/[0.07] border border-white/10 border-t-white/20 text-white shadow-sm',
          label: 'Nghỉ ngắn'
        };
      case 'long_break':
        return {
          bg: 'bg-white/[0.02] border-white/[0.08] text-white shadow-inner',
          activeTab: 'bg-gradient-to-b from-white/[0.14] to-white/[0.07] border border-white/10 border-t-white/20 text-white shadow-sm',
          label: 'Nghỉ dài'
        };
    }
  };

  const currentPhaseStyle = getPhaseStyles(phase);

  return (
    <div className={`liquid-glass-screen ${isEcoMode ? 'liquid-eco' : ''} flex w-full h-auto min-h-fit overflow-visible flex-col justify-between items-center select-none ${isEmbeddedInZen ? 'max-w-md' : 'max-w-full'}`}>
      <span role="status" aria-live="polite" aria-atomic="true" className="sr-only" data-testid="timer-phase-announcement">
        {currentPhaseStyle.label}. Hiệp {currentRound} / {settings.roundsBeforeLongBreak}. {status === 'running' ? 'Đang chạy' : status === 'paused' ? 'Tạm dừng' : 'Chờ bắt đầu'}
      </span>
      <div className={isEmbeddedInZen ? 'w-full rounded-[20px] border-t border-t-white/[0.24] border-x border-x-white/[0.10] border-b border-b-white/[0.05] bg-[rgba(12,15,22,0.45)] p-6 shadow-2xl backdrop-blur-2xl backdrop-saturate-[180%]' : 'w-full flex flex-col justify-between h-auto min-h-fit overflow-visible'}>
        {/* Header Indicators */}
        <div className="flex items-center justify-between text-xs text-neutral-300 mb-2 select-none">
          <div className="flex items-center gap-1.5">
            <span data-testid="leader-indicator" className="sr-only">{isLeader ? 'Leader Tab' : 'Follower Tab'}</span>
            <span
              data-testid="round-indicator"
              className="rounded-full bg-white/[0.06] border border-white/10 border-t-white/20 px-2 py-0.5 text-[10px] font-medium text-white min-h-[24px] inline-flex items-center"
            >
              Hiệp {currentRound} / {settings.roundsBeforeLongBreak}
            </span>
          </div>

          <span
            data-testid="status-indicator"
            className="font-medium text-[10px] text-neutral-300"
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
              <Target size={13} className="text-zinc-300 shrink-0" />
              <span className="font-medium truncate text-[11px]">Đang làm: {linkedTaskTitle}</span>
            </div>
            <button
              type="button"
              data-testid="btn-unlink-timer-task"
              aria-label="Bỏ gắn công việc khỏi đồng hồ"
              onClick={() => {
                soundEffects.playClick();
                setLinkedTask(null, null);
              }}
              className="text-[10px] px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-neutral-300 transition cursor-pointer min-h-[24px] inline-flex items-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
            >
              Bỏ gắn
            </button>
          </div>
        )}

        {/* Phase Selector Segmented Control (Hiển thị trọn vẹn 100%, không bị chém cụt) */}
        <div className="flex flex-nowrap overflow-x-auto scrollbar-none gap-1 p-1 rounded-2xl bg-black/25 border border-white/5 mb-2 min-h-[30px] items-stretch select-none">
          {(['pomodoro', 'short_break', 'long_break'] as TimerPhase[]).map((p) => {
            const isActive = phase === p;
            const style = getPhaseStyles(p);

            return (
              <button
                key={p}
                data-testid={`tab-${p}`}
                disabled={status !== 'idle'}
                onClick={() => {
                  haptics.phaseChange();
                  if (p !== phase) {
                    soundEffects.playClick();
                  }
                  setPhase(p);
                }}
                className={`flex-1 rounded-full text-[11px] font-medium transition-all duration-150 cursor-pointer flex items-center justify-center min-h-[28px] px-2 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 whitespace-nowrap shrink-0 ${
                  isActive ? style.activeTab : 'text-neutral-400 hover:text-white'
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {style.label}
              </button>
            );
          })}
        </div>

        {/* Timer Display Area (Specular Highlight + Tabular Figures Không Rung) */}
        <div
          className={`relative isolate w-full flex flex-col items-center justify-center rounded-2xl border py-2 px-3 text-center transition-all duration-300 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)] ${currentPhaseStyle.bg} ${status === 'running' && !isEcoMode ? 'animate-zen-breathe' : ''}`}
        >
          {!isEcoMode && <div aria-hidden="true" data-testid="timer-ambient-glow" className="liquid-ambient absolute inset-0 rounded-2xl pointer-events-none -z-10 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.06),transparent_72%)]" />}
          <div
            data-testid="timer-display"
            role="timer"
            aria-label="Đồng hồ Pomodoro"
            aria-live="off"
            className="font-mono tabular-nums text-4xl sm:text-5xl font-bold tracking-tight text-white text-center w-full select-none drop-shadow-[0_4px_24px_rgba(255,255,255,0.18)] [font-variant-numeric:tabular-nums] [font-feature-settings:'tnum'_1]"
          >
            {formatTime(remainingMs)}
          </div>

          {/* Session Round Dots */}
          <div className="flex items-center gap-1.5 mt-0.5">
            {Array.from({ length: settings.roundsBeforeLongBreak }).map((_, idx) => {
              const isCompleted = idx + 1 < currentRound;
              const isCurrent = idx + 1 === currentRound;
              const isRunning = status === 'running';
              const isPaused = status === 'paused';
              let dotClass = 'bg-white/15';
              if (isCompleted) {
                dotClass = 'bg-zinc-500';
              } else if (isCurrent && isRunning) {
                dotClass = 'bg-zinc-400 animate-pulse';
              } else if (isCurrent && isPaused) {
                dotClass = 'bg-zinc-400/70';
              }
              return (
                <div
                  key={idx}
                  data-testid={`round-dot-${idx}`}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${dotClass}`}
                  title={`Hiệp ${idx + 1}`}
                />
              );
            })}
          </div>
        </div>

        {/* Daily Focus Goal Bar (4px) */}
        <div className="w-full mt-1 px-0.5">
          <div className="flex items-center justify-between text-[10px] text-neutral-400 mb-0.5">
            <span>Tiến độ ngày</span>
            <span data-testid="daily-progress-text" className="font-mono text-neutral-300">
              {dailyProgress}/{settings.roundsBeforeLongBreak * 2}
            </span>
          </div>
          <div className="w-full h-1 bg-white/[0.08] rounded-full overflow-hidden">
            <div
              data-testid="daily-progress-bar"
              className="h-full bg-zinc-300 rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(100, (dailyProgress / (settings.roundsBeforeLongBreak * 2)) * 100)}%`
              }}
            />
          </div>
        </div>

        {/* Control Buttons Area (Snappy Spring Motion + Optical Cap-Height Alignment) */}
        <div className="flex flex-row items-center justify-center flex-nowrap gap-2.5 w-full shrink-0 select-none py-1">
          {status === 'idle' && (
            <button
              data-testid="timer-start-btn"
              onClick={() => {
                haptics.timerToggle();
                soundEffects.playTimerStart();
                start();
              }}
              title="Bắt đầu phiên tập trung"
              aria-label="Bắt đầu phiên tập trung"
              className="liquid-glow h-11 px-6 rounded-full bg-white text-zinc-950 hover:bg-zinc-100 border border-white/20 shadow-[0_4px_24px_rgba(255,255,255,0.12)] transition-all duration-200 flex items-center justify-center gap-2 shrink-0 cursor-pointer active:scale-[0.96]"
            >
              <Play size={16} fill="currentColor" className="-translate-y-[0.5px]" />
              <span className="font-semibold text-sm tracking-wide text-zinc-950 whitespace-nowrap">Bắt đầu</span>
            </button>
          )}

          {status === 'running' && (
            <button
              data-testid="timer-pause-btn"
              onClick={() => {
                haptics.timerToggle();
                soundEffects.playTimerPause();
                pause();
              }}
              title="Tạm dừng phiên tập trung"
              aria-label="Tạm dừng phiên tập trung"
              className="liquid-glow h-11 px-6 rounded-full bg-white text-zinc-950 hover:bg-zinc-100 border border-white/20 shadow-[0_4px_24px_rgba(255,255,255,0.12)] transition-all duration-200 flex items-center justify-center gap-2 shrink-0 cursor-pointer active:scale-[0.96]"
            >
              <Pause size={16} fill="currentColor" className="-translate-y-[0.5px]" />
              <span className="font-semibold text-sm tracking-wide text-zinc-950 whitespace-nowrap">Tạm dừng</span>
            </button>
          )}

          {status === 'paused' && (
            <button
              data-testid="timer-resume-btn"
              onClick={() => {
                haptics.timerToggle();
                soundEffects.playTimerStart();
                resume();
              }}
              title="Tiếp tục phiên tập trung"
              aria-label="Tiếp tục phiên tập trung"
              className="liquid-glow h-11 px-6 rounded-full bg-white text-zinc-950 hover:bg-zinc-100 border border-white/20 shadow-[0_4px_24px_rgba(255,255,255,0.12)] transition-all duration-200 flex items-center justify-center gap-2 shrink-0 cursor-pointer active:scale-[0.96]"
            >
              <Play size={16} fill="currentColor" className="-translate-y-[0.5px]" />
              <span className="font-semibold text-sm tracking-wide text-zinc-950 whitespace-nowrap">Tiếp tục</span>
            </button>
          )}

          <button
            data-testid="timer-reset-btn"
            onClick={() => {
              haptics.impact('light');
              soundEffects.playClick();
              reset();
            }}
            title="Đặt lại hiệp này"
            aria-label="Đặt lại hiệp này"
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-2xl bg-white/5 hover:bg-white/10 active:scale-90 border border-white/10 hover:border-white/25 text-zinc-300 hover:text-white flex items-center justify-center transition-all duration-150 shrink-0 shadow-sm backdrop-blur-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            <RotateCcw size={20} className="w-5 h-5 -translate-y-[0.5px]" />
          </button>

          <button
            data-testid="timer-reset-cycle-btn"
            onClick={() => {
              haptics.impact('medium');
              soundEffects.playClick();
              resetCycle();
            }}
            title={`Bắt đầu lại chu kỳ (Hiệp 1/${settings.roundsBeforeLongBreak})`}
            aria-label={`Bắt đầu lại chu kỳ (Hiệp 1/${settings.roundsBeforeLongBreak})`}
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-2xl bg-white/5 hover:bg-white/10 active:scale-90 border border-white/10 hover:border-white/25 text-zinc-300 hover:text-white flex items-center justify-center transition-all duration-150 shrink-0 shadow-sm backdrop-blur-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            <RefreshCw size={20} className="w-5 h-5 -translate-y-[0.5px] text-zinc-400" />
          </button>

          <button
            data-testid="timer-skip-btn"
            onClick={() => {
              haptics.impact('light');
              soundEffects.playClick();
              skip();
            }}
            title="Bỏ qua hiệp này"
            aria-label="Bỏ qua hiệp này"
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-2xl bg-white/5 hover:bg-white/10 active:scale-90 border border-white/10 hover:border-white/25 text-zinc-300 hover:text-white flex items-center justify-center transition-all duration-150 shrink-0 shadow-sm backdrop-blur-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            <SkipForward size={20} className="w-5 h-5 -translate-y-[0.5px]" />
          </button>
        </div>

        {/* Toast / Banner chúc mừng nhẹ nhàng khi hoàn thành hiệp */}
        {celebrationToast && (
          <div
            data-testid="timer-celebration-toast"
            role="status"
            aria-live="polite"
            className="w-full mt-2 flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-zinc-700/20 border border-zinc-500/40 text-zinc-300 text-xs shadow-lg backdrop-blur-md animate-in fade-in duration-300"
          >
            <div className="flex items-center gap-1.5 font-medium truncate">
              <Sparkles size={13} className="text-zinc-300 shrink-0" />
              <span className="truncate">{celebrationToast}</span>
            </div>
            <button
              type="button"
              data-testid="btn-dismiss-toast"
              onClick={() => {
                soundEffects.playClick();
                setCelebrationToast(null);
              }}
              className="text-neutral-400 hover:text-white text-xs cursor-pointer ml-1 p-0.5 rounded transition"
              aria-label="Đóng thông báo"
            >
              ✕
            </button>
          </div>
        )}

        {/* Quick Settings Panel (chỉ hiển thị ở Workspace thường, ẩn trong Zen Mode) */}
        {!isEmbeddedInZen && !aiOpen && (
          <div className="mt-2 border-t border-white/[0.08] pt-1.5 pb-0.5 text-xs text-neutral-300 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-medium text-neutral-200 text-[10.5px] flex items-center gap-1.5">
                <span>25m • 5m • 15m</span>
              </span>
              <button
                data-testid="btn-request-notification"
                type="button"
                onClick={() => {
                  soundEffects.playClick();
                  requestNotificationPermission();
                }}
                className="text-[10.5px] text-zinc-400 hover:text-white underline cursor-pointer inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 rounded px-1"
              >
                <Bell size={11} />
                <span>Bật thông báo</span>
              </button>
            </div>

            <p className="text-[11px] text-zinc-300">Thời lượng phiên học được điều chỉnh trong Cài đặt.</p>
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer select-none group py-0.5">
                <div className="relative flex items-center justify-center">
                  {/* Input ẩn nguyên bản bảo đảm accessibility & form state */}
                  <input
                    data-testid="checkbox-auto-transition"
                    type="checkbox"
                    checked={settings.autoTransition}
                    onChange={(e) => {
                      soundEffects.playClick();
                      updateSettings({ autoTransition: e.target.checked });
                    }}
                    className="sr-only peer"
                  />
                  {/* Hộp Checkmark Chuẩn Monochrome 90-10 */}
                  <div
                    className={`w-5 h-5 rounded-lg border transition-all duration-200 ease-out flex items-center justify-center ${
                      settings.autoTransition
                        ? 'bg-white border-white text-zinc-950 shadow-sm'
                        : 'border-white/20 bg-white/5 group-hover:border-white/40 group-hover:bg-white/10 text-transparent'
                    }`}
                  >
                    {/* Dấu tick SVG sắc nét đen tương phản cao khi checked */}
                    <svg
                      className={`w-3.5 h-3.5 stroke-[1.5] text-zinc-950 transition-all duration-150 transform ${
                        settings.autoTransition ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
                      }`}
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
                <span className="text-[11px] font-medium text-zinc-300 group-hover:text-white transition-colors">
                  Tự động chuyển hiệp mới
                </span>
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const TimerTestInterface = TimerWidget;
