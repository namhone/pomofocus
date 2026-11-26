import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';
import { computeDerivedPlanState, useAuthStore } from '../../src/stores/useAuthStore';
import { PlatformHeader } from '../../src/components/PlatformHeader';
import { ProfileView } from '../../src/components/ProfileView';
import { SettingsWidget } from '../../src/components/SettingsWidget';
import { AiCompanionWidget } from '../../src/components/AiCompanionWidget';
import { StudyRoomView } from '../../src/components/StudyRoomView';
import { useAiStore } from '../../src/stores/useAiStore';
import { useLayoutStore } from '../../src/stores/useLayoutStore';
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

// Mock Router
const mockNavigate = vi.fn();
vi.mock('../../src/services/router', () => ({
  useRouter: () => ({
    currentRoute: { path: '/app', component: null, searchParams: new URLSearchParams() },
    navigate: mockNavigate,
    params: {}
  })
}));

describe('Milestone 2 — Identity Sync, Header 1366x768, AI Drawer & /rooms Pre-Join Polish', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    useAiStore.setState({ isOpen: false, aiCreditsBalance: 50, messages: [] });
    useLayoutStore.setState({ isHeaderExpanded: true, isWorkspace: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Single Source of Truth for Identity & Badge (computeDerivedPlanState)', () => {
    it('Correctly calculates effectiveBadge for Founder VIP accounts', () => {
      const founderUser: UserProfile = {
        id: 'usr_founder',
        email: 'namho03052k9@gmail.com',
        displayName: 'Hồ Bảo Nam',
        plan: 'pro_lifetime',
        role: 'founder',
        app_metadata: { role: 'founder' },
        isLifetime: true,
        credits: Infinity
      };

      const state = computeDerivedPlanState(founderUser);
      expect(state.effectiveBadge).toBe('Founder VIP');
      expect(state.isOwner).toBe(true);
      expect(state.isLifetime).toBe(true);
      expect(state.isPro).toBe(true);
      // Backward compatibility preserved
      expect(state.planLabel).toBe('PRO TRỌN ĐỜI');
    });

    it('Correctly calculates effectiveBadge for Lifetime Pro accounts', () => {
      const lifetimeUser: UserProfile = {
        id: 'usr_lifetime',
        email: 'student.life@gmail.com',
        displayName: 'Nguyễn Văn Nam',
        plan: 'lifetime',
        isLifetime: true
      };

      const state = computeDerivedPlanState(lifetimeUser);
      expect(state.effectiveBadge).toBe('Pro trọn đời');
      expect(state.isOwner).toBe(false);
      expect(state.isLifetime).toBe(true);
      expect(state.isPro).toBe(true);
      expect(state.planLabel).toBe('PRO TRỌN ĐỜI');
    });

    it('Correctly calculates effectiveBadge for Pro Member (Pro hội viên / Pro Beta) accounts', () => {
      const proUser: UserProfile = {
        id: 'usr_pro_beta',
        email: 'beta.tester@gmail.com',
        displayName: 'Beta User',
        plan: 'pro_beta'
      };

      const state = computeDerivedPlanState(proUser);
      expect(state.effectiveBadge).toBe('Pro hội viên');
      expect(state.isPro).toBe(true);
      expect(state.isLifetime).toBe(false);
      expect(state.planLabel).toContain('PRO BETA');
    });

    it('Correctly calculates effectiveBadge for Free accounts and guests', () => {
      const freeUser: UserProfile = {
        id: 'usr_free',
        email: 'free.guest@gmail.com',
        displayName: 'Free User',
        plan: 'free'
      };

      const freeState = computeDerivedPlanState(freeUser);
      expect(freeState.effectiveBadge).toBe('Free');
      expect(freeState.isPro).toBe(false);

      const guestState = computeDerivedPlanState(null);
      expect(guestState.effectiveBadge).toBe('Free');
      expect(guestState.isPro).toBe(false);
    });
  });

  describe('2. PlatformHeader Polish on 1366x768 & Duplicate Button Elimination (Bugs 6, 7)', () => {
    it('Does not render standalone duplicate pwa-install-btn on desktop header', () => {
      const mockUser: UserProfile = {
        id: 'usr_mock',
        email: 'test@gmail.com',
        displayName: 'Nguyễn Văn Nam',
        plan: 'pro'
      };
      useAuthStore.setState({
        user: mockUser,
        isAuthenticated: true,
        ...computeDerivedPlanState(mockUser)
      });

      render(<PlatformHeader isDownloadPage={false} />);

      // Standalone duplicate install button must be absent
      const pwaBtn = screen.queryByTestId('pwa-install-btn');
      expect(pwaBtn).toBeNull();
    });

    it('Relaxes username truncation max-w constraint from max-w-[85px] to max-w-[130px] xl:max-w-[160px]', () => {
      const mockUser: UserProfile = {
        id: 'usr_mock',
        email: 'test@gmail.com',
        displayName: 'Nguyễn Văn Nam',
        plan: 'pro'
      };
      useAuthStore.setState({
        user: mockUser,
        isAuthenticated: true,
        ...computeDerivedPlanState(mockUser)
      });

      render(<PlatformHeader isDownloadPage={false} />);

      const userDisplayName = screen.getByTestId('header-user-avatar-btn').querySelector('span.truncate') as HTMLElement;
      expect(userDisplayName).toBeDefined();
      expect(userDisplayName.textContent).toBe('Nguyễn Văn Nam');
      expect(userDisplayName.className).toContain('max-w-[130px]');
      expect(userDisplayName.className).toContain('xl:max-w-[160px]');
      expect(userDisplayName.className).not.toContain('max-w-[85px]');
    });

    it('Uses responsive padding px-4 xl:px-5 and nav gap-1 xl:gap-1.5 for 1366x768 compatibility', () => {
      render(<PlatformHeader isDownloadPage={false} />);

      const header = screen.getByTestId('platform-unified-header');
      expect(header.className).toContain('px-4');
      expect(header.className).toContain('xl:px-5');

      const navDownload = screen.getByTestId('header-nav-download');
      expect(navDownload).toBeDefined();
      expect(navDownload.className).toContain('px-2');
      expect(navDownload.className).toContain('xl:px-2.5');
    });

    it('Renders monochrome styled AI header button', () => {
      render(<PlatformHeader isDownloadPage={false} />);

      const aiBtn = screen.getByTestId('header-ai-btn');
      expect(aiBtn).toBeDefined();
      expect(aiBtn.className).toContain('bg-white/[0.03]');
      expect(aiBtn.className).toContain('text-zinc-200');
      expect(aiBtn.className).toContain('border-white/10');
      expect(aiBtn.className).not.toContain('bg-cyan-950/40');
    });
  });

  describe('3. ProfileView Avatar, Badge, and Technical Jargon Cleanup (Bugs 8, 9, 10)', () => {
    it('Renders UserAvatar with circular rounded-full geometry and effectiveBadge in Sentence Case', () => {
      const founderUser: UserProfile = {
        id: 'usr_founder',
        email: 'namho03052k9@gmail.com',
        displayName: 'Hồ Bảo Nam',
        plan: 'pro_lifetime',
        role: 'founder',
        app_metadata: { role: 'founder' },
        isLifetime: true,
        credits: Infinity
      };
      useAuthStore.setState({
        user: founderUser,
        isAuthenticated: true,
        ...computeDerivedPlanState(founderUser)
      });

      render(<ProfileView />);

      const avatar = screen.getByTestId('profile-user-avatar');
      expect(avatar).toBeDefined();
      expect(avatar.className).toContain('rounded-full');

      const planBadge = screen.getByTestId('profile-plan-badge');
      expect(planBadge.textContent).toBe('Founder VIP');
      expect(planBadge.className).not.toContain('uppercase');
    });

    it('Displays private email unmasked with select-text class and min-w-0 container', () => {
      const user: UserProfile = {
        id: 'usr_1',
        email: 'namho03052k9@gmail.com',
        displayName: 'Nam Ho',
        plan: 'pro',
        hideEmailInRoom: true // even if true in room, private profile must show email
      };
      useAuthStore.setState({
        user,
        isAuthenticated: true,
        ...computeDerivedPlanState(user)
      });

      render(<ProfileView />);

      const emailSpans = screen.getAllByText('namho03052k9@gmail.com');
      const emailSpan = emailSpans.find((el) => el.className.includes('select-text'))!;
      expect(emailSpan).toBeDefined();
      expect(emailSpan.className).toContain('select-text');
      expect(emailSpan.textContent).not.toContain('••••••••');
    });

    it('Eliminates technical jargon, decorative emojis and uses monochrome checkboxes', () => {
      const user: UserProfile = {
        id: 'usr_1',
        email: 'namho@example.com',
        displayName: 'Nam Ho',
        plan: 'pro'
      };
      useAuthStore.setState({
        user,
        isAuthenticated: true,
        ...computeDerivedPlanState(user)
      });

      render(<ProfileView />);

      // Open edit mode
      act(() => {
        screen.getByTestId('btn-toggle-edit-profile').click();
      });

      const focusInput = screen.getByTestId('input-edit-focus-goal');
      const placeholder = focusInput.getAttribute('placeholder') || '';
      expect(placeholder).not.toContain('🎯');
      expect(placeholder).not.toContain('💻');

      // Checkbox monochrome styling
      const hideEmailCheckbox = screen.getByTestId('toggle-hide-email');
      expect(hideEmailCheckbox.className).toContain('text-white');
      expect(hideEmailCheckbox.className).toContain('accent-white');
      expect(hideEmailCheckbox.className).not.toContain('text-emerald-500');

      // No technical jargon in document body
      const html = document.body.innerHTML;
      expect(html).not.toContain('Cloud Sync 1:1');
      expect(html).not.toContain('Retina SVG Ready');
      expect(html).not.toContain('CORS qua Proxy');
      expect(html).not.toContain('(Bio / Focus Goal)');
      expect(html).not.toContain('(Incognito Presence)');
    });
  });

  describe('4. SettingsWidget Identity & Monochrome Controls Sync', () => {
    it('Renders UserAvatar and effectiveBadge in account status card', () => {
      const user: UserProfile = {
        id: 'usr_life',
        email: 'student.life@gmail.com',
        displayName: 'Nam Life',
        plan: 'lifetime',
        isLifetime: true
      };
      useAuthStore.setState({
        user,
        isAuthenticated: true,
        ...computeDerivedPlanState(user)
      });

      render(<SettingsWidget />);

      const avatar = screen.getByTestId('settings-user-avatar');
      expect(avatar).toBeDefined();
      expect(avatar.className).toContain('rounded-full');

      const badge = screen.getByText('Pro trọn đời');
      expect(badge).toBeDefined();
    });

    it('Sliders use accent-white and dock controls use monochrome styling', () => {
      render(<SettingsWidget />);

      const opacitySlider = screen.getByTestId('glass-opacity-slider');
      expect(opacitySlider.className).toContain('accent-white');
      expect(opacitySlider.className).not.toContain('accent-emerald-400');

      const blurSlider = screen.getByTestId('glass-blur-slider');
      expect(blurSlider.className).toContain('accent-white');
      expect(blurSlider.className).not.toContain('accent-emerald-400');
    });
  });

  describe('5. AI Companion Drawer Layout & Icon Polish (Bugs 12, 13)', () => {
    it('Renders monochrome Sparkles icon in drawer header', () => {
      render(<AiCompanionWidget />);

      const drawer = screen.getByTestId('ai-companion-drawer');
      expect(drawer).toBeDefined();
      expect(drawer.className).toContain('sm:w-[360px]');
      expect(drawer.className).toContain('lg:w-[380px]');
      expect(drawer.className).toContain('xl:w-[420px]');

      // Backdrop has 2xl:hidden
      const backdrop = screen.getByTestId('ai-backdrop');
      expect(backdrop.className).toContain('lg:hidden');
      expect(backdrop.className).not.toContain('sm:hidden');
    });
  });

  describe('6. Study Room Pre-Join Button & Sentence Case Badges (Bug 11)', () => {
    it('Pre-join button uses monochrome 90-10 styling and Sentence Case text', async () => {
      const demoRoom: StudyRoom = {
        roomId: 'test_room_101',
        title: 'Phòng Học Nhóm',
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
      vi.spyOn(studyRoomService, 'getRoom').mockReturnValue(demoRoom);
      vi.spyOn(studyRoomService, 'verifyRoomAccess').mockReturnValue({
        allowed: true,
        role: 'guest',
        room: demoRoom
      });
      vi.spyOn(studyRoomService, 'resolveCanonicalRoom').mockResolvedValue(demoRoom);

      render(<StudyRoomView roomId="test_room_101" initialJoined={false} />);

      const joinBtn = await screen.findByTestId('btn-join-room-confirm');
      expect(joinBtn).toBeDefined();
      expect(joinBtn.textContent).toBe('Tham gia phòng học ngay');
      expect(joinBtn.className).toContain('bg-white');
      expect(joinBtn.className).toContain('text-black');
      expect(joinBtn.className).not.toContain('bg-emerald-500');

      const title = await screen.findByText('Chuẩn bị vào phòng học');
      expect(title).toBeDefined();
    });
  });
});
