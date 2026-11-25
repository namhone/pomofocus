import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { SpacesWidget } from '../../src/components/SpacesWidget';
import { WidgetContainer } from '../../src/components/WidgetContainer';
import { WALLPAPERS, ANIME_WALLPAPERS_LOCAL } from '../../src/data/wallpapers';
import { BACKGROUND_PRESETS } from '../../src/data/backgroundPresets';
import { DEFAULT_WIDGETS, useLayoutStore } from '../../src/stores/useLayoutStore';
import { SAAS_PRICING_TIERS } from '../../src/config/pricing';
import { AI_CREDIT_PACKS } from '../../src/stores/useAiStore';
import { calculateCreditPrice } from '../../src/components/AiCreditsTopupModal';
import { db } from '../../src/db';
import { useNoteStore } from '../../src/stores/useNoteStore';

describe('Milestone 3 — Spaces Gallery, Wallpapers, Global Sentence Case & Emoji Polish', () => {
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

  describe('1. SpacesWidget Polish & Responsive Layout', () => {
    it('SpacesWidget renders with responsive container classes (w-full min-w-0 max-h-[80vh])', () => {
      render(<SpacesWidget />);
      const root = screen.getByTestId('spaces-widget');
      expect(root).toBeDefined();
      expect(root.className).toContain('w-full');
      expect(root.className).toContain('min-w-0');
      expect(root.className).toContain('max-h-[80vh]');
    });

    it('Search input has updated placeholder matching spec: "Tìm không gian nền (Lofi, Anime, Tokyo, Minimalist...)"', () => {
      render(<SpacesWidget />);
      const searchInput = screen.getByPlaceholderText('Tìm không gian nền (Lofi, Anime, Tokyo, Minimalist...)');
      expect(searchInput).toBeDefined();
    });

    it('Presets grid renders with responsive 2-to-4 column grid classes (grid-cols-2 sm:grid-cols-3 md:grid-cols-4)', () => {
      render(<SpacesWidget />);
      const grid = screen.getByTestId('presets-grid');
      expect(grid).toBeDefined();
      expect(grid.className).toContain('grid-cols-2');
      expect(grid.className).toContain('sm:grid-cols-3');
      expect(grid.className).toContain('md:grid-cols-4');
    });

    it('Presets grid excludes solid and pure-black presets from thumbnail cards', () => {
      render(<SpacesWidget />);
      expect(screen.queryByTestId('preset-card-pure-black')).toBeNull();
      expect(screen.queryByTestId('preset-card-zen-pure-black')).toBeNull();
    });

    it('Curated badge on preset cards displays Sentence Case "Tuyển chọn"', () => {
      render(<SpacesWidget />);
      const badges = screen.getAllByText('Tuyển chọn');
      expect(badges.length).toBeGreaterThan(0);
    });

    it('Wallpaper button displays Sentence Case label "Xem kho hình nền" in effects view', () => {
      render(<SpacesWidget />);
      const effectsToggle = screen.getByTestId('btn-toggle-adjustments');
      fireEvent.click(effectsToggle);
      const wallpaperBtn = screen.getByText('Xem kho hình nền');
      expect(wallpaperBtn).toBeDefined();
    });
  });

  describe('2. Wallpapers & Live Video Presets Expansion', () => {
    it('ANIME_WALLPAPERS_LOCAL[0] retains "Chuyến tàu trên mặt nước" prefix to protect E2E Playwright tests', () => {
      const firstAnime = ANIME_WALLPAPERS_LOCAL[0];
      expect(firstAnime.filename).toBe('anime-01.webp');
      expect(firstAnime.title.startsWith('Chuyến tàu trên mặt nước')).toBe(true);
    });

    it('ANIME_WALLPAPERS_LOCAL titles are concise and clean', () => {
      for (const wp of ANIME_WALLPAPERS_LOCAL) {
        expect(wp.title.length).toBeLessThan(60);
      }
    });

    it('contains 30 actual images without invented franchise photos or variants', () => {
      expect(WALLPAPERS).toHaveLength(30);
      expect(WALLPAPERS.some(item => item.tags.includes('pixel-art'))).toBe(true);
      expect(WALLPAPERS.every(item => !/Bản Phối|Góc Nhìn/.test(item.title))).toBe(true);
    });

    it('BACKGROUND_PRESETS contains 2 distinct lightweight video clips', () => {
      const requiredVideoIds = ['oceans-wave', 'flower-timelapse'];

      for (const id of requiredVideoIds) {
        const preset = BACKGROUND_PRESETS.find((p) => p.id === id);
        expect(preset).toBeDefined();
        expect(preset?.category).toBe('video');
        expect(preset?.url).toBeDefined();
        expect(preset?.url.length).toBeGreaterThan(0);
      }
    });
  });

  describe('3. Global Sentence Case Standardization & ALL CAPS Removal', () => {
    it('WidgetContainer defines canonical Sentence Case titles for settings, spaces, and sounds', () => {
      useLayoutStore.setState((state) => ({
        widgets: {
          ...state.widgets,
          spaces: { ...state.widgets.spaces, isOpen: true },
          sounds: { ...state.widgets.sounds, isOpen: true },
          settings: { ...state.widgets.settings, isOpen: true }
        }
      }));

      const { unmount: unmountSpaces } = render(
        <WidgetContainer id="spaces">
          <div>Content</div>
        </WidgetContainer>
      );
      expect(screen.getByText('Không gian nền')).toBeDefined();
      unmountSpaces();

      const { unmount: unmountSounds } = render(
        <WidgetContainer id="sounds">
          <div>Content</div>
        </WidgetContainer>
      );
      expect(screen.getByText('Bảng âm thanh & chuông')).toBeDefined();
      unmountSounds();

      const { unmount: unmountSettings } = render(
        <WidgetContainer id="settings">
          <div>Content</div>
        </WidgetContainer>
      );
      expect(screen.getByText('Cài đặt hệ thống')).toBeDefined();
      unmountSettings();
    });

    it('DEFAULT_WIDGETS in useLayoutStore defines Sentence Case titles', () => {
      expect(DEFAULT_WIDGETS.spaces.title).toBe('Không gian nền');
      expect(DEFAULT_WIDGETS.sounds.title).toBe('Bảng âm thanh & chuông');
      expect(DEFAULT_WIDGETS.settings.title).toBe('Cài đặt hệ thống');
    });

    it('SAAS_PRICING_TIERS uses Sentence Case badges and taglines without ALL CAPS or emojis', () => {
      const yearly = SAAS_PRICING_TIERS.find((p) => p.id === 'yearly');
      expect(yearly?.tagline).toBe('Gói khuyên dùng');
      expect(yearly?.badge).toBe('Gói phổ biến nhất');
      expect(yearly?.tagline).not.toContain('🔥');

      const lifetime = SAAS_PRICING_TIERS.find((p) => p.id === 'lifetime');
      expect(lifetime?.tagline).toBe('Lifetime Founder VIP');
      expect(lifetime?.badge).toBe('Founder VIP');
      expect(lifetime?.tagline).not.toContain('👑');
    });

    it('AI_CREDIT_PACKS in useAiStore badges use Sentence Case and contain no emojis', () => {
      const pack1500 = AI_CREDIT_PACKS.find((p) => p.id === 'pack_1500');
      expect(pack1500?.badge).toBe('Tiết kiệm 28%');
      expect(pack1500?.badge).not.toContain('🔥');

      const pack4000 = AI_CREDIT_PACKS.find((p) => p.id === 'pack_4000');
      expect(pack4000?.badge).toBe('Tiết kiệm 40%');
      expect(pack4000?.badge).not.toContain('👑');
    });

    it('calculateCreditPrice discountBadge contains no emojis', () => {
      const res1500 = calculateCreditPrice(1500);
      expect(res1500.discountBadge).toBe('Tiết kiệm 28%');
      expect(res1500.discountBadge).not.toContain('🔥');

      const res4000 = calculateCreditPrice(4000);
      expect(res4000.discountBadge).toBe('Tiết kiệm 40%');
      expect(res4000.discountBadge).not.toContain('👑');

      const resSlider3500 = calculateCreditPrice(3500);
      expect(resSlider3500.discountBadge).toBe('Tiết kiệm 40%');
      expect(resSlider3500.discountBadge).not.toContain('👑');
    });
  });

  describe('4. Emoji Cleanup & Invariant Preservation', () => {
    it('useNoteStore default markdown content has no 📝 emoji and uses Sentence Case', async () => {
      await useNoteStore.getState().loadNotes();
      const notes = useNoteStore.getState().notes;
      expect(notes.length).toBeGreaterThan(0);
      const defaultNote = notes[0];
      expect(defaultNote.contentMarkdown).toContain('# Chào mừng bạn đến với Không gian ghi chú!');
      expect(defaultNote.contentMarkdown).not.toContain('📝');
    });
  });
});
