import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Pen,
  Eraser,
  Minus,
  ArrowUpRight,
  Square,
  Circle,
  Type,
  RotateCcw,
  RotateCw,
  Trash2,
  Download,
  AlertTriangle,
  X
} from 'lucide-react';
import {
  ToolType,
  StrokeSize,
  NormalizedPoint,
  WhiteboardStroke,
  WhiteboardDrawPayload,
  WhiteboardUndoPayload,
  WhiteboardSyncRequestPayload,
  WhiteboardSyncSnapshotPayload
} from '../types/whiteboard';
import { RealtimeChannel } from '../lib/supabase';

const COLOR_PALETTE = [
  { name: 'Trắng', hex: '#ffffff' },
  { name: 'Xám nhạt', hex: '#a1a1aa' },
  { name: 'Vàng pastel', hex: '#fef08a' },
  { name: 'Xanh dương pastel', hex: '#93c5fd' },
  { name: 'Đỏ cam nhạt', hex: '#f87171' }
];

const STROKE_SIZES: { label: string; size: StrokeSize; dotPx: number }[] = [
  { label: 'Mảnh', size: 2, dotPx: 4 },
  { label: 'Vừa', size: 4, dotPx: 7 },
  { label: 'Đậm', size: 8, dotPx: 11 }
];

interface WhiteboardViewProps {
  roomId: string;
  currentUserId: string;
  currentUserName: string;
  channel: RealtimeChannel | null;
  isHost: boolean;
}

export const WhiteboardView: React.FC<WhiteboardViewProps> = ({
  roomId,
  currentUserId,
  currentUserName,
  channel,
  isHost
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Tools & Appearance State
  const [activeTool, setActiveTool] = useState<ToolType>('pen');
  const [currentColor, setCurrentColor] = useState<string>('#ffffff');
  const [currentSize, setCurrentSize] = useState<StrokeSize>(2);

  // Stroke History
  const [strokes, setStrokes] = useState<WhiteboardStroke[]>([]);
  const [redoStack, setRedoStack] = useState<WhiteboardStroke[]>([]);

  // Text Tool Inline Input
  const [textInput, setTextInput] = useState<{
    visible: boolean;
    x: number;
    y: number;
    normalizedPoint: NormalizedPoint;
    text: string;
  } | null>(null);

  // Clear Confirmation Modal
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Drawing state
  const isPointerDownRef = useRef(false);
  const currentPointsRef = useRef<NormalizedPoint[]>([]);

  // Redraw full canvas
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // 1. Nền tối dịu mắt
    ctx.fillStyle = '#121214';
    ctx.fillRect(0, 0, width, height);

    // 2. Lưới chấm dot-grid siêu mờ (Khoảng cách 24px)
    const gridSize = 24;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    for (let x = gridSize; x < width; x += gridSize) {
      for (let y = gridSize; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 3. Render các nét vẽ
    strokes.forEach((stroke) => {
      renderStroke(ctx, stroke, width, height);
    });

    // 4. Render nét đang vẽ dở (preview)
    if (isPointerDownRef.current && currentPointsRef.current.length > 0) {
      const draftStroke: WhiteboardStroke = {
        id: 'draft',
        userId: currentUserId,
        tool: activeTool,
        color: currentColor,
        size: currentSize,
        points: currentPointsRef.current,
        createdAt: Date.now()
      };
      renderStroke(ctx, draftStroke, width, height);
    }
  }, [strokes, activeTool, currentColor, currentSize, currentUserId]);

  // Helper render 1 stroke
  const renderStroke = (
    ctx: CanvasRenderingContext2D,
    stroke: WhiteboardStroke,
    width: number,
    height: number
  ) => {
    const { tool, color, size, points, text } = stroke;
    if (points.length === 0) return;

    ctx.save();
    ctx.strokeStyle = tool === 'eraser' ? '#121214' : color;
    ctx.fillStyle = tool === 'eraser' ? '#121214' : color;
    ctx.lineWidth = tool === 'eraser' ? size * 5 : size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const p0 = { x: points[0].x * width, y: points[0].y * height };

    if (tool === 'pen' || tool === 'eraser') {
      if (points.length === 1) {
        ctx.beginPath();
        ctx.arc(p0.x, p0.y, ctx.lineWidth / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        for (let i = 1; i < points.length; i++) {
          const pi = { x: points[i].x * width, y: points[i].y * height };
          // Dùng quadratic curve qua trung điểm để nét mượt mà
          const prev = { x: points[i - 1].x * width, y: points[i - 1].y * height };
          const midX = (prev.x + pi.x) / 2;
          const midY = (prev.y + pi.y) / 2;
          ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
        }
        const last = { x: points[points.length - 1].x * width, y: points[points.length - 1].y * height };
        ctx.lineTo(last.x, last.y);
        ctx.stroke();
      }
    } else if (tool === 'line') {
      const pLast = { x: points[points.length - 1].x * width, y: points[points.length - 1].y * height };
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(pLast.x, pLast.y);
      ctx.stroke();
    } else if (tool === 'arrow') {
      const pLast = { x: points[points.length - 1].x * width, y: points[points.length - 1].y * height };
      // Thân mũi tên
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(pLast.x, pLast.y);
      ctx.stroke();

      // Đầu mũi tên
      const angle = Math.atan2(pLast.y - p0.y, pLast.x - p0.x);
      const headLength = Math.max(12, size * 3.5);
      ctx.beginPath();
      ctx.moveTo(pLast.x, pLast.y);
      ctx.lineTo(
        pLast.x - headLength * Math.cos(angle - Math.PI / 6),
        pLast.y - headLength * Math.sin(angle - Math.PI / 6)
      );
      ctx.moveTo(pLast.x, pLast.y);
      ctx.lineTo(
        pLast.x - headLength * Math.cos(angle + Math.PI / 6),
        pLast.y - headLength * Math.sin(angle + Math.PI / 6)
      );
      ctx.stroke();
    } else if (tool === 'rect') {
      const pLast = { x: points[points.length - 1].x * width, y: points[points.length - 1].y * height };
      const left = Math.min(p0.x, pLast.x);
      const top = Math.min(p0.y, pLast.y);
      const w = Math.abs(pLast.x - p0.x);
      const h = Math.abs(pLast.y - p0.y);
      ctx.beginPath();
      ctx.rect(left, top, w, h);
      ctx.stroke();
    } else if (tool === 'circle') {
      const pLast = { x: points[points.length - 1].x * width, y: points[points.length - 1].y * height };
      const centerX = (p0.x + pLast.x) / 2;
      const centerY = (p0.y + pLast.y) / 2;
      const radiusX = Math.abs(pLast.x - p0.x) / 2;
      const radiusY = Math.abs(pLast.y - p0.y) / 2;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, Math.max(1, radiusX), Math.max(1, radiusY), 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (tool === 'text' && text) {
      ctx.font = `${Math.max(14, size * 5)}px Inter, system-ui, sans-serif`;
      ctx.fillText(text, p0.x, p0.y);
    }

    ctx.restore();
  };

  // Resize canvas when container size changes
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          canvas.width = Math.round(width);
          canvas.height = Math.round(height);
          redrawCanvas();
        }
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [redrawCanvas]);

  // Realtime Supabase Channel Subscriptions
  useEffect(() => {
    if (!channel) return;

    // 1. Nhận nét vẽ từ các thành viên khác
    channel.on('broadcast', { event: 'WHITEBOARD_DRAW' }, (event: { payload: WhiteboardDrawPayload }) => {
      const { stroke, userId } = event.payload;
      if (userId !== currentUserId) {
        setStrokes((prev) => [...prev, stroke]);
      }
    });

    // 2. Nhận yêu cầu xóa sạch bảng
    channel.on('broadcast', { event: 'WHITEBOARD_CLEAR' }, () => {
      setStrokes([]);
      setRedoStack([]);
    });

    // 3. Nhận sự kiện Undo từ peer
    channel.on('broadcast', { event: 'WHITEBOARD_UNDO' }, (event: { payload: WhiteboardUndoPayload }) => {
      const { strokeId } = event.payload;
      setStrokes((prev) => prev.filter((s) => s.id !== strokeId));
    });

    // 4. Nhận yêu cầu đồng bộ từ người mới vào
    channel.on('broadcast', { event: 'WHITEBOARD_SYNC_REQUEST' }, (event: { payload: WhiteboardSyncRequestPayload }) => {
      const { requesterId } = event.payload;
      if (requesterId !== currentUserId) {
        // Gửi toàn bộ strokes hiện tại
        setStrokes((currentStrokes) => {
          if (currentStrokes.length > 0) {
            channel.send({
              type: 'broadcast',
              event: 'WHITEBOARD_SYNC_SNAPSHOT',
              payload: {
                targetId: requesterId,
                strokes: currentStrokes
              }
            });
          }
          return currentStrokes;
        });
      }
    });

    // 5. Nhận snapshot đồng bộ cho chính mình
    channel.on('broadcast', { event: 'WHITEBOARD_SYNC_SNAPSHOT' }, (event: { payload: WhiteboardSyncSnapshotPayload }) => {
      const { targetId, strokes: syncedStrokes } = event.payload;
      if (targetId === currentUserId) {
        setStrokes(syncedStrokes);
      }
    });

    // Chủ động gửi yêu cầu xin snapshot khi vừa mở bảng vẽ
    channel.send({
      type: 'broadcast',
      event: 'WHITEBOARD_SYNC_REQUEST',
      payload: { requesterId: currentUserId }
    });

    return () => {
      // Supabase removeChannel handled externally
    };
  }, [channel, currentUserId]);

  // Trigger redraw whenever strokes change
  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // Pointer event handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const normalized: NormalizedPoint = {
      x: Math.max(0, Math.min(1, x / canvas.width)),
      y: Math.max(0, Math.min(1, y / canvas.height))
    };

    // Text tool: Mở inline input
    if (activeTool === 'text') {
      setTextInput({
        visible: true,
        x,
        y,
        normalizedPoint: normalized,
        text: ''
      });
      return;
    }

    isPointerDownRef.current = true;
    currentPointsRef.current = [normalized];
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    redrawCanvas();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPointerDownRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const normalized: NormalizedPoint = {
      x: Math.max(0, Math.min(1, x / canvas.width)),
      y: Math.max(0, Math.min(1, y / canvas.height))
    };

    if (activeTool === 'pen' || activeTool === 'eraser') {
      currentPointsRef.current.push(normalized);
    } else {
      // Các hình học (line, arrow, rect, circle) chỉ cần điểm đầu và điểm hiện tại
      currentPointsRef.current = [currentPointsRef.current[0], normalized];
    }

    redrawCanvas();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPointerDownRef.current) return;
    isPointerDownRef.current = false;

    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Pointer capture released automatically
    }

    if (currentPointsRef.current.length === 0) return;

    const newStroke: WhiteboardStroke = {
      id: `stroke-${currentUserId}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId: currentUserId,
      userName: currentUserName,
      tool: activeTool,
      color: currentColor,
      size: currentSize,
      points: [...currentPointsRef.current],
      createdAt: Date.now()
    };

    // Thêm vào local state
    setStrokes((prev) => [...prev, newStroke]);
    setRedoStack([]);
    currentPointsRef.current = [];

    // Broadcast cho các thành viên khác
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'WHITEBOARD_DRAW',
        payload: { stroke: newStroke, userId: currentUserId }
      });
    }
  };

  // Submit Text Stroke
  const handleTextSubmit = () => {
    if (!textInput || !textInput.text.trim()) {
      setTextInput(null);
      return;
    }

    const newStroke: WhiteboardStroke = {
      id: `stroke-${currentUserId}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId: currentUserId,
      userName: currentUserName,
      tool: 'text',
      color: currentColor,
      size: currentSize,
      points: [textInput.normalizedPoint],
      text: textInput.text.trim(),
      createdAt: Date.now()
    };

    setStrokes((prev) => [...prev, newStroke]);
    setRedoStack([]);
    setTextInput(null);

    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'WHITEBOARD_DRAW',
        payload: { stroke: newStroke, userId: currentUserId }
      });
    }
  };

  // Undo (Hoàn tác nét gần nhất của mình)
  const handleUndo = () => {
    if (strokes.length === 0) return;
    // Tìm nét gần nhất của user hiện tại (hoặc nét cuối cùng)
    const lastIndex = strokes.map((s) => s.userId).lastIndexOf(currentUserId);
    const targetIndex = lastIndex >= 0 ? lastIndex : strokes.length - 1;
    const removed = strokes[targetIndex];

    const nextStrokes = strokes.filter((_, idx) => idx !== targetIndex);
    setStrokes(nextStrokes);
    setRedoStack((prev) => [...prev, removed]);

    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'WHITEBOARD_UNDO',
        payload: { strokeId: removed.id, userId: currentUserId }
      });
    }
  };

  // Redo (Làm lại)
  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const restored = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setStrokes((prev) => [...prev, restored]);

    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'WHITEBOARD_DRAW',
        payload: { stroke: restored, userId: currentUserId }
      });
    }
  };

  // Clear Board (Xóa sạch)
  const handleClearBoard = () => {
    setStrokes([]);
    setRedoStack([]);
    setShowClearConfirm(false);

    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'WHITEBOARD_CLEAR',
        payload: { userId: currentUserId, userName: currentUserName }
      });
    }
  };

  // Export PNG
  const handleExportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `whiteboard-${roomId}-${new Date().toISOString().slice(0, 10)}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div
      ref={containerRef}
      data-testid="whiteboard-container"
      className="relative w-full h-full flex flex-col overflow-hidden bg-[#121214] select-none"
    >
      {/* Floating Minimalist Monochrome Toolbar */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 p-1.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-2xl backdrop-blur-md max-w-[96vw] overflow-x-auto">
        {/* Tool Selector */}
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl">
          <button
            type="button"
            data-testid="tool-pen"
            onClick={() => setActiveTool('pen')}
            className={`p-2 rounded-lg transition cursor-pointer ${
              activeTool === 'pen'
                ? 'bg-white text-black shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-white hover:bg-white/10'
            }`}
            title="Bút vẽ tự do (Pen)"
          >
            <Pen size={15} />
          </button>

          <button
            type="button"
            data-testid="tool-eraser"
            onClick={() => setActiveTool('eraser')}
            className={`p-2 rounded-lg transition cursor-pointer ${
              activeTool === 'eraser'
                ? 'bg-white text-black shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-white hover:bg-white/10'
            }`}
            title="Tẩy xóa (Eraser)"
          >
            <Eraser size={15} />
          </button>

          <button
            type="button"
            data-testid="tool-line"
            onClick={() => setActiveTool('line')}
            className={`p-2 rounded-lg transition cursor-pointer ${
              activeTool === 'line'
                ? 'bg-white text-black shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-white hover:bg-white/10'
            }`}
            title="Đường thẳng (Line)"
          >
            <Minus size={15} />
          </button>

          <button
            type="button"
            data-testid="tool-arrow"
            onClick={() => setActiveTool('arrow')}
            className={`p-2 rounded-lg transition cursor-pointer ${
              activeTool === 'arrow'
                ? 'bg-white text-black shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-white hover:bg-white/10'
            }`}
            title="Mũi tên (Arrow)"
          >
            <ArrowUpRight size={15} />
          </button>

          <button
            type="button"
            data-testid="tool-rect"
            onClick={() => setActiveTool('rect')}
            className={`p-2 rounded-lg transition cursor-pointer ${
              activeTool === 'rect'
                ? 'bg-white text-black shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-white hover:bg-white/10'
            }`}
            title="Hình chữ nhật (Rectangle)"
          >
            <Square size={15} />
          </button>

          <button
            type="button"
            data-testid="tool-circle"
            onClick={() => setActiveTool('circle')}
            className={`p-2 rounded-lg transition cursor-pointer ${
              activeTool === 'circle'
                ? 'bg-white text-black shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-white hover:bg-white/10'
            }`}
            title="Hình tròn (Circle)"
          >
            <Circle size={15} />
          </button>

          <button
            type="button"
            data-testid="tool-text"
            onClick={() => setActiveTool('text')}
            className={`p-2 rounded-lg transition cursor-pointer ${
              activeTool === 'text'
                ? 'bg-white text-black shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-white hover:bg-white/10'
            }`}
            title="Chèn văn bản (Text)"
          >
            <Type size={15} />
          </button>
        </div>

        {/* Stroke Size Selector */}
        {activeTool !== 'text' && (
          <div className="flex items-center gap-1 px-1.5 py-1 bg-white/5 rounded-xl border border-white/5">
            {STROKE_SIZES.map((item) => (
              <button
                key={item.label}
                type="button"
                data-testid={`size-${item.size}`}
                onClick={() => setCurrentSize(item.size)}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition cursor-pointer ${
                  currentSize === item.size
                    ? 'bg-white/20 text-white font-bold'
                    : 'text-zinc-400 hover:text-white hover:bg-white/10'
                }`}
                title={`Độ dày nét: ${item.label}`}
              >
                <span
                  className="rounded-full bg-current block"
                  style={{ width: item.dotPx, height: item.dotPx }}
                />
              </button>
            ))}
          </div>
        )}

        {/* Color Palette (Tối giản tinh tế) */}
        {activeTool !== 'eraser' && (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded-xl border border-white/5">
            {COLOR_PALETTE.map((c) => (
              <button
                key={c.hex}
                type="button"
                data-testid={`color-${c.hex}`}
                onClick={() => setCurrentColor(c.hex)}
                className={`w-5 h-5 rounded-full transition-transform cursor-pointer border ${
                  currentColor === c.hex
                    ? 'scale-125 border-white ring-2 ring-white/30'
                    : 'border-transparent hover:scale-110 opacity-75 hover:opacity-100'
                }`}
                style={{ backgroundColor: c.hex }}
                title={c.name}
              />
            ))}
          </div>
        )}

        {/* Actions: Undo / Redo / Clear / Export */}
        <div className="flex items-center gap-1 pl-1 border-l border-white/10">
          <button
            type="button"
            data-testid="btn-undo"
            onClick={handleUndo}
            disabled={strokes.length === 0}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            title="Hoàn tác (Undo)"
          >
            <RotateCcw size={14} />
          </button>

          <button
            type="button"
            data-testid="btn-redo"
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            title="Làm lại (Redo)"
          >
            <RotateCw size={14} />
          </button>

          <button
            type="button"
            data-testid="btn-confirm-clear"
            onClick={() => setShowClearConfirm(true)}
            disabled={strokes.length === 0}
            className="p-2 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            title="Xóa toàn bộ bảng"
          >
            <Trash2 size={14} />
          </button>

          <button
            type="button"
            data-testid="btn-export-png"
            onClick={handleExportPNG}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition cursor-pointer ml-1"
            title="Lưu ảnh bài học về máy"
          >
            <Download size={13} />
            <span className="hidden sm:inline">Lưu ảnh</span>
          </button>
        </div>
      </div>

      {/* Main Interactive Canvas */}
      <div className="flex-1 w-full h-full relative cursor-crosshair">
        <canvas
          ref={canvasRef}
          data-testid="whiteboard-canvas"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="w-full h-full block touch-none"
        />

        {/* Inline Text Input for Text Tool */}
        {textInput && textInput.visible && (
          <div
            className="absolute z-40 bg-zinc-950/95 border border-white/20 rounded-lg p-1.5 shadow-2xl flex items-center gap-1.5"
            style={{
              left: `${textInput.x}px`,
              top: `${textInput.y}px`
            }}
          >
            <input
              type="text"
              autoFocus
              value={textInput.text}
              placeholder="Gõ ghi chú hoặc công thức..."
              data-testid="input-whiteboard-text"
              onChange={(e) => setTextInput({ ...textInput, text: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTextSubmit();
                if (e.key === 'Escape') setTextInput(null);
              }}
              className="bg-transparent border-0 text-white text-xs px-2 py-1 focus:outline-none min-w-[200px]"
            />
            <button
              type="button"
              onClick={handleTextSubmit}
              className="px-2.5 py-1 rounded bg-white text-black font-semibold text-xs hover:bg-neutral-200 cursor-pointer"
            >
              Chèn
            </button>
            <button
              type="button"
              onClick={() => setTextInput(null)}
              className="p-1 text-zinc-400 hover:text-white cursor-pointer"
            >
              <X size={13} />
            </button>
          </div>
        )}
      </div>

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div
          data-testid="modal-clear-whiteboard"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150"
        >
          <div className="w-full max-w-sm rounded-2xl bg-zinc-900 border border-zinc-800 p-5 shadow-2xl text-center space-y-3.5">
            <div className="w-10 h-10 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle size={20} />
            </div>
            <h4 className="text-sm font-semibold text-white">Xác nhận xóa sạch bảng vẽ?</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {isHost
                ? 'Với vai trò Host, bạn sẽ xóa toàn bộ nội dung bài học và nét vẽ trên bảng của tất cả thành viên trong phòng.'
                : 'Thao tác này sẽ xóa toàn bộ nội dung bài học và nét vẽ trên bảng của tất cả thành viên trong phòng.'}
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-300 hover:bg-white/10 transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                data-testid="btn-accept-clear"
                onClick={handleClearBoard}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-500 hover:bg-rose-400 text-white transition cursor-pointer shadow-md"
              >
                Xóa toàn bộ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
