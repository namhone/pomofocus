import 'fake-indexeddb/auto';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MobileFocusView } from '../../src/components/mobile/views/MobileFocusView';
import { MobileAppShell } from '../../src/components/mobile/MobileAppShell';
import { useTimerStore } from '../../src/stores/useTimerStore';
import { useTaskStore } from '../../src/stores/useTaskStore';
import { useLayoutStore } from '../../src/stores/useLayoutStore';
import { useAudioStore } from '../../src/stores/useAudioStore';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useAiStore } from '../../src/stores/useAiStore';
import { useBackgroundStore } from '../../src/stores/useBackgroundStore';
import { db } from '../../src/db';
import { Task } from '../../src/types/tasks';

describe('V8.1 Milestone 2 — Empirical Challenger Adversarial Stress Suite', () => {
  beforeEach(async () => {
    vi.useRealTimers();
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
      dailyProgress: 0,
      todayFocusMinutes: 0,
    });

    // Reset useLayoutStore
    useLayoutStore.setState({
      activeMobileTab: 'focus' as any,
      isEcoMode: false,
    });

    // Reset useTaskStore
    useTaskStore.setState({
      tasks: [],
      activeTaskId: null,
    });

    // Reset useAuthStore
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoggedIn: false,
      hasVipAccess: false,
      isPro: false,
      role: 'guest',
      planLabel: 'Khách',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // SECTION 1: POCKET LOCK 🔒 STRESS TESTING & BOUNDARY CONDITIONS
  // ===========================================================================
  describe('1. Pocket Lock 🔒 Stress Testing & Boundary Conditions', () => {
    it('1.1 Boundary Test: Premature releases at 500ms, 1000ms, 1400ms, 1490ms must abort unlocking', () => {
      vi.useFakeTimers();
      render(<MobileFocusView />);

      // Engage pocket lock
      fireEvent.click(screen.getByTestId('mobile-pocket-lock-btn'));
      expect(screen.getByTestId('mobile-pocket-lock-overlay')).toBeDefined();

      const unlockPad = screen.getByTestId('mobile-pocket-unlock-pad');

      const prematureHoldTimes = [500, 1000, 1400, 1490];
      for (const holdTime of prematureHoldTimes) {
        fireEvent.pointerDown(unlockPad);
        act(() => {
          vi.advanceTimersByTime(holdTime);
        });
        fireEvent.pointerUp(unlockPad);

        // Overlay MUST remain present
        expect(screen.getByTestId('mobile-pocket-lock-overlay')).toBeDefined();
      }

      vi.useRealTimers();
    });

    it('1.2 Boundary Test: Sustained hold >= 1500ms unlocks cleanly and triggers haptics', () => {
      const vibrateSpy = vi.fn();
      Object.defineProperty(navigator, 'vibrate', {
        value: vibrateSpy,
        writable: true,
        configurable: true,
      });

      vi.useFakeTimers();
      render(<MobileFocusView />);

      fireEvent.click(screen.getByTestId('mobile-pocket-lock-btn'));
      expect(screen.getByTestId('mobile-pocket-lock-overlay')).toBeDefined();

      const unlockPad = screen.getByTestId('mobile-pocket-unlock-pad');

      fireEvent.pointerDown(unlockPad);
      act(() => {
        vi.advanceTimersByTime(1525);
      });

      // Overlay must be dismissed cleanly
      expect(screen.queryByTestId('mobile-pocket-lock-overlay')).toBeNull();
      // Unlock haptic pattern [20, 40, 20] must have been called
      expect(vibrateSpy).toHaveBeenCalledWith([20, 40, 20]);

      vi.useRealTimers();
    });

    it('1.3 Interruption Test: pointerleave and pointercancel abort unlock process', () => {
      vi.useFakeTimers();
      render(<MobileFocusView />);

      fireEvent.click(screen.getByTestId('mobile-pocket-lock-btn'));
      const unlockPad = screen.getByTestId('mobile-pocket-unlock-pad');

      // Test pointerleave at 1200ms
      fireEvent.pointerDown(unlockPad);
      act(() => {
        vi.advanceTimersByTime(1200);
      });
      fireEvent.pointerLeave(unlockPad);

      expect(screen.getByTestId('mobile-pocket-lock-overlay')).toBeDefined();

      // Test pointercancel at 1200ms
      fireEvent.pointerDown(unlockPad);
      act(() => {
        vi.advanceTimersByTime(1200);
      });
      fireEvent.pointerCancel(unlockPad);

      expect(screen.getByTestId('mobile-pocket-lock-overlay')).toBeDefined();

      vi.useRealTimers();
    });

    it('1.4 Touch Interception Test: Underlying timer controls and phase buttons cannot receive events through overlay', () => {
      render(<MobileFocusView />);

      // Engage pocket lock
      fireEvent.click(screen.getByTestId('mobile-pocket-lock-btn'));
      const overlay = screen.getByTestId('mobile-pocket-lock-overlay');
      expect(overlay).toBeDefined();

      // Overlay has fixed inset-0 z-[70] and stops event propagation
      const stopPropSpyDown = vi.fn();
      const stopPropSpyClick = vi.fn();

      fireEvent.pointerDown(overlay, { stopPropagation: stopPropSpyDown });
      fireEvent.click(overlay, { stopPropagation: stopPropSpyClick });

      // Verify timer state cannot be altered while overlay is active
      expect(useTimerStore.getState().status).toBe('idle');
      expect(useTimerStore.getState().phase).toBe('pomodoro');
    });
  });

  // ===========================================================================
  // SECTION 2: HOLD TO START (800ms) ADVERSARIAL & BOUNDARY TESTS
  // ===========================================================================
  describe('2. Hold to Start (800ms) Boundary & Timing Tests', () => {
    it('2.1 Boundary Test: Hold released at 400ms (held > 300ms and < 800ms) MUST abort start without starting timer', () => {
      vi.useFakeTimers();
      render(<MobileFocusView />);
      const mainBtn = screen.getByTestId('mobile-timer-main-action');

      expect(useTimerStore.getState().status).toBe('idle');

      // Hold for 400ms
      fireEvent.pointerDown(mainBtn);
      act(() => {
        vi.advanceTimersByTime(400);
      });
      fireEvent.pointerUp(mainBtn);

      // Verify timer did NOT start
      expect(useTimerStore.getState().status).toBe('idle');

      vi.useRealTimers();
    });

    it('2.2 Tap Test: Accessible tap < 300ms toggles timer state (idle -> running -> paused)', () => {
      render(<MobileFocusView />);
      const mainBtn = screen.getByTestId('mobile-timer-main-action');

      expect(useTimerStore.getState().status).toBe('idle');

      // First tap (<300ms) to start
      fireEvent.click(mainBtn);
      expect(useTimerStore.getState().status).toBe('running');

      // Second tap to pause
      fireEvent.click(mainBtn);
      expect(useTimerStore.getState().status).toBe('paused');

      // Third tap to resume
      fireEvent.click(mainBtn);
      expect(useTimerStore.getState().status).toBe('running');
    });

    it('2.3 Sustained Hold Test: Hold >= 800ms triggers timer start and escalating haptic pattern [10, 20, 35, 50]', () => {
      const vibrateSpy = vi.fn();
      Object.defineProperty(navigator, 'vibrate', {
        value: vibrateSpy,
        writable: true,
        configurable: true,
      });

      vi.useFakeTimers();
      render(<MobileFocusView />);
      const mainBtn = screen.getByTestId('mobile-timer-main-action');

      expect(useTimerStore.getState().status).toBe('idle');

      fireEvent.pointerDown(mainBtn);

      // Advance to 220ms -> haptic 10
      act(() => {
        vi.advanceTimersByTime(220);
      });
      expect(vibrateSpy).toHaveBeenCalledWith(10);

      // Advance to 420ms -> haptic 20
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(vibrateSpy).toHaveBeenCalledWith(20);

      // Advance to 620ms -> haptic 35
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(vibrateSpy).toHaveBeenCalledWith(35);

      // Advance to 820ms -> haptic 50 and timer started
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(vibrateSpy).toHaveBeenCalledWith(50);
      expect(useTimerStore.getState().status).toBe('running');

      // Release after completed hold
      fireEvent.pointerUp(mainBtn);
      fireEvent.click(mainBtn);

      // Should still be running (not accidentally paused by click)
      expect(useTimerStore.getState().status).toBe('running');

      vi.useRealTimers();
    });

    it('2.4 Browser Event Sequence Simulation: Hold between 300ms and 799ms does not start timer even if browser fires click', () => {
      vi.useFakeTimers();
      render(<MobileFocusView />);
      const mainBtn = screen.getByTestId('mobile-timer-main-action');

      expect(useTimerStore.getState().status).toBe('idle');

      // Press down
      fireEvent.pointerDown(mainBtn);
      act(() => {
        vi.advanceTimersByTime(400); // 400ms hold: user started hold then changed their mind
      });
      fireEvent.pointerUp(mainBtn);

      // In real browsers, pointerUp is immediately followed by a click event:
      fireEvent.click(mainBtn);

      // Status must remain idle even after click!
      expect(useTimerStore.getState().status).toBe('idle');

      vi.useRealTimers();
    });

    it('2.5 Realistic Pointer Tap Sequence (<300ms): pointerdown -> 50ms -> pointerup -> click should leave timer in running state', () => {
      vi.useFakeTimers();
      render(<MobileFocusView />);
      const mainBtn = screen.getByTestId('mobile-timer-main-action');

      expect(useTimerStore.getState().status).toBe('idle');

      fireEvent.pointerDown(mainBtn);
      act(() => {
        vi.advanceTimersByTime(50);
      });
      fireEvent.pointerUp(mainBtn);
      fireEvent.click(mainBtn);

      expect(useTimerStore.getState().status).toBe('running');
      vi.useRealTimers();
    });

    it('2.6 Browser Event Sequence Simulation for Sustained Hold: pointerdown -> 850ms -> pointerup -> click should leave timer in running state', () => {
      vi.useFakeTimers();
      render(<MobileFocusView />);
      const mainBtn = screen.getByTestId('mobile-timer-main-action');

      expect(useTimerStore.getState().status).toBe('idle');

      fireEvent.pointerDown(mainBtn);
      act(() => {
        vi.advanceTimersByTime(850);
      });
      expect(useTimerStore.getState().status).toBe('running');

      fireEvent.pointerUp(mainBtn);
      fireEvent.click(mainBtn);

      expect(useTimerStore.getState().status).toBe('running');
      vi.useRealTimers();
    });
  });

  // ===========================================================================
  // SECTION 3: TASK PRIORITY REORDERING STRESS & CLAMPING TESTS
  // ===========================================================================
  describe('3. Task Priority Reordering Stress & Clamping Tests', () => {
    const makeTask = (id: string, title: string, orderIndex: number): Task => ({
      id,
      title,
      status: 'todo',
      priority: 'p1',
      estimatedPomodoros: 2,
      completedPomodoros: 0,
      repeat: 'none',
      orderIndex,
      order: orderIndex,
      tagIds: [],
      createdAt: 1000 + orderIndex * 100,
      updatedAt: 1000 + orderIndex * 100,
    });

    it('3.1 Clamping Test: Moving top item (index 0) UP must be safely clamped without corruption or error', async () => {
      const task0 = makeTask('t0', 'Top Task 0', 0);
      const task1 = makeTask('t1', 'Middle Task 1', 1);
      const task2 = makeTask('t2', 'Bottom Task 2', 2);

      await db.tasks.bulkAdd([task0, task1, task2]);
      useTaskStore.setState({ tasks: [task0, task1, task2] });

      // Attempt to move top task UP
      await act(async () => {
        await useTaskStore.getState().reorderTask('t0', 'UP');
      });

      const currentTasks = useTaskStore.getState().tasks;
      expect(currentTasks).toHaveLength(3);
      expect(currentTasks[0].id).toBe('t0');
      expect(currentTasks[1].id).toBe('t1');
      expect(currentTasks[2].id).toBe('t2');

      // Verify IndexedDB remains uncorrupted
      const dbTask0 = await db.tasks.get('t0');
      const dbTask1 = await db.tasks.get('t1');
      const dbTask2 = await db.tasks.get('t2');
      expect(dbTask0?.orderIndex).toBe(0);
      expect(dbTask1?.orderIndex).toBe(1);
      expect(dbTask2?.orderIndex).toBe(2);
    });

    it('3.2 Clamping Test: Moving bottom item (index N-1) DOWN must be safely clamped without corruption or error', async () => {
      const task0 = makeTask('t0', 'Top Task 0', 0);
      const task1 = makeTask('t1', 'Middle Task 1', 1);
      const task2 = makeTask('t2', 'Bottom Task 2', 2);

      await db.tasks.bulkAdd([task0, task1, task2]);
      useTaskStore.setState({ tasks: [task0, task1, task2] });

      // Attempt to move bottom task DOWN
      await act(async () => {
        await useTaskStore.getState().reorderTask('t2', 'DOWN');
      });

      const currentTasks = useTaskStore.getState().tasks;
      expect(currentTasks).toHaveLength(3);
      expect(currentTasks[0].id).toBe('t0');
      expect(currentTasks[1].id).toBe('t1');
      expect(currentTasks[2].id).toBe('t2');

      // Verify IndexedDB remains uncorrupted
      const dbTask0 = await db.tasks.get('t0');
      const dbTask1 = await db.tasks.get('t1');
      const dbTask2 = await db.tasks.get('t2');
      expect(dbTask0?.orderIndex).toBe(0);
      expect(dbTask1?.orderIndex).toBe(1);
      expect(dbTask2?.orderIndex).toBe(2);
    });

    it('3.3 Boundary Test: Reordering in empty list, single item list, or non-existent task ID does not crash', async () => {
      // Empty list
      useTaskStore.setState({ tasks: [] });
      await expect(useTaskStore.getState().reorderTask('t_missing', 'UP')).resolves.toBeUndefined();
      await expect(useTaskStore.getState().reorderTask('t_missing', 'DOWN')).resolves.toBeUndefined();

      // Single item list
      const solo = makeTask('solo', 'Solo Task', 0);
      await db.tasks.add(solo);
      useTaskStore.setState({ tasks: [solo] });
      await expect(useTaskStore.getState().reorderTask('solo', 'UP')).resolves.toBeUndefined();
      await expect(useTaskStore.getState().reorderTask('solo', 'DOWN')).resolves.toBeUndefined();

      // Non-existent ID in multi-task list
      const taskA = makeTask('ta', 'Task A', 0);
      const taskB = makeTask('tb', 'Task B', 1);
      useTaskStore.setState({ tasks: [taskA, taskB] });
      await expect(useTaskStore.getState().reorderTask('ghost_id', 'UP')).resolves.toBeUndefined();
      expect(useTaskStore.getState().tasks[0].id).toBe('ta');
      expect(useTaskStore.getState().tasks[1].id).toBe('tb');
    });

    it('3.4 Mutation Test: Valid reordering triggers IndexedDB mutation and swaps order indexes', async () => {
      const taskA = makeTask('task_alpha', 'Alpha Task', 0);
      const taskB = makeTask('task_beta', 'Beta Task', 1);

      await db.tasks.bulkAdd([taskA, taskB]);
      useTaskStore.setState({ tasks: [taskA, taskB] });

      const updateSpy = vi.spyOn(db.tasks, 'update');

      // Move task_beta UP
      await act(async () => {
        await useTaskStore.getState().reorderTask('task_beta', 'UP');
      });

      // Verify db.tasks.update was called for both tasks
      expect(updateSpy).toHaveBeenCalledWith('task_beta', expect.objectContaining({ orderIndex: 0 }));
      expect(updateSpy).toHaveBeenCalledWith('task_alpha', expect.objectContaining({ orderIndex: 1 }));

      // Verify store state
      const tasksInStore = useTaskStore.getState().tasks;
      expect(tasksInStore[0].id).toBe('task_beta');
      expect(tasksInStore[1].id).toBe('task_alpha');

      // Verify Dexie persisted state
      const dbBeta = await db.tasks.get('task_beta');
      const dbAlpha = await db.tasks.get('task_alpha');
      expect(dbBeta?.orderIndex).toBe(0);
      expect(dbAlpha?.orderIndex).toBe(1);
    });

    it('3.5 Data Integrity Test: Reordering preserves task metadata (pomodoros, priority, title)', async () => {
      const complexTask1: Task = {
        id: 'c1',
        title: 'Deep Architecture Analysis',
        status: 'todo',
        priority: 'p1',
        estimatedPomodoros: 6,
        completedPomodoros: 2,
        repeat: 'daily',
        orderIndex: 0,
        order: 0,
        tagIds: ['tag_arch', 'tag_v81'],
        createdAt: 1000,
        updatedAt: 1000,
      };

      const complexTask2: Task = {
        id: 'c2',
        title: 'Security Boundary Threat Modeling',
        status: 'todo',
        priority: 'p2',
        estimatedPomodoros: 4,
        completedPomodoros: 1,
        repeat: 'weekly',
        orderIndex: 1,
        order: 1,
        tagIds: ['tag_sec'],
        createdAt: 2000,
        updatedAt: 2000,
      };

      await db.tasks.bulkAdd([complexTask1, complexTask2]);
      useTaskStore.setState({ tasks: [complexTask1, complexTask2] });

      await act(async () => {
        await useTaskStore.getState().reorderTask('c1', 'DOWN');
      });

      const dbC1 = await db.tasks.get('c1');
      expect(dbC1?.title).toBe('Deep Architecture Analysis');
      expect(dbC1?.estimatedPomodoros).toBe(6);
      expect(dbC1?.completedPomodoros).toBe(2);
      expect(dbC1?.priority).toBe('p1');
      expect(dbC1?.repeat).toBe('daily');
      expect(dbC1?.tagIds).toEqual(['tag_arch', 'tag_v81']);
      expect(dbC1?.orderIndex).toBe(1);
    });
  });
});
