import { AmbientTrackConfig } from '../types/audio';

/**
 * 7 Âm Thanh Tự Nhiên (Nature Sounds)
 * Nguồn âm thanh chất lượng cao chính chủ từ Google Delight & Google Actions CDN
 */
export const NATURE_TRACKS: AmbientTrackConfig[] = [
  {
    id: 'rain',
    name: 'Mưa Rào',
    category: 'nature',
    url: 'https://www.gstatic.com/voice_delight/sounds/long/rain.mp3',
    volume: 0.5,
    isPlaying: false,
    isMuted: false,
    description: 'Tiếng mưa rơi đều đặn xoa dịu tâm trí'
  },
  {
    id: 'ocean_waves',
    name: 'Sóng Biển',
    category: 'nature',
    url: 'https://www.gstatic.com/voice_delight/sounds/long/ocean.mp3',
    volume: 0.5,
    isPlaying: false,
    isMuted: false,
    description: 'Sóng biển dạt dào êm ả vỗ về từng đợt'
  },
  {
    id: 'stream',
    name: 'Suối Nước',
    category: 'nature',
    url: 'https://www.gstatic.com/voice_delight/sounds/long/babbling_brook.mp3',
    volume: 0.45,
    isPlaying: false,
    isMuted: false,
    description: 'Dòng suối êm ả róc rách qua ghềnh đá'
  },
  {
    id: 'forest_birds',
    name: 'Rừng & Tiếng Chim',
    category: 'nature',
    url: 'https://www.gstatic.com/voice_delight/sounds/long/forest.mp3',
    volume: 0.45,
    isPlaying: false,
    isMuted: false,
    description: 'Tiếng chim hót rộn ràng giữa tán rừng nguyên sinh'
  },
  {
    id: 'campfire',
    name: 'Lửa Trại',
    category: 'nature',
    url: 'https://www.gstatic.com/voice_delight/sounds/long/fireplace.mp3',
    volume: 0.45,
    isPlaying: false,
    isMuted: false,
    description: 'Đốm lửa bập bùng lách tách ấm áp trong đêm'
  },
  {
    id: 'forest_wind',
    name: 'Gió Rừng Mùa Hè',
    category: 'nature',
    url: 'https://actions.google.com/sounds/v1/weather/forest_wind_summer.ogg',
    volume: 0.4,
    isPlaying: false,
    isMuted: false,
    description: 'Gió luồn qua kẽ lá hè mát mẻ, thanh lọc tinh thần'
  },
  {
    id: 'summer_crickets',
    name: 'Đêm Hè Tiếng Dế',
    category: 'nature',
    url: 'https://actions.google.com/sounds/v1/ambiences/outdoor_summer_ambience.ogg',
    volume: 0.4,
    isPlaying: false,
    isMuted: false,
    description: 'Âm vang tiếng dế đêm hè tĩnh lặng và thanh bình'
  }
];

/**
 * 10 Âm Thanh Cuộc Sống (Life & Urban Ambience)
 */
export const LIFE_TRACKS: AmbientTrackConfig[] = [
  {
    id: 'cafe',
    name: 'Quán Cà Phê',
    category: 'life',
    url: 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg',
    volume: 0.4,
    isPlaying: false,
    isMuted: false,
    description: 'Không gian ấm cúng, êm đềm của quán quen'
  },
  {
    id: 'keyboard',
    name: 'Bàn Phím Cơ',
    category: 'life',
    url: 'https://actions.google.com/sounds/v1/household/typewriter_fast.ogg',
    volume: 0.35,
    isPlaying: false,
    isMuted: false,
    description: 'Tiếng gõ phím cơ nhịp nhàng tăng năng suất tập trung'
  },
  {
    id: 'fan',
    name: 'Quạt Máy',
    category: 'life',
    url: 'https://actions.google.com/sounds/v1/household/fan_oscillating.ogg',
    volume: 0.4,
    isPlaying: false,
    isMuted: false,
    description: 'Quạt máy quay đều đặn mang lại luồng gió tập trung'
  },
  {
    id: 'clock',
    name: 'Đồng Hồ Tích Tắc',
    category: 'life',
    url: 'https://actions.google.com/sounds/v1/household/clock_ticking.ogg',
    volume: 0.35,
    isPlaying: false,
    isMuted: false,
    description: 'Tiếng tích tắc nhịp nhàng giữ nhịp làm việc sâu'
  },
  {
    id: 'train',
    name: 'Tàu Hỏa Lăn Bánh',
    category: 'life',
    url: 'https://actions.google.com/sounds/v1/transportation/steam_train_whistle_and_wheels.ogg',
    volume: 0.4,
    isPlaying: false,
    isMuted: false,
    description: 'Nhịp ray tàu chuyển bánh trên cung đường dài'
  },
  {
    id: 'rain_window',
    name: 'Mưa Trên Cửa Kính',
    category: 'life',
    url: 'https://actions.google.com/sounds/v1/weather/rain_heavy.ogg',
    volume: 0.45,
    isPlaying: false,
    isMuted: false,
    description: 'Hạt mưa táp vào khung kính tạo cảm giác an yên'
  },
  {
    id: 'thunder',
    name: 'Sấm Sét Xa Dịu',
    category: 'life',
    url: 'https://actions.google.com/sounds/v1/weather/thunder_crack_far.ogg',
    volume: 0.35,
    isPlaying: false,
    isMuted: false,
    description: 'Tiếng sấm vọng xa xôi hòa cùng nhịp mưa'
  },
  {
    id: 'library_pages',
    name: 'Lật Trang Sách Thư Viện',
    category: 'life',
    url: 'https://actions.google.com/sounds/v1/household/paper_rustling.ogg',
    volume: 0.35,
    isPlaying: false,
    isMuted: false,
    description: 'Tiếng lật từng trang giấy thơm mùi tri thức'
  },
  {
    id: 'wind_chimes',
    name: 'Chuông Gió Phong Linh',
    category: 'life',
    url: 'https://actions.google.com/sounds/v1/household/wind_chimes.ogg',
    volume: 0.35,
    isPlaying: false,
    isMuted: false,
    description: 'Giai điệu chuông gió thánh thót xoa dịu âu lo'
  },
  {
    id: 'coastal_breeze',
    name: 'Gió Thoảng Ven Biển',
    category: 'life',
    url: 'https://actions.google.com/sounds/v1/ambiences/crickets_with_distant_traffic.ogg',
    volume: 0.4,
    isPlaying: false,
    isMuted: false,
    description: 'Gió mát lành hòa cùng âm thanh tự nhiên bờ biển'
  }
];

/**
 * 4 Loại Tiếng Ồn Khoa Học (Scientific Colored Noises)
 */
export const NOISE_TRACKS: AmbientTrackConfig[] = [
  {
    id: 'noise_white',
    name: 'White Noise',
    category: 'noise',
    url: 'https://www.gstatic.com/voice_delight/sounds/long/white_noise.mp3',
    volume: 0.4,
    isPlaying: false,
    isMuted: false,
    badge: 'Đều mọi dải tần',
    description: 'Đều mọi dải tần, che tạp âm phòng học hiệu quả'
  },
  {
    id: 'noise_pink',
    name: 'Pink Noise',
    category: 'noise',
    volume: 0.45,
    isPlaying: false,
    isMuted: false,
    badge: '-3dB/octave',
    description: 'Giảm -3dB/octave, âm sắc cân bằng sinh học hỗ trợ ghi nhớ bài học lâu hơn'
  },
  {
    id: 'noise_brown',
    name: 'Brown Noise',
    category: 'noise',
    volume: 0.45,
    isPlaying: false,
    isMuted: false,
    badge: '-6dB Trầm ấm',
    description: 'Trầm ấm như thác nước sâu, chuẩn vàng giúp người học ADHD triệt tiêu xao nhãng'
  },
  {
    id: 'noise_blue',
    name: 'Blue Noise',
    category: 'noise',
    volume: 0.35,
    isPlaying: false,
    isMuted: false,
    badge: '+3dB Dải cao',
    description: 'Dải tần cao dịu, hỗ trợ chống buồn ngủ trong ca học khuya'
  }
];

/**
 * 4 Dải Sóng Não (Binaural Brainwaves) + 1 Legacy Gamma
 */
export const BINAURAL_TRACKS: AmbientTrackConfig[] = [
  {
    id: 'binaural_alpha',
    name: 'Sóng Alpha (10Hz)',
    category: 'binaural',
    volume: 0.35,
    isPlaying: false,
    isMuted: false,
    binauralBeatHz: 10,
    badge: '10Hz',
    description: 'Tập trung sâu & Giảm căng thẳng não bộ'
  },
  {
    id: 'binaural_beta',
    name: 'Sóng Beta (18Hz)',
    category: 'binaural',
    volume: 0.35,
    isPlaying: false,
    isMuted: false,
    binauralBeatHz: 18,
    badge: '18Hz',
    description: 'Tư duy phân tích, logic và tỉnh táo'
  },
  {
    id: 'binaural_theta',
    name: 'Sóng Theta (6Hz)',
    category: 'binaural',
    volume: 0.35,
    isPlaying: false,
    isMuted: false,
    binauralBeatHz: 6,
    badge: '6Hz',
    description: 'Kích thích sáng tạo & Trạng thái thiền định'
  },
  {
    id: 'binaural_delta',
    name: 'Sóng Delta (2Hz)',
    category: 'binaural',
    volume: 0.35,
    isPlaying: false,
    isMuted: false,
    binauralBeatHz: 2,
    badge: '2Hz',
    description: 'Thư giãn cơ thể, phục hồi năng lượng'
  },
  {
    id: 'binaural_gamma',
    name: 'Sóng Gamma (40Hz)',
    category: 'binaural',
    volume: 0.3,
    isPlaying: false,
    isMuted: false,
    binauralBeatHz: 40,
    badge: '40Hz',
    description: 'Âm thanh mô phỏng nhịp hai tai hỗ trợ tập trung cao độ'
  }
];

/**
 * Toàn bộ danh mục 25 âm thanh tập trung
 */
export const ALL_AMBIENT_TRACKS: AmbientTrackConfig[] = [
  ...NATURE_TRACKS,
  ...LIFE_TRACKS,
  ...BINAURAL_TRACKS,
  ...NOISE_TRACKS
];

export interface AmbientTabDefinition {
  id: 'nature' | 'life' | 'binaural' | 'noise' | 'all';
  label: string;
  count: number;
}

export const AMBIENT_TABS: AmbientTabDefinition[] = [
  { id: 'nature', label: 'Tự Nhiên', count: 7 },
  { id: 'life', label: 'Cuộc Sống', count: 10 },
  { id: 'binaural', label: 'Sóng Não', count: 4 },
  { id: 'noise', label: 'Tiếng Ồn Khoa Học', count: 4 },
  { id: 'all', label: 'Tất Cả', count: 25 }
];
