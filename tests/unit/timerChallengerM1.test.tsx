import 'fake-indexeddb/auto';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useTimerStore } from '../../src/stores/useTimerStore';
import { TimerWidget } from '../../src/components/TimerWidget';
import { db } from '../../src/db';
import { TimerEngine } from '../../src/services/timerEngine';

describe('Challenger 2 — Milestone 1 Empirical Stress Test & Boundary Oracle', () => {
  beforeEach(async () => {
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date']
    });
    localStorage.clear();
    await db.focus_sessions.clear();
    useTimerStore.getState().init();
  });

  afterEach(() => {
    useTimerStore.getState().destroy();
    vi.useRealTimers();
  });

  describe('Adversarial Focus 1: Cycle Reset Across All Rounds (1, 2, 3, 4) & Preserving Daily Progress', () => {
    const testRounds = [1, 2, 3, 4] as const;

    testRounds.forEach((startRound) => {
      it(`resetCycle() from Round ${startRound} (idle) resets to Round 1 pomodoro 25:00 idle without wiping daily progress`, () => {
        const store = useTimerStore.getState();
        // Giả sử người dùng đã hoàn thành 5 hiệp hôm nay
        useTimerStore.setState({
          currentRound: startRound,
          phase: startRound === 4 ? 'long_break' : 'pomodoro',
          dailyProgress: 5,
          todayFocusMinutes: 125,
          status: 'idle'
        });

        store.resetCycle();

        const state = useTimerStore.getState();
        expect(state.currentRound).toBe(1);
        expect(state.phase).toBe('pomodoro');
        expect(state.status).toBe('idle');
        expect(state.remainingMs).toBe(25 * 60 * 1000);
        // dailyProgress và todayFocusMinutes KHÔNG được bị xóa
        expect(state.dailyProgress).toBe(5);
        expect(state.todayFocusMinutes).toBe(125);
      });

      it(`resetCycle() from Round ${startRound} while RUNNING cleanly stops timer, resets to Round 1 pomodoro idle`, () => {
        const store = useTimerStore.getState();
        store.setPhase('pomodoro', startRound);
        store.start();
        expect(useTimerStore.getState().status).toBe('running');
        expect(useTimerStore.getState().currentRound).toBe(startRound);

        // Advance 10 minutes into the session
        vi.advanceTimersByTime(10 * 60 * 1000);
        expect(useTimerStore.getState().remainingMs).toBe(15 * 60 * 1000);

        // Click resetCycle
        store.resetCycle();

        const state = useTimerStore.getState();
        expect(state.status).toBe('idle');
        expect(state.currentRound).toBe(1);
        expect(state.phase).toBe('pomodoro');
        expect(state.remainingMs).toBe(25 * 60 * 1000);

        // Advancing time should NOT decrease remainingMs (timer interval must be stopped)
        vi.advanceTimersByTime(5 * 60 * 1000);
        expect(useTimerStore.getState().remainingMs).toBe(25 * 60 * 1000);
      });

      it(`resetCycle() from Round ${startRound} while PAUSED cleanly resets to Round 1 pomodoro idle`, () => {
        const store = useTimerStore.getState();
        store.setPhase('pomodoro', startRound);
        store.start();
        vi.advanceTimersByTime(5 * 60 * 1000);
        store.pause();
        expect(useTimerStore.getState().status).toBe('paused');

        store.resetCycle();

        const state = useTimerStore.getState();
        expect(state.status).toBe('idle');
        expect(state.currentRound).toBe(1);
        expect(state.phase).toBe('pomodoro');
        expect(state.remainingMs).toBe(25 * 60 * 1000);
      });
    });

    it('TimerEngine low-level resetCycle() from Round 4 long_break resets state to Round 1 pomodoro 25:00', () => {
      const engine = new TimerEngine({ roundsBeforeLongBreak: 4, pomodoroMinutes: 25, longBreakMinutes: 15 });
      engine.setPhase('long_break', 4);
      engine.start();
      vi.advanceTimersByTime(3 * 60 * 1000);
      expect(engine.getStatus()).toBe('running');
      expect(engine.getRemainingMs()).toBe(12 * 60 * 1000);

      engine.resetCycle();

      expect(engine.getStatus()).toBe('idle');
      expect(engine.getCurrentRound()).toBe(1);
      expect(engine.getPhase()).toBe('pomodoro');
      expect(engine.getRemainingMs()).toBe(25 * 60 * 1000);
      engine.destroy();
    });
  });

  describe('Adversarial Focus 2: Empty Dots Rendering in UI (TimerWidget.tsx)', () => {
    it('renders all 4 dots as empty (bg-white/15) when status is idle at Round 1', () => {
      useTimerStore.setState({
        currentRound: 1,
        status: 'idle',
        phase: 'pomodoro'
      });

      render(<TimerWidget />);

      for (let i = 0; i < 4; i++) {
        const dot = screen.getByTestId(`round-dot-${i}`);
        expect(dot.className).toContain('bg-white/15');
        expect(dot.className).not.toContain('bg-rose-500');
        expect(dot.className).not.toContain('animate-pulse');
      }
    });

    it('renders dot 0 pulsing (bg-rose-400 animate-pulse) and dots 1..3 empty when Round 1 is running', () => {
      useTimerStore.setState({
        currentRound: 1,
        status: 'running',
        phase: 'pomodoro'
      });

      render(<TimerWidget />);

      const dot0 = screen.getByTestId('round-dot-0');
      expect(dot0.className).toContain('bg-rose-400');
      expect(dot0.className).toContain('animate-pulse');

      for (let i = 1; i < 4; i++) {
        const dot = screen.getByTestId(`round-dot-${i}`);
        expect(dot.className).toContain('bg-white/15');
        expect(dot.className).not.toContain('animate-pulse');
      }
    });

    it('renders dot 0 as completed (bg-rose-500) and dot 1 pulsing when Round 2 is running', () => {
      useTimerStore.setState({
        currentRound: 2,
        status: 'running',
        phase: 'pomodoro'
      });

      render(<TimerWidget />);

      const dot0 = screen.getByTestId('round-dot-0');
      expect(dot0.className).toContain('bg-rose-500');
      expect(dot0.className).not.toContain('animate-pulse');

      const dot1 = screen.getByTestId('round-dot-1');
      expect(dot1.className).toContain('bg-rose-400');
      expect(dot1.className).toContain('animate-pulse');

      expect(screen.getByTestId('round-dot-2').className).toContain('bg-white/15');
      expect(screen.getByTestId('round-dot-3').className).toContain('bg-white/15');
    });

    it('renders dots 0, 1, 2 as completed and dot 3 pulsing when Round 4 is running', () => {
      useTimerStore.setState({
        currentRound: 4,
        status: 'running',
        phase: 'pomodoro'
      });

      render(<TimerWidget />);

      expect(screen.getByTestId('round-dot-0').className).toContain('bg-rose-500');
      expect(screen.getByTestId('round-dot-1').className).toContain('bg-rose-500');
      expect(screen.getByTestId('round-dot-2').className).toContain('bg-rose-500');

      const dot3 = screen.getByTestId('round-dot-3');
      expect(dot3.className).toContain('bg-rose-400');
      expect(dot3.className).toContain('animate-pulse');
    });

    it('clicking "↺ Chu kỳ" button in UI resets Round 4 running back to 4 empty dots', () => {
      useTimerStore.setState({
        currentRound: 4,
        status: 'running',
        phase: 'pomodoro'
      });

      render(<TimerWidget />);

      const resetCycleBtn = screen.getByTestId('timer-reset-cycle-btn');
      act(() => {
        fireEvent.click(resetCycleBtn);
      });

      // Kiểm tra trạng thái store
      expect(useTimerStore.getState().currentRound).toBe(1);
      expect(useTimerStore.getState().status).toBe('idle');

      // Toàn bộ 4 chấm phải rỗng
      for (let i = 0; i < 4; i++) {
        const dot = screen.getByTestId(`round-dot-${i}`);
        expect(dot.className).toContain('bg-white/15');
        expect(dot.className).not.toContain('bg-rose-500');
        expect(dot.className).not.toContain('animate-pulse');
      }
    });

    it('clicking "Đặt lại" (Level 1) at Round 3 only resets time, retaining completed dots 0 & 1', () => {
      useTimerStore.setState({
        currentRound: 3,
        status: 'running',
        phase: 'pomodoro',
        remainingMs: 10 * 60 * 1000
      });

      render(<TimerWidget />);

      const resetBtn = screen.getByTestId('timer-reset-btn');
      act(() => {
        fireEvent.click(resetBtn);
      });

      expect(useTimerStore.getState().currentRound).toBe(3);
      expect(useTimerStore.getState().status).toBe('idle');

      // Chấm 0, 1 đã xong vẫn phải là bg-rose-500
      expect(screen.getByTestId('round-dot-0').className).toContain('bg-rose-500');
      expect(screen.getByTestId('round-dot-1').className).toContain('bg-rose-500');
      // Chấm 2 (hiệp 3 idle) và 3 là bg-white/15
      expect(screen.getByTestId('round-dot-2').className).toContain('bg-white/15');
      expect(screen.getByTestId('round-dot-3').className).toContain('bg-white/15');
    });
  });

  describe('Adversarial Focus 3: Break Session Isolation from Daily Progress', () => {
    it('completing a short break (00:00) NEVER increments dailyProgress or todayFocusMinutes', async () => {
      const store = useTimerStore.getState();
      store.updateSettings({ shortBreakMinutes: 1 });
      store.setPhase('short_break', 2);
      useTimerStore.setState({ dailyProgress: 3, todayFocusMinutes: 75, celebrationToast: null });

      store.start();
      expect(useTimerStore.getState().status).toBe('running');
      expect(useTimerStore.getState().phase).toBe('short_break');

      // Đếm ngược hết 1 phút nghỉ ngắn
      vi.advanceTimersByTime(60 * 1000);
      await Promise.resolve();

      // Invariants:
      expect(useTimerStore.getState().dailyProgress).toBe(3);
      expect(useTimerStore.getState().todayFocusMinutes).toBe(75);
      expect(useTimerStore.getState().celebrationToast).toBeNull();
    });

    it('completing a long break (00:00) NEVER increments dailyProgress or todayFocusMinutes', async () => {
      const store = useTimerStore.getState();
      store.updateSettings({ longBreakMinutes: 1 });
      store.setPhase('long_break', 4);
      useTimerStore.setState({ dailyProgress: 4, todayFocusMinutes: 100, celebrationToast: null });

      store.start();
      expect(useTimerStore.getState().status).toBe('running');
      expect(useTimerStore.getState().phase).toBe('long_break');

      // Đếm ngược hết 1 phút nghỉ dài
      vi.advanceTimersByTime(60 * 1000);
      await Promise.resolve();

      // Invariants:
      expect(useTimerStore.getState().dailyProgress).toBe(4);
      expect(useTimerStore.getState().todayFocusMinutes).toBe(100);
      expect(useTimerStore.getState().celebrationToast).toBeNull();
    });

    it('skipping a short break or long break never increments daily metrics', () => {
      const store = useTimerStore.getState();
      store.setPhase('short_break', 2);
      useTimerStore.setState({ dailyProgress: 2, todayFocusMinutes: 50 });

      store.skip();
      expect(useTimerStore.getState().dailyProgress).toBe(2);
      expect(useTimerStore.getState().todayFocusMinutes).toBe(50);
      expect(useTimerStore.getState().celebrationToast).toBeNull();

      store.setPhase('long_break', 4);
      store.skip();
      expect(useTimerStore.getState().dailyProgress).toBe(2);
      expect(useTimerStore.getState().todayFocusMinutes).toBe(50);
      expect(useTimerStore.getState().celebrationToast).toBeNull();
    });
  });

  describe('Adversarial Focus 4: Multi-Cycle Boundary Progression & Daily Progress Accumulation', () => {
    it('executes a full 4-round cycle (Pomodoro 1..4 + Breaks) and wraps from Round 4 long_break to Round 1', async () => {
      const store = useTimerStore.getState();
      store.updateSettings({
        pomodoroMinutes: 1,
        shortBreakMinutes: 1,
        longBreakMinutes: 1,
        roundsBeforeLongBreak: 4,
        autoTransition: true
      });
      useTimerStore.setState({ dailyProgress: 0, todayFocusMinutes: 0 });

      // Round 1: Pomodoro
      store.start();
      expect(useTimerStore.getState().currentRound).toBe(1);
      expect(useTimerStore.getState().phase).toBe('pomodoro');

      // Complete Pomodoro 1
      vi.advanceTimersByTime(60 * 1000);
      await Promise.resolve();
      expect(useTimerStore.getState().dailyProgress).toBe(1);
      expect(useTimerStore.getState().todayFocusMinutes).toBe(1);
      expect(useTimerStore.getState().phase).toBe('short_break');
      expect(useTimerStore.getState().currentRound).toBe(1);

      // Complete Short Break 1
      vi.advanceTimersByTime(60 * 1000);
      await Promise.resolve();
      expect(useTimerStore.getState().dailyProgress).toBe(1); // không tăng khi break
      expect(useTimerStore.getState().phase).toBe('pomodoro');
      expect(useTimerStore.getState().currentRound).toBe(2); // sang Round 2

      // Complete Pomodoro 2
      vi.advanceTimersByTime(60 * 1000);
      await Promise.resolve();
      expect(useTimerStore.getState().dailyProgress).toBe(2);
      expect(useTimerStore.getState().todayFocusMinutes).toBe(2);
      expect(useTimerStore.getState().phase).toBe('short_break');
      expect(useTimerStore.getState().currentRound).toBe(2);

      // Complete Short Break 2
      vi.advanceTimersByTime(60 * 1000);
      await Promise.resolve();
      expect(useTimerStore.getState().phase).toBe('pomodoro');
      expect(useTimerStore.getState().currentRound).toBe(3); // sang Round 3

      // Complete Pomodoro 3
      vi.advanceTimersByTime(60 * 1000);
      await Promise.resolve();
      expect(useTimerStore.getState().dailyProgress).toBe(3);
      expect(useTimerStore.getState().todayFocusMinutes).toBe(3);
      expect(useTimerStore.getState().phase).toBe('short_break');
      expect(useTimerStore.getState().currentRound).toBe(3);

      // Complete Short Break 3
      vi.advanceTimersByTime(60 * 1000);
      await Promise.resolve();
      expect(useTimerStore.getState().phase).toBe('pomodoro');
      expect(useTimerStore.getState().currentRound).toBe(4); // sang Round 4

      // Complete Pomodoro 4
      vi.advanceTimersByTime(60 * 1000);
      await Promise.resolve();
      expect(useTimerStore.getState().dailyProgress).toBe(4);
      expect(useTimerStore.getState().todayFocusMinutes).toBe(4);
      expect(useTimerStore.getState().phase).toBe('long_break'); // sang Long Break!
      expect(useTimerStore.getState().currentRound).toBe(4);

      // Complete Long Break 4
      vi.advanceTimersByTime(60 * 1000);
      await Promise.resolve();
      expect(useTimerStore.getState().dailyProgress).toBe(4); // không tăng khi long break
      // Quan trọng: Sau long break, chu kỳ quay về Round 1 pomodoro!
      expect(useTimerStore.getState().phase).toBe('pomodoro');
      expect(useTimerStore.getState().currentRound).toBe(1);

      // Bắt đầu chu kỳ 2: hoàn thành tiếp hiệp 1 của chu kỳ mới
      vi.advanceTimersByTime(60 * 1000);
      await Promise.resolve();
      expect(useTimerStore.getState().dailyProgress).toBe(5);
      expect(useTimerStore.getState().todayFocusMinutes).toBe(5);
    });

    it('clamps daily progress bar cleanly to 100% when dailyProgress exceeds target', () => {
      useTimerStore.setState({
        dailyProgress: 10,
        settings: { ...useTimerStore.getState().settings, roundsBeforeLongBreak: 4 }
      });

      render(<TimerWidget />);

      const text = screen.getByTestId('daily-progress-text');
      expect(text.textContent).toBe('10/8');

      const bar = screen.getByTestId('daily-progress-bar');
      expect(bar.style.width).toBe('100%');
    });
  });
});
