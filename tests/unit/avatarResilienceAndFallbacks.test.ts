import { describe, it, expect, beforeEach } from 'vitest';
import { authService, isValidAvatarUrl, generateInitialsAvatarSvg, getEffectiveAvatarUrl, getDisplayAvatar } from '../../src/services/authService';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { localProfileCache } from '../../src/services/profileService';

describe('Avatar Resilience & Pitch-Black Box Elimination Specification', () => {
  beforeEach(() => {
    localStorage.clear();
    localProfileCache.clear();
    useAuthStore.getState().logout();
  });

  describe('1. Kịch bản tái hiện lỗi thực tế (Reproduction Steps Verification)', () => {
    it('chuỗi thao tác: Đăng nhập Google -> Đổi Avatar -> Logout -> F5 -> Đăng ký Email mới: Avatar có ngay lập tức, không bao giờ bị ô đen', async () => {
      // BƯỚC 1: Đăng nhập bằng Google và đổi Avatar tùy chỉnh
      const googleUser = await authService.loginWithGoogle({
        email: 'founder.test@studyworkspace.io',
        name: 'Founder Test',
        picture: 'https://lh3.googleusercontent.com/a/founder_test_photo'
      });
      expect(googleUser.email).toBe('founder.test@studyworkspace.io');

      await authService.updateProfile(googleUser.id, {
        avatarUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD...',
        customAvatarUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD...'
      });

      // BƯỚC 2: Bấm Đăng Xuất (Logout)
      useAuthStore.getState().logout();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().user).toBeNull();
      expect(localProfileCache.size).toBe(0);

      // BƯỚC 3: Giả lập F5 (Reload trang)
      localStorage.removeItem('sb_auth_session');
      localStorage.removeItem('pomodoro_study_auth_session');

      // BƯỚC 4: Đăng ký một tài khoản mới hoàn toàn bằng Email (taogay2k@gmail.com, tên: Tao Gay)
      const newUser = await authService.signup('taogay2k@gmail.com', 'SecurePass123!', 'Tao Gay');

      // BẢO CHỨNG BẤT BIẾN:
      // 1. Avatar được cấp ngay lập tức từ mili-giây đầu tiên, không bị undefined hay rỗng
      expect(newUser.avatarUrl).toBeDefined();
      expect(typeof newUser.avatarUrl).toBe('string');
      expect(newUser.avatarUrl!.length).toBeGreaterThan(20);

      // 2. Không bị rò rỉ avatar cũ của tài khoản Google trước đó
      expect(newUser.avatarUrl).not.toContain('founder_test_photo');
      expect(newUser.avatarUrl).not.toContain('/9j/4AAQSkZJRgABAQEASABIAAD...');

      // 3. Avatar là SVG Data URI cục bộ sắc nét chứa đúng 2 chữ cái viết tắt TG
      expect(newUser.avatarUrl!.startsWith('data:image/svg+xml')).toBe(true);
      expect(decodeURIComponent(newUser.avatarUrl!)).toContain('TG');

      // 4. Tuyệt đối không phải link Unsplash mẫu hay link blob đã thu hồi
      expect(isValidAvatarUrl(newUser.avatarUrl)).toBe(true);
      expect(newUser.avatarUrl).not.toContain('unsplash.com');
      expect(newUser.avatarUrl!.startsWith('blob:')).toBe(false);
    });
  });

  describe('2. Hàm kiểm tra tính hợp lệ của Avatar URL (isValidAvatarUrl)', () => {
    it('chặn hoàn toàn chuỗi rỗng, null, undefined, dead blob và unsplash', () => {
      expect(isValidAvatarUrl('')).toBe(false);
      expect(isValidAvatarUrl('   ')).toBe(false);
      expect(isValidAvatarUrl(null)).toBe(false);
      expect(isValidAvatarUrl(undefined)).toBe(false);
      expect(isValidAvatarUrl('null')).toBe(false);
      expect(isValidAvatarUrl('undefined')).toBe(false);
      expect(isValidAvatarUrl('""')).toBe(false);

      // Chặn link blob: (vì bị thu hồi sau reload tạo ra ô đen)
      expect(isValidAvatarUrl('blob:http://localhost:5173/a4f5-889b')).toBe(false);
      expect(isValidAvatarUrl('blob:https://pomofocus-workspace.vercel.app/f9823e')).toBe(false);

      // Chặn link stock Unsplash mẫu
      expect(isValidAvatarUrl('https://images.unsplash.com/photo-1534528741775-53994a69daeb')).toBe(false);
    });

    it('chấp nhận URL HTTPS, HTTP và Data URI hợp lệ', () => {
      expect(isValidAvatarUrl('https://lh3.googleusercontent.com/a/ACg8ocL...')).toBe(true);
      expect(isValidAvatarUrl('https://pomofocus.app/avatar.png')).toBe(true);
      expect(isValidAvatarUrl('data:image/svg+xml;utf8,<svg>...</svg>')).toBe(true);
      expect(isValidAvatarUrl('data:image/png;base64,iVBORw0KGgo...')).toBe(true);
      expect(isValidAvatarUrl('/avatars/default.png')).toBe(true);
    });
  });

  describe('3. Trình sinh Avatar SVG Chữ Cái Cục Bộ (generateInitialsAvatarSvg)', () => {
    it('sinh ra Data URI SVG hợp lệ 100% offline, hiển thị sắc nét chữ cái viết tắt', () => {
      const svgTaoGay = generateInitialsAvatarSvg('Tao Gay');
      expect(svgTaoGay.startsWith('data:image/svg+xml;utf8,')).toBe(true);
      const decodedTG = decodeURIComponent(svgTaoGay);
      expect(decodedTG).toContain('TG');
      expect(decodedTG).toContain('linearGradient');
      expect(decodedTG).toContain('text-anchor="middle"');

      const svgSingle = generateInitialsAvatarSvg('Nam');
      expect(decodeURIComponent(svgSingle)).toContain('NA');

      const svgEmpty = generateInitialsAvatarSvg('');
      expect(decodeURIComponent(svgEmpty)).toContain('U');
    });
  });

  describe('4. Thứ tự ưu tiên và An toàn Fallback (getEffectiveAvatarUrl)', () => {
    it('ưu tiên Custom Avatar -> Google OAuth -> SVG Initials cục bộ', () => {
      // Trường hợp 1: Có Custom Avatar hợp lệ
      const customUrl = 'data:image/png;base64,iVBORw0...';
      const userWithCustom = {
        displayName: 'Bảo Nam',
        customAvatarUrl: customUrl
      };
      expect(getEffectiveAvatarUrl(userWithCustom)).toBe(customUrl);

      // Trường hợp 2: Có Google Photo hợp lệ
      const googlePhoto = 'https://lh3.googleusercontent.com/photo123';
      const userGoogle = {
        displayName: 'Bảo Nam',
        user_metadata: { picture: googlePhoto }
      };
      expect(getEffectiveAvatarUrl(userGoogle)).toBe(googlePhoto);

      // Trường hợp 3: Khi có link blob chết, tự động bỏ qua và fallback sang SVG Initials
      const userDeadBlob = {
        displayName: 'Tao Gay',
        customAvatarUrl: 'blob:http://localhost:5173/dead-uuid'
      };
      const result = getEffectiveAvatarUrl(userDeadBlob);
      expect(result.startsWith('data:image/svg+xml')).toBe(true);
      expect(decodeURIComponent(result)).toContain('TG');
    });
  });

  describe('5. getDisplayAvatar an toàn tuyệt đối cho Email user (ISO/IEC 25010 & WCAG 2.2 AA)', () => {
    it('trả về SVG Data URI sắc nét cho tài khoản mới chưa có avatar, không bao giờ để rỗng', () => {
      const emailUser = {
        id: 'usr_new_email_1',
        email: 'taogay2k@gmail.com',
        displayName: 'Tao Gay',
        avatarUrl: '',
        customAvatarUrl: undefined
      };
      const result = getDisplayAvatar(emailUser);
      expect(result).toBeDefined();
      expect(result.startsWith('data:image/svg+xml')).toBe(true);
      expect(decodeURIComponent(result)).toContain('TG');
    });

    it('bảo toàn custom avatar nếu có', () => {
      const customUser = {
        id: 'usr_custom_1',
        email: 'custom@study.io',
        displayName: 'Custom User',
        avatarUrl: 'https://pomofocus.app/custom.png',
        customAvatarUrl: 'https://pomofocus.app/custom.png'
      };
      expect(getDisplayAvatar(customUser)).toBe('https://pomofocus.app/custom.png');
    });
  });
});
