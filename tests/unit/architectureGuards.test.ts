import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { DEFAULT_RTC_CONFIG } from '../../src/services/WebRTCConnectionManager';
import { meetService, RTC_CONFIG } from '../../src/services/meetService';
import { VITE_APP_URL, PRODUCTION_URL } from '../../src/config/env';

describe('Architecture & Discipline Guards — Anti-Localhost Bias & Multi-Tier Entitlements', () => {
  const rootDir = path.resolve(__dirname, '../../');

  it('Test 1: WebRTC cấu hình BẮT BUỘC phải chứa ít nhất 1 TURN Relay Server (turn:)', () => {
    // 1. Kiểm tra đối tượng cấu hình runtime
    const iceServers = DEFAULT_RTC_CONFIG.iceServers || [];
    const hasTurnServerRuntime = iceServers.some((server) => {
      const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
      return urls.some((u) => typeof u === 'string' && u.startsWith('turn:'));
    });
    expect(hasTurnServerRuntime).toBe(true);

    const meetServiceIceServers = (meetService.rtcConfig.iceServers || []) as RTCIceServer[];
    const hasMeetServiceTurn = meetServiceIceServers.some((server) => {
      const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
      return urls.some((u) => typeof u === 'string' && u.startsWith('turn:'));
    });
    expect(hasMeetServiceTurn).toBe(true);

    // 2. Kiểm tra mã nguồn tệp cấu hình WebRTC
    const rtcManagerPath = path.join(rootDir, 'src/services/WebRTCConnectionManager.ts');
    const rtcManagerContent = fs.readFileSync(rtcManagerPath, 'utf-8');
    expect(rtcManagerContent).toMatch(/turn:openrelay|turn:/i);

    const meetServicePath = path.join(rootDir, 'src/services/meetService.ts');
    expect(fs.existsSync(meetServicePath)).toBe(true);
    const meetServiceContent = fs.readFileSync(meetServicePath, 'utf-8');
    expect(meetServiceContent).toMatch(/DEFAULT_RTC_CONFIG|turn:/i);
  });

  it('Test 2: Component BillingView.tsx KHÔNG ĐƯỢC chứa điều kiện ẩn ô coupon theo gói Free', () => {
    const billingViewPath = path.join(rootDir, 'src/components/BillingView.tsx');
    const billingViewContent = fs.readFileSync(billingViewPath, 'utf-8');

    // Cấm dùng điều kiện ẩn ô coupon theo gói Free (ví dụ: userPlan === 'free' || !isPro)
    expect(billingViewContent).not.toMatch(/userPlan\s*===\s*['"]free['"]/);
    expect(billingViewContent).not.toMatch(/user\?\.plan\s*===\s*['"]free['"]\s*&&[\s\S]*?(?:universal-coupon|input-coupon)/);

    // Bắt buộc phải có khối coupon phổ quát hiển thị cho mọi gói
    expect(billingViewContent).toContain('universal-coupon-redemption');
    expect(billingViewContent).toContain('input-coupon-universal');
    expect(billingViewContent).toContain('btn-redeem-coupon-universal');
  });

  it('Test 3: Dữ liệu Coupon phải đồng bộ Supabase và KHÔNG lọc theo user_id người tạo trong câu lệnh SELECT', () => {
    const couponServicePath = path.join(rootDir, 'src/services/couponService.ts');
    const couponServiceContent = fs.readFileSync(couponServicePath, 'utf-8');

    // Phải có cơ chế kết nối bảng coupons trên Supabase
    expect(couponServiceContent).toContain('fetchCouponFromSupabase');
    expect(couponServiceContent).toContain('/rest/v1/coupons');

    // Câu lệnh SELECT tra cứu mã không được giới hạn theo user_id hay created_by
    expect(couponServiceContent).not.toMatch(/rest\/v1\/coupons\?[^'"]*created_by=eq\./);
    expect(couponServiceContent).not.toMatch(/rest\/v1\/coupons\?[^'"]*user_id=eq\./);

    // Phải tồn tại file migration SQL cho bảng coupons với RLS public
    const migrationPath = path.join(rootDir, 'supabase/migrations/20261102000001_coupons_table.sql');
    expect(fs.existsSync(migrationPath)).toBe(true);
    const migrationContent = fs.readFileSync(migrationPath, 'utf-8');
    expect(migrationContent).toContain('CREATE TABLE IF NOT EXISTS public.coupons');
    expect(migrationContent).toContain('coupons_select_all');
  });

  it('Test 4: Đăng nhập Google OAuth sử dụng dynamic redirectTo theo domain hiện tại, VITE_APP_URL trỏ về pomofocus-workspace', () => {
    const authServicePath = path.join(rootDir, 'src/services/authService.ts');
    const authServiceContent = fs.readFileSync(authServicePath, 'utf-8');

    // Hàm signInWithOAuth tồn tại và sử dụng window.location.origin
    expect(authServiceContent).toContain('signInWithOAuth');
    expect(authServiceContent).toContain('${window.location.origin}/app');

    // Tuyệt đối không hardcode domain cũ pomodoro-workspace-three.vercel.app
    expect(authServiceContent).not.toContain('pomodoro-workspace-three.vercel.app');

    // Kiểm tra env.ts và .env
    expect(PRODUCTION_URL).toBe('https://pomofocus-workspace.vercel.app');
    expect(VITE_APP_URL).toBe('https://pomofocus-workspace.vercel.app');

    const envPath = path.join(rootDir, 'src/config/env.ts');
    const envContent = fs.readFileSync(envPath, 'utf-8');
    expect(envContent).toContain('https://pomofocus-workspace.vercel.app');
    expect(envContent).toContain('VITE_APP_URL');

    const dotEnvPath = path.join(rootDir, '.env');
    const dotEnvContent = fs.readFileSync(dotEnvPath, 'utf-8');
    expect(dotEnvContent).toContain('VITE_APP_URL=https://pomofocus-workspace.vercel.app');
  });
});
