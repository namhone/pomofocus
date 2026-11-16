import { create } from 'zustand';
import { db } from '../db';
import { Project, Task, TaskPriority, TaskStatus } from '../types/tasks';
import { useTimerStore } from './useTimerStore';
import { TaskCloudService } from '../services/taskCloudService';
import { useAuthStore } from './useAuthStore';
import { generateUUID } from '../utils/uuid';

interface TaskStoreState {
  tasks: Task[];
  projects: Project[];
  activeTaskId: string | null;
  selectedProjectId: string | null;
  statusFilter: 'all' | 'todo' | 'completed';
  isLoading: boolean;

  // Actions
  loadTasksAndProjects: () => Promise<void>;
  createTask: (data: {
    title: string;
    description?: string;
    priority?: TaskPriority;
    projectId?: string | null;
    estimatedPomodoros?: number;
  }) => Promise<Task>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  toggleTaskComplete: (id: string) => Promise<void>;
  deleteTask: (id: string, hardDelete?: boolean) => Promise<void>;
  clearCompletedTasks: () => Promise<void>;
  linkTaskToTimer: (id: string | null) => void;
  reorderTask: (taskId: string, direction: 'UP' | 'DOWN') => Promise<void>;
  createProject: (name: string, colorHex?: string) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
  setStatusFilter: (filter: 'all' | 'todo' | 'completed') => void;
  setSelectedProjectId: (projectId: string | null) => void;
}

function reconcileLinkedTask(loadedTasks: Task[], allowClearIfMissing: boolean): string | null {
  const timerState = useTimerStore.getState();
  const linkedId = timerState.linkedTaskId;
  if (!linkedId) return null;
  const matched = loadedTasks.find((t) => t.id === linkedId && t.status !== 'archived');
  if (matched) {
    if (timerState.linkedTaskTitle !== matched.title) {
      timerState.setLinkedTask(matched.id, matched.title);
    }
    return matched.id;
  }
  if (allowClearIfMissing) {
    timerState.setLinkedTask(null, null);
    return null;
  }
  return linkedId;
}


export const useTaskStore = create<TaskStoreState>((set, get) => ({
  tasks: [],
  projects: [],
  activeTaskId: null,
  selectedProjectId: null,
  statusFilter: 'all',
  isLoading: false,

  loadTasksAndProjects: async () => {
    set({ isLoading: true });
    try {
      const currentUserId = useAuthStore.getState().user?.id || 'guest';
      let allTasks: Task[] = [];
      try {
        allTasks = await db.tasks.where('userId').equals(currentUserId).toArray();
        if (allTasks.length === 0 && currentUserId === 'guest') {
          const legacy = await db.tasks.filter((t) => !t.userId || t.userId === 'guest').toArray();
          if (legacy.length > 0) allTasks = legacy;
        }
      } catch {
        allTasks = (await db.tasks.toArray()).filter((t) => (t.userId || 'guest') === currentUserId);
      }

      // 30-day GC check: purge permanently deleted items older than 30 days
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const expiredTaskIds = allTasks.filter((t) => t.deletedAt && t.deletedAt < thirtyDaysAgo).map((t) => t.id);
      if (expiredTaskIds.length > 0) {
        await db.tasks.bulkDelete(expiredTaskIds).catch(() => {});
        allTasks = allTasks.filter((t) => !expiredTaskIds.includes(t.id));
      }

      // Filter out tasks that are archived or tombstoned
      const activeTasks = allTasks.filter((t) => t.status !== 'archived' && (!t.deletedAt || t.deletedAt <= 0));

      let allProjects: Project[] = [];
      try {
        allProjects = await db.projects.where('userId').equals(currentUserId).toArray();
        if (allProjects.length === 0 && currentUserId === 'guest') {
          const legacyP = await db.projects.filter((p) => !p.userId || p.userId === 'guest').toArray();
          if (legacyP.length > 0) allProjects = legacyP;
        }
      } catch {
        allProjects = (await db.projects.toArray()).filter((p) => (p.userId || 'guest') === currentUserId);
      }

      const expiredProjIds = allProjects.filter((p) => p.deletedAt && p.deletedAt < thirtyDaysAgo).map((p) => p.id);
      if (expiredProjIds.length > 0) {
        await db.projects.bulkDelete(expiredProjIds).catch(() => {});
        allProjects = allProjects.filter((p) => !expiredProjIds.includes(p.id));
      }

      const activeProjects = allProjects.filter((p) => !p.deletedAt || p.deletedAt <= 0);

      const userId = useAuthStore.getState().user?.id;
      if (userId) {
        TaskCloudService.syncFromCloud(userId).then(({ tasks, projects }) => {
          const syncedTasks = tasks
            .filter((t) => t.status !== 'archived' && (!t.deletedAt || t.deletedAt <= 0))
            .sort((a, b) => a.orderIndex - b.orderIndex);
          const syncedProjects = projects
            .filter((p) => !p.deletedAt || p.deletedAt <= 0)
            .sort((a, b) => b.createdAt - a.createdAt);
          const reconciledActiveId = get().activeTaskId || reconcileLinkedTask(syncedTasks, true);
          set({
            tasks: syncedTasks,
            projects: syncedProjects,
            activeTaskId: reconciledActiveId
          });
        }).catch((err) => console.warn('Lỗi đồng bộ Tasks từ Cloud:', err));
      }

      const sortedLocalTasks = activeTasks.sort((a, b) => a.orderIndex - b.orderIndex);
      set({
        tasks: sortedLocalTasks,
        projects: activeProjects.sort((a, b) => b.createdAt - a.createdAt),
        activeTaskId: get().activeTaskId || reconcileLinkedTask(sortedLocalTasks, false),
        isLoading: false
      });
    } catch (err) {
      console.warn('Lỗi khi tải tasks và projects từ IndexedDB:', err);
      set({ isLoading: false });
    }
  },

  createTask: async ({
    title,
    description = '',
    priority = 'p2',
    projectId = null,
    estimatedPomodoros = 1
  }) => {
    const now = Date.now();
    const currentUserId = useAuthStore.getState().user?.id || 'guest';
    const newTask: Task = {
      id: generateUUID(),
      userId: currentUserId,
      title: title.trim(),
      description: description.trim(),
      projectId,
      tagIds: [],
      priority,
      status: 'todo',
      estimatedPomodoros: Math.max(1, estimatedPomodoros),
      completedPomodoros: 0,
      deadline: null,
      repeat: 'none',
      orderIndex: now,
      createdAt: now,
      updatedAt: now,
      deletedAt: null
    };

    try {
      await db.tasks.add(newTask);
    } catch {
      // In-memory fallback if IndexedDB is unavailable
    }
    const userId = useAuthStore.getState().user?.id;
    if (userId) {
      TaskCloudService.upsertTask(newTask, userId).catch((err) => console.warn('Lỗi lưu Task lên Cloud:', err));
    }
    set((state) => ({
      tasks: [newTask, ...state.tasks],
      statusFilter: state.statusFilter === 'completed' ? 'all' : state.statusFilter
    }));
    return newTask;
  },

  updateTask: async (id: string, updates: Partial<Task>) => {
    const now = Date.now();
    const updatePayload = { ...updates, updatedAt: now };

    await db.tasks.update(id, updatePayload);
    const userId = useAuthStore.getState().user?.id;
    if (userId) {
      const updated = { ...get().tasks.find((t) => t.id === id), ...updatePayload } as Task;
      TaskCloudService.upsertTask(updated, userId).catch((err) => console.warn('Lỗi cập nhật Task lên Cloud:', err));
    }

    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updatePayload } : t))
    }));

    // V8.1 (Feature 23): Nếu task đang liên kết với Timer bị sửa tên, cập nhật tên sang Timer
    // Kiểm tra cả activeTaskId lẫn linkedTaskId của useTimerStore để tránh lệch trạng thái
    const currentTimerLinkedId = useTimerStore.getState().linkedTaskId;
    if ((get().activeTaskId === id || currentTimerLinkedId === id) && updates.title) {
      useTimerStore.getState().setLinkedTask(id, updates.title);
    }
  },

  toggleTaskComplete: async (id: string) => {
    const task = get().tasks.find((t) => t.id === id);
    if (!task) return;

    const isNowCompleted = task.status !== 'completed';
    const nextStatus: TaskStatus = isNowCompleted ? 'completed' : 'todo';
    const now = Date.now();
    const completedAt = isNowCompleted ? now : null;

    await db.tasks.update(id, {
      status: nextStatus,
      completedAt,
      updatedAt: now
    });
    const userId = useAuthStore.getState().user?.id;
    if (userId) {
      TaskCloudService.upsertTask({ ...task, status: nextStatus, completedAt, updatedAt: now }, userId).catch((err) => console.warn('Lỗi toggle Task lên Cloud:', err));
    }

    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, status: nextStatus, completedAt, updatedAt: now } : t
      )
    }));
  },

  deleteTask: async (id: string, hardDelete = false) => {
    // V8.1 (Feature 23): QUY ĐỊNH KỸ THUẬT BẮT BUỘC:
    // Nếu task bị xóa/archive trong lúc Timer đang liên kết,
    // lập tức ngắt liên kết an toàn khỏi Timer Store (kiểm tra cả activeTaskId và linkedTaskId)
    const currentTimerLinkedId = useTimerStore.getState().linkedTaskId;
    if (get().activeTaskId === id || currentTimerLinkedId === id) {
      set({ activeTaskId: null });
      useTimerStore.getState().setLinkedTask(null, null);
    }

    if (hardDelete) {
      await db.tasks.delete(id);
    } else {
      // Soft delete: chuyển sang trạng thái archived và gán tombstone deletedAt
      const now = Date.now();
      await db.tasks.update(id, { status: 'archived', deletedAt: now, updatedAt: now });
    }

    const userId = useAuthStore.getState().user?.id;
    if (userId) {
      if (hardDelete) {
        TaskCloudService.deleteTask(id, userId).catch((err) => console.warn('Lỗi xóa Task trên Cloud:', err));
      } else {
        const now = Date.now();
        TaskCloudService.upsertTask({ id, status: 'archived', deletedAt: now, updatedAt: now } as any, userId).catch((err) => console.warn('Lỗi archive Task trên Cloud:', err));
      }
    }

    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id)
    }));

    // Ghi chú liên kết không bị xóa theo, chuyển thành ghi chú độc lập
    try {
      const linkedNotes = await db.notes.where('linkedTaskId').equals(id).toArray();
      for (const note of linkedNotes) {
        await db.notes.update(note.id, { linkedTaskId: null, updatedAt: Date.now() });
      }
    } catch {
      // Ignore if notes table is empty or error
    }
  },

  clearCompletedTasks: async () => {
    const completed = get().tasks.filter((t) => t.status === 'completed');
    if (completed.length === 0) return;

    const completedIds = new Set(completed.map((t) => t.id));
    const now = Date.now();
    const userId = useAuthStore.getState().user?.id;

    const currentTimerLinkedId = useTimerStore.getState().linkedTaskId;
    if ((get().activeTaskId && completedIds.has(get().activeTaskId!)) || (currentTimerLinkedId && completedIds.has(currentTimerLinkedId))) {
      set({ activeTaskId: null });
      useTimerStore.getState().setLinkedTask(null, null);
    }

    for (const task of completed) {
      await db.tasks.update(task.id, { status: 'archived', deletedAt: now, updatedAt: now });
      if (userId) {
        TaskCloudService.upsertTask({ ...task, status: 'archived', deletedAt: now, updatedAt: now } as any, userId).catch((err) =>
          console.warn('Lỗi archive Task lên Cloud:', err)
        );
      }
      try {
        const linkedNotes = await db.notes.where('linkedTaskId').equals(task.id).toArray();
        for (const note of linkedNotes) {
          await db.notes.update(note.id, { linkedTaskId: null, updatedAt: now });
        }
      } catch {
        // Ignore if notes table is empty or error
      }
    }

    set((state) => ({
      tasks: state.tasks.filter((t) => !completedIds.has(t.id))
    }));
  },

  linkTaskToTimer: (id: string | null) => {
    if (!id) {
      set({ activeTaskId: null });
      useTimerStore.getState().setLinkedTask(null, null);
      return;
    }

    const task = get().tasks.find((t) => t.id === id);
    if (task) {
      set({ activeTaskId: id });
      useTimerStore.getState().setLinkedTask(task.id, task.title);
    }
  },

  reorderTask: async (taskId: string, direction: 'UP' | 'DOWN') => {
    const currentTasks = [...get().tasks];
    if (currentTasks.length <= 1) return;

    const currentIndex = currentTasks.findIndex((t) => t.id === taskId);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'UP' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= currentTasks.length) return;

    const currentTask = currentTasks[currentIndex];
    const targetTask = currentTasks[targetIndex];

    const currentOrder = currentTask.orderIndex ?? currentTask.order ?? currentIndex;
    const targetOrder = targetTask.orderIndex ?? targetTask.order ?? targetIndex;

    let newCurrentOrder = targetOrder;
    let newTargetOrder = currentOrder;
    if (newCurrentOrder === newTargetOrder) {
      if (direction === 'UP') {
        newCurrentOrder = targetOrder - 1;
      } else {
        newCurrentOrder = targetOrder + 1;
      }
    }

    const updatedCurrent = {
      ...currentTask,
      orderIndex: newCurrentOrder,
      order: newCurrentOrder,
      updatedAt: Date.now()
    };
    const updatedTarget = {
      ...targetTask,
      orderIndex: newTargetOrder,
      order: newTargetOrder,
      updatedAt: Date.now()
    };

    currentTasks[currentIndex] = updatedTarget;
    currentTasks[targetIndex] = updatedCurrent;

    await db.tasks.update(currentTask.id, {
      orderIndex: newCurrentOrder,
      order: newCurrentOrder,
      updatedAt: Date.now()
    });
    await db.tasks.update(targetTask.id, {
      orderIndex: newTargetOrder,
      order: newTargetOrder,
      updatedAt: Date.now()
    });

    const userId = useAuthStore.getState().user?.id;
    if (userId) {
      TaskCloudService.upsertTask(updatedCurrent, userId).catch(() => {});
      TaskCloudService.upsertTask(updatedTarget, userId).catch(() => {});
    }

    set({ tasks: currentTasks });
  },

  createProject: async (name: string, colorHex = '#6366f1') => {
    const currentUserId = useAuthStore.getState().user?.id || 'guest';
    const now = Date.now();
    const newProject: Project = {
      id: generateUUID(),
      userId: currentUserId,
      name: name.trim(),
      colorHex,
      createdAt: now,
      updatedAt: now,
      deletedAt: null
    };

    await db.projects.add(newProject);
    const userId = useAuthStore.getState().user?.id;
    if (userId) {
      TaskCloudService.upsertProject(newProject, userId).catch((err) => console.warn('Lỗi lưu Project lên Cloud:', err));
    }
    set((state) => ({
      projects: [newProject, ...state.projects]
    }));
    return newProject;
  },

  deleteProject: async (id: string, hardDelete = false) => {
    const now = Date.now();
    if (hardDelete) {
      await db.projects.delete(id);
    } else {
      await db.projects.update(id, { deletedAt: now, updatedAt: now });
    }
    const userId = useAuthStore.getState().user?.id;
    if (userId) {
      TaskCloudService.deleteProject(id, userId).catch((err) => console.warn('Lỗi xóa Project trên Cloud:', err));
    }

    // Bỏ projectId khỏi các tasks thuộc project này
    const tasksToUpdate = get().tasks.filter((t) => t.projectId === id);
    for (const t of tasksToUpdate) {
      await db.tasks.update(t.id, { projectId: null, updatedAt: now });
    }

    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      tasks: state.tasks.map((t) => (t.projectId === id ? { ...t, projectId: null } : t)),
      selectedProjectId: state.selectedProjectId === id ? null : state.selectedProjectId
    }));
  },

  setStatusFilter: (filter: 'all' | 'todo' | 'completed') => {
    set({ statusFilter: filter });
  },

  setSelectedProjectId: (projectId: string | null) => {
    set({ selectedProjectId: projectId });
  }
}));

if (typeof window !== 'undefined') {
  (window as unknown as { useTaskStore: typeof useTaskStore }).useTaskStore = useTaskStore;
}
