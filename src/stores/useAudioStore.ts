import { create } from 'zustand';
import {
  AmbientTrackConfig,
  AmbientTrackId,
  AudioSettings,
  ChimeSoundType,
} from '../types/audio';
import { AudioContextManager } from '../services/audioContextManager';
import { ChimeSynthesizer } from '../services/chimeSynthesizer';
import { AmbientSynthesizer } from '../services/ambientSynthesizer';
import { ALL_AMBIENT_TRACKS } from '../data/ambientTracks';
import { ALARM_CHIMES } from '../data/alarmSounds';

// Multi-Channel Audio Engine lưu trữ và quản lý các HTMLAudioElement đang chạy
const activeAudioElements = new Map<string, HTMLAudioElement>();
const activeAudioFades = new Map<HTMLAudioElement, () => void>();
const audioTargetVolumes = new Map<HTMLAudioElement, number>();
const pendingDisposeAudios = new Map<AmbientTrackId, HTMLAudioElement>();
const toggleTrackGeneration = new Map<AmbientTrackId, number>();

export const getActiveAudioElements = (): Map<string, HTMLAudioElement> => activeAudioElements;

function cancelAudioFade(audio: HTMLAudioElement): void {
  const cancel = activeAudioFades.get(audio);
  if (cancel) {
    activeAudioFades.delete(audio);
    cancel();
  }
}

function fadeAudioElement(
  audio: HTMLAudioElement,
  fromVol: number,
  toVol: number,
  durationMs: number,
  onDone?: () => void
): void {
  cancelAudioFade(audio);
  const safeFrom = Math.max(0, Math.min(1, fromVol));
  const safeTo = Math.max(0, Math.min(1, toVol));
  audioTargetVolumes.set(audio, safeTo);

  if (durationMs <= 0 || Math.abs(safeFrom - safeTo) < 0.005) {
    try {
      audio.volume = safeTo;
    } catch {}
    onDone?.();
    return;
  }

  try {
    audio.volume = safeFrom;
  } catch {}

  const stepMs = 20;
  const totalSteps = Math.max(1, Math.round(durationMs / stepMs));
  let step = 0;

  const timer = setInterval(() => {
    step += 1;
    const progress = Math.min(1, step / totalSteps);
    const nextVol = Math.max(0, Math.min(1, safeFrom + (safeTo - safeFrom) * progress));
    try {
      audio.volume = nextVol;
    } catch {}

    if (step >= totalSteps) {
      clearInterval(timer);
      activeAudioFades.delete(audio);
      try {
        audio.volume = safeTo;
      } catch {}
      onDone?.();
    }
  }, stepMs);

  activeAudioFades.set(audio, () => {
    clearInterval(timer);
  });
}

function disposeAudioElement(audio: HTMLAudioElement | null | undefined): void {
  if (!audio) return;
  cancelAudioFade(audio);
  audioTargetVolumes.delete(audio);
  try {
    audio.onended = null;
    audio.onerror = null;
    audio.pause();
    audio.currentTime = 0;
    audio.src = '';
    if (typeof audio.removeAttribute === 'function') {
      audio.removeAttribute('src');
    }
    if (typeof audio.load === 'function') {
      audio.load();
    }
  } catch {}
}

// Audio Ducking Engine: Lưu trữ mức âm lượng trước khi hạ nhạc
const originalDuckedVolumes = new Map<string, number>();
let duckingTimer: ReturnType<typeof setTimeout> | null = null;
let restoreInterval: ReturnType<typeof setInterval> | null = null;
let isVoiceDucked = false;
const voiceDuckedOriginalVolumes = new Map<string, number>();

const SETTINGS_KEY = 'pomodoro_audio_settings_v1';
const TRACKS_CONFIG_KEY = 'pomodoro_audio_tracks_v1';
export const CUSTOM_MUSIC_KEY = 'pomodoro_custom_music_v1';

export interface CustomMusicItem {
  id: string;
  name: string;
  url: string;
  type: 'direct_audio' | 'youtube';
  createdAt: number;
}

const DEFAULT_MUSIC_ITEMS: CustomMusicItem[] = [
  {
    id: 'lofi_girl',
    name: 'Lofi Girl Live (Chill Study)',
    url: 'https://www.youtube.com/watch?v=rFZHOHl-L8A',
    type: 'youtube',
    createdAt: Date.now()
  },
  {
    id: 'synthwave',
    name: 'Synthwave Radio Live',
    url: 'https://www.youtube.com/watch?v=4xDzrJKXOOY',
    type: 'youtube',
    createdAt: Date.now()
  },
  {
    id: 'coffee_jazz',
    name: 'Coffee Shop Lofi Vibes',
    url: 'https://www.youtube.com/watch?v=h2zkV-l_TbY',
    type: 'youtube',
    createdAt: Date.now()
  },
  {
    id: 'kalimba_mp3',
    name: 'Giai Điệu Kalimba Thư Giãn (MP3 Trực Tiếp)',
    url: 'https://www.learningcontainer.com/wp-content/uploads/2020/02/Kalimba.mp3',
    type: 'direct_audio',
    createdAt: Date.now()
  }
];

function loadSavedCustomMusic(): {
  url: string;
  type: 'direct_audio' | 'youtube';
  volume: number;
  list: CustomMusicItem[];
} {
  if (typeof window === 'undefined' || !window.localStorage) {
    return {
      url: '',
      type: 'youtube',
      volume: 0.8,
      list: DEFAULT_MUSIC_ITEMS
    };
  }
  try {
    const raw = localStorage.getItem(CUSTOM_MUSIC_KEY);
    const legacyUrl = localStorage.getItem('pomodoro_lofi_stream_url') || '';
    if (!raw) {
      return {
        url: legacyUrl,
        type: legacyUrl.includes('youtube') || legacyUrl.includes('youtu.be') ? 'youtube' : 'direct_audio',
        volume: 0.8,
        list: DEFAULT_MUSIC_ITEMS
      };
    }
    const parsed = JSON.parse(raw);
    return {
      url: typeof parsed.url === 'string' ? parsed.url : legacyUrl,
      type: parsed.type === 'direct_audio' || parsed.type === 'youtube' ? parsed.type : 'youtube',
      volume: typeof parsed.volume === 'number' ? Math.max(0, Math.min(1, parsed.volume)) : 0.8,
      list: Array.isArray(parsed.list) && parsed.list.length > 0 ? parsed.list : DEFAULT_MUSIC_ITEMS
    };
  } catch {
    return {
      url: '',
      type: 'youtube',
      volume: 0.8,
      list: DEFAULT_MUSIC_ITEMS
    };
  }
}

function persistCustomMusic(data: {
  url: string;
  type: 'direct_audio' | 'youtube';
  volume: number;
  list: CustomMusicItem[];
}): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.setItem(CUSTOM_MUSIC_KEY, JSON.stringify(data));
    if (data.url) {
      localStorage.setItem('pomodoro_lofi_stream_url', data.url);
    }
  } catch {
    // Ignore
  }
}

export const DEFAULT_SETTINGS: AudioSettings = {
  masterVolume: 0.8,
  isMuted: false,
  selectedChime: 'twinkle',
  chimeVolume: 0.8,
};

export const INITIAL_TRACKS: AmbientTrackConfig[] = ALL_AMBIENT_TRACKS;

function loadSavedSettings(): AudioSettings {
  if (typeof window === 'undefined' || !window.localStorage) return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY) || localStorage.getItem('pomodoro_audio_settings');
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      masterVolume: typeof parsed.masterVolume === 'number' ? Math.max(0, Math.min(1, parsed.masterVolume)) : DEFAULT_SETTINGS.masterVolume,
      isMuted: typeof parsed.isMuted === 'boolean' ? parsed.isMuted : DEFAULT_SETTINGS.isMuted,
      selectedChime: parsed.selectedChime || DEFAULT_SETTINGS.selectedChime,
      chimeVolume: typeof parsed.chimeVolume === 'number' ? Math.max(0, Math.min(1, parsed.chimeVolume)) : DEFAULT_SETTINGS.chimeVolume,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function loadSavedTrackVolumes(): Record<string, number> {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    const raw = localStorage.getItem(TRACKS_CONFIG_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function persistSettings(settings: AudioSettings): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    localStorage.setItem('pomodoro_audio_settings', JSON.stringify(settings));
  } catch {
    // Ignore quota issues
  }
}

function persistTrackVolumes(tracks: AmbientTrackConfig[]): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const volumes: Record<string, number> = {};
    for (const t of tracks) {
      volumes[t.id] = t.volume;
    }
    localStorage.setItem(TRACKS_CONFIG_KEY, JSON.stringify(volumes));
  } catch {
    // Ignore
  }
}

export interface AudioState {
  settings: AudioSettings;
  tracks: AmbientTrackConfig[];
  isAudioBlocked: boolean;
  activeTab: 'chime' | 'ambient' | 'music';

  // Custom Music / Radio stream
  customMusicUrl: string;
  customMusicType: 'direct_audio' | 'youtube';
  customMusicPlaying: boolean;
  customMusicVolume: number;
  customMusicError: string | null;
  customMusicList: CustomMusicItem[];

  // Actions
  setActiveTab: (tab: 'chime' | 'ambient' | 'music') => void;
  setMasterVolume: (vol: number) => void;
  toggleMasterMute: () => void;
  setSelectedChime: (chime: ChimeSoundType) => void;
  setChimeVolume: (vol: number) => void;
  applyAudioDucking: () => void;
  restoreAudioDucking: () => void;
  duckForVoice: (active: boolean) => void;
  previewChime: (chime?: ChimeSoundType) => Promise<void>;
  playChime: (chime?: ChimeSoundType) => Promise<void>;
  stopChime: () => void;
  toggleTrack: (id: AmbientTrackId) => Promise<void>;
  setTrackVolume: (id: AmbientTrackId, vol: number) => void;
  stopAllTracks: () => void;
  resumeAudioContext: () => Promise<boolean>;
  resetToDefaults: () => void;

  setCustomMusicUrl: (url: string, type?: 'direct_audio' | 'youtube') => void;
  syncCustomMusicFromCloud: (userId?: string) => Promise<void>;
  setCustomMusicPlaying: (playing: boolean) => void;
  setCustomMusicVolume: (volume: number) => void;
  setCustomMusicError: (error: string | null) => void;
  addCustomMusicToList: (name: string, url: string, type: 'direct_audio' | 'youtube') => void;
  removeCustomMusicFromList: (id: string) => void;
}

let currentChimeAudio: HTMLAudioElement | null = null;
let chimeRequestSeq = 0;

function haltCurrentChimePlayback(): void {
  if (currentChimeAudio) {
    const audio = currentChimeAudio;
    currentChimeAudio = null;
    disposeAudioElement(audio);
  }
  ChimeSynthesizer.getInstance().stopCurrentChime();
}

export function stopChimeSound(): void {
  chimeRequestSeq += 1;
  haltCurrentChimePlayback();
}

async function playAlarmChimeSound(
  type: ChimeSoundType,
  volume = 0.8,
  reqSeq?: number
): Promise<void> {
  const activeSeq =
    reqSeq ??
    (() => {
      chimeRequestSeq += 1;
      return chimeRequestSeq;
    })();

  // Dừng ngay lập tức âm thanh chuông đang phát dở (chống chồng tiếng khi bấm nghe thử liên tiếp)
  haltCurrentChimePlayback();

  const chimeConfig = ALARM_CHIMES.find((c) => c.id === type);
  const safeVol = Math.max(0, Math.min(1, volume));
  if (chimeConfig?.url && typeof window !== 'undefined' && typeof Audio !== 'undefined') {
    try {
      const audio = new Audio(chimeConfig.url);
      currentChimeAudio = audio;
      audio.volume = safeVol;
      audio.onended = () => {
        if (currentChimeAudio === audio) {
          currentChimeAudio = null;
        }
        disposeAudioElement(audio);
      };
      audio.onerror = () => {
        if (currentChimeAudio === audio) {
          currentChimeAudio = null;
        }
        disposeAudioElement(audio);
      };
      const playPromise = audio.play();
      if (playPromise !== undefined && typeof playPromise.catch === 'function') {
        let fallbackTriggered = false;
        await playPromise.catch((e) => {
          fallbackTriggered = true;
          if (currentChimeAudio === audio) {
            currentChimeAudio = null;
          }
          disposeAudioElement(audio);
          if (activeSeq !== chimeRequestSeq) return;
          console.debug('[useAudioStore] CDN chime fallback to synth:', e);
          return ChimeSynthesizer.getInstance().playChime(type, safeVol);
        });
        if (!fallbackTriggered && activeSeq !== chimeRequestSeq) {
          if (currentChimeAudio === audio) {
            currentChimeAudio = null;
          }
          disposeAudioElement(audio);
          return;
        }
      }
      return;
    } catch (e) {
      console.debug('[useAudioStore] Audio constructor error, fallback to synth:', e);
    }
  }
  if (activeSeq !== chimeRequestSeq) return;
  // Fallback Web Audio synthesis (offline / headless)
  await ChimeSynthesizer.getInstance().playChime(type, safeVol);
}

export const useAudioStore = create<AudioState>((set, get) => {
  const initialSettings = loadSavedSettings();
  const savedVolumes = loadSavedTrackVolumes();
  const initialCustomMusic = loadSavedCustomMusic();
  const audioMgr = AudioContextManager.getInstance();
  const ambientSynth = AmbientSynthesizer.getInstance();

  audioMgr.setMasterVolume(initialSettings.masterVolume, initialSettings.isMuted);

  const initialTracks = INITIAL_TRACKS.map((t) => ({
    ...t,
    volume: typeof savedVolumes[t.id] === 'number' ? savedVolumes[t.id] : t.volume,
    isPlaying: false,
  }));

  return {
    settings: initialSettings,
    tracks: initialTracks,
    isAudioBlocked: false,
    activeTab: 'chime',

    // Custom Music State
    customMusicUrl: initialCustomMusic.url,
    customMusicType: initialCustomMusic.type,
    customMusicPlaying: false,
    customMusicVolume: initialCustomMusic.volume,
    customMusicError: null,
    customMusicList: initialCustomMusic.list,

    setActiveTab: (tab: 'chime' | 'ambient' | 'music') => set({ activeTab: tab }),

    setCustomMusicUrl: (url: string, type?: 'direct_audio' | 'youtube') => {
      const detectedType = type || (url.includes('youtube.com') || url.includes('youtu.be') ? 'youtube' : 'direct_audio');
      set({ customMusicUrl: url, customMusicType: detectedType, customMusicError: null });
      persistCustomMusic({
        url,
        type: detectedType,
        volume: get().customMusicVolume,
        list: get().customMusicList
      });

      // Đồng bộ trường custom_playlist_url lên bảng public.profiles trên Supabase Cloud
      if (typeof window !== 'undefined') {
        try {
          const rawSession = localStorage.getItem('pomodoro_study_auth_session');
          if (rawSession) {
            const user = JSON.parse(rawSession);
            if (user?.id) {
              import('../services/profileService').then(({ ProfileService }) => {
                ProfileService.updateFields(user.id, {
                  custom_playlist_url: url,
                  settings: {
                    ...(user.settings || {}),
                    custom_playlist_url: url
                  }
                }).catch(() => {});
              });
            }
          }
        } catch {}
      }
    },

    syncCustomMusicFromCloud: async (userId?: string) => {
      if (typeof window === 'undefined') return;
      try {
        let uid = userId;
        if (!uid) {
          const rawSession = localStorage.getItem('pomodoro_study_auth_session');
          if (rawSession) {
            const user = JSON.parse(rawSession);
            uid = user?.id;
          }
        }
        if (!uid) return;
        const { ProfileService } = await import('../services/profileService');
        const profile = await ProfileService.fetchProfile(uid);
        const cloudUrl = profile?.custom_playlist_url || profile?.settings?.custom_playlist_url;
        if (cloudUrl && typeof cloudUrl === 'string' && cloudUrl !== get().customMusicUrl) {
          get().setCustomMusicUrl(cloudUrl);
        }
      } catch (err) {
        console.debug('[useAudioStore] syncCustomMusicFromCloud error:', err);
      }
    },

    setCustomMusicPlaying: (playing: boolean) => set({ customMusicPlaying: playing }),

    setCustomMusicVolume: (volume: number) => {
      const safe = Math.max(0, Math.min(1, volume));
      set({ customMusicVolume: safe });
      persistCustomMusic({
        url: get().customMusicUrl,
        type: get().customMusicType,
        volume: safe,
        list: get().customMusicList
      });
    },

    setCustomMusicError: (error: string | null) => set({ customMusicError: error }),

    addCustomMusicToList: (name: string, url: string, type: 'direct_audio' | 'youtube') => {
      const newItem: CustomMusicItem = {
        id: `music-${Date.now()}`,
        name: name.trim() || 'Kênh nhạc tùy chỉnh',
        url: url.trim(),
        type,
        createdAt: Date.now()
      };
      const updated = [newItem, ...get().customMusicList.filter((m) => m.url !== url.trim())];
      set({ customMusicList: updated });
      persistCustomMusic({
        url: get().customMusicUrl,
        type: get().customMusicType,
        volume: get().customMusicVolume,
        list: updated
      });
    },

    removeCustomMusicFromList: (id: string) => {
      const updated = get().customMusicList.filter((m) => m.id !== id);
      set({ customMusicList: updated });
      persistCustomMusic({
        url: get().customMusicUrl,
        type: get().customMusicType,
        volume: get().customMusicVolume,
        list: updated
      });
    },

    setMasterVolume: (vol: number) => {
      const safe = Math.max(0, Math.min(1, vol));
      set((state) => {
        const nextSettings = { ...state.settings, masterVolume: safe, isMuted: false };
        audioMgr.setMasterVolume(safe, false);

        // Cập nhật âm lượng mượt mà thời gian thực cho tất cả HTMLAudioElement đang chạy
        activeAudioElements.forEach((audio, trackId) => {
          cancelAudioFade(audio);
          const tr = state.tracks.find((t) => t.id === trackId);
          const trackVol = tr ? tr.volume : 0.5;
          const effectiveVol = Math.max(0, Math.min(1, trackVol * safe));
          audioTargetVolumes.set(audio, effectiveVol);
          if (originalDuckedVolumes.has(trackId)) {
            originalDuckedVolumes.set(trackId, effectiveVol);
          }
          if (voiceDuckedOriginalVolumes.has(trackId)) {
            voiceDuckedOriginalVolumes.set(trackId, effectiveVol);
          }
          const duckFactor = isVoiceDucked
            ? 0.2
            : originalDuckedVolumes.has(trackId)
            ? 0.15
            : 1;
          try {
            audio.volume = Math.max(0, Math.min(1, effectiveVol * duckFactor));
          } catch {}
        });

        persistSettings(nextSettings);
        return { settings: nextSettings };
      });
    },

    toggleMasterMute: () => {
      set((state) => {
        const nextMuted = !state.settings.isMuted;
        const nextSettings = { ...state.settings, isMuted: nextMuted };
        audioMgr.setMasterVolume(nextSettings.masterVolume, nextMuted);

        // Mute / Unmute tức thời cho các track HTMLAudioElement
        activeAudioElements.forEach((audio, trackId) => {
          cancelAudioFade(audio);
          try {
            if (nextMuted) {
              audioTargetVolumes.set(audio, 0);
              audio.volume = 0;
            } else {
              const tr = state.tracks.find((t) => t.id === trackId);
              const trackVol = tr ? tr.volume : 0.5;
              const effectiveVol = Math.max(0, Math.min(1, trackVol * nextSettings.masterVolume));
              audioTargetVolumes.set(audio, effectiveVol);
              if (originalDuckedVolumes.has(trackId)) {
                originalDuckedVolumes.set(trackId, effectiveVol);
              }
              if (voiceDuckedOriginalVolumes.has(trackId)) {
                voiceDuckedOriginalVolumes.set(trackId, effectiveVol);
              }
              const duckFactor = isVoiceDucked
                ? 0.2
                : originalDuckedVolumes.has(trackId)
                ? 0.15
                : 1;
              audio.volume = Math.max(0, Math.min(1, effectiveVol * duckFactor));
            }
          } catch {}
        });

        persistSettings(nextSettings);
        return { settings: nextSettings };
      });
    },

    setSelectedChime: (chime: ChimeSoundType) => {
      set((state) => {
        const nextSettings = { ...state.settings, selectedChime: chime };
        persistSettings(nextSettings);
        return { settings: nextSettings };
      });
    },

    setChimeVolume: (vol: number) => {
      const safe = Math.max(0, Math.min(1, vol));
      set((state) => {
        const nextSettings = { ...state.settings, chimeVolume: safe };
        persistSettings(nextSettings);
        return { settings: nextSettings };
      });
    },

    applyAudioDucking: () => {
      if (duckingTimer) {
        clearTimeout(duckingTimer);
        duckingTimer = null;
      }
      if (restoreInterval) {
        clearInterval(restoreInterval);
        restoreInterval = null;
      }

      // 1. Hạ âm lượng toàn bộ ambient HTMLAudioElements xuống 15% mượt mà
      activeAudioElements.forEach((audio, id) => {
        if (!originalDuckedVolumes.has(id)) {
          const baseVol = audioTargetVolumes.get(audio) ?? audio.volume;
          originalDuckedVolumes.set(id, baseVol);
        }
        const orig = originalDuckedVolumes.get(id)!;
        fadeAudioElement(audio, audio.volume, orig * 0.15, 120);
      });

      // 2. Hạ âm lượng Web Audio synth qua Ambient Bus (chime và masterGain không bị ảnh hưởng)
      const audioMgr = AudioContextManager.getInstance();
      const ambientBus = audioMgr.getAmbientBusGain() || audioMgr.getMasterGain();
      if (ambientBus) {
        try {
          const ctx = audioMgr.getContext();
          if (ctx && ctx.state !== 'closed') {
            ambientBus.gain.cancelScheduledValues(ctx.currentTime);
            ambientBus.gain.setValueAtTime(ambientBus.gain.value, ctx.currentTime);
            ambientBus.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.12);
          }
        } catch {}
      }

      // 3. Hạ âm lượng YouTube nếu đang phát
      try {
        const yt = (window as any).__pomoYoutubePlayer;
        if (yt && typeof yt.getVolume === 'function' && typeof yt.setVolume === 'function') {
          if ((window as any).__pomoYtOriginalVol === undefined) {
            (window as any).__pomoYtOriginalVol = yt.getVolume();
          }
          yt.setVolume(Math.round((window as any).__pomoYtOriginalVol * 0.15));
        }
      } catch {}

      // Tự động khôi phục âm lượng sau 2.5s
      duckingTimer = setTimeout(() => {
        duckingTimer = null;
        get().restoreAudioDucking();
      }, 2500);
    },

    restoreAudioDucking: () => {
      if (restoreInterval) {
        clearInterval(restoreInterval);
        restoreInterval = null;
      }

      // Khôi phục Web Audio Ambient Bus bằng một ramp liên tục mượt mà
      const audioMgr = AudioContextManager.getInstance();
      const ambientBus = audioMgr.getAmbientBusGain() || audioMgr.getMasterGain();
      if (ambientBus) {
        try {
          const ctx = audioMgr.getContext();
          if (ctx && ctx.state !== 'closed') {
            ambientBus.gain.cancelScheduledValues(ctx.currentTime);
            ambientBus.gain.setValueAtTime(ambientBus.gain.value, ctx.currentTime);
            ambientBus.gain.linearRampToValueAtTime(1.0, ctx.currentTime + 0.5);
          }
        } catch {}
      }

      // Khôi phục mượt mà cho các HTMLAudioElement đã bị duck
      activeAudioElements.forEach((audio, id) => {
        const orig = originalDuckedVolumes.get(id);
        if (orig !== undefined) {
          const targetVol = isVoiceDucked ? orig * 0.2 : orig;
          fadeAudioElement(audio, audio.volume, targetVol, 500);
        }
      });

      const steps = 10;
      const intervalMs = 50; // 10 * 50ms = 500ms
      let currentStep = 0;

      restoreInterval = setInterval(() => {
        currentStep++;
        const factor = 0.15 + 0.85 * (currentStep / steps);

        try {
          const yt = (window as any).__pomoYoutubePlayer;
          const origYt = (window as any).__pomoYtOriginalVol;
          if (yt && origYt !== undefined && typeof yt.setVolume === 'function') {
            yt.setVolume(Math.round(origYt * factor));
          }
        } catch {}

        if (currentStep >= steps) {
          if (restoreInterval) {
            clearInterval(restoreInterval);
            restoreInterval = null;
          }
          originalDuckedVolumes.clear();
          delete (window as any).__pomoYtOriginalVol;
        }
      }, intervalMs);
    },

    duckForVoice: (active: boolean) => {
      const audioMgr = AudioContextManager.getInstance();
      const ambientBus = audioMgr.getAmbientBusGain() || audioMgr.getMasterGain();
      const ctx = audioMgr.getContext();

      if (active) {
        if (isVoiceDucked) return;
        isVoiceDucked = true;

        activeAudioElements.forEach((audio, id) => {
          if (!voiceDuckedOriginalVolumes.has(id)) {
            const baseVol = audioTargetVolumes.get(audio) ?? audio.volume;
            voiceDuckedOriginalVolumes.set(id, baseVol);
          }
          const orig = voiceDuckedOriginalVolumes.get(id)!;
          fadeAudioElement(audio, audio.volume, orig * 0.2, 150);
        });

        if (ambientBus && ctx && ctx.state !== 'closed') {
          try {
            ambientBus.gain.cancelScheduledValues(ctx.currentTime);
            ambientBus.gain.setValueAtTime(ambientBus.gain.value, ctx.currentTime);
            ambientBus.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.15);
          } catch {}
        }

        try {
          const yt = (window as any).__pomoYoutubePlayer;
          if (yt && typeof yt.getVolume === 'function' && typeof yt.setVolume === 'function') {
            if ((window as any).__pomoYtVoiceVol === undefined) {
              (window as any).__pomoYtVoiceVol = yt.getVolume();
            }
            yt.setVolume(Math.round((window as any).__pomoYtVoiceVol * 0.2));
          }
        } catch {}
      } else {
        if (!isVoiceDucked) return;
        isVoiceDucked = false;

        activeAudioElements.forEach((audio, id) => {
          const orig = voiceDuckedOriginalVolumes.get(id);
          if (orig !== undefined) {
            fadeAudioElement(audio, audio.volume, orig, 200);
          }
        });
        voiceDuckedOriginalVolumes.clear();

        if (ambientBus && ctx && ctx.state !== 'closed') {
          try {
            ambientBus.gain.cancelScheduledValues(ctx.currentTime);
            ambientBus.gain.setValueAtTime(ambientBus.gain.value, ctx.currentTime);
            ambientBus.gain.linearRampToValueAtTime(1.0, ctx.currentTime + 0.2);
          } catch {}
        }

        try {
          const yt = (window as any).__pomoYoutubePlayer;
          const origYt = (window as any).__pomoYtVoiceVol;
          if (yt && origYt !== undefined && typeof yt.setVolume === 'function') {
            yt.setVolume(origYt);
          }
          delete (window as any).__pomoYtVoiceVol;
        } catch {}
      }
    },

    stopChime: () => {
      stopChimeSound();
    },

    previewChime: async (chime?: ChimeSoundType) => {
      stopChimeSound();
      const seq = chimeRequestSeq;
      const targetChime = chime || get().settings.selectedChime;
      const vol = get().settings.chimeVolume;
      get().applyAudioDucking();
      // Chờ pre-duck ramp 120ms để nhạc nền hạ xuống êm ái trước khi phát chuông
      await new Promise((r) => setTimeout(r, 120));
      if (seq !== chimeRequestSeq) return;
      await playAlarmChimeSound(targetChime, vol, seq);
    },

    playChime: async (chime?: ChimeSoundType) => {
      const { settings } = get();
      if (settings.isMuted) return;
      stopChimeSound();
      const seq = chimeRequestSeq;
      const targetChime = chime || settings.selectedChime;
      get().applyAudioDucking();
      // Chờ pre-duck ramp 120ms để nhạc nền hạ xuống êm ái trước khi phát chuông
      await new Promise((r) => setTimeout(r, 120));
      if (seq !== chimeRequestSeq) return;
      await playAlarmChimeSound(targetChime, settings.chimeVolume, seq);
    },

    toggleTrack: async (id: AmbientTrackId) => {
      const track = get().tracks.find((t) => t.id === id);
      if (!track) return;

      const gen = (toggleTrackGeneration.get(id) ?? 0) + 1;
      toggleTrackGeneration.set(id, gen);

      const nextPlaying = !track.isPlaying;

      // Cập nhật trạng thái tức thời (optimistic update) ngăn chặn click lặp gây race condition
      set((state) => ({
        tracks: state.tracks.map((t) =>
          t.id === id ? { ...t, isPlaying: nextPlaying } : t
        ),
      }));

      if (nextPlaying) {
        const pendingAudio = pendingDisposeAudios.get(id);
        if (pendingAudio) {
          pendingDisposeAudios.delete(id);
          disposeAudioElement(pendingAudio);
        }

        if (track.url && typeof window !== 'undefined' && typeof Audio !== 'undefined') {
          try {
            let audio = activeAudioElements.get(id);
            if (!audio) {
              audio = new Audio(track.url);
              audio.loop = true;
              // TUYỆT ĐỐI KHÔNG GÁN crossOrigin = 'anonymous' để tránh bị chặn CORS từ CDN audio ngoài
              activeAudioElements.set(id, audio);
            }
            audio.volume = 0;
            const playPromise = audio.play();
            if (playPromise !== undefined && typeof playPromise.catch === 'function') {
              await playPromise.catch((err) => {
                console.debug(`[useAudioStore] Audio play caught for ${id}:`, err);
              });
            }

            if (toggleTrackGeneration.get(id) !== gen) {
              if (activeAudioElements.get(id) === audio) {
                activeAudioElements.delete(id);
              }
              disposeAudioElement(audio);
              return;
            }

            const latestSettings = get().settings;
            const latestTrack = get().tracks.find((t) => t.id === id);
            const latestEffectiveVol = latestSettings.isMuted
              ? 0
              : Math.max(0, Math.min(1, (latestTrack?.volume ?? track.volume) * latestSettings.masterVolume));

            let targetVol = latestEffectiveVol;
            if (isVoiceDucked) {
              voiceDuckedOriginalVolumes.set(id, latestEffectiveVol);
              targetVol = latestEffectiveVol * 0.2;
            } else if (originalDuckedVolumes.size > 0) {
              originalDuckedVolumes.set(id, latestEffectiveVol);
              targetVol = latestEffectiveVol * 0.15;
            }
            fadeAudioElement(audio, 0, targetVol, 220);
          } catch (err) {
            console.debug(`[useAudioStore] Audio initialization error for ${id}:`, err);
          }
        } else {
          // Tổng hợp âm thanh bằng Web Audio API (Noise Pink/Brown/Blue & Binaural Beats)
          const resumed = await audioMgr.ensureResumed();
          if (toggleTrackGeneration.get(id) !== gen) return;
          if (!resumed && !audioMgr.isRunning()) {
            set({ isAudioBlocked: true });
          } else {
            set({ isAudioBlocked: false });
          }
          await ambientSynth.playTrack(id, track.volume);
          if (toggleTrackGeneration.get(id) !== gen) {
            const latestTrack = get().tracks.find((t) => t.id === id);
            if (!latestTrack?.isPlaying) {
              ambientSynth.stopTrack(id);
            }
          }
        }
      } else {
        // Dừng HTMLAudioElement nếu đang chạy với fade-out mượt mà & giải phóng PCM
        originalDuckedVolumes.delete(id);
        voiceDuckedOriginalVolumes.delete(id);

        const audio = activeAudioElements.get(id);
        if (audio) {
          activeAudioElements.delete(id);
          cancelAudioFade(audio);
          if (audio.volume > 0.01) {
            pendingDisposeAudios.set(id, audio);
            fadeAudioElement(audio, audio.volume, 0, 160, () => {
              if (pendingDisposeAudios.get(id) === audio) {
                pendingDisposeAudios.delete(id);
              }
              disposeAudioElement(audio);
            });
          } else {
            disposeAudioElement(audio);
          }
        }
        // Dừng synthesizer nếu đang phát
        ambientSynth.stopTrack(id);
      }
    },

    setTrackVolume: (id: AmbientTrackId, vol: number) => {
      const safe = Math.max(0, Math.min(1, vol));

      // 1. Cập nhật HTMLAudioElement theo thời gian thực
      const audio = activeAudioElements.get(id);
      if (audio) {
        cancelAudioFade(audio);
        const currentSettings = get().settings;
        const effectiveVol = currentSettings.isMuted
          ? 0
          : Math.max(0, Math.min(1, safe * currentSettings.masterVolume));
        audioTargetVolumes.set(audio, effectiveVol);
        if (originalDuckedVolumes.has(id)) {
          originalDuckedVolumes.set(id, effectiveVol);
        }
        if (voiceDuckedOriginalVolumes.has(id)) {
          voiceDuckedOriginalVolumes.set(id, effectiveVol);
        }
        const duckFactor = isVoiceDucked
          ? 0.2
          : originalDuckedVolumes.has(id)
          ? 0.15
          : 1;
        try {
          audio.volume = Math.max(0, Math.min(1, effectiveVol * duckFactor));
        } catch {}
      }

      // 2. Cập nhật Web Audio API synthesizer
      ambientSynth.setTrackVolume(id, safe);

      set((state) => {
        const nextTracks = state.tracks.map((t) =>
          t.id === id ? { ...t, volume: safe } : t
        );
        persistTrackVolumes(nextTracks);
        return { tracks: nextTracks };
      });
    },

    stopAllTracks: () => {
      if (duckingTimer) {
        clearTimeout(duckingTimer);
        duckingTimer = null;
      }
      if (restoreInterval) {
        clearInterval(restoreInterval);
        restoreInterval = null;
      }
      originalDuckedVolumes.clear();
      voiceDuckedOriginalVolumes.clear();
      isVoiceDucked = false;

      for (const t of get().tracks) {
        toggleTrackGeneration.set(t.id, (toggleTrackGeneration.get(t.id) ?? 0) + 1);
      }

      activeAudioElements.forEach((audio) => {
        disposeAudioElement(audio);
      });
      activeAudioElements.clear();

      pendingDisposeAudios.forEach((audio) => {
        disposeAudioElement(audio);
      });
      pendingDisposeAudios.clear();

      ambientSynth.stopAll();
      stopChimeSound();

      set((state) => ({
        tracks: state.tracks.map((t) => ({ ...t, isPlaying: false })),
      }));
    },

    resumeAudioContext: async () => {
      const ok = await audioMgr.ensureResumed();
      set({ isAudioBlocked: !ok });
      return ok;
    },

    resetToDefaults: () => {
      if (duckingTimer) {
        clearTimeout(duckingTimer);
        duckingTimer = null;
      }
      if (restoreInterval) {
        clearInterval(restoreInterval);
        restoreInterval = null;
      }
      originalDuckedVolumes.clear();
      voiceDuckedOriginalVolumes.clear();
      isVoiceDucked = false;

      for (const t of get().tracks) {
        toggleTrackGeneration.set(t.id, (toggleTrackGeneration.get(t.id) ?? 0) + 1);
      }

      activeAudioElements.forEach((audio) => {
        disposeAudioElement(audio);
      });
      activeAudioElements.clear();

      pendingDisposeAudios.forEach((audio) => {
        disposeAudioElement(audio);
      });
      pendingDisposeAudios.clear();

      ambientSynth.stopAll();
      stopChimeSound();

      audioMgr.setMasterVolume(DEFAULT_SETTINGS.masterVolume, DEFAULT_SETTINGS.isMuted);
      persistSettings(DEFAULT_SETTINGS);
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(TRACKS_CONFIG_KEY);
      }
      set({
        settings: DEFAULT_SETTINGS,
        tracks: INITIAL_TRACKS.map((t) => ({ ...t, isPlaying: false })),
        isAudioBlocked: false,
        activeTab: 'chime',
      });
    },
  };
});

// Tự động ngắt âm thanh khi rút tai nghe hoặc ngắt kết nối Bluetooth để bảo vệ thính giác và tránh phát loa ngoài nơi công cộng
if (
  typeof navigator !== 'undefined' &&
  navigator.mediaDevices &&
  typeof navigator.mediaDevices.addEventListener === 'function'
) {
  let knownOutputIds: string[] = [];

  const updateKnownOutputs = async () => {
    try {
      if (typeof navigator.mediaDevices.enumerateDevices === 'function') {
        const devices = await navigator.mediaDevices.enumerateDevices();
        knownOutputIds = devices.filter((d) => d.kind === 'audiooutput').map((d) => d.deviceId);
      }
    } catch {}
  };

  updateKnownOutputs();

  navigator.mediaDevices.addEventListener('devicechange', async () => {
    try {
      if (typeof navigator.mediaDevices.enumerateDevices === 'function') {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const currentOutputs = devices.filter((d) => d.kind === 'audiooutput').map((d) => d.deviceId);

        // Phát hiện mất thiết bị đầu ra (Bluetooth ngắt hoặc rút giắc tai nghe)
        const hasLostDevice =
          knownOutputIds.length > 0 &&
          (currentOutputs.length < knownOutputIds.length ||
            knownOutputIds.some((id) => id && !currentOutputs.includes(id)));

        knownOutputIds = currentOutputs;

        if (hasLostDevice) {
          console.log('[useAudioStore] Audio output device disconnected (Bluetooth / Jack unplugged) -> Auto-stopping playback');
          const store = useAudioStore.getState();
          store.stopAllTracks();
          if (store.customMusicPlaying) {
            store.setCustomMusicPlaying(false);
          }
        }
      }
    } catch (e) {
      console.debug('[useAudioStore] devicechange handler error:', e);
    }
  });
}

if (typeof window !== 'undefined') {
  (window as unknown as { useAudioStore: typeof useAudioStore }).useAudioStore = useAudioStore;
}
