import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useTimerStore } from '../../src/stores/useTimerStore';
import { db } from '../../src/db';
import { TimerEngine, DEFAULT_SETTINGS } from '../../src/services/timerEngine';
import { getVietnamTodayDateKey } from '../../src/utils/timezone';
import { TimerSyncPayload } from '../../src/services/tabCoordinator';

describe('Milestone 1 Adversarial Challenger Stress Suite', () => {
  beforeEach(async () => {
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance']
    });
    localStorage.clear();
    await db.focus_sessions.clear();
    useTimerStore.getState().init();
    // Đảm bảo settings ban đầu luôn sạch sẽ và cô lập giữa các test
    useTimerStore.getState().updateSettings({
      pomodoroMinutes: 25,
      shortBreakMinutes: 5,
      longBreakMinutes: 15,
      roundsBeforeLongBreak: 4,
      autoTransition: false,
      notificationEnabled: false
    });
    useTimerStore.setState({
      dailyProgress: 0,
      todayFocusMinutes: 0,
      celebrationToast: null,
      currentRound: 1,
      phase: 'pomodoro',
      status: 'idle',
      remainingMs: 25 * 60 * 1000
    });
  });

  afterEach(() => {
    useTimerStore.getState().destroy();
    vi.useRealTimers();
  });

  // =========================================================================
  // 1. RAPID MODE SWITCHING & FLUTTER STRESS
  // =========================================================================
  describe('1. Rapid Mode Switching & Tab Flutter', () => {
    it('rapid tab switching preserves the final selected mode and duration', () => {
      const store = useTimerStore.getState();

      // Rapidly flutter between all three tabs
      store.setPhase('pomodoro');
      store.setPhase('short_break');
      store.setPhase('long_break');
      store.setPhase('pomodoro');
      store.setPhase('short_break');
      store.setPhase('long_break');

      const state = useTimerStore.getState();
      expect(state.phase).toBe('long_break');
      expect(state.remainingMs).toBe(15 * 60 * 1000);
      expect(state.status).toBe('idle');

      // Start long break
      store.start();
      const runningState = useTimerStore.getState();
      expect(runningState.phase).toBe('long_break');
      expect(runningState.status).toBe('running');
      expect(runningState.remainingMs).toBe(15 * 60 * 1000);

      // Verify that after 120 seconds, remaining time is exactly 13:00 (15m - 2m)
      vi.advanceTimersByTime(120 * 1000);
      expect(useTimerStore.getState().phase).toBe('long_break');
      expect(useTimerStore.getState().remainingMs).toBe(13 * 60 * 1000);
    });

    it('rapid pause/resume/pause/resume cycle preserves remaining time without drift', () => {
      const store = useTimerStore.getState();
      store.setPhase('long_break');
      store.start();

      // Run 30s -> Remaining 14:30
      vi.advanceTimersByTime(30 * 1000);
      expect(useTimerStore.getState().remainingMs).toBe(14.5 * 60 * 1000);

      // Rapidly toggle pause and resume 10 times with arbitrary idle delays
      for (let i = 0; i < 10; i++) {
        store.pause();
        expect(useTimerStore.getState().status).toBe('paused');
        vi.advanceTimersByTime(15 * 1000); // 15 seconds spent paused (should not decrease remainingMs)
        expect(useTimerStore.getState().remainingMs).toBe(14.5 * 60 * 1000);

        store.resume();
        expect(useTimerStore.getState().status).toBe('running');
      }

      // After 10 pause-resume cycles, run for another 30 seconds
      vi.advanceTimersByTime(30 * 1000);
      // Total elapsed run time is 30s + 30s = 60s -> Remaining must be exactly 14:00 (840,000 ms)
      expect(useTimerStore.getState().remainingMs).toBe(14 * 60 * 1000);
    });

    it('calling start() repeatedly while running is idempotent and does not reset targetEndTime', () => {
      const store = useTimerStore.getState();
      store.setPhase('long_break');
      store.start();

      vi.advanceTimersByTime(60 * 1000);
      expect(useTimerStore.getState().remainingMs).toBe(14 * 60 * 1000);

      // Duplicate start calls
      store.start();
      store.start();
      store.start();

      // RemainingMs must NOT reset back to 15:00
      expect(useTimerStore.getState().remainingMs).toBe(14 * 60 * 1000);
      expect(useTimerStore.getState().status).toBe('running');
    });
  });

  // =========================================================================
  // 2. CUSTOM SETTINGS OVERRIDES & DURATION PERSISTENCE
  // =========================================================================
  describe('2. Custom Settings Overrides', () => {
    it('custom longBreakMinutes (e.g. 30 mins) is strictly honored when starting long break', () => {
      const store = useTimerStore.getState();

      // Configure custom durations
      store.updateSettings({
        pomodoroMinutes: 45,
        shortBreakMinutes: 8,
        longBreakMinutes: 30,
        roundsBeforeLongBreak: 3
      });

      // Select Long Break tab
      store.setPhase('long_break');
      expect(useTimerStore.getState().remainingMs).toBe(30 * 60 * 1000);

      // Start timer
      store.start();
      expect(useTimerStore.getState().phase).toBe('long_break');
      expect(useTimerStore.getState().status).toBe('running');
      expect(useTimerStore.getState().remainingMs).toBe(30 * 60 * 1000);

      // Advance by 10 minutes (600,000 ms)
      vi.advanceTimersByTime(10 * 60 * 1000);
      expect(useTimerStore.getState().remainingMs).toBe(20 * 60 * 1000);
    });

    it('updating settings while timer is running does not corrupt active session remaining time', () => {
      const store = useTimerStore.getState();
      store.updateSettings({ pomodoroMinutes: 25 });
      store.start();

      vi.advanceTimersByTime(5 * 60 * 1000);
      expect(useTimerStore.getState().remainingMs).toBe(20 * 60 * 1000);

      // Change settings to 50 minutes mid-session
      store.updateSettings({ pomodoroMinutes: 50 });

      // Active remaining time remains 20 minutes (not jumped to 45 or 50)
      expect(useTimerStore.getState().remainingMs).toBe(20 * 60 * 1000);

      // But when reset() is clicked, it adopts the new 50 minutes setting
      store.reset();
      expect(useTimerStore.getState().status).toBe('idle');
      expect(useTimerStore.getState().remainingMs).toBe(50 * 60 * 1000);
    });
  });

  // =========================================================================
  // 3. TWO-LEVEL RESET & CYCLE STATE INVARIANTS
  // =========================================================================
  describe('3. Two-Level Reset State Invariants', () => {
    it('Level 1 reset retains currentRound across pomodoro, short_break, and long_break', () => {
      const store = useTimerStore.getState();

      // Test in round 3 short_break (5 mins default)
      store.setPhase('short_break', 3);
      store.start();
      vi.advanceTimersByTime(2 * 60 * 1000);
      expect(useTimerStore.getState().remainingMs).toBe(3 * 60 * 1000);

      store.reset();
      expect(useTimerStore.getState().status).toBe('idle');
      expect(useTimerStore.getState().currentRound).toBe(3);
      expect(useTimerStore.getState().phase).toBe('short_break');
      expect(useTimerStore.getState().remainingMs).toBe(5 * 60 * 1000);

      // Test in round 4 long_break (15 mins default)
      store.setPhase('long_break', 4);
      store.start();
      vi.advanceTimersByTime(5 * 60 * 1000);
      expect(useTimerStore.getState().remainingMs).toBe(10 * 60 * 1000);

      store.reset();
      expect(useTimerStore.getState().status).toBe('idle');
      expect(useTimerStore.getState().currentRound).toBe(4);
      expect(useTimerStore.getState().phase).toBe('long_break');
      expect(useTimerStore.getState().remainingMs).toBe(15 * 60 * 1000);
    });

    it('Level 2 resetCycle() resets round to 1 and phase to pomodoro from ANY state', () => {
      const store = useTimerStore.getState();

      // From running round 4 long break
      store.setPhase('long_break', 4);
      store.start();
      vi.advanceTimersByTime(3 * 60 * 1000);

      store.resetCycle();
      expect(useTimerStore.getState().status).toBe('idle');
      expect(useTimerStore.getState().currentRound).toBe(1);
      expect(useTimerStore.getState().phase).toBe('pomodoro');
      expect(useTimerStore.getState().remainingMs).toBe(25 * 60 * 1000);

      // From paused round 3 short break
      store.setPhase('short_break', 3);
      store.start();
      store.pause();

      store.resetCycle();
      expect(useTimerStore.getState().status).toBe('idle');
      expect(useTimerStore.getState().currentRound).toBe(1);
      expect(useTimerStore.getState().phase).toBe('pomodoro');
      expect(useTimerStore.getState().remainingMs).toBe(25 * 60 * 1000);
    });
  });

  // =========================================================================
  // 4. TIMING ACCURACY, DRIFT & WALL-CLOCK DEADLINE RESILIENCE
  // =========================================================================
  describe('4. Timing Accuracy, Drift & Wall-Clock Resilience', () => {
    it('wall-clock calculation eliminates tick interval drift over long spans', () => {
      const engine = new TimerEngine({ pomodoroMinutes: 25 });
      const startTime = 1700000000000;
      vi.setSystemTime(startTime);

      engine.start();

      // Simulate irregular interval firings (e.g. 230ms, 190ms, 400ms due to CPU load)
      let elapsed = 0;
      const jitterSteps = [230, 190, 400, 310, 150, 720, 500];
      for (const step of jitterSteps) {
        elapsed += step;
        vi.setSystemTime(startTime + elapsed);
        engine.tick();
      }

      // Check remainingMs: MUST match exact wall-clock difference, NOT naive step accumulation
      expect(engine.getRemainingMs()).toBe(25 * 60 * 1000 - elapsed);
      engine.destroy();
    });

    it('system sleep or long tab suspension past targetEndTime triggers clean completion', () => {
      const onCompleteMock = vi.fn();
      const engine = new TimerEngine(
        { pomodoroMinutes: 25, roundsBeforeLongBreak: 4, autoTransition: false },
        { onComplete: onCompleteMock }
      );
      const startTime = 1700000000000;
      vi.setSystemTime(startTime);

      engine.start();

      // Simulate system sleep: wake up 2 hours later
      vi.setSystemTime(startTime + 2 * 3600 * 1000);
      engine.tick();

      // Timer completes, records session, transitions to idle awaiting next phase
      expect(engine.getStatus()).toBe('idle');
      expect(engine.getPhase()).toBe('short_break');
      expect(engine.getRemainingMs()).toBe(5 * 60 * 1000);
      expect(onCompleteMock).toHaveBeenCalledTimes(1);

      const [record, nextPhase] = onCompleteMock.mock.calls[0];
      expect(record.phase).toBe('pomodoro');
      expect(record.durationMinutes).toBe(25);
      expect(nextPhase).toBe('short_break');

      engine.destroy();
    });
  });

  // =========================================================================
  // 5. FULL 4-ROUND CYCLE WITH WRAP-AROUND & AUTO-TRANSITION
  // =========================================================================
  describe('5. Full 4-Round Cycle & Wrap-around', () => {
    it('full 4-round progression correctly reaches long_break and then wraps to round 1 pomodoro', () => {
      const phasesSeen: { phase: string; round: number }[] = [];
      const engine = new TimerEngine(
        {
          pomodoroMinutes: 1,
          shortBreakMinutes: 1,
          longBreakMinutes: 1,
          roundsBeforeLongBreak: 4,
          autoTransition: false
        },
        {
          onComplete: (record, nextPhase) => {
            phasesSeen.push({ phase: record.phase, round: engine.getCurrentRound() });
          }
        }
      );

      const runPhaseToCompletion = () => {
        engine.start();
        vi.advanceTimersByTime(60 * 1000);
        engine.tick();
      };

      // Round 1: Pomodoro -> Short Break
      expect(engine.getCurrentRound()).toBe(1);
      expect(engine.getPhase()).toBe('pomodoro');
      runPhaseToCompletion();
      expect(engine.getPhase()).toBe('short_break');
      expect(engine.getCurrentRound()).toBe(1);

      // Round 1: Short Break -> Pomodoro 2
      runPhaseToCompletion();
      expect(engine.getPhase()).toBe('pomodoro');
      expect(engine.getCurrentRound()).toBe(2);

      // Round 2: Pomodoro -> Short Break
      runPhaseToCompletion();
      expect(engine.getPhase()).toBe('short_break');
      expect(engine.getCurrentRound()).toBe(2);

      // Round 2: Short Break -> Pomodoro 3
      runPhaseToCompletion();
      expect(engine.getPhase()).toBe('pomodoro');
      expect(engine.getCurrentRound()).toBe(3);

      // Round 3: Pomodoro -> Short Break
      runPhaseToCompletion();
      expect(engine.getPhase()).toBe('short_break');
      expect(engine.getCurrentRound()).toBe(3);

      // Round 3: Short Break -> Pomodoro 4
      runPhaseToCompletion();
      expect(engine.getPhase()).toBe('pomodoro');
      expect(engine.getCurrentRound()).toBe(4);

      // Round 4: Pomodoro -> Long Break!
      runPhaseToCompletion();
      expect(engine.getPhase()).toBe('long_break');
      expect(engine.getCurrentRound()).toBe(4);

      // Round 4: Long Break -> Wrap around to Round 1 Pomodoro!
      runPhaseToCompletion();
      expect(engine.getPhase()).toBe('pomodoro');
      expect(engine.getCurrentRound()).toBe(1);

      // Verify sequence of completed records
      expect(phasesSeen.map(p => p.phase)).toEqual([
        'pomodoro',
        'short_break',
        'pomodoro',
        'short_break',
        'pomodoro',
        'short_break',
        'pomodoro',
        'long_break'
      ]);

      engine.destroy();
    });
  });

  // =========================================================================
  // 6. MULTI-TAB SYNCHRONIZATION ORACLE
  // =========================================================================
  describe('6. Multi-Tab Synchronization Oracle', () => {
    it('follower tab correctly syncs set_phase and reset_cycle broadcast payloads', () => {
      const leaderEngine = new TimerEngine({ pomodoroMinutes: 25, longBreakMinutes: 15 });
      const followerEngine = new TimerEngine({ pomodoroMinutes: 25, longBreakMinutes: 15 });

      // 1. Leader selects long break
      leaderEngine.setPhase('long_break', 2);
      const snapshot1: TimerSyncPayload = leaderEngine.getSnapshot();
      snapshot1.fromLeader = true;

      // Follower syncs
      followerEngine.syncFromSnapshot(snapshot1);
      expect(followerEngine.getPhase()).toBe('long_break');
      expect(followerEngine.getCurrentRound()).toBe(2);
      expect(followerEngine.getRemainingMs()).toBe(15 * 60 * 1000);

      // 2. Leader resets cycle
      leaderEngine.resetCycle();
      const snapshot2: TimerSyncPayload = leaderEngine.getSnapshot();
      snapshot2.fromLeader = true;

      followerEngine.syncFromSnapshot(snapshot2);
      expect(followerEngine.getPhase()).toBe('pomodoro');
      expect(followerEngine.getCurrentRound()).toBe(1);
      expect(followerEngine.getStatus()).toBe('idle');
      expect(followerEngine.getRemainingMs()).toBe(25 * 60 * 1000);

      leaderEngine.destroy();
      followerEngine.destroy();
    });
  });

  // =========================================================================
  // 7. DAILY STATS ACCUMULATION UNDER ARBITRARY DURATIONS
  // =========================================================================
  describe('7. Daily Stats Accumulation', () => {
    it('custom duration sessions (e.g. 15m focus) accumulate the exact configured minutes across pomodoro sessions', async () => {
      const store = useTimerStore.getState();
      store.updateSettings({ pomodoroMinutes: 15, shortBreakMinutes: 5 });
      useTimerStore.setState({ dailyProgress: 0, todayFocusMinutes: 0 });

      // Pomodoro Session 1
      store.start();
      vi.advanceTimersByTime(15 * 60 * 1000);
      await Promise.resolve();

      expect(useTimerStore.getState().dailyProgress).toBe(1);
      expect(useTimerStore.getState().todayFocusMinutes).toBe(15);
      expect(useTimerStore.getState().celebrationToast).toBe('🎉 Tuyệt vời! Bạn vừa hoàn thành 1 hiệp tập trung!');
      expect(useTimerStore.getState().phase).toBe('short_break');

      // Now complete the short break (5m)
      store.start();
      vi.advanceTimersByTime(5 * 60 * 1000);
      await Promise.resolve();

      // Break completion should NOT increment daily progress
      expect(useTimerStore.getState().dailyProgress).toBe(1);
      expect(useTimerStore.getState().todayFocusMinutes).toBe(15);
      expect(useTimerStore.getState().phase).toBe('pomodoro');

      // Pomodoro Session 2
      store.start();
      vi.advanceTimersByTime(15 * 60 * 1000);
      await Promise.resolve();

      // Daily progress increases to 2, focus minutes to 30
      expect(useTimerStore.getState().dailyProgress).toBe(2);
      expect(useTimerStore.getState().todayFocusMinutes).toBe(30);
    });
  });
});
