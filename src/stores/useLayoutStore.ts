import { create } from 'zustand';
import {
  GlassPreset,
  GlassSettings,
  DockPosition,
  LayoutPreset,
  LayoutStorageData,
  MobileViewMode,
  SizePreset,
  ThemeAccent,
  WidgetId,
  WidgetState,
  WorkspaceDensity
} from '../types/layout';

export const LAYOUT_STORAGE_KEY = 'pomodoro_workspace_layout_v1';

export const DEFAULT_GLASS_SETTINGS: GlassSettings = {
  preset: 'balanced',
  opacity: 46,
  blur: 32
};

export const GLASS_PRESETS: Record<GlassPreset, GlassSettings> = {
  clear: { preset: 'clear', opacity: 32, blur: 20 },
  balanced: { preset: 'balanced', opacity: 46, blur: 32 },
  high_contrast: { preset: 'high_contrast', opacity: 78, blur: 44 }
};

export const WIDGET_SIZE_PRESETS: Record<WidgetId, Record<SizePreset, { width: number; height: number }>> = {
  timer: {
    S: { width: 300, height: 420 },
    M: { width: 340, height: 480 },
    L: { width: 420, height: 580 }
  },
  tasks: {
    S: { width: 300, height: 420 },
    M: { width: 340, height: 480 },
    L: { width: 440, height: 600 }
  },
  notes: {
    S: { width: 300, height: 420 },
    M: { width: 360, height: 480 },
    L: { width: 460, height: 600 }
  },
  calendar: {
    S: { width: 320, height: 400 },
    M: { width: 380, height: 460 },
    L: { width: 520, height: 620 }
  },
  spaces: {
    S: { width: 320, height: 420 },
    M: { width: 400, height: 500 },
    L: { width: 560, height: 640 }
  },
  sounds: {
    S: { width: 320, height: 420 },
    M: { width: 400, height: 500 },
    L: { width: 520, height: 620 }
  },
  settings: {
    S: { width: 300, height: 400 },
    M: { width: 380, height: 500 },
    L: { width: 460, height: 620 }
  }
};

export function computeBalancedDefaultLayout(
  winWidth: number = 1440,
  _winHeight: number = 900
): Record<WidgetId, WidgetState> {
  const topY = 48;
  const timerW = 340;
  const tasksW = 340;
  const notesW = 360;
  const gap = 18;
  const totalRowWidth = timerW + gap + tasksW + gap + notesW;
  
  let startX = 24;
  if (winWidth >= 1200) {
    startX = Math.max(24, Math.round((winWidth - totalRowWidth) / 2));
  } else {
    startX = 24;
  }

  const timerX = startX;
  const tasksX = timerX + timerW + gap;
  const notesX = tasksX + tasksW + gap;
  const widgetH = DEFAULT_WIDGETS.timer.height;

  return {
    ...DEFAULT_WIDGETS,
    timer: {
      ...DEFAULT_WIDGETS.timer,
      x: timerX,
      y: topY,
      width: timerW,
      height: widgetH,
    },
    tasks: {
      ...DEFAULT_WIDGETS.tasks,
      x: tasksX <= winWidth - tasksW - 12 ? tasksX : 24,
      y: tasksX <= winWidth - tasksW - 12 ? topY : 560,
      width: tasksW,
      height: widgetH,
    },
    notes: {
      ...DEFAULT_WIDGETS.notes,
      x: notesX <= winWidth - notesW - 12 ? notesX : 24,
      y: notesX <= winWidth - notesW - 12 ? topY : 560,
      width: notesW,
      height: widgetH,
    }
  };
}

export const DEFAULT_WIDGETS: Record<WidgetId, WidgetState> = {
  timer: {
    id: 'timer',
    title: 'Đồng hồ Pomodoro',
    isOpen: true,
    isCollapsed: false,
    x: 24,
    y: 48,
    width: 340,
    height: 480,
    minWidth: 280,
    minHeight: 320,
    maxWidth: 520,
    maxHeight: 760,
    resizable: true,
    zIndex: 10
  },
  tasks: {
    id: 'tasks',
    title: 'Danh sách công việc',
    isOpen: true,
    isCollapsed: false,
    x: 382,
    y: 48,
    width: 340,
    height: 480,
    minWidth: 300,
    minHeight: 320,
    maxWidth: 850,
    maxHeight: 900,
    resizable: true,
    zIndex: 11
  },
  notes: {
    id: 'notes',
    title: 'Ghi chú công việc',
    isOpen: true,
    isCollapsed: false,
    x: 740,
    y: 48,
    width: 360,
    height: 480,
    minWidth: 300,
    minHeight: 300,
    maxWidth: 900,
    maxHeight: 900,
    resizable: true,
    zIndex: 12
  },
  calendar: {
    id: 'calendar',
    title: 'Lịch biểu & Sự kiện',
    isOpen: false,
    isCollapsed: false,
    x: 520,
    y: 75,
    width: 380,
    height: 460,
    minWidth: 300,
    minHeight: 320,
    maxWidth: 750,
    maxHeight: 850,
    resizable: true,
    zIndex: 9
  },
  spaces: {
    id: 'spaces',
    title: 'Không Gian Nền',
    isOpen: false,
    isCollapsed: false,
    x: 500,
    y: 75,
    width: 400,
    height: 500,
    minWidth: 320,
    minHeight: 360,
    maxWidth: 900,
    maxHeight: 850,
    resizable: true,
    zIndex: 13
  },
  sounds: {
    id: 'sounds',
    title: 'Bảng Âm Thanh & Chuông',
    isOpen: false,
    isCollapsed: false,
    x: 460,
    y: 70,
    width: 400,
    height: 500,
    minWidth: 300,
    minHeight: 260,
    maxWidth: 750,
    maxHeight: 850,
    resizable: true,
    zIndex: 14
  },
  settings: {
    id: 'settings',
    title: 'Cài Đặt Không Gian',
    isOpen: false,
    isCollapsed: false,
    x: 480,
    y: 65,
    width: 380,
    height: 500,
    minWidth: 320,
    minHeight: 380,
    maxWidth: 650,
    maxHeight: 850,
    resizable: true,
    zIndex: 15
  }
};

function loadStoredLayout(): {
  widgets: Record<WidgetId, WidgetState>;
  isZenMode: boolean;
  isFocusMode: boolean;
  density: WorkspaceDensity;
  glassSettings: GlassSettings;
  snapEnabled: boolean;
  mobileViewMode: MobileViewMode;
  activeMobileTab: WidgetId;
  dockPosition: DockPosition;
  dockAutoHide: boolean;
} {
  const winW = typeof window !== 'undefined' ? window.innerWidth : 1440;
  const winH = typeof window !== 'undefined' ? window.innerHeight : 900;
  const fallback = {
    widgets: computeBalancedDefaultLayout(winW, winH),
    isZenMode: false,
    isFocusMode: false,
    density: 'normal' as WorkspaceDensity,
    glassSettings: { ...DEFAULT_GLASS_SETTINGS },
    snapEnabled: true,
    mobileViewMode: 'stack' as MobileViewMode,
    activeMobileTab: 'timer' as WidgetId,
    dockPosition: 'bottom' as DockPosition,
    dockAutoHide: false
  };
  if (typeof window === 'undefined' || !window.localStorage) {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (!raw) {
      return fallback;
    }
    const data: LayoutStorageData = JSON.parse(raw);
    if (!data.widgets || typeof data.widgets !== 'object') {
      return fallback;
    }

    // Merge with defaults in case new widgets or fields were added
    const mergedWidgets: Record<WidgetId, WidgetState> = { ...DEFAULT_WIDGETS };
    for (const key of Object.keys(DEFAULT_WIDGETS) as WidgetId[]) {
      if (data.widgets[key]) {
        mergedWidgets[key] = {
          ...DEFAULT_WIDGETS[key],
          ...data.widgets[key]
        };
      }
    }

    const savedGlass = data.glassSettings;
    const validGlass: GlassSettings =
      savedGlass && typeof savedGlass.opacity === 'number' && typeof savedGlass.blur === 'number'
        ? {
            preset: ['clear', 'balanced', 'high_contrast'].includes(savedGlass.preset)
              ? savedGlass.preset
              : 'balanced',
            opacity: Math.max(25, Math.min(90, savedGlass.opacity)),
            blur: Math.max(8, Math.min(48, savedGlass.blur))
          }
        : { ...DEFAULT_GLASS_SETTINGS };

    return {
      widgets: mergedWidgets,
      isZenMode: Boolean(data.isZenMode),
      isFocusMode: Boolean(data.isFocusMode),
      density: data.density === 'compact' ? 'compact' : 'normal',
      glassSettings: validGlass,
      snapEnabled: data.snapEnabled !== undefined ? Boolean(data.snapEnabled) : true,
      mobileViewMode: data.mobileViewMode === 'single' ? 'single' : 'stack',
      activeMobileTab: (data.activeMobileTab && DEFAULT_WIDGETS[data.activeMobileTab]) ? data.activeMobileTab : 'timer',
      dockPosition: ['top', 'bottom', 'left', 'right'].includes(data.dockPosition ?? '')
        ? data.dockPosition!
        : data.dockMode === 'corner' ? 'right' : 'bottom',
      dockAutoHide: Boolean(data.dockAutoHide)
    };
  } catch (err) {
    console.warn('Lỗi đọc layout từ localStorage:', err);
    return fallback;
  }
}

function persistLayout(
  widgets: Record<WidgetId, WidgetState>,
  isZenMode: boolean,
  glassSettings?: GlassSettings,
  snapEnabled?: boolean,
  mobileViewMode?: MobileViewMode,
  activeMobileTab?: WidgetId,
  dockPosition?: DockPosition,
  dockAutoHide?: boolean,
  density?: WorkspaceDensity,
  isFocusMode?: boolean
): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const previous = window.localStorage.getItem(LAYOUT_STORAGE_KEY);
    const previousData = previous ? JSON.parse(previous) as Partial<LayoutStorageData> : {};
    const data: LayoutStorageData = {
      version: 2,
      isZenMode,
      isFocusMode: isFocusMode ?? previousData.isFocusMode ?? false,
      density: density ?? previousData.density ?? 'normal',
      dockMode: dockPosition === 'right' || (!dockPosition && previousData.dockMode === 'corner') ? 'corner' : 'bottom',
      dockPosition: dockPosition ?? previousData.dockPosition ?? (previousData.dockMode === 'corner' ? 'right' : 'bottom'),
      dockAutoHide: dockAutoHide ?? previousData.dockAutoHide ?? false,
      glassSettings,
      snapEnabled,
      mobileViewMode,
      activeMobileTab,
      widgets
    };
    window.localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('Lỗi lưu layout vào localStorage:', err);
  }
}

export interface LayoutStoreState {
  widgets: Record<WidgetId, WidgetState>;
  isZenMode: boolean;
  isFocusMode: boolean;
  density: WorkspaceDensity;
  isMobile: boolean;
  dockMode: 'bottom' | 'corner';
  dockPosition: DockPosition;
  dockAutoHide: boolean;
  isLayoutEditMode: boolean;
  themeAccent: ThemeAccent;
  highestZIndex: number;
  glassSettings: GlassSettings;
  snapEnabled: boolean;
  mobileViewMode: MobileViewMode;
  activeMobileTab: WidgetId;

  // Actions
  setZenMode: (enabled: boolean) => void;
  toggleZenMode: () => void;
  setFocusMode: (enabled: boolean) => void;
  toggleFocusMode: () => void;
  setDensity: (density: WorkspaceDensity) => void;
  toggleDensity: () => void;
  toggleDockMode: () => void;
  setDockPosition: (position: DockPosition) => void;
  toggleDockAutoHide: () => void;
  setLayoutEditMode: (enabled: boolean) => void;
  toggleLayoutEditMode: () => void;
  setWidgetLocked: (id: WidgetId, locked: boolean) => void;
  setThemeAccent: (accent: ThemeAccent) => void;
  toggleWidget: (id: WidgetId) => void;
  openWidget: (id: WidgetId) => void;
  closeWidget: (id: WidgetId) => void;
  toggleCollapseWidget: (id: WidgetId) => void;
  toggleMiniPill: (id: WidgetId) => void;
  setWidgetSizePreset: (id: WidgetId, preset: SizePreset) => void;
  updateWidgetPosition: (id: WidgetId, x: number, y: number, persist?: boolean) => void;
  updateWidgetSize: (id: WidgetId, width: number, height: number, persist?: boolean) => void;
  placeWidget: (id: WidgetId, x: number, y: number, fallback?: { x: number; y: number }) => void;
  saveLayout: () => void;
  bringToFront: (id: WidgetId) => void;
  resetLayout: () => void;
  setLayoutPreset: (preset: LayoutPreset) => void;
  setGlassPreset: (preset: GlassPreset) => void;
  setGlassOpacity: (opacity: number) => void;
  setGlassBlur: (blur: number) => void;
  resetGlassSettings: () => void;
  toggleSnap: () => void;
  tileWidgets: () => void;
  cascadeWidgets: () => void;
  setIsMobile: (isMobile: boolean) => void;
  setMobileViewMode: (mode: MobileViewMode) => void;
  setActiveMobileTab: (tab: WidgetId) => void;
  navigateMobileWidget: (id: WidgetId) => void;
  clampWidgetsToViewport: (viewportWidth: number, viewportHeight: number) => void;
}

const initial = loadStoredLayout();

// Tìm zIndex cao nhất từ storage
const initialHighestZ = Math.max(
  20,
  ...Object.values(initial.widgets).map((w) => w.zIndex || 10)
);

export const useLayoutStore = create<LayoutStoreState>((set, get) => ({
  widgets: initial.widgets,
  isZenMode: initial.isZenMode,
  isFocusMode: initial.isFocusMode,
  density: initial.density,
  isMobile: typeof window !== 'undefined' ? window.innerWidth < 1100 : false,
  dockMode: initial.dockPosition === 'right' ? 'corner' : 'bottom',
  dockPosition: initial.dockPosition,
  dockAutoHide: initial.dockAutoHide,
  isLayoutEditMode: false,
  themeAccent: 'matcha',
  highestZIndex: initialHighestZ,
  glassSettings: initial.glassSettings,
  snapEnabled: initial.snapEnabled,
  mobileViewMode: initial.mobileViewMode,
  activeMobileTab: initial.activeMobileTab,

  setZenMode: (enabled: boolean) => {
    set({ isZenMode: enabled });
    get().saveLayout();
  },

  toggleZenMode: () => {
    const next = !get().isZenMode;
    set({ isZenMode: next });
    get().saveLayout();
  },

  setFocusMode: (enabled: boolean) => {
    set({ isFocusMode: enabled });
    get().saveLayout();
  },

  toggleFocusMode: () => {
    const next = !get().isFocusMode;
    if (next) {
      set((state) => ({
        isFocusMode: true,
        widgets: {
          ...state.widgets,
          timer: { ...state.widgets.timer, isOpen: true },
          tasks: { ...state.widgets.tasks, isOpen: true },
          notes: { ...state.widgets.notes, isOpen: false },
          calendar: { ...state.widgets.calendar, isOpen: false },
          spaces: { ...state.widgets.spaces, isOpen: false },
          settings: { ...state.widgets.settings, isOpen: false }
        }
      }));
    } else {
      set({ isFocusMode: false });
    }
    get().saveLayout();
  },

  setDensity: (density: WorkspaceDensity) => {
    set({ density });
    get().saveLayout();
  },

  toggleDensity: () => {
    const next = get().density === 'compact' ? 'normal' : 'compact';
    set({ density: next });
    get().saveLayout();
  },

  toggleDockMode: () => {
    const dockPosition = get().dockPosition === 'right' ? 'bottom' : 'right';
    set({ dockPosition, dockMode: dockPosition === 'right' ? 'corner' : 'bottom' });
    get().saveLayout();
  },

  setDockPosition: (dockPosition: DockPosition) => {
    set({ dockPosition, dockMode: dockPosition === 'right' ? 'corner' : 'bottom' });
    get().saveLayout();
  },

  toggleDockAutoHide: () => {
    set((state) => ({ dockAutoHide: !state.dockAutoHide }));
    get().saveLayout();
  },

  setLayoutEditMode: (isLayoutEditMode: boolean) => {
    set({ isLayoutEditMode });
  },

  toggleLayoutEditMode: () => {
    set((state) => ({ isLayoutEditMode: !state.isLayoutEditMode }));
  },

  setWidgetLocked: (id: WidgetId, isLocked: boolean) => {
    const widgets = { ...get().widgets, [id]: { ...get().widgets[id], isLocked } };
    set({ widgets });
    get().saveLayout();
  },

  setThemeAccent: (accent: ThemeAccent) => {
    set({ themeAccent: accent });
  },

  toggleWidget: (id: WidgetId) => {
    const widgets = { ...get().widgets };
    const current = widgets[id];
    if (!current) return;

    const willOpen = !current.isOpen;
    let nextZ = current.zIndex;

    if (willOpen) {
      nextZ = get().highestZIndex + 1;
      set({ highestZIndex: nextZ });
    }

    widgets[id] = {
      ...current,
      isOpen: willOpen,
      zIndex: nextZ
    };

    set({ widgets });
    persistLayout(widgets, get().isZenMode, get().glassSettings, get().snapEnabled);
  },

  openWidget: (id: WidgetId) => {
    const widgets = { ...get().widgets };
    const current = widgets[id];
    if (!current) return;

    const nextZ = get().highestZIndex + 1;
    const winW = typeof window !== 'undefined' ? window.innerWidth : 1440;
    const winH = typeof window !== 'undefined' ? window.innerHeight : 900;
    const maxX = Math.max(10, winW - current.width - 12);
    const maxY = Math.max(50, winH - current.height - 12);

    widgets[id] = {
      ...current,
      isOpen: true,
      x: Math.max(10, Math.min(current.x, maxX)),
      y: Math.max(50, Math.min(current.y, maxY)),
      zIndex: nextZ
    };

    set({ widgets, highestZIndex: nextZ });
    persistLayout(widgets, get().isZenMode, get().glassSettings, get().snapEnabled);
  },

  closeWidget: (id: WidgetId) => {
    const widgets = { ...get().widgets };
    const current = widgets[id];
    if (!current) return;

    widgets[id] = {
      ...current,
      isOpen: false
    };

    set({ widgets });
    persistLayout(widgets, get().isZenMode, get().glassSettings, get().snapEnabled);
  },

  toggleCollapseWidget: (id: WidgetId) => {
    const widgets = { ...get().widgets };
    const current = widgets[id];
    if (!current) return;

    const nextCollapsed = !current.isCollapsed;
    widgets[id] = {
      ...current,
      isCollapsed: nextCollapsed,
      isMiniPill: false
    };

    set({ widgets });
    persistLayout(widgets, get().isZenMode, get().glassSettings, get().snapEnabled);
  },

  toggleMiniPill: (id: WidgetId) => {
    const widgets = { ...get().widgets };
    const current = widgets[id];
    if (!current) return;

    const nextMini = !current.isMiniPill;
    widgets[id] = {
      ...current,
      isMiniPill: nextMini,
      isCollapsed: false
    };

    set({ widgets });
    persistLayout(widgets, get().isZenMode, get().glassSettings, get().snapEnabled);
  },

  setWidgetSizePreset: (id: WidgetId, preset: SizePreset) => {
    const widgets = { ...get().widgets };
    const current = widgets[id];
    if (!current) return;

    const sizes = WIDGET_SIZE_PRESETS[id]?.[preset] ?? { width: current.width, height: current.height };
    widgets[id] = {
      ...current,
      sizePreset: preset,
      width: sizes.width,
      height: sizes.height,
      isCollapsed: false,
      isMiniPill: false
    };

    set({ widgets });
    persistLayout(widgets, get().isZenMode, get().glassSettings, get().snapEnabled);
  },

  updateWidgetPosition: (id: WidgetId, x: number, y: number, shouldPersist = true) => {
    const widgets = { ...get().widgets };
    const current = widgets[id];
    if (!current) return;

    let targetX = Math.round(x);
    let targetY = Math.round(y);

    // Magnetic Snapping (8px threshold)
    const SNAP = 8;
    if (Math.abs(targetX) < SNAP) targetX = 0;
    if (Math.abs(targetY) < SNAP) targetY = 0;
    if (typeof window !== 'undefined') {
      if (Math.abs(window.innerWidth - (targetX + current.width)) < SNAP) {
        targetX = window.innerWidth - current.width;
      }
      if (Math.abs(window.innerHeight - (targetY + current.height)) < SNAP) {
        targetY = window.innerHeight - current.height;
      }
    }

    widgets[id] = {
      ...current,
      x: targetX,
      y: targetY
    };

    set({ widgets });
    if (shouldPersist) get().saveLayout();
  },

  updateWidgetSize: (id: WidgetId, width: number, height: number, shouldPersist = true) => {
    const widgets = { ...get().widgets };
    const current = widgets[id];
    if (!current) return;

    const minW = current.minWidth;
    const minH = current.minHeight;
    const maxW = current.maxWidth ?? Infinity;
    const maxH = current.maxHeight ?? Infinity;

    const clampedW = Math.max(minW, Math.min(Math.round(width), maxW));
    const clampedH = Math.max(minH, Math.min(Math.round(height), maxH));

    widgets[id] = {
      ...current,
      width: clampedW,
      height: clampedH
    };

    set({ widgets });
    if (shouldPersist) get().saveLayout();
  },

  placeWidget: (id: WidgetId, x: number, y: number) => {
    const state = get();
    const moving = state.widgets[id];
    if (!moving) return;

    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1440;
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 900;
    const width = moving.isMiniPill ? 190 : moving.width;
    const height = moving.isMiniPill ? 52 : moving.isCollapsed ? 48 : moving.height;
    const minX = 10;
    const minY = 50;
    const maxX = Math.max(minX, viewportWidth - width - 12);
    const maxY = Math.max(minY, viewportHeight - height - 12);

    let nextX = Math.max(minX, Math.min(Math.round(x), maxX));
    let nextY = Math.max(minY, Math.min(Math.round(y), maxY));

    if (state.snapEnabled && !moving.isMiniPill) {
      // 1. Edge Snapping (nếu gần mép màn hình <= 20px thì hút vào mép)
      const EDGE_SNAP = 20;
      if (nextX - minX < EDGE_SNAP) nextX = minX;
      else if (maxX - nextX < EDGE_SNAP) nextX = maxX;

      if (nextY - minY < EDGE_SNAP) nextY = minY;
      else if (maxY - nextY < EDGE_SNAP) nextY = maxY;

      // 2. Magnetic Snapping với các cửa sổ lân cận (ngưỡng 14px)
      const SNAP_DIST = 14;
      const otherWidgets = Object.values(state.widgets).filter(
        (w) => w.id !== id && w.isOpen && !w.isMiniPill
      );
      for (const other of otherWidgets) {
        if (Math.abs(nextX - (other.x + other.width + 12)) < SNAP_DIST) {
          nextX = other.x + other.width + 12;
        } else if (Math.abs(nextX + width + 12 - other.x) < SNAP_DIST) {
          nextX = other.x - width - 12;
        }
        if (Math.abs(nextY - other.y) < SNAP_DIST) {
          nextY = other.y;
        }
      }

      nextX = Math.max(minX, Math.min(nextX, maxX));
      nextY = Math.max(minY, Math.min(nextY, maxY));
    }

    const widgets = { ...state.widgets, [id]: { ...moving, x: nextX, y: nextY } };
    set({ widgets });
    get().saveLayout();
  },

  saveLayout: () => {
    const state = get();
    persistLayout(
      state.widgets,
      state.isZenMode,
      state.glassSettings,
      state.snapEnabled,
      state.mobileViewMode,
      state.activeMobileTab,
      state.dockPosition,
      state.dockAutoHide,
      state.density,
      state.isFocusMode
    );
  },

  bringToFront: (id: WidgetId) => {
    const widgets = { ...get().widgets };
    const current = widgets[id];
    if (!current) return;

    const nextZ = get().highestZIndex + 1;
    widgets[id] = {
      ...current,
      zIndex: nextZ
    };

    set({ widgets, highestZIndex: nextZ });
    persistLayout(widgets, get().isZenMode, get().glassSettings, get().snapEnabled);
  },

  resetLayout: () => {
    const winW = typeof window !== 'undefined' ? window.innerWidth : 1440;
    const winH = typeof window !== 'undefined' ? window.innerHeight : 900;
    const resetWidgets = computeBalancedDefaultLayout(winW, winH);

    set({
      widgets: resetWidgets,
      isZenMode: false,
      highestZIndex: 20,
      isLayoutEditMode: false
    });

    get().saveLayout();
  },

  setLayoutPreset: (preset: LayoutPreset) => {
    if (preset === 'default') {
      get().resetLayout();
      return;
    }

    const widgets = JSON.parse(JSON.stringify(get().widgets)) as Record<WidgetId, WidgetState>;
    const winW = typeof window !== 'undefined' ? window.innerWidth : 1440;

    if (preset === 'deep_focus') {
      // Chỉ giữ Timer ở trung tâm, đóng các widget khác
      for (const k of Object.keys(widgets) as WidgetId[]) {
        widgets[k].isOpen = k === 'timer';
      }
      widgets.timer.x = Math.max(24, Math.round((winW - widgets.timer.width) / 2));
      widgets.timer.y = 80;
      widgets.timer.isCollapsed = false;
    } else if (preset === 'planning') {
      // Bật Timer, Tasks, Notes side-by-side
      widgets.timer.isOpen = true;
      widgets.timer.x = 24;
      widgets.timer.y = 50;
      widgets.timer.isCollapsed = false;

      widgets.tasks.isOpen = true;
      widgets.tasks.x = 428;
      widgets.tasks.y = 50;
      widgets.tasks.isCollapsed = false;

      widgets.notes.isOpen = true;
      widgets.notes.x = 832;
      widgets.notes.y = 50;
      widgets.notes.isCollapsed = false;

      widgets.calendar.isOpen = false;
      widgets.spaces.isOpen = false;
      widgets.sounds.isOpen = false;
    }

    set({ widgets });
    persistLayout(widgets, get().isZenMode, get().glassSettings, get().snapEnabled);
  },

  setGlassPreset: (preset: GlassPreset) => {
    const nextSettings = GLASS_PRESETS[preset] ?? DEFAULT_GLASS_SETTINGS;
    set({ glassSettings: nextSettings });
    persistLayout(get().widgets, get().isZenMode, nextSettings, get().snapEnabled);
  },

  setGlassOpacity: (opacity: number) => {
    const clamped = Math.max(25, Math.min(90, Math.round(opacity)));
    const nextSettings: GlassSettings = {
      ...get().glassSettings,
      opacity: clamped
    };
    set({ glassSettings: nextSettings });
    persistLayout(get().widgets, get().isZenMode, nextSettings, get().snapEnabled);
  },

  setGlassBlur: (blur: number) => {
    const clamped = Math.max(8, Math.min(48, Math.round(blur)));
    const nextSettings: GlassSettings = {
      ...get().glassSettings,
      blur: clamped
    };
    set({ glassSettings: nextSettings });
    persistLayout(get().widgets, get().isZenMode, nextSettings, get().snapEnabled);
  },

  resetGlassSettings: () => {
    const nextSettings = { ...DEFAULT_GLASS_SETTINGS };
    set({ glassSettings: nextSettings });
    persistLayout(get().widgets, get().isZenMode, nextSettings, get().snapEnabled);
  },

  toggleSnap: () => {
    const nextSnap = !get().snapEnabled;
    set({ snapEnabled: nextSnap });
    persistLayout(get().widgets, get().isZenMode, get().glassSettings, nextSnap);
  },

  tileWidgets: () => {
    const widgets = { ...get().widgets };
    const openIds = (Object.keys(widgets) as WidgetId[]).filter((id) => widgets[id].isOpen);
    if (openIds.length === 0) return;

    const winW = typeof window !== 'undefined' ? window.innerWidth : 1440;
    const winH = typeof window !== 'undefined' ? window.innerHeight : 900;
    const paddingX = 24;
    const paddingTop = 50;
    const gap = 16;
    const availableWidth = Math.max(400, winW - paddingX * 2);

    if (openIds.length === 1) {
      const id = openIds[0];
      const w = widgets[id];
      widgets[id] = {
        ...w,
        x: Math.max(paddingX, Math.round((winW - w.width) / 2)),
        y: paddingTop,
        isCollapsed: false,
        isMiniPill: false
      };
    } else {
      const cols = openIds.length <= 3 ? openIds.length : Math.ceil(Math.sqrt(openIds.length));
      const rows = Math.ceil(openIds.length / cols);
      const cellW = Math.max(280, Math.floor((availableWidth - (cols - 1) * gap) / cols));
      const cellH = Math.max(380, Math.floor((winH - paddingTop - 100 - (rows - 1) * gap) / rows));

      openIds.forEach((id, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const w = widgets[id];
        const newW = w.resizable ? Math.max(w.minWidth, Math.min(cellW, w.maxWidth ?? cellW)) : w.width;
        const newH = w.resizable ? Math.max(w.minHeight, Math.min(cellH, w.maxHeight ?? cellH)) : w.height;
        widgets[id] = {
          ...w,
          x: paddingX + col * (cellW + gap),
          y: paddingTop + row * (cellH + gap),
          width: newW,
          height: newH,
          isCollapsed: false,
          isMiniPill: false
        };
      });
    }

    set({ widgets });
    persistLayout(widgets, get().isZenMode, get().glassSettings, get().snapEnabled);
  },

  cascadeWidgets: () => {
    const widgets = { ...get().widgets };
    const openIds = (Object.keys(widgets) as WidgetId[]).filter((id) => widgets[id].isOpen);
    if (openIds.length === 0) return;

    const startX = 32;
    const startY = 50;
    const step = 36;
    const baseZ = get().highestZIndex + 1;

    openIds.forEach((id, idx) => {
      const w = widgets[id];
      widgets[id] = {
        ...w,
        x: startX + idx * step,
        y: startY + idx * step,
        zIndex: baseZ + idx,
        isCollapsed: false,
        isMiniPill: false
      };
    });

    set({ widgets, highestZIndex: baseZ + openIds.length });
    persistLayout(widgets, get().isZenMode, get().glassSettings, get().snapEnabled);
  },

  setIsMobile: (isMobile: boolean) => {
    set({ isMobile, ...(isMobile ? { isLayoutEditMode: false } : {}) });
  },

  setMobileViewMode: (mobileViewMode: MobileViewMode) => {
    set({ mobileViewMode });
    persistLayout(
      get().widgets,
      get().isZenMode,
      get().glassSettings,
      get().snapEnabled,
      mobileViewMode,
      get().activeMobileTab
    );
  },

  setActiveMobileTab: (activeMobileTab: WidgetId) => {
    set({ activeMobileTab });
    persistLayout(
      get().widgets,
      get().isZenMode,
      get().glassSettings,
      get().snapEnabled,
      get().mobileViewMode,
      activeMobileTab
    );
  },

  navigateMobileWidget: (id: WidgetId) => {
    const state = get();
    const widgets = { ...state.widgets };
    let hasChanged = false;

    if (!widgets[id]?.isOpen) {
      widgets[id] = { ...widgets[id], isOpen: true };
      hasChanged = true;
    }
    if (widgets[id]?.isCollapsed) {
      widgets[id] = { ...widgets[id], isCollapsed: false };
      hasChanged = true;
    }

    if (hasChanged) {
      set({ widgets, activeMobileTab: id });
    } else {
      set({ activeMobileTab: id });
    }

    persistLayout(
      get().widgets,
      get().isZenMode,
      get().glassSettings,
      get().snapEnabled,
      get().mobileViewMode,
      id
    );

    if (typeof window !== 'undefined') {
      setTimeout(() => {
        const el = document.querySelector(`[data-testid="widget-container-${id}"]`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 50);
    }
  },

  clampWidgetsToViewport: (viewportWidth: number, viewportHeight: number) => {
    if (viewportWidth <= 0 || viewportHeight <= 0) return;

    const widgets = { ...get().widgets };
    let hasChanged = false;
    const openKeys = (Object.keys(widgets) as WidgetId[]).filter((k) => widgets[k].isOpen);

    for (const key of Object.keys(widgets) as WidgetId[]) {
      const w = { ...widgets[key] };
      let changed = false;

      // Thu nhỏ chiều rộng nếu màn hình hẹp hơn cửa sổ
      const maxW = Math.max(w.minWidth, viewportWidth - 24);
      if (w.width > maxW) {
        w.width = maxW;
        changed = true;
      }

      // Thu nhỏ chiều cao nếu màn hình thấp hơn cửa sổ
      const maxH = Math.max(w.minHeight, viewportHeight - 120);
      if (w.height > maxH && !w.isCollapsed && !w.isMiniPill) {
        w.height = maxH;
        changed = true;
      }

      const activeWidth = w.isMiniPill ? 190 : w.width;
      const activeHeight = w.isMiniPill ? 52 : w.isCollapsed ? 48 : w.height;

      // Giới hạn tọa độ X hợp lệ
      const maxAllowedX = Math.max(10, viewportWidth - activeWidth - 12);
      if (w.x > maxAllowedX) {
        w.x = maxAllowedX;
        changed = true;
      }
      if (w.x < 10) {
        w.x = 10;
        changed = true;
      }

      // Giới hạn tọa độ Y hợp lệ
      const maxAllowedY = Math.max(50, viewportHeight - activeHeight - 12);
      if (w.y > maxAllowedY) {
        w.y = maxAllowedY;
        changed = true;
      }
      if (w.y < 50) {
        w.y = 50;
        changed = true;
      }

      if (changed) {
        widgets[key] = w;
        hasChanged = true;
      }
    }

    // Chống chồng khít hoàn toàn giữa các cửa sổ đang mở
    for (let i = 0; i < openKeys.length; i++) {
      for (let j = i + 1; j < openKeys.length; j++) {
        const k1 = openKeys[i];
        const k2 = openKeys[j];
        const w1 = widgets[k1];
        const w2 = widgets[k2];
        if (Math.abs(w1.x - w2.x) < 10 && Math.abs(w1.y - w2.y) < 10) {
          const newX = Math.min(w2.x + 24, viewportWidth - w2.width - 16);
          const newY = Math.min(w2.y + 24, viewportHeight - 110);
          if (newX !== w2.x || newY !== w2.y) {
            widgets[k2] = { ...w2, x: newX, y: newY };
            hasChanged = true;
          }
        }
      }
    }

    if (hasChanged) {
      set({ widgets });
      persistLayout(widgets, get().isZenMode, get().glassSettings, get().snapEnabled);
    }
  }
}));
