import 'fake-indexeddb/auto';
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { MobileFocusView, STRICT_GRACE_PERIOD_MS } from '../../src/components/mobile/views/MobileFocusView';
import { MobileAppShell } from '../../src/components/mobile/MobileAppShell';
import { useTimerStore } from '../../src/stores/useTimerStore';
import { useTaskStore } from '../../src/stores/useTaskStore';
import { useLayoutStore } from '../../src/stores/useLayoutStore';
import { useAudioStore } from '../../src/stores/useAudioStore';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { db } from '../../src/db';
import { getVietnamTodayDateKey } from '../../src/utils/timezone';
import { ALL_AMBIENT_TRACKS } from '../../src/data/ambientTracks';

async function resetV80TestState() {
  localStorage.clear();
  sessionStorage.clear();
  try {
    await db.focus_sessions.clear();
    await db.tasks.clear();
  } catch {
    // Ignore if IDB isn't mounted in isolated worker
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
    isZenMode: false,
  });

  useAudioStore.getState().stopAllTracks();
  useAudioStore.setState({
    tracks: ALL_AMBIENT_TRACKS.map((t) => ({ ...t, isPlaying: false })),
  });
}

describe('PomoFocus V8.0 — All-in-One Focus Hub, Strict Mode, Daily Flow & Soundscape Mixer', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    Object.defineProperty(navigator, 'vibrate', {
      configurable: true,
      writable: true,
      value: vi.fn(),
    });
    await resetV80TestState();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('1. 1-Tap Quick Task Bar & Inline Picker', () => {
    it('1.1 renders linked task title, x/y tomato badge, and completes task in 1 tap with jade burst', async () => {
      const toggleSpy = vi.fn().mockImplementation(async (id: string) => {
        useTaskStore.setState((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id ? { ...t, status: t.status === 'completed' ? 'todo' : 'completed' } : t
          ),
        }));
      });

      useTaskStore.setState({
        tasks: [
          {
            id: 'task-v8-1',
            title: 'Hoàn thiện báo cáo V8.0',
            status: 'todo',
            priority: 'p1',
            completedPomodoros: 2,
            estimatedPomodoros: 4,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ],
        toggleTaskComplete: toggleSpy as any,
      });

      useTimerStore.setState({
        linkedTaskId: 'task-v8-1',
        linkedTaskTitle: 'Hoàn thiện báo cáo V8.0',
      });

      render(<MobileFocusView />);

      const chip = screen.getByTestId('mobile-linked-task-chip');
      expect(chip.textContent).toContain('Hoàn thiện báo cáo V8.0');
      expect(chip.textContent).toContain('2/4 🍅');

      const completeBtn = screen.getByTestId('mobile-quick-task-complete-btn');
      await act(async () => {
        fireEvent.click(completeBtn);
      });

      expect(toggleSpy).toHaveBeenCalledWith('task-v8-1');
      expect(useTaskStore.getState().tasks[0].status).toBe('completed');
      expect(completeBtn.className).toContain('animate-jade-burst');
      expect(navigator.vibrate).toHaveBeenCalledWith([10, 25, 16]);
    });

    it('1.2 clicking task chip in MobileAppShell opens inline dropdown without switching away from Focus tab', async () => {
      const linkSpy = vi.fn().mockImplementation((id: string | null) => {
        const t = useTaskStore.getState().tasks.find((item) => item.id === id) ?? null;
        useTimerStore.setState({
          linkedTaskId: t?.id ?? null,
          linkedTaskTitle: t?.title ?? null,
        });
      });

      useTaskStore.setState({
        tasks: [
          {
            id: 'task-a',
            title: 'Ôn thi Giải Tích',
            status: 'todo',
            priority: 'p1',
            completedPomodoros: 1,
            estimatedPomodoros: 3,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
          {
            id: 'task-b',
            title: 'Đọc sách Design',
            status: 'todo',
            priority: 'p2',
            completedPomodoros: 0,
            estimatedPomodoros: 2,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ],
        linkTaskToTimer: linkSpy as any,
      });

      render(<MobileAppShell />);

      // Remain on focus tab while opening inline dropdown
      const chip = screen.getByTestId('mobile-linked-task-chip');
      fireEvent.click(chip);

      expect(useLayoutStore.getState().activeMobileTab).toBe('focus');
      const dropdown = screen.getByTestId('mobile-task-picker-dropdown');
      expect(dropdown).toBeDefined();
      expect(dropdown.textContent).toContain('Ôn thi Giải Tích');
      expect(dropdown.textContent).toContain('Đọc sách Design');

      // Select task-b in-place
      fireEvent.click(screen.getByText('Đọc sách Design'));
      expect(linkSpy).toHaveBeenCalledWith('task-b');
      expect(screen.queryByTestId('mobile-task-picker-dropdown')).toBeNull();
      expect(screen.getByTestId('mobile-linked-task-chip').textContent).toContain('Đọc sách Design');

      // Re-open dropdown and click manage button to jump to Tasks tab
      fireEvent.click(screen.getByTestId('mobile-linked-task-chip'));
      fireEvent.click(screen.getByTestId('mobile-picker-manage-tasks-btn'));
      expect(useLayoutStore.getState().activeMobileTab).toBe('tasks');
    });
  });

  describe('2. Strict Mode (Kỷ luật - Soft-Penalty 5s Grace Period)', () => {
    function setVisibilityState(state: 'visible' | 'hidden') {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => state,
      });
      document.dispatchEvent(new Event('visibilitychange'));
    }

    it('2.1 allows brief switches under 5 seconds grace period without breaking session', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-11-11T09:00:00+07:00'));

      render(<MobileFocusView />);

      const strictToggle = screen.getByTestId('mobile-strict-mode-toggle');
      fireEvent.click(strictToggle);
      expect(strictToggle.getAttribute('aria-pressed')).toBe('true');

      useTimerStore.setState({ phase: 'pomodoro', status: 'running', remainingMs: 24 * 60 * 1000 });

      act(() => {
        setVisibilityState('hidden');
        vi.advanceTimersByTime(STRICT_GRACE_PERIOD_MS - 800);
        setVisibilityState('visible');
      });

      expect(useTimerStore.getState().status).toBe('running');
      expect(screen.queryByTestId('mobile-strict-violation-banner')).toBeNull();
    });

    it('2.2 triggers 3-pulse vibration, cancels session with 0 tomatoes & shows banner when away > 5s during pomodoro', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-11-11T09:00:00+07:00'));

      render(<MobileFocusView />);

      fireEvent.click(screen.getByTestId('mobile-strict-mode-toggle'));
      useTimerStore.setState({
        phase: 'pomodoro',
        status: 'running',
        remainingMs: 20 * 60 * 1000,
        dailyProgress: 1,
      });

      act(() => {
        setVisibilityState('hidden');
        vi.advanceTimersByTime(STRICT_GRACE_PERIOD_MS + 750);
        setVisibilityState('visible');
      });

      expect(navigator.vibrate).toHaveBeenCalledWith([150, 80, 150, 80, 150]);
      expect(useTimerStore.getState().status).toBe('idle');
      expect(useTimerStore.getState().dailyProgress).toBe(1); // 0 new tomatoes awarded!
      expect(screen.getByTestId('mobile-strict-violation-banner').textContent).toContain(
        'Hiệp tập trung đã bị hủy vì rời ứng dụng quá 5 giây'
      );
    });

    it('2.3 does NOT penalize leaving app > 5s during short_break phase', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-11-11T09:00:00+07:00'));

      render(<MobileFocusView />);

      fireEvent.click(screen.getByTestId('mobile-strict-mode-toggle'));
      useTimerStore.setState({ phase: 'short_break', status: 'running', remainingMs: 4 * 60 * 1000 });

      act(() => {
        setVisibilityState('hidden');
        vi.advanceTimersByTime(8000);
        setVisibilityState('visible');
      });

      expect(useTimerStore.getState().status).toBe('running');
      expect(screen.queryByTestId('mobile-strict-violation-banner')).toBeNull();
    });
  });

  describe('3. Bottom Daily Flow Strip (24h Vietnam Timeline)', () => {
    it('3.1 renders 24 hour segments, lights up completed focus hours in Vietnam TZ, and displays daily total', async () => {
      const todayKey = getVietnamTodayDateKey();
      const hour9Ts = new Date(`${todayKey}T09:30:00+07:00`).getTime();
      const hour14Ts = new Date(`${todayKey}T14:45:00+07:00`).getTime();

      await db.focus_sessions.bulkAdd([
        {
          id: 'sess-1',
          phase: 'pomodoro',
          durationMinutes: 25,
          completedAt: hour9Ts,
          dateString: todayKey,
        },
        {
          id: 'sess-2',
          phase: 'pomodoro',
          durationMinutes: 25,
          completedAt: hour14Ts,
          dateString: todayKey,
        },
        {
          id: 'sess-3',
          phase: 'pomodoro',
          durationMinutes: 25,
          completedAt: hour14Ts + 60000,
          dateString: todayKey,
        },
      ]);

      render(<MobileFocusView />);

      const strip = screen.getByTestId('mobile-daily-flow-strip');
      expect(strip).toBeDefined();

      await waitFor(() => {
        expect(screen.getByTestId('mobile-daily-flow-summary').textContent).toContain(
          'Hôm nay: 1g 15ph • 3 🍅 hoàn thành'
        );
      });

      const hour9Bar = screen.getByTestId('mobile-flow-hour-9');
      const hour14Bar = screen.getByTestId('mobile-flow-hour-14');
      const hour3Bar = screen.getByTestId('mobile-flow-hour-3');

      expect(hour9Bar.getAttribute('data-active')).toBe('true');
      expect(hour9Bar.className).toContain('bg-emerald-400');
      expect(hour14Bar.getAttribute('data-active')).toBe('true');
      expect(hour3Bar.getAttribute('data-active')).toBe('false');
    });
  });

  describe('4. Spaces Tab — Dual Sub-Tabs ([ Nền & Hiệu ứng ] | [ Mixer Âm thanh ])', () => {
    it('4.1 switches between background gallery and 25-track Soundscape Mixer with live volume controls', async () => {
      const toggleTrackSpy = vi.fn().mockImplementation(async (id: string) => {
        useAudioStore.setState((state) => ({
          tracks: state.tracks.map((t) =>
            t.id === id ? { ...t, isPlaying: !t.isPlaying } : t
          ),
        }));
      });
      const setVolSpy = vi.fn().mockImplementation((id: string, vol: number) => {
        useAudioStore.setState((state) => ({
          tracks: state.tracks.map((t) => (t.id === id ? { ...t, volume: vol } : t)),
        }));
      });
      const stopAllSpy = vi.fn().mockImplementation(() => {
        useAudioStore.setState((state) => ({
          tracks: state.tracks.map((t) => ({ ...t, isPlaying: false })),
        }));
      });

      useAudioStore.setState({
        toggleTrack: toggleTrackSpy as any,
        setTrackVolume: setVolSpy as any,
        stopAllTracks: stopAllSpy as any,
      });

      useLayoutStore.setState({ activeMobileTab: 'spaces' });
      render(<MobileAppShell />);

      // Default sub-tab is Background & Effects
      expect(screen.getByTestId('mobile-spaces-subtab-bg').getAttribute('aria-selected')).toBe('true');
      expect(screen.queryByTestId('mobile-audio-mixer-panel')).toBeNull();

      // Switch to Mixer Âm thanh
      fireEvent.click(screen.getByTestId('mobile-spaces-subtab-audio'));
      expect(screen.getByTestId('mobile-audio-mixer-panel')).toBeDefined();

      // Verify category filters & 25 tracks render in 'Tất Cả'
      expect(screen.getByTestId('mobile-mixer-track-rain')).toBeDefined();
      expect(screen.getByTestId('mobile-mixer-track-binaural_gamma')).toBeDefined();

      // Toggle 'rain' track playback & change volume
      await act(async () => {
        fireEvent.click(screen.getByTestId('mobile-mixer-toggle-rain'));
      });
      expect(toggleTrackSpy).toHaveBeenCalledWith('rain');
      expect(screen.getByTestId('mobile-mixer-active-badge').textContent).toBe('1');

      const rainSlider = screen.getByTestId('mobile-mixer-volume-rain') as HTMLInputElement;
      fireEvent.change(rainSlider, { target: { value: '85' } });
      expect(setVolSpy).toHaveBeenCalledWith('rain', 0.85);

      // Filter by Binaural waves
      fireEvent.click(screen.getByTestId('mobile-mixer-cat-binaural'));
      expect(screen.queryByTestId('mobile-mixer-track-rain')).toBeNull();
      expect(screen.getByTestId('mobile-mixer-track-binaural_alpha')).toBeDefined();

      // Stop all tracks
      fireEvent.click(screen.getByTestId('mobile-mixer-stop-all-btn'));
      expect(stopAllSpy).toHaveBeenCalled();
      expect(screen.queryByTestId('mobile-mixer-active-badge')).toBeNull();
    });
  });

  describe('5. Playbook Architecture & Safe Area Invariants', () => {
    it('5.1 MobileFocusView retains monumental drop-shadow, 64px circle play CTA, and overflow-hidden', () => {
      render(<MobileFocusView />);
      const root = screen.getByTestId('mobile-focus-view');
      const timer = screen.getByTestId('mobile-monumental-timer');
      const mainBtn = screen.getByTestId('mobile-timer-main-action');

      expect(root.className).toMatch(/overflow-(?:x-)?hidden/);
      expect(timer.className).toContain('drop-shadow-[0_4px_30px_rgba(52,211,153,0.25)]');
      expect(mainBtn.className).toContain('w-16');
      expect(mainBtn.className).toContain('h-16');
      expect(mainBtn.className).toContain('rounded-full');
    });

    it('5.2 authenticated VIP account sees zero upgrade banners in MobileAppShell', () => {
      useAuthStore.setState({
        user: { id: 'founder-1', email: 'namho03052k9@gmail.com' } as any,
        profile: { plan_tier: 'founder', ai_credits_balance: 999 } as any,
      });

      render(<MobileAppShell />);
      expect(screen.queryByText(/Nâng cấp Pro/i)).toBeNull();
    });
  });
});
