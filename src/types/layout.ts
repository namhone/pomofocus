export type WidgetId = 'timer' | 'tasks' | 'notes' | 'calendar' | 'spaces';

export interface WidgetState {
  id: WidgetId;
  title: string;
  isOpen: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  minWidth: number;
  minHeight: number;
  maxWidth?: number;
  maxHeight?: number;
  resizable?: boolean;
  zIndex: number;
}

export interface LayoutStorageData {
  version: number;
  isZenMode: boolean;
  widgets: Record<WidgetId, WidgetState>;
}
