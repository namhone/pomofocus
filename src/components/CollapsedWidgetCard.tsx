import React, { useEffect, useState } from 'react';
import {
  Play,
  Pause,
  Maximize2,
  CheckSquare,
  CheckCircle2,
  FileText,
  Volume2,
  Sliders,
  Palette,
  Calendar,
  Target,
  Timer,
  Sparkles
} from 'lucide-react';
import { WidgetId } from '../types/layout';
import { useLayoutStore } from '../stores/useLayoutStore';
import { useTimerStore } from '../stores/useTimerStore';
import { useTaskStore } from '../stores/useTaskStore';
import { useNoteStore } from '../stores/useNoteStore';
import { useAudioStore } from '../stores/useAudioStore';
import { useBackgroundStore } from '../stores/useBackgroundStore';
import { useAuthStore } from '../stores/useAuthStore';
import { BACKGROUND_PRESETS } from '../data/backgroundPresets';
import { db, PlannerBlockRecord } from '../db';

interface CollapsedWidgetCardProps {
  id: WidgetId;
  isMobile?: boolean;
}

export const CollapsedWidgetCard: React.FC<CollapsedWidgetCardProps> = ({ id, isMobile: _isMobile = false }) => {
  const toggleCollapseWidget = useLayoutStore((s) => s.toggleCollapseWidget);

  // 1. Timer Store
  const timerStatus = useTimerStore((s) => s.status);
  const remainingMs = useTimerStore((s) => s.remainingMs);
  const timerPhase = useTimerStore((s) => s.phase);
  const timerCurrentRound = useTimerStore((s) => s.currentRound);
  const timerTotalRounds = useTimerStore((s) => s.settings.roundsBeforeLongBreak);
  const timerLinkedTask = useTimerStore((s) => s.linkedTaskTitle);
  const timerStart = useTimerStore((s) => s.start);
  const timerPause = useTimerStore((s) => s.pause);

  // 2. Tasks Store
  const tasks = useTaskStore((s) => s.tasks);
  const loadTasksAndProjects = useTaskStore((s) => s.loadTasksAndProjects);
  const toggleTaskComplete = useTaskStore((s) => s.toggleTaskComplete);

  // 3. Notes Store
  const notes = useNoteStore((s) => s.notes);
  const activeNoteId = useNoteStore((s) => s.activeNoteId);
  const loadNotes = useNoteStore((s) => s.loadNotes);

  // 4. Audio Store
  const soundTracks = useAudioStore((s) => s.tracks);
  const toggleTrack = useAudioStore((s) => s.toggleTrack);

  // 5. Background Store
  const activePresetId = useBackgroundStore((s) => s.activePresetId);
  const ambientEffect = useBackgroundStore((s) => s.ambientEffect);

  // 6. Auth & Settings
  const user = useAuthStore((s) => s.user);
  const glassSettings = useLayoutStore((s) => s.glassSettings);
  const density = useLayoutStore((s) => s.density);

  // 7. Calendar Planner Blocks (Dexie)
  const [plannerBlocks, setPlannerBlocks] = useState<PlannerBlockRecord[]>([]);

  // Auto-load store data if not yet initialized
  useEffect(() => {
    if (id === 'tasks' && tasks.length === 0) {
      loadTasksAndProjects();
    }
    if (id === 'notes' && notes.length === 0) {
      loadNotes();
    }
    if (id === 'calendar') {
      const todayStr = new Date().toISOString().split('T')[0];
      db.planner_blocks
        .where('dateString')
        .equals(todayStr)
        .toArray()
        .then((records) => setPlannerBlocks(records))
        .catch(() => {});
    }
  }, [id, tasks.length, notes.length, loadTasksAndProjects, loadNotes]);

  // Format Timer
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  // Helper: Strip markdown for note preview
  const cleanMarkdown = (raw: string) => {
    return raw
      .replace(/#+\s+/g, '')
      .replace(/[*_~`>]/g, '')
      .replace(/\[[ xX]?\]\s*/g, '')
      .replace(/\n+/g, ' ')
      .trim();
  };

  // ----------------------------------------------------
  // RENDER PER WIDGET
  // ----------------------------------------------------

  // 1. POMODORO TIMER
  if (id === 'timer') {
    return (
      <div
        data-testid="collapsed-timer-bar"
        data-control="collapsed-timer-controls"
        className="w-full h-full min-h-[68px] p-2.5 sm:p-3 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-neutral-900/60 to-neutral-900/80 border border-emerald-500/25 flex items-center justify-between gap-3 select-none backdrop-blur-md"
      >
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          {/* Status Dot with Glow */}
          <div className="relative shrink-0 flex items-center justify-center">
            <span
              className={`w-3 h-3 rounded-full transition-all ${
                timerStatus === 'running'
                  ? 'bg-emerald-400 shadow-[0_0_12px_#34d399] animate-pulse'
                  : timerStatus === 'paused'
                  ? 'bg-amber-400 shadow-[0_0_8px_#fbbf24]'
                  : 'bg-neutral-600'
              }`}
            />
          </div>

          <div className="min-w-0">
            {/* Countdown Display */}
            <div className="flex items-baseline gap-2">
              <span
                data-testid="timer-display"
                className="font-mono text-xl sm:text-2xl font-extrabold text-white tracking-tight tabular-nums select-none"
              >
                {formattedTime}
              </span>
              <span className="text-[10px] font-semibold tracking-wider uppercase text-emerald-400 truncate">
                {timerPhase === 'pomodoro'
                  ? 'Tập trung'
                  : timerPhase === 'short_break'
                  ? 'Nghỉ ngắn'
                  : 'Nghỉ dài'}
              </span>
            </div>

            {/* Sub-info: Round & Linked Task */}
            <div className="flex items-center gap-2 text-[10px] text-neutral-400 mt-0.5 truncate">
              <span className="font-mono text-neutral-300">
                Hiệp {timerCurrentRound}/{timerTotalRounds}
              </span>
              {timerLinkedTask && (
                <span className="text-amber-300 truncate max-w-[150px] bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20 inline-flex items-center gap-1">
                  <Target size={10} className="shrink-0 text-amber-400" />
                  <span className="truncate">{timerLinkedTask}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0" data-no-drag="true">
          <button
            type="button"
            data-testid="collapsed-timer-play-btn"
            onClick={(e) => {
              e.stopPropagation();
              if (timerStatus === 'running') {
                timerPause();
              } else {
                timerStart();
              }
            }}
            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-neutral-950 transition active:scale-95 cursor-pointer shadow-md ${
              timerStatus === 'running'
                ? 'bg-amber-400 hover:bg-amber-300 text-neutral-950'
                : 'bg-emerald-400 hover:bg-emerald-300 text-neutral-950'
            }`}
            title={timerStatus === 'running' ? 'Tạm dừng đồng hồ' : 'Bắt đầu đếm ngược'}
            aria-label={timerStatus === 'running' ? 'Tạm dừng' : 'Bắt đầu'}
          >
            {timerStatus === 'running' ? (
              <Pause size={15} fill="currentColor" />
            ) : (
              <Play size={15} fill="currentColor" className="ml-0.5" />
            )}
          </button>

          <button
            type="button"
            data-testid="collapsed-timer-expand-btn"
            onClick={(e) => {
              e.stopPropagation();
              toggleCollapseWidget('timer');
            }}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-neutral-300 hover:text-white transition cursor-pointer"
            title="Mở rộng cửa sổ Pomodoro"
            aria-label="Mở rộng cửa sổ Pomodoro"
          >
            <Maximize2 size={14} strokeWidth={2} />
          </button>
        </div>
      </div>
    );
  }

  // 2. TASKS / TO-DO
  if (id === 'tasks') {
    const todoTasks = tasks.filter((t) => t.status !== 'completed' && t.status !== 'archived');
    const completedTasks = tasks.filter((t) => t.status === 'completed');
    const nextTask = todoTasks[0];

    return (
      <div
        data-testid="collapsed-tasks-card"
        className="w-full h-full min-h-[68px] p-2.5 sm:p-3 rounded-2xl bg-neutral-900/70 border border-white/10 flex items-center justify-between gap-3 select-none backdrop-blur-md"
      >
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <CheckSquare size={16} />
          </div>

          <div className="min-w-0">
            {todoTasks.length > 0 ? (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-emerald-400">
                    {todoTasks.length} việc cần làm
                  </span>
                  {nextTask?.estimatedPomodoros && (
                    <span className="text-[10px] text-neutral-400 font-mono inline-flex items-center gap-0.5">
                      • {nextTask.estimatedPomodoros} <Timer size={10} className="text-rose-400 inline" />
                    </span>
                  )}
                </div>
                <div className="text-xs font-medium text-white truncate max-w-[200px] sm:max-w-[280px] mt-0.5">
                  Tiếp theo: <span className="font-semibold">{nextTask?.title}</span>
                </div>
              </>
            ) : tasks.length > 0 ? (
              <>
                <div className="text-xs font-bold text-emerald-400 inline-flex items-center gap-1">
                  <Sparkles size={12} className="text-emerald-400 inline" />
                  <span>Tuyệt vời! Đã xong hết việc</span>
                </div>
                <div className="text-[11px] text-neutral-400 mt-0.5">
                  Đã hoàn thành {completedTasks.length} công việc hôm nay
                </div>
              </>
            ) : (
              <>
                <div className="text-xs font-bold text-neutral-300">
                  Chưa có công việc nào
                </div>
                <div className="text-[11px] text-neutral-500 mt-0.5">
                  Mở rộng để thêm công việc mới
                </div>
              </>
            )}
          </div>
        </div>

        {/* Quick action: Complete next task or Expand */}
        <div className="flex items-center gap-1.5 shrink-0" data-no-drag="true">
          {nextTask && (
            <button
              type="button"
              data-testid="collapsed-task-check-btn"
              onClick={(e) => {
                e.stopPropagation();
                toggleTaskComplete(nextTask.id);
              }}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-emerald-500/20 text-neutral-300 hover:text-emerald-300 border border-white/5 hover:border-emerald-500/30 active:scale-95 flex items-center justify-center transition cursor-pointer"
              title="Đánh dấu hoàn thành việc này"
              aria-label="Hoàn thành công việc"
            >
              <CheckCircle2 size={15} />
            </button>
          )}

          <button
            type="button"
            data-testid="collapsed-tasks-expand-btn"
            onClick={(e) => {
              e.stopPropagation();
              toggleCollapseWidget('tasks');
            }}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-neutral-300 hover:text-white transition cursor-pointer"
            title="Mở rộng danh sách công việc"
            aria-label="Mở rộng danh sách công việc"
          >
            <Maximize2 size={14} strokeWidth={2} />
          </button>
        </div>
      </div>
    );
  }

  // 3. NOTES
  if (id === 'notes') {
    const sortedNotes = [...notes].sort((a, b) => b.updatedAt - a.updatedAt);
    const latestNote = notes.find((n) => n.id === activeNoteId) || sortedNotes[0];
    const excerpt = latestNote ? cleanMarkdown(latestNote.contentMarkdown) : '';

    return (
      <div
        data-testid="collapsed-notes-card"
        className="w-full h-full min-h-[68px] p-2.5 sm:p-3 rounded-2xl bg-neutral-900/70 border border-white/10 flex items-center justify-between gap-3 select-none backdrop-blur-md"
      >
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <FileText size={16} />
          </div>

          <div className="min-w-0">
            {latestNote ? (
              <>
                <div className="text-xs font-bold text-white truncate max-w-[200px] sm:max-w-[260px]">
                  {latestNote.title || 'Ghi chú gần nhất'}
                </div>
                <div className="text-[11px] text-neutral-400 line-clamp-1 truncate max-w-[220px] sm:max-w-[300px] mt-0.5">
                  {excerpt || 'Ghi chú trống...'}
                </div>
              </>
            ) : (
              <>
                <div className="text-xs font-bold text-neutral-300">
                  Chưa có ghi chú nào
                </div>
                <div className="text-[11px] text-neutral-500 mt-0.5">
                  Mở rộng để viết ý tưởng đầu tiên
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0" data-no-drag="true">
          <button
            type="button"
            data-testid="collapsed-notes-expand-btn"
            onClick={(e) => {
              e.stopPropagation();
              toggleCollapseWidget('notes');
            }}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-neutral-300 hover:text-white transition cursor-pointer"
            title="Mở rộng khung ghi chú"
            aria-label="Mở rộng khung ghi chú"
          >
            <Maximize2 size={14} strokeWidth={2} />
          </button>
        </div>
      </div>
    );
  }

  // 4. SOUNDS & AMBIENT (Monochrome Stealth Audio Pill Bar)
  if (id === 'sounds') {
    const activeAmbientCount = soundTracks.filter((t) => t.isPlaying).length;

    return (
      <div
        data-testid="collapsed-media-bar"
        data-control="collapsed-audio-controls"
        className="w-full h-full min-h-[64px] p-2 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-between gap-3 select-none backdrop-blur-md"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-zinc-300 shrink-0">
            {activeAmbientCount > 0 ? (
              <span className="flex items-end gap-0.5 h-3">
                <span className="w-0.5 h-3 bg-zinc-200 animate-pulse" />
                <span className="w-0.5 h-1.5 bg-zinc-200 animate-pulse delay-75" />
                <span className="w-0.5 h-2.5 bg-zinc-200 animate-pulse delay-150" />
              </span>
            ) : (
              <Volume2 size={15} />
            )}
          </div>

          <div className="min-w-0">
            <div className="text-xs font-semibold text-zinc-100 truncate max-w-[140px] sm:max-w-[200px]">
              Âm Thanh Nền & Chuông Báo
            </div>
            <div className="text-[10px] text-zinc-400 mt-0.5 truncate flex items-center gap-1.5">
              {activeAmbientCount > 0 ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                  <span>{activeAmbientCount} âm thanh đang phát</span>
                </>
              ) : (
                <span>Chế độ chờ phát</span>
              )}
            </div>
          </div>
        </div>

        {/* Play/Pause toggle & Expand (Monochrome Stealth) */}
        <div className="flex items-center gap-1.5 shrink-0" data-no-drag="true">
          {activeAmbientCount > 0 && (
            <button
              type="button"
              data-testid="btn-mini-toggle-audio"
              onClick={(e) => {
                e.stopPropagation();
                // Pause all active ambient sounds
                soundTracks.filter(t => t.isPlaying).forEach(t => toggleTrack(t.id));
              }}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-medium transition active:scale-95 cursor-pointer shadow-sm bg-zinc-800 text-zinc-200 border border-zinc-700 hover:bg-zinc-700 hover:text-white"
              title="Dừng âm thanh"
            >
              <Pause size={12} fill="currentColor" />
              <span className="hidden sm:inline">Dừng</span>
            </button>
          )}

          <button
            type="button"
            data-testid="collapsed-sounds-expand-btn"
            onClick={(e) => {
              e.stopPropagation();
              toggleCollapseWidget('sounds');
            }}
            className="w-8 h-8 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/60 active:scale-95 flex items-center justify-center text-zinc-300 hover:text-white transition cursor-pointer"
            title="Mở rộng bảng âm thanh"
            aria-label="Mở rộng bảng âm thanh"
          >
            <Maximize2 size={13} strokeWidth={2} />
          </button>
        </div>
      </div>
    );
  }

  // 5. SPACES / BACKGROUNDS
  if (id === 'spaces') {
    const currentPreset = BACKGROUND_PRESETS.find((p) => p.id === activePresetId);
    const effectLabel =
      ambientEffect === 'rain'
        ? 'Mưa rơi 🌧️'
        : ambientEffect === 'snow'
        ? 'Tuyết rơi ❄️'
        : ambientEffect === 'sakura'
        ? 'Hoa anh đào 🌸'
        : ambientEffect === 'fireflies'
        ? 'Đom đóm ✨'
        : 'Tĩnh lặng';

    return (
      <div
        data-testid="collapsed-spaces-card"
        className="w-full h-full min-h-[68px] p-2.5 sm:p-3 rounded-2xl bg-neutral-900/70 border border-white/10 flex items-center justify-between gap-3 select-none backdrop-blur-md"
      >
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
            <Palette size={16} />
          </div>

          <div className="min-w-0">
            <div className="text-xs font-bold text-white truncate max-w-[190px] sm:max-w-[260px]">
              {currentPreset?.title || 'Không gian làm việc'}
            </div>
            <div className="text-[11px] text-purple-300/80 mt-0.5 truncate">
              Hiệu ứng: {effectLabel}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0" data-no-drag="true">
          <button
            type="button"
            data-testid="collapsed-spaces-expand-btn"
            onClick={(e) => {
              e.stopPropagation();
              toggleCollapseWidget('spaces');
            }}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-neutral-300 hover:text-white transition cursor-pointer"
            title="Mở rộng bảng đổi không gian"
            aria-label="Mở rộng bảng đổi không gian"
          >
            <Maximize2 size={14} strokeWidth={2} />
          </button>
        </div>
      </div>
    );
  }

  // 6. CALENDAR / TIME BLOCKS
  if (id === 'calendar') {
    const currentHour = new Date().getHours();
    const upcomingBlocks = plannerBlocks
      .filter((b) => !b.completed && b.startHour >= currentHour)
      .sort((a, b) => a.startHour - b.startHour);
    const nextBlock = upcomingBlocks[0];

    return (
      <div
        data-testid="collapsed-calendar-card"
        className="w-full h-full min-h-[68px] p-2.5 sm:p-3 rounded-2xl bg-neutral-900/70 border border-white/10 flex items-center justify-between gap-3 select-none backdrop-blur-md"
      >
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
            <Calendar size={16} />
          </div>

          <div className="min-w-0">
            {nextBlock ? (
              <>
                <div className="text-xs font-bold text-white truncate max-w-[190px] sm:max-w-[260px]">
                  {nextBlock.startHour}:00 — {nextBlock.title}
                </div>
                <div className="text-[11px] text-teal-300 mt-0.5">
                  Khung giờ tập trung tiếp theo
                </div>
              </>
            ) : plannerBlocks.length > 0 ? (
              <>
                <div className="text-xs font-bold text-teal-300 inline-flex items-center gap-1">
                  <Sparkles size={12} className="text-teal-400 inline" />
                  <span>Đã xong lịch trình hôm nay</span>
                </div>
                <div className="text-[11px] text-neutral-400 mt-0.5">
                  {plannerBlocks.length} khung giờ đã ghi nhận
                </div>
              </>
            ) : (
              <>
                <div className="text-xs font-bold text-neutral-300">
                  Chưa có lịch hẹn hôm nay
                </div>
                <div className="text-[11px] text-neutral-500 mt-0.5">
                  Mở rộng để phân bổ thời gian
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0" data-no-drag="true">
          <button
            type="button"
            data-testid="collapsed-calendar-expand-btn"
            onClick={(e) => {
              e.stopPropagation();
              toggleCollapseWidget('calendar');
            }}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-neutral-300 hover:text-white transition cursor-pointer"
            title="Mở rộng lịch biểu"
            aria-label="Mở rộng lịch biểu"
          >
            <Maximize2 size={14} strokeWidth={2} />
          </button>
        </div>
      </div>
    );
  }

  // 7. SETTINGS
  return (
    <div
      data-testid="collapsed-settings-card"
      className="w-full h-full min-h-[68px] p-2.5 sm:p-3 rounded-2xl bg-neutral-900/70 border border-white/10 flex items-center justify-between gap-3 select-none backdrop-blur-md"
    >
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-neutral-800 border border-white/10 flex items-center justify-center text-neutral-300 shrink-0">
          <Sliders size={16} />
        </div>

        <div className="min-w-0">
          <div className="text-xs font-bold text-white truncate max-w-[190px] sm:max-w-[260px]">
            Tài khoản: {user?.plan === 'pro' ? 'PRO BETA' : 'Miễn phí'}
          </div>
          <div className="text-[11px] text-neutral-400 mt-0.5 truncate">
            Kính {glassSettings.preset} • {density === 'compact' ? 'Thu gọn' : 'Chuẩn'}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0" data-no-drag="true">
        <button
          type="button"
          data-testid="collapsed-settings-expand-btn"
          onClick={(e) => {
            e.stopPropagation();
            toggleCollapseWidget('settings');
          }}
          className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-neutral-300 hover:text-white transition cursor-pointer"
          title="Mở rộng cài đặt"
          aria-label="Mở rộng cài đặt"
        >
          <Maximize2 size={14} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
};
