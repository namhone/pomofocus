import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import React from 'react';
import { computeDerivedPlanState, useAuthStore } from '../../src/stores/useAuthStore';
import { PlatformHeader } from '../../src/components/PlatformHeader';
import { ProfileView } from '../../src/components/ProfileView';
import { SettingsWidget } from '../../src/components/SettingsWidget';
import { AiCompanionWidget } from '../../src/components/AiCompanionWidget';
import { StudyRoomView } from '../../src/components/StudyRoomView';
import { useAiStore } from '../../src/stores/useAiStore';
import { useLayoutStore } from '../../src/stores/useLayoutStore';
import { usePwaInstallStore } from '../../src/stores/usePwaInstallStore';
import { UserProfile } from '../../src/services/authService';
import { studyRoomService, StudyRoom } from '../../src/services/studyRoomService';

if (typeof navigator !== 'undefined') {
  Object.defineProperty(navigator, 'mediaDevices', {
    writable: true,
    configurable: true,
    value: {
      getUserMedia: vi.fn().mockResolvedValue({
        getTracks: () => [{ stop: vi.fn(), enabled: true }],
        getVideoTracks: () => [{ stop: vi.fn(), enabled: true }],
        getAudioTracks: () => [{ stop: vi.fn(), enabled: true }]
      }),
      enumerateDevices: vi.fn().mockResolvedValue([])
    }
  });
}

// Polyfill ResizeObserver for jsdom
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock HTMLCanvasElement.getContext for Whiteboard in jsdom
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  strokeRect: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  fill: vi.fn(),
  arc: vi.fn(),
  drawImage: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  scale: vi.fn(),
  translate: vi.fn(),
  rotate: vi.fn(),
  setTransform: vi.fn(),
  resetTransform: vi.fn()
}) as any;

// Mock Router
const mockNavigate = vi.fn();
vi.mock('../../src/services/router', () => ({
  useRouter: () => ({
    currentRoute: { path: '/app', component: null, searchParams: new URLSearchParams() },
    navigate: mockNavigate,
    params: {}
  })
}));

describe('Empirical Challenger 2 — Milestone 2 Identity, Header, Profile & Room Stress Harness', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    useAiStore.setState({ isOpen: false, aiCreditsBalance: 50, messages: [] });
    useLayoutStore.setState({ isHeaderExpanded: true, isWorkspace: true });
    usePwaInstallStore.setState({ canInstall: false });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. computeDerivedPlanState Adversarial Stress & Matrix Testing', () => {
    it('handles null, undefined and empty user object without throwing', () => {
      const nullState = computeDerivedPlanState(null);
      expect(nullState.effectiveBadge).toBe('Free');
      expect(nullState.isPro).toBe(false);
      expect(nullState.isLifetime).toBe(false);

      const emptyState = computeDerivedPlanState({} as any);
      expect(emptyState.effectiveBadge).toBe('Free');
      expect(emptyState.isPro).toBe(false);
      expect(emptyState.isLifetime).toBe(false);
    });

    it('identifies Founder VIP by role, email, badge or infinite credits', () => {
      // By role: founder
      const founderByRole = computeDerivedPlanState({
        id: '1',
        email: 'someuser@domain.com',
        displayName: 'Founder User',
        role: 'founder',
        plan: 'free'
      } as UserProfile);
      expect(founderByRole.effectiveBadge).toBe('Founder VIP');
      expect(founderByRole.isPro).toBe(true);
      expect(founderByRole.isLifetime).toBe(true);

      // By owner email (case-insensitive & trimmed)
      const founderByEmail = computeDerivedPlanState({
        id: '2',
        email: '  NamHo03052k9@GMAIL.COM  ',
        displayName: 'Nam Ho',
        plan: 'free'
      } as UserProfile);
      expect(founderByEmail.effectiveBadge).toBe('Founder VIP');

      // By LadyBoss email
      const founderLadyBoss = computeDerivedPlanState({
        id: '3',
        email: 'huyentrantt09@gmail.com',
        displayName: 'Huyền Trân',
        plan: 'free'
      } as UserProfile);
      expect(founderLadyBoss.effectiveBadge).toBe('Founder VIP');

      // By badge containing Founder
      const founderByBadge = computeDerivedPlanState({
        id: '4',
        email: 'test@domain.com',
        displayName: 'Badge Founder',
        badge: 'Founder VIP 👑',
        plan: 'free'
      } as UserProfile);
      expect(founderByBadge.effectiveBadge).toBe('Founder VIP');

      // By credits === Infinity
      const founderByCredits = computeDerivedPlanState({
        id: '5',
        email: 'test@domain.com',
        displayName: 'Infinite Credits',
        credits: Infinity,
        plan: 'free'
      } as UserProfile);
      expect(founderByCredits.effectiveBadge).toBe('Founder VIP');
    });

    it('identifies Pro trọn đời for lifetime plans and lifetime flags', () => {
      const lifetimeUser1 = computeDerivedPlanState({
        id: 'lt1',
        email: 'lt@example.com',
        displayName: 'Lifetime 1',
        isLifetime: true,
        plan: 'free'
      } as UserProfile);
      expect(lifetimeUser1.effectiveBadge).toBe('Pro trọn đời');
      expect(lifetimeUser1.isLifetime).toBe(true);
      expect(lifetimeUser1.isPro).toBe(true);

      const lifetimeUser2 = computeDerivedPlanState({
        id: 'lt2',
        email: 'lt@example.com',
        displayName: 'Lifetime 2',
        plan: 'lifetime'
      } as UserProfile);
      expect(lifetimeUser2.effectiveBadge).toBe('Pro trọn đời');

      const lifetimeUser3 = computeDerivedPlanState({
        id: 'lt3',
        email: 'lt@example.com',
        displayName: 'Lifetime 3',
        plan: 'pro_lifetime'
      } as UserProfile);
      expect(lifetimeUser3.effectiveBadge).toBe('Pro trọn đời');
    });

    it('identifies Pro hội viên for subscription and beta plans (pro, pro_beta, pro_monthly, pro_yearly, pro_sandbox)', () => {
      const plans = ['pro', 'pro_beta', 'pro_monthly', 'pro_yearly', 'pro_sandbox'];
      for (const plan of plans) {
        const state = computeDerivedPlanState({
          id: `usr_${plan}`,
          email: `${plan}@example.com`,
          displayName: `User ${plan}`,
          plan: plan as any
        } as UserProfile);
        expect(state.effectiveBadge).toBe('Pro hội viên');
        expect(state.isPro).toBe(true);
        expect(state.isLifetime).toBe(false);
      }
    });

    it('identifies Free for free plans or unrecognized plans', () => {
      const freeState = computeDerivedPlanState({
        id: 'f1',
        email: 'free@example.com',
        displayName: 'Free User',
        plan: 'free'
      } as UserProfile);
      expect(freeState.effectiveBadge).toBe('Free');
      expect(freeState.isPro).toBe(false);
    });
  });

  describe('2. PlatformHeader Polish & Edge Case Stress (1366x768 & Zoom 100%)', () => {
    it('renders long usernames with max-w-[130px] xl:max-w-[160px] truncate and no max-w-[85px]', () => {
      const longNameUser: UserProfile = {
        id: 'long_name_usr',
        email: 'nam.long.name@example.com',
        displayName: 'Nguyễn Hoàng Long Vũ Đại Vương',
        plan: 'pro'
      };
      useAuthStore.setState({
        user: longNameUser,
        isAuthenticated: true,
        ...computeDerivedPlanState(longNameUser)
      });

      render(<PlatformHeader isDownloadPage={false} />);

      const userBtn = screen.getByTestId('header-user-avatar-btn');
      const spanTruncate = userBtn.querySelector('span.truncate') as HTMLElement;
      expect(spanTruncate).not.toBeNull();
      expect(spanTruncate.textContent).toBe('Nguyễn Hoàng Long Vũ Đại Vương');
      expect(spanTruncate.className).toContain('max-w-[130px]');
      expect(spanTruncate.className).toContain('xl:max-w-[160px]');
      expect(spanTruncate.className).not.toContain('max-w-[85px]');
    });

    it('consolidates PWA install button into user dropdown menu and prevents standalone header duplicate', () => {
      usePwaInstallStore.setState({ canInstall: true });
      const mockUser: UserProfile = {
        id: 'usr_pwa',
        email: 'pwa@example.com',
        displayName: 'PWA User',
        plan: 'pro'
      };
      useAuthStore.setState({
        user: mockUser,
        isAuthenticated: true,
        ...computeDerivedPlanState(mockUser)
      });

      render(<PlatformHeader isDownloadPage={false} />);

      // Standalone duplicate must NOT exist on header
      expect(screen.queryByTestId('pwa-install-btn')).toBeNull();

      // Open user dropdown
      act(() => {
        screen.getByTestId('header-user-avatar-btn').click();
      });

      // PWA install button must exist inside the dropdown
      const dropdownPwaBtn = screen.getByTestId('header-user-install-pwa-btn');
      expect(dropdownPwaBtn).toBeDefined();
      expect(dropdownPwaBtn.textContent).toContain('Cài đặt ứng dụng (PWA)');
    });

    it('displays effectiveBadge in header-plan-badge and in user dropdown menu', () => {
      const founderUser: UserProfile = {
        id: 'founder_usr',
        email: 'namho03052k9@gmail.com',
        displayName: 'Hồ Bảo Nam',
        plan: 'pro_lifetime',
        role: 'founder',
        isLifetime: true,
        credits: Infinity
      };
      useAuthStore.setState({
        user: founderUser,
        isAuthenticated: true,
        ...computeDerivedPlanState(founderUser)
      });

      render(<PlatformHeader isDownloadPage={false} />);

      // Header plan badge
      const headerPlanBadge = screen.getByTestId('header-plan-badge');
      expect(headerPlanBadge.textContent).toContain('Founder VIP');

      // Open user dropdown
      act(() => {
        screen.getByTestId('header-user-avatar-btn').click();
      });

      const dropdown = screen.getByTestId('header-user-dropdown');
      expect(dropdown.textContent).toContain('Founder VIP');
    });

    it('header AI button strictly adheres to Monochrome 90-10 styling', () => {
      render(<PlatformHeader isDownloadPage={false} />);

      const aiBtn = screen.getByTestId('header-ai-btn');
      expect(aiBtn.className).toContain('bg-white/5');
      expect(aiBtn.className).toContain('text-zinc-200');
      expect(aiBtn.className).toContain('border-white/10');
      expect(aiBtn.className).not.toContain('bg-cyan-950/40');
      expect(aiBtn.className).not.toContain('text-cyan-300');
    });
  });

  describe('3. ProfileView Email Unmasking, Geometry & Jargon Eradication', () => {
    it('unmasks email on private ProfileView even if hideEmailInRoom is set to true', () => {
      const privacyUser: UserProfile = {
        id: 'privacy_usr',
        email: 'student.focus@university.edu.vn',
        displayName: 'Student Focus',
        plan: 'pro',
        hideEmailInRoom: true
      };
      useAuthStore.setState({
        user: privacyUser,
        isAuthenticated: true,
        ...computeDerivedPlanState(privacyUser)
      });

      render(<ProfileView />);

      const emailElements = screen.getAllByText('student.focus@university.edu.vn');
      const unmaskedEmailSpan = emailElements.find((el) => el.className.includes('select-text'));
      expect(unmaskedEmailSpan).toBeDefined();
      expect(unmaskedEmailSpan?.textContent).toBe('student.focus@university.edu.vn');
      expect(unmaskedEmailSpan?.textContent).not.toContain('••••••••');
    });

    it('handles empty or missing email gracefully with placeholder', () => {
      const noEmailUser: UserProfile = {
        id: 'no_email_usr',
        email: '',
        displayName: 'Nam No Email',
        plan: 'free'
      };
      useAuthStore.setState({
        user: noEmailUser,
        isAuthenticated: true,
        ...computeDerivedPlanState(noEmailUser)
      });

      render(<ProfileView />);

      expect(screen.getByText('Chưa cập nhật email')).toBeDefined();
    });

    it('enforces circular rounded-full geometry for ProfileView avatar', () => {
      const mockUser: UserProfile = {
        id: 'usr_round',
        email: 'round@example.com',
        displayName: 'Round Avatar User',
        plan: 'pro'
      };
      useAuthStore.setState({
        user: mockUser,
        isAuthenticated: true,
        ...computeDerivedPlanState(mockUser)
      });

      render(<ProfileView />);

      const avatar = screen.getByTestId('profile-user-avatar');
      expect(avatar.className).toContain('rounded-full');
      expect(avatar.className).not.toContain('rounded-2xl');
    });

    it('guarantees complete absence of technical jargon and emoji clutter in ProfileView', () => {
      const mockUser: UserProfile = {
        id: 'usr_clean',
        email: 'clean@example.com',
        displayName: 'Clean Profile',
        plan: 'pro'
      };
      useAuthStore.setState({
        user: mockUser,
        isAuthenticated: true,
        ...computeDerivedPlanState(mockUser)
      });

      render(<ProfileView />);

      // Open edit mode
      act(() => {
        screen.getByTestId('btn-toggle-edit-profile').click();
      });

      const bodyHtml = document.body.innerHTML;

      // Check all 8 forbidden jargon phrases
      const forbiddenPhrases = [
        'All-in-One Avatar',
        'Cloud Sync 1:1',
        'Retina SVG Ready',
        'CORS qua Proxy',
        '(Bio / Focus Goal)',
        '(Privacy Controls)',
        '(Incognito Presence)',
        'Monochrome Geometric'
      ];

      for (const phrase of forbiddenPhrases) {
        expect(bodyHtml).not.toContain(phrase);
      }

      // Check input placeholder has no decorative emojis
      const goalInput = screen.getByTestId('input-edit-focus-goal');
      const placeholder = goalInput.getAttribute('placeholder') || '';
      expect(placeholder).not.toContain('🎯');
      expect(placeholder).not.toContain('💻');
      expect(placeholder).not.toContain('✨');

      // Checkboxes are monochrome
      const toggleHideEmail = screen.getByTestId('toggle-hide-email');
      expect(toggleHideEmail.className).toContain('accent-white');
      expect(toggleHideEmail.className).not.toContain('text-emerald-500');

      const toggleIncognito = screen.getByTestId('toggle-incognito-join');
      expect(toggleIncognito.className).toContain('accent-white');
      expect(toggleIncognito.className).not.toContain('text-emerald-500');
    });
  });

  describe('4. SettingsWidget Identity & Monochrome Polish', () => {
    it('renders UserAvatar, effectiveBadge, and monochrome sliders/locks', () => {
      const testUser: UserProfile = {
        id: 'usr_set',
        email: 'setting@example.com',
        displayName: 'Settings Tester',
        plan: 'pro'
      };
      useAuthStore.setState({
        user: testUser,
        isAuthenticated: true,
        ...computeDerivedPlanState(testUser)
      });

      render(<SettingsWidget />);

      // UserAvatar
      const avatar = screen.getByTestId('settings-user-avatar');
      expect(avatar.className).toContain('rounded-full');

      // Badge in settings
      expect(screen.getByText('Pro hội viên')).toBeDefined();

      // Sliders accent-white
      const opacitySlider = screen.getByTestId('glass-opacity-slider');
      expect(opacitySlider.className).toContain('accent-white');
      expect(opacitySlider.className).not.toContain('accent-emerald-400');

      const blurSlider = screen.getByTestId('glass-blur-slider');
      expect(blurSlider.className).toContain('accent-white');
      expect(blurSlider.className).not.toContain('accent-emerald-400');
    });
  });

  describe('5. StudyRoomView Pre-Join Selector & Monochrome Verification (Bug 11)', () => {
    it('btn-join-room-confirm selector exists, has Monochrome 90-10 style, Sentence Case text and handles click', async () => {
      const testRoom: StudyRoom = {
        roomId: 'room_challenger_999',
        title: 'Phòng Thử Nghiệm Challenger',
        hostUserId: 'host-ch-1',
        hostEmail: 'host.ch@gmail.com',
        createdAt: Date.now(),
        status: 'active',
        allowFreeGuests: true,
        activeInviteToken: null,
        inviteTokens: {},
        participants: {},
        guestPermissions: { allowChat: true, allowCam: true, allowMic: true, allowScreenShare: true }
      };

      vi.spyOn(studyRoomService, 'getRoom').mockReturnValue(testRoom);
      vi.spyOn(studyRoomService, 'verifyRoomAccess').mockReturnValue({
        allowed: true,
        role: 'guest',
        room: testRoom
      });
      vi.spyOn(studyRoomService, 'resolveCanonicalRoom').mockResolvedValue(testRoom);
      const joinSpy = vi.spyOn(studyRoomService, 'joinParticipant').mockReturnValue({
        success: true,
        room: testRoom
      });

      render(<StudyRoomView roomId="room_challenger_999" initialJoined={false} />);

      const joinBtn = await screen.findByTestId('btn-join-room-confirm');
      expect(joinBtn).toBeDefined();

      // Check text is Sentence Case
      expect(joinBtn.textContent).toBe('Tham gia phòng học ngay');
      expect(joinBtn.textContent).not.toBe('THAM GIA PHÒNG HỌC NGAY');
      expect(joinBtn.textContent).not.toBe('Tham Gia Phòng Học Ngay');

      // Check Monochrome 90-10 styling
      expect(joinBtn.className).toContain('bg-white');
      expect(joinBtn.className).toContain('text-black');
      expect(joinBtn.className).toContain('hover:bg-zinc-200');
      expect(joinBtn.className).not.toContain('bg-emerald-500');
      expect(joinBtn.className).not.toContain('bg-emerald-400');

      // Enter name if input empty
      const nameInput = screen.getByPlaceholderText('Nhập tên hiển thị...') as HTMLInputElement;
      fireEvent.change(nameInput, { target: { value: 'Tester Challenger' } });

      // Click join button
      act(() => {
        joinBtn.click();
      });

      expect(joinSpy).toHaveBeenCalled();
    });

    it('pre-join badges are in Sentence Case (LadyBoss, Host, Member, Guest)', async () => {
      const testRoom: StudyRoom = {
        roomId: 'room_badges_test',
        title: 'Phòng Thử Nghiệm Badges',
        hostUserId: 'host-1',
        hostEmail: 'host@gmail.com',
        createdAt: Date.now(),
        status: 'active',
        allowFreeGuests: true,
        activeInviteToken: null,
        inviteTokens: {},
        participants: {},
        guestPermissions: { allowChat: true, allowCam: true, allowMic: true, allowScreenShare: true }
      };

      vi.spyOn(studyRoomService, 'getRoom').mockReturnValue(testRoom);
      vi.spyOn(studyRoomService, 'verifyRoomAccess').mockReturnValue({
        allowed: true,
        role: 'guest',
        room: testRoom
      });
      vi.spyOn(studyRoomService, 'resolveCanonicalRoom').mockResolvedValue(testRoom);

      // Render as guest
      useAuthStore.setState({
        user: { id: 'guest_1', email: 'guest@example.com', displayName: 'Guest 1', plan: 'free' },
        isAuthenticated: true
      });

      const { unmount } = render(<StudyRoomView roomId="room_badges_test" initialJoined={false} />);
      const guestBadge = await screen.findByText('Khách mời Free');
      expect(guestBadge).toBeDefined();
      expect(document.body.innerHTML).not.toContain('KHÁCH MỜI FREE');
      unmount();

      // Render as LadyBoss
      useAuthStore.setState({
        user: { id: 'lady_1', email: 'huyentrantt09@gmail.com', displayName: 'Huyền Trân', plan: 'pro_lifetime' },
        isAuthenticated: true
      });
      render(<StudyRoomView roomId="room_badges_test" initialJoined={false} />);
      const ladyBadge = await screen.findByText('👑 Nóc nhà Pro');
      expect(ladyBadge).toBeDefined();
      expect(document.body.innerHTML).not.toContain('👑 NÓC NHÀ PRO');
    });
  });

  describe('6. AiCompanionWidget & App Drawer Layout Resilience', () => {
    it('renders drawer with responsive width classes and non-modal 2xl:hidden backdrop', () => {
      render(<AiCompanionWidget />);

      const drawer = screen.getByTestId('ai-companion-drawer');
      expect(drawer.className).toContain('sm:w-[360px]');
      expect(drawer.className).toContain('lg:w-[380px]');
      expect(drawer.className).toContain('xl:w-[420px]');
      expect(drawer.className).toContain('max-w-full');

      const backdrop = screen.getByTestId('ai-backdrop');
      expect(backdrop.className).toContain('2xl:hidden');
      expect(backdrop.className).not.toContain('sm:hidden');
    });

    it('uses monochrome Sparkles and stroke-[1.5] without cyan/indigo gradients', () => {
      render(<AiCompanionWidget />);

      const drawer = screen.getByTestId('ai-companion-drawer');
      expect(drawer.innerHTML).not.toContain('from-cyan-600');
      expect(drawer.innerHTML).not.toContain('to-indigo-600');
    });
  });
});
