import 'fake-indexeddb/auto';
import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MobileAuthBottomSheet } from '../../src/components/mobile/auth/MobileAuthBottomSheet';
import { MobileFocusView } from '../../src/components/mobile/views/MobileFocusView';
import { MobileAppShell } from '../../src/components/mobile/MobileAppShell';
import { useTimerStore } from '../../src/stores/useTimerStore';
import { useTaskStore } from '../../src/stores/useTaskStore';
import { useLayoutStore } from '../../src/stores/useLayoutStore';
import { useAudioStore } from '../../src/stores/useAudioStore';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useAiStore } from '../../src/stores/useAiStore';
import { useBackgroundStore } from '../../src/stores/useBackgroundStore';
import { authService } from '../../src/services/authService';
import { googleAuthService } from '../../src/services/googleAuthService';
import { db } from '../../src/db';
import { getVietnamTodayDateKey } from '../../src/utils/timezone';

describe('PomoFocus V8.1 Milestone 2 — Mobile Focus Hub & Liquid Auth Suite', () => {
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

    // Reset useBackgroundStore
    useBackgroundStore.getState().resetBackground();

    // Reset useAuthStore to unauthenticated state
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoggedIn: false,
      hasVipAccess: false,
      isPro: false,
      isLifetime: false,
      isBetaPro: false,
      isOwner: false,
      isLadyBoss: false,
      isVipFriend: false,
      role: 'guest',
      planLabel: 'Khách',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // 1. MobileAuthBottomSheet Tests
  // ===========================================================================
  describe('1. MobileAuthBottomSheet (Liquid Glass Bottom Sheet Auth)', () => {
    it('1.1 Does not render in DOM when isOpen is false', () => {
      render(<MobileAuthBottomSheet isOpen={false} onClose={() => {}} />);
      expect(screen.queryByTestId('mobile-auth-bottom-sheet')).toBeNull();
    });

    it('1.2 Renders bottom sheet at z-[60] with drag indicator and close button when isOpen is true', () => {
      render(<MobileAuthBottomSheet isOpen={true} onClose={() => {}} />);
      const sheet = screen.getByTestId('mobile-auth-bottom-sheet');
      expect(sheet).toBeDefined();
      expect(sheet.className).toContain('z-[60]');
      expect(screen.getByTestId('mobile-auth-close-btn')).toBeDefined();
      expect(screen.getByTestId('mobile-auth-sheet-backdrop')).toBeDefined();
    });

    it('1.3 When unauthenticated: renders Google 1-tap button and Magic Link email form', () => {
      render(<MobileAuthBottomSheet isOpen={true} onClose={() => {}} />);
      expect(screen.getByTestId('mobile-auth-google-btn')).toBeDefined();
      expect(screen.getByTestId('mobile-auth-email-input')).toBeDefined();
      expect(screen.getByTestId('mobile-auth-magiclink-btn')).toBeDefined();
    });

    it('1.4 Google 1-tap OAuth button invokes loginWithGoogle and updates auth store', async () => {
      vi.spyOn(googleAuthService, 'simulateGoogleLogin').mockResolvedValueOnce({
        sub: 'usr_g_test',
        email: 'test@student.edu.vn',
        name: 'Nguyễn Văn Test',
      });
      const loginSpy = vi.spyOn(authService, 'loginWithGoogle').mockResolvedValueOnce({
        id: 'usr_google_test',
        email: 'test@student.edu.vn',
        displayName: 'Nguyễn Văn Test',
        plan: 'free',
        createdAt: Date.now(),
      });

      render(<MobileAuthBottomSheet isOpen={true} onClose={() => {}} />);
      const googleBtn = screen.getByTestId('mobile-auth-google-btn');

      await act(async () => {
        fireEvent.click(googleBtn);
      });

      await waitFor(() => {
        expect(loginSpy).toHaveBeenCalled();
      });
    });

    it('1.5 Magic Link form calls authService.sendMagicLink with normalized email and shows feedback', async () => {
      const magicSpy = vi.spyOn(authService, 'sendMagicLink').mockResolvedValueOnce({
        success: true,
        message: 'Đã gửi liên kết Magic Link!',
      });

      render(<MobileAuthBottomSheet isOpen={true} onClose={() => {}} />);
      const emailInput = screen.getByTestId('mobile-auth-email-input') as HTMLInputElement;
      const submitBtn = screen.getByTestId('mobile-auth-magiclink-btn');

      await act(async () => {
        fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
      });

      expect(emailInput.value).toBe('user@example.com');

      await act(async () => {
        fireEvent.click(submitBtn);
      });

      expect(magicSpy).toHaveBeenCalledWith('user@example.com');
      const feedback = screen.getByTestId('mobile-auth-feedback');
      expect(feedback.textContent).toContain('Đã gửi liên kết Magic Link!');
    });

    it('1.6 Magic Link form surfaces error feedback when email is invalid', async () => {
      render(<MobileAuthBottomSheet isOpen={true} onClose={() => {}} />);
      const emailInput = screen.getByTestId('mobile-auth-email-input');
      const submitBtn = screen.getByTestId('mobile-auth-magiclink-btn');

      await act(async () => {
        fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
        fireEvent.click(submitBtn);
      });

      const feedback = screen.getByTestId('mobile-auth-feedback');
      expect(feedback.textContent).toContain('Vui lòng nhập địa chỉ email hợp lệ.');
    });

    it('1.7 When authenticated: renders Bento Grid profile with 4 study metric cards', async () => {
      useAuthStore.setState({
        user: {
          id: 'usr_logged_in',
          email: 'hoctap@university.vn',
          displayName: 'Lê Học Tập',
          plan: 'free',
          createdAt: Date.now(),
        },
        isAuthenticated: true,
        isLoggedIn: true,
        hasVipAccess: false,
        role: 'user',
        planLabel: 'Miễn phí',
      });

      render(<MobileAuthBottomSheet isOpen={true} onClose={() => {}} />);

      expect(screen.getByTestId('mobile-auth-bento-grid')).toBeDefined();
      expect(screen.getByTestId('mobile-auth-user-avatar')).toBeDefined();
      expect(screen.getByTestId('mobile-auth-user-email').textContent).toBe('hoctap@university.vn');

      // 4 Required Bento Grid Metrics
      expect(screen.getByTestId('bento-metric-studyHours')).toBeDefined();
      expect(screen.getByTestId('bento-metric-streak')).toBeDefined();
      expect(screen.getByTestId('bento-metric-completedPomos')).toBeDefined();
      expect(screen.getByTestId('bento-metric-walletCredits')).toBeDefined();
      expect(screen.getByTestId('bento-metric-walletCredits').textContent).toContain('⚡ 50');
    });

    it('1.8 Non-VIP user gets Upgrade PRO button; VIP / Founder gets VIP badge and 0 upgrade buttons', () => {
      // Non-VIP
      useAuthStore.setState({
        user: { id: 'u1', email: 'free@pomo.io', plan: 'free', createdAt: Date.now() },
        isAuthenticated: true,
        hasVipAccess: false,
      });

      const { rerender } = render(<MobileAuthBottomSheet isOpen={true} onClose={() => {}} />);
      expect(screen.getByTestId('mobile-auth-upgrade-btn')).toBeDefined();

      // Founder VIP
      useAuthStore.setState({
        user: { id: 'u_founder', email: 'namho03052k9@gmail.com', plan: 'lifetime', role: 'founder', createdAt: Date.now() },
        isAuthenticated: true,
        hasVipAccess: true,
      });

      rerender(<MobileAuthBottomSheet isOpen={true} onClose={() => {}} />);
      expect(screen.getByTestId('mobile-auth-vip-badge')).toBeDefined();
      expect(screen.queryByTestId('mobile-auth-upgrade-btn')).toBeNull();
    });

    it('1.9 Sign out button invokes authService.logout and closes sheet', () => {
      const logoutSpy = vi.spyOn(authService, 'logout');
      const closeSpy = vi.fn();

      useAuthStore.setState({
        user: { id: 'u1', email: 'user@pomo.io', plan: 'free', createdAt: Date.now() },
        isAuthenticated: true,
      });

      render(<MobileAuthBottomSheet isOpen={true} onClose={closeSpy} />);
      const logoutBtn = screen.getByTestId('mobile-auth-logout-btn');

      fireEvent.click(logoutBtn);
      expect(logoutSpy).toHaveBeenCalled();
      expect(closeSpy).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // 2. Pocket Lock (🔒) Tests
  // ===========================================================================
  describe('2. Pocket Lock 🔒 (Full-Screen Touch Interceptor at z-[70])', () => {
    it('2.1 Pocket Lock toggle button exists in MobileFocusView', () => {
      render(<MobileFocusView />);
      expect(screen.getByTestId('mobile-pocket-lock-btn')).toBeDefined();
    });

    it('2.2 Tapping Pocket Lock button engages full-screen overlay at z-[70]', () => {
      render(<MobileFocusView />);
      const lockBtn = screen.getByTestId('mobile-pocket-lock-btn');

      fireEvent.click(lockBtn);

      const overlay = screen.getByTestId('mobile-pocket-lock-overlay');
      expect(overlay).toBeDefined();
      expect(overlay.className).toContain('z-[70]');
      expect(screen.getByTestId('mobile-pocket-unlock-pad')).toBeDefined();
    });

    it('2.3 Releasing unlock pad before 1.5s cancels unlock and leaves overlay active', () => {
      vi.useFakeTimers();
      render(<MobileFocusView />);

      // Engage lock
      fireEvent.click(screen.getByTestId('mobile-pocket-lock-btn'));
      expect(screen.getByTestId('mobile-pocket-lock-overlay')).toBeDefined();

      const unlockPad = screen.getByTestId('mobile-pocket-unlock-pad');

      // Hold for 800ms (< 1500ms)
      fireEvent.pointerDown(unlockPad);
      act(() => {
        vi.advanceTimersByTime(800);
      });

      // Release early
      fireEvent.pointerUp(unlockPad);

      // Must remain locked
      expect(screen.getByTestId('mobile-pocket-lock-overlay')).toBeDefined();
      vi.useRealTimers();
    });

    it('2.4 Holding unlock pad for >= 1.5s (1500ms) disengages Pocket Lock and dismisses overlay', () => {
      vi.useFakeTimers();
      render(<MobileFocusView />);

      fireEvent.click(screen.getByTestId('mobile-pocket-lock-btn'));
      expect(screen.getByTestId('mobile-pocket-lock-overlay')).toBeDefined();

      const unlockPad = screen.getByTestId('mobile-pocket-unlock-pad');

      fireEvent.pointerDown(unlockPad);
      act(() => {
        vi.advanceTimersByTime(1600);
      });

      // Overlay should now be dismissed
      expect(screen.queryByTestId('mobile-pocket-lock-overlay')).toBeNull();
      vi.useRealTimers();
    });
  });

  // ===========================================================================
  // 3. Hold to Start (800ms) & Accessible 1-Tap Tests
  // ===========================================================================
  describe('3. Hold to Start (800ms) & Accessible 1-Tap Toggle', () => {
    it('3.1 Primary action button renders with >= 64x64px touch target', () => {
      render(<MobileFocusView />);
      const mainBtn = screen.getByTestId('mobile-timer-main-action');
      expect(mainBtn).toBeDefined();
      expect(mainBtn.className).toContain('w-16');
      expect(mainBtn.className).toContain('h-16');
    });

    it('3.2 Accessible 1-tap (< 300ms) toggles timer from idle to running and back to paused', () => {
      render(<MobileFocusView />);
      const mainBtn = screen.getByTestId('mobile-timer-main-action');

      expect(useTimerStore.getState().status).toBe('idle');

      // Tap to start
      fireEvent.click(mainBtn);
      expect(useTimerStore.getState().status).toBe('running');

      // Tap to pause
      fireEvent.click(mainBtn);
      expect(useTimerStore.getState().status).toBe('paused');
    });

    it('3.3 Holding primary action button for >= 800ms triggers start via commitment ritual', () => {
      vi.useFakeTimers();
      render(<MobileFocusView />);
      const mainBtn = screen.getByTestId('mobile-timer-main-action');

      expect(useTimerStore.getState().status).toBe('idle');

      fireEvent.pointerDown(mainBtn);
      act(() => {
        vi.advanceTimersByTime(850);
      });

      expect(useTimerStore.getState().status).toBe('running');
      vi.useRealTimers();
    });

    it('3.4 Releasing between 300ms and 799ms aborts hold without starting timer', () => {
      vi.useFakeTimers();
      render(<MobileFocusView />);
      const mainBtn = screen.getByTestId('mobile-timer-main-action');

      expect(useTimerStore.getState().status).toBe('idle');

      fireEvent.pointerDown(mainBtn);
      act(() => {
        vi.advanceTimersByTime(500); // Between 300ms and 800ms
      });
      fireEvent.pointerUp(mainBtn);

      // Must NOT have started
      expect(useTimerStore.getState().status).toBe('idle');
      vi.useRealTimers();
    });
  });

  // ===========================================================================
  // 4. Quick Task Bar 1-Tap Tests
  // ===========================================================================
  describe('4. Quick Task Bar 1-Tap & Sliding Drawer Picker', () => {
    it('4.1 Quick task chip renders below phase selector with task title and pomodoro count', () => {
      useTimerStore.setState({
        linkedTaskId: 'task_math',
        linkedTaskTitle: 'Ôn tập Giải tích 1',
      });
      useTaskStore.setState({
        tasks: [
          {
            id: 'task_math',
            title: 'Ôn tập Giải tích 1',
            status: 'todo',
            priority: 'p1',
            estimatedPomodoros: 4,
            completedPomodoros: 1,
            repeat: 'none',
            orderIndex: 1,
            tagIds: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ],
      });

      render(<MobileFocusView />);
      const chip = screen.getByTestId('mobile-linked-task-chip');
      expect(chip.textContent).toContain('Ôn tập Giải tích 1');
      expect(chip.textContent).toContain('1/4 🍅');
    });

    it('4.2 Tapping circular checkmark applies jade burst animation and updates task status', async () => {
      const toggleSpy = vi.fn().mockResolvedValue(undefined);
      useTaskStore.setState({
        tasks: [
          {
            id: 'task_math',
            title: 'Ôn tập Giải tích 1',
            status: 'todo',
            priority: 'p1',
            estimatedPomodoros: 4,
            completedPomodoros: 1,
            repeat: 'none',
            orderIndex: 1,
            tagIds: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ],
        toggleTaskComplete: toggleSpy,
      });
      useTimerStore.setState({
        linkedTaskId: 'task_math',
        linkedTaskTitle: 'Ôn tập Giải tích 1',
      });

      render(<MobileFocusView />);
      const completeBtn = screen.getByTestId('mobile-quick-task-complete-btn');

      await act(async () => {
        fireEvent.click(completeBtn);
      });

      expect(completeBtn.className).toContain('animate-jade-burst');
      expect(toggleSpy).toHaveBeenCalledWith('task_math');
    });

    it('4.3 Clicking task chip opens sliding task picker drawer without leaving focus view', () => {
      useTaskStore.setState({
        tasks: [
          {
            id: 't1',
            title: 'Bài tập Đại số Tuyến tính',
            status: 'todo',
            priority: 'p2',
            estimatedPomodoros: 3,
            completedPomodoros: 0,
            repeat: 'none',
            orderIndex: 1,
            tagIds: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ],
      });

      render(<MobileFocusView />);
      const chip = screen.getByTestId('mobile-linked-task-chip');

      fireEvent.click(chip);

      const dropdown = screen.getByTestId('mobile-task-picker-dropdown');
      expect(dropdown).toBeDefined();
      expect(dropdown.textContent).toContain('Bài tập Đại số Tuyến tính');
    });
  });

  // ===========================================================================
  // 5. Pure Zen Black 1-Tap Tests
  // ===========================================================================
  describe('5. Pure Zen Black 1-Tap (OLED #09090b Mode)', () => {
    it('5.1 Calling setPureZenBlack immediately sets activePresetId to pure-black and clears media', () => {
      const store = useBackgroundStore.getState();
      store.setCustomBackground('https://example.com/video.mp4', 'video');
      expect(useBackgroundStore.getState().activePresetId).toBe('custom');

      act(() => {
        useBackgroundStore.getState().setPureZenBlack();
      });

      const updated = useBackgroundStore.getState();
      expect(updated.activePresetId).toBe('pure-black');
      expect(updated.customUrl).toBeNull();
      expect(updated.customType).toBeNull();
      expect(updated.ambientEffect).toBe('none');
      expect(updated.pure_zen_black).toBe(true);
    });

    it('5.2 Pure Zen Black preset is defined with solid OLED hex #09090b', () => {
      const presets = useBackgroundStore.getState().presets;
      const pureBlackPreset = presets.find((p) => p.id === 'pure-black');
      expect(pureBlackPreset).toBeDefined();
      expect(pureBlackPreset?.url).toBe('#09090b');
      expect(pureBlackPreset?.category).toBe('solid');
    });

    it('5.3 Spaces Tab renders Pure Zen Black button at the very top of picker', () => {
      useLayoutStore.setState({ activeMobileTab: 'spaces' as any });
      render(<MobileAppShell />);

      const zenBtn = screen.getByTestId('mobile-spaces-pure-zen-black-btn');
      expect(zenBtn).toBeDefined();
      expect(zenBtn.textContent).toContain('Tắt nền (Pure Zen Black)');
      expect(zenBtn.textContent).toContain('OLED #09090b');

      act(() => {
        fireEvent.click(zenBtn);
      });

      expect(useBackgroundStore.getState().activePresetId).toBe('pure-black');
    });
  });

  // ===========================================================================
  // 6. Task Priority Reordering Tests
  // ===========================================================================
  describe('6. Task Priority Reordering (Up / Down Priority Controls)', () => {
    it('6.1 Moving task up swaps order and array position with preceding task', async () => {
      const taskA = {
        id: 't_a',
        title: 'Task A (Thứ tự 0)',
        status: 'todo' as const,
        priority: 'p1' as const,
        estimatedPomodoros: 2,
        completedPomodoros: 0,
        repeat: 'none' as const,
        orderIndex: 0,
        order: 0,
        tagIds: [],
        createdAt: 1000,
        updatedAt: 1000,
      };

      const taskB = {
        id: 't_b',
        title: 'Task B (Thứ tự 1)',
        status: 'todo' as const,
        priority: 'p2' as const,
        estimatedPomodoros: 3,
        completedPomodoros: 0,
        repeat: 'none' as const,
        orderIndex: 1,
        order: 1,
        tagIds: [],
        createdAt: 2000,
        updatedAt: 2000,
      };

      await db.tasks.bulkAdd([taskA, taskB]);
      useTaskStore.setState({ tasks: [taskA, taskB] });

      // Move Task B UP
      await act(async () => {
        await useTaskStore.getState().reorderTask('t_b', 'UP');
      });

      const currentTasks = useTaskStore.getState().tasks;
      expect(currentTasks[0].id).toBe('t_b');
      expect(currentTasks[1].id).toBe('t_a');

      // Check Dexie database persistence
      const dbTaskB = await db.tasks.get('t_b');
      const dbTaskA = await db.tasks.get('t_a');
      expect(dbTaskB?.order).toBeLessThan(dbTaskA?.order ?? 999);
    });

    it('6.2 Moving task down swaps order and array position with following task', async () => {
      const taskA = {
        id: 't_1',
        title: 'Task 1',
        status: 'todo' as const,
        priority: 'p1' as const,
        estimatedPomodoros: 1,
        completedPomodoros: 0,
        repeat: 'none' as const,
        orderIndex: 0,
        order: 0,
        tagIds: [],
        createdAt: 1000,
        updatedAt: 1000,
      };

      const taskB = {
        id: 't_2',
        title: 'Task 2',
        status: 'todo' as const,
        priority: 'p2' as const,
        estimatedPomodoros: 2,
        completedPomodoros: 0,
        repeat: 'none' as const,
        orderIndex: 1,
        order: 1,
        tagIds: [],
        createdAt: 2000,
        updatedAt: 2000,
      };

      await db.tasks.bulkAdd([taskA, taskB]);
      useTaskStore.setState({ tasks: [taskA, taskB] });

      // Move Task 1 DOWN
      await act(async () => {
        await useTaskStore.getState().reorderTask('t_1', 'DOWN');
      });

      const currentTasks = useTaskStore.getState().tasks;
      expect(currentTasks[0].id).toBe('t_2');
      expect(currentTasks[1].id).toBe('t_1');
    });

    it('6.3 Reordering edge cases: single task or empty list does not throw error', async () => {
      useTaskStore.setState({ tasks: [] });
      await expect(useTaskStore.getState().reorderTask('missing', 'UP')).resolves.toBeUndefined();

      const singleTask = {
        id: 'solo',
        title: 'Solo Task',
        status: 'todo' as const,
        priority: 'p1' as const,
        estimatedPomodoros: 1,
        completedPomodoros: 0,
        repeat: 'none' as const,
        orderIndex: 0,
        order: 0,
        tagIds: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      useTaskStore.setState({ tasks: [singleTask] });
      await expect(useTaskStore.getState().reorderTask('solo', 'UP')).resolves.toBeUndefined();
      await expect(useTaskStore.getState().reorderTask('solo', 'DOWN')).resolves.toBeUndefined();
    });

    it('6.4 Tasks view renders move up and move down buttons for each task', () => {
      useTaskStore.setState({
        tasks: [
          {
            id: 'task_ui',
            title: 'Thiết kế giao diện',
            status: 'todo',
            priority: 'p1',
            estimatedPomodoros: 2,
            completedPomodoros: 0,
            repeat: 'none',
            orderIndex: 0,
            order: 0,
            tagIds: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ],
      });
      useLayoutStore.setState({ activeMobileTab: 'tasks' as any });

      render(<MobileAppShell />);
      expect(screen.getByTestId('mobile-task-move-up-task_ui')).toBeDefined();
      expect(screen.getByTestId('mobile-task-move-down-task_ui')).toBeDefined();
    });
  });

  // ===========================================================================
  // 7. Daily Flow 24h & 7-Day Weekly Insights Tests
  // ===========================================================================
  describe('7. Daily Flow Strip 24h & 7-Day Weekly Insights', () => {
    it('7.1 Daily Flow timeline renders exactly 24 hour slots', () => {
      render(<MobileFocusView />);
      const timeline = screen.getByTestId('mobile-daily-flow-timeline');
      expect(timeline).toBeDefined();

      for (let h = 0; h < 24; h++) {
        expect(screen.getByTestId(`mobile-flow-hour-${h}`)).toBeDefined();
      }
    });

    it('7.2 Daily Flow summary text formats today hours and completed pomos', () => {
      useTimerStore.setState({
        todayFocusMinutes: 125,
        dailyProgress: 5,
      });

      render(<MobileFocusView />);
      const summary = screen.getByTestId('mobile-daily-flow-summary');
      expect(summary.textContent).toContain('2g 5ph');
      expect(summary.textContent).toContain('5 🍅');
    });

    it('7.3 7-Day Weekly Insights displays 7 daily columns with today in emerald', async () => {
      const todayKey = getVietnamTodayDateKey();
      await db.focus_sessions.add({
        id: 'sess_1',
        dateString: todayKey,
        durationMinutes: 50,
        completedAt: Date.now(),
        phase: 'pomodoro',
      });

      render(<MobileFocusView />);

      await waitFor(() => {
        expect(screen.getByTestId('mobile-weekly-insights')).toBeDefined();
      });

      const todayBar = screen.getByTestId(`mobile-weekly-bar-${todayKey}`);
      expect(todayBar.className).toContain('bg-emerald-400');
    });

    it('7.4 MobileAppShell header renders avatar button that triggers MobileAuthBottomSheet', () => {
      render(<MobileAppShell />);
      const avatarBtn = screen.getByTestId('mobile-header-avatar-btn');
      expect(avatarBtn).toBeDefined();

      // Tap avatar button in header
      fireEvent.click(avatarBtn);

      // MobileAuthBottomSheet opens
      expect(screen.getByTestId('mobile-auth-bottom-sheet')).toBeDefined();
    });
  });
});
