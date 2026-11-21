import 'fake-indexeddb/auto';
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';

// Target component
import { MobileFocusView } from '../../src/components/mobile/views/MobileFocusView';

// Stores & Database
import { useTimerStore } from '../../src/stores/useTimerStore';
import { useTaskStore } from '../../src/stores/useTaskStore';
import { useLayoutStore } from '../../src/stores/useLayoutStore';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { db } from '../../src/db';

describe('Milestone M4 — Challenger Adversarial Attack Suite: Focus Cycle Dots & Task Picker', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();

    try {
      await db.focus_sessions.clear();
      await db.tasks.clear();
    } catch {
      // Ignore if IDB not instantiated
    }

    // Default clean state
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

    // Mock matchMedia for mobile environment
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

  // ===========================================================================
  // ATTACK VECTOR 1: Cycle Dots State Invariants Across All Rounds & Timers
  // ===========================================================================
  describe('Attack Vector 1: Focus Cycle Dots State Transitions & Invariants (BUG-08, BUG-33)', () => {
    it('1.1 Round 1 of 4 at various elapsed seconds (25:00, 24:58, 12:30, 00:01, 00:00) strictly enforces 0 completed, 1 active, 3 upcoming', () => {
      const timestampsToTest = [
        25 * 60 * 1000, // 25:00 (Just started)
        (24 * 60 + 58) * 1000, // 24:58 (2 seconds in)
        (12 * 60 + 30) * 1000, // 12:30 (Midway)
        1 * 1000, // 00:01 (Final second)
        0, // 00:00 (Zero remaining)
      ];

      for (const remainingMs of timestampsToTest) {
        useTimerStore.setState({
          phase: 'pomodoro',
          status: 'running',
          currentRound: 1,
          remainingMs,
          settings: {
            ...useTimerStore.getState().settings,
            roundsBeforeLongBreak: 4,
          },
        });

        const { unmount } = render(<MobileFocusView />);

        const roundLabel = screen.getByTestId('mobile-cycle-round-label');
        expect(roundLabel.textContent).toBe('Hiệp 1/4');

        const dot1 = screen.getByTestId('mobile-cycle-dot-1');
        const dot2 = screen.getByTestId('mobile-cycle-dot-2');
        const dot3 = screen.getByTestId('mobile-cycle-dot-3');
        const dot4 = screen.getByTestId('mobile-cycle-dot-4');

        // Dot 1: Must be active (hollow pulsating ring), NEVER solid green
        expect(dot1.getAttribute('data-state')).toBe('active');
        expect(dot1.className).toContain('animate-pulse');
        expect(dot1.className).toContain('border-emerald-400');
        expect(dot1.className).toContain('bg-transparent');
        expect(dot1.className).not.toContain('bg-emerald-400');

        // Dots 2..4: Must be upcoming (gray dots)
        expect(dot2.getAttribute('data-state')).toBe('upcoming');
        expect(dot2.className).toContain('bg-zinc-800');
        expect(dot3.getAttribute('data-state')).toBe('upcoming');
        expect(dot3.className).toContain('bg-zinc-800');
        expect(dot4.getAttribute('data-state')).toBe('upcoming');
        expect(dot4.className).toContain('bg-zinc-800');

        // EMPIRICAL INVARIANT: Exactly 0 dots completed
        const completedDots = [dot1, dot2, dot3, dot4].filter(
          (d) => d.getAttribute('data-state') === 'completed'
        );
        expect(completedDots.length).toBe(0);

        // EMPIRICAL INVARIANT: Exactly 1 dot active
        const activeDots = [dot1, dot2, dot3, dot4].filter(
          (d) => d.getAttribute('data-state') === 'active'
        );
        expect(activeDots.length).toBe(1);

        // EMPIRICAL INVARIANT: Exactly 3 dots upcoming
        const upcomingDots = [dot1, dot2, dot3, dot4].filter(
          (d) => d.getAttribute('data-state') === 'upcoming'
        );
        expect(upcomingDots.length).toBe(3);

        unmount();
      }
    });

    it('1.2 Round 2 of 4 across running, paused, and idle states: exactly 1 completed, 1 active, 2 upcoming', () => {
      const statuses: Array<'running' | 'paused' | 'idle'> = ['running', 'paused', 'idle'];

      for (const st of statuses) {
        useTimerStore.setState({
          phase: 'pomodoro',
          status: st,
          currentRound: 2,
          remainingMs: 15 * 60 * 1000,
          settings: {
            ...useTimerStore.getState().settings,
            roundsBeforeLongBreak: 4,
          },
        });

        const { unmount } = render(<MobileFocusView />);

        expect(screen.getByTestId('mobile-cycle-round-label').textContent).toBe('Hiệp 2/4');

        const dot1 = screen.getByTestId('mobile-cycle-dot-1');
        const dot2 = screen.getByTestId('mobile-cycle-dot-2');
        const dot3 = screen.getByTestId('mobile-cycle-dot-3');
        const dot4 = screen.getByTestId('mobile-cycle-dot-4');

        // Dot 1: Completed
        expect(dot1.getAttribute('data-state')).toBe('completed');
        expect(dot1.className).toContain('bg-emerald-400');

        // Dot 2: Active
        expect(dot2.getAttribute('data-state')).toBe('active');
        expect(dot2.className).toContain('border-emerald-400');
        expect(dot2.className).toContain('bg-transparent');
        expect(dot2.className).not.toContain('bg-emerald-400');

        // Dots 3 & 4: Upcoming
        expect(dot3.getAttribute('data-state')).toBe('upcoming');
        expect(dot3.className).toContain('bg-zinc-800');
        expect(dot4.getAttribute('data-state')).toBe('upcoming');
        expect(dot4.className).toContain('bg-zinc-800');

        const allDots = [dot1, dot2, dot3, dot4];
        expect(allDots.filter((d) => d.getAttribute('data-state') === 'completed').length).toBe(1);
        expect(allDots.filter((d) => d.getAttribute('data-state') === 'active').length).toBe(1);
        expect(allDots.filter((d) => d.getAttribute('data-state') === 'upcoming').length).toBe(2);

        unmount();
      }
    });

    it('1.3 Round 3 of 4: strictly 2 completed, 1 active, 1 upcoming', () => {
      useTimerStore.setState({
        phase: 'pomodoro',
        status: 'running',
        currentRound: 3,
        remainingMs: 20 * 60 * 1000,
        settings: {
          ...useTimerStore.getState().settings,
          roundsBeforeLongBreak: 4,
        },
      });

      render(<MobileFocusView />);

      expect(screen.getByTestId('mobile-cycle-round-label').textContent).toBe('Hiệp 3/4');

      const dot1 = screen.getByTestId('mobile-cycle-dot-1');
      const dot2 = screen.getByTestId('mobile-cycle-dot-2');
      const dot3 = screen.getByTestId('mobile-cycle-dot-3');
      const dot4 = screen.getByTestId('mobile-cycle-dot-4');

      expect(dot1.getAttribute('data-state')).toBe('completed');
      expect(dot1.className).toContain('bg-emerald-400');

      expect(dot2.getAttribute('data-state')).toBe('completed');
      expect(dot2.className).toContain('bg-emerald-400');

      expect(dot3.getAttribute('data-state')).toBe('active');
      expect(dot3.className).toContain('border-emerald-400');
      expect(dot3.className).toContain('bg-transparent');

      expect(dot4.getAttribute('data-state')).toBe('upcoming');
      expect(dot4.className).toContain('bg-zinc-800');

      const allDots = [dot1, dot2, dot3, dot4];
      expect(allDots.filter((d) => d.getAttribute('data-state') === 'completed').length).toBe(2);
      expect(allDots.filter((d) => d.getAttribute('data-state') === 'active').length).toBe(1);
      expect(allDots.filter((d) => d.getAttribute('data-state') === 'upcoming').length).toBe(1);
    });

    it('1.4 Round 4 of 4 (CRITICAL ATTACK): NEVER 4 solid green dots while timer is in progress', () => {
      // This directly attacks the core failure reported in BUG-08 / BUG-33
      useTimerStore.setState({
        phase: 'pomodoro',
        status: 'running',
        currentRound: 4,
        remainingMs: (24 * 60 + 58) * 1000, // 24:58 in round 4
        settings: {
          ...useTimerStore.getState().settings,
          roundsBeforeLongBreak: 4,
        },
      });

      render(<MobileFocusView />);

      expect(screen.getByTestId('mobile-cycle-round-label').textContent).toBe('Hiệp 4/4');

      const dot1 = screen.getByTestId('mobile-cycle-dot-1');
      const dot2 = screen.getByTestId('mobile-cycle-dot-2');
      const dot3 = screen.getByTestId('mobile-cycle-dot-3');
      const dot4 = screen.getByTestId('mobile-cycle-dot-4');

      // Dots 1, 2, 3 must be completed
      expect(dot1.getAttribute('data-state')).toBe('completed');
      expect(dot2.getAttribute('data-state')).toBe('completed');
      expect(dot3.getAttribute('data-state')).toBe('completed');

      // Dot 4 must be ACTIVE, NOT completed!
      expect(dot4.getAttribute('data-state')).toBe('active');
      expect(dot4.className).toContain('border-emerald-400');
      expect(dot4.className).toContain('bg-transparent');
      expect(dot4.className).not.toContain('bg-emerald-400 shadow-');

      const allDots = [dot1, dot2, dot3, dot4];
      const completedDots = allDots.filter((d) => d.getAttribute('data-state') === 'completed');
      const activeDots = allDots.filter((d) => d.getAttribute('data-state') === 'active');
      const upcomingDots = allDots.filter((d) => d.getAttribute('data-state') === 'upcoming');

      // CRITICAL ASSERTION: exactly 3 completed, 1 active, 0 upcoming
      expect(completedDots.length).toBe(3);
      expect(activeDots.length).toBe(1);
      expect(upcomingDots.length).toBe(0);

      // CRITICAL NEGATIVE TEST: There must NEVER be 4 completed dots while timer is running!
      expect(completedDots.length).not.toBe(4);
    });

    it('1.5 Scalability: dynamically adjusts to custom cycle rounds (e.g. 2 rounds and 6 rounds)', () => {
      // Test 2 rounds cycle: Round 2 of 2
      useTimerStore.setState({
        phase: 'pomodoro',
        status: 'running',
        currentRound: 2,
        remainingMs: 10 * 60 * 1000,
        settings: {
          ...useTimerStore.getState().settings,
          roundsBeforeLongBreak: 2,
        },
      });

      const { unmount: unmount2 } = render(<MobileFocusView />);
      expect(screen.getByTestId('mobile-cycle-round-label').textContent).toBe('Hiệp 2/2');
      const dots2 = screen.getByTestId('mobile-cycle-dots').children;
      expect(dots2.length).toBe(2);
      expect(dots2[0].getAttribute('data-state')).toBe('completed');
      expect(dots2[1].getAttribute('data-state')).toBe('active');
      unmount2();

      // Test 6 rounds cycle: Round 3 of 6
      useTimerStore.setState({
        phase: 'pomodoro',
        status: 'running',
        currentRound: 3,
        remainingMs: 18 * 60 * 1000,
        settings: {
          ...useTimerStore.getState().settings,
          roundsBeforeLongBreak: 6,
        },
      });

      const { unmount: unmount6 } = render(<MobileFocusView />);
      expect(screen.getByTestId('mobile-cycle-round-label').textContent).toBe('Hiệp 3/6');
      const dots6 = screen.getByTestId('mobile-cycle-dots').children;
      expect(dots6.length).toBe(6);

      // Check all 6 dots
      expect(dots6[0].getAttribute('data-state')).toBe('completed');
      expect(dots6[1].getAttribute('data-state')).toBe('completed');
      expect(dots6[2].getAttribute('data-state')).toBe('active');
      expect(dots6[3].getAttribute('data-state')).toBe('upcoming');
      expect(dots6[4].getAttribute('data-state')).toBe('upcoming');
      expect(dots6[5].getAttribute('data-state')).toBe('upcoming');
      unmount6();
    });
  });

  // ===========================================================================
  // ATTACK VECTOR 2: Task Picker In-Place Quick Task Creation (BUG-09)
  // ===========================================================================
  describe('Attack Vector 2: Task Picker Quick Creation & Linkage (BUG-09)', () => {
    it('2.1 Empty Task List (0/0): Rejects empty or whitespace-only submissions and disables submit button', () => {
      useTaskStore.setState({ tasks: [] });

      render(<MobileFocusView />);

      // Open task picker
      fireEvent.click(screen.getByTestId('mobile-linked-task-chip'));

      const emptyContainer = screen.getByTestId('mobile-task-picker-empty');
      expect(emptyContainer).toBeDefined();

      const input = screen.getByTestId('mobile-quick-task-input') as HTMLInputElement;
      const submitBtn = screen.getByTestId('mobile-quick-task-submit-btn') as HTMLButtonElement;

      // Initial state: input is empty, submit button is disabled
      expect(input.value).toBe('');
      expect(submitBtn.disabled).toBe(true);

      // Try typing spaces only
      fireEvent.change(input, { target: { value: '    ' } });
      expect(submitBtn.disabled).toBe(true);

      // Try typing tabs and newlines
      fireEvent.change(input, { target: { value: ' \t \n ' } });
      expect(submitBtn.disabled).toBe(true);

      // Attempt to submit form via form submit event directly
      const form = input.closest('form');
      expect(form).not.toBeNull();
      fireEvent.submit(form!);

      // Assert no tasks were created in task store
      expect(useTaskStore.getState().tasks.length).toBe(0);

      // Assert timer remains unlinked
      expect(useTimerStore.getState().linkedTaskId).toBeNull();
      expect(useTimerStore.getState().linkedTaskTitle).toBeNull();

      // Assert task picker remains open
      expect(screen.getByTestId('mobile-task-picker-dropdown')).toBeDefined();
    });

    it('2.2 Empty Task List (0/0): Valid submission trims whitespace, creates task, links immediately to timer, and closes picker', async () => {
      useTaskStore.setState({ tasks: [] });

      render(<MobileFocusView />);

      // Open picker
      fireEvent.click(screen.getByTestId('mobile-linked-task-chip'));

      const input = screen.getByTestId('mobile-quick-task-input') as HTMLInputElement;
      const submitBtn = screen.getByTestId('mobile-quick-task-submit-btn') as HTMLButtonElement;

      // Type title with padding spaces
      const rawTitle = '   Giải đề thi thử Đại học 2026   ';
      const expectedTitle = 'Giải đề thi thử Đại học 2026';

      fireEvent.change(input, { target: { value: rawTitle } });
      expect(submitBtn.disabled).toBe(false);

      // Submit via form submit
      await act(async () => {
        fireEvent.click(submitBtn);
      });

      // 1. Task created in useTaskStore with trimmed title
      const tasks = useTaskStore.getState().tasks;
      expect(tasks.length).toBe(1);
      expect(tasks[0].title).toBe(expectedTitle);
      expect(tasks[0].status).toBe('todo');

      // 2. Timer store immediately linked to this new task
      const timerState = useTimerStore.getState();
      expect(timerState.linkedTaskId).toBe(tasks[0].id);
      expect(timerState.linkedTaskTitle).toBe(expectedTitle);

      // 3. Task picker is closed
      expect(screen.queryByTestId('mobile-task-picker-dropdown')).toBeNull();

      // 4. Linked task chip reflects new task
      const chip = screen.getByTestId('mobile-linked-task-chip');
      expect(chip.textContent).toContain(expectedTitle);
    });

    it('2.3 Populated Task List: Does NOT show empty state, allows selecting existing task or unlinking', async () => {
      const task1 = {
        id: 't-1',
        title: 'Ôn tập Vật Lý hạt nhân',
        status: 'todo' as const,
        priority: 'high' as const,
        estimatedPomodoros: 4,
        completedPomodoros: 2,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const task2 = {
        id: 't-2',
        title: 'Học từ vựng IELTS Writing',
        status: 'todo' as const,
        priority: 'medium' as const,
        estimatedPomodoros: 2,
        completedPomodoros: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      useTaskStore.setState({
        tasks: [task1, task2],
      });

      render(<MobileFocusView />);

      // Open picker
      fireEvent.click(screen.getByTestId('mobile-linked-task-chip'));

      // Empty container should NOT exist
      expect(screen.queryByTestId('mobile-task-picker-empty')).toBeNull();

      // Both tasks should be visible
      expect(screen.getByText('Ôn tập Vật Lý hạt nhân')).toBeDefined();
      expect(screen.getByText('Học từ vựng IELTS Writing')).toBeDefined();

      // Select task2
      fireEvent.click(screen.getByText('Học từ vựng IELTS Writing'));

      // Verify timer is linked to task2
      expect(useTimerStore.getState().linkedTaskId).toBe('t-2');
      expect(useTimerStore.getState().linkedTaskTitle).toBe('Học từ vựng IELTS Writing');
      expect(screen.queryByTestId('mobile-task-picker-dropdown')).toBeNull();

      // Re-open picker: Now unlinking option must be visible
      fireEvent.click(screen.getByTestId('mobile-linked-task-chip'));
      const unlinkBtn = screen.getByText('Hủy liên kết công việc');
      expect(unlinkBtn).toBeDefined();

      // Click unlink
      fireEvent.click(unlinkBtn);

      // Verify timer is unlinked
      expect(useTimerStore.getState().linkedTaskId).toBeNull();
      expect(useTimerStore.getState().linkedTaskTitle).toBeNull();
      expect(screen.queryByTestId('mobile-task-picker-dropdown')).toBeNull();
    });

    it('2.4 Populated Task List: Secondary quick add creates and links task while preserving existing tasks', async () => {
      const existingTask = {
        id: 't-existing',
        title: 'Nhiệm vụ cũ',
        status: 'todo' as const,
        priority: 'medium' as const,
        estimatedPomodoros: 1,
        completedPomodoros: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      useTaskStore.setState({ tasks: [existingTask] });

      render(<MobileFocusView />);

      // Open picker
      fireEvent.click(screen.getByTestId('mobile-linked-task-chip'));

      const secondaryInput = screen.getByTestId('mobile-quick-task-input-existing');
      const secondarySubmit = screen.getByTestId('mobile-quick-task-submit-existing-btn') as HTMLButtonElement;

      // Empty input disables secondary button
      expect(secondarySubmit.disabled).toBe(true);

      fireEvent.change(secondaryInput, { target: { value: 'Nhiệm vụ tạo thêm' } });
      expect(secondarySubmit.disabled).toBe(false);

      await act(async () => {
        fireEvent.click(secondarySubmit);
      });

      // Task store now has 2 tasks
      const allTasks = useTaskStore.getState().tasks;
      expect(allTasks.length).toBe(2);
      expect(allTasks.some((t) => t.title === 'Nhiệm vụ tạo thêm')).toBe(true);

      // Timer linked to the new task
      const timerState = useTimerStore.getState();
      expect(timerState.linkedTaskTitle).toBe('Nhiệm vụ tạo thêm');

      // Picker is closed
      expect(screen.queryByTestId('mobile-task-picker-dropdown')).toBeNull();
    });
  });
});
