import { describe, it, expect, beforeEach } from 'vitest';
import {
  useBackgroundStore,
  BACKGROUND_STORAGE_KEY,
  DEFAULT_BACKGROUND_STATE
} from '../../src/stores/useBackgroundStore';

describe('Background Store Unit Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    useBackgroundStore.getState().resetBackground();
  });

  it('1. Khởi tạo giá trị mặc định cho Background Store', () => {
    const state = useBackgroundStore.getState();
    expect(state.activePresetId).toBe('deep-space');
    expect(state.blurLevel).toBe(0);
    expect(state.brightnessLevel).toBe(100);
    expect(state.overlayOpacity).toBe(30);
    expect(state.hasError).toBe(false);
    expect(state.useStaticFallback).toBe(false);
    expect(state.presets.length).toBeGreaterThanOrEqual(6);
  });

  it('2. Chọn preset hợp lệ và lưu vào localStorage', () => {
    const { selectPreset } = useBackgroundStore.getState();
    selectPreset('cozy-lofi-room');

    expect(useBackgroundStore.getState().activePresetId).toBe('cozy-lofi-room');

    const savedRaw = localStorage.getItem(BACKGROUND_STORAGE_KEY);
    expect(savedRaw).not.toBeNull();
    const parsed = JSON.parse(savedRaw!);
    expect(parsed.activePresetId).toBe('cozy-lofi-room');
  });

  it('3. Chọn preset không hợp lệ tự động fallback về deep-space', () => {
    const { selectPreset } = useBackgroundStore.getState();
    selectPreset('non-existent-preset-xyz');

    expect(useBackgroundStore.getState().activePresetId).toBe('deep-space');
  });

  it('4. Tinh chỉnh Blur, Brightness, Overlay có kiểm tra giới hạn hợp lệ (Clamping)', () => {
    const { setBlur, setBrightness, setOverlayOpacity } = useBackgroundStore.getState();

    // Blur ngoài biên [0, 20]
    setBlur(-10);
    expect(useBackgroundStore.getState().blurLevel).toBe(0);
    setBlur(100);
    expect(useBackgroundStore.getState().blurLevel).toBe(20);

    // Brightness ngoài biên [50, 150]
    setBrightness(10);
    expect(useBackgroundStore.getState().brightnessLevel).toBe(50);
    setBrightness(250);
    expect(useBackgroundStore.getState().brightnessLevel).toBe(150);

    // Overlay ngoài biên [0, 80]
    setOverlayOpacity(-5);
    expect(useBackgroundStore.getState().overlayOpacity).toBe(0);
    setOverlayOpacity(99);
    expect(useBackgroundStore.getState().overlayOpacity).toBe(80);
  });

  it('5. Cài đặt hình nền tùy chỉnh từ URL bên ngoài', () => {
    const { setCustomBackground, getActivePreset } = useBackgroundStore.getState();
    setCustomBackground('https://example.com/custom.mp4', 'video');

    const state = useBackgroundStore.getState();
    expect(state.activePresetId).toBe('custom');
    expect(state.customUrl).toBe('https://example.com/custom.mp4');
    expect(state.customType).toBe('video');

    const activePreset = getActivePreset();
    expect(activePreset).not.toBeNull();
    expect(activePreset!.url).toBe('https://example.com/custom.mp4');
    expect(activePreset!.category).toBe('video');
  });

  it('6. Xử lý lỗi tải asset và tự động kích hoạt fallback sang nền tĩnh', () => {
    const { setError } = useBackgroundStore.getState();
    setError(true, 'Video asset failed to load');

    const state = useBackgroundStore.getState();
    expect(state.hasError).toBe(true);
    expect(state.useStaticFallback).toBe(true);
    expect(state.errorMessage).toContain('Video asset failed');

    // Phục hồi lỗi
    setError(false);
    expect(useBackgroundStore.getState().hasError).toBe(false);
    expect(useBackgroundStore.getState().useStaticFallback).toBe(false);
  });

  it('7. Kích hoạt static fallback cho prefers-reduced-motion', () => {
    const { setStaticFallback } = useBackgroundStore.getState();
    setStaticFallback(true);

    expect(useBackgroundStore.getState().useStaticFallback).toBe(true);
  });

  it('8. Khôi phục nền mặc định (resetBackground) làm mới các thông số', () => {
    const { selectPreset, setBlur, setBrightness, resetBackground } =
      useBackgroundStore.getState();

    selectPreset('tokyo-neon');
    setBlur(15);
    setBrightness(80);

    resetBackground();

    const state = useBackgroundStore.getState();
    expect(state.activePresetId).toBe('deep-space');
    expect(state.blurLevel).toBe(0);
    expect(state.brightnessLevel).toBe(100);
    expect(state.overlayOpacity).toBe(30);
  });
});
