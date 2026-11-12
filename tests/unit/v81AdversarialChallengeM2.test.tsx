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
import { authService, hasVipAccess, isOwnerEmail } from '../../src/services/authService';
import { db } from '../../src/db';
import { Task } from '../../src/types/tasks';

describe('Empirical Adversarial Stress Suite — Milestone 2 Verification', () => {
  beforeEach(async () => {
    vi.useRealTimers();
    localStorage.clear();
    sessionStorage.clear();

    try {
      await db.tasks.clear();
      await db.notes.clear();
      await db.focus_sessions.clear();
    } catch {}

    // Reset Stores
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

    useTaskStore.setState({
      tasks: [],
      activeTaskId: null,
    });

    useBackgroundStore.getState().resetBackground();

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
  // SECTION 1: MobileAuthBottomSheet Stress Testing
  // ===========================================================================
  describe('1. MobileAuthBottomSheet Stress Testing', () => {
    it('1.1 Malformed / empty email input: blocks submission and shows error feedback', async () => {
      const sendSpy = vi.spyOn(authService, 'sendMagicLink');
      render(<MobileAuthBottomSheet isOpen={true} onClose={() => {}} />);

      const emailInput = screen.getByTestId('mobile-auth-email-input') as HTMLInputElement;
      const submitBtn = screen.getByTestId('mobile-auth-magiclink-btn') as HTMLButtonElement;

      // Case A: Initially empty input — submit button should be disabled
      expect(submitBtn.disabled).toBe(true);

      // Case B: Whitespace only
      await act(async () => {
        fireEvent.change(emailInput, { target: { value: '    ' } });
      });
      expect(submitBtn.disabled).toBe(true);

      // Case C: Missing '@' symbol
      await act(async () => {
        fireEvent.change(emailInput, { target: { value: 'plainstringwithoutat' } });
      });
      expect(submitBtn.disabled).toBe(false);

      await act(async () => {
        fireEvent.click(submitBtn);
      });

      // Verification: authService.sendMagicLink was NOT invoked
      expect(sendSpy).not.toHaveBeenCalled();
      const feedback = screen.getByTestId('mobile-auth-feedback');
      expect(feedback.textContent).toContain('Vui lòng nhập địa chỉ email hợp lệ.');

      // Case D: Form submit event directly triggered with invalid email
      await act(async () => {
        const form = emailInput.closest('form');
        if (form) fireEvent.submit(form);
      });
      expect(sendSpy).not.toHaveBeenCalled();
    });

    it('1.2 authService.sendMagicLink failure handling: surfaces server rejection message cleanly', async () => {
      vi.spyOn(authService, 'sendMagicLink').mockResolvedValueOnce({
        success: false,
        message: 'Tài khoản tạm thời bị khóa do yêu cầu quá nhiều lần.',
      });

      render(<MobileAuthBottomSheet isOpen={true} onClose={() => {}} />);
      const emailInput = screen.getByTestId('mobile-auth-email-input');
      const submitBtn = screen.getByTestId('mobile-auth-magiclink-btn');

      await act(async () => {
        fireEvent.change(emailInput, { target: { value: 'rate.limit@example.com' } });
      });

      await act(async () => {
        fireEvent.click(submitBtn);
      });

      const feedback = screen.getByTestId('mobile-auth-feedback');
      expect(feedback.textContent).toContain('Tài khoản tạm thời bị khóa do yêu cầu quá nhiều lần.');
    });

    it('1.3 Rapid double submission: verify behavior when multiple click events fire in rapid succession', async () => {
      let resolvePromise: (val: any) => void;
      const delayedPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      const sendSpy = vi.spyOn(authService, 'sendMagicLink').mockImplementation(() => delayedPromise as any);

      render(<MobileAuthBottomSheet isOpen={true} onClose={() => {}} />);
      const emailInput = screen.getByTestId('mobile-auth-email-input');
      const submitBtn = screen.getByTestId('mobile-auth-magiclink-btn');

      await act(async () => {
        fireEvent.change(emailInput, { target: { value: 'fastuser@pomofocus.vn' } });
      });

      // Fire 2 rapid clicks in the same event loop before promise resolves
      await act(async () => {
        fireEvent.click(submitBtn);
        // Note: the button's disabled attribute takes effect after React re-renders.
      });

      // Check whether button is now disabled during network call
      expect(submitBtn.hasAttribute('disabled')).toBe(true);

      // Attempt second click while disabled
      await act(async () => {
        fireEvent.click(submitBtn);
      });

      // Resolve original promise
      await act(async () => {
        resolvePromise!({ success: true, message: 'Đã gửi thành công' });
      });

      // Verify call count (at most 1 network dispatch expected)
      expect(sendSpy).toHaveBeenCalledTimes(1);
    });

    it('1.4 VIP/Founder whitelist edge cases: namho03052k9@gmail.com with null metadata NEVER shows upgrade button', async () => {
      // Test user with completely null/undefined plan and role metadata
      const founderUser = {
        id: 'founder_nam',
        email: 'namho03052k9@gmail.com',
        displayName: 'Nam Ho (Founder)',
        plan: null as any,
        role: undefined,
        isLifetime: undefined,
        createdAt: Date.now(),
      };

      expect(isOwnerEmail(founderUser.email)).toBe(true);
      expect(hasVipAccess(founderUser)).toBe(true);

      useAuthStore.setState({
        user: founderUser as any,
        isAuthenticated: true,
        isLoggedIn: true,
        hasVipAccess: true,
        role: 'founder',
        planLabel: 'Founder VIP',
      });

      render(<MobileAuthBottomSheet isOpen={true} onClose={() => {}} />);

      // MUST NOT render upgrade button under any circumstances
      expect(screen.queryByTestId('mobile-auth-upgrade-btn')).toBeNull();

      // MUST render Founder VIP badge
      const vipBadge = screen.getByTestId('mobile-auth-vip-badge');
      expect(vipBadge).toBeDefined();
      expect(vipBadge.textContent).toContain('Founder VIP');
    });

    it('1.5 VIP/Founder whitelist edge cases: huyentrantt09@gmail.com with null metadata NEVER shows upgrade button', async () => {
      const ladyBossUser = {
        id: 'lady_boss',
        email: 'huyentrantt09@gmail.com',
        displayName: 'Huyền Trân (Co-founder)',
        plan: null as any,
        role: undefined,
        createdAt: Date.now(),
      };

      expect(isOwnerEmail(ladyBossUser.email)).toBe(true);
      expect(hasVipAccess(ladyBossUser)).toBe(true);

      useAuthStore.setState({
        user: ladyBossUser as any,
        isAuthenticated: true,
        isLoggedIn: true,
        hasVipAccess: true,
        role: 'founder',
        planLabel: 'Founder VIP',
      });

      render(<MobileAuthBottomSheet isOpen={true} onClose={() => {}} />);

      expect(screen.queryByTestId('mobile-auth-upgrade-btn')).toBeNull();
      const vipBadge = screen.getByTestId('mobile-auth-vip-badge');
      expect(vipBadge).toBeDefined();
    });

    it('1.6 Whitelist case-insensitivity & whitespace trimming: NAMHO03052K9@GMAIL.COM with trailing spaces', async () => {
      const emailWithNoise = '  NAMHO03052K9@GMAIL.COM  ';
      expect(isOwnerEmail(emailWithNoise)).toBe(true);

      const userNoise = {
        id: 'founder_noisy',
        email: emailWithNoise,
        displayName: 'Nam Ho Caps',
        plan: 'free', // even with explicit 'free' plan, whitelist overrides
        createdAt: Date.now(),
      };

      expect(hasVipAccess(userNoise as any)).toBe(true);

      useAuthStore.setState({
        user: userNoise as any,
        isAuthenticated: true,
        isLoggedIn: true,
        hasVipAccess: true,
        planLabel: 'PRO VIP',
      });

      render(<MobileAuthBottomSheet isOpen={true} onClose={() => {}} />);

      expect(screen.queryByTestId('mobile-auth-upgrade-btn')).toBeNull();
      expect(screen.getByTestId('mobile-auth-vip-badge')).toBeDefined();
    });
  });

  // ===========================================================================
  // SECTION 2: Quick Task Bar 1-Tap & Sliding Drawer Stress Testing
  // ===========================================================================
  describe('2. Quick Task Bar 1-Tap & Sliding Drawer Stress Testing', () => {
    it('2.1 Clicking circle ○ completes task in Dexie DB and triggers animate-jade-burst', async () => {
      const testTask: Task = {
        id: 'task_empirical_1',
        title: 'Thực nghiệm Kiến trúc PomoFocus',
        status: 'todo',
        priority: 'p1',
        estimatedPomodoros: 4,
        completedPomodoros: 2,
        repeat: 'none',
        orderIndex: 0,
        tagIds: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await db.tasks.put(testTask as any);
      useTaskStore.setState({
        tasks: [testTask],
        activeTaskId: testTask.id,
      });
      useTimerStore.setState({
        linkedTaskId: testTask.id,
        linkedTaskTitle: testTask.title,
      });

      render(<MobileFocusView />);

      const completeBtn = screen.getByTestId('mobile-quick-task-complete-btn');
      expect(completeBtn.className).not.toContain('bg-emerald-500');

      // Click to complete
      await act(async () => {
        fireEvent.click(completeBtn);
      });

      // Verify animate-jade-burst applied
      expect(completeBtn.className).toContain('animate-jade-burst');

      // Verify task in Dexie DB updated to 'completed'
      const updatedDbTask = await db.tasks.get(testTask.id);
      expect(updatedDbTask?.status).toBe('completed');
      expect(updatedDbTask?.completedAt).toBeDefined();

      // Verify task in useTaskStore updated
      const storeTasks = useTaskStore.getState().tasks;
      expect(storeTasks[0].status).toBe('completed');
    });

    it('2.2 Rapid successive clicking on circle ○ toggles task cleanly without crash or corrupted DB state', async () => {
      const testTask: Task = {
        id: 'task_rapid_toggle',
        title: 'Task Rapid Stress Test',
        status: 'todo',
        priority: 'p2',
        estimatedPomodoros: 2,
        completedPomodoros: 0,
        repeat: 'none',
        orderIndex: 0,
        tagIds: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await db.tasks.put(testTask as any);
      useTaskStore.setState({
        tasks: [testTask],
        activeTaskId: testTask.id,
      });
      useTimerStore.setState({
        linkedTaskId: testTask.id,
        linkedTaskTitle: testTask.title,
      });

      render(<MobileFocusView />);
      const completeBtn = screen.getByTestId('mobile-quick-task-complete-btn');

      // Execute 4 sequential clicks
      for (let i = 0; i < 4; i++) {
        await act(async () => {
          fireEvent.click(completeBtn);
        });
      }

      // After 4 toggles: todo -> completed -> todo -> completed -> todo
      const finalDbTask = await db.tasks.get(testTask.id);
      const finalStoreTask = useTaskStore.getState().tasks.find((t) => t.id === testTask.id);

      expect(finalDbTask?.status).toBe('todo');
      expect(finalStoreTask?.status).toBe('todo');
    });

    it('2.3 Selecting task from sliding drawer switches active task immediately in useTimerStore', async () => {
      const taskA: Task = {
        id: 'task_a',
        title: 'Công việc A',
        status: 'todo',
        priority: 'p1',
        estimatedPomodoros: 3,
        completedPomodoros: 1,
        repeat: 'none',
        orderIndex: 0,
        tagIds: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const taskB: Task = {
        id: 'task_b',
        title: 'Công việc B (Chuyển sang)',
        status: 'todo',
        priority: 'p2',
        estimatedPomodoros: 5,
        completedPomodoros: 0,
        repeat: 'none',
        orderIndex: 1,
        tagIds: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await db.tasks.bulkPut([taskA as any, taskB as any]);
      useTaskStore.setState({
        tasks: [taskA, taskB],
        activeTaskId: taskA.id,
      });
      useTimerStore.setState({
        linkedTaskId: taskA.id,
        linkedTaskTitle: taskA.title,
      });

      render(<MobileFocusView />);

      // Verify initial linked task
      expect(useTimerStore.getState().linkedTaskId).toBe('task_a');
      expect(screen.getByTestId('mobile-linked-task-chip').textContent).toContain('Công việc A');

      // Open task picker sliding drawer
      await act(async () => {
        fireEvent.click(screen.getByTestId('mobile-linked-task-chip'));
      });

      const drawer = screen.getByTestId('mobile-task-picker-dropdown');
      expect(drawer).toBeDefined();
      expect(drawer.textContent).toContain('Công việc B (Chuyển sang)');

      // Click task B inside drawer
      const taskBBtn = screen.getByText('Công việc B (Chuyển sang)');
      await act(async () => {
        fireEvent.click(taskBBtn);
      });

      // Verification: Drawer closes and active linked task in useTimerStore switches immediately
      expect(screen.queryByTestId('mobile-task-picker-dropdown')).toBeNull();
      expect(useTimerStore.getState().linkedTaskId).toBe('task_b');
      expect(useTimerStore.getState().linkedTaskTitle).toBe('Công việc B (Chuyển sang)');
      expect(screen.getByTestId('mobile-linked-task-chip').textContent).toContain('Công việc B (Chuyển sang)');
    });

    it('2.4 Unlinking task via drawer clears linked task in useTimerStore', async () => {
      const taskA: Task = {
        id: 'task_a',
        title: 'Công việc cần gỡ',
        status: 'todo',
        priority: 'p1',
        estimatedPomodoros: 2,
        completedPomodoros: 0,
        repeat: 'none',
        orderIndex: 0,
        tagIds: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await db.tasks.put(taskA as any);
      useTaskStore.setState({
        tasks: [taskA],
        activeTaskId: taskA.id,
      });
      useTimerStore.setState({
        linkedTaskId: taskA.id,
        linkedTaskTitle: taskA.title,
      });

      render(<MobileFocusView />);

      // Open drawer
      await act(async () => {
        fireEvent.click(screen.getByTestId('mobile-linked-task-chip'));
      });

      // Click "Hủy liên kết công việc"
      const unlinkBtn = screen.getByText('Hủy liên kết công việc');
      await act(async () => {
        fireEvent.click(unlinkBtn);
      });

      expect(useTimerStore.getState().linkedTaskId).toBeNull();
      expect(useTimerStore.getState().linkedTaskTitle).toBeNull();
      expect(screen.getByTestId('mobile-linked-task-chip').textContent).toContain('Chưa chọn công việc');
    });
  });

  // ===========================================================================
  // SECTION 3: Pure Zen Black #09090b OLED Reset Stress Testing
  // ===========================================================================
  describe('3. Pure Zen Black #09090b OLED Reset Stress Testing', () => {
    it('3.1 Calling setPureZenBlack updates pure_zen_black flag, sets activePresetId to pure-black and ambientEffect to none', () => {
      const store = useBackgroundStore.getState();

      // Initially set an active image preset with ambient rain
      store.selectPreset('cozy-lofi-room');
      store.setAmbientEffect('rain');
      store.setBlur(10);
      store.setOverlayOpacity(50);

      expect(useBackgroundStore.getState().activePresetId).toBe('cozy-lofi-room');
      expect(useBackgroundStore.getState().ambientEffect).toBe('rain');
      expect(useBackgroundStore.getState().pure_zen_black).toBe(false);

      // Trigger OLED reset
      act(() => {
        useBackgroundStore.getState().setPureZenBlack();
      });

      const updated = useBackgroundStore.getState();
      expect(updated.pure_zen_black).toBe(true);
      expect(updated.activePresetId).toBe('pure-black');
      expect(updated.ambientEffect).toBe('none');
      expect(updated.customUrl).toBeNull();
      expect(updated.customType).toBeNull();

      // Check localStorage persistence
      const savedRaw = localStorage.getItem('pomodoro_workspace_background_v1');
      expect(savedRaw).toBeDefined();
      const saved = JSON.parse(savedRaw!);
      expect(saved.activePresetId).toBe('pure-black');
      expect(saved.ambientEffect).toBe('none');
      expect(saved.blurLevel).toBe(0);
      expect(saved.overlayOpacity).toBe(0);
    });

    it('3.2 Selecting another preset clears pure_zen_black flag cleanly', () => {
      act(() => {
        useBackgroundStore.getState().setPureZenBlack();
      });
      expect(useBackgroundStore.getState().pure_zen_black).toBe(true);

      act(() => {
        useBackgroundStore.getState().selectPreset('deep-space');
      });

      expect(useBackgroundStore.getState().pure_zen_black).toBe(false);
      expect(useBackgroundStore.getState().activePresetId).toBe('deep-space');
    });

    it('3.3 Clicking Pure Zen Black button in Spaces subview triggers setPureZenBlack', async () => {
      useLayoutStore.setState({ activeMobileTab: 'spaces' as any });

      render(<MobileAppShell />);

      const zenBtn = screen.getByTestId('mobile-spaces-pure-zen-black-btn');
      expect(zenBtn).toBeDefined();
      expect(zenBtn.textContent).toContain('Tắt nền (Pure Zen Black)');
      expect(zenBtn.textContent).toContain('OLED #09090b');

      await act(async () => {
        fireEvent.click(zenBtn);
      });

      expect(useBackgroundStore.getState().pure_zen_black).toBe(true);
      expect(useBackgroundStore.getState().activePresetId).toBe('pure-black');
      expect(zenBtn.className).toContain('border-emerald-400');
    });
  });
});
