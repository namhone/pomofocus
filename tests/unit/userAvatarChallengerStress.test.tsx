import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { UserAvatar } from '../../src/components/common/UserAvatar';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { UserProfile, isValidAvatarUrl, isCustomAvatarUrl } from '../../src/services/authService';

describe('Empirical Challenger: UserAvatar Adversarial Stress Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    useAuthStore.getState().logout();
    vi.restoreAllMocks();
  });

  describe('Adversarial Matrix 1: Nullability, Malformed Data & Zero-Black-Box Guarantee', () => {
    it('handles user = null gracefully with vibrant emerald gradient and K letter', () => {
      render(<UserAvatar user={null} testId="avatar-null" />);
      const img = screen.getByTestId('avatar-null-img') as HTMLImageElement;
      expect(img.src.startsWith('data:image/svg+xml')).toBe(true);
      const decoded = decodeURIComponent(img.src);
      expect(decoded).toContain('>K<');
      expect(decoded).toContain('#3f3f46');
      expect(decoded).toContain('#3f3f46');
      expect(img.alt).toBe('Khách');
    });

    it('handles user = undefined (no prop) with unauthenticated store -> guest K avatar', () => {
      render(<UserAvatar testId="avatar-undefined" />);
      const img = screen.getByTestId('avatar-undefined-img') as HTMLImageElement;
      expect(img.src.startsWith('data:image/svg+xml')).toBe(true);
      const decoded = decodeURIComponent(img.src);
      expect(decoded).toContain('>K<');
    });

    it('handles synthetic guest profile { id: "guest", isGuest: true }', () => {
      const guestObj: any = { id: 'guest', isGuest: true, displayName: 'Khách vãng lai' };
      render(<UserAvatar user={guestObj} testId="avatar-guest-obj" />);
      const img = screen.getByTestId('avatar-guest-obj-img') as HTMLImageElement;
      expect(img.src.startsWith('data:image/svg+xml')).toBe(true);
      const decoded = decodeURIComponent(img.src);
      expect(decoded).toContain('>K<');
      expect(decoded).toContain('#3f3f46');
    });

    it('handles empty user object {} without throwing and never produces broken image', () => {
      const emptyUser: any = {};
      expect(() => {
        render(<UserAvatar user={emptyUser} testId="avatar-empty" />);
      }).not.toThrow();

      const img = screen.getByTestId('avatar-empty-img') as HTMLImageElement;
      expect(img.src.startsWith('data:image/svg+xml')).toBe(true);
      const decoded = decodeURIComponent(img.src);
      // Empty user should have valid SVG initials fallback (K or U)
      expect(decoded).toContain('<svg');
      expect(decoded).toContain('</svg>');
    });

    it('rejects malicious or dead URLs: javascript:, blob:, unsplash, and whitespace', () => {
      const maliciousCases = [
        'javascript:alert("pwned")',
        'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
        'blob:http://localhost:5173/dead-session-blob-1234',
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
        '   ',
        'null',
        'undefined',
        '""'
      ];

      for (const badUrl of maliciousCases) {
        expect(isValidAvatarUrl(badUrl)).toBe(false);

        const { unmount } = render(
          <UserAvatar
            user={{ id: 'u1', email: 'test@study.io', displayName: 'Test User', avatarUrl: badUrl } as any}
            testId={`avatar-bad-${encodeURIComponent(badUrl).slice(0, 8)}`}
          />
        );

        const img = screen.getByTestId(/avatar-bad-.*-img/) as HTMLImageElement;
        // Invariant: Bad URL must NEVER be set as img.src
        expect(img.src).not.toBe(badUrl);
        expect(img.src.startsWith('data:image/svg+xml')).toBe(true);
        unmount();
      }
    });

    it('sanitizes and safely handles emoji-only and HTML-like display names', () => {
      // 1. Emoji only
      const emojiUser = { id: 'u_emoji', displayName: '👑 🚀 ⭐', email: '' } as any;
      render(<UserAvatar user={emojiUser} testId="avatar-emoji" />);
      const imgEmoji = screen.getByTestId('avatar-emoji-img') as HTMLImageElement;
      expect(imgEmoji.src.startsWith('data:image/svg+xml')).toBe(true);
      const decodedEmoji = decodeURIComponent(imgEmoji.src);
      expect(decodedEmoji).toContain('<svg');
      expect(decodedEmoji).toContain('</svg>');

      // 2. HTML injection attempt
      const xssUser = { id: 'u_xss', displayName: '<script>alert(1)</script>', email: 'xss@test.io' } as any;
      render(<UserAvatar user={xssUser} testId="avatar-xss" />);
      const imgXss = screen.getByTestId('avatar-xss-img') as HTMLImageElement;
      const decodedXss = decodeURIComponent(imgXss.src);
      // cleanName strips angle brackets or uses safe initials
      expect(decodedXss).not.toContain('<script>');
    });
  });

  describe('Adversarial Matrix 2: Error Recovery & State Machine Flips', () => {
    it('transitions cleanly to fallback SVG on onError and recovers when valid avatarUrl arrives', () => {
      const brokenUser: UserProfile = {
        id: 'usr_broken_test',
        email: 'broken@study.io',
        displayName: 'Anh Nam',
        avatarUrl: 'https://cdn.example.com/expired-image.jpg',
        plan: 'free',
        createdAt: Date.now()
      };

      const { rerender } = render(<UserAvatar user={brokenUser} testId="avatar-recovery" />);
      const img = screen.getByTestId('avatar-recovery-img') as HTMLImageElement;
      expect(img.src).toBe('https://cdn.example.com/expired-image.jpg');

      // 1. Simulating image load failure
      act(() => {
        fireEvent.error(img);
      });

      // Must now immediately show SVG initials AN
      expect(img.src.startsWith('data:image/svg+xml')).toBe(true);
      expect(decodeURIComponent(img.src)).toContain('AN');

      // 2. Prop update: User uploads a new valid custom image
      const newCustomUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR42mNk+M9QzwAEjAwMDAwAFAcCARgYF/UAAAAASUVORK5CYII=';
      const updatedUser: UserProfile = {
        ...brokenUser,
        customAvatarUrl: newCustomUri,
        hasCustomAvatar: true
      };

      rerender(<UserAvatar user={updatedUser} testId="avatar-recovery" />);

      // Must recover from imgError state and show the new custom image!
      const recoveredImg = screen.getByTestId('avatar-recovery-img') as HTMLImageElement;
      expect(recoveredImg.src).toBe(newCustomUri);
    });

    it('handles secondary error on new URL by returning to fallback SVG', () => {
      const user: UserProfile = {
        id: 'usr_double_error',
        email: 'double@study.io',
        displayName: 'Double Error',
        avatarUrl: 'https://cdn.example.com/error1.jpg',
        plan: 'free',
        createdAt: Date.now()
      };

      const { rerender } = render(<UserAvatar user={user} testId="avatar-double-err" />);
      const img = screen.getByTestId('avatar-double-err-img') as HTMLImageElement;

      // Fail 1
      act(() => {
        fireEvent.error(img);
      });
      expect(img.src.startsWith('data:image/svg+xml')).toBe(true);

      // Re-render with second broken URL
      rerender(
        <UserAvatar
          user={{ ...user, avatarUrl: 'https://cdn.example.com/error2.jpg' }}
          testId="avatar-double-err"
        />
      );

      const img2 = screen.getByTestId('avatar-double-err-img') as HTMLImageElement;
      expect(img2.src).toBe('https://cdn.example.com/error2.jpg');

      // Fail 2
      act(() => {
        fireEvent.error(img2);
      });
      expect(img2.src.startsWith('data:image/svg+xml')).toBe(true);
      expect(decodeURIComponent(img2.src)).toContain('DE');
    });
  });

  describe('Adversarial Matrix 3: Priority Hierarchy Invariants', () => {
    it('customAvatarUrl beats Google avatarUrl even when Google photo is valid and high-res', () => {
      const customAvatar = 'data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==';
      const googleAvatar = 'https://lh3.googleusercontent.com/a/ACg8ocL_super_hd_photo=s576-c';

      const user: UserProfile = {
        id: 'usr_prio_1',
        email: 'prio@study.io',
        displayName: 'Priority Test',
        customAvatarUrl: customAvatar,
        avatarUrl: googleAvatar,
        hasCustomAvatar: true,
        plan: 'pro',
        createdAt: Date.now()
      };

      render(<UserAvatar user={user} testId="avatar-prio" />);
      const img = screen.getByTestId('avatar-prio-img') as HTMLImageElement;
      expect(img.src).toBe(customAvatar);
    });

    it('snake_case custom_avatar_url from raw Supabase record beats user_metadata.avatar_url', () => {
      const customSupabaseUrl = 'https://xyz.supabase.co/storage/v1/object/public/avatars/usr_abc.webp';
      const googleOAuthUrl = 'https://lh3.googleusercontent.com/a/oauth_photo';

      const rawSupabaseUser: any = {
        id: 'usr_raw_1',
        email: 'raw@study.io',
        custom_avatar_url: customSupabaseUrl,
        user_metadata: {
          avatar_url: googleOAuthUrl,
          picture: googleOAuthUrl
        }
      };

      render(<UserAvatar user={rawSupabaseUser} testId="avatar-raw-prio" />);
      const img = screen.getByTestId('avatar-raw-prio-img') as HTMLImageElement;
      expect(img.src).toBe(customSupabaseUrl);
    });

    it('custom avatar via direct avatarUrl prop takes precedence over Google photo', () => {
      const customDirect = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
      const googleUser: UserProfile = {
        id: 'usr_g',
        email: 'g@gmail.com',
        displayName: 'Google Guy',
        avatarUrl: 'https://lh3.googleusercontent.com/a/photo',
        plan: 'free',
        createdAt: Date.now()
      };

      // Pass custom direct avatarUrl prop
      render(<UserAvatar user={googleUser} avatarUrl={customDirect} testId="avatar-prop-prio" />);
      const img = screen.getByTestId('avatar-prop-prio-img') as HTMLImageElement;
      expect(img.src).toBe(customDirect);
    });
  });

  describe('Adversarial Matrix 4: Responsive Sizing, Numbers & Unknown Presets', () => {
    it('renders exact Tailwind dimension classes for all presets', () => {
      const presets: Array<['xs' | 'sm' | 'md' | 'lg' | 'xl', string]> = [
        ['xs', 'w-6 h-6'],
        ['sm', 'w-7 h-7'],
        ['md', 'w-9 h-9'],
        ['lg', 'w-12 h-12'],
        ['xl', 'w-16 h-16'],
      ];

      for (const [size, expectedClass] of presets) {
        const { unmount } = render(<UserAvatar size={size} testId={`size-${size}`} />);
        const el = screen.getByTestId(`size-${size}`);
        expect(el.className).toContain(expectedClass);
        unmount();
      }
    });

    it('supports custom numeric pixel sizes via inline style', () => {
      const { unmount } = render(<UserAvatar size={80} testId="size-custom-80" />);
      const el = screen.getByTestId('size-custom-80');
      expect(el.style.width).toBe('80px');
      expect(el.style.height).toBe('80px');
      unmount();
    });

    it('falls back to default preset md when an unknown size string is passed', () => {
      const { unmount } = render(<UserAvatar size={'nonexistent' as any} testId="size-fallback" />);
      const el = screen.getByTestId('size-fallback');
      expect(el.className).toContain('w-9 h-9');
      unmount();
    });
  });

  describe('Adversarial Matrix 5: Accessibility, Keyboard Interaction & Status Dot', () => {
    it('keyboard navigation: Enter and Space triggers onClick', () => {
      const handleClick = vi.fn();
      render(<UserAvatar onClick={handleClick} testId="avatar-a11y" />);
      const container = screen.getByTestId('avatar-a11y');

      expect(container.getAttribute('role')).toBe('button');
      expect(container.getAttribute('tabIndex')).toBe('0');

      // Enter
      fireEvent.keyDown(container, { key: 'Enter' });
      expect(handleClick).toHaveBeenCalledTimes(1);

      // Space
      fireEvent.keyDown(container, { key: ' ' });
      expect(handleClick).toHaveBeenCalledTimes(2);

      // ArrowRight should NOT trigger onClick
      fireEvent.keyDown(container, { key: 'ArrowRight' });
      expect(handleClick).toHaveBeenCalledTimes(2);
    });

    it('omitted onClick does not add button role or tabIndex', () => {
      render(<UserAvatar testId="avatar-static" />);
      const container = screen.getByTestId('avatar-static');
      expect(container.getAttribute('role')).toBeNull();
      expect(container.getAttribute('tabIndex')).toBeNull();
    });

    it('renders responsive status dot scaling with avatar size', () => {
      // Small avatar: w-2 h-2 dot
      const { unmount } = render(<UserAvatar size="xs" showStatusDot={true} testId="avatar-dot-xs" />);
      const dotXs = screen.getByTestId('avatar-dot-xs-status-dot');
      expect(dotXs.className).toContain('w-2 h-2');
      unmount();

      // Large avatar: w-2.5 h-2.5 dot
      render(<UserAvatar size="lg" showStatusDot={true} testId="avatar-dot-lg" />);
      const dotLg = screen.getByTestId('avatar-dot-lg-status-dot');
      expect(dotLg.className).toContain('w-2.5 h-2.5');
    });
  });
});
