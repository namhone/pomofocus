import Dexie, { Table } from 'dexie';
import { FocusSessionRecord } from '../types/timer';

export class PomodoroDatabase extends Dexie {
  focus_sessions!: Table<FocusSessionRecord, string>;

  constructor() {
    super('ImmersivePomodoroDB');

    this.version(1).stores({
      focus_sessions: '&id, dateString, completedAt, phase'
    });
  }
}

export const db = new PomodoroDatabase();

/**
 * Ghi nhận một phiên Pomodoro vào IndexedDB một cách nguyên tử (Atomic).
 * Nếu sessionId đã tồn tại, phương thức add() sẽ ném ConstraintError.
 * Hàm này bắt lỗi đó và trả về false (ngăn chặn hoàn toàn việc ghi trùng lặp).
 */
export async function recordFocusSessionAtomic(record: FocusSessionRecord): Promise<boolean> {
  try {
    await db.transaction('rw', db.focus_sessions, async () => {
      await db.focus_sessions.add(record);
    });
    return true;
  } catch (error: unknown) {
    // Dexie ConstraintError xảy ra khi khóa chính đã tồn tại
    if (error && typeof error === 'object' && 'name' in error && (error as { name: string }).name === 'ConstraintError') {
      return false;
    }
    // Lỗi khác ném tiếp
    throw error;
  }
}
