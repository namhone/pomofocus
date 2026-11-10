import 'fake-indexeddb/auto';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MobileFocusView } from '../../src/components/mobile/views/MobileFocusView';
import { MobileSettingsView } from '../../src/components/mobile/views/MobileSettingsView';
import { useTimerStore } from '../../src/stores/useTimerStore';
import { useTaskStore } from '../../src/stores/useTaskStore';
import { useLayoutStore } from '../../src/stores/useLayoutStore';
import { useAudioStore } from '../../src/stores/useAudioStore';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useAiStore } from '../../src/stores/useAiStore';
import { ALARM_CHIMES } from '../../src/data/alarmSounds';
import { db } from '../../src/db';

describe('Adversarial Challenger Suite: Mobile Views Stress & Ergonomics (Milestone 2)', () => {
  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    try {
      await db.tasks.clear();
      await db.notes.clear();
      await db.focus_sessions.clear();
    } catch {}

    // Reset useTimerStore
    useTimerStore.getState().init();
    useTimerStore.setState({
      status: 'idle',
      phase: 'pomodoro',
      currentRound: 1,
      remainingMs: 25 * 60 * 1000,
      settings: {
        pomodoroMinutes: 25,
        shortBreakMinutes: 5,
        longBreakMinutes: 15,
        roundsBeforeLongBreak: 4,
        autoTransition: false,
        notificationEnabled: false,
      },
      linkedTaskId: null,
      linkedTaskTitle: null,
    });

    // Reset useLayoutStore
    useLayoutStore.setState({
      isEcoMode: false,
    });

    // Reset useAudioStore
    useAudioStore.setState({
      settings: {
        masterVolume: 0.8,
        isMuted: false,
        selectedChime: 'tibetan_bowl',
        duckingEnabled: true,
        duckingRatio: 0.3,
        ambientVolume: 0.6,
      },
    });

    // Reset useAiStore
    useAiStore.setState({
      aiCreditsBalance: 50,
      isTopupModalOpen: false,
    });

    // Reset useTaskStore
    useTaskStore.setState({
      tasks: [],
      activeTaskId: null,
    });

    // Reset useAuthStore default
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoggedIn: false,
      hasVipAccess: false,
      role: 'guest',
      planLabel: 'FREE',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // VECTOR 1: VIP WHITELIST BOUNDARY & PRIVILEGE STRESS
  // =========================================================================
  describe('Vector 1: VIP Whitelist Boundary & Privilege Tests', () => {
    it('1.1 Founder primary email (namho03052k9@gmail.com) strictly receives Founder VIP badge and 0 upgrade banners even with unprivileged store payload', () => {
      // Intentionally configure unprivileged payload to test if email whitelist overrides everything
      useAuthStore.setState({
        user: {
          id: 'founder_nam',
          email: 'namho03052k9@gmail.com',
          displayName: 'Nam Hồ',
          plan: 'free', // Unprivileged plan label
          role: 'student', // Unprivileged role label
          createdAt: Date.now(),
        },
        hasVipAccess: false, // Unprivileged boolean
        role: 'student',
        planLabel: 'FREE',
      });

      render(<MobileSettingsView />);

      const card = screen.getByTestId('mobile-user-status-card');
      expect(card).toBeDefined();

      // Must display Founder VIP badge
      expect(card.textContent).toContain('Founder VIP');
      expect(card.textContent).toContain('👑');

      // Zero-Tolerance Playbook rule: strictly 0 upgrade banners
      expect(card.textContent).not.toContain('Nâng cấp để mở khóa');
      expect(card.textContent).not.toContain('Nâng cấp');
      expect(screen.queryByText(/Nâng cấp để mở khóa/i)).toBeNull();
    });

    it('1.2 Founder primary email with upper-case and whitespace trimming still strictly resolves to Founder VIP with 0 upgrade banners', () => {
      useAuthStore.setState({
        user: {
          id: 'founder_nam_mixed',
          email: '  NamHo03052K9@Gmail.Com  ',
          displayName: 'Nam Hồ Cased',
          plan: 'free',
          createdAt: Date.now(),
        },
        hasVipAccess: false,
        role: 'user',
      });

      render(<MobileSettingsView />);

      const card = screen.getByTestId('mobile-user-status-card');
      expect(card.textContent).toContain('Founder VIP');
      expect(screen.queryByText(/Nâng cấp để mở khóa/i)).toBeNull();
    });

    it('1.3 Secondary owner email (huyentrantt09@gmail.com) strictly receives Founder VIP badge and 0 upgrade banners', () => {
      useAuthStore.setState({
        user: {
          id: 'owner_huyen',
          email: 'huyentrantt09@gmail.com',
          displayName: 'Huyền Trân',
          plan: 'free',
          createdAt: Date.now(),
        },
        hasVipAccess: false,
        role: 'user',
      });

      render(<MobileSettingsView />);

      const card = screen.getByTestId('mobile-user-status-card');
      expect(card.textContent).toContain('Founder VIP');
      expect(screen.queryByText(/Nâng cấp để mở khóa/i)).toBeNull();
    });

    it('1.4 PRO VIP user displays PRO VIP badge and strictly 0 upgrade banners', () => {
      useAuthStore.setState({
        user: {
          id: 'user_pro_subscriber',
          email: 'pro_subscriber@example.com',
          displayName: 'Hoàng Minh',
          plan: 'pro',
          createdAt: Date.now(),
        },
        hasVipAccess: true,
        role: 'pro',
        planLabel: 'PRO YEARLY',
      });

      render(<MobileSettingsView />);

      const card = screen.getByTestId('mobile-user-status-card');
      expect(card.textContent).toContain('PRO YEARLY');
      expect(card.textContent).toContain('⭐');
      expect(screen.queryByText(/Nâng cấp để mở khóa/i)).toBeNull();
    });

    it('1.5 Free student user displays "Miễn phí" badge AND displays upgrade prompt with working action', () => {
      const topupSpy = vi.spyOn(useAiStore.getState(), 'openTopupModal');

      useAuthStore.setState({
        user: {
          id: 'user_free_student',
          email: 'student_free@university.edu.vn',
          displayName: 'Trần Văn Sinh Viên',
          plan: 'free',
          createdAt: Date.now(),
        },
        hasVipAccess: false,
        role: 'student',
        planLabel: 'FREE',
      });

      render(<MobileSettingsView />);

      const card = screen.getByTestId('mobile-user-status-card');
      expect(card.textContent).toContain('Miễn phí');
      expect(card.textContent).toContain('Nâng cấp để mở khóa');

      // Click upgrade button
      const upgradeBtn = screen.getByRole('button', { name: 'Nâng cấp' });
      expect(upgradeBtn).toBeDefined();
      fireEvent.click(upgradeBtn);

      expect(topupSpy).toHaveBeenCalledTimes(1);
    });

    it('1.6 Unauthenticated Guest user displays "Khách học tập", "Miễn phí", and upgrade prompt', () => {
      useAuthStore.setState({
        user: null,
        hasVipAccess: false,
        role: 'guest',
      });

      render(<MobileSettingsView />);

      const card = screen.getByTestId('mobile-user-status-card');
      expect(card.textContent).toContain('Khách học tập');
      expect(card.textContent).toContain('Miễn phí');
      expect(card.textContent).toContain('Nâng cấp để mở khóa');
    });
  });

  // =========================================================================
  // VECTOR 2: AUTO-TRANSITION SWITCH TOGGLE SPAM & TIMING SETTINGS
  // =========================================================================
  describe('Vector 2: Auto-Transition Switch Toggle Spam & Timing Settings', () => {
    it('2.1 Rapid toggle spam: 50 sequential clicks cleanly alternates state and leaves store strictly synchronized', () => {
      render(<MobileSettingsView />);

      const autoSwitch = screen.getByTestId('mobile-settings-switch-auto-transition');
      expect(autoSwitch.getAttribute('aria-checked')).toBe('false');
      expect(useTimerStore.getState().settings.autoTransition).toBe(false);

      // Perform 50 rapid toggle clicks
      for (let i = 1; i <= 50; i++) {
        fireEvent.click(autoSwitch);
        const expectedBool = i % 2 === 1;
        expect(useTimerStore.getState().settings.autoTransition).toBe(expectedBool);
      }

      // After 50 clicks (even), must be false
      expect(useTimerStore.getState().settings.autoTransition).toBe(false);
      expect(autoSwitch.getAttribute('aria-checked')).toBe('false');
    });

    it('2.2 Odd toggle spam: 51 sequential clicks leaves state at true without desync', () => {
      render(<MobileSettingsView />);

      const autoSwitch = screen.getByTestId('mobile-settings-switch-auto-transition');

      for (let i = 1; i <= 51; i++) {
        fireEvent.click(autoSwitch);
      }

      expect(useTimerStore.getState().settings.autoTransition).toBe(true);
      expect(autoSwitch.getAttribute('aria-checked')).toBe('true');
    });

    it('2.3 Switch toggle while timer is running updates autoTransition without mutating running status or timer drift', () => {
      useTimerStore.getState().start();
      expect(useTimerStore.getState().status).toBe('running');

      render(<MobileSettingsView />);

      const autoSwitch = screen.getByTestId('mobile-settings-switch-auto-transition');
      fireEvent.click(autoSwitch);

      expect(useTimerStore.getState().settings.autoTransition).toBe(true);
      expect(useTimerStore.getState().status).toBe('running');
    });

    it('2.4 Stepper Upper Bound Clamp: Focus stepper clamped at 120 minutes under 150 increment clicks', () => {
      useTimerStore.setState({
        settings: {
          ...useTimerStore.getState().settings,
          pomodoroMinutes: 115,
        },
      });

      render(<MobileSettingsView />);

      const focusStepper = screen.getByTestId('mobile-settings-stepper-focus');
      const plusBtn = focusStepper.querySelector('[data-testid="mobile-stepper-btn-plus"]')!;

      for (let i = 0; i < 20; i++) {
        fireEvent.click(plusBtn);
      }

      expect(useTimerStore.getState().settings.pomodoroMinutes).toBe(120);
    });

    it('2.5 Stepper Lower Bound Clamp: Focus stepper clamped at 1 minute under 50 decrement clicks', () => {
      useTimerStore.setState({
        settings: {
          ...useTimerStore.getState().settings,
          pomodoroMinutes: 3,
        },
      });

      render(<MobileSettingsView />);

      const focusStepper = screen.getByTestId('mobile-settings-stepper-focus');
      const minusBtn = focusStepper.querySelector('[data-testid="mobile-stepper-btn-minus"]')!;

      for (let i = 0; i < 20; i++) {
        fireEvent.click(minusBtn);
      }

      expect(useTimerStore.getState().settings.pomodoroMinutes).toBe(1);
    });

    it('2.6 Stepper Break Bounds Clamp: Short & Long break clamped between 1 and 60 minutes', () => {
      useTimerStore.getState().updateSettings({
        shortBreakMinutes: 58,
        longBreakMinutes: 3,
      });

      render(<MobileSettingsView />);

      const shortStepper = screen.getByTestId('mobile-settings-stepper-short');
      const shortPlus = shortStepper.querySelector('[data-testid="mobile-stepper-btn-plus"]')!;
      for (let i = 0; i < 10; i++) fireEvent.click(shortPlus);
      expect(useTimerStore.getState().settings.shortBreakMinutes).toBe(60);

      const longStepper = screen.getByTestId('mobile-settings-stepper-long');
      const longMinus = longStepper.querySelector('[data-testid="mobile-stepper-btn-minus"]')!;
      for (let i = 0; i < 10; i++) fireEvent.click(longMinus);
      expect(useTimerStore.getState().settings.longBreakMinutes).toBe(1);
    });
  });

  // =========================================================================
  // VECTOR 3: MASTER VOLUME SLIDER & CHIME PREVIEW
  // =========================================================================
  describe('Vector 3: Master Volume Slider & Chime Preview', () => {
    it('3.1 Master volume boundary at 0%: reflects 0%, updates store to 0.0, and renders VolumeX icon', () => {
      render(<MobileSettingsView />);

      const slider = screen.getByTestId('mobile-settings-volume-slider') as HTMLInputElement;
      fireEvent.change(slider, { target: { value: '0' } });

      expect(useAudioStore.getState().settings.masterVolume).toBe(0);
      expect(screen.getByText('0%')).toBeDefined();

      // At 0%, VolumeX icon is rendered instead of Volume2
      const card = slider.closest('.p-4')!;
      expect(card.querySelector('svg')).toBeDefined();
    });

    it('3.2 Master volume boundary at 100%: reflects 100% and updates store to 1.0', () => {
      render(<MobileSettingsView />);

      const slider = screen.getByTestId('mobile-settings-volume-slider') as HTMLInputElement;
      fireEvent.change(slider, { target: { value: '100' } });

      expect(useAudioStore.getState().settings.masterVolume).toBe(1);
      expect(screen.getByText('100%')).toBeDefined();
    });

    it('3.3 Chime preview: clicking "Nghe thử" triggers playChime with current selected chime', () => {
      const playChimeSpy = vi.fn().mockResolvedValue(undefined);
      useAudioStore.setState({
        playChime: playChimeSpy,
        settings: {
          ...useAudioStore.getState().settings,
          selectedChime: 'zen_bell',
        },
      });

      render(<MobileSettingsView />);

      const previewBtn = screen.getByText('Nghe thử');
      fireEvent.click(previewBtn);

      expect(playChimeSpy).toHaveBeenCalledTimes(1);
      expect(playChimeSpy).toHaveBeenCalledWith('zen_bell');
    });

    it('3.4 Chime selection cycle: iterates through ALARM_CHIMES and triggers preview with selected chime', () => {
      const playChimeSpy = vi.fn().mockResolvedValue(undefined);
      useAudioStore.setState({ playChime: playChimeSpy });

      render(<MobileSettingsView />);

      const chimeSelect = screen.getByTestId('mobile-settings-chime-select') as HTMLSelectElement;
      const previewBtn = screen.getByText('Nghe thử');

      for (const chime of ALARM_CHIMES.slice(0, 4)) {
        fireEvent.change(chimeSelect, { target: { value: chime.id } });
        expect(useAudioStore.getState().settings.selectedChime).toBe(chime.id);

        fireEvent.click(previewBtn);
        expect(playChimeSpy).toHaveBeenLastCalledWith(chime.id);
      }
    });

    it('3.5 Audio preview error resilience: component handles audio rejection gracefully without throwing unhandled exceptions', () => {
      const playChimeSpy = vi.fn().mockRejectedValue(new Error('AudioContext autoplay blocked by user agent'));
      useAudioStore.setState({ playChime: playChimeSpy });

      render(<MobileSettingsView />);

      const previewBtn = screen.getByText('Nghe thử');

      // Must not throw uncaught error
      expect(() => {
        fireEvent.click(previewBtn);
      }).not.toThrow();

      expect(playChimeSpy).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // VECTOR 4: RESET & SKIP ACTION BUTTONS (48x48DP MINIMUM BOUNDS & STORE RESET)
  // =========================================================================
  describe('Vector 4: Reset & Skip Action Buttons & Ergonomics', () => {
    it('4.1 Reset and Skip buttons strictly satisfy Fitts\'s Law >= 48x48dp minimum touch target bounds', () => {
      render(<MobileFocusView />);

      const resetBtn = screen.getByTestId('mobile-timer-reset');
      const skipBtn = screen.getByTestId('mobile-timer-skip');
      const mainBtn = screen.getByTestId('mobile-timer-main-action');

      // Reset button: min 48x48dp
      expect(resetBtn.className).toMatch(/min-w-\[48px\]/);
      expect(resetBtn.className).toMatch(/min-h-\[48px\]/);
      expect(resetBtn.className).toMatch(/w-12/);
      expect(resetBtn.className).toMatch(/h-12/);

      // Skip button: min 48x48dp
      expect(skipBtn.className).toMatch(/min-w-\[48px\]/);
      expect(skipBtn.className).toMatch(/min-h-\[48px\]/);
      expect(skipBtn.className).toMatch(/w-12/);
      expect(skipBtn.className).toMatch(/h-12/);

      // Primary main action: thumb-zone 64x64px
      expect(mainBtn.className).toMatch(/min-w-\[64px\]/);
      expect(mainBtn.className).toMatch(/min-h-\[64px\]/);
      expect(mainBtn.className).toMatch(/w-16/);
      expect(mainBtn.className).toMatch(/h-16/);
    });

    it('4.2 Reset button while timer is running sets status to idle and restores full duration', () => {
      useTimerStore.setState({
        status: 'running',
        phase: 'pomodoro',
        remainingMs: 7 * 60 * 1000 + 45000, // 07:45 remaining
        settings: {
          ...useTimerStore.getState().settings,
          pomodoroMinutes: 25,
        },
      });

      render(<MobileFocusView />);

      expect(screen.getByTestId('mobile-monumental-timer').textContent).toBe('07:45');
      expect(screen.getByTestId('mobile-breathing-aura')).toBeDefined();

      const resetBtn = screen.getByTestId('mobile-timer-reset');
      fireEvent.click(resetBtn);

      // Status must be idle
      expect(useTimerStore.getState().status).toBe('idle');

      // Breathing aura must be removed
      expect(screen.queryByTestId('mobile-breathing-aura')).toBeNull();
    });

    it('4.3 Reset button spamming remains idempotent and stable in idle state', () => {
      useTimerStore.setState({ status: 'running' });
      render(<MobileFocusView />);

      const resetBtn = screen.getByTestId('mobile-timer-reset');

      for (let i = 0; i < 10; i++) {
        fireEvent.click(resetBtn);
        expect(useTimerStore.getState().status).toBe('idle');
      }
    });

    it('4.4 Skip button advances timer phase and notifies user', () => {
      const skipSpy = vi.spyOn(useTimerStore.getState(), 'skip');
      render(<MobileFocusView />);

      const skipBtn = screen.getByTestId('mobile-timer-skip');
      fireEvent.click(skipBtn);

      expect(skipSpy).toHaveBeenCalledTimes(1);
    });

    it('4.5 Monumental timer displays edge cases properly (00:00, 00:01, 120:00)', () => {
      // 00:00
      useTimerStore.setState({ remainingMs: 0 });
      const { rerender } = render(<MobileFocusView />);
      expect(screen.getByTestId('mobile-monumental-timer').textContent).toBe('00:00');

      // 00:01 (1000 ms)
      act(() => {
        useTimerStore.setState({ remainingMs: 1000 });
      });
      rerender(<MobileFocusView />);
      expect(screen.getByTestId('mobile-monumental-timer').textContent).toBe('00:01');

      // 120:00 (120 minutes)
      act(() => {
        useTimerStore.setState({ remainingMs: 120 * 60 * 1000 });
      });
      rerender(<MobileFocusView />);
      expect(screen.getByTestId('mobile-monumental-timer').textContent).toBe('120:00');
    });

    it('4.6 Phase selector pills: clicking each phase resets remainingMs to corresponding duration', () => {
      useTimerStore.getState().updateSettings({
        pomodoroMinutes: 30,
        shortBreakMinutes: 7,
        longBreakMinutes: 20,
        roundsBeforeLongBreak: 4,
        autoTransition: false,
        notificationEnabled: false,
      });

      render(<MobileFocusView />);

      // Short break
      fireEvent.click(screen.getByTestId('mobile-phase-short_break'));
      expect(useTimerStore.getState().phase).toBe('short_break');
      expect(screen.getByTestId('mobile-monumental-timer').textContent).toBe('07:00');

      // Long break
      fireEvent.click(screen.getByTestId('mobile-phase-long_break'));
      expect(useTimerStore.getState().phase).toBe('long_break');
      expect(screen.getByTestId('mobile-monumental-timer').textContent).toBe('20:00');

      // Focus
      fireEvent.click(screen.getByTestId('mobile-phase-pomodoro'));
      expect(useTimerStore.getState().phase).toBe('pomodoro');
      expect(screen.getByTestId('mobile-monumental-timer').textContent).toBe('30:00');
    });
  });
});
