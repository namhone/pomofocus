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
    description: 'Thanh toán theo tháng 59.000 VNĐ / tháng, hủy bất kỳ lúc nào.'
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
    label: 'Trọn đời (Lifetime PRO)',
    description: 'Thanh toán một lần duy nhất, sở hữu toàn bộ tính năng PRO & AI vĩnh viễn không giới hạn.',
    exclusiveFeature: {
      title: '✨ Truy cập sớm toàn bộ tính năng mới (Early Access Labs)',
      description: 'Được trải nghiệm và dùng thử trước toàn bộ các công cụ, tính năng và giao diện sắp cập nhật trước khi phát hành chính thức.'
    }
  }
};

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
    lifetime: '799.000₫ (1 lần duy nhất)',
    highlightLifetime: true
  },
  {
    id: 'duration',
    feature: 'Thời hạn sử dụng',
    category: 'pricing',
    free: 'Vĩnh viễn (Cơ bản)',
    monthly: '30 ngày (cộng dồn)',
    yearly: '365 ngày (cộng dồn)',
    lifetime: 'Vĩnh viễn trọn đời',
    highlightLifetime: true
  },
  {
    id: 'public_pods',
    feature: 'Phòng Public Pods (01-10)',
    category: 'rooms',
    free: 'Tối đa 90 phút / ngày',
    monthly: 'Không giới hạn',
    yearly: 'Không giới hạn',
    lifetime: 'Không giới hạn'
  },
  {
    id: 'private_rooms',
    feature: 'Tạo phòng riêng (Private Room)',
    category: 'rooms',
    free: 'Tối đa 3 phòng / ngày',
    monthly: 'Không giới hạn',
    yearly: 'Không giới hạn',
    lifetime: 'Không giới hạn'
  },
  {
    id: 'room_duration',
    feature: 'Thời lượng mỗi phiên phòng riêng',
    category: 'rooms',
    free: 'Tối đa 45 phút / phiên',
    monthly: 'Không giới hạn',
    yearly: 'Không giới hạn',
    lifetime: 'Không giới hạn'
  },
  {
    id: 'room_capacity',
    feature: 'Sức chứa phòng học',
    category: 'rooms',
    free: 'Tối đa 10 người / phòng',
    monthly: 'Tối đa 30 người / phòng',
    yearly: 'Tối đa 30 người / phòng',
    lifetime: 'Tối đa 50 người / phòng',
    highlightLifetime: true
  },
  {
    id: 'whiteboard',
    feature: 'Bảng vẽ & Chú thích tài liệu',
    category: 'tools',
    free: 'Giới hạn tính năng cơ bản',
    monthly: 'Đầy đủ công cụ & Xuất file',
    yearly: 'Đầy đủ công cụ & Xuất file',
    lifetime: 'Đầy đủ & Bộ công cụ VIP độc quyền',
    highlightLifetime: true
  },
  {
    id: 'backgrounds_audio',
    feature: 'Kho hình nền 4K & Âm thanh',
    category: 'tools',
    free: '6 âm thanh / 3 hình nền cơ bản',
    monthly: 'Toàn bộ kho 4K & Đa tầng âm thanh',
    yearly: 'Toàn bộ kho 4K & Đa tầng âm thanh',
    lifetime: 'Toàn bộ kho 4K & Đa tầng âm thanh'
  },
  {
    id: 'webrtc_quality',
    feature: 'Chất lượng WebRTC Video',
    category: 'tools',
    free: '360p / 480p chuẩn',
    monthly: 'HD 720p cao nhất, siêu mượt',
    yearly: 'HD 720p cao nhất, siêu mượt',
    lifetime: 'HD 720p cao nhất, siêu mượt'
  },
  {
    id: 'analytics',
    feature: 'Thống kê năng suất',
    category: 'tools',
    free: '7 ngày gần nhất',
    monthly: '30 ngày chi tiết',
    yearly: '1 năm & Xuất báo cáo',
    lifetime: 'Trọn đời & Phân tích chuyên sâu',
    highlightLifetime: true
  },
  {
    id: 'badge',
    feature: 'Huy hiệu hồ sơ (Badge)',
    category: 'privilege',
    free: 'Học viên chuẩn',
    monthly: 'Huy hiệu PRO Tinh hoa',
    yearly: 'Huy hiệu PRO Tinh hoa',
    lifetime: '✨ PRO TRỌN ĐỜI mạ vàng (VIP)',
    highlightLifetime: true
  },
  {
    id: 'early_access',
    feature: 'Truy cập sớm tính năng mới (Early Access)',
    category: 'privilege',
    free: '❌',
    monthly: '❌',
    yearly: 'Ưu tiên Beta',
    lifetime: '🚀 Độc quyền truy cập sớm nhất',
    highlightLifetime: true
  },
  {
    id: 'future_updates',
    feature: 'Cập nhật tính năng tương lai',
    category: 'privilege',
    free: 'Bản vá cơ bản',
    monthly: 'Trong thời gian duy trì gói',
    yearly: 'Trong thời gian duy trì gói',
    lifetime: 'Miễn phí toàn bộ trọn đời',
    highlightLifetime: true
  }
];
