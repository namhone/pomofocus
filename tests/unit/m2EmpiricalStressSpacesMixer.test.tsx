import 'fake-indexeddb/auto';
import React from 'react';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BackgroundCanvas } from '../../src/components/BackgroundCanvas';
import { AudioWidget } from '../../src/components/AudioWidget';
import { TimerWidget } from '../../src/components/TimerWidget';
import { MobileAppShell } from '../../src/components/mobile/MobileAppShell';
import { useBackgroundStore } from '../../src/stores/useBackgroundStore';
import { useAudioStore } from '../../src/stores/useAudioStore';
import { useTimerStore } from '../../src/stores/useTimerStore';
import { useLayoutStore } from '../../src/stores/useLayoutStore';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useAiStore } from '../../src/stores/useAiStore';
import { useTaskStore } from '../../src/stores/useTaskStore';
import { ALL_AMBIENT_TRACKS } from '../../src/data/ambientTracks';
import { BACKGROUND_PRESETS } from '../../src/data/backgroundPresets';
import { db } from '../../src/db';

describe('Milestone 2 Empirical Adversarial Stress Suite — Spaces, Background & Audio Mixer', () => {
  beforeEach(async () => {
    vi.useRealTimers();
    localStorage.clear();
    sessionStorage.clear();

    try {
      await db.tasks.clear();
      await db.notes.clear();
      await db.focus_sessions.clear();
    } catch {}

    Object.defineProperty(navigator, 'vibrate', {
      configurable: true,
      writable: true,
      value: vi.fn(),
    });

    // Reset Timer Store
    useTimerStore.getState().init();
    useTimerStore.setState({
      status: 'idle',
      phase: 'pomodoro',
      currentRound: 1,
      remainingMs: 25 * 60 * 1000,
      settings: {
        pomodoroMinutes: 25,
        shortBreakMinutes: 5,
        longBreakMinutes: 15,
        roundsBeforeLongBreak: 4,
        autoTransition: false,
        notificationEnabled: false,
      },
      linkedTaskId: null,
      linkedTaskTitle: null,
      dailyProgress: 0,
      todayFocusMinutes: 0,
    });

    // Reset Background Store
    useBackgroundStore.getState().resetBackground();
    useBackgroundStore.setState({
      activePresetId: 'deep-space',
      blurLevel: 0,
      brightnessLevel: 100,
      overlayOpacity: 30,
      customUrl: null,
      customType: null,
      ambientEffect: 'none',
      pure_zen_black: false,
      hasError: false,
      errorMessage: null,
      useStaticFallback: false,
    });

    // Reset Audio Store
    useAudioStore.getState().stopAllTracks();
    useAudioStore.setState({
      tracks: ALL_AMBIENT_TRACKS.map((t) => ({ ...t, isPlaying: false, volume: 0.5 })),
      settings: {
        masterVolume: 0.8,
        isMuted: false,
        selectedChime: 'tibetan_bowl',
        duckingEnabled: true,
        duckingRatio: 0.3,
        ambientVolume: 0.6,
        chimeVolume: 0.8,
      },
      activeTab: 'ambient',
    });

    // Reset Layout & Auth Stores
    useLayoutStore.setState({
      activeMobileTab: 'spaces' as any,
      isEcoMode: false,
      isZenMode: false,
    });

    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoggedIn: false,
      hasVipAccess: false,
      isPro: false,
      isLifetime: false,
      isBetaPro: false,
      isOwner: false,
      isLadyBoss: false,
      isVipFriend: false,
      role: 'guest',
      planLabel: 'Khách',
    });

    useAiStore.setState({
      aiCreditsBalance: 50,
      isTopupModalOpen: false,
    });

    useTaskStore.setState({
      tasks: [],
      activeTaskId: null,
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // 1. EMPIRICAL STRESS-TEST: PURE ZEN BLACK OLED (#09090b) INVARIANTS
  // ===========================================================================
  describe('1. Empirical Stress-Test: Pure Zen Black OLED (#09090b)', () => {
    it('1.1 setPureZenBlack() strictly resets blur to 0, brightness to 100, overlay to 0, ambient to none and customUrls to null', () => {
      // Intentionally corrupt background state with heavy distractions
      useBackgroundStore.setState({
        activePresetId: 'cozy-lofi-room',
        blurLevel: 16,
        brightnessLevel: 65,
        overlayOpacity: 75,
        customUrl: 'https://evil-corp.com/distracting.mp4',
        customType: 'video',
        ambientEffect: 'rain',
        pure_zen_black: false,
      });

      // Verify dirty state prior to reset
      expect(useBackgroundStore.getState().blurLevel).toBe(16);
      expect(useBackgroundStore.getState().brightnessLevel).toBe(65);
      expect(useBackgroundStore.getState().overlayOpacity).toBe(75);
      expect(useBackgroundStore.getState().ambientEffect).toBe('rain');
      expect(useBackgroundStore.getState().customUrl).toBe('https://evil-corp.com/distracting.mp4');

      // Trigger Pure Zen Black
      act(() => {
        useBackgroundStore.getState().setPureZenBlack();
      });

      const cleanState = useBackgroundStore.getState();
      expect(cleanState.activePresetId).toBe('pure-black');
      expect(cleanState.pure_zen_black).toBe(true);
      expect(cleanState.blurLevel).toBe(0);
      expect(cleanState.brightnessLevel).toBe(100);
      expect(cleanState.overlayOpacity).toBe(0);
      expect(cleanState.ambientEffect).toBe('none');
      expect(cleanState.customUrl).toBeNull();
      expect(cleanState.customType).toBeNull();
      expect(cleanState.hasError).toBe(false);

      // Verify localStorage persistence was correctly updated
      const savedRaw = localStorage.getItem('pomodoro_workspace_background_v1');
      expect(savedRaw).not.toBeNull();
      const saved = JSON.parse(savedRaw!);
      expect(saved.activePresetId).toBe('pure-black');
      expect(saved.blurLevel).toBe(0);
      expect(saved.brightnessLevel).toBe(100);
      expect(saved.overlayOpacity).toBe(0);
      expect(saved.ambientEffect).toBe('none');
      expect(saved.customUrl).toBeNull();
    });

    it('1.2 BackgroundCanvas renders pure #09090b OLED background with EXACTLY 0 img and 0 video elements', () => {
      // Activate Pure Zen Black
      act(() => {
        useBackgroundStore.getState().setPureZenBlack();
      });

      const { container } = render(<BackgroundCanvas />);

      // Verify Background Canvas container exists
      const canvasRoot = screen.getByTestId('background-canvas');
      expect(canvasRoot).toBeDefined();

      // Check 0 img and 0 video elements in entire DOM tree of BackgroundCanvas
      const images = container.querySelectorAll('img');
      const videos = container.querySelectorAll('video');
      expect(images.length).toBe(0);
      expect(videos.length).toBe(0);
      expect(screen.queryByTestId('background-image-element')).toBeNull();
      expect(screen.queryByTestId('background-video-element')).toBeNull();

      // Check base gradient element has pure #09090b
      const gradientEl = screen.getByTestId('background-gradient-element');
      expect(gradientEl.style.background).toMatch(/(#09090b|rgb\(9,\s*9,\s*11\))/i);
      expect(gradientEl.style.filter).toContain('blur(0px)');
      expect(gradientEl.style.filter).toContain('brightness(100%)');

      // Check overlay opacity is 0% (0 / 100)
      const overlayEl = screen.getByTestId('background-overlay');
      expect(overlayEl.style.opacity).toBe('0');
    });

    it('1.3 Switching from an active video preset to Pure Zen Black immediately purges video node', () => {
      // Start with a video preset
      useBackgroundStore.setState({
        activePresetId: 'oceans-wave',
        blurLevel: 5,
        brightnessLevel: 90,
        overlayOpacity: 40,
        pure_zen_black: false,
      });

      const { container, rerender } = render(<BackgroundCanvas />);

      // Under video preset, video element must be rendered
      const videoEl = screen.getByTestId('background-video-element');
      expect(videoEl).toBeDefined();
      expect(container.querySelectorAll('video').length).toBe(1);

      // Now trigger Pure Zen Black
      act(() => {
        useBackgroundStore.getState().setPureZenBlack();
      });

      rerender(<BackgroundCanvas />);

      // Video node MUST be purged immediately
      expect(screen.queryByTestId('background-video-element')).toBeNull();
      expect(container.querySelectorAll('video').length).toBe(0);
      expect(container.querySelectorAll('img').length).toBe(0);

      const gradientEl = screen.getByTestId('background-gradient-element');
      expect(gradientEl.style.background).toMatch(/(#09090b|rgb\(9,\s*9,\s*11\))/i);
    });

    it('1.4 Mobile Spaces button "Tắt nền (Pure Zen Black)" triggers setPureZenBlack and highlights button', async () => {
      useLayoutStore.setState({ activeMobileTab: 'spaces' as any });

      render(<MobileAppShell />);

      const zenBtn = screen.getByTestId('mobile-spaces-pure-zen-black-btn');
      expect(zenBtn).toBeDefined();
      expect(zenBtn.textContent).toContain('Tắt nền (Pure Zen Black)');
      expect(zenBtn.textContent).toContain('OLED #09090b');

      await act(async () => {
        fireEvent.click(zenBtn);
      });

      expect(useBackgroundStore.getState().pure_zen_black).toBe(true);
      expect(useBackgroundStore.getState().activePresetId).toBe('pure-black');
      expect(useBackgroundStore.getState().blurLevel).toBe(0);
      expect(useBackgroundStore.getState().overlayOpacity).toBe(0);
      expect(zenBtn.className).toContain('border-emerald-400');
    });

    it('1.5 Selecting any non-black preset cleanly revokes pure_zen_black flag', () => {
      act(() => {
        useBackgroundStore.getState().setPureZenBlack();
      });
      expect(useBackgroundStore.getState().pure_zen_black).toBe(true);

      act(() => {
        useBackgroundStore.getState().selectPreset('cozy-lofi-room');
      });

      expect(useBackgroundStore.getState().pure_zen_black).toBe(false);
      expect(useBackgroundStore.getState().activePresetId).toBe('cozy-lofi-room');
    });
  });

  // ===========================================================================
  // 2. EMPIRICAL STRESS-TEST: AUDIO MIXER TRACK MUTING & VOLUME RETENTION
  // ===========================================================================
  describe('2. Empirical Stress-Test: Audio Mixer Track Muting & Volume Retention', () => {
    it('2.1 Muting a track in AudioWidget disables the slider and dims text while retaining custom volume level', async () => {
      const rainTrack = ALL_AMBIENT_TRACKS.find((t) => t.id === 'rain') || ALL_AMBIENT_TRACKS[0];

      // Set initial state: rain track is PLAYING at 70% volume
      useAudioStore.setState({
        tracks: ALL_AMBIENT_TRACKS.map((t) =>
          t.id === rainTrack.id ? { ...t, isPlaying: true, volume: 0.7 } : { ...t, isPlaying: false }
        ),
      });

      const { unmount } = render(<AudioWidget />);

      // Find rain track container
      const trackCard = screen.getByTestId(`ambient-track-${rainTrack.id}`);
      expect(trackCard).toBeDefined();

      const slider = trackCard.querySelector('input[type="range"]') as HTMLInputElement;
      expect(slider).toBeDefined();
      expect(slider.disabled).toBe(false);
      expect(slider.className).toContain('opacity-100');
      expect(slider.value).toBe('0.7');

      const percentText = trackCard.querySelector('.text-zinc-300');
      expect(percentText?.textContent).toBe('70%');

      // Now MUTE the track via toggle button
      const toggleBtn = screen.getByTestId(`btn-toggle-track-${rainTrack.id}`);
      await act(async () => {
        fireEvent.click(toggleBtn);
      });

      // Verify track in store is NOT playing
      const storeTrackMuted = useAudioStore.getState().tracks.find((t) => t.id === rainTrack.id);
      expect(storeTrackMuted?.isPlaying).toBe(false);
      expect(storeTrackMuted?.volume).toBe(0.7); // VOLUME MUST BE MAINTAINED!

      // Verify DOM reflects disabled slider with maintained 70% volume and zinc-600 dimmed text
      expect(slider.disabled).toBe(true);
      expect(slider.className).toContain('opacity-30');
      expect(slider.className).toContain('cursor-not-allowed');
      expect(slider.value).toBe('0.7');

      const dimmedPercent = trackCard.querySelector('.text-zinc-600');
      expect(dimmedPercent?.textContent).toBe('70%');

      // Now UNMUTE the track
      await act(async () => {
        fireEvent.click(toggleBtn);
      });

      // Verify re-enabled slider still has 70% volume
      const storeTrackUnmuted = useAudioStore.getState().tracks.find((t) => t.id === rainTrack.id);
      expect(storeTrackUnmuted?.isPlaying).toBe(true);
      expect(storeTrackUnmuted?.volume).toBe(0.7);
      expect(slider.disabled).toBe(false);
      expect(slider.value).toBe('0.7');

      unmount();
    });

    it('2.2 Mobile Mixer subview: slider is disabled when muted, with 3px track and preserves volume', async () => {
      const fireTrack = ALL_AMBIENT_TRACKS.find((t) => t.id === 'fireplace') || ALL_AMBIENT_TRACKS[1];

      // Initially fire track is playing at 45% volume
      useAudioStore.setState({
        tracks: ALL_AMBIENT_TRACKS.map((t) =>
          t.id === fireTrack.id ? { ...t, isPlaying: true, volume: 0.45 } : { ...t, isPlaying: false }
        ),
      });

      useLayoutStore.setState({ activeMobileTab: 'spaces' as any });

      const { unmount } = render(<MobileAppShell />);

      // Switch to Audio subtab
      const audioSubTabBtn = screen.getByTestId('mobile-spaces-subtab-audio');
      await act(async () => {
        fireEvent.click(audioSubTabBtn);
      });

      const mobileSlider = screen.getByTestId(`mobile-mixer-volume-${fireTrack.id}`) as HTMLInputElement;
      expect(mobileSlider).toBeDefined();
      expect(mobileSlider.disabled).toBe(false);
      expect(mobileSlider.value).toBe('45');
      expect(mobileSlider.className).toContain('h-[3px]');
      expect(mobileSlider.className).toContain('opacity-100');

      // Click toggle switch to mute
      const switchBtn = screen.getByTestId(`mobile-mixer-switch-${fireTrack.id}`);
      await act(async () => {
        fireEvent.click(switchBtn);
      });

      // Verification: Track is muted, slider is disabled, opacity is 30, and volume remains 45%
      expect(useAudioStore.getState().tracks.find((t) => t.id === fireTrack.id)?.isPlaying).toBe(false);
      expect(mobileSlider.disabled).toBe(true);
      expect(mobileSlider.className).toContain('opacity-30');
      expect(mobileSlider.className).toContain('cursor-not-allowed');
      expect(mobileSlider.value).toBe('45');

      const trackCard = screen.getByTestId(`mobile-mixer-track-${fireTrack.id}`);
      const dimmedText = trackCard.querySelector('.text-zinc-600');
      expect(dimmedText?.textContent).toBe('45%');

      // Click switch again to unmute
      await act(async () => {
        fireEvent.click(switchBtn);
      });

      expect(useAudioStore.getState().tracks.find((t) => t.id === fireTrack.id)?.isPlaying).toBe(true);
      expect(mobileSlider.disabled).toBe(false);
      expect(mobileSlider.value).toBe('45');

      unmount();
    });

    it('2.3 Stop all tracks ("Dừng tất cả") mutes all active tracks while preserving individual volumes', async () => {
      // Set 3 tracks playing with different distinct volume levels
      useAudioStore.setState({
        tracks: ALL_AMBIENT_TRACKS.map((t, idx) => {
          if (idx === 0) return { ...t, isPlaying: true, volume: 0.35 };
          if (idx === 1) return { ...t, isPlaying: true, volume: 0.65 };
          if (idx === 2) return { ...t, isPlaying: true, volume: 0.85 };
          return { ...t, isPlaying: false, volume: 0.5 };
        }),
      });

      render(<AudioWidget />);

      // Verify "Dừng tất cả" button is present
      const stopAllBtn = screen.getByTestId('btn-stop-all-ambient');
      expect(stopAllBtn).toBeDefined();

      await act(async () => {
        fireEvent.click(stopAllBtn);
      });

      // All tracks must be paused
      const updatedTracks = useAudioStore.getState().tracks;
      const activeCount = updatedTracks.filter((t) => t.isPlaying).length;
      expect(activeCount).toBe(0);

      // But volumes MUST retain their configured values
      expect(updatedTracks[0].volume).toBe(0.35);
      expect(updatedTracks[1].volume).toBe(0.65);
      expect(updatedTracks[2].volume).toBe(0.85);
    });
  });

  // ===========================================================================
  // 3. EMPIRICAL STRESS-TEST: VIETNAMESE CATEGORY PILLS & FILTERING LOGIC
  // ===========================================================================
  describe('3. Empirical Stress-Test: Vietnamese Category Pills & Filtering Logic', () => {
    it('3.1 Mobile Spaces Preset Categories render Vietnamese Sentence Case labels ("Đơn sắc", "Chuyển màu", "Hình ảnh", "Chuyển động")', () => {
      useLayoutStore.setState({ activeMobileTab: 'spaces' as any });

      render(<MobileAppShell />);

      // Verify category labels in preset cards
      const expectedCategoryLabels = ['Đơn sắc', 'Chuyển màu', 'Hình ảnh', 'Chuyển động'];

      // Gather rendered preset category labels
      const renderedLabels = Array.from(document.querySelectorAll('.text-\\[11px\\].text-zinc-400')).map(
        (el) => el.textContent?.trim()
      );

      // Verify at least one of each standard category is rendered properly
      for (const expected of expectedCategoryLabels) {
        expect(renderedLabels.some((l) => l === expected)).toBe(true);
      }

      // Strictly verify NO ALL-CAPS category labels exist
      for (const label of renderedLabels) {
        if (!label) continue;
        expect(label).not.toBe('SOLID');
        expect(label).not.toBe('GRADIENT');
        expect(label).not.toBe('IMAGE');
        expect(label).not.toBe('VIDEO');
        expect(label).not.toBe('ĐƠN SẮC');
        expect(label).not.toBe('CHUYỂN MÀU');
        expect(label).not.toBe('HÌNH ẢNH');
        expect(label).not.toBe('CHUYỂN ĐỘNG');
      }

      // Verify deduplication: 'pure-black' preset is not rendered as a regular grid card
      expect(screen.queryByTestId('mobile-space-preset-pure-black')).toBeNull();
    });

    it('3.2 AudioWidget ambient tabs display correct Vietnamese Sentence Case pills and filter tracks correctly', async () => {
      render(<AudioWidget />);

      // Verify tab labels: Tất cả, Tự nhiên, Cuộc sống, Sóng não, Tiếng ồn
      const tabAll = screen.getByTestId('ambient-category-all');
      const tabNature = screen.getByTestId('ambient-category-nature');
      const tabLife = screen.getByTestId('ambient-category-life');
      const tabBinaural = screen.getByTestId('ambient-category-binaural');
      const tabNoise = screen.getByTestId('ambient-category-noise');

      expect(tabAll.textContent).toContain('Tất cả');
      expect(tabNature.textContent).toContain('Tự nhiên');
      expect(tabLife.textContent).toContain('Cuộc sống');
      expect(tabBinaural.textContent).toContain('Sóng não');
      expect(tabNoise.textContent).toContain('Tiếng ồn');

      // Test filtering: click "Tự nhiên"
      await act(async () => {
        fireEvent.click(tabNature);
      });

      const natureTracks = ALL_AMBIENT_TRACKS.filter((t) => t.category === 'nature');
      for (const track of natureTracks) {
        expect(screen.getByTestId(`ambient-track-${track.id}`)).toBeDefined();
      }

      // Non-nature tracks should NOT be displayed
      const lifeTracks = ALL_AMBIENT_TRACKS.filter((t) => t.category === 'life');
      for (const track of lifeTracks) {
        expect(screen.queryByTestId(`ambient-track-${track.id}`)).toBeNull();
      }

      // Test filtering: click "Sóng não"
      await act(async () => {
        fireEvent.click(tabBinaural);
      });

      const binauralTracks = ALL_AMBIENT_TRACKS.filter((t) => t.category === 'binaural');
      for (const track of binauralTracks) {
        expect(screen.getByTestId(`ambient-track-${track.id}`)).toBeDefined();
      }
      for (const track of natureTracks) {
        expect(screen.queryByTestId(`ambient-track-${track.id}`)).toBeNull();
      }

      // Return to "Tất cả"
      await act(async () => {
        fireEvent.click(tabAll);
      });
      for (const track of ALL_AMBIENT_TRACKS) {
        expect(screen.getByTestId(`ambient-track-${track.id}`)).toBeDefined();
      }
    });

    it('3.3 Mobile Mixer tabs render fade mask and filter tracks correctly', async () => {
      useLayoutStore.setState({ activeMobileTab: 'spaces' as any });

      render(<MobileAppShell />);

      // Switch to Audio subtab
      await act(async () => {
        fireEvent.click(screen.getByTestId('mobile-spaces-subtab-audio'));
      });

      // Mobile category pills container has pr-8 padding
      const pillsContainer = screen.getByTestId('mobile-mixer-cat-all').parentElement;
      expect(pillsContainer?.className).toContain('pr-8');

      // Click "Sóng não" pill
      const binauralPill = screen.getByTestId('mobile-mixer-cat-binaural');
      expect(binauralPill.textContent).toContain('Sóng não');

      await act(async () => {
        fireEvent.click(binauralPill);
      });

      const binauralTracks = ALL_AMBIENT_TRACKS.filter((t) => t.category === 'binaural');
      for (const track of binauralTracks) {
        expect(screen.getByTestId(`mobile-mixer-track-${track.id}`)).toBeDefined();
      }

      // Nature tracks should not be visible
      const natureTracks = ALL_AMBIENT_TRACKS.filter((t) => t.category === 'nature');
      for (const track of natureTracks) {
        expect(screen.queryByTestId(`mobile-mixer-track-${track.id}`)).toBeNull();
      }
    });
  });

  // ===========================================================================
  // 4. EMPIRICAL STRESS-TEST: DYNAMIC CYCLE RESET TITLE & ROUNDS INTERPOLATION
  // ===========================================================================
  describe('4. Empirical Stress-Test: Dynamic Cycle Reset Title & Rounds Interpolation', () => {
    it('4.1 TimerWidget cycle reset button dynamically updates title with roundsBeforeLongBreak = 2, 4, 8, 12', () => {
      const { rerender } = render(<TimerWidget />);

      // Test 1: roundsBeforeLongBreak = 2
      act(() => {
        useTimerStore.getState().updateSettings({ roundsBeforeLongBreak: 2 });
      });
      rerender(<TimerWidget />);
      const btn2 = screen.getByTestId('timer-reset-cycle-btn');
      expect(btn2.getAttribute('title')).toBe('Bắt đầu lại chu kỳ (Hiệp 1/2)');
      expect(btn2.getAttribute('aria-label')).toBe('Bắt đầu lại chu kỳ (Hiệp 1/2)');

      // Test 2: roundsBeforeLongBreak = 4 (default)
      act(() => {
        useTimerStore.getState().updateSettings({ roundsBeforeLongBreak: 4 });
      });
      rerender(<TimerWidget />);
      const btn4 = screen.getByTestId('timer-reset-cycle-btn');
      expect(btn4.getAttribute('title')).toBe('Bắt đầu lại chu kỳ (Hiệp 1/4)');
      expect(btn4.getAttribute('aria-label')).toBe('Bắt đầu lại chu kỳ (Hiệp 1/4)');

      // Test 3: roundsBeforeLongBreak = 8
      act(() => {
        useTimerStore.getState().updateSettings({ roundsBeforeLongBreak: 8 });
      });
      rerender(<TimerWidget />);
      const btn8 = screen.getByTestId('timer-reset-cycle-btn');
      expect(btn8.getAttribute('title')).toBe('Bắt đầu lại chu kỳ (Hiệp 1/8)');
      expect(btn8.getAttribute('aria-label')).toBe('Bắt đầu lại chu kỳ (Hiệp 1/8)');

      // Test 4: roundsBeforeLongBreak = 12
      act(() => {
        useTimerStore.getState().updateSettings({ roundsBeforeLongBreak: 12 });
      });
      rerender(<TimerWidget />);
      const btn12 = screen.getByTestId('timer-reset-cycle-btn');
      expect(btn12.getAttribute('title')).toBe('Bắt đầu lại chu kỳ (Hiệp 1/12)');
      expect(btn12.getAttribute('aria-label')).toBe('Bắt đầu lại chu kỳ (Hiệp 1/12)');
    });

    it('4.2 Clicking timer-reset-cycle-btn resets currentRound to 1 and keeps phase synchronized', async () => {
      // Set timer to round 3 during short break
      useTimerStore.setState({
        currentRound: 3,
        phase: 'short_break',
        status: 'paused',
        settings: {
          ...useTimerStore.getState().settings,
          roundsBeforeLongBreak: 6,
        },
      });

      render(<TimerWidget />);

      const cycleBtn = screen.getByTestId('timer-reset-cycle-btn');
      expect(cycleBtn.getAttribute('title')).toBe('Bắt đầu lại chu kỳ (Hiệp 1/6)');

      await act(async () => {
        fireEvent.click(cycleBtn);
      });

      // Verification: currentRound is reset to 1
      expect(useTimerStore.getState().currentRound).toBe(1);
    });
  });
});
