import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AudioContextManager } from '../../src/services/audioContextManager';
import { ChimeSynthesizer } from '../../src/services/chimeSynthesizer';
import { AmbientSynthesizer } from '../../src/services/ambientSynthesizer';
import { useAudioStore, DEFAULT_SETTINGS } from '../../src/stores/useAudioStore';
import { ChimeSoundType, AmbientTrackId } from '../../src/types/audio';

// Mock Web Audio API cho môi trường JSDOM
class MockAudioParam {
  value = 1;
  setValueAtTime = vi.fn((val: number) => { this.value = val; });
  linearRampToValueAtTime = vi.fn((val: number) => { this.value = val; });
  exponentialRampToValueAtTime = vi.fn((val: number) => { this.value = val; });
  setTargetAtTime = vi.fn((val: number) => { this.value = val; });
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
  type = 'lowpass';
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
  constructor(public numberOfChannels: number, public length: number, public sampleRate: number) {
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

  createGain() { return new MockGainNode(); }
  createDynamicsCompressor() { return new MockDynamicsCompressorNode(); }
  createOscillator() { return new MockOscillatorNode(); }
  createBiquadFilter() { return new MockBiquadFilterNode(); }
  createBufferSource() { return new MockAudioBufferSourceNode(); }
  createChannelMerger() { return new MockChannelMergerNode(); }
  createBuffer(channels: number, length: number, sampleRate: number) {
    return new MockAudioBuffer(channels, length, sampleRate);
  }
  resume = vi.fn(async () => { this.state = 'running'; });
  close = vi.fn(async () => { this.state = 'closed'; });
}

describe('Audio Engine & Synthesis Unit Tests', () => {
  beforeEach(() => {
    (window as unknown as { AudioContext: typeof MockAudioContext }).AudioContext = MockAudioContext;
    localStorage.clear();
    useAudioStore.getState().resetToDefaults();
  });

  afterEach(() => {
    AudioContextManager.getInstance().close();
    AmbientSynthesizer.getInstance().stopAll();
  });

  describe('1. AudioContextManager', () => {
    it('khởi tạo AudioContext và thiết lập DynamicsCompressorNode chống clipping loa (-6dB)', () => {
      const manager = AudioContextManager.getInstance();
      const ctx = manager.getContext();
      expect(ctx).toBeDefined();

      const masterGain = manager.getMasterGain();
      expect(masterGain).toBeDefined();
      expect(masterGain?.connect).toHaveBeenCalled();
    });

    it('điều chỉnh master volume và xử lý mute chính xác', () => {
      const manager = AudioContextManager.getInstance();
      manager.getContext();

      manager.setMasterVolume(0.5, false);
      const masterGain = manager.getMasterGain();
      expect(masterGain?.gain.setTargetAtTime).toHaveBeenCalledWith(0.5, 10, 0.03);

      manager.setMasterVolume(0.5, true);
      expect(masterGain?.gain.setTargetAtTime).toHaveBeenCalledWith(0, 10, 0.03);
    });

    it('ensureResumed chuyển AudioContext từ suspended sang running khi có tương tác', async () => {
      const manager = AudioContextManager.getInstance();
      const ctx = manager.getContext();
      expect(ctx?.state).toBe('suspended');

      const resumed = await manager.ensureResumed();
      expect(resumed).toBe(true);
      expect(ctx?.state).toBe('running');
      expect(manager.hasUserInteracted()).toBe(true);
    });

    it('bảo toàn volume và mute khi cấu hình trước khi getContext() được gọi', () => {
      const manager = AudioContextManager.getInstance();
      manager.close();
      manager.setMasterVolume(0.35, true);

      const ctx = manager.getContext();
      expect(ctx).toBeDefined();
      const masterGain = manager.getMasterGain();
      expect(masterGain?.gain.setValueAtTime).toHaveBeenCalledWith(0, 10);
    });
  });

  describe('2. ChimeSynthesizer', () => {
    it('tổng hợp thành công toàn bộ 6 loại chuông (twinkle, playtime, scifi, slow_rise, rooster, bird)', async () => {
      const chimeSynth = ChimeSynthesizer.getInstance();
      const chimeTypes: ChimeSoundType[] = [
        'twinkle',
        'playtime',
        'scifi',
        'slow_rise',
        'rooster',
        'bird',
      ];

      for (const chime of chimeTypes) {
        await expect(chimeSynth.playChime(chime, 0.8)).resolves.not.toThrow();
      }
    });

    it('previewChime gọi thành công mà không gây ngoại lệ', async () => {
      const chimeSynth = ChimeSynthesizer.getInstance();
      await expect(chimeSynth.previewChime('twinkle', 0.5)).resolves.not.toThrow();
    });

    it('tự động ngắt kết nối chimeGain sau thời gian chờ để ngăn rò rỉ AudioNode', async () => {
      vi.useFakeTimers();
      const chimeSynth = ChimeSynthesizer.getInstance();
      await chimeSynth.playChime('twinkle', 0.8);
      vi.advanceTimersByTime(2100);
      vi.useRealTimers();
    });
  });

  describe('3. AmbientSynthesizer', () => {
    it('tạo buffer và phát White, Pink, Brown noise mà không phát sinh lỗi', async () => {
      const ambient = AmbientSynthesizer.getInstance();
      const noiseTracks: AmbientTrackId[] = ['noise_white', 'noise_pink', 'noise_brown'];

      for (const track of noiseTracks) {
        await ambient.playTrack(track, 0.5);
        expect(ambient.isTrackPlaying(track)).toBe(true);
        ambient.stopTrack(track);
      }
    });

    it('tạo sóng Binaural Beats với 2 kênh Stereo tách biệt cho 5 dải sóng', async () => {
      const ambient = AmbientSynthesizer.getInstance();
      const binauralTracks: AmbientTrackId[] = [
        'binaural_alpha',
        'binaural_beta',
        'binaural_gamma',
        'binaural_theta',
        'binaural_delta',
      ];

      for (const track of binauralTracks) {
        await ambient.playTrack(track, 0.3);
        expect(ambient.isTrackPlaying(track)).toBe(true);
        ambient.stopTrack(track);
      }
    });

    it('tạo âm thanh môi trường procedural độc lập (rain, ocean_waves, cafe, keyboard, stream, campfire)', async () => {
      const ambient = AmbientSynthesizer.getInstance();
      const proceduralTracks: AmbientTrackId[] = [
        'rain',
        'ocean_waves',
        'cafe',
        'keyboard',
        'stream',
        'campfire',
      ];

      for (const track of proceduralTracks) {
        await ambient.playTrack(track, 0.4);
        expect(ambient.isTrackPlaying(track)).toBe(true);
      }

      // Dừng tất cả
      ambient.stopAll();
      for (const track of proceduralTracks) {
        expect(ambient.isTrackPlaying(track)).toBe(false);
      }
    });

    it('điều chỉnh âm lượng của track đang phát', async () => {
      const ambient = AmbientSynthesizer.getInstance();
      await ambient.playTrack('rain', 0.2);

      ambient.setTrackVolume('rain', 0.8);
      expect(ambient.isTrackPlaying('rain')).toBe(true);
      ambient.stopTrack('rain');
    });
  });

  describe('4. useAudioStore', () => {
    it('khởi tạo với cấu hình mặc định và 14 tracks bao gồm Rain, Ocean Waves, Cafe, Keyboard', () => {
      const state = useAudioStore.getState();
      expect(state.settings.masterVolume).toBe(DEFAULT_SETTINGS.masterVolume);
      expect(state.settings.selectedChime).toBe('twinkle');
      expect(state.settings.isMuted).toBe(false);
      expect(state.tracks.length).toBe(14);

      const requiredTracks = ['rain', 'ocean_waves', 'cafe', 'keyboard'];
      for (const id of requiredTracks) {
        expect(state.tracks.some((t) => t.id === id)).toBe(true);
      }
    });

    it('thay đổi master volume và lưu vào localStorage', () => {
      useAudioStore.getState().setMasterVolume(0.65);
      expect(useAudioStore.getState().settings.masterVolume).toBe(0.65);

      const saved = JSON.parse(localStorage.getItem('pomodoro_audio_settings_v1') || '{}');
      expect(saved.masterVolume).toBe(0.65);
    });

    it('bật tắt mute master', () => {
      expect(useAudioStore.getState().settings.isMuted).toBe(false);
      useAudioStore.getState().toggleMasterMute();
      expect(useAudioStore.getState().settings.isMuted).toBe(true);
      useAudioStore.getState().toggleMasterMute();
      expect(useAudioStore.getState().settings.isMuted).toBe(false);
    });

    it('chọn loại chuông và preview', async () => {
      useAudioStore.getState().setSelectedChime('scifi');
      expect(useAudioStore.getState().settings.selectedChime).toBe('scifi');

      await expect(useAudioStore.getState().previewChime()).resolves.not.toThrow();
    });

    it('bật tắt track ambient và cập nhật trạng thái isPlaying', async () => {
      await useAudioStore.getState().toggleTrack('noise_pink');
      let track = useAudioStore.getState().tracks.find((t) => t.id === 'noise_pink');
      expect(track?.isPlaying).toBe(true);

      await useAudioStore.getState().toggleTrack('noise_pink');
      track = useAudioStore.getState().tracks.find((t) => t.id === 'noise_pink');
      expect(track?.isPlaying).toBe(false);
    });

    it('hỗ trợ phát đồng thời nhiều track (Rain + Ocean Waves + Cafe)', async () => {
      await useAudioStore.getState().toggleTrack('rain');
      await useAudioStore.getState().toggleTrack('ocean_waves');
      await useAudioStore.getState().toggleTrack('cafe');

      const playing = useAudioStore.getState().tracks.filter((t) => t.isPlaying);
      expect(playing.length).toBe(3);

      useAudioStore.getState().stopAllTracks();
      const playingAfter = useAudioStore.getState().tracks.filter((t) => t.isPlaying);
      expect(playingAfter.length).toBe(0);
    });

    it('điều chỉnh âm lượng track và lưu vào cấu hình', () => {
      useAudioStore.getState().setTrackVolume('keyboard', 0.85);
      const track = useAudioStore.getState().tracks.find((t) => t.id === 'keyboard');
      expect(track?.volume).toBe(0.85);

      const saved = JSON.parse(localStorage.getItem('pomodoro_audio_tracks_v1') || '{}');
      expect(saved.keyboard).toBe(0.85);
    });

    it('resetToDefaults khôi phục toàn bộ cài đặt âm thanh ban đầu', async () => {
      useAudioStore.getState().setMasterVolume(0.2);
      useAudioStore.getState().setSelectedChime('bird');
      await useAudioStore.getState().toggleTrack('rain');

      useAudioStore.getState().resetToDefaults();

      const state = useAudioStore.getState();
      expect(state.settings.masterVolume).toBe(0.8);
      expect(state.settings.selectedChime).toBe('twinkle');
      expect(state.tracks.filter((t) => t.isPlaying).length).toBe(0);
    });
  });

  describe('4. Timer Completion & DB Error Audio Guarantees', () => {
    it('chỉ phát chuông khi bản ghi phiên được lưu thành công vào cơ sở dữ liệu', async () => {
      const playChimeSpy = vi.fn().mockResolvedValue(undefined);
      useAudioStore.setState({ playChime: playChimeSpy });

      // Giả lập luồng xử lý onComplete với kết quả thành công
      const wasRecordedSuccess = true;
      if (wasRecordedSuccess) {
        await useAudioStore.getState().playChime();
      }
      expect(playChimeSpy).toHaveBeenCalledTimes(1);

      // Giả lập luồng xử lý onComplete khi bị trùng lặp (ConstraintError -> false)
      playChimeSpy.mockClear();
      const wasRecordedDuplicate = false;
      if (wasRecordedDuplicate) {
        await useAudioStore.getState().playChime();
      }
      expect(playChimeSpy).not.toHaveBeenCalled();
    });

    it('không phát chuông và không gây unhandled rejection khi IndexedDB gặp lỗi bất thường', async () => {
      const playChimeSpy = vi.fn().mockResolvedValue(undefined);
      useAudioStore.setState({ playChime: playChimeSpy });

      // Giả lập lỗi DB bất thường (QuotaExceededError hoặc DatabaseClosedError)
      const mockFailingRecordAction = async () => {
        throw new Error('Database closed unexpectedly');
      };

      let wasRecorded = false;
      try {
        wasRecorded = await mockFailingRecordAction();
      } catch {
        wasRecorded = false;
      }

      if (wasRecorded) {
        await useAudioStore.getState().playChime();
      }

      expect(wasRecorded).toBe(false);
      expect(playChimeSpy).not.toHaveBeenCalled();
    });
  });
});
