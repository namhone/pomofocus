export type MaterialType = 'pdf' | 'docx' | 'image';

export interface StudyMaterial {
  id: string;
  name: string;
  type: MaterialType;
  size: number;
  url: string; // Blob URL hoặc Data URL
  file?: File;
  totalPages?: number;
  currentPage: number;
  viewMode?: 'single' | 'book';
  extractedContent?: string;
  uploadedBy: string;
  uploadedAt: number;
}
