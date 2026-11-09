import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useTimerStore } from '../../src/stores/useTimerStore';
import { db } from '../../src/db';
import { TimerEngine } from '../../src/services/timerEngine';
import { getVietnamTodayDateKey } from '../../src/utils/timezone';

describe('Timer State Machine v6.4 Unit Tests', () => {
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

  describe('1. Chế độ Nghỉ dài chạy đúng 15:00 khi bấm Start', () => {
    it('bảo toàn chính xác currentMode long_break và đếm ngược từ 15:00 khi bấm Start', () => {
      const store = useTimerStore.getState();

      // Chuyển sang Nghỉ dài
      store.setPhase('long_break');
      expect(useTimerStore.getState().phase).toBe('long_break');
      expect(useTimerStore.getState().remainingMs).toBe(15 * 60 * 1000);

      // Bấm Bắt đầu
      store.start();
      expect(useTimerStore.getState().phase).toBe('long_break');
      expect(useTimerStore.getState().status).toBe('running');
      expect(useTimerStore.getState().remainingMs).toBe(15 * 60 * 1000);

      // Chạy 1 phút -> Phải còn 14 phút của Nghỉ dài, tuyệt đối không nhảy về 4 phút của Nghỉ ngắn
      vi.advanceTimersByTime(60 * 1000);
      expect(useTimerStore.getState().phase).toBe('long_break');
      expect(useTimerStore.getState().remainingMs).toBe(14 * 60 * 1000);
    });
  });

  describe('2. Two-Level Reset: Reset Hiệp vs Reset Toàn Bộ Chu Kỳ', () => {
    it('Reset đơn chỉ đưa thời gian hiệp hiện tại về đầu hiệp và bảo toàn số hiệp', () => {
      const store = useTimerStore.getState();

      // Giả lập đang ở Hiệp 2
      useTimerStore.setState({ currentRound: 2 });
      store.start();
      vi.advanceTimersByTime(5 * 60 * 1000);
      expect(useTimerStore.getState().remainingMs).toBe(20 * 60 * 1000);

      // Bấm Đặt lại hiệp (Level 1)
      store.reset();
      expect(useTimerStore.getState().status).toBe('idle');
      expect(useTimerStore.getState().currentRound).toBe(2);
      expect(useTimerStore.getState().remainingMs).toBe(25 * 60 * 1000);
    });

    it('Reset toàn bộ chu kỳ đưa số hiệp về Hiệp 1/4 và thời gian về 25:00', () => {
      const store = useTimerStore.getState();

      // Giả lập đang ở Hiệp 3 và đang ở phase short_break
      useTimerStore.setState({ currentRound: 3, phase: 'short_break' });
      store.resetCycle();

      expect(useTimerStore.getState().status).toBe('idle');
      expect(useTimerStore.getState().currentRound).toBe(1);
      expect(useTimerStore.getState().phase).toBe('pomodoro');
      expect(useTimerStore.getState().remainingMs).toBe(25 * 60 * 1000);
    });

    it('TimerEngine trực tiếp hỗ trợ resetCycle() khôi phục round 1 và phase pomodoro', () => {
      const engine = new TimerEngine({ roundsBeforeLongBreak: 4 });
      engine.setPhase('short_break', 3);
      expect(engine.getCurrentRound()).toBe(3);
      expect(engine.getPhase()).toBe('short_break');

      engine.resetCycle();
      expect(engine.getCurrentRound()).toBe(1);
      expect(engine.getPhase()).toBe('pomodoro');
      expect(engine.getStatus()).toBe('idle');
      expect(engine.getRemainingMs()).toBe(25 * 60 * 1000);
      engine.destroy();
    });
  });

  describe('3. Tiến độ ngày tăng khi hết giờ 00:00 & Thông báo Toast chúc mừng', () => {
    it('khi đếm ngược về 00:00, tự động tăng dailyProgress, cộng phút học và bật celebration toast', async () => {
      const store = useTimerStore.getState();

      // Đặt thời lượng 1 phút để test nhanh
      store.updateSettings({ pomodoroMinutes: 1 });
      useTimerStore.setState({ dailyProgress: 1, todayFocusMinutes: 25 });

      store.start();
      expect(useTimerStore.getState().remainingMs).toBe(60 * 1000);

      // Cho hết 60 giây (đếm ngược về 00:00)
      vi.advanceTimersByTime(60 * 1000);
      await Promise.resolve(); // drain microtasks

      // Xác nhận tiến độ ngày tăng từ 1 lên 2
      expect(useTimerStore.getState().dailyProgress).toBe(2);
      // Xác nhận tổng phút học hôm nay tăng thêm 1 phút
      expect(useTimerStore.getState().todayFocusMinutes).toBe(26);
      // Xác nhận banner chúc mừng xuất hiện
      expect(useTimerStore.getState().celebrationToast).toBe('🎉 Tuyệt vời! Bạn vừa hoàn thành 1 hiệp tập trung!');

      // Sau 6 giây toast tự đóng
      vi.advanceTimersByTime(6000);
      expect(useTimerStore.getState().celebrationToast).toBeNull();
    });

    it('hoàn thành hiệp nghỉ (break) không làm tăng dailyProgress của Pomodoro', async () => {
      const store = useTimerStore.getState();
      store.updateSettings({ shortBreakMinutes: 1 });
      store.setPhase('short_break');
      useTimerStore.setState({ dailyProgress: 2, todayFocusMinutes: 26 });

      store.start();
      vi.advanceTimersByTime(60 * 1000);
      await Promise.resolve();

      // dailyProgress vẫn là 2, không tăng khi hết giờ nghỉ
      expect(useTimerStore.getState().dailyProgress).toBe(2);
      expect(useTimerStore.getState().todayFocusMinutes).toBe(26);
    });

    it('sử dụng ngày định dạng timezone Việt Nam khi lưu phiên hoàn tất', () => {
      const todayKey = getVietnamTodayDateKey();
      expect(todayKey).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});
