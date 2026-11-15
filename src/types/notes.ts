export interface Note {
  id: string;               // UUID v4
  userId?: string;          // V8.1 Local-First user ownership
  title: string;
  contentMarkdown: string;
  linkedTaskId?: string | null;    // Khóa ngoại lỏng lẻo tới Task
  linkedProjectId?: string | null; // Khóa ngoại lỏng lẻo tới Project
  createdAt: number;
  updatedAt: number;
  deletedAt?: number | null;       // V8.1 Soft delete tombstone
  synced?: boolean;                // V8.1 cloud sync status
}

export type NoteSaveStatus = 'saved' | 'saving' | 'error';
