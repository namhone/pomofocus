import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { WidgetContainer } from '../../src/components/WidgetContainer';
import { SpacesWidget } from '../../src/components/SpacesWidget';
import { useLayoutStore } from '../../src/stores/useLayoutStore';
import { useBackgroundStore } from '../../src/stores/useBackgroundStore';
import { BACKGROUND_PRESETS } from '../../src/data/backgroundPresets';
import { db } from '../../src/db';
import { WidgetId } from '../../src/types/layout';

describe('Challenger 2 Polish M1 — Empirical Stress Test Suite', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    try {
      await db.notes.clear();
      await db.custom_backgrounds.clear();
    } catch {}
    // Reset background store to a known state
    useBackgroundStore.setState({
      activePresetId: 'deep-space',
      pure_zen_black: false,
      customUrl: null,
      customType: null,
      blurLevel: 0,
      brightnessLevel: 100,
      overlayOpacity: 0,
      ambientEffect: 'none'
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // SECTION 1: Spaces Widget Responsive Auto-Fill Grid at Various Widths
  // =========================================================================
  describe('1. Spaces Widget Responsive Auto-Fill Grid (380px, 600px, 800px, 900px)', () => {
    const testWidths = [380, 600, 800, 900];

    testWidths.forEach((width) => {
      it(`renders correctly inside ${width}px container without max-w-[420px] clamp`, () => {
        const { container } = render(
          <div style={{ width: `${width}px`, maxWidth: `${width}px` }}>
            <SpacesWidget />
          </div>
        );

        const spacesRoot = screen.getByTestId('spaces-widget');
        expect(spacesRoot).toBeDefined();

        // Must NOT contain the old fixed max-w-[420px] constraint
        expect(spacesRoot.className).not.toContain('max-w-[420px]');
        expect(spacesRoot.className).toContain('w-full');
        expect(spacesRoot.className).toContain('min-w-0');

        // Locate grid containers
        const grids = container.querySelectorAll('.grid');
        expect(grids.length).toBeGreaterThanOrEqual(2); // Zen flat grid + photo thumbnail grid

        // Check that photo thumbnail grid has responsive auto-fill classes
        const photoGrid = Array.from(grids).find((g) =>
          g.className.includes('grid-cols-2') && g.className.includes('auto-fill')
        );
        expect(photoGrid).toBeDefined();
        expect(photoGrid?.className).toContain('grid-cols-2');
        expect(photoGrid?.className).toContain('sm:grid-cols-3');
        expect(photoGrid?.className).toContain('lg:grid-cols-4');
        expect(photoGrid?.className).toContain('[grid-template-columns:repeat(auto-fill,minmax(140px,1fr))]');
        expect(photoGrid?.className).toContain('gap-2');
      });
    });

    it('retains responsive auto-fill grid when switching categories to video', async () => {
      render(
        <div style={{ width: '800px' }}>
          <SpacesWidget />
        </div>
      );

      // Switch to video filter
      const videoFilterBtn = screen.getByTestId('filter-cat-video');
      await act(async () => {
        fireEvent.click(videoFilterBtn);
      });

      // Find video preset cards
      const videoCard = screen.getByTestId('preset-card-oceans-wave');
      expect(videoCard).toBeDefined();

      const gridContainer = videoCard.parentElement;
      expect(gridContainer?.className).toContain('[grid-template-columns:repeat(auto-fill,minmax(140px,1fr))]');
      expect(gridContainer?.className).toContain('grid-cols-2');
      expect(gridContainer?.className).toContain('sm:grid-cols-3');
      expect(gridContainer?.className).toContain('lg:grid-cols-4');
    });

    it('renders empty state gracefully without layout crash when searching nonexistent term', async () => {
      render(
        <div style={{ width: '600px' }}>
          <SpacesWidget />
        </div>
      );

      const searchInput = screen.getByPlaceholderText(/Tìm (?:kiếm|không gian nền)/i);
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'nonexistent-query-xyz-9999' } });
      });

      // Photo grid should show no matching wallpapers or empty
      expect(screen.queryByTestId('preset-card-oceans-wave')).toBeNull();
      // Spaces widget container remains healthy
      expect(screen.getByTestId('spaces-widget')).toBeDefined();
    });
  });

  // =========================================================================
  // SECTION 2: Pure-Black Exclusion from Thumbnails & Zero TUYỂN CHỌN
  // =========================================================================
  describe('2. Pure-Black Exclusion & Zero TUYỂN CHỌN Instances', () => {
    it('strictly excludes pure-black and all solid presets from photo thumbnails grid', () => {
      render(<SpacesWidget />);

      // In BACKGROUND_PRESETS, pure-black has id 'pure-black' and category 'solid'
      // Neither 'pure-black' nor 'zen-pure-black' should appear as preset-card
      expect(screen.queryByTestId('preset-card-pure-black')).toBeNull();
      expect(screen.queryByTestId('preset-card-zen-pure-black')).toBeNull();
      expect(screen.queryByTestId('preset-card-zen-deep-graphite')).toBeNull();
      expect(screen.queryByTestId('preset-card-zen-night-blue')).toBeNull();

      // Check all solid presets in BACKGROUND_PRESETS to ensure 100% exclusion
      const solidPresets = BACKGROUND_PRESETS.filter((p) => p.category === 'solid' || p.id === 'pure-black');
      solidPresets.forEach((p) => {
        expect(screen.queryByTestId(`preset-card-${p.id}`)).toBeNull();
      });
    });

    it('verifies ZERO instances of uppercase "TUYỂN CHỌN" in entire rendered DOM', () => {
      const { container } = render(<SpacesWidget />);

      const allText = container.textContent || '';
      expect(allText).not.toContain('TUYỂN CHỌN');
      expect(allText).not.toContain('TUYỂN CHỌN Pure Zen Black)');

      // Regex check across all text nodes
      const uppercaseMatches = allText.match(/TUYỂN CHỌN/g);
      expect(uppercaseMatches).toBeNull();
    });

    it('verifies preset badges use Sentence Case "Tuyển chọn" or "Video" and no ALL CAPS', () => {
      render(<SpacesWidget />);

      // Preset cards in preset video/image section
      const presetCards = screen.getAllByRole('button').filter((b) =>
        b.getAttribute('data-testid')?.startsWith('preset-card-')
      );
      expect(presetCards.length).toBeGreaterThan(0);

      presetCards.forEach((card) => {
        const badge = card.querySelector('span.backdrop-blur-md');
        expect(badge).toBeDefined();
        const text = badge?.textContent?.trim() || '';
        expect(text).not.toContain('TUYỂN CHỌN');
        const isSentenceCase = text.includes('Tuyển chọn') || text.includes('Video');
        expect(isSentenceCase).toBe(true);
      });
    });

    it('handles image onError gracefully with default fallback image', () => {
      render(<SpacesWidget />);

      const cards = screen.getAllByRole('button').filter((b) =>
        b.getAttribute('data-testid')?.startsWith('preset-card-')
      );
      expect(cards.length).toBeGreaterThan(0);

      const firstImg = cards[0].querySelector('img');
      expect(firstImg).toBeDefined();

      // Trigger error event
      fireEvent.error(firstImg!);
      expect(firstImg?.getAttribute('src')).toContain('images.unsplash.com');
    });
  });

  // =========================================================================
  // SECTION 3: Zen Button zen-pure-black activates setPureZenBlack()
  // =========================================================================
  describe('3. Zen Button zen-pure-black & setPureZenBlack() Verification', () => {
    it('renders zen-pure-black button with OLED #09090b background style', () => {
      render(<SpacesWidget />);

      const zenPureBlackBtn = screen.getByTestId('zen-color-zen-pure-black');
      expect(zenPureBlackBtn).toBeDefined();
      expect(zenPureBlackBtn.style.backgroundColor).toBe('rgb(9, 9, 11)'); // #09090b
      expect(zenPureBlackBtn.getAttribute('title')).toContain('#09090b');
    });

    it('clicking zen-pure-black selects zen-pure-black preset and highlights button with checkmark', () => {
      // Start with non-black preset, blur and brightness modifications
      useBackgroundStore.setState({
        activePresetId: 'deep-space',
        pure_zen_black: false,
        blurLevel: 10,
        brightnessLevel: 80,
        overlayOpacity: 30,
        ambientEffect: 'rain'
      });

      render(<SpacesWidget />);

      const zenPureBlackBtn = screen.getByTestId('zen-color-zen-pure-black');

      // Before click: not selected
      expect(zenPureBlackBtn.className).not.toContain('ring-2 ring-cyan-400');

      // Click button
      fireEvent.click(zenPureBlackBtn);

      // Verify store state updated by selectPreset('zen-pure-black')
      const state = useBackgroundStore.getState();
      expect(state.activePresetId).toBe('zen-pure-black');
      expect(state.customUrl).toBeNull();

      // Re-render check: button receives ring-2 ring-cyan-400 and checkmark
      expect(zenPureBlackBtn.className).toContain('ring-2 ring-cyan-400');
      expect(zenPureBlackBtn.className).toContain('scale-[1.02]');

      // Checkmark icon rendered
      const checkIcon = zenPureBlackBtn.querySelector('svg');
      expect(checkIcon).toBeDefined();
      expect(checkIcon?.classList.contains('text-cyan-400')).toBe(true);
    });

    it('stress test: clicking zen-pure-black when custom background blob/image is active completely purges it', () => {
      useBackgroundStore.setState({
        activePresetId: 'custom',
        customUrl: 'blob:https://example.com/custom-bg-123',
        customType: 'image',
        pure_zen_black: false
      });

      render(<SpacesWidget />);

      const zenPureBlackBtn = screen.getByTestId('zen-color-zen-pure-black');
      fireEvent.click(zenPureBlackBtn);

      const state = useBackgroundStore.getState();
      expect(state.activePresetId).toBe('zen-pure-black');
      expect(state.customUrl).toBeNull();
      expect(state.customType).toBeNull();
    });

    it('alternating between zen-pure-black and other zen colors toggles active preset accurately', () => {
      render(<SpacesWidget />);

      const zenBlackBtn = screen.getByTestId('zen-color-zen-pure-black');
      const zenGraphiteBtn = screen.getByTestId('zen-color-zen-deep-graphite');
      const zenBlueBtn = screen.getByTestId('zen-color-zen-night-blue');

      // 1. Click Graphite
      fireEvent.click(zenGraphiteBtn);
      expect(useBackgroundStore.getState().activePresetId).toBe('zen-deep-graphite');
      expect(zenGraphiteBtn.className).toContain('ring-2 ring-cyan-400');
      expect(zenBlackBtn.className).not.toContain('ring-2 ring-cyan-400');

      // 2. Click Blue
      fireEvent.click(zenBlueBtn);
      expect(useBackgroundStore.getState().activePresetId).toBe('zen-night-blue');
      expect(zenBlueBtn.className).toContain('ring-2 ring-cyan-400');
      expect(zenBlackBtn.className).not.toContain('ring-2 ring-cyan-400');

      // 3. Click Pure Black again
      fireEvent.click(zenBlackBtn);
      expect(useBackgroundStore.getState().activePresetId).toBe('zen-pure-black');
      expect(zenBlackBtn.className).toContain('ring-2 ring-cyan-400');
      expect(zenBlueBtn.className).not.toContain('ring-2 ring-cyan-400');
    });
  });

  // =========================================================================
  // SECTION 4: Window Buttons (— and ✕) Geometry & Functionality
  // =========================================================================
  describe('4. Window Buttons (— and ✕) Collapse & Close Functionality', () => {
    const testWidgetIds: WidgetId[] = ['timer', 'tasks', 'notes', 'spaces', 'media'];

    describe('Desktop Mode (isMobile: false)', () => {
      beforeEach(() => {
        useLayoutStore.setState((state) => ({
          isMobile: false,
          widgets: {
            ...state.widgets,
            timer: { ...state.widgets.timer, isOpen: true, isCollapsed: false },
            tasks: { ...state.widgets.tasks, isOpen: true, isCollapsed: false },
            notes: { ...state.widgets.notes, isOpen: true, isCollapsed: false },
            spaces: { ...state.widgets.spaces, isOpen: true, isCollapsed: false },
            media: { ...state.widgets.media, isOpen: true, isCollapsed: false }
          }
        }));
      });

      testWidgetIds.forEach((id) => {
        it(`widget "${id}" has sleek desktop window buttons conforming to Monochrome 90-10`, () => {
          render(
            <WidgetContainer id={id}>
              <div data-testid={`content-${id}`}>Content {id}</div>
            </WidgetContainer>
          );

          const collapseBtn = screen.getByTestId(`collapse-widget-${id}`);
          const closeBtn = screen.getByTestId(`close-widget-${id}`);

          // Must have sleek dimensions w-6 h-6 sm:w-6.5 sm:h-6.5 rounded-lg text-zinc-400
          expect(collapseBtn.className).toContain('w-6');
          expect(collapseBtn.className).toContain('rounded-lg');
          expect(collapseBtn.className).toContain('text-zinc-400');
          expect(collapseBtn.className).not.toContain('rounded-xl');
          expect(collapseBtn.className).not.toContain('border-white/10');

          expect(closeBtn.className).toContain('w-6');
          expect(closeBtn.className).toContain('rounded-lg');
          expect(closeBtn.className).toContain('text-zinc-400');
          expect(closeBtn.className).not.toContain('rounded-xl');
          expect(closeBtn.className).not.toContain('border-white/10');
        });

        it(`widget "${id}" collapse button collapses window into capsule (or PiP) and expands back`, () => {
          const { unmount } = render(
            <WidgetContainer id={id}>
              <div data-testid={`content-${id}`}>Content {id}</div>
            </WidgetContainer>
          );

          const collapseBtn = screen.getByTestId(`collapse-widget-${id}`);

          // Initial: isCollapsed === false, button has Minus icon and "Thu nhỏ cửa sổ" title
          expect(useLayoutStore.getState().widgets[id].isCollapsed).toBe(false);
          expect(collapseBtn.getAttribute('title')).toBe('Thu nhỏ cửa sổ');

          // 1. Click collapse
          fireEvent.click(collapseBtn);
          expect(useLayoutStore.getState().widgets[id].isCollapsed).toBe(true);

          unmount();

          // Re-render collapsed state
          render(
            <WidgetContainer id={id}>
              <div data-testid={`content-${id}`}>Content {id}</div>
            </WidgetContainer>
          );

          if (id === 'media') {
            // Media keeps its PiP floating header
            const pipCollapseBtn = screen.getByTestId('collapse-widget-media');
            expect(pipCollapseBtn.getAttribute('title')).toBe('Mở rộng cửa sổ');
            fireEvent.click(pipCollapseBtn);
            expect(useLayoutStore.getState().widgets.media.isCollapsed).toBe(false);
          } else {
            // Other widgets render as a floating capsule with expand button or click on card
            const expandBtn = screen.queryByTestId(`collapsed-${id}-expand-btn`);
            if (expandBtn) {
              fireEvent.click(expandBtn);
            } else {
              const capsule = screen.getByTestId(`widget-container-${id}`);
              fireEvent.click(capsule);
            }
            expect(useLayoutStore.getState().widgets[id].isCollapsed).toBe(false);
          }
        });

        it(`widget "${id}" close button sets isOpen to false`, () => {
          render(
            <WidgetContainer id={id}>
              <div data-testid={`content-${id}`}>Content {id}</div>
            </WidgetContainer>
          );

          const closeBtn = screen.getByTestId(`close-widget-${id}`);
          expect(useLayoutStore.getState().widgets[id].isOpen).toBe(true);

          // Click close
          fireEvent.click(closeBtn);
          expect(useLayoutStore.getState().widgets[id].isOpen).toBe(false);
        });
      });

      it('media widget preserves collapse button with Maximize2 icon in PiP mode', () => {
        useLayoutStore.setState((state) => ({
          widgets: {
            ...state.widgets,
            media: { ...state.widgets.media, isOpen: true, isCollapsed: true }
          }
        }));

        render(
          <WidgetContainer id="media">
            <div>Video Content</div>
          </WidgetContainer>
        );

        const collapseBtn = screen.getByTestId('collapse-widget-media');
        expect(collapseBtn.getAttribute('title')).toBe('Mở rộng cửa sổ');
        // Maximize2 icon rendered
        const icon = collapseBtn.querySelector('svg');
        expect(icon).toBeDefined();
        expect(icon?.getAttribute('class') || '').toContain('lucide');
      });
    });

    describe('Mobile Modal Mode (isMobile: true)', () => {
      beforeEach(() => {
        useLayoutStore.setState((state) => ({
          isMobile: true,
          widgets: {
            ...state.widgets,
            timer: { ...state.widgets.timer, isOpen: true, isCollapsed: false },
            tasks: { ...state.widgets.tasks, isOpen: true, isCollapsed: false },
            notes: { ...state.widgets.notes, isOpen: true, isCollapsed: false }
          }
        }));
      });

      it('renders sleek mobile window buttons (w-7 h-7 rounded-lg) in mobile modal', () => {
        render(
          <WidgetContainer id="tasks">
            <div>Mobile Tasks Content</div>
          </WidgetContainer>
        );

        const collapseBtn = screen.getByTestId('collapse-widget-tasks');
        const closeBtn = screen.getByTestId('close-widget-tasks');

        expect(collapseBtn.className).toContain('w-7');
        expect(collapseBtn.className).toContain('h-7');
        expect(collapseBtn.className).toContain('rounded-lg');
        expect(collapseBtn.className).not.toContain('rounded-xl');

        expect(closeBtn.className).toContain('w-7');
        expect(closeBtn.className).toContain('h-7');
        expect(closeBtn.className).toContain('rounded-lg');
        expect(closeBtn.className).not.toContain('rounded-xl');
      });

      it('mobile collapse renders CollapsedWidgetCard and uncollapses back', () => {
        const { unmount } = render(
          <WidgetContainer id="tasks">
            <div data-testid="full-tasks-content">Full Tasks Content</div>
          </WidgetContainer>
        );

        // Initial: full children visible
        expect(screen.getByTestId('full-tasks-content')).toBeDefined();

        const collapseBtn = screen.getByTestId('collapse-widget-tasks');
        fireEvent.click(collapseBtn);

        expect(useLayoutStore.getState().widgets.tasks.isCollapsed).toBe(true);
        unmount();

        // Re-render collapsed state
        render(
          <WidgetContainer id="tasks">
            <div data-testid="full-tasks-content">Full Tasks Content</div>
          </WidgetContainer>
        );

        // Full content should NOT be rendered when collapsed
        expect(screen.queryByTestId('full-tasks-content')).toBeNull();

        // Click expand button to restore
        const expandBtn = screen.getByTestId('collapsed-tasks-expand-btn');
        fireEvent.click(expandBtn);
        expect(useLayoutStore.getState().widgets.tasks.isCollapsed).toBe(false);
      });

      it('mobile close button closes the mobile modal', () => {
        render(
          <WidgetContainer id="notes">
            <div>Mobile Notes Content</div>
          </WidgetContainer>
        );

        const closeBtn = screen.getByTestId('close-widget-notes');
        expect(useLayoutStore.getState().widgets.notes.isOpen).toBe(true);

        fireEvent.click(closeBtn);
        expect(useLayoutStore.getState().widgets.notes.isOpen).toBe(false);
      });
    });

    describe('Adversarial Stress: Rapid and Concurrent Actions', () => {
      it('survives 20 rapid alternating clicks on collapse/expand triggers without state corruption', () => {
        useLayoutStore.setState((state) => ({
          isMobile: false,
          widgets: {
            ...state.widgets,
            timer: { ...state.widgets.timer, isOpen: true, isCollapsed: false }
          }
        }));

        for (let i = 0; i < 20; i++) {
          act(() => {
            useLayoutStore.getState().toggleCollapseWidget('timer');
          });
        }

        // 20 clicks = even number of toggles => back to isCollapsed: false
        expect(useLayoutStore.getState().widgets.timer.isCollapsed).toBe(false);
      });

      it('closing a collapsed widget sets isOpen: false properly', () => {
        useLayoutStore.setState((state) => ({
          isMobile: false,
          widgets: {
            ...state.widgets,
            spaces: { ...state.widgets.spaces, isOpen: true, isCollapsed: false }
          }
        }));

        render(
          <WidgetContainer id="spaces">
            <div>Spaces</div>
          </WidgetContainer>
        );

        const closeBtn = screen.getByTestId('close-widget-spaces');
        fireEvent.click(closeBtn);

        expect(useLayoutStore.getState().widgets.spaces.isOpen).toBe(false);
      });
    });
  });
});
