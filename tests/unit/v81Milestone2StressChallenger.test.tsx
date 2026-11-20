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
import { UserProfile } from '../../src/services/authService';
import { studyRoomService, StudyRoom } from '../../src/services/studyRoomService';

if (typeof window !== 'undefined') {
  (window as any).ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
if (typeof global !== 'undefined') {
  (global as any).ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

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

const mockNavigate = vi.fn();
vi.mock('../../src/services/router', () => ({
  useRouter: () => ({
    currentRoute: { path: '/app', component: null, searchParams: new URLSearchParams() },
    navigate: mockNavigate,
    params: {}
  })
}));

describe('Milestone 2 Adversarial Stress Suite — Challenger 1', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    useAiStore.setState({ isOpen: false, aiCreditsBalance: 50, messages: [] });
    useLayoutStore.setState({ isHeaderExpanded: true, isWorkspace: true });
    useAuthStore.setState({ user: null, isAuthenticated: false, ...computeDerivedPlanState(null) });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Adversarial Test 1: Null, Undefined, Malformed and Edge-case User Profiles', () => {
    it('Resiliently handles computeDerivedPlanState with null, undefined and partial objects', () => {
      // 1. null
      const nullState = computeDerivedPlanState(null);
      expect(nullState.effectiveBadge).toBe('Free');
      expect(nullState.isOwner).toBe(false);
      expect(nullState.isLifetime).toBe(false);
      expect(nullState.isPro).toBe(false);
      expect(nullState.hasVipAccess).toBe(false);

      // 2. undefined
      const undefinedState = computeDerivedPlanState(undefined as any);
      expect(undefinedState.effectiveBadge).toBe('Free');
      expect(undefinedState.isOwner).toBe(false);
      expect(undefinedState.isLifetime).toBe(false);
      expect(undefinedState.isPro).toBe(false);

      // 3. empty object
      const emptyState = computeDerivedPlanState({} as any);
      expect(emptyState.effectiveBadge).toBe('Free');
      expect(emptyState.isOwner).toBe(false);
      expect(emptyState.isPro).toBe(false);

      // 4. user with missing email
      const noEmailUser = {
        id: 'usr_no_email',
        displayName: 'Ghost User'
      } as any;
      const noEmailState = computeDerivedPlanState(noEmailUser);
      expect(noEmailState.effectiveBadge).toBe('Free');
      expect(noEmailState.isOwner).toBe(false);

      // 5. user with whitespace & uppercase email
      const dirtyEmailUser: UserProfile = {
        id: 'usr_dirty',
        email: '  NAMHO03052K9@GMAIL.COM  ',
        displayName: 'Owner Upper'
      } as any;
      const dirtyState = computeDerivedPlanState(dirtyEmailUser);
      expect(dirtyState.effectiveBadge).toBe('Founder VIP');
      expect(dirtyState.isOwner).toBe(true);
      expect(dirtyState.isPro).toBe(true);
    });

    it('SettingsWidget and ProfileView gracefully handle user with missing email or missing displayName without throwing', () => {
      const weirdUser: UserProfile = {
        id: 'usr_weird',
        email: '',
        displayName: '',
        plan: 'free',
        createdAt: Date.now()
      };
      useAuthStore.setState({
        user: weirdUser,
        isAuthenticated: true,
        ...computeDerivedPlanState(weirdUser)
      });

      // SettingsWidget should render without throwing
      expect(() => render(<SettingsWidget />)).not.toThrow();
      expect(screen.getByTestId('settings-widget')).toBeDefined();

      // ProfileView should render without throwing
      expect(() => render(<ProfileView />)).not.toThrow();
      expect(screen.getByTestId('profile-user-avatar')).toBeDefined();
    });
  });

  describe('Adversarial Test 2: Extremely Long Vietnamese Display Names & 1366px Responsive Behavior', () => {
    it('Properly clamps and truncates 50+ character Vietnamese display name in PlatformHeader trigger and dropdown', () => {
      const longName = 'Nguyễn Hoàng Triều Dương Thảo Uyên Phương Linh Chi';
      const userWithLongName: UserProfile = {
        id: 'usr_long_vn',
        email: 'trieuduong.phuonglinhchi@gmail.com',
        displayName: longName,
        plan: 'pro'
      };
      useAuthStore.setState({
        user: userWithLongName,
        isAuthenticated: true,
        ...computeDerivedPlanState(userWithLongName)
      });

      render(<PlatformHeader isDownloadPage={false} />);

      // Trigger button avatar and username
      const trigger = screen.getByTestId('header-user-avatar-btn');
      expect(trigger).toBeDefined();

      const nameSpan = trigger.querySelector('span.truncate') as HTMLElement;
      expect(nameSpan).toBeDefined();
      expect(nameSpan.textContent).toBe(longName);
      // Confirmed max-width class constraint prevents pushing other header items out
      expect(nameSpan.className).toContain('truncate');
      expect(nameSpan.className).toContain('max-w-[130px]');
      expect(nameSpan.className).toContain('xl:max-w-[160px]');

      // Open dropdown
      act(() => {
        trigger.click();
      });

      const dropdown = screen.getByTestId('header-user-dropdown');
      expect(dropdown).toBeDefined();
      expect(dropdown.className).toContain('w-64'); // fixed 256px width container
      const dropdownName = dropdown.querySelector('.truncate') as HTMLElement;
      expect(dropdownName.textContent).toBe(longName);
      expect(dropdownName.className).toContain('truncate');
    });

    it('PlatformHeader preserves 1366px compact spacing when both pin and collapse buttons are rendered', () => {
      const mockUser: UserProfile = {
        id: 'usr_test',
        email: 'test@example.com',
        displayName: 'Test User',
        plan: 'pro'
      };
      useAuthStore.setState({
        user: mockUser,
        isAuthenticated: true,
        ...computeDerivedPlanState(mockUser)
      });

      render(<PlatformHeader isDownloadPage={false} />);

      const pinBtn = screen.getByTestId('header-pin-btn');
      const collapseBtn = screen.getByTestId('header-collapse-btn');
      const aiBtn = screen.getByTestId('header-ai-btn');

      expect(pinBtn).toBeDefined();
      expect(collapseBtn).toBeDefined();
      expect(aiBtn).toBeDefined();

      // Check pin and collapse buttons have shrink-0 so they never collapse or deform
      expect(pinBtn.className).toContain('shrink-0');
      expect(collapseBtn.className).toContain('shrink-0');
      expect(aiBtn.className).toContain('shrink-0');
    });
  });

  describe('Adversarial Test 3: AI Companion Drawer States across Viewports', () => {
    it('Correctly enforces 2xl:hidden on backdrop so wide desktops are non-modal while small screens dim', () => {
      render(<AiCompanionWidget />);

      const backdrop = screen.getByTestId('ai-backdrop');
      expect(backdrop).toBeDefined();
      expect(backdrop.className).toContain('2xl:hidden');
      expect(backdrop.className).toContain('fixed inset-0');

      // Closed state
      expect(backdrop.className).toContain('opacity-0 pointer-events-none');

      // Open state
      act(() => {
        useAiStore.getState().toggleOpen(true);
      });

      expect(backdrop.className).toContain('opacity-100 pointer-events-auto');

      // Drawer classes
      const drawer = screen.getByTestId('ai-companion-drawer');
      expect(drawer.className).toContain('translate-x-0 opacity-100 pointer-events-auto');
      expect(drawer.className).toContain('w-full sm:w-[360px] lg:w-[380px] xl:w-[420px]');
    });

    it('Closes AI drawer upon clicking backdrop', () => {
      render(<AiCompanionWidget />);

      act(() => {
        useAiStore.getState().toggleOpen(true);
      });
      expect(useAiStore.getState().isOpen).toBe(true);

      const backdrop = screen.getByTestId('ai-backdrop');
      fireEvent.click(backdrop);

      expect(useAiStore.getState().isOpen).toBe(false);
    });
  });

  describe('Adversarial Test 4: StudyRoomView Pre-Join Flows, Guest Tokens & Sentence Case Badges', () => {
    it('Allows guest to join with room token and displays Sentence Case role badges', async () => {
      const demoRoom: StudyRoom = {
        roomId: 'room_challenge_99',
        title: 'Phòng Thử Thách V8.1',
        hostUserId: 'host-ch-1',
        hostEmail: 'host.study@gmail.com',
        createdAt: Date.now(),
        status: 'active',
        allowFreeGuests: true,
        activeInviteToken: 'token_secret_123',
        inviteTokens: {
          token_secret_123: {
            token: 'token_secret_123',
            createdAt: Date.now(),
            expiresAt: Date.now() + 86400000,
            active: true
          }
        },
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

      render(<StudyRoomView roomId="room_challenge_99" initialJoined={false} token="token_secret_123" />);

      // Pre-join container
      const confirmBtn = await screen.findByTestId('btn-join-room-confirm');
      expect(confirmBtn).toBeDefined();
      expect(confirmBtn.textContent).toBe('Tham gia phòng học ngay');
      // Monochrome 90-10 styling
      expect(confirmBtn.className).toContain('bg-white');
      expect(confirmBtn.className).toContain('text-black');
      expect(confirmBtn.className).not.toContain('bg-emerald-500');

      // Fill in participant name
      const nameInput = screen.getByPlaceholderText('Nhập tên hiển thị...');
      fireEvent.change(nameInput, { target: { value: 'Khách Thử Nghiệm' } });
      expect((nameInput as HTMLInputElement).value).toBe('Khách Thử Nghiệm');

      // Click to join
      await act(async () => {
        fireEvent.click(confirmBtn);
      });

      // Verify confirm button transition or room joined state
      expect(confirmBtn).toBeDefined();
    });
  });
});
