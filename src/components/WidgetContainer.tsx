import React, { useRef, useState } from 'react';
import { X, GripHorizontal } from 'lucide-react';
import { WidgetId } from '../types/layout';
import { useLayoutStore } from '../stores/useLayoutStore';

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
  const {
    widgets,
    isMobile,
    updateWidgetPosition,
    updateWidgetSize,
    bringToFront,
    closeWidget
  } = useLayoutStore();

  const widget = widgets[id];
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    pointerX: number;
    pointerY: number;
  }>({ startX: 0, startY: 0, pointerX: 0, pointerY: 0 });

  const resizeStartRef = useRef<{
    startW: number;
    startH: number;
    pointerX: number;
    pointerY: number;
  }>({ startW: 0, startH: 0, pointerX: 0, pointerY: 0 });

  if (!widget || !widget.isOpen) {
    return null;
  }

  // Xử lý kéo thả bằng Pointer Events (Desktop)
  const handlePointerDownHeader = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isMobile) return;

    // Không kích hoạt kéo nếu click trúng button, input, textarea, a
    const target = e.target as HTMLElement;
    if (target.closest('button, input, textarea, select, a, [data-no-drag="true"]')) {
      return;
    }

    bringToFront(id);
    setIsDragging(true);

    dragStartRef.current = {
      startX: widget.x,
      startY: widget.y,
      pointerX: e.clientX,
      pointerY: e.clientY
    };

    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMoveHeader = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || isMobile) return;

    const deltaX = e.clientX - dragStartRef.current.pointerX;
    const deltaY = e.clientY - dragStartRef.current.pointerY;

    const nextX = dragStartRef.current.startX + deltaX;
    const nextY = dragStartRef.current.startY + deltaY;

    // Giới hạn biên màn hình để widget không bao giờ bị kéo ra ngoài tầm nhìn
    const maxX = Math.max(10, window.innerWidth - widget.width - 16);
    const maxY = Math.max(60, window.innerHeight - 80);

    const clampedX = Math.max(10, Math.min(nextX, maxX));
    const clampedY = Math.max(50, Math.min(nextY, maxY));

    updateWidgetPosition(id, clampedX, clampedY);
  };

  const handlePointerUpHeader = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Pointer capture đã được tự động giải phóng
      }
    }
  };

  // Xử lý thay đổi kích thước (Resize Handle)
  const handlePointerDownResize = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isMobile || !widget.resizable) return;
    e.stopPropagation();

    bringToFront(id);
    setIsResizing(true);

    resizeStartRef.current = {
      startW: widget.width,
      startH: widget.height,
      pointerX: e.clientX,
      pointerY: e.clientY
    };

    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMoveResize = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isResizing || isMobile || !widget.resizable) return;

    const deltaX = e.clientX - resizeStartRef.current.pointerX;
    const deltaY = e.clientY - resizeStartRef.current.pointerY;

    const nextW = resizeStartRef.current.startW + deltaX;
    const nextH = resizeStartRef.current.startH + deltaY;

    // Giới hạn không vượt quá kích thước màn hình
    const maxAllowedW = Math.max(widget.minWidth, window.innerWidth - widget.x - 16);
    const maxAllowedH = Math.max(widget.minHeight, window.innerHeight - widget.y - 20);

    const clampedW = Math.max(widget.minWidth, Math.min(nextW, maxAllowedW));
    const clampedH = Math.max(widget.minHeight, Math.min(nextH, maxAllowedH));

    updateWidgetSize(id, clampedW, clampedH);
  };

  const handlePointerUpResize = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isResizing) {
      setIsResizing(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Pointer capture đã tự giải phóng
      }
    }
  };

  // Mobile layout: render dạng block trong luồng cuộn dọc
  if (isMobile) {
    return (
      <section
        ref={containerRef}
        data-testid={`widget-container-${id}`}
        aria-label={widget.title}
        className={`w-full max-w-xl mx-auto mb-6 rounded-3xl border border-white/10 bg-slate-900/80 shadow-2xl backdrop-blur-xl overflow-hidden flex flex-col ${className}`}
      >
        {/* Mobile Header Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-slate-950/40 select-none">
          <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            {widget.title}
          </h2>
          <button
            type="button"
            data-testid={`close-widget-${id}`}
            onClick={() => closeWidget(id)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:outline-none cursor-pointer min-w-[32px] min-h-[32px] flex items-center justify-center"
            title={`Đóng ${widget.title}`}
            aria-label={`Đóng ${widget.title}`}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 flex-1 overflow-y-auto">{children}</div>
      </section>
    );
  }

  // Desktop layout: Cửa sổ nổi tự do (Floating Window)
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
        height: `${widget.height}px`,
        zIndex: widget.zIndex
      }}
      className={`rounded-3xl border border-white/10 bg-slate-900/90 shadow-2xl backdrop-blur-xl flex flex-col overflow-hidden transition-shadow duration-150 ${
        isDragging ? 'ring-2 ring-cyan-500/50 shadow-cyan-500/10' : ''
      } ${className}`}
    >
      {/* Desktop Drag Handle Header */}
      <div
        data-drag-handle="true"
        onPointerDown={handlePointerDownHeader}
        onPointerMove={handlePointerMoveHeader}
        onPointerUp={handlePointerUpHeader}
        onPointerCancel={handlePointerUpHeader}
        className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-slate-950/50 cursor-grab active:cursor-grabbing select-none shrink-0 touch-none"
        title="Kéo thả để di chuyển cửa sổ"
      >
        <div className="flex items-center gap-2">
          <GripHorizontal size={14} className="text-slate-500 hover:text-slate-300" />
          <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            {widget.title}
          </h2>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            data-testid={`close-widget-${id}`}
            onClick={() => closeWidget(id)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:outline-none cursor-pointer min-w-[32px] min-h-[32px] flex items-center justify-center"
            title={`Đóng ${widget.title}`}
            aria-label={`Đóng ${widget.title}`}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Widget Content Body */}
      <div className="flex-1 overflow-y-auto p-4 relative">{children}</div>

      {/* Resize Handle (Bottom-Right) */}
      {widget.resizable && (
        <div
          data-testid={`resize-handle-${id}`}
          onPointerDown={handlePointerDownResize}
          onPointerMove={handlePointerMoveResize}
          onPointerUp={handlePointerUpResize}
          onPointerCancel={handlePointerUpResize}
          className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize flex items-end justify-end p-1 text-slate-500 hover:text-cyan-400 touch-none transition-colors select-none"
          title="Kéo góc để thay đổi kích thước"
          aria-label="Thay đổi kích thước cửa sổ"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
            <circle cx="8" cy="8" r="1.2" />
            <circle cx="8" cy="4" r="1.2" />
            <circle cx="4" cy="8" r="1.2" />
          </svg>
        </div>
      )}
    </section>
  );
};
