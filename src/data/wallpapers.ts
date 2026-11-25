export type WallpaperCategory =
  | 'lofi-study'
  | 'anime-ghibli'
  | 'cyberpunk-tokyo'
  | 'minimalist-desk'
  | 'minimalist-dark'
  | 'nature-zen'
  | 'vintage-film';

export interface WallpaperItem {
  id: string;
  title: string;
  category: WallpaperCategory;
  orientation?: '16:9' | '9:16' | 'responsive';
  thumbnailUrl: string;
  fullUrl: string;
  author: string;
  tags: string[];
}

// Mỗi mục tương ứng một tài nguyên thật; không sinh biến thể để tăng số lượng.
export const WALLPAPER_CATEGORIES: { id: WallpaperCategory | 'all'; label: string; icon: string }[] = [
  {
    "id": "all",
    "label": "Tất cả",
    "icon": ""
  },
  {
    "id": "lofi-study",
    "label": "Lo-fi",
    "icon": ""
  },
  {
    "id": "anime-ghibli",
    "label": "Anime",
    "icon": ""
  },
  {
    "id": "cyberpunk-tokyo",
    "label": "Cyberpunk",
    "icon": ""
  },
  {
    "id": "minimalist-desk",
    "label": "Tối giản",
    "icon": ""
  },
  {
    "id": "nature-zen",
    "label": "Thiên nhiên",
    "icon": ""
  }
];

export const ANIME_WALLPAPERS_LOCAL: { filename: string; title: string; author: string; tags: string[] }[] = [
  {
    "filename": "anime-01.webp",
    "title": "Chuyến tàu trên mặt nước",
    "author": "Studio Ghibli (Spirited Away)",
    "tags": [
      "ghibli",
      "train",
      "sea"
    ]
  },
  {
    "filename": "anime-02.webp",
    "title": "Ngôi nhà của Totoro",
    "author": "Studio Ghibli (My Neighbor Totoro)",
    "tags": [
      "ghibli",
      "house",
      "garden"
    ]
  },
  {
    "filename": "anime-03.webp",
    "title": "Sophie và Howl",
    "author": "Studio Ghibli (Howl’s Moving Castle)",
    "tags": [
      "ghibli",
      "howl",
      "characters"
    ]
  },
  {
    "filename": "anime-04.webp",
    "title": "Khu vườn Arrietty",
    "author": "Studio Ghibli (Arrietty)",
    "tags": [
      "ghibli",
      "garden",
      "nature"
    ]
  },
  {
    "filename": "anime-05.webp",
    "title": "Kiki và mèo Jiji",
    "author": "Studio Ghibli (Kiki’s Delivery Service)",
    "tags": [
      "ghibli",
      "kiki",
      "cat"
    ]
  },
  {
    "filename": "anime-06.webp",
    "title": "Sao băng trên thành phố",
    "author": "Makoto Shinkai (Your Name)",
    "tags": [
      "shinkai",
      "meteor",
      "city"
    ]
  },
  {
    "filename": "anime-07.webp",
    "title": "Ngân hà trên hồ",
    "author": "Makoto Shinkai (Your Name)",
    "tags": [
      "shinkai",
      "galaxy",
      "lake"
    ]
  },
  {
    "filename": "anime-08.webp",
    "title": "Vệt sao giữa trời đêm",
    "author": "Makoto Shinkai (Your Name)",
    "tags": [
      "shinkai",
      "comet",
      "stars"
    ]
  },
  {
    "filename": "anime-09.webp",
    "title": "Tokyo dưới trời xanh",
    "author": "Minh họa anime trong dự án",
    "tags": [
      "anime",
      "tokyo",
      "sky"
    ]
  },
  {
    "filename": "anime-10.webp",
    "title": "Đường ray mùa hạ",
    "author": "Minh họa anime trong dự án",
    "tags": [
      "anime",
      "railway",
      "summer"
    ]
  },
  {
    "filename": "anime-11.webp",
    "title": "Phòng ngủ Cyberpunk",
    "author": "Minh họa trong dự án",
    "tags": [
      "cyberpunk",
      "neon",
      "room"
    ]
  },
  {
    "filename": "anime-12.webp",
    "title": "Góc học đêm Lo-fi",
    "author": "Minh họa trong dự án",
    "tags": [
      "lofi",
      "desk",
      "night",
      "study"
    ]
  },
  {
    "filename": "anime-13.webp",
    "title": "Góc bếp Pixel",
    "author": "Minh họa trong dự án",
    "tags": [
      "pixel-art",
      "kitchen",
      "cozy"
    ]
  },
  {
    "filename": "anime-14.webp",
    "title": "Mây mùa hạ bên đường tàu",
    "author": "Minh họa anime trong dự án",
    "tags": [
      "anime",
      "clouds",
      "railway"
    ]
  },
  {
    "filename": "anime-15.webp",
    "title": "Phố đèn lồng",
    "author": "Minh họa trong dự án",
    "tags": [
      "fantasy",
      "lanterns",
      "night"
    ]
  },
  {
    "filename": "anime-16.webp",
    "title": "Hẻm Neon đêm mưa",
    "author": "Minh họa trong dự án",
    "tags": [
      "cyberpunk",
      "rain",
      "neon"
    ]
  },
  {
    "filename": "anime-17.webp",
    "title": "Quán nhỏ dưới tán cây",
    "author": "Minh họa trong dự án",
    "tags": [
      "anime",
      "cafe",
      "tree"
    ]
  },
  {
    "filename": "anime-18.webp",
    "title": "Sao băng trên mặt hồ",
    "author": "Minh họa anime trong dự án",
    "tags": [
      "anime",
      "meteor",
      "lake"
    ]
  }
];

const LOCAL_WALLPAPERS: WallpaperItem[] = ANIME_WALLPAPERS_LOCAL.map((item, i) => ({
  id: `wp-anime-ghibli-${i + 1}`,
  title: item.title,
  category: item.tags.includes('lofi') ? 'lofi-study' : item.tags.includes('cyberpunk') ? 'cyberpunk-tokyo' : 'anime-ghibli',
  orientation: 'responsive',
  thumbnailUrl: `/backgrounds/anime/${item.filename}`,
  fullUrl: `/backgrounds/anime/${item.filename}`,
  author: item.author,
  tags: item.tags
}));

export const ANIME_WALLPAPERS_CURATED: WallpaperItem[] = LOCAL_WALLPAPERS.filter((item) => !item.tags.includes('ghibli'));

const PHOTO_WALLPAPERS: WallpaperItem[] = [
  {
    "id": "wp-photo-1",
    "title": "Sổ tay bên laptop",
    "category": "lofi-study",
    "orientation": "responsive",
    "thumbnailUrl": "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=360&h=202&q=60",
    "fullUrl": "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1920&q=75",
    "author": "Cathryn Lavery",
    "tags": [
      "study",
      "notebook",
      "desk"
    ]
  },
  {
    "id": "wp-photo-2",
    "title": "Sách và ghi chép",
    "category": "lofi-study",
    "orientation": "responsive",
    "thumbnailUrl": "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=360&h=202&q=60",
    "fullUrl": "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=1920&q=75",
    "author": "Thought Catalog",
    "tags": [
      "books",
      "study"
    ]
  },
  {
    "id": "wp-photo-3",
    "title": "Trang sổ mở",
    "category": "lofi-study",
    "orientation": "responsive",
    "thumbnailUrl": "https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=360&h=202&q=60",
    "fullUrl": "https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=1920&q=75",
    "author": "Slava Bowman",
    "tags": [
      "notebook",
      "writing"
    ]
  },
  {
    "id": "wp-photo-4",
    "title": "Bàn làm việc với laptop",
    "category": "minimalist-desk",
    "orientation": "responsive",
    "thumbnailUrl": "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=360&h=202&q=60",
    "fullUrl": "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1920&q=75",
    "author": "Christopher Gower",
    "tags": [
      "desk",
      "laptop"
    ]
  },
  {
    "id": "wp-photo-5",
    "title": "Góc làm việc sáng",
    "category": "minimalist-desk",
    "orientation": "responsive",
    "thumbnailUrl": "https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?auto=format&fit=crop&w=360&h=202&q=60",
    "fullUrl": "https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?auto=format&fit=crop&w=1920&q=75",
    "author": "Unsplash Community",
    "tags": [
      "desk",
      "minimalist"
    ]
  },
  {
    "id": "wp-photo-6",
    "title": "Tokyo về đêm",
    "category": "cyberpunk-tokyo",
    "orientation": "responsive",
    "thumbnailUrl": "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=360&h=202&q=60",
    "fullUrl": "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1920&q=75",
    "author": "Unsplash Community",
    "tags": [
      "tokyo",
      "night",
      "neon"
    ]
  },
  {
    "id": "wp-photo-7",
    "title": "Ánh đèn thành phố",
    "category": "cyberpunk-tokyo",
    "orientation": "responsive",
    "thumbnailUrl": "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=360&h=202&q=60",
    "fullUrl": "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1920&q=75",
    "author": "Unsplash Community",
    "tags": [
      "city",
      "night"
    ]
  },
  {
    "id": "wp-photo-8",
    "title": "Phòng game Arcade",
    "category": "cyberpunk-tokyo",
    "orientation": "responsive",
    "thumbnailUrl": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=360&h=202&q=60",
    "fullUrl": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1920&q=75",
    "author": "Unsplash Community",
    "tags": [
      "arcade",
      "retro",
      "neon"
    ]
  },
  {
    "id": "wp-photo-9",
    "title": "Rừng cây yên tĩnh",
    "category": "nature-zen",
    "orientation": "responsive",
    "thumbnailUrl": "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=360&h=202&q=60",
    "fullUrl": "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1920&q=75",
    "author": "Unsplash Community",
    "tags": [
      "forest",
      "nature"
    ]
  },
  {
    "id": "wp-photo-10",
    "title": "Thung lũng và mặt hồ",
    "category": "nature-zen",
    "orientation": "responsive",
    "thumbnailUrl": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=360&h=202&q=60",
    "fullUrl": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1920&q=75",
    "author": "Unsplash Community",
    "tags": [
      "valley",
      "lake"
    ]
  },
  {
    "id": "wp-photo-11",
    "title": "Đỉnh núi giữa mây",
    "category": "nature-zen",
    "orientation": "responsive",
    "thumbnailUrl": "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=360&h=202&q=60",
    "fullUrl": "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1920&q=75",
    "author": "Unsplash Community",
    "tags": [
      "mountain",
      "clouds"
    ]
  },
  {
    "id": "wp-photo-12",
    "title": "Bãi biển cát trắng",
    "category": "nature-zen",
    "orientation": "responsive",
    "thumbnailUrl": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=360&h=202&q=60",
    "fullUrl": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=75",
    "author": "Unsplash Community",
    "tags": [
      "beach",
      "ocean"
    ]
  }
];

export const WALLPAPERS: WallpaperItem[] = [...LOCAL_WALLPAPERS, ...PHOTO_WALLPAPERS];

export function queryWallpapers(params: {
  category?: WallpaperCategory | 'all';
  orientation?: string;
  query?: string;
  page?: number;
  limit?: number;
}): {
  items: WallpaperItem[];
  total: number;
  totalPages: number;
  hasMore: boolean;
} {
  const { category = 'all', query = '', page = 1, limit = 24 } = params;

  let list = WALLPAPERS;

  // Lọc theo danh mục (hỗ trợ alias minimalist-dark)
  if (category !== 'all') {
    if (category === 'minimalist-dark') {
      list = list.filter((w) => w.category === 'minimalist-desk' || (w.category as string) === 'minimalist-dark');
    } else {
      list = list.filter((w) => w.category === category);
    }
  }

  // Tìm kiếm từ khóa
  if (query.trim()) {
    const q = query.toLowerCase().trim();
    list = list.filter(
      (w) =>
        w.title.toLowerCase().includes(q) ||
        w.author.toLowerCase().includes(q) ||
        w.tags.some((t) => t.toLowerCase().includes(q))
    );
  }

  const total = list.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.max(1, Math.min(page, totalPages));
  const startIndex = (currentPage - 1) * limit;
  const items = list.slice(startIndex, startIndex + limit);
  const hasMore = currentPage < totalPages;

  return { items, total, totalPages, hasMore };
}
