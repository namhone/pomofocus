export type TaskPriority = 'p1' | 'p2' | 'p3';
export type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'archived';
export type TaskRepeat = 'none' | 'daily' | 'weekly';

export interface Project {
  id: string;               // UUID v4
  name: string;
  colorHex: string;
  createdAt: number;
}

export interface Tag {
  id: string;               // UUID v4
  name: string;
  colorHex: string;
}

export interface Task {
  id: string;               // UUID v4
  userId?: string;          // V8.1 Local-First user ownership
  title: string;
  description?: string;
  projectId?: string | null;
  tagIds: string[];
  priority: TaskPriority;
  status: TaskStatus;
  completed?: boolean;      // V8.1 convenience boolean
  order?: number;           // V8.1 priority sort order
  estimatedPomodoros: number; // Dự kiến số hiệp (VD: 4)
  completedPomodoros: number; // Số hiệp đã hoàn thành thực tế (VD: 0)
  deadline?: number | null;   // Timestamp hạn chót
  repeat: TaskRepeat;
  orderIndex: number;         // Thứ tự hiển thị
  createdAt: number;
  updatedAt: number;
  completedAt?: number | null;
  synced?: boolean;          // V8.1 cloud sync status
}

export interface LocalTask extends Task {
  // Fully mutually compatible with Task
}


