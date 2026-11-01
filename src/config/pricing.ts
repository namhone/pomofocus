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
    description: 'Thanh toán linh hoạt 59.000 VNĐ / tháng, hủy bất kỳ lúc nào.'
  },
  yearly: {
    cycle: 'yearly',
    planId: '1_year',
    priceVnd: 468000,
    formatted: '468.000 VNĐ',
    durationMonths: 12,
    durationDays: 365,
    label: 'Hàng năm',
    description: 'Thanh toán 1 lần 468.000 VNĐ / năm (tương đương 39.000 VNĐ / tháng, tiết kiệm ~33,9%).',
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
    description: 'Thanh toán một lần duy nhất, sở hữu toàn bộ tính năng PRO & AI vĩnh viễn không giới hạn.'
  }
};
