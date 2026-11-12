import { db, SyncMutation } from '../db';
import { supabase } from '../lib/supabase';

export interface SyncFlushResult {
  successCount: number;
  failedCount: number;
  errors: Array<{ mutationId: string; error: string }>;
}

function getStoredUserId(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = localStorage.getItem('pomodoro_study_auth_session');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.id) return parsed.id;
      if (parsed.user?.id) return parsed.user.id;
    }
  } catch {}
  try {
    const authStore = (window as any).useAuthStore;
    if (authStore?.getState?.()?.user?.id) {
      return authStore.getState().user.id;
    }
  } catch {}
  return undefined;
}

export class SyncQueueService {
  private isFlushing = false;
  private onlineListenerCleanup: (() => void) | null = null;

  /**
   * Đẩy một thao tác đột biến (mutation) vào hàng đợi offline sync_queue
   */
  async enqueueMutation(params: {
    tableName: SyncMutation['tableName'];
    recordId: string;
    action: SyncMutation['action'];
    payload?: any;
  }): Promise<string> {
    const id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `mut_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const mutation: SyncMutation = {
      id,
      tableName: params.tableName,
      recordId: params.recordId,
      action: params.action,
      payload: params.payload ?? {},
      createdAt: Date.now(),
      retryCount: 0
    };

    await db.sync_queue.add(mutation);
    return id;
  }

  /**
   * Lấy danh sách toàn bộ đột biến đang chờ xử lý theo thứ tự FIFO (cũ nhất xử lý trước)
   */
  async getPendingMutations(): Promise<SyncMutation[]> {
    return await db.sync_queue.orderBy('createdAt').toArray();
  }

  /**
   * Lấy tổng số đột biến đang tồn đọng trong hàng đợi
   */
  async getPendingCount(): Promise<number> {
    return await db.sync_queue.count();
  }

  /**
   * Xóa một đột biến đã hoàn tất khỏi hàng đợi
   */
  async removeMutation(id: string): Promise<void> {
    await db.sync_queue.delete(id);
  }

  /**
   * Dọn sạch toàn bộ hàng đợi đột biến
   */
  async clearQueue(): Promise<void> {
    await db.sync_queue.clear();
  }

  /**
   * Đẩy toàn bộ đột biến tồn đọng lên Supabase Cloud khi có kết nối và đã đăng nhập
   */
  async flushQueue(userId?: string): Promise<SyncFlushResult> {
    if (this.isFlushing) {
      return { successCount: 0, failedCount: 0, errors: [] };
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { successCount: 0, failedCount: 0, errors: [] };
    }

    let effectiveUserId = userId || getStoredUserId();
    if (!effectiveUserId) {
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.user?.id) {
          effectiveUserId = data.session.user.id;
        }
      } catch {}
    }

    // Nếu người dùng chưa đăng nhập, không thể đẩy lên Supabase (RLS yêu cầu user_id)
    if (!effectiveUserId) {
      return { successCount: 0, failedCount: 0, errors: [] };
    }

    this.isFlushing = true;
    let successCount = 0;
    let failedCount = 0;
    const errors: Array<{ mutationId: string; error: string }> = [];

    try {
      const pending = await this.getPendingMutations();

      for (const mutation of pending) {
        try {
          await this.processMutation(mutation, effectiveUserId);
          await db.sync_queue.delete(mutation.id);
          successCount++;
        } catch (err: any) {
          failedCount++;
          const errorMsg = String(err?.message || err);
          errors.push({ mutationId: mutation.id, error: errorMsg });

          // Tăng số lần thử lại
          const newRetryCount = (mutation.retryCount || 0) + 1;
          await db.sync_queue.update(mutation.id, { retryCount: newRetryCount });

          // Nếu lỗi mạng, dừng đợt flush để không gây nghẽn
          if (
            typeof navigator !== 'undefined' &&
            !navigator.onLine
          ) {
            break;
          }
        }
      }
    } finally {
      this.isFlushing = false;
    }

    return { successCount, failedCount, errors };
  }

  /**
   * Xử lý từng đột biến cụ thể theo loại bảng
   */
  private async processMutation(mutation: SyncMutation, userId: string): Promise<void> {
    const { tableName, recordId, action, payload } = mutation;

    switch (tableName) {
      case 'tasks': {
        if (action === 'DELETE') {
          const { error } = await supabase
            .from('tasks')
            .delete()
            .eq('id', recordId)
            .eq('user_id', userId);
          if (error) throw error;
        } else {
          // CREATE hoặc UPDATE
          const taskPayload = {
            id: recordId,
            user_id: userId,
            project_id: payload.projectId || null,
            title: payload.title || 'Untitled Task',
            description: payload.description || '',
            priority: payload.priority || 'p2',
            status: payload.status || 'todo',
            estimated_pomodoros: payload.estimatedPomodoros ?? 1,
            completed_pomodoros: payload.completedPomodoros ?? 0,
            deadline: payload.deadline ? new Date(payload.deadline).toISOString() : null,
            repeat: payload.repeat || 'none',
            order_index: payload.orderIndex ?? payload.order ?? 0,
            created_at: payload.createdAt
              ? new Date(payload.createdAt).toISOString()
              : new Date().toISOString(),
            updated_at: payload.updatedAt
              ? new Date(payload.updatedAt).toISOString()
              : new Date().toISOString(),
            completed_at: payload.completedAt ? new Date(payload.completedAt).toISOString() : null
          };

          const { error } = await supabase.from('tasks').upsert(taskPayload, { onConflict: 'id' });
          if (error) throw error;

          // Cập nhật trạng thái synced cục bộ
          try {
            await db.tasks.update(recordId, { synced: true });
          } catch {}
        }
        break;
      }

      case 'notes': {
        if (action === 'DELETE') {
          const { error } = await supabase
            .from('notes')
            .delete()
            .eq('id', recordId)
            .eq('user_id', userId);
          if (error) throw error;
        } else {
          const notePayload = {
            id: recordId,
            user_id: userId,
            title: payload.title || 'Untitled Note',
            content_markdown: payload.contentMarkdown ?? payload.content ?? '',
            linked_task_id: payload.linkedTaskId || null,
            linked_project_id: payload.linkedProjectId || null,
            created_at: payload.createdAt
              ? new Date(payload.createdAt).toISOString()
              : new Date().toISOString(),
            updated_at: payload.updatedAt
              ? new Date(payload.updatedAt).toISOString()
              : new Date().toISOString()
          };

          const { error } = await supabase.from('notes').upsert(notePayload, { onConflict: 'id' });
          if (error) throw error;
        }
        break;
      }

      case 'projects': {
        if (action === 'DELETE') {
          const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', recordId)
            .eq('user_id', userId);
          if (error) throw error;
        } else {
          const projectPayload = {
            id: recordId,
            user_id: userId,
            name: payload.name || 'Untitled Project',
            color_hex: payload.colorHex || '#10b981',
            created_at: payload.createdAt
              ? new Date(payload.createdAt).toISOString()
              : new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          const { error } = await supabase
            .from('projects')
            .upsert(projectPayload, { onConflict: 'id' });
          if (error) throw error;
        }
        break;
      }

      case 'focus_sessions': {
        if (action === 'DELETE') {
          try {
            const { error } = await supabase
              .from('focus_sessions')
              .delete()
              .eq('id', recordId)
              .eq('user_id', userId);
            if (error) throw error;
          } catch (e: any) {
            // Nếu bảng chưa có trên cloud, bắt lỗi nhẹ nhàng không chặn queue
            if (e?.code === '42P01' || e?.message?.includes('does not exist')) {
              console.warn('[SyncQueue] Bảng focus_sessions chưa được tạo trên Supabase Cloud');
              return;
            }
            throw e;
          }
        } else {
          const sessionPayload = {
            id: recordId,
            user_id: userId,
            task_id: payload.taskId || null,
            task_title: payload.taskTitle || null,
            duration_minutes: payload.durationMinutes ?? 25,
            phase: payload.phase || 'pomodoro',
            completed_at: payload.completedAt
              ? new Date(payload.completedAt).toISOString()
              : new Date().toISOString(),
            date_string: payload.dateString || new Date().toISOString().split('T')[0]
          };

          try {
            const { error } = await supabase
              .from('focus_sessions')
              .upsert(sessionPayload, { onConflict: 'id' });
            if (error) throw error;

            try {
              await db.focus_sessions.update(recordId, { synced: true });
            } catch {}
          } catch (e: any) {
            if (e?.code === '42P01' || e?.message?.includes('does not exist')) {
              console.warn('[SyncQueue] Bảng focus_sessions chưa được tạo trên Supabase Cloud');
              return;
            }
            throw e;
          }
        }
        break;
      }

      default:
        console.warn(`[SyncQueue] Loại bảng không được hỗ trợ: ${tableName}`);
    }
  }

  /**
   * Lắng nghe sự kiện kết nối lại mạng (online event) trên trình duyệt
   * để tự động đẩy hàng đợi lên Cloud.
   */
  startAutoSync(getUserId?: () => string | null | undefined): () => void {
    if (typeof window === 'undefined') {
      return () => {};
    }

    if (this.onlineListenerCleanup) {
      this.onlineListenerCleanup();
    }

    const handleOnline = () => {
      const uid = getUserId ? getUserId() : getStoredUserId();
      if (uid) {
        this.flushQueue(uid).catch((err) => {
          console.warn('[SyncQueueService] Auto-sync sau khi online thất bại:', err);
        });
      }
    };

    window.addEventListener('online', handleOnline);

    this.onlineListenerCleanup = () => {
      window.removeEventListener('online', handleOnline);
      this.onlineListenerCleanup = null;
    };

    return this.onlineListenerCleanup;
  }

  /**
   * Hủy lắng nghe sự kiện online
   */
  stopAutoSync(): void {
    if (this.onlineListenerCleanup) {
      this.onlineListenerCleanup();
      this.onlineListenerCleanup = null;
    }
  }
}

export const syncQueueService = new SyncQueueService();
