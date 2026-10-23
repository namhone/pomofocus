import { create } from 'zustand';
import { LayoutStorageData, WidgetId, WidgetState } from '../types/layout';

export const LAYOUT_STORAGE_KEY = 'pomodoro_workspace_layout_v1';

export const DEFAULT_WIDGETS: Record<WidgetId, WidgetState> = {
  timer: {
    id: 'timer',
    title: 'Đồng hồ Pomodoro',
    isOpen: true,
    x: 24,
    y: 50,
    width: 380,
    height: 600,
    minWidth: 340,
    minHeight: 480,
    resizable: false,
    zIndex: 10
  },
  tasks: {
    id: 'tasks',
    title: 'Danh sách công việc',
    isOpen: true,
    x: 428,
    y: 50,
    width: 380,
    height: 600,
    minWidth: 340,
    minHeight: 450,
    resizable: true,
    zIndex: 11
  },
  notes: {
    id: 'notes',
    title: 'Ghi chú công việc',
    isOpen: true,
    x: 832,
    y: 50,
    width: 410,
    height: 600,
    minWidth: 340,
    minHeight: 450,
    resizable: true,
    zIndex: 12
  },
  calendar: {
    id: 'calendar',
    title: 'Lịch biểu & Sự kiện',
    isOpen: false,
    x: 428,
    y: 90,
    width: 400,
    height: 480,
    minWidth: 340,
    minHeight: 380,
    resizable: false,
    zIndex: 9
  },
  spaces: {
    id: 'spaces',
    title: 'Không gian nền (Spaces)',
    isOpen: false,
    x: 428,
    y: 70,
    width: 440,
    height: 580,
    minWidth: 360,
    minHeight: 450,
    resizable: true,
    zIndex: 13
  }
};

function loadStoredLayout(): { widgets: Record<WidgetId, WidgetState>; isZenMode: boolean } {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { widgets: { ...DEFAULT_WIDGETS }, isZenMode: false };
  }

  try {
    const raw = window.localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (!raw) {
      return { widgets: { ...DEFAULT_WIDGETS }, isZenMode: false };
    }
    const data: LayoutStorageData = JSON.parse(raw);
    if (!data.widgets || typeof data.widgets !== 'object') {
      return { widgets: { ...DEFAULT_WIDGETS }, isZenMode: false };
    }

    // Merge with defaults in case new widgets were added
    const mergedWidgets: Record<WidgetId, WidgetState> = { ...DEFAULT_WIDGETS };
    for (const key of Object.keys(DEFAULT_WIDGETS) as WidgetId[]) {
      if (data.widgets[key]) {
        mergedWidgets[key] = {
          ...DEFAULT_WIDGETS[key],
          ...data.widgets[key]
        };
      }
    }

    return {
      widgets: mergedWidgets,
      isZenMode: Boolean(data.isZenMode)
    };
  } catch (err) {
    console.warn('Lỗi đọc layout từ localStorage:', err);
    return { widgets: { ...DEFAULT_WIDGETS }, isZenMode: false };
  }
}

function persistLayout(widgets: Record<WidgetId, WidgetState>, isZenMode: boolean): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const data: LayoutStorageData = {
      version: 1,
      isZenMode,
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
  isMobile: boolean;
  highestZIndex: number;

  // Actions
  setZenMode: (enabled: boolean) => void;
  toggleZenMode: () => void;
  toggleWidget: (id: WidgetId) => void;
  openWidget: (id: WidgetId) => void;
  closeWidget: (id: WidgetId) => void;
  updateWidgetPosition: (id: WidgetId, x: number, y: number) => void;
  updateWidgetSize: (id: WidgetId, width: number, height: number) => void;
  bringToFront: (id: WidgetId) => void;
  resetLayout: () => void;
  setIsMobile: (isMobile: boolean) => void;
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
  isMobile: false,
  highestZIndex: initialHighestZ,

  setZenMode: (enabled: boolean) => {
    set({ isZenMode: enabled });
    persistLayout(get().widgets, enabled);
  },

  toggleZenMode: () => {
    const next = !get().isZenMode;
    set({ isZenMode: next });
    persistLayout(get().widgets, next);
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
    persistLayout(widgets, get().isZenMode);
  },

  openWidget: (id: WidgetId) => {
    const widgets = { ...get().widgets };
    const current = widgets[id];
    if (!current) return;

    const nextZ = get().highestZIndex + 1;
    widgets[id] = {
      ...current,
      isOpen: true,
      zIndex: nextZ
    };

    set({ widgets, highestZIndex: nextZ });
    persistLayout(widgets, get().isZenMode);
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
    persistLayout(widgets, get().isZenMode);
  },

  updateWidgetPosition: (id: WidgetId, x: number, y: number) => {
    const widgets = { ...get().widgets };
    const current = widgets[id];
    if (!current) return;

    widgets[id] = {
      ...current,
      x: Math.round(x),
      y: Math.round(y)
    };

    set({ widgets });
    persistLayout(widgets, get().isZenMode);
  },

  updateWidgetSize: (id: WidgetId, width: number, height: number) => {
    const widgets = { ...get().widgets };
    const current = widgets[id];
    if (!current) return;

    const clampedW = Math.max(current.minWidth, Math.round(width));
    const clampedH = Math.max(current.minHeight, Math.round(height));

    widgets[id] = {
      ...current,
      width: clampedW,
      height: clampedH
    };

    set({ widgets });
    persistLayout(widgets, get().isZenMode);
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
    persistLayout(widgets, get().isZenMode);
  },

  resetLayout: () => {
    // Reset về giá trị mặc định chuẩn
    const resetWidgets: Record<WidgetId, WidgetState> = JSON.parse(
      JSON.stringify(DEFAULT_WIDGETS)
    );

    set({
      widgets: resetWidgets,
      isZenMode: false,
      highestZIndex: 20
    });

    persistLayout(resetWidgets, false);
  },

  setIsMobile: (isMobile: boolean) => {
    set({ isMobile });
  },

  clampWidgetsToViewport: (viewportWidth: number, viewportHeight: number) => {
    if (viewportWidth <= 0 || viewportHeight <= 0) return;

    const widgets = { ...get().widgets };
    let hasChanged = false;

    for (const key of Object.keys(widgets) as WidgetId[]) {
      const w = { ...widgets[key] };
      let changed = false;

      // Không để widget tràn khỏi lề phải
      const maxAllowedX = Math.max(10, viewportWidth - w.width - 16);
      if (w.x > maxAllowedX) {
        w.x = maxAllowedX;
        changed = true;
      }
      if (w.x < 10) {
        w.x = 10;
        changed = true;
      }

      // Không để widget tràn khỏi lề dưới hoặc trên
      const maxAllowedY = Math.max(60, viewportHeight - 120);
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

    if (hasChanged) {
      set({ widgets });
      persistLayout(widgets, get().isZenMode);
    }
  }
}));
