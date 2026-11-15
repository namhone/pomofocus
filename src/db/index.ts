import Dexie, { Table } from 'dexie';
import { FocusSessionRecord, LocalFocusSessionPhase, LocalFocusSession } from '../types/timer';
import { Task, Project, LocalTask } from '../types/tasks';
import { Note } from '../types/notes';

// Re-export type definitions for ergonomic consumers
export type { Task, LocalTask, FocusSessionRecord, LocalFocusSessionPhase, LocalFocusSession };


export interface LocalAiMessage {
  id: string;
  userId?: string;
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
  userId?: string;
  tableName: 'tasks' | 'notes' | 'focus_sessions' | 'projects';
  recordId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  payload: any;
  status?: 'pending' | 'processing' | 'failed';
  lastError?: string;
  nextRetryAt?: number;
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

    // Version 3 (V8.1 Milestone 2: User Isolation, Soft Deletes & Resilient Queue)
    this.version(3).stores({
      tasks: 'id, userId, completed, order, orderIndex, status, projectId, priority, createdAt, updatedAt, deletedAt, synced',
      focus_sessions: 'id, userId, dateString, completedAt, phase, taskId, synced',
      ai_messages: 'id, userId, conversationId, createdAt',
      sync_queue: 'id, userId, tableName, recordId, action, status, createdAt, retryCount, nextRetryAt',
      projects: 'id, userId, name, createdAt, deletedAt, synced',
      notes: 'id, userId, linkedTaskId, linkedProjectId, updatedAt, deletedAt, synced',
      custom_backgrounds: 'id, createdAt, mediaType',
      planner_blocks: 'id, dateString, startHour, taskId',
    }).upgrade(async (tx) => {
      // Data preservation migration: ensure existing records get userId: 'guest' if undefined
      await tx.table('tasks').toCollection().modify((task: any) => {
        if (!task.userId) task.userId = 'guest';
        if (task.deletedAt === undefined) task.deletedAt = null;
      });
      await tx.table('notes').toCollection().modify((note: any) => {
        if (!note.userId) note.userId = 'guest';
        if (note.deletedAt === undefined) note.deletedAt = null;
      });
      await tx.table('projects').toCollection().modify((proj: any) => {
        if (!proj.userId) proj.userId = 'guest';
        if (proj.deletedAt === undefined) proj.deletedAt = null;
      });
      await tx.table('ai_messages').toCollection().modify((msg: any) => {
        if (!msg.userId) msg.userId = 'guest';
      });
      await tx.table('sync_queue').toCollection().modify((mut: any) => {
        if (!mut.userId) mut.userId = 'guest';
        if (!mut.status) mut.status = 'pending';
      });
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
