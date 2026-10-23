export type BackgroundCategory = 'all' | 'gradient' | 'image' | 'video';

export interface BackgroundPreset {
  id: string;
  title: string;
  category: 'gradient' | 'image' | 'video';
  url: string;
  fallbackUrl: string; // URL ảnh tĩnh hoặc CSS gradient dùng khi lỗi hoặc prefers-reduced-motion
  thumbnailUrl: string;
  author: string;
  license: string;
  description: string;
  tags: string[];
}

export interface BackgroundStorageData {
  version: number;
  activePresetId: string;
  blurLevel: number;
  brightnessLevel: number;
  overlayOpacity: number;
  customUrl: string | null;
  customType: 'image' | 'video' | null;
}
