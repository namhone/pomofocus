import 'fake-indexeddb/auto';
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { AudioContextManager } from '../../src/services/audioContextManager';
import { ChimeSynthesizer } from '../../src/services/chimeSynthesizer';
import { AmbientSynthesizer } from '../../src/services/ambientSynthesizer';
import { SoundEffectsService, soundEffects } from '../../src/services/soundEffects';
import { useAudioStore, getActiveAudioElements } from '../../src/stores/useAudioStore';
import { useTimerStore } from '../../src/stores/useTimerStore';
import { useTaskStore } from '../../src/stores/useTaskStore';
import { useLayoutStore } from '../../src/stores/useLayoutStore';
import { GlobalAudioHost } from '../../src/components/GlobalAudioHost';
import { AudioWidget } from '../../src/components/AudioWidget';
import { TimerWidget } from '../../src/components/TimerWidget';
import { MobileSettingsView } from '../../src/components/mobile/views/MobileSettingsView';
import { MobileFocusView } from '../../src/components/mobile/views/MobileFocusView';
import { ChimeSoundType } from '../../src/types/audio';
import { db } from '../../src/db';

class MockAudioParam {
  value = 1;
  setValueAtTime = vi.fn((val: number) => {
    this.value = val;
  });
  linearRampToValueAtTime = vi.fn((val: number) => {
    this.value = val;
  });
  exponentialRampToValueAtTime = vi.fn((val: number) => {
    this.value = val;
  });
  setTargetAtTime = vi.fn((val: number) => {
    this.value = val;
  });
  cancelScheduledValues = vi.fn();
}

class MockAudioNode {
  connect = vi.fn();
  disconnect = vi.fn();
}

class MockGainNode extends MockAudioNode {
  gain = new MockAudioParam();
}

class MockDynamicsCompressorNode extends MockAudioNode {
  threshold = new MockAudioParam();
  knee = new MockAudioParam();
  ratio = new MockAudioParam();
  attack = new MockAudioParam();
  release = new MockAudioParam();
}

class MockOscillatorNode extends MockAudioNode {
  type = 'sine';
  frequency = new MockAudioParam();
  start = vi.fn();
  stop = vi.fn();
}

class MockBiquadFilterNode extends MockAudioNode {
  type: BiquadFilterType = 'lowpass';
  frequency = new MockAudioParam();
  Q = new MockAudioParam();
}

class MockAudioBufferSourceNode extends MockAudioNode {
  buffer: unknown = null;
  loop = false;
  start = vi.fn();
  stop = vi.fn();
}

class MockChannelMergerNode extends MockAudioNode {}

class MockAudioBuffer {
  private data: Float32Array;
  constructor(
    public numberOfChannels: number,
    public length: number,
    public sampleRate: number
  ) {
    this.data = new Float32Array(length);
  }
  getChannelData() {
    return this.data;
  }
}

class MockAudioContext {
  state: AudioContextState = 'suspended';
  currentTime = 10;
  sampleRate = 44100;
  destination = new MockAudioNode();

  createdGains: MockGainNode[] = [];
  createdOscillators: MockOscillatorNode[] = [];
  createdFilters: MockBiquadFilterNode[] = [];

  createGain() {
    const g = new MockGainNode();
    this.createdGains.push(g);
    return g;
  }
  createDynamicsCompressor() {
    return new MockDynamicsCompressorNode();
  }
  createOscillator() {
    const o = new MockOscillatorNode();
    this.createdOscillators.push(o);
    return o;
  }
  createBiquadFilter() {
    const f = new MockBiquadFilterNode();
    this.createdFilters.push(f);
    return f;
  }
  createBufferSource() {
    return new MockAudioBufferSourceNode();
  }
  createChannelMerger() {
    return new MockChannelMergerNode();
  }
  createBuffer(channels: number, length: number, sampleRate: number) {
    return new MockAudioBuffer(channels, length, sampleRate);
  }
  resume = vi.fn(async () => {
    this.state = 'running';
  });
  suspend = vi.fn(async () => {
    this.state = 'suspended';
  });
  close = vi.fn(async () => {
    this.state = 'closed';
  });
}

describe('Audio & SFX Remediation Phase 3', () => {
  let mockCtxInstances: MockAudioContext[] = [];
  let audioInstances: HTMLAudioElement[] = [];

  beforeEach(async () => {
    mockCtxInstances = [];
    audioInstances = [];

    class TrackedAudioContext extends MockAudioContext {
      constructor() {
        super();
        mockCtxInstances.push(this);
      }
    }

    (window as unknown as { AudioContext: typeof MockAudioContext }).AudioContext =
      TrackedAudioContext;

    if (typeof window !== 'undefined' && typeof window.HTMLMediaElement !== 'undefined') {
      window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
      window.HTMLMediaElement.prototype.pause = vi.fn();
      window.HTMLMediaElement.prototype.load = vi.fn();
    }

    // Track created Audio() instances for BUG-46 checks
    const NativeAudio = window.Audio;
    vi.stubGlobal(
      'Audio',
      class extends NativeAudio {
        constructor(src?: string) {
          super(src);
          audioInstances.push(this);
        }
      }
    );

    localStorage.clear();
    try {
      await db.tasks.clear();
      await db.focus_sessions.clear();
    } catch {}

    AudioContextManager.getInstance().close();
    ChimeSynthesizer.getInstance().stopCurrentChime();
    AmbientSynthesizer.getInstance().stopAll();
    soundEffects.stop();
    useAudioStore.getState().resetToDefaults();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    soundEffects.stop();
    ChimeSynthesizer.getInstance().stopCurrentChime();
    AmbientSynthesizer.getInstance().stopAll();
    AudioContextManager.getInstance().close();
    vi.useRealTimers();
  });

  // =========================================================================
  // FEATURE 1: ChimeSynthesizer ADSR, Low-Pass, Harmonics, Sci-Fi LFO, Stop
  // =========================================================================
  describe('Feature 1: ChimeSynthesizer ADSR, Low-Pass Filter, Harmonics & Click-Free Stop', () => {
    it('tất cả 10 loại chuông đều dùng BiquadFilterNode lowpass, ADSR mượt và tổng peak <= 0.75', async () => {
      const synth = ChimeSynthesizer.getInstance();
      const allChimes: ChimeSoundType[] = [
        'tibetan_bowl',
        'crystal_chime',
        'digital_alarm',
        'brass_bell',
        'twinkle',
        'playtime',
        'scifi',
        'slow_rise',
        'rooster',
        'bird',
      ];

      for (const chime of allChimes) {
        const ctxBefore = AudioContextManager.getInstance().getContext() as unknown as MockAudioContext;
        const gainsBefore = ctxBefore.createdGains.length;
        const filtersBefore = ctxBefore.createdFilters.length;

        await synth.playChime(chime, 0.8);

        const newFilters = ctxBefore.createdFilters.slice(filtersBefore);
        expect(newFilters.some((f) => f.type === 'lowpass')).toBe(true);

        const newGains = ctxBefore.createdGains.slice(gainsBefore);
        // Voice gains (excluding master chimeGain at index 0, and FM modGain at index 1 for scifi)
        const voiceGains = chime === 'scifi' ? [newGains[newGains.length - 1]] : newGains.slice(1);
        expect(voiceGains.length).toBeGreaterThan(0);

        for (const vg of voiceGains) {
          expect(vg.gain.setValueAtTime).toHaveBeenCalledWith(0.0001, expect.any(Number));
          expect(vg.gain.linearRampToValueAtTime).toHaveBeenCalled();
          expect(vg.gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(0.0001, expect.any(Number));
        }

        // For simultaneous-harmonic bells, sum of peak voice gains must stay <= 0.75
        if (['tibetan_bowl', 'crystal_chime', 'brass_bell', 'slow_rise'].includes(chime)) {
          const peakSum = voiceGains.reduce((sum, vg) => {
            const rampCall = vg.gain.linearRampToValueAtTime.mock.calls[0];
            return sum + (rampCall ? Number(rampCall[0]) : 0);
          }, 0);
          expect(peakSum).toBeLessThanOrEqual(0.7501);
        }

        synth.stopCurrentChime();
      }
    });

    it('synthSciFi kết nối modulator -> modGain -> carrier.frequency đúng chuẩn', async () => {
      const synth = ChimeSynthesizer.getInstance();
      const ctx = AudioContextManager.getInstance().getContext() as unknown as MockAudioContext;
      const oscBefore = ctx.createdOscillators.length;
      const gainBefore = ctx.createdGains.length;

      await synth.playChime('scifi', 0.8);

      const newOscs = ctx.createdOscillators.slice(oscBefore);
      const newGains = ctx.createdGains.slice(gainBefore);

      const carrier = newOscs[0];
      const modulator = newOscs[1];
      const modGain = newGains[1]; // [0] = chimeGain, [1] = modGain, [2] = voiceGain

      expect(modulator.connect).toHaveBeenCalledWith(modGain);
      expect(modGain.connect).toHaveBeenCalledWith(carrier.frequency);
      expect(modulator.connect).not.toHaveBeenCalledWith(carrier.frequency);
    });

    it('stopCurrentChime() thực hiện linearRampToValueAtTime(0) 30ms trước khi stop & disconnect ở 35ms', async () => {
      vi.useFakeTimers();
      const synth = ChimeSynthesizer.getInstance();
      const ctx = AudioContextManager.getInstance().getContext() as unknown as MockAudioContext;
      await synth.playChime('tibetan_bowl', 0.8);

      // chimeGain is the first gain created after warmFilter in playChime
      const chimeGain = ctx.createdGains[ctx.createdGains.length - 6]; // chimeGain + 5 harmonics
      const osc = ctx.createdOscillators[ctx.createdOscillators.length - 1];

      chimeGain.gain.linearRampToValueAtTime.mockClear();
      chimeGain.gain.setValueAtTime.mockClear();
      chimeGain.disconnect.mockClear();

      synth.stopCurrentChime();

      // Must NOT immediately setValueAtTime(0, now) or immediately disconnect
      expect(chimeGain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0, ctx.currentTime + 0.03);
      expect(chimeGain.disconnect).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(40);
      expect(osc.stop).toHaveBeenCalled();
      expect(chimeGain.disconnect).toHaveBeenCalled();
    });

    it('playAlarmChimeSound không nhân 1.25x overdrive cho chimeVolume', async () => {
      useAudioStore.getState().setChimeVolume(0.6);
      await useAudioStore.getState().previewChime('brass_bell');
      const lastAudio = audioInstances[audioInstances.length - 1];
      expect(lastAudio).toBeDefined();
      expect(lastAudio.volume).toBeCloseTo(0.6, 2);
    });

    it('chuông Tây Tạng dùng synth riêng thay vì file chuông đồng trùng lặp', async () => {
      const synth = vi.spyOn(ChimeSynthesizer.getInstance(), 'playChime').mockResolvedValue(undefined);
      const count = audioInstances.length;
      useAudioStore.getState().setChimeVolume(0.6);
      await useAudioStore.getState().previewChime('tibetan_bowl');
      expect(synth).toHaveBeenCalledWith('tibetan_bowl', 0.6);
      expect(audioInstances).toHaveLength(count);
    });
  });

  // =========================================================================
  // FEATURE 2: soundEffects.ts, Async Race Guards & UI Call Sites
  // =========================================================================
  describe('Feature 2: soundEffects.ts Debounce/Mutex, Chime Race & UI Call Sites', () => {
    it('6 phương thức soundEffects chạy an toàn không ném lỗi khi thiếu AudioContext hoặc đang mute', () => {
      delete (window as unknown as { AudioContext?: unknown }).AudioContext;
      expect(() => {
        soundEffects.playClick();
        soundEffects.playTimerStart();
        soundEffects.playTimerPause();
        soundEffects.playTimerComplete();
        soundEffects.playPeerJoin();
        soundEffects.playTaskComplete();
      }).not.toThrow();

      // Restore AudioContext and test muted state
      (window as unknown as { AudioContext: typeof MockAudioContext }).AudioContext = MockAudioContext;
      const ctx = AudioContextManager.getInstance().getContext() as unknown as MockAudioContext;
      const oscBefore = ctx.createdOscillators.length;
      useAudioStore.setState((s) => ({ settings: { ...s.settings, isMuted: true } }));

      soundEffects.playTimerStart();
      soundEffects.playPeerJoin();
      expect(ctx.createdOscillators.length).toBe(oscBefore);
    });

    it('playClick debounces bursts < 70ms và playPeerJoin dùng chung 1 AudioContextManager instance', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-11-25T10:00:00Z'));

      const ctx = AudioContextManager.getInstance().getContext() as unknown as MockAudioContext;
      const oscBefore = ctx.createdOscillators.length;

      soundEffects.playClick();
      soundEffects.playClick();
      soundEffects.playClick();
      expect(ctx.createdOscillators.length - oscBefore).toBe(1);

      vi.advanceTimersByTime(80);
      soundEffects.playClick();
      expect(ctx.createdOscillators.length - oscBefore).toBe(2);

      for (let i = 0; i < 10; i++) {
        vi.advanceTimersByTime(350);
        soundEffects.playPeerJoin();
      }
      expect(mockCtxInstances.length).toBe(1);
    });

    it('chimeRequestSeq hủy yêu cầu previewChime cũ trong khoảng chờ 120ms', async () => {
      vi.useFakeTimers();
      const synthSpy = vi.spyOn(ChimeSynthesizer.getInstance(), 'playChime');

      const p1 = useAudioStore.getState().previewChime('twinkle');
      await vi.advanceTimersByTimeAsync(20);
      const p2 = useAudioStore.getState().previewChime('slow_rise');

      await vi.advanceTimersByTimeAsync(150);
      await Promise.all([p1, p2]);

      expect(synthSpy).toHaveBeenCalledTimes(1);
      expect(synthSpy).toHaveBeenCalledWith('slow_rise', expect.any(Number));
    });

    it('TimerWidget gọi đúng SFX cho Start, Pause, Resume, Reset, Skip và chuyển tab', () => {
      useTimerStore.setState({
        status: 'idle',
        phase: 'pomodoro',
        remainingMs: 25 * 60 * 1000,
      });

      const clickSpy = vi.spyOn(soundEffects, 'playClick');
      const startSpy = vi.spyOn(soundEffects, 'playTimerStart');
      const pauseSpy = vi.spyOn(soundEffects, 'playTimerPause');

      render(React.createElement(TimerWidget));

      fireEvent.click(screen.getByTestId('tab-short_break'));
      expect(clickSpy).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByTestId('timer-start-btn'));
      expect(startSpy).toHaveBeenCalledTimes(1);

      act(() => {
        useTimerStore.setState({ status: 'running' });
      });
      fireEvent.click(screen.getByTestId('timer-pause-btn'));
      expect(pauseSpy).toHaveBeenCalledTimes(1);

      act(() => {
        useTimerStore.setState({ status: 'paused' });
      });
      fireEvent.click(screen.getByTestId('timer-resume-btn'));
      expect(startSpy).toHaveBeenCalledTimes(2);

      fireEvent.click(screen.getByTestId('timer-reset-btn'));
      fireEvent.click(screen.getByTestId('timer-skip-btn'));
      expect(clickSpy).toHaveBeenCalledTimes(3);
    });

    it('MobileFocusView gọi đúng SFX cho main action, reset, skip, phase change và quick task complete', async () => {
      useTimerStore.getState().init();
      useTimerStore.setState({
        status: 'idle',
        phase: 'pomodoro',
        remainingMs: 25 * 60 * 1000,
        linkedTaskId: 'task-1',
        linkedTaskTitle: 'Ôn thi Audio',
      });
      useTaskStore.setState({
        tasks: [
          {
            id: 'task-1',
            title: 'Ôn thi Audio',
            status: 'todo',
            priority: 'medium',
            estimatedPomodoros: 2,
            completedPomodoros: 0,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          } as any,
        ],
        toggleTaskComplete: vi.fn().mockResolvedValue(undefined),
      });

      const clickSpy = vi.spyOn(soundEffects, 'playClick');
      const startSpy = vi.spyOn(soundEffects, 'playTimerStart');
      const pauseSpy = vi.spyOn(soundEffects, 'playTimerPause');
      const taskCompleteSpy = vi.spyOn(soundEffects, 'playTaskComplete');

      render(React.createElement(MobileFocusView));

      fireEvent.click(screen.getByTestId('mobile-quick-task-complete-btn'));
      expect(taskCompleteSpy).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByTestId('mobile-timer-main-action'));
      expect(startSpy).toHaveBeenCalledTimes(1);

      act(() => {
        useTimerStore.setState({ status: 'running' });
      });
      fireEvent.click(screen.getByTestId('mobile-timer-main-action'));
      expect(pauseSpy).toHaveBeenCalledTimes(1);

      act(() => {
        useTimerStore.setState({ status: 'idle' });
      });
      fireEvent.click(screen.getByTestId('mobile-timer-reset'));
      fireEvent.click(screen.getByTestId('mobile-timer-skip'));
      fireEvent.click(screen.getByTestId('mobile-phase-long_break'));
      expect(clickSpy).toHaveBeenCalledTimes(3);
    });

    it('MobileSettingsView dùng previewChime, chống bấm nhanh < 150ms cùng chuông, đổi select dừng chuông và dọn timer khi unmount', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-11-25T10:00:00Z'));

      const previewSpy = vi.fn().mockResolvedValue(undefined);
      const stopChimeSpy = vi.spyOn(useAudioStore.getState(), 'stopChime');
      useAudioStore.setState({
        previewChime: previewSpy,
        settings: { ...useAudioStore.getState().settings, selectedChime: 'tibetan_bowl' },
      });

      const { unmount } = render(React.createElement(MobileSettingsView));

      const previewBtn = screen.getByTestId('mobile-settings-preview-chime-btn');
      fireEvent.click(previewBtn);
      fireEvent.click(previewBtn); // Rapid tap < 150ms for same chime
      expect(previewSpy).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('mobile-settings-preview-indicator')).toBeDefined();

      // Changing select clears indicator and calls stopChime
      const selectEl = screen.getByTestId('mobile-settings-chime-select');
      fireEvent.change(selectEl, { target: { value: 'crystal_chime' } });
      expect(stopChimeSpy).toHaveBeenCalled();

      // Clicking preview immediately for new chime works
      fireEvent.click(previewBtn);
      expect(previewSpy).toHaveBeenCalledTimes(2);
      expect(previewSpy).toHaveBeenLastCalledWith('crystal_chime');

      unmount();
      expect(stopChimeSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    it('AudioWidget dọn preview timer và gọi stopChime khi unmount hoặc chuyển tab', async () => {
      vi.useFakeTimers();
      const stopChimeSpy = vi.spyOn(useAudioStore.getState(), 'stopChime');
      const { unmount } = render(React.createElement(AudioWidget));

      fireEvent.click(screen.getByTestId('btn-preview-chime'));
      await vi.advanceTimersByTimeAsync(150);

      fireEvent.click(screen.getByTestId('tab-ambient'));
      expect(stopChimeSpy).toHaveBeenCalled();

      unmount();
      expect(stopChimeSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  // =========================================================================
  // FEATURE 3: AudioContextManager Unlock & One-Shot Lock
  // =========================================================================
  describe('Feature 3: Cross-Platform AudioContext Unlock & One-Shot Lock', () => {
    it('đăng ký đủ 5 unlock events với passive+capture, mở khóa khi touchstart và re-arm sau close()', async () => {
      const addSpy = vi.spyOn(window, 'addEventListener');
      const mgr = AudioContextManager.getInstance();
      mgr.close();

      const registeredEvents = addSpy.mock.calls.map((c) => c[0]);
      for (const evt of ['pointerdown', 'touchstart', 'touchend', 'keydown', 'click']) {
        expect(registeredEvents).toContain(evt);
      }

      const touchCalls = addSpy.mock.calls.filter((c) => c[0] === 'touchstart');
      const lastTouchOpts = touchCalls[touchCalls.length - 1]?.[2] as AddEventListenerOptions;
      expect(lastTouchOpts?.passive).toBe(true);
      expect(lastTouchOpts?.capture).toBe(true);

      const ctx = mgr.getContext() as unknown as MockAudioContext;
      expect(ctx.state).toBe('suspended');

      window.dispatchEvent(new Event('touchstart'));
      await Promise.resolve();
      await Promise.resolve();

      expect(ctx.resume).toHaveBeenCalled();
      expect(ctx.state).toBe('running');

      // Close re-arms listeners
      addSpy.mockClear();
      mgr.close();
      const rearmedEvents = addSpy.mock.calls.map((c) => c[0]);
      expect(rearmedEvents).toContain('touchstart');
      expect(rearmedEvents).toContain('click');
    });

    it('beginOneShot/endOneShot ngăn AmbientSynthesizer.stopAll() suspend AudioContext khi đang có chuông/SFX', async () => {
      vi.useFakeTimers();
      const mgr = AudioContextManager.getInstance();
      const suspendSpy = vi.spyOn(mgr, 'suspend');
      const ambient = AmbientSynthesizer.getInstance();

      await ambient.playTrack('noise_pink', 0.5);
      const release = mgr.beginOneShot(3000);
      // Extra mismatched endOneShot must not underflow/break active lock
      expect(mgr.hasActiveOneShots()).toBe(true);

      ambient.stopAll();
      await vi.advanceTimersByTimeAsync(200);

      const ctx = mgr.getContext() as unknown as MockAudioContext;
      expect(ctx.suspend).not.toHaveBeenCalled();

      // Once one-shot ends, deferred suspend executes
      release();
      await Promise.resolve();
      expect(suspendSpy).toHaveBeenCalled();
      expect(ctx.suspend).toHaveBeenCalled();
    });

    it('getSfxBusGain() kết nối độc lập vào masterGain tách biệt với ambientBusGain', () => {
      const mgr = AudioContextManager.getInstance();
      const sfxBus = mgr.getSfxBusGain();
      const masterGain = mgr.getMasterGain();
      const ambientBus = mgr.getAmbientBusGain();

      expect(sfxBus).toBeDefined();
      expect(sfxBus).not.toBe(ambientBus);
      expect(sfxBus?.connect).toHaveBeenCalledWith(masterGain);
    });
  });

  // =========================================================================
  // FEATURE 4: Mixer Fades, Stream LFO, Noise Cache & BUG-46 PCM Cleanup
  // =========================================================================
  describe('Feature 4: Mixer Fade-In/Out, Stream LFO, Noise Cache & BUG-46 PCM Cleanup', () => {
    it('AmbientSynthesizer sửa wiring stream (lfo -> lfoGain -> bp.frequency), fade mượt và làm mới noiseBuffers theo ctx', async () => {
      vi.useFakeTimers();
      const mgr = AudioContextManager.getInstance();
      const ambient = AmbientSynthesizer.getInstance();

      const ctx1 = mgr.getContext() as unknown as MockAudioContext;
      const createBufferSpy = vi.spyOn(ctx1, 'createBuffer');

      await ambient.playTrack('stream', 0.5);
      const lfo = ctx1.createdOscillators[ctx1.createdOscillators.length - 1];
      const lfoGain = ctx1.createdGains[ctx1.createdGains.length - 1];
      const bp = ctx1.createdFilters[ctx1.createdFilters.length - 1];

      expect(lfo.connect).toHaveBeenCalledWith(lfoGain);
      expect(lfoGain.connect).toHaveBeenCalledWith(bp.frequency);
      expect(lfo.connect).not.toHaveBeenCalledWith(bp.frequency);

      // Noise buffer cached on same ctx
      await ambient.playTrack('rain', 0.4);
      expect(createBufferSpy).toHaveBeenCalledTimes(1);

      // Recreating context invalidates noiseBuffers cache
      ambient.stopAll();
      await vi.advanceTimersByTimeAsync(200);
      mgr.close();

      const ctx2 = mgr.getContext() as unknown as MockAudioContext;
      const createBufferSpy2 = vi.spyOn(ctx2, 'createBuffer');
      await ambient.playTrack('rain', 0.4);
      expect(createBufferSpy2).toHaveBeenCalledTimes(1);
    });

    it('BUG-46: toggleTrack off, stopAllTracks, resetToDefaults và stopChime đều dọn src = "" và load()', async () => {
      vi.useFakeTimers();
      const store = useAudioStore.getState();

      await store.toggleTrack('rain');
      const activeMap = getActiveAudioElements();
      const rainAudio = activeMap.get('rain')!;
      expect(rainAudio).toBeDefined();

      // Advance fade-in so volume > 0.01
      await vi.advanceTimersByTimeAsync(250);
      expect(rainAudio.volume).toBeGreaterThan(0.01);

      await store.toggleTrack('rain');
      expect(activeMap.has('rain')).toBe(false);

      // Wait 160ms fade-out -> disposeAudioElement runs
      await vi.advanceTimersByTimeAsync(200);
      expect(rainAudio.pause).toHaveBeenCalled();
      expect(rainAudio.src).toBe('');
      expect(rainAudio.load).toHaveBeenCalled();

      // stopAllTracks disposes synchronously
      await store.toggleTrack('cafe');
      const cafeAudio = activeMap.get('cafe')!;
      store.stopAllTracks();
      expect(cafeAudio.pause).toHaveBeenCalled();
      expect(cafeAudio.src).toBe('');
      expect(cafeAudio.load).toHaveBeenCalled();

      // stopChime disposes chime audio
      await store.previewChime('brass_bell');
      const chimeAudio = audioInstances[audioInstances.length - 1];
      store.stopChime();
      expect(chimeAudio.pause).toHaveBeenCalled();
      expect(chimeAudio.src).toBe('');
      expect(chimeAudio.load).toHaveBeenCalled();
    });

    it('toggleTrack generation guard hủy audio khi tắt ngay trong lúc play() đang chờ resolve', async () => {
      let resolvePlay!: () => void;
      window.HTMLMediaElement.prototype.play = vi.fn(
        () =>
          new Promise<void>((res) => {
            resolvePlay = res;
          })
      );

      const pOn = useAudioStore.getState().toggleTrack('rain');
      const rainAudio = getActiveAudioElements().get('rain')!;
      expect(rainAudio).toBeDefined();

      // User toggles OFF immediately before play() resolves
      await useAudioStore.getState().toggleTrack('rain');
      expect(getActiveAudioElements().has('rain')).toBe(false);

      // Now pending play() resolves -> must NOT stay active or leak
      resolvePlay();
      await pOn;

      expect(getActiveAudioElements().has('rain')).toBe(false);
      expect(rainAudio.pause).toHaveBeenCalled();
      expect(rainAudio.load).toHaveBeenCalled();
    });

    it('restoreAudioDucking sử dụng linearRampToValueAtTime liên tục thay vì stair-step setValueAtTime', () => {
      vi.useFakeTimers();
      const audioMgr = AudioContextManager.getInstance();
      const ambientBus = audioMgr.getAmbientBusGain() as unknown as MockGainNode;

      useAudioStore.getState().applyAudioDucking();
      ambientBus.gain.setValueAtTime.mockClear();
      ambientBus.gain.linearRampToValueAtTime.mockClear();

      useAudioStore.getState().restoreAudioDucking();
      expect(ambientBus.gain.linearRampToValueAtTime).toHaveBeenCalledWith(1.0, expect.any(Number));

      vi.advanceTimersByTime(550);
      // Should only call setValueAtTime once at the start of the ramp, never 10 times in an interval
      expect(ambientBus.gain.setValueAtTime).toHaveBeenCalledTimes(1);
    });

    it('GlobalAudioHost dọn sạch <audio> (pause, src="", load()) khi unmount', async () => {
      useAudioStore.setState({
        customMusicType: 'direct_audio',
        customMusicUrl: 'https://example.com/study.mp3',
        customMusicPlaying: true,
      });

      let unmount!: () => void;
      await act(async () => {
        const res = render(React.createElement(GlobalAudioHost));
        unmount = res.unmount;
        await Promise.resolve();
      });

      const host = screen.getByTestId('global-audio-host');
      const audioEl = host.querySelector('audio') as HTMLAudioElement;
      expect(audioEl.src).toContain('study.mp3');

      act(() => {
        unmount();
      });
      expect(audioEl.pause).toHaveBeenCalled();
      expect(audioEl.src).toBe('');
      expect(audioEl.load).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // ITERATION 2 REMEDIATION REGRESSION TESTS (Challengers 1 & 2 + Codex Review)
  // =========================================================================
  describe('Iteration 2 Remediation: Lifecycle, Race & Sequence Safety', () => {
    it('(a) soundEffects.stop() giải phóng toàn bộ active one-shots và ngắt kết nối nodes ngay lập tức', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-11-25T12:00:00Z'));

      const mgr = AudioContextManager.getInstance();
      const ctx = mgr.getContext() as unknown as MockAudioContext;
      const oscBefore = ctx.createdOscillators.length;
      const gainBefore = ctx.createdGains.length;
      const filterBefore = ctx.createdFilters.length;

      // Trigger cue 1 then overlapping cue 2 (queues a pending fade timer), then stop()
      soundEffects.playTimerStart();
      expect(mgr.getActiveOneShotCount()).toBe(1);
      soundEffects.playTimerPause();
      expect(mgr.getActiveOneShotCount()).toBe(2);

      soundEffects.stop();

      expect(mgr.getActiveOneShotCount()).toBe(0);
      const newOscs = ctx.createdOscillators.slice(oscBefore);
      const newGains = ctx.createdGains.slice(gainBefore);
      const newFilters = ctx.createdFilters.slice(filterBefore);
      expect(newOscs.length).toBeGreaterThan(0);
      for (const osc of newOscs) {
        expect(osc.stop).toHaveBeenCalled();
        expect(osc.disconnect).toHaveBeenCalled();
      }
      for (const g of newGains) {
        expect(g.disconnect).toHaveBeenCalled();
      }
      for (const f of newFilters) {
        expect(f.disconnect).toHaveBeenCalled();
      }

      vi.advanceTimersByTime(100);
      expect(mgr.getActiveOneShotCount()).toBe(0);
    });

    it('(b) soundEffects.playClick() phát bình thường khi Date.now() === 0', () => {
      vi.useFakeTimers();
      vi.setSystemTime(0);
      soundEffects.stop();

      const ctx = AudioContextManager.getInstance().getContext() as unknown as MockAudioContext;
      const oscBefore = ctx.createdOscillators.length;

      soundEffects.playClick();
      expect(ctx.createdOscillators.length - oscBefore).toBe(1);
    });

    it('(c) AmbientSynthesizer.stopAll() khi có Chime 1 + Chime 2 gối đầu vẫn hoãn và gọi ctx.suspend() sau khi Chime 2 kết thúc', async () => {
      vi.useFakeTimers();
      const mgr = AudioContextManager.getInstance();
      const ambient = AmbientSynthesizer.getInstance();
      const chime = ChimeSynthesizer.getInstance();

      await ambient.playTrack('rain', 0.5);
      const ctx = mgr.peekContext() as unknown as MockAudioContext;
      expect(ctx.state).toBe('running');

      await chime.playChime('bird', 0.8);
      ambient.stopAll();
      await vi.advanceTimersByTimeAsync(200);
      expect(ctx.suspend).not.toHaveBeenCalled();

      // Overlapping Chime 2 starts while Chime 1 is still active
      await chime.playChime('bird', 0.8);
      await vi.advanceTimersByTimeAsync(100);
      expect(ctx.suspend).not.toHaveBeenCalled();

      // Advance past Chime 2 completion (800ms)
      await vi.advanceTimersByTimeAsync(800);
      await Promise.resolve();
      expect(ctx.suspend).toHaveBeenCalledTimes(1);
      expect(ctx.state).toBe('suspended');
    });

    it('(d) ChimeSynthesizer.stopCurrentChime() sau AudioContextManager.close() không tạo AudioContext thứ 2', async () => {
      const mgr = AudioContextManager.getInstance();
      const chime = ChimeSynthesizer.getInstance();

      await chime.playChime('tibetan_bowl', 0.8);
      expect(mockCtxInstances.length).toBe(1);

      mgr.close();
      expect(mgr.peekContext()).toBeNull();

      chime.stopCurrentChime();
      soundEffects.stop();
      AmbientSynthesizer.getInstance().stopAll();

      expect(mockCtxInstances.length).toBe(1);
      expect(mgr.peekContext()).toBeNull();
    });

    it('(e) AmbientSynthesizer playTrack -> stopTrack -> playTrack trong 60ms giữ ctx.state === running và không gọi suspend()', async () => {
      vi.useFakeTimers();
      const mgr = AudioContextManager.getInstance();
      const ambient = AmbientSynthesizer.getInstance();

      await ambient.playTrack('rain', 0.6);
      const ctx = mgr.peekContext() as unknown as MockAudioContext;
      expect(ctx.state).toBe('running');

      await vi.advanceTimersByTimeAsync(20);
      ambient.stopTrack('rain');
      await vi.advanceTimersByTimeAsync(30);
      await ambient.playTrack('rain', 0.7);

      await vi.advanceTimersByTimeAsync(300);
      expect(ambient.isTrackPlaying('rain')).toBe(true);
      expect(ctx.suspend).not.toHaveBeenCalled();
      expect(ctx.state).toBe('running');
    });

    it('(f) useAudioStore.toggleTrack(binaural_alpha) ON -> OFF -> ON khi ensureResumed() đang chờ vẫn giữ store và synth đang phát', async () => {
      const mgr = AudioContextManager.getInstance();
      const ambient = AmbientSynthesizer.getInstance();

      let ensureCalls = 0;
      let resolveSecondEnsure!: (ok: boolean) => void;
      const origEnsure = mgr.ensureResumed.bind(mgr);
      vi.spyOn(mgr, 'ensureResumed').mockImplementation(async (opts) => {
        ensureCalls += 1;
        if (ensureCalls === 2) {
          return new Promise<boolean>((resolve) => {
            resolveSecondEnsure = resolve;
          });
        }
        return origEnsure(opts);
      });

      const p1 = useAudioStore.getState().toggleTrack('binaural_alpha');
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      expect(ensureCalls).toBe(2);

      const p2 = useAudioStore.getState().toggleTrack('binaural_alpha'); // OFF
      const p3 = useAudioStore.getState().toggleTrack('binaural_alpha'); // ON
      await Promise.all([p2, p3]);

      resolveSecondEnsure(true);
      await p1;

      const track = useAudioStore.getState().tracks.find((t) => t.id === 'binaural_alpha');
      expect(track?.isPlaying).toBe(true);
      expect(ambient.isTrackPlaying('binaural_alpha')).toBe(true);
    });

    it('(g) GlobalAudioHost không gọi audio.pause() khi deferred play() seq 1 resolve sau seq 2', async () => {
      let playCallCount = 0;
      let resolvePlay1!: () => void;
      let resolvePlay2!: () => void;
      window.HTMLMediaElement.prototype.play = vi.fn(() => {
        playCallCount += 1;
        if (playCallCount === 1) {
          return new Promise<void>((res) => {
            resolvePlay1 = res;
          });
        }
        return new Promise<void>((res) => {
          resolvePlay2 = res;
        });
      });

      useAudioStore.setState({
        customMusicType: 'direct_audio',
        customMusicUrl: 'https://example.com/track1.mp3',
        customMusicPlaying: true,
      });

      render(React.createElement(GlobalAudioHost));
      const host = screen.getByTestId('global-audio-host');
      const audioEl = host.querySelector('audio') as HTMLAudioElement;
      expect(playCallCount).toBe(1);

      // Switch URL -> triggers seq 2 play() while seq 1 is still pending
      act(() => {
        useAudioStore.setState({
          customMusicUrl: 'https://example.com/track2.mp3',
          customMusicPlaying: true,
        });
      });
      expect(playCallCount).toBe(2);

      // Clear synchronous src-change pause calls so we only observe promise resolution side-effects
      (audioEl.pause as ReturnType<typeof vi.fn>).mockClear();

      // Seq 2 resolves first, then stale Seq 1 resolves out of order
      await act(async () => {
        resolvePlay2();
        await Promise.resolve();
      });
      await act(async () => {
        resolvePlay1();
        await Promise.resolve();
      });

      expect(audioEl.pause).not.toHaveBeenCalled();
      expect(audioEl.src).toContain('track2.mp3');
      expect(useAudioStore.getState().customMusicPlaying).toBe(true);
    });
  });
});
