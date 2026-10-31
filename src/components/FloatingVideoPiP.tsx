import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Maximize2, X, GripHorizontal } from 'lucide-react';
import { useAudioStore } from '../stores/useAudioStore';
import { useLayoutStore } from '../stores/useLayoutStore';

interface PiPCoords {
  x: number;
  y: number;
  width: number;
  height: number;
}

const DEFAULT_COORDS: PiPCoords = {
  x: typeof window !== 'undefined' ? Math.max(16, window.innerWidth - 344) : 900,
  y: typeof window !== 'undefined' ? Math.max(16, window.innerHeight - 240) : 600,
  width: 320,
  height: 180
};

const STORAGE_KEY = 'pomodoro_floating_pip_coords';

export const FloatingVideoPiP: React.FC = () => {
  const customMusicType = useAudioStore((s) => s.customMusicType);
  const customMusicPlaying = useAudioStore((s) => s.customMusicPlaying);
  const customMusicUrl = useAudioStore((s) => s.customMusicUrl);
  const setCustomMusicPlaying = useAudioStore((s) => s.setCustomMusicPlaying);

  const soundsWidget = useLayoutStore((s) => s.widgets.sounds);
  const toggleCollapseWidget = useLayoutStore((s) => s.toggleCollapseWidget);

  const isVisible = Boolean(
    soundsWidget?.isOpen &&
    soundsWidget?.isCollapsed &&
    customMusicType === 'youtube' &&
    customMusicPlaying &&
    customMusicUrl
  );

  const [coords, setCoords] = useState<PiPCoords>(() => {
    if (typeof window === 'undefined') return DEFAULT_COORDS;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.width && parsed.height) {
          // Clamp to current screen bounds
          const maxX = Math.max(0, window.innerWidth - parsed.width);
          const maxY = Math.max(0, window.innerHeight - parsed.height);
          return {
            x: Math.max(0, Math.min(parsed.x, maxX)),
            y: Math.max(0, Math.min(parsed.y, maxY)),
            width: Math.max(240, Math.min(parsed.width, 720)),
            height: Math.round(Math.max(240, Math.min(parsed.width, 720)) * 9 / 16)
          };
        }
      }
    } catch {
      // Ignore localStorage parse errors
    }
    return {
      x: Math.max(16, window.innerWidth - 344),
      y: Math.max(16, window.innerHeight - 240),
      width: 320,
      height: 180
    };
  });

  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initX: number; initY: number }>({
    startX: 0,
    startY: 0,
    initX: 0,
    initY: 0
  });
  const resizeStartRef = useRef<{ startX: number; initW: number }>({ startX: 0, initW: 320 });

  // Save coordinates to localStorage on change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(coords));
      } catch {
        // Ignore quota errors
      }
    }
  }, [coords]);

  // Adjust on window resize to keep within screen bounds
  useEffect(() => {
    const handleResize = () => {
      setCoords((prev) => {
        const maxX = Math.max(0, window.innerWidth - prev.width);
        const maxY = Math.max(0, window.innerHeight - prev.height);
        return {
          ...prev,
          x: Math.max(0, Math.min(prev.x, maxX)),
          y: Math.max(0, Math.min(prev.y, maxY))
        };
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Dragging handlers
  const handlePointerDownDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-pip-control="true"]')) return;
    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: coords.x,
      initY: coords.y
    };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignored
    }
  }, [coords.x, coords.y]);

  const handlePointerMoveDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStartRef.current.startX;
    const deltaY = e.clientY - dragStartRef.current.startY;

    const maxX = Math.max(0, window.innerWidth - coords.width);
    const maxY = Math.max(0, window.innerHeight - coords.height);

    const nextX = Math.max(0, Math.min(dragStartRef.current.initX + deltaX, maxX));
    const nextY = Math.max(0, Math.min(dragStartRef.current.initY + deltaY, maxY));

    setCoords((prev) => ({ ...prev, x: nextX, y: nextY }));
  }, [isDragging, coords.width, coords.height]);

  const handlePointerUpDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Ignored
      }
    }
  }, [isDragging]);

  // Resizing handlers
  const handlePointerDownResize = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setIsResizing(true);
    resizeStartRef.current = {
      startX: e.clientX,
      initW: coords.width
    };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignored
    }
  }, [coords.width]);

  const handlePointerMoveResize = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isResizing) return;
    const deltaX = e.clientX - resizeStartRef.current.startX;
    const nextW = Math.max(240, Math.min(resizeStartRef.current.initW + deltaX, 720));
    const nextH = Math.round(nextW * 9 / 16);

    const maxX = Math.max(0, window.innerWidth - nextW);
    const maxY = Math.max(0, window.innerHeight - nextH);

    setCoords((prev) => ({
      x: Math.min(prev.x, maxX),
      y: Math.min(prev.y, maxY),
      width: nextW,
      height: nextH
    }));
  }, [isResizing]);

  const handlePointerUpResize = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (isResizing) {
      setIsResizing(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Ignored
      }
    }
  }, [isResizing]);

  if (!isVisible) return null;

  return (
    <div
      id="floating-video-pip-window"
      data-testid="floating-video-pip-window"
      style={{
        position: 'fixed',
        left: `${coords.x}px`,
        top: `${coords.y}px`,
        width: `${coords.width}px`,
        height: `${coords.height}px`,
        zIndex: 65
      }}
      className={`group fixed rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800 shadow-[0_20px_50px_rgba(0,0,0,0.8)] select-none transition-shadow ${
        isDragging ? 'cursor-grabbing ring-2 ring-zinc-500' : 'cursor-grab'
      }`}
      onPointerDown={handlePointerDownDrag}
      onPointerMove={handlePointerMoveDrag}
      onPointerUp={handlePointerUpDrag}
      onPointerCancel={handlePointerUpDrag}
    >
      {/* Anchor cho GlobalAudioHost neo iframe cố định vào */}
      <div
        id="collapsed-youtube-pip-anchor"
        data-testid="collapsed-youtube-pip-anchor"
        className="w-full h-full bg-black relative pointer-events-none"
      />

      {/* Top Header Bar (100% Draggable & Hover Controls) */}
      <div
        data-drag-handle="true"
        className="absolute inset-x-0 top-0 h-8 bg-zinc-950/85 backdrop-blur-md border-b border-zinc-800/80 flex items-center justify-between px-2.5 z-20 pointer-events-auto"
      >
        <div className="flex items-center gap-1.5 text-zinc-300 pointer-events-none">
          <GripHorizontal size={13} className="text-zinc-400 shrink-0" />
          <span className="text-[10px] font-bold text-zinc-300 tracking-wider uppercase font-mono">PiP Video</span>
        </div>

        <div className="flex items-center gap-1">
          {/* Play/Pause */}
          <button
            type="button"
            data-pip-control="true"
            data-testid="pip-btn-play-pause"
            onClick={(e) => {
              e.stopPropagation();
              setCustomMusicPlaying(!customMusicPlaying);
            }}
            className="p-1 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white transition active:scale-95 cursor-pointer border border-zinc-700/60"
            title={customMusicPlaying ? 'Tạm dừng' : 'Tiếp tục phát'}
          >
            {customMusicPlaying ? <Pause size={11} fill="currentColor" /> : <Play size={11} fill="currentColor" />}
          </button>

          {/* Phóng to về Bảng điều khiển to */}
          <button
            type="button"
            data-pip-control="true"
            data-testid="pip-btn-expand"
            onClick={(e) => {
              e.stopPropagation();
              toggleCollapseWidget('sounds');
            }}
            className="p-1 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white transition active:scale-95 cursor-pointer border border-zinc-700/60"
            title="Mở rộng về bảng điều khiển"
          >
            <Maximize2 size={11} />
          </button>

          {/* Đóng / Dừng phát */}
          <button
            type="button"
            data-pip-control="true"
            data-testid="pip-btn-close"
            onClick={(e) => {
              e.stopPropagation();
              setCustomMusicPlaying(false);
            }}
            className="p-1 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 transition active:scale-95 cursor-pointer border border-zinc-700/60"
            title="Dừng phát video"
          >
            <X size={11} />
          </button>
        </div>
      </div>

      {/* Resize Handle ở góc dưới bên phải */}
      <div
        data-pip-control="true"
        data-testid="pip-resize-handle"
        onPointerDown={handlePointerDownResize}
        onPointerMove={handlePointerMoveResize}
        onPointerUp={handlePointerUpResize}
        onPointerCancel={handlePointerUpResize}
        className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
        title="Kéo để thay đổi kích thước"
      >
        <div className="w-1.5 h-1.5 border-r-2 border-b-2 border-zinc-400" />
      </div>
    </div>
  );
};
