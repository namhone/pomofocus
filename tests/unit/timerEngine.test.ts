import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TimerEngine } from '../../src/services/timerEngine';
import { db, recordFocusSessionAtomic } from '../../src/db';
import { FocusSessionRecord } from '../../src/types/timer';
import { TimerSyncPayload } from '../../src/services/tabCoordinator';

describe('TimerEngine Core Unit Tests', () => {
  let engine: TimerEngine;

  beforeEach(() => {
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

  it('11. Xử lý khi máy tính rơi vào Sleep: Khi thức dậy đã quá deadline thì hoàn tất phiên', () => {
    const onCompleteMock = vi.fn();
    const startTime = 1700000000000;
    vi.setSystemTime(startTime);

    engine = new TimerEngine({ pomodoroMinutes: 25 }, { onComplete: onCompleteMock });
    engine.start();

    // Giả lập máy tính ngủ 30 phút (vượt quá 25 phút của phiên)
    vi.setSystemTime(startTime + 30 * 60 * 1000);
    engine.tick();

    // Deadline đã qua -> Timer nhận diện completed ngay lập tức, không kéo dài deadline
    expect(engine.getStatus()).toBe('idle');
    expect(onCompleteMock).toHaveBeenCalledTimes(1);
  });

  it('12. Đồng bộ Snapshot trạng thái giữa các Tab (syncFromSnapshot)', () => {
    const snapshot: TimerSyncPayload = {
      sessionId: 'sess-shared-xyz-789',
      phase: 'pomodoro',
      status: 'running',
      currentRound: 3,
      durationMinutes: 25,
      remainingMs: 12 * 60 * 1000,
      targetEndTimeMs: Date.now() + 12 * 60 * 1000,
      pausedRemainingMs: null,
      timestamp: Date.now()
    };

    // Tab 2 đồng bộ snapshot nhận từ Tab 1
    engine.syncFromSnapshot(snapshot);

    expect(engine.getSessionId()).toBe('sess-shared-xyz-789');
    expect(engine.getPhase()).toBe('pomodoro');
    expect(engine.getStatus()).toBe('running');
    expect(engine.getCurrentRound()).toBe(3);
    expect(engine.getTargetEndTimeMs()).toBe(snapshot.targetEndTimeMs);
  });
});

describe('Database & Idempotency Tests (Real IndexedDB via fake-indexeddb)', () => {
  beforeEach(async () => {
    await db.focus_sessions.clear();
  });

  it('13. Chống ghi trùng bản ghi hoàn thành phiên bằng Atomic Transaction trên IndexedDB thật', async () => {
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

  it('14. Race Condition: Hai tab cùng ghi đồng thời với cùng sessionId', async () => {
    const sessionId = 'race-session-uuid-concurrent';
    const record1: FocusSessionRecord = {
      id: sessionId,
      phase: 'pomodoro',
      durationMinutes: 25,
      completedAt: Date.now(),
      dateString: '2026-10-23'
    };
    const record2: FocusSessionRecord = {
      id: sessionId,
      phase: 'pomodoro',
      durationMinutes: 25,
      completedAt: Date.now() + 10,
      dateString: '2026-10-23'
    };

    // Gọi đồng thời Promise.all từ 2 tab mô phỏng
    const results = await Promise.all([
      recordFocusSessionAtomic(record1),
      recordFocusSessionAtomic(record2)
    ]);

    // Phải có đúng một kết quả true và một kết quả false
    expect(results.filter((r) => r === true).length).toBe(1);
    expect(results.filter((r) => r === false).length).toBe(1);

    // DB chỉ lưu đúng 1 record duy nhất
    const records = await db.focus_sessions.toArray();
    expect(records.length).toBe(1);
    expect(records[0].id).toBe(sessionId);
  });
});
