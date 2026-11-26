import 'fake-indexeddb/auto';
import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TasksWidget } from '../../src/components/TasksWidget';
import { MobileFocusView } from '../../src/components/mobile/views/MobileFocusView';
import { useTaskStore } from '../../src/stores/useTaskStore';
import { useTimerStore } from '../../src/stores/useTimerStore';
import { useLayoutStore } from '../../src/stores/useLayoutStore';
import { useAudioStore } from '../../src/stores/useAudioStore';
import { useAiStore } from '../../src/stores/useAiStore';
import { db } from '../../src/db';
import { Task } from '../../src/types/tasks';

describe('M2 Dedicated Empirical Adversarial Stress Suite — Focus & Tasks', () => {
  beforeEach(async () => {
    vi.useRealTimers();
    localStorage.clear();
    sessionStorage.clear();

    try {
      await db.tasks.clear();
      await db.projects.clear();
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

    // Reset useTaskStore
    useTaskStore.setState({
      tasks: [],
      activeTaskId: null,
      projects: [],
      selectedProjectId: null,
      statusFilter: 'all',
    });

    useLayoutStore.setState({
      activeMobileTab: 'focus' as any,
      isEcoMode: false,
    });

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

    useAiStore.setState({
      aiCreditsBalance: 50,
      isTopupModalOpen: false,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  // =========================================================================
  // 1. Task Inline Title Editing, Stepper Boundaries & Blur Auto-Save
  // =========================================================================
  describe('1. Task Inline Title Editing, Stepper Boundaries & Blur Auto-Save', () => {
    it('1.1 Double-clicking task title opens input, edits title and auto-saves on blur', async () => {
      const task = await useTaskStore.getState().createTask({
        title: 'Bản thảo ban đầu',
        estimatedPomodoros: 2,
      });

      render(<TasksWidget />);

      const titleEl = await screen.findByTestId(`task-title-${task.id}`);
      expect(titleEl.textContent).toBe('Bản thảo ban đầu');

      // Double-click to trigger inline edit
      fireEvent.doubleClick(titleEl);

      const inputEl = screen.getByTestId(`input-edit-task-${task.id}`) as HTMLInputElement;
      expect(inputEl).toBeDefined();
      expect(inputEl.value).toBe('Bản thảo ban đầu');

      // Type new title and trigger BLUR (without pressing Enter)
      fireEvent.change(inputEl, { target: { value: 'Bản thảo đã hoàn thiện sau sửa đổi' } });
      fireEvent.blur(inputEl);

      // Verify input is unmounted and updated title is displayed
      await waitFor(() => {
        expect(screen.queryByTestId(`input-edit-task-${task.id}`)).toBeNull();
      });

      const updatedTitleEl = screen.getByTestId(`task-title-${task.id}`);
      expect(updatedTitleEl.textContent).toBe('Bản thảo đã hoàn thiện sau sửa đổi');

      // Verify Zustand store and IndexedDB persistence
      const storeTask = useTaskStore.getState().tasks.find((t) => t.id === task.id);
      expect(storeTask?.title).toBe('Bản thảo đã hoàn thiện sau sửa đổi');

      const dbTask = await db.tasks.get(task.id);
      expect(dbTask?.title).toBe('Bản thảo đã hoàn thiện sau sửa đổi');
    });

    it('1.2 Auto-trims leading and trailing whitespace on blur auto-save', async () => {
      const task = await useTaskStore.getState().createTask({
        title: 'Công việc cần dọn dẹp',
      });

      render(<TasksWidget />);

      const titleEl = await screen.findByTestId(`task-title-${task.id}`);
      fireEvent.doubleClick(titleEl);

      const inputEl = screen.getByTestId(`input-edit-task-${task.id}`) as HTMLInputElement;
      fireEvent.change(inputEl, { target: { value: '   Tiêu đề có nhiều khoảng trắng thừa    ' } });
      fireEvent.blur(inputEl);

      await waitFor(() => {
        expect(screen.queryByTestId(`input-edit-task-${task.id}`)).toBeNull();
      });

      const updatedTitleEl = screen.getByTestId(`task-title-${task.id}`);
      expect(updatedTitleEl.textContent).toBe('Tiêu đề có nhiều khoảng trắng thừa');

      const storeTask = useTaskStore.getState().tasks.find((t) => t.id === task.id);
      expect(storeTask?.title).toBe('Tiêu đề có nhiều khoảng trắng thừa');
    });

    it('1.3 Preserves original title when blurred with empty or whitespace-only string', async () => {
      const task = await useTaskStore.getState().createTask({
        title: 'Tên gốc không được mất',
      });

      render(<TasksWidget />);

      const titleEl = await screen.findByTestId(`task-title-${task.id}`);
      fireEvent.doubleClick(titleEl);

      const inputEl = screen.getByTestId(`input-edit-task-${task.id}`) as HTMLInputElement;
      fireEvent.change(inputEl, { target: { value: '      ' } });
      fireEvent.blur(inputEl);

      await waitFor(() => {
        expect(screen.queryByTestId(`input-edit-task-${task.id}`)).toBeNull();
      });

      // Original title remains intact
      const updatedTitleEl = screen.getByTestId(`task-title-${task.id}`);
      expect(updatedTitleEl.textContent).toBe('Tên gốc không được mất');

      const storeTask = useTaskStore.getState().tasks.find((t) => t.id === task.id);
      expect(storeTask?.title).toBe('Tên gốc không được mất');
    });

    it('1.4 Enforces Pomodoro stepper boundaries: lower bound at 1 (cannot be 0 or negative)', async () => {
      const task = await useTaskStore.getState().createTask({
        title: 'Kiểm tra cận dưới',
        estimatedPomodoros: 2,
      });

      render(<TasksWidget />);

      const titleEl = await screen.findByTestId(`task-title-${task.id}`);
      fireEvent.doubleClick(titleEl);

      // In edit mode: find minus button
      const minusButtons = screen.getAllByRole('button', { name: '-' });
      const minusBtn = minusButtons[minusButtons.length - 1];
      expect(minusBtn).toBeDefined();

      // Click minus once: 2 -> 1
      fireEvent.click(minusBtn);
      expect(screen.getByText(/^1$/)).toBeDefined();

      // Click minus multiple times: should remain strictly clamped at 1
      fireEvent.click(minusBtn);
      fireEvent.click(minusBtn);
      fireEvent.click(minusBtn);
      expect(screen.getByText(/^1$/)).toBeDefined();

      // Save via Save button
      const saveBtn = screen.getByRole('button', { name: 'Lưu' });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(screen.queryByTestId(`input-edit-task-${task.id}`)).toBeNull();
      });

      const storeTask = useTaskStore.getState().tasks.find((t) => t.id === task.id);
      expect(storeTask?.estimatedPomodoros).toBe(1);
    });

    it('1.5 Enforces Pomodoro stepper boundaries: upper bound at 20 (cannot be 21 or higher)', async () => {
      const task = await useTaskStore.getState().createTask({
        title: 'Kiểm tra cận trên',
        estimatedPomodoros: 19,
      });

      render(<TasksWidget />);

      const titleEl = await screen.findByTestId(`task-title-${task.id}`);
      fireEvent.doubleClick(titleEl);

      const plusButtons = screen.getAllByRole('button', { name: '+' });
      const plusBtn = plusButtons[plusButtons.length - 1];
      expect(plusBtn).toBeDefined();

      // Click plus once: 19 -> 20
      fireEvent.click(plusBtn);
      expect(screen.getByText(/^20$/)).toBeDefined();

      // Click plus 10 more times: must remain strictly clamped at 20 (never 21)
      for (let i = 0; i < 10; i++) {
        fireEvent.click(plusBtn);
      }
      expect(screen.getByText(/^20$/)).toBeDefined();

      // Save via Save button
      const saveBtn = screen.getByRole('button', { name: 'Lưu' });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(screen.queryByTestId(`input-edit-task-${task.id}`)).toBeNull();
      });

      const storeTask = useTaskStore.getState().tasks.find((t) => t.id === task.id);
      expect(storeTask?.estimatedPomodoros).toBe(20);
    });

    it('1.6 Composer Stepper clamping: verifies input-estimated-pomodoros bounds in task creation form', async () => {
      render(<TasksWidget />);

      const estInput = screen.getByTestId('input-estimated-pomodoros') as HTMLInputElement;
      expect(estInput).toBeDefined();
      expect(estInput.getAttribute('min')).toBe('1');
      expect(estInput.getAttribute('max')).toBe('20');
      expect(estInput.getAttribute('inputMode')).toBe('numeric');

      // Click minus button at value 2 -> goes to 1
      const minusBtn = screen.getByTitle('Giảm 1 phiên');
      fireEvent.click(minusBtn);
      expect(estInput.value).toBe('1');

      // Clicking minus at 1 remains 1
      fireEvent.click(minusBtn);
      expect(estInput.value).toBe('1');

      // Click plus button up to 20
      const plusBtn = screen.getByTitle('Tăng 1 phiên');
      for (let i = 1; i <= 25; i++) {
        fireEvent.click(plusBtn);
      }
      expect(estInput.value).toBe('20');
    });
  });

  // =========================================================================
  // 2. Clear Completed Tasks, 6s Snackbar Countdown & Undo Restoration
  // =========================================================================
  describe('2. Clear Completed Tasks, 6s Snackbar Countdown & Undo Restoration', () => {
    it('2.1 Instantly clears completed tasks and displays 6s Undo snackbar', async () => {
      // Create 2 completed and 1 uncompleted task
      const t1 = await useTaskStore.getState().createTask({ title: 'Task Hoàn thành A' });
      const t2 = await useTaskStore.getState().createTask({ title: 'Task Hoàn thành B' });
      const t3 = await useTaskStore.getState().createTask({ title: 'Task Chưa Xong C' });

      await useTaskStore.getState().toggleTaskComplete(t1.id);
      await useTaskStore.getState().toggleTaskComplete(t2.id);

      render(<TasksWidget />);

      const clearBtn = await screen.findByTestId('clear-completed-btn');
      expect(clearBtn).toBeDefined();

      // Click clear completed
      await act(async () => {
        fireEvent.click(clearBtn);
        await Promise.resolve();
        await Promise.resolve();
      });

      // Verify completed tasks are removed from the active list
      await waitFor(() => {
        expect(screen.queryByTestId(`task-item-${t1.id}`)).toBeNull();
        expect(screen.queryByTestId(`task-item-${t2.id}`)).toBeNull();
      });

      // Active task remains visible
      expect(screen.getByTestId(`task-item-${t3.id}`)).toBeDefined();

      // Undo snackbar appears with count
      const snackbar = screen.getByTestId('tasks-undo-snackbar');
      expect(snackbar).toBeDefined();
      expect(snackbar.textContent).toContain('Đã dọn 2 việc hoàn thành');
      expect(screen.getByTestId('undo-clear-completed-btn')).toBeDefined();
    });

    it('2.2 6s snackbar countdown: snackbar remains visible during 5.9s, auto-dismisses at 6.0s', async () => {
      const t1 = await useTaskStore.getState().createTask({ title: 'Task Xong 1' });
      await useTaskStore.getState().toggleTaskComplete(t1.id);

      render(<TasksWidget />);

      const clearBtn = await screen.findByTestId('clear-completed-btn');

      vi.useFakeTimers();

      await act(async () => {
        fireEvent.click(clearBtn);
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(screen.getByTestId('tasks-undo-snackbar')).toBeDefined();

      // Advance by 5900ms (< 6000ms): snackbar must remain visible
      act(() => {
        vi.advanceTimersByTime(5900);
      });
      expect(screen.getByTestId('tasks-undo-snackbar')).toBeDefined();

      // Advance by remaining 200ms (total 6100ms >= 6000ms): snackbar auto-dismisses
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(screen.queryByTestId('tasks-undo-snackbar')).toBeNull();

      vi.useRealTimers();
    });

    it('2.3 Clicking Undo restores all cleared tasks with their original titles and parameters', async () => {
      const t1 = await useTaskStore.getState().createTask({
        title: 'Nhiệm vụ phục hồi A',
        priority: 'p1',
        estimatedPomodoros: 4,
      });
      const t2 = await useTaskStore.getState().createTask({
        title: 'Nhiệm vụ phục hồi B',
        priority: 'p3',
        estimatedPomodoros: 2,
      });

      await useTaskStore.getState().toggleTaskComplete(t1.id);
      await useTaskStore.getState().toggleTaskComplete(t2.id);

      render(<TasksWidget />);

      const clearBtn = await screen.findByTestId('clear-completed-btn');
      await act(async () => {
        fireEvent.click(clearBtn);
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(screen.getByTestId('tasks-undo-snackbar')).toBeDefined();

      // Click Undo button within the 6s window
      const undoBtn = screen.getByTestId('undo-clear-completed-btn');
      await act(async () => {
        fireEvent.click(undoBtn);
      });

      // Snackbar dismisses immediately upon undo
      expect(screen.queryByTestId('tasks-undo-snackbar')).toBeNull();

      // Tasks are restored in useTaskStore
      const tasksInStore = useTaskStore.getState().tasks;
      expect(tasksInStore.some((t) => t.title === 'Nhiệm vụ phục hồi A' && t.priority === 'p1')).toBe(true);
      expect(tasksInStore.some((t) => t.title === 'Nhiệm vụ phục hồi B' && t.priority === 'p3')).toBe(true);
    });
  });

  // =========================================================================
  // 3. Auto-Switching Filter Away from 'completed' When Adding a Task
  // =========================================================================
  describe('3. Auto-Switching Filter Away from completed When Adding a Task', () => {
    it('3.1 Automatically switches filter from completed to all upon creating a new task', async () => {
      // Seed one completed task so the completed filter shows it
      const completedTask = await useTaskStore.getState().createTask({ title: 'Task Đã Xong Trước Đó' });
      await useTaskStore.getState().toggleTaskComplete(completedTask.id);

      render(<TasksWidget />);

      // Switch filter to 'completed'
      const filterCompletedBtn = screen.getByTestId('filter-status-completed');
      act(() => {
        fireEvent.click(filterCompletedBtn);
      });

      expect(useTaskStore.getState().statusFilter).toBe('completed');

      // Add a new task while viewing 'completed' filter
      const inputNewTask = screen.getByTestId('input-new-task');
      act(() => {
        fireEvent.change(inputNewTask, { target: { value: 'Task Mới Thêm Trong Tab Đã Xong' } });
      });

      const addBtn = screen.getByTestId('add-task-btn');
      await act(async () => {
        fireEvent.click(addBtn);
      });

      // Invariant: statusFilter must automatically switch to 'all' so new task is immediately visible
      await waitFor(() => {
        expect(useTaskStore.getState().statusFilter).toBe('all');
      });

      // Newly added task must be rendered in the DOM
      await waitFor(() => {
        expect(screen.getByText('Task Mới Thêm Trong Tab Đã Xong')).toBeDefined();
      });
    });

    it('3.2 Adding a task while filter is todo retains todo filter without resetting', async () => {
      render(<TasksWidget />);

      // Switch to 'todo'
      const filterTodoBtn = screen.getByTestId('filter-status-todo');
      act(() => {
        fireEvent.click(filterTodoBtn);
      });
      expect(useTaskStore.getState().statusFilter).toBe('todo');

      const inputNewTask = screen.getByTestId('input-new-task');
      fireEvent.change(inputNewTask, { target: { value: 'Task Cần Làm Bình Thường' } });

      const addBtn = screen.getByTestId('add-task-btn');
      await act(async () => {
        fireEvent.click(addBtn);
      });

      // Filter remains 'todo' because new tasks are active todo tasks
      expect(useTaskStore.getState().statusFilter).toBe('todo');
      await waitFor(() => {
        expect(screen.getByText('Task Cần Làm Bình Thường')).toBeDefined();
      });
    });
  });

  // =========================================================================
  // 4. Reset Button Press-and-Hold 1.5s vs Short Tap (<1.5s does not reset cycle)
  // =========================================================================
  describe('4. Reset Button Press-and-Hold 1.5s vs Short Tap', () => {
    it('4.1 Short tap (< 1.5s) resets current round time to full duration, but DOES NOT reset cycle', async () => {
      vi.useFakeTimers();

      // Configure round 3 of 4
      useTimerStore.setState({
        status: 'running',
        phase: 'pomodoro',
        currentRound: 3,
        remainingMs: 8 * 60 * 1000, // 8 minutes remaining
        settings: {
          ...useTimerStore.getState().settings,
          pomodoroMinutes: 25,
          roundsBeforeLongBreak: 4,
        },
      });

      render(<MobileFocusView />);

      const resetBtn = screen.getByTestId('mobile-timer-reset');

      // Press down on reset button
      fireEvent.pointerDown(resetBtn);

      // Advance 500ms (< 1500ms threshold)
      act(() => {
        vi.advanceTimersByTime(500);
      });

      // Release button and fire click
      fireEvent.pointerUp(resetBtn);
      fireEvent.click(resetBtn);

      // Invariant: currentRound must NOT be reset to 1; it remains 3
      expect(useTimerStore.getState().currentRound).toBe(3);

      // Status goes to idle and remainingMs resets to 25:00 for the current round
      expect(useTimerStore.getState().status).toBe('idle');
      expect(useTimerStore.getState().remainingMs).toBe(25 * 60 * 1000);

      vi.useRealTimers();
    });

    it('4.2 Pointer leave/cancel before 1.5s aborts cycle reset and retains current round', async () => {
      vi.useFakeTimers();

      useTimerStore.setState({
        status: 'running',
        phase: 'pomodoro',
        currentRound: 4,
        remainingMs: 12 * 60 * 1000,
        settings: {
          ...useTimerStore.getState().settings,
          pomodoroMinutes: 25,
          roundsBeforeLongBreak: 4,
        },
      });

      render(<MobileFocusView />);

      const resetBtn = screen.getByTestId('mobile-timer-reset');

      // Pointer down, hold for 1000ms (< 1500ms)
      fireEvent.pointerDown(resetBtn);
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // User drags finger away: pointerLeave / pointerCancel fires
      fireEvent.pointerLeave(resetBtn);

      // Advance past 1500ms: timer should have been canceled
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // Cycle was NOT reset; currentRound is still 4
      expect(useTimerStore.getState().currentRound).toBe(4);

      vi.useRealTimers();
    });

    it('4.3 Holding reset button for >= 1.5s (1500ms) resets the entire Pomodoro cycle (Hiệp 1/4)', async () => {
      vi.useFakeTimers();

      useTimerStore.setState({
        status: 'running',
        phase: 'short_break',
        currentRound: 3,
        remainingMs: 2 * 60 * 1000,
        settings: {
          ...useTimerStore.getState().settings,
          pomodoroMinutes: 25,
          shortBreakMinutes: 5,
          roundsBeforeLongBreak: 4,
        },
      });

      render(<MobileFocusView />);

      const resetBtn = screen.getByTestId('mobile-timer-reset');

      // Pointer down to begin hold
      fireEvent.pointerDown(resetBtn);

      // Advance by 750ms: progress ring should be active
      act(() => {
        vi.advanceTimersByTime(750);
      });
      expect(screen.queryByTestId('reset-hold-progress-ring')).toBeDefined();

      // Advance to full 1500ms threshold
      act(() => {
        vi.advanceTimersByTime(750);
      });

      // Invariant: resetCycle must have fired!
      // currentRound is reset back to 1
      expect(useTimerStore.getState().currentRound).toBe(1);
      // phase is reset back to 'pomodoro'
      expect(useTimerStore.getState().phase).toBe('pomodoro');
      // status is idle
      expect(useTimerStore.getState().status).toBe('idle');
      // remainingMs is 25 minutes
      expect(useTimerStore.getState().remainingMs).toBe(25 * 60 * 1000);

      // Releasing pointer after hold does not trigger conflicting click
      fireEvent.pointerUp(resetBtn);
      fireEvent.click(resetBtn);

      expect(useTimerStore.getState().currentRound).toBe(1);

      vi.useRealTimers();
    });
  });

  // =========================================================================
  // 5. Pocket Lock Z-Index & Touch Interception
  // =========================================================================
  describe('5. Pocket Lock Z-Index & Touch Interception', () => {
    it('5.1 Pocket Lock overlay renders via Portal with z-[70], z-[100], and required notices', () => {
      render(<MobileFocusView />);

      // Pocket Lock button exists in header
      const lockBtn = screen.getByTestId('mobile-pocket-lock-btn');
      expect(lockBtn).toBeDefined();

      // Initially overlay is not mounted
      expect(screen.queryByTestId('mobile-pocket-lock-overlay')).toBeNull();

      // Click to engage Pocket Lock
      fireEvent.click(lockBtn);

      // Overlay is mounted
      const overlay = screen.getByTestId('mobile-pocket-lock-overlay');
      expect(overlay).toBeDefined();

      // Verify portal parent is document.body
      expect(overlay.parentElement).toBe(document.body);

      // Verify z-index classes conform to Playbook z-[100] and contract z-[70]
      expect(overlay.className).toContain('z-[70]');
      expect(overlay.className).toContain('z-[100]');
      expect(overlay.className).toContain('fixed inset-0');
      expect(overlay.className).toContain('touch-none');
      expect(overlay.className).toContain('pointer-events-auto');

      // Verify required notices from specification
      expect(overlay.textContent).toContain('Đã bật khóa chống chạm nhầm');
      expect(overlay.textContent).toContain('Nhấn giữ để mở khóa');
    });

    it('5.2 Intercepts and stops propagation of touch / pointer events on the overlay', () => {
      render(<MobileFocusView />);

      // Engage Pocket Lock
      fireEvent.click(screen.getByTestId('mobile-pocket-lock-btn'));
      const overlay = screen.getByTestId('mobile-pocket-lock-overlay');

      // Create synthetic pointer event and spy on stopPropagation
      const pointerDownEvent = new MouseEvent('pointerdown', { bubbles: true, cancelable: true });
      const stopPropagationSpy = vi.spyOn(pointerDownEvent, 'stopPropagation');

      overlay.dispatchEvent(pointerDownEvent);
      expect(stopPropagationSpy).toHaveBeenCalled();

      // Also click event
      const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
      const clickStopSpy = vi.spyOn(clickEvent, 'stopPropagation');
      overlay.dispatchEvent(clickEvent);
      expect(clickStopSpy).toHaveBeenCalled();
    });

    it('5.3 Hold-to-unlock pad cancels on early release (< 1.5s) and disengages on >= 1.5s hold', () => {
      vi.useFakeTimers();

      render(<MobileFocusView />);

      // Engage Pocket Lock
      fireEvent.click(screen.getByTestId('mobile-pocket-lock-btn'));
      expect(screen.getByTestId('mobile-pocket-lock-overlay')).toBeDefined();

      const unlockPad = screen.getByTestId('mobile-pocket-unlock-pad');

      // Test Subcase A: Release before 1500ms (e.g. at 900ms)
      fireEvent.pointerDown(unlockPad);
      act(() => {
        vi.advanceTimersByTime(900);
      });
      fireEvent.pointerUp(unlockPad);

      // Must remain locked!
      expect(screen.getByTestId('mobile-pocket-lock-overlay')).toBeDefined();

      // Test Subcase B: Hold for full 1500ms
      fireEvent.pointerDown(unlockPad);
      act(() => {
        vi.advanceTimersByTime(1600);
      });

      // Overlay is unmounted
      expect(screen.queryByTestId('mobile-pocket-lock-overlay')).toBeNull();

      vi.useRealTimers();
    });
  });
});
