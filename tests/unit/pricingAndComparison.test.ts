import { describe, it, expect } from 'vitest';
import { PRICING_PLANS, COMPARISON_FEATURES } from '../../src/config/pricing';

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

  it('2. Bảng so sánh quyền lợi đa chiều có đầy đủ 13 tiêu chí bắt buộc', () => {
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
  });

  it('3. Kiểm định phân bổ quyền lợi dòng "Truy cập sớm tính năng mới (Early Access)" chuẩn xác', () => {
    const earlyAccess = COMPARISON_FEATURES.find((f) => f.id === 'early_access');
    expect(earlyAccess).toBeDefined();
    expect(earlyAccess?.free).toBe('❌');
    expect(earlyAccess?.monthly).toBe('❌');
    expect(earlyAccess?.yearly).toBe('Ưu tiên Beta');
    expect(earlyAccess?.lifetime).toBe('🚀 Độc quyền truy cập sớm nhất');
  });

  it('4. Kiểm định sức chứa phòng học: Free 10, Tháng 30, Năm 30, Trọn Đời 50 người', () => {
    const capacity = COMPARISON_FEATURES.find((f) => f.id === 'room_capacity');
    expect(capacity).toBeDefined();
    expect(capacity?.free).toContain('10');
    expect(capacity?.monthly).toContain('30');
    expect(capacity?.yearly).toContain('30');
    expect(capacity?.lifetime).toContain('50');
  });

  it('5. Kiểm định Huy hiệu hồ sơ mạ vàng cho gói Trọn Đời', () => {
    const badge = COMPARISON_FEATURES.find((f) => f.id === 'badge');
    expect(badge).toBeDefined();
    expect(badge?.free).toContain('Học viên');
    expect(badge?.monthly).toContain('PRO');
    expect(badge?.lifetime).toContain('PRO TRỌN ĐỜI mạ vàng');
  });
});
