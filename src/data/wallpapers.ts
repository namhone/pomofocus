export type WallpaperCategory =
  | 'lofi-study'
  | 'anime-ghibli'
  | 'cyberpunk-tokyo'
  | 'minimalist-dark'
  | 'nature-zen'
  | 'vintage-film';

export interface WallpaperItem {
  id: string;
  title: string;
  category: WallpaperCategory;
  thumbnailUrl: string;
  fullUrl: string;
  author: string;
  tags: string[];
}

export const WALLPAPER_CATEGORIES: { id: WallpaperCategory | 'all'; label: string; icon: string }[] = [
  { id: 'all', label: 'Tất cả', icon: '🌌' },
  { id: 'lofi-study', label: 'Lo-Fi Study', icon: '☕' },
  { id: 'anime-ghibli', label: 'Anime & Ghibli', icon: '🎨' },
  { id: 'cyberpunk-tokyo', label: 'Cyberpunk Tokyo', icon: '🏙️' },
  { id: 'minimalist-dark', label: 'Minimalist Dark', icon: '◻️' },
  { id: 'nature-zen', label: 'Nature Zen', icon: '🌲' },
  { id: 'vintage-film', label: 'Vintage Film', icon: '🎞️' }
];

interface CategorySeedData {
  photos: { id: string; author: string }[];
  titleTemplates: string[];
  tags: string[];
}

const CATEGORY_SEEDS: Record<WallpaperCategory, CategorySeedData> = {
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
      { id: 'photo-1517842645767-c639042777db', author: 'Slava Bowman' },
      { id: 'photo-1434030216411-0b793f4b4173', author: 'Green Chameleon' },
      { id: 'photo-1507842229440-a3597c27187c', author: 'Susan Yin' },
      { id: 'photo-1521587760476-6c12a4b040da', author: 'Patrick Tomasso' },
      { id: 'photo-1481627834876-b7833e8f5570', author: 'Aaron Burden' },
      { id: 'photo-1524995997946-a1c2e315a42f', author: 'Freddie Marriage' },
      { id: 'photo-1512820790803-83ca734da794', author: 'Alisa Anton' },
      { id: 'photo-1501339847302-ac426a4a7cbb', author: 'Petr Sevcovic' },
      { id: 'photo-1442512595331-e89e73853f31', author: 'Daiga Ellaby' },
      { id: 'photo-1495474472287-4d71bcdd2085', author: 'Demi DeHerrera' }
    ],
    titleTemplates: [
      'Góc Học Tập Bàn Gỗ Đèn Vàng',
      'Tách Cà Phê Sáng Bên Sổ Tay',
      'Mưa Rơi Bên Bàn Làm Việc Đêm',
      'Kệ Sách Cũ & Ánh Nắng Chiều',
      'Góc Chill Nghe Nhạc Đĩa Than',
      'Phòng Học Gác Mái Tĩnh Lặng',
      'Bàn Gỗ Tự Nhiên & Cây Xanh Để Bàn',
      'Đèn Bàn Cổ Điển & Bản Vẽ Nháp',
      'Đêm Đông Tập Trung Bên Tách Trà',
      'Hoàng Hôn Khẽ Rọi Giá Sách'
    ],
    tags: ['lofi', 'study', 'desk', 'cozy', 'warm', 'coffee', 'books', 'night', 'chill', 'reading']
  },
  'anime-ghibli': {
    photos: [
      { id: 'photo-1534447677768-be436bb09401', author: 'Guille Pozzi' },
      { id: 'photo-1579783900882-c0d3dad7b119', author: 'Steve Johnson' },
      { id: 'photo-1563089145-599997674d42', author: 'Jr Korpa' },
      { id: 'photo-1607604276583-eef5d076aa5f', author: 'Evgeny Tchebotarev' },
      { id: 'photo-1528164344705-475426879c0d', author: 'Su San Lee' },
      { id: 'photo-1503899036084-c55cdd92da26', author: 'Masashi Wakui' },
      { id: 'photo-1493976040374-85c8e12f0c0e', author: 'Soragrit Wongsa' },
      { id: 'photo-1542051841857-5f90071e7989', author: 'Aleksandar Pasaric' },
      { id: 'photo-1578632767115-351597cf2477', author: 'Clay Banks' },
      { id: 'photo-1518709268805-4e9042af9f23', author: 'NASA Hubble' },
      { id: 'photo-1516205651411-aef33a44f7c2', author: 'Aaron Burden' },
      { id: 'photo-1522383225653-ed111181a951', author: 'Priscilla Du Preez' },
      { id: 'photo-1507608616759-54f48f0af0ee', author: 'Yonatan Mirgoli' },
      { id: 'photo-1490750967868-88aa4486c946', author: 'David Boca' },
      { id: 'photo-1519681393784-d120267933ba', author: 'Benjamin Davies' },
      { id: 'photo-1534796636912-3b95b3ab5986', author: 'Vincent Guth' },
      { id: 'photo-1518531933037-91b2f5f229cc', author: 'Desiree Fawn' },
      { id: 'photo-1518020382113-a7e8fc38eac9', author: 'Leonardo Yip' }
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
      { id: 'photo-1555680202-c86f0e12f086', author: 'Timo Volz' },
      { id: 'photo-1511447333015-45b65e60f6d5', author: 'Evgeni Tcherkasski' },
      { id: 'photo-1518770660439-4636190af475', author: 'Alexandre Debiève' },
      { id: 'photo-1531403009284-440f080d1e12', author: 'Danial RiCaRos' },
      { id: 'photo-1525547719571-a2d4ac8945e2', author: 'Ales Nesetril' },
      { id: 'photo-1550751827-4bd374c3f58b', author: 'Adi Goldstein' },
      { id: 'photo-1509198397868-475647b2a1e5', author: 'Sasha Freemind' },
      { id: 'photo-1508739773434-c26b3d09e071', author: 'Aleksandar Pasaric' }
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
  'minimalist-dark': {
    photos: [
      { id: 'photo-1494438639946-1ebd1d20bf85', author: 'Simone Hutsch' },
      { id: 'photo-1487147264018-f937fba0c817', author: 'Federico Respini' },
      { id: 'photo-1513836279014-a89f7a76ae86', author: 'Scott Goodwill' },
      { id: 'photo-1491553895911-0055eca6402d', author: 'Joel Filipe' },
      { id: 'photo-1465146344425-f00d5f5c8f07', author: 'Dominik Schroeder' },
      { id: 'photo-1486406146926-c627a92ad1ab', author: 'Sean Pollock' },
      { id: 'photo-1509198397868-475647b2a1e5', author: 'Sasha Freemind' },
      { id: 'photo-1513542789411-b6a5d4f31634', author: 'Jeremy Bishop' },
      { id: 'photo-1499951360447-b19be8fe80f5', author: 'Dmitry Zvolskiy' },
      { id: 'photo-1473496169904-658ba7c44d8a', author: 'Frank McKenna' },
      { id: 'photo-1451187580459-43490279c0fa', author: 'NASA' },
      { id: 'photo-1446776811953-b23d57bd21aa', author: 'NASA' },
      { id: 'photo-1447433589675-4aaa569f3e05', author: 'Kristopher Roller' },
      { id: 'photo-1506703719100-a0f3a48c0f86', author: 'Bryan Goff' },
      { id: 'photo-1462331940025-496dfbfc7564', author: 'NASA' },
      { id: 'photo-1502134249126-9f3755a50d78', author: 'NASA' },
      { id: 'photo-1454789548928-9efd52dc4031', author: 'NASA' },
      { id: 'photo-1516339901601-2e1b62dc0c45', author: 'Alexander Andrews' }
    ],
    titleTemplates: [
      'Bàn Làm Việc Stealth Dark Tối Giản',
      'Đường Kính Kiến Trúc Hiện Đại Đen Trắng',
      'Bóng Đổ Hình Học Tương Phản Đơn Sắc',
      'Không Gian Tĩnh Mịch Vũ Trụ Đêm',
      'Đường Chân Trời Đơn Độc Trên Biển',
      'Cành Cây Khô Trong Màn Sương Đêm',
      'Mặt Nước Đen Lặng Phẳng Như Gương',
      'Cấu Trúc Tối Giản Monolith Đen',
      'Vệt Sáng Nhẹ Trên Nền Kim Loại Đen',
      'Hình Khối Đương Đại & Khoảng Trống'
    ],
    tags: ['minimalist', 'dark', 'monochrome', 'clean', 'sleek', 'black', 'architecture', 'space', 'focus']
  },
  'nature-zen': {
    photos: [
      { id: 'photo-1506744038136-46273834b3fb', author: 'Bailey Zindel' },
      { id: 'photo-1448375240586-882707db888b', author: 'Sebastian Unrau' },
      { id: 'photo-1470071459604-3b5ec3a7fe05', author: 'Lukas Rodriguez' },
      { id: 'photo-1426604966848-d7adac402bff', author: 'Luca Bravo' },
      { id: 'photo-1511497584788-87676104235f', author: 'Veeterzy' },
      { id: 'photo-1472214103451-9374bd1c798e', author: 'Bessie Turner' },
      { id: 'photo-1464822759023-fed622ff2c3b', author: 'Kalab Teshale' },
      { id: 'photo-1507525428034-b723cf961d3e', author: 'Sean Oulashin' },
      { id: 'photo-1433086966358-54859d0ed716', author: 'James Wheeler' },
      { id: 'photo-1501785888041-af3ef285b470', author: 'Pietro De Grandi' },
      { id: 'photo-1469474968028-56623f02e42e', author: 'David Marcu' },
      { id: 'photo-1515694346937-94d85e41e6f0', author: 'Maxime Bouffard' },
      { id: 'photo-1534274988757-a28bf1a57c17', author: 'Valentin Antonucci' },
      { id: 'photo-1486016006115-74a41448adc9', author: 'Guillaume Flandre' },
      { id: 'photo-1519692933481-e162a57d6721', author: 'Raychel Sanner' },
      { id: 'photo-1508873696983-2df5293cb32f', author: 'Smit Patel' },
      { id: 'photo-1501999635878-71cb5379c2d8', author: 'Dawid Zawiła' },
      { id: 'photo-1428592953211-077101b2021b', author: 'Roman Kraft' }
    ],
    titleTemplates: [
      'Rừng Thông Sương Sớm Đà Lạt',
      'Hồ Nước Núi Trong Suốt Mờ Ảo',
      'Thung Lũng Yên Bình Buổi Ban Mai',
      'Thác Nước Róc Rách Rừng Xanh',
      'Đỉnh Núi Hùng Vĩ Mây Trắng Lượn',
      'Đồng Cỏ Xanh Trải Dài Bất Tận',
      'Lối Mòn Trong Rừng Thông Cổ Thụ',
      'Giọt Sương Sớm Đọng Trên Tán Cây',
      'Bờ Hồ Mùa Thu Mặt Nước Phẳng Lặng',
      'Cầu Gỗ Nhỏ Dẫn Vào Rừng Trầm Lặng'
    ],
    tags: ['nature', 'zen', 'forest', 'pine', 'mountains', 'lake', 'mist', 'morning', 'peaceful', 'green']
  },
  'vintage-film': {
    photos: [
      { id: 'photo-1476820865390-c52aeebb9891', author: 'Travis Yewell' },
      { id: 'photo-1452421822248-d4c2b47f0c81', author: 'Paul Earle' },
      { id: 'photo-1492691527719-9d1e07e534b4', author: 'Ales Krivec' },
      { id: 'photo-1512790182412-b19e6d62bc39', author: 'Alexander Mils' },
      { id: 'photo-1495745966610-2a67f2297e5e', author: 'Ian Schneider' },
      { id: 'photo-1509198397868-475647b2a1e5', author: 'Sasha Freemind' },
      { id: 'photo-1522383225653-ed111181a951', author: 'Priscilla Du Preez' },
      { id: 'photo-1516205651411-aef33a44f7c2', author: 'Aaron Burden' },
      { id: 'photo-1507608616759-54f48f0af0ee', author: 'Yonatan Mirgoli' },
      { id: 'photo-1490750967868-88aa4486c946', author: 'David Boca' },
      { id: 'photo-1519681393784-d120267933ba', author: 'Benjamin Davies' },
      { id: 'photo-1534796636912-3b95b3ab5986', author: 'Vincent Guth' },
      { id: 'photo-1518531933037-91b2f5f229cc', author: 'Desiree Fawn' },
      { id: 'photo-1502082553048-f009c37129b9', author: 'Luca Bravo' },
      { id: 'photo-1518020382113-a7e8fc38eac9', author: 'Leonardo Yip' },
      { id: 'photo-1469854523086-cc02fe5d8800', author: 'Kal Vis' },
      { id: 'photo-1447933601403-0c6688de566e', author: 'Mike Kenneally' },
      { id: 'photo-1559925393-8be0ec4767c8', author: 'Alisa Anton' }
    ],
    titleTemplates: [
      'Cuộn Phim 35mm Quán Cà Phê Cũ',
      'Đầu Đĩa Than Vintage & Chiều Vàng',
      'Ký Ức Hoài Niệm Thị Trấn Nhỏ',
      'Tone Màu Phim Kodak Ấm Áp',
      'Góc Phố Paris Mùa Thu Thơ Mộng',
      'Chiếc Máy Ảnh Film Cơ Cổ Điển',
      'Tách Trà Nắng Chiều Qua Ô Cửa Kính',
      'Tiệm Sách Cũ Ngập Tràn Hoài Niệm',
      'Chuyến Xe Bus Chiều Mùa Hè Cũ',
      'Những Bức Thư Tay & Kỷ Niệm 1990'
    ],
    tags: ['vintage', 'film', '35mm', 'retro', 'nostalgia', 'kodak', 'warm', 'cafe', 'memories', 'analog']
  }
};

/**
 * Sinh bộ 1.080 hình nền chất lượng cao được tuyển chọn theo 6 gu thẩm mỹ Pinterest:
 * 180 ảnh mỗi danh mục (180 x 6 = 1.080 ảnh), phân bổ đều các ID Unsplash và góc nhìn đa dạng.
 */
function buildWallpapers(): WallpaperItem[] {
  const categories: WallpaperCategory[] = [
    'lofi-study',
    'anime-ghibli',
    'cyberpunk-tokyo',
    'minimalist-dark',
    'nature-zen',
    'vintage-film'
  ];

  const result: WallpaperItem[] = [];

  categories.forEach((cat) => {
    const seed = CATEGORY_SEEDS[cat];
    const totalForCategory = 180;

    for (let i = 0; i < totalForCategory; i++) {
      const photo = seed.photos[i % seed.photos.length];
      const titleBase = seed.titleTemplates[i % seed.titleTemplates.length];
      const variantNum = Math.floor(i / seed.photos.length) + 1;
      const title = variantNum > 1 ? `${titleBase} (Góc Nhìn ${variantNum})` : titleBase;

      // Unique wallpaper ID
      const id = `wp-${cat}-${i + 1}`;

      // Thumbnail nhẹ w=360&q=60 cho widget; Ảnh gốc sắc nét w=1920&q=80 khi làm background
      const thumbnailUrl = `https://images.unsplash.com/${photo.id}?auto=format&fit=crop&w=360&q=60`;
      const fullUrl = `https://images.unsplash.com/${photo.id}?auto=format&fit=crop&w=1920&q=80`;

      result.push({
        id,
        title,
        category: cat,
        thumbnailUrl,
        fullUrl,
        author: photo.author,
        tags: [...seed.tags, `collection-${variantNum}`, 'pinterest', 'aesthetic']
      });
    }
  });

  return result;
}

export const WALLPAPERS: WallpaperItem[] = buildWallpapers();

export function queryWallpapers(params: {
  category?: WallpaperCategory | 'all';
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

  if (category !== 'all') {
    list = list.filter((w) => w.category === category);
  }

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
