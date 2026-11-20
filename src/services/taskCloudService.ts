import { supabase } from '../lib/supabase';
import { Task, Project } from '../types/tasks';
import { db } from '../db';

export class TaskCloudService {
  /**
   * Đồng bộ toàn diện danh sách công việc và dự án từ Supabase Cloud
   */
  static async syncFromCloud(userId: string): Promise<{ tasks: Task[]; projects: Project[] }> {
    if (!userId) {
      const localTasks = await db.tasks.toArray();
      const localProjects = await db.projects.toArray();
      return { tasks: localTasks, projects: localProjects };
    }

    try {
      // 1. Tải Projects từ Cloud
      const { data: cloudProjects, error: projErr } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      // 2. Tải Tasks từ Cloud
      const { data: cloudTasks, error: taskErr } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .order('order_index', { ascending: true });

      const localTasks = await db.tasks.toArray();
      const localProjects = await db.projects.toArray();

      // Nếu Cloud có dữ liệu, cập nhật/hợp nhất vào Dexie Cache
      if (!projErr && Array.isArray(cloudProjects)) {
        for (const cp of cloudProjects) {
          const cloudUpdatedAt = cp.updated_at ? new Date(cp.updated_at).getTime() : new Date(cp.created_at).getTime();
          const cloudDeletedAt = cp.deleted_at ? new Date(cp.deleted_at).getTime() : null;
          const localProj = await db.projects.get(cp.id);

          // Respect updatedAt: do not overwrite newer local project blindly
          if (localProj && (localProj.updatedAt || localProj.createdAt) > cloudUpdatedAt) {
            this.upsertProject(localProj, userId).catch(() => {});
            continue;
          }

          const mappedProj: Project = {
            id: cp.id,
            userId,
            name: cp.name,
            colorHex: cp.color_hex || '#10b981',
            createdAt: new Date(cp.created_at).getTime(),
            updatedAt: cloudUpdatedAt,
            deletedAt: cloudDeletedAt,
            synced: true
          };
          await db.projects.put(mappedProj);
        }
      }

      if (!taskErr && Array.isArray(cloudTasks)) {
        for (const ct of cloudTasks) {
          const cloudUpdatedAt = new Date(ct.updated_at).getTime();
          const cloudDeletedAt = ct.deleted_at ? new Date(ct.deleted_at).getTime() : null;
          const localTask = await db.tasks.get(ct.id);

          // Respect updatedAt: do not overwrite newer local updates blindly with older cloud records
          if (localTask && localTask.updatedAt > cloudUpdatedAt) {
            this.upsertTask(localTask, userId).catch(() => {});
            continue;
          }

          const mappedTask: Task = {
            id: ct.id,
            userId,
            title: ct.title,
            description: ct.description || '',
            projectId: ct.project_id || null,
            tagIds: [],
            priority: ct.priority || 'p2',
            status: ct.status || 'todo',
            estimatedPomodoros: ct.estimated_pomodoros || 1,
            completedPomodoros: ct.completed_pomodoros || 0,
            deadline: ct.deadline ? new Date(ct.deadline).getTime() : null,
            repeat: ct.repeat || 'none',
            orderIndex: ct.order_index || 0,
            createdAt: new Date(ct.created_at).getTime(),
            updatedAt: cloudUpdatedAt,
            completedAt: ct.completed_at ? new Date(ct.completed_at).getTime() : null,
            deletedAt: cloudDeletedAt,
            synced: true
          };
          await db.tasks.put(mappedTask);
        }
      }

      // Đẩy ngược lại các task/project offline lên Cloud nếu Cloud đang trống
      if (Array.isArray(cloudTasks) && cloudTasks.length === 0 && localTasks.length > 0) {
        for (const lt of localTasks) {
          this.upsertTask(lt, userId).catch(() => {});
        }
      }
      if (Array.isArray(cloudProjects) && cloudProjects.length === 0 && localProjects.length > 0) {
        for (const lp of localProjects) {
          this.upsertProject(lp, userId).catch(() => {});
        }
      }

      const mergedTasks = await db.tasks.toArray();
      const mergedProjects = await db.projects.toArray();
      return { tasks: mergedTasks, projects: mergedProjects };
    } catch (err) {
      console.warn('[TaskCloudService] Lỗi đồng bộ đám mây, sử dụng bộ nhớ đệm cục bộ:', err);
      const localTasks = await db.tasks.toArray();
      const localProjects = await db.projects.toArray();
      return { tasks: localTasks, projects: localProjects };
    }
  }

  /**
   * Lưu hoặc cập nhật Task trực tiếp lên Supabase Cloud
   */
  static async upsertTask(task: Task, userId: string): Promise<void> {
    if (!userId) return;
    try {
      const payload = {
        id: task.id,
        user_id: userId,
        project_id: task.projectId || null,
        title: task.title,
        description: task.description || '',
        priority: task.priority,
        status: task.status,
        estimated_pomodoros: task.estimatedPomodoros,
        completed_pomodoros: task.completedPomodoros,
        deadline: task.deadline ? new Date(task.deadline).toISOString() : null,
        repeat: task.repeat,
        order_index: task.orderIndex,
        created_at: new Date(task.createdAt).toISOString(),
        updated_at: new Date(task.updatedAt).toISOString(),
        completed_at: task.completedAt ? new Date(task.completedAt).toISOString() : null,
        deleted_at: task.deletedAt ? new Date(task.deletedAt).toISOString() : null
      };

      await supabase.from('tasks').upsert(payload, { onConflict: 'id' });
    } catch (err) {
      console.warn('[TaskCloudService] Ghi task lên Cloud thất bại:', err);
    }
  }

  /**
   * Xóa Task trên Supabase Cloud
   */
  static async deleteTask(taskId: string, userId: string): Promise<void> {
    if (!userId) return;
    try {
      await supabase.from('tasks').delete().eq('id', taskId);
    } catch (err) {
      console.warn('[TaskCloudService] Xóa task trên Cloud thất bại:', err);
    }
  }

  /**
   * Lưu hoặc cập nhật Project lên Supabase Cloud
   */
  static async upsertProject(project: Project, userId: string): Promise<void> {
    if (!userId) return;
    try {
      const payload = {
        id: project.id,
        user_id: userId,
        name: project.name,
        color_hex: project.colorHex || '#10b981',
        created_at: new Date(project.createdAt).toISOString(),
        updated_at: project.updatedAt ? new Date(project.updatedAt).toISOString() : new Date().toISOString(),
        deleted_at: project.deletedAt ? new Date(project.deletedAt).toISOString() : null
      };

      await supabase.from('projects').upsert(payload, { onConflict: 'id' });
    } catch (err) {
      console.warn('[TaskCloudService] Ghi project lên Cloud thất bại:', err);
    }
  }

  /**
   * Xóa Project trên Supabase Cloud
   */
  static async deleteProject(projectId: string, userId: string): Promise<void> {
    if (!userId) return;
    try {
      await supabase.from('projects').delete().eq('id', projectId);
    } catch (err) {
      console.warn('[TaskCloudService] Xóa project trên Cloud thất bại:', err);
    }
  }

  /**
   * Hợp nhất toàn bộ dữ liệu tạo trong phiên Khách (Guest) lên tài khoản chính khi đăng nhập Google / Email
   */
  static async mergeGuestDataOnLogin(newUserId: string): Promise<void> {
    if (!newUserId || newUserId === 'guest') return;

    try {
      // 1. Quét và cập nhật các công việc cục bộ chưa có user_id hoặc thuộc về 'guest'
      const allTasks = await db.tasks.toArray();
      for (const t of allTasks) {
        if (!t.userId || t.userId === 'guest') {
          t.userId = newUserId;
          await db.tasks.put(t);
          this.upsertTask(t, newUserId).catch(() => {});
        }
      }

      // 2. Quét và cập nhật các dự án cục bộ
      const allProjects = await db.projects.toArray();
      for (const p of allProjects) {
        if (!p.userId || p.userId === 'guest') {
          p.userId = newUserId;
          await db.projects.put(p);
          this.upsertProject(p, newUserId).catch(() => {});
        }
      }

      // 3. Quét và cập nhật các ghi chú cục bộ
      const allNotes = await db.notes.toArray();
      for (const n of allNotes) {
        if (!n.userId || n.userId === 'guest') {
          n.userId = newUserId;
          await db.notes.put(n);
          // Đẩy ghi chú đã chuyển giao lên Supabase Cloud
          const notePayload = {
            id: n.id,
            user_id: newUserId,
            title: n.title,
            content_markdown: n.contentMarkdown,
            linked_task_id: n.linkedTaskId || null,
            linked_project_id: n.linkedProjectId || null,
            created_at: new Date(n.createdAt).toISOString(),
            updated_at: new Date(n.updatedAt).toISOString(),
            deleted_at: n.deletedAt ? new Date(n.deletedAt).toISOString() : null
          };
          supabase.from('notes').upsert(notePayload, { onConflict: 'id' }).catch((err) => {
            console.warn('[TaskCloudService] Upsert guest note to cloud error:', err);
          });
        }
      }

      // 4. Quét và cập nhật các phiên tập trung cục bộ
      const allSessions = await db.focus_sessions.toArray();
      for (const s of allSessions) {
        if (!s.userId || s.userId === 'guest') {
          s.userId = newUserId;
          await db.focus_sessions.put(s);
          // Đẩy phiên tập trung lên Supabase Cloud
          const sessionPayload = {
            id: s.id,
            user_id: newUserId,
            task_id: s.taskId || null,
            task_title: s.taskTitle || null,
            mode: s.phase || 'pomodoro',
            phase: s.phase || 'pomodoro',
            duration_minutes: s.durationMinutes || 25,
            actual_duration_seconds: (s.durationMinutes || 25) * 60,
            completed: true,
            completed_at: s.completedAt ? new Date(s.completedAt).toISOString() : new Date().toISOString(),
            date_string: s.dateString || new Date().toISOString().split('T')[0],
            created_at: s.completedAt ? new Date(s.completedAt).toISOString() : new Date().toISOString()
          };
          supabase.from('focus_sessions').upsert(sessionPayload, { onConflict: 'id' }).catch((err) => {
            console.warn('[TaskCloudService] Upsert guest session to cloud error:', err);
          });
        }
      }

      // 5. Quét và di chuyển tin nhắn AI phiên khách (local_conv_* hoặc guest)
      try {
        const allAiMsgs = await db.ai_messages.toArray();
        const guestConvs = new Set<string>();

        for (const msg of allAiMsgs) {
          if (!msg.userId || msg.userId === 'guest' || msg.conversationId?.startsWith('local_conv_') || msg.conversationId?.startsWith('conv_')) {
            msg.userId = newUserId;
            await db.ai_messages.put(msg);
            if (msg.conversationId) guestConvs.add(msg.conversationId);
          }
        }

        // Tạo cloud conversation và upload các tin nhắn khách lên Supabase
        for (const convId of guestConvs) {
          const msgsForConv = allAiMsgs.filter((m) => m.conversationId === convId);
          if (msgsForConv.length > 0) {
            await supabase.from('ai_conversations').upsert({
              id: convId,
              user_id: newUserId,
              title: msgsForConv[0]?.content?.slice(0, 36) || 'Phiên học tập đã đồng bộ',
              created_at: new Date(msgsForConv[0]?.createdAt || Date.now()).toISOString(),
              updated_at: new Date().toISOString()
            }, { onConflict: 'id' }).catch(() => {});

            const cloudMsgs = msgsForConv.map((m) => ({
              id: m.id,
              conversation_id: convId,
              role: m.role,
              content: m.content,
              created_at: new Date(m.createdAt).toISOString()
            }));
            await supabase.from('ai_messages').upsert(cloudMsgs, { onConflict: 'id' }).catch(() => {});
          }
        }
      } catch (aiErr) {
        console.warn('[TaskCloudService] Lỗi di chuyển tin nhắn AI khách:', aiErr);
      }

      // 6. Đẩy toàn bộ hàng đợi đột biến offline
      const { SyncQueueService } = await import('./syncQueueService');
      const queueService = new SyncQueueService();
      await queueService.flushQueue(newUserId);
    } catch (err) {
      console.warn('[TaskCloudService] Lỗi hợp nhất dữ liệu Khách khi đăng nhập:', err);
    }
  }

}
