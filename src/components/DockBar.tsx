import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import {
  Clock,
  CheckSquare,
  FileText,
  Calendar,
  Palette,
  Volume2,
  Maximize2,
  Minimize2,
  RotateCcw,
  Sliders,
  Move,
  Target,
  LayoutGrid,
  Film,
  Sparkles
} from 'lucide-react';
import { useLayoutStore } from '../stores/useLayoutStore';
import { useAiStore } from '../stores/useAiStore';
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
  const mediaOpen = useLayoutStore((state) => state.widgets.media?.isOpen ?? false);
  const settingsOpen = useLayoutStore((state) => state.widgets.settings?.isOpen ?? false);
  const isAiOpen = useAiStore((state) => state.isOpen);
  const toggleAi = useAiStore((state) => state.toggleOpen);
  const isFocusMode = useLayoutStore((state) => state.isFocusMode);
  const toggleFocusMode = useLayoutStore((state) => state.toggleFocusMode);
  const density = useLayoutStore((state) => state.density);
  const toggleDensity = useLayoutStore((state) => state.toggleDensity);
  const toggleWidget = useLayoutStore((state) => state.toggleWidget);
  const toggleZenMode = useLayoutStore((state) => state.toggleZenMode);
  const resetLayout = useLayoutStore((state) => state.resetLayout);
  const dockPosition = useLayoutStore((state) => state.dockPosition);
  const dockSize = useLayoutStore((state) => state.dockSize) || 'normal';
  const setDockPosition = useLayoutStore((state) => state.setDockPosition);
  const setDockSize = useLayoutStore((state) => state.setDockSize);
  const dockAutoHide = useLayoutStore((state) => state.dockAutoHide);
  const isFocusDimmed = useLayoutStore((state) => state.isFocusDimmed);
  const isEcoMode = useLayoutStore((state) => state.isEcoMode);
  const setEcoMode = useLayoutStore((state) => state.setEcoMode);

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showQuickDockMenu, setShowQuickDockMenu] = useState(false);
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
    media: mediaOpen,
    settings: settingsOpen
  };

  const isVertical = dockPosition === 'left' || dockPosition === 'right';

  const getDockTransform = () => {
    const scaleVal = dockSize === 'compact' ? 0.9 : 1;
    if (isAiOpen) {
      if (dockPosition === 'bottom' || dockPosition === 'top') {
        return `translate(-50%, calc(100% + 40px)) scale(${scaleVal})`;
      }
      return `translateY(40px) scale(${scaleVal})`;
    }

    let baseTranslate = '';
    if (dockPosition === 'bottom' || dockPosition === 'top') {
      baseTranslate = 'translateX(-50%)';
    } else if (dockPosition === 'left' || dockPosition === 'right') {
      baseTranslate = 'translateY(-50%)';
    }

    if (!isDockVisible) {
      if (dockPosition === 'bottom' || dockPosition === 'bottom-left' || dockPosition === 'bottom-right') {
        return `${baseTranslate} translateY(calc(100% - 8px)) scale(${scaleVal})`.trim();
      }
      if (dockPosition === 'top' || dockPosition === 'top-left' || dockPosition === 'top-right') {
        return `${baseTranslate} translateY(calc(-100% + 8px)) scale(${scaleVal})`.trim();
      }
      if (dockPosition === 'left') {
        return `${baseTranslate} translateX(calc(-100% + 8px)) scale(${scaleVal})`.trim();
      }
      if (dockPosition === 'right') {
        return `${baseTranslate} translateX(calc(100% - 8px)) scale(${scaleVal})`.trim();
      }
    }

    return baseTranslate ? `${baseTranslate} scale(${scaleVal})` : `scale(${scaleVal})`;
  };

  const getDockPositionClass = () => {
    switch (dockPosition) {
      case 'top':
        return 'top-4 left-1/2';
      case 'left':
        return 'left-4 top-1/2';
      case 'right':
        return 'right-4 top-1/2';
      case 'top-left':
        return 'top-4 left-6';
      case 'top-right':
        return 'top-4 right-6';
      case 'bottom-left':
        return 'bottom-6 left-6';
      case 'bottom-right':
        return 'bottom-6 right-6';
      case 'bottom':
      default:
        return 'bottom-6 left-1/2';
    }
  };

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

  // 1. Nhóm Kế hoạch
  const planButtons: Array<{
    id: WidgetId;
    label: string;
    icon: React.ReactNode;
    testId: string;
  }> = [
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

  // 2. Nhóm Không gian & Âm thanh
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
    },
    {
      id: 'media',
      label: 'Media',
      icon: <Film size={16} strokeWidth={1.75} />,
      testId: 'dock-btn-media'
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
        className={`relative flex h-8 w-8 items-center justify-center rounded-xl text-xs font-medium transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] active:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 cursor-pointer ${
          isOpen
            ? 'bg-white/15 text-white border border-white/10 shadow-sm'
            : 'text-neutral-300 hover:text-white hover:bg-white/10 hover:border-zinc-700/60'
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
      data-testid="dockbar"
      role="toolbar"
      aria-label="Thanh điều khiển không gian làm việc"
      style={{
        transform: getDockTransform(),
        opacity: isAiOpen ? 0 : !isDockVisible ? 0.32 : isFocusDimmed ? 0.15 : 1,
        pointerEvents: isAiOpen || !isDockVisible ? 'none' : 'auto'
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
      className={`fixed z-30 flex max-h-[90vh] max-w-[95vw] items-center gap-1.5 sm:gap-2 overflow-visible rounded-2xl border ${
        isEcoMode
          ? 'border-zinc-800 bg-[#0c0c0e] shadow-2xl'
          : 'border-white/10 bg-[rgba(14,17,25,0.78)] shadow-[0_20px_50px_-10px_rgba(0,0,0,0.5),inset_0_1px_1px_0_rgba(255,255,255,0.15)] backdrop-blur-3xl backdrop-saturate-[190%]'
      } px-2 py-1 select-none transition-all duration-300 ${
        isAiOpen ? 'opacity-0 pointer-events-none translate-y-8 invisible' : 'opacity-100 translate-y-0 hover:opacity-100'
      } ${
        isVertical ? 'flex-col w-16' : 'flex-row'
      } ${getDockPositionClass()}`}
    >
      {/* ========================================================================= */}
      {/* NHÓM 1: ⏱ TẬP TRUNG (TIMER & FOCUS MODES)                                  */}
      {/* ========================================================================= */}
      <div
        className={`flex items-center gap-1 px-1 py-0.5 rounded-xl bg-white/[0.04] border border-white/5 ${
          isVertical ? 'flex-col' : 'flex-row'
        }`}
        title="Nhóm Tập trung"
      >
        {/* Nút Đồng hồ Pomodoro */}
        {renderDockButton({
          id: 'timer',
          label: 'Đồng hồ',
          icon: <Clock size={16} strokeWidth={1.75} />,
          testId: 'dock-btn-timer'
        })}

        {/* Nút Focus Mode */}
        <button
          type="button"
          data-testid="dock-btn-focus"
          onClick={toggleFocusMode}
          className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs font-medium transition-all duration-150 active:scale-[0.98] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${
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

        {/* Nút Zen Mode */}
        <button
          type="button"
          data-testid="dock-btn-zen"
          onClick={toggleZenMode}
          className={`flex items-center justify-center rounded-xl text-xs font-medium active:scale-[0.98] transition-all duration-150 focus-visible:ring-1 focus-visible:ring-neutral-400 cursor-pointer h-8 ${
            isVertical ? 'w-8 p-0' : 'px-2.5 sm:px-3 gap-1.5'
          } ${
            isZenMode
              ? 'text-emerald-300 bg-emerald-500/20 border border-emerald-500/40 shadow-sm'
              : 'text-neutral-300 hover:text-white bg-neutral-800/80 hover:bg-neutral-700/80 border border-white/5'
          }`}
          title={isZenMode ? "Tắt chế độ Zen (Z hoặc H)" : "Bật chế độ Zen (Z hoặc H)"}
          aria-label={isZenMode ? "Tắt chế độ Zen" : "Bật chế độ Zen"}
          aria-pressed={isZenMode}
        >
          {isZenMode ? (
            <Minimize2 size={15} strokeWidth={1.75} className="text-emerald-400 shrink-0" />
          ) : (
            <Maximize2 size={15} strokeWidth={1.75} className="text-emerald-400 shrink-0" />
          )}
          {!isVertical && (
            <>
              <span className="hidden xl:inline text-[11px] font-semibold">Zen</span>
              <kbd className="hidden xl:inline px-1 py-0.2 rounded bg-neutral-900 border border-white/10 text-[9px] text-neutral-400 font-mono">
                Z
              </kbd>
            </>
          )}
        </button>
      </div>

      <div className={`${isVertical ? 'h-px w-4 my-0.5' : 'h-5 w-px mx-0.5'} bg-white/10`} />

      {/* ========================================================================= */}
      {/* NHÓM 2: 📋 KẾ HOẠCH (TASKS, NOTES, CALENDAR)                               */}
      {/* ========================================================================= */}
      <div
        className={`flex items-center gap-1 px-1 py-0.5 rounded-xl bg-white/[0.04] border border-white/5 ${
          isVertical ? 'flex-col' : 'flex-row'
        }`}
        title="Nhóm Kế hoạch"
      >
        {planButtons.map(renderDockButton)}
      </div>

      <div className={`${isVertical ? 'h-px w-4 my-0.5' : 'h-5 w-px mx-0.5'} bg-white/10`} />

      {/* ========================================================================= */}
      {/* NHÓM 3: 🎧 KHÔNG GIAN (SPACES, SOUNDS, MEDIA)                              */}
      {/* ========================================================================= */}
      <div
        className={`flex items-center gap-1 px-1 py-0.5 rounded-xl bg-white/[0.04] border border-white/5 ${
          isVertical ? 'flex-col' : 'flex-row'
        }`}
        title="Nhóm Không gian & Âm thanh"
      >
        {atmosphereButtons.map(renderDockButton)}
      </div>

      <div className={`${isVertical ? 'h-px w-4 my-0.5' : 'h-5 w-px mx-0.5'} bg-white/10`} />

      {/* ========================================================================= */}
      {/* NHÓM 4: ✨ TRỢ LÝ AI & CÀI ĐẶT BỐ CỤC                                     */}
      {/* ========================================================================= */}
      <div
        className={`flex items-center gap-1 px-1 py-0.5 rounded-xl bg-white/[0.04] border border-white/5 relative ${
          isVertical ? 'flex-col' : 'flex-row'
        }`}
        title="Nhóm Trợ lý AI & Bố cục"
      >
        {/* AI Study Companion Trigger */}
        <button
          type="button"
          data-testid="dock-btn-ai"
          onClick={() => toggleAi()}
          className={`relative flex h-8 w-8 items-center justify-center rounded-xl text-xs font-medium transition-all duration-150 active:scale-[0.98] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
            isAiOpen
              ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/50 shadow-sm'
              : 'text-cyan-400/90 hover:text-cyan-300 hover:bg-cyan-500/10'
          }`}
          title="Trợ lý Học tập AI Companion (⚡)"
          aria-label="Mở Trợ lý AI Companion"
          aria-pressed={isAiOpen}
        >
          <Sparkles size={16} strokeWidth={2} />
          <span className="absolute -top-1 -right-1 flex h-3.5 min-w-3.5 px-0.5 items-center justify-center rounded-full bg-amber-400 text-[8px] font-bold text-neutral-950 font-mono shadow-xs">
            ⚡
          </span>
          {isAiOpen && (
            <span className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-cyan-400 shadow-[0_0_4px_rgba(34,211,238,0.7)]" />
          )}
        </button>

        {/* Nút Tùy biến nhanh vị trí & kích thước DockBar */}
        <button
          type="button"
          data-testid="dock-btn-custom-position"
          onClick={() => setShowQuickDockMenu((prev) => !prev)}
          className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs font-medium transition-all duration-150 active:scale-[0.98] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${
            showQuickDockMenu
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
              : 'text-neutral-300 hover:text-white hover:bg-white/10'
          }`}
          title="Tùy biến vị trí & kích thước DockBar"
          aria-label="Tùy biến vị trí DockBar"
        >
          <Move size={15} strokeWidth={1.75} />
        </button>

        {/* Nút Cài đặt & Bố cục */}
        <button
          type="button"
          data-testid="dock-btn-presets"
          onClick={() => toggleWidget('settings')}
          className={`relative flex h-8 w-8 items-center justify-center rounded-xl text-xs font-medium transition-all duration-150 active:scale-[0.98] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${
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

        {/* Nút Mật độ hiển thị */}
        <button
          type="button"
          data-testid="dock-btn-density"
          onClick={toggleDensity}
          className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs font-medium transition-all duration-150 active:scale-[0.98] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${
            density === 'compact'
              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-sm'
              : 'text-neutral-300 hover:text-white hover:bg-white/10'
          }`}
          title={`Đổi mật độ hiển thị (Hiện tại: ${density === 'compact' ? 'Thu gọn (Compact)' : 'Chuẩn (Normal)'})`}
          aria-label="Mật độ hiển thị"
        >
          <LayoutGrid size={15} strokeWidth={1.75} />
        </button>

        {/* Nút Khôi phục bố cục mặc định */}
        <button
          type="button"
          data-testid="dock-btn-reset-layout"
          onClick={() => setShowResetConfirm(true)}
          className="flex h-8 w-8 items-center justify-center rounded-xl text-xs font-medium text-neutral-400 transition-all duration-150 hover:bg-neutral-800/50 hover:text-neutral-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 cursor-pointer"
          title="Khôi phục bố cục mặc định"
          aria-label="Khôi phục bố cục mặc định"
        >
          <RotateCcw size={15} strokeWidth={1.75} />
        </button>
      </div>

      {/* Popover tùy biến nhanh vị trí & kích thước */}
      {showQuickDockMenu && (
        <div
          data-testid="dock-quick-menu"
          className={`absolute z-[60] rounded-2xl border border-white/15 bg-[#121216]/95 backdrop-blur-2xl p-3 shadow-2xl space-y-2.5 text-xs select-none w-56 animate-in fade-in ${
            dockPosition === 'top' || dockPosition === 'top-left' || dockPosition === 'top-right'
              ? 'top-full mt-2 left-0'
              : isVertical
              ? 'top-0 left-full ml-2'
              : 'bottom-full mb-2 left-1/2 -translate-x-1/2'
          }`}
        >
          <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
            <span className="font-semibold text-white text-[11px] flex items-center gap-1.5">
              <Move size={12} className="text-cyan-400" />
              Vị trí DockBar
            </span>
            <button
              type="button"
              onClick={() => setShowQuickDockMenu(false)}
              aria-label="Đóng bảng điều khiển vị trí"
              className="text-neutral-400 hover:text-white text-[10px] cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* 4 hướng chính */}
          <div className="grid grid-cols-4 gap-1">
            {[
              { id: 'bottom', label: 'Dưới' },
              { id: 'top', label: 'Trên' },
              { id: 'left', label: 'Trái' },
              { id: 'right', label: 'Phải' }
            ].map((pos) => (
              <button
                key={pos.id}
                type="button"
                data-testid={`quick-dock-pos-${pos.id}`}
                onClick={() => {
                  setDockPosition(pos.id as any);
                  setShowQuickDockMenu(false);
                }}
                className={`py-1 px-1.5 rounded-lg text-center font-medium text-[10px] transition cursor-pointer border ${
                  dockPosition === pos.id
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-semibold'
                    : 'bg-white/5 text-neutral-300 hover:bg-white/10 border-white/5'
                }`}
              >
                {pos.label}
              </button>
            ))}
          </div>

          {/* 3 kích thước */}
          <div className="pt-1 border-t border-white/10">
            <span className="block font-semibold text-neutral-300 text-[10px] mb-1">
              Kích thước DockBar
            </span>
            <div className="grid grid-cols-3 gap-1">
              {[
                { id: 'compact', label: 'Nhỏ (90%)' },
                { id: 'normal', label: 'Vừa (100%)' },
                { id: 'spacious', label: 'Lớn (105%)' }
              ].map((sz) => (
                <button
                  key={sz.id}
                  type="button"
                  data-testid={`quick-dock-size-${sz.id}`}
                  onClick={() => {
                    setDockSize(sz.id as any);
                  }}
                  className={`py-1 px-1 rounded-lg text-center font-medium text-[9px] transition cursor-pointer border ${
                    dockSize === sz.id
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold'
                      : 'bg-white/5 text-neutral-300 hover:bg-white/10 border-white/5'
                  }`}
                >
                  {sz.label}
                </button>
              ))}
            </div>
          </div>

          {/* Chế độ Eco Mode 🍃 */}
          <div className="pt-1.5 border-t border-white/10 flex items-center justify-between">
            <span className="font-semibold text-neutral-300 text-[10px] flex items-center gap-1">
              <span>🍃</span> Eco Mode Siêu Nhẹ
            </span>
            <button
              type="button"
              data-testid="quick-dock-eco-toggle"
              onClick={() => setEcoMode(!isEcoMode)}
              className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold transition cursor-pointer border ${
                isEcoMode
                  ? 'bg-emerald-500/30 text-emerald-300 border-emerald-500/50'
                  : 'bg-white/5 text-zinc-400 border-white/10 hover:text-white'
              }`}
            >
              {isEcoMode ? 'BẬT' : 'TẮT'}
            </button>
          </div>
        </div>
      )}
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
