import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Pen,
  Highlighter,
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
  X,
  FileUp,
  FileText,
  ChevronLeft,
  ChevronRight,
  FileEdit,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Hand,
  BookOpen,
  MousePointer
} from 'lucide-react';
import {
  ToolType,
  StrokeSize,
  NormalizedPoint,
  WhiteboardStroke,
  WhiteboardDrawPayload,
  WhiteboardUndoPayload,
  WhiteboardSyncRequestPayload,
  WhiteboardSyncSnapshotPayload,
  WhiteboardCursorPayload,
  WhiteboardDrawStreamPayload
} from '../types/whiteboard';
import { StudyMaterial } from '../types/documentMaterial';
import {
  loadPdfJs,
  renderPdfPageToCanvas,
  renderPdfBookSpreadToCanvas,
  extractTextFromPdf,
  parseDocxFile
} from '../utils/materialLoader';
import { MinimalDocEditor } from './MinimalDocEditor';
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
  onDrawerActivity?: (isDrawing: boolean, drawerName?: string) => void;
}

export const WhiteboardView: React.FC<WhiteboardViewProps> = ({
  roomId,
  currentUserId,
  currentUserName,
  channel,
  isHost,
  onDrawerActivity
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Tools & Appearance State
  const [activeTool, setActiveTool] = useState<ToolType>('pen');
  const [currentColor, setCurrentColor] = useState<string>('#ffffff');
  const [currentSize, setCurrentSize] = useState<StrokeSize>(2);

  // Stroke History
  const [strokes, setStrokes] = useState<WhiteboardStroke[]>([]);
  const [redoStack, setRedoStack] = useState<WhiteboardStroke[]>([]);
  // Lưu strokes riêng theo từng trang tài liệu (PDF)
  const pageStrokesMapRef = useRef<Record<string, WhiteboardStroke[]>>({});

  // Active Study Material (PDF, Word, Ảnh)
  const [material, setMaterial] = useState<StudyMaterial | null>(null);
  const [pdfViewMode, setPdfViewMode] = useState<'single' | 'book'>('single');
  const pdfDocRef = useRef<any>(null);
  const materialImageRef = useRef<HTMLCanvasElement | HTMLImageElement | null>(null);
  const [isLoadingMaterial, setIsLoadingMaterial] = useState(false);

  // Camera Viewport (Zoom & Pan)
  const [zoomScale, setZoomScale] = useState<number>(1.0);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState<boolean>(false);
  const [isPanMode, setIsPanMode] = useState<boolean>(false);

  const isPanningRef = useRef<boolean>(false);
  const panStartRef = useRef<{ x: number; y: number; originX: number; originY: number }>({
    x: 0,
    y: 0,
    originX: 0,
    originY: 0
  });
  const touchStateRef = useRef<{
    dist: number;
    midX: number;
    midY: number;
    originX: number;
    originY: number;
  } | null>(null);

  // Minimal Doc Editor Modal
  const [docEditorState, setDocEditorState] = useState<{
    open: boolean;
    title: string;
    contentHtml: string;
  } | null>(null);

  // Text Tool Inline Input
  const [textInput, setTextInput] = useState<{
    visible: boolean;
    screenX: number;
    screenY: number;
    normalizedPoint: NormalizedPoint;
    text: string;
  } | null>(null);

  // Clear Confirmation Modal
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Drawing pointer state
  const isPointerDownRef = useRef(false);
  const currentPointsRef = useRef<NormalizedPoint[]>([]);

  // Remote Realtime Live State
  const [remoteCursors, setRemoteCursors] = useState<Record<string, WhiteboardCursorPayload>>({});
  const remoteStreamsRef = useRef<Record<string, WhiteboardStroke>>({});
  const [activeDrawers, setActiveDrawers] = useState<string[]>([]);
  const lastCursorBroadcastRef = useRef<number>(0);
  const lastStreamBroadcastRef = useRef<number>(0);

  // Coordinate Conversion Helper: Screen client coords -> Virtual Canvas & Normalized
  const getVirtualCoords = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return { virtX: 0, virtY: 0, normX: 0, normY: 0 };
      const rect = canvas.getBoundingClientRect();
      const screenX = clientX - rect.left;
      const screenY = clientY - rect.top;

      const virtX = (screenX - panOffset.x) / zoomScale;
      const virtY = (screenY - panOffset.y) / zoomScale;

      const normX = virtX / canvas.width;
      const normY = virtY / canvas.height;
      return { virtX, virtY, normX, normY };
    },
    [panOffset, zoomScale]
  );

  // 1. Redraw toàn bộ canvas gồm Nền + Lưới vô tận + Tài Liệu + Nét Vẽ Đè Lên
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Reset transform và xóa sạch nền màn hình
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#121214';
    ctx.fillRect(0, 0, width, height);

    // Áp dụng Camera Viewport (Pan & Zoom)
    ctx.translate(panOffset.x, panOffset.y);
    ctx.scale(zoomScale, zoomScale);

    // B. Lưới chấm dot-grid vô tận tính theo vùng nhìn thấy ảo
    const virtLeft = -panOffset.x / zoomScale;
    const virtTop = -panOffset.y / zoomScale;
    const virtRight = virtLeft + width / zoomScale;
    const virtBottom = virtTop + height / zoomScale;

    const gridSize = 24;
    const startX = Math.floor(virtLeft / gridSize) * gridSize;
    const startY = Math.floor(virtTop / gridSize) * gridSize;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    for (let x = startX; x <= virtRight; x += gridSize) {
      for (let y = startY; y <= virtBottom; y += gridSize) {
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // C. Vẽ tài liệu học tập (nếu có: PDF page, Book Spread, hoặc Ảnh đề bài)
    if (materialImageRef.current) {
      const img = materialImageRef.current;
      const hRatio = (height - 40) / img.height;
      const wRatio = (width - 40) / img.width;
      const ratio = Math.min(hRatio, wRatio, 1.35);
      const drawW = img.width * ratio;
      const drawH = img.height * ratio;
      const drawX = (width - drawW) / 2;
      const drawY = (height - drawH) / 2;

      ctx.save();
      // Hiệu ứng đổ bóng trang sách/tài liệu chân thực
      ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
      ctx.shadowBlur = 32;
      ctx.shadowOffsetY = 10;
      ctx.drawImage(img, drawX, drawY, drawW, drawH);
      ctx.restore();
    }

    // D. Render các nét vẽ đã hoàn thành (luôn nằm đè lên tài liệu)
    strokes.forEach((stroke) => {
      renderStroke(ctx, stroke, width, height);
    });

    // E. Render nét đang vẽ trực tiếp từ các bạn học khác (Live In-flight Stream)
    Object.values(remoteStreamsRef.current).forEach((streamStroke) => {
      renderStroke(ctx, streamStroke, width, height);
    });

    // F. Render nét đang vẽ của chính người dùng (Local Draft Preview)
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
  }, [strokes, panOffset, zoomScale, activeTool, currentColor, currentSize, currentUserId]);

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
    const p0 = { x: points[0].x * width, y: points[0].y * height };

    // 1. Bút dạ quang (Highlighter)
    if (tool === 'highlighter') {
      ctx.globalAlpha = 0.38;
      ctx.strokeStyle = color === '#ffffff' ? '#fef08a' : color;
      ctx.lineWidth = size * 7;
      ctx.lineCap = 'square';
      ctx.lineJoin = 'miter';

      if (points.length === 1) {
        ctx.beginPath();
        ctx.rect(p0.x - 10, p0.y - 10, 20, 20);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        for (let i = 1; i < points.length; i++) {
          const pi = { x: points[i].x * width, y: points[i].y * height };
          ctx.lineTo(pi.x, pi.y);
        }
        ctx.stroke();
      }
      ctx.restore();
      return;
    }

    // 2. Bút xóa che chữ cũ (Whiteout)
    if (tool === 'whiteout') {
      const pLast = {
        x: points[points.length - 1].x * width,
        y: points[points.length - 1].y * height
      };
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#ffffff';
      const left = Math.min(p0.x, pLast.x);
      const top = Math.min(p0.y, pLast.y);
      const w = Math.abs(pLast.x - p0.x);
      const h = Math.abs(pLast.y - p0.y);
      ctx.fillRect(left, top, Math.max(12, w), Math.max(12, h));
      ctx.restore();
      return;
    }

    // 3. Các công cụ thông thường
    ctx.strokeStyle = tool === 'eraser' ? '#121214' : color;
    ctx.fillStyle = tool === 'eraser' ? '#121214' : color;
    ctx.lineWidth = tool === 'eraser' ? size * 5 : size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

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
          const prev = { x: points[i - 1].x * width, y: points[i - 1].y * height };
          const midX = (prev.x + pi.x) / 2;
          const midY = (prev.y + pi.y) / 2;
          ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
        }
        const last = {
          x: points[points.length - 1].x * width,
          y: points[points.length - 1].y * height
        };
        ctx.lineTo(last.x, last.y);
        ctx.stroke();
      }
    } else if (tool === 'line') {
      const pLast = {
        x: points[points.length - 1].x * width,
        y: points[points.length - 1].y * height
      };
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(pLast.x, pLast.y);
      ctx.stroke();
    } else if (tool === 'arrow') {
      const pLast = {
        x: points[points.length - 1].x * width,
        y: points[points.length - 1].y * height
      };
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(pLast.x, pLast.y);
      ctx.stroke();

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
      const pLast = {
        x: points[points.length - 1].x * width,
        y: points[points.length - 1].y * height
      };
      const left = Math.min(p0.x, pLast.x);
      const top = Math.min(p0.y, pLast.y);
      const w = Math.abs(pLast.x - p0.x);
      const h = Math.abs(pLast.y - p0.y);
      ctx.beginPath();
      ctx.rect(left, top, w, h);
      ctx.stroke();
    } else if (tool === 'circle') {
      const pLast = {
        x: points[points.length - 1].x * width,
        y: points[points.length - 1].y * height
      };
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

  // Helper zoom centered at point
  const handleZoom = (factor: number, clientCenter?: { x: number; y: number }) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = clientCenter ? clientCenter.x - rect.left : canvas.width / 2;
    const cy = clientCenter ? clientCenter.y - rect.top : canvas.height / 2;

    setZoomScale((prevScale) => {
      const nextScale = Math.min(3.0, Math.max(0.25, Number((prevScale * factor).toFixed(2))));
      if (nextScale === prevScale) return prevScale;
      setPanOffset((prevPan) => ({
        x: cx - (cx - prevPan.x) * (nextScale / prevScale),
        y: cy - (cy - prevPan.y) * (nextScale / prevScale)
      }));
      return nextScale;
    });
  };

  const resetView = () => {
    setZoomScale(1.0);
    setPanOffset({ x: 0, y: 0 });
  };

  // Space key listener for drag pan
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setIsSpacePressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Smooth wheel zoom listener (non-passive to prevent page scroll)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = container.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;

      const delta = -e.deltaY;
      const factor = delta > 0 ? 1.08 : 0.92;

      setZoomScale((prevScale) => {
        const nextScale = Math.min(3.0, Math.max(0.25, Number((prevScale * factor).toFixed(2))));
        if (nextScale === prevScale) return prevScale;
        setPanOffset((prevPan) => ({
          x: cx - (cx - prevPan.x) * (nextScale / prevScale),
          y: cy - (cy - prevPan.y) * (nextScale / prevScale)
        }));
        return nextScale;
      });
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', onWheel);
    };
  }, []);

  // Touch Pinch-to-zoom and Two-finger Pan
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const rect = container.getBoundingClientRect();
        const midX = (t1.clientX + t2.clientX) / 2 - rect.left;
        const midY = (t1.clientY + t2.clientY) / 2 - rect.top;
        touchStateRef.current = {
          dist,
          midX,
          midY,
          originX: panOffset.x,
          originY: panOffset.y
        };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && touchStateRef.current) {
        e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const rect = container.getBoundingClientRect();
        const midX = (t1.clientX + t2.clientX) / 2 - rect.left;
        const midY = (t1.clientY + t2.clientY) / 2 - rect.top;

        const scaleFactor = dist / touchStateRef.current.dist;
        touchStateRef.current.dist = dist;

        setZoomScale((prevScale) => {
          const nextScale = Math.min(3.0, Math.max(0.25, Number((prevScale * scaleFactor).toFixed(2))));
          setPanOffset((prevPan) => ({
            x: midX - (midX - prevPan.x) * (nextScale / prevScale) + (midX - touchStateRef.current!.midX),
            y: midY - (midY - prevPan.y) * (nextScale / prevScale) + (midY - touchStateRef.current!.midY)
          }));
          return nextScale;
        });
        touchStateRef.current.midX = midX;
        touchStateRef.current.midY = midY;
      }
    };

    const onTouchEnd = () => {
      touchStateRef.current = null;
    };

    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', onTouchEnd);
    return () => {
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
    };
  }, [panOffset]);

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

  // Realtime Broadcast Cursor
  const broadcastCursor = useCallback(
    (point: NormalizedPoint, isDrawing: boolean) => {
      if (!channel) return;
      channel.send({
        type: 'broadcast',
        event: 'WHITEBOARD_CURSOR',
        payload: {
          userId: currentUserId,
          userName: currentUserName,
          x: point.x,
          y: point.y,
          isDrawing,
          color: currentColor,
          lastActive: Date.now()
        }
      });
    },
    [channel, currentUserId, currentUserName, currentColor]
  );

  // Realtime Supabase Channel Subscriptions
  useEffect(() => {
    if (!channel) return;

    // 1. Nhận nét vẽ từ các thành viên khác
    channel.on('broadcast', { event: 'WHITEBOARD_DRAW' }, (event: { payload: WhiteboardDrawPayload }) => {
      const { stroke, userId } = event.payload;
      if (userId !== currentUserId) {
        delete remoteStreamsRef.current[userId];
        setStrokes((prev) => [...prev, stroke]);
      }
    });

    // 1b. Nhận nét vẽ in-flight streaming (<50ms)
    channel.on('broadcast', { event: 'WHITEBOARD_DRAW_STREAM' }, (event: { payload: WhiteboardDrawStreamPayload }) => {
      const p = event.payload;
      if (p.userId !== currentUserId) {
        remoteStreamsRef.current[p.userId] = {
          id: `stream-${p.userId}`,
          userId: p.userId,
          userName: p.userName,
          tool: p.tool,
          color: p.color,
          size: p.size,
          points: p.points,
          createdAt: Date.now()
        };
        redrawCanvas();
      }
    });

    // 1c. Nhận con trỏ chuột thời gian thực từ bạn học (Live Cursors)
    channel.on('broadcast', { event: 'WHITEBOARD_CURSOR' }, (event: { payload: WhiteboardCursorPayload }) => {
      const p = event.payload;
      if (p.userId !== currentUserId) {
        setRemoteCursors((prev) => ({
          ...prev,
          [p.userId]: { ...p, lastActive: Date.now() }
        }));
      }
    });

    // 2. Nhận yêu cầu xóa sạch bảng
    channel.on('broadcast', { event: 'WHITEBOARD_CLEAR' }, () => {
      setStrokes([]);
      setRedoStack([]);
      pageStrokesMapRef.current = {};
    });

    // 3. Nhận sự kiện Undo từ peer
    channel.on('broadcast', { event: 'WHITEBOARD_UNDO' }, (event: { payload: WhiteboardUndoPayload }) => {
      const { strokeId } = event.payload;
      setStrokes((prev) => prev.filter((s) => s.id !== strokeId));
    });

    // 4. Nhận sự kiện lật trang / đổi chế độ sách từ người giảng bài
    channel.on(
      'broadcast',
      { event: 'WHITEBOARD_MATERIAL_PAGE' },
      (event: { payload: { page: number; mode?: 'single' | 'book' } }) => {
        const { page, mode } = event.payload;
        if (material && material.type === 'pdf') {
          switchPdfPageOrMode(page, mode || pdfViewMode, false);
        }
      }
    );

    // 5. Nhận yêu cầu đồng bộ từ người mới vào
    channel.on('broadcast', { event: 'WHITEBOARD_SYNC_REQUEST' }, (event: { payload: WhiteboardSyncRequestPayload }) => {
      const { requesterId } = event.payload;
      if (requesterId !== currentUserId) {
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

    // 6. Nhận snapshot đồng bộ cho chính mình
    channel.on('broadcast', { event: 'WHITEBOARD_SYNC_SNAPSHOT' }, (event: { payload: WhiteboardSyncSnapshotPayload }) => {
      const { targetId, strokes: syncedStrokes } = event.payload;
      if (targetId === currentUserId) {
        setStrokes(syncedStrokes);
      }
    });

    channel.send({
      type: 'broadcast',
      event: 'WHITEBOARD_SYNC_REQUEST',
      payload: { requesterId: currentUserId }
    });
  }, [channel, currentUserId, material, pdfViewMode, redrawCanvas]);

  // Periodic cleanup of inactive cursors & active drawer indicator
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setRemoteCursors((prev) => {
        let changed = false;
        const next: Record<string, WhiteboardCursorPayload> = {};
        for (const [uid, cur] of Object.entries(prev)) {
          if (now - cur.lastActive < 4000) {
            next[uid] = cur;
          } else {
            changed = true;
          }
        }
        return changed ? next : prev;
      });

      const drawers: string[] = [];
      for (const cur of Object.values(remoteCursors)) {
        if (cur.isDrawing && now - cur.lastActive < 2500) {
          drawers.push(cur.userName || 'Bạn học');
        }
      }
      setActiveDrawers(drawers);
      if (onDrawerActivity) {
        onDrawerActivity(drawers.length > 0, drawers[0]);
      }
    }, 800);

    return () => clearInterval(timer);
  }, [remoteCursors, onDrawerActivity]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // Helper render PDF View (Single page hoặc Book Spread 2 trang)
  const renderPdfToOffscreen = async (pdf: any, page: number, mode: 'single' | 'book') => {
    const offscreen = document.createElement('canvas');
    if (mode === 'book') {
      const leftPage = page % 2 === 0 ? Math.max(1, page - 1) : page;
      const rightPage = leftPage + 1;
      await renderPdfBookSpreadToCanvas(pdf, leftPage, rightPage, offscreen);
    } else {
      await renderPdfPageToCanvas(pdf, page, offscreen);
    }
    materialImageRef.current = offscreen;
  };

  // 2. Xử lý tải file tài liệu (PDF, Word, Ảnh)
  const handleFileUpload = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    const url = URL.createObjectURL(file);
    setIsLoadingMaterial(true);

    try {
      if (ext === 'pdf') {
        const pdfjs = await loadPdfJs();
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        pdfDocRef.current = pdf;

        await renderPdfToOffscreen(pdf, 1, 'single');

        const newMat: StudyMaterial = {
          id: `mat-${Date.now()}`,
          name: file.name,
          type: 'pdf',
          size: file.size,
          url,
          file,
          totalPages: pdf.numPages,
          currentPage: 1,
          viewMode: 'single',
          uploadedBy: currentUserName,
          uploadedAt: Date.now()
        };

        setMaterial(newMat);
        setPdfViewMode('single');
        pageStrokesMapRef.current = {};
        setStrokes([]);
        resetView();
        redrawCanvas();
      } else if (ext === 'docx') {
        const { html } = await parseDocxFile(file);
        setDocEditorState({
          open: true,
          title: file.name.replace(/\.docx$/i, ''),
          contentHtml: html
        });

        const newMat: StudyMaterial = {
          id: `mat-${Date.now()}`,
          name: file.name,
          type: 'docx',
          size: file.size,
          url,
          file,
          currentPage: 1,
          extractedContent: html,
          uploadedBy: currentUserName,
          uploadedAt: Date.now()
        };
        setMaterial(newMat);
      } else if (['png', 'jpg', 'jpeg', 'webp'].includes(ext || '')) {
        const img = new Image();
        img.src = url;
        await new Promise((res) => {
          img.onload = res;
        });
        materialImageRef.current = img;

        const newMat: StudyMaterial = {
          id: `mat-${Date.now()}`,
          name: file.name,
          type: 'image',
          size: file.size,
          url,
          file,
          currentPage: 1,
          uploadedBy: currentUserName,
          uploadedAt: Date.now()
        };
        setMaterial(newMat);
        pageStrokesMapRef.current = {};
        setStrokes([]);
        resetView();
        redrawCanvas();
      } else {
        alert('Định dạng file không được hỗ trợ. Vui lòng chọn file PDF, Word (.docx) hoặc hình ảnh.');
      }
    } catch (err) {
      console.error('Lỗi nạp tài liệu:', err);
      alert('Không thể mở tài liệu này. Vui lòng kiểm tra lại file.');
    } finally {
      setIsLoadingMaterial(false);
    }
  };

  // 3. Lật trang PDF & Chuyển đổi Chế độ Quyển Sách (Book Spread)
  const switchPdfPageOrMode = async (
    newPage: number,
    newMode: 'single' | 'book',
    broadcast = true
  ) => {
    if (!material || !pdfDocRef.current || material.type !== 'pdf') return;
    const total = material.totalPages || 1;
    const clampedPage = Math.max(1, Math.min(total, newPage));

    // Lưu nét vẽ của trang/chế độ hiện tại
    const currentKey = `${pdfViewMode}-${material.currentPage}`;
    pageStrokesMapRef.current[currentKey] = [...strokes];

    setIsLoadingMaterial(true);
    try {
      await renderPdfToOffscreen(pdfDocRef.current, clampedPage, newMode);

      // Nạp nét vẽ của trang/chế độ mới (nếu có)
      const targetKey = `${newMode}-${clampedPage}`;
      const targetStrokes = pageStrokesMapRef.current[targetKey] || [];
      setStrokes(targetStrokes);
      setRedoStack([]);

      setPdfViewMode(newMode);
      setMaterial((prev) =>
        prev ? { ...prev, currentPage: clampedPage, viewMode: newMode } : null
      );
      redrawCanvas();

      if (broadcast && channel) {
        channel.send({
          type: 'broadcast',
          event: 'WHITEBOARD_MATERIAL_PAGE',
          payload: { page: clampedPage, mode: newMode }
        });
      }
    } catch (err) {
      console.warn('Lỗi đổi trang / chế độ sách PDF:', err);
    } finally {
      setIsLoadingMaterial(false);
    }
  };

  // 4. Trích xuất chữ từ PDF thành Đề Cương Soạn Thảo
  const handleExtractPdfToEditor = async () => {
    if (!pdfDocRef.current) return;
    setIsLoadingMaterial(true);
    try {
      const text = await extractTextFromPdf(pdfDocRef.current);
      const html = text
        .split('\n\n')
        .map((p) => (p.startsWith('###') ? `<h3>${p.replace('###', '')}</h3>` : `<p>${p}</p>`))
        .join('');

      setDocEditorState({
        open: true,
        title: material ? `Đề cương trích xuất - ${material.name}` : 'Đề cương PDF',
        contentHtml: html
      });
    } catch (err) {
      console.warn('Lỗi trích xuất chữ từ PDF:', err);
      alert('Không thể trích xuất chữ từ PDF này.');
    } finally {
      setIsLoadingMaterial(false);
    }
  };

  // 5. Chiếu đề cương từ Editor lên Bảng vẽ để vẽ khoanh tròn
  const handleProjectDocToWhiteboard = (htmlContent: string) => {
    const textCanvas = document.createElement('canvas');
    textCanvas.width = 900;
    textCanvas.height = 1200;
    const ctx = textCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 900, 1200);
      ctx.fillStyle = '#111827';
      ctx.font = '16px Inter, sans-serif';

      const tmp = document.createElement('div');
      tmp.innerHTML = htmlContent;
      const lines = (tmp.innerText || '').split('\n').slice(0, 45);

      let y = 50;
      lines.forEach((line) => {
        ctx.fillText(line.slice(0, 75), 40, y);
        y += 24;
      });
    }

    materialImageRef.current = textCanvas;
    setDocEditorState(null);
    setMaterial({
      id: `doc-${Date.now()}`,
      name: 'Đề cương bài học đang chiếu',
      type: 'docx',
      size: 1024,
      url: '',
      currentPage: 1,
      uploadedBy: currentUserName,
      uploadedAt: Date.now()
    });
    setStrokes([]);
    pageStrokesMapRef.current = {};
    resetView();
    redrawCanvas();
  };

  // Pointer event handlers (Hỗ trợ Pan, Zoom và Drawing)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const isMiddleClick = e.button === 1;
    const isPanTriggered = isSpacePressed || isPanMode || isMiddleClick;

    if (isPanTriggered) {
      isPanningRef.current = true;
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        originX: panOffset.x,
        originY: panOffset.y
      };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }

    // Normal drawing mode
    const { normX, normY } = getVirtualCoords(e.clientX, e.clientY);
    const normalized: NormalizedPoint = { x: normX, y: normY };

    if (activeTool === 'text') {
      const containerRect = containerRef.current?.getBoundingClientRect();
      setTextInput({
        visible: true,
        screenX: e.clientX - (containerRect?.left || 0),
        screenY: e.clientY - (containerRect?.top || 0),
        normalizedPoint: normalized,
        text: ''
      });
      return;
    }

    isPointerDownRef.current = true;
    currentPointsRef.current = [normalized];
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    broadcastCursor(normalized, true);
    redrawCanvas();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // 1. Pan Dragging
    if (isPanningRef.current) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      setPanOffset({
        x: panStartRef.current.originX + dx,
        y: panStartRef.current.originY + dy
      });
      return;
    }

    const { normX, normY } = getVirtualCoords(e.clientX, e.clientY);
    const normalized: NormalizedPoint = { x: normX, y: normY };

    // 2. Broadcast Live Cursor
    const now = Date.now();
    if (now - lastCursorBroadcastRef.current > 40) {
      lastCursorBroadcastRef.current = now;
      broadcastCursor(normalized, isPointerDownRef.current);
    }

    // 3. Drawing Move
    if (!isPointerDownRef.current) return;

    if (activeTool === 'pen' || activeTool === 'highlighter' || activeTool === 'eraser') {
      currentPointsRef.current.push(normalized);
    } else {
      currentPointsRef.current = [currentPointsRef.current[0], normalized];
    }

    // Broadcast in-flight stream (<50ms)
    if (now - lastStreamBroadcastRef.current > 40 && channel) {
      lastStreamBroadcastRef.current = now;
      channel.send({
        type: 'broadcast',
        event: 'WHITEBOARD_DRAW_STREAM',
        payload: {
          userId: currentUserId,
          userName: currentUserName,
          tool: activeTool,
          color: currentColor,
          size: currentSize,
          points: currentPointsRef.current
        }
      });
    }

    redrawCanvas();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      return;
    }

    if (!isPointerDownRef.current) return;
    isPointerDownRef.current = false;

    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    const { normX, normY } = getVirtualCoords(e.clientX, e.clientY);
    broadcastCursor({ x: normX, y: normY }, false);

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

    setStrokes((prev) => [...prev, newStroke]);
    setRedoStack([]);
    currentPointsRef.current = [];

    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'WHITEBOARD_DRAW',
        payload: { stroke: newStroke, userId: currentUserId }
      });
    }
  };

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

  const handleUndo = () => {
    if (strokes.length === 0) return;
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

  const handleClearBoard = () => {
    setStrokes([]);
    setRedoStack([]);
    pageStrokesMapRef.current = {};
    setShowClearConfirm(false);

    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'WHITEBOARD_CLEAR',
        payload: { userId: currentUserId, userName: currentUserName }
      });
    }
  };

  const handleExportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `whiteboard-${roomId}-${new Date().toISOString().slice(0, 10)}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // Drag & drop file directly onto canvas
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Cursor style based on active state
  const canvasCursor = isPanningRef.current
    ? 'cursor-grabbing'
    : isSpacePressed || isPanMode
    ? 'cursor-grab'
    : 'cursor-crosshair';

  // Book mode calculation
  const isPdf = material?.type === 'pdf';
  const totalPdfPages = material?.totalPages || 1;
  const currentPdfPage = material?.currentPage || 1;
  const bookLeftPage = currentPdfPage % 2 === 0 ? Math.max(1, currentPdfPage - 1) : currentPdfPage;
  const bookRightPage = Math.min(totalPdfPages, bookLeftPage + 1);

  return (
    <div
      ref={containerRef}
      data-testid="whiteboard-container"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className="relative w-full h-full flex flex-col overflow-hidden bg-[#121214] select-none"
    >
      {/* Hidden File Picker */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.png,.jpg,.jpeg,.webp"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFileUpload(e.target.files[0]);
          }
        }}
      />

      {/* Floating Minimalist Monochrome Toolbar */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 p-1.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-2xl backdrop-blur-md max-w-[96vw] overflow-x-auto">
        {/* Nút Upload Tài Liệu / Đề Cương */}
        <button
          type="button"
          data-testid="btn-upload-material"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition cursor-pointer shrink-0 border border-white/10"
          title="Tải lên tài liệu PDF, Word (.docx) hoặc Ảnh đề thi để cùng giải"
        >
          <FileUp size={14} className="text-emerald-400" />
          <span className="hidden sm:inline">Tài liệu / Đề cương</span>
        </button>

        <span className="w-px h-5 bg-white/10 shrink-0" />

        {/* Tool Selector */}
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl shrink-0">
          <button
            type="button"
            data-testid="tool-pen"
            onClick={() => {
              setActiveTool('pen');
              setIsPanMode(false);
            }}
            className={`p-2 rounded-lg transition cursor-pointer ${
              activeTool === 'pen' && !isPanMode
                ? 'bg-white text-black shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-white hover:bg-white/10'
            }`}
            title="Bút vẽ tự do (Pen)"
          >
            <Pen size={15} />
          </button>

          {/* Bút dạ quang (Highlighter) */}
          <button
            type="button"
            data-testid="tool-highlighter"
            onClick={() => {
              setActiveTool('highlighter');
              setIsPanMode(false);
            }}
            className={`p-2 rounded-lg transition cursor-pointer ${
              activeTool === 'highlighter' && !isPanMode
                ? 'bg-white text-black shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-white hover:bg-white/10'
            }`}
            title="Bút dạ quang (Highlighter)"
          >
            <Highlighter size={15} />
          </button>

          {/* Bút xóa che chữ (Whiteout) */}
          <button
            type="button"
            data-testid="tool-whiteout"
            onClick={() => {
              setActiveTool('whiteout');
              setIsPanMode(false);
            }}
            className={`p-2 rounded-lg transition cursor-pointer ${
              activeTool === 'whiteout' && !isPanMode
                ? 'bg-white text-black shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-white hover:bg-white/10'
            }`}
            title="Bút xóa che chữ cũ (Whiteout)"
          >
            <Square size={15} className="fill-current" />
          </button>

          <button
            type="button"
            data-testid="tool-eraser"
            onClick={() => {
              setActiveTool('eraser');
              setIsPanMode(false);
            }}
            className={`p-2 rounded-lg transition cursor-pointer ${
              activeTool === 'eraser' && !isPanMode
                ? 'bg-white text-black shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-white hover:bg-white/10'
            }`}
            title="Tẩy xóa nét vẽ (Eraser)"
          >
            <Eraser size={15} />
          </button>

          <button
            type="button"
            data-testid="tool-line"
            onClick={() => {
              setActiveTool('line');
              setIsPanMode(false);
            }}
            className={`p-2 rounded-lg transition cursor-pointer ${
              activeTool === 'line' && !isPanMode
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
            onClick={() => {
              setActiveTool('arrow');
              setIsPanMode(false);
            }}
            className={`p-2 rounded-lg transition cursor-pointer ${
              activeTool === 'arrow' && !isPanMode
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
            onClick={() => {
              setActiveTool('rect');
              setIsPanMode(false);
            }}
            className={`p-2 rounded-lg transition cursor-pointer ${
              activeTool === 'rect' && !isPanMode
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
            onClick={() => {
              setActiveTool('circle');
              setIsPanMode(false);
            }}
            className={`p-2 rounded-lg transition cursor-pointer ${
              activeTool === 'circle' && !isPanMode
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
            onClick={() => {
              setActiveTool('text');
              setIsPanMode(false);
            }}
            className={`p-2 rounded-lg transition cursor-pointer ${
              activeTool === 'text' && !isPanMode
                ? 'bg-white text-black shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-white hover:bg-white/10'
            }`}
            title="Hộp văn bản (Text Tool)"
          >
            <Type size={15} />
          </button>
        </div>

        {/* Stroke Size Selector */}
        {activeTool !== 'text' && activeTool !== 'whiteout' && !isPanMode && (
          <div className="flex items-center gap-1 px-1.5 py-1 bg-white/5 rounded-xl border border-white/5 shrink-0">
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

        {/* Color Palette */}
        {activeTool !== 'eraser' && activeTool !== 'whiteout' && !isPanMode && (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded-xl border border-white/5 shrink-0">
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
        <div className="flex items-center gap-1 pl-1 border-l border-white/10 shrink-0">
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
            title="Xóa toàn bộ nét vẽ"
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

      {/* Top-Right Material Bar (Khi có tài liệu đang chiếu) */}
      {material && (
        <div
          data-testid="active-material-indicator"
          className="absolute top-16 right-4 z-30 flex items-center gap-2 p-1.5 rounded-xl bg-zinc-900/90 border border-zinc-800 shadow-xl backdrop-blur-md text-xs text-white"
        >
          <div className="flex items-center gap-1.5 px-2 py-1 max-w-[200px] truncate">
            <FileText size={13} className="text-emerald-400 shrink-0" />
            <span className="truncate font-medium">{material.name}</span>
          </div>

          {/* Nút Trích xuất text PDF */}
          {material.type === 'pdf' && (
            <button
              type="button"
              onClick={handleExtractPdfToEditor}
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center gap-1 transition cursor-pointer"
              title="Trích xuất toàn bộ chữ vào Trình Soạn Thảo Đề Cương"
            >
              <FileEdit size={12} className="text-amber-300" />
              <span className="hidden md:inline">Trích xuất chữ</span>
            </button>
          )}

          {/* Tải tài liệu gốc về máy (Shared Download) */}
          <a
            href={material.url}
            download={material.name}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition flex items-center gap-1 cursor-pointer"
            title="Tải tài liệu gốc về máy"
          >
            <Download size={13} />
          </a>

          {/* Đóng tài liệu */}
          <button
            type="button"
            onClick={() => {
              setMaterial(null);
              materialImageRef.current = null;
              pdfDocRef.current = null;
              pageStrokesMapRef.current = {};
              setStrokes([]);
              resetView();
              redrawCanvas();
            }}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Đóng tài liệu"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* Top-Left Live Drawing Active Indicator */}
      {activeDrawers.length > 0 && (
        <div
          data-testid="whiteboard-live-drawing-indicator"
          className="absolute top-16 left-6 z-30 flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/85 border border-emerald-500/40 text-emerald-300 text-xs shadow-2xl backdrop-blur-md animate-pulse"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>
            <strong>{activeDrawers.join(', ')}</strong> đang vẽ trên bảng...
          </span>
        </div>
      )}

      {/* PDF Bottom Pagination & Book Mode Controller */}
      {isPdf && totalPdfPages > 1 && (
        <div
          data-testid="pdf-pagination-bar"
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-zinc-900/95 border border-zinc-800 shadow-2xl backdrop-blur-md text-xs text-white"
        >
          {/* Chuyển chế độ: 1 Trang vs Quyển Sách */}
          <div className="flex items-center gap-1 bg-white/10 p-0.5 rounded-xl border border-white/10 mr-1">
            <button
              type="button"
              data-testid="btn-pdf-mode-single"
              onClick={() => switchPdfPageOrMode(currentPdfPage, 'single')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                pdfViewMode === 'single'
                  ? 'bg-white text-black font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Chế độ xem 1 trang tiêu chuẩn"
            >
              1 Trang
            </button>
            <button
              type="button"
              data-testid="btn-pdf-mode-book"
              onClick={() => switchPdfPageOrMode(currentPdfPage, 'book')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                pdfViewMode === 'book'
                  ? 'bg-white text-black font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Chế độ Quyển Sách mở 2 trang song song"
            >
              <BookOpen size={13} />
              <span>Quyển Sách</span>
            </button>
          </div>

          <span className="w-px h-4 bg-white/10 mx-0.5" />

          {/* Lật trang về trước */}
          <button
            type="button"
            data-testid="btn-pdf-prev-page"
            disabled={
              (pdfViewMode === 'book' ? bookLeftPage <= 1 : currentPdfPage <= 1) ||
              isLoadingMaterial
            }
            onClick={() => {
              const target = pdfViewMode === 'book' ? Math.max(1, bookLeftPage - 2) : currentPdfPage - 1;
              switchPdfPageOrMode(target, pdfViewMode);
            }}
            className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 disabled:opacity-30 transition cursor-pointer flex items-center gap-1"
            title="Lật về trang trước"
          >
            <ChevronLeft size={16} />
            <span className="hidden sm:inline text-[11px]">Trang trước</span>
          </button>

          {/* Thông tin số trang */}
          <span className="font-mono text-xs px-2 select-none">
            {pdfViewMode === 'book' ? (
              <>
                Trang <strong className="text-emerald-400">{bookLeftPage}</strong> -{' '}
                <strong className="text-emerald-400">{bookRightPage}</strong> / {totalPdfPages}
              </>
            ) : (
              <>
                Trang <strong className="text-emerald-400">{currentPdfPage}</strong> / {totalPdfPages}
              </>
            )}
          </span>

          {/* Lật tiếp trang sau */}
          <button
            type="button"
            data-testid="btn-pdf-next-page"
            disabled={
              (pdfViewMode === 'book' ? bookRightPage >= totalPdfPages : currentPdfPage >= totalPdfPages) ||
              isLoadingMaterial
            }
            onClick={() => {
              const target = pdfViewMode === 'book' ? Math.min(totalPdfPages, bookLeftPage + 2) : currentPdfPage + 1;
              switchPdfPageOrMode(target, pdfViewMode);
            }}
            className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 disabled:opacity-30 transition cursor-pointer flex items-center gap-1"
            title="Lật tiếp trang sau"
          >
            <span className="hidden sm:inline text-[11px]">Lật tiếp</span>
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Bottom-Right Corner Zoom & Pan Navigation Controls */}
      <div
        data-testid="whiteboard-zoom-controls"
        className="absolute bottom-4 right-4 z-30 flex items-center gap-1 p-1 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-2xl backdrop-blur-md text-xs text-white"
      >
        <button
          type="button"
          data-testid="btn-toggle-pan-tool"
          onClick={() => setIsPanMode(!isPanMode)}
          className={`p-2 rounded-xl transition cursor-pointer ${
            isPanMode || isSpacePressed
              ? 'bg-emerald-500 text-black font-bold shadow-md'
              : 'text-zinc-400 hover:text-white hover:bg-white/10'
          }`}
          title="Công cụ Di chuyển (Pan Canvas - Giữ phím Space hoặc cuộn chuột giữa để kéo)"
        >
          <Hand size={15} />
        </button>

        <span className="w-px h-4 bg-white/10 mx-0.5" />

        <button
          type="button"
          data-testid="btn-zoom-out"
          onClick={() => handleZoom(0.85)}
          disabled={zoomScale <= 0.25}
          className="p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition cursor-pointer disabled:opacity-30"
          title="Thu nhỏ góc nhìn (Cuộn chuột xuống)"
        >
          <ZoomOut size={15} />
        </button>

        <button
          type="button"
          data-testid="btn-reset-zoom"
          onClick={resetView}
          className="px-2.5 py-1 rounded-xl font-mono text-[11px] font-semibold text-zinc-200 hover:text-white hover:bg-white/10 transition cursor-pointer"
          title="Đặt lại góc nhìn 100%"
        >
          {Math.round(zoomScale * 100)}%
        </button>

        <button
          type="button"
          data-testid="btn-zoom-in"
          onClick={() => handleZoom(1.15)}
          disabled={zoomScale >= 3.0}
          className="p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition cursor-pointer disabled:opacity-30"
          title="Phóng to góc nhìn (Cuộn chuột lên)"
        >
          <ZoomIn size={15} />
        </button>

        <span className="w-px h-4 bg-white/10 mx-0.5" />

        <button
          type="button"
          data-testid="btn-fit-reset"
          onClick={resetView}
          className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          title="Căn giữa toàn bộ bảng vẽ"
        >
          <Maximize2 size={14} />
        </button>
      </div>

      {/* Main Interactive Canvas */}
      <div className={`flex-1 w-full h-full relative ${canvasCursor}`}>
        <canvas
          ref={canvasRef}
          data-testid="whiteboard-canvas"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="w-full h-full block touch-none"
        />

        {/* Remote Live Cursors Overlay */}
        {Object.values(remoteCursors).map((cur) => {
          const canvas = canvasRef.current;
          if (!canvas) return null;
          const screenX = cur.x * canvas.width * zoomScale + panOffset.x;
          const screenY = cur.y * canvas.height * zoomScale + panOffset.y;

          return (
            <div
              key={cur.userId}
              className="absolute pointer-events-none transition-transform duration-75 ease-out z-25"
              style={{
                left: `${screenX}px`,
                top: `${screenY}px`,
                transform: 'translate(-2px, -2px)'
              }}
            >
              <div className="flex items-center gap-1.5">
                <MousePointer
                  size={16}
                  className="fill-current drop-shadow-md -rotate-45"
                  style={{ color: cur.color || '#10b981' }}
                />
                <span
                  className="px-2 py-0.5 rounded-md text-[10px] font-semibold text-white shadow-lg whitespace-nowrap backdrop-blur-xs flex items-center gap-1"
                  style={{
                    backgroundColor: cur.color ? `${cur.color}cc` : '#059669cc',
                    border: '1px solid rgba(255, 255, 255, 0.2)'
                  }}
                >
                  {cur.userName || 'Bạn học'}
                  {cur.isDrawing && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  )}
                </span>
              </div>
            </div>
          );
        })}

        {/* Inline Text Input for Text Tool */}
        {textInput && textInput.visible && (
          <div
            className="absolute z-40 bg-zinc-950/95 border border-white/20 rounded-lg p-1.5 shadow-2xl flex items-center gap-1.5"
            style={{
              left: `${textInput.screenX}px`,
              top: `${textInput.screenY}px`
            }}
          >
            <input
              type="text"
              autoFocus
              value={textInput.text}
              placeholder="Gõ chú thích hoặc công thức..."
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

        {/* Empty Canvas Initial Material Hint */}
        {!material && strokes.length === 0 && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-center p-6 select-none opacity-40">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 mb-2">
              <FileUp size={22} />
            </div>
            <p className="text-xs text-zinc-300 font-medium">
              Kéo thả file PDF, Word (.docx) hoặc Ảnh đề thi vào đây
            </p>
            <p className="text-[10px] text-zinc-500 mt-0.5">
              Lăn chuột để phóng to/thu nhỏ, giữ Space kéo bảng bay vô tận
            </p>
          </div>
        )}
      </div>

      {/* Minimal Doc Editor Modal (Word / Trích xuất PDF) */}
      {docEditorState && docEditorState.open && (
        <MinimalDocEditor
          initialTitle={docEditorState.title}
          initialContentHtml={docEditorState.contentHtml}
          onClose={() => setDocEditorState(null)}
          onProjectToWhiteboard={handleProjectDocToWhiteboard}
        />
      )}

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
                ? 'Với vai trò Host, bạn sẽ xóa toàn bộ nét vẽ chú thích trên trang tài liệu này.'
                : 'Thao tác này sẽ xóa toàn bộ nét vẽ chú thích trên trang tài liệu này.'}
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
