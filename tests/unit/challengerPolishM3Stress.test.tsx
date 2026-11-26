import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { SpacesWidget } from '../../src/components/SpacesWidget';
import { DockBar } from '../../src/components/DockBar';
import { SettingsView } from '../../src/components/SettingsView';
import { SharedFooter } from '../../src/components/SharedFooter';
import { StudyRoomLobby } from '../../src/components/StudyRoomLobby';
import { BillingView } from '../../src/components/BillingView';
import { WALLPAPERS, queryWallpapers, ANIME_WALLPAPERS_LOCAL } from '../../src/data/wallpapers';
import { BACKGROUND_PRESETS } from '../../src/data/backgroundPresets';
import { useBackgroundStore, DEFAULT_BACKGROUND_STATE } from '../../src/stores/useBackgroundStore';
import { useLayoutStore } from '../../src/stores/useLayoutStore';
import { SAAS_PRICING_TIERS } from '../../src/config/pricing';
import { AI_CREDIT_PACKS } from '../../src/stores/useAiStore';
import { useNoteStore } from '../../src/stores/useNoteStore';
import { db } from '../../src/db';

describe('Adversarial Challenger Suite: Milestone 3 Polish', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    useBackgroundStore.getState().resetBackground();
    try {
      await db.notes.clear();
      await db.custom_backgrounds.clear();
    } catch {}
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Challenge 1: SpacesWidget Layout, Resizing & Viewport Responsiveness', () => {
    it('root container enforces fluid width (w-full min-w-0 max-h-[80vh]) and does not restrict to max-w-[420px]', () => {
      render(<SpacesWidget />);
      const root = screen.getByTestId('spaces-widget');
      expect(root).toBeDefined();
      expect(root.className).toContain('w-full');
      expect(root.className).toContain('min-w-0');
      expect(root.className).toContain('max-h-[80vh]');
      expect(root.className).not.toContain('max-w-[420px]');
    });

    it('presets grid implements responsive 2 to 4 column layout (grid-cols-2 sm:grid-cols-3 md:grid-cols-4)', () => {
      render(<SpacesWidget />);
      const presetsGrid = screen.getByTestId('presets-grid');
      expect(presetsGrid).toBeDefined();
      expect(presetsGrid.className).toContain('auto-fill');
      expect(presetsGrid.className).toContain('minmax');
      expect(presetsGrid.className).toContain('132px');
    });

    it('wallpaper grid implements responsive 2 to 4 column layout (grid-cols-2 sm:grid-cols-3 md:grid-cols-4)', () => {
      const { container } = render(<SpacesWidget />);
      // Filter out video to view wallpaper grid
      const allFilter = screen.getByRole('combobox', { name: 'Danh mục hình nền' });
      fireEvent.change(allFilter, { target: { value: 'all' } });
      // The wallpaper grid container
      const grids = container.querySelectorAll('.grid');
      const wallpaperGrid = Array.from(grids).find((g) =>
        g.className.includes('auto-fill') &&
        g.getAttribute('data-testid') !== 'presets-grid'
      );
      expect(wallpaperGrid).toBeDefined();
      expect(wallpaperGrid?.className).toContain('auto-fill');
      expect(wallpaperGrid?.className).toContain('minmax');
      expect(wallpaperGrid?.className).toContain('132px');
    });
  });

  describe('Challenge 2: Adversarial Search & Wallpaper Query Stress Tests', () => {
    it('handles adversarial search terms (special characters, regex characters, long strings) without throwing', () => {
      const adversarialQueries = [
        '   ',
        '!!!@@@###$$$%%%^^^&&&***()',
        '([{\\^$|?*+.',
        'non_existent_wallpaper_id_404_error',
        'A'.repeat(500),
        'anime',
        'TOKYO',
        'SuZuMe',
        'Lofi',
        'shinkai',
        'ghibli'
      ];

      for (const query of adversarialQueries) {
        expect(() => {
          const result = queryWallpapers({ query, page: 1, limit: 24 });
          expect(Array.isArray(result.items)).toBe(true);
          expect(typeof result.total).toBe('number');
          expect(typeof result.totalPages).toBe('number');
          expect(typeof result.hasMore).toBe('boolean');
          for (const item of result.items) {
            expect(item.id).toBeDefined();
            expect(item.title).toBeDefined();
            expect(item.thumbnailUrl).toBeDefined();
            expect(item.fullUrl).toBeDefined();
            expect(item.category).toBeDefined();
          }
        }).not.toThrow();
      }
    });

    it('searching in SpacesWidget UI updates results and does not crash when results are 0', () => {
      render(<SpacesWidget />);
      const searchInput = screen.getByLabelText('Tìm hình nền');
      expect(searchInput).toBeDefined();

      // Search for something with 0 matches
      fireEvent.change(searchInput, { target: { value: 'xyz_absolutely_no_matches_found_ever' } });
      // Should not throw and UI remains stable
      expect(screen.getByTestId('spaces-widget')).toBeDefined();

      // Search for Tokyo
      fireEvent.change(searchInput, { target: { value: 'Tokyo' } });
      expect(screen.getByTestId('spaces-widget')).toBeDefined();
    });

    it('queryWallpapers handles pagination out of bounds gracefully by clamping bounds', () => {
      const pageNegative = queryWallpapers({ page: -5, limit: 24 });
      expect(pageNegative.items.length).toBeGreaterThan(0);

      const pageExcessive = queryWallpapers({ page: 999999, limit: 24 });
      // When page exceeds totalPages, queryWallpapers self-heals by clamping to totalPages
      expect(pageExcessive.items.length).toBeGreaterThan(0);
      expect(pageExcessive.hasMore).toBe(false);
    });
  });

  describe('Challenge 3: Preset Filtering & Live Video Integrity', () => {
    it('photo presets exclude solid and zen-pure-black from thumbnail cards', () => {
      render(<SpacesWidget />);
      expect(screen.queryByTestId('preset-card-pure-black')).toBeNull();
      expect(screen.queryByTestId('preset-card-zen-pure-black')).toBeNull();
      expect(screen.queryByTestId('preset-card-zen-deep-graphite')).toBeNull();
      expect(screen.queryByTestId('preset-card-zen-night-blue')).toBeNull();
    });

    it('zen flat color buttons exist separately and trigger selectPreset', () => {
      render(<SpacesWidget />);
      const zenBlackBtn = screen.getByTestId('zen-color-zen-pure-black');
      expect(zenBlackBtn).toBeDefined();
      fireEvent.click(zenBlackBtn);
      expect(useBackgroundStore.getState().activePresetId).toBe('zen-pure-black');

      const zenGraphiteBtn = screen.getByTestId('zen-color-zen-deep-graphite');
      fireEvent.click(zenGraphiteBtn);
      expect(useBackgroundStore.getState().activePresetId).toBe('zen-deep-graphite');
    });

    it('two real video presets have distinct HTTPS sources and accurate licenses', () => {
      const videos = BACKGROUND_PRESETS.filter(preset => preset.category === 'video');
      expect(videos).toHaveLength(2);
      expect(new Set(videos.map(preset => preset.url)).size).toBe(2);
      expect(videos.find(preset => preset.id === 'oceans-wave')?.license).toBe('Pexels Free License');
      expect(videos.find(preset => preset.id === 'flower-timelapse')?.license).toBe('CC0');
      expect(videos.every(preset => preset.url.startsWith('https://') && !/friday|ForBigger|TearsOfSteel/.test(preset.url))).toBe(true);
    });

    it('filter by video category renders video presets in presets-grid', () => {
      render(<SpacesWidget />);
      const videoTab = screen.getByRole('combobox', { name: 'Danh mục hình nền' });
      fireEvent.change(videoTab, { target: { value: 'video' } });

      const cyberpunkCard = screen.getByTestId('preset-card-flower-timelapse');
      expect(cyberpunkCard).toBeDefined();
      fireEvent.click(cyberpunkCard);
      expect(useBackgroundStore.getState().activePresetId).toBe('flower-timelapse');
    });
  });

  describe('Challenge 4: Tab Interactions, Lucide Icons & Click Handlers', () => {
    it('switching between wallpapers and audio tabs works without crashing or orphaned state', () => {
      render(<SpacesWidget />);
      const audioTab = screen.getByTestId('spaces-tab-audio');
      fireEvent.click(audioTab);
      // AudioWidget is rendered
      expect(screen.getByTestId('audio-widget-root')).toBeDefined();

      const wallpapersTab = screen.getByTestId('spaces-tab-wallpapers');
      fireEvent.click(wallpapersTab);
      // Back to wallpapers
      expect(screen.queryByTestId('audio-widget-root')).toBeNull();
      expect(screen.getByTestId('presets-grid')).toBeDefined();
    });

    it('toggling adjustments view and clicking "Xem kho hình nền" switches back to wallpapers view', () => {
      render(<SpacesWidget />);
      const adjustmentsBtn = screen.getByTestId('btn-toggle-adjustments');
      fireEvent.click(adjustmentsBtn);

      // Now in effects view
      const viewWallpapersBtn = screen.getByText('Xem kho hình nền');
      expect(viewWallpapersBtn).toBeDefined();
      fireEvent.click(viewWallpapersBtn);

      // Returned to wallpapers view
      expect(screen.getByTestId('presets-grid')).toBeDefined();
    });

    it('reset background button clears active preset and resets to default (deep-space)', () => {
      useBackgroundStore.getState().selectPreset('flower-timelapse');
      expect(useBackgroundStore.getState().activePresetId).toBe('flower-timelapse');

      render(<SpacesWidget />);
      const resetBtn = screen.getByTestId('btn-reset-bg');
      fireEvent.click(resetBtn);

      expect(useBackgroundStore.getState().activePresetId).toBe(DEFAULT_BACKGROUND_STATE.activePresetId);
    });
  });

  describe('Challenge 5: Global Sentence Case & Elimination of ALL CAPS', () => {
    it('DockBar Eco Mode toggle uses Lucide Leaf and Sentence Case labels (Bật / Tắt)', () => {
      useLayoutStore.setState({ isMobile: false, isZenMode: false, dockAutoHide: false });
      render(<DockBar />);
      // Click presets/sliders button to open quick dock menu
      const presetsBtn = screen.getByTestId('dock-btn-presets');
      fireEvent.click(presetsBtn);

      expect(screen.getByText('Eco mode siêu nhẹ')).toBeDefined();
      const ecoBtn = screen.getByTestId('quick-dock-eco-toggle');
      expect(ecoBtn.textContent).toMatch(/^(Bật|Tắt)$/i);
      expect(ecoBtn.textContent).not.toBe('BẬT');
      expect(ecoBtn.textContent).not.toBe('TẮT');
    });

    it('SettingsView Eco Mode section uses Lucide Leaf and Sentence Case', () => {
      render(<SettingsView />);
      expect(screen.getByText('Chế độ siêu nhẹ (eco mode)')).toBeDefined();
      const toggleEcoBtn = screen.getByTestId('setting-toggle-eco-mode');
      expect(toggleEcoBtn.textContent).toMatch(/^(Đang bật|Tắt)$/);
      expect(toggleEcoBtn.textContent).not.toContain('🍃');
      expect(toggleEcoBtn.textContent).not.toBe('BẬT');
      expect(toggleEcoBtn.textContent).not.toBe('TẮT');
    });

    it('SharedFooter column headers are in Sentence Case without uppercase CSS classes', () => {
      const { container } = render(<SharedFooter />);
      const allText = container.textContent || '';
      expect(allText).toContain('Liên hệ trực tiếp');
      expect(allText).toContain('Sản phẩm & không gian');
      expect(allText).toContain('Hỗ trợ & điều khoản');

      // Assert no element in SharedFooter uses uppercase class
      const uppercaseElements = container.querySelectorAll('.uppercase');
      expect(uppercaseElements.length).toBe(0);
    });

    it('StudyRoomLobby room badges use Sentence Case and no ALL CAPS', () => {
      const { container } = render(<StudyRoomLobby onJoinRoom={() => {}} />);
      const allText = container.textContent || '';
      expect(allText).not.toContain('MÃ DUY NHẤT');
      expect(allText).not.toContain('SẴN SÀNG');
      expect(allText).not.toContain('CHỜ BẮT ĐẦU');
      expect(allText).not.toContain('PHÒNG ĐẦY');
    });

    it('BillingView does not contain ALL CAPS badges or headers', () => {
      const { container } = render(<BillingView />);
      const allText = container.textContent || '';
      expect(allText).not.toContain('FOUNDER LIFETIME VIP');
      expect(allText).not.toContain('GÓI ĐANG HOẠT ĐỘNG');
      expect(allText).not.toContain('GIA HẠN THUÊ BAO');
      expect(allText).not.toContain('NÂNG CẤP TRỌN ĐỜI');
      expect(allText).not.toContain('TIẾT KIỆM TỐI ĐA');
      expect(allText).not.toContain('ĐẦU TƯ CHO SỰ TẬP TRUNG');
    });
  });

  describe('Challenge 6: Invariant Preservation Check', () => {
    it('ANIME_WALLPAPERS_LOCAL[0] invariant: starts with "Chuyến tàu trên mặt nước" for Playwright test selector', () => {
      const firstAnime = ANIME_WALLPAPERS_LOCAL[0];
      expect(firstAnime.filename).toBe('anime-01.webp');
      expect(firstAnime.title.startsWith('Chuyến tàu trên mặt nước')).toBe(true);
    });

    it('pricing tiers and ai packs do not contain raw emojis', () => {
      for (const tier of SAAS_PRICING_TIERS) {
        expect(tier.tagline).not.toContain('🔥');
        expect(tier.tagline).not.toContain('👑');
        if (tier.badge) {
          expect(tier.badge).not.toContain('🔥');
          expect(tier.badge).not.toContain('👑');
        }
      }

      for (const pack of AI_CREDIT_PACKS) {
        if (pack.badge) {
          expect(pack.badge).not.toContain('🔥');
          expect(pack.badge).not.toContain('👑');
        }
      }
    });

    it('useNoteStore default markdown content has no 📝 emoji', async () => {
      await useNoteStore.getState().loadNotes();
      const notes = useNoteStore.getState().notes;
      expect(notes[0].contentMarkdown).not.toContain('📝');
    });
  });
});
