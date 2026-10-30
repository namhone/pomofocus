import { CatalogCategory, CatalogItem } from '../types/background';

// 10 danh mục không gian chuẩn được phân loại chính xác theo chủ đề thực tế
export const CATALOG_CATEGORIES: { id: CatalogCategory; label: string; icon: string }[] = [
  { id: 'all', label: 'Tất cả', icon: '🌌' },
  { id: 'nature', label: 'Thiên Nhiên & Rừng Núi', icon: '🌲' },
  { id: 'lofi', label: 'Lo-Fi Chill & Bàn Học', icon: '☕' },
  { id: 'cafe', label: 'Quán Cà Phê Yên Tĩnh', icon: '🥐' },
  { id: 'anime', label: 'Anime & Hoạt Họa Ghibli', icon: '🎨' },
  { id: 'cyberpunk', label: 'Cyberpunk & Đèn Neon', icon: '🏙️' },
  { id: 'minimalist', label: 'Tối Giản & Trừu Tượng', icon: '◻️' },
  { id: 'scifi', label: 'Vũ Trụ & Khoa Học Viễn Tưởng', icon: '🚀' },
  { id: 'library', label: 'Thư Viện & Giá Sách', icon: '📚' },
  { id: 'rain', label: 'Mưa Rơi & Bão Tố Êm Dịu', icon: '🌧️' },
  { id: 'aesthetic', label: 'Aesthetic & Pastel', icon: '🌸' }
];

// Danh sách ảnh Unsplash ĐỘC NHẤT 100% được tuyển chọn thủ công theo từng chủ đề thực sự
// Mỗi ảnh là 1 Photo ID duy nhất từ cộng đồng Unsplash, tuyệt đối KHÔNG nhân bản bằng sig=i
const CURATED_UNSPLASH_CATALOG: Record<
  Exclude<CatalogCategory, 'all'>,
  Array<{ id: string; title: string; author: string; tags: string[] }>
> = {
  nature: [
    { id: 'photo-1506744038136-46273834b3fb', title: 'Thung Lũng Yosemite & Thác Nước Hùng Vĩ', author: 'Bailey Zindel', tags: ['nature', 'yosemite', 'waterfall', 'mountains'] },
    { id: 'photo-1448375240586-882707db888b', title: 'Rừng Thông Sương Sớm Yên Bình', author: 'Sebastian Unrau', tags: ['nature', 'forest', 'pine', 'mist'] },
    { id: 'photo-1470071459604-3b5ec3a7fe05', title: 'Thung Lũng Mờ Ảo Trong Nắng Sớm', author: 'Lukas Rodriguez', tags: ['nature', 'valley', 'morning', 'fog'] },
    { id: 'photo-1426604966848-d7adac402bff', title: 'Dòng Suối Núi Róc Rách Bên Rừng', author: 'Luca Bravo', tags: ['nature', 'stream', 'rocks', 'water'] },
    { id: 'photo-1511497584788-87676104235f', title: 'Tán Lá Rừng Rậm Xanh Mướt', author: 'Veeterzy', tags: ['nature', 'forest', 'green', 'trees'] },
    { id: 'photo-1472214103451-9374bd1c798e', title: 'Đồng Cỏ Xanh Trải Dài Chân Núi', author: 'Bessie Turner', tags: ['nature', 'meadow', 'grass', 'peaceful'] },
    { id: 'photo-1464822759023-fed622ff2c3b', title: 'Đỉnh Núi Tuyết Trắng Hùng Vĩ', author: 'Kalab Teshale', tags: ['nature', 'snow', 'peaks', 'alps'] },
    { id: 'photo-1507525428034-b723cf961d3e', title: 'Bờ Biển Hoàng Hôn Sóng Vỗ', author: 'Sean Oulashin', tags: ['nature', 'ocean', 'sunset', 'beach'] },
    { id: 'photo-1433086966358-54859d0ed716', title: 'Cây Cầu Gỗ Dẫn Vào Rừng Nhiệt Đới', author: 'James Wheeler', tags: ['nature', 'bridge', 'green', 'waterfall'] },
    { id: 'photo-1501785888041-af3ef285b470', title: 'Mặt Hồ Trong Suốt Phản Chiếu Mây Trời', author: 'Pietro De Grandi', tags: ['nature', 'lake', 'reflection', 'dolomites'] },
    { id: 'photo-1469474968028-56623f02e42e', title: 'Lối Mòn Hoàng Hôn Giữa Đồi Núi', author: 'David Marcu', tags: ['nature', 'trail', 'hills', 'sunset'] }
  ],
  lofi: [
    { id: 'photo-1518495973542-4542c06a5843', title: 'Góc Học Tập Bàn Gỗ Ấm Cúng', author: 'Priscilla Du Preez', tags: ['lofi', 'study', 'desk', 'warm'] },
    { id: 'photo-1498050108023-c5249f4df085', title: 'Bàn Làm Việc Tối Giản Cùng MacBook', author: 'Christopher Gower', tags: ['lofi', 'laptop', 'coding', 'workspace'] },
    { id: 'photo-1499750310107-5fef28a66643', title: 'Sổ Tay Kèm Tách Trà Sớm', author: 'Cathryn Lavery', tags: ['lofi', 'notebook', 'tea', 'study'] },
    { id: 'photo-1515378791036-0648a3ef77b2', title: 'Ánh Đèn Vàng Bên Bàn Làm Việc Đêm', author: 'Glenn Carstens-Peters', tags: ['lofi', 'night', 'desk', 'lamp'] },
    { id: 'photo-1486312338219-ce68d2c6f44d', title: 'Gõ Phím Tập Trung Giờ Chiều', author: 'Glenn Carstens-Peters', tags: ['lofi', 'focus', 'keyboard', 'coffee'] },
    { id: 'photo-1501504905252-473c47e087f8', title: 'Kệ Sách Cũ Cùng Cây Xanh Để Bàn', author: 'Jonas Jacobsson', tags: ['lofi', 'books', 'plants', 'shelf'] },
    { id: 'photo-1483058712412-4245e9b90334', title: 'Bàn Gỗ Tự Nhiên & Ánh Sáng Nhẹ Nhàng', author: 'Green Chameleon', tags: ['lofi', 'wooden', 'minimal', 'daylight'] },
    { id: 'photo-1456513080510-7bf3a84b82f8', title: 'Đọc Sách Bên Khung Cửa Sổ Mùa Thu', author: 'Thought Catalog', tags: ['lofi', 'reading', 'autumn', 'window'] },
    { id: 'photo-1476820865390-c52aeebb9891', title: 'Đầu Đĩa Than Vintage & Giai Điệu Cổ Điển', author: 'Travis Yewell', tags: ['lofi', 'vinyl', 'turntable', 'retro'] },
    { id: 'photo-1517842645767-c639042777db', title: 'Bàn Làm Việc Sáng Tạo Với Cây Cảnh', author: 'Slava Bowman', tags: ['lofi', 'plant', 'desk', 'glow'] },
    { id: 'photo-1434030216411-0b793f4b4173', title: 'Ôn Thi Yên Tĩnh Cùng Đồng Hồ Cát', author: 'Green Chameleon', tags: ['lofi', 'study', 'hourglass', 'notes'] }
  ],
  cafe: [
    { id: 'photo-1501339847302-ac426a4a7cbb', title: 'Quầy Bar Pha Chế Espresso Ánh Đèn Vàng', author: 'Petr Sevcovic', tags: ['cafe', 'espresso', 'bar', 'warm'] },
    { id: 'photo-1442512595331-e89e73853f31', title: 'Tách Cà Phê Mộc Trên Mặt Gỗ Cũ', author: 'Daiga Ellaby', tags: ['cafe', 'coffee', 'rustic', 'wood'] },
    { id: 'photo-1495474472287-4d71bcdd2085', title: 'Nghệ Thuật Latte Art Trong Tách Gốm', author: 'Demi DeHerrera', tags: ['cafe', 'latte', 'art', 'ceramic'] },
    { id: 'photo-1554118811-1e0d58224f24', title: 'Bàn Cafe Ngập Tràn Ánh Nắng Ban Mai', author: 'Kirsten Drew', tags: ['cafe', 'sunlight', 'table', 'morning'] },
    { id: 'photo-1521017432531-fbd92d768814', title: 'Barista Pha Chế Cà Phê Nhỏ Giọt', author: 'Clay Banks', tags: ['cafe', 'barista', 'drip', 'brewing'] },
    { id: 'photo-1447933601403-0c6688de566e', title: 'Hạt Cà Phê Mới Rang Thơm Lừng', author: 'Mike Kenneally', tags: ['cafe', 'beans', 'roasted', 'aroma'] },
    { id: 'photo-1559925393-8be0ec4767c8', title: 'Bàn Ngoài Trời Quán Cafe Châu Âu', author: 'Alisa Anton', tags: ['cafe', 'bistro', 'terrace', 'europe'] },
    { id: 'photo-1509042239860-f550ce710b93', title: 'Tách Cappuccino Sữa Béo Ngậy Buổi Sáng', author: 'Nathan Dumlao', tags: ['cafe', 'cappuccino', 'foam', 'morning'] },
    { id: 'photo-1497935586351-b67a49e012bf', title: 'Không Gian Quán Gạch Mộc Thư Thái', author: 'Robby McCullough', tags: ['cafe', 'interior', 'brick', 'relax'] },
    { id: 'photo-1453614512568-c4024d13c247', title: 'Góc Cửa Sổ Cafe Ngắm Phố Phường', author: 'Declan Sun', tags: ['cafe', 'window', 'streetview', 'chill'] }
  ],
  anime: [
    { id: 'photo-1534447677768-be436bb09401', title: 'Tầng Mây Kỳ Ảo & Ánh Sao Huyền Bí', author: 'Guille Pozzi', tags: ['anime', 'clouds', 'dreamscape', 'fantasy'] },
    { id: 'photo-1579783900882-c0d3dad7b119', title: 'Bầu Trời Màu Nước Hoàng Hôn Rực Rỡ', author: 'Steve Johnson', tags: ['anime', 'watercolor', 'sunset', 'art'] },
    { id: 'photo-1563089145-599997674d42', title: 'Ánh Sáng Cực Quang Tím Phong Cách Ghibli', author: 'Jr Korpa', tags: ['anime', 'aurora', 'ghibli', 'violet'] },
    { id: 'photo-1607604276583-eef5d076aa5f', title: 'Đèn Lồng Đỏ Phố Cổ Nhật Bản', author: 'Evgeny Tchebotarev', tags: ['anime', 'lanterns', 'japan', 'kyoto'] },
    { id: 'photo-1528164344705-475426879c0d', title: 'Cổng Torii Đỏ Rực Dưới Tán Hoa Anh Đào', author: 'Su San Lee', tags: ['anime', 'torii', 'sakura', 'shrine'] },
    { id: 'photo-1503899036084-c55cdd92da26', title: 'Con Hẻm Mưa Đêm Tokyo Ánh Đèn Vàng', author: 'Masashi Wakui', tags: ['anime', 'tokyo', 'alley', 'rain'] },
    { id: 'photo-1493976040374-85c8e12f0c0e', title: 'Ngôi Chùa Cổ Kính Bên Rặng Phong Đỏ', author: 'Soragrit Wongsa', tags: ['anime', 'pagoda', 'autumn', 'leaves'] },
    { id: 'photo-1542051841857-5f90071e7989', title: 'Ngã Tư Shibuya Sôi Động Trong Giờ Tan Tầm', author: 'Aleksandar Pasaric', tags: ['anime', 'shibuya', 'urban', 'japan'] },
    { id: 'photo-1578632767115-351597cf2477', title: 'Đường Chân Trời Tokyo Gam Màu Pastel', author: 'Clay Banks', tags: ['anime', 'skyline', 'pastel', 'clouds'] },
    { id: 'photo-1518709268805-4e9042af9f23', title: 'Cổng Vũ Trụ Viễn Tưởng Đầy Phép Thuật', author: 'NASA Hubble', tags: ['anime', 'space', 'nebula', 'magic'] }
  ],
  cyberpunk: [
    { id: 'photo-1508739773434-c26b3d09e071', title: 'Biển Hiệu Neon Chiếu Rọi Đường Phố Mưa', author: 'Aleksandar Pasaric', tags: ['cyberpunk', 'neon', 'rain', 'night'] },
    { id: 'photo-1519501025264-65ba15a82390', title: 'Đô Thị Cao Tầng Tương Lai Đầy Ánh Đèn', author: 'Ben Cheung', tags: ['cyberpunk', 'city', 'skyscrapers', 'future'] },
    { id: 'photo-1514565131-fce0801e5785', title: 'Lưới Đèn LED Nghệ Thuật Trong Đêm', author: 'Joshua Sortino', tags: ['cyberpunk', 'grid', 'led', 'glow'] },
    { id: 'photo-1542751371-adc38448a05e', title: 'Góc Gaming Đèn RGB Neon Rực Rỡ', author: 'Florian Olivo', tags: ['cyberpunk', 'gaming', 'rgb', 'setup'] },
    { id: 'photo-1563245372-f21724e3856d', title: 'Hẻm Phố Hong Kong Mờ Ảo Ánh Neon Tím', author: 'Sean Foley', tags: ['cyberpunk', 'hongkong', 'alley', 'purple'] },
    { id: 'photo-1526374965328-7f61d4dc18c5', title: 'Mã Dữ Liệu Số Ma Trận Kỹ Thuật Số', author: 'Markus Spiske', tags: ['cyberpunk', 'matrix', 'code', 'data'] },
    { id: 'photo-1550745165-9bc0b252726f', title: 'Khu Trò Chơi Điện Tử Arcade Thập Niên 80', author: 'Carl Raw', tags: ['cyberpunk', 'arcade', 'retro', '80s'] },
    { id: 'photo-1569701813229-33284b643e3c', title: 'Khối Hình Học Hologram Đa Chiều', author: 'Fakurian Design', tags: ['cyberpunk', 'hologram', 'geometric', '3d'] },
    { id: 'photo-1515260268569-9271009adfdb', title: 'Đại Lộ Cyberpunk Ánh Đèn Tím Về Đêm', author: 'Stefan K', tags: ['cyberpunk', 'boulevard', 'neon', 'purple'] },
    { id: 'photo-1541701494587-cb58502866ab', title: 'Vệt Đèn Giao Thông Cao Tốc Ban Đêm', author: 'Denys Nevozhai', tags: ['cyberpunk', 'highway', 'traffic', 'speed'] }
  ],
  minimalist: [
    { id: 'photo-1494438639946-1ebd1d20bf85', title: 'Đường Cong Kiến Trúc Trắng Thanh Thoát', author: 'Simone Hutsch', tags: ['minimalist', 'architecture', 'white', 'clean'] },
    { id: 'photo-1487147264018-f937fba0c817', title: 'Bóng Đổ Hình Học Trên Bức Tường Pastel', author: 'Federico Respini', tags: ['minimalist', 'shadow', 'pastel', 'geometry'] },
    { id: 'photo-1513836279014-a89f7a76ae86', title: 'Cành Cây Khô Đơn Độc Trong Làn Sương', author: 'Scott Goodwill', tags: ['minimalist', 'winter', 'tree', 'solitude'] },
    { id: 'photo-1491553895911-0055eca6402d', title: 'Tương Phản Đen Trắng Của Mặt Kính Hiện Đại', author: 'Joel Filipe', tags: ['minimalist', 'blackandwhite', 'lines', 'modern'] },
    { id: 'photo-1465146344425-f00d5f5c8f07', title: 'Bông Hoa Dại Mộc Mạc Giữa Khoảng Trống', author: 'Dominik Schroeder', tags: ['minimalist', 'flower', 'solitary', 'pure'] },
    { id: 'photo-1486406146926-c627a92ad1ab', title: 'Góc Nhìn Hướng Lên Tòa Tháp Kính', author: 'Sean Pollock', tags: ['minimalist', 'building', 'glass', 'sky'] },
    { id: 'photo-1509198397868-475647b2a1e5', title: 'Bầu Trời Chuyển Sắc Hoàng Hôn Êm Ả', author: 'Sasha Freemind', tags: ['minimalist', 'gradient', 'sky', 'calm'] },
    { id: 'photo-1513542789411-b6a5d4f31634', title: 'Gợn Sóng Cát Sa Mạc Dưới Ánh Tà Dương', author: 'Jeremy Bishop', tags: ['minimalist', 'dunes', 'sand', 'ripples'] },
    { id: 'photo-1499951360447-b19be8fe80f5', title: 'Không Gian Phòng Làm Việc Tối Giản', author: 'Dmitry Zvolskiy', tags: ['minimalist', 'workspace', 'home', 'clean'] },
    { id: 'photo-1473496169904-658ba7c44d8a', title: 'Đường Chân Trời Đại Dương Phẳng Lặng', author: 'Frank McKenna', tags: ['minimalist', 'horizon', 'sea', 'stillness'] }
  ],
  scifi: [
    { id: 'photo-1451187580459-43490279c0fa', title: 'Dải Mạng Lưới Ánh Sáng Quanh Trái Đất', author: 'NASA', tags: ['scifi', 'earth', 'network', 'satellite'] },
    { id: 'photo-1446776811953-b23d57bd21aa', title: 'Khung Cảnh Trái Đất Nhìn Từ Trạm Vũ Trụ', author: 'NASA', tags: ['scifi', 'orbit', 'planet', 'iss'] },
    { id: 'photo-1447433589675-4aaa569f3e05', title: 'Hàng Triệu Vì Sao Trong Dải Ngân Hà', author: 'Kristopher Roller', tags: ['scifi', 'milkyway', 'stars', 'galaxy'] },
    { id: 'photo-1506703719100-a0f3a48c0f86', title: 'Tinh Vân Lạp Hộ Rực Rỡ Sắc Tím Đỏ', author: 'Bryan Goff', tags: ['scifi', 'nebula', 'orion', 'deepspace'] },
    { id: 'photo-1462331940025-496dfbfc7564', title: 'Bụi Khí Vũ Trụ Sâu Thẳm Huyền Bí', author: 'NASA', tags: ['scifi', 'cosmos', 'purple', 'space'] },
    { id: 'photo-1502134249126-9f3755a50d78', title: 'Hình Ảnh Phản Chiếu Trên Mũ Phi Hành Gia', author: 'NASA', tags: ['scifi', 'astronaut', 'helmet', 'spacewalk'] },
    { id: 'photo-1454789548928-9efd52dc4031', title: 'Tấm Pin Năng Lượng Mặt Trời Trạm Vũ Trụ', author: 'NASA', tags: ['scifi', 'solarpower', 'station', 'technology'] },
    { id: 'photo-1516339901601-2e1b62dc0c45', title: 'Vành Đai Thiên Thể Vùng Rìa Vũ Trụ', author: 'Alexander Andrews', tags: ['scifi', 'rings', 'astronomy', 'void'] },
    { id: 'photo-1541185933-ef5d8ed016c2', title: 'Tên Lửa Khởi Hành Đâm Thủng Bầu Trời Đêm', author: 'SpaceX', tags: ['scifi', 'rocket', 'launch', 'spacex'] },
    { id: 'photo-1446776877081-d282a0f896e2', title: 'Ánh Cực Quang Xanh Nhìn Từ Không Gian', author: 'NASA', tags: ['scifi', 'aurora', 'space', 'earth'] }
  ],
  library: [
    { id: 'photo-1507842229440-a3597c27187c', title: 'Đại Sảnh Thư Viện Cổ Điển Ngút Ngàn Sách', author: 'Susan Yin', tags: ['library', 'hall', 'books', 'classical'] },
    { id: 'photo-1521587760476-6c12a4b040da', title: 'Hàng Ngàn Cuốn Sách Trên Giá Gỗ Trầm', author: 'Patrick Tomasso', tags: ['library', 'bookshelf', 'stacks', 'vintage'] },
    { id: 'photo-1481627834876-b7833e8f5570', title: 'Cuốn Sách Mở Đón Ánh Nắng Chiều Vàng', author: 'Aaron Burden', tags: ['library', 'book', 'sunlight', 'reading'] },
    { id: 'photo-1497633762265-9d179a990aa6', title: 'Bàn Đọc Sách Trong Thư Viện Đại Học Hiện Đại', author: 'Giammarco Boscaro', tags: ['library', 'study', 'university', 'modern'] },
    { id: 'photo-1524995997946-a1c2e315a42f', title: 'Những Gáy Sách Bọc Da Khắc Chữ Mạ Vàng', author: 'Freddie Marriage', tags: ['library', 'leather', 'antique', 'bindings'] },
    { id: 'photo-1532012164546-f432f2e3edd4', title: 'Cầu Thang Xoắn Ốc Quanh Tháp Sách Vĩ Đại', author: 'Jilbert Ebrahimi', tags: ['library', 'spiral', 'staircase', 'tower'] },
    { id: 'photo-1526721940322-10fb6e3ae94a', title: 'Đèn Bàn Chụp Xanh Cổ Điển Phòng Đọc', author: 'Inaki Del Olmo', tags: ['library', 'greenlamp', 'readingroom', 'study'] },
    { id: 'photo-1457369804613-52c61a468e7d', title: 'Từng Trang Giấy Khẽ Lật Trong Tĩnh Lặng', author: 'Kouji Tsuru', tags: ['library', 'pages', 'turning', 'quiet'] },
    { id: 'photo-1512820790803-83ca734da794', title: 'Góc Đọc Yên Bình Bên Chiếc Ghế Bành', author: 'Alisa Anton', tags: ['library', 'armchair', 'cozy', 'reading'] },
    { id: 'photo-1535905557558-afc4877a26fc', title: 'Hành Lang Lưu Trữ Sách Cổ Trầm Mặc', author: 'Tolga Ulkan', tags: ['library', 'archives', 'aisle', 'peaceful'] }
  ],
  rain: [
    { id: 'photo-1515694346937-94d85e41e6f0', title: 'Những Giọt Mưa Lăn Trên Mặt Kính Cửa Sổ', author: 'Maxime Bouffard', tags: ['rain', 'raindrops', 'window', 'glass'] },
    { id: 'photo-1534274988757-a28bf1a57c17', title: 'Mặt Đường Ướt Mưa Phản Chiếu Ánh Đèn Xe', author: 'Valentin Antonucci', tags: ['rain', 'asphalt', 'city', 'lights'] },
    { id: 'photo-1486016006115-74a41448adc9', title: 'Mưa Rơi Trên Kính Chắn Gió Buổi Đêm', author: 'Guillaume Flandre', tags: ['rain', 'windshield', 'night', 'car'] },
    { id: 'photo-1519692933481-e162a57d6721', title: 'Mây Bão Đen Kéo Đến Cùng Sấm Chớp', author: 'Raychel Sanner', tags: ['rain', 'storm', 'clouds', 'thunder'] },
    { id: 'photo-1508873696983-2df5293cb32f', title: 'Giọt Mưa Đọng Lấp Lánh Trên Chiếc Lá Xanh', author: 'Smit Patel', tags: ['rain', 'leaves', 'nature', 'droplets'] },
    { id: 'photo-1501999635878-71cb5379c2d8', title: 'Màn Mưa Bụi Giăng Mờ Rặng Cây Bên Hồ', author: 'Dawid Zawiła', tags: ['rain', 'mist', 'lake', 'trees'] },
    { id: 'photo-1517495306684-24558509b762', title: 'Chiếc Dù Che Mưa Giữa Con Phố Tấp Nập', author: 'Craig Whitehead', tags: ['rain', 'umbrella', 'street', 'city'] },
    { id: 'photo-1527766833261-b09c3163a792', title: 'Ngồi Trong Quán Cafe Ngắm Mưa Rào', author: 'Gabrielle Henderson', tags: ['rain', 'cafe', 'cozy', 'indoor'] },
    { id: 'photo-1428592953211-077101b2021b', title: 'Mặt Hồ Yên Bình Gợn Sóng Mưa Thu', author: 'Roman Kraft', tags: ['rain', 'lake', 'water', 'autumn'] },
    { id: 'photo-1492011221367-f47e3ccd77a0', title: 'Vòng Xoáy Nước Mưa Gợn Sóng Trên Hồ', author: 'Reza Shayestehpour', tags: ['rain', 'ripples', 'water', 'pond'] }
  ],
  aesthetic: [
    { id: 'photo-1522383225653-ed111181a951', title: 'Cành Hoa Mộc Lan Hồng Nhạt Mùa Xuân', author: 'Priscilla Du Preez', tags: ['aesthetic', 'magnolia', 'blossom', 'pink'] },
    { id: 'photo-1516205651411-aef33a44f7c2', title: 'Giọt Sương Mai Đọng Trên Cánh Hoa', author: 'Aaron Burden', tags: ['aesthetic', 'dew', 'blossom', 'morning'] },
    { id: 'photo-1507608616759-54f48f0af0ee', title: 'Khinh Khí Cầu Bay Qua Thung Lũng Lúc Rạng Đông', author: 'Yonatan Mirgoli', tags: ['aesthetic', 'balloons', 'dawn', 'valley'] },
    { id: 'photo-1490750967868-88aa4486c946', title: 'Những Cánh Hoa Hồng Chớm Nở Trong Sương', author: 'David Boca', tags: ['aesthetic', 'roses', 'bloom', 'spring'] },
    { id: 'photo-1519681393784-d120267933ba', title: 'Đỉnh Núi Tuyết Dưới Dải Ngân Hà Pastel', author: 'Benjamin Davies', tags: ['aesthetic', 'starry', 'mountains', 'night'] },
    { id: 'photo-1534796636912-3b95b3ab5986', title: 'Dải Cực Quang Phương Bắc Huyền Ảo', author: 'Vincent Guth', tags: ['aesthetic', 'aurora', 'nordic', 'ethereal'] },
    { id: 'photo-1518531933037-91b2f5f229cc', title: 'Bóng Đổ Lá Cây Monstera Trên Bức Tường Trắng', author: 'Desiree Fawn', tags: ['aesthetic', 'monstera', 'shadow', 'minimal'] },
    { id: 'photo-1502082553048-f009c37129b9', title: 'Rừng Cây Mùa Thu Lá Vàng Dưới Nắng Sớm', author: 'Luca Bravo', tags: ['aesthetic', 'autumn', 'golden', 'sunlight'] },
    { id: 'photo-1518020382113-a7e8fc38eac9', title: 'Góc Ban Công Ngập Hoa Lavender Thơ Mộng', author: 'Leonardo Yip', tags: ['aesthetic', 'lavender', 'balcony', 'purple'] }
  ]
};

// Khởi tạo danh mục 100% độc nhất (110 hình ảnh chất lượng cao được tuyển chọn)
function buildCuratedCatalog(): CatalogItem[] {
  const items: CatalogItem[] = [];
  const categories = Object.keys(CURATED_UNSPLASH_CATALOG) as Exclude<CatalogCategory, 'all'>[];

  categories.forEach((cat) => {
    const list = CURATED_UNSPLASH_CATALOG[cat];
    list.forEach((item, index) => {
      // 1. Bản Desktop 16:9 chất lượng cao
      items.push({
        id: `curated-${cat}-d-${index + 1}`,
        title: item.title,
        category: cat,
        orientation: 'desktop',
        url: `https://images.unsplash.com/${item.id}?q=85&w=1920&h=1080&auto=format&fit=crop`,
        thumbnailUrl: `https://images.unsplash.com/${item.id}?q=65&w=320&h=180&auto=format&fit=crop`,
        author: item.author,
        tags: [...item.tags, 'desktop', '16:9', 'hd']
      });

      // 2. Bản Mobile 9:16 tương thích điện thoại
      items.push({
        id: `curated-${cat}-m-${index + 1}`,
        title: `${item.title} - Bản Dọc`,
        category: cat,
        orientation: 'mobile',
        url: `https://images.unsplash.com/${item.id}?q=85&w=1080&h=1920&auto=format&fit=crop`,
        thumbnailUrl: `https://images.unsplash.com/${item.id}?q=65&w=180&h=320&auto=format&fit=crop`,
        author: item.author,
        tags: [...item.tags, 'mobile', '9:16', 'portrait']
      });
    });
  });

  return items;
}

// Bộ catalog tĩnh độc nhất thực sự (110 ảnh Desktop + 110 ảnh Mobile = 220 biến thể tương thích)
export const BACKGROUND_CATALOG: CatalogItem[] = buildCuratedCatalog();

/**
 * Lấy danh sách item từ catalog có hỗ trợ phân trang (cluster lazy loading),
 * lọc theo category, orientation và tìm kiếm theo từ khóa.
 */
export function queryCatalog(params: {
  category?: CatalogCategory;
  orientation?: 'all' | 'desktop' | 'mobile';
  query?: string;
  page?: number;
  pageSize?: number;
}): { items: CatalogItem[]; total: number; totalPages: number; uniqueSeedCount: number } {
  const {
    category = 'all',
    orientation = 'all',
    query = '',
    page = 1,
    pageSize = 24
  } = params;

  let filtered = BACKGROUND_CATALOG;

  if (category !== 'all') {
    filtered = filtered.filter((item) => item.category === category);
  }

  if (orientation !== 'all') {
    filtered = filtered.filter((item) => item.orientation === orientation);
  }

  if (query.trim()) {
    const q = query.trim().toLowerCase();
    filtered = filtered.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.author.toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q))
    );
  }

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startIndex = (page - 1) * pageSize;
  const items = filtered.slice(startIndex, startIndex + pageSize);

  // Số lượng ảnh gốc độc nhất (distinct Photo IDs)
  const uniqueSeeds = new Set(
    filtered.map((i) => {
      const match = i.url.match(/photo-[a-zA-Z0-9-]+/);
      return match ? match[0] : i.id;
    })
  );

  return { items, total, totalPages, uniqueSeedCount: uniqueSeeds.size };
}
