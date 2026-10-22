import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TimerEngine } from '../../src/services/timerEngine';
import { db, recordFocusSessionAtomic } from '../../src/db';
import { FocusSessionRecord } from '../../src/types/timer';

describe('TimerEngine Core Unit Tests', () => {
  let engine: TimerEngine;

  beforeEach(() => {
    // Cấu hình fake timers cho cả Date và performance để đồng bộ
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance']
    });
    localStorage.clear();
    engine = new TimerEngine({
      pomodoroMinutes: 25,
      shortBreakMinutes: 5,
      longBreakMinutes: 15,
      roundsBeforeLongBreak: 4,
      autoTransition: false
    });
  });

  afterEach(() => {
    engine.destroy();
    vi.useRealTimers();
  });

  it('1. Khởi tạo ở trạng thái IDLE với đầy đủ thời gian 25 phút', () => {
    expect(engine.getStatus()).toBe('idle');
    expect(engine.getPhase()).toBe('pomodoro');
    expect(engine.getCurrentRound()).toBe(1);
    expect(engine.getRemainingMs()).toBe(25 * 60 * 1000);
  });

  it('2. Start chuyển sang RUNNING và thiết lập targetEndTimeMs', () => {
    const startTime = 1700000000000;
    vi.setSystemTime(startTime);

    engine.start();

    expect(engine.getStatus()).toBe('running');
    expect(engine.getTargetEndTimeMs()).toBe(startTime + 25 * 60 * 1000);
  });

  it('3. Deadline calculation tính đúng thời gian còn lại sau 5 phút trôi qua', () => {
    const startTime = 1700000000000;
    vi.setSystemTime(startTime);
    engine.start();

    // Giả lập 5 phút trôi qua
    vi.advanceTimersByTime(5 * 60 * 1000);
    engine.tick();

    expect(engine.getRemainingMs()).toBe(20 * 60 * 1000);
  });

  it('4. Pause và Resume giữ đúng thời gian còn lại chính xác', () => {
    const startTime = 1700000000000;
    vi.setSystemTime(startTime);
    engine.start();

    // Chạy 10 phút -> Còn 15 phút
    vi.advanceTimersByTime(10 * 60 * 1000);
    engine.tick();
    expect(engine.getRemainingMs()).toBe(15 * 60 * 1000);

    // Bấm Pause
    engine.pause();
    expect(engine.getStatus()).toBe('paused');
    expect(engine.getTargetEndTimeMs()).toBeNull();

    // Chờ 2 phút trong lúc pause
    vi.advanceTimersByTime(2 * 60 * 1000);

    // Bấm Resume -> Phải tiếp tục từ 15 phút
    engine.resume();
    expect(engine.getStatus()).toBe('running');
    expect(engine.getTargetEndTimeMs()).toBe(startTime + (10 + 2 + 15) * 60 * 1000);
    expect(engine.getRemainingMs()).toBe(15 * 60 * 1000);
  });

  it('5. Reset đưa đồng hồ về IDLE và khôi phục thời gian đầy đủ ban đầu', () => {
    engine.start();
    vi.advanceTimersByTime(10 * 60 * 1000);
    engine.tick();

    engine.reset();

    expect(engine.getStatus()).toBe('idle');
    expect(engine.getTargetEndTimeMs()).toBeNull();
    expect(engine.getRemainingMs()).toBe(25 * 60 * 1000);
  });

  it('6. Skip bỏ qua hiệp hiện tại và chuyển sang hiệp tiếp theo mà không ghi nhận session', () => {
    const onCompleteMock = vi.fn();
    engine = new TimerEngine({ roundsBeforeLongBreak: 4 }, { onComplete: onCompleteMock });

    expect(engine.getPhase()).toBe('pomodoro');
    expect(engine.getCurrentRound()).toBe(1);

    // Skip Pomodoro 1 -> Sang Short Break 1
    engine.skip();
    expect(engine.getPhase()).toBe('short_break');
    expect(engine.getCurrentRound()).toBe(1);
    expect(onCompleteMock).not.toHaveBeenCalled();

    // Skip Short Break 1 -> Sang Pomodoro 2
    engine.skip();
    expect(engine.getPhase()).toBe('pomodoro');
    expect(engine.getCurrentRound()).toBe(2);
    expect(onCompleteMock).not.toHaveBeenCalled();
  });

  it('7. Chu kỳ 4 hiệp: Hết Pomodoro 4 chuyển sang Long Break', () => {
    const onCompleteMock = vi.fn();
    const startTime = 1700000000000;
    vi.setSystemTime(startTime);

    engine = new TimerEngine(
      { pomodoroMinutes: 1, shortBreakMinutes: 1, longBreakMinutes: 1, roundsBeforeLongBreak: 4 },
      { onComplete: onCompleteMock }
    );

    // Đặt vòng 4
    engine.setPhase('pomodoro', 4);
    engine.start();

    // Cho hết 1 phút
    vi.advanceTimersByTime(60 * 1000);
    engine.tick();

    expect(onCompleteMock).toHaveBeenCalledTimes(1);
    const [, nextPhase] = onCompleteMock.mock.calls[0];
    expect(nextPhase).toBe('long_break');
    expect(engine.getPhase()).toBe('long_break');
    expect(engine.getCurrentRound()).toBe(4);
  });

  it('8. Auto-transition: Tự động chạy hiệp tiếp theo khi bật tính năng', () => {
    const startTime = 1700000000000;
    vi.setSystemTime(startTime);

    engine = new TimerEngine({
      pomodoroMinutes: 1,
      shortBreakMinutes: 1,
      autoTransition: true
    });

    engine.start();
    expect(engine.getStatus()).toBe('running');

    // Chạy hết 1 phút
    vi.advanceTimersByTime(60 * 1000);
    engine.tick();

    // Vì bật autoTransition, engine tự động chuyển sang short_break và chạy tiếp (running)
    expect(engine.getPhase()).toBe('short_break');
    expect(engine.getStatus()).toBe('running');
  });

  it('9. Reload Recovery: Khôi phục chính xác thời gian còn lại khi tab được mở lại', () => {
    const startTime = 1700000000000;
    vi.setSystemTime(startTime);
    engine.start();

    // 8 phút trôi qua -> Lưu storage
    vi.advanceTimersByTime(8 * 60 * 1000);
    engine.tick();
    engine.persist();

    // Đóng tab cũ (hủy interval cũ)
    engine.destroy();

    // Mở tab mới phục hồi
    const restoredEngine = new TimerEngine({ pomodoroMinutes: 25 });
    const success = restoredEngine.restoreFromStorage();

    expect(success).toBe(true);
    expect(restoredEngine.getStatus()).toBe('running');
    expect(restoredEngine.getRemainingMs()).toBe(17 * 60 * 1000);

    restoredEngine.destroy();
  });

  it('10. Reload Recovery khi hết giờ trong lúc đóng tab: Nhận diện completed', () => {
    const startTime = 1700000000000;
    vi.setSystemTime(startTime);
    engine.start();
    engine.persist();

    // Đóng tab (hủy engine cũ)
    engine.destroy();

    // Giả lập 30 phút trôi qua khi tab đang đóng
    vi.advanceTimersByTime(30 * 60 * 1000);

    const onCompleteMock = vi.fn();
    const restoredEngine = new TimerEngine({ pomodoroMinutes: 25 }, { onComplete: onCompleteMock });
    restoredEngine.restoreFromStorage();

    // Nhận diện hết giờ và kích hoạt hoàn thành
    expect(onCompleteMock).toHaveBeenCalledTimes(1);
    expect(restoredEngine.getPhase()).toBe('short_break');

    restoredEngine.destroy();
  });

  it('11. Clock Skew Protection: Tự động phát hiện và bù trừ khi Date.now() bị nhảy cóc', () => {
    const startTime = 1700000000000;
    vi.setSystemTime(startTime);
    engine.start();

    // Giả lập: Date.now() đột ngột nhảy tiến 10 phút (do người dùng chỉnh giờ máy tính)
    // trong khi performance.now() không nhảy (vì máy không thực sự trôi qua 10 phút)
    vi.setSystemTime(startTime + 10 * 60 * 1000);
    engine.tick();

    // Engine phải nhận diện skew > 2000ms và bù trừ targetEndTimeMs tương ứng
    // để không bị kết thúc sớm 10 phút
    expect(engine.getStatus()).toBe('running');
    expect(engine.getRemainingMs()).toBeGreaterThan(20 * 60 * 1000);
  });
});

describe('Database & Idempotency Tests', () => {
  beforeEach(async () => {
    try {
      await db.focus_sessions.clear();
    } catch {
      // Bỏ qua nếu môi trường JSDOM chưa kích hoạt indexedDB
    }
  });

  it('12. Chống ghi trùng bản ghi hoàn thành phiên bằng Atomic Transaction', async () => {
    if (typeof indexedDB === 'undefined') {
      return;
    }

    const sessionId = 'test-session-uuid-123';
    const record: FocusSessionRecord = {
      id: sessionId,
      phase: 'pomodoro',
      durationMinutes: 25,
      completedAt: Date.now(),
      dateString: '2026-10-23'
    };

    // Ghi lần 1: Phải thành công (true)
    const firstResult = await recordFocusSessionAtomic(record);
    expect(firstResult).toBe(true);

    // Ghi lần 2 với cùng sessionId: Phải trả về false (bị chặn bởi ConstraintError)
    const secondResult = await recordFocusSessionAtomic(record);
    expect(secondResult).toBe(false);

    // Kiểm tra trong DB chỉ có đúng 1 record
    const count = await db.focus_sessions.where('id').equals(sessionId).count();
    expect(count).toBe(1);
  });
});
