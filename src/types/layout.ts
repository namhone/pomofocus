export type WidgetId = 'timer' | 'tasks' | 'notes' | 'calendar' | 'spaces' | 'sounds' | 'settings' | 'media';

export type LayoutPreset = 'default' | 'deep_focus' | 'planning';

export type SizePreset = 'S' | 'M' | 'L';

export type DockPosition = 'top' | 'bottom' | 'left' | 'right';

export type ThemeAccent = 'matcha' | 'terracotta' | 'latte' | 'nordic';

export interface WidgetState {
  id: WidgetId;
  title: string;
  isOpen: boolean;
  isCollapsed?: boolean;
  isMiniPill?: boolean;
  isLocked?: boolean;
  sizePreset?: SizePreset;
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

export type GlassPreset = 'clear' | 'balanced' | 'high_contrast';

export interface GlassSettings {
  preset: GlassPreset;
  opacity: number; // 25 to 90 (%)
  blur: number; // 8 to 48 (px)
}

export type MobileViewMode = 'stack' | 'single';

export type WorkspaceDensity = 'normal' | 'compact';

export interface LayoutStorageData {
  version: number;
  isZenMode: boolean;
  isFocusMode?: boolean;
  density?: WorkspaceDensity;
  dockMode?: 'bottom' | 'corner';
  dockPosition?: DockPosition;
  dockAutoHide?: boolean;
  themeAccent?: ThemeAccent;
  glassSettings?: GlassSettings;
  snapEnabled?: boolean;
  mobileViewMode?: MobileViewMode;
  activeMobileTab?: WidgetId;
  widgets: Record<WidgetId, WidgetState>;
}
