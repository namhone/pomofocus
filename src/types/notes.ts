export interface Note {
  id: string;               // UUID v4
  title: string;
  contentMarkdown: string;
  linkedTaskId?: string | null;    // Khóa ngoại lỏng lẻo tới Task
  linkedProjectId?: string | null; // Khóa ngoại lỏng lẻo tới Project
  createdAt: number;
  updatedAt: number;
}

export type NoteSaveStatus = 'saved' | 'saving' | 'error';
