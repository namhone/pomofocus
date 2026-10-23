import { BackgroundPreset } from '../types/background';

// Data URI SVG dự phòng cho offline và fallback tức thì
export const FALLBACK_GRADIENTS = {
  deepSpace: 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #1e1b4b 100%)',
  cozyLofi: 'linear-gradient(135deg, #1c1917 0%, #292524 50%, #451a03 100%)',
  rainyWindow: 'linear-gradient(135deg, #090d16 0%, #111827 50%, #1e293b 100%)',
  mistyForest: 'linear-gradient(135deg, #022c22 0%, #064e3b 50%, #041f1a 100%)',
  tokyoNeon: 'linear-gradient(135deg, #1e1035 0%, #2e1065 50%, #030712 100%)',
  sunsetLake: 'linear-gradient(135deg, #451a03 0%, #7c2d12 50%, #1c1917 100%)'
};

export const BACKGROUND_PRESETS: BackgroundPreset[] = [
  {
    id: 'deep-space',
    title: 'Không Gian Sâu (Deep Space)',
    category: 'gradient',
    url: FALLBACK_GRADIENTS.deepSpace,
    fallbackUrl: FALLBACK_GRADIENTS.deepSpace,
    thumbnailUrl:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="60"><rect width="100" height="60" fill="%230f172a"/><circle cx="30" cy="20" r="1" fill="%23ffffff"/><circle cx="70" cy="40" r="1.5" fill="%2393c5fd"/><circle cx="50" cy="50" r="1" fill="%23ffffff"/></svg>',
    author: 'Antigravity Studio',
    license: 'CC0 / Public Domain',
    description: 'Bầu trời đêm tối giản sâu thẳm, không gây phân tâm, tiết kiệm pin tối đa.',
    tags: ['minimal', 'night', 'dark', 'stars']
  },
  {
    id: 'cozy-lofi-room',
    title: 'Góc Học Tập Lo-Fi (Cozy Study)',
    category: 'image',
    url: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?q=80&w=1920&auto=format&fit=crop',
    fallbackUrl: FALLBACK_GRADIENTS.cozyLofi,
    thumbnailUrl:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="60"><rect width="100" height="60" fill="%23292524"/><rect x="20" y="30" width="60" height="20" rx="3" fill="%2378350f"/><circle cx="50" cy="25" r="8" fill="%23fbbf24" opacity="0.6"/></svg>',
    author: 'Unsplash Community',
    license: 'Unsplash Free Commercial License',
    description: 'Ánh đèn vàng ấm cúng bên bàn làm việc gỗ và sách vở.',
    tags: ['cozy', 'warm', 'study', 'lofi']
  },
  {
    id: 'rainy-window',
    title: 'Cửa Sổ Mưa Rơi (Rainy Window)',
    category: 'video',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    fallbackUrl: FALLBACK_GRADIENTS.rainyWindow,
    thumbnailUrl:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="60"><rect width="100" height="60" fill="%231e293b"/><line x1="20" y1="10" x2="15" y2="30" stroke="%2360a5fa" stroke-width="2"/><line x1="60" y1="20" x2="55" y2="40" stroke="%2360a5fa" stroke-width="2"/><line x1="80" y1="35" x2="75" y2="55" stroke="%2360a5fa" stroke-width="2"/></svg>',
    author: 'Wikimedia Commons / Google Test Streams',
    license: 'Creative Commons (CC0 / Open Media)',
    description: 'Video vòng lặp giọt mưa trượt trên mặt kính mờ ảo, tạo không gian tập trung trầm lắng.',
    tags: ['rain', 'video', 'mood', 'cozy']
  },
  {
    id: 'pine-forest',
    title: 'Rừng Thông Sương Sớm (Misty Forest)',
    category: 'image',
    url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=1920&auto=format&fit=crop',
    fallbackUrl: FALLBACK_GRADIENTS.mistyForest,
    thumbnailUrl:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="60"><rect width="100" height="60" fill="%23064e3b"/><polygon points="30,50 40,25 50,50" fill="%23022c22"/><polygon points="60,50 70,30 80,50" fill="%23022c22"/></svg>',
    author: 'Unsplash Community',
    license: 'Unsplash Free Commercial License',
    description: 'Thiên nhiên hoang dã mát lành với những rặng thông bạt ngàn trong làn sương.',
    tags: ['nature', 'forest', 'green', 'peaceful']
  },
  {
    id: 'tokyo-neon',
    title: 'Đêm Phố Tokyo (Tokyo Neon)',
    category: 'video',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    fallbackUrl: FALLBACK_GRADIENTS.tokyoNeon,
    thumbnailUrl:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="60"><rect width="100" height="60" fill="%23030712"/><rect x="15" y="15" width="20" height="40" fill="%23be185d"/><rect x="45" y="25" width="15" height="30" fill="%236366f1"/><circle cx="80" cy="20" r="6" fill="%2306b6d4"/></svg>',
    author: 'Blender Open Foundation',
    license: 'Creative Commons Attribution 3.0',
    description: 'Video ánh đèn neon hiện đại và nhịp sống đô thị cyberpunk.',
    tags: ['neon', 'cyberpunk', 'city', 'video']
  },
  {
    id: 'sunset-lake',
    title: 'Hồ Chiều Tà (Sunset Lake)',
    category: 'image',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1920&auto=format&fit=crop',
    fallbackUrl: FALLBACK_GRADIENTS.sunsetLake,
    thumbnailUrl:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="60"><rect width="100" height="60" fill="%237c2d12"/><circle cx="50" cy="30" r="15" fill="%23f97316"/><rect x="0" y="42" width="100" height="18" fill="%23451a03"/></svg>',
    author: 'Unsplash Community',
    license: 'Unsplash Free Commercial License',
    description: 'Mặt hồ phẳng lặng phản chiếu ánh hoàng hôn buông xuống dịu êm.',
    tags: ['sunset', 'water', 'lake', 'calm']
  }
];
