import { create } from 'zustand';
import { BACKGROUND_PRESETS } from '../data/backgroundPresets';
import { BackgroundPreset, BackgroundStorageData, AmbientEffectType } from '../types/background';

export const BACKGROUND_STORAGE_KEY = 'pomodoro_workspace_background_v1';

export const DEFAULT_BACKGROUND_STATE = {
  activePresetId: 'deep-space',
  blurLevel: 0,
  brightnessLevel: 100,
  overlayOpacity: 30,
  customUrl: null as string | null,
  customType: null as 'image' | 'video' | null,
  ambientEffect: 'none' as AmbientEffectType
};

function loadStoredBackground(): typeof DEFAULT_BACKGROUND_STATE {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { ...DEFAULT_BACKGROUND_STATE };
  }

  try {
    const raw = window.localStorage.getItem(BACKGROUND_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_BACKGROUND_STATE };

    const data: BackgroundStorageData = JSON.parse(raw);
    const isValidPreset =
      data.activePresetId === 'custom' ||
      BACKGROUND_PRESETS.some((p) => p.id === data.activePresetId);

    return {
      activePresetId: isValidPreset ? data.activePresetId : DEFAULT_BACKGROUND_STATE.activePresetId,
      blurLevel: typeof data.blurLevel === 'number' ? Math.max(0, Math.min(20, data.blurLevel)) : 0,
      brightnessLevel:
        typeof data.brightnessLevel === 'number'
          ? Math.max(50, Math.min(150, data.brightnessLevel))
          : 100,
      overlayOpacity:
        typeof data.overlayOpacity === 'number'
          ? Math.max(0, Math.min(80, data.overlayOpacity))
          : 30,
      customUrl: typeof data.customUrl === 'string' ? data.customUrl : null,
      customType: data.customType === 'video' || data.customType === 'image' ? data.customType : null,
      ambientEffect: (['none', 'rain', 'snow', 'sakura', 'fireflies'].includes(data.ambientEffect || '')
        ? data.ambientEffect
        : 'none') as AmbientEffectType
    };
  } catch (err) {
    console.warn('Lỗi đọc background từ localStorage:', err);
    return { ...DEFAULT_BACKGROUND_STATE };
  }
}

function persistBackground(state: typeof DEFAULT_BACKGROUND_STATE): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const data: BackgroundStorageData = {
      version: 1,
      activePresetId: state.activePresetId,
      blurLevel: state.blurLevel,
      brightnessLevel: state.brightnessLevel,
      overlayOpacity: state.overlayOpacity,
      customUrl: state.customUrl,
      customType: state.customType,
      ambientEffect: state.ambientEffect
    };
    window.localStorage.setItem(BACKGROUND_STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('Lỗi lưu background vào localStorage:', err);
  }
}

export interface BackgroundStoreState {
  presets: BackgroundPreset[];
  activePresetId: string;
  blurLevel: number;
  brightnessLevel: number;
  overlayOpacity: number;
  customUrl: string | null;
  customType: 'image' | 'video' | null;
  ambientEffect: AmbientEffectType;

  isLoading: boolean;
  hasError: boolean;
  errorMessage: string | null;
  useStaticFallback: boolean;

  // Actions
  selectPreset: (id: string) => void;
  setCustomBackground: (url: string, type: 'image' | 'video') => void;
  setBlur: (level: number) => void;
  setBrightness: (level: number) => void;
  setOverlayOpacity: (level: number) => void;
  setAmbientEffect: (effect: AmbientEffectType) => void;
  setLoading: (loading: boolean) => void;
  setError: (hasError: boolean, message?: string) => void;
  setStaticFallback: (enabled: boolean) => void;
  resetBackground: () => void;
  getActivePreset: () => BackgroundPreset | null;
}

const initial = loadStoredBackground();

export const useBackgroundStore = create<BackgroundStoreState>((set, get) => ({
  presets: BACKGROUND_PRESETS,
  activePresetId: initial.activePresetId,
  blurLevel: initial.blurLevel,
  brightnessLevel: initial.brightnessLevel,
  overlayOpacity: initial.overlayOpacity,
  customUrl: initial.customUrl,
  customType: initial.customType,
  ambientEffect: initial.ambientEffect,

  isLoading: false,
  hasError: false,
  errorMessage: null,
  useStaticFallback: false,

  selectPreset: (id: string) => {
    const preset = get().presets.find((p) => p.id === id);
    const validId = preset ? preset.id : 'deep-space';

    const nextState = {
      activePresetId: validId,
      customUrl: null,
      customType: null,
      hasError: false,
      errorMessage: null,
      useStaticFallback: false
    };

    set(nextState);
    persistBackground({
      activePresetId: validId,
      blurLevel: get().blurLevel,
      brightnessLevel: get().brightnessLevel,
      overlayOpacity: get().overlayOpacity,
      customUrl: null,
      customType: null,
      ambientEffect: get().ambientEffect
    });
  },

  setCustomBackground: (url: string, type: 'image' | 'video') => {
    const trimmed = url.trim();
    if (!trimmed) return;

    set({
      activePresetId: 'custom',
      customUrl: trimmed,
      customType: type,
      hasError: false,
      errorMessage: null,
      useStaticFallback: false
    });

    persistBackground({
      activePresetId: 'custom',
      blurLevel: get().blurLevel,
      brightnessLevel: get().brightnessLevel,
      overlayOpacity: get().overlayOpacity,
      customUrl: trimmed,
      customType: type,
      ambientEffect: get().ambientEffect
    });
  },

  setBlur: (level: number) => {
    const clamped = Math.max(0, Math.min(20, Math.round(level)));
    set({ blurLevel: clamped });
    persistBackground({
      activePresetId: get().activePresetId,
      blurLevel: clamped,
      brightnessLevel: get().brightnessLevel,
      overlayOpacity: get().overlayOpacity,
      customUrl: get().customUrl,
      customType: get().customType,
      ambientEffect: get().ambientEffect
    });
  },

  setBrightness: (level: number) => {
    const clamped = Math.max(50, Math.min(150, Math.round(level)));
    set({ brightnessLevel: clamped });
    persistBackground({
      activePresetId: get().activePresetId,
      blurLevel: get().blurLevel,
      brightnessLevel: clamped,
      overlayOpacity: get().overlayOpacity,
      customUrl: get().customUrl,
      customType: get().customType,
      ambientEffect: get().ambientEffect
    });
  },

  setOverlayOpacity: (level: number) => {
    const clamped = Math.max(0, Math.min(80, Math.round(level)));
    set({ overlayOpacity: clamped });
    persistBackground({
      activePresetId: get().activePresetId,
      blurLevel: get().blurLevel,
      brightnessLevel: get().brightnessLevel,
      overlayOpacity: clamped,
      customUrl: get().customUrl,
      customType: get().customType,
      ambientEffect: get().ambientEffect
    });
  },

  setAmbientEffect: (effect: AmbientEffectType) => {
    set({ ambientEffect: effect });
    persistBackground({
      activePresetId: get().activePresetId,
      blurLevel: get().blurLevel,
      brightnessLevel: get().brightnessLevel,
      overlayOpacity: get().overlayOpacity,
      customUrl: get().customUrl,
      customType: get().customType,
      ambientEffect: effect
    });
  },

  setLoading: (loading: boolean) => set({ isLoading: loading }),

  setError: (hasError: boolean, message?: string) => {
    set({
      hasError,
      errorMessage: message || (hasError ? 'Không thể tải tài nguyên nền' : null),
      useStaticFallback: hasError
    });
  },

  setStaticFallback: (enabled: boolean) => set({ useStaticFallback: enabled }),

  resetBackground: () => {
    set({
      ...DEFAULT_BACKGROUND_STATE,
      hasError: false,
      errorMessage: null,
      useStaticFallback: false
    });
    persistBackground(DEFAULT_BACKGROUND_STATE);
  },

  getActivePreset: () => {
    const { activePresetId, presets, customUrl, customType } = get();
    if (activePresetId === 'custom' && customUrl) {
      return {
        id: 'custom',
        title: 'Nền Tùy Chỉnh (Custom)',
        category: customType || 'image',
        url: customUrl,
        fallbackUrl: DEFAULT_BACKGROUND_STATE.activePresetId,
        thumbnailUrl: '',
        author: 'Người dùng tải lên',
        license: 'Custom License',
        description: 'Hình nền do người dùng chỉ định.',
        tags: ['custom']
      };
    }
    return presets.find((p) => p.id === activePresetId) || presets[0];
  }
}));

if (typeof window !== 'undefined') {
  (window as unknown as { useBackgroundStore: typeof useBackgroundStore }).useBackgroundStore = useBackgroundStore;
}

