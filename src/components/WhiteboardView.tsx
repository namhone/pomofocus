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
  FileEdit
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
import { StudyMaterial } from '../types/documentMaterial';
import {
  loadPdfJs,
  renderPdfPageToCanvas,
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Tools & Appearance State
  const [activeTool, setActiveTool] = useState<ToolType>('pen');
  const [currentColor, setCurrentColor] = useState<string>('#ffffff');
  const [currentSize, setCurrentSize] = useState<StrokeSize>(2);

  // Stroke History
  const [strokes, setStrokes] = useState<WhiteboardStroke[]>([]);
  const [redoStack, setRedoStack] = useState<WhiteboardStroke[]>([]);
  // Lưu strokes riêng theo từng trang tài liệu (PDF)
  const pageStrokesMapRef = useRef<Record<number, WhiteboardStroke[]>>({});

  // Active Study Material (PDF, Word, Ảnh)
  const [material, setMaterial] = useState<StudyMaterial | null>(null);
  const pdfDocRef = useRef<any>(null);
  const materialImageRef = useRef<HTMLCanvasElement | HTMLImageElement | null>(null);
  const [isLoadingMaterial, setIsLoadingMaterial] = useState(false);

  // Minimal Doc Editor Modal
  const [docEditorState, setDocEditorState] = useState<{
    open: boolean;
    title: string;
    contentHtml: string;
  } | null>(null);

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

  // Drawing pointer state
  const isPointerDownRef = useRef(false);
  const currentPointsRef = useRef<NormalizedPoint[]>([]);

  // 1. Redraw toàn bộ canvas gồm Nền + Tài Liệu + Nét Vẽ Đè Lên
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // A. Nền tối dịu mắt
    ctx.fillStyle = '#121214';
    ctx.fillRect(0, 0, width, height);

    // B. Lưới chấm dot-grid siêu mờ
    const gridSize = 24;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    for (let x = gridSize; x < width; x += gridSize) {
      for (let y = gridSize; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // C. Vẽ tài liệu học tập (nếu có: PDF page hoặc Ảnh đề bài)
    if (materialImageRef.current) {
      const img = materialImageRef.current;
      const hRatio = (height - 40) / img.height;
      const wRatio = (width - 40) / img.width;
      const ratio = Math.min(hRatio, wRatio, 1.2);
      const drawW = img.width * ratio;
      const drawH = img.height * ratio;
      const drawX = (width - drawW) / 2;
      const drawY = (height - drawH) / 2;

      ctx.save();
      // Hiệu ứng đổ bóng trang giấy chuyên nghiệp
      ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
      ctx.shadowBlur = 30;
      ctx.shadowOffsetY = 8;
      ctx.drawImage(img, drawX, drawY, drawW, drawH);
      ctx.restore();
    }

    // D. Render các nét vẽ (luôn nằm đè lên tài liệu)
    strokes.forEach((stroke) => {
      renderStroke(ctx, stroke, width, height);
    });

    // E. Render nét đang vẽ dở (preview)
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
      const pLast = { x: points[points.length - 1].x * width, y: points[points.length - 1].y * height };
      ctx.fillStyle = '#ffffff'; // Mảng che màu trắng
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
      pageStrokesMapRef.current = {};
    });

    // 3. Nhận sự kiện Undo từ peer
    channel.on('broadcast', { event: 'WHITEBOARD_UNDO' }, (event: { payload: WhiteboardUndoPayload }) => {
      const { strokeId } = event.payload;
      setStrokes((prev) => prev.filter((s) => s.id !== strokeId));
    });

    // 4. Nhận sự kiện lật trang tài liệu từ người giảng bài
    channel.on('broadcast', { event: 'WHITEBOARD_MATERIAL_PAGE' }, (event: { payload: { page: number } }) => {
      const { page } = event.payload;
      if (material && material.type === 'pdf' && page !== material.currentPage) {
        switchPdfPage(page, false);
      }
    });

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
  }, [channel, currentUserId, material]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // 2. Xử lý tải file tài liệu (PDF, Word, Ảnh)
  const handleFileUpload = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    const url = URL.createObjectURL(file);
    setIsLoadingMaterial(true);

    try {
      if (ext === 'pdf') {
        // PDF Processing
        const pdfjs = await loadPdfJs();
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        pdfDocRef.current = pdf;

        // Render trang 1 ra offscreen canvas để vẽ lên Whiteboard
        const offscreen = document.createElement('canvas');
        await renderPdfPageToCanvas(pdf, 1, offscreen);
        materialImageRef.current = offscreen;

        const newMat: StudyMaterial = {
          id: `mat-${Date.now()}`,
          name: file.name,
          type: 'pdf',
          size: file.size,
          url,
          file,
          totalPages: pdf.numPages,
          currentPage: 1,
          uploadedBy: currentUserName,
          uploadedAt: Date.now()
        };

        setMaterial(newMat);
        pageStrokesMapRef.current = {};
        setStrokes([]);
        redrawCanvas();
      } else if (ext === 'docx') {
        // Word Processing
        const { html } = await parseDocxFile(file);
        // Mở ngay Trình Soạn Thảo Đề Cương Tối Giản
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
        // Image Processing
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

  // 3. Lật trang PDF & Lưu/Load nét chú thích theo trang
  const switchPdfPage = async (newPage: number, broadcast = true) => {
    if (!material || !pdfDocRef.current || material.type !== 'pdf') return;
    if (newPage < 1 || newPage > (material.totalPages || 1)) return;

    // Lưu nét vẽ của trang hiện tại
    pageStrokesMapRef.current[material.currentPage] = [...strokes];

    setIsLoadingMaterial(true);
    try {
      const offscreen = document.createElement('canvas');
      await renderPdfPageToCanvas(pdfDocRef.current, newPage, offscreen);
      materialImageRef.current = offscreen;

      // Nạp nét vẽ của trang mới (nếu có)
      const targetStrokes = pageStrokesMapRef.current[newPage] || [];
      setStrokes(targetStrokes);
      setRedoStack([]);

      setMaterial((prev) => (prev ? { ...prev, currentPage: newPage } : null));
      redrawCanvas();

      if (broadcast && channel) {
        channel.send({
          type: 'broadcast',
          event: 'WHITEBOARD_MATERIAL_PAGE',
          payload: { page: newPage }
        });
      }
    } catch (err) {
      console.warn('Lỗi lật trang PDF:', err);
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
      // Chuyển dòng thành đoạn HTML để soạn thảo
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
      alert('Không thể trích xuất chữ từ PDF này (có thể là file scan dạng ảnh thuần).');
    } finally {
      setIsLoadingMaterial(false);
    }
  };

  // 5. Chiếu đề cương từ Editor lên Bảng vẽ để vẽ khoanh tròn
  const handleProjectDocToWhiteboard = (htmlContent: string) => {
    // Vẽ nội dung đề cương lên canvas như 1 trang văn bản tài liệu
    const textCanvas = document.createElement('canvas');
    textCanvas.width = 900;
    textCanvas.height = 1200;
    const ctx = textCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 900, 1200);
      ctx.fillStyle = '#111827';
      ctx.font = '16px Inter, sans-serif';

      // Chuyển HTML thành text thuần để vẽ mộc lên trang giấy
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
    redrawCanvas();
  };

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

    if (activeTool === 'pen' || activeTool === 'highlighter' || activeTool === 'eraser') {
      currentPointsRef.current.push(normalized);
    } else {
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
      // Released automatically
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

          {/* Bút dạ quang (Highlighter) */}
          <button
            type="button"
            data-testid="tool-highlighter"
            onClick={() => setActiveTool('highlighter')}
            className={`p-2 rounded-lg transition cursor-pointer ${
              activeTool === 'highlighter'
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
            onClick={() => setActiveTool('whiteout')}
            className={`p-2 rounded-lg transition cursor-pointer ${
              activeTool === 'whiteout'
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
            onClick={() => setActiveTool('eraser')}
            className={`p-2 rounded-lg transition cursor-pointer ${
              activeTool === 'eraser'
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
            title="Hộp văn bản (Text Tool)"
          >
            <Type size={15} />
          </button>
        </div>

        {/* Stroke Size Selector */}
        {activeTool !== 'text' && activeTool !== 'whiteout' && (
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
        {activeTool !== 'eraser' && activeTool !== 'whiteout' && (
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
              redrawCanvas();
            }}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Đóng tài liệu"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* PDF Bottom Pagination Controller (Khi tài liệu là PDF) */}
      {material && material.type === 'pdf' && (material.totalPages || 1) > 1 && (
        <div
          data-testid="pdf-pagination-bar"
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-zinc-900/95 border border-zinc-800 shadow-2xl backdrop-blur-md text-xs text-white"
        >
          <button
            type="button"
            data-testid="btn-pdf-prev-page"
            disabled={material.currentPage <= 1 || isLoadingMaterial}
            onClick={() => switchPdfPage(material.currentPage - 1)}
            className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 disabled:opacity-30 transition cursor-pointer"
            title="Trang trước"
          >
            <ChevronLeft size={16} />
          </button>

          <span className="font-mono text-xs px-2">
            Trang <strong className="text-emerald-400">{material.currentPage}</strong> / {material.totalPages}
          </span>

          <button
            type="button"
            data-testid="btn-pdf-next-page"
            disabled={material.currentPage >= (material.totalPages || 1) || isLoadingMaterial}
            onClick={() => switchPdfPage(material.currentPage + 1)}
            className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 disabled:opacity-30 transition cursor-pointer"
            title="Trang tiếp theo"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

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
            <p className="text-xs text-zinc-300 font-medium">Kéo thả file PDF, Word (.docx) hoặc Ảnh đề thi vào đây</p>
            <p className="text-[10px] text-zinc-500 mt-0.5">Hoặc dùng thanh công cụ phía trên để vẽ và gạch chân bài giảng</p>
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
