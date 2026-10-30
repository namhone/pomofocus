/**
 * CẤU HÌNH BẢNG GIÁ STUDY WORKSPACE (CENTRALIZED PRICING CONFIG)
 * Nguồn duy nhất cho toàn bộ giao diện, modal thanh toán và kiểm toán dịch vụ.
 */

export interface PricingPlan {
  cycle: 'monthly' | 'yearly';
  priceVnd: number;
  formatted: string;
  durationMonths: number;
  label: string;
  description: string;
  equivalentMonthlyVnd?: number;
  equivalentMonthlyFormatted?: string;
  savingsPercent?: number;
}

export const PRICING_PLANS: Record<'monthly' | 'yearly', PricingPlan> = {
  monthly: {
    cycle: 'monthly',
    priceVnd: 59000,
    formatted: '59.000 VNĐ',
    durationMonths: 1,
    label: 'Hàng tháng',
    description: 'Thanh toán linh hoạt 59.000 VNĐ / tháng, hủy bất kỳ lúc nào.'
  },
  yearly: {
    cycle: 'yearly',
    priceVnd: 468000,
    formatted: '468.000 VNĐ',
    durationMonths: 12,
    label: 'Hàng năm',
    description: 'Thanh toán 1 lần 468.000 VNĐ / năm (tương đương 39.000 VNĐ / tháng, tiết kiệm 240.000 VNĐ ~33,9%).',
    equivalentMonthlyVnd: 39000,
    equivalentMonthlyFormatted: '39.000 VNĐ',
    savingsPercent: 33.9
  }
};
