import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  NATURE_TRACKS,
  LIFE_TRACKS,
  NOISE_TRACKS,
  BINAURAL_TRACKS,
  ALL_AMBIENT_TRACKS,
  AMBIENT_TABS
} from '../../src/data/ambientTracks';
import { useAudioStore, getActiveAudioElements, DEFAULT_SETTINGS } from '../../src/stores/useAudioStore';
import { AmbientSynthesizer } from '../../src/services/ambientSynthesizer';
import { AudioContextManager } from '../../src/services/audioContextManager';

describe('Multi-Channel Audio Engine & Comprehensive Ambient Suite (v6.3)', () => {
  beforeEach(() => {
    localStorage.clear();
    if (typeof window !== 'undefined' && typeof window.HTMLMediaElement !== 'undefined') {
      window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
      window.HTMLMediaElement.prototype.pause = vi.fn();
    }
    useAudioStore.getState().resetToDefaults();
  });

  afterEach(() => {
    useAudioStore.getState().stopAllTracks();
    AudioContextManager.getInstance().close();
    AmbientSynthesizer.getInstance().stopAll();
  });

  describe('1. Danh Mục Âm Thanh (ambientTracks.ts)', () => {
    it('nhóm Tự Nhiên chứa đúng 7 bài với URL âm thanh chuẩn', () => {
      expect(NATURE_TRACKS.length).toBe(7);

      const expectedNature = [
        { id: 'rain', name: 'Mưa Rào', url: 'https://www.gstatic.com/voice_delight/sounds/long/rain.mp3' },
        { id: 'ocean_waves', name: 'Sóng Biển', url: 'https://www.gstatic.com/voice_delight/sounds/long/ocean.mp3' },
        { id: 'stream', name: 'Suối Nước', url: 'https://www.gstatic.com/voice_delight/sounds/long/babbling_brook.mp3' },
        { id: 'forest_birds', name: 'Rừng & Tiếng Chim', url: 'https://www.gstatic.com/voice_delight/sounds/long/forest.mp3' },
        { id: 'campfire', name: 'Lửa Trại', url: 'https://www.gstatic.com/voice_delight/sounds/long/fireplace.mp3' },
        { id: 'forest_wind', name: 'Gió Rừng Mùa Hè', url: 'https://actions.google.com/sounds/v1/weather/forest_wind_summer.ogg' },
        { id: 'summer_crickets', name: 'Đêm Hè Tiếng Dế', url: 'https://actions.google.com/sounds/v1/ambiences/outdoor_summer_ambience.ogg' },
      ];

      for (const exp of expectedNature) {
        const found = NATURE_TRACKS.find((t) => t.id === exp.id);
        expect(found).toBeDefined();
        expect(found?.name).toBe(exp.name);
        expect(found?.url).toBe(exp.url);
        expect(found?.category).toBe('nature');
      }
    });

    it('nhóm Cuộc Sống chứa đúng 10 bài với URL âm thanh chuẩn', () => {
      expect(LIFE_TRACKS.length).toBe(10);

      const expectedLife = [
        { id: 'cafe', name: 'Quán Cà Phê', url: 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg' },
        { id: 'keyboard', name: 'Bàn Phím Cơ', url: 'https://actions.google.com/sounds/v1/household/typewriter_fast.ogg' },
        { id: 'fan', name: 'Quạt Máy', url: 'https://actions.google.com/sounds/v1/household/fan_oscillating.ogg' },
        { id: 'clock', name: 'Đồng Hồ Tích Tắc', url: 'https://actions.google.com/sounds/v1/household/clock_ticking.ogg' },
        { id: 'train', name: 'Tàu Hỏa Lăn Bánh', url: 'https://actions.google.com/sounds/v1/transportation/steam_train_whistle_and_wheels.ogg' },
        { id: 'rain_window', name: 'Mưa Trên Cửa Kính', url: 'https://actions.google.com/sounds/v1/weather/rain_heavy.ogg' },
        { id: 'thunder', name: 'Sấm Sét Xa Dịu', url: 'https://actions.google.com/sounds/v1/weather/thunder_crack_far.ogg' },
        { id: 'library_pages', name: 'Lật Trang Sách Thư Viện', url: 'https://actions.google.com/sounds/v1/household/paper_rustling.ogg' },
        { id: 'wind_chimes', name: 'Chuông Gió Phong Linh', url: 'https://actions.google.com/sounds/v1/household/wind_chimes.ogg' },
        { id: 'coastal_breeze', name: 'Gió Thoảng Ven Biển', url: 'https://actions.google.com/sounds/v1/ambiences/crickets_with_distant_traffic.ogg' },
      ];

      for (const exp of expectedLife) {
        const found = LIFE_TRACKS.find((t) => t.id === exp.id);
        expect(found).toBeDefined();
        expect(found?.name).toBe(exp.name);
        expect(found?.url).toBe(exp.url);
        expect(found?.category).toBe('life');
      }
    });

    it('nhóm Tiếng Ồn Khoa Học chứa đúng 4 loại: White, Pink, Brown, Blue', () => {
      expect(NOISE_TRACKS.length).toBe(4);
      const ids = NOISE_TRACKS.map((t) => t.id);
      expect(ids).toContain('noise_white');
      expect(ids).toContain('noise_pink');
      expect(ids).toContain('noise_brown');
      expect(ids).toContain('noise_blue');

      // White Noise có URL CDN chính chủ
      const white = NOISE_TRACKS.find((t) => t.id === 'noise_white');
      expect(white?.url).toBe('https://www.gstatic.com/voice_delight/sounds/long/white_noise.mp3');
    });

    it('nhóm Sóng Não chứa đủ 4 dải cơ bản: Alpha (10Hz), Beta (18Hz), Theta (6Hz), Delta (2Hz)', () => {
      const alpha = BINAURAL_TRACKS.find((t) => t.id === 'binaural_alpha');
      const beta = BINAURAL_TRACKS.find((t) => t.id === 'binaural_beta');
      const theta = BINAURAL_TRACKS.find((t) => t.id === 'binaural_theta');
      const delta = BINAURAL_TRACKS.find((t) => t.id === 'binaural_delta');

      expect(alpha?.binauralBeatHz).toBe(10);
      expect(beta?.binauralBeatHz).toBe(18);
      expect(theta?.binauralBeatHz).toBe(6);
      expect(delta?.binauralBeatHz).toBe(2);
    });

    it('cấu hình AMBIENT_TABS định nghĩa đúng 4 nhóm chức năng + tất cả', () => {
      const tabIds = AMBIENT_TABS.map((t) => t.id);
      expect(tabIds).toEqual(['nature', 'life', 'binaural', 'noise', 'all']);
    });
  });

  describe('2. Multi-Channel Audio Engine (HTMLAudioElement Map)', () => {
    it('khởi tạo HTMLAudioElement khi bật track có URL và thêm vào activeAudioElements map', async () => {
      const store = useAudioStore.getState();
      await store.toggleTrack('rain');

      const activeMap = getActiveAudioElements();
      const rainAudio = activeMap.get('rain');
      expect(rainAudio).toBeDefined();
      expect(rainAudio?.loop).toBe(true);
      // Đảm bảo không gán crossOrigin để trình duyệt phát ở chế độ HTML5 No-CORS chuẩn (tránh bị CDN Google chặn CORS)
      expect(rainAudio?.crossOrigin).toBeFalsy();

      const track = useAudioStore.getState().tracks.find((t) => t.id === 'rain');
      expect(track?.isPlaying).toBe(true);

      // Âm lượng gán bằng track.volume * masterVolume
      const expectedVol = track!.volume * DEFAULT_SETTINGS.masterVolume;
      expect(rainAudio?.volume).toBeCloseTo(expectedVol, 2);
    });

    it('dừng track và xóa khỏi activeAudioElements map khi toggle off', async () => {
      const store = useAudioStore.getState();
      await store.toggleTrack('ocean_waves');

      const activeMap = getActiveAudioElements();
      expect(activeMap.has('ocean_waves')).toBe(true);

      // Toggle off
      await store.toggleTrack('ocean_waves');
      expect(activeMap.has('ocean_waves')).toBe(false);

      const track = useAudioStore.getState().tracks.find((t) => t.id === 'ocean_waves');
      expect(track?.isPlaying).toBe(false);
    });

    it('cập nhật âm lượng thời gian thực khi điều chỉnh volume từng track', async () => {
      const store = useAudioStore.getState();
      await store.toggleTrack('cafe');

      const activeMap = getActiveAudioElements();
      const cafeAudio = activeMap.get('cafe');
      expect(cafeAudio).toBeDefined();

      store.setTrackVolume('cafe', 0.9);
      const expectedVol = 0.9 * useAudioStore.getState().settings.masterVolume;
      expect(cafeAudio?.volume).toBeCloseTo(expectedVol, 2);
    });

    it('đồng bộ tức thời âm lượng toàn bộ các track khi thay đổi Master Volume', async () => {
      const store = useAudioStore.getState();
      await store.toggleTrack('rain');
      await store.toggleTrack('keyboard');

      const activeMap = getActiveAudioElements();
      const rainAudio = activeMap.get('rain');
      const keyboardAudio = activeMap.get('keyboard');

      store.setMasterVolume(0.5);

      const rainTrack = useAudioStore.getState().tracks.find((t) => t.id === 'rain');
      const keyboardTrack = useAudioStore.getState().tracks.find((t) => t.id === 'keyboard');

      expect(rainAudio?.volume).toBeCloseTo(rainTrack!.volume * 0.5, 2);
      expect(keyboardAudio?.volume).toBeCloseTo(keyboardTrack!.volume * 0.5, 2);
    });

    it('tắt tiếng tức thời khi bật Master Mute và khôi phục khi unmute', async () => {
      const store = useAudioStore.getState();
      await store.toggleTrack('stream');

      const activeMap = getActiveAudioElements();
      const streamAudio = activeMap.get('stream');

      // 1. Mute
      store.toggleMasterMute();
      expect(useAudioStore.getState().settings.isMuted).toBe(true);
      expect(streamAudio?.volume).toBe(0);

      // 2. Unmute
      store.toggleMasterMute();
      expect(useAudioStore.getState().settings.isMuted).toBe(false);
      const streamTrack = useAudioStore.getState().tracks.find((t) => t.id === 'stream');
      expect(streamAudio?.volume).toBeCloseTo(streamTrack!.volume * useAudioStore.getState().settings.masterVolume, 2);
    });

    it('hỗ trợ phát đồng thời nhiều âm thanh từ cả Nature và Life mà không xung đột', async () => {
      const store = useAudioStore.getState();
      await store.toggleTrack('rain');
      await store.toggleTrack('campfire');
      await store.toggleTrack('keyboard');
      await store.toggleTrack('wind_chimes');

      const activeMap = getActiveAudioElements();
      expect(activeMap.size).toBe(4);

      const playingTracks = useAudioStore.getState().tracks.filter((t) => t.isPlaying);
      expect(playingTracks.length).toBe(4);

      // Dừng tất cả
      store.stopAllTracks();
      expect(activeMap.size).toBe(0);
      expect(useAudioStore.getState().tracks.filter((t) => t.isPlaying).length).toBe(0);
    });

    it('tổng hợp Web Audio API mượt mà cho các track không có URL (noise_pink, binaural_alpha)', async () => {
      const synthSpy = vi.spyOn(AmbientSynthesizer.getInstance(), 'playTrack');
      const store = useAudioStore.getState();

      await store.toggleTrack('noise_pink');
      expect(synthSpy).toHaveBeenCalledWith('noise_pink', expect.any(Number));

      await store.toggleTrack('binaural_alpha');
      expect(synthSpy).toHaveBeenCalledWith('binaural_alpha', expect.any(Number));

      synthSpy.mockRestore();
    });
  });
});
