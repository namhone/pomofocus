import { BackgroundPreset } from '../types/background';
import { WALLPAPERS } from './wallpapers';

// Data URI SVG & CSS Gradients dự phòng cho offline và fallback tức thì
export const FALLBACK_GRADIENTS = {
  deepSpace: 'linear-gradient(135deg, #0a0e27 0%, #171b40 40%, #28144b 75%, #0a0b1d 100%)',
  cozyLofi: 'linear-gradient(135deg, #1c1917 0%, #292524 50%, #451a03 100%)',
  rainyWindow: 'linear-gradient(135deg, #090d16 0%, #111827 50%, #1e293b 100%)',
  mistyForest: 'linear-gradient(135deg, #022c22 0%, #064e3b 50%, #041f1a 100%)',
  tokyoNeon: 'linear-gradient(135deg, #1e1035 0%, #2e1065 50%, #030712 100%)',
  sunsetLake: 'linear-gradient(135deg, #451a03 0%, #7c2d12 50%, #1c1917 100%)',
  oceanWaves: 'linear-gradient(135deg, #082f49 0%, #0c4a6e 50%, #0284c7 100%)'
};

export const PURE_ZEN_BLACK_HEX = '#09090b';

// 30 ảnh riêng biệt, hai video có nội dung đúng tên và nền tĩnh nhẹ.
export const BACKGROUND_PRESETS: BackgroundPreset[] = [
  {
    "id": "pure-black",
    "title": "Tắt nền",
    "category": "solid",
    "url": "#09090b",
    "fallbackUrl": "#09090b",
    "thumbnailUrl": "",
    "author": "PomoFocus",
    "license": "Built-in",
    "description": "Nền đen tĩnh, không cần tải ảnh.",
    "tags": [
      "zen",
      "black",
      "offline"
    ]
  },
  { id: 'deep-space', title: 'Trái đất từ không gian', category: 'image', url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1920&q=75', fallbackUrl: FALLBACK_GRADIENTS.deepSpace, thumbnailUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=360&q=60', author: 'NASA / Unsplash', license: 'Unsplash', description: 'Trái đất nhìn từ không gian.', tags: ['earth', 'space'] },
  ...WALLPAPERS.map((item): BackgroundPreset => ({
    id: ({"wp-anime-ghibli-12":"cozy-lofi-room","wp-photo-9":"pine-forest","wp-photo-6":"tokyo-neon"} as Record<string, string>)[item.id] || item.id,
    title: item.id === 'wp-anime-ghibli-12' ? 'Góc học tập Lo-fi' : item.title,
    category: 'image', url: item.fullUrl, fallbackUrl: '#09090b', thumbnailUrl: item.thumbnailUrl, author: item.author,
    license: item.fullUrl.startsWith('/') ? 'Tài nguyên có sẵn trong dự án' : 'Unsplash',
    description: item.title, tags: item.tags
  })),
  { id: 'oceans-wave', title: 'Sóng biển', category: 'video', url: 'https://videos.pexels.com/video-files/1893746/1893746-sd_640_360_25fps.mp4', fallbackUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1280&q=70', thumbnailUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=360&q=60', author: 'Atlantic Ambience / Pexels', license: 'Pexels Free License', description: 'Cảnh biển chuyển động. Chế độ Eco dùng ảnh tĩnh.', tags: ['ocean', 'waves', 'video'] },
  { id: 'flower-timelapse', title: 'Hoa nở', category: 'video', url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4', fallbackUrl: '#09090b', thumbnailUrl: '', author: 'MDN Web Docs', license: 'CC0', description: 'Cận cảnh hoa nở theo thời gian. Chế độ Eco dùng nền tĩnh.', tags: ['flower', 'timelapse', 'video'] },
  { id: 'gradient-space', title: 'Dải màu vũ trụ', category: 'gradient', url: FALLBACK_GRADIENTS.deepSpace, fallbackUrl: '#09090b', thumbnailUrl: '', author: 'PomoFocus', license: 'Built-in', description: 'Dải màu tĩnh, không tải dữ liệu mạng.', tags: ['gradient', 'offline'] },
  // Keep saved Zen color IDs compatible without duplicating image/video resources.
  { id: 'zen-pure-black', title: 'Đen tuyền', category: 'solid', url: '#09090b', fallbackUrl: '#09090b', thumbnailUrl: '', author: 'PomoFocus', license: 'Built-in', description: 'Nền đen tĩnh.', tags: ['solid', 'offline'] },
  { id: 'zen-night-blue', title: 'Xanh đêm', category: 'solid', url: '#0b132b', fallbackUrl: '#0b132b', thumbnailUrl: '', author: 'PomoFocus', license: 'Built-in', description: 'Nền xanh đêm tĩnh.', tags: ['solid', 'offline'] },
  { id: 'zen-deep-graphite', title: 'Xám than chì', category: 'solid', url: '#18181b', fallbackUrl: '#18181b', thumbnailUrl: '', author: 'PomoFocus', license: 'Built-in', description: 'Nền xám tĩnh.', tags: ['solid', 'offline'] }
];
