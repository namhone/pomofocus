import { ChimeSoundType } from '../types/audio';

export interface AlarmSoundConfig {
  id: ChimeSoundType;
  name: string;
  desc: string;
  url?: string;
  durationMs: number;
}

export const ALARM_CHIMES: AlarmSoundConfig[] = [
  {
    id: 'tibetan_bowl',
    name: 'Chuông Tây Tạng (Tibetan Bowl)',
    desc: 'Âm ngân trầm hùng 3.5s, hài hòa xuyên qua tạp âm',
    url: 'https://actions.google.com/sounds/v1/household/clock_chime_bell.ogg',
    durationMs: 3500
  },
  {
    id: 'crystal_chime',
    name: 'Chuông Pha Lê (Crystal Chime)',
    desc: 'Tần số cao 3.2kHz trong vắt, giòn tan báo hiệu',
    url: 'https://actions.google.com/sounds/v1/household/wind_chimes.ogg',
    durationMs: 3000
  },
  {
    id: 'digital_alarm',
    name: 'Hồi Chuông Digital (Radar Beep)',
    desc: 'Nhịp chuông đôi kỹ thuật số sắc sảo chuẩn Apple Timer',
    url: 'https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg',
    durationMs: 2500
  },
  {
    id: 'brass_bell',
    name: 'Chuông Đồng (Brass Bell)',
    desc: 'Rung ngân êm dịu, ấm áp và thư thái',
    url: 'https://actions.google.com/sounds/v1/household/clock_chime_bell.ogg',
    durationMs: 3000
  },
  {
    id: 'twinkle',
    name: 'Twinkle',
    desc: 'Arpeggio trong trẻo lấp lánh',
    durationMs: 1500
  },
  {
    id: 'playtime',
    name: 'Playtime',
    desc: 'Chuông gõ vui tươi',
    durationMs: 1500
  },
  {
    id: 'scifi',
    name: 'Sci-Fi',
    desc: 'Âm sắc tương lai không gian',
    durationMs: 1500
  },
  {
    id: 'slow_rise',
    name: 'Slow Rise',
    desc: 'Âm ngân chậm ấm áp',
    durationMs: 1500
  },
  {
    id: 'bird',
    name: 'Tiếng Chim',
    desc: 'Tiếng chim hót rộn ràng',
    durationMs: 1500
  }
];

export const DEFAULT_CHIME: ChimeSoundType = 'tibetan_bowl';
