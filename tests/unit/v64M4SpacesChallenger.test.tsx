import 'fake-indexeddb/auto';
import React from 'react';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BackgroundCanvas } from '../../src/components/BackgroundCanvas';
import { SpacesWidget } from '../../src/components/SpacesWidget';
import { useBackgroundStore } from '../../src/stores/useBackgroundStore';
import { BACKGROUND_PRESETS } from '../../src/data/backgroundPresets';
import { RouterProvider } from '../../src/services/router';
import { db } from '../../src/db';

vi.mock('../../src/components/AudioWidget', () => ({
  AudioWidget: () => <div data-testid="mock-audio-widget">Audio</div>
}));

describe('Empirical Adversarial Challenge: Pure Zen Spaces DOM & Media Invariants', () => {
  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    await db.custom_backgrounds.clear();
    useBackgroundStore.getState().resetBackground();
    vi.restoreAllMocks();

    if (typeof window !== 'undefined') {
      window.HTMLMediaElement.prototype.play = () => Promise.resolve();
      window.HTMLMediaElement.prototype.pause = () => {};
      window.HTMLVideoElement.prototype.play = () => Promise.resolve();
      window.HTMLVideoElement.prototype.pause = () => {};
    }
  });

  afterEach(async () => {
    cleanup();
    await db.custom_backgrounds.clear();
  });

  describe('Challenge 1: Zero-Media DOM Invariant for Pure Zen Solid Colors', () => {
    it.each([
      { presetId: 'zen-pure-black', hex: '#09090b', rgb: 'rgb(9, 9, 11)' },
      { presetId: 'zen-deep-graphite', hex: '#18181b', rgb: 'rgb(24, 24, 27)' },
      { presetId: 'zen-night-blue', hex: '#0b132b', rgb: 'rgb(11, 19, 43)' }
    ])('preset %s renders 0 <img> and 0 <video> tags and applies solid color background', ({ presetId, hex, rgb }) => {
      useBackgroundStore.getState().selectPreset(presetId);

      const { container } = render(<BackgroundCanvas />);

      // Invariant: Pure zen MUST NOT render any <img> or <video> in DOM
      const imgElements = container.querySelectorAll('img');
      const videoElements = container.querySelectorAll('video');

      expect(imgElements.length).toBe(0);
      expect(videoElements.length).toBe(0);
      expect(screen.queryByTestId('background-image-element')).toBeNull();
      expect(screen.queryByTestId('background-video-element')).toBeNull();

      // Root canvas must exist
      const canvas = screen.getByTestId('background-canvas');
      expect(canvas).toBeDefined();

      // Base gradient/solid layer receives the solid color
      const baseElement = screen.getByTestId('background-gradient-element');
      expect(baseElement).toBeDefined();

      const bgStyle = baseElement.style.background;
      const matchesColor = bgStyle.includes(hex) || bgStyle.includes(rgb);
      expect(matchesColor).toBe(true);
    });

    it('all 3 zen presets exist in BACKGROUND_PRESETS with strict category: "solid"', () => {
      const zenPresets = BACKGROUND_PRESETS.filter((p) => p.id.startsWith('zen-'));
      expect(zenPresets).toHaveLength(3);

      zenPresets.forEach((preset) => {
        expect(preset.category).toBe('solid');
        expect(preset.url).toMatch(/^#[0-9a-fA-F]{6}$/);
        expect(preset.tags).toContain('solid');
      });
    });
  });

  describe('Challenge 2: Preset Transition Media Unmounting Stress', () => {
    it('switching from video preset to zen solid color instantly unmounts video element', () => {
      // 1. Start with oceans-wave video preset
      useBackgroundStore.getState().selectPreset('oceans-wave');
      const { container } = render(<BackgroundCanvas />);

      // Verify video is mounted in DOM
      expect(container.querySelectorAll('video').length).toBe(1);
      expect(screen.getByTestId('background-video-element')).toBeDefined();

      // 2. Act: Instantly transition to zen-pure-black
      act(() => {
        useBackgroundStore.getState().selectPreset('zen-pure-black');
      });

      // Invariant: Video must be completely unmounted immediately — not just hidden
      expect(container.querySelectorAll('video').length).toBe(0);
      expect(container.querySelectorAll('img').length).toBe(0);
      expect(screen.queryByTestId('background-video-element')).toBeNull();
      expect(screen.queryByTestId('background-image-element')).toBeNull();
    });

    it('switching from image preset to zen solid color instantly unmounts img element', () => {
      // 1. Start with deep-space image preset
      useBackgroundStore.getState().selectPreset('deep-space');
      const { container } = render(<BackgroundCanvas />);

      // Verify img is mounted
      expect(container.querySelectorAll('img').length).toBe(1);
      expect(screen.getByTestId('background-image-element')).toBeDefined();
      expect(container.querySelectorAll('video').length).toBe(0);

      // 2. Act: Instantly transition to zen-deep-graphite
      act(() => {
        useBackgroundStore.getState().selectPreset('zen-deep-graphite');
      });

      // Invariant: Image must be completely unmounted immediately
      expect(container.querySelectorAll('img').length).toBe(0);
      expect(container.querySelectorAll('video').length).toBe(0);
      expect(screen.queryByTestId('background-image-element')).toBeNull();
    });

    it('rapid cyclical flipping between media and zen solid preserves zero-media invariant at every zen state', () => {
      const { container } = render(<BackgroundCanvas />);

      const cycle = [
        { id: 'oceans-wave', expectVideo: true, expectImg: true },
        { id: 'zen-pure-black', expectVideo: false, expectImg: false },
        { id: 'deep-space', expectVideo: false, expectImg: true },
        { id: 'zen-night-blue', expectVideo: false, expectImg: false },
        { id: 'rainy-window', expectVideo: true, expectImg: false },
        { id: 'zen-deep-graphite', expectVideo: false, expectImg: false }
      ];

      for (let i = 0; i < 3; i++) {
        for (const step of cycle) {
          act(() => {
            useBackgroundStore.getState().selectPreset(step.id);
          });

          const videos = container.querySelectorAll('video').length;
          const imgs = container.querySelectorAll('img').length;

          if (!step.expectVideo && !step.expectImg) {
            // Must have 0 media elements
            expect(videos).toBe(0);
            expect(imgs).toBe(0);
          } else {
            if (step.expectVideo) {
              expect(videos).toBeGreaterThanOrEqual(1);
            }
            if (step.expectImg) {
              expect(imgs).toBeGreaterThanOrEqual(1);
            }
          }
        }
      }
    });
  });

  describe('Challenge 3: SpacesWidget Quick-Select Clicks & Active Checkmark', () => {
    it('clicking each Zen button updates store activePresetId and renders active checkmark icon', () => {
      render(
        <RouterProvider>
          <SpacesWidget />
        </RouterProvider>
      );

      const zenOptions = [
        { id: 'zen-pure-black', testId: 'zen-color-zen-pure-black' },
        { id: 'zen-deep-graphite', testId: 'zen-color-zen-deep-graphite' },
        { id: 'zen-night-blue', testId: 'zen-color-zen-night-blue' }
      ];

      for (const opt of zenOptions) {
        const btn = screen.getByTestId(opt.testId);
        fireEvent.click(btn);

        // Store must be updated
        expect(useBackgroundStore.getState().activePresetId).toBe(opt.id);

        // Selected button must have active ring class
        expect(btn.className).toContain('ring-2 ring-cyan-400');

        // Selected button must contain checkmark icon (svg element with lucide-check)
        const checkIcon = btn.querySelector('svg.lucide-check');
        expect(checkIcon).not.toBeNull();

        // Other non-selected buttons must NOT have checkmark
        for (const other of zenOptions) {
          if (other.id !== opt.id) {
            const otherBtn = screen.getByTestId(other.testId);
            expect(otherBtn.querySelector('svg.lucide-check')).toBeNull();
            expect(otherBtn.className).not.toContain('ring-2 ring-cyan-400');
          }
        }
      }
    });

    it('end-to-end integration: clicking Zen quick-selector in SpacesWidget immediately purges video/img in BackgroundCanvas', () => {
      // Start with video preset
      useBackgroundStore.getState().selectPreset('oceans-wave');

      render(
        <RouterProvider>
          <div>
            <BackgroundCanvas />
            <SpacesWidget />
          </div>
        </RouterProvider>
      );

      const canvas = screen.getByTestId('background-canvas');

      // Verify video is initially present in BackgroundCanvas
      expect(canvas.querySelectorAll('video').length).toBe(1);

      // Click zen-pure-black button in SpacesWidget
      const blackBtn = screen.getByTestId('zen-color-zen-pure-black');
      act(() => {
        fireEvent.click(blackBtn);
      });

      // Canvas must instantly unmount video and image elements
      expect(canvas.querySelectorAll('video').length).toBe(0);
      expect(canvas.querySelectorAll('img').length).toBe(0);

      // Base layer reflects #09090b
      const baseElement = screen.getByTestId('background-gradient-element');
      expect(baseElement.style.background).toMatch(/(#09090b|rgb\(9,\s*9,\s*11\))/);

      // Click zen-night-blue button in SpacesWidget
      const nightBlueBtn = screen.getByTestId('zen-color-zen-night-blue');
      act(() => {
        fireEvent.click(nightBlueBtn);
      });

      // Canvas remains zero-media and updates to night-blue
      expect(canvas.querySelectorAll('video').length).toBe(0);
      expect(canvas.querySelectorAll('img').length).toBe(0);
      expect(baseElement.style.background).toMatch(/(#0b132b|rgb\(11,\s*19,\s*43\))/);
    });
  });
});
