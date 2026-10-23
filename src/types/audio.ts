export type ChimeSoundType =
  | 'twinkle'
  | 'playtime'
  | 'scifi'
  | 'slow_rise'
  | 'rooster'
  | 'bird';

export type BuiltinNoiseType = 'white' | 'pink' | 'brown';

export type BinauralWaveType = 'alpha' | 'beta' | 'gamma' | 'theta' | 'delta';

export type AmbientTrackId =
  | 'rain'
  | 'ocean_waves'
  | 'cafe'
  | 'keyboard'
  | 'stream'
  | 'campfire'
  | 'noise_white'
  | 'noise_pink'
  | 'noise_brown'
  | 'binaural_alpha'
  | 'binaural_beta'
  | 'binaural_gamma'
  | 'binaural_theta'
  | 'binaural_delta';

export interface AmbientTrackConfig {
  id: AmbientTrackId;
  name: string;
  category: 'nature' | 'life' | 'noise' | 'binaural';
  volume: number;     // 0..1
  isPlaying: boolean;
  isMuted: boolean;
  binauralBeatHz?: number;
  description?: string;
}

export interface AudioSettings {
  masterVolume: number; // 0..1
  isMuted: boolean;
  selectedChime: ChimeSoundType;
  chimeVolume: number;  // 0..1
}
