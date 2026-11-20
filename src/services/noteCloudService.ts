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
          const cloudUpdatedAt = new Date(cn.updated_at).getTime();
          const cloudDeletedAt = cn.deleted_at ? new Date(cn.deleted_at).getTime() : null;
          const localNote = await db.notes.get(cn.id);

          // Respect updatedAt: do not overwrite newer local updates blindly with older cloud records
          if (localNote && localNote.updatedAt > cloudUpdatedAt) {
            this.upsertNote(localNote, userId).catch(() => {});
            continue;
          }

          const mappedNote: Note = {
            id: cn.id,
            userId,
            title: cn.title,
            contentMarkdown: cn.content_markdown || '',
            linkedTaskId: cn.linked_task_id || null,
            linkedProjectId: cn.linked_project_id || null,
            createdAt: new Date(cn.created_at).getTime(),
            updatedAt: cloudUpdatedAt,
            deletedAt: cloudDeletedAt,
            synced: true
          };
          await db.notes.put(mappedNote);
        }
      }

      // Đẩy các ghi chú cục bộ chưa có trên Cloud hoặc mới hơn Cloud lên Cloud
      if (Array.isArray(cloudNotes)) {
        for (const ln of localNotes) {
          if (ln.userId === userId || !ln.userId || ln.userId === 'guest') {
            const existingCloud = cloudNotes.find((cn: any) => cn.id === ln.id);
            if (!existingCloud) {
              // Ghi chú tồn tại cục bộ nhưng chưa có trên Cloud
              this.upsertNote({ ...ln, userId }, userId).catch(() => {});
            } else {
              const cloudUpdatedAt = new Date(existingCloud.updated_at).getTime();
              if (ln.updatedAt > cloudUpdatedAt) {
                // Ghi chú cục bộ mới hơn bản trên Cloud
                this.upsertNote({ ...ln, userId }, userId).catch(() => {});
              }
            }
          }
        }
      }

      return await db.notes.toArray();
    } catch (err) {
      console.warn('[NoteCloudService] Lỗi đồng bộ đám mây, sử dụng bộ nhớ đệm cục bộ:', err);
      return await db.notes.toArray();
    }
  }

  /**
   * Alias tương thích cho đồng bộ ghi chú với Supabase Cloud
   */
  static async syncNotesWithCloud(userId: string): Promise<Note[]> {
    return this.syncFromCloud(userId);
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
        updated_at: new Date(note.updatedAt).toISOString(),
        deleted_at: note.deletedAt ? new Date(note.deletedAt).toISOString() : null
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
