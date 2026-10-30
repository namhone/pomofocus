import React, { useRef, useState } from 'react';
import { X, GripHorizontal, Minus, Maximize2, Minimize2, Play, Pause, Lock, Unlock } from 'lucide-react';
import { WidgetId } from '../types/layout';
import { useLayoutStore } from '../stores/useLayoutStore';
import { useTimerStore } from '../stores/useTimerStore';
import { CollapsedWidgetCard } from './CollapsedWidgetCard';

interface WidgetContainerProps {
  id: WidgetId;
  children: React.ReactNode;
  className?: string;
}

export const WidgetContainer: React.FC<WidgetContainerProps> = ({
  id,
  children,
  className = ''
}) => {
  const widget = useLayoutStore((state) => state.widgets[id]);
  const isMobile = useLayoutStore((state) => state.isMobile);
  const density = useLayoutStore((state) => state.density);
  const isLayoutEditMode = useLayoutStore((state) => state.isLayoutEditMode);
  const glassSettings = useLayoutStore((state) => state.glassSettings);
  const snapEnabled = useLayoutStore((state) => state.snapEnabled);
  const updateWidgetPosition = useLayoutStore((state) => state.updateWidgetPosition);
  const updateWidgetSize = useLayoutStore((state) => state.updateWidgetSize);
  const placeWidget = useLayoutStore((state) => state.placeWidget);
  const saveLayout = useLayoutStore((state) => state.saveLayout);
  const bringToFront = useLayoutStore((state) => state.bringToFront);
  const closeWidget = useLayoutStore((state) => state.closeWidget);
  const toggleCollapseWidget = useLayoutStore((state) => state.toggleCollapseWidget);
  const setWidgetLocked = useLayoutStore((state) => state.setWidgetLocked);
  const toggleMiniPill = useLayoutStore((state) => state.toggleMiniPill);
  const timerStatus = useTimerStore((state) =>
    id === 'timer' ? state.status : 'idle'
  );
  const remainingMs = useTimerStore((state) =>
    id === 'timer' ? state.remainingMs : 0
  );
  const timerStart = useTimerStore((state) => state.start);
  const timerPause = useTimerStore((state) => state.pause);

  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const isResizingRef = useRef(false);

  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    pointerX: number;
    pointerY: number;
  }>({ startX: 0, startY: 0, pointerX: 0, pointerY: 0 });

  const resizeStartRef = useRef<{
    startW: number;
    startH: number;
    startX: number;
    startY: number;
    pointerX: number;
    pointerY: number;
    direction: string;
  }>({ startW: 0, startH: 0, startX: 0, startY: 0, pointerX: 0, pointerY: 0, direction: 'se' });

  if (!widget || !widget.isOpen) {
    return null;
  }

  // Format time for Mini Timer Pill
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  // Chiều cao khi thu nhỏ: Hiển thị dạng Card thông tin cốt lõi (106px cho mọi widget)
  const collapsedHeight = density === 'compact' ? 100 : 108;

  // Xử lý kéo thả bằng Pointer Events (Desktop & Mini Pill)
  const handlePointerDownHeader = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isMobile || widget.isLocked) return;

    // Không kích hoạt kéo nếu click trúng button, input, textarea, select, a
    const target = e.target as HTMLElement;
    if (target.closest('button, input, textarea, select, a, [data-no-drag="true"]')) {
      return;
    }

    dragStartRef.current = {
      startX: widget.x,
      startY: widget.y,
      pointerX: e.clientX,
      pointerY: e.clientY
    };

    e.currentTarget.setPointerCapture(e.pointerId);
    bringToFront(id);
    setIsDragging(true);
  };

  const handlePointerMoveHeader = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || isMobile || widget.isLocked) return;

    const deltaX = e.clientX - dragStartRef.current.pointerX;
    const deltaY = e.clientY - dragStartRef.current.pointerY;

    const nextX = dragStartRef.current.startX + deltaX;
    const nextY = dragStartRef.current.startY + deltaY;

    // Giới hạn biên màn hình để widget không bao giờ bị kéo ra ngoài tầm nhìn
    const width = widget.isMiniPill ? 190 : widget.width;
    const height = widget.isMiniPill ? 52 : widget.isCollapsed ? collapsedHeight : widget.height;
    const maxX = Math.max(10, window.innerWidth - width - 12);
    const maxY = Math.max(50, window.innerHeight - height - 12);

    let targetX = Math.max(10, Math.min(nextX, maxX));
    let targetY = Math.max(50, Math.min(nextY, maxY));

    if (snapEnabled && !widget.isMiniPill) {
      // 16px Grid snapping
      const GRID = 16;
      let snappedX = Math.round(targetX / GRID) * GRID;
      let snappedY = Math.round(targetY / GRID) * GRID;

      // Magnetic snap to neighboring open widgets (12px threshold)
      const SNAP_DIST = 12;
      const otherWidgets = Object.values(useLayoutStore.getState().widgets).filter(
        (w) => w.id !== id && w.isOpen && !w.isMiniPill
      );
      for (const other of otherWidgets) {
        // Snap left edge to other's right edge
        if (Math.abs(targetX - (other.x + other.width + 12)) < SNAP_DIST) {
          snappedX = other.x + other.width + 12;
        }
        // Snap right edge to other's left edge
        if (Math.abs(targetX + width + 12 - other.x) < SNAP_DIST) {
          snappedX = other.x - width - 12;
        }
        // Snap top edge to other's top edge
        if (Math.abs(targetY - other.y) < SNAP_DIST) {
          snappedY = other.y;
        }
      }

      targetX = Math.max(10, Math.min(snappedX, maxX));
      targetY = Math.max(50, Math.min(snappedY, maxY));
    }

    updateWidgetPosition(id, targetX, targetY, false);
  };

  const handlePointerUpHeader = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      const current = useLayoutStore.getState().widgets[id];
      placeWidget(id, current.x, current.y);
      setIsDragging(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Pointer capture đã được tự động giải phóng
      }
    }
  };

  // Xử lý thay đổi kích thước tự do theo ý người dùng trong giới hạn min/max
  const handlePointerDownResize = (e: React.PointerEvent<HTMLButtonElement>, direction: string) => {
    if (
      isMobile ||
      widget.isLocked ||
      !widget.resizable ||
      widget.isCollapsed ||
      widget.isMiniPill
    ) return;
    e.stopPropagation();
    e.preventDefault();

    const start = {
      startW: widget.width,
      startH: widget.height,
      startX: widget.x,
      startY: widget.y,
      pointerX: e.clientX,
      pointerY: e.clientY,
      direction
    };

    resizeStartRef.current = start;
    isResizingRef.current = true;
    setIsResizing(true);
    bringToFront(id);

    const onPointerMove = (ev: PointerEvent) => {
      if (!isResizingRef.current) return;
      const deltaX = ev.clientX - start.pointerX;
      const deltaY = ev.clientY - start.pointerY;
      const west = start.direction.includes('w');
      const north = start.direction.includes('n');
      const east = start.direction.includes('e');
      const south = start.direction.includes('s');
      const requestedWidth = start.startW + (east ? deltaX : west ? -deltaX : 0);
      const requestedHeight = start.startH + (south ? deltaY : north ? -deltaY : 0);

      const currentWidget = useLayoutStore.getState().widgets[id];
      const minW = currentWidget.minWidth ?? 280;
      const minH = currentWidget.minHeight ?? 240;
      const maxW = currentWidget.maxWidth ?? 900;
      const maxH = currentWidget.maxHeight ?? 900;

      const screenMaxW = Math.max(minW, window.innerWidth - (west ? 10 : start.startX) - 12);
      const screenMaxH = Math.max(minH, window.innerHeight - (north ? 50 : start.startY) - 12);

      const effectiveMaxW = Math.min(maxW, screenMaxW);
      const effectiveMaxH = Math.min(maxH, screenMaxH);

      const width = Math.max(minW, Math.min(requestedWidth, effectiveMaxW));
      const height = Math.max(minH, Math.min(requestedHeight, effectiveMaxH));
      const x = west ? start.startX + start.startW - width : start.startX;
      const y = north ? start.startY + start.startH - height : start.startY;

      updateWidgetSize(id, width, height, false);
      updateWidgetPosition(id, x, y, false);
    };

    const onPointerUp = () => {
      if (isResizingRef.current) {
        const current = useLayoutStore.getState().widgets[id];
        placeWidget(id, current.x, current.y);
        saveLayout();
        isResizingRef.current = false;
        setIsResizing(false);
      }
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  const handlePointerMoveResize = (_e: React.PointerEvent<HTMLButtonElement>) => {
    // Để giữ tương thích nếu element gọi trực tiếp
    if (!isResizingRef.current || isMobile || widget.isLocked || !widget.resizable || widget.isCollapsed || widget.isMiniPill) return;
  };

  const handlePointerUpResize = () => {
    if (isResizingRef.current) {
      const current = useLayoutStore.getState().widgets[id];
      placeWidget(id, current.x, current.y);
      saveLayout();
      isResizingRef.current = false;
      setIsResizing(false);
    }
  };

  // Mobile layout: render dạng block trong luồng cuộn dọc
  if (isMobile) {
    return (
      <section
        ref={containerRef}
        data-testid={`widget-container-${id}`}
        aria-label={widget.title}
        style={{
          backgroundColor: `rgba(14, 17, 25, ${glassSettings.opacity / 100})`,
          backdropFilter: `blur(${glassSettings.blur}px) saturate(180%)`,
          WebkitBackdropFilter: `blur(${glassSettings.blur}px) saturate(180%)`,
          ...(glassSettings.preset === 'high_contrast'
            ? {
                borderTopColor: 'rgba(255, 255, 255, 0.45)',
                borderLeftColor: 'rgba(255, 255, 255, 0.22)',
                borderRightColor: 'rgba(255, 255, 255, 0.22)',
                borderBottomColor: 'rgba(255, 255, 255, 0.15)'
              }
            : {})
        }}
        className={`w-full max-w-xl mx-auto mb-5 rounded-[20px] border-t border-t-white/[0.24] border-b border-b-white/[0.06] border-x border-x-white/[0.10] shadow-[0_16px_36px_-6px_rgba(0,0,0,0.5),inset_0_1px_1px_0_rgba(255,255,255,0.18)] overflow-hidden flex flex-col touch-pan-y ${className}`}
      >
        {/* Mobile Header Bar */}
        <div className="h-10 flex items-center justify-between px-3.5 border-b border-white/[0.08] bg-white/[0.02] select-none touch-pan-y">
          <h2 className="text-[13px] font-medium text-neutral-200 tracking-tight">
            {widget.title}
          </h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              data-testid={`collapse-widget-${id}`}
              onClick={() => toggleCollapseWidget(id)}
              className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors focus-visible:ring-1 focus-visible:ring-neutral-400 cursor-pointer min-w-[32px] min-h-[32px] flex items-center justify-center"
              title={widget.isCollapsed ? 'Mở rộng' : 'Thu nhỏ'}
              aria-label={widget.isCollapsed ? 'Mở rộng' : 'Thu nhỏ'}
            >
              {widget.isCollapsed ? <Maximize2 size={13} strokeWidth={1.75} /> : <Minus size={13} strokeWidth={1.75} />}
            </button>
            <button
              type="button"
              data-testid={`close-widget-${id}`}
              onClick={() => closeWidget(id)}
              className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors focus-visible:ring-1 focus-visible:ring-neutral-400 cursor-pointer min-w-[32px] min-h-[32px] flex items-center justify-center"
              title={`Đóng ${widget.title}`}
              aria-label={`Đóng ${widget.title}`}
            >
              <X size={15} strokeWidth={1.75} />
            </button>
          </div>
        </div>

        {/* Mobile Content: Card thu nhỏ khi isCollapsed, Full children khi mở rộng */}
        {widget.isCollapsed ? (
          <div className="p-3 touch-pan-y">
            <CollapsedWidgetCard id={id} isMobile={true} />
          </div>
        ) : (
          <div className="p-4 flex-1 min-h-0 overflow-visible touch-pan-y">{children}</div>
        )}
      </section>
    );
  }

  // Mini Timer Pill (Apple Dynamic Island style) - 190px x 52px
  if (id === 'timer' && widget.isMiniPill) {
    return (
      <section
        ref={containerRef}
        data-testid="widget-container-timer"
        aria-label="Đồng hồ Pomodoro Mini"
        onMouseDown={() => bringToFront('timer')}
        onPointerDown={handlePointerDownHeader}
        onPointerMove={handlePointerMoveHeader}
        onPointerUp={handlePointerUpHeader}
        onPointerCancel={handlePointerUpHeader}
        style={{
          position: 'absolute',
          left: `${widget.x}px`,
          top: `${widget.y}px`,
          width: '190px',
          height: '52px',
          zIndex: widget.zIndex,
          backgroundColor: `rgba(12, 15, 22, ${Math.min(0.9, (glassSettings.opacity + 10) / 100)})`,
          backdropFilter: `blur(${glassSettings.blur}px) saturate(180%)`,
          WebkitBackdropFilter: `blur(${glassSettings.blur}px) saturate(180%)`,
          ...(glassSettings.preset === 'high_contrast'
            ? {
                borderTopColor: 'rgba(255, 255, 255, 0.45)',
                borderLeftColor: 'rgba(255, 255, 255, 0.22)',
                borderRightColor: 'rgba(255, 255, 255, 0.22)',
                borderBottomColor: 'rgba(255, 255, 255, 0.15)'
              }
            : {})
        }}
        className={`rounded-full border-t border-t-white/[0.28] border-b border-b-white/[0.06] border-x border-x-white/[0.12] shadow-[0_16px_36px_-6px_rgba(0,0,0,0.5),inset_0_1px_1px_0_rgba(255,255,255,0.22)] flex items-center justify-between px-3.5 select-none touch-none cursor-grab active:cursor-grabbing hover:border-white/30 transition-[box-shadow,border-color] duration-150 ${
          isDragging ? 'ring-2 ring-white/30 shadow-2xl' : ''
        } ${className}`}
      >
        <h2 className="sr-only">Đồng hồ Pomodoro</h2>

        {/* Status indicator & Countdown */}
        <div className="flex items-center gap-2.5">
          <span
            data-testid="mini-timer-status-dot"
            className={`w-2 h-2 rounded-full transition-all ${
              timerStatus === 'running'
                ? 'bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse'
                : timerStatus === 'paused'
                ? 'bg-amber-400 shadow-[0_0_6px_#fbbf24]'
                : 'bg-neutral-500'
            }`}
            title={timerStatus === 'running' ? 'Đang chạy' : timerStatus === 'paused' ? 'Tạm dừng' : 'Chờ'}
          />
          <span
            data-testid="timer-display"
            className="font-mono text-base font-semibold text-white tracking-tight tabular-nums select-none"
          >
            {formattedTime}
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1.5" data-no-drag="true">
          <button
            type="button"
            data-testid="mini-timer-play-btn"
            onClick={(e) => {
              e.stopPropagation();
              if (timerStatus === 'running') {
                timerPause();
              } else {
                timerStart();
              }
            }}
            className="w-7 h-7 rounded-full bg-white/12 hover:bg-white/22 active:scale-95 flex items-center justify-center text-white transition-all cursor-pointer"
            title={timerStatus === 'running' ? 'Tạm dừng' : 'Bắt đầu'}
            aria-label={timerStatus === 'running' ? 'Tạm dừng' : 'Bắt đầu'}
          >
            {timerStatus === 'running' ? (
              <Pause size={12} fill="currentColor" />
            ) : (
              <Play size={12} fill="currentColor" className="ml-0.5" />
            )}
          </button>
          <button
            type="button"
            data-testid="mini-timer-expand-btn"
            onClick={(e) => {
              e.stopPropagation();
              toggleMiniPill('timer');
            }}
            className="w-7 h-7 rounded-full bg-white/6 hover:bg-white/16 active:scale-95 flex items-center justify-center text-neutral-300 hover:text-white transition-all cursor-pointer"
            title="Mở rộng cửa sổ Pomodoro"
            aria-label="Mở rộng cửa sổ Pomodoro"
          >
            <Maximize2 size={12} strokeWidth={2} />
          </button>
        </div>
      </section>
    );
  }

  // Desktop layout: Cửa sổ nổi tự do (Floating Window)
  const isCollapsed = widget.isCollapsed;
  const currentHeight = isCollapsed ? collapsedHeight : widget.height;

  return (
    <section
      ref={containerRef}
      data-testid={`widget-container-${id}`}
      aria-label={widget.title}
      onMouseDown={() => bringToFront(id)}
      style={{
        position: 'absolute',
        left: `${widget.x}px`,
        top: `${widget.y}px`,
        width: `${widget.width}px`,
        height: `${currentHeight}px`,
        zIndex: widget.zIndex,
        backgroundColor:
          id === 'timer'
            ? `rgba(12, 15, 22, ${glassSettings.opacity / 100})`
            : `rgba(15, 18, 26, ${Math.max(0.18, (glassSettings.opacity - 4) / 100)})`,
        backdropFilter: `blur(${glassSettings.blur}px) saturate(180%)`,
        WebkitBackdropFilter: `blur(${glassSettings.blur}px) saturate(180%)`,
        ...(glassSettings.preset === 'high_contrast'
          ? {
              borderTopColor: 'rgba(255, 255, 255, 0.45)',
              borderLeftColor: 'rgba(255, 255, 255, 0.22)',
              borderRightColor: 'rgba(255, 255, 255, 0.22)',
              borderBottomColor: 'rgba(255, 255, 255, 0.15)',
              boxShadow: '0 28px 60px -12px rgba(0,0,0,0.75), inset 0 1px 1px 0 rgba(255,255,255,0.32)'
            }
          : {})
      }}
      data-layout-editing={isLayoutEditMode ? 'true' : undefined}
      className={`rounded-[20px] border-t ${
        id === 'timer'
          ? 'border-t-white/[0.28] shadow-[0_28px_60px_-12px_rgba(0,0,0,0.55),inset_0_1px_1px_0_rgba(255,255,255,0.22),inset_0_0_24px_rgba(255,255,255,0.02)]'
          : 'border-t-white/[0.20] shadow-[0_24px_50px_-12px_rgba(0,0,0,0.45),inset_0_1px_1px_0_rgba(255,255,255,0.16),inset_0_0_20px_rgba(255,255,255,0.015)]'
      } border-b border-b-white/[0.05] border-x border-x-white/[0.10] flex flex-col overflow-hidden transition-[box-shadow,border-color] duration-150 ${
        isDragging || isResizing ? 'ring-2 ring-emerald-300/45 shadow-2xl' : ''
      } ${
        isLayoutEditMode ? 'outline outline-1 outline-dashed outline-white/25' : ''
      } ${className}`}
    >
      {/* Desktop Drag Handle Header */}
      <div
        data-drag-handle="true"
        onPointerDown={handlePointerDownHeader}
        onPointerMove={handlePointerMoveHeader}
        onPointerUp={handlePointerUpHeader}
        onPointerCancel={handlePointerUpHeader}
        className={`relative z-20 ${
          density === 'compact' ? 'h-8 px-2.5' : 'h-9 px-3'
        } flex items-center justify-between gap-2 border-b border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] ${
          !isMobile && !widget.isLocked ? 'cursor-grab active:cursor-grabbing touch-none' : 'cursor-default'
        } select-none shrink-0 transition-colors`}
        title={widget.isLocked ? 'Widget đang khóa' : 'Kéo để di chuyển widget'}
      >
        <div className="flex min-w-0 items-center gap-2">
          <GripHorizontal size={13} strokeWidth={1.75} className={`shrink-0 ${widget.isLocked ? 'text-neutral-600' : isLayoutEditMode ? 'text-emerald-300' : 'text-neutral-400'}`} />
          <h2 className={`${density === 'compact' ? 'text-xs' : 'text-[13px]'} font-medium text-neutral-200 tracking-tight`}>
            {widget.title}
          </h2>
        </div>

        <div className="flex shrink-0 items-center gap-1" data-no-drag="true">
          {isLayoutEditMode && (
            <button
              type="button"
              data-testid={`lock-widget-${id}`}
              onClick={() => setWidgetLocked(id, !widget.isLocked)}
              className={`flex min-h-8 min-w-8 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/50 ${
                widget.isLocked ? 'text-amber-300 hover:bg-amber-500/10' : 'text-neutral-400 hover:bg-white/10 hover:text-white'
              }`}
              title={widget.isLocked ? 'Mở khóa widget' : 'Khóa vị trí và kích thước'}
              aria-label={widget.isLocked ? `Mở khóa ${widget.title}` : `Khóa ${widget.title}`}
              aria-pressed={Boolean(widget.isLocked)}
            >
              {widget.isLocked ? <Lock size={13} /> : <Unlock size={13} />}
            </button>
          )}

          {/* Mini Pill Toggle for Timer */}
          {id === 'timer' && !isCollapsed && (
            <button
              type="button"
              data-testid="btn-toggle-mini-pill-timer"
              onClick={(e) => {
                e.stopPropagation();
                toggleMiniPill('timer');
              }}
              className="flex min-h-8 min-w-8 items-center justify-center rounded-lg p-1 text-neutral-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400 cursor-pointer"
              title="Thu nhỏ thành Mini Pill"
              aria-label="Thu nhỏ thành Mini Pill"
            >
              <Minimize2 size={13} strokeWidth={1.75} />
            </button>
          )}

          <button
            type="button"
            data-testid={`collapse-widget-${id}`}
            onClick={(e) => {
              e.stopPropagation();
              toggleCollapseWidget(id);
            }}
            className="flex min-h-8 min-w-8 items-center justify-center rounded-lg p-1 text-neutral-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400 cursor-pointer"
            title={isCollapsed ? 'Mở rộng cửa sổ' : 'Thu nhỏ cửa sổ'}
            aria-label={isCollapsed ? 'Mở rộng cửa sổ' : 'Thu nhỏ cửa sổ'}
          >
            {isCollapsed ? <Maximize2 size={13} strokeWidth={1.75} /> : <Minus size={13} strokeWidth={1.75} />}
          </button>
          <button
            type="button"
            data-testid={`close-widget-${id}`}
            onClick={() => closeWidget(id)}
            className="flex min-h-8 min-w-8 items-center justify-center rounded-lg p-1 text-neutral-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400 cursor-pointer"
            title={`Đóng ${widget.title}`}
            aria-label={`Đóng ${widget.title}`}
          >
            <X size={14} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* Drag & Resize Pointer Shield: ngăn iframe nuốt pointer events khi đang kéo thả */}
      {(isDragging || isResizing) && (
        <div
          className="absolute inset-0 z-50 pointer-events-auto bg-transparent select-none cursor-grabbing"
          style={{ touchAction: 'none' }}
        />
      )}

      {/* Collapsed Widget Card: Render dạng thẻ thông tin cốt lõi cho TẤT CẢ các widget */}
      {isCollapsed && (
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col justify-center p-1.5 sm:p-2">
          <CollapsedWidgetCard id={id} isMobile={false} />
        </div>
      )}

      {/* Widget Content Body: Giữ mount trong DOM để bảo toàn state, bộ đếm, form input khi thu nhỏ */}
      <div
        className={`relative min-h-0 flex-1 overflow-x-hidden overscroll-contain ${
          isCollapsed ? 'hidden' : 'flex flex-col'
        } ${
          density === 'compact' ? 'p-2.5' : 'p-3'
        } ${
          id === 'timer' ? 'overflow-y-auto items-center justify-start w-full' : 'overflow-y-hidden'
        }`}
      >
        {children}
      </div>

      {!isCollapsed && widget.resizable && !widget.isLocked && (
        <>
          {[
            { direction: 'n', classes: 'left-3 right-3 top-0 h-2 -translate-y-1/2 cursor-n-resize' },
            { direction: 's', classes: 'bottom-0 left-3 right-3 h-2 translate-y-1/2 cursor-s-resize' },
            { direction: 'e', classes: 'right-0 top-3 bottom-3 w-2 translate-x-1/2 cursor-e-resize' },
            { direction: 'w', classes: 'left-0 top-3 bottom-3 w-2 -translate-x-1/2 cursor-w-resize' },
            { direction: 'ne', classes: 'right-0 top-0 h-4 w-4 translate-x-1/2 -translate-y-1/2 cursor-ne-resize' },
            { direction: 'nw', classes: 'left-0 top-0 h-4 w-4 -translate-x-1/2 -translate-y-1/2 cursor-nw-resize' },
            { direction: 'se', classes: 'bottom-0 right-0 h-5 w-5 translate-x-1/4 translate-y-1/4 cursor-se-resize' },
            { direction: 'sw', classes: 'bottom-0 left-0 h-4 w-4 -translate-x-1/2 translate-y-1/2 cursor-sw-resize' }
          ].map(({ direction, classes }) => (
            <button
              key={direction}
              type="button"
              data-testid={direction === 'se' ? `resize-handle-${id}` : `resize-handle-${id}-${direction}`}
              onPointerDown={(event) => handlePointerDownResize(event, direction)}
              onPointerMove={handlePointerMoveResize}
              onPointerUp={handlePointerUpResize}
              onPointerCancel={handlePointerUpResize}
              className={`absolute z-10 touch-none select-none rounded-sm bg-transparent transition-colors hover:bg-emerald-300/30 focus-visible:bg-emerald-300/30 ${
                direction.length === 1 ? 'opacity-70 hover:opacity-100' : ''
              } ${classes}`}
              title={`Thay đổi kích thước từ cạnh ${direction.toUpperCase()}`}
              aria-label={`Thay đổi kích thước từ cạnh ${direction.toUpperCase()}`}
            />
          ))}
        </>
      )}
    </section>
  );
};
