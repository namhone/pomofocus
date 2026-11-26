import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { existsSync } from 'node:fs';
import { useLayoutStore, DEFAULT_WIDGETS, WIDGET_SIZE_PRESETS, loadStoredLayout, LAYOUT_STORAGE_KEY } from '../../src/stores/useLayoutStore';
import { useBackgroundStore } from '../../src/stores/useBackgroundStore';
import { BackgroundCanvas } from '../../src/components/BackgroundCanvas';
import { MobileStepperRow } from '../../src/components/mobile/primitives/MobileStepperRow';
import { WidgetContainer } from '../../src/components/WidgetContainer';
import { WALLPAPERS, queryWallpapers } from '../../src/data/wallpapers';
import { BACKGROUND_PRESETS } from '../../src/data/backgroundPresets';

vi.mock('../../src/components/CollapsedWidgetCard', () => ({ CollapsedWidgetCard: () => <span>Widget thu nhỏ</span> }));
const timer = vi.hoisted(() => ({ status: 'idle', remainingMs: 1500000, start: vi.fn(), pause: vi.fn() }));
vi.mock('../../src/stores/useTimerStore', () => ({ useTimerStore: (selector: (s: typeof timer) => unknown) => selector(timer) }));

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  useLayoutStore.setState({ widgets: structuredClone(DEFAULT_WIDGETS), isMobile: false, isEcoMode: false });
  useBackgroundStore.getState().resetBackground();
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.clearAllMocks(); });

describe('Phase 4A layout safeguards', () => {
  it('cancel leaves the custom layout and persisted data intact; confirm resets media safely', () => {
    const store = useLayoutStore.getState();
    store.updateWidgetPosition('media', 77, 91);
    const before = localStorage.getItem(LAYOUT_STORAGE_KEY);
    const widgets = useLayoutStore.getState().widgets;
    vi.mocked(window.confirm).mockReturnValue(false);
    store.resetLayout();
    expect(useLayoutStore.getState().widgets).toBe(widgets);
    expect(localStorage.getItem(LAYOUT_STORAGE_KEY)).toBe(before);
    vi.mocked(window.confirm).mockReturnValue(true);
    store.resetLayout();
    expect(useLayoutStore.getState().widgets.media.height).toBeGreaterThanOrEqual(280);
    store.setWidgetSizePreset('media', 'S');
    expect(useLayoutStore.getState().widgets.media.height).toBeGreaterThanOrEqual(DEFAULT_WIDGETS.media.minHeight);
    expect(WIDGET_SIZE_PRESETS.media.S.height).toBeGreaterThanOrEqual(280);
  });
  it('repairs legacy media heights without moving the window or changing other widgets', () => {
    const widgets = structuredClone(DEFAULT_WIDGETS);
    widgets.media = { ...widgets.media, height: 216, minHeight: 100, x: 123, y: 88 };
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify({ widgets }));
    const loaded = loadStoredLayout().widgets;
    expect(loaded.media.height).toBeGreaterThanOrEqual(320);
    expect(loaded.media.minHeight).toBe(320);
    expect(loaded.media.x).toBe(123);
    expect(loaded.media.y).toBe(88);
    expect(loaded.notes).toEqual(widgets.notes);
  });
  it.each([false, true])('mobile widget captures taps under a pointer-disabled workspace (collapsed=%s)', (collapsed) => {
    useLayoutStore.setState({ isMobile: true, widgets: { ...DEFAULT_WIDGETS, timer: { ...DEFAULT_WIDGETS.timer, isCollapsed: collapsed } } });
    render(<main style={{ pointerEvents: 'none' }}><WidgetContainer id="timer"><button>Play</button></WidgetContainer></main>);
    const root = screen.getByTestId('widget-container-timer');
    expect(root.classList.contains('pointer-events-auto')).toBe(true);
    if (collapsed) {
      fireEvent.click(root);
      expect(useLayoutStore.getState().widgets.timer.isCollapsed).toBe(false);
    } else {
      fireEvent.click(screen.getByTestId('collapse-widget-timer'));
      expect(useLayoutStore.getState().widgets.timer.isCollapsed).toBe(true);
    }
  });
  it('mini pill play, pause and expand dispatch to their owners', () => {
    useLayoutStore.setState({ widgets: { ...DEFAULT_WIDGETS, timer: { ...DEFAULT_WIDGETS.timer, isMiniPill: true } } });
    const view = render(<WidgetContainer id="timer"><span>Full timer</span></WidgetContainer>);
    expect(screen.getByTestId('widget-container-timer').classList.contains('pointer-events-auto')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: /Bắt đầu|Tiếp tục|Chạy|Phát/ }));
    expect(timer.start).toHaveBeenCalledOnce();
    timer.status = 'running';
    view.rerender(<WidgetContainer id="timer"><span>Full timer</span></WidgetContainer>);
    fireEvent.click(screen.getByRole('button', { name: /Tạm dừng/ }));
    expect(timer.pause).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: /Mở rộng/ }));
    expect(useLayoutStore.getState().widgets.timer.isMiniPill).toBe(false);
    timer.status = 'idle';
  });
});

describe('Eco background', () => {
  it('removes video and blur on every background layer, then restores the saved blur', () => {
    useBackgroundStore.setState({ activePresetId: 'flower-timelapse', blurLevel: 12, useStaticFallback: false, hasError: false });
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    render(<BackgroundCanvas />);
    expect(screen.getByTestId('background-video-element').style.filter).toContain('blur(12px)');
    act(() => useLayoutStore.setState({ isEcoMode: true }));
    expect(screen.queryByTestId('background-video-element')).toBeNull();
    expect(screen.getByTestId('background-gradient-element').style.filter).toBe('none');
    expect(screen.getByTestId('background-gradient-element').style.transform).toBe('none');
    expect(useBackgroundStore.getState().blurLevel).toBe(12);
    act(() => useLayoutStore.setState({ isEcoMode: false }));
    expect(screen.getByTestId('background-video-element').style.filter).toContain('blur(12px)');
  });
});

describe('IME-safe numeric entry', () => {
  it.each([{ isComposing: true }, { keyCode: 229 }])('does not commit composing Enter (%j)', (ime) => {
    const change = vi.fn();
    render(<MobileStepperRow label="Phút học" value={25} onChange={change} />);
    fireEvent.click(screen.getByText('25'));
    const input = screen.getByRole('spinbutton', { name: '' });
    fireEvent.change(input, { target: { value: '30' } });
    fireEvent.keyDown(input, { key: 'Enter', ...ime });
    expect(change).not.toHaveBeenCalled();
    expect(screen.getByRole('spinbutton', { name: '' })).toBe(input);
    fireEvent.keyDown(input, { key: 'Enter', isComposing: false, keyCode: 13 });
    expect(change).toHaveBeenCalledWith(30);
  });
});

describe('Curated real assets', () => {
  it('contains 25–40 distinct image resources with valid local paths and no invented variants', () => {
    expect(WALLPAPERS.length).toBeGreaterThanOrEqual(25);
    expect(WALLPAPERS.length).toBeLessThanOrEqual(40);
    expect(new Set(WALLPAPERS.map(w => w.fullUrl)).size).toBe(WALLPAPERS.length);
    expect(new Set(WALLPAPERS.map(w => w.id)).size).toBe(WALLPAPERS.length);
    WALLPAPERS.forEach(w => {
      expect(w.title).not.toMatch(/Góc Nhìn|Bản Phối/);
      if (w.fullUrl.startsWith('/')) expect(existsSync('public' + w.fullUrl)).toBe(true);
    });
    expect(WALLPAPERS.some(w => w.tags.includes('pixel-art'))).toBe(true);
    expect(WALLPAPERS.some(w => w.tags.includes('cyberpunk'))).toBe(true);
    expect(queryWallpapers({ category: 'all', limit: 24, page: 2 }).items).toHaveLength(6);
    expect(queryWallpapers({ query: 'không-có-kết-quả' }).total).toBe(0);
  });
  it('uses a genuine study illustration and distinct videos with honest labels', () => {
    const desk = BACKGROUND_PRESETS.find(p => p.id === 'cozy-lofi-room')!;
    expect(desk.url).toBe('/backgrounds/anime/anime-12.webp');
    const videos = BACKGROUND_PRESETS.filter(p => p.category === 'video');
    expect(videos.length).toBeGreaterThanOrEqual(2);
    expect(new Set(videos.map(p => p.url)).size).toBe(videos.length);
    expect(videos.every(p => !/friday|ForBigger|TearsOfSteel|sintel/i.test(p.url))).toBe(true);
  });
});
