export type ToolType = 'pen' | 'highlighter' | 'whiteout' | 'eraser' | 'line' | 'arrow' | 'rect' | 'circle' | 'text';

export type StrokeSize = 2 | 4 | 8;

export interface NormalizedPoint {
  x: number; // 0..1 (tỉ lệ theo chiều rộng canvas)
  y: number; // 0..1 (tỉ lệ theo chiều cao canvas)
}

export interface WhiteboardStroke {
  id: string;
  userId: string;
  userName?: string;
  tool: ToolType;
  color: string;
  size: number;
  points: NormalizedPoint[];
  text?: string;
  createdAt: number;
}

export interface WhiteboardDrawPayload {
  stroke: WhiteboardStroke;
  userId: string;
}

export interface WhiteboardClearPayload {
  userId: string;
  userName?: string;
}

export interface WhiteboardUndoPayload {
  strokeId: string;
  userId: string;
}

export interface WhiteboardSyncRequestPayload {
  requesterId: string;
}

export interface WhiteboardSyncSnapshotPayload {
  targetId: string;
  strokes: WhiteboardStroke[];
}

export interface WhiteboardCursorPayload {
  userId: string;
  userName: string;
  x: number;
  y: number;
  isDrawing: boolean;
  color?: string;
  lastActive: number;
}

export interface WhiteboardDrawStreamPayload {
  userId: string;
  userName?: string;
  tool: ToolType;
  color: string;
  size: number;
  points: NormalizedPoint[];
  isFinished?: boolean;
}
