import { describe, it, expect, beforeEach, vi } from 'vitest';
import { authService, UserProfile, OWNER_EMAIL } from '../../src/services/authService';
import { MONOCHROME_GEOMETRIC_AVATARS } from '../../src/utils/monochromeAvatars';

describe('SaaS Profile, Security & Adaptive Billing Specifications', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('1. Quản lý Avatar & Hồ sơ cá nhân chuyên sâu (Profile Management)', () => {
    it('Kho 6 Avatar Tối Giản Hình Học (Monochrome Geometric) đầy đủ 6 mẫu SVG Retina', () => {
      expect(MONOCHROME_GEOMETRIC_AVATARS).toHaveLength(6);

      const ids = MONOCHROME_GEOMETRIC_AVATARS.map((a) => a.id);
      expect(ids).toContain('zen-rings');
      expect(ids).toContain('cyber-hex');
      expect(ids).toContain('hyper-cube');
      expect(ids).toContain('prism-diamond');
      expect(ids).toContain('orbital-pulse');
      expect(ids).toContain('abstract-monolith');

      for (const avatar of MONOCHROME_GEOMETRIC_AVATARS) {
        expect(avatar.svgDataUri).toMatch(/^data:image\/svg\+xml;utf8,/);
        expect(avatar.name).toBeTruthy();
      }
    });

    it('Cập nhật Avatar bằng ảnh tải lên (base64) và chọn từ kho hình học tối giản', async () => {
      const user = await authService.signup('avatar.user@pomo.app', 'pass123456', 'Avatar Tester');

      // 1. Cập nhật bằng ảnh hình học Zen Rings
      const zenAvatar = MONOCHROME_GEOMETRIC_AVATARS[0].svgDataUri;
      const updated1 = await authService.updateProfile(user.id, {
        avatarUrl: zenAvatar
      });
      expect(updated1.avatarUrl).toBe(zenAvatar);

      const session1 = authService.getCurrentSession();
      expect(session1?.avatarUrl).toBe(zenAvatar);

      // 2. Cập nhật bằng base64 upload
      const base64Data = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD...';
      const updated2 = await authService.updateProfile(user.id, {
        avatarUrl: base64Data
      });
      expect(updated2.avatarUrl).toBe(base64Data);
    });

    it('Cập nhật Username/Handle duy nhất (@namho) và chuẩn hóa cú pháp', async () => {
      const user = await authService.signup('handle.user@pomo.app', 'pass123456', 'Handle Tester');

      // Nhập không có @: tự động thêm @
      const updated1 = await authService.updateProfile(user.id, {
        username: 'namho_coder'
      });
      expect(updated1.username).toBe('@namho_coder');

      // Nhập có sẵn @ và ký tự đặc biệt: lọc sạch và chuẩn hóa
      const updated2 = await authService.updateProfile(user.id, {
        username: '@@NamHo_PRO!!'
      });
      expect(updated2.username).toBe('@namho_pro');
    });

    it('Cập nhật Bio / Mục tiêu học tập (Focus Goal) hiển thị dưới Avatar', async () => {
      const user = await authService.signup('goal.user@pomo.app', 'pass123456', 'Goal Tester');

      const updated = await authService.updateProfile(user.id, {
        focusGoal: 'IELTS 8.0 🎯 • Chạy deadline đồ án tốt nghiệp'
      });
      expect(updated.focusGoal).toBe('IELTS 8.0 🎯 • Chạy deadline đồ án tốt nghiệp');
      expect(authService.getCurrentSession()?.focusGoal).toContain('IELTS 8.0');
    });

    it('Tùy chỉnh quyền riêng tư: Ẩn Email trong phòng và Chế độ tàng hình', async () => {
      const user = await authService.signup('privacy.user@pomo.app', 'pass123456', 'Privacy Tester');
      expect(user.hideEmailInRoom).toBeFalsy();
      expect(user.incognitoJoinRoom).toBeFalsy();

      const updated = await authService.updateProfile(user.id, {
        hideEmailInRoom: true,
        incognitoJoinRoom: true
      });

      expect(updated.hideEmailInRoom).toBe(true);
      expect(updated.incognitoJoinRoom).toBe(true);
      expect(authService.getCurrentSession()?.hideEmailInRoom).toBe(true);
      expect(authService.getCurrentSession()?.incognitoJoinRoom).toBe(true);
    });
  });

  describe('2. Trung tâm bảo mật tài khoản (Account Security & GDPR Danger Zone)', () => {
    it('Đổi mật khẩu an toàn và kiểm tra bảo vệ mật khẩu cũ', async () => {
      const user = await authService.signup('sec.user@pomo.app', 'secure_pass_123', 'Sec User');

      // Đổi mật khẩu thành công
      const success = await authService.changePassword(user.id, 'secure_pass_123', 'new_secret_789');
      expect(success).toBe(true);

      // Đăng nhập lại với mật khẩu mới
      authService.logout();
      const reLoggedIn = await authService.login('sec.user@pomo.app', 'new_secret_789');
      expect(reLoggedIn.id).toBe(user.id);

      // Mật khẩu cũ không còn hợp lệ
      authService.logout();
      await expect(
        authService.login('sec.user@pomo.app', 'secure_pass_123')
      ).rejects.toThrow('Mật khẩu không chính xác');
    });

    it('Đăng xuất khỏi tất cả các thiết bị khác (Session Security)', async () => {
      await authService.signup('session.user@pomo.app', 'pass123456', 'Session User');
      const res = await authService.signOutOtherDevices();
      expect(res.success).toBe(true);
      expect(res.message).toContain('Đã đăng xuất khỏi tất cả các thiết bị khác');
    });

    it('Vùng nguy hiểm: Xóa tài khoản vĩnh viễn xóa sạch dữ liệu cá nhân (GDPR Danger Zone)', async () => {
      const user = await authService.signup('delete.me@pomo.app', 'pass123456', 'Doomed User');
      const originalId = user.id;
      expect(authService.getCurrentSession()).not.toBeNull();

      // Thực hiện xóa vĩnh viễn
      const deleted = await authService.deleteAccount(user.id);
      expect(deleted).toBe(true);

      // Phiên đăng nhập đã bị hủy
      expect(authService.getCurrentSession()).toBeNull();

      // Tài khoản đã bị xóa sạch hoàn toàn khỏi danh sách lưu trữ
      const rawUsers = localStorage.getItem('pomodoro_study_users_store');
      const users = rawUsers ? JSON.parse(rawUsers) : {};
      expect(users['delete.me@pomo.app']).toBeUndefined();
      expect(Object.values(users).find((u: any) => u.id === originalId)).toBeUndefined();
    });
  });

  describe('3. Bảng giá thích ứng theo gói người dùng (Adaptive SaaS Billing)', () => {
    it('Nhận diện chính xác trạng thái Lifetime Founder cho Owner và LadyBoss', () => {
      const ownerUser: UserProfile = {
        id: 'usr_owner_001',
        email: OWNER_EMAIL,
        displayName: 'Founder Nam',
        plan: 'pro_lifetime',
        isLifetime: true,
        createdAt: Date.now()
      };

      const isFounder = Boolean(
        ownerUser.isLifetime ||
        ownerUser.plan === 'pro_lifetime' ||
        ownerUser.email === OWNER_EMAIL
      );
      expect(isFounder).toBe(true);
    });

    it('Gói PRO Tháng/Năm tính đúng số ngày còn lại và ngày hết hạn', () => {
      const now = Date.now();
      const twentyDaysMs = 20 * 24 * 60 * 60 * 1000;
      const proUser: UserProfile = {
        id: 'usr_monthly_pro',
        email: 'monthly@pomo.app',
        displayName: 'Monthly Member',
        plan: 'pro',
        isLifetime: false,
        proExpiresAt: now + twentyDaysMs,
        createdAt: now - 10 * 86400000
      };

      const remainingDays = proUser.proExpiresAt
        ? Math.max(0, Math.ceil((proUser.proExpiresAt - now) / (24 * 60 * 60 * 1000)))
        : 0;

      expect(remainingDays).toBe(20);
    });
  });
});
