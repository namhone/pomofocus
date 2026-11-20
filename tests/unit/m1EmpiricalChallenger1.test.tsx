import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { WidgetContainer } from '../../src/components/WidgetContainer';
import { MediaWidget } from '../../src/components/MediaWidget';
import { NotesWidget } from '../../src/components/NotesWidget';
import { SpacesWidget } from '../../src/components/SpacesWidget';
import {
  useLayoutStore,
  WIDGET_SIZE_PRESETS,
  DEFAULT_WIDGETS,
  computeBalancedDefaultLayout
} from '../../src/stores/useLayoutStore';
import { useTimerStore } from '../../src/stores/useTimerStore';
import { useBackgroundStore } from '../../src/stores/useBackgroundStore';
import { useNoteStore } from '../../src/stores/useNoteStore';
import { db } from '../../src/db';

describe('Milestone 1 Empirical Challenger — Stress & Adversarial Test Suite', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    try {
      await db.notes.clear();
    } catch {}

    useNoteStore.setState({ notes: [], activeNoteId: null, saveStatus: 'saved' });

    // Initialize timer store engine
    useTimerStore.getState().init();
    useTimerStore.setState({
      status: 'idle',
      remainingMs: 1500 * 1000,
      phase: 'pomodoro',
      currentRound: 1
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. MINI PILL TIMER: POINTER EVENTS, DRAG DECOUPLING, PLAY/PAUSE & EXPAND
  // =========================================================================
  describe('Challenger Stress 1: Mini Pill Timer under pointer events & drag interception', () => {
    it('Mini Pill operates seamlessly inside pointer-events-none parent container', () => {
      useLayoutStore.setState((state) => ({
        isMobile: false,
        widgets: {
          ...state.widgets,
          timer: {
            ...state.widgets.timer,
            isOpen: true,
            isMiniPill: true
          }
        }
      }));

      // Simulate App.tsx fixed wrapper: <main className="fixed inset-0 pointer-events-none ...">
      render(
        <main className="fixed inset-0 pointer-events-none" data-testid="simulated-app-main">
          <div data-testid="workspace-root" className="w-full h-full">
            <WidgetContainer id="timer">
              <div>Timer Main Body</div>
            </WidgetContainer>
          </div>
        </main>
      );

      const miniPill = screen.getByTestId('widget-container-timer');
      expect(miniPill).toBeDefined();

      // Crucial requirement: Must have pointer-events-auto to override parent pointer-events-none
      expect(miniPill.className).toContain('pointer-events-auto');

      // The mini pill section itself is a grab surface
      expect(miniPill.className).toContain('cursor-grab');

      // The controls area must explicitly declare data-no-drag="true"
      const playBtn = screen.getByTestId('mini-timer-play-btn');
      const controlsWrapper = playBtn.parentElement;
      expect(controlsWrapper?.getAttribute('data-no-drag')).toBe('true');
    });

    it('Play, Pause, and Resume state transitions fire with 100% reliability on Mini Pill', () => {
      useLayoutStore.setState((state) => ({
        isMobile: false,
        widgets: {
          ...state.widgets,
          timer: {
            ...state.widgets.timer,
            isOpen: true,
            isMiniPill: true
          }
        }
      }));

      render(
        <div className="pointer-events-none">
          <WidgetContainer id="timer">
            <div>Timer Body</div>
          </WidgetContainer>
        </div>
      );

      const playBtn = screen.getByTestId('mini-timer-play-btn');
      expect(useTimerStore.getState().status).toBe('idle');

      // 1. Click Play -> status transitions to 'running'
      act(() => {
        fireEvent.click(playBtn);
      });
      expect(useTimerStore.getState().status).toBe('running');

      // Status indicator reflects running
      const statusDot = screen.getByTestId('mini-timer-status-dot');
      expect(statusDot.className).toContain('bg-emerald-400');

      // 2. Click Pause -> status transitions to 'paused'
      act(() => {
        fireEvent.click(playBtn);
      });
      expect(useTimerStore.getState().status).toBe('paused');
      expect(statusDot.className).toContain('bg-amber-400');

      // 3. Click Play again -> status resumes to 'running'
      act(() => {
        fireEvent.click(playBtn);
      });
      expect(useTimerStore.getState().status).toBe('running');
    });

    it('Pointer down on controls stops propagation and does not trigger dragging', () => {
      useLayoutStore.setState((state) => ({
        isMobile: false,
        widgets: {
          ...state.widgets,
          timer: {
            ...state.widgets.timer,
            isOpen: true,
            isMiniPill: true
          }
        }
      }));

      render(
        <WidgetContainer id="timer">
          <div>Timer Body</div>
        </WidgetContainer>
      );

      const playBtn = screen.getByTestId('mini-timer-play-btn');
      const controlsWrapper = playBtn.parentElement!;

      // Create a spy on stopPropagation
      const pointerDownEvent = new MouseEvent('pointerdown', { bubbles: true, cancelable: true });
      const stopSpy = vi.spyOn(pointerDownEvent, 'stopPropagation');

      fireEvent(controlsWrapper, pointerDownEvent);
      expect(stopSpy).toHaveBeenCalled();
    });

    it('Expand button restores the full timer widget from mini pill', () => {
      useLayoutStore.setState((state) => ({
        isMobile: false,
        widgets: {
          ...state.widgets,
          timer: {
            ...state.widgets.timer,
            isOpen: true,
            isMiniPill: true
          }
        }
      }));

      render(
        <WidgetContainer id="timer">
          <div>Timer Body</div>
        </WidgetContainer>
      );

      const expandBtn = screen.getByTestId('mini-timer-expand-btn');
      expect(useLayoutStore.getState().widgets.timer.isMiniPill).toBe(true);

      act(() => {
        fireEvent.click(expandBtn);
      });

      // After clicking expand, isMiniPill must be false
      expect(useLayoutStore.getState().widgets.timer.isMiniPill).toBe(false);
    });
  });

  // =========================================================================
  // 2. MEDIA PLAYER: DIMENSIONS, RESET, CONTROLS VISIBILITY UNDER STRESS
  // =========================================================================
  describe('Challenger Stress 2: Media Player dimensions, reset layout & zero-clipping guarantee', () => {
    it('resetLayout restores media widget with height >= 320 and minHeight >= 320', () => {
      // Intentionally corrupt media dimensions to tiny values
      useLayoutStore.setState((state) => ({
        widgets: {
          ...state.widgets,
          media: {
            ...state.widgets.media,
            isOpen: true,
            width: 200,
            height: 150,
            minHeight: 100
          }
        }
      }));

      // Execute resetLayout
      act(() => {
        useLayoutStore.getState().resetLayout();
      });

      const mediaState = useLayoutStore.getState().widgets.media;
      expect(mediaState.height).toBeGreaterThanOrEqual(320);
      expect(mediaState.minHeight).toBeGreaterThanOrEqual(320);
      expect(mediaState.width).toBeGreaterThanOrEqual(320);
      expect(mediaState.minWidth).toBeGreaterThanOrEqual(320);
      expect(mediaState.height).toBe(340);
    });

    it('computeBalancedDefaultLayout guarantees media widget height >= 320 for Desktop and Mobile', () => {
      const desktopLayout = computeBalancedDefaultLayout(1440, 900);
      expect(desktopLayout.media.height).toBeGreaterThanOrEqual(320);
      expect(desktopLayout.media.minHeight).toBeGreaterThanOrEqual(320);

      const smallDesktop = computeBalancedDefaultLayout(1024, 768);
      expect(smallDesktop.media.height).toBeGreaterThanOrEqual(320);

      const mobileLayout = computeBalancedDefaultLayout(390, 844);
      expect(mobileLayout.media.height).toBeGreaterThanOrEqual(320);
    });

    it('All Media size presets (S, M, L) enforce height >= 300 to prevent toolbar clipping', () => {
      const { S, M, L } = WIDGET_SIZE_PRESETS.media;
      expect(S.height).toBeGreaterThanOrEqual(300);
      expect(S.width).toBeGreaterThanOrEqual(320);

      expect(M.height).toBeGreaterThanOrEqual(340);
      expect(M.width).toBeGreaterThanOrEqual(384);

      expect(L.height).toBeGreaterThanOrEqual(400);
      expect(L.width).toBeGreaterThanOrEqual(480);
    });

    it('Full stack of MediaWidget (Video, URL input bar, Playback controls) renders completely in WidgetContainer', () => {
      useLayoutStore.setState((state) => ({
        isMobile: false,
        widgets: {
          ...state.widgets,
          media: {
            ...state.widgets.media,
            isOpen: true,
            isCollapsed: false,
            width: 384,
            height: 340
          }
        }
      }));

      render(
        <WidgetContainer id="media">
          <MediaWidget />
        </WidgetContainer>
      );

      // 1. Title bar buttons exist
      expect(screen.getByTestId('btn-media-fullscreen')).toBeDefined();
      expect(screen.getByTestId('collapse-widget-media')).toBeDefined();
      expect(screen.getByTestId('close-widget-media')).toBeDefined();

      // 2. URL input bar exists and is not hidden
      const urlInput = screen.getByTestId('input-media-direct-url');
      const applyBtn = screen.getByTestId('btn-apply-direct-media');
      expect(urlInput).toBeDefined();
      expect(applyBtn).toBeDefined();

      // 3. Playback control bar at the bottom is completely intact
      expect(screen.getByTestId('btn-media-prev-video')).toBeDefined();
      expect(screen.getByTestId('btn-media-toggle-play')).toBeDefined();
      expect(screen.getByTestId('btn-media-next-video')).toBeDefined();
      expect(screen.getByTestId('btn-toggle-media-picker')).toBeDefined();
      expect(screen.getByTestId('btn-toggle-media-fullscreen')).toBeDefined();
      expect(screen.getByTestId('btn-clear-media')).toBeDefined();
    });

    it('Mobile modal for MediaWidget uses explicit height h-[340px] and max-h-[70vh] instead of aspect-video', () => {
      useLayoutStore.setState((state) => ({
        isMobile: true,
        widgets: {
          ...state.widgets,
          media: {
            ...state.widgets.media,
            isOpen: true
          }
        }
      }));

      render(
        <WidgetContainer id="media">
          <MediaWidget />
        </WidgetContainer>
      );

      const modalContainer = screen.getByTestId('widget-container-media');
      expect(modalContainer).toBeDefined();

      // Check inner container holding the content
      const contentWrapper = modalContainer.querySelector('.h-\\[340px\\]');
      expect(contentWrapper).not.toBeNull();
      expect(contentWrapper?.className).toContain('h-[340px]');
      expect(contentWrapper?.className).toContain('max-h-[70vh]');
      expect(contentWrapper?.className).not.toContain('aspect-video');
    });
  });

  // =========================================================================
  // 3. NOTES WIDGET: WIDTH STRESS RESILIENCE FROM 280px TO 800px & LONG TEXT
  // =========================================================================
  describe('Challenger Stress 3: Notes Widget width scaling (280px to 800px) and long titles', () => {
    const testWidths = [280, 320, 380, 500, 680, 800];

    testWidths.forEach((width) => {
      it(`Renders notes toolbar and tabs without broken wrapping at width ${width}px`, async () => {
        const { unmount } = render(
          <div style={{ width: `${width}px`, height: '400px' }} data-testid={`test-container-${width}`}>
            <NotesWidget />
          </div>
        );

        // Header controls must have shrink-0 and whitespace-nowrap
        const saveStatus = screen.getByTestId('note-save-status');
        expect(saveStatus.className).toContain('shrink-0');
        expect(saveStatus.className).toContain('whitespace-nowrap');

        const newNoteBtn = screen.getByTestId('btn-new-note');
        expect(newNoteBtn.className).toContain('shrink-0');
        expect(newNoteBtn.className).toContain('whitespace-nowrap');

        // Create a note to reveal title and action tabs
        await act(async () => {
          fireEvent.click(newNoteBtn);
        });

        const titleInput = await screen.findByTestId('input-note-title');
        expect(titleInput.className).toContain('flex-1');
        expect(titleInput.className).toContain('min-w-0');

        const editTab = await screen.findByTestId('tab-note-edit');
        expect(editTab.className).toContain('shrink-0');
        expect(editTab.className).toContain('whitespace-nowrap');

        const previewTab = screen.getByTestId('tab-note-preview');
        expect(previewTab.className).toContain('shrink-0');
        expect(previewTab.className).toContain('whitespace-nowrap');

        const deleteBtn = screen.getByTestId('btn-delete-note');
        expect(deleteBtn.className).toContain('shrink-0');

        unmount();
      });
    });

    it('Survives extreme note title of 150 characters at narrowest width (280px)', async () => {
      const longTitle =
        'Super long adversarial note title intended to test flex-shrink and flex-basis boundaries without clipping action buttons or overflowing parent container';

      // Pre-seed note store with long title
      await act(async () => {
        await useNoteStore.getState().createNote(longTitle);
      });

      render(
        <div style={{ width: '280px', height: '400px' }}>
          <NotesWidget />
        </div>
      );

      const titleInput = (await screen.findByTestId('input-note-title')) as HTMLInputElement;
      expect(titleInput.value).toBe(longTitle);
      expect(titleInput.className).toContain('flex-1');
      expect(titleInput.className).toContain('min-w-0');

      // Verify that tabs and delete button are still present, active, and accessible
      const editTab = screen.getByTestId('tab-note-edit');
      const previewTab = screen.getByTestId('tab-note-preview');
      const deleteBtn = screen.getByTestId('btn-delete-note');

      expect(editTab.className).toContain('shrink-0');
      expect(editTab.className).toContain('whitespace-nowrap');

      expect(previewTab.className).toContain('shrink-0');
      expect(previewTab.className).toContain('whitespace-nowrap');

      expect(deleteBtn.className).toContain('shrink-0');

      // Switch to preview mode
      await act(async () => {
        fireEvent.click(previewTab);
      });
      expect(previewTab.className).toContain('bg-white/15');

      // Switch back to edit mode
      await act(async () => {
        fireEvent.click(editTab);
      });
      expect(editTab.className).toContain('bg-white/15');

      // Delete note
      await act(async () => {
        fireEvent.click(deleteBtn);
      });
    });
  });

  // =========================================================================
  // 4. WINDOW TITLEBAR BUTTONS: SLEEK GEOMETRY & MINIMAL DIFF
  // =========================================================================
  describe('Challenger Stress 4: Window Titlebar Buttons sleek geometry & interactions', () => {
    it('Collapse button uses compact geometry (rounded-lg, text-zinc-400) and toggles isCollapsed', () => {
      useLayoutStore.setState((state) => ({
        isMobile: false,
        widgets: {
          ...state.widgets,
          tasks: {
            ...state.widgets.tasks,
            isOpen: true,
            isCollapsed: false
          }
        }
      }));

      render(
        <WidgetContainer id="tasks">
          <div>Tasks Body</div>
        </WidgetContainer>
      );

      const collapseBtn = screen.getByTestId('collapse-widget-tasks');

      // Verify sleek styling
      expect(collapseBtn.className).toContain('rounded-lg');
      expect(collapseBtn.className).not.toContain('rounded-xl');
      expect(collapseBtn.className).not.toContain('border-white/10');
      expect(collapseBtn.className).toContain('text-zinc-400');

      // Clicking collapse toggles isCollapsed
      act(() => {
        fireEvent.click(collapseBtn);
      });
      expect(useLayoutStore.getState().widgets.tasks.isCollapsed).toBe(true);
    });

    it('Close button uses compact geometry and closes the widget', () => {
      useLayoutStore.setState((state) => ({
        isMobile: false,
        widgets: {
          ...state.widgets,
          tasks: {
            ...state.widgets.tasks,
            isOpen: true,
            isCollapsed: false
          }
        }
      }));

      render(
        <WidgetContainer id="tasks">
          <div>Tasks Body</div>
        </WidgetContainer>
      );

      const closeBtn = screen.getByTestId('close-widget-tasks');

      expect(closeBtn.className).toContain('rounded-lg');
      expect(closeBtn.className).not.toContain('rounded-xl');
      expect(closeBtn.className).not.toContain('border-white/10');

      // Clicking close closes widget
      act(() => {
        fireEvent.click(closeBtn);
      });
      expect(useLayoutStore.getState().widgets.tasks.isOpen).toBe(false);
    });
  });

  // =========================================================================
  // 5. SPACES WIDGET: RESPONSIVE GRID EXPANSION & PURE ZEN BLACK
  // =========================================================================
  describe('Challenger Stress 5: Spaces Widget width expansion & Pure Zen Black activation', () => {
    it('SpacesWidget root allows responsive expansion and lacks max-w-[420px]', () => {
      render(<SpacesWidget />);

      const spacesRoot = screen.getByTestId('spaces-widget');
      expect(spacesRoot.className).not.toContain('max-w-[420px]');
      expect(spacesRoot.className).toContain('min-w-0');
      expect(spacesRoot.className).toContain('w-full');
    });

    it('Preset grid uses CSS repeat(auto-fill, minmax(140px, 1fr)) responsive columns', () => {
      const { container } = render(<SpacesWidget />);

      // Search for grid container
      const grid = container.querySelector('[class*="grid-template-columns"]');
      expect(grid).not.toBeNull();
      expect(grid?.className).toContain('minmax(140px,1fr)');
    });

    it('Clicking zen-pure-black activates pure OLED black (#09090b) and updates activePresetId', () => {
      render(<SpacesWidget />);

      const zenPureBlackBtn = screen.getByTestId('zen-color-zen-pure-black');
      act(() => {
        fireEvent.click(zenPureBlackBtn);
      });

      const bgState = useBackgroundStore.getState();
      expect(bgState.activePresetId).toBe('zen-pure-black');

      // Confirm button is highlighted with ring-2
      expect(zenPureBlackBtn.className).toContain('ring-2');
    });
  });
});
