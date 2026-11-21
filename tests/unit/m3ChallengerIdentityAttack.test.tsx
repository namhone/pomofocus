import 'fake-indexeddb/auto';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UserAvatar } from '../../src/components/common/UserAvatar';
import { ProfileView } from '../../src/components/ProfileView';
import { PlatformHeader } from '../../src/components/PlatformHeader';
import {
  generateInitialsAvatarSvg,
  isValidAvatarUrl,
  isCustomAvatarUrl,
} from '../../src/services/authService';
import {
  getSubscriptionBadge,
  formatUserCredits,
  isOwnerEmail,
  hasVipAccess,
  OWNER_EMAILS,
} from '../../src/utils/userBadge';
import { MONOCHROME_GEOMETRIC_AVATARS } from '../../src/utils/monochromeAvatars';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useAiStore } from '../../src/stores/useAiStore';

// Mock router for navigation in views
const mockNavigate = vi.fn();
vi.mock('../../src/services/router', () => ({
  useRouter: () => ({
    currentRoute: { pathname: '/app', path: '/app', query: {} },
    navigate: mockNavigate,
  }),
}));

describe('Milestone M3 Challenger Adversarial Attack Suite: Identity, Avatar & VIP Whitelist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (window as any).Capacitor;
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoggedIn: false,
      isPro: false,
      isLifetime: false,
      isOwner: false,
      planLabel: 'Free',
      effectiveBadge: 'Free',
    });
    useAiStore.setState({
      aiCreditsBalance: 50,
      isAiCompanionOpen: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (window as any).Capacitor;
  });

  // =========================================================================
  // ATTACK 1: Avatar Geometry Stress-Testing (Strictly Circular Invariant)
  // =========================================================================
  describe('ATTACK 1: Avatar Geometry Stress-Testing (Strictly Circular Invariant)', () => {
    it('1.1 UserAvatar maintains strictly circular geometry (rounded-full) across extreme numerical sizes (16px to 256px)', () => {
      const extremeSizes = [16, 20, 28, 36, 48, 64, 72, 96, 128, 256];

      for (const px of extremeSizes) {
        const { unmount } = render(
          <UserAvatar
            name="Test User"
            size={px}
            testId={`avatar-test-${px}`}
          />
        );

        const container = screen.getByTestId(`avatar-test-${px}`);
        expect(container.className).toContain('rounded-full');
        expect(container.className).toContain('overflow-hidden');
        expect(container.className).toContain('shrink-0');
        expect(container.style.width).toBe(`${px}px`);
        expect(container.style.height).toBe(`${px}px`);

        const img = screen.getByTestId(`avatar-test-${px}-img`);
        expect(img.className).toContain('rounded-full');
        expect(img.className).toContain('object-cover');

        unmount();
      }
    });

    it('1.2 UserAvatar correctly handles all named presets and falls back gracefully on invalid sizes', () => {
      const presets: Array<'xs' | 'sm' | 'md' | 'lg' | 'xl'> = ['xs', 'sm', 'md', 'lg', 'xl'];
      const expectedTw: Record<string, string> = {
        xs: 'w-6 h-6',
        sm: 'w-7 h-7',
        md: 'w-9 h-9',
        lg: 'w-12 h-12',
        xl: 'w-16 h-16',
      };

      for (const preset of presets) {
        const { unmount } = render(
          <UserAvatar name="User" size={preset} testId={`avatar-preset-${preset}`} />
        );
        const container = screen.getByTestId(`avatar-preset-${preset}`);
        expect(container.className).toContain(expectedTw[preset]);
        expect(container.className).toContain('rounded-full');
        unmount();
      }

      // Invalid string size fallback to 'md'
      const { unmount: unmountInvalid } = render(
        <UserAvatar name="User" size={'unknown-size' as any} testId="avatar-invalid" />
      );
      const invalidContainer = screen.getByTestId('avatar-invalid');
      expect(invalidContainer.className).toContain('w-9 h-9');
      expect(invalidContainer.className).toContain('rounded-full');
      unmountInvalid();
    });

    it('1.3 generateInitialsAvatarSvg produces exact circular SVG radius (rx = size / 2) with zero squarish cutouts', () => {
      const testDimensions = [16, 24, 32, 33, 48, 64, 72, 100, 128, 256];

      for (const size of testDimensions) {
        const dataUri = generateInitialsAvatarSvg('Nguyễn Văn Nam', size);
        expect(dataUri).toMatch(/^data:image\/svg\+xml;utf8,/);

        const decodedSvg = decodeURIComponent(dataUri.replace('data:image/svg+xml;utf8,', ''));
        const expectedRadius = Math.round(size / 2);

        // Crucial invariant: rx must equal Math.round(size / 2)
        expect(decodedSvg).toContain(`rx="${expectedRadius}"`);
        expect(decodedSvg).toContain(`width="${size}"`);
        expect(decodedSvg).toContain(`height="${size}"`);
        expect(decodedSvg).toContain(`viewBox="0 0 ${size} ${size}"`);

        // Negative check: must NOT contain old bug rx="16" when size !== 32
        if (size !== 32) {
          expect(decodedSvg).not.toContain('rx="16"');
        }
        // Must contain centered text alignment
        expect(decodedSvg).toContain('text-anchor="middle"');
        expect(decodedSvg).toContain('dominant-baseline="central"');
      }
    });

    it('1.4 generateInitialsAvatarSvg handles extreme name edge cases (Vietnamese, diacritics, emoji, whitespace)', () => {
      // Vietnamese full name -> first letter of first part + first letter of last part
      const vnUri = generateInitialsAvatarSvg('Nguyễn Hoàng Bảo Nam', 64);
      const vnSvg = decodeURIComponent(vnUri.replace('data:image/svg+xml;utf8,', ''));
      expect(vnSvg).toContain('>NN<');

      // Single word -> first 2 letters
      const oneWordUri = generateInitialsAvatarSvg('Trang', 64);
      const oneWordSvg = decodeURIComponent(oneWordUri.replace('data:image/svg+xml;utf8,', ''));
      expect(oneWordSvg).toContain('>TR<');

      // Pure whitespace -> fallback 'U'
      const spaceUri = generateInitialsAvatarSvg('    ', 64);
      const spaceSvg = decodeURIComponent(spaceUri.replace('data:image/svg+xml;utf8,', ''));
      expect(spaceSvg).toContain('>U<');

      // Pure emoji -> non-letter characters removed, falls back to 'U'
      const emojiUri = generateInitialsAvatarSvg('👑🚀🔥', 64);
      const emojiSvg = decodeURIComponent(emojiUri.replace('data:image/svg+xml;utf8,', ''));
      expect(emojiSvg).toContain('>U<');

      // Special symbols -> non-letters stripped, falls back to 'U'
      const symbolsUri = generateInitialsAvatarSvg('!@#$%^&*()', 64);
      const symbolsSvg = decodeURIComponent(symbolsUri.replace('data:image/svg+xml;utf8,', ''));
      expect(symbolsSvg).toContain('>U<');

      // Guest / Khách -> bold 'K'
      const khachUri = generateInitialsAvatarSvg('Khách', 64);
      const khachSvg = decodeURIComponent(khachUri.replace('data:image/svg+xml;utf8,', ''));
      expect(khachSvg).toContain('>K<');
    });

    it('1.5 All 6 Monochrome Geometric Avatar presets in MONOCHROME_GEOMETRIC_AVATARS are strictly circular (rx=50 on 100x100)', () => {
      expect(MONOCHROME_GEOMETRIC_AVATARS).toHaveLength(6);

      for (const preset of MONOCHROME_GEOMETRIC_AVATARS) {
        expect(preset.svgDataUri).toMatch(/^data:image\/svg\+xml;utf8,/);
        const svgContent = decodeURIComponent(preset.svgDataUri.replace('data:image/svg+xml;utf8,', ''));

        // Each preset must have viewBox 0 0 100 100 and rx="50" on its 100x100 background rect
        expect(svgContent).toContain('viewBox="0 0 100 100"');
        expect(svgContent).toContain('<rect width="100" height="100" rx="50"');
        expect(svgContent).not.toMatch(/rx="([1-4][0-9]|0)"/); // Must not be less than 50
      }
    });

    it('1.6 ProfileView renders both main avatar and preset selection avatars with rounded-full', () => {
      useAuthStore.setState({
        user: {
          id: 'usr_geom',
          email: 'geom@pomofocus.vn',
          displayName: 'Geometric Tester',
          role: 'authenticated',
          createdAt: Date.now(),
        } as any,
        isAuthenticated: true,
      });

      render(<ProfileView />);

      // Main Profile Avatar
      const mainAvatar = screen.getByTestId('profile-user-avatar');
      expect(mainAvatar.className).toContain('rounded-full');
      const mainImg = screen.getByTestId('profile-user-avatar-img');
      expect(mainImg.className).toContain('rounded-full');

      // Open Edit section to view presets
      const editBtn = screen.getByTestId('btn-toggle-edit-profile');
      act(() => {
        fireEvent.click(editBtn);
      });

      // Check all 6 presets
      for (const preset of MONOCHROME_GEOMETRIC_AVATARS) {
        const presetBtn = screen.getByTestId(`avatar-preset-${preset.id}`);
        const img = presetBtn.querySelector('img');
        expect(img).toBeDefined();
        expect(img?.className).toContain('rounded-full');
      }
    });
  });

  // =========================================================================
  // ATTACK 2: Empty Email Edge Cases & Zero Mail Icon Artifacts
  // =========================================================================
  describe('ATTACK 2: Empty Email Edge Cases & Zero Mail Icon Artifacts', () => {
    it('2.1 Zero mail icon or container rendered when user.email is null', () => {
      useAuthStore.setState({
        user: {
          id: 'usr_null_email',
          email: null as any,
          displayName: 'Null Email User',
          role: 'authenticated',
          createdAt: Date.now(),
        } as any,
        isAuthenticated: true,
      });

      render(<ProfileView />);
      expect(screen.queryByTestId('profile-email-container')).toBeNull();

      // Ensure no Mail icon is painted anywhere inside the header info card
      const profileCard = screen.getByTestId('profile-display-name').closest('.p-5');
      const mailSvgs = profileCard?.querySelectorAll('svg.lucide-mail');
      expect(mailSvgs?.length || 0).toBe(0);
    });

    it('2.2 Zero mail icon or container rendered when user.email is undefined', () => {
      useAuthStore.setState({
        user: {
          id: 'usr_undef_email',
          email: undefined as any,
          displayName: 'Undefined Email User',
          role: 'authenticated',
          createdAt: Date.now(),
        } as any,
        isAuthenticated: true,
      });

      render(<ProfileView />);
      expect(screen.queryByTestId('profile-email-container')).toBeNull();
    });

    it('2.3 Zero mail icon or container rendered when user.email is empty string ""', () => {
      useAuthStore.setState({
        user: {
          id: 'usr_empty_email',
          email: '',
          displayName: 'Empty Email User',
          role: 'authenticated',
          createdAt: Date.now(),
        } as any,
        isAuthenticated: true,
      });

      render(<ProfileView />);
      expect(screen.queryByTestId('profile-email-container')).toBeNull();
    });

    it('2.4 Zero mail icon or container rendered when user.email consists only of whitespace "   "', () => {
      useAuthStore.setState({
        user: {
          id: 'usr_space_email',
          email: '     ',
          displayName: 'Space Email User',
          role: 'authenticated',
          createdAt: Date.now(),
        } as any,
        isAuthenticated: true,
      });

      render(<ProfileView />);
      expect(screen.queryByTestId('profile-email-container')).toBeNull();
    });

    it('2.5 Zero mail icon or container rendered when user.email is tabs and newlines "\\t\\r\\n"', () => {
      useAuthStore.setState({
        user: {
          id: 'usr_newline_email',
          email: '\t\r\n',
          displayName: 'Whitespace Escapes User',
          role: 'authenticated',
          createdAt: Date.now(),
        } as any,
        isAuthenticated: true,
      });

      render(<ProfileView />);
      expect(screen.queryByTestId('profile-email-container')).toBeNull();
    });

    it('2.6 Successfully renders email container and Mail icon when valid email is supplied', () => {
      useAuthStore.setState({
        user: {
          id: 'usr_valid_email',
          email: 'genuine.student@pomofocus.vn',
          displayName: 'Genuine Student',
          role: 'authenticated',
          createdAt: Date.now(),
        } as any,
        isAuthenticated: true,
      });

      render(<ProfileView />);
      const emailContainer = screen.getByTestId('profile-email-container');
      expect(emailContainer).toBeDefined();
      expect(emailContainer.textContent).toContain('genuine.student@pomofocus.vn');

      const mailIcon = emailContainer.querySelector('svg.lucide-mail');
      expect(mailIcon).toBeDefined();
    });
  });

  // =========================================================================
  // ATTACK 3: Long Vietnamese Names & Special Text Stress-Testing in PlatformHeader
  // =========================================================================
  describe('ATTACK 3: Long Vietnamese Names & Special Text Stress-Testing in PlatformHeader', () => {
    it('3.1 50+ character Vietnamese full name does not cause flex layout blowouts and adheres to max-w truncation', () => {
      const ultraLongVnName = 'Hoàng Thân Quý Tộc Nguyễn Phúc Vĩnh Thụy Đệ Nhất Trấn Quốc Công';
      useAuthStore.setState({
        user: {
          id: 'usr_vn_long',
          email: 'vinhthuy@royalty.vn',
          displayName: ultraLongVnName,
          role: 'authenticated',
        } as any,
        isAuthenticated: true,
      });

      render(<PlatformHeader />);

      const avatarBtn = screen.getByTestId('header-user-avatar-btn');
      expect(avatarBtn).toBeDefined();
      expect(avatarBtn.className).toContain('shrink-0');

      const textSpan = avatarBtn.querySelector('span.truncate');
      expect(textSpan).toBeDefined();
      expect(textSpan?.textContent).toBe(ultraLongVnName);

      // Widened max-width containment rules
      expect(textSpan?.className).toContain('truncate');
      expect(textSpan?.className).toMatch(/max-w-\[160px\]/);
      expect(textSpan?.className).toMatch(/xl:max-w-\[260px\]/);
    });

    it('3.2 Single character name is displayed cleanly without CSS or SVG errors', () => {
      useAuthStore.setState({
        user: {
          id: 'usr_single_char',
          email: 'n@single.vn',
          displayName: 'N',
          role: 'authenticated',
        } as any,
        isAuthenticated: true,
      });

      render(<PlatformHeader />);
      const avatarBtn = screen.getByTestId('header-user-avatar-btn');
      const textSpan = avatarBtn.querySelector('span.truncate');
      expect(textSpan?.textContent).toBe('N');
    });

    it('3.3 Complex Vietnamese tonal marks & Unicode combinations render without corrupting DOM', () => {
      const complexVnName = 'Đặng Trần Đức Trọng';
      useAuthStore.setState({
        user: {
          id: 'usr_diacritics',
          email: 'trong@pomofocus.vn',
          displayName: complexVnName,
          role: 'authenticated',
        } as any,
        isAuthenticated: true,
      });

      render(<PlatformHeader />);
      const avatarBtn = screen.getByTestId('header-user-avatar-btn');
      const textSpan = avatarBtn.querySelector('span.truncate');
      expect(textSpan?.textContent).toBe(complexVnName);
    });

    it('3.4 Emoji-laden name renders without crashing initials generator or header', () => {
      const emojiName = '👑 [VIP PRO] Nguyễn Nam 🚀⚡';
      useAuthStore.setState({
        user: {
          id: 'usr_emoji_name',
          email: 'nam@emoji.vn',
          displayName: emojiName,
          role: 'authenticated',
        } as any,
        isAuthenticated: true,
      });

      render(<PlatformHeader />);
      const avatarBtn = screen.getByTestId('header-user-avatar-btn');
      const textSpan = avatarBtn.querySelector('span.truncate');
      expect(textSpan?.textContent).toBe(emojiName);
    });

    it('3.5 PlatformHeader User Dropdown maintains fixed width (w-64) and flex containment under extreme long texts', () => {
      const longName = 'Nguyễn Hoàng Bảo Nam Đệ Nhất Phong Thần Quyết Đoán';
      const longEmail = 'extremely.long.corporate.educational.email.address.2026@student.hcmut.edu.vn';

      useAuthStore.setState({
        user: {
          id: 'usr_long_dropdown',
          email: longEmail,
          displayName: longName,
          role: 'authenticated',
        } as any,
        isAuthenticated: true,
      });

      render(<PlatformHeader />);
      const avatarBtn = screen.getByTestId('header-user-avatar-btn');

      act(() => {
        fireEvent.click(avatarBtn);
      });

      const dropdown = screen.getByTestId('header-user-dropdown');
      expect(dropdown).toBeDefined();
      expect(dropdown.className).toContain('w-64');

      // Dropdown name and email containers must have truncate
      const dropdownName = dropdown.querySelector('.text-xs.font-semibold.text-white');
      expect(dropdownName?.className).toContain('truncate');
      expect(dropdownName?.textContent).toBe(longName);

      const dropdownEmail = dropdown.querySelector('.text-\\[10px\\].text-zinc-400');
      expect(dropdownEmail?.className).toContain('truncate');
      expect(dropdownEmail?.textContent).toBe(longEmail);

      // Badge must have shrink-0
      const badge = screen.getByTestId('header-user-badge');
      expect(badge.className).toContain('shrink-0');
    });
  });

  // =========================================================================
  // ATTACK 4: Founder VIP Whitelist & Privilege Escalation Protection
  // =========================================================================
  describe('ATTACK 4: Founder VIP Whitelist & Privilege Escalation Protection', () => {
    it('4.1 Legitimate owner emails in OWNER_EMAILS receive 100% Founder VIP entitlement', () => {
      expect(OWNER_EMAILS).toContain('namho03052k9@gmail.com');
      expect(OWNER_EMAILS).toContain('huyentrantt09@gmail.com');

      // Primary owner
      const badge1 = getSubscriptionBadge({ email: 'namho03052k9@gmail.com' });
      expect(badge1.tier).toBe('founder');
      expect(badge1.label).toBe('Founder VIP');
      expect(badge1.icon).toBe('crown');
      expect(badge1.colorClass).toContain('text-amber-300');
      expect(hasVipAccess({ email: 'namho03052k9@gmail.com' })).toBe(true);

      const credits1 = formatUserCredits(50, { email: 'namho03052k9@gmail.com' });
      expect(credits1.isUnlimited).toBe(true);
      expect(credits1.balance).toBe(Infinity);
      expect(credits1.label).toBe('Credits ∞');

      // Secondary owner
      const badge2 = getSubscriptionBadge({ email: 'huyentrantt09@gmail.com' });
      expect(badge2.tier).toBe('founder');
      expect(badge2.label).toBe('Founder VIP');
      expect(badge2.icon).toBe('crown');
      expect(hasVipAccess({ email: 'huyentrantt09@gmail.com' })).toBe(true);

      const credits2 = formatUserCredits(10, { email: 'huyentrantt09@gmail.com' });
      expect(credits2.isUnlimited).toBe(true);
      expect(credits2.balance).toBe(Infinity);

      // Case-insensitivity & whitespace trimming
      expect(isOwnerEmail('  NAMHO03052K9@GMAIL.COM  ')).toBe(true);
      expect(isOwnerEmail('HUYENTRANTT09@GMAIL.COM\n')).toBe(true);
      expect(getSubscriptionBadge({ email: 'NAMHO03052K9@GMAIL.COM' }).tier).toBe('founder');
    });

    it('4.2 Malicious non-owner emails attempting spoofing / privilege escalation are strictly REJECTED from Founder VIP', () => {
      const spoofAttempts = [
        'evil_namho03052k9@gmail.com',                 // Prefix injection
        'namho03052k9@gmail.com.evil.com',             // Suffix injection
        'namho03052k9@sub.gmail.com',                  // Subdomain spoofing
        'namho03052k9@attacker.com',                   // Domain substitution
        'namho03052k9@gmail.co',                       // Typo TLD
        'namho03052k9@gmail.org',                      // Alternative TLD
        'namho03052k9.fake@gmail.com',                 // Suffix in localpart
        'huyentrantt09@gmail.com.attacker.org',        // Suffix injection on lady boss
        'admin@pomofocus.vn',                          // Admin alias without credentials
        'root@pomofocus.vn',                           // Root alias
        'attacker@gmail.com',                          // Generic attacker
        'namho03052k9@gmail.com%00',                   // Null byte injection attempt
        ' namho 03052k9@gmail.com ',                   // Space in local part
      ];

      for (const maliciousEmail of spoofAttempts) {
        expect(isOwnerEmail(maliciousEmail)).toBe(false);

        const badge = getSubscriptionBadge({ email: maliciousEmail });
        expect(badge.tier).not.toBe('founder');
        expect(badge.label).not.toBe('Founder VIP');
        expect(badge.icon).not.toBe('crown');

        const credits = formatUserCredits(50, { email: maliciousEmail });
        expect(credits.isUnlimited).toBe(false);
        expect(credits.balance).not.toBe(Infinity);
        expect(credits.label).not.toBe('Credits ∞');
      }
    });

    it('4.3 Falsy and malformed inputs to isOwnerEmail and getSubscriptionBadge do not escalate privilege', () => {
      const falsyInputs = [null, undefined, '', '   ', '\t', '\n'];

      for (const input of falsyInputs) {
        expect(isOwnerEmail(input)).toBe(false);
        const badge = getSubscriptionBadge({ email: input });
        expect(badge.tier).toBe('free');
        expect(badge.label).toBe('Free');
        expect(badge.icon).toBe('user');
      }

      // Completely null/undefined user
      expect(getSubscriptionBadge(null).tier).toBe('free');
      expect(getSubscriptionBadge(undefined).tier).toBe('free');
      expect(hasVipAccess(null)).toBe(false);
      expect(hasVipAccess(undefined)).toBe(false);
    });

    it('4.4 Non-owner user cannot escalate privilege via arbitrary plan string or excessive credit values', () => {
      // Free user with high credit balance
      const freeUserWithHighCredits = {
        email: 'attacker@gmail.com',
        plan: 'free',
        role: 'user',
      };
      expect(hasVipAccess(freeUserWithHighCredits)).toBe(false);
      const freeBadge = getSubscriptionBadge(freeUserWithHighCredits);
      expect(freeBadge.tier).toBe('free');
      expect(freeBadge.label).toBe('Free');

      const credits = formatUserCredits(999999, freeUserWithHighCredits);
      expect(credits.isUnlimited).toBe(false);
      expect(credits.balance).toBe(999999);
      expect(credits.label).toBe('999.999 Credits');

      // Fake plan string (e.g. 'super_admin_bypass')
      const fakePlanUser = {
        email: 'attacker@gmail.com',
        plan: 'super_admin_bypass',
        role: 'user',
      };
      expect(hasVipAccess(fakePlanUser)).toBe(false);
      expect(getSubscriptionBadge(fakePlanUser).tier).toBe('free');
    });

    it('4.5 PlatformHeader renders Founder VIP badge and infinite credits for owner, but standard HUD for regular user', () => {
      // Test 1: Logged in as Founder
      useAuthStore.setState({
        user: {
          id: 'owner_usr',
          email: 'namho03052k9@gmail.com',
          displayName: 'Bảo Nam Founder',
          role: 'founder',
        } as any,
        isAuthenticated: true,
      });

      const { unmount: unmountOwner } = render(<PlatformHeader />);

      // Quick AI HUD shows Credits ∞
      const aiBtn = screen.getByTestId('header-ai-btn');
      expect(aiBtn.textContent).toContain('Credits ∞');

      // Open Dropdown to verify Founder VIP badge
      const avatarBtn = screen.getByTestId('header-user-avatar-btn');
      act(() => {
        fireEvent.click(avatarBtn);
      });

      const ownerBadge = screen.getByTestId('header-user-badge');
      expect(ownerBadge.textContent).toBe('Founder VIP');
      expect(ownerBadge.className).toContain('text-amber-300');
      unmountOwner();

      // Test 2: Logged in as Free Attacker
      useAuthStore.setState({
        user: {
          id: 'free_usr',
          email: 'attacker@gmail.com',
          displayName: 'Attacker User',
          role: 'user',
          plan: 'free',
        } as any,
        isAuthenticated: true,
      });
      useAiStore.setState({ aiCreditsBalance: 45 });

      render(<PlatformHeader />);

      const freeAiBtn = screen.getByTestId('header-ai-btn');
      expect(freeAiBtn.textContent).toContain('45 Credits');
      expect(freeAiBtn.textContent).not.toContain('∞');

      const freeAvatarBtn = screen.getByTestId('header-user-avatar-btn');
      act(() => {
        fireEvent.click(freeAvatarBtn);
      });

      const freeBadge = screen.getByTestId('header-user-badge');
      expect(freeBadge.textContent).toBe('Free');
      expect(freeBadge.className).not.toContain('text-amber-300');
    });
  });
});
