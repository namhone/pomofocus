export type ChimeSoundType =
  | 'twinkle'
  | 'playtime'
  | 'scifi'
  | 'slow_rise'
  | 'rooster'
  | 'bird';

export type BuiltinNoiseType = 'white' | 'pink' | 'brown' | 'blue';

export type BinauralWaveType = 'alpha' | 'beta' | 'gamma' | 'theta' | 'delta';

export type AmbientTrackId =
  // Nature (7)
  | 'rain'
  | 'ocean_waves'
  | 'stream'
  | 'forest_birds'
  | 'campfire'
  | 'forest_wind'
  | 'summer_crickets'
  // Life & Urban Ambience (10)
  | 'cafe'
  | 'keyboard'
  | 'fan'
  | 'clock'
  | 'train'
  | 'rain_window'
  | 'thunder'
  | 'library_pages'
  | 'wind_chimes'
  | 'coastal_breeze'
  // Scientific Colored Noises (4)
  | 'noise_white'
  | 'noise_pink'
  | 'noise_brown'
  | 'noise_blue'
  // Binaural Brainwaves (4 + legacy gamma)
  | 'binaural_alpha'
  | 'binaural_beta'
  | 'binaural_gamma'
  | 'binaural_theta'
  | 'binaural_delta';

export type AmbientCategory = 'nature' | 'life' | 'binaural' | 'noise';

export interface AmbientTrackConfig {
  id: AmbientTrackId;
  name: string;
  category: AmbientCategory;
  volume: number; // 0..1
  isPlaying: boolean;
  isMuted: boolean;
  url?: string;
  binauralBeatHz?: number;
  badge?: string;
  description?: string;
}

export interface AudioSettings {
  masterVolume: number; // 0..1
  isMuted: boolean;
  selectedChime: ChimeSoundType;
  chimeVolume: number; // 0..1
}
