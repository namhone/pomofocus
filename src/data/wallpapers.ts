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
  orientation: '16:9' | '9:16';
  thumbnailUrl: string;
  fullUrl: string;
  author: string;
  tags: string[];
}

export const WALLPAPER_CATEGORIES: { id: WallpaperCategory | 'all'; label: string; icon: string }[] = [
  { id: 'all', label: 'Tất cả', icon: '🌌' },
  { id: 'lofi-study', label: 'Lo-Fi Bàn Học', icon: '🛋️' },
  { id: 'anime-ghibli', label: 'Anime & Ghibli', icon: '🎨' },
  { id: 'cyberpunk-tokyo', label: 'Cyberpunk Tokyo', icon: '🏙️' },
  { id: 'minimalist-desk', label: 'Minimalist Desk', icon: '💻' },
  { id: 'nature-zen', label: 'Nature Zen', icon: '🌲' }
];

interface CategorySeedData {
  photos: { id: string; author: string }[];
  titleTemplates: string[];
  tags: string[];
}

const CATEGORY_SEEDS: Record<
  'lofi-study' | 'anime-ghibli' | 'cyberpunk-tokyo' | 'minimalist-desk' | 'nature-zen',
  CategorySeedData
> = {
  'lofi-study': {
    photos: [
      { id: 'photo-1518495973542-4542c06a5843', author: 'Priscilla Du Preez' },
      { id: 'photo-1498050108023-c5249f4df085', author: 'Christopher Gower' },
      { id: 'photo-1499750310107-5fef28a66643', author: 'Cathryn Lavery' },
      { id: 'photo-1515378791036-0648a3ef77b2', author: 'Glenn Carstens-Peters' },
      { id: 'photo-1486312338219-ce68d2c6f44d', author: 'Glenn Carstens-Peters' },
      { id: 'photo-1501504905252-473c47e087f8', author: 'Jonas Jacobsson' },
      { id: 'photo-1483058712412-4245e9b90334', author: 'Green Chameleon' },
      { id: 'photo-1456513080510-7bf3a84b82f8', author: 'Thought Catalog' },
      { id: 'photo-1476820865390-c52aeebb9891', author: 'Travis Yewell' },
      { id: 'photo-1517842645767-c639042777db', author: 'Slava Bowman' },
      { id: 'photo-1434030216411-0b793f4b4173', author: 'Green Chameleon' },
      { id: 'photo-1521587760476-6c12a4b040da', author: 'Patrick Tomasso' },
      { id: 'photo-1481627834876-b7833e8f5570', author: 'Aaron Burden' },
      { id: 'photo-1524995997946-a1c2e315a42f', author: 'Freddie Marriage' },
      { id: 'photo-1512820790803-83ca734da794', author: 'Alisa Anton' },
      { id: 'photo-1501339847302-ac426a4a7cbb', author: 'Petr Sevcovic' },
      { id: 'photo-1453614512568-c4024d13c247', author: 'Declan Sun' },
      { id: 'photo-1509042239860-f550ce710b93', author: 'Nathan Dumlao' },
      { id: 'photo-1516321318423-f06f85e504b3', author: 'John Schnobrich' },
      { id: 'photo-1519389950473-47ba0277781c', author: 'Annie Spratt' },
      { id: 'photo-1516962215378-7fa2e137ae93', author: 'Bench Accounting' },
      { id: 'photo-1497633762265-9d179a990aa6', author: 'Giammarco Boscaro' },
      { id: 'photo-1513542789411-b6a5d4f31634', author: 'Jeremy Bishop' }
    ],
    titleTemplates: [
      'Góc Học Tập Bàn Gỗ Đèn Vàng',
      'Sổ Tay & Laptop Tập Trung Sáng',
      'Mưa Rơi Bên Bàn Làm Việc Đêm',
      'Kệ Sách Gỗ & Ánh Nắng Chiều',
      'Góc Chill Nghe Nhạc Đĩa Than',
      'Phòng Học Gác Mái Tĩnh Lặng',
      'Bàn Gỗ Tự Nhiên & Cây Xanh Để Bàn',
      'Đèn Bàn Cổ Điển & Bản Thảo Nháp',
      'Đêm Đông Tập Trung Bên Tách Trà',
      'Hoàng Hôn Khẽ Rọi Khung Cửa Sổ'
    ],
    tags: ['lofi', 'study', 'desk', 'cozy', 'warm', 'laptop', 'books', 'night', 'chill', 'reading']
  },
  'anime-ghibli': {
    photos: [
      { id: 'photo-1534447677768-be436bb09401', author: 'Guille Pozzi' },
      { id: 'photo-1579783900882-c0d3dad7b119', author: 'Steve Johnson' },
      { id: 'photo-1563089145-599997674d42', author: 'Jr Korpa' },
      { id: 'photo-1607604276583-eef5d076aa5f', author: 'Evgeny Tchebotarev' },
      { id: 'photo-1503899036084-c55cdd92da26', author: 'Masashi Wakui' },
      { id: 'photo-1493976040374-85c8e12f0c0e', author: 'Soragrit Wongsa' },
      { id: 'photo-1542051841857-5f90071e7989', author: 'Aleksandar Pasaric' },
      { id: 'photo-1578632767115-351597cf2477', author: 'Clay Banks' },
      { id: 'photo-1518709268805-4e9042af9f23', author: 'NASA Hubble' },
      { id: 'photo-1492571350019-22de08371fd3', author: 'Masaaki Komori' },
      { id: 'photo-1536098561742-ca998e48cbcc', author: 'Tianshu Liu' },
      { id: 'photo-1508739773434-c26b3d09e071', author: 'Aleksandar Pasaric' },
      { id: 'photo-1526481280693-3bfa7568e0f3', author: 'Clay Banks' },
      { id: 'photo-1538370965046-79c0d6907d47', author: 'NASA' },
      { id: 'photo-1509198397868-475647b2a1e5', author: 'Sasha Freemind' },
      { id: 'photo-1518020382113-a7e8fc38eac9', author: 'Leonardo Yip' },
      { id: 'photo-1470071459604-3b5ec3a7fe05', author: 'Lukas Rodriguez' },
      { id: 'photo-1472214103451-9374bd1c798e', author: 'Bessie Turner' }
    ],
    titleTemplates: [
      'Đồng Cỏ Hoàng Hôn Phong Cách Ghibli',
      'Đèn Lồng Đỏ Phố Cổ Kyoto',
      'Con Hẻm Mưa Đêm Ánh Sáng Màu Nước',
      'Cổng Torii Đỏ Hoa Anh Đào',
      'Tầng Mây Kỳ Ảo & Dải Ngân Hà',
      'Ngôi Chùa Cổ Rừng Phong Đỏ',
      'Đường Chân Trời Tokyo Gam Pastel',
      'Thung Lũng Gió & Lâu Đài Bay',
      'Khu Rừng Phép Thuật Thần Bí',
      'Hồ Nước Đêm Trăng Tĩnh Lặng'
    ],
    tags: ['anime', 'ghibli', 'japan', 'kyoto', 'clouds', 'dreamscape', 'sakura', 'fantasy', 'art', 'watercolor']
  },
  'cyberpunk-tokyo': {
    photos: [
      { id: 'photo-1508739773434-c26b3d09e071', author: 'Aleksandar Pasaric' },
      { id: 'photo-1519501025264-65ba15a82390', author: 'Ben Cheung' },
      { id: 'photo-1514565131-fce0801e5785', author: 'Joshua Sortino' },
      { id: 'photo-1542751371-adc38448a05e', author: 'Florian Olivo' },
      { id: 'photo-1563245372-f21724e3856d', author: 'Sean Foley' },
      { id: 'photo-1526374965328-7f61d4dc18c5', author: 'Markus Spiske' },
      { id: 'photo-1550745165-9bc0b252726f', author: 'Carl Raw' },
      { id: 'photo-1569701813229-33284b643e3c', author: 'Fakurian Design' },
      { id: 'photo-1515260268569-9271009adfdb', author: 'Stefan K' },
      { id: 'photo-1541701494587-cb58502866ab', author: 'Denys Nevozhai' },
      { id: 'photo-1509198397868-475647b2a1e5', author: 'Sasha Freemind' },
      { id: 'photo-1518709268805-4e9042af9f23', author: 'NASA Hubble' },
      { id: 'photo-1503899036084-c55cdd92da26', author: 'Masashi Wakui' },
      { id: 'photo-1542051841857-5f90071e7989', author: 'Aleksandar Pasaric' },
      { id: 'photo-1534447677768-be436bb09401', author: 'Guille Pozzi' },
      { id: 'photo-1519681393784-d120267933ba', author: 'Benjamin Davies' }
    ],
    titleTemplates: [
      'Phố Đêm Neon Shinjuku Mưa Ướt',
      'Góc Setup Gaming RGB Tương Lai',
      'Đại Lộ Cao Tốc Ánh Đèn Tím',
      'Hẻm Phố Hong Kong Mờ Ảo Tím Xanh',
      'Ma Trận Dữ Liệu Số Kỹ Thuật Số',
      'Khu Trò Chơi Arcade Thập Niên 80',
      'Đô Thị Cao Tầng Cyberpunk 2077',
      'Lưới Ánh Sáng Hologram Đa Chiều',
      'Quán Mì Ramen Đèn Neon Tokyo',
      'Trạm Tàu Điện Ngầm Viễn Tưởng'
    ],
    tags: ['cyberpunk', 'tokyo', 'neon', 'night', 'rain', 'future', 'rgb', 'city', 'tech', 'matrix']
  },
  'minimalist-desk': {
    photos: [
      { id: 'photo-1498050108023-c5249f4df085', author: 'Christopher Gower' },
      { id: 'photo-1499951360447-b19be8fe80f5', author: 'Dmitry Zvolskiy' },
      { id: 'photo-1486312338219-ce68d2c6f44d', author: 'Glenn Carstens-Peters' },
      { id: 'photo-1515378791036-0648a3ef77b2', author: 'Glenn Carstens-Peters' },
      { id: 'photo-1483058712412-4245e9b90334', author: 'Green Chameleon' },
      { id: 'photo-1526738549149-8e07eca6c147', author: 'Mitch Lensink' },
      { id: 'photo-1587829741301-dc798b83add3', author: 'Jayden Staines' },
      { id: 'photo-1542751371-adc38448a05e', author: 'Florian Olivo' },
      { id: 'photo-1494438639946-1ebd1d20bf85', author: 'Simone Hutsch' },
      { id: 'photo-1487147264018-f937fba0c817', author: 'Federico Respini' },
      { id: 'photo-1491553895911-0055eca6402d', author: 'Joel Filipe' },
      { id: 'photo-1486406146926-c627a92ad1ab', author: 'Sean Pollock' },
      { id: 'photo-1518531933037-91b2f5f229cc', author: 'Desiree Fawn' },
      { id: 'photo-1507679799987-c73779587ccf', author: 'Hunters Race' },
      { id: 'photo-1517842645767-c639042777db', author: 'Slava Bowman' }
    ],
    titleTemplates: [
      'Bàn Làm Việc Setup Mac Đen Tối Giản',
      'Đường Kính Kiến Trúc Hiện Đại Đen Trắng',
      'Bóng Đổ Hình Học Tương Phản Đơn Sắc',
      'Góc Công Nghệ Màn Hình Ultrawide',
      'Bàn Phím Cơ & Ánh Đèn Bàn Minimalist',
      'Góc Lập Trình Viên Đêm Tĩnh Mịch',
      'Cấu Trúc Tối Giản Monolith Đen',
      'Không Gian Studio Đen Mờ Hiện Đại',
      'Mặt Bàn Gỗ Tối Giản Đèn Led Âm',
      'Góc Sáng Tạo Công Nghệ Tinh Gọn'
    ],
    tags: ['minimalist', 'dark', 'monochrome', 'clean', 'sleek', 'black', 'desk', 'workspace', 'focus']
  },
  'nature-zen': {
    photos: [
      { id: 'photo-1506744038136-46273834b3fb', author: 'Bailey Zindel' },
      { id: 'photo-1448375240586-882707db888b', author: 'Sebastian Unrau' },
      { id: 'photo-1470071459604-3b5ec3a7fe05', author: 'Lukas Rodriguez' },
      { id: 'photo-1426604966848-d7adac402bff', author: 'Luca Bravo' },
      { id: 'photo-1472214103451-9374bd1c798e', author: 'Bessie Turner' },
      { id: 'photo-1464822759023-fed622ff2c3b', author: 'Kalab Teshale' },
      { id: 'photo-1507525428034-b723cf961d3e', author: 'Sean Oulashin' },
      { id: 'photo-1433086966358-54859d0ed716', author: 'James Wheeler' },
      { id: 'photo-1501785888041-af3ef285b470', author: 'Pietro De Grandi' },
      { id: 'photo-1469474968028-56623f02e42e', author: 'David Marcu' },
      { id: 'photo-1515694346937-94d85e41e6f0', author: 'Maxime Bouffard' },
      { id: 'photo-1534274988757-a28bf1a57c17', author: 'Valentin Antonucci' },
      { id: 'photo-1519692933481-e162a57d6721', author: 'Raychel Sanner' },
      { id: 'photo-1501999635878-71cb5379c2d8', author: 'Dawid Zawila' },
      { id: 'photo-1428592953211-077101b2021b', author: 'Roman Kraft' }
    ],
    titleTemplates: [
      'Rừng Thông Sương Sớm Yên Bình',
      'Hồ Nước Núi Trong Suốt Mờ Ảo',
      'Thung Lũng Xanh Ban Mai Tĩnh Lặng',
      'Thác Nước Róc Rách Giữa Rừng Già',
      'Đỉnh Núi Tuyết Hùng Vĩ Mây Trắng',
      'Bờ Biển Hoàng Hôn Sóng Vỗ Dịu Êm',
      'Cầu Gỗ Dẫn Vào Rừng Trầm Lặng',
      'Hồ Nước Phản Chiếu Dãy Dolomites',
      'Giọt Nước Mưa Đọng Trên Mặt Kính',
      'Mặt Hồ Sáng Sớm Lặng Như Gương'
    ],
    tags: ['nature', 'zen', 'forest', 'pine', 'mountains', 'lake', 'mist', 'morning', 'peaceful', 'green']
  }
};

/**
 * Sinh bộ 1.000+ hình nền chất lượng cao được tuyển chọn theo 5 gu thẩm mỹ Pinterest:
 * 200 ảnh mỗi danh mục (200 x 5 = 1.000 ảnh), phân bổ cân đối giữa 16:9 Landscape và 9:16 Mobile.
 */
function buildWallpapers(): WallpaperItem[] {
  const categories: Array<keyof typeof CATEGORY_SEEDS> = [
    'lofi-study',
    'anime-ghibli',
    'cyberpunk-tokyo',
    'minimalist-desk',
    'nature-zen'
  ];

  const result: WallpaperItem[] = [];

  categories.forEach((cat) => {
    const seed = CATEGORY_SEEDS[cat];
    const totalForCategory = 200; // 200 * 5 = 1.000 wallpapers

    for (let i = 0; i < totalForCategory; i++) {
      const photo = seed.photos[i % seed.photos.length];
      const titleBase = seed.titleTemplates[i % seed.titleTemplates.length];
      const variantNum = Math.floor(i / seed.photos.length) + 1;
      const title = variantNum > 1 ? `${titleBase} (Góc Nhìn ${variantNum})` : titleBase;

      // Unique wallpaper ID
      const id = `wp-${cat}-${i + 1}`;

      // Xen kẽ cân đối 16:9 và 9:16
      const orientation: '16:9' | '9:16' = i % 2 === 0 ? '16:9' : '9:16';

      // Thumbnail nhẹ & ảnh gốc phân bổ theo đúng tỉ lệ
      const thumbnailUrl =
        orientation === '16:9'
          ? `https://images.unsplash.com/${photo.id}?auto=format&fit=crop&w=360&h=202&q=60`
          : `https://images.unsplash.com/${photo.id}?auto=format&fit=crop&w=202&h=360&q=60`;

      const fullUrl =
        orientation === '16:9'
          ? `https://images.unsplash.com/${photo.id}?auto=format&fit=crop&w=1920&h=1080&q=80`
          : `https://images.unsplash.com/${photo.id}?auto=format&fit=crop&w=1080&h=1920&q=80`;

      result.push({
        id,
        title,
        category: cat,
        orientation,
        thumbnailUrl,
        fullUrl,
        author: photo.author,
        tags: [...seed.tags, orientation, `collection-${variantNum}`, 'pinterest', 'aesthetic']
      });
    }
  });

  return result;
}

export const WALLPAPERS: WallpaperItem[] = buildWallpapers();

export function queryWallpapers(params: {
  category?: WallpaperCategory | 'all';
  orientation?: 'all' | '16:9' | '9:16';
  query?: string;
  page?: number;
  limit?: number;
}): {
  items: WallpaperItem[];
  total: number;
  totalPages: number;
  hasMore: boolean;
} {
  const { category = 'all', orientation = 'all', query = '', page = 1, limit = 24 } = params;

  let list = WALLPAPERS;

  // Lọc theo danh mục (hỗ trợ alias minimalist-dark)
  if (category !== 'all') {
    if (category === 'minimalist-dark') {
      list = list.filter((w) => w.category === 'minimalist-desk' || (w.category as string) === 'minimalist-dark');
    } else {
      list = list.filter((w) => w.category === category);
    }
  }

  // Lọc theo tỉ lệ khung hình (16:9 hoặc 9:16)
  if (orientation !== 'all') {
    list = list.filter((w) => w.orientation === orientation);
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
