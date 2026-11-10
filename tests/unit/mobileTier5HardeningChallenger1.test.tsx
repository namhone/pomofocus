import 'fake-indexeddb/auto';
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';

// Components under test
import { MobileStepperRow } from '../../src/components/mobile/primitives/MobileStepperRow';
import { MobileLiquidSwitch } from '../../src/components/mobile/primitives/MobileLiquidSwitch';
import { MobileFocusView } from '../../src/components/mobile/views/MobileFocusView';
import { MobileSettingsView } from '../../src/components/mobile/views/MobileSettingsView';
import { MobileAppShell } from '../../src/components/mobile/MobileAppShell';

// Stores & Database
import { useTimerStore } from '../../src/stores/useTimerStore';
import { useLayoutStore } from '../../src/stores/useLayoutStore';
import { useAiStore } from '../../src/stores/useAiStore';
import { useTaskStore } from '../../src/stores/useTaskStore';
import { useAudioStore } from '../../src/stores/useAudioStore';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useBackgroundStore } from '../../src/stores/useBackgroundStore';
import { db } from '../../src/db';
import { TimerPhase } from '../../src/types/timer';

describe('TIER 5 ADVERSARIAL COVERAGE HARDENING (Challenger 1: Focus, Views & Shell APIs)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();

    try {
      await db.tasks.clear();
      await db.notes.clear();
      await db.focus_sessions.clear();
    } catch {}

    // Mock HTMLMediaElement pause and play
    window.HTMLMediaElement.prototype.pause = vi.fn();
    window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);

    // Mock global.fetch for AI companion
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({ reply: 'AI test reply' }),
      text: async () => 'AI test reply',
    } as any);

    // Mock matchMedia
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

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
      activeMobileTab: 'focus' as any,
      isMobile: true,
      isZenMode: false,
      isEcoMode: false,
    });

    // Reset useAiStore
    useAiStore.setState({
      aiCreditsBalance: 100,
      isTopupModalOpen: false,
      messages: [],
      isLoading: false,
    });

    // Reset useTaskStore
    useTaskStore.setState({
      tasks: [],
      activeTaskId: null,
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

    // Reset useAuthStore
    useAuthStore.setState({
      user: {
        id: 'test_student',
        email: 'student@domain.vn',
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

    // Reset useBackgroundStore
    useBackgroundStore.setState({
      presets: [
        { id: 'zen-garden', title: 'Zen Garden', category: 'nature', type: 'gradient', value: '#09090b' },
        { id: 'rainy-kyoto', title: 'Rainy Kyoto', category: 'city', type: 'gradient', value: '#0a0a0f' },
      ],
      activePresetId: 'zen-garden',
      ambientEffect: 'none',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // VECTOR 1: MobileStepperRow Adversarial Bounds, Keyboard & Fallbacks
  // =========================================================================
  describe('Vector 1: MobileStepperRow Adversarial Bounds, Keyboard & Fallbacks', () => {
    it('1.1 Initial value below min rejects decrement and stays clamped', () => {
      const handleChange = vi.fn();
      render(
        <MobileStepperRow
          label="Test Stepper"
          value={-10}
          min={1}
          max={120}
          onChange={handleChange}
        />
      );

      const minusBtn = screen.getByTestId('mobile-stepper-btn-minus');
      expect((minusBtn as HTMLButtonElement).disabled).toBe(true);

      fireEvent.click(minusBtn);
      expect(handleChange).not.toHaveBeenCalled();
    });

    it('1.2 Initial value above max rejects increment and stays clamped', () => {
      const handleChange = vi.fn();
      render(
        <MobileStepperRow
          label="Test Stepper"
          value={999}
          min={1}
          max={120}
          onChange={handleChange}
        />
      );

      const plusBtn = screen.getByTestId('mobile-stepper-btn-plus');
      expect((plusBtn as HTMLButtonElement).disabled).toBe(true);

      fireEvent.click(plusBtn);
      expect(handleChange).not.toHaveBeenCalled();
    });

    it('1.3 Keyboard ArrowDown when value equals min does not invoke onChange', () => {
      const handleChange = vi.fn();
      render(
        <MobileStepperRow
          label="Boundary Stepper"
          value={1}
          min={1}
          max={120}
          onChange={handleChange}
        />
      );

      const stepper = screen.getByRole('spinbutton');
      fireEvent.keyDown(stepper, { key: 'ArrowDown' });
      expect(handleChange).not.toHaveBeenCalled();

      // Legacy 'Down' key name
      fireEvent.keyDown(stepper, { key: 'Down' });
      expect(handleChange).not.toHaveBeenCalled();
    });

    it('1.4 Keyboard ArrowUp when value equals max does not invoke onChange', () => {
      const handleChange = vi.fn();
      render(
        <MobileStepperRow
          label="Boundary Stepper"
          value={120}
          min={1}
          max={120}
          onChange={handleChange}
        />
      );

      const stepper = screen.getByRole('spinbutton');
      fireEvent.keyDown(stepper, { key: 'ArrowUp' });
      expect(handleChange).not.toHaveBeenCalled();

      // Legacy 'Up' key name
      fireEvent.keyDown(stepper, { key: 'Up' });
      expect(handleChange).not.toHaveBeenCalled();
    });

    it('1.5 Keyboard Home jumps to min and End jumps to max', () => {
      const handleChange = vi.fn();
      render(
        <MobileStepperRow
          label="Jump Stepper"
          value={50}
          min={5}
          max={90}
          onChange={handleChange}
        />
      );

      const stepper = screen.getByRole('spinbutton');
      fireEvent.keyDown(stepper, { key: 'Home' });
      expect(handleChange).toHaveBeenCalledWith(5);

      fireEvent.keyDown(stepper, { key: 'End' });
      expect(handleChange).toHaveBeenCalledWith(90);
    });

    it('1.6 Irrelevant keyboard keys do not alter value or throw errors', () => {
      const handleChange = vi.fn();
      render(
        <MobileStepperRow
          label="Key Filter Stepper"
          value={25}
          min={1}
          max={60}
          onChange={handleChange}
        />
      );

      const stepper = screen.getByRole('spinbutton');
      fireEvent.keyDown(stepper, { key: 'Enter' });
      fireEvent.keyDown(stepper, { key: 'Escape' });
      fireEvent.keyDown(stepper, { key: 'Tab' });
      fireEvent.keyDown(stepper, { key: 'a' });
      expect(handleChange).not.toHaveBeenCalled();
    });

    it('1.7 Disabled stepper suppresses all keyboard navigation events', () => {
      const handleChange = vi.fn();
      render(
        <MobileStepperRow
          label="Disabled Stepper"
          value={25}
          min={1}
          max={60}
          disabled={true}
          onChange={handleChange}
        />
      );

      const stepper = screen.getByRole('spinbutton');
      expect(stepper.getAttribute('tabIndex')).toBe('-1');
      expect(stepper.getAttribute('aria-disabled')).toBe('true');

      fireEvent.keyDown(stepper, { key: 'ArrowUp' });
      fireEvent.keyDown(stepper, { key: 'ArrowDown' });
      fireEvent.keyDown(stepper, { key: 'Home' });
      fireEvent.keyDown(stepper, { key: 'End' });
      expect(handleChange).not.toHaveBeenCalled();
    });

    it('1.8 Fallback testId logic: id prop produces mobile-stepper-${id}, omitting both defaults to mobile-stepper-row', () => {
      const { rerender } = render(
        <MobileStepperRow
          label="ID Test"
          id="custom-focus"
          value={25}
          onChange={() => {}}
        />
      );
      expect(screen.getByTestId('mobile-stepper-custom-focus')).toBeDefined();

      rerender(
        <MobileStepperRow
          label="Default Test"
          value={25}
          onChange={() => {}}
        />
      );
      expect(screen.getByTestId('mobile-stepper-row')).toBeDefined();
    });

    it('1.9 Optional unit and icon rendering branches', () => {
      // Without icon and without unit
      const { container, rerender } = render(
        <MobileStepperRow
          label="Plain Stepper"
          value={30}
          onChange={() => {}}
        />
      );
      expect(screen.queryByText('phút')).toBeNull();

      // With unit and custom icon
      rerender(
        <MobileStepperRow
          label="Plain Stepper"
          value={30}
          unit="phút"
          icon={<span data-testid="custom-icon">🔥</span>}
          onChange={() => {}}
        />
      );
      expect(screen.getByText('phút')).toBeDefined();
      expect(screen.getByTestId('custom-icon')).toBeDefined();
    });
  });

  // =========================================================================
  // VECTOR 2: MobileLiquidSwitch Adversarial Toggling & Accessibility
  // =========================================================================
  describe('Vector 2: MobileLiquidSwitch Adversarial Toggling & Accessibility', () => {
    it('2.1 Label fallback hierarchy: ariaLabel > label > Chuyển đổi', () => {
      const { rerender } = render(
        <MobileLiquidSwitch
          checked={false}
          ariaLabel="Ưu tiên cao nhất"
          label="Nhãn phụ"
          onChange={() => {}}
        />
      );
      expect(screen.getByRole('switch').getAttribute('aria-label')).toBe('Ưu tiên cao nhất');

      rerender(
        <MobileLiquidSwitch
          checked={false}
          label="Chỉ có nhãn phụ"
          onChange={() => {}}
        />
      );
      expect(screen.getByRole('switch').getAttribute('aria-label')).toBe('Chỉ có nhãn phụ');

      rerender(
        <MobileLiquidSwitch
          checked={false}
          onChange={() => {}}
        />
      );
      expect(screen.getByRole('switch').getAttribute('aria-label')).toBe('Chuyển đổi');
    });

    it('2.2 Keyboard interaction toggles on Space, Enter, and legacy Spacebar', () => {
      const handleChange = vi.fn();
      render(
        <MobileLiquidSwitch
          checked={false}
          onChange={handleChange}
        />
      );

      const switchBtn = screen.getByRole('switch');

      fireEvent.keyDown(switchBtn, { key: ' ' });
      expect(handleChange).toHaveBeenCalledWith(true);

      handleChange.mockClear();
      fireEvent.keyDown(switchBtn, { key: 'Enter' });
      expect(handleChange).toHaveBeenCalledWith(true);

      handleChange.mockClear();
      fireEvent.keyDown(switchBtn, { key: 'Spacebar' });
      expect(handleChange).toHaveBeenCalledWith(true);
    });

    it('2.3 Ignores irrelevant keys without toggling', () => {
      const handleChange = vi.fn();
      render(
        <MobileLiquidSwitch
          checked={false}
          onChange={handleChange}
        />
      );

      const switchBtn = screen.getByRole('switch');
      fireEvent.keyDown(switchBtn, { key: 'Tab' });
      fireEvent.keyDown(switchBtn, { key: 'ArrowRight' });
      fireEvent.keyDown(switchBtn, { key: 'Escape' });
      expect(handleChange).not.toHaveBeenCalled();
    });

    it('2.4 Disabled switch rejects both click and keyboard triggers', () => {
      const handleChange = vi.fn();
      render(
        <MobileLiquidSwitch
          checked={true}
          disabled={true}
          onChange={handleChange}
        />
      );

      const switchBtn = screen.getByRole('switch');
      expect((switchBtn as HTMLButtonElement).disabled).toBe(true);
      expect(switchBtn.getAttribute('aria-disabled')).toBe('true');
      expect(switchBtn.getAttribute('tabIndex')).toBe('-1');

      fireEvent.click(switchBtn);
      fireEvent.keyDown(switchBtn, { key: ' ' });
      fireEvent.keyDown(switchBtn, { key: 'Enter' });
      expect(handleChange).not.toHaveBeenCalled();
    });

    it('2.5 Rapid toggle stress (50 alternating clicks) produces consistent toggled values', () => {
      let state = false;
      const handleChange = vi.fn((val: boolean) => {
        state = val;
      });

      const { rerender } = render(
        <MobileLiquidSwitch
          checked={state}
          onChange={handleChange}
        />
      );

      const switchBtn = screen.getByRole('switch');
      for (let i = 0; i < 50; i++) {
        fireEvent.click(switchBtn);
        rerender(<MobileLiquidSwitch checked={state} onChange={handleChange} />);
      }

      expect(handleChange).toHaveBeenCalledTimes(50);
      expect(state).toBe(false); // Even number of toggles returns to initial false
    });
  });

  // =========================================================================
  // VECTOR 3: MobileFocusView Monumental Boundaries & Task Picker Machine
  // =========================================================================
  describe('Vector 3: MobileFocusView Monumental Boundaries & Task Picker Machine', () => {
    it('3.1 Negative or zero remainingMs safely renders 00:00 without negative text or NaN', () => {
      useTimerStore.setState({ remainingMs: -1500 });
      render(<MobileFocusView />);

      const timerDisplay = screen.getByTestId('mobile-monumental-timer');
      expect(timerDisplay.textContent).toBe('00:00');

      act(() => {
        useTimerStore.setState({ remainingMs: 0 });
      });
      expect(timerDisplay.textContent).toBe('00:00');
    });

    it('3.2 Sub-second duration (500ms) rounds up to 00:01 via Math.ceil', () => {
      useTimerStore.setState({ remainingMs: 500 });
      render(<MobileFocusView />);

      const timerDisplay = screen.getByTestId('mobile-monumental-timer');
      expect(timerDisplay.textContent).toBe('00:01');
    });

    it('3.3 Upper boundary duration (120 minutes = 7,200,000ms) displays monumental 120:00', () => {
      useTimerStore.setState({ remainingMs: 120 * 60 * 1000 });
      render(<MobileFocusView />);

      const timerDisplay = screen.getByTestId('mobile-monumental-timer');
      expect(timerDisplay.textContent).toBe('120:00');
    });

    it('3.4 Progress bar clamping under anomalous remainingMs (remaining > total or remaining < 0)', () => {
      // remainingMs > totalDurationMs (elapsed is negative) -> clamped to 0%
      useTimerStore.setState({
        remainingMs: 30 * 60 * 1000,
        settings: {
          ...useTimerStore.getState().settings,
          pomodoroMinutes: 25,
        },
      });

      render(<MobileFocusView />);
      const progressBar = screen.getByTestId('mobile-session-progress-bar');
      expect(progressBar.getAttribute('aria-valuenow')).toBe('0');

      // remainingMs < 0 -> clamped to 100%
      act(() => {
        useTimerStore.setState({ remainingMs: -5000 });
      });
      expect(progressBar.getAttribute('aria-valuenow')).toBe('100');
    });

    it('3.5 Cycle rounds fallback: roundsBeforeLongBreak 0 or negative safely defaults to 4 dots', () => {
      useTimerStore.setState({
        settings: {
          ...useTimerStore.getState().settings,
          roundsBeforeLongBreak: 0,
        },
      });

      render(<MobileFocusView />);
      const dotsContainer = screen.getByTestId('mobile-cycle-dots');
      // Should default to 4 rounds (Array length 4)
      expect(dotsContainer.children.length).toBe(4);
    });

    it('3.6 Rapid play/pause/resume/reset state machine cycling', () => {
      render(<MobileFocusView />);
      const mainBtn = screen.getByTestId('mobile-timer-main-action');
      const resetBtn = screen.getByTestId('mobile-timer-reset');

      // 1. Idle -> Click -> Running
      expect(useTimerStore.getState().status).toBe('idle');
      fireEvent.click(mainBtn);
      expect(useTimerStore.getState().status).toBe('running');

      // 2. Running -> Click -> Paused
      fireEvent.click(mainBtn);
      expect(useTimerStore.getState().status).toBe('paused');

      // 3. Paused -> Click -> Running
      fireEvent.click(mainBtn);
      expect(useTimerStore.getState().status).toBe('running');

      // 4. Running -> Reset -> Idle
      fireEvent.click(resetBtn);
      expect(useTimerStore.getState().status).toBe('idle');
    });

    it('3.7 Rapid phase switching between pomodoro, short_break, long_break synchronizes remainingMs', () => {
      render(<MobileFocusView />);
      const pomodoroBtn = screen.getByTestId('mobile-phase-pomodoro');
      const shortBreakBtn = screen.getByTestId('mobile-phase-short_break');
      const longBreakBtn = screen.getByTestId('mobile-phase-long_break');

      // Switch to short break
      fireEvent.click(shortBreakBtn);
      expect(useTimerStore.getState().phase).toBe('short_break');
      expect(useTimerStore.getState().remainingMs).toBe(5 * 60 * 1000);

      // Switch to long break
      fireEvent.click(longBreakBtn);
      expect(useTimerStore.getState().phase).toBe('long_break');
      expect(useTimerStore.getState().remainingMs).toBe(15 * 60 * 1000);

      // Switch back to pomodoro
      fireEvent.click(pomodoroBtn);
      expect(useTimerStore.getState().phase).toBe('pomodoro');
      expect(useTimerStore.getState().remainingMs).toBe(25 * 60 * 1000);
    });

    it('3.8 Task picker inline dropdown: empty state, task selection, and unlinking', async () => {
      // 1. Initial empty tasks list
      useTaskStore.setState({ tasks: [], activeTaskId: null });
      render(<MobileFocusView />);

      const chip = screen.getByTestId('mobile-linked-task-chip');
      expect(chip.textContent).toContain('Chưa chọn nhiệm vụ');

      // Open task picker dropdown
      fireEvent.click(chip);
      expect(screen.getByTestId('mobile-task-picker-dropdown')).toBeDefined();
      expect(screen.getByText(/Chưa có nhiệm vụ đang chờ/i)).toBeDefined();

      // 2. Populate tasks in store and select task
      act(() => {
        useTaskStore.setState({
          tasks: [
            {
              id: 'task-101',
              title: 'Học Giải Tích 2',
              status: 'todo',
              pomodorosEstimated: 3,
              pomodorosCompleted: 0,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
          ],
        });
      });

      const taskBtn = screen.getByText('Học Giải Tích 2');
      fireEvent.click(taskBtn);

      // Dropdown should close and store updated
      expect(screen.queryByTestId('mobile-task-picker-dropdown')).toBeNull();
      expect(useTaskStore.getState().activeTaskId).toBe('task-101');

      // 3. Open picker again while linked -> click "Hủy liên kết nhiệm vụ"
      fireEvent.click(chip);
      const unlinkBtn = screen.getByText('Hủy liên kết nhiệm vụ');
      fireEvent.click(unlinkBtn);

      expect(useTaskStore.getState().activeTaskId).toBeNull();
      expect(screen.queryByTestId('mobile-task-picker-dropdown')).toBeNull();
    });

    it('3.9 onSelectTask prop delegates click to external handler instead of opening dropdown', () => {
      const handleSelectTask = vi.fn();
      render(<MobileFocusView onSelectTask={handleSelectTask} />);

      const chip = screen.getByTestId('mobile-linked-task-chip');
      fireEvent.click(chip);

      expect(handleSelectTask).toHaveBeenCalledTimes(1);
      expect(screen.queryByTestId('mobile-task-picker-dropdown')).toBeNull();
    });

    it('3.10 Breathing aura is strictly isolated to running state only', () => {
      useTimerStore.setState({ status: 'idle' });
      const { rerender } = render(<MobileFocusView />);
      expect(screen.queryByTestId('mobile-breathing-aura')).toBeNull();

      act(() => {
        useTimerStore.setState({ status: 'running' });
      });
      rerender(<MobileFocusView />);
      expect(screen.getByTestId('mobile-breathing-aura')).toBeDefined();

      act(() => {
        useTimerStore.setState({ status: 'paused' });
      });
      rerender(<MobileFocusView />);
      expect(screen.queryByTestId('mobile-breathing-aura')).toBeNull();
    });
  });

  // =========================================================================
  // VECTOR 4: MobileSettingsView Whitelist, Clamping & Audio Resilience
  // =========================================================================
  describe('Vector 4: MobileSettingsView Whitelist, Clamping & Audio Resilience', () => {
    it('4.1 Founder VIP Whitelist Invariant: 👑 Founder VIP badge and 0 upgrade banners', () => {
      useAuthStore.setState({
        user: {
          id: 'founder_nam',
          email: 'namho03052k9@gmail.com', // Whitelisted owner email
          displayName: 'Nam Hồ',
          plan: 'founder',
          createdAt: Date.now(),
        },
        role: 'founder',
        isAuthenticated: true,
        isLoggedIn: true,
        hasVipAccess: true,
        planLabel: 'FOUNDER VIP',
      });

      render(<MobileSettingsView />);
      expect(screen.getByText('Founder VIP')).toBeDefined();
      expect(screen.queryByText(/Nâng cấp để mở khóa/i)).toBeNull();
    });

    it('4.2 PRO VIP User: ⭐ PRO badge and 0 upgrade banners', () => {
      useAuthStore.setState({
        user: {
          id: 'pro_user_1',
          email: 'vip.student@hcmut.edu.vn',
          displayName: 'VIP Học Viên',
          plan: 'pro',
          createdAt: Date.now(),
        },
        role: 'student',
        isAuthenticated: true,
        isLoggedIn: true,
        hasVipAccess: true,
        planLabel: 'PRO LIFETIME',
      });

      render(<MobileSettingsView />);
      expect(screen.getByText('PRO LIFETIME')).toBeDefined();
      expect(screen.queryByText(/Nâng cấp để mở khóa/i)).toBeNull();
    });

    it('4.3 Free user displays Miễn phí badge and shows upgrade prompt banner', () => {
      useAuthStore.setState({
        user: {
          id: 'free_user',
          email: 'guest@domain.com',
          displayName: 'Khách',
          plan: 'free',
          createdAt: Date.now(),
        },
        role: 'student',
        hasVipAccess: false,
      });

      render(<MobileSettingsView />);
      expect(screen.getByText('Miễn phí')).toBeDefined();
      expect(screen.getByText(/Nâng cấp để mở khóa/i)).toBeDefined();
    });

    it('4.4 Clamping enforcement in settings stepper handlers (min/max bounds)', () => {
      render(<MobileSettingsView />);

      const focusMinus = screen.getAllByTestId('mobile-stepper-btn-minus')[0];
      const shortMinus = screen.getAllByTestId('mobile-stepper-btn-minus')[1];
      const longMinus = screen.getAllByTestId('mobile-stepper-btn-minus')[2];

      // Test Focus clamping at 1m
      act(() => {
        useTimerStore.setState({
          settings: {
            ...useTimerStore.getState().settings,
            pomodoroMinutes: 1,
          },
        });
      });
      fireEvent.click(focusMinus);
      expect(useTimerStore.getState().settings.pomodoroMinutes).toBe(1);

      // Test Short break clamping at 1m
      act(() => {
        useTimerStore.setState({
          settings: {
            ...useTimerStore.getState().settings,
            shortBreakMinutes: 1,
          },
        });
      });
      fireEvent.click(shortMinus);
      expect(useTimerStore.getState().settings.shortBreakMinutes).toBe(1);

      // Test Long break clamping at 1m
      act(() => {
        useTimerStore.setState({
          settings: {
            ...useTimerStore.getState().settings,
            longBreakMinutes: 1,
          },
        });
      });
      fireEvent.click(longMinus);
      expect(useTimerStore.getState().settings.longBreakMinutes).toBe(1);
    });

    it('4.5 Alarm chime preview handles rejection gracefully without crashing', () => {
      const mockPlayChime = vi.fn().mockRejectedValue(new Error('Autoplay blocked'));
      useAudioStore.setState({
        playChime: mockPlayChime,
      });

      render(<MobileSettingsView />);
      const previewBtn = screen.getByText('Nghe thử');

      // Should not throw an unhandled promise rejection error
      expect(() => {
        fireEvent.click(previewBtn);
      }).not.toThrow();
      expect(mockPlayChime).toHaveBeenCalled();
    });

    it('4.6 Master volume slider boundary and icon changes', () => {
      render(<MobileSettingsView />);
      const slider = screen.getByTestId('mobile-settings-volume-slider') as HTMLInputElement;

      // Set volume to 0 -> should display 0%
      fireEvent.change(slider, { target: { value: '0' } });
      expect(useAudioStore.getState().settings.masterVolume).toBe(0);
      expect(screen.getByText('0%')).toBeDefined();

      // Set volume to 100 -> should display 100%
      fireEvent.change(slider, { target: { value: '100' } });
      expect(useAudioStore.getState().settings.masterVolume).toBe(1);
      expect(screen.getByText('100%')).toBeDefined();
    });

    it('4.7 Layout reset and Eco Mode toggling', () => {
      render(<MobileSettingsView />);

      // Toggle Eco mode
      const ecoSwitch = screen.getByTestId('mobile-settings-switch-eco');
      fireEvent.click(ecoSwitch);
      expect(useLayoutStore.getState().isEcoMode).toBe(true);

      // Reset layout button
      const resetBtn = screen.getByTestId('mobile-settings-reset-layout-btn');
      fireEvent.click(resetBtn);
      // resetLayout should execute cleanly
      expect(screen.getByTestId('mobile-settings-view')).toBeDefined();
    });
  });

  // =========================================================================
  // VECTOR 5: MobileAppShell Normalization, Subviews & Fallback PiP
  // =========================================================================
  describe('Vector 5: MobileAppShell Normalization, Subviews & Fallback PiP', () => {
    it('5.1 Tab normalization: invalid/corrupted tab defaults to focus canvas', () => {
      useLayoutStore.setState({ activeMobileTab: 'invalid_corrupted_tab' as any });
      render(<MobileAppShell />);

      // Falls back to focus view
      expect(screen.getByTestId('mobile-view-focus')).toBeDefined();
      expect(screen.getByTestId('mobile-monumental-timer')).toBeDefined();
    });

    it('5.2 Legacy timer tab maps to focus canvas', () => {
      useLayoutStore.setState({ activeMobileTab: 'timer' as any });
      render(<MobileAppShell />);

      expect(screen.getByTestId('mobile-view-focus')).toBeDefined();
    });

    it('5.3 Document PiP fallback to in-app floating pill when API throws error', async () => {
      // Mock window.documentPictureInPicture throwing error
      (window as any).documentPictureInPicture = {
        requestWindow: vi.fn().mockRejectedValue(new Error('PiP Permission Denied')),
      };

      render(<MobileAppShell />);
      const pipBtn = screen.getByTestId('mobile-pip-btn');

      // Click PiP button
      await act(async () => {
        fireEvent.click(pipBtn);
      });

      // Should fallback to in-app floating PiP pill
      const inAppPill = screen.getByTestId('mobile-in-app-pip-pill');
      expect(inAppPill).toBeDefined();
      expect(inAppPill.textContent).toContain('25:00');

      // Close floating PiP pill
      const closeBtn = screen.getByLabelText('Đóng đồng hồ nổi');
      fireEvent.click(closeBtn);
      expect(screen.queryByTestId('mobile-in-app-pip-pill')).toBeNull();
    });

    it('5.4 Tasks SubView: quick add, filter, link, and delete operations', async () => {
      useLayoutStore.setState({ activeMobileTab: 'tasks' as any });
      render(<MobileAppShell />);

      expect(screen.getByTestId('mobile-view-tasks')).toBeDefined();

      // Quick add task
      const input = screen.getByPlaceholderText('Thêm nhiệm vụ mới...');
      const form = input.closest('form')!;

      await act(async () => {
        fireEvent.change(input, { target: { value: 'Nhiệm vụ kiểm thử v7' } });
      });

      await act(async () => {
        fireEvent.submit(form);
      });

      // Wait for task creation to settle in store
      await waitFor(() => {
        expect(useTaskStore.getState().tasks.length).toBeGreaterThan(0);
      });

      const tasks = useTaskStore.getState().tasks;
      expect(tasks[0].title).toBe('Nhiệm vụ kiểm thử v7');

      // Filter tabs test
      const todoFilter = screen.getByText('Chưa xong');
      fireEvent.click(todoFilter);
      expect(screen.getByText('Nhiệm vụ kiểm thử v7')).toBeDefined();

      // Link task to timer & verify redirection to focus tab
      const linkBtn = screen.getByTitle('Gắn với đồng hồ Pomodoro');
      fireEvent.click(linkBtn);
      expect(useTaskStore.getState().activeTaskId).toBe(tasks[0].id);
      expect(useLayoutStore.getState().activeMobileTab).toBe('focus');
    });

    it('5.5 Spaces SubView: preset selection and ambient effect configuration', () => {
      useLayoutStore.setState({ activeMobileTab: 'spaces' as any });
      render(<MobileAppShell />);

      expect(screen.getByTestId('mobile-view-spaces')).toBeDefined();

      // Select preset
      const kyotoBtn = screen.getByText('Rainy Kyoto');
      fireEvent.click(kyotoBtn);
      expect(useBackgroundStore.getState().activePresetId).toBe('rainy-kyoto');

      // Set ambient effect
      const rainBtn = screen.getByText('Mưa rơi');
      fireEvent.click(rainBtn);
      expect(useBackgroundStore.getState().ambientEffect).toBe('rain');
    });

    it('5.6 AI Companion SubView: suggested prompts and input submission', async () => {
      useLayoutStore.setState({ activeMobileTab: 'ai' as any });
      render(<MobileAppShell />);

      expect(screen.getByTestId('mobile-view-ai')).toBeDefined();

      // Click suggested prompt
      const suggestionBtn = screen.getByText(/Giải thích phương pháp Pomodoro/i);
      await act(async () => {
        fireEvent.click(suggestionBtn);
      });

      // Loading state indicator
      act(() => {
        useAiStore.setState({ isLoading: true });
      });
      expect(screen.getByText('AI đang suy nghĩ...')).toBeDefined();
    });

    it('5.7 Predictive back gesture: popstate intercepts secondary tab and routes to focus tab', () => {
      useLayoutStore.setState({ activeMobileTab: 'settings' as any });
      render(<MobileAppShell />);

      expect(useLayoutStore.getState().activeMobileTab).toBe('settings');

      // Fire popstate event
      act(() => {
        window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
      });

      expect(useLayoutStore.getState().activeMobileTab).toBe('focus');
    });
  });
});
