import { supabase } from '../lib/supabase';
import { Note } from '../types/notes';
import { db } from '../db';

export class NoteCloudService {
  /**
   * Đồng bộ toàn diện danh sách ghi chú từ Supabase Cloud
   */
  static async syncFromCloud(userId: string): Promise<Note[]> {
    if (!userId) {
      return await db.notes.toArray();
    }

    try {
      const { data: cloudNotes, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      const localNotes = await db.notes.toArray();

      if (!error && Array.isArray(cloudNotes)) {
        for (const cn of cloudNotes) {
          const mappedNote: Note = {
            id: cn.id,
            title: cn.title,
            contentMarkdown: cn.content_markdown || '',
            linkedTaskId: cn.linked_task_id || null,
            linkedProjectId: cn.linked_project_id || null,
            createdAt: new Date(cn.created_at).getTime(),
            updatedAt: new Date(cn.updated_at).getTime()
          };
          await db.notes.put(mappedNote);
        }
      }

      // Đẩy ngược lại ghi chú offline lên Cloud nếu Cloud đang trống
      if (Array.isArray(cloudNotes) && cloudNotes.length === 0 && localNotes.length > 0) {
        for (const ln of localNotes) {
          this.upsertNote(ln, userId).catch(() => {});
        }
      }

      return await db.notes.toArray();
    } catch (err) {
      console.warn('[NoteCloudService] Lỗi đồng bộ đám mây, sử dụng bộ nhớ đệm cục bộ:', err);
      return await db.notes.toArray();
    }
  }

  /**
   * Lưu hoặc cập nhật Ghi chú trực tiếp lên Supabase Cloud
   */
  static async upsertNote(note: Note, userId: string): Promise<void> {
    if (!userId) return;
    try {
      const payload = {
        id: note.id,
        user_id: userId,
        title: note.title,
        content_markdown: note.contentMarkdown,
        linked_task_id: note.linkedTaskId || null,
        linked_project_id: note.linkedProjectId || null,
        created_at: new Date(note.createdAt).toISOString(),
        updated_at: new Date(note.updatedAt).toISOString()
      };

      await supabase.from('notes').upsert(payload, { onConflict: 'id' });
    } catch (err) {
      console.warn('[NoteCloudService] Ghi note lên Cloud thất bại:', err);
    }
  }

  /**
   * Xóa Ghi chú trên Supabase Cloud
   */
  static async deleteNote(noteId: string, userId: string): Promise<void> {
    if (!userId) return;
    try {
      await supabase.from('notes').delete().eq('id', noteId);
    } catch (err) {
      console.warn('[NoteCloudService] Xóa note trên Cloud thất bại:', err);
    }
  }
}
