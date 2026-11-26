import 'fake-indexeddb/auto';
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';

// Components under test
import { MobileSettingsView } from '../../src/components/mobile/views/MobileSettingsView';
import { MobileStepperRow } from '../../src/components/mobile/primitives/MobileStepperRow';
import { MobileFocusView } from '../../src/components/mobile/views/MobileFocusView';

// Stores & DB
import { useTimerStore } from '../../src/stores/useTimerStore';
import { useTaskStore } from '../../src/stores/useTaskStore';
import { useLayoutStore } from '../../src/stores/useLayoutStore';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { db } from '../../src/db';

describe('Milestone M4 — Mobile UI Polish & Focus Display Remediation (BUG-08, 09, 10, 33, 34)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();

    try {
      await db.focus_sessions.clear();
      await db.tasks.clear();
    } catch {
      // Ignore if IDB is mocked
    }

    useTimerStore.setState({
      phase: 'pomodoro',
      status: 'idle',
      remainingMs: 25 * 60 * 1000,
      currentRound: 1,
      dailyProgress: 0,
      todayFocusMinutes: 0,
      linkedTaskId: null,
      linkedTaskTitle: null,
      settings: {
        pomodoroMinutes: 25,
        shortBreakMinutes: 5,
        longBreakMinutes: 15,
        roundsBeforeLongBreak: 4,
        autoTransition: false,
        notificationEnabled: false,
      },
    });

    useTaskStore.setState({
      tasks: [],
      projects: [],
      activeTaskId: null,
    });

    useLayoutStore.setState({
      activeMobileTab: 'focus',
      isMobile: true,
      isZenMode: false,
    });

    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
    });

    // Mock matchMedia for mobile
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
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. MobileSettingsView: 2 Rows x 3 Cols Grid & No Truncated Shortcut Text (BUG-10, BUG-34)
  // =========================================================================
  describe('1. MobileSettingsView Shortcut Grid (BUG-10, BUG-34)', () => {
    it('1.1 Uses a 2-row x 3-column grid (grid-cols-3 gap-2) instead of cramped grid-cols-5', () => {
      render(<MobileSettingsView />);

      const shortcutsGrid = screen.getByTestId('mobile-settings-shortcuts-grid');
      expect(shortcutsGrid).toBeDefined();
      expect(shortcutsGrid.className).toContain('grid-cols-3');
      expect(shortcutsGrid.className).toContain('gap-2');
      expect(shortcutsGrid.className).not.toContain('grid-cols-5');
    });

    it('1.2 Renders all 5 shortcuts with full labels and zero truncate class on text', () => {
      render(<MobileSettingsView />);

      const roomsBtn = screen.getByTestId('mobile-settings-entry-rooms');
      const notesBtn = screen.getByTestId('mobile-settings-entry-notes');
      const calendarBtn = screen.getByTestId('mobile-settings-entry-calendar');
      const dashboardBtn = screen.getByTestId('mobile-settings-entry-dashboard');
      const billingBtn = screen.getByTestId('mobile-settings-entry-billing');

      expect(roomsBtn.textContent).toContain('Meet');
      expect(notesBtn.textContent).toContain('Ghi chú');
      expect(calendarBtn.textContent).toContain('Lịch');
      expect(dashboardBtn.textContent).toContain('Thống kê');
      expect(billingBtn.textContent).toContain('Gói cước');

      // Crucial: none of the label spans should have "truncate" class
      const dashboardSpan = dashboardBtn.querySelector('span');
      expect(dashboardSpan?.className).not.toContain('truncate');

      const billingSpan = billingBtn.querySelector('span');
      expect(billingSpan?.className).not.toContain('truncate');
    });

    it('1.3 Navigates correctly when shortcuts are clicked', () => {
      const pushStateSpy = vi.spyOn(window.history, 'pushState');
      render(<MobileSettingsView />);

      fireEvent.click(screen.getByTestId('mobile-settings-entry-rooms'));
      expect(pushStateSpy).toHaveBeenCalledWith({}, '', '/rooms');

      fireEvent.click(screen.getByTestId('mobile-settings-entry-calendar'));
      expect(pushStateSpy).toHaveBeenCalledWith({}, '', '/calendar');

      fireEvent.click(screen.getByTestId('mobile-settings-entry-dashboard'));
      expect(pushStateSpy).toHaveBeenCalledWith({}, '', '/dashboard');

      fireEvent.click(screen.getByTestId('mobile-settings-entry-billing'));
      expect(pushStateSpy).toHaveBeenCalledWith({}, '', '/billing');
    });
  });

  // =========================================================================
  // 2. MobileStepperRow: Natural Multi-Line Subtitle Wrap (BUG-10, BUG-34)
  // =========================================================================
  describe('2. MobileStepperRow Subtitle Wrap (BUG-10, BUG-34)', () => {
    it('2.1 Subtitle renders with natural wrapping classes and no truncate or overflow-hidden', () => {
      const longSubtitle = 'Số phút cho mỗi phiên học sâu kéo dài không ngắt quãng';
      render(
        <MobileStepperRow
          id="focus-test"
          label="Thời gian tập trung"
          subtitle={longSubtitle}
          value={25}
          onChange={() => {}}
        />
      );

      const subtitleEl = screen.getByTestId('mobile-stepper-focus-test-subtitle');
      expect(subtitleEl).toBeDefined();
      expect(subtitleEl.textContent).toBe(longSubtitle);

      // Must allow multi-line natural wrap
      expect(subtitleEl.className).toContain('whitespace-normal');
      expect(subtitleEl.className).toContain('break-words');
      expect(subtitleEl.className).not.toContain('truncate');
      expect(subtitleEl.className).not.toContain('text-ellipsis');
    });

    it('2.2 Stepper responds to increment and decrement within bounds', () => {
      const handleChange = vi.fn();
      render(
        <MobileStepperRow
          id="stepper-bounds"
          label="Nghỉ ngắn"
          value={5}
          min={1}
          max={60}
          step={1}
          onChange={handleChange}
        />
      );

      const minusBtn = screen.getByTestId('mobile-stepper-btn-minus');
      const plusBtn = screen.getByTestId('mobile-stepper-btn-plus');

      fireEvent.click(minusBtn);
      expect(handleChange).toHaveBeenCalledWith(4);

      fireEvent.click(plusBtn);
      expect(handleChange).toHaveBeenCalledWith(6);
    });
  });

  // =========================================================================
  // 3. MobileFocusView: 4-Round Focus Cycle Dots Logic (BUG-08, BUG-33)
  // =========================================================================
  describe('3. MobileFocusView Cycle Dots State & Logic (BUG-08, BUG-33)', () => {
    it('3.1 Round 1 at 24:58 (Running): Dot 1 is active (white ring, not solid white), Dots 2..4 are upcoming', () => {
      useTimerStore.setState({
        phase: 'pomodoro',
        status: 'running',
        currentRound: 1,
        remainingMs: (24 * 60 + 58) * 1000,
        settings: {
          ...useTimerStore.getState().settings,
          roundsBeforeLongBreak: 4,
        },
      });

      render(<MobileFocusView />);

      const dot1 = screen.getByTestId('mobile-cycle-dot-1');
      const dot2 = screen.getByTestId('mobile-cycle-dot-2');
      const dot3 = screen.getByTestId('mobile-cycle-dot-3');
      const dot4 = screen.getByTestId('mobile-cycle-dot-4');

      // Dot 1: Active round -> hollow ring / pulse, NOT solid white!
      expect(dot1.getAttribute('data-state')).toBe('active');
      expect(dot1.getAttribute('aria-label')).toBe('Hiệp 1: Đang diễn ra');

      // Dots 2, 3, 4: Upcoming rounds -> subtle inactive gray dot
      expect(dot2.getAttribute('data-state')).toBe('upcoming');

      expect(dot3.getAttribute('data-state')).toBe('upcoming');

      expect(dot4.getAttribute('data-state')).toBe('upcoming');

      // Crucial: NOT all 4 dots glowing solid white at 24:58!
      const completedDots = [dot1, dot2, dot3, dot4].filter(
        (d) => d.getAttribute('data-state') === 'completed'
      );
      expect(completedDots.length).toBe(0);
    });

    it('3.2 Round 4 of 4: Dots 1..3 are completed (solid white), Dot 4 is active (white ring, NOT solid white)', () => {
      useTimerStore.setState({
        phase: 'pomodoro',
        status: 'running',
        currentRound: 4,
        remainingMs: (24 * 60 + 58) * 1000,
        settings: {
          ...useTimerStore.getState().settings,
          roundsBeforeLongBreak: 4,
        },
      });

      render(<MobileFocusView />);

      const dot1 = screen.getByTestId('mobile-cycle-dot-1');
      const dot2 = screen.getByTestId('mobile-cycle-dot-2');
      const dot3 = screen.getByTestId('mobile-cycle-dot-3');
      const dot4 = screen.getByTestId('mobile-cycle-dot-4');

      // Rounds 1, 2, 3 must be solid white completed
      expect(dot1.getAttribute('data-state')).toBe('completed');

      expect(dot2.getAttribute('data-state')).toBe('completed');

      expect(dot3.getAttribute('data-state')).toBe('completed');

      // Round 4 is CURRENT active, NOT completed yet! Must have distinct outline/ring, NOT solid white
      expect(dot4.getAttribute('data-state')).toBe('active');
      expect(dot4.getAttribute('aria-label')).toBe('Hiệp 4: Đang diễn ra');

      // Only 3 completed dots, exactly 1 active dot
      const completedDots = [dot1, dot2, dot3, dot4].filter(
        (d) => d.getAttribute('data-state') === 'completed'
      );
      expect(completedDots.length).toBe(3);
    });

    it('3.3 Round 2 of 4: Dot 1 completed, Dot 2 active, Dots 3 & 4 upcoming', () => {
      useTimerStore.setState({
        phase: 'pomodoro',
        status: 'running',
        currentRound: 2,
        remainingMs: 15 * 60 * 1000,
        settings: {
          ...useTimerStore.getState().settings,
          roundsBeforeLongBreak: 4,
        },
      });

      render(<MobileFocusView />);

      expect(screen.getByTestId('mobile-cycle-dot-1').getAttribute('data-state')).toBe('completed');
      expect(screen.getByTestId('mobile-cycle-dot-2').getAttribute('data-state')).toBe('active');
      expect(screen.getByTestId('mobile-cycle-dot-3').getAttribute('data-state')).toBe('upcoming');
      expect(screen.getByTestId('mobile-cycle-dot-4').getAttribute('data-state')).toBe('upcoming');
    });
  });

  // =========================================================================
  // 4. MobileFocusView Layout: Progress Bar & Hiệp Label Spacing (BUG-08, BUG-33)
  // =========================================================================
  describe('4. MobileFocusView Progress Bar & Hiệp Spacing Layout (BUG-08, BUG-33)', () => {
    it('4.1 Cycle status is enclosed in dedicated pill with distinct vertical separation from progress bar', () => {
      render(<MobileFocusView />);

      const progressBar = screen.getByTestId('mobile-session-progress-bar');
      expect(progressBar).toBeDefined();

      const cyclePill = screen.getByTestId('mobile-cycle-status-pill');
      expect(cyclePill).toBeDefined();
      expect(cyclePill.className).toContain('mt-4');
      expect(cyclePill.className).toContain('rounded-full');

      const roundLabel = screen.getByTestId('mobile-cycle-round-label');
      expect(roundLabel.textContent).toContain('Hiệp 1/4');
    });
  });

  // =========================================================================
  // 5. MobileFocusView: In-Place Quick Task Creation When Empty 0/0 (BUG-09)
  // =========================================================================
  describe('5. MobileFocusView In-Place Quick Task Creation (BUG-09)', () => {
    it('5.1 When task list is empty (0/0), opening picker shows inline quick add input and button', () => {
      useTaskStore.setState({ tasks: [] });

      render(<MobileFocusView />);

      // Open task picker bottom sheet
      const taskChip = screen.getByTestId('mobile-linked-task-chip');
      fireEvent.click(taskChip);

      // Verify empty state container and quick task form
      const emptyContainer = screen.getByTestId('mobile-task-picker-empty');
      expect(emptyContainer).toBeDefined();
      expect(emptyContainer.textContent).toContain('Chưa có công việc đang chờ');

      const quickInput = screen.getByTestId('mobile-quick-task-input');
      expect(quickInput).toBeDefined();

      const submitBtn = screen.getByTestId('mobile-quick-task-submit-btn');
      expect(submitBtn).toBeDefined();
      expect((submitBtn as HTMLButtonElement).disabled).toBe(true);
    });

    it('5.2 Types title, creates task immediately, links it to timer, and closes picker', async () => {
      useTaskStore.setState({ tasks: [] });

      render(<MobileFocusView />);

      // Open picker
      fireEvent.click(screen.getByTestId('mobile-linked-task-chip'));

      const quickInput = screen.getByTestId('mobile-quick-task-input');
      const submitBtn = screen.getByTestId('mobile-quick-task-submit-btn');

      // Type new task title
      fireEvent.change(quickInput, { target: { value: 'Ôn tập Giải tích 1' } });
      expect((submitBtn as HTMLButtonElement).disabled).toBe(false);

      // Submit form
      await act(async () => {
        fireEvent.click(submitBtn);
      });

      // Verify task was created in useTaskStore
      const currentTasks = useTaskStore.getState().tasks;
      expect(currentTasks.length).toBe(1);
      expect(currentTasks[0].title).toBe('Ôn tập Giải tích 1');

      // Verify timer store linked the newly created task
      const timerState = useTimerStore.getState();
      expect(timerState.linkedTaskId).toBe(currentTasks[0].id);
      expect(timerState.linkedTaskTitle).toBe('Ôn tập Giải tích 1');

      // Verify picker dropdown was closed
      expect(screen.queryByTestId('mobile-task-picker-dropdown')).toBeNull();

      // Chip now displays the newly linked task title
      const updatedChip = screen.getByTestId('mobile-linked-task-chip');
      expect(updatedChip.textContent).toContain('Ôn tập Giải tích 1');
    });

    it('5.3 Allows selecting an existing task when task list is populated', async () => {
      const existingTask = {
        id: 'task-abc-123',
        title: 'Học React Native và Capacitor',
        status: 'todo' as const,
        priority: 'high' as const,
        estimatedPomodoros: 3,
        completedPomodoros: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      useTaskStore.setState({
        tasks: [existingTask],
      });

      render(<MobileFocusView />);

      // Open picker
      fireEvent.click(screen.getByTestId('mobile-linked-task-chip'));

      // Find the task option and click it
      const taskOption = screen.getByText('Học React Native và Capacitor');
      expect(taskOption).toBeDefined();

      fireEvent.click(taskOption);

      // Verify timer is linked
      expect(useTimerStore.getState().linkedTaskId).toBe('task-abc-123');
      expect(useTimerStore.getState().linkedTaskTitle).toBe('Học React Native và Capacitor');
    });
  });
});
