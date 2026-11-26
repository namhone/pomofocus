import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { UserAvatar } from '../../src/components/common/UserAvatar';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { UserProfile } from '../../src/services/authService';

describe('Unified <UserAvatar /> Component Specification', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    useAuthStore.getState().logout();
    vi.restoreAllMocks();
  });

  describe('1. 3-Tier Priority Cascades', () => {
    it('Tier 1: ưu tiên tuyệt đối avatar tùy chỉnh (Custom Upload) đè lên ảnh Google', () => {
      const customDataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const googlePhoto = 'https://lh3.googleusercontent.com/a/google_default_photo';

      const userWithBoth: UserProfile = {
        id: 'usr_custom_1',
        email: 'namho@study.io',
        displayName: 'Bảo Nam',
        customAvatarUrl: customDataUri,
        avatarUrl: googlePhoto,
        hasCustomAvatar: true,
        plan: 'pro',
        createdAt: Date.now()
      };

      render(<UserAvatar user={userWithBoth} testId="test-avatar" />);

      const img = screen.getByTestId('test-avatar-img') as HTMLImageElement;
      expect(img.src).toBe(customDataUri);
    });

    it('Tier 2: hiển thị ảnh Google OAuth khi người dùng chưa có custom avatar', () => {
      const googlePhoto = 'https://lh3.googleusercontent.com/a/fresh_google_user';
      const googleUser: UserProfile = {
        id: 'usr_google_1',
        email: 'fresh@gmail.com',
        displayName: 'Fresh Student',
        avatarUrl: googlePhoto,
        hasCustomAvatar: false,
        plan: 'free',
        createdAt: Date.now()
      };

      render(<UserAvatar user={googleUser} testId="test-avatar" />);

      const img = screen.getByTestId('test-avatar-img') as HTMLImageElement;
      expect(img.src).toBe(googlePhoto);
    });

    it('Tier 3: Khách vãng lai (unauthenticated) hiển thị chữ K (Khách) trên nền monochrome', () => {
      // Khi user = null (chưa đăng nhập)
      render(<UserAvatar user={null} testId="guest-avatar" />);

      const img = screen.getByTestId('guest-avatar-img') as HTMLImageElement;
      expect(img.src.startsWith('data:image/svg+xml')).toBe(true);

      const decodedSvg = decodeURIComponent(img.src);
      // Chữ cái K
      expect(decodedSvg).toContain('>K<');
      // Monochrome theo giao diện Phase 4B
      expect(decodedSvg).toContain('#3f3f46');
      expect(decodedSvg).not.toContain('#10b981');
    });

    it('Tier 3: Người dùng đã đăng nhập chưa có ảnh hiển thị chữ cái viết tắt của tên', () => {
      const userWithoutPhoto: UserProfile = {
        id: 'usr_initials_1',
        email: 'taogay2k@gmail.com',
        displayName: 'Tao Gay',
        avatarUrl: '',
        plan: 'free',
        createdAt: Date.now()
      };

      render(<UserAvatar user={userWithoutPhoto} testId="initials-avatar" />);

      const img = screen.getByTestId('initials-avatar-img') as HTMLImageElement;
      expect(img.src.startsWith('data:image/svg+xml')).toBe(true);

      const decodedSvg = decodeURIComponent(img.src);
      expect(decodedSvg).toContain('TG');
    });
  });

  describe('2. Error Resilience & Black Box Elimination (onError Handler)', () => {
    it('khi URL ảnh bị lỗi 404/hết hạn, lập tức fallback sang SVG initials, không bao giờ để ô đen', () => {
      const brokenPhotoUser: UserProfile = {
        id: 'usr_broken_1',
        email: 'broken@study.io',
        displayName: 'Bảo Nam',
        avatarUrl: 'https://broken-cdn.com/expired-token.jpg',
        plan: 'pro',
        createdAt: Date.now()
      };

      render(<UserAvatar user={brokenPhotoUser} testId="broken-avatar" />);

      const img = screen.getByTestId('broken-avatar-img') as HTMLImageElement;
      expect(img.src).toBe('https://broken-cdn.com/expired-token.jpg');

      // Giả lập sự kiện ảnh load thất bại (network error / 404)
      act(() => {
        fireEvent.error(img);
      });

      // Lập tức fallback sang SVG Data URI sắc nét
      expect(img.src.startsWith('data:image/svg+xml')).toBe(true);
      const decoded = decodeURIComponent(img.src);
      expect(decoded).toContain('BN');
    });
  });

  describe('3. Real-time Reactivity via useAuthStore', () => {
    it('tự động phản chiếu thay đổi avatar từ useAuthStore khi prop user được lược bỏ', () => {
      // Ban đầu: chưa đăng nhập -> render chữ K
      const { rerender } = render(<UserAvatar testId="reactive-avatar" />);
      const img = screen.getByTestId('reactive-avatar-img') as HTMLImageElement;
      expect(decodeURIComponent(img.src)).toContain('>K<');

      // Đăng nhập tài khoản mới vào useAuthStore
      const loggedUser: UserProfile = {
        id: 'usr_store_1',
        email: 'store@study.io',
        displayName: 'Store Student',
        avatarUrl: 'https://lh3.googleusercontent.com/store_avatar.jpg',
        plan: 'free',
        createdAt: Date.now()
      };

      act(() => {
        useAuthStore.setState({ user: loggedUser, isAuthenticated: true });
      });

      rerender(<UserAvatar testId="reactive-avatar" />);

      const updatedImg = screen.getByTestId('reactive-avatar-img') as HTMLImageElement;
      expect(updatedImg.src).toBe('https://lh3.googleusercontent.com/store_avatar.jpg');
    });
  });

  describe('4. Size Variants & Styling Props', () => {
    it('hỗ trợ đầy đủ các kích thước chuẩn xs (24), sm (28), md (36), lg (48), xl (64) và custom number', () => {
      const { rerender } = render(<UserAvatar size="xs" testId="avatar-xs" />);
      expect(screen.getByTestId('avatar-xs').className).toContain('w-6 h-6');

      rerender(<UserAvatar size="sm" testId="avatar-sm" />);
      expect(screen.getByTestId('avatar-sm').className).toContain('w-7 h-7');

      rerender(<UserAvatar size="md" testId="avatar-md" />);
      expect(screen.getByTestId('avatar-md').className).toContain('w-9 h-9');

      rerender(<UserAvatar size="lg" testId="avatar-lg" />);
      expect(screen.getByTestId('avatar-lg').className).toContain('w-12 h-12');

      rerender(<UserAvatar size="xl" testId="avatar-xl" />);
      expect(screen.getByTestId('avatar-xl').className).toContain('w-16 h-16');

      rerender(<UserAvatar size={52} testId="avatar-num" />);
      const numEl = screen.getByTestId('avatar-num');
      expect(numEl.style.width).toBe('52px');
      expect(numEl.style.height).toBe('52px');
    });

    it('hỗ trợ hiển thị viền nhẫn (ring) và chấm trạng thái trực tuyến (showStatusDot)', () => {
      render(<UserAvatar ring={true} showStatusDot={true} testId="avatar-ring-dot" />);

      const container = screen.getByTestId('avatar-ring-dot');
      expect(container.className).toContain('ring-2 ring-zinc-500/40');

      const dot = screen.getByTestId('avatar-ring-dot-status-dot');
      expect(dot).toBeDefined();
      expect(dot.className).toContain('bg-zinc-700');
    });

    it('gọi hàm onClick khi người dùng click vào avatar', () => {
      const handleClick = vi.fn();
      render(<UserAvatar onClick={handleClick} testId="avatar-clickable" />);

      const container = screen.getByTestId('avatar-clickable');
      fireEvent.click(container);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });
});
