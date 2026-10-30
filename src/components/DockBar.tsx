import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import {
  Clock,
  CheckSquare,
  FileText,
  Calendar,
  Palette,
  Volume2,
  Maximize2,
  RotateCcw,
  Sliders,
  Move,
  Target,
  Minimize
} from 'lucide-react';
import { useLayoutStore } from '../stores/useLayoutStore';
import { WidgetId } from '../types/layout';

const MobileBottomNav = lazy(() =>
  import('./MobileBottomNav').then((module) => ({ default: module.MobileBottomNav }))
);

export const DockBar: React.FC = () => {
  const isZenMode = useLayoutStore((state) => state.isZenMode);
  const isMobile = useLayoutStore((state) => state.isMobile);
  const timerOpen = useLayoutStore((state) => state.widgets.timer.isOpen);
  const tasksOpen = useLayoutStore((state) => state.widgets.tasks.isOpen);
  const notesOpen = useLayoutStore((state) => state.widgets.notes.isOpen);
  const calendarOpen = useLayoutStore((state) => state.widgets.calendar.isOpen);
  const spacesOpen = useLayoutStore((state) => state.widgets.spaces.isOpen);
  const soundsOpen = useLayoutStore((state) => state.widgets.sounds.isOpen);
  const settingsOpen = useLayoutStore((state) => state.widgets.settings?.isOpen ?? false);
  const isFocusMode = useLayoutStore((state) => state.isFocusMode);
  const toggleFocusMode = useLayoutStore((state) => state.toggleFocusMode);
  const density = useLayoutStore((state) => state.density);
  const toggleDensity = useLayoutStore((state) => state.toggleDensity);
  const toggleWidget = useLayoutStore((state) => state.toggleWidget);
  const toggleZenMode = useLayoutStore((state) => state.toggleZenMode);
  const resetLayout = useLayoutStore((state) => state.resetLayout);
  const dockPosition = useLayoutStore((state) => state.dockPosition);
  const dockAutoHide = useLayoutStore((state) => state.dockAutoHide);

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isDockVisible, setIsDockVisible] = useState(true);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDockActiveRef = useRef(false);
  const openStates: Record<WidgetId, boolean> = {
    timer: timerOpen,
    tasks: tasksOpen,
    notes: notesOpen,
    calendar: calendarOpen,
    spaces: spacesOpen,
    sounds: soundsOpen,
    settings: settingsOpen
  };

  const isVertical = dockPosition === 'left' || dockPosition === 'right';
  const clearHideTimeout = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  };
  const scheduleHide = () => {
    clearHideTimeout();
    if (dockAutoHide) {
      hideTimeoutRef.current = setTimeout(() => setIsDockVisible(false), 1500);
    }
  };

  useEffect(() => {
    if (dockAutoHide) {
      clearHideTimeout();
      if (!isDockActiveRef.current) {
        hideTimeoutRef.current = setTimeout(() => setIsDockVisible(false), 1500);
      }
    } else {
      setIsDockVisible(true);
      clearHideTimeout();
    }
    return clearHideTimeout;
  }, [dockAutoHide]);

  if (isZenMode) {
    return null;
  }

  if (isMobile) {
    return (
      <Suspense fallback={null}>
        <MobileBottomNav />
      </Suspense>
    );
  }

  const productivityButtons: Array<{
    id: WidgetId;
    label: string;
    icon: React.ReactNode;
    testId: string;
  }> = [
    {
      id: 'timer',
      label: 'Đồng hồ',
      icon: <Clock size={16} strokeWidth={1.75} />,
      testId: 'dock-btn-timer'
    },
    {
      id: 'tasks',
      label: 'Công việc',
      icon: <CheckSquare size={16} strokeWidth={1.75} />,
      testId: 'dock-btn-tasks'
    },
    {
      id: 'notes',
      label: 'Ghi chú',
      icon: <FileText size={16} strokeWidth={1.75} />,
      testId: 'dock-btn-notes'
    },
    {
      id: 'calendar',
      label: 'Lịch biểu',
      icon: <Calendar size={16} strokeWidth={1.75} />,
      testId: 'dock-btn-calendar'
    }
  ];

  const atmosphereButtons: Array<{
    id: WidgetId;
    label: string;
    icon: React.ReactNode;
    testId: string;
  }> = [
    {
      id: 'spaces',
      label: 'Nền',
      icon: <Palette size={16} strokeWidth={1.75} />,
      testId: 'dock-btn-spaces'
    },
    {
      id: 'sounds',
      label: 'Âm thanh',
      icon: <Volume2 size={16} strokeWidth={1.75} />,
      testId: 'dock-btn-sounds'
    }
  ];

  const renderDockButton = ({
    id,
    label,
    icon,
    testId
  }: {
    id: WidgetId;
    label: string;
    icon: React.ReactNode;
    testId: string;
  }) => {
    const isOpen = openStates[id];
    return (
      <button
        key={id}
        type="button"
        data-testid={testId}
        onClick={() => toggleWidget(id)}
        className={`relative flex min-h-10 min-w-10 items-center justify-center rounded-xl text-xs font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 cursor-pointer ${
          isOpen
            ? 'bg-white/15 text-white border border-white/10 shadow-sm'
            : 'text-neutral-300 hover:text-white hover:bg-white/10'
        }`}
        title={`${isOpen ? 'Ẩn' : 'Hiện'} ${label}`}
        aria-label={`${isOpen ? 'Ẩn' : 'Hiện'} ${label}`}
        aria-pressed={isOpen}
      >
        {icon}
        {/* Active indicator dot */}
        {isOpen && (
          <span className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-white shadow-[0_0_4px_rgba(255,255,255,0.7)]" />
        )}
      </button>
    );
  };

  return (
    <>
    <nav
      role="toolbar"
      aria-label="Thanh điều khiển không gian làm việc"
      style={{
        transform: isDockVisible
          ? isVertical ? 'translateY(-50%)' : 'translateX(-50%)'
          : dockPosition === 'bottom' ? 'translate(-50%, calc(100% - 8px))'
          : dockPosition === 'top' ? 'translate(-50%, calc(-100% + 8px))'
          : dockPosition === 'left' ? 'translate(calc(-100% + 8px), -50%)'
          : 'translate(calc(100% - 8px), -50%)',
        opacity: isDockVisible ? 1 : 0.32,
        pointerEvents: isDockVisible ? 'auto' : 'none'
      }}
      onMouseEnter={() => {
        isDockActiveRef.current = true;
        clearHideTimeout();
        setIsDockVisible(true);
      }}
      onMouseLeave={() => {
        isDockActiveRef.current = false;
        scheduleHide();
      }}
      onFocus={() => {
        isDockActiveRef.current = true;
        clearHideTimeout();
        setIsDockVisible(true);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          isDockActiveRef.current = false;
          scheduleHide();
        }
      }}
      className={`fixed z-50 flex max-h-[90vh] max-w-[95vw] items-center gap-1.5 overflow-visible rounded-2xl border border-white/10 bg-[rgba(14,17,25,0.72)] p-1.5 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.5),inset_0_1px_1px_0_rgba(255,255,255,0.20)] backdrop-blur-3xl backdrop-saturate-[190%] select-none transition-[transform,opacity] duration-200 ${
        isVertical ? 'flex-col' : 'flex-row'
      } ${
        dockPosition === 'bottom' ? 'bottom-4 left-1/2' :
        dockPosition === 'top' ? 'top-4 left-1/2' :
        dockPosition === 'left' ? 'left-4 top-1/2' : 'right-4 top-1/2'
      }`}
    >
      {/* Group 1: Productivity Widgets */}
      <div className={`flex items-center gap-1 ${isVertical ? 'flex-col' : 'flex-row'}`}>
        {productivityButtons.map(renderDockButton)}
      </div>

      <div className={`${isVertical ? 'h-px w-4' : 'h-4 w-px'} bg-white/12 mx-0.5`} />

      {/* Group 2: Atmosphere & Sounds */}
      <div className={`flex items-center gap-1 ${isVertical ? 'flex-col' : 'flex-row'}`}>
        {atmosphereButtons.map(renderDockButton)}
      </div>

      <div className={`${isVertical ? 'h-px w-4' : 'h-4 w-px'} bg-white/12 mx-0.5`} />

      {/* Group 3: Settings Window & Actions */}
      <div className={`flex items-center gap-1 relative ${isVertical ? 'flex-col' : 'flex-row'}`}>
        <button
          type="button"
          data-testid="dock-btn-presets"
          onClick={() => toggleWidget('settings')}
          className={`relative flex min-h-10 min-w-10 items-center justify-center rounded-xl text-xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${
            settingsOpen
              ? 'bg-white/15 text-white border border-white/10 shadow-sm'
              : 'text-neutral-300 hover:text-white hover:bg-white/10'
          }`}
          title={`${settingsOpen ? 'Ẩn' : 'Hiện'} Cài đặt & Bố cục`}
          aria-label={`${settingsOpen ? 'Ẩn' : 'Hiện'} Cài đặt & Bố cục`}
          aria-pressed={settingsOpen}
        >
          <Sliders size={16} strokeWidth={1.75} />
          {settingsOpen && (
            <span className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.7)]" />
          )}
        </button>

        <button
          type="button"
          data-testid="dock-btn-focus"
          onClick={toggleFocusMode}
          className={`flex min-h-10 min-w-10 items-center justify-center rounded-xl text-xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${
            isFocusMode
              ? 'bg-amber-500/25 text-amber-300 border border-amber-500/30 shadow-sm'
              : 'text-neutral-300 hover:text-white hover:bg-white/10'
          }`}
          title={isFocusMode ? 'Tắt Focus Mode (quay lại bố cục đầy đủ)' : 'Bật Focus Mode (tập trung Timer + Công việc)'}
          aria-label="Chế độ tập trung cao độ"
          aria-pressed={isFocusMode}
        >
          <Target size={16} strokeWidth={1.75} className={isFocusMode ? 'text-amber-300' : 'text-neutral-300'} />
          {isFocusMode && (
            <span className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.7)]" />
          )}
        </button>

        <button
          type="button"
          data-testid="dock-btn-density"
          onClick={toggleDensity}
          className={`flex min-h-10 min-w-10 items-center justify-center rounded-xl text-xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${
            density === 'compact'
              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-sm'
              : 'text-neutral-300 hover:text-white hover:bg-white/10'
          }`}
          title={`Đổi mật độ hiển thị (Hiện tại: ${density === 'compact' ? 'Thu gọn (Compact)' : 'Chuẩn (Normal)'})`}
          aria-label="Mật độ hiển thị"
        >
          <Minimize size={15} strokeWidth={1.75} />
        </button>

        <button
          type="button"
          data-testid="dock-btn-zen"
          onClick={toggleZenMode}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-neutral-300 hover:text-white bg-neutral-800/80 hover:bg-neutral-700/80 border border-white/5 active:scale-95 transition-all focus-visible:ring-1 focus-visible:ring-neutral-400 cursor-pointer min-h-[36px]"
          title="Bật chế độ Zen (Phím tắt: Z hoặc H)"
          aria-label="Bật chế độ Zen"
        >
          <Maximize2 size={15} strokeWidth={1.75} className="text-emerald-400" />
          <span className="hidden xl:inline">Zen Mode</span>
          <kbd className="hidden xl:inline px-1 py-0.2 rounded bg-neutral-900 border border-white/10 text-[10px] text-neutral-400 font-mono">
            Z
          </kbd>
        </button>

        <button
          type="button"
          data-testid="dock-btn-reset-layout"
          onClick={() => setShowResetConfirm(true)}
          className="flex min-h-10 min-w-10 items-center justify-center rounded-xl text-xs font-medium text-neutral-400 transition-colors hover:bg-neutral-800/50 hover:text-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 cursor-pointer"
          title="Khôi phục bố cục mặc định"
          aria-label="Khôi phục bố cục mặc định"
        >
          <RotateCcw size={15} strokeWidth={1.75} />
        </button>
      </div>
    </nav>
    {showResetConfirm && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
        <section
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="reset-layout-title"
          data-testid="reset-layout-confirmation"
          className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#111722] p-5 shadow-2xl"
        >
          <h2 id="reset-layout-title" className="text-sm font-semibold text-white">Đặt lại bố cục?</h2>
          <p className="mt-2 text-xs leading-relaxed text-neutral-300">
            Vị trí, kích thước và trạng thái hiển thị widget sẽ trở về mặc định.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowResetConfirm(false)}
              className="min-h-10 rounded-lg border border-white/10 px-3 text-xs text-neutral-200 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            >
              Hủy
            </button>
            <button
              type="button"
              data-testid="confirm-reset-layout"
              onClick={() => {
                resetLayout();
                setShowResetConfirm(false);
              }}
              className="min-h-10 rounded-lg bg-rose-400 px-3 text-xs font-semibold text-slate-950 hover:bg-rose-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200"
            >
              Đặt lại
            </button>
          </div>
        </section>
      </div>
    )}
    {dockAutoHide && !isDockVisible && (
      <button
        type="button"
        data-testid="dock-reveal"
        onClick={() => setIsDockVisible(true)}
        aria-label="Hiện thanh công cụ"
        title="Hiện thanh công cụ"
        className={`fixed z-40 flex items-center justify-center rounded-full border border-white/20 bg-slate-950/80 text-neutral-200 shadow-lg backdrop-blur-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${
          isVertical
            ? dockPosition === 'left' ? 'left-0 top-1/2 h-12 w-8 -translate-y-1/2' : 'right-0 top-1/2 h-12 w-8 -translate-y-1/2'
            : dockPosition === 'top' ? 'left-1/2 top-0 h-8 w-12 -translate-x-1/2' : 'bottom-0 left-1/2 h-8 w-12 -translate-x-1/2'
        }`}
      >
        <Move size={14} />
      </button>
    )}
    </>
  );
};
