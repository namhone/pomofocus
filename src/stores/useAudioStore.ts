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

const SETTINGS_KEY = 'pomodoro_audio_settings_v1';
const TRACKS_CONFIG_KEY = 'pomodoro_audio_tracks_v1';

export const DEFAULT_SETTINGS: AudioSettings = {
  masterVolume: 0.8,
  isMuted: false,
  selectedChime: 'twinkle',
  chimeVolume: 0.8,
};

export const INITIAL_TRACKS: AmbientTrackConfig[] = [
  {
    id: 'rain',
    name: 'Mưa Rào',
    category: 'nature',
    volume: 0.5,
    isPlaying: false,
    isMuted: false,
    description: 'Tiếng mưa rơi đều đặn xoa dịu tâm trí',
  },
  {
    id: 'ocean_waves',
    name: 'Sóng Biển',
    category: 'nature',
    volume: 0.5,
    isPlaying: false,
    isMuted: false,
    description: 'Sóng biển dạt dào êm ả vỗ về từng đợt',
  },
  {
    id: 'cafe',
    name: 'Quán Cà Phê',
    category: 'life',
    volume: 0.4,
    isPlaying: false,
    isMuted: false,
    description: 'Không gian ấm cúng, êm đềm của quán quen',
  },
  {
    id: 'keyboard',
    name: 'Bàn Phím Cơ',
    category: 'life',
    volume: 0.35,
    isPlaying: false,
    isMuted: false,
    description: 'Tiếng gõ phím cơ nhịp nhàng tăng năng suất tập trung',
  },
  {
    id: 'stream',
    name: 'Suối Nước',
    category: 'nature',
    volume: 0.45,
    isPlaying: false,
    isMuted: false,
    description: 'Dòng suối êm ả róc rách qua ghềnh đá',
  },
  {
    id: 'campfire',
    name: 'Lửa Trại',
    category: 'nature',
    volume: 0.45,
    isPlaying: false,
    isMuted: false,
    description: 'Đốm lửa bập bùng lách tách ấm áp trong đêm',
  },
  {
    id: 'noise_white',
    name: 'White Noise',
    category: 'noise',
    volume: 0.4,
    isPlaying: false,
    isMuted: false,
    description: 'Tiếng ồn trắng triệt tiêu tiếng ồn môi trường',
  },
  {
    id: 'noise_pink',
    name: 'Pink Noise',
    category: 'noise',
    volume: 0.5,
    isPlaying: false,
    isMuted: false,
    description: 'Tiếng ồn hồng êm dịu, giảm căng thẳng não bộ',
  },
  {
    id: 'noise_brown',
    name: 'Brown Noise',
    category: 'noise',
    volume: 0.5,
    isPlaying: false,
    isMuted: false,
    description: 'Tiếng ồn nâu trầm ấm, thư giãn sâu',
  },
  {
    id: 'binaural_alpha',
    name: 'Sóng Alpha (10Hz)',
    category: 'binaural',
    volume: 0.35,
    isPlaying: false,
    isMuted: false,
    binauralBeatHz: 10,
    description: 'Âm thanh mô phỏng nhịp hai tai hỗ trợ thư giãn, tỉnh táo',
  },
  {
    id: 'binaural_beta',
    name: 'Sóng Beta (18Hz)',
    category: 'binaural',
    volume: 0.35,
    isPlaying: false,
    isMuted: false,
    binauralBeatHz: 18,
    description: 'Âm thanh mô phỏng nhịp hai tai hỗ trợ tư duy, phân tích',
  },
  {
    id: 'binaural_gamma',
    name: 'Sóng Gamma (40Hz)',
    category: 'binaural',
    volume: 0.3,
    isPlaying: false,
    isMuted: false,
    binauralBeatHz: 40,
    description: 'Âm thanh mô phỏng nhịp hai tai hỗ trợ tập trung cao độ',
  },
  {
    id: 'binaural_theta',
    name: 'Sóng Theta (6Hz)',
    category: 'binaural',
    volume: 0.35,
    isPlaying: false,
    isMuted: false,
    binauralBeatHz: 6,
    description: 'Âm thanh mô phỏng nhịp hai tai hỗ trợ trực giác, sáng tạo',
  },
  {
    id: 'binaural_delta',
    name: 'Sóng Delta (2.5Hz)',
    category: 'binaural',
    volume: 0.35,
    isPlaying: false,
    isMuted: false,
    binauralBeatHz: 2.5,
    description: 'Âm thanh mô phỏng nhịp hai tai hỗ trợ nghỉ ngơi, phục hồi',
  },
];

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
  activeTab: 'chime' | 'ambient';

  // Actions
  setActiveTab: (tab: 'chime' | 'ambient') => void;
  setMasterVolume: (vol: number) => void;
  toggleMasterMute: () => void;
  setSelectedChime: (chime: ChimeSoundType) => void;
  setChimeVolume: (vol: number) => void;
  previewChime: (chime?: ChimeSoundType) => Promise<void>;
  playChime: (chime?: ChimeSoundType) => Promise<void>;
  toggleTrack: (id: AmbientTrackId) => Promise<void>;
  setTrackVolume: (id: AmbientTrackId, vol: number) => void;
  stopAllTracks: () => void;
  resumeAudioContext: () => Promise<boolean>;
  resetToDefaults: () => void;
}

export const useAudioStore = create<AudioState>((set, get) => {
  const initialSettings = loadSavedSettings();
  const savedVolumes = loadSavedTrackVolumes();
  const audioMgr = AudioContextManager.getInstance();
  const chimeSynth = ChimeSynthesizer.getInstance();
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

    setActiveTab: (tab: 'chime' | 'ambient') => set({ activeTab: tab }),

    setMasterVolume: (vol: number) => {
      const safe = Math.max(0, Math.min(1, vol));
      set((state) => {
        const nextSettings = { ...state.settings, masterVolume: safe, isMuted: false };
        audioMgr.setMasterVolume(safe, false);
        persistSettings(nextSettings);
        return { settings: nextSettings };
      });
    },

    toggleMasterMute: () => {
      set((state) => {
        const nextMuted = !state.settings.isMuted;
        const nextSettings = { ...state.settings, isMuted: nextMuted };
        audioMgr.setMasterVolume(nextSettings.masterVolume, nextMuted);
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

    previewChime: async (chime?: ChimeSoundType) => {
      const targetChime = chime || get().settings.selectedChime;
      const vol = get().settings.chimeVolume;
      await chimeSynth.previewChime(targetChime, vol);
    },

    playChime: async (chime?: ChimeSoundType) => {
      const { settings } = get();
      if (settings.isMuted) return;
      const targetChime = chime || settings.selectedChime;
      await chimeSynth.playChime(targetChime, settings.chimeVolume);
    },

    toggleTrack: async (id: AmbientTrackId) => {
      const tracks = get().tracks;
      const track = tracks.find((t) => t.id === id);
      if (!track) return;

      const nextPlaying = !track.isPlaying;

      if (nextPlaying) {
        const resumed = await audioMgr.ensureResumed();
        if (!resumed && !audioMgr.isRunning()) {
          set({ isAudioBlocked: true });
        } else {
          set({ isAudioBlocked: false });
        }
        await ambientSynth.playTrack(id, track.volume);
      } else {
        ambientSynth.stopTrack(id);
      }

      set((state) => ({
        tracks: state.tracks.map((t) =>
          t.id === id ? { ...t, isPlaying: nextPlaying } : t
        ),
      }));
    },

    setTrackVolume: (id: AmbientTrackId, vol: number) => {
      const safe = Math.max(0, Math.min(1, vol));
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
      ambientSynth.stopAll();
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
      ambientSynth.stopAll();
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
