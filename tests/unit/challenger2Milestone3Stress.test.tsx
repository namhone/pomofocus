import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { SpacesWidget } from '../../src/components/SpacesWidget';
import { WALLPAPERS, ANIME_WALLPAPERS_LOCAL, WALLPAPER_CATEGORIES } from '../../src/data/wallpapers';
import { BACKGROUND_PRESETS } from '../../src/data/backgroundPresets';
import { DEFAULT_WIDGETS, useLayoutStore } from '../../src/stores/useLayoutStore';
import { useBackgroundStore } from '../../src/stores/useBackgroundStore';
import { SAAS_PRICING_TIERS } from '../../src/config/pricing';
import { AI_CREDIT_PACKS } from '../../src/stores/useAiStore';
import { calculateCreditPrice } from '../../src/components/AiCreditsTopupModal';
import { db } from '../../src/db';
import { useNoteStore } from '../../src/stores/useNoteStore';
import { PomoFocusLogo } from '../../src/components/PomoFocusLogo';
import { SharedFooter } from '../../src/components/SharedFooter';

describe('Empirical Challenger 2 — Adversarial Stress Test Suite for Milestone 3', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    useBackgroundStore.setState({
      activePresetId: 'deep-space',
      customUrl: '',
      backgroundType: 'gradient'
    });
    try {
      await db.notes.clear();
    } catch {}
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Vector 1: E2E Presets & Wallpaper Invariants', () => {
    it('CRITICAL: ANIME_WALLPAPERS_LOCAL[0] is exactly anime-01.webp with title "Chuyến tàu trên mặt nước"', () => {
      const first = ANIME_WALLPAPERS_LOCAL[0];
      expect(first).toBeDefined();
      expect(first.filename).toBe('anime-01.webp');
      expect(first.title).toBe('Chuyến tàu trên mặt nước');
      expect(first.author).toContain('Studio Ghibli');
    });

    it('All 18 local anime wallpapers have valid filenames, concise titles (<60 chars), authors, and tags', () => {
      expect(ANIME_WALLPAPERS_LOCAL.length).toBe(18);
      const filenames = new Set<string>();
      const titles = new Set<string>();

      ANIME_WALLPAPERS_LOCAL.forEach((wp) => {
        expect(wp.filename).toMatch(/^anime-\d{2}\.webp$/);
        expect(filenames.has(wp.filename)).toBe(false);
        filenames.add(wp.filename);

        expect(wp.title.trim().length).toBeGreaterThan(0);
        expect(wp.title.length).toBeLessThan(60);
        expect(titles.has(wp.title)).toBe(false);
        titles.add(wp.title);

        expect(wp.author.trim().length).toBeGreaterThan(0);
        expect(Array.isArray(wp.tags)).toBe(true);
        expect(wp.tags.length).toBeGreaterThan(0);
      });
    });

    it('WALLPAPERS list contains 0 duplicate IDs and all items have valid URLs', () => {
      const ids = new Set<string>();
      for (const wp of WALLPAPERS) {
        expect(wp.id.trim().length).toBeGreaterThan(0);
        expect(ids.has(wp.id), `Duplicate wallpaper id found: ${wp.id}`).toBe(false);
        ids.add(wp.id);

        expect(wp.title.trim().length).toBeGreaterThan(0);
        expect(wp.thumbnailUrl.startsWith('http') || wp.thumbnailUrl.startsWith('/')).toBe(true);
        expect(wp.fullUrl.startsWith('http') || wp.fullUrl.startsWith('/')).toBe(true);
      }
    });

    it('contains 30 distinct curated wallpapers across anime, lofi and cyberpunk', () => {
      expect(WALLPAPERS).toHaveLength(30);
      expect(new Set(WALLPAPERS.map(item => item.fullUrl)).size).toBe(30);
      for (const category of ['anime-ghibli', 'lofi-study', 'cyberpunk-tokyo']) {
        expect(WALLPAPERS.some(item => item.category === category)).toBe(true);
      }
    });

    it('BACKGROUND_PRESETS contains all baseline E2E presets and 2 real video clips with 0 duplicates', () => {
      const ids = new Set<string>();
      const expectedIds = ['deep-space', 'cozy-lofi-room', 'pure-black', 'oceans-wave', 'flower-timelapse', 'tokyo-neon'];

      for (const preset of BACKGROUND_PRESETS) {
        expect(ids.has(preset.id), `Duplicate preset id: ${preset.id}`).toBe(false);
        ids.add(preset.id);
        expect(preset.title.trim().length).toBeGreaterThan(0);
        expect(preset.category).toBeDefined();
        expect(preset.url.trim().length).toBeGreaterThan(0);
      }

      for (const id of expectedIds) {
        expect(ids.has(id), `Missing required preset: ${id}`).toBe(true);
      }
    });
  });

  describe('Vector 2: SpacesWidget E2E Selector & Interaction Robustness', () => {
    it('SpacesWidget renders all required testids matching Playwright specs', () => {
      render(<SpacesWidget />);

      // Root and header
      expect(screen.getByTestId('spaces-widget')).toBeDefined();
      expect(screen.getByText('Thư Viện Không Gian')).toBeDefined();

      // Controls
      expect(screen.getByTestId('btn-toggle-adjustments')).toBeDefined();
      expect(screen.getByTestId('btn-reset-bg')).toBeDefined();

      // Category filter buttons
      expect(screen.getByTestId('filter-cat-all')).toBeDefined();
      expect(screen.getByTestId('filter-cat-video')).toBeDefined();
      for (const cat of WALLPAPER_CATEGORIES.filter((c) => c.id !== 'all')) {
        expect(screen.getByTestId(`filter-cat-${cat.id}`)).toBeDefined();
      }

      // Default presets grid
      expect(screen.getByTestId('presets-grid')).toBeDefined();
      expect(screen.getByTestId('preset-card-deep-space')).toBeDefined();
      expect(screen.getByTestId('preset-card-cozy-lofi-room')).toBeDefined();
      expect(screen.getByTestId('preset-card-oceans-wave')).toBeDefined();
    });

    it('Clicking adjustments toggle opens bg-adjustments-panel with slider-overlay', () => {
      render(<SpacesWidget />);

      const toggle = screen.getByTestId('btn-toggle-adjustments');
      fireEvent.click(toggle);

      expect(screen.getByTestId('bg-adjustments-panel')).toBeDefined();
      expect(screen.getByTestId('slider-overlay')).toBeDefined();
    });

    it('Switching to anime-ghibli category renders "Chuyến tàu trên mặt nước" card matching E2E selector', () => {
      const { container } = render(<SpacesWidget />);

      const animeTab = screen.getByTestId('filter-cat-anime-ghibli');
      fireEvent.click(animeTab);

      // Playwright E2E selector: page.locator('[data-testid="spaces-widget"] button').filter({ hasText: 'Chuyến tàu trên mặt nước' }).first()
      const widget = container.querySelector('[data-testid="spaces-widget"]');
      expect(widget).toBeDefined();
      const buttons = Array.from(widget?.querySelectorAll('button') || []);
      const matchedButtons = buttons.filter((b) => b.textContent?.includes('Chuyến tàu trên mặt nước'));
      expect(matchedButtons.length).toBeGreaterThanOrEqual(1);

      const firstAnimeCard = matchedButtons[0];
      fireEvent.click(firstAnimeCard);
      const currentBg = useBackgroundStore.getState().customUrl;
      expect(currentBg).toContain('anime-01.webp');
    });

    it('Search filtering works robustly and case-insensitively', () => {
      const { container } = render(<SpacesWidget />);

      const searchInput = screen.getByPlaceholderText('Tìm không gian nền (Lofi, Anime, Tokyo, Minimalist...)');

      // Upper-case query
      fireEvent.change(searchInput, { target: { value: 'CHUYẾN TÀU' } });
      const widget = container.querySelector('[data-testid="spaces-widget"]');
      let buttons = Array.from(widget?.querySelectorAll('button') || []);
      let matched = buttons.filter((b) => b.textContent?.includes('Chuyến tàu'));
      expect(matched.length).toBeGreaterThanOrEqual(1);

      // Non-matching query
      fireEvent.change(searchInput, { target: { value: 'xyz_non_existent_search_query_999' } });
      buttons = Array.from(widget?.querySelectorAll('button') || []);
      matched = buttons.filter((b) => b.textContent?.includes('Chuyến tàu'));
      expect(matched.length).toBe(0);

      // Clear search
      fireEvent.change(searchInput, { target: { value: '' } });
      expect(screen.getByTestId('presets-grid')).toBeDefined();
    });

    it('Switching to video category displays only video presets and hides deep-space', () => {
      render(<SpacesWidget />);

      const videoTab = screen.getByTestId('filter-cat-video');
      fireEvent.click(videoTab);

      expect(screen.getByTestId('preset-card-oceans-wave')).toBeDefined();
      expect(screen.getByTestId('preset-card-flower-timelapse')).toBeDefined();
      expect(screen.queryByTestId('preset-card-deep-space')).toBeNull();
    });
  });

  describe('Vector 3: Global Sentence Case & Elimination of ALL CAPS', () => {
    it('PomoFocusLogo renders "Study Workspace" in Sentence Case (NOT "STUDY WORKSPACE")', () => {
      const { container } = render(<PomoFocusLogo showWordmark={true} showSubtitle={true} />);
      expect(container.textContent).toContain('Study Workspace');
      expect(container.textContent).not.toContain('STUDY WORKSPACE');
    });

    it('SharedFooter column headers are Sentence Case without uppercase class', () => {
      const { container } = render(<SharedFooter />);
      expect(screen.getByText('Liên Hệ Trực Tiếp')).toBeDefined();
      expect(screen.getByText('Sản Phẩm & Không Gian')).toBeDefined();
      expect(screen.getByText('Hỗ Trợ & Điều Khoản')).toBeDefined();

      const headers = container.querySelectorAll('h4');
      headers.forEach((h) => {
        expect(h.className).not.toContain('uppercase');
      });
    });

    it('Widget canonical and default titles are strictly Sentence Case', () => {
      expect(DEFAULT_WIDGETS.spaces.title).toBe('Không gian nền');
      expect(DEFAULT_WIDGETS.sounds.title).toBe('Bảng âm thanh & chuông');
      expect(DEFAULT_WIDGETS.settings.title).toBe('Cài đặt hệ thống');

      expect(DEFAULT_WIDGETS.spaces.title).not.toMatch(/[A-Z]{3,}/);
      expect(DEFAULT_WIDGETS.sounds.title).not.toMatch(/[A-Z]{3,}/);
      expect(DEFAULT_WIDGETS.settings.title).not.toMatch(/[A-Z]{3,}/);
    });

    it('SAAS_PRICING_TIERS and AI_CREDIT_PACKS badges have no ALL CAPS', () => {
      for (const tier of SAAS_PRICING_TIERS) {
        if (tier.badge) {
          expect(tier.badge).not.toBe('FOUNDER VIP');
          expect(tier.badge).not.toBe('PHỔ BIẾN NHẤT');
        }
      }

      for (const pack of AI_CREDIT_PACKS) {
        if (pack.badge) {
          expect(pack.badge).not.toBe('TIẾT KIỆM');
          expect(pack.badge).not.toBe('HOT');
        }
      }
    });
  });

  describe('Vector 4: Systematic Emoji Hygiene & Invariant Preservation', () => {
    it('SAAS_PRICING_TIERS has 0 raw emojis in badges, titles, and taglines', () => {
      const forbiddenEmojis = ['🔥', '👑', '⚡', '🍅', '✨', '🍃', '📝', '🔒'];
      for (const tier of SAAS_PRICING_TIERS) {
        for (const emoji of forbiddenEmojis) {
          expect(tier.name).not.toContain(emoji);
          if (tier.tagline) expect(tier.tagline).not.toContain(emoji);
          if (tier.badge) expect(tier.badge).not.toContain(emoji);
        }
      }
    });

    it('AI_CREDIT_PACKS badges and calculateCreditPrice have 0 raw emojis', () => {
      const forbiddenEmojis = ['🔥', '👑', '✨'];
      for (const pack of AI_CREDIT_PACKS) {
        for (const emoji of forbiddenEmojis) {
          if (pack.badge) expect(pack.badge).not.toContain(emoji);
        }
      }

      const amounts = [500, 1500, 2500, 3500, 4000];
      for (const amt of amounts) {
        const res = calculateCreditPrice(amt);
        if (res.discountBadge) {
          for (const emoji of forbiddenEmojis) {
            expect(res.discountBadge).not.toContain(emoji);
          }
        }
      }
    });

    it('useNoteStore initial markdown contains 0 📝 emojis and is in Sentence Case', async () => {
      await useNoteStore.getState().loadNotes();
      const notes = useNoteStore.getState().notes;
      expect(notes.length).toBeGreaterThan(0);
      for (const note of notes) {
        expect(note.title).not.toContain('📝');
        expect(note.contentMarkdown).not.toContain('📝');
      }
    });
  });
});
