import { describe, it, expect } from 'vitest';
import { PRICING_PLANS, COMPARISON_FEATURES, SAAS_PRICING_TIERS } from '../../src/config/pricing';

describe('Pricing & Feature Comparison Specifications', () => {
  it('1. Cấu hình gói Trọn Đời (Lifetime) sở hữu đầy đủ thông tin và quyền lợi Early Access', () => {
    const lifetime = PRICING_PLANS.lifetime;
    expect(lifetime).toBeDefined();
    expect(lifetime.priceVnd).toBe(799000);
    expect(lifetime.formatted).toBe('799.000 VNĐ');
    expect(lifetime.durationMonths).toBe(999);
    expect(lifetime.exclusiveFeature).toBeDefined();
    expect(lifetime.exclusiveFeature?.title).toContain('Truy cập sớm toàn bộ tính năng mới (Early Access Labs)');
    expect(lifetime.exclusiveFeature?.description).toContain('Được trải nghiệm và dùng thử trước');
  });

  it('2. Bảng so sánh quyền lợi đa chiều có đầy đủ các tiêu chí bắt buộc', () => {
    expect(COMPARISON_FEATURES.length).toBeGreaterThanOrEqual(13);

    const featureIds = COMPARISON_FEATURES.map((f) => f.id);
    expect(featureIds).toContain('price');
    expect(featureIds).toContain('duration');
    expect(featureIds).toContain('public_pods');
    expect(featureIds).toContain('private_rooms');
    expect(featureIds).toContain('room_duration');
    expect(featureIds).toContain('room_capacity');
    expect(featureIds).toContain('whiteboard');
    expect(featureIds).toContain('backgrounds_audio');
    expect(featureIds).toContain('webrtc_quality');
    expect(featureIds).toContain('analytics');
    expect(featureIds).toContain('badge');
    expect(featureIds).toContain('early_access');
    expect(featureIds).toContain('future_updates');
    expect(featureIds).toContain('ai_assistant');
    expect(featureIds).toContain('room_url');
    expect(featureIds).toContain('server_connection');
    expect(featureIds).toContain('community_gift');
  });

  it('3. Kiểm định phân bổ quyền lợi dòng "Truy cập sớm tính năng mới (Early Access)" chuẩn xác', () => {
    const earlyAccess = COMPARISON_FEATURES.find((f) => f.id === 'early_access');
    expect(earlyAccess).toBeDefined();
    expect(earlyAccess?.free).toBe('❌');
    expect(earlyAccess?.monthly).toBe('❌');
    expect(earlyAccess?.yearly).toBe('Ưu tiên Beta');
    expect(earlyAccess?.lifetime).toBe('🚀 Độc quyền truy cập sớm nhất');
  });

  it('4. Kiểm định sức chứa phòng học chuẩn SaaS Freemium: Free 6, Tháng 25, Năm 35, Trọn Đời 60 người', () => {
    const capacity = COMPARISON_FEATURES.find((f) => f.id === 'room_capacity');
    expect(capacity).toBeDefined();
    expect(capacity?.free).toContain('6');
    expect(capacity?.monthly).toContain('25');
    expect(capacity?.yearly).toContain('35');
    expect(capacity?.lifetime).toContain('60');
  });

  it('5. Kiểm định Huy hiệu hồ sơ mạ vàng cho gói Trọn Đời', () => {
    const badge = COMPARISON_FEATURES.find((f) => f.id === 'badge');
    expect(badge).toBeDefined();
    expect(badge?.free).toContain('Học viên');
    expect(badge?.monthly).toContain('PRO');
    expect(badge?.lifetime).toContain('PRO TRỌN ĐỜI mạ vàng');
  });

  it('6. Kiểm định mảng 4 gói cước SaaS Freemium (SAAS_PRICING_TIERS) phân cấp chuẩn xác', () => {
    expect(SAAS_PRICING_TIERS.length).toBe(4);
    const [free, monthly, yearly, lifetime] = SAAS_PRICING_TIERS;

    // Free
    expect(free.id).toBe('free');
    expect(free.features.some((f) => f.includes('Tối đa 45 phút/phiên'))).toBe(true);
    expect(free.features.some((f) => f.includes('Tối đa 6 người/phòng'))).toBe(true);
    expect(free.features.some((f) => f.includes('5 âm thanh cơ bản & 3 hình nền tĩnh'))).toBe(true);

    // Monthly
    expect(monthly.id).toBe('monthly');
    expect(monthly.features.some((f) => f.includes('Không giới hạn thời gian'))).toBe(true);
    expect(monthly.features.some((f) => f.includes('Tối đa 25 người/phòng'))).toBe(true);
    expect(monthly.features.some((f) => f.includes('50 câu hỏi AI/tháng'))).toBe(true);

    // Yearly
    expect(yearly.id).toBe('yearly');
    expect(yearly.badge).toBe('GÓI PHỔ BIẾN NHẤT');
    expect(yearly.features.some((f) => f.includes('Tối đa 35 người/phòng'))).toBe(true);
    expect(yearly.features.some((f) => f.includes('300 câu hỏi AI tóm tắt tài liệu/tháng'))).toBe(true);
    expect(yearly.features.some((f) => f.includes('Đặt URL cố định theo nickname cá nhân'))).toBe(true);

    // Lifetime
    expect(lifetime.id).toBe('lifetime');
    expect(lifetime.badge).toBe('FOUNDER VIP');
    expect(lifetime.features.some((f) => f.includes('Lên đến 60 người'))).toBe(true);
    expect(lifetime.features.some((f) => f.includes('AI Study Companion không giới hạn'))).toBe(true);
    expect(lifetime.features.some((f) => f.includes('Huy hiệu Nhà sáng lập (Founder VIP) mạ vàng vĩnh viễn'))).toBe(true);
    expect(lifetime.features.some((f) => f.includes('Tặng 01 Giftcode PRO 3 tháng cho bạn cùng tiến'))).toBe(true);
  });
});
