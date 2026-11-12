import Dexie, { Table } from 'dexie';
import { FocusSessionRecord, LocalFocusSessionPhase, LocalFocusSession } from '../types/timer';
import { Task, Project, LocalTask } from '../types/tasks';
import { Note } from '../types/notes';

// Re-export type definitions for ergonomic consumers
export type { Task, LocalTask, FocusSessionRecord, LocalFocusSessionPhase, LocalFocusSession };


export interface LocalAiMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: number;
  actionType?: string;
  creditsUsed?: number;
  attachmentUrl?: string;
  attachmentName?: string;
  isTruncated?: boolean;
}

export interface SyncMutation {
  id: string;
  tableName: 'tasks' | 'notes' | 'focus_sessions' | 'projects';
  recordId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  payload: any;
  createdAt: number;
  retryCount: number;
}

export interface CustomBackgroundRecord {
  id: string;
  blob: Blob;
  name: string;
  mediaType: 'image' | 'video';
  mimeType: string;
  sizeBytes: number;
  createdAt: number;
}

export interface PlannerBlockRecord {
  id: string;
  dateString: string; // YYYY-MM-DD
  startHour: number; // 6 to 23
  title: string;
  taskId?: string | null;
  completed?: boolean;
}

export class PomoDatabase extends Dexie {
  tasks!: Table<LocalTask, string>;
  focus_sessions!: Table<LocalFocusSession, string>;
  ai_messages!: Table<LocalAiMessage, string>;
  sync_queue!: Table<SyncMutation, string>;
  projects!: Table<Project, string>;
  notes!: Table<Note, string>;
  custom_backgrounds!: Table<CustomBackgroundRecord, string>;
  planner_blocks!: Table<PlannerBlockRecord, string>;

  constructor() {
    super('PomoFocusLocalDB_v2');

    // Version 1 (Compatibility baseline)
    this.version(1).stores({
      focus_sessions: 'id, dateString, completedAt, phase, taskId',
      tasks: 'id, status, projectId, priority, createdAt, updatedAt',
      projects: 'id, name, createdAt',
      notes: 'id, linkedTaskId, linkedProjectId, updatedAt',
      custom_backgrounds: 'id, createdAt, mediaType',
      planner_blocks: 'id, dateString, startHour, taskId',
    });

    // Version 2 (V8.1 Local-First Hybrid with ai_messages & sync_queue)
    this.version(2).stores({
      tasks: 'id, userId, completed, order, orderIndex, status, projectId, priority, createdAt, updatedAt, synced',
      focus_sessions: 'id, userId, dateString, completedAt, phase, taskId, synced',
      ai_messages: 'id, conversationId, createdAt',
      sync_queue: 'id, tableName, recordId, createdAt, retryCount',
      projects: 'id, name, createdAt',
      notes: 'id, linkedTaskId, linkedProjectId, updatedAt',
      custom_backgrounds: 'id, createdAt, mediaType',
      planner_blocks: 'id, dateString, startHour, taskId',
    });
  }
}

// Backward compatibility class alias
export class PomodoroDatabase extends PomoDatabase {
  static [Symbol.hasInstance](instance: unknown): boolean {
    return instance instanceof PomoDatabase;
  }
}


export const db = new PomoDatabase();

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
export async function recordFocusSessionAtomic(
  record: FocusSessionRecord | LocalFocusSession
): Promise<boolean> {
  try {
    return await db.transaction('rw', [db.focus_sessions, db.tasks], async () => {
      // 1. Ghi nhận phiên vào focus_sessions
      await db.focus_sessions.add(record as any);

      // 2. Cập nhật task trong cùng transaction nếu là hiệp Pomodoro / work
      const isPomodoroPhase = record.phase === 'pomodoro' || record.phase === 'work';
      if (record.taskId && isPomodoroPhase) {
        const task = await db.tasks.get(record.taskId);
        if (task) {
          await db.tasks.update(record.taskId, {
            completedPomodoros: (task.completedPomodoros || 0) + 1,
            updatedAt: Date.now(),
          });
        }
      }

      return true;
    });
  } catch (error: unknown) {
    if (
      error &&
      typeof error === 'object' &&
      'name' in error &&
      (error as { name: string }).name === 'ConstraintError'
    ) {
      return false;
    }
    throw error;
  }
}

if (typeof window !== 'undefined') {
  (window as unknown as { db: typeof db; recordFocusSessionAtomic: typeof recordFocusSessionAtomic }).db = db;
  (window as unknown as { db: typeof db; recordFocusSessionAtomic: typeof recordFocusSessionAtomic }).recordFocusSessionAtomic = recordFocusSessionAtomic;
}
