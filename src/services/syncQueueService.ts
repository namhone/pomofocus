import { db, SyncMutation } from '../db';
import { supabase } from '../lib/supabase';
import { generateUUID } from '../utils/uuid';

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
    userId?: string;
  }): Promise<string> {
    const id = generateUUID();

    const mutation: SyncMutation = {
      id,
      userId: params.userId || getStoredUserId() || 'guest',
      tableName: params.tableName,
      recordId: params.recordId,
      action: params.action,
      payload: params.payload ?? {},
      status: 'pending',
      createdAt: Date.now(),
      retryCount: 0
    };

    await db.sync_queue.add(mutation);
    return id;
  }

  /**
   * Lấy danh sách toàn bộ đột biến đang chờ xử lý theo thứ tự FIFO (cũ nhất xử lý trước)
   * Chỉ lấy các mutation chưa đạt trạng thái 'failed' và đã đến hạn retry (nextRetryAt)
   */
  async getPendingMutations(userId?: string): Promise<SyncMutation[]> {
    const now = Date.now();
    const all = await db.sync_queue.orderBy('createdAt').toArray();
    return all.filter((m) => {
      if (userId && m.userId && m.userId !== userId && m.userId !== 'guest') return false;
      if (m.status === 'failed') return false;
      if (m.nextRetryAt && m.nextRetryAt > now) return false;
      return true;
    });
  }

  /**
   * Lấy danh sách các đột biến thất bại cần can thiệp thủ công
   */
  async getFailedMutations(): Promise<SyncMutation[]> {
    return await db.sync_queue.filter((m) => m.status === 'failed').toArray();
  }

  /**
   * Thử lại thủ công toàn bộ các đột biến đã bị đánh dấu thất bại ('failed')
   */
  async retryFailedMutations(userId?: string): Promise<SyncFlushResult> {
    const failed = await db.sync_queue.filter((m) => m.status === 'failed').toArray();
    for (const m of failed) {
      await db.sync_queue.update(m.id, {
        status: 'pending',
        retryCount: 0,
        nextRetryAt: undefined,
        lastError: undefined
      });
    }
    return await this.flushQueue(userId);
  }

  /**
   * Lấy tổng số đột biến đang tồn đọng trong hàng đợi (bao gồm pending và processing)
   */
  async getPendingCount(): Promise<number> {
    return await db.sync_queue.filter((m) => m.status !== 'failed').count();
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
   * Áp dụng thuật toán Exponential Backoff và bảo toàn bản ghi failed khi vượt quá 5 lần thử
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
    const startingAccount = getStoredUserId();
    let successCount = 0;
    let failedCount = 0;
    const errors: Array<{ mutationId: string; error: string }> = [];

    try {
      const pending = await this.getPendingMutations(effectiveUserId);

      for (const mutation of pending) {
        // A logout/account switch must not send the remaining batch with a new token.
        if (getStoredUserId() !== startingAccount) break;
        try {
          await db.sync_queue.update(mutation.id, { status: 'processing' });
          await this.processMutation(mutation, effectiveUserId);
          await db.sync_queue.delete(mutation.id);
          successCount++;
        } catch (err: any) {
          failedCount++;
          const errorMsg = String(err?.message || err);
          errors.push({ mutationId: mutation.id, error: errorMsg });

          // Tính toán Exponential Backoff: delayMs = Math.min(300000, 1000 * 2^(retryCount - 1) + randomJitter)
          // Nếu mất mạng (offline/Network drop), delayMs = 0 để khi có mạng trở lại có thể flush ngay lập tức
          const newRetryCount = (mutation.retryCount || 0) + 1;
          const isOfflineDrop = (typeof navigator !== 'undefined' && !navigator.onLine) ||
            errorMsg.includes('Failed to fetch') || errorMsg.includes('Network');
          const delayMs = isOfflineDrop
            ? 0
            : Math.min(300000, 1000 * Math.pow(2, newRetryCount - 1) + Math.floor(Math.random() * 500) + 50);
          const nextRetryAt = Date.now() + delayMs;

          // Nếu số lần thử >= 5, chuyển sang trạng thái 'failed', TUYỆT ĐỐI KHÔNG XÓA RECORD
          if (newRetryCount >= 5) {
            await db.sync_queue.update(mutation.id, {
              status: 'failed',
              retryCount: newRetryCount,
              lastError: errorMsg,
              nextRetryAt
            });
          } else {
            await db.sync_queue.update(mutation.id, {
              status: 'pending',
              retryCount: newRetryCount,
              lastError: errorMsg,
              nextRetryAt
            });
          }

          // Nếu lỗi mạng, dừng đợt flush để không gây nghẽn
          if (typeof navigator !== 'undefined' && !navigator.onLine) {
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
  private async writeVersioned(table: SyncMutation['tableName'], payload: Record<string, any>, userId: string): Promise<boolean> {
    const { data: current, error: readError } = await supabase.from(table)
      .select('id,user_id,updated_at').eq('id', payload.id).eq('user_id', userId).single();
    if (readError) throw readError;
    if (!current) {
      // INSERT rejects a concurrent create instead of blindly merging over it.
      const { error } = await supabase.from(table).insert(payload);
      if (error) throw error;
      return true;
    }
    const cloudVersion = Date.parse(current.updated_at);
    const localVersion = Date.parse(payload.updated_at);
    if (!Number.isFinite(cloudVersion) || !Number.isFinite(localVersion)) throw new Error('Missing sync version; preserving mutation');
    if (cloudVersion >= localVersion) return false;
    const { data, error } = await supabase.from(table).update(payload)
      .eq('id', payload.id).eq('user_id', userId).eq('updated_at', current.updated_at);
    if (error) throw error;
    if (!Array.isArray(data) || data.length !== 1) throw new Error('Sync conflict: remote version changed; retry required');
    return true;
  }

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
            completed_at: payload.completedAt ? new Date(payload.completedAt).toISOString() : null,
            deleted_at: payload.deletedAt ? new Date(payload.deletedAt).toISOString() : null
          };

          const written = await this.writeVersioned('tasks', taskPayload, userId);

          // Cập nhật trạng thái synced cục bộ
          try {
            const current = await db.tasks.get(recordId);
            if (written && current?.userId === userId && current.updatedAt === payload.updatedAt) {
              await db.tasks.update(recordId, { synced: true });
            }
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
              : new Date().toISOString(),
            deleted_at: payload.deletedAt ? new Date(payload.deletedAt).toISOString() : null
          };

          await this.writeVersioned('notes', notePayload, userId);
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
            color_hex: payload.colorHex || '#a1a1aa',
            created_at: payload.createdAt
              ? new Date(payload.createdAt).toISOString()
              : new Date().toISOString(),
            updated_at: payload.updatedAt
              ? new Date(payload.updatedAt).toISOString()
              : new Date().toISOString(),
            deleted_at: payload.deletedAt ? new Date(payload.deletedAt).toISOString() : null
          };

          await this.writeVersioned('projects', projectPayload, userId);
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
            // Bảng chưa có: giữ mutation để retry, không báo đồng bộ thành công.
            if (e?.code === '42P01' || e?.message?.includes('does not exist')) {
              console.warn('[SyncQueue] Bảng focus_sessions chưa được tạo trên Supabase Cloud');
              throw e;
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
            date_string: payload.dateString || new Date().toISOString().split('T')[0],
            updated_at: new Date(payload.updatedAt || payload.completedAt || mutation.createdAt).toISOString()
          };

          try {
            const written = await this.writeVersioned('focus_sessions', sessionPayload, userId);

            try {
              const current = await db.focus_sessions.get(recordId);
              if (written && current?.userId === userId && current.completedAt === payload.completedAt) {
                await db.focus_sessions.update(recordId, { synced: true });
              }
            } catch {}
          } catch (e: any) {
            if (e?.code === '42P01' || e?.message?.includes('does not exist')) {
              console.warn('[SyncQueue] Bảng focus_sessions chưa được tạo trên Supabase Cloud');
              throw e;
            }
            throw e;
          }
        }
        break;
      }

      default:
        throw new Error(`[SyncQueue] Loại bảng không được hỗ trợ: ${tableName}`);
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
