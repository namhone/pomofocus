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
import { db } from '../../src/db';

describe('v7.0 Native Android Liquid Zen Architecture — Milestone 2 Mobile Views Suite', () => {
  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    try {
      await db.tasks.clear();
      await db.notes.clear();
      await db.focus_sessions.clear();
    } catch {}

    // Reset useTimerStore to predictable defaults
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

    // Reset useAuthStore
    useAuthStore.setState({
      user: {
        id: 'test_user_free',
        email: 'student@university.edu.vn',
        displayName: 'Nguyễn Văn A',
        plan: 'free',
        createdAt: Date.now(),
      },
      isAuthenticated: true,
      isLoggedIn: true,
      hasVipAccess: false,
      role: 'student',
      planLabel: 'FREE',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. MobileFocusView Comprehensive Tests
  // =========================================================================
  describe('1. MobileFocusView (v7.0 Liquid Zen Focus Canvas)', () => {
    it('1.1 Renders monumental timer numerals formatted as MM:SS with tabular-nums and drop-shadow', () => {
      useTimerStore.setState({ remainingMs: 25 * 60 * 1000 });
      render(<MobileFocusView />);

      const timerText = screen.getByTestId('mobile-monumental-timer');
      expect(timerText).toBeDefined();
      expect(timerText.textContent).toBe('25:00');
      expect(timerText.className).toContain('tabular-nums');
      expect(timerText.className).toContain('font-bold');
      expect(timerText.className).toContain('drop-shadow');
    });

    it('1.2 Zero-Modal Clean Entry: Opens directly into canvas with 0 backdrops, 0 modals, and 0 widget bars', () => {
      render(<MobileFocusView />);

      expect(screen.queryByTestId('widget-container')).toBeNull();
      expect(screen.queryByTestId('modal-backdrop')).toBeNull();
      expect(screen.queryByTestId('widget-minimize-btn')).toBeNull();
      expect(screen.queryByTestId('widget-close-btn')).toBeNull();
    });

    it('1.3 Breathing Aura: Smooth radial breathing aura is visible during status === "running" with GPU layer promotion', () => {
      useTimerStore.setState({ status: 'running' });
      render(<MobileFocusView />);

      const aura = screen.getByTestId('mobile-breathing-aura');
      expect(aura).toBeDefined();
      expect(aura.className).toContain('animate-pulse');
      expect(aura.className).toContain('blur-3xl');
      // GPU layer promotion
      expect(aura.style.transform).toBe('translateZ(0)');
    });

    it('1.4 Breathing Aura: Aura is NOT rendered when timer is idle or paused', () => {
      useTimerStore.setState({ status: 'idle' });
      const { rerender } = render(<MobileFocusView />);
      expect(screen.queryByTestId('mobile-breathing-aura')).toBeNull();

      act(() => {
        useTimerStore.setState({ status: 'paused' });
      });
      rerender(<MobileFocusView />);
      expect(screen.queryByTestId('mobile-breathing-aura')).toBeNull();
    });

    it('1.5 Phase Selector: Sliding segmented pill selector renders 3 tabs (pomodoro, short_break, long_break)', () => {
      render(<MobileFocusView />);

      const pomodoroTab = screen.getByTestId('mobile-phase-pomodoro');
      const shortTab = screen.getByTestId('mobile-phase-short_break');
      const longTab = screen.getByTestId('mobile-phase-long_break');

      expect(pomodoroTab).toBeDefined();
      expect(shortTab).toBeDefined();
      expect(longTab).toBeDefined();

      // Pomodoro is initially selected with emerald active highlight
      expect(pomodoroTab.className).toContain('text-emerald-400');
    });

    it('1.6 Phase Selector: Switching phase updates timer phase and remaining duration in useTimerStore', () => {
      render(<MobileFocusView />);

      const shortBreakBtn = screen.getByTestId('mobile-phase-short_break');
      fireEvent.click(shortBreakBtn);

      expect(useTimerStore.getState().phase).toBe('short_break');
      expect(useTimerStore.getState().remainingMs).toBe(5 * 60 * 1000);
      expect(screen.getByTestId('mobile-monumental-timer').textContent).toBe('05:00');

      const longBreakBtn = screen.getByTestId('mobile-phase-long_break');
      fireEvent.click(longBreakBtn);

      expect(useTimerStore.getState().phase).toBe('long_break');
      expect(useTimerStore.getState().remainingMs).toBe(15 * 60 * 1000);
      expect(screen.getByTestId('mobile-monumental-timer').textContent).toBe('15:00');
    });

    it('1.7 Thumb-Zone Primary Action: Main action button is 64x64px touch target and toggles timer between running and paused', () => {
      render(<MobileFocusView />);

      const mainBtn = screen.getByTestId('mobile-timer-main-action');
      expect(mainBtn).toBeDefined();
      expect(mainBtn.className).toContain('w-16');
      expect(mainBtn.className).toContain('h-16');
      expect(mainBtn.className).toContain('rounded-full');

      // Click to start
      fireEvent.click(mainBtn);
      expect(useTimerStore.getState().status).toBe('running');

      // Click to pause
      fireEvent.click(mainBtn);
      expect(useTimerStore.getState().status).toBe('paused');
    });

    it('1.8 Thumb-Zone Secondary Actions: Reset and Skip buttons meet minimum 48x48dp touch targets', () => {
      render(<MobileFocusView />);

      const resetBtn = screen.getByTestId('mobile-timer-reset');
      const skipBtn = screen.getByTestId('mobile-timer-skip');

      expect(resetBtn.className).toContain('w-12');
      expect(resetBtn.className).toContain('h-12');
      expect(resetBtn.className).toContain('min-w-[48px]');
      expect(resetBtn.className).toContain('min-h-[48px]');

      expect(skipBtn.className).toContain('w-12');
      expect(skipBtn.className).toContain('h-12');
      expect(skipBtn.className).toContain('min-w-[48px]');
      expect(skipBtn.className).toContain('min-h-[48px]');
    });

    it('1.9 Secondary Actions: Reset button resets timer state to idle', () => {
      useTimerStore.setState({ status: 'running' });
      render(<MobileFocusView />);

      const resetBtn = screen.getByTestId('mobile-timer-reset');
      fireEvent.click(resetBtn);

      expect(useTimerStore.getState().status).toBe('idle');
    });

    it('1.10 Secondary Actions: Skip button triggers skip in timer store', () => {
      const skipSpy = vi.spyOn(useTimerStore.getState(), 'skip');
      render(<MobileFocusView />);

      const skipBtn = screen.getByTestId('mobile-timer-skip');
      fireEvent.click(skipBtn);

      expect(skipSpy).toHaveBeenCalled();
    });

    it('1.11 Progress Indicators: Renders 4px thin session progress bar reflecting elapsed percentage', () => {
      // 25 min total, 10 min remaining -> 15 min elapsed (60% progress)
      useTimerStore.setState({
        remainingMs: 10 * 60 * 1000,
        settings: {
          ...useTimerStore.getState().settings,
          pomodoroMinutes: 25,
        },
      });
      render(<MobileFocusView />);

      const progressBar = screen.getByTestId('mobile-session-progress-bar');
      expect(progressBar).toBeDefined();
      expect(progressBar.className).toContain('h-1');

      const innerBar = progressBar.firstElementChild as HTMLElement;
      expect(innerBar).toBeDefined();
      expect(innerBar.style.width).toBe('60%');
    });

    it('1.12 Cycle Indicators: Renders round dots corresponding to roundsBeforeLongBreak', () => {
      useTimerStore.setState({
        currentRound: 2,
        settings: {
          ...useTimerStore.getState().settings,
          roundsBeforeLongBreak: 4,
        },
      });
      render(<MobileFocusView />);

      const cycleContainer = screen.getByTestId('mobile-cycle-dots');
      expect(cycleContainer).toBeDefined();
      expect(cycleContainer.children.length).toBe(4);
    });

    it('1.13 Linked Task Chip: Displays linked task title when linked, or placeholder when none linked', () => {
      const { rerender } = render(<MobileFocusView />);

      const chip = screen.getByTestId('mobile-linked-task-chip');
      expect(chip.textContent).toContain('Chưa chọn nhiệm vụ');

      // Link a task
      act(() => {
        useTimerStore.setState({ linkedTaskTitle: 'Hoàn thành báo cáo Đồ án tốt nghiệp' });
      });
      rerender(<MobileFocusView />);

      expect(chip.textContent).toContain('Hoàn thành báo cáo Đồ án tốt nghiệp');
    });
  });

  // =========================================================================
  // 2. MobileSettingsView Comprehensive Tests
  // =========================================================================
  describe('2. MobileSettingsView (v7.0 Liquid Zen Settings & Ergonomics)', () => {
    it('2.1 Renders native mobile scrollable container with 0 desktop widget bars', () => {
      render(<MobileSettingsView />);

      const view = screen.getByTestId('mobile-settings-view');
      expect(view).toBeDefined();
      expect(view.className).toContain('overflow-y-auto');
      expect(view.className).toContain('pb-28');

      // Zero-modal & zero window bars
      expect(screen.queryByTestId('widget-container')).toBeNull();
      expect(screen.queryByTestId('widget-minimize-btn')).toBeNull();
      expect(screen.queryByTestId('widget-close-btn')).toBeNull();
    });

    it('2.2 Renders 3 separate 56px steppers for Focus, Short break, and Long break', () => {
      render(<MobileSettingsView />);

      const focusStepper = screen.getByTestId('mobile-settings-stepper-focus');
      const shortStepper = screen.getByTestId('mobile-settings-stepper-short');
      const longStepper = screen.getByTestId('mobile-settings-stepper-long');

      expect(focusStepper).toBeDefined();
      expect(shortStepper).toBeDefined();
      expect(longStepper).toBeDefined();

      // Check 56px height on all rows
      expect(focusStepper.className).toContain('h-14');
      expect(shortStepper.className).toContain('h-14');
      expect(longStepper.className).toContain('h-14');
    });

    it('2.3 Steppers: Incrementing and decrementing focus stepper updates timer settings in useTimerStore', () => {
      render(<MobileSettingsView />);

      const focusStepper = screen.getByTestId('mobile-settings-stepper-focus');
      const plusBtn = focusStepper.querySelector('[data-testid="mobile-stepper-btn-plus"]');
      const minusBtn = focusStepper.querySelector('[data-testid="mobile-stepper-btn-minus"]');

      expect(plusBtn).toBeDefined();
      expect(minusBtn).toBeDefined();

      // Initial is 25
      expect(useTimerStore.getState().settings.pomodoroMinutes).toBe(25);

      // Increment: 25 -> 26
      if (plusBtn) fireEvent.click(plusBtn);
      expect(useTimerStore.getState().settings.pomodoroMinutes).toBe(26);

      // Decrement: 26 -> 25
      if (minusBtn) fireEvent.click(minusBtn);
      expect(useTimerStore.getState().settings.pomodoroMinutes).toBe(25);
    });

    it('2.4 Steppers: Short and Long break steppers adjust durations within valid bounds', () => {
      render(<MobileSettingsView />);

      const shortStepper = screen.getByTestId('mobile-settings-stepper-short');
      const shortPlus = shortStepper.querySelector('[data-testid="mobile-stepper-btn-plus"]');
      if (shortPlus) fireEvent.click(shortPlus);
      expect(useTimerStore.getState().settings.shortBreakMinutes).toBe(6);

      const longStepper = screen.getByTestId('mobile-settings-stepper-long');
      const longPlus = longStepper.querySelector('[data-testid="mobile-stepper-btn-plus"]');
      if (longPlus) fireEvent.click(longPlus);
      expect(useTimerStore.getState().settings.longBreakMinutes).toBe(16);
    });

    it('2.5 Automation: Toggling MobileLiquidSwitch for auto-transition updates useTimerStore', () => {
      render(<MobileSettingsView />);

      const autoSwitch = screen.getByTestId('mobile-settings-switch-auto-transition');
      expect(autoSwitch).toBeDefined();
      expect(useTimerStore.getState().settings.autoTransition).toBe(false);

      // Toggle ON
      fireEvent.click(autoSwitch);
      expect(useTimerStore.getState().settings.autoTransition).toBe(true);

      // Toggle OFF
      fireEvent.click(autoSwitch);
      expect(useTimerStore.getState().settings.autoTransition).toBe(false);
    });

    it('2.6 Sound & Volume: Adjusting master volume slider updates useAudioStore', () => {
      render(<MobileSettingsView />);

      const volumeSlider = screen.getByTestId('mobile-settings-volume-slider') as HTMLInputElement;
      expect(volumeSlider).toBeDefined();

      fireEvent.change(volumeSlider, { target: { value: '45' } });
      expect(useAudioStore.getState().settings.masterVolume).toBe(0.45);
    });

    it('2.7 Sound & Volume: Selecting a sound chime updates selected chime in useAudioStore', () => {
      render(<MobileSettingsView />);

      const chimeSelect = screen.getByTestId('mobile-settings-chime-select') as HTMLSelectElement;
      expect(chimeSelect).toBeDefined();

      fireEvent.change(chimeSelect, { target: { value: 'crystal_chime' } });
      expect(useAudioStore.getState().settings.selectedChime).toBe('crystal_chime');
    });

    it('2.8 Eco Mode: Toggling Eco Mode switch updates useLayoutStore', () => {
      render(<MobileSettingsView />);

      const ecoSwitch = screen.getByTestId('mobile-settings-switch-eco');
      expect(ecoSwitch).toBeDefined();
      expect(useLayoutStore.getState().isEcoMode).toBe(false);

      fireEvent.click(ecoSwitch);
      expect(useLayoutStore.getState().isEcoMode).toBe(true);
    });

    it('2.9 User Status Card: Displays role badge and credits balance', () => {
      useAiStore.setState({ aiCreditsBalance: 120 });
      useAuthStore.setState({
        user: {
          id: 'u1',
          email: 'student@example.com',
          displayName: 'Lê Hoàng',
          plan: 'free',
          createdAt: Date.now(),
        },
        hasVipAccess: false,
        role: 'student',
      });

      render(<MobileSettingsView />);

      const card = screen.getByTestId('mobile-user-status-card');
      expect(card).toBeDefined();
      expect(card.textContent).toContain('Lê Hoàng');
      expect(card.textContent).toContain('Miễn phí');

      const creditsBadge = screen.getByTestId('mobile-user-credits-badge');
      expect(creditsBadge.textContent).toContain('120');
    });

    it('2.10 User Status Card: Topup button calls openTopupModal in useAiStore', () => {
      const topupSpy = vi.spyOn(useAiStore.getState(), 'openTopupModal');
      render(<MobileSettingsView />);

      const topupBtn = screen.getByText('Nạp thêm');
      fireEvent.click(topupBtn);

      expect(topupSpy).toHaveBeenCalled();
    });

    it('2.11 Whitelist & VIP Verification: Zero upgrade banners shown for Founder VIP user', () => {
      useAuthStore.setState({
        user: {
          id: 'founder_1',
          email: 'namho03052k9@gmail.com', // In OWNER_EMAILS
          displayName: 'Nam Hồ Founder',
          plan: 'lifetime',
          role: 'founder',
          createdAt: Date.now(),
        },
        hasVipAccess: true,
        role: 'founder',
        planLabel: 'PRO TRỌN ĐỜI',
      });

      render(<MobileSettingsView />);

      const card = screen.getByTestId('mobile-user-status-card');
      expect(card.textContent).toContain('Founder VIP');
      // No upgrade button or upgrade text
      expect(card.textContent).not.toContain('Nâng cấp để mở khóa');
    });

    it('2.12 Reset Layout: "Khôi phục mặc định" button triggers resetLayout in useLayoutStore', () => {
      const resetSpy = vi.spyOn(useLayoutStore.getState(), 'resetLayout');
      render(<MobileSettingsView />);

      const resetBtn = screen.getByTestId('mobile-settings-reset-layout-btn');
      fireEvent.click(resetBtn);

      expect(resetSpy).toHaveBeenCalled();
    });
  });
});
