import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { WidgetContainer } from '../../src/components/WidgetContainer';
import { NotesWidget } from '../../src/components/NotesWidget';
import { SpacesWidget } from '../../src/components/SpacesWidget';
import { useLayoutStore, WIDGET_SIZE_PRESETS, DEFAULT_WIDGETS } from '../../src/stores/useLayoutStore';
import { useBackgroundStore } from '../../src/stores/useBackgroundStore';
import { db } from '../../src/db';

describe('Milestone 1 — Interactive & Layout Widget Fixes (Bugs 1-5)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    try {
      await db.notes.clear();
    } catch {}
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Bug 1: Mini Pill Timer pointer-events-auto & drag decoupling', () => {
    it('Mini Pill Timer renders with pointer-events-auto class so clicks are not swallowed by main container', () => {
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
          <div>Timer Content</div>
        </WidgetContainer>
      );

      const miniPillSection = screen.getByTestId('widget-container-timer');
      expect(miniPillSection).toBeDefined();
      expect(miniPillSection.className).toContain('pointer-events-auto');

      const playBtn = screen.getByTestId('mini-timer-play-btn');
      expect(playBtn).toBeDefined();

      const controlsWrapper = playBtn.parentElement;
      expect(controlsWrapper?.getAttribute('data-no-drag')).toBe('true');
    });
  });

  describe('Bug 2: Media Player Preset & Default Dimensions on Reset', () => {
    it('Media size presets have sufficient height to prevent clipping URL bar and playback controls', () => {
      expect(WIDGET_SIZE_PRESETS.media.S.height).toBe(320);
      expect(WIDGET_SIZE_PRESETS.media.M.height).toBe(340);
      expect(WIDGET_SIZE_PRESETS.media.L.height).toBe(400);
    });

    it('DEFAULT_WIDGETS.media has minHeight: 320, height: 340, maxHeight: 560', () => {
      expect(DEFAULT_WIDGETS.media.height).toBe(340);
      expect(DEFAULT_WIDGETS.media.minHeight).toBe(320);
      expect(DEFAULT_WIDGETS.media.minWidth).toBe(320);
      expect(DEFAULT_WIDGETS.media.maxWidth).toBe(640);
      expect(DEFAULT_WIDGETS.media.maxHeight).toBe(560);
    });
  });

  describe('Bug 3: Window Titlebar Buttons (— and ✕) sleek styling', () => {
    it('Desktop window buttons use sleek borderless styling and compact geometry', () => {
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
          <div>Task Content</div>
        </WidgetContainer>
      );

      const collapseBtn = screen.getByTestId('collapse-widget-tasks');
      const closeBtn = screen.getByTestId('close-widget-tasks');

      expect(collapseBtn.className).toContain('rounded-lg');
      expect(collapseBtn.className).not.toContain('rounded-xl');
      expect(collapseBtn.className).toContain('text-zinc-400');

      expect(closeBtn.className).toContain('rounded-lg');
      expect(closeBtn.className).not.toContain('rounded-xl');
    });
  });

  describe('Bug 4: Notes Widget Constraints & Button Preservation', () => {
    it('NotesWidget save status, new note button, tabs, and delete button have shrink-0', async () => {
      render(<NotesWidget />);

      const saveStatus = screen.getByTestId('note-toolbar');
      expect(saveStatus.className).toContain('shrink-0');
      expect(saveStatus.className).toContain('min-w-0');

      const newNoteBtn = screen.getByTestId('btn-new-note');
      expect(newNoteBtn.className).toContain('shrink-0');
      expect(newNoteBtn.className).toContain('shrink-0');

      // Click create new note to render the note action bar and tabs
      await act(async () => {
        fireEvent.click(newNoteBtn);
      });

      const editTab = await screen.findByTestId('tab-note-edit');
      expect(editTab.className).toContain('shrink-0');
      expect(editTab.className).toContain('shrink-0');

      const previewTab = screen.getByTestId('tab-note-preview');
      expect(previewTab.className).toContain('shrink-0');
      expect(previewTab.className).toContain('shrink-0');

      const deleteBtn = screen.getByTestId('btn-delete-note');
      expect(deleteBtn.className).toContain('shrink-0');

      const titleInput = await screen.findByTestId('input-note-title');
      expect(titleInput.className).toContain('w-full');
      expect(titleInput.className).toContain('min-w-0');
    });
  });

  describe('Bug 5: Spaces Widget Width Lock, Responsive Grid & Zen Black', () => {
    it('SpacesWidget root does not have max-w-[420px] and has min-w-0 for responsive expansion', () => {
      render(<SpacesWidget />);

      const spacesWidget = screen.getByTestId('spaces-widget');
      expect(spacesWidget.className).not.toContain('max-w-[420px]');
      expect(spacesWidget.className).toContain('w-full');
      expect(spacesWidget.className).toContain('min-w-0');
    });

    it('Presets grid does NOT render solid colors or pure-black in photo thumbnails', () => {
      render(<SpacesWidget />);

      // pure-black or zen-pure-black should NOT have preset cards in the photo grid
      const blackCard = screen.queryByTestId('preset-card-pure-black');
      const zenBlackCard = screen.queryByTestId('preset-card-zen-pure-black');
      expect(blackCard).toBeNull();
      expect(zenBlackCard).toBeNull();
    });

    it('Clicking zen-pure-black button selects zen-pure-black preset and highlights button', () => {
      render(<SpacesWidget />);

      const zenPureBlackBtn = screen.getByTestId('zen-color-zen-pure-black');
      expect(zenPureBlackBtn).toBeDefined();

      fireEvent.click(zenPureBlackBtn);

      const state = useBackgroundStore.getState();
      expect(state.activePresetId).toBe('zen-pure-black');

      expect(zenPureBlackBtn.className).toContain('ring-2');
    });
  });
});
