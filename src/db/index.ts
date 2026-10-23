import Dexie, { Table } from 'dexie';
import { FocusSessionRecord } from '../types/timer';
import { Task, Project } from '../types/tasks';
import { Note } from '../types/notes';

export class PomodoroDatabase extends Dexie {
  focus_sessions!: Table<FocusSessionRecord, string>;
  tasks!: Table<Task, string>;
  projects!: Table<Project, string>;
  notes!: Table<Note, string>;

  constructor() {
    super('ImmersivePomodoroDB');

    // Phiên bản 1 (Scaffold ban đầu)
    this.version(1).stores({
      focus_sessions: '&id, dateString, completedAt, phase'
    });

    // Phiên bản 2: Tích hợp đầy đủ Tasks, Projects, Notes và liên kết taskId
    this.version(2).stores({
      focus_sessions: '&id, dateString, completedAt, phase, taskId',
      tasks: '&id, status, projectId, priority, createdAt, updatedAt',
      projects: '&id, name, createdAt',
      notes: '&id, linkedTaskId, linkedProjectId, updatedAt'
    });
  }
}

export const db = new PomodoroDatabase();

/**
 * Ghi nhận một phiên Pomodoro và cập nhật số hiệp của task (nếu có liên kết)
 * trong CÙNG MỘT TRANSACTION NGUYÊN TỬ (Atomic Transaction).
 *
 * ĐẢM BẢO QUY TẮC:
 * 1. Nếu sessionId đã tồn tại (do retry hoặc tab khác ghi trước), add() ném ConstraintError ->
 *    Toàn bộ transaction rollback và hàm trả về false.
 * 2. Số Pomodoro hoàn thành của task TUYỆT ĐỐI KHÔNG bị tăng 2 lần.
 * 3. Nếu task bị xóa giữa chừng trong lúc timer đang chạy, session vẫn được lưu an toàn
 *    mà không phát sinh lỗi ràng buộc ngoại khóa.
 */
export async function recordFocusSessionAtomic(record: FocusSessionRecord): Promise<boolean> {
  try {
    return await db.transaction('rw', [db.focus_sessions, db.tasks], async () => {
      // 1. Ghi nhận phiên vào focus_sessions
      await db.focus_sessions.add(record);

      // 2. Cập nhật task trong cùng transaction nếu là hiệp Pomodoro
      if (record.taskId && record.phase === 'pomodoro') {
        const task = await db.tasks.get(record.taskId);
        if (task) {
          await db.tasks.update(record.taskId, {
            completedPomodoros: (task.completedPomodoros || 0) + 1,
            updatedAt: Date.now()
          });
        }
      }

      return true;
    });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'name' in error && (error as { name: string }).name === 'ConstraintError') {
      return false;
    }
    throw error;
  }
}
