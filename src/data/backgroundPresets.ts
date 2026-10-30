import { BackgroundPreset } from '../types/background';

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

export const BACKGROUND_PRESETS: BackgroundPreset[] = [
  {
    id: 'deep-space',
    title: 'Không Gian Sâu',
    category: 'image',
    url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1920&auto=format&fit=crop',
    fallbackUrl: FALLBACK_GRADIENTS.deepSpace,
    thumbnailUrl:
      'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=300&auto=format&fit=crop',
    author: 'NASA / Unsplash',
    license: 'Unsplash Free Commercial License',
    description: 'Tinh vân vũ trụ sâu thẳm với ánh sáng cực quang và dải ngân hà huyền bí.',
    tags: ['space', 'galaxy', 'night', 'stars', 'cosmic']
  },
  {
    id: 'cozy-lofi-room',
    title: 'Góc Học Tập Lo-Fi',
    category: 'image',
    url: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?q=80&w=1920&auto=format&fit=crop',
    fallbackUrl: FALLBACK_GRADIENTS.cozyLofi,
    thumbnailUrl:
      'https://images.unsplash.com/photo-1518495973542-4542c06a5843?q=80&w=300&auto=format&fit=crop',
    author: 'Unsplash Community',
    license: 'Unsplash Free Commercial License',
    description: 'Ánh đèn vàng ấm cúng bên bàn làm việc gỗ, sách vở và không gian học tập yên tĩnh.',
    tags: ['cozy', 'warm', 'study', 'lofi', 'hygge']
  },
  {
    id: 'oceans-wave',
    title: 'Đại Dương Sóng Vỗ',
    category: 'video',
    url: 'https://vjs.zencdn.net/v/oceans.mp4',
    fallbackUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1920&auto=format&fit=crop',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=300&auto=format&fit=crop',
    author: 'VideoJS Open Media Library',
    license: 'Creative Commons (CC0)',
    description: 'Video chuyển động sóng biển xanh biếc dạt dào êm ả lặp vòng liên tục.',
    tags: ['ocean', 'waves', 'video', 'water', 'nature']
  },
  {
    id: 'rainy-window',
    title: 'Cửa Sổ Mưa Rơi',
    category: 'video',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    fallbackUrl: FALLBACK_GRADIENTS.rainyWindow,
    thumbnailUrl:
      'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?q=80&w=300&auto=format&fit=crop',
    author: 'Wikimedia Commons / Google Test Streams',
    license: 'Creative Commons (CC0 / Open Media)',
    description: 'Video vòng lặp giọt mưa trượt trên mặt kính mờ ảo, tạo không gian tập trung trầm lắng.',
    tags: ['rain', 'video', 'mood', 'cozy', 'water']
  },
  {
    id: 'pine-forest',
    title: 'Rừng Thông Sương Sớm',
    category: 'image',
    url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=1920&auto=format&fit=crop',
    fallbackUrl: FALLBACK_GRADIENTS.mistyForest,
    thumbnailUrl:
      'https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=300&auto=format&fit=crop',
    author: 'Unsplash Community',
    license: 'Unsplash Free Commercial License',
    description: 'Thiên nhiên hoang dã mát lành với những rặng thông xanh bạt ngàn trong làn sương sớm.',
    tags: ['nature', 'forest', 'green', 'peaceful', 'mist']
  },
  {
    id: 'sintel-nature',
    title: 'Hoạt Cảnh Thiên Nhiên',
    category: 'video',
    url: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
    fallbackUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=1920&auto=format&fit=crop',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=300&auto=format&fit=crop',
    author: 'Blender Foundation (Open Movie)',
    license: 'Creative Commons CC-BY 3.0',
    description: 'Video hoạt cảnh đồ họa mở chất lượng cao lặp vòng thiên nhiên và ngọn lửa.',
    tags: ['animation', 'nature', 'video', 'blender', 'fire']
  },
  {
    id: 'tokyo-neon',
    title: 'Đêm Phố Tokyo',
    category: 'video',
    url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4',
    fallbackUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1920&auto=format&fit=crop',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=300&auto=format&fit=crop',
    author: 'Mozilla Open Media / Unsplash Community',
    license: 'Creative Commons (CC0 / Open Media)',
    description: 'Video ánh đèn neon hiện đại và nhịp sống đô thị cyberpunk về đêm.',
    tags: ['neon', 'cyberpunk', 'city', 'video', 'tokyo']
  },
  {
    id: 'flower-timelapse',
    title: 'Hoa Nở Trong Vườn',
    category: 'video',
    url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    fallbackUrl: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?q=80&w=1920&auto=format&fit=crop',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1490750967868-88aa4486c946?q=80&w=300&auto=format&fit=crop',
    author: 'Mozilla Open Media',
    license: 'Creative Commons (CC0 / Open Media)',
    description: 'Video time-lapse cánh hoa nở thư giãn, truyền cảm hứng bình yên.',
    tags: ['flower', 'bloom', 'timelapse', 'nature', 'video']
  },
  {
    id: 'sunset-lake',
    title: 'Hồ Chiều Tà',
    category: 'image',
    url: 'https://images.unsplash.com/photo-1439066615861-d1af74d74000?q=80&w=1920&auto=format&fit=crop',
    fallbackUrl: FALLBACK_GRADIENTS.sunsetLake,
    thumbnailUrl:
      'https://images.unsplash.com/photo-1439066615861-d1af74d74000?q=80&w=300&auto=format&fit=crop',
    author: 'Kalab Teshale / Unsplash',
    license: 'Unsplash Free Commercial License',
    description: 'Mặt hồ phẳng lặng phản chiếu ánh hoàng hôn cam vàng tuyệt đẹp giữa lòng thung lũng.',
    tags: ['sunset', 'water', 'lake', 'mountains', 'calm']
  },
  {
    id: 'mountain-sunset',
    title: 'Hoàng Hôn Đỉnh Núi',
    category: 'image',
    url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1920&auto=format&fit=crop',
    fallbackUrl: FALLBACK_GRADIENTS.sunsetLake,
    thumbnailUrl:
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=300&auto=format&fit=crop',
    author: 'Unsplash Community',
    license: 'Unsplash Free Commercial License',
    description: 'Ánh nắng vàng cam buông xuống những đỉnh núi điệp trùng.',
    tags: ['mountain', 'sunset', 'alpine', 'sky', 'warm']
  },
  {
    id: 'gradient-space',
    title: 'Gradient Tối Giản Vũ Trụ',
    category: 'gradient',
    url: FALLBACK_GRADIENTS.deepSpace,
    fallbackUrl: FALLBACK_GRADIENTS.deepSpace,
    thumbnailUrl: '',
    author: 'System Preset',
    license: 'MIT',
    description: 'Nền dải màu tím đen tinh tế, siêu nhẹ, không tốn băng thông mạng.',
    tags: ['gradient', 'minimal', 'offline', 'dark']
  },
  {
    id: 'gradient-forest',
    title: 'Gradient Tối Giản Rừng Xanh',
    category: 'gradient',
    url: FALLBACK_GRADIENTS.mistyForest,
    fallbackUrl: FALLBACK_GRADIENTS.mistyForest,
    thumbnailUrl: '',
    author: 'System Preset',
    license: 'MIT',
    description: 'Nền dải màu xanh ngọc bích đậm thư thái cho đôi mắt.',
    tags: ['gradient', 'minimal', 'offline', 'green']
  }
];
