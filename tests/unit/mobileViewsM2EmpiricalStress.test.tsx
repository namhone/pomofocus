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

describe('Empirical Adversarial Stress Suite — Milestone 2 Mobile Views', () => {
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

    useLayoutStore.setState({ isEcoMode: false });
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
    useAiStore.setState({ aiCreditsBalance: 100, isTopupModalOpen: false });
    useAuthStore.setState({
      user: {
        id: 'u_stress',
        email: 'tester@zen.io',
        displayName: 'Challenger Zen',
        plan: 'free',
        createdAt: Date.now(),
      },
      isAuthenticated: true,
      role: 'student',
      planLabel: 'FREE',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // VECTOR 1: Rapid Play/Pause Toggling Stability
  // =========================================================================
  describe('Vector 1: Rapid Play/Pause Toggling Stress', () => {
    it('1.1 Handles 50 consecutive rapid Play/Pause clicks without NaN or crashes', () => {
      const { unmount } = render(<MobileFocusView />);
      const mainBtn = screen.getByTestId('mobile-timer-main-action');
      const timerDisplay = screen.getByTestId('mobile-monumental-timer');

      for (let i = 0; i < 50; i++) {
        act(() => {
          fireEvent.click(mainBtn);
        });

        const storeStatus = useTimerStore.getState().status;
        const currentMs = useTimerStore.getState().remainingMs;

        // Invariant: status must always be either 'running' or 'paused'
        expect(['running', 'paused']).toContain(storeStatus);

        // Invariant: remainingMs must be a positive integer and NEVER NaN
        expect(Number.isFinite(currentMs)).toBe(true);
        expect(isNaN(currentMs)).toBe(false);
        expect(currentMs).toBeGreaterThan(0);

        // Invariant: timer text must strictly match MM:SS format, never NaN:NaN
        expect(timerDisplay.textContent).toMatch(/^\d{2}:\d{2}$/);
        expect(timerDisplay.textContent).not.toContain('NaN');
      }

      unmount();
    });

    it('1.2 Rapid alternating clicks between Play/Pause and Reset maintain state integrity', () => {
      render(<MobileFocusView />);
      const mainBtn = screen.getByTestId('mobile-timer-main-action');
      const resetBtn = screen.getByTestId('mobile-timer-reset');
      const timerDisplay = screen.getByTestId('mobile-monumental-timer');

      for (let i = 0; i < 20; i++) {
        act(() => {
          fireEvent.click(mainBtn); // start
          fireEvent.click(mainBtn); // pause
          fireEvent.click(resetBtn); // reset
        });

        expect(useTimerStore.getState().status).toBe('idle');
        expect(useTimerStore.getState().remainingMs).toBe(25 * 60 * 1000);
        expect(timerDisplay.textContent).toBe('25:00');
      }
    });
  });

  // =========================================================================
  // VECTOR 2: Phase Switching During Running State
  // =========================================================================
  describe('Vector 2: Phase Switching During Running State', () => {
    it('2.1 Switching to short_break while running correctly updates remaining time to short break duration', () => {
      render(<MobileFocusView />);

      const mainBtn = screen.getByTestId('mobile-timer-main-action');
      act(() => {
        fireEvent.click(mainBtn); // Timer is now running
      });
      expect(useTimerStore.getState().status).toBe('running');

      // Now switch phase to short_break while running
      const shortTab = screen.getByTestId('mobile-phase-short_break');
      act(() => {
        fireEvent.click(shortTab);
      });
      const confirmBtn = screen.queryByTestId('confirm-phase-change-btn');
      if (confirmBtn) {
        act(() => {
          fireEvent.click(confirmBtn);
        });
      }

      expect(useTimerStore.getState().phase).toBe('short_break');
      expect(useTimerStore.getState().remainingMs).toBe(5 * 60 * 1000);

      const timerDisplay = screen.getByTestId('mobile-monumental-timer');
      expect(timerDisplay.textContent).toBe('05:00');
    });

    it('2.2 Switching to long_break while running correctly updates remaining time to long break duration', () => {
      render(<MobileFocusView />);

      const mainBtn = screen.getByTestId('mobile-timer-main-action');
      act(() => {
        fireEvent.click(mainBtn); // Timer running
      });

      const longTab = screen.getByTestId('mobile-phase-long_break');
      act(() => {
        fireEvent.click(longTab);
      });
      const confirmBtn = screen.queryByTestId('confirm-phase-change-btn');
      if (confirmBtn) {
        act(() => {
          fireEvent.click(confirmBtn);
        });
      }

      expect(useTimerStore.getState().phase).toBe('long_break');
      expect(useTimerStore.getState().remainingMs).toBe(15 * 60 * 1000);

      const timerDisplay = screen.getByTestId('mobile-monumental-timer');
      expect(timerDisplay.textContent).toBe('15:00');
    });

    it('2.3 Switching back to pomodoro while running correctly restores pomodoro duration', () => {
      render(<MobileFocusView />);

      const shortTab = screen.getByTestId('mobile-phase-short_break');
      act(() => {
        fireEvent.click(shortTab);
      });
      expect(useTimerStore.getState().phase).toBe('short_break');

      const pomoTab = screen.getByTestId('mobile-phase-pomodoro');
      act(() => {
        fireEvent.click(pomoTab);
      });

      expect(useTimerStore.getState().phase).toBe('pomodoro');
      expect(useTimerStore.getState().remainingMs).toBe(25 * 60 * 1000);

      const timerDisplay = screen.getByTestId('mobile-monumental-timer');
      expect(timerDisplay.textContent).toBe('25:00');
    });
  });

  // =========================================================================
  // VECTOR 3: Monumental Typography, Drop-Shadow, Tabular-Nums
  // =========================================================================
  describe('Vector 3: Monumental Typography and Drop-Shadow', () => {
    it('3.1 Timer element has tabular-nums, monumental 6xl/7xl size, drop-shadow, and tracking-tighter', () => {
      render(<MobileFocusView />);

      const timerElement = screen.getByTestId('mobile-monumental-timer');
      const classes = timerElement.className;

      expect(classes).toContain('tabular-nums');
      expect(classes).toContain('text-6xl');
      expect(classes).toContain('md:text-7xl');
      expect(classes).toContain('font-bold');
      expect(classes).toContain('tracking-tighter');
      expect(classes).toContain('text-white');
      expect(classes).toContain('drop-shadow-[0_4px_30px_rgba(52,211,153,0.25)]');
    });
  });

  // =========================================================================
  // VECTOR 4: Absence of Modal Backdrops & Window Chrome
  // =========================================================================
  describe('Vector 4: Absolute Absence of Modal Backdrops & Window Chrome', () => {
    it('4.1 MobileFocusView has zero modal backdrops, zero dialogs, zero widget containers, and zero close/minimize buttons', () => {
      render(<MobileFocusView />);

      expect(screen.queryByTestId('modal-backdrop')).toBeNull();
      expect(screen.queryByTestId('widget-container')).toBeNull();
      expect(screen.queryByTestId('widget-close-btn')).toBeNull();
      expect(screen.queryByTestId('widget-minimize-btn')).toBeNull();
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('4.2 MobileSettingsView has zero modal backdrops and zero widget containers', () => {
      render(<MobileSettingsView />);

      expect(screen.queryByTestId('modal-backdrop')).toBeNull();
      expect(screen.queryByTestId('widget-container')).toBeNull();
      expect(screen.queryByTestId('widget-close-btn')).toBeNull();
      expect(screen.queryByTestId('widget-minimize-btn')).toBeNull();
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });

  // =========================================================================
  // VECTOR 5: Stepper Bounds Adjustment & Live Reflection
  // =========================================================================
  describe('Vector 5: Stepper Bounds (1-120) & Live Store Synchronization', () => {
    it('5.1 Adjusting Focus Stepper to maximum boundary (120) enforces upper limit and disables plus button', () => {
      // Set to 119
      useTimerStore.setState({
        settings: {
          ...useTimerStore.getState().settings,
          pomodoroMinutes: 119,
        },
      });

      render(<MobileSettingsView />);

      const focusStepper = screen.getByTestId('mobile-settings-stepper-focus');
      const plusBtn = focusStepper.querySelector('[data-testid="mobile-stepper-btn-plus"]') as HTMLButtonElement;
      expect(plusBtn).not.toBeNull();
      expect(plusBtn.disabled).toBe(false);

      // Click plus: 119 -> 120
      act(() => {
        fireEvent.click(plusBtn);
      });
      expect(useTimerStore.getState().settings.pomodoroMinutes).toBe(120);

      // Now value is 120 (max), plus button should be disabled
      expect(plusBtn.disabled).toBe(true);

      // Click again while disabled should not increase beyond 120
      act(() => {
        fireEvent.click(plusBtn);
      });
      expect(useTimerStore.getState().settings.pomodoroMinutes).toBe(120);
    });

    it('5.2 Adjusting Focus Stepper to minimum boundary (1) enforces lower limit and disables minus button', () => {
      // Set to 2
      useTimerStore.setState({
        settings: {
          ...useTimerStore.getState().settings,
          pomodoroMinutes: 2,
        },
      });

      render(<MobileSettingsView />);

      const focusStepper = screen.getByTestId('mobile-settings-stepper-focus');
      const minusBtn = focusStepper.querySelector('[data-testid="mobile-stepper-btn-minus"]') as HTMLButtonElement;
      expect(minusBtn).not.toBeNull();
      expect(minusBtn.disabled).toBe(false);

      // Click minus: 2 -> 1
      act(() => {
        fireEvent.click(minusBtn);
      });
      expect(useTimerStore.getState().settings.pomodoroMinutes).toBe(1);

      // Now value is 1 (min), minus button should be disabled
      expect(minusBtn.disabled).toBe(true);

      // Click again while disabled should not decrease below 1
      act(() => {
        fireEvent.click(minusBtn);
      });
      expect(useTimerStore.getState().settings.pomodoroMinutes).toBe(1);
    });

    it('5.3 Modifying duration in MobileSettingsView immediately reflects in MobileFocusView upon reset or phase switch', () => {
      // Step 1: Render Settings and set Focus to 45 min
      const { unmount: unmountSettings } = render(<MobileSettingsView />);
      const focusStepper = screen.getByTestId('mobile-settings-stepper-focus');
      const plusBtn = focusStepper.querySelector('[data-testid="mobile-stepper-btn-plus"]') as HTMLButtonElement;

      // Click 20 times to go from 25 to 45
      for (let i = 0; i < 20; i++) {
        act(() => {
          fireEvent.click(plusBtn);
        });
      }
      expect(useTimerStore.getState().settings.pomodoroMinutes).toBe(45);
      unmountSettings();

      // Step 2: Render FocusView and reset or toggle
      const { unmount: unmountFocus } = render(<MobileFocusView />);
      const resetBtn = screen.getByTestId('mobile-timer-reset');
      act(() => {
        fireEvent.click(resetBtn);
      });

      const timerDisplay = screen.getByTestId('mobile-monumental-timer');
      expect(timerDisplay.textContent).toBe('45:00');
      unmountFocus();
    });

    it('5.4 Short Break and Long Break steppers enforce boundary limits (1 to 60)', () => {
      useTimerStore.setState({
        settings: {
          ...useTimerStore.getState().settings,
          shortBreakMinutes: 60,
          longBreakMinutes: 1,
        },
      });

      render(<MobileSettingsView />);

      const shortStepper = screen.getByTestId('mobile-settings-stepper-short');
      const shortPlus = shortStepper.querySelector('[data-testid="mobile-stepper-btn-plus"]') as HTMLButtonElement;
      expect(shortPlus.disabled).toBe(true);

      const longStepper = screen.getByTestId('mobile-settings-stepper-long');
      const longMinus = longStepper.querySelector('[data-testid="mobile-stepper-btn-minus"]') as HTMLButtonElement;
      expect(longMinus.disabled).toBe(true);
    });
  });
});
