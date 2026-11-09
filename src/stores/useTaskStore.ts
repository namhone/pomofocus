import { create } from 'zustand';
import { db } from '../db';
import { Project, Task, TaskPriority, TaskStatus } from '../types/tasks';
import { useTimerStore } from './useTimerStore';
import { TaskCloudService } from '../services/taskCloudService';
import { useAuthStore } from './useAuthStore';

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
  createProject: (name: string, colorHex?: string) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
  setStatusFilter: (filter: 'all' | 'todo' | 'completed') => void;
  setSelectedProjectId: (projectId: string | null) => void;
}

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'task_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
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
      const allTasks = await db.tasks.toArray();
      // Loại bỏ các task đã soft-deleted (archived)
      const activeTasks = allTasks.filter((t) => t.status !== 'archived');
      const allProjects = await db.projects.toArray();

      const userId = useAuthStore.getState().user?.id;
      if (userId) {
        TaskCloudService.syncFromCloud(userId).then(({ tasks, projects }) => {
          set({
            tasks: tasks.filter((t) => t.status !== 'archived').sort((a, b) => a.orderIndex - b.orderIndex),
            projects: projects.sort((a, b) => b.createdAt - a.createdAt)
          });
        }).catch((err) => console.warn('Lỗi đồng bộ Tasks từ Cloud:', err));
      }

      set({
        tasks: activeTasks.sort((a, b) => a.orderIndex - b.orderIndex),
        projects: allProjects.sort((a, b) => b.createdAt - a.createdAt),
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
    const newTask: Task = {
      id: generateUUID(),
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
      updatedAt: now
    };

    await db.tasks.add(newTask);
    const userId = useAuthStore.getState().user?.id;
    if (userId) {
      TaskCloudService.upsertTask(newTask, userId).catch((err) => console.warn('Lỗi lưu Task lên Cloud:', err));
    }
    set((state) => ({
      tasks: [newTask, ...state.tasks]
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

    // Nếu task đang liên kết với Timer bị sửa tên, cập nhật tên sang Timer
    if (get().activeTaskId === id && updates.title) {
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
    // QUY ĐỊNH KỸ THUẬT BẮT BUỘC:
    // Nếu task bị xóa trong lúc Timer đang chạy hoặc liên kết,
    // lập tức ngắt liên kết an toàn khỏi Timer Store
    if (get().activeTaskId === id) {
      set({ activeTaskId: null });
      useTimerStore.getState().setLinkedTask(null, null);
    }

    if (hardDelete) {
      await db.tasks.delete(id);
    } else {
      // Soft delete: chuyển sang trạng thái archived
      await db.tasks.update(id, { status: 'archived', updatedAt: Date.now() });
    }

    const userId = useAuthStore.getState().user?.id;
    if (userId) {
      if (hardDelete) {
        TaskCloudService.deleteTask(id, userId).catch((err) => console.warn('Lỗi xóa Task trên Cloud:', err));
      } else {
        TaskCloudService.upsertTask({ id, status: 'archived', updatedAt: Date.now() } as any, userId).catch((err) => console.warn('Lỗi archive Task trên Cloud:', err));
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

    if (get().activeTaskId && completedIds.has(get().activeTaskId!)) {
      set({ activeTaskId: null });
      useTimerStore.getState().setLinkedTask(null, null);
    }

    for (const task of completed) {
      await db.tasks.update(task.id, { status: 'archived', updatedAt: now });
      if (userId) {
        TaskCloudService.upsertTask({ ...task, status: 'archived', updatedAt: now } as any, userId).catch((err) =>
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

  createProject: async (name: string, colorHex = '#6366f1') => {
    const newProject: Project = {
      id: generateUUID(),
      name: name.trim(),
      colorHex,
      createdAt: Date.now()
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

  deleteProject: async (id: string) => {
    await db.projects.delete(id);
    const userId = useAuthStore.getState().user?.id;
    if (userId) {
      TaskCloudService.deleteProject(id, userId).catch((err) => console.warn('Lỗi xóa Project trên Cloud:', err));
    }

    // Bỏ projectId khỏi các tasks thuộc project này
    const tasksToUpdate = get().tasks.filter((t) => t.projectId === id);
    for (const t of tasksToUpdate) {
      await db.tasks.update(t.id, { projectId: null, updatedAt: Date.now() });
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
