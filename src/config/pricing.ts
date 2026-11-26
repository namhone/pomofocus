/**
 * CẤU HÌNH BẢNG GIÁ STUDY WORKSPACE (CENTRALIZED PRICING CONFIG)
 * Nguồn duy nhất cho toàn bộ giao diện, modal thanh toán và kiểm toán dịch vụ.
 */

export type PlanCycle = 'monthly' | 'yearly' | 'lifetime';
export type PlanTypeKey = '1_month' | '1_year' | 'lifetime';

export interface PricingPlan {
  cycle: PlanCycle;
  planId: PlanTypeKey;
  priceVnd: number;
  formatted: string;
  durationMonths: number;
  durationDays: number | null;
  label: string;
  description: string;
  equivalentMonthlyVnd?: number;
  equivalentMonthlyFormatted?: string;
  savingsPercent?: number;
  isPopular?: boolean;
  exclusiveFeature?: {
    title: string;
    description: string;
  };
}

export const PRICING_PLANS: Record<PlanCycle, PricingPlan> = {
  monthly: {
    cycle: 'monthly',
    planId: '1_month',
    priceVnd: 59000,
    formatted: '59.000 VNĐ',
    durationMonths: 1,
    durationDays: 30,
    label: 'Hàng tháng',
    description: 'Thanh toán 59.000 VNĐ / tháng, học tập cá nhân linh hoạt, hủy bất kỳ lúc nào.'
  },
  yearly: {
    cycle: 'yearly',
    planId: '1_year',
    priceVnd: 468000,
    formatted: '468.000 VNĐ',
    durationMonths: 12,
    durationDays: 365,
    label: 'Hàng năm',
    description: 'Thanh toán 468.000 VNĐ / năm (tiết kiệm ~34% so với trả theo tháng).',
    equivalentMonthlyVnd: 39000,
    equivalentMonthlyFormatted: '39.000 VNĐ',
    savingsPercent: 33.9,
    isPopular: true
  },
  lifetime: {
    cycle: 'lifetime',
    planId: 'lifetime',
    priceVnd: 799000,
    formatted: '799.000 VNĐ',
    durationMonths: 999,
    durationDays: null,
    label: 'Trọn đời (Lifetime Founder VIP)',
    description: 'Thanh toán một lần duy nhất, sở hữu toàn bộ đặc quyền cao cấp nhất vĩnh viễn và AI không giới hạn.',
    exclusiveFeature: {
      title: "Truy cập sớm toàn bộ tính năng mới",
      description: 'Được trải nghiệm và dùng thử trước toàn bộ các công cụ, tính năng và giao diện sắp cập nhật trước khi phát hành chính thức.'
    }
  }
};

export interface PricingTierDetail {
  id: 'free' | 'monthly' | 'yearly' | 'lifetime';
  name: string;
  tagline: string;
  badge?: string;
  price: string;
  period: string;
  subPrice?: string;
  description: string;
  features: string[];
  ctaLabel: string;
  isPopular?: boolean;
  isFounder?: boolean;
  cycleKey?: PlanCycle;
}

export const SAAS_PRICING_TIERS: PricingTierDetail[] = [
  {
    id: 'free',
    name: 'Gói Free',
    tagline: 'Dành cho cá nhân tự học tối giản',
    price: '0₫',
    period: '/ mãi mãi',
    description: "Trải nghiệm học tập cốt lõi với pomodoro và không gian tối giản.",
    features: [
      "Trợ lý AI study: 50 AI credits / tháng",
      "Thời lượng phòng riêng: tối đa 45 phút/phiên (reset sau 5 phút nghỉ)",
      "Chất lượng phòng học: 480p tiêu chuẩn (tối đa 6 người/phòng)",
      "Kho âm thanh & hình nền: 5 âm thanh cơ bản & 3 hình nền tĩnh",
      "Bảng vẽ whiteboard: 1 trang nháp (không xuất file)",
      "Đường dẫn phòng học: ngẫu nhiên dạng mã số"
    ],
    ctaLabel: "Đang sử dụng"
  },
  {
    id: 'monthly',
    name: "Gói tháng",
    tagline: 'Học tập cá nhân',
    price: '59.000 VNĐ',
    period: '/ tháng',
    subPrice: 'Thanh toán theo tháng 59.000 VNĐ / tháng, hủy bất kỳ lúc nào',
    description: 'Dành cho người cần sự linh hoạt cao trong các kỳ ôn thi ngắn hạn.',
    cycleKey: 'monthly',
    features: [
      "Thời lượng phòng riêng: không giới hạn thời gian",
      "Chất lượng phòng học: hd 720p mượt mà (tối đa 25 người/phòng)",
      "Kho âm thanh & hình nền: bộ sưu tập hình nền tinh tuyển & youtube sync",
      "Bảng vẽ whiteboard: đầy đủ công cụ & xuất ảnh png",
      "Trợ lý AI study: 50 câu hỏi AI/tháng",
      "Đường dẫn phòng học: ngẫu nhiên dạng mã số"
    ],
    ctaLabel: "Chọn gói tháng"
  },
  {
    id: 'yearly',
    name: "Gói năm",
    tagline: 'Gói khuyên dùng',
    badge: 'Gói phổ biến nhất',
    price: '39.000 VNĐ',
    period: '/ tháng',
    subPrice: "Thanh toán 468.000 VNĐ / năm (tiết kiệm ~34%)",
    description: 'Lựa chọn tối ưu nhất cho học sinh, sinh viên và người đi làm.',
    isPopular: true,
    cycleKey: 'yearly',
    features: [
      "Đầy đủ quyền lợi gói tháng",
      "Sức chứa phòng học: tối đa 35 người/phòng",
      "Trợ lý AI study: 300 câu hỏi AI tóm tắt tài liệu/tháng",
      "Đường dẫn phòng học riêng: đặt url cố định theo nickname cá nhân",
      "Kết nối máy chủ: ưu tiên băng thông đường truyền VIP (giảm 50% độ trễ giờ cao điểm)",
      "Bảng vẽ whiteboard: xuất file pdf tài liệu đa trang độ nét cao",
      "Báo cáo phân tích: xuất biểu đồ năng suất 1 năm (excel / pdf)"
    ],
    ctaLabel: "Chọn gói năm"
  },
  {
    id: 'lifetime',
    name: "Gói trọn đời",
    tagline: 'Lifetime Founder VIP',
    badge: 'Founder VIP',
    price: '799.000 VNĐ',
    period: '/ một lần duy nhất',
    subPrice: "Sở hữu vĩnh viễn trọn đời • không gia hạn",
    description: 'Khoản đầu tư duy nhất một lần cho toàn bộ sự nghiệp học tập.',
    isFounder: true,
    cycleKey: 'lifetime',
    features: [
      'Đầy đủ toàn bộ đặc quyền cao cấp nhất vĩnh viễn trọn đời',
      "Sức chứa phòng học: lên đến 60 người (hỗ trợ dạy học / workshop)",
      "Trợ lý AI study: sử dụng AI study companion không giới hạn",
      "Huy hiệu hồ sơ: huy hiệu nhà sáng lập (Founder VIP) vĩnh viễn",
      "Đặc quyền cộng đồng: tặng 01 giftcode Pro 3 tháng cho bạn cùng tiến",
      "Cập nhật tương lai: tự động mở khóa 100% tính năng mới trọn đời"
    ],
    ctaLabel: "Sở hữu trọn đời"
  }
];

export interface ComparisonFeatureItem {
  id: string;
  feature: string;
  category: 'pricing' | 'rooms' | 'tools' | 'privilege';
  free: string;
  monthly: string;
  yearly: string;
  lifetime: string;
  highlightLifetime?: boolean;
}

export const COMPARISON_FEATURES: ComparisonFeatureItem[] = [
  {
    id: 'price',
    feature: 'Giá niêm yết',
    category: 'pricing',
    free: '0₫',
    monthly: '59.000₫ / tháng',
    yearly: '468.000₫ / năm (~39k/tháng)',
    lifetime: '799.000 VNĐ (1 lần duy nhất)',
    highlightLifetime: true
  },
  {
    id: 'duration',
    feature: 'Thời hạn sử dụng',
    category: 'pricing',
    free: "Vĩnh viễn (cơ bản)",
    monthly: '30 ngày (cộng dồn)',
    yearly: '365 ngày (cộng dồn)',
    lifetime: 'Vĩnh viễn trọn đời',
    highlightLifetime: true
  },
  {
    id: 'room_duration',
    feature: 'Thời lượng mỗi phiên phòng riêng',
    category: 'rooms',
    free: "Tối đa 45 phút/phiên (reset sau 5 phút nghỉ)",
    monthly: 'Không giới hạn thời gian',
    yearly: 'Không giới hạn thời gian',
    lifetime: 'Không giới hạn thời gian'
  },
  {
    id: 'room_capacity',
    feature: 'Sức chứa phòng học',
    category: 'rooms',
    free: 'Tối đa 6 người / phòng',
    monthly: 'Tối đa 25 người / phòng',
    yearly: 'Tối đa 35 người / phòng',
    lifetime: "Lên đến 60 người (dạy học / workshop)",
    highlightLifetime: true
  },
  {
    id: 'webrtc_quality',
    feature: 'Chất lượng phòng học trực tuyến',
    category: 'rooms',
    free: "480p chuẩn",
    monthly: "Hd 720p mượt mà",
    yearly: "Hd 720p mượt mà",
    lifetime: "Hd 720p cao cấp nhất"
  },
  {
    id: 'backgrounds_audio',
    feature: "Kho âm thanh & hình nền",
    category: 'tools',
    free: '5 âm thanh cơ bản & 3 hình nền tĩnh',
    monthly: "Bộ sưu tập hình nền tinh tuyển & youtube sync",
    yearly: "Bộ sưu tập hình nền tinh tuyển & youtube sync",
    lifetime: "Bộ sưu tập hình nền tinh tuyển & youtube sync"
  },
  {
    id: 'whiteboard',
    feature: "Bảng vẽ & chú thích tài liệu",
    category: 'tools',
    free: "1 trang nháp (không xuất file)",
    monthly: "Đầy đủ công cụ & xuất ảnh png",
    yearly: "Xuất file pdf tài liệu đa trang độ nét cao",
    lifetime: "Đầy đủ công cụ & xuất pdf/png không giới hạn",
    highlightLifetime: true
  },
  {
    id: 'ai_assistant',
    feature: "Trợ lý AI study",
    category: 'tools',
    free: "50 AI credits / tháng",
    monthly: "1.500 AI credits / tháng",
    yearly: "20.000 AI credits / năm",
    lifetime: "1.000 / tuần (nạp lại vào thứ hai)",
    highlightLifetime: true
  },
  {
    id: 'room_url',
    feature: 'Đường dẫn phòng học',
    category: 'rooms',
    free: 'Ngẫu nhiên dạng mã số',
    monthly: 'Ngẫu nhiên dạng mã số',
    yearly: "Đặt url cố định theo nickname cá nhân",
    lifetime: "Đặt url cố định VIP theo nickname cá nhân",
    highlightLifetime: true
  },
  {
    id: 'server_connection',
    feature: "Kết nối máy chủ & băng thông",
    category: 'rooms',
    free: 'Băng thông tiêu chuẩn',
    monthly: 'Băng thông tiêu chuẩn',
    yearly: 'Ưu tiên đường truyền VIP (-50% độ trễ)',
    lifetime: 'Đường truyền VIP ưu tiên cao nhất',
    highlightLifetime: true
  },
  {
    id: 'analytics',
    feature: "Thống kê năng suất & báo cáo",
    category: 'tools',
    free: '7 ngày gần nhất',
    monthly: '30 ngày chi tiết',
    yearly: "Xuất biểu đồ năng suất 1 năm (excel / pdf)",
    lifetime: "Trọn đời & phân tích chuyên sâu",
    highlightLifetime: true
  },
  {
    id: 'badge',
    feature: "Huy hiệu hồ sơ (badge)",
    category: 'privilege',
    free: 'Học viên chuẩn',
    monthly: "Huy hiệu Pro tinh hoa",
    yearly: "Huy hiệu Pro tinh hoa",
    lifetime: "Huy hiệu nhà sáng lập (Founder VIP) vĩnh viễn (Pro trọn đời mạ vàng)",
    highlightLifetime: true
  },
  {
    id: 'community_gift',
    feature: 'Đặc quyền quà tặng cộng đồng',
    category: 'privilege',
    free: '❌',
    monthly: '❌',
    yearly: '❌',
    lifetime: "Tặng 01 giftcode Pro 3 tháng cho bạn cùng tiến",
    highlightLifetime: true
  },
  {
    id: 'early_access',
    feature: "Truy cập sớm tính năng mới (early access)",
    category: 'privilege',
    free: '❌',
    monthly: '❌',
    yearly: "Ưu tiên beta",
    lifetime: "Độc quyền truy cập sớm nhất",
    highlightLifetime: true
  },
  {
    id: 'future_updates',
    feature: 'Cập nhật tính năng tương lai',
    category: 'privilege',
    free: 'Bản vá cơ bản',
    monthly: 'Trong thời gian duy trì gói',
    yearly: 'Trong thời gian duy trì gói',
    lifetime: 'Tự động mở khóa 100% tính năng mới trọn đời',
    highlightLifetime: true
  },
  {
    id: 'public_pods',
    feature: "Phòng public pods (01-10)",
    category: 'rooms',
    free: 'Tối đa 90 phút / ngày',
    monthly: 'Không giới hạn',
    yearly: 'Không giới hạn',
    lifetime: 'Không giới hạn'
  },
  {
    id: 'private_rooms',
    feature: "Tạo phòng riêng (private room)",
    category: 'rooms',
    free: 'Tối đa 3 phòng / ngày',
    monthly: 'Không giới hạn',
    yearly: 'Không giới hạn',
    lifetime: 'Không giới hạn'
  }
];


export interface StreamlinedComparisonFeature {
  id: string;
  name: string;
  free: string | boolean;
  pro: string | boolean;
  lifetime: string | boolean;
  highlightLifetime?: boolean;
}

export const STREAMLINED_COMPARISON_FEATURES: StreamlinedComparisonFeature[] = [
  {
    id: 'core_tools',
    name: "Công cụ học tập cốt lõi (pomodoro, note, task)",
    free: true,
    pro: true,
    lifetime: true
  },
  {
    id: 'ai_limit',
    name: "Hạn mức trợ lý AI companion",
    free: "50 (dùng thử)",
    pro: "500 / tuần",
    lifetime: "1.000 / tuần (vĩnh viễn)",
    highlightLifetime: true
  },
  {
    id: 'backgrounds_4k',
    name: 'Bộ sưu tập hình nền tinh tuyển',
    free: false,
    pro: true,
    lifetime: true
  },
  {
    id: 'webrtc_rooms',
    name: 'Phòng học nhóm trực tuyến',
    free: false,
    pro: true,
    lifetime: '✓ (Băng thông ưu tiên)',
    highlightLifetime: true
  },
  {
    id: 'cloud_sync',
    name: 'Đồng bộ đa thiết bị',
    free: 'Cục bộ',
    pro: true,
    lifetime: true
  },
  {
    id: 'vip_badge',
    name: "Huy hiệu vinh danh & đặc quyền Founder",
    free: false,
    pro: 'PRO',
    lifetime: 'Founder VIP 👑',
    highlightLifetime: true
  }
];
